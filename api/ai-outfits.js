import { connectToDatabase } from "./helpers.js";

function scoreProduct(product, userProfile) {
  let score = 0;
  if (product.style && userProfile.styles?.includes(product.style)) score += 3;
  if (userProfile.colors && product.color && userProfile.colors.includes(product.color)) score += 2;
  if (userProfile.fabrics && product.fabric?.some(f => userProfile.fabrics.includes(f))) score += 1;
  if (product.price >= (userProfile.budget_min||0) && product.price <= (userProfile.budget_max||Infinity)) score += 2;
  if (product.occasion?.some(o => userProfile.lifestyle_tags?.includes(o))) score += 2;
  if (product.gender === userProfile.gender || product.gender === null) score += 1;
  return score;
}

async function generateOutfits(userProfile, db, mainItemId = null, maxOutfits = 3) {
  const products = await db.collection("products").find().toArray();
  const filtered = products.filter(p => p.gender === userProfile.gender || p.gender === null);

  const scored = filtered.map(p => ({ ...p, score: scoreProduct(p, userProfile) }));
  scored.sort((a, b) => b.score - a.score);

  const outfits = [];
  for (let i = 0; i < Math.min(maxOutfits, scored.length); i++) {
    const top = mainItemId ? scored.find(p => p.product_id === mainItemId) || scored[i] : scored[i];
    const bottom = scored.find(p => p.category === "bottom" && p.product_id !== top.product_id);
    const shoes = scored.find(p => p.category === "shoes" && p.product_id !== top.product_id);
    outfits.push({ top, bottom, shoes });
  }
  return outfits;
}

export default async function handler(req, res) {
  try {
    const secret = req.query.secret;
    if (secret !== process.env.SYNC_SECRET) return res.status(401).json({ error: "Unauthorized" });

    const { userProfile, mainItemId } = req.body;
    if (!userProfile) return res.status(400).json({ error: "Missing userProfile" });

    const { db } = await connectToDatabase();
    const outfits = await generateOutfits(userProfile, db, mainItemId);

    res.status(200).json({ outfits });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
}
