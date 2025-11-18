import { connectToDatabase } from "../lib/db.js";
import { fetchFromBase44, normalizeProduct } from "../lib/helpers.js";
import OpenAI from "openai";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export default async function handler(req, res) {
    if (req.query.secret !== process.env.SYNC_SECRET) {
        return res.status(401).json({ error: "Unauthorized" });
    }

    try {
        const { db } = await connectToDatabase();

        // 1️⃣ Fetch products from Base44
        const data = await fetchFromBase44("entities/ProductFeed");

        // 2️⃣ Normalize and enrich each product
        const cleaned = [];
        for (const product of data.results) {
            const p = normalizeProduct(product);

            // Add new fields if missing
            p.fabric = p.fabric || null;
            p.size = p.size || null;
            p.occasion = p.occasion || null;
            p.season = p.season || null;

            // Mark as new if added within last 30 days
            const createdDate = new Date(p.last_synced || new Date());
            const now = new Date();
            p.is_new = (now - createdDate) / (1000 * 60 * 60 * 24) <= 30;

            // Mark if on sale (price lower than typical)
            p.is_on_sale = p.sale_price && p.sale_price < p.price;

            // Generate embedding for semantic search
            const textForEmbedding = `${p.name} ${p.category || ""} ${p.tags?.join(" ") || ""} ${p.color || ""} ${p.fabric || ""}`;
            const embeddingRes = await openai.embeddings.create({
                model: "text-embedding-3-small",
                input: textForEmbedding
            });
            p.embedding = embeddingRes.data[0].embedding;

            cleaned.push(p);
        }

        // 3️⃣ Upsert products into MongoDB
        for (const product of cleaned) {
            await db.collection("products").updateOne(
                { product_id: product.product_id },
                { $set: product },
                { upsert: true }
            );
        }

        res.json({ message: "Products synced in batches", count: cleaned.length });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
}
