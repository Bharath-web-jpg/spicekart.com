const db = require("../db");
const fs = require("fs").promises;
const path = require("path");
const PRODUCTS_FILE = path.join(__dirname, "..", "data", "products.json");

// List products with simple filtering and search using SQLite
exports.listProducts = (req, res) => {
  const q = (req.query.q || "").toLowerCase();
  const category = req.query.category || "";
  const min = req.query.min ? Number(req.query.min) : null;
  const max = req.query.max ? Number(req.query.max) : null;

  let sql = "SELECT * FROM products WHERE 1=1";
  const params = [];
  if (q) {
    sql += " AND (LOWER(name) LIKE ? OR LOWER(description) LIKE ?)";
    params.push(`%${q}%`, `%${q}%`);
  }
  if (category) {
    sql += " AND category = ?";
    params.push(category);
  }
  if (min !== null) {
    sql += " AND price >= ?";
    params.push(min);
  }
  if (max !== null) {
    sql += " AND price <= ?";
    params.push(max);
  }

  db.all(sql, params, (err, rows) => {
    if (err) return res.status(500).json({ error: "Could not read products" });
    res.json(rows || []);
  });
};

// Add product - validation and insert to SQLite
exports.addProduct = (req, res) => {
  const { name, price, category, description, image } = req.body;
  if (!name || !price)
    return res.status(400).json({ error: "Name and price are required" });

  const id = Date.now();
  const sql = `INSERT INTO products (id,name,price,category,description,image) VALUES (?,?,?,?,?,?)`;
  db.run(
    sql,
    [
      id,
      name,
      Number(price),
      category || "General",
      description || "",
      image || "",
    ],
    function (err) {
      if (err) return res.status(500).json({ error: "Could not add product" });
      res
        .status(201)
        .json({ id, name, price: Number(price), category, description, image });
    },
  );
};

// Get single product
exports.getProduct = (req, res) => {
  const id = Number(req.params.id);
  db.get("SELECT * FROM products WHERE id = ?", [id], (err, row) => {
    if (err) return res.status(500).json({ error: "Could not read product" });
    if (!row) return res.status(404).json({ error: "Not found" });
    res.json(row);
  });
};

// Update product
exports.updateProduct = async (req, res) => {
  const id = Number(req.params.id);
  const { name, price, category, description, image } = req.body;
  if (!name || !price)
    return res.status(400).json({ error: "Name and price required" });
  const sql =
    "UPDATE products SET name=?, price=?, category=?, description=?, image=? WHERE id=?";
  db.run(
    sql,
    [name, Number(price), category || "", description || "", image || "", id],
    async function (err) {
      if (err)
        return res.status(500).json({ error: "Could not update product" });
      await syncProductsJson();
      res.json({ success: true });
    },
  );
};

// Delete product
exports.deleteProduct = async (req, res) => {
  const id = Number(req.params.id);
  db.run("DELETE FROM products WHERE id=?", [id], async function (err) {
    if (err) return res.status(500).json({ error: "Could not delete product" });
    await syncProductsJson();
    res.json({ success: true });
  });
};

// Sync SQLite products to products.json
async function syncProductsJson() {
  return new Promise((resolve, reject) => {
    db.all("SELECT * FROM products", [], async (err, rows) => {
      if (err) return reject(err);
      try {
        await fs.writeFile(
          PRODUCTS_FILE,
          JSON.stringify(rows, null, 2),
          "utf8",
        );
        resolve();
      } catch (e) {
        reject(e);
      }
    });
  });
}
