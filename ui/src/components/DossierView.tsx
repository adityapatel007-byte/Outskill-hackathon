import type { ReactNode } from "react";
import type { Scan } from "../types";
import { prettyHost } from "../lib/format";

/**
 * The dossier, set like a research brief — a plain-English lead, a labeled
 * list of what they do, pull-quoted claims, and cited pages. Used full-width
 * on the scan page (left column) and read-only on the share page.
 */
export function DossierView({
  scan,
  readOnly = false,
  onShare,
  shareId,
  sharing = false,
}: {
  scan: Scan;
  readOnly?: boolean;
  onShare?: () => void;
  shareId?: string | null;
  sharing?: boolean;
}) {
  const d = scan.dossier;

  return (
    <article className="max-w-2xl">
      {/* Header */}
      <header>
        <div className="flex flex-wrap items-center gap-2">
          <Badge tone="accent">{d.tone}</Badge>
          <Badge>{d.pricing_hint}</Badge>
        </div>

        <h1 className="mt-5 text-[clamp(2.2rem,5vw,3.2rem)]">{scan.title}</h1>

        <a
          href={scan.url}
          target="_blank"
          rel="noreferrer"
          className="mt-3 inline-flex items-center gap-1.5 font-[var(--font-mono)] text-[0.9rem]"
          style={{ color: "var(--accent-text)" }}
        >
          {prettyHost(scan.url)}
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <path d="M7 17 17 7M9 7h8v8" />
          </svg>
        </a>

        {!readOnly && (
          <div className="mt-5">
            <ShareControl onShare={onShare} shareId={shareId} sharing={sharing} />
          </div>
        )}
      </header>

      {/* Summary — the lead */}
      <p
        className="mt-8 text-[1.3rem] leading-[1.55]"
        style={{ color: "var(--ink)", fontFamily: "var(--font-display)" }}
      >
        {d.summary}
      </p>

      {/* What they do */}
      <Section title="What they do">
        <ul className="space-y-3">
          {d.products.map((p, i) => (
            <li key={p} className="flex items-baseline gap-4">
              <span
                className="w-6 shrink-0 font-[var(--font-mono)] text-[0.8rem]"
                style={{ color: "var(--ink-mute)" }}
              >
                {String(i + 1).padStart(2, "0")}
              </span>
              <span style={{ color: "var(--ink)" }}>{p}</span>
            </li>
          ))}
        </ul>
      </Section>

      {/* Who it's for */}
      <Section title="Who it's for">
        <p className="leading-relaxed" style={{ color: "var(--ink-soft)" }}>
          {d.target_audience}
        </p>
      </Section>

      {/* Notable claims — pull-quotes */}
      {d.notable_claims.length > 0 && (
        <Section title="Notable claims">
          <div className="space-y-5">
            {d.notable_claims.map((c) => (
              <blockquote
                key={c}
                className="relative pl-6 text-[1.05rem] leading-relaxed"
                style={{ color: "var(--ink)" }}
              >
                <span
                  aria-hidden
                  className="absolute left-0 top-0 font-[var(--font-display)] text-[1.6rem] leading-none"
                  style={{ color: "var(--accent)" }}
                >
                  “
                </span>
                {c}
              </blockquote>
            ))}
          </div>
        </Section>
      )}

      {/* Key pages */}
      {d.key_pages.length > 0 && (
        <Section title="Key pages">
          <ul className="divide-y" style={{ borderColor: "var(--rule)" }}>
            {d.key_pages.map((page) => (
              <li key={page.url}>
                <a
                  href={page.url}
                  target="_blank"
                  rel="noreferrer"
                  className="press flex items-center justify-between gap-4 py-3"
                >
                  <span style={{ color: "var(--ink)" }}>{page.label}</span>
                  <span
                    className="truncate font-[var(--font-mono)] text-[0.8rem]"
                    style={{ color: "var(--accent-text)" }}
                  >
                    {prettyHost(page.url)} ↗
                  </span>
                </a>
              </li>
            ))}
          </ul>
        </Section>
      )}
    </article>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="mt-10 border-t pt-8" style={{ borderColor: "var(--rule)" }}>
      <h2 className="mb-4 text-[1.15rem]" style={{ color: "var(--ink-strong)" }}>
        {title}
      </h2>
      {children}
    </section>
  );
}

function Badge({
  children,
  tone = "neutral",
}: {
  children: ReactNode;
  tone?: "neutral" | "accent";
}) {
  const accent = tone === "accent";
  return (
    <span
      className="rounded-full px-3 py-1 text-[0.78rem] font-medium capitalize"
      style={{
        background: accent ? "var(--accent-soft)" : "var(--surface-2)",
        color: accent ? "var(--accent-text)" : "var(--ink-soft)",
      }}
    >
      {children}
    </span>
  );
}

function ShareControl({
  onShare,
  shareId,
  sharing,
}: {
  onShare?: () => void;
  shareId?: string | null;
  sharing?: boolean;
}) {
  const shareUrl = shareId ? `${window.location.origin}/share/${shareId}` : null;

  if (shareUrl) {
    return (
      <div
        className="flex flex-wrap items-center gap-2 rounded-full py-1.5 pl-4 pr-1.5"
        style={{ background: "var(--surface-2)" }}
      >
        <span className="truncate font-[var(--font-mono)] text-[0.8rem]" style={{ color: "var(--ink-soft)" }}>
          {shareUrl.replace(/^https?:\/\//, "")}
        </span>
        <button
          type="button"
          onClick={() => navigator.clipboard?.writeText(shareUrl)}
          className="press rounded-full px-3 py-1.5 text-[0.82rem] font-medium"
          style={{ background: "var(--accent)", color: "var(--on-accent)" }}
        >
          Copy link
        </button>
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={onShare}
      disabled={sharing}
      className="press inline-flex items-center gap-2 rounded-full px-4 py-2 text-[0.9rem] font-medium disabled:opacity-60"
      style={{ background: "var(--surface)", color: "var(--ink)", border: "1px solid var(--rule-strong)" }}
    >
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        <circle cx="18" cy="5" r="3" /><circle cx="6" cy="12" r="3" /><circle cx="18" cy="19" r="3" />
        <path d="m8.6 13.5 6.8 4M15.4 6.5l-6.8 4" />
      </svg>
      {sharing ? "Creating link…" : "Share dossier"}
    </button>
  );
}
