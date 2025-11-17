import fetch from "node-fetch";

export async function fetchAffiliateProducts() {
  const APP_ID = process.env.BASE44_APP_ID;
  const API_KEY = process.env.BASE44_API_KEY;

  if (!APP_ID || !API_KEY) {
    throw new Error("BASE44_APP_ID or BASE44_API_KEY not set");
  }

  const url = `https://app.base44.com/api/apps/${APP_ID}/entities/ProductFeed`;

  const res = await fetch(url, {
    headers: {
      'api_key': API_KEY,
      'Content-Type': 'application/json'
    }
  });

  if (!res.ok) {
    throw new Error(`Base44 API returned status ${res.status}`);
  }

  const data = await res.json();
  return data || []; // data should be an array of product entities
}
