import React, { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useSearchParams } from "react-router";
import {
  LifeBuoy,
  Plus,
  MessageSquare,
  Clock,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Send,
  X,
  PhoneCall,
  Film,
  UserCheck,
  ExternalLink,
} from "lucide-react";
import { request } from "../../lib/http";
import { useAuth } from "../../lib/auth-context";
import { SubscriptionLockedState } from "../../components/portal/SubscriptionLockedState";
import type { TicketItem } from "../../types/api";

export function PortalSupportPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();

  const urlSpecialistId = searchParams.get("specialistId") || "";
  const urlSpecialistName = searchParams.get("specialistName") || "";
  const urlDeliverableId = searchParams.get("deliverableId") || "";

  const [modalOpen, setModalOpen] = useState(
    Boolean(urlSpecialistId || urlDeliverableId)
  );
  const [title, setTitle] = useState(
    urlSpecialistName
      ? `Request for ${urlSpecialistName}`
      : urlDeliverableId
      ? "Reel Modification & Suggestion"
      : ""
  );
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState<"low" | "medium" | "high" | "urgent">("medium");
  const [selectedSpecialistId, setSelectedSpecialistId] = useState<string>(urlSpecialistId);
  const [selectedDeliverableId, setSelectedDeliverableId] = useState<string>(urlDeliverableId);
  const [activeTicketId, setActiveTicketId] = useState<string | null>(null);
  const [replyMessage, setReplyMessage] = useState("");

  useEffect(() => {
    if (urlSpecialistId) setSelectedSpecialistId(urlSpecialistId);
    if (urlDeliverableId) setSelectedDeliverableId(urlDeliverableId);
    if (urlSpecialistId || urlDeliverableId) setModalOpen(true);
  }, [urlSpecialistId, urlDeliverableId]);

  const { data: subData, isLoading: isSubLoading } = useQuery({
    queryKey: ["client-subscription"],
    queryFn: () => request<any>("/api/v1/payments/subscription"),
    staleTime: 0,
    refetchOnMount: "always",
  });

  const isExpired =
    subData?.is_expired === true ||
    subData?.subscription?.status === "expired" ||
    subData?.subscription?.status === "canceled";

  const isStaffOrAdmin = user?.role && user.role !== "client";

  const isSubscribed =
    isStaffOrAdmin ||
    (!isExpired &&
      (subData?.is_active === true ||
        (!!subData?.subscription && ["active", "trialing"].includes(subData?.subscription?.status))));

  // Fetch client tickets
  const { data: tickets = [], isLoading: isTicketsLoading } = useQuery<TicketItem[]>({
    queryKey: ["tickets", user?.id],
    queryFn: async () => {
      try {
        const res = await request<TicketItem[]>("/api/v1/tickets");
        return Array.isArray(res) ? res : [];
      } catch {
        return [];
      }
    },
    enabled: isSubscribed,
    refetchInterval: 10000,
  });

  // Fetch client dashboard to obtain allocated team members
  const { data: dashData } = useQuery({
    queryKey: ["portal-dashboard", user?.id],
    queryFn: () => request<any>("/api/v1/portal/dashboard"),
    enabled: isSubscribed,
  });
  const assignedTeam: any[] = dashData?.assigned_team || [];

  // Fetch client deliverables to allow selective reel / deliverable linking
  const { data: deliverablesData } = useQuery({
    queryKey: ["portal-deliverables-list", user?.id],
    queryFn: () => request<any>("/api/v1/portal/deliverables?limit=50"),
    enabled: isSubscribed,
  });
  const clientDeliverables: any[] = deliverablesData?.items || [];

  // Fetch active ticket detail when expanded
  const { data: activeTicketDetail, isLoading: isActiveTicketLoading } = useQuery({
    queryKey: ["ticket-detail", activeTicketId],
    queryFn: () => request<any>(`/api/v1/tickets/${activeTicketId}`),
    enabled: !!activeTicketId,
  });

  const createTicketMutation = useMutation({
    mutationFn: async (payload: {
      title: string;
      description: string;
      priority: string;
      assigned_to?: string | null;
      deliverable_id?: string | null;
    }) => {
      return await request("/api/v1/tickets", {
        method: "POST",
        body: JSON.stringify(payload),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tickets"] });
      setModalOpen(false);
      setTitle("");
      setDescription("");
      setPriority("medium");
      setSelectedSpecialistId("");
      setSelectedDeliverableId("");
      setSearchParams({}, { replace: true });
    },
  });

  const sendReplyMutation = useMutation({
    mutationFn: async ({ ticketId, message }: { ticketId: string; message: string }) => {
      return await request(`/api/v1/tickets/${ticketId}/messages`, {
        method: "POST",
        body: JSON.stringify({ message }),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ticket-detail", activeTicketId] });
      queryClient.invalidateQueries({ queryKey: ["tickets"] });
      setReplyMessage("");
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !description) return;
    createTicketMutation.mutate({
      title,
      description,
      priority,
      assigned_to: selectedSpecialistId || null,
      deliverable_id: selectedDeliverableId || null,
    });
  };

  const handleReplySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeTicketId || !replyMessage.trim()) return;
    sendReplyMutation.mutate({ ticketId: activeTicketId, message: replyMessage.trim() });
  };

  const appendSuggestion = (text: string) => {
    setDescription((prev) => (prev ? `${prev}\n• ${text}` : `• ${text}`));
  };

  const getPriorityBadge = (p: string) => {
    switch (p) {
      case "urgent":
        return <span className="rounded-full bg-rose-50 text-rose-700 border border-rose-200 px-2 py-0.5 text-[10px] font-bold">Urgent</span>;
      case "high":
        return <span className="rounded-full bg-amber-50 text-amber-700 border border-amber-200 px-2 py-0.5 text-[10px] font-bold">High</span>;
      case "low":
        return <span className="rounded-full bg-slate-100 text-slate-600 border border-slate-200 px-2 py-0.5 text-[10px] font-bold">Low</span>;
      default:
        return <span className="rounded-full bg-blue-50 text-[#2B7BC4] border border-blue-200 px-2 py-0.5 text-[10px] font-bold">Medium</span>;
    }
  };

  const getStatusBadge = (s: string) => {
    switch (s) {
      case "resolved":
      case "closed":
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 px-2.5 py-0.5 text-[10px] font-bold">
            <CheckCircle2 className="size-3" />
            Resolved
          </span>
        );
      case "in_progress":
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 text-amber-700 border border-amber-200 px-2.5 py-0.5 text-[10px] font-bold">
            <Clock className="size-3" />
            In Progress
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 text-[#2B7BC4] border border-blue-200 px-2.5 py-0.5 text-[10px] font-bold">
            <AlertCircle className="size-3" />
            Open
          </span>
        );
    }
  };

  if (isSubLoading) {
    return (
      <div className="mx-auto max-w-5xl space-y-4 sm:space-y-5 animate-page-in">
        <div className="border-b border-border pb-3">
          <h1 className="text-xl sm:text-2xl font-bold text-[#0D2137] tracking-tight">
            Client Support Desk
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Request revisions, deliverable updates, strategy adjustments, or technical inquiries directly with your team.
          </p>
        </div>
        <div className="rounded-3xl border border-slate-200/80 bg-white p-12 text-center shadow-xs flex flex-col items-center justify-center min-h-[320px]">
          <Loader2 className="size-8 text-[#2B7BC4] animate-spin mb-3" />
          <p className="text-xs font-semibold text-slate-500">Checking workspace access...</p>
        </div>
      </div>
    );
  }

  if (!isSubscribed) {
    return (
      <div className="mx-auto max-w-5xl space-y-4 sm:space-y-5 animate-page-in">
        <div className="border-b border-border pb-3">
          <h1 className="text-xl sm:text-2xl font-bold text-[#0D2137] tracking-tight">
            Client Support Desk
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Request revisions, deliverable updates, strategy adjustments, or technical inquiries directly with your team.
          </p>
        </div>
        <SubscriptionLockedState
          title={isExpired ? "Creative Retainer Expired" : "Support Desk Workspace Locked"}
          description={
            isExpired
              ? "Your monthly creative retainer billing cycle has concluded. Priority support queue access is paused until you renew."
              : "Access to dedicated support managers, priority hotline, and ticket queues requires an active retainer plan. Choose a plan to activate support workflows."
          }
        />
      </div>
    );
  }

  const selectedDeliverableObj = clientDeliverables.find((d) => d.id === selectedDeliverableId);

  return (
    <div className="mx-auto max-w-5xl space-y-4 sm:space-y-5 animate-page-in">
      {/* ── Top Header ────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-border pb-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-[#0D2137] tracking-tight">
            Client Support Desk & Creative Pod Requests
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Direct suggestions, revisions, and requests to your allocated Creative Pod specialists or mention specific reels.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <a
            href="https://wa.me/919941999415?text=Hi%2C%20I%20need%20urgent%20support%20regarding%20my%20Creo%20account"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200/80 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-[#E8F4FD] hover:text-[#2B7BC4] transition-all"
          >
            <PhoneCall className="size-3.5 text-[#2B7BC4]" />
            Urgent Hotline
          </a>
          <button
            type="button"
            onClick={() => {
              setTitle("");
              setDescription("");
              setSelectedSpecialistId("");
              setSelectedDeliverableId("");
              setModalOpen(true);
            }}
            className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-[#2B7BC4] to-[#1E609A] px-4 py-2 text-xs font-bold text-white shadow-md shadow-blue-500/20 hover:brightness-110 active:scale-95 transition-all cursor-pointer"
          >
            <Plus className="size-3.5" />
            Open Support Ticket
          </button>
        </div>
      </div>

      {/* ── Creative Pod Quick Contacts Bar ──────────────────────────────── */}
      {assignedTeam && assignedTeam.length > 0 && (
        <div className="rounded-2xl border border-[#C9DFF0] bg-white p-4 shadow-2xs">
          <div className="flex items-center justify-between mb-3 pb-2 border-b border-slate-100">
            <span className="text-xs font-bold uppercase tracking-wider text-[#0D2137] flex items-center gap-2">
              <UserCheck className="size-3.5 text-[#2B7BC4]" />
              <span>Your Allocated Creative Specialists (Direct Requests Available)</span>
            </span>
            <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-md">
              Pod Active
            </span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
            {assignedTeam.map((member) => (
              <div
                key={member.id}
                className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50/80 border border-slate-200/80 hover:border-[#2B7BC4]/50 transition-all text-left"
              >
                <div className="min-w-0 flex-1 pr-2">
                  <p className="text-xs font-bold text-[#0D2137] truncate">{member.name}</p>
                  <p className="text-[10px] text-slate-500 truncate">{member.role}</p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedSpecialistId(member.id);
                    setTitle(`Request for ${member.name}`);
                    setModalOpen(true);
                  }}
                  className="shrink-0 px-2 py-1 rounded-lg bg-[#E8F4FD] text-[#2B7BC4] hover:bg-[#2B7BC4] hover:text-white font-bold text-[10px] transition-colors cursor-pointer"
                >
                  Direct Message
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── SLA Banner ────────────────────────────────────────────────────── */}
      <div className="rounded-2xl border border-blue-200/80 bg-gradient-to-r from-[#E8F4FD] to-sky-50 p-4 sm:p-5 shadow-2xs flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-start sm:items-center gap-3">
          <div className="size-10 rounded-xl bg-[#2B7BC4] text-white flex items-center justify-center shrink-0 shadow-sm">
            <LifeBuoy className="size-5" />
          </div>
          <div>
            <h4 className="text-sm font-bold text-[#0D2137]">Dedicated SLA: Under 4 Business Hours</h4>
            <p className="text-xs text-slate-600 mt-0.5">
              Active subscriptions receive prioritized queue handling, direct creative director reviews, and rapid revision turnarounds.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-white px-3 py-1 text-[11px] font-semibold text-emerald-700 border border-emerald-200">
            <span className="size-2 rounded-full bg-emerald-500 animate-pulse" />
            Desk Operational (10:00 - 19:00 IST)
          </span>
        </div>
      </div>

      {/* ── Ticket List Container ─────────────────────────────────────────── */}
      <div className="space-y-4">
        {isTicketsLoading ? (
          <div className="p-12 text-center text-xs text-slate-400">Loading support tickets...</div>
        ) : tickets.length === 0 ? (
          <div className="rounded-2xl border border-slate-200/80 bg-white p-12 text-center shadow-xs space-y-3">
            <div className="size-12 rounded-full bg-[#E8F4FD] text-[#2B7BC4] flex items-center justify-center mx-auto">
              <LifeBuoy className="size-6" />
            </div>
            <h3 className="text-base font-bold text-[#0D2137]">No Open Tickets</h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              All your content requests and deliverable pipelines are currently running smoothly. Open a ticket anytime you need modifications or suggestions.
            </p>
          </div>
        ) : (
          tickets.map((t) => {
            const isExpanded = activeTicketId === t.id;
            return (
              <div
                key={t.id}
                className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs space-y-3 hover:border-[#2B7BC4]/40 transition-all"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-mono text-xs font-bold text-[#0D2137] bg-slate-100 px-2 py-0.5 rounded">
                      #{t.id.slice(0, 8)}
                    </span>
                    {getPriorityBadge(t.priority)}

                    {/* Referenced Deliverable / Reel Badge */}
                    {t.deliverable_title && (
                      <span className="inline-flex items-center gap-1 text-[11px] font-bold text-[#1E609A] bg-blue-50 border border-blue-200 px-2 py-0.5 rounded-full">
                        <Film className="size-3 text-[#2B7BC4]" />
                        <span>Referenced: {t.deliverable_title}</span>
                      </span>
                    )}

                    {/* Assigned Specialist Badge */}
                    {t.assignee_name && (
                      <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-800 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
                        <UserCheck className="size-3 text-emerald-600" />
                        <span>Directed to: {t.assignee_name}</span>
                      </span>
                    )}
                  </div>
                  <div>{getStatusBadge(t.status)}</div>
                </div>

                <div>
                  <h3 className="text-sm sm:text-base font-bold text-[#0D2137]">{t.title}</h3>
                  <p className="text-xs text-slate-600 mt-1 leading-relaxed">{t.description}</p>
                </div>

                {/* Expanded Thread View */}
                {isExpanded && (
                  <div className="rounded-xl bg-slate-50 border border-slate-200/70 p-4 space-y-4 text-xs animate-fade-in">
                    <div className="flex items-center justify-between border-b border-slate-200/60 pb-2">
                      <span className="font-semibold text-slate-700">Threaded Conversation & Details</span>
                      <span className="text-slate-400 font-mono text-[10px]">Ticket ID: {t.id}</span>
                    </div>

                    {/* Referenced Deliverable Card if present */}
                    {t.deliverable_id && (
                      <div className="p-3 rounded-xl bg-white border border-[#C9DFF0] flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className="size-8 rounded-lg bg-blue-100 flex items-center justify-center text-[#2B7BC4] shrink-0">
                            <Film className="size-4" />
                          </div>
                          <div className="min-w-0">
                            <p className="font-bold text-xs text-[#0D2137] truncate">
                              Linked Deliverable: {t.deliverable_title || `#${t.deliverable_id.slice(0, 8)}`}
                            </p>
                            <p className="text-[10px] text-slate-500">
                              Direct suggestions and feedback apply to this specific asset.
                            </p>
                          </div>
                        </div>
                        {t.deliverable_file_url && (
                          <a
                            href={t.deliverable_file_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-[11px] font-semibold text-[#2B7BC4] hover:underline shrink-0 flex items-center gap-1"
                          >
                            <span>Inspect File</span>
                            <ExternalLink className="size-3" />
                          </a>
                        )}
                      </div>
                    )}

                    {/* Messages List */}
                    <div className="space-y-2.5 max-h-60 overflow-y-auto pr-1">
                      {isActiveTicketLoading ? (
                        <div className="py-4 text-center text-slate-400">Loading messages...</div>
                      ) : activeTicketDetail?.messages && activeTicketDetail.messages.length > 0 ? (
                        activeTicketDetail.messages.map((m: any) => {
                          const isMe = m.sender_id === user?.id;
                          return (
                            <div
                              key={m.id}
                              className={`p-3 rounded-xl max-w-[85%] ${
                                isMe
                                  ? "ml-auto bg-[#E8F4FD] border border-[#C9DFF0] text-[#0D2137]"
                                  : "mr-auto bg-white border border-slate-200 text-[#0D2137]"
                              }`}
                            >
                              <div className="flex items-center justify-between gap-4 mb-1 text-[10px] text-slate-500">
                                <span className="font-bold">{isMe ? "You" : t.assignee_name || "Specialist / Staff"}</span>
                                <span>{new Date(m.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
                              </div>
                              <p className="text-xs leading-relaxed whitespace-pre-wrap">{m.message}</p>
                            </div>
                          );
                        })
                      ) : (
                        <p className="text-slate-500 italic text-[11px]">
                          No replies yet. Your creative specialist has been notified.
                        </p>
                      )}
                    </div>

                    {/* Quick Reply Form */}
                    <form onSubmit={handleReplySubmit} className="flex gap-2 pt-2 border-t border-slate-200/60">
                      <input
                        type="text"
                        value={replyMessage}
                        onChange={(e) => setReplyMessage(e.target.value)}
                        placeholder="Write a message or reply to your specialist..."
                        className="flex-1 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-900 focus:border-[#2B7BC4] focus:outline-none"
                      />
                      <button
                        type="submit"
                        disabled={sendReplyMutation.isPending || !replyMessage.trim()}
                        className="inline-flex items-center gap-1.5 rounded-xl bg-[#2B7BC4] px-4 py-2 text-xs font-bold text-white hover:bg-[#1E609A] transition-colors disabled:opacity-50 cursor-pointer"
                      >
                        {sendReplyMutation.isPending ? (
                          <Loader2 className="size-3.5 animate-spin" />
                        ) : (
                          <Send className="size-3.5" />
                        )}
                        <span>Reply</span>
                      </button>
                    </form>
                  </div>
                )}

                <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-[11px] text-slate-400">
                  <span>Submitted {new Date(t.created_at).toLocaleDateString()}</span>
                  <button
                    type="button"
                    onClick={() => setActiveTicketId(isExpanded ? null : t.id)}
                    className="flex items-center gap-1 text-[#2B7BC4] font-semibold hover:underline cursor-pointer"
                  >
                    <MessageSquare className="size-3" />
                    {isExpanded ? "Hide Details" : "View Details / Thread"}
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* ── New Support Ticket Modal ──────────────────────────────────────── */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-md p-4 animate-fade-in">
          <div className="w-full max-w-lg rounded-3xl border border-slate-100 bg-white p-6 sm:p-7 shadow-2xl space-y-4 animate-scale-in max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3.5">
              <h3 className="text-base font-bold text-[#0D2137] flex items-center gap-2">
                <div className="size-8 rounded-xl bg-[#E8F4FD] text-[#2B7BC4] flex items-center justify-center border border-[#C9DFF0]">
                  <LifeBuoy className="size-4" />
                </div>
                <span>New Creative Request / Support Ticket</span>
              </h3>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="size-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-200 transition-colors cursor-pointer"
              >
                <X className="size-4" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* 1. Direct Request to Specialist */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Direct Request to Specialist (Optional)
                </label>
                <select
                  value={selectedSpecialistId}
                  onChange={(e) => setSelectedSpecialistId(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-xs font-semibold text-[#0D2137] shadow-2xs appearance-none bg-[url('data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2216%22%20height%3D%2216%22%20viewBox%3D%220%200%2024%2024%20fill%3D%22none%22%20stroke%3D%22%232B7BC4%22%20stroke-width%3D%222.5%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%3E%3Cpath%20d%3D%22m6%209%206%206%206-6%22%2F%3E%3C%2Fsvg%3E')] bg-[position:right_0.85rem_center] bg-no-repeat pr-9 hover:border-[#2B7BC4]/60 focus:border-[#2B7BC4] focus:ring-2 focus:ring-[#2B7BC4]/20 focus:outline-none transition-all cursor-pointer"
                >
                  <option value="">🌟 General Creative Pod (Any Available Lead)</option>
                  {assignedTeam.map((m) => (
                    <option key={m.id} value={m.id}>
                      👤 {m.name} — {m.role}
                    </option>
                  ))}
                </select>
                <p className="text-[10px] text-slate-500 mt-1">
                  Assign directly to your dedicated editor or designer for prompt execution.
                </p>
              </div>

              {/* 2. Selective Reel / Deliverable Picker */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-bold text-slate-700">
                    Reference Specific Reel / Deliverable (Optional)
                  </label>
                  {selectedDeliverableId && (
                    <button
                      type="button"
                      onClick={() => setSelectedDeliverableId("")}
                      className="text-[11px] font-bold text-rose-600 hover:underline cursor-pointer"
                    >
                      Clear Selection
                    </button>
                  )}
                </div>
                <select
                  value={selectedDeliverableId}
                  onChange={(e) => {
                    const val = e.target.value;
                    setSelectedDeliverableId(val);
                    if (val && !title) {
                      const d = clientDeliverables.find((item) => item.id === val);
                      const isReel = (d?.file_type || "").includes("video");
                      setTitle(`${isReel ? "Reel" : "Deliverable"} #${val.slice(0, 6)} Revision`);
                    }
                  }}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-xs font-semibold text-[#0D2137] shadow-2xs appearance-none bg-[url('data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2216%22%20height%3D%2216%22%20viewBox%3D%220%200%2024%2024%20fill%3D%22none%22%20stroke%3D%22%232B7BC4%22%20stroke-width%3D%222.5%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%3E%3Cpath%20d%3D%22m6%209%206%206%206-6%22%2F%3E%3C%2Fsvg%3E')] bg-[position:right_0.85rem_center] bg-no-repeat pr-9 hover:border-[#2B7BC4]/60 focus:border-[#2B7BC4] focus:ring-2 focus:ring-[#2B7BC4]/20 focus:outline-none transition-all cursor-pointer"
                >
                  <option value="">None (General Inquiry / Strategic Request)</option>
                  {clientDeliverables.map((d) => {
                    const isReel = (d.file_type || "").includes("video") || d.file_url?.includes("reel");
                    const label = `${isReel ? "🎬 Reel" : "🎨 Graphic"} #${d.id.slice(0, 6)} (v${d.version}) • Status: ${d.status}`;
                    return (
                      <option key={d.id} value={d.id}>
                        {label}
                      </option>
                    );
                  })}
                </select>

                {selectedDeliverableObj && (
                  <div className="mt-2 p-2.5 rounded-xl bg-blue-50/80 border border-blue-200 text-xs flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Film className="size-4 text-[#2B7BC4]" />
                      <span className="font-bold text-[#0D2137]">
                        Reel #{selectedDeliverableObj.id.slice(0, 6)} (Version {selectedDeliverableObj.version})
                      </span>
                    </div>
                    <span className="text-[10px] font-bold text-[#2B7BC4] uppercase">
                      {selectedDeliverableObj.status}
                    </span>
                  </div>
                )}
              </div>

              {/* 3. Subject */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">Subject</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Request hook pacing adjustment on Reel #1"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-xs text-slate-900 font-medium shadow-2xs hover:border-slate-300 focus:border-[#2B7BC4] focus:ring-2 focus:ring-[#2B7BC4]/20 focus:outline-none transition-all"
                />
              </div>

              {/* 4. Priority */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">Priority</label>
                <select
                  value={priority}
                  onChange={(e) => setPriority(e.target.value as any)}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-xs font-semibold text-[#0D2137] shadow-2xs appearance-none bg-[url('data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2216%22%20height%3D%2216%22%20viewBox%3D%220%200%2024%2024%20fill%3D%22none%22%20stroke%3D%22%232B7BC4%22%20stroke-width%3D%222.5%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%3E%3Cpath%20d%3D%22m6%209%206%206%206-6%22%2F%3E%3C%2Fsvg%3E')] bg-[position:right_0.85rem_center] bg-no-repeat pr-9 hover:border-[#2B7BC4]/60 focus:border-[#2B7BC4] focus:ring-2 focus:ring-[#2B7BC4]/20 focus:outline-none transition-all cursor-pointer"
                >
                  <option value="low">Low (General Inquiry / Backlog Idea)</option>
                  <option value="medium">Medium (Standard Modification)</option>
                  <option value="high">High (Urgent Content Adjustment)</option>
                  <option value="urgent">Urgent (Publishing Blocked)</option>
                </select>
              </div>

              {/* 5. Suggestion Presets & Details */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-bold text-slate-700">
                    Suggestions & Instructions
                  </label>
                  <span className="text-[10px] text-slate-400 font-semibold">Click to insert preset:</span>
                </div>

                {/* Preset Chips */}
                <div className="flex flex-wrap gap-1.5 mb-2">
                  <button
                    type="button"
                    onClick={() => appendSuggestion("Hook timing: Speed up transition in first 0:02 seconds.")}
                    className="text-[10px] font-bold text-[#2B7BC4] bg-[#E8F4FD] border border-[#C9DFF0] px-2.5 py-1 rounded-lg hover:bg-[#2B7BC4] hover:text-white transition-all cursor-pointer shadow-2xs"
                  >
                    + Hook Timing
                  </button>
                  <button
                    type="button"
                    onClick={() => appendSuggestion("Audio swap: Replace background track with trending upbeat audio.")}
                    className="text-[10px] font-bold text-[#2B7BC4] bg-[#E8F4FD] border border-[#C9DFF0] px-2.5 py-1 rounded-lg hover:bg-[#2B7BC4] hover:text-white transition-all cursor-pointer shadow-2xs"
                  >
                    + Audio Swap
                  </button>
                  <button
                    type="button"
                    onClick={() => appendSuggestion("Caption & Text: Make hook text bold yellow with drop shadow.")}
                    className="text-[10px] font-bold text-[#2B7BC4] bg-[#E8F4FD] border border-[#C9DFF0] px-2.5 py-1 rounded-lg hover:bg-[#2B7BC4] hover:text-white transition-all cursor-pointer shadow-2xs"
                  >
                    + Bold Captions
                  </button>
                  <button
                    type="button"
                    onClick={() => appendSuggestion("Color grading: Enhance contrast and match brand palette hex.")}
                    className="text-[10px] font-bold text-[#2B7BC4] bg-[#E8F4FD] border border-[#C9DFF0] px-2.5 py-1 rounded-lg hover:bg-[#2B7BC4] hover:text-white transition-all cursor-pointer shadow-2xs"
                  >
                    + Color Grade
                  </button>
                </div>

                <textarea
                  rows={4}
                  required
                  placeholder="Detail your suggestions, timestamp ranges (e.g. 0:01 - 0:04), or creative direction..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-xs text-slate-900 font-medium shadow-2xs hover:border-slate-300 focus:border-[#2B7BC4] focus:ring-2 focus:ring-[#2B7BC4]/20 focus:outline-none resize-none leading-relaxed transition-all"
                />
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="rounded-xl border border-slate-200 px-4 py-2.5 text-xs font-bold text-slate-600 hover:bg-slate-100 cursor-pointer transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createTicketMutation.isPending}
                  className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-[#2B7BC4] to-[#1E609A] px-5 py-2.5 text-xs font-bold text-white hover:brightness-110 active:scale-95 shadow-md shadow-blue-500/20 disabled:opacity-50 cursor-pointer transition-all"
                >
                  {createTicketMutation.isPending ? (
                    <Loader2 className="size-3.5 animate-spin" />
                  ) : (
                    <Send className="size-3.5" />
                  )}
                  Submit to Creative Team
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default PortalSupportPage;
