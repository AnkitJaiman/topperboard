import { categoryByName } from "@/lib/categories";

export type BoardRow = {
  id: number; url: string; domain: string; title: string; description: string; favicon_url: string | null;
  category: string; amount: number; total_amount: number; clicks_total: number; created_at: string; rank: number;
};
const inr = (n: number) => "₹" + Number(n).toLocaleString("en-IN");

export function ago(iso: string) {
  const s = Math.max(0, (Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return "just now";
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
}

export function Fav({ src, domain }: { src: string | null; domain: string }) {
  // Letter underneath; the favicon covers it when it loads, and hides itself if it fails.
  return (
    <span className="fav" aria-hidden style={{ position: "relative" }}>
      {(domain[0] || "?").toUpperCase()}
      {src && <img src={src} alt="" loading="lazy" referrerPolicy="no-referrer" style={{ position: "absolute", inset: 0, margin: "auto", background: "var(--soft)" }}
        data-fav="" />}
    </span>
  );
}

/** Pure list renderer used on the server and in the client board. `amountLabel` says what the number means. */
export default function BoardList({ rows, amountLabel = "total bid", empty }: { rows: BoardRow[]; amountLabel?: string; empty?: React.ReactNode }) {
  if (!rows.length) return <div className="empty">{empty ?? "No listings yet. Be the first to claim #1."}</div>;
  return (
    <ol className="board">
      {rows.map((r) => {
        const c = categoryByName(r.category);
        return (
          <li key={r.id} className={`item${r.rank <= 3 ? " top" : ""}${r.rank === 1 ? " top1" : ""}`}>
            <span className="rk">{r.rank === 1 ? "👑" : `#${r.rank}`}</span>
            <Fav src={r.favicon_url} domain={r.domain} />
            <div className="info">
              <div className="t"><a href={`/l/${r.id}`}>{r.title}</a></div>
              {r.description && <div className="d">{r.description}</div>}
              <div className="meta">
                <span>{r.domain}</span>
                {c && <a className="chip" href={`/c/${c.slug}`}>{c.icon} {c.name}</a>}
                <span>{r.clicks_total.toLocaleString("en-IN")} clicks</span>
                <span>{ago(r.created_at)}</span>
              </div>
            </div>
            <div className="amt">
              <b title={amountLabel}>{inr(r.amount)}</b>
              <a href={`/go/${r.id}`} target="_blank" rel="sponsored noopener" aria-label={`Visit ${r.title} (opens in a new tab)`}>Visit ↗</a>
            </div>
          </li>
        );
      })}
    </ol>
  );
}
