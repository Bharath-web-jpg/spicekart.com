const express = require("express");
const router = express.Router();
const productController = require("../controllers/productController");

// GET /api/products - list products (supports optional ?q= and ?category= and ?min/&max=)
router.get("/", productController.listProducts);
router.get("/:id", productController.getProduct);

// Admin protection middleware
function requireAdmin(req, res, next) {
  if (!req.session || !req.session.isAdmin)
    return res.status(403).json({ error: "Unauthorized" });
  next();
}

// POST /api/products - add product (admin)
router.post("/", requireAdmin, productController.addProduct);

// Update and delete
router.put("/:id", requireAdmin, productController.updateProduct);
router.delete("/:id", requireAdmin, productController.deleteProduct);

module.exports = router;
