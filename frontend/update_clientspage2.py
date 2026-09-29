import os

content = """import { useState } from "react";
import { 
  CheckCircle2, ChevronRight,
  Link, Clock, Unlock,
  Play, Code, Fingerprint, Zap
} from "lucide-react";

type BrandID = 'astra' | 'velox' | 'solis';
type ViewMode = 'public' | 'agency';

interface Deliverable {
  id: string;
  name: string;
  type: string;
  format: string;
  duration?: string;
  img: string;
  status: 'pending' | 'approved' | 'revision';
}

const BRANDS = {
  astra: {
    name: 'Astra Living',
    subtitle: 'D2C Lifestyle',
    badge: '3 Active Reviews',
    deliverables: [
      { id: 'a1', name: 'Reel 04 - Product Video', type: 'Video · 2.4 GB', format: '9:16 Vertical', duration: '0:15', img: 'https://images.unsplash.com/photo-1528271537-7addcf9eff27?auto=format&fit=crop&w=100&q=80', status: 'pending' },
      { id: 'a2', name: 'Carousel 03 - Brand Specs', type: 'Design · 15 MB', format: '4:5 Social', img: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&w=100&q=80', status: 'pending' },
      { id: 'a3', name: 'Reel 05 - Testimonial Video', type: 'Video · 1.8 GB', format: '9:16 Vertical', duration: '0:30', img: 'https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?auto=format&fit=crop&w=100&q=80', status: 'revision' }
    ] as Deliverable[],
    timeline: { brief: 'Mar 12', prod: 'Apr 02', review: 'Apr 08', delivery: 'Apr 12', progress: '65%' }
  },
  velox: {
    name: 'Velox Studio',
    subtitle: 'Motion & 3D',
    badge: '1 Final Approval',
    deliverables: [
      { id: 'v1', name: 'Brand Identity Motion', type: '3D Render · 4.2 GB', format: '4K Pro-Res', duration: '0:10', img: 'https://images.unsplash.com/photo-1550745165-9bc0b252726f?auto=format&fit=crop&w=100&q=80', status: 'pending' },
      { id: 'v2', name: 'Website Hero Loop', type: 'WebM · 8 MB', format: '16:9 Web', duration: '0:05', img: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=100&q=80', status: 'approved' }
    ] as Deliverable[],
    timeline: { brief: 'May 01', prod: 'May 10', review: 'May 14', delivery: 'May 15', progress: '90%' }
  },
  solis: {
    name: 'Solis Lab',
    subtitle: 'Fintech Brand',
    badge: 'All Cleared',
    deliverables: [
      { id: 's1', name: 'Q3 Campaign Master', type: 'Video · 5.1 GB', format: '4K Pro-Res', duration: '1:00', img: 'https://images.unsplash.com/photo-1563986768494-4dee2763ff3f?auto=format&fit=crop&w=100&q=80', status: 'approved' },
      { id: 's2', name: 'Social Cutdowns (x4)', type: 'Archive · 1.2 GB', format: 'Multi-format', img: 'https://images.unsplash.com/photo-1601597111158-2fceff292cdc?auto=format&fit=crop&w=100&q=80', status: 'approved' }
    ] as Deliverable[],
    timeline: { brief: 'Jan 10', prod: 'Feb 05', review: 'Feb 12', delivery: 'Feb 15', progress: '100%' }
  }
};

export function ClientsPage() {
  const [activeBrand, setActiveBrand] = useState<BrandID>('astra');
  const [viewMode, setViewMode] = useState<ViewMode>('public');
  
  // Using local state to simulate interactive approval
  const [localDeliverables, setLocalDeliverables] = useState(BRANDS.astra.deliverables);

  // Sync deliverables when brand changes
  const handleBrandChange = (brand: BrandID) => {
    setActiveBrand(brand);
    setLocalDeliverables(BRANDS[brand].deliverables);
  };

  const currentBrand = BRANDS[activeBrand];

  const handleApproveAll = () => {
    setLocalDeliverables(localDeliverables.map(d => ({ ...d, status: 'approved' })));
  };
  const handleRequestRevision = () => {
    setLocalDeliverables(localDeliverables.map(d => ({ ...d, status: 'revision' })));
  };

  return (
    <div className="w-full bg-[#050810] text-[#F8FAFC] min-h-screen pb-20 lg:pb-24 font-sans selection:bg-[#7FA0D6]/30 relative overflow-hidden">
      
      {/* Ambient Lighting */}
      <div className="absolute top-[40%] left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[500px] bg-[#7FA0D6]/10 rounded-full blur-[140px] pointer-events-none" />
      <div className="absolute inset-0 overflow-hidden pointer-events-none opacity-25">
        <svg className="absolute w-full h-full" xmlns="http://www.w3.org/2000/svg">
            <defs>
                <pattern id="grid-dots" width="40" height="40" patternUnits="userSpaceOnUse">
                    <circle cx="2" cy="2" r="1" fill="#2A3446" />
                </pattern>
                <pattern id="grid-lines" width="40" height="40" patternUnits="userSpaceOnUse">
                    <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#2A3446" strokeWidth="0.5" opacity="0.3"/>
                </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#grid-dots)" />
            <rect width="100%" height="100%" fill="url(#grid-lines)" />
        </svg>
      </div>
      
      {/* - Section 1: Hero - */}
      <section className="max-w-[1240px] mx-auto px-6 py-24 lg:py-32 relative text-center z-10">
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
      <section className="max-w-[1200px] mx-auto px-6 pb-12 relative z-10">
        
        <div className="flex flex-col lg:flex-row gap-6">
          {/* Left Rail (Brand Switcher) */}
          <div className="w-full lg:w-72 shrink-0 flex flex-col gap-3">
            {(Object.entries(BRANDS) as [BrandID, typeof BRANDS['astra']][]).map(([id, brand]) => (
              <button 
                key={id}
                onClick={() => handleBrandChange(id)}
                className={`p-4 rounded-xl text-left border transition-all ${
                  activeBrand === id 
                    ? 'bg-[#161F2D] border-[#7FA0D6]/40 shadow-[0_0_20px_rgba(127,160,214,0.1)]' 
                    : 'bg-[#0A0F18] border-[#2A3446]/40 hover:border-[#7FA0D6]/20 hover:bg-[#161F2D]/50'
                }`}
              >
                <div className="flex justify-between items-start mb-2">
                  <div className="font-bold text-[#F8FAFC]">{brand.name}</div>
                  <div className={`size-2 rounded-full ${brand.badge.includes('All') ? 'bg-[#7FA0D6]' : 'bg-[#D8BF9B]'}`} />
                </div>
                <div className="text-[11px] text-[#97A0B3] mb-3">{brand.subtitle}</div>
                <div className="inline-flex text-[10px] bg-[#050810] border border-[#2A3446] rounded px-2 py-1 text-[#F8FAFC]">
                  {brand.badge}
                </div>
              </button>
            ))}
          </div>

          {/* Main Console */}
          <div className="flex-1 backdrop-blur-md bg-[#161F2D]/50 border border-[#2A3446]/50 rounded-2xl p-6 sm:p-8 shadow-2xl relative overflow-hidden flex flex-col min-h-[500px]">
            
            {/* Top Bar (View Mode Switcher) */}
            <div className="flex justify-center mb-8">
              <div className="bg-[#050810] border border-[#2A3446]/50 rounded-full p-1 inline-flex">
                <button 
                  onClick={() => setViewMode('public')}
                  className={`text-xs font-semibold px-4 py-1.5 rounded-full transition-colors ${
                    viewMode === 'public' ? 'bg-[#2A3446] text-[#F8FAFC]' : 'text-[#97A0B3] hover:text-[#F8FAFC]'
                  }`}
                >
                  Client Magic Link (Public)
                </button>
                <button 
                  onClick={() => setViewMode('agency')}
                  className={`text-xs font-semibold px-4 py-1.5 rounded-full transition-colors ${
                    viewMode === 'agency' ? 'bg-[#2A3446] text-[#F8FAFC]' : 'text-[#97A0B3] hover:text-[#F8FAFC]'
                  }`}
                >
                  Agency Production Control
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between mb-8 pb-6 border-b border-[#2A3446]/50">
              <div>
                <div className="text-xl font-black text-[#F8FAFC]">{currentBrand.name}</div>
                <div className="text-xs text-[#97A0B3]">
                  {viewMode === 'public' ? 'Secure Review Portal' : 'Internal Ops Dashboard'}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <div className="text-2xl text-[#F8FAFC] leading-none mb-1">△</div>
                <div className="text-xs font-bold tracking-widest text-[#F8FAFC] uppercase">{currentBrand.name}</div>
                {viewMode === 'agency' && (
                  <div className="ml-4 flex flex-col gap-[3px]">
                    <div className="w-4 h-[1.5px] bg-[#7FA0D6]" />
                    <div className="w-4 h-[1.5px] bg-[#7FA0D6]" />
                    <div className="w-4 h-[1.5px] bg-[#7FA0D6]" />
                  </div>
                )}
              </div>
            </div>
            
            <div className="flex items-center justify-between mb-4">
              <div className="text-sm font-bold text-[#F8FAFC]">Deliverables for Review</div>
            </div>

            {/* Deliverables List */}
            <div className="space-y-3 mb-6">
              {localDeliverables.map((item) => (
                <div key={item.id} className="group flex flex-col sm:flex-row sm:items-center justify-between p-3 rounded-xl bg-[#0A0F18] border border-[#2A3446]/50 hover:border-[#7FA0D6]/30 transition-colors gap-4">
                  <div className="flex items-center gap-4">
                    <div className="relative w-20 h-14 rounded-lg overflow-hidden shrink-0 border border-[#2A3446]/50">
                      <img src={item.img} className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity" />
                      {item.duration && (
                        <>
                          <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/40">
                            <Play className="size-5 text-white fill-white" />
                          </div>
                          <div className="absolute bottom-1 right-1 bg-black/80 text-[8px] font-bold text-white px-1 py-0.5 rounded">
                            {item.duration}
                          </div>
                        </>
                      )}
                    </div>
                    <div>
                      <div className="text-xs font-bold text-[#F8FAFC] mb-1">{item.name}</div>
                      <div className="flex items-center gap-2 text-[10px]">
                        <span className="text-[#97A0B3]">{item.type}</span>
                        <span className="bg-[#161F2D] border border-[#2A3446]/50 px-1.5 py-0.5 rounded text-[#7FA0D6]">{item.format}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between sm:justify-end gap-3 w-full sm:w-auto">
                    {item.status === 'pending' && (
                      <span className="text-[10px] font-semibold text-[#D8BF9B] bg-[#D8BF9B]/10 px-2.5 py-1 rounded-full border border-[#D8BF9B]/20">● Awaiting Review</span>
                    )}
                    {item.status === 'approved' && (
                      <span className="text-[10px] font-semibold text-[#7FA0D6] bg-[#7FA0D6]/10 px-2.5 py-1 rounded-full border border-[#7FA0D6]/20">✓ Approved</span>
                    )}
                    {item.status === 'revision' && (
                      <span className="text-[10px] font-semibold text-[#97A0B3] bg-[#2A3446]/30 px-2.5 py-1 rounded-full border border-[#2A3446]/50">Revision Pending</span>
                    )}
                    
                    <button className="p-1.5 rounded hover:bg-[#2A3446]/50 text-[#97A0B3] hover:text-[#F8FAFC] transition-colors">
                      <ChevronRight className="size-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {viewMode === 'public' && localDeliverables.some(d => d.status === 'pending') && (
              <div className="flex items-center gap-3 mb-8">
                <button 
                  onClick={handleApproveAll}
                  className="flex-1 font-black text-xs py-2.5 rounded-full flex items-center justify-center gap-2 transition-all shadow-sm hover:shadow-[0_0_20px_rgba(188,204,230,0.25)] bg-[#BCCCE6] text-[#050810] hover:bg-[#D5E1F2]"
                >
                  <CheckCircle2 className="size-3" /> Approve All Deliverables
                </button>
                <button 
                  onClick={handleRequestRevision}
                  className="flex-1 font-medium text-xs py-2.5 rounded-full transition-colors bg-[#0A0F18] border border-[#2A3446] hover:border-[#7FA0D6]/50 text-[#97A0B3] hover:text-[#F8FAFC]"
                >
                  Request Revisions
                </button>
              </div>
            )}

            <div className="border-t border-[#2A3446]/50 pt-6 mt-auto">
              <div className="flex items-center justify-between mb-4">
                <div className="text-xs font-bold text-[#F8FAFC]">Retainer Timeline</div>
                <div className="text-[10px] font-bold text-[#7FA0D6] flex items-center gap-1 cursor-pointer">
                  {currentBrand.timeline.progress} Completed <ChevronRight className="size-3" />
                </div>
              </div>
              
              <div className="relative mt-2 px-2 pb-2">
                <div className="absolute left-3 right-3 top-2 h-0.5 bg-[#2A3446]/50" />
                <div className="absolute left-3 top-2 h-0.5 bg-[#7FA0D6] transition-all duration-500" style={{ width: currentBrand.timeline.progress }} />
                
                <div className="flex justify-between relative">
                  <div className="flex flex-col items-center gap-2">
                    <div className="size-4 rounded-full bg-[#7FA0D6] border-2 border-[#161F2D] z-10 flex items-center justify-center text-[#050810]">
                      <CheckCircle2 className="size-3" />
                    </div>
                    <div className="text-center">
                      <div className="text-[10px] font-bold text-[#F8FAFC]">Brief</div>
                      <div className="text-[9px] text-[#97A0B3]">{currentBrand.timeline.brief}</div>
                    </div>
                  </div>
                  <div className="flex flex-col items-center gap-2">
                    <div className={`size-4 rounded-full border-2 border-[#161F2D] z-10 flex items-center justify-center text-[#050810] ${parseInt(currentBrand.timeline.progress) >= 33 ? 'bg-[#7FA0D6]' : 'bg-[#050810] border-[#2A3446]'}`}>
                      {parseInt(currentBrand.timeline.progress) >= 33 && <CheckCircle2 className="size-3" />}
                    </div>
                    <div className="text-center">
                      <div className="text-[10px] font-bold text-[#F8FAFC]">Prod</div>
                      <div className="text-[9px] text-[#97A0B3]">{currentBrand.timeline.prod}</div>
                    </div>
                  </div>
                  <div className="flex flex-col items-center gap-2">
                    <div className={`size-4 rounded-full border-2 border-[#161F2D] z-10 flex items-center justify-center text-[#050810] ${parseInt(currentBrand.timeline.progress) >= 65 ? 'bg-[#7FA0D6] shadow-[0_0_10px_rgba(127,160,214,0.5)]' : 'bg-[#050810] border-[#2A3446]'}`}>
                      {parseInt(currentBrand.timeline.progress) > 65 && <CheckCircle2 className="size-3" />}
                    </div>
                    <div className="text-center">
                      <div className="text-[10px] font-bold text-[#F8FAFC]">Review</div>
                      <div className="text-[9px] text-[#97A0B3]">{currentBrand.timeline.review}</div>
                    </div>
                  </div>
                  <div className="flex flex-col items-center gap-2">
                    <div className={`size-4 rounded-full border-2 border-[#161F2D] z-10 ${parseInt(currentBrand.timeline.progress) >= 100 ? 'bg-[#7FA0D6]' : 'bg-[#050810] border-[#2A3446]'}`} />
                    <div className="text-center">
                      <div className="text-[10px] font-bold text-[#97A0B3]">Delivery</div>
                      <div className="text-[9px] text-[#97A0B3]">{currentBrand.timeline.delivery}</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

          </div>
        </div>

        {/* Interactive Operational Velocity Ribbon */}
        <div className="backdrop-blur-md bg-[#161F2D]/60 border border-[#2A3446]/50 rounded-xl py-5 px-8 mt-10 grid grid-cols-2 md:grid-cols-4 gap-6 text-center shadow-xl relative z-20">
          <div className="flex flex-col items-center">
            <div className="text-2xl font-black text-[#F8FAFC] mb-1">1.8h</div>
            <div className="text-[10px] font-bold text-[#7FA0D6] uppercase tracking-wider">Client Sign-Off Velocity</div>
          </div>
          <div className="flex flex-col items-center">
            <div className="text-2xl font-black text-[#F8FAFC] mb-1">1.1</div>
            <div className="text-[10px] font-bold text-[#7FA0D6] uppercase tracking-wider">Avg Revision Cycles</div>
          </div>
          <div className="flex flex-col items-center">
            <div className="text-2xl font-black text-[#F8FAFC] mb-1">100%</div>
            <div className="text-[10px] font-bold text-[#7FA0D6] uppercase tracking-wider">Zero-Password Magic Auth</div>
          </div>
          <div className="flex flex-col items-center">
            <div className="text-2xl font-black text-[#F8FAFC] mb-1">4K / HDR</div>
            <div className="text-[10px] font-bold text-[#7FA0D6] uppercase tracking-wider">Native Stream Pipeline</div>
          </div>
        </div>
      </section>

      {/* - Section 3: 3 Client Collaboration Protocols - */}
      <section className="max-w-[1240px] mx-auto px-6 py-24 relative z-10">
        <div className="mb-12 text-center">
          <div className="inline-flex items-center gap-2 rounded-full bg-[#161F2D] border border-[#2A3446]/50 text-[#7FA0D6] text-[11px] font-bold px-3 py-1 mb-6">
            COLLABORATION PROTOCOLS
          </div>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight text-[#F8FAFC]">
            Engineered for high-velocity approvals.
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="group backdrop-blur-md bg-[#161F2D]/40 border border-[#2A3446]/40 hover:border-[#7FA0D6]/40 transition-all duration-300 hover:bg-[#161F2D]/80 hover:-translate-y-1 rounded-xl p-6 flex flex-col relative overflow-hidden">
            <div className="w-12 h-12 rounded-xl bg-[#0A0F18] border border-[#2A3446]/50 flex items-center justify-center mb-6 z-10 transition-colors group-hover:border-[#7FA0D6]/40">
              <Link className="size-5 text-[#7FA0D6]" />
            </div>
            <h3 className="text-lg font-bold text-[#F8FAFC] mb-3 z-10">Zero-Login Friction</h3>
            <p className="text-sm text-[#97A0B3] leading-relaxed z-10 mb-6">
              Clients receive single-click, token-authenticated review links without needing account creation or password management.
            </p>
            {/* Hover snippet state */}
            <div className="mt-auto h-0 opacity-0 group-hover:h-[80px] group-hover:opacity-100 transition-all duration-300">
              <div className="bg-[#050810] border border-[#2A3446] rounded-lg p-3 flex items-start gap-3">
                <Fingerprint className="size-4 text-[#7FA0D6] shrink-0 mt-0.5" />
                <div className="text-[10px] font-mono text-[#97A0B3]">
                  <span className="text-[#F8FAFC]">verifyToken</span>(magic_link_hash) <br/>
                  &rarr; <span className="text-[#7FA0D6]">session.grantAccess()</span>
                </div>
              </div>
            </div>
          </div>

          <div className="group backdrop-blur-md bg-[#161F2D]/40 border border-[#2A3446]/40 hover:border-[#7FA0D6]/40 transition-all duration-300 hover:bg-[#161F2D]/80 hover:-translate-y-1 rounded-xl p-6 flex flex-col relative overflow-hidden">
            <div className="w-12 h-12 rounded-xl bg-[#0A0F18] border border-[#2A3446]/50 flex items-center justify-center mb-6 z-10 transition-colors group-hover:border-[#7FA0D6]/40">
              <Clock className="size-5 text-[#7FA0D6]" />
            </div>
            <h3 className="text-lg font-bold text-[#F8FAFC] mb-3 z-10">Contextual Precision</h3>
            <p className="text-sm text-[#97A0B3] leading-relaxed z-10 mb-6">
              Timestamped notes and deliverable versions synced directly back to production pods to eliminate messy email threads.
            </p>
             {/* Hover snippet state */}
             <div className="mt-auto h-0 opacity-0 group-hover:h-[80px] group-hover:opacity-100 transition-all duration-300">
              <div className="bg-[#050810] border border-[#2A3446] rounded-lg p-3 flex items-start gap-3">
                <Code className="size-4 text-[#7FA0D6] shrink-0 mt-0.5" />
                <div className="text-[10px] font-mono text-[#97A0B3]">
                  mutation {'{'} <br/>
                  &nbsp;&nbsp;addComment(frame: <span className="text-[#7FA0D6]">1402</span>, note: "...") <br/>
                  {'}'}
                </div>
              </div>
            </div>
          </div>

          <div className="group backdrop-blur-md bg-[#161F2D]/40 border border-[#2A3446]/40 hover:border-[#7FA0D6]/40 transition-all duration-300 hover:bg-[#161F2D]/80 hover:-translate-y-1 rounded-xl p-6 flex flex-col relative overflow-hidden">
            <div className="w-12 h-12 rounded-xl bg-[#0A0F18] border border-[#2A3446]/50 flex items-center justify-center mb-6 z-10 transition-colors group-hover:border-[#7FA0D6]/40">
              <Unlock className="size-5 text-[#7FA0D6]" />
            </div>
            <h3 className="text-lg font-bold text-[#F8FAFC] mb-3 z-10">Automated Sign-Off Gates</h3>
            <p className="text-sm text-[#97A0B3] leading-relaxed z-10 mb-6">
              Approvals immediately unlock final renders, update retainer milestones, and trigger billing events automatically.
            </p>
            {/* Hover snippet state */}
            <div className="mt-auto h-0 opacity-0 group-hover:h-[80px] group-hover:opacity-100 transition-all duration-300">
              <div className="bg-[#050810] border border-[#2A3446] rounded-lg p-3 flex items-start gap-3">
                <Zap className="size-4 text-[#7FA0D6] shrink-0 mt-0.5" />
                <div className="text-[10px] font-mono text-[#97A0B3]">
                  <span className="text-[#F8FAFC]">onDeliverableApproved</span>() <br/>
                  &rarr; unlockWatermark() <br/>
                  &rarr; syncInvoice()
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

    </div>
  );
}
"""

with open('src/pages/public/ClientsPage.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
