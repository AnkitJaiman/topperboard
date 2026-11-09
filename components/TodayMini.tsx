import { BoardRow, Fav } from "./BoardList";

const inr = (n: number) => "₹" + Number(n).toLocaleString("en-IN");

/** Compact top-5 for today's (IST) board, shown in the sidebar. */
export default function TodayMini({ rows }: { rows: BoardRow[] }) {
  return (
    <section aria-label="Today's ranking">
      <div className="side-h"><h2 className="sec-title">Today&apos;s ranking</h2><a href="/daily">See all</a></div>
      {rows.length ? (
        <ol className="mini" aria-label="Top 5 today">
          {rows.slice(0, 5).map((r) => (
            <li key={r.id}>
              <span className="mrk">#{r.rank}</span>
              <Fav src={r.favicon_url} domain={r.domain} />
              <a href={`/l/${r.id}`} className="mt">{r.title}</a>
              <span className="mamt">{inr(r.amount)}</span>
            </li>
          ))}
        </ol>
      ) : <p className="small muted" style={{ margin: 0 }}>Nobody has claimed a rank today. Today&apos;s board resets at midnight IST.</p>}
    </section>
  );
}
