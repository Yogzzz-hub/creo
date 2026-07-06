"use client"

import { useOnboardingGuard } from "@/hooks/use-onboarding-guard"
import { OnboardingRequiredView } from "@/components/portal/onboarding-required-view"
import { Loader2 } from "lucide-react"

/**
 * Client wrapper placed inside the portal layout.
 *
 * Decision flow:
 *   1. isRestricted = false  → render children immediately (synchronous)
 *   2. isRestricted = true, !ready → spinner (async check in flight)
 *   3. isRestricted = true, blocked → OnboardingRequiredView
 *   4. isRestricted = true, !blocked → render children
 *
 * The key={pathname} on the children container forces React to unmount
 * the old page component and remount the new one atomically during
 * navigation — no stale reconciliation, no background API calls.
 */
export function OnboardingGuard({ children }: { children: React.ReactNode }) {
  const { isRestricted, ready, blocked } = useOnboardingGuard()

  // Non-restricted routes: render children on the very first render.
  // No async delay, no intermediate spinner.
  if (!isRestricted) {
    return (
      <div key="portal-content">
        {children}
      </div>
    )
  }

  // Restricted route — async check still running
  if (!ready) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#E8F4FD]">
        <Loader2 className="size-6 animate-spin text-[#2B7BC4]" />
      </div>
    )
  }

  // Restricted route — user is not active
  if (blocked) {
    return <OnboardingRequiredView />
  }

  // Restricted route — user is active, render children
  return (
    <div key="portal-content">
      {children}
    </div>
  )
}
