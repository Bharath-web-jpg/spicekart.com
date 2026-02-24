require("dotenv").config();
const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");
const path = require("path");
const session = require("express-session");
const mongoose = require("mongoose");
const { connectDB, isDbConnected } = require("./db");

const app = express();
const PORT = process.env.PORT || 4000;
const MONGO_URI = process.env.MONGO_URI;
const SESSION_SECRET = process.env.SESSION_SECRET || "spice-secret";

if (
  process.env.NODE_ENV === "production" &&
  SESSION_SECRET === "spice-secret"
) {
  console.error(
    "SESSION_SECRET is required in production and must not use the default value.",
  );
  process.exit(1);
}

app.use(cors());
app.use(bodyParser.json());
app.use(
  session({
    secret: SESSION_SECRET,
    resave: false,
    saveUninitialized: true,
    cookie: {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
    },
  }),
);

// Serve frontend static files
app.use(express.static(path.join(__dirname, "public")));

// API routes
const productsRouter = require("./routes/products");
const ordersRouter = require("./routes/orders");
const adminRouter = require("./routes/admin");

app.use("/api/products", productsRouter);
app.use("/api/orders", ordersRouter);
app.use("/admin", adminRouter);

app.get("/health", (req, res) => {
  res.status(200).json({
    status: "ok",
    db: isDbConnected() ? "connected" : "disconnected",
    mongoose:
      mongoose.connection.readyState === 1 ? "connected" : "disconnected",
    uptimeSeconds: Math.floor(process.uptime()),
    timestamp: new Date().toISOString(),
  });
});

app.get("/test-db", (req, res) => {
  if (mongoose.connection.readyState === 1) {
    return res.status(200).json({
      success: true,
      message: "Database connection is active",
    });
  }

  return res.status(503).json({
    success: false,
    message: "Database is not connected",
  });
});

// Fallback to index.html for SPA routes
app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

async function startServer() {
  async function connectMongoose() {
    if (!MONGO_URI) {
      console.warn("MONGO_URI is not set. Skipping mongoose connection.");
      return;
    }

    try {
      await mongoose.connect(MONGO_URI, {
        serverSelectionTimeoutMS: 5000,
      });
      console.log("MongoDB Connected Successfully");
    } catch (error) {
      console.error("Mongoose connection failed:", error.message);
    }
  }

  app.listen(PORT, async () => {
    console.log(`Server running on http://localhost:${PORT}`);
    try {
      await connectDB();
    } catch (error) {
      console.error(
        "MongoDB initialization error. Continuing without DB.",
        error,
      );
    }

    await connectMongoose();
  });
}

startServer();
