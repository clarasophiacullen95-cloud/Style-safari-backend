import fetch from "node-fetch";

export async function fetchAffiliateProducts() {
  if (!process.env.BASE44_API_KEY || !process.env.BASE44_APP_ID) {
    throw new Error("BASE44_API_KEY or BASE44_APP_ID not set");
  }

  const res = await fetch("https://api.base44.com/products", {
    headers: {
      "Authorization": `Bearer ${process.env.BASE44_API_KEY}`,
      "X-App-ID": process.env.BASE44_APP_ID
    }
  });

  if (!res.ok) {
    throw new Error(`Base44 API returned status ${res.status}`);
  }

  const data = await res.json();
  return data.products || [];
}
