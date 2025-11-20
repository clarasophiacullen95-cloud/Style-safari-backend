import fetch from "node-fetch";
import OpenAI from "openai";

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function fetchFromBase44(entity) {
    const url = `https://app.base44.com/api/apps/${process.env.BASE44_APP_ID}/entities/${entity}`;
    const res = await fetch(url, {
        headers: {
            api_key: process.env.BASE44_API_KEY,
            "Content-Type": "application/json"
        }
    });
    const data = await res.json();
    if (!data?.results) throw new Error("Base44 data.results is undefined or invalid");
    return data;
}

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
        fabric: product.fabric || "",
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
        feed_source: product.feed_source || "product_feed"
    };
}

export async function generateEmbedding(text) {
    const embedding = await client.embeddings.create({
        model: "text-embedding-3-large",
        input: text
    });
    return embedding.data[0].embedding;
}
