import { redirect } from "next/navigation";
import { isAdmin } from "@/lib/admin";
import { q, q1 } from "@/lib/db";
import { getSettings } from "@/lib/settings";
import { CATEGORIES } from "@/lib/categories";
import { archiveDays } from "@/lib/board";
import { istDate } from "@/lib/util";

export const dynamic = "force-dynamic";
export const metadata = { title: "Admin", robots: { index: false } };

const inr = (n: number) => "₹" + Number(n || 0).toLocaleString("en-IN");
const dt = (s: string | null) => s ? new Date(s).toLocaleString("en-IN", { timeZone: "Asia/Kolkata", day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" }) : "—";

export default async function Admin({ searchParams }: { searchParams: { msg?: string; show?: string } }) {
  if (!isAdmin()) redirect("/admin/login");
  const today = istDate();
  const [stats, s, listings, payments, days] = await Promise.all([
    q1<any>(`select
        (select coalesce(sum(amount),0)::int from payments where status='paid') as revenue,
        (select coalesce(sum(amount),0)::int from payments where status='paid' and (paid_at at time zone 'Asia/Kolkata')::date = $1::date) as today_revenue,
        (select count(*)::int from listings where status='active') as listings,
        (select coalesce(sum(clicks_total),0)::int from listings) as clicks,
        (select count(*)::int from payments where status='paid') as paid,
        (select count(*)::int from payments where status='review') as review,
        (select count(*)::int from payments where status='failed') as failed`, [today]),
    getSettings(),
    q<any>(`select id, title, url, domain, description, category, total_amount::int as total, clicks_total, status, created_at,
                   case when status='active' then listing_rank(id) end as rank
              from listings order by status, total_amount desc, last_bid_at asc limit 300`),
    q<any>(`select p.id, p.kind, p.amount, p.status, p.razorpay_order_id, p.razorpay_payment_id, p.created_at, p.paid_at, p.note,
                   coalesce(l.title, p.draft->>'title') as title
              from payments p left join listings l on l.id = p.listing_id
             where ($1::text is null or p.status = $1) order by p.id desc limit 200`, [searchParams.show || null]),
    archiveDays(30),
  ]);

  return (
    <div style={{ display: "grid", gap: 24 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
        <h1 style={{ fontSize: 26 }}>Admin · Topper Board</h1>
        <form method="post" action="/api/admin/logout"><button className="btn ghost" type="submit">Log out</button></form>
      </div>
      {searchParams.msg && <div className="card pad okmsg" role="status">{searchParams.msg}</div>}

      <section className="stats" aria-label="Totals">
        <div className="card stat"><span className="small muted">Total revenue</span><b>{inr(stats.revenue)}</b></div>
        <div className="card stat"><span className="small muted">Today (IST)</span><b>{inr(stats.today_revenue)}</b></div>
        <div className="card stat"><span className="small muted">Active listings</span><b>{stats.listings}</b></div>
        <div className="card stat"><span className="small muted">Total clicks</span><b>{stats.clicks}</b></div>
        <div className="card stat"><span className="small muted">Payments</span><b>{stats.paid}</b><span className="small muted">{stats.review} to review · {stats.failed} failed</span></div>
      </section>

      <section id="settings" className="card pad">
        <h2 className="sec-title">Bid settings</h2>
        <form method="post" action="/api/admin/settings" className="tabs" style={{ alignItems: "end" }}>
          <label className="small">Minimum bid (₹)<input className="input" name="min_bid" type="number" defaultValue={s.min_bid} min={1} required /></label>
          <label className="small">Minimum increment (₹)<input className="input" name="min_increment" type="number" defaultValue={s.min_increment} min={1} required /></label>
          <label className="small">Max single payment (₹)<input className="input" name="max_payment" type="number" defaultValue={s.max_payment} min={100} required /></label>
          <button className="btn" type="submit">Save</button>
        </form>
      </section>

      <section id="payments" className="card pad">
        <h2 className="sec-title">Transactions</h2>
        <div className="tabs">
          {["", "paid", "review", "created", "failed"].map((k) => <a key={k} className={`tab${(searchParams.show || "") === k ? " on" : ""}`} href={`/admin${k ? `?show=${k}` : ""}#payments`}>{k || "all"}</a>)}
        </div>
        <div className="tscroll"><table className="t">
          <thead><tr><th>#</th><th>Listing</th><th>Type</th><th>Amount</th><th>Status</th><th>Razorpay</th><th>Created</th><th>Paid</th></tr></thead>
          <tbody>{payments.map((p) => (
            <tr key={p.id}><td>{p.id}</td><td>{p.title}</td><td>{p.kind}</td><td>{inr(p.amount)}</td>
              <td>{p.status}{p.note ? <div className="small muted">{p.note}</div> : null}</td>
              <td className="mono small">{p.razorpay_order_id}<br />{p.razorpay_payment_id || ""}</td><td>{dt(p.created_at)}</td><td>{dt(p.paid_at)}</td></tr>
          ))}</tbody>
        </table></div>
        <p className="note">"review" = money received but amount mismatched or listing was removed. Check it in Razorpay and refund if needed. "created" = checkout opened but not paid.</p>
      </section>

      <section id="listings" className="card pad">
        <h2 className="sec-title">Listings</h2>
        <div className="tscroll"><table className="t">
          <thead><tr><th>Rank</th><th>Listing</th><th>Total</th><th>Clicks</th><th>Edit</th><th>Action</th></tr></thead>
          <tbody>{listings.map((l) => (
            <tr key={l.id} style={{ opacity: l.status === "active" ? 1 : 0.55 }}>
              <td>{l.rank ? `#${l.rank}` : l.status}</td>
              <td><b>{l.title}</b><div className="small muted">{l.domain} · id {l.id}</div></td>
              <td>{inr(l.total)}</td><td>{l.clicks_total}</td>
              <td>
                <form method="post" action="/api/admin/listings" style={{ display: "grid", gap: 4, minWidth: 260 }}>
                  <input type="hidden" name="id" value={l.id} /><input type="hidden" name="action" value="edit" />
                  <input className="input" name="title" defaultValue={l.title} maxLength={60} aria-label="Title" />
                  <input className="input" name="description" defaultValue={l.description} maxLength={140} aria-label="Description" />
                  <select className="input" name="category" defaultValue={l.category} aria-label="Category">
                    {CATEGORIES.map((c) => <option key={c.slug} value={c.name}>{c.name}</option>)}
                  </select>
                  <button className="btn ghost" type="submit">Save</button>
                </form>
              </td>
              <td>
                <form method="post" action="/api/admin/listings">
                  <input type="hidden" name="id" value={l.id} />
                  <input type="hidden" name="action" value={l.status === "active" ? "remove" : "restore"} />
                  <button className="btn ghost" type="submit">{l.status === "active" ? "Remove" : "Restore"}</button>
                </form>
              </td>
            </tr>
          ))}</tbody>
        </table></div>
      </section>

      <section className="card pad">
        <h2 className="sec-title">Daily history</h2>
        <ul className="act-list">{days.map((d) => <li key={d.day}><a href={`/daily?date=${d.day}`}><b>{d.day}</b></a> · {d.listings} listings · {inr(d.amount)}</li>)}</ul>
      </section>
    </div>
  );
}
