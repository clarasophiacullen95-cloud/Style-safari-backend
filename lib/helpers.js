import fetch from "node-fetch";

export async function fetchFromBase44(entity) {
  const res = await fetch(`https://app.base44.com/api/apps/${process.env.BASE44_APP_ID}/entities/${entity}`, {
    headers: {
      'api_key': process.env.BASE44_API_KEY,
      'Content-Type': 'application/json'
    }
  });

  const data = await res.json();
  return data;
}

export function normalizeProduct(product) {
  return {
    product_id: product.product_id,
    name: product.name,
    brand: product.brand,
    price: product.price,
    currency: product.currency || "USD",
    image_url: product.image_url,
    description: product.description,
    category: product.category,
    color: product.color,
    fabric: product.fabric,
    affiliate_link: product.affiliate_link,
    product_link: product.product_link,
    in_stock: product.in_stock !== false,
    tags: product.tags || [],
    style: product.style,
    occasion: product.occasion || [],
    season: product.season || [],
    is_new: product.is_new || false,
    is_bestseller: product.is_bestseller || false,
    last_synced: product.last_synced || new Date(),
    feed_source: product.feed_source || "product_feed"
  };
}
