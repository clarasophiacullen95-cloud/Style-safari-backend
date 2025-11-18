import { connectToDatabase } from "../lib/db.js";

/**
 * Advanced Search:
 * - Keyword matching across ALL product fields
 * - Brand mapping (department stores → brands)
 * - Gender filtering
 * - Fabric + material + color search
 * - Multi-keyword AND logic (must match all words)
 */

export default async function handler(req, res) {
    const q = req.query.q;
    const gender = req.query.gender || null;

    if (!q) {
        return res.json([]);
    }

    const keywords = q.toLowerCase().split(" ").filter(Boolean);

    const { db } = await connectToDatabase();

    // Department store brand mapping (expandable)
    const brandMap = {
        "fwrd": ["Ralph Lauren", "Isabel Marant", "Loewe", "Toteme", "AGOLDE"],
        "net-a-porter": ["Zimmermann", "Gucci", "Prada", "Saint Laurent"],
        "shopbop": ["Rag & Bone", "Reformation", "Alo Yoga"],
        // ADD MORE BRANDS HERE ANY TIME
    };

    // Combine keywords with mapped brands
    const expandedKeywords = [...keywords];

    keywords.forEach(k => {
        Object.values(brandMap).forEach(list => {
            list.forEach(brand => {
                if (brand.toLowerCase().includes(k)) {
                    expandedKeywords.push(brand.toLowerCase());
                }
            });
        });
    });

    // Build MongoDB search conditions
    const searchConditions = expandedKeywords.map(k => ({
        $or: [
            { name:        { $regex: k, $options: "i" } },
            { brand:       { $regex: k, $options: "i" } },
            { category:    { $regex: k, $options: "i" } },
            { color:       { $regex: k, $options: "i" } },
            { fabric:      { $regex: k, $options: "i" } },     // ← FABRIC SEARCH
            { size:        { $regex: k, $options: "i" } },     // ← SIZE SEARCH
            { description: { $regex: k, $options: "i" } },
            { tags:        { $regex: k, $options: "i" } },
            { style:       { $regex: k, $options: "i" } },
            { occasion:    { $regex: k, $options: "i" } },
            { season:      { $regex: k, $options: "i" } }
        ]
    }));

    const query = {
        $and: searchConditions,
    };

    if (gender) {
        query.gender = { $in: [gender, "unisex", null] };
    }

    try {
        const results = await db
            .collection("products")
            .find(query)
            .limit(150)
            .toArray();

        return res.json(results);

    } catch (e) {
        console.error("Search error:", e);
        return res.status(500).json({ error: e.message });
    }
}
