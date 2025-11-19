import fetch from "node-fetch"; // Ensure this is installed in your package.json

// Fetch data from Base44 API
export async function fetchFromBase44(path) {
  const url = `https://app.base44.com/api/apps/${process.env.BASE44_APP_ID}/${path}`;

  const response = await fetch(url, {
    headers: {
      "api_key": process.env.BASE44_API_KEY,
      "Content-Type": "application/json",
    },
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Base44 API Error ${response.status}: ${text}`);
  }

  return response.json();
}

// Normalize product object to ensure all fields exist
export function normalizeProduct(product) {
  return {
    product_id: product.product_id || "",
    name: product.name || "",
    brand: product.brand || "",
    price: product.price || 0,
    currency: product.currency || "GBP",
    image_url: product.image_url || "",
    description: product.description || "",
    category: product.category || "",
    color: product.color || "",
    fabric: product.fabric || "",
    size: product.size || null, // optional
    affiliate_link: product.affiliate_link || "",
    product_link: product.product_link || "",
    in_stock: product.in_stock !== undefined ? product.in_stock : true,
    tags: Array.isArray(product.tags) ? product.tags : [],
    style: product.style || "",
    occasion: Array.isArray(product.occasion) ? product.occasion : [],
    season: Array.isArray(product.season) ? product.season : [],
    is_new: product.is_new || false,
    is_bestseller: product.is_bestseller || false,
    last_synced: product.last_synced || new Date(),
    feed_source: product.feed_source || "product_feed",
  };
}
