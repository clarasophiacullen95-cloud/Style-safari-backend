import { connectToDatabase } from "../lib/db.js";

export default async function handler(req, res) {
    const q = req.query.q;
    const gender = req.query.gender;

    if (!q) return res.json([]);

    const { db } = await connectToDatabase();

    const keywords = q.toLowerCase().split(" ");   // ["linen", "shirt"]

    // Common fabrics your system will recognise
    const fabrics = [
        "cotton", "linen", "silk", "denim", "wool", "cashmere",
        "leather", "polyester", "nylon", "satin", "mesh", "jersey"
    ];

    // Size patterns (XS, S, M, L, XL, XXL, 6, 8, 10 etc.)
    const sizeRegex = /^(xxs|xs|s|m|l|xl|xxl|\d{1,2})$/;

    const fabricKeywords = keywords.filter(k => fabrics.includes(k));
    const sizeKeywords = keywords.filter(k => sizeRegex.test(k));
    const normalKeywords = keywords.filter(k => !fabricKeywords.includes(k) && !sizeKeywords.includes(k));

    const filters = [];

    // Keyword matching for name + category
    if (normalKeywords.length > 0) {
        filters.push(
            ...normalKeywords.map(k => ({
                $or: [
                    { name: { $regex: k, $options: "i" } },
                    { category: { $regex: k, $options: "i" } },
                    { tags: { $regex: k, $options: "i" } }
                ]
            }))
        );
    }

    // Fabric matching
    if (fabricKeywords.length > 0) {
        filters.push(
            ...fabricKeywords.map(f => ({
                $or: [
                    { fabric: { $regex: f, $options: "i" } },
                    { description: { $regex: f, $options: "i" } }
                ]
            }))
        );
    }

    // Size matching
    if (sizeKeywords.length > 0) {
        filters.push(
            ...sizeKeywords.map(s => ({
                $or: [
                    { size: { $regex: s, $options: "i" } },
                    { description: { $regex: s, $options: "i" } }
                ]
            }))
        );
    }

    // FINAL QUERY
    const query = {
        $and: [
            { gender: { $in: [gender, "unisex"] } },
            ...filters
        ]
    };

    const results = await db.collection("products")
        .find(query)
        .limit(150)
        .toArray();

    res.json(results);
}
