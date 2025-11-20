import { connectToDatabase } from "../lib/db.js";
import { normalizeProduct } from "../lib/helpers.js";
import OpenAI from "openai";

const client = process.env.OPENAI_API_KEY ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY }) : null;

async function fetchFromBase44(entity) {
  try {
    const res = await fetch(`https://app.base44.com/api/apps/${process.env.BASE44_APP_ID}/entities/${entity}`, {
      headers: {
        "api_key": process.env.BASE44_API_KEY,
        "Content-Type": "application/json"
      }
    });
    const data = await res.json();
    return data;
  } catch (e) {
    console.error("Base44 fetch error:", e.message);
    return null;
  }
}

export default async function handler(req, res) {
  if (req.query.secret !== process.env.SYNC_SECRET) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  try {
    const { db } = await connectToDatabase();

    // Fetch products
    const rawData = await fetchFromBase44("entities/ProductFeed");
    const dataArray = Array.isArray(rawData) ? rawData : rawData?.results;

    if (!dataArray || !Array.isArray(dataArray)) {
      return res.status(500).json({ error: "Base44 data.results is undefined or invalid" });
    }

    // Batch processing to avoid rate limits
    const batchSize = 50;
    for (let i = 0; i < dataArray.length; i += batchSize) {
      const batch = dataArray.slice(i, i + batchSize);

      for (const raw of batch) {
        const product = normalizeProduct(raw);

        // Mark new products (added in last 30 days)
        product.is_new = product.last_synced
          ? (new Date() - new Date(product.last_synced)) / (1000 * 60 * 60 * 24) <= 30
          : false;

        // Upsert into MongoDB
        await db.collection("products").updateOne(
          { product_id: product.product_id },
          { $set: { ...product, last_synced: new Date() } },
          { upsert: true }
        );

        // Generate embedding if OpenAI available
        if (client) {
          try {
            const embeddingRes = await client.embeddings.create({
              model: "text-embedding-3-large",
              input: product.name + " " + (product.description || "")
            });
            const vector = embeddingRes.data[0].embedding;
            await db.collection("products").updateOne(
              { product_id: product.product_id },
              { $set: { embedding: vector } }
            );
          } catch (err) {
            console.error(`Embedding generation failed for ${product.product_id}`, err.message);
          }
        }
      }

      // Small delay between batches to avoid hitting rate limits
      await new Promise(r => setTimeout(r, 1000));
    }

    res.json({ message: "Products synced (with cache fallback and batching)", count: dataArray.length });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
}
