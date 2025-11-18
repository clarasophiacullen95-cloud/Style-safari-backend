import OpenAI from "openai";
import { connectToDatabase } from "../lib/helpers.js";

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export default async function handler(req, res) {
    if (req.method !== "POST") return res.status(405).end();

    const profile = req.body;

    if (!profile) return res.status(400).json({ error: "User profile is required" });

    try {
        const { db } = await connectToDatabase();

        // --- Step 1: Semantic search for products matching user's style, preferences, and gender
        const embeddingRes = await client.embeddings.create({
            model: "text-embedding-3-small",
            input: `${profile.style || ""} ${profile.lifestyle || ""} ${profile.color_preferences?.join(" ") || ""} ${profile.occasion || ""} ${profile.season || ""}`
        });
        const vector = embeddingRes.data[0].embedding;

        const matchedProducts = await db.collection("products").aggregate([
            {
                $search: {
                    knnBeta: {
                        vector,
                        path: "embedding",
                        k: 50
                    }
                }
            },
            {
                $match: { gender: { $in: [profile.gender, "unisex"] } }
            }
        ]).toArray();

        // --- Step 2: Prepare AI prompt
        const prompt = `
You are Style Safari's AI stylist. Create 3-5 outfit recommendations for the user.
User profile: ${JSON.stringify(profile)}
Available products: ${JSON.stringify(matchedProducts)}
Provide for each outfit:
- Product IDs and names
- Outfit description
- Style, occasion, season
- Optional suggestions to complement existing wardrobe
`;

        // --- Step 3: Generate outfits using OpenAI
        const aiResponse = await client.chat.completions.create({
            model: "gpt-4.1",
            messages: [
                { role: "system", content: "You are a professional fashion AI stylist." },
                { role: "user", content: prompt }
            ],
            temperature: 0.7,
        });

        const outfits = JSON.parse(aiResponse.choices[0].message.content);

        res.json({ outfits });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
}
