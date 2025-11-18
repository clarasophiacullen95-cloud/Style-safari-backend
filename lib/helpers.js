import fetch from "node-fetch";

/**
 * Fetch data from Base44 API
 * @param {string} path - API path, e.g., "entities/ProductFeed"
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
 * Normalize a product object from Base44
 * Adds consistent fields for embedding and MongoDB storage
 */
export function normalizeProduct(product) {
    return {
        product_id: product.product_id,
        name: product.name ? product.name.split("&")[0].trim() : null, // clean title
        brand: product.brand || null,
        price: product.price || null,
        sale_price: product.sale_price || null,
        currency: product.currency || "USD",
        image_url: product.image_url || null,
        description: product.description || null,
        category: product.category || null,
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
        is_new: false, // updated in sync.js
        is_bestseller: product.is_bestseller || false,
        is_on_sale: false, // updated in sync.js
        last_synced: product.last_synced || new Date(),
        feed_source: product.feed_source || null
    };
}
