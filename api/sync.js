import { connectToDatabase } from "../lib/db.js";
import { fetchFromBase44, normalizeProduct } from "../lib/helpers.js";

export default async function handler(req, res) {
    if (req.query.secret !== process.env.SYNC_SECRET) {
        return res.status(401).json({ error: "Unauthorized" });
    }

    try {
        const { db } = await connectToDatabase();

        const data = await fetchFromBase44("entities/ProductFeed");

        // Ensure results is always an array
        const resultsArray = Array.isArray(data.results) ? data.results : [];

        const cleaned = resultsArray.map(normalizeProduct);

        for (const product of cleaned) {
            await db.collection("products").updateOne(
                { product_id: product.product_id },
                { $set: product },
                { upsert: true }
            );
        }

        res.json({ message: "Products synced", count: cleaned.length });
    } catch (err) {
        console.error("Sync error:", err); // log full error
        res.status(500).json({ error: err.message });
    }
}
