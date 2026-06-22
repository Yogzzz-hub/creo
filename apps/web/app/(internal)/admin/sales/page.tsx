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
import { Loader2 } from "lucide-react"
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

function formatCurrency(amount: number) {
  return `₹${amount.toLocaleString("en-IN")}`
}

function formatDate(d: string) {
  return new Date(d).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  })
}

export default function SalesAdminPage() {
  const [pricingRequests, setPricingRequests] = useState<CustomPricingRequest[]>([])
  const [processingId, setProcessingId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchPricing = useCallback(() => {
    setLoading(true)
    setError(null)
    adminFetch<CustomPricingRequest[]>("/api/v1/admin/custom-pricing")
      .then(setPricingRequests)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    fetchPricing()
  }, [fetchPricing])

  async function handleAction(id: string, action: "approve" | "reject") {
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
        {
          description: `${req?.client_name} — ${formatCurrency(req?.custom_price ?? 0)} has been ${action === "approve" ? "approved" : "rejected"}.`,
        }
      )
    } catch (err) {
      toast.error("Action failed", {
        description: err instanceof Error ? err.message : "Unknown error",
      })
    } finally {
      setProcessingId(null)
    }
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-[#0D2137]">Sales Admin</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Custom pricing approvals
        </p>
      </div>

      <div>
        <h2 className="mb-4 text-lg font-semibold text-[#0D2137]">
          Custom Pricing Requests
        </h2>

        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="size-6 animate-spin text-muted-foreground" />
          </div>
        ) : error ? (
          <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            {error}
          </div>
        ) : (
          <div className="rounded-lg border bg-white">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Request ID</TableHead>
                  <TableHead>Client</TableHead>
                  <TableHead className="hidden md:table-cell">
                    Plan
                  </TableHead>
                  <TableHead>Price</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pricingRequests.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="h-24 text-center">
                      <p className="text-sm text-muted-foreground">
                        No pricing requests found.
                      </p>
                    </TableCell>
                  </TableRow>
                ) : (
                  pricingRequests.map((req) => (
                    <TableRow key={req.id}>
                      <TableCell className="font-mono text-xs">{req.id.slice(0, 8)}</TableCell>
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
                        {req.status === "pending" ? (
                          <span className="inline-flex items-center rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-700">
                            Pending
                          </span>
                        ) : req.status === "approved" ? (
                          <span className="inline-flex items-center rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700">
                            Approved
                          </span>
                        ) : (
                          <span className="inline-flex items-center rounded-full border border-red-200 bg-red-50 px-2 py-0.5 text-xs font-medium text-red-700">
                            Rejected
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        {req.status === "pending" ? (
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              disabled={processingId === req.id}
                              onClick={() => handleAction(req.id, "approve")}
                              className="text-emerald-600 hover:bg-emerald-50 hover:text-emerald-700"
                            >
                              {processingId === req.id ? (
                                <Loader2 className="size-3.5 animate-spin" />
                              ) : (
                                "Approve"
                              )}
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              disabled={processingId === req.id}
                              onClick={() => handleAction(req.id, "reject")}
                              className="text-red-600 hover:bg-red-50 hover:text-red-700"
                            >
                              {processingId === req.id ? (
                                <Loader2 className="size-3.5 animate-spin" />
                              ) : (
                                "Reject"
                              )}
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
        )}
      </div>
    </div>
  )
}
