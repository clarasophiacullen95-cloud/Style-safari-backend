import { connectToDatabase } from "../lib/db.js";

export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const db = await connectToDatabase();
    const collection = db.collection("products");

    const {
      q,             // search text in name/description
      brand,         // filter by brand
      category,      // filter by category
      min_price,     // minimum price
      max_price,     // maximum price
      in_stock       // true/false
    } = req.query;

    const query = {};

    // Text search in name and description
    if (q) {
      query.$or = [
        { name: { $regex: q, $options: "i" } },
        { description: { $regex: q, $options: "i" } }
      ];
    }

    if (brand) {
      query.brand = brand;
    }

    if (category) {
      query.category = category;
    }

    if (min_price || max_price) {
      query.price = {};
      if (min_price) query.price.$gte = parseFloat(min_price);
      if (max_price) query.price.$lte = parseFloat(max_price);
    }

    if (in_stock !== undefined) {
      query.in_stock = in_stock === "true";
    }

    // Fetch matching products, limit 100 results
    const products = await collection.find(query).limit(100).toArray();

    res.status(200).json({ count: products.length, products });
  } catch (err) {
    console.error("Search function error:", err);
    res.status(500).json({ error: err.message });
  }
}
