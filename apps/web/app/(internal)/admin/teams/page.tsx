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
import { Users, Plus, Pencil, Loader2 } from "lucide-react"
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
  return dept
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase())
}

function formatRole(role: string) {
  return role
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase())
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
      .then(setEmployees)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    fetchTeam()
  }, [])

  async function onSubmit(data: EmployeeFormData) {
    setSubmitting(true)
    try {
      const newMember = await adminFetch<TeamMember>("/api/v1/admin/team", {
        method: "POST",
        body: JSON.stringify({
          full_name: data.full_name,
          email: data.email,
          role: data.role,
          department: data.department,
          daily_cap_posters: data.daily_cap_posters,
          daily_cap_reels: data.daily_cap_reels,
          daily_cap_stories: data.daily_cap_stories,
        }),
      })
      setEmployees((prev) =>
        [...prev, newMember].sort((a, b) =>
          a.full_name.localeCompare(b.full_name)
        )
      )
      toast.success("Employee added successfully", {
        description: `${data.full_name} has been added to the ${formatDepartment(data.department)} team.`,
      })
      reset()
      setDrawerOpen(false)
    } catch (err) {
      toast.error("Failed to add employee", {
        description: err instanceof Error ? err.message : "Unknown error",
      })
    } finally {
      setSubmitting(false)
    }
  }

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
          <h1 className="text-2xl font-bold text-[#0D2137]">
            Team Management
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Manage team members, departments, and workloads
          </p>
        </div>
        <Button onClick={() => setDrawerOpen(true)}>
          <Plus className="size-4" />
          Add Employee
        </Button>
      </div>

      <div className="rounded-lg border bg-white">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Department</TableHead>
              <TableHead>Role</TableHead>
              <TableHead className="hidden md:table-cell">
                Daily Cap
              </TableHead>
              <TableHead className="hidden md:table-cell">Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {employees.map((emp) => {
              const cap = totalCap(emp)
              return (
                <TableRow key={emp.team_member_id}>
                  <TableCell>
                    <div>
                      <p className="font-medium text-[#0D2137]">
                        {emp.full_name}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {emp.email}
                      </p>
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
                    <span className="text-sm font-semibold text-[#0D2137]">
                      {cap}
                    </span>
                    <span className="text-sm text-muted-foreground">
                      {" "}
                      tasks/day
                    </span>
                  </TableCell>
                  <TableCell className="hidden md:table-cell">
                    <span
                      className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium ${
                        emp.is_active
                          ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                          : "border-gray-200 bg-gray-50 text-gray-500"
                      }`}
                    >
                      {emp.is_active ? "Active" : "Inactive"}
                    </span>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="sm">
                      <Pencil className="size-3.5" />
                      Edit
                    </Button>
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      </div>

      <Sheet open={drawerOpen} onOpenChange={setDrawerOpen}>
        <SheetContent side="right">
          <SheetHeader>
            <SheetTitle>Add Employee</SheetTitle>
            <SheetDescription>
              Add a new team member to your organization
            </SheetDescription>
          </SheetHeader>

          <form
            onSubmit={handleSubmit(onSubmit)}
            className="flex flex-1 flex-col gap-4 px-4"
          >
            <div className="space-y-2">
              <Label htmlFor="full_name">Name</Label>
              <Input
                id="full_name"
                placeholder="e.g. John Doe"
                {...register("full_name", { required: "Name is required" })}
              />
              {errors.full_name && (
                <p className="text-xs text-red-600">
                  {errors.full_name.message}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="e.g. john@creo.agency"
                {...register("email", {
                  required: "Email is required",
                  pattern: {
                    value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
                    message: "Invalid email address",
                  },
                })}
              />
              {errors.email && (
                <p className="text-xs text-red-600">{errors.email.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label>Department</Label>
              <Select
                value={departmentValue}
                onValueChange={(v) => setValue("department", v ?? "")}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select department" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="graphics">Graphics</SelectItem>
                  <SelectItem value="video">Video</SelectItem>
                  <SelectItem value="content_writing">
                    Content Writing
                  </SelectItem>
                  <SelectItem value="social_media">Social Media</SelectItem>
                  <SelectItem value="sales">Sales</SelectItem>
                  <SelectItem value="investor_relations">Investor Relations</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                  <SelectItem value="tech">Tech</SelectItem>
                </SelectContent>
              </Select>
              {errors.department && (
                <p className="text-xs text-red-600">
                  {errors.department.message}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label>Role</Label>
              <Select
                value={watch("role")}
                onValueChange={(v) => setValue("role", v ?? "")}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="team_member">Team Member</SelectItem>
                  <SelectItem value="team_lead">Team Lead</SelectItem>
                </SelectContent>
              </Select>
              {errors.role && (
                <p className="text-xs text-red-600">{errors.role.message}</p>
              )}
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-2">
                <Label htmlFor="daily_cap_posters">Posters</Label>
                <Input
                  id="daily_cap_posters"
                  type="number"
                  min={0}
                  {...register("daily_cap_posters", {
                    valueAsNumber: true,
                    min: { value: 0, message: "Min 0" },
                  })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="daily_cap_reels">Reels</Label>
                <Input
                  id="daily_cap_reels"
                  type="number"
                  min={0}
                  {...register("daily_cap_reels", {
                    valueAsNumber: true,
                    min: { value: 0, message: "Min 0" },
                  })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="daily_cap_stories">Stories</Label>
                <Input
                  id="daily_cap_stories"
                  type="number"
                  min={0}
                  {...register("daily_cap_stories", {
                    valueAsNumber: true,
                    min: { value: 0, message: "Min 0" },
                  })}
                />
              </div>
            </div>

            <SheetFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setDrawerOpen(false)}
                disabled={submitting}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={submitting}>
                {submitting ? (
                  <>
                    <Loader2 className="mr-2 size-4 animate-spin" />
                    Adding...
                  </>
                ) : (
                  "Add Employee"
                )}
              </Button>
            </SheetFooter>
          </form>
        </SheetContent>
      </Sheet>
    </div>
  )
}
