import { fetchAffiliateProducts } from './helpers';
import { connectDB } from '../lib/db';

export default async function handler(req, res) {
  try {
    if (req.query.secret !== process.env.SYNC_SECRET) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const db = await connectDB();
    const products = await fetchAffiliateProducts();

    for (const product of products) {
      await db.collection('products').updateOne(
        { id: product.id },
        { $set: product },
        { upsert: true }
      );
    }

    res.status(200).json({ message: 'Products synced', count: products.length });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}
