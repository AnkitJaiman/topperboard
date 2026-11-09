import Link from "next/link";
import { CATEGORIES } from "@/lib/categories";

/** Horizontal, scrollable strip of category links. `active` is a slug, or null for All. */
export default function CategoryPills({ active, view }: { active: string | null; view?: string }) {
  const q = view === "today" ? "?view=today" : "";
  return (
    <nav className="pills" aria-label="Categories">
      <Link href={`/${q}`} className={`pill${active ? "" : " on"}`} aria-current={active ? undefined : "page"}>All</Link>
      {CATEGORIES.map((c) => (
        <Link key={c.slug} href={`/c/${c.slug}${q}`} className={`pill${active === c.slug ? " on" : ""}`} aria-current={active === c.slug ? "page" : undefined}>
          <span className="code">{c.code}</span>{c.name}
        </Link>
      ))}
    </nav>
  );
}
