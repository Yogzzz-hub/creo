"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { usePathname } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { useSession } from "@/context/session-context"

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://127.0.0.1:8000"

const RESTRICTED_ROUTES = [
  "/portal/deliverables",
  "/portal/calendar",
  "/portal/payments",
  "/portal/addons",
  "/portal/account",
]

function isRestrictedRoute(pathname: string): boolean {
  return RESTRICTED_ROUTES.some(
    (route) => pathname === route || pathname.startsWith(route + "/")
  )
}

interface RoleResponse {
  role: string
  account_status: string
}

interface AccountStatus {
  account_status: string
  instagram_connected: boolean
}

const MAX_POLL_ATTEMPTS = 10
const POLL_INTERVAL_MS = 2000

/**
 * Route-aware onboarding guard for the portal.
 *
 * Blocks any user whose account_status is not "active" on restricted routes.
 * Dashboard (/portal) and Support (/portal/support) are never restricted.
 *
 * When blocked, polls /api/v1/auth/me/role every 2s (up to 10 times) to
 * detect when a payment webhook has activated the account, then unblocks
 * without requiring a full page reload.
 */
export function useOnboardingGuard() {
  const pathname = usePathname()
  const { token, loading: sessionLoading } = useSession()
  const [ready, setReady] = useState(false)
  const [blocked, setBlocked] = useState(false)
  const [fullyOnboarded, setFullyOnboarded] = useState(false)
  const pollRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const cancelledRef = useRef(false)

  const isRestricted = useMemo(
    () => isRestrictedRoute(pathname),
    [pathname]
  )

  useEffect(() => {
    cancelledRef.current = false

    async function getValidToken() {
      const supabase = createClient()
      const { data: { session }, error } = await supabase.auth.getSession()

      if (error) {
        throw error
      }

      if (!session) {
        return null
      }

      const expiresAt = session.expires_at ?? 0
      const now = Math.floor(Date.now() / 1000)
      if (expiresAt - now < 30) {
        const { data: refreshed, error: refreshError } = await supabase.auth.refreshSession()
        if (refreshError) {
          throw refreshError
        }
        return refreshed.session?.access_token ?? session.access_token
      }

      return session.access_token
    }

    async function checkStatus() {
      if (!isRestricted) {
        setBlocked(false)
        setFullyOnboarded(false)
        setReady(true)
        return
      }

      if (sessionLoading) {
        setBlocked(false)
        setFullyOnboarded(false)
        setReady(false)
        return
      }

      if (!token) {
        if (!cancelledRef.current) {
          setBlocked(true)
          setFullyOnboarded(false)
          setReady(true)
        }
        return
      }



      try {
        const accessToken = await getValidToken()
        if (!accessToken) {
          if (!cancelledRef.current) {
            setBlocked(true)
            setFullyOnboarded(false)
            setReady(true)
            startPolling()
          }
          return
        }

        const [roleRes, accountRes] = await Promise.all([
          fetch(`${API_URL}/api/v1/auth/me/role`, {
            headers: { Authorization: `Bearer ${accessToken}` },
          }),
          fetch(`${API_URL}/api/v1/account`, {
            headers: { Authorization: `Bearer ${accessToken}` },
          }),
        ])

        if (cancelledRef.current) return

        if (roleRes.ok) {
          const roleData: RoleResponse = await roleRes.json()
          const isActive = roleData.account_status === "active"
          setBlocked(!isActive)

          if (isActive && accountRes.ok) {
            const accountData: AccountStatus = await accountRes.json()
            setFullyOnboarded(accountData.instagram_connected === true)
          } else {
            setFullyOnboarded(false)
          }

          if (!isActive) {
            startPolling()
          }
        } else {
          setBlocked(true)
          setFullyOnboarded(false)
          startPolling()
        }
        setReady(true)
      } catch {
        if (!cancelledRef.current) {
          setBlocked(true)
          setFullyOnboarded(false)
          setReady(true)
          startPolling()
        }
      }
    }

    async function pollOnce() {
      if (cancelledRef.current) return

      try {
        const tokenToUse = await getValidToken()
        if (!tokenToUse) return

        const res = await fetch(`${API_URL}/api/v1/auth/me/role`, {
          headers: { Authorization: `Bearer ${tokenToUse}` },
        })
        if (cancelledRef.current) return

        if (res.ok) {
          const data: RoleResponse = await res.json()
          if (data.account_status === "active") {
            setBlocked(false)
            const accountRes = await fetch(`${API_URL}/api/v1/account`, {
              headers: { Authorization: `Bearer ${tokenToUse}` },
            })
            if (accountRes.ok && !cancelledRef.current) {
              const accountData: AccountStatus = await accountRes.json()
              setFullyOnboarded(accountData.instagram_connected === true)
            }
            return // Stop polling — user is active
          }
        }
      } catch {
        // Silently continue polling on network errors
      }

      pollAttempt++
      if (pollAttempt < MAX_POLL_ATTEMPTS && !cancelledRef.current) {
        pollRef.current = setTimeout(pollOnce, POLL_INTERVAL_MS)
      }
    }

    let pollAttempt = 0

    function startPolling() {
      pollAttempt = 0
      if (pollRef.current) clearTimeout(pollRef.current)
      pollRef.current = setTimeout(pollOnce, POLL_INTERVAL_MS)
    }

    checkStatus()

    return () => {
      cancelledRef.current = true
      if (pollRef.current) {
        clearTimeout(pollRef.current)
        pollRef.current = null
      }
    }
  }, [isRestricted, token, sessionLoading])

  return { isRestricted, ready, blocked, fullyOnboarded }
}
