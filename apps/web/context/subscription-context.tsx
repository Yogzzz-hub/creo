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
        const supabase = createClient()
        const { data: { session } } = await supabase.auth.getSession()

        if (!session?.access_token) {
          setLoading(false)
          return
        }

        const res = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL}/api/v1/portal/dashboard`,
          { headers: { Authorization: `Bearer ${session.access_token}` } }
        )

        if (res.ok) {
          const data = await res.json()
          setAccountStatus(data.account_status ?? null)
        }
      } catch (err) {
        console.error("[subscription] status fetch failed:", err)
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
