import { connectToDatabase } from "./helpers.js";

export default async function handler(req, res) {
    try {
        const secret = req.query.secret;
        if (secret !== process.env.SYNC_SECRET) {
            return res.status(401).json({ error: "Unauthorized" });
        }

        const { db } = await connectToDatabase();
        if (!db) return res.status(500).json({ error: "Missing MongoDB configuration" });

        const { product_id } = req.query;

        let product;
        if (product_id) {
            product = await db.collection("products").findOne({ product_id });
        } else {
            product = await db.collection("products").find().limit(50).toArray(); // default 50 products
        }

        res.status(200).json({ data: product });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
}
