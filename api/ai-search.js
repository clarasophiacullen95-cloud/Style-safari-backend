import { connectToDatabase } from "./helpers.js";

export default async function handler(req, res) {
  try {
    const { q, userProfile } = req.query;
    const { db } = await connectToDatabase();

    const regex = new RegExp(q, "i");
    const products = await db.collection("products").find({
      $or: [
        { name: regex },
        { description: regex },
        { tags: regex },
        { style: regex },
        { brand: regex },
      ],
      $or: [{ gender: userProfile.gender }, { gender: null }],
    }).toArray();

    res.status(200).json({ results: products });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
}
