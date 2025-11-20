import { connectToDatabase } from "../lib/db.js";
import { fetchFromBase44, normalizeProduct, generateEmbedding } from "../lib/helpers.js";

export default async function handler(req, res) {
    if (req.query.secret !== process.env.SYNC_SECRET) {
        return res.status(401).json({ error: "Unauthorized" });
    }

    try {
        const { db } = await connectToDatabase();
        const data = await fetchFromBase44("entities/ProductFeed");

        if (!data || !Array.isArray(data.results)) {
            return res.status(500).json({ error: "Base44 data.results is undefined or invalid" });
        }

        let count = 0;
        for (const p of data.results) {
            const product = normalizeProduct(p);
            product.embedding = await generateEmbedding(product.name + " " + product.description);
            await db.collection("products").updateOne(
                { product_id: product.product_id },
                { $set: product },
                { upsert: true }
            );
            count++;
        }

        res.json({ message: "Products synced with embeddings", count });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
}
