import type { Metadata } from "next";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Check, Shield, Zap, Clock } from "lucide-react";

export const metadata: Metadata = {
  title: "Pricing | Creo - Digital Marketing Agency",
  description:
    "Simple, transparent pricing for Creo's digital marketing plans. Starter, Growth, and Pro plans — no contracts, no surprises. Upgrade or downgrade anytime.",
  openGraph: {
    title: "Pricing - Creo Digital Marketing Agency",
    description:
      "Pick the plan that fits your brand. Upgrade or downgrade anytime — no contracts, no surprises.",
    url: "https://www.getcreo.in/pricing",
    siteName: "Creo",
    locale: "en_IN",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Pricing - Creo Digital Marketing Agency",
    description:
      "Pick the plan that fits your brand. Upgrade or downgrade anytime — no contracts, no surprises.",
  },
};

const PLANS = [
  {
    name: "Starter",
    price: "TBD",
    description: "For small businesses getting started",
    features: [
      "3 Posters / month",
      "2 Reels / month",
      "3 Stories / month",
      "Content Calendar",
      "Client Portal",
      "1 Revision Round",
    ],
    cta: "Start Growing",
    highlighted: false,
    href: "/signup?plan=starter",
  },
  {
    name: "Growth",
    price: "TBD",
    description: "Most popular for growing brands",
    features: [
      "6 Posters / month",
      "4 Reels / month",
      "6 Stories / month",
      "Content Calendar",
      "Client Portal",
      "2 Revision Rounds",
    ],
    cta: "Start Growing",
    highlighted: true,
    href: "/signup?plan=growth",
  },
  {
    name: "Pro",
    price: "TBD",
    description: "For brands that need dedicated attention",
    features: [
      "6 Posters / month",
      "4 Reels / month",
      "9 Stories / month",
      "Content Calendar",
      "Client Portal",
      "Dedicated Manager",
      "3 Revision Rounds",
    ],
    cta: "Start Growing",
    highlighted: false,
    href: "/signup?plan=pro",
  },
];

export default function PricingPage() {
  return (
    <>
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-brand-light">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-20 sm:py-28">
          <div className="mx-auto max-w-3xl text-center">
            <h1 className="text-4xl font-extrabold tracking-tight text-brand-dark sm:text-5xl">
              Simple, transparent pricing
            </h1>
            <p className="mt-6 text-lg leading-relaxed text-neutral sm:text-xl">
              Pick the plan that fits your brand. Upgrade or downgrade anytime — no contracts, no surprises.
            </p>
            <div className="mt-6 inline-flex items-center gap-2 rounded-full bg-accent/10 px-4 py-2 text-sm font-medium text-accent">
              <Zap className="size-4" />
              Joined by 50+ brands this year
            </div>
          </div>
        </div>
      </section>

      {/* Pricing Cards */}
      <section id="plans" className="bg-white py-16 sm:py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid gap-8 lg:grid-cols-3">
            {PLANS.map((plan) => (
              <Card
                key={plan.name}
                className={`relative flex flex-col ${
                  plan.highlighted
                    ? "border-2 border-[#2B7BC4] shadow-lg"
                    : "border-border"
                }`}
              >
                {plan.highlighted && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <span className="bg-accent text-white text-xs font-semibold px-4 py-1.5 rounded-full">
                      Most Popular
                    </span>
                  </div>
                )}
                <CardHeader className="text-center pt-8">
                  <CardTitle className="text-xl text-brand-dark">
                    {plan.name}
                  </CardTitle>
                  <div className="mt-3">
                    <span className="text-4xl font-bold text-brand-dark">
                      {plan.price}
                    </span>
                    <span className="text-neutral/60"> /month</span>
                  </div>
                  <p className="mt-2 text-sm text-neutral/60">
                    {plan.description}
                  </p>
                </CardHeader>
                <CardContent className="flex flex-1 flex-col px-6 pb-8">
                  <ul className="flex-1 space-y-3">
                    {plan.features.map((feature) => (
                      <li key={feature} className="flex items-center gap-2 text-sm text-neutral">
                        <Check className="h-4 w-4 text-success shrink-0" />
                        {feature}
                      </li>
                    ))}
                  </ul>
                  <div className="mt-6">
                    <Button
                      render={<Link href={plan.href} />}
                      className={`w-full h-11 ${
                        plan.highlighted
                          ? "bg-[#2B7BC4] hover:bg-[#2B7BC4]/90 text-white"
                          : "bg-brand-dark hover:bg-brand-dark/90 text-white"
                      }`}
                    >
                      {plan.cta}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Trust & Urgency Triggers */}
      <section className="bg-neutral-light py-16 sm:py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            <div className="flex items-start gap-4 rounded-xl bg-white p-6 border border-border">
              <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-accent/10 text-accent">
                <Clock className="size-5" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-brand-dark">
                  Only 5 slots left
                </h3>
                <p className="mt-1 text-sm text-neutral/60">
                  Only 5 onboarding slots available this month
                </p>
              </div>
            </div>
            <div className="flex items-start gap-4 rounded-xl bg-white p-6 border border-border">
              <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-success/10 text-success">
                <Shield className="size-5" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-brand-dark">
                  Risk-free guarantee
                </h3>
                <p className="mt-1 text-sm text-neutral/60">
                  Not happy after your first week? We&apos;ll make it right.
                </p>
              </div>
            </div>
            <div className="flex items-start gap-4 rounded-xl bg-white p-6 border border-border">
              <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-brand/10 text-brand">
                <Zap className="size-5" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-brand-dark">
                  Speed promise
                </h3>
                <p className="mt-1 text-sm text-neutral/60">
                  Onboarded in 7 days. First content delivered within 7 days of joining.
                </p>
              </div>
            </div>
            <div className="flex items-start gap-4 rounded-xl bg-white p-6 border border-border">
              <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-warning/10 text-warning">
                <Check className="size-5" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-brand-dark">
                  Flexible add-ons
                </h3>
                <p className="mt-1 text-sm text-neutral/60">
                  Need more? Top up with extra posts anytime — no upgrade needed.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Bottom CTA */}
      <section className="bg-brand-dark py-16 sm:py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
            Ready to grow your brand?
          </h2>
          <p className="mt-4 text-lg text-white/70">
            Join 50+ businesses that chose Creo as their growth partner.
          </p>
          <div className="mt-8">
            <Button
              render={<Link href="/signup?plan=growth" />}
              className="bg-white text-brand-dark hover:bg-white/90 rounded-lg h-12 px-8 text-base font-semibold"
            >
              Get Started Today
            </Button>
          </div>
        </div>
      </section>
    </>
  );
}
