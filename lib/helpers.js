import fetch from "node-fetch";

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

// Normalize Base44 ProductFeed entity
export function normalizeProduct(product) {
  return {
    product_id: product.product_id,
    name: product.name,
    brand: product.brand,
    price: product.price,
    currency: product.currency || "GBP",
    image_url: product.image_url,
    description: product.description,
    category: product.category,
    color: product.color,
    fabric: product.fabric || null,
    affiliate_link: product.affiliate_link,
    product_link: product.product_link,
    in_stock: product.in_stock ?? true,
    tags: product.tags || [],
    style: product.style,
    occasion: product.occasion || [],
    season: product.season || [],
    is_new: product.is_new ?? false,
    is_bestseller: product.is_bestseller ?? false,
    last_synced: new Date(),
    feed_source: product.feed_source || "product_feed",
  };
}
