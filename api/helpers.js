export function normalizeProduct(p) {
    const title = (p.name || "").toLowerCase();
    const desc = (p.description || "").toLowerCase();

    const knownClothing = [
        "shirt","t-shirt","tee","top","blouse","sweater","jumper","hoodie",
        "dress","gown",
        "skirt",
        "coat","jacket","blazer",
        "trousers","pants","jeans","leggings","shorts",
        "shoes","sneakers","boots","heels","sandals",
        "bag","handbag","tote"
    ];

    const excluded = [
        "mug",
        "tumbler",
        "cup",
        "bottle",
        "gift",
        "stainless",
        "insulated",
        "kitchen",
        "grocery"
    ];

    const isExcluded = excluded.some(w => title.includes(w) || desc.includes(w));
    const isFashion = knownClothing.some(w => title.includes(w) || desc.includes(w));

    // Force category
    let category = p.category;
    if (isExcluded) category = "non-fashion";
    else if (!category && isFashion) category = "fashion";

    return {
        product_id: p.product_id,
        name: p.name,
        brand: p.brand,
        price: p.price,
        currency: p.currency,
        image_url: p.image_url,
        description: p.description,
        category,
        color: p.color,
        affiliate_link: p.affiliate_link,
        product_link: p.product_link,
        in_stock: p.in_stock,
        tags: p.tags || [],
        occasion: p.occasion || [],
        season: p.season || [],
        gender: p.gender || "unisex",
        feed_source: p.feed_source || "base44"
    };
}
