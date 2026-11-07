import { SITE } from "@/lib/site";

export const metadata = { title: "Terms and Conditions" };

export default function Terms() {
  return (
    <article className="prose">
      <h1>Terms and Conditions</h1>
      <p className="small">Last updated: {SITE.updated}</p>
      <p>These terms are an agreement between you and <b>{SITE.owner}</b> ("Topper Board", "we"), {SITE.address}. By placing a bid you agree to them. You must be 18 or older, or acting for a business you are authorised to represent.</p>
      <h2>1. The service</h2>
      <p>Topper Board sells sponsored listings on a public leaderboard. Listings are ranked only by verified bid amounts as described in the <a href="/rules">Rules</a>. Bids are cumulative and a verified total never decreases. Your listing stays on the board for as long as Topper Board operates; if we close the service we will give at least 30 days' notice on the website.</p>
      <h2>2. Paid placement</h2>
      <p>A rank is a paid placement, not an award, rating, review or endorsement. If you mention your Topper Board rank in your own marketing, you must make clear that it is a paid or sponsored placement.</p>
      <h2>3. Your listing</h2>
      <p>You are responsible for the website, title and description you submit being accurate and lawful, and for having the right to promote them. Prohibited content is listed in the <a href="/rules">Rules</a>. We may edit or remove any listing that breaks the rules or on a valid legal complaint.</p>
      <h2>4. Payments and delivery</h2>
      <p>Prices are in Indian Rupees and shown before you pay. Payments are processed by Razorpay. Topper Board is a digital service; nothing is shipped. Your listing goes live, or your bid increase is applied, as soon as the payment is verified, usually within a minute. If it hasn't appeared within 24 hours, email us with your payment reference.</p>
      <h2>5. Refunds</h2>
      <p>See the <a href="/refunds">Refund Policy</a>. Whenever we remove a listing, we refund the amounts paid for it in full.</p>
      <h2>6. Liability</h2>
      <p>The service is provided "as is". We are not responsible for third-party websites linked from listings, or for the business results of a listing. Our total liability is limited to the amount you paid for the listing concerned.</p>
      <h2>7. Law and disputes</h2>
      <p>These terms are governed by the laws of India. Courts at {SITE.city} have jurisdiction, subject to your rights under the Consumer Protection Act, 2019.</p>
      <h2>8. Contact</h2>
      <p><a href={`mailto:${SITE.email}`}>{SITE.email}</a> · <a href="/contact">Contact page</a></p>
    </article>
  );
}
