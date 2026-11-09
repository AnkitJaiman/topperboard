"use client";
import { useEffect, useId, useRef, useState } from "react";
import { CATEGORIES } from "@/lib/categories";

type Props = { value: string | null; onChange: (name: string | null) => void; allowAll?: boolean; placeholder?: string; label?: string };

/**
 * Select-only combobox (WAI-ARIA pattern): the button owns focus, the list is referenced
 * with aria-activedescendant. Supports arrows, Home/End, type-ahead, Enter/Space, Escape and Tab.
 * Opens upward when there isn't room below (landscape phones, zoom).
 */
export default function CategorySelect({ value, onChange, allowAll, placeholder = "Choose a category", label = "Category" }: Props) {
  const opts = [...(allowAll ? [{ name: null as string | null, code: "ALL", label: "All categories" }] : []),
    ...CATEGORIES.map((c) => ({ name: c.name as string | null, code: c.code, label: c.name }))];
  const [open, setOpen] = useState(false);
  const [act, setAct] = useState(0);
  const [place, setPlace] = useState<{ up: boolean; max: number }>({ up: false, max: 320 });
  const ref = useRef<HTMLDivElement>(null);
  const btn = useRef<HTMLButtonElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const typed = useRef({ s: "", t: 0 });
  const lid = useId(), labId = useId();
  const cur = opts.find((o) => o.name === value);

  useEffect(() => {
    const off = (e: MouseEvent) => { if (!ref.current?.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("mousedown", off);
    return () => document.removeEventListener("mousedown", off);
  }, []);
  useEffect(() => {
    if (!open) return;
    const i = Math.max(0, opts.findIndex((o) => o.name === value));
    setAct(i);
    const r = btn.current!.getBoundingClientRect();
    const below = window.innerHeight - r.bottom - 12, above = r.top - 70;
    const up = below < 240 && above > below;
    setPlace({ up, max: Math.max(150, Math.min(320, up ? above : below)) });
    requestAnimationFrame(() => listRef.current?.children[i]?.scrollIntoView({ block: "nearest" }));
  }, [open]); // eslint-disable-line

  function move(n: number) {
    setAct(n);
    listRef.current?.children[n]?.scrollIntoView({ block: "nearest" });
  }
  function pick(i: number) { onChange(opts[i].name); setOpen(false); btn.current?.focus(); }
  function key(e: React.KeyboardEvent) {
    const k = e.key;
    if (!open) {
      if (k === "ArrowDown" || k === "ArrowUp" || k === "Enter" || k === " ") { e.preventDefault(); setOpen(true); }
      return;
    }
    if (k === "Escape") { e.preventDefault(); setOpen(false); return; }
    if (k === "Tab") { setOpen(false); return; }
    if (k === "ArrowDown") { e.preventDefault(); move(Math.min(opts.length - 1, act + 1)); return; }
    if (k === "ArrowUp") { e.preventDefault(); move(Math.max(0, act - 1)); return; }
    if (k === "Home") { e.preventDefault(); move(0); return; }
    if (k === "End") { e.preventDefault(); move(opts.length - 1); return; }
    if (k === "Enter" || k === " ") { e.preventDefault(); pick(act); return; }
    if (k.length === 1 && /\S/.test(k)) {
      const now = Date.now();
      typed.current = { s: (now - typed.current.t < 700 ? typed.current.s : "") + k.toLowerCase(), t: now };
      const i = opts.findIndex((o) => o.label.toLowerCase().startsWith(typed.current.s));
      if (i >= 0) move(i);
    }
  }

  return (
    <div className="dd" ref={ref} onBlur={(e) => { if (!ref.current?.contains(e.relatedTarget as Node)) setOpen(false); }}>
      <span id={labId} className="sr">{label}</span>
      <button ref={btn} type="button" role="combobox" aria-haspopup="listbox" aria-expanded={open} aria-controls={lid}
        aria-labelledby={`${labId} ${lid}-v`} aria-activedescendant={open ? `${lid}-${act}` : undefined}
        onClick={() => setOpen(!open)} onKeyDown={key}>
        <span id={`${lid}-v`} style={{ display: "flex", gap: 10, alignItems: "center", minWidth: 0 }}>
          {cur ? <><span className="code" aria-hidden>{cur.code}</span><span style={{ overflow: "hidden", textOverflow: "ellipsis" }}>{cur.label}</span></> : <span className="muted">{placeholder}</span>}
        </span>
        <span aria-hidden className="muted">▾</span>
      </button>
      {open && (
        <ul role="listbox" id={lid} ref={listRef} aria-labelledby={labId} tabIndex={-1}
          className={place.up ? "up" : ""} style={{ maxHeight: place.max }}>
          {opts.map((o, i) => (
            <li key={o.label} id={`${lid}-${i}`} role="option" aria-selected={o.name === value} className={i === act ? "act" : ""}
              onMouseEnter={() => setAct(i)} onMouseDown={(e) => e.preventDefault()} onClick={() => pick(i)}>
              <span className="code" aria-hidden>{o.code}</span>{o.label}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
