import { connectToDatabase } from "./helpers.js";

export default async function handler(req, res) {
    try {
        const { db } = await connectToDatabase();

        const page = parseInt(req.query.page || "1");
        const limit = parseInt(req.query.limit || "20");
        const skip = (page - 1) * limit;

        const productsCollection = db.collection("products");

        const products = await productsCollection
            .find({})
            .skip(skip)
            .limit(limit)
            .toArray();

        const total = await productsCollection.countDocuments();

        res.status(200).json({
            page,
            limit,
            total,
            totalPages: Math.ceil(total / limit),
            products,
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
}
