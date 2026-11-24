/**
 * One-shot link preview for a member-shared listing URL.
 *
 * Fetches ONLY the submitted URL, once, on submit (plus that host's robots.txt), with a polite UA, a short
 * timeout and a size cap, and reads ONLY the public Open Graph / Twitter-card <meta> tags in <head>.
 * No crawling, pagination, body/gallery scraping or refreshes.
 *
 * SSRF guards: https only, allowlisted hosts only (every redirect hop re-checked, max 3 hops), default port,
 * and every DNS answer is checked at connect time (no private/loopback/link-local/CGNAT/multicast addresses),
 * so DNS rebinding can't swap in an internal IP after the check.
 */
import https from "node:https";
import dns from "node:dns";
import net from "node:net";
import zlib from "node:zlib";
import type { LookupFunction } from "node:net";
import { SHARE_SITES, parseShareUrl, siteForHost, type ShareSite } from "./shared";

export const PREVIEW_UA =
  "SiftahLinkPreview/1.0 (+https://www.looterscomputas.online/auto; one-time preview of a member-shared link)";
const UA_TOKEN = "siftahlinkpreview";
const TIMEOUT_MS = 6000;
const PAGE_CAP = 600 * 1024;
const ROBOTS_CAP = 512 * 1024;
const MAX_REDIRECTS = 3;

// Local sandboxes that resolve every host to a 198.18.0.0/15 fake-IP proxy can opt in for testing only.
const DEV_ALLOW_BENCHMARK = process.env.NODE_ENV !== "production" && process.env.LINK_PREVIEW_DEV_ALLOW_198_18 === "1";

export function isPrivateIp(ip: string): boolean {
  if (DEV_ALLOW_BENCHMARK && /^198\.1[89]\./.test(ip)) return false;
  if (net.isIPv4(ip)) {
    const [a, b] = ip.split(".").map(Number);
    return (
      a === 0 || a === 10 || a === 127 || a >= 224 ||
      (a === 100 && b >= 64 && b <= 127) ||
      (a === 169 && b === 254) ||
      (a === 172 && b >= 16 && b <= 31) ||
      (a === 192 && (b === 168 || (b === 0 && ip.split(".")[2] === "0") || (b === 0 && ip.split(".")[2] === "2"))) ||
      (a === 198 && (b === 18 || b === 19)) ||
      (a === 198 && b === 51 && ip.split(".")[2] === "100") ||
      (a === 203 && b === 0 && ip.split(".")[2] === "113")
    );
  }
  if (net.isIPv6(ip)) {
    const v = ip.toLowerCase();
    const mapped = /^::ffff:(\d+\.\d+\.\d+\.\d+)$/.exec(v);
    if (mapped) return isPrivateIp(mapped[1]);
    return (
      v === "::" || v === "::1" || v.startsWith("fc") || v.startsWith("fd") || v.startsWith("fe8") || v.startsWith("fe9") ||
      v.startsWith("fea") || v.startsWith("feb") || v.startsWith("ff") || v.startsWith("64:ff9b") || v.startsWith("2001:db8") ||
      v.startsWith("::ffff:") || v.startsWith("100::")
    );
  }
  return true;
}

/** DNS lookup that refuses to connect to any non-public address. */
const safeLookup: LookupFunction = (hostname, options, callback) => {
  dns.lookup(hostname, { all: true, verbatim: true }, (err, addresses) => {
    if (err) return (callback as (e: Error | null, a?: unknown, f?: number) => void)(err);
    const list = (addresses as dns.LookupAddress[]) || [];
    if (!list.length || list.some((a) => isPrivateIp(a.address))) {
      return (callback as (e: Error | null) => void)(Object.assign(new Error("Blocked address"), { code: "EBLOCKED" }));
    }
    if ((options as { all?: boolean }).all) return (callback as (e: null, a: dns.LookupAddress[]) => void)(null, list);
    (callback as (e: null, a: string, f: number) => void)(null, list[0].address, list[0].family);
  });
};

type RawResponse = { status: number; headers: Record<string, string | string[] | undefined>; body: string; truncated: boolean };

class FetchError extends Error {
  constructor(public kind: "blocked" | "error", message: string) {
    super(message);
  }
}

function assertAllowed(u: URL) {
  if (u.protocol !== "https:" || u.username || u.password || (u.port && u.port !== "443")) throw new FetchError("blocked", "Disallowed URL");
  if (net.isIP(u.hostname.replace(/^\[|\]$/g, ""))) throw new FetchError("blocked", "IP literal");
  if (!siteForHost(u.hostname)) throw new FetchError("blocked", `Host not allowlisted: ${u.hostname}`);
}

/** Single GET with SSRF-safe DNS, timeout, and decompressed-size cap. Stops early once </head> is seen (HTML). */
function getOnce(u: URL, cap: number, stopAtHeadEnd: boolean, accept: string): Promise<RawResponse> {
  return new Promise((resolve, reject) => {
    const req = https.request(
      {
        protocol: "https:", hostname: u.hostname, port: 443, path: u.pathname + u.search, method: "GET",
        lookup: safeLookup, timeout: TIMEOUT_MS, servername: u.hostname,
        headers: {
          "User-Agent": PREVIEW_UA, Accept: accept, "Accept-Language": "en-NZ,en;q=0.8",
          "Accept-Encoding": "gzip, deflate, br",
        },
      },
      (res) => {
        const enc = String(res.headers["content-encoding"] || "").toLowerCase();
        let stream: NodeJS.ReadableStream = res;
        if (enc === "gzip" || enc === "x-gzip") stream = res.pipe(zlib.createGunzip());
        else if (enc === "deflate") stream = res.pipe(zlib.createInflate());
        else if (enc === "br") stream = res.pipe(zlib.createBrotliDecompress());
        const chunks: Buffer[] = [];
        let size = 0;
        let done = false;
        const finish = (truncated: boolean) => {
          if (done) return;
          done = true;
          clearTimeout(timer);
          resolve({ status: res.statusCode || 0, headers: res.headers, body: Buffer.concat(chunks).toString("utf8"), truncated });
          res.destroy();
        };
        if ((res.statusCode || 0) >= 300 && (res.statusCode || 0) < 400) return finish(false);
        stream.on("data", (c: Buffer) => {
          if (done) return;
          chunks.push(c);
          size += c.length;
          if (size >= cap) return finish(true);
          if (stopAtHeadEnd && /<\/head\s*>/i.test(c.toString("latin1"))) finish(true);
        });
        stream.on("end", () => finish(false));
        stream.on("error", (e: Error) => (done ? undefined : (clearTimeout(timer), reject(new FetchError("error", e.message)))));
      },
    );
    const timer = setTimeout(() => req.destroy(new Error("Timed out")), TIMEOUT_MS + 500);
    req.on("timeout", () => req.destroy(new Error("Timed out")));
    req.on("error", (e: Error & { code?: string }) => {
      clearTimeout(timer);
      reject(new FetchError(e.code === "EBLOCKED" ? "blocked" : "error", e.message));
    });
    req.end();
  });
}

/** GET following at most MAX_REDIRECTS redirects, each to an allowlisted https host. */
async function safeGet(start: URL, cap: number, stopAtHeadEnd: boolean, accept: string) {
  let u = start;
  for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
    assertAllowed(u);
    const r = await getOnce(u, cap, stopAtHeadEnd, accept);
    if (r.status >= 300 && r.status < 400 && r.headers.location) {
      u = new URL(String(r.headers.location), u);
      continue;
    }
    return { ...r, finalUrl: u };
  }
  throw new FetchError("blocked", "Too many redirects");
}

/* ------------------------------- robots.txt ------------------------------- */

export function robotsAllows(robots: string, path: string, ua = UA_TOKEN): boolean {
  type Group = { agents: string[]; rules: Array<{ allow: boolean; path: string }> };
  const groups: Group[] = [];
  let cur: Group | null = null;
  let lastWasAgent = false;
  for (const raw of robots.split(/\r?\n/)) {
    const line = raw.replace(/#.*$/, "").trim();
    const m = /^([a-z-]+)\s*:\s*(.*)$/i.exec(line);
    if (!m) continue;
    const key = m[1].toLowerCase();
    const val = m[2].trim();
    if (key === "user-agent") {
      if (!cur || !lastWasAgent) groups.push((cur = { agents: [], rules: [] }));
      cur.agents.push(val.toLowerCase());
      lastWasAgent = true;
    } else {
      lastWasAgent = false;
      if (cur && (key === "allow" || key === "disallow")) cur.rules.push({ allow: key === "allow", path: val });
    }
  }
  const mine = groups.filter((g) => g.agents.some((a) => a !== "*" && ua.includes(a)));
  const chosen = mine.length ? mine : groups.filter((g) => g.agents.includes("*"));
  let best: { allow: boolean; len: number } | null = null;
  for (const g of chosen) {
    for (const r of g.rules) {
      if (!r.path) continue; // "Disallow:" (empty) allows everything
      if (globMatch(r.path, path) && (!best || r.path.length > best.len || (r.path.length === best.len && r.allow))) {
        best = { allow: r.allow, len: r.path.length };
      }
    }
  }
  return best ? best.allow : true;
}

/** robots.txt path pattern match ("*" wildcard, trailing "$" anchor) without regex backtracking. */
export function globMatch(pattern: string, path: string): boolean {
  const anchored = pattern.endsWith("$");
  const parts = (anchored ? pattern.slice(0, -1) : pattern).split(/\*+/);
  if (!path.startsWith(parts[0])) return false;
  let pos = parts[0].length;
  for (let i = 1; i < parts.length; i++) {
    const last = i === parts.length - 1;
    if (last && anchored) {
      return path.length - parts[i].length >= pos && path.endsWith(parts[i]);
    }
    const at = path.indexOf(parts[i], pos);
    if (at < 0) return false;
    pos = at + parts[i].length;
  }
  return anchored ? pos === path.length : true;
}

async function robotsCheck(u: URL): Promise<boolean> {
  try {
    const r = await safeGet(new URL("/robots.txt", u), ROBOTS_CAP, false, "text/plain,*/*;q=0.5");
    if (r.status >= 400 && r.status < 500) return true; // no robots.txt → allowed
    if (r.status >= 500 || r.status === 0) return false; // server error → be conservative
    return robotsAllows(r.body, u.pathname + u.search);
  } catch {
    return false;
  }
}

/* ------------------------------ meta parsing ------------------------------ */

const ENTITIES: Record<string, string> = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " ", ndash: "–", mdash: "—", hellip: "…" };
export function decodeEntities(s: string) {
  return s.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (m, e: string) => {
    if (e[0] === "#") {
      const code = e[1].toLowerCase() === "x" ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10);
      return Number.isFinite(code) && code > 0 && code < 0x110000 ? String.fromCodePoint(code) : m;
    }
    return ENTITIES[e.toLowerCase()] ?? m;
  });
}

/** Read <meta property|name=… content=…> pairs from the document <head> only. */
export function readMeta(html: string): Map<string, string> {
  const headEnd = html.search(/<\/head\s*>|<body[\s>]/i);
  const head = headEnd > 0 ? html.slice(0, headEnd) : html.slice(0, 200_000);
  const out = new Map<string, string>();
  for (const tag of head.match(/<meta\b[^>]*>/gi) || []) {
    const attrs = new Map<string, string>();
    for (const a of tag.matchAll(/([a-zA-Z:_-]+)\s*=\s*("([^"]*)"|'([^']*)'|([^\s"'>]+))/g)) {
      attrs.set(a[1].toLowerCase(), a[3] ?? a[4] ?? a[5] ?? "");
    }
    const key = (attrs.get("property") || attrs.get("name") || "").toLowerCase();
    const content = attrs.get("content");
    if (key && content != null && !out.has(key)) out.set(key, decodeEntities(content).replace(/\s+/g, " ").trim());
  }
  return out;
}

const clip = (s: string | undefined, n: number) => {
  if (!s) return null;
  // eslint-disable-next-line no-control-regex
  const t = s.replace(/[\u0000-\u001F\u007F\u202A-\u202E\u2066-\u2069]/g, "").trim();
  if (!t) return null;
  return t.length > n ? `${t.slice(0, n - 1).trimEnd()}…` : t;
};

export function priceFromMeta(meta: Map<string, string>): number | null {
  const amount = meta.get("product:price:amount") || meta.get("og:price:amount");
  const currency = (meta.get("product:price:currency") || meta.get("og:price:currency") || "NZD").toUpperCase();
  if (amount && currency === "NZD") {
    const n = Number(amount.replace(/[^0-9.]/g, ""));
    if (Number.isFinite(n) && n > 0 && n <= 10_000_000) return Math.round(n);
  }
  for (const k of ["og:title", "twitter:title", "og:description", "twitter:description"]) {
    const m = /(?:NZ)?\$\s?(\d{1,3}(?:,\d{3})+|\d{3,8})(?:\.\d{2})?(?![\d,])/.exec(meta.get(k) || "");
    if (m) {
      const n = Number(m[1].replace(/,/g, ""));
      if (n > 0 && n <= 10_000_000) return n;
    }
  }
  return null;
}

export type Preview = {
  site: ShareSite;
  url: string;
  title: string | null;
  description: string | null;
  image: string | null;
  siteName: string | null;
  price: number | null;
  fetchStatus: "ok" | "no_og" | "blocked" | "robots" | "error";
  detail?: string;
};

/** Fetch one allowlisted listing URL once and extract only OG/Twitter card meta. Never throws. */
export async function fetchPreview(rawUrl: string): Promise<Preview | { error: string }> {
  const parsed = parseShareUrl(rawUrl);
  if ("error" in parsed) return parsed;
  const base: Preview = { site: parsed.site, url: parsed.url, title: null, description: null, image: null, siteName: SHARE_SITES[parsed.site].label, price: null, fetchStatus: "error" };
  const u = new URL(parsed.url);
  try {
    if (!(await robotsCheck(u))) return { ...base, fetchStatus: "robots", detail: "robots.txt disallows automated fetches of this page" };
    const r = await safeGet(u, PAGE_CAP, true, "text/html,application/xhtml+xml;q=0.9,*/*;q=0.1");
    const type = String(r.headers["content-type"] || "");
    if (r.status === 401 || r.status === 403 || r.status === 429) return { ...base, fetchStatus: "blocked", detail: `HTTP ${r.status}` };
    if (r.status < 200 || r.status >= 300) return { ...base, fetchStatus: "error", detail: `HTTP ${r.status}` };
    if (!/html/i.test(type)) return { ...base, fetchStatus: "no_og", detail: `Not HTML (${type || "unknown"})` };
    // If a redirect landed somewhere that isn't a single listing (login wall, home page), don't use its meta.
    const landed = parseShareUrl(r.finalUrl.toString());
    if ("error" in landed || landed.site !== parsed.site) return { ...base, fetchStatus: "blocked", detail: `Redirected to ${r.finalUrl.pathname}` };
    const meta = readMeta(r.body);
    const title = clip(meta.get("og:title") || meta.get("twitter:title"), 200);
    const description = clip(meta.get("og:description") || meta.get("twitter:description"), 200);
    let image: string | null = null;
    const img = meta.get("og:image:secure_url") || meta.get("og:image") || meta.get("twitter:image") || meta.get("twitter:image:src");
    if (img) {
      try {
        const iu = new URL(img, r.finalUrl);
        if (iu.protocol === "https:" && iu.toString().length <= 1000 && !net.isIP(iu.hostname)) image = iu.toString();
      } catch {
        /* ignore bad image URL */
      }
    }
    const siteName = clip(meta.get("og:site_name"), 60) || base.siteName;
    if (!title && !description && !image) return { ...base, fetchStatus: "no_og", detail: "No Open Graph tags" };
    return { ...base, title, description, image, siteName, price: priceFromMeta(meta), fetchStatus: "ok" };
  } catch (e) {
    const err = e as FetchError;
    return { ...base, fetchStatus: err.kind === "blocked" ? "blocked" : "error", detail: err.message };
  }
}
