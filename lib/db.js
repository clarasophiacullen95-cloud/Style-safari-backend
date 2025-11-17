import { MongoClient } from "mongodb";

let client;
let db;

export async function connectDB() {
  if (db) return db;
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL not set in environment variables");
  }
  client = new MongoClient(process.env.DATABASE_URL);
  await client.connect();
  db = client.db(); // defaults to database in connection string
  return db;
}
