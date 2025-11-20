import { connectToDatabase } from "../lib/db.js";
import { fetchFromBase44, normalizeProduct } from "../lib/helpers.js";
import OpenAI from "openai";

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

// Safe fallback model that ALL OpenAI projects have access to
const EMBEDDING_MODEL =
  process.env.OPENAI_EMBEDDING_MODEL || "text-embedding-ada-002";

export default async function handler(req, res) {
  if (req.query.secret !== process.env.SYNC_SECRET) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  try {
    const { db } = await connectToDatabase();

    // Fetch from Base44
    const raw = await fetchFromBase44("entities/ProductFeed");

    if (!raw || !Array.isArray(raw.results)) {
      return res.status(500).json({
        error: "Base44 data.results invalid",
        data: raw
      });
    }

    const products = raw.results.map(normalizeProduct);

    let successCount = 0;
    let failCount = 0;

    for (const product of products) {
      // --- GENERATE EMBEDDING SAFELY ---
      try {
        const embeddingResponse = await client.embeddings.create({
          model: EMBEDDING_MODEL,
          input:
            `${product.name} ${product.description || ""} ${product.category} ${product.color} ${product.fabric}`
        });

        product.embedding = embeddingResponse.data[0].embedding;
      } catch (err) {
        console.error(
          `Embedding failed for ${product.product_id}: ${err.message}`
        );
        product.embedding = null;
        failCount++;
      }

      // Save to MongoDB
      await db.collection("products").updateOne(
        { product_id: product.product_id },
        { $set: product },
        { upsert: true }
      );

      successCount++;
    }

    return res.json({
      message: "Sync complete",
      total: products.length,
      embedded_success: successCount,
      embedded_failed: failCount,
      embedding_model_used: EMBEDDING_MODEL
    });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
