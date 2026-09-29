import { clsx } from "clsx";
import type { HTMLAttributes, TdHTMLAttributes, ThHTMLAttributes } from "react";

export function Table({ className, ...props }: HTMLAttributes<HTMLTableElement>) {
  return (
    <div className="relative w-full overflow-auto">
      <table
        className={clsx(
          "w-full caption-bottom text-sm text-[var(--surface-text)] border-collapse",
          className,
        )}
        {...props}
      />
    </div>
  );
}

export function TableHeader({ className, ...props }: HTMLAttributes<HTMLTableSectionElement>) {
  return (
    <thead
      className={clsx(
        "border-b border-[var(--surface-border)] bg-[var(--surface-bg)] text-xs uppercase tracking-wider text-[var(--surface-muted)]",
        className,
      )}
      {...props}
    />
  );
}

export function TableBody({ className, ...props }: HTMLAttributes<HTMLTableSectionElement>) {
  return (
    <tbody
      className={clsx(
        "divide-y divide-[var(--surface-border)] bg-[var(--surface-card)]",
        className,
      )}
      {...props}
    />
  );
}

export function TableRow({ className, ...props }: HTMLAttributes<HTMLTableRowElement>) {
  return (
    <tr
      className={clsx(
        "transition-colors hover:bg-[var(--surface-hover)] data-[state=selected]:bg-[var(--surface-active)]",
        className,
      )}
      {...props}
    />
  );
}

export function TableHead({ className, ...props }: ThHTMLAttributes<HTMLTableCellElement>) {
  return (
    <th
      className={clsx(
        "h-10 px-4 text-left align-middle font-medium text-[var(--surface-muted)]",
        className,
      )}
      {...props}
    />
  );
}

export function TableCell({ className, ...props }: TdHTMLAttributes<HTMLTableCellElement>) {
  return (
    <td className={clsx("p-4 align-middle text-[var(--surface-text)]", className)} {...props} />
  );
}
