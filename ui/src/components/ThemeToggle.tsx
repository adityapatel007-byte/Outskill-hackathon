import { useTheme } from "../hooks/useTheme";

/**
 * Hand-drawn day / desk-lamp toggle (never a Lucide icon).
 * Light = a small sun over the desk; dark = the lamp switched on.
 * The glyph cross-fades so the switch feels like turning the lamp on.
 */
export function ThemeToggle() {
  const { theme, toggle } = useTheme();
  const dark = theme === "dark";

  return (
    <button
      type="button"
      onClick={toggle}
      className="press relative grid h-10 w-10 place-items-center rounded-full"
      style={{
        color: "var(--ink-soft)",
        border: "1px solid var(--rule)",
        background: "var(--surface)",
      }}
      aria-label={dark ? "Switch to light theme" : "Switch to dark theme"}
      aria-pressed={dark}
      title={dark ? "Lights up" : "Lamp on"}
    >
      <svg
        width="20"
        height="20"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        {dark ? (
          // Desk lamp, glowing
          <g style={{ color: "var(--accent-text)" }}>
            <path d="M8 21h8" />
            <path d="M12 21v-5" />
            <path d="M7 16h10l-1.6-4.2H8.6L7 16z" />
            <path d="M9 11.8 12 5l4.5 1.6" />
            <circle cx="12" cy="16" r="0.4" fill="currentColor" />
          </g>
        ) : (
          // Sun
          <g>
            <circle cx="12" cy="12" r="4.2" />
            <path d="M12 3.2v1.6M12 19.2v1.6M4.9 4.9l1.1 1.1M18 18l1.1 1.1M3.2 12h1.6M19.2 12h1.6M4.9 19.1 6 18M18 6l1.1-1.1" />
          </g>
        )}
      </svg>
    </button>
  );
}
