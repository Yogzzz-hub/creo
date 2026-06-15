"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Check, Info } from "lucide-react";

const plans = [
  {
    name: "Starter",
    price: "₹4,999",
    description: "For small businesses getting started",
    features: [
      "3 Posters / month",
      "2 Reels / month",
      "3 Stories / month",
      "Content Calendar",
      "Client Portal",
      "1 Revision Round",
    ],
    highlighted: false,
  },
  {
    name: "Growth",
    price: "₹9,999",
    description: "Most popular for growing brands",
    features: [
      "6 Posters / month",
      "4 Reels / month",
      "6 Stories / month",
      "Content Calendar",
      "Client Portal",
      "2 Revision Rounds",
    ],
    highlighted: true,
  },
  {
    name: "Pro",
    price: "₹19,999",
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
    highlighted: false,
  },
];

function PlanSelectionContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const planParam = searchParams.get("plan");

  const validPlanNames = ["starter", "growth", "pro"] as const;
  const preselectedPlan =
    planParam && validPlanNames.includes(planParam as typeof validPlanNames[number])
      ? planParam.charAt(0).toUpperCase() + planParam.slice(1)
      : null;

  const [selectedPlan, setSelectedPlan] = useState<string | null>(preselectedPlan);

  function handleSelectPlan(planName: string) {
    setSelectedPlan(planName);
    // Phase 5: Wire to payment gateway
    // For now, redirect to portal
    router.push("/portal");
  }

  return (
    <div className="min-h-screen bg-bg px-4 py-12">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-brand-dark">Choose Your Plan</h1>
          <p className="text-text-muted mt-2">
            Select the plan that best fits your brand&apos;s needs
          </p>
        </div>

        {preselectedPlan && (
          <div className="mb-8 mx-auto max-w-md rounded-lg border border-accent/30 bg-accent/5 px-4 py-3 flex items-center gap-3">
            <Info className="h-5 w-5 text-accent shrink-0" />
            <p className="text-sm text-brand-dark">
              <span className="font-semibold">{preselectedPlan}</span> plan pre-selected based on your selection.
            </p>
          </div>
        )}

        <div className="grid md:grid-cols-3 gap-6">
          {plans.map((plan) => {
            const isSelected = selectedPlan === plan.name;
            return (
              <Card
                key={plan.name}
                className={`relative transition-all ${
                  isSelected
                    ? "border-2 border-accent shadow-lg ring-2 ring-accent/20"
                    : plan.highlighted
                      ? "border-2 border-brand shadow-lg"
                      : "border-border"
                }`}
              >
                {plan.highlighted && !isSelected && (
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
                    {plan.name}
                  </CardTitle>
                  <div className="mt-2">
                    <span className="text-3xl font-bold text-brand-dark">
                      {plan.price}
                    </span>
                    <span className="text-text-muted"> /month</span>
                  </div>
                  <CardDescription className="mt-2">
                    {plan.description}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-3">
                    {plan.features.map((feature) => (
                      <li key={feature} className="flex items-center gap-2 text-sm text-text">
                        <Check className="h-4 w-4 text-success shrink-0" />
                        {feature}
                      </li>
                    ))}
                  </ul>
                </CardContent>
                <CardFooter>
                  <Button
                    className={`w-full ${
                      isSelected
                        ? "bg-accent hover:bg-accent/90 text-white"
                        : plan.highlighted
                          ? "bg-brand hover:bg-brand/90 text-white"
                          : "bg-brand-dark hover:bg-brand-dark/90 text-white"
                    }`}
                    onClick={() => handleSelectPlan(plan.name)}
                  >
                    {isSelected ? "Continue with " + plan.name : "Select " + plan.name}
                  </Button>
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
