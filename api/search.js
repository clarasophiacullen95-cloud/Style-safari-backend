// /api/search.js
import { connectToDatabase } from "../lib/db.js";

/**
 * Query params accepted:
 * q (string) - search text like "linen shirt"
 * brand (string)
 * category (string)
 * minPrice, maxPrice
 * size (string) - exact or partial size ("L", "M", "XS", "uk10")
 * fabric (string) - e.g. "linen"
 * season (string)
 * in_stock (true|false)
 * user_gender (male|female) - optional
 * store (string)
 * limit (number)
 */

function normalizeGenderQuery(user_gender) {
  if (!user_gender) return { $in: ["female", "male", "unisex", null, ""] };
  const g = user_gender.toLowerCase();
  if (g === "female" || g === "women") return { $in: ["female", "women", "unisex", null, ""] };
  if (g === "male" || g === "men") return { $in: ["male", "men", "unisex", null, ""] };
  return { $in: [g, "unisex", null, ""] };
}

export default async function handler(req, res) {
  try {
    const {
      q,
      brand,
      category,
      minPrice,
      maxPrice,
      size,
      fabric,
      season,
      in_stock,
      user_gender,
      store,
      limit = 60
    } = req.query;

    const { db } = await connectToDatabase();
    if (!db) return res.status(500).json({ error: "DB not configured" });

    const query = {};

    // Gender handling (respect profile but include unisex/null)
    query.gender = normalizeGenderQuery(user_gender);

    // Brand filter (exact or alias) — if provided
    if (brand) {
      // allow multiple brands (comma separated)
      const brands = brand.split(",").map(s => s.trim()).filter(Boolean);
      query.$and = query.$and || [];
      query.$and.push({ brand: { $in: brands.map(b => new RegExp(`^${escapeRegex(b)}$`, "i")) } });
    }

    // Category filter
    if (category) query.category = { $regex: category, $options: "i" };

    // Price filter
    if (minPrice || maxPrice) {
      query.price = {};
      if (minPrice) query.price.$gte = parseFloat(minPrice);
      if (maxPrice) query.price.$lte = parseFloat(maxPrice);
    }

    // In-stock
    if (typeof in_stock !== "undefined") {
      query.in_stock = in_stock === "true" || in_stock === "1";
    }

    // Store filter
    if (store) query.store = { $regex: store, $options: "i" };

    // Size filter
    if (size) {
      // match size field or sizes array or description
      const s = size.trim();
      query.$and = query.$and || [];
      query.$and.push({
        $or: [
          { size: { $regex: `^${escapeRegex(s)}$`, $options: "i" } },
          { "sizes": { $regex: `^${escapeRegex(s)}$`, $options: "i" } }, // if sizes stored as array of strings
          { description: { $regex: escapeRegex(s), $options: "i" } }
        ]
      });
    }

    // Fabric filter
    if (fabric) {
      const f = fabric.trim();
      query.$and = query.$and || [];
      query.$and.push({
        $or: [
          { fabric: { $regex: escapeRegex(f), $options: "i" } },
          { description: { $regex: escapeRegex(f), $options: "i" } },
          { tags: { $regex: escapeRegex(f), $options: "i" } }
        ]
      });
    }

    // Season filter
    if (season) query.season = { $regex: season, $options: "i" };

    // Multi-keyword search (ensures ALL keywords appear in name/category/tags/style/description)
    if (q && q.trim().length > 0) {
      const keywords = q.toLowerCase().split(/\s+/).filter(Boolean);
      query.$and = query.$and || [];
      for (const kw of keywords) {
        const re = new RegExp(escapeRegex(kw), "i");
        query.$and.push({
          $or: [
            { name: re },
            { category: re },
            { tags: re },
            { style: re },
            { description: re },
            { brand: re },
            { color: re },
            { fabric: re },
            { "sizes": re }
          ]
        });
      }
    }

    // Build the find cursor
    const cursor = db.collection("products").find(query).limit(Math.min(parseInt(limit, 10) || 60, 200));

    // Optionally add simple sort: best match = newest + in_stock first + price ascending
    const results = await cursor.sort({ in_stock: -1, is_new: -1, last_synced: -1 }).toArray();

    res.json({ count: results.length, results });
  } catch (err) {
    console.error("search error:", err);
    res.status(500).json({ error: err.message });
  }
}

// small helper to escape regex special chars
function escapeRegex(text) {
  return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
