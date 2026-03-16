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

function resolveCustomer(body) {
  if (body?.customer && typeof body.customer === "object") {
    return sanitizeCustomer(body.customer);
  }

  return sanitizeCustomer({
    name: body?.name,
    address: body?.address,
    phone: body?.phone,
    pincode: body?.pincode,
    payment: body?.payment,
  });
}

function normalizeOrderItems(items) {
  return items
    .map((item) => ({
      id: Number(item?.id),
      qty: Math.max(1, Number(item?.qty ?? item?.quantity) || 0),
    }))
    .filter((item) => Number.isFinite(item.id) && item.qty > 0);
}

// Place order - basic validation and save to MongoDB
exports.placeOrder = async (req, res) => {
  const customer = resolveCustomer(req.body);
  const items = req.body?.items;

  if (!items || !Array.isArray(items) || items.length === 0) {
    console.error("[orders] Invalid order payload", {
      hasCustomer: Boolean(customer),
      hasItemsArray: Array.isArray(items),
      itemsCount: Array.isArray(items) ? items.length : 0,
      bodyKeys: Object.keys(req.body || {}),
    });
    return res.status(400).json({ error: "Invalid order payload" });
  }

  if (!customer.name || !customer.address || !customer.phone) {
    console.error("[orders] Missing required customer fields", {
      customer,
    });
    return res.status(400).json({
      error: "Customer name, address, and phone are required",
    });
  }

  try {
    const normalizedItems = normalizeOrderItems(items);
    if (normalizedItems.length === 0) {
      console.error("[orders] No valid items after normalization", {
        sampleItem: items[0] || null,
      });
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
    await getDb().collection("orders").insertOne({
      id,
      customer,
      items: safeItems,
      createdAt: new Date().toISOString(),
    });

    console.log("[orders] Order placed", {
      orderId: id,
      itemCount: safeItems.length,
      customerName: String(customer?.name || "").trim() || "Guest",
    });
    res.status(201).json({ success: true, orderId: id });
  } catch (error) {
    console.error("[orders] Could not place order", {
      message: error?.message,
      stack: error?.stack,
    });
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
    console.error("[orders] Could not read orders", {
      message: error?.message,
      stack: error?.stack,
    });
    return res.status(500).json({ error: "Could not read orders" });
  }
};
