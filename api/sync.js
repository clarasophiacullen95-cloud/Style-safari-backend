import { connectToDatabase } from "../lib/db.js";
import { fetchFromBase44, normalizeProduct } from "../lib/helpers.js";

export default async function handler(req, res) {
    if (req.query.secret !== process.env.SYNC_SECRET) {
        return res.status(401).json({ error: "Unauthorized" });
    }

    try {
        const { db } = await connectToDatabase();

        // Fetch from Base44
        const data = await fetchFromBase44("entities/ProductFeed");

        // Log the raw response for debugging
        console.log("Base44 raw response:", JSON.stringify(data, null, 2));

        // Safely access the results array
        const resultsArray = data?.results || data?.data || [];

        if (!Array.isArray(resultsArray) || resultsArray.length === 0) {
            return res.status(500).json({
                error: "Base44 data.results is undefined or invalid",
                rawData: data
            });
        }

        // Normalize products
        const cleaned = resultsArray.map(normalizeProduct);

        // Upsert into MongoDB
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
