import { MongoClient } from "mongodb";

let cachedClient = null;
let cachedDb = null;

export async function connectToDatabase() {
    if (!process.env.MONGODB_URI || !process.env.MONGODB_DB) {
        throw new Error("Missing MONGODB_URI or MONGODB_DB environment variables");
    }
    if (cachedClient && cachedDb) return { client: cachedClient, db: cachedDb };

    const client = new MongoClient(process.env.MONGODB_URI);
    await client.connect();
    const db = client.db(process.env.MONGODB_DB);

    cachedClient = client;
    cachedDb = db;

    return { client, db };
}

export async function fetchFromBase44(path) {
    if (!process.env.BASE44_API_KEY || !process.env.BASE44_APP_ID) {
        throw new Error("Missing BASE44_API_KEY or BASE44_APP_ID environment variables");
    }

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
