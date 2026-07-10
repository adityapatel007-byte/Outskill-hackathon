import type { ButtonHTMLAttributes, CSSProperties, ReactNode } from "react";

type Variant = "primary" | "ghost" | "quiet";

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  children: ReactNode;
}

/** House button. Honey fill for primary; press feedback baked in. */
export function Button({
  variant = "primary",
  children,
  className = "",
  style,
  ...rest
}: Props) {
  const base =
    "press inline-flex items-center justify-center gap-2 rounded-full text-[0.95rem] font-medium disabled:cursor-not-allowed disabled:opacity-55";
  const pad = "px-5 py-2.5";

  const variants: Record<Variant, CSSProperties> = {
    primary: {
      background: "var(--accent)",
      color: "var(--on-accent)",
      border: "1px solid transparent",
    },
    ghost: {
      background: "var(--surface)",
      color: "var(--ink)",
      border: "1px solid var(--rule-strong)",
    },
    quiet: {
      background: "transparent",
      color: "var(--ink-soft)",
      border: "1px solid transparent",
    },
  };

  return (
    <button
      className={`${base} ${pad} ${className}`}
      style={{ ...variants[variant], ...style }}
      {...rest}
    >
      {children}
    </button>
  );
}
