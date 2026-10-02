import { ArrowRight, Check } from "lucide-react";
import { Link } from "react-router";
import { CountUp, Stagger, StaggerItem, TiltCard } from "../motion";

interface PricingCardsProps {
  showBillingToggle?: boolean;
  defaultCycle?: string;
  className?: string;
}

const PLANS = [
  {
    id: "starter",
    name: "Starter",
    badge: null,
    price: "₹25,000",
    period: "/month",
    unitCost: "≈ ₹1,136 per asset · 22 assets",
    stats: [
      { count: "4", label: "Reels" },
      { count: "8", label: "Posts" },
      { count: "10", label: "Stories" },
    ],
    features: [
      "1 revision round per asset",
      "3 business days SLA",
      "Shared account lead",
    ],
    isFeatured: false,
    ctaText: "Start with a free sample",
    ctaLink: "/signup?plan=starter",
  },
  {
    id: "growth",
    name: "Growth",
    badge: "Best value per asset",
    price: "₹50,000",
    period: "/month",
    unitCost: "≈ ₹1,041 per asset · 48 assets",
    stats: [
      { count: "10", label: "Reels" },
      { count: "18", label: "Posts" },
      { count: "20", label: "Stories" },
    ],
    features: [
      "2 revision rounds per asset",
      "2 business days SLA",
      "Dedicated account director",
    ],
    isFeatured: true,
    ctaText: "Start with a free sample",
    ctaLink: "/signup?plan=growth",
  },
  {
    id: "pro",
    name: "Scale",
    badge: null,
    price: "₹95,000",
    period: "/month",
    unitCost: "≈ ₹989 per asset · 96 assets",
    stats: [
      { count: "20", label: "Reels" },
      { count: "36", label: "Posts" },
      { count: "40", label: "Stories" },
    ],
    features: [
      "3 revision rounds per asset",
      "24-hour priority SLA",
      "Director + monthly strategy review",
    ],
    isFeatured: false,
    ctaText: "Start with a free sample",
    ctaLink: "/signup?plan=pro",
  },
];

export function PricingCards({ className = "" }: PricingCardsProps) {
  return (
    <div className={`w-full ${className}`}>
      {/* 3 Pricing Tier Cards */}
      <Stagger className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-stretch" gap={0.12}>
        {PLANS.map((plan) => (
          <StaggerItem key={plan.id} className={`h-full ${plan.isFeatured ? "lg:-translate-y-3" : ""}`}>
            <TiltCard
              max={5}
              lift={plan.isFeatured ? 36 : 22}
              glow="transparent"
              className={`h-full rounded-2xl p-7 flex flex-col justify-between transition-colors duration-300 shadow-xl ${
                plan.isFeatured
                  ? "creo-conic-border"
                  : "bg-nebula-surface border border-nebula-steel hover:border-nebula-glow/60"
              }`}
            >
              <div className="relative z-[2] [transform:translateZ(20px)]">
                {/* Plan Name & Badge */}
                <div className="flex items-center justify-between mb-4 min-h-[28px]">
                  <h3 className="text-white font-semibold text-base tracking-wide">{plan.name}</h3>
                  {plan.badge && (
                    <span className="relative overflow-hidden px-3 py-1 rounded-full bg-nebula-sand/10 border border-nebula-sand/35 text-xs font-semibold text-nebula-sand">
                      {plan.badge}
                    </span>
                  )}
                </div>

                {/* Price & Unit Cost */}
                <div className="mb-2">
                  <div className="flex items-baseline gap-1">
                    <span className="text-4xl font-extrabold text-white tracking-tight">{plan.price}</span>
                    <span className="text-sm font-normal text-nebula-mist">{plan.period}</span>
                  </div>
                  <p className="text-xs text-nebula-mist mt-1.5 font-medium">{plan.unitCost}</p>
                </div>

                {/* Separator */}
                <div className="border-t border-nebula-steel my-6" />

                {/* Quotas 3-column stats */}
                <div className="grid grid-cols-3 gap-3 mb-8">
                  {plan.stats.map((stat) => (
                    <div key={stat.label}>
                      <span className="block text-2xl font-bold text-white tracking-tight">{stat.count}</span>
                      <div className="text-xs text-nebula-mist mt-0.5 font-medium">{stat.label}</div>
                    </div>
                  ))}
                </div>

                {/* Features List */}
                <ul className="space-y-3.5 mb-8 text-sm text-nebula-mist leading-relaxed">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex items-center gap-2.5">
                      <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-nebula-glow/12 text-nebula-glow">
                        <Check className="size-3" strokeWidth={3} />
                      </span>
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* CTA Button */}
              <div className="relative z-[2] mt-auto pt-2 [transform:translateZ(28px)]">
                <Link
                  to={plan.ctaLink}
                  className={`group w-full text-sm font-bold py-3.5 px-4 rounded-xl text-center transition-all duration-300 flex items-center justify-center gap-2 shadow-sm ${
                    plan.isFeatured
                      ? "bg-nebula-periwinkle hover:bg-white text-nebula-navy"
                      : "bg-nebula-navy border border-nebula-steel text-slate-50 hover:border-nebula-periwinkle hover:bg-nebula-periwinkle hover:text-nebula-navy"
                  }`}
                >
                  {plan.ctaText}
                  <ArrowRight className="size-4 transition-transform duration-300 group-hover:translate-x-1" />
                </Link>
              </div>
            </TiltCard>
          </StaggerItem>
        ))}
      </Stagger>
    </div>
  );
}
