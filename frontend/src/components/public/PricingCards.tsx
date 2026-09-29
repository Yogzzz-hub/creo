import { useState } from "react";
import { Link } from "react-router";
import { Star, Leaf, Building2 } from "lucide-react";

interface PricingCardsProps {
  showBillingToggle?: boolean;
  defaultCycle?: "annual" | "monthly";
}

export function PricingCards({ showBillingToggle = true, defaultCycle = "annual" }: PricingCardsProps) {
  const [billingCycle, setBillingCycle] = useState<"annual" | "monthly">(defaultCycle);

  return (
    <div className="w-full">
      {/* Billing Switcher Toggle */}
      {showBillingToggle && (
        <div className="flex justify-center mb-10 sm:mb-12">
          <div className="bg-[#0A0F18] border border-[#222F44] p-1 rounded-full inline-flex mx-auto">
            <button
              type="button"
              onClick={() => setBillingCycle("monthly")}
              className={`font-medium text-xs px-4 py-1.5 transition-all duration-300 ease-out rounded-full cursor-pointer ${
                billingCycle === "monthly"
                  ? "bg-[#121926] border border-[#222F44] text-[#F8FAFC] shadow-sm"
                  : "text-[#97A0B3] hover:text-[#F8FAFC]"
              }`}
            >
              Monthly Billing
            </button>
            <button
              type="button"
              onClick={() => setBillingCycle("annual")}
              className={`font-semibold text-xs px-4 py-1.5 rounded-full flex items-center gap-1.5 transition-all duration-300 ease-out cursor-pointer ${
                billingCycle === "annual"
                  ? "bg-[#121926] border border-[#222F44] text-[#F8FAFC] shadow-sm"
                  : "text-[#97A0B3] hover:text-[#F8FAFC]"
              }`}
            >
              Annual Billing (Save 20%) ⚡
            </button>
          </div>
        </div>
      )}

      {/* 3 Pricing Tier Bento Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-stretch">
        
        {/* Card 1: Boutique Studio */}
        <div className="bg-[#121926] border border-[#222F44] rounded-2xl p-6 flex flex-col justify-between hover:border-[#7FA0D6]/40 transition-colors">
          <div>
            <div className="flex items-center gap-3 mb-4">
              <div className="bg-[#0A0F18] border border-[#222F44] p-2 rounded-lg text-white w-9 h-9 flex items-center justify-center shrink-0">
                <Star className="size-4" />
              </div>
              <div>
                <h3 className="text-[#F8FAFC] font-bold text-base">Boutique Studio</h3>
                <p className="text-[#97A0B3] text-[10px]">Starter OS</p>
              </div>
            </div>

            <div className="mb-4">
              <div className="flex items-end gap-1">
                <span className="text-3xl font-black text-[#F8FAFC]">
                  {billingCycle === "annual" ? "₹14,900" : "₹18,625"}
                </span>
                <span className="text-[#97A0B3] text-xs font-medium mb-1">/month</span>
              </div>
              <div className="text-[#97A0B3] text-[10px] mt-1">
                (Billed {billingCycle === "annual" ? "annually" : "monthly"})
              </div>
            </div>

            <p className="text-xs text-[#97A0B3] my-4 leading-relaxed">
              For emerging creative shops replacing messy WhatsApp chasing and Drive links.
            </p>

            <div className="bg-[#0A0F18] border border-[#222F44] text-[11px] text-[#F8FAFC] font-medium py-1.5 px-3 rounded-lg text-center mb-6">
              Up to 10 Team Seats &bull; 15 Active Client Pods
            </div>

            <ul className="space-y-3 mb-8">
              {[
                "Six-milestone workflow rail (Lead to Report)",
                "1-Click Client Approval Portal with revision timers",
                "Real-time Team Capacity Pod (Utilization radar)",
                "Centralized asset dossiers & Figma/Adobe sync",
                "Standard email & Slack support",
              ].map((feature, i) => (
                <li key={i} className="flex items-start gap-3 py-1">
                  <div className="w-4 h-4 rounded-full bg-[#7FA0D6] text-[#050810] flex items-center justify-center shrink-0 mt-0.5">
                    <svg className="size-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="4">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <span className="text-xs text-[#F8FAFC] leading-snug">{feature}</span>
                </li>
              ))}
            </ul>
          </div>

          <Link
            to="/pricing"
            className="w-full bg-[#0A0F18] border border-[#222F44] hover:bg-[#1A2333] text-[#F8FAFC] text-xs font-semibold py-3 rounded-full text-center mt-auto transition block"
          >
            Deploy Boutique OS &rarr;
          </Link>
        </div>

        {/* Card 2: Growth OS (Featured / Most Popular) */}
        <div className="bg-[#121926] border-2 border-[#7FA0D6] rounded-2xl p-6 flex flex-col justify-between relative shadow-[0_0_30px_rgba(127,160,214,0.12)]">
          <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-[#7FA0D6] text-[#050810] font-bold text-[10px] tracking-wider uppercase px-3 py-0.5 rounded-full shadow-sm flex items-center gap-1.5 whitespace-nowrap">
            <span className="relative flex size-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#050810] opacity-40"></span>
              <span className="relative inline-flex rounded-full size-2 bg-[#050810]"></span>
            </span>
            MOST POPULAR
          </div>

          <div>
            <div className="flex items-center gap-3 mb-4">
              <div className="bg-[#0A0F18] border border-[#222F44] p-2 rounded-lg text-[#7FA0D6] w-9 h-9 flex items-center justify-center shrink-0">
                <Leaf className="size-4" />
              </div>
              <div>
                <h3 className="text-[#F8FAFC] font-bold text-base">Growth OS</h3>
                <p className="text-[#97A0B3] text-[10px]">Agency Standard</p>
              </div>
            </div>

            <div className="mb-4">
              <div className="flex items-end gap-1">
                <span className="text-3xl font-black text-[#F8FAFC]">
                  {billingCycle === "annual" ? "₹34,900" : "₹43,625"}
                </span>
                <span className="text-[#97A0B3] text-xs font-medium mb-1">/month</span>
              </div>
              <div className="text-[#97A0B3] text-[10px] mt-1">
                (Billed {billingCycle === "annual" ? "annually" : "monthly"})
              </div>
            </div>

            <p className="text-xs text-[#97A0B3] my-4 leading-relaxed">
              For scaling content and design studios requiring real-time unit economics and zero burnout.
            </p>

            <div className="bg-[#0A0F18] border border-[#222F44] text-[11px] text-[#F8FAFC] font-medium py-1.5 px-3 rounded-lg text-center mb-6">
              Up to 30 Team Seats &bull; Unlimited Client Pods
            </div>

            <div className="text-[11px] font-bold text-[#F8FAFC] mb-3">
              Everything in Boutique Studio, plus:
            </div>

            <ul className="space-y-3 mb-8">
              {[
                "Astra Living Retainer Unit Economics Ledger (41.25% Margin Tracker)",
                "Automated Revision SLA Tickets & Auto-Assign to Leads",
                "Collections Pipeline engine (Automated Auto-Chase 7-Day Cadence)",
                "Multi-pod Bottleneck Radar & Editorial Calendar tables",
                "White-label client portal branding",
              ].map((feature, i) => (
                <li key={i} className="flex items-start gap-3 py-1">
                  <div className="w-4 h-4 rounded-full bg-[#7FA0D6] text-[#050810] flex items-center justify-center shrink-0 mt-0.5">
                    <svg className="size-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="4">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <span className="text-xs text-[#F8FAFC] leading-snug">{feature}</span>
                </li>
              ))}
            </ul>
          </div>

          <Link
            to="/pricing"
            className="w-full bg-[#BCCCE6] hover:bg-white text-[#050810] text-xs font-bold py-3 rounded-full text-center mt-auto transition block shadow-sm"
          >
            Launch Growth OS &rarr;
          </Link>
        </div>

        {/* Card 3: Agency Network */}
        <div className="bg-[#121926] border border-[#222F44] rounded-2xl p-6 flex flex-col justify-between hover:border-[#7FA0D6]/40 transition-colors">
          <div>
            <div className="flex items-center gap-3 mb-4">
              <div className="bg-[#0A0F18] border border-[#222F44] p-2 rounded-lg text-white w-9 h-9 flex items-center justify-center shrink-0">
                <Building2 className="size-4" />
              </div>
              <div>
                <h3 className="text-[#F8FAFC] font-bold text-base">Agency Network</h3>
                <p className="text-[#97A0B3] text-[10px]">Scale &amp; Enterprise</p>
              </div>
            </div>

            <div className="mb-4">
              <div className="flex items-end gap-1">
                <span className="text-3xl font-black text-[#F8FAFC]">
                  {billingCycle === "annual" ? "₹79,900" : "₹99,875"}
                </span>
                <span className="text-[#97A0B3] text-xs font-medium mb-1">/month</span>
              </div>
              <div className="text-[#97A0B3] text-[10px] mt-1">
                (Billed {billingCycle === "annual" ? "annually" : "monthly"})
              </div>
            </div>

            <p className="text-xs text-[#97A0B3] my-4 leading-relaxed">
              For multi-department creative networks demanding custom integrations and governance.
            </p>

            <div className="bg-[#0A0F18] border border-[#222F44] text-[11px] text-[#F8FAFC] font-medium py-1.5 px-3 rounded-lg text-center mb-6">
              Unlimited Seats &bull; Unlimited Dedicated Pods
            </div>

            <div className="text-[11px] font-bold text-[#F8FAFC] mb-3">
              Everything in Growth OS, plus:
            </div>

            <ul className="space-y-3 mb-8">
              {[
                "Custom agency domain white-labeling (portal.youragency.com)",
                "Multi-entity consolidated profit & loss reporting",
                "SOC-2 Type II enterprise compliance & data encryption",
                "Dedicated Agency Solutions Architect & 24/7 priority SLA",
                "Custom API webhooks & billing automation",
              ].map((feature, i) => (
                <li key={i} className="flex items-start gap-3 py-1">
                  <div className="w-4 h-4 rounded-full bg-[#7FA0D6] text-[#050810] flex items-center justify-center shrink-0 mt-0.5">
                    <svg className="size-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="4">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <span className="text-xs text-[#F8FAFC] leading-snug">{feature}</span>
                </li>
              ))}
            </ul>
          </div>

          <a
            href="https://wa.me/919941999415"
            target="_blank"
            rel="noopener noreferrer"
            className="w-full bg-[#0A0F18] border border-[#222F44] hover:bg-[#1A2333] text-[#F8FAFC] text-xs font-semibold py-3 rounded-full text-center mt-auto transition block"
          >
            Contact Solutions Team &rarr;
          </a>
        </div>

      </div>
    </div>
  );
}
