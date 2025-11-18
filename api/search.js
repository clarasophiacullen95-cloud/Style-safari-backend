// api/search.js
import { connectToDatabase } from "../lib/db.js";

/**
 * Robust keyword-aware search that includes fabric, size, brand mapping, store-brand mapping,
 * category, color, description, tags, and supports filters (price, in_stock, season).
 *
 * Query params:
 *  - q (string): search text, e.g. "linen shirt"
 *  - gender (string): user gender - "female"/"male" (optional)
 *  - brand (string): brand name (optional)
 *  - store (string): store name (optional)
 *  - minPrice, maxPrice (numbers) (optional)
 *  - in_stock (true|false) (optional)
 *  - category (string) (optional)
 *  - season (string) (optional)
 *  - page (int), limit (int) pagination (optional)
 *
 * Response:
 *  { count, page, limit, results: [ ...products ] }
 */

function normalizeGender(g) {
  if (!g) return null;
  const s = String(g).toLowerCase();
  if (["female", "women", "w"].includes(s)) return "female";
  if (["male", "men", "m"].includes(s)) return "male";
  return "unisex";
}

function buildGenderMatch(userGender) {
  if (!userGender) {
    // include everything
    return { $in: ["female", "male", "unisex", null, ""] };
  }
  const g = normalizeGender(userGender);
  if (g === "female") return { $in: ["female", "women", "unisex", null, ""] };
  if (g === "male") return { $in: ["male", "men", "unisex", null, ""] };
  return { $in: ["unisex", null, ""] };
}

// Helper: sanitize input string -> tokens (remove punctuation, split on spaces)
function tokenize(q) {
  if (!q || typeof q !== "string") return [];
  return q
    .replace(/[^\w\s-]/g, " ")          // remove punctuation
    .split(/\s+/)
    .map(t => t.trim())
    .filter(Boolean);
}

// Helper: construct $and of keyword conditions
function keywordAndConditions(tokens) {
  return tokens.map(token => ({
    $or: [
      { name: { $regex: token, $options: "i" } },
      { category: { $regex: token, $options: "i" } },
      { tags: { $elemMatch: { $regex: token, $options: "i" } } },
      { description: { $regex: token, $options: "i" } },
      { color: { $regex: token, $options: "i" } },
      { style: { $regex: token, $options: "i" } },
      { fabric: { $elemMatch: { $regex: token, $options: "i" } } },
      { size: { $regex: token, $options: "i" } },
      { brand: { $regex: token, $options: "i" } },
      { product_id: { $regex: token, $options: "i" } }
    ]
  }));
}

// Simple dedupe by product_id
function uniqueById(arr) {
  const seen = new Set();
  const out = [];
  for (const it of arr) {
    const id = it.product_id ?? it._id?.toString();
    if (!seen.has(id)) {
      seen.add(id);
      out.push(it);
    }
  }
  return out;
}

export default async function handler(req, res) {
  try {
    const {
      q,
      gender,
      brand,
      store,
      minPrice,
      maxPrice,
      in_stock,
      category,
      season,
      page = "1",
      limit = "24"
    } = req.query;

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.max(1, Math.min(200, parseInt(limit, 10) || 24));
    const skip = (pageNum - 1) * limitNum;

    const { db } = await connectToDatabase();
    if (!db) return res.status(500).json({ error: "Database not available" });

    const filters = [];

    // Gender normalization/match
    const genderMatch = buildGenderMatch(gender);
    filters.push({ gender: genderMatch });

    // Brand handling: exact or alias mapping if you have brand_mappings collection
    if (brand) {
      // check brand_mappings collection for aliases -> affiliate_brands
      const mapping = await db.collection("brand_mappings").findOne({
        brand_aliases: { $regex: `^${brand}$`, $options: "i" }
      });
      if (mapping && Array.isArray(mapping.affiliate_brands) && mapping.affiliate_brands.length) {
        filters.push({ brand: { $in: mapping.affiliate_brands } });
      } else {
        filters.push({ brand: { $regex: brand, $options: "i" } });
      }
    }

    // Store filter (if you want to limit to a store)
    if (store) {
      filters.push({ store: { $regex: store, $options: "i" } });
    }

    // Price filter
    if (minPrice || maxPrice) {
      const priceFilter = {};
      if (minPrice) priceFilter.$gte = parseFloat(minPrice);
      if (maxPrice) priceFilter.$lte = parseFloat(maxPrice);
      filters.push({ price: priceFilter });
    }

    // in_stock filter
    if (typeof in_stock !== "undefined") {
      const val = String(in_stock).toLowerCase() === "true";
      filters.push({ in_stock: val });
    }

    // category filter
    if (category) {
      filters.push({ category: { $regex: category, $options: "i" } });
    }

    // season filter
    if (season) {
      filters.push({ season: { $regex: season, $options: "i" } });
    }

    // Build main query
    let results = [];

    // If there's a query string, do multi-keyword AND search across many fields (including fabric & size)
    const tokens = tokenize(q);

    if (tokens.length > 0) {
      // Prefer exact phrase match (name OR description) first (boost)
      const phraseRegex = new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");

      const phraseResults = await db.collection("products")
        .find({
          $and: [
            ...filters,
            {
              $or: [
                { name: { $regex: phraseRegex } },
                { description: { $regex: phraseRegex } }
              ]
            }
          ]
        })
        .limit(limitNum)
        .toArray();

      results = results.concat(phraseResults);

      // Then require every token to be present in any of the key fields (AND)
      const tokenConditions = keywordAndConditions(tokens);
      const tokenResults = await db.collection("products")
        .find({
          $and: [...filters, ...tokenConditions]
        })
        .skip(skip)
        .limit(limitNum)
        .toArray();

      results = results.concat(tokenResults);

      // If too few results, broaden search: OR across fields for any token (logical OR)
      if (results.length < Math.max(8, limitNum)) {
        const orAny = await db.collection("products")
          .find({
            $and: [
              ...filters,
              {
                $or: tokens.map(t => ({
                  $or: [
                    { name: { $regex: t, $options: "i" } },
                    { category: { $regex: t, $options: "i" } },
                    { tags: { $elemMatch: { $regex: t, $options: "i" } } },
                    { description: { $regex: t, $options: "i" } },
                    { fabric: { $elemMatch: { $regex: t, $options: "i" } } },
                    { size: { $regex: t, $options: "i" } }
                  ]
                }))
              }
            ]
          })
          .limit(limitNum * 2)
          .toArray();

        results = results.concat(orAny);
      }
    } else {
      // No query q — return filtered listing (category / store / brand / gender filters)
      results = await db.collection("products")
        .find({ $and: filters })
        .skip(skip)
        .limit(limitNum)
        .toArray();
    }

    // Brand/store mapping extra step: if user searched brand only or tokens match brand,
    // also include products from stores that carry that brand via store_brand_map field
    if (tokens.length > 0) {
      const singleToken = tokens.length === 1 ? tokens[0] : null;
      if (singleToken) {
        const storeBrandResults = await db.collection("products")
          .find({
            $and: [
              ...filters,
              { store_brand_map: { $regex: singleToken, $options: "i" } }
            ]
          })
          .limit(limitNum)
          .toArray();
        results = results.concat(storeBrandResults);
      }
    }

    // Dedupe and limit
    results = uniqueById(results).slice(0, limitNum);

    // Count (approx) - you can run a separate count query if you want an exact count
    const count = results.length;

    res.json({
      count,
      page: pageNum,
      limit: limitNum,
      results
    });
  } catch (err) {
    console.error("Search error:", err);
    res.status(500).json({ error: err.message });
  }
}
