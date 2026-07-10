import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { motion } from "motion/react";
import { TopNav } from "../components/TopNav";
import { UrlField } from "../components/UrlField";
import { Lens } from "../components/Lens";
import { ScanningState } from "../components/ScanningState";
import { listScans, runScan } from "../lib/api";
import { prettyHost, relativeDate } from "../lib/format";
import type { Scan } from "../types";

const EASE = [0.23, 1, 0.32, 1] as const;

export function AppHome() {
  const navigate = useNavigate();
  const [scans, setScans] = useState<Scan[]>([]);
  const [phase, setPhase] = useState<"idle" | "scanning">("idle");
  const [stage, setStage] = useState(0);
  const [scanUrl, setScanUrl] = useState("");

  useEffect(() => {
    listScans().then(setScans);
  }, []);

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
      <div className="relative min-h-dvh">
        <TopNav />
        <Lens
          active
          className="absolute right-[-6%] top-[6%] hidden h-[56vh] w-[56vh] md:block"
        />
        <main className="relative z-10 mx-auto flex min-h-[70vh] max-w-2xl items-center justify-center px-6">
          <ScanningState stageIndex={stage} url={scanUrl} />
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-dvh">
      <TopNav />
      <main className="mx-auto max-w-3xl px-5 pb-20 pt-12 sm:px-8">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: EASE }}
        >
          <h1 className="text-[clamp(2rem,4.5vw,2.8rem)]">Scan a site</h1>
          <p className="mt-3 text-[1.1rem]" style={{ color: "var(--ink-soft)" }}>
            Paste any URL and get a cited dossier in seconds.
          </p>
          <div className="mt-7">
            <UrlField onScan={handleScan} autoFocus />
          </div>
        </motion.div>

        <section className="mt-16">
          <div className="mb-4 flex items-baseline justify-between">
            <h2 className="text-[1.25rem]">Recent scans</h2>
            <span className="font-[var(--font-mono)] text-[0.8rem]" style={{ color: "var(--ink-mute)" }}>
              {scans.length} saved
            </span>
          </div>

          {scans.length === 0 ? (
            <div
              className="rounded-2xl px-6 py-12 text-center"
              style={{ background: "var(--surface)", border: "1px dashed var(--rule-strong)" }}
            >
              <p style={{ color: "var(--ink-soft)" }}>
                No scans yet — paste your first URL above.
              </p>
            </div>
          ) : (
            <ul
              className="divide-y overflow-hidden rounded-2xl"
              style={{ border: "1px solid var(--rule)", borderColor: "var(--rule)", background: "var(--surface)" }}
            >
              {scans.map((s) => (
                <li key={s.id}>
                  <Link
                    to={`/scan/${s.id}`}
                    className="group flex items-center gap-4 px-5 py-4 transition-colors"
                    style={{ color: "var(--ink)" }}
                  >
                    <span
                      aria-hidden
                      className="grid h-10 w-10 shrink-0 place-items-center rounded-full font-[var(--font-display)] text-[1.1rem]"
                      style={{ background: "var(--accent-soft)", color: "var(--accent-text)" }}
                    >
                      {s.title.charAt(0)}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium" style={{ color: "var(--ink-strong)" }}>
                        {s.title}
                      </p>
                      <p className="truncate font-[var(--font-mono)] text-[0.8rem]" style={{ color: "var(--ink-mute)" }}>
                        {prettyHost(s.url)}
                      </p>
                    </div>
                    <span className="hidden shrink-0 rounded-full px-2.5 py-1 text-[0.75rem] capitalize sm:inline-block" style={{ background: "var(--surface-2)", color: "var(--ink-soft)" }}>
                      {s.dossier.tone}
                    </span>
                    <span className="shrink-0 text-[0.82rem]" style={{ color: "var(--ink-mute)" }}>
                      {relativeDate(s.created_at)}
                    </span>
                    <span aria-hidden className="shrink-0 transition-transform group-hover:translate-x-0.5" style={{ color: "var(--ink-mute)" }}>
                      ›
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
      </main>
    </div>
  );
}
