"use client"

import { useEffect, useState, useCallback, useRef } from "react"
import Link from "next/link"
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
  ArrowLeft,
  Loader2,
  Send,
  Clock,
  CheckCircle2,
  AlertTriangle,
} from "lucide-react"
import { toast } from "sonner"
import { adminFetch } from "@/lib/admin-api"

type TicketStatus = "open" | "in_progress" | "awaiting_client" | "resolved" | "escalated"

interface Ticket {
  id: string
  subject: string
  ticket_type: string
  status: TicketStatus
  client_name: string
  client_id: string
  assigned_to: string | null
  assigned_name: string | null
  created_at: string
}

interface TicketMessage {
  id: string
  sender_id: string
  sender_name: string
  sender_role: string
  message_text: string | null
  file_url: string | null
  file_name: string | null
  created_at: string
}

interface TeamMember {
  team_member_id: string
  full_name: string
}

const STATUS_CONFIG: Record<TicketStatus, { label: string; className: string; icon: typeof Clock }> = {
  open: { label: "Open", className: "bg-emerald-100 text-emerald-700 border-emerald-200", icon: Clock },
  in_progress: { label: "In Progress", className: "bg-blue-100 text-blue-700 border-blue-200", icon: Clock },
  awaiting_client: { label: "Awaiting Client", className: "bg-amber-100 text-amber-700 border-amber-200", icon: Clock },
  resolved: { label: "Resolved", className: "bg-gray-100 text-gray-600 border-gray-200", icon: CheckCircle2 },
  escalated: { label: "Escalated", className: "bg-red-100 text-red-700 border-red-200", icon: AlertTriangle },
}

function formatDateTime(d: string) {
  return new Date(d).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })
}

function formatTicketType(t: string) {
  return t.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())
}

export default function TicketDetailPage({ params }: { params: { id: string } }) {
  const [ticket, setTicket] = useState<Ticket | null>(null)
  const [messages, setMessages] = useState<TicketMessage[]>([])
  const [team, setTeam] = useState<TeamMember[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [replyText, setReplyText] = useState("")
  const [sending, setSending] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const fetchData = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [ticketData, messagesData, teamData] = await Promise.allSettled([
        adminFetch<Ticket>(`/api/v1/admin/support/tickets/${params.id}`),
        adminFetch<TicketMessage[]>(`/api/v1/admin/support/tickets/${params.id}/messages`),
        adminFetch<TeamMember[]>("/api/v1/admin/team"),
      ])

      if (ticketData.status === "fulfilled") setTicket(ticketData.value)
      else setError(ticketData.reason?.message ?? "Failed to load ticket")
      if (messagesData.status === "fulfilled") setMessages(messagesData.value)
      if (teamData.status === "fulfilled") setTeam(teamData.value)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load ticket")
    } finally {
      setLoading(false)
    }
  }, [params.id])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  async function handleSendReply() {
    if (!replyText.trim()) return
    setSending(true)
    try {
      const newMessage = await adminFetch<TicketMessage>(
        `/api/v1/admin/support/tickets/${params.id}/messages`,
        {
          method: "POST",
          body: JSON.stringify({ message_text: replyText.trim() }),
        }
      )
      setMessages((prev) => [...prev, newMessage])
      setReplyText("")
      toast.success("Reply sent")
    } catch (err) {
      toast.error("Failed to send reply", {
        description: err instanceof Error ? err.message : "Unknown error",
      })
    } finally {
      setSending(false)
    }
  }

  async function handleStatusChange(newStatus: TicketStatus) {
    if (!ticket) return
    try {
      const updated = await adminFetch<Ticket>(`/api/v1/admin/support/tickets/${ticket.id}/status`, {
        method: "PATCH",
        body: JSON.stringify({ status: newStatus }),
      })
      setTicket(updated)
      toast.success(`Ticket marked as ${STATUS_CONFIG[newStatus].label}`)
    } catch (err) {
      toast.error("Failed to update status", {
        description: err instanceof Error ? err.message : "Unknown error",
      })
    }
  }

  async function handleAssign(assignedTo: string | null) {
    if (!ticket) return
    try {
      const updated = await adminFetch<Ticket>(`/api/v1/admin/support/tickets/${ticket.id}/assign`, {
        method: "PATCH",
        body: JSON.stringify({ assigned_to: assignedTo || null }),
      })
      setTicket(updated)
      toast.success("Ticket reassigned")
    } catch (err) {
      toast.error("Failed to assign", {
        description: err instanceof Error ? err.message : "Unknown error",
      })
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (error || !ticket) {
    return (
      <div className="space-y-4">
        <Link href="/admin/support" className="inline-flex items-center gap-1 text-sm text-[#2B7BC4] hover:underline">
          <ArrowLeft className="size-4" /> Back to Tickets
        </Link>
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {error ?? "Ticket not found"}
        </div>
      </div>
    )
  }

  const statusCfg = STATUS_CONFIG[ticket.status]

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link
          href="/admin/support"
          className="flex size-8 items-center justify-center rounded-lg text-gray-400 transition-colors hover:bg-white hover:text-gray-700"
        >
          <ArrowLeft className="size-4" />
        </Link>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-[#0D2137]">{ticket.subject}</h1>
            <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium ${statusCfg.className}`}>
              {statusCfg.label}
            </span>
          </div>
          <p className="mt-0.5 text-sm text-muted-foreground">
            Ticket {ticket.id.slice(0, 8)} · {formatTicketType(ticket.ticket_type)} · {ticket.client_name}
          </p>
        </div>
      </div>

      <div className="flex flex-wrap gap-3">
        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground">Status</Label>
          <Select value={ticket.status} onValueChange={(v) => v && handleStatusChange(v as TicketStatus)}>
            <SelectTrigger className="h-8 w-[160px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="open">Open</SelectItem>
              <SelectItem value="in_progress">In Progress</SelectItem>
              <SelectItem value="awaiting_client">Awaiting Client</SelectItem>
              <SelectItem value="resolved">Resolved</SelectItem>
              <SelectItem value="escalated">Escalated</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground">Assign To</Label>
          <Select value={ticket.assigned_to ?? ""} onValueChange={handleAssign}>
            <SelectTrigger className="h-8 w-[180px]">
              <SelectValue placeholder="Unassigned" />
            </SelectTrigger>
            <SelectContent>
              {team.map((m) => (
                <SelectItem key={m.team_member_id} value={m.team_member_id}>
                  {m.full_name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="rounded-lg border bg-white">
        <div className="border-b px-4 py-3">
          <h3 className="text-sm font-semibold text-[#0D2137]">Conversation</h3>
        </div>
        <div className="max-h-[400px] overflow-y-auto px-4 py-4">
          {messages.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">No messages yet.</p>
          ) : (
            <div className="space-y-4">
              {messages.map((msg) => (
                <div key={msg.id} className="flex gap-3">
                  <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-[#E8F4FD] text-xs font-semibold text-[#2B7BC4]">
                    {msg.sender_name?.charAt(0)?.toUpperCase() ?? "?"}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-[#0D2137]">
                        {msg.sender_name}
                      </span>
                      <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
                        {msg.sender_role === "client" ? "Client" : "Team"}
                      </span>
                      <span className="text-[10px] text-muted-foreground/70">
                        {formatDateTime(msg.created_at)}
                      </span>
                    </div>
                    {msg.message_text && (
                      <p className="mt-1 text-sm text-[#374151]">{msg.message_text}</p>
                    )}
                    {msg.file_url && (
                      <a
                        href={msg.file_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mt-1 inline-block text-xs font-medium text-[#2B7BC4] hover:underline"
                      >
                        {msg.file_name ?? "View attachment"}
                      </a>
                    )}
                  </div>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        {ticket.status !== "resolved" && (
          <div className="border-t px-4 py-3">
            <div className="flex gap-2">
              <Input
                placeholder="Type your reply..."
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault()
                    handleSendReply()
                  }
                }}
                disabled={sending}
              />
              <Button
                onClick={handleSendReply}
                disabled={sending || !replyText.trim()}
                className="bg-[#2B7BC4] text-white hover:bg-[#2B7BC4]/90"
              >
                {sending ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <Send className="size-4" />
                )}
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
