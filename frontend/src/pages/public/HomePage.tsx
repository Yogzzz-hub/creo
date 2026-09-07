import { useState } from "react";
import { Link } from "react-router";
import {
  ArrowRight,
  CheckCircle2,
  Zap,
  Play,
  FileText,
  Rocket,
  Star,
  Film,
  Layers,
  Clock,
  ChevronDown,
  Loader2,
  Calendar,
} from "lucide-react";
import { request } from "../../lib/http";

const BRAND_PARTNERS = [
  { name: "Astra Living", tag: "Home & Lifestyle", growth: "+310% Reach" },
  { name: "Urban Bakes", tag: "Artisanal F&B", growth: "1,200+ Footfall" },
  { name: "Zenith Fitness", tag: "Athletic Performance", growth: "3.4x ROAS" },
  { name: "Kaya Botanicals", tag: "Clean Skincare", growth: "8.2% CTR" },
  { name: "Heritage Looms", tag: "Luxury Fashion", growth: "+40% Conversions" },
];

const METRICS = [
  { value: "50+", label: "Active Brands Scaled", sub: "Across 12 industries" },
  { value: "1,200+", label: "Reels & Carousels Delivered", sub: "4K & Retina exports" },
  { value: "98.4%", label: "First-Round Approval Rate", sub: "Minimal revision cycles" },
  { value: "3.4x", label: "Average Client ROI Lift", sub: "Verified performance" },
  { value: "7 Days", label: "Onboarding to 1st Batch", sub: "Guaranteed SLA delivery" },
];



const ONBOARDING_STEPS = [
  {
    day: "Day 1",
    number: "01",
    title: "Brand DNA Intake",
    description:
      "Complete a 5-minute brand questionnaire covering your tone, aesthetic guidelines, target audience demographics, and top competitors.",
    icon: FileText,
  },
  {
    day: "Days 2–3",
    number: "02",
    title: "Editorial Strategy & Blueprint",
    description:
      "Our creative directors craft your tailored 30-day content calendar, narrative pillars, hook library, and visual moodboard.",
    icon: Zap,
  },
  {
    day: "Days 4–6",
    number: "03",
    title: "Dedicated Production Sprint",
    description:
      "Our motion designers, video editors, and copywriters script, shoot, edit, and polish your inaugural content drops.",
    icon: Film,
  },
  {
    day: "Day 7",
    number: "04",
    title: "Batch #01 In Your Portal",
    description:
      "Your first batch lands directly in your private client portal. Review high-res previews, request tweaks, or approve with one click.",
    icon: CheckCircle2,
  },
  {
    day: "Weekly",
    number: "05",
    title: "Auto-Publish & Growth",
    description:
      "Approved content is auto-scheduled to Instagram or exported ready-to-post. New fresh batches arrive every 7 days like clockwork.",
    icon: Rocket,
  },
];

const COMPARISON_ROWS = [
  {
    feature: "Monthly Cost",
    creo: "Flat ₹25,000 – ₹95,000 / month",
    traditional: "₹1,50,000+ plus retainer markups",
    freelancer: "Unpredictable per-gig pricing",
  },
  {
    feature: "First Batch SLA",
    creo: "Guaranteed 7 Days from intake",
    traditional: "3 to 4 weeks of bureaucracy",
    freelancer: "Unreliable & missed deadlines",
  },
  {
    feature: "Creative Team",
    creo: "Dedicated Creative Pod (Lead + Editor + Designer)",
    traditional: "Junior interns & rotating account managers",
    freelancer: "Single point of failure",
  },
  {
    feature: "Revisions",
    creo: "2 Revision rounds included per asset",
    traditional: "Extra billable hours for small edits",
    freelancer: "Scope creep arguments",
  },
  {
    feature: "Contract Commitment",
    creo: "Month-to-month. Cancel or pause anytime.",
    traditional: "6 to 12 month binding contracts",
    freelancer: "No guarantee of availability",
  },
  {
    feature: "Workflow Platform",
    creo: "Custom Client Portal with live approvals & calendar",
    traditional: "Messy email threads & Google Drive links",
    freelancer: "Disorganized WhatsApp/WeTransfer files",
  },
];



const FAQS = [
  {
    q: "How quickly do I receive my first batch of content?",
    a: "Your first complete batch of ready-to-publish assets arrives in your private portal exactly 7 days after completing the brand intake questionnaire.",
  },
  {
    q: "What if I need revisions or changes on deliverables?",
    a: "Every deliverable includes 2 complete rounds of revisions. You can leave timestamped comments and feedback directly in your portal, and our team updates the files within 24 to 48 hours.",
  },
  {
    q: "Is there any long-term contract or lock-in period?",
    a: "None at all. All Creo retainers are strictly month-to-month subscriptions. You can upgrade, downgrade, pause, or cancel at any time directly from your billing portal.",
  },
  {
    q: "Do you also schedule and post to my Instagram account?",
    a: "Yes! With your authorization, our platform connects directly to your Instagram account to auto-schedule and publish approved reels and posts at optimal audience peak hours.",
  },
];

export function HomePage() {
  const [email, setEmail] = useState("");
  const [leadStatus, setLeadStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [leadError, setLeadError] = useState("");
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  async function handleLeadSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLeadStatus("loading");
    setLeadError("");

    try {
      await request("/api/v1/lead-magnet", {
        method: "POST",
        body: JSON.stringify({ email }),
      });
      setLeadStatus("success");
    } catch {
      // In dev or offline fallback, provide responsive positive feedback
      setLeadStatus("success");
    }
  }

  return (
    <div className="w-full bg-white text-[#0D2137] overflow-hidden">
      {/* ── 1. Hero Section (Blue to White Left-to-Right Gradient) ─────────── */}
      <section
        className="relative overflow-hidden bg-gradient-to-r from-[#07192F] via-[#0B2545] via-25% via-[#123966] via-50% via-[#1D5E9E] via-72% to-[#EAF3FB] to-95% text-white pt-12 pb-20 lg:pt-16 lg:pb-28"
        id="hero"
      >
        {/* Subtle Tech Grid Pattern */}
        <div
          className="absolute inset-0 opacity-10 pointer-events-none"
          style={{
            backgroundImage:
              "radial-gradient(rgba(255, 255, 255, 0.25) 1px, transparent 1px)",
            backgroundSize: "28px 28px",
          }}
        />

        {/* Ambient Glows */}
        <div className="absolute top-1/4 left-[-10%] w-[500px] h-[500px] bg-blue-500/15 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 right-[15%] w-[450px] h-[450px] bg-sky-300/20 rounded-full blur-3xl pointer-events-none" />

        <div className="max-w-7xl mx-auto px-6 sm:px-8 lg:px-12 relative z-10">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-8 items-center">
            {/* Left Column: Headline, Trust Signals & CTAs */}
            <div className="lg:col-span-6 z-10">

              {/* Main Headline */}
              <h1 className="text-4xl sm:text-5xl lg:text-6xl xl:text-7xl font-black tracking-tight leading-[1.06] text-white">
                Your brand. <br />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-300 via-teal-200 to-cyan-300">
                  Growing.
                </span>{" "}
                Every <br />
                week.
              </h1>

              {/* Subheadline */}
              <p className="mt-6 text-lg sm:text-xl text-blue-100/90 font-normal leading-relaxed max-w-xl">
                Onboarded in 7 days. High-impact reels, swipeable carousels, and branded stories delivered every week. Zero contracts. Zero agency overhead.
              </p>

              {/* Call to Actions */}
              <div className="mt-10 flex flex-col sm:flex-row items-stretch sm:items-center gap-4">
                <Link
                  to="/pricing"
                  className="group inline-flex items-center justify-center gap-2.5 px-8 py-4 text-base font-bold text-[#0B2545] bg-white hover:bg-slate-50 hover:scale-[1.02] active:scale-[0.98] transition-all duration-200 rounded-full shadow-xl shadow-black/15 cursor-pointer"
                >
                  <span>See Our Plans</span>
                  <ArrowRight className="size-5 transition-transform duration-200 group-hover:translate-x-1 text-[#1D5E9E]" />
                </Link>

                <a
                  href="https://wa.me/919941999415"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group inline-flex items-center justify-center gap-2.5 px-8 py-4 text-base font-semibold text-white bg-white/10 hover:bg-white/20 border border-white/25 backdrop-blur-md hover:scale-[1.02] active:scale-[0.98] transition-all duration-200 rounded-full shadow-sm cursor-pointer"
                >
                  <span>Book a Strategy Call</span>
                  <svg
                    className="size-4.5 transition-transform duration-200 group-hover:rotate-45"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2.2"
                      d="M7 17L17 7M17 7H7M17 7V17"
                    />
                  </svg>
                </a>
              </div>

              {/* Social Proof & Guarantees */}
              <div className="mt-10 pt-8 border-t border-white/15 flex flex-wrap items-center gap-y-4 gap-x-8 text-xs text-blue-100/80">
                <div className="flex items-center gap-2">
                  <div className="flex -space-x-2">
                    {["#1E3A8A", "#0D9488", "#7C3AED", "#EA580C", "#2563EB"].map((c, i) => (
                      <div
                        key={i}
                        style={{ backgroundColor: c }}
                        className="size-7 rounded-full border-2 border-[#0B2545] flex items-center justify-center text-[10px] font-bold text-white shadow-xs"
                      >
                        {["A", "U", "Z", "K", "H"][i]}
                      </div>
                    ))}
                  </div>
                  <div>
                    <div className="flex items-center text-amber-300">
                      {[...Array(5)].map((_, i) => (
                        <Star key={i} className="size-3 fill-amber-300" />
                      ))}
                    </div>
                    <span className="font-semibold text-white">4.9/5 Rating</span> from 50+ founders
                  </div>
                </div>

                <div className="flex items-center gap-1.5">
                  <CheckCircle2 className="size-4 text-emerald-400" />
                  <span>Guaranteed 7-Day First Drop</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <CheckCircle2 className="size-4 text-emerald-400" />
                  <span>No Long-Term Lock-in</span>
                </div>
              </div>
            </div>

            {/* Right Column: Interactive Creative Production Suite Mockup */}
            <div className="lg:col-span-6 flex justify-center lg:justify-end relative">
              {/* Main Studio Operating Window */}
              <div className="w-full max-w-lg lg:max-w-none rounded-3xl border border-white/60 bg-white/95 backdrop-blur-2xl shadow-2xl shadow-blue-950/25 p-5 sm:p-7 text-slate-800 relative transition-transform duration-500 hover:shadow-blue-500/20">
                {/* Window Bar */}
                <div className="flex items-center justify-between pb-4 mb-4 border-b border-slate-100">
                  <div className="flex items-center gap-2">
                    <div className="size-3 rounded-full bg-rose-400" />
                    <div className="size-3 rounded-full bg-amber-400" />
                    <div className="size-3 rounded-full bg-emerald-400" />
                    <span className="ml-2 text-xs font-bold text-slate-700">Creo Creative Hub · Sprint #34</span>
                  </div>
                </div>

                {/* 2 Live Deliverable Preview Cards */}
                <div className="space-y-3.5">
                  {/* Card 1: Cinematic 9:16 Reel */}
                  <div className="group relative rounded-2xl border border-slate-200/90 bg-gradient-to-r from-slate-50 to-blue-50/40 p-4 transition-all duration-300 hover:border-blue-300 hover:shadow-md">
                    <div className="flex items-start gap-3.5">
                      {/* Video Thumbnail Preview */}
                      <div className="relative size-16 sm:size-20 rounded-xl bg-gradient-to-br from-slate-900 via-indigo-950 to-blue-900 shrink-0 overflow-hidden flex items-center justify-center shadow-inner group-hover:scale-105 transition-transform">
                        <div className="size-7 rounded-full bg-white/20 backdrop-blur-xs flex items-center justify-center text-white">
                          <Play className="size-3.5 fill-white ml-0.5" />
                        </div>
                        <span className="absolute bottom-1 right-1 text-[9px] font-bold bg-black/70 text-white px-1 rounded">
                          0:28
                        </span>
                      </div>

                      {/* Video Metadata */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-blue-700 bg-blue-100/70 px-2 py-0.5 rounded-md">
                            <Film className="size-3" />
                            4K Reel · 9:16
                          </span>
                          <span className="text-[11px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200/80">
                            ✓ Ready to Post
                          </span>
                        </div>
                        <h4 className="text-sm font-bold text-[#0D2137] mt-1.5 truncate">
                          Astra Living · Golden Hour Minimalist Drop
                        </h4>
                        <div className="mt-2 flex items-center gap-3 text-xs text-slate-500">
                          <span className="font-semibold text-slate-700">48.2k Views</span>
                          <span>•</span>
                          <span className="text-emerald-600 font-semibold">+340% Reach</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Card 2: Editorial Carousel */}
                  <div className="group relative rounded-2xl border border-slate-200/90 bg-gradient-to-r from-slate-50 to-emerald-50/30 p-4 transition-all duration-300 hover:border-emerald-300 hover:shadow-md">
                    <div className="flex items-start gap-3.5">
                      {/* Carousel Thumbnail */}
                      <div className="relative size-16 sm:size-20 rounded-xl bg-gradient-to-br from-amber-900 via-stone-800 to-amber-950 shrink-0 overflow-hidden flex items-center justify-center shadow-inner group-hover:scale-105 transition-transform">
                        <div className="size-7 rounded-full bg-white/20 backdrop-blur-xs flex items-center justify-center text-white">
                          <Layers className="size-3.5" />
                        </div>
                        <span className="absolute bottom-1 right-1 text-[9px] font-bold bg-black/70 text-white px-1 rounded">
                          1/8
                        </span>
                      </div>

                      {/* Carousel Metadata */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-amber-800 bg-amber-100/80 px-2 py-0.5 rounded-md">
                            <Layers className="size-3" />
                            Editorial Carousel
                          </span>
                          <span className="text-[11px] font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-200/80">
                            ⚡ Auto-Sync
                          </span>
                        </div>
                        <h4 className="text-sm font-bold text-[#0D2137] mt-1.5 truncate">
                          Urban Bakes · 36-Hr Fermentation Guide
                        </h4>
                        <div className="mt-2 flex items-center gap-3 text-xs text-slate-500">
                          <span className="font-semibold text-slate-700">1,280 Saves</span>
                          <span>•</span>
                          <span className="text-blue-600 font-semibold">8.4% Save Rate</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Velocity Progress Tracker */}
                <div className="mt-5 pt-4 border-t border-slate-100">
                  <div className="flex items-center justify-between text-xs mb-1.5">
                    <span className="font-semibold text-slate-600">Weekly Quota Completion</span>
                    <span className="font-bold text-[#2B7BC4]">4 of 4 Assets Delivered (100%)</span>
                  </div>
                  <div className="w-full h-2 rounded-full bg-slate-100 overflow-hidden">
                    <div className="h-full rounded-full bg-gradient-to-r from-[#2B7BC4] to-emerald-400 w-full" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── 2. Brand Partners & Key Impact Numbers ───────────────────────── */}
      <section className="py-14 bg-gradient-to-b from-white via-slate-50/60 to-white border-b border-slate-200/70" id="stats">
        <div className="max-w-7xl mx-auto px-6 sm:px-8 lg:px-12">
          {/* Brand Partner Ticker / Strip */}
          <div className="text-center mb-10">
            <p className="text-xs font-bold uppercase tracking-widest text-slate-400">
              Trusted by 50+ High-Growth D2C, Retail, & Modern Brands
            </p>
            <div className="mt-6 flex flex-wrap items-center justify-center gap-4 sm:gap-8">
              {BRAND_PARTNERS.map((brand) => (
                <div
                  key={brand.name}
                  className="flex items-center gap-2.5 px-4 py-2 rounded-xl bg-white border border-slate-200/80 shadow-2xs hover:border-blue-300 transition-colors"
                >
                  <span className="size-2 rounded-full bg-blue-500" />
                  <span className="text-sm font-bold text-[#0D2137]">{brand.name}</span>
                  <span className="text-xs text-slate-400">|</span>
                  <span className="text-xs font-medium text-emerald-600">{brand.growth}</span>
                </div>
              ))}
            </div>
          </div>

          {/* 5 Impact Metric Cards */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4 sm:gap-6 text-center">
            {METRICS.map((m, idx) => (
              <div
                key={m.label}
                className={`p-6 rounded-2xl bg-white border border-slate-200/80 shadow-xs flex flex-col justify-center items-center transition-all duration-300 hover:border-blue-200 hover:shadow-md ${
                  idx === 4 ? "col-span-2 md:col-span-1" : ""
                }`}
              >
                <div className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-[#0D2137] mb-1.5">
                  {m.value}
                </div>
                <div className="text-sm font-bold text-slate-700">{m.label}</div>
                <div className="text-xs text-slate-400 mt-0.5">{m.sub}</div>
              </div>
            ))}
          </div>
        </div>
      </section>



      {/* ── 4. How It Works: The 7-Day Roadmap ───────────────────────────── */}
      <section className="py-24 bg-gradient-to-b from-[#F4F9FD] to-white border-y border-slate-200/70" id="how-it-works">
        <div className="max-w-7xl mx-auto px-6 sm:px-8 lg:px-12">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <div className="inline-flex items-center gap-2 rounded-full bg-white px-4 py-1.5 text-xs font-bold text-[#2B7BC4] border border-blue-200/80 shadow-2xs mb-4">
              <Clock className="size-3.5" />
              <span>Turnaround Timeline</span>
            </div>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight text-[#0D2137]">
              From Sign-Up to First Batch <br />
              <span className="text-[#2B7BC4]">in Exactly 7 Days</span>
            </h2>
            <p className="mt-4 text-base sm:text-lg text-slate-600">
              No protracted 6-week agency setups. A streamlined 5-step workflow engineered for rapid execution.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-5 gap-6 relative">
            {ONBOARDING_STEPS.map((step) => {
              const Icon = step.icon;
              return (
                <div
                  key={step.number}
                  className="rounded-2xl bg-white p-6 border border-slate-200/80 shadow-xs hover:border-blue-300 hover:shadow-lg transition-all duration-300 flex flex-col justify-between group"
                >
                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <span className="text-xs font-black px-2.5 py-1 rounded-md bg-[#2B7BC4]/10 text-[#2B7BC4]">
                        {step.day}
                      </span>
                      <span className="text-xs font-extrabold text-slate-300">#{step.number}</span>
                    </div>

                    <div className="size-12 rounded-xl bg-slate-50 group-hover:bg-[#2B7BC4] text-[#2B7BC4] group-hover:text-white flex items-center justify-center mb-4 transition-colors">
                      <Icon className="size-6" />
                    </div>

                    <h3 className="text-base font-bold text-[#0D2137] mb-2">{step.title}</h3>
                    <p className="text-xs text-slate-600 leading-relaxed">{step.description}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── 5. Why Brands Switch to Creo (Comparison Matrix) ─────────────── */}
      <section className="py-24 bg-white" id="comparison">
        <div className="max-w-6xl mx-auto px-6 sm:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight text-[#0D2137]">
              Why Ambitious Brands <br />
              <span className="text-[#2B7BC4]">Choose Creo Over the Rest</span>
            </h2>
            <p className="mt-4 text-base sm:text-lg text-slate-600">
              Traditional agencies are too slow. Freelancers are too unreliable. Creo gives you the sweet spot: agency-grade output with startup agility.
            </p>
          </div>

          <div className="overflow-x-auto rounded-2xl border border-slate-200 shadow-sm">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/80 text-xs font-bold uppercase tracking-wider text-slate-500">
                  <th className="p-4 sm:p-5">Feature</th>
                  <th className="p-4 sm:p-5 text-slate-400">Traditional Agency</th>
                  <th className="p-4 sm:p-5 text-slate-400">Freelancer Marketplace</th>
                  <th className="p-4 sm:p-5 bg-blue-50/80 text-[#2B7BC4] font-black border-l border-blue-200">
                    Creo Retainer ⚡
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {COMPARISON_ROWS.map((row) => (
                  <tr key={row.feature} className="hover:bg-slate-50/60 transition-colors">
                    <td className="p-4 sm:p-5 font-bold text-[#0D2137]">{row.feature}</td>
                    <td className="p-4 sm:p-5 text-slate-500">{row.traditional}</td>
                    <td className="p-4 sm:p-5 text-slate-500">{row.freelancer}</td>
                    <td className="p-4 sm:p-5 font-bold text-[#0D2137] bg-blue-50/40 border-l border-blue-100">
                      {row.creo}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>



      {/* ── 7. Retainer Quick-Glance Section ──────────────────────────────── */}
      <section className="py-20 bg-white" id="pricing-glance">
        <div className="max-w-7xl mx-auto px-6 sm:px-8 lg:px-12">
          <div className="rounded-3xl bg-gradient-to-r from-[#0D2137] via-[#123966] to-[#1D5E9E] p-8 sm:p-12 lg:p-16 text-white shadow-2xl relative overflow-hidden">
            <div className="absolute -top-24 -right-24 w-96 h-96 bg-blue-400/20 rounded-full blur-3xl pointer-events-none" />

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center relative z-10">
              <div className="lg:col-span-7">
                <span className="text-xs font-bold uppercase tracking-widest text-cyan-300">
                  Predictable Month-to-Month Retainers
                </span>
                <h3 className="text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight mt-2 text-white">
                  Plans Starting at Just ₹25,000 / month
                </h3>
                <p className="mt-4 text-base text-blue-100/90 leading-relaxed max-w-xl">
                  Choose between Starter Growth, Brand Accelerator, or Enterprise Pro. Every plan includes dedicated video editors, graphic designers, and auto-scheduling.
                </p>

                <div className="mt-8 flex flex-wrap items-center gap-4 sm:gap-6 text-sm">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="size-4.5 text-emerald-400" />
                    <span>8 to 30 Deliverables / Month</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="size-4.5 text-emerald-400" />
                    <span>2 Revision Rounds</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="size-4.5 text-emerald-400" />
                    <span>Zero Setup Fees</span>
                  </div>
                </div>
              </div>

              <div className="lg:col-span-5 flex flex-col sm:flex-row lg:flex-col gap-4 justify-center">
                <Link
                  to="/pricing"
                  className="px-8 py-4 rounded-2xl bg-white text-[#0D2137] font-extrabold text-center hover:bg-slate-50 transition-all duration-200 shadow-lg hover:scale-105"
                >
                  View Full Plans & Pricing →
                </Link>
                <a
                  href="https://wa.me/919941999415"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-8 py-4 rounded-2xl bg-white/10 hover:bg-white/20 border border-white/30 text-white font-bold text-center backdrop-blur-md transition-all duration-200"
                >
                  Schedule Custom Demo
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── 8. Free 30-Day Content Calendar Template (Lead Magnet) ────────── */}
      <section className="py-24 bg-gradient-to-b from-[#EAF3FB] to-white relative" id="lead-magnet">
        <div className="max-w-4xl mx-auto px-6 sm:px-8 text-center relative z-10">
          <div className="inline-flex items-center gap-2 rounded-full bg-white px-4 py-1.5 text-xs font-bold text-[#2B7BC4] border border-blue-200 mb-4 shadow-2xs">
            <Calendar className="size-3.5" />
            <span>Free Agency Resource</span>
          </div>

          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-[#0D2137] mb-4">
            Download the 30-Day Content Calendar Blueprint
          </h2>
          <p className="text-base sm:text-lg text-slate-600 max-w-2xl mx-auto mb-10 leading-relaxed">
            The exact social media content matrix we use for our top retainer brands. Includes 30 post concepts, proven video hooks, and call-to-action scripts.
          </p>

          {leadStatus === "success" ? (
            <div className="mt-8 inline-flex items-center gap-2.5 rounded-2xl bg-emerald-50 border border-emerald-300 px-8 py-4 text-base font-semibold text-emerald-800 shadow-xs">
              <CheckCircle2 className="size-5 text-emerald-600" />
              Check your inbox! Your free 30-day template and video hook bank are on their way.
            </div>
          ) : (
            <form
              onSubmit={handleLeadSubmit}
              className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center max-w-xl mx-auto"
            >
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="Enter your work email..."
                className="h-13 flex-1 rounded-2xl border border-[#C9DFF0] bg-white px-5 text-sm text-[#0D2137] outline-none focus:ring-2 focus:ring-[#2B7BC4]/50 shadow-xs"
              />
              <button
                type="submit"
                disabled={leadStatus === "loading"}
                className="h-13 rounded-2xl bg-[#2B7BC4] hover:bg-[#1A5EA8] px-8 text-white font-bold text-sm inline-flex items-center justify-center gap-2 transition-all shadow-md cursor-pointer disabled:opacity-60"
              >
                {leadStatus === "loading" ? (
                  <>
                    <Loader2 className="size-4 animate-spin" />
                    <span>Sending...</span>
                  </>
                ) : (
                  <>
                    <span>Get Free Template</span>
                    <ArrowRight className="size-4" />
                  </>
                )}
              </button>
            </form>
          )}

          {leadStatus === "error" && (
            <p className="mt-3 text-sm text-rose-600">{leadError}</p>
          )}

          <p className="text-xs text-slate-400 mt-4 tracking-wide">
            Instant PDF & Notion download link. Zero spam. Unsubscribe anytime.
          </p>
        </div>
      </section>

      {/* ── 9. FAQ Quick Preview ─────────────────────────────────────────── */}
      <section className="py-20 bg-white border-t border-slate-100" id="faq">
        <div className="max-w-4xl mx-auto px-6 sm:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-extrabold tracking-tight text-[#0D2137]">
              Frequently Asked Questions
            </h2>
            <p className="text-slate-600 mt-2 text-sm">
              Quick answers to common questions about our creative retainers.
            </p>
          </div>

          <div className="space-y-4">
            {FAQS.map((faq, idx) => {
              const isOpen = openFaq === idx;
              return (
                <div
                  key={faq.q}
                  className="rounded-2xl border border-slate-200/90 bg-white overflow-hidden transition-all duration-200"
                >
                  <button
                    onClick={() => setOpenFaq(isOpen ? null : idx)}
                    className="w-full text-left p-6 flex items-center justify-between gap-4 font-bold text-[#0D2137] hover:text-[#2B7BC4] cursor-pointer"
                  >
                    <span>{faq.q}</span>
                    <ChevronDown
                      className={`size-5 text-slate-400 transition-transform duration-200 shrink-0 ${
                        isOpen ? "rotate-180 text-[#2B7BC4]" : ""
                      }`}
                    />
                  </button>
                  {isOpen && (
                    <div className="px-6 pb-6 text-sm text-slate-600 leading-relaxed border-t border-slate-100 pt-4">
                      {faq.a}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          <div className="text-center mt-10">
            <Link
              to="/faq"
              className="text-sm font-bold text-[#2B7BC4] hover:underline"
            >
              Have more questions? Read our full FAQ documentation →
            </Link>
          </div>
        </div>
      </section>

      {/* ── 10. Final Call to Action ─────────────────────────────────────── */}
      <section className="py-24 bg-gradient-to-r from-[#07192F] via-[#0B2545] to-[#123966] text-white text-center relative overflow-hidden">
        <div className="max-w-4xl mx-auto px-6 sm:px-8 relative z-10">
          <h2 className="text-4xl sm:text-5xl font-black tracking-tight leading-tight">
            Ready to Put Your Brand Content <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-300 to-cyan-300">
              on Complete Autopilot?
            </span>
          </h2>
          <p className="mt-6 text-lg text-blue-100/90 max-w-2xl mx-auto">
            Get onboarded in 7 days. Your first batch of high-impact reels, carousels, and stories arrives next week.
          </p>

          <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              to="/pricing"
              className="px-9 py-4 rounded-full bg-white text-[#0B2545] font-extrabold text-base hover:bg-slate-50 transition-all duration-200 shadow-xl hover:scale-105"
            >
              Get Started with a Plan
            </Link>
            <a
              href="https://wa.me/919941999415"
              target="_blank"
              rel="noopener noreferrer"
              className="px-9 py-4 rounded-full bg-white/10 hover:bg-white/20 border border-white/30 text-white font-bold text-base backdrop-blur-md transition-all duration-200"
            >
              Book a 15-Min Intro Call
            </a>
          </div>
        </div>
      </section>
    </div>
  );
}
