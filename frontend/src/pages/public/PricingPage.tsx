import { Link } from "react-router";
import {
  Star, Leaf, Building2, MessageSquare,
  BarChart2, Banknote, CreditCard, Users, Shield, Check, ArrowRight, MessageCircle,
} from "lucide-react";
import { PricingCards } from "../../components/public/PricingCards";
import { PageHero, SectionHeading } from "../../components/public/PageBlocks";
import {
  CountUp,
  MaskReveal,
  Reveal,
  RollText,
  ScrollMask,
  Stagger,
  StaggerItem,
} from "../../components/motion";

const TIERS = [
  { name: "Starter", price: "₹25,000", icon: Star, tone: "text-white" },
  { name: "Growth", price: "₹50,000", icon: Leaf, tone: "text-[#7DA2FF]" },
  { name: "Scale", price: "₹95,000", icon: Building2, tone: "text-white" },
];

const CAPABILITIES = [
  { icon: MessageSquare, label: "Client Approval Portal", values: ["1-Click Links", "Automated Revision SLA", "Custom CNAME Domain"] },
  { icon: BarChart2, label: "Capacity & Workload Radar", values: ["Basic Meters", "Multi-Role Heatmaps (82% Alerts)", "Predictive Pod Resourcing"] },
  { icon: Banknote, label: "Financial & Unit Economics", values: ["Basic Invoicing", "Full Contribution Ledger (41.25%)", "Multi-Entity P&L Engine"] },
  { icon: CreditCard, label: "Collections Pipeline", values: ["Manual Reminders", "Automated Auto-Chase (7-Day Cadence)", "Custom ERP & Payment Gateways"] },
  { icon: Users, label: "Active Team Seats", values: ["10 Seats", "30 Seats", "Unlimited"] },
  { icon: Shield, label: "Security & Auditing", values: ["Standard SSL", "Role-Based Access (RBAC)", "SOC-2 Type II Certified"] },
];

const TRUST = ["Month-to-month", "Pause or cancel anytime", "First batch in 7 days"];

export function PricingPage() {
  return (
    <div className="min-h-screen pb-12 sm:pb-16">
      <PageHero
        eyebrow="Predictable agency infrastructure"
        title="Simple, transparent pricing that scales with your agency."
        accent={["scales", "with", "your", "agency."]}
        lead="No hidden seat taxes or per-project gouging. Choose the operating tier that matches your studio cadence and reclaim your true profit margins."
      >
        <ul className="flex flex-wrap items-center justify-center gap-x-6 gap-y-3 text-sm font-medium text-[#93A0BF]">
          {TRUST.map((item) => (
            <li key={item} className="flex items-center gap-2">
              <span className="flex size-5 items-center justify-center rounded-full bg-[#4F7BFF]/15 ring-1 ring-inset ring-[#4F7BFF]/40">
                <Check className="size-3 text-[#7DA2FF]" />
              </span>
              {item}
            </li>
          ))}
        </ul>
      </PageHero>

      {/* Plans */}
      <div className="mx-auto max-w-[1240px] px-6 sm:px-8 lg:px-12">
        <PricingCards />
      </div>

      {/* Feature comparison — band opens out as it arrives */}
      <ScrollMask
        inset={5}
        radius={48}
        background="bg-gradient-to-b from-[#081130] to-[#060C24]"
        className="mt-24 sm:mt-32"
      >
        <section className="relative py-20 sm:py-28">
          <div
            aria-hidden="true"
            className="creo-grid-bg absolute inset-0 opacity-70 [mask-image:radial-gradient(60%_50%_at_50%_0%,#000,transparent)]"
          />
          <div className="relative mx-auto max-w-[1240px] px-6 sm:px-8 lg:px-12">
            <SectionHeading
              eyebrow="Feature comparison"
              title="Compare Platform Architecture & Operating Capabilities."
              accent={["Operating", "Capabilities."]}
            >
              Everything your agency needs to operate without friction.
            </SectionHeading>

            {/* Mobile: one card per capability */}
            <Stagger className="space-y-4 md:hidden" gap={0.08}>
              {CAPABILITIES.map((capability) => {
                const Icon = capability.icon;
                return (
                  <StaggerItem key={capability.label}>
                    <section aria-label={capability.label} className="creo-glass rounded-2xl p-5">
                      <h3 className="mb-4 flex items-center gap-2.5 text-sm font-bold text-[#F4F7FF]">
                        <span className="flex size-8 items-center justify-center rounded-lg bg-[#4F7BFF]/15 ring-1 ring-inset ring-[#4F7BFF]/30">
                          <Icon className="size-4 text-[#7DA2FF]" />
                        </span>
                        {capability.label}
                      </h3>
                      <dl className="space-y-2.5">
                        {TIERS.map((tier, index) => (
                          <div
                            key={tier.name}
                            className={`grid grid-cols-[4.5rem_minmax(0,1fr)] gap-3 rounded-xl p-3 text-sm ${
                              index === 1 ? "bg-[#4F7BFF]/12 ring-1 ring-inset ring-[#4F7BFF]/30" : "bg-[#050A1A]/50"
                            }`}
                          >
                            <dt className={`font-semibold ${tier.tone}`}>{tier.name}</dt>
                            <dd className="leading-relaxed text-[#B4BFDA]">{capability.values[index]}</dd>
                          </div>
                        ))}
                      </dl>
                    </section>
                  </StaggerItem>
                );
              })}
            </Stagger>

            {/* Desktop: comparison table */}
            <MaskReveal from="bottom" zoom={1.03} className="hidden md:block">
              <div
                data-lenis-prevent
                role="region"
                aria-label="Plan feature comparison"
                tabIndex={0}
                className="public-scroll-region creo-glass creo-beam overflow-hidden overflow-x-auto rounded-3xl"
              >
                <div className="relative min-w-[900px]">
                  {/* Highlighted Growth column */}
                  <div
                    aria-hidden="true"
                    className="pointer-events-none absolute inset-y-0 left-[calc(50%-14px)] w-[calc(25%-6px)] border-x border-[#4F7BFF]/25 bg-gradient-to-b from-[#4F7BFF]/[0.14] to-[#4F7BFF]/[0.03]"
                  />

                  <div className="relative grid grid-cols-4 items-center border-b border-white/[0.08] bg-white/[0.03] p-6">
                    <div className="text-[11px] font-bold uppercase tracking-[0.16em] text-[#B4BFDA]">Operating Capability</div>
                    {TIERS.map((tier) => {
                      const Icon = tier.icon;
                      return (
                        <div key={tier.name} className="flex items-center gap-2.5">
                          <div className={`flex size-8 shrink-0 items-center justify-center rounded-lg bg-[#050A1A]/60 ring-1 ring-inset ring-white/10 ${tier.tone}`}>
                            <Icon className="size-3.5" />
                          </div>
                          <div>
                            <div className="text-sm font-bold text-[#F4F7FF]">{tier.name}</div>
                            <div className="text-xs text-[#93A0BF]">
                              <CountUp value={tier.price} /> / mo
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  <Stagger className="relative divide-y divide-white/[0.06]" gap={0.07}>
                    {CAPABILITIES.map((row) => {
                      const Icon = row.icon;
                      return (
                        <StaggerItem
                          key={row.label}
                          className="group grid grid-cols-4 items-center px-6 py-4 transition-colors duration-300 hover:bg-white/[0.03]"
                        >
                          <div className="flex items-center gap-3">
                            <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-[#050A1A]/60 ring-1 ring-inset ring-white/10 transition-all duration-300 group-hover:scale-110 group-hover:ring-[#4F7BFF]/60">
                              <Icon className="size-4 text-[#7DA2FF]" />
                            </div>
                            <span className="text-sm font-semibold text-[#F4F7FF]">{row.label}</span>
                          </div>
                          {row.values.map((value, i) => (
                            <div
                              key={value}
                              className={`text-sm transition-transform duration-300 group-hover:translate-x-0.5 ${
                                i === 0 ? "text-[#93A0BF]" : "font-medium text-[#F4F7FF]"
                              }`}
                            >
                              {value}
                            </div>
                          ))}
                        </StaggerItem>
                      );
                    })}
                  </Stagger>
                </div>
              </div>
            </MaskReveal>
          </div>
        </section>
      </ScrollMask>

      {/* Help choosing */}
      <section className="mx-auto max-w-[1240px] px-6 pt-20 sm:px-8 sm:pt-28 lg:px-12">
        <Reveal>
          <div className="creo-glass creo-beam relative overflow-hidden rounded-[32px] px-6 py-12 text-center sm:px-12 sm:py-16">
            <div aria-hidden="true" className="absolute -top-24 left-1/2 size-[420px] -translate-x-1/2 rounded-full bg-[#4F7BFF]/20 blur-[100px]" />
            <h2 className="relative text-3xl font-black tracking-[-0.035em] text-[#F4F7FF] sm:text-4xl">
              Not sure which tier fits?
            </h2>
            <p className="relative mx-auto mt-4 max-w-xl text-base leading-relaxed text-[#93A0BF]">
              Start with a free sample batch, or tell us about your brand and we'll recommend a plan.
            </p>
            <div className="relative mt-8 flex flex-col items-stretch justify-center gap-3 sm:flex-row sm:items-center">
              <Link
                to="/signup?intent=sample"
                className="creo-btn-primary group inline-flex items-center justify-center gap-2 rounded-full px-7 py-4 text-sm font-semibold"
              >
                <RollText>Get a free sample batch</RollText>
                <ArrowRight className="size-4 transition-transform duration-300 group-hover:translate-x-1" />
              </Link>
              <a
                href="https://wa.me/919941999415"
                target="_blank"
                rel="noopener noreferrer"
                className="creo-btn-ghost group inline-flex items-center justify-center gap-2 rounded-full px-7 py-4 text-sm font-semibold"
              >
                <MessageCircle className="size-4 text-[#7DD3FC]" />
                <RollText>Talk to us on WhatsApp</RollText>
              </a>
            </div>
          </div>
        </Reveal>
      </section>
    </div>
  );
}
