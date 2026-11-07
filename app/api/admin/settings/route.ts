import { isAdmin, sameOrigin } from "@/lib/admin";
import { q } from "@/lib/db";

export const dynamic = "force-dynamic";

const LIMITS: Record<string, [number, number]> = {
  min_bid: [1, 100000],
  min_increment: [1, 100000],
  max_payment: [100, 500000],
};

export async function POST(req: Request) {
  if (!isAdmin() || !sameOrigin()) return new Response("forbidden", { status: 403 });
  const f = await req.formData();
  for (const [key, [lo, hi]] of Object.entries(LIMITS)) {
    const v = Number(f.get(key));
    if (!Number.isInteger(v) || v < lo || v > hi)
      return new Response(null, { status: 303, headers: { location: `/admin?msg=${encodeURIComponent(`${key} must be ${lo}–${hi}`)}#settings` } });
  }
  for (const key of Object.keys(LIMITS)) {
    await q("insert into settings (key, value) values ($1,$2) on conflict (key) do update set value = excluded.value", [key, Number(f.get(key))]);
  }
  return new Response(null, { status: 303, headers: { location: "/admin?msg=Settings%20saved#settings" } });
}
