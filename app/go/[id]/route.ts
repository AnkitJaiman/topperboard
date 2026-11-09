import { q1, tx } from "@/lib/db";
import { clientIp, istDate, secret, sha256, toId } from "@/lib/util";

export const dynamic = "force-dynamic";

const BOT = /bot|crawl|spider|slurp|preview|facebookexternalhit|whatsapp|telegram|discord|curl|wget|python|headless/i;

/** Tracked outbound link: counts one click per anonymous visitor per listing per IST day, then redirects. */
export async function GET(req: Request, { params }: { params: { id: string } }) {
  const id = toId(params.id);
  const l = id ? await q1<{ url: string }>("select url from listings where id=$1 and status='active'", [id]) : null;
  // Relative redirect, so it works behind any proxy or domain.
  if (!l) return new Response(null, { status: 302, headers: { location: "/" } });

  const ua = req.headers.get("user-agent") || "";
  if (!BOT.test(ua)) {
    const day = istDate();
    // Salted daily hash: the raw IP is never stored, and hashes can't be linked across days.
    const visitor = sha256(`${secret()}|${day}|${clientIp(req.headers)}|${ua}`).slice(0, 32);
    try {
      await tx(async (c) => {
        const r = await c.query("insert into clicks (listing_id, visitor_hash, day) values ($1,$2,$3) on conflict do nothing", [id, visitor, day]);
        if (r.rowCount) await c.query("update listings set clicks_total = clicks_total + 1 where id=$1", [id]);
      });
    } catch (e) { console.error("click", e); }
  }
  return new Response(null, { status: 302, headers: { location: l.url, "cache-control": "no-store", "referrer-policy": "origin" } });
}
