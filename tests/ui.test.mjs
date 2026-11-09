// Browser tests (Playwright/Chromium): full claim flow with a stubbed Razorpay Checkout, dropdown, mobile layout.
import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { spawn } from "child_process";
import fs from "fs";
import pg from "pg";
import { createRequire } from "module";
// Playwright is preinstalled globally in CI/dev machines; set NODE_PATH to its folder if needed.
const { chromium } = createRequire(import.meta.url)("playwright");
import { startMockRazorpay } from "./mock-razorpay.mjs";

const PG = process.env.TEST_PG || "postgresql://postgres@127.0.0.1:5433";
const DB = "tb_ui", PORT = 3101, MOCK = 4011;
const BASE = `http://127.0.0.1:${PORT}`;
const KEY_SECRET = "ui_key_secret_123";
const SHOTS = process.env.SHOTS_DIR;
let app, mock, browser, db;

// Stand-in for checkout.razorpay.com: "pays" through the mock and hands the result to the page's handler.
const STUB = `window.Razorpay=function(o){this.o=o;this.on=function(){}};
window.Razorpay.prototype.open=function(){var o=this.o;fetch("http://127.0.0.1:${MOCK}/__pay",{method:"POST",body:JSON.stringify({order_id:o.order_id})}).then(function(r){return r.json()}).then(function(p){o.handler(p)})};`;

before(async () => {
  const a = new pg.Client({ connectionString: `${PG}/postgres` });
  await a.connect(); await a.query(`drop database if exists ${DB} with (force)`); await a.query(`create database ${DB}`); await a.end();
  db = new pg.Client({ connectionString: `${PG}/${DB}` }); await db.connect();
  await db.query(fs.readFileSync(new URL("../db/schema.sql", import.meta.url), "utf8"));
  mock = await startMockRazorpay({ port: MOCK, keySecret: KEY_SECRET, webhookSecret: "x" });
  app = spawn(process.execPath, ["node_modules/next/dist/bin/next", "start", "-p", String(PORT), "-H", "127.0.0.1"], {
    cwd: new URL("..", import.meta.url).pathname, stdio: "ignore",
    env: { ...process.env, NODE_ENV: "production", DATABASE_URL: `${PG}/${DB}`, RAZORPAY_KEY_ID: "rzp_test_mock", RAZORPAY_KEY_SECRET: KEY_SECRET,
      RAZORPAY_WEBHOOK_SECRET: "x", RAZORPAY_API_BASE: `http://127.0.0.1:${MOCK}/v1`, ADMIN_PASSWORD: "admin-pass-123", APP_SECRET: "ui-app-secret-0123456789", NEXT_TELEMETRY_DISABLED: "1" },
  });
  for (let i = 0; i < 60; i++) { try { if ((await fetch(BASE + "/about")).ok) break; } catch {} await new Promise((r) => setTimeout(r, 500)); }
  browser = await chromium.launch();
});
after(async () => { await browser?.close(); app?.kill(); mock?.server.close(); await db?.end(); });

async function page(width = 1280, height = 900, dark = false) {
  const ctx = await browser.newContext({ viewport: { width, height }, colorScheme: dark ? "dark" : "light" });
  const p = await ctx.newPage();
  p.errors = [];
  p.on("pageerror", (e) => p.errors.push(e.message));
  p.on("console", (m) => m.type() === "error" && !/favicon|Failed to load resource/.test(m.text()) && p.errors.push(m.text()));
  await p.route("https://checkout.razorpay.com/**", (r) => r.fulfill({ contentType: "application/javascript", body: STUB }));
  await p.route(/example\.(in|com)/, (r) => r.fulfill({ status: 404, body: "" }));
  return p;
}

test("Dropdown lists all 30 categories in order, keyboard works", async () => {
  const p = await page();
  await p.goto(BASE + "/");
  await p.click(".claim .dd > button");
  const opts = await p.$$eval(".claim .dd li", (els) => els.map((e) => e.textContent.trim()));
  assert.equal(opts.length, 30);
  assert.match(opts[0], /AI Agents & Infrastructure$/);
  assert.match(opts[29], /Other$/);
  await p.keyboard.press("ArrowDown"); await p.keyboard.press("Enter");
  assert.match(await p.textContent(".claim .dd > button"), /SEO & AI Visibility/);
  assert.deepEqual(p.errors, []);
  await p.context().close();
});

test("Claim flow: link → category → bid → pay → verified → listed", async () => {
  const p = await page(390, 844);
  await p.goto(BASE + "/");
  assert.match(await p.textContent("h1"), /Claim #1/);
  assert.equal(await p.inputValue('input[aria-label="Bid amount in rupees"]'), "99");
  await p.fill('#claim-url', "mytool.example.in");
  await p.click(".claim .dd > button");
  await p.click('.claim .dd li:has-text("Developer Tools")');
  await p.click('button[aria-label^="Increase by"]');
  assert.equal(await p.inputValue('input[aria-label="Bid amount in rupees"]'), "109");
  await p.waitForFunction(() => /Claim #1 in Developer Tools/.test(document.querySelector(".claim h1").textContent));
  if (SHOTS) await p.screenshot({ path: `${SHOTS}/ui_claim_mobile.png`, fullPage: true });
  await p.click(".claim .btn.gold");
  await p.waitForURL(/\/l\/\d+\?new=1/, { timeout: 15000 });
  assert.match(await p.textContent("body"), /Payment verified/);
  assert.match(await p.textContent("h1"), /mytool\.example\.in/);
  const r = await db.query("select total_amount::int t, category from listings");
  assert.deepEqual(r.rows[0], { t: 109, category: "Developer Tools" });
  assert.deepEqual(p.errors, []);
  await p.context().close();
});

test("Increase bid from the listing page charges only the extra", async () => {
  const p = await page();
  const id = (await db.query("select id from listings limit 1")).rows[0].id;
  await p.goto(`${BASE}/l/${id}`);
  await p.click('.bidbox button[aria-label^="Increase by"]');
  await p.click('.bidbox .btn.gold');
  await p.waitForSelector(".okmsg", { timeout: 15000 });
  assert.match(await p.textContent(".okmsg"), /You're now #1/);
  const r = await db.query("select total_amount::int t from listings where id=$1", [id]);
  assert.equal(r.rows[0].t, 129);
  const pays = await db.query("select amount from payments where listing_id=$1 and status='paid' order by id", [id]);
  assert.deepEqual(pays.rows.map((x) => x.amount), [109, 20]);
  await p.context().close();
});

test("No horizontal scroll and no errors at every screen size, light and dark", async () => {
  for (let i = 0; i < 12; i++) await db.query(`select 1`); // keep connection warm
  // Stress data: long names, many listings.
  for (let i = 0; i < 25; i++) {
    await db.query(`insert into listings (url,url_key,domain,title,description,category,total_amount,last_bid_at,first_paid_at)
      values ($1,$2,$3,$4,$5,$6,$7,now(),now())`, [`https://s${i}.example.com`, `s${i}.example.com`, `s${i}.example.com`,
      i % 3 ? `Listing ${i}` : "A really long listing name that goes on and on", i % 2 ? "Short pitch" : "A much longer description that should be cut neatly with an ellipsis on small screens",
      ["Developer Tools", "Crypto, Web3 & Investing", "Leaderboards & Attention Markets"][i % 3], 100000 - i * 997]);
  }
  for (const dark of [false, true]) {
    for (const w of [320, 375, 390, 430, 768, 1024, 1280, 1440, 1920]) {
      const p = await page(w, 900, dark);
      for (const path of ["/", "/leaderboards", "/categories", "/daily", "/c/crypto-web3-and-investing", "/faq", "/terms"]) {
        await p.goto(BASE + path);
        const sw = await p.evaluate(() => document.documentElement.scrollWidth);
        const culprits = sw > w ? await p.evaluate((w) => [...document.querySelectorAll("body *")]
          .filter((e) => e.getBoundingClientRect().right > w + 0.5 && !e.closest(".nav,.tscroll,.pills"))
          .slice(0, 5).map((e) => `${e.tagName}.${e.className}`), w) : [];
        assert.ok(sw <= w, `${path} overflows at ${w}px (${sw}px)${dark ? " dark" : ""}: ${culprits.join(", ")}`);
      }
      if (SHOTS && (w === 390 || w === 1280)) {
        await p.goto(BASE + "/");
        await p.screenshot({ path: `${SHOTS}/ui_home_${w}${dark ? "_dark" : ""}.png`, fullPage: false });
      }
      assert.deepEqual(p.errors, [], `errors at ${w}`);
      await p.context().close();
    }
  }
});

test("Today tab and category filter on the board", async () => {
  const p = await page();
  await p.goto(BASE + "/leaderboards");
  await p.click('button.tab:has-text("Today")');
  await p.waitForFunction(() => document.querySelectorAll(".board .item").length === 1);
  await p.click('button.tab:has-text("All-time")');
  await p.click(".tabs .dd > button");
  await p.click('.tabs .dd li:has-text("Crypto, Web3 & Investing")');
  await p.waitForFunction(() => [...document.querySelectorAll(".board .chip")].every((c) => c.textContent.includes("Crypto")) && document.querySelectorAll(".board .item").length > 0);
  await p.context().close();
});
