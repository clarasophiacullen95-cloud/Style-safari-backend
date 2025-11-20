// /api/ai-search.js
import { connectToDatabase } from "../lib/db.js";
import OpenAI from "openai";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export default async function handler(req, res) {
  const q = (req.query.q || "").trim();
  const gender = (req.query.gender || "").toLowerCase();
  if (!q) return res.json([]);

  const { db } = await connectToDatabase();

  // If OpenAI key exists, try embedding-based knn search
  if (process.env.OPENAI_API_KEY) {
    try {
      const embModel = process.env.OPENAI_EMBEDDING_MODEL || "text-embedding-3-large";
      const embResp = await openai.embeddings.create({ model: embModel, input: q });
      const vector = embResp.data?.[0]?.embedding;
      if (vector) {
        // Use MongoDB Atlas vector search (knnBeta). If not using Atlas Search, fallback automatically below.
        const pipeline = [
          { $search: { knnBeta: { vector, path: "embedding", k: 50 } } },
          { $match: { in_stock: true } },
        ];
        if (gender) pipeline.push({ $match: { gender: { $in: [gender, "unisex"] } } });
        pipeline.push({ $limit: 25 });

        const results = await db.collection("products").aggregate(pipeline).toArray();
        if (Array.isArray(results) && results.length) return res.json(results);
        // if no results or Atlas Search not configured, fallthrough to text search
      }
    } catch (err) {
      console.warn("Embedding-based search failed:", err.message);
      // continue to text fallback
    }
  }

  // Text-search fallback (requires text index on name/category/description/tags)
  const textQuery = { $text: { $search: q } };
  if (gender) textQuery.gender = { $in: [gender, "unisex"] };

  const fallback = await db.collection("products")
    .find(textQuery, { score: { $meta: "textScore" } })
    .sort({ score: { $meta: "textScore" } })
    .limit(50)
    .toArray();

  res.json(fallback);
}
