import { connectToDatabase } from "../lib/db.js";
import { fetchFromBase44, normalizeProduct } from "../lib/helpers.js";

const MAX_RETRIES = 3;      // Max attempts if API fails
const RETRY_DELAY = 5000;   // 5 seconds delay between retries

async function fetchWithRetry(path, attempt = 1) {
    try {
        const data = await fetchFromBase44(path);

        if (!data || !Array.isArray(data.results)) {
            throw new Error(`Base44 data.results is undefined or invalid: ${JSON.stringify(data)}`);
        }

        return data.results;
    } catch (err) {
        if (attempt < MAX_RETRIES) {
            console.warn(`Attempt ${attempt} failed: ${err.message}. Retrying in ${RETRY_DELAY/1000}s...`);
            await new Promise(r => setTimeout(r, RETRY_DELAY));
            return fetchWithRetry(path, attempt + 1);
        } else {
            throw new Error(`Failed after ${MAX_RETRIES} attempts: ${err.message}`);
        }
    }
}

export default async function handler(req, res) {
    if (req.query.secret !== process.env.SYNC_SECRET) {
        return res.status(401).json({ error: "Unauthorized" });
    }

    try {
        const { db } = await connectToDatabase();

        const results = await fetchWithRetry("entities/ProductFeed");

        const cleaned = results.map(normalizeProduct);

        for (const product of cleaned) {
            await db.collection("products").updateOne(
                { product_id: product.product_id },
                { $set: product },
                { upsert: true }
            );
        }

        res.json({ message: "Products synced in batches", count: cleaned.length });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
}
