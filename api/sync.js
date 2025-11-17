import { fetchAffiliateProducts } from './helpers';
import { saveProduct } from '../lib/saveProduct';

export default async function handler(req, res) {
  // Only allow GET
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Check secret
  if (req.query.secret !== process.env.SYNC_SECRET) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    // This runs on serverless backend (Vercel), not in browser
    const products = await fetchAffiliateProducts();

    for (const product of products) {
      await saveProduct(product);
    }

    res.status(200).json({ message: 'Products synced', count: products.length });
  } catch (err) {
    console.error('Sync error:', err);
    res.status(500).json({ error: err.message });
  }
}
