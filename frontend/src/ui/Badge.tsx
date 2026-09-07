import { clsx } from "clsx";
import type { HTMLAttributes } from "react";

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: "waiting" | "motion" | "settled" | "blocked" | "neutral";
}

export function Badge({ className, variant = "neutral", ...props }: BadgeProps) {
  const variantStyles = {
    waiting:
      "bg-[var(--color-waiting)]/15 text-[var(--color-waiting)] border-[var(--color-waiting)]/30",
    motion:
      "bg-[var(--color-motion)]/15 text-[var(--color-motion)] border-[var(--color-motion)]/30",
    settled:
      "bg-[var(--color-settled)]/15 text-[var(--color-settled)] border-[var(--color-settled)]/30",
    blocked:
      "bg-[var(--color-blocked)]/15 text-[var(--color-blocked)] border-[var(--color-blocked)]/30",
    neutral: "bg-[var(--surface-hover)] text-[var(--surface-muted)] border-[var(--surface-border)]",
  };

  return (
    <span
      className={clsx(
        "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium font-sans select-none",
        variantStyles[variant],
        className,
      )}
      {...props}
    />
  );
}
