"use client"

import { useEffect, useState, useCallback } from "react"
import Link from "next/link"
import { Button, buttonVariants } from "@/components/ui/button"
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
  FileStack,
  Upload,
  Eye,
  Loader2,
  CheckCircle2,
  Clock,
  XCircle,
  RefreshCw,
  User,
  Users,
  AlertTriangle,
} from "lucide-react"
import { toast } from "sonner"
import { adminFetch } from "@/lib/admin-api"

type DeliverableType = "poster" | "reel" | "story" | "shoot_day"
type DeliverableStatus = "draft" | "pending_review" | "approved" | "revision" | "rejected"

interface Deliverable {
  id: string
  client_id: string
  client_name: string
  calendar_entry_id: string | null
  task_id: string | null
  type: DeliverableType
  title: string
  file_url: string | null
  status: DeliverableStatus
  revision_count: number
  assigned_to: string | null
  assigned_name: string | null
  created_at: string
  updated_at: string
}

const STATUS_CONFIG: Record<DeliverableStatus, { label: string; className: string; icon: typeof Clock }> = {
  draft: { label: "Draft", className: "bg-gray-100 text-gray-600 border-gray-200", icon: Clock },
  pending_review: { label: "Pending Review", className: "bg-amber-100 text-amber-700 border-amber-200", icon: Clock },
  approved: { label: "Approved", className: "bg-emerald-100 text-emerald-700 border-emerald-200", icon: CheckCircle2 },
  revision: { label: "Revision", className: "bg-blue-100 text-blue-700 border-blue-200", icon: RefreshCw },
  rejected: { label: "Rejected", className: "bg-red-100 text-red-700 border-red-200", icon: XCircle },
}

const TYPE_CONFIG: Record<DeliverableType, { label: string; className: string }> = {
  poster: { label: "Poster", className: "bg-purple-100 text-purple-700 border-purple-200" },
  reel: { label: "Reel", className: "bg-pink-100 text-pink-700 border-pink-200" },
  story: { label: "Story", className: "bg-sky-100 text-sky-700 border-sky-200" },
  shoot_day: { label: "Shoot Day", className: "bg-teal-100 text-teal-700 border-teal-200" },
}

function formatDate(d: string) {
  return new Date(d).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  })
}

export default function DeliverablesPage() {
  const [deliverables, setDeliverables] = useState<Deliverable[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState("")
  const [typeFilter, setTypeFilter] = useState("all")
  const [statusFilter, setStatusFilter] = useState("all")
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [uploadForm, setUploadForm] = useState({
    client_id: "",
    type: "poster" as DeliverableType,
    title: "",
    description: "",
    file: null as File | null,
  })

  const fetchDeliverables = useCallback(() => {
    setLoading(true)
    setError(null)
    adminFetch<Deliverable[]>("/api/v1/admin/deliverables")
      .then(setDeliverables)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    fetchDeliverables()
  }, [fetchDeliverables])

  const filtered = deliverables.filter((d) => {
    const matchesSearch =
      search === "" ||
      d.title.toLowerCase().includes(search.toLowerCase()) ||
      d.client_name.toLowerCase().includes(search.toLowerCase())
    const matchesType = typeFilter === "all" || d.type === typeFilter
    const matchesStatus = statusFilter === "all" || d.status === statusFilter
    return matchesSearch && matchesType && matchesStatus
  })

  async function handleUpload() {
    if (!uploadForm.title.trim()) {
      toast.error("Please enter a title")
      return
    }
    setUploading(true)
    try {
      const formData = new FormData()
      formData.append("client_id", uploadForm.client_id)
      formData.append("type", uploadForm.type)
      formData.append("title", uploadForm.title.trim())
      if (uploadForm.description) formData.append("description", uploadForm.description)
      if (uploadForm.file) formData.append("file", uploadForm.file)

      const newDeliverable = await adminFetch<Deliverable>("/api/v1/admin/deliverables", {
        method: "POST",
        body: formData,
        headers: {},
      })
      setDeliverables((prev) => [newDeliverable, ...prev])
      toast.success("Deliverable uploaded successfully")
      setUploadDialogOpen(false)
      setUploadForm({ client_id: "", type: "poster", title: "", description: "", file: null })
    } catch (err) {
      toast.error("Upload failed", {
        description: err instanceof Error ? err.message : "Unknown error",
      })
    } finally {
      setUploading(false)
    }
  }

  async function handleStatusChange(id: string, newStatus: DeliverableStatus) {
    try {
      const updated = await adminFetch<Deliverable>(`/api/v1/admin/deliverables/${id}/status`, {
        method: "PATCH",
        body: JSON.stringify({ status: newStatus }),
      })
      setDeliverables((prev) => prev.map((d) => (d.id === id ? updated : d)))
      toast.success(`Deliverable marked as ${STATUS_CONFIG[newStatus].label.toLowerCase()}`)
    } catch (err) {
      toast.error("Failed to update status", {
        description: err instanceof Error ? err.message : "Unknown error",
      })
    }
  }

  const stats = {
    total: deliverables.length,
    pending: deliverables.filter((d) => d.status === "pending_review").length,
    approved: deliverables.filter((d) => d.status === "approved").length,
    revision: deliverables.filter((d) => d.status === "revision").length,
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-muted-foreground">
            Manage and track all client deliverables
          </p>
        </div>
        <Button onClick={() => setUploadDialogOpen(true)}>
          <Upload className="size-4" />
          Upload Deliverable
        </Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { label: "Total", value: stats.total, color: "text-[#0D2137]" },
          { label: "Pending Review", value: stats.pending, color: "text-amber-600" },
          { label: "Approved", value: stats.approved, color: "text-emerald-600" },
          { label: "Needs Revision", value: stats.revision, color: "text-blue-600" },
        ].map((stat) => (
          <div key={stat.label} className="rounded-lg border bg-white p-4">
            <p className="text-sm font-medium text-muted-foreground">{stat.label}</p>
            <p className={`mt-1 text-2xl font-bold ${stat.color}`}>{stat.value}</p>
          </div>
        ))}
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search by title or client..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-9 pl-8"
          />
        </div>
        <Select value={typeFilter} onValueChange={(v) => setTypeFilter(v ?? "all")}>
          <SelectTrigger className="w-full sm:w-[140px]">
            <SelectValue placeholder="Type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            <SelectItem value="poster">Poster</SelectItem>
            <SelectItem value="reel">Reel</SelectItem>
            <SelectItem value="story">Story</SelectItem>
          </SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v ?? "all")}>
          <SelectTrigger className="w-full sm:w-[160px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="draft">Draft</SelectItem>
            <SelectItem value="pending_review">Pending Review</SelectItem>
            <SelectItem value="approved">Approved</SelectItem>
            <SelectItem value="revision">Revision</SelectItem>
            <SelectItem value="rejected">Rejected</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="size-6 animate-spin text-muted-foreground" />
        </div>
      ) : error ? (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          Failed to load deliverables: {error}
        </div>
      ) : (
        <div className="rounded-lg border bg-white">
          {filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="flex size-12 items-center justify-center rounded-full bg-muted">
                <FileStack className="size-6 text-muted-foreground" />
              </div>
              <h3 className="mt-4 text-sm font-semibold text-[#0D2137]">
                No deliverables found
              </h3>
              <p className="mt-1 max-w-sm text-sm text-muted-foreground">
                {search || typeFilter !== "all" || statusFilter !== "all"
                  ? "Try adjusting your search or filters."
                  : "Upload your first deliverable to get started."}
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Title</TableHead>
                  <TableHead>Client</TableHead>
                  <TableHead className="hidden md:table-cell">Type</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="hidden md:table-cell">Assigned To</TableHead>
                  <TableHead className="hidden lg:table-cell">Date</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((d) => {
                  const statusCfg = STATUS_CONFIG[d.status] || { label: d.status, className: "bg-gray-100 text-gray-600 border-gray-200" }
                  const typeCfg = TYPE_CONFIG[d.type]
                  return (
                    <TableRow key={d.id}>
                      <TableCell>
                        <p className="font-medium text-[#0D2137]">{d.title}</p>
                        {d.revision_count > 0 && (
                          <p className="text-xs text-muted-foreground">
                            {d.revision_count} revision{d.revision_count !== 1 ? "s" : ""}
                          </p>
                        )}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {d.client_name}
                      </TableCell>
                      <TableCell className="hidden md:table-cell">
                        <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium ${typeCfg.className}`}>
                          {typeCfg.label}
                        </span>
                      </TableCell>
                      <TableCell>
                        <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium ${statusCfg.className}`}>
                          {statusCfg.label}
                        </span>
                      </TableCell>
                      <TableCell className="hidden md:table-cell text-muted-foreground">
                        {d.assigned_name ?? "—"}
                      </TableCell>
                      <TableCell className="hidden lg:table-cell text-muted-foreground">
                        {formatDate(d.created_at)}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          {d.file_url && (
                            <a
                              href={d.file_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className={buttonVariants({ variant: "ghost", size: "sm" })}
                            >
                              <Eye className="size-3.5" />
                            </a>
                          )}
                          {d.status === "pending_review" && (
                            <>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="text-emerald-600 hover:bg-emerald-50 hover:text-emerald-700"
                                onClick={() => handleStatusChange(d.id, "approved")}
                              >
                                Approve
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="text-blue-600 hover:bg-blue-50 hover:text-blue-700"
                                onClick={() => handleStatusChange(d.id, "revision")}
                              >
                                Revise
                              </Button>
                            </>
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

      <Dialog open={uploadDialogOpen} onOpenChange={setUploadDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Upload Deliverable</DialogTitle>
            <DialogDescription>
              Upload a new deliverable for a client
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="del-title">Title</Label>
              <Input
                id="del-title"
                placeholder="e.g. Instagram Post - Summer Campaign"
                value={uploadForm.title}
                onChange={(e) => setUploadForm({ ...uploadForm, title: e.target.value })}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Client ID</Label>
                <Input
                  placeholder="Client UUID"
                  value={uploadForm.client_id}
                  onChange={(e) => setUploadForm({ ...uploadForm, client_id: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Type</Label>
                <Select
                  value={uploadForm.type}
                  onValueChange={(v) => setUploadForm({ ...uploadForm, type: (v as DeliverableType) ?? "poster" })}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="poster">Poster</SelectItem>
                    <SelectItem value="reel">Reel</SelectItem>
                    <SelectItem value="story">Story</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="del-desc">Description (optional)</Label>
              <Textarea
                id="del-desc"
                placeholder="Brief description of the deliverable..."
                value={uploadForm.description}
                onChange={(e) => setUploadForm({ ...uploadForm, description: e.target.value })}
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label>File</Label>
              <input
                type="file"
                accept=".png,.jpg,.jpeg,.gif,.webp,.mp4,.mov"
                className="block w-full text-sm text-muted-foreground file:mr-3 file:rounded-lg file:border-0 file:bg-[#2B7BC4] file:px-4 file:py-2 file:text-sm file:font-medium file:text-white hover:file:bg-[#2B7BC4]/90"
                onChange={(e) => setUploadForm({ ...uploadForm, file: e.target.files?.[0] ?? null })}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setUploadDialogOpen(false)} disabled={uploading}>
              Cancel
            </Button>
            <Button onClick={handleUpload} disabled={uploading}>
              {uploading && <Loader2 className="mr-2 size-4 animate-spin" />}
              Upload
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
