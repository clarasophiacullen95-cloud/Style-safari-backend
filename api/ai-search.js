import OpenAI from "openai";
import { connectToDatabase } from "../lib/db.js";

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export default async function handler(req, res) {
  const q = req.query.q;
  const gender = req.query.gender;

  if (!q) return res.json([]);

  try {
    const embedding = await client.embeddings.create({
      model: "text-embedding-3-small", // or "text-embedding-3-large" if your project has access
      input: q
    });
    const vector = embedding.data[0].embedding;

    const { db } = await connectToDatabase();

    const regex = new RegExp(q.split(" ").join("|"), "i");

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
        $match: {
          gender: { $in: [gender, "unisex"] },
          $or: [
            { name: regex },
            { category: regex },
            { tags: regex },
            { fabric: regex },
            { size: regex },
            { occasion: regex },
            { season: regex }
          ]
        }
      }
    ]).toArray();

    res.json(results);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
}
