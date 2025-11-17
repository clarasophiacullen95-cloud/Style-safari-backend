import { connectToDatabase, fetchFromBase44 } from "./helpers.js";

function parseFabric(description) {
  const match = description.match(/Material: (.*?)(?:\.|$)/i);
  if (!match) return [];
  return match[1].split(/[,;&]/).map(f => f.trim().toLowerCase());
}

function parseSize(description) {
  const match = description.match(/Size: ([A-Z0-9]+)/i);
  return match ? match[1] : null;
}

function assignGender(category) {
  const female = ["dresses", "skirts", "heels"];
  const male = ["suits", "shirts", "sneakers"];
  if (female.includes(category.toLowerCase())) return "female";
  if (male.includes(category.toLowerCase())) return "male";
  return null;
}

function assignOccasion(category, tags) {
  const mapping = {
    dresses: ["party", "casual"],
    tops: ["office", "casual"],
    shoes: ["casual", "formal"],
    jackets: ["casual", "formal"],
    bags: ["casual", "formal", "travel"],
  };
  return mapping[category.toLowerCase()] || tags || [];
}

function assignSeason(category, description) {
  const desc = description.toLowerCase();
  if (desc.includes("coat") || desc.includes("sweater") || desc.includes("jacket")) return "winter";
  if (desc.includes("linen") || desc.includes("cotton") || category.toLowerCase() === "dresses") return "summer";
  return "all-season";
}

function isNewProduct(lastSynced) {
  const now = new Date();
  const syncedDate = new Date(lastSynced);
  return (now - syncedDate) / (1000 * 60 * 60 * 24) <= 30;
}

export default async function handler(req, res) {
  try {
    const secret = req.query.secret;
    if (secret !== process.env.SYNC_SECRET) return res.status(401).json({ error: "Unauthorized" });

    const { db } = await connectToDatabase();

    const products = await fetchFromBase44("entities/ProductFeed");

    const ops = products.map(p => ({
      updateOne: {
        filter: { product_id: p.product_id },
        update: {
          $set: {
            ...p,
            gender: assignGender(p.category),
            occasion: assignOccasion(p.category, p.tags),
            season: assignSeason(p.category, p.description),
            fabric: parseFabric(p.description),
            size: parseSize(p.description),
            is_new: isNewProduct(p.last_synced),
            on_sale: p.price < p.original_price,
          },
        },
        upsert: true,
      },
    }));

    if (ops.length > 0) await db.collection("products").bulkWrite(ops);

    res.status(200).json({ message: "Products synced", count: ops.length });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
}
