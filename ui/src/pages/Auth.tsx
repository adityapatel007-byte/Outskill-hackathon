import { useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { motion } from "motion/react";
import { TopNav } from "../components/TopNav";
import { supabase } from "../lib/supabase";
import { USE_MOCK } from "../lib/api";

const EASE = [0.23, 1, 0.32, 1] as const;
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function Auth() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!EMAIL.test(email.trim())) {
      setError("Please enter a valid email address.");
      return;
    }
    setError(null);

    if (USE_MOCK) {
      setSent(true);
      return;
    }

    const { error: authError } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: { emailRedirectTo: `${window.location.origin}/app` },
    });
    if (authError) {
      setError(authError.message);
      return;
    }
    setSent(true);
  }

  return (
    <div className="min-h-dvh">
      <TopNav />
      <main className="mx-auto flex max-w-md flex-col justify-center px-5 py-20 sm:px-8">
        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: EASE }}
        >
          {!sent ? (
            <>
              <h1 className="text-[2.2rem]">Sign in to save your scans</h1>
              <p className="mt-3" style={{ color: "var(--ink-soft)" }}>
                We'll email you a magic link — no password to remember.
              </p>

              <form onSubmit={submit} noValidate className="mt-8">
                <label htmlFor="email" className="mb-2 block text-[0.9rem] font-medium" style={{ color: "var(--ink)" }}>
                  Email address
                </label>
                <div className="field-shell flex items-center rounded-2xl px-4">
                  <input
                    id="email"
                    type="email"
                    autoComplete="email"
                    placeholder="you@company.com"
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      if (error) setError(null);
                    }}
                    aria-invalid={!!error}
                    aria-describedby={error ? "email-error" : undefined}
                    className="w-full bg-transparent py-3.5 text-[1.05rem] outline-none placeholder:text-[var(--ink-mute)]"
                    style={{ color: "var(--ink-strong)" }}
                  />
                </div>
                {error && (
                  <p id="email-error" role="alert" className="mt-2 text-[0.9rem]" style={{ color: "var(--clay)" }}>
                    {error}
                  </p>
                )}

                <button
                  type="submit"
                  className="press mt-5 w-full rounded-2xl py-3.5 text-[1.05rem] font-medium"
                  style={{ background: "var(--accent)", color: "var(--on-accent)" }}
                >
                  Send magic link
                </button>
              </form>

              <p className="mt-6 text-center text-[0.85rem]" style={{ color: "var(--ink-mute)" }}>
                Just looking?{" "}
                <Link to="/app" style={{ color: "var(--accent-text)" }}>
                  Try it without an account
                </Link>
              </p>
            </>
          ) : (
            <div className="text-center">
              <div
                className="mx-auto grid h-16 w-16 place-items-center rounded-full"
                style={{ background: "var(--accent-soft)", color: "var(--accent-text)" }}
              >
                <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                  <path d="M4 6h16v12H4z" /><path d="m4 7 8 6 8-6" />
                </svg>
              </div>
              <h1 className="mt-6 text-[2rem]">Check your inbox</h1>
              <p className="mt-3" style={{ color: "var(--ink-soft)" }}>
                We sent a magic link to{" "}
                <span className="font-medium" style={{ color: "var(--ink-strong)" }}>
                  {email}
                </span>
                . Click it to sign in.
              </p>
              <p className="mt-8 text-[0.85rem]" style={{ color: "var(--ink-mute)" }}>
                Wrong email?{" "}
                <button
                  type="button"
                  onClick={() => setSent(false)}
                  style={{ color: "var(--accent-text)" }}
                >
                  Try again
                </button>
                {" · "}
                <Link to="/app" style={{ color: "var(--accent-text)" }}>
                  Skip for now
                </Link>
              </p>
            </div>
          )}
        </motion.div>
      </main>
    </div>
  );
}
