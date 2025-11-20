// lib/db.js
import { MongoClient } from "mongodb";

let cachedClient = null;
let cachedDb = null;

export async function connectToDatabase() {
  if (cachedClient && cachedDb) return { client: cachedClient, db: cachedDb };

  if (!process.env.MONGODB_URI) throw new Error("MONGODB_URI env var missing");
  if (!process.env.MONGODB_DB) throw new Error("MONGODB_DB env var missing");

  const client = new MongoClient(process.env.MONGODB_URI);
  await client.connect();
  const db = client.db(process.env.MONGODB_DB);

  cachedClient = client;
  cachedDb = db;

  return { client, db };
}
