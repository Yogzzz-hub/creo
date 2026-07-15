"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import { Check, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useSession } from "@/context/session-context";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://127.0.0.1:8000";

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
  const router = useRouter();
  const { token, loading: sessionLoading } = useSession();
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    if (sessionLoading) return;
    if (!token) {
      setChecking(false);
      return;
    }

    let cancelled = false;

    async function checkAndRedirect() {
      try {
        const [roleRes, accountRes] = await Promise.all([
          fetch(`${API_URL}/api/v1/auth/me/role`, {
            headers: { Authorization: `Bearer ${token}` },
          }),
          fetch(`${API_URL}/api/v1/account`, {
            headers: { Authorization: `Bearer ${token}` },
          }),
        ]);

        if (cancelled) return;

        if (roleRes.ok) {
          const roleData = await roleRes.json();
          const isActive = roleData.account_status === "active";

          if (isActive && accountRes.ok) {
            const accountData = await accountRes.json();
            if (accountData.instagram_connected) {
              router.replace("/portal");
              return;
            }
          }
        }
      } catch {
        // Silently continue to onboarding if check fails
      }

      if (!cancelled) setChecking(false);
    }

    checkAndRedirect();
    return () => {
      cancelled = true;
    };
  }, [token, sessionLoading, router]);

  const currentIndex = STEPS.findIndex((step) => pathname.startsWith(step.href));

  // Show a clean loading spinner while checking user status
  if (checking) {
    return (
      <div className="min-h-screen bg-bg flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-[560px]">
          <div className="bg-surface rounded-xl shadow-card p-8">
            <div className="flex flex-col items-center justify-center py-16 gap-4">
              <Loader2 className="size-6 animate-spin text-brand" />
              <p className="text-sm text-text-muted">Loading your account...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

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
                const isFuture = index > currentIndex;
                const isClickable = isCompleted || isActive;

                return (
                  <li
                    key={step.label}
                    className="flex flex-1 items-center"
                  >
                    {isClickable ? (
                      <Link
                        href={step.href}
                        className="flex flex-col items-center gap-2 w-full"
                      >
                        <StepCircle
                          index={index}
                          isCompleted={isCompleted}
                          isActive={isActive}
                        />
                        <StepLabel
                          label={step.label}
                          isActive={isActive}
                          isCompleted={isCompleted}
                        />
                      </Link>
                    ) : (
                      <div className="flex flex-col items-center gap-2 w-full cursor-not-allowed opacity-50">
                        <StepCircle
                          index={index}
                          isCompleted={isCompleted}
                          isActive={isActive}
                        />
                        <StepLabel
                          label={step.label}
                          isActive={isActive}
                          isCompleted={isCompleted}
                        />
                      </div>
                    )}
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

function StepCircle({
  index,
  isCompleted,
  isActive,
}: {
  index: number;
  isCompleted: boolean;
  isActive: boolean;
}) {
  return (
    <div
      className={cn(
        "flex size-8 items-center justify-center rounded-full text-xs font-semibold transition-colors",
        isCompleted && "bg-brand text-white",
        isActive && "bg-brand/10 text-brand ring-2 ring-brand",
        !isActive && !isCompleted && "bg-bg-internal text-text-muted"
      )}
    >
      {isCompleted ? <Check className="size-4" /> : index + 1}
    </div>
  );
}

function StepLabel({
  label,
  isActive,
  isCompleted,
}: {
  label: string;
  isActive: boolean;
  isCompleted: boolean;
}) {
  return (
    <span
      className={cn(
        "text-xs font-medium whitespace-nowrap",
        isActive && "text-brand",
        isCompleted && "text-text",
        !isActive && !isCompleted && "text-text-muted"
      )}
    >
      {label}
    </span>
  );
}
