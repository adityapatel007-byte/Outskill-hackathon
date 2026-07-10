import type { Scan, ChatMessage, ScanStage } from "../types";
import { MOCK_SCANS, MOCK_CHAT } from "./mock";
import { supabase } from "./supabase";

/**
 * The single seam between UI and backend.
 *
 * While teammates (P3/P4/P5) finish the Supabase edge functions, everything
 * runs on the mock store below. Flip USE_MOCK to false (or set VITE_USE_MOCK
 * = "false") once the real endpoints are live — the component layer never
 * changes, only this file.
 */
export const USE_MOCK =
  (import.meta.env.VITE_USE_MOCK ?? "true").toString() !== "false";

/** Staged loading copy — the "feels magical, not slow" sequence. */
export const SCAN_STAGES: ScanStage[] = [
  { label: "Reading the site…" },
  { label: "Understanding what they do…" },
  { label: "Building your dossier…" },
];

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

// --- In-memory mock store -------------------------------------------------

const store: Scan[] = [...MOCK_SCANS];
const chats: Record<string, ChatMessage[]> = structuredClone(MOCK_CHAT);

function titleFromUrl(url: string): string {
  try {
    const host = new URL(url).hostname.replace(/^www\./, "");
    const base = host.split(".")[0];
    return base.charAt(0).toUpperCase() + base.slice(1);
  } catch {
    return "Untitled site";
  }
}

// --- Public API -----------------------------------------------------------

export async function listScans(): Promise<Scan[]> {
  if (USE_MOCK) {
    await wait(180);
    return [...store].sort((a, b) => b.created_at.localeCompare(a.created_at));
  }
  const { data, error } = await supabase
    .from("scans")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data as Scan[];
}

export async function getScan(id: string): Promise<Scan | null> {
  if (USE_MOCK) {
    await wait(150);
    return store.find((s) => s.id === id) ?? null;
  }
  const { data, error } = await supabase.from("scans").select("*").eq("id", id).maybeSingle();
  if (error) throw error;
  return (data as Scan | null) ?? null;
}

export async function getSharedScan(publicId: string): Promise<Scan | null> {
  if (USE_MOCK) {
    await wait(150);
    return store.find((s) => s.public_id === publicId) ?? null;
  }
  const { data, error } = await supabase
    .from("scans")
    .select("*")
    .eq("public_id", publicId)
    .maybeSingle();
  if (error) throw error;
  return (data as Scan | null) ?? null;
}

/**
 * Full scan pipeline: scrape → analyze. In mock mode we clone an existing
 * dossier so any URL returns something demo-worthy. `onStage` drives the
 * staged loading copy.
 */
export async function runScan(
  url: string,
  onStage?: (index: number) => void
): Promise<Scan> {
  if (USE_MOCK) {
    for (let i = 0; i < SCAN_STAGES.length; i++) {
      onStage?.(i);
      await wait(950);
    }
    // Match a known demo host to its curated dossier; otherwise pick one so
    // any URL still returns something believable.
    let host = "";
    try {
      host = new URL(url).hostname.replace(/^www\./, "");
    } catch {
      /* ignore */
    }
    const matched = MOCK_SCANS.find((s) => {
      try {
        return new URL(s.url).hostname.replace(/^www\./, "") === host;
      } catch {
        return false;
      }
    });
    const template =
      matched ?? MOCK_SCANS[Math.floor(Math.random() * MOCK_SCANS.length)];
    const title = titleFromUrl(url);
    const scan: Scan = {
      ...structuredClone(template),
      id: `scan_${Date.now()}`,
      url,
      title,
      created_at: new Date().toISOString(),
      public_id: null,
    };
    store.unshift(scan);
    return scan;
  }

  // Drive the staged loading copy client-side while the single edge-function
  // call (scrape + analyze + store) runs in the background.
  let stageIndex = 0;
  onStage?.(0);
  const stageTimer = setInterval(() => {
    stageIndex = Math.min(stageIndex + 1, SCAN_STAGES.length - 1);
    onStage?.(stageIndex);
  }, 1400);

  try {
    const { data, error } = await supabase.functions.invoke("scrape-analyze", {
      body: { url },
    });
    if (error) throw error;
    if (data?.error) throw new Error(data.error);
    return data as Scan;
  } finally {
    clearInterval(stageTimer);
  }
}

export async function getMessages(scanId: string): Promise<ChatMessage[]> {
  if (USE_MOCK) {
    await wait(120);
    return chats[scanId] ? [...chats[scanId]] : [];
  }
  const { data, error } = await supabase
    .from("chat_messages")
    .select("*")
    .eq("scan_id", scanId)
    .order("created_at", { ascending: true });
  if (error) throw error;
  return data as ChatMessage[];
}

/** Ask a question about a scanned site. Mock answers are grounded + cited. */
export async function askQuestion(
  scanId: string,
  question: string
): Promise<{ user: ChatMessage; assistant: ChatMessage }> {
  if (USE_MOCK) {
    const scan = store.find((s) => s.id === scanId);
    const now = Date.now();
    const user: ChatMessage = {
      id: `m_${now}`,
      role: "user",
      content: question,
      created_at: new Date().toISOString(),
    };
    await wait(1100);
    const cite = scan?.dossier.key_pages[0] ?? {
      label: "Homepage",
      url: scan?.url ?? "",
    };
    const assistant: ChatMessage = {
      id: `m_${now + 1}`,
      role: "assistant",
      content: mockAnswer(question, scan),
      citation: cite,
      created_at: new Date().toISOString(),
    };
    chats[scanId] = [...(chats[scanId] ?? []), user, assistant];
    return { user, assistant };
  }
  const { data, error } = await supabase.functions.invoke("chat", {
    body: { scan_id: scanId, question },
  });
  if (error) throw error;
  if (data?.error) throw new Error(data.error);
  return data as { user: ChatMessage; assistant: ChatMessage };
}

export async function clearMessages(scanId: string): Promise<void> {
  if (USE_MOCK) {
    chats[scanId] = [];
    return;
  }
  const { error } = await supabase.from("chat_messages").delete().eq("scan_id", scanId);
  if (error) throw error;
}

/** Toggle a scan public and return its share id. */
export async function toggleShare(scanId: string): Promise<string | null> {
  if (USE_MOCK) {
    const scan = store.find((s) => s.id === scanId);
    if (!scan) return null;
    scan.public_id = scan.public_id ?? Math.random().toString(36).slice(2, 8);
    return scan.public_id;
  }
  const { data, error } = await supabase.rpc("toggle_share", { scan_id: scanId });
  if (error) throw error;
  return (data as string) ?? null;
}

function mockAnswer(question: string, scan?: Scan): string {
  if (!scan) return "The site doesn't mention this.";
  const q = question.toLowerCase();
  const d = scan.dossier;
  if (q.includes("pric") || q.includes("cost") || q.includes("plan"))
    return `Pricing reads as ${d.pricing_hint}. ${d.notable_claims.find((c) => /price|plan|\$|%|free/i.test(c)) ?? d.notable_claims[0]}`;
  if (q.includes("who") || q.includes("audience") || q.includes("for"))
    return d.target_audience;
  if (q.includes("product") || q.includes("do") || q.includes("offer"))
    return `${d.summary} Their main offerings: ${d.products.slice(0, 3).join(", ")}.`;
  return d.summary;
}
