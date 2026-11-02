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

Deno.serve(async (req) => {
  if (req.method !== "POST") return new Response("Method not allowed", { status: 405 });

  const raw = await req.text();
  const given = req.headers.get("x-razorpay-signature") ?? "";
  const expected = await hmacHex(Deno.env.get("RAZORPAY_WEBHOOK_SECRET")!, raw);
  if (!safeEqual(given, expected)) return new Response("Invalid signature", { status: 401 });

  const evt = JSON.parse(raw);
  if (evt.event !== "order.paid") return new Response("ignored", { status: 200 });

  const order = evt.payload?.order?.entity;
  const payment = evt.payload?.payment?.entity;
  if (!order?.id || order.status !== "paid") return new Response("no order", { status: 200 });

  const base = `${Deno.env.get("SUPABASE_URL")}/rest/v1/listings`;
  const headers = {
    apikey: Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    Authorization: `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`,
    "Content-Type": "application/json",
    Prefer: "return=representation",
  };

  // Only flip pending -> paid, and only if the paid amount matches the bid (in paise).
  const q = `?order_id=eq.${encodeURIComponent(order.id)}&status=eq.pending&amount=eq.${Math.round(order.amount_paid / 100)}`;
  const r = await fetch(base + q, {
    method: "PATCH",
    headers,
    body: JSON.stringify({ status: "paid", paid_at: new Date().toISOString(), payment_id: payment?.id ?? null }),
  });
  if (!r.ok) { console.error("db", await r.text()); return new Response("db error", { status: 500 }); } // Razorpay retries
  const rows = await r.json();
  if (!rows.length) console.warn("no pending listing matched", order.id, order.amount_paid);
  return new Response("ok", { status: 200 });
});
