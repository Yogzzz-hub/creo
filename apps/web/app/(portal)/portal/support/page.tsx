"use client"

import { useState, useEffect, useRef } from "react"
import Link from "next/link"

import { toast } from "sonner"
import {
  ArrowLeft,
  Plus,
  Upload,
  Clock,
  CheckCircle2,
  MessageSquare,
  Loader2,
  FileText,
  X,
} from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { RichTextEditor } from "@/components/ui/rich-text-editor"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
} from "@/components/ui/sheet"
import { cn } from "@/lib/utils"
import { useSubscription } from "@/context/subscription-context"

type TicketType = "deliverable_revision" | "billing_issue" | "general_support" | "content_brief_update"
type TicketStatus = "open" | "in_progress" | "awaiting_client" | "resolved" | "escalated"

interface Ticket {
  id: string
  subject: string
  type: TicketType
  status: TicketStatus
  createdAt: string
}

const TYPE_CONFIG: Record<TicketType, { label: string; className: string }> = {
  deliverable_revision: {
    label: "Revision",
    className: "bg-purple-100 text-purple-700 border-purple-200",
  },
  billing_issue: {
    label: "Billing",
    className: "bg-amber-100 text-amber-700 border-amber-200",
  },
  general_support: {
    label: "General",
    className: "bg-sky-100 text-sky-700 border-sky-200",
  },
  content_brief_update: {
    label: "Brief Update",
    className: "bg-orange-100 text-orange-700 border-orange-200",
  },
}

const STATUS_CONFIG: Record<
  TicketStatus,
  { label: string; className: string; icon: typeof Clock }
> = {
  open: {
    label: "Open",
    className: "bg-emerald-100 text-emerald-700 border-emerald-200",
    icon: Clock,
  },
  in_progress: {
    label: "In Progress",
    className: "bg-blue-100 text-blue-700 border-blue-200",
    icon: Clock,
  },
  awaiting_client: {
    label: "Awaiting Client",
    className: "bg-amber-100 text-amber-700 border-amber-200",
    icon: Clock,
  },
  resolved: {
    label: "Resolved",
    className: "bg-gray-100 text-gray-600 border-gray-200",
    icon: CheckCircle2,
  },
  escalated: {
    label: "Escalated",
    className: "bg-red-100 text-red-700 border-red-200",
    icon: CheckCircle2,
  },
}

const MAX_FILE_SIZE = 25 * 1024 * 1024

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function formatDateTime(dateString: string): string {
  const date = new Date(dateString)
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })
}

function mapTicketType(t: string): TicketType {
  if (
    t === "deliverable_revision" ||
    t === "billing_issue" ||
    t === "general_support" ||
    t === "content_brief_update"
  ) return t
  return "general_support"
}

function mapTicketStatus(s: string): TicketStatus {
  if (s === "in_progress") return "in_progress"
  if (s === "awaiting_client") return "awaiting_client"
  if (s === "resolved") return "resolved"
  if (s === "escalated") return "escalated"
  return "open"
}

export default function SupportPage() {
  const [tickets, setTickets] = useState<Ticket[]>([])
  const [loading, setLoading] = useState(true)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [ticketType, setTicketType] = useState<string>("general_support")
  const [subject, setSubject] = useState("")
  const [description, setDescription] = useState("")
  const [attachment, setAttachment] = useState<File | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const { isLapsed } = useSubscription()

  useEffect(() => {
    async function fetchTickets() {
      try {
        const supabase = createClient()
        const {
          data: { session },
        } = await supabase.auth.getSession()

        if (!session?.access_token) {
          setLoading(false)
          return
        }

        const res = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL}/api/v1/tickets`,
          {
            headers: { Authorization: `Bearer ${session.access_token}` },
          }
        )

        if (!res.ok) {
          setLoading(false)
          return
        }

        const data: {
          id: string
          subject: string
          ticket_type: string
          status: string
          created_at: string
        }[] = await res.json()

        setTickets(
          data.map((t) => ({
            id: t.id,
            subject: t.subject,
            type: mapTicketType(t.ticket_type),
            status: mapTicketStatus(t.status),
            createdAt: t.created_at,
          }))
        )
      } catch {
        // Silent fail
      } finally {
        setLoading(false)
      }
    }
    fetchTickets()
  }, [])

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    if (file.size > MAX_FILE_SIZE) {
      toast.error(`File too large. Maximum size is 25MB. Your file: ${formatFileSize(file.size)}`)
      e.target.value = ""
      return
    }

    setAttachment(file)
    e.target.value = ""
  }

  function handleRemoveFile() {
    setAttachment(null)
  }

  async function handleSubmit() {
    if (!subject.trim() || !description.trim()) {
      toast.error("Please fill in all required fields.")
      return
    }

    setIsSubmitting(true)
    try {
      const supabase = createClient()
      const { data: { user }, error: authError } = await supabase.auth.getUser()

      if (authError || !user) {
        console.error("[Ticket Submit] Auth error:", authError?.message ?? "No user")
        throw new Error("Your session has expired. Please log in again.")
      }

      const { data: { session } } = await supabase.auth.getSession()
      const token = session?.access_token

      if (!token) {
        console.error("[Ticket Submit] No access_token in session after getUser() succeeded")
        throw new Error("Could not retrieve authentication token.")
      }

      const apiUrl = process.env.NEXT_PUBLIC_API_URL
      if (!apiUrl) {
        console.error("[Ticket Submit] NEXT_PUBLIC_API_URL is not set")
        throw new Error("API configuration error.")
      }

      console.log("[Ticket Submit] accessToken type:", typeof token, "length:", token?.length, "starts:", token?.substring(0, 20))

      const formData = new FormData()
      formData.append("ticket_type", ticketType)
      formData.append("subject", subject.trim())
      formData.append("description", description.trim())
      if (attachment) {
        formData.append("attachment", attachment)
      }

      const res = await fetch(
        `${apiUrl}/api/v1/tickets`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
          },
          body: formData,
        }
      )

      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        console.error(`[Ticket Submit] API returned ${res.status}:`, body)
        if (res.status === 401) {
          throw new Error("Authentication failed. Please log out and log back in.")
        }
        throw new Error(body.detail || "Failed to create ticket")
      }

      const newTicket: {
        id: string
        subject: string
        ticket_type: string
        status: string
        created_at: string
      } = await res.json()

      setTickets((prev) => [
        {
          id: newTicket.id,
          subject: newTicket.subject,
          type: mapTicketType(newTicket.ticket_type),
          status: mapTicketStatus(newTicket.status),
          createdAt: newTicket.created_at,
        },
        ...prev,
      ])

      if (attachment) {
        const filePath = `ticket-attachments/${newTicket.id}/${Date.now()}-${attachment.name}`
        const { error: uploadError } = await supabase.storage
          .from("ticket-attachments")
          .upload(filePath, attachment)

        if (uploadError) {
          toast.error("Ticket created but attachment upload failed. You can resend it in the chat.")
        } else {
          const { data: urlData } = supabase.storage
            .from("ticket-attachments")
            .getPublicUrl(filePath)

          await fetch(
            `${apiUrl}/api/v1/tickets/${newTicket.id}/messages`,
            {
              method: "POST",
              headers: {
                Authorization: `Bearer ${token}`,
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                message_text: null,
                file_url: urlData.publicUrl,
                file_name: attachment.name,
                file_size_bytes: attachment.size,
              }),
            }
          )
        }
      }

      setDrawerOpen(false)
      setTicketType("general_support")
      setSubject("")
      setDescription("")
      setAttachment(null)
      toast.success("Ticket raised successfully. Our team will respond shortly.")
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to create ticket")
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link
            href="/portal"
            className="flex size-8 items-center justify-center rounded-lg text-gray-400 transition-colors hover:bg-white hover:text-gray-700"
          >
            <ArrowLeft className="size-4" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-[#0D2137]">Support</h1>
            <p className="mt-0.5 text-sm text-gray-500">
              Raise tickets and track their resolution.
            </p>
          </div>
        </div>

        <Button
          onClick={() => setDrawerOpen(true)}
          className="bg-[#2B7BC4] text-white hover:bg-[#2B7BC4]/90"
          disabled={isLapsed}
        >
          <Plus className="size-4" />
          Raise a Ticket
        </Button>
      </div>

      {loading ? (
        <Card className="rounded-xl shadow-[var(--shadow-card)]">
          <CardContent className="flex items-center justify-center py-12">
            <Loader2 className="size-5 animate-spin text-gray-400" />
            <span className="ml-2 text-sm text-gray-500">Loading tickets...</span>
          </CardContent>
        </Card>
      ) : tickets.length === 0 ? (
        <Card className="rounded-xl shadow-[var(--shadow-card)]">
          <CardContent className="flex flex-col items-center justify-center py-16">
            <MessageSquare className="size-12 text-gray-300" />
            <h3 className="mt-4 text-base font-semibold text-[#0D2137]">
              No tickets yet
            </h3>
            <p className="mt-1 text-sm text-gray-500">
              When you raise a ticket, it will appear here.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {tickets.map((ticket) => {
            const typeConfig = TYPE_CONFIG[ticket.type]
            const statusConfig = STATUS_CONFIG[ticket.status]
            const StatusIcon = statusConfig.icon

            return (
              <Link key={ticket.id} href={`/portal/support/${ticket.id}`}>
                <Card className="group cursor-pointer rounded-xl shadow-[var(--shadow-card)] transition-all hover:shadow-md hover:ring-1 hover:ring-[#2B7BC4]/20">
                  <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-start gap-3 min-w-0">
                      <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-gray-50">
                        <StatusIcon className="size-5 text-gray-400" />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs text-gray-400">
                            {ticket.id.slice(0, 8)}
                          </span>
                        </div>
                        <h3 className="mt-0.5 truncate text-sm font-semibold text-[#0D2137] group-hover:text-[#2B7BC4]">
                          {ticket.subject}
                        </h3>
                        <p className="mt-1 text-xs text-gray-500">
                          Created {formatDateTime(ticket.createdAt)}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 sm:shrink-0">
                      <Badge
                        className={cn(
                          "border text-[10px] font-medium",
                          typeConfig.className
                        )}
                      >
                        {typeConfig.label}
                      </Badge>
                      <Badge
                        className={cn(
                          "border text-[10px] font-medium",
                          statusConfig.className
                        )}
                      >
                        {statusConfig.label}
                      </Badge>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            )
          })}
        </div>
      )}

      <Sheet open={drawerOpen} onOpenChange={setDrawerOpen}>
        <SheetContent side="right" className="w-full sm:max-w-md">
          <SheetHeader>
            <SheetTitle>Raise a Ticket</SheetTitle>
            <SheetDescription>
              Describe your issue and our team will get back to you.
            </SheetDescription>
          </SheetHeader>

          <div className="flex-1 space-y-4 px-4">
            <div className="space-y-2">
              <Label>
                Type <span className="text-red-500">*</span>
              </Label>
              <Select value={ticketType} onValueChange={(v) => setTicketType(v ?? "general_support")}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="deliverable_revision">Revision</SelectItem>
                  <SelectItem value="billing_issue">Billing</SelectItem>
                  <SelectItem value="general_support">General</SelectItem>
                  <SelectItem value="content_brief_update">Brief Update</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="ticket-subject">
                Subject <span className="text-red-500">*</span>
              </Label>
              <Input
                id="ticket-subject"
                placeholder="Brief description of your issue"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label>
                Description <span className="text-red-500">*</span>
              </Label>
              <RichTextEditor
                value={description}
                onChange={setDescription}
                placeholder="Please provide details about your issue..."
              />
            </div>

            <div className="space-y-2">
              <Label>Attachments</Label>
              <input
                ref={fileInputRef}
                type="file"
                accept=".png,.jpg,.jpeg,.gif,.webp,.pdf,.doc,.docx"
                className="hidden"
                onChange={handleFileSelect}
              />
              {attachment ? (
                <div className="flex items-center gap-3 rounded-lg border border-gray-200 bg-gray-50 p-3">
                  <FileText className="size-8 shrink-0 text-[#2B7BC4]" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-[#0D2137]">{attachment.name}</p>
                    <p className="text-xs text-gray-400">{formatFileSize(attachment.size)}</p>
                  </div>
                  <button
                    type="button"
                    onClick={handleRemoveFile}
                    className="shrink-0 rounded-lg p-1 text-gray-400 transition-colors hover:bg-gray-200 hover:text-gray-600"
                  >
                    <X className="size-4" />
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="flex w-full items-center justify-center rounded-lg border-2 border-dashed border-gray-200 bg-gray-50 p-6 transition-colors hover:border-[#2B7BC4]/40 hover:bg-[#E8F4FD]/50"
                >
                  <div className="flex flex-col items-center gap-2">
                    <Upload className="size-6 text-gray-400" />
                    <p className="text-xs text-gray-500">
                      Click to upload or drag & drop
                    </p>
                    <p className="text-[10px] text-gray-400">
                      PNG, JPG, PDF up to 25MB
                    </p>
                  </div>
                </button>
              )}
            </div>
          </div>

          <SheetFooter>
            <Button
              variant="outline"
              onClick={() => setDrawerOpen(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="bg-[#2B7BC4] text-white hover:bg-[#2B7BC4]/90"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  Submitting...
                </>
              ) : (
                "Submit Ticket"
              )}
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </div>
  )
}
