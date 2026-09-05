import { createClient } from "@/lib/supabase/client"
import { toast } from "sonner"
import { getApiUrl } from "./api-url"

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
function extractTokenFromHeaders(headers: HeadersInit | undefined): string | null {
  if (!headers) return null
  if (headers instanceof Headers) {
    const auth = headers.get("Authorization")
    if (auth && auth.startsWith("Bearer ")) {
      return auth.substring(7)
    }
  } else if (Array.isArray(headers)) {
    for (const [key, value] of headers) {
      if (key.toLowerCase() === "authorization" && value.startsWith("Bearer ")) {
        return value.substring(7)
      }
    }
  } else {
    // Record<string, string>
    for (const key of Object.keys(headers)) {
      if (key.toLowerCase() === "authorization") {
        const val = headers[key]
        if (typeof val === "string" && val.startsWith("Bearer ")) {
          return val.substring(7)
        }
      }
    }
  }
  return null
}

export function clearLocalSession(): void {
  if (typeof window === "undefined") return
  try {
    localStorage.removeItem("creo_access_token")
    document.cookie = "sb-access-token=; path=/; max-age=0; expires=Thu, 01 Jan 1970 00:00:00 GMT"
    document.cookie = "creo_session_token=; path=/; max-age=0; expires=Thu, 01 Jan 1970 00:00:00 GMT"
    document.cookie = "creo_role_cache=; path=/; max-age=0; expires=Thu, 01 Jan 1970 00:00:00 GMT"
  } catch {
    // Ignore cleanup errors
  }
}

function getStoredToken(): string | null {
  if (typeof window === "undefined") return null

  // 1. Direct session token in localStorage
  try {
    const directToken = localStorage.getItem("creo_access_token")
    if (directToken) return directToken
  } catch (e) {
    // Ignore localStorage errors
  }

  // 2. Try Supabase localStorage keys
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)
      if (key && key.startsWith("sb-") && key.endsWith("-auth-token")) {
        const data = localStorage.getItem(key)
        if (data) {
          const parsed = JSON.parse(data)
          if (parsed && typeof parsed === "object" && parsed.access_token) {
            return parsed.access_token
          }
        }
      }
    }
  } catch (e) {
    // Ignore localStorage errors
  }

  // 3. Try cookies
  try {
    const cookieString = document.cookie || ""
    const cookies = cookieString.split(";")
    for (let cookie of cookies) {
      cookie = cookie.trim()
      const eqIdx = cookie.indexOf("=")
      if (eqIdx !== -1) {
        const name = cookie.substring(0, eqIdx)
        const value = decodeURIComponent(cookie.substring(eqIdx + 1))
        if (name === "sb-access-token" || name === "creo_session_token") {
          return value
        }
        if (name.startsWith("sb-") && name.endsWith("-auth-token")) {
          try {
            const parsed = JSON.parse(value)
            if (parsed && typeof parsed === "object" && parsed.access_token) {
              return parsed.access_token
            }
          } catch {
            if (value && !value.startsWith("{")) {
              return value
            }
          }
        }
      }
    }
  } catch (e) {
    // Ignore cookie errors
  }

  return null
}

export async function apiFetch(
  path: string,
  options: RequestInit = {},
  accessToken?: string | null
): Promise<unknown> {
  async function getAccessToken(): Promise<string> {
    if (accessToken) return accessToken

    // Check options headers
    const headerToken = extractTokenFromHeaders(options.headers)
    if (headerToken) return headerToken

    // Try Supabase auth session
    try {
      const supabase = createClient()
      const { data: { session } } = await supabase.auth.getSession()
      if (session) {
        const expiresAt = session.expires_at ?? 0
        const now = Math.floor(Date.now() / 1000)
        if (expiresAt - now < 30) {
          const { data: refreshed, error } = await supabase.auth.refreshSession()
          if (!error && refreshed.session) {
            return refreshed.session.access_token
          }
        } else {
          return session.access_token
        }
      }
    } catch {
      // Fall through to cookies/localStorage
    }

    // Try cookies/localStorage
    const storedToken = getStoredToken()
    if (storedToken) return storedToken

    throw new ApiError(401, "Not authenticated")
  }

  async function doFetch(token: string): Promise<Response> {
    const { headers: customHeaders, ...rest } = options
    return fetch(`${getApiUrl()}${path}`, {
      credentials: "include",
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

  if (res.status === 401 && typeof window !== "undefined") {
    try {
      const supabase = createClient()
      const { data: refreshed } = await supabase.auth.refreshSession()
      if (refreshed.session?.access_token) {
        res = await doFetch(refreshed.session.access_token)
      } else {
        await supabase.auth.signOut()
      }
    } catch {
      try {
        const supabase = createClient()
        await supabase.auth.signOut()
      } catch {
        // Ignore errors
      }
    }
  }

  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    const detail = body.detail

    if (res.status === 403 && detail?.error === "onboarding_required") {
      if (typeof window !== "undefined") {
        toast.info(
          "Please complete your onboarding steps in the Dashboard to access this feature."
        )
      }
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
