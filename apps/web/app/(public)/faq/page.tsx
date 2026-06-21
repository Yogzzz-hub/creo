import type { Metadata } from "next";
import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import {
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
} from "@/components/ui/accordion";

export const metadata: Metadata = {
  title: "FAQ | Creo - Digital Marketing Agency",
  description:
    "Got questions about Creo? Find answers about onboarding, pricing, content revisions, contracts, and how our digital marketing agency works.",
  openGraph: {
    title: "FAQ - Creo Digital Marketing Agency",
    description:
      "Everything you need to know about working with Creo — from onboarding to content delivery.",
    url: "https://www.getcreo.in/faq",
    siteName: "Creo",
    locale: "en_IN",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "FAQ - Creo Digital Marketing Agency",
    description:
      "Everything you need to know about working with Creo — from onboarding to content delivery.",
  },
};

const FAQ_ITEMS = [
  {
    question: "How quickly will I see results?",
    answer:
      "Most clients receive their first content within 7 days of joining. You'll see initial engagement improvements within the first 2–3 weeks as we ramp up your content cadence and optimize based on early performance data.",
  },
  {
    question: "What if I don't like the content?",
    answer:
      "Every plan includes revision rounds so you can request changes before anything goes live. Our goal is to get it right — and with a 98% approval rate across our client base, we're confident you'll love what we create.",
  },
  {
    question: "Is there a contract or lock-in?",
    answer:
      "No lock-in. Monthly subscription — cancel anytime. We earn your business every month through results, not contracts.",
  },
  {
    question: "Can I get more content than my plan includes?",
    answer:
      "Yes — purchase extra posters, reels, or stories at any time through our add-on system. No plan upgrade needed.",
  },
  {
    question: "How does the onboarding process work?",
    answer:
      "After signing up, you'll fill out a short brand questionnaire. Our team builds your growth plan within 7 days, and your first batch of content is delivered right after. You'll have access to your client portal throughout the process.",
  },
  {
    question: "Who creates my content?",
    answer:
      "A dedicated team of designers, copywriters, and strategists works on your account. You'll have a consistent team that learns your brand voice over time — not a rotating pool of freelancers.",
  },
  {
    question: "What platforms do you create content for?",
    answer:
      "We create content optimized for Instagram, Facebook, LinkedIn, and Google Business Profile. All content is designed to perform across platforms, and we can tailor formats for specific channels as needed.",
  },
  {
    question: "How do I review and approve content?",
    answer:
      "Everything goes through your client portal. You'll get a notification when new content is ready, can preview it, leave comments, approve, or request revisions — all in one place.",
  },
];

export default function FAQPage() {
  return (
    <>
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-brand-light">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-20 sm:py-28">
          <div className="mx-auto max-w-3xl text-center">
            <h1 className="text-4xl font-extrabold tracking-tight text-brand-dark sm:text-5xl">
              Frequently asked questions
            </h1>
            <p className="mt-6 text-lg leading-relaxed text-neutral sm:text-xl">
              Everything you need to know about working with Creo.
            </p>
          </div>
        </div>
      </section>

      {/* FAQ Accordion */}
      <section className="bg-white py-16 sm:py-24">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
          <Accordion defaultValue={[]} className="space-y-0">
            {FAQ_ITEMS.map((item, index) => (
              <AccordionItem key={index} value={String(index)} className="border-b border-border">
                <AccordionTrigger className="text-left text-base font-semibold text-brand-dark py-5 hover:no-underline">
                  {item.question}
                </AccordionTrigger>
                <AccordionContent className="text-neutral/70 leading-relaxed pb-5">
                  {item.answer}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </section>

      {/* Bottom CTA */}
      <section className="bg-brand-dark py-16 sm:py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
            Ready to start?
          </h2>
          <p className="mt-4 text-lg text-white/70">
            Join 50+ brands growing with Creo every week.
          </p>
          <div className="mt-8">
            <Link
              href="/signup?plan=growth"
              className={buttonVariants({
                className:
                  "bg-brands text-blue-950 hover:bg-brand/90 rounded-lg h-12 px-8 text-base font-semibold transition-colors",
              })}
            >
              Get Started Today
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
