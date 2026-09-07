import { clsx } from "clsx";
import type { ReactNode } from "react";

export interface EmptyStateProps {
  title: string;
  description: string;
  icon?: ReactNode;
  action?: ReactNode;
  className?: string;
}

export function EmptyState({ title, description, icon, action, className }: EmptyStateProps) {
  return (
    <div
      className={clsx(
        "flex flex-col items-center justify-center p-8 text-center rounded-lg border border-dashed border-[var(--surface-border)] bg-[var(--surface-card)]/50",
        className,
      )}
    >
      {icon && (
        <div className="mb-4 text-[var(--surface-muted)]" aria-hidden="true">
          {icon}
        </div>
      )}
      <h3 className="text-base font-semibold font-[var(--font-display)] text-[var(--surface-text)]">
        {title}
      </h3>
      <p className="mt-1 max-w-sm text-sm text-[var(--surface-muted)]">{description}</p>
      {action && <div className="mt-6">{action}</div>}
    </div>
  );
}
