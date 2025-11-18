import { connectToDatabase } from "../lib/db.js";

export default async function handler(req, res) {
    if (req.method !== "POST") return res.status(405).end();

    try {
        const feedback = req.body;

        const { db } = await connectToDatabase();

        await db.collection("feedback").insertOne({
            ...feedback,
            created_at: new Date()
        });

        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
}
