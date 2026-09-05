export const revalidate = 60;

import type { Metadata } from "next";
import Link from "next/link";
import { Check, Shield, Zap, Clock } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { SITE } from "@/lib/constants";
import { getApiUrl } from "@/lib/api-url";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

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

interface Plan {
  id: string;
  name: string;
  display_name: string;
  monthly_price: number;
  poster_quota: number;
  reel_quota: number;
  story_quota: number;
  revision_rounds: number;
  has_dedicated_manager: boolean;
  highlights: string[];
  is_recommended: boolean;
  is_active: boolean;
}

interface PublicSettings {
  scarcity_slots_available: number;
}

const DEFAULT_PLANS: Plan[] = [
  {
    id: "starter",
    name: "starter",
    display_name: "Starter",
    monthly_price: 15000,
    poster_quota: 4,
    reel_quota: 2,
    story_quota: 4,
    revision_rounds: 1,
    has_dedicated_manager: false,
    highlights: [
      "4 High-converting static posters",
      "2 Cinematic short-form reels",
      "Monthly content calendar",
      "Dedicated creative support",
    ],
    is_recommended: false,
    is_active: true,
  },
  {
    id: "growth",
    name: "growth",
    display_name: "Growth",
    monthly_price: 25000,
    poster_quota: 8,
    reel_quota: 4,
    story_quota: 8,
    revision_rounds: 2,
    has_dedicated_manager: true,
    highlights: [
      "8 High-converting static posters",
      "4 Cinematic short-form reels",
      "Dedicated account manager",
      "Instagram auto-publishing",
    ],
    is_recommended: true,
    is_active: true,
  },
  {
    id: "pro",
    name: "pro",
    display_name: "Pro",
    monthly_price: 45000,
    poster_quota: 15,
    reel_quota: 8,
    story_quota: 15,
    revision_rounds: 3,
    has_dedicated_manager: true,
    highlights: [
      "15 High-converting static posters",
      "8 Cinematic short-form reels",
      "Priority delivery & custom shoot",
      "Full multichannel growth strategy",
    ],
    is_recommended: false,
    is_active: true,
  },
];

async function getPlans(): Promise<Plan[]> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 1500);
    const res = await fetch(`${getApiUrl()}/api/v1/plans`, {
      next: { revalidate: 60 },
      signal: controller.signal,
    });
    clearTimeout(timeout);
    if (!res.ok) return DEFAULT_PLANS;
    const data = await res.json();
    return Array.isArray(data) && data.length > 0 ? data : DEFAULT_PLANS;
  } catch {
    return DEFAULT_PLANS;
  }
}

async function getPublicSettings(): Promise<PublicSettings> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 1500);
    const res = await fetch(`${getApiUrl()}/api/v1/settings/public`, {
      next: { revalidate: 60 },
      signal: controller.signal,
    });
    clearTimeout(timeout);
    if (!res.ok) return { scarcity_slots_available: 5 };
    return res.json();
  } catch {
    return { scarcity_slots_available: 5 };
  }
}

function formatPrice(price: number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(price);
}

export default async function PricingPage() {
  const [plans, settings] = await Promise.all([
    getPlans(),
    getPublicSettings(),
  ]);

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
            <div className="mt-6 flex flex-col sm:flex-row items-center justify-center gap-4">
              <div className="inline-flex items-center gap-2 rounded-full bg-accent/10 px-4 py-2 text-sm font-medium text-accent">
                <Zap className="size-4" />
                Joined by 50+ brands this year
              </div>
              {settings.scarcity_slots_available > 0 && (
                <div className="inline-flex items-center gap-2 rounded-full bg-warning/10 px-4 py-2 text-sm font-medium text-warning">
                  <span className="relative flex h-2.5 w-2.5">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-warning opacity-75" />
                    <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-warning" />
                  </span>
                  Only {settings.scarcity_slots_available} onboarding slots left this month
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Pricing Cards (Dynamically fetched from DB) */}
      <section id="plans" className="bg-white py-16 sm:py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          {plans.length === 0 ? (
            <p className="text-center text-muted-foreground">
              Plans are currently unavailable. Please check back later.
            </p>
          ) : (
            <div className="grid gap-8 lg:grid-cols-3">
              {plans.map((plan) => {
                const highlights = plan.highlights ?? [];

                return (
                  <Card
                    key={plan.id}
                    className="relative flex flex-col border-border shadow-card"
                  >
                    <CardHeader className="text-center pt-8">
                      <CardTitle className="text-2xl font-bold text-brand-dark">
                        {plan.display_name}
                      </CardTitle>
                      <CardDescription className="mt-2">
                        <span className="text-4xl font-bold text-brand-dark">
                          {formatPrice(plan.monthly_price)}
                        </span>
                        <span className="text-muted-foreground"> /month</span>
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="flex-1 px-6 pb-8">
                      <ul className="space-y-3">
                        {highlights.map((item) => (
                          <li key={item} className="flex items-start gap-2 text-sm text-text">
                            <Check className="mt-0.5 h-4 w-4 shrink-0 text-success" />
                            {item}
                          </li>
                        ))}
                        <li className="flex items-start gap-2 text-sm text-text">
                          <Check className="mt-0.5 h-4 w-4 shrink-0 text-success" />
                          {plan.poster_quota} posters, {plan.reel_quota} reels, {plan.story_quota} stories per month
                        </li>
                        <li className="flex items-start gap-2 text-sm text-text">
                          <Check className="mt-0.5 h-4 w-4 shrink-0 text-success" />
                          {plan.revision_rounds} revision round{plan.revision_rounds !== 1 ? "s" : ""} per deliverable
                        </li>
                        {plan.has_dedicated_manager && (
                          <li className="flex items-start gap-2 text-sm text-text">
                            <Check className="mt-0.5 h-4 w-4 shrink-0 text-success" />
                            Dedicated account manager
                          </li>
                        )}
                      </ul>
                    </CardContent>
                    <CardFooter className="pt-4 px-6 pb-8">
                      <Link
                        href={`/onboarding/terms?plan=${plan.name}`}
                        className={buttonVariants({
                          className: "w-full h-11 text-base font-semibold bg-brand-dark hover:bg-brand-dark/90 text-white",
                        })}
                      >
                        Start Growing
                      </Link>
                    </CardFooter>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      </section>

      {/* Custom Plan CTA */}
      <section className="bg-white py-16 sm:py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl font-bold tracking-tight text-brand-dark sm:text-4xl">
            Need a Customized Plan?
          </h2>
          <div className="mt-8">
            <a
              href={`https://wa.me/${SITE.whatsapp}`}
              target="_blank"
              rel="noopener noreferrer"
              className={buttonVariants({
                className:
                  "bg-[#2B7BC4] hover:bg-[#2B7BC4]/90 text-white h-11 px-8 text-base font-semibold",
              })}
            >
              Talk to Our Team
            </a>
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
                  Limited Availability
                </h3>
                <p className="mt-1 text-sm text-neutral/60">
                  We cap onboarding to ensure high quality delivery.
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
            <Link
              href="/signup?plan=growth"
              className={buttonVariants({
                className:
                  "bg-brand text-white hover:bg-brand/90 rounded-lg h-12 px-8 text-base font-semibold",
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