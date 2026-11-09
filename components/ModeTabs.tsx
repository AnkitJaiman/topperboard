import Link from "next/link";

/** All-time / Today switch. Works without JavaScript (plain links). */
export default function ModeTabs({ base, view }: { base: string; view: "all" | "today" }) {
  return (
    <div className="modes" role="tablist" aria-label="Board">
      <Link role="tab" aria-selected={view === "all"} className={view === "all" ? "on" : ""} href={base}>All-time</Link>
      <Link role="tab" aria-selected={view === "today"} className={view === "today" ? "on" : ""} href={`${base}?view=today`}>Today</Link>
    </div>
  );
}
