import { fetchAffiliateProducts } from "./helpers.js";
import { connectToDatabase } from "../lib/db.js";

export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  if (req.query.secret !== process.env.SYNC_SECRET) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  try {
    const db = await connectToDatabase();
    const products = await fetchAffiliateProducts();

    if (!Array.isArray(products)) {
      return res.status(500).json({ error: "Invalid Base44 API response" });
    }

    const collection = db.collection("products");

    for (const product of products) {
      await collection.updateOne(
        { product_id: product.product_id },
        { $set: product },
        { upsert: true }
      );
    }

    res.status(200).json({ message: "Products synced", count: products.length });
  } catch (err) {
    console.error("Sync function error:", err);
    res.status(500).json({ error: err.message });
  }
}
