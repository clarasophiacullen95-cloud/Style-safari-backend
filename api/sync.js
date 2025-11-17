import { fetchFromBase44, connectToDatabase } from "./helpers.js";

export default async function handler(req, res) {
    try {
        const secret = req.query.secret;
        if (secret !== process.env.SYNC_SECRET) {
            return res.status(401).json({ error: "Unauthorized" });
        }

        const { db } = await connectToDatabase();
        if (!db) return res.status(500).json({ error: "Missing MongoDB configuration" });

        // Fetch all products from Base44
        const products = await fetchFromBase44("entities/ProductFeed");

        const collection = db.collection("products");

        // Bulk upsert
        const bulkOps = products.map(product => ({
            updateOne: {
                filter: { product_id: product.product_id },
                update: { $set: product },
                upsert: true
            }
        }));

        let newCount = 0;
        if (bulkOps.length > 0) {
            const result = await collection.bulkWrite(bulkOps);
            newCount = result.upsertedCount;
        }

        res.status(200).json({
            message: "Products synced",
            totalProcessed: products.length,
            newAdded: newCount
        });

    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
}
