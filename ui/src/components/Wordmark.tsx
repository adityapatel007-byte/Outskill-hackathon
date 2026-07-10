import { Link } from "react-router-dom";

/** The SiteSense wordmark: serif name with a small amber lamp-glow dot. */
export function Wordmark({ to = "/" }: { to?: string }) {
  return (
    <Link
      to={to}
      className="group inline-flex items-baseline gap-[0.4rem]"
      style={{ color: "var(--ink-strong)" }}
      aria-label="SiteSense home"
    >
      <span
        aria-hidden
        className="inline-block h-[0.5rem] w-[0.5rem] translate-y-[-0.1em] rounded-full"
        style={{
          background: "var(--accent)",
          boxShadow: "0 0 0 4px var(--accent-soft)",
        }}
      />
      <span
        className="font-[var(--font-display)] text-[1.35rem] tracking-[-0.02em]"
        style={{ fontWeight: 500 }}
      >
        Site<span style={{ fontStyle: "italic" }}>Sense</span>
      </span>
    </Link>
  );
}
