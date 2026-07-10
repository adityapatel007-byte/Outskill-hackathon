import { lazy, Suspense } from "react";

/**
 * Lazy wrapper for the R3F scene so three.js loads as its own chunk and never
 * blocks first paint. The lens is decorative, so a null fallback is correct —
 * the page is fully usable before it arrives.
 */
const LensScene = lazy(() =>
  import("./LensScene").then((m) => ({ default: m.LensScene }))
);

export function Lens(props: { active?: boolean; className?: string }) {
  return (
    <Suspense fallback={null}>
      <LensScene {...props} />
    </Suspense>
  );
}
