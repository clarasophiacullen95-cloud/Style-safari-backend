import { connectToDatabase } from "../lib/db.js";
import OpenAI from "openai";

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export default async function handler(req, res) {
    const q = req.query.q;
    const gender = req.query.gender || "unisex";

    if (!q) return res.json([]);

    try {
        const { db } = await connectToDatabase();

        // 1️⃣ Preprocess query for category detection
        let categoryRegex = /.*/; // default: all categories
        const lowerQ = q.toLowerCase();

        if (lowerQ.includes("t-shirt") || lowerQ.includes("tee")) {
            categoryRegex = /t[- ]?shirt/i;
        } else if (lowerQ.includes("dress")) {
            categoryRegex = /dress/i;
        } else if (lowerQ.includes("shoes")) {
            categoryRegex = /shoe/i;
        }
        // add more mappings as needed

        // 2️⃣ Generate embedding for semantic search
        const embeddingResponse = await client.embeddings.create({
            model: "text-embedding-3-small",
            input: q
        });
        const vector = embeddingResponse.data[0].embedding;

        // 3️⃣ Query MongoDB using semantic search and filters
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
            { $limit: 25 } // max results
        ]).toArray();

        // 4️⃣ Optional: clean product title for frontend
        const cleanedResults = results.map(p => ({
            ...p,
            name: p.name.split("&")[0].trim() // remove extra noisy parts
        }));

        res.json(cleanedResults);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
}
