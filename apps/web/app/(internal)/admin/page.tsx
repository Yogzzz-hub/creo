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
import {
  Users,
  IndianRupee,
  FileStack,
  Clock,
  LifeBuoy,
  CalendarDays,
  TrendingUp,
  CheckSquare,
  Bell,
  Loader2,
  ArrowUpRight,
  AlertTriangle,
} from "lucide-react"
import { adminFetch } from "@/lib/admin-api"

interface DashboardData {
  total_active_clients: number
  active_plans: number
  mrr_estimate: number
  pending_deliverables: number
  awaiting_approval: number
  open_tickets: number
  active_escalations: number
  pending_leave_requests: number
}

interface RecentActivity {
  id: string
  type: string
  title: string
  description: string
  created_at: string
}

interface UpcomingContent {
  id: string
  client_name: string
  content_type: string
  scheduled_date: string
  status: string
}

interface Notification {
  id: string
  title: string
  message: string
  type: string
  created_at: string
}

function formatDate(d: string) {
  return new Date(d).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
  })
}

function formatDateTime(d: string) {
  return new Date(d).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  })
}

export default function AdminDashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null)
  const [activity, setActivity] = useState<RecentActivity[]>([])
  const [upcoming, setUpcoming] = useState<UpcomingContent[]>([])
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    Promise.allSettled([
      adminFetch<DashboardData>("/api/v1/admin/dashboard"),
      adminFetch<RecentActivity[]>("/api/v1/admin/dashboard/activity"),
      adminFetch<UpcomingContent[]>("/api/v1/admin/dashboard/upcoming"),
      adminFetch<Notification[]>("/api/v1/admin/dashboard/notifications"),
    ])
      .then((results) => {
        const [dashRes, actRes, upRes, notiRes] = results
        if (dashRes.status === "fulfilled") setData(dashRes.value)
        if (actRes.status === "fulfilled") setActivity(actRes.value)
        if (upRes.status === "fulfilled") setUpcoming(upRes.value)
        if (notiRes.status === "fulfilled") setNotifications(notiRes.value)

        const failures = results.filter((r) => r.status === "rejected")
        if (failures.length === results.length) {
          setError("Failed to load dashboard data")
        }
      })
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

  const kpiCards = [
    {
      label: "Total Clients",
      value: String(data?.total_active_clients ?? 0),
      icon: Users,
      color: "text-[#0D2137]",
      href: "/admin/clients",
    },
    {
      label: "Active Plans",
      value: String(data?.active_plans ?? 0),
      icon: TrendingUp,
      color: "text-[#0D2137]",
      href: "/admin/sales",
    },
    {
      label: "Monthly Revenue",
      value: `₹${(data?.mrr_estimate ?? 0).toLocaleString("en-IN")}`,
      icon: IndianRupee,
      color: "text-emerald-600",
      href: "/admin/reports",
    },
    {
      label: "Pending Deliverables",
      value: String(data?.pending_deliverables ?? 0),
      icon: FileStack,
      color: "text-amber-600",
      href: "/admin/deliverables",
    },
    {
      label: "Awaiting Approval",
      value: String(data?.awaiting_approval ?? 0),
      icon: Clock,
      color: "text-blue-600",
      href: "/admin/deliverables",
    },
    {
      label: "Open Tickets",
      value: String(data?.open_tickets ?? 0),
      icon: LifeBuoy,
      color: (data?.open_tickets ?? 0) > 0 ? "text-red-600" : "text-[#0D2137]",
      href: "/admin/support",
      alert: (data?.open_tickets ?? 0) > 0,
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
                Warning: {data?.active_escalations} active escalation(s) require immediate attention.
              </p>
              <Link
                href="/admin/support"
                className="mt-1 inline-block text-sm font-medium text-red-600 underline-offset-2 hover:underline"
              >
                View Support Tickets →
              </Link>
            </div>
          </div>
        </div>
      )}

      <div>
        <h1 className="text-2xl font-bold text-[#0D2137]">Dashboard</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Overview of your agency operations
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {kpiCards.map((metric) => (
          <Link key={metric.label} href={metric.href}>
            <Card className="transition-shadow hover:shadow-md cursor-pointer">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {metric.label}
                </CardTitle>
                <metric.icon className="size-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className={`text-2xl font-bold ${metric.color}`}>
                  {metric.value}
                </div>
                {metric.alert && (
                  <p className="mt-1 text-xs font-medium text-red-600">
                    Requires attention
                  </p>
                )}
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Upcoming Content Schedule */}
        <div className="rounded-lg border bg-white">
          <div className="flex items-center justify-between border-b px-4 py-3">
            <h3 className="text-sm font-semibold text-[#0D2137]">
              Upcoming Content Schedule
            </h3>
            <Link
              href="/admin/calendar"
              className="text-xs font-medium text-[#2B7BC4] hover:underline"
            >
              View All
            </Link>
          </div>
          {upcoming.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12">
              <CalendarDays className="size-8 text-muted-foreground/50" />
              <p className="mt-2 text-sm text-muted-foreground">No upcoming content</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Client</TableHead>
                  <TableHead className="hidden md:table-cell">Type</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {upcoming.slice(0, 5).map((item) => (
                  <TableRow key={item.id}>
                    <TableCell className="font-medium text-[#0D2137]">
                      {item.client_name}
                    </TableCell>
                    <TableCell className="hidden md:table-cell text-muted-foreground">
                      {item.content_type}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {formatDate(item.scheduled_date)}
                    </TableCell>
                    <TableCell>
                      <span className="inline-flex items-center rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-700">
                        {item.status}
                      </span>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>

        {/* Team Activity */}
        <div className="rounded-lg border bg-white">
          <div className="flex items-center justify-between border-b px-4 py-3">
            <h3 className="text-sm font-semibold text-[#0D2137]">
              Recent Activity
            </h3>
          </div>
          {activity.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12">
              <CheckSquare className="size-8 text-muted-foreground/50" />
              <p className="mt-2 text-sm text-muted-foreground">No recent activity</p>
            </div>
          ) : (
            <div className="divide-y">
              {activity.slice(0, 6).map((item) => (
                <div key={item.id} className="px-4 py-3">
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full bg-[#E8F4FD]">
                      <CheckSquare className="size-4 text-[#2B7BC4]" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-[#0D2137]">{item.title}</p>
                      <p className="mt-0.5 text-xs text-muted-foreground">{item.description}</p>
                      <p className="mt-1 text-[10px] text-muted-foreground/70">
                        {formatDateTime(item.created_at)}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Recent Notifications */}
      <div className="rounded-lg border bg-white">
        <div className="flex items-center justify-between border-b px-4 py-3">
          <h3 className="text-sm font-semibold text-[#0D2137]">
            Recent Notifications
          </h3>
          <Bell className="size-4 text-muted-foreground" />
        </div>
        {notifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12">
            <Bell className="size-8 text-muted-foreground/50" />
            <p className="mt-2 text-sm text-muted-foreground">No new notifications</p>
          </div>
        ) : (
          <div className="divide-y">
            {notifications.slice(0, 5).map((n) => (
              <div key={n.id} className="flex items-center gap-3 px-4 py-3">
                <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-[#E8F4FD]">
                  <Bell className="size-4 text-[#2B7BC4]" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-[#0D2137]">{n.title}</p>
                  <p className="text-xs text-muted-foreground">{n.message}</p>
                </div>
                <span className="shrink-0 text-[10px] text-muted-foreground/70">
                  {formatDateTime(n.created_at)}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Quick Actions */}
      <div className="rounded-lg border bg-white p-4">
        <h3 className="mb-3 text-sm font-semibold text-[#0D2137]">Quick Actions</h3>
        <div className="flex flex-wrap gap-2">
          {[
            { label: "View Clients", href: "/admin/clients" },
            { label: "Manage Deliverables", href: "/admin/deliverables" },
            { label: "View Tasks", href: "/admin/tasks" },
            { label: "Support Tickets", href: "/admin/support" },
            { label: "Content Calendar", href: "/admin/calendar" },
            { label: "Team Management", href: "/admin/teams" },
          ].map((action) => (
            <Link
              key={action.href}
              href={action.href}
              className="inline-flex items-center gap-1 rounded-lg border border-[#C9DFF0] bg-white px-3 py-1.5 text-xs font-medium text-[#0D2137] transition-colors hover:bg-[#E8F4FD]"
            >
              {action.label}
              <ArrowUpRight className="size-3" />
            </Link>
          ))}
        </div>
      </div>
    </div>
  )
}
