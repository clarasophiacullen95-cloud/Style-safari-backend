import OpenAI from "openai";
import { connectToDatabase } from "../lib/db.js";

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export default async function handler(req, res) {
    try {
        const q = req.query.q;
        const gender = req.query.gender || "unisex";

        if (!q) return res.json([]);

        const embeddingResponse = await client.embeddings.create({
            model: "text-embedding-3-large",
            input: q
        });

        const vector = embeddingResponse.data[0].embedding;

        const { db } = await connectToDatabase();

        const results = await db.collection("products").aggregate([
            {
                $search: {
                    knnBeta: {
                        vector,
                        path: "embedding",
                        k: 25
                    }
                }
            },
            {
                $match: { gender: { $in: [gender, "unisex"] } }
            }
        ]).toArray();

        res.status(200).json(results);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
}
