import OpenAI from "openai";
import { connectToDatabase } from "../lib/db.js";

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export default async function handler(req, res) {
  const q = req.query.q;
  const gender = req.query.gender;

  if (!q) return res.json([]);

  try {
    const embedding = await client.embeddings.create({
      model: "text-embedding-3-large",
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
        $match: { gender: { $in: [gender, "unisex"] } } // filter by gender
      }
    ]).toArray();

    res.json(results);
  } catch (err) {
    console.error("Search error:", err.message);
    res.status(500).json({ error: err.message });
  }
}
