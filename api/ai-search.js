import OpenAI from "openai";
import { connectToDatabase } from "../lib/db.js";

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export default async function handler(req, res) {
    const q = req.query.q;
    const gender = req.query.gender;

    if (!q) return res.json([]);

    const embedding = await client.embeddings.create({
        model: "text-embedding-3-small",
        input: q
    });

    const vector = embedding.data[0].embedding;

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

    res.json(results);
}
