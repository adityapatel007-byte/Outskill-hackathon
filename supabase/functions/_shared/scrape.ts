/** Minimal, dependency-free HTML → readable text extraction for edge runtime. */

export interface ScrapedPage {
  url: string;
  label: string;
  text: string;
}

const CANDIDATE_PATH_LABELS: [RegExp, string][] = [
  [/^\/?(pricing|plans)\/?$/i, "Pricing"],
  [/^\/?(about|about-us|company)\/?$/i, "About"],
  [/^\/?(product|products|features)\/?$/i, "Product"],
  [/^\/?(customers|case-studies)\/?$/i, "Customers"],
  [/^\/?(faq|help)\/?$/i, "FAQ"],
];

function stripHtml(html: string): string {
  return html
    // drop script/style/svg/noscript blocks entirely
    .replace(/<(script|style|svg|noscript)[\s\S]*?<\/\1>/gi, " ")
    // turn common block tags into line breaks so text isn't mashed together
    .replace(/<\/(p|div|li|h[1-6]|br|tr)>/gi, "\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{2,}/g, "\n")
    .trim();
}

function extractInternalLinks(html: string, baseUrl: string): string[] {
  const links = new Set<string>();
  const re = /href=["']([^"'#]+)["']/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html))) {
    try {
      const resolved = new URL(m[1], baseUrl);
      if (resolved.hostname === new URL(baseUrl).hostname) {
        links.add(resolved.pathname.replace(/\/$/, "") || "/");
      }
    } catch {
      /* ignore malformed hrefs */
    }
  }
  return [...links];
}

async function fetchPage(url: string): Promise<string> {
  const res = await fetch(url, {
    headers: { "User-Agent": "SiteSenseBot/1.0 (+https://github.com)" },
    redirect: "follow",
  });
  if (!res.ok) throw new Error(`Fetch failed (${res.status}) for ${url}`);
  return await res.text();
}

/**
 * Fetches the homepage plus a small number of high-signal internal pages
 * (pricing, about, product, etc.) and returns extracted text for each,
 * capped so the combined payload stays reasonable for an LLM prompt.
 */
export async function scrapeSite(
  startUrl: string,
  { maxPages = 4, maxCharsPerPage = 6000 }: { maxPages?: number; maxCharsPerPage?: number } = {}
): Promise<ScrapedPage[]> {
  const normalized = /^https?:\/\//i.test(startUrl) ? startUrl : `https://${startUrl}`;
  const homeHtml = await fetchPage(normalized);
  const pages: ScrapedPage[] = [
    { url: normalized, label: "Homepage", text: stripHtml(homeHtml).slice(0, maxCharsPerPage) },
  ];

  const internalPaths = extractInternalLinks(homeHtml, normalized);
  const matched: { path: string; label: string }[] = [];
  for (const [re, label] of CANDIDATE_PATH_LABELS) {
    const hit = internalPaths.find((p) => re.test(p));
    if (hit && !matched.some((m) => m.label === label)) matched.push({ path: hit, label });
  }

  for (const { path, label } of matched) {
    if (pages.length >= maxPages) break;
    try {
      const pageUrl = new URL(path, normalized).toString();
      const html = await fetchPage(pageUrl);
      pages.push({ url: pageUrl, label, text: stripHtml(html).slice(0, maxCharsPerPage) });
    } catch {
      /* skip pages that fail to load */
    }
  }

  return pages;
}
