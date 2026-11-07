import BoardList from "@/components/BoardList";
import { archiveDays, dayBoard } from "@/lib/board";
import { categoryBySlug, CATEGORIES } from "@/lib/categories";
import { istDate } from "@/lib/util";

export const dynamic = "force-dynamic";
export const metadata = { title: "Daily leaderboards" };

export default async function Daily({ searchParams }: { searchParams: { date?: string; category?: string } }) {
  const today = istDate();
  const day = /^\d{4}-\d{2}-\d{2}$/.test(searchParams.date || "") ? searchParams.date! : today;
  const cat = searchParams.category ? categoryBySlug(searchParams.category) : undefined;
  const [rows, days] = await Promise.all([dayBoard(day, cat?.name), archiveDays(90)]);
  const label = new Date(day + "T00:00:00+05:30").toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long", year: "numeric", timeZone: "Asia/Kolkata" });
  return (
    <>
      <h1 style={{ fontSize: 30, marginBottom: 6 }}>Daily leaderboards</h1>
      <p className="muted" style={{ marginTop: 0 }}>Each day (India time) has its own board, ranked by what listings paid that day. Past days are kept forever.</p>
      <form className="tabs" method="get" action="/daily">
        <input className="input" type="date" name="date" defaultValue={day} max={today} aria-label="Date" style={{ width: "auto" }} />
        <select className="input" name="category" defaultValue={cat?.slug || ""} aria-label="Category" style={{ width: "auto", maxWidth: 280 }}>
          <option value="">All categories</option>
          {CATEGORIES.map((c) => <option key={c.slug} value={c.slug}>{c.icon} {c.name}</option>)}
        </select>
        <button className="btn" type="submit">Show</button>
      </form>
      <div className="grid">
        <section>
          <h2 style={{ fontSize: 18, margin: "0 0 10px" }}>{label}{day === today ? " · today" : ""}{cat ? ` · ${cat.name}` : ""}</h2>
          <div className="card"><BoardList rows={rows} amountLabel="paid that day" empty="No verified bids on this day." /></div>
        </section>
        <aside className="card pad" aria-label="Archive">
          <h2 className="sec-title">Archive</h2>
          {days.length ? (
            <ul className="act-list">
              {days.map((d) => (
                <li key={d.day}><a href={`/daily?date=${d.day}`}><b>{d.day}</b></a> <span className="small muted">· {d.listings} listings · ₹{d.amount.toLocaleString("en-IN")}</span></li>
              ))}
            </ul>
          ) : <p className="small muted" style={{ margin: 0 }}>No days yet.</p>}
        </aside>
      </div>
    </>
  );
}
