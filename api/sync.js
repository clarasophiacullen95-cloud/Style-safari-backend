import { fetchFromBase44, connectToDatabase } from "./helpers.js";

export default async function handler(req, res) {
    try {
        const { db } = await connectToDatabase();
        if (!db) {
            return res.status(500).json({ error: "Missing MongoDB configuration" });
        }

        // Fetch product feed
        const products = await fetchFromBase44("entities/ProductFeed");

        const collection = db.collection("products");
        for (const product of products) {
            await collection.updateOne(
                { product_id: product.product_id },
                { $set: product },
                { upsert: true }
            );
        }

        res.status(200).json({ message: "Products synced", count: products.length });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
}
