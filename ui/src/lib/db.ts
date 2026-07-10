// ui/src/lib/db.ts
//
// Storage layer on top of Supabase. This is where "the information
// collected by the website scraper" actually gets persisted.
// api.ts calls these functions; it never talks to `supabase` directly.
//
// Adjust the `Dossier` / `ScrapedPage` field names below to match your
// real ui/src/types.ts if they differ — the DB columns are JSONB/text
// so no migration is needed, just the mapping in this file.

import { supabase } from "./supabaseClient";

export type Dossier = {
  summary?: string;
  what_they_do?: string;
  products?: string[];
  audience?: string;
  pricing?: string;
  tone?: string;
  notable_claims?: string[];
  [key: string]: unknown;
};

export type ScrapedPage = {
  url: string;
  title?: string;
  pageLabel?: string; // "Home" | "Pricing" | "About" | ...
  content: string;
};

export type Citation = {
  pageId?: string;
  url?: string;
  label?: string;
  snippet?: string;
};

export type ScanRow = {
  id: string;
  user_id: string;
  url: string;
  status: "pending" | "scraping" | "analyzing" | "ready" | "error";
  error_message: string | null;
  dossier: Dossier | null;
  is_public: boolean;
  public_id: string | null;
  created_at: string;
  updated_at: string;
};

export type ChatMessageRow = {
  id: string;
  scan_id: string;
  role: "user" | "assistant";
  content: string;
  citation: Citation | null;
  created_at: string;
};

// ------------------------------------------------------------
// Scans
// ------------------------------------------------------------

/** Create a new scan row for the current user, status = 'pending'. */
export async function createScan(url: string): Promise<ScanRow> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Must be signed in to start a scan.");

  const { data, error } = await supabase
    .from("scans")
    .insert({ url, user_id: user.id, status: "pending" })
    .select()
    .single();

  if (error) throw error;
  return data as ScanRow;
}

/** Update scan status (pending -> scraping -> analyzing -> ready/error). */
export async function updateScanStatus(
  scanId: string,
  status: ScanRow["status"],
  errorMessage?: string
): Promise<void> {
  const { error } = await supabase
    .from("scans")
    .update({ status, error_message: errorMessage ?? null })
    .eq("id", scanId);
  if (error) throw error;
}

/** Store the structured dossier once /analyze finishes, and mark ready. */
export async function saveDossier(
  scanId: string,
  dossier: Dossier
): Promise<ScanRow> {
  const { data, error } = await supabase
    .from("scans")
    .update({ dossier, status: "ready", error_message: null })
    .eq("id", scanId)
    .select()
    .single();
  if (error) throw error;
  return data as ScanRow;
}

/** Bulk-insert the pages a scrape collected (home, pricing, about, ...). */
export async function saveScrapedPages(
  scanId: string,
  pages: ScrapedPage[]
): Promise<void> {
  if (pages.length === 0) return;
  const { error } = await supabase.from("scraped_pages").insert(
    pages.map((p) => ({
      scan_id: scanId,
      url: p.url,
      title: p.title ?? null,
      page_label: p.pageLabel ?? null,
      content: p.content,
    }))
  );
  if (error) throw error;
}

/** Fetch a scan (dossier) by id — used by /scan/:id. */
export async function getScan(scanId: string): Promise<ScanRow | null> {
  const { data, error } = await supabase
    .from("scans")
    .select("*")
    .eq("id", scanId)
    .maybeSingle();
  if (error) throw error;
  return data as ScanRow | null;
}

/** Fetch a publicly-shared scan by its public_id — used by /share/:publicId. */
export async function getPublicScan(publicId: string): Promise<ScanRow | null> {
  const { data, error } = await supabase
    .from("scans")
    .select("*")
    .eq("public_id", publicId)
    .eq("is_public", true)
    .maybeSingle();
  if (error) throw error;
  return data as ScanRow | null;
}

/** List the current user's recent scans — used by /app. */
export async function listRecentScans(limit = 20): Promise<ScanRow[]> {
  const { data, error } = await supabase
    .from("scans")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return (data ?? []) as ScanRow[];
}

/** Toggle public sharing via the `toggle_share` RPC (owner-only). */
export async function toggleShare(
  scanId: string
): Promise<{ isPublic: boolean; publicId: string | null }> {
  const { data, error } = await supabase.rpc("toggle_share", {
    p_scan_id: scanId,
  });
  if (error) throw error;
  const row = Array.isArray(data) ? data[0] : data;
  return { isPublic: row.is_public, publicId: row.public_id };
}

// ------------------------------------------------------------
// Chat (cited Q&A over a scan)
// ------------------------------------------------------------

/** Fetch the chat thread for a scan, oldest first. */
export async function getChatMessages(
  scanId: string
): Promise<ChatMessageRow[]> {
  const { data, error } = await supabase
    .from("chat_messages")
    .select("*")
    .eq("scan_id", scanId)
    .order("created_at", { ascending: true });
  if (error) throw error;
  return (data ?? []) as ChatMessageRow[];
}

/** Persist one chat turn (either the user's question or the AI's answer). */
export async function saveChatMessage(
  scanId: string,
  role: "user" | "assistant",
  content: string,
  citation?: Citation
): Promise<ChatMessageRow> {
  const { data, error } = await supabase
    .from("chat_messages")
    .insert({
      scan_id: scanId,
      role,
      content,
      citation: citation ?? null,
    })
    .select()
    .single();
  if (error) throw error;
  return data as ChatMessageRow;
}
