import { q, q1 } from "./db";

export type ApplyResult = { result: string; listing_id?: number; rank?: number; total?: number };

/** Apply a verified, captured payment. Idempotent: safe to call from both checkout and webhook. */
export async function applyPayment(orderId: string, paymentId: string, amountPaise: number): Promise<ApplyResult> {
  const r = await q1<{ r: ApplyResult }>("select apply_payment($1,$2,$3) as r", [orderId, paymentId, amountPaise]);
  return r!.r;
}

export async function markFailed(orderId: string, reason: string) {
  await q(`update payments set status='failed', note=$2 where razorpay_order_id=$1 and status='created'`, [orderId, reason.slice(0, 200)]);
}
