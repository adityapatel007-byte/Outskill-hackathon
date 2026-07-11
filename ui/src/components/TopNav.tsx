import type { ReactNode } from "react";
import { Wordmark } from "./Wordmark";
import { ThemeToggle } from "./ThemeToggle";
import { useSession } from "../hooks/useSession";
import { supabase } from "../lib/supabase";

/** Slim, calm top bar. `right` holds page-specific actions. */
export function TopNav({ right }: { right?: ReactNode }) {
  const { session } = useSession();

  return (
    <header
      className="sticky top-0 z-30 w-full backdrop-blur-[6px]"
      style={{
        background: "color-mix(in oklab, var(--bg) 82%, transparent)",
        borderBottom: "1px solid var(--rule)",
      }}
    >
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-5 sm:px-8">
        <Wordmark />
        <div className="flex items-center gap-3">
          {right}
          {session && (
            <button
              type="button"
              onClick={() => supabase.auth.signOut()}
              className="press rounded-full px-3.5 py-2 text-[0.88rem] font-medium"
              style={{ color: "var(--ink-soft)", border: "1px solid var(--rule)" }}
              title={session.user?.email ?? "Sign out"}
            >
              Sign out
            </button>
          )}
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}
