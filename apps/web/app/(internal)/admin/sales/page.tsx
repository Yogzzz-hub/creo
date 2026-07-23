"use client"

import { useEffect, useState, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { IndianRupee, TrendingUp, Users, Loader2, Pencil } from "lucide-react"
import { toast } from "sonner"
import { adminFetch } from "@/lib/admin-api"

interface CustomPricingRequest {
  id: string
  client_name: string
  business_name: string | null
  plan_name: string | null
  custom_price: number
  status: string
  reason: string | null
  created_at: string
}

interface ClientSubscription {
  user_id: string
  client_name: string
  business_name: string | null
  plan_name: string | null
  monthly_price: number
  status: string
  payment_status: string
  next_billing_date: string | null
}

interface Plan {
  id: string
  name: string
  display_name: string
  monthly_price: number
  is_active: boolean
}

function formatCurrency(amount: number) {
  return `₹${amount.toLocaleString("en-IN")}`
}

function formatDate(d: string | null) {
  if (!d) return "—"
  return new Date(d).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  })
}

function getStatusColor(status: string) {
  switch (status) {
    case "active":
      return "bg-emerald-50 text-emerald-700 border-emerald-200"
    case "pending":
      return "bg-amber-50 text-amber-700 border-amber-200"
    case "approved":
      return "bg-emerald-50 text-emerald-700 border-emerald-200"
    case "rejected":
      return "bg-red-50 text-red-700 border-red-200"
    case "lapsed":
      return "bg-red-50 text-red-700 border-red-200"
    default:
      return "bg-gray-50 text-gray-600 border-gray-200"
  }
}

function formatStatus(s: string) {
  return s.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())
}

export default function SalesAdminPage() {
  const [pricingRequests, setPricingRequests] = useState<CustomPricingRequest[]>([])
  const [subscriptions, setSubscriptions] = useState<ClientSubscription[]>([])
  const [plans, setPlans] = useState<Plan[]>([])
  const [processingId, setProcessingId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState("")
  const [modifyDialogOpen, setModifyDialogOpen] = useState(false)
  const [selectedSub, setSelectedSub] = useState<ClientSubscription | null>(null)
  const [newPlan, setNewPlan] = useState("")
  const [newPrice, setNewPrice] = useState("")
  const [modifying, setModifying] = useState(false)

  const fetchData = useCallback(() => {
    setLoading(true)
    setError(null)
    Promise.allSettled([
      adminFetch<CustomPricingRequest[]>("/api/v1/admin/custom-pricing"),
      adminFetch<ClientSubscription[]>("/api/v1/admin/subscriptions"),
      adminFetch<Plan[]>("/api/v1/admin/plans"),
    ])
      .then(([pricingRes, subsRes, plansRes]) => {
        if (pricingRes.status === "fulfilled") setPricingRequests(pricingRes.value)
        if (subsRes.status === "fulfilled") setSubscriptions(subsRes.value)
        if (plansRes.status === "fulfilled") setPlans(plansRes.value)

        const failures = [pricingRes, subsRes, plansRes].filter((r) => r.status === "rejected")
        if (failures.length === 3) setError("Failed to load sales data")
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  async function handlePricingAction(id: string, action: "approve" | "reject") {
    setProcessingId(id)
    try {
      await adminFetch(`/api/v1/admin/custom-pricing/${id}/${action}`, {
        method: "POST",
        body: JSON.stringify({}),
      })
      setPricingRequests((prev) =>
        prev.map((r) => (r.id === id ? { ...r, status: action === "approve" ? "approved" : "rejected" } : r))
      )
      const req = pricingRequests.find((r) => r.id === id)
      toast.success(
        action === "approve" ? "Pricing approved" : "Pricing rejected",
        { description: `${req?.client_name} — ${formatCurrency(req?.custom_price ?? 0)}` }
      )
    } catch (err) {
      toast.error("Action failed", { description: err instanceof Error ? err.message : "Unknown error" })
    } finally {
      setProcessingId(null)
    }
  }

  function openModifyDialog(sub: ClientSubscription) {
    setSelectedSub(sub)
    setNewPlan(sub.plan_name ?? "")
    setNewPrice(String(sub.monthly_price))
    setModifyDialogOpen(true)
  }

  async function handleModifySubscription() {
    if (!selectedSub) return
    setModifying(true)
    try {
      await adminFetch(`/api/v1/admin/subscriptions/${selectedSub.user_id}`, {
        method: "PATCH",
        body: JSON.stringify({
          plan_name: newPlan,
          monthly_price: parseInt(newPrice, 10),
        }),
      })
      setSubscriptions((prev) =>
        prev.map((s) =>
          s.user_id === selectedSub.user_id
            ? { ...s, plan_name: newPlan, monthly_price: parseInt(newPrice, 10) }
            : s
        )
      )
      toast.success("Subscription updated")
      setModifyDialogOpen(false)
    } catch (err) {
      toast.error("Failed to update", { description: err instanceof Error ? err.message : "Unknown error" })
    } finally {
      setModifying(false)
    }
  }

  const filteredSubs = subscriptions.filter((s) => {
    if (!search) return true
    const q = search.toLowerCase()
    return (
      s.client_name.toLowerCase().includes(q) ||
      (s.business_name ?? "").toLowerCase().includes(q)
    )
  })

  const totalMRR = subscriptions
    .filter((s) => s.status === "active")
    .reduce((sum, s) => sum + s.monthly_price, 0)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[#0D2137]">Sales & Pricing</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Manage pricing requests, subscriptions, and payment information
        </p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="size-6 animate-spin text-muted-foreground" />
        </div>
      ) : error ? (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {error}
        </div>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-3">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Monthly Revenue</CardTitle>
                <IndianRupee className="size-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-[#0D2137]">{formatCurrency(totalMRR)}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Active Subscriptions</CardTitle>
                <Users className="size-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-[#0D2137]">
                  {subscriptions.filter((s) => s.status === "active").length}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Pending Requests</CardTitle>
                <TrendingUp className="size-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-[#0D2137]">
                  {pricingRequests.filter((r) => r.status === "pending").length}
                </div>
              </CardContent>
            </Card>
          </div>

          <Tabs defaultValue="subscriptions">
            <TabsList variant="line">
              <TabsTrigger value="subscriptions">Subscriptions</TabsTrigger>
              <TabsTrigger value="pricing">Custom Pricing</TabsTrigger>
            </TabsList>

            <TabsContent value="subscriptions" className="mt-6 space-y-4">
              <div className="flex items-center gap-3">
                <div className="relative flex-1">
                  <Input
                    placeholder="Search clients..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="h-9"
                  />
                </div>
              </div>

              <div className="rounded-lg border bg-white">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Client</TableHead>
                      <TableHead>Plan</TableHead>
                      <TableHead className="hidden md:table-cell">Price</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="hidden md:table-cell">Next Billing</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredSubs.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="h-24 text-center">
                          <p className="text-sm text-muted-foreground">No subscriptions found.</p>
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredSubs.map((sub) => (
                        <TableRow key={sub.user_id}>
                          <TableCell>
                            <div>
                              <p className="font-medium text-[#0D2137]">{sub.client_name}</p>
                              {sub.business_name && (
                                <p className="text-xs text-muted-foreground">{sub.business_name}</p>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="font-medium text-[#0D2137]">
                            {sub.plan_name ? sub.plan_name.charAt(0).toUpperCase() + sub.plan_name.slice(1) : "—"}
                          </TableCell>
                          <TableCell className="hidden md:table-cell font-semibold text-[#0D2137]">
                            {formatCurrency(sub.monthly_price)}
                          </TableCell>
                          <TableCell>
                            <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium ${getStatusColor(sub.status)}`}>
                              {formatStatus(sub.status)}
                            </span>
                          </TableCell>
                          <TableCell className="hidden md:table-cell text-muted-foreground">
                            {formatDate(sub.next_billing_date)}
                          </TableCell>
                          <TableCell className="text-right">
                            <Button variant="ghost" size="sm" onClick={() => openModifyDialog(sub)}>
                              <Pencil className="size-3.5" />
                              Modify
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </TabsContent>

            <TabsContent value="pricing" className="mt-6">
              <div className="rounded-lg border bg-white">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Client</TableHead>
                      <TableHead className="hidden md:table-cell">Plan</TableHead>
                      <TableHead>Custom Price</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {pricingRequests.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} className="h-24 text-center">
                          <p className="text-sm text-muted-foreground">No pricing requests found.</p>
                        </TableCell>
                      </TableRow>
                    ) : (
                      pricingRequests.map((req) => (
                        <TableRow key={req.id}>
                          <TableCell className="font-medium text-[#0D2137]">
                            {req.client_name}
                          </TableCell>
                          <TableCell className="hidden md:table-cell text-muted-foreground">
                            {req.plan_name ?? "—"}
                          </TableCell>
                          <TableCell className="font-semibold text-[#0D2137]">
                            {formatCurrency(req.custom_price)}
                          </TableCell>
                          <TableCell>
                            <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium ${getStatusColor(req.status)}`}>
                              {formatStatus(req.status)}
                            </span>
                          </TableCell>
                          <TableCell className="text-right">
                            {req.status === "pending" ? (
                              <div className="flex items-center justify-end gap-1">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  disabled={processingId === req.id}
                                  onClick={() => handlePricingAction(req.id, "approve")}
                                  className="text-emerald-600 hover:bg-emerald-50 hover:text-emerald-700"
                                >
                                  {processingId === req.id ? <Loader2 className="size-3.5 animate-spin" /> : "Approve"}
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  disabled={processingId === req.id}
                                  onClick={() => handlePricingAction(req.id, "reject")}
                                  className="text-red-600 hover:bg-red-50 hover:text-red-700"
                                >
                                  {processingId === req.id ? <Loader2 className="size-3.5 animate-spin" /> : "Reject"}
                                </Button>
                              </div>
                            ) : (
                              <span className="text-xs text-muted-foreground">—</span>
                            )}
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </TabsContent>
          </Tabs>
        </>
      )}

      <Dialog open={modifyDialogOpen} onOpenChange={setModifyDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Modify Subscription</DialogTitle>
            <DialogDescription>
              Update plan and pricing for {selectedSub?.client_name}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Plan</Label>
              <Select value={newPlan} onValueChange={(v) => setNewPlan(v ?? "")}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select plan" />
                </SelectTrigger>
                <SelectContent>
                  {plans.map((p) => (
                    <SelectItem key={p.id} value={p.name}>
                      {p.display_name} — {formatCurrency(p.monthly_price)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Monthly Price (₹)</Label>
              <Input
                type="number"
                value={newPrice}
                onChange={(e) => setNewPrice(e.target.value)}
                min={0}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setModifyDialogOpen(false)} disabled={modifying}>Cancel</Button>
            <Button onClick={handleModifySubscription} disabled={modifying}>
              {modifying && <Loader2 className="mr-2 size-4 animate-spin" />}
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
