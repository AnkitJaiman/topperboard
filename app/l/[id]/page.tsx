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
    <div style={{ maxWidth: 760, display: "grid", gridTemplateColumns: "minmax(0,1fr)", gap: 24 }}>
      {searchParams.new && <div className="okmsg" role="status">Payment verified. Your listing is live at #{l.rank}.</div>}
      {c && <p className="crumb" style={{ margin: 0 }}><a href={`/c/${c.slug}`}>{c.code} · {c.name}</a></p>}
      <div style={{ display: "flex", gap: 14, alignItems: "flex-start" }}>
        <Fav src={l.favicon_url} domain={l.domain} />
        <div style={{ minWidth: 0, flex: 1 }}>
          <h1 className="page-h" style={{ overflowWrap: "anywhere", margin: 0 }}>{l.title}</h1>
          <div className="small muted mono">{l.domain}</div>
        </div>
        <div className="mono" style={{ fontSize: 34, fontWeight: 700, letterSpacing: "-.04em" }} aria-label={`Rank ${l.rank}`}>#{l.rank}</div>
      </div>
      {l.description && <p style={{ margin: 0, fontSize: 17 }}>{l.description}</p>}
      <div className="stats" style={{ margin: 0 }}>
        <div className="stat"><span>Total bid</span><b>{inr(l.total_amount)}</b></div>
        <div className="stat"><span>Clicks</span><b>{l.clicks_total.toLocaleString("en-IN")}</b><span className="small muted mono">{l.clicks_today} today</span></div>
        <div className="stat"><span>Listed</span><b style={{ fontSize: 16 }}>{new Date(l.first_paid_at || l.created_at).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric", timeZone: "Asia/Kolkata" })}</b></div>
      </div>
      <div className="row flex">
        <a className="btn" href={`/go/${l.id}`} target="_blank" rel="sponsored noopener">Visit {l.domain}</a>
      </div>
      <p className="note" style={{ margin: 0 }}>Paid placement. The rank reflects verified bids only, not quality or reviews.</p>
      <TopUp listingId={l.id} total={l.total_amount} minInc={s.min_increment} max={s.max_payment} enabled={razorpayConfigured()} />
    </div>
  );
}
