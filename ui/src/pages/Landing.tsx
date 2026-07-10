import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { motion } from "motion/react";
import { TopNav } from "../components/TopNav";
import { UrlField } from "../components/UrlField";
import { Lens } from "../components/Lens";
import { ScanningState } from "../components/ScanningState";
import { runScan } from "../lib/api";
import { MOCK_SCANS } from "../lib/mock";

const EASE = [0.23, 1, 0.32, 1] as const;

export function Landing() {
  const navigate = useNavigate();
  const [phase, setPhase] = useState<"idle" | "scanning">("idle");
  const [stage, setStage] = useState(0);
  const [scanUrl, setScanUrl] = useState("");

  async function handleScan(url: string) {
    setScanUrl(url);
    setStage(0);
    setPhase("scanning");
    try {
      const scan = await runScan(url, setStage);
      navigate(`/scan/${scan.id}`);
    } catch {
      setPhase("idle");
    }
  }

  if (phase === "scanning") {
    return (
      <div className="grain relative min-h-dvh">
        <TopNav />
        <Lens
          active
          className="pointer-events-none absolute right-[-6%] top-[8%] h-[60vh] w-[60vh] opacity-90"
        />
        <main className="relative z-10 mx-auto flex min-h-[70vh] max-w-2xl items-center justify-center px-6">
          <ScanningState stageIndex={stage} url={scanUrl} />
        </main>
      </div>
    );
  }

  return (
    <div className="grain relative min-h-dvh overflow-hidden">
      <TopNav
        right={
          <Link
            to="/auth"
            className="press hidden rounded-full px-4 py-2 text-[0.95rem] font-medium sm:inline-flex"
            style={{ color: "var(--ink-soft)", border: "1px solid var(--rule)" }}
          >
            Sign in
          </Link>
        }
      />

      <main className="relative z-10 mx-auto max-w-6xl px-5 sm:px-8">
        {/* Hero */}
        <section className="relative grid min-h-[calc(100dvh-4rem)] items-center pb-16 pt-10 md:pt-0">
          {/* Lens — corner-anchored, with a gradient scrim keeping the text fully readable */}
          <Lens className="absolute right-[-12%] top-[-10%] z-0 hidden h-[70vh] w-[70vh] md:block" />
          <div
            aria-hidden
            className="absolute inset-0 z-[1] hidden md:block"
            style={{
              background:
                "linear-gradient(102deg, var(--bg) 42%, color-mix(in oklab, var(--bg) 62%, transparent) 60%, transparent 80%)",
            }}
          />

          <motion.div
            initial="hidden"
            animate="show"
            variants={{ show: { transition: { staggerChildren: 0.09 } } }}
            className="relative z-10 min-w-0 max-w-2xl"
          >
            <motion.p
              variants={{ hidden: { opacity: 0, y: 10 }, show: { opacity: 1, y: 0 } }}
              transition={{ duration: 0.6, ease: EASE }}
              className="font-[var(--font-mono)] text-[0.8rem] tracking-[0.18em]"
              style={{ color: "var(--accent-text)" }}
            >
              THE ANALYST THAT READS WEBSITES FOR YOU
            </motion.p>

            <motion.h1
              variants={{ hidden: { opacity: 0, y: 14 }, show: { opacity: 1, y: 0 } }}
              transition={{ duration: 0.7, ease: EASE }}
              className="mt-6 text-[clamp(2.6rem,6vw,4.4rem)]"
            >
              Paste a URL. Ask anything.
              <br />
              Get answers with{" "}
              <span style={{ fontStyle: "italic", color: "var(--accent-text)" }}>
                sources
              </span>
              .
            </motion.h1>

            <motion.p
              variants={{ hidden: { opacity: 0, y: 14 }, show: { opacity: 1, y: 0 } }}
              transition={{ duration: 0.7, ease: EASE }}
              className="mt-6 max-w-md text-[1.15rem] leading-relaxed"
              style={{ color: "var(--ink-soft)" }}
            >
              SiteSense reads a whole website — home, pricing, about, the lot —
              and hands you a clear dossier. Then it answers your questions about
              it, every reply cited back to the page.
            </motion.p>

            <motion.div
              variants={{ hidden: { opacity: 0, y: 14 }, show: { opacity: 1, y: 0 } }}
              transition={{ duration: 0.7, ease: EASE }}
              className="mt-9 max-w-xl"
            >
              <UrlField onScan={handleScan} />
              <p className="mt-3 px-2 text-[0.9rem]" style={{ color: "var(--ink-mute)" }}>
                Try it on a site you know — no sign-up to look.
              </p>
            </motion.div>
          </motion.div>
        </section>

        {/* Sample dossier — the payoff, shown once, calmly. */}
        <SamplePreview />
      </main>

      <footer className="relative z-10 border-t px-5 py-10 sm:px-8" style={{ borderColor: "var(--rule)" }}>
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-3 text-[0.85rem] sm:flex-row" style={{ color: "var(--ink-mute)" }}>
          <span>SiteSense — a hackathon build by team ASP.</span>
          <span className="font-[var(--font-mono)]">Paste. Ask. Cite.</span>
        </div>
      </footer>
    </div>
  );
}

function SamplePreview() {
  const scan = MOCK_SCANS[0];
  const d = scan.dossier;
  return (
    <section className="pb-24">
      <div className="mb-6 flex items-baseline justify-between">
        <h2 className="text-[1.6rem]">A dossier, in seconds</h2>
        <span className="font-[var(--font-mono)] text-[0.8rem]" style={{ color: "var(--ink-mute)" }}>
          example · notion.so
        </span>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 24, filter: "blur(4px)" }}
        whileInView={{ opacity: 1, y: 0, filter: "blur(0px)" }}
        viewport={{ once: true, margin: "-80px" }}
        transition={{ duration: 0.7, ease: EASE }}
        className="grid gap-6 rounded-3xl p-7 sm:p-9 md:grid-cols-[1.4fr_1fr]"
        style={{ background: "var(--surface)", border: "1px solid var(--rule)" }}
      >
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full px-3 py-1 text-[0.78rem] font-medium" style={{ background: "var(--accent-soft)", color: "var(--accent-text)" }}>
              {d.tone}
            </span>
            <span className="rounded-full px-3 py-1 text-[0.78rem] font-medium" style={{ background: "var(--surface-2)", color: "var(--ink-soft)" }}>
              {d.pricing_hint}
            </span>
          </div>
          <p className="mt-5 text-[1.15rem] leading-relaxed" style={{ color: "var(--ink)" }}>
            {d.summary}
          </p>
          <ul className="mt-6 space-y-2">
            {d.products.slice(0, 4).map((p) => (
              <li key={p} className="flex items-baseline gap-3" style={{ color: "var(--ink-soft)" }}>
                <span className="font-[var(--font-mono)] text-[0.75rem]" style={{ color: "var(--accent-text)" }}>
                  →
                </span>
                {p}
              </li>
            ))}
          </ul>
        </div>

        <div className="rounded-2xl p-5" style={{ background: "var(--surface-2)" }}>
          <p className="font-[var(--font-mono)] text-[0.72rem] tracking-[0.12em]" style={{ color: "var(--ink-mute)" }}>
            YOU ASKED
          </p>
          <p className="mt-2 font-medium" style={{ color: "var(--ink-strong)" }}>
            What does the free plan include?
          </p>
          <p className="mt-4 leading-relaxed" style={{ color: "var(--ink-soft)" }}>
            The free plan is aimed at individuals: unlimited pages and blocks for
            a single user, with a few guests for collaboration.
          </p>
          <a
            href={d.key_pages[0].url}
            target="_blank"
            rel="noreferrer"
            className="mt-4 inline-flex items-center gap-1.5 font-[var(--font-mono)] text-[0.8rem]"
            style={{ color: "var(--accent-text)" }}
          >
            [ see: {d.key_pages[0].label} ]
          </a>
        </div>
      </motion.div>
    </section>
  );
}
