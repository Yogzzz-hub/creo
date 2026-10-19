import { useState } from "react";
import { Link } from "react-router";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import {
  Bell, Search, Clock, Users, BarChart3, CheckCircle2, Play, AlertCircle, TrendingUp, X, Folder,
  Volume2, Maximize, ArrowRight, ArrowUpRight, MessageCircle,
} from "lucide-react";
import {
  CountUp,
  DonutRing,
  EASE_OUT_EXPO,
  GrowBar,
  Reveal,
  RollText,
  ScrollMask,
  SplitText,
  Stagger,
  StaggerItem,
  TiltCard,
} from "../../components/motion";
import { DistortImage } from "../../components/motion/DistortImage";
import { Eyebrow, PageHero } from "../../components/public/PageBlocks";

const HERO_STATS = [
  { icon: BarChart3, value: "18-Step", label: "Connected Pipeline" },
  { icon: Clock, value: "2.4h", label: "Avg. Client Sign-Off" },
  { icon: Users, value: "82%", label: "Optimized Team Capacity" },
  { icon: TrendingUp, value: "41.25%", label: "Verified Retainer Margin" },
];

const ACTIVITY = [
  { text: "Client approval Reel-04", time: "2h ago", tone: "bg-site-blue-light" },
  { text: "New revision requested", time: "4h ago", tone: "bg-site-sky" },
  { text: "Invoice paid (TechCorp Series B)", time: "6h ago", tone: "bg-site-blue-light" },
  { text: "New project assigned", time: "8h ago", tone: "bg-site-blue-light" },
];

const SCOPE = [
  { label: "Social Media Campaign", note: "(3 months)" },
  { label: "Reel Series", note: "(8 deliverables)" },
  { label: "Carousel Designs", note: "(12 assets)" },
  { label: "Brand Collateral", note: "(ongoing)" },
];

const TEAM = [
  { role: "Video Editor", value: 82, img: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&q=80" },
  { role: "Lead Designer", value: 74, img: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=150&q=80" },
  { role: "SMM Lead", value: 91, img: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=150&q=80", risk: true },
  { role: "Content Lead", value: 67, img: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=150&q=80" },
];

const QUEUE = [
  { name: "Reel 01 • Teaser", status: "Published", owner: "Video Editor", due: "Apr 22", warm: false },
  { name: "Reel 02 • Founder Story", status: "Client Review", owner: "SMM Lead", due: "Apr 24", warm: true },
  { name: "Carousel 03 • Specs", status: "In Production", owner: "Lead Designer", due: "Apr 26", warm: false },
  { name: "Reel 04 • Hook Revision", status: "In Revision", owner: "Video Editor", due: "Apr 28", warm: true },
];

const RADAR = [
  { area: "Design Queue", load: "2 items • High", warm: true },
  { area: "Development", load: "3 items • Medium", warm: true },
  { area: "Client Feedback", load: "1 item • Low", warm: false },
];

const LEDGER = [
  { label: "Retainer Revenue", value: "+₹80,000", positive: true },
  { label: "Dedicated Team Cost", value: "-₹28,000", positive: false },
  { label: "Tooling & Production", value: "-₹12,000", positive: false },
  { label: "Agency overhead", value: "-₹7,000", positive: false },
];

const BREAKDOWN = [
  { label: "Creative", value: 60, tone: "from-site-blue-deep to-site-blue-light" },
  { label: "Production", value: 20, tone: "from-site-blue-deep/80 to-site-blue-light/80" },
  { label: "Tools", value: 12, tone: "from-site-blue-deep/60 to-site-blue-light/60" },
  { label: "Overhead", value: 8, tone: "from-site-blue-deep/40 to-site-blue-light/40" },
];

/** Big outlined chapter number + eyebrow + masked headline for each module */
function ModuleHeader({
  index,
  eyebrow,
  title,
  accent,
  lead,
}: {
  index: string;
  eyebrow: string;
  title: string;
  accent?: string[];
  lead: string;
}) {
  return (
    <div className="mb-12 grid gap-4 sm:gap-8 lg:grid-cols-[auto_1fr] lg:items-end">
      <Reveal direction="right">
        <span
          aria-hidden="true"
          className="block text-[5rem] font-black leading-[0.8] tracking-[-0.06em] text-transparent [-webkit-text-stroke:1.5px_rgba(125,162,255,0.5)] sm:text-[7.5rem]"
        >
          {index}
        </span>
      </Reveal>
      <div>
        <Reveal>
          <Eyebrow>{eyebrow}</Eyebrow>
        </Reveal>
        <SplitText
          as="h2"
          text={title}
          accent={accent}
          className="mt-5 block text-3xl font-black leading-[1.05] tracking-[-0.035em] text-site-ink sm:text-4xl lg:text-5xl"
        />
        <Reveal delay={0.15}>
          <p className="mt-4 max-w-2xl text-base text-site-mist sm:text-lg">{lead}</p>
        </Reveal>
      </div>
    </div>
  );
}

const PANEL = "creo-glass rounded-3xl p-5 sm:p-7 lg:p-8";
const WELL = "rounded-2xl border border-hi/[0.07] bg-site-bg/50";

export function PortfolioPage() {
  const reduce = useReducedMotion();
  const [dossierTab, setDossierTab] = useState<"scope" | "metrics">("scope");
  const [approvalStatus, setApprovalStatus] = useState<"pending" | "approved" | "revision">("pending");
  const [inv1, setInv1] = useState("Paid ✓");
  const [inv2, setInv2] = useState("Due in 2 Days");

  const invoices = [
    { id: "#1024", client: "D2C Apparel Brand", amount: "₹120,000", state: inv1, set: setInv1 },
    { id: "#1025", client: "Global Fintech", amount: "₹80,000", state: inv2, set: setInv2 },
  ];

  return (
    <div className="min-h-screen w-full pb-16 font-sans text-site-ink lg:pb-20">
      {/* ── Hero ── */}
      <PageHero
        eyebrow="The operating system in motion"
        title="How modern creative agencies operate on CREO."
        accent={["operate", "on", "CREO."]}
        lead="Explore how high-performing creative studios use CREO to eliminate handoff friction, orchestrate multi-pod capacity, and track true project unit economics in real time."
        actions={
          <>
            <Link
              to="/pricing"
              className="creo-btn-primary group inline-flex items-center justify-center gap-2 rounded-full px-7 py-4 text-sm font-semibold"
            >
              <RollText>Deploy CREO in Your Agency</RollText>
              <ArrowRight className="size-4 transition-transform duration-300 group-hover:translate-x-1" />
            </Link>
            <a
              href="https://wa.me/919941999415"
              target="_blank"
              rel="noopener noreferrer"
              className="creo-btn-ghost group inline-flex items-center justify-center gap-2 rounded-full px-7 py-4 text-sm font-semibold"
            >
              <MessageCircle className="size-4 text-site-sky" />
              <RollText>Schedule Live Demo</RollText>
            </a>
          </>
        }
        aside={
          <TiltCard max={5} glow="rgba(125,162,255,0.14)" className="creo-glass creo-beam overflow-hidden rounded-3xl p-5 sm:p-6">
            {/* Console header */}
            <div className="mb-6 flex items-center justify-between border-b border-hi/[0.08] pb-4">
              <div className="flex items-center gap-3">
                <div className="text-lg font-black tracking-tight text-site-ink">
                  creo<span className="text-site-blue-light">.</span>
                </div>
                <div className="text-xs font-medium text-site-mist">Agency Operating</div>
              </div>
              <div className="flex items-center gap-3">
                <Search className="size-4 text-site-mist" />
                <span className="relative">
                  <Bell className="size-4 text-site-mist" />
                  <span className="absolute -right-0.5 -top-0.5 size-1.5 rounded-full bg-site-blue-light shadow-[0_0_6px_1px_rgba(79,123,255,0.9)]" />
                </span>
                <img
                  src="https://ui-avatars.com/api/?name=Admin&background=0B111C&color=F8FAFC"
                  alt="Avatar"
                  className="size-6 rounded-full border border-hi/10"
                />
              </div>
            </div>

            <Stagger className="mb-5 grid grid-cols-1 gap-3 min-[400px]:grid-cols-2" delay={0.6} gap={0.08}>
              <StaggerItem className={`${WELL} p-3.5`}>
                <div className="mb-1 text-[10px] font-bold uppercase tracking-[0.12em] text-site-mist">ARR</div>
                <div className="mb-1 flex flex-wrap items-center gap-2">
                  <CountUp value="₹1,24,82,200" className="text-xl font-black text-site-ink sm:text-2xl" />
                  <span className="rounded border border-site-blue/30 bg-site-blue/10 px-1.5 py-0.5 text-[10px] font-bold text-site-peri">+14.2%</span>
                </div>
                <svg className="mt-1 h-4 w-16 overflow-visible text-site-blue-light" viewBox="0 0 50 15" fill="none" aria-hidden="true">
                  <motion.path
                    d="M1 12.5C5 12.5 8 2.5 13 2.5C18 2.5 21 11.5 25 11.5C29 11.5 32 4.5 36 4.5C41 4.5 45 9.5 49 9.5"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    initial={reduce ? false : { pathLength: 0 }}
                    animate={{ pathLength: 1 }}
                    transition={{ duration: 1.6, delay: 0.9, ease: EASE_OUT_EXPO }}
                  />
                </svg>
              </StaggerItem>
              {[
                { label: "Active Projects", value: "48", icon: Folder },
                { label: "Team Utilization", value: "82%", icon: Users },
                { label: "Approvals Pending", value: "17", icon: Clock },
              ].map((stat) => (
                <StaggerItem key={stat.label} className={`${WELL} flex flex-col justify-between gap-2 p-3.5`}>
                  <div className="flex items-start justify-between">
                    <div className="text-[10px] font-bold uppercase tracking-[0.12em] text-site-mist">{stat.label}</div>
                    <span className="flex size-5 shrink-0 items-center justify-center rounded bg-site-bg ring-1 ring-inset ring-hi/10">
                      <stat.icon className="size-3 text-site-mist" />
                    </span>
                  </div>
                  <CountUp value={stat.value} className="text-xl font-black text-site-ink sm:text-2xl" />
                </StaggerItem>
              ))}
            </Stagger>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className={`${WELL} flex flex-col items-center justify-center p-5`}>
                <DonutRing value={82} size={104} stroke={3.5} className="mb-4">
                  <span className="text-lg font-black text-site-ink">82%</span>
                </DonutRing>
                <div className="mb-2 text-xs font-bold text-site-ink">Team Balance</div>
                <div className="w-full space-y-2 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-1.5 text-site-mist">
                      <span className="size-2 rounded-full bg-site-blue-light" /> Billable
                    </span>
                    <span className="font-bold text-site-ink">82%</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-1.5 text-site-mist">
                      <span className="size-2 rounded-full bg-hi/20" /> Non-billable
                    </span>
                    <span className="font-bold text-site-ink">18%</span>
                  </div>
                </div>
              </div>

              <div className={`${WELL} p-4`}>
                <div className="mb-4 flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase tracking-[0.12em] text-site-mist">Recent Activity</span>
                  <span className="flex items-center gap-1.5 text-[10px] font-bold text-site-peri">
                    <span className="size-1.5 animate-pulse rounded-full bg-site-blue-light" /> Live
                  </span>
                </div>
                <Stagger className="space-y-1" delay={0.9} gap={0.1}>
                  {ACTIVITY.map((item) => (
                    <StaggerItem key={item.text} className="flex items-center justify-between gap-2 py-1.5">
                      <div className="flex min-w-0 items-center gap-2">
                        <span className={`size-1.5 shrink-0 rounded-full ${item.tone}`} />
                        <span className="truncate text-xs text-site-ink">{item.text}</span>
                      </div>
                      <span className="shrink-0 text-[11px] text-site-mist">{item.time}</span>
                    </StaggerItem>
                  ))}
                </Stagger>
              </div>
            </div>
          </TiltCard>
        }
      >
        <Stagger className="grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-3.5" delay={0.65} gap={0.08}>
          {HERO_STATS.map((stat) => (
            <StaggerItem
              key={stat.label}
              className="creo-glass flex flex-col justify-center rounded-2xl p-4 transition-shadow duration-500 hover:shadow-[0_20px_50px_-24px_rgba(59,107,255,0.8)]"
            >
              <stat.icon className="mb-2 size-5 text-site-blue-light" />
              <CountUp value={stat.value} className="mb-1 text-lg font-black leading-none text-site-ink" />
              <div className="text-[10px] font-medium leading-tight text-site-mist">{stat.label}</div>
            </StaggerItem>
          ))}
        </Stagger>
      </PageHero>

      {/* ── Module 01 ── */}
      <section className="mx-auto max-w-[1240px] px-6 py-16 sm:px-8 sm:py-24 lg:px-12">
        <ModuleHeader
          index="01"
          eyebrow="Onboarding & team capacity"
          title="Client Dossier & Capacity Radar"
          accent={["Capacity", "Radar"]}
          lead="Get every client, project and team member aligned from day one."
        />

        <Stagger className="grid grid-cols-1 gap-5 lg:grid-cols-2" gap={0.12}>
          {/* Client dossier */}
          <StaggerItem className={PANEL}>
            <div className="mb-8 flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="flex size-10 items-center justify-center rounded-full bg-gradient-to-br from-site-blue to-site-blue-deep text-sm font-bold text-white shadow-[0_8px_20px_-6px_rgba(59,107,255,0.9)]">
                  AL
                </div>
                <div>
                  <div className="text-sm font-semibold text-site-ink">TechCorp Series B Retainer Setup</div>
                  <div className="text-xs text-site-mist">Lifestyle &amp; Home Decor</div>
                </div>
              </div>
              <div className="flex shrink-0 items-center gap-1.5 rounded-full border border-site-blue/30 bg-site-blue/10 px-2.5 py-1">
                <span className="size-1.5 rounded-full bg-site-blue-light" />
                <span className="text-[10px] font-bold text-site-peri">Verified Client</span>
              </div>
            </div>

            <div className="mb-6 flex gap-1 border-b border-hi/[0.08] pb-3" role="tablist" aria-label="Dossier view">
              {(["scope", "metrics"] as const).map((tab) => (
                <button
                  key={tab}
                  type="button"
                  role="tab"
                  aria-selected={dossierTab === tab}
                  onClick={() => setDossierTab(tab)}
                  className={`relative cursor-pointer rounded-full px-4 py-1.5 text-xs font-semibold capitalize transition-colors ${
                    dossierTab === tab ? "text-hi" : "text-site-mist hover:text-site-ink"
                  }`}
                >
                  {dossierTab === tab && (
                    <motion.span
                      layoutId="dossier-tab"
                      className="absolute inset-0 -z-10 rounded-full bg-site-blue/20 ring-1 ring-inset ring-site-blue/50"
                      transition={{ type: "spring", stiffness: 420, damping: 34 }}
                    />
                  )}
                  {tab}
                </button>
              ))}
            </div>

            <div className="mb-8 grid grid-cols-1 gap-3 min-[400px]:grid-cols-3">
              {[
                { label: "Active Deliverables", value: "4" },
                { label: "Brand Guidelines", value: "12", unit: "files" },
                { label: "Contract Milestones", value: "5/8" },
              ].map((item) => (
                <div key={item.label} className={`${WELL} flex flex-col justify-center p-4`}>
                  <div className="mb-1 text-[11px] font-bold text-site-mist">{item.label}</div>
                  <div className="text-xl font-black text-site-ink sm:text-2xl">
                    {item.value} {item.unit && <span className="text-[10px] font-normal text-site-mist">{item.unit}</span>}
                  </div>
                </div>
              ))}
            </div>

            <AnimatePresence mode="wait" initial={false}>
              <motion.div
                key={dossierTab}
                initial={{ opacity: 0, y: 10, filter: "blur(4px)" }}
                animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                exit={{ opacity: 0, y: -8, filter: "blur(4px)" }}
                transition={{ duration: 0.35, ease: EASE_OUT_EXPO }}
                className="mb-8"
              >
                {dossierTab === "scope" ? (
                  <ul className="space-y-2.5">
                    {SCOPE.map((item) => (
                      <li key={item.label} className={`${WELL} flex items-center gap-3 px-3.5 py-2.5 text-sm font-medium text-site-ink`}>
                        <CheckCircle2 className="size-5 shrink-0 text-site-blue-light" />
                        <span>
                          {item.label} <span className="text-xs font-normal text-site-mist">{item.note}</span>
                        </span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <div className="space-y-2.5">
                    {[
                      { icon: Clock, label: "Turnaround SLA", value: "2.1 days" },
                      { icon: CheckCircle2, label: "First-pass approval", value: "88%" },
                      { icon: Folder, label: "Total assets delivered", value: "32" },
                    ].map((row) => (
                      <div key={row.label} className={`${WELL} flex items-center justify-between px-3.5 py-3 text-sm font-medium text-site-ink`}>
                        <div className="flex items-center gap-3">
                          <row.icon className="size-5 shrink-0 text-site-blue-light" /> {row.label}
                        </div>
                        <div className="font-bold">{row.value}</div>
                      </div>
                    ))}
                  </div>
                )}
              </motion.div>
            </AnimatePresence>

            <Link
              to="/signup?intent=dossier"
              className="creo-btn-ghost group flex w-full items-center justify-center gap-2 rounded-2xl py-3.5 text-xs font-bold"
            >
              <RollText>View Full Client Dossier</RollText>
              <ArrowUpRight className="size-3.5 text-site-blue-light transition-transform duration-300 group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
            </Link>
          </StaggerItem>

          {/* Live utilization */}
          <StaggerItem className={`${PANEL} flex flex-col justify-between`}>
            <div>
              <div className="mb-8 flex items-center justify-between">
                <div className="text-sm font-semibold text-site-ink">Live Team Utilization</div>
                <div className="flex items-center gap-1.5 rounded-full border border-site-blue/30 bg-site-blue/10 px-2.5 py-1">
                  <span className="size-1.5 animate-pulse rounded-full bg-site-blue-light" />
                  <span className="text-[10px] font-bold text-site-peri">Live</span>
                </div>
              </div>

              <div className="space-y-6">
                {TEAM.map((member, i) => (
                  <div key={member.role} className="flex items-center gap-4">
                    <img src={member.img} alt={member.role} className="size-9 rounded-full border border-hi/10 object-cover" />
                    <div className="flex-1">
                      <div className="mb-2 flex items-center justify-between gap-2 text-xs font-semibold">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-site-ink">{member.role}</span>
                          {member.risk && (
                            <span className="flex items-center gap-1 rounded border border-site-sky/30 bg-site-sky/10 px-1.5 py-0.5 text-[9px] text-site-sky">
                              <AlertCircle className="size-2.5" /> Bottleneck Risk - 2 items queued
                            </span>
                          )}
                        </div>
                        <span className="text-site-ink">{member.value}%</span>
                      </div>
                      <div className="h-1.5 w-full overflow-hidden rounded-full bg-hi/[0.06]">
                        <GrowBar
                          value={member.value}
                          delay={i * 0.1}
                          className={member.risk ? "bg-gradient-to-r from-[#38BDF8] to-site-sky" : "bg-gradient-to-r from-site-blue-deep to-site-blue-light"}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className={`${WELL} mt-8 flex items-center gap-2 p-3 text-[11px] font-medium text-site-mist`}>
              <span className="size-1.5 rounded-full bg-site-blue-light" /> Live Resource Telemetry - Zero spreadsheet guesswork.
            </div>
          </StaggerItem>
        </Stagger>
      </section>

      {/* ── Module 02 — on an opening band ── */}
      <ScrollMask inset={5} radius={48} background="bg-gradient-to-b from-site-deep to-site-deep">
        <section className="relative py-20 sm:py-28">
          <div aria-hidden="true" className="creo-grid-bg absolute inset-0 opacity-70 [mask-image:radial-gradient(60%_50%_at_50%_0%,#000,transparent)]" />
          <div className="relative mx-auto max-w-[1240px] px-6 sm:px-8 lg:px-12">
            <ModuleHeader
              index="02"
              eyebrow="Creative production & client sign-off"
              title="The Production Engine & 1-Click Approvals"
              accent={["1-Click", "Approvals"]}
              lead="From creative brief to final delivery - all in one place, with full visibility."
            />

            <Stagger className="grid grid-cols-1 gap-5 lg:grid-cols-2" gap={0.12}>
              {/* Production cadence */}
              <StaggerItem className={PANEL}>
                <div className="mb-6 text-sm font-semibold text-site-ink">Production Cadence &amp; Editorial Calendar</div>

                <div
                  className="public-scroll-region mb-8 w-full overflow-x-auto"
                  role="region"
                  aria-label="Deliverable queue, scroll horizontally to see all columns"
                  tabIndex={0}
                >
                  <table className="w-full min-w-[500px] border-separate border-spacing-y-2 text-left">
                    <thead>
                      <tr className="text-[10px] font-bold uppercase tracking-[0.12em] text-site-mist">
                        <th className="w-[35%] px-3 pb-1">Deliverable</th>
                        <th className="w-[25%] px-2 pb-1">Status</th>
                        <th className="w-[25%] px-2 pb-1">Owner</th>
                        <th className="w-[15%] px-3 pb-1">Due</th>
                      </tr>
                    </thead>
                    <tbody className="text-xs">
                      {QUEUE.map((row) => (
                        <tr key={row.name} className="group">
                          <td className="rounded-l-xl border-y border-l border-hi/[0.07] bg-site-bg/50 px-3 py-4 font-semibold text-site-ink transition-colors group-hover:bg-hi/[0.04]">
                            {row.name}
                          </td>
                          <td className="border-y border-hi/[0.07] bg-site-bg/50 px-2 py-4 transition-colors group-hover:bg-hi/[0.04]">
                            <span
                              className={`inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[10px] font-bold ${
                                row.warm ? "border-site-sky/25 bg-site-sky/10 text-site-sky" : "border-site-blue/25 bg-site-blue/12 text-site-peri"
                              }`}
                            >
                              <span className={`size-1.5 rounded-full ${row.warm ? "bg-site-sky" : "bg-site-blue-light"}`} /> {row.status}
                            </span>
                          </td>
                          <td className="border-y border-hi/[0.07] bg-site-bg/50 px-2 py-4 text-site-mist transition-colors group-hover:bg-hi/[0.04]">
                            {row.owner}
                          </td>
                          <td className="rounded-r-xl border-y border-r border-hi/[0.07] bg-site-bg/50 px-3 py-4 font-medium text-site-mist transition-colors group-hover:bg-hi/[0.04]">
                            {row.due}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className={`${WELL} p-5`}>
                  <div className="mb-4 text-xs font-semibold text-site-ink">Bottleneck Radar</div>
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                    {RADAR.map((item) => (
                      <div key={item.area} className="rounded-xl border border-hi/[0.07] bg-site-bg/60 p-3">
                        <div className="mb-1 text-[10px] text-site-mist">{item.area}</div>
                        <div className="flex items-center gap-1.5 text-xs font-semibold text-site-ink">
                          <span className={`size-1.5 rounded-full ${item.warm ? "animate-pulse bg-site-sky" : "bg-site-blue-light"}`} /> {item.load}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </StaggerItem>

              {/* Client portal */}
              <StaggerItem className={`${PANEL} creo-beam flex flex-col`}>
                <div className="mb-1 text-sm font-semibold text-site-ink">Velox Studio Client Portal</div>
                <div className="mb-6 text-xs font-medium text-site-mist">Summer DTC Campaign Reel #04</div>

                <div data-cursor="View" className="relative mb-6 aspect-video w-full overflow-hidden rounded-2xl border border-hi/[0.08] bg-site-bg">
                  <DistortImage
                    src="https://images.unsplash.com/photo-1492691527719-9d1e07e534b4?auto=format&fit=crop&w=800&q=80"
                    alt="Cinematic Video Mockup"
                    className="absolute inset-0 size-full"
                    imgClassName="size-full object-cover opacity-75"
                  />
                  <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-black/30" />
                  <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                    <span className="relative flex size-14 items-center justify-center rounded-full border border-hi/40 bg-hi/10 text-hi backdrop-blur-md">
                      {!reduce && <span className="absolute inset-0 animate-ping rounded-full border border-hi/30" />}
                      <Play className="ml-0.5 size-5 fill-hi" />
                    </span>
                  </div>
                  <div className="pointer-events-none absolute inset-x-0 bottom-0 flex items-center gap-3 px-4 pb-3 pt-6">
                    <div className="shrink-0 text-[10px] font-bold text-site-ink">0:00 / 2:34</div>
                    <div className="relative h-1 flex-1 overflow-hidden rounded-full bg-hi/20">
                      <GrowBar value={33} className="bg-gradient-to-r from-site-blue-deep to-site-sky" />
                    </div>
                    <Volume2 className="size-3.5 shrink-0 text-site-ink" />
                    <Maximize className="size-3.5 shrink-0 text-site-ink" />
                  </div>
                </div>

                <div className="mb-5 flex min-h-6 items-center justify-between">
                  <AnimatePresence mode="wait" initial={false}>
                    <motion.div
                      key={approvalStatus}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -8 }}
                      transition={{ duration: 0.25 }}
                      className="flex items-center gap-2"
                    >
                      {approvalStatus === "pending" && (
                        <>
                          <span className="size-2 animate-pulse rounded-full bg-site-sky" />
                          <span className="text-xs font-bold text-site-sky">Awaiting Client Approval</span>
                        </>
                      )}
                      {approvalStatus === "approved" && (
                        <span className="text-xs font-bold text-site-peri">✓ Approved (Queued for Delivery)</span>
                      )}
                      {approvalStatus === "revision" && (
                        <span className="text-xs font-bold text-site-peri">Revision Ticket Created (#231)</span>
                      )}
                    </motion.div>
                  </AnimatePresence>
                  {approvalStatus !== "pending" && (
                    <button
                      type="button"
                      onClick={() => setApprovalStatus("pending")}
                      className="cursor-pointer text-[10px] text-site-mist underline underline-offset-2 hover:text-site-ink"
                    >
                      Reset
                    </button>
                  )}
                </div>

                <AnimatePresence initial={false}>
                  {approvalStatus === "pending" && (
                    <motion.div
                      key="actions"
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      transition={{ duration: 0.35, ease: EASE_OUT_EXPO }}
                      className="overflow-hidden"
                    >
                      <div className="mb-5 flex w-full flex-col gap-3 sm:flex-row">
                        <button
                          type="button"
                          onClick={() => setApprovalStatus("approved")}
                          className="creo-btn-primary group flex flex-1 cursor-pointer items-center justify-center gap-2 rounded-full px-4 py-3 text-xs font-semibold"
                        >
                          <CheckCircle2 className="size-4" /> <RollText>Approve Asset</RollText>
                        </button>
                        <button
                          type="button"
                          onClick={() => setApprovalStatus("revision")}
                          className="creo-btn-ghost group flex flex-1 cursor-pointer items-center justify-center gap-2 rounded-full px-4 py-3 text-xs font-semibold"
                        >
                          <X className="size-4" /> <RollText>Request Revision</RollText>
                        </button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                <div className={`${WELL} mt-auto flex items-start gap-3 p-3`}>
                  <AlertCircle className="mt-0.5 size-4 shrink-0 text-site-mist" />
                  <p className="text-[11px] leading-relaxed text-site-mist">
                    Revision trigger automatically creates Ticket #108 and alerts Motion Lead without WhatsApp chasing.
                  </p>
                </div>
              </StaggerItem>
            </Stagger>
          </div>
        </section>
      </ScrollMask>

      {/* ── Module 03 ── */}
      <section className="mx-auto max-w-[1240px] px-6 py-16 sm:px-8 sm:py-24 lg:px-12">
        <ModuleHeader
          index="03"
          eyebrow="Real-time profitability & cash flow"
          title="Financial Telemetry & Margin Recovery"
          accent={["Margin", "Recovery"]}
          lead="See your true margins, manage cash flow, and get paid faster."
        />

        <Stagger className="grid grid-cols-1 gap-5 lg:grid-cols-2" gap={0.12}>
          {/* Retainer P&L */}
          <StaggerItem className={PANEL}>
            <div className="mb-1 text-sm font-semibold text-site-ink">TechCorp Series B &bull; Monthly Creative Retainer</div>
            <div className="mb-8 text-xs text-site-mist">Balance Sheet &amp; Contribution</div>

            <div className="mb-8 grid grid-cols-1 gap-8 sm:grid-cols-2">
              <Stagger className="space-y-4" gap={0.08}>
                {LEDGER.map((row) => (
                  <StaggerItem key={row.label} className="flex items-center justify-between border-b border-hi/[0.07] pb-3 text-xs">
                    <span className="font-medium text-site-mist">{row.label}</span>
                    <span className={`font-semibold ${row.positive ? "text-site-peri" : "text-site-sky"}`}>{row.value}</span>
                  </StaggerItem>
                ))}
              </Stagger>

              <div className={`${WELL} flex flex-col justify-between p-4`}>
                <div className="text-[10px] font-bold uppercase tracking-[0.12em] text-site-mist">Revenue Breakdown</div>
                <div className="mt-4 flex h-36 items-end justify-between px-1 sm:px-2">
                  {BREAKDOWN.map((bar, i) => (
                    <div key={bar.label} className="flex h-full w-12 flex-col items-center justify-end gap-2 sm:w-14">
                      <span className="text-[11px] font-bold text-site-ink">{bar.value}%</span>
                      <div className="flex h-[70%] w-6 items-end sm:w-8">
                        <GrowBar vertical value={bar.value / 0.6} delay={i * 0.1} className={`rounded-t-md bg-gradient-to-t ${bar.tone}`} />
                      </div>
                      <span className="w-full text-center text-[10px] text-site-mist sm:text-[11px]">{bar.label}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="creo-beam flex items-center justify-between rounded-2xl border border-site-blue/40 bg-site-blue/[0.08] p-5 shadow-[0_20px_50px_-30px_rgba(59,107,255,0.9)]">
              <div>
                <div className="mb-1 text-[10px] font-bold uppercase tracking-[0.12em] text-site-peri">Project Contribution Margin</div>
                <div className="text-2xl font-black text-site-ink">
                  <CountUp value="₹33,000" />{" "}
                  <span className="text-sm font-bold text-site-peri">(41.25%)</span>
                </div>
              </div>
              <DonutRing value={41.25} size={48} />
            </div>
          </StaggerItem>

          {/* Cash flow */}
          <StaggerItem className={`${PANEL} flex flex-col`}>
            <div className="mb-6 text-sm font-semibold text-site-ink">Cash Flow Engine &amp; Auto-Chase</div>

            <div className="mb-8 space-y-3">
              {invoices.map((invoice) => (
                <div key={invoice.id} className={`${WELL} flex flex-col justify-between gap-4 p-4 sm:flex-row sm:items-center`}>
                  <div className="flex gap-6">
                    <div>
                      <div className="mb-1 text-[10px] uppercase tracking-[0.1em] text-site-mist">Invoice</div>
                      <div className="text-sm font-semibold text-site-ink">{invoice.id}</div>
                    </div>
                    <div>
                      <div className="mb-1 text-[10px] uppercase tracking-[0.1em] text-site-mist">Client</div>
                      <div className="text-sm font-semibold text-site-ink">{invoice.client}</div>
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center justify-between gap-3 sm:w-[60%] sm:justify-end">
                    <div className="whitespace-nowrap text-sm font-semibold text-site-ink">{invoice.amount}</div>
                    <AnimatePresence mode="wait" initial={false}>
                      {invoice.state === "Paid ✓" ? (
                        <motion.span
                          key="paid"
                          initial={{ opacity: 0, scale: 0.85 }}
                          animate={{ opacity: 1, scale: 1 }}
                          exit={{ opacity: 0, scale: 0.85 }}
                          transition={{ type: "spring", stiffness: 400, damping: 22 }}
                          className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-site-blue/30 bg-site-blue/15 px-2.5 py-1 text-[10px] font-bold text-site-peri"
                        >
                          {invoice.state}
                        </motion.span>
                      ) : (
                        <motion.div
                          key="open"
                          initial={{ opacity: 0, y: 6 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -6 }}
                          className="flex flex-wrap items-center gap-2"
                        >
                          <span className="shrink-0 text-[10px] font-bold text-site-sky">{invoice.state}</span>
                          <button
                            type="button"
                            onClick={() => invoice.set("Paid ✓")}
                            className="shrink-0 cursor-pointer rounded-full bg-site-ice px-3 py-1 text-[10px] font-semibold text-site-bg transition-all hover:bg-hi hover:shadow-[0_0_20px_rgba(220,232,255,0.3)]"
                          >
                            Resolve
                          </button>
                          <button
                            type="button"
                            onClick={() => invoice.set("Reminder Sent ")}
                            className="creo-btn-primary shrink-0 cursor-pointer rounded-full px-3 py-1 text-[10px] font-bold"
                          >
                            Chase
                          </button>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </div>
              ))}
            </div>

            <div className={`${WELL} mt-auto flex items-center gap-4 p-5`}>
              <div className="flex size-12 shrink-0 items-center justify-center rounded-full bg-site-blue/15 ring-1 ring-inset ring-site-blue/40">
                <TrendingUp className="size-5 text-site-blue-light" />
              </div>
              <div>
                <div className="text-lg font-black text-site-ink">
                  <CountUp value="₹2.1L" /> <span className="text-xs font-medium text-site-mist">In Collections Pipeline</span>
                </div>
                <div className="mt-1 text-[11px] text-site-mist">Automated payment follow-ups.</div>
              </div>
            </div>
          </StaggerItem>
        </Stagger>
      </section>
    </div>
  );
}
