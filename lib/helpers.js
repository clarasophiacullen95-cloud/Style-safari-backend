// lib/helpers.js
import fetch from "node-fetch";

export async function fetchFromBase44(path) {
  if (!process.env.BASE44_APP_ID || !process.env.BASE44_API_KEY) {
    throw new Error("BASE44_APP_ID or BASE44_API_KEY missing");
  }

  const url = `https://app.base44.com/api/apps/${process.env.BASE44_APP_ID}/${path}`;

  const resp = await fetch(url, {
    headers: {
      "api_key": process.env.BASE44_API_KEY,
      "Content-Type": "application/json"
    },
    // optional: timeout could be added via AbortController if desired
  });

  let json;
  try {
    json = await resp.json();
  } catch (err) {
    const text = await resp.text().catch(() => "<no-body>");
    throw new Error(`Base44 returned non-JSON (status ${resp.status}): ${text}`);
  }

  // If Base44 returns an array directly, wrap it so code can rely on .results
  if (Array.isArray(json)) return { results: json };

  // If Base44 returns object with results array
  if (json && Array.isArray(json.results)) return json;

  // If it's some other shape, return raw for debugging
  return json;
}

function mapCategory(raw) {
  if (!raw) return "misc";
  const c = raw.toLowerCase();
  if (c.includes("t-shirt") || c.includes("tee")) return "t-shirt";
  if (c.includes("dress")) return "dress";
  if (c.includes("shoe")) return "shoes";
  if (c.includes("bag")) return "bag";
  if (c.includes("accessor")) return "accessory";
  return raw;
}

function extractSizeFromText(text) {
  if (!text) return null;
  // simple common patterns: "Size: XS", "Size: S", "Size: 10", "Size: M/L"
  const m = text.match(/(?:Size:?\s*)([A-Za-z0-9\-\/]+)/i);
  return m ? m[1].trim() : null;
}

/**
 * Normalize a Base44 product entity into the fields you defined.
 * Note: do not generate embeddings here (embedding step happens in sync in batches)
 */
export function normalizeProduct(product) {
  return {
    product_id: product.product_id ?? "",
    name: (product.name ?? "").split("&")[0].trim(),
    brand: product.brand ?? "",
    price: product.price ?? null,
    currency: product.currency ?? "GBP",
    image_url: product.image_url ?? "",
    description: product.description ?? "",
    category: mapCategory(product.category ?? ""),
    color: product.color ?? "",
    fabric: product.fabric ?? null,
    size: product.size ?? extractSizeFromText(product.description),
    gender: (product.gender ?? "unisex").toLowerCase(),
    affiliate_link: product.affiliate_link ?? "",
    product_link: product.product_link ?? "",
    in_stock: product.in_stock !== undefined ? product.in_stock : true,
    tags: Array.isArray(product.tags) ? product.tags : [],
    style: product.style ?? "",
    occasion: Array.isArray(product.occasion) ? product.occasion : [],
    season: Array.isArray(product.season) ? product.season : [],
    is_new:
      product.is_new === true ||
      (product.last_synced && (new Date(product.last_synced) > new Date(Date.now() - 30 * 24 * 60 * 60 * 1000))),
    is_bestseller: product.is_bestseller === true,
    last_synced: product.last_synced ? new Date(product.last_synced) : new Date(),
    feed_source: product.feed_source ?? "product_feed",
    // embedding will be set later by sync
    embedding: null
  };
}
