import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { motion } from "motion/react";
import { Wordmark } from "../components/Wordmark";
import { ThemeToggle } from "../components/ThemeToggle";
import { DossierView } from "../components/DossierView";
import { getSharedScan } from "../lib/api";
import type { Scan } from "../types";

const EASE = [0.23, 1, 0.32, 1] as const;

export function Share() {
  const { publicId = "" } = useParams();
  const [scan, setScan] = useState<Scan | null>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "missing">("loading");

  useEffect(() => {
    getSharedScan(publicId).then((s) => {
      setScan(s);
      setStatus(s ? "ready" : "missing");
    });
  }, [publicId]);

  return (
    <div className="min-h-dvh">
      <header
        className="sticky top-0 z-30 w-full backdrop-blur-[6px]"
        style={{
          background: "color-mix(in oklab, var(--bg) 82%, transparent)",
          borderBottom: "1px solid var(--rule)",
        }}
      >
        <div className="mx-auto flex h-16 max-w-3xl items-center justify-between px-5 sm:px-8">
          <div className="flex items-center gap-3">
            <Wordmark />
            <span
              className="rounded-full px-2.5 py-1 font-[var(--font-mono)] text-[0.72rem]"
              style={{ background: "var(--surface-2)", color: "var(--ink-mute)" }}
            >
              shared dossier
            </span>
          </div>
          <ThemeToggle />
        </div>
      </header>

      {status === "loading" && (
        <div className="mx-auto max-w-3xl px-5 py-24 sm:px-8">
          <div className="animate-pulse space-y-4">
            <div className="h-12 w-56 rounded-lg" style={{ background: "var(--surface-2)" }} />
            <div className="h-4 w-full max-w-xl rounded" style={{ background: "var(--surface-2)" }} />
          </div>
        </div>
      )}

      {status === "missing" && (
        <div className="mx-auto flex max-w-xl flex-col items-center gap-5 px-6 py-32 text-center">
          <h1 className="text-[2rem]">This dossier isn't public.</h1>
          <p style={{ color: "var(--ink-soft)" }}>
            The link may be old, or sharing was turned off.
          </p>
          <Link
            to="/"
            className="press rounded-full px-5 py-2.5 font-medium"
            style={{ background: "var(--accent)", color: "var(--on-accent)" }}
          >
            Make your own
          </Link>
        </div>
      )}

      {status === "ready" && scan && (
        <motion.main
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: EASE }}
          className="mx-auto max-w-3xl px-5 pb-16 pt-10 sm:px-8"
        >
          <DossierView scan={scan} readOnly />

          <div
            className="mt-14 flex flex-col items-center gap-4 rounded-3xl px-6 py-10 text-center"
            style={{ background: "var(--surface)", border: "1px solid var(--rule)" }}
          >
            <p className="font-[var(--font-display)] text-[1.5rem]" style={{ color: "var(--ink-strong)" }}>
              Read any website like this.
            </p>
            <Link
              to="/"
              className="press rounded-full px-6 py-3 font-medium"
              style={{ background: "var(--accent)", color: "var(--on-accent)" }}
            >
              Try SiteSense
            </Link>
          </div>
        </motion.main>
      )}

      <footer className="px-5 py-8 text-center text-[0.82rem]" style={{ color: "var(--ink-mute)" }}>
        Powered by <span style={{ color: "var(--ink-soft)" }}>SiteSense</span>
      </footer>
    </div>
  );
}
