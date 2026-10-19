import { animate, motion, useMotionValue } from "motion/react";
import { useEffect, useRef, useState } from "react";
import { EASE_IN_OUT_QUART, EASE_OUT_EXPO } from "../motion";

const INTRO_KEY = "creo-intro-played";

/** The intro plays once per browser session, only when landing on the homepage. */
export function shouldPlayIntro(pathname: string): boolean {
  if (typeof window === "undefined" || pathname !== "/") return false;
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return false;
  try {
    return !window.sessionStorage.getItem(INTRO_KEY);
  } catch {
    return false;
  }
}

/**
 * Brand intro: the wordmark rises out of a mask while a counter runs to 100,
 * then the whole panel lifts away like a curtain. `onLift` fires as the
 * curtain starts moving (mount the page then, so its intro plays underneath),
 * `onDone` once it has cleared the screen.
 */
export function IntroLoader({ onLift, onDone }: { onLift: () => void; onDone: () => void }) {
  const counterRef = useRef<HTMLSpanElement>(null);
  const progress = useMotionValue(0);
  const [lifting, setLifting] = useState(false);
  const lifted = useRef(false);
  const callbacks = useRef({ onLift, onDone });
  callbacks.current = { onLift, onDone };

  useEffect(() => {
    try {
      window.sessionStorage.setItem(INTRO_KEY, "1");
    } catch {
      // Private mode: the intro may simply play again next time
    }
    let doneTimer = 0;
    const lift = () => {
      if (lifted.current) return;
      lifted.current = true;
      setLifting(true);
      callbacks.current.onLift();
      doneTimer = window.setTimeout(() => callbacks.current.onDone(), 1150);
    };
    const controls = animate(0, 100, {
      duration: 1.6,
      delay: 0.2,
      ease: [0.65, 0, 0.35, 1],
      onUpdate: (v) => {
        progress.set(v / 100);
        if (counterRef.current) counterRef.current.textContent = String(Math.round(v)).padStart(3, "0");
      },
      onComplete: lift,
    });
    // Never keep a visitor behind the intro if animation frames stall
    const failsafe = window.setTimeout(lift, 4000);
    return () => {
      controls.stop();
      window.clearTimeout(failsafe);
      window.clearTimeout(doneTimer);
    };
  }, [progress]);

  return (
    <motion.div
      aria-hidden="true"
      className="fixed inset-0 z-[80] overflow-hidden bg-site-bg text-site-ink"
      initial={{ clipPath: "inset(0% 0% 0% 0%)" }}
      animate={{ clipPath: lifting ? "inset(0% 0% 100% 0%)" : "inset(0% 0% 0% 0%)" }}
      transition={{ duration: 1.05, ease: EASE_IN_OUT_QUART }}
    >
      <div className="creo-grid-bg absolute inset-0 opacity-50 [mask-image:radial-gradient(60%_60%_at_50%_50%,#000,transparent)]" />
      <div className="absolute left-1/2 top-1/2 size-[520px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-site-blue-deep/20 blur-[120px]" />

      <motion.div
        className="absolute inset-0 flex items-center justify-center"
        animate={lifting ? { y: "-18%", opacity: 0 } : { y: "0%", opacity: 1 }}
        transition={{ duration: 0.8, ease: EASE_IN_OUT_QUART }}
      >
        <div className="flex items-baseline text-[26vw] font-black leading-none tracking-[-0.06em] sm:text-[16vw] lg:text-[13rem]">
          {Array.from("creo").map((ch, i) => (
            <span key={ch} className="inline-block overflow-hidden pb-[0.08em]">
              <motion.span
                className="inline-block"
                initial={{ y: "115%" }}
                animate={{ y: "0%" }}
                transition={{ duration: 1.1, delay: 0.15 + i * 0.07, ease: EASE_OUT_EXPO }}
              >
                {ch}
              </motion.span>
            </span>
          ))}
          <motion.span
            className="ml-[0.03em] inline-block size-[0.2em] rounded-full bg-gradient-to-br from-site-blue-light to-site-blue-deep shadow-[0_0_40px_8px_rgba(79,123,255,0.55)]"
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", stiffness: 260, damping: 13, delay: 0.65 }}
          />
        </div>
      </motion.div>

      <motion.div
        className="absolute inset-x-0 bottom-0 px-6 pb-8 sm:px-10 sm:pb-10"
        initial={{ opacity: 0 }}
        animate={{ opacity: lifting ? 0 : 1 }}
        transition={{ duration: 0.5, delay: lifting ? 0 : 0.3 }}
      >
        <div className="flex items-end justify-between gap-6">
          <span className="text-[11px] font-bold uppercase tracking-[0.28em] text-site-mist">
            Creative pods for D2C brands
          </span>
          <span ref={counterRef} className="shrink-0 whitespace-nowrap font-mono text-4xl font-light tabular-nums text-site-ice sm:text-6xl">
            000
          </span>
        </div>
        <div className="mt-5 h-px w-full bg-hi/10">
          <motion.div
            className="h-full origin-left bg-gradient-to-r from-site-blue-deep via-site-ice to-site-sky"
            style={{ scaleX: progress }}
          />
        </div>
      </motion.div>
    </motion.div>
  );
}
