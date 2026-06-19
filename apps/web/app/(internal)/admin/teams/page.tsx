"use client"

import { useState } from "react"
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
import { Users, Plus, Pencil } from "lucide-react"
import { toast } from "sonner"

const employeeSchema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.string().email("Invalid email address"),
  department: z.string().min(1, "Department is required"),
  role: z.string().min(1, "Role is required"),
  dailyCap: z.number().min(1, "Daily cap must be at least 1"),
})

type EmployeeFormData = z.infer<typeof employeeSchema>

const MOCK_EMPLOYEES = [
  {
    id: "1",
    name: "Priya Sharma",
    email: "priya@creo.agency",
    department: "Graphics",
    role: "Senior Graphic Designer",
    dailyCap: 6,
    activeClients: 4,
    currentLoad: 4,
  },
  {
    id: "2",
    name: "Rahul Mehta",
    email: "rahul@creo.agency",
    department: "Video",
    role: "Video Editor",
    dailyCap: 4,
    activeClients: 3,
    currentLoad: 3,
  },
  {
    id: "3",
    name: "Ananya Kumar",
    email: "ananya@creo.agency",
    department: "Content",
    role: "Content Writer",
    dailyCap: 5,
    activeClients: 5,
    currentLoad: 4,
  },
  {
    id: "4",
    name: "Vikram Desai",
    email: "vikram@creo.agency",
    department: "Video",
    role: "Motion Graphics Artist",
    dailyCap: 3,
    activeClients: 2,
    currentLoad: 3,
  },
  {
    id: "5",
    name: "Neha Gupta",
    email: "neha@creo.agency",
    department: "Graphics",
    role: "Junior Graphic Designer",
    dailyCap: 6,
    activeClients: 3,
    currentLoad: 2,
  },
  {
    id: "6",
    name: "Arjun Reddy",
    email: "arjun@creo.agency",
    department: "Sales",
    role: "Account Manager",
    dailyCap: 8,
    activeClients: 6,
    currentLoad: 5,
  },
  {
    id: "7",
    name: "Kavitha Nair",
    email: "kavitha@creo.agency",
    department: "Content",
    role: "Social Media Strategist",
    dailyCap: 5,
    activeClients: 4,
    currentLoad: 4,
  },
  {
    id: "8",
    name: "Sanjay Joshi",
    email: "sanjay@creo.agency",
    department: "Admin",
    role: "Operations Manager",
    dailyCap: 10,
    activeClients: 0,
    currentLoad: 0,
  },
]

function getLoadColor(current: number, cap: number) {
  const ratio = current / cap
  if (ratio >= 1) return "text-red-600"
  if (ratio >= 0.75) return "text-amber-600"
  return "text-emerald-600"
}

export default function TeamManagementPage() {
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [employees, setEmployees] = useState(MOCK_EMPLOYEES)

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors },
  } = useForm<EmployeeFormData>({
    defaultValues: {
      name: "",
      email: "",
      department: "",
      role: "",
      dailyCap: 6,
    },
  })

  const departmentValue = watch("department")

  function onSubmit(data: EmployeeFormData) {
    const newEmployee = {
      id: String(employees.length + 1),
      name: data.name,
      email: data.email,
      department: data.department,
      role: data.role,
      dailyCap: data.dailyCap,
      activeClients: 0,
      currentLoad: 0,
    }
    setEmployees([...employees, newEmployee])
    toast.success("Employee added successfully", {
      description: `${data.name} has been added to the ${data.department} team.`,
    })
    reset()
    setDrawerOpen(false)
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
              <TableHead className="hidden md:table-cell">
                Active Clients
              </TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {employees.map((emp) => (
              <TableRow key={emp.id}>
                <TableCell>
                  <div>
                    <p className="font-medium text-[#0D2137]">{emp.name}</p>
                    <p className="text-xs text-muted-foreground">{emp.email}</p>
                  </div>
                </TableCell>
                <TableCell>
                  <span className="inline-flex items-center rounded-full border border-border bg-muted px-2 py-0.5 text-xs font-medium">
                    {emp.department}
                  </span>
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {emp.role}
                </TableCell>
                <TableCell className="hidden md:table-cell">
                  <span
                    className={`text-sm font-semibold ${getLoadColor(
                      emp.currentLoad,
                      emp.dailyCap
                    )}`}
                  >
                    {emp.currentLoad}
                  </span>
                  <span className="text-sm text-muted-foreground">
                    /{emp.dailyCap} tasks
                  </span>
                </TableCell>
                <TableCell className="hidden md:table-cell text-muted-foreground">
                  {emp.activeClients}
                </TableCell>
                <TableCell className="text-right">
                  <Button variant="ghost" size="sm">
                    <Pencil className="size-3.5" />
                    Edit
                  </Button>
                </TableCell>
              </TableRow>
            ))}
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
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                placeholder="e.g. John Doe"
                {...register("name", { required: "Name is required" })}
              />
              {errors.name && (
                <p className="text-xs text-red-600">{errors.name.message}</p>
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
                  <SelectItem value="Graphics">Graphics</SelectItem>
                  <SelectItem value="Video">Video</SelectItem>
                  <SelectItem value="Content">Content</SelectItem>
                  <SelectItem value="Sales">Sales</SelectItem>
                  <SelectItem value="Admin">Admin</SelectItem>
                </SelectContent>
              </Select>
              {errors.department && (
                <p className="text-xs text-red-600">
                  {errors.department.message}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="role">Role</Label>
              <Input
                id="role"
                placeholder="e.g. Senior Graphic Designer"
                {...register("role", { required: "Role is required" })}
              />
              {errors.role && (
                <p className="text-xs text-red-600">{errors.role.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="dailyCap">Daily Cap (tasks)</Label>
              <Input
                id="dailyCap"
                type="number"
                min={1}
                {...register("dailyCap", {
                  required: "Daily cap is required",
                  valueAsNumber: true,
                  min: { value: 1, message: "Must be at least 1" },
                })}
              />
              {errors.dailyCap && (
                <p className="text-xs text-red-600">
                  {errors.dailyCap.message}
                </p>
              )}
            </div>

            <SheetFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setDrawerOpen(false)}
              >
                Cancel
              </Button>
              <Button type="submit">Add Employee</Button>
            </SheetFooter>
          </form>
        </SheetContent>
      </Sheet>
    </div>
  )
}
