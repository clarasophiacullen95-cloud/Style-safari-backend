import { connectDB } from '../lib/db';

export default async function handler(req, res) {
  try {
    const { q, category, minPrice, maxPrice, rating } = req.query;
    const db = await connectDB();

    const filters = {};

    if (q) filters.name = { $regex: q, $options: 'i' };
    if (category) filters.category = category;
    if (minPrice || maxPrice) filters.price = {};
    if (minPrice) filters.price.$gte = Number(minPrice);
    if (maxPrice) filters.price.$lte = Number(maxPrice);
    if (rating) filters.rating = { $gte: Number(rating) };

    const products = await db.collection('products').find(filters).toArray();
    res.status(200).json(products);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}
