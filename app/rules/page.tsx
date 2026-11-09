import { getSettings } from "@/lib/settings";

export const dynamic = "force-dynamic";
export const metadata = { title: "Rules" };

export default async function Rules() {
  const s = await getSettings();
  const inr = (n: number) => "₹" + n.toLocaleString("en-IN");
  return (
    <article className="prose">
      <h1>Rules</h1>
      <h2>Bidding</h2>
      <ul>
        <li>The minimum bid for a new listing is <b>{inr(s.min_bid)}</b>.</li>
        <li>Any higher total ranks above a lower one. The − / + buttons move in steps of <b>{inr(s.min_increment)}</b>, and the headline suggests the current top total plus {inr(s.min_increment)} so you stay ahead.</li>
        <li>The most you can pay in one payment is <b>{inr(s.max_payment)}</b>. You can add more with further payments.</li>
        <li>Bids are cumulative. Increasing your bid adds to your total; you pay only the extra amount.</li>
        <li>A verified total never goes down.</li>
      </ul>
      <h2>Ranking</h2>
      <ul>
        <li><b>All-time:</b> ranked by total verified bids. It never resets.</li>
        <li><b>Today:</b> ranked by what each listing paid during the current day in India (IST). It resets at midnight IST.</li>
        <li><b>Daily archive:</b> every past day keeps its own board, permanently.</li>
        <li><b>Category boards</b> show the same ranking filtered to one category.</li>
        <li><b>Ties:</b> when two totals are equal, the listing that reached that amount first ranks higher.</li>
        <li>Ranks change only after a payment is verified with Razorpay. Nothing is ranked on an unconfirmed payment.</li>
      </ul>
      <h2>Payments</h2>
      <p>Payments are processed by Razorpay (UPI, cards, net banking, wallets). Each payment is verified on our server and by Razorpay's webhook before it counts. Prices are in Indian Rupees. See the <a href="/refunds">Refund Policy</a>.</p>
      <h2>Listing eligibility</h2>
      <p>One listing per website address. You must have the right to promote the site. Not allowed: betting, gambling or real-money games; adult content; escort or dating services; investment tips, trading signals or guaranteed-return schemes; unlicensed financial, legal or medical services or claims; phishing, malware or impersonation; hate or defamatory content; and anything illegal in India. We may remove listings that break these rules.</p>
      <h2>Clicks</h2>
      <p>Click counts show unique visitors per day. Repeat clicks from the same visitor on the same day count once, and bots are ignored.</p>
    </article>
  );
}
