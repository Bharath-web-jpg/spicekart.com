#!/usr/bin/env node
// Simple helper to generate bcrypt hash for admin password
// Usage: node scripts/hash-pass.js mypassword
// or run `npm run hash-pass -- mypassword`

const bcrypt = require("bcrypt");
const readline = require("readline");

function hashAndPrint(pw) {
  bcrypt
    .hash(pw, 10)
    .then((h) => {
      console.log("\nBCRYPT HASH:\n");
      console.log(h);
      console.log("\nCopy this value into your .env as ADMIN_PASS_HASH=\n");
      process.exit(0);
    })
    .catch((err) => {
      console.error("Error hashing password", err);
      process.exit(1);
    });
}

const arg = process.argv[2];
if (arg) {
  hashAndPrint(arg);
} else {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
  rl.question("Enter admin password to hash: ", (pw) => {
    rl.close();
    if (!pw) {
      console.error("Empty password");
      process.exit(2);
    }
    hashAndPrint(pw);
  });
}
