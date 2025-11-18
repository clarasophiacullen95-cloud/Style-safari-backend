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

export function normalizeProduct(p) {
    return {
        product_id: p.product_id,
        name: p.name,
        brand: p.brand,
        price: p.price,
        currency: p.currency,
        image_url: p.image_url,
        description: p.description,
        category: p.category,
        color: p.color,
        fabric: p.fabric || null,
        size: p.size || null,
        product_link: p.product_link,
        in_stock: p.in_stock,
        is_new: isNew(p.last_synced),
        on_sale: p.price < (p.original_price || p.price),
        occasion: p.occasion || null,
        season: p.season || null,
        gender: detectGender(p),
        store_brand_map: p.store_brand_map || p.brand?.toLowerCase() || "",
        last_synced: new Date()
    };
}

function isNew(last) {
    if (!last) return false;
    const d = new Date(last);
    const now = new Date();
    const monthAgo = new Date(now.setMonth(now.getMonth() - 1));
    return d > monthAgo;
}

function detectGender(p) {
    const name = (p.name + " " + p.description).toLowerCase();
    if (name.includes("women") || name.includes("female") || name.includes("she")) return "female";
    if (name.includes("men") || name.includes("male") || name.includes("he")) return "male";
    return "unisex";
}
