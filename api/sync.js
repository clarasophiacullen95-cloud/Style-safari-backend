import { fetchFromBase44, connectToDatabase } from "./helpers.js";

export default async function handler(req, res) {
    try {
        const { db } = await connectToDatabase();
        if (!db) return res.status(500).json({ error: "Missing MongoDB configuration" });

        const products = await fetchFromBase44("entities/ProductFeed");
        const collection = db.collection("products");

        const bulkOps = products.map(product => ({
            updateOne: {
                filter: { product_id: product.product_id },
                update: { $set: product },
                upsert: true
            }
        }));

        if (bulkOps.length > 0) await collection.bulkWrite(bulkOps);

        res.status(200).json({ message: "Products synced", count: products.length });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
}
