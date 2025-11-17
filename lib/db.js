import { MongoClient } from "mongodb";

let cachedClient = null;
let cachedDb = null;

export async function connectToDatabase() {
  if (cachedDb) return cachedDb;

  const uri = process.env.DATABASE_URL;
  if (!uri) {
    throw new Error("DATABASE_URL environment variable not set");
  }

  try {
    const client = new MongoClient(uri, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      serverApi: {
        version: "1", // optional, recommended for Atlas
        strict: true,
        deprecationErrors: true
      }
    });

    if (!cachedClient) {
      await client.connect();
      cachedClient = client;
    }

    cachedDb = cachedClient.db(); // default DB from URI
    console.log("MongoDB connected");
    return cachedDb;
  } catch (err) {
    console.error("MongoDB connection failed:", err);
    throw err;
  }
}
