"use client"

import { useState } from "react"
import Link from "next/link"
import { use } from "react"
import {
  ArrowLeft,
  Send,
  Paperclip,
  Clock,
  CheckCircle2,
  Loader2,
} from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"

type TicketType = "revision" | "billing" | "general"
type TicketStatus = "open" | "resolved"

interface Ticket {
  id: string
  subject: string
  type: TicketType
  status: TicketStatus
  lastUpdated: string
}

interface ChatMessage {
  id: string
  sender: "client" | "team"
  senderName: string
  content: string
  timestamp: string
}

const MOCK_TICKETS: Record<string, Ticket> = {
  "TKT-1042": {
    id: "TKT-1042",
    subject: "Reel color grading too dark",
    type: "revision",
    status: "open",
    lastUpdated: "2026-06-16T14:30:00",
  },
  "TKT-1039": {
    id: "TKT-1039",
    subject: "Invoice discrepancy for May billing",
    type: "billing",
    status: "resolved",
    lastUpdated: "2026-06-14T10:15:00",
  },
  "TKT-1035": {
    id: "TKT-1035",
    subject: "Request for content calendar access",
    type: "general",
    status: "resolved",
    lastUpdated: "2026-06-10T09:00:00",
  },
  "TKT-1028": {
    id: "TKT-1028",
    subject: "Story format not matching brand guidelines",
    type: "revision",
    status: "resolved",
    lastUpdated: "2026-06-07T16:45:00",
  },
}

const MOCK_MESSAGES: Record<string, ChatMessage[]> = {
  "TKT-1042": [
    {
      id: "msg1",
      sender: "client",
      senderName: "You",
      content: "Hi, the latest reel looks a bit too dark. The color grading doesn't match our usual vibrant style. Can you look into this?",
      timestamp: "2026-06-16T10:00:00",
    },
    {
      id: "msg2",
      sender: "team",
      senderName: "Priya (Designer)",
      content: "Thanks for flagging this! Let me check the grading settings. Can you share a reference of the tone you prefer?",
      timestamp: "2026-06-16T10:30:00",
    },
    {
      id: "msg3",
      sender: "client",
      senderName: "You",
      content: "Sure — check the reel from last week (Client Transformation). That brightness level is perfect.",
      timestamp: "2026-06-16T11:00:00",
    },
    {
      id: "msg4",
      sender: "team",
      senderName: "Priya (Designer)",
      content: "Got it! I'll re-grade it with warmer tones and higher exposure. Updated version will be ready by tomorrow EOD.",
      timestamp: "2026-06-16T14:30:00",
    },
  ],
  "TKT-1039": [
    {
      id: "msg1",
      sender: "client",
      senderName: "You",
      content: "I noticed my May invoice shows ₹4,999 but I was charged ₹5,499. Can you clarify?",
      timestamp: "2026-06-14T08:00:00",
    },
    {
      id: "msg2",
      sender: "team",
      senderName: "Ankit (Billing)",
      content: "Hi! Let me look into this right away. I'll pull up your payment records.",
      timestamp: "2026-06-14T08:30:00",
    },
    {
      id: "msg3",
      sender: "team",
      senderName: "Ankit (Billing)",
      content: "You're right — the extra ₹500 was an add-on charge for 1 extra poster that was processed on May 28. This wasn't reflected on the invoice. I've issued a corrected invoice.",
      timestamp: "2026-06-14T09:15:00",
    },
    {
      id: "msg4",
      sender: "client",
      senderName: "You",
      content: "Thanks for the quick resolution!",
      timestamp: "2026-06-14T09:30:00",
    },
    {
      id: "msg5",
      sender: "team",
      senderName: "Ankit (Billing)",
      content: "Happy to help! I've also sent the corrected invoice to your email. Let me know if you need anything else.",
      timestamp: "2026-06-14T10:00:00",
    },
    {
      id: "msg6",
      sender: "team",
      senderName: "Ankit (Billing)",
      content: "Marking this as resolved. Feel free to reopen if you have more questions!",
      timestamp: "2026-06-14T10:15:00",
    },
  ],
  "TKT-1035": [
    {
      id: "msg1",
      sender: "client",
      senderName: "You",
      content: "Can I get access to the content calendar view? I'd like to see what's planned for next month.",
      timestamp: "2026-06-10T08:00:00",
    },
    {
      id: "msg2",
      sender: "team",
      senderName: "Team Creo",
      content: "Absolutely! I've updated your permissions. You should now see the full calendar in your portal.",
      timestamp: "2026-06-10T08:30:00",
    },
    {
      id: "msg3",
      sender: "team",
      senderName: "Team Creo",
      content: "Resolved! Let us know if you have any other access requests.",
      timestamp: "2026-06-10T09:00:00",
    },
  ],
  "TKT-1028": [
    {
      id: "msg1",
      sender: "client",
      senderName: "You",
      content: "The story designs are not following our brand guidelines. The fonts are off.",
      timestamp: "2026-06-07T12:00:00",
    },
    {
      id: "msg2",
      sender: "team",
      senderName: "Riya (Designer)",
      content: "Apologies for the oversight! I'll update all pending stories with the correct brand fonts (Inter for headings, Montserrat for body).",
      timestamp: "2026-06-07T13:00:00",
    },
    {
      id: "msg3",
      sender: "client",
      senderName: "You",
      content: "Perfect, thank you!",
      timestamp: "2026-06-07T13:15:00",
    },
  ],
}

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

function formatTime(dateString: string): string {
  const date = new Date(dateString)
  return date.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  })
}

function formatDateLabel(dateString: string): string {
  const date = new Date(dateString)
  const today = new Date()
  const yesterday = new Date(today)
  yesterday.setDate(yesterday.getDate() - 1)

  if (date.toDateString() === today.toDateString()) return "Today"
  if (date.toDateString() === yesterday.toDateString()) return "Yesterday"
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  })
}

export default function TicketDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = use(params)
  const ticket = MOCK_TICKETS[id]
  const messages = MOCK_MESSAGES[id] || []

  const [chatInput, setChatInput] = useState("")
  const [localMessages, setLocalMessages] = useState<ChatMessage[]>(messages)
  const [isSending, setIsSending] = useState(false)

  if (!ticket) {
    return (
      <div className="mx-auto max-w-4xl space-y-6">
        <Link
          href="/portal/support"
          className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-[#2B7BC4]"
        >
          <ArrowLeft className="size-4" />
          Back to Support
        </Link>
        <Card className="rounded-xl shadow-[var(--shadow-card)]">
          <CardContent className="flex flex-col items-center justify-center py-16">
            <h3 className="text-base font-semibold text-[#0D2137]">
              Ticket not found
            </h3>
            <p className="mt-1 text-sm text-gray-500">
              This ticket may have been removed.
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  const typeConfig = TYPE_CONFIG[ticket.type]
  const statusConfig = STATUS_CONFIG[ticket.status]
  const StatusIcon = statusConfig.icon

  function handleSendMessage() {
    if (!chatInput.trim()) return
    setIsSending(true)

    setTimeout(() => {
      const newMessage: ChatMessage = {
        id: `msg-${Date.now()}`,
        sender: "client",
        senderName: "You",
        content: chatInput.trim(),
        timestamp: new Date().toISOString(),
      }
      setLocalMessages((prev) => [...prev, newMessage])
      setChatInput("")
      setIsSending(false)
    }, 500)
  }

  let lastDateLabel = ""

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <Link
        href="/portal/support"
        className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-[#2B7BC4]"
      >
        <ArrowLeft className="size-4" />
        Back to Support
      </Link>

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <span className="font-mono text-xs text-gray-400">{ticket.id}</span>
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
              <StatusIcon className="size-3" />
              {statusConfig.label}
            </Badge>
          </div>
          <h1 className="text-2xl font-bold text-[#0D2137]">
            {ticket.subject}
          </h1>
        </div>
      </div>

      <Card className="rounded-xl shadow-[var(--shadow-card)]">
        <CardContent className="flex flex-col" style={{ height: "min(500px, 70vh)" }}>
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {localMessages.map((message) => {
              const isClient = message.sender === "client"
              const dateLabel = formatDateLabel(message.timestamp)

              const showDateSeparator = dateLabel !== lastDateLabel
              lastDateLabel = dateLabel

              return (
                <div key={message.id}>
                  {showDateSeparator && (
                    <div className="flex items-center gap-3 py-2">
                      <div className="h-px flex-1 bg-gray-200" />
                      <span className="text-[10px] font-medium text-gray-400">
                        {dateLabel}
                      </span>
                      <div className="h-px flex-1 bg-gray-200" />
                    </div>
                  )}

                  <div
                    className={cn(
                      "flex",
                      isClient ? "justify-end" : "justify-start"
                    )}
                  >
                    <div
                      className={cn(
                        "max-w-[75%] rounded-xl px-4 py-2.5",
                        isClient
                          ? "bg-[#2B7BC4] text-white rounded-br-sm"
                          : "bg-gray-100 text-[#0D2137] rounded-bl-sm"
                      )}
                    >
                      <p
                        className={cn(
                          "text-[10px] font-medium mb-1",
                          isClient ? "text-white/70" : "text-gray-500"
                        )}
                      >
                        {message.senderName}
                      </p>
                      <p className="text-sm leading-relaxed">{message.content}</p>
                      <p
                        className={cn(
                          "mt-1 text-[10px]",
                          isClient ? "text-white/50" : "text-gray-400"
                        )}
                      >
                        {formatTime(message.timestamp)}
                      </p>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>

          <div className="border-t border-gray-200 p-4">
            <div className="flex items-end gap-2">
              <button className="flex size-9 shrink-0 items-center justify-center rounded-lg text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600">
                <Paperclip className="size-4" />
              </button>
              <Input
                placeholder="Type your message..."
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault()
                    handleSendMessage()
                  }
                }}
                className="flex-1"
                disabled={ticket.status === "resolved"}
              />
              <Button
                onClick={handleSendMessage}
                disabled={!chatInput.trim() || isSending || ticket.status === "resolved"}
                className="shrink-0 bg-[#2B7BC4] text-white hover:bg-[#2B7BC4]/90"
                size="icon"
              >
                {isSending ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <Send className="size-4" />
                )}
              </Button>
            </div>
            {ticket.status === "resolved" && (
              <p className="mt-2 text-[10px] text-gray-400">
                This ticket is resolved. To continue, raise a new ticket.
              </p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
