// checkout page script
function getCart() {
  return JSON.parse(localStorage.getItem("spicekart_cart") || "[]");
}
function clearCart() {
  localStorage.removeItem("spicekart_cart");
}

function renderStatus(target, message, type = "info") {
  if (!target) return;
  target.innerHTML = `<div class="status ${type}">${message}</div>`;
}

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
    throw new Error(body?.error || `Request failed (${res.status})`);
  }
  return body;
}

document.addEventListener("DOMContentLoaded", () => {
  document
    .getElementById("checkoutForm")
    .addEventListener("submit", async (e) => {
      e.preventDefault();
      const resultEl = document.getElementById("checkoutResult");
      const fd = new FormData(e.target);
      const payload = {
        name: fd.get("name"),
        phone: fd.get("phone"),
        pincode: fd.get("pincode"),
        address: fd.get("address"),
        payment: fd.get("payment"),
      };
      const items = getCart();
      if (items.length === 0) {
        renderStatus(resultEl, "Cart is empty", "empty");
        return;
      }
      const order = { customer: payload, items };
      try {
        renderSpinner(resultEl, "Placing your order...");
        const data = await fetchJson("/api/orders", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(order),
        });
        if (data.success) {
          clearCart();
          resultEl.innerHTML = `<div class="card"><h3>Order Confirmed</h3><p>Order ID: ${data.orderId}</p><a href="/" class="btn">Continue Shopping</a></div>`;
        } else {
          renderStatus(resultEl, "Failed to place order", "error");
        }
      } catch (error) {
        renderStatus(
          resultEl,
          error.message || "Failed to place order",
          "error",
        );
      }
    });
});
