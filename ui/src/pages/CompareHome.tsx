import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { AnimatePresence, motion } from "motion/react";
import { TopNav } from "../components/TopNav";
import { Lens } from "../components/Lens";
import { listScans, runCompare, COMPARE_STAGES } from "../lib/api";
import { normalizeUrl, prettyHost } from "../lib/format";
import type { Scan } from "../types";

const EASE = [0.23, 1, 0.32, 1] as const;

export function CompareHome() {
  const navigate = useNavigate();
  const [urlA, setUrlA] = useState("");
  const [urlB, setUrlB] = useState("");
  const [recent, setRecent] = useState<Scan[]>([]);
  const [phase, setPhase] = useState<"idle" | "comparing">("idle");
  const [stage, setStage] = useState(0);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    listScans()
      .then(setRecent)
      .catch(() => setRecent([]));
  }, []);

  /** Fill whichever field is empty first when a recent site is picked. */
  function seed(url: string) {
    if (!urlA.trim()) setUrlA(url);
    else setUrlB(url);
  }

  async function handleCompare(e: React.FormEvent) {
    e.preventDefault();
    const a = normalizeUrl(urlA);
    const b = normalizeUrl(urlB);
    if (!a || !b) {
      setError("Enter two valid website URLs to compare.");
      return;
    }
    if (prettyHost(a) === prettyHost(b)) {
      setError("Pick two different sites.");
      return;
    }
    setError(null);
    setStage(0);
    setPhase("comparing");
    try {
      const result = await runCompare(a, b, setStage);
      navigate(`/compare/${result.id}`);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Something went wrong. Try again.",
      );
      setPhase("idle");
    }
  }

  if (phase === "comparing") {
    const label = COMPARE_STAGES[Math.min(stage, COMPARE_STAGES.length - 1)].label;
    return (
      <div className="relative min-h-dvh">
        <TopNav />
        <Lens
          active
          className="absolute right-[-6%] top-[6%] hidden h-[56vh] w-[56vh] md:block"
        />
        <main className="relative z-10 mx-auto flex min-h-[70vh] max-w-2xl items-center justify-center px-6">
          <div className="flex flex-col items-center gap-8 text-center">
            <div className="flex items-center gap-2" aria-hidden>
              {COMPARE_STAGES.map((_, i) => (
                <span
                  key={i}
                  className="h-1.5 rounded-full transition-all duration-500"
                  style={{
                    width: i === stage ? "2.5rem" : "0.75rem",
                    background: i <= stage ? "var(--accent)" : "var(--rule-strong)",
                  }}
                />
              ))}
            </div>
            <div className="min-h-[3.5rem]" role="status" aria-live="polite">
              <AnimatePresence mode="wait">
                <motion.p
                  key={label}
                  initial={{ opacity: 0, y: 8, filter: "blur(6px)" }}
                  animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                  exit={{ opacity: 0, y: -8, filter: "blur(6px)" }}
                  transition={{ duration: 0.32, ease: EASE }}
                  className="font-[var(--font-display)] text-[1.75rem] sm:text-[2.1rem]"
                  style={{ color: "var(--ink-strong)" }}
                >
                  {label}
                </motion.p>
              </AnimatePresence>
            </div>
            <p className="text-[0.9rem]" style={{ color: "var(--ink-mute)" }}>
              <span className="font-[var(--font-mono)]" style={{ color: "var(--accent-text)" }}>
                {prettyHost(normalizeUrl(urlA) ?? urlA)}
              </span>{" "}
              vs{" "}
              <span className="font-[var(--font-mono)]" style={{ color: "var(--accent-text)" }}>
                {prettyHost(normalizeUrl(urlB) ?? urlB)}
              </span>
            </p>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-dvh">
      <TopNav
        right={
          <Link
            to="/app"
            className="press rounded-full px-4 py-2 text-[0.9rem] font-medium"
            style={{ background: "var(--surface)", color: "var(--ink)", border: "1px solid var(--rule-strong)" }}
          >
            Scan a site
          </Link>
        }
      />
      <main className="mx-auto max-w-3xl px-5 pb-20 pt-12 sm:px-8">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: EASE }}
        >
          <h1 className="text-[clamp(2rem,4.5vw,2.8rem)]">Compare two sites</h1>
          <p className="mt-3 text-[1.1rem]" style={{ color: "var(--ink-soft)" }}>
            Paste two URLs — say Adidas and Nike — and get a side-by-side with a
            clear winner in each category. Every call is grounded in what the
            sites actually say.
          </p>

          <form onSubmit={handleCompare} className="mt-8">
            <div className="grid gap-4 sm:grid-cols-[1fr_auto_1fr] sm:items-center">
              <CompareInput
                label="Site A"
                value={urlA}
                onChange={setUrlA}
                placeholder="adidas.com"
                autoFocus
              />
              <span
                aria-hidden
                className="hidden text-center font-[var(--font-display)] text-[1.3rem] sm:block"
                style={{ color: "var(--ink-mute)" }}
              >
                vs
              </span>
              <CompareInput
                label="Site B"
                value={urlB}
                onChange={setUrlB}
                placeholder="nike.com"
              />
            </div>

            {error && (
              <p className="mt-4 text-[0.9rem]" style={{ color: "var(--clay)" }} role="alert">
                {error}
              </p>
            )}

            <button
              type="submit"
              className="press mt-6 inline-flex items-center gap-2 rounded-full px-6 py-3 text-[1rem] font-medium"
              style={{ background: "var(--accent)", color: "var(--on-accent)" }}
            >
              Compare
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                <path d="M5 12h14M13 6l6 6-6 6" />
              </svg>
            </button>
          </form>
        </motion.div>

        {recent.length > 0 && (
          <section className="mt-14">
            <h2 className="mb-3 font-[var(--font-mono)] text-[0.75rem] tracking-[0.12em]" style={{ color: "var(--ink-mute)" }}>
              OR PICK FROM RECENT SCANS
            </h2>
            <div className="flex flex-wrap gap-2">
              {recent.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => seed(s.url)}
                  className="press inline-flex items-center gap-2 rounded-full px-3.5 py-2 text-[0.88rem]"
                  style={{ background: "var(--surface)", color: "var(--ink)", border: "1px solid var(--rule)" }}
                >
                  <span
                    aria-hidden
                    className="grid h-5 w-5 place-items-center rounded-full text-[0.7rem]"
                    style={{ background: "var(--accent-soft)", color: "var(--accent-text)" }}
                  >
                    {s.title.charAt(0)}
                  </span>
                  {prettyHost(s.url)}
                </button>
              ))}
            </div>
          </section>
        )}
      </main>
    </div>
  );
}

function CompareInput({
  label,
  value,
  onChange,
  placeholder,
  autoFocus = false,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  autoFocus?: boolean;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block font-[var(--font-mono)] text-[0.75rem] tracking-[0.1em]" style={{ color: "var(--ink-mute)" }}>
        {label.toUpperCase()}
      </span>
      <input
        type="text"
        inputMode="url"
        value={value}
        autoFocus={autoFocus}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full rounded-xl px-4 py-3 text-[1.05rem] outline-none transition-shadow focus:shadow-[0_0_0_2px_var(--accent)]"
        style={{ background: "var(--surface)", color: "var(--ink-strong)", border: "1px solid var(--rule-strong)" }}
      />
    </label>
  );
}
