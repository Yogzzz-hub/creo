import { type ReactNode, type RefObject, useRef } from "react";
import { CountUp, Reveal } from "../../components/motion";
import { ScrollFlipText } from "../../components/motion/ScrollFlipText";
import { DISPLAY, PillLink, SampleCta } from "../../components/public/StagePieces";
import { DossierPanels, FinancePanels, ProductionPanels } from "../../components/public/WorkModules";
import { Stage3DRoot, useStageLayer } from "../../components/stage3d/registry";

const HERO_STATS = [
  { value: "18-Step", label: "Connected pipeline" },
  { value: "2.4h", label: "Average client sign-off" },
  { value: "82%", label: "Optimised team capacity" },
  { value: "41.25%", label: "Verified retainer margin" },
];

/** Big brand-coloured chapter number, flip headline and lead, with an optional 3D slot beside it. */
function ModuleHeader({
  index,
  eyebrow,
  title,
  lead,
  viewRef,
}: {
  index: string;
  eyebrow: string;
  title: string;
  lead: string;
  viewRef?: RefObject<HTMLDivElement | null>;
}) {
  return (
    <div className="relative mb-14 grid gap-6 lg:mb-16 lg:grid-cols-12 lg:items-center">
      <div className="lg:col-span-8">
        <p className="flex items-baseline gap-4 sm:gap-5">
          <span className="shrink-0 whitespace-nowrap text-6xl font-medium leading-none tracking-[-0.06em] text-[var(--tone-accent)] sm:text-8xl">{index}</span>
          <span className="text-sm font-bold uppercase tracking-[0.18em] text-site-mist">{eyebrow}</span>
        </p>
        <ScrollFlipText as="h2" text={title} className={`mt-8 block text-[clamp(2.4rem,5vw,4.5rem)] leading-[1] ${DISPLAY}`} />
        <Reveal delay={0.1}>
          <p className="mt-6 max-w-2xl text-lg leading-relaxed text-site-mist">{lead}</p>
        </Reveal>
      </div>
      {viewRef && <div ref={viewRef} className="pointer-events-none h-[34svh] lg:col-span-4 lg:h-[46svh]" />}
    </div>
  );
}

function ModuleSection({ sectionRef, children }: { sectionRef?: RefObject<HTMLElement | null>; children: ReactNode }) {
  return (
    <section ref={sectionRef} className="st-tone st-base relative px-6 py-24 sm:px-8 sm:py-32 lg:px-12">
      <div className="mx-auto max-w-[1240px]">{children}</div>
    </section>
  );
}

export function PortfolioPage() {
  return (
    <Stage3DRoot>
      <WorkContent />
    </Stage3DRoot>
  );
}

function WorkContent() {
  const heroRef = useRef<HTMLElement>(null);
  const heroViewRef = useRef<HTMLDivElement>(null);
  const statsRef = useRef<HTMLElement>(null);
  const statsViewRef = useRef<HTMLDivElement>(null);
  const productionRef = useRef<HTMLElement>(null);
  const productionViewRef = useRef<HTMLDivElement>(null);
  const financeRef = useRef<HTMLElement>(null);
  const financeViewRef = useRef<HTMLDivElement>(null);

  useStageLayer({ kind: "deviceOrbit", views: [heroViewRef], section: heroRef });
  useStageLayer({ kind: "blocks", mode: "assemble", drive: "pass", views: [statsViewRef], section: statsRef });
  useStageLayer({ kind: "bubble", views: [productionViewRef], section: productionRef });
  useStageLayer({ kind: "coinStack", drive: "pass", views: [financeViewRef], section: financeRef });

  return (
    <>
      {/* 1. Hero — the portal on a laptop, phones playing reels orbiting it */}
      <section ref={heroRef} className="st-tone st-hero relative -mt-[76px] h-[260svh] sm:-mt-[84px]">
        <div className="sticky top-0 h-[100svh] overflow-hidden">
          {/* The orbit gets the lower half to itself, clear of the headline */}
          <div ref={heroViewRef} className="pointer-events-none absolute inset-x-0 bottom-0 h-[38%] sm:h-[52%]" />
          <div className="relative z-10 mx-auto flex max-w-5xl flex-col items-center px-6 pt-[12svh] text-center sm:pt-[15svh]">
            <p className="text-sm font-bold uppercase tracking-[0.18em] text-site-mist">The operating system in motion</p>
            <ScrollFlipText
              as="h1"
              playOnMount
              delay={0.2}
              text="How modern agencies run on CREO."
              className={`creo-display mt-5 block text-[clamp(2.6rem,6vw,5.5rem)] leading-[0.95] ${DISPLAY}`}
            />
            <Reveal delay={0.6}>
              <p className="mx-auto mt-5 max-w-xl text-base leading-relaxed text-site-mist">
                Eliminate handoff friction, orchestrate multi-pod capacity, and track true project unit economics in real time.
              </p>
            </Reveal>
            <Reveal delay={0.75}>
              <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
                <PillLink to="/pricing">Deploy CREO in your agency</PillLink>
                <PillLink href="https://wa.me/919941999415">Schedule a live demo</PillLink>
              </div>
            </Reveal>
          </div>
        </div>
      </section>

      {/* 2. The numbers, beside blocks that build into one system */}
      <section ref={statsRef} className="st-tone st-inverse relative overflow-hidden px-6 py-24 sm:px-8 sm:py-32 lg:px-12">
        <div className="mx-auto grid max-w-[1240px] items-center gap-12 lg:grid-cols-2">
          <div ref={statsViewRef} className="pointer-events-none h-[42svh] lg:h-[70svh]" />
          <div>
            <ScrollFlipText as="h2" text="One connected operating system." className={`block text-[clamp(2.4rem,5vw,4.5rem)] leading-[1] ${DISPLAY}`} />
            <dl className="mt-12 border-t border-hi/15">
              {HERO_STATS.map((stat) => (
                <div key={stat.label} className="flex items-baseline justify-between gap-6 border-b border-hi/15 py-5">
                  <dt className="text-base text-site-mist">{stat.label}</dt>
                  <dd>
                    <CountUp value={stat.value} className="text-4xl font-medium tracking-[-0.04em] text-site-ink sm:text-5xl" />
                  </dd>
                </div>
              ))}
            </dl>
          </div>
        </div>
      </section>

      {/* 3. Modules, each a working slice of the product */}
      <ModuleSection>
        <ModuleHeader
          index="01"
          eyebrow="Onboarding & team capacity"
          title="Client dossier & capacity radar"
          lead="Get every client, project and team member aligned from day one."
        />
        <DossierPanels />
      </ModuleSection>

      <ModuleSection sectionRef={productionRef}>
        <ModuleHeader
          index="02"
          eyebrow="Creative production & client sign-off"
          title="The production engine & 1-click approvals"
          lead="From creative brief to final delivery, all in one place, with full visibility."
          viewRef={productionViewRef}
        />
        <ProductionPanels />
      </ModuleSection>

      <ModuleSection sectionRef={financeRef}>
        <ModuleHeader
          index="03"
          eyebrow="Real-time profitability & cash flow"
          title="Financial telemetry & margin recovery"
          lead="See your true margins, manage cash flow, and get paid faster."
          viewRef={financeViewRef}
        />
        <FinancePanels />
      </ModuleSection>

      <SampleCta />
    </>
  );
}
