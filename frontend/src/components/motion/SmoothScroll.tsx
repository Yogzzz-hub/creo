import Lenis from "lenis";
import { cancelFrame, frame } from "motion/react";
import { useEffect, useRef } from "react";
import { useLocation } from "react-router";

let activeLenis: Lenis | null = null;

/** Scroll to a position or element, routed through Lenis when it is running. */
export function smoothScrollTo(target: number | HTMLElement) {
  if (activeLenis) {
    activeLenis.scrollTo(target, { duration: 1.4 });
    return;
  }
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const top = typeof target === "number" ? target : target.getBoundingClientRect().top + window.scrollY;
  window.scrollTo({ top, behavior: reduce ? "auto" : "smooth" });
}

/**
 * Inertial smooth scrolling (Lenis) for the marketing pages.
 * Skipped entirely for users who prefer reduced motion and on touch devices,
 * where native momentum scrolling already feels right.
 */
export function SmoothScroll() {
  const lenisRef = useRef<Lenis | null>(null);
  const { pathname } = useLocation();

  useEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const touch = window.matchMedia("(pointer: coarse)").matches;
    if (reduce || touch) return;

    const lenis = new Lenis({
      // Proportional easing toward the target each frame: silky, with no fixed-length glides
      lerp: 0.085,
      wheelMultiplier: 0.95,
      smoothWheel: true,
      anchors: { offset: -80 },
      autoRaf: false,
      // Let nested scroll areas (tables, dialogs, dropdowns) scroll natively
      prevent: (node: Element) =>
        node.closest("[data-lenis-prevent], [role='dialog'], .overflow-x-auto") !== null,
    });
    lenisRef.current = lenis;
    activeLenis = lenis;
    // Step Lenis inside Motion's frame loop so scroll-linked animations read the
    // same scroll position in the same frame (no one-frame lag / jitter)
    const tick = ({ timestamp }: { timestamp: number }) => lenis.raf(timestamp);
    frame.update(tick, true);
    return () => {
      cancelFrame(tick);
      lenis.destroy();
      lenisRef.current = null;
      if (activeLenis === lenis) activeLenis = null;
    };
  }, []);

  // New page → start at the top without an animated scroll back
  useEffect(() => {
    lenisRef.current?.scrollTo(0, { immediate: true, force: true });
  }, [pathname]);

  return null;
}
