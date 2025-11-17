import { fetchAffiliateProducts } from './helpers';
import { saveProduct } from '../lib/saveProduct';

export default async function handler(req, res) {
  console.log('Sync function called');

  // Only allow GET
  if (req.method !== 'GET') {
    console.log('Wrong method:', req.method);
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Check secret
  if (req.query.secret !== process.env.SYNC_SECRET) {
    console.log('Unauthorized attempt with secret:', req.query.secret);
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    console.log('Fetching products from Base44...');
    const products = await fetchAffiliateProducts();

    if (!Array.isArray(products)) {
      console.log('Error: products is not an array:', products);
      return res.status(500).json({ error: 'Invalid response from Base44 API' });
    }

    console.log(`Fetched ${products.length} products, saving to DB...`);
    for (const product of products) {
      await saveProduct(product);
    }

    console.log('All products saved successfully');
    res.status(200).json({ message: 'Products synced', count: products.length });

  } catch (err) {
    console.error('Sync function error:', err);
    res.status(500).json({ error: err.message });
  }
}
