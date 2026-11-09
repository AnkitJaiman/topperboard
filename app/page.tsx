import BidBox from "@/components/BidBox";
import Board from "@/components/Board";
import ActivityFeed from "@/components/ActivityFeed";
import { allTime, quote, recentActivity, summary } from "@/lib/board";
import { razorpayConfigured } from "@/lib/razorpay";

export const dynamic = "force-dynamic";
const inr = (n: number) => "₹" + n.toLocaleString("en-IN");

export default async function Home() {
  const [rows, activity, q, sum] = await Promise.all([allTime(undefined, 50), recentActivity(10), quote(0, "Other"), summary()]);
  return (
    <>
      <section className="hero">
        <div>
          <h1>Claim #1 for <span className="price">{inr(q.claimOne)}</span></h1>
          <p className="tagline">Pay more. Rank higher. Get seen.</p>
          <div className="ticker">
            <div><span>Listed</span><b>{sum.listings.toLocaleString("en-IN")}</b></div>
            <div><span>Total bids</span><b>{inr(sum.total)}</b></div>
            <div><span>Paid today</span><b>{inr(sum.today)}</b></div>
            <div><span>Min bid</span><b>{inr(q.settings.min_bid)}</b></div>
          </div>
        </div>
        <BidBox settings={q.settings} claimOne={q.claimOne} enabled={razorpayConfigured()} />
      </section>
      <div className="grid">
        <Board initial={rows} />
        <ActivityFeed items={activity} />
      </div>
    </>
  );
}
