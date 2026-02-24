require("dotenv").config();
const { connectDB, getDb } = require("../db");
const fs = require("fs");
const path = require("path");

const PRODUCTS_JSON = path.join(__dirname, "..", "data", "products.json");

async function sync() {
  try {
    const raw = fs.readFileSync(PRODUCTS_JSON, "utf8");
    const products = JSON.parse(raw || "[]");
    await connectDB();

    const operations = products.map((p, index) => ({
      updateOne: {
        filter: { id: Number(p.id) || Date.now() + index },
        update: {
          $set: {
            id: Number(p.id) || Date.now() + index,
            name: p.name,
            price: Number(p.price) || 0,
            category: p.category || "",
            description: p.description || "",
            image: p.image || "",
          },
        },
        upsert: true,
      },
    }));

    if (operations.length) {
      await getDb().collection("products").bulkWrite(operations, {
        ordered: false,
      });
    }

    console.log("Synced products.json -> MongoDB");
    process.exit(0);
  } catch (e) {
    console.error("Failed to read products.json", e);
    process.exit(1);
  }
}

sync();
