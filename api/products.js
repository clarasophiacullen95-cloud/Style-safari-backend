import { connectToDatabase } from "../lib/db.js";

export default async function handler(req, res) {
  const db = await connectToDatabase();
  const collection = db.collection("products");

  try {
    if (req.method !== "GET") {
      return res.status(405).json({ error: "Method not allowed" });
    }

    const { product_id } = req.query;

    if (product_id) {
      // Fetch a single product by product_id
      const product = await collection.findOne({ product_id: product_id });
      if (!product) {
        return res.status(404).json({ error: "Product not found" });
      }
      return res.status(200).json(product);
    } else {
      // Fetch all products (limit 200)
      const products = await collection.find({}).limit(200).toArray();
      return res.status(200).json({ count: products.length, products });
    }

  } catch (err) {
    console.error("Products function error:", err);
    res.status(500).json({ error: err.message });
  }
}
