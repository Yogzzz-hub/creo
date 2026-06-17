"use client"

import { useState, useCallback } from "react"
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
import { Badge } from "@/components/ui/badge"
import { Loader2 } from "lucide-react"
import { toast } from "sonner"

interface LeaveRequest {
  id: string
  employeeName: string
  department: string
  startDate: string
  endDate: string
  reason: string
  status: "Pending" | "Approved" | "Rejected"
}

const INITIAL_LEAVE_REQUESTS: LeaveRequest[] = [
  {
    id: "LR-024",
    employeeName: "Priya Sharma",
    department: "Graphics",
    startDate: "Jun 23, 2026",
    endDate: "Jun 25, 2026",
    reason: "Family function out of town",
    status: "Pending",
  },
  {
    id: "LR-023",
    employeeName: "Rahul Mehta",
    department: "Video",
    startDate: "Jun 28, 2026",
    endDate: "Jun 30, 2026",
    reason: "Personal medical appointment",
    status: "Pending",
  },
  {
    id: "LR-022",
    employeeName: "Ananya Kumar",
    department: "Content",
    startDate: "Jun 20, 2026",
    endDate: "Jun 20, 2026",
    reason: "Half day — bank work",
    status: "Pending",
  },
  {
    id: "LR-021",
    employeeName: "Neha Gupta",
    department: "Graphics",
    startDate: "Jun 16, 2026",
    endDate: "Jun 18, 2026",
    reason: "Wedding anniversary trip",
    status: "Approved",
  },
  {
    id: "LR-020",
    employeeName: "Vikram Desai",
    department: "Video",
    startDate: "Jun 14, 2026",
    endDate: "Jun 14, 2026",
    reason: "Flight delay — travel day",
    status: "Approved",
  },
  {
    id: "LR-019",
    employeeName: "Arjun Reddy",
    department: "Sales",
    startDate: "Jun 10, 2026",
    endDate: "Jun 12, 2026",
    reason: "Client visit to Bangalore",
    status: "Approved",
  },
  {
    id: "LR-018",
    employeeName: "Kavitha Nair",
    department: "Content",
    startDate: "Jun 9, 2026",
    endDate: "Jun 9, 2026",
    reason: "House maintenance — plumber visit",
    status: "Rejected",
  },
  {
    id: "LR-017",
    employeeName: "Sanjay Joshi",
    department: "Admin",
    startDate: "Jun 5, 2026",
    endDate: "Jun 7, 2026",
    reason: "Personal errands — extended weekend",
    status: "Rejected",
  },
]

function getStatusBadge(status: LeaveRequest["status"]) {
  switch (status) {
    case "Pending":
      return (
        <span className="inline-flex items-center rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-700">
          Pending
        </span>
      )
    case "Approved":
      return (
        <span className="inline-flex items-center rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700">
          Approved
        </span>
      )
    case "Rejected":
      return (
        <span className="inline-flex items-center rounded-full border border-red-200 bg-red-50 px-2 py-0.5 text-xs font-medium text-red-700">
          Rejected
        </span>
      )
  }
}

export default function LeaveApprovalsPage() {
  const [statusFilter, setStatusFilter] = useState("all")
  const [leaveRequests, setLeaveRequests] = useState(INITIAL_LEAVE_REQUESTS)
  const [processingId, setProcessingId] = useState<string | null>(null)

  const filtered = leaveRequests.filter((lr) => {
    if (statusFilter === "all") return true
    return lr.status === statusFilter
  })

  const handleAction = useCallback(
    (id: string, newStatus: "Approved" | "Rejected") => {
      setProcessingId(id)
      setTimeout(() => {
        setLeaveRequests((prev) =>
          prev.map((lr) => (lr.id === id ? { ...lr, status: newStatus } : lr))
        )
        const request = leaveRequests.find((lr) => lr.id === id)
        setProcessingId(null)
        toast.success(
          newStatus === "Approved"
            ? "Leave request approved"
            : "Leave request rejected",
          {
            description: `${request?.employeeName}'s leave has been ${newStatus.toLowerCase()}.`,
          }
        )
      }, 500)
    },
    [leaveRequests]
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
            <SelectItem value="Pending">Pending</SelectItem>
            <SelectItem value="Approved">Approved</SelectItem>
            <SelectItem value="Rejected">Rejected</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="rounded-lg border bg-white">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Employee</TableHead>
              <TableHead className="hidden md:table-cell">
                Department
              </TableHead>
              <TableHead>Dates</TableHead>
              <TableHead className="hidden lg:table-cell">Reason</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="h-24 text-center">
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
                        {lr.employeeName}
                      </p>
                      <p className="text-xs text-muted-foreground">{lr.id}</p>
                    </div>
                  </TableCell>
                  <TableCell className="hidden md:table-cell">
                    <span className="inline-flex items-center rounded-full border border-border bg-muted px-2 py-0.5 text-xs font-medium">
                      {lr.department}
                    </span>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {lr.startDate}
                    {lr.startDate !== lr.endDate && (
                      <>
                        <br />
                        to {lr.endDate}
                      </>
                    )}
                  </TableCell>
                  <TableCell className="hidden lg:table-cell max-w-[220px] truncate text-sm text-muted-foreground">
                    {lr.reason}
                  </TableCell>
                  <TableCell>{getStatusBadge(lr.status)}</TableCell>
                  <TableCell className="text-right">
                    {lr.status === "Pending" ? (
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          disabled={processingId === lr.id}
                          onClick={() => handleAction(lr.id, "Approved")}
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
                          onClick={() => handleAction(lr.id, "Rejected")}
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
    </div>
  )
}
