import { connectDB } from "./db.js";

export async function saveProduct(product) {
  const db = await connectDB();
  await db.collection("products").updateOne(
    { id: product.id },
    { $set: product },
    { upsert: true }
  );
}
