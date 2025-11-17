import fetch from 'node-fetch';

export async function fetchAffiliateProducts() {
  const response = await fetch('https://api.base44.com/products', {
    headers: {
      'Authorization': `Bearer ${process.env.BASE44_API_KEY}`,
      'X-App-ID': process.env.BASE44_APP_ID
    }
  });
  if (!response.ok) throw new Error('Failed to fetch products');
  const data = await response.json();
  return data.products;
}
