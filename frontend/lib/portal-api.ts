"use client"

import { createClient } from "@/lib/supabase/client"
import { getApiUrl } from "@/lib/api-url"

export class AuthError extends Error {
  constructor() {
    super("Session expired")
    this.name = "AuthError"
  }
}

async function getToken(): Promise<string | null> {
  const supabase = createClient()
  const { data: { session } } = await supabase.auth.getSession()
  return session?.access_token ?? null
}

export async function portalFetch<T>(
  path: string,
  options?: RequestInit,
  accessToken?: string | null
): Promise<T> {
  const token = accessToken ?? await getToken()

  if (!token) {
    throw new AuthError()
  }

  const res = await fetch(`${getApiUrl()}${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      ...options?.headers,
    },
  })

  if (res.status === 401) {
    throw new AuthError()
  }

  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new Error(body.detail || `Request failed (${res.status})`)
  }

  if (res.status === 204) return undefined as T
  return res.json()
}
