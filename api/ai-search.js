import OpenAI from "openai";
import { connectToDatabase } from "../lib/db.js";

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export default async function handler(req, res) {
    const q = req.query.q?.toLowerCase();
    const gender = req.query.gender || "unisex";

    if (!q) return res.json([]);

    const { db } = await connectToDatabase();

    // First, try semantic search
    try {
        const embedding = await client.embeddings.create({
            model: "text-embedding-3-large",
            input: q
        });

        const vector = embedding.data[0].embedding;

        const results = await db.collection("products").aggregate([
            {
                $search: {
                    knnBeta: { vector, path: "embedding", k: 50 }
                }
            },
            {
                $match: { gender: { $in: [gender, "unisex"] } }
            }
        ]).toArray();

        if (results.length) return res.json(results);

    } catch (err) {
        console.error("Embedding search failed:", err.message);
    }

    // Fallback: text search
    const fallback = await db.collection("products").find({
        gender: { $in: [gender, "unisex"] },
        $or: [
            { name: { $regex: q, $options: "i" } },
            { description: { $regex: q, $options: "i" } },
            { category: { $regex: q, $options: "i" } },
            { fabric: { $regex: q, $options: "i" } }
        ]
    }).limit(50).toArray();

    res.json(fallback);
}
