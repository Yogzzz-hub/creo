"use client"

import { createContext, useContext, useState, useEffect, useMemo, type ReactNode } from "react"
import { portalFetch, AuthError } from "@/lib/portal-api"

type AccountStatus = "active" | "lapsed" | "past_due" | "pending_verification" | "cancelled" | null

interface SubscriptionState {
  accountStatus: AccountStatus
  loading: boolean
  isLapsed: boolean
}

const SubscriptionContext = createContext<SubscriptionState>({
  accountStatus: null,
  loading: true,
  isLapsed: false,
})

export function useSubscription() {
  return useContext(SubscriptionContext)
}

export function SubscriptionProvider({ children }: { children: ReactNode }) {
  const [accountStatus, setAccountStatus] = useState<AccountStatus>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false

    async function fetchStatus() {
      try {
        const data = await portalFetch<{ account_status?: string }>("/api/v1/portal/subscription-status")
        if (!cancelled) setAccountStatus((data.account_status as AccountStatus) ?? null)
      } catch (err) {
        if (err instanceof AuthError) return
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    fetchStatus()
    return () => { cancelled = true }
  }, [])

  const isLapsed = accountStatus === "lapsed" || accountStatus === "past_due"

  const value = useMemo<SubscriptionState>(
    () => ({ accountStatus, loading, isLapsed }),
    [accountStatus, loading, isLapsed]
  )

  return (
    <SubscriptionContext.Provider value={value}>
      {children}
    </SubscriptionContext.Provider>
  )
}
