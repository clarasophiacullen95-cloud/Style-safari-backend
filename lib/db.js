import { MongoClient } from "mongodb";

let cached = global.mongo;

if (!cached) {
    cached = global.mongo = { conn: null, promise: null };
}

export async function connectToDatabase() {
    if (cached.conn) return cached.conn;

    if (!cached.promise) {
        const client = new MongoClient(process.env.MONGODB_URI);
        cached.promise = client.connect().then(client => ({
            client,
            db: client.db(process.env.MONGODB_DB)
        }));
    }

    cached.conn = await cached.promise;
    return cached.conn;
}
