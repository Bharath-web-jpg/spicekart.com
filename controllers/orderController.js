const { getDb } = require("../db");

function sanitizeCustomer(customer) {
  return {
    name: String(customer?.name || "").trim(),
    address: String(customer?.address || "").trim(),
    phone: String(customer?.phone || "").trim(),
    pincode: String(customer?.pincode || "").trim(),
    payment: String(customer?.payment || "").trim(),
  };
}

function normalizeOrderItems(items) {
  return items
    .map((item) => ({
      id: Number(item?.id),
      qty: Math.max(1, Number(item?.qty) || 0),
    }))
    .filter((item) => Number.isFinite(item.id) && item.qty > 0);
}

// Place order - basic validation and save to MongoDB
exports.placeOrder = async (req, res) => {
  const { customer, items } = req.body;
  if (!customer || !items || !Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ error: "Invalid order payload" });
  }

  try {
    const normalizedItems = normalizeOrderItems(items);
    if (normalizedItems.length === 0) {
      return res.status(400).json({ error: "No valid items in order" });
    }

    const productIds = normalizedItems.map((item) => item.id);
    const products = await getDb()
      .collection("products")
      .find({ id: { $in: productIds } }, { projection: { _id: 0 } })
      .toArray();
    const productsById = new Map(
      products.map((product) => [product.id, product]),
    );

    const safeItems = normalizedItems.map((item) => {
      const product = productsById.get(item.id);
      return {
        id: item.id,
        qty: item.qty,
        name: product?.name || "Unknown product",
        price: Number(product?.price) || 0,
      };
    });

    const id = Date.now();
    await getDb()
      .collection("orders")
      .insertOne({
        id,
        customer: sanitizeCustomer(customer),
        items: safeItems,
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
