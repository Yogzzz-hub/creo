import os

content = """import { useState } from "react";
import { 
  Users, ShieldCheck, 
  Search, CheckCircle2, Play, Activity, 
  Globe, CheckSquare, CreditCard, UserCheck, ChevronRight, ArrowUpRight, Zap, Layers,
  Link, Clock, Unlock
} from "lucide-react";

export function ClientsPage() {
  const [portalStatus, setPortalStatus] = useState<'pending' | 'approved' | 'revision'>('pending');
  return (
    <div className="w-full bg-[#050810] text-[#F8FAFC] min-h-screen pb-20 lg:pb-24 font-sans selection:bg-[#7FA0D6]/30">
      
      {/* - Section 1: Hero - */}
      <section className="max-w-[1240px] mx-auto px-6 py-24 lg:py-32 relative text-center">
        <div className="absolute inset-0 overflow-hidden pointer-events-none opacity-20">
          <svg className="absolute w-full h-full" xmlns="http://www.w3.org/2000/svg">
              <defs>
                  <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
                      <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#7FA0D6" strokeWidth="0.5" opacity="0.5"/>
                  </pattern>
              </defs>
              <rect width="100%" height="100%" fill="url(#grid)" />
              <circle cx="20%" cy="30%" r="2" fill="#7FA0D6" className="animate-ping" />
              <circle cx="70%" cy="60%" r="3" fill="#BCCCE6" className="animate-pulse" />
          </svg>
        </div>
        
        <div className="relative z-10 max-w-3xl mx-auto">
          <h1 className="text-4xl sm:text-5xl lg:text-[56px] font-black tracking-tight leading-[1.05] text-[#F8FAFC] mb-6">
            The Client Portal <span className="text-[#7FA0D6]">Architecture.</span>
          </h1>
          <p className="text-sm sm:text-base text-[#97A0B3] max-w-2xl mx-auto mt-4 mb-8 leading-relaxed">
            A frictionless, zero-login review environment engineered for high-velocity agency deliverables.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3">
            <span className="bg-[#161F2D] border border-[#2A3446]/50 text-[#7FA0D6] text-xs font-semibold px-4 py-1.5 rounded-full">Magic Link Auth</span>
            <span className="bg-[#161F2D] border border-[#2A3446]/50 text-[#7FA0D6] text-xs font-semibold px-4 py-1.5 rounded-full">Frame-Accurate SLAs</span>
            <span className="bg-[#161F2D] border border-[#2A3446]/50 text-[#7FA0D6] text-xs font-semibold px-4 py-1.5 rounded-full">White-Label Engine</span>
          </div>
        </div>
      </section>

      {/* - Section 2: Main Showcase: The Interactive Client Portal Experience - */}
      <section className="max-w-[1000px] mx-auto px-6 pb-24">
        <div className="backdrop-blur-md bg-[#161F2D]/50 border border-[#2A3446]/50 rounded-2xl p-6 sm:p-8 shadow-2xl relative overflow-hidden flex flex-col">
          <div className="flex items-center justify-between mb-8 pb-6 border-b border-[#2A3446]/50">
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
              { name: 'Reel 04 - Product Video', type: 'Video · 2.4 GB', img: 'https://images.unsplash.com/photo-1528271537-7addcf9eff27?auto=format&fit=crop&w=100&q=80' },
              { name: 'Carousel 03 - Brand Specs', type: 'Design · 15 MB', img: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&w=100&q=80' },
              { name: 'Reel 05 - Testimonial Video', type: 'Video · 1.8 GB', img: 'https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?auto=format&fit=crop&w=100&q=80' },
            ].map((item) => (
              <div key={item.name} className="flex items-center justify-between p-3 rounded-xl bg-[#0A0F18] border border-[#2A3446]/50">
                <div className="flex items-center gap-3">
                  <img src={item.img} className="w-14 h-10 rounded-md object-cover shrink-0 border border-[#2A3446]/50" />
                  <div>
                    <div className="text-[11px] font-bold text-[#F8FAFC]">{item.name}</div>
                    <div className="text-[9px] text-[#97A0B3]">{item.type}</div>
                  </div>
                </div>
                {portalStatus === 'pending' && (
                  <span className="text-[10px] font-semibold text-[#D8BF9B] bg-[#D8BF9B]/10 px-2.5 py-1 rounded-full border border-[#D8BF9B]/20">● Awaiting Review</span>
                )}
                {portalStatus === 'approved' && (
                  <span className="text-[10px] font-semibold text-[#7FA0D6] bg-[#7FA0D6]/10 px-2.5 py-1 rounded-full border border-[#7FA0D6]/20">✓ Approved (Queued)</span>
                )}
                {portalStatus === 'revision' && (
                  <span className="text-[10px] font-semibold text-[#7FA0D6] bg-[#7FA0D6]/10 px-2.5 py-1 rounded-full border border-[#7FA0D6]/20"> SLA Revision Ticket Logged</span>
                )}
              </div>
            ))}
          </div>

          <div className="flex items-center gap-3 mb-8">
            <button 
              onClick={() => setPortalStatus('approved')}
              className={`flex-1 font-black text-xs py-2.5 rounded-full flex items-center justify-center gap-1 transition-all shadow-sm hover:shadow-[0_0_20px_rgba(188,204,230,0.25)] ${
                portalStatus === 'approved' 
                  ? 'bg-[#BCCCE6] text-[#050810]' 
                  : 'bg-[#BCCCE6] hover:bg-[#D5E1F2] text-[#050810]'
              }`}
            >
              <CheckCircle2 className="size-3" /> Approve All
            </button>
            <button 
              onClick={() => setPortalStatus('revision')}
              className={`flex-1 font-medium text-xs py-2.5 rounded-full transition-colors ${
                portalStatus === 'revision'
                  ? 'bg-[#7FA0D6]/20 border border-[#7FA0D6] text-[#7FA0D6]'
                  : 'bg-[#050810] border border-[#2A3446]/50 hover:border-[#7FA0D6]/50 text-[#F8FAFC]'
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

          <div className="border-t border-[#2A3446]/50 pt-6">
            <div className="flex items-center justify-between mb-4">
              <div className="text-xs font-bold text-[#F8FAFC]">Project Timeline</div>
              <div className="text-[10px] font-bold text-[#7FA0D6] flex items-center gap-1 cursor-pointer">
                View timeline <ChevronRight className="size-3" />
              </div>
            </div>
            
            <div className="relative mt-2 px-2">
              <div className="absolute left-3 right-3 top-2 h-0.5 bg-[#2A3446]/50" />
              <div className="absolute left-3 w-[65%] top-2 h-0.5 bg-[#7FA0D6]" />
              
              <div className="flex justify-between relative">
                <div className="flex flex-col items-center gap-2">
                  <div className="size-4 rounded-full bg-[#7FA0D6] border-2 border-[#161F2D] z-10 flex items-center justify-center text-[#050810]">
                    <CheckCircle2 className="size-3" />
                  </div>
                  <div className="text-center">
                    <div className="text-[10px] font-bold text-[#F8FAFC]">Brief</div>
                    <div className="text-[9px] text-[#97A0B3]">Mar 12</div>
                  </div>
                </div>
                <div className="flex flex-col items-center gap-2">
                  <div className="size-4 rounded-full bg-[#7FA0D6] border-2 border-[#161F2D] z-10 flex items-center justify-center text-[#050810]">
                    <CheckCircle2 className="size-3" />
                  </div>
                  <div className="text-center">
                    <div className="text-[10px] font-bold text-[#F8FAFC]">Production</div>
                    <div className="text-[9px] text-[#97A0B3]">Apr 02</div>
                  </div>
                </div>
                <div className="flex flex-col items-center gap-2">
                  <div className="size-4 rounded-full bg-[#7FA0D6] border-2 border-[#161F2D] z-10 shadow-[0_0_10px_rgba(127,160,214,0.5)]" />
                  <div className="text-center">
                    <div className="text-[10px] font-bold text-[#F8FAFC]">Review</div>
                    <div className="text-[9px] text-[#97A0B3]">Apr 08</div>
                  </div>
                </div>
                <div className="flex flex-col items-center gap-2">
                  <div className="size-4 rounded-full bg-[#050810] border-2 border-[#2A3446]/50 z-10" />
                  <div className="text-center">
                    <div className="text-[10px] font-bold text-[#97A0B3]">Delivery</div>
                    <div className="text-[9px] text-[#97A0B3]">Apr 12</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* - Section 3: 3 Client Collaboration Protocols - */}
      <section className="max-w-[1240px] mx-auto px-6 py-24 border-t border-[#2A3446]/50">
        <div className="mb-12 text-center">
          <div className="inline-flex items-center gap-2 rounded-full bg-[#161F2D] border border-[#2A3446]/50 text-[#7FA0D6] text-[11px] font-bold px-3 py-1 mb-6">
            COLLABORATION PROTOCOLS
          </div>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight text-[#F8FAFC]">
            Engineered for high-velocity approvals.
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="backdrop-blur-md bg-[#161F2D]/40 border border-[#2A3446]/40 rounded-xl p-6 flex flex-col">
            <div className="w-12 h-12 rounded-xl bg-[#0A0F18] border border-[#2A3446]/50 flex items-center justify-center mb-6">
              <Link className="size-5 text-[#7FA0D6]" />
            </div>
            <h3 className="text-lg font-bold text-[#F8FAFC] mb-3">Zero-Login Friction</h3>
            <p className="text-sm text-[#97A0B3] leading-relaxed">
              Clients receive single-click, token-authenticated review links without needing account creation or password management.
            </p>
          </div>

          <div className="backdrop-blur-md bg-[#161F2D]/40 border border-[#2A3446]/40 rounded-xl p-6 flex flex-col">
            <div className="w-12 h-12 rounded-xl bg-[#0A0F18] border border-[#2A3446]/50 flex items-center justify-center mb-6">
              <Clock className="size-5 text-[#7FA0D6]" />
            </div>
            <h3 className="text-lg font-bold text-[#F8FAFC] mb-3">Contextual Precision</h3>
            <p className="text-sm text-[#97A0B3] leading-relaxed">
              Timestamped notes and deliverable versions synced directly back to production pods to eliminate messy email threads.
            </p>
          </div>

          <div className="backdrop-blur-md bg-[#161F2D]/40 border border-[#2A3446]/40 rounded-xl p-6 flex flex-col">
            <div className="w-12 h-12 rounded-xl bg-[#0A0F18] border border-[#2A3446]/50 flex items-center justify-center mb-6">
              <Unlock className="size-5 text-[#7FA0D6]" />
            </div>
            <h3 className="text-lg font-bold text-[#F8FAFC] mb-3">Automated Sign-Off Gates</h3>
            <p className="text-sm text-[#97A0B3] leading-relaxed">
              Approvals immediately unlock final renders, update retainer milestones, and trigger billing events automatically.
            </p>
          </div>
        </div>
      </section>

    </div>
  );
}
"""

with open('src/pages/public/ClientsPage.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
