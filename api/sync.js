import { connectToDatabase } from "../lib/db.js";
import { fetchFromBase44, normalizeProduct } from "../lib/helpers.js";

export default async function handler(req, res) {
    if (req.query.secret !== process.env.SYNC_SECRET) {
        return res.status(401).json({ error: "Unauthorized" });
    }

    try {
        const { db } = await connectToDatabase();

        // Fetch raw Base44 feed
        const data = await fetchFromBase44("entities/ProductFeed");

        // Base44 sometimes returns:
        // - { results: [...] }
        // - { data: [...] }
        // - [...]
        // - { items: [...] }
        let items = [];

        if (Array.isArray(data)) {
            items = data;
        } else if (Array.isArray(data.results)) {
            items = data.results;
        } else if (Array.isArray(data.data)) {
            items = data.data;
        } else if (Array.isArray(data.items)) {
            items = data.items;
        } else {
            return res.status(500).json({
                error: "Base44 returned unexpected structure",
                base44_response: data
            });
        }

        const cleaned = items.map(normalizeProduct);

        for (const product of cleaned) {
            await db.collection("products").updateOne(
                { product_id: product.product_id },
                { $set: product },
                { upsert: true }
            );
        }

        res.json({
            message: "Products synced",
            count: cleaned.length
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
}
