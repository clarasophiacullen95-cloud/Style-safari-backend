import { MongoClient } from "mongodb";

let cachedClient = null;
let cachedDb = null;

/**
 * Connect to MongoDB with caching to avoid reconnecting every function call
 */
export async function connectToDatabase() {
    if (cachedClient && cachedDb) {
        return { client: cachedClient, db: cachedDb };
    }

    const client = new MongoClient(process.env.MONGODB_URI);
    await client.connect();
    const db = client.db(process.env.MONGODB_DB);

    cachedClient = client;
    cachedDb = db;

    return { client, db };
}

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
 * Normalize product entity from Base44
 */
export function normalizeProduct(product) {
    const now = new Date();
    const lastSynced = new Date(product.last_synced || product.created_at);
    const diffDays = (now - lastSynced) / (1000 * 60 * 60 * 24);

    return {
        product_id: product.product_id,
        name: product.name || null,
        brand: product.brand || null,
        price: product.price || 0,
        currency: product.currency || "USD",
        image_url: product.image_url || null,
        description: product.description || null,
        category: product.category || null,
        color: product.color || null,
        fabric: product.fabric || null,
        size: product.size || null,
        affiliate_link: product.affiliate_link || null,
        product_link: product.product_link || null,
        in_stock: product.in_stock ?? true,
        tags: product.tags || [],
        style: product.style || null,
        occasion: product.occasion || null,
        season: product.season || null,
        is_new: diffDays <= 30,
        is_bestseller: product.is_bestseller || false,
        last_synced: product.last_synced || product.created_at || now.toISOString(),
        feed_source: product.feed_source || null,
        store_brand_mapping: product.store_brand_mapping || [], // Array of store brands mapping to this product
    };
}
