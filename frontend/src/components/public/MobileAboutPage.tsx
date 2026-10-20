import { useState } from "react";
import { Link } from "react-router";
import { ArrowRight, Calendar } from "lucide-react";
import { MobileNavBar } from "./MobileNavBar";
import { MobileFooter } from "./MobileFooter";

export function MobileAboutPage() {
  const [activeConsoleState, setActiveConsoleState] = useState<"chaos" | "creo">("chaos");
  const [activePrinciple, setActivePrinciple] = useState<number>(0);
  const [activeArchIndex, setActiveArchIndex] = useState<number>(0);

  const architects = [
    { code: "CAP", title: "Core Arch", role: "Founder & Chief Architect // EMEA & APAC", exp: "12+ yrs" },
    { code: "SYL", title: "Systems", role: "VP Engineering // Distributed Pipeline Architecture", exp: "10+ yrs" },
    { code: "AEP", title: "Agency Pod", role: "Head of Operations // Scaled 40+ Retainers", exp: "8+ yrs" },
  ];

  return (
    <div className="relative w-full max-w-[430px] mx-auto min-h-screen bg-[#0B111C] text-[#F8FAFC] border-x border-[#2A3446] flex flex-col font-plus-jakarta antialiased selection:bg-[#7FA0D6]/30 selection:text-[#BCCCE6]">
      {/* 1. Header with full menu bar */}
      <MobileNavBar
        statusBadge="Studio Live"
        statusType="cyan"
        ctaText="Book Demo"
        onCtaClick={() => {
          const el = document.getElementById("finale-action");
          el?.scrollIntoView({ behavior: "smooth" });
        }}
      />

      <main className="flex-1 flex flex-col gap-4 px-4 pt-3 pb-6">
        {/* 2. Hero Section */}
        <section className="flex flex-col gap-2.5">
          <div className="self-start">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[9px] font-space-grotesk font-semibold tracking-wider uppercase text-[#7FA0D6] bg-[#161F2D] border border-[#2A3446]">
              <span className="text-[#7FA0D6] text-[10px]">✦</span> FOUNDER STORY & ORIGIN
            </span>
          </div>

          <h1 className="text-[22px] leading-[1.18] font-black tracking-tight text-[#F8FAFC]">
            Built by agency leaders who refused to accept{" "}
            <span className="text-[#7FA0D6]">
              the chaos.
            </span>
          </h1>

          <p className="text-[11px] leading-relaxed text-[#97A0B3] font-normal">
            Creative operations must be industrialized. CREO replaces fragmented tooling and margin leaks with a unified autonomous agency OS.
          </p>

          {/* 3-Metric Strip */}
          <div className="grid grid-cols-3 divide-x divide-[#2A3446] rounded-xl bg-[#161F2D] border border-[#2A3446] px-1 py-1.5 shadow-md">
            <div className="flex flex-col items-center text-center px-1.5 py-0.5">
              <span className="font-space-grotesk text-xs font-extrabold text-[#7FA0D6]">48h</span>
              <span className="text-[8px] uppercase tracking-wider text-[#97A0B3] font-medium leading-none mt-0.5">
                SLA Speed
              </span>
            </div>
            <div className="flex flex-col items-center text-center px-1.5 py-0.5">
              <span className="font-space-grotesk text-xs font-extrabold text-[#F8FAFC]">99.4%</span>
              <span className="text-[8px] uppercase tracking-wider text-[#97A0B3] font-medium leading-none mt-0.5">
                On-Time
              </span>
            </div>
            <div className="flex flex-col items-center text-center px-1.5 py-0.5">
              <span className="font-space-grotesk text-xs font-extrabold text-[#7FA0D6]">1-Click</span>
              <span className="text-[8px] uppercase tracking-wider text-[#97A0B3] font-medium leading-none mt-0.5">
                Approvals
              </span>
            </div>
          </div>
        </section>

        {/* 3. Studio Architecture Console (Blueprint // Chaos vs CREO OS) */}
        <section className="flex flex-col gap-2">
          <div className="flex items-center justify-between text-[10px] font-space-grotesk">
            <div className="flex items-center gap-1.5 text-[#97A0B3]">
              <span className="w-1.5 h-1.5 rounded-full bg-[#7FA0D6]" />
              <span className="font-bold text-[#F8FAFC] tracking-wider">BANGALORE STUDIO // BLUEPRINT</span>
            </div>
            <span className="text-[#97A0B3] text-[9px]">SYSTEM SILOS</span>
          </div>

          <div className="grid grid-cols-2 p-1 rounded-lg bg-[#050810] border border-[#2A3446] text-[10px] font-medium gap-1">
            <button
              type="button"
              onClick={() => setActiveConsoleState("chaos")}
              className={`py-1.5 rounded transition-all font-semibold flex items-center justify-center gap-1 active:scale-95 cursor-pointer ${
                activeConsoleState === "chaos"
                  ? "text-[#D8BF9B] bg-[#D8BF9B]/15 border border-[#D8BF9B]/30"
                  : "text-[#97A0B3] hover:text-[#F8FAFC]"
              }`}
            >
              <span>✕</span> The Chaos
            </button>
            <button
              type="button"
              onClick={() => setActiveConsoleState("creo")}
              className={`py-1.5 rounded transition-all font-semibold flex items-center justify-center gap-1 active:scale-95 cursor-pointer ${
                activeConsoleState === "creo"
                  ? "text-[#7FA0D6] bg-[#161F2D] border border-[#7FA0D6]/40 shadow-sm"
                  : "text-[#97A0B3] hover:text-[#F8FAFC]"
              }`}
            >
              <span>⚡</span> The CREO OS
            </button>
          </div>

          <div className="relative rounded-xl border border-[#2A3446] overflow-hidden bg-[#161F2D] p-2.5 shadow-inner">
            {activeConsoleState === "chaos" ? (
              <div className="grid grid-cols-2 gap-2 animate-in fade-in duration-200">
                <div className="p-2.5 rounded-lg bg-[#050810] border border-[#D8BF9B]/25 flex flex-col justify-between min-h-[68px]">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs text-[#D8BF9B]">📁</span>
                    <h4 className="text-[11px] font-bold text-[#F8FAFC]">Lost Assets</h4>
                  </div>
                  <p className="text-[9px] text-[#97A0B3] leading-tight mt-1">Google Drive clutter & broken links</p>
                </div>
                <div className="p-2.5 rounded-lg bg-[#050810] border border-[#D8BF9B]/25 flex flex-col justify-between min-h-[68px]">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs text-[#D8BF9B]">⏱️</span>
                    <h4 className="text-[11px] font-bold text-[#F8FAFC]">48h Lag</h4>
                  </div>
                  <p className="text-[9px] text-[#97A0B3] leading-tight mt-1">Chaotic approval deadlocks</p>
                </div>
                <div className="p-2.5 rounded-lg bg-[#050810] border border-[#D8BF9B]/25 flex flex-col justify-between min-h-[68px]">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs text-[#D8BF9B]">📉</span>
                    <h4 className="text-[11px] font-bold text-[#F8FAFC]">Margin Leaks</h4>
                  </div>
                  <p className="text-[9px] text-[#97A0B3] leading-tight mt-1">Undefined scope creep eats 35%</p>
                </div>
                <div className="p-2.5 rounded-lg bg-[#050810] border border-[#D8BF9B]/25 flex flex-col justify-between min-h-[68px]">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs text-[#D8BF9B]">🔥</span>
                    <h4 className="text-[11px] font-bold text-[#F8FAFC]">Blind Resourcing</h4>
                  </div>
                  <p className="text-[9px] text-[#97A0B3] leading-tight mt-1">Zero visibility & editor burnout</p>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-2 animate-in fade-in duration-200">
                <div className="p-2.5 rounded-lg bg-[#050810] border border-[#7FA0D6]/30 flex flex-col justify-between min-h-[68px]">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs text-[#7FA0D6]">⚡</span>
                    <h4 className="text-[11px] font-bold text-[#F8FAFC]">1-Vault Flow</h4>
                  </div>
                  <p className="text-[9px] text-[#97A0B3] leading-tight mt-1">Instant master library & zero loss</p>
                </div>
                <div className="p-2.5 rounded-lg bg-[#050810] border border-[#7FA0D6]/30 flex flex-col justify-between min-h-[68px]">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs text-[#7FA0D6]">🎯</span>
                    <h4 className="text-[11px] font-bold text-[#F8FAFC]">Real-Time SLA</h4>
                  </div>
                  <p className="text-[9px] text-[#97A0B3] leading-tight mt-1">Frame-accurate client signoffs</p>
                </div>
                <div className="p-2.5 rounded-lg bg-[#050810] border border-[#7FA0D6]/30 flex flex-col justify-between min-h-[68px]">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs text-[#7FA0D6]">📈</span>
                    <h4 className="text-[11px] font-bold text-[#F8FAFC]">Margin Ledger</h4>
                  </div>
                  <p className="text-[9px] text-[#97A0B3] leading-tight mt-1">Automated live contribution ledger</p>
                </div>
                <div className="p-2.5 rounded-lg bg-[#050810] border border-[#7FA0D6]/30 flex flex-col justify-between min-h-[68px]">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs text-[#7FA0D6]">🔮</span>
                    <h4 className="text-[11px] font-bold text-[#F8FAFC]">Pod Radar</h4>
                  </div>
                  <p className="text-[9px] text-[#97A0B3] leading-tight mt-1">Predictive capacity & no burnout</p>
                </div>
              </div>
            )}
          </div>
        </section>

        {/* 4. Three Operating Principles */}
        <section className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-space-grotesk uppercase tracking-wider text-[#7FA0D6] font-bold">
              OPERATING CODEX & PODS
            </span>
            <span className="text-[9px] font-space-grotesk text-[#97A0B3]">v2.6 SPEC</span>
          </div>

          <div className="grid grid-cols-3 p-1 rounded-lg bg-[#050810] border border-[#2A3446] text-[10px] font-medium text-center gap-1">
            {["01 Utilization", "02 Pod Protocol", "03 Architects"].map((tabName, idx) => {
              const isSelected = activePrinciple === idx;
              return (
                <button
                  key={tabName}
                  type="button"
                  onClick={() => setActivePrinciple(idx)}
                  className={`py-1.5 rounded font-semibold transition-all cursor-pointer ${
                    isSelected
                      ? "bg-[#161F2D] text-[#7FA0D6] border border-[#7FA0D6]/40 shadow-sm"
                      : "text-[#97A0B3] hover:text-[#F8FAFC]"
                  }`}
                >
                  {tabName}
                </button>
              );
            })}
          </div>

          <div className="p-3.5 rounded-xl bg-[#161F2D] border border-[#2A3446] relative min-h-[118px] shadow-sm">
            {activePrinciple === 0 && (
              <div className="flex flex-col gap-2.5 animate-in fade-in duration-200">
                <div className="flex items-center justify-between">
                  <p className="text-[11px] text-[#F8FAFC] font-medium leading-tight">
                    Maximize capacity velocity before hiring headcount.
                  </p>
                  <span className="px-2 py-0.5 rounded text-[9px] font-space-grotesk text-[#7FA0D6] bg-[#050810] border border-[#7FA0D6]/30 shrink-0">
                    Target: 92%
                  </span>
                </div>
                <div className="p-2.5 rounded-lg bg-[#050810] border border-[#2A3446] flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="relative w-8 h-8 flex items-center justify-center shrink-0">
                      <svg className="w-8 h-8 transform -rotate-90">
                        <circle className="text-[#2A3446]" cx="16" cy="16" fill="transparent" r="13" stroke="currentColor" strokeWidth="2.5" />
                        <circle className="text-[#7FA0D6]" cx="16" cy="16" fill="transparent" r="13" stroke="currentColor" strokeDasharray="82" strokeDashoffset="11" strokeLinecap="round" strokeWidth="2.5" />
                      </svg>
                      <span className="absolute text-[9px] font-space-grotesk font-bold text-[#F8FAFC]">87%</span>
                    </div>
                    <div>
                      <span className="text-[11px] font-semibold text-[#F8FAFC] block leading-tight">Pod Velocity</span>
                      <span className="text-[9px] text-[#7FA0D6] font-space-grotesk">● Optimal (No Overload)</span>
                    </div>
                  </div>
                  <div className="flex -space-x-1.5">
                    <div className="w-5 h-5 rounded-full bg-[#7FA0D6] border border-[#0B111C] flex items-center justify-center text-[8px] font-bold text-[#050810]">
                      AK
                    </div>
                    <div className="w-5 h-5 rounded-full bg-[#BCCCE6] border border-[#0B111C] flex items-center justify-center text-[8px] font-bold text-[#050810]">
                      MR
                    </div>
                    <div className="w-5 h-5 rounded-full bg-[#2A3446] border border-[#0B111C] flex items-center justify-center text-[8px] font-bold text-[#F8FAFC]">
                      SL
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activePrinciple === 1 && (
              <div className="flex flex-col gap-2.5 animate-in fade-in duration-200">
                <div className="flex items-center justify-between">
                  <p className="text-[11px] text-[#F8FAFC] font-medium leading-tight">
                    Synchronized 6-node linear execution pipeline.
                  </p>
                  <span className="px-2 py-0.5 rounded text-[9px] font-space-grotesk text-[#7FA0D6] bg-[#050810] border border-[#7FA0D6]/30 shrink-0">
                    Live Sync
                  </span>
                </div>
                <div className="grid grid-cols-6 gap-1.5 py-1">
                  {[
                    { step: "01", name: "Lead", highlight: true },
                    { step: "02", name: "Dir" },
                    { step: "03", name: "Edit" },
                    { step: "04", name: "Mot" },
                    { step: "05", name: "Color" },
                    { step: "06", name: "Snd", highlight: true },
                  ].map((n) => (
                    <div
                      key={n.step}
                      className={`p-1.5 rounded bg-[#050810] text-center border ${
                        n.highlight ? "border-[#7FA0D6]/60 text-[#7FA0D6]" : "border-[#2A3446] text-[#97A0B3]"
                      }`}
                    >
                      <span className="text-[7px] font-space-grotesk block font-bold">{n.step}</span>
                      <span className="text-[9px] font-semibold text-[#F8FAFC]">{n.name}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {activePrinciple === 2 && (
              <div className="flex flex-col gap-2.5 animate-in fade-in duration-200">
                <div className="grid grid-cols-3 gap-1.5">
                  {architects.map((arch, idx) => {
                    const isSelected = activeArchIndex === idx;
                    return (
                      <button
                        key={arch.code}
                        type="button"
                        onClick={() => setActiveArchIndex(idx)}
                        className={`p-2 rounded-lg text-left transition-all cursor-pointer ${
                          isSelected
                            ? "bg-[#050810] border border-[#7FA0D6]/50 shadow-sm"
                            : "bg-[#050810] border border-[#2A3446]"
                        }`}
                      >
                        <div className="text-[9px] font-space-grotesk font-bold text-[#7FA0D6]">{arch.code}</div>
                        <div className="text-[10px] font-bold text-[#F8FAFC] truncate">{arch.title}</div>
                      </button>
                    );
                  })}
                </div>
                <div className="p-2.5 rounded-lg bg-[#050810] border border-[#2A3446] flex items-center justify-between text-[10px]">
                  <span className="text-[#97A0B3] font-medium truncate">
                    {architects[activeArchIndex]?.role}
                  </span>
                  <span className="font-space-grotesk text-[#7FA0D6] text-[9px] shrink-0 ml-1.5">
                    {architects[activeArchIndex]?.exp}
                  </span>
                </div>
              </div>
            )}
          </div>
        </section>

        {/* 5. Finale Action Banner */}
        <section className="pt-2" id="finale-action">
          <div className="relative overflow-hidden p-4 rounded-2xl bg-gradient-to-b from-[#161F2D] via-[#0B111C] to-[#050810] border border-[#2A3446] text-center shadow-md flex flex-col items-center gap-2.5">
            <div className="absolute -top-10 left-1/2 -translate-x-1/2 w-48 h-16 bg-[#7FA0D6]/15 rounded-full blur-2xl pointer-events-none" />
            <h3 className="text-sm font-black tracking-tight text-[#F8FAFC] relative z-10 leading-snug">
              Stop managing the chaos.
              <br />
              <span className="text-[#7FA0D6]">
                Start operating the momentum.
              </span>
            </h3>
            <p className="text-[10.5px] text-[#97A0B3] max-w-[280px] leading-relaxed">
              Join modern agency operators turning creative production into predictable, high-margin revenue.
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
                <span>Live Demo</span>
              </a>
            </div>
          </div>
        </section>
      </main>

      {/* 6. Unified Super Mobile Footer */}
      <MobileFooter />
    </div>
  );
}
