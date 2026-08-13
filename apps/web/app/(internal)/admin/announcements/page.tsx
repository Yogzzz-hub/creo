"use client"

import { useEffect, useState, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Plus, Megaphone, Pencil, Trash2, Loader2 } from "lucide-react"
import { toast } from "sonner"
import { adminFetch } from "@/lib/admin-api"

interface Announcement {
  id: string
  author_id: string
  title: string
  content: string
  type: string
  target_departments: string[] | null
  created_at: string
}

const DEPARTMENTS = ["graphics", "video", "content_writing", "social_media", "sales", "admin"]

function formatDepartment(d: string) {
  return d.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())
}

function getTypeBadge(type: string) {
  switch (type) {
    case "mom":
      return <span className="inline-flex items-center rounded-full border border-blue-200 bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-700">MoM</span>
    case "newsletter":
      return <span className="inline-flex items-center rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700">Newsletter</span>
    case "general":
      return <span className="inline-flex items-center rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-700">General</span>
    case "broadcast":
      return <span className="inline-flex items-center rounded-full border border-purple-200 bg-purple-50 px-2 py-0.5 text-xs font-medium text-purple-700">Broadcast</span>
    case "maintenance":
      return <span className="inline-flex items-center rounded-full border border-red-200 bg-red-50 px-2 py-0.5 text-xs font-medium text-red-700">Maintenance</span>
    default:
      return <span className="inline-flex items-center rounded-full border border-gray-200 bg-gray-50 px-2 py-0.5 text-xs font-medium text-gray-700">{type}</span>
  }
}

function formatDate(d: string) {
  return new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })
}

export default function AnnouncementsPage() {
  const [announcements, setAnnouncements] = useState<Announcement[]>([])
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [selectedAnnouncement, setSelectedAnnouncement] = useState<Announcement | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [formData, setFormData] = useState({
    title: "",
    type: "",
    departments: [] as string[],
    description: "",
  })

  const fetchAnnouncements = useCallback(() => {
    setLoading(true)
    setError(null)
    adminFetch<Announcement[]>("/api/v1/admin/announcements")
      .then(setAnnouncements)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    fetchAnnouncements()
  }, [fetchAnnouncements])

  function handleToggleDept(dept: string) {
    setFormData((prev) => ({
      ...prev,
      departments: prev.departments.includes(dept)
        ? prev.departments.filter((d) => d !== dept)
        : [...prev.departments, dept],
    }))
  }

  function openEditDialog(ann: Announcement) {
    setSelectedAnnouncement(ann)
    const typeMap: Record<string, string> = { mom: "MoM", newsletter: "Newsletter", general: "General Alert", broadcast: "Broadcast", maintenance: "Maintenance Notice" }
    setFormData({
      title: ann.title,
      type: typeMap[ann.type] ?? ann.type,
      departments: ann.target_departments ?? [],
      description: ann.content === ann.title ? "" : ann.content,
    })
    setEditDialogOpen(true)
  }

  function openDeleteDialog(ann: Announcement) {
    setSelectedAnnouncement(ann)
    setDeleteDialogOpen(true)
  }

  async function handleSubmit() {
    if (!formData.title || !formData.type) {
      toast.error("Please fill in all required fields")
      return
    }
    setSubmitting(true)
    try {
      const typeMap: Record<string, string> = { MoM: "mom", Newsletter: "newsletter", "General Alert": "general", Broadcast: "broadcast", "Maintenance Notice": "maintenance" }
      await adminFetch("/api/v1/admin/announcements", {
        method: "POST",
        body: JSON.stringify({
          title: formData.title,
          content: formData.description || formData.title,
          type: typeMap[formData.type] ?? "general",
          target_departments: formData.departments.length === 0 || formData.departments.length === DEPARTMENTS.length ? null : formData.departments,
        }),
      })
      toast.success("Announcement published", { description: `"${formData.title}" has been published.` })
      setFormData({ title: "", type: "", departments: [], description: "" })
      setDialogOpen(false)
      fetchAnnouncements()
    } catch (err) {
      toast.error("Failed to publish", { description: err instanceof Error ? err.message : "Unknown error" })
    } finally {
      setSubmitting(false)
    }
  }

  async function handleUpdate() {
    if (!selectedAnnouncement || !formData.title || !formData.type) {
      toast.error("Please fill in all required fields")
      return
    }
    setSubmitting(true)
    try {
      const typeMap: Record<string, string> = { MoM: "mom", Newsletter: "newsletter", "General Alert": "general", Broadcast: "broadcast", "Maintenance Notice": "maintenance" }
      await adminFetch(`/api/v1/admin/announcements/${selectedAnnouncement.id}`, {
        method: "PATCH",
        body: JSON.stringify({
          title: formData.title,
          content: formData.description || formData.title,
          type: typeMap[formData.type] ?? "general",
          target_departments: formData.departments.length === 0 || formData.departments.length === DEPARTMENTS.length ? null : formData.departments,
        }),
      })
      toast.success("Announcement updated")
      setEditDialogOpen(false)
      fetchAnnouncements()
    } catch (err) {
      toast.error("Failed to update", { description: err instanceof Error ? err.message : "Unknown error" })
    } finally {
      setSubmitting(false)
    }
  }

  async function handleDelete() {
    if (!selectedAnnouncement) return
    setSubmitting(true)
    try {
      await adminFetch(`/api/v1/admin/announcements/${selectedAnnouncement.id}`, {
        method: "DELETE",
      })
      toast.success("Announcement deleted")
      setDeleteDialogOpen(false)
      fetchAnnouncements()
    } catch (err) {
      toast.error("Failed to delete", { description: err instanceof Error ? err.message : "Unknown error" })
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#0D2137]">Announcements</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Create and manage internal announcements, newsletters, and alerts
          </p>
        </div>
        <Button onClick={() => setDialogOpen(true)}>
          <Plus className="size-4" />
          New Announcement
        </Button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="size-6 animate-spin text-muted-foreground" />
        </div>
      ) : error ? (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div>
      ) : (
        <div className="rounded-lg border bg-white">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Title</TableHead>
                <TableHead>Type</TableHead>
                <TableHead className="hidden md:table-cell">Target</TableHead>
                <TableHead className="hidden lg:table-cell">Date</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {announcements.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="h-24 text-center">
                    <p className="text-sm text-muted-foreground">No announcements yet.</p>
                  </TableCell>
                </TableRow>
              ) : (
                announcements.map((ann) => (
                  <TableRow key={ann.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Megaphone className="size-4 shrink-0 text-muted-foreground" />
                        <div>
                          <p className="font-medium text-[#0D2137]">{ann.title}</p>
                          <p className="text-xs text-muted-foreground">{ann.id.slice(0, 8)}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>{getTypeBadge(ann.type)}</TableCell>
                    <TableCell className="hidden md:table-cell text-muted-foreground">
                      {ann.target_departments ? ann.target_departments.map(formatDepartment).join(", ") : "All Departments"}
                    </TableCell>
                    <TableCell className="hidden lg:table-cell text-muted-foreground">
                      {formatDate(ann.created_at)}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button variant="ghost" size="sm" onClick={() => openEditDialog(ann)}>
                          <Pencil className="size-3.5" />
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => openDeleteDialog(ann)} className="text-red-600 hover:bg-red-50 hover:text-red-700">
                          <Trash2 className="size-3.5" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Create Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>New Announcement</DialogTitle>
            <DialogDescription>Create an announcement to share with your team</DialogDescription>
          </DialogHeader>
          <AnnouncementForm formData={formData} setFormData={setFormData} onSubmit={handleSubmit} onCancel={() => setDialogOpen(false)} submitting={submitting} />
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Edit Announcement</DialogTitle>
            <DialogDescription>Update the announcement details</DialogDescription>
          </DialogHeader>
          <AnnouncementForm formData={formData} setFormData={setFormData} onSubmit={handleUpdate} onCancel={() => setEditDialogOpen(false)} submitting={submitting} submitLabel="Update Announcement" />
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Delete Announcement</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete "{selectedAnnouncement?.title}"? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)} disabled={submitting}>Cancel</Button>
            <Button variant="destructive" onClick={handleDelete} disabled={submitting}>
              {submitting && <Loader2 className="mr-2 size-4 animate-spin" />}
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function AnnouncementForm({
  formData,
  setFormData,
  onSubmit,
  onCancel,
  submitting,
  submitLabel = "Publish Announcement",
}: {
  formData: { title: string; type: string; departments: string[]; description: string }
  setFormData: React.Dispatch<React.SetStateAction<{ title: string; type: string; departments: string[]; description: string }>>
  onSubmit: () => void
  onCancel: () => void
  submitting: boolean
  submitLabel?: string
}) {
  function handleToggleDept(dept: string) {
    setFormData((prev) => ({
      ...prev,
      departments: prev.departments.includes(dept)
        ? prev.departments.filter((d) => d !== dept)
        : [...prev.departments, dept],
    }))
  }

  return (
    <div className="space-y-4 py-2">
      <div className="space-y-2">
        <Label htmlFor="ann-title">Title</Label>
        <Input id="ann-title" placeholder="e.g. Updated Content Guidelines" value={formData.title} onChange={(e) => setFormData({ ...formData, title: e.target.value })} />
      </div>

      <div className="space-y-2">
        <Label>Type</Label>
        <Select value={formData.type} onValueChange={(v) => setFormData({ ...formData, type: v ?? "" })}>
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Select type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="MoM">MoM (Minutes of Meeting)</SelectItem>
            <SelectItem value="Newsletter">Newsletter</SelectItem>
            <SelectItem value="General Alert">General Alert</SelectItem>
            <SelectItem value="Broadcast">Broadcast</SelectItem>
            <SelectItem value="Maintenance Notice">Maintenance Notice</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label>Target Departments</Label>
        <div className="flex flex-wrap gap-2">
          {DEPARTMENTS.map((dept) => {
            const selected = formData.departments.includes(dept)
            return (
              <button key={dept} type="button" onClick={() => handleToggleDept(dept)} className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${selected ? "border-[#2B7BC4] bg-[#2B7BC4] text-white" : "border-border bg-white text-muted-foreground hover:bg-muted"}`}>
                {formatDepartment(dept)}
              </button>
            )
          })}
        </div>
        <p className="text-xs text-muted-foreground">Leave empty to send to all departments</p>
      </div>

      <div className="space-y-2">
        <Label>Description (optional)</Label>
        <Textarea placeholder="Add context or a summary of the announcement..." value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} rows={3} />
      </div>

      <DialogFooter>
        <Button variant="outline" onClick={onCancel} disabled={submitting}>Cancel</Button>
        <Button onClick={onSubmit} disabled={submitting}>
          {submitting && <Loader2 className="mr-2 size-4 animate-spin" />}
          {submitLabel}
        </Button>
      </DialogFooter>
    </div>
  )
}
