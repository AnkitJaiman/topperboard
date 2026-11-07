import BidBox from "@/components/BidBox";
import Board from "@/components/Board";
import ActivityFeed from "@/components/ActivityFeed";
import { allTime, quote, recentActivity } from "@/lib/board";
import { razorpayConfigured } from "@/lib/razorpay";

export const dynamic = "force-dynamic";

export default async function Home() {
  const [rows, activity, q] = await Promise.all([allTime(undefined, 50), recentActivity(12), quote(0, "Other")]);
  const s = q.settings;
  return (
    <>
      <section className="hero">
        <h1>Claim <b>#1</b> for ₹{q.claimOne.toLocaleString("en-IN")}</h1>
        <p>Pay More. Rank Higher. Get Seen.</p>
      </section>
      <BidBox settings={s} claimOne={q.claimOne} enabled={razorpayConfigured()} />
      <div className="grid" style={{ marginTop: 32 }}>
        <Board initial={rows} />
        <ActivityFeed items={activity} />
      </div>
    </>
  );
}
