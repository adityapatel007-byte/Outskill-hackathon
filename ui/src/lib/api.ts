// ui/src/lib/api.ts
//
// The single seam the whole UI talks to. Drop this in place of the
// existing file (or merge the `else` branches in) — the component
// layer never changes, per ui/README.md.
//
// Toggle with VITE_USE_MOCK in ui/.env. When false, every call below
// goes to Supabase: scrape/analyze results are stored via db.ts, and
// chat/scrape/analyze logic itself is expected to live in a Supabase
// Edge Function (or your own backend) reachable via supabase.functions.invoke.
// This file focuses on the "store what got scraped" half of that pipeline.

import { supabase } from "./supabaseClient";
import * as db from "./db";
import type { Dossier, ScrapedPage } from "./db";
import * as mock from "./mock";

const USE_MOCK = import.meta.env.VITE_USE_MOCK !== "false";

// Shape returned to the UI — mirrors PLAN.md §3.2 / ui/src/types.ts.
// If your real types.ts differs, adjust the mapping functions below
// (toScan / toMessage) rather than the callers.
export type Scan = {
  id: string;
  url: string;
  status: "pending" | "scraping" | "analyzing" | "ready" | "error";
  dossier: Dossier | null;
  isPublic: boolean;
  publicId: string | null;
  createdAt: string;
};

export type ChatAnswer = {
  answer: string;
  messageId: string;
  citation?: { label?: string; url?: string; snippet?: string };
};

function toScan(row: db.ScanRow): Scan {
  return {
    id: row.id,
    url: row.url,
    status: row.status,
    dossier: row.dossier,
    isPublic: row.is_public,
    publicId: row.public_id,
    createdAt: row.created_at,
  };
}

// ------------------------------------------------------------
// runScan(url) -> POST /scrape then POST /analyze -> Scan
// ------------------------------------------------------------
export async function runScan(url: string): Promise<Scan> {
  if (USE_MOCK) return mock.runScan(url);

  // 1. Create the scan row up front so the UI can navigate to /scan/:id
  //    and show progress immediately.
  const scanRow = await db.createScan(url);

  try {
    // 2. Scrape. Replace this invoke with wherever your scraper actually
    //    lives (Edge Function, separate backend, etc). It must return the
    //    list of pages it collected.
    await db.updateScanStatus(scanRow.id, "scraping");
    const { data: scrapeData, error: scrapeError } =
      await supabase.functions.invoke("scrape", { body: { url } });
    if (scrapeError) throw scrapeError;

    const pages: ScrapedPage[] = scrapeData.pages ?? [];
    await db.saveScrapedPages(scanRow.id, pages);

    // 3. Analyze -> structured dossier.
    await db.updateScanStatus(scanRow.id, "analyzing");
    const { data: analyzeData, error: analyzeError } =
      await supabase.functions.invoke("analyze", {
        body: { scanId: scanRow.id },
      });
    if (analyzeError) throw analyzeError;

    const dossier: Dossier = analyzeData.dossier ?? {};
    const finalRow = await db.saveDossier(scanRow.id, dossier);
    return toScan(finalRow);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Scan failed";
    await db.updateScanStatus(scanRow.id, "error", message);
    throw err;
  }
}

// ------------------------------------------------------------
// getScan(scanId) -> Scan  (for /scan/:id)
// ------------------------------------------------------------
export async function getScan(scanId: string): Promise<Scan | null> {
  if (USE_MOCK) return mock.getScan(scanId);
  const row = await db.getScan(scanId);
  return row ? toScan(row) : null;
}

// ------------------------------------------------------------
// listRecentScans() -> Scan[]  (for /app)
// ------------------------------------------------------------
export async function listRecentScans(): Promise<Scan[]> {
  if (USE_MOCK) return mock.listRecentScans();
  const rows = await db.listRecentScans();
  return rows.map(toScan);
}

// ------------------------------------------------------------
// getPublicScan(publicId) -> Scan  (for /share/:publicId)
// ------------------------------------------------------------
export async function getPublicScan(publicId: string): Promise<Scan | null> {
  if (USE_MOCK) return mock.getPublicScan(publicId);
  const row = await db.getPublicScan(publicId);
  return row ? toScan(row) : null;
}

// ------------------------------------------------------------
// askQuestion(scanId, q) -> POST /chat -> { answer, message_id } (+ citation)
// ------------------------------------------------------------
export async function askQuestion(
  scanId: string,
  question: string
): Promise<ChatAnswer> {
  if (USE_MOCK) return mock.askQuestion(scanId, question);

  // Store the user's turn.
  await db.saveChatMessage(scanId, "user", question);

  // Ask the chat function (RAG over scraped_pages for this scan, cited).
  const { data, error } = await supabase.functions.invoke("chat", {
    body: { scanId, question },
  });
  if (error) throw error;

  const citation = data.citation
    ? {
        label: data.citation.label,
        url: data.citation.url,
        snippet: data.citation.snippet,
      }
    : undefined;

  const saved = await db.saveChatMessage(
    scanId,
    "assistant",
    data.answer,
    citation
  );

  return { answer: data.answer, messageId: saved.id, citation };
}

// ------------------------------------------------------------
// toggleShare(scanId) -> RPC that sets public_id
// ------------------------------------------------------------
export async function toggleShare(
  scanId: string
): Promise<{ isPublic: boolean; publicId: string | null }> {
  if (USE_MOCK) return mock.toggleShare(scanId);
  return db.toggleShare(scanId);
}
