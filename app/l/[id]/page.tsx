import { notFound } from "next/navigation";
import TopUp from "@/components/TopUp";
import { Fav } from "@/components/BoardList";
import { listing } from "@/lib/board";
import { categoryByName } from "@/lib/categories";
import { getSettings } from "@/lib/settings";
import { razorpayConfigured } from "@/lib/razorpay";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: { id: string } }) {
  const l = Number.isInteger(Number(params.id)) ? await listing(Number(params.id)) : null;
  return { title: l ? `${l.title} · #${l.rank}` : "Listing" };
}

export default async function ListingPage({ params, searchParams }: { params: { id: string }; searchParams: { new?: string } }) {
  const id = Number(params.id);
  if (!Number.isInteger(id)) notFound();
  const [l, s] = await Promise.all([listing(id), getSettings()]);
  if (!l) notFound();
  const c = categoryByName(l.category);
  const inr = (n: number) => "₹" + Number(n).toLocaleString("en-IN");
  return (
    <div style={{ maxWidth: 720, margin: "0 auto", display: "grid", gap: 16 }}>
      {searchParams.new && <div className="card pad okmsg">🎉 Payment verified. Your listing is live at #{l.rank}. Share it!</div>}
      <div className="card pad" style={{ display: "grid", gap: 12 }}>
        <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
          <Fav src={l.favicon_url} domain={l.domain} />
          <div style={{ minWidth: 0 }}>
            <h1 style={{ fontSize: 26, overflowWrap: "anywhere" }}>{l.title}</h1>
            <div className="small muted">{l.domain}</div>
          </div>
          <div style={{ marginLeft: "auto", fontSize: 28, fontWeight: 850 }}>{l.rank === 1 ? "👑" : ""}#{l.rank}</div>
        </div>
        {l.description && <p style={{ margin: 0 }}>{l.description}</p>}
        <div className="stats" style={{ margin: 0 }}>
          <div className="card stat"><span className="small muted">Total verified bid</span><b>{inr(l.total_amount)}</b></div>
          <div className="card stat"><span className="small muted">Clicks</span><b>{l.clicks_total.toLocaleString("en-IN")}</b><span className="small muted">{l.clicks_today} today</span></div>
          <div className="card stat"><span className="small muted">Category</span><b style={{ fontSize: 15 }}>{c ? <a href={`/c/${c.slug}`}>{c.icon} {c.name}</a> : l.category}</b></div>
          <div className="card stat"><span className="small muted">Listed</span><b style={{ fontSize: 15 }}>{new Date(l.first_paid_at || l.created_at).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric", timeZone: "Asia/Kolkata" })}</b></div>
        </div>
        <a className="btn" href={`/go/${l.id}`} target="_blank" rel="sponsored noopener">Visit website ↗</a>
        <p className="note" style={{ margin: 0 }}>Sponsored listing. Rank is based only on verified bids, not on quality or reviews.</p>
      </div>
      <TopUp listingId={l.id} total={l.total_amount} minInc={s.min_increment} max={s.max_payment} enabled={razorpayConfigured()} />
    </div>
  );
}
