export const dynamic = "force-static";
export const revalidate = 3600;

import type { Metadata } from "next";
import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowUpRight } from "lucide-react";
import { GalleryTabs } from "@/components/public/gallery-grid";
import { SITE } from "@/lib/constants";

export const metadata: Metadata = {
  title: "Our Work | Creo - Digital Marketing Agency",
  description:
    "Explore Creo's portfolio — real case studies from fashion, food, and wellness brands. See the content strategies that delivered 3x reel reach and 1,200+ new followers.",
  openGraph: {
    title: "Our Work - Creo Digital Marketing Agency",
    description:
      "Real results from real businesses. Explore the brands we've helped grow.",
    url: "https://www.getcreo.in/portfolio",
    siteName: "Creo",
    locale: "en_IN",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Our Work - Creo Digital Marketing Agency",
    description:
      "Real results from real businesses. Explore the brands we've helped grow.",
  },
};

const CASE_STUDIES_PLACEHOLDER = [
  {
    industry: "Fashion & Apparel",
    challenge:
      "Low social engagement and inconsistent posting schedule despite a strong product line.",
    approach:
      "Built a 90-day content calendar with weekly reels, shoppable posts, and influencer collabs.",
    result: "3x reel reach in 30 days",
    color: "bg-brand-light",
  },
  {
    industry: "Food & Beverage",
    challenge:
      "New restaurant struggling to build an online following and drive foot traffic.",
    approach:
      "Launched a behind-the-scenes content series, local food blogger partnerships, and geo-targeted reels.",
    result: "1,200+ new followers in 3 weeks",
    color: "bg-accent/10",
  },
  {
    industry: "Health & Wellness",
    challenge:
      "Existing content felt generic and failed to differentiate from competitors.",
    approach:
      "Created a brand-first content strategy with client transformation stories, trainer spotlights, and weekly tips.",
    result: "85% content approval rate",
    color: "bg-success-light",
  },
];

export default function PortfolioPage() {
  return (
    <>
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-brand-light">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-20 sm:py-28">
          <div className="mx-auto max-w-3xl text-center">
            <h1 className="text-4xl font-extrabold tracking-tight text-brand-dark sm:text-5xl">
              Our Work Speaks
              <br />
              <span className="text-brand">for Itself</span>
            </h1>
            <p className="mt-6 text-lg leading-relaxed text-neutral sm:text-xl">
              Real results from real businesses. Explore the brands we&apos;ve
              helped grow — and the content that made it happen.
            </p>
          </div>
        </div>
      </section>

      {/* Case Studies */}
      <section className="bg-white py-16 sm:py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <span className="text-sm font-semibold uppercase tracking-widest text-brand">
              Case Studies
            </span>
            <h2 className="mt-4 text-3xl font-bold tracking-tight text-brand-dark sm:text-4xl">
              Results-first, always
            </h2>
            <p className="mt-4 text-lg text-neutral/60">
              Every project starts with a challenge and ends with measurable
              growth.
            </p>
          </div>

          <div className="mt-14 grid gap-8 lg:grid-cols-3">
            {CASE_STUDIES_PLACEHOLDER.map((study) => (
              <Card
                key={study.industry}
                className="border-border bg-white transition-shadow hover:shadow-lg"
              >
                <CardContent className="p-6">
                  <span className="inline-block rounded-full bg-brand-light px-3 py-1 text-xs font-semibold text-brand">
                    {study.industry}
                  </span>

                  <div className="mt-4 space-y-4">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wider text-neutral/40">
                        Challenge
                      </p>
                      <p className="mt-1 text-sm leading-relaxed text-neutral/70">
                        {study.challenge}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wider text-neutral/40">
                        Our Approach
                      </p>
                      <p className="mt-1 text-sm leading-relaxed text-neutral/70">
                        {study.approach}
                      </p>
                    </div>
                    <div className={`rounded-lg ${study.color} p-4`}>
                      <p className="text-xs font-semibold uppercase tracking-wider text-brand">
                        Key Result
                      </p>
                      <p className="mt-1 text-lg font-bold text-brand-dark">
                        {study.result}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          <p className="mt-8 text-center text-xs text-neutral/40">
            Illustrative examples. Real client case studies with specific metrics will be added after launch.
          </p>
        </div>
      </section>

      {/* Filterable Gallery */}
      <section className="bg-neutral-light py-16 sm:py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <span className="text-sm font-semibold uppercase tracking-widest text-brand">
              Creative Gallery
            </span>
            <h2 className="mt-4 text-3xl font-bold tracking-tight text-brand-dark sm:text-4xl">
              See what we create
            </h2>
            <p className="mt-4 text-lg text-neutral/60">
              Browse our latest posters, creatives, and reels.
            </p>
          </div>

          <GalleryTabs />
        </div>
      </section>

      {/* Bottom CTA */}
      <section className="bg-brand-dark py-16 sm:py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
            Want results like these?
          </h2>
          <p className="mt-4 text-lg text-white/70">
            Let&apos;s build a content strategy that grows your brand.
          </p>
          <div className="mt-8 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
            <Link
              href="/pricing"
              className={buttonVariants({
                variant: "outline",
                className:
                  "bg-white text-deep navy hover:bg-brand/90 rounded-lg h-12 px-8 text-base font-semibold",
              })}
            >
              See Our Plans
            </Link>
            <a
              href={`https://wa.me/${SITE.whatsapp}`}
              target="_blank"
              rel="noopener noreferrer"
              className={buttonVariants({
                variant: "outline",
                className:
                  "bg-brand text-white hover:bg-brand/90 rounded-lg h-12 px-8 text-base font-semibold transition-colors",
              })}
            >
              Book a Call
              <ArrowUpRight className="ml-1 size-4" />
            </a>
          </div>
        </div>
      </section>
    </>
  );
}
