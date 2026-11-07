import { allTime, dayBoard, recentActivity } from "@/lib/board";
import { categoryBySlug } from "@/lib/categories";
import { istDate, json, bad } from "@/lib/util";

export const dynamic = "force-dynamic";

/** Public JSON for live refresh: ?view=all|today|YYYY-MM-DD&category=slug */
export async function GET(req: Request) {
  const sp = new URL(req.url).searchParams;
  const view = sp.get("view") || "all";
  const slug = sp.get("category");
  const cat = slug ? categoryBySlug(slug)?.name : undefined;
  if (slug && !cat) return bad("Unknown category");
  let rows;
  if (view === "all") rows = await allTime(cat);
  else if (view === "today") rows = await dayBoard(istDate(), cat);
  else if (/^\d{4}-\d{2}-\d{2}$/.test(view)) rows = await dayBoard(view, cat);
  else return bad("Unknown view");
  return json({ rows, activity: await recentActivity(10) });
}
