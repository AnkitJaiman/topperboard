import { hmacHex, safeEqual } from "./util";

const API = () => process.env.RAZORPAY_API_BASE || "https://api.razorpay.com/v1";
const keyId = () => need("RAZORPAY_KEY_ID");
const keySecret = () => need("RAZORPAY_KEY_SECRET");

function need(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`${name} is not set`);
  return v;
}

export const razorpayConfigured = () => !!(process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET);
export const publicKeyId = () => process.env.RAZORPAY_KEY_ID || "";

async function call<T>(method: string, path: string, body?: unknown): Promise<T> {
  const res = await fetch(API() + path, {
    method,
    headers: { "content-type": "application/json", authorization: "Basic " + Buffer.from(`${keyId()}:${keySecret()}`).toString("base64") },
    body: body ? JSON.stringify(body) : undefined,
    signal: AbortSignal.timeout(15000),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(`razorpay ${method} ${path} ${res.status}: ${JSON.stringify(data).slice(0, 300)}`);
  return data as T;
}

export type RzOrder = { id: string; amount: number; currency: string; status: string };
export type RzPayment = { id: string; order_id: string; amount: number; currency: string; status: string; email?: string; contact?: string };

export const createOrder = (amountRupees: number, receipt: string, notes: Record<string, string>) =>
  call<RzOrder>("POST", "/orders", { amount: amountRupees * 100, currency: "INR", receipt, notes });

export const fetchPayment = (paymentId: string) => call<RzPayment>("GET", `/payments/${encodeURIComponent(paymentId)}`);

export const capturePayment = (paymentId: string, amountPaise: number) =>
  call<RzPayment>("POST", `/payments/${encodeURIComponent(paymentId)}/capture`, { amount: amountPaise, currency: "INR" });

/** Signature sent back by Checkout: HMAC_SHA256(order_id + "|" + payment_id, key_secret). */
export function checkoutSignatureValid(orderId: string, paymentId: string, signature: string): boolean {
  return safeEqual(hmacHex(keySecret(), `${orderId}|${paymentId}`), String(signature || ""));
}

/** Webhook signature: HMAC_SHA256(raw body, webhook secret). */
export function webhookSignatureValid(rawBody: string, signature: string | null): boolean {
  const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
  if (!secret || !signature) return false;
  return safeEqual(hmacHex(secret, rawBody), signature);
}
