// supabase/functions/scrape-analyze/index.ts
//
// POST { url: string }
// -> scrapes the site, asks Claude to build a structured Dossier,
//    inserts a `scans` row, and returns the full Scan.
//
// Deploy:
//   supabase functions deploy scrape-analyze
// Requires secrets:
//   supabase secrets set ANTHROPIC_API_KEY=sk-ant-...

import { createClient } from "jsr:@supabase/supabase-js@2";
import { corsHeaders, jsonResponse } from "../_shared/cors.ts";
import { scrapeSite } from "../_shared/scrape.ts";
import { callClaude, parseJsonReply } from "../_shared/anthropic.ts";

interface Dossier {
  summary: string;
  products: string[];
  target_audience: string;
  pricing_hint: "free" | "freemium" | "paid" | "enterprise" | "unknown";
  tone: string;
  key_pages: { label: string; url: string }[];
  notable_claims: string[];
}

function titleFromUrl(url: string): string {
  try {
    const host = new URL(url).hostname.replace(/^www\./, "");
    const base = host.split(".")[0];
    return base.charAt(0).toUpperCase() + base.slice(1);
  } catch {
    return "Untitled site";
  }
}

const DOSSIER_SYSTEM_PROMPT = `You are a research analyst. Given raw text extracted from a company's
website (multiple pages, each labeled), produce a concise, factual dossier.
Respond with ONLY a JSON object, no prose, no markdown fences, matching exactly:

{
  "summary": string,               // 2-3 sentences, what the company/site does
  "products": string[],            // up to 5 product/service names
  "target_audience": string,       // 1-2 sentences on who this is for
  "pricing_hint": "free" | "freemium" | "paid" | "enterprise" | "unknown",
  "tone": string,                  // short phrase describing brand voice
  "notable_claims": string[]       // up to 5 specific, checkable claims (numbers, guarantees, etc.)
}

Only state what the text supports. If something isn't mentioned, say so plainly
rather than guessing (e.g. pricing_hint "unknown").`;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return jsonResponse({ error: "Missing Authorization header" }, 401);

    const { url } = await req.json();
    if (!url || typeof url !== "string") {
      return jsonResponse({ error: "Body must include a `url` string" }, 400);
    }

    // Client scoped to the caller's JWT so RLS applies (insert is checked
    // against auth.uid() = user_id).
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const {
      data: { user },
      error: userErr,
    } = await supabase.auth.getUser();
    if (userErr || !user) return jsonResponse({ error: "Invalid or expired session" }, 401);

    // 1. Scrape
    const pages = await scrapeSite(url);
    const combinedText = pages
      .map((p) => `--- ${p.label} (${p.url}) ---\n${p.text}`)
      .join("\n\n");

    // 2. Analyze via Claude
    const raw = await callClaude({
      system: DOSSIER_SYSTEM_PROMPT,
      prompt: combinedText.slice(0, 20000),
      maxTokens: 1200,
    });
    const parsed = parseJsonReply<Omit<Dossier, "key_pages">>(raw);

    const dossier: Dossier = {
      ...parsed,
      key_pages: pages.map((p) => ({ label: p.label, url: p.url })),
    };

    // 3. Store
    const { data: scan, error: insertErr } = await supabase
      .from("scans")
      .insert({
        user_id: user.id,
        url,
        title: titleFromUrl(url),
        dossier,
      })
      .select()
      .single();

    if (insertErr) throw insertErr;

    return jsonResponse(scan);
  } catch (err) {
    console.error(err);
    return jsonResponse({ error: err instanceof Error ? err.message : "Unknown error" }, 500);
  }
});
