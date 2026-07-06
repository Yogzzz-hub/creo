"use client"

import { useState, useEffect, use } from "react"
import Link from "next/link"
import {
  ArrowLeft,
  Camera,
  Check,
  Download,
  Film,
  FileImage,
  Layers,
  Play,
  X,
  Loader2,
  Sparkles,
  ArrowRight,
} from "lucide-react"
import { useForm } from "react-hook-form"
import { z } from "zod/v4"
import { zodResolver } from "@hookform/resolvers/zod"
import { toast } from "sonner"
import { apiFetch } from "@/lib/api"
import { useSession } from "@/context/session-context"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { cn } from "@/lib/utils"
import { useSubscription } from "@/context/subscription-context"

type DeliverableType = "poster" | "reel" | "story"
type DeliverableStatus = "pending" | "approved" | "revision" | "rejected"

interface ApiDeliverable {
  id: string
  task_id: string
  file_url: string
  file_type: string
  file_size_bytes: number
  status: string
  revision_round: number
  created_at: string
  approved_at: string | null
  rejected_at: string | null
  instagram_post_id: string | null
  instagram_published_at: string | null
}

interface Deliverable {
  id: string
  title: string
  type: DeliverableType
  status: DeliverableStatus
  uploadDate: string
  fileUrl: string
  instagramPostId: string | null
}

function inferType(fileUrl: string, fileType: string): DeliverableType {
  const ext = fileUrl.split(".").pop()?.toLowerCase() ?? ""
  if (fileType.includes("video") || ext === "mp4" || ext === "mov") return "reel"
  if (fileType.includes("image") || ["jpg", "jpeg", "png", "webp"].includes(ext)) {
    return "poster"
  }
  return "story"
}

function mapStatus(apiStatus: string): DeliverableStatus {
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

const TYPE_ICONS: Record<DeliverableType, typeof FileImage> = {
  poster: FileImage,
  reel: Film,
  story: Layers,
}

const STATUS_CONFIG: Record<
  DeliverableStatus,
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

const rejectionSchema = z.object({
  comment_text: z
    .string()
    .min(1, "Please provide a reason for rejection")
    .min(10, "Please provide at least 10 characters"),
})

type RejectionFormData = z.infer<typeof rejectionSchema>

function formatDate(dateString: string): string {
  const date = new Date(dateString)
  return date.toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  })
}

export default function DeliverableDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = use(params)
  const { token } = useSession()
  const [deliverable, setDeliverable] = useState<Deliverable | null>(null)
  const [loading, setLoading] = useState(true)
  const [fetchError, setFetchError] = useState<"forbidden" | "not_found" | "generic" | null>(null)
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false)
  const [isRejecting, setIsRejecting] = useState(false)
  const [videoPlaying, setVideoPlaying] = useState(false)
  const { isLapsed } = useSubscription()
  const [isApproving, setIsApproving] = useState(false)
  const [isPublishing, setIsPublishing] = useState(false)
  const [showUpsell, setShowUpsell] = useState(false)

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<RejectionFormData>({
    resolver: zodResolver(rejectionSchema),
    defaultValues: { comment_text: "" },
  })

  useEffect(() => {
    async function fetchDeliverable() {
      try {
        const data = (await apiFetch(
          `/api/v1/deliverables/${id}`,
          {},
          token
        )) as ApiDeliverable
        setDeliverable({
          id: data.id,
          title: `Deliverable — Round ${data.revision_round}`,
          type: inferType(data.file_url, data.file_type),
          status: mapStatus(data.status),
          uploadDate: data.created_at,
          fileUrl: data.file_url,
          instagramPostId: data.instagram_post_id ?? null,
        })
      } catch (err) {
        const msg = err instanceof Error ? err.message : ""
        if (msg.includes("403")) {
          setFetchError("forbidden")
        } else if (msg.includes("404")) {
          setFetchError("not_found")
        } else {
          setFetchError("generic")
        }
      } finally {
        setLoading(false)
      }
    }
    fetchDeliverable()
  }, [id, token])

  async function handleApprove() {
    if (!deliverable) return
    setIsApproving(true)
    try {
      const data = (await apiFetch(
        `/api/v1/deliverables/${deliverable.id}/approve`,
        { method: "POST" },
        token
      )) as ApiDeliverable
      setDeliverable((prev) =>
        prev ? { ...prev, status: mapStatus(data.status) } : prev
      )
      setShowUpsell(true)
      toast.success("Deliverable approved!")
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to approve")
    } finally {
      setIsApproving(false)
    }
  }

  async function handleRejectSubmit(data: RejectionFormData) {
    if (!deliverable) return
    setIsRejecting(true)
    try {
      const res = (await apiFetch(
        `/api/v1/deliverables/${deliverable.id}/reject`,
        {
          method: "POST",
          body: JSON.stringify({ comment_text: data.comment_text }),
        },
        token
      )) as ApiDeliverable
      setDeliverable((prev) =>
        prev ? { ...prev, status: mapStatus(res.status) } : prev
      )
      setRejectDialogOpen(false)
      reset()
      toast.success("Deliverable rejected. Revision ticket created.")
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to reject")
    } finally {
      setIsRejecting(false)
    }
  }

  async function handleDownload() {
    if (!deliverable) return
    try {
      const data = (await apiFetch(
        `/api/v1/deliverables/${deliverable.id}/download`,
        {},
        token
      )) as { download_url: string }
      window.open(data.download_url, "_blank")
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Download failed")
    }
  }

  async function handlePublishToInstagram() {
    if (!deliverable) return
    setIsPublishing(true)
    try {
      const data = (await apiFetch(
          `/api/v1/deliverables/${deliverable.id}/publish-instagram`,
          {
            method: "POST",
            body: JSON.stringify({ caption: "" }),
          },
          token
        )) as { success: boolean; instagram_post_id: string | null }
      setDeliverable((prev) =>
        prev ? { ...prev, instagramPostId: data.instagram_post_id } : prev
      )
      toast.success("Deliverable published to Instagram!")
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to publish to Instagram")
    } finally {
      setIsPublishing(false)
    }
  }

  if (loading) {
    return (
      <div className="mx-auto max-w-4xl space-y-6">
        <div className="flex items-center gap-2 text-sm text-gray-400">
          <Loader2 className="size-4 animate-spin" />
          Loading deliverable...
        </div>
      </div>
    )
  }

  if (!deliverable) {
    const isForbidden = fetchError === "forbidden"
    const isNotFound = fetchError === "not_found" || fetchError === null

    return (
      <div className="mx-auto max-w-4xl space-y-6">
        <Link
          href="/portal/deliverables"
          className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-[#2B7BC4]"
        >
          <ArrowLeft className="size-4" />
          Back to Deliverables
        </Link>
        <Card className="rounded-xl shadow-[var(--shadow-card)]">
          <CardContent className="flex flex-col items-center justify-center py-16">
            <FileImage className="size-12 text-gray-300" />
            <h3 className="mt-4 text-base font-semibold text-[#0D2137]">
              {isForbidden ? "Access Denied" : "Deliverable not found"}
            </h3>
            <p className="mt-1 text-sm text-gray-500">
              {isForbidden
                ? "You don't have permission to view this deliverable."
                : isNotFound
                  ? "This deliverable may have been removed."
                  : "Something went wrong. Please try again later."}
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  const TypeIcon = TYPE_ICONS[deliverable.type]
  const statusConfig = STATUS_CONFIG[deliverable.status]
  const isTerminal = deliverable.status === "approved" || deliverable.status === "revision"
  const canDownload = deliverable.status === "approved"

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <Link
        href="/portal/deliverables"
        className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-[#2B7BC4]"
      >
        <ArrowLeft className="size-4" />
        Back to Deliverables
      </Link>

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold text-[#0D2137]">
            {deliverable.title}
          </h1>
          <div className="flex items-center gap-3 text-sm text-gray-500">
            <span className="flex items-center gap-1">
              <TypeIcon className="size-3.5" />
              <span className="capitalize">{deliverable.type}</span>
            </span>
            <span>·</span>
            <span>{formatDate(deliverable.uploadDate)}</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge
            className={cn(
              "border text-xs font-medium",
              statusConfig.className
            )}
          >
            {statusConfig.label}
          </Badge>
          {deliverable.instagramPostId && (
            <Badge className="border bg-gradient-to-r from-purple-100 via-pink-100 to-orange-100 text-xs font-medium text-purple-800 border-purple-200">
              <Camera className="size-3 mr-1" />
              Instagram Published
            </Badge>
          )}
        </div>
      </div>

      <Card className="rounded-xl shadow-[var(--shadow-card)]">
        <CardContent className="p-0">
          <div className="relative aspect-[16/10] bg-gradient-to-br from-gray-100 to-gray-50 flex items-center justify-center overflow-hidden rounded-t-xl">
            {deliverable.type === "reel" && videoPlaying ? (
              <video
                src={deliverable.fileUrl}
                controls
                autoPlay
                className="size-full object-contain bg-black"
              />
            ) : deliverable.type === "reel" ? (
              <div className="flex flex-col items-center gap-3">
                <button
                  onClick={() => setVideoPlaying(true)}
                  className="flex size-16 items-center justify-center rounded-full bg-black/80 text-white transition-transform hover:scale-110"
                >
                  <Play className="size-7 ml-0.5" />
                </button>
                <span className="text-sm text-gray-400">
                  Video Preview — {deliverable.title}
                </span>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-3 px-8">
                <div className="flex w-full max-w-md items-center justify-center rounded-lg border-2 border-dashed border-gray-200 bg-white p-8">
                  <TypeIcon className="size-16 text-gray-200" />
                </div>
                <span className="text-sm text-gray-400">
                  {deliverable.type === "poster"
                    ? "Poster Preview"
                    : "Story Preview"}{" "}
                  — {deliverable.title}
                </span>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {showUpsell && (
        <div className="rounded-xl border border-[#2B7BC4]/20 bg-[#E8F4FD] p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="flex size-9 items-center justify-center rounded-lg bg-[#2B7BC4]/10">
                <Sparkles className="size-5 text-[#2B7BC4]" />
              </div>
              <div>
                <p className="text-sm font-semibold text-[#0D2137]">
                  Love this? Get more this month
                </p>
                <p className="text-xs text-gray-600">
                  Add extra content from ₹349.
                </p>
              </div>
            </div>
            <Link href="/portal/addons">
              <Button
                size="sm"
                className="bg-[#2B7BC4] text-white hover:bg-[#2B7BC4]/90 shrink-0"
              >
                Browse Add-ons
                <ArrowRight className="size-3.5" />
              </Button>
            </Link>
          </div>
        </div>
      )}

      {!isTerminal && (
        <Card className="rounded-xl shadow-[var(--shadow-card)]">
          <CardContent className="p-5">
            <h3 className="mb-4 text-sm font-semibold text-[#0D2137]">
              Actions
            </h3>
            <div className="flex flex-wrap gap-3">
              <Button
                onClick={handleApprove}
                disabled={isApproving || isLapsed}
                className="bg-[#2B7BC4] text-white hover:bg-[#2B7BC4]/90"
              >
                {isApproving ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <Check className="size-4" />
                )}
                Approve
              </Button>

              <Button
                variant="destructive"
                onClick={() => setRejectDialogOpen(true)}
                disabled={isLapsed}
                className="bg-red-600 text-white hover:bg-red-700"
              >
                <X className="size-4" />
                Reject
              </Button>

              <Button
                variant="outline"
                disabled={!canDownload}
                onClick={handleDownload}
                className={cn(
                  !canDownload && "cursor-not-allowed opacity-40"
                )}
              >
                <Download className="size-4" />
                Download
              </Button>
            </div>
            {!canDownload && (
              <p className="mt-3 text-xs text-gray-400">
                Download is available after approval.
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {isTerminal && canDownload && (
        <Card className="rounded-xl shadow-[var(--shadow-card)]">
          <CardContent className="p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-semibold text-[#0D2137]">
                  Download Approved Content
                </h3>
                <p className="mt-0.5 text-xs text-gray-500">
                  Your deliverable is ready for download.
                </p>
              </div>
              <div className="flex items-center gap-2">
                {!deliverable.instagramPostId && (
                  <Button
                    onClick={handlePublishToInstagram}
                    disabled={isPublishing}
                    className="bg-[#2B7BC4] text-white hover:bg-[#2B7BC4]/90"
                  >
                    {isPublishing ? (
                      <Loader2 className="size-4 animate-spin" />
                    ) : (
                      <Camera className="size-4" />
                    )}
                    {isPublishing ? "Publishing..." : "Publish to Instagram"}
                  </Button>
                )}
                <Button
                  onClick={handleDownload}
                  className="bg-[#2B7BC4] text-white hover:bg-[#2B7BC4]/90"
                >
                  <Download className="size-4" />
                  Download
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {isTerminal && !canDownload && (
        <Card className="rounded-xl shadow-[var(--shadow-card)]">
          <CardContent className="p-5">
            <div className="flex items-center gap-3">
              <div className="flex size-8 items-center justify-center rounded-full bg-purple-100">
                <Loader2 className="size-4 text-purple-600 animate-spin" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-[#0D2137]">
                  Revision In Progress
                </h3>
                <p className="text-xs text-gray-500">
                  Our team is working on your feedback. You&apos;ll be notified
                  when the updated version is ready.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <Dialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Reject Deliverable</DialogTitle>
            <DialogDescription>
              Please explain why you&apos;re rejecting this deliverable. This
              helps our team make the right revisions.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit(handleRejectSubmit)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="rejection-reason">
                Reason for rejection <span className="text-red-500">*</span>
              </Label>
              <Textarea
                id="rejection-reason"
                placeholder="e.g., The color scheme doesn't match our brand guidelines. Please use warmer tones..."
                rows={4}
                className={cn(
                  "resize-none",
                  errors.comment_text && "border-red-500 focus-visible:ring-red-500"
                )}
                {...register("comment_text")}
              />
              {errors.comment_text && (
                <p className="text-xs text-red-500">{errors.comment_text.message}</p>
              )}
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setRejectDialogOpen(false)
                  reset()
                }}
                disabled={isRejecting}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                variant="destructive"
                disabled={isRejecting}
                className="bg-red-600 text-white hover:bg-red-700"
              >
                {isRejecting ? (
                  <>
                    <Loader2 className="size-4 animate-spin" />
                    Submitting...
                  </>
                ) : (
                  "Submit Rejection"
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}