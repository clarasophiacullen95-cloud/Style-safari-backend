import { connectToDatabase, fetchFromBase44 } from "./helpers.js";

// Store-Brand Gender Mapping (dynamic or static)
const storeBrandGender = {
  "FWrd": {
    "Ralph Lauren": "female",
    "Gucci": "male",
    "Nike": null
  },
  "Nordstrom": {
    "Adidas": null,
    "Prada": "female"
  }
};

// Simple rate-limiting store
let lastSyncTime = 0;
const MIN_INTERVAL = 5 * 60 * 1000; // 5 minutes between manual refreshes

export default async function handler(req, res) {
  const secret = req.query.secret;
  if (secret !== process.env.SYNC_SECRET) return res.status(401).json({ error: "Unauthorized" });

  const now = Date.now();
  if (now - lastSyncTime < MIN_INTERVAL) {
    return res.status(429).json({ error: "Refresh too soon, please wait a few minutes." });
  }
  lastSyncTime = now;

  try {
    const { db } = await connectToDatabase();
    const products = await fetchFromBase44("entities/ProductFeed");

    let syncedCount = 0;
    for (const product of products) {
      let gender = null;

      // 1️⃣ Category-based mapping
      if (product.category) {
        const cat = product.category.toLowerCase();
        if (cat.includes("women") || cat.includes("female") || cat.includes("girls")) gender = "female";
        if (cat.includes("men") || cat.includes("male") || cat.includes("boys")) gender = "male";
      }

      // 2️⃣ Tag-based fallback
      if (!gender && product.tags && product.tags.length) {
        const tags = product.tags.map(t => t.toLowerCase());
        if (tags.includes("women") || tags.includes("female")) gender = "female";
        if (tags.includes("men") || tags.includes("male")) gender = "male";
      }

      // 3️⃣ Store-brand mapping fallback
      if (!gender && product.store && product.brand) {
        const storeMap = storeBrandGender[product.store];
        if (storeMap && storeMap[product.brand] !== undefined) {
          gender = storeMap[product.brand];
        }
      }

      // Upsert product in MongoDB
      await db.collection("products").updateOne(
        { product_id: product.product_id },
        { $set: { ...product, gender, last_synced: new Date() } },
        { upsert: true }
      );

      syncedCount++;
    }

    res.status(200).json({ message: "Products synced", count: syncedCount });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
}
