"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
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

  // Restricted route — async check still running
  if (!ready) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#E8F4FD]">
        <Loader2 className="size-6 animate-spin text-[#2B7BC4]" />
      </div>
    )
  }

  // Restricted route — network error after retries
  if (isError) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-[#E8F4FD] px-4">
        <div className="rounded-xl border border-red-200 bg-white p-8 text-center shadow-lg">
          <h2 className="mb-2 text-xl font-bold text-gray-900">Connection Error</h2>
          <p className="mb-4 text-sm text-gray-500">
            We couldn't verify your account status. Please check your internet connection and try again.
          </p>
          <button
            onClick={() => window.location.reload()}
            className="rounded-lg bg-[#2B7BC4] px-4 py-2 text-sm font-medium text-white hover:bg-[#2B7BC4]/90"
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
        <div className="flex min-h-screen items-center justify-center bg-[#E8F4FD]">
          <Loader2 className="size-6 animate-spin text-[#2B7BC4]" />
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
