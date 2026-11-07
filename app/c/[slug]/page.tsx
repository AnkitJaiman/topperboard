import { notFound } from "next/navigation";
import Board from "@/components/Board";
import { allTime } from "@/lib/board";
import { categoryBySlug } from "@/lib/categories";

export const dynamic = "force-dynamic";

export function generateMetadata({ params }: { params: { slug: string } }) {
  const c = categoryBySlug(params.slug);
  return { title: c ? `${c.name} leaderboard` : "Category" };
}

export default async function CategoryPage({ params }: { params: { slug: string } }) {
  const c = categoryBySlug(params.slug);
  if (!c) notFound();
  const rows = await allTime(c.name, 100);
  return (
    <>
      <p className="small muted" style={{ margin: 0 }}><a href="/categories">Categories</a> /</p>
      <h1 style={{ fontSize: 30, margin: "4px 0 6px" }}>{c.icon} {c.name}</h1>
      <p className="muted" style={{ marginTop: 0 }}>Ranks within this category. <a href="/" style={{ color: "var(--link)" }}>List your website here →</a></p>
      <Board initial={rows} initialCategory={c.name} lockCategory />
    </>
  );
}
