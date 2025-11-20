import { connectToDatabase } from "../lib/db.js";
import { fetchFromBase44, normalizeProduct } from "../lib/helpers.js";

export default async function handler(req, res) {
  if (req.query.secret !== process.env.SYNC_SECRET) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  try {
    const { db } = await connectToDatabase();

    // Optional rate limit: only sync if last sync > 15 mins
    const meta = await db.collection("meta").findOne({ key: "lastSync" });
    if (meta && Date.now() - meta.value < 15 * 60 * 1000) {
      return res.json({ message: "Sync skipped: cache still fresh", count: 0 });
    }

    const data = await fetchFromBase44("ProductFeed");
    const cleaned = data.results.map(normalizeProduct);

    for (const product of cleaned) {
      await db.collection("products").updateOne(
        { product_id: product.product_id },
        { $set: product },
        { upsert: true }
      );
    }

    await db.collection("meta").updateOne(
      { key: "lastSync" },
      { $set: { value: Date.now() } },
      { upsert: true }
    );

    res.json({ message: "Products synced in batches", count: cleaned.length });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}
