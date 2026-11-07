import { cookies, headers } from "next/headers";
import { hmacHex, safeEqual, secret } from "./util";

const COOKIE = "tb_admin";
const TTL = 60 * 60 * 12; // 12 hours

export function makeSession(): string {
  const exp = Math.floor(Date.now() / 1000) + TTL;
  return `${exp}.${hmacHex(secret(), "admin:" + exp)}`;
}

export function validSession(v: string | undefined): boolean {
  if (!v) return false;
  const [exp, sig] = v.split(".");
  if (!exp || !sig || Number(exp) < Date.now() / 1000) return false;
  return safeEqual(hmacHex(secret(), "admin:" + exp), sig);
}

export function isAdmin(): boolean {
  return validSession(cookies().get(COOKIE)?.value);
}

/** Same-origin check for admin form posts (with SameSite=Strict cookies this blocks CSRF). */
export function sameOrigin(): boolean {
  const h = headers();
  const origin = h.get("origin");
  const host = h.get("x-forwarded-host") || h.get("host");
  if (!origin || !host) return false;
  try { return new URL(origin).host === host; } catch { return false; }
}

export function passwordOk(pw: unknown): boolean {
  const real = process.env.ADMIN_PASSWORD;
  if (!real || real.length < 10 || typeof pw !== "string") return false;
  return safeEqual(hmacHex(secret(), pw), hmacHex(secret(), real));
}

export const ADMIN_COOKIE = COOKIE;
export const ADMIN_TTL = TTL;
