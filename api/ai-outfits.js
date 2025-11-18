import OpenAI from "openai";
import { connectToDatabase } from "../api/helpers.js";

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export default async function handler(req, res) {
    if (req.method !== "POST") return res.status(405).end();
    const profile = req.body;

    try {
        const { db } = await connectToDatabase();
        const products = await db.collection("products")
            .find({ gender: profile.gender })
            .limit(200)
            .toArray();

        const ai = await client.chat.completions.create({
            model: "gpt-4.1",
            messages: [
                { role: "system", content: "You are Style Safari's AI stylist. Create 3-5 outfit combinations using provided products, considering style, color, size, fabric, and occasion." },
                { role: "user", content: JSON.stringify({ profile, products }) }
            ]
        });

        res.json(JSON.parse(ai.choices[0].message.content));
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
}
