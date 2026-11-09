"use client";
import { useEffect } from "react";

/** Tells the server about this visit once per browser session (anonymous, no cookies). */
export default function VisitBeacon() {
  useEffect(() => {
    try { if (sessionStorage.getItem("tb_v")) return; sessionStorage.setItem("tb_v", "1"); } catch {}
    fetch("/api/visit", { method: "POST", keepalive: true }).catch(() => {});
  }, []);
  return null;
}
