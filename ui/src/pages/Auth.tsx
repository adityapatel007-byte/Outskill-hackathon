import { useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "motion/react";
import { TopNav } from "../components/TopNav";
import { supabase } from "../lib/supabase";
import { USE_MOCK } from "../lib/api";

const EASE = [0.23, 1, 0.32, 1] as const;
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type Mode = "login" | "signup";

export function Auth() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<Mode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [checkEmail, setCheckEmail] = useState(false);

  const isSignup = mode === "signup";

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!EMAIL.test(email.trim())) {
      setError("Please enter a valid email address.");
      return;
    }
    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }
    setError(null);
    setLoading(true);

    if (USE_MOCK) {
      setLoading(false);
      navigate("/app");
      return;
    }

    try {
      if (isSignup) {
        const { data, error: signUpError } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: { emailRedirectTo: `${window.location.origin}/app` },
        });
        if (signUpError) {
          setError(signUpError.message);
          return;
        }
        // If email confirmation is on, there's no session yet — ask them to
        // confirm. If it's off (auto-confirm), we get a session and go straight in.
        if (data.session) navigate("/app");
        else setCheckEmail(true);
      } else {
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });
        if (signInError) {
          setError(signInError.message);
          return;
        }
        navigate("/app");
      }
    } finally {
      setLoading(false);
    }
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
          {checkEmail ? (
            <div className="text-center">
              <div
                className="mx-auto grid h-16 w-16 place-items-center rounded-full"
                style={{ background: "var(--accent-soft)", color: "var(--accent-text)" }}
              >
                <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                  <path d="M4 6h16v12H4z" /><path d="m4 7 8 6 8-6" />
                </svg>
              </div>
              <h1 className="mt-6 text-[2rem]">Confirm your email</h1>
              <p className="mt-3" style={{ color: "var(--ink-soft)" }}>
                We sent a confirmation link to{" "}
                <span className="font-medium" style={{ color: "var(--ink-strong)" }}>
                  {email}
                </span>
                . Click it, then log in.
              </p>
              <p className="mt-8 text-[0.85rem]" style={{ color: "var(--ink-mute)" }}>
                <button
                  type="button"
                  onClick={() => {
                    setCheckEmail(false);
                    setMode("login");
                  }}
                  style={{ color: "var(--accent-text)" }}
                >
                  Back to log in
                </button>
              </p>
            </div>
          ) : (
            <>
              <h1 className="text-[2.2rem]">
                {isSignup ? "Create your account" : "Welcome back"}
              </h1>
              <p className="mt-3" style={{ color: "var(--ink-soft)" }}>
                {isSignup
                  ? "Sign up to scan sites and keep your dossiers."
                  : "Log in to pick up where you left off."}
              </p>

              <form onSubmit={submit} noValidate className="mt-8 space-y-4">
                <div>
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
                      className="w-full bg-transparent py-3.5 text-[1.05rem] outline-none placeholder:text-[var(--ink-mute)]"
                      style={{ color: "var(--ink-strong)" }}
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="password" className="mb-2 block text-[0.9rem] font-medium" style={{ color: "var(--ink)" }}>
                    Password
                  </label>
                  <div className="field-shell flex items-center rounded-2xl px-4">
                    <input
                      id="password"
                      type="password"
                      autoComplete={isSignup ? "new-password" : "current-password"}
                      placeholder={isSignup ? "At least 6 characters" : "Your password"}
                      value={password}
                      onChange={(e) => {
                        setPassword(e.target.value);
                        if (error) setError(null);
                      }}
                      aria-invalid={!!error}
                      aria-describedby={error ? "auth-error" : undefined}
                      className="w-full bg-transparent py-3.5 text-[1.05rem] outline-none placeholder:text-[var(--ink-mute)]"
                      style={{ color: "var(--ink-strong)" }}
                    />
                  </div>
                </div>

                {error && (
                  <p id="auth-error" role="alert" className="text-[0.9rem]" style={{ color: "var(--clay)" }}>
                    {error}
                  </p>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="press w-full rounded-2xl py-3.5 text-[1.05rem] font-medium disabled:opacity-60"
                  style={{ background: "var(--accent)", color: "var(--on-accent)" }}
                >
                  {loading ? "One moment…" : isSignup ? "Sign up" : "Log in"}
                </button>
              </form>

              <p className="mt-6 text-center text-[0.9rem]" style={{ color: "var(--ink-soft)" }}>
                {isSignup ? "Already have an account?" : "New here?"}{" "}
                <button
                  type="button"
                  onClick={() => {
                    setMode(isSignup ? "login" : "signup");
                    setError(null);
                  }}
                  className="font-medium"
                  style={{ color: "var(--accent-text)" }}
                >
                  {isSignup ? "Log in" : "Create an account"}
                </button>
              </p>

            </>
          )}
        </motion.div>
      </main>
    </div>
  );
}
