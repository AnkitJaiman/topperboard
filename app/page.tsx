import BoardPage from "@/components/BoardPage";

export const dynamic = "force-dynamic";

export default function Home({ searchParams }: { searchParams: { view?: string } }) {
  return <BoardPage view={searchParams.view === "today" ? "today" : "all"} />;
}
