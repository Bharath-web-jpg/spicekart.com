#!/usr/bin/env node
// Simple script to copy .env.example -> .env
// Usage: node scripts/setup-env.js [--force]

const fs = require("fs");
const path = require("path");

const src = path.join(__dirname, "..", ".env.example");
const dest = path.join(__dirname, "..", ".env");
const force = process.argv.includes("--force");

if (!fs.existsSync(src)) {
  console.error(".env.example not found");
  process.exit(2);
}

if (fs.existsSync(dest) && !force) {
  console.log(".env already exists. Use --force to overwrite.");
  process.exit(0);
}

fs.copyFileSync(src, dest);
console.log(".env created from .env.example");
console.log(
  "Edit .env and fill ADMIN_PASS_HASH (recommended) or ADMIN_PASS, then restart the server.",
);
