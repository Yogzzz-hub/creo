"use client"

import { useRouter } from "next/navigation"
import { ClipboardCheck, ArrowRight, ShieldCheck } from "lucide-react"
import { Button } from "@/components/ui/button"

/**
 * Premium onboarding gate view shown to users with pending payment status.
 * Renders inside the portal shell (sidebar + header stay visible).
 */
export function OnboardingRequiredView() {
  const router = useRouter()

  return (
    <div className="flex min-h-[60vh] items-center justify-center px-4">
      <div className="w-full max-w-lg rounded-2xl border border-gray-100 bg-white px-8 py-12 text-center shadow-[0_4px_24px_rgba(0,0,0,0.06)]">
        <div className="mx-auto mb-6 flex size-16 items-center justify-center rounded-full bg-[#E8F4FD]">
          <ShieldCheck className="size-8 text-[#2B7BC4]" />
        </div>

        <h2 className="text-xl font-bold text-[#0D2137]">
          Complete Your Payment
        </h2>
        <p className="mt-3 max-w-sm mx-auto text-sm text-gray-500 leading-relaxed">
          Your account is pending activation. Complete your payment to unlock
          deliverables, calendar, payments, and account settings.
        </p>

        <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
          <Button
            className="bg-[#2B7BC4] text-white hover:bg-[#2468a8] px-6"
            onClick={() => router.push("/portal")}
          >
            Go to Dashboard
            <ArrowRight className="ml-2 size-4" />
          </Button>
        </div>

        <p className="mt-6 text-[11px] text-gray-400">
          Need help?{" "}
          <button
            onClick={() => router.push("/portal/support")}
            className="font-medium text-[#2B7BC4] hover:underline"
          >
            Contact Support
          </button>
        </p>
      </div>
    </div>
  )
}
