import { q1 } from "@/lib/db";
import { applyPayment } from "@/lib/payments";
import { capturePayment, checkoutSignatureValid, fetchPayment } from "@/lib/razorpay";
import { bad, json, rateLimit } from "@/lib/util";

export const dynamic = "force-dynamic";

/**
 * Called by the browser after Razorpay Checkout succeeds.
 * We never trust the browser: verify the signature, then confirm the payment with Razorpay's API.
 */
export async function POST(req: Request) {
  if (!(await rateLimit(req.headers, "verify", 30))) return bad("Too many attempts", 429);
  let b: any;
  try { b = await req.json(); } catch { return bad("Invalid request"); }
  const orderId = String(b?.razorpay_order_id || ""), paymentId = String(b?.razorpay_payment_id || ""), sig = String(b?.razorpay_signature || "");
  if (!orderId || !paymentId || !sig) return bad("Missing payment details");
  if (!checkoutSignatureValid(orderId, paymentId, sig)) return bad("Payment signature is invalid", 400);

  const pay = await q1<{ amount: number; status: string }>("select amount, status from payments where razorpay_order_id=$1", [orderId]);
  if (!pay) return bad("Unknown order", 404);

  let p = await fetchPayment(paymentId);
  if (p.order_id !== orderId) return bad("Payment does not belong to this order", 400);
  if (p.status === "authorized") p = await capturePayment(paymentId, pay.amount * 100);
  if (p.status === "failed") return json({ status: "failed", message: "Payment failed. No money was taken." }, 402);
  if (p.status !== "captured") return json({ status: "pending", message: "Payment is still processing. Your rank will update as soon as it is confirmed." }, 202);

  const r = await applyPayment(orderId, paymentId, p.amount);
  if (r.result === "applied" || r.result === "already") return json({ status: "paid", listingId: r.listing_id, rank: r.rank });
  return json({ status: "review", message: "Payment received. We're checking it and will update your listing shortly." }, 202);
}
