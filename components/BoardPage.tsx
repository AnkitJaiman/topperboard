import BidBox from "./BidBox";
import Board from "./Board";
import ActivityFeed from "./ActivityFeed";
import CategoryPills from "./CategoryPills";
import ModeTabs from "./ModeTabs";
import TodayMini from "./TodayMini";
import { allTime, quote, recentActivity, todayBoard } from "@/lib/board";
import { razorpayConfigured } from "@/lib/razorpay";
import { Category } from "@/lib/categories";

/** Shared layout for the home page and each category page. */
export default async function BoardPage({ category, view }: { category?: Category; view: "all" | "today" }) {
  const name = category?.name;
  const [rows, today, activity, q] = await Promise.all([
    view === "today" ? todayBoard(name, 100) : allTime(name, 100),
    todayBoard(name, 5),
    recentActivity(8),
    quote(0, name || "Other"),
  ]);
  const base = category ? `/c/${category.slug}` : "/";
  return (
    <>
      <CategoryPills active={category?.slug ?? null} view={view} />
      <ModeTabs base={base} view={view} />
      <BidBox key={name || "all"} settings={q.settings} claimOne={name ? q.categoryClaimOne : q.claimOne} enabled={razorpayConfigured()} fixedCategory={name ?? null} />
      <div className="grid">
        <Board key={`${view}-${name || "all"}`} initial={rows} view={view} category={name ?? null} />
        <aside className="side">
          <TodayMini rows={today} category={name} />
          <ActivityFeed items={activity} />
        </aside>
      </div>
    </>
  );
}
