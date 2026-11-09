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
      <p className="crumb"><a href="/categories">Categories</a> / {c.code}</p>
      <h1 className="page-h">{c.name}</h1>
      <p className="lede">Ranked within this category only. <a href="/#claim" style={{ color: "var(--link)" }}>List your website here</a></p>
      <Board initial={rows} initialCategory={c.name} lockCategory />
    </>
  );
}
