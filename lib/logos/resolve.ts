import { lookup } from "node:dns/promises";
import { isIP } from "node:net";

/* Finding a brand's logo at its own domain. SERVER ONLY.
 *
 * WHY NOT A THIRD PARTY. Clearbit or Google's favicon service would be one line
 * — and would send the agency's entire client list to someone else, on every
 * render, in exchange for not writing the parser below. The brands publish
 * their own marks; we can just read them.
 *
 * WHY NOT AN AGENT. This is "find the icon file at a known domain", which is
 * four conventions and a preference order. An LLM would make it slower,
 * non-deterministic, and capable of confidently returning a URL that 404s.
 * Judgement is not the scarce resource here.
 *
 * ORDER MATTERS, because the sources differ enormously in quality:
 *   1. apple-touch-icon   — conventionally 180x180, square, no padding. Best.
 *   2. web app manifest   — 192/512 icons, usually the same asset.
 *   3. <link rel="icon">  — often an SVG, which is ideal when it is one.
 *   4. /favicon.ico       — 16-32px. Renders as mush at 34px, so it is last.
 *
 * SSRF. A domain is typed by a human into a form, and this code then makes the
 * SERVER fetch it. Without a guard, "localhost", "169.254.169.254" or an
 * internal hostname would make Relay fetch its own infrastructure and hand the
 * result back. Every hostname is resolved and checked against private ranges
 * before a single request goes out, and again on redirect. */

const TIMEOUT_MS = 6000;
const MAX_BYTES = 2 * 1024 * 1024;
/* Some sites refuse an obviously-scripted client. This is honest about being a
   fetcher while still being accepted by the CDNs that gate on empty UAs. */
const UA = "RelayBot/1.0 (+client logo lookup; contact your Relay admin)";

export type ResolvedLogo = {
  bytes: Uint8Array;
  contentType: string;
  /** The URL the bytes came from — shown to the admin so they can judge it. */
  sourceUrl: string;
};

/** Is this address one the public internet can reach? */
function isPublicAddress(address: string): boolean {
  if (isIP(address) === 6) {
    const a = address.toLowerCase();
    // Loopback, link-local, unique-local, unspecified.
    if (a === "::1" || a === "::") return false;
    if (a.startsWith("fe80") || a.startsWith("fc") || a.startsWith("fd"))
      return false;
    // IPv4-mapped (::ffff:a.b.c.d) — check the embedded v4 address.
    const mapped = a.match(/::ffff:(\d+\.\d+\.\d+\.\d+)$/);
    return mapped ? isPublicAddress(mapped[1]!) : true;
  }
  const p = address.split(".").map(Number);
  if (p.length !== 4 || p.some((n) => !Number.isInteger(n) || n < 0 || n > 255))
    return false;
  const [a, b] = p as [number, number, number, number];
  if (a === 0 || a === 10 || a === 127) return false;
  if (a === 169 && b === 254) return false; // link-local, incl. cloud metadata
  if (a === 172 && b >= 16 && b <= 31) return false;
  if (a === 192 && b === 168) return false;
  if (a === 100 && b >= 64 && b <= 127) return false; // carrier-grade NAT
  if (a >= 224) return false; // multicast and reserved
  return true;
}

async function assertPublicHost(url: URL): Promise<void> {
  if (url.protocol !== "https:" && url.protocol !== "http:") {
    throw new Error(`Refusing to fetch a ${url.protocol} URL.`);
  }
  const literal = isIP(url.hostname);
  let addresses: { address: string }[];
  try {
    addresses = literal
      ? [{ address: url.hostname }]
      : await lookup(url.hostname, { all: true });
  } catch {
    // "getaddrinfo ENOTFOUND northbrook.com" is a stack trace wearing a
    // sentence. The admin needs to know the domain is wrong, not what libc
    // calls it.
    throw new Error(`${url.hostname} does not resolve — check the address.`);
  }
  if (addresses.length === 0) {
    throw new Error(`${url.hostname} does not resolve — check the address.`);
  }
  for (const { address } of addresses) {
    if (!isPublicAddress(address)) {
      throw new Error(`${url.hostname} resolves to a private address.`);
    }
  }
}

/** fetch(), but every hop is checked and nothing runs away with the process. */
async function safeFetch(url: string, accept: string): Promise<Response> {
  let current = new URL(url);
  for (let hop = 0; hop < 4; hop++) {
    await assertPublicHost(current);
    const response = await fetch(current, {
      redirect: "manual",
      headers: { "user-agent": UA, accept },
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    const location = response.headers.get("location");
    if (response.status >= 300 && response.status < 400 && location) {
      // Re-checked on the next pass — a redirect into 127.0.0.1 is the whole
      // reason redirects are followed by hand rather than by fetch().
      current = new URL(location, current);
      continue;
    }
    return response;
  }
  throw new Error("Too many redirects.");
}

async function readCapped(response: Response): Promise<Uint8Array> {
  const declared = Number(response.headers.get("content-length") ?? 0);
  if (declared > MAX_BYTES) throw new Error("Image is too large.");
  const buffer = new Uint8Array(await response.arrayBuffer());
  if (buffer.byteLength > MAX_BYTES) throw new Error("Image is too large.");
  return buffer;
}

/** Candidate URLs from a homepage's HTML, best first. */
function candidatesFromHtml(html: string, base: URL): string[] {
  const out: string[] = [];
  const links = Array.from(html.matchAll(/<link\b[^>]*>/gi));
  const byRel: Record<string, { href: string; size: number }[]> = {};

  for (const [tag] of links) {
    const rel = tag.match(/\brel=["']([^"']+)["']/i)?.[1]?.toLowerCase();
    const href = tag.match(/\bhref=["']([^"']+)["']/i)?.[1];
    if (!rel || !href) continue;
    // "apple-touch-icon-precomposed", "shortcut icon" — match on the word.
    const key = rel.includes("apple-touch-icon")
      ? "apple"
      : rel.includes("manifest")
        ? "manifest"
        : /\bicon\b/.test(rel)
          ? "icon"
          : null;
    if (!key) continue;
    const sizes = tag.match(/\bsizes=["'](\d+)x\d+["']/i)?.[1];
    (byRel[key] ??= []).push({ href, size: sizes ? Number(sizes) : 0 });
  }

  // Largest declared size first within each rel — a 180px icon beats a 32px one.
  const pick = (key: string) =>
    (byRel[key] ?? [])
      .sort((a, b) => b.size - a.size)
      .map((x) => new URL(x.href, base).toString());

  out.push(...pick("apple"), ...pick("manifest"), ...pick("icon"));
  return out;
}

async function iconsFromManifest(url: string, base: URL): Promise<string[]> {
  const response = await safeFetch(url, "application/manifest+json, application/json");
  if (!response.ok) return [];
  const manifest = JSON.parse(await response.text()) as {
    icons?: { src?: string; sizes?: string }[];
  };
  return (manifest.icons ?? [])
    .map((i) => ({
      src: i.src,
      size: Number(i.sizes?.split(/\s+/)[0]?.split("x")[0] ?? 0),
    }))
    .filter((i): i is { src: string; size: number } => Boolean(i.src))
    .sort((a, b) => b.size - a.size)
    .map((i) => new URL(i.src, base).toString());
}

/** Best logo we can find for a domain, or an error explaining why not. */
export async function resolveLogoFromWebsite(
  domain: string,
): Promise<ResolvedLogo> {
  const host = domain
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, "")
    .replace(/\/.*$/, "");
  if (!/^[a-z0-9-]+(\.[a-z0-9-]+)+$/.test(host)) {
    throw new Error(`"${domain}" is not a domain.`);
  }
  const base = new URL(`https://${host}/`);

  /* Checked ONCE, here, outside the loop below. The per-candidate catch exists
     to skip a 404 and try the next path — if the SSRF rejection went through it
     too, pointing Relay at 127.0.0.1 would report "no logo found" instead of
     "that is a private address", and a security guard that reports as a missing
     file is a guard nobody can tell is working. */
  await assertPublicHost(base);

  let candidates: string[] = [];
  try {
    const home = await safeFetch(base.toString(), "text/html");
    if (home.ok) {
      const html = (await home.text()).slice(0, 400_000);
      candidates = candidatesFromHtml(html, new URL(home.url || base));
    }
  } catch {
    // The homepage being unreadable does not mean the conventional paths are.
  }

  // The conventions, whether or not the HTML mentioned them.
  candidates.push(
    new URL("/apple-touch-icon.png", base).toString(),
    new URL("/favicon.ico", base).toString(),
  );

  const seen = new Set<string>();
  for (const candidate of candidates) {
    if (seen.has(candidate)) continue;
    seen.add(candidate);
    try {
      if (/manifest|\.webmanifest|manifest\.json/i.test(candidate)) {
        // Splice the manifest's icons in ahead of the remaining candidates.
        for (const icon of await iconsFromManifest(candidate, base)) {
          if (!seen.has(icon)) candidates.push(icon);
        }
        continue;
      }
      const response = await safeFetch(candidate, "image/*");
      if (!response.ok) continue;
      const contentType = (
        response.headers.get("content-type") ?? ""
      ).split(";")[0]!.trim();
      // A site that serves its own 404 page as HTML would otherwise be stored
      // as a "logo" and render as a broken image forever.
      if (!contentType.startsWith("image/")) continue;
      const bytes = await readCapped(response);
      if (bytes.byteLength < 100) continue; // a placeholder, not a mark
      return { bytes, contentType, sourceUrl: candidate };
    } catch {
      continue;
    }
  }

  throw new Error(`No logo found at ${host}.`);
}
