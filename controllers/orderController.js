const { getDb } = require("../db");

// Place order - basic validation and save to MongoDB
exports.placeOrder = async (req, res) => {
  const { customer, items } = req.body;
  if (!customer || !items || !Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ error: "Invalid order payload" });
  }

  try {
    const id = Date.now();
    await getDb().collection("orders").insertOne({
      id,
      customer,
      items,
      createdAt: new Date().toISOString(),
    });
    res.status(201).json({ success: true, orderId: id });
  } catch (error) {
    return res.status(500).json({ error: "Could not place order" });
  }
};

// List orders for admin view
exports.listOrders = async (req, res) => {
  try {
    const rows = await getDb()
      .collection("orders")
      .find({}, { projection: { _id: 0 } })
      .sort({ createdAt: -1 })
      .limit(100)
      .toArray();

    res.json(rows || []);
  } catch (error) {
    return res.status(500).json({ error: "Could not read orders" });
  }
};
