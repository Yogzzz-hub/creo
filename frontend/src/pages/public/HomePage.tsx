import { useRef, useState } from "react";
import { Link } from "react-router";
import { AnimatePresence, type MotionValue, motion, useReducedMotion, useScroll, useTransform } from "motion/react";
import { ArrowDown, ArrowUpRight, Check, Plus, Zap } from "lucide-react";
import { SectionHeading } from "../../components/public/PageBlocks";
import { PortalDemo } from "../../components/public/PortalDemo";
import { DISPLAY, PillLink, SampleCta } from "../../components/public/StagePieces";
import { EASE_OUT_EXPO, Reveal } from "../../components/motion";
import { ramp, ScrollFlipText } from "../../components/motion/ScrollFlipText";
import { smoothScrollTo } from "../../components/motion/SmoothScroll";
import { SCREEN_IMAGES, Stage3DRoot, useStageLayer } from "../../components/stage3d/registry";

const PRINCIPLES = [
  {
    title: "Your Brand DNA, first",
    body: "Day one, you upload your assets, fonts and guidelines. Your lead, editor and designer work from that Brand DNA, so every reel, carousel and story ships on-brand.",
  },
  {
    title: "One pod, one portal",
    body: "No cluttered email threads, no lost Slack files. Drafts arrive in your portal, organised by batch. Approve in one click, or decline with a note and the pod revises within your plan's quota.",
  },
  {
    title: "The clock is public",
    body: "Every batch is timestamped by our SLA service: 3 business days on Starter, 2 on Growth, 24 hours on Scale. Late batch? Next cycle credited.",
  },
  {
    title: "Month-to-month, always",
    body: "No long-term lock-in. Upgrade, pause renewal or cancel anytime. Your first batch lands within 7 days of signing up.",
  },
];

const POD = [
  {
    role: "Creative lead",
    about: "Owns your Brand DNA and the content calendar, and is your single point of contact. Every brief starts and ends with them.",
    image: SCREEN_IMAGES[0],
  },
  {
    role: "Video editor",
    about: "Cuts your reels, hooks and story sets, working from the Brand DNA so every edit looks and sounds like you.",
    image: SCREEN_IMAGES[3],
  },
  {
    role: "Designer",
    about: "Builds carousels and statics on your brand system, ready for review in the same batch as the reels.",
    image: SCREEN_IMAGES[4],
  },
  {
    role: "You",
    about: "Review every batch in the portal. Approve in one click, or decline with a note and the pod revises within your plan's quota.",
    image: SCREEN_IMAGES[1],
  },
];

const DROPS = [
  {
    label: "Formats",
    title: "Reels, carousels and stories, batched and on-brand every week.",
    cta: "See the work",
    to: "/work",
  },
  {
    label: "Portal",
    title: "Every batch lands in one portal, ready for one-click approval.",
    cta: "Explore the portal",
    to: "/portal",
  },
];

const INCLUDED = [
  "A dedicated lead, editor and designer",
  "Brand DNA onboarding",
  "Weekly batches of reels, carousels and stories",
  "One-click approvals in your portal",
  "Revisions within your plan's quota",
  "SLA-timed delivery; late batch credited",
  "Month-to-month, cancel anytime",
];

const PLAN_ROWS = [
  { name: "Starter", turnaround: "3 business days per batch" },
  { name: "Growth", turnaround: "2 business days per batch" },
  { name: "Scale", turnaround: "24-hour priority turnaround" },
];

const faqs = [
  {
    question: "How does CREO streamline content creation for D2C brands?",
    answer: "CREO connects content briefs directly to creative leads and client sign-offs. Your briefs trigger automated SLA revision tickets and real-time deliverables tracking—eliminating delays and fragmented communication.",
    extra: (
      <div className="text-site-ice bg-site-blue/10 border border-site-blue/30 rounded-full px-3.5 py-1.5 text-xs inline-flex items-center gap-1.5 mt-4">
        <Zap className="size-3.5 fill-current text-site-blue-light" />
        Typical D2C brand onboarding completed in under 48 hours.
      </div>
    ),
  },
  {
    question: "What content deliverables are included in our monthly pod retainer?",
    answer: "Depending on your plan tier (Starter, Growth, or Scale), your pod delivers a fixed monthly volume of high-converting 9:16 reels, static/carousel brand posts, and interactive story sets.",
  },
  {
    question: "What are the guaranteed turnaround times for content batches?",
    answer: "Every deliverable batch is produced under strict SLA timelines: 3 business days for Starter, 2 business days for Growth, and 24-hour priority turnaround for Scale.",
  },
  {
    question: "How do revisions work inside the client portal?",
    answer: "You review draft assets in your portal. If revisions are needed, click Decline, enter your feedback, and your pod will revise and resubmit within your plan's revision quota.",
  },
  {
    question: "Can we upgrade, pause, or cancel our retainer anytime?",
    answer: "Yes. All Creo retainers operate on a month-to-month basis with no long-term lock-in. You can upgrade, pause renewal, or cancel anytime.",
  },
];


/**
 * Opening beat: the "c." mark on dark; scrolling swells its dot until it
 * floods the screen in the brand colour, handing over to the 3D hero.
 */
function IntroMark({ progress }: { progress: MotionValue<number> }) {
  // Function transforms throughout: see ScrollFlipText for why not array ranges
  const dotScale = useTransform(progress, (v) => 170 ** ramp(v, 0, 0.12));
  const glyphOpacity = useTransform(progress, (v) => 1 - ramp(v, 0, 0.045));
  const layerOpacity = useTransform(progress, (v) => 1 - ramp(v, 0.12, 0.165));
  return (
    <motion.div
      aria-hidden="true"
      style={{ opacity: layerOpacity }}
      className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center"
    >
      <div className="flex items-end text-[var(--site-blue-deep)]">
        <motion.svg aria-hidden="true" style={{ opacity: glyphOpacity }} viewBox="0 0 100 100" className="size-24 sm:size-28">
          <path d="M70.6 25.5A32 32 0 1 0 70.6 74.5" fill="none" stroke="currentColor" strokeWidth="19" strokeLinecap="round" />
        </motion.svg>
        <motion.span style={{ scale: dotScale }} className="mb-3 -ml-1 block size-7 rounded-full bg-current" />
      </div>
      <motion.p
        style={{ opacity: glyphOpacity }}
        className="absolute bottom-10 flex items-center gap-2 text-sm font-semibold text-white/70"
      >
        <ArrowDown className="size-4 animate-bounce" />
        Scroll to dive in
      </motion.p>
    </motion.div>
  );
}

export function HomePage() {
  return (
    <Stage3DRoot>
      <HomeContent />
    </Stage3DRoot>
  );
}

function HomeContent() {
  const reduce = useReducedMotion() ?? false;

  const heroRef = useRef<HTMLElement>(null);
  const heroViewRef = useRef<HTMLDivElement>(null);
  const manifestoRef = useRef<HTMLElement>(null);
  const manifestoViewRef = useRef<HTMLDivElement>(null);
  const manifestoViewMobileRef = useRef<HTMLDivElement>(null);
  const podRef = useRef<HTMLElement>(null);
  const podViewRef = useRef<HTMLDivElement>(null);
  const dropRef = useRef<HTMLElement>(null);
  const dropViewRef = useRef<HTMLDivElement>(null);
  const plansRef = useRef<HTMLElement>(null);
  const plansViewRef = useRef<HTMLDivElement>(null);

  useStageLayer({ kind: "heroDive", views: [heroViewRef], section: heroRef });
  useStageLayer({ kind: "blocks", mode: "manifesto", views: [manifestoViewRef, manifestoViewMobileRef], section: manifestoRef });
  useStageLayer({ kind: "bubble", views: [podViewRef], section: podRef });
  useStageLayer({ kind: "mailbox", views: [dropViewRef], section: dropRef });
  useStageLayer({ kind: "megaphone", views: [plansViewRef], section: plansRef });

  const { scrollYProgress: heroProgress } = useScroll({ target: heroRef, offset: ["start start", "end end"] });
  const subOpacity = useTransform(heroProgress, (v) => ramp(v, 0.88, 0.95));
  const subY = useTransform(heroProgress, (v) => 24 * (1 - ramp(v, 0.88, 0.95)));

  const [activeRole, setActiveRole] = useState(0);
  const role = POD[activeRole] ?? POD[0];
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(0);

  return (
    <>
      {/* 1. Hero — the mark floods the screen, a laptop opens and the camera dives into its screen */}
      <section
        ref={heroRef}
        className="st-tone st-hero relative -mt-[76px] sm:-mt-[84px]"
        style={{ height: reduce ? "100svh" : "460svh" }}
      >
        <div ref={heroViewRef} className="sticky top-0 flex h-[100svh] flex-col items-center justify-center overflow-hidden px-6 text-center">
          {!reduce && <IntroMark progress={heroProgress} />}
          <div className="relative">
            <ScrollFlipText
              as="h1"
              text="Content that ships every week."
              progress={heroProgress}
              range={[0.8, 0.95]}
              className={`creo-display block max-w-[14ch] text-[clamp(3rem,9vw,9rem)] leading-[0.92] ${DISPLAY}`}
            />
            <motion.div style={reduce ? undefined : { opacity: subOpacity, y: subY }} className="mt-8 flex flex-col items-center gap-8">
              <p className="max-w-xl text-lg font-medium leading-relaxed text-site-mist sm:text-xl">
                A creative pod for D2C brands: a lead, editor and designer who deliver reels, carousels and stories to a portal you approve in one click.
              </p>
              <button
                type="button"
                onClick={() => manifestoRef.current && smoothScrollTo(manifestoRef.current)}
                aria-label="Scroll to how we work"
                className="flex size-14 cursor-pointer items-center justify-center rounded-full bg-[#f5eee3] text-[#2b1e15] shadow-[0_10px_30px_-10px_rgba(0,0,0,0.6)] transition-transform duration-200 hover:scale-105 active:scale-95"
              >
                <ArrowDown className="size-5" />
              </button>
            </motion.div>
          </div>
        </div>
      </section>

      {/* 2. Manifesto — sticky title, blocks build a cube that turns into coins */}
      <section ref={manifestoRef} className="st-tone st-base relative px-6 sm:px-8 lg:px-12">
        <div className="mx-auto grid max-w-[1440px] gap-x-16 lg:grid-cols-2">
          <div className="relative lg:sticky lg:top-0 lg:h-[100svh]">
            <div ref={manifestoViewRef} className="pointer-events-none absolute inset-y-0 -left-6 -right-8 hidden lg:block" />
            <div className="relative z-10 pt-28 lg:pt-[20svh]">
              <ScrollFlipText
                as="h2"
                text="Built for brands, run by people."
                className={`block max-w-xl text-[clamp(2.6rem,5vw,4.75rem)] leading-[1] ${DISPLAY}`}
              />
            </div>
            <div ref={manifestoViewMobileRef} className="pointer-events-none h-[50svh] lg:hidden" />
          </div>
          <div className="pb-24 lg:pt-[20svh] lg:pb-[35svh]">
            {PRINCIPLES.map((p) => (
              <Reveal key={p.title} className="flex flex-col justify-center py-10 lg:min-h-[75svh] lg:py-0">
                <h3 className="text-3xl font-medium tracking-[-0.03em] text-site-ink sm:text-4xl">{p.title}</h3>
                <p className="mt-6 max-w-md text-base leading-relaxed text-site-mist sm:text-lg">{p.body}</p>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* 3. The pod — who works on your brand, with a 3D speech bubble */}
      <section ref={podRef} className="st-tone st-inverse relative overflow-hidden px-6 py-28 sm:px-8 lg:px-12 lg:py-36">
        <div ref={podViewRef} className="pointer-events-none absolute right-[-12vw] top-[-2%] hidden h-[58%] w-[42vw] lg:block" />
        <div className="relative mx-auto max-w-[1440px]">
          <ScrollFlipText
            as="h2"
            text="Your pod"
            className="block text-[clamp(4.5rem,14vw,13rem)] font-medium leading-[0.85] tracking-[-0.06em] text-[var(--tone-accent)]"
          />
          <div className="mt-14 grid items-start gap-12 lg:grid-cols-12">
            <ul className="lg:col-span-4">
              {POD.map((member, i) => (
                <li key={member.role}>
                  <button
                    type="button"
                    aria-pressed={activeRole === i}
                    onClick={() => setActiveRole(i)}
                    onMouseEnter={() => setActiveRole(i)}
                    onFocus={() => setActiveRole(i)}
                    className={`w-full cursor-pointer border-b-2 py-5 text-left text-3xl font-medium tracking-[-0.03em] transition-colors duration-300 sm:text-4xl ${
                      activeRole === i ? "border-[var(--tone-accent)] text-site-ink" : "border-hi/10 text-site-mist hover:text-site-ink"
                    }`}
                  >
                    {member.role}
                  </button>
                </li>
              ))}
            </ul>

            <div className="flex justify-center lg:col-span-4">
              <div className="relative size-52 rotate-45 overflow-hidden rounded-[3rem] sm:size-64 sm:rounded-[3.5rem] lg:size-72">
                <AnimatePresence initial={false}>
                  <motion.img
                    key={role?.role}
                    src={role?.image}
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
              <p className="text-sm font-bold uppercase tracking-[0.18em] text-site-mist">About the role</p>
              <AnimatePresence mode="wait" initial={false}>
                <motion.p
                  key={role?.role}
                  initial={reduce ? false : { opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -12 }}
                  transition={{ duration: 0.35 }}
                  className="mt-4 max-w-sm text-lg leading-relaxed text-site-ink"
                >
                  {role?.about}
                </motion.p>
              </AnimatePresence>
            </div>
          </div>
        </div>
      </section>

      {/* 4. Weekly drop — a mailbox raises its flag, the batch slides out */}
      <section ref={dropRef} className="st-tone st-midnight relative overflow-hidden px-6 pt-28 pb-32 sm:px-8 lg:px-12 lg:pt-36">
        <ScrollFlipText
          as="h2"
          text="Delivered every week"
          className="relative z-10 block text-center text-[clamp(3rem,8vw,7.5rem)] font-medium leading-[0.95] tracking-[-0.05em] text-[var(--tone-accent)]"
        />
        <div className="relative mx-auto max-w-[1440px]">
          <div ref={dropViewRef} className="pointer-events-none absolute -top-[4svh] left-1/2 h-[50svh] w-[min(1100px,120vw)] -translate-x-1/2 md:-top-[12svh] md:h-[82svh]" />
          <div className="relative z-10 mx-auto grid max-w-5xl gap-14 pt-[48svh] md:grid-cols-2 md:gap-20 md:pt-[44svh]">
            {DROPS.map((drop) => (
              <Reveal key={drop.label}>
                <p className="text-sm font-bold uppercase tracking-[0.18em] text-site-mist">{drop.label}</p>
                <h3 className="mt-4 text-2xl font-medium leading-snug tracking-[-0.02em] text-site-ink sm:text-3xl">{drop.title}</h3>
                <div className="mt-8">
                  <PillLink to={drop.to}>{drop.cta}</PillLink>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* 5. Interactive approval portal */}
      <section className="st-tone st-base px-6 py-20 sm:px-8 sm:py-28 lg:px-12">
        <div className="mx-auto max-w-[1440px]">
          <SectionHeading eyebrow="Interactive client portal" title="Review and approve in one click." accent={["one", "click."]}>
            No cluttered email threads or lost Slack files. Everything arrives organized for rapid sign-off.
          </SectionHeading>
          <PortalDemo />
        </div>
      </section>

      {/* 6. Plans — a megaphone beside what every plan includes */}
      <section ref={plansRef} className="st-tone st-inverse relative overflow-hidden px-6 py-28 sm:px-8 lg:px-12 lg:py-36">
        <div className="mx-auto max-w-[1440px]">
          <ScrollFlipText
            as="h2"
            text="Plans that grow with you"
            className={`block max-w-3xl text-[clamp(2.8rem,6.5vw,6rem)] leading-[0.95] ${DISPLAY}`}
          />
          <div className="mt-12 grid gap-12 lg:grid-cols-12 lg:items-start">
            <div className="relative lg:col-span-7">
              <div ref={plansViewRef} className="pointer-events-none relative h-[40svh] w-full lg:absolute lg:-left-[7vw] lg:-top-[6svh] lg:h-[60svh] lg:w-[58%]" />
              <div className="lg:ml-[52%] lg:min-h-[50svh]">
                <p className="text-sm font-bold uppercase tracking-[0.18em] text-site-mist">Every plan includes</p>
                <ul className="mt-5 space-y-2.5">
                  {INCLUDED.map((item) => (
                    <li key={item} className="flex items-start gap-3 text-base text-site-ink">
                      <Check className="mt-1 size-4 shrink-0 text-[var(--tone-accent)]" />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
            <div className="lg:col-span-5">
              <ul className="border-t border-hi/15">
                {PLAN_ROWS.map((plan) => (
                  <li key={plan.name} className="border-b border-hi/15">
                    <Link to="/pricing" className="group flex items-center justify-between gap-6 py-6">
                      <span>
                        <span className="block text-3xl font-medium tracking-[-0.03em] text-site-ink">{plan.name}</span>
                        <span className="mt-1 block text-sm text-site-mist">{plan.turnaround}</span>
                      </span>
                      <ArrowUpRight className="size-6 text-site-ink transition-transform duration-300 group-hover:-translate-y-1 group-hover:translate-x-1" />
                    </Link>
                  </li>
                ))}
              </ul>
              <div className="mt-10">
                <PillLink to="/pricing">Compare plans</PillLink>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 7. FAQ — plain ruled rows */}
      <section className="st-tone st-base relative px-6 py-28 sm:px-8 sm:py-36 lg:px-12">
        <div className="mx-auto grid max-w-[1440px] gap-12 lg:grid-cols-12">
          <div className="lg:col-span-4">
            <ScrollFlipText as="h2" text="Common questions." className={`block text-4xl leading-[0.95] sm:text-6xl ${DISPLAY}`} />
            <Reveal delay={0.15}>
              <p className="mt-6 max-w-sm text-lg leading-relaxed text-site-mist">
                Everything you need to know about creative pods, turnaround SLAs, and deliverables.
              </p>
            </Reveal>
          </div>

          <div className="border-b border-hi/10 lg:col-span-8">
            {faqs.map((faq, idx) => {
              const isOpen = openFaqIndex === idx;
              return (
                <div key={faq.question} className="border-t border-hi/10">
                  <h3>
                    <button
                      type="button"
                      aria-expanded={isOpen}
                      aria-controls={`faq-answer-${idx}`}
                      onClick={() => setOpenFaqIndex(isOpen ? null : idx)}
                      className="group flex w-full cursor-pointer items-center justify-between gap-6 py-7 text-left"
                    >
                      <span className="text-xl font-medium leading-snug tracking-[-0.02em] text-site-ink transition-colors group-hover:text-site-blue-light sm:text-2xl">
                        {faq.question}
                      </span>
                      <motion.span
                        animate={{ rotate: isOpen ? 45 : 0 }}
                        transition={{ duration: 0.35, ease: EASE_OUT_EXPO }}
                        className={`flex size-11 shrink-0 items-center justify-center rounded-full border transition-colors ${isOpen ? "border-[#d2965a] bg-[#d2965a] text-[var(--on-brand)]" : "border-hi/15 text-site-ink"}`}
                      >
                        <Plus className="size-5" />
                      </motion.span>
                    </button>
                  </h3>
                  <AnimatePresence initial={false}>
                    {isOpen && (
                      <motion.div
                        key="answer"
                        id={`faq-answer-${idx}`}
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.45, ease: EASE_OUT_EXPO }}
                        className="overflow-hidden"
                      >
                        <div className="max-w-2xl pb-8">
                          <p className="text-base leading-relaxed text-site-mist sm:text-lg">{faq.answer}</p>
                          {faq.extra}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      <SampleCta />
    </>
  );
}
