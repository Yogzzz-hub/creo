"use client"

import { useEffect, useState, useCallback } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
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
import {
  Search,
  LifeBuoy,
  Loader2,
  MessageSquare,
  Clock,
  CheckCircle2,
  AlertTriangle,
  ArrowUpRight,
} from "lucide-react"
import { toast } from "sonner"
import { adminFetch } from "@/lib/admin-api"

type TicketStatus = "open" | "in_progress" | "awaiting_client" | "resolved" | "escalated"

interface Ticket {
  id: string
  subject: string
  ticket_type: string
  status: TicketStatus
  client_name: string
  client_id: string
  assigned_to: string | null
  assigned_name: string | null
  message_count: number
  created_at: string
  updated_at: string
}

interface TeamMember {
  team_member_id: string
  full_name: string
}

const STATUS_CONFIG: Record<TicketStatus, { label: string; className: string; icon: typeof Clock }> = {
  open: { label: "Open", className: "bg-emerald-100 text-emerald-700 border-emerald-200", icon: Clock },
  in_progress: { label: "In Progress", className: "bg-blue-100 text-blue-700 border-blue-200", icon: Clock },
  awaiting_client: { label: "Awaiting Client", className: "bg-amber-100 text-amber-700 border-amber-200", icon: Clock },
  resolved: { label: "Resolved", className: "bg-gray-100 text-gray-600 border-gray-200", icon: CheckCircle2 },
  escalated: { label: "Escalated", className: "bg-red-100 text-red-700 border-red-200", icon: AlertTriangle },
}

function formatDateTime(d: string) {
  return new Date(d).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  })
}

function formatTicketType(t: string) {
  return t.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())
}

export default function SupportTicketsPage() {
  const [tickets, setTickets] = useState<Ticket[]>([])
  const [team, setTeam] = useState<TeamMember[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [assignDialogOpen, setAssignDialogOpen] = useState(false)
  const [assigning, setAssigning] = useState(false)
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null)
  const [selectedAssignee, setSelectedAssignee] = useState("")

  const fetchData = useCallback(() => {
    setLoading(true)
    setError(null)
    Promise.allSettled([
      adminFetch<Ticket[]>("/api/v1/admin/support/tickets"),
      adminFetch<TeamMember[]>("/api/v1/admin/team"),
    ])
      .then(([ticketsRes, teamRes]) => {
        if (ticketsRes.status === "fulfilled") setTickets(ticketsRes.value)
        else setError(ticketsRes.reason?.message ?? "Failed to load tickets")
        if (teamRes.status === "fulfilled") setTeam(teamRes.value)
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const filtered = tickets.filter((t) => {
    const matchesSearch =
      search === "" ||
      t.subject.toLowerCase().includes(search.toLowerCase()) ||
      t.client_name.toLowerCase().includes(search.toLowerCase())
    const matchesStatus = statusFilter === "all" || t.status === statusFilter
    return matchesSearch && matchesStatus
  })

  async function handleStatusChange(id: string, newStatus: TicketStatus) {
    try {
      const updated = await adminFetch<Ticket>(`/api/v1/admin/support/tickets/${id}/status`, {
        method: "PATCH",
        body: JSON.stringify({ status: newStatus }),
      })
      setTickets((prev) => prev.map((t) => (t.id === id ? updated : t)))
      toast.success(`Ticket marked as ${STATUS_CONFIG[newStatus].label}`)
    } catch (err) {
      toast.error("Failed to update ticket", {
        description: err instanceof Error ? err.message : "Unknown error",
      })
    }
  }

  function openAssignDialog(ticket: Ticket) {
    setSelectedTicket(ticket)
    setSelectedAssignee(ticket.assigned_to ?? "")
    setAssignDialogOpen(true)
  }

  async function handleAssign() {
    if (!selectedTicket) return
    setAssigning(true)
    try {
      const updated = await adminFetch<Ticket>(`/api/v1/admin/support/tickets/${selectedTicket.id}/assign`, {
        method: "PATCH",
        body: JSON.stringify({ assigned_to: selectedAssignee || null }),
      })
      setTickets((prev) => prev.map((t) => (t.id === selectedTicket.id ? updated : t)))
      toast.success("Ticket assigned successfully")
      setAssignDialogOpen(false)
    } catch (err) {
      toast.error("Failed to assign ticket", {
        description: err instanceof Error ? err.message : "Unknown error",
      })
    } finally {
      setAssigning(false)
    }
  }

  const stats = {
    total: tickets.length,
    open: tickets.filter((t) => t.status === "open").length,
    inProgress: tickets.filter((t) => t.status === "in_progress").length,
    escalated: tickets.filter((t) => t.status === "escalated").length,
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[#0D2137]">Support Tickets</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Manage and respond to client support requests
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { label: "Total Tickets", value: stats.total, color: "text-[#0D2137]" },
          { label: "Open", value: stats.open, color: "text-emerald-600" },
          { label: "In Progress", value: stats.inProgress, color: "text-blue-600" },
          { label: "Escalated", value: stats.escalated, color: "text-red-600", alert: stats.escalated > 0 },
        ].map((stat) => (
          <div key={stat.label} className="rounded-lg border bg-white p-4">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-muted-foreground">{stat.label}</p>
              {stat.alert && <AlertTriangle className="size-4 text-red-500" />}
            </div>
            <p className={`mt-1 text-2xl font-bold ${stat.color}`}>{stat.value}</p>
          </div>
        ))}
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search by subject or client..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-9 pl-8"
          />
        </div>
        <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v ?? "all")}>
          <SelectTrigger className="w-full sm:w-[180px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="open">Open</SelectItem>
            <SelectItem value="in_progress">In Progress</SelectItem>
            <SelectItem value="awaiting_client">Awaiting Client</SelectItem>
            <SelectItem value="resolved">Resolved</SelectItem>
            <SelectItem value="escalated">Escalated</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="size-6 animate-spin text-muted-foreground" />
        </div>
      ) : error ? (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          Failed to load tickets: {error}
        </div>
      ) : (
        <div className="rounded-lg border bg-white">
          {filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="flex size-12 items-center justify-center rounded-full bg-muted">
                <LifeBuoy className="size-6 text-muted-foreground" />
              </div>
              <h3 className="mt-4 text-sm font-semibold text-[#0D2137]">
                No tickets found
              </h3>
              <p className="mt-1 max-w-sm text-sm text-muted-foreground">
                {search || statusFilter !== "all"
                  ? "Try adjusting your search or filters."
                  : "No support tickets yet."}
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Subject</TableHead>
                  <TableHead>Client</TableHead>
                  <TableHead className="hidden md:table-cell">Type</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="hidden md:table-cell">Assigned To</TableHead>
                  <TableHead className="hidden lg:table-cell">Updated</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((ticket) => {
                  const statusCfg = STATUS_CONFIG[ticket.status]
                  const StatusIcon = statusCfg.icon
                  return (
                    <TableRow key={ticket.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <StatusIcon className="size-4 shrink-0 text-muted-foreground" />
                          <div>
                            <p className="font-medium text-[#0D2137]">{ticket.subject}</p>
                            <p className="text-xs text-muted-foreground">
                              {ticket.id.slice(0, 8)} · {ticket.message_count} message{ticket.message_count !== 1 ? "s" : ""}
                            </p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {ticket.client_name}
                      </TableCell>
                      <TableCell className="hidden md:table-cell text-muted-foreground">
                        {formatTicketType(ticket.ticket_type)}
                      </TableCell>
                      <TableCell>
                        <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium ${statusCfg.className}`}>
                          {statusCfg.label}
                        </span>
                      </TableCell>
                      <TableCell className="hidden md:table-cell">
                        <button
                          onClick={() => openAssignDialog(ticket)}
                          className="text-sm text-[#2B7BC4] hover:underline"
                        >
                          {ticket.assigned_name ?? "Assign"}
                        </button>
                      </TableCell>
                      <TableCell className="hidden lg:table-cell text-muted-foreground">
                        {formatDateTime(ticket.updated_at)}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Link
                            href={`/admin/support/${ticket.id}`}
                            className="inline-flex items-center gap-1 text-sm font-medium text-[#2B7BC4] hover:underline"
                          >
                            View
                            <ArrowUpRight className="size-3" />
                          </Link>
                          {ticket.status !== "resolved" && (
                            <Select
                              value={ticket.status}
                              onValueChange={(v) => v && handleStatusChange(ticket.id, v as TicketStatus)}
                            >
                              <SelectTrigger className="h-7 w-auto border-0 bg-transparent text-xs font-medium text-muted-foreground hover:bg-muted">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="open">Open</SelectItem>
                                <SelectItem value="in_progress">In Progress</SelectItem>
                                <SelectItem value="awaiting_client">Awaiting Client</SelectItem>
                                <SelectItem value="resolved">Resolved</SelectItem>
                                <SelectItem value="escalated">Escalated</SelectItem>
                              </SelectContent>
                            </Select>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          )}
        </div>
      )}

      <Dialog open={assignDialogOpen} onOpenChange={setAssignDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Assign Ticket</DialogTitle>
            <DialogDescription>
              {selectedTicket ? `Assign "${selectedTicket.subject}" to a team member` : "Select a team member"}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Assign To</Label>
              <Select value={selectedAssignee} onValueChange={(v) => setSelectedAssignee(v ?? "")}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select team member" />
                </SelectTrigger>
                <SelectContent>
                  {team.map((m) => (
                    <SelectItem key={m.team_member_id} value={m.team_member_id}>
                      {m.full_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setAssignDialogOpen(false)} disabled={assigning}>
              Cancel
            </Button>
            <Button onClick={handleAssign} disabled={assigning}>
              {assigning && <Loader2 className="mr-2 size-4 animate-spin" />}
              Assign
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
