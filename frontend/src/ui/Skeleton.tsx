import { clsx } from "clsx";
import type { HTMLAttributes } from "react";

export interface SkeletonProps extends HTMLAttributes<HTMLDivElement> {
  aspectRatio?: "9/16" | "16/9" | "1/1" | "auto";
}

export function Skeleton({ className, aspectRatio = "auto", ...props }: SkeletonProps) {
  const aspectStyles = {
    "9/16": "aspect-[9/16]",
    "16/9": "aspect-[16/9]",
    "1/1": "aspect-square",
    auto: "",
  };

  return (
    <div
      aria-hidden="true"
      className={clsx(
        "animate-pulse rounded-md bg-[var(--surface-hover)] border border-[var(--surface-border)]",
        aspectStyles[aspectRatio],
        className,
      )}
      {...props}
    />
  );
}
