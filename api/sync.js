import { fetchAffiliateProducts } from "./helpers.js";
import { saveProduct } from "../lib/saveProduct.js";

export default async function handler(req, res) {
  console.log("--- /api/sync called ---");

  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  if (req.query.secret !== process.env.SYNC_SECRET) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  try {
    const products = await fetchAffiliateProducts();
    if (!Array.isArray(products)) {
      return res.status(500).json({ error: "Invalid Base44 API response" });
    }

    for (const product of products) {
      await saveProduct(product);
    }

    res.status(200).json({ message: "Products synced", count: products.length });
  } catch (err) {
    console.error("Sync error:", err);
    res.status(500).json({ error: err.message });
  }
}
