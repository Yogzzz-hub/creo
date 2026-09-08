import { Link } from "react-router";
import { useQuery } from "@tanstack/react-query";
import {
  Check,
  Shield,
  Zap,
  Clock,
  Sparkles,
  Star,
  ArrowRight,
} from "lucide-react";
import { request } from "../../lib/http";

interface Plan {
  id: string;
  name: string;
  display_name: string;
  price_minor: number;
  currency: string;
  monthly_price: number;
  poster_quota: number;
  reel_quota: number;
  story_quota: number;
  revision_rounds: number;
  has_dedicated_manager: boolean;
  highlights: string[];
  is_recommended: boolean;
}

const CANONICAL_FALLBACK_PLANS: Plan[] = [
  {
    id: "starter",
    name: "starter",
    display_name: "Starter Growth",
    price_minor: 2500000,
    currency: "INR",
    monthly_price: 25000,
    poster_quota: 8,
    reel_quota: 4,
    story_quota: 10,
    revision_rounds: 1,
    has_dedicated_manager: false,
    highlights: [
      "8 Static brand posters (1:1 & 4:5)",
      "4 High-impact 9:16 mobile reels",
      "10 Story creatives with engagement stickers",
      "1 Round of creative revisions",
      "Instagram auto-scheduling & dispatch",
      "Live analytics dashboard access",
    ],
    is_recommended: false,
  },
  {
    id: "growth",
    name: "growth",
    display_name: "Brand Accelerator",
    price_minor: 5000000,
    currency: "INR",
    monthly_price: 50000,
    poster_quota: 15,
    reel_quota: 8,
    story_quota: 20,
    revision_rounds: 2,
    has_dedicated_manager: true,
    highlights: [
      "15 Static brand posters (multi-format)",
      "8 Cinematic 9:16 reels with audio sync",
      "20 Interactive story creatives",
      "2 Rounds of creative revisions",
      "Dedicated creative director & copywriter",
      "Instagram & Facebook cross-publishing",
      "Weekly performance reviews & hashtag matrix",
    ],
    is_recommended: true,
  },
  {
    id: "pro",
    name: "pro",
    display_name: "Enterprise Domination",
    price_minor: 9500000,
    currency: "INR",
    monthly_price: 95000,
    poster_quota: 30,
    reel_quota: 16,
    story_quota: 40,
    revision_rounds: 3,
    has_dedicated_manager: true,
    highlights: [
      "30 Static brand posters & custom carousel decks",
      "16 High-production 4K reels & UGC composites",
      "40 Story creatives & interactive poll sets",
      "3 Rounds of creative revisions",
      "Dedicated Senior Account Director & VFX lead",
      "Multichannel distribution & ad asset prep",
      "On-demand custom revisions & priority 24h turnaround",
    ],
    is_recommended: false,
  },
];

function formatPrice(price: number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(price);
}

export function PricingPage() {
  const { data: serverPlans } = useQuery<Plan[]>({
    queryKey: ["public-plans"],
    queryFn: () => request<Plan[]>("/api/v1/payments/plans"),
  });

  const rawPlans = (serverPlans && serverPlans.length > 0) ? serverPlans : CANONICAL_FALLBACK_PLANS;
  const plans = rawPlans.filter((p) => ["starter", "growth", "pro"].includes(p.name));

  return (
    <div className="w-full bg-[#FAFAF8] text-[#14171C]">
      {/* ── Hero Section ─────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden bg-gradient-to-b from-[#E8F4FD] via-[#F4F9FD] to-[#FAFAF8] pt-10 pb-10 sm:pt-14 sm:pb-12">
        {/* Glow backdrop */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[700px] h-[350px] bg-blue-400/15 rounded-full blur-3xl pointer-events-none" />

        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 relative z-10 text-center">
          <div className="inline-flex items-center gap-2 rounded-full bg-[#2B7BC4]/10 border border-[#2B7BC4]/20 px-3.5 py-1 text-xs font-bold text-[#2B7BC4] mb-3.5 shadow-2xs">
            <Sparkles className="size-3.5 text-[#2B7BC4]" />
            <span>Transparent Creative Retainers</span>
          </div>

          <h1 className="text-3xl font-black tracking-tight text-[#0D2137] sm:text-5xl max-w-3xl mx-auto leading-[1.15]">
            Predictable Pricing for <br />
            <span className="bg-clip-text text-transparent bg-gradient-to-r from-[#2B7BC4] to-[#1F5C96]">
              Explosive Social Growth
            </span>
          </h1>

          <p className="mt-4 text-sm sm:text-base leading-relaxed text-slate-600 max-w-2xl mx-auto font-normal">
            Fixed monthly investment. Zero hidden agency markups. Dedicated creative teams delivering brand-defining reels, posters, and stories every week.
          </p>

          <div className="mt-6 flex flex-wrap items-center justify-center gap-5 text-xs sm:text-sm font-semibold text-slate-600">
            <span className="flex items-center gap-1.5">
              <Check className="size-4 text-emerald-600" />
              Cancel Anytime
            </span>
            <span className="flex items-center gap-1.5">
              <Check className="size-4 text-emerald-600" />
              Onboarded in 7 Days
            </span>
            <span className="flex items-center gap-1.5">
              <Check className="size-4 text-emerald-600" />
              Full Commercial Ownership
            </span>
          </div>
        </div>
      </section>

      {/* ── Pricing Cards Grid ────────────────────────────────────────────── */}
      <section id="plans" className="pb-16 sm:pb-20 relative z-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid gap-8 lg:grid-cols-3 items-stretch">
            {plans.map((plan) => {
              const highlights = plan.highlights ?? [];
              const isRec = plan.is_recommended;
              const price = plan.monthly_price || (plan.price_minor ? plan.price_minor / 100 : 25000);

              return (
                <div
                  key={plan.id}
                  className={`relative flex flex-col justify-between rounded-3xl border-2 bg-white transition-all duration-300 hover:-translate-y-1.5 ${
                    isRec
                      ? "border-[#2B7BC4] shadow-2xl shadow-blue-500/15 ring-2 ring-[#2B7BC4]/30"
                      : "border-slate-200/90 shadow-lg shadow-black/5 hover:border-[#2B7BC4]/60"
                  }`}
                >
                  {isRec && (
                    <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 rounded-full bg-gradient-to-r from-[#2B7BC4] to-[#1F5C96] px-4 py-1 text-[11px] font-extrabold uppercase tracking-wider text-white shadow-md flex items-center gap-1.5">
                      <Star className="size-3 fill-amber-300 text-amber-300" />
                      Most Popular
                    </div>
                  )}

                  <div className="p-8">
                    {/* Header */}
                    <div className="mb-4">
                      <p className="text-xs font-bold uppercase tracking-wider text-[#2B7BC4]">
                        {plan.name === "pro" ? "Scale & Enterprise" : plan.name === "growth" ? "High Growth" : "Starter"}
                      </p>
                      <h3 className="text-2xl sm:text-3xl font-black text-[#0D2137] mt-1 tracking-tight">
                        {plan.display_name}
                      </h3>
                    </div>

                    {/* Price */}
                    <div className="flex items-baseline gap-1 my-6 pb-6 border-b border-slate-100">
                      <span className="text-4xl sm:text-5xl font-black text-[#0D2137] tracking-tight">
                        {formatPrice(price)}
                      </span>
                      <span className="text-sm font-medium text-slate-500"> / month</span>
                    </div>

                    {/* Production Quota Strip */}
                    <div className="rounded-2xl bg-blue-50/50 border border-blue-100/60 p-4 mb-6 space-y-2">
                      <p className="text-[11px] font-bold uppercase tracking-wider text-[#2B7BC4]">
                        Monthly Production Allocation
                      </p>
                      <div className="grid grid-cols-3 gap-2 text-center">
                        <div className="bg-white rounded-xl p-2 border border-blue-100/40">
                          <p className="text-lg font-black text-[#0D2137]">{plan.poster_quota}</p>
                          <p className="text-[10px] text-slate-500 font-medium">Posters</p>
                        </div>
                        <div className="bg-white rounded-xl p-2 border border-blue-100/40">
                          <p className="text-lg font-black text-[#2B7BC4]">{plan.reel_quota}</p>
                          <p className="text-[10px] text-slate-500 font-medium">Reels</p>
                        </div>
                        <div className="bg-white rounded-xl p-2 border border-blue-100/40">
                          <p className="text-lg font-black text-[#0D2137]">{plan.story_quota}</p>
                          <p className="text-[10px] text-slate-500 font-medium">Stories</p>
                        </div>
                      </div>
                    </div>

                    {/* Feature List */}
                    <ul className="space-y-3.5 text-xs sm:text-sm text-slate-700">
                      {highlights.map((item) => (
                        <li key={item} className="flex items-start gap-3 leading-relaxed">
                          <div className="size-4 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0 mt-0.5 border border-emerald-200">
                            <Check className="size-3" />
                          </div>
                          <span>{item}</span>
                        </li>
                      ))}
                      <li className="flex items-start gap-3 leading-relaxed font-medium text-[#0D2137]">
                        <div className="size-4 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0 mt-0.5 border border-emerald-200">
                          <Check className="size-3" />
                        </div>
                        <span>{plan.revision_rounds} creative revision round{plan.revision_rounds !== 1 ? "s" : ""} included</span>
                      </li>
                      {plan.has_dedicated_manager && (
                        <li className="flex items-start gap-3 leading-relaxed font-semibold text-[#2B7BC4]">
                          <div className="size-4 rounded-full bg-blue-50 text-[#2B7BC4] flex items-center justify-center shrink-0 mt-0.5 border border-blue-200">
                            <Check className="size-3" />
                          </div>
                          <span>Dedicated Brand Account Director</span>
                        </li>
                      )}
                    </ul>
                  </div>

                  {/* Card CTA */}
                  <div className="p-8 pt-0">
                    <Link
                      to={`/signup?plan=${plan.name}`}
                      className={`w-full py-4 flex items-center justify-center gap-2 rounded-2xl text-sm font-bold transition-all shadow-md cursor-pointer ${
                        isRec
                          ? "bg-gradient-to-r from-[#2B7BC4] to-[#1E609A] text-white hover:from-[#246bb0] hover:to-[#174e7e] shadow-blue-500/25 active:scale-[0.98]"
                          : "bg-[#0D2137] text-white hover:bg-slate-800 shadow-slate-900/10 active:scale-[0.98]"
                      }`}
                    >
                      <span>Choose {plan.display_name}</span>
                      <ArrowRight className="size-4" />
                    </Link>
                    <p className="text-[11px] text-slate-400 text-center mt-2.5">
                      Instant onboarding access • No lock-in
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── Feature Comparison Matrix ────────────────────────────────────── */}
      <section className="bg-white py-12 sm:py-16 border-y border-slate-200/80">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-8">
            <h2 className="text-2xl sm:text-3xl font-bold text-[#0D2137] tracking-tight">
              Compare Retainer Inclusions
            </h2>
            <p className="text-slate-500 text-xs sm:text-sm mt-1.5">
              Everything required to transform your brand into a recognized category leader.
            </p>
          </div>

          <div className="overflow-x-auto rounded-3xl border border-slate-200 shadow-xs">
            <table className="w-full text-left text-xs sm:text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/75">
                  <th className="py-4 px-6 font-bold text-[#0D2137]">Feature & SLA</th>
                  <th className="py-4 px-4 font-bold text-[#0D2137] text-center">Starter Growth</th>
                  <th className="py-4 px-4 font-bold text-[#2B7BC4] text-center">Brand Accelerator</th>
                  <th className="py-4 px-4 font-bold text-[#0D2137] text-center">Enterprise Domination</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                <tr>
                  <td className="py-4 px-6 font-medium text-slate-700">Monthly High-Impact Reels</td>
                  <td className="py-4 px-4 text-center font-bold text-slate-800">4</td>
                  <td className="py-4 px-4 text-center font-bold text-[#2B7BC4]">8</td>
                  <td className="py-4 px-4 text-center font-bold text-slate-800">16</td>
                </tr>
                <tr>
                  <td className="py-4 px-6 font-medium text-slate-700">Monthly Static Brand Posters</td>
                  <td className="py-4 px-4 text-center font-bold text-slate-800">8</td>
                  <td className="py-4 px-4 text-center font-bold text-[#2B7BC4]">15</td>
                  <td className="py-4 px-4 text-center font-bold text-slate-800">30</td>
                </tr>
                <tr>
                  <td className="py-4 px-6 font-medium text-slate-700">Story Creatives & Stickers</td>
                  <td className="py-4 px-4 text-center font-bold text-slate-800">10</td>
                  <td className="py-4 px-4 text-center font-bold text-[#2B7BC4]">20</td>
                  <td className="py-4 px-4 text-center font-bold text-slate-800">40</td>
                </tr>
                <tr>
                  <td className="py-4 px-6 font-medium text-slate-700">Revision Rounds per Batch</td>
                  <td className="py-4 px-4 text-center text-slate-600">1 Round</td>
                  <td className="py-4 px-4 text-center font-semibold text-[#2B7BC4]">2 Rounds</td>
                  <td className="py-4 px-4 text-center font-semibold text-slate-800">3 Rounds</td>
                </tr>
                <tr>
                  <td className="py-4 px-6 font-medium text-slate-700">Direct Instagram Auto-Publishing</td>
                  <td className="py-4 px-4 text-center text-emerald-600 font-bold">✓</td>
                  <td className="py-4 px-4 text-center text-emerald-600 font-bold">✓</td>
                  <td className="py-4 px-4 text-center text-emerald-600 font-bold">✓</td>
                </tr>
                <tr>
                  <td className="py-4 px-6 font-medium text-slate-700">Dedicated Account Manager</td>
                  <td className="py-4 px-4 text-center text-slate-300">—</td>
                  <td className="py-4 px-4 text-center text-emerald-600 font-bold">✓</td>
                  <td className="py-4 px-4 text-center text-emerald-600 font-bold">✓</td>
                </tr>
                <tr>
                  <td className="py-4 px-6 font-medium text-slate-700">Turnaround SLA</td>
                  <td className="py-4 px-4 text-center text-slate-600">3 Business Days</td>
                  <td className="py-4 px-4 text-center font-semibold text-[#2B7BC4]">2 Business Days</td>
                  <td className="py-4 px-4 text-center font-semibold text-slate-800">24h Priority</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* ── Trust & Security Triggers ─────────────────────────────────────── */}
      <section className="py-12 sm:py-14 bg-[#F4F9FD]">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            <div className="flex items-start gap-4 rounded-2xl bg-white p-6 border border-slate-200/80 shadow-xs">
              <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-[#2B7BC4]">
                <Clock className="size-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-[#0D2137]">Guaranteed Weekly Cadence</h3>
                <p className="mt-1 text-xs text-slate-500 leading-relaxed">
                  Never miss an algorithm peak. Consistent drops scheduled straight to your calendar.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-4 rounded-2xl bg-white p-6 border border-slate-200/80 shadow-xs">
              <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
                <Shield className="size-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-[#0D2137]">Commercial Rights</h3>
                <p className="mt-1 text-xs text-slate-500 leading-relaxed">
                  100% intellectual property and master asset ownership belongs to your brand forever.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-4 rounded-2xl bg-white p-6 border border-slate-200/80 shadow-xs">
              <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
                <Zap className="size-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-[#0D2137]">7-Day Content Sprint</h3>
                <p className="mt-1 text-xs text-slate-500 leading-relaxed">
                  From brand DNA questionnaire to your first batch of reviewed assets in exactly 7 days.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-4 rounded-2xl bg-white p-6 border border-slate-200/80 shadow-xs">
              <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-amber-50 text-amber-600">
                <Sparkles className="size-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-[#0D2137]">Modular Add-on Packs</h3>
                <p className="mt-1 text-xs text-slate-500 leading-relaxed">
                  Scale production anytime with instant top-up packs for festive seasons and product drops.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Bottom CTA ────────────────────────────────────────────────────── */}
      <section className="bg-gradient-to-br from-[#0D2137] to-[#122B48] py-14 sm:py-16 text-white relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 text-center relative z-10">
          <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-white leading-tight">
            Ready to Put Your Content Production on Autopilot?
          </h2>
          <p className="mt-4 text-sm sm:text-lg text-slate-300 max-w-xl mx-auto">
            Join visionary brand founders scaling with Creo's dedicated creative engine.
          </p>
          <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              to="/signup?plan=growth"
              className="inline-flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-[#2B7BC4] to-[#1F5C96] text-white px-8 py-4 text-base font-bold shadow-xl shadow-blue-600/30 hover:brightness-110 active:scale-95 transition-all w-full sm:w-auto cursor-pointer"
            >
              <span>Get Started with Brand Accelerator</span>
              <ArrowRight className="size-4" />
            </Link>
            <Link
              to="/portfolio"
              className="inline-flex items-center justify-center rounded-2xl bg-white/10 hover:bg-white/20 border border-white/20 text-white px-6 py-4 text-base font-semibold backdrop-blur-sm transition-all w-full sm:w-auto"
            >
              View Client Portfolio
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
