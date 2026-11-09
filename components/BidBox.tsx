"use client";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import CategorySelect from "./CategorySelect";
import { payAndClaim } from "./checkout";

type Settings = { min_bid: number; min_increment: number; max_payment: number };
type Quote = { rank: number; categoryRank: number; claimOne: number; categoryClaimOne: number; min: number };
const inr = (n: number) => "₹" + n.toLocaleString("en-IN");

export default function BidBox({ settings, claimOne, enabled, fixedCategory = null }: { settings: Settings; claimOne: number; enabled: boolean; fixedCategory?: string | null }) {
  const router = useRouter();
  const [url, setUrl] = useState("");
  const [category, setCategory] = useState<string | null>(fixedCategory);
  const [amount, setAmount] = useState(Math.min(claimOne, settings.max_payment));
  const [meta, setMeta] = useState<{ title: string; description: string; favicon: string | null; domain: string; existing?: { id: number; title: string } | null } | null>(null);
  const [loadingMeta, setLoadingMeta] = useState(false);
  const [iconOk, setIconOk] = useState(true);
  // The starting amount is the price of #1, so the first render can already say #1.
  const [quote, setQuote] = useState<Quote | null>({ rank: 1, categoryRank: 1, claimOne, categoryClaimOne: claimOne, min: settings.min_bid });
  const [touched, setTouched] = useState(false);
  const [capNote, setCapNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [ok, setOk] = useState("");
  const lastUrl = useRef("");

  // Every 20 s, re-check the price of #1 so the headline doesn't go stale when someone else bids.
  useEffect(() => {
    const t = setInterval(async () => {
      if (document.hidden) return;
      const r = await fetch(`/api/quote?amount=${amount}&category=${encodeURIComponent(category || "Other")}`).catch(() => null);
      if (!r?.ok) return;
      const j = await r.json();
      setQuote(j);
      if (!touched) setAmount(Math.min(category ? j.categoryClaimOne : j.claimOne, settings.max_payment));
    }, 20000);
    return () => clearInterval(t);
  }, [amount, category, touched]); // eslint-disable-line

  // Live position preview.
  useEffect(() => {
    const t = setTimeout(async () => {
      if (!Number.isInteger(amount) || amount < 0) return setQuote(null);
      const r = await fetch(`/api/quote?amount=${amount}&category=${encodeURIComponent(category || "Other")}`).catch(() => null);
      if (r?.ok) setQuote(await r.json());
    }, 200);
    return () => clearTimeout(t);
  }, [amount, category]);

  async function pickCategory(c: string | null) {
    setCategory(c);
    if (touched || !c) return;
    const r = await fetch(`/api/quote?amount=0&category=${encodeURIComponent(c)}`).catch(() => null);
    if (r?.ok) { const j = await r.json(); setAmount(Math.min(j.categoryClaimOne, settings.max_payment)); }
  }

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

  const step = (d: number) => {
    setTouched(true); setCapNote("");
    setAmount((a) => Math.max(settings.min_bid, Math.min(settings.max_payment, (Number.isInteger(a) ? a : 0) + d * settings.min_increment)));
  };
  function typeAmount(raw: string) {
    setTouched(true);
    const v = raw.split(".")[0].replace(/[^0-9]/g, "");
    let n = v ? Number(v) : 0;
    if (n > settings.max_payment) { n = settings.max_payment; setCapNote(`Maximum ${inr(settings.max_payment)} per payment. You can add more later.`); }
    else setCapNote("");
    setAmount(n);
  }

  async function claim(e?: React.FormEvent) {
    e?.preventDefault();
    setErr(""); setOk("");
    if (!url.trim()) return setErr("Enter your website link");
    if (!category) return setErr("Choose a category");
    if (!Number.isInteger(amount) || amount < settings.min_bid) return setErr(`Minimum bid is ${inr(settings.min_bid)}`);
    if (amount > settings.max_payment) return setErr(`Maximum single payment is ${inr(settings.max_payment)}`);
    if (meta?.existing) return router.push(`/l/${meta.existing.id}`);
    setBusy(true);
    const fresh = await fetch(`/api/quote?amount=${amount}&category=${encodeURIComponent(category)}`).then((r) => (r.ok ? r.json() : null)).catch(() => null);
    if (fresh && quote && fresh.categoryRank !== quote.categoryRank) {
      setQuote(fresh); setBusy(false);
      return setErr(`Rankings just changed: ${inr(amount)} now gets #${fresh.categoryRank} in ${category}. Press Claim rank again, or raise your bid.`);
    }
    try {
      const res = await payAndClaim({ url, category, amount, title: meta?.title, description: meta?.description, favicon: meta?.favicon });
      if (res.status === "paid") { setOk(`Verified. You're #${res.rank} overall. Opening your listing…`); router.push(`/l/${res.listingId}?new=1`); router.refresh(); }
      else if (res.status === "cancelled" || res.status === "failed") setErr(res.message);
      else setOk(res.message);
    } catch (e: any) {
      setErr(e.message);
      if (e.listingId) router.push(`/l/${e.listingId}`);
    } finally { setBusy(false); }
  }

  const valid = Number.isInteger(amount) && amount >= settings.min_bid;
  const rank = quote && valid ? (category ? quote.categoryRank : quote.rank) : null;
  const shown = amount.toLocaleString("en-IN");
  const width = Math.max(2, shown.length) * 0.56 + 0.2;
  const where = category ? ` in ${category}` : "";
  let line: React.ReactNode = `Minimum bid ${inr(settings.min_bid)}, in steps of ${inr(settings.min_increment)}`;
  if (valid && quote) {
    if (category) line = quote.rank === 1 ? <>That&apos;s also <b>#1 overall</b>.</> : <>That&apos;s <b>#{quote.rank}</b> overall. #1 overall costs <b>{inr(quote.claimOne)}</b>.</>;
    else line = quote.rank === 1 ? <>That&apos;s the top spot overall.</> : <>#1 overall costs <b>{inr(quote.claimOne)}</b>.</>;
  }
  const needed = category ? quote?.categoryClaimOne : quote?.claimOne;
  if (valid && needed && needed > settings.max_payment && rank !== 1)
    line = <>#1 needs {inr(needed)}, more than the {inr(settings.max_payment)} limit per payment. List now, then raise your bid from your listing page.</>;
  return (
    <section className="claim" id="claim" aria-labelledby="claimH">
      <div className="claim-head">
        <h1 id="claimH">Claim {rank ? `#${rank}` : "a rank"}{category ? <> in <span className="claim-cat">{category}</span></> : null} for<span className="sr"> {inr(amount)}</span></h1>
        <div className="claim-amt" role="group" aria-label="Bid amount">
          <button type="button" aria-label={`Decrease by ₹${settings.min_increment}`} onClick={() => step(-1)} disabled={amount <= settings.min_bid}>−</button>
          <span className="cur" aria-hidden>₹</span>
          <input id="amt" aria-label="Bid amount in rupees" inputMode="numeric" style={{ width: `${width}em` }} value={shown}
            onChange={(e) => typeAmount(e.target.value)} />
          <button type="button" aria-label={`Increase by ₹${settings.min_increment}`} onClick={() => step(1)} disabled={amount >= settings.max_payment}>+</button>
        </div>
      </div>
      <p className="claim-sub">Every position here is bought openly. The higher your total bid, the higher you rank{where ? " in this category" : ""}. Pay once, in rupees.</p>
      <form className="claim-row" onSubmit={claim} noValidate>
        <label className="sr" htmlFor="claim-url">Website link</label>
        <input id="claim-url" className="input" placeholder="Your website, product or profile link" inputMode="url" autoComplete="url"
          value={url} onChange={(e) => { setUrl(e.target.value); if (e.target.value.trim() !== lastUrl.current) setMeta(null); }} onBlur={lookup} aria-invalid={err === "Enter your website link" || undefined} />
        <CategorySelect value={category} onChange={pickCategory} label="Category" />
        <button className="btn gold" type="submit" disabled={busy || !enabled}>
          {!enabled ? "Opening soon" : busy ? "Opening payment…" : "Claim rank"}
        </button>
      </form>
      {!enabled && <div className="fine" style={{ textAlign: "center" }}>Payments are being set up. Bidding opens soon.</div>}
      {loadingMeta && <div className="small muted" role="status">Reading your website…</div>}
      {meta && !meta.existing && (
        <div className="preview">
          <span className="fav">{meta.favicon && iconOk ? <img src={meta.favicon} alt="" onError={() => setIconOk(false)} /> : meta.domain[0]?.toUpperCase()}</span>
          <div style={{ flex: 1, minWidth: 0, display: "grid", gap: 6 }}>
            <label className="small muted" htmlFor="claim-title">Title shown on the board</label>
            <input id="claim-title" className="input" maxLength={60} value={meta.title} onChange={(e) => setMeta({ ...meta, title: e.target.value })} />
            <label className="small muted" htmlFor="claim-desc">Short description (optional)</label>
            <input id="claim-desc" className="input" maxLength={140} value={meta.description} onChange={(e) => setMeta({ ...meta, description: e.target.value })} />
          </div>
        </div>
      )}
      {meta?.existing && <div className="quote">This website is already on the board. <a href={`/l/${meta.existing.id}`}>Increase its bid</a></div>}
      <div className="quote" aria-live="polite">{capNote ? <span className="err">{capNote}</span> : line}</div>
      {err && <div className="err" role="alert">{err}</div>}
      {ok && <div className="okmsg" role="status">{ok}</div>}
    </section>
  );
}
