import fetch from "node-fetch";
import OpenAI from "openai";

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

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

    const data = await response.json();

    // Handle both { results: [...] } and direct array responses
    if (Array.isArray(data)) return data;
    if (Array.isArray(data.results)) return data.results;

    throw new Error("Base44 data.results is undefined or invalid");
}

// Normalize product for MongoDB storage
export function normalizeProduct(product) {
    const now = new Date();
    const isNew = (() => {
        if (!product.last_synced) return false;
        const synced = new Date(product.last_synced);
        const diffDays = (now - synced) / (1000 * 60 * 60 * 24);
        return diffDays <= 30; // consider new if synced in last 30 days
    })();

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
        fabric: product.fabric || null,
        size: extractSize(product.description), // helper function below
        affiliate_link: product.affiliate_link,
        product_link: product.product_link,
        in_stock: product.in_stock ?? true,
        tags: product.tags ?? [],
        style: product.style ?? null,
        occasion: product.occasion ?? [],
        season: product.season ?? [],
        is_new: isNew,
        is_bestseller: product.is_bestseller ?? false,
        last_synced: product.last_synced ? new Date(product.last_synced) : now,
        feed_source: product.feed_source ?? "product_feed",
        embedding: null // will fill later
    };
}

// Simple size extractor from description
export function extractSize(desc) {
    if (!desc) return null;
    const match = desc.match(/\b(Size: ?[A-Z0-9]+)\b/i);
    return match ? match[1].replace("Size:", "").trim() : null;
}

// Generate embedding vector for AI search
export async function generateEmbedding(text) {
    if (!text) return null;
    const response = await client.embeddings.create({
        model: "text-embedding-3-small",
        input: text
    });
    return response.data[0].embedding;
}
