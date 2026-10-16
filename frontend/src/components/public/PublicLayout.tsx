import { motion, useReducedMotion } from "motion/react";
import { Suspense, useEffect, useRef, useState } from "react";
import { Outlet, useLocation } from "react-router";
import { EASE_IN_OUT_QUART, ScrollProgressBar } from "../motion";
import { SmoothScroll } from "../motion/SmoothScroll";
import { CreoInlineLoader } from "../ui/CreoLoader";
import { CustomCursor } from "./CustomCursor";
import { Footer } from "./Footer";
import { IntroLoader, shouldPlayIntro } from "./IntroLoader";
import { Navbar } from "./Navbar";
import "../../styles/public-responsive.css";
import "../../styles/public-theme.css";

/**
 * Masked curtain that lifts off the new page after client-side navigation.
 * Skipped on the first load (the hero has its own intro) and for reduced motion.
 */
function RouteCurtain() {
  const { pathname } = useLocation();
  const reduce = useReducedMotion();
  const previous = useRef(pathname);
  const [run, setRun] = useState(0);

  useEffect(() => {
    if (previous.current === pathname) return;
    previous.current = pathname;
    setRun((n) => n + 1);
  }, [pathname]);

  if (reduce || run === 0) return null;

  return (
    <motion.div
      key={run}
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 z-[70] flex items-center justify-center bg-[#050A1A]"
      initial={{ clipPath: "inset(0% 0% 0% 0%)" }}
      animate={{ clipPath: "inset(0% 0% 100% 0%)" }}
      transition={{ duration: 0.85, delay: 0.15, ease: EASE_IN_OUT_QUART }}
    >
      <div className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-[#4F7BFF] to-transparent" />
      <motion.span
        className="flex items-baseline text-5xl font-black tracking-[-0.05em] text-[#F4F7FF]"
        initial={{ opacity: 1, y: 0 }}
        animate={{ opacity: 0, y: -24 }}
        transition={{ duration: 0.5, delay: 0.1, ease: EASE_IN_OUT_QUART }}
      >
        creo
        <span className="ml-0.5 inline-block size-[0.34em] rounded-full bg-[#4F7BFF]" />
      </motion.span>
    </motion.div>
  );
}

const LOOPING = ".creo-beam, .creo-featured-border, .creo-montage";

/**
 * Marks infinite CSS loops (edge beams, rotating borders, the photo montage)
 * with [data-inview] only while they're near the viewport, so off-screen ones
 * pause instead of repainting every frame. Picks up elements added later too.
 */
function useLoopVisibility() {
  useEffect(() => {
    const root = document.querySelector(".public-site");
    if (!root || typeof IntersectionObserver === "undefined") return;
    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) entry.target.toggleAttribute("data-inview", entry.isIntersecting);
      },
      { rootMargin: "120px 0px" },
    );
    const watched = new WeakSet<Element>();
    const scan = () => {
      for (const el of root.querySelectorAll(LOOPING)) {
        if (watched.has(el)) continue;
        watched.add(el);
        io.observe(el);
      }
    };
    scan();
    let raf = 0;
    const mo = new MutationObserver(() => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(scan);
    });
    mo.observe(root, { childList: true, subtree: true });
    return () => {
      cancelAnimationFrame(raf);
      mo.disconnect();
      io.disconnect();
    };
  }, []);
}

export function PublicLayout() {
  useLoopVisibility();
  const { pathname } = useLocation();
  const reduce = useReducedMotion();
  // "playing": only the intro is on screen; "lifting": page mounts beneath the rising curtain
  const [intro, setIntro] = useState<"off" | "playing" | "lifting">(() =>
    shouldPlayIntro(pathname) ? "playing" : "off",
  );

  return (
    <div className="public-site flex min-h-[100svh] flex-col text-[#F4F7FF]">
      <a href="#main-content" className="public-skip-link">Skip to content</a>
      <SmoothScroll />
      <CustomCursor />
      {intro !== "off" && (
        <IntroLoader
          onLift={() => setIntro((s) => (s === "playing" ? "lifting" : s))}
          onDone={() => setIntro("off")}
        />
      )}
      {intro !== "playing" && (
        <>
          <ScrollProgressBar />
          <RouteCurtain />
          <Navbar />
          <main id="main-content" className="min-w-0 flex-1">
            <Suspense fallback={<CreoInlineLoader className="min-h-[70vh]" />}>
              {/* New page settles in underneath the curtain */}
              <motion.div
                key={pathname}
                initial={reduce ? false : { opacity: 0, y: 28 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.9, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
              >
                <Outlet />
              </motion.div>
            </Suspense>
          </main>
          <Footer />
        </>
      )}
    </div>
  );
}
