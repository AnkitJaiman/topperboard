import Link from "next/link";

/** All-time / Today switch. Plain links, so it works without JavaScript. */
export default function ModeTabs({ base, view }: { base: string; view: "all" | "today" }) {
  return (
    <nav className="modes" aria-label="Board view">
      <Link aria-current={view === "all" ? "page" : undefined} className={view === "all" ? "on" : ""} href={base}>All-time</Link>
      <Link aria-current={view === "today" ? "page" : undefined} className={view === "today" ? "on" : ""} href={`${base}?view=today`}>Today</Link>
    </nav>
  );
}
