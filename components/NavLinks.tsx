"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS: [string, string][] = [["/", "All"], ["/leaderboards", "Leaderboards"], ["/categories", "Categories"], ["/daily", "Daily"], ["/about", "About"]];

export default function NavLinks() {
  const p = usePathname();
  return (
    <nav className="nav" aria-label="Main">
      {LINKS.map(([href, label]) => {
        const on = href === "/" ? p === "/" : p.startsWith(href) || (href === "/categories" && p.startsWith("/c/"));
        return <Link key={href} href={href} className={on ? "on" : ""} aria-current={on ? "page" : undefined}>{label}</Link>;
      })}
    </nav>
  );
}
