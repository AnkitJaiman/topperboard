"use client";
import { useEffect, useState } from "react";
import BoardList, { BoardRow } from "./BoardList";
import CategorySelect from "./CategorySelect";
import { categoryByName } from "@/lib/categories";

type View = "all" | "today";

/** Board with All-time / Today tabs and a category filter. Refreshes every 30 seconds. */
export default function Board({ initial, initialCategory = null, lockCategory = false }: { initial: BoardRow[]; initialCategory?: string | null; lockCategory?: boolean }) {
  const [view, setView] = useState<View>("all");
  const [category, setCategory] = useState<string | null>(initialCategory);
  const [rows, setRows] = useState(initial);
  const [loading, setLoading] = useState(false);

  async function load(v: View, c: string | null) {
    setLoading(true);
    const slug = c ? categoryByName(c)?.slug : "";
    const r = await fetch(`/api/board?view=${v}${slug ? `&category=${slug}` : ""}`).catch(() => null);
    if (r?.ok) setRows((await r.json()).rows);
    setLoading(false);
  }
  useEffect(() => {
    if (view !== "all" || category !== initialCategory) load(view, category);
    const t = setInterval(() => { if (!document.hidden) load(view, category); }, 30000);
    return () => clearInterval(t);
  }, [view, category]); // eslint-disable-line

  return (
    <section aria-label="Leaderboard">
      <div className="tabs">
        <button className={`tab${view === "all" ? " on" : ""}`} onClick={() => setView("all")} aria-pressed={view === "all"}>All-time</button>
        <button className={`tab${view === "today" ? " on" : ""}`} onClick={() => setView("today")} aria-pressed={view === "today"}>Today</button>
        {!lockCategory && <div className="tabs-dd"><CategorySelect allowAll value={category} onChange={setCategory} /></div>}
      </div>
      <div style={{ opacity: loading ? 0.6 : 1 }}>
        <BoardList rows={rows} amountLabel={view === "all" ? "Total bid" : "Paid today"}
          empty={view === "today" ? "No bids yet today (IST). The first bid today takes #1 on the Today board." : undefined} />
      </div>
      <p className="note">{view === "all" ? "Ranked by total verified bids. Ties go to whoever reached the amount first." : "Today's board counts only what each listing paid today (India time) and resets at midnight IST."} All positions are paid placements.</p>
    </section>
  );
}
