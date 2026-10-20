import { useState } from "react";
import { Link } from "react-router";
import { Check, CheckCircle2, ArrowRight, Shield, Rocket, Calendar, Sparkles } from "lucide-react";
import { MobileNavBar } from "./MobileNavBar";
import { MobileFooter } from "./MobileFooter";

interface TierData {
  name: string;
  eyebrow: string;
  badgeText: string;
  price: string;
  reels: string;
  posts: string;
  stories: string;
  sla: string;
  features: string[];
  cta: string;
  planParam: string;
}

const TIERS_DATA: TierData[] = [
  {
    name: "Starter Growth",
    eyebrow: "Entry Studio Tier",
    badgeText: "DISPATCH READY",
    price: "₹25,000",
    reels: "4",
    posts: "8",
    stories: "10",
    sla: "1 included revision round",
    features: [
      "8 Static brand posters (1:1 & 4:5)",
      "4 High-impact 9:16 mobile reels",
      "Instagram auto-schedule & dispatch",
      "Live analytics dashboard access",
    ],
    cta: "Choose Starter Growth",
    planParam: "Starter",
  },
  {
    name: "Brand Accelerator",
    eyebrow: "Recommended Plan",
    badgeText: "TOP CHOICE",
    price: "₹50,000",
    reels: "8",
    posts: "15",
    stories: "20",
    sla: "2 included revision rounds",
    features: [
      "15 Static brand posters (multi-format)",
      "8 Cinematic reels with audio sync",
      "Dedicated creative dir. & copywriter",
      "Cross-publishing & hashtag matrix",
    ],
    cta: "Choose Brand Accelerator",
    planParam: "Growth",
  },
  {
    name: "Scale Studio",
    eyebrow: "Maximum Throughput",
    badgeText: "ENTERPRISE CADENCE",
    price: "₹1,00,000",
    reels: "16",
    posts: "30",
    stories: "40",
    sla: "3 included revision rounds",
    features: [
      "30 Static brand posters & custom decks",
      "16 High-prod 4K reels & UGC composites",
      "Dedicated Sr. Director & VFX Lead",
      "On-demand custom edits (24h turnaround)",
    ],
    cta: "Choose Scale Studio",
    planParam: "Scale",
  },
];

interface CategoryMatrix {
  name: string;
  starter: string;
  growth: string;
  scale: string;
}

const CATEGORIES_DATA: CategoryMatrix[] = [
  {
    name: "Client Approval Architecture",
    starter: "1-Click Direct Review Links",
    growth: "Automated Revision SLA Engine",
    scale: "Whitelabel Custom CNAME Domain",
  },
  {
    name: "Capacity & Workload Radar",
    starter: "Basic Pod Meters",
    growth: "Multi-Role Heatmaps (82% Alerts)",
    scale: "Predictive Pod Resourcing AI",
  },
  {
    name: "Financial & Unit Economics",
    starter: "Automated Invoicing",
    growth: "Full Contribution Ledger (41.25%)",
    scale: "Multi-Entity Group P&L Engine",
  },
  {
    name: "Collections Pipeline",
    starter: "Manual Reminders System",
    growth: "Auto-Chase Cadence (7-Day Cycle)",
    scale: "Custom ERP & Global Gateways",
  },
  {
    name: "Seats & Security Protocol",
    starter: "10 Included Studio Seats",
    growth: "30 Seats + Role-Based Access",
    scale: "Unlimited Seats + SOC-2 Type II",
  },
];

export function MobilePricingPage() {
  const [activeTier, setActiveTier] = useState<number>(1);
  const [activeCategory, setActiveCategory] = useState<number>(0);
  const [matrixExpanded, setMatrixExpanded] = useState<boolean>(false);
  const [isFading, setIsFading] = useState<boolean>(false);

  const switchTier = (index: number) => {
    setIsFading(true);
    setTimeout(() => {
      setActiveTier(index);
      setIsFading(false);
    }, 100);
  };

  const currentTier = TIERS_DATA[activeTier] ?? TIERS_DATA[1]!;
  const currentCategory = CATEGORIES_DATA[activeCategory] ?? CATEGORIES_DATA[0]!;

  return (
    <div className="relative w-full max-w-[430px] mx-auto min-h-screen bg-[#0B111C] border-x border-[#2A3446] flex flex-col font-plus-jakarta text-[#F8FAFC] antialiased selection:bg-[#7FA0D6]/30 selection:text-[#BCCCE6]">
      {/* 1. Header with full menu bar */}
      <MobileNavBar
        statusBadge="OS v4.2"
        statusType="cyan"
        ctaText="Book Demo"
        onCtaClick={() => {
          const el = document.getElementById("closing-banner");
          el?.scrollIntoView({ behavior: "smooth" });
        }}
      />

      <main className="flex-1 flex flex-col relative w-full pt-3 px-3.5 pb-6">
        {/* Subtle Ambient Glow */}
        <div className="relative w-full overflow-hidden pt-1">
          <div className="absolute -top-12 left-1/2 -translate-x-1/2 w-64 h-32 bg-[#7FA0D6]/15 blur-3xl pointer-events-none rounded-full" />

          {/* 1. Category Badge & Hero Hook */}
          <div className="flex flex-col items-center text-center relative z-10">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#161F2D] shadow-sm backdrop-blur-md mb-3 border border-[#2A3446]">
              <span className="text-[#7FA0D6] text-xs leading-none">⚡</span>
              <span className="text-[10px] font-space-grotesk text-[#7FA0D6] tracking-widest uppercase font-bold">
                Predictable Agency Infrastructure
              </span>
            </div>
            <h1 className="text-[24px] leading-[1.15] font-bold tracking-tight text-[#F8FAFC] max-w-[340px]">
              Simple, transparent pricing that{" "}
              <span className="text-[#7FA0D6]">
                scales with your agency.
              </span>
            </h1>
            <p className="text-[12px] text-[#97A0B3] max-w-[325px] mt-2 mb-4 leading-relaxed font-normal">
              No hidden seat taxes or per-project gouging. Choose your studio cadence and reclaim true profit margins.
            </p>
          </div>

          {/* 2. Core Pricing Console (Tactile Segmented Controller) */}
          <div className="relative z-10 w-full mb-3">
            <div className="grid grid-cols-3 p-1 rounded-full bg-[#050810] backdrop-blur-md shadow-inner gap-1 border border-[#2A3446]">
              {["Starter", "Accelerator", "Scale"].map((name, i) => {
                const isSelected = activeTier === i;
                return (
                  <button
                    key={name}
                    type="button"
                    onClick={() => switchTier(i)}
                    className={`flex items-center justify-center py-2 rounded-full text-[11px] font-bold transition-all duration-200 cursor-pointer ${
                      isSelected
                        ? "bg-[#161F2D] text-[#7FA0D6] border border-[#7FA0D6]/40 shadow-[0_2px_10px_rgba(127,160,214,0.2)]"
                        : "text-[#97A0B3] hover:text-[#F8FAFC]"
                    }`}
                  >
                    <span>{name}</span>
                    {i === 1 && isSelected && (
                      <span className="w-1.5 h-1.5 rounded-full bg-[#7FA0D6] ml-1 animate-pulse" />
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Dynamic Morphing Tier Card */}
          <div
            className={`relative z-10 w-full rounded-2xl bg-[#161F2D] backdrop-blur-xl p-4 shadow-xl shadow-black/40 border border-[#2A3446] transition-all duration-300 ${
              isFading ? "opacity-60 scale-[0.99]" : "opacity-100 scale-100"
            }`}
          >
            {/* Card Header */}
            <div className="flex items-center justify-between mb-3">
              <div>
                <span className="text-[9.5px] font-space-grotesk text-[#7FA0D6] uppercase tracking-widest block mb-0.5 font-bold">
                  {currentTier.eyebrow}
                </span>
                <h2 className="text-base font-bold text-[#F8FAFC]">{currentTier.name}</h2>
              </div>
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#7FA0D6]/15 border border-[#7FA0D6]/30">
                <span className="w-1.5 h-1.5 rounded-full bg-[#7FA0D6] animate-ping" />
                <span className="text-[9px] font-space-grotesk text-[#7FA0D6] font-bold tracking-wider uppercase">
                  {currentTier.badgeText}
                </span>
              </div>
            </div>

            {/* Price Callout */}
            <div className="flex items-baseline gap-1.5 mb-1 font-space-grotesk">
              <span className="text-3xl font-extrabold tracking-tight text-[#F8FAFC]">
                {currentTier.price}
              </span>
              <span className="text-[12px] text-[#97A0B3]">/ month</span>
            </div>
            <p className="text-[10px] text-[#97A0B3]/80 mb-3.5">
              Billed monthly • Cancel or pause anytime with 1-click
            </p>

            {/* Deliverables HUD Capsule */}
            <div className="w-full rounded-xl bg-[#0B111C] p-2.5 mb-3 border border-[#2A3446]">
              <div className="grid grid-cols-3 divide-x divide-[#2A3446] text-center font-space-grotesk">
                <div className="flex flex-col items-center px-1">
                  <span className="text-base font-bold text-[#7FA0D6]">{currentTier.reels}</span>
                  <span className="text-[9px] text-[#97A0B3] tracking-wider uppercase mt-0.5">Reels</span>
                </div>
                <div className="flex flex-col items-center px-1">
                  <span className="text-base font-bold text-[#BCCCE6]">{currentTier.posts}</span>
                  <span className="text-[9px] text-[#97A0B3] tracking-wider uppercase mt-0.5">Posts</span>
                </div>
                <div className="flex flex-col items-center px-1">
                  <span className="text-base font-bold text-[#F8FAFC]">{currentTier.stories}</span>
                  <span className="text-[9px] text-[#97A0B3] tracking-wider uppercase mt-0.5">Stories</span>
                </div>
              </div>
            </div>

            {/* SLA Tag */}
            <div className="flex items-center justify-between mb-3 px-1 text-[11px]">
              <div className="flex items-center gap-1.5 text-[#BCCCE6] font-semibold">
                <CheckCircle2 className="w-4 h-4 text-[#7FA0D6]" />
                <span>{currentTier.sla}</span>
              </div>
              <span className="text-[10px] font-space-grotesk text-[#97A0B3]">48h SLA</span>
            </div>

            {/* 2x2 Feature Bento Grid */}
            <div className="grid grid-cols-2 gap-2 mb-4">
              {currentTier.features.map((feat, idx) => (
                <div
                  key={idx}
                  className="p-2.5 rounded-xl bg-[#0B111C] border border-[#2A3446] flex flex-col justify-between min-h-[60px]"
                >
                  <Sparkles className="w-3.5 h-3.5 text-[#7FA0D6] mb-1" />
                  <span className="text-[10.5px] text-[#F8FAFC] font-medium leading-tight">{feat}</span>
                </div>
              ))}
            </div>

            {/* Primary CTA Button */}
            <Link
              to={`/signup?plan=${encodeURIComponent(currentTier.planParam)}`}
              className="w-full h-11 rounded-full bg-[#BCCCE6] hover:bg-white text-[#050810] font-bold text-xs flex items-center justify-center gap-1.5 shadow-[0_0_20px_rgba(188,204,230,0.35)] active:scale-[0.98] transition-all"
            >
              <span>{currentTier.cta}</span>
              <ArrowRight className="w-4 h-4 stroke-[2.5]" />
            </Link>
          </div>

          {/* 3. Platform Architecture Comparison Drawer */}
          <div className="relative z-10 w-full mt-6">
            <div className="flex flex-col items-center text-center mb-3">
              <span className="text-[9.5px] font-space-grotesk text-[#7FA0D6] tracking-widest uppercase mb-1 font-bold">
                ⚡ Platform Architecture
              </span>
              <h3 className="text-base font-bold text-[#F8FAFC]">Compare Capability Matrix</h3>
              <p className="text-[11px] text-[#97A0B3] mt-0.5">Instant comparison across key agency workflows</p>
            </div>

            {/* Horizontal Pill Rail */}
            <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-1 mb-2.5 w-full">
              {[
                "Portal & Approvals",
                "Capacity Radar",
                "Economics",
                "Collections",
                "Seats & Sec",
              ].map((catName, idx) => {
                const isSelected = activeCategory === idx;
                return (
                  <button
                    key={catName}
                    type="button"
                    onClick={() => setActiveCategory(idx)}
                    className={`shrink-0 px-3 py-1.5 rounded-full text-[11px] font-bold transition-all cursor-pointer ${
                      isSelected
                        ? "bg-[#BCCCE6] text-[#050810] shadow-sm font-bold"
                        : "bg-[#161F2D] text-[#97A0B3] hover:text-[#F8FAFC] border border-[#2A3446]"
                    }`}
                  >
                    {catName}
                  </button>
                );
              })}
            </div>

            {/* Dynamic Matrix Comparison Card */}
            <div className="w-full rounded-2xl bg-[#161F2D] backdrop-blur-xl p-3 shadow-lg border border-[#2A3446]">
              <div className="flex items-center justify-between mb-2 pb-1.5 border-b border-[#2A3446]">
                <div className="flex items-center gap-1.5">
                  <Shield className="w-4 h-4 text-[#7FA0D6]" />
                  <span className="text-[11.5px] font-bold text-[#F8FAFC]">{currentCategory.name}</span>
                </div>
                <span className="text-[9px] font-space-grotesk text-[#97A0B3]">3-Tier Spec</span>
              </div>

              <div className="flex flex-col gap-1.5">
                {/* Starter */}
                <div className="flex items-center justify-between p-2 rounded-xl bg-[#0B111C] border border-[#2A3446]">
                  <div className="flex items-center gap-2">
                    <span className="text-[9px] font-space-grotesk px-1.5 py-0.5 rounded bg-[#161F2D] text-[#97A0B3] font-bold">
                      STARTER
                    </span>
                    <span className="text-[11px] text-[#F8FAFC]">{currentCategory.starter}</span>
                  </div>
                  <Check className="w-4 h-4 text-[#97A0B3]" />
                </div>

                {/* Accelerator */}
                <div className="flex items-center justify-between p-2 rounded-xl bg-[#161F2D] border border-[#7FA0D6]/40 shadow-sm">
                  <div className="flex items-center gap-2">
                    <span className="text-[9px] font-space-grotesk px-1.5 py-0.5 rounded bg-[#7FA0D6]/20 text-[#7FA0D6] font-bold">
                      ACCELERATOR
                    </span>
                    <span className="text-[11px] text-[#BCCCE6] font-medium">{currentCategory.growth}</span>
                  </div>
                  <Sparkles className="w-4 h-4 text-[#7FA0D6]" />
                </div>

                {/* Scale */}
                <div className="flex items-center justify-between p-2 rounded-xl bg-[#0B111C] border border-[#2A3446]">
                  <div className="flex items-center gap-2">
                    <span className="text-[9px] font-space-grotesk px-1.5 py-0.5 rounded bg-[#161F2D] text-[#97A0B3] font-bold">
                      SCALE
                    </span>
                    <span className="text-[11px] text-[#F8FAFC]">{currentCategory.scale}</span>
                  </div>
                  <CheckCircle2 className="w-4 h-4 text-[#7FA0D6]" />
                </div>
              </div>

              {/* Accordion Full Matrix Trigger */}
              <button
                type="button"
                onClick={() => setMatrixExpanded(!matrixExpanded)}
                className="w-full mt-2.5 py-2 rounded-xl bg-[#0B111C] hover:bg-[#161F2D] text-[#97A0B3] hover:text-[#F8FAFC] text-[11px] font-semibold flex items-center justify-center gap-1 transition-colors cursor-pointer border border-[#2A3446]"
              >
                <span>{matrixExpanded ? "Hide Extended Specs" : "View Full Matrix Summary"}</span>
                <span className="text-xs">{matrixExpanded ? "▲" : "▼"}</span>
              </button>

              {/* Hidden Matrix Drawer Content */}
              {matrixExpanded && (
                <div className="flex flex-col gap-2 pt-2.5 mt-2.5 border-t border-[#2A3446] animate-in fade-in duration-200">
                  <div className="p-2.5 rounded-xl bg-[#0B111C] text-left border border-[#2A3446]">
                    <span className="text-[9.5px] font-space-grotesk text-[#7FA0D6] block mb-1 font-bold">
                      ALL TIERS INCLUDE
                    </span>
                    <div className="grid grid-cols-2 gap-1.5 text-[10.5px] text-[#97A0B3]">
                      <span>• Zero platform transaction fee</span>
                      <span>• WhatsApp team channel</span>
                      <span>• Raw assets repository (S3)</span>
                      <span>• Automated SOC-2 backups</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* 4. High-Impact Closing Finale Banner */}
          <div
            id="closing-banner"
            className="relative z-10 w-full mt-6 rounded-2xl bg-gradient-to-b from-[#161F2D] to-[#050810] p-4 text-center shadow-2xl shadow-black/60 border border-[#2A3446]"
          >
            <div className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-[#7FA0D6]/20 text-[#7FA0D6] mb-2">
              <Rocket className="w-4 h-4" />
            </div>
            <h3 className="text-sm font-bold text-[#F8FAFC] leading-tight">
              Stop managing chaos.
              <br />
              <span className="text-[#7FA0D6]">Start operating momentum.</span>
            </h3>
            <p className="text-[10px] text-[#97A0B3] mt-1.5 mb-4 max-w-[290px] mx-auto leading-relaxed">
              Join 50+ modern creative studios running end-to-end ops on CREO OS.
            </p>
            {/* Dual Action Buttons (Side by Side: Left and Right) */}
            <div className="w-full flex items-center gap-2 pt-1">
              <Link
                to="/signup?plan=Growth"
                className="flex-1 h-10 px-3 rounded-full bg-[#BCCCE6] hover:bg-white text-[#050810] font-bold text-[11px] whitespace-nowrap flex items-center justify-center gap-1.5 shadow-[0_4px_16px_rgba(188,204,230,0.25)] active:scale-95 transition-all cursor-pointer"
              >
                <span>Deploy CREO</span>
                <ArrowRight className="w-3.5 h-3.5 stroke-[2.5]" />
              </Link>
              <a
                href="https://wa.me/919941999415"
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 h-10 px-3 rounded-full bg-[#0B111C] hover:bg-[#161F2D] text-[#F8FAFC] font-semibold text-[11px] whitespace-nowrap flex items-center justify-center gap-1.5 active:scale-95 transition-all border border-[#2A3446] shadow-sm cursor-pointer"
              >
                <Calendar className="w-3.5 h-3.5 text-[#7FA0D6]" />
                <span>VIP Walkthrough</span>
              </a>
            </div>
          </div>
        </div>
      </main>

      {/* 5. Unified Super Mobile Footer */}
      <MobileFooter />
    </div>
  );
}
