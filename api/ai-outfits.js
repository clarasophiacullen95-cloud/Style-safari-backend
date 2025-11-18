import OpenAI from "openai";
import { connectToDatabase } from "../lib/db.js";

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export default async function handler(req, res) {
    if (req.method !== "POST") return res.status(405).end();

    const profile = req.body;
    const gender = profile.gender || "female";

    try {
        const { db } = await connectToDatabase();

        // Pull a variety of products for AI to choose from
        const products = await db.collection("products")
            .find({
                gender: { $in: [gender, gender === "female" ? "women" : "men", "unisex", null, ""] }
            })
            .limit(250)
            .toArray();

        const ai = await client.chat.completions.create({
            model: "gpt-4.1",
            temperature: 0.7,
            messages: [
                {
                    role: "system",
                    content: `
You are Style Safari’s AI stylist.
Generate 3–5 complete outfits using ONLY the product list provided.

Return **pure JSON**:
{
  "outfits": [
    {
      "title": "string",
      "description": "string",
      "items": [
        { "id": "...", "name": "...", "price": ..., "image": "..." }
      ]
    }
  ]
}

Rules:
- Outfits must match user's gender, style, and budget.
- Choose items that genuinely pair well.
- Avoid duplicate products across outfits.
- Use seasonal and occasion awareness if available.
- Pick items that fit user's style aesthetic.
- Keep JSON safe and valid.
                    `
                },
                {
                    role: "user",
                    content: JSON.stringify({ profile, products })
                }
            ]
        });

        const result = JSON.parse(ai.choices[0].message.content);

        return res.json(result);
    } catch (err) {
        console.error("AI OUTFIT ERROR:", err);
        return res.status(500).json({ error: err.message });
    }
}
