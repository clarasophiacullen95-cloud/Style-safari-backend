import { connectToDatabase } from "../lib/db.js";
import { fetchFromBase44, normalizeProduct } from "../lib/helpers.js";

export default async function handler(req, res) {
  if (req.query.secret !== process.env.SYNC_SECRET) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  try {
    const { db } = await connectToDatabase();

    let data;
    try {
      data = await fetchFromBase44("entities/ProductFeed");
    } catch (err) {
      console.error("Base44 fetch failed:", err.message);
      data = await db.collection("products").find({}).toArray(); // fallback to cached
    }

    // Handle both array and { results: [] } structures
    const productsArray = Array.isArray(data) ? data : data.results;

    if (!productsArray || !productsArray.length) {
      return res.json({
        message: "Base44 fetch failed, using cached products",
        count: 0,
        error: "data.results is undefined or invalid",
      });
    }

    const cleaned = productsArray.map(normalizeProduct);

    for (const product of cleaned) {
      await db.collection("products").updateOne(
        { product_id: product.product_id },
        { $set: product },
        { upsert: true }
      );
    }

    res.json({ message: "Products synced", count: cleaned.length });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
}
