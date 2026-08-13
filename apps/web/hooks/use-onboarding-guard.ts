"use client"

import { useMemo } from "react"
import { usePathname } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { useSession } from "@/context/session-context"
import { useQuery } from "@tanstack/react-query"

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

export function useOnboardingGuard() {
  const pathname = usePathname()
  const { token, loading: sessionLoading } = useSession()

  const isRestricted = useMemo(
    () => isRestrictedRoute(pathname),
    [pathname]
  )

  const { data, isLoading, isError } = useQuery({
    queryKey: ["onboarding-status"],
    queryFn: async () => {
      const accessToken = await getValidToken()
      if (!accessToken) {
        throw new Error("No access token available")
      }

      const [roleRes, accountRes] = await Promise.all([
        fetch(`${API_URL}/api/v1/auth/me/role`, {
          headers: { Authorization: `Bearer ${accessToken}` },
        }),
        fetch(`${API_URL}/api/v1/account`, {
          headers: { Authorization: `Bearer ${accessToken}` },
        }),
      ])

      if (!roleRes.ok) {
        throw new Error(`Failed to fetch role: ${roleRes.statusText}`)
      }

      const roleData: RoleResponse = await roleRes.json()
      const isActive = roleData.account_status === "active"

      let fullyOnboarded = false
      if (isActive && accountRes.ok) {
        const accountData: AccountStatus = await accountRes.json()
        fullyOnboarded = accountData.instagram_connected === true
      }

      return {
        isActive,
        fullyOnboarded,
      }
    },
    // Only run the query if we are on a restricted route and the session is loaded
    enabled: isRestricted && !sessionLoading && !!token,
    // If not active, poll every 2 seconds to wait for webhook. If active, stop polling.
    refetchInterval: (query) => {
      if (query.state.data && !query.state.data.isActive) {
        return 2000
      }
      return false
    },
    // Don't refetch on window focus while polling, but do otherwise
    refetchOnWindowFocus: true,
    // Retry robustly on network failures
    retry: 3,
  })

  // If not restricted, we're always ready and not blocked
  if (!isRestricted) {
    return {
      isRestricted,
      ready: true,
      blocked: false,
      fullyOnboarded: false,
      isError: false,
    }
  }

  // If session is loading or query is loading, we are not ready
  if (sessionLoading || isLoading) {
    return {
      isRestricted,
      ready: false,
      blocked: false,
      fullyOnboarded: false,
      isError: false,
    }
  }

  // If there was a persistent network error after retries
  if (isError) {
    return {
      isRestricted,
      ready: true,
      blocked: false, // Don't block on network error, just show error state
      fullyOnboarded: false,
      isError: true,
    }
  }

  // Default fallback if data is somehow undefined
  if (!data) {
    return {
      isRestricted,
      ready: true,
      blocked: true,
      fullyOnboarded: false,
      isError: false,
    }
  }

  return {
    isRestricted,
    ready: true,
    blocked: !data.isActive,
    fullyOnboarded: data.fullyOnboarded,
    isError: false,
  }
}
