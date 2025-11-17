import { connectToDatabase, fetchFromBase44 } from "./helpers.js";

export default async function handler(req, res) {
    const secret = req.query.secret;
    if (secret !== process.env.SYNC_SECRET) return res.status(401).json({ error: "Unauthorized" });

    try {
        const { db } = await connectToDatabase();
        const products = await fetchFromBase44("entities/ProductFeed");
        let syncedCount = 0;

        // First, fetch existing products per store to generate brand mapping
        const stores = [...new Set(products.map(p => p.store).filter(Boolean))];
        const storeBrandGender = {};

        for (const store of stores) {
            storeBrandGender[store] = await generateStoreBrandGender(db, store);
        }

        for (const product of products) {
            let gender = null;

            // 1️⃣ Category-based mapping
            if (product.category) {
                const cat = product.category.toLowerCase();
                if (cat.includes("women") || cat.includes("female") || cat.includes("girls")) gender = "female";
                if (cat.includes("men") || cat.includes("male") || cat.includes("boys")) gender = "male";
            }

            // 2️⃣ Tag-based fallback
            if (!gender && product.tags && product.tags.length) {
                const tags = product.tags.map(t => t.toLowerCase());
                if (tags.includes("women") || tags.includes("female")) gender = "female";
                if (tags.includes("men") || tags.includes("male")) gender = "male";
            }

            // 3️⃣ Store-brand mapping
            if (!gender && product.store && product.brand) {
                const storeMap = storeBrandGender[product.store];
                if (storeMap && storeMap[product.brand] !== undefined) {
                    gender = storeMap[product.brand];
                }
            }

            // Save / update in MongoDB
            await db.collection("products").updateOne(
                { product_id: product.product_id },
                { $set: { ...product, gender, last_synced: new Date() } },
                { upsert: true }
            );

            syncedCount++;
        }

        res.status(200).json({ message: "Products synced", count: syncedCount });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
}

// Helper function
async function generateStoreBrandGender(db, storeName) {
    const products = await db.collection("products").find({ store: storeName }).toArray();
    const mapping = {};
    for (const p of products) {
        if (!mapping[p.brand]) mapping[p.brand] = p.gender || null;
    }
    return mapping;
}
