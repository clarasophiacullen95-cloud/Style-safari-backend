import OpenAI from "openai";
import { connectToDatabase } from "../lib/db.js";

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export default async function handler(req, res) {
    if (req.method !== "POST") return res.status(405).end();

    const profile = req.body;

    try {
        const { db } = await connectToDatabase();

        const products = await db.collection("products")
            .find({
                gender: { $in: [profile.gender, "unisex", null, ""] },
                price: { $gte: profile.budget_min || 0, $lte: profile.budget_max || 10000 }
            })
            .toArray();

        if (!products.length) return res.json({ outfits: [] });

        const aiPrompt = `
You are Style Safari's AI stylist. 
User profile:
${JSON.stringify(profile)}

Products:
${JSON.stringify(products)}

Generate 3-5 complete outfit recommendations.
Each outfit must include product_ids, names, category, style, color, occasion, season, and a short description.
Be concise and structured in JSON format.
`;

        const aiResponse = await client.chat.completions.create({
            model: "gpt-4.1",
            messages: [
                { role: "system", content: "You are a fashion stylist AI." },
                { role: "user", content: aiPrompt }
            ],
            temperature: 0.7
        });

        const text = aiResponse.choices[0].message.content;

        let outfits = [];
        try {
            outfits = JSON.parse(text);
        } catch {
            outfits = [{ error: "AI output could not be parsed. Returning raw text.", text }];
        }

        res.json({ outfits });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
}
