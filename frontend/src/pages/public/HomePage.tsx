import { useState } from "react";
import { Link } from "react-router";
import { CheckCircle2, AlertCircle, ArrowRight } from "lucide-react";

export function HomePage() {
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
      <section className="max-w-[1240px] mx-auto px-6 py-16 lg:py-24">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-8 items-start">
          
          {/* Left Hero Column */}
          <div className="pr-4 lg:pr-12">
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
                <img src="https://images.unsplash.com/photo-1517838277536-f5f99be501cd?auto=format&fit=crop&w=800&q=80" alt="Athlete" className="w-full h-full object-cover block" />
                <div className="absolute bottom-3 left-3 bg-black/60 px-2.5 py-1 rounded text-[11px] text-white">
                  Reel &middot; 9:16
                </div>
              </div>
              <div className="relative aspect-[16/11] rounded-2xl border border-[#222F44] overflow-hidden bg-[#121926]">
                <img src="https://images.unsplash.com/photo-1509440159596-0249088772ff?auto=format&fit=crop&w=800&q=80" alt="Sourdough" className="w-full h-full object-cover block" />
              </div>
            </div>

            {/* Col 2 */}
            <div className="flex flex-col gap-4 pt-8">
              <div className="relative aspect-[16/11] rounded-2xl border border-[#222F44] overflow-hidden bg-[#121926]">
                <img src="https://images.unsplash.com/photo-1600210492486-724fe5c67fb0?auto=format&fit=crop&w=800&q=80" alt="Interior" className="w-full h-full object-cover block" />
              </div>
              <div className="relative aspect-[9/16] rounded-2xl border border-[#222F44] overflow-hidden bg-[#121926]">
                <img src="https://images.unsplash.com/photo-1509198397868-475647b2a1e5?auto=format&fit=crop&w=800&q=80" alt="Reel" className="w-full h-full object-cover block" />
                <div className="absolute bottom-3 left-3 bg-black/60 px-2.5 py-1 rounded text-[11px] text-white">
                  Reel &middot; 9:16
                </div>
              </div>
            </div>

            {/* Col 3 */}
            <div className="flex flex-col gap-4">
              <div className="relative aspect-[9/14] rounded-2xl border border-[#222F44] overflow-hidden bg-[#121926]">
                <img src="https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?auto=format&fit=crop&w=800&q=80" alt="Model" className="w-full h-full object-cover block" />
              </div>
              <div className="relative aspect-[4/5] rounded-2xl border border-[#222F44] overflow-hidden bg-[#121926]">
                <img src="https://images.unsplash.com/photo-1608248543803-ba4f8c70ae0b?auto=format&fit=crop&w=800&q=80" alt="Serum" className="w-full h-full object-cover block" />
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* 2. The Studio Ledger Section */}
      <section className="bg-[#0B111C] py-20 lg:py-24 border-y border-[#222F44]">
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

          <div className="max-w-4xl mx-auto bg-[#161F2D] border border-[#2A3446] rounded-2xl overflow-hidden shadow-2xl">
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
                      row.status === "Approved" ? "bg-[#050810] border border-[#10B981]/50 text-[#10B981]" : 
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
      <section className="max-w-[1240px] mx-auto px-6 pt-20">
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
      <section className="max-w-[1240px] mx-auto px-6 pb-20 lg:pb-24 pt-12">
        <div className="relative">
          <div className="absolute -top-4 left-6 bg-[#0A0F18] border border-[#7FA0D6]/50 text-[#7FA0D6] text-[10px] font-bold px-4 py-1.5 rounded-full z-10 shadow-lg tracking-wider">
            TRY IT — THIS PANEL WORKS
          </div>
          
          <div className="bg-[#161F2D] border border-[#2A3446] rounded-2xl p-6 shadow-2xl relative overflow-hidden">
            <div className="flex items-center justify-between pb-4 border-b border-[#2A3446]">
              <div className="font-black text-[#F8FAFC] text-lg">Batch 04</div>
              <div className="text-[11px] font-bold text-[#97A0B3]">
                {approvedCount} of 3 approved &bull; <span className="text-[#10B981]">On track: 2 days early</span>
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
                      {asset.type.replace(' ', ' • ')}
                    </div>
                    <div className="text-sm font-bold text-[#F8FAFC] mb-4 flex-1">{asset.name}</div>
                    
                    <div className="flex items-center justify-between mt-auto">
                      {asset.status === "awaiting" && (
                        <div className="flex items-center gap-2 w-full">
                          <button 
                            onClick={() => updateStatus(asset.id, "approved")}
                            className="flex-1 bg-[#10B981] hover:bg-[#059669] text-[#050810] font-bold text-xs py-2 rounded-full transition-colors flex items-center justify-center gap-1.5"
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
                          <div className="inline-flex items-center gap-1.5 text-[#10B981] text-[10px] font-bold">
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

      {/* 5. Pricing Cards */}
      <section className="bg-[#050810] py-16">
        <div className="max-w-5xl mx-auto px-6">
          <div className="text-center mb-12">
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight text-[#F8FAFC] mb-4">
              Priced per month. <span className="text-[#7FA0D6]">Measured per asset.</span>
            </h2>
            <p className="text-sm text-[#97A0B3] max-w-xl mx-auto leading-relaxed">
              The more you commit, the less each piece costs. No setup fee, pause or cancel any month.
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto my-16">
            {/* Starter */}
            <div className="bg-[#161F2D] border border-[#2A3446] rounded-2xl p-6 flex flex-col justify-between">
              <div>
                <div className="text-xs font-bold text-[#7FA0D6] uppercase tracking-wider mb-2">Starter</div>
                <div className="text-3xl font-black text-[#F8FAFC] mb-1">₹25,000<span className="text-sm font-medium text-[#97A0B3]">/mo</span></div>
                <div className="text-[11px] text-[#97A0B3] mb-6">(₹1,136/asset)</div>
                
                <ul className="space-y-3 mb-8 text-sm text-[#F8FAFC]">
                  <li className="flex items-center gap-2"><CheckCircle2 className="size-4 text-[#7FA0D6]" /> 22 assets</li>
                  <li className="flex items-center gap-2"><CheckCircle2 className="size-4 text-[#7FA0D6]" /> 1 revision round</li>
                  <li className="flex items-center gap-2"><CheckCircle2 className="size-4 text-[#7FA0D6]" /> 3 business-day SLA</li>
                </ul>
              </div>
              <Link to="/signup?intent=starter" className="w-full text-center bg-transparent border border-[#2A3446] hover:bg-[#2A3446] text-[#F8FAFC] font-bold text-xs py-3 rounded-full transition-colors mt-8">
                Start with a free sample
              </Link>
            </div>

            {/* Growth */}
            <div className="bg-[#121926] border border-[#7FA0D6] rounded-2xl p-6 flex flex-col justify-between relative shadow-[0_0_20px_rgba(127,160,214,0.1)]">
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-[#0A0F18] border border-[#7FA0D6] text-[#7FA0D6] text-[10px] font-bold px-3 py-1 rounded-full uppercase tracking-wider whitespace-nowrap">
                The on-time guarantee
              </div>
              <div>
                <div className="text-xs font-bold text-[#7FA0D6] uppercase tracking-wider mb-2 mt-2">Growth</div>
                <div className="text-3xl font-black text-[#F8FAFC] mb-1">₹50,000<span className="text-sm font-medium text-[#97A0B3]">/mo</span></div>
                <div className="text-[11px] text-[#97A0B3] mb-6">(₹1,042/asset)</div>
                
                <ul className="space-y-3 mb-8 text-sm text-[#F8FAFC]">
                  <li className="flex items-center gap-2"><CheckCircle2 className="size-4 text-[#7FA0D6]" /> 48 assets</li>
                  <li className="flex items-center gap-2"><CheckCircle2 className="size-4 text-[#7FA0D6]" /> 2 revision rounds</li>
                  <li className="flex items-center gap-2"><CheckCircle2 className="size-4 text-[#7FA0D6]" /> 2 business-day SLA</li>
                </ul>
              </div>
              <Link to="/signup?intent=growth" className="w-full text-center bg-[#BCCCE6] hover:bg-white text-[#050810] font-bold text-xs py-3 rounded-full transition-colors mt-8">
                Start with a free sample
              </Link>
            </div>

            {/* Scale */}
            <div className="bg-[#161F2D] border border-[#2A3446] rounded-2xl p-6 flex flex-col justify-between">
              <div>
                <div className="text-xs font-bold text-[#7FA0D6] uppercase tracking-wider mb-2">Scale</div>
                <div className="text-3xl font-black text-[#F8FAFC] mb-1">₹95,000<span className="text-sm font-medium text-[#97A0B3]">/mo</span></div>
                <div className="text-[11px] text-[#97A0B3] mb-6">(₹990/asset)</div>
                
                <ul className="space-y-3 mb-8 text-sm text-[#F8FAFC]">
                  <li className="flex items-center gap-2"><CheckCircle2 className="size-4 text-[#7FA0D6]" /> 96 assets</li>
                  <li className="flex items-center gap-2"><CheckCircle2 className="size-4 text-[#7FA0D6]" /> 3 revision rounds</li>
                  <li className="flex items-center gap-2"><CheckCircle2 className="size-4 text-[#7FA0D6]" /> 24-hour priority SLA</li>
                </ul>
              </div>
              <Link to="/signup?intent=scale" className="w-full text-center bg-transparent border border-[#2A3446] hover:bg-[#2A3446] text-[#F8FAFC] font-bold text-xs py-3 rounded-full transition-colors mt-8">
                Start with a free sample
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* 6. "Try Us Before You Pay Us" Lead Capture Section */}
      <section className="bg-[#0B111C] py-20 lg:py-24 border-y border-[#222F44]">
        <div className="max-w-3xl mx-auto px-6 text-center">
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight text-[#F8FAFC] mb-5">
            Try us before you pay us.
          </h2>
          <p className="text-sm text-[#97A0B3] leading-relaxed mb-10 max-w-xl mx-auto">
            Drop your Instagram handle and email below. We'll send you a custom sample batch of reels and carousels for your brand, completely free. No credit card required.
          </p>
          
          <form 
            onSubmit={(e) => {
              e.preventDefault();
              alert("Sample batch request submitted!");
            }} 
            className="flex flex-col sm:flex-row items-center justify-center gap-4 max-w-2xl mx-auto"
          >
            <input 
              type="text" 
              required
              placeholder="Instagram handle (@yourbrand)" 
              className="w-full sm:w-auto flex-1 bg-[#0A0F18] border border-[#2A3446] rounded-xl px-5 py-3.5 text-sm text-[#F8FAFC] placeholder:text-[#97A0B3] focus:outline-none focus:border-[#7FA0D6] transition-colors"
            />
            <input 
              type="email" 
              required
              placeholder="Work email (you@brand.com)" 
              className="w-full sm:w-auto flex-1 bg-[#0A0F18] border border-[#2A3446] rounded-xl px-5 py-3.5 text-sm text-[#F8FAFC] placeholder:text-[#97A0B3] focus:outline-none focus:border-[#7FA0D6] transition-colors"
            />
            <button 
              type="submit" 
              className="w-full sm:w-auto bg-[#BCCCE6] hover:bg-white text-[#050810] font-bold text-sm px-6 py-3.5 rounded-xl transition-colors shrink-0 flex items-center justify-center gap-2"
            >
              Send me a sample batch <ArrowRight className="size-4" />
            </button>
          </form>
          <div className="text-[10px] font-semibold text-[#97A0B3] mt-6">
            Spots are limited to 10 brands per week to ensure quality.
          </div>
        </div>
      </section>

    </div>
  );
}
