import { useState } from "react";
import { Link } from "react-router";
import { ChevronDown, HelpCircle, ArrowRight } from "lucide-react";
import { SEOHead } from "../../components/public/SEOHead";
import { SplitText, Reveal } from "../../components/motion";

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
    <div className="w-full bg-[#050810] text-[#F8FAFC] min-h-screen py-12 sm:py-16 font-sans selection:bg-[#7FA0D6]/30">
      <SEOHead
        title="Frequently Asked Questions | Creo D2C Content Pods"
        description="Learn how Creo content pods deliver weekly reels, carousels, and stories for D2C brands with transparent SLAs and clear monthly tiers."
        jsonLd={jsonLd}
      />

      <div className="max-w-[900px] mx-auto px-4 sm:px-6">
        <div className="text-center mb-12 sm:mb-16">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#161F2D] border border-[#2A3446] text-[#7FA0D6] text-xs font-bold uppercase tracking-wider mb-4">
            <HelpCircle className="size-4" />
            <span>HELP & KNOWLEDGE BASE</span>
          </div>
          <SplitText
            as="h1"
            text="Frequently Asked Questions"
            className="block text-4xl sm:text-5xl font-black tracking-tight text-white mb-4"
          />
          <p className="text-sm sm:text-base text-[#97A0B3] max-w-lg mx-auto leading-relaxed">
            Everything you need to know about Creo content pods, deliverable SLAs, and monthly retainer tiers for D2C brands.
          </p>
        </div>

        <Reveal>
          <div className="space-y-4">
            {FAQ_ITEMS.map((item, index) => {
              const isOpen = openIndex === index;
              return (
                <div
                  key={item.q}
                  className="rounded-2xl bg-[#161F2D] border border-[#2A3446] overflow-hidden transition-colors hover:border-[#7FA0D6]/40"
                >
                  <button
                    type="button"
                    onClick={() => setOpenIndex(isOpen ? null : index)}
                    className="w-full p-5 sm:p-6 text-left flex items-center justify-between gap-4 cursor-pointer focus:outline-none"
                  >
                    <span className="text-base sm:text-lg font-bold text-white leading-snug">
                      {item.q}
                    </span>
                    <ChevronDown
                      className={`size-5 text-[#7FA0D6] shrink-0 transition-transform duration-300 ${
                        isOpen ? "rotate-180" : ""
                      }`}
                    />
                  </button>

                  {isOpen && (
                    <div className="px-5 sm:px-6 pb-6 text-sm text-[#97A0B3] leading-relaxed border-t border-[#2A3446]/50 pt-4">
                      {item.a}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </Reveal>

        <div className="mt-14 text-center p-5 sm:p-8 rounded-2xl bg-[#161F2D] border border-[#2A3446] shadow-xl">
          <h3 className="text-xl font-bold text-white mb-2">Have a specific question about your brand?</h3>
          <p className="text-sm text-[#97A0B3] mb-6 max-w-md mx-auto">
            Get a free custom sample batch of reels and carousels engineered specifically for your brand identity.
          </p>
          <Link
            to="/signup?intent=sample"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-[#BCCCE6] text-[#0B111C] font-bold text-sm hover:bg-white transition-all shadow-md"
          >
            <span>Start with a free sample</span>
            <ArrowRight className="size-4" />
          </Link>
        </div>
      </div>
    </div>
  );
}
