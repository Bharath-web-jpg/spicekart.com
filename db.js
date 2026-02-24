const { MongoClient } = require("mongodb");
const path = require("path");
const fs = require("fs");

const PRODUCTS_JSON = path.join(__dirname, "data", "products.json");
const MONGO_URI = process.env.MONGO_URI || process.env.MONGODB_URI;
const MONGODB_DB_NAME = process.env.MONGODB_DB_NAME || "spicekart";

let client;
let db;

function normalizeProduct(product, index) {
  return {
    id: Number(product.id) || Date.now() + index,
    name: product.name,
    price: Number(product.price) || 0,
    category: product.category || "",
    description: product.description || "",
    image: product.image || "",
  };
}

async function seedProductsIfEmpty(database) {
  const productsCollection = database.collection("products");
  const count = await productsCollection.countDocuments();
  if (count > 0) return;

  const raw = fs.readFileSync(PRODUCTS_JSON, "utf8");
  const products = JSON.parse(raw || "[]").map(normalizeProduct);
  if (products.length === 0) return;

  await productsCollection.insertMany(products, { ordered: false });
  console.log("Seeded products into MongoDB");
}

async function connectDB() {
  if (db) return db;

  if (!MONGO_URI) {
    console.warn(
      "MongoDB URI not provided. Set MONGO_URI (or MONGODB_URI) to your MongoDB Atlas connection string.",
    );
    return null;
  }

  try {
    client = new MongoClient(MONGO_URI, {
      serverSelectionTimeoutMS: 5000,
    });
    await client.connect();
    db = client.db(MONGODB_DB_NAME);

    await db.collection("products").createIndex({ id: 1 }, { unique: true });
    await db.collection("orders").createIndex({ id: 1 }, { unique: true });
    await seedProductsIfEmpty(db);

    console.log(`Connected to MongoDB: ${MONGODB_DB_NAME}`);
    return db;
  } catch (error) {
    console.error(
      "MongoDB connection failed. Running without DB.",
      error.message,
    );
    db = null;
    return null;
  }
}

function getDb() {
  if (!db) {
    throw new Error(
      "MongoDB is not connected. Call connectDB() before getDb().",
    );
  }
  return db;
}

function isDbConnected() {
  return !!db;
}

module.exports = {
  connectDB,
  getDb,
  isDbConnected,
};
