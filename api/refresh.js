import { connectToDatabase } from "./helpers.js";

export default async function handler(req, res) {
    const secret = req.query.secret;
    if (secret !== process.env.SYNC_SECRET) return res.status(401).json({ error: "Unauthorized" });

    try {
        const { db } = await connectToDatabase();
        const products = await db.collection("products")
            .find()
            .sort({ last_synced: -1 })
            .limit(50) // latest products
            .toArray();

        res.status(200).json({ message: "Cached products returned", count: products.length, data: products });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
}
