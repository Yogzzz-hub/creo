import { Link } from "react-router";
import { Star, CheckCircle2, ArrowRight, Sparkles } from "lucide-react";

const BRAND_PARTNERS = [
  {
    name: "Astra Living",
    category: "D2C Lifestyle & Apparel",
    color: "from-blue-600 to-indigo-700",
    image: "/assets/portfolio/scandi_living.jpg",
  },
  {
    name: "Urban Bakes",
    category: "Artisan Culinary Group",
    color: "from-amber-600 to-orange-700",
    image: "/assets/portfolio/sourdough_carousel.jpg",
  },
  {
    name: "Zenith Fitness",
    category: "Performance Activewear",
    color: "from-rose-600 to-red-700",
    image: "/assets/portfolio/zenith_fitness.jpg",
  },
  {
    name: "Kaya Botanicals",
    category: "Clean Skincare & Beauty",
    color: "from-emerald-600 to-teal-700",
    image: "/assets/portfolio/botanical_serum.jpg",
  },
  {
    name: "Pulse Mobility",
    category: "Smart Urban Commute",
    color: "from-cyan-600 to-blue-700",
    image: "/assets/portfolio/pulse_mobility.jpg",
  },
  {
    name: "Loom & Craft",
    category: "Handcrafted Luxury",
    color: "from-purple-600 to-violet-700",
    image: "/assets/portfolio/mulberry_silk.jpg",
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
  },
  {
    quote:
      "The team truly understands our brand voice and culinary heritage. Every single video looks like it came out of a high-end commercial production house. Customer engagement is higher than it's ever been.",
    name: "Ananya Deshmukh",
    title: "Co-Founder & Head Baker",
    business: "Urban Bakes Artisan Group",
    result: "1,200+ new local followers in 3 weeks",
    avatar: "AD",
  },
  {
    quote:
      "We tried two traditional agencies before Creo. The difference? Creo delivers on time every single week, with zero micro-management required. Truly content production on autopilot.",
    name: "Dr. Rohan Singhania",
    title: "Founder & Lead Formulator",
    business: "Kaya Botanicals Wellness",
    result: "40% increase in checkout conversions",
    avatar: "RS",
  },
  {
    quote:
      "Having a dedicated brand director who understands high-performance fitness storytelling has been game-changing. Our masterclasses and product drops sell out consistently within 48 hours.",
    name: "Sameer Joshi",
    title: "Head of Growth",
    business: "Zenith Activewear",
    result: "85k+ organic reel saves & 98% approval rate",
    avatar: "SJ",
  },
  {
    quote:
      "The speed and consistency are remarkable. Our monthly retainer pays for itself within the first 10 days of content deployment. The visual polish and typography are flawless.",
    name: "Meera Krishnan",
    title: "Marketing Director",
    business: "Pulse Mobility EV",
    result: "50k+ organic shares on product launch",
    avatar: "MK",
  },
  {
    quote:
      "From questionnaire to our first batch of approved content in 7 days wasn't just marketing hype — they actually beat their SLA. The client portal review workflow is effortless.",
    name: "Karan Patel",
    title: "Chief Executive Officer",
    business: "Loom & Craft Studios",
    result: "2.8x organic referral traffic",
    avatar: "KP",
  },
];

export function ClientsPage() {
  return (
    <div className="w-full bg-[#FAFAF8] text-[#14171C]">
      {/* ── Hero Section ─────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden bg-gradient-to-b from-[#E8F4FD] via-[#F4F9FD] to-[#FAFAF8] pt-10 pb-8 sm:pt-14 sm:pb-10">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[700px] h-[350px] bg-blue-400/15 rounded-full blur-3xl pointer-events-none" />

        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 relative z-10 text-center">
          <div className="inline-flex items-center gap-2 rounded-full bg-[#2B7BC4]/10 border border-[#2B7BC4]/20 px-4 py-1.5 text-xs font-bold text-[#2B7BC4] mb-3 shadow-2xs">
            <Sparkles className="size-3.5 text-[#2B7BC4]" />
            <span>Proven Category Leaders</span>
          </div>

          <h1 className="text-3xl font-black tracking-tight text-[#0D2137] sm:text-5xl max-w-3xl mx-auto leading-[1.15]">
            Trusted by Ambitious Brands <br />
            <span className="bg-clip-text text-transparent bg-gradient-to-r from-[#2B7BC4] to-[#1F5C96]">
              Scaling on Autopilot
            </span>
          </h1>

          <p className="mt-4 text-sm sm:text-base leading-relaxed text-slate-600 max-w-2xl mx-auto font-normal">
            From emerging direct-to-consumer innovators to established lifestyle enterprises — see how high-cadence creative retainers power compounding social growth.
          </p>
        </div>
      </section>

      {/* ── Client Brand Showcase Grid ────────────────────────────────────── */}
      <section className="pb-12 sm:pb-16 relative z-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-6">
            <p className="text-xs font-bold uppercase tracking-widest text-[#2B7BC4]">
              Portfolio Brands in Production
            </p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
            {BRAND_PARTNERS.map((brand) => (
              <div
                key={brand.name}
                className="bg-white rounded-2xl border border-slate-200/90 p-3.5 flex flex-col items-center text-center shadow-xs hover:shadow-lg hover:border-[#2B7BC4]/50 transition-all duration-300 hover:-translate-y-1 group"
              >
                <div className="relative size-16 sm:size-20 rounded-xl overflow-hidden mb-3 shadow-sm group-hover:scale-105 transition-transform duration-500 border border-slate-100 bg-slate-100">
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
            ))}
          </div>
        </div>
      </section>

      {/* ── High-Impact Testimonials Grid ─────────────────────────────────── */}
      <section className="bg-white py-12 sm:py-16 border-y border-slate-200/80">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
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

          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {TESTIMONIALS.map((t) => (
              <div
                key={t.name}
                className="rounded-2xl border border-slate-200/90 bg-[#FAFAF8] p-6 flex flex-col justify-between shadow-xs hover:shadow-xl hover:bg-white hover:border-[#2B7BC4]/50 transition-all duration-300 group"
              >
                <div>
                  <div className="flex items-center gap-1 mb-3 text-amber-400">
                    {[...Array(5)].map((_, i) => (
                      <Star key={i} className="size-3.5 fill-amber-400" />
                    ))}
                  </div>
                  <p className="text-xs sm:text-sm leading-relaxed text-slate-700 italic">
                    &ldquo;{t.quote}&rdquo;
                  </p>
                </div>

                <div className="mt-6 pt-4 border-t border-slate-200/60">
                  <div className="flex items-center gap-3 mb-2.5">
                    <div className="size-9 rounded-full bg-gradient-to-br from-[#2B7BC4] to-[#1F5C96] text-white flex items-center justify-center text-xs font-bold shadow-xs">
                      {t.avatar}
                    </div>
                    <div>
                      <p className="text-xs sm:text-sm font-bold text-[#0D2137]">{t.name}</p>
                      <p className="text-[10px] text-slate-500">{t.title} • <span className="font-semibold text-slate-700">{t.business}</span></p>
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
            ))}
          </div>
        </div>
      </section>

      {/* ── Bottom CTA ────────────────────────────────────────────────────── */}
      <section className="bg-gradient-to-br from-[#0D2137] to-[#122B48] py-12 sm:py-16 text-white relative overflow-hidden">
        <div className="absolute -top-24 right-0 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 text-center relative z-10">
          <h2 className="text-2xl sm:text-4xl font-extrabold tracking-tight text-white leading-tight">
            Ready to Become Our Next Success Story?
          </h2>
          <p className="mt-3 text-xs sm:text-base text-slate-300 max-w-xl mx-auto">
            Choose your production retainer today and get your first week of high-impact creative deliverables.
          </p>
          <div className="mt-6 flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4">
            <Link
              to="/pricing"
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#2B7BC4] to-[#1F5C96] text-white px-7 py-3 text-sm font-bold shadow-lg shadow-blue-600/30 hover:brightness-110 active:scale-95 transition-all w-full sm:w-auto cursor-pointer"
            >
              <span>Explore Retainer Plans</span>
              <ArrowRight className="size-4" />
            </Link>
            <Link
              to="/portfolio"
              className="inline-flex items-center justify-center rounded-xl bg-white/10 hover:bg-white/20 border border-white/20 text-white px-6 py-3 text-sm font-semibold backdrop-blur-sm transition-all w-full sm:w-auto"
            >
              Browse Creative Portfolio
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
