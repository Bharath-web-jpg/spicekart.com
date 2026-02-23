const express = require("express");
const router = express.Router();
const orderController = require("../controllers/orderController");

function requireAdmin(req, res, next) {
  if (!req.session || !req.session.isAdmin)
    return res.status(403).json({ error: "Unauthorized" });
  next();
}

// GET /api/orders - list orders (admin only)
router.get("/", requireAdmin, orderController.listOrders);

// POST /api/orders - place an order
router.post("/", orderController.placeOrder);

module.exports = router;
