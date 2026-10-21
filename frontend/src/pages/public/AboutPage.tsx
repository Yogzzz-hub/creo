import { useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { CountUp, DonutRing, EASE_OUT_EXPO, GrowBar, Reveal } from "../../components/motion";
import { ScrollFlipText } from "../../components/motion/ScrollFlipText";
import { DISPLAY, SampleCta } from "../../components/public/StagePieces";
import { Stage3DRoot, useStageLayer } from "../../components/stage3d/registry";

const STATS = [
  { value: "48h", label: "Average SLA turnaround" },
  { value: "99.4%", label: "On-time delivery rate" },
  { value: "1-Click", label: "Frictionless sign-off" },
];

const ERAS = [
  { era: "2018–2024", name: "The fragmented era", text: "WhatsApp, Drive, and Sheets created 7 disconnected blindspots." },
  { era: "2025", name: "The operating shift", text: "Unifying creative production, capacity heatmaps, and unit margins into one engine." },
  { era: "2026+", name: "The autonomous studio", text: "Predictive pod resourcing and automated margin recovery across 52+ agencies." },
];

const PAST_PAINS = [
  { title: "Lost scope", detail: "Clients scattered across WhatsApp & Email" },
  { title: "48-hour approval lags", detail: "Projects lost in Google Sheets & Notion" },
  { title: "Unbilled extra revisions", detail: "Assets messy in Drive folders & broken links" },
  { title: "Zero margin visibility", detail: "Manual spreadsheets & blind billing" },
];

const CREO_WINS = [
  { title: "Unified client dossiers", detail: "All client data, communications & history" },
  { title: "Utilization-linked sprints", detail: "Right people. Right work. Every time" },
  { title: "1-click client portal approvals", detail: "Faster sign-offs. Happier clients" },
  { title: "Real-time unit economics", detail: "Know your numbers. Grow smarter" },
];

const MILESTONES = ["Lead", "Onboard", "Brief", "Production", "Review", "Report"];

const MARGINS = [
  { name: "Astra Living", value: 41.25, label: "41.25%" },
  { name: "Urban Bakes", value: 38, label: "38%" },
  { name: "Pulse Mobility", value: 44, label: "44%" },
];

const PODS = [
  { initials: "CA", name: "Core Architecture Pod", role: "Runtime & State Engine", text: "Specialized team maintaining low-latency review pipelines, real-time sync, and SLA automation logic." },
  { initials: "SP", name: "Systems Pod", role: "Head of Product & Architecture", text: "Bridging creative workflows with scalable engineering to build the unified OS." },
  { initials: "IE", name: "Agency Engineering Pod", role: "Lead Infrastructure Engineer", text: "Building the real-time financial and telemetry pipelines for 50+ agencies." },
];

const WELL = "rounded-2xl border border-hi/[0.08] bg-site-bg/50";

/** Check mark whose tick and ring draw in when scrolled into view */
function DrawnCheck({ delay = 0 }: { delay?: number }) {
  const reduce = useReducedMotion();
  return (
    <svg className="mt-1 size-6 shrink-0 text-[var(--tone-accent)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.2" aria-hidden="true">
      <motion.circle
        cx="12"
        cy="12"
        r="9"
        strokeOpacity="0.45"
        initial={reduce ? false : { pathLength: 0 }}
        whileInView={{ pathLength: 1 }}
        viewport={{ once: true }}
        transition={{ duration: 0.8, delay, ease: EASE_OUT_EXPO }}
      />
      <motion.path
        d="M8.5 12.5l2.4 2.4 4.6-5"
        strokeLinecap="round"
        strokeLinejoin="round"
        initial={reduce ? false : { pathLength: 0 }}
        whileInView={{ pathLength: 1 }}
        viewport={{ once: true }}
        transition={{ duration: 0.6, delay: delay + 0.35, ease: EASE_OUT_EXPO }}
      />
    </svg>
  );
}

export function AboutPage() {
  return (
    <Stage3DRoot>
      <AboutContent />
    </Stage3DRoot>
  );
}

function AboutContent() {
  const heroRef = useRef<HTMLElement>(null);
  const heroViewRef = useRef<HTMLDivElement>(null);
  const storyRef = useRef<HTMLElement>(null);
  const storyViewRef = useRef<HTMLDivElement>(null);
  const storyViewMobileRef = useRef<HTMLDivElement>(null);
  const peopleRef = useRef<HTMLElement>(null);
  const peopleViewRef = useRef<HTMLDivElement>(null);

  useStageLayer({ kind: "chromeMark", drive: "progress", views: [heroViewRef], section: heroRef });
  useStageLayer({ kind: "blocks", mode: "assemble", views: [storyViewRef, storyViewMobileRef], section: storyRef });
  useStageLayer({ kind: "bubble", views: [peopleViewRef], section: peopleRef });

  const [showDonutTooltip, setShowDonutTooltip] = useState(false);
  const [activeMilestone, setActiveMilestone] = useState(0);
  const [activePod, setActivePod] = useState(0);
  const pod = PODS[activePod] ?? PODS[0];

  return (
    <>
      {/* 1. Hero — the chrome "c." turning as you scroll */}
      <section ref={heroRef} className="st-tone st-hero relative -mt-[76px] h-[220svh] sm:-mt-[84px]">
        <div className="sticky top-0 flex h-[100svh] flex-col justify-between overflow-hidden px-6 pb-10 pt-[calc(76px+9svh)] sm:px-8 sm:pt-[calc(84px+10svh)] lg:px-12">
          {/* The chrome mark turns in the right half beside the headline; on phones, in the gap above the stats */}
          <div
            ref={heroViewRef}
            className="pointer-events-none absolute inset-x-0 bottom-[16%] h-[26%] lg:top-0 lg:bottom-0 lg:left-auto lg:h-auto lg:w-[50%]"
          />
          <div className="relative z-10 mx-auto w-full max-w-[1240px]">
            <p className="text-sm font-bold uppercase tracking-[0.18em] text-site-mist">Our mission & origin</p>
            <ScrollFlipText
              as="h1"
              playOnMount
              delay={0.2}
              text="Built by agency leaders who refused to accept the chaos."
              className={`creo-display mt-6 block max-w-[13ch] text-[clamp(2.6rem,5.5vw,5.5rem)] leading-[0.95] ${DISPLAY}`}
            />
            <Reveal delay={0.6}>
              <p className="mt-6 max-w-xl text-base leading-relaxed text-site-mist sm:text-lg">
                Creative work should be boundless. Agency operations should be mathematical. We built CREO to replace WhatsApp chasing, lost briefs, and blind margins with a single connected operating system.
              </p>
            </Reveal>
          </div>
          <dl className="relative z-10 mx-auto grid w-full max-w-[1240px] grid-cols-3 gap-4 border-t border-hi/20 pt-6">
            {STATS.map((stat) => (
              <div key={stat.label}>
                <dd>
                  <CountUp value={stat.value} className="text-3xl font-medium tracking-[-0.04em] text-site-ink sm:text-5xl" />
                </dd>
                <dt className="mt-2 text-xs text-site-mist sm:text-sm">{stat.label}</dt>
              </div>
            ))}
          </dl>
        </div>
      </section>

      {/* 2. Why CREO exists — scattered blocks come together as the story turns */}
      <section ref={storyRef} className="st-tone st-base relative px-6 sm:px-8 lg:px-12">
        <div className="mx-auto grid max-w-[1240px] gap-x-16 lg:grid-cols-2">
          <div className="relative lg:sticky lg:top-0 lg:h-[100svh]">
            <div ref={storyViewRef} className="pointer-events-none absolute inset-y-0 -left-6 -right-8 hidden lg:block" />
            <div className="relative z-10 pt-28 lg:pt-[18svh]">
              <ScrollFlipText as="h2" text="Why CREO exists." className={`block text-[clamp(2.6rem,5vw,4.75rem)] leading-[1] ${DISPLAY}`} />
              <p className="mt-6 max-w-md text-lg leading-relaxed text-site-mist">
                Before CREO, running an agency meant gluing together 7 disconnected tools.
              </p>
            </div>
            <div ref={storyViewMobileRef} className="pointer-events-none h-[46svh] lg:hidden" />
          </div>

          <div className="pb-24 lg:pb-[30svh] lg:pt-[18svh]">
            <Reveal className="lg:min-h-[45svh]">
              <p className="text-sm font-bold uppercase tracking-[0.18em] text-site-mist">The past</p>
              <h3 className="mt-4 text-3xl font-medium tracking-[-0.03em] text-site-ink sm:text-4xl">Disconnected tools. Lost time. Real money.</h3>
            </Reveal>
            <ul className="border-t border-hi/10">
              {PAST_PAINS.map((pain) => (
                <Reveal key={pain.title} as="li" className="flex items-start gap-4 border-b border-hi/10 py-7">
                  <span className="mt-1 flex size-6 shrink-0 items-center justify-center rounded-full border border-hi/25 text-xs font-bold text-site-mist">!</span>
                  <span>
                    <span className="block text-xl font-medium text-site-ink">{pain.title}</span>
                    <span className="mt-1 block text-base text-site-mist">{pain.detail}</span>
                  </span>
                </Reveal>
              ))}
            </ul>

            <Reveal className="flex flex-col justify-center py-24 lg:min-h-[60svh]">
              <p className="text-sm font-bold uppercase tracking-[0.18em] text-[var(--tone-accent)]">The CREO shift</p>
              <h3 className="mt-4 text-4xl font-medium leading-[1.05] tracking-[-0.04em] text-site-ink sm:text-5xl">One unified workflow. Total visibility.</h3>
            </Reveal>

            <ul className="border-t border-hi/10">
              {CREO_WINS.map((win, i) => (
                <Reveal key={win.title} as="li" className="flex items-start gap-4 border-b border-hi/10 py-7">
                  <DrawnCheck delay={i * 0.1} />
                  <span>
                    <span className="block text-xl font-medium text-site-ink">{win.title}</span>
                    <span className="mt-1 block text-base text-site-mist">{win.detail}</span>
                  </span>
                </Reveal>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* 3. Eras — a ruled timeline */}
      <section className="st-tone st-midnight px-6 py-24 sm:px-8 sm:py-32 lg:px-12">
        <div className="mx-auto max-w-[1240px]">
          <ScrollFlipText as="h2" text="From chaos to an autonomous studio." className={`block max-w-4xl text-[clamp(2.6rem,5.5vw,5rem)] leading-[0.98] ${DISPLAY}`} />
          <ol className="mt-14 border-t-2 border-hi/80">
            {ERAS.map((era, i) => (
              <Reveal key={era.era} as="li" delay={i * 0.08} className="grid gap-3 border-b border-hi/15 py-8 md:grid-cols-12 md:items-baseline">
                <span className="font-mono text-sm text-[var(--tone-accent)] md:col-span-2">{era.era}</span>
                <span className="text-3xl font-medium tracking-[-0.03em] text-site-ink md:col-span-4">{era.name}</span>
                <span className="text-lg leading-relaxed text-site-mist md:col-span-6">{era.text}</span>
              </Reveal>
            ))}
          </ol>
        </div>
      </section>

      {/* 4. Three principles, each with a working detail */}
      <section className="st-tone st-base px-6 py-24 sm:px-8 sm:py-32 lg:px-12">
        <div className="mx-auto max-w-[1240px]">
          <ScrollFlipText as="h2" text="Three principles that run every modern agency." className={`block max-w-4xl text-[clamp(2.6rem,5.5vw,5rem)] leading-[0.98] ${DISPLAY}`} />
          <div className="mt-14 grid gap-12 lg:grid-cols-3 lg:gap-10">
            {/* People */}
            <Reveal className="flex flex-col border-t-2 border-hi/80 pt-6">
              <p className="text-sm font-bold uppercase tracking-[0.18em] text-[var(--tone-accent)]">People</p>
              <h3 className="mt-4 text-3xl font-medium tracking-[-0.03em] text-site-ink">Utilization without burnout</h3>
              <p className="mt-4 flex-1 text-base leading-relaxed text-site-mist">
                Real-time capacity planning that balances creative energy with business goals — no more spreadsheet guesswork.
              </p>
              <div className={`${WELL} mt-8 flex items-center gap-4 p-4`}>
                <button
                  type="button"
                  aria-label="Billable 82%, non-billable 18%"
                  className="relative cursor-pointer"
                  onMouseEnter={() => setShowDonutTooltip(true)}
                  onMouseLeave={() => setShowDonutTooltip(false)}
                  onFocus={() => setShowDonutTooltip(true)}
                  onBlur={() => setShowDonutTooltip(false)}
                >
                  <DonutRing value={82} size={64}>
                    <span className="text-sm font-black text-site-ink">82%</span>
                  </DonutRing>
                  {showDonutTooltip && (
                    <motion.div
                      initial={{ opacity: 0, y: 6, scale: 0.96 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      className="creo-glass-strong absolute -top-14 left-1/2 z-20 -translate-x-1/2 whitespace-nowrap rounded-xl px-3 py-1.5 text-left text-[10px]"
                    >
                      <div className="mb-0.5 text-site-ink">
                        Billable: <span className="font-bold text-site-peri">82%</span>
                      </div>
                      <div className="text-site-mist">
                        Non-billable: <span className="font-bold">18%</span>
                      </div>
                    </motion.div>
                  )}
                </button>
                <span className="text-sm text-site-mist">Billable time across every pod, live.</span>
              </div>
            </Reveal>

            {/* Process */}
            <Reveal delay={0.1} className="flex flex-col border-t-2 border-hi/80 pt-6">
              <p className="text-sm font-bold uppercase tracking-[0.18em] text-[var(--tone-accent)]">Process</p>
              <h3 className="mt-4 text-3xl font-medium tracking-[-0.03em] text-site-ink">Six milestones. Zero handoff friction.</h3>
              <p className="mt-4 flex-1 text-base leading-relaxed text-site-mist">
                Linear end-to-end workflows from brief to 1-click client sign-off with automated SLA timers.
              </p>
              <div className={`${WELL} mt-8 p-4`}>
                <div className="grid grid-cols-3 gap-2">
                  {MILESTONES.map((label, i) => (
                    <button
                      key={label}
                      type="button"
                      aria-pressed={activeMilestone === i}
                      onClick={() => setActiveMilestone(i)}
                      className={`min-h-11 cursor-pointer rounded-full border px-2 text-xs font-semibold transition-colors ${
                        activeMilestone === i
                          ? "border-[var(--site-blue-deep)] bg-[var(--site-blue-deep)] text-[var(--on-brand)]"
                          : i < activeMilestone
                            ? "border-[var(--site-blue-deep)] text-site-ink"
                            : "border-hi/15 text-site-mist hover:text-site-ink"
                      }`}
                    >
                      {String(i + 1).padStart(2, "0")} {label}
                    </button>
                  ))}
                </div>
                <div className="mt-4 h-1 overflow-hidden rounded-full bg-hi/10">
                  <motion.div
                    className="h-full rounded-full bg-[var(--site-blue-deep)]"
                    animate={{ width: `${((activeMilestone + 1) / MILESTONES.length) * 100}%` }}
                    transition={{ duration: 0.6, ease: EASE_OUT_EXPO }}
                  />
                </div>
                <p className="mt-3 text-xs font-semibold text-site-mist">⚡ SLA 2.4h average</p>
              </div>
            </Reveal>

            {/* Performance */}
            <Reveal delay={0.2} className="flex flex-col border-t-2 border-hi/80 pt-6">
              <p className="text-sm font-bold uppercase tracking-[0.18em] text-[var(--tone-accent)]">Performance</p>
              <h3 className="mt-4 text-3xl font-medium tracking-[-0.03em] text-site-ink">Profitability as a creative input.</h3>
              <p className="mt-4 flex-1 text-base leading-relaxed text-site-mist">Real-time contribution margins on every retainer before month-end panic.</p>
              <div className={`${WELL} mt-8 space-y-4 p-4`}>
                {MARGINS.map((row, i) => (
                  <div key={row.name}>
                    <div className="mb-1.5 flex justify-between text-xs font-bold text-site-ink">
                      <span>{row.name}</span>
                      <span>{row.label}</span>
                    </div>
                    <div className="h-2 w-full overflow-hidden rounded-full bg-hi/[0.08]">
                      <GrowBar value={row.value} delay={i * 0.12} className="bg-[var(--site-blue-deep)]" />
                    </div>
                  </div>
                ))}
              </div>
            </Reveal>
          </div>
        </div>
      </section>

      {/* 5. The people — pods, with a speech bubble */}
      <section ref={peopleRef} className="st-tone st-inverse relative overflow-hidden px-6 py-24 sm:px-8 sm:py-32 lg:px-12">
        <div ref={peopleViewRef} className="pointer-events-none absolute right-[-10vw] top-[2%] hidden h-[56%] w-[40vw] lg:block" />
        <div className="relative mx-auto max-w-[1240px]">
          <ScrollFlipText
            as="h2"
            text="The team"
            className="block text-[clamp(4.5rem,13vw,12rem)] font-medium leading-[0.85] tracking-[-0.06em] text-[var(--tone-accent)]"
          />
          <p className="mt-6 max-w-xl text-lg leading-relaxed text-site-mist">The pods engineering the operating layer.</p>
          <div className="mt-14 grid items-start gap-12 lg:grid-cols-12">
            <ul className="lg:col-span-5">
              {PODS.map((item, i) => (
                <li key={item.name}>
                  <button
                    type="button"
                    aria-pressed={activePod === i}
                    onClick={() => setActivePod(i)}
                    onMouseEnter={() => setActivePod(i)}
                    onFocus={() => setActivePod(i)}
                    className={`w-full cursor-pointer border-b-2 py-5 text-left text-2xl font-medium tracking-[-0.03em] transition-colors duration-300 sm:text-3xl ${
                      activePod === i ? "border-[var(--tone-accent)] text-site-ink" : "border-hi/10 text-site-mist hover:text-site-ink"
                    }`}
                  >
                    {item.name}
                  </button>
                </li>
              ))}
            </ul>
            <div className="flex items-center gap-8 lg:col-span-7 lg:pl-8">
              <AnimatePresence mode="wait" initial={false}>
                <motion.div
                  key={pod?.name}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -12 }}
                  transition={{ duration: 0.35 }}
                  className="flex items-start gap-6"
                >
                  <span className="mx-4 flex size-20 shrink-0 rotate-45 items-center justify-center rounded-[1.5rem] bg-[var(--site-blue-deep)] sm:mx-0 sm:size-28 sm:rounded-[1.75rem]">
                    <span className="-rotate-45 text-2xl font-black text-[var(--on-brand)]">{pod?.initials}</span>
                  </span>
                  <span>
                    <span className="block text-sm font-bold uppercase tracking-[0.18em] text-site-mist">{pod?.role}</span>
                    <span className="mt-3 block max-w-md text-lg leading-relaxed text-site-ink">{pod?.text}</span>
                  </span>
                </motion.div>
              </AnimatePresence>
            </div>
          </div>
        </div>
      </section>

      <SampleCta />
    </>
  );
}
