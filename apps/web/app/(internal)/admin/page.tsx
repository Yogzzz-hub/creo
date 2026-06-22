"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import {
  AlertTriangle,
  Users,
  AlertCircle,
  IndianRupee,
  Loader2,
} from "lucide-react"
import { adminFetch } from "@/lib/admin-api"

interface DashboardData {
  total_active_clients: number
  mrr_estimate: number
  active_escalations: number
  pending_leave_requests: number
}

export default function AdminDashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    adminFetch<DashboardData>("/api/v1/admin/dashboard")
      .then(setData)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
        Failed to load dashboard: {error}
      </div>
    )
  }

  const metrics = [
    {
      label: "Active Clients",
      value: String(data?.total_active_clients ?? 0),
      icon: Users,
    },
    {
      label: "Monthly Revenue",
      value: `₹${(data?.mrr_estimate ?? 0).toLocaleString("en-IN")}`,
      icon: IndianRupee,
    },
    {
      label: "Open Escalations",
      value: String(data?.active_escalations ?? 0),
      icon: AlertCircle,
      negative: (data?.active_escalations ?? 0) > 0,
    },
    {
      label: "Pending Leave",
      value: String(data?.pending_leave_requests ?? 0),
      icon: AlertTriangle,
      negative: (data?.pending_leave_requests ?? 0) > 0,
    },
  ]

  return (
    <div className="space-y-6">
      {(data?.active_escalations ?? 0) > 0 && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="mt-0.5 size-5 shrink-0 text-red-600" />
            <div>
              <p className="text-sm font-semibold text-red-800">
                Warning: {data?.active_escalations} active escalation(s) require
                immediate attention.
              </p>
              <Link
                href="/admin/escalations"
                className="mt-1 inline-block text-sm font-medium text-red-600 underline-offset-2 hover:underline"
              >
                View Escalations →
              </Link>
            </div>
          </div>
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {metrics.map((metric) => (
          <Card key={metric.label}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {metric.label}
              </CardTitle>
              <metric.icon className="size-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-[#0D2137]">
                {metric.value}
              </div>
              {metric.negative && (
                <p className="mt-1 text-xs font-medium text-red-600">
                  Requires attention
                </p>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
