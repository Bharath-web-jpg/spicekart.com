// product detail page script
const FALLBACK_IMAGE = "/images/card.jpg";

function renderSpinner(target, text = "Loading...") {
  if (!target) return;
  target.innerHTML = `<div class="status loading"><span class="spinner" aria-hidden="true"></span><span>${text}</span></div>`;
}

async function fetchJson(url, options = {}) {
  const res = await fetch(url, options);
  let body = null;
  try {
    body = await res.json();
  } catch (error) {
    body = null;
  }
  if (!res.ok) {
    throw new Error(body?.error || "Product not found");
  }
  return body;
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

async function fetchProduct(id) {
  return fetchJson(`/api/products/${id}`);
}

function getCart() {
  return JSON.parse(localStorage.getItem("spicekart_cart") || "[]");
}
function saveCart(cart) {
  localStorage.setItem("spicekart_cart", JSON.stringify(cart));
  const el = document.getElementById("cartCount");
  if (el) el.innerText = cart.reduce((s, i) => s + i.qty, 0);
}

function addToCart(id) {
  const cart = getCart();
  const item = cart.find((i) => i.id === id);
  if (item) item.qty += 1;
  else cart.push({ id, qty: 1 });
  saveCart(cart);
  alert("Added to cart");
}

document.addEventListener("DOMContentLoaded", async () => {
  const detailEl = document.getElementById("productDetail");
  renderSpinner(detailEl, "Loading product...");

  const params = new URLSearchParams(window.location.search);
  const id = params.get("id");
  if (!id) {
    detailEl.innerText = "No product selected";
    return;
  }
  try {
    const p = await fetchProduct(id);
    const imgSrc = resolveImageSrc(p);
    const el = detailEl;
    el.innerHTML = `
      <div class="card product-card">
        <div class="media"><img src="${imgSrc}" alt="${p.name}" loading="lazy" decoding="async" width="720" height="720" onerror="this.onerror=null;this.src='${FALLBACK_IMAGE}'"/></div>
        <div class="body">
          <h2 class="title">${p.name}</h2>
          <div class="price">₹${p.price}</div>
          <p class="desc">${p.description || ""}</p>
          <div style="margin-top:1rem"><button class="btn" id="addBtn"><i class="fa-solid fa-cart-plus icon"></i>Add to Cart</button> <a href="/checkout.html" class="btn ghost"><i class="fa-solid fa-bolt icon"></i>Buy Now</a></div>
        </div>
      </div>
    `;
    document
      .getElementById("addBtn")
      .addEventListener("click", () => addToCart(Number(id)));
    const cart = getCart();
    saveCart(cart);
  } catch (e) {
    detailEl.innerText = e.message || "Product not found";
  }
});
