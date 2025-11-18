import { connectToDatabase } from "../lib/db.js";
import { normalizeProduct } from "../lib/helpers.js";

// Safe fetch from Base44
async function fetchBase44Products() {
    const url = `https://app.base44.com/api/apps/${process.env.BASE44_APP_ID}/entities/ProductFeed`;
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

    // Base44 might return an array directly or an object with `results`
    if (Array.isArray(data)) return data;
    if (Array.isArray(data.results)) return data.results;

    return []; // fallback
}

export default async function handler(req, res) {
    if (req.query.secret !== process.env.SYNC_SECRET) {
        return res.status(401).json({ error: "Unauthorized" });
    }

    try {
        const { db } = await connectToDatabase();

        // Fetch products safely
        const rawProducts = await fetchBase44Products();

        if (rawProducts.length === 0) {
            return res.json({ message: "Products synced", count: 0 });
        }

        // Normalize each product
        const cleaned = rawProducts.map(normalizeProduct);

        // Bulk upsert into MongoDB
        const bulkOps = cleaned.map(p => ({
            updateOne: {
                filter: { product_id: p.product_id },
                update: { $set: p },
                upsert: true
            }
        }));

        if (bulkOps.length > 0) {
            await db.collection("products").bulkWrite(bulkOps);
        }

        res.json({ message: "Products synced", count: cleaned.length });
    } catch (err) {
        console.error("Sync error:", err);
        res.status(500).json({ error: err.message });
    }
}
