import { connectToDatabase } from "../lib/db.js";
import { fetchFromBase44, normalizeProduct, generateEmbedding } from "../lib/helpers.js";

export default async function handler(req, res) {
  if (req.query.secret !== process.env.SYNC_SECRET) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  try {
    const { db } = await connectToDatabase();
    const rawProducts = await fetchFromBase44("ProductFeed");

    const cleaned = [];
    for (const p of rawProducts) {
      const product = normalizeProduct(p);
      product.embedding = await generateEmbedding(`${product.name} ${product.category} ${product.tags.join(" ")}`);
      cleaned.push(product);

      await db.collection("products").updateOne(
        { product_id: product.product_id },
        { $set: product },
        { upsert: true }
      );
    }

    res.json({ message: "Products synced", count: cleaned.length });
  } catch (err) {
    console.error("Sync failed:", err);
    res.status(500).json({ error: err.message });
  }
}
