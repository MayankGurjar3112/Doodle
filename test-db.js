import { connect } from "mongoose";

let uri = process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/doodle";

if (uri.includes("localhost")) {
  uri = uri.replace("localhost", "127.0.0.1");
}

console.log(`Attempting to connect to: ${uri}`);

connect(uri)
  .then(() => {
    console.log("Successfully connected to MongoDB!");
    process.exit(0);
  })
  .catch((err) => {
    console.error("Connection error:", err);
    process.exit(1);
  });
