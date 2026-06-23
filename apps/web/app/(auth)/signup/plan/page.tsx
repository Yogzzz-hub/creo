"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Check, Info, Loader2, Users } from "lucide-react";

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

function buildFeatures(plan: Plan): string[] {
  const features: string[] = [
    `${plan.poster_quota} Posters / month`,
    `${plan.reel_quota} Reels / month`,
    `${plan.story_quota} Stories / month`,
    "Content Calendar",
    "Client Portal",
    `${plan.revision_rounds} Revision Round${plan.revision_rounds !== 1 ? "s" : ""}`,
  ];
  if (plan.has_dedicated_manager) {
    features.push("Dedicated Manager");
  }
  return features;
}

function formatPrice(price: number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(price);
}

function PlansSkeleton() {
  return (
    <div className="grid md:grid-cols-3 gap-6">
      {[1, 2, 3].map((i) => (
        <Card key={i} className="relative border-border">
          <CardHeader className="text-center pt-8">
            <div className="mx-auto h-6 w-24 animate-pulse rounded bg-gray-200" />
            <div className="mt-3 mx-auto h-8 w-28 animate-pulse rounded bg-gray-200" />
            <div className="mt-2 mx-auto h-4 w-40 animate-pulse rounded bg-gray-200" />
          </CardHeader>
          <CardContent>
            <ul className="space-y-3">
              {[1, 2, 3, 4, 5].map((j) => (
                <li key={j} className="flex items-center gap-2">
                  <div className="h-4 w-4 animate-pulse rounded bg-gray-200" />
                  <div className="h-4 animate-pulse rounded bg-gray-200" style={{ width: `${60 + j * 8}%` }} />
                </li>
              ))}
            </ul>
          </CardContent>
          <CardFooter>
            <div className="mx-auto h-10 w-full animate-pulse rounded bg-gray-200" />
          </CardFooter>
        </Card>
      ))}
    </div>
  );
}

function PlanSelectionContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const planParam = searchParams.get("plan");

  const [plans, setPlans] = useState<Plan[]>([]);
  const [settings, setSettings] = useState<PublicSettings>({ scarcity_slots_available: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(null);

  useEffect(() => {
    async function fetchPlans() {
      try {
        const supabase = createClient();
        const {
          data: { session },
        } = await supabase.auth.getSession();

        const headers: Record<string, string> = {};
        if (session?.access_token) {
          headers["Authorization"] = `Bearer ${session.access_token}`;
        }

        const [plansRes, settingsRes] = await Promise.all([
          fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/plans`, { headers }),
          fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/settings/public`),
        ]);

        if (!plansRes.ok) {
          throw new Error("Failed to load plans");
        }

        const data: Plan[] = await plansRes.json();
        const active = data.filter((p) => p.is_active);
        setPlans(active);

        if (settingsRes.ok) {
          const settingsData: PublicSettings = await settingsRes.json();
          setSettings(settingsData);
        }

        if (planParam) {
          const match = active.find(
            (p) => p.name.toLowerCase() === planParam.toLowerCase()
          );
          if (match) {
            setSelectedPlanId(match.id);
          }
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Something went wrong");
      } finally {
        setLoading(false);
      }
    }
    fetchPlans();
  }, [planParam]);

  function handleSelectPlan(planId: string) {
    setSelectedPlanId(planId);
    const plan = plans.find((p) => p.id === planId);
    if (plan) {
      router.push(`/onboarding/payment?plan=${plan.name}`);
    }
  }

  const selectedPlan = plans.find((p) => p.id === selectedPlanId);

  if (loading) {
    return (
      <div className="min-h-screen bg-bg px-4 py-12">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-brand-dark">Choose Your Plan</h1>
            <p className="text-text-muted mt-2">
              Select the plan that best fits your brand&apos;s needs
            </p>
          </div>
          <div className="flex items-center justify-center gap-2 mb-8">
            <Loader2 className="h-4 w-4 animate-spin text-text-muted" />
            <span className="text-sm text-text-muted">Loading plans...</span>
          </div>
          <PlansSkeleton />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-bg flex items-center justify-center px-4">
        <Card className="max-w-md w-full">
          <CardContent className="flex flex-col items-center py-12">
            <p className="text-sm text-red-600 font-medium">{error}</p>
            <p className="mt-2 text-xs text-text-muted">
              Please try refreshing the page.
            </p>
            <Button
              variant="outline"
              className="mt-4"
              onClick={() => window.location.reload()}
            >
              Retry
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (plans.length === 0) {
    return (
      <div className="min-h-screen bg-bg flex items-center justify-center px-4">
        <Card className="max-w-md w-full">
          <CardContent className="flex flex-col items-center py-12">
            <p className="text-sm text-text-muted">
              No plans available at the moment. Please check back later.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-bg px-4 py-12">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-brand-dark">Choose Your Plan</h1>
          <p className="text-text-muted mt-2">
            Select the plan that best fits your brand&apos;s needs
          </p>
          {settings.scarcity_slots_available > 0 && (
            <div className="mt-4 inline-flex items-center gap-2 rounded-full bg-warning/10 px-4 py-2 text-sm font-medium text-warning">
              <span className="relative flex h-2.5 w-2.5">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-warning opacity-75" />
                <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-warning" />
              </span>
              Only {settings.scarcity_slots_available} onboarding slots left this month
            </div>
          )}
        </div>

        {selectedPlan && (
          <div className="mb-8 mx-auto max-w-md rounded-lg border border-accent/30 bg-accent/5 px-4 py-3 flex items-center gap-3">
            <Info className="h-5 w-5 text-accent shrink-0" />
            <p className="text-sm text-brand-dark">
              <span className="font-semibold">{selectedPlan.display_name}</span>{" "}
              plan pre-selected based on your selection.
            </p>
          </div>
        )}

        <div className="grid md:grid-cols-3 gap-6">
          {plans.map((plan) => {
            const isSelected = selectedPlanId === plan.id;
            const isPopular = plan.is_recommended;
            const features = buildFeatures(plan);

            return (
              <Card
                key={plan.id}
                className={`relative transition-all ${
                  isSelected
                    ? "border-2 border-accent shadow-lg ring-2 ring-accent/20"
                    : isPopular
                      ? "border-2 border-brand shadow-lg"
                      : "border-border"
                }`}
              >
                {isPopular && !isSelected && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <span className="bg-brand text-white text-xs font-medium px-3 py-1 rounded-full">
                      Most Popular
                    </span>
                  </div>
                )}
                {isSelected && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <span className="bg-accent text-white text-xs font-medium px-3 py-1 rounded-full">
                      Selected
                    </span>
                  </div>
                )}
                <CardHeader className="text-center pt-8">
                  <CardTitle className="text-xl text-brand-dark">
                    {plan.display_name}
                  </CardTitle>
                  <div className="mt-2">
                    <span className="text-3xl font-bold text-brand-dark">
                      {formatPrice(plan.monthly_price)}
                    </span>
                    <span className="text-text-muted"> /month</span>
                  </div>
                  <CardDescription className="mt-2">
                    {plan.name === "starter"
                      ? "For small businesses getting started"
                      : plan.name === "growth"
                        ? "Most popular for growing brands"
                        : "For brands that need dedicated attention"}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-3">
                    {features.map((feature) => (
                      <li key={feature} className="flex items-center gap-2 text-sm text-text">
                        <Check className="h-4 w-4 text-success shrink-0" />
                        {feature}
                      </li>
                    ))}
                  </ul>
                </CardContent>
                <CardFooter className="flex flex-col gap-3">
                  <Button
                    className={`w-full ${
                      isSelected
                        ? "bg-accent hover:bg-accent/90 text-white"
                        : isPopular
                          ? "bg-brand hover:bg-brand/90 text-white"
                          : "bg-brand-dark hover:bg-brand-dark/90 text-white"
                    }`}
                    onClick={() => handleSelectPlan(plan.id)}
                  >
                    {isSelected
                      ? `Continue with ${plan.display_name}`
                      : `Select ${plan.display_name}`}
                  </Button>
                  {settings.scarcity_slots_available > 0 && (
                    <div className="flex items-center gap-1.5 text-xs text-text-muted">
                      <Users className="size-3" />
                      <span>{settings.scarcity_slots_available} slots remaining</span>
                    </div>
                  )}
                </CardFooter>
              </Card>
            );
          })}
        </div>

        <div className="text-center mt-8">
          <p className="text-sm text-text-muted">
            Not sure?{" "}
            <a
              href="https://wa.me/919876543210"
              target="_blank"
              rel="noopener noreferrer"
              className="text-brand hover:underline"
            >
              Book a call with our team
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}

export default function PlanSelectionPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-bg flex items-center justify-center">
          <p className="text-text-muted">Loading plans...</p>
        </div>
      }
    >
      <PlanSelectionContent />
    </Suspense>
  );
}
