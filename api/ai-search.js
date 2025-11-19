import { connectToDatabase } from "../lib/db.js";
import OpenAI from "openai";

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export default async function handler(req, res) {
    const q = req.query.q;
    const gender = req.query.gender || "unisex";

    if (!q) return res.json([]);

    try {
        const { db } = await connectToDatabase();

        // Map query to category
        let categoryRegex = /.*/;
        const lowerQ = q.toLowerCase();
        if (lowerQ.includes("t-shirt") || lowerQ.includes("tee")) categoryRegex = /t-shirt/i;
        else if (lowerQ.includes("dress")) categoryRegex = /dress/i;
        else if (lowerQ.includes("shoe")) categoryRegex = /shoe/i;

        // Semantic embedding
        const embeddingResponse = await client.embeddings.create({
            model: "text-embedding-3-small",
            input: q
        });
        const vector = embeddingResponse.data[0].embedding;

        const results = await db.collection("products").aggregate([
            {
                $search: {
                    knnBeta: {
                        vector,
                        path: "embedding",
                        k: 50
                    }
                }
            },
            {
                $match: {
                    gender: { $in: [gender, "unisex"] },
                    category: categoryRegex
                }
            },
            { $limit: 25 }
        ]).toArray();

        const cleanedResults = results.map(p => ({
            ...p,
            name: p.name.split("&")[0].trim()
        }));

        res.json(cleanedResults);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
}
