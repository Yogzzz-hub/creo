import { useState } from "react";
import { Link, useNavigate } from "react-router";
import { CheckCircle2, AlertCircle, ArrowRight, Layers, User, BarChart2, Database, ChevronUp, ChevronDown, Zap } from "lucide-react";
import { PricingCards } from "../../components/public/PricingCards";


const faqs = [
  {
    category: "Migration & Tools",
    tag: "MIGRATION & WORKFLOW",
    question: "How does CREO replace our existing stack of WhatsApp, Drive, and spreadsheets?",
    icon: Layers,
    answer: "CREO doesn't just store files; it connects them directly to team capacity and client sign-offs. Your briefs connect to Figma/Adobe, client feedback triggers automated SLA revision tickets to motion leads, and retainer hours calculate contribution margins automatically—eliminating the 7 fragmented silos.",
    extra: (
      <div className="text-[#7FA0D6] bg-[#0A0F18] border border-[#2A3446] rounded-md px-3 py-1 text-xs inline-flex items-center gap-1.5 mt-3">
        <Zap className="size-3.5 fill-current" />
        Typical agency migration completed in under 48 hours.
      </div>
    )
  },
  {
    category: "Client Portals & Approvals",
    tag: "CLIENT PORTALS",
    question: "Do our clients need to create a CREO account to review and approve deliverables?",
    icon: User,
    answer: "No. Clients receive a secure, 1-click magic link. They can view the asset, leave timestamped comments, and approve directly from their browser without ever logging in."
  },
  {
    category: "Capacity & Workflows",
    tag: "CAPACITY & WORKLOAD",
    question: "How are team capacity meters and burnout alerts calculated?",
    icon: BarChart2,
    answer: "CREO monitors active projects, assigned revision tickets, and typical turnaround times. If a designer exceeds 85% capacity based on their historical velocity, the system automatically flags them and pauses new assignments."
  },
  {
    category: "Retainer Margins & Billing",
    tag: "RETAINER ECONOMICS",
    question: "How does the real-time contribution margin calculation work?",
    icon: Database,
    answer: "As your team logs hours or completes deliverables, CREO deducts their blended rate from the retainer's value in real-time, giving you an exact profit margin percentage before the month ends."
  }
];

export function HomePage() {
  const navigate = useNavigate();
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(0);
  const [assets, setAssets] = useState([
    { id: 1, name: "Autumn drop teaser", type: "Reel 9:16", status: "awaiting" },
    { id: 2, name: "The 36-hour dough", type: "Carousel 4 slides", status: "awaiting" },
    { id: 3, name: "Serum launch countdown", type: "Story 3 frames", status: "approved" },
  ]);

  const updateStatus = (id: number, status: string) => {
    setAssets(prev => prev.map(a => a.id === id ? { ...a, status } : a));
  };

  const approvedCount = assets.filter(a => a.status === "approved").length;

  return (
    <div className="w-full bg-[#050810] text-[#F8FAFC] min-h-screen font-sans selection:bg-[#7FA0D6]/30">
      
      {/* 1. Hero Section + Collage */}
      <section className="max-w-[1240px] mx-auto px-6 pt-6 pb-16 sm:pt-8 sm:pb-20 lg:pt-10 lg:pb-24">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-8 items-start">
          
          {/* Left Hero Column */}
          <div className="pr-4 lg:pr-12 relative z-10">
            <div className="absolute -top-32 -left-32 w-96 h-96 bg-[#7FA0D6]/5 rounded-full blur-[100px] pointer-events-none"></div>
            <div className="text-[11px] tracking-widest uppercase font-bold text-[#97A0B3] mb-5 flex items-center">
              <span className="text-[#38BDF8] mr-1.5 text-lg leading-none">&bull;</span> A CREATIVE POD FOR D2C BRANDS
            </div>
            
            <h1 className="text-5xl sm:text-6xl lg:text-7xl font-black tracking-tight leading-[0.98] sm:leading-[1.0] text-[#F8FAFC]">
              Content that <br />
              ships every week. <br />
              <span className="italic font-serif font-light text-[#F8FAFC] pr-2">Proof you can</span> <br />
              <span className="font-black text-[#F8FAFC]">check.</span>
            </h1>
            
            <p className="text-sm sm:text-base text-[#97A0B3] leading-relaxed max-w-md mt-6 mb-7">
              A dedicated lead, editor and designer learn your brand, then deliver reels, carousels and stories to a portal where you approve them in one click.
            </p>
            
            <div className="flex flex-col sm:flex-row items-center gap-4">
              <Link 
                to="/signup?intent=sample"
                className="bg-[#BCCCE6] text-[#050810] font-bold text-xs sm:text-sm px-6 py-3 rounded-full hover:bg-white transition w-full sm:w-auto text-center shadow-sm"
              >
                Get a free sample batch &rarr;
              </Link>
              <Link 
                to="/portal"
                className="bg-[#121926] border border-[#222F44] text-[#F8FAFC] text-xs sm:text-sm px-6 py-3 rounded-full hover:bg-[#1A2333] transition w-full sm:w-auto text-center shadow-sm"
              >
                Explore the portal first
              </Link>
            </div>
            
            <div className="text-[11px] font-semibold text-[#97A0B3] mt-8 border-t border-[#222F44] pt-6 flex flex-wrap items-center gap-x-4 gap-y-2">
              <span>Month-to-month</span>
              <span className="w-1 h-1 rounded-full bg-[#97A0B3]/50"></span>
              <span>First batch in 7 days</span>
              <span className="w-1 h-1 rounded-full bg-[#97A0B3]/50"></span>
              <span>Late batch? Next cycle credited</span>
            </div>
          </div>

          {/* Right 3-Column Asymmetric Media Collage */}
          <div className="grid grid-cols-3 gap-4 lg:h-[600px]">
            
            {/* Col 1 */}
            <div className="flex flex-col gap-4">
              <div className="relative aspect-[9/16] rounded-2xl border border-[#222F44] overflow-hidden bg-[#121926]">
                <img src="https://images.unsplash.com/photo-1517838277536-f5f99be501cd?auto=format&fit=crop&w=800&q=80" alt="Athlete" className="w-full h-full object-cover rounded-xl border border-[#2A3446]/40 transition-transform duration-500 hover:scale-[1.02] block" />
                <div className="absolute bottom-3 left-3 bg-black/60 px-2.5 py-1 rounded text-[11px] text-white">
                  Reel &middot; 9:16
                </div>
              </div>
              <div className="relative aspect-[16/11] rounded-2xl border border-[#222F44] overflow-hidden bg-[#121926]">
                <img src="https://images.unsplash.com/photo-1509440159596-0249088772ff?auto=format&fit=crop&w=800&q=80" alt="Sourdough" className="w-full h-full object-cover rounded-xl border border-[#2A3446]/40 transition-transform duration-500 hover:scale-[1.02] block" />
              </div>
            </div>

            {/* Col 2 */}
            <div className="flex flex-col gap-4 pt-8">
              <div className="relative aspect-[16/11] rounded-2xl border border-[#222F44] overflow-hidden bg-[#121926]">
                <img src="https://images.unsplash.com/photo-1600210492486-724fe5c67fb0?auto=format&fit=crop&w=800&q=80" alt="Interior" className="w-full h-full object-cover rounded-xl border border-[#2A3446]/40 transition-transform duration-500 hover:scale-[1.02] block" />
              </div>
              <div className="relative aspect-[9/16] rounded-2xl border border-[#222F44] overflow-hidden bg-[#121926]">
                <img src="https://images.unsplash.com/photo-1509198397868-475647b2a1e5?auto=format&fit=crop&w=800&q=80" alt="Reel" className="w-full h-full object-cover rounded-xl border border-[#2A3446]/40 transition-transform duration-500 hover:scale-[1.02] block" />
                <div className="absolute bottom-3 left-3 bg-black/60 px-2.5 py-1 rounded text-[11px] text-white">
                  Reel &middot; 9:16
                </div>
              </div>
            </div>

            {/* Col 3 */}
            <div className="flex flex-col gap-4">
              <div className="relative aspect-[9/14] rounded-2xl border border-[#222F44] overflow-hidden bg-[#121926]">
                <img src="https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?auto=format&fit=crop&w=800&q=80" alt="Model" className="w-full h-full object-cover rounded-xl border border-[#2A3446]/40 transition-transform duration-500 hover:scale-[1.02] block" />
              </div>
              <div className="relative aspect-[4/5] rounded-2xl border border-[#222F44] overflow-hidden bg-[#121926]">
                <img src="https://images.unsplash.com/photo-1608248543803-ba4f8c70ae0b?auto=format&fit=crop&w=800&q=80" alt="Serum" className="w-full h-full object-cover rounded-xl border border-[#2A3446]/40 transition-transform duration-500 hover:scale-[1.02] block" />
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* 2. The Studio Ledger Section */}
      <section className="bg-[#0B111C] py-12 sm:py-16 border-y border-[#222F44]">
        <div className="max-w-[1240px] mx-auto px-6">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <div className="text-[11px] tracking-widest uppercase font-bold text-[#7FA0D6] mb-4">
              THE STUDIO LEDGER
            </div>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight text-[#F8FAFC] mb-5">
              No star ratings. <span className="text-[#7FA0D6]">Just the clock.</span>
            </h2>
            <p className="text-sm text-[#97A0B3] leading-relaxed">
              Every batch we ship is timestamped from the SLA service. Brands stay anonymous, the turnaround doesn't.
            </p>
          </div>

          <div className="max-w-4xl mx-auto backdrop-blur-md bg-[#161F2D]/70 border border-[#2A3446]/60 rounded-2xl overflow-hidden shadow-2xl">
            <div className="grid grid-cols-4 bg-[#0A0F18] border-b border-[#2A3446] p-4 sm:p-5 items-center">
              <div className="text-xs font-bold text-[#F8FAFC] uppercase tracking-wider">Industry</div>
              <div className="text-xs font-bold text-[#F8FAFC] uppercase tracking-wider">Milestone</div>
              <div className="text-xs font-bold text-[#F8FAFC] uppercase tracking-wider">SLA Time</div>
              <div className="text-xs font-bold text-[#F8FAFC] uppercase tracking-wider text-right">Status</div>
            </div>
            
            <div className="divide-y divide-[#2A3446]">
              {[
                { industry: "Food & beverage", batch: "Batch 04", time: "4d 18h", status: "Approved" },
                { industry: "Skincare", batch: "Batch 12", time: "2d 02h", status: "Approved" },
                { industry: "Home & living", batch: "Batch 02", time: "3d 14h", status: "Revisions" },
                { industry: "Activewear", batch: "Batch 07", time: "4d 01h", status: "Approved" },
                { industry: "Mobility", batch: "Batch 01", time: "5d 00h", status: "Awaiting" }
              ].map((row, i) => (
                <div key={i} className="grid grid-cols-4 items-center p-4 sm:p-5 hover:bg-[#121926] transition-colors">
                  <div className="text-sm font-semibold text-[#F8FAFC]">{row.industry}</div>
                  <div className="text-sm text-[#97A0B3]">{row.batch}</div>
                  <div className="text-sm font-mono text-[#F8FAFC]">{row.time}</div>
                  <div className="text-right">
                    <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] sm:text-xs font-bold uppercase tracking-wider ${
                      row.status === "Approved" ? "bg-[#050810] border border-[#7FA0D6]/50 text-[#7FA0D6]" : 
                      row.status === "Revisions" ? "bg-[#050810] border border-[#D8BF9B]/50 text-[#D8BF9B]" : 
                      "bg-[#050810] border border-[#7FA0D6]/50 text-[#7FA0D6]"
                    }`}>
                      {row.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* 3. Horizontal 5-Step Process Rail */}
      <section className="max-w-[1240px] mx-auto px-6 pt-10 sm:pt-12">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4 py-8 border-b border-[#2A3446]/40">
          {[
            { step: "01", time: "Day 1: Brand DNA", desc: "Upload your assets, fonts, and guidelines." },
            { step: "02", time: "Days 2-3: Blueprint", desc: "We map out the content pillars and shot lists." },
            { step: "03", time: "Days 4-6: Production", desc: "Our pod designs and edits your deliverables." },
            { step: "04", time: "Day 7: Batch 01", desc: "You receive a secure link to approve or request changes." },
            { step: "05", time: "Weekly: Publish & repeat", desc: "Consistent output that scales with your growth." }
          ].map((item, i) => (
            <div key={i} className="flex flex-col group">
              <div className="w-7 h-7 rounded-full border border-[#2A3446] text-[#7FA0D6] flex items-center justify-center text-xs font-bold mb-2 group-hover:border-[#7FA0D6] transition-colors">
                {item.step}
              </div>
              <h4 className="text-sm font-bold text-[#F8FAFC] mb-1">{item.time}</h4>
              <p className="text-xs text-[#97A0B3]">{item.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* 4. Interactive Approval Portal Layout */}
      <section className="max-w-[1240px] mx-auto px-6 pb-12 sm:pb-16 pt-8">
        <div className="relative">
          <div className="absolute -top-4 left-6 bg-[#0A0F18] border border-[#7FA0D6]/50 text-[#7FA0D6] text-[10px] font-bold px-4 py-1.5 rounded-full z-10 shadow-lg tracking-wider">
            TRY IT â€” THIS PANEL WORKS
          </div>
          
          <div className="backdrop-blur-md bg-[#161F2D]/70 border border-[#2A3446]/60 rounded-2xl p-6 shadow-2xl relative overflow-hidden">
            <div className="flex items-center justify-between pb-4 border-b border-[#2A3446]">
              <div className="font-black text-[#F8FAFC] text-lg">Batch 04</div>
              <div className="text-[11px] font-bold text-[#97A0B3]">
                {approvedCount} of 3 approved &bull; <span className="text-[#7FA0D6]">On track: 2 days early</span>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mt-6">
              {assets.map((asset, idx) => (
                <div key={asset.id} className="bg-[#0A0F18] border border-[#2A3446] rounded-xl overflow-hidden flex flex-col">
                  {/* Thumbnail */}
                  <img 
                    src={idx === 0 ? "https://images.unsplash.com/photo-1517838277536-f5f99be501cd?auto=format&fit=crop&w=600&q=80" : idx === 1 ? "https://images.unsplash.com/photo-1509440159596-0249088772ff?auto=format&fit=crop&w=600&q=80" : "https://images.unsplash.com/photo-1608248543803-ba4f8c70ae0b?auto=format&fit=crop&w=600&q=80"}
                    alt={asset.name} 
                    className="h-44 object-cover w-full"
                  />
                  
                  <div className="p-4 flex-1 flex flex-col">
                    <div className="text-[10px] font-bold text-[#97A0B3] uppercase tracking-wider mb-1">
                      {asset.type.replace(' ', ' â€¢ ')}
                    </div>
                    <div className="text-sm font-bold text-[#F8FAFC] mb-4 flex-1">{asset.name}</div>
                    
                    <div className="flex items-center justify-between mt-auto">
                      {asset.status === "awaiting" && (
                        <div className="flex items-center gap-2 w-full">
                          <button 
                            onClick={() => updateStatus(asset.id, "approved")}
                            className="flex-1 bg-[#BCCCE6] text-[#050810] hover:bg-[#D5E1F2] font-semibold transition-all shadow-sm hover:shadow-[0_0_20px_rgba(188,204,230,0.25)] text-xs py-2 rounded-full flex items-center justify-center gap-1.5"
                          >
                            <CheckCircle2 className="size-3.5" /> Approve
                          </button>
                          <button 
                            onClick={() => updateStatus(asset.id, "revision")}
                            className="flex-1 bg-transparent border border-[#2A3446] hover:bg-[#222F44] text-[#F8FAFC] font-bold text-xs py-2 rounded-full transition-colors"
                          >
                            Change
                          </button>
                        </div>
                      )}
                      
                      {asset.status === "approved" && (
                        <div className="flex items-center justify-between w-full">
                          <div className="inline-flex items-center gap-1.5 text-[#7FA0D6] text-[10px] font-bold">
                            <CheckCircle2 className="size-3.5" /> Approved (queued)
                          </div>
                          <button 
                            onClick={() => updateStatus(asset.id, "awaiting")}
                            className="bg-[#161F2D] border border-[#2A3446] hover:bg-[#222F44] text-[#F8FAFC] text-[10px] font-bold px-3 py-1.5 rounded-full transition-colors"
                          >
                            Undo
                          </button>
                        </div>
                      )}

                      {asset.status === "revision" && (
                        <div className="flex items-center justify-between w-full">
                          <div className="inline-flex items-center gap-1.5 text-[#D8BF9B] text-[10px] font-bold">
                            <AlertCircle className="size-3.5" /> Revision requested
                          </div>
                          <button 
                            onClick={() => updateStatus(asset.id, "awaiting")}
                            className="bg-[#161F2D] border border-[#2A3446] hover:bg-[#222F44] text-[#F8FAFC] text-[10px] font-bold px-3 py-1.5 rounded-full transition-colors"
                          >
                            Undo
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* 5. Pricing Cards (Synchronized with Pricing Page) */}
      <section className="bg-[#050810] py-12 sm:py-16">
        <div className="max-w-[1240px] mx-auto px-6">
          <div className="text-center mb-10 max-w-2xl mx-auto">
            <div className="inline-flex items-center justify-center bg-[#121926] border border-[#222F44] text-[#7FA0D6] text-[11px] font-bold px-3 py-1 rounded-full mb-4">
              ⚡ PREDICTABLE AGENCY INFRASTRUCTURE
            </div>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight text-[#F8FAFC] mb-4">
              Simple, transparent pricing that <span className="text-[#7FA0D6]">scales with your agency.</span>
            </h2>
            <p className="text-sm text-[#97A0B3] leading-relaxed">
              No hidden seat taxes or per-project gouging. Choose the operating tier that matches your studio cadence and reclaim your true profit margins.
            </p>
          </div>
          
          <PricingCards />
        </div>
      </section>

      
      {/* 5.5 FAQ Section */}
      <section className="max-w-3xl mx-auto px-6 py-12 sm:py-16">
        <div className="text-center mb-12">
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight text-[#F8FAFC] mb-4">
            Common <span className="text-[#7FA0D6]">Questions</span>
          </h2>
        </div>
        <div className="space-y-4">
          {faqs.map((faq, idx) => {
            const isOpen = openFaqIndex === idx;
            const Icon = faq.icon;
            return (
              <div 
                key={idx} 
                className={`backdrop-blur-md bg-[#161F2D]/70 border ${isOpen ? 'border-[#7FA0D6] shadow-[0_0_20px_rgba(127,160,214,0.05)]' : 'border-[#2A3446]/60 hover:border-[#2A3446]'} rounded-2xl p-5 sm:p-6 transition-all`}
              >
                <div 
                  className="flex items-center justify-between w-full cursor-pointer"
                  onClick={() => setOpenFaqIndex(isOpen ? null : idx)}
                >
                  <div className="flex items-center gap-4 pr-4">
                    <div className="w-12 h-12 rounded-xl bg-[#0A0F18] border border-[#2A3446] flex items-center justify-center shrink-0 text-[#7FA0D6]">
                      <Icon className="size-5" />
                    </div>
                    <h3 className="text-sm sm:text-base font-bold text-[#F8FAFC] leading-snug">
                      {faq.question}
                    </h3>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <span className="hidden sm:inline-flex border border-[#2A3446] text-[#7FA0D6] text-[10px] font-bold px-3 py-1 rounded-full uppercase tracking-wider">
                      {faq.tag}
                    </span>
                    <div className={`w-8 h-8 rounded-full border border-[#2A3446] flex items-center justify-center shrink-0 transition-colors ${isOpen ? 'bg-[#0A0F18] text-[#F8FAFC]' : 'text-[#97A0B3] hover:bg-[#0A0F18]'}`}>
                      {isOpen ? <ChevronUp className="size-4" /> : <ChevronDown className="size-4" />}
                    </div>
                  </div>
                </div>
                
                {isOpen && (
                  <div className="pl-0 sm:pl-16 mt-4 animate-fade-in">
                    <p className="text-xs sm:text-sm text-[#97A0B3] leading-relaxed">
                      {faq.answer}
                    </p>
                    {faq.extra && faq.extra}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* 6. "Try Us Before You Pay Us" Lead Capture Section */}
      <section className="bg-[#0B111C] py-12 sm:py-16 border-y border-[#222F44]">
        <div className="max-w-3xl mx-auto px-6 text-center">
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight text-[#F8FAFC] mb-5">
            Try us before you pay us.
          </h2>
          <p className="text-sm text-[#97A0B3] leading-relaxed mb-10 max-w-xl mx-auto">
            Drop your Instagram handle and email below. We'll send you a custom sample batch of reels and carousels for your brand, completely free. No credit card required.
          </p>
          
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 max-w-2xl mx-auto backdrop-blur-md bg-[#161F2D]/30 p-2 rounded-2xl border border-[#2A3446]/40">
            <input 
              type="email" 
              placeholder="Enter work email for a sample deliverable..." 
              className="bg-[#0A0F18] border border-[#2A3446] text-[#F8FAFC] rounded-xl px-4 py-3 text-sm focus:border-[#7FA0D6] focus:outline-none w-full sm:w-80 transition-colors" 
            />
            <button 
              onClick={(e) => {
                if (localStorage.getItem('creo_auth') !== 'true') {
                  e.preventDefault();
                  alert("Please sign in to message the team.");
                  navigate("/login?redirect=contact");
                } else {
                  alert("Contact Modal Triggered");
                }
              }}
              className="w-full sm:w-auto bg-[#BCCCE6] text-[#050810] hover:bg-[#D5E1F2] font-semibold transition-all shadow-sm hover:shadow-[0_0_20px_rgba(188,204,230,0.25)] text-sm px-6 py-3 rounded-xl shrink-0 flex items-center justify-center gap-2"
            >
              Request Sample Batch <ArrowRight className="size-4" />
            </button>
          </div>
          <div className="text-[10px] font-semibold text-[#97A0B3] mt-6">
            No commitment. 48-hour pilot turnaround for qualified creative agencies.
          </div>
        </div>
      </section>

    </div>
  );
}
