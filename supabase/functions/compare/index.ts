// ============================================================
// Edge function: compare
//
// Input:  { "scan_id_a": "uuid", "scan_id_b": "uuid" }
// Output: { "comparison": { summary, categories: [{name, winner, reason}], verdict } }
//
// Loads both already-analyzed dossiers and asks the model for a decisive,
// grounded head-to-head (a bold winner per category, always tied to a fact).
// Same self-contained Groq pattern as scrape/analyze/chat.
// ============================================================

import { createClient } from "npm:@supabase/supabase-js@2";

const AI_URL = "https://api.groq.com/openai/v1/chat/completions";
const AI_MODEL = "llama-3.1-8b-instant";

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

const COMPARISON_SCHEMA = {
  type: "object",
  properties: {
    summary: {
      type: "string",
      description: "2-3 sentences on how the two companies differ at a glance.",
    },
    categories: {
      type: "array",
      description:
        "4-6 categories that matter for these two companies, each with a decisive winner.",
      items: {
        type: "object",
        properties: {
          name: { type: "string" },
          winner: { type: "string", enum: ["a", "b", "tie"] },
          reason: {
            type: "string",
            description:
              "One sentence naming the winner's edge, citing a concrete fact. 'a' = first company, 'b' = second.",
          },
        },
        required: ["name", "winner", "reason"],
        additionalProperties: false,
      },
    },
    verdict: {
      type: "string",
      description:
        "A bold bottom line: who comes out ahead overall, and exactly who should pick each one.",
    },
  },
  required: ["summary", "categories", "verdict"],
  additionalProperties: false,
} as const;

// deno-lint-ignore no-explicit-any
function isValidComparison(c: any): boolean {
  return (
    c &&
    typeof c.summary === "string" &&
    Array.isArray(c.categories) &&
    typeof c.verdict === "string"
  );
}

async function callAI(apiKey: string, systemMsg: string, userMsg: string) {
  let lastErr = null;
  const res = await fetch(AI_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: AI_MODEL,
      temperature: 0.3,
      max_tokens: 2000,
      messages: [
        { role: "system", content: systemMsg },
        { role: "user", content: userMsg },
      ]
    }),
  });
  if (!res.ok) {
    console.error("AI provider error:", res.status, await res.text());
    throw new Error(`AI request failed (${res.status})`);
  }
  const data = await res.json();
  return data?.choices?.[0]?.message?.content ?? "";
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const { scan_id_a, scan_id_b } = await req.json().catch(() => ({}));
    if (!scan_id_a || !scan_id_b) {
      return json({ error: "scan_id_a and scan_id_b are required." }, 400);
    }
    if (scan_id_a === scan_id_b) {
      return json({ error: "Pick two different sites to compare." }, 400);
    }

    const aiKey = Deno.env.get("GROQ_API_KEY");
    if (!aiKey) return json({ error: "Server missing GROQ_API_KEY." }, 500);

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // ---- 1. Load both dossiers ----
    const { data: rows, error } = await supabase
      .from("scans")
      .select("id, url, title, dossier")
      .in("id", [scan_id_a, scan_id_b]);
    if (error) {
      console.error("DB fetch error:", error);
      return json({ error: "Could not load the scans." }, 500);
    }

    const a = rows?.find((r) => r.id === scan_id_a);
    const b = rows?.find((r) => r.id === scan_id_b);
    if (!a || !b) return json({ error: "One of the scans was not found." }, 404);
    if (!a.dossier || !b.dossier) {
      return json({ error: "Both sites must be analyzed before comparing." }, 400);
    }

    // ---- 2. Ask the AI for a decisive, grounded comparison ----
    const systemMsg =
      "You are a sharp competitive analyst comparing two companies from their own websites. " +
      "Be decisive: for each category pick a clear winner ('a' or 'b') and back it with ONE specific fact from that company's dossier. " +
      "Use ONLY facts present in the dossiers; never invent. If neither side gives enough to judge a category, set winner to 'tie'. " +
      "'a' is the FIRST company, 'b' is the SECOND. Cover 4-6 categories that matter for these two " +
      "(e.g. products & features, pricing & value, who it's for, credibility & traction, positioning). " +
      "Be bold, but every call must be grounded in something the site actually says.\n\n" +
      "Respond with ONLY a JSON object matching this schema:\n" +
      JSON.stringify(COMPARISON_SCHEMA, null, 2);

    const userMsg =
      `COMPANY A: ${a.title} (${a.url})\nDOSSIER A:\n${JSON.stringify(a.dossier, null, 2)}\n\n` +
      `COMPANY B: ${b.title} (${b.url})\nDOSSIER B:\n${JSON.stringify(b.dossier, null, 2)}`;

    const strictSystemMsg =
      systemMsg +
      "\n\nIMPORTANT: Your previous answer was invalid. Output ONLY a single valid JSON object matching the schema.";

    // deno-lint-ignore no-explicit-any
    let comparison: any = null;
    // Up to 3 attempts — the nested schema occasionally trips the model up.
    for (const sys of [systemMsg, strictSystemMsg, strictSystemMsg]) {
      try {
        const raw = await callAI(aiKey, sys, userMsg);
        const parsed = JSON.parse(raw);
        if (isValidComparison(parsed)) {
          comparison = {
            summary: String(parsed.summary).trim(),
            categories: (parsed.categories ?? [])
              // deno-lint-ignore no-explicit-any
              .filter((c: any) => c && c.name && c.reason)
              .slice(0, 6)
              // deno-lint-ignore no-explicit-any
              .map((c: any) => ({
                name: String(c.name).trim(),
                winner: ["a", "b", "tie"].includes(c.winner) ? c.winner : "tie",
                reason: String(c.reason).trim(),
              })),
            verdict: String(parsed.verdict).trim(),
          };
          break;
        }
      } catch (e: any) {
        console.error("Comparison attempt failed:", e);
        lastErr = e?.message || e;
      }
    }

    if (!comparison) {
      return json({ error: `The comparison came back unreadable. Please try again. (Debug: ${lastErr})` }, 502);
    }

    return json({ comparison });
  } catch (err) {
    console.error("Unexpected error:", err);
    return json({ error: "Something went wrong during comparison." }, 500);
  }
});
