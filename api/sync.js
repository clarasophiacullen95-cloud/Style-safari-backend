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
            const p = normalizeProduct(product);

            // Flags
            const createdDate = new Date(p.last_synced || new Date());
            const now = new Date();
            p.is_new = (now - createdDate) / (1000 * 60 * 60 * 24) <= 30;
            p.is_on_sale = p.sale_price && p.sale_price < p.price;

            // Embeddings
            const embeddingText = `${p.name} ${p.category} ${p.tags?.join(" ") || ""} ${p.color || ""} ${p.fabric || ""}`;
            const embeddingRes = await openai.embeddings.create({
                model: "text-embedding-3-small",
                input: embeddingText
            });
            p.embedding = embeddingRes.data[0].embedding;

            cleaned.push(p);
        }

        // Upsert into MongoDB
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
