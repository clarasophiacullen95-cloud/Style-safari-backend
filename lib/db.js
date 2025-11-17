import { MongoClient } from "mongodb";

let client;
let db;

export async function connectToDatabase() {
  if (db) return db;

  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL not set in Vercel environment variables");
  }

  client = new MongoClient(process.env.DATABASE_URL);
  await client.connect();
  db = client.db(); // default DB from connection string
  return db;
}
