import { MongoClient } from "mongodb";

let client;
let db;

export async function connectToDatabase() {
    if (db) return { db, client };

    client = new MongoClient(process.env.MONGODB_URI);
    await client.connect();
    db = client.db(process.env.MONGODB_DB);
    return { db, client };
}
