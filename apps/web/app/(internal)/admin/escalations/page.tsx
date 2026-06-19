"use client"

import { useState } from "react"
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
import { AlertTriangle } from "lucide-react"
import { toast } from "sonner"

interface Escalation {
  id: string
  client: string
  severity: string
  trigger: string
  assignedTo: string
  status: string
  createdAt: string
  resolutionNotes?: string
}

const INITIAL_ESCALATIONS: Escalation[] = [
  {
    id: "ESC-042",
    client: "Brew & Bloom Cafe",
    severity: "High",
    trigger: "SLA Breach: 3-day delivery missed",
    assignedTo: "Priya Sharma",
    status: "Open",
    createdAt: "Jun 12, 2026",
  },
  {
    id: "ESC-041",
    client: "TechNova Solutions",
    severity: "Critical",
    trigger: "Deliverable rejected 3 times — quality concern",
    assignedTo: "Rahul Mehta",
    status: "Open",
    createdAt: "Jun 10, 2026",
  },
  {
    id: "ESC-040",
    client: "FreshCart",
    severity: "Medium",
    trigger: "Client unresponsive for 48 hours",
    assignedTo: "Ananya Kumar",
    status: "Open",
    createdAt: "Jun 8, 2026",
  },
  {
    id: "ESC-039",
    client: "Urban Eats",
    severity: "High",
    trigger: "SLA Breach: Calendar not updated in 5 days",
    assignedTo: "Vikram Desai",
    status: "Open",
    createdAt: "Jun 7, 2026",
  },
  {
    id: "ESC-038",
    client: "StyleHaus",
    severity: "Medium",
    trigger: "Instagram post published with wrong hashtag",
    assignedTo: "Neha Gupta",
    status: "Resolved",
    createdAt: "Jun 5, 2026",
    resolutionNotes:
      "Hashtags corrected. Client informed. Updated brand guidelines document.",
  },
  {
    id: "ESC-037",
    client: "Brew & Bloom Cafe",
    severity: "Low",
    trigger: "Minor color palette adjustment requested",
    assignedTo: "Priya Sharma",
    status: "Resolved",
    createdAt: "Jun 3, 2026",
    resolutionNotes:
      "Color palette updated per client request. New palette saved to brand kit.",
  },
  {
    id: "ESC-036",
    client: "TechNova Solutions",
    severity: "High",
    trigger: "SLA Breach: Blog post delayed by 4 days",
    assignedTo: "Ananya Kumar",
    status: "Resolved",
    createdAt: "Jun 1, 2026",
    resolutionNotes:
      "Blog post published. Root cause: content writer overload. Daily cap reviewed.",
  },
  {
    id: "ESC-035",
    client: "FreshCart",
    severity: "Medium",
    trigger: "Deliverable format not matching brief specs",
    assignedTo: "Neha Gupta",
    status: "Resolved",
    createdAt: "May 28, 2026",
    resolutionNotes:
      "Deliverable reformatted. Brief template updated to include file specs.",
  },
]

function getSeverityColor(severity: string) {
  switch (severity) {
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
    case "Open":
      return "bg-red-50 text-red-700 border-red-200"
    case "Resolved":
      return "bg-emerald-50 text-emerald-700 border-emerald-200"
    default:
      return ""
  }
}

export default function EscalationsPage() {
  const [severityFilter, setSeverityFilter] = useState("all")
  const [escalations, setEscalations] = useState(INITIAL_ESCALATIONS)
  const [resolveDialogOpen, setResolveDialogOpen] = useState(false)
  const [selectedEscalation, setSelectedEscalation] =
    useState<Escalation | null>(null)
  const [resolutionNotes, setResolutionNotes] = useState("")

  const filteredEscalations = escalations.filter((esc) => {
    if (severityFilter === "all") return true
    return esc.severity === severityFilter
  })

  function handleResolveClick(esc: Escalation) {
    setSelectedEscalation(esc)
    setResolutionNotes("")
    setResolveDialogOpen(true)
  }

  function handleResolveSubmit() {
    if (!resolutionNotes.trim()) return

    setEscalations((prev) =>
      prev.map((esc) =>
        esc.id === selectedEscalation?.id
          ? { ...esc, status: "Resolved", resolutionNotes: resolutionNotes }
          : esc
      )
    )

    toast.success("Escalation resolved", {
      description: `${selectedEscalation?.id} has been marked as resolved.`,
    })

    setResolveDialogOpen(false)
    setSelectedEscalation(null)
    setResolutionNotes("")
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#0D2137]">Escalations</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Track and resolve client escalations and SLA breaches
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <AlertTriangle className="size-4 text-amber-500" />
            <span>
              <span className="font-semibold text-red-600">
                {escalations.filter((e) => e.status === "Open").length}
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
                <TableCell className="font-mono text-xs">{esc.id}</TableCell>
                <TableCell className="font-medium">{esc.client}</TableCell>
                <TableCell>
                  <span
                    className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium ${getSeverityColor(
                      esc.severity
                    )}`}
                  >
                    {esc.severity}
                  </span>
                </TableCell>
                <TableCell className="hidden lg:table-cell max-w-[280px] truncate text-muted-foreground">
                  {esc.trigger}
                </TableCell>
                <TableCell className="hidden md:table-cell text-muted-foreground">
                  {esc.assignedTo}
                </TableCell>
                <TableCell>
                  <span
                    className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium ${getStatusColor(
                      esc.status
                    )}`}
                  >
                    {esc.status}
                  </span>
                </TableCell>
                <TableCell className="text-right">
                  {esc.status === "Open" ? (
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

      <Dialog open={resolveDialogOpen} onOpenChange={setResolveDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Resolve Escalation</DialogTitle>
            <DialogDescription>
              Log the resolution notes for{" "}
              <span className="font-semibold text-foreground">
                {selectedEscalation?.id}
              </span>{" "}
              — {selectedEscalation?.client}
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
            >
              Cancel
            </Button>
            <Button
              onClick={handleResolveSubmit}
              disabled={!resolutionNotes.trim()}
            >
              Mark as Resolved
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
