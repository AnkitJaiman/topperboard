import { categoryByName } from "@/lib/categories";

export type BoardRow = {
  id: number; url: string; domain: string; title: string; description: string; favicon_url: string | null;
  category: string; amount: number; total_amount: number; clicks_total: number; created_at: string; rank: number;
};
const inr = (n: number) => "₹" + Number(n).toLocaleString("en-IN");

export function ago(iso: string) {
  const s = Math.max(0, (Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return "just now";
  if (s < 3600) return `${Math.floor(s / 60)} min ago`;
  if (s < 86400) return `${Math.floor(s / 3600)} h ago`;
  const d = Math.floor(s / 86400);
  if (d < 30) return `${d} d ago`;
  return `${Math.floor(d / 30)} mo ago`;
}

export function Fav({ src, domain, big }: { src: string | null; domain: string; big?: boolean }) {
  // Letter underneath; the favicon covers it when it loads and hides itself if it fails.
  return (
    <span className={`fav${big ? " big" : ""}`} aria-hidden style={{ position: "relative" }}>
      {(domain[0] || "?").toUpperCase()}
      {src && <img src={src} alt="" loading="lazy" referrerPolicy="no-referrer" data-fav=""
        style={{ position: "absolute", inset: 0, margin: "auto", background: "var(--panel)" }} />}
    </span>
  );
}

/** Ranked list used on the server and in the client board. */
export default function BoardList({ rows, amountLabel = "Total bid", empty }: { rows: BoardRow[]; amountLabel?: string; empty?: React.ReactNode }) {
  if (!rows.length) return <div className="empty">{empty ?? "No listings yet. The first verified bid takes #1."}</div>;
  return (
    <ol className="board">
      {rows.map((r) => {
        const c = categoryByName(r.category);
        return (
          <li key={r.id} className={`item${r.rank <= 3 ? " top" : ""}`}>
            <span className="rk"><span className="sr">Rank </span>#{r.rank}</span>
            <a href={`/go/${r.id}`} target="_blank" rel="sponsored noopener" tabIndex={-1} aria-hidden="true" className="logo-link">
              <Fav src={r.favicon_url} domain={r.domain} big />
            </a>
            <div className="info">
              <div className="t-row">
                <a className="t" href={`/go/${r.id}`} target="_blank" rel="sponsored noopener">{r.title}<span className="sr"> (opens in a new tab)</span></a>
                <b className="price"><span className="sr">{amountLabel}: </span>{inr(r.amount)}</b>
              </div>
              {r.description ? <div className="d">{r.description}</div> : null}
              <div className="meta">
                {c && <a className="chip" href={`/c/${c.slug}`}><span className="code">{c.code}</span><span>{c.name}</span></a>}
                <span>{ago(r.created_at)}</span>
                <span>{r.domain}</span>
                <span>{r.clicks_total.toLocaleString("en-IN")} clicks</span>
                <a href={`/l/${r.id}`} className="details">details<span className="sr"> for {r.title}</span></a>
              </div>
            </div>
          </li>
        );
      })}
    </ol>
  );
}
