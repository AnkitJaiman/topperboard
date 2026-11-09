"use client";

declare global { interface Window { Razorpay?: any } }

function loadCheckout(): Promise<void> {
  return new Promise((ok, no) => {
    if (window.Razorpay) return ok();
    const s = document.createElement("script");
    s.src = "https://checkout.razorpay.com/v1/checkout.js";
    s.onload = () => ok();
    s.onerror = () => { s.remove(); no(new Error("Could not load the payment window. Check your internet and try again.")); };
    document.head.appendChild(s);
  });
}

export type CheckoutResult =
  | { status: "paid"; listingId: number; rank: number }
  | { status: "pending" | "review"; message: string }
  | { status: "cancelled" | "failed"; message: string };

/** Create the order on our server, open Razorpay Checkout, then verify on our server. */
export async function payAndClaim(body: Record<string, unknown>): Promise<CheckoutResult> {
  const r = await fetch("/api/orders", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
  const o = await r.json().catch(() => ({}));
  if (!r.ok) {
    const e: any = new Error(o.error || "We couldn't start the payment. No money was taken.");
    e.listingId = o.listingId;
    throw e;
  }
  await loadCheckout();
  return new Promise((resolve) => {
    const rz = new window.Razorpay({
      key: o.keyId, order_id: o.orderId, amount: o.amount, currency: "INR",
      name: "Topper Board", description: o.description, theme: { color: "#111114" },
      handler: async (resp: any) => {
        try {
          const v = await fetch("/api/payments/verify", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(resp) });
          const j = await v.json().catch(() => ({}));
          if (v.ok && j.status === "paid") resolve({ status: "paid", listingId: j.listingId, rank: j.rank });
          else if (j.status === "failed") resolve({ status: "failed", message: j.message || "Payment failed. No money was taken." });
          else resolve({ status: j.status === "review" ? "review" : "pending", message: j.message || j.error || "Payment received. Your rank will update shortly." });
        } catch {
          resolve({ status: "pending", message: "Payment received. Your rank will update in a minute." });
        }
      },
      modal: { ondismiss: () => resolve({ status: "cancelled", message: "Payment cancelled. No money was taken." }) },
    });
    rz.on?.("payment.failed", (e: any) => resolve({ status: "failed", message: (e?.error?.description || "Payment failed") + ". No money was taken." }));
    rz.open();
  });
}
