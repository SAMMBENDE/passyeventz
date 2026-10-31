import mongoose from "mongoose";

type MongooseCache = {
  connection: typeof mongoose | null;
  promise: Promise<typeof mongoose> | null;
};

declare global {
  var mongooseCache: MongooseCache | undefined;
}

const cache = (globalThis.mongooseCache ??= {
  connection: null,
  promise: null,
});

export async function connectToDatabase() {
  if (cache.connection && mongoose.connection.readyState === 1) {
    return cache.connection;
  }

  const uri = process.env.MONGODB_URI?.trim();
  if (!uri) {
    throw new Error("MONGODB_URI is not configured.");
  }

  cache.promise ??= mongoose.connect(uri).catch((error: unknown) => {
    cache.promise = null;
    throw error;
  });

  cache.connection = await cache.promise;
  return cache.connection;
}
