import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { motion } from "motion/react";
import { TopNav } from "../components/TopNav";
import { DossierView } from "../components/DossierView";
import { getCompare } from "../lib/api";
import { prettyHost, brandName } from "../lib/format";
import type { CompareResult as Compare, CompareSide, Scan } from "../types";

const EASE = [0.23, 1, 0.32, 1] as const;

export function CompareResult() {
  const { id } = useParams();
  const [cmp, setCmp] = useState<Compare | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    getCompare(id).then((c) => {
      setCmp(c);
      setLoading(false);
    });
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-dvh">
        <TopNav />
        <main className="mx-auto max-w-3xl px-6 py-20 text-center" style={{ color: "var(--ink-mute)" }}>
          Loading comparison…
        </main>
      </div>
    );
  }

  if (!cmp) {
    return (
      <div className="min-h-dvh">
        <TopNav />
        <main className="mx-auto max-w-3xl px-6 py-20 text-center">
          <h1 className="text-[1.6rem]">Comparison not found</h1>
          <p className="mt-3" style={{ color: "var(--ink-soft)" }}>
            It may have expired this session.{" "}
            <Link to="/compare" style={{ color: "var(--accent-text)" }}>
              Run a new one
            </Link>
            .
          </p>
        </main>
      </div>
    );
  }

  const { a, b, comparison } = cmp;
  const aName = brandName(a.url);
  const bName = brandName(b.url);
  const aWins = comparison.categories.filter((c) => c.winner === "a").length;
  const bWins = comparison.categories.filter((c) => c.winner === "b").length;
  const leader = aWins > bWins ? aName : bWins > aWins ? bName : null;
  const score = `${Math.max(aWins, bWins)}–${Math.min(aWins, bWins)}`;

  const scanA: Scan = { id: `${cmp.id}_a`, url: a.url, title: a.title, created_at: cmp.created_at, dossier: a.dossier };
  const scanB: Scan = { id: `${cmp.id}_b`, url: b.url, title: b.title, created_at: cmp.created_at, dossier: b.dossier };

  return (
    <div className="min-h-dvh">
      <TopNav
        right={
          <Link
            to="/compare"
            className="press rounded-full px-4 py-2 text-[0.9rem] font-medium"
            style={{ background: "var(--surface)", color: "var(--ink)", border: "1px solid var(--rule-strong)" }}
          >
            New comparison
          </Link>
        }
      />
      <main className="mx-auto max-w-5xl px-5 pb-24 pt-10 sm:px-8">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: EASE }}
        >
          {/* Scoreboard */}
          <div className="flex flex-wrap items-center justify-center gap-3 text-center sm:gap-5">
            <SideName title={a.title} url={a.url} side="a" />
            <span className="font-[var(--font-display)] text-[1.5rem]" style={{ color: "var(--ink-mute)" }}>
              vs
            </span>
            <SideName title={b.title} url={b.url} side="b" />
          </div>

          <p className="mt-6 text-center font-[var(--font-display)] text-[clamp(1.5rem,3.5vw,2.1rem)]" style={{ color: "var(--ink-strong)" }}>
            {leader ? (
              <>
                {leader} leads{" "}
                <span style={{ color: "var(--accent-text)" }}>{score}</span>
              </>
            ) : (
              <>Dead even — {aWins}–{bWins}</>
            )}
          </p>
          <p className="mx-auto mt-4 max-w-2xl text-center text-[1.05rem] leading-relaxed" style={{ color: "var(--ink-soft)" }}>
            {comparison.summary}
          </p>
        </motion.div>

        {/* Category breakdown */}
        <section className="mt-12">
          <h2 className="mb-4 text-[1.15rem]" style={{ color: "var(--ink-strong)" }}>
            Who wins what
          </h2>
          <ul className="space-y-3">
            {comparison.categories.map((cat) => (
              <li
                key={cat.name}
                className="rounded-2xl p-5"
                style={{ background: "var(--surface)", border: "1px solid var(--rule)" }}
              >
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <h3 className="text-[1.05rem] font-medium" style={{ color: "var(--ink-strong)" }}>
                    {cat.name}
                  </h3>
                  <WinnerPill winner={cat.winner} aTitle={aName} bTitle={bName} />
                </div>
                <p className="mt-2 leading-relaxed" style={{ color: "var(--ink-soft)" }}>
                  {cat.reason}
                </p>
              </li>
            ))}
          </ul>
        </section>

        {/* Bottom line */}
        <section
          className="mt-8 rounded-2xl p-6"
          style={{ background: "var(--accent-soft)", border: "1px solid var(--rule)" }}
        >
          <h2 className="mb-2 font-[var(--font-mono)] text-[0.75rem] tracking-[0.12em]" style={{ color: "var(--accent-text)" }}>
            THE BOTTOM LINE
          </h2>
          <p className="text-[1.15rem] leading-relaxed" style={{ color: "var(--ink-strong)", fontFamily: "var(--font-display)" }}>
            {comparison.verdict}
          </p>
        </section>

        {/* Side-by-side dossiers */}
        <section className="mt-14 border-t pt-10" style={{ borderColor: "var(--rule)" }}>
          <h2 className="mb-6 text-[1.15rem]" style={{ color: "var(--ink-strong)" }}>
            The full dossiers
          </h2>
          <div className="grid gap-10 md:grid-cols-2 md:gap-8">
            <div>
              <SideTag side="a" />
              <div className="mt-4">
                <DossierView scan={scanA} readOnly />
              </div>
            </div>
            <div className="border-t pt-10 md:border-l md:border-t-0 md:pl-8 md:pt-0" style={{ borderColor: "var(--rule)" }}>
              <SideTag side="b" />
              <div className="mt-4">
                <DossierView scan={scanB} readOnly />
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}

function SideName({ title, url, side }: { title: string; url: string; side: CompareSide }) {
  return (
    <div className="flex items-center gap-2.5">
      <span
        aria-hidden
        className="grid h-9 w-9 place-items-center rounded-full font-[var(--font-display)] text-[1rem]"
        style={
          side === "a"
            ? { background: "var(--accent)", color: "var(--on-accent)" }
            : { background: "var(--surface-2)", color: "var(--ink-strong)", border: "1px solid var(--rule-strong)" }
        }
      >
        {side === "a" ? "A" : "B"}
      </span>
      <div className="text-left">
        <p className="font-medium leading-tight" style={{ color: "var(--ink-strong)" }}>
          {title}
        </p>
        <p className="font-[var(--font-mono)] text-[0.78rem]" style={{ color: "var(--ink-mute)" }}>
          {prettyHost(url)}
        </p>
      </div>
    </div>
  );
}

function SideTag({ side }: { side: CompareSide }) {
  return (
    <span
      className="inline-grid h-8 w-8 place-items-center rounded-full font-[var(--font-display)] text-[0.95rem]"
      style={
        side === "a"
          ? { background: "var(--accent)", color: "var(--on-accent)" }
          : { background: "var(--surface-2)", color: "var(--ink-strong)", border: "1px solid var(--rule-strong)" }
      }
    >
      {side === "a" ? "A" : "B"}
    </span>
  );
}

function WinnerPill({
  winner,
  aTitle,
  bTitle,
}: {
  winner: CompareSide;
  aTitle: string;
  bTitle: string;
}) {
  if (winner === "tie") {
    return (
      <span
        className="rounded-full px-3 py-1 text-[0.8rem] font-medium"
        style={{ background: "var(--surface-2)", color: "var(--ink-soft)" }}
      >
        Tie
      </span>
    );
  }
  const isA = winner === "a";
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[0.8rem] font-medium"
      style={
        isA
          ? { background: "var(--accent)", color: "var(--on-accent)" }
          : { background: "var(--surface-2)", color: "var(--ink-strong)", border: "1px solid var(--rule-strong)" }
      }
    >
      <span aria-hidden>{isA ? "A" : "B"}</span>
      {isA ? aTitle : bTitle}
    </span>
  );
}
