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

        const data = await fetchFromBase44("entities/ProductFeed");

        const cleaned = [];

        for (const product of data.results) {
            const normalized = normalizeProduct(product);

            // --- Step 1: Generate embedding for semantic search
            const textForEmbedding = `${normalized.name || ""} ${normalized.category || ""} ${normalized.brand || ""} ${normalized.fabric || ""} ${normalized.occasion || ""} ${normalized.season || ""}`;
            
            try {
                const embeddingRes = await openai.embeddings.create({
                    model: "text-embedding-3-small",
                    input: textForEmbedding
                });
                normalized.embedding = embeddingRes.data[0].embedding;
            } catch (e) {
                console.error("Error generating embedding for product:", normalized.product_id, e.message);
                normalized.embedding = null; // fallback
            }

            cleaned.push(normalized);

            // --- Step 2: Upsert into MongoDB
            await db.collection("products").updateOne(
                { product_id: normalized.product_id },
                { $set: normalized },
                { upsert: true }
            );
        }

        res.json({ message: "Products synced with embeddings", count: cleaned.length });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
}
