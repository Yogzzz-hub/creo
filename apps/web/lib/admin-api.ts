"use client"

import { createClient } from "@/lib/supabase/client"

const API_URL = process.env.NEXT_PUBLIC_API_URL

export async function adminFetch<T>(
  path: string,
  options?: RequestInit
): Promise<T> {
  const supabase = createClient()
  const {
    data: { session },
  } = await supabase.auth.getSession()

  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${session?.access_token}`,
      "Content-Type": "application/json",
      ...options?.headers,
    },
  })

  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new Error(body.detail || `Request failed (${res.status})`)
  }

  if (res.status === 204) return undefined as T
  return res.json()
}

/**
 * Like adminFetch but returns null on 404 instead of throwing.
 * Use for optional endpoints that may not exist yet.
 */
export async function adminFetchOptional<T>(
  path: string,
  options?: RequestInit
): Promise<T | null> {
  const supabase = createClient()
  const {
    data: { session },
  } = await supabase.auth.getSession()

  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${session?.access_token}`,
      "Content-Type": "application/json",
      ...options?.headers,
    },
  })

  if (res.status === 404) return null
  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new Error(body.detail || `Request failed (${res.status})`)
  }

  if (res.status === 204) return null
  return res.json()
}
