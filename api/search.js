import { connectToDatabase } from "../lib/helpers.js";
import OpenAI from "openai";

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export default async function handler(req, res) {
    const q = req.query.q?.trim();
    const gender = req.query.gender || "unisex";

    if (!q) return res.json([]);

    const { db } = await connectToDatabase();

    // --- Step 1: Phrase + field-aware search (fast)
    const keywords = q.toLowerCase().split(" ");
    const phraseQuery = {
        gender: { $in: [gender, "unisex"] },
        $or: [
            { name: { $regex: q, $options: "i" } },
            { category: { $regex: q, $options: "i" } },
            { store_brand_mapping: { $regex: q, $options: "i" } },
        ]
    };

    let results = await db.collection("products")
        .find(phraseQuery)
        .limit(50)
        .toArray();

    // --- Step 2: If no results, fallback to keyword search
    if (!results.length) {
        const keywordQuery = {
            gender: { $in: [gender, "unisex"] },
            $and: keywords.map(kw => ({
                $or: [
                    { name: { $regex: kw, $options: "i" } },
                    { category: { $regex: kw, $options: "i" } },
                    { brand: { $regex: kw, $options: "i" } },
                    { store_brand_mapping: { $regex: kw, $options: "i" } },
                    { fabric: { $regex: kw, $options: "i" } },
                    { size: { $regex: kw, $options: "i" } },
                    { occasion: { $regex: kw, $options: "i" } },
                    { season: { $regex: kw, $options: "i" } },
                ]
            }))
        };

        results = await db.collection("products")
            .find(keywordQuery)
            .limit(100)
            .toArray();
    }

    // --- Step 3: If still no results, use semantic search via OpenAI embeddings
    if (!results.length) {
        const embeddingRes = await client.embeddings.create({
            model: "text-embedding-3-small",
            input: q
        });

        const vector = embeddingRes.data[0].embedding;

        // MongoDB Atlas Search required with vector search index on `embedding` field
        results = await db.collection("products").aggregate([
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
    }

    // --- Step 4: Sort results: new products first, then by price ascending
    results.sort((a, b) => {
        if (a.is_new && !b.is_new) return -1;
        if (!a.is_new && b.is_new) return 1;
        return (a.price || 0) - (b.price || 0);
    });

    res.json(results);
}
