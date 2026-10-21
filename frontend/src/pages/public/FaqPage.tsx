import { useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Plus } from "lucide-react";
import { SEOHead } from "../../components/public/SEOHead";
import { DISPLAY, PillLink, SampleCta } from "../../components/public/StagePieces";
import { EASE_OUT_EXPO, Reveal } from "../../components/motion";
import { ScrollFlipText } from "../../components/motion/ScrollFlipText";
import { Stage3DRoot, useStageLayer } from "../../components/stage3d/registry";

const FAQ_ITEMS = [
  {
    q: "How does the monthly content pod service work for D2C brands?",
    a: "Your D2C brand is assigned a dedicated pod comprising an account lead, video editor, and graphic designer. Every week, fresh reels, carousels, and story creatives are produced and uploaded to your client portal for one-click approval.",
  },
  {
    q: "What deliverables are included in each plan tier?",
    a: "Starter provides 22 total assets (4 reels, 8 static posts, 10 stories). Growth provides 48 total assets (10 reels, 16 static posts, 22 stories). Scale provides 96 total assets (20 reels, 32 static posts, 44 stories).",
  },
  {
    q: "What are the batch turnaround SLA promises?",
    a: "Starter features a 3 business-day batch SLA. Growth features a 2 business-day batch SLA. Scale features a 24-hour priority SLA.",
  },
  {
    q: "How do revisions work if we need changes to a reel or carousel?",
    a: "Every asset comes with plan-bound revision rounds (1 for Starter, 2 for Growth, 3 for Scale). When reviewing a deliverable in your portal, click Decline, enter your feedback, and your pod will immediately revise and resubmit.",
  },
  {
    q: "Are there long-term contracts or cancellation fees?",
    a: "No. All Creo retainers operate on a flexible month-to-month basis. You can pause or cancel renewal anytime directly from your Plan & Billing dashboard.",
  },
  {
    q: "How do we get started with a free sample batch?",
    a: "Simply request a free sample on our homepage or signup flow by entering your email and Instagram handle. Our creative team will produce a custom sample batch tailored to your brand.",
  },
];

export function FaqPage() {
  return (
    <Stage3DRoot>
      <FaqContent />
    </Stage3DRoot>
  );
}

function FaqContent() {
  const [openIndex, setOpenIndex] = useState<number | null>(0);
  const heroRef = useRef<HTMLElement>(null);
  const heroViewRef = useRef<HTMLDivElement>(null);
  const askRef = useRef<HTMLElement>(null);
  const askViewRef = useRef<HTMLDivElement>(null);

  useStageLayer({ kind: "bubble", views: [heroViewRef], section: heroRef });
  useStageLayer({ kind: "mailbox", views: [askViewRef], section: askRef });

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: FAQ_ITEMS.map((item) => ({
      "@type": "Question",
      name: item.q,
      acceptedAnswer: { "@type": "Answer", text: item.a },
    })),
  };

  return (
    <>
      <SEOHead
        title="Frequently Asked Questions | Creo D2C Content Pods"
        description="Learn how Creo content pods deliver weekly reels, carousels, and stories for D2C brands with transparent SLAs and clear monthly tiers."
        jsonLd={jsonLd}
      />

      {/* 1. Hero — a glossy speech bubble beside the headline */}
      <section ref={heroRef} className="st-tone st-hero relative -mt-[76px] overflow-hidden px-6 pb-20 pt-[calc(76px+12svh)] sm:-mt-[84px] sm:px-8 sm:pt-[calc(84px+14svh)] lg:px-12">
        <div className="mx-auto grid max-w-[1240px] items-center gap-6 lg:min-h-[64svh] lg:grid-cols-2">
          <div className="relative z-10">
            <p className="text-sm font-bold uppercase tracking-[0.18em] text-site-mist">Help & knowledge base</p>
            <ScrollFlipText
              as="h1"
              playOnMount
              delay={0.2}
              text="Questions, answered."
              className={`creo-display mt-6 block text-[clamp(3rem,8vw,7.5rem)] leading-[0.92] ${DISPLAY}`}
            />
            <Reveal delay={0.6}>
              <p className="mt-6 max-w-lg text-lg leading-relaxed text-site-mist">
                Everything you need to know about Creo content pods, deliverable SLAs, and monthly retainer tiers for D2C brands.
              </p>
            </Reveal>
          </div>
          <div ref={heroViewRef} className="pointer-events-none -order-1 h-[34svh] lg:order-none lg:h-[64svh]" />
        </div>
      </section>

      {/* 2. The questions — numbered, ruled rows */}
      <section className="st-tone st-base px-6 py-24 sm:px-8 sm:py-32 lg:px-12">
        <div className="mx-auto max-w-[1100px] border-b border-hi/10">
          {FAQ_ITEMS.map((item, index) => {
            const isOpen = openIndex === index;
            const panelId = `faq-panel-${index}`;
            const buttonId = `faq-button-${index}`;
            return (
              <div key={item.q} className="border-t border-hi/10">
                <h3>
                  <button
                    id={buttonId}
                    type="button"
                    aria-expanded={isOpen}
                    aria-controls={panelId}
                    onClick={() => setOpenIndex(isOpen ? null : index)}
                    className="group flex w-full cursor-pointer items-center gap-5 py-8 text-left sm:gap-8"
                  >
                    <span className="w-10 shrink-0 font-mono text-sm text-[var(--tone-accent)] sm:w-14">{String(index + 1).padStart(2, "0")}</span>
                    <span className="flex-1 text-xl font-medium leading-snug tracking-[-0.02em] text-site-ink transition-colors group-hover:text-[var(--tone-accent)] sm:text-3xl">
                      {item.q}
                    </span>
                    <motion.span
                      animate={{ rotate: isOpen ? 45 : 0 }}
                      transition={{ duration: 0.35, ease: EASE_OUT_EXPO }}
                      className={`flex size-11 shrink-0 items-center justify-center rounded-full border transition-colors ${
                        isOpen ? "border-[var(--site-blue-deep)] bg-[var(--site-blue-deep)] text-[var(--on-brand)]" : "border-hi/15 text-site-ink"
                      }`}
                    >
                      <Plus className="size-5" />
                    </motion.span>
                  </button>
                </h3>
                <AnimatePresence initial={false}>
                  {isOpen && (
                    <motion.section
                      key="answer"
                      id={panelId}
                      aria-labelledby={buttonId}
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.45, ease: EASE_OUT_EXPO }}
                      className="overflow-hidden"
                    >
                      <p className="max-w-2xl pb-9 pl-[3.75rem] text-base leading-relaxed text-site-mist sm:pl-[5.5rem] sm:text-lg">{item.a}</p>
                    </motion.section>
                  )}
                </AnimatePresence>
              </div>
            );
          })}
        </div>
      </section>

      {/* 3. Still curious — a mailbox with its flag up */}
      <section ref={askRef} className="st-tone st-midnight relative overflow-hidden px-6 py-24 sm:px-8 sm:py-32 lg:px-12">
        <div className="mx-auto grid max-w-[1240px] items-center gap-10 lg:grid-cols-2">
          <div>
            <ScrollFlipText as="h2" text="Still have a question?" className={`block text-[clamp(2.6rem,5.5vw,5rem)] leading-[0.95] ${DISPLAY}`} />
            <Reveal delay={0.1}>
              <p className="mt-6 max-w-md text-lg leading-relaxed text-site-mist">
                Ask us anything about your brand, or start with a free custom sample batch of reels and carousels.
              </p>
            </Reveal>
            <Reveal delay={0.2}>
              <div className="mt-10 flex flex-wrap gap-3">
                <PillLink href="https://wa.me/919941999415">Ask us on WhatsApp</PillLink>
                <PillLink to="/pricing">Compare plans</PillLink>
              </div>
            </Reveal>
          </div>
          <div ref={askViewRef} className="pointer-events-none h-[42svh] lg:h-[66svh]" />
        </div>
      </section>

      <SampleCta />
    </>
  );
}
