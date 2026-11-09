import Board from "@/components/Board";
import ActivityFeed from "@/components/ActivityFeed";
import { allTime, recentActivity } from "@/lib/board";

export const dynamic = "force-dynamic";
export const metadata = { title: "Leaderboards" };

export default async function Leaderboards() {
  const [rows, activity] = await Promise.all([allTime(undefined, 100), recentActivity(20)]);
  return (
    <>
      <h1 className="page-h">Leaderboards</h1>
      <p className="lede">All-time and today, across all 30 categories. Want a spot? <a href="/#claim" style={{ color: "var(--link)" }}>Claim a rank</a></p>
      <div className="grid"><Board initial={rows} /><ActivityFeed items={activity} /></div>
    </>
  );
}
