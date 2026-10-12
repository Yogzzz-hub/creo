/**
 * Creo motion kit — small, reusable interaction primitives for the marketing pages.
 *
 * Everything animates transform/opacity only, respects prefers-reduced-motion,
 * and turns pointer-driven effects off on touch devices.
 */
import {
  type MotionValue,
  animate,
  easeIn,
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
  useId,
  useRef,
  useState,
} from "react";

export const EASE_OUT_EXPO = [0.16, 1, 0.3, 1] as const;
/** Symmetric, weighty ease used for mask wipes and curtains */
export const EASE_IN_OUT_QUART = [0.76, 0, 0.24, 1] as const;

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
  accentClassName = "creo-text-gradient",
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
  const bare = (w: string) => w.replace(/[.,!?]/g, "");
  const accentWords = accent?.map(bare);
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
                accentWords?.includes(bare(word)) ? accentClassName : ""
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
  const [display, setDisplay] = useState(value);

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
      className="pointer-events-none fixed inset-x-0 top-0 z-[60] h-[2px] origin-left bg-gradient-to-r from-[#4F7BFF] via-[#DCE8FF] to-[#7DD3FC]"
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

// ── Masking ─────────────────────────────────────────────────────────────────

type MaskFrom = "bottom" | "top" | "left" | "right" | "center";

const MASK_HIDDEN: Record<MaskFrom, string> = {
  bottom: "inset(100% 0% 0% 0%)",
  top: "inset(0% 0% 100% 0%)",
  left: "inset(0% 100% 0% 0%)",
  right: "inset(0% 0% 0% 100%)",
  center: "inset(50% 50% 50% 50%)",
};

/**
 * Wipes its content in through a clip-path mask while the content itself
 * settles from a slight zoom, like a photo being unveiled.
 */
export function MaskReveal({
  children,
  className = "",
  innerClassName = "",
  from = "bottom",
  delay = 0,
  duration = 1.25,
  zoom = 1.18,
  animateOnMount = false,
}: {
  children: ReactNode;
  className?: string;
  innerClassName?: string;
  from?: MaskFrom;
  delay?: number;
  duration?: number;
  /** Starting scale of the inner content (1 disables the zoom) */
  zoom?: number;
  /** Play immediately (hero) instead of waiting for the element to scroll in */
  animateOnMount?: boolean;
}) {
  const reduce = useReducedMotion();
  const trigger = animateOnMount
    ? { animate: "show" as const }
    : { whileInView: "show" as const, viewport: { once: true, margin: "0px 0px -12% 0px" } };
  return (
    <motion.div
      className={className}
      initial={reduce ? false : "hidden"}
      {...trigger}
      variants={{
        hidden: { clipPath: MASK_HIDDEN[from] },
        show: {
          clipPath: "inset(0% 0% 0% 0%)",
          // Drop the clip once revealed so 3D hover effects inside aren't flattened
          transitionEnd: { clipPath: "none" },
          transition: { duration, delay, ease: EASE_IN_OUT_QUART },
        },
      }}
    >
      <motion.div
        className={innerClassName}
        variants={{
          hidden: { scale: zoom },
          show: { scale: 1, transition: { duration: duration + 0.35, delay, ease: EASE_OUT_EXPO } },
        }}
      >
        {children}
      </motion.div>
    </motion.div>
  );
}

/**
 * Scroll-linked section transition: the panel starts as an inset rounded card
 * and opens out to its full width as it scrolls into view.
 */
export function ScrollMask({
  children,
  className = "",
  inset = 6,
  radius = 40,
  endRadius = 0,
}: {
  children: ReactNode;
  className?: string;
  /** Horizontal inset (%) at the start of the transition */
  inset?: number;
  radius?: number;
  endRadius?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const reduce = useReducedMotion();
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start end", "start 0.3"] });
  const p = useSpring(scrollYProgress, { stiffness: 140, damping: 30, mass: 0.35 });
  const x = useTransform(p, [0, 1], [inset, 0]);
  const r = useTransform(p, [0, 1], [radius, endRadius]);
  const clipPath = useMotionTemplate`inset(0% ${x}% 0% ${x}% round ${r}px)`;
  return (
    <motion.div ref={ref} className={className} style={reduce ? undefined : { clipPath }}>
      {children}
    </motion.div>
  );
}

/**
 * Grid texture that only shows inside a soft circle following the cursor.
 * Place inside a `relative` parent; it listens to pointer moves on that parent.
 */
export function CursorSpotlight({ className = "" }: { className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const fine = useFinePointer();
  const reduce = useReducedMotion();

  useEffect(() => {
    const el = ref.current;
    const host = el?.parentElement;
    if (!el || !host || !fine || reduce) return;
    let raf = 0;
    const onMove = (e: globalThis.PointerEvent) => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const r = host.getBoundingClientRect();
        el.style.setProperty("--mx", `${e.clientX - r.left}px`);
        el.style.setProperty("--my", `${e.clientY - r.top}px`);
      });
    };
    host.addEventListener("pointermove", onMove, { passive: true });
    return () => {
      host.removeEventListener("pointermove", onMove);
      cancelAnimationFrame(raf);
    };
  }, [fine, reduce]);

  return (
    <div
      ref={ref}
      aria-hidden="true"
      className={`creo-spotlight-grid pointer-events-none absolute inset-0 ${className}`}
    />
  );
}

/** Marker-style highlight that sweeps in behind a word or phrase. */
export function HighlightSweep({
  children,
  delay = 0,
  className = "",
}: {
  children: ReactNode;
  delay?: number;
  className?: string;
}) {
  const reduce = useReducedMotion();
  return (
    <span className={`relative isolate inline-block ${className}`}>
      <motion.span
        aria-hidden="true"
        className="absolute -inset-x-[0.04em] bottom-[0.01em] -z-10 h-[0.09em] origin-left rounded-full bg-gradient-to-r from-[#3B6BFF] via-[#7DA2FF] to-[#7DD3FC]"
        initial={reduce ? false : { scaleX: 0 }}
        animate={{ scaleX: 1 }}
        transition={{ duration: 1.1, delay, ease: EASE_IN_OUT_QUART }}
      />
      {children}
    </span>
  );
}

/**
 * Pinned scroll scene: a giant word is cut out of the page like a stencil, with
 * a photo showing through it. Scrolling zooms the stencil until the photo
 * fills the screen, then the caption rises in.
 */
export function MaskedTextZoom({
  text,
  image,
  imageAlt,
  children,
  eyebrow,
}: {
  text: string;
  image: string;
  imageAlt: string;
  children?: ReactNode;
  eyebrow?: string;
}) {
  const ref = useRef<HTMLElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const maskId = `creo-mask-${useId().replace(/:/g, "")}`;
  const reduce = useReducedMotion();
  const [box, setBox] = useState({ w: 1600, h: 900 });

  useEffect(() => {
    const el = stageRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => {
      const { width, height } = entry?.contentRect ?? { width: 0, height: 0 };
      if (width && height) setBox({ w: Math.round(width), h: Math.round(height) });
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end end"] });
  const p = useSpring(scrollYProgress, { stiffness: 160, damping: 34, mass: 0.3 });
  const textScale = useTransform(p, [0.04, 0.72], [1, 9], { ease: easeIn });
  const veil = useTransform(p, [0.4, 0.7], [1, 0]);
  const imageScale = useTransform(p, [0, 1], [1.3, 1]);
  const hint = useTransform(p, [0, 0.1], [1, 0]);
  const captionOpacity = useTransform(p, [0.66, 0.84], [0, 1]);
  const captionY = useTransform(p, [0.66, 0.9], [48, 0]);
  const shade = useTransform(p, [0.6, 0.9], [0, 1]);

  // Size the word to most of the stage width (Inter Black ≈ 0.5em/char); phones get a bit more
  const widthShare = box.w < 640 ? 0.94 : 0.8;
  const fontSize = Math.min(box.h * 0.6, (box.w * widthShare) / Math.max(text.length * 0.5, 1));

  if (reduce) {
    return (
      <section ref={ref} className="relative isolate overflow-hidden">
        <img src={image} alt={imageAlt} className="absolute inset-0 -z-20 size-full object-cover" />
        <div className="absolute inset-0 -z-10 bg-gradient-to-t from-[#050A1A] via-[#050A1A]/70 to-[#050A1A]/40" />
        <div className="mx-auto flex min-h-[80svh] max-w-[1440px] items-end px-6 py-24 sm:px-8 lg:px-12">
          {children}
        </div>
      </section>
    );
  }

  return (
    <section ref={ref} className="relative h-[240vh]" aria-label={text}>
      <div ref={stageRef} className="sticky top-0 h-[100svh] overflow-hidden">
        <motion.img
          src={image}
          alt={imageAlt}
          loading="lazy"
          style={{ scale: imageScale }}
          className="absolute inset-0 size-full object-cover"
        />
        {/* Cool blue grade so the photo sits inside the palette */}
        <div className="absolute inset-0 bg-[#0B1E5C]/35 mix-blend-multiply" />
        <motion.div
          style={{ opacity: shade }}
          className="absolute inset-0 bg-gradient-to-t from-[#050A1A] via-[#050A1A]/55 to-[#050A1A]/10"
        />

        {/* The stencil */}
        <motion.svg
          aria-hidden="true"
          className="absolute inset-0 size-full"
          viewBox={`0 0 ${box.w} ${box.h}`}
          preserveAspectRatio="none"
          style={{ opacity: veil }}
        >
          <defs>
            <mask id={maskId} maskUnits="userSpaceOnUse" x="0" y="0" width={box.w} height={box.h}>
              <rect width={box.w} height={box.h} fill="#fff" />
              <motion.text
                x={box.w / 2}
                y={box.h / 2}
                textAnchor="middle"
                dominantBaseline="central"
                fontSize={fontSize}
                fontWeight={900}
                letterSpacing="-0.05em"
                fontFamily="Inter, system-ui, sans-serif"
                fill="#000"
                style={{ scale: textScale, transformBox: "fill-box", originX: 0.5, originY: 0.5 }}
              >
                {text}
              </motion.text>
            </mask>
          </defs>
          <rect width={box.w} height={box.h} fill="#050A1A" mask={`url(#${maskId})`} />
        </motion.svg>

        {eyebrow && (
          <motion.div
            style={{ opacity: hint }}
            className="absolute inset-x-0 bottom-10 flex flex-col items-center gap-3 text-[11px] font-bold uppercase tracking-[0.3em] text-[#93A0BF]"
          >
            {eyebrow}
            <span className="relative h-10 w-px overflow-hidden bg-[#223058]">
              <span className="absolute inset-x-0 top-0 h-1/2 animate-[creoScrollCue_1.8s_ease-in-out_infinite] bg-[#4F7BFF]" />
            </span>
          </motion.div>
        )}

        <motion.div
          style={{ opacity: captionOpacity, y: captionY }}
          className="absolute inset-x-0 bottom-0 mx-auto max-w-[1440px] px-6 pb-16 sm:px-8 sm:pb-20 lg:px-12 lg:pb-24"
        >
          {children}
        </motion.div>
      </div>
    </section>
  );
}
