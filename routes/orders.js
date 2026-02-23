const express = require("express");
const router = express.Router();
const orderController = require("../controllers/orderController");

// POST /api/orders - place an order
router.post("/", orderController.placeOrder);

module.exports = router;
