import { connectToDatabase } from "../lib/db.js";
import { fetchFromBase44, normalizeProduct } from "../lib/helpers.js";

export default async function handler(req, res) {
    if (req.query.secret !== process.env.SYNC_SECRET) {
        return res.status(401).json({ error: "Unauthorized" });
    }

    try {
        const { db } = await connectToDatabase();
        const data = await fetchFromBase44("entities/ProductFeed");
        if (!data.results) return res.status(500).json({ error: "Base44 data.results is undefined" });

        const cleaned = data.results.map(normalizeProduct);

        for (const product of cleaned) {
            await db.collection("products").updateOne(
                { product_id: product.product_id },
                { $set: product },
                { upsert: true }
            );
        }

        res.json({ message: "Products synced", count: cleaned.length });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
}
