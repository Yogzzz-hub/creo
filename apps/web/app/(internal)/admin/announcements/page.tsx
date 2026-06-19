"use client"

import { useState } from "react"
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
import { Badge } from "@/components/ui/badge"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Plus, Download, Megaphone } from "lucide-react"
import { toast } from "sonner"

interface Announcement {
  id: string
  title: string
  type: string
  target: string
  date: string
  hasFile: boolean
}

const INITIAL_ANNOUNCEMENTS: Announcement[] = [
  {
    id: "ANN-012",
    title: "June All-Hands Meeting Minutes",
    type: "MoM",
    target: "All Departments",
    date: "Jun 15, 2026",
    hasFile: true,
  },
  {
    id: "ANN-011",
    title: "Q2 Performance Newsletter",
    type: "Newsletter",
    target: "All Departments",
    date: "Jun 10, 2026",
    hasFile: true,
  },
  {
    id: "ANN-010",
    title: "New SLA Policy Effective July 1",
    type: "General Alert",
    target: "Graphics, Video, Content",
    date: "Jun 8, 2026",
    hasFile: false,
  },
  {
    id: "ANN-009",
    title: "May Team Outing Photos & Recap",
    type: "Newsletter",
    target: "All Departments",
    date: "Jun 3, 2026",
    hasFile: true,
  },
  {
    id: "ANN-008",
    title: "Updated Content Guidelines v3.2",
    type: "General Alert",
    target: "Content",
    date: "May 28, 2026",
    hasFile: true,
  },
  {
    id: "ANN-007",
    title: "May All-Hands Meeting Minutes",
    type: "MoM",
    target: "All Departments",
    date: "May 25, 2026",
    hasFile: true,
  },
  {
    id: "ANN-006",
    title: "Holiday Calendar — Q3 2026",
    type: "General Alert",
    target: "All Departments",
    date: "May 20, 2026",
    hasFile: false,
  },
]

const DEPARTMENTS = ["Graphics", "Video", "Content", "Sales", "Admin"]

function getTypeBadge(type: string) {
  switch (type) {
    case "MoM":
      return (
        <span className="inline-flex items-center rounded-full border border-blue-200 bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-700">
          MoM
        </span>
      )
    case "Newsletter":
      return (
        <span className="inline-flex items-center rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700">
          Newsletter
        </span>
      )
    case "General Alert":
      return (
        <span className="inline-flex items-center rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-700">
          General Alert
        </span>
      )
    default:
      return <Badge variant="outline">{type}</Badge>
  }
}

export default function AnnouncementsPage() {
  const [announcements, setAnnouncements] = useState(INITIAL_ANNOUNCEMENTS)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [formData, setFormData] = useState({
    title: "",
    type: "",
    departments: [] as string[],
    description: "",
  })

  function handleToggleDept(dept: string) {
    setFormData((prev) => ({
      ...prev,
      departments: prev.departments.includes(dept)
        ? prev.departments.filter((d) => d !== dept)
        : [...prev.departments, dept],
    }))
  }

  function handleSubmit() {
    if (!formData.title || !formData.type) {
      toast.error("Please fill in all required fields")
      return
    }
    const newAnnouncement: Announcement = {
      id: `ANN-${String(announcements.length + 1).padStart(3, "0")}`,
      title: formData.title,
      type: formData.type,
      target:
        formData.departments.length === 0 || formData.departments.length === DEPARTMENTS.length
          ? "All Departments"
          : formData.departments.join(", "),
      date: "Jun 17, 2026",
      hasFile: false,
    }
    setAnnouncements([newAnnouncement, ...announcements])
    toast.success("Announcement published", {
      description: `"${formData.title}" has been sent to the selected departments.`,
    })
    setFormData({ title: "", type: "", departments: [], description: "" })
    setDialogOpen(false)
  }

  function handleDownload(title: string) {
    toast.success("Download started", {
      description: `Downloading "${title}"...`,
    })
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#0D2137]">
            Platform Announcements
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Create and manage internal announcements, newsletters, and alerts
          </p>
        </div>
        <Button onClick={() => setDialogOpen(true)}>
          <Plus className="size-4" />
          New Announcement
        </Button>
      </div>

      <div className="rounded-lg border bg-white">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Title</TableHead>
              <TableHead>Type</TableHead>
              <TableHead className="hidden md:table-cell">
                Target Audience
              </TableHead>
              <TableHead className="hidden lg:table-cell">Date</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {announcements.map((ann) => (
              <TableRow key={ann.id}>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <Megaphone className="size-4 shrink-0 text-muted-foreground" />
                    <div>
                      <p className="font-medium text-[#0D2137]">{ann.title}</p>
                      <p className="text-xs text-muted-foreground">{ann.id}</p>
                    </div>
                  </div>
                </TableCell>
                <TableCell>{getTypeBadge(ann.type)}</TableCell>
                <TableCell className="hidden md:table-cell text-muted-foreground">
                  {ann.target}
                </TableCell>
                <TableCell className="hidden lg:table-cell text-muted-foreground">
                  {ann.date}
                </TableCell>
                <TableCell className="text-right">
                  {ann.hasFile ? (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDownload(ann.title)}
                    >
                      <Download className="size-3.5" />
                      Download
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

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>New Announcement</DialogTitle>
            <DialogDescription>
              Create an announcement to share with your team
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="ann-title">Title</Label>
              <Input
                id="ann-title"
                placeholder="e.g. Updated Content Guidelines"
                value={formData.title}
                onChange={(e) =>
                  setFormData({ ...formData, title: e.target.value })
                }
              />
            </div>

            <div className="space-y-2">
              <Label>Type</Label>
              <Select
                value={formData.type}
                onValueChange={(v) =>
                  setFormData({ ...formData, type: v ?? "" })
                }
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="MoM">MoM (Minutes of Meeting)</SelectItem>
                  <SelectItem value="Newsletter">Newsletter</SelectItem>
                  <SelectItem value="General Alert">General Alert</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Target Departments</Label>
              <div className="flex flex-wrap gap-2">
                {DEPARTMENTS.map((dept) => {
                  const selected = formData.departments.includes(dept)
                  return (
                    <button
                      key={dept}
                      type="button"
                      onClick={() => handleToggleDept(dept)}
                      className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
                        selected
                          ? "border-[#2B7BC4] bg-[#2B7BC4] text-white"
                          : "border-border bg-white text-muted-foreground hover:bg-muted"
                      }`}
                    >
                      {dept}
                    </button>
                  )
                })}
              </div>
              <p className="text-xs text-muted-foreground">
                Leave empty to send to all departments
              </p>
            </div>

            <div className="space-y-2">
              <Label>Description (optional)</Label>
              <Textarea
                placeholder="Add context or a summary of the announcement..."
                value={formData.description}
                onChange={(e) =>
                  setFormData({ ...formData, description: e.target.value })
                }
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label>Attachment</Label>
              <div className="flex items-center justify-center rounded-lg border-2 border-dashed border-border bg-muted/50 px-6 py-8 text-center">
                <div>
                  <p className="text-sm text-muted-foreground">
                    Drag and drop a file here, or{" "}
                    <button className="font-medium text-[#2B7BC4] hover:underline">
                      browse
                    </button>
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    PDF, DOCX, or images up to 10MB
                  </p>
                </div>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSubmit}>Publish Announcement</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
