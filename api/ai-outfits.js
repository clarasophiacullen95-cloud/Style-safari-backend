import OpenAI from "openai";
import { connectToDatabase } from "../lib/db.js";

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export default async function handler(req, res) {
    if (req.method !== "POST") return res.status(405).end();

    const profile = req.body;

    try {
        const { db } = await connectToDatabase();

        const products = await db.collection("products")
            .find({ gender: { $in: [profile.gender, "unisex"] } })
            .limit(150)
            .toArray();

        const ai = await client.chat.completions.create({
            model: "gpt-5-mini",
            messages: [
                {
                    role: "system",
                    content: "You are Style Safari's AI stylist. Create 3-5 outfit suggestions using the provided products."
                },
                {
                    role: "user",
                    content: JSON.stringify({ profile, products })
                }
            ]
        });

        res.json(JSON.parse(ai.choices[0].message.content));
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
}
