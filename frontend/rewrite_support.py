new_code = """import React, { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useSearchParams } from "react-router";
import {
  LifeBuoy,
  MessageSquare,
  Clock,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Send,
  X,
  Film,
  UserCheck,
  ExternalLink,
  Plus,
  History
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

  const { data: dashData } = useQuery({
    queryKey: ["portal-dashboard", user?.id],
    queryFn: () => request<any>("/api/v1/portal/dashboard"),
    enabled: isSubscribed,
  });
  const assignedTeam: any[] = dashData?.assigned_team || [];

  const { data: deliverablesData } = useQuery({
    queryKey: ["portal-deliverables-list", user?.id],
    queryFn: () => request<any>("/api/v1/portal/deliverables?limit=50"),
    enabled: isSubscribed,
  });
  const clientDeliverables: any[] = deliverablesData?.items || [];

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
    setDescription((prev) => (prev ? `${prev}\\n• ${text}` : `• ${text}`));
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
        return <span className="rounded-full bg-blue-50 text-[#0052FF] border border-blue-200 px-2 py-0.5 text-[10px] font-bold">Medium</span>;
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
          <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 text-[#0052FF] border border-blue-200 px-2.5 py-0.5 text-[10px] font-bold">
            <AlertCircle className="size-3" />
            Open
          </span>
        );
    }
  };

  if (isSubLoading) {
    return (
      <div className="mx-auto max-w-[1600px] animate-page-in space-y-6">
        <div className="card-surface p-12 text-center flex flex-col items-center justify-center min-h-[320px]">
          <Loader2 className="size-8 text-[#0052FF] animate-spin mb-3" />
          <p className="text-xs font-semibold text-slate-500">Checking workspace access...</p>
        </div>
      </div>
    );
  }

  if (!isSubscribed) {
    return (
      <div className="mx-auto max-w-[1600px] animate-page-in space-y-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-[#0F172A] tracking-tight">Support & Requests</h1>
          <p className="text-sm text-[#64748B] mt-1">Request revisions, strategy adjustments, or technical inquiries directly with your team.</p>
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
    <div className="mx-auto max-w-[1600px] animate-page-in space-y-6 pb-10">
      
      {/* ── Allocated Specialists (Top Box) ──────────────────────────────── */}
      {assignedTeam && assignedTeam.length > 0 && (
        <div className="card-surface p-6 sm:p-7">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
            <div className="flex items-center gap-3">
              <div className="size-10 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center text-[#0052FF] shrink-0">
                <UserCheck className="size-5" />
              </div>
              <h2 className="text-sm sm:text-base font-black text-[#0F172A] tracking-tight uppercase">
                Your Allocated Creative Specialists <span className="text-slate-400 font-medium normal-case">(Direct Requests Available)</span>
              </h2>
            </div>
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-100">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              Pod Active
            </span>
          </div>
          
          <div className="flex flex-nowrap overflow-x-auto gap-4 pb-2 scrollbar-hide">
            {assignedTeam.map((member) => {
              const initials = member.name.split(" ").map((n: string) => n[0]).join("").slice(0, 2);
              return (
                <div
                  key={member.id}
                  className="flex items-center justify-between p-4 rounded-2xl bg-white border border-slate-100 hover:border-slate-300 hover:shadow-md transition-all min-w-[280px] shrink-0 gap-4"
                >
                  <div className="flex items-center gap-3">
                    <div className="relative">
                      <div className="size-10 rounded-full bg-blue-100 text-[#0052FF] flex items-center justify-center font-bold text-xs border border-blue-200">
                        {initials}
                      </div>
                      <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-emerald-500 border border-white rounded-full" />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-[#0F172A]">{member.name}</p>
                      <p className="text-[10px] text-slate-500 font-medium">{member.role}</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedSpecialistId(member.id);
                      setTitle(`Request for ${member.name}`);
                      setModalOpen(true);
                    }}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-50 text-[#0052FF] hover:bg-[#0052FF] hover:text-white font-bold text-[10px] transition-colors cursor-pointer group"
                  >
                    <MessageSquare className="size-3 transition-transform group-hover:scale-110" />
                    Direct Message
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── SLA Banner (Middle Box) ────────────────────────────────────────────────────── */}
      <div className="card-surface p-6 sm:p-7 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-start sm:items-center gap-4">
          <div className="size-12 rounded-2xl bg-[#0052FF] text-white flex items-center justify-center shrink-0 shadow-md">
            <LifeBuoy className="size-6" />
          </div>
          <div>
            <h4 className="text-base font-black text-[#0F172A]">Dedicated SLA: Under 4 Business Hours</h4>
            <p className="text-[13px] text-slate-500 mt-0.5 font-medium">
              Active subscriptions receive prioritized queue handling, direct creative director reviews, and rapid revision turnarounds.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0 bg-slate-50 border border-slate-200 rounded-full px-4 py-2">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
          <span className="text-[11px] font-bold text-[#0F172A]">Desk Operational <span className="text-slate-400 font-medium ml-1">(10:00 - 19:00 IST)</span></span>
        </div>
      </div>

      {/* ── Ticket List Container (Bottom Box) ─────────────────────────────────────────── */}
      <div className="card-surface p-6 sm:p-8 min-h-[400px]">
        {isTicketsLoading ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <Loader2 className="size-8 text-[#0052FF] animate-spin mb-4" />
            <p className="text-sm font-bold text-slate-500">Loading support tickets...</p>
          </div>
        ) : tickets.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center animate-fade-in">
            <div className="size-16 rounded-full bg-blue-50 text-[#0052FF] border border-blue-100 flex items-center justify-center mb-6 shadow-sm">
              <LifeBuoy className="size-8" />
            </div>
            <h3 className="text-2xl font-black text-[#0F172A] mb-3">No Open Tickets</h3>
            <p className="text-[13px] text-slate-500 max-w-md mx-auto mb-8 font-medium leading-relaxed">
              All your content requests and deliverable pipelines are currently running smoothly. Open a ticket anytime you need modifications or suggestions.
            </p>
            <div className="flex items-center gap-4">
              <button
                onClick={() => setModalOpen(true)}
                className="flex items-center gap-2 bg-[#0052FF] text-white px-6 py-2.5 rounded-xl text-[13px] font-bold hover:bg-[#0045D8] transition-colors shadow-sm active:scale-95 cursor-pointer"
              >
                <Plus className="size-4" /> Raise a Ticket
              </button>
              <button className="flex items-center gap-2 bg-white text-slate-600 border border-slate-200 px-6 py-2.5 rounded-xl text-[13px] font-bold hover:bg-slate-50 hover:text-slate-900 transition-colors shadow-2xs active:scale-95 cursor-pointer">
                <History className="size-4" /> View Ticket History
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-4 animate-fade-in">
            <div className="flex items-center justify-between mb-6 pb-4 border-b border-slate-100">
               <h3 className="text-lg font-black text-[#0F172A]">Active Support Tickets</h3>
               <button
                  onClick={() => setModalOpen(true)}
                  className="flex items-center gap-1.5 bg-[#0052FF] text-white px-4 py-2 rounded-xl text-[11px] font-bold hover:bg-[#0045D8] transition-colors shadow-sm active:scale-95 cursor-pointer"
                >
                  <Plus className="size-3.5" /> Raise Ticket
                </button>
            </div>
            {tickets.map((t) => {
              const isExpanded = activeTicketId === t.id;
              return (
                <div
                  key={t.id}
                  className="rounded-2xl border border-slate-100 bg-white p-5 space-y-3 hover:border-slate-300 hover:shadow-md transition-all"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-mono text-[11px] font-bold text-slate-500 bg-slate-50 border border-slate-200 px-2.5 py-1 rounded-md">
                        #{t.id.slice(0, 8)}
                      </span>
                      {getPriorityBadge(t.priority)}

                      {/* Referenced Deliverable / Reel Badge */}
                      {t.deliverable_title && (
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-[#0045D8] bg-blue-50 border border-blue-200 px-2.5 py-1 rounded-md">
                          <Film className="size-3 text-[#0052FF]" />
                          <span>Ref: {t.deliverable_title}</span>
                        </span>
                      )}

                      {/* Assigned Specialist Badge */}
                      {t.assignee_name && (
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-800 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-md">
                          <UserCheck className="size-3 text-emerald-600" />
                          <span>Direct: {t.assignee_name}</span>
                        </span>
                      )}
                    </div>
                    <div>{getStatusBadge(t.status)}</div>
                  </div>

                  <div className="pt-2">
                    <h3 className="text-sm sm:text-base font-bold text-[#0F172A]">{t.title}</h3>
                    <p className="text-[13px] text-slate-500 mt-1.5 leading-relaxed">{t.description}</p>
                  </div>

                  {/* Expanded Thread View */}
                  {isExpanded && (
                    <div className="rounded-xl bg-slate-50/50 border border-slate-200/70 p-5 mt-4 space-y-5 text-xs animate-fade-in shadow-inner">
                      <div className="flex items-center justify-between border-b border-slate-200 pb-3">
                        <span className="font-bold text-[#0F172A] flex items-center gap-2">
                          <MessageSquare className="size-4 text-[#0052FF]" /> 
                          Threaded Conversation
                        </span>
                        <span className="text-slate-400 font-mono text-[10px]">ID: {t.id}</span>
                      </div>

                      {/* Referenced Deliverable Card if present */}
                      {t.deliverable_id && (
                        <div className="p-3.5 rounded-xl bg-white border border-[#E2E8F0] shadow-sm flex items-center justify-between gap-3">
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="size-10 rounded-xl bg-blue-50 flex items-center justify-center text-[#0052FF] shrink-0 border border-blue-100">
                              <Film className="size-5" />
                            </div>
                            <div className="min-w-0">
                              <p className="font-bold text-[13px] text-[#0F172A] truncate">
                                Linked Deliverable: {t.deliverable_title || `#${t.deliverable_id.slice(0, 8)}`}
                              </p>
                              <p className="text-[11px] text-slate-500 mt-0.5">
                                Direct suggestions apply to this specific asset.
                              </p>
                            </div>
                          </div>
                          {t.deliverable_file_url && (
                            <a
                              href={t.deliverable_file_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-[11px] font-bold text-[#0052FF] bg-blue-50 border border-blue-100 px-3 py-1.5 rounded-lg hover:bg-[#0052FF] hover:text-white shrink-0 flex items-center gap-1.5 transition-colors"
                            >
                              <span>Inspect</span>
                              <ExternalLink className="size-3.5" />
                            </a>
                          )}
                        </div>
                      )}

                      {/* Messages List */}
                      <div className="space-y-4 max-h-80 overflow-y-auto pr-2 custom-scrollbar">
                        {isActiveTicketLoading ? (
                          <div className="py-6 flex justify-center"><Loader2 className="size-5 text-slate-400 animate-spin" /></div>
                        ) : activeTicketDetail?.messages && activeTicketDetail.messages.length > 0 ? (
                          activeTicketDetail.messages.map((m: any) => {
                            const isMe = m.sender_id === user?.id;
                            return (
                              <div
                                key={m.id}
                                className={`p-4 rounded-2xl max-w-[85%] shadow-2xs ${
                                  isMe
                                    ? "ml-auto bg-[#0052FF] text-white rounded-tr-sm"
                                    : "mr-auto bg-white border border-slate-200 text-[#0F172A] rounded-tl-sm"
                                }`}
                              >
                                <div className={`flex items-center justify-between gap-4 mb-2 text-[10px] ${isMe ? "text-blue-100" : "text-slate-400"}`}>
                                  <span className="font-bold">{isMe ? "You" : t.assignee_name || "Specialist / Staff"}</span>
                                  <span>{new Date(m.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
                                </div>
                                <p className="text-[13px] leading-relaxed whitespace-pre-wrap">{m.message}</p>
                              </div>
                            );
                          })
                        ) : (
                          <div className="text-center py-6">
                             <p className="text-slate-400 font-medium text-[12px]">
                               No replies yet. Your creative specialist has been notified.
                             </p>
                          </div>
                        )}
                      </div>

                      {/* Quick Reply Form */}
                      <form onSubmit={handleReplySubmit} className="flex gap-3 pt-4 border-t border-slate-200">
                        <input
                          type="text"
                          value={replyMessage}
                          onChange={(e) => setReplyMessage(e.target.value)}
                          placeholder="Write a message or reply to your specialist..."
                          className="flex-1 rounded-xl border border-slate-200 bg-white px-4 py-3 text-[13px] font-medium text-slate-900 shadow-sm focus:border-[#0052FF] focus:ring-2 focus:ring-[#0052FF]/20 focus:outline-none transition-all"
                        />
                        <button
                          type="submit"
                          disabled={sendReplyMutation.isPending || !replyMessage.trim()}
                          className="inline-flex items-center gap-2 rounded-xl bg-[#0052FF] px-6 py-3 text-[13px] font-bold text-white hover:bg-[#0045D8] transition-colors shadow-sm disabled:opacity-50 cursor-pointer active:scale-95"
                        >
                          {sendReplyMutation.isPending ? (
                            <Loader2 className="size-4 animate-spin" />
                          ) : (
                            <Send className="size-4" />
                          )}
                          <span>Send</span>
                        </button>
                      </form>
                    </div>
                  )}

                  <div className="flex items-center justify-between pt-3 border-t border-slate-100 mt-3 text-[11px] font-medium text-slate-400">
                    <span>Submitted {new Date(t.created_at).toLocaleDateString()}</span>
                    <button
                      type="button"
                      onClick={() => setActiveTicketId(isExpanded ? null : t.id)}
                      className="flex items-center gap-1.5 text-[#0052FF] font-bold hover:underline cursor-pointer bg-blue-50 px-3 py-1 rounded-lg transition-colors"
                    >
                      <MessageSquare className="size-3" />
                      {isExpanded ? "Close Thread" : "Open Thread"}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Footer ─────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row items-center justify-between pt-8 pb-4 px-2 text-[11px] font-medium text-slate-500 border-t border-slate-200/50 mt-12">
        <span>© 2026 Creo Creative Execution Unit. All rights reserved.</span>
        <div className="flex items-center gap-6 mt-4 sm:mt-0">
          <a href="#" className="hover:text-slate-800 transition-colors">Privacy Policy</a>
          <a href="#" className="hover:text-slate-800 transition-colors">Terms of Service</a>
          <a href="#" className="hover:text-slate-800 transition-colors">Security SLA</a>
        </div>
      </div>

      {/* ── New Support Ticket Modal ──────────────────────────────────────── */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-md p-4 animate-fade-in">
          <div className="w-full max-w-lg card-surface card-interactive shadow-2xl p-6 sm:p-8 space-y-5 animate-scale-in max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <h3 className="text-lg font-black text-[#0F172A] flex items-center gap-3">
                <div className="size-10 rounded-xl bg-blue-50 text-[#0052FF] flex items-center justify-center border border-blue-100">
                  <LifeBuoy className="size-5" />
                </div>
                <span>New Support Request</span>
              </h3>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="size-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-200 transition-colors cursor-pointer"
              >
                <X className="size-4" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              {/* 1. Direct Request to Specialist */}
              <div>
                <label className="block text-[13px] font-bold text-[#0F172A] mb-2">
                  Direct Request to Specialist <span className="text-slate-400 font-medium">(Optional)</span>
                </label>
                <select
                  value={selectedSpecialistId}
                  onChange={(e) => setSelectedSpecialistId(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-[13px] font-semibold text-[#0F172A] shadow-2xs appearance-none bg-[url('data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2216%22%20height%3D%2216%22%20viewBox%3D%220%200%2024%2024%20fill%3D%22none%22%20stroke%3D%22%232B7BC4%22%20stroke-width%3D%222.5%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%3E%3Cpath%20d%3D%22m6%209%206%206%206-6%22%2F%3E%3C%2Fsvg%3E')] bg-[position:right_1rem_center] bg-no-repeat pr-10 hover:border-[#0052FF]/60 focus:border-[#0052FF] focus:ring-2 focus:ring-[#0052FF]/20 focus:outline-none transition-all cursor-pointer"
                >
                  <option value="">🌟 General Creative Pod (Any Available Lead)</option>
                  {assignedTeam.map((m) => (
                    <option key={m.id} value={m.id}>
                      👤 {m.name} — {m.role}
                    </option>
                  ))}
                </select>
                <p className="text-[11px] text-slate-500 mt-1.5 font-medium">
                  Assign directly to your dedicated editor or designer for prompt execution.
                </p>
              </div>

              {/* 2. Selective Reel / Deliverable Picker */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-[13px] font-bold text-[#0F172A]">
                    Reference Asset <span className="text-slate-400 font-medium">(Optional)</span>
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
                  className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-[13px] font-semibold text-[#0F172A] shadow-2xs appearance-none bg-[url('data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2216%22%20height%3D%2216%22%20viewBox%3D%220%200%2024%2024%20fill%3D%22none%22%20stroke%3D%22%232B7BC4%22%20stroke-width%3D%222.5%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%3E%3Cpath%20d%3D%22m6%209%206%206%206-6%22%2F%3E%3C%2Fsvg%3E')] bg-[position:right_1rem_center] bg-no-repeat pr-10 hover:border-[#0052FF]/60 focus:border-[#0052FF] focus:ring-2 focus:ring-[#0052FF]/20 focus:outline-none transition-all cursor-pointer"
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
              </div>

              {/* 3. Subject */}
              <div>
                <label className="block text-[13px] font-bold text-[#0F172A] mb-2">Subject</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Request hook pacing adjustment on Reel #1"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-[13px] text-slate-900 font-medium shadow-2xs hover:border-slate-300 focus:border-[#0052FF] focus:ring-2 focus:ring-[#0052FF]/20 focus:outline-none transition-all"
                />
              </div>

              {/* 4. Priority */}
              <div>
                <label className="block text-[13px] font-bold text-[#0F172A] mb-2">Priority</label>
                <select
                  value={priority}
                  onChange={(e) => setPriority(e.target.value as any)}
                  className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-[13px] font-semibold text-[#0F172A] shadow-2xs appearance-none bg-[url('data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2216%22%20height%3D%2216%22%20viewBox%3D%220%200%2024%2024%20fill%3D%22none%22%20stroke%3D%22%232B7BC4%22%20stroke-width%3D%222.5%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%3E%3Cpath%20d%3D%22m6%209%206%206%206-6%22%2F%3E%3C%2Fsvg%3E')] bg-[position:right_1rem_center] bg-no-repeat pr-10 hover:border-[#0052FF]/60 focus:border-[#0052FF] focus:ring-2 focus:ring-[#0052FF]/20 focus:outline-none transition-all cursor-pointer"
                >
                  <option value="low">Low (General Inquiry / Backlog Idea)</option>
                  <option value="medium">Medium (Standard Modification)</option>
                  <option value="high">High (Urgent Content Adjustment)</option>
                  <option value="urgent">Urgent (Publishing Blocked)</option>
                </select>
              </div>

              {/* 5. Suggestion Presets & Details */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-[13px] font-bold text-[#0F172A]">
                    Instructions & Context
                  </label>
                </div>

                <textarea
                  rows={4}
                  required
                  placeholder="Detail your suggestions, timestamp ranges (e.g. 0:01 - 0:04), or creative direction..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-[13px] text-slate-900 font-medium shadow-2xs hover:border-slate-300 focus:border-[#0052FF] focus:ring-2 focus:ring-[#0052FF]/20 focus:outline-none resize-none leading-relaxed transition-all"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="rounded-xl border border-slate-200 px-5 py-2.5 text-[13px] font-bold text-slate-600 hover:bg-slate-50 hover:text-[#0F172A] cursor-pointer transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createTicketMutation.isPending}
                  className="inline-flex items-center gap-2 rounded-xl bg-[#0052FF] px-6 py-2.5 text-[13px] font-bold text-white hover:bg-[#0045D8] active:scale-95 shadow-sm disabled:opacity-50 cursor-pointer transition-all"
                >
                  {createTicketMutation.isPending ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <Send className="size-4" />
                  )}
                  Submit Ticket
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
"""

with open('d:/intern/creo/frontend/src/pages/portal/PortalSupportPage.tsx', 'w', encoding='utf-8') as f:
    f.write(new_code)

print("Rewrite successful")
