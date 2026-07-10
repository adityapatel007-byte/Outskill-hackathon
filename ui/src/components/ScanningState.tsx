import { AnimatePresence, motion } from "motion/react";
import { SCAN_STAGES } from "../lib/api";
import { prettyHost } from "../lib/format";

/**
 * The "feels magical, not slow" sequence. The three stage messages swap with a
 * blur bridge so they read as one thought morphing, not three separate lines.
 */
export function ScanningState({
  stageIndex,
  url,
}: {
  stageIndex: number;
  url: string;
}) {
  const stage = SCAN_STAGES[Math.min(stageIndex, SCAN_STAGES.length - 1)];

  return (
    <div className="flex flex-col items-center gap-8 text-center">
      <div className="flex items-center gap-2" aria-hidden>
        {SCAN_STAGES.map((_, i) => (
          <span
            key={i}
            className="h-1.5 rounded-full transition-all duration-500"
            style={{
              width: i === stageIndex ? "2.5rem" : "0.75rem",
              background:
                i <= stageIndex ? "var(--accent)" : "var(--rule-strong)",
            }}
          />
        ))}
      </div>

      <div className="min-h-[3.5rem]" role="status" aria-live="polite">
        <AnimatePresence mode="wait">
          <motion.p
            key={stage.label}
            initial={{ opacity: 0, y: 8, filter: "blur(6px)" }}
            animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
            exit={{ opacity: 0, y: -8, filter: "blur(6px)" }}
            transition={{ duration: 0.32, ease: [0.23, 1, 0.32, 1] }}
            className="font-[var(--font-display)] text-[1.75rem] sm:text-[2.1rem]"
            style={{ color: "var(--ink-strong)" }}
          >
            {stage.label}
          </motion.p>
        </AnimatePresence>
      </div>

      <p className="text-[0.9rem]" style={{ color: "var(--ink-mute)" }}>
        Reading{" "}
        <span
          className="font-[var(--font-mono)]"
          style={{ color: "var(--accent-text)" }}
        >
          {prettyHost(url)}
        </span>
      </p>
    </div>
  );
}
