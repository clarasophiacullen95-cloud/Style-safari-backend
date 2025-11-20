import { connectToDatabase } from "../../lib/db.js";
import { normalizeProduct } from "../../lib/helpers.js";
import { generateEmbedding } from "../../lib/embeddings.js";
import fetch from "node-fetch";

export default async function handler(req, res) {
    if (req.query.secret !== process.env.SYNC_SECRET) {
        return res.status(401).json({ error: "Unauthorized" });
    }

    try {
        const { db } = await connectToDatabase();

        const response = await fetch(
            `https://app.base44.com/api/apps/${process.env.BASE44_APP_ID}/entities/ProductFeed`,
            {
                headers: {
                    "api_key": process.env.BASE44_API_KEY,
                    "Content-Type": "application/json"
                }
            }
        );

        const raw = await response.json();

        // 🔥 FIX: Accept Base44 array OR object format
        const results = Array.isArray(raw)
            ? raw
            : raw.results || raw.data || [];

        if (!Array.isArray(results)) {
            return res.status(500).json({
                error: "Base44 response not array",
                raw
            });
        }

        let synced = 0;

        for (const item of results) {
            const product = normalizeProduct(item);
            const embedding = await generateEmbedding(product);

            await db.collection("products").updateOne(
                { product_id: product.product_id },
                { $set: { ...product, embedding, last_synced: new Date() } },
                { upsert: true }
            );

            synced++;
        }

        res.json({
            message: "Products synced",
            count: synced
        });

    } catch (err) {
        res.status(500).json({ error: err.message });
    }
}
