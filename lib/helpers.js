// /lib/helpers.js
import fetch from "node-fetch";
import OpenAI from "openai";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// Fetch from Base44 and normalize response shape
export async function fetchFromBase44(path) {
  const url = `https://app.base44.com/api/apps/${process.env.BASE44_APP_ID}/${path}`;
  const response = await fetch(url, {
    headers: {
      "api_key": process.env.BASE44_API_KEY,
      "Content-Type": "application/json",
    },
    timeout: 30000,
  });

  let data;
  try {
    data = await response.json();
  } catch (err) {
    const text = await response.text().catch(() => null);
    throw new Error(`Failed to parse Base44 response. status=${response.status} body=${text || err.message}`);
  }

  // Base44 may return a plain array or an object with .results
  if (Array.isArray(data)) return { results: data };
  if (data && Array.isArray(data.results)) return data;

  // If nothing useful returned, return an empty results array (caller can handle)
  return { results: [] };
}

// Basic product normalization (no async)
export function normalizeProductBase(product) {
  return {
    product_id: product.product_id ?? "",
    name: (product.name ?? "").trim(),
    brand: product.brand ?? "",
    price: product.price ?? 0,
    currency: product.currency ?? "GBP",
    image_url: product.image_url ?? "",
    description: product.description ?? "",
    category: (product.category ?? "").toLowerCase(),
    color: product.color ?? "",
    fabric: product.fabric ?? null,
    size: product.size ?? null,
    gender: (product.gender ?? "unisex").toLowerCase(),
    affiliate_link: product.affiliate_link ?? "",
    product_link: product.product_link ?? "",
    in_stock: product.in_stock !== undefined ? !!product.in_stock : true,
    tags: Array.isArray(product.tags) ? product.tags : [],
    style: product.style ?? "",
    occasion: Array.isArray(product.occasion) ? product.occasion : [],
    season: Array.isArray(product.season) ? product.season : [],
    is_new:
      product.is_new ??
      (product.last_synced ? (new Date() - new Date(product.last_synced)) / (1000 * 60 * 60 * 24) <= 30 : false),
    is_bestseller: !!product.is_bestseller,
    last_synced: product.last_synced ? new Date(product.last_synced) : new Date(),
    feed_source: product.feed_source ?? "product_feed",
    // embedding left null initially; sync will set if possible
    embedding: null,
  };
}

// Safe async embedding generation with model fallback
export async function generateEmbedding(text) {
  if (!process.env.OPENAI_API_KEY) {
    // No key configured
    throw new Error("Missing OPENAI_API_KEY");
  }
  const model = process.env.OPENAI_EMBEDDING_MODEL || "text-embedding-3-large";

  try {
    const resp = await openai.embeddings.create({ model, input: text });
    return resp.data?.[0]?.embedding ?? null;
  } catch (err) {
    // bubble up error to caller but include model info
    const msg = err?.message || String(err);
    throw new Error(`Embedding generation failed (model=${model}): ${msg}`);
  }
}
