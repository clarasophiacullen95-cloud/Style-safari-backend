import { connectToDatabase } from "../lib/db.js";
import { fetchFromBase44, normalizeProduct } from "../lib/helpers.js";

export default async function handler(req, res) {
    if (req.query.secret !== process.env.SYNC_SECRET) {
        return res.status(401).json({ error: "Unauthorized" });
    }

    try {
        const { db } = await connectToDatabase();

        // Fetch product feed from Base44
        const data = await fetchFromBase44("entities/ProductFeed");

        // Normalize products and add new fields
        const cleaned = data.results.map(product => {
            const normalized = normalizeProduct(product);

            // Set is_new if product added within last 30 days
            const lastSynced = new Date(product.last_synced || product.created_at);
            const now = new Date();
            const diffDays = (now - lastSynced) / (1000 * 60 * 60 * 24);
            normalized.is_new = diffDays <= 30;

            // Populate additional fields if available
            normalized.size = product.size || null;
            normalized.fabric = product.fabric || null;
            normalized.occasion = product.occasion || null;
            normalized.season = product.season || null;

            return normalized;
        });

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
