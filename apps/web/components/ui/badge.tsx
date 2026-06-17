import { cn } from "@/lib/utils";

interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: "default" | "outline" | "secondary";
}

function Badge({ className, variant = "default", ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold transition-colors",
        variant === "default" && "bg-[var(--color-brand)] text-white",
        variant === "outline" && "border border-[var(--color-border)] text-[var(--color-text)]",
        variant === "secondary" && "bg-[var(--color-brand-light)] text-[var(--color-brand)]",
        className
      )}
      {...props}
    />
  );
}

export { Badge };
