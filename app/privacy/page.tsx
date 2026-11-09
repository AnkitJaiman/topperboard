import { SITE } from "@/lib/site";

export const metadata = { title: "Privacy Policy" };

export default function Privacy() {
  return (
    <article className="prose">
      <h1>Privacy Policy</h1>
      <p className="small">Last updated: {SITE.updated}</p>
      <p>This policy explains how <b>{SITE.owner}</b> ("Topper Board", "we"), {SITE.address}, handles personal data, in line with the Digital Personal Data Protection Act, 2023 and the Information Technology Act, 2000.</p>
      <h2>What we collect and why</h2>
      <ul>
        <li><b>Listing details</b> (website link, title, description, category, bid amounts), to publish your listing. These are public.</li>
        <li><b>Payment records</b> from Razorpay: order and payment IDs, amount and status. Razorpay collects your phone, email and payment method under its own policy; we never see card numbers or UPI PINs.</li>
        <li><b>Click counts:</b> when someone visits a listing we store an anonymous, salted hash that changes every day, so a visitor is counted once per day. We do not store IP addresses for clicks.</li>
        <li><b>Security data:</b> a short-lived hashed form of your IP address for rate limiting, deleted within a day.</li>
        <li><b>Messages you send us</b>, so we can reply.</li>
      </ul>
      <p>We do not use advertising trackers or analytics cookies. The admin panel uses one essential login cookie.</p>
      <h2>Consent and your rights</h2>
      <p>By submitting a listing and paying, you consent to this processing. You can ask us to access, correct or delete your data, or withdraw consent, by emailing <a href={`mailto:${SITE.email}`}>{SITE.email}</a>. Payment records we must keep by law are retained. We reply within 15 days.</p>
      <h2>Sharing</h2>
      <p>We share data only with providers that run the service: Razorpay (payments), our database host (Supabase) and our web host. Some may process data outside India. We do not sell personal data.</p>
      <h2>Retention</h2>
      <p>Listings: while they are on the board and up to 90 days after removal. Payment records: as long as tax law requires. Click hashes: up to 2 years, as anonymous counts.</p>
      <h2>Children</h2>
      <p>Topper Board is for adults and businesses. We do not knowingly accept listings from children.</p>
      <h2>Grievance Officer</h2>
      <p><b>{SITE.grievanceOfficer}</b>, {SITE.address} · <a href={`mailto:${SITE.email}`}>{SITE.email}</a>. We acknowledge complaints within 24 hours and resolve them within 15 days. You may also complain to the Data Protection Board of India.</p>
    </article>
  );
}
