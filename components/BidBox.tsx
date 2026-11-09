"use client";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import CategorySelect from "./CategorySelect";
import { payAndClaim } from "./checkout";

type Settings = { min_bid: number; min_increment: number; max_payment: number };
type Quote = { rank: number; categoryRank: number; claimOne: number; min: number };
const inr = (n: number) => "₹" + n.toLocaleString("en-IN");

export default function BidBox({ settings, claimOne, enabled }: { settings: Settings; claimOne: number; enabled: boolean }) {
  const router = useRouter();
  const [url, setUrl] = useState("");
  const [category, setCategory] = useState<string | null>(null);
  const [amount, setAmount] = useState(claimOne);
  const [meta, setMeta] = useState<{ title: string; description: string; favicon: string | null; domain: string; existing?: { id: number; title: string } | null } | null>(null);
  const [loadingMeta, setLoadingMeta] = useState(false);
  const [iconOk, setIconOk] = useState(true);
  const [quote, setQuote] = useState<Quote | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [ok, setOk] = useState("");
  const lastUrl = useRef("");

  // Live position preview.
  useEffect(() => {
    const t = setTimeout(async () => {
      if (!Number.isInteger(amount) || amount < 0) return setQuote(null);
      const r = await fetch(`/api/quote?amount=${amount}&category=${encodeURIComponent(category || "Other")}`).catch(() => null);
      if (r?.ok) setQuote(await r.json());
    }, 200);
    return () => clearTimeout(t);
  }, [amount, category]);

  async function lookup() {
    const u = url.trim();
    if (!u || u === lastUrl.current) return;
    lastUrl.current = u;
    setLoadingMeta(true); setErr("");
    try {
      const r = await fetch("/api/meta", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ url: u }) });
      const j = await r.json();
      if (!r.ok) { setMeta(null); setErr(j.error || "Couldn't read that link"); }
      else { setIconOk(true); setMeta(j); }
    } finally { setLoadingMeta(false); }
  }

  const step = (d: number) => setAmount((a) => Math.max(0, Math.min(settings.max_payment, (Number.isInteger(a) ? a : 0) + d * settings.min_increment)));

  async function claim() {
    setErr(""); setOk("");
    if (!url.trim()) return setErr("Enter your website link");
    if (!category) return setErr("Choose a category");
    if (!Number.isInteger(amount) || amount < settings.min_bid) return setErr(`Minimum bid is ${inr(settings.min_bid)}`);
    if (amount > settings.max_payment) return setErr(`Maximum single payment is ${inr(settings.max_payment)}`);
    if (meta?.existing) return router.push(`/l/${meta.existing.id}`);
    setBusy(true);
    try {
      const res = await payAndClaim({ url, category, amount, title: meta?.title, description: meta?.description, favicon: meta?.favicon });
      if (res.status === "paid") { setOk(`Verified. You're #${res.rank}. Opening your listing…`); router.push(`/l/${res.listingId}?new=1`); router.refresh(); }
      else if (res.status === "cancelled" || res.status === "failed") setErr(res.message);
      else setOk(res.message);
    } catch (e: any) {
      setErr(e.message);
      if (e.listingId) router.push(`/l/${e.listingId}`);
    } finally { setBusy(false); }
  }

  const valid = Number.isInteger(amount) && amount >= settings.min_bid;
  return (
    <div className="bidbox" id="claim">
      <div className="row wrapm">
        <input className="input" placeholder="yourwebsite.com" aria-label="Website link" inputMode="url" autoComplete="url"
          value={url} onChange={(e) => { setUrl(e.target.value); setMeta(null); }} onBlur={lookup} />
        <CategorySelect value={category} onChange={setCategory} />
      </div>
      {loadingMeta && <div className="small muted">Reading your website…</div>}
      {meta && !meta.existing && (
        <div className="preview">
          <span className="fav">{meta.favicon && iconOk ? <img src={meta.favicon} alt="" onError={() => setIconOk(false)} /> : meta.domain[0]?.toUpperCase()}</span>
          <div style={{ flex: 1, minWidth: 0, display: "grid", gap: 6 }}>
            <input className="input" aria-label="Title" maxLength={60} value={meta.title} onChange={(e) => setMeta({ ...meta, title: e.target.value })} />
            <input className="input" aria-label="Short description" maxLength={140} placeholder="Short description (optional)" value={meta.description} onChange={(e) => setMeta({ ...meta, description: e.target.value })} />
          </div>
        </div>
      )}
      {meta?.existing && <div className="quote">This website is already on the board. <a href={`/l/${meta.existing.id}`} style={{ color: "var(--link)" }}>Increase its bid</a></div>}
      <div className="row flex">
        <div className="stepper">
          <button type="button" aria-label={`Decrease by ₹${settings.min_increment}`} onClick={() => step(-1)}>−</button>
          <input aria-label="Bid amount in rupees" inputMode="numeric" value={Number.isFinite(amount) ? "₹" + amount.toLocaleString("en-IN") : "₹"}
            onChange={(e) => { const v = e.target.value.replace(/[^0-9]/g, ""); setAmount(v ? Math.min(Number(v), settings.max_payment * 10) : 0); }} />
          <button type="button" aria-label={`Increase by ₹${settings.min_increment}`} onClick={() => step(1)}>+</button>
        </div>
        <button className="btn gold" onClick={claim} disabled={busy || !enabled}>
          {!enabled ? "Payments opening soon" : busy ? "Opening payment…" : quote && valid ? `Claim #${quote.rank} for ${inr(amount)}` : "Claim rank"}
        </button>
      </div>
      <div className="quote muted" aria-live="polite">
        {!valid ? `Minimum bid is ${inr(settings.min_bid)} · steps of ${inr(settings.min_increment)}`
          : quote ? <>You&apos;d be <b>#{quote.rank}</b> overall{category ? <> · <b>#{quote.categoryRank}</b> in {category}</> : null} · #1 costs <b>{inr(quote.claimOne)}</b></> : `#1 costs ${inr(claimOne)}`}
      </div>
      {err && <div className="err" role="alert">{err}</div>}
      {ok && <div className="okmsg" role="status">{ok}</div>}
      <div className="fine">UPI, cards and net banking via Razorpay. Your rank changes only after the payment is verified. <a href="/rules">How ranking works</a></div>
    </div>
  );
}
