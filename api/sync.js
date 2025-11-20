import { connectToDatabase } from "../lib/db.js";
import { fetchFromBase44, normalizeProduct } from "../lib/helpers.js";
import OpenAI from "openai";

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export default async function handler(req, res) {
  if (req.query.secret !== process.env.SYNC_SECRET) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  let attempts = 0;
  let data;

  // Retry fetch 3 times
  while (attempts < 3) {
    try {
      data = await fetchFromBase44("entities/ProductFeed");
      if (data && Array.isArray(data.results)) break;
    } catch (err) {
      console.warn("Fetch attempt failed:", attempts + 1, err.message);
    }
    attempts++;
  }

  if (!data || !Array.isArray(data.results)) {
    console.error("Base44 returned invalid data:", data);
    return res.status(500).json({
      error: "Failed after 3 attempts: Base44 data.results is undefined or invalid",
      data,
    });
  }

  const { db } = await connectToDatabase();
  let syncedCount = 0;

  for (const raw of data.results) {
    try {
      const product = normalizeProduct(raw);

      // Flag new products (added within 30 days)
      const createdAt = new Date(raw.created_date || raw.last_synced);
      const isNew = (new Date() - createdAt) / (1000 * 60 * 60 * 24) <= 30;
      product.is_new = isNew;

      // Generate embedding for semantic search
      try {
        const embeddingRes = await client.embeddings.create({
          model: "text-embedding-3-large", // cheaper, smaller model if needed
          input: `${product.name} ${product.description} ${product.brand} ${product.category} ${product.color} ${product.fabric}`,
        });
        product.embedding = embeddingRes.data[0].embedding;
      } catch (e) {
        console.warn(`Embedding generation failed for ${product.product_id}:`, e.message);
      }

      await db.collection("products").updateOne(
        { product_id: product.product_id },
        { $set: { ...product, last_synced: new Date() } },
        { upsert: true }
      );
      syncedCount++;
    } catch (e) {
      console.error("Failed to sync product:", raw.product_id, e.message);
    }
  }

  res.json({ message: "Products synced in batches", count: syncedCount });
}
