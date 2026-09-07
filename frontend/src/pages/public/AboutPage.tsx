import { Link } from "react-router";
import {
  Target,
  Users,
  TrendingUp,
  HeartHandshake,
  BarChart3,
  Megaphone,
  ArrowRight,
  Sparkles,
  CheckCircle2,
  Clock,
  Shield,
} from "lucide-react";

const DIFFERENTIATORS = [
  {
    icon: Target,
    title: "Results-First Strategy",
    description:
      "Every piece of content is tied to a measurable growth metric — not just aesthetics.",
    accent: "from-sky-500 to-blue-600",
  },
  {
    icon: Users,
    title: "Dedicated Brand Team",
    description:
      "You get a consistent team that learns your voice, not a rotating pool of freelancers.",
    accent: "from-violet-500 to-purple-600",
  },
  {
    icon: TrendingUp,
    title: "Weekly Content Cadence",
    description:
      "Fresh, on-brand content delivered every single week — no gaps, no guesswork.",
    accent: "from-emerald-500 to-green-600",
  },
  {
    icon: HeartHandshake,
    title: "Transparent Collaboration",
    description:
      "Real-time portal access, live calendars, and direct chat with your team.",
    accent: "from-amber-500 to-orange-600",
  },
  {
    icon: BarChart3,
    title: "Data-Driven Iteration",
    description:
      "We track what works and double down — your strategy evolves with your audience.",
    accent: "from-rose-500 to-pink-600",
  },
  {
    icon: Megaphone,
    title: "Full-Stack Marketing",
    description:
      "From social media to paid ads to content strategy — one partner, zero silos.",
    accent: "from-cyan-500 to-teal-600",
  },
];

const TEAM = [
  {
    name: "Ashok Kumar",
    role: "Founder & Creative Director",
    description:
      "Visionary behind Creo's growth-first philosophy. Combines strategic thinking with creative execution to deliver measurable brand transformations.",
    initials: "AK",
    gradient: "from-[#2B7BC4] to-indigo-600",
  },
  {
    name: "Creative Strategy Team",
    role: "Content & Brand Design",
    description:
      "A focused unit of brand designers, motion editors, and copywriters who learn your voice and deliver consistent, high-impact content every week.",
    initials: "CS",
    gradient: "from-violet-500 to-purple-600",
  },
  {
    name: "Growth & Analytics Team",
    role: "Performance & ROI",
    description:
      "Performance marketing specialists driving ROI-focused strategies across paid and organic channels with real-time analytics dashboards.",
    initials: "GA",
    gradient: "from-emerald-500 to-teal-600",
  },
];

const TRUST_METRICS = [
  { value: "50+", label: "Active Retainer Brands" },
  { value: "3+", label: "Years of Execution" },
  { value: "98%", label: "Content Approval Rate" },
  { value: "7 Day", label: "Avg. First Delivery" },
];

export function AboutPage() {
  return (
    <div className="w-full">
      {/* ── Hero Section ─────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden bg-gradient-to-b from-[#E8F4FD] via-[#F0F7FD] to-white">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-[#2B7BC4]/5 rounded-full blur-3xl pointer-events-none" />
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-20 sm:py-28 relative z-10">
          <div className="mx-auto max-w-3xl text-center">
            <div className="inline-flex items-center gap-2 rounded-full bg-white px-4 py-1.5 text-xs font-semibold text-[#2B7BC4] shadow-sm border border-[#C9DFF0] mb-6">
              <Sparkles className="size-3.5" />
              Building Brands Since 2023
            </div>
            <h1 className="text-4xl font-extrabold tracking-tight text-[#0D2137] sm:text-6xl">
              We don&apos;t just market brands.
              <br />
              <span className="text-[#2B7BC4]">We grow them.</span>
            </h1>
            <p className="mt-6 text-lg leading-relaxed text-slate-600 sm:text-xl max-w-2xl mx-auto">
              Creo exists because every business deserves a growth partner — not
              just a vendor. We started with a simple belief: consistent,
              high-quality content delivered on time can transform a brand.
            </p>
          </div>
        </div>
      </section>

      {/* ── Trust Metrics Strip ──────────────────────────────────────────── */}
      <section className="py-12 border-b border-[#C9DFF0] bg-white">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {TRUST_METRICS.map((m) => (
              <div
                key={m.label}
                className="text-center p-4 rounded-2xl bg-[#E8F4FD]/40 border border-[#C9DFF0]/50"
              >
                <div className="text-3xl sm:text-4xl font-extrabold text-[#0D2137] tracking-tight">
                  {m.value}
                </div>
                <div className="text-xs sm:text-sm font-medium text-slate-600 mt-1">
                  {m.label}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Mission Statement ────────────────────────────────────────────── */}
      <section className="bg-white py-16 sm:py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-3xl text-center">
            <span className="text-xs font-bold uppercase tracking-widest text-[#2B7BC4]">
              Our Mission
            </span>
            <h2 className="mt-3 text-3xl font-extrabold tracking-tight text-[#0D2137] sm:text-4xl">
              Why we exist — not just what we do
            </h2>
            <p className="mt-6 text-lg leading-relaxed text-slate-600">
              Most businesses know they need to post on social media. Few know
              how to do it consistently, on-brand, and with real strategy behind
              it. Creo bridges that gap. We combine creative firepower with
              growth thinking so that every reel, every post, every story moves
              your brand forward.
            </p>
            <p className="mt-4 text-lg leading-relaxed text-slate-600">
              We&apos;re not here to sell you vanity metrics. We&apos;re here
              to build something that lasts — a brand people remember, a
              presence people trust, and results you can actually see.
            </p>
          </div>

          {/* Core Commitments */}
          <div className="mt-14 grid grid-cols-1 sm:grid-cols-3 gap-6 max-w-4xl mx-auto">
            {[
              { icon: Clock, title: "7-Day Onboarding", desc: "From sign-up to first content delivery in one week" },
              { icon: Shield, title: "No Lock-In Contracts", desc: "Monthly retainers. Cancel anytime. We earn your trust." },
              { icon: CheckCircle2, title: "2 Revision Rounds", desc: "Every deliverable comes with built-in revision cycles" },
            ].map((item) => (
              <div
                key={item.title}
                className="flex items-start gap-3 p-5 rounded-2xl border border-[#C9DFF0]/50 bg-[#E8F4FD]/20 hover:bg-[#E8F4FD]/40 transition-colors"
              >
                <div className="size-10 shrink-0 rounded-xl bg-[#2B7BC4]/10 text-[#2B7BC4] flex items-center justify-center">
                  <item.icon className="size-5" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-[#0D2137]">{item.title}</h4>
                  <p className="text-xs text-slate-600 mt-0.5 leading-relaxed">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Differentiators ──────────────────────────────────────────────── */}
      <section className="bg-[#F8F9FA] py-16 sm:py-24 border-y border-[#C9DFF0]/50">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <span className="text-xs font-bold uppercase tracking-widest text-[#2B7BC4]">
              Why Creo
            </span>
            <h2 className="mt-3 text-3xl font-extrabold tracking-tight text-[#0D2137] sm:text-4xl">
              What makes us different
            </h2>
            <p className="mt-3 text-base text-slate-600 sm:text-lg">
              We&apos;re built for businesses that want measurable results, not
              just posts.
            </p>
          </div>

          <div className="mt-14 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {DIFFERENTIATORS.map((item, idx) => (
              <div
                key={item.title}
                className="group rounded-3xl border border-[#C9DFF0] bg-white p-7 transition-all duration-300 hover:-translate-y-1 hover:shadow-xl"
              >
                <div className={`mb-5 flex size-12 items-center justify-center rounded-2xl bg-gradient-to-br ${item.accent} text-white shadow-md transition-transform duration-300 group-hover:scale-110 ${idx % 2 === 0 ? "group-hover:rotate-3" : "group-hover:-rotate-3"}`}>
                  <item.icon className="size-6" />
                </div>
                <h3 className="text-lg font-bold text-[#0D2137] group-hover:text-[#2B7BC4] transition-colors">
                  {item.title}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-slate-600">
                  {item.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Team Section ─────────────────────────────────────────────────── */}
      <section className="bg-white py-16 sm:py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <span className="text-xs font-bold uppercase tracking-widest text-[#2B7BC4]">
              Our Team
            </span>
            <h2 className="mt-3 text-3xl font-extrabold tracking-tight text-[#0D2137] sm:text-4xl">
              The people behind your growth
            </h2>
            <p className="mt-3 text-base text-slate-600 sm:text-lg">
              Small team. Big experience. Obsessed with your results.
            </p>
          </div>

          <div className="mt-14 grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
            {TEAM.map((member) => (
              <div
                key={member.name}
                className="group rounded-3xl border border-[#C9DFF0] bg-white p-7 text-center transition-all duration-300 hover:-translate-y-1 hover:shadow-xl"
              >
                <div className={`mx-auto mb-5 flex size-20 items-center justify-center rounded-2xl bg-gradient-to-br ${member.gradient} text-white shadow-lg transition-transform duration-300 group-hover:scale-110 group-hover:rotate-3`}>
                  <span className="text-xl font-black tracking-wider">
                    {member.initials}
                  </span>
                </div>
                <h3 className="text-lg font-bold text-[#0D2137]">
                  {member.name}
                </h3>
                <p className="text-xs font-semibold text-[#2B7BC4] mt-0.5">
                  {member.role}
                </p>
                <p className="mt-3 text-sm leading-relaxed text-slate-600">
                  {member.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Bottom CTA ───────────────────────────────────────────────────── */}
      <section className="bg-[#0D2137] py-16 sm:py-20 text-white">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl font-extrabold tracking-tight text-white sm:text-4xl">
            Ready to grow your brand?
          </h2>
          <p className="mt-4 text-base sm:text-lg text-white/70 max-w-xl mx-auto">
            Join 50+ businesses that chose Creo as their dedicated growth partner.
          </p>
          <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              to="/pricing"
              className="inline-flex items-center justify-center gap-2 bg-white text-[#0D2137] hover:bg-slate-100 rounded-xl h-12 px-8 text-sm font-bold transition-all shadow-md w-full sm:w-auto"
            >
              Explore Our Retainer Plans
              <ArrowRight className="size-4" />
            </Link>
            <a
              href="https://wa.me/919941999415"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center bg-[#2B7BC4] text-white hover:bg-[#2B7BC4]/90 rounded-xl h-12 px-8 text-sm font-bold transition-all shadow-md w-full sm:w-auto"
            >
              Speak with Ashok
            </a>
          </div>
        </div>
      </section>
    </div>
  );
}
