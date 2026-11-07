import { q1 } from "@/lib/db";
import { cleanUrl, fetchMeta } from "@/lib/url";
import { bad, json, rateLimit } from "@/lib/util";

export const dynamic = "force-dynamic";

/** Fetch title / description / favicon for a URL so the user can review them before paying. */
export async function POST(req: Request) {
  if (!(await rateLimit(req.headers, "meta", 20))) return bad("Too many lookups. Please wait a minute.", 429);
  let b: any;
  try { b = await req.json(); } catch { return bad("Invalid request"); }
  const u = cleanUrl(b?.url);
  if (!u) return bad("Please enter a valid public website link");
  const existing = await q1<{ id: number; title: string }>("select id, title from listings where url_key=$1 and status='active'", [u.urlKey]);
  const meta = await fetchMeta(u.url);
  return json({ url: u.url, domain: u.domain, title: meta.title || u.domain, description: meta.description, favicon: meta.favicon, existing });
}
