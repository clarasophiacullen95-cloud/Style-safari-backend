import { connectToDatabase } from "../lib/db.js";
import { normalizeProduct } from "../lib/helpers.js";

// Try fetching live products, fallback to cached
async function fetchBase44Products() {
    const url = `https://app.base44.com/api/apps/${process.env.BASE44_APP_ID}/entities/ProductFeed`;
    
    for (let attempt = 0; attempt < 3; attempt++) {
        try {
            const res = await fetch(url, {
                headers: {
                    "api_key": process.env.BASE44_API_KEY,
                    "Content-Type": "application/json"
                }
            });

            if (!res.ok) throw new Error(`Base44 API Error ${res.status}`);

            const data = await res.json();
            if (Array.isArray(data)) return data;
            if (Array.isArray(data.results)) return data.results;
            return [];
        } catch (err) {
            console.warn(`Attempt ${attempt + 1} failed: ${err.message}`);
            await new Promise(r => setTimeout(r, 5000)); // wait 5s
        }
    }

    // Fallback: use cached products from Base44 app (if accessible)
    console.warn("Using cached products due to API limit");
    const cached = await fetch(`${url}?cached=true`, { // adjust to Base44 cached endpoint
        headers: { "api_key": process.env.BASE44_API_KEY }
    });
    const cachedData = await cached.json();
    if (Array.isArray(cachedData)) return cachedData;
    if (Array.isArray(cachedData.results)) return cachedData.results;
    return [];
}

export default async function handler(req, res) {
    if (req.query.secret !== process.env.SYNC_SECRET) {
        return res.status(401).json({ error: "Unauthorized" });
    }

    try {
        const { db } = await connectToDatabase();

        const rawProducts = await fetchBase44Products();
        if (!rawProducts.length) return res.json({ message: "No products available", count: 0 });

        const cleaned = rawProducts.map(normalizeProduct);

        const ops = cleaned.map(p => ({
            updateOne: {
                filter: { product_id: p.product_id },
                update: { $set: p },
                upsert: true
            }
        }));

        await db.collection("products").bulkWrite(ops);

        res.json({ message: "Products synced", count: cleaned.length });
    } catch (err) {
        console.error("Sync error:", err);
        res.status(500).json({ error: err.message });
    }
}
