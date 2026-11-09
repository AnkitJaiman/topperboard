"use client";
import { useEffect } from "react";
/** Hides favicons that fail to load so the letter fallback shows (works for server-rendered lists). */
export default function FavFix() {
  useEffect(() => {
    const hide = (img: HTMLImageElement) => { img.style.display = "none"; };
    const check = () => document.querySelectorAll<HTMLImageElement>("img[data-fav]").forEach((img) => {
      if (img.complete && img.naturalWidth === 0) hide(img); else img.onerror = () => hide(img);
    });
    check();
    const mo = new MutationObserver(check);
    mo.observe(document.body, { childList: true, subtree: true });
    return () => mo.disconnect();
  }, []);
  return null;
}
