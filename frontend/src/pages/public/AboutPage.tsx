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
    <div className="w-full bg-[#050810] text-[#F8FAFC] min-h-screen pb-20 lg:pb-24 font-sans selection:bg-[#7FA0D6]/30">
      
      {/* ── Section 1: Hero (2-Column Grid) ── */}
      <section className="relative isolate overflow-clip max-w-[1240px] mx-auto px-4 sm:px-6 pt-8 pb-16 sm:pt-12 sm:pb-20 lg:pt-14 lg:pb-24">
        <motion.div
          aria-hidden="true"
          className="absolute -left-32 top-0 -z-10 size-[30rem] rounded-full bg-[radial-gradient(circle,rgba(127,160,214,0.12),transparent_62%)]"
          animate={{ x: [0, 40, 0], y: [0, 24, 0] }}
          transition={{ duration: 14, repeat: Number.POSITIVE_INFINITY, ease: "easeInOut" }}
        />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-center">
          
          {/* Left Column */}
          <div className="pr-0 lg:pr-8">
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, ease: EASE_OUT_EXPO }}
              className="inline-flex items-center gap-2 rounded-full bg-[#161F2D] border border-[#2A3446] text-[#7FA0D6] text-[11px] font-bold px-3 py-1 mb-6"
            >
              ⚡ OUR MISSION &amp; ORIGIN
            </motion.div>

            <SplitText
              as="h1"
              animateOnMount
              text="Built by agency leaders who refused to accept the chaos."
              accent={["the", "chaos"]}
              className="block text-4xl sm:text-5xl lg:text-[56px] font-black tracking-tight leading-[1.05] text-[#F8FAFC] mb-6"
            />

            <motion.p
              initial={{ opacity: 0, y: 14, filter: "blur(6px)" }}
              animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
              transition={{ duration: 0.8, delay: 0.45, ease: EASE_OUT_EXPO }}
              className="text-sm sm:text-base text-[#97A0B3] max-w-lg mt-4 mb-8 leading-relaxed"
            >
              Creative work should be boundless. Agency operations should be mathematical. We built CREO to replace WhatsApp chasing, lost briefs, and blind margins with a single connected operating system.
            </motion.p>
            
            {/* 3 Stat Pods */}
            <Stagger className="grid grid-cols-1 sm:grid-cols-3 gap-4" delay={0.55} gap={0.1}>
              <StaggerItem className="backdrop-blur-md bg-[#161F2D]/40 border border-[#2A3446]/40 rounded-xl px-6 py-4 flex flex-col justify-center relative transition-colors duration-300 hover:border-[#7FA0D6]/50">
                <div className="absolute top-4 right-4 size-1.5 flex items-center justify-center">
                  <span className="absolute inset-0 rounded-full bg-[#7FA0D6] animate-ping opacity-40"></span>
                  <span className="relative size-1.5 rounded-full bg-[#7FA0D6]"></span>
                </div>
                <CountUp value="48h" className="block text-2xl font-black text-[#F8FAFC] leading-none mb-1.5" />
                <div className="text-xs text-[#97A0B3] uppercase tracking-wider font-semibold">Average SLA Turnaround</div>
              </StaggerItem>
              <StaggerItem className="backdrop-blur-md bg-[#161F2D]/40 border border-[#2A3446]/40 rounded-xl px-6 py-4 flex flex-col justify-center relative transition-colors duration-300 hover:border-[#7FA0D6]/50">
                <div className="absolute top-4 right-4 size-1.5 flex items-center justify-center">
                  <span className="absolute inset-0 rounded-full bg-[#7FA0D6] animate-ping opacity-40"></span>
                  <span className="relative size-1.5 rounded-full bg-[#7FA0D6]"></span>
                </div>
                <CountUp value="99.4%" className="block text-2xl font-black text-[#F8FAFC] leading-none mb-1.5" />
                <div className="text-xs text-[#97A0B3] uppercase tracking-wider font-semibold">On-Time Delivery Rate</div>
              </StaggerItem>
              <StaggerItem className="backdrop-blur-md bg-[#161F2D]/40 border border-[#2A3446]/40 rounded-xl px-6 py-4 flex flex-col justify-center relative transition-colors duration-300 hover:border-[#7FA0D6]/50">
                <div className="absolute top-4 right-4 size-1.5 flex items-center justify-center">
                  <span className="absolute inset-0 rounded-full bg-[#7FA0D6] animate-ping opacity-40"></span>
                  <span className="relative size-1.5 rounded-full bg-[#7FA0D6]"></span>
                </div>
                <div className="text-2xl font-black text-[#F8FAFC] leading-none mb-1.5">1-Click</div>
                <div className="text-xs text-[#97A0B3] uppercase tracking-wider font-semibold">Frictionless Sign-Off</div>
              </StaggerItem>
            </Stagger>
          </div>

          {/* Right Column — Origin & Architecture Terminal */}
          <motion.div
            initial={{ opacity: 0, x: 40, rotateY: -8 }}
            animate={{ opacity: 1, x: 0, rotateY: 0 }}
            transition={{ duration: 1, delay: 0.3, ease: EASE_OUT_EXPO }}
          >
          <TiltCard max={6} className="backdrop-blur-md bg-[#161F2D]/50 border border-[#2A3446]/40 rounded-2xl p-4 sm:p-6 shadow-2xl relative overflow-hidden flex flex-col gap-6">
            <div className="flex items-center justify-between border-b border-[#2A3446] pb-4">
              <div className="font-black text-[#F8FAFC] text-sm tracking-tight">CREO Kernel v2.6 &bull; Architecture Blueprint</div>
              <div className="text-[#7FA0D6] text-xs font-semibold flex items-center gap-2">
                <div className="relative size-2 flex items-center justify-center">
                  <span className="absolute inset-0 rounded-full bg-[#7FA0D6] animate-ping opacity-30"></span>
                  <span className="relative size-1.5 rounded-full bg-[#7FA0D6]"></span>
                </div>
                System Status: Autonomous Ops
              </div>
            </div>
            
            <Stagger className="space-y-3" delay={0.6} gap={0.15}>
              <StaggerItem className="bg-[#0A0F18] border border-[#2A3446] p-4 rounded-xl space-y-1">
                <div className="text-[#97A0B3] text-[10px] font-bold uppercase">The Fragmented Era (2018–2024)</div>
                <div className="text-[#97A0B3] text-xs">WhatsApp, Drive, and Sheets created 7 disconnected blindspots.</div>
              </StaggerItem>
              <StaggerItem className="bg-[#0A0F18] border border-[#2A3446] p-4 rounded-xl space-y-1">
                <div className="text-[#97A0B3] text-[10px] font-bold uppercase">The Operating Shift (2025)</div>
                <div className="text-[#F8FAFC] text-xs font-medium">Unifying creative production, capacity heatmaps, and unit margins into one engine.</div>
              </StaggerItem>
              <StaggerItem className="bg-[#0A0F18] border border-[#2A3446] p-4 rounded-xl space-y-1">
                <div className="text-[#97A0B3] text-[10px] font-bold uppercase">The Autonomous Studio (2026+)</div>
                <div className="text-[#7FA0D6] text-xs font-bold">Predictive pod resourcing and automated margin recovery across 52+ agencies.</div>
              </StaggerItem>
            </Stagger>
            
            <div className="mt-4 pt-4 border-t border-[#2A3446] flex items-center justify-between text-[10px] font-medium text-[#97A0B3]">
              <div>Engineered in Bengaluru &bull; Deployed Globally</div>
              <div className="flex items-center gap-1.5"><span className="size-1.5 rounded-full bg-[#7FA0D6]"></span> Live Latency: 24ms</div>
            </div>
          </TiltCard>
          </motion.div>
        </div>
      </section>

      {/* ── Section 2: Why CREO Exists ── */}
      <section className="max-w-[1240px] mx-auto px-4 sm:px-6 py-12 sm:py-16 border-t border-[#2A3446]">
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 rounded-full bg-[#161F2D] border border-[#2A3446] text-[#7FA0D6] text-[11px] font-bold px-3 py-1 mb-6">
            ⚡ THE ORIGIN STORY
          </div>
          <SplitText
            as="h2"
            text="Why CREO Exists: Breaking the 7 Fragmented Silos."
            accent={["7", "Fragmented", "Silos"]}
            className="block text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight text-[#F8FAFC] mb-4"
          />
          <Reveal delay={0.1}>
            <p className="text-sm sm:text-base text-[#97A0B3]">Before CREO, running an agency meant gluing together 7 disconnected tools.</p>
          </Reveal>
        </div>

        <Reveal blur>
        <div className="relative grid grid-cols-1 lg:grid-cols-[1fr_auto_1fr] gap-8 items-center">
          
          {/* Left Card - The Past / Chaos */}
          <div 
            className={`bg-[#0A0F18] border rounded-3xl p-4 sm:p-6 lg:p-8 transition-all duration-300 ${hoverSection === 'past' ? 'border-[#D8BF9B]/30 shadow-[0_0_20px_-10px_rgba(216,191,155,0.1)]' : 'border-[#D8BF9B]/20'}`}
            onMouseEnter={() => setHoverSection('past')}
            onMouseLeave={() => setHoverSection(null)}
          >
            <div className="flex items-center gap-3 mb-2">
              <AlertCircle className="size-5 text-[#D8BF9B]" />
              <h3 className="text-sm sm:text-base font-bold text-[#F8FAFC]">The Past / <span className="text-[#D8BF9B]">Chaos</span></h3>
            </div>
            <p className="text-xs sm:text-sm text-[#97A0B3] leading-relaxed mb-8 pb-4 border-b border-[#2A3446]">Disconnected tools. Lost time. Real money.</p>
            
            <div className="flex flex-wrap gap-4 mb-8">
               <div className="relative w-12 h-12 rounded-xl flex items-center justify-center bg-[#0A0F18] border border-[#2A3446] text-[#97A0B3]">
                 <MessageSquare className="size-6" />
                 <span className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-[#D8BF9B]/10 border border-[#D8BF9B]/20 text-[#D8BF9B] rounded-full flex items-center justify-center text-[10px] font-bold shadow">!</span>
               </div>
               <div className="relative w-12 h-12 rounded-xl flex items-center justify-center bg-[#0A0F18] border border-[#2A3446] text-[#97A0B3]">
                 <FileSpreadsheet className="size-6" />
                 <span className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-[#D8BF9B]/10 border border-[#D8BF9B]/20 text-[#D8BF9B] rounded-full flex items-center justify-center text-[10px] font-bold shadow">!</span>
               </div>
               <div className="relative w-12 h-12 rounded-xl flex items-center justify-center bg-[#0A0F18] border border-[#2A3446] text-[#97A0B3]">
                 <HardDrive className="size-6" />
                 <span className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-[#D8BF9B]/10 border border-[#D8BF9B]/20 text-[#D8BF9B] rounded-full flex items-center justify-center text-[10px] font-bold shadow">!</span>
               </div>
               <div className="relative w-12 h-12 rounded-xl flex items-center justify-center bg-[#0A0F18] border border-[#2A3446] text-[#97A0B3] font-serif font-bold text-lg">
                 N
                 <span className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-[#D8BF9B]/10 border border-[#D8BF9B]/20 text-[#D8BF9B] rounded-full flex items-center justify-center text-[10px] font-bold shadow">!</span>
               </div>
            </div>
            
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="size-5 rounded-full bg-[#D8BF9B]/10 border border-[#D8BF9B]/20 flex items-center justify-center shrink-0 shadow-sm text-[#D8BF9B] text-xs font-bold">!</div>
                <div>
                  <div className="text-xs font-bold text-[#F8FAFC]">Lost scope</div>
                  <div className="text-[10px] text-[#97A0B3]">Clients scattered across WhatsApp &amp; Email</div>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="size-5 rounded-full bg-[#D8BF9B]/10 border border-[#D8BF9B]/20 flex items-center justify-center shrink-0 shadow-sm text-[#D8BF9B] text-xs font-bold">!</div>
                <div>
                  <div className="text-xs font-bold text-[#F8FAFC]">48-hour approval lags</div>
                  <div className="text-[10px] text-[#97A0B3]">Projects lost in Google Sheets &amp; Notion</div>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="size-5 rounded-full bg-[#D8BF9B]/10 border border-[#D8BF9B]/20 flex items-center justify-center shrink-0 shadow-sm text-[#D8BF9B] text-xs font-bold">!</div>
                <div>
                  <div className="text-xs font-bold text-[#F8FAFC]">Unbilled extra revisions</div>
                  <div className="text-[10px] text-[#97A0B3]">Assets messy in Drive folders &amp; broken links</div>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="size-5 rounded-full bg-[#D8BF9B]/10 border border-[#D8BF9B]/20 flex items-center justify-center shrink-0 shadow-sm text-[#D8BF9B] text-xs font-bold">!</div>
                <div>
                  <div className="text-xs font-bold text-[#F8FAFC]">Zero margin visibility</div>
                  <div className="text-[10px] text-[#97A0B3]">Manual spreadsheets &amp; blind billing</div>
                </div>
              </div>
            </div>
          </div>
          
          {/* Center Connector */}
          <div className="hidden lg:flex justify-center z-10">
            <div className={`w-12 h-12 rounded-full bg-[#161F2D] border flex items-center justify-center font-bold text-[10px] text-center transition-all duration-300 ${hoverSection ? 'border-[#7FA0D6] text-[#7FA0D6] shadow-[0_0_15px_rgba(127,160,214,0.3)]' : 'border-[#2A3446] text-[#97A0B3]'}`}>
              THE<br/>CREO<br/>SHIFT
            </div>
          </div>
          <div className="flex justify-center lg:hidden">
            <div className={`w-12 h-12 rounded-full bg-[#161F2D] border flex items-center justify-center font-bold text-[10px] text-center transition-all duration-300 ${hoverSection ? 'border-[#7FA0D6] text-[#7FA0D6] shadow-[0_0_15px_rgba(127,160,214,0.3)]' : 'border-[#2A3446] text-[#97A0B3]'}`}>
              THE<br/>CREO<br/>SHIFT
            </div>
          </div>

          {/* Right Card - The CREO Advantage / Precision */}
          <div 
            className={`bg-[#0A0F18] border rounded-3xl p-4 sm:p-6 lg:p-8 relative overflow-hidden transition-all duration-300 ${hoverSection === 'creo' ? 'border-[#7FA0D6]/60 shadow-[0_0_40px_-15px_rgba(127,160,214,0.3)]' : 'border-[#2A3446]/50 shadow-[0_0_40px_-15px_rgba(127,160,214,0.05)]'}`}
            onMouseEnter={() => setHoverSection('creo')}
            onMouseLeave={() => setHoverSection(null)}
          >
            <div className="flex items-center gap-3 mb-2">
              <BarChart3 className="size-5 text-[#7FA0D6]" />
              <h3 className="text-sm sm:text-base font-bold text-[#F8FAFC]">The CREO Advantage / <span className="text-[#7FA0D6]">Precision</span></h3>
            </div>
            <p className="text-xs sm:text-sm text-[#97A0B3] leading-relaxed mb-8 pb-4 border-b border-[#2A3446]">One unified workflow. Total visibility.</p>

            <div className="space-y-5 mb-8">
              <div className="flex items-start gap-3">
                <svg className="size-5 text-[#7FA0D6] shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" className="animate-[dash_1s_ease-out_forwards]" strokeDasharray="60" strokeDashoffset="0" /></svg>
                <div>
                  <div className="text-xs font-bold text-[#F8FAFC]">Unified Client Dossiers</div>
                  <div className="text-[10px] text-[#97A0B3]">All client data, communications &amp; history</div>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <svg className="size-5 text-[#7FA0D6] shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" className="animate-[dash_1s_ease-out_forwards]" strokeDasharray="60" strokeDashoffset="0" /></svg>
                <div>
                  <div className="text-xs font-bold text-[#F8FAFC]">Utilization-Linked Sprints</div>
                  <div className="text-[10px] text-[#97A0B3]">Right people. Right work. Every time</div>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <svg className="size-5 text-[#7FA0D6] shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" className="animate-[dash_1s_ease-out_forwards]" strokeDasharray="60" strokeDashoffset="0" /></svg>
                <div>
                  <div className="text-xs font-bold text-[#F8FAFC]">1-Click Client Portal Approvals</div>
                  <div className="text-[10px] text-[#97A0B3]">Faster sign-offs. Happier clients</div>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <svg className="size-5 text-[#7FA0D6] shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" className="animate-[dash_1s_ease-out_forwards]" strokeDasharray="60" strokeDashoffset="0" /></svg>
                <div>
                  <div className="text-xs font-bold text-[#F8FAFC]">Real-Time Unit Economics</div>
                  <div className="text-[10px] text-[#97A0B3]">Know your numbers. Grow smarter</div>
                </div>
              </div>
            </div>

            <div className="bg-[#0A0F18] border border-[#2A3446] rounded-xl p-4 flex items-center justify-between">
              <div>
                <div className="text-[10px] text-[#97A0B3] font-bold uppercase mb-1">Astra Living — Retainer Margin</div>
                <div className="flex items-center gap-3">
                  <div className="relative size-12 mb-1">
                    <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
                      <path className="text-[#050810]" strokeWidth="4" stroke="currentColor" fill="none" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
                      <path className="text-[#7FA0D6] animate-[dash_1.5s_ease-out_forwards]" strokeWidth="4" strokeDasharray="41.25, 100" strokeDashoffset="0" stroke="currentColor" fill="none" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
                    </svg>
                    <div className="absolute inset-0 flex items-center justify-center text-[10px] font-black text-[#F8FAFC]">41.25%</div>
                  </div>
                </div>
              </div>
              <div className="w-32 h-12 relative flex flex-col items-end justify-end">
                <span className="text-[8px] text-[#97A0B3] mb-1 absolute top-0">Verified Margin</span>
                <svg className="w-full h-full" viewBox="0 0 100 40" preserveAspectRatio="none">
                  <path d="M0,35 L10,32 L20,34 L30,28 L40,30 L50,22 L60,25 L70,18 L80,20 L90,10 L100,5" fill="none" stroke="#7FA0D6" strokeWidth="2" className="animate-[dash_1.5s_ease-out_forwards]" strokeDasharray="150" strokeDashoffset="0" />
                </svg>
              </div>
            </div>
          </div>

        </div>
        </Reveal>
      </section>

      {/* ── Section 3: Three Principles ── */}
      <section className="max-w-[1240px] mx-auto px-4 sm:px-6 py-12 sm:py-16 border-t border-[#2A3446]">
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 rounded-full bg-[#161F2D] border border-[#2A3446] text-[#7FA0D6] text-[11px] font-bold px-3 py-1 mb-6">
            ⚡ OUR CORE PHILOSOPHY
          </div>
          <SplitText
            as="h2"
            text="Three principles that run every modern agency."
            accent={["principles"]}
            className="block text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight text-[#F8FAFC] mb-4"
          />
        </div>

        <Stagger className="grid grid-cols-1 lg:grid-cols-3 gap-6" gap={0.12}>
          {/* Card 1 */}
          <StaggerItem className="h-full"><TiltCard max={6} className="h-full backdrop-blur-md bg-[#161F2D]/50 border border-[#2A3446]/40 rounded-3xl p-4 sm:p-6 lg:p-8 flex flex-col transition-colors duration-300 hover:border-[#7FA0D6]/40">
            <div className="inline-flex items-center rounded-full bg-[#0A0F18] border border-[#2A3446] text-[#7FA0D6] text-[10px] font-bold px-3 py-1 mb-6 w-fit">
              PEOPLE
            </div>
            <h3 className="text-sm sm:text-base font-bold text-[#F8FAFC] mb-2">Utilization Without Burnout</h3>
            <p className="text-xs sm:text-sm text-[#97A0B3] leading-relaxed mb-8 flex-1">
              Real-time capacity planning that balances creative energy with business goals — no more spreadsheet guesswork.
            </p>
            <div className="flex items-center gap-4 bg-[#0A0F18] border border-[#2A3446] rounded-xl p-4">
              <div 
                className="relative size-16 shrink-0 cursor-pointer"
                onMouseEnter={() => setShowDonutTooltip(true)}
                onMouseLeave={() => setShowDonutTooltip(false)}
              >
                <svg viewBox="0 0 36 36" className="w-full h-full text-[#7FA0D6]">
                  <path className="text-[#050810]" strokeWidth="4" stroke="currentColor" fill="none" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
                  <path className="text-[#7FA0D6]" strokeWidth="4" strokeDasharray="82, 100" stroke="currentColor" fill="none" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center flex-col">
                  <div className="text-sm font-black text-[#F8FAFC]">82%</div>
                </div>
                {showDonutTooltip && (
                  <div className="absolute -top-12 left-1/2 -translate-x-1/2 bg-[#161F2D] border border-[#2A3446] px-3 py-1.5 rounded-lg text-[10px] whitespace-nowrap shadow-xl z-20">
                    <div className="text-[#F8FAFC] mb-0.5">Billable: <span className="font-bold text-[#7FA0D6]">82%</span></div>
                    <div className="text-[#97A0B3]">Non-billable: <span className="font-bold">18%</span></div>
                  </div>
                )}
              </div>
              <div className="flex-1 flex justify-end">
                <div className="flex -space-x-2">
                  <img src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&q=80" className="size-8 rounded-full border-2 border-[#161F2D] object-cover" />
                  <img src="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&q=80" className="size-8 rounded-full border-2 border-[#161F2D] object-cover" />
                  <img src="https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&q=80" className="size-8 rounded-full border-2 border-[#161F2D] object-cover" />
                  <div className="size-8 rounded-full border-2 border-[#161F2D] bg-[#0A0F18] flex items-center justify-center text-[10px] font-bold text-[#F8FAFC]">+12</div>
                </div>
              </div>
            </div>
          </TiltCard></StaggerItem>

          {/* Card 2 */}
          <StaggerItem className="h-full"><TiltCard max={6} className="h-full backdrop-blur-md bg-[#161F2D]/50 border border-[#2A3446]/40 rounded-3xl p-4 sm:p-6 lg:p-8 flex flex-col transition-colors duration-300 hover:border-[#7FA0D6]/40">
            <div className="inline-flex items-center rounded-full bg-[#0A0F18] border border-[#2A3446] text-[#7FA0D6] text-[10px] font-bold px-3 py-1 mb-6 w-fit">
              PROCESS
            </div>
            <h3 className="text-sm sm:text-base font-bold text-[#F8FAFC] mb-2">Six Milestones. Zero Handoff Friction.</h3>
            <p className="text-xs sm:text-sm text-[#97A0B3] leading-relaxed mb-8 flex-1">
              Linear end-to-end workflows from brief to 1-click client sign-off with automated SLA timers.
            </p>
            <div className="bg-[#0A0F18] border border-[#2A3446] rounded-xl p-5">
              <div className="grid grid-cols-3 gap-x-2 gap-y-5 xl:flex xl:justify-between relative">
                <div className="hidden xl:block absolute left-4 right-4 top-3.5 h-[1px] bg-[#2A3446]" />
                {["01", "02", "03", "04", "05", "06"].map((step, i) => {
                  const labels = ["Lead", "Onboard", "Brief", "Production", "Review", "Report"];
                  const isActive = activeMilestone === step;
                  return (
                    <button type="button" key={step} aria-pressed={isActive} className="flex min-h-11 flex-col items-center gap-2 sm:gap-3 z-10 cursor-pointer" onClick={() => setActiveMilestone(step)}>
                      <div className={`w-7 h-7 rounded-full bg-[#0A0F18] border text-[11px] font-bold flex items-center justify-center transition-all ${isActive ? 'border-[#7FA0D6] text-[#7FA0D6] shadow-[0_0_10px_rgba(127,160,214,0.4)]' : 'border-[#2A3446] text-[#97A0B3]'}`}>
                        {step}
                      </div>
                      <div className={`text-[10px] sm:text-[11px] font-medium text-center whitespace-nowrap ${isActive ? 'text-[#F8FAFC]' : 'text-[#97A0B3]'}`}>
                        {labels[i]}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
            <div className="bg-[#0A0F18] border border-[#2A3446] text-[#7FA0D6] text-xs font-semibold px-3 py-1 rounded-full mt-4 inline-flex items-center gap-1.5 w-fit">
              ⚡ SLA 2.4h avg
            </div>
          </TiltCard></StaggerItem>

          {/* Card 3 */}
          <StaggerItem className="h-full"><TiltCard max={6} className="h-full backdrop-blur-md bg-[#161F2D]/50 border border-[#2A3446]/40 rounded-3xl p-4 sm:p-6 lg:p-8 flex flex-col transition-colors duration-300 hover:border-[#7FA0D6]/40">
            <div className="inline-flex items-center rounded-full bg-[#0A0F18] border border-[#2A3446] text-[#7FA0D6] text-[10px] font-bold px-3 py-1 mb-6 w-fit">
              PERFORMANCE
            </div>
            <h3 className="text-sm sm:text-base font-bold text-[#F8FAFC] mb-2">Profitability as a Creative Input.</h3>
            <p className="text-xs sm:text-sm text-[#97A0B3] leading-relaxed mb-8 flex-1">
              Real-time contribution margins on every retainer before month-end panic.
            </p>
            <div className="bg-[#0A0F18] border border-[#2A3446] rounded-xl p-4 space-y-4">
              <div>
                <div className="flex justify-between text-[10px] font-bold text-[#F8FAFC] mb-1.5">
                  <span>Astra Living</span>
                  <span>41.25%</span>
                </div>
                <div className="h-2 w-full bg-[#050810] rounded-full overflow-hidden">
                  <div className="h-full bg-[#7FA0D6] w-[41.25%]" />
                </div>
              </div>
              <div>
                <div className="flex justify-between text-[10px] font-bold text-[#F8FAFC] mb-1.5">
                  <span>Urban Bakes</span>
                  <span>38%</span>
                </div>
                <div className="h-2 w-full bg-[#050810] rounded-full overflow-hidden">
                  <div className="h-full bg-[#7FA0D6] w-[38%]" />
                </div>
              </div>
              <div>
                <div className="flex justify-between text-[10px] font-bold text-[#F8FAFC] mb-1.5">
                  <span>Pulse Mobility</span>
                  <span>44%</span>
                </div>
                <div className="h-2 w-full bg-[#050810] rounded-full overflow-hidden">
                  <div className="h-full bg-[#7FA0D6] w-[44%]" />
                </div>
              </div>
            </div>
          </TiltCard></StaggerItem>
        </Stagger>
      </section>

      {/* ── Section 4: Leadership Pods ── */}
      <section className="max-w-[1240px] mx-auto px-4 sm:px-6 py-12 sm:py-16 border-t border-[#2A3446]/50">
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 rounded-full bg-[#161F2D] border border-[#2A3446]/50 text-[#7FA0D6] text-[11px] font-bold px-3 py-1 mb-6">
            ⚡ THE PEOPLE BEHIND CREO
          </div>
          <SplitText
            as="h2"
            text="The team engineering the operating layer."
            accent={["operating", "layer"]}
            className="block text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight text-[#F8FAFC] mb-4"
          />
        </div>
        
        <Stagger className="grid grid-cols-1 lg:grid-cols-3 gap-6" gap={0.12}>
          {/* Pod 1 */}
          <StaggerItem className="h-full"><TiltCard max={8} className="h-full bg-[#161F2D] border border-[#2A3446]/50 rounded-xl p-5 flex flex-col hover:border-[#7FA0D6]/40 transition-colors group cursor-pointer">
            <div className="flex items-center gap-4 mb-4">
              <div className="w-12 h-12 rounded-full bg-[#0A0F18] border border-[#2A3446]/50 flex items-center justify-center text-[#7FA0D6] font-bold text-lg">
                CA
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold text-[#F8FAFC]">Core Architecture Pod</span>
                </div>
                <div className="text-[10px] text-[#97A0B3] mt-0.5">Runtime &amp; State Engine</div>
              </div>
            </div>
            <p className="text-xs text-[#97A0B3] leading-relaxed flex-1 mb-4">
              Specialized team maintaining low-latency review pipelines, real-time sync, and SLA automation logic.
            </p>
            <div className="flex justify-end text-[#7FA0D6]">
              <ChevronRight className="size-4 group-hover:translate-x-1 transition-transform" />
            </div>
          </TiltCard></StaggerItem>

          {/* Pod 2 */}
          <StaggerItem className="h-full"><TiltCard max={8} className="h-full bg-[#161F2D] border border-[#2A3446]/50 rounded-xl p-5 flex flex-col hover:border-[#7FA0D6]/40 transition-colors group cursor-pointer">
            <div className="flex items-center gap-4 mb-4">
              <div className="w-12 h-12 rounded-full bg-[#0A0F18] border border-[#2A3446]/50 flex items-center justify-center text-[#7FA0D6] font-bold text-lg">
                SP
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold text-[#F8FAFC]">Systems Pod</span>
                </div>
                <div className="text-[10px] text-[#97A0B3] mt-0.5">Head of Product &amp; Architecture</div>
              </div>
            </div>
            <p className="text-xs text-[#97A0B3] leading-relaxed flex-1 mb-4">
              Bridging creative workflows with scalable engineering to build the unified OS.
            </p>
            <div className="flex justify-end text-[#7FA0D6]">
              <ChevronRight className="size-4 group-hover:translate-x-1 transition-transform" />
            </div>
          </TiltCard></StaggerItem>

          {/* Pod 3 */}
          <StaggerItem className="h-full"><TiltCard max={8} className="h-full bg-[#161F2D] border border-[#2A3446]/50 rounded-xl p-5 flex flex-col hover:border-[#7FA0D6]/40 transition-colors group cursor-pointer">
            <div className="flex items-center gap-4 mb-4">
              <div className="w-12 h-12 rounded-full bg-[#0A0F18] border border-[#2A3446]/50 flex items-center justify-center text-[#7FA0D6] font-bold text-lg">
                IE
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold text-[#F8FAFC]">Agency Engineering Pod</span>
                </div>
                <div className="text-[10px] text-[#97A0B3] mt-0.5">Lead Infrastructure Engineer</div>
              </div>
            </div>
            <p className="text-xs text-[#97A0B3] leading-relaxed flex-1 mb-4">
              Building the real-time financial and telemetry pipelines for 50+ agencies.
            </p>
            <div className="flex justify-end text-[#7FA0D6]">
              <ChevronRight className="size-4 group-hover:translate-x-1 transition-transform" />
            </div>
          </TiltCard></StaggerItem>
        </Stagger>
      </section>

    </div>
  );
}

