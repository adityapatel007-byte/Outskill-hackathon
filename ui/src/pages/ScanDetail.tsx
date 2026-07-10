import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { motion } from "motion/react";
import { TopNav } from "../components/TopNav";
import { DossierView } from "../components/DossierView";
import { ChatPanel } from "../components/ChatPanel";
import { getScan, toggleShare } from "../lib/api";
import type { Scan } from "../types";

const EASE = [0.23, 1, 0.32, 1] as const;

export function ScanDetail() {
  const { id = "" } = useParams();
  const [scan, setScan] = useState<Scan | null>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "missing">("loading");
  const [shareId, setShareId] = useState<string | null>(null);
  const [sharing, setSharing] = useState(false);

  useEffect(() => {
    let alive = true;
    setStatus("loading");
    getScan(id).then((s) => {
      if (!alive) return;
      if (s) {
        setScan(s);
        setShareId(s.public_id ?? null);
        setStatus("ready");
      } else {
        setStatus("missing");
      }
    });
    return () => {
      alive = false;
    };
  }, [id]);

  async function handleShare() {
    setSharing(true);
    const pid = await toggleShare(id);
    setShareId(pid);
    setSharing(false);
  }

  const right = (
    <Link
      to="/app"
      className="press inline-flex items-center gap-2 rounded-full px-4 py-2 text-[0.9rem] font-medium"
      style={{ background: "var(--accent)", color: "var(--on-accent)" }}
    >
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        <path d="M12 5v14M5 12h14" />
      </svg>
      New scan
    </Link>
  );

  return (
    <div className="min-h-dvh">
      <TopNav right={right} />

      {status === "loading" && (
        <div className="mx-auto max-w-6xl px-5 py-24 sm:px-8">
          <div className="animate-pulse space-y-4">
            <div className="h-6 w-24 rounded-full" style={{ background: "var(--surface-2)" }} />
            <div className="h-12 w-64 rounded-lg" style={{ background: "var(--surface-2)" }} />
            <div className="h-4 w-full max-w-xl rounded" style={{ background: "var(--surface-2)" }} />
            <div className="h-4 w-full max-w-lg rounded" style={{ background: "var(--surface-2)" }} />
          </div>
        </div>
      )}

      {status === "missing" && (
        <div className="mx-auto flex max-w-xl flex-col items-center gap-5 px-6 py-32 text-center">
          <h1 className="text-[2rem]">That scan isn't here.</h1>
          <p style={{ color: "var(--ink-soft)" }}>
            It may have been cleared, or the link is wrong.
          </p>
          <Link
            to="/app"
            className="press rounded-full px-5 py-2.5 font-medium"
            style={{ background: "var(--accent)", color: "var(--on-accent)" }}
          >
            Scan a site
          </Link>
        </div>
      )}

      {status === "ready" && scan && (
        <motion.main
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: EASE }}
          className="mx-auto max-w-6xl px-5 pb-16 pt-8 sm:px-8"
        >
          <div className="grid gap-8 lg:grid-cols-[1.35fr_1fr]">
            {/* Dossier — scrolls with the page */}
            <div>
              <DossierView
                scan={scan}
                onShare={handleShare}
                shareId={shareId}
                sharing={sharing}
              />
            </div>

            {/* Chat — pinned alongside on desktop */}
            <div className="h-[75vh] lg:sticky lg:top-[5.5rem] lg:h-[calc(100dvh-7rem)]">
              <ChatPanel scanId={scan.id} dossier={scan.dossier} />
            </div>
          </div>
        </motion.main>
      )}
    </div>
  );
}
