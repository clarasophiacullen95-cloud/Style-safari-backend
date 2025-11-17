import { fetchAffiliateProducts } from './helpers';
import { saveProduct } from '../lib/saveProduct';

export default async function handler(req, res) {
  try {
    if (req.query.secret !== process.env.SYNC_SECRET) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const products = await fetchAffiliateProducts();

    // Use helper function to save each product
    for (const product of products) {
      await saveProduct(product);
    }

    res.status(200).json({ message: 'Products synced', count: products.length });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}
