import { useState } from "react";
import { Link } from "react-router";
import { Bell, Search, Clock, Users, BarChart3, CheckCircle2, Play, AlertCircle, TrendingUp, X, Folder, Volume2, Maximize } from "lucide-react";

export function PortfolioPage() {
  const [dossierTab, setDossierTab] = useState<'scope' | 'metrics'>('scope');
  const [approvalStatus, setApprovalStatus] = useState<'pending' | 'approved' | 'revision'>('pending');
  const [inv1, setInv1] = useState('Paid ✓');
  const [inv2, setInv2] = useState('Due in 2 Days');
  return (
    <div className="w-full bg-nebula-void text-slate-50 min-h-screen pb-20 lg:pb-24 font-sans selection:bg-nebula-glow/30">
      
      {/* - Top Hero Section (2-Column Grid) - */}
      <section className="max-w-[1240px] mx-auto px-6 pt-6 pb-16 sm:pt-8 sm:pb-20 lg:pt-10 lg:pb-24 relative">
        <div className="absolute inset-0 overflow-hidden pointer-events-none opacity-20">
        <svg className="absolute w-full h-full" xmlns="http://www.w3.org/2000/svg">
            <defs>
                <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
                    <path d="M 40 0 L 0 0 0 40" fill="none" stroke="var(--color-nebula-glow)" strokeWidth="0.5" opacity="0.5"/>
                </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#grid)" />
            <circle cx="10%" cy="20%" r="2" fill="var(--color-nebula-glow)" className="animate-ping" />
            <circle cx="80%" cy="70%" r="3" fill="var(--color-nebula-periwinkle)" className="animate-pulse" />
            <circle cx="40%" cy="80%" r="2" fill="var(--color-nebula-glow)" className="animate-ping" style={{ animationDelay: '1s' }} />
        </svg>
    </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-8 items-center">
          
          {/* Left Hero Column */}
          <div className="pr-4 lg:pr-8">
            <div className="inline-flex items-center gap-2 rounded-full backdrop-blur-md bg-nebula-surface/50 border border-nebula-steel/30 px-3 py-1.5 text-[10px] sm:text-[11px] font-bold tracking-widest uppercase text-nebula-glow mb-6 shadow-sm">
               THE OPERATING SYSTEM IN MOTION
            </div>
            
            <h1 className="text-4xl sm:text-5xl lg:text-[56px] font-black tracking-tight leading-[1.05] text-slate-50 mb-6">
              How modern creative <br className="hidden sm:block" /> agencies <br className="hidden sm:block" />
              <span className="text-nebula-glow">operate on CREO.</span>
            </h1>
            
            <p className="text-nebula-mist text-sm leading-relaxed max-w-lg mb-8">
              Explore how high-performing creative studios use CREO to eliminate handoff friction, orchestrate multi-pod capacity, and track true project unit economics in real time.
            </p>
            
            <div className="flex flex-col sm:flex-row items-center gap-4 mb-10">
              <Link to="/pricing" className="bg-nebula-periwinkle text-nebula-void font-semibold text-xs sm:text-sm px-6 py-3 rounded-full transition-all shadow-sm hover:shadow-[0_0_20px_rgba(188,204,230,0.25)] hover:bg-nebula-periwinkle w-full sm:w-auto text-center">
                Deploy CREO in Your Agency &rarr;
              </Link>
              <a href="https://wa.me/919941999415" target="_blank" rel="noopener noreferrer" className="bg-transparent border border-nebula-steel/30 text-slate-50 text-xs sm:text-sm px-6 py-3 rounded-full hover:bg-nebula-surface transition w-full sm:w-auto text-center shadow-sm">
                Schedule Live Demo
              </a>
            </div>
            
            {/* 4 Stat Pods */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
              <div className="backdrop-blur-md bg-nebula-surface/50 border border-nebula-steel/30 rounded-xl p-4 flex flex-col justify-center">
                <div className="text-nebula-mist mb-2"><BarChart3 className="size-5" /></div>
                <div className="text-lg font-black text-slate-50 leading-none mb-1">18-Step</div>
                <div className="text-[10px] text-nebula-mist font-medium leading-tight">Connected <br/>Pipeline</div>
              </div>
              <div className="backdrop-blur-md bg-nebula-surface/50 border border-nebula-steel/30 rounded-xl p-4 flex flex-col justify-center">
                <div className="text-nebula-mist mb-2"><Clock className="size-5" /></div>
                <div className="text-lg font-black text-slate-50 leading-none mb-1">2.4h</div>
                <div className="text-[10px] text-nebula-mist font-medium leading-tight">Avg. Client <br/>Sign-Off</div>
              </div>
              <div className="backdrop-blur-md bg-nebula-surface/50 border border-nebula-steel/30 rounded-xl p-4 flex flex-col justify-center">
                <div className="text-nebula-mist mb-2"><Users className="size-5" /></div>
                <div className="text-lg font-black text-slate-50 leading-none mb-1">82%</div>
                <div className="text-[10px] text-nebula-mist font-medium leading-tight">Optimized <br/>Team Capacity</div>
              </div>
              <div className="backdrop-blur-md bg-nebula-surface/50 border border-nebula-steel/30 rounded-xl p-4 flex flex-col justify-center">
                <div className="text-nebula-mist mb-2"><TrendingUp className="size-5" /></div>
                <div className="text-lg font-black text-slate-50 leading-none mb-1">41.25%</div>
                <div className="text-[10px] text-nebula-mist font-medium leading-tight">Verified <br/>Retainer Margin</div>
              </div>
            </div>
          </div>

          {/* Right Hero Column - Ops Console Card */}
          <div className="backdrop-blur-md bg-nebula-surface/50 border border-nebula-steel/30 rounded-3xl p-6 shadow-2xl relative overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-nebula-steel/30 pb-4 mb-6">
              <div className="flex items-center gap-3">
                <div className="font-black text-slate-50 text-lg tracking-tight">creo.</div>
                <div className="text-xs text-nebula-mist font-medium">Agency Operating</div>
              </div>
              <div className="flex items-center gap-3">
                <Search className="size-4 text-nebula-mist" />
                <Bell className="size-4 text-nebula-mist" />
                <img src="https://ui-avatars.com/api/?name=Admin&background=0B111C&color=F8FAFC" alt="Avatar" className="size-6 rounded-full border border-nebula-steel/30" />
              </div>
            </div>

            {/* Top Stat Pods Grid */}
            <div className="grid grid-cols-2 gap-3 mb-6">
              <div className="bg-nebula-navy border border-nebula-steel/30 rounded-xl p-3.5">
                <div className="text-[10px] text-nebula-mist font-bold uppercase mb-1">ARR</div>
                <div className="flex items-center gap-2 mb-1">
                  <div className="text-2xl font-black text-slate-50">₹1,24,82,200</div>
                  <div className="text-[10px] text-nebula-glow bg-nebula-glow/10 border border-nebula-glow/30 px-1.5 py-0.5 rounded font-bold">+14.2%</div>
                </div>
                <svg className="w-16 h-4 text-nebula-glow mt-1" viewBox="0 0 50 15" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M1 12.5C5 12.5 8 2.5 13 2.5C18 2.5 21 11.5 25 11.5C29 11.5 32 4.5 36 4.5C41 4.5 45 9.5 49 9.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
              
              <div className="bg-nebula-navy border border-nebula-steel/30 rounded-xl p-3.5 flex flex-col justify-between">
                <div className="flex items-start justify-between">
                  <div className="text-[10px] text-nebula-mist font-bold uppercase">Active Projects</div>
                  <div className="size-5 rounded bg-nebula-void border border-nebula-steel/30 flex items-center justify-center shrink-0">
                    <Folder className="size-3 text-nebula-mist" />
                  </div>
                </div>
                <div className="text-xl sm:text-2xl font-black text-slate-50">48</div>
              </div>
              
              <div className="bg-nebula-navy border border-nebula-steel/30 rounded-xl p-3.5 flex flex-col justify-between">
                <div className="flex items-start justify-between">
                  <div className="text-[10px] text-nebula-mist font-bold uppercase">Team Utilization</div>
                  <div className="size-5 rounded bg-nebula-void border border-nebula-steel/30 flex items-center justify-center shrink-0">
                    <Users className="size-3 text-nebula-mist" />
                  </div>
                </div>
                <div className="text-xl sm:text-2xl font-black text-slate-50">82%</div>
              </div>
              
              <div className="bg-nebula-navy border border-nebula-steel/30 rounded-xl p-3.5 flex flex-col justify-between">
                <div className="flex items-start justify-between">
                  <div className="text-[10px] text-nebula-mist font-bold uppercase">Approvals Pending</div>
                  <div className="size-5 rounded bg-nebula-void border border-nebula-steel/30 flex items-center justify-center shrink-0">
                    <Clock className="size-3 text-nebula-mist" />
                  </div>
                </div>
                <div className="text-xl sm:text-2xl font-black text-slate-50">17</div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Donut Chart Mock */}
              <div className="bg-nebula-navy border border-nebula-steel/30 rounded-xl p-5 flex flex-col justify-center items-center">
                <div className="relative w-28 h-28 mb-4">
                  <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
                    <path className="text-void" strokeWidth="4" stroke="currentColor" fill="none" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
                    <path className="text-nebula-glow" strokeWidth="4" strokeDasharray="82, 100" stroke="currentColor" fill="none" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center text-lg font-black text-slate-50">82%</div>
                </div>
                <div className="w-full text-center mb-2">
                  <div className="text-xs font-bold text-slate-50">Team Balance</div>
                </div>
                <div className="w-full space-y-2">
                  <div className="flex justify-between items-center text-xs">
                    <span className="flex items-center gap-1.5 text-nebula-mist"><div className="size-2 rounded-full bg-nebula-glow" /> Billable</span>
                    <span className="font-bold text-slate-50">82%</span>
                  </div>
                  <div className="flex justify-between items-center text-xs">
                    <span className="flex items-center gap-1.5 text-nebula-mist"><div className="size-2 rounded-full bg-slate-500" /> Non-billable</span>
                    <span className="font-bold text-slate-50">18%</span>
                  </div>
                </div>
              </div>

              {/* Recent Activity */}
              <div className="bg-nebula-navy border border-nebula-steel/30 rounded-xl p-4">
                <div className="text-[10px] text-nebula-mist font-bold uppercase mb-4">Recent Activity</div>
                <div className="space-y-1">
                  <div className="flex items-center justify-between gap-2 py-1.5">
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="size-1.5 rounded-full bg-nebula-glow shrink-0" />
                      <span className="truncate text-xs text-slate-50">Client approval Reel-04</span>
                    </div>
                    <span className="shrink-0 text-[11px] text-nebula-mist">2h ago</span>
                  </div>
                  <div className="flex items-center justify-between gap-2 py-1.5">
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="size-1.5 rounded-full bg-nebula-sand shrink-0" />
                      <span className="truncate text-xs text-slate-50">New revision requested</span>
                    </div>
                    <span className="shrink-0 text-[11px] text-nebula-mist">4h ago</span>
                  </div>
                  <div className="flex items-center justify-between gap-2 py-1.5">
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="size-1.5 rounded-full bg-nebula-glow shrink-0" />
                      <span className="truncate text-xs text-slate-50">Invoice paid (TechCorp Series B)</span>
                    </div>
                    <span className="shrink-0 text-[11px] text-nebula-mist">6h ago</span>
                  </div>
                  <div className="flex items-center justify-between gap-2 py-1.5">
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="size-1.5 rounded-full bg-nebula-glow shrink-0" />
                      <span className="truncate text-xs text-slate-50">New project assigned</span>
                    </div>
                    <span className="shrink-0 text-[11px] text-nebula-mist">8h ago</span>
                  </div>
                </div>
              </div>
            </div>
            
          </div>
        </div>
      </section>

      {/* - Module 01 - */}
      <section className="max-w-[1240px] mx-auto px-6 py-12 sm:py-16">
        <div className="inline-flex items-center gap-2 rounded-full backdrop-blur-md bg-nebula-surface/50 border border-nebula-steel/30 px-3 py-1 text-[10px] font-bold tracking-widest uppercase text-nebula-mist mb-6">
          01 &nbsp; ONBOARDING &amp; TEAM CAPACITY
        </div>
        
        <div className="mb-8">
          <h2 className="text-2xl sm:text-3xl font-black text-slate-50 mb-2 tracking-tight">Client Dossier &amp; Capacity Radar</h2>
          <p className="text-sm text-nebula-mist">Get every client, project and team member aligned from day one.</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Left Card */}
          <div className="backdrop-blur-md bg-nebula-surface/50 border border-nebula-steel/30 rounded-3xl p-6 lg:p-8">
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center gap-3">
                <div className="size-10 rounded-full bg-nebula-glow flex items-center justify-center text-nebula-void font-bold text-sm">AL</div>
                <div>
                  <div className="text-xs sm:text-sm font-semibold text-slate-50">TechCorp Series B Retainer Setup</div>
                  <div className="text-xs text-nebula-mist">Lifestyle &amp; Home Decor</div>
                </div>
              </div>
              <div className="flex items-center gap-1.5 bg-nebula-navy border border-nebula-steel/30 px-2 py-1 rounded-md shadow-sm">
                <div className="size-1.5 rounded-full bg-nebula-glow" />
                <span className="text-[10px] font-bold text-nebula-glow">Verified Client</span>
              </div>
            </div>
            
            <div className="flex gap-4 mb-6 border-b border-nebula-steel/30 pb-3">
              <button onClick={() => setDossierTab('scope')} className={dossierTab === 'scope' ? "bg-nebula-surface text-slate-50 border border-nebula-glow/40 font-bold text-xs px-3 py-1 rounded-md" : "text-nebula-mist text-xs px-3 py-1 hover:text-slate-50"}>Scope</button>
              <button onClick={() => setDossierTab('metrics')} className={dossierTab === 'metrics' ? "bg-nebula-surface text-slate-50 border border-nebula-glow/40 font-bold text-xs px-3 py-1 rounded-md" : "text-nebula-mist text-xs px-3 py-1 hover:text-slate-50"}>Metrics</button>
            </div>

            <div className="grid grid-cols-3 gap-3 mb-8">
              <div className="bg-nebula-navy border border-nebula-steel/30 rounded-xl p-4 flex flex-col justify-center">
                <div className="text-[11px] text-nebula-mist font-bold mb-1">Active Deliverables</div>
                <div className="text-xl sm:text-2xl font-black text-slate-50">4</div>
              </div>
              <div className="bg-nebula-navy border border-nebula-steel/30 rounded-xl p-4 flex flex-col justify-center">
                <div className="text-[11px] text-nebula-mist font-bold mb-1">Brand Guidelines</div>
                <div className="text-xl sm:text-2xl font-black text-slate-50">12 <span className="text-[10px] font-normal text-nebula-mist">files</span></div>
              </div>
              <div className="bg-nebula-navy border border-nebula-steel/30 rounded-xl p-4 flex flex-col justify-center">
                <div className="text-[11px] text-nebula-mist font-bold mb-1">Contract Milestones</div>
                <div className="text-xl sm:text-2xl font-black text-slate-50">5/8</div>
              </div>
            </div>

            {dossierTab === 'scope' ? (
              <ul className="space-y-3 mb-8">
                <li className="flex items-center gap-3 py-2 px-3 bg-nebula-navy border border-nebula-steel/30 rounded-lg text-xs sm:text-sm text-slate-50 font-medium">
                  <CheckCircle2 className="size-4 sm:size-5 text-nebula-glow shrink-0" /> 
                  <span>Social Media Campaign <span className="text-xs text-nebula-mist font-normal">(3 months)</span></span>
                </li>
                <li className="flex items-center gap-3 py-2 px-3 bg-nebula-navy border border-nebula-steel/30 rounded-lg text-xs sm:text-sm text-slate-50 font-medium">
                  <CheckCircle2 className="size-4 sm:size-5 text-nebula-glow shrink-0" /> 
                  <span>Reel Series <span className="text-xs text-nebula-mist font-normal">(8 deliverables)</span></span>
                </li>
                <li className="flex items-center gap-3 py-2 px-3 bg-nebula-navy border border-nebula-steel/30 rounded-lg text-xs sm:text-sm text-slate-50 font-medium">
                  <CheckCircle2 className="size-4 sm:size-5 text-nebula-glow shrink-0" /> 
                  <span>Carousel Designs <span className="text-xs text-nebula-mist font-normal">(12 assets)</span></span>
                </li>
                <li className="flex items-center gap-3 py-2 px-3 bg-nebula-navy border border-nebula-steel/30 rounded-lg text-xs sm:text-sm text-slate-50 font-medium">
                  <CheckCircle2 className="size-4 sm:size-5 text-nebula-glow shrink-0" /> 
                  <span>Brand Collateral <span className="text-xs text-nebula-mist font-normal">(ongoing)</span></span>
                </li>
              </ul>
            ) : (
              <div className="space-y-3 mb-8">
                <div className="flex items-center justify-between py-2.5 px-3 bg-nebula-navy border border-nebula-steel/30 rounded-lg text-xs sm:text-sm text-slate-50 font-medium">
                  <div className="flex items-center gap-3"><Clock className="size-4 sm:size-5 text-nebula-glow shrink-0" /> Turnaround SLA</div>
                  <div className="font-bold">2.1 days</div>
                </div>
                <div className="flex items-center justify-between py-2.5 px-3 bg-nebula-navy border border-nebula-steel/30 rounded-lg text-xs sm:text-sm text-slate-50 font-medium">
                  <div className="flex items-center gap-3"><CheckCircle2 className="size-4 sm:size-5 text-nebula-glow shrink-0" /> First-pass approval</div>
                  <div className="font-bold">88%</div>
                </div>
                <div className="flex items-center justify-between py-2.5 px-3 bg-nebula-navy border border-nebula-steel/30 rounded-lg text-xs sm:text-sm text-slate-50 font-medium">
                  <div className="flex items-center gap-3"><Folder className="size-4 sm:size-5 text-nebula-glow shrink-0" /> Total assets delivered</div>
                  <div className="font-bold">32</div>
                </div>
              </div>
            )}

            <Link to="/signup?intent=dossier" className="w-full bg-nebula-navy border border-nebula-steel/30 text-slate-50 font-bold text-xs py-3.5 rounded-xl hover:bg-nebula-surface transition-colors flex items-center justify-center gap-2">
              View Full Client Dossier &rarr;
            </Link>
          </div>

          {/* Right Card */}
          <div className="backdrop-blur-md bg-nebula-surface/50 border border-nebula-steel/30 rounded-3xl p-6 lg:p-8 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-8">
                <div className="text-xs sm:text-sm font-semibold text-slate-50">Live Team Utilization</div>
                <div className="flex items-center gap-1.5 bg-nebula-navy border border-nebula-steel/30 px-2 py-1 rounded-md shadow-sm">
                  <div className="size-1.5 rounded-full animate-pulse bg-nebula-glow" />
                  <span className="text-[10px] font-bold text-nebula-glow">Live</span>
                </div>
              </div>
              
              <div className="space-y-6">
                <div className="flex items-center gap-4">
                  <img src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&q=80" alt="Video Editor" className="w-8 h-8 rounded-full object-cover border border-nebula-steel/30" />
                  <div className="flex-1">
                    <div className="flex justify-between text-xs font-semibold mb-2">
                      <span className="text-slate-50">Video Editor</span>
                      <span className="text-slate-50">82%</span>
                    </div>
                    <div className="h-1.5 w-full bg-nebula-void rounded-full overflow-hidden"><div className="h-full bg-nebula-glow w-[82%]" /></div>
                  </div>
                </div>
                
                <div className="flex items-center gap-4">
                  <img src="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=150&q=80" alt="Lead Designer" className="w-8 h-8 rounded-full object-cover border border-nebula-steel/30" />
                  <div className="flex-1">
                    <div className="flex justify-between text-xs font-semibold mb-2">
                      <span className="text-slate-50">Lead Designer</span>
                      <span className="text-slate-50">74%</span>
                    </div>
                    <div className="h-1.5 w-full bg-nebula-void rounded-full overflow-hidden"><div className="h-full bg-nebula-glow w-[74%]" /></div>
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  <img src="https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=150&q=80" alt="SMM Lead" className="w-8 h-8 rounded-full object-cover border border-nebula-steel/30" />
                  <div className="flex-1">
                    <div className="flex justify-between items-center text-xs font-semibold mb-2">
                      <div className="flex items-center gap-2">
                        <span className="text-slate-50">SMM Lead</span>
                        <span className="bg-nebula-sand/10 border border-nebula-sand/30 text-nebula-sand text-[9px] px-1.5 py-0.5 rounded flex items-center gap-1">
                          <AlertCircle className="size-2.5" /> Bottleneck Risk - 2 items queued
                        </span>
                      </div>
                      <span className="text-slate-50">91%</span>
                    </div>
                    <div className="h-1.5 w-full bg-nebula-void rounded-full overflow-hidden"><div className="h-full bg-nebula-sand w-[91%]" /></div>
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  <img src="https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=150&q=80" alt="Content Lead" className="w-8 h-8 rounded-full object-cover border border-nebula-steel/30" />
                  <div className="flex-1">
                    <div className="flex justify-between text-xs font-semibold mb-2">
                      <span className="text-slate-50">Content Lead</span>
                      <span className="text-slate-50">67%</span>
                    </div>
                    <div className="h-1.5 w-full bg-nebula-void rounded-full overflow-hidden"><div className="h-full bg-nebula-glow w-[67%]" /></div>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-8 p-3 rounded-xl bg-nebula-navy border border-nebula-steel/30 flex items-center gap-2 text-[10px] text-nebula-mist font-medium">
              <span className="text-nebula-glow"></span> Live Resource Telemetry - Zero spreadsheet guesswork.
            </div>
          </div>
        </div>
      </section>

      {/* - Module 02 - */}
      <section className="max-w-[1240px] mx-auto px-6 py-12 sm:py-16">
        <div className="inline-flex items-center gap-2 rounded-full backdrop-blur-md bg-nebula-surface/50 border border-nebula-steel/30 px-3 py-1 text-[10px] font-bold tracking-widest uppercase text-nebula-mist mb-6">
          02 &nbsp; CREATIVE PRODUCTION &amp; CLIENT SIGN-OFF
        </div>
        
        <div className="mb-8">
          <h2 className="text-2xl sm:text-3xl font-black text-slate-50 mb-2 tracking-tight">The Production Engine &amp; 1-Click Approvals</h2>
          <p className="text-sm text-nebula-mist">From creative brief to final delivery - all in one place, with full visibility.</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Left Card */}
          <div className="backdrop-blur-md bg-nebula-surface/50 border border-nebula-steel/30 rounded-3xl p-6 lg:p-8">
            <div className="text-xs sm:text-sm font-semibold text-slate-50 mb-6">Production Cadence &amp; Editorial Calendar</div>
            
            <div className="w-full overflow-x-auto mb-8">
              <table className="w-full text-left border-collapse min-w-[500px]">
                <thead>
                  <tr className="border-b border-nebula-steel/30 text-[10px] uppercase font-bold text-nebula-mist">
                    <th className="pb-3 px-2 font-bold w-[35%]">Deliverable</th>
                    <th className="pb-3 px-2 font-bold w-[25%]">Status</th>
                    <th className="pb-3 px-2 font-bold w-[25%]">Owner</th>
                    <th className="pb-3 px-2 font-bold w-[15%]">Due</th>
                  </tr>
                </thead>
                <tbody className="text-xs">
                  <tr className="bg-nebula-navy border border-nebula-steel/30 transition-colors">
                    <td className="py-4 px-3 font-semibold text-slate-50 rounded-l-lg border-y border-l border-nebula-steel/30">Reel 01 &bull; Teaser</td>
                    <td className="py-4 px-2 border-y border-nebula-steel/30">
                      <span className="inline-flex items-center gap-1.5 bg-nebula-glow/15 text-nebula-glow px-2 py-0.5 rounded text-[10px] font-bold border border-nebula-glow/20">
                        <div className="size-1.5 rounded-full bg-nebula-glow" /> Published
                      </span>
                    </td>
                    <td className="py-4 px-2 text-xs text-nebula-mist border-y border-nebula-steel/30">Video Editor</td>
                    <td className="py-4 px-3 text-xs text-nebula-mist font-medium rounded-r-lg border-y border-r border-nebula-steel/30">Apr 22</td>
                  </tr>
                  <tr><td colSpan={4} className="h-2"></td></tr>
                  <tr className="bg-nebula-navy border border-nebula-steel/30 transition-colors">
                    <td className="py-4 px-3 font-semibold text-slate-50 rounded-l-lg border-y border-l border-nebula-steel/30">Reel 02 &bull; Founder Story</td>
                    <td className="py-4 px-2 border-y border-nebula-steel/30">
                      <span className="inline-flex items-center gap-1.5 bg-nebula-sand/15 text-nebula-sand px-2 py-0.5 rounded text-[10px] font-bold border border-nebula-sand/20">
                        <div className="size-1.5 rounded-full bg-nebula-sand" /> Client Review
                      </span>
                    </td>
                    <td className="py-4 px-2 text-xs text-nebula-mist border-y border-nebula-steel/30">SMM Lead</td>
                    <td className="py-4 px-3 text-xs text-nebula-mist font-medium rounded-r-lg border-y border-r border-nebula-steel/30">Apr 24</td>
                  </tr>
                  <tr><td colSpan={4} className="h-2"></td></tr>
                  <tr className="bg-nebula-navy border border-nebula-steel/30 transition-colors">
                    <td className="py-4 px-3 font-semibold text-slate-50 rounded-l-lg border-y border-l border-nebula-steel/30">Carousel 03 &bull; Specs</td>
                    <td className="py-4 px-2 border-y border-nebula-steel/30">
                      <span className="inline-flex items-center gap-1.5 bg-nebula-glow/15 text-nebula-glow px-2 py-0.5 rounded text-[10px] font-bold border border-nebula-glow/20">
                        <div className="size-1.5 rounded-full bg-nebula-glow" /> In Production
                      </span>
                    </td>
                    <td className="py-4 px-2 text-xs text-nebula-mist border-y border-nebula-steel/30">Lead Designer</td>
                    <td className="py-4 px-3 text-xs text-nebula-mist font-medium rounded-r-lg border-y border-r border-nebula-steel/30">Apr 26</td>
                  </tr>
                  <tr><td colSpan={4} className="h-2"></td></tr>
                  <tr className="bg-nebula-navy border border-nebula-steel/30 transition-colors">
                    <td className="py-4 px-3 font-semibold text-slate-50 rounded-l-lg border-y border-l border-nebula-steel/30">Reel 04 &bull; Hook Revision</td>
                    <td className="py-4 px-2 border-y border-nebula-steel/30">
                      <span className="inline-flex items-center gap-1.5 bg-nebula-sand/15 text-nebula-sand px-2 py-0.5 rounded text-[10px] font-bold border border-nebula-sand/20">
                        <div className="size-1.5 rounded-full bg-nebula-sand" /> In Revision
                      </span>
                    </td>
                    <td className="py-4 px-2 text-xs text-nebula-mist border-y border-nebula-steel/30">Video Editor</td>
                    <td className="py-4 px-3 text-xs text-nebula-mist font-medium rounded-r-lg border-y border-r border-nebula-steel/30">Apr 28</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div className="bg-nebula-navy rounded-xl border border-nebula-steel/30 p-5">
              <div className="text-xs font-semibold text-slate-50 mb-4">Bottleneck Radar</div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="bg-nebula-void border border-nebula-steel/30 rounded-lg p-3">
                  <div className="text-[10px] text-nebula-mist mb-1">Design Queue</div>
                  <div className="text-xs font-semibold text-slate-50 flex items-center gap-1.5">
                    <span className="size-1.5 rounded-full bg-nebula-sand" /> 2 items &bull; High
                  </div>
                </div>
                <div className="bg-nebula-void border border-nebula-steel/30 rounded-lg p-3">
                  <div className="text-[10px] text-nebula-mist mb-1">Development</div>
                  <div className="text-xs font-semibold text-slate-50 flex items-center gap-1.5">
                    <span className="size-1.5 rounded-full bg-nebula-sand" /> 3 items &bull; Medium
                  </div>
                </div>
                <div className="bg-nebula-void border border-nebula-steel/30 rounded-lg p-3">
                  <div className="text-[10px] text-nebula-mist mb-1">Client Feedback</div>
                  <div className="text-xs font-semibold text-slate-50 flex items-center gap-1.5">
                    <span className="size-1.5 rounded-full bg-nebula-glow" /> 1 item &bull; Low
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Right Card */}
          <div className="backdrop-blur-md bg-nebula-surface/50 border border-nebula-steel/30 rounded-3xl p-6 lg:p-8 flex flex-col">
            <div className="text-xs sm:text-sm font-semibold text-slate-50 w-full text-left mb-2">Velox Studio Client Portal</div>
            <div className="text-xs text-nebula-mist mb-6 font-medium">Summer DTC Campaign Reel #04</div>
            
            <div className="w-full aspect-video bg-nebula-void rounded-xl border border-nebula-steel/30 mb-6 flex flex-col justify-end relative overflow-hidden group">
              <img src="https://images.unsplash.com/photo-1492691527719-9d1e07e534b4?auto=format&fit=crop&w=800&q=80" className="absolute inset-0 w-full h-full object-cover opacity-60" alt="Cinematic Video Mockup" />
              <div className="absolute inset-0 bg-black/40 z-10" />
              <div className="absolute inset-0 flex items-center justify-center z-20">
                <div className="w-12 h-12 rounded-full bg-black/60 border border-white/50 flex items-center justify-center text-white shadow-lg cursor-pointer hover:scale-110 transition-transform">
                  <Play className="size-5 fill-white ml-0.5" />
                </div>
              </div>
              <div className="w-full px-4 pb-3 pt-6 bg-gradient-to-t from-black/80 to-transparent z-20 flex items-center justify-between">
                <div className="flex items-center gap-3 w-full">
                  <div className="text-[10px] font-bold text-slate-50 shrink-0">0:00 / 2:34</div>
                  <div className="flex-1 h-1 bg-white/20 rounded-full overflow-hidden relative cursor-pointer">
                    <div className="absolute left-0 top-0 bottom-0 w-1/3 bg-nebula-glow rounded-full" />
                  </div>
                  <Volume2 className="size-3.5 text-slate-50 shrink-0 cursor-pointer" />
                  <Maximize className="size-3.5 text-slate-50 shrink-0 cursor-pointer" />
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-2">
                {approvalStatus === 'pending' && (
                  <>
                    <div className="size-2 rounded-full bg-nebula-sand animate-pulse" />
                    <span className="text-xs font-bold text-nebula-sand">● Awaiting Client Approval</span>
                  </>
                )}
                {approvalStatus === 'approved' && (
                  <span className="text-xs font-bold text-nebula-glow">✓ Approved (Queued for Delivery)</span>
                )}
                {approvalStatus === 'revision' && (
                  <span className="text-xs font-bold text-nebula-glow"> Revision Ticket Created (#231)</span>
                )}
              </div>
              {approvalStatus !== 'pending' && (
                <button onClick={() => setApprovalStatus('pending')} className="text-[10px] text-nebula-mist hover:text-slate-50 underline underline-offset-2">Reset</button>
              )}
            </div>
            
            {approvalStatus === 'pending' && (
              <div className="flex flex-col sm:flex-row w-full gap-3 mb-5">
                <button onClick={() => setApprovalStatus('approved')} className="flex-1 bg-nebula-periwinkle hover:bg-nebula-periwinkle text-nebula-void font-semibold transition-all shadow-sm hover:shadow-[0_0_20px_rgba(188,204,230,0.25)] text-xs px-4 py-2.5 rounded-lg shadow-sm transition-colors flex items-center justify-center gap-2">
                  <CheckCircle2 className="size-4" /> Approve Asset
                </button>
                <button onClick={() => setApprovalStatus('revision')} className="flex-1 bg-nebula-navy border border-nebula-steel/30 text-slate-50 font-bold text-xs px-4 py-2.5 rounded-lg hover:bg-nebula-surface transition-colors flex items-center justify-center gap-2">
                  <X className="size-4" /> Request Revision
                </button>
              </div>
            )}

            <div className="p-3 bg-nebula-navy border border-nebula-steel/30 rounded-xl flex items-start gap-3">
              <AlertCircle className="size-4 text-nebula-mist shrink-0 mt-0.5" />
              <p className="text-[10px] text-nebula-mist leading-relaxed">
                Revision trigger automatically creates Ticket #108 and alerts Motion Lead without WhatsApp chasing.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* - Module 03 - */}
      <section className="max-w-[1240px] mx-auto px-6 py-12 sm:py-16">
        <div className="inline-flex items-center gap-2 rounded-full backdrop-blur-md bg-nebula-surface/50 border border-nebula-steel/30 px-3 py-1 text-[10px] font-bold tracking-widest uppercase text-nebula-mist mb-6">
          03 &nbsp; REAL-TIME PROFITABILITY &amp; CASH FLOW
        </div>
        
        <div className="mb-8">
          <h2 className="text-2xl sm:text-3xl font-black text-slate-50 mb-2 tracking-tight">Financial Telemetry &amp; Margin Recovery</h2>
          <p className="text-sm text-nebula-mist">See your true margins, manage cash flow, and get paid faster.</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Left Card */}
          <div className="backdrop-blur-md bg-nebula-surface/50 border border-nebula-steel/30 rounded-3xl p-6 lg:p-8">
            <div className="text-xs sm:text-sm font-semibold text-slate-50 mb-2">TechCorp Series B &bull; Monthly Creative Retainer</div>
            <div className="text-xs text-nebula-mist mb-8">Balance Sheet &amp; Contribution</div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-8 mb-8">
              <div className="space-y-4">
                <div className="flex justify-between items-center text-xs pb-3 border-b border-nebula-steel/30">
                  <span className="text-nebula-mist font-medium">Retainer Revenue</span>
                  <span className="text-nebula-glow font-semibold">+₹80,000</span>
                </div>
                <div className="flex justify-between items-center text-xs pb-3 border-b border-nebula-steel/30">
                  <span className="text-nebula-mist font-medium">Dedicated Team Cost</span>
                  <span className="text-nebula-sand font-semibold">-₹28,000</span>
                </div>
                <div className="flex justify-between items-center text-xs pb-3 border-b border-nebula-steel/30">
                  <span className="text-nebula-mist font-medium">Tooling &amp; Production</span>
                  <span className="text-nebula-sand font-semibold">-₹12,000</span>
                </div>
                <div className="flex justify-between items-center text-xs pb-3 border-b border-nebula-steel/30">
                  <span className="text-nebula-mist font-medium">Agency overhead</span>
                  <span className="text-nebula-sand font-semibold">-₹7,000</span>
                </div>
              </div>

              <div className="bg-nebula-navy border border-nebula-steel/30 rounded-xl p-4 flex flex-col justify-between">
                <div className="text-[10px] text-nebula-mist font-bold uppercase">Revenue Breakdown</div>
                <div className="flex items-end justify-between h-32 mt-4 px-1 sm:px-2">
                  <div className="w-12 sm:w-14 flex flex-col items-center justify-end h-full gap-2">
                    <span className="text-[10px] sm:text-[11px] font-bold text-slate-50">60%</span>
                    <div className="w-6 sm:w-8 bg-nebula-glow rounded-t-sm h-[60%]" />
                    <span className="text-[10px] sm:text-[11px] text-nebula-mist text-center w-full">Creative</span>
                  </div>
                  <div className="w-12 sm:w-14 flex flex-col items-center justify-end h-full gap-2">
                    <span className="text-[10px] sm:text-[11px] font-bold text-slate-50">20%</span>
                    <div className="w-6 sm:w-8 bg-nebula-glow/70 rounded-t-sm h-[20%]" />
                    <span className="text-[10px] sm:text-[11px] text-nebula-mist text-center w-full">Production</span>
                  </div>
                  <div className="w-12 sm:w-14 flex flex-col items-center justify-end h-full gap-2">
                    <span className="text-[10px] sm:text-[11px] font-bold text-slate-50">12%</span>
                    <div className="w-6 sm:w-8 bg-nebula-glow/50 rounded-t-sm h-[12%]" />
                    <span className="text-[10px] sm:text-[11px] text-nebula-mist text-center w-full">Tools</span>
                  </div>
                  <div className="w-12 sm:w-14 flex flex-col items-center justify-end h-full gap-2">
                    <span className="text-[10px] sm:text-[11px] font-bold text-slate-50">8%</span>
                    <div className="w-6 sm:w-8 bg-nebula-glow/30 rounded-t-sm h-[8%]" />
                    <span className="text-[10px] sm:text-[11px] text-nebula-mist text-center w-full">Overhead</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between p-5 bg-nebula-navy border border-nebula-glow/40 rounded-xl">
              <div>
                <div className="text-[10px] text-nebula-glow font-bold uppercase mb-1">Project Contribution Margin</div>
                <div className="text-2xl font-black text-nebula-glow">₹33,000 <span className="text-sm font-bold opacity-80">(41.25%)</span></div>
              </div>
            </div>
          </div>

          {/* Right Card */}
          <div className="backdrop-blur-md bg-nebula-surface/50 border border-nebula-steel/30 rounded-3xl p-6 lg:p-8 flex flex-col">
            <div className="text-xs sm:text-sm font-semibold text-slate-50 mb-6">Cash Flow Engine &amp; Auto-Chase</div>
            
            <div className="space-y-3 mb-8">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-xl bg-nebula-navy border border-nebula-steel/30 gap-4">
                <div className="flex gap-6">
                  <div>
                    <div className="text-[10px] text-nebula-mist uppercase mb-1">Invoice</div>
                    <div className="text-xs sm:text-sm font-semibold text-slate-50">#1024</div>
                  </div>
                  <div>
                    <div className="text-[10px] text-nebula-mist uppercase mb-1">Client</div>
                    <div className="text-xs sm:text-sm font-semibold text-slate-50">D2C Apparel Brand</div>
                  </div>
                </div>
                <div className="flex items-center justify-between sm:justify-end gap-4 sm:w-[60%]">
                  <div className="text-xs sm:text-sm font-semibold text-slate-50 whitespace-nowrap">₹120,000</div>
                  {inv1 === 'Paid ✓' ? (
                    <span className="inline-flex items-center gap-1.5 bg-nebula-glow/15 text-nebula-glow px-2 py-1 rounded text-[10px] font-bold border border-nebula-glow/20 shrink-0">
                      {inv1}
                    </span>
                  ) : (
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] text-nebula-sand font-bold shrink-0">{inv1}</span>
                      <button onClick={() => setInv1('Paid ✓')} className="bg-nebula-periwinkle hover:bg-nebula-periwinkle text-nebula-void text-[10px] font-semibold transition-all shadow-sm hover:shadow-[0_0_20px_rgba(188,204,230,0.25)] px-2 py-1 rounded transition-colors shrink-0">Resolve</button>
                      <button onClick={() => setInv1('Reminder Sent ')} className="bg-nebula-glow hover:bg-white text-nebula-void text-[10px] font-bold px-2 py-1 rounded transition-colors shrink-0">Chase</button>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-xl bg-nebula-navy border border-nebula-steel/30 gap-4">
                <div className="flex gap-6">
                  <div>
                    <div className="text-[10px] text-nebula-mist uppercase mb-1">Invoice</div>
                    <div className="text-xs sm:text-sm font-semibold text-slate-50">#1025</div>
                  </div>
                  <div>
                    <div className="text-[10px] text-nebula-mist uppercase mb-1">Client</div>
                    <div className="text-xs sm:text-sm font-semibold text-slate-50">Global Fintech</div>
                  </div>
                </div>
                <div className="flex items-center justify-between sm:justify-end gap-4 sm:w-[60%]">
                  <div className="text-xs sm:text-sm font-semibold text-slate-50 whitespace-nowrap">₹80,000</div>
                  {inv2 === 'Paid ✓' ? (
                    <span className="inline-flex items-center gap-1.5 bg-nebula-glow/15 text-nebula-glow px-2 py-1 rounded text-[10px] font-bold border border-nebula-glow/20 shrink-0">
                      {inv2}
                    </span>
                  ) : (
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] text-nebula-sand font-bold shrink-0">{inv2}</span>
                      <button onClick={() => setInv2('Paid ✓')} className="bg-nebula-periwinkle hover:bg-nebula-periwinkle text-nebula-void text-[10px] font-semibold transition-all shadow-sm hover:shadow-[0_0_20px_rgba(188,204,230,0.25)] px-2 py-1 rounded transition-colors shrink-0">Resolve</button>
                      <button onClick={() => setInv2('Reminder Sent ')} className="bg-nebula-glow hover:bg-white text-nebula-void text-[10px] font-bold px-2 py-1 rounded transition-colors shrink-0">Chase</button>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="mt-auto p-5 bg-nebula-navy border border-nebula-steel/30 rounded-xl flex items-center gap-4">
              <div className="size-12 rounded-full bg-nebula-void border border-nebula-steel/30 flex items-center justify-center shrink-0">
                <TrendingUp className="size-5 text-nebula-glow" />
              </div>
              <div>
                <div className="text-lg font-black text-slate-50">₹2.1L <span className="text-xs text-nebula-mist font-medium">In Collections Pipeline</span></div>
                <div className="text-[10px] text-nebula-mist mt-1">Automated payment follow-ups.</div>
              </div>
            </div>
            
          </div>
        </div>
      </section>
      
    </div>
  );
}

