// api/ai-search.js
import OpenAI from "openai";
import { connectToDatabase } from "../lib/db.js";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// If embeddings are missing or OpenAI quota issues, we fallback to text search
export default async function handler(req, res) {
  const q = req.query.q;
  const gender = req.query.gender?.toLowerCase();

  if (!q) return res.json([]);

  try {
    const { db } = await connectToDatabase();

    // Try embedding-based semantic search only if embeddings exist in db
    const hasEmbeddings = await db.collection("products").findOne({ embedding: { $exists: true } });

    if (hasEmbeddings) {
      // Create query embedding. Use preferred model then fallback if 403
      const EMB_MODEL_PRIMARY = process.env.OPENAI_EMBEDDING_MODEL || "text-embedding-3-large";
      const EMB_MODEL_FALLBACK = process.env.OPENAI_EMBEDDING_FALLBACK || "text-embedding-ada-002";

      let vector;
      try {
        const r = await openai.embeddings.create({ model: EMB_MODEL_PRIMARY, input: q });
        vector = r.data[0].embedding;
      } catch (ePrimary) {
        console.warn("Primary embedding model failed:", ePrimary?.message || ePrimary);
        try {
          const r2 = await openai.embeddings.create({ model: EMB_MODEL_FALLBACK, input: q });
          vector = r2.data[0].embedding;
        } catch (eFallback) {
          console.error("Fallback embedding model also failed:", eFallback?.message || eFallback);
          vector = null;
        }
      }

      if (vector) {
        // Use MongoDB Atlas Search kNN if available (knnBeta). If not available, fallback to nearest neighbor on client (not implemented here).
        const pipeline = [
          { $search: { knnBeta: { vector, path: "embedding", k: 30 } } },
          { $match: { in_stock: true, ...(gender ? { gender: { $in: [gender, "unisex"] } } : {}) } },
          { $limit: 25 }
        ];
        const results = await db.collection("products").aggregate(pipeline).toArray();
        return res.json(results);
      }
    }

    // FALLBACK: text search using MongoDB text index
    // You must create a text index: name, category, description, tags
    const textFilter = { $text: { $search: q } };
    if (gender) {
      textFilter.$and = [{ gender: { $in: [gender, "unisex"] } }];
    }

    const results = await db.collection("products").find(textFilter).limit(50).toArray();
    res.json(results);
  } catch (err) {
    console.error("Search error:", err);
    res.status(500).json({ error: err.message });
  }
}
