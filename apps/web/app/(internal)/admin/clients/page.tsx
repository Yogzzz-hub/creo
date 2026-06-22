"use client"

import { useEffect, useState } from "react"
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
import { Search, Users, Loader2 } from "lucide-react"
import { adminFetch } from "@/lib/admin-api"

interface Client {
  user_id: string
  business_name: string | null
  email: string
  plan_name: string | null
  status: string
  created_at: string
}

function getStatusColor(status: string) {
  switch (status) {
    case "active":
      return "bg-emerald-50 text-emerald-700 border-emerald-200"
    case "pending_payment":
      return "bg-amber-50 text-amber-700 border-amber-200"
    case "lapsed":
      return "bg-red-50 text-red-700 border-red-200"
    default:
      return ""
  }
}

function formatStatus(status: string) {
  return status
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase())
}

function formatPlan(plan: string | null) {
  if (!plan) return "—"
  return plan.charAt(0).toUpperCase() + plan.slice(1)
}

export default function AdminClientsPage() {
  const [clients, setClients] = useState<Client[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [planFilter, setPlanFilter] = useState("all")

  useEffect(() => {
    adminFetch<Client[]>("/api/v1/admin/clients")
      .then(setClients)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false))
  }, [])

  const filteredClients = clients.filter((client) => {
    const name = client.business_name ?? client.email
    const matchesSearch =
      search === "" ||
      name.toLowerCase().includes(search.toLowerCase()) ||
      client.email.toLowerCase().includes(search.toLowerCase())
    const matchesStatus =
      statusFilter === "all" || client.status === statusFilter
    const matchesPlan =
      planFilter === "all" ||
      (client.plan_name ?? "").toLowerCase() === planFilter
    return matchesSearch && matchesStatus && matchesPlan
  })

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
        Failed to load clients: {error}
      </div>
    )
  }

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
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="pending_payment">Pending Payment</SelectItem>
            <SelectItem value="lapsed">Lapsed</SelectItem>
          </SelectContent>
        </Select>
        <Select value={planFilter} onValueChange={(v) => setPlanFilter(v ?? "all")}>
          <SelectTrigger className="w-full sm:w-[160px]">
            <SelectValue placeholder="Plan" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Plans</SelectItem>
            <SelectItem value="starter">Starter</SelectItem>
            <SelectItem value="growth">Growth</SelectItem>
            <SelectItem value="pro">Pro</SelectItem>
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
                : "No clients yet."}
            </p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Client Name</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Plan</TableHead>
                <TableHead className="hidden md:table-cell">Email</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredClients.map((client) => (
                <TableRow key={client.user_id}>
                  <TableCell>
                    <Link
                      href={`/admin/clients/${client.user_id}`}
                      className="font-medium text-[#0D2137] hover:underline"
                    >
                      {client.business_name ?? "Unnamed"}
                    </Link>
                    <p className="text-xs text-muted-foreground">
                      {client.email}
                    </p>
                  </TableCell>
                  <TableCell>
                    <span
                      className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium ${getStatusColor(
                        client.status
                      )}`}
                    >
                      {formatStatus(client.status)}
                    </span>
                  </TableCell>
                  <TableCell>{formatPlan(client.plan_name)}</TableCell>
                  <TableCell className="hidden md:table-cell text-muted-foreground">
                    {client.email}
                  </TableCell>
                  <TableCell className="text-right">
                    <Link
                      href={`/admin/clients/${client.user_id}`}
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
