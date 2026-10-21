import { animate, type MotionValue, motion, useMotionValue, useReducedMotion, useScroll, useTransform } from "motion/react";
import { type ElementType, Fragment, type Ref, useEffect, useRef } from "react";

type ScrollOffset = NonNullable<Parameters<typeof useScroll>[0]>["offset"];

/** 0 → 1 as `v` moves from `a` to `b`, clamped. */
export const ramp = (v: number, a: number, b: number) => Math.min(Math.max((v - a) / (b - a), 0), 1);

function FlipChar({
  char,
  progress,
  start,
  end,
}: {
  char: string;
  progress: MotionValue<number>;
  start: number;
  end: number;
}) {
  // Function transforms on purpose: Motion would hand array ranges on opacity
  // to a native ScrollTimeline, which misreads tall sticky sections
  const rotateX = useTransform(progress, (v) => -100 * (1 - ramp(v, start, end)));
  const y = useTransform(progress, (v) => `${0.42 * (1 - ramp(v, start, end))}em`);
  const opacity = useTransform(progress, (v) => ramp(v, start, start + (end - start) * 0.7));
  return (
    <motion.span className="inline-block origin-[50%_100%] will-change-transform" style={{ rotateX, y, opacity }}>
      {char}
    </motion.span>
  );
}

/**
 * Headline whose letters tip up out of the baseline one after another as the
 * page scrolls, so the end of a word is still turning while its start has
 * landed. Driven by `progress` (within `range`) when given, by a timed play
 * on mount with `playOnMount` (page-top headlines), otherwise by the
 * element's own scroll into view. Static for reduced motion.
 */
export function ScrollFlipText({
  text,
  as: Tag = "span",
  className,
  progress,
  range = [0, 1],
  offset = ["start 0.95", "start 0.4"],
  playOnMount = false,
  delay = 0,
}: {
  text: string;
  as?: ElementType;
  className?: string;
  progress?: MotionValue<number>;
  range?: [number, number];
  offset?: ScrollOffset;
  playOnMount?: boolean;
  delay?: number;
}) {
  const ref = useRef<HTMLElement>(null);
  const reduce = useReducedMotion();
  const { scrollYProgress } = useScroll({ target: ref, offset });
  const played = useMotionValue(0);
  useEffect(() => {
    if (!playOnMount) return;
    const controls = animate(played, 1, { duration: 1.5, delay, ease: [0.22, 1, 0.36, 1] });
    return () => controls.stop();
  }, [playOnMount, played, delay]);
  const source = playOnMount ? played : (progress ?? scrollYProgress);

  if (reduce) {
    return (
      <Tag ref={ref as Ref<HTMLElement>} className={className}>
        {text}
      </Tag>
    );
  }

  const [from, to] = range;
  const span = to - from;
  const total = text.replace(/ /g, "").length;
  let index = 0;
  const words = text.split(" ");

  return (
    <Tag ref={ref as Ref<HTMLElement>} className={className} aria-label={text}>
      <span aria-hidden="true" style={{ perspective: "700px" }}>
        {words.map((word, w) => (
          // biome-ignore lint/suspicious/noArrayIndexKey: words can repeat; order is stable
          <Fragment key={`${word}-${w}`}>
            <span className="inline-block whitespace-nowrap">
              {[...word].map((char, c) => {
                const start = from + (index / Math.max(total, 1)) * span * 0.6;
                index++;
                return (
                  // biome-ignore lint/suspicious/noArrayIndexKey: letters repeat; order is stable
                  <FlipChar key={c} char={char} progress={source} start={start} end={start + span * 0.4} />
                );
              })}
            </span>
            {w < words.length - 1 && " "}
          </Fragment>
        ))}
      </span>
    </Tag>
  );
}
