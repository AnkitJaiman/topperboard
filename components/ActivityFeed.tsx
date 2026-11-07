import { Activity } from "@/lib/board";
import { ago } from "./BoardList";

const inr = (n: number) => "₹" + Number(n).toLocaleString("en-IN");

function text(a: Activity) {
  const name = <a href={`/l/${a.listing_id}`}><b>{a.title}</b></a>;
  switch (a.type) {
    case "new_number_one": return <>👑 {name} took <b>#1</b> with a {inr(a.amount)} bid</>;
    case "moved_up": return <>⬆️ {name} moved up to #{a.rank}</>;
    case "top_up": return <>➕ {name} added {inr(a.amount)} · now #{a.rank}</>;
    default: return <>🆕 {name} joined at #{a.rank} with {inr(a.amount)}</>;
  }
}

export default function ActivityFeed({ items }: { items: Activity[] }) {
  return (
    <aside className="card pad" aria-label="Latest activity">
      <h2 className="sec-title">Latest activity</h2>
      {items.length ? (
        <ul className="act-list">
          {items.map((a) => <li key={a.id}>{text(a)} <span className="small muted">· {ago(a.created_at)}</span></li>)}
        </ul>
      ) : <p className="small muted" style={{ margin: 0 }}>Nothing yet. Verified bids show up here.</p>}
    </aside>
  );
}
