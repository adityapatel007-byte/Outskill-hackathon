import { Link } from "react-router-dom";
import { TopNav } from "../components/TopNav";

export function NotFound() {
  return (
    <>
      <TopNav />
      <main className="mx-auto flex max-w-2xl flex-col items-center gap-5 px-6 py-32 text-center">
        <p
          className="font-[var(--font-mono)] text-[0.85rem] tracking-[0.15em]"
          style={{ color: "var(--accent-text)" }}
        >
          404
        </p>
        <h1 className="text-[2.5rem]">This page went off the map.</h1>
        <p style={{ color: "var(--ink-soft)" }}>
          The link may be old, or the dossier was never public.
        </p>
        <Link
          to="/"
          className="press mt-2 rounded-full px-5 py-2.5 font-medium"
          style={{ background: "var(--accent)", color: "var(--on-accent)" }}
        >
          Back home
        </Link>
      </main>
    </>
  );
}
