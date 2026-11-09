"use client";
import { useEffect, useId, useRef, useState } from "react";
import { CATEGORIES } from "@/lib/categories";

type Props = { value: string | null; onChange: (name: string | null) => void; allowAll?: boolean; placeholder?: string; id?: string };

/** Compact, scrollable, keyboard-accessible category dropdown (listbox pattern). */
export default function CategorySelect({ value, onChange, allowAll, placeholder = "Choose a category", id }: Props) {
  const opts = [...(allowAll ? [{ name: null as string | null, code: "ALL", label: "All categories" }] : []),
    ...CATEGORIES.map((c) => ({ name: c.name as string | null, code: c.code, label: c.name }))];
  const [open, setOpen] = useState(false);
  const [act, setAct] = useState(0);
  const ref = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const lid = useId();
  const cur = opts.find((o) => o.name === value);

  useEffect(() => {
    const off = (e: MouseEvent) => { if (!ref.current?.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("mousedown", off);
    return () => document.removeEventListener("mousedown", off);
  }, []);
  useEffect(() => {
    if (open) {
      const i = Math.max(0, opts.findIndex((o) => o.name === value));
      setAct(i);
      requestAnimationFrame(() => listRef.current?.children[i]?.scrollIntoView({ block: "nearest" }));
    }
  }, [open]); // eslint-disable-line

  function pick(i: number) { onChange(opts[i].name); setOpen(false); }
  function key(e: React.KeyboardEvent) {
    if (!open && (e.key === "ArrowDown" || e.key === "Enter" || e.key === " ")) { e.preventDefault(); setOpen(true); return; }
    if (!open) return;
    if (e.key === "Escape") { setOpen(false); return; }
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();
      const n = (act + (e.key === "ArrowDown" ? 1 : -1) + opts.length) % opts.length;
      setAct(n);
      listRef.current?.children[n]?.scrollIntoView({ block: "nearest" });
    }
    if (e.key === "Enter") { e.preventDefault(); pick(act); }
  }

  return (
    <div className="dd" ref={ref}>
      <button type="button" id={id} aria-haspopup="listbox" aria-expanded={open} aria-controls={lid} onClick={() => setOpen(!open)} onKeyDown={key}
        aria-activedescendant={open ? `${lid}-${act}` : undefined}>
        <span style={{ display: "flex", gap: 10, alignItems: "center", minWidth: 0 }}>{cur ? <><span className="code">{cur.code}</span><span style={{ overflow: "hidden", textOverflow: "ellipsis" }}>{cur.label}</span></> : <span className="muted">{placeholder}</span>}</span><span aria-hidden className="muted">▾</span>
      </button>
      {open && (
        <ul role="listbox" id={lid} ref={listRef} aria-label="Categories">
          {opts.map((o, i) => (
            <li key={o.label} id={`${lid}-${i}`} role="option" aria-selected={o.name === value} className={i === act ? "act" : ""}
              onMouseEnter={() => setAct(i)} onClick={() => pick(i)}>
              <span className="code" aria-hidden>{o.code}</span>{o.label}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
