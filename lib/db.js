import { MongoClient } from 'mongodb';

let client;
let db;

export async function connectDB() {
  if (db) return db;

  client = new MongoClient(process.env.DATABASE_URL);
  await client.connect();
  db = client.db();
  return db;
}
