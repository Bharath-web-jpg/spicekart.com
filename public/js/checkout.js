// checkout page script
function getCart() {
  return JSON.parse(localStorage.getItem("spicekart_cart") || "[]");
}
function clearCart() {
  localStorage.removeItem("spicekart_cart");
}

document.addEventListener("DOMContentLoaded", () => {
  document
    .getElementById("checkoutForm")
    .addEventListener("submit", async (e) => {
      e.preventDefault();
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
        document.getElementById("checkoutResult").innerText = "Cart is empty";
        return;
      }
      const order = { customer: payload, items };
      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(order),
      });
      const data = await res.json();
      if (data.success) {
        clearCart();
        document.getElementById("checkoutResult").innerHTML =
          `<div class="card"><h3>Order Confirmed</h3><p>Order ID: ${data.orderId}</p><a href="/" class="btn">Continue Shopping</a></div>`;
      } else {
        document.getElementById("checkoutResult").innerText =
          "Failed to place order";
      }
    });
});
