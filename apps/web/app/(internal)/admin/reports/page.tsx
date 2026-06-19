"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
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
  Download,
  FileText,
  Loader2,
  TrendingUp,
  TrendingDown,
  IndianRupee,
  CreditCard,
  AlertCircle,
} from "lucide-react"
import { toast } from "sonner"

const WEEKLY_STATS = [
  { label: "Deliverables Completed", value: "38", change: "+5 vs last week", trend: "up" as const },
  { label: "Revisions Requested", value: "7", change: "-2 vs last week", trend: "down" as const },
  { label: "SLA Breaches", value: "2", change: "+1 vs last week", trend: "up" as const },
]

const TOP_PERFORMERS = [
  { name: "Priya Sharma", department: "Graphics", deliverables: 12, onTime: "96%", rating: "4.8" },
  { name: "Rahul Mehta", department: "Video", deliverables: 8, onTime: "92%", rating: "4.7" },
  { name: "Ananya Kumar", department: "Content", deliverables: 10, onTime: "94%", rating: "4.6" },
  { name: "Neha Gupta", department: "Graphics", deliverables: 9, onTime: "89%", rating: "4.5" },
  { name: "Vikram Desai", department: "Video", deliverables: 6, onTime: "91%", rating: "4.4" },
]

const MONTHLY_STATS = [
  { label: "Client Retention Rate", value: "94%", change: "+2% vs last month", trend: "up" as const },
  { label: "New Onboardings", value: "3", change: "+1 vs last month", trend: "up" as const },
  { label: "Total Content Delivered", value: "142", change: "+18 vs last month", trend: "up" as const },
]

const CLIENT_HEALTH = [
  { name: "Brew & Bloom Cafe", plan: "Growth", healthScore: 92, status: "Healthy", lastDelivery: "Jun 16" },
  { name: "TechNova Solutions", plan: "Pro", healthScore: 88, status: "Healthy", lastDelivery: "Jun 15" },
  { name: "FreshCart", plan: "Starter", healthScore: 76, status: "At Risk", lastDelivery: "Jun 12" },
  { name: "StyleHaus", plan: "Growth", healthScore: 85, status: "Healthy", lastDelivery: "Jun 14" },
  { name: "Urban Eats", plan: "Pro", healthScore: 71, status: "At Risk", lastDelivery: "Jun 10" },
  { name: "GreenLeaf Organics", plan: "Starter", healthScore: 45, status: "Churning", lastDelivery: "May 28" },
]

const FINANCIAL_STATS = [
  { label: "Total MRR", value: "₹1,34,991", change: "+₹14,999 vs last month", trend: "up" as const },
  { label: "Add-on Revenue", value: "₹42,000", change: "+₹8,000 vs last month", trend: "up" as const },
  { label: "Pending Payments", value: "₹29,999", change: "1 overdue invoice", trend: "down" as const },
]

const RECENT_TRANSACTIONS = [
  { id: "TXN-892", client: "TechNova Solutions", type: "Subscription", amount: "₹29,999", date: "Jun 15, 2026", status: "Paid" },
  { id: "TXN-891", client: "Brew & Bloom Cafe", type: "Subscription", amount: "₹14,999", date: "Jun 15, 2026", status: "Paid" },
  { id: "TXN-890", client: "FreshCart", type: "Subscription", amount: "₹7,999", date: "Jun 15, 2026", status: "Paid" },
  { id: "TXN-889", client: "Urban Eats", type: "Add-on: Extra Reels", amount: "₹8,000", date: "Jun 14, 2026", status: "Paid" },
  { id: "TXN-888", client: "StyleHaus", type: "Subscription", amount: "₹14,999", date: "Jun 15, 2026", status: "Pending" },
  { id: "TXN-887", client: "GreenLeaf Organics", type: "Subscription", amount: "₹7,999", date: "Jun 10, 2026", status: "Overdue" },
]

function getHealthColor(score: number) {
  if (score >= 80) return "text-emerald-600"
  if (score >= 60) return "text-amber-600"
  return "text-red-600"
}

function getHealthBadge(status: string) {
  switch (status) {
    case "Healthy":
      return (
        <span className="inline-flex items-center rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700">
          Healthy
        </span>
      )
    case "At Risk":
      return (
        <span className="inline-flex items-center rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-700">
          At Risk
        </span>
      )
    case "Churning":
      return (
        <span className="inline-flex items-center rounded-full border border-red-200 bg-red-50 px-2 py-0.5 text-xs font-medium text-red-700">
          Churning
        </span>
      )
    default:
      return <Badge variant="outline">{status}</Badge>
  }
}

function getStatusBadge(status: string) {
  switch (status) {
    case "Paid":
      return (
        <span className="inline-flex items-center rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700">
          Paid
        </span>
      )
    case "Pending":
      return (
        <span className="inline-flex items-center rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-700">
          Pending
        </span>
      )
    case "Overdue":
      return (
        <span className="inline-flex items-center rounded-full border border-red-200 bg-red-50 px-2 py-0.5 text-xs font-medium text-red-700">
          Overdue
        </span>
      )
    default:
      return <Badge variant="outline">{status}</Badge>
  }
}

export default function AdminReportsPage() {
  const [exporting, setExporting] = useState<string | null>(null)

  function handleExport(type: string) {
    setExporting(type)
    setTimeout(() => {
      setExporting(null)
      toast.success("Report downloaded successfully", {
        description: `Your ${type} report has been generated.`,
      })
    }, 1000)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#0D2137]">Reports</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Platform performance and financial analytics
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="secondary"
            size="sm"
            disabled={exporting !== null}
            onClick={() => handleExport("PDF")}
          >
            {exporting === "PDF" ? (
              <Loader2 className="size-3.5 animate-spin" />
            ) : (
              <FileText className="size-3.5" />
            )}
            Export to PDF
          </Button>
          <Button
            variant="secondary"
            size="sm"
            disabled={exporting !== null}
            onClick={() => handleExport("CSV")}
          >
            {exporting === "CSV" ? (
              <Loader2 className="size-3.5 animate-spin" />
            ) : (
              <Download className="size-3.5" />
            )}
            Export to CSV
          </Button>
        </div>
      </div>

      <Tabs defaultValue="weekly">
        <TabsList variant="line">
          <TabsTrigger value="weekly">Weekly</TabsTrigger>
          <TabsTrigger value="monthly">Monthly</TabsTrigger>
          <TabsTrigger value="financial">Financial</TabsTrigger>
        </TabsList>

        <TabsContent value="weekly" className="mt-6 space-y-6">
          <div className="grid gap-4 sm:grid-cols-3">
            {WEEKLY_STATS.map((stat) => (
              <Card key={stat.label}>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    {stat.label}
                  </CardTitle>
                  {stat.trend === "up" ? (
                    <TrendingUp className="size-4 text-muted-foreground" />
                  ) : (
                    <TrendingDown className="size-4 text-muted-foreground" />
                  )}
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-[#0D2137]">
                    {stat.value}
                  </div>
                  <p
                    className={`mt-1 text-xs ${
                      stat.label === "SLA Breaches"
                        ? "font-medium text-red-600"
                        : "text-muted-foreground"
                    }`}
                  >
                    {stat.change}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="rounded-lg border bg-white">
            <div className="border-b px-4 py-3">
              <h3 className="text-sm font-semibold text-[#0D2137]">
                Top Performing Team Members
              </h3>
            </div>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Department</TableHead>
                  <TableHead>Deliverables</TableHead>
                  <TableHead className="hidden md:table-cell">On-Time %</TableHead>
                  <TableHead className="text-right">Rating</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {TOP_PERFORMERS.map((p, idx) => (
                  <TableRow key={idx}>
                    <TableCell className="font-medium text-[#0D2137]">
                      {p.name}
                    </TableCell>
                    <TableCell>
                      <span className="inline-flex items-center rounded-full border border-border bg-muted px-2 py-0.5 text-xs font-medium">
                        {p.department}
                      </span>
                    </TableCell>
                    <TableCell className="font-medium">{p.deliverables}</TableCell>
                    <TableCell className="hidden md:table-cell text-muted-foreground">
                      {p.onTime}
                    </TableCell>
                    <TableCell className="text-right font-semibold text-[#0D2137]">
                      {p.rating}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </TabsContent>

        <TabsContent value="monthly" className="mt-6 space-y-6">
          <div className="grid gap-4 sm:grid-cols-3">
            {MONTHLY_STATS.map((stat) => (
              <Card key={stat.label}>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    {stat.label}
                  </CardTitle>
                  {stat.trend === "up" ? (
                    <TrendingUp className="size-4 text-muted-foreground" />
                  ) : (
                    <TrendingDown className="size-4 text-muted-foreground" />
                  )}
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-[#0D2137]">
                    {stat.value}
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {stat.change}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="rounded-lg border bg-white">
            <div className="border-b px-4 py-3">
              <h3 className="text-sm font-semibold text-[#0D2137]">
                Client Health Scores
              </h3>
            </div>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Client</TableHead>
                  <TableHead>Plan</TableHead>
                  <TableHead className="hidden md:table-cell">
                    Health Score
                  </TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="hidden lg:table-cell">
                    Last Delivery
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {CLIENT_HEALTH.map((c, idx) => (
                  <TableRow key={idx}>
                    <TableCell className="font-medium text-[#0D2137]">
                      {c.name}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{c.plan}</Badge>
                    </TableCell>
                    <TableCell className="hidden md:table-cell">
                      <span
                        className={`text-sm font-semibold ${getHealthColor(
                          c.healthScore
                        )}`}
                      >
                        {c.healthScore}
                      </span>
                      <span className="text-sm text-muted-foreground">/100</span>
                    </TableCell>
                    <TableCell>{getHealthBadge(c.status)}</TableCell>
                    <TableCell className="hidden lg:table-cell text-muted-foreground">
                      {c.lastDelivery}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </TabsContent>

        <TabsContent value="financial" className="mt-6 space-y-6">
          <div className="grid gap-4 sm:grid-cols-3">
            {FINANCIAL_STATS.map((stat) => (
              <Card key={stat.label}>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    {stat.label}
                  </CardTitle>
                  {stat.label === "Total MRR" ? (
                    <IndianRupee className="size-4 text-muted-foreground" />
                  ) : stat.label === "Add-on Revenue" ? (
                    <CreditCard className="size-4 text-muted-foreground" />
                  ) : (
                    <AlertCircle className="size-4 text-muted-foreground" />
                  )}
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-[#0D2137]">
                    {stat.value}
                  </div>
                  <p
                    className={`mt-1 text-xs ${
                      stat.label === "Pending Payments"
                        ? "font-medium text-amber-600"
                        : "text-muted-foreground"
                    }`}
                  >
                    {stat.change}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="rounded-lg border bg-white">
            <div className="border-b px-4 py-3">
              <h3 className="text-sm font-semibold text-[#0D2137]">
                Recent High-Value Transactions
              </h3>
            </div>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>TXN ID</TableHead>
                  <TableHead>Client</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead className="hidden md:table-cell">Date</TableHead>
                  <TableHead className="text-right">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {RECENT_TRANSACTIONS.map((txn) => (
                  <TableRow key={txn.id}>
                    <TableCell className="font-mono text-xs">{txn.id}</TableCell>
                    <TableCell className="font-medium text-[#0D2137]">
                      {txn.client}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {txn.type}
                    </TableCell>
                    <TableCell className="font-semibold text-[#0D2137]">
                      {txn.amount}
                    </TableCell>
                    <TableCell className="hidden md:table-cell text-muted-foreground">
                      {txn.date}
                    </TableCell>
                    <TableCell className="text-right">
                      {getStatusBadge(txn.status)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
