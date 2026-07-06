"use client"

import { useEffect, useMemo, useState } from "react"
import { usePathname } from "next/navigation"
import { useSession } from "@/context/session-context"

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://127.0.0.1:8000"

const RESTRICTED_ROUTES = [
  "/portal/deliverables",
  "/portal/calendar",
  "/portal/payments",
  "/portal/account",
]

function isRestrictedRoute(pathname: string): boolean {
  return RESTRICTED_ROUTES.some(
    (route) => pathname === route || pathname.startsWith(route + "/")
  )
}

/**
 * Route-aware onboarding guard for the portal.
 *
 * Blocks any user whose account_status is not "active" on restricted routes.
 * Dashboard (/portal) and Support (/portal/support) are never restricted.
 *
 * Fail-closed: if the status check fails (network error, non-OK response,
 * missing token), access is denied by default.
 *
 * Returns:
 *   isRestricted = synchronous boolean — true when on a restricted route
 *   ready        = false while the async status check is in flight
 *   blocked      = true when on a restricted route AND status is not active
 */
export function useOnboardingGuard() {
  const pathname = usePathname()
  const { token } = useSession()
  const [ready, setReady] = useState(false)
  const [blocked, setBlocked] = useState(false)

  const isRestricted = useMemo(
    () => isRestrictedRoute(pathname),
    [pathname]
  )

  useEffect(() => {
    let cancelled = false

    async function check() {
      if (!isRestricted) {
        setBlocked(false)
        setReady(true)
        return
      }

      // No token — cannot verify status, block by default (fail-closed)
      if (!token) {
        if (!cancelled) {
          setBlocked(true)
          setReady(true)
        }
        return
      }

      try {
        const res = await fetch(`${API_URL}/api/v1/auth/me/role`, {
          headers: { Authorization: `Bearer ${token}` },
        })

        if (cancelled) return

        if (res.ok) {
          const data = await res.json()
          setBlocked(data.account_status !== "active")
        } else {
          // Non-OK response — cannot confirm active status, block (fail-closed)
          setBlocked(true)
        }
        setReady(true)
      } catch {
        // Network error or timeout — cannot confirm status, block (fail-closed)
        if (!cancelled) {
          setBlocked(true)
          setReady(true)
        }
      }
    }

    check()
    return () => {
      cancelled = true
    }
  }, [isRestricted, token])

  return { isRestricted, ready, blocked }
}
