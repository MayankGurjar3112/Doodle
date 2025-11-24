const process = {
  env: {
    MONGO_USERNAME: "testuser",
    MONGO_PASSWORD: "testpassword",
  },
};

const mongoose = {
  connect: (uri, opts) => {
    console.log(`[Mock] mongoose.connect called with:`);
    console.log(`  URI: ${uri}`);
    console.log(`  Options:`, JSON.stringify(opts, null, 2));
    return Promise.resolve({});
  },
};

function testConnectionLogic(inputUri) {
  console.log(`\n--- Testing input URI: ${inputUri} ---`);

  let uri = inputUri;
  const opts = {
    bufferCommands: false,
  };

  // Logic copied from lib/db.ts
  if (uri.includes("localhost")) {
    uri = uri.replace("localhost", "127.0.0.1");
  }

  if (uri.includes("mongodb.net")) {
    Object.assign(opts, {
      user: process.env.MONGO_USERNAME,
      pass: process.env.MONGO_PASSWORD,
    });
  }
  // End logic

  mongoose.connect(uri, opts);
}

// Test cases
testConnectionLogic("mongodb://localhost:27017/doodle");
testConnectionLogic("mongodb+srv://cluster0.mongodb.net/doodle");
