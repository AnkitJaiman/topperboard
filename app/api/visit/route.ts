import { q } from "@/lib/db";
import { clientIp, istDate, secret, sha256 } from "@/lib/util";

export const dynamic = "force-dynamic";
const BOT = /bot|crawl|spider|slurp|preview|facebookexternalhit|whatsapp|telegram|discord|curl|wget|python|headless/i;

/** Counts one anonymous visitor per IST day. Called once per browser session by the page. */
export async function POST(req: Request) {
  const ua = req.headers.get("user-agent") || "";
  if (!BOT.test(ua)) {
    const day = istDate();
    const visitor = sha256(`visit|${secret()}|${day}|${clientIp(req.headers)}|${ua}`).slice(0, 32);
    try { await q("insert into visits (visitor_hash, day) values ($1,$2) on conflict do nothing", [visitor, day]); }
    catch (e) { console.error("visit", e); }
  }
  return new Response(null, { status: 204, headers: { "cache-control": "no-store" } });
}
