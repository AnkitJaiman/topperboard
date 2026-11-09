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
  const [live, setLive] = useState(true);

  async function load(v: View, c: string | null) {
    setLoading(true);
    const slug = c ? categoryByName(c)?.slug : "";
    const r = await fetch(`/api/board?view=${v}${slug ? `&category=${slug}` : ""}`).catch(() => null);
    if (r?.ok) setRows((await r.json()).rows);
    setLoading(false);
  }
  useEffect(() => {
    if (view !== initialView || category !== initialCategory) load(view, category);
    if (!live) return;
    const t = setInterval(() => { if (!document.hidden) load(view, category); }, 30000);
    return () => clearInterval(t);
  }, [view, category, live]); // eslint-disable-line

  return (
    <section aria-label="Leaderboard">
      {controls && (
        <div className="tabs">
          <button className={`tab${view === "all" ? " on" : ""}`} onClick={() => setView("all")} aria-pressed={view === "all"}>All-time</button>
          <button className={`tab${view === "today" ? " on" : ""}`} onClick={() => setView("today")} aria-pressed={view === "today"}>Today</button>
          <div className="tabs-dd"><CategorySelect allowAll value={category} onChange={setCategory} /></div>
        </div>
      )}
      <div className="board-note"><span>All positions are paid placements, ranked by {view === "all" ? "total bid" : "what was paid today (IST)"}.</span>
        <button type="button" className="linkbtn small" onClick={() => setLive(!live)} aria-pressed={!live}>{live ? "Pause live updates" : "Resume live updates"}</button></div>
      <div style={{ opacity: loading ? 0.6 : 1 }}>
        <BoardList rows={rows} amountLabel={view === "all" ? "Total bid" : "Paid today"}
          empty={view === "today" ? "Nobody has claimed a rank today. The first bid today takes #1 on the Today board." : undefined} />
      </div>
      <p className="note">{view === "all" ? "Equal totals: whoever got there first ranks higher." : "Today resets at midnight IST. Past days are in the Daily archive."}</p>
    </section>
  );
}
