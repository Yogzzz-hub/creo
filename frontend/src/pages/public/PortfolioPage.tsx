import { useState } from "react";
import { Link } from "react-router";
import {
  ArrowUpRight,
  ImageIcon,
  Layers,
  CheckCircle2,
  Eye,
  Sparkles,
  TrendingUp,
  X,
  Play,
} from "lucide-react";

interface CaseStudy {
  brand: string;
  industry: string;
  challenge: string;
  approach: string;
  result: string;
  metricLabel: string;
  color: string;
  accent: string;
  deliverables: string;
}

const CASE_STUDIES: CaseStudy[] = [
  {
    brand: "Astra Living",
    industry: "Home & Lifestyle",
    challenge:
      "Low social engagement and inconsistent posting schedule despite an exceptional premium product line.",
    approach:
      "Engineered an automated 90-day multi-format editorial calendar featuring shoppable studio flatlays, ambient morning carousels, and minimalist interior walkthroughs.",
    result: "+310% Organic Reach",
    metricLabel: "30-Day Growth",
    color: "bg-sky-50",
    accent: "text-sky-700",
    deliverables: "16 Feed Posters · 8 High-Res Carousels · 4 Motion Stories",
  },
  {
    brand: "Urban Bakes",
    industry: "Artisanal Food & F&B",
    challenge:
      "New artisanal sourdough bakery struggling to build local neighborhood awareness and weekend foot traffic.",
    approach:
      "Launched a high-sensory behind-the-counter macro cinematography reel series, sourdough fermentation guides, and geo-targeted neighborhood drops.",
    result: "1,200+ Local Customers",
    metricLabel: "3-Week Footfall Surge",
    color: "bg-amber-50",
    accent: "text-amber-800",
    deliverables: "12 Vertical Reels · 8 Menu Showcases · Daily Story Boosts",
  },
  {
    brand: "Zenith Fitness",
    industry: "Health & Performance",
    challenge:
      "Rising customer acquisition cost and generic aesthetic failing to differentiate from boutique gym competitors.",
    approach:
      "Produced cinematic high-octane trainer spotlights, athlete transformation documentaries, and weekly mobility guides with branded motion overlays.",
    result: "3.4x ROAS on Memberships",
    metricLabel: "Quarterly ROI",
    color: "bg-emerald-50",
    accent: "text-emerald-700",
    deliverables: "18 Cinematic Reels · 12 Training Carousels · Ad Creative Suite",
  },
  {
    brand: "Kaya Botanicals",
    industry: "Organic Skincare",
    challenge:
      "Struggling to educate audience on clean active ingredients with low click-through rates on paid ad creative.",
    approach:
      "Crafted dermatologist-backed ingredient breakdown carousels, micro-influencer texture close-ups, and 3-step routine reels with interactive stickers.",
    result: "8.2% CTR on Meta Ads",
    metricLabel: "Industry Avg: 1.4%",
    color: "bg-teal-50",
    accent: "text-teal-700",
    deliverables: "20 Clinical Carousels · 10 Texture Reels · 15 Promo Banners",
  },
  {
    brand: "Pulse Mobility",
    industry: "EV & Clean Mobility",
    challenge:
      "D2C smart electric scooter manufacturer needing tech-forward brand authority and pre-order reservation velocity.",
    approach:
      "Executed nocturnal city commute reels, 3D exploded battery safety animations, and real-time charging cost comparison graphics.",
    result: "50K+ Shares & 40% Inquiries",
    metricLabel: "Viral Impact",
    color: "bg-indigo-50",
    accent: "text-indigo-700",
    deliverables: "14 Nightcommute Reels · 10 Tech Spec Posts · PR Press Pack",
  },
  {
    brand: "Loom & Craft",
    industry: "Sustainable Fashion",
    challenge:
      "High shopping cart abandonment during festive seasonal drops due to low emotional brand storytelling.",
    approach:
      "Produced artisan heritage weaving mini-documentaries, tactile fabric zoom carousels, and VIP early-access flash stories.",
    result: "40% Checkout Conversion Lift",
    metricLabel: "Launch Revenue Surge",
    color: "bg-rose-50",
    accent: "text-rose-700",
    deliverables: "16 Editorial Lookbooks · 8 Heritage Reels · Countdown Stories",
  },
];

type GalleryCategory = "all" | "posters" | "carousels" | "reels";

interface CreativeItem {
  id: string;
  title: string;
  brand: string;
  category: "posters" | "carousels" | "reels";
  format: string;
  ratio: string;
  tag: string;
  specs: string[];
  description: string;
  gradient: string;
  image: string;
}

const CREATIVES: CreativeItem[] = [
  {
    id: "cr-1",
    title: "Minimalist Scandinavian Living Drop",
    brand: "Astra Living",
    category: "posters",
    format: "1:1 Feed Poster",
    ratio: "1080 × 1080 px",
    tag: "CTR +4.2%",
    specs: ["Retina Color Space", "Typography Lockup", "Color-matched Palette"],
    description: "Designed for premium organic feed aesthetics with high-contrast neutral palettes and negative space typography.",
    gradient: "from-slate-700 via-sky-800 to-indigo-900",
    image: "/assets/portfolio/scandi_living.jpg",
  },
  {
    id: "cr-2",
    title: "Artisanal Fermentation & Crust Masterclass",
    brand: "Urban Bakes",
    category: "carousels",
    format: "4:5 Multi-slide Carousel",
    ratio: "1080 × 1350 px (6 Slides)",
    tag: "240K Impressions",
    specs: ["Seamless Slide Flow", "Swipe Arrows", "Saves Rate +22%"],
    description: "Educational multi-card carousel crafted to maximize bookmarking and algorithmic distribution.",
    gradient: "from-amber-700 via-orange-800 to-amber-950",
    image: "/assets/portfolio/sourdough_carousel.jpg",
  },
  {
    id: "cr-3",
    title: "Pure Botanical Peptide Serum Launch",
    brand: "Kaya Botanicals",
    category: "posters",
    format: "1:1 Product Spotlight",
    ratio: "1080 × 1080 px",
    tag: "8.2% Ad CTR",
    specs: ["Specular Lighting", "Ingredient Badges", "Custom Shadows"],
    description: "Clinical yet organic cosmetic product spotlight highlighting pure ingredients and certified dermatological safety.",
    gradient: "from-emerald-800 via-teal-800 to-cyan-950",
    image: "/assets/portfolio/botanical_serum.jpg",
  },
  {
    id: "cr-4",
    title: "Raw Intensity: Pre-Dawn Conditioning",
    brand: "Zenith Fitness",
    category: "reels",
    format: "9:16 Cinematic Short Reel",
    ratio: "1080 × 1920 px (30s)",
    tag: "3.4x Signups",
    specs: ["Native 4K 60fps", "Beat-synced Transitions", "Dynamic Subtitles"],
    description: "Adrenaline-fueled training reel cut to trending audio with animated kinetic typography overlays.",
    gradient: "from-zinc-900 via-stone-800 to-red-950",
    image: "/assets/portfolio/zenith_fitness.jpg",
  },
  {
    id: "cr-5",
    title: "Nocturnal City Commute & Dual Battery Tech",
    brand: "Pulse Mobility",
    category: "reels",
    format: "9:16 Cinematic Tech Feature",
    ratio: "1080 × 1920 px (45s)",
    tag: "50K+ Shares",
    specs: ["Night Color Grading", "3D Callout Badges", "Binaural Audio"],
    description: "Sleek low-light urban cinematography highlighting whisper-quiet acceleration and regenerative braking.",
    gradient: "from-blue-950 via-indigo-900 to-purple-950",
    image: "/assets/portfolio/pulse_mobility.jpg",
  },
  {
    id: "cr-6",
    title: "Hand-Spun Mulberry Silk Capsule Collection",
    brand: "Loom & Craft",
    category: "carousels",
    format: "4:5 Editorial Lookbook",
    ratio: "1080 × 1350 px (8 Slides)",
    tag: "+40% Conversion",
    specs: ["Macro Texture Crops", "Fabric Transparency", "Direct Shop Tags"],
    description: "High-fashion digital catalog featuring intricate handloom textures and direct SKU catalog mapping.",
    gradient: "from-rose-900 via-stone-800 to-pink-950",
    image: "/assets/portfolio/mulberry_silk.jpg",
  },
];

export function PortfolioPage() {
  const [activeTab, setActiveTab] = useState<GalleryCategory>("all");
  const [selectedItem, setSelectedItem] = useState<CreativeItem | null>(null);

  const filteredCreatives =
    activeTab === "all"
      ? CREATIVES
      : CREATIVES.filter((c) => c.category === activeTab);

  return (
    <div className="w-full">
      {/* ── 1. Hero Section ────────────────────────────────────────────── */}
      <section className="relative overflow-hidden bg-gradient-to-b from-[#E8F4FD] via-[#F4F9FD] to-white pt-10 pb-8 sm:pt-14 sm:pb-10">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 text-center">
          <div className="inline-flex items-center gap-2 rounded-full bg-white px-3.5 py-1 text-xs font-semibold text-[#2B7BC4] shadow-2xs border border-[#C9DFF0] mb-4">
            <Sparkles className="size-3.5" />
            Proven Campaign Execution Across 50+ Retainers
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight text-[#0D2137] sm:text-5xl">
            Our Work Speaks <br />
            <span className="text-[#2B7BC4]">in Measurable Growth</span>
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-base leading-relaxed text-slate-600 sm:text-lg">
            Every reel, carousel, and creative asset we deliver is engineered for audience retention,
            brand differentiation, and commercial conversion.
          </p>
          <div className="mt-6 flex flex-wrap items-center justify-center gap-5 text-xs sm:text-sm font-semibold text-slate-600">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="size-4 text-emerald-600" />
              <span>Native 4K & High-Res Formats</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="size-4 text-emerald-600" />
              <span>Sound Design & Kinematics Included</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="size-4 text-emerald-600" />
              <span>Guaranteed 2-3 Day Turnaround</span>
            </div>
          </div>
        </div>
      </section>

      {/* ── 2. Case Studies Section ────────────────────────────────────── */}
      <section className="bg-white py-12 sm:py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-3xl text-center">
            <span className="text-xs font-bold uppercase tracking-widest text-[#2B7BC4]">
              Performance Highlights
            </span>
            <h2 className="mt-2 text-2xl font-extrabold tracking-tight text-[#0D2137] sm:text-3xl">
              Real Brands, Verifiable Returns
            </h2>
            <p className="mt-2 text-sm text-slate-600 sm:text-base">
              We replace subjective opinions with structured weekly production and measurable engagement lifts.
            </p>
          </div>

          <div className="mt-10 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {CASE_STUDIES.map((study) => (
              <div
                key={study.brand}
                className="group relative flex flex-col justify-between rounded-3xl border border-[#C9DFF0] bg-white p-7 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-xl"
              >
                <div>
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-xl font-bold text-[#0D2137]">{study.brand}</h3>
                      <span className="text-xs font-semibold text-slate-500">{study.industry}</span>
                    </div>
                    <span className="rounded-full bg-slate-100 px-3 py-1 text-[11px] font-bold text-slate-700">
                      Verified Client
                    </span>
                  </div>

                  <div className="mt-6 space-y-4">
                    <div>
                      <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                        The Challenge
                      </p>
                      <p className="mt-1 text-sm leading-relaxed text-slate-600">
                        {study.challenge}
                      </p>
                    </div>
                    <div>
                      <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                        Our Solution
                      </p>
                      <p className="mt-1 text-sm leading-relaxed text-slate-600">
                        {study.approach}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="mt-6 border-t border-slate-100 pt-5">
                  <div className={`rounded-2xl ${study.color} p-4 border border-black/5`}>
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-slate-600">{study.metricLabel}</span>
                      <TrendingUp className={`size-4 ${study.accent}`} />
                    </div>
                    <p className={`mt-1 text-2xl font-black ${study.accent}`}>
                      {study.result}
                    </p>
                  </div>
                  <p className="mt-3 text-[11px] font-medium text-slate-400 flex items-center gap-1.5">
                    <span className="inline-block size-1.5 rounded-full bg-emerald-500" />
                    {study.deliverables}
                  </p>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-12 rounded-2xl bg-[#E8F4FD]/50 border border-[#C9DFF0] p-4 text-center">
            <p className="text-xs font-medium text-slate-600">
              ⚡ All case study metrics are validated through client Meta Insights, Google Analytics, and direct CRM reporting for active Creo retainers.
            </p>
          </div>
        </div>
      </section>

      {/* ── 3. Creative Showcase Gallery ────────────────────────────────── */}
      <section className="bg-[#F8F9FA] py-12 sm:py-16 border-y border-[#C9DFF0]">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-3xl text-center">
            <span className="text-xs font-bold uppercase tracking-widest text-[#2B7BC4]">
              Deliverables Portfolio
            </span>
            <h2 className="mt-2 text-2xl font-extrabold tracking-tight text-[#0D2137] sm:text-3xl">
              Engineered for Thumbs to Stop Scrolling
            </h2>
            <p className="mt-2 text-sm text-slate-600 sm:text-base">
              Explore recent production outputs designed for Instagram, LinkedIn, and Meta Ad networks.
            </p>
          </div>

          {/* Filter Tabs */}
          <div className="mt-8 flex justify-center">
            <div className="inline-flex rounded-2xl bg-white p-1.5 shadow-xs border border-[#C9DFF0]">
              {(
                [
                  { id: "all", label: "All Formats" },
                  { id: "posters", label: "Posters (1:1)" },
                  { id: "carousels", label: "Carousels (4:5)" },
                  { id: "reels", label: "Reels (9:16)" },
                ] as { id: GalleryCategory; label: string }[]
              ).map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  className={`rounded-xl px-4 py-1.5 text-xs sm:text-sm font-semibold transition-all cursor-pointer ${
                    activeTab === tab.id
                      ? "bg-[#2B7BC4] text-white shadow-md shadow-[#2B7BC4]/20"
                      : "text-slate-600 hover:text-[#0D2137]"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          {/* Creative Grid */}
          <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {filteredCreatives.map((item) => (
              <div
                key={item.id}
                onClick={() => setSelectedItem(item)}
                className="group relative cursor-pointer overflow-hidden rounded-3xl border border-[#C9DFF0] bg-white shadow-xs transition-all duration-300 hover:-translate-y-1 hover:shadow-xl"
              >
                {/* Visual Thumbnail Area with Real AI Image & Micro-Animations */}
                <div className="relative h-64 w-full bg-slate-900 p-5 flex flex-col justify-between text-white overflow-hidden">
                  <img
                    src={item.image}
                    alt={item.title}
                    className="absolute inset-0 w-full h-full object-cover group-hover:scale-110 transition-transform duration-700 ease-out"
                    loading="lazy"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/25 to-black/40" />

                  {/* Header Row */}
                  <div className="relative z-10 flex items-center justify-between">
                    <span className="rounded-full bg-black/60 backdrop-blur-md px-3 py-1 text-[11px] font-bold text-white uppercase tracking-wider border border-white/20 shadow-xs">
                      {item.brand}
                    </span>
                    <span className="rounded-full bg-emerald-500 px-2.5 py-0.5 text-[10px] font-extrabold text-white shadow-sm flex items-center gap-1">
                      <span className="size-1.5 rounded-full bg-white animate-pulse" />
                      {item.tag}
                    </span>
                  </div>

                  {/* Center Action Indicator / Play or View */}
                  <div className="relative z-10 my-auto flex flex-col items-center justify-center transition-transform duration-300 group-hover:scale-110">
                    <div className="size-14 rounded-2xl bg-white/20 backdrop-blur-md border border-white/40 flex items-center justify-center shadow-lg group-hover:bg-[#2B7BC4] transition-colors">
                      {item.category === "reels" ? (
                        <Play className="size-6 fill-white text-white ml-0.5" />
                      ) : item.category === "carousels" ? (
                        <Layers className="size-6 text-white" />
                      ) : (
                        <ImageIcon className="size-6 text-white" />
                      )}
                    </div>
                    <span className="mt-2 text-[11px] font-semibold text-white/90 bg-black/50 backdrop-blur-xs px-2 py-0.5 rounded-full">{item.ratio}</span>
                  </div>

                  {/* Hover Overlay Button */}
                  <div className="relative z-10 flex items-center justify-between text-xs font-semibold text-white/90">
                    <span className="flex items-center gap-1 text-[11px]">
                      {item.format}
                    </span>
                    <span className="inline-flex items-center gap-1 text-white bg-white/25 hover:bg-white/40 backdrop-blur-sm rounded-lg px-2.5 py-1 transition-all text-xs">
                      <Eye className="size-3.5" /> Inspect Specs
                    </span>
                  </div>
                </div>

                {/* Card Content */}
                <div className="p-6">
                  <h4 className="text-base font-bold text-[#0D2137] group-hover:text-[#2B7BC4] transition-colors line-clamp-1">
                    {item.title}
                  </h4>
                  <p className="mt-2 text-xs leading-relaxed text-slate-600 line-clamp-2">
                    {item.description}
                  </p>

                  <div className="mt-4 flex flex-wrap gap-1.5 pt-3 border-t border-slate-100">
                    {item.specs.map((spec) => (
                      <span
                        key={spec}
                        className="rounded-md bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-600"
                      >
                        {spec}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── 4. Interactive Detail Modal ─────────────────────────────────── */}
      {selectedItem && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm animate-fade-in"
          onClick={() => setSelectedItem(null)}
        >
          <div
            className="relative w-full max-w-2xl rounded-3xl bg-white p-6 sm:p-8 shadow-2xl border border-[#C9DFF0] animate-scale-up"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setSelectedItem(null)}
              className="absolute right-5 top-5 rounded-full p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-colors"
            >
              <X className="size-5" />
            </button>

            <div className="flex items-center gap-3">
              <span className="rounded-full bg-[#E8F4FD] px-3.5 py-1 text-xs font-bold text-[#2B7BC4]">
                {selectedItem.brand}
              </span>
              <span className="rounded-full bg-emerald-50 border border-emerald-200 px-3 py-1 text-xs font-bold text-emerald-700">
                {selectedItem.tag}
              </span>
            </div>

            <h3 className="mt-4 text-2xl font-black text-[#0D2137]">
              {selectedItem.title}
            </h3>

            <div
              className="relative mt-6 h-52 rounded-2xl overflow-hidden shadow-inner bg-slate-900"
            >
              <img
                src={selectedItem.image}
                alt={selectedItem.title}
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-black/30 flex items-center justify-center text-white">
                <div className="text-center">
                  <div className="mx-auto size-12 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center border border-white/30 mb-2">
                    {selectedItem.category === "reels" ? (
                      <Play className="size-6 fill-white text-white ml-0.5" />
                    ) : selectedItem.category === "carousels" ? (
                      <Layers className="size-6 text-white" />
                    ) : (
                      <ImageIcon className="size-6 text-white" />
                    )}
                  </div>
                  <p className="text-sm font-bold text-white">{selectedItem.format}</p>
                  <p className="text-xs text-white/80">{selectedItem.ratio}</p>
                </div>
              </div>
            </div>

            <p className="mt-6 text-sm leading-relaxed text-slate-600">
              {selectedItem.description}
            </p>

            <div className="mt-6 rounded-2xl bg-slate-50 border border-slate-200/80 p-4">
              <h5 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
                Production & Delivery Specifications
              </h5>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                <div>
                  <span className="block text-[10px] text-slate-400 uppercase">Dimensions</span>
                  <span className="text-xs font-bold text-[#0D2137]">{selectedItem.ratio}</span>
                </div>
                <div>
                  <span className="block text-[10px] text-slate-400 uppercase">Licensing</span>
                  <span className="text-xs font-bold text-emerald-600">Full Commercial Use</span>
                </div>
                <div>
                  <span className="block text-[10px] text-slate-400 uppercase">Revisions</span>
                  <span className="text-xs font-bold text-[#0D2137]">2 Rounds Included</span>
                </div>
              </div>
            </div>

            <div className="mt-6 flex flex-col sm:flex-row items-center justify-end gap-3 pt-4 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setSelectedItem(null)}
                className="w-full sm:w-auto rounded-xl border border-slate-200 px-5 py-2.5 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition-colors"
              >
                Close Preview
              </button>
              <Link
                to="/pricing"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 rounded-xl bg-[#2B7BC4] px-6 py-2.5 text-xs font-bold text-white hover:bg-[#2B7BC4]/90 transition-colors shadow-md shadow-[#2B7BC4]/20"
              >
                Order Deliverables Like This
                <ArrowUpRight className="size-3.5" />
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* ── 5. Bottom CTA ─────────────────────────────────────────────── */}
      <section className="bg-[#0D2137] py-16 sm:py-20 text-white">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl font-extrabold tracking-tight text-white sm:text-4xl">
            Want Content That Elevates Your Brand?
          </h2>
          <p className="mt-4 text-base sm:text-lg text-white/70 max-w-xl mx-auto">
            Choose a retainer tier that fits your cadence. First deliverables arrive in your client portal within 7 days.
          </p>
          <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              to="/pricing"
              className="inline-flex items-center justify-center bg-white text-[#0D2137] hover:bg-slate-100 rounded-xl h-12 px-8 text-sm font-bold transition-all shadow-md w-full sm:w-auto"
            >
              Explore Monthly Retainers
            </Link>
            <a
              href="https://wa.me/919941999415"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center bg-[#2B7BC4] text-white hover:bg-[#2B7BC4]/90 rounded-xl h-12 px-8 text-sm font-bold transition-all shadow-md w-full sm:w-auto gap-2"
            >
              <span>Speak with Our Creative Director</span>
              <ArrowUpRight className="size-4" />
            </a>
          </div>
        </div>
      </section>
    </div>
  );
}

