"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { useParams } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  ArrowLeft,
  Building2,
  Mail,
  Phone,
  CreditCard,
  Loader2,
  FileText,
  Headphones,
} from "lucide-react"
import { adminFetch } from "@/lib/admin-api"

interface Subscription {
  id: string
  plan_id: string
  plan_name: string | null
  status: string
  monthly_price: number | null
  gateway: string
  current_period_start: string
  current_period_end: string
}

interface ClientDetail {
  user_id: string
  full_name: string
  business_name: string | null
  email: string
  phone: string | null
  plan_name: string | null
  status: string
  created_at: string
  subscriptions: Subscription[]
  deliverables_count: number
  open_tickets_count: number
}

function formatStatus(status: string) {
  return status
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase())
}

function formatCurrency(amount: number) {
  return `₹${amount.toLocaleString("en-IN")}`
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  })
}

export default function ClientProfilePage() {
  const params = useParams()
  const id = params.id as string

  const [client, setClient] = useState<ClientDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!id) return
    adminFetch<ClientDetail>(`/api/v1/admin/clients/${id}`)
      .then(setClient)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false))
  }, [id])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="space-y-4">
        <Link
          href="/admin/clients"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-[#0D2137]"
        >
          <ArrowLeft className="size-4" /> Back to Clients
        </Link>
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          Failed to load client: {error}
        </div>
      </div>
    )
  }

  if (!client) return null

  const activeSub = client.subscriptions.find((s) => s.status === "active")
  const latestSub = client.subscriptions[0]

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link
          href="/admin/clients"
          className="flex size-8 items-center justify-center rounded-lg border bg-white text-muted-foreground hover:text-[#0D2137]"
        >
          <ArrowLeft className="size-4" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-[#0D2137]">
            {client.business_name ?? "Unnamed Client"}
          </h1>
          <p className="text-sm text-muted-foreground">
            {client.full_name} · Member since {formatDate(client.created_at)}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-1">
          {/* Business Details */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base font-semibold text-[#0D2137]">
                <Building2 className="size-4 text-muted-foreground" />
                Business Details
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">
                  Business Name
                </span>
                <span className="text-sm font-medium text-[#0D2137]">
                  {client.business_name ?? "—"}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Owner</span>
                <span className="text-sm font-medium text-[#0D2137]">
                  {client.full_name}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Email</span>
                <a
                  href={`mailto:${client.email}`}
                  className="text-sm font-medium text-[#2B7BC4] hover:underline"
                >
                  {client.email}
                </a>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Phone</span>
                <span className="text-sm font-medium text-[#0D2137]">
                  {client.phone ?? "—"}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Status</span>
                <span className="inline-flex items-center rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700">
                  {formatStatus(client.status)}
                </span>
              </div>
            </CardContent>
          </Card>

          {/* Subscription */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base font-semibold text-[#0D2137]">
                <CreditCard className="size-4 text-muted-foreground" />
                Subscription
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">
                  Current Plan
                </span>
                <Badge variant="outline">
                  {formatStatus(client.plan_name ?? "none")}
                </Badge>
              </div>
              {activeSub?.monthly_price != null && (
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">
                    Monthly Revenue
                  </span>
                  <span className="text-sm font-bold text-[#0D2137]">
                    {formatCurrency(activeSub.monthly_price)}
                  </span>
                </div>
              )}
              {latestSub && (
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">
                    Next Billing
                  </span>
                  <span className="text-sm font-medium text-[#0D2137]">
                    {formatDate(latestSub.current_period_end)}
                  </span>
                </div>
              )}
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">
                  Gateway
                </span>
                <span className="text-sm font-medium text-[#0D2137]">
                  {latestSub ? formatStatus(latestSub.gateway) : "—"}
                </span>
              </div>
            </CardContent>
          </Card>

          {/* Quick Stats */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base font-semibold text-[#0D2137]">
                <FileText className="size-4 text-muted-foreground" />
                Activity
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">
                  Total Deliverables
                </span>
                <span className="text-sm font-bold text-[#0D2137]">
                  {client.deliverables_count}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">
                  Open Tickets
                </span>
                <span className="text-sm font-bold text-[#0D2137]">
                  {client.open_tickets_count}
                </span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right column: subscription history */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle className="text-base font-semibold text-[#0D2137]">
                Subscription History
              </CardTitle>
            </CardHeader>
            <CardContent>
              {client.subscriptions.length === 0 ? (
                <p className="py-8 text-center text-sm text-muted-foreground">
                  No subscriptions found.
                </p>
              ) : (
                <div className="space-y-3">
                  {client.subscriptions.map((sub) => (
                    <div
                      key={sub.id}
                      className="flex items-center justify-between rounded-lg border p-4"
                    >
                      <div>
                        <p className="text-sm font-medium text-[#0D2137]">
                          {formatStatus(sub.plan_name ?? "Unknown")} Plan
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {formatDate(sub.current_period_start)} –{" "}
                          {formatDate(sub.current_period_end)}
                        </p>
                      </div>
                      <div className="text-right">
                        {sub.monthly_price != null && (
                          <p className="text-sm font-bold text-[#0D2137]">
                            {formatCurrency(sub.monthly_price)}/mo
                          </p>
                        )}
                        <Badge
                          variant={
                            sub.status === "active" ? "default" : "outline"
                          }
                        >
                          {formatStatus(sub.status)}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
