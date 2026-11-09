import { isAdmin, sameOrigin } from "@/lib/admin";
import { q } from "@/lib/db";
import { isCategory } from "@/lib/categories";

export const dynamic = "force-dynamic";

/** Admin actions on a listing: remove, restore, edit description / title / category. Bids are never edited here. */
export async function POST(req: Request) {
  if (!isAdmin() || !sameOrigin()) return new Response("forbidden", { status: 403 });
  const f = await req.formData();
  const id = Number(f.get("id"));
  const action = String(f.get("action") || "");
  const back = (msg: string) => new Response(null, { status: 303, headers: { location: `/admin?msg=${encodeURIComponent(msg)}#listings` } });
  if (!Number.isInteger(id)) return back("Invalid listing");

  if (action === "remove") {
    await q("update listings set status='removed' where id=$1", [id]);
    return back(`Listing #${id} removed. Refund it from the Razorpay dashboard.`);
  }
  if (action === "restore") {
    try { await q("update listings set status='active' where id=$1", [id]); }
    catch { return back("Can't restore: the same URL is already listed"); }
    return back(`Listing #${id} restored`);
  }
  if (action === "edit") {
    const title = String(f.get("title") || "").replace(/\s+/g, " ").trim().slice(0, 60);
    const description = String(f.get("description") || "").replace(/\s+/g, " ").trim().slice(0, 140);
    const category = f.get("category");
    if (!title || !isCategory(category)) return back("Title and a valid category are required");
    await q("update listings set title=$2, description=$3, category=$4 where id=$1", [id, title, description, category]);
    return back(`Listing #${id} updated`);
  }
  return back("Unknown action");
}
