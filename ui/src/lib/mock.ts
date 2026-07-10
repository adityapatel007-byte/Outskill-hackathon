import type { Scan, ChatMessage } from "../types";

/**
 * Hand-written mock dossiers that read like a real analyst wrote them.
 * These let the whole UI be built + demoed before the edge functions land,
 * and stay as the offline fallback (PLAN.md risk table: cache demo URLs).
 */

export const MOCK_SCANS: Scan[] = [
  {
    id: "scan_notion",
    url: "https://notion.so",
    title: "Notion",
    created_at: "2026-07-10T09:12:00Z",
    public_id: "n7k2p",
    dossier: {
      summary:
        "Notion is a single workspace that folds notes, documents, wikis, and project databases into one connected surface, now wrapped with an AI layer that drafts and answers across everything a team writes.",
      products: [
        "Docs & notes with nested pages",
        "Databases (tables, boards, calendars, timelines)",
        "Team wikis and knowledge bases",
        "Notion AI — writing, search, and Q&A",
        "Notion Calendar",
      ],
      target_audience:
        "Startups and mid-size teams who want one flexible tool instead of a stack of separate apps — plus individuals organizing their own work.",
      pricing_hint: "freemium",
      tone: "approachable",
      key_pages: [
        { label: "Pricing", url: "https://notion.so/pricing" },
        { label: "Notion AI", url: "https://notion.so/product/ai" },
        { label: "Templates", url: "https://notion.so/templates" },
      ],
      notable_claims: [
        "Used by over half of the Forbes Global 2000, per the homepage.",
        "The free plan covers unlimited pages for individuals.",
        "AI is billed as a per-member add-on on top of the base plan.",
      ],
    },
  },
  {
    id: "scan_stripe",
    url: "https://stripe.com",
    title: "Stripe",
    created_at: "2026-07-09T16:40:00Z",
    public_id: null,
    dossier: {
      summary:
        "Stripe is financial infrastructure for the internet: a set of APIs and no-code tools that let businesses accept payments, run marketplaces, issue cards, and handle billing, tax, and reporting without building the plumbing themselves.",
      products: [
        "Payments (online and in-person)",
        "Billing & Invoicing",
        "Connect (marketplaces & platforms)",
        "Tax, Radar (fraud), and Sigma (reporting)",
        "Issuing & Treasury",
      ],
      target_audience:
        "Developers and finance teams at companies of every size — from a first side-project checkout to enterprise platforms moving billions.",
      pricing_hint: "paid",
      tone: "technical",
      key_pages: [
        { label: "Pricing", url: "https://stripe.com/pricing" },
        { label: "Docs", url: "https://stripe.com/docs" },
        { label: "Startups", url: "https://stripe.com/startups" },
      ],
      notable_claims: [
        "Standard online rate is quoted at 2.9% + 30¢ per successful card charge.",
        "Millions of businesses in 135+ currencies are cited on the homepage.",
        "A 99.999% historical uptime figure is highlighted for the API.",
      ],
    },
  },
];

export const MOCK_CHAT: Record<string, ChatMessage[]> = {
  scan_notion: [
    {
      id: "m1",
      role: "user",
      content: "What does the free plan actually include?",
      created_at: "2026-07-10T09:14:00Z",
    },
    {
      id: "m2",
      role: "assistant",
      content:
        "The free plan is aimed at individuals: it covers unlimited pages and blocks for a single user, with a limited number of guests for collaboration. Team features and higher upload limits sit on the paid plans.",
      citation: { label: "Pricing", url: "https://notion.so/pricing" },
      created_at: "2026-07-10T09:14:03Z",
    },
  ],
};

export const SAMPLE_QUESTIONS = [
  "What's their pricing?",
  "Who is this built for?",
  "What's the main product?",
];
