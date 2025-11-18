import OpenAI from "openai";
import { connectToDatabase } from "../lib/db.js";

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export default async function handler(req, res) {
    if (req.method !== "POST") return res.status(405).end();

    const { user_id, outfit_id, rating, liked_items, disliked_items, comment } = req.body;

    try {
        const { db } = await connectToDatabase();

        // Create embedding for the comment (if provided)
        let embedding = null;
        if (comment && comment.length > 0) {
            const emb = await client.embeddings.create({
                model: "text-embedding-3-small",
                input: comment
            });
            embedding = emb.data[0].embedding;
        }

        // Store feedback
        await db.collection("feedback").insertOne({
            user_id: user_id || null,
            outfit_id: outfit_id || null,
            rating: rating || null,
            liked_items: liked_items || [],
            disliked_items: disliked_items || [],
            comment: comment || "",
            comment_embedding: embedding,
            created_at: new Date()
        });

        return res.json({ success: true });
    } catch (err) {
        console.error("FEEDBACK ERROR:", err);
        return res.status(500).json({ error: err.message });
    }
}
