import { connectToDatabase, fetchFromBase44, normalizeProduct } from "../api/helpers.js";

export default async function handler(req, res) {
    if (req.query.secret !== process.env.SYNC_SECRET) return res.status(401).json({ error: "Unauthorized" });

    try {
        const { db } = await connectToDatabase();
        const rawProducts = await fetchFromBase44("entities/ProductFeed");

        if (!rawProducts.length) return res.json({ message: "No products available", count: 0 });

        const cleaned = rawProducts.map(normalizeProduct);

        const ops = cleaned.map(p => ({
            updateOne: { filter: { product_id: p.product_id }, update: { $set: p }, upsert: true }
        }));

        if (ops.length > 0) await db.collection("products").bulkWrite(ops);

        res.json({ message: "Products synced", count: cleaned.length });
    } catch (err) {
        console.error("Sync error:", err);
        res.status(500).json({ error: err.message });
    }
}
