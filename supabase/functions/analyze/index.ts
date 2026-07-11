// ============================================================
// Edge function: analyze
//
// Input:  { "scan_id": "uuid" }
// Output: the full Scan object the frontend expects:
//         { id, url, title, created_at, dossier, public_id }
// ============================================================

import { createClient } from "npm:@supabase/supabase-js@2";

// Groq: free API (no credit card) serving open-source models.
const AI_URL = "https://api.groq.com/openai/v1/chat/completions";
const AI_MODEL = "llama3-8b-8192";

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

// JSON schema matching the frontend's Dossier TypeScript type exactly.
const DOSSIER_SCHEMA = {
type: "object",
properties: {
summary: { type: "string", description: "2-3 sentence plain-English summary of what this site/company does." },
products: { type: "array", items: { type: "string" }, description: "Key products, services, or offerings mentioned on the page." },
target_audience: { type: "string", description: "Who this site is for, in one sentence." },
pricing_hint: { type: "string", enum: ["free", "freemium", "paid", "enterprise", "unknown"] },
tone: { type: "string", description: "The site's tone of voice in a few words, e.g. 'playful and casual'." },
key_pages: {
type: "array",
description: "Important links found in the content (pricing, docs, about, contact...). Only use URLs that actually appear in the content.",
items: {
type: "object",
properties: {
label: { type: "string" },
url: { type: "string" },
},
required: ["label", "url"],
additionalProperties: false,
},
},
notable_claims: { type: "array", items: { type: "string" }, description: "Specific claims the site makes (stats, awards, guarantees). Quote or closely paraphrase; never invent." },
},
required: ["summary", "products", "target_audience", "pricing_hint", "tone", "key_pages", "notable_claims"],
additionalProperties: false,
} as const;

function isValidDossier(d: any): boolean {
return (
d &&
typeof d.summary === "string" &&
Array.isArray(d.products) &&
typeof d.target_audience === "string" &&
["free", "freemium", "paid", "enterprise", "unknown"].includes(d.pricing_hint) &&
typeof d.tone === "string" &&
Array.isArray(d.key_pages) &&
Array.isArray(d.notable_claims)
);
}

async function callAI(apiKey: string, systemMsg: string, userMsg: string) {
const res = await fetch(AI_URL, {
method: "POST",
headers: {
Authorization: `Bearer ${apiKey}`,
"Content-Type": "application/json",
},
body: JSON.stringify({
model: AI_MODEL,
temperature: 0.2,
max_tokens: 3000,
messages: [
{ role: "system", content: systemMsg },
{ role: "user", content: userMsg },
],
response_format: { type: "json_object" },
}),
});

if (!res.ok) {
const errText = await res.text();
console.error("AI provider error:", res.status, errText);
throw new Error(`AI request failed (${res.status})`);
}

const data = await res.json();
return data?.choices?.[0]?.message?.content ?? "";
}

Deno.serve(async (req) => {
if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

try {
const { scan_id } = await req.json().catch(() => ({}));
if (!scan_id) return json({ error: "scan_id is required." }, 400);

const aiKey = Deno.env.get("GROQ_API_KEY");
if (!aiKey) return json({ error: "Server missing GROQ_API_KEY." }, 500);

const supabase = createClient(
Deno.env.get("SUPABASE_URL")!,
Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
);

// ---- 1. Load the scraped content ----
const { data: scan, error: fetchError } = await supabase
.from("scans")
.select("id, url, title, raw_content, created_at, public_id")
.eq("id", scan_id)
.single();

if (fetchError || !scan) return json({ error: "Scan not found." }, 404);
if (!scan.raw_content) return json({ error: "This scan has no content to analyze." }, 400);

// ---- 2. Ask the AI for a structured dossier (retry once if it fails) ----
const systemMsg =
"You are a research analyst. Build a dossier about a website using ONLY the scraped page content provided. " +
"Never invent facts, products, links, or claims that are not in the content. " +
"If something is unclear, use 'unknown' or leave the list short. " +
"Respond with ONLY a JSON object exactly matching this schema (all fields required):\n" +
JSON.stringify(DOSSIER_SCHEMA, null, 2);

const strictSystemMsg =
systemMsg +
"\n\nIMPORTANT: Your previous answer was invalid. Output ONLY a single valid JSON object exactly matching the schema - no markdown, no commentary, all fields present.";

const userMsg = `Website URL: ${scan.url}\nPage title: ${scan.title}\n\nScraped page content (markdown):\n"""\n${scan.raw_content}\n"""`;

let dossier: any = null;
let lastError: any = null;
for (const sys of [systemMsg, strictSystemMsg]) {
try {
const raw = await callAI(aiKey, sys, userMsg);
const parsed = JSON.parse(raw);
if (isValidDossier(parsed)) {
dossier = parsed;
break;
}
console.error("Dossier failed validation, retrying...");
lastError = "Dossier failed validation";
} catch (e: any) {
console.error("AI/parse attempt failed:", e);
lastError = e?.message || e;
}
}

if (!dossier) {
return json({ error: `The AI couldn't analyze this page. (Debug: ${lastError})` }, 502);
}

// ---- 3. Save the dossier ----
const { error: updateError } = await supabase
.from("scans")
.update({ dossier })
.eq("id", scan_id);

if (updateError) {
console.error("DB update error:", updateError);
return json({ error: "Could not save the analysis. Please try again." }, 500);
}

// ---- 4. Return the full Scan shape the frontend expects ----
return json({
id: scan.id,
url: scan.url,
title: scan.title,
created_at: scan.created_at,
dossier,
public_id: scan.public_id ?? null,
});
} catch (err) {
console.error("Unexpected error:", err);
return json({ error: "Something went wrong during analysis." }, 500);
}
});