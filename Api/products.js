import { connectDB } from '../lib/db';

export default async function handler(req, res) {
  try {
    const db = await connectDB();
    const products = await db.collection('products').find().toArray();
    res.status(200).json(products);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}
