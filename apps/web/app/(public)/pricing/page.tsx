import Link from "next/link";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";

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

const API_BASE = process.env.API_URL ?? "http://localhost:8000";

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
    "Dedicated account manager",
    "Instagram auto-publishing",
  ],
};

export default async function PricingPage() {
  const [plans, settings] = await Promise.all([
    getPlans(),
    getPublicSettings(),
  ]);

  return (
    <div className="flex flex-col min-h-screen">
      <section className="bg-brand-light py-20 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-4xl md:text-5xl font-bold text-brand-dark tracking-tight">
            Simple, Transparent Pricing
          </h1>
          <p className="mt-4 text-lg text-text-muted max-w-2xl mx-auto">
            Choose the plan that fits your business. Upgrade or downgrade
            anytime.
          </p>
          {settings.scarcity_slots_available > 0 && (
            <div className="mt-6 inline-flex items-center gap-2 rounded-full bg-warning-light px-5 py-2 text-sm font-medium text-warning">
              <span className="relative flex h-2.5 w-2.5">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-warning opacity-75" />
                <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-warning" />
              </span>
              Only {settings.scarcity_slots_available} onboarding slots
              available this month
            </div>
          )}
        </div>
      </section>

      <section className="flex-1 bg-background py-16 px-4">
        <div className="max-w-6xl mx-auto">
          {plans.length === 0 ? (
            <p className="text-center text-muted-foreground">
              Plans are currently unavailable. Please check back later.
            </p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {plans.map((plan) => {
                const isPopular = plan.name === "growth";
                const highlights = planHighlights[plan.name] ?? [];

                return (
                  <Card
                    key={plan.id}
                    className={`relative flex flex-col ${
                      isPopular
                        ? "border-primary ring-2 ring-primary/20 shadow-modal"
                        : "shadow-card"
                    }`}
                  >
                    {isPopular && (
                      <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 rounded-full bg-primary px-4 py-1 text-xs font-semibold text-primary-foreground">
                        Most Popular
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
                        <span className="text-muted-foreground">/month</span>
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="flex-1">
                      <ul className="space-y-3">
                        {highlights.map((item) => (
                          <li
                            key={item}
                            className="flex items-start gap-2 text-sm text-text"
                          >
                            <svg
                              className="mt-0.5 h-5 w-5 shrink-0 text-success"
                              fill="none"
                              viewBox="0 0 24 24"
                              stroke="currentColor"
                              strokeWidth={2}
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                d="M5 13l4 4L19 7"
                              />
                            </svg>
                            {item}
                          </li>
                        ))}
                        <li className="flex items-start gap-2 text-sm text-text">
                          <svg
                            className="mt-0.5 h-5 w-5 shrink-0 text-success"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                            strokeWidth={2}
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              d="M5 13l4 4L19 7"
                            />
                          </svg>
                          {plan.poster_quota} posters, {plan.reel_quota} reels,{" "}
                          {plan.story_quota} stories per month
                        </li>
                        <li className="flex items-start gap-2 text-sm text-text">
                          <svg
                            className="mt-0.5 h-5 w-5 shrink-0 text-success"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                            strokeWidth={2}
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              d="M5 13l4 4L19 7"
                            />
                          </svg>
                          {plan.revision_rounds} revision round
                          {plan.revision_rounds !== 1 ? "s" : ""} per
                          deliverable
                        </li>
                        {plan.has_dedicated_manager && (
                          <li className="flex items-start gap-2 text-sm text-text">
                            <svg
                              className="mt-0.5 h-5 w-5 shrink-0 text-success"
                              fill="none"
                              viewBox="0 0 24 24"
                              stroke="currentColor"
                              strokeWidth={2}
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                d="M5 13l4 4L19 7"
                              />
                            </svg>
                            Dedicated account manager
                          </li>
                        )}
                      </ul>
                    </CardContent>
                    <CardFooter className="pt-4">
                      <Button
                        asChild
                        className={`w-full h-11 text-base font-semibold ${
                          isPopular
                            ? ""
                            : "bg-brand-dark hover:bg-brand-dark/90"
                        }`}
                        variant={isPopular ? "default" : "default"}
                      >
                        <Link href={`/signup?plan=${plan.name}`}>
                          Start Growing
                        </Link>
                      </Button>
                    </CardFooter>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
