import { connectToDatabase } from "../lib/db.js";
import { fetchFromBase44, normalizeProduct } from "../lib/helpers.js";

export default async function handler(req, res) {
    if (req.query.secret !== process.env.SYNC_SECRET) {
        return res.status(401).json({ error: "Unauthorized" });
    }

    try {
        const { db } = await connectToDatabase();

        // Fetch products from Base44
        const products = await fetchFromBase44("ProductFeed");

        if (!products.length) {
            const cachedCount = await db.collection("products").countDocuments();
            return res.json({
                message: "Base44 fetch failed, using cached products",
                count: cachedCount,
                error: "data.results is undefined or invalid",
            });
        }

        const cleaned = products.map(normalizeProduct);

        // Upsert into MongoDB
        for (const product of cleaned) {
            await db.collection("products").updateOne(
                { product_id: product.product_id },
                { $set: product },
                { upsert: true }
            );
        }

        res.json({ message: "Products synced (with cache fallback and batching)", count: cleaned.length });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
}
