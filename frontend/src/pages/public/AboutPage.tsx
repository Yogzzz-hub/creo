import { useState } from "react";
import { motion, useReducedMotion } from "motion/react";
import {
  CountUp,
  DonutRing,
  EASE_OUT_EXPO,
  GrowBar,
  Reveal,
  ScrollMask,
  Stagger,
  StaggerItem,
  TiltCard,
} from "../../components/motion";
import { PageHero, SectionHeading } from "../../components/public/PageBlocks";
import {
  MessageSquare,
  AlertCircle, ChevronRight, BarChart3, FileSpreadsheet, HardDrive,
} from "lucide-react";

const STATS = [
  { value: "48h", label: "Average SLA Turnaround", count: true },
  { value: "99.4%", label: "On-Time Delivery Rate", count: true },
  { value: "1-Click", label: "Frictionless Sign-Off", count: false },
];

const ERAS = [
  { era: "The Fragmented Era (2018–2024)", text: "WhatsApp, Drive, and Sheets created 7 disconnected blindspots.", tone: "text-site-mist" },
  { era: "The Operating Shift (2025)", text: "Unifying creative production, capacity heatmaps, and unit margins into one engine.", tone: "text-site-ink font-medium" },
  { era: "The Autonomous Studio (2026+)", text: "Predictive pod resourcing and automated margin recovery across 52+ agencies.", tone: "text-site-peri font-bold" },
];

const PAST_PAINS = [
  { title: "Lost scope", detail: "Clients scattered across WhatsApp & Email" },
  { title: "48-hour approval lags", detail: "Projects lost in Google Sheets & Notion" },
  { title: "Unbilled extra revisions", detail: "Assets messy in Drive folders & broken links" },
  { title: "Zero margin visibility", detail: "Manual spreadsheets & blind billing" },
];

const CREO_WINS = [
  { title: "Unified Client Dossiers", detail: "All client data, communications & history" },
  { title: "Utilization-Linked Sprints", detail: "Right people. Right work. Every time" },
  { title: "1-Click Client Portal Approvals", detail: "Faster sign-offs. Happier clients" },
  { title: "Real-Time Unit Economics", detail: "Know your numbers. Grow smarter" },
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

/** Check mark whose tick and ring draw in when scrolled into view */
function DrawnCheck({ delay = 0 }: { delay?: number }) {
  const reduce = useReducedMotion();
  return (
    <svg className="mt-0.5 size-5 shrink-0 text-site-blue-light" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.2" aria-hidden="true">
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
  const reduce = useReducedMotion();
  const [hoverSection, setHoverSection] = useState<"past" | "creo" | null>(null);
  const [showDonutTooltip, setShowDonutTooltip] = useState(false);
  const [activeMilestone, setActiveMilestone] = useState("01");
  const activeIndex = Number(activeMilestone) - 1;

  return (
    <div className="min-h-screen w-full pb-16 font-sans text-site-ink lg:pb-20">
      {/* ── Hero ── */}
      <PageHero
        eyebrow="Our mission & origin"
        title="Built by agency leaders who refused to accept the chaos."
        accent={["the", "chaos."]}
        lead="Creative work should be boundless. Agency operations should be mathematical. We built CREO to replace WhatsApp chasing, lost briefs, and blind margins with a single connected operating system."
        aside={
          <TiltCard max={6} glow="rgba(125,162,255,0.16)" className="creo-glass creo-beam flex flex-col gap-6 overflow-hidden rounded-3xl p-5 sm:p-7">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-hi/[0.08] pb-4">
              <div className="text-sm font-black tracking-tight text-site-ink">CREO Kernel v2.6 &bull; Architecture Blueprint</div>
              <div className="flex items-center gap-2 text-xs font-semibold text-site-peri">
                <span className="relative flex size-2 items-center justify-center">
                  <span className="absolute inset-0 animate-ping rounded-full bg-site-blue opacity-40" />
                  <span className="relative size-1.5 rounded-full bg-site-blue-light" />
                </span>
                System Status: Autonomous Ops
              </div>
            </div>

            <div className="relative space-y-3">
              {/* Timeline spine */}
              <div aria-hidden="true" className="absolute bottom-4 left-[11px] top-4 w-px bg-gradient-to-b from-site-blue/10 via-site-blue/50 to-site-sky/60" />
              {ERAS.map((item, i) => (
                <motion.div
                  key={item.era}
                  initial={reduce ? false : { opacity: 0, x: 18 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.8, delay: 0.7 + i * 0.15, ease: EASE_OUT_EXPO }}
                  className="relative flex gap-4"
                >
                  <span className={`relative z-10 mt-4 flex size-[23px] shrink-0 items-center justify-center rounded-full ring-1 ring-inset ${i === 2 ? "bg-site-blue/25 ring-site-blue-light/70" : "bg-site-bg ring-hi/15"}`}>
                    <span className={`size-1.5 rounded-full ${i === 2 ? "bg-site-ice shadow-[0_0_8px_2px_rgba(79,123,255,0.8)]" : "bg-site-blue/70"}`} />
                  </span>
                  <div className="flex-1 space-y-1 rounded-xl border border-hi/[0.07] bg-site-bg/50 p-4">
                    <div className="text-[10px] font-bold uppercase tracking-[0.14em] text-site-mist">{item.era}</div>
                    <div className={`text-xs ${item.tone}`}>{item.text}</div>
                  </div>
                </motion.div>
              ))}
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2 border-t border-hi/[0.08] pt-4 text-[10px] font-medium text-site-mist">
              <div>Engineered in Bengaluru &bull; Deployed Globally</div>
              <div className="flex items-center gap-1.5">
                <span className="size-1.5 rounded-full bg-site-blue-light" /> Live Latency: 24ms
              </div>
            </div>
          </TiltCard>
        }
      >
        <Stagger className="grid grid-cols-1 gap-3.5 sm:grid-cols-3" delay={0.55} gap={0.1}>
          {STATS.map((stat) => (
            <StaggerItem
              key={stat.label}
              className="creo-glass group relative flex flex-col justify-center rounded-2xl px-5 py-4 transition-shadow duration-500 hover:shadow-[0_20px_50px_-24px_rgba(59,107,255,0.8)]"
            >
              <span className="absolute right-4 top-4 flex size-1.5 items-center justify-center">
                <span className="absolute inset-0 animate-ping rounded-full bg-site-blue opacity-40" />
                <span className="relative size-1.5 rounded-full bg-site-blue-light" />
              </span>
              {stat.count ? (
                <CountUp value={stat.value} className="mb-1.5 block text-2xl font-black leading-none tracking-tight text-site-ink" />
              ) : (
                <div className="mb-1.5 text-2xl font-black leading-none tracking-tight text-site-ink">{stat.value}</div>
              )}
              <div className="text-[11px] font-semibold uppercase tracking-[0.1em] text-site-mist">{stat.label}</div>
            </StaggerItem>
          ))}
        </Stagger>
      </PageHero>

      {/* ── Why CREO exists ── */}
      <ScrollMask inset={5} radius={48} background="bg-gradient-to-b from-site-deep to-site-deep">
        <section className="relative py-20 sm:py-28">
          <div aria-hidden="true" className="creo-grid-bg absolute inset-0 opacity-70 [mask-image:radial-gradient(60%_50%_at_50%_0%,#000,transparent)]" />
          <div className="relative mx-auto max-w-[1240px] px-6 sm:px-8 lg:px-12">
            <SectionHeading
              eyebrow="The origin story"
              title="Why CREO Exists: Breaking the 7 Fragmented Silos."
              accent={["7", "Fragmented", "Silos."]}
            >
              Before CREO, running an agency meant gluing together 7 disconnected tools.
            </SectionHeading>

            <div className="relative grid grid-cols-1 items-center gap-8 lg:grid-cols-[1fr_auto_1fr]">
              {/* Glowing connector behind the shift node */}
              <div aria-hidden="true" className="pointer-events-none absolute inset-x-[10%] top-1/2 hidden h-px -translate-y-1/2 lg:block">
                <div className="h-full w-full bg-gradient-to-r from-site-sky/0 via-site-blue/50 to-site-blue/0" />
                <motion.div
                  className="absolute top-1/2 h-[3px] w-24 -translate-y-1/2 rounded-full bg-gradient-to-r from-transparent via-site-ice to-transparent"
                  animate={reduce ? undefined : { left: ["0%", "100%"] }}
                  transition={{ duration: 3.2, repeat: Number.POSITIVE_INFINITY, ease: "easeInOut" }}
                />
              </div>

              {/* The past */}
              <Reveal direction="right">
                <div
                  className={`creo-glass relative rounded-3xl p-5 transition-shadow duration-500 sm:p-7 lg:p-8 ${
                    hoverSection === "past" ? "shadow-[0_0_0_1px_rgba(125,211,252,0.35),0_30px_70px_-30px_rgba(125,211,252,0.35)]" : ""
                  }`}
                  onMouseEnter={() => setHoverSection("past")}
                  onMouseLeave={() => setHoverSection(null)}
                >
                  <div className="mb-2 flex items-center gap-3">
                    <AlertCircle className="size-5 text-site-sky" />
                    <h3 className="text-base font-bold text-site-ink">
                      The Past / <span className="text-site-sky">Chaos</span>
                    </h3>
                  </div>
                  <p className="mb-8 border-b border-hi/[0.08] pb-4 text-sm leading-relaxed text-site-mist">
                    Disconnected tools. Lost time. Real money.
                  </p>

                  <div className="mb-8 flex flex-wrap gap-4">
                    {[MessageSquare, FileSpreadsheet, HardDrive, null].map((Icon, i) => (
                      <motion.div
                        // biome-ignore lint/suspicious/noArrayIndexKey: fixed decorative set
                        key={i}
                        animate={reduce ? undefined : { y: [0, -4, 0], rotate: [0, i % 2 ? 3 : -3, 0] }}
                        transition={{ duration: 2.6 + i * 0.4, repeat: Number.POSITIVE_INFINITY, ease: "easeInOut" }}
                        className="relative flex size-12 items-center justify-center rounded-xl border border-hi/[0.08] bg-site-bg/60 text-site-mist"
                      >
                        {Icon ? <Icon className="size-6" /> : <span className="font-serif text-lg font-bold">N</span>}
                        <span className="absolute -right-1.5 -top-1.5 flex size-4 items-center justify-center rounded-full border border-site-sky/30 bg-site-sky/15 text-[10px] font-bold text-site-sky">
                          !
                        </span>
                      </motion.div>
                    ))}
                  </div>

                  <Stagger className="space-y-4" gap={0.08}>
                    {PAST_PAINS.map((pain) => (
                      <StaggerItem key={pain.title} className="flex items-center gap-3">
                        <div className="flex size-5 shrink-0 items-center justify-center rounded-full border border-site-sky/30 bg-site-sky/10 text-xs font-bold text-site-sky">
                          !
                        </div>
                        <div>
                          <div className="text-sm font-bold text-site-ink">{pain.title}</div>
                          <div className="text-xs text-site-mist">{pain.detail}</div>
                        </div>
                      </StaggerItem>
                    ))}
                  </Stagger>
                </div>
              </Reveal>

              {/* The shift */}
              <div className="relative z-10 flex justify-center">
                <div
                  className={`relative flex size-16 items-center justify-center rounded-full text-center text-[9px] font-bold leading-tight tracking-[0.08em] transition-all duration-500 ${
                    hoverSection
                      ? "bg-site-blue/20 text-hi shadow-[0_0_0_1px_rgba(125,162,255,0.8),0_0_40px_6px_rgba(79,123,255,0.45)]"
                      : "bg-site-deep text-site-mist-2 shadow-[0_0_0_1px_rgba(79,123,255,0.35)]"
                  }`}
                >
                  {!reduce && <span className="absolute inset-0 animate-ping rounded-full border border-site-blue/40" />}
                  THE
                  <br />
                  CREO
                  <br />
                  SHIFT
                </div>
              </div>

              {/* The CREO advantage */}
              <Reveal direction="left">
                <div
                  className={`creo-glass creo-beam relative overflow-hidden rounded-3xl p-5 transition-shadow duration-500 sm:p-7 lg:p-8 ${
                    hoverSection === "creo" ? "shadow-[0_0_0_1px_rgba(79,123,255,0.55),0_30px_80px_-30px_rgba(59,107,255,0.7)]" : ""
                  }`}
                  onMouseEnter={() => setHoverSection("creo")}
                  onMouseLeave={() => setHoverSection(null)}
                >
                  <div className="mb-2 flex items-center gap-3">
                    <BarChart3 className="size-5 text-site-blue-light" />
                    <h3 className="text-base font-bold text-site-ink">
                      The CREO Advantage / <span className="creo-text-gradient">Precision</span>
                    </h3>
                  </div>
                  <p className="mb-8 border-b border-hi/[0.08] pb-4 text-sm leading-relaxed text-site-mist">
                    One unified workflow. Total visibility.
                  </p>

                  <div className="mb-8 space-y-5">
                    {CREO_WINS.map((win, i) => (
                      <div key={win.title} className="flex items-start gap-3">
                        <DrawnCheck delay={i * 0.15} />
                        <div>
                          <div className="text-sm font-bold text-site-ink">{win.title}</div>
                          <div className="text-xs text-site-mist">{win.detail}</div>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="flex items-center justify-between gap-4 rounded-2xl border border-hi/[0.07] bg-site-bg/50 p-4">
                    <div>
                      <div className="mb-2 text-[10px] font-bold uppercase tracking-[0.12em] text-site-mist">Astra Living — Retainer Margin</div>
                      <DonutRing value={41.25} size={56}>
                        <span className="text-[10px] font-black text-site-ink">41.25%</span>
                      </DonutRing>
                    </div>
                    <div className="relative flex h-14 w-36 flex-col items-end justify-end">
                      <span className="absolute top-0 text-[9px] text-site-mist">Verified Margin</span>
                      <svg className="h-10 w-full overflow-visible" viewBox="0 0 100 40" preserveAspectRatio="none" aria-hidden="true">
                        <motion.path
                          d="M0,35 L10,32 L20,34 L30,28 L40,30 L50,22 L60,25 L70,18 L80,20 L90,10 L100,5"
                          fill="none"
                          stroke="var(--site-blue-light)"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          vectorEffect="non-scaling-stroke"
                          initial={reduce ? false : { pathLength: 0 }}
                          whileInView={{ pathLength: 1 }}
                          viewport={{ once: true }}
                          transition={{ duration: 1.8, ease: EASE_OUT_EXPO }}
                        />
                      </svg>
                    </div>
                  </div>
                </div>
              </Reveal>
            </div>
          </div>
        </section>
      </ScrollMask>

      {/* ── Three principles ── */}
      <section className="mx-auto max-w-[1240px] px-6 py-20 sm:px-8 sm:py-28 lg:px-12">
        <SectionHeading eyebrow="Our core philosophy" title="Three principles that run every modern agency." accent={["principles"]} />

        <Stagger className="grid grid-cols-1 gap-6 lg:grid-cols-3" gap={0.12}>
          {/* People */}
          <StaggerItem className="h-full">
            <TiltCard max={6} glow="rgba(125,162,255,0.14)" className="creo-glass flex h-full flex-col rounded-3xl p-5 sm:p-7 lg:p-8">
              <span className="mb-6 w-fit rounded-full border border-site-blue/30 bg-site-blue/10 px-3 py-1 text-[10px] font-bold tracking-[0.16em] text-site-peri">PEOPLE</span>
              <h3 className="mb-2 text-lg font-bold tracking-[-0.01em] text-site-ink">Utilization Without Burnout</h3>
              <p className="mb-8 flex-1 text-sm leading-relaxed text-site-mist">
                Real-time capacity planning that balances creative energy with business goals — no more spreadsheet guesswork.
              </p>
              <div className="flex items-center gap-4 rounded-2xl border border-hi/[0.07] bg-site-bg/50 p-4">
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
                <div className="flex flex-1 justify-end">
                  <div className="flex -space-x-2">
                    <img src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&q=80" alt="" className="size-8 rounded-full border-2 border-site-deep object-cover" />
                    <img src="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&q=80" alt="" className="size-8 rounded-full border-2 border-site-deep object-cover" />
                    <img src="https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&q=80" alt="" className="size-8 rounded-full border-2 border-site-deep object-cover" />
                    <div className="flex size-8 items-center justify-center rounded-full border-2 border-site-deep bg-site-blue/25 text-[10px] font-bold text-site-ink">+12</div>
                  </div>
                </div>
              </div>
            </TiltCard>
          </StaggerItem>

          {/* Process */}
          <StaggerItem className="h-full">
            <TiltCard max={6} glow="rgba(125,162,255,0.14)" className="creo-glass flex h-full flex-col rounded-3xl p-5 sm:p-7 lg:p-8">
              <span className="mb-6 w-fit rounded-full border border-site-blue/30 bg-site-blue/10 px-3 py-1 text-[10px] font-bold tracking-[0.16em] text-site-peri">PROCESS</span>
              <h3 className="mb-2 text-lg font-bold tracking-[-0.01em] text-site-ink">Six Milestones. Zero Handoff Friction.</h3>
              <p className="mb-8 flex-1 text-sm leading-relaxed text-site-mist">
                Linear end-to-end workflows from brief to 1-click client sign-off with automated SLA timers.
              </p>
              <div className="rounded-2xl border border-hi/[0.07] bg-site-bg/50 p-5">
                <div className="relative grid grid-cols-3 gap-x-2 gap-y-5 xl:flex xl:justify-between">
                  {/* Track + fill up to the selected milestone */}
                  <div aria-hidden="true" className="absolute left-4 right-4 top-3.5 hidden h-px bg-hi/10 xl:block" />
                  <motion.div
                    aria-hidden="true"
                    className="absolute left-4 top-3.5 hidden h-px origin-left bg-gradient-to-r from-site-blue-deep to-site-sky xl:block"
                    style={{ right: "1rem" }}
                    animate={{ scaleX: activeIndex / (MILESTONES.length - 1) }}
                    transition={{ duration: 0.6, ease: EASE_OUT_EXPO }}
                  />
                  {MILESTONES.map((label, i) => {
                    const step = String(i + 1).padStart(2, "0");
                    const isActive = activeMilestone === step;
                    const isDone = i < activeIndex;
                    return (
                      <button
                        type="button"
                        key={step}
                        aria-pressed={isActive}
                        className="z-10 flex min-h-11 cursor-pointer flex-col items-center gap-2 sm:gap-3"
                        onClick={() => setActiveMilestone(step)}
                      >
                        <span className="relative flex size-7 items-center justify-center rounded-full text-[11px] font-bold">
                          {isActive && (
                            <motion.span
                              layoutId="about-milestone"
                              className="absolute inset-0 rounded-full bg-gradient-to-br from-site-blue to-site-blue-deep shadow-[0_0_14px_2px_rgba(79,123,255,0.6)]"
                              transition={{ type: "spring", stiffness: 420, damping: 32 }}
                            />
                          )}
                          <span
                            className={`relative flex size-7 items-center justify-center rounded-full border transition-colors duration-300 ${
                              isActive
                                ? "border-transparent text-hi"
                                : isDone
                                  ? "border-site-blue/60 bg-site-bg text-site-peri"
                                  : "border-hi/15 bg-site-bg text-site-mist"
                            }`}
                          >
                            {step}
                          </span>
                        </span>
                        <span className={`whitespace-nowrap text-center text-[10px] font-medium sm:text-[11px] ${isActive ? "text-site-ink" : "text-site-mist"}`}>
                          {label}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
              <span className="mt-4 inline-flex w-fit items-center gap-1.5 rounded-full border border-site-blue/30 bg-site-blue/10 px-3 py-1 text-xs font-semibold text-site-peri">
                ⚡ SLA 2.4h avg
              </span>
            </TiltCard>
          </StaggerItem>

          {/* Performance */}
          <StaggerItem className="h-full">
            <TiltCard max={6} glow="rgba(125,162,255,0.14)" className="creo-glass flex h-full flex-col rounded-3xl p-5 sm:p-7 lg:p-8">
              <span className="mb-6 w-fit rounded-full border border-site-blue/30 bg-site-blue/10 px-3 py-1 text-[10px] font-bold tracking-[0.16em] text-site-peri">PERFORMANCE</span>
              <h3 className="mb-2 text-lg font-bold tracking-[-0.01em] text-site-ink">Profitability as a Creative Input.</h3>
              <p className="mb-8 flex-1 text-sm leading-relaxed text-site-mist">
                Real-time contribution margins on every retainer before month-end panic.
              </p>
              <div className="space-y-4 rounded-2xl border border-hi/[0.07] bg-site-bg/50 p-4">
                {MARGINS.map((row, i) => (
                  <div key={row.name}>
                    <div className="mb-1.5 flex justify-between text-[11px] font-bold text-site-ink">
                      <span>{row.name}</span>
                      <span className="text-site-peri">{row.label}</span>
                    </div>
                    <div className="h-2 w-full overflow-hidden rounded-full bg-hi/[0.06]">
                      <GrowBar value={row.value} delay={i * 0.12} className="bg-gradient-to-r from-site-blue-deep to-site-blue-light" />
                    </div>
                  </div>
                ))}
              </div>
            </TiltCard>
          </StaggerItem>
        </Stagger>
      </section>

      {/* ── The people ── */}
      <section className="mx-auto max-w-[1240px] px-6 pb-8 sm:px-8 lg:px-12">
        <SectionHeading eyebrow="The people behind CREO" title="The team engineering the operating layer." accent={["operating", "layer."]} />

        <Stagger className="grid grid-cols-1 gap-6 lg:grid-cols-3" gap={0.12}>
          {PODS.map((pod) => (
            <StaggerItem key={pod.name} className="h-full">
              <TiltCard
                max={8}
                glow="rgba(125,162,255,0.16)"
                className="creo-glass group flex h-full flex-col rounded-3xl p-6 transition-shadow duration-500 hover:shadow-[0_30px_70px_-30px_rgba(59,107,255,0.6)]"
              >
                <div className="mb-5 flex items-center gap-4">
                  <div className="flex size-12 items-center justify-center rounded-2xl bg-gradient-to-br from-site-blue to-site-blue-deep text-base font-black text-white shadow-[0_10px_24px_-8px_rgba(59,107,255,0.9)] transition-transform duration-500 group-hover:-rotate-6 group-hover:scale-105">
                    {pod.initials}
                  </div>
                  <div>
                    <div className="text-base font-bold text-site-ink">{pod.name}</div>
                    <div className="mt-0.5 text-xs text-site-mist">{pod.role}</div>
                  </div>
                </div>
                <p className="mb-5 flex-1 text-sm leading-relaxed text-site-mist">{pod.text}</p>
                <div className="flex justify-end">
                  <span className="flex size-9 items-center justify-center rounded-full border border-hi/10 text-site-blue-light transition-all duration-300 group-hover:border-site-blue/60 group-hover:bg-site-blue/15">
                    <ChevronRight className="size-4 transition-transform duration-300 group-hover:translate-x-0.5" />
                  </span>
                </div>
              </TiltCard>
            </StaggerItem>
          ))}
        </Stagger>
      </section>
    </div>
  );
}
