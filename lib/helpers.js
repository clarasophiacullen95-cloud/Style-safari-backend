import fetch from "node-fetch";

export async function fetchFromBase44(entity) {
  const res = await fetch(`https://app.base44.com/api/apps/690f996cd436db6a01fc83c7/entities/${entity}`, {
    headers: {
      "api_key": process.env.BASE44_API_KEY,
      "Content-Type": "application/json"
    }
  });

  const data = await res.json();
  if (!data?.results) {
    throw new Error("Base44 data.results is undefined or invalid");
  }
  return data;
}

export function normalizeProduct(p) {
  return {
    product_id: p.product_id,
    name: p.name,
    brand: p.brand,
    price: p.price,
    currency: p.currency || "USD",
    image_url: p.image_url,
    description: p.description,
    category: p.category,
    color: p.color,
    fabric: p.fabric || null,
    size: p.size || null,
    affiliate_link: p.affiliate_link,
    product_link: p.product_link,
    in_stock: p.in_stock ?? true,
    tags: p.tags || [],
    style: p.style || null,
    occasion: p.occasion || [],
    season: p.season || [],
    is_new: p.is_new ?? false,
    is_bestseller: p.is_bestseller ?? false,
    last_synced: p.last_synced || new Date(),
    feed_source: p.feed_source || "product_feed"
  };
}
