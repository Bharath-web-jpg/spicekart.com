const fs = require("fs");
const path = require("path");
const { getDb, isDbConnected } = require("../db");

const productCache = {
  all: null,
  allAt: 0,
  byId: new Map(),
};

const CACHE_TTL_MS = 60 * 1000;
const PRODUCTS_SEED_FILE = path.join(__dirname, "..", "data", "products.json");

let seedProductsCache = null;

function normalizeProduct(product) {
  return {
    id: Number(product?.id) || Date.now(),
    name: String(product?.name || "").trim() || "Unnamed product",
    price: Number(product?.price) || 0,
    category: String(product?.category || "").trim(),
    description: String(product?.description || "").trim(),
    image: String(product?.image || "").trim(),
  };
}

function clearProductCache() {
  productCache.all = null;
  productCache.allAt = 0;
  productCache.byId.clear();
}

function getSeedProducts() {
  if (Array.isArray(seedProductsCache)) {
    return seedProductsCache;
  }

  try {
    const raw = fs.readFileSync(PRODUCTS_SEED_FILE, "utf8");
    const parsed = JSON.parse(raw || "[]");
    seedProductsCache = (Array.isArray(parsed) ? parsed : []).map(
      normalizeProduct,
    );
    return seedProductsCache;
  } catch (error) {
    console.warn(
      "[products] Failed to read local seed file for fallback.",
      error.message,
    );
    seedProductsCache = [];
    return seedProductsCache;
  }
}

function filterProductsFallback(list, query) {
  const q = String(query.q || "")
    .trim()
    .toLowerCase();
  const category = String(query.category || "").trim();
  const min = query.min ? Number(query.min) : null;
  const max = query.max ? Number(query.max) : null;

  return (list || [])
    .filter((product) => {
      const matchesQuery = q
        ? product.name.toLowerCase().includes(q) ||
          product.description.toLowerCase().includes(q)
        : true;
      const matchesCategory = category ? product.category === category : true;
      const price = Number(product.price) || 0;
      const matchesMin =
        min !== null && !Number.isNaN(min) ? price >= min : true;
      const matchesMax =
        max !== null && !Number.isNaN(max) ? price <= max : true;
      return matchesQuery && matchesCategory && matchesMin && matchesMax;
    })
    .sort((a, b) => Number(a.id) - Number(b.id));
}

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

    const canUseAllCache =
      Object.keys(filter).length === 0 &&
      productCache.all &&
      Date.now() - productCache.allAt < CACHE_TTL_MS;

    if (canUseAllCache) {
      return res.json(productCache.all);
    }

    if (!isDbConnected()) {
      console.warn(
        "[products] MongoDB unavailable. Serving products from local seed fallback.",
      );
      const fallbackRows = filterProductsFallback(
        getSeedProducts(),
        req.query || {},
      );
      if (Object.keys(filter).length === 0) {
        productCache.all = fallbackRows;
        productCache.allAt = Date.now();
      }
      return res.json(fallbackRows);
    }

    const rows = await getDb()
      .collection("products")
      .find(filter, { projection: { _id: 0 } })
      .sort({ id: 1 })
      .toArray();

    const normalized = (rows || []).map(normalizeProduct);
    if (Object.keys(filter).length === 0) {
      productCache.all = normalized;
      productCache.allAt = Date.now();
    }

    return res.json(normalized);
  } catch (error) {
    if (!isDbConnected()) {
      console.warn(
        "[products] MongoDB unavailable after error. Serving products from local seed fallback.",
      );
      const fallbackRows = filterProductsFallback(
        getSeedProducts(),
        req.query || {},
      );
      if (
        !String(req.query?.q || "").trim() &&
        !String(req.query?.category || "").trim() &&
        !req.query?.min &&
        !req.query?.max
      ) {
        productCache.all = fallbackRows;
        productCache.allAt = Date.now();
      }
      return res.json(fallbackRows);
    }
    return res.status(500).json({ error: "Could not read products" });
  }
};

// Add product - validation and insert to MongoDB
exports.addProduct = async (req, res) => {
  const { name, price, category, description, image } = req.body;
  if (!name || !price)
    return res.status(400).json({ error: "Name and price are required" });

  try {
    const product = normalizeProduct({
      id: Date.now(),
      name,
      price,
      category: category || "General",
      description,
      image,
    });

    await getDb().collection("products").insertOne(product);
    clearProductCache();
    res.status(201).json(product);
  } catch (error) {
    res.status(500).json({ error: "Could not add product" });
  }
};

// Get single product
exports.getProduct = async (req, res) => {
  const id = Number(req.params.id);
  try {
    const cached = productCache.byId.get(id);
    if (cached && Date.now() - cached.cachedAt < CACHE_TTL_MS) {
      return res.json(cached.product);
    }

    const row = await getDb()
      .collection("products")
      .findOne({ id }, { projection: { _id: 0 } });
    if (!row) return res.status(404).json({ error: "Not found" });
    const normalized = normalizeProduct(row);
    productCache.byId.set(id, { product: normalized, cachedAt: Date.now() });
    return res.json(normalized);
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
    const normalized = normalizeProduct({
      id,
      name,
      price,
      category,
      description,
      image,
    });

    const result = await getDb().collection("products").updateOne(
      { id },
      {
        $set: normalized,
      },
    );

    if (!result.matchedCount) {
      return res.status(404).json({ error: "Not found" });
    }

    clearProductCache();
    return res.json({ success: true });
  } catch (error) {
    return res.status(500).json({ error: "Could not update product" });
  }
};

// Delete product
exports.deleteProduct = async (req, res) => {
  const id = Number(req.params.id);
  try {
    await getDb().collection("products").deleteOne({ id });
    clearProductCache();
    return res.json({ success: true });
  } catch (error) {
    return res.status(500).json({ error: "Could not delete product" });
  }
};
