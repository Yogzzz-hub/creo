import { cookies } from "next/headers"
import { createClient } from "@/lib/supabase/server"
import { apiFetch } from "@/lib/api"
import { getApiUrl } from "@/lib/api-url"
import PortalDashboardClient from "./portal-dashboard"
import type { DashboardData } from "./portal-dashboard"

export default async function PortalDashboardPage() {
  const supabase = await createClient()
  const { data: { session } } = await supabase.auth.getSession()
  const token = session?.access_token || ""

  console.log("Server Token Extracted:", !!token)

  let dashboardData: DashboardData | null = null
  try {
    if (token) {
      dashboardData = (await apiFetch("/api/v1/portal/dashboard", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })) as DashboardData
    }
  } catch (err: any) {
    console.error(
      "Failed to fetch dashboard data on the server:",
      err.message,
      "URL:",
      getApiUrl(),
      "Token:",
      !!token
    )
  }

  return (
    <PortalDashboardClient
      initialData={dashboardData}
      serverToken={token}
    />
  )
}
