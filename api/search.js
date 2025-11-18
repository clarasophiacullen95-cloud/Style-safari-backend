import { connectToDatabase } from "../api/helpers.js";

export default async function handler(req, res) {
    const q = req.query.q?.trim();
    const gender = req.query.gender || "unisex";

    if (!q) return res.json([]);

    const { db } = await connectToDatabase();

    // Split query into keywords
    const keywords = q.toLowerCase().split(" ");

    // Build precise query
    const query = {
        gender: { $in: [gender, "unisex"] },
        $and: keywords.map(kw => ({
            $or: [
                { name: { $regex: kw, $options: "i" } },
                { category: { $regex: kw, $options: "i" } },
                { brand: { $regex: kw, $options: "i" } },
                { fabric: { $regex: kw, $options: "i" } },
                { size: { $regex: kw, $options: "i" } },
            ]
        }))
    };

    // Fetch matching products
    const results = await db.collection("products")
        .find(query)
        .limit(100)
        .sort({ is_new: -1, price: 1 }) // prioritize new and cheaper items
        .toArray();

    res.json(results);
}
