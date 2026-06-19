"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  AreaChart,
  Area,
  ResponsiveContainer,
} from "recharts"
import { IndianRupee, Truck, Users, ShieldCheck } from "lucide-react"

const KPI_METRICS = [
  {
    label: "Current MRR",
    value: "₹1,34,991",
    icon: IndianRupee,
    change: "+12% vs last month",
    changeType: "positive" as const,
  },
  {
    label: "Overall Delivery Rate",
    value: "94.2%",
    icon: Truck,
    change: "+2.1% vs last month",
    changeType: "positive" as const,
  },
  {
    label: "Total Active Capacity",
    value: "31/42",
    icon: Users,
    change: "74% utilised",
    changeType: "neutral" as const,
  },
  {
    label: "SLA Success Rate",
    value: "96.8%",
    icon: ShieldCheck,
    change: "-0.5% vs last month",
    changeType: "negative" as const,
  },
]

const CAPACITY_DATA = [
  { name: "Priya S.", assigned: 4, cap: 6 },
  { name: "Rahul M.", assigned: 3, cap: 4 },
  { name: "Ananya K.", assigned: 4, cap: 5 },
  { name: "Vikram D.", assigned: 3, cap: 3 },
  { name: "Neha G.", assigned: 2, cap: 6 },
  { name: "Arjun R.", assigned: 5, cap: 8 },
  { name: "Kavitha N.", assigned: 4, cap: 5 },
  { name: "Sanjay J.", assigned: 0, cap: 10 },
  { name: "Meera I.", assigned: 3, cap: 4 },
  { name: "Rohan G.", assigned: 3, cap: 5 },
]

function generateDeliveryTrend() {
  const data = []
  const base = 88
  for (let i = 30; i >= 1; i--) {
    const date = new Date(2026, 5, 17)
    date.setDate(date.getDate() - i)
    const day = date.getDate()
    const month = date.toLocaleString("en-US", { month: "short" })
    const variation = Math.round((Math.random() - 0.3) * 5)
    data.push({
      date: `${month} ${day}`,
      rate: Math.min(100, Math.max(82, base + variation)),
    })
  }
  return data
}

const DELIVERY_TREND = generateDeliveryTrend()

export default function KpiDashboardPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[#0D2137]">
          KPI Dashboard
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Live platform performance metrics and capacity overview
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {KPI_METRICS.map((metric) => (
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
              <p
                className={`mt-1 text-xs ${
                  metric.changeType === "negative"
                    ? "font-medium text-red-600"
                    : metric.changeType === "positive"
                    ? "text-emerald-600"
                    : "text-muted-foreground"
                }`}
              >
                {metric.change}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
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
                  data={CAPACITY_DATA}
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

        <Card>
          <CardHeader>
            <CardTitle className="text-base font-semibold text-[#0D2137]">
              Delivery Rate Trend (30 Days)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[320px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart
                  data={DELIVERY_TREND}
                  margin={{ top: 5, right: 10, left: -10, bottom: 5 }}
                >
                  <defs>
                    <linearGradient id="deliveryGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#2B7BC4" stopOpacity={0.2} />
                      <stop offset="95%" stopColor="#2B7BC4" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                  <XAxis
                    dataKey="date"
                    tick={{ fontSize: 10, fill: "#6B7280" }}
                    axisLine={{ stroke: "#E5E7EB" }}
                    tickLine={false}
                    interval={4}
                  />
                  <YAxis
                    domain={[80, 100]}
                    tick={{ fontSize: 11, fill: "#6B7280" }}
                    axisLine={{ stroke: "#E5E7EB" }}
                    tickLine={false}
                    tickFormatter={(v) => `${v}%`}
                  />
                  <Tooltip
                    contentStyle={{
                      borderRadius: "8px",
                      border: "1px solid #E5E7EB",
                      fontSize: "12px",
                    }}
                    formatter={(value) => [`${value}%`, "Delivery Rate"]}
                  />
                  <Area
                    type="monotone"
                    dataKey="rate"
                    stroke="#2B7BC4"
                    strokeWidth={2}
                    fill="url(#deliveryGradient)"
                    dot={false}
                    activeDot={{ r: 4, fill: "#2B7BC4", strokeWidth: 2, stroke: "#fff" }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
