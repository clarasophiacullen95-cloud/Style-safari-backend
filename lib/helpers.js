import { MongoClient } from "mongodb";

// -------------------------
// DATABASE CONNECTION CACHE
// -------------------------
let cachedClient = null;
let cachedDb = null;

export async function connectToDatabase() {
    if (cachedClient && cachedDb) return { client: cachedClient, db: cachedDb };

    const client = new MongoClient(process.env.MONGODB_URI);
    await client.connect();

    const db = client.db(process.env.MONGODB_DB);

    cachedClient = client;
    cachedDb = db;

    return { client, db };
}

// -------------------------
// SAFE FETCH FROM BASE44
// -------------------------
export async function fetchFromBase44(path) {
    const url = `https://app.base44.com/api/apps/${process.env.BASE44_APP_ID}/${path}`;

    const res = await fetch(url, {
        headers: {
            "api_key": process.env.BASE44_API_KEY,
            "Content-Type": "application/json"
        }
    });

    const text = await res.text();

    if (!res.ok) {
        throw new Error(`Base44 API Error ${res.status}: ${text}`);
    }

    try {
        return JSON.parse(text);
    } catch {
        return [];
    }
}

// -------------------------
// PRODUCT NORMALIZER
// -------------------------
export function normalizeProduct(raw) {
    if (!raw) return null;

    const name = raw.name || "";
    const description = raw.description || "";

    return {
        product_id: raw.product_id || null,
        name,
        brand: raw.brand || "",
        price: raw.price || null,
        currency: raw.currency || "USD",
        image_url: raw.image_url || "",
        description,

        // CATEGORY MAPPING
        category: mapCategory(raw.category || name || description),

        // FABRIC
        fabric: extractFabric(description),

        // COLOR
        color: raw.color || extractColor(name),

        // SIZE
        sizes: extractSizes(description),

        // OCCASION
        occasion: extractOccasion(description),

        // SEASON
        season: extractSeason(description),

        // GENDER
        gender: extractGender(name, description),

        // META
        affiliate_link: raw.affiliate_link || "",
        product_link: raw.product_link || "",
        in_stock: raw.in_stock ?? true,

        // STYLE TAGS
        tags: raw.tags || [],
        style: raw.style || "",

        // NEW / SALE
        is_new: detectNew(raw.last_synced),
        on_sale: detectSale(raw.price, raw.compare_at_price),

        // ORIGINAL SOURCE
        feed_source: raw.feed_source || "unknown",

        // TIMESTAMP
        updated_at: new Date()
    };
}

// -------------------------
// CATEGORY MAPPER
// -------------------------
export function mapCategory(text) {
    if (!text) return "other";
    text = text.toLowerCase();

    const mapping = {
        "dress": "dresses",
        "mini": "dresses",
        "gown": "dresses",
        "shirt": "tops",
        "t-shirt": "tops",
        "tee": "tops",
        "tank": "tops",
        "jeans": "denim",
        "denim": "denim",
        "trousers": "pants",
        "pants": "pants",
        "shorts": "shorts",
        "skirt": "skirts",
        "coat": "outerwear",
        "jacket": "outerwear",
        "sweater": "knitwear",
        "jumper": "knitwear",
        "cardigan": "knitwear",
        "bag": "bags",
        "handbag": "bags",
        "shoe": "shoes",
        "sneaker": "shoes",
        "heel": "shoes",
        "boot": "shoes"
    };

    for (const key in mapping) {
        if (text.includes(key)) return mapping[key];
    }

    return "other";
}

// -------------------------
// FABRIC EXTRACTOR
// -------------------------
export function extractFabric(text = "") {
    text = text.toLowerCase();
    const fabrics = ["cotton", "linen", "silk", "wool", "cashmere", "polyester", "leather", "suede"];

    for (const f of fabrics) {
        if (text.includes(f)) return f;
    }
    return "unknown";
}

// -------------------------
// COLOR EXTRACTOR
// -------------------------
export function extractColor(text = "") {
    const colors = ["white", "black", "blue", "red", "pink", "green", "yellow", "beige", "tan", "brown", "navy"];
    for (const c of colors) {
        if (text.toLowerCase().includes(c)) return c;
    }
    return "unknown";
}

// -------------------------
// SIZE EXTRACTOR
// -------------------------
export function extractSizes(desc = "") {
    const matches = desc.match(/\b(XXS|XS|S|M|L|XL|XXL)\b/g);
    return matches || [];
}

// -------------------------
// OCCASION EXTRACTOR
// -------------------------
export function extractOccasion(text = "") {
    const rules = {
        "wedding": "wedding",
        "evening": "evening",
        "party": "party",
        "cocktail": "cocktail",
        "work": "work",
        "office": "work",
        "casual": "casual",
        "vacation": "vacation"
    };

    text = text.toLowerCase();
    for (const k in rules) {
        if (text.includes(k)) return rules[k];
    }
    return "everyday";
}

// -------------------------
// SEASON EXTRACTOR
// -------------------------
export function extractSeason(text = "") {
    text = text.toLowerCase();
    if (text.includes("linen") || text.includes("cotton")) return "summer";
    if (text.includes("wool") || text.includes("cashmere")) return "winter";
    if (text.includes("coat") || text.includes("jacket")) return "winter";
    return "all-season";
}

// -------------------------
// GENDER DETECTOR
// -------------------------
export function extractGender(name, desc) {
    const t = (name + " " + desc).toLowerCase();

    if (t.includes("women") || t.includes("woman") || t.includes("female") || t.includes("womens"))
        return "women";

    if (t.includes("men") || t.includes("man") || t.includes("male") || t.includes("mens"))
        return "men";

    // Default: women
    return "women";
}

// -------------------------
// SALE DETECTOR
// -------------------------
export function detectSale(price, compare) {
    if (!price || !compare) return false;
    return Number(price) < Number(compare);
}

// -------------------------
// NEW PRODUCT DETECTOR (30 days)
// -------------------------
export function detectNew(dateStr) {
    if (!dateStr) return false;
    const days = (Date.now() - new Date(dateStr)) / (1000 * 60 * 60 * 24);
    return days <= 30;
}
