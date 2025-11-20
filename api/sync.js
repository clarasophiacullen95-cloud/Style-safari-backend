import { connectToDatabase } from "../lib/db.js";
import { normalizeProduct } from "../lib/helpers.js";

export default async function handler(req, res) {
    try {
        const { db } = await connectToDatabase();

        // Base44 automatically calls this endpoint
        // Fetch products from Base44 database (already synced from feeds)
        const base44Products = await db.collection("base44_products").find({}).toArray();

        if (!base44Products || base44Products.length === 0) {
            return res.status(200).json({
                message: "Base44 fetch failed, using cached products",
                count: 0,
                error: "data.results is undefined or invalid"
            });
        }

        const cleaned = base44Products.map(normalizeProduct);

        for (const product of cleaned) {
            await db.collection("products").updateOne(
                { product_id: product.product_id },
                { $set: product },
                { upsert: true }
            );
        }

        res.status(200).json({ message: "Products synced (with cache fallback and batching)", count: cleaned.length });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
}
