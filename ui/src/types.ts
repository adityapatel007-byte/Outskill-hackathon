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
  /** false when the page didn't cover the question (UI shows a friendly card). */
  found?: boolean;
  created_at: string;
}

/** The staged messages shown while a scrape + analyze runs. */
export interface ScanStage {
  label: string;
}

// --- Comparison ------------------------------------------------------------

/** Which side a category favours: "a", "b", or a tie. */
export type CompareSide = "a" | "b" | "tie";

export interface CompareCategory {
  name: string;
  winner: CompareSide;
  /** One sentence, grounded in a concrete fact from the winning site. */
  reason: string;
}

/** The head-to-head verdict returned by the `compare` edge function. */
export interface Comparison {
  summary: string;
  categories: CompareCategory[];
  verdict: string;
}

/** One company in a comparison — its dossier plus identity. */
export interface CompareParty {
  url: string;
  title: string;
  dossier: Dossier;
}

/** A comparison of two sites (assembled client-side from two scans + a verdict). */
export interface CompareResult {
  id: string;
  created_at: string;
  a: CompareParty;
  b: CompareParty;
  comparison: Comparison;
}
