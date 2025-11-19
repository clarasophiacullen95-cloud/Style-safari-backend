import { connectToDatabase } from "../lib/db.js";
import { fetchFromBase44, normalizeProduct } from "../lib/helpers.js";

export default async function handler(req, res) {
    if (req.query.secret !== process.env.SYNC_SECRET) {
        return res.status(401).json({ error: "Unauthorized" });
    }

    try {
        const { db } = await connectToDatabase();

        const data = await fetchFromBase44("entities/ProductFeed");

        const entities = data.results || data.entities || [];

        if (entities.length === 0) {
            return res.status(500).json({ error: "No products returned from Base44" });
        }

        const cleaned = entities.map(normalizeProduct);

        for (const product of cleaned) {
            await db.collection("products").updateOne(
                { product_id: product.product_id },
                { $set: product },
                { upsert: true }
            );
        }

        res.json({ message: "Products synced", count: cleaned.length });
    } catch (err) {
        console.error("Sync error:", err);
        res.status(500).json({ error: err.message });
    }
}
