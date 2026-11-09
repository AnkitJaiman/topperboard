import { q1 } from "@/lib/db";
import { getSettings } from "@/lib/settings";
import { isCategory } from "@/lib/categories";
import { blockedText, cleanUrl } from "@/lib/url";
import { createOrder, publicKeyId, razorpayConfigured } from "@/lib/razorpay";
import { bad, json, rateLimit, toId } from "@/lib/util";
import { quote } from "@/lib/board";
import crypto from "crypto";

export const dynamic = "force-dynamic";

const str = (v: unknown, max: number) => (typeof v === "string" ? v.replace(/\s+/g, " ").trim().slice(0, max) : "");

/** Create a Razorpay order for a new listing or a bid increase. Nothing is ranked until payment is verified. */
export async function POST(req: Request) {
  if (!razorpayConfigured()) return bad("Payments are not switched on yet. Please try again soon.", 503);
  if (!(await rateLimit(req.headers, "order", 10))) return bad("Too many attempts. Please wait a minute.", 429);

  let b: any;
  try { b = await req.json(); } catch { return bad("Invalid request"); }
  const s = await getSettings();
  const amount = Number(b?.amount);
  if (!Number.isInteger(amount)) return bad("Bid must be a whole number of rupees");
  if (amount > s.max_payment) return bad(`Maximum single payment is ₹${s.max_payment.toLocaleString("en-IN")}`);

  const receipt = "tb_" + crypto.randomBytes(8).toString("hex");
  let row: { id: number } | null;
  let notes: Record<string, string>;

  if (b?.listingId) {
    // Increase an existing listing's bid: charge only the extra amount.
    const listingId = toId(b.listingId);
    if (!listingId) return bad("Listing not found", 404);
    const l = await q1<{ id: number; title: string; category: string }>(
      "select id, title, category from listings where id=$1 and status='active'", [listingId]);
    if (!l) return bad("Listing not found", 404);
    if (amount < s.min_increment) return bad(`Minimum increase is ₹${s.min_increment}`);
    const order = await createOrder(amount, receipt, { kind: "topup", listing_id: String(l.id) });
    row = await q1("insert into payments (kind, listing_id, amount, razorpay_order_id) values ('topup',$1,$2,$3) returning id",
      [l.id, amount, order.id]);
    notes = { title: l.title };
    const qt = await quote(amount, l.category, l.id);
    return json({ orderId: order.id, amount: order.amount, keyId: publicKeyId(), description: `Increase bid · ${l.title}`, rank: qt.rank, paymentRef: row?.id, ...notes });
  }

  // New listing.
  if (amount < s.min_bid) return bad(`Minimum bid is ₹${s.min_bid}`);
  const u = cleanUrl(b?.url);
  if (!u) return bad("Please enter a valid public website link (https://…)");
  const category = b?.category;
  if (!isCategory(category)) return bad("Please choose a category");
  const title = str(b?.title, 60) || u.domain;
  const description = str(b?.description, 140);
  const hit = blockedText(u.url, title, description);
  if (hit) return bad("This website or text isn't allowed on Topper Board.");
  const favicon = typeof b?.favicon === "string" && /^https?:\/\/\S+$/i.test(b.favicon) && b.favicon.length < 400 ? b.favicon : null;

  const dupe = await q1<{ id: number }>("select id from listings where url_key=$1 and status='active'", [u.urlKey]);
  if (dupe) return json({ error: "This website is already listed. Increase its bid instead.", listingId: dupe.id }, 409);

  const order = await createOrder(amount, receipt, { kind: "new", domain: u.domain });
  const draft = { url: u.url, url_key: u.urlKey, domain: u.domain, title, description, favicon_url: favicon, category };
  row = await q1("insert into payments (kind, draft, amount, razorpay_order_id) values ('new',$1,$2,$3) returning id",
    [JSON.stringify(draft), amount, order.id]);
  const qt = await quote(amount, category);
  return json({ orderId: order.id, amount: order.amount, keyId: publicKeyId(), description: `Listing · ${title}`, rank: qt.rank, paymentRef: row?.id });
}
