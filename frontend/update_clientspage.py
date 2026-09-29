import os

filepath = r'd:\creo-main\frontend\src\pages\public\ClientsPage.tsx'

content = """import { useState } from "react";
import { 
  Play, Activity, 
  CheckSquare, ChevronRight, Zap, Layers,
  Link, Clock, Unlock, Plus, Volume2, Settings, Maximize, Copy
} from "lucide-react";

export function ClientsPage() {
  const [activeWorkflowTab, setActiveWorkflowTab] = useState('All');

  return (
    <div className="w-full bg-[#050810] text-[#F8FAFC] min-h-screen pb-20 lg:pb-24 font-sans selection:bg-[#7FA0D6]/30">
      
      {/* ── Section 1: Hero & Pipeline Monitor ── */}
      <section className="max-w-[1240px] mx-auto px-6 py-24 lg:py-32">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-center">
          
          {/* Left Column - Headline & Metrics */}
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-[#161F2D] border border-[#2A3446]/50 text-[#7FA0D6] text-[11px] font-bold px-3 py-1 mb-6 uppercase tracking-wider">
              CREATIVE OPERATIONS
            </div>
            
            <h1 className="text-4xl sm:text-5xl lg:text-[56px] font-black tracking-tight leading-[1.05] text-[#F8FAFC] mb-6">
              Trusted by the world's most ambitious <span className="text-[#7FA0D6]">creative teams.</span>
            </h1>
            
            <p className="text-sm text-[#97A0B3] max-w-lg mb-10 leading-relaxed">
              High-performance creative production, AI-assisted workflows, and secure asset delivery — all in one place.
            </p>
            
            {/* Metrics */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="bg-[#161F2D]/60 backdrop-blur-md border border-[#2A3446]/50 rounded-xl p-4 flex flex-col justify-center">
                <div className="text-[#97A0B3] mb-2"><Zap className="size-4" /></div>
                <div className="text-2xl font-black text-[#F8FAFC] leading-none mb-1">48h</div>
                <div className="text-[10px] text-[#F8FAFC] font-semibold mb-1">Turnaround</div>
                <div className="text-[9px] text-[#97A0B3]">Average delivery time</div>
              </div>
              <div className="bg-[#161F2D]/60 backdrop-blur-md border border-[#2A3446]/50 rounded-xl p-4 flex flex-col justify-center">
                <div className="text-[#97A0B3] mb-2"><Clock className="size-4" /></div>
                <div className="text-2xl font-black text-[#F8FAFC] leading-none mb-1">99.4%</div>
                <div className="text-[10px] text-[#F8FAFC] font-semibold mb-1">On-Time</div>
                <div className="text-[9px] text-[#97A0B3]">Delivery success rate</div>
              </div>
              <div className="bg-[#161F2D]/60 backdrop-blur-md border border-[#2A3446]/50 rounded-xl p-4 flex flex-col justify-center">
                <div className="text-[#97A0B3] mb-2"><Activity className="size-4" /></div>
                <div className="text-2xl font-black text-[#F8FAFC] leading-none mb-1">1.1x</div>
                <div className="text-[10px] text-[#F8FAFC] font-semibold mb-1">Review Loops</div>
                <div className="text-[9px] text-[#97A0B3]">Avg. per project</div>
              </div>
              <div className="bg-[#161F2D]/60 backdrop-blur-md border border-[#2A3446]/50 rounded-xl p-4 flex flex-col justify-center">
                <div className="text-[#97A0B3] mb-2"><Link className="size-4" /></div>
                <div className="text-2xl font-black text-[#F8FAFC] leading-none mb-1">100%</div>
                <div className="text-[10px] text-[#F8FAFC] font-semibold mb-1">Token Magic-Links</div>
                <div className="text-[9px] text-[#97A0B3]">Secure client access</div>
              </div>
            </div>
          </div>

          {/* Right Column - Asset Pipeline Monitor */}
          <div className="bg-[#161F2D]/60 backdrop-blur-md border border-[#2A3446]/50 rounded-2xl p-6 shadow-2xl">
            <div className="flex items-center justify-between mb-8 pb-4 border-b border-[#2A3446]/50">
              <div className="flex items-center gap-2 text-sm font-bold text-[#F8FAFC]">
                <Layers className="size-4 text-[#7FA0D6]" /> Asset Pipeline
              </div>
              <div className="flex items-center gap-2 text-xs font-semibold text-[#7FA0D6]">
                <span className="size-2 rounded-full bg-[#7FA0D6] animate-pulse"></span> Live
              </div>
            </div>
            
            <div className="space-y-6">
              {/* Ingested */}
              <div>
                <div className="flex items-center justify-between text-xs mb-2">
                  <div className="flex items-center gap-2 text-[#F8FAFC] font-semibold">
                    <span className="size-1.5 rounded-full bg-[#7FA0D6]"></span> Ingested
                  </div>
                  <div className="text-[10px] text-[#97A0B3]">100%</div>
                </div>
                <div className="text-[10px] text-[#97A0B3] mb-2">12 assets</div>
                <div className="h-1.5 w-full bg-[#0A0F18] rounded-full overflow-hidden">
                  <div className="h-full bg-[#7FA0D6] w-full" />
                </div>
              </div>
              {/* In Review */}
              <div>
                <div className="flex items-center justify-between text-xs mb-2">
                  <div className="flex items-center gap-2 text-[#F8FAFC] font-semibold">
                    <span className="size-1.5 rounded-full bg-[#7FA0D6]"></span> In Review
                  </div>
                  <div className="text-[10px] text-[#97A0B3]">58%</div>
                </div>
                <div className="text-[10px] text-[#97A0B3] mb-2">7 assets</div>
                <div className="h-1.5 w-full bg-[#0A0F18] rounded-full overflow-hidden">
                  <div className="h-full bg-[#7FA0D6] w-[58%]" />
                </div>
              </div>
              {/* Changes Requested */}
              <div>
                <div className="flex items-center justify-between text-xs mb-2">
                  <div className="flex items-center gap-2 text-[#F8FAFC] font-semibold">
                    <span className="size-1.5 rounded-full bg-[#D8BF9B]"></span> Changes Requested
                  </div>
                  <div className="text-[10px] text-[#97A0B3]">25%</div>
                </div>
                <div className="text-[10px] text-[#97A0B3] mb-2">3 assets</div>
                <div className="h-1.5 w-full bg-[#0A0F18] rounded-full overflow-hidden">
                  <div className="h-full bg-[#D8BF9B] w-[25%]" />
                </div>
              </div>
              {/* Approved */}
              <div>
                <div className="flex items-center justify-between text-xs mb-2">
                  <div className="flex items-center gap-2 text-[#F8FAFC] font-semibold">
                    <span className="size-1.5 rounded-full bg-[#7FA0D6]"></span> Approved
                  </div>
                  <div className="text-[10px] text-[#97A0B3]">100%</div>
                </div>
                <div className="text-[10px] text-[#97A0B3] mb-2">8 assets</div>
                <div className="h-1.5 w-full bg-[#0A0F18] rounded-full overflow-hidden">
                  <div className="h-full bg-[#7FA0D6] w-full" />
                </div>
              </div>
            </div>

            <div className="mt-8 pt-4 border-t border-[#2A3446]/50 flex items-center gap-3">
               <Activity className="size-4 text-[#97A0B3]" />
               <div>
                 <div className="text-[10px] font-bold text-[#F8FAFC]">Pipeline healthy</div>
                 <div className="text-[10px] text-[#97A0B3]">All systems operational</div>
               </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Section 2: Creative Workflows ── */}
      <section className="max-w-[1240px] mx-auto px-6 py-24 border-t border-[#2A3446]/50">
        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6 mb-12">
          <div>
            <h2 className="text-2xl sm:text-3xl font-black text-[#F8FAFC] mb-2">Creative Workflows</h2>
            <p className="text-sm text-[#97A0B3]">From concept to final delivery — optimized for speed, quality and scale.</p>
          </div>
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between lg:justify-end gap-6 lg:gap-12 w-full lg:w-auto">
            <div className="flex items-center gap-2 bg-[#161F2D] border border-[#2A3446]/50 p-1 rounded-full overflow-x-auto w-full sm:w-auto hide-scrollbar">
              {['All', 'Video', 'Design', 'Motion', 'Post'].map(tab => (
                <button 
                  key={tab}
                  onClick={() => setActiveWorkflowTab(tab)}
                  className={`text-[11px] font-semibold px-4 py-1.5 rounded-full transition-colors whitespace-nowrap ${activeWorkflowTab === tab ? 'bg-[#7FA0D6] text-[#050810]' : 'text-[#97A0B3] hover:text-[#F8FAFC]'}`}
                >
                  {tab}
                </button>
              ))}
            </div>
            <div className="text-[11px] font-bold text-[#F8FAFC] flex items-center gap-1.5 cursor-pointer hover:text-[#7FA0D6] transition-colors shrink-0">
              View All <ChevronRight className="size-3" />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[
            { title: 'Motion & 3D Pod', desc: '3D motion, CGI, virtual production, product demos.', img: 'https://images.unsplash.com/photo-1614729939124-03290b5609ce?auto=format&fit=crop&w=600&q=80', badge: 'VIDEO' },
            { title: 'High-Velocity DTC Creative', desc: 'Short-form, social, paid media, performance creative.', img: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&w=600&q=80', badge: 'VIDEO' },
            { title: 'Brand & Design Architecture', desc: 'Visual identity, brand systems, motion design.', img: 'https://images.unsplash.com/photo-1502672260266-1c1c24240f38?auto=format&fit=crop&w=600&q=80', badge: 'DESIGN' },
            { title: 'Performance Ad Operations', desc: 'Creative testing, scaling, reporting, optimization.', img: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?auto=format&fit=crop&w=600&q=80', badge: 'OPS' },
            { title: 'Enterprise Creative Ops', desc: 'Workflow management, stakeholder sync, delivery.', img: 'https://images.unsplash.com/photo-1497215728101-856f4ea42174?auto=format&fit=crop&w=600&q=80', badge: 'OPS' },
            { title: 'Post-Production House', desc: 'Edit, color, sound, VFX, final mastering.', img: 'https://images.unsplash.com/photo-1579227114347-15d08fc37cae?auto=format&fit=crop&w=600&q=80', badge: 'POST' }
          ].map(card => (
            <div key={card.title} className="bg-[#161F2D]/60 backdrop-blur-md border border-[#2A3446]/50 rounded-2xl p-4 group cursor-pointer hover:border-[#7FA0D6]/40 transition-colors flex flex-col">
              <div className="relative h-40 rounded-xl overflow-hidden mb-5">
                <img src={card.img} alt={card.title} className="w-full h-full object-cover opacity-80 group-hover:opacity-100 group-hover:scale-105 transition-all duration-500" />
                <div className="absolute top-3 right-3 bg-[#050810]/80 backdrop-blur-sm border border-[#2A3446] px-2 py-1 rounded text-[9px] font-bold text-[#F8FAFC]">
                  {card.badge}
                </div>
              </div>
              <h3 className="text-sm font-bold text-[#F8FAFC] mb-2">{card.title}</h3>
              <p className="text-xs text-[#97A0B3] mb-6 flex-1">{card.desc}</p>
              <div className="flex items-center justify-between border-t border-[#2A3446]/50 pt-4">
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-1.5 text-[9px] text-[#97A0B3] font-semibold"><CheckSquare className="size-3" /> 4K ProRes</div>
                  <div className="flex items-center gap-1.5 text-[9px] text-[#97A0B3] font-semibold"><Maximize className="size-3" /> 9:16 Scale</div>
                  <div className="flex items-center gap-1.5 text-[9px] text-[#97A0B3] font-semibold"><Unlock className="size-3" /> Token Gate</div>
                </div>
                <ChevronRight className="size-4 text-[#7FA0D6] group-hover:translate-x-1 transition-transform" />
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── Section 3: Engineering Standards ── */}
      <section className="max-w-[1240px] mx-auto px-6 py-24 border-t border-[#2A3446]/50">
        <div className="mb-12">
          <h2 className="text-2xl sm:text-3xl font-black text-[#F8FAFC] mb-2">Our Engineering Standards</h2>
          <p className="text-sm text-[#97A0B3]">Built for security, speed and creative freedom.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-[#161F2D]/60 backdrop-blur-md border border-[#2A3446]/50 rounded-2xl p-6 lg:p-8 flex flex-col">
            <div className="w-12 h-12 rounded-xl bg-[#0A0F18] border border-[#2A3446] flex items-center justify-center mb-6">
              <Link className="size-5 text-[#7FA0D6]" />
            </div>
            <h3 className="text-sm font-bold text-[#F8FAFC] mb-3">Zero-Login Client Magic Links</h3>
            <p className="text-xs text-[#97A0B3] leading-relaxed">
              Instant, secure access for your team and clients. No accounts. No friction.
            </p>
          </div>
          <div className="bg-[#161F2D]/60 backdrop-blur-md border border-[#2A3446]/50 rounded-2xl p-6 lg:p-8 flex flex-col">
            <div className="w-12 h-12 rounded-xl bg-[#0A0F18] border border-[#2A3446] flex items-center justify-center mb-6">
              <Maximize className="size-5 text-[#7FA0D6]" />
            </div>
            <h3 className="text-sm font-bold text-[#F8FAFC] mb-3">Frame-Accurate Video Annotations</h3>
            <p className="text-xs text-[#97A0B3] leading-relaxed">
              Collaborate with precision. Comment on exact frames, not just timestamps.
            </p>
          </div>
          <div className="bg-[#161F2D]/60 backdrop-blur-md border border-[#2A3446]/50 rounded-2xl p-6 lg:p-8 flex flex-col">
            <div className="w-12 h-12 rounded-xl bg-[#0A0F18] border border-[#2A3446] flex items-center justify-center mb-6">
              <CheckSquare className="size-5 text-[#7FA0D6]" />
            </div>
            <h3 className="text-sm font-bold text-[#F8FAFC] mb-3">Automated Sign-Off Gates</h3>
            <p className="text-xs text-[#97A0B3] leading-relaxed">
              Built-in approval workflows, version control and audit trails for complete transparency.
            </p>
          </div>
        </div>
      </section>

      {/* ── Section 4: Video Deliverable Review Cockpit ── */}
      <section className="max-w-[1240px] mx-auto px-6 py-24 border-t border-[#2A3446]/50">
        <div className="mb-12">
          <div className="text-[10px] font-bold text-[#7FA0D6] uppercase tracking-wider mb-2">CLIENT PORTAL</div>
          <h2 className="text-2xl sm:text-3xl font-black text-[#F8FAFC] mb-2">Video Deliverable Review</h2>
          <p className="text-sm text-[#97A0B3]">Review, annotate, and approve your creative assets — all in one place.</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Left: Video Player */}
          <div className="lg:col-span-2 space-y-4">
            <div className="bg-[#050810] border border-[#2A3446]/50 rounded-2xl overflow-hidden relative group aspect-video">
              <img src="https://images.unsplash.com/photo-1614729939124-03290b5609ce?auto=format&fit=crop&w=1200&q=80" alt="Video Player" className="w-full h-full object-cover opacity-80" />
              
              {/* Player Top Bar */}
              <div className="absolute top-0 left-0 right-0 p-4 flex items-center justify-between bg-gradient-to-b from-[#050810]/80 to-transparent">
                <div className="flex items-center gap-2">
                  <div className="size-6 rounded bg-[#161F2D]/80 backdrop-blur flex items-center justify-center border border-[#2A3446]">
                    <Layers className="size-3 text-[#F8FAFC]" />
                  </div>
                  <span className="text-xs font-bold text-[#F8FAFC]">NOSTIC Brand Film v3</span>
                </div>
                <div className="bg-[#161F2D]/80 backdrop-blur border border-[#2A3446] text-[9px] font-bold text-[#F8FAFC] px-2 py-1 rounded">
                  4K
                </div>
              </div>

              {/* Center Play Button Overlay */}
              <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                <div className="size-16 rounded-full bg-[#0A0F18]/80 backdrop-blur-md flex items-center justify-center border border-[#2A3446]">
                  <Play className="size-6 text-[#F8FAFC] ml-1" />
                </div>
              </div>

              {/* On-video annotation pin */}
              <div className="absolute top-1/2 left-1/3">
                 <div className="relative">
                   <div className="size-6 rounded-full bg-[#0A0F18] border-2 border-[#D8BF9B] flex items-center justify-center text-[10px] font-bold text-[#F8FAFC] shadow-lg absolute -translate-x-1/2 -translate-y-1/2 z-10 cursor-pointer">
                     1
                   </div>
                   <div className="absolute top-4 left-4 bg-[#161F2D]/90 backdrop-blur-md border border-[#2A3446] p-3 rounded-xl shadow-2xl w-48 z-20">
                     <div className="text-[10px] font-bold text-[#F8FAFC] mb-1">01:24</div>
                     <div className="text-[10px] text-[#97A0B3]">Great shot. Keep this.</div>
                   </div>
                 </div>
              </div>

              {/* Player Bottom Bar */}
              <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-[#050810]/90 to-transparent">
                {/* Progress Bar */}
                <div className="relative h-1.5 bg-[#2A3446] rounded-full mb-4 group/scrubber cursor-pointer">
                  <div className="absolute top-0 left-0 bottom-0 w-[45%] bg-[#7FA0D6] rounded-full"></div>
                  {/* Scrubber Knob */}
                  <div className="absolute top-1/2 left-[45%] -translate-x-1/2 -translate-y-1/2 size-3 rounded-full bg-[#F8FAFC] shadow opacity-0 group-hover/scrubber:opacity-100"></div>
                  
                  {/* Pins on timeline */}
                  <div className="absolute top-1/2 left-[15%] -translate-x-1/2 -translate-y-1/2 size-2 rounded-full bg-[#D8BF9B] border border-[#050810]"></div>
                  <div className="absolute top-1/2 left-[30%] -translate-x-1/2 -translate-y-1/2 size-2 rounded-full bg-[#7FA0D6] border border-[#050810]"></div>
                  <div className="absolute top-1/2 left-[60%] -translate-x-1/2 -translate-y-1/2 size-2 rounded-full bg-[#D8BF9B] border border-[#050810]"></div>
                  <div className="absolute top-1/2 left-[85%] -translate-x-1/2 -translate-y-1/2 size-2 rounded-full bg-[#7FA0D6] border border-[#050810]"></div>
                </div>

                <div className="flex items-center justify-between text-[#F8FAFC]">
                  <div className="flex items-center gap-4">
                    <Play className="size-4 cursor-pointer" />
                    <span className="text-[10px] font-medium font-mono">01:24 / 02:14</span>
                  </div>
                  <div className="flex items-center gap-4 text-[#97A0B3]">
                    <span className="text-[10px] font-bold cursor-pointer hover:text-[#F8FAFC]">1x</span>
                    <Volume2 className="size-4 cursor-pointer hover:text-[#F8FAFC]" />
                    <Settings className="size-4 cursor-pointer hover:text-[#F8FAFC]" />
                    <Maximize className="size-4 cursor-pointer hover:text-[#F8FAFC]" />
                  </div>
                </div>
              </div>
            </div>

            {/* Magic Link Share Box */}
            <div className="bg-[#161F2D]/60 backdrop-blur-md border border-[#2A3446]/50 rounded-xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="size-10 rounded-full bg-[#0A0F18] border border-[#2A3446] flex items-center justify-center shrink-0">
                  <Link className="size-4 text-[#7FA0D6]" />
                </div>
                <div>
                  <div className="text-xs font-bold text-[#F8FAFC] mb-0.5">Magic Link Access</div>
                  <div className="text-[10px] text-[#97A0B3]">Share this link for 1-click access (no login required).</div>
                </div>
              </div>
              
              <div className="flex items-center gap-3 w-full sm:w-auto">
                <div className="bg-[#0A0F18] border border-[#2A3446] text-[#97A0B3] text-[10px] font-mono px-3 py-2 rounded-lg flex-1 sm:w-48 truncate">
                  https://ryze-works.app/review/7f9a3c...
                </div>
                <button className="bg-[#161F2D] hover:bg-[#2A3446] border border-[#2A3446] text-[#F8FAFC] text-[10px] font-semibold px-3 py-2 rounded-lg flex items-center gap-1.5 transition-colors shrink-0">
                  <Copy className="size-3" /> Copy Link
                </button>
              </div>

              <div className="hidden lg:flex items-center gap-2 pl-4 border-l border-[#2A3446]/50">
                 <span className="size-2 rounded-full bg-[#7FA0D6]"></span>
                 <div>
                   <div className="text-[10px] font-bold text-[#7FA0D6]">Active</div>
                   <div className="text-[9px] text-[#97A0B3] whitespace-nowrap">Expires in 7 days</div>
                 </div>
              </div>
            </div>
          </div>

          {/* Right: Revision Pins & Related Assets */}
          <div className="flex flex-col gap-4">
            
            {/* Revision Pins */}
            <div className="bg-[#161F2D]/60 backdrop-blur-md border border-[#2A3446]/50 rounded-2xl flex flex-col h-[320px]">
              <div className="p-4 border-b border-[#2A3446]/50 flex items-center justify-between shrink-0">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-[#F8FAFC]">Revision Pins</span>
                  <span className="bg-[#2A3446] text-[#F8FAFC] text-[10px] font-bold px-1.5 py-0.5 rounded">4</span>
                </div>
                <button className="text-[10px] font-bold text-[#97A0B3] hover:text-[#F8FAFC] flex items-center gap-1">
                  <Plus className="size-3" /> Add Review Pin
                </button>
              </div>

              <div className="p-4 overflow-y-auto flex-1 space-y-4 hide-scrollbar">
                {/* Pin 1 - Needs Update */}
                <div className="flex gap-3">
                  <div className="flex flex-col items-center mt-1">
                    <div className="size-2.5 rounded-full bg-[#D8BF9B]"></div>
                    <div className="w-[1px] h-full bg-[#2A3446]/50 my-1"></div>
                  </div>
                  <div className="flex-1 pb-4">
                    <div className="flex items-start justify-between mb-1">
                      <div className="text-[11px] font-mono font-bold text-[#F8FAFC]">00:32</div>
                      <div className="text-[9px] font-bold text-[#D8BF9B] bg-[#D8BF9B]/10 border border-[#D8BF9B]/30 px-2 py-0.5 rounded-full flex items-center gap-1">
                         <span className="size-1 rounded-full bg-[#D8BF9B]"></span> Needs Update
                      </div>
                    </div>
                    <div className="text-[11px] text-[#97A0B3]">Logo transition too slow. Please speed up by 2x.</div>
                  </div>
                </div>

                {/* Pin 2 - Approved */}
                <div className="flex gap-3">
                  <div className="flex flex-col items-center mt-1">
                    <div className="size-2.5 rounded-full bg-[#7FA0D6]"></div>
                    <div className="w-[1px] h-full bg-[#2A3446]/50 my-1"></div>
                  </div>
                  <div className="flex-1 pb-4">
                    <div className="flex items-start justify-between mb-1">
                      <div className="text-[11px] font-mono font-bold text-[#F8FAFC]">01:24</div>
                      <div className="text-[9px] font-bold text-[#7FA0D6] bg-[#7FA0D6]/10 border border-[#7FA0D6]/30 px-2 py-0.5 rounded-full flex items-center gap-1">
                         <span className="size-1 rounded-full bg-[#7FA0D6]"></span> Approved
                      </div>
                    </div>
                    <div className="text-[11px] text-[#97A0B3]">Great shot. Keep this.</div>
                  </div>
                </div>

                {/* Pin 3 - Needs Update */}
                <div className="flex gap-3">
                  <div className="flex flex-col items-center mt-1">
                    <div className="size-2.5 rounded-full bg-[#D8BF9B]"></div>
                    <div className="w-[1px] h-full bg-[#2A3446]/50 my-1"></div>
                  </div>
                  <div className="flex-1 pb-4">
                    <div className="flex items-start justify-between mb-1">
                      <div className="text-[11px] font-mono font-bold text-[#F8FAFC]">01:58</div>
                      <div className="text-[9px] font-bold text-[#D8BF9B] bg-[#D8BF9B]/10 border border-[#D8BF9B]/30 px-2 py-0.5 rounded-full flex items-center gap-1">
                         <span className="size-1 rounded-full bg-[#D8BF9B]"></span> Needs Update
                      </div>
                    </div>
                    <div className="text-[11px] text-[#97A0B3]">Color grading looks slightly washed out here.</div>
                  </div>
                </div>

                {/* Pin 4 - Approved */}
                <div className="flex gap-3">
                  <div className="flex flex-col items-center mt-1">
                    <div className="size-2.5 rounded-full bg-[#7FA0D6]"></div>
                  </div>
                  <div className="flex-1">
                    <div className="flex items-start justify-between mb-1">
                      <div className="text-[11px] font-mono font-bold text-[#F8FAFC]">02:05</div>
                      <div className="text-[9px] font-bold text-[#7FA0D6] bg-[#7FA0D6]/10 border border-[#7FA0D6]/30 px-2 py-0.5 rounded-full flex items-center gap-1">
                         <span className="size-1 rounded-full bg-[#7FA0D6]"></span> Approved
                      </div>
                    </div>
                    <div className="text-[11px] text-[#97A0B3]">End card looks perfect.</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Related Assets */}
            <div className="bg-[#161F2D]/60 backdrop-blur-md border border-[#2A3446]/50 rounded-2xl p-4">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-[#F8FAFC]">Related Assets</span>
                  <span className="bg-[#2A3446] text-[#F8FAFC] text-[10px] font-bold px-1.5 py-0.5 rounded">3</span>
                </div>
                <div className="text-[10px] font-bold text-[#97A0B3] hover:text-[#F8FAFC] cursor-pointer">
                  View All
                </div>
              </div>
              
              <div className="flex gap-3 overflow-x-auto hide-scrollbar pb-2">
                {[
                  { name: 'NOSTIC_Logo_v2.png', size: '2.4 MB', img: 'https://images.unsplash.com/photo-1614729939124-03290b5609ce?auto=format&fit=crop&w=100&q=80' },
                  { name: 'Behind the Scenes.mp4', size: '1.2 GB', img: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&w=100&q=80' },
                  { name: 'Final Cut v3.mov', size: '890 MB', img: 'https://images.unsplash.com/photo-1502672260266-1c1c24240f38?auto=format&fit=crop&w=100&q=80' }
                ].map(asset => (
                  <div key={asset.name} className="flex-1 min-w-[140px] bg-[#0A0F18] border border-[#2A3446]/50 rounded-xl p-2 flex items-center gap-2 group cursor-pointer hover:border-[#7FA0D6]/40 transition-colors">
                    <img src={asset.img} className="size-10 rounded object-cover border border-[#2A3446]/50" />
                    <div className="overflow-hidden">
                      <div className="text-[9px] font-bold text-[#F8FAFC] truncate mb-0.5">{asset.name}</div>
                      <div className="text-[8px] text-[#97A0B3]">{asset.size}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Action */}
            <div className="flex justify-end mt-2">
              <button className="bg-[#BCCCE6] text-[#050810] hover:bg-[#D5E1F2] font-bold text-xs px-6 py-3 rounded-full flex items-center gap-2 transition-all shadow-sm hover:shadow-[0_0_20px_rgba(188,204,230,0.25)]">
                Approve All <ChevronRight className="size-4" />
              </button>
            </div>

          </div>

        </div>
      </section>
      
    </div>
  );
}
"""

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(content)
