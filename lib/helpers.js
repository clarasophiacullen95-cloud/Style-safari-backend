// lib/helpers.js
// ESM module
import { createRequire } from "module";
const require = createRequire(import.meta.url);

// NOTE: global fetch is used (Node 18+/Vercel). If you need node-fetch in older envs, add it in package.json.

import OpenAI from "openai";

/**
 * Safe fetch from Base44 for ProductFeed.
 * Handles: direct array, { results: [...] }, or empty.
 */
export async function fetchFromBase44(pathOrFullUrl) {
  try {
    // allow passing full path or path segment
    const url = pathOrFullUrl.startsWith("http")
      ? pathOrFullUrl
      : `https://app.base44.com/api/apps/${process.env.BASE44_APP_ID}/${pathOrFullUrl}`;

    const res = await fetch(url, {
      headers: {
        api_key: process.env.BASE44_API_KEY || "",
        "Content-Type": "application/json"
      },
      // keep short timeout upstream, but serverless has its own limits
    });

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new Error(`Base44 API Error ${res.status}: ${text}`);
    }

    const data = await res.json();

    // Base44 sometimes returns array directly, sometimes { results: [...] }
    if (Array.isArray(data)) return data;
    if (data && Array.isArray(data.results)) return data.results;

    // defensive fallback: if object with single items, convert to array
    return [];
  } catch (err) {
    // bubble up to caller but include message
    const e = new Error(`fetchFromBase44 failed: ${err.message}`);
    e.cause = err;
    throw e;
  }
}

/** Utilities to parse description fields */

/**
 * Parse fabric from description text using common patterns.
 * Returns array of normalized fabrics (lowercase).
 */
export function parseFabric(description = "") {
  if (!description || typeof description !== "string") return [];

  // Look for common markers
  const fabricMatches = [];
  const lower = description.replace(/\n/g, " ").trim();

  // Try patterns like "Material: Shell & lining: 100% cotton" or "Material: Cotton, Linen"
  const materialRegex = /Material:([^.|;]+)/i;
  const match = lower.match(materialRegex);
  if (match && match[1]) {
    const parts = match[1].split(/[,;&\/]| and | & /i);
    for (let p of parts) {
      p = p.replace(/[\d%]/g, "").replace(/(shell|lining|lining:)/i, "").trim();
      if (p) fabricMatches.push(p.toLowerCase());
    }
  } else {
    // fallback: look for known fabric keywords
    const known = ["cotton", "linen", "silk", "wool", "polyester", "nylon", "leather", "denim", "viscose"];
    for (const k of known) {
      if (lower.includes(k)) fabricMatches.push(k);
    }
  }

  // unique
  return Array.from(new Set(fabricMatches));
}

/**
 * Parse size(s) from description (e.g., "Size: XS" or "Sizes: S, M, L")
 * returns string or array depending on what is found — normalize to array.
 */
export function parseSize(description = "") {
  if (!description || typeof description !== "string") return null;

  const lower = description.replace(/\n/g, " ").trim();
  const sizeRegex = /Size[s]?:\s*([A-Za-z0-9,\s\/\-]+)/i;
  const match = lower.match(sizeRegex);
  if (match && match[1]) {
    const raw = match[1].split(/[,\/]/).map(s => s.trim()).filter(Boolean);
    return raw.length === 1 ? raw[0] : raw;
  }

  // sometimes size appears like "Size: XS" or "XS"
  const singleSize = lower.match(/\b(XXS|XS|S|M|L|XL|XXL|[0-9]{1,2})\b/i);
  if (singleSize) return singleSize[0].toUpperCase();

  return null;
}

/**
 * Detect gender from category/name/description/tags
 * returns 'female' | 'male' | 'unisex'
 */
export function detectGender(product = {}) {
  const combined = `${product.name || ""} ${product.description || ""} ${product.category || ""} ${(product.tags||[]).join(" ")}`.toLowerCase();

  // basic heuristics
  const femaleIndicators = ["women", "woman", "female", "girl", "girls", "ladies", "lady", "dresses", "skirt", "bra", "heels"];
  const maleIndicators = ["men", "man", "male", "boy", "boys", "gents", "gentlemen", "suit", "mens", "trousers"];

  for (const w of femaleIndicators) if (combined.includes(w)) return "female";
  for (const w of maleIndicators) if (combined.includes(w)) return "male";

  // if category explicitly suggests
  if (product.category) {
    const cat = product.category.toLowerCase();
    if (["dresses", "skirts"].some(c => cat.includes(c))) return "female";
    if (["suits", "mens", "men", "menswear"].some(c => cat.includes(c))) return "male";
  }

  return "unisex";
}

/**
 * Assign occasion(s) from category or tags
 * returns array of occasions (strings) or empty array
 */
export function assignOccasion(category = "", tags = []) {
  const map = {
    dresses: ["party", "casual"],
    tops: ["casual", "office"],
    shirts: ["office", "casual"],
    sneakers: ["casual", "sports"],
    heels: ["formal", "party"],
    coats: ["winter", "casual"],
    jackets: ["casual", "formal"],
    bags: ["travel", "casual", "formal"]
  };

  const occ = new Set();

  const cat = (category || "").toLowerCase();
  for (const key of Object.keys(map)) {
    if (cat.includes(key)) map[key].forEach(o => occ.add(o));
  }

  // look at tags too
  for (const t of tags || []) {
    const lower = (""+t).toLowerCase();
    if (lower.includes("work") || lower.includes("office")) occ.add("office");
    if (lower.includes("party") || lower.includes("evening")) occ.add("party");
    if (lower.includes("travel")) occ.add("travel");
    if (lower.includes("sports") || lower.includes("gym")) occ.add("sports");
  }

  return Array.from(occ);
}

/**
 * Assign season(s) from category/description/tags
 */
export function assignSeason(category = "", description = "", tags = []) {
  const s = new Set();
  const lowerDesc = (description || "").toLowerCase();
  const cat = (category || "").toLowerCase();

  if (lowerDesc.match(/\bcoat\b|\bsweater\b|\bjumper\b|\bparka\b|\bboots\b/)) s.add("winter");
  if (lowerDesc.match(/\bshorts\b|\bt-shirt\b|\bdress\b|\blinen\b/)) s.add("summer");
  if (lowerDesc.match(/\blinen\b|\bcotton\b/)) s.add("spring/summer");
  if (cat.includes("coat") || cat.includes("jacket")) s.add("winter");

  for (const t of tags || []) {
    const lower = (""+t).toLowerCase();
    if (lower.includes("summer")) s.add("summer");
    if (lower.includes("winter")) s.add("winter");
  }

  if (s.size === 0) s.add("all-season");
  return Array.from(s);
}

/**
 * isNew: check last_synced or created_at within X days
 */
export function isNewProduct(lastSynced, days = 30) {
  if (!lastSynced) return false;
  const now = new Date();
  const d = new Date(lastSynced);
  const diffDays = (now - d) / (1000 * 60 * 60 * 24);
  return diffDays <= days;
}

/**
 * normalizeProduct - convert incoming product object (from Base44 or feeds)
 * into a canonical product object for MongoDB. Keep original fields where useful.
 */
export function normalizeProduct(p = {}) {
  // some feeds use numbers as price, some strings
  const price = (() => {
    if (p.price === undefined || p.price === null) return null;
    if (typeof p.price === "number") return p.price;
    const num = parseFloat(String(p.price).replace(/[^\d\.]/g, ""));
    return Number.isFinite(num) ? num : null;
  })();

  // parse fabrics and sizes from description if missing
  const description = p.description || p.long_description || p.summary || "";

  const fabric = (p.fabric && Array.isArray(p.fabric) && p.fabric.length) ? p.fabric :
                 parseFabric(description);

  const size = p.size || parseSize(description);

  const gender = p.gender || detectGender(p);

  const occasion = (p.occasion && p.occasion.length) ? p.occasion : assignOccasion(p.category, p.tags || []);
  const season = (p.season && p.season.length) ? p.season : assignSeason(p.category, description, p.tags || []);

  // original price if feed gives it (for sale detection)
  const originalPrice = p.original_price || p.list_price || p.msrp || null;
  const on_sale = (originalPrice && price && (price < originalPrice));

  const normalized = {
    product_id: String(p.product_id ?? p.id ?? p.productId ?? ""),
    name: p.name ?? p.title ?? "",
    brand: p.brand ?? "",
    price,
    currency: p.currency ?? p.price_currency ?? p.currency_code ?? "USD",
    image_url: p.image_url ?? p.image ?? p.images?.[0] ?? null,
    description,
    category: p.category ?? p.cat ?? "",
    color: p.color ?? (p.colors ? p.colors[0] : null) ?? null,
    fabric: Array.isArray(fabric) ? fabric : (fabric ? [fabric] : []),
    size,
    product_link: p.product_link ?? p.link ?? p.affiliate_link ?? null,
    affiliate_link: p.affiliate_link ?? p.product_link ?? p.link ?? null,
    in_stock: p.in_stock === undefined ? (p.stock !== undefined ? p.stock > 0 : true) : Boolean(p.in_stock),
    tags: Array.isArray(p.tags) ? p.tags : (p.tags ? [p.tags] : []),
    style: p.style ?? null,
    occasion,
    season,
    is_new: isNewProduct(p.last_synced ?? p.created_at ?? p.updated_at),
    on_sale,
    is_bestseller: Boolean(p.is_bestseller || p.best_seller || false),
    last_synced: p.last_synced ? new Date(p.last_synced) : new Date(),
    feed_source: p.feed_source ?? p.source ?? null,
    store: p.store ?? p.feed_source ?? null,
    store_brand_map: String((p.store_brand_map || p.brand || "")).toLowerCase(),
    // embedding will be optionally created & stored separately
  };

  return normalized;
}

/**
 * createEmbedding - optional: uses OpenAI to create text embedding for a product
 * - returns vector (array of floats) or null if OpenAI key not set or error
 * - caller should store embedding into product.embedding if desired
 */
export async function createEmbedding(text) {
  if (!process.env.OPENAI_API_KEY) return null;

  try {
    const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    const resp = await client.embeddings.create({
      model: "text-embedding-3-small",
      input: text
    });
    const vector = resp.data?.[0]?.embedding ?? null;
    return vector;
  } catch (err) {
    console.warn("createEmbedding failed:", err.message);
    return null;
  }
}
