// ============================================================
// Edge function: scrape
//
// Input:  { "url": "https://..." }
// Output: { "scan_id": "uuid", "title": "..." }
//
// Requires a signed-in user (sent as the Authorization bearer). The new scan
// row is stamped with `owner = user.id` so row-level security scopes it to them.
//
// Scraping strategy (resilient by design):
//   1. If FIRECRAWL_API_KEY is set, try Firecrawl (best quality; handles
//      JS-heavy / bot-protected sites).
//   2. If Firecrawl is missing, errors, runs out of credits, or returns thin
//      content, FALL BACK to a keyless direct fetch + HTML→text extraction.
// This means scraping keeps working even when Firecrawl credits are exhausted,
// which is the failure that used to take the whole app down.
// ============================================================

import { createClient } from "npm:@supabase/supabase-js@2";

const MAX_CONTENT_CHARS = 6000;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

// A realistic browser User-Agent so sites don't reject us as an obvious bot.
const BROWSER_UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 " +
  "(KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36";

/** Minimal, dependency-free HTML → readable text for the edge runtime. */
function stripHtmlToText(html: string): string {
  return html
    // drop non-content blocks entirely
    .replace(/<(script|style|svg|noscript|head|iframe)[\s\S]*?<\/\1>/gi, " ")
    // turn common block tags into line breaks so text isn't mashed together
    .replace(/<\/(p|div|li|h[1-6]|br|tr|section|article|header|footer)>/gi, "\n")
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

/** Keyless fallback: fetch the page ourselves and extract readable text. */
async function directFetchText(
  url: string,
): Promise<{ text: string; title: string }> {
  const res = await fetch(url, {
    headers: {
      "User-Agent": BROWSER_UA,
      Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      "Accept-Language": "en-US,en;q=0.9",
    },
    redirect: "follow",
  });
  if (!res.ok) throw new Error(`Direct fetch failed (${res.status})`);
  const html = await res.text();
  const titleMatch = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  const title = titleMatch?.[1]?.replace(/\s+/g, " ").trim() ?? "";
  return { text: stripHtmlToText(html), title };
}

/** Firecrawl scrape → markdown. Returns null on any failure (caller falls back). */
async function firecrawlScrape(
  key: string,
  url: string,
): Promise<{ markdown: string; title: string } | null> {
  try {
    const fcRes = await fetch("https://api.firecrawl.dev/v2/scrape", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        url,
        formats: ["markdown"],
        onlyMainContent: false, // keep nav links so the AI can find key pages
      }),
    });

    if (!fcRes.ok) {
      // 402 = out of credits, 429 = rate limited, etc. Log and fall back.
      console.warn("Firecrawl non-OK:", fcRes.status, (await fcRes.text()).slice(0, 300));
      return null;
    }

    const fc = await fcRes.json();
    const markdown: string = fc?.data?.markdown ?? "";
    const title: string =
      fc?.data?.metadata?.title || fc?.data?.metadata?.ogTitle || "";
    return { markdown, title };
  } catch (e) {
    console.warn("Firecrawl threw:", e);
    return null;
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const { url } = await req.json().catch(() => ({}));

    // Basic URL validation
    let parsed: URL;
    try {
      parsed = new URL(url);
      if (!["http:", "https:"].includes(parsed.protocol)) throw new Error();
    } catch {
      return json({ error: "That doesn't look like a valid URL." }, 400);
    }

    // ---- 0. Identify the user (login required) ----
    const authHeader = req.headers.get("Authorization") ?? "";
    const token = authHeader.replace(/^Bearer\s+/i, "");
    const userClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
    );
    const {
      data: { user },
    } = await userClient.auth.getUser(token);
    if (!user) return json({ error: "Please log in to scan a site." }, 401);

    // ---- 1. Get page content: Firecrawl first, keyless fetch as fallback ----
    let markdown = "";
    let title = "";

    const firecrawlKey = Deno.env.get("FIRECRAWL_API_KEY");
    if (firecrawlKey) {
      const fc = await firecrawlScrape(firecrawlKey, parsed.toString());
      if (fc && fc.markdown.trim().length >= 50) {
        markdown = fc.markdown;
        title = fc.title;
      }
    }

    // Fallback: fetch it ourselves (no API key, no credits, no limits).
    if (markdown.trim().length < 50) {
      try {
        const direct = await directFetchText(parsed.toString());
        if (direct.text.trim().length >= 50) {
          markdown = direct.text;
          if (!title) title = direct.title;
        }
      } catch (e) {
        console.warn("Direct fetch fallback failed:", e);
      }
    }

    if (markdown.trim().length < 50) {
      // Both paths failed: the site genuinely needs JS or hard-blocks bots.
      return json(
        {
          error:
            "Couldn't read this site — it may require JavaScript or block automated access. Try a different URL.",
        },
        400,
      );
    }

    title = title || parsed.hostname;
    const raw_content = markdown.slice(0, MAX_CONTENT_CHARS);

    // ---- 2. Save to the scans table (owned by this user) ----
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { data: scan, error: dbError } = await supabase
      .from("scans")
      .insert({ url: parsed.toString(), title, raw_content, owner: user.id })
      .select("id, title")
      .single();

    if (dbError) {
      console.error("DB insert error:", dbError);
      return json({ error: "Could not save the scan. Please try again." }, 500);
    }

    return json({ scan_id: scan.id, title: scan.title });
  } catch (err) {
    console.error("Unexpected error:", err);
    return json({ error: "Something went wrong while scanning. Please try again." }, 500);
  }
});
