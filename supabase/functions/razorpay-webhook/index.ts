// TopperBoard: Razorpay webhook. Marks a listing as paid automatically.
// Secret needed (Supabase > Edge Functions > Secrets): RAZORPAY_WEBHOOK_SECRET
// IMPORTANT: turn OFF "Enforce JWT verification" for this function.
// Razorpay webhook URL: https://<project>.supabase.co/functions/v1/razorpay-webhook
// Events: order.paid

async function hmacHex(secret: string, body: string) {
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(body));
  return [...new Uint8Array(sig)].map((b) => b.toString(16).padStart(2, "0")).join("");
}
function safeEqual(a: string, b: string) {
  if (a.length !== b.length) return false;
  let r = 0;
  for (let i = 0; i < a.length; i++) r |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return r === 0;
}

async function handle(req: Request): Promise<Response> {
  if (req.method !== "POST") return new Response("Method not allowed", { status: 405 });

  const secret = Deno.env.get("RAZORPAY_WEBHOOK_SECRET");
  if (!secret) { console.error("RAZORPAY_WEBHOOK_SECRET missing"); return new Response("not configured", { status: 500 }); }
  const raw = await req.text();
  const given = req.headers.get("x-razorpay-signature") ?? "";
  if (!safeEqual(given, await hmacHex(secret, raw))) return new Response("Invalid signature", { status: 401 });

  const evt = JSON.parse(raw);
  if (evt.event !== "order.paid") return new Response("ignored", { status: 200 });

  const order = evt.payload?.order?.entity;
  const payment = evt.payload?.payment?.entity;
  if (!order?.id || order.status !== "paid") return new Response("no order", { status: 200 });

  const service = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const base = `${Deno.env.get("SUPABASE_URL")}/rest/v1/listings`;
  const headers = { apikey: service, Authorization: `Bearer ${service}`, "Content-Type": "application/json", Prefer: "return=representation" };
  const buyer = { payment_id: payment?.id ?? null, buyer_email: payment?.email ?? null, buyer_phone: payment?.contact ?? null };
  const paidRupees = Math.round(Number(order.amount_paid) / 100);

  // 1) Normal case: pending -> paid, only if the paid amount equals the bid.
  const q = `?order_id=eq.${encodeURIComponent(order.id)}&status=eq.pending&amount=eq.${paidRupees}`;
  const r = await fetch(base + q, { method: "PATCH", headers, body: JSON.stringify({ ...buyer, status: "paid", paid_at: new Date().toISOString() }) });
  if (!r.ok) { console.error("db", await r.text()); return new Response("db error", { status: 500 }); } // Razorpay retries
  if ((await r.json()).length) return new Response("ok", { status: 200 });

  // 2) Paid but amount didn't match: flag for the owner instead of failing silently.
  const r2 = await fetch(`${base}?order_id=eq.${encodeURIComponent(order.id)}&status=eq.pending`, {
    method: "PATCH", headers, body: JSON.stringify({ ...buyer, status: "review" }),
  });
  if (!r2.ok) { console.error("db", await r2.text()); return new Response("db error", { status: 500 }); }
  if ((await r2.json()).length) console.warn("amount mismatch, flagged for review", order.id, paidRupees);
  // else: already processed (duplicate delivery) or unknown order
  return new Response("ok", { status: 200 });
}

Deno.serve(async (req) => {
  try { return await handle(req); }
  catch (e) { console.error("unexpected", e); return new Response("error", { status: 500 }); }
});
