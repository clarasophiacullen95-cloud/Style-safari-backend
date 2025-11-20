import OpenAI from "openai";

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export function mapGender(category) {
    if (!category) return "unisex";
    const c = category.toLowerCase();
    if (["womens", "women", "dresses", "skirts", "heels"].some(x => c.includes(x))) return "female";
    if (["mens", "men", "shirts", "suits", "loafers"].some(x => c.includes(x))) return "male";
    return "unisex";
}

export function normalizeProduct(p) {
    return {
        product_id: p.product_id,
        name: p.name,
        brand: p.brand || "",
        price: p.price || 0,
        currency: p.currency || "USD",
        image_url: p.image_url || "",
        description: p.description || "",
        category: p.category || "",
        color: p.color || "",
        fabric: p.fabric || "",
        affiliate_link: p.affiliate_link || "",
        product_link: p.product_link || "",
        in_stock: p.in_stock ?? true,
        tags: p.tags || [],
        style: p.style || "",
        occasion: p.occasion || [],
        season: p.season || [],
        is_new: p.is_new ?? false,
        is_bestseller: p.is_bestseller ?? false,
        last_synced: new Date(),
        feed_source: p.feed_source || "product_feed",
        gender: mapGender(p.category)
    };
}

export async function generateEmbedding(text) {
    const embedding = await client.embeddings.create({
        model: "text-embedding-3-large",
        input: text
    });
    return embedding.data[0].embedding;
}
