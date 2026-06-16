import type { Metadata } from "next";
import Link from "next/link";
import { Check, Shield, Zap, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
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
  is_active: boolean;
}

interface PublicSettings {
  scarcity_slots_available: number;
}

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

async function getPlans(): Promise<Plan[]> {
  try {
    const res = await fetch(`${API_BASE}/api/v1/plans`, {
      next: { revalidate: 60 },
    });
    if (!res.ok) return [];
    return res.json();
  } catch {
    return [];
  }
}

async function getPublicSettings(): Promise<PublicSettings> {
  try {
    const res = await fetch(`${API_BASE}/api/v1/settings/public`, {
      next: { revalidate: 60 },
    });
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

const planHighlights: Record<string, string[]> = {
  starter: [
    "Social media management for 1 platform",
    "Basic content calendar",
    "Monthly performance report",
    "Email support",
  ],
  growth: [
    "Social media management for 2 platforms",
    "Advanced content calendar with revisions",
    "Bi-weekly performance reports",
    "Priority email & chat support",
    "Dedicated account manager",
  ],
  pro: [
    "Social media management for 3+ platforms",
    "Full content calendar with unlimited revisions",
    "Weekly performance reports & AI insights",
    "Priority support with live chat",
    "Instagram auto-publishing",
  ],
};

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
                const isPopular = plan.name === "growth";
                const highlights = planHighlights[plan.name] ?? [];

                return (
                  <Card
                    key={plan.id}
                    className={`relative flex flex-col ${
                      isPopular
                        ? "border-2 border-[#2B7BC4] shadow-lg"
                        : "border-border shadow-card"
                    }`}
                  >
                    {isPopular && (
                      <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                        <span className="bg-[#2B7BC4] text-white text-xs font-semibold px-4 py-1.5 rounded-full">
                          Most Popular
                        </span>
                      </div>
                    )}
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
                      <Button
                        render={<Link href={`/signup?plan=${plan.name}`} />}
                        className={`w-full h-11 text-base font-semibold ${
                          isPopular
                            ? "bg-[#2B7BC4] hover:bg-[#2B7BC4]/90 text-white"
                            : "bg-brand-dark hover:bg-brand-dark/90 text-white"
                        }`}
                      >
                        Start Growing
                      </Button>
                    </CardFooter>
                  </Card>
                );
              })}
            </div>
          )}
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