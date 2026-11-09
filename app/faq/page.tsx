import { getSettings } from "@/lib/settings";
import { SITE } from "@/lib/site";

export const dynamic = "force-dynamic";
export const metadata = { title: "FAQ" };

export default async function Faq() {
  const s = await getSettings();
  const inr = (n: number) => "₹" + n.toLocaleString("en-IN");
  const items: [string, React.ReactNode][] = [
    ["How do I claim a position?", <>On the home page, paste your website link, choose a category, set your bid with the − / + buttons and press <b>Claim rank</b>. The headline shows the rank your bid gets. Pay with Razorpay and your listing appears once the payment is verified.</>],
    ["How do I take #1?", <>The home page headline starts at the current price of #1: the top total plus {inr(s.min_increment)}. On a category page it starts at the price of #1 in that category.</>],
    ["How do I increase my bid?", <>Open your listing (click its title on the board) and use <b>Increase bid</b>. You pay only the extra amount, and it is added to your total.</>],
    ["How are rankings decided?", <>Only by verified bid amounts. All-time uses total bids. Today uses what was paid today (IST). Equal totals: whoever got there first ranks higher.</>],
    ["How do payments work?", <>Through Razorpay: UPI, debit and credit cards, net banking and wallets. Razorpay emails you a receipt. Your rank changes only after we verify the payment.</>],
    ["What happens when someone outbids me?", <>Your listing stays on the board and moves down. You can increase your bid at any time to climb back.</>],
    ["How does the daily ranking work?", <>Each India calendar day has its own board, counting only what was paid that day. It resets at midnight IST, and every past day stays in the Daily archive.</>],
    ["Do listings expire?", <>No. Your listing and total stay on the all-time board for as long as Topper Board runs. If we ever close, we'll give 30 days' notice.</>],
    ["Is a high rank a sign of quality?", <>No. Every listing is a paid, sponsored placement. Ranks are not reviews or awards.</>],
    ["Can I get a refund?", <>Bids are final once your listing is live. If we remove your listing, or you were charged but it never appeared, or you were charged twice, we refund in full. See the <a href="/refunds">Refund Policy</a>.</>],
    ["I made a typo in my title or description", <>Email <a href={`mailto:${SITE.email}`}>{SITE.email}</a> with your payment reference and we'll fix it.</>],
  ];
  return (
    <article className="prose">
      <h1>FAQ</h1>
      {items.map(([q, a]) => <details className="faq" key={q}><summary>{q}</summary><p>{a}</p></details>)}
    </article>
  );
}
