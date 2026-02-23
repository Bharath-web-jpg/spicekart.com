// SpiceKart frontend script
// Handles product display, cart, search/filter and checkout (mock)

const api = {
  products: "/api/products",
  orders: "/api/orders",
};

let products = [];

const FALLBACK_IMAGE = "/images/card.jpg";

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

// Simple cart stored in localStorage
function getCart() {
  return JSON.parse(localStorage.getItem("spicekart_cart") || "[]");
}
function saveCart(cart) {
  localStorage.setItem("spicekart_cart", JSON.stringify(cart));
  updateCartCount();
}
function updateCartCount() {
  const count = getCart().reduce((s, i) => s + i.qty, 0);
  document.getElementById("cartCount").innerText = count;
}

async function fetchProducts() {
  const el = document.getElementById("productList");
  if (el) el.innerHTML = `<div class="small">Loading products…</div>`;
  const res = await fetch(api.products);
  products = await res.json();
  renderProducts(products);
}

function renderProducts(list) {
  const el = document.getElementById("productList");
  el.innerHTML = "";
  list.forEach((p) => {
    const card = document.createElement("div");
    card.className = "card";
    const imgSrc = resolveImageSrc(p);
    card.innerHTML = `
      <div class="media"><img src="${imgSrc}" alt="${p.name}" loading="lazy" decoding="async" width="480" height="320" onerror="this.onerror=null;this.src='${FALLBACK_IMAGE}'"/></div>
      <div class="body">
        <div class="title">${p.name}</div>
        <div class="desc">${p.description || ""}</div>
        <div class="meta">
          <div class="price">₹${p.price}</div>
          <div class="actions">
            <button class="btn add" data-id="${p.id}"><i class="fa-solid fa-cart-plus icon"></i>Add to cart</button>
            <button class="btn ghost details" data-id="${p.id}"><i class="fa-solid fa-circle-info icon"></i>Details</button>
          </div>
        </div>
      </div>
    `;
    card
      .querySelector("button.add")
      .addEventListener("click", () => addToCart(p.id));
    // navigate to product detail page
    card.querySelector("button.details").addEventListener("click", () => {
      window.location.href = `/product.html?id=${p.id}`;
    });
    el.appendChild(card);
  });
}

function addToCart(id) {
  const cart = getCart();
  const item = cart.find((i) => i.id === id);
  if (item) item.qty += 1;
  else cart.push({ id, qty: 1 });
  saveCart(cart);
}

function openCart() {
  const modal = document.getElementById("cartModal");
  modal.style.display = "flex";
  renderCartItems();
}
function closeCart() {
  document.getElementById("cartModal").style.display = "none";
}

function renderCartItems() {
  const container = document.getElementById("cartItems");
  const cart = getCart();
  if (cart.length === 0) {
    container.innerHTML = "<p>Your cart is empty</p>";
    document.getElementById("cartTotal").innerText = "0";
    return;
  }
  container.innerHTML = "";
  let total = 0;
  cart.forEach((ci) => {
    const p = products.find((x) => x.id === ci.id);
    if (!p) {
      return;
    }
    const row = document.createElement("div");
    row.className = "cart-row";
    row.innerHTML = `<div>${p.name} x ${ci.qty}</div><div>₹${ci.qty * p.price} <button data-id="${p.id}" class="remove btn ghost"><i class="fa-solid fa-trash icon"></i>Remove</button></div>`;
    container.appendChild(row);
    total += p.price * ci.qty;
  });
  document.getElementById("cartTotal").innerText = total;
  // attach remove handlers
  container.querySelectorAll("button.remove").forEach((btn) => {
    btn.addEventListener("click", () => {
      const id = Number(btn.getAttribute("data-id"));
      const c = getCart().filter((i) => i.id !== id);
      saveCart(c);
      renderCartItems();
    });
  });
}

function openCheckout() {
  document.getElementById("checkoutModal").style.display = "flex";
}
function closeCheckout() {
  document.getElementById("checkoutModal").style.display = "none";
}

async function placeOrder(formData) {
  const cart = getCart();
  if (cart.length === 0) return alert("Cart is empty");
  const order = { customer: formData, items: cart };
  const res = await fetch(api.orders, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(order),
  });
  const data = await res.json();
  if (data.success) {
    localStorage.removeItem("spicekart_cart");
    updateCartCount();
    document.getElementById("checkoutMessage").innerText =
      "Order placed successfully. Order ID: " + data.orderId;
    renderCartItems();
  } else {
    document.getElementById("checkoutMessage").innerText =
      "Failed to place order";
  }
}

// Search and filter
function setupFilters() {
  const search = document.getElementById("search");
  const cat = document.getElementById("categoryFilter");
  function apply() {
    const q = search.value.toLowerCase();
    const c = cat.value;
    const filtered = products.filter((p) => {
      const matchesQ =
        p.name.toLowerCase().includes(q) ||
        (p.description || "").toLowerCase().includes(q);
      const matchesC = c ? p.category === c : true;
      return matchesQ && matchesC;
    });
    renderProducts(filtered);
  }
  search.addEventListener("input", apply);
  cat.addEventListener("change", apply);
}

// Wire up UI
document.addEventListener("DOMContentLoaded", async () => {
  await fetchProducts();
  setupFilters();
  updateCartCount();

  // wire cart and admin/login buttons (some may be anchors)
  const cartBtn =
    document.getElementById("cartBtn") || document.getElementById("cartLink");
  if (cartBtn) cartBtn.addEventListener("click", openCart);
  document.getElementById("closeCart").addEventListener("click", closeCart);
  document.getElementById("checkoutBtn").addEventListener("click", () => {
    closeCart();
    openCheckout();
  });
  document
    .getElementById("closeCheckout")
    .addEventListener("click", closeCheckout);

  document
    .getElementById("checkoutForm")
    .addEventListener("submit", async (e) => {
      e.preventDefault();
      const fd = new FormData(e.target);
      const payload = {
        name: fd.get("name"),
        address: fd.get("address"),
        phone: fd.get("phone"),
      };
      await placeOrder(payload);
      e.target.reset();
    });

  const adminBtn = document.getElementById("adminBtn");
  if (adminBtn)
    adminBtn.addEventListener("click", () => {
      window.location.href = "/admin.html";
    });
  const loginLink = document.getElementById("loginLink");
  if (loginLink)
    loginLink.addEventListener("click", (e) => {
      // allow default navigation to /login.html
    });
  // Make category filter options dynamic based on loaded products
  const catSel = document.getElementById("categoryFilter");
  const categories = Array.from(
    new Set(products.map((p) => p.category)),
  ).filter(Boolean);
  categories.forEach((c) => {
    const opt = document.createElement("option");
    opt.value = c;
    opt.innerText = c;
    catSel.appendChild(opt);
  });
  // Wire category sidebar clicks if present
  const catList = document.querySelectorAll(".category-card li");
  if (catList && catList.length) {
    catList.forEach((li) =>
      li.addEventListener("click", (e) => {
        const cat = li.getAttribute("data-cat") || "";
        // set select and trigger filter
        if (catSel) catSel.value = cat;
        const input = document.getElementById("search");
        const q = input ? input.value.toLowerCase() : "";
        const filtered = products.filter((p) => {
          const matchesQ =
            p.name.toLowerCase().includes(q) ||
            (p.description || "").toLowerCase().includes(q);
          const matchesC = cat ? p.category === cat : true;
          return matchesQ && matchesC;
        });
        renderProducts(filtered);
      }),
    );
  }
});
