import { SITE } from "@/lib/site";
import { siteStats } from "@/lib/board";
import { getSettings } from "@/lib/settings";

export const dynamic = "force-dynamic";
export const metadata = { title: "About" };

const inr = (n: number) => "₹" + Number(n || 0).toLocaleString("en-IN");
const num = (n: number) => Number(n || 0).toLocaleString("en-IN");

export default async function About() {
  const [s, cfg] = await Promise.all([siteStats(), getSettings()]);
  return (
    <article className="prose">
      <h1>About</h1>
      <p>Topper Board is a public leaderboard for websites, products and people, made for India. One rule decides every position: the bigger your total bid, the higher you sit. Every bid is visible.</p>

      <h2>Live numbers</h2>
      <p>Straight from the database, updated on every visit.</p>
      <div className="live-stats" aria-label="Live numbers">
        <div className="ls"><b data-stat="visitors"><span className="live-dot" aria-hidden />{num(s.visitors)}</b><span>visitors</span></div>
        <div className="ls"><b data-stat="revenue">{inr(s.revenue)}</b><span>total bids</span></div>
        <div className="ls"><b data-stat="top">{inr(s.topAmount)}</b><span data-stat="topTitle">highest total bid{s.topTitle ? <> · <a href={`/l/${s.topId}`}>{s.topTitle}</a></> : null}</span></div>
        <div className="ls"><b data-stat="listed">{num(s.listed)}</b><span>listed</span></div>
        <div className="ls"><b data-stat="addedToday">{num(s.addedToday)}</b><span>added today</span></div>
        <div className="ls"><b data-stat="revenueToday">{inr(s.revenueToday)}</b><span>bids today</span></div>
      </div>
      <p className="small">Visitors are counted once per person per day using an anonymous code that changes daily. "Today" means India time and resets at midnight IST.</p>

      <h2>How it works</h2>
      <ul>
        <li>Paste your link, pick one of 30 categories and set your bid, from {inr(cfg.min_bid)}.</li>
        <li>Pay with UPI, cards or net banking through Razorpay.</li>
        <li>Once the payment is verified, your listing appears at the rank your total earns.</li>
        <li>Raise your bid any time. You pay only the extra amount.</li>
      </ul>
      <p>Three views: <b>All-time</b> (total bids), <b>Today</b> (what was paid today) and <b>Daily</b>, an archive of every past day.</p>

      <h2>What a rank means</h2>
      <p>Every position is a paid placement. A rank is not a review, rating or award.</p>

      <h2>Who runs it</h2>
      <p>Founded and run by <b>{SITE.owner}</b> in {SITE.city}. Write to <a href={`mailto:${SITE.email}`}>{SITE.email}</a>.</p>
    </article>
  );
}
