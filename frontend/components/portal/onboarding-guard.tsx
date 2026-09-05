"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { useOnboardingGuard } from "@/hooks/use-onboarding-guard"
import { OnboardingRequiredView } from "@/components/portal/onboarding-required-view"

/**
 * Client wrapper placed inside the portal layout.
 *
 * Decision flow:
 *   1. isRestricted = false  → render children immediately (synchronous)
 *   2. isRestricted = true, !ready → graceful skeleton placeholder (no full-screen blue wipe)
 *   3. isRestricted = true, blocked → OnboardingRequiredView
 *   4. isRestricted = true, !blocked → render children
 *
 * When blocked on a restricted route, the hook polls /api/v1/auth/me/role
 * every 2s to detect when a payment webhook has activated the account,
 * then unblocks automatically without a page reload.
 */
export function OnboardingGuard({ children }: { children: React.ReactNode }) {
  const { isRestricted, ready, blocked, isActive, questionnaireSubmitted, isError } = useOnboardingGuard()
  const router = useRouter()

  useEffect(() => {
    if (ready && blocked && isActive && !questionnaireSubmitted) {
      // User has paid (active) but has not completed the questionnaire -> redirect to portal dashboard to complete questionnaire
      router.push("/portal")
    }
  }, [ready, blocked, isActive, questionnaireSubmitted, router])

  // Non-restricted routes: render children on the very first render.
  if (!isRestricted) {
    return (
      <div key="portal-content">
        {children}
      </div>
    )
  }

  // Restricted route — async check in flight: render subtle skeleton within layout, avoiding blank screen flash
  if (!ready) {
    return (
      <div className="mx-auto max-w-6xl space-y-6 animate-pulse">
        <div className="space-y-2">
          <div className="h-8 w-48 rounded-lg bg-slate-200/80" />
          <div className="h-4 w-72 rounded-lg bg-slate-200/60" />
        </div>
        <div className="h-64 rounded-xl border border-slate-200/60 bg-white/80 p-6" />
      </div>
    )
  }

  // Restricted route — network error after retries
  if (isError) {
    return (
      <div className="flex flex-col items-center justify-center py-16 px-4">
        <div className="rounded-xl border border-red-200 bg-white p-8 text-center shadow-lg max-w-md">
          <h2 className="mb-2 text-xl font-bold text-gray-900">Connection Error</h2>
          <p className="mb-4 text-sm text-gray-500">
            We couldn't verify your account status. Please check your internet connection and try again.
          </p>
          <button
            onClick={() => window.location.reload()}
            className="rounded-lg bg-[#2B7BC4] px-4 py-2 text-sm font-medium text-white hover:bg-[#2B7BC4]/90 transition-colors"
          >
            Refresh Page
          </button>
        </div>
      </div>
    )
  }

  // Restricted route — user is not active (auto-polling is active in the hook)
  if (blocked) {
    if (isActive && !questionnaireSubmitted) {
      return (
        <div className="mx-auto max-w-6xl space-y-6 animate-pulse">
          <div className="space-y-2">
            <div className="h-8 w-48 rounded-lg bg-slate-200/80" />
            <div className="h-4 w-72 rounded-lg bg-slate-200/60" />
          </div>
          <div className="h-64 rounded-xl border border-slate-200/60 bg-white/80 p-6" />
        </div>
      )
    }
    return <OnboardingRequiredView />
  }

  // Restricted route — user is active, render children
  return (
    <div key="portal-content">
      {children}
    </div>
  )
}
