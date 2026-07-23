"use client"

import { useEffect, useState, useCallback } from "react"
import { Button } from "@/components/ui/button"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Puzzle, Loader2, CheckCircle2, Clock, IndianRupee } from "lucide-react"
import { toast } from "sonner"
import { adminFetch } from "@/lib/admin-api"

interface AddOn {
  id: string
  client_name: string
  client_id: string
  addon_type: string
  addon_name: string
  quantity: number
  price: number
  status: string
  requested_at: string
  completed_at: string | null
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
    case "completed":
      return "bg-emerald-50 text-emerald-700 border-emerald-200"
    case "processing":
      return "bg-blue-50 text-blue-700 border-blue-200"
    case "pending":
      return "bg-amber-50 text-amber-700 border-amber-200"
    case "cancelled":
      return "bg-gray-50 text-gray-600 border-gray-200"
    default:
      return "bg-gray-50 text-gray-600 border-gray-200"
  }
}

function formatStatus(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1)
}

export default function AddonsPage() {
  const [addons, setAddons] = useState<AddOn[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchAddons = useCallback(() => {
    setLoading(true)
    setError(null)
    adminFetch<AddOn[]>("/api/v1/admin/addons")
      .then(setAddons)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    fetchAddons()
  }, [fetchAddons])

  async function handleMarkCompleted(id: string) {
    try {
      const updated = await adminFetch<AddOn>(`/api/v1/admin/addons/${id}/complete`, {
        method: "POST",
        body: JSON.stringify({}),
      })
      setAddons((prev) => prev.map((a) => (a.id === id ? updated : a)))
      toast.success("Add-on marked as completed")
    } catch (err) {
      toast.error("Failed to update", { description: err instanceof Error ? err.message : "Unknown error" })
    }
  }

  const stats = {
    total: addons.length,
    pending: addons.filter((a) => a.status === "pending").length,
    processing: addons.filter((a) => a.status === "processing").length,
    revenue: addons
      .filter((a) => a.status === "completed")
      .reduce((sum, a) => sum + a.price * a.quantity, 0),
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[#0D2137]">Add-ons</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Manage purchased add-ons and process requests
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
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Total Orders</CardTitle>
                <Puzzle className="size-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-[#0D2137]">{stats.total}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Pending</CardTitle>
                <Clock className="size-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-amber-600">{stats.pending}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Processing</CardTitle>
                <Clock className="size-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-blue-600">{stats.processing}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Revenue</CardTitle>
                <IndianRupee className="size-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-emerald-600">{formatCurrency(stats.revenue)}</div>
              </CardContent>
            </Card>
          </div>

          <div className="rounded-lg border bg-white">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Client</TableHead>
                  <TableHead>Add-on</TableHead>
                  <TableHead className="hidden md:table-cell">Qty</TableHead>
                  <TableHead>Price</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="hidden lg:table-cell">Requested</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {addons.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="h-24 text-center">
                      <p className="text-sm text-muted-foreground">No add-on orders yet.</p>
                    </TableCell>
                  </TableRow>
                ) : (
                  addons.map((addon) => (
                    <TableRow key={addon.id}>
                      <TableCell className="font-medium text-[#0D2137]">
                        {addon.client_name}
                      </TableCell>
                      <TableCell>
                        <div>
                          <p className="text-sm font-medium text-[#0D2137]">{addon.addon_name}</p>
                          <p className="text-xs text-muted-foreground">{addon.addon_type}</p>
                        </div>
                      </TableCell>
                      <TableCell className="hidden md:table-cell text-muted-foreground">
                        {addon.quantity}
                      </TableCell>
                      <TableCell className="font-semibold text-[#0D2137]">
                        {formatCurrency(addon.price * addon.quantity)}
                      </TableCell>
                      <TableCell>
                        <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium ${getStatusColor(addon.status)}`}>
                          {formatStatus(addon.status)}
                        </span>
                      </TableCell>
                      <TableCell className="hidden lg:table-cell text-muted-foreground">
                        {formatDate(addon.requested_at)}
                      </TableCell>
                      <TableCell className="text-right">
                        {(addon.status === "pending" || addon.status === "processing") && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleMarkCompleted(addon.id)}
                            className="text-emerald-600 hover:bg-emerald-50 hover:text-emerald-700"
                          >
                            <CheckCircle2 className="size-3.5" />
                            Complete
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </>
      )}
    </div>
  )
}
