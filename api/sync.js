import { connectToDatabase } from "../lib/db.js";
import { fetchFromBase44, normalizeProduct } from "../lib/helpers.js";
import OpenAI from "openai";

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export default async function handler(req, res) {
  if (req.query.secret !== process.env.SYNC_SECRET) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  try {
    const { db } = await connectToDatabase();

    const data = await fetchFromBase44("entities/ProductFeed");

    if (!data.results || !Array.isArray(data.results)) {
      return res.status(500).json({ error: "Base44 data.results is undefined or invalid" });
    }

    const cleaned = data.results.map(normalizeProduct);

    for (const product of cleaned) {
      // Generate embedding for semantic search
      const embeddingRes = await client.embeddings.create({
        model: "text-embedding-3-large",
        input: product.name + " " + product.description,
      });

      const embedding = embeddingRes.data[0].embedding;

      await db.collection("products").updateOne(
        { product_id: product.product_id },
        { $set: { ...product, embedding } },
        { upsert: true }
      );
    }

    res.json({ message: "Products synced in batches", count: cleaned.length });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}
