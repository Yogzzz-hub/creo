"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

const STEPS = [
  { label: "Verify", href: "/onboarding/verify" },
  { label: "Terms", href: "/onboarding/terms" },
  { label: "Payment", href: "/onboarding/payment" },
  { label: "Brand Profile", href: "/onboarding/questionnaire" },
  { label: "Complete", href: "/onboarding/complete" },
];

export default function OnboardingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  const currentIndex = STEPS.findIndex((step) => pathname.startsWith(step.href));

  return (
    <div className="min-h-screen bg-bg flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-[560px]">
        <div className="bg-surface rounded-xl shadow-card p-8">
          {/* Step Indicator */}
          <nav className="mb-8">
            <ol className="flex items-center justify-between">
              {STEPS.map((step, index) => {
                const isActive = index === currentIndex;
                const isCompleted = currentIndex > index;

                return (
                  <li
                    key={step.label}
                    className="flex flex-1 items-center"
                  >
                    <Link
                      href={step.href}
                      className="flex flex-col items-center gap-2 w-full"
                    >
                      <div
                        className={cn(
                          "flex size-8 items-center justify-center rounded-full text-xs font-semibold transition-colors",
                          isCompleted &&
                            "bg-brand text-white",
                          isActive &&
                            "bg-brand/10 text-brand ring-2 ring-brand",
                          !isActive &&
                            !isCompleted &&
                            "bg-bg-internal text-text-muted"
                        )}
                      >
                        {isCompleted ? (
                          <Check className="size-4" />
                        ) : (
                          index + 1
                        )}
                      </div>
                      <span
                        className={cn(
                          "text-xs font-medium whitespace-nowrap",
                          isActive && "text-brand",
                          isCompleted && "text-text",
                          !isActive && !isCompleted && "text-text-muted"
                        )}
                      >
                        {step.label}
                      </span>
                    </Link>
                    {index < STEPS.length - 1 && (
                      <div
                        className={cn(
                          "h-px flex-1 mx-2 mt-[-1.25rem]",
                          currentIndex > index
                            ? "bg-brand"
                            : "bg-border"
                        )}
                      />
                    )}
                  </li>
                );
              })}
            </ol>
          </nav>

          {children}
        </div>
      </div>
    </div>
  );
}
