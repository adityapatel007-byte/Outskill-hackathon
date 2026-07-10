import type { ReactNode } from "react";
import { Wordmark } from "./Wordmark";
import { ThemeToggle } from "./ThemeToggle";

/** Slim, calm top bar. `right` holds page-specific actions. */
export function TopNav({ right }: { right?: ReactNode }) {
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
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}
