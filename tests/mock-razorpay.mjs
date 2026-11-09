// Minimal stand-in for the Razorpay API, used only by the test suite. Never used in production.
import http from "http";
import crypto from "crypto";

export function startMockRazorpay({ port, keySecret, webhookSecret }) {
  const orders = new Map(), payments = new Map();
  let n = 0;
  const send = (res, code, obj) => { res.writeHead(code, { "content-type": "application/json", "access-control-allow-origin": "*" }); res.end(JSON.stringify(obj)); };
  const server = http.createServer(async (req, res) => {
    let body = "";
    for await (const c of req) body += c;
    const data = body ? JSON.parse(body) : {};
    const url = new URL(req.url, "http://x");
    if (req.method === "OPTIONS") return send(res, 204, {});
    if (req.method === "POST" && url.pathname === "/v1/orders") {
      const id = "order_T" + (++n).toString().padStart(6, "0");
      const o = { id, amount: data.amount, currency: "INR", status: "created", receipt: data.receipt, notes: data.notes };
      orders.set(id, o);
      return send(res, 200, o);
    }
    let m = url.pathname.match(/^\/v1\/payments\/([^/]+)$/);
    if (req.method === "GET" && m) {
      const p = payments.get(m[1]);
      return p ? send(res, 200, p) : send(res, 404, { error: { description: "not found" } });
    }
    m = url.pathname.match(/^\/v1\/payments\/([^/]+)\/capture$/);
    if (req.method === "POST" && m) {
      const p = payments.get(m[1]);
      if (!p) return send(res, 404, {});
      p.status = "captured";
      return send(res, 200, p);
    }
    // Test helper: simulate a customer paying an order. Returns what Checkout would hand to the page.
    if (url.pathname === "/__pay") {
      const orderId = data.order_id || url.searchParams.get("order_id");
      const o = orders.get(orderId);
      if (!o) return send(res, 404, { error: "no order" });
      const pid = "pay_T" + (++n).toString().padStart(6, "0");
      payments.set(pid, { id: pid, order_id: orderId, amount: data.amount ?? o.amount, currency: "INR", status: data.status || "captured", email: "buyer@example.com", contact: "+919999999999" });
      const sig = crypto.createHmac("sha256", keySecret).update(`${orderId}|${pid}`).digest("hex");
      return send(res, 200, { razorpay_order_id: orderId, razorpay_payment_id: pid, razorpay_signature: sig });
    }
    send(res, 404, { error: "unknown route" });
  });
  return new Promise((ok) => server.listen(port, "127.0.0.1", () => ok({
    server, orders, payments,
    webhookBody(event, orderId, paymentId, amountPaise) {
      const raw = JSON.stringify({ event, payload: { payment: { entity: { id: paymentId, order_id: orderId, amount: amountPaise, status: event === "payment.failed" ? "failed" : "captured" } } } });
      return { raw, sig: crypto.createHmac("sha256", webhookSecret).update(raw).digest("hex") };
    },
  })));
}
