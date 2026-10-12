import { motion } from "motion/react";
import {
  Star, Leaf, Building2, MessageSquare,
  BarChart2, Banknote, CreditCard, Users, Shield,
} from "lucide-react";
import { PricingCards } from "../../components/public/PricingCards";
import { CountUp, EASE_OUT_EXPO, Reveal, SplitText, Stagger, StaggerItem } from "../../components/motion";

const TIERS = [
  { name: "Starter", price: "₹25,000", icon: Star, tone: "text-white" },
  { name: "Growth", price: "₹50,000", icon: Leaf, tone: "text-[#4F7BFF]" },
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

export function PricingPage() {
  return (
    <div className="min-h-screen bg-[#050A1A] pt-8 sm:pt-12 lg:pt-14 pb-16 sm:pb-24">

      {/* Hero Header */}
      <div className="relative isolate max-w-4xl mx-auto px-4 sm:px-6 text-center mb-12 sm:mb-16">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: EASE_OUT_EXPO }}
          className="inline-flex items-center justify-center bg-[#0D1530] border border-[#18244A] text-[#4F7BFF] text-[11px] font-bold px-3 py-1 rounded-full mb-6"
        >
          ⚡ PREDICTABLE AGENCY INFRASTRUCTURE
        </motion.div>
        <SplitText
          as="h1"
          animateOnMount
          text="Simple, transparent pricing that scales with your agency."
          accent={["scales", "with", "your", "agency"]}
          className="block text-4xl sm:text-5xl lg:text-6xl font-black text-[#F4F7FF] tracking-tight max-w-3xl mx-auto mb-5 leading-[1.05]"
        />
        <Reveal delay={0.4} blur>
          <p className="text-sm sm:text-base text-[#93A0BF] max-w-xl mx-auto leading-relaxed">
            No hidden seat taxes or per-project gouging. Choose the operating tier that matches your studio cadence and reclaim your true profit margins.
          </p>
        </Reveal>
      </div>

      {/* 3 Pricing Tier Bento Cards */}
      <div className="max-w-[1240px] mx-auto px-4 sm:px-6">
        <PricingCards />
      </div>

      {/* Feature Comparison Table */}
      <div className="max-w-[1240px] mx-auto px-4 sm:px-6 mt-20 sm:mt-24">

        <div className="mb-10 text-center lg:text-left">
          <Reveal>
            <div className="inline-flex items-center bg-[#0D1530] border border-[#18244A] text-[#4F7BFF] text-[11px] font-bold px-3 py-1 rounded-full mb-4">
              ⚡ FEATURE COMPARISON
            </div>
          </Reveal>
          <SplitText
            as="h2"
            text="Compare Platform Architecture & Operating Capabilities."
            className="block text-2xl sm:text-3xl lg:text-4xl font-black text-[#F4F7FF] tracking-tight mb-2"
          />
          <Reveal delay={0.1}>
            <p className="text-sm sm:text-base text-[#93A0BF]">Everything your agency needs to operate without friction.</p>
          </Reveal>
        </div>

        <div className="space-y-4 md:hidden" aria-label="Plan feature comparison">
          {CAPABILITIES.map((capability) => {
            const Icon = capability.icon;
            return (
              <section key={capability.label} className="rounded-2xl border border-[#18244A] bg-[#0D1530] p-5">
                <h3 className="mb-4 flex items-center gap-2 text-sm font-bold text-[#F4F7FF]">
                  <Icon className="size-4 shrink-0 text-[#4F7BFF]" />
                  {capability.label}
                </h3>
                <dl className="space-y-3">
                  {TIERS.map((tier, index) => (
                    <div key={tier.name} className={`grid grid-cols-[4.5rem_minmax(0,1fr)] gap-3 rounded-lg p-3 text-sm ${index === 1 ? "bg-[#4F7BFF]/10" : "bg-[#081028]"}`}>
                      <dt className={`font-semibold ${tier.tone}`}>{tier.name}</dt>
                      <dd className="leading-relaxed text-[#93A0BF]">{capability.values[index]}</dd>
                    </div>
                  ))}
                </dl>
              </section>
            );
          })}
        </div>

        <Reveal blur className="hidden md:block">
          <div data-lenis-prevent role="region" aria-label="Plan feature comparison" tabIndex={0} className="public-scroll-region bg-[#0D1530] border border-[#18244A] rounded-2xl overflow-hidden overflow-x-auto">
            <div className="relative min-w-[900px]">
              {/* Highlighted Growth column */}
              <div
                aria-hidden="true"
                className="pointer-events-none absolute inset-y-0 left-[calc(50%-14px)] w-[calc(25%-6px)] bg-gradient-to-b from-[#4F7BFF]/[0.09] to-[#4F7BFF]/[0.02] border-x border-[#4F7BFF]/20"
              />

              {/* Table Header */}
              <div className="relative grid grid-cols-4 bg-[#081028] border-b border-[#18244A] p-6 items-center">
                <div className="text-sm font-bold text-[#F4F7FF]">Operating Capability</div>
                {TIERS.map((tier) => {
                  const Icon = tier.icon;
                  return (
                    <div key={tier.name} className="flex items-center gap-2.5">
                      <div className={`bg-[#0D1530] border border-[#18244A] p-1.5 rounded-md ${tier.tone} w-7 h-7 flex items-center justify-center shrink-0`}>
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

              {/* Table Rows */}
              <Stagger className="relative divide-y divide-[#18244A]/50" gap={0.07}>
                {CAPABILITIES.map((row) => {
                  const Icon = row.icon;
                  return (
                    <StaggerItem
                      key={row.label}
                      className="group grid grid-cols-4 items-center py-4 px-6 hover:bg-[#081028]/60 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-lg bg-[#081028] border border-[#18244A] flex items-center justify-center shrink-0 transition-all duration-300 group-hover:border-[#4F7BFF]/60 group-hover:scale-110">
                          <Icon className="size-4 text-[#4F7BFF]" />
                        </div>
                        <span className="text-sm font-semibold text-[#F4F7FF]">{row.label}</span>
                      </div>
                      {row.values.map((value, i) => (
                        <div
                          key={value}
                          className={`text-sm transition-transform duration-300 group-hover:translate-x-0.5 ${
                            i === 0 ? "text-[#93A0BF]" : "text-[#F4F7FF] font-medium"
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
        </Reveal>
      </div>
    </div>
  );
}
