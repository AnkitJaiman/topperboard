// TopperBoard: creates a Razorpay order and a pending listing.
// Secrets needed (Supabase > Edge Functions > Secrets):
//   RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET
// SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are provided automatically.

const CATS = ["influencer", "creator", "coaching", "teacher", "startup", "fitness", "food", "clinic", "local"];
const MIN = 99, MAX = 10_000_000;

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, apikey, content-type, x-client-info",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, "Content-Type": "application/json" } });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  let d: Record<string, unknown>;
  try { d = await req.json(); } catch { return json({ error: "Invalid request" }, 400); }

  const category = String(d.category ?? "");
  const name = String(d.name ?? "").trim();
  const url = String(d.url ?? "").trim();
  const tagline = String(d.tagline ?? "").trim();
  const amount = Number(d.amount);

  if (!CATS.includes(category)) return json({ error: "Invalid category" }, 400);
  if (name.length < 1 || name.length > 40) return json({ error: "Name must be 1-40 characters" }, 400);
  if (!/^https?:\/\/\S+\.\S+$/i.test(url) || url.length > 300) return json({ error: "Invalid link" }, 400);
  if (tagline.length > 80) return json({ error: "Description too long" }, 400);
  if (!Number.isInteger(amount) || amount < MIN || amount > MAX) return json({ error: `Bid must be ₹${MIN} or more` }, 400);

  const keyId = Deno.env.get("RAZORPAY_KEY_ID")!;
  const keySecret = Deno.env.get("RAZORPAY_KEY_SECRET")!;
  const ref = "TB" + crypto.randomUUID().replace(/-/g, "").slice(0, 10).toUpperCase();

  // 1) Razorpay order (amount in paise)
  const rz = await fetch("https://api.razorpay.com/v1/orders", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: "Basic " + btoa(`${keyId}:${keySecret}`) },
    body: JSON.stringify({ amount: amount * 100, currency: "INR", receipt: ref, notes: { ref, category, name } }),
  });
  const order = await rz.json();
  if (!rz.ok) { console.error("razorpay", order); return json({ error: "Payment service unavailable, try again" }, 502); }

  // 2) Pending listing, linked to the order
  const sb = await fetch(`${Deno.env.get("SUPABASE_URL")}/rest/v1/listings`, {
    method: "POST",
    headers: {
      apikey: Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      Authorization: `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`,
      "Content-Type": "application/json",
      Prefer: "return=minimal",
    },
    body: JSON.stringify({ category, name, url, tagline: tagline || null, amount, ref, order_id: order.id, status: "pending" }),
  });
  if (!sb.ok) { console.error("db", await sb.text()); return json({ error: "Could not save listing" }, 500); }

  return json({ order_id: order.id, amount: order.amount, ref });
});
