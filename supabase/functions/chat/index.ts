// ============================================================
// Edge function: chat
//
// Input:  { "scan_id": "uuid", "question": "..." }
// Output: { "user": ChatMessage, "assistant": ChatMessage }
//         assistant carries a `found` flag: false when the question is
//         off-topic / not covered by the page (the UI shows a friendly card).
// ============================================================

import { createClient } from "npm:@supabase/supabase-js@2";

// Groq: free API (no credit card) serving open-source models.
const AI_URL = "https://api.groq.com/openai/v1/chat/completions";
const AI_MODEL = "llama-3.3-70b-versatile";

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

// The model returns an answer, whether the page actually covers it, and the
// INDEX of the key page that best supports it (or null). We map that index
// back to a real {label, url}, so citations can never be hallucinated URLs.
const ANSWER_SCHEMA = {
  type: "object",
  properties: {
    answer: {
      type: "string",
      description:
        "Answer to the question using ONLY the page content. If the page doesn't cover it, say so plainly.",
    },
    found: {
      type: "boolean",
      description:
        "true if the page content actually answers the question; false if the question is off-topic, general knowledge, or simply not covered by this page.",
    },
    citation_index: {
      type: ["integer", "null"],
      description:
        "Index into the provided key_pages list for the page that best supports the answer, or null if none applies.",
    },
  },
  required: ["answer", "found", "citation_index"],
  additionalProperties: false,
} as const;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const { scan_id, question } = await req.json().catch(() => ({}));
    if (!scan_id || !question?.trim()) {
      return json({ error: "scan_id and question are required." }, 400);
    }

    const aiKey = Deno.env.get("GROQ_API_KEY");
    if (!aiKey) return json({ error: "Server missing GROQ_API_KEY." }, 500);

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // ---- 1. Load the scan (content + dossier) ----
    const { data: scan, error: fetchError } = await supabase
      .from("scans")
      .select("id, url, title, raw_content, dossier, owner")
      .eq("id", scan_id)
      .single();

    if (fetchError || !scan) return json({ error: "Scan not found." }, 404);

    const keyPages: { label: string; url: string }[] = scan.dossier?.key_pages ?? [];
    const keyPagesList =
      keyPages.map((p, i) => `${i}: ${p.label} - ${p.url}`).join("\n") || "(none)";

    // ---- 2. Load recent conversation history for context ----
    const { data: history } = await supabase
      .from("messages")
      .select("role, content")
      .eq("scan_id", scan_id)
      .order("created_at", { ascending: true })
      .limit(10);

    // ---- 3. Ask the AI, grounded strictly in the scraped content ----
    const systemMsg =
      "You are SiteSense, an analyst answering questions about ONE specific website. " +
      "Ground every statement ONLY in the scraped page content below. " +
      "If the content does not cover something, or the question is off-topic or general knowledge, " +
      "set found to false and say plainly that the page doesn't mention it - NEVER guess or use outside knowledge. " +
      "Keep answers concise and conversational.\n\n" +
      `Website: ${scan.title} (${scan.url})\n\n` +
      `Scraped page content (markdown):\n"""\n${scan.raw_content ?? ""}\n"""\n\n` +
      `Key pages you may cite (pick the index that best supports your answer, or null):\n${keyPagesList}\n\n` +
      "Respond with ONLY a JSON object matching this schema:\n" +
      JSON.stringify(ANSWER_SCHEMA, null, 2);

    const aiRes = await fetch(AI_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${aiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: AI_MODEL,
        temperature: 0.3,
        max_tokens: 1500,
        messages: [
          { role: "system", content: systemMsg },
          ...(history ?? []).map((m) => ({ role: m.role, content: m.content })),
          { role: "user", content: question },
        ],
        response_format: { type: "json_object" },
      }),
    });

    if (!aiRes.ok) {
      console.error("AI provider error:", aiRes.status, await aiRes.text());
      return json({ error: "The AI couldn't answer right now. Please try again." }, 502);
    }

    const completion = await aiRes.json();
    let parsed: { answer: string; found?: boolean; citation_index: number | null };
    try {
      parsed = JSON.parse(completion?.choices?.[0]?.message?.content ?? "");
      if (typeof parsed?.answer !== "string" || !parsed.answer.trim()) throw new Error();
    } catch {
      return json({ error: "The AI couldn't answer right now. Please try again." }, 502);
    }

    const found = parsed.found !== false; // default to true unless explicitly false
    // Map the citation index back to a real key page (never a made-up URL)
    const citation =
      found && parsed.citation_index !== null && keyPages[parsed.citation_index]
        ? keyPages[parsed.citation_index]
        : null;

    // ---- 4. Save both messages (inherit the scan's owner for RLS) ----
    const { data: saved, error: insertError } = await supabase
      .from("messages")
      .insert([
        { scan_id, role: "user", content: question, citation: null, owner: scan.owner },
        { scan_id, role: "assistant", content: parsed.answer, citation, owner: scan.owner },
      ])
      .select("id, role, content, citation, created_at");

    if (insertError || !saved || saved.length < 2) {
      console.error("DB insert error:", insertError);
      return json({ error: "Could not save the conversation." }, 500);
    }

    const userMsg = saved.find((m) => m.role === "user")!;
    const assistantMsg = saved.find((m) => m.role === "assistant")!;

    // ---- 5. Return exactly what the frontend's askQuestion expects ----
    return json({
      user: {
        id: userMsg.id,
        role: "user",
        content: userMsg.content,
        citation: null,
        created_at: userMsg.created_at,
      },
      assistant: {
        id: assistantMsg.id,
        role: "assistant",
        content: assistantMsg.content,
        citation: assistantMsg.citation ?? null,
        found,
        created_at: assistantMsg.created_at,
      },
    });
  } catch (err) {
    console.error("Unexpected error:", err);
    return json({ error: "Something went wrong. Please try again." }, 500);
  }
});
