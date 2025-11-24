import mongoose from "mongoose";

const MONGODB_URI = process.env.MONGO_URI || "";

if (!MONGODB_URI) {
  // We'll construct it from username/password if the full URI isn't provided
  if (!process.env.MONGO_USERNAME || !process.env.MONGO_PASSWORD) {
    throw new Error(
      "Please define the MONGODB_URI environment variable inside .env.local, or MONGO_USERNAME and MONGO_PASSWORD"
    );
  }
}

interface MongooseCache {
  conn: typeof mongoose | null;
  promise: Promise<typeof mongoose> | null;
}

declare global {
  var mongoose: MongooseCache;
}

let cached = global.mongoose;

if (!cached) {
  cached = global.mongoose = { conn: null, promise: null };
}

async function connectToDatabase() {
  if (cached.conn) {
    return cached.conn;
  }

  if (!cached.promise) {
    const opts = {
      bufferCommands: false,
    };

    let uri = MONGODB_URI;

    if (uri.includes("localhost")) {
      uri = uri.replace("localhost", "127.0.0.1");
    }

    if (uri.includes("mongodb.net")) {
      Object.assign(opts, {
        user: process.env.MONGO_USERNAME,
        pass: process.env.MONGO_PASSWORD,
      });
    }

    cached.promise = mongoose.connect(uri, opts).then((mongoose) => {
      return mongoose;
    });
  }

  try {
    cached.conn = await cached.promise;
  } catch (e) {
    cached.promise = null;
    throw e;
  }

  return cached.conn;
}

export default connectToDatabase;
