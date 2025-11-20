import { connectToDatabase } from "../lib/db.js";
import { fetchFromBase44, normalizeProduct } from "../lib/helpers.js";

const MAX_RETRIES = 3;
const BATCH_SIZE = 500;

async function fetchWithRetry(endpoint, retries = MAX_RETRIES) {
    let attempt = 0;
    while (attempt < retries) {
        try {
            const data = await fetchFromBase44(endpoint);
            if (data && Array.isArray(data.results)) return data.results;
            throw new Error("data.results is undefined or invalid");
        } catch (err) {
            attempt++;
            if (attempt >= retries) throw err;
        }
    }
}

export default async function handler(req, res) {
    if (req.query.secret !== process.env.SYNC_SECRET) {
        return res.status(401).json({ error: "Unauthorized" });
    }

    try {
        const { db } = await connectToDatabase();

        // Fetch ProductFeed safely
        let results;
        try {
            results = await fetchWithRetry("entities/ProductFeed");
        } catch (err) {
            // fallback to cached products in DB if Base44 fails
            const cached = await db.collection("products").find().toArray();
            return res.json({
                message: "Base44 fetch failed, using cached products",
                count: cached.length,
                error: err.message,
            });
        }

        // Normalize products
        const cleaned = results.map(normalizeProduct);

        // Batch upserts
        for (let i = 0; i < cleaned.length; i += BATCH_SIZE) {
            const batch = cleaned.slice(i, i + BATCH_SIZE);
            const bulkOps = batch.map(product => ({
                updateOne: {
                    filter: { product_id: product.product_id },
                    update: { $set: product },
                    upsert: true,
                },
            }));
            if (bulkOps.length) {
                await db.collection("products").bulkWrite(bulkOps);
            }
        }

        res.json({
            message: "Products synced (with cache fallback and batching)",
            count: cleaned.length,
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
}
