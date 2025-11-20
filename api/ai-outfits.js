// /api/ai-outfits.js
import OpenAI from "openai";
import { connectToDatabase } from "../lib/db.js";

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();
  const profile = req.body || {};

  try {
    const { db } = await connectToDatabase();

    // Fetch candidate products (limit to control token usage)
    const gender = (profile.gender || "").toLowerCase();
    const q = { in_stock: true };
    if (gender) q.gender = { $in: [gender, "unisex"] };

    const products = await db.collection("products").find(q).limit(150).toArray();

    // Choose model with fallback
    const preferred = process.env.OPENAI_COMPLETION_MODEL || "gpt-5-mini";
    const fallback = "gpt-3.5-turbo";

    let aiResponse;
    try {
      aiResponse = await client.chat.completions.create({
        model: preferred,
        messages: [
          { role: "system", content: "You are Style Safari's AI stylist. Return 3-5 outfit objects JSON." },
          { role: "user", content: JSON.stringify({ profile, products }) }
        ],
        max_tokens: 800,
        temperature: 0.7
      });
    } catch (err) {
      console.warn(`Preferred model ${preferred} failed: ${err.message}. Falling back to ${fallback}`);
      aiResponse = await client.chat.completions.create({
        model: fallback,
        messages: [
          { role: "system", content: "You are Style Safari's AI stylist. Return 3-5 outfit objects JSON." },
          { role: "user", content: JSON.stringify({ profile, products }) }
        ],
        max_tokens: 800,
        temperature: 0.7
      });
    }

    const content = aiResponse.choices?.[0]?.message?.content;
    let parsed;
    try { parsed = JSON.parse(content); } catch { parsed = content; }

    // Optional: save a cache of the AI output in DB for that profile (simple)
    if (profile.user_id) {
      await db.collection("ai_cache").insertOne({
        user_id: profile.user_id,
        profile,
        result: parsed,
        created_at: new Date()
      });
    }

    res.json({ outfits: parsed });
  } catch (err) {
    console.error("ai-outfits error:", err);
    res.status(500).json({ error: err.message });
  }
}
