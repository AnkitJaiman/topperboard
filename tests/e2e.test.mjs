// End-to-end tests: real Next.js server + real PostgreSQL + mock Razorpay. No real payments.
// Needs a Postgres you can create databases on: TEST_PG=postgresql://postgres@127.0.0.1:5433 npm test
import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { spawn } from "child_process";
import fs from "fs";
import pg from "pg";
import { startMockRazorpay } from "./mock-razorpay.mjs";

const PG = process.env.TEST_PG || "postgresql://postgres@127.0.0.1:5433";
const DB = "tb_e2e";
const PORT = 3100, MOCK = 4010;
const BASE = `http://127.0.0.1:${PORT}`;
const KEY_SECRET = "test_key_secret_123", WEBHOOK_SECRET = "test_webhook_secret_123", ADMIN_PASSWORD = "admin-pass-123";
let app, mock, db, ipN = 0;

const ip = () => `10.9.${Math.floor(++ipN / 250)}.${ipN % 250}`;
async function api(path, { method = "GET", body, headers = {}, raw } = {}) {
  const res = await fetch(BASE + path, {
    method, redirect: "manual",
    headers: { "content-type": "application/json", "x-forwarded-for": ip(), ...headers },
    body: raw ?? (body ? JSON.stringify(body) : undefined),
  });
  const text = await res.text();
  let json; try { json = JSON.parse(text); } catch { json = null; }
  return { status: res.status, json, text, headers: res.headers };
}
const order = (body, headers) => api("/api/orders", { method: "POST", body, headers });
async function payOrder(orderId, opts = {}) {
  const r = await fetch(`http://127.0.0.1:${MOCK}/__pay`, { method: "POST", body: JSON.stringify({ order_id: orderId, ...opts }) });
  return r.json();
}
async function buy(body) {
  const o = await order(body);
  assert.equal(o.status, 200, o.text);
  const p = await payOrder(o.json.orderId);
  const v = await api("/api/payments/verify", { method: "POST", body: p });
  return { o, p, v };
}
const board = async (q = "view=all") => (await api(`/api/board?${q}`)).json.rows;
let urlN = 0;
const newSite = (amount, category = "Developer Tools", extra = {}) => ({ url: `https://site${++urlN}.example.in`, category, amount, title: `Site ${urlN}`, ...extra });

before(async () => {
  const admin = new pg.Client({ connectionString: `${PG}/postgres` });
  await admin.connect();
  await admin.query(`drop database if exists ${DB} with (force)`);
  await admin.query(`create database ${DB}`);
  await admin.end();
  db = new pg.Client({ connectionString: `${PG}/${DB}` });
  await db.connect();
  await db.query(fs.readFileSync(new URL("../db/schema.sql", import.meta.url), "utf8"));

  mock = await startMockRazorpay({ port: MOCK, keySecret: KEY_SECRET, webhookSecret: WEBHOOK_SECRET });
  app = spawn(process.execPath, ["node_modules/next/dist/bin/next", "start", "-p", String(PORT), "-H", "127.0.0.1"], {
    cwd: new URL("..", import.meta.url).pathname, stdio: ["ignore", "pipe", "pipe"],
    env: { ...process.env, NODE_ENV: "production", DATABASE_URL: `${PG}/${DB}`, RAZORPAY_KEY_ID: "rzp_test_mock", RAZORPAY_KEY_SECRET: KEY_SECRET,
      RAZORPAY_WEBHOOK_SECRET: WEBHOOK_SECRET, RAZORPAY_API_BASE: `http://127.0.0.1:${MOCK}/v1`, ADMIN_PASSWORD, APP_SECRET: "test-app-secret-0123456789", NEXT_TELEMETRY_DISABLED: "1" },
  });
  app.stderr.on("data", (d) => process.env.DEBUG && process.stderr.write(d));
  for (let i = 0; i < 60; i++) {
    try { if ((await fetch(BASE + "/api/quote?amount=0&category=Other")).ok) return; } catch {}
    await new Promise((r) => setTimeout(r, 500));
  }
  throw new Error("app did not start");
});
after(async () => { app?.kill(); mock?.server.close(); await db?.end(); });

test("1-4: new listing, category, minimum bid, payment → appears on the board", async () => {
  const { v, o } = await buy(newSite(99, "AI Agents & Infrastructure"));
  assert.equal(o.json.amount, 9900);
  assert.equal(v.status, 200, v.text);
  assert.equal(v.json.status, "paid");
  const rows = await board();
  assert.equal(rows.length, 1);
  assert.equal(rows[0].category, "AI Agents & Infrastructure");
  assert.equal(rows[0].amount, 99);
});

test("5-7: higher bid ranks above; a bid below #1 gets the right position", async () => {
  await db.query("truncate listings, payments, activity, clicks, webhook_events restart identity cascade");
  const a = await buy(newSite(5000)); const b = await buy(newSite(3000)); const c = await buy(newSite(1000));
  assert.deepEqual([a.v.json.rank, b.v.json.rank, c.v.json.rank], [1, 2, 3]);
  const d = await buy(newSite(2000));
  assert.equal(d.v.json.rank, 3, "₹2,000 lands between ₹3,000 and ₹1,000");
  const rows = await board();
  assert.deepEqual(rows.map((r) => r.amount), [5000, 3000, 2000, 1000]);
});

test("Claim #1 price = top total + increment (₹5,010)", async () => {
  const q = (await api("/api/quote?amount=0&category=Other")).json;
  assert.equal(q.claimOne, 5010);
  const q2 = (await api("/api/quote?amount=5010&category=Other")).json;
  assert.equal(q2.rank, 1);
  const q3 = (await api("/api/quote?amount=5000&category=Other")).json;
  assert.equal(q3.rank, 2, "equal amount loses the tie to the earlier listing");
});

test("8-9: existing listing increases bid and pays only the extra amount", async () => {
  const rows = await board();
  const second = rows[1]; // ₹3,000
  const q = (await api(`/api/quote?amount=0&listingId=${second.id}`)).json;
  assert.equal(q.claimOne, 2010, "only the difference to take #1 is needed");
  const o = await order({ listingId: second.id, amount: 2010 });
  assert.equal(o.status, 200, o.text);
  assert.equal(o.json.amount, 201000, "Razorpay order is for the extra ₹2,010 only");
  const p = await payOrder(o.json.orderId);
  const v = await api("/api/payments/verify", { method: "POST", body: p });
  assert.equal(v.json.rank, 1);
  const after = await board();
  assert.equal(after[0].id, second.id);
  assert.equal(after[0].amount, 5010);
  const act = await db.query("select type from activity where listing_id=$1 order by id", [second.id]);
  assert.ok(act.rows.some((r) => r.type === "new_number_one"));
  const tooSmall = await order({ listingId: second.id, amount: 5 });
  assert.equal(tooSmall.status, 400);
});

test("10: simultaneous payments are applied atomically", async () => {
  const orders = await Promise.all([700, 700, 700, 701, 702].map((amt) => order(newSite(amt, "Analytics"))));
  const pays = await Promise.all(orders.map((o) => payOrder(o.json.orderId)));
  const res = await Promise.all(pays.map((p) => api("/api/payments/verify", { method: "POST", body: p })));
  assert.ok(res.every((r) => r.json.status === "paid"));
  const cat = await board("view=all&category=analytics");
  assert.equal(cat.length, 5);
  assert.deepEqual(cat.map((r) => r.rank), [1, 2, 3, 4, 5]);
  // The same payment verified 10 times at once still counts once.
  const site = newSite(150, "Analytics");
  const o = await order(site);
  const p = await payOrder(o.json.orderId);
  await Promise.all(Array.from({ length: 10 }, () => api("/api/payments/verify", { method: "POST", body: p })));
  const paid = await db.query("select count(*)::int n from payments where razorpay_order_id=$1 and status='paid'", [o.json.orderId]);
  const l = await db.query("select total_amount::int t from listings where url_key=$1", [new URL(site.url).hostname]);
  assert.equal(paid.rows[0].n, 1);
  assert.equal(l.rows[0].t, 150);
});

test("11: equal bids → the earlier payment ranks higher", async () => {
  const first = await buy(newSite(777, "Design & Creative"));
  const second = await buy(newSite(777, "Design & Creative"));
  const rows = await board("view=all&category=design-and-creative");
  assert.equal(rows[0].id, first.v.json.listingId);
  assert.equal(rows[1].id, second.v.json.listingId);
});

test("12: failed payment → no listing, payment marked failed", async () => {
  const o = await order(newSite(500, "Other"));
  const p = await payOrder(o.json.orderId, { status: "failed" });
  const v = await api("/api/payments/verify", { method: "POST", body: p });
  assert.equal(v.json.status, "pending");
  const wb = mock.webhookBody("payment.failed", o.json.orderId, p.razorpay_payment_id, 50000);
  const w = await api("/api/webhooks/razorpay", { method: "POST", raw: wb.raw, headers: { "x-razorpay-signature": wb.sig, "x-razorpay-event-id": "evt_fail_1" } });
  assert.equal(w.text, "failed");
  const s = await db.query("select status from payments where razorpay_order_id=$1", [o.json.orderId]);
  assert.equal(s.rows[0].status, "failed");
  assert.equal((await board("view=all&category=other")).length, 0);
});

test("13: webhook received twice (and after checkout verify) is applied once", async () => {
  const o = await order(newSite(321, "Media & News"));
  const p = await payOrder(o.json.orderId);
  const wb = mock.webhookBody("payment.captured", o.json.orderId, p.razorpay_payment_id, 32100);
  const h = { "x-razorpay-signature": wb.sig, "x-razorpay-event-id": "evt_dup_1" };
  const w1 = await api("/api/webhooks/razorpay", { method: "POST", raw: wb.raw, headers: h });
  const w2 = await api("/api/webhooks/razorpay", { method: "POST", raw: wb.raw, headers: h });
  assert.equal(w1.text, "applied"); assert.equal(w2.text, "duplicate");
  const v = await api("/api/payments/verify", { method: "POST", body: p });
  assert.equal(v.json.status, "paid");
  const rows = await board("view=all&category=media-and-news");
  assert.equal(rows.length, 1); assert.equal(rows[0].amount, 321);
  const bad = await api("/api/webhooks/razorpay", { method: "POST", raw: wb.raw, headers: { "x-razorpay-signature": "nope" } });
  assert.equal(bad.status, 401);
});

test("Forged checkout signature and wrong amount are rejected", async () => {
  const o = await order(newSite(250, "Writing & Content"));
  const p = await payOrder(o.json.orderId);
  const forged = await api("/api/payments/verify", { method: "POST", body: { ...p, razorpay_signature: "0".repeat(64) } });
  assert.equal(forged.status, 400);
  const o2 = await order(newSite(250, "Writing & Content"));
  const p2 = await payOrder(o2.json.orderId, { amount: 100 }); // paid ₹1 instead of ₹250
  const v2 = await api("/api/payments/verify", { method: "POST", body: p2 });
  assert.equal(v2.json.status, "review");
  assert.equal((await board("view=all&category=writing-and-content")).length, 0);
});

test("Server-side validation: minimum, whole rupees, maximum, URL, category, blocked words, duplicates", async () => {
  assert.equal((await order(newSite(98))).status, 400);
  assert.equal((await order(newSite(150.5))).status, 400);
  assert.equal((await order(newSite(100001))).status, 400);
  assert.equal((await order({ ...newSite(200), url: "javascript:alert(1)" })).status, 400);
  assert.equal((await order({ ...newSite(200), url: "http://127.0.0.1/admin" })).status, 400);
  assert.equal((await order({ ...newSite(200), url: "http://localhost:3000" })).status, 400);
  assert.equal((await order({ ...newSite(200), category: "Gambling" })).status, 400);
  assert.equal((await order({ ...newSite(200), title: "Best online casino" })).status, 400);
  const existing = (await board())[0];
  const dup = await order({ url: existing.url, category: "Other", amount: 200 });
  assert.equal(dup.status, 409);
  assert.ok(dup.json.listingId);
  assert.equal((await api("/api/meta", { method: "POST", body: { url: "http://localhost" } })).status, 400);
});

test("14-15: Today resets at midnight IST; past days stay in the archive", async () => {
  const r = await buy(newSite(1234, "Travel, Local & Lifestyle"));
  // Move that payment to yesterday (IST).
  await db.query(`update payments set paid_at = now() - interval '1 day' where razorpay_order_id=$1`, [r.o.json.orderId]);
  const today = await board("view=today&category=travel-local-and-lifestyle");
  assert.equal(today.length, 0, "yesterday's payment is not on today's board");
  const y = (await db.query(`select to_char(((now() - interval '1 day') at time zone 'Asia/Kolkata')::date,'YYYY-MM-DD') d`)).rows[0].d;
  const past = await board(`view=${y}&category=travel-local-and-lifestyle`);
  assert.equal(past.length, 1); assert.equal(past[0].amount, 1234);
  const all = await board("view=all&category=travel-local-and-lifestyle");
  assert.equal(all[0].amount, 1234, "all-time still counts it");
  // Today's board counts only today's top-up, not the old total.
  const o = await order({ listingId: r.v.json.listingId, amount: 50 });
  const p = await payOrder(o.json.orderId);
  await api("/api/payments/verify", { method: "POST", body: p });
  const t2 = await board("view=today&category=travel-local-and-lifestyle");
  assert.equal(t2[0].amount, 50);
});

test("16: category filters", async () => {
  const dev = await board("view=all&category=developer-tools");
  assert.ok(dev.length > 0 && dev.every((r) => r.category === "Developer Tools"));
  assert.deepEqual(dev.map((r) => r.rank), dev.map((_, i) => i + 1));
  assert.equal((await api("/api/board?category=not-a-category")).status, 400);
});

test("17: click tracking counts unique visitors per day and ignores bots", async () => {
  const id = (await board())[0].id;
  const h1 = { "x-forwarded-for": "1.2.3.4", "user-agent": "Mozilla/5.0 Test" };
  const r1 = await api(`/go/${id}`, { headers: h1 });
  assert.equal(r1.status, 302);
  assert.match(r1.headers.get("location"), /^https:\/\//);
  await api(`/go/${id}`, { headers: h1 });
  await api(`/go/${id}`, { headers: { "x-forwarded-for": "5.6.7.8", "user-agent": "Mozilla/5.0 Test" } });
  await api(`/go/${id}`, { headers: { "x-forwarded-for": "9.9.9.9", "user-agent": "Googlebot/2.1" } });
  const c = await db.query("select clicks_total from listings where id=$1", [id]);
  assert.equal(c.rows[0].clicks_total, 2);
  const stored = await db.query("select visitor_hash from clicks where listing_id=$1", [id]);
  assert.ok(stored.rows.every((r) => !r.visitor_hash.includes("1.2.3.4")));
  assert.equal((await api(`/go/999999`)).status, 302);
});

test("18: admin login, settings, remove listing, and access control", async () => {
  const origin = { origin: BASE };
  const form = (o) => new URLSearchParams(o).toString();
  const noAuth = await api("/api/admin/listings", { method: "POST", raw: form({ id: 1, action: "remove" }), headers: { ...origin, "content-type": "application/x-www-form-urlencoded" } });
  assert.equal(noAuth.status, 403);
  const wrong = await api("/api/admin/login", { method: "POST", raw: form({ password: "nope" }), headers: { ...origin, "content-type": "application/x-www-form-urlencoded" } });
  assert.match(wrong.headers.get("location"), /e=wrong/);
  const ok = await api("/api/admin/login", { method: "POST", raw: form({ password: ADMIN_PASSWORD }), headers: { ...origin, "content-type": "application/x-www-form-urlencoded" } });
  const cookie = ok.headers.get("set-cookie").split(";")[0];
  assert.match(cookie, /^tb_admin=/);
  const page = await api("/admin", { headers: { cookie } });
  assert.equal(page.status, 200);
  assert.match(page.text, /Total revenue/);
  const blocked = await api("/admin");
  assert.equal(blocked.status, 307);
  const s = await api("/api/admin/settings", { method: "POST", raw: form({ min_bid: 199, min_increment: 20, max_payment: 100000 }), headers: { ...origin, cookie, "content-type": "application/x-www-form-urlencoded" } });
  assert.equal(s.status, 303);
  assert.equal((await order(newSite(150))).status, 400, "new minimum ₹199 is enforced");
  const q = (await api("/api/quote?amount=0&category=Other")).json;
  assert.equal(q.settings.min_increment, 20);
  await api("/api/admin/settings", { method: "POST", raw: form({ min_bid: 99, min_increment: 10, max_payment: 100000 }), headers: { ...origin, cookie, "content-type": "application/x-www-form-urlencoded" } });
  const victim = (await board())[0].id;
  const csrf = await api("/api/admin/listings", { method: "POST", raw: form({ id: victim, action: "remove" }), headers: { origin: "https://evil.example", cookie, "content-type": "application/x-www-form-urlencoded" } });
  assert.equal(csrf.status, 403, "cross-site form posts are refused");
  const rm = await api("/api/admin/listings", { method: "POST", raw: form({ id: victim, action: "remove" }), headers: { ...origin, cookie, "content-type": "application/x-www-form-urlencoded" } });
  assert.equal(rm.status, 303);
  assert.ok(!(await board()).some((r) => r.id === victim));
  const edit = await api("/api/admin/listings", { method: "POST", raw: form({ id: victim, action: "restore" }), headers: { ...origin, cookie, "content-type": "application/x-www-form-urlencoded" } });
  assert.equal(edit.status, 303);
  assert.ok((await board()).some((r) => r.id === victim));
});

test("Rate limiting on order creation", async () => {
  const h = { "x-forwarded-for": "77.77.77.77" };
  const codes = [];
  for (let i = 0; i < 12; i++) codes.push((await order(newSite(100, "Other"), h)).status);
  assert.ok(codes.slice(0, 10).every((c) => c === 200));
  assert.equal(codes[11], 429);
});

test("All public pages render", async () => {
  const id = (await board())[0].id;
  for (const p of ["/", "/leaderboards", "/categories", "/c/developer-tools", "/daily", `/l/${id}`, "/about", "/rules", "/faq", "/terms", "/privacy", "/refunds", "/contact", "/admin/login"]) {
    const r = await api(p);
    assert.equal(r.status, 200, p);
  }
  assert.equal((await api("/c/not-real")).status, 404);
  assert.equal((await api("/l/999999")).status, 404);
  const cats = await api("/categories");
  assert.equal((cats.text.match(/href="\/c\//g) || []).length, 30);
});
