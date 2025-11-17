// /lib/db.js
import { MongoClient } from "mongodb";

let cachedClient = null;
let cachedDb = null;

export async function connectToDatabase() {
  if (cachedDb) return cachedDb;

  const uri = process.env.DATABASE_URL;
  if (!uri) throw new Error("DATABASE_URL not set in environment variables");

  try {
    const client = new MongoClient(uri, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    if (!cachedClient) {
      await client.connect();
      cachedClient = client;
      console.log("MongoDB connected");
    }

    cachedDb = cachedClient.db(); // default DB from URI
    return cachedDb;
  } catch (err) {
    console.error("MongoDB connection failed:", err);
    throw err;
  }
}
