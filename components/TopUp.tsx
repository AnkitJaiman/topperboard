"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { payAndClaim } from "./checkout";

const inr = (n: number) => "₹" + n.toLocaleString("en-IN");

/** Increase an existing listing's bid. Only the extra amount is charged; the total never decreases. */
export default function TopUp({ listingId, total, minInc, max, enabled }: { listingId: number; total: number; minInc: number; max: number; enabled: boolean }) {
  const router = useRouter();
  const [amount, setAmount] = useState(minInc);
  const [q, setQ] = useState<{ rank: number; claimOne: number } | null>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; t: string } | null>(null);

  useEffect(() => {
    const t = setTimeout(async () => {
      const r = await fetch(`/api/quote?amount=${amount}&listingId=${listingId}`).catch(() => null);
      if (r?.ok) setQ(await r.json());
    }, 200);
    return () => clearTimeout(t);
  }, [amount, listingId]);

  async function go() {
    setMsg(null);
    if (!Number.isInteger(amount) || amount < minInc) return setMsg({ ok: false, t: `Minimum increase is ${inr(minInc)}` });
    if (amount > max) return setMsg({ ok: false, t: `Maximum single payment is ${inr(max)}` });
    setBusy(true);
    try {
      const r = await payAndClaim({ listingId, amount });
      if (r.status === "paid") { setMsg({ ok: true, t: `🎉 Done! You're now #${r.rank}.` }); router.refresh(); }
      else setMsg({ ok: r.status !== "cancelled" && r.status !== "failed", t: r.message });
    } catch (e: any) { setMsg({ ok: false, t: e.message }); }
    finally { setBusy(false); }
  }

  return (
    <div className="card bidbox" style={{ margin: 0 }}>
      <h2 className="sec-title" style={{ margin: 0 }}>Increase bid</h2>
      <div className="row flex">
        <div className="stepper">
          <button type="button" aria-label={`Decrease by ₹${minInc}`} onClick={() => setAmount((a) => Math.max(minInc, a - minInc))}>−</button>
          <input aria-label="Extra amount in rupees" inputMode="numeric" value={"₹" + amount.toLocaleString("en-IN")}
            onChange={(e) => { const v = e.target.value.replace(/[^0-9]/g, ""); setAmount(v ? Number(v) : 0); }} />
          <button type="button" aria-label={`Increase by ₹${minInc}`} onClick={() => setAmount((a) => Math.min(max, a + minInc))}>+</button>
        </div>
        <button className="btn gold" disabled={busy || !enabled} onClick={go}>
          {!enabled ? "Payments opening soon" : busy ? "Opening payment…" : `Pay ${inr(amount)}`}
        </button>
      </div>
      <div className="quote muted" aria-live="polite">
        New total <b>{inr(total + amount)}</b>{q && <> · you&apos;d be <b>#{q.rank}</b></>}
        {q && q.rank > 1 && <> · <button type="button" className="mono" style={{ background: "none", border: 0, color: "var(--link)", cursor: "pointer", padding: 0 }} onClick={() => setAmount(q.claimOne)}>take #1 for {inr(q.claimOne)}</button></>}
      </div>
      {msg && <div className={msg.ok ? "okmsg" : "err"} role="status">{msg.t}</div>}
    </div>
  );
}
