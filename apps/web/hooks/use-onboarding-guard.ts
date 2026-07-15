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

interface AccountStatus {
  account_status: string
  instagram_connected: boolean
}

/**
 * Route-aware onboarding guard for the portal.
 *
 * Blocks any user whose account_status is not "active" on restricted routes.
 * Dashboard (/portal) and Support (/portal/support) are never restricted.
 *
 * Also checks Instagram connection status so callers can determine
 * whether the user is fully onboarded (active + connected).
 *
 * Fail-closed: if the status check fails (network error, non-OK response,
 * missing token), access is denied by default.
 *
 * Returns:
 *   isRestricted   = synchronous boolean — true when on a restricted route
 *   ready          = false while the async status check is in flight
 *   blocked        = true when on a restricted route AND status is not active
 *   fullyOnboarded = true when account is active AND Instagram is connected
 */
export function useOnboardingGuard() {
  const pathname = usePathname()
  const { token } = useSession()
  const [ready, setReady] = useState(false)
  const [blocked, setBlocked] = useState(false)
  const [fullyOnboarded, setFullyOnboarded] = useState(false)

  const isRestricted = useMemo(
    () => isRestrictedRoute(pathname),
    [pathname]
  )

  useEffect(() => {
    let cancelled = false

    async function check() {
      if (!isRestricted) {
        setBlocked(false)
        setFullyOnboarded(false)
        setReady(true)
        return
      }

      // No token — cannot verify status, block by default (fail-closed)
      if (!token) {
        if (!cancelled) {
          setBlocked(true)
          setFullyOnboarded(false)
          setReady(true)
        }
        return
      }

      try {
        const [roleRes, accountRes] = await Promise.all([
          fetch(`${API_URL}/api/v1/auth/me/role`, {
            headers: { Authorization: `Bearer ${token}` },
          }),
          fetch(`${API_URL}/api/v1/account`, {
            headers: { Authorization: `Bearer ${token}` },
          }),
        ])

        if (cancelled) return

        if (roleRes.ok) {
          const roleData = await roleRes.json()
          const isActive = roleData.account_status === "active"
          setBlocked(!isActive)

          if (isActive && accountRes.ok) {
            const accountData: AccountStatus = await accountRes.json()
            setFullyOnboarded(accountData.instagram_connected === true)
          } else {
            setFullyOnboarded(false)
          }
        } else {
          // Non-OK response — cannot confirm active status, block (fail-closed)
          setBlocked(true)
          setFullyOnboarded(false)
        }
        setReady(true)
      } catch {
        // Network error or timeout — cannot confirm status, block (fail-closed)
        if (!cancelled) {
          setBlocked(true)
          setFullyOnboarded(false)
          setReady(true)
        }
      }
    }

    check()
    return () => {
      cancelled = true
    }
  }, [isRestricted, token])

  return { isRestricted, ready, blocked, fullyOnboarded }
}
