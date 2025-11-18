// ============================================
//  HELPERS.JS — FULL INTELLIGENT PRODUCT NORMALIZER
// ============================================

import { MongoClient } from "mongodb";

// ---------------------------------------------------
// DATABASE CONNECTION
// ---------------------------------------------------
let cachedClient = null;
let cachedDb = null;

export async function connectToDatabase() {
    if (cachedClient && cachedDb) {
        return { client: cachedClient, db: cachedDb };
    }

    const client = new MongoClient(process.env.MONGODB_URI);
    await client.connect();

    const db = client.db(process.env.MONGODB_DB);
    cachedClient = client;
    cachedDb = db;

    return { client, db };
}

// ---------------------------------------------------
// BASE44 FETCH WRAPPER
// ---------------------------------------------------
export async function fetchFromBase44(path) {
    const url = `https://app.base44.com/api/apps/${process.env.BASE44_APP_ID}/${path}`;

    const response = await fetch(url, {
        headers: {
            "api_key": process.env.BASE44_API_KEY,
            "Content-Type": "application/json"
        }
    });

    if (!response.ok) {
        const text = await response.text();
        throw new Error(`Base44 API Error ${response.status}: ${text}`);
    }

    return response.json();
}

// ---------------------------------------------------
// STORES → BRANDS MAPPING
// Ensures searching "Ralph Lauren" brings up items from FWRD, Saks, Harrods, etc.
// ---------------------------------------------------
export const STORE_BRAND_MAP = {
    fwrd: [
        "Ralph Lauren", "Zimmermann", "Aje", "AGOLDE", "Reformation",
        "Anine Bing", "Toteme", "The Row", "Alaïa", "Loewe", "Isabel Marant"
    ],
    saks: [
        "Ralph Lauren", "Theory", "Max Mara", "Canada Goose", "Burberry"
    ],
    harrods: [
        "Ralph Lauren", "Gucci", "Prada", "Chloé"
    ],
    netaporter: [
        "Ralph Lauren", "Tove", "Loulou Studio", "Toteme", "Nili Lotan"
    ]
};

// ---------------------------------------------------
// GENDER DETECTION
// ---------------------------------------------------
function inferGender(name, category) {
    const low = `${name} ${category}`.toLowerCase();

    if (low.includes("women") || low.includes("woman") || low.includes("female") || low.includes("womens"))
        return "female";
    if (low.includes("men") || low.includes("man") || low.includes("male") || low.includes("mens"))
        return "male";

    // fallback
    return "unisex";
}

// ---------------------------------------------------
// FABRIC EXTRACTION
// ---------------------------------------------------
function extractFabric(description = "") {
    const fabrics = [
        "cotton", "linen", "silk", "wool", "cashmere", "leather",
        "denim", "polyester", "viscose", "rayon", "nylon", "modal"
    ];

    const desc = description.toLowerCase();
    return fabrics.find(f => desc.includes(f)) || null;
}

// ---------------------------------------------------
// SIZE EXTRACTION
// ---------------------------------------------------
function extractSizes(description = "") {
    const sizeRegex = /\b(XXS|XS|S|M|L|XL|XXL|0|2|4|6|8|10|12|14|16)\b/g;
    const found = description.match(sizeRegex);
    return found ? [...new Set(found)] : [];
}

// ---------------------------------------------------
// OCCASION DETECTION
// ---------------------------------------------------
function detectOccasion(name, description) {
    const text = `${name} ${description}`.toLowerCase();

    if (text.includes("wedding") || text.includes("gala") || text.includes("evening"))
        return "occasion/formal";
    if (text.includes("office") || text.includes("work"))
        return "work";
    if (text.includes("beach") || text.includes("vacation") || text.includes("holiday"))
        return "resort";
    if (text.includes("party") || text.includes("cocktail"))
        return "party";

    return "everyday";
}

// ---------------------------------------------------
// SEASON DETECTION
// ---------------------------------------------------
function detectSeason(name, description) {
    const txt = `${name} ${description}`.toLowerCase();

    if (txt.includes("linen") || txt.includes("shorts") || txt.includes("swim") || txt.includes("cotton poplin"))
        return "summer";

    if (txt.includes("wool") || txt.includes("cashmere") || txt.includes("coat") || txt.includes("sweater"))
        return "winter";

    return "all-season";
}

// ---------------------------------------------------
// SALE DETECTION
// ---------------------------------------------------
function detectSale(price, originalPrice) {
    if (!originalPrice || !price) return false;
    return Number(price) < Number(originalPrice);
}

// ---------------------------------------------------
// NEW ARRIVAL (added within 30 days)
// ---------------------------------------------------
function detectNewArrival(lastSynced) {
    if (!lastSynced) return false;
    const days = (Date.now() - new Date(lastSynced).getTime()) / (1000 * 60 * 60 * 24);
    return days <= 30;
}

// ---------------------------------------------------
// MAIN NORMALIZER — ALL CLEANING HAPPENS HERE
// ---------------------------------------------------
export function normalizeProduct(p) {
    if (!p) return null;

    const name = p.name || "";
    const description = p.description || "";
    const category = p.category || "";

    return {
        product_id: p.product_id,
        name,
        brand: p.brand || null,
        price: p.price || null,
        currency: p.currency || "USD",
        image_url: p.image_url || null,
        description,
        category,

        // NEW FIELDS
        fabric: extractFabric(description),
        sizes: extractSizes(description),
        gender: inferGender(name, category),
        occasion: detectOccasion(name, description),
        season: detectSeason(name, description),
        on_sale: detectSale(p.price, p.original_price),
        is_new: detectNewArrival(p.last_synced),

        color: p.color || null,
        tags: p.tags || [],
        style: p.style || [],
        affiliate_link: p.affiliate_link || null,
        product_link: p.product_link || null,
        in_stock: p.in_stock ?? true,

        last_synced: p.last_synced || new Date().toISOString(),
        feed_source: p.feed_source || "base44"
    };
}
