// supabase/functions/chat/index.ts
//
// POST { scan_id: string, question: string }
// -> loads the scan's dossier from Supabase, asks Claude to answer citing
//    one of the scan's key_pages, stores both messages, and returns them.

import { createClient } from "jsr:@supabase/supabase-js@2";
import { corsHeaders, jsonResponse } from "../_shared/cors.ts";
import { callClaude, parseJsonReply } from "../_shared/anthropic.ts";

interface KeyPage {
  label: string;
  url: string;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return jsonResponse({ error: "Missing Authorization header" }, 401);

    const { scan_id, question } = await req.json();
    if (!scan_id || !question) {
      return jsonResponse({ error: "Body must include `scan_id` and `question`" }, 400);
    }

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

    const { data: scan, error: scanErr } = await supabase
      .from("scans")
      .select("*")
      .eq("id", scan_id)
      .single();
    if (scanErr || !scan) return jsonResponse({ error: "Scan not found" }, 404);

    const dossier = scan.dossier as {
      summary: string;
      products: string[];
      target_audience: string;
      pricing_hint: string;
      tone: string;
      key_pages: KeyPage[];
      notable_claims: string[];
    };

    const system = `You answer questions about a website using ONLY the dossier
provided below. Respond with ONLY a JSON object, no prose, no markdown fences:

{ "answer": string, "citation_label": string }

"citation_label" must exactly match one of the key_pages labels given below —
pick whichever page the answer is most grounded in. If the dossier doesn't
cover the question, say so plainly in "answer" and still return the best
matching label (e.g. "Homepage").

Dossier:
${JSON.stringify(dossier, null, 2)}`;

    const raw = await callClaude({ system, prompt: question, maxTokens: 500 });
    const parsed = parseJsonReply<{ answer: string; citation_label: string }>(raw);

    const citation: KeyPage =
      dossier.key_pages.find((p) => p.label === parsed.citation_label) ??
      dossier.key_pages[0] ?? { label: "Homepage", url: scan.url };

    const { data: userMsg, error: userMsgErr } = await supabase
      .from("chat_messages")
      .insert({ scan_id, role: "user", content: question })
      .select()
      .single();
    if (userMsgErr) throw userMsgErr;

    const { data: assistantMsg, error: assistantMsgErr } = await supabase
      .from("chat_messages")
      .insert({ scan_id, role: "assistant", content: parsed.answer, citation })
      .select()
      .single();
    if (assistantMsgErr) throw assistantMsgErr;

    return jsonResponse({ user: userMsg, assistant: assistantMsg });
  } catch (err) {
    console.error(err);
    return jsonResponse({ error: err instanceof Error ? err.message : "Unknown error" }, 500);
  }
});
