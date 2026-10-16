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
  { text: "Client approval Reel-04", time: "2h ago", tone: "bg-[#7DA2FF]" },
  { text: "New revision requested", time: "4h ago", tone: "bg-[#7DD3FC]" },
  { text: "Invoice paid (TechCorp Series B)", time: "6h ago", tone: "bg-[#7DA2FF]" },
  { text: "New project assigned", time: "8h ago", tone: "bg-[#7DA2FF]" },
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
  { label: "Creative", value: 60, tone: "from-[#3B6BFF] to-[#7DA2FF]" },
  { label: "Production", value: 20, tone: "from-[#3B6BFF]/80 to-[#7DA2FF]/80" },
  { label: "Tools", value: 12, tone: "from-[#3B6BFF]/60 to-[#7DA2FF]/60" },
  { label: "Overhead", value: 8, tone: "from-[#3B6BFF]/40 to-[#7DA2FF]/40" },
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
          className="mt-5 block text-3xl font-black leading-[1.05] tracking-[-0.035em] text-[#F4F7FF] sm:text-4xl lg:text-5xl"
        />
        <Reveal delay={0.15}>
          <p className="mt-4 max-w-2xl text-base text-[#93A0BF] sm:text-lg">{lead}</p>
        </Reveal>
      </div>
    </div>
  );
}

const PANEL = "creo-glass rounded-3xl p-5 sm:p-7 lg:p-8";
const WELL = "rounded-2xl border border-white/[0.07] bg-[#050A1A]/50";

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
    <div className="min-h-screen w-full pb-16 font-sans text-[#F4F7FF] lg:pb-20">
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
              <MessageCircle className="size-4 text-[#7DD3FC]" />
              <RollText>Schedule Live Demo</RollText>
            </a>
          </>
        }
        aside={
          <TiltCard max={5} glow="rgba(125,162,255,0.14)" className="creo-glass creo-beam overflow-hidden rounded-3xl p-5 sm:p-6">
            {/* Console header */}
            <div className="mb-6 flex items-center justify-between border-b border-white/[0.08] pb-4">
              <div className="flex items-center gap-3">
                <div className="text-lg font-black tracking-tight text-[#F4F7FF]">
                  creo<span className="text-[#7DA2FF]">.</span>
                </div>
                <div className="text-xs font-medium text-[#93A0BF]">Agency Operating</div>
              </div>
              <div className="flex items-center gap-3">
                <Search className="size-4 text-[#93A0BF]" />
                <span className="relative">
                  <Bell className="size-4 text-[#93A0BF]" />
                  <span className="absolute -right-0.5 -top-0.5 size-1.5 rounded-full bg-[#7DA2FF] shadow-[0_0_6px_1px_rgba(79,123,255,0.9)]" />
                </span>
                <img
                  src="https://ui-avatars.com/api/?name=Admin&background=0B111C&color=F8FAFC"
                  alt="Avatar"
                  className="size-6 rounded-full border border-white/10"
                />
              </div>
            </div>

            <Stagger className="mb-5 grid grid-cols-1 gap-3 min-[400px]:grid-cols-2" delay={0.6} gap={0.08}>
              <StaggerItem className={`${WELL} p-3.5`}>
                <div className="mb-1 text-[10px] font-bold uppercase tracking-[0.12em] text-[#93A0BF]">ARR</div>
                <div className="mb-1 flex flex-wrap items-center gap-2">
                  <CountUp value="₹1,24,82,200" className="text-xl font-black text-[#F4F7FF] sm:text-2xl" />
                  <span className="rounded border border-[#4F7BFF]/30 bg-[#4F7BFF]/10 px-1.5 py-0.5 text-[10px] font-bold text-[#9DB8FF]">+14.2%</span>
                </div>
                <svg className="mt-1 h-4 w-16 overflow-visible text-[#7DA2FF]" viewBox="0 0 50 15" fill="none" aria-hidden="true">
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
                    <div className="text-[10px] font-bold uppercase tracking-[0.12em] text-[#93A0BF]">{stat.label}</div>
                    <span className="flex size-5 shrink-0 items-center justify-center rounded bg-[#050A1A] ring-1 ring-inset ring-white/10">
                      <stat.icon className="size-3 text-[#93A0BF]" />
                    </span>
                  </div>
                  <CountUp value={stat.value} className="text-xl font-black text-[#F4F7FF] sm:text-2xl" />
                </StaggerItem>
              ))}
            </Stagger>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className={`${WELL} flex flex-col items-center justify-center p-5`}>
                <DonutRing value={82} size={104} stroke={3.5} className="mb-4">
                  <span className="text-lg font-black text-[#F4F7FF]">82%</span>
                </DonutRing>
                <div className="mb-2 text-xs font-bold text-[#F4F7FF]">Team Balance</div>
                <div className="w-full space-y-2 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-1.5 text-[#93A0BF]">
                      <span className="size-2 rounded-full bg-[#7DA2FF]" /> Billable
                    </span>
                    <span className="font-bold text-[#F4F7FF]">82%</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-1.5 text-[#93A0BF]">
                      <span className="size-2 rounded-full bg-white/20" /> Non-billable
                    </span>
                    <span className="font-bold text-[#F4F7FF]">18%</span>
                  </div>
                </div>
              </div>

              <div className={`${WELL} p-4`}>
                <div className="mb-4 flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase tracking-[0.12em] text-[#93A0BF]">Recent Activity</span>
                  <span className="flex items-center gap-1.5 text-[10px] font-bold text-[#9DB8FF]">
                    <span className="size-1.5 animate-pulse rounded-full bg-[#7DA2FF]" /> Live
                  </span>
                </div>
                <Stagger className="space-y-1" delay={0.9} gap={0.1}>
                  {ACTIVITY.map((item) => (
                    <StaggerItem key={item.text} className="flex items-center justify-between gap-2 py-1.5">
                      <div className="flex min-w-0 items-center gap-2">
                        <span className={`size-1.5 shrink-0 rounded-full ${item.tone}`} />
                        <span className="truncate text-xs text-[#F4F7FF]">{item.text}</span>
                      </div>
                      <span className="shrink-0 text-[11px] text-[#93A0BF]">{item.time}</span>
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
              <stat.icon className="mb-2 size-5 text-[#7DA2FF]" />
              <CountUp value={stat.value} className="mb-1 text-lg font-black leading-none text-[#F4F7FF]" />
              <div className="text-[10px] font-medium leading-tight text-[#93A0BF]">{stat.label}</div>
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
                <div className="flex size-10 items-center justify-center rounded-full bg-gradient-to-br from-[#5A85FF] to-[#3B6BFF] text-sm font-bold text-white shadow-[0_8px_20px_-6px_rgba(59,107,255,0.9)]">
                  AL
                </div>
                <div>
                  <div className="text-sm font-semibold text-[#F4F7FF]">TechCorp Series B Retainer Setup</div>
                  <div className="text-xs text-[#93A0BF]">Lifestyle &amp; Home Decor</div>
                </div>
              </div>
              <div className="flex shrink-0 items-center gap-1.5 rounded-full border border-[#4F7BFF]/30 bg-[#4F7BFF]/10 px-2.5 py-1">
                <span className="size-1.5 rounded-full bg-[#7DA2FF]" />
                <span className="text-[10px] font-bold text-[#9DB8FF]">Verified Client</span>
              </div>
            </div>

            <div className="mb-6 flex gap-1 border-b border-white/[0.08] pb-3" role="tablist" aria-label="Dossier view">
              {(["scope", "metrics"] as const).map((tab) => (
                <button
                  key={tab}
                  type="button"
                  role="tab"
                  aria-selected={dossierTab === tab}
                  onClick={() => setDossierTab(tab)}
                  className={`relative cursor-pointer rounded-full px-4 py-1.5 text-xs font-semibold capitalize transition-colors ${
                    dossierTab === tab ? "text-white" : "text-[#93A0BF] hover:text-[#F4F7FF]"
                  }`}
                >
                  {dossierTab === tab && (
                    <motion.span
                      layoutId="dossier-tab"
                      className="absolute inset-0 -z-10 rounded-full bg-[#4F7BFF]/20 ring-1 ring-inset ring-[#4F7BFF]/50"
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
                  <div className="mb-1 text-[11px] font-bold text-[#93A0BF]">{item.label}</div>
                  <div className="text-xl font-black text-[#F4F7FF] sm:text-2xl">
                    {item.value} {item.unit && <span className="text-[10px] font-normal text-[#93A0BF]">{item.unit}</span>}
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
                      <li key={item.label} className={`${WELL} flex items-center gap-3 px-3.5 py-2.5 text-sm font-medium text-[#F4F7FF]`}>
                        <CheckCircle2 className="size-5 shrink-0 text-[#7DA2FF]" />
                        <span>
                          {item.label} <span className="text-xs font-normal text-[#93A0BF]">{item.note}</span>
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
                      <div key={row.label} className={`${WELL} flex items-center justify-between px-3.5 py-3 text-sm font-medium text-[#F4F7FF]`}>
                        <div className="flex items-center gap-3">
                          <row.icon className="size-5 shrink-0 text-[#7DA2FF]" /> {row.label}
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
              <ArrowUpRight className="size-3.5 text-[#7DA2FF] transition-transform duration-300 group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
            </Link>
          </StaggerItem>

          {/* Live utilization */}
          <StaggerItem className={`${PANEL} flex flex-col justify-between`}>
            <div>
              <div className="mb-8 flex items-center justify-between">
                <div className="text-sm font-semibold text-[#F4F7FF]">Live Team Utilization</div>
                <div className="flex items-center gap-1.5 rounded-full border border-[#4F7BFF]/30 bg-[#4F7BFF]/10 px-2.5 py-1">
                  <span className="size-1.5 animate-pulse rounded-full bg-[#7DA2FF]" />
                  <span className="text-[10px] font-bold text-[#9DB8FF]">Live</span>
                </div>
              </div>

              <div className="space-y-6">
                {TEAM.map((member, i) => (
                  <div key={member.role} className="flex items-center gap-4">
                    <img src={member.img} alt={member.role} className="size-9 rounded-full border border-white/10 object-cover" />
                    <div className="flex-1">
                      <div className="mb-2 flex items-center justify-between gap-2 text-xs font-semibold">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-[#F4F7FF]">{member.role}</span>
                          {member.risk && (
                            <span className="flex items-center gap-1 rounded border border-[#7DD3FC]/30 bg-[#7DD3FC]/10 px-1.5 py-0.5 text-[9px] text-[#7DD3FC]">
                              <AlertCircle className="size-2.5" /> Bottleneck Risk - 2 items queued
                            </span>
                          )}
                        </div>
                        <span className="text-[#F4F7FF]">{member.value}%</span>
                      </div>
                      <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/[0.06]">
                        <GrowBar
                          value={member.value}
                          delay={i * 0.1}
                          className={member.risk ? "bg-gradient-to-r from-[#38BDF8] to-[#7DD3FC]" : "bg-gradient-to-r from-[#3B6BFF] to-[#7DA2FF]"}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className={`${WELL} mt-8 flex items-center gap-2 p-3 text-[11px] font-medium text-[#93A0BF]`}>
              <span className="size-1.5 rounded-full bg-[#7DA2FF]" /> Live Resource Telemetry - Zero spreadsheet guesswork.
            </div>
          </StaggerItem>
        </Stagger>
      </section>

      {/* ── Module 02 — on an opening band ── */}
      <ScrollMask inset={5} radius={48} background="bg-gradient-to-b from-[#081130] to-[#060C24]">
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
                <div className="mb-6 text-sm font-semibold text-[#F4F7FF]">Production Cadence &amp; Editorial Calendar</div>

                <div
                  className="public-scroll-region mb-8 w-full overflow-x-auto"
                  role="region"
                  aria-label="Deliverable queue, scroll horizontally to see all columns"
                  tabIndex={0}
                >
                  <table className="w-full min-w-[500px] border-separate border-spacing-y-2 text-left">
                    <thead>
                      <tr className="text-[10px] font-bold uppercase tracking-[0.12em] text-[#93A0BF]">
                        <th className="w-[35%] px-3 pb-1">Deliverable</th>
                        <th className="w-[25%] px-2 pb-1">Status</th>
                        <th className="w-[25%] px-2 pb-1">Owner</th>
                        <th className="w-[15%] px-3 pb-1">Due</th>
                      </tr>
                    </thead>
                    <tbody className="text-xs">
                      {QUEUE.map((row) => (
                        <tr key={row.name} className="group">
                          <td className="rounded-l-xl border-y border-l border-white/[0.07] bg-[#050A1A]/50 px-3 py-4 font-semibold text-[#F4F7FF] transition-colors group-hover:bg-white/[0.04]">
                            {row.name}
                          </td>
                          <td className="border-y border-white/[0.07] bg-[#050A1A]/50 px-2 py-4 transition-colors group-hover:bg-white/[0.04]">
                            <span
                              className={`inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[10px] font-bold ${
                                row.warm ? "border-[#7DD3FC]/25 bg-[#7DD3FC]/10 text-[#7DD3FC]" : "border-[#4F7BFF]/25 bg-[#4F7BFF]/12 text-[#9DB8FF]"
                              }`}
                            >
                              <span className={`size-1.5 rounded-full ${row.warm ? "bg-[#7DD3FC]" : "bg-[#7DA2FF]"}`} /> {row.status}
                            </span>
                          </td>
                          <td className="border-y border-white/[0.07] bg-[#050A1A]/50 px-2 py-4 text-[#93A0BF] transition-colors group-hover:bg-white/[0.04]">
                            {row.owner}
                          </td>
                          <td className="rounded-r-xl border-y border-r border-white/[0.07] bg-[#050A1A]/50 px-3 py-4 font-medium text-[#93A0BF] transition-colors group-hover:bg-white/[0.04]">
                            {row.due}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className={`${WELL} p-5`}>
                  <div className="mb-4 text-xs font-semibold text-[#F4F7FF]">Bottleneck Radar</div>
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                    {RADAR.map((item) => (
                      <div key={item.area} className="rounded-xl border border-white/[0.07] bg-[#050A1A]/60 p-3">
                        <div className="mb-1 text-[10px] text-[#93A0BF]">{item.area}</div>
                        <div className="flex items-center gap-1.5 text-xs font-semibold text-[#F4F7FF]">
                          <span className={`size-1.5 rounded-full ${item.warm ? "animate-pulse bg-[#7DD3FC]" : "bg-[#7DA2FF]"}`} /> {item.load}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </StaggerItem>

              {/* Client portal */}
              <StaggerItem className={`${PANEL} creo-beam flex flex-col`}>
                <div className="mb-1 text-sm font-semibold text-[#F4F7FF]">Velox Studio Client Portal</div>
                <div className="mb-6 text-xs font-medium text-[#93A0BF]">Summer DTC Campaign Reel #04</div>

                <div data-cursor="View" className="relative mb-6 aspect-video w-full overflow-hidden rounded-2xl border border-white/[0.08] bg-[#050A1A]">
                  <DistortImage
                    src="https://images.unsplash.com/photo-1492691527719-9d1e07e534b4?auto=format&fit=crop&w=800&q=80"
                    alt="Cinematic Video Mockup"
                    className="absolute inset-0 size-full"
                    imgClassName="size-full object-cover opacity-75"
                  />
                  <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-black/30" />
                  <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                    <span className="relative flex size-14 items-center justify-center rounded-full border border-white/40 bg-white/10 text-white backdrop-blur-md">
                      {!reduce && <span className="absolute inset-0 animate-ping rounded-full border border-white/30" />}
                      <Play className="ml-0.5 size-5 fill-white" />
                    </span>
                  </div>
                  <div className="pointer-events-none absolute inset-x-0 bottom-0 flex items-center gap-3 px-4 pb-3 pt-6">
                    <div className="shrink-0 text-[10px] font-bold text-[#F4F7FF]">0:00 / 2:34</div>
                    <div className="relative h-1 flex-1 overflow-hidden rounded-full bg-white/20">
                      <GrowBar value={33} className="bg-gradient-to-r from-[#3B6BFF] to-[#7DD3FC]" />
                    </div>
                    <Volume2 className="size-3.5 shrink-0 text-[#F4F7FF]" />
                    <Maximize className="size-3.5 shrink-0 text-[#F4F7FF]" />
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
                          <span className="size-2 animate-pulse rounded-full bg-[#7DD3FC]" />
                          <span className="text-xs font-bold text-[#7DD3FC]">Awaiting Client Approval</span>
                        </>
                      )}
                      {approvalStatus === "approved" && (
                        <span className="text-xs font-bold text-[#9DB8FF]">✓ Approved (Queued for Delivery)</span>
                      )}
                      {approvalStatus === "revision" && (
                        <span className="text-xs font-bold text-[#9DB8FF]">Revision Ticket Created (#231)</span>
                      )}
                    </motion.div>
                  </AnimatePresence>
                  {approvalStatus !== "pending" && (
                    <button
                      type="button"
                      onClick={() => setApprovalStatus("pending")}
                      className="cursor-pointer text-[10px] text-[#93A0BF] underline underline-offset-2 hover:text-[#F4F7FF]"
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
                  <AlertCircle className="mt-0.5 size-4 shrink-0 text-[#93A0BF]" />
                  <p className="text-[11px] leading-relaxed text-[#93A0BF]">
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
            <div className="mb-1 text-sm font-semibold text-[#F4F7FF]">TechCorp Series B &bull; Monthly Creative Retainer</div>
            <div className="mb-8 text-xs text-[#93A0BF]">Balance Sheet &amp; Contribution</div>

            <div className="mb-8 grid grid-cols-1 gap-8 sm:grid-cols-2">
              <Stagger className="space-y-4" gap={0.08}>
                {LEDGER.map((row) => (
                  <StaggerItem key={row.label} className="flex items-center justify-between border-b border-white/[0.07] pb-3 text-xs">
                    <span className="font-medium text-[#93A0BF]">{row.label}</span>
                    <span className={`font-semibold ${row.positive ? "text-[#9DB8FF]" : "text-[#7DD3FC]"}`}>{row.value}</span>
                  </StaggerItem>
                ))}
              </Stagger>

              <div className={`${WELL} flex flex-col justify-between p-4`}>
                <div className="text-[10px] font-bold uppercase tracking-[0.12em] text-[#93A0BF]">Revenue Breakdown</div>
                <div className="mt-4 flex h-36 items-end justify-between px-1 sm:px-2">
                  {BREAKDOWN.map((bar, i) => (
                    <div key={bar.label} className="flex h-full w-12 flex-col items-center justify-end gap-2 sm:w-14">
                      <span className="text-[11px] font-bold text-[#F4F7FF]">{bar.value}%</span>
                      <div className="flex h-[70%] w-6 items-end sm:w-8">
                        <GrowBar vertical value={bar.value / 0.6} delay={i * 0.1} className={`rounded-t-md bg-gradient-to-t ${bar.tone}`} />
                      </div>
                      <span className="w-full text-center text-[10px] text-[#93A0BF] sm:text-[11px]">{bar.label}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="creo-beam flex items-center justify-between rounded-2xl border border-[#4F7BFF]/40 bg-[#4F7BFF]/[0.08] p-5 shadow-[0_20px_50px_-30px_rgba(59,107,255,0.9)]">
              <div>
                <div className="mb-1 text-[10px] font-bold uppercase tracking-[0.12em] text-[#9DB8FF]">Project Contribution Margin</div>
                <div className="text-2xl font-black text-[#F4F7FF]">
                  <CountUp value="₹33,000" />{" "}
                  <span className="text-sm font-bold text-[#9DB8FF]">(41.25%)</span>
                </div>
              </div>
              <DonutRing value={41.25} size={48} />
            </div>
          </StaggerItem>

          {/* Cash flow */}
          <StaggerItem className={`${PANEL} flex flex-col`}>
            <div className="mb-6 text-sm font-semibold text-[#F4F7FF]">Cash Flow Engine &amp; Auto-Chase</div>

            <div className="mb-8 space-y-3">
              {invoices.map((invoice) => (
                <div key={invoice.id} className={`${WELL} flex flex-col justify-between gap-4 p-4 sm:flex-row sm:items-center`}>
                  <div className="flex gap-6">
                    <div>
                      <div className="mb-1 text-[10px] uppercase tracking-[0.1em] text-[#93A0BF]">Invoice</div>
                      <div className="text-sm font-semibold text-[#F4F7FF]">{invoice.id}</div>
                    </div>
                    <div>
                      <div className="mb-1 text-[10px] uppercase tracking-[0.1em] text-[#93A0BF]">Client</div>
                      <div className="text-sm font-semibold text-[#F4F7FF]">{invoice.client}</div>
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center justify-between gap-3 sm:w-[60%] sm:justify-end">
                    <div className="whitespace-nowrap text-sm font-semibold text-[#F4F7FF]">{invoice.amount}</div>
                    <AnimatePresence mode="wait" initial={false}>
                      {invoice.state === "Paid ✓" ? (
                        <motion.span
                          key="paid"
                          initial={{ opacity: 0, scale: 0.85 }}
                          animate={{ opacity: 1, scale: 1 }}
                          exit={{ opacity: 0, scale: 0.85 }}
                          transition={{ type: "spring", stiffness: 400, damping: 22 }}
                          className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-[#4F7BFF]/30 bg-[#4F7BFF]/15 px-2.5 py-1 text-[10px] font-bold text-[#9DB8FF]"
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
                          <span className="shrink-0 text-[10px] font-bold text-[#7DD3FC]">{invoice.state}</span>
                          <button
                            type="button"
                            onClick={() => invoice.set("Paid ✓")}
                            className="shrink-0 cursor-pointer rounded-full bg-[#DCE8FF] px-3 py-1 text-[10px] font-semibold text-[#050A1A] transition-all hover:bg-white hover:shadow-[0_0_20px_rgba(220,232,255,0.3)]"
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
              <div className="flex size-12 shrink-0 items-center justify-center rounded-full bg-[#4F7BFF]/15 ring-1 ring-inset ring-[#4F7BFF]/40">
                <TrendingUp className="size-5 text-[#7DA2FF]" />
              </div>
              <div>
                <div className="text-lg font-black text-[#F4F7FF]">
                  <CountUp value="₹2.1L" /> <span className="text-xs font-medium text-[#93A0BF]">In Collections Pipeline</span>
                </div>
                <div className="mt-1 text-[11px] text-[#93A0BF]">Automated payment follow-ups.</div>
              </div>
            </div>
          </StaggerItem>
        </Stagger>
      </section>
    </div>
  );
}
