const sqlite3 = require("sqlite3").verbose();
const path = require("path");
const fs = require("fs");

const DB_PATH = path.join(__dirname, "data", "spicekart.db");
const PRODUCTS_JSON = path.join(__dirname, "data", "products.json");

const db = new sqlite3.Database(DB_PATH);

// Initialize schema and seed from products.json when empty
db.serialize(() => {
  db.run(`
    CREATE TABLE IF NOT EXISTS products (
      id INTEGER PRIMARY KEY,
      name TEXT NOT NULL,
      price REAL NOT NULL,
      category TEXT,
      description TEXT,
      image TEXT
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS orders (
      id INTEGER PRIMARY KEY,
      customer TEXT NOT NULL,
      items TEXT NOT NULL,
      createdAt TEXT NOT NULL
    )
  `);

  // seed products if table empty
  db.get("SELECT COUNT(1) as c FROM products", (err, row) => {
    if (err) return console.error("DB check error", err);
    if (row && row.c === 0) {
      try {
        const raw = fs.readFileSync(PRODUCTS_JSON, "utf8");
        const products = JSON.parse(raw || "[]");
        const stmt = db.prepare(
          "INSERT INTO products(id,name,price,category,description,image) VALUES(?,?,?,?,?,?)",
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
        stmt.finalize();
        console.log("Seeded products into SQLite DB");
      } catch (e) {
        console.error("Failed to seed products", e);
      }
    }
  });
});

module.exports = db;
