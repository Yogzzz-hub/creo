import { useState } from "react";
import { Link } from "react-router";
import { AnimatePresence, motion } from "motion/react";
import { ChevronDown, ArrowRight } from "lucide-react";
import { SEOHead } from "../../components/public/SEOHead";
import { PageHero } from "../../components/public/PageBlocks";
import { EASE_OUT_EXPO, MaskReveal, RollText, Stagger, StaggerItem } from "../../components/motion";

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
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "mainEntity": FAQ_ITEMS.map((item) => ({
      "@type": "Question",
      "name": item.q,
      "acceptedAnswer": {
        "@type": "Answer",
        "text": item.a,
      },
    })),
  };

  return (
    <div className="min-h-screen w-full pb-12 font-sans text-site-ink sm:pb-16">
      <SEOHead
        title="Frequently Asked Questions | Creo D2C Content Pods"
        description="Learn how Creo content pods deliver weekly reels, carousels, and stories for D2C brands with transparent SLAs and clear monthly tiers."
        jsonLd={jsonLd}
      />

      <PageHero
        eyebrow="Help & knowledge base"
        title="Frequently Asked Questions"
        accent={["Questions"]}
        lead="Everything you need to know about Creo content pods, deliverable SLAs, and monthly retainer tiers for D2C brands."
      />

      <section className="mx-auto max-w-[920px] px-6 sm:px-8">
        <Stagger className="space-y-3.5" gap={0.08}>
          {FAQ_ITEMS.map((item, index) => {
            const isOpen = openIndex === index;
            const panelId = `faq-panel-${index}`;
            const buttonId = `faq-button-${index}`;
            return (
              <StaggerItem
                key={item.q}
                className={`rounded-2xl transition-[box-shadow,background-color] duration-500 ${
                  isOpen ? "creo-glass creo-glow-ring creo-beam" : "creo-glass hover:bg-hi/[0.03]"
                }`}
              >
                <h3>
                  <button
                    id={buttonId}
                    type="button"
                    aria-expanded={isOpen}
                    aria-controls={panelId}
                    onClick={() => setOpenIndex(isOpen ? null : index)}
                    className="flex w-full cursor-pointer items-center justify-between gap-4 p-5 text-left sm:p-6"
                  >
                    <span className="flex items-baseline gap-4">
                      <span
                        className={`font-mono text-xs transition-colors duration-300 ${isOpen ? "text-site-blue-light" : "text-site-blue/70"}`}
                      >
                        {String(index + 1).padStart(2, "0")}
                      </span>
                      <span className="text-base font-semibold leading-snug tracking-[-0.01em] text-hi sm:text-lg">
                        {item.q}
                      </span>
                    </span>
                    <motion.span
                      animate={{ rotate: isOpen ? 180 : 0 }}
                      transition={{ duration: 0.35, ease: EASE_OUT_EXPO }}
                      className={`flex size-9 shrink-0 items-center justify-center rounded-full border transition-colors duration-300 ${
                        isOpen ? "border-site-blue/60 bg-site-blue/15 text-hi" : "border-hi/10 text-site-mist"
                      }`}
                    >
                      <ChevronDown className="size-4" />
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
                      <p className="px-5 pb-6 pl-[3.6rem] text-[15px] leading-relaxed text-site-mist-2 sm:px-6 sm:pl-[4.1rem]">
                        {item.a}
                      </p>
                    </motion.section>
                  )}
                </AnimatePresence>
              </StaggerItem>
            );
          })}
        </Stagger>

        {/* Closing prompt */}
        <MaskReveal from="bottom" zoom={1.04} className="mt-16 rounded-[32px]">
          <div className="creo-glass creo-beam relative overflow-hidden rounded-[32px] px-6 py-12 text-center sm:px-12 sm:py-14">
            <div aria-hidden="true" className="creo-grid-bg absolute inset-0 opacity-60 [mask-image:radial-gradient(60%_80%_at_50%_0%,#000,transparent)]" />
            <div aria-hidden="true" className="absolute -top-24 left-1/2 size-[380px] -translate-x-1/2 rounded-full bg-site-blue/20 blur-[100px]" />
            <h2 className="relative text-2xl font-black tracking-[-0.03em] text-hi sm:text-3xl">
              Have a specific question about your brand?
            </h2>
            <p className="relative mx-auto mb-8 mt-3 max-w-md text-[15px] leading-relaxed text-site-mist">
              Get a free custom sample batch of reels and carousels engineered specifically for your brand identity.
            </p>
            <div className="relative flex flex-col items-stretch justify-center gap-3 sm:flex-row sm:items-center">
              <Link
                to="/signup?intent=sample"
                className="creo-btn-primary group inline-flex items-center justify-center gap-2 rounded-full px-7 py-3.5 text-sm font-semibold"
              >
                <RollText>Start with a free sample</RollText>
                <ArrowRight className="size-4 transition-transform duration-300 group-hover:translate-x-1" />
              </Link>
              <Link
                to="/pricing"
                className="creo-btn-ghost group inline-flex items-center justify-center rounded-full px-7 py-3.5 text-sm font-semibold"
              >
                <RollText>Compare plans</RollText>
              </Link>
            </div>
          </div>
        </MaskReveal>
      </section>
    </div>
  );
}
