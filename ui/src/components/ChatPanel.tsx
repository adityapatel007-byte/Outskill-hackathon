import { useEffect, useRef, useState, type FormEvent } from "react";
import { AnimatePresence, motion } from "motion/react";
import type { ChatMessage, Dossier } from "../types";
import { getMessages, askQuestion, clearMessages } from "../lib/api";
import { SAMPLE_QUESTIONS } from "../lib/mock";
import { CitationChip } from "./CitationChip";

const EASE = [0.23, 1, 0.32, 1] as const;

/**
 * Chat-with-the-site. Grounded answers, each ending in a source citation.
 * `onBusy` lifts the "thinking" state so the Lens can glow while it answers.
 */
export function ChatPanel({
  scanId,
  onBusy,
}: {
  scanId: string;
  dossier: Dossier;
  onBusy?: (busy: boolean) => void;
}) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [draft, setDraft] = useState("");
  const [thinking, setThinking] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    getMessages(scanId).then(setMessages);
  }, [scanId]);

  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
  }, [messages, thinking]);

  useEffect(() => onBusy?.(thinking), [thinking, onBusy]);

  async function send(question: string) {
    const q = question.trim();
    if (!q || thinking) return;
    setDraft("");
    const optimistic: ChatMessage = {
      id: `local_${Date.now()}`,
      role: "user",
      content: q,
      created_at: new Date().toISOString(),
    };
    setMessages((m) => [...m, optimistic]);
    setThinking(true);
    try {
      const { assistant } = await askQuestion(scanId, q);
      setMessages((m) => [...m, assistant]);
    } finally {
      setThinking(false);
      inputRef.current?.focus();
    }
  }

  async function clear() {
    await clearMessages(scanId);
    setMessages([]);
    inputRef.current?.focus();
  }

  const empty = messages.length === 0 && !thinking;

  return (
    <div
      className="flex h-full min-h-0 flex-col overflow-hidden rounded-3xl"
      style={{ background: "var(--surface)", border: "1px solid var(--rule)" }}
    >
      {/* Header */}
      <div
        className="flex items-center justify-between px-5 py-4"
        style={{ borderBottom: "1px solid var(--rule)" }}
      >
        <div className="flex items-center gap-2">
          <span
            aria-hidden
            className="grid h-7 w-7 place-items-center rounded-full"
            style={{ background: "var(--accent-soft)", color: "var(--accent-text)" }}
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
            </svg>
          </span>
          <h2 className="text-[1.1rem]" style={{ color: "var(--ink-strong)" }}>
            Ask this site
          </h2>
        </div>
        {messages.length > 0 && (
          <button
            type="button"
            onClick={clear}
            className="press rounded-full px-3 py-1 text-[0.8rem]"
            style={{ color: "var(--ink-mute)" }}
          >
            Clear
          </button>
        )}
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="min-h-0 flex-1 space-y-4 overflow-y-auto px-5 py-5">
        {empty && (
          <div className="flex h-full flex-col justify-center gap-4 py-6 text-center">
            <p style={{ color: "var(--ink-soft)" }}>
              Ask anything about this site. Every answer cites the page it came
              from.
            </p>
            <div className="flex flex-wrap justify-center gap-2">
              {SAMPLE_QUESTIONS.map((q) => (
                <button
                  key={q}
                  type="button"
                  onClick={() => send(q)}
                  className="press rounded-full px-3.5 py-2 text-[0.85rem]"
                  style={{
                    background: "var(--surface-2)",
                    color: "var(--ink)",
                    border: "1px solid var(--rule)",
                  }}
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
        )}

        <AnimatePresence initial={false}>
          {messages.map((m) => (
            <motion.div
              key={m.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.28, ease: EASE }}
              className={m.role === "user" ? "flex justify-end" : "flex justify-start"}
            >
              <div
                className="max-w-[85%] rounded-2xl px-4 py-3 leading-relaxed"
                style={
                  m.role === "user"
                    ? { background: "var(--accent-soft)", color: "var(--ink-strong)" }
                    : { background: "var(--surface-2)", color: "var(--ink)" }
                }
              >
                {m.content}
                {m.role === "assistant" && m.citation && (
                  <div>
                    <CitationChip citation={m.citation} />
                  </div>
                )}
              </div>
            </motion.div>
          ))}
        </AnimatePresence>

        {thinking && <ThinkingDots />}
      </div>

      {/* Composer */}
      <form
        onSubmit={(e: FormEvent) => {
          e.preventDefault();
          send(draft);
        }}
        className="p-3"
        style={{ borderTop: "1px solid var(--rule)" }}
      >
        <div className="field-shell flex items-center gap-2 rounded-full py-1.5 pl-4 pr-1.5">
          <label htmlFor="chat-input" className="sr-only">
            Ask a question about this site
          </label>
          <input
            id="chat-input"
            ref={inputRef}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="Ask about pricing, audience, anything…"
            className="min-w-0 flex-1 bg-transparent py-1.5 outline-none placeholder:text-[var(--ink-mute)]"
            style={{ color: "var(--ink-strong)" }}
            autoComplete="off"
          />
          <button
            type="submit"
            disabled={!draft.trim() || thinking}
            aria-label="Send question"
            className="press grid h-9 w-9 shrink-0 place-items-center rounded-full disabled:opacity-45"
            style={{ background: "var(--accent)", color: "var(--on-accent)" }}
          >
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <path d="M5 12h14M13 6l6 6-6 6" />
            </svg>
          </button>
        </div>
      </form>
    </div>
  );
}

function ThinkingDots() {
  return (
    <div className="flex justify-start" role="status" aria-label="Reading the site">
      <div
        className="flex items-center gap-1.5 rounded-2xl px-4 py-4"
        style={{ background: "var(--surface-2)" }}
      >
        {[0, 1, 2].map((i) => (
          <motion.span
            key={i}
            className="h-2 w-2 rounded-full"
            style={{ background: "var(--ink-mute)" }}
            animate={{ opacity: [0.3, 1, 0.3] }}
            transition={{ duration: 1, repeat: Infinity, delay: i * 0.18, ease: "easeInOut" }}
          />
        ))}
      </div>
    </div>
  );
}
