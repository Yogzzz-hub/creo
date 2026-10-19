import { AnimatePresence, motion, useMotionValue, useSpring } from "motion/react";
import { useEffect, useState } from "react";
import { useTheme } from "../../lib/theme";

const INTERACTIVE = "a, button, [role='button'], summary, label, [data-cursor]";
const TEXT_FIELDS = "input, textarea, select, [contenteditable='true']";

type CursorMode = "default" | "link" | "label" | "text";

const RING_SIZE: Record<CursorMode, number> = { default: 34, link: 58, label: 88, text: 34 };

/**
 * Dot + trailing ring cursor for mouse users on the public site.
 * The ring swells over links and buttons, and shows a label over anything
 * marked `data-cursor="View"`. Off for touch, pens and reduced motion.
 */
export function CustomCursor() {
  const [enabled, setEnabled] = useState(false);
  const { theme } = useTheme();
  const [mode, setMode] = useState<CursorMode>("default");
  const [label, setLabel] = useState("");
  const [pressed, setPressed] = useState(false);
  const [visible, setVisible] = useState(false);
  const x = useMotionValue(-100);
  const y = useMotionValue(-100);
  const ringX = useSpring(x, { stiffness: 420, damping: 34, mass: 0.5 });
  const ringY = useSpring(y, { stiffness: 420, damping: 34, mass: 0.5 });

  useEffect(() => {
    const fine = window.matchMedia("(hover: hover) and (pointer: fine)");
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setEnabled(fine.matches && !reduce.matches);
    update();
    fine.addEventListener("change", update);
    reduce.addEventListener("change", update);
    return () => {
      fine.removeEventListener("change", update);
      reduce.removeEventListener("change", update);
    };
  }, []);

  useEffect(() => {
    if (!enabled) return;
    const root = document.documentElement;
    root.classList.add("creo-cursor-on");

    const move = (e: PointerEvent) => {
      if (e.pointerType !== "mouse") return;
      x.set(e.clientX);
      y.set(e.clientY);
      setVisible(true);
    };
    const evaluate = (target: Element | null) => {
      if (!target) return;
      if (target.closest(TEXT_FIELDS)) {
        setMode("text");
        return;
      }
      const hit = target.closest(INTERACTIVE);
      const text = hit?.getAttribute("data-cursor");
      if (text) {
        setLabel(text);
        setMode("label");
      } else {
        setMode(hit ? "link" : "default");
      }
    };
    const over = (e: PointerEvent) => evaluate(e.target instanceof Element ? e.target : null);
    // Scrolling moves content under a still mouse without firing pointerover
    let scrollRaf = 0;
    const onScroll = () => {
      cancelAnimationFrame(scrollRaf);
      scrollRaf = requestAnimationFrame(() => evaluate(document.elementFromPoint(x.get(), y.get())));
    };
    const hide = () => setVisible(false);
    const down = () => setPressed(true);
    const up = () => setPressed(false);

    window.addEventListener("pointermove", move, { passive: true });
    document.addEventListener("pointerover", over, { passive: true });
    window.addEventListener("scroll", onScroll, { passive: true });
    root.addEventListener("mouseleave", hide);
    window.addEventListener("blur", hide);
    window.addEventListener("pointerdown", down);
    window.addEventListener("pointerup", up);
    return () => {
      root.classList.remove("creo-cursor-on");
      window.removeEventListener("pointermove", move);
      document.removeEventListener("pointerover", over);
      window.removeEventListener("scroll", onScroll);
      cancelAnimationFrame(scrollRaf);
      root.removeEventListener("mouseleave", hide);
      window.removeEventListener("blur", hide);
      window.removeEventListener("pointerdown", down);
      window.removeEventListener("pointerup", up);
    };
  }, [enabled, x, y]);

  if (!enabled) return null;

  const showRing = visible && mode !== "text";
  const size = RING_SIZE[mode];
  const isLabel = mode === "label";
  const ink = theme === "light" ? "57,73,49" : "255,255,255";

  return (
    <>
      <motion.div
        aria-hidden="true"
        className="pointer-events-none fixed left-0 top-0 z-[90]"
        style={{ x: ringX, y: ringY }}
      >
        <motion.div
          className="flex -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border shadow-[0_0_0_1px_rgb(var(--shadow-rgb)/calc(0.28*var(--shadow-k))),inset_0_0_0_1px_rgb(var(--shadow-rgb)/calc(0.18*var(--shadow-k)))]"
          animate={{
            width: size,
            height: size,
            opacity: showRing ? 1 : 0,
            scale: pressed ? 0.82 : 1,
            // Translucent so effects under the cursor (image ripple, carousel) stay visible
            backgroundColor: isLabel
              ? "rgba(59,107,255,0.22)"
              : mode === "link"
                ? `rgba(${ink},0.12)`
                : `rgba(${ink},0)`,
            borderColor: isLabel ? (theme === "light" ? "rgba(110,122,91,0.85)" : "rgba(220,232,255,0.85)") : `rgba(${ink},0.7)`,
          }}
          transition={{ type: "spring", stiffness: 320, damping: 26, mass: 0.6 }}
        >
          <AnimatePresence>
            {isLabel && (
              <motion.span
                key={label}
                initial={{ opacity: 0, scale: 0.6 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.6 }}
                transition={{ duration: 0.25 }}
                className="text-[11px] font-bold uppercase tracking-[0.16em] text-hi [text-shadow:0_1px_8px_rgba(5,10,26,0.9)]"
              >
                {label}
              </motion.span>
            )}
          </AnimatePresence>
        </motion.div>
      </motion.div>

      <motion.div
        aria-hidden="true"
        className="pointer-events-none fixed left-0 top-0 z-[91]"
        style={{ x, y }}
      >
        <motion.div
          className="size-1.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-hi shadow-[0_0_0_1.5px_rgb(var(--shadow-rgb)/calc(0.45*var(--shadow-k)))]"
          animate={{ opacity: visible && mode === "default" ? 1 : 0, scale: pressed ? 0.6 : 1 }}
          transition={{ duration: 0.15 }}
        />
      </motion.div>
    </>
  );
}
