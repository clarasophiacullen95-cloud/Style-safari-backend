import { connectToDatabase } from "../lib/db.js";
import { fetchFromBase44, normalizeProduct, generateEmbedding } from "../lib/helpers.js";

export default async function handler(req, res) {
    if (req.query.secret !== process.env.SYNC_SECRET) return res.status(401).json({ error: "Unauthorized" });

    try {
        const { db } = await connectToDatabase();
        const data = await fetchFromBase44("ProductFeed");
        const products = data.results.map(normalizeProduct);

        for (const product of products) {
            // Create embedding for semantic search
            const embeddingInput = `${product.name} ${product.brand} ${product.category} ${product.color} ${product.fabric}`;
            const embedding = await generateEmbedding(embeddingInput).catch(() => null);
            await db.collection("products").updateOne(
                { product_id: product.product_id },
                { $set: { ...product, embedding } },
                { upsert: true }
            );
        }

        res.json({ message: "Products synced in batches", count: products.length });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
}
