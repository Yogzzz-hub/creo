"use client";

import { useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { RealtimeChannel } from "@supabase/supabase-js";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Send, MessageSquare } from "lucide-react";
import { cn } from "@/lib/utils";

interface Ticket {
  id: string;
  user_id: string;
  ticket_type: string;
  subject: string;
  description: string;
  status: string;
  assigned_to: string | null;
  created_at: string;
  resolved_at: string | null;
}

interface TicketMessage {
  id: string;
  ticket_id: string;
  sender_id: string;
  message_text: string;
  file_url: string | null;
  created_at: string;
}

export default function ChatPage() {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [selectedTicketId, setSelectedTicketId] = useState<string | null>(null);
  const [messages, setMessages] = useState<TicketMessage[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const channelRef = useRef<RealtimeChannel | null>(null);

  const supabase = createClient();

  useEffect(() => {
    fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/team/tickets`)
      .then((res) => res.json())
      .then((data) => setTickets(data))
      .catch(console.error);
  }, []);

  useEffect(() => {
    if (!selectedTicketId) {
      setMessages([]);
      return;
    }

    setLoadingMessages(true);
    fetch(
      `${process.env.NEXT_PUBLIC_API_URL}/api/v1/team/tickets/${selectedTicketId}/messages`
    )
      .then((res) => res.json())
      .then((data) => {
        setMessages(data);
        setLoadingMessages(false);
      })
      .catch((err) => {
        console.error(err);
        setLoadingMessages(false);
      });
  }, [selectedTicketId]);

  useEffect(() => {
    if (!selectedTicketId) {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
      return;
    }

    const channel = supabase
      .channel(`ticket:${selectedTicketId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "ticket_messages",
          filter: `ticket_id=eq.${selectedTicketId}`,
        },
        (payload) => {
          const newMessage = payload.new as TicketMessage;
          setMessages((prev) => [...prev, newMessage]);
        }
      )
      .subscribe();

    channelRef.current = channel;

    return () => {
      supabase.removeChannel(channel);
      channelRef.current = null;
    };
  }, [selectedTicketId, supabase]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !selectedTicketId || sending) return;

    setSending(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (session?.access_token) {
        headers["Authorization"] = `Bearer ${session.access_token}`;
      }

      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/v1/team/tickets/${selectedTicketId}/messages`,
        {
          method: "POST",
          headers,
          body: JSON.stringify({ message_text: newMessage.trim() }),
        }
      );
      if (res.ok) {
        setNewMessage("");
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSending(false);
    }
  };

  const selectedTicket = tickets.find((t) => t.id === selectedTicketId);

  const formatTime = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  };

  return (
    <div className="flex h-full">
      {/* Sidebar — assigned ticket threads */}
      <div className="flex w-80 flex-col border-r border-[var(--color-border)] bg-white">
        <div className="flex h-14 items-center border-b border-[var(--color-border)] px-4">
          <h1 className="text-base font-semibold text-[var(--color-deep-navy)]">Conversations</h1>
        </div>
        <div className="flex-1 overflow-y-auto">
          {tickets.length === 0 && (
            <p className="px-4 py-8 text-center text-sm text-[var(--color-steel-mid)]">
              No assigned tickets.
            </p>
          )}
          {tickets.map((ticket) => (
            <button
              key={ticket.id}
              onClick={() => setSelectedTicketId(ticket.id)}
              className={cn(
                "flex w-full flex-col gap-1 border-b border-[var(--color-border)] px-4 py-3 text-left transition-colors hover:bg-[var(--color-sky-wash)]",
                selectedTicketId === ticket.id && "bg-[var(--color-sky-wash)]"
              )}
            >
              <span className="text-sm font-medium text-[var(--color-deep-navy)]">
                {ticket.subject}
              </span>
              <span className="truncate text-xs text-[var(--color-steel-mid)]">
                {ticket.description}
              </span>
              <span className="text-[10px] text-[var(--color-steel-mid)]">
                {new Date(ticket.created_at).toLocaleDateString()}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Main chat window */}
      <div className="flex flex-1 flex-col bg-[var(--color-surface)]">
        {selectedTicketId ? (
          <>
            {/* Chat header */}
            <div className="flex h-14 items-center gap-3 border-b border-[var(--color-border)] bg-white px-5">
              <MessageSquare size={18} className="text-[var(--color-brand)]" />
              <span className="text-sm font-semibold text-[var(--color-deep-navy)]">
                {selectedTicket?.subject}
              </span>
              <span
                className={cn(
                  "ml-auto rounded-full px-2 py-0.5 text-[10px] font-medium uppercase",
                  selectedTicket?.status === "open"
                    ? "bg-green-100 text-green-700"
                    : selectedTicket?.status === "in_progress"
                      ? "bg-yellow-100 text-yellow-700"
                      : "bg-gray-100 text-gray-600"
                )}
              >
                {selectedTicket?.status?.replace("_", " ")}
              </span>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto px-5 py-4">
              {loadingMessages ? (
                <p className="py-8 text-center text-sm text-[var(--color-steel-mid)]">
                  Loading messages…
                </p>
              ) : messages.length === 0 ? (
                <p className="py-8 text-center text-sm text-[var(--color-steel-mid)]">
                  No messages yet. Start the conversation.
                </p>
              ) : (
                <div className="space-y-3">
                  {messages.map((msg) => (
                    <div key={msg.id} className="flex flex-col gap-1">
                      <div className="flex items-baseline gap-2">
                        <span className="text-xs font-medium text-[var(--color-deep-navy)]">
                          {msg.sender_id === selectedTicket?.assigned_to ? "You" : "Client"}
                        </span>
                        <span className="text-[10px] text-[var(--color-steel-mid)]">
                          {formatTime(msg.created_at)}
                        </span>
                      </div>
                      <p className="text-sm leading-relaxed text-[var(--color-text)]">
                        {msg.message_text}
                      </p>
                    </div>
                  ))}
                  <div ref={messagesEndRef} />
                </div>
              )}
            </div>

            {/* Message input */}
            <div className="border-t border-[var(--color-border)] bg-white px-5 py-3">
              <form onSubmit={handleSendMessage} className="flex gap-2">
                <Input
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  placeholder="Type a message…"
                  className="flex-1"
                  disabled={sending}
                />
                <Button
                  type="submit"
                  disabled={sending || !newMessage.trim()}
                  size="sm"
                  className="gap-1.5 bg-[var(--color-brand)] text-white hover:bg-[var(--color-brand)]/90"
                >
                  <Send size={14} />
                  Send
                </Button>
              </form>
            </div>
          </>
        ) : (
          <div className="flex flex-1 items-center justify-center">
            <div className="text-center">
              <MessageSquare size={48} className="mx-auto mb-3 text-[var(--color-steel-mid)]/40" />
              <p className="text-sm text-[var(--color-steel-mid)]">
                Select a conversation to start chatting.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
