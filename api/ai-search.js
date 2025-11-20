import OpenAI from "openai";
import { connectToDatabase } from "../lib/db.js";

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export default async function handler(req, res) {
  const query = req.query.q;
  const gender = req.query.gender || "unisex";

  if (!query) return res.json([]);

  try {
    const vectorRes = await client.embeddings.create({
      model: "text-embedding-3-large",
      input: query
    });

    const vector = vectorRes.data[0].embedding;
    const { db } = await connectToDatabase();

    const results = await db.collection("products").aggregate([
      { $search: { knnBeta: { vector, path: "embedding", k: 25 } } },
      { $match: { gender: { $in: [gender, "unisex"] } } }
    ]).toArray();

    res.json(results);
  } catch (err) {
    console.error("Search error:", err);
    res.status(500).json({ error: err.message });
  }
}
