// ============================================================
// Edge function: scrape
//
// Input:  { "url": "https://..." }
// Output: { "scan_id": "uuid", "title": "..." }
// Error:  { "error": "This site blocks scrapers. Try another URL." }
//
// Requires a signed-in user (sent as the Authorization bearer). The new scan
// row is stamped with `owner = user.id` so row-level security scopes it to them.
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

    // ---- 1. Scrape with Firecrawl ----
    const firecrawlKey = Deno.env.get("FIRECRAWL_API_KEY");
    if (!firecrawlKey) return json({ error: "Server missing FIRECRAWL_API_KEY." }, 500);

    const fcRes = await fetch("https://api.firecrawl.dev/v2/scrape", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${firecrawlKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        url: parsed.toString(),
        formats: ["markdown"],
        onlyMainContent: false, // keep nav links so the AI can find key pages
      }),
    });

    if (!fcRes.ok) {
      console.error("Firecrawl error:", fcRes.status, await fcRes.text());
      return json({ error: "This site blocks scrapers. Try another URL." }, 400);
    }

    const fc = await fcRes.json();
    const markdown: string = fc?.data?.markdown ?? "";

    if (!markdown || markdown.trim().length < 50) {
      return json({ error: "This site blocks scrapers. Try another URL." }, 400);
    }

    const title: string =
      fc?.data?.metadata?.title || fc?.data?.metadata?.ogTitle || parsed.hostname;

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
    return json({ error: "This site blocks scrapers. Try another URL." }, 500);
  }
});
