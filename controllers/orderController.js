const db = require("../db");

// Place order - basic validation and save to SQLite
exports.placeOrder = (req, res) => {
  const { customer, items } = req.body;
  if (!customer || !items || !Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ error: "Invalid order payload" });
  }

  const id = Date.now();
  const createdAt = new Date().toISOString();
  const sql = `INSERT INTO orders (id, customer, items, createdAt) VALUES (?,?,?,?)`;
  db.run(
    sql,
    [id, JSON.stringify(customer), JSON.stringify(items), createdAt],
    function (err) {
      if (err) return res.status(500).json({ error: "Could not place order" });
      res.status(201).json({ success: true, orderId: id });
    },
  );
};
