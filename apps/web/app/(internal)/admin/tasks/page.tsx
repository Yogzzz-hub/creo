"use client"

import { useEffect, useState, useCallback } from "react"
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
  CheckSquare,
  Plus,
  Loader2,
  AlertTriangle,
} from "lucide-react"
import { toast } from "sonner"
import { adminFetch } from "@/lib/admin-api"

type TaskStatus = "todo" | "in_progress" | "review" | "done" | "overdue"
type TaskPriority = "low" | "medium" | "high" | "urgent"

interface Task {
  id: string
  title: string
  description: string | null
  status: TaskStatus
  priority: TaskPriority
  assigned_to: string | null
  assigned_name: string | null
  client_name: string | null
  deadline: string | null
  created_at: string
  updated_at: string
}

interface TeamMember {
  team_member_id: string
  full_name: string
  department: string
}

const STATUS_CONFIG: Record<TaskStatus, { label: string; className: string }> = {
  todo: { label: "To Do", className: "bg-gray-100 text-gray-600 border-gray-200" },
  in_progress: { label: "In Progress", className: "bg-blue-100 text-blue-700 border-blue-200" },
  review: { label: "Review", className: "bg-amber-100 text-amber-700 border-amber-200" },
  done: { label: "Done", className: "bg-emerald-100 text-emerald-700 border-emerald-200" },
  overdue: { label: "Overdue", className: "bg-red-100 text-red-700 border-red-200" },
}

const PRIORITY_CONFIG: Record<TaskPriority, { label: string; className: string }> = {
  low: { label: "Low", className: "bg-gray-100 text-gray-600 border-gray-200" },
  medium: { label: "Medium", className: "bg-sky-100 text-sky-700 border-sky-200" },
  high: { label: "High", className: "bg-amber-100 text-amber-700 border-amber-200" },
  urgent: { label: "Urgent", className: "bg-red-100 text-red-700 border-red-200" },
}

function formatDate(d: string | null) {
  if (!d) return "—"
  return new Date(d).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  })
}

export default function TasksPage() {
  const [tasks, setTasks] = useState<Task[]>([])
  const [team, setTeam] = useState<TeamMember[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [priorityFilter, setPriorityFilter] = useState("all")
  const [createDialogOpen, setCreateDialogOpen] = useState(false)
  const [creating, setCreating] = useState(false)
  const [form, setForm] = useState({
    title: "",
    description: "",
    assigned_to: "",
    client_name: "",
    priority: "medium" as TaskPriority,
    deadline: "",
  })

  const fetchData = useCallback(() => {
    setLoading(true)
    setError(null)
    Promise.allSettled([
      adminFetch<Task[]>("/api/v1/admin/tasks"),
      adminFetch<TeamMember[]>("/api/v1/admin/team"),
    ])
      .then(([tasksRes, teamRes]) => {
        if (tasksRes.status === "fulfilled") setTasks(tasksRes.value)
        else setError(tasksRes.reason?.message ?? "Failed to load tasks")
        if (teamRes.status === "fulfilled") setTeam(teamRes.value)
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const filtered = tasks.filter((t) => {
    const matchesSearch =
      search === "" ||
      t.title.toLowerCase().includes(search.toLowerCase()) ||
      (t.client_name ?? "").toLowerCase().includes(search.toLowerCase()) ||
      (t.assigned_name ?? "").toLowerCase().includes(search.toLowerCase())
    const matchesStatus = statusFilter === "all" || t.status === statusFilter
    const matchesPriority = priorityFilter === "all" || t.priority === priorityFilter
    return matchesSearch && matchesStatus && matchesPriority
  })

  async function handleCreate() {
    if (!form.title.trim()) {
      toast.error("Please enter a task title")
      return
    }
    setCreating(true)
    try {
      const newTask = await adminFetch<Task>("/api/v1/admin/tasks", {
        method: "POST",
        body: JSON.stringify({
          title: form.title.trim(),
          description: form.description || null,
          assigned_to: form.assigned_to || null,
          client_name: form.client_name || null,
          priority: form.priority,
          deadline: form.deadline || null,
        }),
      })
      setTasks((prev) => [newTask, ...prev])
      toast.success("Task created successfully")
      setCreateDialogOpen(false)
      setForm({ title: "", description: "", assigned_to: "", client_name: "", priority: "medium", deadline: "" })
    } catch (err) {
      toast.error("Failed to create task", {
        description: err instanceof Error ? err.message : "Unknown error",
      })
    } finally {
      setCreating(false)
    }
  }

  async function handleStatusChange(id: string, newStatus: TaskStatus) {
    try {
      const updated = await adminFetch<Task>(`/api/v1/admin/tasks/${id}/status`, {
        method: "PATCH",
        body: JSON.stringify({ status: newStatus }),
      })
      setTasks((prev) => prev.map((t) => (t.id === id ? updated : t)))
      toast.success(`Task marked as ${STATUS_CONFIG[newStatus].label}`)
    } catch (err) {
      toast.error("Failed to update task", {
        description: err instanceof Error ? err.message : "Unknown error",
      })
    }
  }

  const stats = {
    total: tasks.length,
    inProgress: tasks.filter((t) => t.status === "in_progress").length,
    overdue: tasks.filter((t) => t.status === "overdue").length,
    completed: tasks.filter((t) => t.status === "done").length,
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#0D2137]">Task Management</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Create, assign, and track team tasks
          </p>
        </div>
        <Button onClick={() => setCreateDialogOpen(true)}>
          <Plus className="size-4" />
          New Task
        </Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { label: "Total Tasks", value: stats.total, color: "text-[#0D2137]" },
          { label: "In Progress", value: stats.inProgress, color: "text-blue-600" },
          { label: "Overdue", value: stats.overdue, color: "text-red-600", alert: stats.overdue > 0 },
          { label: "Completed", value: stats.completed, color: "text-emerald-600" },
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
            placeholder="Search tasks..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-9 pl-8"
          />
        </div>
        <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v ?? "all")}>
          <SelectTrigger className="w-full sm:w-[140px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="todo">To Do</SelectItem>
            <SelectItem value="in_progress">In Progress</SelectItem>
            <SelectItem value="review">Review</SelectItem>
            <SelectItem value="done">Done</SelectItem>
            <SelectItem value="overdue">Overdue</SelectItem>
          </SelectContent>
        </Select>
        <Select value={priorityFilter} onValueChange={(v) => setPriorityFilter(v ?? "all")}>
          <SelectTrigger className="w-full sm:w-[140px]">
            <SelectValue placeholder="Priority" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Priorities</SelectItem>
            <SelectItem value="low">Low</SelectItem>
            <SelectItem value="medium">Medium</SelectItem>
            <SelectItem value="high">High</SelectItem>
            <SelectItem value="urgent">Urgent</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="size-6 animate-spin text-muted-foreground" />
        </div>
      ) : error ? (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          Failed to load tasks: {error}
        </div>
      ) : (
        <div className="rounded-lg border bg-white">
          {filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="flex size-12 items-center justify-center rounded-full bg-muted">
                <CheckSquare className="size-6 text-muted-foreground" />
              </div>
              <h3 className="mt-4 text-sm font-semibold text-[#0D2137]">
                No tasks found
              </h3>
              <p className="mt-1 max-w-sm text-sm text-muted-foreground">
                {search || statusFilter !== "all" || priorityFilter !== "all"
                  ? "Try adjusting your search or filters."
                  : "Create your first task to get started."}
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Task</TableHead>
                  <TableHead className="hidden md:table-cell">Client</TableHead>
                  <TableHead>Priority</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="hidden md:table-cell">Assigned To</TableHead>
                  <TableHead className="hidden lg:table-cell">Deadline</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((task) => {
                  const statusCfg = STATUS_CONFIG[task.status] || { label: task.status, className: "bg-gray-100 text-gray-600 border-gray-200" }
                  const priorityCfg = PRIORITY_CONFIG[task.priority] || { label: task.priority, className: "bg-gray-100 text-gray-600 border-gray-200" }
                  return (
                    <TableRow key={task.id}>
                      <TableCell>
                        <p className="font-medium text-[#0D2137]">{task.title}</p>
                        {task.description && (
                          <p className="mt-0.5 max-w-[200px] truncate text-xs text-muted-foreground">
                            {task.description}
                          </p>
                        )}
                      </TableCell>
                      <TableCell className="hidden md:table-cell text-muted-foreground">
                        {task.client_name ?? "—"}
                      </TableCell>
                      <TableCell>
                        <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium ${priorityCfg.className}`}>
                          {priorityCfg.label}
                        </span>
                      </TableCell>
                      <TableCell>
                        <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium ${statusCfg.className}`}>
                          {statusCfg.label}
                        </span>
                      </TableCell>
                      <TableCell className="hidden md:table-cell text-muted-foreground">
                        {task.assigned_name ?? "Unassigned"}
                      </TableCell>
                      <TableCell className="hidden lg:table-cell text-muted-foreground">
                        {formatDate(task.deadline)}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          {task.status !== "done" && (
                            <Select
                              value={task.status}
                              onValueChange={(v) => v && handleStatusChange(task.id, v as TaskStatus)}
                            >
                              <SelectTrigger className="h-7 w-auto border-0 bg-transparent text-xs font-medium text-[#2B7BC4] hover:bg-muted">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="todo">To Do</SelectItem>
                                <SelectItem value="in_progress">In Progress</SelectItem>
                                <SelectItem value="review">Review</SelectItem>
                                <SelectItem value="done">Done</SelectItem>
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

      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Create New Task</DialogTitle>
            <DialogDescription>
              Assign a task to a team member
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="task-title">Title</Label>
              <Input
                id="task-title"
                placeholder="e.g. Design Instagram carousel for Client X"
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="task-desc">Description (optional)</Label>
              <Textarea
                id="task-desc"
                placeholder="Add details about the task..."
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                rows={3}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Assign To</Label>
                <Select
                  value={form.assigned_to}
                  onValueChange={(v) => setForm({ ...form, assigned_to: v ?? "" })}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select member" />
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
              <div className="space-y-2">
                <Label>Priority</Label>
                <Select
                  value={form.priority}
                  onValueChange={(v) => setForm({ ...form, priority: (v as TaskPriority) ?? "medium" })}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="urgent">Urgent</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="task-client">Client Name</Label>
                <Input
                  id="task-client"
                  placeholder="Client name"
                  value={form.client_name}
                  onChange={(e) => setForm({ ...form, client_name: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="task-deadline">Deadline</Label>
                <Input
                  id="task-deadline"
                  type="date"
                  value={form.deadline}
                  onChange={(e) => setForm({ ...form, deadline: e.target.value })}
                />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateDialogOpen(false)} disabled={creating}>
              Cancel
            </Button>
            <Button onClick={handleCreate} disabled={creating}>
              {creating && <Loader2 className="mr-2 size-4 animate-spin" />}
              Create Task
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
