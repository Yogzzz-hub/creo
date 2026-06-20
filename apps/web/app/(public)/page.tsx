"use client";

import Link from "next/link";
import {
  ArrowRight,
  CheckCircle2,
  FileText,
  CreditCard,
  Zap,
  ThumbsUp,
  Rocket,
} from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const LOCAL_BUSINESS_SCHEMA = {
  "@context": "https://schema.org",
  "@type": "LocalBusiness",
  name: "Creo",
  description:
    "Full-service digital marketing agency helping local businesses grow with weekly content, social media management, and performance marketing.",
  url: "https://www.getcreo.in",
  telephone: "+91-9999999999",
  email: "hello@getcreo.in",
  address: {
    "@type": "PostalAddress",
    addressCountry: "IN",
  },
  sameAs: [
    "https://www.instagram.com/getcreo",
    "https://www.linkedin.com/company/getcreo",
    "https://twitter.com/getcreo",
  ],
  priceRange: "$$",
  aggregateRating: {
    "@type": "AggregateRating",
    ratingValue: "4.9",
    reviewCount: "50",
  },
};

const STATS = [
  { value: "50+", label: "Brands Grown" },
  { value: "1,200+", label: "Reels Delivered" },
  { value: "12+", label: "Industries Served" },
  { value: "3+", label: "Years of Experience" },
  { value: "98%", label: "Approval Rate" },
];

const STEPS = [
  {
    number: "01",
    title: "Tell Us About Your Brand",
    description:
      "Fill out a quick questionnaire so we understand your voice, audience, and goals.",
    icon: FileText,
  },
  {
    number: "02",
    title: "We Build Your Growth Plan",
    description:
      "Our team crafts a tailored content and marketing strategy based on your brand DNA.",
    icon: CheckCircle2,
  },
  {
    number: "03",
    title: "Choose Your Plan & Pay",
    description:
      "Pick the plan that fits your budget. Upgrade or downgrade anytime.",
    icon: CreditCard,
  },
  {
    number: "04",
    title: "Content Delivered in 7 Days",
    description:
      "Your first batch of professionally designed content lands in your portal within a week.",
    icon: Zap,
  },
  {
    number: "05",
    title: "Approve, Publish, Grow",
    description:
      "Review deliverables, approve with one click, and watch your brand grow week after week.",
    icon: Rocket,
  },
];

export default function HomePage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(LOCAL_BUSINESS_SCHEMA),
        }}
      />

      {/* Hero Section */}
      <section
        className="relative overflow-hidden"
        style={{
          background:
            "linear-gradient(135deg, #2B7BC4 0%, #E8F4FD 100%)",
        }}
      >
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-16 sm:py-20 lg:py-28">
          <div className="grid items-center gap-12 lg:grid-cols-2">
            <div className="max-w-xl">
              <h1 className="text-4xl font-extrabold leading-tight tracking-tight text-white sm:text-5xl lg:text-6xl">
                Your brand.{" "}
                <span className="text-white/80">Growing.</span>{" "}
                Every week.
              </h1>
              <p className="mt-6 text-lg leading-relaxed text-white/80 sm:text-xl">
                Onboarded in 7 days. Content delivered every week.
              </p>

              <div className="mt-6 inline-flex items-center gap-2 rounded-full bg-white/20 px-4 py-2 text-sm font-medium text-white backdrop-blur-sm">
                <ThumbsUp className="size-4" />
                50+ brands growing with us
              </div>

              <div className="mt-10 flex flex-col gap-4 sm:flex-row">
                <Link
                  href="/pricing#plans"
                  className={buttonVariants({
                    className:
                      "bg-white text-brand-dark hover:bg-white/90 rounded-lg h-12 px-8 text-base font-semibold",
                  })}
                >
                  See Our Plans
                </Link>
                <Link
                  href="https://wa.me/"
                  className={buttonVariants({
                    variant: "outline",
                    className:
                      "border-white/30 text-white hover:bg-white/10 rounded-lg h-12 px-8 text-base font-semibold",
                  })}
                >
                  Book a Call
                </Link>
              </div>
            </div>

            <div className="hidden lg:block">
              <div className="aspect-video rounded-2xl bg-white/20 backdrop-blur-sm border border-white/20 flex items-center justify-center">
                <div className="text-center text-white/60">
                  <Rocket className="mx-auto size-12 mb-3" />
                  <p className="text-sm font-medium">
                    Looping video / creative collage
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="bg-white py-16 sm:py-20 lg:py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto">
            <h2 className="text-3xl font-bold tracking-tight text-brand-dark sm:text-4xl">
              How It Works
            </h2>
            <p className="mt-4 text-lg text-neutral/60">
              Five simple steps from sign-up to your first content drop.
            </p>
          </div>

          <div className="mt-14 grid gap-8 sm:grid-cols-2 lg:grid-cols-5">
            {STEPS.map((step) => (
              <div key={step.number} className="relative text-center">
                <div className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-brand-light text-brand">
                  <step.icon className="size-6" />
                </div>
                <span className="mt-4 block text-xs font-bold uppercase tracking-widest text-brand-mid">
                  Step {step.number}
                </span>
                <h3 className="mt-2 text-base font-semibold text-brand-dark">
                  {step.title}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-neutral/60">
                  {step.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Stats Strip */}
      <section className="bg-brand-dark py-14 sm:py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 gap-8 sm:grid-cols-3 lg:grid-cols-5">
            {STATS.map((stat) => (
              <div key={stat.label} className="text-center">
                <p className="text-3xl font-extrabold text-white sm:text-4xl">
                  {stat.value}
                </p>
                <p className="mt-2 text-sm text-white/60">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Lead Magnet Banner */}
      <section className="bg-brand-light py-16 sm:py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-2xl font-bold tracking-tight text-brand-dark sm:text-3xl">
              Download a Free Content Calendar Template
            </h2>
            <p className="mt-4 text-base leading-relaxed text-neutral/60">
              A ready-to-use social media content calendar designed for local
              businesses. Plan 30 days of posts in under an hour.
            </p>

            <form
              onSubmit={(e) => e.preventDefault()}
              className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center"
            >
              <Input
                type="email"
                placeholder="you@business.com"
                className="h-12 flex-1 sm:max-w-xs rounded-lg border-border bg-white px-4 text-sm"
              />
              <Button className="h-12 rounded-lg bg-brand px-6 text-white hover:bg-brand/90">
                Get the Template
                <ArrowRight className="ml-1 size-4" />
              </Button>
            </form>
            <p className="mt-3 text-xs text-neutral/40">
              No spam. Unsubscribe anytime.
            </p>
          </div>
        </div>
      </section>
    </>
  );
}
