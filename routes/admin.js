const express = require("express");
const router = express.Router();
const multer = require("multer");
const path = require("path");
const rateLimit = require("express-rate-limit");

const uploadDir = path.join(__dirname, "..", "public", "assets");
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const safe =
      Date.now() + "-" + file.originalname.replace(/[^a-z0-9\.\-]/gi, "_");
    cb(null, safe);
  },
});
// Accept only jpg/png and limit size to 2MB
const upload = multer({
  storage,
  limits: { fileSize: 2 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const ok = /image\/(jpeg|jpg|png)/.test(file.mimetype);
    if (!ok) return cb(new Error("Only jpg/png images allowed"), false);
    cb(null, true);
  },
});

// Rate limiter for login: max 5 attempts per 15 minutes per IP
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many login attempts, please try again later" },
});

// Simple admin login (password stored in env ADMIN_PASS)
const bcrypt = require("bcrypt");

router.post("/login", loginLimiter, async (req, res) => {
  const { password } = req.body;
  if (!password) return res.status(400).json({ error: "Password required" });
  const hash = process.env.ADMIN_PASS_HASH;
  const plain = process.env.ADMIN_PASS;
  try {
    if (hash) {
      const ok = await bcrypt.compare(password, hash);
      if (ok) {
        req.session.isAdmin = true;
        return res.json({ success: true });
      }
    } else if (plain) {
      if (password === plain) {
        req.session.isAdmin = true;
        return res.json({ success: true });
      }
    }
    if (!hash && !plain) {
      return res
        .status(500)
        .json({ error: "Admin password is not configured" });
    }
    return res.status(403).json({ error: "Invalid password" });
  } catch (e) {
    return res.status(500).json({ error: "Login error" });
  }
});

router.post("/logout", (req, res) => {
  req.session.isAdmin = false;
  res.json({ success: true });
});

// upload image endpoint
router.post("/upload", upload.single("image"), (req, res) => {
  if (!req.session.isAdmin)
    return res.status(403).json({ error: "Unauthorized" });
  if (!req.file) return res.status(400).json({ error: "No file uploaded" });
  const url = "/assets/" + req.file.filename;
  res.json({ success: true, url });
});

module.exports = router;
