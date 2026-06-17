"use client"

import { useState } from "react"
import Link from "next/link"
import { Input } from "@/components/ui/input"
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
import { Badge } from "@/components/ui/badge"
import { Search, Users } from "lucide-react"

const MOCK_CLIENTS = [
  {
    id: "1",
    name: "Brew & Bloom Cafe",
    ownerName: "Sarah Chen",
    status: "Active",
    plan: "Growth",
    onboardingStage: "Complete",
    monthlyRevenue: "₹14,999",
  },
  {
    id: "2",
    name: "TechNova Solutions",
    ownerName: "Amit Patel",
    status: "Active",
    plan: "Pro",
    onboardingStage: "Complete",
    monthlyRevenue: "₹29,999",
  },
  {
    id: "3",
    name: "FreshCart",
    ownerName: "Meera Iyer",
    status: "Active",
    plan: "Starter",
    onboardingStage: "Complete",
    monthlyRevenue: "₹7,999",
  },
  {
    id: "4",
    name: "StyleHaus",
    ownerName: "Rohan Gupta",
    status: "Pending Payment",
    plan: "Growth",
    onboardingStage: "Payment",
    monthlyRevenue: "—",
  },
  {
    id: "5",
    name: "Urban Eats",
    ownerName: "Nisha Sharma",
    status: "Active",
    plan: "Pro",
    onboardingStage: "Complete",
    monthlyRevenue: "₹29,999",
  },
  {
    id: "6",
    name: "GreenLeaf Organics",
    ownerName: "Arjun Reddy",
    status: "Lapsed",
    plan: "Starter",
    onboardingStage: "Complete",
    monthlyRevenue: "₹0",
  },
]

function getStatusVariant(status: string) {
  switch (status) {
    case "Active":
      return "default"
    case "Pending Payment":
      return "secondary"
    case "Lapsed":
      return "destructive"
    default:
      return "outline"
  }
}

function getStatusColor(status: string) {
  switch (status) {
    case "Active":
      return "bg-emerald-50 text-emerald-700 border-emerald-200"
    case "Pending Payment":
      return "bg-amber-50 text-amber-700 border-amber-200"
    case "Lapsed":
      return "bg-red-50 text-red-700 border-red-200"
    default:
      return ""
  }
}

export default function AdminClientsPage() {
  const [search, setSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [planFilter, setPlanFilter] = useState("all")

  const filteredClients = MOCK_CLIENTS.filter((client) => {
    const matchesSearch =
      search === "" ||
      client.name.toLowerCase().includes(search.toLowerCase()) ||
      client.ownerName.toLowerCase().includes(search.toLowerCase())
    const matchesStatus =
      statusFilter === "all" || client.status === statusFilter
    const matchesPlan =
      planFilter === "all" || client.plan === planFilter
    return matchesSearch && matchesStatus && matchesPlan
  })

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[#0D2137]">
          Client Management
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          View and manage all client accounts
        </p>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search clients..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-9 pl-8"
          />
        </div>
        <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v ?? "all")}>
          <SelectTrigger className="w-full sm:w-[160px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="Active">Active</SelectItem>
            <SelectItem value="Pending Payment">Pending Payment</SelectItem>
            <SelectItem value="Lapsed">Lapsed</SelectItem>
          </SelectContent>
        </Select>
        <Select value={planFilter} onValueChange={(v) => setPlanFilter(v ?? "all")}>
          <SelectTrigger className="w-full sm:w-[160px]">
            <SelectValue placeholder="Plan" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Plans</SelectItem>
            <SelectItem value="Starter">Starter</SelectItem>
            <SelectItem value="Growth">Growth</SelectItem>
            <SelectItem value="Pro">Pro</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="rounded-lg border bg-white">
        {filteredClients.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="flex size-12 items-center justify-center rounded-full bg-muted">
              <Users className="size-6 text-muted-foreground" />
            </div>
            <h3 className="mt-4 text-sm font-semibold text-[#0D2137]">
              No clients found
            </h3>
            <p className="mt-1 max-w-sm text-sm text-muted-foreground">
              {search || statusFilter !== "all" || planFilter !== "all"
                ? "Try adjusting your search or filters."
                : "No clients yet. Share your pricing page to get started."}
            </p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Client Name</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Plan</TableHead>
                <TableHead className="hidden md:table-cell">
                  Onboarding Stage
                </TableHead>
                <TableHead className="hidden lg:table-cell">
                  Monthly Revenue
                </TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredClients.map((client) => (
                <TableRow key={client.id}>
                  <TableCell>
                    <div>
                      <Link
                        href={`/admin/clients/${client.id}`}
                        className="font-medium text-[#0D2137] hover:underline"
                      >
                        {client.name}
                      </Link>
                      <p className="text-xs text-muted-foreground">
                        {client.ownerName}
                      </p>
                    </div>
                  </TableCell>
                  <TableCell>
                    <span
                      className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium ${getStatusColor(
                        client.status
                      )}`}
                    >
                      {client.status}
                    </span>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">{client.plan}</Badge>
                  </TableCell>
                  <TableCell className="hidden md:table-cell text-muted-foreground">
                    {client.onboardingStage}
                  </TableCell>
                  <TableCell className="hidden lg:table-cell font-medium">
                    {client.monthlyRevenue}
                  </TableCell>
                  <TableCell className="text-right">
                    <Link
                      href={`/admin/clients/${client.id}`}
                      className="text-sm font-medium text-[#2B7BC4] hover:underline"
                    >
                      View
                    </Link>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>
    </div>
  )
}
