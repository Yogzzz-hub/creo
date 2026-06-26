"use client"

import { createContext, useContext, useState, useEffect, type ReactNode } from "react"
import { createClient } from "@/lib/supabase/client"

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
      } catch {
        // Keep status as null — buttons remain enabled as safe default
      } finally {
        setLoading(false)
      }
    }

    fetchStatus()
  }, [])

  const isLapsed = accountStatus === "lapsed" || accountStatus === "past_due"

  return (
    <SubscriptionContext.Provider value={{ accountStatus, loading, isLapsed }}>
      {children}
    </SubscriptionContext.Provider>
  )
}
