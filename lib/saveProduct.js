import { connectDB } from './db';

/**
 * Save or update a product in the database
 * @param {Object} product - Product object from affiliate API
 */
export async function saveProduct(product) {
  const db = await connectDB();
  await db.collection('products').updateOne(
    { id: product.id }, // unique identifier
    { $set: product },
    { upsert: true }    // insert if it doesn't exist
  );
}
