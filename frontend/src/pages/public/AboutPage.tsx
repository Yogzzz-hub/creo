import { useState } from "react";
import { motion } from "motion/react";
import { CountUp, EASE_OUT_EXPO, Reveal, SplitText, Stagger, StaggerItem, TiltCard } from "../../components/motion";
import { 
  MessageSquare, 
  AlertCircle, ChevronRight, BarChart3, FileSpreadsheet, HardDrive
} from "lucide-react";

export function AboutPage() {
  const [hoverSection, setHoverSection] = useState<'past' | 'creo' | null>(null);
  const [showDonutTooltip, setShowDonutTooltip] = useState(false);
  const [activeMilestone, setActiveMilestone] = useState("01");

  return (
    <div className="w-full bg-nebula-void text-slate-50 min-h-screen pb-20 lg:pb-24 font-sans selection:bg-nebula-glow/30">
      
      {/* ── Section 1: Hero (2-Column Grid) ── */}
      <section className="relative isolate max-w-[1240px] mx-auto px-6 pt-8 pb-16 sm:pt-12 sm:pb-20 lg:pt-14 lg:pb-24">
        <motion.div
          aria-hidden="true"
          className="absolute -left-32 top-0 -z-10 size-[30rem] rounded-full bg-[radial-gradient(circle,rgba(127,160,214,0.12),transparent_62%)]"
          animate={{ x: [0, 40, 0], y: [0, 24, 0] }}
          transition={{ duration: 14, repeat: Number.POSITIVE_INFINITY, ease: "easeInOut" }}
        />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-center">
          
          {/* Left Column */}
          <div className="pr-4 lg:pr-8">
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, ease: EASE_OUT_EXPO }}
              className="inline-flex items-center gap-2 rounded-full bg-nebula-surface border border-nebula-steel text-nebula-glow text-[11px] font-bold px-3 py-1 mb-6"
            >
              ⚡ OUR MISSION &amp; ORIGIN
            </motion.div>

            <SplitText
              as="h1"
              animateOnMount
              text="Built by agency leaders who refused to accept the chaos."
              accent={["the", "chaos"]}
              className="block text-4xl sm:text-5xl lg:text-[56px] font-black tracking-tight leading-[1.05] text-slate-50 mb-6"
            />

            <motion.p
              initial={{ opacity: 0, y: 14, filter: "blur(6px)" }}
              animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
              transition={{ duration: 0.8, delay: 0.45, ease: EASE_OUT_EXPO }}
              className="text-sm sm:text-base text-nebula-mist max-w-lg mt-4 mb-8 leading-relaxed"
            >
              Creative work should be boundless. Agency operations should be mathematical. We built CREO to replace WhatsApp chasing, lost briefs, and blind margins with a single connected operating system.
            </motion.p>
            
            {/* 3 Stat Pods */}
            <Stagger className="grid grid-cols-1 sm:grid-cols-3 gap-4" delay={0.55} gap={0.1}>
              <StaggerItem className="backdrop-blur-md bg-nebula-surface/40 border border-nebula-steel/40 rounded-xl px-6 py-4 flex flex-col justify-center relative transition-colors duration-300 hover:border-nebula-glow/50">
                <div className="absolute top-4 right-4 size-1.5 flex items-center justify-center">
                  <span className="absolute inset-0 rounded-full bg-nebula-glow animate-ping opacity-40"></span>
                  <span className="relative size-1.5 rounded-full bg-nebula-glow"></span>
                </div>
                <CountUp value="48h" className="block text-2xl font-black text-slate-50 leading-none mb-1.5" />
                <div className="text-xs text-nebula-mist uppercase tracking-wider font-semibold">Average SLA Turnaround</div>
              </StaggerItem>
              <StaggerItem className="backdrop-blur-md bg-nebula-surface/40 border border-nebula-steel/40 rounded-xl px-6 py-4 flex flex-col justify-center relative transition-colors duration-300 hover:border-nebula-glow/50">
                <div className="absolute top-4 right-4 size-1.5 flex items-center justify-center">
                  <span className="absolute inset-0 rounded-full bg-nebula-glow animate-ping opacity-40"></span>
                  <span className="relative size-1.5 rounded-full bg-nebula-glow"></span>
                </div>
                <CountUp value="99.4%" className="block text-2xl font-black text-slate-50 leading-none mb-1.5" />
                <div className="text-xs text-nebula-mist uppercase tracking-wider font-semibold">On-Time Delivery Rate</div>
              </StaggerItem>
              <StaggerItem className="backdrop-blur-md bg-nebula-surface/40 border border-nebula-steel/40 rounded-xl px-6 py-4 flex flex-col justify-center relative transition-colors duration-300 hover:border-nebula-glow/50">
                <div className="absolute top-4 right-4 size-1.5 flex items-center justify-center">
                  <span className="absolute inset-0 rounded-full bg-nebula-glow animate-ping opacity-40"></span>
                  <span className="relative size-1.5 rounded-full bg-nebula-glow"></span>
                </div>
                <div className="text-2xl font-black text-slate-50 leading-none mb-1.5">1-Click</div>
                <div className="text-xs text-nebula-mist uppercase tracking-wider font-semibold">Frictionless Sign-Off</div>
              </StaggerItem>
            </Stagger>
          </div>

          {/* Right Column — Origin & Architecture Terminal */}
          <motion.div
            initial={{ opacity: 0, x: 40, rotateY: -8 }}
            animate={{ opacity: 1, x: 0, rotateY: 0 }}
            transition={{ duration: 1, delay: 0.3, ease: EASE_OUT_EXPO }}
          >
          <TiltCard max={6} className="backdrop-blur-md bg-nebula-surface/50 border border-nebula-steel/40 rounded-2xl p-6 shadow-2xl relative overflow-hidden flex flex-col gap-6">
            <div className="flex items-center justify-between border-b border-nebula-steel pb-4">
              <div className="font-black text-slate-50 text-sm tracking-tight">CREO Kernel v2.6 &bull; Architecture Blueprint</div>
              <div className="text-nebula-glow text-xs font-semibold flex items-center gap-2">
                <div className="relative size-2 flex items-center justify-center">
                  <span className="absolute inset-0 rounded-full bg-nebula-glow animate-ping opacity-30"></span>
                  <span className="relative size-1.5 rounded-full bg-nebula-glow"></span>
                </div>
                System Status: Autonomous Ops
              </div>
            </div>
            
            <Stagger className="space-y-3" delay={0.6} gap={0.15}>
              <StaggerItem className="bg-nebula-navy border border-nebula-steel p-4 rounded-xl space-y-1">
                <div className="text-nebula-mist text-[10px] font-bold uppercase">The Fragmented Era (2018–2024)</div>
                <div className="text-nebula-mist text-xs">WhatsApp, Drive, and Sheets created 7 disconnected blindspots.</div>
              </StaggerItem>
              <StaggerItem className="bg-nebula-navy border border-nebula-steel p-4 rounded-xl space-y-1">
                <div className="text-nebula-mist text-[10px] font-bold uppercase">The Operating Shift (2025)</div>
                <div className="text-slate-50 text-xs font-medium">Unifying creative production, capacity heatmaps, and unit margins into one engine.</div>
              </StaggerItem>
              <StaggerItem className="bg-nebula-navy border border-nebula-steel p-4 rounded-xl space-y-1">
                <div className="text-nebula-mist text-[10px] font-bold uppercase">The Autonomous Studio (2026+)</div>
                <div className="text-nebula-glow text-xs font-bold">Predictive pod resourcing and automated margin recovery across 52+ agencies.</div>
              </StaggerItem>
            </Stagger>
            
            <div className="mt-4 pt-4 border-t border-nebula-steel flex items-center justify-between text-[10px] font-medium text-nebula-mist">
              <div>Engineered in Bengaluru &bull; Deployed Globally</div>
              <div className="flex items-center gap-1.5"><span className="size-1.5 rounded-full bg-nebula-glow"></span> Live Latency: 24ms</div>
            </div>
          </TiltCard>
          </motion.div>
        </div>
      </section>

      {/* ── Section 2: Why CREO Exists ── */}
      <section className="max-w-[1240px] mx-auto px-6 py-12 sm:py-16 border-t border-nebula-steel">
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 rounded-full bg-nebula-surface border border-nebula-steel text-nebula-glow text-[11px] font-bold px-3 py-1 mb-6">
            ⚡ THE ORIGIN STORY
          </div>
          <SplitText
            as="h2"
            text="Why CREO Exists: Breaking the 7 Fragmented Silos."
            accent={["7", "Fragmented", "Silos"]}
            className="block text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight text-slate-50 mb-4"
          />
          <Reveal delay={0.1}>
            <p className="text-sm sm:text-base text-nebula-mist">Before CREO, running an agency meant gluing together 7 disconnected tools.</p>
          </Reveal>
        </div>

        <Reveal blur>
        <div className="relative grid grid-cols-1 lg:grid-cols-[1fr_auto_1fr] gap-8 items-center">
          
          {/* Left Card - The Past / Chaos */}
          <div 
            className={`bg-nebula-navy border rounded-3xl p-6 lg:p-8 transition-all duration-300 ${hoverSection === 'past' ? 'border-nebula-sand/30 shadow-[0_0_20px_-10px_rgba(216,191,155,0.1)]' : 'border-nebula-sand/20'}`}
            onMouseEnter={() => setHoverSection('past')}
            onMouseLeave={() => setHoverSection(null)}
          >
            <div className="flex items-center gap-3 mb-2">
              <AlertCircle className="size-5 text-nebula-sand" />
              <h3 className="text-sm sm:text-base font-bold text-slate-50">The Past / <span className="text-nebula-sand">Chaos</span></h3>
            </div>
            <p className="text-xs sm:text-sm text-nebula-mist leading-relaxed mb-8 pb-4 border-b border-nebula-steel">Disconnected tools. Lost time. Real money.</p>
            
            <div className="flex flex-wrap gap-4 mb-8">
               <div className="relative w-12 h-12 rounded-xl flex items-center justify-center bg-nebula-navy border border-nebula-steel text-nebula-mist">
                 <MessageSquare className="size-6" />
                 <span className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-nebula-sand/10 border border-nebula-sand/20 text-nebula-sand rounded-full flex items-center justify-center text-[10px] font-bold shadow">!</span>
               </div>
               <div className="relative w-12 h-12 rounded-xl flex items-center justify-center bg-nebula-navy border border-nebula-steel text-nebula-mist">
                 <FileSpreadsheet className="size-6" />
                 <span className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-nebula-sand/10 border border-nebula-sand/20 text-nebula-sand rounded-full flex items-center justify-center text-[10px] font-bold shadow">!</span>
               </div>
               <div className="relative w-12 h-12 rounded-xl flex items-center justify-center bg-nebula-navy border border-nebula-steel text-nebula-mist">
                 <HardDrive className="size-6" />
                 <span className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-nebula-sand/10 border border-nebula-sand/20 text-nebula-sand rounded-full flex items-center justify-center text-[10px] font-bold shadow">!</span>
               </div>
               <div className="relative w-12 h-12 rounded-xl flex items-center justify-center bg-nebula-navy border border-nebula-steel text-nebula-mist font-serif font-bold text-lg">
                 N
                 <span className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-nebula-sand/10 border border-nebula-sand/20 text-nebula-sand rounded-full flex items-center justify-center text-[10px] font-bold shadow">!</span>
               </div>
            </div>
            
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="size-5 rounded-full bg-nebula-sand/10 border border-nebula-sand/20 flex items-center justify-center shrink-0 shadow-sm text-nebula-sand text-xs font-bold">!</div>
                <div>
                  <div className="text-xs font-bold text-slate-50">Lost scope</div>
                  <div className="text-[10px] text-nebula-mist">Clients scattered across WhatsApp &amp; Email</div>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="size-5 rounded-full bg-nebula-sand/10 border border-nebula-sand/20 flex items-center justify-center shrink-0 shadow-sm text-nebula-sand text-xs font-bold">!</div>
                <div>
                  <div className="text-xs font-bold text-slate-50">48-hour approval lags</div>
                  <div className="text-[10px] text-nebula-mist">Projects lost in Google Sheets &amp; Notion</div>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="size-5 rounded-full bg-nebula-sand/10 border border-nebula-sand/20 flex items-center justify-center shrink-0 shadow-sm text-nebula-sand text-xs font-bold">!</div>
                <div>
                  <div className="text-xs font-bold text-slate-50">Unbilled extra revisions</div>
                  <div className="text-[10px] text-nebula-mist">Assets messy in Drive folders &amp; broken links</div>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="size-5 rounded-full bg-nebula-sand/10 border border-nebula-sand/20 flex items-center justify-center shrink-0 shadow-sm text-nebula-sand text-xs font-bold">!</div>
                <div>
                  <div className="text-xs font-bold text-slate-50">Zero margin visibility</div>
                  <div className="text-[10px] text-nebula-mist">Manual spreadsheets &amp; blind billing</div>
                </div>
              </div>
            </div>
          </div>
          
          {/* Center Connector */}
          <div className="hidden lg:flex justify-center z-10">
            <div className={`w-12 h-12 rounded-full bg-nebula-surface border flex items-center justify-center font-bold text-[10px] text-center transition-all duration-300 ${hoverSection ? 'border-nebula-glow text-nebula-glow shadow-[0_0_15px_rgba(127,160,214,0.3)]' : 'border-nebula-steel text-nebula-mist'}`}>
              THE<br/>CREO<br/>SHIFT
            </div>
          </div>
          <div className="flex justify-center lg:hidden">
            <div className={`w-12 h-12 rounded-full bg-nebula-surface border flex items-center justify-center font-bold text-[10px] text-center transition-all duration-300 ${hoverSection ? 'border-nebula-glow text-nebula-glow shadow-[0_0_15px_rgba(127,160,214,0.3)]' : 'border-nebula-steel text-nebula-mist'}`}>
              THE<br/>CREO<br/>SHIFT
            </div>
          </div>

          {/* Right Card - The CREO Advantage / Precision */}
          <div 
            className={`bg-nebula-navy border rounded-3xl p-6 lg:p-8 relative overflow-hidden transition-all duration-300 ${hoverSection === 'creo' ? 'border-nebula-glow/60 shadow-[0_0_40px_-15px_rgba(127,160,214,0.3)]' : 'border-nebula-steel/50 shadow-[0_0_40px_-15px_rgba(127,160,214,0.05)]'}`}
            onMouseEnter={() => setHoverSection('creo')}
            onMouseLeave={() => setHoverSection(null)}
          >
            <div className="flex items-center gap-3 mb-2">
              <BarChart3 className="size-5 text-nebula-glow" />
              <h3 className="text-sm sm:text-base font-bold text-slate-50">The CREO Advantage / <span className="text-nebula-glow">Precision</span></h3>
            </div>
            <p className="text-xs sm:text-sm text-nebula-mist leading-relaxed mb-8 pb-4 border-b border-nebula-steel">One unified workflow. Total visibility.</p>

            <div className="space-y-5 mb-8">
              <div className="flex items-start gap-3">
                <svg className="size-5 text-nebula-glow shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" className="animate-[dash_1s_ease-out_forwards]" strokeDasharray="60" strokeDashoffset="0" /></svg>
                <div>
                  <div className="text-xs font-bold text-slate-50">Unified Client Dossiers</div>
                  <div className="text-[10px] text-nebula-mist">All client data, communications &amp; history</div>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <svg className="size-5 text-nebula-glow shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" className="animate-[dash_1s_ease-out_forwards]" strokeDasharray="60" strokeDashoffset="0" /></svg>
                <div>
                  <div className="text-xs font-bold text-slate-50">Utilization-Linked Sprints</div>
                  <div className="text-[10px] text-nebula-mist">Right people. Right work. Every time</div>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <svg className="size-5 text-nebula-glow shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" className="animate-[dash_1s_ease-out_forwards]" strokeDasharray="60" strokeDashoffset="0" /></svg>
                <div>
                  <div className="text-xs font-bold text-slate-50">1-Click Client Portal Approvals</div>
                  <div className="text-[10px] text-nebula-mist">Faster sign-offs. Happier clients</div>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <svg className="size-5 text-nebula-glow shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" className="animate-[dash_1s_ease-out_forwards]" strokeDasharray="60" strokeDashoffset="0" /></svg>
                <div>
                  <div className="text-xs font-bold text-slate-50">Real-Time Unit Economics</div>
                  <div className="text-[10px] text-nebula-mist">Know your numbers. Grow smarter</div>
                </div>
              </div>
            </div>

            <div className="bg-nebula-navy border border-nebula-steel rounded-xl p-4 flex items-center justify-between">
              <div>
                <div className="text-[10px] text-nebula-mist font-bold uppercase mb-1">Astra Living — Retainer Margin</div>
                <div className="flex items-center gap-3">
                  <div className="relative size-12 mb-1">
                    <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
                      <path className="text-nebula-void" strokeWidth="4" stroke="currentColor" fill="none" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
                      <path className="text-nebula-glow animate-[dash_1.5s_ease-out_forwards]" strokeWidth="4" strokeDasharray="41.25, 100" strokeDashoffset="0" stroke="currentColor" fill="none" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
                    </svg>
                    <div className="absolute inset-0 flex items-center justify-center text-[10px] font-black text-slate-50">41.25%</div>
                  </div>
                </div>
              </div>
              <div className="w-32 h-12 relative flex flex-col items-end justify-end">
                <span className="text-[8px] text-nebula-mist mb-1 absolute top-0">Verified Margin</span>
                <svg className="w-full h-full" viewBox="0 0 100 40" preserveAspectRatio="none">
                  <path d="M0,35 L10,32 L20,34 L30,28 L40,30 L50,22 L60,25 L70,18 L80,20 L90,10 L100,5" fill="none" stroke="var(--color-nebula-glow)" strokeWidth="2" className="animate-[dash_1.5s_ease-out_forwards]" strokeDasharray="150" strokeDashoffset="0" />
                </svg>
              </div>
            </div>
          </div>

        </div>
        </Reveal>
      </section>

      {/* ── Section 3: Three Principles ── */}
      <section className="max-w-[1240px] mx-auto px-6 py-12 sm:py-16 border-t border-nebula-steel">
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 rounded-full bg-nebula-surface border border-nebula-steel text-nebula-glow text-[11px] font-bold px-3 py-1 mb-6">
            ⚡ OUR CORE PHILOSOPHY
          </div>
          <SplitText
            as="h2"
            text="Three principles that run every modern agency."
            accent={["principles"]}
            className="block text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight text-slate-50 mb-4"
          />
        </div>

        <Stagger className="grid grid-cols-1 md:grid-cols-3 gap-6" gap={0.12}>
          {/* Card 1 */}
          <StaggerItem className="h-full"><TiltCard max={6} className="h-full backdrop-blur-md bg-nebula-surface/50 border border-nebula-steel/40 rounded-3xl p-6 lg:p-8 flex flex-col transition-colors duration-300 hover:border-nebula-glow/40">
            <div className="inline-flex items-center rounded-full bg-nebula-navy border border-nebula-steel text-nebula-glow text-[10px] font-bold px-3 py-1 mb-6 w-fit">
              PEOPLE
            </div>
            <h3 className="text-sm sm:text-base font-bold text-slate-50 mb-2">Utilization Without Burnout</h3>
            <p className="text-xs sm:text-sm text-nebula-mist leading-relaxed mb-8 flex-1">
              Real-time capacity planning that balances creative energy with business goals — no more spreadsheet guesswork.
            </p>
            <div className="flex items-center gap-4 bg-nebula-navy border border-nebula-steel rounded-xl p-4">
              <div 
                className="relative size-16 shrink-0 cursor-pointer"
                onMouseEnter={() => setShowDonutTooltip(true)}
                onMouseLeave={() => setShowDonutTooltip(false)}
              >
                <svg viewBox="0 0 36 36" className="w-full h-full text-nebula-glow">
                  <path className="text-nebula-void" strokeWidth="4" stroke="currentColor" fill="none" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
                  <path className="text-nebula-glow" strokeWidth="4" strokeDasharray="82, 100" stroke="currentColor" fill="none" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center flex-col">
                  <div className="text-sm font-black text-slate-50">82%</div>
                </div>
                {showDonutTooltip && (
                  <div className="absolute -top-12 left-1/2 -translate-x-1/2 bg-nebula-surface border border-nebula-steel px-3 py-1.5 rounded-lg text-[10px] whitespace-nowrap shadow-xl z-20">
                    <div className="text-slate-50 mb-0.5">Billable: <span className="font-bold text-nebula-glow">82%</span></div>
                    <div className="text-nebula-mist">Non-billable: <span className="font-bold">18%</span></div>
                  </div>
                )}
              </div>
              <div className="flex-1 flex justify-end">
                <div className="flex -space-x-2">
                  <img src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&q=80" className="size-8 rounded-full border-2 border-nebula-surface object-cover" />
                  <img src="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&q=80" className="size-8 rounded-full border-2 border-nebula-surface object-cover" />
                  <img src="https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&q=80" className="size-8 rounded-full border-2 border-nebula-surface object-cover" />
                  <div className="size-8 rounded-full border-2 border-nebula-surface bg-nebula-navy flex items-center justify-center text-[10px] font-bold text-slate-50">+12</div>
                </div>
              </div>
            </div>
          </TiltCard></StaggerItem>

          {/* Card 2 */}
          <StaggerItem className="h-full"><TiltCard max={6} className="h-full backdrop-blur-md bg-nebula-surface/50 border border-nebula-steel/40 rounded-3xl p-6 lg:p-8 flex flex-col transition-colors duration-300 hover:border-nebula-glow/40">
            <div className="inline-flex items-center rounded-full bg-nebula-navy border border-nebula-steel text-nebula-glow text-[10px] font-bold px-3 py-1 mb-6 w-fit">
              PROCESS
            </div>
            <h3 className="text-sm sm:text-base font-bold text-slate-50 mb-2">Six Milestones. Zero Handoff Friction.</h3>
            <p className="text-xs sm:text-sm text-nebula-mist leading-relaxed mb-8 flex-1">
              Linear end-to-end workflows from brief to 1-click client sign-off with automated SLA timers.
            </p>
            <div className="bg-nebula-navy border border-nebula-steel rounded-xl p-5">
              <div className="flex justify-between relative">
                <div className="absolute left-4 right-4 top-3.5 h-[1px] bg-nebula-steel" />
                {["01", "02", "03", "04", "05", "06"].map((step, i) => {
                  const labels = ["Lead", "Onboard", "Brief", "Production", "Review", "Report"];
                  const isActive = activeMilestone === step;
                  return (
                    <div key={step} className="flex flex-col items-center gap-3 z-10 cursor-pointer" onClick={() => setActiveMilestone(step)}>
                      <div className={`w-7 h-7 rounded-full bg-nebula-navy border text-[11px] font-bold flex items-center justify-center transition-all ${isActive ? 'border-nebula-glow text-nebula-glow shadow-[0_0_10px_rgba(127,160,214,0.4)]' : 'border-nebula-steel text-nebula-mist'}`}>
                        {step}
                      </div>
                      <div className={`text-[10px] sm:text-[11px] font-medium text-center whitespace-nowrap ${isActive ? 'text-slate-50' : 'text-nebula-mist'}`}>
                        {labels[i]}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
            <div className="bg-nebula-navy border border-nebula-steel text-nebula-glow text-xs font-semibold px-3 py-1 rounded-full mt-4 inline-flex items-center gap-1.5 w-fit">
              ⚡ SLA 2.4h avg
            </div>
          </TiltCard></StaggerItem>

          {/* Card 3 */}
          <StaggerItem className="h-full"><TiltCard max={6} className="h-full backdrop-blur-md bg-nebula-surface/50 border border-nebula-steel/40 rounded-3xl p-6 lg:p-8 flex flex-col transition-colors duration-300 hover:border-nebula-glow/40">
            <div className="inline-flex items-center rounded-full bg-nebula-navy border border-nebula-steel text-nebula-glow text-[10px] font-bold px-3 py-1 mb-6 w-fit">
              PERFORMANCE
            </div>
            <h3 className="text-sm sm:text-base font-bold text-slate-50 mb-2">Profitability as a Creative Input.</h3>
            <p className="text-xs sm:text-sm text-nebula-mist leading-relaxed mb-8 flex-1">
              Real-time contribution margins on every retainer before month-end panic.
            </p>
            <div className="bg-nebula-navy border border-nebula-steel rounded-xl p-4 space-y-4">
              <div>
                <div className="flex justify-between text-[10px] font-bold text-slate-50 mb-1.5">
                  <span>Astra Living</span>
                  <span>41.25%</span>
                </div>
                <div className="h-2 w-full bg-nebula-void rounded-full overflow-hidden">
                  <div className="h-full bg-nebula-glow w-[41.25%]" />
                </div>
              </div>
              <div>
                <div className="flex justify-between text-[10px] font-bold text-slate-50 mb-1.5">
                  <span>Urban Bakes</span>
                  <span>38%</span>
                </div>
                <div className="h-2 w-full bg-nebula-void rounded-full overflow-hidden">
                  <div className="h-full bg-nebula-glow w-[38%]" />
                </div>
              </div>
              <div>
                <div className="flex justify-between text-[10px] font-bold text-slate-50 mb-1.5">
                  <span>Pulse Mobility</span>
                  <span>44%</span>
                </div>
                <div className="h-2 w-full bg-nebula-void rounded-full overflow-hidden">
                  <div className="h-full bg-nebula-glow w-[44%]" />
                </div>
              </div>
            </div>
          </TiltCard></StaggerItem>
        </Stagger>
      </section>

      {/* ── Section 4: Leadership Pods ── */}
      <section className="max-w-[1240px] mx-auto px-6 py-12 sm:py-16 border-t border-nebula-steel/50">
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 rounded-full bg-nebula-surface border border-nebula-steel/50 text-nebula-glow text-[11px] font-bold px-3 py-1 mb-6">
            ⚡ THE PEOPLE BEHIND CREO
          </div>
          <SplitText
            as="h2"
            text="The team engineering the operating layer."
            accent={["operating", "layer"]}
            className="block text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight text-slate-50 mb-4"
          />
        </div>
        
        <Stagger className="grid grid-cols-1 md:grid-cols-3 gap-6" gap={0.12}>
          {/* Pod 1 */}
          <StaggerItem className="h-full"><TiltCard max={8} className="h-full bg-nebula-surface border border-nebula-steel/50 rounded-xl p-5 flex flex-col hover:border-nebula-glow/40 transition-colors group cursor-pointer">
            <div className="flex items-center gap-4 mb-4">
              <div className="w-12 h-12 rounded-full bg-nebula-navy border border-nebula-steel/50 flex items-center justify-center text-nebula-glow font-bold text-lg">
                CA
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold text-slate-50">Core Architecture Pod</span>
                </div>
                <div className="text-[10px] text-nebula-mist mt-0.5">Runtime &amp; State Engine</div>
              </div>
            </div>
            <p className="text-xs text-nebula-mist leading-relaxed flex-1 mb-4">
              Specialized team maintaining low-latency review pipelines, real-time sync, and SLA automation logic.
            </p>
            <div className="flex justify-end text-nebula-glow">
              <ChevronRight className="size-4 group-hover:translate-x-1 transition-transform" />
            </div>
          </TiltCard></StaggerItem>

          {/* Pod 2 */}
          <StaggerItem className="h-full"><TiltCard max={8} className="h-full bg-nebula-surface border border-nebula-steel/50 rounded-xl p-5 flex flex-col hover:border-nebula-glow/40 transition-colors group cursor-pointer">
            <div className="flex items-center gap-4 mb-4">
              <div className="w-12 h-12 rounded-full bg-nebula-navy border border-nebula-steel/50 flex items-center justify-center text-nebula-glow font-bold text-lg">
                SP
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold text-slate-50">Systems Pod</span>
                </div>
                <div className="text-[10px] text-nebula-mist mt-0.5">Head of Product &amp; Architecture</div>
              </div>
            </div>
            <p className="text-xs text-nebula-mist leading-relaxed flex-1 mb-4">
              Bridging creative workflows with scalable engineering to build the unified OS.
            </p>
            <div className="flex justify-end text-nebula-glow">
              <ChevronRight className="size-4 group-hover:translate-x-1 transition-transform" />
            </div>
          </TiltCard></StaggerItem>

          {/* Pod 3 */}
          <StaggerItem className="h-full"><TiltCard max={8} className="h-full bg-nebula-surface border border-nebula-steel/50 rounded-xl p-5 flex flex-col hover:border-nebula-glow/40 transition-colors group cursor-pointer">
            <div className="flex items-center gap-4 mb-4">
              <div className="w-12 h-12 rounded-full bg-nebula-navy border border-nebula-steel/50 flex items-center justify-center text-nebula-glow font-bold text-lg">
                IE
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold text-slate-50">Agency Engineering Pod</span>
                </div>
                <div className="text-[10px] text-nebula-mist mt-0.5">Lead Infrastructure Engineer</div>
              </div>
            </div>
            <p className="text-xs text-nebula-mist leading-relaxed flex-1 mb-4">
              Building the real-time financial and telemetry pipelines for 50+ agencies.
            </p>
            <div className="flex justify-end text-nebula-glow">
              <ChevronRight className="size-4 group-hover:translate-x-1 transition-transform" />
            </div>
          </TiltCard></StaggerItem>
        </Stagger>
      </section>

    </div>
  );
}

