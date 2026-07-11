import type { ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { useSession } from "../hooks/useSession";

/** Gate for pages that need a signed-in user; sends guests to /auth. */
export function RequireAuth({ children }: { children: ReactNode }) {
  const { session, loading } = useSession();

  if (loading) {
    return (
      <div
        className="grid min-h-dvh place-items-center"
        style={{ color: "var(--ink-mute)" }}
      >
        Loading…
      </div>
    );
  }
  if (!session) return <Navigate to="/auth" replace />;
  return <>{children}</>;
}
