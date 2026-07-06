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

export function SessionProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchSession = useCallback(async () => {
    try {
      const supabase = createClient()
      const {
        data: { session: s },
        error: err,
      } = await supabase.auth.getSession()

      if (err) {
        setError(err.message)
        setSession(null)
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

    const supabase = createClient()
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event: string, s: Session | null) => {
      setSession(s)
      setLoading(false)
    })

    return () => subscription.unsubscribe()
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
