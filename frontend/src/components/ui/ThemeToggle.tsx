import { Moon, Sun } from "lucide-react";
import type { MouseEvent } from "react";
import { clsx as cn } from "clsx";
import { useTheme } from "../../lib/theme";

type ThemeToggleProps = {
  /** "site" matches the public navbar glass, "app" the portal/admin headers. */
  variant?: "site" | "app";
  className?: string;
};

const VARIANTS = {
  site: "size-10 bg-hi/[0.06] ring-1 ring-inset ring-hi/10 text-site-mist-2 hover:text-hi hover:bg-hi/10",
  app: "size-10 border border-app-line text-app-mist hover:text-app-accent-soft hover:bg-app-base hover:border-app-accent/40",
};

export function ThemeToggle({ variant = "app", className }: ThemeToggleProps) {
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === "dark";

  function handleClick(event: MouseEvent<HTMLButtonElement>) {
    const rect = event.currentTarget.getBoundingClientRect();
    toggleTheme({ x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 });
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      aria-label={isDark ? "Switch to light theme" : "Switch to dark theme"}
      title={isDark ? "Light mode" : "Dark mode"}
      className={cn(
        "relative inline-flex shrink-0 cursor-pointer items-center justify-center overflow-hidden rounded-full transition-[color,background-color,border-color,transform] duration-200 active:scale-95",
        VARIANTS[variant],
        className,
      )}
    >
      <Sun
        aria-hidden
        className={cn(
          "absolute size-[18px] transition-all duration-500 ease-[cubic-bezier(0.34,1.56,0.64,1)]",
          isDark ? "rotate-0 scale-100 opacity-100" : "-rotate-90 scale-50 opacity-0",
        )}
      />
      <Moon
        aria-hidden
        className={cn(
          "absolute size-[18px] transition-all duration-500 ease-[cubic-bezier(0.34,1.56,0.64,1)]",
          isDark ? "rotate-90 scale-50 opacity-0" : "rotate-0 scale-100 opacity-100",
        )}
      />
    </button>
  );
}
