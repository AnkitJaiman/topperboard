import { quote } from "@/lib/board";
import { isCategory } from "@/lib/categories";
import { bad, json, toId } from "@/lib/util";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const sp = new URL(req.url).searchParams;
  const amount = Number(sp.get("amount"));
  const rawId = sp.get("listingId");
  const listingId = rawId ? toId(rawId) ?? -1 : undefined;
  if (listingId === -1) return bad("Invalid listing");
  const category = sp.get("category") || "Other";
  if (!Number.isFinite(amount) || amount < 0 || amount > 1e9) return bad("Invalid amount");
  if (!listingId && !isCategory(category)) return bad("Invalid category");
  const qt = await quote(Math.floor(amount), category, listingId);
  return json(qt);
}
