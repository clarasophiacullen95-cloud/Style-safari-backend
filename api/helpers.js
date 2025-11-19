// helpers.js
import { MongoClient } from "mongodb";

let cachedClient = null;
let cachedDb = null;

/**
 * Connect to MongoDB
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
 * Fetch data from Base44 API with safe error handling
 */
export async function fetchFromBase44(path) {
    const url = `https://app.base44.com/api/apps/${process.env.BASE44_APP_ID}/${path}`;

    const response = await fetch(url, {
        headers: {
            "api_key": process.env.BASE44_API_KEY,
            "Content-Type": "application/json"
        }
    });

    let data;
    try {
        data = await response.json();
    } catch (err) {
        console.error("Failed to parse Base44 JSON:", err);
        throw new Error(`Base44 returned invalid JSON: ${err.message}`);
    }

    console.log("Raw Base44 response:", data); // <--- This helps debug permissions & empty responses

    if (!response.ok) {
        throw new Error(`Base44 API Error ${response.status}: ${JSON.stringify(data)}`);
    }

    if (!data || !Array.isArray(data.results)) {
        console.warn("Warning: Base44 data.results is missing or not an array");
        return { results: [] }; // safe fallback
    }

    return data;
}

/**
 * Normalize product from Base44 schema to your MongoDB schema
 */
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
        affiliate_link: product.affiliate_link || "",
        product_link: product.product_link || "",
        in_stock: product.in_stock ?? true,
        tags: product.tags || [],
        style: product.style || "",
        occasion: product.occasion || [],
        season: product.season || [],
        is_new: product.is_new ?? false,
        is_bestseller: product.is_bestseller ?? false,
        last_synced: new Date(),
        feed_source: product.feed_source || "product_feed"
    };
}
