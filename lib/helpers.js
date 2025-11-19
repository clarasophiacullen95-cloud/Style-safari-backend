// lib/helpers.js
import fetch from "node-fetch";

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

  // Fix: if data is an array, return as results
  if (Array.isArray(data)) return { results: data };

  // Otherwise assume normal object with results
  if (data.results && Array.isArray(data.results)) return data;

  throw new Error("Base44 data.results is undefined or invalid");
}

export function normalizeProduct(product) {
  return {
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
    affiliate_link: product.affiliate_link || "",
    product_link: product.product_link || "",
    in_stock: product.in_stock !== undefined ? product.in_stock : true,
    tags: product.tags || [],
    style: product.style || "",
    occasion: product.occasion || [],
    season: product.season || [],
    is_new: product.is_new || false,
    is_bestseller: product.is_bestseller || false,
    last_synced: product.last_synced ? new Date(product.last_synced) : new Date(),
    feed_source: product.feed_source || "product_feed"
  };
}
