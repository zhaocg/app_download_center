import { Collection, MongoClient, MongoClientOptions } from "mongodb";
import { MONGODB_URI } from "./config";
import { FileMeta } from "../types/file";

const globalForMongo = global as unknown as {
  mongoClient?: MongoClient;
};

export async function getMongoClient() {
  if (!globalForMongo.mongoClient) {
    const options: MongoClientOptions = {};
    const client = new MongoClient(MONGODB_URI, options);
    await client.connect();
    globalForMongo.mongoClient = client;
  }
  return globalForMongo.mongoClient;
}

export async function getDb() {
  const client = await getMongoClient();
  return client.db();
}

export async function getFilesCollection(): Promise<Collection<FileMeta>> {
  const db = await getDb();
  return db.collection<FileMeta>("files");
}
