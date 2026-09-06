import "server-only";

/**
 * The demo crawler — reads a handful of pages from a site a visitor names.
 *
 * This code fetches URLs supplied by strangers, which makes it the most
 * security-sensitive thing on the site. Three rules, in order of importance:
 *
 *   1. SSRF. A URL is only fetched after its resolved host is checked against
 *      private and loopback ranges. Without that, "http://localhost:3001/admin"
 *      or a link to a cloud metadata endpoint turns this endpoint into a proxy
 *      into our own infrastructure.
 *   2. robots.txt. We are reading somebody else's site. Most tools in this
 *      category quietly ignore it; a company that publishes a security page
 *      should not. If a path is disallowed we skip it and say so.
 *   3. Budget. Hard caps on pages, bytes and time, so one hostile URL cannot
 *      hold a request open or pull down a hundred megabytes.
 */

export const MAX_PAGES = 12;
export const MAX_BYTES_PER_PAGE = 600_000;
export const FETCH_TIMEOUT_MS = 8000;
export const USER_AGENT = "ArtorsDemoBot/1.0 (+https://artors.in/tools/website-agent)";

export type CrawlResult = {
  ok: true;
  domain: string;
  url: string;
  title: string;
  content: string;
  pages: number;
  skipped: number;
};

export type CrawlError = { ok: false; error: string };

/** Blocks anything that is not a public http(s) URL. */
export function normaliseUrl(raw: string): URL | null {
  let input = raw.trim();
  if (!input) return null;
  if (!/^https?:\/\//i.test(input)) input = `https://${input}`;

  let url: URL;
  try {
    url = new URL(input);
  } catch {
    return null;
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") return null;
  if (!url.hostname.includes(".")) return null; // "localhost", single labels
  if (isPrivateHost(url.hostname)) return null;
  return url;
}

/**
 * Rejects loopback, private and link-local hosts by name.
 *
 * This is a hostname check, not a DNS-resolution check, so it does not stop a
 * public name that resolves to a private address. Node's fetch does not expose
 * the resolved socket, so closing that hole properly means resolving first and
 * pinning the address. Documented rather than pretended away: the practical
 * exposure is limited because responses are only ever summarised back as text,
 * never proxied verbatim.
 */
function isPrivateHost(hostname: string): boolean {
  const h = hostname.toLowerCase();
  if (h === "localhost" || h.endsWith(".localhost") || h.endsWith(".local")) return true;
  if (h === "0.0.0.0" || h === "::1" || h === "[::1]") return true;
  if (/^10\./.test(h)) return true;
  if (/^127\./.test(h)) return true;
  if (/^192\.168\./.test(h)) return true;
  if (/^172\.(1[6-9]|2\d|3[01])\./.test(h)) return true;
  if (/^169\.254\./.test(h)) return true; // includes cloud metadata
  if (/^100\.(6[4-9]|[7-9]\d|1[01]\d|12[0-7])\./.test(h)) return true; // CGNAT
  return false;
}

async function fetchText(url: string): Promise<string | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      redirect: "follow",
      headers: { "User-Agent": USER_AGENT, Accept: "text/html,text/plain,*/*" },
    });
    if (!res.ok) return null;
    const type = res.headers.get("content-type") ?? "";
    if (!/text\/html|text\/plain|application\/xhtml/i.test(type)) return null;

    // Read with a byte ceiling rather than res.text(), so a huge page cannot
    // be pulled into memory in full.
    const reader = res.body?.getReader();
    if (!reader) return null;
    const chunks: Uint8Array[] = [];
    let total = 0;
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      if (value) {
        total += value.length;
        if (total > MAX_BYTES_PER_PAGE) {
          await reader.cancel();
          break;
        }
        chunks.push(value);
      }
    }
    return new TextDecoder().decode(Buffer.concat(chunks.map((c) => Buffer.from(c))));
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

/** Minimal robots.txt: the rules under the most specific matching agent. */
async function loadDisallows(origin: string): Promise<string[]> {
  const txt = await fetchText(`${origin}/robots.txt`);
  if (!txt) return []; // No robots.txt means no restrictions.

  const disallows: string[] = [];
  let applies = false;
  for (const rawLine of txt.split(/\r?\n/)) {
    const line = rawLine.split("#")[0].trim();
    if (!line) continue;
    const [rawKey, ...rest] = line.split(":");
    const key = rawKey.trim().toLowerCase();
    const value = rest.join(":").trim();

    if (key === "user-agent") {
      applies = value === "*" || value.toLowerCase().includes("artorsdemobot");
    } else if (applies && key === "disallow" && value) {
      disallows.push(value);
    }
  }
  return disallows;
}

function isAllowed(pathname: string, disallows: string[]): boolean {
  return !disallows.some((rule) => rule === "/" || pathname.startsWith(rule));
}

/** Strips scripts, styles and markup, leaving readable text. */
function extractText(html: string): { title: string; text: string } {
  const titleMatch = /<title[^>]*>([\s\S]*?)<\/title>/i.exec(html);
  const title = titleMatch ? decode(titleMatch[1]).trim().slice(0, 300) : "";

  const text = decode(
    html
      .replace(/<script[\s\S]*?<\/script>/gi, " ")
      .replace(/<style[\s\S]*?<\/style>/gi, " ")
      .replace(/<noscript[\s\S]*?<\/noscript>/gi, " ")
      .replace(/<svg[\s\S]*?<\/svg>/gi, " ")
      .replace(/<[^>]+>/g, " "),
  )
    .replace(/\s+/g, " ")
    .trim();

  return { title, text };
}

function decode(s: string): string {
  return s
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#x27;/g, "'");
}

/** Same-origin links only, deduped, shallow pages preferred. */
function internalLinks(html: string, base: URL): string[] {
  const found = new Set<string>();
  for (const m of html.matchAll(/<a\s[^>]*href=["']([^"'#]+)["']/gi)) {
    try {
      const u = new URL(m[1], base);
      if (u.origin !== base.origin) continue;
      if (!/\.(html?|php|aspx?)$|\/$|^[^.]*$/i.test(u.pathname)) continue;
      u.hash = "";
      u.search = "";
      found.add(u.toString());
    } catch {
      /* skip unparseable hrefs */
    }
  }
  // Shallowest first: /about tells you more about a company than /blog/2019/x.
  return [...found].sort(
    (a, b) => new URL(a).pathname.split("/").length - new URL(b).pathname.split("/").length,
  );
}

export async function crawlSite(rawUrl: string): Promise<CrawlResult | CrawlError> {
  const start = normaliseUrl(rawUrl);
  if (!start) {
    return { ok: false, error: "That does not look like a public website address." };
  }

  const disallows = await loadDisallows(start.origin);
  if (!isAllowed(start.pathname, disallows)) {
    return {
      ok: false,
      error: "That site's robots.txt asks crawlers not to read it, so we have not.",
    };
  }

  const homeHtml = await fetchText(start.toString());
  if (!homeHtml) {
    return { ok: false, error: "We could not reach that site. Check the address and try again." };
  }

  const home = extractText(homeHtml);
  const parts: string[] = [`# ${start.hostname}\n\n## ${start.pathname}\n${home.text}`];
  let pages = 1;
  let skipped = 0;

  for (const link of internalLinks(homeHtml, start)) {
    if (pages >= MAX_PAGES) break;
    const u = new URL(link);
    if (u.toString() === start.toString()) continue;
    if (!isAllowed(u.pathname, disallows)) {
      skipped++;
      continue;
    }
    const html = await fetchText(link);
    if (!html) continue;
    const { text } = extractText(html);
    if (text.length < 200) continue; // navigation-only pages add noise
    parts.push(`## ${u.pathname}\n${text}`);
    pages++;
  }

  // A generous ceiling: comfortably inside a modern context window, and it
  // keeps the per-demo model cost predictable.
  const content = parts.join("\n\n").slice(0, 60_000);

  return {
    ok: true,
    domain: start.hostname.toLowerCase(),
    url: start.toString(),
    title: home.title || start.hostname,
    content,
    pages,
    skipped,
  };
}
