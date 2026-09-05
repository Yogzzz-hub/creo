"use client"

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react"
import type { Session, User } from "@supabase/supabase-js"
import { createClient } from "@/lib/supabase/client"

interface SessionState {
  session: Session | null
  user: User | null
  token: string | null
  loading: boolean
  error: string | null
  refresh: () => Promise<void>
}

const SessionContext = createContext<SessionState>({
  session: null,
  user: null,
  token: null,
  loading: true,
  error: null,
  refresh: async () => {},
})

export function useSession() {
  return useContext(SessionContext)
}

function parseJwt(token: string): any {
  try {
    const base64Url = token.split(".")[1]
    if (!base64Url) return null
    const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/")
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split("")
        .map((c) => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2))
        .join("")
    )
    return JSON.parse(jsonPayload)
  } catch {
    return null
  }
}

export function SessionProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchSession = useCallback(async () => {
    try {
      // 1. Check direct token from cookies or localStorage (Google OAuth)
      let directToken: string | null = null
      if (typeof window !== "undefined") {
        directToken = localStorage.getItem("creo_access_token")
        if (!directToken) {
          const cookieString = document.cookie || ""
          const cookies = cookieString.split(";")
          for (let cookie of cookies) {
            cookie = cookie.trim()
            const eqIdx = cookie.indexOf("=")
            if (eqIdx !== -1) {
              const name = cookie.substring(0, eqIdx)
              const val = decodeURIComponent(cookie.substring(eqIdx + 1))
              if (name === "sb-access-token" || name === "creo_session_token") {
                directToken = val
                break
              }
            }
          }
        }
      }

      if (directToken) {
        const claims = parseJwt(directToken)
        if (claims && (!claims.exp || claims.exp * 1000 > Date.now())) {
          const user: any = {
            id: claims.sub,
            email: claims.email,
            user_metadata: {
              role: claims.role,
              name: claims.name,
              full_name: claims.name,
              account_status: claims.account_status,
              onboarding_stage: claims.onboarding_stage,
              ...claims.user_metadata,
            },
            app_metadata: claims.app_metadata || {},
            aud: "authenticated",
            role: "authenticated",
          }
          const s: any = {
            access_token: directToken,
            token_type: "bearer",
            user,
            expires_at: claims.exp,
          }
          if (typeof window !== "undefined") {
            try {
              localStorage.setItem("creo_access_token", directToken)
            } catch {}
          }
          setSession(s)
          setError(null)
          setLoading(false)
          return
        }
      }

      // 2. Fallback to Supabase Auth getSession
      const supabase = createClient()
      const sessionPromise = supabase.auth.getSession()
      const timeoutPromise = new Promise<{ data: { session: null }; error: null }>((resolve) =>
        setTimeout(() => resolve({ data: { session: null }, error: null }), 1500)
      )

      const {
        data: { session: s },
        error: err,
      } = await Promise.race([sessionPromise, timeoutPromise])

      if (err) {
        setError(err.message)
        setSession(null)
        return
      }

      if (!s) {
        setSession(null)
        setError(null)
        return
      }

      const expiresAt = s.expires_at ?? 0
      const now = Math.floor(Date.now() / 1000)
      if (expiresAt - now < 30) {
        const { data: refreshed, error: refreshError } = await supabase.auth.refreshSession()
        if (refreshError) {
          setError(refreshError.message)
          setSession(s)
        } else {
          setSession(refreshed.session ?? s)
          setError(null)
        }
      } else {
        setSession(s)
        setError(null)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to get session")
      setSession(null)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchSession()

    const handleStorage = (e: StorageEvent) => {
      if (e.key === "creo_access_token") {
        fetchSession()
      }
    }
    window.addEventListener("storage", handleStorage)

    const supabase = createClient()
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event: string, s: Session | null) => {
      if (s) {
        setSession(s)
        setLoading(false)
      }
    })

    return () => {
      window.removeEventListener("storage", handleStorage)
      subscription.unsubscribe()
    }
  }, [fetchSession])

  const value = useMemo<SessionState>(
    () => ({
      session,
      user: session?.user ?? null,
      token: session?.access_token ?? null,
      loading,
      error,
      refresh: fetchSession,
    }),
    [session, loading, error, fetchSession]
  )

  return (
    <SessionContext.Provider value={value}>{children}</SessionContext.Provider>
  )
}
