"use client"

import { createContext, useCallback, useContext, useState, useEffect, useMemo, type ReactNode } from "react"
import { useSession } from "@/context/session-context"

type AccountStatus = "active" | "lapsed" | "past_due" | "pending_verification" | "cancelled" | null

interface SubscriptionState {
  accountStatus: AccountStatus
  loading: boolean
  isLapsed: boolean
  refresh: () => Promise<void>
}

const SubscriptionContext = createContext<SubscriptionState>({
  accountStatus: null,
  loading: true,
  isLapsed: false,
  refresh: async () => {},
})

export function useSubscription() {
  return useContext(SubscriptionContext)
}

export function SubscriptionProvider({ children }: { children: ReactNode }) {
  const { token } = useSession()
  const [accountStatus, setAccountStatus] = useState<AccountStatus>(null)
  const [loading, setLoading] = useState(true)

  const fetchStatus = useCallback(async () => {
    try {
      if (!token) {
        setLoading(false)
        return
      }

      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/v1/portal/dashboard`,
        { headers: { Authorization: `Bearer ${token}` } }
      )

      if (res.ok) {
        const data = await res.json()
        setAccountStatus(data.account_status ?? null)
      }
    } catch (err) {
      console.error("[subscription] status fetch failed:", err)
    } finally {
      setLoading(false)
    }
  }, [token])

  useEffect(() => {
    fetchStatus()
  }, [fetchStatus])

  const isLapsed = accountStatus === "lapsed" || accountStatus === "past_due"

  const value = useMemo<SubscriptionState>(
    () => ({ accountStatus, loading, isLapsed, refresh: fetchStatus }),
    [accountStatus, loading, isLapsed, fetchStatus]
  )

  return (
    <SubscriptionContext.Provider value={value}>
      {children}
    </SubscriptionContext.Provider>
  )
}
