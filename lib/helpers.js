import fetch from "node-fetch";
import OpenAI from "openai";

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function fetchFromBase44(path) {
  const url = `https://app.base44.com/api/apps/${process.env.BASE44_APP_ID}/${path}`;

  const response = await fetch(url, {
    headers: {
      "api_key": process.env.BASE44_API_KEY,
      "Content-Type": "application/json"
    }
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Base44 API Error ${response.status}: ${text}`);
  }

  const data = await response.json();

  if (Array.isArray(data)) return { results: data };
  if (data.results && Array.isArray(data.results)) return data;

  throw new Error("Base44 data.results is undefined or invalid");
}

// Normalize and enrich product
export async function normalizeProduct(product) {
  const normalized = {
    product_id: product.product_id,
    name: product.name,
    brand: product.brand || "",
    price: product.price || 0,
    currency: product.currency || "USD",
    image_url: product.image_url || "",
    description: product.description || "",
    category: product.category || "",
    color: product.color || "",
    fabric: product.fabric || "",
    size: product.size || null,
    gender: product.gender || "unisex", // default to unisex if not provided
    affiliate_link: product.affiliate_link || "",
    product_link: product.product_link || "",
    in_stock: product.in_stock !== undefined ? product.in_stock : true,
    tags: product.tags || [],
    style: product.style || "",
    occasion: product.occasion || [],
    season: product.season || [],
    is_new:
      product.is_new ||
      (product.last_synced && new Date(product.last_synced) > new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)), // new if within 1 month
    is_bestseller: product.is_bestseller || false,
    last_synced: product.last_synced ? new Date(product.last_synced) : new Date(),
    feed_source: product.feed_source || "product_feed",
    embedding: null // placeholder for embedding
  };

  // Generate embeddings for semantic search
  try {
    const embeddingRes = await client.embeddings.create({
      model: "text-embedding-3-large", // low-cost, high-quality embedding
      input: `${normalized.name} ${normalized.brand} ${normalized.category} ${normalized.color} ${normalized.fabric} ${normalized.tags.join(
        " "
      )}`
    });
    normalized.embedding = embeddingRes.data[0].embedding;
  } catch (err) {
    console.warn("Embedding generation failed for", normalized.product_id, err.message);
  }

  return normalized;
}
