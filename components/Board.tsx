"use client";
import { useEffect, useState } from "react";
import BoardList, { BoardRow } from "./BoardList";
import CategorySelect from "./CategorySelect";
import { categoryByName } from "@/lib/categories";

type View = "all" | "today";

/**
 * Ranked list that refreshes every 30 seconds.
 * With `controls`, it shows its own All-time / Today tabs and category filter (Leaderboards page);
 * otherwise the page's category strip and mode tabs decide what it shows.
 */
export default function Board({ initial, view: initialView = "all", category: initialCategory = null, controls = false }:
  { initial: BoardRow[]; view?: View; category?: string | null; controls?: boolean }) {
  const [view, setView] = useState<View>(initialView);
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
    if (view !== initialView || category !== initialCategory) load(view, category);
    const t = setInterval(() => { if (!document.hidden) load(view, category); }, 30000);
    return () => clearInterval(t);
  }, [view, category]); // eslint-disable-line

  return (
    <section aria-label="Leaderboard">
      {controls && (
        <div className="tabs">
          <button className={`tab${view === "all" ? " on" : ""}`} onClick={() => setView("all")} aria-pressed={view === "all"}>All-time</button>
          <button className={`tab${view === "today" ? " on" : ""}`} onClick={() => setView("today")} aria-pressed={view === "today"}>Today</button>
          <div className="tabs-dd"><CategorySelect allowAll value={category} onChange={setCategory} /></div>
        </div>
      )}
      <div style={{ opacity: loading ? 0.6 : 1 }}>
        <BoardList rows={rows} amountLabel={view === "all" ? "Total bid" : "Paid today"}
          empty={view === "today" ? "Nobody has claimed a rank today. The first bid today takes #1 on the Today board." : undefined} />
      </div>
      <p className="note">{view === "all" ? "Ranked by total verified bids. Equal totals: whoever got there first ranks higher." : "Counts only what each listing paid today (India time). Resets at midnight IST."} All positions are paid placements.</p>
    </section>
  );
}
