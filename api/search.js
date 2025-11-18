import { connectToDatabase } from "../api/helpers.js";

export default async function handler(req, res) {
    const q = req.query.q;
    const gender = req.query.gender || "unisex";

    if (!q) return res.json([]);

    const { db } = await connectToDatabase();
    const keywords = q.toLowerCase().split(" ");

    const results = await db.collection("products").find({
        gender: { $in: [gender, "unisex"] },
        $and: keywords.map(k => ({
            $or: [
                { name: { $regex: k, $options: "i" } },
                { category: { $regex: k, $options: "i" } },
                { brand: { $regex: k, $options: "i" } },
                { fabric: { $regex: k, $options: "i" } },
                { size: { $regex: k, $options: "i" } }
            ]
        }))
    }).limit(100).toArray();

    res.json(results);
}
