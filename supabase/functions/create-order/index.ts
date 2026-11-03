// TopperBoard: creates a Razorpay order and a pending listing.
// Secrets needed (Supabase > Edge Functions > Secrets):
//   RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET
// SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are provided automatically.
// Turn OFF "Enforce JWT verification" for this function (it validates input itself;
// new Supabase publishable keys are not JWTs).

const CATS = ["influencer", "creator", "gaming", "startup", "d2c", "music", "college", "coaching", "teacher", "fitness", "food", "local"];
const MIN = 99, MAX = 100_000;

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, apikey, content-type, x-client-info",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, "Content-Type": "application/json" } });

async function handle(req: Request): Promise<Response> {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  let d: Record<string, unknown>;
  try { d = await req.json(); } catch { return json({ error: "Invalid request" }, 400); }

  const category = String(d.category ?? "");
  const name = String(d.name ?? "").trim().replace(/\s+/g, " ");
  const url = String(d.url ?? "").trim();
  const tagline = String(d.tagline ?? "").trim().replace(/\s+/g, " ");
  const amount = Number(d.amount);

  if (!CATS.includes(category)) return json({ error: "Please choose a valid category" }, 400);
  if (name.length < 1 || name.length > 40) return json({ error: "Name must be 1–40 characters" }, 400);
  if (!/^https?:\/\/[^\s/$.?#][^\s]*\.[^\s]+$/i.test(url) || url.length > 300) return json({ error: "Please enter a valid web link (max 300 characters)" }, 400);
  if (tagline.length > 80) return json({ error: "Description must be 80 characters or less" }, 400);
  if (!Number.isInteger(amount) || amount < MIN) return json({ error: `Minimum bid is ₹${MIN}` }, 400);
  if (amount > MAX) return json({ error: `Maximum bid is ₹${MAX.toLocaleString("en-IN")}` }, 400);

  const keyId = Deno.env.get("RAZORPAY_KEY_ID");
  const keySecret = Deno.env.get("RAZORPAY_KEY_SECRET");
  if (!keyId || !keySecret) { console.error("Razorpay secrets missing"); return json({ error: "Payments are not set up yet" }, 503); }
  const ref = "TB" + crypto.randomUUID().replace(/-/g, "").slice(0, 10).toUpperCase();

  // 1) Razorpay order (amount in paise)
  const rz = await fetch("https://api.razorpay.com/v1/orders", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: "Basic " + btoa(`${keyId}:${keySecret}`) },
    body: JSON.stringify({ amount: amount * 100, currency: "INR", receipt: ref, notes: { ref, category, name } }),
  });
  const order = await rz.json().catch(() => ({}));
  if (!rz.ok || !order.id) { console.error("razorpay", rz.status, order); return json({ error: "Payment service unavailable, try again" }, 502); }

  // 2) Pending listing, linked to the order
  const service = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const sb = await fetch(`${Deno.env.get("SUPABASE_URL")}/rest/v1/listings`, {
    method: "POST",
    headers: { apikey: service, Authorization: `Bearer ${service}`, "Content-Type": "application/json", Prefer: "return=minimal" },
    body: JSON.stringify({ category, name, url, tagline: tagline || null, amount, ref, order_id: order.id, status: "pending" }),
  });
  if (!sb.ok) { console.error("db", await sb.text()); return json({ error: "Could not save listing, try again" }, 500); }

  return json({ order_id: order.id, amount: order.amount, ref });
}

Deno.serve(async (req) => {
  try { return await handle(req); }
  catch (e) { console.error("unexpected", e); return json({ error: "Something went wrong, try again" }, 500); }
});
