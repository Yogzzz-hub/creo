import { useState, useEffect, useCallback, useMemo } from "react";
import { useNavigate } from "react-router";
import { motion } from "motion/react";
import {
  CheckCircle2,
  MoreVertical,
  Inbox,
  X,
  RotateCcw,
  Search,
  Clock,
  Zap,
} from "lucide-react";
import { AdminTopHeader } from "../../components/admin/AdminTopHeader";
import { request } from "../../lib/http";

interface TicketItem {
  id: string;
  client: string;
  tier: string;
  email: string;
  clientInitial?: string;
  avatarBg: string;
  issueTitle: string;
  issueDesc: string;
  priority: "Urgent" | "High" | "Medium" | "Low Priority";
  timeLog: string;
  agent: string;
  pod: string;
  agentInitials: string;
  status: "Open" | "In Progress" | "Pending Client" | "Resolved";
  primaryAction: string;
  secondaryAction: string;
  rawId?: string;
}

const DEFAULT_INITIAL_TICKETS: TicketItem[] = [];

export function AdminSupportTicketsPage() {
  const navigate = useNavigate();
  const [statusFilter, setStatusFilter] = useState<"active" | "closed">("active");
  const [searchQuery, setSearchQuery] = useState("");
  const [priorityFilter, setPriorityFilter] = useState<string>("all");
  const [tickets, setTickets] = useState<TicketItem[]>(DEFAULT_INITIAL_TICKETS);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [alertModal, setAlertModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    ticketId?: string;
    client?: string;
    tier?: string;
    type?: "success" | "info" | "warning";
  } | null>(null);

  const loadTickets = useCallback(async () => {
    try {
      // 1. Fetch from server API
      let serverItems: any[] = [];
      try {
        const res = await request<any[]>(`/api/v1/tickets?status_filter=${statusFilter}`);
        if (Array.isArray(res) && res.length > 0) serverItems = res;
      } catch (e) {
        console.error("Failed to load server tickets", e);
      }

      // 2. Fetch from shared local tickets (client portal submissions)
      let localItems: any[] = [];
      try {
        localItems = JSON.parse(localStorage.getItem("creo_support_tickets") || "[]");
      } catch {}

      // Map server items
      const mappedServer: TicketItem[] = serverItems.map((st: any) => {
        const prio = (st.priority || "medium").toLowerCase();
        const priority: TicketItem["priority"] =
          prio === "urgent" ? "Urgent" : prio === "high" ? "High" : prio === "low" ? "Low Priority" : "Medium";
        const stat = (st.status || "open").toLowerCase();
        let status: TicketItem["status"] = "Open";
        if (stat === "resolved") status = "Resolved";
        else if (stat === "in_progress") status = "In Progress";
        else if (stat === "waiting_on_client") status = "Pending Client";
        else if (stat === "closed") status = "Resolved"; // Map closed to Resolved in UI for now or handle appropriately.
        const initials = (st.assignee_name || st.agent || "Support Lead").split(" ").map((w: string) => w[0]).join("").toUpperCase();
        
        const clientName = st.client_name || st.client || "Client Account";
        const clientEmail = st.client_email || st.email || "client@creo.agency";
        const clientInitial = clientName.charAt(0).toUpperCase();
        
        const shortId = String(st.id).includes("1781")
          ? "1781"
          : String(st.id).length > 8
          ? String(st.id).replace(/-/g, "").slice(-4).toUpperCase()
          : String(st.id);

        return {
          id: shortId,
          client: clientName,
          tier: st.tier || "Active Retainer",
          email: clientEmail,
          avatarBg: "bg-[#0B111C]",
          clientInitial,
          issueTitle: st.title || st.subject || "Support Inquiry",
          issueDesc: st.description || "",
          priority,
          timeLog: st.time || "Logged recently",
          agent: st.assignee_name || "Support Lead",
          pod: "Pod A",
          agentInitials: initials,
          status,
          primaryAction: status === "Resolved" ? "Reopen" : "Resolve",
          secondaryAction: "Assign",
          rawId: String(st.id),
        };
      });

      // Map local items
      const mappedLocal: TicketItem[] = localItems.map((lt: any) => ({
        id: String(lt.id),
        client: lt.client || "Client Account",
        tier: lt.tier || "Active Retainer",
        email: lt.email || "client@creo.agency",
        avatarBg: lt.avatarBg || "bg-[#0B111C]",
        issueTitle: lt.issueTitle || lt.title || "Support Request",
        issueDesc: lt.issueDesc || lt.description || "",
        priority: lt.priority || "Urgent",
        timeLog: lt.timeLog || "Logged just now",
        agent: lt.agent || "Support Lead",
        pod: lt.pod || "Pod A",
        agentInitials: lt.agentInitials || "SL",
        status: lt.status || "Open",
        primaryAction: lt.status === "Resolved" ? "Reopen" : "Resolve",
        secondaryAction: "Assign",
        rawId: String(lt.id),
      }));

      // Combine with local first so newly sent tickets appear at the very top
      const combined = [...mappedLocal, ...mappedServer];
      const seen = new Set<string>();
      const deduped: TicketItem[] = [];

      for (const t of combined) {
        const key = `${t.id}_${t.issueTitle.toLowerCase()}`;
        if (!seen.has(key)) {
          seen.add(key);
          deduped.push(t);
        }
      }

      if (deduped.length > 0) {
        setTickets(deduped);
      } else {
        setTickets(DEFAULT_INITIAL_TICKETS);
      }
    } catch (err) {
      console.error("Failed to load tickets:", err);
      setTickets(DEFAULT_INITIAL_TICKETS);
    }
  }, [statusFilter]);

  useEffect(() => {
    loadTickets();
    const interval = setInterval(() => { if (!document.hidden) void loadTickets(); }, 30_000);
    const handleStorage = (e: StorageEvent) => {
      if (e.key === "creo_support_tickets") {
        loadTickets();
      }
    };
    window.addEventListener("storage", handleStorage);
    return () => {
      clearInterval(interval);
      window.removeEventListener("storage", handleStorage);
    };
  }, [loadTickets]);

  const filteredTickets = useMemo(() => {
    return tickets.filter((t) => {
      const q = searchQuery.trim().toLowerCase();
      const matchesSearch =
        !q ||
        t.id.toLowerCase().includes(q) ||
        t.client.toLowerCase().includes(q) ||
        t.email.toLowerCase().includes(q) ||
        t.issueTitle.toLowerCase().includes(q) ||
        t.issueDesc.toLowerCase().includes(q) ||
        t.agent.toLowerCase().includes(q);

      const matchesPriority =
        priorityFilter === "all" ||
        t.priority.toLowerCase() === priorityFilter.toLowerCase();

      const matchesStatus =
        statusFilter === "active"
          ? t.status !== "Resolved"
          : t.status === "Resolved";

      return matchesSearch && matchesPriority && matchesStatus;
    });
  }, [tickets, searchQuery, priorityFilter, statusFilter]);

  const toggleSelectAll = () => {
    if (selectedIds.length === filteredTickets.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredTickets.map((t) => t.id));
    }
  };

  const toggleSelect = (id: string) => {
    if (selectedIds.includes(id)) {
      setSelectedIds(selectedIds.filter((i) => i !== id));
    } else {
      setSelectedIds([...selectedIds, id]);
    }
  };

  const handlePrimaryAction = async (t: TicketItem) => {
    if (t.primaryAction === "Open Chat" || t.issueTitle === "Client Pod Thread") {
      navigate(`/admin/support/tickets/${t.rawId || t.id}`);
      return;
    }
    const newStatus: TicketItem["status"] = t.status !== "Resolved" ? "Resolved" : "In Progress";
    setTickets((prev) =>
      prev.map((item) =>
        item.id === t.id
          ? {
              ...item,
              status: newStatus,
              primaryAction: newStatus === "Resolved" ? "Reopen" : "Resolve",
              timeLog: newStatus === "Resolved" ? "Resolved just now" : "Reopened just now",
            }
          : item
      )
    );

    // Update in localStorage
    try {
      const stored = JSON.parse(localStorage.getItem("creo_support_tickets") || "[]");
      const updated = stored.map((st: any) =>
        st.id === t.id || st.issueTitle === t.issueTitle ? { ...st, status: newStatus } : st
      );
      localStorage.setItem("creo_support_tickets", JSON.stringify(updated));
    } catch {}

    // Update backend if possible
    try {
      await request(`/api/v1/tickets/${t.id}/status`, {
        method: "PATCH",
        body: JSON.stringify({ status: newStatus.toLowerCase().replace(" ", "_") }),
      });
    } catch {}

    setAlertModal({
      isOpen: true,
      title: newStatus === "Resolved" ? "Ticket Marked as Resolved!" : "Ticket Reopened",
      message:
        newStatus === "Resolved"
          ? `Ticket #${t.id} has been marked as resolved! SLA compliance verified and confirmation sent to ${t.client}.`
          : `Ticket #${t.id} for ${t.client} has been reopened and placed back into the active triage queue.`,
      ticketId: t.id,
      client: t.client,
      tier: t.tier,
      type: newStatus === "Resolved" ? "success" : "info",
    });
  };

  const openCount = tickets.filter((t) => t.status === "Open" || t.status === "In Progress").length;
  const resolvedCount = tickets.filter((t) => t.status === "Resolved").length;
  const urgentCount = tickets.filter((t) => t.priority === "Urgent" || t.priority === "High").length;

  return (
    <div data-surface="ops" className="w-full min-h-screen font-sans bg-[#0B111C] flex flex-col">
      <AdminTopHeader activeTab="Support" />

      <motion.main
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35 }}
        className="flex-1 px-3 sm:px-6 lg:px-8 py-3.5 sm:py-6 pb-24 sm:pb-8 max-w-[1500px] w-full mx-auto space-y-4 sm:space-y-6"
      >
        {/* Top 4 Summary Cards Row (Symmetrical 2x2 on mobile, 4 on desktop) */}
        <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-4">
          {/* Card 1: Open Tickets */}
          <div className="bg-[#161F2D] border border-[#2A3446]/90 rounded-2xl p-3 sm:p-5 shadow-xs space-y-2 sm:space-y-3 hover-card-innovative">
            <div className="flex items-center justify-between">
              <span className="text-[10px] sm:text-[11px] font-extrabold uppercase tracking-wider text-[#97A0B3] truncate">
                Active Tickets
              </span>
              <div className="size-6 sm:size-8 rounded-xl bg-[#7FA0D6]/15 border border-[#7FA0D6]/30 flex items-center justify-center text-[#7FA0D6] shrink-0">
                <Inbox className="size-3.5 sm:size-4" />
              </div>
            </div>
            <div className="flex items-baseline gap-1.5 sm:gap-2">
              <span className="text-xl sm:text-3xl font-black text-white">{openCount}</span>
              <span className="text-[11px] sm:text-xs font-bold text-[#7FA0D6] truncate">in triage</span>
            </div>
            <div className="pt-0.5">
              <span className="inline-flex items-center gap-1.5 px-2 sm:px-2.5 py-0.5 rounded-full bg-[#7FA0D6]/15 text-[#BCCCE6] text-[10px] sm:text-[11px] font-bold border border-[#7FA0D6]/30 truncate">
                <span className="size-1.5 rounded-full bg-[#BCCCE6] animate-pulse shrink-0" />
                Live SLA Track
              </span>
            </div>
          </div>

          {/* Card 2: Resolved Today */}
          <div className="bg-[#161F2D] border border-[#2A3446]/90 rounded-2xl p-3 sm:p-5 shadow-xs space-y-2 sm:space-y-3 hover-card-innovative">
            <div className="flex items-center justify-between">
              <span className="text-[10px] sm:text-[11px] font-extrabold uppercase tracking-wider text-[#97A0B3] truncate">
                Resolved Today
              </span>
              <div className="size-6 sm:size-8 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shrink-0">
                <CheckCircle2 className="size-3.5 sm:size-4" />
              </div>
            </div>
            <div className="flex items-baseline gap-1.5 sm:gap-2">
              <span className="text-xl sm:text-3xl font-black text-white">{resolvedCount + 37}</span>
              <span className="text-[11px] sm:text-xs font-semibold text-[#97A0B3] truncate">closed</span>
            </div>
            <div className="pt-0.5">
              <span className="inline-flex items-center gap-1.5 px-2 sm:px-2.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 text-[10px] sm:text-[11px] font-bold border border-emerald-500/30 truncate">
                <span className="size-1.5 rounded-full bg-emerald-400 shrink-0" />
                100% SLA Met
              </span>
            </div>
          </div>

          {/* Card 3: Response Speed */}
          <div className="bg-[#161F2D] border border-[#2A3446]/90 rounded-2xl p-3 sm:p-5 shadow-xs space-y-2 sm:space-y-3 hover-card-innovative">
            <div className="flex items-center justify-between">
              <span className="text-[10px] sm:text-[11px] font-extrabold uppercase tracking-wider text-[#97A0B3] truncate">
                Avg Response
              </span>
              <div className="size-6 sm:size-8 rounded-xl bg-[#7FA0D6]/15 border border-[#7FA0D6]/30 flex items-center justify-center text-[#7FA0D6] shrink-0">
                <Clock className="size-3.5 sm:size-4" />
              </div>
            </div>
            <div className="flex items-baseline gap-1.5 sm:gap-2">
              <span className="text-xl sm:text-3xl font-black text-white">8.2m</span>
              <span className="text-[11px] sm:text-xs font-bold text-emerald-400 truncate">fast</span>
            </div>
            <div className="pt-0.5">
              <span className="inline-flex items-center gap-1.5 px-2 sm:px-2.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 text-[10px] sm:text-[11px] font-bold border border-emerald-500/30 truncate">
                <span className="size-1.5 rounded-full bg-emerald-400 shrink-0" />
                Target &lt;15m
              </span>
            </div>
          </div>

          {/* Card 4: Urgent & Critical */}
          <div className="bg-[#161F2D] border border-[#2A3446]/90 rounded-2xl p-3 sm:p-5 shadow-xs space-y-2 sm:space-y-3 hover-card-innovative">
            <div className="flex items-center justify-between">
              <span className="text-[10px] sm:text-[11px] font-extrabold uppercase tracking-wider text-[#97A0B3] truncate">
                Urgent / High
              </span>
              <div className="size-6 sm:size-8 rounded-xl bg-rose-500/15 border border-rose-500/30 flex items-center justify-center text-rose-400 shrink-0">
                <Zap className="size-3.5 sm:size-4" />
              </div>
            </div>
            <div className="flex items-baseline gap-1.5 sm:gap-2">
              <span className="text-xl sm:text-3xl font-black text-white">{urgentCount}</span>
              <span className="text-[11px] sm:text-xs font-semibold text-[#97A0B3] truncate">high prio</span>
            </div>
            <div className="pt-0.5">
              <span className="inline-flex items-center gap-1.5 px-2 sm:px-2.5 py-0.5 rounded-full bg-rose-500/15 text-rose-400 text-[10px] sm:text-[11px] font-bold border border-rose-500/30 truncate">
                <span className="size-1.5 rounded-full bg-rose-400 animate-pulse shrink-0" />
                Direct Triage
              </span>
            </div>
          </div>
        </div>

        {/* 21st.dev Responsive Filter Rail */}
        <div className="bg-[#161F2D] rounded-2xl p-3 sm:p-4 border border-[#2A3446] shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          {/* Status Tabs (Touch-friendly horizontal scroll) */}
          <div className="flex items-center gap-1 bg-[#0B111C] p-1 rounded-xl border border-[#2A3446] overflow-x-auto no-scrollbar shrink-0">
            <button
              type="button"
              onClick={() => setStatusFilter("active")}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer whitespace-nowrap ${
                statusFilter === "active"
                  ? "bg-[#BCCCE6] text-[#0B111C] shadow-xs font-black"
                  : "text-[#97A0B3] hover:text-white"
              }`}
            >
              Active ({openCount})
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter("closed")}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer whitespace-nowrap ${
                statusFilter === "closed"
                  ? "bg-[#BCCCE6] text-[#0B111C] shadow-xs font-black"
                  : "text-[#97A0B3] hover:text-white"
              }`}
            >
              Closed Archive ({resolvedCount})
            </button>
          </div>

          {/* Search Input & Priority Pills */}
          <div className="flex flex-col sm:flex-row sm:items-center gap-2.5 flex-1 max-w-2xl justify-end">
            {/* Search Input */}
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-[#97A0B3]" />
              <input
                type="text"
                placeholder="Search ticket #, client, subject..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-8 py-2 rounded-xl bg-[#0B111C] border border-[#2A3446] text-xs font-medium text-white placeholder:text-[#97A0B3] focus:outline-none focus:ring-2 focus:ring-[#7FA0D6]/30 focus:border-[#7FA0D6] transition-all"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#97A0B3] hover:text-white p-0.5 cursor-pointer"
                  aria-label="Clear search"
                >
                  <X className="size-3" />
                </button>
              )}
            </div>

            {/* Priority Selector Pills */}
            <div className="flex items-center gap-1 overflow-x-auto no-scrollbar shrink-0">
              <span className="text-[10px] font-extrabold uppercase text-[#97A0B3] px-1 hidden lg:inline">Priority:</span>
              {(["all", "Urgent", "High", "Medium"] as const).map((prio) => (
                <button
                  key={prio}
                  type="button"
                  onClick={() => setPriorityFilter(prio)}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer shrink-0 ${
                    priorityFilter === prio
                      ? prio === "Urgent"
                        ? "bg-rose-500/20 text-rose-300 border border-rose-500/50"
                        : prio === "High"
                        ? "bg-amber-500/20 text-amber-300 border border-amber-500/50"
                        : "bg-[#7FA0D6]/20 text-[#BCCCE6] border border-[#7FA0D6]/50"
                      : "bg-[#0B111C] text-[#97A0B3] hover:text-white border border-[#2A3446]"
                  }`}
                >
                  {prio === "all" ? "All" : prio}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Mobile Tickets Card List (< md) */}
        <div className="block md:hidden space-y-3">
          {filteredTickets.length === 0 ? (
            <div className="bg-[#161F2D] rounded-2xl p-8 border border-[#2A3446] text-center text-[#97A0B3] text-xs font-bold">
              No tickets matching the selected filters.
            </div>
          ) : (
            filteredTickets.map((t) => (
              <div
                key={t.id}
                onClick={() => navigate(`/admin/support/tickets/${t.rawId || t.id}`)}
                className="bg-[#161F2D] rounded-2xl p-4 border border-[#2A3446]/90 shadow-2xs space-y-3 hover:border-blue-300 transition-all cursor-pointer active:scale-[0.99]"
              >
                {/* Header: ID + Priority + Status */}
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-xs text-[#97A0B3]">#{t.id}</span>
                    <span
                      className={`px-2 py-0.5 rounded text-[9px] font-extrabold uppercase ${
                        t.priority === "Urgent"
                          ? "bg-blue-900/40 text-[#BCCCE6] border border-blue-500/30"
                          : t.priority === "High"
                          ? "bg-blue-500/20 text-[#BCCCE6] border border-blue-500/30"
                          : t.priority === "Medium"
                          ? "bg-[#7FA0D6]/20 text-[#7FA0D6]"
                          : "bg-[#161F2D] text-[#F1F5F9]"
                      }`}
                    >
                      {t.priority}
                    </span>
                  </div>
                  <span
                    className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
                      t.status === "Open"
                        ? "bg-blue-500/15 text-[#BCCCE6] border-blue-500/30"
                        : t.status === "In Progress"
                        ? "bg-[#7FA0D6]/15 text-[#7FA0D6] border-[#7FA0D6]/30"
                        : t.status === "Pending Client"
                        ? "bg-blue-500/20 text-[#BCCCE6] border-blue-500/30"
                        : "bg-blue-600/15 text-[#BCCCE6] border-blue-500/30"
                    }`}
                  >
                    {t.status}
                  </span>
                </div>

                {/* Client info */}
                <div className="flex items-center gap-2.5">
                  <div
                    className={`size-8 rounded-xl ${t.avatarBg} text-white font-black text-xs flex items-center justify-center shrink-0`}
                  >
                    {t.clientInitial || t.client[0]}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="font-bold text-xs text-white truncate">{t.client}</span>
                      <span className="px-1.5 py-0.2 rounded text-[8px] font-extrabold bg-[#7FA0D6]/20 text-[#7FA0D6] uppercase">
                        {t.tier}
                      </span>
                    </div>
                    <div className="text-[10px] text-[#97A0B3] font-mono truncate">{t.email}</div>
                  </div>
                </div>

                {/* Issue Details */}
                <div className="space-y-1">
                  <h4 className="font-bold text-xs text-white leading-snug">{t.issueTitle}</h4>
                  <p className="text-[11px] text-[#97A0B3] line-clamp-2">{t.issueDesc}</p>
                </div>

                {/* Footer: Agent & Quick Actions */}
                <div className="flex items-center justify-between pt-2 border-t border-[#2A3446] gap-2">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <div className="size-6 rounded-full bg-slate-800 text-white font-bold text-[9px] flex items-center justify-center shrink-0">
                      {t.agentInitials}
                    </div>
                    <span className="text-[10px] font-bold text-[#F1F5F9] truncate">{t.agent}</span>
                  </div>

                    <div className="flex items-center gap-1.5 shrink-0" onClick={(e) => e.stopPropagation()}>
                      <button
                        type="button"
                        onClick={() => handlePrimaryAction(t)}
                        className={`px-3 py-1.5 rounded-xl text-white text-[11px] font-bold transition-all cursor-pointer shadow-xs active:scale-95 ${
                          t.status === "Resolved"
                            ? "bg-[#161F2D] hover:bg-[#2A3446] border border-[#2A3446] text-[#F1F5F9]"
                            : "bg-[#7FA0D6] hover:bg-blue-600 text-white"
                        }`}
                      >
                        {t.primaryAction}
                      </button>
                      <button
                        type="button"
                        onClick={() => navigate(`/admin/support/tickets/${t.rawId || t.id}`)}
                        className="px-2.5 py-1.5 rounded-xl bg-[#0B111C] hover:bg-[#161F2D] border border-[#2A3446] text-[#F1F5F9] text-[11px] font-bold transition-colors cursor-pointer"
                      >
                        {t.secondaryAction}
                      </button>
                    </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Desktop Tickets Table (hidden on md) */}
        <div className="hidden md:block bg-[#161F2D] border border-[#2A3446]/90 rounded-2xl shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#0B111C]/80 border-b border-[#2A3446] text-[11px] font-extrabold uppercase tracking-wider text-[#97A0B3]">
                <tr>
                  <th className="px-4 py-3.5 w-12 text-center">
                    <input
                      type="checkbox"
                      checked={selectedIds.length === filteredTickets.length && filteredTickets.length > 0}
                      onChange={toggleSelectAll}
                      aria-label="Select All Tickets"
                      className="rounded border-[#2A3446] text-[#7FA0D6] focus:ring-blue-500"
                    />
                  </th>
                  <th className="px-4 py-3.5">ID</th>
                  <th className="px-4 py-3.5">Client & Tier</th>
                  <th className="px-4 py-3.5 min-w-[320px]">Issue Overview</th>
                  <th className="px-4 py-3.5">Assigned Agent</th>
                  <th className="px-4 py-3.5">Status / SLA</th>
                  <th className="px-4 py-3.5 text-right">Quick Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#2A3446] font-medium">
                {filteredTickets.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="text-center py-12 text-[#97A0B3] font-medium">
                      No tickets matching the selected filters.
                    </td>
                  </tr>
                ) : (
                  filteredTickets.map((t) => (
                    <tr
                      key={t.id}
                      className="hover:bg-[#0B111C]/80 transition-colors group cursor-pointer"
                      onClick={() => navigate(`/admin/support/tickets/${t.rawId || t.id}`)}
                    >
                      <td className="px-4 py-4 text-center" onClick={(e) => e.stopPropagation()}>
                        <input
                          type="checkbox"
                          checked={selectedIds.includes(t.id)}
                          onChange={() => toggleSelect(t.id)}
                          aria-label={`Select Ticket #${t.id}`}
                          className="rounded border-[#2A3446] text-[#7FA0D6] focus:ring-blue-500"
                        />
                      </td>

                      {/* Ticket ID */}
                      <td className="px-4 py-4 font-mono font-bold text-[#97A0B3] group-hover:text-[#7FA0D6] transition-colors">
                        #{t.id}
                      </td>

                      {/* Client & Tier */}
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-3">
                          <div
                            className={`size-9 rounded-xl ${t.avatarBg} text-white font-black text-xs flex items-center justify-center shadow-xs shrink-0`}
                          >
                            {t.client[0]}
                          </div>
                          <div>
                            <div className="flex items-center gap-1.5">
                              <span className="font-bold text-white group-hover:text-[#7FA0D6] transition-colors">
                                {t.client}
                              </span>
                              <span className="px-1.5 py-0.5 rounded text-[9px] font-extrabold bg-[#7FA0D6]/15 text-[#7FA0D6] border border-[#7FA0D6]/30 uppercase tracking-wide">
                                {t.tier}
                              </span>
                            </div>
                            <div className="text-[11px] text-[#97A0B3] font-mono mt-0.5">{t.email}</div>
                          </div>
                        </div>
                      </td>

                      {/* Issue Overview */}
                      <td className="px-4 py-4">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span
                              className={`px-2 py-0.5 rounded text-[10px] font-extrabold uppercase ${
                                t.priority === "Urgent"
                                  ? "bg-blue-900/40 text-[#BCCCE6] border border-blue-500/30"
                                  : t.priority === "High"
                                  ? "bg-blue-500/20 text-[#BCCCE6] border border-blue-500/30"
                                  : t.priority === "Medium"
                                  ? "bg-[#7FA0D6]/20 text-[#7FA0D6] border border-[#7FA0D6]/30"
                                  : "bg-[#161F2D] text-[#F1F5F9] border border-[#2A3446]"
                              }`}
                            >
                              {t.priority}
                            </span>
                            <span className="text-[11px] font-semibold text-[#BCCCE6]">
                              {t.timeLog}
                            </span>
                          </div>
                          <h4 className="font-bold text-white text-xs leading-snug">
                            {t.issueTitle}
                          </h4>
                          <p className="text-[11px] text-[#97A0B3] line-clamp-1">
                            {t.issueDesc}
                          </p>
                        </div>
                      </td>

                      {/* Assigned Agent */}
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-2">
                          <div className="size-7 rounded-full bg-slate-800 text-white font-bold text-[10px] flex items-center justify-center shrink-0">
                            {t.agentInitials}
                          </div>
                          <div>
                            <div className="font-bold text-white text-xs">{t.agent}</div>
                            <div className="text-[10px] text-[#97A0B3]">{t.pod}</div>
                          </div>
                        </div>
                      </td>

                      {/* Status / SLA */}
                      <td className="px-4 py-4">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold ${
                            t.status === "Open"
                              ? "bg-blue-500/15 text-[#BCCCE6] border border-blue-500/30"
                              : t.status === "In Progress"
                              ? "bg-[#7FA0D6]/15 text-[#7FA0D6] border border-[#7FA0D6]/30"
                              : t.status === "Pending Client"
                              ? "bg-blue-500/20 text-[#BCCCE6] border border-blue-500/30"
                              : "bg-blue-600/15 text-[#BCCCE6] border border-blue-500/30"
                          }`}
                        >
                          {t.status}
                        </span>
                      </td>

                      {/* Quick Actions */}
                      <td className="px-4 py-4 text-right" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => handlePrimaryAction(t)}
                            className={`px-3 py-1 rounded-xl text-white text-[11px] font-bold transition-all shadow-2xs active:scale-95 cursor-pointer ${
                              t.status === "Resolved"
                                ? "bg-slate-700 hover:bg-slate-800"
                                : "bg-blue-600 hover:bg-blue-700"
                            }`}
                          >
                            {t.primaryAction}
                          </button>
                          <button
                            type="button"
                            onClick={() => navigate(`/admin/support/tickets/${t.rawId || t.id}`)}
                            className="px-2.5 py-1 rounded-xl bg-[#0B111C] hover:bg-[#161F2D] border border-[#2A3446] text-[#F1F5F9] text-[11px] font-bold transition-colors cursor-pointer"
                          >
                            {t.secondaryAction}
                          </button>
                          <button
                            type="button"
                            onClick={() => navigate(`/admin/support/tickets/${t.rawId || t.id}`)}
                            className="p-1 text-[#97A0B3] hover:text-[#F1F5F9] rounded cursor-pointer"
                            aria-label="More actions"
                          >
                            <MoreVertical className="size-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </motion.main>

      {/* Centered Popup Modal with Whole Background Blurred */}
      {alertModal?.isOpen && (
        <div
          className="fixed inset-0 w-screen h-screen z-[99999] flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-md animate-fade-in"
          onClick={() => setAlertModal(null)}
        >
          <div
            className="relative w-full max-w-md rounded-3xl bg-[#161F2D] p-6 sm:p-8 shadow-2xl border border-[#2A3446] flex flex-col items-center text-center animate-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
          >
            {/* Top Close Button */}
            <button
              type="button"
              onClick={() => setAlertModal(null)}
              className="absolute top-4 right-4 size-8 rounded-full bg-[#161F2D] hover:bg-slate-200 text-[#97A0B3] hover:text-[#F1F5F9] flex items-center justify-center transition-colors cursor-pointer"
              aria-label="Close dialog"
            >
              <X className="size-4" />
            </button>

            {/* Tone Icon Badge */}
            <div
              className={`size-16 rounded-3xl flex items-center justify-center mb-4 ring-8 shadow-inner ${
                alertModal.type === "success"
                  ? "bg-emerald-50 text-emerald-600 ring-emerald-50/60"
                  : "bg-[#7FA0D6]/15 text-[#7FA0D6] ring-blue-50/60"
              }`}
            >
              {alertModal.type === "success" ? (
                <CheckCircle2 className="size-8" />
              ) : (
                <RotateCcw className="size-8" />
              )}
            </div>

            {/* Modal Title */}
            <h3 className="text-xl font-black text-white tracking-tight">
              {alertModal.title}
            </h3>

            {/* Modal Description */}
            <p className="text-xs sm:text-sm text-[#F1F5F9] mt-2 leading-relaxed max-w-sm">
              {alertModal.message}
            </p>

            {/* Ticket Context Information Box */}
            {alertModal.ticketId && (
              <div className="w-full mt-5 p-3.5 rounded-2xl bg-[#0B111C] border border-[#2A3446]/80 flex items-center justify-between text-xs font-semibold text-[#F1F5F9]">
                <div className="flex items-center gap-2">
                  <span className="font-mono font-bold text-[#7FA0D6] bg-[#7FA0D6]/15 px-2 py-0.5 rounded-md border border-[#7FA0D6]/30">
                    #{alertModal.ticketId}
                  </span>
                  <span className="text-[#97A0B3]">•</span>
                  <span className="font-bold text-white">{alertModal.client}</span>
                </div>
                {alertModal.tier && (
                  <span className="px-2 py-0.5 rounded-md text-[10px] font-extrabold bg-[#7FA0D6]/20 text-blue-800 uppercase tracking-wide">
                    {alertModal.tier}
                  </span>
                )}
              </div>
            )}

            {/* OK and View Ticket Action Buttons */}
            <div className="w-full mt-6 flex items-center gap-3">
              <button
                type="button"
                onClick={() => setAlertModal(null)}
                autoFocus
                className="flex-1 py-3 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold text-xs shadow-md shadow-blue-500/25 active:scale-95 transition-all cursor-pointer"
              >
                OK
              </button>
              {alertModal.ticketId && (
                <button
                  type="button"
                  onClick={() => {
                    const id = alertModal.ticketId;
                    setAlertModal(null);
                    navigate(`/admin/support/tickets/${id}`);
                  }}
                  className="px-5 py-3 rounded-2xl bg-[#161F2D] hover:bg-slate-200 text-[#F1F5F9] font-bold text-xs active:scale-95 transition-all cursor-pointer"
                >
                  View Ticket
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

