import { useState } from "react";
import { 
  Play, Activity, 
  CheckSquare, ChevronRight, Zap, Layers,
  Link, Clock, Unlock, Plus, Volume2, Settings, Maximize, Copy
} from "lucide-react";

export function ClientsPage() {
  const [activeWorkflowTab, setActiveWorkflowTab] = useState('All');

  return (
    <div className="w-full bg-nebula-void text-slate-50 min-h-screen pb-20 lg:pb-24 font-sans selection:bg-nebula-glow/30">
      
      {/* ── Section 1: Hero & Pipeline Monitor ── */}
      <section className="max-w-[1240px] mx-auto px-6 pt-6 pb-16 sm:pt-8 sm:pb-20 lg:pt-10 lg:pb-24">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-center">
          
          {/* Left Column - Headline & Metrics */}
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-nebula-surface border border-nebula-steel/50 text-nebula-glow text-[11px] font-bold px-3 py-1 mb-6 uppercase tracking-wider">
              CREATIVE OPERATIONS
            </div>
            
            <h1 className="text-4xl sm:text-5xl lg:text-[56px] font-black tracking-tight leading-[1.05] text-slate-50 mb-6">
              Trusted by the world's most ambitious <span className="text-nebula-glow">creative teams.</span>
            </h1>
            
            <p className="text-sm text-nebula-mist max-w-lg mb-10 leading-relaxed">
              High-performance creative production, AI-assisted workflows, and secure asset delivery — all in one place.
            </p>
            
            {/* Metrics */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="bg-nebula-surface/60 backdrop-blur-md border border-nebula-steel/50 rounded-xl p-4 flex flex-col justify-center">
                <div className="text-nebula-mist mb-2"><Zap className="size-4" /></div>
                <div className="text-2xl font-black text-slate-50 leading-none mb-1">48h</div>
                <div className="text-[10px] text-slate-50 font-semibold mb-1">Turnaround</div>
                <div className="text-[9px] text-nebula-mist">Average delivery time</div>
              </div>
              <div className="bg-nebula-surface/60 backdrop-blur-md border border-nebula-steel/50 rounded-xl p-4 flex flex-col justify-center">
                <div className="text-nebula-mist mb-2"><Clock className="size-4" /></div>
                <div className="text-2xl font-black text-slate-50 leading-none mb-1">99.4%</div>
                <div className="text-[10px] text-slate-50 font-semibold mb-1">On-Time</div>
                <div className="text-[9px] text-nebula-mist">Delivery success rate</div>
              </div>
              <div className="bg-nebula-surface/60 backdrop-blur-md border border-nebula-steel/50 rounded-xl p-4 flex flex-col justify-center">
                <div className="text-nebula-mist mb-2"><Activity className="size-4" /></div>
                <div className="text-2xl font-black text-slate-50 leading-none mb-1">1.1x</div>
                <div className="text-[10px] text-slate-50 font-semibold mb-1">Review Loops</div>
                <div className="text-[9px] text-nebula-mist">Avg. per project</div>
              </div>
              <div className="bg-nebula-surface/60 backdrop-blur-md border border-nebula-steel/50 rounded-xl p-4 flex flex-col justify-center">
                <div className="text-nebula-mist mb-2"><Link className="size-4" /></div>
                <div className="text-2xl font-black text-slate-50 leading-none mb-1">100%</div>
                <div className="text-[10px] text-slate-50 font-semibold mb-1">Token Magic-Links</div>
                <div className="text-[9px] text-nebula-mist">Secure client access</div>
              </div>
            </div>
          </div>

          {/* Right Column - Asset Pipeline Monitor */}
          <div className="bg-nebula-surface/60 backdrop-blur-md border border-nebula-steel/50 rounded-2xl p-6 shadow-2xl">
            <div className="flex items-center justify-between mb-8 pb-4 border-b border-nebula-steel/50">
              <div className="flex items-center gap-2 text-sm font-bold text-slate-50">
                <Layers className="size-4 text-nebula-glow" /> Asset Pipeline
              </div>
              <div className="flex items-center gap-2 text-xs font-semibold text-nebula-glow">
                <span className="size-2 rounded-full bg-nebula-glow animate-pulse"></span> Live
              </div>
            </div>
            
            <div className="space-y-6">
              {/* Ingested */}
              <div>
                <div className="flex items-center justify-between text-xs mb-2">
                  <div className="flex items-center gap-2 text-slate-50 font-semibold">
                    <span className="size-1.5 rounded-full bg-nebula-glow"></span> Ingested
                  </div>
                  <div className="text-[10px] text-nebula-mist">100%</div>
                </div>
                <div className="text-[10px] text-nebula-mist mb-2">12 assets</div>
                <div className="h-1.5 w-full bg-nebula-navy rounded-full overflow-hidden">
                  <div className="h-full bg-nebula-glow w-full" />
                </div>
              </div>
              {/* In Review */}
              <div>
                <div className="flex items-center justify-between text-xs mb-2">
                  <div className="flex items-center gap-2 text-slate-50 font-semibold">
                    <span className="size-1.5 rounded-full bg-nebula-glow"></span> In Review
                  </div>
                  <div className="text-[10px] text-nebula-mist">58%</div>
                </div>
                <div className="text-[10px] text-nebula-mist mb-2">7 assets</div>
                <div className="h-1.5 w-full bg-nebula-navy rounded-full overflow-hidden">
                  <div className="h-full bg-nebula-glow w-[58%]" />
                </div>
              </div>
              {/* Changes Requested */}
              <div>
                <div className="flex items-center justify-between text-xs mb-2">
                  <div className="flex items-center gap-2 text-slate-50 font-semibold">
                    <span className="size-1.5 rounded-full bg-nebula-sand"></span> Changes Requested
                  </div>
                  <div className="text-[10px] text-nebula-mist">25%</div>
                </div>
                <div className="text-[10px] text-nebula-mist mb-2">3 assets</div>
                <div className="h-1.5 w-full bg-nebula-navy rounded-full overflow-hidden">
                  <div className="h-full bg-nebula-sand w-[25%]" />
                </div>
              </div>
              {/* Approved */}
              <div>
                <div className="flex items-center justify-between text-xs mb-2">
                  <div className="flex items-center gap-2 text-slate-50 font-semibold">
                    <span className="size-1.5 rounded-full bg-nebula-glow"></span> Approved
                  </div>
                  <div className="text-[10px] text-nebula-mist">100%</div>
                </div>
                <div className="text-[10px] text-nebula-mist mb-2">8 assets</div>
                <div className="h-1.5 w-full bg-nebula-navy rounded-full overflow-hidden">
                  <div className="h-full bg-nebula-glow w-full" />
                </div>
              </div>
            </div>

            <div className="mt-8 pt-4 border-t border-nebula-steel/50 flex items-center gap-3">
               <div className="relative size-4 flex items-center justify-center">
                 <Activity className="size-4 text-nebula-glow relative z-10" />
                 <div className="absolute inset-0 bg-nebula-glow rounded-full animate-ping opacity-20"></div>
               </div>
               <div>
                 <div className="text-[10px] font-bold text-slate-50">Pipeline healthy</div>
                 <div className="text-[10px] text-nebula-mist">All systems operational</div>
               </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Section 2: Creative Workflows ── */}
      <section className="max-w-[1240px] mx-auto px-6 py-12 sm:py-16 border-t border-nebula-steel/50">
        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6 mb-12">
          <div>
            <h2 className="text-2xl sm:text-3xl font-black text-slate-50 mb-2">Creative Workflows</h2>
            <p className="text-sm text-nebula-mist">From concept to final delivery — optimized for speed, quality and scale.</p>
          </div>
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between lg:justify-end gap-6 lg:gap-12 w-full lg:w-auto">
            <div className="flex items-center gap-2 bg-nebula-surface border border-nebula-steel/50 p-1 rounded-full overflow-x-auto w-full sm:w-auto hide-scrollbar">
              {['All', 'Video', 'Design', 'Motion', 'Post'].map(tab => (
                <button 
                  key={tab}
                  onClick={() => setActiveWorkflowTab(tab)}
                  className={`text-[11px] font-semibold px-4 py-1.5 rounded-full transition-colors whitespace-nowrap ${activeWorkflowTab === tab ? 'bg-nebula-glow text-nebula-void' : 'text-nebula-mist hover:text-slate-50'}`}
                >
                  {tab}
                </button>
              ))}
            </div>
            <div className="text-[11px] font-bold text-slate-50 flex items-center gap-1.5 cursor-pointer hover:text-nebula-glow transition-colors shrink-0">
              View All <ChevronRight className="size-3" />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[
            { title: 'Motion & 3D Pod', desc: '3D motion, CGI, virtual production, product demos.', img: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=800&q=80', badge: 'VIDEO' },
            { title: 'High-Velocity DTC Creative', desc: 'Short-form, social, paid media, performance creative.', img: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=800&q=80', badge: 'VIDEO' },
            { title: 'Brand & Design Architecture', desc: 'Visual identity, brand systems, motion design.', img: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=800&q=80', badge: 'DESIGN' },
            { title: 'Performance Ad Operations', desc: 'Creative testing, scaling, reporting, optimization.', img: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?auto=format&fit=crop&w=800&q=80', badge: 'OPS' },
            { title: 'Enterprise Creative Ops', desc: 'Workflow management, stakeholder sync, delivery.', img: 'https://images.unsplash.com/photo-1497215728101-856f4ea42174?auto=format&fit=crop&w=800&q=80', badge: 'OPS' },
            { title: 'Post-Production House', desc: 'Edit, color, sound, VFX, final mastering.', img: 'https://images.unsplash.com/photo-1574717024653-61fd2cf4d44d?auto=format&fit=crop&w=800&q=80', badge: 'POST' }
          ].map(card => (
            <div key={card.title} className="backdrop-blur-md bg-nebula-surface/60 border border-nebula-steel/50 rounded-2xl p-6 sm:p-8 group cursor-pointer hover:border-nebula-glow/40 transition-colors flex flex-col">
              <div className="relative mb-5">
                <img src={card.img} alt={card.title} className="w-full h-44 object-cover rounded-xl border border-nebula-steel/40 transition-transform duration-500 hover:scale-[1.02]" />
                <div className="absolute top-3 right-3 bg-nebula-void/80 backdrop-blur-sm border border-nebula-steel px-2 py-1 rounded text-[9px] font-bold text-slate-50">
                  {card.badge}
                </div>
              </div>
              <h3 className="text-sm font-bold text-slate-50 mb-2">{card.title}</h3>
              <p className="text-xs text-nebula-mist mb-6 flex-1">{card.desc}</p>
              <div className="flex items-center justify-between border-t border-nebula-steel/50 pt-4">
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-1.5 text-[9px] text-nebula-mist font-semibold"><CheckSquare className="size-3" /> 4K ProRes</div>
                  <div className="flex items-center gap-1.5 text-[9px] text-nebula-mist font-semibold"><Maximize className="size-3" /> 9:16 Scale</div>
                  <div className="flex items-center gap-1.5 text-[9px] text-nebula-mist font-semibold"><Unlock className="size-3" /> Token Gate</div>
                </div>
                <ChevronRight className="size-4 text-nebula-glow group-hover:translate-x-1 transition-transform" />
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── Section 3: Engineering Standards ── */}
      <section className="max-w-[1240px] mx-auto px-6 py-12 sm:py-16 border-t border-nebula-steel/50">
        <div className="mb-12">
          <h2 className="text-2xl sm:text-3xl font-black text-slate-50 mb-2">Our Engineering Standards</h2>
          <p className="text-sm text-nebula-mist">Built for security, speed and creative freedom.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-nebula-surface/60 backdrop-blur-md border border-nebula-steel/50 rounded-2xl p-6 lg:p-8 flex flex-col">
            <div className="w-12 h-12 rounded-xl bg-nebula-navy border border-nebula-steel flex items-center justify-center mb-6">
              <Link className="size-5 text-nebula-glow" />
            </div>
            <h3 className="text-sm font-bold text-slate-50 mb-3">Zero-Login Client Magic Links</h3>
            <p className="text-xs text-nebula-mist leading-relaxed">
              Instant, secure access for your team and clients. No accounts. No friction.
            </p>
          </div>
          <div className="bg-nebula-surface/60 backdrop-blur-md border border-nebula-steel/50 rounded-2xl p-6 lg:p-8 flex flex-col">
            <div className="w-12 h-12 rounded-xl bg-nebula-navy border border-nebula-steel flex items-center justify-center mb-6">
              <Maximize className="size-5 text-nebula-glow" />
            </div>
            <h3 className="text-sm font-bold text-slate-50 mb-3">Frame-Accurate Video Annotations</h3>
            <p className="text-xs text-nebula-mist leading-relaxed">
              Collaborate with precision. Comment on exact frames, not just timestamps.
            </p>
          </div>
          <div className="bg-nebula-surface/60 backdrop-blur-md border border-nebula-steel/50 rounded-2xl p-6 lg:p-8 flex flex-col">
            <div className="w-12 h-12 rounded-xl bg-nebula-navy border border-nebula-steel flex items-center justify-center mb-6">
              <CheckSquare className="size-5 text-nebula-glow" />
            </div>
            <h3 className="text-sm font-bold text-slate-50 mb-3">Automated Sign-Off Gates</h3>
            <p className="text-xs text-nebula-mist leading-relaxed">
              Built-in approval workflows, version control and audit trails for complete transparency.
            </p>
          </div>
        </div>
      </section>

      {/* ── Section 4: Video Deliverable Review Cockpit ── */}
      <section className="max-w-[1240px] mx-auto px-6 py-12 sm:py-16 border-t border-nebula-steel/50">
        <div className="mb-12">
          <div className="text-[10px] font-bold text-nebula-glow uppercase tracking-wider mb-2">CLIENT PORTAL</div>
          <h2 className="text-2xl sm:text-3xl font-black text-slate-50 mb-2">Video Deliverable Review</h2>
          <p className="text-sm text-nebula-mist">Review, annotate, and approve your creative assets — all in one place.</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Left: Video Player */}
          <div className="lg:col-span-2 space-y-4">
            <div className="bg-nebula-void border border-nebula-steel/50 rounded-2xl overflow-hidden relative group aspect-video">
              <img src="https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&w=1400&q=80" alt="Video Player" className="absolute inset-0 w-full h-full object-cover opacity-80" />
              
              {/* Player Top Bar */}
              <div className="absolute top-0 left-0 right-0 p-4 flex items-center justify-between bg-gradient-to-b from-nebula-void/80 to-transparent">
                <div className="flex items-center gap-2">
                  <div className="size-6 rounded bg-nebula-surface/80 backdrop-blur flex items-center justify-center border border-nebula-steel">
                    <Layers className="size-3 text-slate-50" />
                  </div>
                  <span className="text-xs font-bold text-slate-50">NOSTIC Brand Film v3</span>
                </div>
                <div className="bg-nebula-surface/80 backdrop-blur border border-nebula-steel text-[9px] font-bold text-slate-50 px-2 py-1 rounded">
                  4K
                </div>
              </div>

              {/* Center Play Button Overlay */}
              <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                <div className="size-16 rounded-full bg-nebula-navy/80 backdrop-blur-md flex items-center justify-center border border-nebula-steel">
                  <Play className="size-6 text-slate-50 ml-1" />
                </div>
              </div>

              {/* On-video annotation pin */}
              <div className="absolute top-1/2 left-1/3">
                 <div className="relative">
                   <div className="size-6 rounded-full bg-nebula-navy border-2 border-nebula-glow flex items-center justify-center text-[10px] font-bold text-slate-50 shadow-lg absolute -translate-x-1/2 -translate-y-1/2 z-10 cursor-pointer">
                     1
                     <div className="absolute inset-0 rounded-full border-2 border-nebula-glow animate-ping opacity-30"></div>
                   </div>
                   <div className="absolute top-4 left-4 backdrop-blur-md bg-nebula-surface/90 border border-nebula-steel/50 p-3 rounded-xl shadow-2xl w-48 z-20">
                     <div className="text-[10px] font-bold text-slate-50 mb-1">01:24</div>
                     <div className="text-[10px] text-nebula-mist">Great shot. Keep this.</div>
                   </div>
                 </div>
              </div>

              {/* Player Bottom Bar */}
              <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-nebula-void/90 to-transparent">
                {/* Progress Bar */}
                <div className="relative h-1.5 bg-nebula-steel rounded-full mb-4 group/scrubber cursor-pointer">
                  <div className="absolute top-0 left-0 bottom-0 w-[45%] bg-nebula-glow rounded-full"></div>
                  {/* Scrubber Knob */}
                  <div className="absolute top-1/2 left-[45%] -translate-x-1/2 -translate-y-1/2 size-3 rounded-full bg-slate-50 shadow opacity-0 group-hover/scrubber:opacity-100"></div>
                  
                  {/* Pins on timeline */}
                  <div className="absolute top-1/2 left-[15%] -translate-x-1/2 -translate-y-1/2 size-2 rounded-full bg-nebula-sand border border-nebula-void"></div>
                  <div className="absolute top-1/2 left-[30%] -translate-x-1/2 -translate-y-1/2 size-2 rounded-full bg-nebula-glow border border-nebula-void"></div>
                  <div className="absolute top-1/2 left-[60%] -translate-x-1/2 -translate-y-1/2 size-2 rounded-full bg-nebula-sand border border-nebula-void"></div>
                  <div className="absolute top-1/2 left-[85%] -translate-x-1/2 -translate-y-1/2 size-2 rounded-full bg-nebula-glow border border-nebula-void"></div>
                </div>

                <div className="flex items-center justify-between text-slate-50">
                  <div className="flex items-center gap-4">
                    <Play className="size-4 cursor-pointer" />
                    <span className="text-[10px] font-medium font-mono">01:24 / 02:14</span>
                  </div>
                  <div className="flex items-center gap-4 text-nebula-mist">
                    <span className="text-[10px] font-bold cursor-pointer hover:text-slate-50">1x</span>
                    <Volume2 className="size-4 cursor-pointer hover:text-slate-50" />
                    <Settings className="size-4 cursor-pointer hover:text-slate-50" />
                    <Maximize className="size-4 cursor-pointer hover:text-slate-50" />
                  </div>
                </div>
              </div>
            </div>

            {/* Magic Link Share Box */}
            <div className="bg-nebula-surface/60 backdrop-blur-md border border-nebula-steel/50 rounded-xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="size-10 rounded-full bg-nebula-navy/80 border border-nebula-steel/40 flex items-center justify-center shrink-0">
                  <Link className="size-4 text-nebula-glow" />
                </div>
                <div>
                  <div className="text-xs font-bold text-slate-50 mb-0.5">Magic Link Access</div>
                  <div className="text-[10px] text-nebula-mist">Share this link for 1-click access (no login required).</div>
                </div>
              </div>
              
              <div className="flex items-center gap-3 w-full sm:w-auto">
                <div className="bg-nebula-navy/80 border border-nebula-steel/40 text-nebula-mist text-[10px] font-mono px-3 py-2 rounded-xl flex-1 sm:w-48 truncate">
                  https://ryze-works.app/review/7f9a3c...
                </div>
                <button className="bg-nebula-surface hover:bg-nebula-steel border border-nebula-steel text-slate-50 text-[10px] font-semibold px-3 py-2 rounded-lg flex items-center gap-1.5 transition-colors shrink-0">
                  <Copy className="size-3" /> Copy Link
                </button>
              </div>

              <div className="hidden lg:flex items-center gap-2 pl-4 border-l border-nebula-steel/50">
                 <span className="size-2 rounded-full bg-nebula-glow"></span>
                 <div>
                   <div className="text-[10px] font-bold text-nebula-glow">Active</div>
                   <div className="text-[9px] text-nebula-mist whitespace-nowrap">Expires in 7 days</div>
                 </div>
              </div>
            </div>
          </div>

          {/* Right: Revision Pins & Related Assets */}
          <div className="flex flex-col gap-4">
            
            {/* Revision Pins */}
            <div className="bg-nebula-surface/60 backdrop-blur-md border border-nebula-steel/50 rounded-2xl flex flex-col h-[320px]">
              <div className="p-4 border-b border-nebula-steel/50 flex items-center justify-between shrink-0">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-slate-50">Revision Pins</span>
                  <span className="bg-nebula-steel text-slate-50 text-[10px] font-bold px-1.5 py-0.5 rounded">4</span>
                </div>
                <button className="text-[10px] font-bold text-nebula-mist hover:text-slate-50 flex items-center gap-1">
                  <Plus className="size-3" /> Add Review Pin
                </button>
              </div>

              <div className="p-4 overflow-y-auto flex-1 space-y-4 hide-scrollbar">
                {/* Pin 1 - Needs Update */}
                <div className="flex gap-3">
                  <div className="flex flex-col items-center mt-1">
                    <div className="size-2.5 rounded-full bg-nebula-sand"></div>
                    <div className="w-[1px] h-full bg-nebula-steel/50 my-1"></div>
                  </div>
                  <div className="flex-1 pb-4">
                    <div className="flex items-start justify-between mb-1">
                      <div className="text-[11px] font-mono font-bold text-slate-50">00:32</div>
                      <div className="text-[9px] font-bold text-nebula-sand bg-nebula-sand/10 border border-nebula-sand/30 px-2 py-0.5 rounded-full flex items-center gap-1">
                         <span className="size-1 rounded-full bg-nebula-sand"></span> Needs Update
                      </div>
                    </div>
                    <div className="text-[11px] text-nebula-mist">Logo transition too slow. Please speed up by 2x.</div>
                  </div>
                </div>

                {/* Pin 2 - Approved */}
                <div className="flex gap-3">
                  <div className="flex flex-col items-center mt-1">
                    <div className="size-2.5 rounded-full bg-nebula-glow"></div>
                    <div className="w-[1px] h-full bg-nebula-steel/50 my-1"></div>
                  </div>
                  <div className="flex-1 pb-4">
                    <div className="flex items-start justify-between mb-1">
                      <div className="text-[11px] font-mono font-bold text-slate-50">01:24</div>
                      <div className="text-[9px] font-bold text-nebula-glow bg-nebula-glow/10 border border-nebula-glow/30 px-2 py-0.5 rounded-full flex items-center gap-1">
                         <span className="size-1 rounded-full bg-nebula-glow"></span> Approved
                      </div>
                    </div>
                    <div className="text-[11px] text-nebula-mist">Great shot. Keep this.</div>
                  </div>
                </div>

                {/* Pin 3 - Needs Update */}
                <div className="flex gap-3">
                  <div className="flex flex-col items-center mt-1">
                    <div className="size-2.5 rounded-full bg-nebula-sand"></div>
                    <div className="w-[1px] h-full bg-nebula-steel/50 my-1"></div>
                  </div>
                  <div className="flex-1 pb-4">
                    <div className="flex items-start justify-between mb-1">
                      <div className="text-[11px] font-mono font-bold text-slate-50">01:58</div>
                      <div className="text-[9px] font-bold text-nebula-sand bg-nebula-sand/10 border border-nebula-sand/30 px-2 py-0.5 rounded-full flex items-center gap-1">
                         <span className="size-1 rounded-full bg-nebula-sand"></span> Needs Update
                      </div>
                    </div>
                    <div className="text-[11px] text-nebula-mist">Color grading looks slightly washed out here.</div>
                  </div>
                </div>

                {/* Pin 4 - Approved */}
                <div className="flex gap-3">
                  <div className="flex flex-col items-center mt-1">
                    <div className="size-2.5 rounded-full bg-nebula-glow"></div>
                  </div>
                  <div className="flex-1">
                    <div className="flex items-start justify-between mb-1">
                      <div className="text-[11px] font-mono font-bold text-slate-50">02:05</div>
                      <div className="text-[9px] font-bold text-nebula-glow bg-nebula-glow/10 border border-nebula-glow/30 px-2 py-0.5 rounded-full flex items-center gap-1">
                         <span className="size-1 rounded-full bg-nebula-glow"></span> Approved
                      </div>
                    </div>
                    <div className="text-[11px] text-nebula-mist">End card looks perfect.</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Related Assets */}
            <div className="bg-nebula-surface/60 backdrop-blur-md border border-nebula-steel/50 rounded-2xl p-4">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-slate-50">Related Assets</span>
                  <span className="bg-nebula-steel text-slate-50 text-[10px] font-bold px-1.5 py-0.5 rounded">3</span>
                </div>
                <div className="text-[10px] font-bold text-nebula-mist hover:text-slate-50 cursor-pointer">
                  View All
                </div>
              </div>
              
              <div className="flex gap-3 overflow-x-auto hide-scrollbar pb-2">
                {[
                  { name: 'NOSTIC_Logo_v2.png', size: '2.4 MB', img: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=100&q=80' },
                  { name: 'Behind the Scenes.mp4', size: '1.2 GB', img: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=100&q=80' },
                  { name: 'Final Cut v3.mov', size: '890 MB', img: 'https://images.unsplash.com/photo-1574717024653-61fd2cf4d44d?auto=format&fit=crop&w=100&q=80' }
                ].map(asset => (
                  <div key={asset.name} className="flex-1 min-w-[140px] bg-nebula-navy/80 border border-nebula-steel/40 rounded-xl p-2 flex items-center gap-2 group cursor-pointer hover:border-nebula-glow/40 transition-colors">
                    <img src={asset.img} className="size-10 rounded object-cover border border-nebula-steel/50" />
                    <div className="overflow-hidden">
                      <div className="text-[9px] font-bold text-slate-50 truncate mb-0.5">{asset.name}</div>
                      <div className="text-[8px] text-nebula-mist">{asset.size}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Action */}
            <div className="flex justify-end mt-2">
              <button className="bg-nebula-periwinkle text-nebula-void hover:bg-nebula-periwinkle font-bold text-xs px-6 py-3 rounded-full flex items-center gap-2 transition-all shadow-sm hover:shadow-[0_0_20px_rgba(188,204,230,0.25)] group">
                Approve All <svg className="size-4 transition-transform group-hover:scale-110" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" className="animate-[dash_0.5s_ease-out_forwards]" strokeDasharray="24" strokeDashoffset="0" /></svg>
              </button>
            </div>

          </div>

        </div>
      </section>
      
    </div>
  );
}
