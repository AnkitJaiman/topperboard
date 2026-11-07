import { SITE } from "@/lib/site";

export const metadata = { title: "Refund Policy" };

export default function Refunds() {
  return (
    <article className="prose">
      <h1>Refund &amp; Cancellation Policy</h1>
      <p className="small">Last updated: {SITE.updated}</p>
      <h2>Bids are final</h2>
      <p>A bid buys a sponsored listing and adds to its total. Being outbid, moving down the board or changing your mind does not qualify for a refund.</p>
      <h2>When we refund in full</h2>
      <ul>
        <li>We remove or reject your listing, for any reason;</li>
        <li>You were charged but your listing or bid increase never appeared;</li>
        <li>You were charged twice for the same payment.</li>
      </ul>
      <h2>How to ask</h2>
      <p>Email <a href={`mailto:${SITE.email}`}>{SITE.email}</a> within 7 days with your Razorpay payment ID. Approved refunds go back to the original payment method within 5–7 working days.</p>
      <h2>Cancellation</h2>
      <p>You can ask us to remove your listing at any time. Removal at your own request is not refunded; removal by us always is.</p>
    </article>
  );
}
