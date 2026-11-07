import { SITE } from "@/lib/site";

export const metadata = { title: "Contact" };

export default function Contact() {
  return (
    <article className="prose">
      <h1>Contact</h1>
      <p>Help with listings, payments, refunds or anything else.</p>
      <h2>Support</h2>
      <p>Email: <a href={`mailto:${SITE.email}`}>{SITE.email}</a><br />We reply within 1 working day. Please include your Razorpay payment ID.</p>
      <h2>Business details</h2>
      <p><b>{SITE.owner}</b> (trading as Topper Board)<br />{SITE.address}</p>
      <h2>Report a listing</h2>
      <p>Seen something misleading, unsafe or impersonating someone? Email us the listing link. We act on valid reports within 72 hours.</p>
      <h2>Grievance Officer</h2>
      <p><b>{SITE.grievanceOfficer}</b><br />{SITE.address}<br /><a href={`mailto:${SITE.email}`}>{SITE.email}</a><br />Acknowledged within 24 hours, resolved within 15 days.</p>
    </article>
  );
}
