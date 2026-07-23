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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  LineChart,
  Line,
} from "recharts"
import {
  TrendingUp,
  TrendingDown,
  IndianRupee,
  Users,
  Truck,
  Clock,
  FileStack,
  LifeBuoy,
  Loader2,
} from "lucide-react"
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

interface DashboardData {
  total_active_clients: number
  mrr_estimate: number
  active_escalations: number
  pending_leave_requests: number
}

interface TeamMemberAdminResponse {
  team_member_id: string
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

interface MonthlyRevenue {
  month: string
  revenue: number
}

interface TicketMetrics {
  total_tickets: number
  resolved: number
  avg_resolution_hours: number
  by_status: Record<string, number>
}

interface DeliverableMetrics {
  total: number
  approved: number
  pending: number
  revision: number
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
      return <span className="inline-flex items-center rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700">Active</span>
    case "pending_payment":
      return <span className="inline-flex items-center rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-700">Pending</span>
    case "lapsed":
      return <span className="inline-flex items-center rounded-full border border-red-200 bg-red-50 px-2 py-0.5 text-xs font-medium text-red-700">Lapsed</span>
    default:
      return <span className="inline-flex items-center rounded-full border border-gray-200 bg-gray-50 px-2 py-0.5 text-xs font-medium text-gray-700">{formatDepartment(status)}</span>
  }
}

export default function AdminReportsPage() {
  const [kpi, setKpi] = useState<KPIData | null>(null)
  const [dashboard, setDashboard] = useState<DashboardData | null>(null)
  const [team, setTeam] = useState<TeamMemberAdminResponse[]>([])
  const [clients, setClients] = useState<AdminClientListResponse[]>([])
  const [revenue, setRevenue] = useState<MonthlyRevenue[]>([])
  const [ticketMetrics, setTicketMetrics] = useState<TicketMetrics | null>(null)
  const [deliverableMetrics, setDeliverableMetrics] = useState<DeliverableMetrics | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    Promise.allSettled([
      adminFetch<KPIData>("/api/v1/admin/kpi"),
      adminFetch<DashboardData>("/api/v1/admin/dashboard"),
      adminFetch<TeamMemberAdminResponse[]>("/api/v1/admin/team"),
      adminFetch<AdminClientListResponse[]>("/api/v1/admin/clients"),
      adminFetch<MonthlyRevenue[]>("/api/v1/admin/reports/revenue"),
      adminFetch<TicketMetrics>("/api/v1/admin/reports/tickets"),
      adminFetch<DeliverableMetrics>("/api/v1/admin/reports/deliverables"),
    ])
      .then((results) => {
        const [kpiRes, dashRes, teamRes, clientRes, revRes, ticketRes, delivRes] = results
        if (kpiRes.status === "fulfilled") setKpi(kpiRes.value)
        if (dashRes.status === "fulfilled") setDashboard(dashRes.value)
        if (teamRes.status === "fulfilled") setTeam(teamRes.value)
        if (clientRes.status === "fulfilled") setClients(clientRes.value)
        if (revRes.status === "fulfilled") setRevenue(revRes.value)
        if (ticketRes.status === "fulfilled") setTicketMetrics(ticketRes.value)
        if (delivRes.status === "fulfilled") setDeliverableMetrics(delivRes.value)

        const failures = results.filter((r) => r.status === "rejected")
        if (failures.length === results.length) setError("Failed to load report data")
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false))
  }, [])

  const activeMembers = team.filter((m) => m.is_active)
  const totalTeamCapacity = activeMembers.reduce(
    (sum, m) => sum + m.daily_cap_posters + m.daily_cap_reels + m.daily_cap_stories, 0
  )
  const totalTeamLoad = (kpi?.team_capacity_bars ?? []).reduce(
    (sum, bar) => sum + bar.current_load, 0
  )
  const activeClients = clients.filter((c) => c.status === "active")
  const atRiskClients = clients.filter((c) => c.status === "lapsed" || c.status === "pending_payment")

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[#0D2137]">Reports</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Platform performance, team analytics, and business insights
        </p>
      </div>

      <Tabs defaultValue="revenue">
        <TabsList variant="line">
          <TabsTrigger value="revenue">Revenue</TabsTrigger>
          <TabsTrigger value="performance">Performance</TabsTrigger>
          <TabsTrigger value="team">Team</TabsTrigger>
          <TabsTrigger value="clients">Clients</TabsTrigger>
          <TabsTrigger value="tickets">Tickets</TabsTrigger>
        </TabsList>

        <TabsContent value="revenue" className="mt-6 space-y-6">
          <div className="grid gap-4 sm:grid-cols-2">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Total Revenue</CardTitle>
                <IndianRupee className="size-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-[#0D2137]">
                  {kpi?.total_revenue != null ? formatCurrency(kpi.total_revenue) : "—"}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">MRR Estimate</CardTitle>
                <TrendingUp className="size-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-[#0D2137]">
                  {dashboard?.mrr_estimate != null ? formatCurrency(dashboard.mrr_estimate) : "—"}
                </div>
              </CardContent>
            </Card>
          </div>

          {revenue.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base font-semibold text-[#0D2137]">Monthly Revenue Trend</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={revenue} margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                      <XAxis dataKey="month" tick={{ fontSize: 11, fill: "#6B7280" }} axisLine={{ stroke: "#E5E7EB" }} tickLine={false} />
                      <YAxis tick={{ fontSize: 11, fill: "#6B7280" }} axisLine={{ stroke: "#E5E7EB" }} tickLine={false} />
                      <Tooltip contentStyle={{ borderRadius: "8px", border: "1px solid #E5E7EB", fontSize: "12px" }} />
                      <Bar dataKey="revenue" name="Revenue" fill="#2B7BC4" radius={[4, 4, 0, 0]} barSize={30} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="performance" className="mt-6 space-y-6">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Delivery Rate</CardTitle>
                <Truck className="size-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-[#0D2137]">{kpi?.delivery_rate_percentage ?? 0}%</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Active Capacity</CardTitle>
                <Users className="size-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-[#0D2137]">{kpi?.active_capacity_percentage ?? 0}%</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Total Deliverables</CardTitle>
                <FileStack className="size-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-[#0D2137]">{deliverableMetrics?.total ?? 0}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Approved Rate</CardTitle>
                <TrendingUp className="size-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-emerald-600">
                  {deliverableMetrics?.total ? Math.round(((deliverableMetrics.approved ?? 0) / deliverableMetrics.total) * 100) : 0}%
                </div>
              </CardContent>
            </Card>
          </div>

          {(kpi?.team_capacity_bars ?? []).length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base font-semibold text-[#0D2137]">Team Capacity Overview</CardTitle>
                <p className="text-xs text-muted-foreground">Total load: {totalTeamLoad} / {totalTeamCapacity} daily capacity</p>
              </CardHeader>
              <CardContent>
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={kpi!.team_capacity_bars.map((bar) => ({ name: bar.team_member_name.split(" ")[0], assigned: bar.current_load, cap: bar.max_capacity }))} margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                      <XAxis dataKey="name" tick={{ fontSize: 11, fill: "#6B7280" }} axisLine={{ stroke: "#E5E7EB" }} tickLine={false} />
                      <YAxis tick={{ fontSize: 11, fill: "#6B7280" }} axisLine={{ stroke: "#E5E7EB" }} tickLine={false} />
                      <Tooltip contentStyle={{ borderRadius: "8px", border: "1px solid #E5E7EB", fontSize: "12px" }} />
                      <Legend wrapperStyle={{ fontSize: "12px" }} iconType="circle" iconSize={8} />
                      <Bar dataKey="assigned" name="Assigned" fill="#2B7BC4" radius={[4, 4, 0, 0]} barSize={20} />
                      <Bar dataKey="cap" name="Daily Cap" fill="#E5E7EB" radius={[4, 4, 0, 0]} barSize={20} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="team" className="mt-6 space-y-6">
          <div className="grid gap-4 sm:grid-cols-3">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Active Members</CardTitle>
                <Users className="size-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-[#0D2137]">{activeMembers.length}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Total Daily Capacity</CardTitle>
                <Truck className="size-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-[#0D2137]">{totalTeamCapacity}</div>
                <p className="mt-1 text-xs text-muted-foreground">tasks/day across all departments</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Departments</CardTitle>
                <Users className="size-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-[#0D2137]">{new Set(activeMembers.map((m) => m.department)).size}</div>
              </CardContent>
            </Card>
          </div>

          <div className="rounded-lg border bg-white">
            <div className="border-b px-4 py-3">
              <h3 className="text-sm font-semibold text-[#0D2137]">Team Roster</h3>
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
                      {formatDepartment(m.role)}
                    </TableCell>
                    <TableCell className="hidden md:table-cell">
                      <span className="text-sm font-semibold text-[#0D2137]">
                        {m.daily_cap_posters + m.daily_cap_reels + m.daily_cap_stories}
                      </span>
                      <span className="text-sm text-muted-foreground"> tasks/day</span>
                    </TableCell>
                    <TableCell className="text-right">
                      <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium ${
                        m.is_active ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-gray-200 bg-gray-50 text-gray-500"
                      }`}>
                        {m.is_active ? "Active" : "Inactive"}
                      </span>
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
                <CardTitle className="text-sm font-medium text-muted-foreground">Total Clients</CardTitle>
                <Users className="size-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-[#0D2137]">{clients.length}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Active Clients</CardTitle>
                <TrendingUp className="size-4 text-emerald-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-[#0D2137]">{activeClients.length}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">At-Risk Clients</CardTitle>
                {atRiskClients.length > 0 ? <TrendingUp className="size-4 text-red-500" /> : <TrendingDown className="size-4 text-emerald-500" />}
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-[#0D2137]">{atRiskClients.length}</div>
              </CardContent>
            </Card>
          </div>

          <div className="rounded-lg border bg-white">
            <div className="border-b px-4 py-3">
              <h3 className="text-sm font-semibold text-[#0D2137]">Client Overview</h3>
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
                          <p className="font-medium text-[#0D2137]">{c.business_name ?? "Unnamed"}</p>
                          <p className="text-xs text-muted-foreground">{c.email}</p>
                        </div>
                      </TableCell>
                      <TableCell>{formatPlan(c.plan_name)}</TableCell>
                      <TableCell>{getStatusBadge(c.status)}</TableCell>
                      <TableCell className="hidden md:table-cell text-muted-foreground">
                        {new Date(c.created_at).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </TabsContent>

        <TabsContent value="tickets" className="mt-6 space-y-6">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Total Tickets</CardTitle>
                <LifeBuoy className="size-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-[#0D2137]">{ticketMetrics?.total_tickets ?? 0}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Resolved</CardTitle>
                <TrendingUp className="size-4 text-emerald-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-emerald-600">{ticketMetrics?.resolved ?? 0}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Avg Resolution</CardTitle>
                <Clock className="size-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-[#0D2137]">{ticketMetrics?.avg_resolution_hours ?? 0}h</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Resolution Rate</CardTitle>
                <TrendingUp className="size-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-[#0D2137]">
                  {ticketMetrics?.total_tickets ? Math.round(((ticketMetrics.resolved ?? 0) / ticketMetrics.total_tickets) * 100) : 0}%
                </div>
              </CardContent>
            </Card>
          </div>

          {ticketMetrics?.by_status && Object.keys(ticketMetrics.by_status).length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base font-semibold text-[#0D2137]">Tickets by Status</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-[250px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={Object.entries(ticketMetrics.by_status).map(([status, count]) => ({ status: status.replace(/_/g, " ").replace(/\b\w/g, (c: string) => c.toUpperCase()), count }))} margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                      <XAxis dataKey="status" tick={{ fontSize: 11, fill: "#6B7280" }} axisLine={{ stroke: "#E5E7EB" }} tickLine={false} />
                      <YAxis tick={{ fontSize: 11, fill: "#6B7280" }} axisLine={{ stroke: "#E5E7EB" }} tickLine={false} />
                      <Tooltip contentStyle={{ borderRadius: "8px", border: "1px solid #E5E7EB", fontSize: "12px" }} />
                      <Bar dataKey="count" name="Tickets" fill="#2B7BC4" radius={[4, 4, 0, 0]} barSize={30} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}
