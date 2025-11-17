import { connectToDatabase } from "./helpers.js";

export default async function handler(req, res) {
    try {
        const secret = req.query.secret;
        if (secret !== process.env.SYNC_SECRET) {
            return res.status(401).json({ error: "Unauthorized" });
        }

        const { db } = await connectToDatabase();
        if (!db) return res.status(500).json({ error: "Missing MongoDB configuration" });

        const { brand, category, minPrice, maxPrice, in_stock } = req.query;

        const query = {};

        if (brand) query.brand = brand;
        if (category) query.category = category;
        if (in_stock) query.in_stock = in_stock === "true";

        if (minPrice || maxPrice) {
            query.price = {};
            if (minPrice) query.price.$gte = parseFloat(minPrice);
            if (maxPrice) query.price.$lte = parseFloat(maxPrice);
        }

        const products = await db.collection("products")
            .find(query)
            .limit(100) // limit to avoid timeouts
            .toArray();

        res.status(200).json({ count: products.length, data: products });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
}
