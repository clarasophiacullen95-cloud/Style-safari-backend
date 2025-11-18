import OpenAI from "openai";
import { connectToDatabase } from "../lib/db.js";

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export default async function handler(req, res) {
    const q = req.query.q?.trim();
    const gender = req.query.gender || "female";

    if (!q || q.length < 2) return res.json([]);

    try {
        const { db } = await connectToDatabase();

        // Normalize gender categorization
        const genderMatch = {
            $in: [
                gender,
                gender === "female" ? "women" : "men",
                "unisex",
                null,
                ""
            ]
        };

        // Create embedding for semantic search
        const embedding = await client.embeddings.create({
            model: "text-embedding-3-small",
            input: q
        });
        const vector = embedding.data[0].embedding;

        // ---------------------------
        // 1. SEMANTIC VECTOR SEARCH
        // ---------------------------
        let vectorResults = [];

        try {
            vectorResults = await db.collection("products").aggregate([
                {
                    $search: {
                        knnBeta: {
                            path: "embedding",
                            vector,
                            k: 35
                        }
                    }
                },
                { $match: { gender: genderMatch } },
                { $limit: 25 }
            ]).toArray();
        } catch (err) {
            // MongoDB does not have vector index → fallback
            vectorResults = [];
        }

        // ---------------------------
        // 2. KEYWORD MATCH FALLBACK
        // (If semantic results are weak)
        // ---------------------------
        let keywordResults = [];

        if (vectorResults.length < 7) {
            keywordResults = await db.collection("products")
                .find({
                    $or: [
                        { name: { $regex: q, $options: "i" } },
                        { brand: { $regex: q, $options: "i" } },
                        { category: { $regex: q, $options: "i" } },
                        { description: { $regex: q, $options: "i" } }
                    ],
                    gender: genderMatch
                })
                .limit(20)
                .toArray();
        }

        // ---------------------------
        // 3. BRAND STORE MAPPING
        // "Ralph Lauren" → find stockists
        // ---------------------------
        let brandResults = [];
        const brandQuery = q.toLowerCase();

        // Detect if query looks like a brand
        if (brandQuery.split(" ").length <= 3) {
            brandResults = await db.collection("products")
                .find({
                    store_brand_map: { $regex: brandQuery, $options: "i" },
                    gender: genderMatch
                })
                .limit(20)
                .toArray();
        }

        // ---------------------------
        // 4. COMBINE + DEDUPE RESULTS
        // ---------------------------
        const combined = [...vectorResults, ...keywordResults, ...brandResults];

        const unique = [];
        const seen = new Set();
        for (const item of combined) {
            if (!seen.has(item.id)) {
                seen.add(item.id);
                unique.push(item);
            }
        }

        return res.json(unique.slice(0, 30));
    } catch (err) {
        console.error("SEARCH ERROR:", err);
        return res.status(500).json({ error: err.message });
    }
}
