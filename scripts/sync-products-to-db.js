const db = require("../db");
const fs = require("fs");
const path = require("path");

const PRODUCTS_JSON = path.join(__dirname, "..", "data", "products.json");

function sync() {
  try {
    const raw = fs.readFileSync(PRODUCTS_JSON, "utf8");
    const products = JSON.parse(raw || "[]");
    db.serialize(() => {
      const stmt = db.prepare(
        "INSERT OR REPLACE INTO products(id,name,price,category,description,image) VALUES(?,?,?,?,?,?)",
      );
      products.forEach((p) => {
        stmt.run(
          p.id || Date.now(),
          p.name,
          p.price,
          p.category || "",
          p.description || "",
          p.image || "",
        );
      });
      stmt.finalize((err) => {
        if (err) console.error("Finalize error", err);
        else console.log("Synced products.json -> SQLite DB");
        // give DB a moment then exit
        setTimeout(() => process.exit(0), 200);
      });
    });
  } catch (e) {
    console.error("Failed to read products.json", e);
    process.exit(1);
  }
}

sync();
