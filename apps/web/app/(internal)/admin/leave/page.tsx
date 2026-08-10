"use client"

import { useEffect, useState, useCallback } from "react"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
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

interface LeaveRequest {
  id: string
  team_member_id: string
  employee_name?: string
  department?: string
  start_date: string
  end_date: string
  reason: string
  status: "pending" | "approved" | "rejected"
  reviewed_by?: string | null
  reviewed_at?: string | null
  created_at: string
  updated_at?: string | null
}

function getStatusBadge(status: LeaveRequest["status"]) {
  switch (status) {
    case "pending":
      return (
        <span className="inline-flex items-center rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-700">
          Pending
        </span>
      )
    case "approved":
      return (
        <span className="inline-flex items-center rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700">
          Approved
        </span>
      )
    case "rejected":
      return (
        <span className="inline-flex items-center rounded-full border border-red-200 bg-red-50 px-2 py-0.5 text-xs font-medium text-red-700">
          Rejected
        </span>
      )
  }
}

function formatDate(d: string) {
  return new Date(d).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  })
}

export default function LeaveApprovalsPage() {
  const [statusFilter, setStatusFilter] = useState("all")
  const [leaveRequests, setLeaveRequests] = useState<LeaveRequest[]>([])
  const [processingId, setProcessingId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchLeave = useCallback(() => {
    setLoading(true)
    setError(null)
    adminFetch<LeaveRequest[]>("/api/v1/admin/leave")
      .then(setLeaveRequests)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    fetchLeave()
  }, [fetchLeave])

  const filtered = leaveRequests.filter((lr) => {
    if (statusFilter === "all") return true
    return lr.status === statusFilter
  })

  const handleAction = useCallback(
    async (id: string, action: "approve" | "reject") => {
      setProcessingId(id)
      try {
        await adminFetch(`/api/v1/admin/leave/${id}/${action}`, {
          method: "POST",
        })
        setLeaveRequests((prev) =>
          prev.map((lr) =>
            lr.id === id
              ? { ...lr, status: action === "approve" ? "approved" : "rejected" }
              : lr
          )
        )
        toast.success(
          action === "approve" ? "Leave request approved" : "Leave request rejected",
          {
            description: `Leave request ${id.slice(0, 8)} has been ${action === "approve" ? "approved" : "rejected"}.`,
          }
        )
      } catch (err) {
        toast.error("Action failed", {
          description: err instanceof Error ? err.message : "Unknown error",
        })
      } finally {
        setProcessingId(null)
      }
    },
    []
  )

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#0D2137]">
            Leave Approvals
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Review and manage team leave requests
          </p>
        </div>
        <Select
          value={statusFilter}
          onValueChange={(v) => setStatusFilter(v ?? "all")}
        >
          <SelectTrigger className="w-[140px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="approved">Approved</SelectItem>
            <SelectItem value="rejected">Rejected</SelectItem>
          </SelectContent>
        </Select>
      </div>

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
                <TableHead>Team Member</TableHead>
                <TableHead>Dates</TableHead>
                <TableHead className="hidden lg:table-cell">Reason</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="h-24 text-center">
                    <p className="text-sm text-muted-foreground">
                      No leave requests found.
                    </p>
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((lr) => (
                  <TableRow key={lr.id}>
                    <TableCell>
                      <div>
                        <p className="font-medium text-[#0D2137]">
                          {lr.employee_name || lr.team_member_id.slice(0, 8)}
                        </p>
                        <p className="text-xs text-muted-foreground capitalize">
                          {lr.department ? lr.department.replace("_", " ") : lr.id.slice(0, 8)}
                        </p>
                      </div>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {formatDate(lr.start_date)}
                      {lr.start_date !== lr.end_date && (
                        <>
                          <br />
                          to {formatDate(lr.end_date)}
                        </>
                      )}
                    </TableCell>
                    <TableCell className="hidden lg:table-cell max-w-[220px] truncate text-sm text-muted-foreground">
                      {lr.reason}
                    </TableCell>
                    <TableCell>{getStatusBadge(lr.status)}</TableCell>
                    <TableCell className="text-right">
                      {lr.status === "pending" ? (
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            disabled={processingId === lr.id}
                            onClick={() => handleAction(lr.id, "approve")}
                            className="text-emerald-600 hover:bg-emerald-50 hover:text-emerald-700"
                          >
                            {processingId === lr.id ? (
                              <Loader2 className="size-3.5 animate-spin" />
                            ) : (
                              "Approve"
                            )}
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            disabled={processingId === lr.id}
                            onClick={() => handleAction(lr.id, "reject")}
                            className="text-red-600 hover:bg-red-50 hover:text-red-700"
                          >
                            {processingId === lr.id ? (
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
  )
}
