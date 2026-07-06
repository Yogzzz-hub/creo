"use client"

import { useState, useEffect, useRef } from "react"
import Link from "next/link"
import { use } from "react"
import type { RealtimeChannel } from "@supabase/supabase-js"
import {
  ArrowLeft,
  Send,
  Paperclip,
  Clock,
  CheckCircle2,
  Loader2,
  Download,
  FileText,
  X,
} from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { useSession } from "@/context/session-context"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { RichTextEditor, sanitizeHtml } from "@/components/ui/rich-text-editor"
import { cn } from "@/lib/utils"

type TicketType = "deliverable_revision" | "billing_issue" | "general_support" | "content_brief_update"
type TicketStatus = "open" | "in_progress" | "awaiting_client" | "resolved" | "escalated"

interface Ticket {
  id: string
  subject: string
  type: TicketType
  status: TicketStatus
}

interface ChatMessage {
  id: string
  sender: "client" | "team"
  senderName: string
  content: string
  timestamp: string
  fileUrl?: string | null
  fileName?: string | null
  fileSizeBytes?: number | null
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

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function isImageFile(name: string): boolean {
  return /\.(png|jpe?g|gif|webp|svg)$/i.test(name)
}

const MAX_FILE_SIZE = 25 * 1024 * 1024

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

export default function TicketDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = use(params)
  const { user, token } = useSession()
  const [ticket, setTicket] = useState<Ticket | null>(null)
  const [localMessages, setLocalMessages] = useState<ChatMessage[]>([])
  const [loading, setLoading] = useState(true)
  const [chatInput, setChatInput] = useState("")
  const [isSending, setIsSending] = useState(false)
  const [attachment, setAttachment] = useState<File | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const channelRef = useRef<RealtimeChannel | null>(null)

  useEffect(() => {
    async function fetchTicket() {
      try {
        if (!token) {
          setLoading(false)
          return
        }

        const ticketRes = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL}/api/v1/tickets`,
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        )

        if (!ticketRes.ok) {
          setLoading(false)
          return
        }

        const tickets: {
          id: string
          subject: string
          ticket_type: string
          status: string
        }[] = await ticketRes.json()

        const found = tickets.find((t) => t.id === id)
        if (!found) {
          setLoading(false)
          return
        }

        setTicket({
          id: found.id,
          subject: found.subject,
          type: mapTicketType(found.ticket_type),
          status: mapTicketStatus(found.status),
        })

        const msgRes = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL}/api/v1/tickets/${id}/messages`,
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        )

        if (msgRes.ok) {
          const msgs: {
            id: string
            sender_id: string
            message_text: string | null
            created_at: string
            file_url: string | null
            file_name: string | null
            file_size_bytes: number | null
          }[] = await msgRes.json()

          setLocalMessages(
            msgs.map((m) => ({
              id: m.id,
              sender: m.sender_id === user?.id ? ("client" as const) : ("team" as const),
              senderName: m.sender_id === user?.id ? "You" : "Team Creo",
              content: m.message_text ?? "",
              timestamp: m.created_at,
              fileUrl: m.file_url,
              fileName: m.file_name,
              fileSizeBytes: m.file_size_bytes,
            }))
          )
        }
      } catch {
        // Silent fail
      } finally {
        setLoading(false)
      }
    }
    fetchTicket()
  }, [id, token, user?.id])

  useEffect(() => {
    if (!ticket) return

    const supabase = createClient()
    const userId = user?.id

    const channel = supabase
      .channel(`ticket:${ticket.id}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "ticket_messages",
          filter: `ticket_id=eq.${ticket.id}`,
        },
        (payload: { new: Record<string, unknown> }) => {
          const newMsg = payload.new as {
            id: string
            sender_id: string
            message_text: string | null
            created_at: string
            file_url: string | null
            file_name: string | null
            file_size_bytes: number | null
          }

          setLocalMessages((prev) => {
            if (prev.some((m) => m.id === newMsg.id)) return prev
            return [
              ...prev,
              {
                id: newMsg.id,
                sender: newMsg.sender_id === userId ? ("client" as const) : ("team" as const),
                senderName: newMsg.sender_id === userId ? "You" : "Team Creo",
                content: newMsg.message_text ?? "",
                timestamp: newMsg.created_at,
                fileUrl: newMsg.file_url,
                fileName: newMsg.file_name,
                fileSizeBytes: newMsg.file_size_bytes,
              },
            ]
          })
        }
      )
      .subscribe()

    channelRef.current = channel

    return () => {
      supabase.removeChannel(channel)
      channelRef.current = null
    }
  }, [ticket?.id, user?.id])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [localMessages])

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    if (file.size > MAX_FILE_SIZE) {
      const { toast } = require("sonner")
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

  async function handleSendMessage() {
    if ((!chatInput.trim() && !attachment) || !ticket) return
    if (!token) {
      const { toast } = await import("sonner")
      toast.error("Not authenticated")
      return
    }
    setIsSending(true)

    try {
      const supabase = createClient()

      let fileUrl: string | null = null
      let fileName: string | null = null
      let fileSizeBytes: number | null = null

      if (attachment) {
        const filePath = `ticket-attachments/${ticket.id}/${Date.now()}-${attachment.name}`
        const { error: uploadError } = await supabase.storage
          .from("ticket-attachments")
          .upload(filePath, attachment)

        if (uploadError) throw new Error("Failed to upload file")

        const { data: urlData } = supabase.storage
          .from("ticket-attachments")
          .getPublicUrl(filePath)

        fileUrl = urlData.publicUrl
        fileName = attachment.name
        fileSizeBytes = attachment.size
      }

      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/v1/tickets/${ticket.id}/messages`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            message_text: chatInput.trim() || null,
            file_url: fileUrl,
            file_name: fileName,
            file_size_bytes: fileSizeBytes,
          }),
        }
      )

      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(body.detail || "Failed to send message")
      }

      const newMsg: {
        id: string
        sender_id: string
        message_text: string | null
        created_at: string
        file_url: string | null
        file_name: string | null
        file_size_bytes: number | null
      } = await res.json()

      setLocalMessages((prev) => [
        ...prev,
        {
          id: newMsg.id,
          sender: newMsg.sender_id === user?.id ? ("client" as const) : ("team" as const),
          senderName: newMsg.sender_id === user?.id ? "You" : "Team Creo",
          content: newMsg.message_text ?? "",
          timestamp: newMsg.created_at,
          fileUrl: newMsg.file_url,
          fileName: newMsg.file_name,
          fileSizeBytes: newMsg.file_size_bytes,
        },
      ])
      setChatInput("")
      setAttachment(null)
    } catch (err) {
      const { toast } = await import("sonner")
      toast.error(err instanceof Error ? err.message : "Failed to send")
    } finally {
      setIsSending(false)
    }
  }

  if (loading) {
    return (
      <div className="mx-auto max-w-4xl space-y-6">
        <div className="flex items-center gap-2 text-sm text-gray-400">
          <Loader2 className="size-4 animate-spin" />
          Loading ticket...
        </div>
      </div>
    )
  }

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
            <span className="font-mono text-xs text-gray-400">{ticket.id.slice(0, 8)}</span>
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
            {localMessages.length === 0 && (
              <div className="flex flex-col items-center justify-center py-8">
                <p className="text-sm text-gray-400">No messages yet. Start the conversation.</p>
              </div>
            )}
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
                        {message.content && (
                          <div
                            className="text-sm leading-relaxed prose prose-sm max-w-none [&_p]:m-0 [&_ul]:m-0 [&_ol]:m-0 [&_li]:m-0"
                            dangerouslySetInnerHTML={{ __html: sanitizeHtml(message.content) }}
                          />
                        )}
                      {message.fileUrl && message.fileName && (
                        <div className="mt-2">
                          {isImageFile(message.fileName) ? (
                            <a
                              href={message.fileUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="block overflow-hidden rounded-lg border border-white/20"
                            >
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img
                                src={message.fileUrl}
                                alt={message.fileName}
                                className="max-h-48 w-auto rounded-lg object-cover"
                              />
                            </a>
                          ) : (
                            <a
                              href={message.fileUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className={cn(
                                "flex items-center gap-2 rounded-lg border px-3 py-2 text-xs transition-colors",
                                isClient
                                  ? "border-white/20 bg-white/10 hover:bg-white/20"
                                  : "border-gray-200 bg-white hover:bg-gray-50"
                              )}
                            >
                              <FileText className="size-4 shrink-0" />
                              <div className="min-w-0 flex-1">
                                <p className="truncate font-medium">{message.fileName}</p>
                                {message.fileSizeBytes != null && (
                                  <p className={cn("text-[10px]", isClient ? "text-white/60" : "text-gray-400")}>
                                    {formatFileSize(message.fileSizeBytes)}
                                  </p>
                                )}
                              </div>
                              <Download className="size-3.5 shrink-0" />
                            </a>
                          )}
                        </div>
                      )}
                      {!message.content && !message.fileUrl && (
                        <p className="text-sm italic leading-relaxed opacity-60">Empty message</p>
                      )}
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
            <div ref={messagesEndRef} />
          </div>

          <div className="border-t border-gray-200 p-4">
            <input
              ref={fileInputRef}
              type="file"
              accept=".png,.jpg,.jpeg,.gif,.webp,.pdf,.doc,.docx"
              className="hidden"
              onChange={handleFileSelect}
            />
            {attachment && (
              <div className="mb-3 flex items-center gap-3 rounded-lg border border-gray-200 bg-gray-50 p-3">
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
            )}
            <div className="flex items-end gap-2">
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={ticket.status === "resolved"}
                className="flex size-9 shrink-0 items-center justify-center rounded-lg text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600 disabled:opacity-50"
              >
                <Paperclip className="size-4" />
              </button>
              <div className="flex-1">
                <RichTextEditor
                  value={chatInput}
                  onChange={setChatInput}
                  placeholder="Type your message..."
                  disabled={ticket.status === "resolved"}
                />
              </div>
              <Button
                onClick={handleSendMessage}
                disabled={(!chatInput.trim() && !attachment) || isSending || ticket.status === "resolved"}
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
