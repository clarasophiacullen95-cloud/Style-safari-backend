import OpenAI from "openai";
import { connectToDatabase } from "../lib/db.js";

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export default async function handler(req, res) {
  const q = (req.query.q || "").trim().toLowerCase();
  const gender = req.query.gender || "unisex";

  if (!q) return res.json([]);

  try {
    const { db } = await connectToDatabase();

    // Use semantic embeddings for better relevance
    let vector;
    try {
      const embedding = await client.embeddings.create({
        model: "text-embedding-3-large",
        input: q,
      });
      vector = embedding.data[0].embedding;
    } catch (e) {
      console.warn("Embedding generation failed, falling back to keyword search:", e.message);
    }

    let results = [];

    if (vector) {
      // Use MongoDB Atlas search if embedding available
      results = await db.collection("products").aggregate([
        {
          $search: {
            knnBeta: {
              vector,
              path: "embedding",
              k: 50,
            },
          },
        },
        {
          $match: { gender: { $in: [gender, "unisex"] } },
        },
      ]).toArray();
    } else {
      // Fallback: keyword search
      const regex = new RegExp(q.split(" ").join("|"), "i"); // OR match all words
      results = await db.collection("products")
        .find({
          gender: { $in: [gender, "unisex"] },
          $or: [
            { name: regex },
            { description: regex },
            { category: regex },
            { fabric: regex },
            { tags: regex },
            { brand: regex },
          ],
        })
        .limit(50)
        .toArray();
    }

    // Optional: sort exact matches first
    results.sort((a, b) => {
      const aExact = a.name.toLowerCase().includes(q) ? 1 : 0;
      const bExact = b.name.toLowerCase().includes(q) ? 1 : 0;
      return bExact - aExact;
    });

    res.json(results);
  } catch (err) {
    console.error("Search failed:", err);
    res.status(500).json({ error: err.message });
  }
}
