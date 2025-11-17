import { MongoClient } from "mongodb";

let cachedClient = null;
let cachedDb = null;

export async function connectToDatabase() {
    const uri = process.env.MONGODB_URI;
    const dbName = process.env.MONGODB_DB;

    if (!uri || !dbName) return { client: null, db: null };

    if (cachedClient && cachedDb) return { client: cachedClient, db: cachedDb };

    const client = new MongoClient(uri);
    await client.connect();
    const db = client.db(dbName);

    cachedClient = client;
    cachedDb = db;

    return { client, db };
}

export async function fetchFromBase44(path) {
    const apiKey = process.env.BASE44_API_KEY;
    const appId = process.env.BASE44_APP_ID;

    if (!apiKey || !appId) return {};

    const url = `https://app.base44.com/api/apps/${appId}/${path}`;
    const response = await fetch(url, {
        headers: { "api_key": apiKey, "Content-Type": "application/json" }
    });

    if (!response.ok) {
        const text = await response.text();
        throw new Error(`Base44 API Error ${response.status}: ${text}`);
    }

    return response.json();
}
