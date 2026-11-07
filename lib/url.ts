import dns from "dns/promises";
import net from "net";

export type CleanUrl = { url: string; urlKey: string; domain: string };

// Words that are never allowed in a listing (gambling, adult, scams). Moderation still reviews everything.
const BLOCKED = [
  "casino", "betting", "satta", "matka", "teen patti real cash", "rummy cash", "porn", "xxx", "escort",
  "call girl", "loan app", "double your money", "guaranteed return", "forex signal", "crack", "keygen",
];

export function blockedText(...parts: (string | undefined | null)[]): string | null {
  const t = parts.filter(Boolean).join(" ").toLowerCase();
  return BLOCKED.find((w) => t.includes(w)) || null;
}

/** Validate and normalise a public website URL. Returns null when invalid. */
export function cleanUrl(input: unknown): CleanUrl | null {
  if (typeof input !== "string") return null;
  let s = input.trim();
  if (!s || s.length > 300) return null;
  if (!/^[a-z][a-z0-9+.-]*:\/\//i.test(s)) {
    if (/^[a-z]+:/i.test(s)) return null; // mailto:, javascript:, tel: …
    s = "https://" + s;
  }
  let u: URL;
  try { u = new URL(s); } catch { return null; }
  if (u.protocol !== "https:" && u.protocol !== "http:") return null;
  if (u.username || u.password) return null;
  if (u.port && u.port !== "80" && u.port !== "443") return null;
  const host = u.hostname.toLowerCase().replace(/\.$/, "");
  if (!host.includes(".") || net.isIP(host.replace(/^\[|\]$/g, ""))) return null;
  if (/(^|\.)(localhost|local|internal|lan|home|corp|test|invalid|example)$/.test(host)) return null;
  if (!/^[a-z0-9.-]+$/.test(host)) return null; // punycode (xn--) is allowed, raw unicode is not
  u.hash = "";
  const domain = host.replace(/^www\./, "");
  const path = u.pathname.replace(/\/+$/, "");
  const urlKey = (domain + path + (u.search || "")).toLowerCase();
  return { url: u.toString(), urlKey, domain };
}

function privateIp(ip: string): boolean {
  if (net.isIPv4(ip)) {
    const [a, b] = ip.split(".").map(Number);
    return a === 10 || a === 127 || a === 0 || (a === 169 && b === 254) || (a === 172 && b >= 16 && b <= 31) ||
      (a === 192 && b === 168) || (a === 100 && b >= 64 && b <= 127) || a >= 224;
  }
  const x = ip.toLowerCase();
  return x === "::1" || x === "::" || x.startsWith("fc") || x.startsWith("fd") || x.startsWith("fe80") ||
    x.startsWith("::ffff:") && privateIp(x.slice(7));
}

/** Resolve the host and refuse private / internal addresses (SSRF guard for the metadata fetcher). */
export async function assertPublicHost(host: string): Promise<void> {
  const addrs = await dns.lookup(host, { all: true });
  if (!addrs.length || addrs.some((a) => privateIp(a.address))) throw new Error("host not public");
}

export type Meta = { title: string; description: string; favicon: string | null };

function decode(s: string) {
  return s.replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"')
    .replace(/&#39;|&#x27;/g, "'").replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n))).replace(/\s+/g, " ").trim();
}
function metaContent(html: string, attr: string, name: string): string | null {
  const re = new RegExp(`<meta[^>]+${attr}=["']${name}["'][^>]*>`, "i");
  const tag = html.match(re)?.[0];
  const c = tag?.match(/content=["']([^"']*)["']/i)?.[1];
  return c ? decode(c) : null;
}

/** Fetch title, description and favicon of a public page. Never throws; returns partial data on failure. */
export async function fetchMeta(start: string): Promise<Meta> {
  const fallbackIcon = (u: URL) => `${u.protocol}//${u.host}/favicon.ico`;
  let url = new URL(start);
  try {
    let res: Response | null = null;
    for (let hop = 0; hop < 4; hop++) {
      await assertPublicHost(url.hostname);
      res = await fetch(url, {
        redirect: "manual",
        signal: AbortSignal.timeout(6000),
        headers: { "user-agent": "TopperBoardBot/1.0 (+listing preview)", accept: "text/html" },
      });
      const loc = res.headers.get("location");
      if (res.status >= 300 && res.status < 400 && loc) {
        const next = new URL(loc, url);
        if (next.protocol !== "https:" && next.protocol !== "http:") throw new Error("bad redirect");
        url = next;
        continue;
      }
      break;
    }
    if (!res || !res.ok || !(res.headers.get("content-type") || "").includes("html")) {
      return { title: "", description: "", favicon: fallbackIcon(url) };
    }
    // Read at most 512 KB.
    const reader = res.body!.getReader();
    let html = "", size = 0;
    while (size < 512_000) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.length;
      html += new TextDecoder().decode(value);
    }
    reader.cancel().catch(() => {});
    const head = html.slice(0, 200_000);
    const title = metaContent(head, "property", "og:title") || decode(head.match(/<title[^>]*>([^<]*)<\/title>/i)?.[1] || "");
    const description = metaContent(head, "name", "description") || metaContent(head, "property", "og:description") || "";
    const iconTag = [...head.matchAll(/<link[^>]+rel=["'][^"']*icon[^"']*["'][^>]*>/gi)].map((m) => m[0])[0];
    const href = iconTag?.match(/href=["']([^"']+)["']/i)?.[1];
    let favicon = fallbackIcon(url);
    if (href) {
      try {
        const f = new URL(decode(href), url);
        if (f.protocol === "https:" || f.protocol === "http:") favicon = f.toString();
      } catch {}
    }
    return { title: title.slice(0, 80), description: description.slice(0, 160), favicon };
  } catch {
    return { title: "", description: "", favicon: fallbackIcon(url) };
  }
}
