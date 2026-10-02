/**
 * Creo motion kit — small, reusable interaction primitives for the marketing pages.
 *
 * Everything animates transform/opacity only, respects prefers-reduced-motion,
 * and turns pointer-driven effects off on touch devices.
 */
import {
  type MotionValue,
  animate,
  motion,
  useInView,
  useMotionTemplate,
  useMotionValue,
  useReducedMotion,
  useScroll,
  useSpring,
  useTransform,
} from "motion/react";
import {
  type ElementType,
  type PointerEvent,
  type ReactNode,
  useEffect,
  useRef,
  useState,
} from "react";

export const EASE_OUT_EXPO = [0.16, 1, 0.3, 1] as const;

/** True on devices with a precise pointer that can hover (mouse / trackpad). */
export function useFinePointer(): boolean {
  const [fine, setFine] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(hover: hover) and (pointer: fine)");
    const update = () => setFine(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);
  return fine;
}

// ── Reveal on scroll ────────────────────────────────────────────────────────

type RevealDirection = "up" | "down" | "left" | "right" | "none";

const OFFSETS: Record<RevealDirection, { x: number; y: number }> = {
  up: { x: 0, y: 28 },
  down: { x: 0, y: -28 },
  left: { x: 36, y: 0 },
  right: { x: -36, y: 0 },
  none: { x: 0, y: 0 },
};

interface RevealProps {
  children: ReactNode;
  className?: string;
  delay?: number;
  direction?: RevealDirection;
  /** Adds a slight blur-to-sharp focus pull */
  blur?: boolean;
  as?: "div" | "section" | "li" | "span";
}

export function Reveal({
  children,
  className,
  delay = 0,
  direction = "up",
  blur = false,
  as = "div",
}: RevealProps) {
  const reduce = useReducedMotion();
  const MotionTag = motion[as];
  const { x, y } = OFFSETS[direction];
  return (
    <MotionTag
      className={className}
      initial={reduce ? false : { opacity: 0, x, y, filter: blur ? "blur(8px)" : "blur(0px)" }}
      whileInView={{ opacity: 1, x: 0, y: 0, filter: "blur(0px)" }}
      viewport={{ once: true, margin: "0px 0px -12% 0px" }}
      transition={{ duration: 0.85, delay, ease: EASE_OUT_EXPO }}
    >
      {children}
    </MotionTag>
  );
}

/** Container that staggers its <StaggerItem> children as they scroll into view. */
export function Stagger({
  children,
  className,
  gap = 0.08,
  delay = 0,
}: {
  children: ReactNode;
  className?: string;
  gap?: number;
  delay?: number;
}) {
  const reduce = useReducedMotion();
  return (
    <motion.div
      className={className}
      initial={reduce ? false : "hidden"}
      whileInView="show"
      viewport={{ once: true, margin: "0px 0px -10% 0px" }}
      variants={{
        hidden: {},
        show: { transition: { staggerChildren: gap, delayChildren: delay } },
      }}
    >
      {children}
    </motion.div>
  );
}

export function StaggerItem({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <motion.div
      className={className}
      variants={{
        hidden: { opacity: 0, y: 24 },
        show: { opacity: 1, y: 0, transition: { duration: 0.75, ease: EASE_OUT_EXPO } },
      }}
    >
      {children}
    </motion.div>
  );
}

/**
 * Headline reveal: each word rises out of a clipped line, editorial style.
 * Pass plain text; use `accent` to colour specific words.
 */
export function SplitText({
  text,
  className,
  wordClassName,
  delay = 0,
  as: Tag = "span",
  accent,
  accentClassName = "text-nebula-glow",
  animateOnMount = false,
}: {
  text: string;
  className?: string;
  wordClassName?: string;
  delay?: number;
  as?: ElementType;
  accent?: string[];
  accentClassName?: string;
  /** Hero headlines play immediately instead of waiting for scroll */
  animateOnMount?: boolean;
}) {
  const reduce = useReducedMotion();
  const words = text.split(" ");
  const trigger = animateOnMount
    ? { animate: "show" as const }
    : { whileInView: "show" as const, viewport: { once: true, margin: "0px 0px -10% 0px" } };
  return (
    <Tag className={className} aria-label={text}>
      <motion.span
        aria-hidden="true"
        className="inline"
        initial={reduce ? false : "hidden"}
        {...trigger}
        variants={{
          hidden: {},
          show: { transition: { staggerChildren: 0.055, delayChildren: delay } },
        }}
      >
        {words.map((word, i) => (
          <span
            // biome-ignore lint/suspicious/noArrayIndexKey: words can repeat; order is stable
            key={`${word}-${i}`}
            className="inline-block overflow-hidden pb-[0.12em] -mb-[0.12em] align-bottom"
          >
            <motion.span
              className={`inline-block will-change-transform ${wordClassName ?? ""} ${
                accent?.includes(word.replace(/[.,!?]/g, "")) ? accentClassName : ""
              }`}
              variants={{
                hidden: { y: "110%", rotate: 4 },
                show: { y: "0%", rotate: 0, transition: { duration: 0.9, ease: EASE_OUT_EXPO } },
              }}
            >
              {word}
            </motion.span>
            {i < words.length - 1 && " "}
          </span>
        ))}
      </motion.span>
    </Tag>
  );
}

// ── 3D tilt card with cursor spotlight ──────────────────────────────────────

interface TiltCardProps {
  children: ReactNode;
  className?: string;
  /** Max rotation in degrees */
  max?: number;
  /** Spotlight colour (rgba) */
  glow?: string;
  /** Lift the card toward the viewer while hovered */
  lift?: number;
}

export function TiltCard({
  children,
  className = "",
  max = 7,
  glow = "transparent",
  lift = 24,
}: TiltCardProps) {
  const reduce = useReducedMotion();
  const fine = useFinePointer();
  const enabled = fine && !reduce;

  const px = useMotionValue(0.5);
  const py = useMotionValue(0.5);
  const hover = useMotionValue(0);
  const spring = { stiffness: 220, damping: 22, mass: 0.6 };
  const rotateX = useSpring(useTransform(py, [0, 1], [max, -max]), spring);
  const rotateY = useSpring(useTransform(px, [0, 1], [-max, max]), spring);
  const z = useSpring(useTransform(hover, [0, 1], [0, lift]), spring);
  const gx = useTransform(px, (v) => `${v * 100}%`);
  const gy = useTransform(py, (v) => `${v * 100}%`);
  const hasGlow = Boolean(glow && glow !== "transparent" && glow !== "none");
  const spotlight = useMotionTemplate`radial-gradient(420px circle at ${gx} ${gy}, ${glow || "transparent"}, transparent 60%)`;

  const onMove = (e: PointerEvent<HTMLDivElement>) => {
    if (!enabled) return;
    const rect = e.currentTarget.getBoundingClientRect();
    px.set((e.clientX - rect.left) / rect.width);
    py.set((e.clientY - rect.top) / rect.height);
  };
  const onLeave = () => {
    px.set(0.5);
    py.set(0.5);
    hover.set(0);
  };

  return (
    <div className="[perspective:1100px]">
      <motion.div
        className={`group/tilt relative [transform-style:preserve-3d] ${className}`}
        style={enabled ? { rotateX, rotateY, z } : undefined}
        onPointerMove={onMove}
        onPointerEnter={() => enabled && hover.set(1)}
        onPointerLeave={onLeave}
      >
        {enabled && hasGlow && (
          <motion.div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 z-[1] rounded-[inherit] opacity-0 transition-opacity duration-300 group-hover/tilt:opacity-100"
            style={{ background: spotlight }}
          />
        )}
        {children}
      </motion.div>
    </div>
  );
}

// ── Magnetic hover for primary CTAs ─────────────────────────────────────────

export function Magnetic({
  children,
  strength = 0.28,
  className = "",
}: {
  children: ReactNode;
  strength?: number;
  className?: string;
}) {
  const reduce = useReducedMotion();
  const fine = useFinePointer();
  const x = useSpring(0, { stiffness: 260, damping: 18, mass: 0.4 });
  const y = useSpring(0, { stiffness: 260, damping: 18, mass: 0.4 });
  const enabled = fine && !reduce;
  return (
    <motion.div
      className={`inline-flex ${className}`}
      style={enabled ? { x, y } : undefined}
      onPointerMove={(e) => {
        if (!enabled) return;
        const r = e.currentTarget.getBoundingClientRect();
        x.set((e.clientX - (r.left + r.width / 2)) * strength);
        y.set((e.clientY - (r.top + r.height / 2)) * strength);
      }}
      onPointerLeave={() => {
        x.set(0);
        y.set(0);
      }}
    >
      {children}
    </motion.div>
  );
}

// ── Count-up numbers ────────────────────────────────────────────────────────

/**
 * Animates the numeric part of a value like "₹25,000", "99.4%" or "48h" when it
 * scrolls into view. Non-numeric values render unchanged.
 */
export function CountUp({
  value,
  className,
  duration = 1.6,
}: { value: string; className?: string; duration?: number }) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, margin: "0px 0px -10% 0px" });
  const reduce = useReducedMotion();
  const match = value.match(/^(\D*)([\d,]+(?:\.\d+)?)(.*)$/);
  const [display, setDisplay] = useState(match && !reduce ? `${match[1]}0${match[3]}` : value);

  useEffect(() => {
    if (!match || reduce || !inView) {
      if (!match || reduce) setDisplay(value);
      return;
    }
    const [, prefix, numStr = "0", suffix] = match;
    const target = Number(numStr.replace(/,/g, ""));
    const decimals = numStr.includes(".") ? (numStr.split(".")[1]?.length ?? 0) : 0;
    const useGrouping = numStr.includes(",");
    const controls = animate(0, target, {
      duration,
      ease: EASE_OUT_EXPO,
      onUpdate: (v) => {
        const formatted = v.toLocaleString("en-IN", {
          minimumFractionDigits: decimals,
          maximumFractionDigits: decimals,
          useGrouping,
        });
        setDisplay(`${prefix}${formatted}${suffix}`);
      },
    });
    return () => controls.stop();
  }, [inView, reduce, value, duration]);

  return (
    <span ref={ref} className={`tabular-nums ${className ?? ""}`}>
      {display}
    </span>
  );
}

// ── Scroll-linked helpers ───────────────────────────────────────────────────

/** Thin reading-progress bar pinned under the navbar. */
export function ScrollProgressBar() {
  const { scrollYProgress } = useScroll();
  const scaleX = useSpring(scrollYProgress, { stiffness: 140, damping: 30, restDelta: 0.001 });
  return (
    <motion.div
      aria-hidden="true"
      className="pointer-events-none fixed inset-x-0 top-0 z-[60] h-[2px] origin-left bg-gradient-to-r from-nebula-glow via-nebula-periwinkle to-nebula-sand"
      style={{ scaleX }}
    />
  );
}

/** Moves children vertically as the element crosses the viewport (parallax). */
export function Parallax({
  children,
  offset = 60,
  className,
}: {
  children: ReactNode;
  offset?: number;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const reduce = useReducedMotion();
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start end", "end start"] });
  const y = useTransform(scrollYProgress, [0, 1], [offset, -offset]);
  return (
    <motion.div ref={ref} className={className} style={reduce ? undefined : { y }}>
      {children}
    </motion.div>
  );
}

/** A line that draws itself as its section scrolls through the viewport. */
export function ScrollDrawLine({
  className = "",
  progress,
}: { className?: string; progress: MotionValue<number> }) {
  const scaleX = useSpring(progress, { stiffness: 120, damping: 28 });
  return (
    <motion.div aria-hidden="true" className={`origin-left ${className}`} style={{ scaleX }} />
  );
}

// ── Infinite marquee ────────────────────────────────────────────────────────

export function Marquee({
  children,
  className = "",
  speed = 38,
  reverse = false,
}: {
  children: ReactNode;
  className?: string;
  /** Seconds per loop */
  speed?: number;
  reverse?: boolean;
}) {
  return (
    <div
      className={`group/marquee relative flex overflow-hidden [mask-image:linear-gradient(90deg,transparent,#000_8%,#000_92%,transparent)] ${className}`}
    >
      {[0, 1].map((copy) => (
        <div
          key={copy}
          aria-hidden={copy === 1}
          className="creo-marquee-track flex shrink-0 items-center gap-10 pr-10 group-hover/marquee:[animation-play-state:paused]"
          style={{
            animationDuration: `${speed}s`,
            animationDirection: reverse ? "reverse" : "normal",
          }}
        >
          {children}
        </div>
      ))}
    </div>
  );
}
