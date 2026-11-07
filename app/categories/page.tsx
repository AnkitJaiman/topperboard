import { CATEGORIES } from "@/lib/categories";
import { categoryCounts } from "@/lib/board";

export const dynamic = "force-dynamic";
export const metadata = { title: "Categories" };

export default async function Categories() {
  const counts = await categoryCounts();
  return (
    <>
      <h1 style={{ fontSize: 30, marginBottom: 6 }}>Categories</h1>
      <p className="muted" style={{ marginTop: 0 }}>Every listing belongs to one of 30 categories. Each category has its own leaderboard.</p>
      <div className="cats">
        {CATEGORIES.map((c) => {
          const k = counts[c.name];
          return (
            <a key={c.slug} href={`/c/${c.slug}`} className="card">
              <span style={{ fontSize: 22 }} aria-hidden>{c.icon}</span>
              <span style={{ minWidth: 0 }}>
                <b style={{ display: "block" }}>{c.name}</b>
                <span className="small muted">{k ? `${k.n} listed · #1 at ₹${k.top.toLocaleString("en-IN")}` : "No listings yet"}</span>
              </span>
            </a>
          );
        })}
      </div>
    </>
  );
}
