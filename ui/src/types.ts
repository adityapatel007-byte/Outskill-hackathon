/** Domain types — mirror the edge-function contracts in PLAN.md §3.2 / TEAM.md. */

export type PricingHint =
  | "free"
  | "freemium"
  | "paid"
  | "enterprise"
  | "unknown";

export interface KeyPage {
  label: string;
  url: string;
}

/** The structured dossier returned by POST /analyze. */
export interface Dossier {
  summary: string;
  products: string[];
  target_audience: string;
  pricing_hint: PricingHint;
  tone: string;
  key_pages: KeyPage[];
  notable_claims: string[];
}

/** A saved scan row (Supabase `scans`). */
export interface Scan {
  id: string;
  url: string;
  title: string;
  created_at: string;
  dossier: Dossier;
  public_id?: string | null;
}

export type ChatRole = "user" | "assistant";

export interface ChatMessage {
  id: string;
  role: ChatRole;
  content: string;
  /** Present on grounded assistant answers: the source the answer cites. */
  citation?: KeyPage | null;
  created_at: string;
}

/** The staged messages shown while a scrape + analyze runs. */
export interface ScanStage {
  label: string;
}
