import * as RadixAvatar from "@radix-ui/react-avatar";
import { clsx } from "clsx";

export interface AvatarProps extends RadixAvatar.AvatarProps {
  src?: string;
  alt: string;
  fallbackText?: string;
  size?: "sm" | "md" | "lg";
}

export function Avatar({ src, alt, fallbackText, size = "md", className, ...props }: AvatarProps) {
  const sizeStyles = {
    sm: "h-8 w-8 text-xs",
    md: "h-10 w-10 text-sm",
    lg: "h-12 w-12 text-base",
  };

  const initial = fallbackText || (alt ? alt.charAt(0).toUpperCase() : "?");

  return (
    <RadixAvatar.Root
      className={clsx(
        "relative flex shrink-0 overflow-hidden rounded-full border border-[var(--surface-border)] bg-[var(--surface-card)]",
        sizeStyles[size],
        className,
      )}
      {...props}
    >
      <RadixAvatar.Image src={src} alt={alt} className="aspect-square h-full w-full object-cover" />
      <RadixAvatar.Fallback
        className="flex h-full w-full items-center justify-center font-medium text-[var(--surface-muted)] uppercase bg-[var(--surface-hover)]"
        delayMs={600}
      >
        {initial}
      </RadixAvatar.Fallback>
    </RadixAvatar.Root>
  );
}
