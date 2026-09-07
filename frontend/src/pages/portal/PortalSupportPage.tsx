import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
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
} from "lucide-react";
import { request } from "../../lib/http";
import { useAuth } from "../../lib/auth-context";

interface TicketItem {
  id: string;
  title: string;
  description: string;
  status: "open" | "in_progress" | "resolved" | "closed";
  priority: "low" | "medium" | "high" | "urgent";
  created_at: string;
  message_count?: number;
}

export function PortalSupportPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [modalOpen, setModalOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState<"low" | "medium" | "high" | "urgent">("medium");

  const { data: tickets = [], isLoading } = useQuery<TicketItem[]>({
    queryKey: ["tickets", user?.id],
    queryFn: async () => {
      try {
        const res = await request<TicketItem[]>("/api/v1/tickets");
        return Array.isArray(res) ? res : [];
      } catch {
        return [];
      }
    },
    refetchInterval: 10000,
  });

  const createTicketMutation = useMutation({
    mutationFn: async (payload: { title: string; description: string; priority: string }) => {
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
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !description) return;
    createTicketMutation.mutate({ title, description, priority });
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

  const [activeTicketId, setActiveTicketId] = useState<string | null>(null);

  return (
    <div className="mx-auto max-w-5xl space-y-6 animate-page-in">
      {/* ── Top Header ────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-border pb-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-[#0D2137] tracking-tight">
            Client Support Desk
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Request revisions, deliverable updates, strategy adjustments, or technical inquiries directly with your team.
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
            onClick={() => setModalOpen(true)}
            className="inline-flex items-center gap-2 rounded-xl bg-[#2B7BC4] px-4 py-2 text-xs font-semibold text-white shadow-xs hover:bg-[#2B7BC4]/90 transition-all cursor-pointer"
          >
            <Plus className="size-3.5" />
            Open Ticket
          </button>
        </div>
      </div>

      {/* ── Enterprise SLA Banner ────────────────────────────────────────── */}
      <div className="rounded-2xl border border-blue-200/80 bg-gradient-to-r from-[#E8F4FD] to-sky-50 p-4 sm:p-5 shadow-2xs flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-start sm:items-center gap-3">
          <div className="size-10 rounded-xl bg-[#2B7BC4] text-white flex items-center justify-center shrink-0 shadow-sm">
            <LifeBuoy className="size-5" />
          </div>
          <div>
            <h4 className="text-sm font-bold text-[#0D2137]">Dedicated Support SLA: Under 4 Business Hours</h4>
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
        {isLoading ? (
          <div className="p-12 text-center text-xs text-slate-400">Loading support tickets...</div>
        ) : tickets.length === 0 ? (
          <div className="rounded-2xl border border-slate-200/80 bg-white p-12 text-center shadow-xs space-y-3">
            <div className="size-12 rounded-full bg-[#E8F4FD] text-[#2B7BC4] flex items-center justify-center mx-auto">
              <LifeBuoy className="size-6" />
            </div>
            <h3 className="text-base font-bold text-[#0D2137]">No Open Tickets</h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              All your content requests and deliverable pipelines are currently running smoothly. Open a ticket anytime you need modifications.
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
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-bold text-[#0D2137] bg-slate-100 px-2 py-0.5 rounded">
                      #{t.id.slice(0, 8)}
                    </span>
                    {getPriorityBadge(t.priority)}
                  </div>
                  <div>{getStatusBadge(t.status)}</div>
                </div>

                <div>
                  <h3 className="text-sm sm:text-base font-bold text-[#0D2137]">{t.title}</h3>
                  <p className="text-xs text-slate-600 mt-1 leading-relaxed">{t.description}</p>
                </div>

                {isExpanded && (
                  <div className="rounded-xl bg-slate-50 border border-slate-200/70 p-4 space-y-3 text-xs animate-fade-in">
                    <div className="flex items-center justify-between border-b border-slate-200/60 pb-2">
                      <span className="font-semibold text-slate-700">Ticket History & Audit Trail</span>
                      <span className="text-slate-400 font-mono text-[10px]">ID: {t.id}</span>
                    </div>
                    <p className="text-slate-600 leading-relaxed">
                      Assigned to Creo Creative Team. Priority is marked as <strong className="capitalize">{t.priority}</strong>. Our strategists review assets in sequence.
                    </p>
                    <div className="flex items-center gap-2 text-[11px] text-emerald-700 font-medium">
                      <CheckCircle2 className="size-3.5 text-emerald-600" />
                      Status: {t.status === "in_progress" ? "Work currently underway by designers" : t.status === "resolved" ? "Completed and signed off" : "Queued in lead creator inbox"}
                    </div>
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
                    {isExpanded ? "Hide Details" : "View Details"}
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* ── New Ticket Modal ──────────────────────────────────────────────── */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
          <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-xl space-y-5 animate-page-in">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-[#0D2137] flex items-center gap-2">
                <LifeBuoy className="size-4 text-[#2B7BC4]" />
                New Support Ticket
              </h3>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="size-4" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Subject</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Request new reel music variation"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2 text-xs text-slate-900 focus:bg-white focus:border-[#2B7BC4] focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Priority</label>
                <select
                  value={priority}
                  onChange={(e) => setPriority(e.target.value as any)}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2 text-xs text-slate-900 focus:bg-white focus:border-[#2B7BC4] focus:outline-none"
                >
                  <option value="low">Low (General Inquiry)</option>
                  <option value="medium">Medium (Standard Request)</option>
                  <option value="high">High (Urgent Content Adjustment)</option>
                  <option value="urgent">Urgent (Publishing Blocked)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Details</label>
                <textarea
                  rows={4}
                  required
                  placeholder="Provide timestamps, post IDs, or instructions..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2 text-xs text-slate-900 focus:bg-white focus:border-[#2B7BC4] focus:outline-none resize-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createTicketMutation.isPending}
                  className="inline-flex items-center gap-2 rounded-xl bg-[#2B7BC4] px-4 py-2 text-xs font-semibold text-white hover:bg-[#2B7BC4]/90 disabled:opacity-50"
                >
                  {createTicketMutation.isPending ? (
                    <Loader2 className="size-3.5 animate-spin" />
                  ) : (
                    <Send className="size-3.5" />
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
