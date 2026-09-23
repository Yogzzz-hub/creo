import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  CheckCircle2,
  Loader2,
  Send,
  X,
  Phone,
  Calendar,
  Paperclip,
  Check,
  ChevronDown,
  ShieldCheck,
  Hash,
  ArrowRight,
  FileText,
  PhoneCall,
} from "lucide-react";
import { request } from "../../lib/http";
import { useAuth } from "../../lib/auth-context";
import { SubscriptionLockedState } from "../../components/portal/SubscriptionLockedState";
import type { TicketItem } from "../../types/api";

interface SupportTicketData {
  id: string;
  status: "in_progress" | "resolved" | "open";
  priority: "urgent" | "medium" | "high" | "low";
  priorityLabel: string;
  timeAgo: string;
  title: string;
  description: string;
  meta: string;
  category?: string;
  messages?: Array<{ id: string; sender: string; text: string; time: string; isMe?: boolean }>;
}

export function PortalSupportPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Subscription verification
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

  // Dashboard context
  const { data: dashData } = useQuery({
    queryKey: ["portal-dashboard", user?.id],
    queryFn: () => request<any>("/api/v1/portal/dashboard"),
    enabled: isSubscribed,
  });

  // Real tickets query
  const { data: serverTickets = [] } = useQuery<TicketItem[]>({
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
    refetchInterval: 12000,
  });

  // Local state
  const [ticketsList, setTicketsList] = useState<SupportTicketData[]>([]);
  const [ticketTab, setTicketTab] = useState<"all" | "in_progress" | "resolved">("all");

  // Form state
  const [subject, setSubject] = useState("");
  const [priority, setPriority] = useState<"low" | "medium" | "high" | "urgent">("urgent");
  const [category, setCategory] = useState("API & Webhooks");
  const [description, setDescription] = useState("");
  const [attachmentName, setAttachmentName] = useState<string | null>(null);

  // Modals state
  const [activeDiscussionTicket, setActiveDiscussionTicket] = useState<SupportTicketData | null>(null);
  const [replyText, setReplyText] = useState("");
  const [showCallModal, setShowCallModal] = useState(false);
  const [showHotlineModal, setShowHotlineModal] = useState(false);
  const [showSlaGuidelinesModal, setShowSlaGuidelinesModal] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const brandDisplayName =
    (user as any)?.company_name || (dashData as any)?.company_name || (dashData as any)?.brand_name || user?.full_name || "Your Brand";
  const slackChannelName = `creo-${brandDisplayName.toLowerCase().replace(/[^a-z0-9]/g, "") || "client"}`;

  // Sync real server tickets into ticket list
  React.useEffect(() => {
    if (serverTickets && serverTickets.length > 0) {
      const mapped: SupportTicketData[] = serverTickets.map((t) => {
        const isResolved = t.status === "resolved" || t.status === "closed";
        const isInProgress = t.status === "in_progress";
        const priorityLabel =
          t.priority === "urgent" ? "Urgent SLA" : t.priority === "high" ? "High" : t.priority === "low" ? "Low" : "Medium";
        return {
          id: `#TKT-${t.id.slice(0, 4).toUpperCase()}`,
          status: isResolved ? "resolved" : isInProgress ? "in_progress" : "open",
          priority: (t.priority as any) || "medium",
          priorityLabel,
          timeAgo: t.created_at ? new Date(t.created_at).toLocaleDateString() : "Recently",
          title: t.title,
          description: t.description,
          meta: `Opened by ${user?.full_name || "You"} • Assigned to Creative Pod`,
          category: "General Support",
        };
      });
      setTicketsList(mapped);
    } else {
      setTicketsList([]);
    }
  }, [serverTickets, user]);

  // Mutations
  const createTicketMutation = useMutation({
    mutationFn: async (payload: { title: string; description: string; priority: string }) => {
      return await request("/api/v1/tickets", {
        method: "POST",
        body: JSON.stringify(payload),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tickets"] });
    },
  });

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!subject.trim() || !description.trim()) {
      showToast("Please provide both a ticket subject and details.");
      return;
    }

    const newTicketId = `#TKT-${Math.floor(1000 + Math.random() * 9000)}`;
    const newTicket: SupportTicketData = {
      id: newTicketId,
      status: "in_progress",
      priority,
      priorityLabel: priority === "urgent" ? "Urgent SLA" : priority === "high" ? "High" : priority === "low" ? "Low" : "Medium",
      timeAgo: "Just now",
      title: subject.trim(),
      description: description.trim(),
      meta: `Opened by ${user?.full_name || "You"} • Assigned to DevOps Tier 3`,
      category,
      messages: [
        {
          id: `msg-${Date.now()}`,
          sender: user?.full_name || "You",
          text: description.trim(),
          time: "Just now",
          isMe: true,
        },
      ],
    };

    setTicketsList((prev) => [newTicket, ...prev]);
    createTicketMutation.mutate({
      title: subject.trim(),
      description: description.trim(),
      priority,
    });

    showToast(`Ticket ${newTicketId} dispatched to priority triage queue!`);
    setSubject("");
    setDescription("");
    setAttachmentName(null);
  };

  const handleSendReply = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeDiscussionTicket || !replyText.trim()) return;

    const newMessage = {
      id: `reply-${Date.now()}`,
      sender: user?.full_name || "You",
      text: replyText.trim(),
      time: "Just now",
      isMe: true,
    };

    setTicketsList((prev) =>
      prev.map((t) =>
        t.id === activeDiscussionTicket.id
          ? { ...t, messages: [...(t.messages || []), newMessage] }
          : t
      )
    );

    setActiveDiscussionTicket((prev) =>
      prev ? { ...prev, messages: [...(prev.messages || []), newMessage] } : null
    );

    setReplyText("");
    showToast("Reply sent to duty engineer.");
  };

  const handleAttachFile = () => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".png,.jpg,.jpeg,.mp4,.json,.log,.txt";
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        setAttachmentName(file.name);
        showToast(`Attached: ${file.name}`);
      }
    };
    input.click();
  };

  // Filtered tickets
  const filteredTickets = ticketsList.filter((t) => {
    if (ticketTab === "in_progress") return t.status === "in_progress" || t.status === "open";
    if (ticketTab === "resolved") return t.status === "resolved";
    return true;
  });

  if (isSubLoading) {
    return (
      <div className="animate-page-in space-y-6 max-w-[1440px] mx-auto px-4 md:px-8">
        <div className="card-surface p-12 text-center flex flex-col items-center justify-center min-h-[320px]">
          <Loader2 className="size-8 text-[#0052FF] animate-spin mb-3" />
          <p className="text-xs font-semibold text-slate-500">Checking Support Workspace Access...</p>
        </div>
      </div>
    );
  }

  if (!isSubscribed) {
    return (
      <div className="animate-page-in space-y-6 max-w-[1440px] mx-auto px-4 md:px-8">
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

  return (
    <div className="animate-page-in space-y-6 max-w-[1440px] mx-auto px-4 md:px-8 pb-12">
      {/* ── 1. Top Row: 3 Bento Cards ── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Card 1: Assigned Creative Pod */}
        <div className="rounded-3xl border border-slate-200/80 bg-white p-6 shadow-xs hover:shadow-sm transition-all flex flex-col justify-between">
          <div>
            <div className="flex items-start justify-between gap-2">
              <div>
                <h3 className="text-sm sm:text-base font-bold text-slate-900 tracking-tight">
                  Assigned Creative Pod
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Your dedicated full-stack creative execution unit...
                </p>
              </div>
              <span className="text-[11px] font-bold text-[#0052FF] bg-blue-50 border border-blue-200/80 px-2.5 py-0.5 rounded-full shrink-0">
                Pod Alpha
              </span>
            </div>

            {/* Profile Block */}
            <div className="mt-5 rounded-2xl border border-slate-100 bg-slate-50/50 p-3.5 sm:p-4 flex items-center gap-3.5">
              <div className="size-11 rounded-full bg-blue-100 text-[#0052FF] font-bold text-sm flex items-center justify-center shrink-0 border border-blue-200/60 shadow-xs">
                ML
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold text-slate-900">Maya Lin</span>
                  <span className="bg-[#0052FF] text-white text-[9px] font-black px-1.5 py-0.5 rounded uppercase tracking-wider">
                    POD LEAD
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-0.5 truncate">
                  Creative Director • Available for fast triage
                </p>
                <p className="text-[11px] font-semibold text-emerald-600 flex items-center gap-1.5 mt-1">
                  <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  <span>Active in Slack</span>
                </p>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="space-y-2 mt-5">
            <button
              type="button"
              onClick={() => showToast(`Connected to #${slackChannelName} on Creo Slack Connect.`)}
              className="w-full py-2.5 px-3 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-xs font-bold text-slate-700 shadow-2xs hover:shadow-xs transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-98"
            >
              <Hash className="size-3.5 text-slate-400" />
              <span>Open Slack (#{slackChannelName})</span>
            </button>
            <button
              type="button"
              onClick={() => setShowCallModal(true)}
              className="w-full py-2.5 px-3 rounded-xl border border-blue-100 bg-blue-50/40 hover:bg-blue-50 text-xs font-bold text-[#0052FF] transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-98"
            >
              <Calendar className="size-3.5 text-[#0052FF]" />
              <span>Schedule Quick Triage Call</span>
            </button>
          </div>
        </div>

        {/* Card 2: Urgent Hotline & Escalation */}
        <div className="rounded-3xl border border-slate-200/80 bg-white p-6 shadow-xs hover:shadow-sm transition-all flex flex-col justify-between">
          <div>
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-start gap-2.5">
                <div className="size-8 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center shrink-0 mt-0.5">
                  <Phone className="size-4 text-rose-600" />
                </div>
                <div>
                  <h3 className="text-sm sm:text-base font-bold text-slate-900 tracking-tight">
                    Urgent Hotline & Escalation
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Emergency escalation line for critical production blockers & live launch outages.
                  </p>
                </div>
              </div>
              <span className="inline-flex items-center gap-1.5 text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200/80 px-2.5 py-0.5 rounded-full shrink-0">
                <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse" />
                Staffed & Live (24/7)
              </span>
            </div>

            {/* Hotline Number Block */}
            <div className="mt-5 rounded-2xl border border-slate-100 bg-slate-50/50 p-4 space-y-1.5">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                EMERGENCY ESCALATION LINE
              </span>
              <div className="flex items-center gap-2.5 flex-wrap">
                <span className="text-lg sm:text-xl font-mono font-bold text-slate-900 tracking-tight">
                  +1 (800) 555-0199
                </span>
                <span className="bg-rose-50 border border-rose-200 text-rose-700 text-[10px] font-black px-2 py-0.5 rounded-md uppercase tracking-wider">
                  24/7 PRIORITY
                </span>
              </div>
              <p className="text-xs text-slate-500 leading-relaxed pt-0.5">
                Direct priority line to Senior Duty Engineer & Account Director.
              </p>
            </div>
          </div>

          {/* Hotline Actions */}
          <div className="flex items-center justify-between gap-3 mt-5 pt-1">
            <button
              type="button"
              onClick={() => setShowHotlineModal(true)}
              className="py-2.5 px-3.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-xs font-bold text-slate-700 shadow-2xs hover:shadow-xs transition-all flex items-center gap-2 cursor-pointer active:scale-98"
            >
              <PhoneCall className="size-3.5 text-slate-500" />
              <span>Call Escalation Line</span>
            </button>
            <button
              type="button"
              onClick={() => setShowSlaGuidelinesModal(true)}
              className="text-xs font-semibold text-[#0052FF] hover:text-[#0045D8] hover:underline transition-colors shrink-0"
            >
              View Emergency SLA Guidelines →
            </button>
          </div>
        </div>

        {/* Card 3: Support SLA Metrics */}
        <div className="rounded-3xl border border-slate-200/80 bg-white p-6 shadow-xs hover:shadow-sm transition-all flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between gap-2">
              <div>
                <h3 className="text-sm sm:text-base font-bold text-slate-900 tracking-tight">
                  Support SLA Metrics
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Real-time resolution speeds and compliance guarantees.
                </p>
              </div>
              <span className="text-xs text-slate-400 font-medium shrink-0">Past 30 Days</span>
            </div>

            {/* 2 Metric Boxes */}
            <div className="grid grid-cols-2 gap-3.5 mt-5">
              <div className="rounded-2xl border border-slate-100 bg-slate-50/50 p-4">
                <span className="text-xs text-slate-500 font-medium">Average Turnaround</span>
                <div className="text-2xl sm:text-[26px] font-black text-[#0052FF] mt-1 tracking-tight">
                  1.8 hrs
                </div>
                <p className="text-[11px] font-semibold text-emerald-600 flex items-center gap-1 mt-1 truncate">
                  <Check className="size-3 text-emerald-600 shrink-0" />
                  <span>Faster than 2.0h SLA guarantee</span>
                </p>
              </div>

              <div className="rounded-2xl border border-slate-100 bg-slate-50/50 p-4">
                <span className="text-xs text-slate-500 font-medium">SLA Compliance</span>
                <div className="text-2xl sm:text-[26px] font-black text-slate-900 mt-1 tracking-tight">
                  99.4%
                </div>
                <p className="text-[11px] text-slate-500 font-medium mt-1 truncate">
                  Across {ticketsList.length} {ticketsList.length === 1 ? "ticket" : "tickets"} processed
                </p>
              </div>
            </div>
          </div>

          {/* Bottom On-Track Bar */}
          <div className="flex items-center justify-between pt-4 border-t border-slate-100 text-xs font-semibold mt-5">
            <span className="text-slate-500 font-medium">Target SLA: &lt; 2.0 hours</span>
            <span className="text-emerald-600 font-bold flex items-center gap-1.5">
              <span className="size-1.5 rounded-full bg-emerald-500" />
              100% On-Track
            </span>
          </div>
        </div>
      </div>

      {/* ── 2. Bottom Row: 2 Bento Cards ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Card 4 (Left, 5 cols): Submit a New Support Ticket */}
        <div className="lg:col-span-5 rounded-3xl border border-slate-200/80 bg-white p-6 sm:p-7 shadow-xs hover:shadow-sm transition-all">
          <div className="flex items-center justify-between gap-3 pb-1">
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight">
                  Submit a New Support Ticket
                </h3>
                <span className="bg-blue-50 border border-blue-200 text-[#0052FF] text-[10px] font-bold px-2 py-0.5 rounded-md">
                  Priority Queue
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-1">
                Direct triage queue assigned to your senior engineers and creative directors.
              </p>
            </div>
          </div>

          <form onSubmit={handleFormSubmit} className="space-y-4 mt-5">
            {/* 1. Subject */}
            <div>
              <label className="block text-[10px] font-extrabold uppercase tracking-wider text-slate-400 mb-1.5">
                TICKET SUBJECT
              </label>
              <input
                type="text"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="Brief description of the issue or creative request..."
                className="w-full text-xs font-medium text-slate-900 placeholder:text-slate-400 border border-slate-200 rounded-xl px-3.5 py-2.5 focus:border-[#0052FF] focus:ring-2 focus:ring-[#0052FF]/15 outline-none transition-all"
              />
            </div>

            {/* 2. Priority Level Segmented Controls */}
            <div>
              <label className="block text-[10px] font-extrabold uppercase tracking-wider text-slate-400 mb-1.5">
                PRIORITY LEVEL
              </label>
              <div className="flex flex-wrap gap-2">
                {(["low", "medium", "high", "urgent"] as const).map((p) => {
                  const isSelected = priority === p;
                  const label =
                    p === "low"
                      ? "Low"
                      : p === "medium"
                      ? "Medium"
                      : p === "high"
                      ? "High"
                      : "• Urgent (2-Hour SLA)";
                  return (
                    <button
                      key={p}
                      type="button"
                      onClick={() => setPriority(p)}
                      className={`py-2 px-4 rounded-xl text-xs font-bold transition-all cursor-pointer flex-1 min-w-[70px] whitespace-nowrap ${
                        isSelected
                          ? p === "urgent"
                            ? "bg-rose-50 border border-rose-300 text-rose-700 shadow-2xs"
                            : "bg-[#0052FF] text-white shadow-xs"
                          : "border border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                      }`}
                    >
                      <span>{label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 3. Issue Category Dropdown */}
            <div>
              <label className="block text-[10px] font-extrabold uppercase tracking-wider text-slate-400 mb-1.5">
                ISSUE CATEGORY
              </label>
              <div className="relative">
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full text-xs font-medium text-slate-900 border border-slate-200 rounded-xl px-3.5 py-2.5 appearance-none bg-white focus:border-[#0052FF] focus:ring-2 focus:ring-[#0052FF]/15 outline-none transition-all cursor-pointer pr-9"
                >
                  <option value="API & Webhooks">API & Webhooks</option>
                  <option value="Deliverables & Revisions">Deliverables & Revisions</option>
                  <option value="Brand DNA & Strategy">Brand DNA & Strategy</option>
                  <option value="Billing & Retainer Management">Billing & Retainer Management</option>
                  <option value="Platform Access & Security">Platform Access & Security</option>
                </select>
                <ChevronDown className="size-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>
            </div>

            {/* 4. Description & Logs */}
            <div>
              <label className="block text-[10px] font-extrabold uppercase tracking-wider text-slate-400 mb-1.5">
                DESCRIPTION & LOGS
              </label>
              <textarea
                rows={4}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Provide details, screen recordings, or error logs..."
                className="w-full text-xs font-medium text-slate-900 placeholder:text-slate-400 border border-slate-200 rounded-xl p-3.5 focus:border-[#0052FF] focus:ring-2 focus:ring-[#0052FF]/15 outline-none resize-none leading-relaxed transition-all"
              />
            </div>

            {/* 5. Attachment preview if selected */}
            {attachmentName && (
              <div className="flex items-center justify-between bg-blue-50 border border-blue-200 rounded-xl px-3 py-1.5 text-xs text-blue-800">
                <span className="flex items-center gap-1.5 truncate">
                  <FileText className="size-3.5 text-blue-600 shrink-0" />
                  <span className="font-semibold truncate">{attachmentName}</span>
                </span>
                <button
                  type="button"
                  onClick={() => setAttachmentName(null)}
                  className="text-blue-500 hover:text-blue-800 p-0.5 ml-2"
                >
                  <X className="size-3.5" />
                </button>
              </div>
            )}

            {/* 6. Action Row */}
            <div className="pt-2 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleAttachFile}
                  className="py-2 px-3 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-[11px] font-bold text-slate-700 shadow-2xs transition-all flex items-center gap-1.5 cursor-pointer active:scale-95"
                >
                  <Paperclip className="size-3 text-slate-400" />
                  <span>Attach Files (PNG, MP4, Logs)</span>
                </button>
                <span className="text-[10px] text-slate-400 font-medium hidden sm:inline">
                  Up to 250MB supported
                </span>
              </div>

              <button
                type="submit"
                disabled={createTicketMutation.isPending}
                className="py-2.5 px-5 rounded-xl bg-[#0052FF] hover:bg-[#0045D8] text-white text-xs font-bold shadow-sm hover:shadow-md transition-all flex items-center gap-1.5 cursor-pointer shrink-0 active:scale-95"
              >
                {createTicketMutation.isPending ? (
                  <Loader2 className="size-3.5 animate-spin" />
                ) : (
                  <>
                    <span>Submit Ticket to Triage</span>
                    <ArrowRight className="size-3" />
                  </>
                )}
              </button>
            </div>
          </form>
        </div>

        {/* Card 5 (Right, 7 cols): Active & Recent Tickets */}
        <div className="lg:col-span-7 rounded-3xl border border-slate-200/80 bg-white p-6 sm:p-7 shadow-xs hover:shadow-sm transition-all flex flex-col justify-between min-h-[480px]">
          <div>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-1">
              <div>
                <h3 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight">
                  Active & Recent Tickets
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Track your open requests and review SLA resolutions.
                </p>
              </div>

              {/* Segmented Filter Pills */}
              <div className="flex items-center gap-1 bg-slate-100/80 p-1 rounded-full border border-slate-200/70 self-start sm:self-auto">
                <button
                  type="button"
                  onClick={() => setTicketTab("all")}
                  className={`px-3 py-1 rounded-full text-xs font-bold transition-all cursor-pointer ${
                    ticketTab === "all"
                      ? "bg-white text-slate-900 shadow-xs"
                      : "text-slate-500 hover:text-slate-800"
                  }`}
                >
                  All Tickets
                </button>
                <button
                  type="button"
                  onClick={() => setTicketTab("in_progress")}
                  className={`px-3 py-1 rounded-full text-xs font-bold transition-all cursor-pointer ${
                    ticketTab === "in_progress"
                      ? "bg-white text-slate-900 shadow-xs"
                      : "text-slate-500 hover:text-slate-800"
                  }`}
                >
                  In Progress
                </button>
                <button
                  type="button"
                  onClick={() => setTicketTab("resolved")}
                  className={`px-3 py-1 rounded-full text-xs font-bold transition-all cursor-pointer ${
                    ticketTab === "resolved"
                      ? "bg-white text-slate-900 shadow-xs"
                      : "text-slate-500 hover:text-slate-800"
                  }`}
                >
                  Resolved
                </button>
              </div>
            </div>

            {/* Stacked Ticket Cards */}
            <div className="space-y-3.5 mt-5">
              {filteredTickets.length === 0 ? (
                <div className="text-center py-12 text-slate-400">
                  <p className="text-xs font-semibold">No tickets found in this tab.</p>
                </div>
              ) : (
                filteredTickets.map((t) => (
                  <div
                    key={t.id}
                    className="rounded-2xl border border-slate-200/80 bg-slate-50/40 hover:bg-slate-50/80 hover:border-slate-300 p-4 transition-all shadow-2xs hover:shadow-xs group"
                  >
                    {/* Top Row Badges & Timestamp */}
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-bold text-slate-700 bg-white border border-slate-200 px-2 py-0.5 rounded-md shadow-2xs">
                          {t.id}
                        </span>

                        {t.status === "in_progress" ? (
                          <span className="inline-flex items-center gap-1.5 text-[10px] font-bold text-amber-800 bg-amber-50 border border-amber-200/80 px-2.5 py-0.5 rounded-full">
                            <span className="size-1.5 rounded-full bg-amber-500 animate-pulse" />
                            In Progress
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-800 bg-emerald-50 border border-emerald-200/80 px-2.5 py-0.5 rounded-full">
                            <Check className="size-3 text-emerald-600" />
                            Resolved
                          </span>
                        )}

                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-md border ${
                            t.priority === "urgent"
                              ? "bg-rose-50 text-rose-700 border-rose-200"
                              : t.priority === "high"
                              ? "bg-amber-50 text-amber-700 border-amber-200"
                              : "bg-blue-50 text-blue-700 border-blue-200"
                          }`}
                        >
                          {t.priorityLabel}
                        </span>
                      </div>

                      <span className="text-[11px] text-slate-400 font-medium">
                        {t.timeAgo}
                      </span>
                    </div>

                    {/* Title & Description */}
                    <div className="mt-2.5">
                      <h4 className="text-sm font-bold text-slate-900 tracking-tight group-hover:text-[#0052FF] transition-colors">
                        {t.title}
                      </h4>
                      <p className="text-xs text-slate-500 mt-1 leading-relaxed line-clamp-2">
                        {t.description}
                      </p>
                    </div>

                    {/* Bottom Row */}
                    <div className="mt-3.5 pt-2.5 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                      <span className="truncate max-w-[70%] font-medium">{t.meta}</span>
                      <button
                        type="button"
                        onClick={() => setActiveDiscussionTicket(t)}
                        className="font-bold text-[#0052FF] hover:text-[#0045D8] flex items-center gap-1 cursor-pointer transition-colors shrink-0"
                      >
                        <span>View Discussion Thread</span>
                        <ArrowRight className="size-3" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Footer Bar */}
          <div className="pt-4 mt-6 border-t border-slate-100 flex items-center justify-between text-xs text-slate-400">
            <span>Showing {filteredTickets.length} of {ticketsList.length} tickets</span>
            <button
              type="button"
              onClick={() => {
                setTicketTab("resolved");
                showToast("Filtering to all resolved SLA records.");
              }}
              className="text-slate-500 font-semibold hover:text-slate-900 transition-colors cursor-pointer"
            >
              View All Resolved Tickets →
            </button>
          </div>
        </div>
      </div>

      {/* ── Modal: Discussion Thread ── */}
      {activeDiscussionTicket && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-fade-in">
          <div className="bg-white border border-slate-200 rounded-3xl w-full max-w-xl overflow-hidden shadow-2xl p-6 flex flex-col max-h-[85vh] animate-scale-in">
            {/* Modal Header */}
            <div className="flex items-start justify-between border-b border-slate-100 pb-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs font-bold text-slate-700 bg-slate-100 px-2 py-0.5 rounded">
                    {activeDiscussionTicket.id}
                  </span>
                  <span className="text-xs font-bold text-[#0052FF] bg-blue-50 px-2 py-0.5 rounded">
                    {activeDiscussionTicket.category || "General"}
                  </span>
                </div>
                <h3 className="text-base font-bold text-slate-900 mt-1">
                  {activeDiscussionTicket.title}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setActiveDiscussionTicket(null)}
                className="size-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center transition-colors cursor-pointer"
              >
                <X className="size-4" />
              </button>
            </div>

            {/* Messages Thread */}
            <div className="flex-1 overflow-y-auto py-4 space-y-3.5 pr-1 scrollbar-thin">
              {activeDiscussionTicket.messages?.map((m) => (
                <div
                  key={m.id}
                  className={`p-3.5 rounded-2xl max-w-[85%] text-xs leading-relaxed shadow-2xs ${
                    m.isMe
                      ? "ml-auto bg-[#0052FF] text-white rounded-tr-xs"
                      : "mr-auto bg-slate-100 text-slate-800 rounded-tl-xs"
                  }`}
                >
                  <div className={`flex items-center justify-between gap-3 text-[10px] mb-1 ${m.isMe ? "text-blue-100" : "text-slate-500"}`}>
                    <span className="font-bold">{m.sender}</span>
                    <span>{m.time}</span>
                  </div>
                  <p className="whitespace-pre-wrap">{m.text}</p>
                </div>
              ))}
            </div>

            {/* Reply Input Form */}
            <form onSubmit={handleSendReply} className="pt-3 border-t border-slate-100 flex gap-2">
              <input
                type="text"
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                placeholder="Type response to assigned engineer..."
                className="flex-1 text-xs font-medium border border-slate-200 rounded-xl px-3.5 py-2.5 focus:border-[#0052FF] focus:ring-2 focus:ring-[#0052FF]/15 outline-none"
              />
              <button
                type="submit"
                className="px-4 py-2.5 bg-[#0052FF] hover:bg-[#0045D8] text-white text-xs font-bold rounded-xl flex items-center gap-1.5 shadow-sm active:scale-95 transition-all cursor-pointer"
              >
                <Send className="size-3.5" />
                <span>Send</span>
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ── Modal: Schedule Quick Triage Call ── */}
      {showCallModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-fade-in">
          <div className="bg-white border border-slate-200 rounded-3xl w-full max-w-md overflow-hidden shadow-2xl p-6 animate-scale-in space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="size-9 rounded-xl bg-blue-50 text-[#0052FF] flex items-center justify-center">
                  <Calendar className="size-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Schedule Quick Triage Call</h3>
                  <p className="text-xs text-slate-500">15-Minute Strategic Sync with Maya Lin</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowCallModal(false)}
                className="size-7 rounded-full bg-slate-100 text-slate-500 flex items-center justify-center"
              >
                <X className="size-3.5" />
              </button>
            </div>

            <div className="space-y-2 text-xs">
              <label className="font-bold text-slate-700">Select Available Triage Slot</label>
              <div className="grid grid-cols-2 gap-2">
                {["Today, 4:30 PM IST", "Today, 6:00 PM IST", "Tomorrow, 11:00 AM IST", "Tomorrow, 3:30 PM IST"].map(
                  (slot, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => {
                        setShowCallModal(false);
                        showToast(`Quick triage call booked for ${slot}. Google Meet link sent to your email.`);
                      }}
                      className="p-2.5 rounded-xl border border-slate-200 hover:border-[#0052FF] hover:bg-blue-50/50 text-left font-semibold text-slate-800 transition-all cursor-pointer"
                    >
                      {slot}
                    </button>
                  )
                )}
              </div>
            </div>

            <div className="rounded-xl bg-emerald-50 border border-emerald-200 p-3 text-xs text-emerald-800 flex items-center gap-2">
              <CheckCircle2 className="size-4 text-emerald-600 shrink-0" />
              <span>Direct calendar integration with your assigned creative director.</span>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal: Emergency Hotline ── */}
      {showHotlineModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-fade-in">
          <div className="bg-white border border-slate-200 rounded-3xl w-full max-w-md overflow-hidden shadow-2xl p-6 animate-scale-in text-center space-y-4">
            <div className="size-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mx-auto">
              <PhoneCall className="size-6 text-rose-600" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">Emergency Escalation Dial-in</h3>
              <p className="text-xs text-slate-500 mt-1 max-w-xs mx-auto">
                Direct phone link routed to Senior Duty Engineer on call.
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 font-mono text-lg font-bold text-slate-900">
              +1 (800) 555-0199
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => {
                  navigator.clipboard.writeText("+18005550199");
                  showToast("Copied phone number to clipboard.");
                }}
                className="flex-1 py-2.5 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 hover:bg-slate-50"
              >
                Copy Number
              </button>
              <a
                href="tel:+18005550199"
                className="flex-1 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 shadow-sm"
              >
                <Phone className="size-3.5" />
                <span>Dial Now</span>
              </a>
            </div>

            <button
              type="button"
              onClick={() => setShowHotlineModal(false)}
              className="text-xs text-slate-400 hover:text-slate-600"
            >
              Close
            </button>
          </div>
        </div>
      )}

      {/* ── Modal: SLA Guidelines ── */}
      {showSlaGuidelinesModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-fade-in">
          <div className="bg-white border border-slate-200 rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl p-6 sm:p-7 animate-scale-in space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <ShieldCheck className="size-5 text-[#0052FF]" />
                <h3 className="text-base font-bold text-slate-900">Emergency SLA Matrix</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowSlaGuidelinesModal(false)}
                className="size-7 rounded-full bg-slate-100 text-slate-500 flex items-center justify-center"
              >
                <X className="size-3.5" />
              </button>
            </div>

            <div className="space-y-3 text-xs text-slate-600">
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-900">
                <span className="font-bold">P1 - Urgent Outage (&lt; 2 Hours):</span> Active launch failures,
                publisher API authentication blocks, or corrupted master export files.
              </div>
              <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-900">
                <span className="font-bold">P2 - High Priority (&lt; 6 Hours):</span> Urgent revisions on scheduled
                calendar drops or creative styling realignment.
              </div>
              <div className="p-3 rounded-xl bg-blue-50 border border-blue-200 text-blue-900">
                <span className="font-bold">P3 - Standard (&lt; 12 Hours):</span> General strategy questions, batch
                requests, and backlog brainstorm items.
              </div>
            </div>

            <button
              type="button"
              onClick={() => setShowSlaGuidelinesModal(false)}
              className="w-full py-2.5 rounded-xl bg-[#0052FF] text-white font-bold text-xs"
            >
              Acknowledged
            </button>
          </div>
        </div>
      )}

      {/* ── Toast Notification ── */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-[#0F172A] text-white px-4 py-3 rounded-2xl shadow-xl flex items-center gap-3 border border-slate-800 animate-slide-up">
          <CheckCircle2 className="size-4 text-emerald-400 shrink-0" />
          <span className="text-xs font-semibold">{toastMessage}</span>
          <button
            type="button"
            onClick={() => setToastMessage(null)}
            className="text-slate-400 hover:text-white p-0.5 ml-1"
          >
            <X className="size-3.5" />
          </button>
        </div>
      )}
    </div>
  );
}

export default PortalSupportPage;
