"use client"

import { useEffect, useState } from "react"
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  TrendingUp,
  TrendingDown,
  IndianRupee,
  Users,
  Truck,
  Loader2,
} from "lucide-react"
import { adminFetch } from "@/lib/admin-api"

interface TeamMemberAdminResponse {
  team_member_id: string
  user_id: string
  full_name: string
  email: string
  role: string
  department: string
  daily_cap_posters: number
  daily_cap_reels: number
  daily_cap_stories: number
  is_active: boolean
  joined_at: string
}

interface AdminClientListResponse {
  user_id: string
  business_name: string | null
  email: string
  plan_name: string | null
  status: string
  created_at: string
}

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

interface DashboardData {
  total_active_clients: number
  mrr_estimate: number
  active_escalations: number
  pending_leave_requests: number
}

function formatDepartment(dept: string) {
  return dept.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())
}

function formatPlan(plan: string | null) {
  if (!plan) return "—"
  return plan.charAt(0).toUpperCase() + plan.slice(1)
}

function formatCurrency(amount: number) {
  return `₹${amount.toLocaleString("en-IN")}`
}

function getStatusBadge(status: string) {
  switch (status) {
    case "active":
      return (
        <span className="inline-flex items-center rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700">
          Active
        </span>
      )
    case "pending_payment":
      return (
        <span className="inline-flex items-center rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-700">
          Pending Payment
        </span>
      )
    case "lapsed":
      return (
        <span className="inline-flex items-center rounded-full border border-red-200 bg-red-50 px-2 py-0.5 text-xs font-medium text-red-700">
          Lapsed
        </span>
      )
    default:
      return (
        <span className="inline-flex items-center rounded-full border border-gray-200 bg-gray-50 px-2 py-0.5 text-xs font-medium text-gray-700">
          {status.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())}
        </span>
      )
  }
}

export default function AdminReportsPage() {
  const [kpi, setKpi] = useState<KPIData | null>(null)
  const [dashboard, setDashboard] = useState<DashboardData | null>(null)
  const [team, setTeam] = useState<TeamMemberAdminResponse[]>([])
  const [clients, setClients] = useState<AdminClientListResponse[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    Promise.allSettled([
      adminFetch<KPIData>("/api/v1/admin/kpi"),
      adminFetch<DashboardData>("/api/v1/admin/dashboard"),
      adminFetch<TeamMemberAdminResponse[]>("/api/v1/admin/team"),
      adminFetch<AdminClientListResponse[]>("/api/v1/admin/clients"),
    ])
      .then((results) => {
        const [kpiRes, dashRes, teamRes, clientRes] = results
        if (kpiRes.status === "fulfilled") setKpi(kpiRes.value)
        if (dashRes.status === "fulfilled") setDashboard(dashRes.value)
        if (teamRes.status === "fulfilled") setTeam(teamRes.value)
        if (clientRes.status === "fulfilled") setClients(clientRes.value)

        const failures = results.filter((r) => r.status === "rejected")
        if (failures.length === results.length) {
          setError("Failed to load report data")
        }
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false))
  }, [])

  const activeMembers = team.filter((m) => m.is_active)

  const totalTeamCapacity = activeMembers.reduce(
    (sum, m) => sum + m.daily_cap_posters + m.daily_cap_reels + m.daily_cap_stories,
    0
  )

  const totalTeamLoad = (kpi?.team_capacity_bars ?? []).reduce(
    (sum, bar) => sum + bar.current_load,
    0
  )

  const activeClients = clients.filter((c) => c.status === "active")
  const atRiskClients = clients.filter(
    (c) => c.status === "lapsed" || c.status === "pending_payment"
  )

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
        {error}
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[#0D2137]">Reports</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Platform performance and team analytics
        </p>
      </div>

      <Tabs defaultValue="performance">
        <TabsList variant="line">
          <TabsTrigger value="performance">Performance</TabsTrigger>
          <TabsTrigger value="team">Team</TabsTrigger>
          <TabsTrigger value="clients">Clients</TabsTrigger>
        </TabsList>

        <TabsContent value="performance" className="mt-6 space-y-6">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Total Revenue
                </CardTitle>
                <IndianRupee className="size-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-[#0D2137]">
                  {kpi?.total_revenue != null
                    ? formatCurrency(kpi.total_revenue)
                    : "—"}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  MRR Estimate
                </CardTitle>
                <TrendingUp className="size-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-[#0D2137]">
                  {dashboard?.mrr_estimate != null
                    ? formatCurrency(dashboard.mrr_estimate)
                    : "—"}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Delivery Rate
                </CardTitle>
                <Truck className="size-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-[#0D2137]">
                  {kpi?.delivery_rate_percentage ?? 0}%
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Active Capacity
                </CardTitle>
                <Users className="size-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-[#0D2137]">
                  {kpi?.active_capacity_percentage ?? 0}%
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Active Escalations
                </CardTitle>
                {((dashboard?.active_escalations ?? 0) > 0) ? (
                  <TrendingUp className="size-4 text-red-500" />
                ) : (
                  <TrendingDown className="size-4 text-emerald-500" />
                )}
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-[#0D2137]">
                  {dashboard?.active_escalations ?? 0}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Pending Leave
                </CardTitle>
                <TrendingUp className="size-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-[#0D2137]">
                  {dashboard?.pending_leave_requests ?? 0}
                </div>
              </CardContent>
            </Card>
          </div>

          {(kpi?.team_capacity_bars ?? []).length > 0 && (
            <div className="rounded-lg border bg-white">
              <div className="border-b px-4 py-3">
                <h3 className="text-sm font-semibold text-[#0D2137]">
                  Team Capacity Overview
                </h3>
                <p className="text-xs text-muted-foreground">
                  Total load: {totalTeamLoad} / {totalTeamCapacity} daily capacity
                </p>
              </div>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Team Member</TableHead>
                    <TableHead className="text-right">Current Load</TableHead>
                    <TableHead className="text-right">Daily Cap</TableHead>
                    <TableHead className="text-right">Utilization</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {kpi!.team_capacity_bars.map((bar) => {
                    const utilization =
                      bar.max_capacity > 0
                        ? Math.round((bar.current_load / bar.max_capacity) * 100)
                        : 0
                    return (
                      <TableRow key={bar.team_member_name}>
                        <TableCell className="font-medium text-[#0D2137]">
                          {bar.team_member_name}
                        </TableCell>
                        <TableCell className="text-right">
                          {bar.current_load}
                        </TableCell>
                        <TableCell className="text-right">
                          {bar.max_capacity}
                        </TableCell>
                        <TableCell className="text-right">
                          <span
                            className={`text-sm font-semibold ${
                              utilization >= 90
                                ? "text-red-600"
                                : utilization >= 70
                                ? "text-amber-600"
                                : "text-emerald-600"
                            }`}
                          >
                            {utilization}%
                          </span>
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </TabsContent>

        <TabsContent value="team" className="mt-6 space-y-6">
          <div className="grid gap-4 sm:grid-cols-3">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Active Members
                </CardTitle>
                <Users className="size-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-[#0D2137]">
                  {activeMembers.length}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Total Daily Capacity
                </CardTitle>
                <Truck className="size-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-[#0D2137]">
                  {totalTeamCapacity}
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  tasks/day across all departments
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Departments
                </CardTitle>
                <Users className="size-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-[#0D2137]">
                  {new Set(activeMembers.map((m) => m.department)).size}
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="rounded-lg border bg-white">
            <div className="border-b px-4 py-3">
              <h3 className="text-sm font-semibold text-[#0D2137]">
                Team Roster
              </h3>
            </div>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Department</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead className="hidden md:table-cell">Daily Cap</TableHead>
                  <TableHead className="text-right">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {activeMembers.map((m) => (
                  <TableRow key={m.team_member_id}>
                    <TableCell>
                      <div>
                        <p className="font-medium text-[#0D2137]">{m.full_name}</p>
                        <p className="text-xs text-muted-foreground">{m.email}</p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="inline-flex items-center rounded-full border border-border bg-muted px-2 py-0.5 text-xs font-medium">
                        {formatDepartment(m.department)}
                      </span>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {m.role.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())}
                    </TableCell>
                    <TableCell className="hidden md:table-cell">
                      <span className="text-sm font-semibold text-[#0D2137]">
                        {m.daily_cap_posters + m.daily_cap_reels + m.daily_cap_stories}
                      </span>
                      <span className="text-sm text-muted-foreground"> tasks/day</span>
                    </TableCell>
                    <TableCell className="text-right">
                      {m.is_active ? (
                        <span className="inline-flex items-center rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700">
                          Active
                        </span>
                      ) : (
                        <span className="inline-flex items-center rounded-full border border-gray-200 bg-gray-50 px-2 py-0.5 text-xs font-medium text-gray-500">
                          Inactive
                        </span>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </TabsContent>

        <TabsContent value="clients" className="mt-6 space-y-6">
          <div className="grid gap-4 sm:grid-cols-3">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Total Clients
                </CardTitle>
                <Users className="size-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-[#0D2137]">
                  {clients.length}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Active Clients
                </CardTitle>
                <TrendingUp className="size-4 text-emerald-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-[#0D2137]">
                  {activeClients.length}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  At-Risk Clients
                </CardTitle>
                {atRiskClients.length > 0 ? (
                  <TrendingUp className="size-4 text-red-500" />
                ) : (
                  <TrendingDown className="size-4 text-emerald-500" />
                )}
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-[#0D2137]">
                  {atRiskClients.length}
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="rounded-lg border bg-white">
            <div className="border-b px-4 py-3">
              <h3 className="text-sm font-semibold text-[#0D2137]">
                Client Overview
              </h3>
            </div>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Client</TableHead>
                  <TableHead>Plan</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="hidden md:table-cell">Joined</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {clients.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="h-24 text-center">
                      <p className="text-sm text-muted-foreground">No clients found.</p>
                    </TableCell>
                  </TableRow>
                ) : (
                  clients.map((c) => (
                    <TableRow key={c.user_id}>
                      <TableCell>
                        <div>
                          <p className="font-medium text-[#0D2137]">
                            {c.business_name ?? "Unnamed"}
                          </p>
                          <p className="text-xs text-muted-foreground">{c.email}</p>
                        </div>
                      </TableCell>
                      <TableCell>{formatPlan(c.plan_name)}</TableCell>
                      <TableCell>{getStatusBadge(c.status)}</TableCell>
                      <TableCell className="hidden md:table-cell text-muted-foreground">
                        {new Date(c.created_at).toLocaleDateString("en-IN", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        })}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
