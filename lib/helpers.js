import fetch from "node-fetch";

/**
 * Fetch data from Base44 API
 */
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

    return response.json();
}

/**
 * Map Base44 category names to standard categories
 */
function mapCategory(base44Category) {
    if (!base44Category) return "misc";
    const cat = base44Category.toLowerCase();
    if (cat.includes("t-shirt") || cat.includes("tee")) return "t-shirt";
    if (cat.includes("dress")) return "dress";
    if (cat.includes("shoe")) return "shoes";
    if (cat.includes("bag")) return "bag";
    if (cat.includes("accessories")) return "accessory";
    // Add more mappings as needed
    return cat;
}

/**
 * Normalize product object
 */
export function normalizeProduct(product) {
    return {
        product_id: product.product_id,
        name: product.name ? product.name.split("&")[0].trim() : null, // remove extra text
        brand: product.brand || null,
        price: product.price || null,
        sale_price: product.sale_price || null,
        currency: product.currency || "USD",
        image_url: product.image_url || null,
        description: product.description || null,
        category: mapCategory(product.category),
        color: product.color || null,
        fabric: product.fabric || null,
        size: product.size || null,
        affiliate_link: product.affiliate_link || null,
        product_link: product.product_link || null,
        in_stock: product.in_stock !== undefined ? product.in_stock : true,
        tags: product.tags || [],
        style: product.style || null,
        occasion: product.occasion || null,
        season: product.season || null,
        is_new: false,
        is_bestseller: product.is_bestseller || false,
        is_on_sale: false,
        last_synced: product.last_synced || new Date(),
        feed_source: product.feed_source || null
    };
}
