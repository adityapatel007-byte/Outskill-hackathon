import { useState, type FormEvent } from "react";
import { normalizeUrl } from "../lib/format";

/**
 * The product's primary action, everywhere it appears: paste a URL, hit Scan.
 * Validates + normalizes before submitting so "stripe.com" just works.
 */
export function UrlField({
  onScan,
  busy = false,
  size = "lg",
  autoFocus = false,
}: {
  onScan: (url: string) => void;
  busy?: boolean;
  size?: "lg" | "md";
  autoFocus?: boolean;
}) {
  const [value, setValue] = useState("");
  const [error, setError] = useState<string | null>(null);

  function submit(e: FormEvent) {
    e.preventDefault();
    const url = normalizeUrl(value);
    if (!url) {
      setError("That doesn't look like a web address. Try something like stripe.com");
      return;
    }
    setError(null);
    onScan(url);
  }

  const big = size === "lg";

  return (
    <form onSubmit={submit} noValidate className="w-full">
      <div
        className="field-shell flex items-center gap-2 rounded-full"
        style={{ padding: big ? "0.5rem 0.5rem 0.5rem 1.25rem" : "0.35rem 0.35rem 0.35rem 1rem" }}
      >
        <span aria-hidden className="shrink-0" style={{ color: "var(--ink-mute)" }}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
            <circle cx="11" cy="11" r="7" />
            <path d="m20 20-3.2-3.2" />
          </svg>
        </span>
        <label htmlFor="url-field" className="sr-only">
          Website address
        </label>
        <input
          id="url-field"
          type="text"
          inputMode="url"
          autoComplete="url"
          spellCheck={false}
          // eslint-disable-next-line jsx-a11y/no-autofocus
          autoFocus={autoFocus}
          placeholder="Paste any website — e.g. notion.so"
          value={value}
          onChange={(e) => {
            setValue(e.target.value);
            if (error) setError(null);
          }}
          disabled={busy}
          aria-invalid={!!error}
          aria-describedby={error ? "url-error" : undefined}
          className="min-w-0 flex-1 bg-transparent outline-none placeholder:text-[var(--ink-mute)]"
          style={{
            color: "var(--ink-strong)",
            fontSize: big ? "1.125rem" : "1rem",
            padding: "0.4rem 0",
          }}
        />
        <button
          type="submit"
          disabled={busy}
          className="press inline-flex shrink-0 items-center gap-2 rounded-full font-medium disabled:opacity-60"
          style={{
            background: "var(--accent)",
            color: "var(--on-accent)",
            padding: big ? "0.7rem 1.5rem" : "0.55rem 1.15rem",
            fontSize: big ? "1rem" : "0.9rem",
          }}
        >
          {busy ? "Scanning…" : "Scan"}
          {!busy && (
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <path d="M5 12h14M13 6l6 6-6 6" />
            </svg>
          )}
        </button>
      </div>
      {error && (
        <p
          id="url-error"
          role="alert"
          className="mt-3 px-2 text-[0.9rem]"
          style={{ color: "var(--clay)" }}
        >
          {error}
        </p>
      )}
    </form>
  );
}
