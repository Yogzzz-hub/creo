"use client"

import { memo } from "react"
import { AlertTriangle } from "lucide-react"
import { useSubscription } from "@/context/subscription-context"

export const SubscriptionGuard = memo(function SubscriptionGuard() {
  const { accountStatus, loading, isLapsed } = useSubscription()

  if (loading || !isLapsed) return null

  const message =
    accountStatus === "past_due"
      ? "Your last payment failed. Please update your payment method to avoid service interruption."
      : "Your subscription has lapsed. Renew to continue using the platform."

  return (
    <div className="mx-auto max-w-6xl px-4 pt-4 lg:px-8">
      <div className="flex items-center gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
        <AlertTriangle className="size-5 shrink-0 text-amber-600" />
        <p className="text-sm font-medium text-amber-800">{message}</p>
      </div>
    </div>
  )
})
