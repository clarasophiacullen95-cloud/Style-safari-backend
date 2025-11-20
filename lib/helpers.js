import fetch from "node-fetch";

// Fetch ProductFeed from Base44
export async function fetchFromBase44(entity) {
    try {
        const res = await fetch(
            `https://app.base44.com/api/apps/${process.env.BASE44_APP_ID}/entities/${entity}`,
            {
                headers: {
                    'api_key': process.env.BASE44_API_KEY,
                    'Content-Type': 'application/json',
                },
            }
        );

        const data = await res.json();

        // Handle variations in API response
        const results = data.results || data.data?.results;

        if (!results || !Array.isArray(results)) {
            console.error("Base44 fetch failed:", data);
            return []; // Return empty array, fallback to cached products
        }

        return results;
    } catch (err) {
        console.error("Error fetching Base44 data:", err);
        return []; // Return empty array, fallback to cached products
    }
}

// Normalize product to match your MongoDB schema
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
        fabric: product.fabric,
        affiliate_link: product.affiliate_link,
        product_link: product.product_link,
        in_stock: product.in_stock ?? true,
        tags: product.tags || [],
        style: product.style || null,
        occasion: product.occasion || [],
        season: product.season || [],
        is_new: product.is_new ?? false,
        is_bestseller: product.is_bestseller ?? false,
        last_synced: new Date(),
        feed_source: product.feed_source || "product_feed",
    };
}
