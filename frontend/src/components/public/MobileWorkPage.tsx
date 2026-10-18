import { useState, useRef } from "react";
import { Link } from "react-router";
import { ArrowRight, Check, Play, Pause, Volume2, VolumeX, CheckCircle2, Clock, X, Calendar } from "lucide-react";
import { MobileNavBar } from "./MobileNavBar";
import { MobileFooter } from "./MobileFooter";

interface SprintBatch {
  id: number;
  label: string;
  tag: string;
  title: string;
  brand: string;
  statusBadge: string;
  statusColor: "emerald" | "cyan" | "amber";
  specs: string;
  videoUrl: string;
  thumbnailUrl: string;
}

const SPRINT_BATCHES: SprintBatch[] = [
  {
    id: 1,
    label: "Hero Reel (Live)",
    tag: "Hero Reel",
    title: "Cinematic High-Performance Reels",
    brand: "Nike Training // Kinetic Motion",
    statusBadge: "Delivered +2d early",
    statusColor: "emerald",
    specs: "4K 60fps • Ready for Ads",
    videoUrl: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4",
    thumbnailUrl: "https://images.unsplash.com/photo-1517838277536-f5f99be501cd?auto=format&fit=crop&w=1000&q=80",
  },
  {
    id: 2,
    label: "3D Motion",
    tag: "3D Motion",
    title: "3D Product Animation & Motion",
    brand: "Apple Studio // Lumina Pass",
    statusBadge: "Sprint Review Ready",
    statusColor: "cyan",
    specs: "ProRes 422 • Color Graded",
    videoUrl: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4",
    thumbnailUrl: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=1000&q=80",
  },
  {
    id: 3,
    label: "VFX Hook",
    tag: "VFX Hook",
    title: "VFX & Sound-Sync Hook Cut",
    brand: "Gymshark // Viral Audio Lock",
    statusBadge: "Client Sign-off",
    statusColor: "amber",
    specs: "1080x1920 • Dolby Audio",
    videoUrl: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/TearsOfSteel.mp4",
    thumbnailUrl: "https://images.unsplash.com/photo-1574717024653-61fd2cf4d44d?auto=format&fit=crop&w=1000&q=80",
  },
];

export function MobileWorkPage() {
  const [activeConsoleTab, setActiveConsoleTab] = useState<"throughput" | "financial" | "pods">("throughput");
  const [impactDrawerOpen, setImpactDrawerOpen] = useState<boolean>(false);
  const [activeBatch, setActiveBatch] = useState<number>(1);
  const [batchApproval] = useState<Record<number, boolean>>({ 1: true });
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [isMuted, setIsMuted] = useState<boolean>(true);
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [duration, setDuration] = useState<number>(0);
  const videoRef = useRef<HTMLVideoElement>(null);
  const currentBatch = SPRINT_BATCHES.find((b) => b.id === activeBatch) ?? SPRINT_BATCHES[0]!;

  const togglePlay = () => {
    if (!videoRef.current) return;
    if (isPlaying) {
      videoRef.current.pause();
    } else {
      videoRef.current.play().catch(() => {});
    }
  };

  const toggleMute = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!videoRef.current) return;
    videoRef.current.muted = !isMuted;
    setIsMuted(!isMuted);
  };

  const handleBatchChange = (batchId: number) => {
    setActiveBatch(batchId);
    setIsPlaying(false);
    setCurrentTime(0);
    if (videoRef.current) {
      videoRef.current.pause();
      videoRef.current.currentTime = 0;
    }
  };

  const formatTime = (seconds: number) => {
    if (isNaN(seconds) || seconds < 0) return "00:00";
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  return (
    <div className="relative w-full max-w-[430px] mx-auto min-h-screen bg-[#0B111C] text-[#F8FAFC] border-x border-[#2A3446] flex flex-col font-plus-jakarta antialiased selection:bg-[#7FA0D6]/30 selection:text-[#BCCCE6]">
      {/* 1. Header with full menu bar */}
      <MobileNavBar
        statusBadge="Ops Online"
        statusType="cyan"
        ctaText="Book Demo"
        onCtaClick={() => {
          const el = document.getElementById("cta-footer");
          el?.scrollIntoView({ behavior: "smooth" });
        }}
      />

      <main className="flex-1 flex flex-col gap-4 px-4 pt-3 pb-6">
        {/* 2. Hero Section */}
        <section className="flex flex-col gap-3" data-purpose="hero-module">
          <div className="inline-flex items-center gap-2 self-start px-2 py-0.5 rounded-md bg-[#161F2D] border border-[#2A3446]">
            <span className="h-1.5 w-1.5 rounded-full bg-[#7FA0D6]" />
            <span className="text-[9.5px] uppercase font-space-grotesk font-bold tracking-widest text-[#7FA0D6]">
              Agency OS Paradigm
            </span>
          </div>

          <h1 className="text-[27px] leading-[1.12] font-extrabold tracking-tight text-[#F8FAFC]">
            How modern creative agencies{" "}
            <span className="text-[#7FA0D6]">
              operate on CREO.
            </span>
          </h1>

          <p className="text-[12px] leading-snug text-[#97A0B3] tracking-tight font-normal">
            Replace fragmented PM tools, manual Slack chasing, and bloated overhead with a single autonomous creative production engine.
          </p>

          <button
            type="button"
            onClick={() => {
              const el = document.getElementById("approval-studio");
              el?.scrollIntoView({ behavior: "smooth" });
            }}
            className="w-full mt-1 py-3 px-4 rounded-xl font-bold text-xs tracking-wide text-[#050810] bg-[#BCCCE6] hover:bg-white shadow-[0_0_20px_rgba(188,204,230,0.3)] active:scale-[0.98] transition flex items-center justify-center gap-2 cursor-pointer"
          >
            <span>Tour the CREO Ops Suite</span>
            <ArrowRight className="w-3.5 h-3.5 stroke-[2.5]" />
          </button>
        </section>

        {/* 3. Unified 4-Metric Bento HUD Capsule */}
        <section className="rounded-2xl border border-[#2A3446] bg-[#161F2D] backdrop-blur-xl p-3 shadow-inner relative overflow-hidden" data-purpose="telemetry-bento-hud">
          <div className="grid grid-cols-2 gap-2 divide-x divide-[#2A3446]">
            {/* Top Row Left */}
            <div className="p-2.5 flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="text-[9.5px] font-space-grotesk uppercase tracking-wider text-[#97A0B3] font-semibold">
                  Turnaround SLA
                </span>
                <span className="text-[9px] font-space-grotesk px-1.5 py-0.5 rounded bg-[#0B111C] text-[#7FA0D6] border border-[#2A3446] font-bold">
                  +71%
                </span>
              </div>
              <div className="mt-2 text-2xl font-black tracking-tight text-[#F8FAFC] font-space-grotesk">
                18-24<span className="text-sm font-semibold text-[#97A0B3] ml-0.5">h</span>
              </div>
              <span className="text-[10px] text-[#97A0B3] mt-0.5 font-medium">From brief to final cut</span>
            </div>

            {/* Top Row Right */}
            <div className="p-2.5 pl-3.5 flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="text-[9.5px] font-space-grotesk uppercase tracking-wider text-[#97A0B3] font-semibold">
                  Velocity Multiple
                </span>
                <span className="text-[9px] font-space-grotesk px-1.5 py-0.5 rounded bg-[#0B111C] text-[#7FA0D6] border border-[#2A3446] font-bold">
                  Scale
                </span>
              </div>
              <div className="mt-2 text-2xl font-black tracking-tight text-[#F8FAFC] font-space-grotesk">
                9.48<span className="text-sm font-semibold text-[#7FA0D6]">x</span>
              </div>
              <span className="text-[10px] text-[#97A0B3] mt-0.5 font-medium">Monthly creative output</span>
            </div>
          </div>

          <div className="my-1 border-t border-[#2A3446]" />

          <div className="grid grid-cols-2 gap-2 divide-x divide-[#2A3446]">
            {/* Bottom Row Left */}
            <div className="p-2.5 flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="text-[9.5px] font-space-grotesk uppercase tracking-wider text-[#97A0B3] font-semibold">
                  On-Time Delivery
                </span>
                <span className="text-[9px] font-space-grotesk px-1.5 py-0.5 rounded bg-[#0B111C] text-[#BCCCE6] border border-[#2A3446] font-bold">
                  SLA
                </span>
              </div>
              <div className="mt-2 text-2xl font-black tracking-tight text-[#F8FAFC] font-space-grotesk">
                100<span className="text-base font-semibold text-[#97A0B3]">%</span>
              </div>
              <span className="text-[10px] text-[#97A0B3] mt-0.5 font-medium">Zero missed client releases</span>
            </div>

            {/* Bottom Row Right */}
            <div className="p-2.5 pl-3.5 flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="text-[9.5px] font-space-grotesk uppercase tracking-wider text-[#97A0B3] font-semibold">
                  Margin Retained
                </span>
                <span className="text-[9px] font-space-grotesk px-1.5 py-0.5 rounded bg-[#0B111C] text-[#D8BF9B] border border-[#2A3446] font-bold">
                  Net
                </span>
              </div>
              <div className="mt-2 text-2xl font-black tracking-tight text-[#7FA0D6] font-space-grotesk">
                +48.8<span className="text-base font-semibold text-[#BCCCE6]">%</span>
              </div>
              <span className="text-[10px] text-[#97A0B3] mt-0.5 font-medium">Freelancer bloat removed</span>
            </div>
          </div>
        </section>

        {/* 4. Live Operations Studio (Dynamic Segmented Console) */}
        <section className="flex flex-col gap-2.5">
          <div className="flex items-center justify-between px-1">
            <span className="text-[10px] font-space-grotesk uppercase tracking-widest text-[#97A0B3] font-bold flex items-center gap-1.5">
              <span className="text-[#7FA0D6]">⚡</span> Agency Ops Command
            </span>
            <span className="text-[9px] font-space-grotesk text-[#7FA0D6] bg-[#161F2D] border border-[#2A3446] px-2 py-0.5 rounded-full font-semibold">
              SYNCED LIVE
            </span>
          </div>

          {/* Segmented Switcher */}
          <div className="p-1 rounded-xl bg-[#050810] border border-[#2A3446] grid grid-cols-3 gap-1 shadow-inner">
            {[
              { id: "throughput", label: "⚡ Live Load" },
              { id: "financial", label: "📊 Telemetry" },
              { id: "pods", label: "👥 Pod Radar" },
            ].map((tab) => {
              const isSelected = activeConsoleTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveConsoleTab(tab.id as any)}
                  className={`py-2 px-1 text-[11px] font-semibold rounded-lg transition-all flex items-center justify-center gap-1 cursor-pointer ${
                    isSelected
                      ? "bg-[#161F2D] border border-[#7FA0D6]/40 text-[#7FA0D6] shadow-[0_0_12px_rgba(127,160,214,0.15)] font-bold"
                      : "text-[#97A0B3] border border-transparent hover:text-[#F8FAFC]"
                  }`}
                >
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>

          {/* Dynamic Console Card Container */}
          <div className="rounded-2xl border border-[#2A3446] bg-[#161F2D] backdrop-blur-2xl p-3.5 shadow-xl min-h-[220px]">
            {activeConsoleTab === "throughput" && (
              <div className="flex flex-col gap-3 animate-in fade-in duration-200">
                <div className="flex items-center justify-between pb-2.5 border-b border-[#2A3446]">
                  <div>
                    <span className="text-[10px] font-space-grotesk uppercase tracking-wider text-[#97A0B3]">
                      Total Studio Run Rate
                    </span>
                    <div className="text-xl font-bold tracking-tight text-[#F8FAFC] flex items-center gap-2 mt-0.5 font-space-grotesk">
                      ₹1,26,67,000
                      <span className="text-[9.5px] font-space-grotesk font-medium text-[#7FA0D6] bg-[#0B111C] border border-[#2A3446] px-1.5 py-0.5 rounded">
                        +31.4% MoM
                      </span>
                    </div>
                  </div>
                  {/* Radial Activity Dial Gauge */}
                  <div className="relative w-12 h-12 flex items-center justify-center">
                    <svg className="w-12 h-12 -rotate-90">
                      <circle className="text-[#0B111C]" cx="24" cy="24" fill="transparent" r="18" stroke="currentColor" strokeWidth="3.5" />
                      <circle className="text-[#7FA0D6]" cx="24" cy="24" fill="transparent" r="18" stroke="currentColor" strokeDasharray="113" strokeDashoffset="15" strokeLinecap="round" strokeWidth="3.5" />
                    </svg>
                    <div className="absolute text-[10px] font-space-grotesk font-bold text-[#F8FAFC]">
                      87<span className="text-[8px] text-[#7FA0D6]">%</span>
                    </div>
                  </div>
                </div>

                <div className="flex flex-col gap-2">
                  <span className="text-[9px] font-space-grotesk uppercase tracking-wider text-[#97A0B3] font-semibold">
                    Active Studio Batches
                  </span>
                  <div className="p-2 rounded-xl bg-[#0B111C] border border-[#2A3446] flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <span className="w-2 h-2 rounded-full bg-[#7FA0D6]" />
                      <div>
                        <div className="text-[11px] font-bold text-[#F8FAFC] leading-tight">
                          Bumble / 9:16 UGC Retarget
                        </div>
                        <div className="text-[9px] font-space-grotesk text-[#97A0B3]">
                          Pod 03 • 4 Variations ready
                        </div>
                      </div>
                    </div>
                    <span className="px-2 py-0.5 rounded text-[9px] font-space-grotesk font-bold bg-[#161F2D] text-[#7FA0D6] border border-[#2A3446]">
                      Delivered
                    </span>
                  </div>

                  <div className="p-2 rounded-xl bg-[#0B111C] border border-[#2A3446] flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <span className="w-2 h-2 rounded-full bg-[#7FA0D6] animate-pulse" />
                      <div>
                        <div className="text-[11px] font-bold text-[#F8FAFC] leading-tight">
                          Zepto / Q-Commerce Launch
                        </div>
                        <div className="text-[9px] font-space-grotesk text-[#97A0B3]">
                          Pod 01 • Color pass & VFX
                        </div>
                      </div>
                    </div>
                    <span className="px-2 py-0.5 rounded text-[9px] font-space-grotesk font-bold bg-[#161F2D] text-[#BCCCE6] border border-[#2A3446]">
                      Rendering 82%
                    </span>
                  </div>
                </div>
              </div>
            )}

            {activeConsoleTab === "financial" && (
              <div className="flex flex-col gap-3 animate-in fade-in duration-200">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-[10px] font-space-grotesk uppercase tracking-wider text-[#97A0B3]">
                      Monthly Leakage Prevented
                    </span>
                    <div className="text-xl font-bold tracking-tight text-[#F8FAFC] mt-0.5 font-space-grotesk">
                      ₹84,200<span className="text-xs font-normal text-[#97A0B3]"> / pod</span>
                    </div>
                  </div>
                  <span className="text-[9px] font-space-grotesk text-[#D8BF9B] bg-[#0B111C] border border-[#2A3446] px-2 py-0.5 rounded font-bold">
                    +38.6% ROI
                  </span>
                </div>

                <div className="p-2.5 rounded-xl bg-[#0B111C] border border-[#2A3446] flex flex-col gap-2">
                  <div className="flex items-end justify-between h-14 px-2 pt-2 gap-3">
                    <div className="flex-1 flex flex-col items-center gap-1">
                      <div className="w-full bg-[#161F2D] rounded-t h-6 border-t border-x border-[#2A3446]" />
                      <span className="text-[8px] font-space-grotesk text-[#97A0B3]">STARTER</span>
                    </div>
                    <div className="flex-1 flex flex-col items-center gap-1">
                      <div className="w-full bg-[#2A3446] rounded-t h-9" />
                      <span className="text-[8px] font-space-grotesk text-[#97A0B3]">SCALE</span>
                    </div>
                    <div className="flex-1 flex flex-col items-center gap-1">
                      <div className="w-full bg-[#7FA0D6] rounded-t h-12 shadow-[0_0_12px_rgba(127,160,214,0.4)]" />
                      <span className="text-[8px] font-space-grotesk text-[#7FA0D6] font-bold">PRO</span>
                    </div>
                    <div className="flex-1 flex flex-col items-center gap-1">
                      <div className="w-full bg-[#BCCCE6] rounded-t h-14" />
                      <span className="text-[8px] font-space-grotesk text-[#BCCCE6] font-bold">ENTERP.</span>
                    </div>
                  </div>
                  <div className="text-[10px] text-center text-[#97A0B3] font-space-grotesk">
                    Consolidates 4 SaaS subscriptions + 2 coordinator hires
                  </div>
                </div>
              </div>
            )}

            {activeConsoleTab === "pods" && (
              <div className="flex flex-col gap-2.5 animate-in fade-in duration-200">
                <div className="flex items-center justify-between pb-1 border-b border-[#2A3446]">
                  <span className="text-[10px] font-space-grotesk uppercase text-[#97A0B3]">
                    Studio Pod 01 Utilization
                  </span>
                  <span className="text-[10px] font-space-grotesk text-[#7FA0D6] font-bold">
                    Healthy • 75% Avg
                  </span>
                </div>

                <div className="space-y-1">
                  <div className="flex justify-between text-[10px] font-semibold text-[#F8FAFC]">
                    <span>Lead Motion Designer</span>
                    <span className="font-space-grotesk text-[#7FA0D6]">85%</span>
                  </div>
                  <div className="w-full bg-[#0B111C] h-1.5 rounded-full overflow-hidden border border-[#2A3446]">
                    <div className="bg-[#7FA0D6] h-full rounded-full" style={{ width: "85%" }} />
                  </div>
                </div>

                <div className="space-y-1">
                  <div className="flex justify-between text-[10px] font-semibold text-[#F8FAFC]">
                    <span>Post Production Editor</span>
                    <span className="font-space-grotesk text-[#7FA0D6]">78%</span>
                  </div>
                  <div className="w-full bg-[#0B111C] h-1.5 rounded-full overflow-hidden border border-[#2A3446]">
                    <div className="bg-[#7FA0D6] h-full rounded-full" style={{ width: "78%" }} />
                  </div>
                </div>

                <div className="space-y-1">
                  <div className="flex justify-between text-[10px] font-semibold text-[#F8FAFC]">
                    <span>3D / VFX Specialist</span>
                    <span className="font-space-grotesk text-[#BCCCE6]">62%</span>
                  </div>
                  <div className="w-full bg-[#0B111C] h-1.5 rounded-full overflow-hidden border border-[#2A3446]">
                    <div className="bg-[#BCCCE6] h-full rounded-full" style={{ width: "62%" }} />
                  </div>
                </div>
              </div>
            )}
          </div>
        </section>

        {/* 5. Client Case Spotlight Dossier */}
        <section className="flex flex-col gap-2.5" data-purpose="client-case-dossier">
          <div className="flex items-center justify-between px-1">
            <span className="text-[10px] font-space-grotesk uppercase tracking-widest text-[#97A0B3] font-bold">
              Direct Founder Radar
            </span>
            <span className="text-[9px] font-space-grotesk text-[#7FA0D6]">VERIFIED CLIENT RECORD</span>
          </div>

          <div className="rounded-2xl border border-[#2A3446] bg-[#161F2D] backdrop-blur-xl p-3.5 shadow-lg flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-[#D8BF9B] text-[#050810] font-black text-sm flex items-center justify-center font-sans shadow-md">
                  YB
                </div>
                <div>
                  <div className="text-xs font-bold text-[#F8FAFC] flex items-center gap-1">
                    Yellow Box Fitness Studio
                    <CheckCircle2 className="w-3.5 h-3.5 text-[#7FA0D6]" />
                  </div>
                  <div className="text-[10px] font-space-grotesk text-[#97A0B3]">Scale Retainer • Active 14 mos</div>
                </div>
              </div>
              <span className="px-2 py-0.5 rounded text-[9px] font-space-grotesk bg-[#0B111C] text-[#7FA0D6] border border-[#2A3446] font-semibold">
                1 Pod Active
              </span>
            </div>

            <p className="text-xs italic text-[#F8FAFC] leading-relaxed pl-2 border-l-2 border-[#7FA0D6]">
              "CREO replaced 3 separate freelancer contracts and cut our turnaround from 5 days to under 24 hours without sacrificing a single pixel."
            </p>

            <div className="grid grid-cols-3 gap-1.5 pt-1">
              <div className="p-1.5 rounded-lg bg-[#0B111C] border border-[#2A3446] text-center">
                <div className="text-xs font-bold text-[#F8FAFC] font-space-grotesk">1 Pod</div>
                <div className="text-[8px] uppercase tracking-wider text-[#97A0B3]">Dedicated</div>
              </div>
              <div className="p-1.5 rounded-lg bg-[#0B111C] border border-[#2A3446] text-center">
                <div className="text-xs font-bold text-[#7FA0D6] font-space-grotesk">12 Reels</div>
                <div className="text-[8px] uppercase tracking-wider text-[#97A0B3]">Weekly Cadence</div>
              </div>
              <div className="p-1.5 rounded-lg bg-[#0B111C] border border-[#2A3446] text-center">
                <div className="text-xs font-bold text-[#BCCCE6] font-space-grotesk">2.1h</div>
                <div className="text-[8px] uppercase tracking-wider text-[#97A0B3]">Review SLA</div>
              </div>
            </div>

            <div>
              <button
                type="button"
                onClick={() => setImpactDrawerOpen(!impactDrawerOpen)}
                className="w-full py-1.5 px-2.5 rounded-lg bg-[#0B111C] border border-[#2A3446] text-[10px] font-space-grotesk font-medium text-[#97A0B3] hover:text-[#F8FAFC] flex items-center justify-between transition cursor-pointer"
              >
                <span className="flex items-center gap-1.5">
                  <span className="text-[#7FA0D6]">{impactDrawerOpen ? "▴" : "▾"}</span> View Operational Impact Delta
                </span>
                <span className="text-[9px] text-[#97A0B3]">{impactDrawerOpen ? "Tap to collapse" : "Tap to expand"}</span>
              </button>

              {impactDrawerOpen && (
                <div className="mt-2 pt-2 border-t border-[#2A3446] flex flex-col gap-1.5 text-[11px] animate-in fade-in duration-200">
                  <div className="flex justify-between items-center text-[#F8FAFC]">
                    <span className="text-[#97A0B3]">Freelancer Burn:</span>
                    <span className="line-through text-[#D8BF9B] font-space-grotesk">₹1,90,000/mo</span>
                  </div>
                  <div className="flex justify-between items-center text-[#F8FAFC]">
                    <span className="text-[#97A0B3]">CREO Consolidated:</span>
                    <span className="text-[#7FA0D6] font-space-grotesk font-bold">₹1,15,000/mo</span>
                  </div>
                  <div className="flex justify-between items-center text-[#F8FAFC]">
                    <span className="text-[#97A0B3]">Net Annual Saved:</span>
                    <span className="text-[#BCCCE6] font-space-grotesk font-bold">₹9,00,000+</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        </section>

        {/* 6. Sprint & 1-Click Approval Studio with Live Video Engine */}
        <section className="flex flex-col gap-2.5" id="approval-studio">
          <div className="flex items-center justify-between px-1">
            <span className="text-[10px] font-space-grotesk uppercase tracking-widest text-[#97A0B3] font-bold flex items-center gap-1.5">
              <span className="text-[#7FA0D6]">⚡</span> Sprint Approval Engine
            </span>
            <span className="text-[9px] font-space-grotesk text-[#7FA0D6] bg-[#161F2D] border border-[#2A3446] px-2 py-0.5 rounded-full font-semibold">
              1-CLICK PIPELINE
            </span>
          </div>

          <div className="rounded-2xl border border-[#2A3446] bg-[#161F2D] backdrop-blur-xl p-3 shadow-xl flex flex-col gap-2.5">
            <div className="flex items-center justify-between">
              <div className="flex gap-1.5">
                {SPRINT_BATCHES.map((b) => {
                  const isSelected = activeBatch === b.id;
                  const isBatchDone = !!batchApproval[b.id];
                  return (
                    <button
                      key={b.id}
                      type="button"
                      onClick={() => handleBatchChange(b.id)}
                      className={`px-2.5 py-1 rounded-lg text-[9.5px] font-space-grotesk font-bold transition-all cursor-pointer flex items-center gap-1 ${
                        isSelected
                          ? "bg-[#161F2D] text-[#7FA0D6] border border-[#7FA0D6] shadow-[0_0_12px_rgba(127,160,214,0.25)]"
                          : "bg-[#0B111C] text-[#97A0B3] border border-[#2A3446] hover:text-[#F8FAFC]"
                      }`}
                    >
                      <span>{b.tag}</span>
                      {isBatchDone && <span className="text-[#7FA0D6] text-[10px]">✓</span>}
                    </button>
                  );
                })}
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-[#7FA0D6] animate-pulse" />
                <span className="text-[9px] font-space-grotesk text-[#97A0B3] truncate max-w-[120px]">
                  {currentBatch.brand}
                </span>
              </div>
            </div>

            {/* Interactive Video & Image Preview Window */}
            <div 
              className="relative w-full aspect-video rounded-xl bg-[#050810] border border-[#2A3446] overflow-hidden flex items-center justify-center group shadow-2xl cursor-pointer"
              onClick={togglePlay}
            >
              {/* Actual HTML5 Video Element */}
              <video
                ref={videoRef}
                key={currentBatch.videoUrl}
                src={currentBatch.videoUrl}
                poster={currentBatch.thumbnailUrl}
                playsInline
                muted={isMuted}
                preload="metadata"
                onPlay={() => setIsPlaying(true)}
                onPause={() => setIsPlaying(false)}
                onTimeUpdate={() => {
                  if (videoRef.current) {
                    setCurrentTime(videoRef.current.currentTime);
                  }
                }}
                onLoadedMetadata={() => {
                  if (videoRef.current) {
                    setDuration(videoRef.current.duration);
                  }
                }}
                onEnded={() => setIsPlaying(false)}
                className={`w-full h-full object-cover transition-opacity duration-300 ${
                  isPlaying ? "opacity-100" : "opacity-0 absolute pointer-events-none"
                }`}
              />

              {/* High-Resolution Thumbnail Image (visible when not playing) */}
              {!isPlaying && (
                <>
                  <img
                    src={currentBatch.thumbnailUrl}
                    alt={currentBatch.title}
                    className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                  {/* Subtle dark vignette overlay for contrast */}
                  <div className="absolute inset-0 bg-gradient-to-t from-[#050810]/90 via-[#0B111C]/40 to-transparent" />

                  {/* Prominent Center Play Button with Glowing Ripple */}
                  <div className="absolute inset-0 z-10 flex flex-col items-center justify-center transition-all">
                    <div className="w-14 h-14 rounded-full bg-[#161F2D]/80 border-2 border-[#7FA0D6] backdrop-blur-md flex items-center justify-center text-[#BCCCE6] shadow-[0_0_30px_rgba(127,160,214,0.45)] group-hover:scale-110 active:scale-95 transition-all">
                      <Play className="w-6 h-6 ml-1 fill-[#7FA0D6] text-[#7FA0D6]" />
                    </div>
                    <span className="mt-2.5 text-[9.5px] font-space-grotesk uppercase tracking-wider text-[#F8FAFC] font-bold bg-[#0B111C]/90 px-3 py-1 rounded-full border border-[#2A3446] backdrop-blur-md shadow-lg flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#7FA0D6] animate-pulse" />
                      Play {currentBatch.tag}
                    </span>
                  </div>
                </>
              )}

              {/* Status Badge Top Left */}
              <div className="absolute top-2.5 left-2.5 z-20 px-2 py-0.5 rounded-full bg-[#050810]/85 border border-[#2A3446] text-[9px] font-space-grotesk font-semibold backdrop-blur-md flex items-center gap-1 shadow-md pointer-events-none">
                <span className="w-1.5 h-1.5 rounded-full bg-[#7FA0D6] shadow-[0_0_8px_rgba(127,160,214,0.6)]" />
                <span className="text-[#7FA0D6]">
                  {currentBatch.statusBadge}
                </span>
              </div>

              {/* Mute/Unmute Toggle Top Right (visible when playing) */}
              {isPlaying && (
                <button
                  type="button"
                  onClick={toggleMute}
                  aria-label={isMuted ? "Unmute audio" : "Mute audio"}
                  className="absolute top-2.5 right-2.5 z-20 p-1.5 rounded-lg bg-[#050810]/80 hover:bg-[#161F2D] border border-[#2A3446] text-[#97A0B3] hover:text-[#F8FAFC] backdrop-blur-md transition cursor-pointer active:scale-95 shadow-md"
                >
                  {isMuted ? (
                    <VolumeX className="w-3.5 h-3.5 text-[#D8BF9B]" />
                  ) : (
                    <Volume2 className="w-3.5 h-3.5 text-[#7FA0D6]" />
                  )}
                </button>
              )}

              {/* Bottom Video Controls HUD */}
              <div 
                className="absolute bottom-0 inset-x-0 z-20 px-2.5 py-1.5 bg-gradient-to-t from-[#050810]/95 via-[#050810]/70 to-transparent flex flex-col gap-1 text-[9px] font-space-grotesk text-[#97A0B3]"
                onClick={(e) => e.stopPropagation()}
              >
                {/* Timeline Progress Scrubber */}
                <div
                  className="w-full bg-[#2A3446] hover:bg-[#2A3446]/80 h-1.5 rounded-full cursor-pointer overflow-hidden transition-all"
                  onClick={(e) => {
                    const rect = e.currentTarget.getBoundingClientRect();
                    const clickX = e.clientX - rect.left;
                    const newTime = (clickX / rect.width) * (duration || 1);
                    if (videoRef.current) {
                      videoRef.current.currentTime = newTime;
                      setCurrentTime(newTime);
                    }
                  }}
                >
                  <div
                    className="bg-[#7FA0D6] h-full transition-[width] duration-100 shadow-[0_0_8px_rgba(127,160,214,0.5)]"
                    style={{ width: `${duration > 0 ? (currentTime / duration) * 100 : 0}%` }}
                  />
                </div>

                {/* Info row */}
                <div className="flex items-center justify-between pt-0.5">
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={togglePlay}
                      className="text-[#7FA0D6] hover:text-[#F8FAFC] transition cursor-pointer"
                    >
                      {isPlaying ? (
                        <Pause className="w-3 h-3 fill-current" />
                      ) : (
                        <Play className="w-3 h-3 fill-current" />
                      )}
                    </button>
                    <span className="text-[#F8FAFC]">
                      {formatTime(currentTime)} / {formatTime(duration || 15)}
                    </span>
                  </div>
                  <span className="text-[#7FA0D6] font-bold tracking-tight">
                    {currentBatch.specs}
                  </span>
                </div>
              </div>
            </div>

            {/* 3-Deliverable Visual Strip: Image with Play Button for All 3 Deliverables */}
            <div className="flex flex-col gap-1.5 pt-1">
              <div className="flex items-center justify-between text-[9px] font-space-grotesk text-[#97A0B3] px-0.5">
                <span className="uppercase tracking-wider font-semibold">Sprint Deliverables:</span>
                <span className="text-[#7FA0D6] font-medium">Tap to switch reel</span>
              </div>
              <div className="grid grid-cols-3 gap-2">
                {SPRINT_BATCHES.map((b) => {
                  const isSelected = activeBatch === b.id;
                  return (
                    <button
                      key={b.id}
                      type="button"
                      onClick={() => handleBatchChange(b.id)}
                      className={`relative aspect-[16/10] rounded-xl overflow-hidden border transition-all cursor-pointer group text-left ${
                        isSelected
                          ? "border-[#7FA0D6] ring-2 ring-[#7FA0D6]/40 shadow-[0_0_15px_rgba(127,160,214,0.35)] scale-[1.02]"
                          : "border-[#2A3446] opacity-75 hover:opacity-100 hover:border-[#7FA0D6]/40"
                      }`}
                    >
                      {/* Deliverable Image */}
                      <img
                        src={b.thumbnailUrl}
                        alt={b.title}
                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-[#050810]/85 via-[#0B111C]/35 to-transparent" />
                      
                      {/* Play Button on Each Deliverable Image */}
                      <div className="absolute inset-0 flex items-center justify-center">
                        <div className={`w-6 h-6 rounded-full flex items-center justify-center transition-all ${
                          isSelected
                            ? "bg-[#161F2D]/90 border border-[#7FA0D6] text-[#7FA0D6] shadow-[0_0_10px_rgba(127,160,214,0.4)] scale-110"
                            : "bg-[#050810]/70 border border-[#2A3446] text-[#F8FAFC] group-hover:scale-110"
                        }`}>
                          <Play className="w-3 h-3 fill-current ml-0.5" />
                        </div>
                      </div>

                      {/* Deliverable Tag & Approval Status */}
                      <div className="absolute bottom-1 inset-x-1.5 flex items-center justify-between">
                        <span className={`text-[8.5px] font-space-grotesk font-bold uppercase tracking-wider truncate ${
                          isSelected ? "text-[#7FA0D6]" : "text-[#F8FAFC]"
                        }`}>
                          {b.tag}
                        </span>
                        {batchApproval[b.id] && (
                          <span className="text-[9px] text-[#7FA0D6] font-bold">✓</span>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Tactile Quick-Action Dock - Non-Clickable Display */}
            <div className="flex flex-col gap-2 pt-1 select-none pointer-events-none">
              <div className="w-full py-2.5 px-3 rounded-xl text-xs font-bold bg-[#BCCCE6] text-[#050810] flex items-center justify-center gap-2 shadow-sm cursor-default">
                <Check className="w-4 h-4 stroke-[3]" />
                <span>Click Approve Batch</span>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="py-2.5 px-2 rounded-xl text-xs font-semibold text-[#F8FAFC] bg-[#0B111C] border border-[#2A3446] flex items-center justify-center gap-1.5 text-center cursor-default">
                  <Clock className="w-3.5 h-3.5 text-[#7FA0D6]" />
                  <span>Timecode Notes</span>
                </div>
                <div className="py-2.5 px-2 rounded-xl text-xs font-semibold text-[#F8FAFC] bg-[#0B111C] border border-[#2A3446] flex items-center justify-center gap-1.5 text-center cursor-default">
                  <X className="w-3.5 h-3.5 text-[#D8BF9B]" />
                  <span>Request Revision</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* 7. High-Impact Finale Capsule & CTA */}
        <section
          id="cta-footer"
          className="mt-2 rounded-3xl border border-[#2A3446] bg-gradient-to-b from-[#161F2D] to-[#050810] p-5 shadow-2xl relative overflow-hidden text-center flex flex-col items-center gap-3"
          data-purpose="closing-banner"
        >
          <div className="text-[10px] font-space-grotesk uppercase tracking-widest text-[#7FA0D6] font-bold">
            Zero Friction Migration
          </div>
          <h2 className="text-xl font-black text-[#F8FAFC] leading-tight tracking-tight">
            Stop managing the chaos.
            <br />
            <span className="text-[#7FA0D6]">
              Start operating momentum.
            </span>
          </h2>
          <p className="text-xs text-[#97A0B3] max-w-[300px]">
            Connect your Slack or Linear in under 3 minutes. Your dedicated pods spin up immediately.
          </p>

          {/* Dual Action Buttons (Side by Side: Left and Right) */}
          <div className="w-full flex items-center gap-2 pt-1.5">
            <Link
              to="/signup"
              className="flex-1 h-10 px-3 rounded-full bg-[#BCCCE6] hover:bg-white text-[#050810] font-bold text-[11px] whitespace-nowrap flex items-center justify-center gap-1.5 shadow-[0_4px_16px_rgba(188,204,230,0.25)] active:scale-95 transition-all cursor-pointer"
            >
              <span>Deploy CREO</span>
              <ArrowRight className="w-3.5 h-3.5 stroke-[2.5]" />
            </Link>

            <a
              href="https://wa.me/919941999415"
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 h-10 px-3 rounded-full bg-[#0B111C] hover:bg-[#161F2D] border border-[#2A3446] text-[#F8FAFC] font-semibold text-[11px] whitespace-nowrap flex items-center justify-center gap-1.5 active:scale-95 transition-all cursor-pointer shadow-sm"
            >
              <Calendar className="w-3.5 h-3.5 text-[#7FA0D6]" />
              <span>Founder Demo</span>
            </a>
          </div>
        </section>
      </main>

      {/* 8. Unified Super Mobile Footer */}
      <MobileFooter />
    </div>
  );
}
