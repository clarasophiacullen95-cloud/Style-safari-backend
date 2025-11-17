// /api/sync.js
import { connectToDatabase } from "../lib/db.js";

export default async function handler(req, res) {
  const secret = req.query.secret;
  if (!secret || secret !== process.env.SYNC_SECRET) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  try {
    const db = await connectToDatabase();

    // Fetch products from Base44
    const base44Response = await fetch(
      `https://app.base44.com/api/apps/${process.env.BASE44_APP_ID}/entities/ProductFeed`,
      {
        headers: {
          "api_key": process.env.BASE44_API_KEY,
          "Content-Type": "application/json",
        },
      }
    );

    if (!base44Response.ok) {
      const errorText = await base44Response.text();
      return res.status(base44Response.status).json({ error: errorText });
    }

    const products = await base44Response.json();

    // Upsert products into MongoDB
    const bulkOps = products.map((product) => ({
      updateOne: {
        filter: { product_id: product.product_id },
        update: { $set: product },
        upsert: true,
      },
    }));

    if (bulkOps.length > 0) {
      const result = await db.collection("products").bulkWrite(bulkOps);
      return res.json({ message: "Products synced", count: result.upsertedCount + result.modifiedCount });
    }

    return res.json({ message: "No products to sync", count: 0 });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Internal Server Error" });
  }
}
