import type { KeyPage } from "../types";

/** The signature "[ see: … ]" source link that ends every grounded answer. */
export function CitationChip({ citation }: { citation: KeyPage }) {
  return (
    <a
      href={citation.url}
      target="_blank"
      rel="noreferrer"
      className="press mt-3 inline-flex max-w-full items-center gap-1.5 truncate rounded-full px-3 py-1 font-[var(--font-mono)] text-[0.78rem]"
      style={{
        background: "var(--accent-soft)",
        color: "var(--accent-text)",
      }}
      title={citation.url}
    >
      <span aria-hidden>[ see:</span>
      <span className="truncate">{citation.label}</span>
      <span aria-hidden>]</span>
    </a>
  );
}
