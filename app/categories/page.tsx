import { CATEGORIES } from "@/lib/categories";
import { categoryCounts } from "@/lib/board";

export const dynamic = "force-dynamic";
export const metadata = { title: "Categories" };

export default async function Categories() {
  const counts = await categoryCounts();
  return (
    <>
      <h1 className="page-h">Categories</h1>
      <p className="lede">Thirty boards. Every listing sits in exactly one, and each board has its own ranking.</p>
      <div className="cats">
        {CATEGORIES.map((c) => {
          const k = counts[c.name];
          return (
            <a key={c.slug} href={`/c/${c.slug}`}>
              <span className="code">{c.code}</span>
              <span style={{ minWidth: 0 }}>
                <b style={{ display: "block", fontWeight: 600 }}>{c.name}</b>
                <span className="small muted mono">{k ? `${k.n} listed · top ₹${k.top.toLocaleString("en-IN")}` : "Open"}</span>
              </span>
            </a>
          );
        })}
      </div>
    </>
  );
}
