# SpiceKart — Spice Shopping Website (Improved)

SpiceKart is a compact, production-style spice shopping website built with Node.js and Express on the backend and a responsive vanilla HTML/CSS/JS frontend. Data is persisted in MongoDB.

Features

- Modern, responsive UI with product cards and images
- Search and filter by category/price
- Add to cart, view/remove items, and checkout (mock)
- Admin page to add products (image URL supported)
- REST APIs: `GET /api/products`, `POST /api/products`, `POST /api/orders`

Getting started

1. Install dependencies

```bash
cd c:/Users/acer/demo
npm install
```

2. Start server

```bash
npm start
```

3. Open http://localhost:4000 in your browser

Project structure

- `public/` — frontend assets (HTML/CSS/JS)
- `data/` — seed JSON files used for initial product import
- `routes/` — Express route definitions
- `controllers/` — route handlers, business logic
- `db.js` — MongoDB connection and initial seeding logic
- `server.js` — app entrypoint

Notes

- This project uses MongoDB for product and order persistence.
- Product images are served from local files in `public/images` (plus optional admin uploads in `public/assets`).

## Admin password setup

For security, set an admin password via an environment variable. Recommended approach is to store a bcrypt hash in `ADMIN_PASS_HASH`.

1. Generate a bcrypt hash locally (example):

```bash
# using the helper script
npm run hash-pass -- my-secret-password
# or
node scripts/hash-pass.js my-secret-password
```

The command will print a bcrypt hash. Copy that value into a `.env` file in the project root:

```
ADMIN_PASS_HASH=$2b$10$...yourhash...
SESSION_SECRET=change_this_session_secret
MONGODB_URI=mongodb://127.0.0.1:27017
MONGODB_DB_NAME=spicekart
PORT=4000
```

2. Alternatively, for quick local testing you may set `ADMIN_PASS` (plain password) in `.env`, but it's less secure.

3. Restart the server. Admin login will validate against `ADMIN_PASS_HASH` (bcrypt) first, then `ADMIN_PASS` if a hash is not provided.

Note: `.env.example` has the suggested keys; copy it to `.env` and fill values.

## Rate limiting and security

- The `/admin/login` endpoint is protected with rate-limiting (5 attempts per 15 minutes per IP). This mitigates brute-force attacks.
- Sessions use `httpOnly` and `sameSite=lax`. In production, set `NODE_ENV=production` and a strong `SESSION_SECRET` so cookies are marked `secure`.

## Setup helper scripts

- Generate bcrypt hash for admin password:

```bash
npm run hash-pass -- my-secret-password
```

- Create `.env` from `.env.example` (won't overwrite unless `--force`):

```bash
npm run setup-env
# or to overwrite
npm run setup-env -- --force
```

After running the above:

1. Open `.env` and paste the `ADMIN_PASS_HASH` value into it.
2. Set `SESSION_SECRET` to a strong random string.
3. Set `MONGODB_URI` and `MONGODB_DB_NAME`.
4. Start the server: `npm start`.

## Testing the rate-limiter

1. Try logging in with an invalid password repeatedly (more than 5 times within 15 minutes) — you'll receive a rate-limit error.

## Deploy to Render (public live URL)

1. Ensure `.env` contains at least:

```env
NODE_ENV=production
SESSION_SECRET=your_long_random_secret
ADMIN_PASS_HASH=your_bcrypt_hash
MONGODB_URI=your_mongodb_connection_string
MONGODB_DB_NAME=spicekart
PORT=4000
```

Note: Render injects `PORT` automatically in production; keep app code using `process.env.PORT`.

2. Initialize git locally (if needed) and commit:

```bash
git init
git add .
git commit -m "Prepare SpiceKart for production deployment"
```

3. Create a GitHub repo and push:

```bash
git branch -M main
git remote add origin https://github.com/<your-username>/<your-repo>.git
git push -u origin main
```

4. On Render:

- New + → Web Service
- Connect your GitHub repository
- Runtime: Node
- Build Command: `npm install`
- Start Command: `node server.js`
- Add environment variables:
  - `NODE_ENV=production`
  - `SESSION_SECRET=...`
  - `ADMIN_PASS_HASH=...` (or `ADMIN_PASS` for quick testing)
  - `MONGODB_URI=...`
  - `MONGODB_DB_NAME=spicekart`

5. Deploy and open the generated URL:

- Example format: `https://your-project-name.onrender.com`

6. Verify image paths after deploy:

- Home/products should load from `/images/...`
- Admin uploaded files should load from `/assets/...`

If any image is broken, confirm the product record has an image path beginning with `/images/` or `/assets/`.
