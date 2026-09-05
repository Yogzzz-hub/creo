"use client"

import { createContext, useCallback, useContext, useState, useEffect, useMemo, useRef, type ReactNode } from "react"
import { useSession } from "@/context/session-context"
import { getApiUrl } from "@/lib/api-url"

type AccountStatus = "active" | "lapsed" | "past_due" | "pending_verification" | "cancelled" | "suspended" | null

interface SubscriptionState {
  accountStatus: AccountStatus
  onboardingStage: number
  questionnaireSubmitted: boolean
  loading: boolean
  isLapsed: boolean
  networkError: boolean
  refresh: () => Promise<void>
}

const SubscriptionContext = createContext<SubscriptionState>({
  accountStatus: null,
  onboardingStage: 1,
  questionnaireSubmitted: false,
  loading: true,
  isLapsed: false,
  networkError: false,
  refresh: async () => {},
})

export function useSubscription() {
  return useContext(SubscriptionContext)
}

export function SubscriptionProvider({ children }: { children: ReactNode }) {
  const { token, loading: sessionLoading } = useSession()
  const [accountStatus, setAccountStatus] = useState<AccountStatus>(null)
  const [onboardingStage, setOnboardingStage] = useState<number>(1)
  const [questionnaireSubmitted, setQuestionnaireSubmitted] = useState(false)
  const [loading, setLoading] = useState(true)
  const [networkError, setNetworkError] = useState(false)

  const abortControllerRef = useRef<AbortController | null>(null)
  const isUnloadingRef = useRef(false)
  const activeStatusRef = useRef<AccountStatus>(null)

  useEffect(() => {
    const handleBeforeUnload = () => {
      isUnloadingRef.current = true
    }
    window.addEventListener("beforeunload", handleBeforeUnload)
    return () => window.removeEventListener("beforeunload", handleBeforeUnload)
  }, [])

  const fetchStatus = useCallback(async () => {
    if (sessionLoading) return // Wait for SessionContext to finish resolving (AUTH-01)

    if (!token) {
      // Do NOT setLoading(false) here, because missing token triggers middleware redirect to login.
      // If we set loading(false), we flash the Payment Blockade for genuinely logged out users (AUTH-01).
      return
    }

    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
    }
    const controller = new AbortController()
    abortControllerRef.current = controller

    try {
      const res = await fetch(
        `${getApiUrl()}/api/v1/portal/dashboard`,
        {
          headers: { Authorization: `Bearer ${token}` },
          signal: controller.signal
        }
      )

      if (res.ok) {
        const data = await res.json()
        if (controller.signal.aborted) return

        const newStatus = data.account_status ?? null
        setAccountStatus(newStatus)
        activeStatusRef.current = newStatus
        setOnboardingStage(data.onboarding_stage ?? 1)
        setQuestionnaireSubmitted(data.questionnaire_submitted === true)
        setNetworkError(false)
      } else if (res.status === 401) {
        if (controller.signal.aborted) return
        // 401 Authorization failure MUST NOT leave stale authentication state
        setAccountStatus(null)
        activeStatusRef.current = null
        setNetworkError(false)
        const { createClient } = await import("@/lib/supabase/client")
        await createClient().auth.signOut()
      } else if (res.status === 403) {
        if (controller.signal.aborted) return
        // 403 means authenticated but forbidden (e.g. lapsed/suspended).
        // We do not forcibly sign out, preserving the user's ability to recover/pay.
        // We attempt to parse the 403 detail to update status if provided.
        try {
          const errData = await res.json()
          if (errData?.detail?.error_code === "account_lapsed") {
            setAccountStatus("lapsed")
            activeStatusRef.current = "lapsed"
          } else if (errData?.detail?.error_code === "account_suspended") {
            setAccountStatus("suspended")
            activeStatusRef.current = "suspended"
          }
        } catch {
          // ignore parsing errors on 403
        }
      } else {
        if (controller.signal.aborted) return
        // Keep stale state but expose error for transient failures (SUB-14)
        if (activeStatusRef.current === null) {
          setNetworkError(true)
        }
      }
    } catch (err: any) {
      if (err.name === "AbortError" || controller.signal.aborted) return

      // Do not report backend failure if intentional teardown is happening (NAV-04)
      if (isUnloadingRef.current || (err.message && err.message.includes("fetch") && isUnloadingRef.current)) return

      if (activeStatusRef.current === null) {
        setNetworkError(true)
      }
    } finally {
      if (!controller.signal.aborted) {
        // Strict Mode / abort safety (REACT-01, SUB-12): Only the ACTIVE request can mutate loading state.
        setLoading(false)
      }
    }
  }, [token, sessionLoading])

  useEffect(() => {
    fetchStatus()
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort()
      }
    }
  }, [fetchStatus])

  const isLapsed = accountStatus === "lapsed" || accountStatus === "past_due"

  const value = useMemo<SubscriptionState>(
    () => ({ accountStatus, onboardingStage, questionnaireSubmitted, loading, isLapsed, networkError, refresh: fetchStatus }),
    [accountStatus, onboardingStage, questionnaireSubmitted, loading, isLapsed, networkError, fetchStatus]
  )

  return (
    <SubscriptionContext.Provider value={value}>
      {children}
    </SubscriptionContext.Provider>
  )
}
