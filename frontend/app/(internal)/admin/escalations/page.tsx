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
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import { AlertTriangle, Loader2 } from "lucide-react"
import { toast } from "sonner"
import { adminFetch } from "@/lib/admin-api"

interface Escalation {
  id: string
  type: string
  severity: string
  client_id: string
  task_id: string
  ticket_id: string | null
  assigned_to: string | null
  description: string
  status: string
  resolved_at: string | null
  resolved_by: string | null
  created_at: string
  updated_at: string | null
}

function getSeverityLabel(severity: string) {
  switch (severity.toLowerCase()) {
    case "critical":
      return "Critical"
    case "high":
      return "High"
    case "medium":
      return "Medium"
    default:
      return "Low"
  }
}

function getSeverityColor(severity: string) {
  const label = getSeverityLabel(severity)
  switch (label) {
    case "Critical":
      return "bg-red-100 text-red-800 border-red-200"
    case "High":
      return "bg-orange-100 text-orange-800 border-orange-200"
    case "Medium":
      return "bg-amber-100 text-amber-800 border-amber-200"
    case "Low":
      return "bg-blue-100 text-blue-800 border-blue-200"
    default:
      return ""
  }
}

function getStatusColor(status: string) {
  switch (status) {
    case "open":
      return "bg-red-50 text-red-700 border-red-200"
    case "in_progress":
      return "bg-amber-50 text-amber-700 border-amber-200"
    case "resolved":
      return "bg-emerald-50 text-emerald-700 border-emerald-200"
    default:
      return ""
  }
}

function formatStatus(status: string) {
  return status.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())
}

function formatDate(d: string) {
  return new Date(d).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  })
}

export default function EscalationsPage() {
  const [severityFilter, setSeverityFilter] = useState("all")
  const [escalations, setEscalations] = useState<Escalation[]>([])
  const [resolveDialogOpen, setResolveDialogOpen] = useState(false)
  const [selectedEscalation, setSelectedEscalation] =
    useState<Escalation | null>(null)
  const [resolutionNotes, setResolutionNotes] = useState("")
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [resolving, setResolving] = useState(false)

  const fetchEscalations = useCallback(() => {
    setLoading(true)
    setError(null)
    adminFetch<Escalation[]>("/api/v1/admin/escalations")
      .then(setEscalations)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    fetchEscalations()
  }, [fetchEscalations])

  const filteredEscalations = escalations.filter((esc) => {
    if (severityFilter === "all") return true
    return getSeverityLabel(esc.severity) === severityFilter
  })

  function handleResolveClick(esc: Escalation) {
    setSelectedEscalation(esc)
    setResolutionNotes("")
    setResolveDialogOpen(true)
  }

  async function handleResolveSubmit() {
    if (!resolutionNotes.trim() || !selectedEscalation) return
    setResolving(true)
    try {
      await adminFetch(
        `/api/v1/admin/escalations/${selectedEscalation.id}/resolve`,
        {
          method: "PATCH",
          body: JSON.stringify({ resolution_notes: resolutionNotes }),
        }
      )
      setEscalations((prev) =>
        prev.map((esc) =>
          esc.id === selectedEscalation.id
            ?             { ...esc, status: "resolved" }
            : esc
        )
      )
      toast.success("Escalation resolved", {
        description: `${selectedEscalation.id.slice(0, 8)} has been marked as resolved.`,
      })
      setResolveDialogOpen(false)
      setSelectedEscalation(null)
      setResolutionNotes("")
    } catch (err) {
      toast.error("Failed to resolve", {
        description: err instanceof Error ? err.message : "Unknown error",
      })
    } finally {
      setResolving(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-muted-foreground">
            Track and resolve client escalations and SLA breaches
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <AlertTriangle className="size-4 text-amber-500" />
            <span>
              <span className="font-semibold text-red-600">
                {escalations.filter((e) => e.status === "open").length}
              </span>{" "}
              open escalations
            </span>
          </div>
          <Select
            value={severityFilter}
            onValueChange={(v) => setSeverityFilter(v ?? "all")}
          >
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="Severity" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Severity</SelectItem>
              <SelectItem value="Critical">Critical</SelectItem>
              <SelectItem value="High">High</SelectItem>
              <SelectItem value="Medium">Medium</SelectItem>
              <SelectItem value="Low">Low</SelectItem>
            </SelectContent>
          </Select>
        </div>
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
                <TableHead>ID</TableHead>
                <TableHead>Client</TableHead>
                <TableHead>Severity</TableHead>
                <TableHead className="hidden lg:table-cell">Trigger</TableHead>
                <TableHead className="hidden md:table-cell">
                  Assigned To
                </TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredEscalations.map((esc) => (
                <TableRow key={esc.id}>
                  <TableCell className="font-mono text-xs">{esc.id.slice(0, 8)}</TableCell>
                  <TableCell className="font-medium">{esc.client_id.slice(0, 8)}</TableCell>
                  <TableCell>
                    <span
                      className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium ${getSeverityColor(
                        esc.severity
                      )}`}
                    >
                      {getSeverityLabel(esc.severity)}
                    </span>
                  </TableCell>
                  <TableCell className="hidden lg:table-cell max-w-[280px] truncate text-muted-foreground">
                    {esc.description}
                  </TableCell>
                  <TableCell className="hidden md:table-cell text-muted-foreground">
                    {esc.assigned_to?.slice(0, 8) ?? "—"}
                  </TableCell>
                  <TableCell>
                    <span
                      className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium ${getStatusColor(
                        esc.status
                      )}`}
                    >
                      {formatStatus(esc.status)}
                    </span>
                  </TableCell>
                  <TableCell className="text-right">
                    {esc.status === "open" || esc.status === "in_progress" ? (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleResolveClick(esc)}
                        className="text-[#2B7BC4] hover:text-[#2B7BC4]"
                      >
                        Resolve
                      </Button>
                    ) : (
                      <span className="text-xs text-muted-foreground">—</span>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <Dialog open={resolveDialogOpen} onOpenChange={setResolveDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Resolve Escalation</DialogTitle>
            <DialogDescription>
              Log the resolution notes for{" "}
              <span className="font-semibold text-foreground">
                {selectedEscalation?.id.slice(0, 8)}
              </span>
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-2">
            <Label htmlFor="resolution-notes">Resolution Notes</Label>
            <Textarea
              id="resolution-notes"
              placeholder="Describe how this escalation was resolved..."
              value={resolutionNotes}
              onChange={(e) => setResolutionNotes(e.target.value)}
              rows={4}
            />
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setResolveDialogOpen(false)}
              disabled={resolving}
            >
              Cancel
            </Button>
            <Button
              onClick={handleResolveSubmit}
              disabled={!resolutionNotes.trim() || resolving}
            >
              {resolving ? (
                <Loader2 className="mr-2 size-4 animate-spin" />
              ) : null}
              Mark as Resolved
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
