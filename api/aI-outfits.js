import { connectToDatabase } from "./helpers.js";

/**
 * Score a single product against a user profile
 */
function scoreProduct(product, userProfile) {
  let score = 0;

  // Style match
  if (product.style && userProfile.styles?.includes(product.style)) score += 3;

  // Color match
  if (userProfile.colors && product.color && userProfile.colors.includes(product.color)) score += 2;

  // Fabric preference
  if (userProfile.fabrics && product.fabric && userProfile.fabrics.some(f => product.fabric.includes(f))) score += 1;

  // Budget
  if (
    product.price >= (userProfile.budget_min || 0) &&
    product.price <= (userProfile.budget_max || Infinity)
  )
    score += 2;

  // Occasion / lifestyle
  if (product.occasion && userProfile.lifestyle_tags?.some(tag => product.occasion.includes(tag)))
    score += 2;

  // Gender match
  if (product.gender === userProfile.gender || product.gender === null) score += 1;

  return score;
}

/**
 * Generate a curated outfit for a main item
 */
async function generateOutfit(mainItemId, userProfile, db) {
  const allProducts = await db.collection("products").find().toArray();

  const mainItem = allProducts.find(p => p.product_id === mainItemId);
  if (!mainItem) throw new Error("Main item not found");

  // Filter compatible items
  const filtered = allProducts.filter(
    p => (p.gender === userProfile.gender || p.gender === null) && p.product_id !== mainItemId
  );

  // Score each product
  const scored = filtered.map(p => ({ ...p, score: scoreProduct(p, userProfile) }));

  // Sort by score descending
  scored.sort((a, b) => b.score - a.score);

  // Pick top items for each category
  const outfit = {
    top: mainItem.category === "top" ? mainItem : scored.find(p => p.category === "top"),
    bottom: mainItem.category === "bottom" ? mainItem : scored.find(p => p.category === "bottom"),
    shoes: scored.find(p => p.category === "shoes"),
    outerwear: scored.find(p => p.category === "outerwear"),
    accessories: scored.find(p => p.category === "accessories"),
  };

  return outfit;
}

export default async function handler(req, res) {
  try {
    const secret = req.query.secret;
    if (secret !== process.env.SYNC_SECRET) return res.status(401).json({ error: "Unauthorized" });

    const { mainItemId, userProfile } = req.body;
    if (!mainItemId || !userProfile) return res.status(400).json({ error: "Missing parameters" });

    const { db } = await connectToDatabase();
    if (!db) return res.status(500).json({ error: "Database not configured" });

    const outfit = await generateOutfit(mainItemId, userProfile, db);

    res.status(200).json({ outfit });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
}
