"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts"
import { IndianRupee, Truck, Users, Loader2 } from "lucide-react"
import { adminFetch } from "@/lib/admin-api"

interface KPIData {
  delivery_rate_percentage: number
  active_capacity_percentage: number
  total_revenue: number | null
  team_capacity_bars: {
    team_member_name: string
    current_load: number
    max_capacity: number
  }[]
}

export default function KpiDashboardPage() {
  const [data, setData] = useState<KPIData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    adminFetch<KPIData>("/api/v1/admin/kpi")
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
        Failed to load KPI data: {error}
      </div>
    )
  }

  const metrics = [
    {
      label: "Total Revenue",
      value: data?.total_revenue != null
        ? `₹${data.total_revenue.toLocaleString("en-IN")}`
        : "—",
      icon: IndianRupee,
    },
    {
      label: "Delivery Rate (30d)",
      value: `${data?.delivery_rate_percentage ?? 0}%`,
      icon: Truck,
    },
    {
      label: "Active Capacity",
      value: `${data?.active_capacity_percentage ?? 0}%`,
      icon: Users,
    },
  ]

  const capacityData = (data?.team_capacity_bars ?? []).map((bar) => ({
    name: bar.team_member_name.split(" ")[0],
    assigned: bar.current_load,
    cap: bar.max_capacity,
  }))

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[#0D2137]">KPI Dashboard</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Live platform performance metrics and capacity overview
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
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
            </CardContent>
          </Card>
        ))}
      </div>

      {capacityData.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base font-semibold text-[#0D2137]">
              Team Capacity Load
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[320px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={capacityData}
                  margin={{ top: 5, right: 10, left: -10, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                  <XAxis
                    dataKey="name"
                    tick={{ fontSize: 11, fill: "#6B7280" }}
                    axisLine={{ stroke: "#E5E7EB" }}
                    tickLine={false}
                  />
                  <YAxis
                    tick={{ fontSize: 11, fill: "#6B7280" }}
                    axisLine={{ stroke: "#E5E7EB" }}
                    tickLine={false}
                  />
                  <Tooltip
                    contentStyle={{
                      borderRadius: "8px",
                      border: "1px solid #E5E7EB",
                      fontSize: "12px",
                    }}
                  />
                  <Legend
                    wrapperStyle={{ fontSize: "12px" }}
                    iconType="circle"
                    iconSize={8}
                  />
                  <Bar
                    dataKey="assigned"
                    name="Assigned"
                    fill="#2B7BC4"
                    radius={[4, 4, 0, 0]}
                    barSize={20}
                  />
                  <Bar
                    dataKey="cap"
                    name="Daily Cap"
                    fill="#E5E7EB"
                    radius={[4, 4, 0, 0]}
                    barSize={20}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
