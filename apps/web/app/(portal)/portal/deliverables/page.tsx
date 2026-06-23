"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { createClient } from "@/lib/supabase/client"
import { ArrowLeft, FileImage, Film, Layers, SlidersHorizontal, Zap, ArrowRight } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { cn } from "@/lib/utils"

type DeliverableType = "poster" | "reel" | "story"
type DisplayStatus = "pending" | "approved" | "revision" | "rejected"

interface ApiDeliverable {
  id: string
  task_id: string
  file_url: string
  file_type: string
  status: string
  revision_round: number
  created_at: string
}

interface Deliverable {
  id: string
  title: string
  type: DeliverableType
  status: DisplayStatus
  uploadDate: string
}

const TYPE_ICONS: Record<DeliverableType, typeof FileImage> = {
  poster: FileImage,
  reel: Film,
  story: Layers,
}

const STATUS_CONFIG: Record<
  DisplayStatus,
  { label: string; className: string }
> = {
  pending: {
    label: "Pending Approval",
    className: "bg-amber-100 text-amber-800 border-amber-200",
  },
  approved: {
    label: "Approved",
    className: "bg-emerald-100 text-emerald-800 border-emerald-200",
  },
  revision: {
    label: "Revision In Progress",
    className: "bg-purple-100 text-purple-800 border-purple-200",
  },
  rejected: {
    label: "Rejected",
    className: "bg-red-100 text-red-800 border-red-200",
  },
}

function inferType(fileUrl: string, fileType: string): DeliverableType {
  const ext = fileUrl.split(".").pop()?.toLowerCase() ?? ""
  if (fileType.includes("video") || ext === "mp4" || ext === "mov") return "reel"
  if (fileType.includes("image") || ["jpg", "jpeg", "png", "webp"].includes(ext)) {
    if (ext === "png" && fileType.includes("story")) return "story"
    return "poster"
  }
  return "poster"
}

function mapStatus(apiStatus: string): DisplayStatus {
  switch (apiStatus) {
    case "pending_approval":
    case "pending":
      return "pending"
    case "approved":
      return "approved"
    case "rejected":
      return "rejected"
    case "revision":
      return "revision"
    default:
      return "pending"
  }
}

function formatDate(dateString: string): string {
  const date = new Date(dateString)
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  })
}

export default function DeliverablesPage() {
  const [typeFilter, setTypeFilter] = useState<string>("all")
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [deliverables, setDeliverables] = useState<Deliverable[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchDeliverables() {
      const supabase = createClient()
      const {
        data: { session },
      } = await supabase.auth.getSession()

      if (!session?.access_token) {
        setLoading(false)
        return
      }

      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/v1/deliverables`,
        {
          headers: { Authorization: `Bearer ${session.access_token}` },
        }
      )

      if (!res.ok) {
        setLoading(false)
        return
      }

      const data: ApiDeliverable[] = await res.json()
      const mapped: Deliverable[] = data.map((d) => ({
        id: d.id,
        title: `Deliverable — Round ${d.revision_round}`,
        type: inferType(d.file_url, d.file_type),
        status: mapStatus(d.status),
        uploadDate: d.created_at,
      }))
      setDeliverables(mapped)
      setLoading(false)
    }

    fetchDeliverables()
  }, [])

  const filtered = deliverables.filter((d) => {
    if (typeFilter !== "all" && d.type !== typeFilter) return false
    if (statusFilter !== "all" && d.status !== statusFilter) return false
    return true
  })

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div className="flex items-center gap-3">
        <Link
          href="/portal"
          className="flex size-8 items-center justify-center rounded-lg text-gray-400 transition-colors hover:bg-white hover:text-gray-700"
        >
          <ArrowLeft className="size-4" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-[#0D2137]">Deliverables</h1>
          <p className="mt-0.5 text-sm text-gray-500">
            Review and approve content created for your brand.
          </p>
        </div>
      </div>

      <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex size-9 items-center justify-center rounded-lg bg-amber-100">
              <Zap className="size-5 text-amber-600" />
            </div>
            <div>
              <p className="text-sm font-semibold text-amber-900">
                Need more content?
              </p>
              <p className="text-xs text-amber-700">
                Purchase extra credits for posters, reels, or stories.
              </p>
            </div>
          </div>
          <Link href="/portal/addons">
            <Button
              size="sm"
              className="bg-amber-600 text-white hover:bg-amber-700 shrink-0"
            >
              Buy Add-ons
              <ArrowRight className="size-3.5" />
            </Button>
          </Link>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <SlidersHorizontal className="size-4" />
          Filters
        </div>

        <Select value={typeFilter} onValueChange={(v) => setTypeFilter(v ?? "all")}>
          <SelectTrigger className="w-[140px] bg-white">
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
          <SelectTrigger className="w-[180px] bg-white">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="pending">Pending Approval</SelectItem>
            <SelectItem value="approved">Approved</SelectItem>
            <SelectItem value="revision">Revision In Progress</SelectItem>
            <SelectItem value="rejected">Rejected</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="rounded-xl shadow-[var(--shadow-card)]">
              <CardContent className="p-0">
                <div className="aspect-[4/3] animate-pulse bg-gray-100" />
                <div className="space-y-3 p-4">
                  <div className="h-4 w-3/4 animate-pulse rounded bg-gray-100" />
                  <div className="h-3 w-1/2 animate-pulse rounded bg-gray-100" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <Card className="rounded-xl shadow-[var(--shadow-card)]">
          <CardContent className="flex flex-col items-center justify-center py-16">
            <div className="flex size-16 items-center justify-center rounded-full bg-gray-100">
              <FileImage className="size-8 text-gray-300" />
            </div>
            <h3 className="mt-4 text-base font-semibold text-[#0D2137]">
              No content yet
            </h3>
            <p className="mt-1 max-w-sm text-center text-sm text-gray-500">
              Your team is working on your first batch. Check back soon!
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((deliverable) => {
            const TypeIcon = TYPE_ICONS[deliverable.type]

            return (
              <Link
                key={deliverable.id}
                href={`/portal/deliverables/${deliverable.id}`}
              >
                <Card className="group cursor-pointer rounded-xl shadow-[var(--shadow-card)] transition-all hover:shadow-md hover:ring-2 hover:ring-[#2B7BC4]/20">
                  <CardContent className="p-0">
                    <div className="relative aspect-[4/3] bg-gradient-to-br from-gray-100 to-gray-50 flex items-center justify-center">
                      {deliverable.type === "reel" ? (
                        <div className="flex flex-col items-center gap-2">
                          <div className="flex size-12 items-center justify-center rounded-full bg-black/10">
                            <Film className="size-6 text-gray-400" />
                          </div>
                          <span className="text-xs text-gray-400">Video</span>
                        </div>
                      ) : (
                        <div className="flex flex-col items-center gap-2">
                          <TypeIcon className="size-10 text-gray-300" />
                          <span className="text-xs text-gray-400 capitalize">
                            {deliverable.type}
                          </span>
                        </div>
                      )}
                    </div>

                    <div className="space-y-3 p-4">
                      <div className="flex items-start justify-between gap-2">
                        <h3 className="text-sm font-semibold text-[#0D2137] line-clamp-2 group-hover:text-[#2B7BC4]">
                          {deliverable.title}
                        </h3>
                      </div>

                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5 text-xs text-gray-400">
                          <TypeIcon className="size-3" />
                          <span className="capitalize">{deliverable.type}</span>
                          <span className="text-gray-300">·</span>
                          <span>{formatDate(deliverable.uploadDate)}</span>
                        </div>
                      </div>

                      <Badge
                        className={cn(
                          "w-fit border text-[10px] font-medium",
                          STATUS_CONFIG[deliverable.status].className
                        )}
                      >
                        {STATUS_CONFIG[deliverable.status].label}
                      </Badge>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
