import { MongoClient } from "mongodb";

let cachedClient = null;
let cachedDb = null;

export async function connectToDatabase() {
    if (cachedClient && cachedDb) return { client: cachedClient, db: cachedDb };

    const client = new MongoClient(process.env.MONGODB_URI);
    await client.connect();
    const db = client.db(process.env.MONGODB_DB);

    cachedClient = client;
    cachedDb = db;

    return { client, db };
}

// Normalize product data from Base44
export function normalizeProduct(raw) {
    return {
        product_id: raw.product_id,
        name: raw.name,
        brand: raw.brand,
        price: raw.price,
        currency: raw.currency,
        image_url: raw.image_url,
        description: raw.description,
        category: raw.category,
        color: raw.color,
        fabric: raw.fabric || null,
        size: raw.size || null,
        affiliate_link: raw.affiliate_link,
        product_link: raw.product_link,
        in_stock: raw.in_stock ?? true,
        tags: raw.tags || [],
        style: raw.style || [],
        occasion: raw.occasion || null,
        season: raw.season || null,
        is_new: isNew(raw.last_synced),
        is_bestseller: raw.is_bestseller || false,
        on_sale: raw.price < raw.retail_price, // assumes retail_price field
        last_synced: raw.last_synced,
        feed_source: raw.feed_source,
        gender: raw.gender || "unisex"
    };
}

function isNew(lastSynced) {
    if (!lastSynced) return false;
    const date = new Date(lastSynced);
    const now = new Date();
    const diff = (now - date) / (1000 * 60 * 60 * 24); // days
    return diff <= 30;
}

// Fetch from Base44 safely
export async function fetchFromBase44(path) {
    const url = `https://app.base44.com/api/apps/${process.env.BASE44_APP_ID}/${path}`;
    const res = await fetch(url, {
        headers: {
            "api_key": process.env.BASE44_API_KEY,
            "Content-Type": "application/json"
        }
    });

    if (!res.ok) {
        const text = await res.text();
        throw new Error(`Base44 API Error ${res.status}: ${text}`);
    }

    const data = await res.json();
    if (Array.isArray(data)) return data;
    if (Array.isArray(data.results)) return data.results;
    return [];
}
