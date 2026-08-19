"use client"

import { createClient } from "@/lib/supabase/client"
import { toast } from "sonner"

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://127.0.0.1:8000"

/**
 * Authenticated fetch wrapper for the FastAPI backend.
 *
 * 1. Gets the current Supabase session (or uses the provided token).
 * 2. If the access token is expired, calls refreshSession() first.
 * 3. Sends the request with the fresh Bearer token.
 * 4. On a 401 response, retries once after a refresh attempt.
 * 5. On a 403 with error=onboarding_required, shows a friendly toast
 *    directing the user back to the Dashboard to complete onboarding.
 */
export async function apiFetch(
  path: string,
  options: RequestInit = {},
  accessToken?: string | null
): Promise<unknown> {
  const supabase = createClient()

  async function getAccessToken(): Promise<string> {
    if (accessToken) return accessToken

    const { data: { session } } = await supabase.auth.getSession()

    if (!session) {
      throw new ApiError(401, "Not authenticated")
    }

    const expiresAt = session.expires_at ?? 0
    const now = Math.floor(Date.now() / 1000)
    if (expiresAt - now < 30) {
      const { data: refreshed, error } = await supabase.auth.refreshSession()
      if (error || !refreshed.session) {
        await supabase.auth.signOut()
        throw new ApiError(401, "Session expired. Please sign in again.")
      }
      return refreshed.session.access_token
    }

    return session.access_token
  }

  async function doFetch(token: string): Promise<Response> {
    const { headers: customHeaders, ...rest } = options
    return fetch(`${API_URL}${path}`, {
      ...rest,
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        ...customHeaders,
      },
    })
  }

  const token = await getAccessToken()
  let res = await doFetch(token)

  if (res.status === 401) {
    try {
      const { data: refreshed } = await supabase.auth.refreshSession()
      if (refreshed.session?.access_token) {
        res = await doFetch(refreshed.session.access_token)
      } else {
        await supabase.auth.signOut()
      }
    } catch {
      await supabase.auth.signOut()
    }
  }

  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    const detail = body.detail

    if (res.status === 403 && detail?.error === "onboarding_required") {
      toast.info(
        "Please complete your onboarding steps in the Dashboard to access this feature."
      )
      throw new ApiError(403, "onboarding_required")
    }

    const message =
      typeof detail === "string"
        ? detail
        : detail?.message ?? `Request failed (${res.status})`
    throw new ApiError(res.status, message)
  }

  return res.json()
}

export class ApiError extends Error {
  status: number
  constructor(status: number, message: string) {
    super(message)
    this.name = "ApiError"
    this.status = status
  }
}
