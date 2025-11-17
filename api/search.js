import { connectDB } from "../lib/db.js";

export default async function handler(req, res) {
  try {
    const { q, category, minPrice, maxPrice } = req.query;
    const db = await connectDB();

    const filter = {};
    if (q) filter.name = { $regex: q, $options: "i" };
    if (category) filter.category = category;
    if (minPrice || maxPrice) filter.price = {};
    if (minPrice) filter.price.$gte = Number(minPrice);
    if (maxPrice) filter.price.$lte = Number(maxPrice);

    const products = await db.collection("products").find(filter).toArray();
    res.status(200).json(products);
  } catch (err) {
    console.error("Search error:", err);
    res.status(500).json({ error: err.message });
  }
}
