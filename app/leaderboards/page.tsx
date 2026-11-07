import Board from "@/components/Board";
import ActivityFeed from "@/components/ActivityFeed";
import { allTime, recentActivity } from "@/lib/board";

export const dynamic = "force-dynamic";
export const metadata = { title: "Leaderboards" };

export default async function Leaderboards() {
  const [rows, activity] = await Promise.all([allTime(undefined, 100), recentActivity(20)]);
  return (
    <>
      <h1 style={{ fontSize: 30, marginBottom: 6 }}>Leaderboards</h1>
      <p className="muted" style={{ marginTop: 0 }}>All-time and today, across all 30 categories. Want a spot? <a href="/" style={{ color: "var(--link)" }}>Claim a rank →</a></p>
      <div className="grid"><Board initial={rows} /><ActivityFeed items={activity} /></div>
    </>
  );
}
