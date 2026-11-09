"use client";
import { useEffect } from "react";

/** Removes one-time query flags (like ?new=1) from the address bar so a reload or shared link doesn't repeat the message. */
export default function ClearParam() {
  useEffect(() => { history.replaceState(null, "", location.pathname + location.hash); }, []);
  return null;
}
