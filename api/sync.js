import { connectToDatabase } from "../lib/db.js";
import { fetchFromBase44, normalizeProduct } from "../lib/helpers.js";

const BATCH_SIZE = 200; // number of products per batch
const MAX_RETRIES = 3;

export default async function handler(req, res) {
  if (req.query.secret !== process.env.SYNC_SECRET) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  try {
    const { db } = await connectToDatabase();

    let allProducts = [];
    let page = 0;
    let hasMore = true;

    while (hasMore) {
      let attempts = 0;
      let batchData;

      while (attempts < MAX_RETRIES) {
        try {
          batchData = await fetchFromBase44("entities/ProductFeed", {
            limit: BATCH_SIZE,
            offset: page * BATCH_SIZE,
          });
          break; // success
        } catch (err) {
          attempts++;
          console.warn(`Batch ${page} failed (attempt ${attempts}):`, err.message);
          if (attempts >= MAX_RETRIES) batchData = null;
        }
      }

      if (!batchData || !batchData.results || batchData.results.length === 0) {
        console.warn(`Batch ${page} returned no data. Using cached products.`);
        break; // stop fetching more batches
      }

      const cleaned = batchData.results.map(normalizeProduct);
      allProducts.push(...cleaned);

      // Upsert each product in MongoDB
      for (const product of cleaned) {
        await db.collection("products").updateOne(
          { product_id: product.product_id },
          { $set: product },
          { upsert: true }
        );
      }

      // If less than batch size returned, we've reached the end
      if (batchData.results.length < BATCH_SIZE) {
        hasMore = false;
      } else {
        page++;
      }
    }

    res.json({
      message: "Products synced (with cache fallback and batching)",
      count: allProducts.length,
    });
  } catch (err) {
    console.error("Sync failed:", err);
    res.status(500).json({ error: err.message });
  }
}
