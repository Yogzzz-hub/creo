import { motion, useReducedMotion } from "motion/react";
import type { ReactNode } from "react";
import { CursorSpotlight, EASE_OUT_EXPO, Reveal, ScrambleText, SplitText } from "../motion";

/** Pill label above headings; its text decodes in when it scrolls into view. */
export function Eyebrow({ children, duration }: { children: string; duration?: number }) {
  return (
    <span className="creo-eyebrow">
      <ScrambleText text={children} duration={duration} />
    </span>
  );
}

/** Eyebrow + masked headline + intro copy, shared by every public page section. */
export function SectionHeading({
  eyebrow,
  title,
  accent,
  children,
  align = "center",
  className = "",
}: {
  eyebrow: string;
  title: string;
  accent?: string[];
  children?: ReactNode;
  align?: "center" | "left";
  className?: string;
}) {
  const centered = align === "center";
  return (
    <div className={`${centered ? "mx-auto max-w-3xl text-center" : "max-w-3xl"} mb-14 sm:mb-16 ${className}`}>
      <Reveal>
        <Eyebrow>{eyebrow}</Eyebrow>
      </Reveal>
      <SplitText
        as="h2"
        text={title}
        accent={accent}
        className="mb-5 mt-6 block text-[2rem] font-black leading-[1.04] tracking-[-0.035em] text-[#F4F7FF] sm:text-5xl lg:text-[3.5rem]"
      />
      {children && (
        <Reveal delay={0.15}>
          <p className={`text-base leading-relaxed text-[#93A0BF] sm:text-lg ${centered ? "mx-auto max-w-2xl" : "max-w-2xl"}`}>
            {children}
          </p>
        </Reveal>
      )}
    </div>
  );
}

/**
 * Page-opening hero: decoding eyebrow, headline rising out of a mask, lead copy,
 * actions, and an optional visual on the right. Sits under the glass navbar
 * with the same grid, cursor spotlight and ambient light as the homepage.
 */
export function PageHero({
  eyebrow,
  title,
  accent,
  lead,
  actions,
  aside,
  children,
}: {
  eyebrow: string;
  title: string;
  accent?: string[];
  lead?: ReactNode;
  actions?: ReactNode;
  /** Visual shown beside the copy on large screens (centred layout when omitted) */
  aside?: ReactNode;
  /** Extra content under the actions (stat pods, trust rows...) */
  children?: ReactNode;
}) {
  const reduce = useReducedMotion();
  const centered = !aside;

  return (
    <section className="relative isolate -mt-[76px] overflow-hidden pt-[76px] sm:-mt-[84px] sm:pt-[84px]">
      <div
        aria-hidden="true"
        className="creo-grid-bg absolute inset-0 -z-20 opacity-60 [mask-image:radial-gradient(75%_70%_at_50%_15%,#000_10%,transparent_75%)]"
      />
      <CursorSpotlight className="-z-10" />
      <div aria-hidden="true" className="absolute -top-48 right-[-8%] -z-10 size-[620px] rounded-full bg-[#3B6BFF]/20 blur-[140px]" />
      <div aria-hidden="true" className="absolute left-[-12%] top-1/3 -z-10 size-[420px] rounded-full bg-[#7DD3FC]/[0.07] blur-[120px]" />

      <div className="mx-auto max-w-[1240px] px-6 pb-16 pt-12 sm:px-8 sm:pb-20 sm:pt-16 lg:px-12 lg:pb-24 lg:pt-20">
        <div className={centered ? "mx-auto max-w-4xl text-center" : "grid grid-cols-1 items-center gap-14 lg:grid-cols-2 lg:gap-12"}>
          <div className={centered ? "" : "relative z-10 lg:pr-6"}>
            <motion.div
              initial={reduce ? false : { opacity: 0, y: 12, filter: "blur(6px)" }}
              animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
              transition={{ duration: 0.8, ease: EASE_OUT_EXPO }}
              className="mb-7"
            >
              <Eyebrow duration={1.1}>{eyebrow}</Eyebrow>
            </motion.div>

            <SplitText
              as="h1"
              animateOnMount
              delay={0.1}
              text={title}
              accent={accent}
              className={`block text-[2.5rem] font-black leading-[1.02] tracking-[-0.045em] text-[#F4F7FF] sm:text-6xl lg:text-[4.25rem] ${
                centered ? "mx-auto max-w-4xl" : ""
              }`}
            />

            {lead && (
              <Reveal delay={0.45} blur>
                <p
                  className={`mt-7 text-base leading-relaxed text-[#93A0BF] sm:text-lg ${
                    centered ? "mx-auto max-w-2xl" : "max-w-xl"
                  }`}
                >
                  {lead}
                </p>
              </Reveal>
            )}

            {actions && (
              <Reveal delay={0.55}>
                <div
                  className={`mt-9 flex flex-col items-stretch gap-3.5 sm:flex-row sm:items-center ${
                    centered ? "sm:justify-center" : ""
                  }`}
                >
                  {actions}
                </div>
              </Reveal>
            )}

            {children && <div className="mt-10">{children}</div>}
          </div>

          {aside && (
            <motion.div
              initial={reduce ? false : { opacity: 0, y: 40, rotateX: 8, filter: "blur(10px)" }}
              animate={{ opacity: 1, y: 0, rotateX: 0, filter: "blur(0px)" }}
              transition={{ duration: 1.1, delay: 0.25, ease: EASE_OUT_EXPO }}
              className="[perspective:1200px]"
            >
              {aside}
            </motion.div>
          )}
        </div>
      </div>
    </section>
  );
}
