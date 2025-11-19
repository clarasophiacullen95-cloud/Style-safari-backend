import { connectToDatabase } from "../lib/db.js";
import { fetchFromBase44, normalizeProduct, generateEmbedding } from "../lib/helpers.js";

export default async function handler(req, res) {
    if (req.query.secret !== process.env.SYNC_SECRET) {
        return res.status(401).json({ error: "Unauthorized" });
    }

    try {
        const { db } = await connectToDatabase();

        // Fetch products from Base44
        const rawProducts = await fetchFromBase44("entities/ProductFeed");

        const cleanedProducts = [];
        for (const p of rawProducts) {
            const product = normalizeProduct(p);

            // Generate AI embedding for search
            const textForEmbedding = [product.name, product.description, product.brand, product.tags.join(" ")].join(" ");
            product.embedding = await generateEmbedding(textForEmbedding);

            cleanedProducts.push(product);

            // Upsert in MongoDB
            await db.collection("products").updateOne(
                { product_id: product.product_id },
                { $set: product },
                { upsert: true }
            );
        }

        res.json({ message: "Products synced in batches", count: cleanedProducts.length });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
}
