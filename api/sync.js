// api/sync.js
import { connectToDatabase } from "../lib/db.js";
import { fetchFromBase44, normalizeProduct } from "../lib/helpers.js";
import OpenAI from "openai";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

/**
 * Settings
 */
const BATCH_SIZE = Number(process.env.SYNC_EMBED_BATCH_SIZE || 20); // generate embeddings in small batches
const EMBEDDING_MODEL_PRIMARY = process.env.OPENAI_EMBEDDING_MODEL || "text-embedding-3-large";
const EMBEDDING_MODEL_FALLBACK = process.env.OPENAI_EMBEDDING_FALLBACK || "text-embedding-ada-002";

async function tryCreateEmbeddings(model, inputs) {
  // returns { success: true, data: [...] } or { success: false, error }
  try {
    const resp = await openai.embeddings.create({ model, input: inputs });
    return { success: true, data: resp.data.map(d => d.embedding) };
  } catch (err) {
    return { success: false, error: err };
  }
}

export default async function handler(req, res) {
  // quick security check
  if (req.query.secret !== process.env.SYNC_SECRET) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  try {
    const { db } = await connectToDatabase();

    // fetch raw response from Base44 (handles both array and object)
    const data = await fetchFromBase44("entities/ProductFeed");

    // The fetchFromBase44 helper returns either { results: [...] } or some other object;
    // normalize to array of raw items
    const rawItems = Array.isArray(data) ? data : Array.isArray(data.results) ? data.results : null;
    if (!rawItems) {
      // helpful debug info
      return res.status(500).json({ error: "Base44 returned unexpected shape", raw: data });
    }

    // Normalize items (no embeddings yet)
    const normalizedItems = rawItems.map(normalizeProduct);

    // Upsert products first WITHOUT embeddings to ensure DB has records quickly
    const bulkOps = normalizedItems.map(p => ({
      updateOne: {
        filter: { product_id: p.product_id },
        update: { $set: { ...p } },
        upsert: true
      }
    }));

    if (bulkOps.length > 0) {
      await db.collection("products").bulkWrite(bulkOps, { ordered: false });
    }

    // Now generate embeddings in batches, with fallback model handling
    for (let i = 0; i < normalizedItems.length; i += BATCH_SIZE) {
      const batch = normalizedItems.slice(i, i + BATCH_SIZE);
      // prepare input texts for embeddings: include name, category, tags, brand, color, fabric
      const inputs = batch.map(p =>
        [
          p.name || "",
          p.category || "",
          p.tags?.join(" ") || "",
          p.brand || "",
          p.color || "",
          p.fabric || ""
        ].filter(Boolean).join(" ")
      );

      // Try primary model first
      let embResult = await tryCreateEmbeddings(EMBEDDING_MODEL_PRIMARY, inputs);

      // If primary failed with 403 or not allowed, try fallback
      if (!embResult.success) {
        const err = embResult.error;
        // if access error (403) or any other error, attempt fallback
        console.warn(`Primary embedding model failed: ${err?.message || err}. Trying fallback model ${EMBEDDING_MODEL_FALLBACK}`);
        embResult = await tryCreateEmbeddings(EMBEDDING_MODEL_FALLBACK, inputs);
      }

      // If embedding creation succeeded, update DB with embeddings
      if (embResult.success) {
        const vectors = embResult.data; // array of embeddings
        const updateOps = batch.map((p, idx) => ({
          updateOne: {
            filter: { product_id: p.product_id },
            update: { $set: { embedding: vectors[idx] } }
          }
        }));
        if (updateOps.length > 0) {
          await db.collection("products").bulkWrite(updateOps, { ordered: false });
        }
      } else {
        // If both models failed, log and continue (products remain in DB w/out embeddings)
        console.error("Embedding creation failed for batch:", i, "error:", embResult.error?.message || embResult.error);
      }
    }

    // final count
    const count = normalizedItems.length;
    res.json({ message: "Products synced", count });
  } catch (err) {
    console.error("Sync error:", err);
    // Avoid leaking secrets in response; send only message
    res.status(500).json({ error: err.message });
  }
}
