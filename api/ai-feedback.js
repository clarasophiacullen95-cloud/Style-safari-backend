import { connectToDatabase } from "./helpers.js";

export default async function handler(req, res) {
  try {
    const { userId, productId, action } = req.body;
    const { db } = await connectToDatabase();

    // action: "clicked", "skipped", "purchased"
    await db.collection("user_feedback").insertOne({
      userId, productId, action, timestamp: new Date()
    });

    res.status(200).json({ message: "Feedback recorded" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
}
