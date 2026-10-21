import { Check } from "lucide-react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useRef, useState } from "react";
import { EASE_OUT_EXPO, Reveal } from "../../components/motion";
import { ScrollFlipText } from "../../components/motion/ScrollFlipText";
import { SEOHead } from "../../components/public/SEOHead";
import { DISPLAY, PillLink, SampleCta } from "../../components/public/StagePieces";
import { SCREEN_IMAGES, Stage3DRoot, useStageLayer } from "../../components/stage3d/registry";

const EYEBROW = "text-sm font-bold uppercase tracking-[0.18em] text-site-mist";

const CATEGORIES = [
  {
    name: "Beauty & skincare",
    image: SCREEN_IMAGES[1],
    about:
      "Launch countdowns, routine reels and ingredient carousels that keep a new product talked about all week.",
    formats: ["Launch countdowns", "Routine reels", "Ingredient carousels"],
  },
  {
    name: "Food & drink",
    image: SCREEN_IMAGES[2],
    about:
      "Step-by-step recipe reels, menu carousels and drop-day stories, cut to make people hungry.",
    formats: ["Recipe reels", "Menu carousels", "Drop-day stories"],
  },
  {
    name: "Fashion & apparel",
    image: SCREEN_IMAGES[3],
    about: "Lookbooks, try-on reels and new-arrival stories that move with every collection.",
    formats: ["Lookbooks", "Try-on reels", "New-arrival stories"],
  },
  {
    name: "Fitness & wellness",
    image: SCREEN_IMAGES[0],
    about: "Workout reels, product demos and challenge stories that turn followers into regulars.",
    formats: ["Workout reels", "Product demos", "Challenge stories"],
  },
  {
    name: "Home & living",
    image: SCREEN_IMAGES[4],
    about:
      "Room refreshes, styling carousels and before-and-after stories that show the product at home.",
    formats: ["Room refreshes", "Styling carousels", "Before-and-after stories"],
  },
];

const FIRST_MONTH = [
  {
    when: "Day 1",
    title: "Your Brand DNA",
    body: "Upload your logo, fonts, colours, past posts and guidelines. Your creative lead turns them into the Brand DNA your pod works from.",
  },
  {
    when: "Within 7 days",
    title: "Your first batch",
    body: "Reels, carousels and stories land in your portal, organised by batch and ready for review.",
  },
  {
    when: "Every week",
    title: "Review and approve",
    body: "Approve in one click, or decline with a note and the pod revises within your plan's quota.",
  },
  {
    when: "Every month",
    title: "Plan the next one",
    body: "Your lead maps the next content calendar with you. Upgrade, pause renewal or cancel anytime.",
  },
];

const FIT = [
  "You sell direct to consumers and grow on Instagram",
  "You need fresh reels, carousels and stories every week",
  "You'd rather approve work than brief it from scratch",
  "You want a clear due date on every batch",
];

export function ClientsPage() {
  return (
    <Stage3DRoot>
      <ClientsContent />
    </Stage3DRoot>
  );
}

function ClientsContent() {
  const reduce = useReducedMotion() ?? false;
  const heroRef = useRef<HTMLElement>(null);
  const heroViewRef = useRef<HTMLDivElement>(null);
  const fitRef = useRef<HTMLElement>(null);
  const fitViewRef = useRef<HTMLDivElement>(null);

  useStageLayer({
    kind: "blocks",
    mode: "assemble",
    drive: "pass",
    views: [heroViewRef],
    section: heroRef,
  });
  useStageLayer({ kind: "mailbox", views: [fitViewRef], section: fitRef });

  const [active, setActive] = useState(0);
  const category = CATEGORIES[active] ?? CATEGORIES[0];

  return (
    <>
      <SEOHead
        title="Who We Work With | Creo D2C Content Pods"
        description="Creo pods make weekly reels, carousels and stories for D2C brands in beauty, food, fashion, fitness and home. See what your first month looks like."
      />

      {/* 1. Hero — scattered blocks assemble into one cube as the page scrolls */}
      <section
        ref={heroRef}
        className="st-tone st-hero relative -mt-[76px] overflow-hidden px-6 pb-20 pt-[calc(76px+10svh)] sm:-mt-[84px] sm:px-8 sm:pt-[calc(84px+12svh)] lg:px-12"
      >
        <div className="mx-auto grid max-w-[1240px] items-center gap-6 lg:min-h-[66svh] lg:grid-cols-2">
          <div className="relative z-10">
            <p className={EYEBROW}>Who we work with</p>
            <ScrollFlipText
              as="h1"
              playOnMount
              delay={0.2}
              text="For brands that post every week."
              className={`creo-display mt-6 block max-w-[12ch] text-[clamp(3rem,7vw,6.75rem)] leading-[0.92] ${DISPLAY}`}
            />
            <Reveal delay={0.6}>
              <p className="mt-6 max-w-lg text-lg leading-relaxed text-site-mist">
                Creo pods work with direct-to-consumer brands that need fresh reels, carousels and
                stories every week, without building an in-house team.
              </p>
            </Reveal>
            <Reveal delay={0.75}>
              <div className="mt-10 flex flex-wrap gap-3">
                <PillLink to="/pricing">Compare plans</PillLink>
              </div>
            </Reveal>
          </div>
          <div
            ref={heroViewRef}
            className="pointer-events-none -order-1 h-[34svh] lg:order-none lg:h-[66svh]"
          />
        </div>
      </section>

      {/* 2. Brands we build for — pick a category, see what the pod makes for it */}
      <section className="st-tone st-inverse relative overflow-hidden px-6 py-28 sm:px-8 lg:px-12 lg:py-36">
        <div className="mx-auto max-w-[1440px]">
          <ScrollFlipText
            as="h2"
            text="Brands we build for"
            className="block max-w-[12ch] text-[clamp(3.5rem,9vw,8.5rem)] font-medium leading-[0.88] tracking-[-0.06em] text-[var(--tone-accent)]"
          />
          <div className="mt-14 grid items-start gap-12 lg:grid-cols-12">
            <ul className="lg:col-span-4">
              {CATEGORIES.map((item, i) => (
                <li key={item.name}>
                  <button
                    type="button"
                    aria-pressed={active === i}
                    onClick={() => setActive(i)}
                    onMouseEnter={() => setActive(i)}
                    onFocus={() => setActive(i)}
                    className={`w-full cursor-pointer border-b-2 py-5 text-left text-2xl font-medium tracking-[-0.03em] transition-colors duration-300 sm:text-3xl ${
                      active === i
                        ? "border-[var(--tone-accent)] text-site-ink"
                        : "border-hi/10 text-site-mist hover:text-site-ink"
                    }`}
                  >
                    {item.name}
                  </button>
                </li>
              ))}
            </ul>

            <div className="flex justify-center lg:col-span-4">
              <div className="relative size-52 rotate-45 overflow-hidden rounded-[3rem] sm:size-64 sm:rounded-[3.5rem] lg:size-72">
                <AnimatePresence initial={false}>
                  <motion.img
                    key={category?.name}
                    src={category?.image}
                    alt=""
                    initial={reduce ? false : { opacity: 0, scale: 1.15 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.6, ease: EASE_OUT_EXPO }}
                    className="absolute inset-[-21%] size-[142%] max-w-none -rotate-45 object-cover"
                  />
                </AnimatePresence>
              </div>
            </div>

            <div className="lg:col-span-4">
              <p className={EYEBROW}>What your pod makes</p>
              <AnimatePresence mode="wait" initial={false}>
                <motion.div
                  key={category?.name}
                  initial={reduce ? false : { opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -12 }}
                  transition={{ duration: 0.35 }}
                >
                  <p className="mt-4 max-w-sm text-lg leading-relaxed text-site-ink">
                    {category?.about}
                  </p>
                  <ul className="mt-6 space-y-2.5">
                    {category?.formats.map((format) => (
                      <li key={format} className="flex items-start gap-3 text-base text-site-ink">
                        <Check className="mt-1 size-4 shrink-0 text-[var(--tone-accent)]" />
                        {format}
                      </li>
                    ))}
                  </ul>
                </motion.div>
              </AnimatePresence>
            </div>
          </div>
        </div>
      </section>

      {/* 3. Your first month — a ruled timeline beside a sticky title */}
      <section className="st-tone st-base px-6 py-24 sm:px-8 sm:py-32 lg:px-12">
        <div className="mx-auto grid max-w-[1240px] gap-12 lg:grid-cols-12 lg:gap-16">
          <div className="lg:col-span-5">
            <div className="lg:sticky lg:top-32">
              <ScrollFlipText
                as="h2"
                text="Your first month."
                className={`block text-[clamp(2.6rem,5vw,4.75rem)] leading-[1] ${DISPLAY}`}
              />
              <Reveal delay={0.1}>
                <p className="mt-6 max-w-md text-lg leading-relaxed text-site-mist">
                  From sign-up to a steady weekly rhythm. Here's what happens, and when.
                </p>
              </Reveal>
            </div>
          </div>
          <ol className="border-t-2 border-hi/80 lg:col-span-7">
            {FIRST_MONTH.map((step, i) => (
              <Reveal
                key={step.title}
                as="li"
                delay={i * 0.06}
                className="grid gap-3 border-b border-hi/15 py-10 sm:grid-cols-[9.5rem_1fr] sm:gap-8"
              >
                <span className="pt-2 font-mono text-sm text-[var(--tone-accent)]">
                  {step.when}
                </span>
                <span>
                  <span className="block text-3xl font-medium tracking-[-0.03em] text-site-ink sm:text-4xl">
                    {step.title}
                  </span>
                  <span className="mt-3 block max-w-xl text-lg leading-relaxed text-site-mist">
                    {step.body}
                  </span>
                </span>
              </Reveal>
            ))}
          </ol>
        </div>
      </section>

      {/* 4. A good fit — the mailbox raising its flag beside the checklist */}
      <section
        ref={fitRef}
        className="st-tone st-midnight relative overflow-hidden px-6 py-24 sm:px-8 sm:py-32 lg:px-12"
      >
        <div className="mx-auto grid max-w-[1240px] items-center gap-10 lg:grid-cols-2">
          <div className="relative z-10">
            <ScrollFlipText
              as="h2"
              text="A good fit if you..."
              className={`block text-[clamp(2.6rem,5.5vw,5rem)] leading-[0.95] ${DISPLAY}`}
            />
            <ul className="mt-10 border-t border-hi/15">
              {FIT.map((item, i) => (
                <Reveal
                  key={item}
                  as="li"
                  delay={i * 0.06}
                  className="flex items-start gap-4 border-b border-hi/15 py-5 text-xl font-medium leading-snug text-site-ink"
                >
                  <Check
                    className="mt-1 size-5 shrink-0 text-[var(--tone-accent)]"
                    strokeWidth={2.5}
                  />
                  {item}
                </Reveal>
              ))}
            </ul>
            <Reveal delay={0.2}>
              <div className="mt-10 flex flex-wrap gap-3">
                <PillLink to="/pricing">Compare plans</PillLink>
                <PillLink href="https://wa.me/919941999415">Ask us on WhatsApp</PillLink>
              </div>
            </Reveal>
          </div>
          <div ref={fitViewRef} className="pointer-events-none h-[42svh] lg:h-[66svh]" />
        </div>
      </section>

      <SampleCta />
    </>
  );
}
