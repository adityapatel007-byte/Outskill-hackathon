// ============================================================
// src/lib/api.ts — REAL implementation (replaces the mock seam)
//
// Talks to the team's Supabase project:
//   - tables `scans` / `messages` for reads
//   - edge functions `scrape` / `analyze` / `chat` for the pipeline
// Requires ui/.env with VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY,
// VITE_USE_MOCK=false. The Supabase client is the shared one in ./supabase
// (same instance used by the Auth page), so there's a single client.
// ============================================================

import type {
  Scan,
  ChatMessage,
  ScanStage,
  Comparison,
  CompareResult,
} from "../types";
import { supabase } from "./supabase";

export const USE_MOCK =
  (import.meta.env.VITE_USE_MOCK ?? "true").toString() !== "false";

export const SCAN_STAGES: ScanStage[] = [
  { label: "Reading the site…" },
  { label: "Understanding what they do…" },
  { label: "Building your dossier…" },
];

/** Staged loading copy for a head-to-head comparison (reads two sites). */
export const COMPARE_STAGES: ScanStage[] = [
  { label: "Reading both sites…" },
  { label: "Building each dossier…" },
  { label: "Judging the head-to-head…" },
];

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

// Columns the UI needs (never fetch raw_content — it's backend-only)
const SCAN_COLUMNS = "id, url, title, created_at, dossier, public_id";

// --- Helper: call an edge function and surface its error message ---
// Sends the logged-in user's access token (so functions can identify the owner);
// falls back to the anon key when signed out.
async function callFunction<T>(name: string, body: unknown): Promise<T> {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  const bearer = session?.access_token ?? SUPABASE_ANON_KEY;

  const res = await fetch(`${SUPABASE_URL}/functions/v1/${name}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${bearer}`,
      apikey: SUPABASE_ANON_KEY,
    },
    body: JSON.stringify(body),
  });

  const data = await res.json().catch(() => null);
  if (!res.ok) {
    throw new Error(data?.error ?? "Something went wrong. Please try again.");
  }
  return data as T;
}

// ------------------------------------------------------------
// API functions (same signatures as the mock version)
// ------------------------------------------------------------

export async function listScans(): Promise<Scan[]> {
  const { data, error } = await supabase
    .from("scans")
    .select(SCAN_COLUMNS)
    .not("dossier", "is", null) // hide scans whose analysis never finished
    .order("created_at", { ascending: false });

  if (error) throw new Error("Couldn't load your scans.");
  return (data ?? []) as unknown as Scan[];
}

export async function getScan(id: string): Promise<Scan | null> {
  const { data, error } = await supabase
    .from("scans")
    .select(SCAN_COLUMNS)
    .eq("id", id)
    .maybeSingle();

  if (error) throw new Error("Couldn't load this scan.");
  return (data as unknown as Scan) ?? null;
}

export async function getSharedScan(publicId: string): Promise<Scan | null> {
  const { data, error } = await supabase
    .from("scans")
    .select(SCAN_COLUMNS)
    .eq("public_id", publicId)
    .maybeSingle();

  if (error) throw new Error("Couldn't load this shared scan.");
  return (data as unknown as Scan) ?? null;
}

export async function runScan(
  url: string,
  onStage?: (index: number) => void,
): Promise<Scan> {
  // Stage 0: scraping
  onStage?.(0);
  const { scan_id } = await callFunction<{ scan_id: string; title: string }>(
    "scrape",
    { url },
  );

  // Stage 1 + 2: analyzing / building dossier
  onStage?.(1);
  const stageTimer = setTimeout(() => onStage?.(2), 4000);
  try {
    const scan = await callFunction<Scan>("analyze", { scan_id });
    return scan;
  } finally {
    clearTimeout(stageTimer);
  }
}

export async function getMessages(scanId: string): Promise<ChatMessage[]> {
  const { data, error } = await supabase
    .from("messages")
    .select("id, role, content, citation, created_at")
    .eq("scan_id", scanId)
    .order("created_at", { ascending: true });

  if (error) throw new Error("Couldn't load the conversation.");
  return (data ?? []) as unknown as ChatMessage[];
}

export async function askQuestion(
  scanId: string,
  question: string,
): Promise<{ user: ChatMessage; assistant: ChatMessage }> {
  return callFunction<{ user: ChatMessage; assistant: ChatMessage }>("chat", {
    scan_id: scanId,
    question,
  });
}

export async function clearMessages(scanId: string): Promise<void> {
  const { error } = await supabase
    .from("messages")
    .delete()
    .eq("scan_id", scanId);

  if (error) throw new Error("Couldn't clear the conversation.");
}

export async function toggleShare(scanId: string): Promise<string | null> {
  const { data, error } = await supabase.rpc("toggle_share", {
    p_scan_id: scanId,
  });

  if (error) throw new Error("Couldn't update sharing.");
  return (data as string | null) ?? null;
}

// --- Comparison -----------------------------------------------------------
// Comparisons are assembled client-side: scan both sites (which persist to the
// `scans` table), then ask the `compare` edge function for the verdict. The
// result is held for the session so the result page can read it by id.

const compares: CompareResult[] = [];

export async function getCompare(id: string): Promise<CompareResult | null> {
  return compares.find((c) => c.id === id) ?? null;
}

/**
 * Compare two sites head-to-head: scrape + analyze each, then a grounded
 * verdict. `onStage` drives the staged loading copy.
 */
export async function runCompare(
  urlA: string,
  urlB: string,
  onStage?: (index: number) => void,
): Promise<CompareResult> {
  onStage?.(0);
  let stage = 0;
  const ticker = setInterval(() => {
    stage = Math.min(stage + 1, COMPARE_STAGES.length - 1);
    onStage?.(stage);
  }, 6000);
  try {
    const [scanA, scanB] = await Promise.all([runScan(urlA), runScan(urlB)]);
    onStage?.(COMPARE_STAGES.length - 1);
    const { comparison } = await callFunction<{ comparison: Comparison }>(
      "compare",
      { scan_id_a: scanA.id, scan_id_b: scanB.id },
    );
    const result: CompareResult = {
      id: `cmp_${Date.now()}`,
      created_at: new Date().toISOString(),
      a: { url: scanA.url, title: scanA.title, dossier: scanA.dossier },
      b: { url: scanB.url, title: scanB.title, dossier: scanB.dossier },
      comparison,
    };
    compares.unshift(result);
    return result;
  } finally {
    clearInterval(ticker);
  }
}
