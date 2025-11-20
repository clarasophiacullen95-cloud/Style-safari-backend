// /api/sync.js
import { connectToDatabase } from "../lib/db.js";
import { fetchFromBase44, normalizeProductBase, generateEmbedding } from "../lib/helpers.js";

export default async function handler(req, res) {
  if (req.query.secret !== process.env.SYNC_SECRET) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  try {
    const { db } = await connectToDatabase();

    const data = await fetchFromBase44("entities/ProductFeed");
    const items = Array.isArray(data.results) ? data.results : [];

    if (!items.length) {
      // Not necessarily an error — it's possible feed is empty or blocked
      return res.json({ message: "No products returned from Base44", count: 0, sample: (data.results || []).slice(0,3) });
    }

    let count = 0;
    // Process sequentially to avoid rate bursts against OpenAI
    for (const raw of items) {
      const base = normalizeProductBase(raw);

      // Try generate embedding if OpenAI key and model available
      if (process.env.OPENAI_API_KEY) {
        const textForEmbedding = `${base.name} ${base.brand} ${base.category} ${base.color} ${base.fabric ?? ""} ${base.tags.join(" ")}`;
        try {
          const emb = await generateEmbedding(textForEmbedding);
          base.embedding = emb;
        } catch (embErr) {
          // Log and continue — do not fail the whole sync
          console.warn(`Embedding generation failed for ${base.product_id}: ${embErr.message}`);
          base.embedding = null;
        }
      } else {
        base.embedding = null;
      }

      await db.collection("products").updateOne(
        { product_id: base.product_id },
        { $set: base },
        { upsert: true }
      );

      count++;
    }

    return res.json({ message: "Products synced", count });
  } catch (err) {
    console.error("Sync error:", err);
    return res.status(500).json({ error: err.message });
  }
}
