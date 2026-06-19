"use client"

import { useState } from "react"
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
} from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
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

type TicketType = "revision" | "billing" | "general"
type TicketStatus = "open" | "resolved"

interface Ticket {
  id: string
  subject: string
  type: TicketType
  status: TicketStatus
  lastUpdated: string
  messageCount: number
}

const MOCK_TICKETS: Ticket[] = [
  {
    id: "TKT-1042",
    subject: "Reel color grading too dark",
    type: "revision",
    status: "open",
    lastUpdated: "2026-06-16T14:30:00",
    messageCount: 4,
  },
  {
    id: "TKT-1039",
    subject: "Invoice discrepancy for May billing",
    type: "billing",
    status: "resolved",
    lastUpdated: "2026-06-14T10:15:00",
    messageCount: 6,
  },
  {
    id: "TKT-1035",
    subject: "Request for content calendar access",
    type: "general",
    status: "resolved",
    lastUpdated: "2026-06-10T09:00:00",
    messageCount: 3,
  },
  {
    id: "TKT-1028",
    subject: "Story format not matching brand guidelines",
    type: "revision",
    status: "resolved",
    lastUpdated: "2026-06-07T16:45:00",
    messageCount: 8,
  },
]

const TYPE_CONFIG: Record<TicketType, { label: string; className: string }> = {
  revision: {
    label: "Revision",
    className: "bg-purple-100 text-purple-700 border-purple-200",
  },
  billing: {
    label: "Billing",
    className: "bg-amber-100 text-amber-700 border-amber-200",
  },
  general: {
    label: "General",
    className: "bg-sky-100 text-sky-700 border-sky-200",
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
  resolved: {
    label: "Resolved",
    className: "bg-gray-100 text-gray-600 border-gray-200",
    icon: CheckCircle2,
  },
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

export default function SupportPage() {
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [ticketType, setTicketType] = useState<string>("general")
  const [subject, setSubject] = useState("")
  const [description, setDescription] = useState("")

  function handleSubmit() {
    if (!subject.trim() || !description.trim()) {
      toast.error("Please fill in all required fields.")
      return
    }

    setIsSubmitting(true)
    setTimeout(() => {
      setIsSubmitting(false)
      setDrawerOpen(false)
      setTicketType("general")
      setSubject("")
      setDescription("")
      toast.success("Ticket raised successfully. Our team will respond shortly.")
    }, 1200)
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
        >
          <Plus className="size-4" />
          Raise a Ticket
        </Button>
      </div>

      {MOCK_TICKETS.length === 0 ? (
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
          {MOCK_TICKETS.map((ticket) => {
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
                            {ticket.id}
                          </span>
                        </div>
                        <h3 className="mt-0.5 truncate text-sm font-semibold text-[#0D2137] group-hover:text-[#2B7BC4]">
                          {ticket.subject}
                        </h3>
                        <p className="mt-1 text-xs text-gray-500">
                          {ticket.messageCount} messages · Updated{" "}
                          {formatDateTime(ticket.lastUpdated)}
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
              <Select value={ticketType} onValueChange={(v) => setTicketType(v ?? "general")}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="revision">Revision</SelectItem>
                  <SelectItem value="billing">Billing</SelectItem>
                  <SelectItem value="general">General</SelectItem>
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
              <Label htmlFor="ticket-description">
                Description <span className="text-red-500">*</span>
              </Label>
              <Textarea
                id="ticket-description"
                placeholder="Please provide details about your issue..."
                rows={5}
                className="resize-none"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label>Attachments</Label>
              <div className="flex items-center justify-center rounded-lg border-2 border-dashed border-gray-200 bg-gray-50 p-6 transition-colors hover:border-[#2B7BC4]/40 hover:bg-[#E8F4FD]/50 cursor-pointer">
                <div className="flex flex-col items-center gap-2">
                  <Upload className="size-6 text-gray-400" />
                  <p className="text-xs text-gray-500">
                    Click to upload or drag & drop
                  </p>
                  <p className="text-[10px] text-gray-400">
                    PNG, JPG, PDF up to 10MB
                  </p>
                </div>
              </div>
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
