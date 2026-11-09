import { Activity } from "@/lib/board";
import { ago } from "./BoardList";

const inr = (n: number) => "₹" + Number(n).toLocaleString("en-IN");

const LABEL: Record<string, string> = { new_number_one: "New #1", moved_up: "Moved up", top_up: "Bid raised", new_listing: "New listing" };

function text(a: Activity) {
  const name = <a href={`/l/${a.listing_id}`}><b>{a.title}</b></a>;
  switch (a.type) {
    case "new_number_one": return <>{name} took #1 with {inr(a.amount)}</>;
    case "moved_up": return <>{name} climbed to #{a.rank}</>;
    case "top_up": return <>{name} added {inr(a.amount)}, now #{a.rank}</>;
    default: return <>{name} entered at #{a.rank} with {inr(a.amount)}</>;
  }
}

export default function ActivityFeed({ items }: { items: Activity[] }) {
  return (
    <aside aria-label="Latest activity">
      <h2 className="sec-title">Latest activity</h2>
      {items.length ? (
        <ul className="act-list">
          {items.map((a) => (
            <li key={a.id}>
              <span className={`ev${a.type === "new_number_one" ? " one" : ""}`}>{LABEL[a.type] || a.type} · {ago(a.created_at)}</span>
              <span>{text(a)}</span>
            </li>
          ))}
        </ul>
      ) : <p className="small muted" style={{ margin: 0 }}>Nothing yet. Every verified bid shows up here.</p>}
    </aside>
  );
}
