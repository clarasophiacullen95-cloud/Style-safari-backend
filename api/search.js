import { connectToDatabase } from "./helpers.js";

export default async function handler(req, res) {
    try {
        const { db } = await connectToDatabase();
        const productsCollection = db.collection("products");

        const {
            q,
            brand,
            category,
            color,
            fabric,
            style,
            tags,
            price_min,
            price_max,
        } = req.query;

        const filter = {};

        if (q) {
            filter.$text = { $search: q };
        }

        if (brand) filter.brand = brand;
        if (category) filter.category = category;
        if (color) filter.color = color;
        if (fabric) filter.fabric = fabric;
        if (style) filter.style = style;
        if (tags) filter.tags = { $in: tags.split(",") };

        if (price_min || price_max) {
            filter.price = {};
            if (price_min) filter.price.$gte = Number(price_min);
            if (price_max) filter.price.$lte = Number(price_max);
        }

        const results = await productsCollection.find(filter).limit(200).toArray();

        res.json({ count: results.length, results });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
}
