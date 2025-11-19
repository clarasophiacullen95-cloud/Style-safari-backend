import { connectToDatabase } from "../lib/db.js";
import { fetchFromBase44, normalizeProduct } from "../lib/helpers.js";

export default async function handler(req, res) {
  if (req.query.secret !== process.env.SYNC_SECRET) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  try {
    const { db } = await connectToDatabase();

    const data = await fetchFromBase44("entities/ProductFeed");

    const cleaned = [];

    // Process sequentially to handle async embeddings
    for (const product of data.results) {
      const normalized = await normalizeProduct(product);
      cleaned.push(normalized);

      await db.collection("products").updateOne(
        { product_id: normalized.product_id },
        { $set: normalized },
        { upsert: true }
      );
    }

    res.json({ message: "Products synced in batches", count: cleaned.length });
  } catch (err) {
    res.status(500).json({ error: err.message, data: err.data || null });
  }
}
