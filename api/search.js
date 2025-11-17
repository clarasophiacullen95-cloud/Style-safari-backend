import { connectToDatabase } from "./helpers.js";

export default async function handler(req, res) {
    try {
        const secret = req.query.secret;
        if (secret !== process.env.SYNC_SECRET) return res.status(401).json({ error: "Unauthorized" });

        const { db } = await connectToDatabase();
        if (!db) return res.status(500).json({ error: "Missing MongoDB configuration" });

        const { q, brand, category, minPrice, maxPrice, in_stock, store, user_gender } = req.query;

        const query = {};

        // Brand mapping: optional alias mapping collection
        if (brand) {
            const mapping = await db.collection("brand_mappings").findOne({ brand_aliases: brand });
            const searchBrands = mapping ? mapping.affiliate_brands : [brand];
            query.brand = { $in: searchBrands };
        }

        // Category filter
        if (category) query.category = category;

        // Price filter
        if (minPrice || maxPrice) {
            query.price = {};
            if (minPrice) query.price.$gte = parseFloat(minPrice);
            if (maxPrice) query.price.$lte = parseFloat(maxPrice);
        }

        // Stock filter
        if (in_stock) query.in_stock = in_stock === "true";

        // Store filter
        if (store) query.store = store;

        // Multi-keyword search
        if (q) {
            const keywords = q.toLowerCase().split(" ");
            query.$and = keywords.map(word => ({
                $or: [
                    { name: { $regex: word, $options: "i" } },
                    { category: { $regex: word, $options: "i" } },
                    { tags: { $regex: word, $options: "i" } },
                    { color: { $regex: word, $options: "i" } }
                ]
            }));
        }

        // Gender filter (prioritize store-brand mapping)
        if (user_gender) {
            query.$or = [
                { gender: user_gender.toLowerCase() },  // mapped gender from sync
                { gender: null },                        // unisex
                { gender: { $exists: false } }          // fallback
            ];
        }

        // Execute search
        const products = await db.collection("products")
            .find(query)
            .limit(100)
            .toArray();

        // Optional fallback if zero results
        if (products.length === 0 && store) {
            const fallback = await db.collection("products")
                .find({ store })
                .limit(50)
                .toArray();
            return res.status(200).json({ count: fallback.length, data: fallback, fallback: true });
        }

        res.status(200).json({ count: products.length, data: products });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
}
