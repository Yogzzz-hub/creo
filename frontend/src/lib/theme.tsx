import { useSyncExternalStore } from "react";
import { flushSync } from "react-dom";

export type Theme = "dark" | "light";

const STORAGE_KEY = "creo-theme";
const THEME_COLORS: Record<Theme, string> = { dark: "#050810", light: "#f4f7fc" };
const REVEAL_MS = 680;
const FADE_MS = 420;

const listeners = new Set<() => void>();

function readStored(): Theme | null {
  try {
    const value = localStorage.getItem(STORAGE_KEY);
    return value === "light" || value === "dark" ? value : null;
  } catch {
    return null;
  }
}

/** The theme currently painted on <html>; index.html sets it before first paint. */
export function getTheme(): Theme {
  if (typeof document === "undefined") return "dark";
  return document.documentElement.dataset.theme === "light" ? "light" : "dark";
}

function paint(theme: Theme) {
  const root = document.documentElement;
  root.dataset.theme = theme;
  root.classList.toggle("dark", theme === "dark");
  root.style.colorScheme = theme;
  document.querySelector('meta[name="color-scheme"]')?.setAttribute("content", theme);
  document.querySelector('meta[name="theme-color"]')?.setAttribute("content", THEME_COLORS[theme]);
  for (const listener of listeners) listener();
}

function prefersReducedMotion() {
  return window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;
}

let fadeTimer: number | undefined;

/** Color cross-fade for browsers without View Transitions. */
function crossFade(apply: () => void) {
  const root = document.documentElement;
  window.clearTimeout(fadeTimer);
  root.classList.add("theme-animating");
  apply();
  fadeTimer = window.setTimeout(() => root.classList.remove("theme-animating"), FADE_MS + 40);
}

/**
 * Switch theme. When `origin` is given (the toggle's center), the new theme
 * grows out of that point as a circle; otherwise the colors cross-fade.
 */
export function setTheme(theme: Theme, origin?: { x: number; y: number }) {
  if (theme === getTheme()) return;
  try {
    localStorage.setItem(STORAGE_KEY, theme);
  } catch {
    // Private mode: the choice still applies for this visit.
  }

  const apply = () => paint(theme);
  if (prefersReducedMotion()) return apply();

  const doc = document as Document & {
    startViewTransition?: (cb: () => void) => { ready: Promise<void> };
  };
  if (!origin || typeof doc.startViewTransition !== "function") return crossFade(apply);

  const { x, y } = origin;
  const radius = Math.hypot(Math.max(x, window.innerWidth - x), Math.max(y, window.innerHeight - y));
  const transition = doc.startViewTransition(() => flushSync(apply));
  transition.ready
    .then(() => {
      document.documentElement.animate(
        { clipPath: [`circle(0px at ${x}px ${y}px)`, `circle(${radius}px at ${x}px ${y}px)`] },
        { duration: REVEAL_MS, easing: "cubic-bezier(0.5, 0, 0.2, 1)", pseudoElement: "::view-transition-new(root)" },
      );
    })
    .catch(() => {});
}

export function toggleTheme(origin?: { x: number; y: number }) {
  setTheme(getTheme() === "dark" ? "light" : "dark", origin);
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

// Keep every open tab on the same theme.
if (typeof window !== "undefined") {
  window.addEventListener("storage", (event) => {
    if (event.key !== STORAGE_KEY) return;
    const next = readStored();
    if (next && next !== getTheme()) crossFade(() => paint(next));
  });
}

export function useTheme() {
  const theme = useSyncExternalStore(subscribe, getTheme, () => "dark" as Theme);
  return { theme, setTheme, toggleTheme };
}
