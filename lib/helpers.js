export function normalizeProduct(product) {
    return {
        product_id: product.product_id,
        name: product.name,
        brand: product.brand,
        price: product.price,
        currency: product.currency || "USD",
        image_url: product.image_url,
        description: product.description,
        category: product.category,
        color: product.color,
        fabric: product.fabric || null,
        affiliate_link: product.affiliate_link,
        product_link: product.product_link,
        in_stock: product.in_stock ?? true,
        tags: product.tags || [],
        style: product.style || null,
        occasion: product.occasion || [],
        season: product.season || [],
        is_new: product.is_new || false,
        is_bestseller: product.is_bestseller || false,
        last_synced: product.last_synced ? new Date(product.last_synced) : new Date(),
        feed_source: product.feed_source || "product_feed"
    };
}
