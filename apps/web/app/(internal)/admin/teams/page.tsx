"use client"

import { useEffect, useState } from "react"
import { useForm } from "react-hook-form"
import { z } from "zod"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
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
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
} from "@/components/ui/sheet"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Users, Plus, Pencil, Loader2, Search, Trash2, Copy, CheckCircle2, ShieldAlert } from "lucide-react"
import { toast } from "sonner"
import { adminFetch } from "@/lib/admin-api"

const employeeSchema = z.object({
  full_name: z.string().min(1, "Name is required"),
  email: z.string().email("Invalid email address"),
  department: z.string().min(1, "Department is required"),
  role: z.string().min(1, "Role is required"),
  daily_cap_posters: z.number().min(0),
  daily_cap_reels: z.number().min(0),
  daily_cap_stories: z.number().min(0),
})

type EmployeeFormData = z.infer<typeof employeeSchema>

interface TeamMember {
  team_member_id: string
  user_id: string
  full_name: string
  email: string
  role: string
  department: string
  daily_cap_posters: number
  daily_cap_reels: number
  daily_cap_stories: number
  is_active: boolean
  joined_at: string
}

function formatDepartment(dept: string) {
  return dept.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())
}

function formatRole(role: string) {
  return role.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())
}

function totalCap(m: TeamMember) {
  return m.daily_cap_posters + m.daily_cap_reels + m.daily_cap_stories
}

export default function TeamManagementPage() {
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [employees, setEmployees] = useState<TeamMember[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [search, setSearch] = useState("")
  const [deptFilter, setDeptFilter] = useState("all")

  // State to track if we are editing an existing employee
  const [editingId, setEditingId] = useState<string | null>(null)

  // One-Time Password Reveal modal state
  const [newCredentials, setNewCredentials] = useState<{ password: string; name: string } | null>(null)
  const [copied, setCopied] = useState(false)

  // Delete confirmation dialog state
  const [deletingMember, setDeletingMember] = useState<TeamMember | null>(null)
  const [deleting, setDeleting] = useState(false)

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors },
  } = useForm<EmployeeFormData>({
    defaultValues: {
      full_name: "",
      email: "",
      department: "",
      role: "",
      daily_cap_posters: 6,
      daily_cap_reels: 4,
      daily_cap_stories: 3,
    },
  })

  const departmentValue = watch("department")

  function fetchTeam() {
    adminFetch<TeamMember[]>("/api/v1/admin/team")
      .then((data) => {
        // Defensively filter out null/undefined items from the API response
        setEmployees(Array.isArray(data) ? data.filter((e) => e != null) : [])
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    fetchTeam()
  }, [])

  // Function to handle clicking the Edit button
  function handleEdit(emp: TeamMember) {
    reset({
      full_name: emp.full_name,
      email: emp.email,
      department: emp.department,
      role: emp.role,
      daily_cap_posters: emp.daily_cap_posters,
      daily_cap_reels: emp.daily_cap_reels,
      daily_cap_stories: emp.daily_cap_stories,
    })
    setEditingId(emp.team_member_id)
    setDrawerOpen(true)
  }

  // Copy password to clipboard
  async function handleCopyPassword() {
    if (!newCredentials) return
    try {
      await navigator.clipboard.writeText(newCredentials.password)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      toast.error("Failed to copy to clipboard")
    }
  }

  // Delete employee handler
  async function handleDeleteConfirm() {
    if (!deletingMember) return
    setDeleting(true)
    try {
      await adminFetch(`/api/v1/admin/team/${deletingMember.team_member_id}`, {
        method: "DELETE",
      })
      setEmployees((prev) =>
        prev.filter((emp) => emp.team_member_id !== deletingMember.team_member_id)
      )
      toast.success("Employee removed", {
        description: `${deletingMember.full_name} has been removed from the team.`,
      })
      setDeletingMember(null)
    } catch (err) {
      toast.error("Failed to remove employee", {
        description: err instanceof Error ? err.message : "Unknown error",
      })
    } finally {
      setDeleting(false)
    }
  }

  async function onSubmit(data: EmployeeFormData) {
    setSubmitting(true)
    try {
      if (editingId) {
        // UPDATE EXISTING EMPLOYEE (Using PATCH)
        const updatedMember = await adminFetch<TeamMember>(`/api/v1/admin/team/${editingId}`, {
          method: "PATCH",
          body: JSON.stringify({
            full_name: data.full_name, // Added this!
            role: data.role,           // Added this!
            department: data.department,
            daily_poster_cap: data.daily_cap_posters, // Mapped for backend
            daily_reel_cap: data.daily_cap_reels,     // Mapped for backend
            daily_story_cap: data.daily_cap_stories,  // Mapped for backend
            is_active: true,
          }),
        })
        if (!updatedMember) {
          throw new Error("Server failed to return updated employee data")
        }
        setEmployees((prev) =>
          prev.map((emp) => (emp.team_member_id === editingId ? updatedMember : emp))
        )
        toast.success("Employee updated successfully")
      } else {
        // CREATE NEW EMPLOYEE
        const response = await adminFetch<{ status: string; temp_password: string; team_member: TeamMember }>("/api/v1/admin/team", {
          method: "POST",
          body: JSON.stringify({
            full_name: data.full_name,
            email: data.email,
            role: data.role,
            department: data.department,
            daily_poster_cap: data.daily_cap_posters, // Mapped for backend
            daily_reel_cap: data.daily_cap_reels,     // Mapped for backend
            daily_story_cap: data.daily_cap_stories,  // Mapped for backend
          }),
        })
        const newMember = response.team_member
        if (!newMember) {
          throw new Error("Server failed to return new employee data")
        }
        setEmployees((prev) =>
          [...prev, newMember].sort((a, b) => a.full_name.localeCompare(b.full_name))
        )
        // Show the one-time password reveal modal instead of a toast
        setNewCredentials({
          password: response.temp_password,
          name: newMember.full_name,
        })
      }
      reset()
      setEditingId(null)
      setDrawerOpen(false)
    } catch (err) {
      toast.error(editingId ? "Failed to update employee" : "Failed to add employee", {
        description: err instanceof Error ? err.message : "Unknown error",
      })
    } finally {
      setSubmitting(false)
    }
  }

  const filtered = employees.filter((emp) => {
    const matchesSearch =
      search === "" ||
      emp.full_name.toLowerCase().includes(search.toLowerCase()) ||
      emp.email.toLowerCase().includes(search.toLowerCase())
    const matchesDept = deptFilter === "all" || emp.department === deptFilter
    return matchesSearch && matchesDept
  })

  const departments = [...new Set(employees.map((e) => e.department))]
  const activeMembers = employees.filter((e) => e.is_active)
  const totalCapacity = activeMembers.reduce((sum, m) => sum + totalCap(m), 0)

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
        Failed to load team: {error}
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-muted-foreground">
            Manage team members, departments, and workloads
          </p>
        </div>
        <Button
          onClick={() => {
            // Reset form for new entry
            reset({
              full_name: "",
              email: "",
              department: "",
              role: "",
              daily_cap_posters: 6,
              daily_cap_reels: 4,
              daily_cap_stories: 3,
            })
            setEditingId(null)
            setDrawerOpen(true)
          }}
        >
          <Plus className="size-4" />
          Add Employee
        </Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Members</CardTitle>
            <Users className="size-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-[#0D2137]">{employees.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Active Members</CardTitle>
            <Users className="size-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-emerald-600">{activeMembers.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Daily Capacity</CardTitle>
            <Users className="size-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-[#0D2137]">{totalCapacity}</div>
            <p className="mt-1 text-xs text-muted-foreground">tasks/day</p>
          </CardContent>
        </Card>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search by name or email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-9 pl-8"
          />
        </div>
        <Select value={deptFilter} onValueChange={(v) => setDeptFilter(v ?? "all")}>
          <SelectTrigger className="w-full sm:w-[180px]">
            <SelectValue placeholder="Department" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Departments</SelectItem>
            {departments.map((d) => (
              <SelectItem key={d} value={d}>{formatDepartment(d)}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="rounded-lg border bg-white">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Department</TableHead>
              <TableHead>Role</TableHead>
              <TableHead className="hidden md:table-cell">Daily Cap</TableHead>
              <TableHead className="hidden md:table-cell">Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="h-24 text-center">
                  <p className="text-sm text-muted-foreground">No team members found.</p>
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((emp) => {
                const cap = totalCap(emp)
                return (
                  <TableRow key={emp.team_member_id}>
                    <TableCell>
                      <div>
                        <p className="font-medium text-[#0D2137]">{emp.full_name}</p>
                        <p className="text-xs text-muted-foreground">{emp.email}</p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="inline-flex items-center rounded-full border border-border bg-muted px-2 py-0.5 text-xs font-medium">
                        {formatDepartment(emp.department)}
                      </span>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {formatRole(emp.role)}
                    </TableCell>
                    <TableCell className="hidden md:table-cell">
                      <span className="text-sm font-semibold text-[#0D2137]">{cap}</span>
                      <span className="text-sm text-muted-foreground"> tasks/day</span>
                    </TableCell>
                    <TableCell className="hidden md:table-cell">
                      <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium ${emp.is_active
                          ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                          : "border-gray-200 bg-gray-50 text-gray-500"
                        }`}>
                        {emp.is_active ? "Active" : "Inactive"}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        {/* Fully Functional Edit Button */}
                        <Button variant="ghost" size="sm" onClick={() => handleEdit(emp)}>
                          <Pencil className="size-3.5" />
                          Edit
                        </Button>
                        {/* Remove Account Button */}
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-red-600 hover:text-red-700 hover:bg-red-50"
                          onClick={() => setDeletingMember(emp)}
                        >
                          <Trash2 className="size-3.5" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                )
              })
            )}
          </TableBody>
        </Table>
      </div>

      {/* ── Add / Edit Employee Sheet ─────────────────────────────────── */}
      <Sheet open={drawerOpen} onOpenChange={(open) => {
        setDrawerOpen(open)
        if (!open) {
          setEditingId(null)
          reset()
        }
      }}>
        <SheetContent side="right">
          <SheetHeader>
            <SheetTitle>{editingId ? "Edit Employee" : "Add Employee"}</SheetTitle>
            <SheetDescription>
              {editingId ? "Update team member details" : "Add a new team member to your organization"}
            </SheetDescription>
          </SheetHeader>

          <form onSubmit={handleSubmit(onSubmit)} className="flex flex-1 flex-col gap-4 px-4 mt-6">
            <div className="space-y-2">
              <Label htmlFor="full_name">Name</Label>
              <Input
                id="full_name"
                placeholder="e.g. John Doe"
                {...register("full_name", { required: "Name is required" })}
              />
              {errors.full_name && <p className="text-xs text-red-600">{errors.full_name.message}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="e.g. john@creo.agency"
                disabled={!!editingId} // Email cannot be edited once user is created
                {...register("email", { required: "Email is required", pattern: { value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/, message: "Invalid email address" } })}
              />
              {errors.email && <p className="text-xs text-red-600">{errors.email.message}</p>}
            </div>

            <div className="space-y-2">
              <Label>Department</Label>
              <Select value={departmentValue} onValueChange={(v) => setValue("department", v ?? "")}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select department" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="graphics">Graphics</SelectItem>
                  <SelectItem value="video">Video</SelectItem>
                  <SelectItem value="content_writing">Content Writing</SelectItem>
                  <SelectItem value="social_media">Social Media</SelectItem>
                  <SelectItem value="sales">Sales</SelectItem>
                  <SelectItem value="investor_relations">Investor Relations</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                  <SelectItem value="tech">Tech</SelectItem>
                </SelectContent>
              </Select>
              {errors.department && <p className="text-xs text-red-600">{errors.department.message}</p>}
            </div>

            <div className="space-y-2">
              <Label>Role</Label>
              <Select disabled={!!editingId} value={watch("role")} onValueChange={(v) => setValue("role", v ?? "")}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="team_member">Team Member</SelectItem>
                  <SelectItem value="team_lead">Team Lead</SelectItem>
                </SelectContent>
              </Select>
              {errors.role && <p className="text-xs text-red-600">{errors.role.message}</p>}
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-2">
                <Label htmlFor="daily_cap_posters">Posters</Label>
                <Input id="daily_cap_posters" type="number" min={0} {...register("daily_cap_posters", { valueAsNumber: true, min: { value: 0, message: "Min 0" } })} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="daily_cap_reels">Reels</Label>
                <Input id="daily_cap_reels" type="number" min={0} {...register("daily_cap_reels", { valueAsNumber: true, min: { value: 0, message: "Min 0" } })} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="daily_cap_stories">Stories</Label>
                <Input id="daily_cap_stories" type="number" min={0} {...register("daily_cap_stories", { valueAsNumber: true, min: { value: 0, message: "Min 0" } })} />
              </div>
            </div>

            <SheetFooter className="mt-4">
              <Button type="button" variant="outline" onClick={() => setDrawerOpen(false)} disabled={submitting}>Cancel</Button>
              <Button type="submit" disabled={submitting}>
                {submitting ? (
                  <><Loader2 className="mr-2 size-4 animate-spin" />{editingId ? "Saving..." : "Adding..."}</>
                ) : (
                  editingId ? "Save Changes" : "Add Employee"
                )}
              </Button>
            </SheetFooter>
          </form>
        </SheetContent>
      </Sheet>

      {/* ── One-Time Password Reveal Modal ────────────────────────────── */}
      <Dialog
        open={!!newCredentials}
        onOpenChange={(open) => {
          if (!open) {
            setNewCredentials(null)
            setCopied(false)
          }
        }}
      >
        <DialogContent showCloseButton={false} className="sm:max-w-md">
          <DialogHeader>
            <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-emerald-100">
              <CheckCircle2 className="size-6 text-emerald-600" />
            </div>
            <DialogTitle className="text-center text-lg">Employee Added</DialogTitle>
            <DialogDescription className="text-center">
              <strong>{newCredentials?.name}</strong> has been added to the team. Share the temporary password below so they can log in.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
            <Label className="text-xs font-medium text-muted-foreground">Temporary Password</Label>
            <div className="flex items-center gap-2">
              <div className="flex-1 rounded-lg border bg-muted/50 px-4 py-3">
                <code className="text-sm font-mono font-semibold tracking-wide text-[#0D2137] select-all">
                  {newCredentials?.password}
                </code>
              </div>
              <Button
                variant="outline"
                size="sm"
                className="shrink-0"
                onClick={handleCopyPassword}
              >
                {copied ? (
                  <><CheckCircle2 className="size-3.5 text-emerald-600" /> Copied</>
                ) : (
                  <><Copy className="size-3.5" /> Copy</>
                )}
              </Button>
            </div>

            <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2.5">
              <ShieldAlert className="mt-0.5 size-4 shrink-0 text-amber-600" />
              <p className="text-xs text-amber-800">
                This password is shown <strong>only once</strong> and cannot be retrieved later. Please copy it now and share it securely with the employee.
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button
              className="w-full sm:w-auto"
              onClick={() => {
                setNewCredentials(null)
                setCopied(false)
              }}
            >
              Done
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Delete Confirmation Dialog ────────────────────────────────── */}
      <Dialog
        open={!!deletingMember}
        onOpenChange={(open) => {
          if (!open && !deleting) {
            setDeletingMember(null)
          }
        }}
      >
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-red-100">
              <Trash2 className="size-5 text-red-600" />
            </div>
            <DialogTitle className="text-center">Remove Employee</DialogTitle>
            <DialogDescription className="text-center">
              Are you sure you want to remove <strong>{deletingMember?.full_name}</strong>? This will deactivate their account and revoke access.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              disabled={deleting}
              onClick={() => setDeletingMember(null)}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              disabled={deleting}
              onClick={handleDeleteConfirm}
            >
              {deleting ? (
                <><Loader2 className="mr-2 size-4 animate-spin" /> Removing...</>
              ) : (
                "Remove"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}