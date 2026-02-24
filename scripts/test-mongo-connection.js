#!/usr/bin/env node
require("dotenv").config();

const { MongoClient } = require("mongodb");

const mongoUri = process.env.MONGO_URI;
const dbName = process.env.MONGODB_DB_NAME || "spicekart";

console.log("Environment Check:");
console.log(`MONGO_URI set: ${mongoUri ? "✓ yes" : "✗ NO"}`);
console.log(`MONGODB_DB_NAME: ${dbName}`);

if (!mongoUri) {
  console.error("\nERROR: MONGO_URI is not set. Cannot connect.");
  console.error("Set MONGO_URI in Render environment variables.");
  process.exit(1);
}

console.log(
  `\nAttempting to connect to: ${mongoUri.replace(/\/\/.*@/, "//***:***@")}`,
);

const client = new MongoClient(mongoUri, { serverSelectionTimeoutMS: 10000 });

(async () => {
  try {
    await client.connect();
    const db = client.db(dbName);
    const collections = await db.listCollections().toArray();
    const productCount = await db.collection("products").countDocuments();
    const orderCount = await db.collection("orders").countDocuments();

    console.log("\n✓ Connected successfully!");
    console.log(`Collections: ${collections.map((c) => c.name).join(", ")}`);
    console.log(`Products: ${productCount}`);
    console.log(`Orders: ${orderCount}`);
    process.exit(0);
  } catch (error) {
    console.error("\n✗ Connection failed:");
    console.error(error.message);
    process.exit(1);
  } finally {
    await client.close();
  }
})();
