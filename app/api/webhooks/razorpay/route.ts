import { tx } from "@/lib/db";
import { webhookSignatureValid } from "@/lib/razorpay";
import { sha256 } from "@/lib/util";

export const dynamic = "force-dynamic";

/**
 * Razorpay webhook. Configure in Razorpay Dashboard > Webhooks with events:
 * payment.captured, payment.failed (order.paid is also accepted).
 * Each event is processed once (x-razorpay-event-id), inside one transaction with the ranking update.
 */
export async function POST(req: Request) {
  const raw = await req.text();
  if (!webhookSignatureValid(raw, req.headers.get("x-razorpay-signature"))) {
    return new Response("invalid signature", { status: 401 });
  }
  let evt: any;
  try { evt = JSON.parse(raw); } catch { return new Response("bad json", { status: 400 }); }
  const eventId = req.headers.get("x-razorpay-event-id") || "body:" + sha256(raw);
  const type = String(evt?.event || "");
  const payment = evt?.payload?.payment?.entity;
  const order = evt?.payload?.order?.entity;

  try {
    const out = await tx(async (c) => {
      const ins = await c.query("insert into webhook_events (event_id, event_type) values ($1,$2) on conflict do nothing", [eventId, type]);
      if (ins.rowCount === 0) return "duplicate";
      if ((type === "payment.captured" || type === "order.paid") && payment?.order_id && payment?.id) {
        const amount = Number(type === "order.paid" ? order?.amount_paid ?? payment.amount : payment.amount);
        const r = await c.query("select apply_payment($1,$2,$3) as r", [payment.order_id, payment.id, amount]);
        return r.rows[0].r.result as string;
      }
      if (type === "payment.failed" && payment?.order_id) {
        await c.query("update payments set status='failed', note=$2 where razorpay_order_id=$1 and status='created'",
          [payment.order_id, String(payment.error_description || "payment failed").slice(0, 200)]);
        return "failed";
      }
      return "ignored";
    });
    return new Response(out, { status: 200 });
  } catch (e) {
    console.error("webhook error", e);
    return new Response("error", { status: 500 }); // Razorpay retries
  }
}
