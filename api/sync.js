import { connectToDatabase } from "../lib/db.js";
import { normalizeProduct } from "../lib/helpers.js";

// Helper: fetch one page of Base44 products
async function fetchBase44Page(offset = 0, limit = 100) {
    const url = `https://app.base44.com/api/apps/${process.env.BASE44_APP_ID}/entities/ProductFeed?offset=${offset}&limit=${limit}`;
    const res = await fetch(url, {
        headers: {
            "api_key": process.env.BASE44_API_KEY,
            "Content-Type": "application/json"
        }
    });

    if (!res.ok) {
        const text = await res.text();
        throw new Error(`Base44 API Error ${res.status}: ${text}`);
    }

    const data = await res.json();
    if (Array.isArray(data)) return data;
    if (Array.isArray(data.results)) return data.results;
    return [];
}

export default async function handler(req, res) {
    if (req.query.secret !== process.env.SYNC_SECRET) {
        return res.status(401).json({ error: "Unauthorized" });
    }

    try {
        const { db } = await connectToDatabase();
        let totalProducts = 0;
        const batchSize = 100; // fetch 100 at a time
        let offset = 0;
        let batch;

        do {
            batch = await fetchBase44Page(offset, batchSize);
            const cleaned = batch.map(normalizeProduct);

            if (cleaned.length > 0) {
                const ops = cleaned.map(p => ({
                    updateOne: {
                        filter: { product_id: p.product_id },
                        update: { $set: p },
                        upsert: true
                    }
                }));

                await db.collection("products").bulkWrite(ops);
                totalProducts += cleaned.length;
            }

            offset += batchSize;
        } while (batch.length === batchSize); // continue if full batch fetched

        res.json({ message: "Products synced in batches", count: totalProducts });
    } catch (err) {
        console.error("Sync error:", err);
        res.status(500).json({ error: err.message });
    }
}
