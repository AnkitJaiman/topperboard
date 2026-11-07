import { SITE } from "@/lib/site";

export const metadata = { title: "About" };

export default function About() {
  return (
    <article className="prose">
      <h1>About Topper Board</h1>
      <p><b>Pay More. Rank Higher. Get Seen.</b></p>
      <p>Topper Board is a public leaderboard for websites, products and people, built for India. The rule is simple: listings are ranked by how much they have bid. Bid more and you move up. Everyone can see every bid.</p>
      <h2>Why it exists</h2>
      <p>Getting noticed online usually means fighting algorithms, ad auctions you can't see, or paid reviews. Topper Board is the opposite: a transparent board where position is bought openly, in rupees, and every visitor knows exactly how the ranking works.</p>
      <h2>How it works</h2>
      <ul>
        <li>Paste your link, pick one of 30 categories and choose your bid (from ₹99).</li>
        <li>Pay securely with UPI, cards or net banking through Razorpay.</li>
        <li>Once the payment is verified, your listing appears at the position your total bid earns.</li>
        <li>Want to climb? Increase your bid any time and pay only the extra amount.</li>
      </ul>
      <p>There are three ways to look at the board: <b>All-time</b> (total bids), <b>Today</b> (what was paid today, India time) and the <b>Daily</b> archive of every past day.</p>
      <h2>What it is not</h2>
      <p>A Topper Board rank is a paid, sponsored placement. It is not a review, rating, award or endorsement of quality.</p>
      <h2>Who runs it</h2>
      <p>Topper Board is founded and operated by <b>{SITE.owner}</b>, {SITE.city}, India. Contact: <a href={`mailto:${SITE.email}`}>{SITE.email}</a>.</p>
    </article>
  );
}
