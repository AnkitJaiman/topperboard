import crypto from "crypto";
import { q1 } from "./db";

export const inr = (n: number | string) => "₹" + Number(n).toLocaleString("en-IN");

/** Today's date in India (YYYY-MM-DD). Daily boards reset at midnight IST. */
export function istDate(d = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata", year: "numeric", month: "2-digit", day: "2-digit" }).format(d);
}

export function timeAgo(iso: string | Date | null): string {
  if (!iso) return "";
  const s = Math.max(0, (Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return "just now";
  const m = s / 60, h = m / 60, d = h / 24;
  if (m < 60) return `${Math.floor(m)}m ago`;
  if (h < 24) return `${Math.floor(h)}h ago`;
  if (d < 30) return `${Math.floor(d)}d ago`;
  return new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric", timeZone: "Asia/Kolkata" });
}

export function secret(): string {
  const s = process.env.APP_SECRET;
  if (!s || s.length < 16) throw new Error("APP_SECRET must be set (16+ characters)");
  return s;
}

export const sha256 = (s: string) => crypto.createHash("sha256").update(s).digest("hex");
export const hmacHex = (key: string, data: string) => crypto.createHmac("sha256", key).update(data).digest("hex");

export function safeEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a), bb = Buffer.from(b);
  return ab.length === bb.length && crypto.timingSafeEqual(ab, bb);
}

/**
 * Client IP for rate limits and anonymous counting. Prefers headers set by the hosting platform
 * (Vercel: x-vercel-forwarded-for / x-real-ip). With a generic proxy the RIGHT-most X-Forwarded-For
 * entry is the one added by our own proxy, so a client can't spoof it by sending its own header.
 */
export function clientIp(h: Headers): string {
  const platform = h.get("x-vercel-forwarded-for") || h.get("x-real-ip");
  if (platform) return platform.split(",")[0].trim().slice(0, 64);
  const xff = (h.get("x-forwarded-for") || "").split(",").map((s) => s.trim()).filter(Boolean);
  return (xff[xff.length - 1] || "unknown").slice(0, 64);
}

/** Positive database id or null (guards against huge / non-numeric ids). */
export function toId(v: unknown): number | null {
  const n = typeof v === "number" ? v : typeof v === "string" && /^\d{1,12}$/.test(v) ? Number(v) : NaN;
  return Number.isSafeInteger(n) && n > 0 && n < 2 ** 53 ? n : null;
}

/** A real calendar date in YYYY-MM-DD form, or null (rejects 2026-02-31). */
export function realDate(s: unknown): string | null {
  if (typeof s !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(s)) return null;
  const d = new Date(s + "T00:00:00Z");
  return !isNaN(d.getTime()) && d.toISOString().slice(0, 10) === s ? s : null;
}

/** Returns true if allowed. Fixed-window limit stored in Postgres (works on serverless). */
export async function rateLimit(h: Headers, bucket: string, max: number, windowSeconds = 60): Promise<boolean> {
  const key = bucket + ":" + sha256(secret() + clientIp(h)).slice(0, 24);
  const r = await q1<{ ok: boolean }>("select rate_hit($1,$2,$3) as ok", [key, windowSeconds, max]);
  return !!r?.ok;
}

export function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: { "content-type": "application/json", "cache-control": "no-store" } });
}
export const bad = (error: string, status = 400) => json({ error }, status);
