const { getDb } = require("../db");

// List products with simple filtering and search using MongoDB
exports.listProducts = async (req, res) => {
  try {
    const q = String(req.query.q || "").trim();
    const category = String(req.query.category || "").trim();
    const min = req.query.min ? Number(req.query.min) : null;
    const max = req.query.max ? Number(req.query.max) : null;

    const filter = {};
    if (q) {
      filter.$or = [
        { name: { $regex: q, $options: "i" } },
        { description: { $regex: q, $options: "i" } },
      ];
    }
    if (category) {
      filter.category = category;
    }
    if (min !== null || max !== null) {
      filter.price = {};
      if (min !== null && !Number.isNaN(min)) filter.price.$gte = min;
      if (max !== null && !Number.isNaN(max)) filter.price.$lte = max;
    }

    const rows = await getDb()
      .collection("products")
      .find(filter, { projection: { _id: 0 } })
      .sort({ id: 1 })
      .toArray();

    res.json(rows || []);
  } catch (error) {
    res.status(500).json({ error: "Could not read products" });
  }
};

// Add product - validation and insert to MongoDB
exports.addProduct = async (req, res) => {
  const { name, price, category, description, image } = req.body;
  if (!name || !price)
    return res.status(400).json({ error: "Name and price are required" });

  try {
    const product = {
      id: Date.now(),
      name,
      price: Number(price),
      category: category || "General",
      description: description || "",
      image: image || "",
    };

    await getDb().collection("products").insertOne(product);
    res.status(201).json(product);
  } catch (error) {
    res.status(500).json({ error: "Could not add product" });
  }
};

// Get single product
exports.getProduct = async (req, res) => {
  const id = Number(req.params.id);
  try {
    const row = await getDb()
      .collection("products")
      .findOne({ id }, { projection: { _id: 0 } });
    if (!row) return res.status(404).json({ error: "Not found" });
    res.json(row);
  } catch (error) {
    return res.status(500).json({ error: "Could not read product" });
  }
};

// Update product
exports.updateProduct = async (req, res) => {
  const id = Number(req.params.id);
  const { name, price, category, description, image } = req.body;
  if (!name || !price)
    return res.status(400).json({ error: "Name and price required" });
  try {
    const result = await getDb()
      .collection("products")
      .updateOne(
        { id },
        {
          $set: {
            name,
            price: Number(price),
            category: category || "",
            description: description || "",
            image: image || "",
          },
        },
      );

    if (!result.matchedCount) {
      return res.status(404).json({ error: "Not found" });
    }

    res.json({ success: true });
  } catch (error) {
    return res.status(500).json({ error: "Could not update product" });
  }
};

// Delete product
exports.deleteProduct = async (req, res) => {
  const id = Number(req.params.id);
  try {
    await getDb().collection("products").deleteOne({ id });
    res.json({ success: true });
  } catch (error) {
    return res.status(500).json({ error: "Could not delete product" });
  }
};
