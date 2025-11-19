import OpenAI from "openai";
import { connectToDatabase } from "../lib/db.js";

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();

  const profile = req.body;

  try {
    // Connect to MongoDB
    const { db } = await connectToDatabase();

    // Fetch products filtered by gender (optional)
    const products = await db.collection("products")
      .find({ gender: profile.gender || { $exists: true } })
      .limit(150) // limit to reduce token usage
      .toArray();

    // Prepare AI prompt
    const messages = [
      {
        role: "system",
        content: `You are Style Safari's AI stylist. Create personalized outfits using provided products.`
      },
      {
        role: "user",
        content: JSON.stringify({ profile, products })
      }
    ];

    // Call cheaper GPT model
    const aiResponse = await client.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages,
      temperature: 0.7,
      max_tokens: 600
    });

    const content = aiResponse.choices[0].message?.content;

    if (!content) {
      return res.status(500).json({ error: "No response from OpenAI" });
    }

    // Parse response if JSON
    let outfits;
    try {
      outfits = JSON.parse(content);
    } catch {
      outfits = content; // fallback to raw string if not JSON
    }

    res.json({ outfits });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}
