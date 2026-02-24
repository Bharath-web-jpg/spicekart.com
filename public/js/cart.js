// cart page script
const FALLBACK_IMAGE = "/images/card.jpg";
let productsMapPromise = null;

function renderStatus(target, message, type = "info") {
  if (!target) return;
  target.innerHTML = `<div class="status ${type}">${message}</div>`;
}

function renderSpinner(target, text = "Loading...") {
  if (!target) return;
  target.innerHTML = `<div class="status loading"><span class="spinner" aria-hidden="true"></span><span>${text}</span></div>`;
}

async function fetchJson(url, options = {}) {
  const response = await fetch(url, options);
  let payload = null;
  try {
    payload = await response.json();
  } catch (error) {
    payload = null;
  }
  if (!response.ok) {
    throw new Error(payload?.error || `Request failed (${response.status})`);
  }
  return payload;
}

function resolveImageSrc(product) {
  if (!product || !product.image || !String(product.image).trim()) {
    return FALLBACK_IMAGE;
  }
  const img = String(product.image).trim();
  if (
    img.startsWith("http://") ||
    img.startsWith("https://") ||
    img.startsWith("/")
  ) {
    return img;
  }
  return `/${img.replace(/^\/+/, "")}`;
}

function getCart() {
  return JSON.parse(localStorage.getItem("spicekart_cart") || "[]");
}
function saveCart(c) {
  localStorage.setItem("spicekart_cart", JSON.stringify(c));
  renderCart();
}

async function fetchProductsMap() {
  if (!productsMapPromise) {
    productsMapPromise = fetchJson("/api/products")
      .then((list) =>
        (list || []).reduce((map, product) => {
          map[product.id] = product;
          return map;
        }, {}),
      )
      .catch((error) => {
        productsMapPromise = null;
        throw error;
      });
  }
  return productsMapPromise;
}

async function renderCart() {
  const container = document.getElementById("cartContainer");
  const summary = document.getElementById("cartSummary");
  const cart = getCart();
  renderSpinner(container, "Loading cart...");
  let products = {};
  try {
    products = await fetchProductsMap();
  } catch (error) {
    renderStatus(
      container,
      "Could not load cart products. Please refresh.",
      "error",
    );
    summary.innerHTML = "";
    return;
  }
  if (cart.length === 0) {
    renderStatus(container, "Your cart is empty", "empty");
    summary.innerHTML = "";
    return;
  }
  container.innerHTML = "";
  let total = 0;
  cart.forEach((item) => {
    const p = products[item.id];
    if (!p) {
      const row = document.createElement("div");
      row.className = "card";
      row.innerHTML = `<div class="body"><div class="title">Unknown product</div><div class="small">This product is no longer available.</div></div>`;
      container.appendChild(row);
      return;
    }
    const imgSrc = resolveImageSrc(p);
    const row = document.createElement("div");
    row.className = "card";
    row.style.display = "flex";
    row.style.justifyContent = "space-between";
    row.style.alignItems = "center";
    row.innerHTML = `
      <div style="display:flex;gap:1rem;align-items:center">
        <div style="width:120px;height:80px;overflow:hidden"><img src="${imgSrc}" style="width:100%;height:100%;object-fit:cover" loading="lazy" decoding="async" width="120" height="80" onerror="this.onerror=null;this.src='${FALLBACK_IMAGE}'"/></div>
        <div>
          <div class="title">${p.name}</div>
          <div class="small">₹${p.price}</div>
        </div>
      </div>
      <div style="display:flex;gap:.5rem;align-items:center">
        <button class="btn" data-id="${p.id}" data-act="dec"><i class="fa-solid fa-minus"></i></button>
        <div>${item.qty}</div>
        <button class="btn" data-id="${p.id}" data-act="inc"><i class="fa-solid fa-plus"></i></button>
        <button class="btn ghost" data-id="${p.id}" data-act="rem"><i class="fa-solid fa-trash icon"></i>Remove</button>
      </div>
    `;
    container.appendChild(row);
    total += p.price * item.qty;
  });
  summary.innerHTML = `<div class="card" style="padding:1rem;margin-top:1rem"><strong>Total: ₹${total}</strong> <a href="/checkout.html" class="btn"><i class="fa-solid fa-credit-card icon"></i>Checkout</a></div>`;

  // handlers
  container.querySelectorAll("button").forEach((b) => {
    b.addEventListener("click", () => {
      const id = Number(b.getAttribute("data-id"));
      const act = b.getAttribute("data-act");
      const c = getCart();
      const idx = c.findIndex((i) => i.id === id);
      if (act === "inc") {
        c[idx].qty += 1;
      } else if (act === "dec") {
        c[idx].qty = Math.max(1, c[idx].qty - 1);
      } else if (act === "rem") {
        c.splice(idx, 1);
      }
      saveCart(c);
    });
  });
}

document.addEventListener("DOMContentLoaded", () => {
  renderCart();
});
