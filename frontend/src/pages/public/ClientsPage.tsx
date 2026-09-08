import { useState } from "react";
import { Link } from "react-router";
import { Star, CheckCircle2, ArrowRight, Sparkles } from "lucide-react";
import { ScrollReveal } from "../../components/ui/ScrollReveal";

const BRAND_PARTNERS = [
  {
    name: "Astra Living",
    category: "D2C Lifestyle & Apparel",
    industry: "lifestyle",
    color: "from-blue-600 to-indigo-700",
    image: "/assets/portfolio/scandi_living.jpg",
    metric: "+310% Reach Lift",
  },
  {
    name: "Urban Bakes",
    category: "Artisan Culinary Group",
    industry: "fnb",
    color: "from-amber-600 to-orange-700",
    image: "/assets/portfolio/sourdough_carousel.jpg",
    metric: "1,200+ Local Customers",
  },
  {
    name: "Zenith Fitness",
    category: "Performance Activewear",
    industry: "fitness",
    color: "from-rose-600 to-red-700",
    image: "/assets/portfolio/zenith_fitness.jpg",
    metric: "3.4x Membership ROAS",
  },
  {
    name: "Kaya Botanicals",
    category: "Clean Skincare & Beauty",
    industry: "beauty",
    color: "from-emerald-600 to-teal-700",
    image: "/assets/portfolio/botanical_serum.jpg",
    metric: "8.2% Ad CTR",
  },
  {
    name: "Pulse Mobility",
    category: "Smart Urban Commute",
    industry: "tech",
    color: "from-cyan-600 to-blue-700",
    image: "/assets/portfolio/pulse_mobility.jpg",
    metric: "50k+ Viral Shares",
  },
  {
    name: "Loom & Craft",
    category: "Handcrafted Luxury",
    industry: "lifestyle",
    color: "from-purple-600 to-violet-700",
    image: "/assets/portfolio/mulberry_silk.jpg",
    metric: "+40% Checkout Lift",
  },
];

const TESTIMONIALS = [
  {
    quote:
      "Creo transformed our social media from an operational chore into our highest ROI acquisition channel. The 9:16 cinematic reels consistently hit the Explore feed and drive qualified store traffic.",
    name: "Vikram Malhotra",
    title: "Founder & Creative Director",
    business: "Astra Living (Fashion & Lifestyle)",
    result: "+310% Reel reach & 3.2x ROAS in 60 days",
    avatar: "VM",
    industry: "lifestyle",
  },
  {
    quote:
      "The team truly understands our brand voice and culinary heritage. Every single video looks like it came out of a high-end commercial production house. Customer engagement is higher than it's ever been.",
    name: "Ananya Deshmukh",
    title: "Co-Founder & Head Baker",
    business: "Urban Bakes Artisan Group",
    result: "1,200+ new local followers in 3 weeks",
    avatar: "AD",
    industry: "fnb",
  },
  {
    quote:
      "We tried two traditional agencies before Creo. The difference? Creo delivers on time every single week, with zero micro-management required. Truly content production on autopilot.",
    name: "Dr. Rohan Singhania",
    title: "Founder & Lead Formulator",
    business: "Kaya Botanicals Wellness",
    result: "40% increase in checkout conversions",
    avatar: "RS",
    industry: "beauty",
  },
  {
    quote:
      "Having a dedicated brand director who understands high-performance fitness storytelling has been game-changing. Our masterclasses and product drops sell out consistently within 48 hours.",
    name: "Sameer Joshi",
    title: "Head of Growth",
    business: "Zenith Activewear",
    result: "85k+ organic reel saves & 98% approval rate",
    avatar: "SJ",
    industry: "fitness",
  },
  {
    quote:
      "The speed and consistency are remarkable. Our monthly retainer pays for itself within the first 10 days of content deployment. The visual polish and typography are flawless.",
    name: "Meera Krishnan",
    title: "Marketing Director",
    business: "Pulse Mobility EV",
    result: "50k+ organic shares on product launch",
    avatar: "MK",
    industry: "tech",
  },
  {
    quote:
      "From questionnaire to our first batch of approved content in 7 days was not just marketing hype - they actually beat their SLA. The client portal review workflow is effortless.",
    name: "Karan Patel",
    title: "Chief Executive Officer",
    business: "Loom & Craft Studios",
    result: "2.8x organic referral traffic",
    avatar: "KP",
    industry: "lifestyle",
  },
];

const CATEGORIES = [
  { id: "all", label: "All Sectors" },
  { id: "lifestyle", label: "Lifestyle & Apparel" },
  { id: "fnb", label: "F&B & Culinary" },
  { id: "fitness", label: "Health & Fitness" },
  { id: "beauty", label: "Skincare & Wellness" },
  { id: "tech", label: "Tech & EV" },
];

export function ClientsPage() {
  const [selectedSector, setSelectedSector] = useState("all");

  const filteredBrands =
    selectedSector === "all"
      ? BRAND_PARTNERS
      : BRAND_PARTNERS.filter((b) => b.industry === selectedSector);

  const filteredTestimonials =
    selectedSector === "all"
      ? TESTIMONIALS
      : TESTIMONIALS.filter((t) => t.industry === selectedSector);

  return (
    <div className="w-full bg-[#FAFAF8] text-[#14171C]">
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-b from-[#E8F4FD] via-[#F4F9FD] to-[#FAFAF8] pt-10 pb-8 sm:pt-14 sm:pb-10">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[700px] h-[350px] bg-blue-400/15 rounded-full blur-3xl pointer-events-none" />

        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 relative z-10 text-center">
          <ScrollReveal variant="up">
            <div className="inline-flex items-center gap-2 rounded-full bg-[#2B7BC4]/10 border border-[#2B7BC4]/20 px-4 py-1.5 text-xs font-bold text-[#2B7BC4] mb-3 shadow-2xs">
              <Sparkles className="size-3.5 text-[#2B7BC4]" />
              <span>Proven Category Leaders</span>
            </div>

            <h1 className="text-3xl font-black tracking-tight text-[#0D2137] sm:text-5xl max-w-3xl mx-auto leading-[1.15]">
              Trusted by Ambitious Brands <br />
              <span className="bg-clip-text text-transparent bg-gradient-to-r from-[#2B7BC4] to-[#1E609A]">
                Scaling on Autopilot
              </span>
            </h1>

            <p className="mt-4 text-sm sm:text-base leading-relaxed text-slate-600 max-w-2xl mx-auto font-normal">
              From emerging direct-to-consumer innovators to established lifestyle enterprises - see how high-cadence creative retainers power compounding social growth.
            </p>

            {/* Sector Category Filters */}
            <div className="mt-8 flex flex-wrap items-center justify-center gap-2">
              {CATEGORIES.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => setSelectedSector(c.id)}
                  className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer ${
                    selectedSector === c.id
                      ? "bg-gradient-to-r from-[#2B7BC4] to-[#1E609A] text-white shadow-md shadow-blue-500/20"
                      : "bg-white text-slate-600 hover:bg-slate-100 border border-slate-200/80 shadow-2xs"
                  }`}
                >
                  {c.label}
                </button>
              ))}
            </div>
          </ScrollReveal>
        </div>
      </section>

      {/* Client Brand Showcase Grid */}
      <section className="pb-12 sm:pb-16 relative z-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-6">
            <p className="text-xs font-bold uppercase tracking-widest text-[#2B7BC4]">
              Portfolio Brands in Active Production
            </p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
            {filteredBrands.map((brand, idx) => (
              <ScrollReveal key={brand.name} variant="scale" delay={idx * 50} className="h-full">
                <div className="bg-white rounded-3xl border border-slate-200/90 p-4 flex flex-col items-center text-center shadow-xs hover:shadow-xl hover:border-[#2B7BC4]/50 transition-all duration-300 hover:-translate-y-1 group h-full justify-between">
                  <div className="flex flex-col items-center">
                    <div className="relative size-16 sm:size-20 rounded-2xl overflow-hidden mb-3 shadow-sm group-hover:scale-105 transition-transform duration-500 border border-slate-100 bg-slate-100">
                      <img
                        src={brand.image}
                        alt={brand.name}
                        className="w-full h-full object-cover"
                        loading="lazy"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent opacity-60 group-hover:opacity-30 transition-opacity" />
                    </div>
                    <h3 className="text-xs sm:text-sm font-bold text-[#0D2137] leading-tight">{brand.name}</h3>
                    <p className="text-[10px] text-slate-500 mt-1 leading-tight">{brand.category}</p>
                  </div>
                  <span className="mt-2.5 inline-block text-[9px] font-extrabold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200/80">
                    {brand.metric}
                  </span>
                </div>
              </ScrollReveal>
            ))}
          </div>
        </div>
      </section>

      {/* High-Impact Testimonials Grid */}
      <section className="bg-white py-12 sm:py-16 border-y border-slate-200/80">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <ScrollReveal variant="up">
            <div className="text-center max-w-2xl mx-auto mb-10">
              <span className="text-xs font-bold uppercase tracking-widest text-[#2B7BC4]">
                Verified Client Reviews
              </span>
              <h2 className="mt-2 text-2xl sm:text-3xl font-extrabold tracking-tight text-[#0D2137]">
                Real Feedback from Founders & Marketing Leaders
              </h2>
              <p className="text-slate-500 text-xs sm:text-sm mt-2">
                How Creo's creative retainers drive tangible commercial outcomes.
              </p>
            </div>
          </ScrollReveal>

          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {filteredTestimonials.map((t, idx) => (
              <ScrollReveal key={t.name} variant="up" delay={idx * 80} className="h-full">
                <div className="rounded-3xl border border-slate-200/90 bg-[#FAFAF8] p-6 sm:p-7 flex flex-col justify-between shadow-xs hover:shadow-xl hover:bg-white hover:border-[#2B7BC4]/50 transition-all duration-300 group h-full">
                  <div>
                    <div className="flex items-center gap-1 mb-3 text-amber-400">
                      {[...Array(5)].map((_, i) => (
                        <Star key={i} className="size-3.5 fill-amber-400" />
                      ))}
                    </div>
                    <p className="text-xs sm:text-sm leading-relaxed text-slate-700 italic">
                      "{t.quote}"
                    </p>
                  </div>

                  <div className="mt-6 pt-4 border-t border-slate-200/60">
                    <div className="flex items-center gap-3 mb-2.5">
                      <div className="size-10 rounded-full bg-gradient-to-br from-[#2B7BC4] to-[#1E609A] text-white flex items-center justify-center text-xs font-bold shadow-xs">
                        {t.avatar}
                      </div>
                      <div>
                        <p className="text-xs sm:text-sm font-bold text-[#0D2137]">{t.name}</p>
                        <p className="text-[10px] text-slate-500">{t.title} - <span className="font-semibold text-slate-700">{t.business}</span></p>
                      </div>
                    </div>

                    <div className="rounded-xl bg-emerald-50 border border-emerald-200/80 px-3 py-1.5 flex items-center gap-2">
                      <CheckCircle2 className="size-3.5 text-emerald-600 shrink-0" />
                      <p className="text-[11px] font-bold text-emerald-800 tracking-tight">
                        {t.result}
                      </p>
                    </div>
                  </div>
                </div>
              </ScrollReveal>
            ))}
          </div>
        </div>
      </section>

      {/* Bottom CTA */}
      <section className="bg-gradient-to-br from-[#07192F] via-[#0B2545] to-[#123966] py-14 sm:py-18 text-white relative overflow-hidden">
        <div className="absolute top-0 right-10 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 text-center relative z-10">
          <ScrollReveal variant="scale">
            <h2 className="text-2xl sm:text-4xl font-black tracking-tight text-white leading-tight">
              Ready to Become Our Next Success Story?
            </h2>
            <p className="mt-3 text-xs sm:text-base text-blue-100/80 max-w-xl mx-auto">
              Choose your production retainer today and get your first week of high-impact creative deliverables.
            </p>
            <div className="mt-7 flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4">
              <Link
                to="/pricing"
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#2B7BC4] to-[#1E609A] text-white px-7 py-3 text-sm font-bold shadow-lg shadow-blue-600/30 hover:brightness-110 active:scale-95 transition-all w-full sm:w-auto cursor-pointer"
              >
                <span>Explore Retainer Plans</span>
                <ArrowRight className="size-4" />
              </Link>
              <Link
                to="/portfolio"
                className="inline-flex items-center justify-center rounded-xl bg-white/10 hover:bg-white/20 border border-white/25 text-white px-6 py-3 text-sm font-semibold backdrop-blur-md transition-all w-full sm:w-auto cursor-pointer"
              >
                Browse Creative Portfolio
              </Link>
            </div>
          </ScrollReveal>
        </div>
      </section>
    </div>
  );
}

export default ClientsPage;
