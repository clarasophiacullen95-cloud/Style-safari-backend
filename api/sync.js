import fetch from "node-fetch";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
	process.env.SUPABASE_URL,
	process.env.SUPABASE_SERVICE_ROLE_KEY
);

const BASE44_API_KEY = "62469cf662824e20907e661540bafa40";
const BASE44_APP = "690f996cd436db6a01fc83c7";

const OPENAI_KEY = process.env.OPENAI_API_KEY;

// --- Generate embedding using OpenAI ---
async function generateEmbedding(text) {
	try {
		const res = await fetch("https://api.openai.com/v1/embeddings", {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				Authorization: `Bearer ${OPENAI_KEY}`,
			},
			body: JSON.stringify({
				model: "text-embedding-3-large",
				input: text,
			}),
		});

		const data = await res.json();
		return data.data[0].embedding;
	} catch (err) {
		console.error("Embedding error:", err);
		return null;
	}
}

// --- Fetch product feed from Base44 ---
async function fetchProductFeed() {
	const url = `https://app.base44.com/api/apps/${BASE44_APP}/entities/ProductFeed`;

	const res = await fetch(url, {
		headers: {
			api_key: BASE44_API_KEY,
			"Content-Type": "application/json",
		},
	});

	const data = await res.json();

	if (!data || !data.results) {
		throw new Error("Base44 returned empty or invalid data");
	}

	return data.results;
}

// --- Main sync function ---
export default async function handler(req, res) {
	if (req.query.secret !== process.env.SYNC_SECRET) {
		return res.status(401).json({ error: "Unauthorized" });
	}

	try {
		const feedItems = await fetchProductFeed();

		for (const item of feedItems) {
			// 🌟 CLEAN PRODUCT TITLE (remove misleading words like 'tumbler')
			const cleanTitle = item.name
				.replace(/tumbler/gi, "")
				.replace(/mug/gi, "")
				.replace(/insulated/gi, "")
				.trim();

			const description = item.description || "";
			const combinedText =
				`${cleanTitle}. ${description}. Color: ${item.color}. Category: ${item.category}`.trim();

			// --- Generate embedding ---
			const embedding = await generateEmbedding(combinedText);

			// --- Insert/update Supabase ---
			await supabase.from("products").upsert({
				product_id: item.product_id,
				name: cleanTitle,
				brand: item.brand,
				price: item.price,
				currency: item.currency || "GBP",
				image_url: item.image_url,
				description: item.description,
				category: item.category,
				color: item.color,
				fabric: item.fabric,
				affiliate_link: item.affiliate_link,
				product_link: item.product_link,
				in_stock: item.in_stock,
				tags: item.tags,
				style: item.style,
				occasion: item.occasion,
				season: item.season,
				is_new: item.is_new,
				is_bestseller: item.is_bestseller,
				last_synced: new Date().toISOString(),
				feed_source: item.feed_source || "product_feed",
				embedding,
			});
		}

		return res.json({ success: true, count: feedItems.length });
	} catch (err) {
		console.error("SYNC ERROR:", err);
		return res.status(500).json({ error: err.message });
	}
}
