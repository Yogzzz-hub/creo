import { useState } from "react";
import { 
  Users, ShieldCheck, 
  Search, CheckCircle2, Play, Activity, 
  Globe, CheckSquare, CreditCard, UserCheck, ChevronRight, ArrowUpRight, Zap, Layers
} from "lucide-react";

export function ClientsPage() {
  const [activeFilter, setActiveFilter] = useState<'All' | 'Motion' | 'DTC' | 'Full-Service'>('All');
  const [portalStatus, setPortalStatus] = useState<'pending' | 'approved' | 'revision'>('pending');
  return (
    <div className="w-full bg-[#050810] text-[#F8FAFC] min-h-screen pb-20 lg:pb-24 font-sans selection:bg-[#7FA0D6]/30">
      
      {/* ── Section 1: Hero (2-Column Grid) ── */}
      <section className="max-w-[1240px] mx-auto px-6 py-20 lg:py-24">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-center">
          
          {/* Left Column */}
          <div className="pr-4 lg:pr-8">
            <div className="inline-flex items-center gap-2 rounded-full bg-[#161F2D] border border-[#2A3446] text-[#7FA0D6] text-[11px] font-bold px-3 py-1 mb-6">
              ⚡ POWERING MODERN AGENCY OPERATIONS
            </div>
            
            <h1 className="text-4xl sm:text-5xl lg:text-[56px] font-black tracking-tight leading-[1.05] text-[#F8FAFC] mb-6">
              Trusted by the world&rsquo;s most ambitious <span className="text-[#7FA0D6]">creative agencies.</span>
            </h1>
            
            <p className="text-sm text-[#97A0B3] max-w-lg mt-4 mb-8 leading-relaxed">
              Over 50+ high-growth creative studios and agencies use CREO to orchestrate client portals, eliminate approval friction, and protect their true profit margins.
            </p>
            
            {/* 4 Stat Pods */}
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-[#161F2D] border border-[#2A3446] rounded-xl p-4 flex flex-col justify-center">
                <div className="text-[#97A0B3] mb-2"><Users className="size-5" /></div>
                <div className="text-xl font-black text-[#F8FAFC] leading-none mb-2">52</div>
                <div className="text-[10px] sm:text-xs text-[#97A0B3] font-medium leading-tight">Active Creative Studios</div>
              </div>
              <div className="bg-[#161F2D] border border-[#2A3446] rounded-xl p-4 flex flex-col justify-center">
                <div className="text-[#97A0B3] mb-2"><Layers className="size-5" /></div>
                <div className="text-xl font-black text-[#F8FAFC] leading-none mb-2">1,420+</div>
                <div className="text-[10px] sm:text-xs text-[#97A0B3] font-medium leading-tight">Monthly Brand Deliverables</div>
              </div>
              <div className="bg-[#161F2D] border border-[#2A3446] rounded-xl p-4 flex flex-col justify-center">
                <div className="text-[#97A0B3] mb-2"><ShieldCheck className="size-5" /></div>
                <div className="text-xl font-black text-[#F8FAFC] leading-none mb-2">99.2%</div>
                <div className="text-[10px] sm:text-xs text-[#97A0B3] font-medium leading-tight">On-Time Client SLA</div>
              </div>
              <div className="bg-[#161F2D] border border-[#2A3446] rounded-xl p-4 flex flex-col justify-center">
                <div className="text-[#97A0B3] mb-2"><Zap className="size-5" /></div>
                <div className="text-xl font-black text-[#F8FAFC] leading-none mb-2">4.2 hrs</div>
                <div className="text-[10px] sm:text-xs text-[#97A0B3] font-medium leading-tight">Median Approval Turnaround</div>
              </div>
            </div>
          </div>

          {/* Right Column — Multi-Studio Network Pulse */}
          <div className="bg-[#161F2D] border border-[#2A3446] rounded-3xl p-6 shadow-2xl relative overflow-hidden flex flex-col">
            
            {/* Header */}
            <div className="flex items-center justify-between pb-4 mb-6 border-b border-[#2A3446]">
              <div>
                <div className="font-bold text-[#F8FAFC] text-sm mb-1">CREO Studio Network</div>
                <div className="flex items-center gap-1.5 text-[10px] text-[#10B981] font-medium">
                  <div className="size-1.5 rounded-full bg-[#10B981] animate-pulse" /> 52 Studios Active
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Search className="size-4 text-[#97A0B3] cursor-pointer hover:text-[#F8FAFC] transition-colors" />
                <Activity className="size-4 text-[#97A0B3] cursor-pointer hover:text-[#F8FAFC] transition-colors" />
              </div>
            </div>

            {/* Top 2x2 Network Summary Grid */}
            <div className="grid grid-cols-2 gap-3 mb-6">
              <div className="bg-[#0A0F18] border border-[#2A3446] rounded-xl p-3.5 flex flex-col justify-between">
                <div className="text-[10px] text-[#97A0B3] font-bold uppercase mb-1">Retainers Managed</div>
                <div className="flex items-end gap-2">
                  <div className="text-xl font-black text-[#F8FAFC]">184</div>
                  <div className="text-[10px] text-[#10B981] font-bold mb-1">(+12 this mo)</div>
                </div>
              </div>
              
              <div className="bg-[#0A0F18] border border-[#2A3446] rounded-xl p-3.5 flex flex-col justify-between">
                <div className="text-[10px] text-[#97A0B3] font-bold uppercase mb-1">Total Volume</div>
                <div className="text-xl font-black text-[#F8FAFC]">₹14.8Cr</div>
              </div>
              
              <div className="bg-[#0A0F18] border border-[#2A3446] rounded-xl p-3.5 flex flex-col justify-between">
                <div className="text-[10px] text-[#97A0B3] font-bold uppercase mb-1">Revision SLA</div>
                <div className="flex items-end gap-2">
                  <div className="text-xl font-black text-[#F8FAFC]">4.2h</div>
                  <div className="text-[10px] text-[#10B981] font-bold mb-1">(&darr; from 48h)</div>
                </div>
              </div>
              
              <div className="bg-[#0A0F18] border border-[#2A3446] rounded-xl p-3.5 flex flex-col justify-between">
                <div className="text-[10px] text-[#97A0B3] font-bold uppercase mb-1">Client Satisfaction</div>
                <div className="text-xl font-black text-[#F8FAFC]">99.8%</div>
              </div>
            </div>

            {/* Bottom Section — Live Agency Health Roster */}
            <div className="bg-[#0A0F18] border border-[#2A3446] rounded-xl p-4 mb-4">
              <div className="text-[10px] text-[#97A0B3] font-bold uppercase mb-4">Live Agency Health Roster</div>
              <div className="space-y-3">
                <div className="flex items-center justify-between text-xs">
                  <div className="flex flex-col">
                    <span className="font-bold text-[#F8FAFC]">Velox Studio &bull; Motion &amp; 3D Pod</span>
                  </div>
                  <div className="flex items-center gap-4 text-[#97A0B3]">
                    <span>12 Projects</span>
                    <span className="flex items-center gap-1.5"><div className="size-1.5 rounded-full bg-[#10B981]" /> 99% SLA</span>
                  </div>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <div className="flex flex-col">
                    <span className="font-bold text-[#F8FAFC]">Hyperdrive Agency &bull; DTC Creative</span>
                  </div>
                  <div className="flex items-center gap-4 text-[#97A0B3]">
                    <span>24 Projects</span>
                    <span className="flex items-center gap-1.5"><div className="size-1.5 rounded-full bg-[#10B981]" /> 100% SLA</span>
                  </div>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <div className="flex flex-col">
                    <span className="font-bold text-[#F8FAFC]">Northstar Studio &bull; Brand Strategy</span>
                  </div>
                  <div className="flex items-center gap-4 text-[#97A0B3]">
                    <span>8 Projects</span>
                    <span className="flex items-center gap-1.5"><div className="size-1.5 rounded-full bg-[#10B981]" /> 98% SLA</span>
                  </div>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <div className="flex flex-col">
                    <span className="font-bold text-[#F8FAFC]">Pulse Motion Lab &bull; Video &amp; Editorial</span>
                  </div>
                  <div className="flex items-center gap-4 text-[#97A0B3]">
                    <span>10 Projects</span>
                    <span className="flex items-center gap-1.5"><div className="size-1.5 rounded-full bg-[#10B981]" /> 99% SLA</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Footer Bar */}
            <div className="w-full bg-[#0A0F18] border border-[#2A3446] py-2 px-3 rounded-lg text-[10px] sm:text-xs font-semibold text-[#7FA0D6] flex items-center justify-center gap-2 mt-auto">
              ⚡ Real-time multi-tenant telemetry across all connected client portals.
            </div>
            
          </div>
        </div>
      </section>

      {/* ── Section 2: The Studios Scaling on CREO OS ── */}
      <section className="max-w-[1240px] mx-auto px-6 py-20 lg:py-24 border-t border-[#2A3446]">
        
        <div className="mb-10">
          <div className="inline-flex items-center gap-2 rounded-full bg-[#161F2D] border border-[#2A3446] text-[#7FA0D6] text-[11px] font-bold px-3 py-1 mb-6">
            ⚡ OUR CLIENTS
          </div>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight text-[#F8FAFC] mb-4">
            The Studios Scaling on CREO OS.
          </h2>
          <p className="text-sm text-[#97A0B3]">From boutique motion design shops to multi-pod content agencies.</p>
        </div>

        <div className="flex flex-wrap items-center gap-3 mb-10">
          {(['All', 'Motion', 'DTC', 'Full-Service'] as const).map((filter) => (
            <button 
              key={filter}
              onClick={() => setActiveFilter(filter)}
              className={
                activeFilter === filter 
                  ? "bg-[#7FA0D6] text-[#050810] font-bold text-xs px-4 py-1.5 rounded-full transition"
                  : "bg-[#0A0F18] border border-[#2A3446] text-[#97A0B3] hover:text-[#F8FAFC] text-xs px-4 py-1.5 rounded-full transition"
              }
            >
              {filter === 'All' ? 'All Agencies' : filter === 'Motion' ? 'Motion & Production' : filter === 'DTC' ? 'DTC & Brand' : 'Full-Service Studios'}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          
          {/* Card 1: Velox Studio */}
          {(activeFilter === 'All' || activeFilter === 'Motion') && (
          <div className="bg-[#161F2D] border border-[#2A3446] rounded-2xl p-6 flex flex-col justify-between">
            <div>
              <div className="flex items-start justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="text-2xl font-black text-[#F8FAFC] leading-none">V</div>
                  <div>
                    <div className="text-sm font-bold text-[#F8FAFC]">Velox Studio</div>
                    <div className="text-xs text-[#97A0B3]">Motion &amp; 3D</div>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 text-[10px] font-bold text-[#10B981]">
                  <div className="size-1.5 rounded-full bg-[#10B981]" /> Live
                </div>
              </div>
              
              <div className="relative rounded-xl overflow-hidden mb-6 group">
                <img src="https://images.unsplash.com/photo-1534438327276-14e5300c3a48?auto=format&fit=crop&w=800&q=80" alt="Velox" className="w-full h-32 object-cover opacity-80 group-hover:scale-105 transition-transform duration-700" />
                <div className="absolute inset-0 bg-gradient-to-t from-[#050810] to-transparent opacity-90" />
                <div className="absolute bottom-3 left-3 right-3">
                  <div className="text-[11px] font-bold text-[#F8FAFC] mb-0.5">Summer DTC Campaign Reel #04</div>
                  <div className="flex items-center gap-1.5 text-[10px] text-[#F8FAFC]">
                    <CheckCircle2 className="size-3 text-[#10B981]" /> 1-Click Approval in 2.4h avg.
                  </div>
                </div>
              </div>
            </div>
            
            <div className="flex items-center justify-between text-[10px] font-bold text-[#97A0B3] border-t border-[#2A3446] pt-4">
              <div><span className="text-sm font-black text-[#F8FAFC] block mb-0.5">12</span> Active Projects</div>
              <div><span className="text-sm font-black text-[#F8FAFC] block mb-0.5">87%</span> Team Utilization</div>
              <div><span className="text-sm font-black text-[#F8FAFC] block mb-0.5">99%</span> Client SLA</div>
            </div>
          </div>
          )}

          {/* Card 2: Hyperdrive Agency */}
          {(activeFilter === 'All' || activeFilter === 'DTC') && (
          <div className="bg-[#161F2D] border border-[#2A3446] rounded-2xl p-6 flex flex-col justify-between">
            <div>
              <div className="flex items-start justify-between mb-6">
                <div className="flex items-center gap-3">
                  <Zap className="size-6 text-[#F8FAFC] fill-[#F8FAFC]" />
                  <div>
                    <div className="text-sm font-bold text-[#F8FAFC]">Hyperdrive Agency</div>
                    <div className="text-xs text-[#97A0B3]">DTC Creative</div>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 text-[10px] font-bold text-[#10B981]">
                  <div className="size-1.5 rounded-full bg-[#10B981]" /> Live
                </div>
              </div>
              
              <div className="relative rounded-xl overflow-hidden mb-6 group">
                <div className="w-full h-32 flex">
                  <img src="https://images.unsplash.com/photo-1542744173-8e7e53415bb0?auto=format&fit=crop&w=400&q=80" className="w-1/2 h-full object-cover opacity-70 border-r border-[#2A3446]" />
                  <img src="https://images.unsplash.com/photo-1531297122539-5692f6e97228?auto=format&fit=crop&w=400&q=80" className="w-1/2 h-full object-cover opacity-70" />
                </div>
                <div className="absolute inset-0 bg-gradient-to-t from-[#050810] to-transparent opacity-90" />
                <div className="absolute bottom-3 left-3 right-3 text-center">
                  <div className="text-[11px] font-bold text-[#F8FAFC] mb-0.5">24 Active Client Pods &bull; 82%</div>
                  <div className="text-[10px] text-[#97A0B3]">Team balance &bull; Zero burnout alerts</div>
                </div>
              </div>
            </div>
            
            <div className="flex items-center justify-between text-[10px] font-bold text-[#97A0B3] border-t border-[#2A3446] pt-4">
              <div><span className="text-sm font-black text-[#F8FAFC] block mb-0.5">24</span> Active Projects</div>
              <div><span className="text-sm font-black text-[#F8FAFC] block mb-0.5">82%</span> Team Utilization</div>
              <div><span className="text-sm font-black text-[#F8FAFC] block mb-0.5">100%</span> Client SLA</div>
            </div>
          </div>
          )}

          {/* Card 3: Northstar Studio */}
          {(activeFilter === 'All' || activeFilter === 'Full-Service') && (
          <div className="bg-[#161F2D] border border-[#2A3446] rounded-2xl p-6 flex flex-col justify-between">
            <div>
              <div className="flex items-start justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="text-2xl text-[#F8FAFC] leading-none">★</div>
                  <div>
                    <div className="text-sm font-bold text-[#F8FAFC]">Northstar Studio</div>
                    <div className="text-xs text-[#97A0B3]">Brand &amp; Strategy</div>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 text-[10px] font-bold text-[#10B981]">
                  <div className="size-1.5 rounded-full bg-[#10B981]" /> Live
                </div>
              </div>
              
              <div className="bg-[#0A0F18] border border-[#2A3446] rounded-xl h-32 mb-6 flex items-center p-4">
                <div className="relative size-20 shrink-0 mr-4">
                  <svg viewBox="0 0 36 36" className="w-full h-full text-[#7FA0D6]">
                    <path className="text-[#161F2D]" strokeWidth="3" stroke="currentColor" fill="none" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
                    <path className="text-[#10B981]" strokeWidth="3" strokeDasharray="41.25, 100" stroke="currentColor" fill="none" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center text-xs font-black text-[#F8FAFC]">41.25%</div>
                </div>
                <div>
                  <div className="text-[11px] font-bold text-[#F8FAFC] mb-1">Astra Living</div>
                  <div className="text-[10px] text-[#97A0B3] leading-tight">Retainer Margin</div>
                </div>
              </div>
            </div>
            
            <div className="flex items-center justify-between text-[10px] font-bold text-[#97A0B3] border-t border-[#2A3446] pt-4">
              <div><span className="text-sm font-black text-[#F8FAFC] block mb-0.5">8</span> Active Projects</div>
              <div><span className="text-sm font-black text-[#F8FAFC] block mb-0.5">76%</span> Team Utilization</div>
              <div><span className="text-sm font-black text-[#F8FAFC] block mb-0.5">98%</span> Client SLA</div>
            </div>
          </div>
          )}

          {/* Card 4: Loom & Craft Media */}
          {(activeFilter === 'All' || activeFilter === 'DTC') && (
          <div className="bg-[#161F2D] border border-[#2A3446] rounded-2xl p-6 flex flex-col justify-between">
            <div>
              <div className="flex items-start justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="size-6 flex flex-col justify-between">
                    <div className="h-1.5 w-full bg-[#F8FAFC] skew-x-12" />
                    <div className="h-1.5 w-full bg-[#F8FAFC] skew-x-12" />
                    <div className="h-1.5 w-full bg-[#F8FAFC] skew-x-12" />
                  </div>
                  <div>
                    <div className="text-sm font-bold text-[#F8FAFC]">Loom &amp; Craft Media</div>
                    <div className="text-xs text-[#97A0B3]">High-Cadence Content</div>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 text-[10px] font-bold text-[#10B981]">
                  <div className="size-1.5 rounded-full bg-[#10B981]" /> Live
                </div>
              </div>
              
              <div className="relative bg-[#0A0F18] border border-[#2A3446] rounded-xl h-32 overflow-hidden mb-6 flex flex-col items-center justify-center p-4">
                <div className="flex gap-2 mb-3 w-full max-w-[200px]">
                  <img src="https://images.unsplash.com/photo-1616440347437-b1c73416efc2?auto=format&fit=crop&w=200&q=80" className="w-1/3 h-12 object-cover rounded opacity-80" />
                  <img src="https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&w=200&q=80" className="w-1/3 h-12 object-cover rounded opacity-80 transform -translate-y-1" />
                  <img src="https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=200&q=80" className="w-1/3 h-12 object-cover rounded opacity-80" />
                </div>
                <div className="text-[11px] font-bold text-[#F8FAFC] text-center">98% On-time publish rate &bull;</div>
                <div className="text-[10px] text-[#97A0B3] text-center">60+ monthly reels</div>
              </div>
            </div>
            
            <div className="flex items-center justify-between text-[10px] font-bold text-[#97A0B3] border-t border-[#2A3446] pt-4">
              <div><span className="text-sm font-black text-[#F8FAFC] block mb-0.5">18</span> Active Projects</div>
              <div><span className="text-sm font-black text-[#F8FAFC] block mb-0.5">79%</span> Team Utilization</div>
              <div><span className="text-sm font-black text-[#F8FAFC] block mb-0.5">97%</span> Client SLA</div>
            </div>
          </div>
          )}

          {/* Card 5: Apex Digital */}
          {(activeFilter === 'All' || activeFilter === 'Full-Service') && (
          <div className="bg-[#161F2D] border border-[#2A3446] rounded-2xl p-6 flex flex-col justify-between">
            <div>
              <div className="flex items-start justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="size-6">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-full h-full text-[#F8FAFC]">
                      <path d="M12 2L2 22h20L12 2z" fill="#F8FAFC"/>
                    </svg>
                  </div>
                  <div>
                    <div className="text-sm font-bold text-[#F8FAFC]">Apex Digital</div>
                    <div className="text-xs text-[#97A0B3]">Performance Marketing</div>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 text-[10px] font-bold text-[#10B981]">
                  <div className="size-1.5 rounded-full bg-[#10B981]" /> Live
                </div>
              </div>
              
              <div className="bg-[#0A0F18] border border-[#2A3446] rounded-xl h-32 mb-6 p-4 flex items-center">
                <div className="mr-4 text-[#10B981]">
                  <ArrowUpRight className="size-8" />
                </div>
                <div>
                  <div className="text-[14px] font-black text-[#F8FAFC]">₹2.1L</div>
                  <div className="text-[11px] font-bold text-[#F8FAFC] mb-0.5">Collections Pipeline</div>
                  <div className="text-[10px] text-[#97A0B3]">(Auto-follow ups active)</div>
                </div>
              </div>
            </div>
            
            <div className="flex items-center justify-between text-[10px] font-bold text-[#97A0B3] border-t border-[#2A3446] pt-4">
              <div><span className="text-sm font-black text-[#F8FAFC] block mb-0.5">14</span> Active Projects</div>
              <div><span className="text-sm font-black text-[#F8FAFC] block mb-0.5">83%</span> Team Utilization</div>
              <div><span className="text-sm font-black text-[#F8FAFC] block mb-0.5">96%</span> Client SLA</div>
            </div>
          </div>
          )}

          {/* Card 6: Pulse Motion Lab */}
          {(activeFilter === 'All' || activeFilter === 'Motion') && (
          <div className="bg-[#161F2D] border border-[#2A3446] rounded-2xl p-6 flex flex-col justify-between">
            <div>
              <div className="flex items-start justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="size-6 bg-[#F8FAFC] rounded-full flex items-center justify-center pl-0.5">
                    <Play className="size-3 text-[#161F2D] fill-[#161F2D]" />
                  </div>
                  <div>
                    <div className="text-sm font-bold text-[#F8FAFC]">Pulse Motion Lab</div>
                    <div className="text-xs text-[#97A0B3]">Video &amp; Editorial</div>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 text-[10px] font-bold text-[#10B981]">
                  <div className="size-1.5 rounded-full bg-[#10B981]" /> Live
                </div>
              </div>
              
              <div className="bg-[#0A0F18] border border-[#2A3446] rounded-xl h-32 mb-6 p-4 flex items-center relative overflow-hidden">
                <div className="absolute top-1/2 left-0 w-1/3 h-full -translate-y-1/2 rounded overflow-hidden p-2 opacity-50">
                  <img src="https://images.unsplash.com/photo-1574717024653-61fd2cf4d44d?auto=format&fit=crop&w=200&q=80" className="w-full h-full object-cover rounded" />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <Play className="size-4 text-white" />
                  </div>
                </div>
                <div className="w-1/3"></div>
                <div className="w-2/3 pl-2">
                  <div className="text-[11px] font-bold text-[#F8FAFC] mb-1">Revision Ticket SLA:</div>
                  <div className="text-xs font-bold text-[#F8FAFC]">3 days &rarr; 4.2 hours</div>
                </div>
              </div>
            </div>
            
            <div className="flex items-center justify-between text-[10px] font-bold text-[#97A0B3] border-t border-[#2A3446] pt-4">
              <div><span className="text-sm font-black text-[#F8FAFC] block mb-0.5">10</span> Active Projects</div>
              <div><span className="text-sm font-black text-[#F8FAFC] block mb-0.5">78%</span> Team Utilization</div>
              <div><span className="text-sm font-black text-[#F8FAFC] block mb-0.5">99%</span> Client SLA</div>
            </div>
          </div>
          )}
        </div>

      </section>

      {/* ── Section 3: Founder Testimonials ── */}
      <section className="max-w-[1240px] mx-auto px-6 py-20 lg:py-24 border-t border-[#2A3446]">
        <div className="mb-12">
          <div className="inline-flex items-center gap-2 rounded-full bg-[#161F2D] border border-[#2A3446] text-[#7FA0D6] text-[11px] font-bold px-3 py-1 mb-6">
            ⚡ SUCCESS STORIES
          </div>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight text-[#F8FAFC]">
            What Agency Founders Experience.
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-stretch">
          <div className="bg-[#161F2D] border border-[#2A3446] rounded-3xl p-6 lg:p-8 h-full flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-4 mb-6">
                <img src="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=150&q=80" alt="Vikram Malhotra" className="w-12 h-12 rounded-full object-cover border border-[#2A3446]" />
                <div>
                  <div className="text-sm sm:text-base font-bold text-[#F8FAFC]">Vikram Malhotra</div>
                  <div className="text-[10px] text-[#7FA0D6] mt-0.5">Founder &amp; MD, Velox Studio</div>
                </div>
              </div>
              <p className="text-sm text-[#F8FAFC] leading-relaxed my-4 font-medium">
                "CREO eliminated our single biggest growth bottleneck: client approval friction. Our clients love the 1-click review portal..."
              </p>
            </div>
            <div className="w-full bg-[#0A0F18] border border-[#2A3446] py-2 px-3 rounded-lg text-xs font-semibold text-[#7FA0D6] flex items-center gap-2 mt-auto">
              ⚡ 64% Faster Sign-Off Cadence
            </div>
          </div>

          <div className="bg-[#161F2D] border border-[#2A3446] rounded-3xl p-6 lg:p-8 h-full flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-4 mb-6">
                <img src="https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=150&q=80" alt="Sarah Jenkins" className="w-12 h-12 rounded-full object-cover border border-[#2A3446]" />
                <div>
                  <div className="text-sm sm:text-base font-bold text-[#F8FAFC]">Sarah Jenkins</div>
                  <div className="text-[10px] text-[#7FA0D6] mt-0.5">Head of Operations, Hyperdrive Creative</div>
                </div>
              </div>
              <p className="text-sm text-[#F8FAFC] leading-relaxed my-4 font-medium">
                "Before CREO, team utilization was guesswork on a spreadsheet. Now I can see Video Editors at 82%..."
              </p>
            </div>
            <div className="w-full bg-[#0A0F18] border border-[#2A3446] py-2 px-3 rounded-lg text-xs font-semibold text-[#7FA0D6] flex items-center gap-2 mt-auto">
              ⚡ +30% Team Utilization Accuracy
            </div>
          </div>

          <div className="bg-[#161F2D] border border-[#2A3446] rounded-3xl p-6 lg:p-8 h-full flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-4 mb-6">
                <img src="https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=150&q=80" alt="Karan Patel" className="w-12 h-12 rounded-full object-cover border border-[#2A3446]" />
                <div>
                  <div className="text-sm sm:text-base font-bold text-[#F8FAFC]">Karan Patel</div>
                  <div className="text-[10px] text-[#7FA0D6] mt-0.5">Partner, Northstar Agency</div>
                </div>
              </div>
              <p className="text-sm text-[#F8FAFC] leading-relaxed my-4 font-medium">
                "Seeing our true contribution margin on clients like Astra Living (41.25%) directly inside the operational dashboard..."
              </p>
            </div>
            <div className="w-full bg-[#0A0F18] border border-[#2A3446] py-2 px-3 rounded-lg text-xs font-semibold text-[#7FA0D6] flex items-center gap-2 mt-auto">
              ⚡ 41.25% Verified Margin Retention
            </div>
          </div>
        </div>
      </section>

      {/* ── Section 4: Client Portal Showcase ── */}
      <section className="max-w-[1240px] mx-auto px-6 py-20 lg:py-24 border-t border-[#2A3446]">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
          
          <div className="pr-4 lg:pr-8">
            <div className="inline-flex items-center gap-2 rounded-full bg-[#161F2D] border border-[#2A3446] text-[#7FA0D6] text-[11px] font-bold px-3 py-1 mb-6">
              ⚡ CLIENT PORTAL EXPERIENCE
            </div>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight text-[#F8FAFC] mb-10 leading-[1.1]">
              Your clients see your brand, powered by <span className="text-[#F8FAFC]">CREO's engine.</span>
            </h2>
            
            <div className="space-y-8">
              <div className="flex gap-5">
                <div className="w-12 h-12 rounded-2xl bg-[#161F2D] border border-[#2A3446] flex items-center justify-center shrink-0">
                  <Globe className="size-5 text-[#7FA0D6]" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-[#F8FAFC] mb-1">Custom agency domain</h4>
                  <p className="text-xs text-[#97A0B3]">Your brand. Your domain. Your portal.</p>
                </div>
              </div>
              <div className="flex gap-5">
                <div className="w-12 h-12 rounded-2xl bg-[#161F2D] border border-[#2A3446] flex items-center justify-center shrink-0">
                  <CheckSquare className="size-5 text-[#7FA0D6]" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-[#F8FAFC] mb-1">1-click approve/revision workflow</h4>
                  <p className="text-xs text-[#97A0B3]">Faster approvals. Happier clients.</p>
                </div>
              </div>
              <div className="flex gap-5">
                <div className="w-12 h-12 rounded-2xl bg-[#161F2D] border border-[#2A3446] flex items-center justify-center shrink-0">
                  <CreditCard className="size-5 text-[#7FA0D6]" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-[#F8FAFC] mb-1">Secure automated billing</h4>
                  <p className="text-xs text-[#97A0B3]">Get paid on time, every time.</p>
                </div>
              </div>
              <div className="flex gap-5">
                <div className="w-12 h-12 rounded-2xl bg-[#161F2D] border border-[#2A3446] flex items-center justify-center shrink-0">
                  <UserCheck className="size-5 text-[#7FA0D6]" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-[#F8FAFC] mb-1">Zero login friction</h4>
                  <p className="text-xs text-[#97A0B3]">No accounts. No hassle. Just access.</p>
                </div>
              </div>
            </div>
          </div>
          
          <div className="bg-[#161F2D] border border-[#2A3446] rounded-3xl p-6 lg:p-8 shadow-2xl relative overflow-hidden flex flex-col">
            <div className="flex items-center justify-between mb-8 pb-6 border-b border-[#2A3446]">
              <div>
                <div className="text-lg font-black text-[#F8FAFC]">Astra Living</div>
                <div className="text-[10px] text-[#97A0B3]">Client Portal</div>
              </div>
              <div className="flex items-center gap-2">
                <div className="text-2xl text-[#F8FAFC] leading-none mb-1">△</div>
                <div className="text-xs font-bold tracking-widest text-[#F8FAFC] uppercase">Astra Living</div>
                <div className="ml-4 flex flex-col gap-[3px]">
                  <div className="w-4 h-[1.5px] bg-[#97A0B3]" />
                  <div className="w-4 h-[1.5px] bg-[#97A0B3]" />
                  <div className="w-4 h-[1.5px] bg-[#97A0B3]" />
                </div>
              </div>
            </div>
            
            <div className="flex items-center justify-between mb-4">
              <div className="text-sm font-bold text-[#F8FAFC]">Deliverables</div>
              <div className="text-[10px] font-bold text-[#7FA0D6] flex items-center gap-1 cursor-pointer">
                View all <ChevronRight className="size-3" />
              </div>
            </div>

            <div className="space-y-3 mb-6">
              {[
                { name: 'Reel 04 - Product Video', type: 'Video • 2.4 GB', img: 'https://images.unsplash.com/photo-1528271537-7addcf9eff27?auto=format&fit=crop&w=100&q=80' },
                { name: 'Carousel 03 - Brand Specs', type: 'Design • 15 MB', img: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&w=100&q=80' },
                { name: 'Reel 05 - Testimonial Video', type: 'Video • 1.8 GB', img: 'https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?auto=format&fit=crop&w=100&q=80' },
              ].map((item) => (
                <div key={item.name} className="flex items-center justify-between p-3 rounded-xl bg-[#0A0F18] border border-[#2A3446]">
                  <div className="flex items-center gap-3">
                    <img src={item.img} className="w-14 h-10 rounded-md object-cover shrink-0 border border-[#2A3446]" />
                    <div>
                      <div className="text-[11px] font-bold text-[#F8FAFC]">{item.name}</div>
                      <div className="text-[9px] text-[#97A0B3]">{item.type}</div>
                    </div>
                  </div>
                  {portalStatus === 'pending' && (
                    <span className="text-[10px] font-semibold text-[#D8BF9B] bg-[#D8BF9B]/10 px-2.5 py-1 rounded-full">● Awaiting Review</span>
                  )}
                  {portalStatus === 'approved' && (
                    <span className="text-[10px] font-semibold text-[#10B981] bg-[#10B981]/10 px-2.5 py-1 rounded-full">✓ Approved (Queued)</span>
                  )}
                  {portalStatus === 'revision' && (
                    <span className="text-[10px] font-semibold text-[#7FA0D6] bg-[#7FA0D6]/10 px-2.5 py-1 rounded-full">⚡ SLA Revision Ticket Logged</span>
                  )}
                </div>
              ))}
            </div>

            <div className="flex items-center gap-3 mb-8">
              <button 
                onClick={() => setPortalStatus('approved')}
                className={`flex-1 font-black text-xs py-2.5 rounded-full flex items-center justify-center gap-1 transition-colors ${
                  portalStatus === 'approved' 
                    ? 'bg-[#10B981] text-[#050810]' 
                    : 'bg-[#10B981] hover:bg-[#059669] text-[#050810]'
                }`}
              >
                <CheckCircle2 className="size-3" /> Approve All
              </button>
              <button 
                onClick={() => setPortalStatus('revision')}
                className={`flex-1 font-medium text-xs py-2.5 rounded-full transition-colors ${
                  portalStatus === 'revision'
                    ? 'bg-[#7FA0D6]/20 border border-[#7FA0D6] text-[#7FA0D6]'
                    : 'bg-[#050810] border border-[#2A3446] hover:border-[#97A0B3] text-[#F8FAFC]'
                }`}
              >
                Request Revisions
              </button>
              {portalStatus !== 'pending' && (
                <button 
                  onClick={() => setPortalStatus('pending')}
                  className="text-[10px] text-[#97A0B3] hover:text-[#F8FAFC] transition-colors underline underline-offset-2 shrink-0"
                >
                  Reset
                </button>
              )}
            </div>

            <div className="border-t border-[#2A3446] pt-6">
              <div className="flex items-center justify-between mb-4">
                <div className="text-xs font-bold text-[#F8FAFC]">Project Timeline</div>
                <div className="text-[10px] font-bold text-[#7FA0D6] flex items-center gap-1 cursor-pointer">
                  View timeline <ChevronRight className="size-3" />
                </div>
              </div>
              
              <div className="relative mt-2 px-2">
                <div className="absolute left-3 right-3 top-2 h-0.5 bg-[#2A3446]" />
                <div className="absolute left-3 w-[65%] top-2 h-0.5 bg-[#10B981]" />
                
                <div className="flex justify-between relative">
                  <div className="flex flex-col items-center gap-2">
                    <div className="size-4 rounded-full bg-[#10B981] border-2 border-[#161F2D] z-10 flex items-center justify-center text-[#050810]">
                      <CheckCircle2 className="size-3" />
                    </div>
                    <div className="text-center">
                      <div className="text-[10px] font-bold text-[#F8FAFC]">Brief</div>
                      <div className="text-[9px] text-[#97A0B3]">Mar 12</div>
                    </div>
                  </div>
                  <div className="flex flex-col items-center gap-2">
                    <div className="size-4 rounded-full bg-[#10B981] border-2 border-[#161F2D] z-10 flex items-center justify-center text-[#050810]">
                      <CheckCircle2 className="size-3" />
                    </div>
                    <div className="text-center">
                      <div className="text-[10px] font-bold text-[#F8FAFC]">Production</div>
                      <div className="text-[9px] text-[#97A0B3]">Apr 02</div>
                    </div>
                  </div>
                  <div className="flex flex-col items-center gap-2">
                    <div className="size-4 rounded-full bg-[#7FA0D6] border-2 border-[#161F2D] z-10" />
                    <div className="text-center">
                      <div className="text-[10px] font-bold text-[#F8FAFC]">Review</div>
                      <div className="text-[9px] text-[#97A0B3]">Apr 08</div>
                    </div>
                  </div>
                  <div className="flex flex-col items-center gap-2">
                    <div className="size-4 rounded-full bg-[#050810] border-2 border-[#2A3446] z-10" />
                    <div className="text-center">
                      <div className="text-[10px] font-bold text-[#97A0B3]">Delivery</div>
                      <div className="text-[9px] text-[#97A0B3]">Apr 12</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
          
        </div>
      </section>

    </div>
  );
}
