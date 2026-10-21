import { useRef } from "react";
import { Check } from "lucide-react";
import { PricingCards } from "../../components/public/PricingCards";
import { DISPLAY, PillLink, SampleCta } from "../../components/public/StagePieces";
import { CountUp, Reveal } from "../../components/motion";
import { ScrollFlipText } from "../../components/motion/ScrollFlipText";
import { Stage3DRoot, useStageLayer } from "../../components/stage3d/registry";

const TIERS = [
  { name: "Starter", price: "₹25,000" },
  { name: "Growth", price: "₹50,000" },
  { name: "Scale", price: "₹95,000" },
];

const CAPABILITIES = [
  { label: "Client approval portal", values: ["1-Click Links", "Automated Revision SLA", "Custom CNAME Domain"] },
  { label: "Capacity & workload radar", values: ["Basic Meters", "Multi-Role Heatmaps (82% Alerts)", "Predictive Pod Resourcing"] },
  { label: "Financial & unit economics", values: ["Basic Invoicing", "Full Contribution Ledger (41.25%)", "Multi-Entity P&L Engine"] },
  { label: "Collections pipeline", values: ["Manual Reminders", "Automated Auto-Chase (7-Day Cadence)", "Custom ERP & Payment Gateways"] },
  { label: "Active team seats", values: ["10 Seats", "30 Seats", "Unlimited"] },
  { label: "Security & auditing", values: ["Standard SSL", "Role-Based Access (RBAC)", "SOC-2 Type II Certified"] },
];

const TRUST = ["Month-to-month", "Pause or cancel anytime", "First batch in 7 days"];

export function PricingPage() {
  return (
    <Stage3DRoot>
      <PricingContent />
    </Stage3DRoot>
  );
}

function PricingContent() {
  const heroRef = useRef<HTMLElement>(null);
  const heroViewRef = useRef<HTMLDivElement>(null);
  const helpRef = useRef<HTMLElement>(null);
  const helpViewRef = useRef<HTMLDivElement>(null);

  useStageLayer({ kind: "coinStack", drive: "progress", views: [heroViewRef], section: heroRef });
  useStageLayer({ kind: "megaphone", views: [helpViewRef], section: helpRef });

  return (
    <>
      {/* 1. Hero — a stack of coins fans into a spiral as you scroll */}
      <section ref={heroRef} className="st-tone st-hero relative -mt-[76px] h-[220svh] sm:-mt-[84px]">
        <div className="sticky top-0 h-[100svh] overflow-hidden">
          {/* The coins get the lower half to themselves, clear of the headline */}
          <div ref={heroViewRef} className="pointer-events-none absolute inset-x-0 bottom-0 h-[36%] sm:h-[50%]" />
          <div className="relative z-10 mx-auto flex max-w-5xl flex-col items-center px-6 pt-[12svh] text-center sm:pt-[15svh]">
            <p className="text-sm font-bold uppercase tracking-[0.18em] text-site-mist">Predictable agency infrastructure</p>
            <ScrollFlipText
              as="h1"
              playOnMount
              delay={0.2}
              text="Simple pricing that scales with you."
              className={`creo-display mt-5 block text-[clamp(2.6rem,6vw,5.5rem)] leading-[0.95] ${DISPLAY}`}
            />
            <Reveal delay={0.6}>
              <p className="mx-auto mt-6 max-w-xl text-base leading-relaxed text-site-mist sm:text-lg">
                No hidden seat taxes or per-project gouging. Choose the tier that matches your cadence and keep your margins.
              </p>
            </Reveal>
            <Reveal delay={0.75}>
              <ul className="mt-8 flex flex-wrap items-center justify-center gap-x-6 gap-y-3 text-sm font-medium text-site-ink">
                {TRUST.map((item) => (
                  <li key={item} className="flex items-center gap-2">
                    <Check className="size-4 text-[var(--site-blue-light)]" />
                    {item}
                  </li>
                ))}
              </ul>
            </Reveal>
          </div>
        </div>
      </section>

      {/* 2. Plans, live from the billing service */}
      <section className="st-tone st-base px-6 py-24 sm:px-8 sm:py-32 lg:px-12">
        <div className="mx-auto max-w-[1240px]">
          <ScrollFlipText as="h2" text="Pick your pod." className={`mb-14 block text-[clamp(2.6rem,6vw,5.5rem)] leading-[0.95] ${DISPLAY}`} />
          <PricingCards />
        </div>
      </section>

      {/* 3. Feature comparison — ruled rows */}
      <section className="st-tone st-inverse px-6 py-24 sm:px-8 sm:py-32 lg:px-12">
        <div className="mx-auto max-w-[1240px]">
          <ScrollFlipText as="h2" text="Compare every tier." className={`block text-[clamp(2.6rem,6vw,5.5rem)] leading-[0.95] ${DISPLAY}`} />
          <p className="mt-6 max-w-xl text-lg leading-relaxed text-site-mist">Everything your agency needs to operate without friction.</p>

          {/* Mobile: one block per capability */}
          <div className="mt-12 md:hidden">
            {CAPABILITIES.map((capability) => (
              <section key={capability.label} aria-label={capability.label} className="border-t border-hi/15 py-6">
                <h3 className="text-xl font-medium tracking-[-0.02em] text-site-ink">{capability.label}</h3>
                <dl className="mt-4 space-y-2">
                  {TIERS.map((tier, i) => (
                    <div key={tier.name} className="grid grid-cols-[5rem_minmax(0,1fr)] gap-3 text-sm">
                      <dt className={`font-semibold ${i === 1 ? "text-[var(--tone-accent)]" : "text-site-ink"}`}>{tier.name}</dt>
                      <dd className="text-site-mist">{capability.values[i]}</dd>
                    </div>
                  ))}
                </dl>
              </section>
            ))}
          </div>

          {/* Desktop: comparison table */}
          <div
            data-lenis-prevent
            role="region"
            aria-label="Plan feature comparison"
            tabIndex={0}
            className="public-scroll-region mt-14 hidden overflow-x-auto md:block"
          >
            <table className="w-full min-w-[860px] border-collapse text-left">
              <thead>
                <tr className="border-b-2 border-hi/80">
                  <th scope="col" className="w-[28%] py-5 pr-6 text-sm font-bold uppercase tracking-[0.16em] text-site-mist">
                    Capability
                  </th>
                  {TIERS.map((tier, i) => (
                    <th key={tier.name} scope="col" className="w-[24%] px-4 py-5 align-bottom">
                      <span className={`block text-3xl font-medium tracking-[-0.03em] ${i === 1 ? "text-[var(--tone-accent)]" : "text-site-ink"}`}>
                        {tier.name}
                      </span>
                      <span className="mt-1 block text-sm text-site-mist">
                        <CountUp value={tier.price} /> / mo
                      </span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {CAPABILITIES.map((row) => (
                  <tr key={row.label} className="border-b border-hi/15 transition-colors hover:bg-hi/[0.04]">
                    <th scope="row" className="py-5 pr-6 text-base font-medium text-site-ink">
                      {row.label}
                    </th>
                    {row.values.map((value, i) => (
                      <td key={value} className={`px-4 py-5 text-sm ${i === 0 ? "text-site-mist" : "font-medium text-site-ink"}`}>
                        {value}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* 4. Help choosing — beside a megaphone */}
      <section ref={helpRef} className="st-tone st-midnight relative overflow-hidden px-6 py-24 sm:px-8 sm:py-32 lg:px-12">
        <div className="mx-auto grid max-w-[1240px] items-center gap-10 lg:grid-cols-2">
          <div ref={helpViewRef} className="pointer-events-none h-[38svh] lg:h-[60svh]" />
          <div>
            <ScrollFlipText as="h2" text="Not sure which tier fits?" className={`block text-[clamp(2.6rem,5.5vw,5rem)] leading-[0.95] ${DISPLAY}`} />
            <Reveal delay={0.1}>
              <p className="mt-6 max-w-md text-lg leading-relaxed text-site-mist">
                Start with a free sample batch, or tell us about your brand and we'll recommend a plan.
              </p>
            </Reveal>
            <Reveal delay={0.2}>
              <div className="mt-10 flex flex-wrap gap-3">
                <PillLink to="/signup?intent=sample">Get a free sample batch</PillLink>
                <PillLink href="https://wa.me/919941999415">Talk to us on WhatsApp</PillLink>
              </div>
            </Reveal>
          </div>
        </div>
      </section>

      <SampleCta />
    </>
  );
}
