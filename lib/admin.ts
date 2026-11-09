import { cookies, headers } from "next/headers";
import { q, q1 } from "./db";
import { hmacHex, safeEqual, secret } from "./util";

const COOKIE = "tb_admin";
const TTL = 60 * 60 * 12; // 12 hours

/** Session "epoch": logging out bumps it, which invalidates every admin cookie issued before. */
async function epoch(): Promise<number> {
  const r = await q1<{ value: number }>("select value from settings where key='admin_epoch'");
  return Number(r?.value ?? 0);
}

export async function makeSession(): Promise<string> {
  const exp = Math.floor(Date.now() / 1000) + TTL;
  const ep = await epoch();
  return `${exp}.${ep}.${hmacHex(secret(), `admin:${exp}:${ep}`)}`;
}

export async function validSession(v: string | undefined): Promise<boolean> {
  if (!v) return false;
  const [exp, ep, sig] = v.split(".");
  if (!exp || !ep || !sig || Number(exp) < Date.now() / 1000) return false;
  if (!safeEqual(hmacHex(secret(), `admin:${exp}:${ep}`), sig)) return false;
  return Number(ep) === (await epoch());
}

export async function isAdmin(): Promise<boolean> {
  return validSession(cookies().get(COOKIE)?.value);
}

/** Log out everywhere: every existing admin cookie stops working. */
export async function endAllSessions() {
  await q(`insert into settings (key, value) values ('admin_epoch', 1)
           on conflict (key) do update set value = settings.value + 1`);
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
