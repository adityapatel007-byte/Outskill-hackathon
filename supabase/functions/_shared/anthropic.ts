/**
 * Thin wrapper around the Anthropic Messages API for use inside Supabase
 * edge functions. Requires the ANTHROPIC_API_KEY secret to be set:
 *
 *   supabase secrets set ANTHROPIC_API_KEY=sk-ant-...
 *
 * Model name is configurable via the ANTHROPIC_MODEL secret/env var — check
 * https://docs.claude.com/en/docs/about-claude/models for current model IDs
 * and pick one that fits your cost/quality needs (a fast/cheap model is
 * plenty for dossier extraction and short chat answers).
 */
const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY");
const ANTHROPIC_MODEL = Deno.env.get("ANTHROPIC_MODEL") ?? "claude-3-5-haiku-latest";

export async function callClaude(params: {
  system?: string;
  prompt: string;
  maxTokens?: number;
}): Promise<string> {
  if (!ANTHROPIC_API_KEY) {
    throw new Error("ANTHROPIC_API_KEY secret is not set on this Supabase project");
  }

  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-api-key": ANTHROPIC_API_KEY,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: ANTHROPIC_MODEL,
      max_tokens: params.maxTokens ?? 1024,
      system: params.system,
      messages: [{ role: "user", content: params.prompt }],
    }),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Anthropic API error (${res.status}): ${errText}`);
  }

  const data = await res.json();
  const textBlock = (data.content ?? []).find((b: { type: string }) => b.type === "text");
  if (!textBlock) throw new Error("Anthropic response had no text block");
  return textBlock.text as string;
}

/** Strips ```json fences etc. and parses the model's JSON reply. */
export function parseJsonReply<T>(raw: string): T {
  const cleaned = raw.replace(/^```json\s*|^```\s*|```$/gm, "").trim();
  return JSON.parse(cleaned) as T;
}
