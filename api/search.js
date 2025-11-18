import { connectToDatabase } from "../lib/helpers.js";

export default async function handler(req, res) {
    const q = req.query.q?.trim();
    const gender = req.query.gender || "unisex";

    if (!q) return res.json([]);

    const { db } = await connectToDatabase();

    const keywords = q.toLowerCase().split(" ");

    // 1️⃣ Phrase-aware: exact match in name or category
    const phraseQuery = {
        gender: { $in: [gender, "unisex"] },
        $or: [
            { name: { $regex: q, $options: "i" } },
            { category: { $regex: q, $options: "i" } },
            { store_brand_mapping: { $regex: q, $options: "i" } } // store brand mapping
        ]
    };

    // 2️⃣ Fallback: keyword match in all relevant fields
    const keywordQuery = {
        gender: { $in: [gender, "unisex"] },
        $and: keywords.map(kw => ({
            $or: [
                { name: { $regex: kw, $options: "i" } },
                { category: { $regex: kw, $options: "i" } },
                { brand: { $regex: kw, $options: "i" } },
                { store_brand_mapping: { $regex: kw, $options: "i" } }, // store brand mapping
                { fabric: { $regex: kw, $options: "i" } },
                { size: { $regex: kw, $options: "i" } },
                { occasion: { $regex: kw, $options: "i" } },
                { season: { $regex: kw, $options: "i" } },
            ]
        }))
    };

    // 3️⃣ Try phrase match first
    let results = await db.collection("products")
        .find(phraseQuery)
        .limit(50)
        .toArray();

    // 4️⃣ If no results, use keyword match
    if (!results.length) {
        results = await db.collection("products")
            .find(keywordQuery)
            .limit(100)
            .toArray();
    }

    // 5️⃣ Sort by is_new and price ascending
    results.sort((a, b) => {
        if (a.is_new && !b.is_new) return -1;
        if (!a.is_new && b.is_new) return 1;
        return (a.price || 0) - (b.price || 0);
    });

    res.json(results);
}
