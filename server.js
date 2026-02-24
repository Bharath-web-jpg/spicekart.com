require("dotenv").config();
const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");
const path = require("path");
const session = require("express-session");
const { connectDB, isDbConnected } = require("./db");

const app = express();
const PORT = process.env.PORT || 4000;

app.use(cors());
app.use(bodyParser.json());
app.use(
  session({
    secret: process.env.SESSION_SECRET || "spice-secret",
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
    uptimeSeconds: Math.floor(process.uptime()),
    timestamp: new Date().toISOString(),
  });
});

// Fallback to index.html for SPA routes
app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

async function startServer() {
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
  });
}

startServer();
