import { notFound } from "next/navigation";
import BoardPage from "@/components/BoardPage";
import { categoryBySlug } from "@/lib/categories";

export const dynamic = "force-dynamic";

export function generateMetadata({ params }: { params: { slug: string } }) {
  const c = categoryBySlug(params.slug);
  return { title: c ? `${c.name} leaderboard` : "Category" };
}

export default function CategoryPage({ params, searchParams }: { params: { slug: string }; searchParams: { view?: string } }) {
  const c = categoryBySlug(params.slug);
  if (!c) notFound();
  return <BoardPage category={c} view={searchParams.view === "today" ? "today" : "all"} />;
}
