import { q } from "./db";

export type Settings = { min_bid: number; min_increment: number; max_payment: number };
export const DEFAULTS: Settings = { min_bid: 99, min_increment: 10, max_payment: 100000 };

export async function getSettings(): Promise<Settings> {
  const rows = await q<{ key: string; value: number }>("select key, value from settings");
  const s: Settings = { ...DEFAULTS };
  for (const r of rows) if (r.key in s) (s as any)[r.key] = Number(r.value);
  return s;
}
