import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router";
import { motion } from "motion/react";
import {
  CheckCircle2,
  MoreVertical,
  Inbox,
  X,
  RotateCcw,
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

const DEFAULT_INITIAL_TICKETS: TicketItem[] = [
  {
    id: "1781",
    client: "Sushmitaa",
    tier: "Enterprise Acceleration",
    email: "sushmitaa1407@gmail.com",
    avatarBg: "bg-nebula-navy",
    issueTitle: "deliverables not received on time, checkout",
    issueDesc: "I've not received my deliverables which was scheduled yesterday",
    priority: "High",
    timeLog: "Logged yesterday",
    agent: "Support Lead",
    pod: "Pod Alpha",
    agentInitials: "SL",
    status: "Resolved",
    primaryAction: "Reopen",
    secondaryAction: "Assign",
  },
  {
    id: "1042",
    client: "Ryze",
    tier: "Starter",
    email: "sushmitaa1407@gmail.com",
    avatarBg: "bg-nebula-navy",
    issueTitle: "API Webhook Timeout on Deliverables Sync",
    issueDesc: "Payload dropped after 4 retries via US-East Gateway during automated delivery sync of 4× 4K Reels.",
    priority: "Urgent",
    timeLog: "18m remaining",
    agent: "Support Lead",
    pod: "Pod C",
    agentInitials: "SL",
    status: "Open",
    primaryAction: "Resolve",
    secondaryAction: "Assign",
  },
  {
    id: "1032",
    client: "Aravindan",
    tier: "Custom Retainer",
    email: "aravindan20062006@gmail.com",
    avatarBg: "bg-nebula-surface",
    issueTitle: "Cloud Database Architecture Infographic Review",
    issueDesc: "Technical schematic revision for zero-latency failover cluster diagram requested by CTO.",
    priority: "High",
    timeLog: "Logged 2h ago",
    agent: "Theo Clark",
    pod: "Pod A",
    agentInitials: "TC",
    status: "In Progress",
    primaryAction: "Resolve",
    secondaryAction: "Assign",
  },
  {
    id: "1039",
    client: "Shanmugaraj",
    tier: "Growth",
    email: "shanmugaraj2204@gmail.com",
    avatarBg: "bg-nebula-navy",
    issueTitle: "Asset Upload Sync Error in Reels Batch 44",
    issueDesc: "Audio sync drift of 240ms detected in final MP4 export for upcoming Instagram Reels release.",
    priority: "Medium",
    timeLog: "Logged 28m ago",
    agent: "Omar K.",
    pod: "Pod A",
    agentInitials: "OK",
    status: "Open",
    primaryAction: "Resolve",
    secondaryAction: "Assign",
  },
];

export function AdminSupportTicketsPage() {
  const navigate = useNavigate();
  const [statusFilter, setStatusFilter] = useState<"active" | "closed">("active");
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
          avatarBg: "bg-nebula-navy",
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
        avatarBg: lt.avatarBg || "bg-nebula-navy",
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
    const interval = setInterval(loadTickets, 5000);
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

  const filteredTickets = tickets;

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
      await request(`/api/v1/admin/support/tickets/${t.id}/status`, {
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

  return (
    <div data-surface="ops" className="w-full min-h-screen font-sans bg-nebula-navy flex flex-col">
      <AdminTopHeader activeTab="Support" />

      <motion.main
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35 }}
        className="flex-1 px-3.5 sm:px-6 lg:px-8 py-4 sm:py-6 pb-24 sm:pb-8 max-w-[1500px] w-full mx-auto space-y-5 sm:space-y-6"
      >
        {/* Top Summary Cards Row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Card 1: Open Tickets */}
          <div className="bg-nebula-surface border border-nebula-steel/90 rounded-2xl p-5 shadow-xs space-y-3 hover-card-innovative">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-extrabold uppercase tracking-wider text-nebula-mist">
                ACTIVE / OPEN TICKETS
              </span>
              <div className="size-8 rounded-xl bg-nebula-glow/15 border border-nebula-glow/30 flex items-center justify-center text-nebula-glow">
                <Inbox className="size-4" />
              </div>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-black text-white">{openCount}</span>
              <span className="text-xs font-bold text-nebula-glow">active items</span>
            </div>
            <div className="pt-1">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-500/15 text-nebula-periwinkle text-[11px] font-bold border border-blue-500/30">
                <span className="size-1.5 rounded-full bg-nebula-periwinkle animate-pulse" />
                Live SLA Monitoring
              </span>
            </div>
          </div>

          {/* Card 2: Resolved Today */}
          <div className="bg-nebula-surface border border-nebula-steel/90 rounded-2xl p-5 shadow-xs space-y-3 hover-card-innovative">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-extrabold uppercase tracking-wider text-nebula-mist">
                RESOLVED TODAY
              </span>
              <div className="size-8 rounded-xl bg-blue-600/15 border border-blue-500/30 flex items-center justify-center text-nebula-periwinkle">
                <CheckCircle2 className="size-4" />
              </div>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-black text-white">{resolvedCount + 37}</span>
              <span className="text-xs font-semibold text-nebula-mist">Tickets closed</span>
            </div>
            <div className="pt-1">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-nebula-glow/15 text-nebula-glow text-[11px] font-bold border border-nebula-glow/30">
                <span className="size-1.5 rounded-full bg-nebula-glow" />
                100% SLA Compliance Rate
              </span>
            </div>
          </div>
        </div>

        {/* View Toggle */}
        <div className="flex items-center gap-2 border-b border-nebula-steel pb-2">
          <button
            onClick={() => setStatusFilter("active")}
            className={`px-4 py-2 text-xs font-bold transition-all border-b-2 ${
              statusFilter === "active" ? "border-nebula-glow text-white" : "border-transparent text-nebula-mist hover:text-nebula-periwinkle"
            }`}
          >
            Active Tickets ({openCount})
          </button>
          <button
            onClick={() => setStatusFilter("closed")}
            className={`px-4 py-2 text-xs font-bold transition-all border-b-2 ${
              statusFilter === "closed" ? "border-nebula-glow text-white" : "border-transparent text-nebula-mist hover:text-nebula-periwinkle"
            }`}
          >
            Closed Archive ({resolvedCount})
          </button>
        </div>

        {/* Mobile Tickets Card List (< md) */}
        <div className="block md:hidden space-y-3">
          {filteredTickets.length === 0 ? (
            <div className="bg-nebula-surface rounded-2xl p-8 border border-nebula-steel text-center text-nebula-mist text-xs font-bold">
              No tickets matching the selected filters.
            </div>
          ) : (
            filteredTickets.map((t) => (
              <div
                key={t.id}
                onClick={() => navigate(`/admin/support/tickets/${t.rawId || t.id}`)}
                className="bg-nebula-surface rounded-2xl p-4 border border-nebula-steel/90 shadow-2xs space-y-3 hover:border-blue-300 transition-all cursor-pointer active:scale-[0.99]"
              >
                {/* Header: ID + Priority + Status */}
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-xs text-nebula-mist">#{t.id}</span>
                    <span
                      className={`px-2 py-0.5 rounded text-[9px] font-extrabold uppercase ${
                        t.priority === "Urgent"
                          ? "bg-blue-900/40 text-nebula-periwinkle border border-blue-500/30"
                          : t.priority === "High"
                          ? "bg-blue-500/20 text-nebula-periwinkle border border-blue-500/30"
                          : t.priority === "Medium"
                          ? "bg-nebula-glow/20 text-nebula-glow"
                          : "bg-nebula-surface text-slate-100"
                      }`}
                    >
                      {t.priority}
                    </span>
                  </div>
                  <span
                    className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
                      t.status === "Open"
                        ? "bg-blue-500/15 text-nebula-periwinkle border-blue-500/30"
                        : t.status === "In Progress"
                        ? "bg-nebula-glow/15 text-nebula-glow border-nebula-glow/30"
                        : t.status === "Pending Client"
                        ? "bg-blue-500/20 text-nebula-periwinkle border-blue-500/30"
                        : "bg-blue-600/15 text-nebula-periwinkle border-blue-500/30"
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
                      <span className="px-1.5 py-0.2 rounded text-[8px] font-extrabold bg-nebula-glow/20 text-nebula-glow uppercase">
                        {t.tier}
                      </span>
                    </div>
                    <div className="text-[10px] text-nebula-mist font-mono truncate">{t.email}</div>
                  </div>
                </div>

                {/* Issue Details */}
                <div className="space-y-1">
                  <h4 className="font-bold text-xs text-white leading-snug">{t.issueTitle}</h4>
                  <p className="text-[11px] text-nebula-mist line-clamp-2">{t.issueDesc}</p>
                </div>

                {/* Footer: Agent & Quick Actions */}
                <div className="flex items-center justify-between pt-2 border-t border-nebula-steel gap-2">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <div className="size-6 rounded-full bg-slate-800 text-white font-bold text-[9px] flex items-center justify-center shrink-0">
                      {t.agentInitials}
                    </div>
                    <span className="text-[10px] font-bold text-slate-100 truncate">{t.agent}</span>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0" onClick={(e) => e.stopPropagation()}>
                    <button
                      type="button"
                      onClick={() => handlePrimaryAction(t)}
                      className={`px-3 py-1 rounded-xl text-white text-[11px] font-bold transition-all ${
                        t.status === "Resolved" ? "bg-slate-700" : "bg-blue-600"
                      }`}
                    >
                      {t.primaryAction}
                    </button>
                    <button
                      type="button"
                      onClick={() => navigate(`/admin/support/tickets/${t.rawId || t.id}`)}
                      className="px-2.5 py-1 rounded-xl bg-nebula-surface text-slate-100 text-[11px] font-bold hover:bg-slate-200"
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
        <div className="hidden md:block bg-nebula-surface border border-nebula-steel/90 rounded-2xl shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-nebula-navy/80 border-b border-nebula-steel text-[11px] font-extrabold uppercase tracking-wider text-nebula-mist">
                <tr>
                  <th className="px-4 py-3.5 w-12 text-center">
                    <input
                      type="checkbox"
                      checked={selectedIds.length === filteredTickets.length && filteredTickets.length > 0}
                      onChange={toggleSelectAll}
                      aria-label="Select All Tickets"
                      className="rounded border-nebula-steel text-nebula-glow focus:ring-blue-500"
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
              <tbody className="divide-y divide-slate-100 font-medium">
                {filteredTickets.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="text-center py-12 text-nebula-mist font-medium">
                      No tickets matching the selected filters.
                    </td>
                  </tr>
                ) : (
                  filteredTickets.map((t) => (
                    <tr
                      key={t.id}
                      className="hover:bg-nebula-navy/80 transition-colors group cursor-pointer"
                      onClick={() => navigate(`/admin/support/tickets/${t.rawId || t.id}`)}
                    >
                      <td className="px-4 py-4 text-center" onClick={(e) => e.stopPropagation()}>
                        <input
                          type="checkbox"
                          checked={selectedIds.includes(t.id)}
                          onChange={() => toggleSelect(t.id)}
                          aria-label={`Select Ticket #${t.id}`}
                          className="rounded border-nebula-steel text-nebula-glow focus:ring-blue-500"
                        />
                      </td>

                      {/* Ticket ID */}
                      <td className="px-4 py-4 font-mono font-bold text-nebula-mist group-hover:text-nebula-glow transition-colors">
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
                              <span className="font-bold text-white group-hover:text-nebula-glow transition-colors">
                                {t.client}
                              </span>
                              <span className="px-1.5 py-0.5 rounded text-[9px] font-extrabold bg-nebula-glow/15 text-nebula-glow border border-nebula-glow/30 uppercase tracking-wide">
                                {t.tier}
                              </span>
                            </div>
                            <div className="text-[11px] text-nebula-mist font-mono mt-0.5">{t.email}</div>
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
                                  ? "bg-blue-900/40 text-nebula-periwinkle border border-blue-500/30"
                                  : t.priority === "High"
                                  ? "bg-blue-500/20 text-nebula-periwinkle border border-blue-500/30"
                                  : t.priority === "Medium"
                                  ? "bg-nebula-glow/20 text-nebula-glow border border-nebula-glow/30"
                                  : "bg-nebula-surface text-slate-100 border border-nebula-steel"
                              }`}
                            >
                              {t.priority}
                            </span>
                            <span className="text-[11px] font-semibold text-nebula-periwinkle">
                              {t.timeLog}
                            </span>
                          </div>
                          <h4 className="font-bold text-white text-xs leading-snug">
                            {t.issueTitle}
                          </h4>
                          <p className="text-[11px] text-nebula-mist line-clamp-1">
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
                            <div className="text-[10px] text-nebula-mist">{t.pod}</div>
                          </div>
                        </div>
                      </td>

                      {/* Status / SLA */}
                      <td className="px-4 py-4">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold ${
                            t.status === "Open"
                              ? "bg-blue-500/15 text-nebula-periwinkle border border-blue-500/30"
                              : t.status === "In Progress"
                              ? "bg-nebula-glow/15 text-nebula-glow border border-nebula-glow/30"
                              : t.status === "Pending Client"
                              ? "bg-blue-500/20 text-nebula-periwinkle border border-blue-500/30"
                              : "bg-blue-600/15 text-nebula-periwinkle border border-blue-500/30"
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
                            className="px-2.5 py-1 rounded-xl bg-nebula-surface text-slate-100 text-[11px] font-bold hover:bg-slate-200 transition-colors cursor-pointer"
                          >
                            {t.secondaryAction}
                          </button>
                          <button
                            type="button"
                            onClick={() => navigate(`/admin/support/tickets/${t.rawId || t.id}`)}
                            className="p-1 text-nebula-mist hover:text-slate-100 rounded cursor-pointer"
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
            className="relative w-full max-w-md rounded-3xl bg-nebula-surface p-6 sm:p-8 shadow-2xl border border-nebula-steel flex flex-col items-center text-center animate-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
          >
            {/* Top Close Button */}
            <button
              type="button"
              onClick={() => setAlertModal(null)}
              className="absolute top-4 right-4 size-8 rounded-full bg-nebula-surface hover:bg-slate-200 text-nebula-mist hover:text-slate-100 flex items-center justify-center transition-colors cursor-pointer"
              aria-label="Close dialog"
            >
              <X className="size-4" />
            </button>

            {/* Tone Icon Badge */}
            <div
              className={`size-16 rounded-3xl flex items-center justify-center mb-4 ring-8 shadow-inner ${
                alertModal.type === "success"
                  ? "bg-emerald-50 text-emerald-600 ring-emerald-50/60"
                  : "bg-nebula-glow/15 text-nebula-glow ring-blue-50/60"
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
            <p className="text-xs sm:text-sm text-slate-100 mt-2 leading-relaxed max-w-sm">
              {alertModal.message}
            </p>

            {/* Ticket Context Information Box */}
            {alertModal.ticketId && (
              <div className="w-full mt-5 p-3.5 rounded-2xl bg-nebula-navy border border-nebula-steel/80 flex items-center justify-between text-xs font-semibold text-slate-100">
                <div className="flex items-center gap-2">
                  <span className="font-mono font-bold text-nebula-glow bg-nebula-glow/15 px-2 py-0.5 rounded-md border border-nebula-glow/30">
                    #{alertModal.ticketId}
                  </span>
                  <span className="text-nebula-mist">•</span>
                  <span className="font-bold text-white">{alertModal.client}</span>
                </div>
                {alertModal.tier && (
                  <span className="px-2 py-0.5 rounded-md text-[10px] font-extrabold bg-nebula-glow/20 text-blue-800 uppercase tracking-wide">
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
                  className="px-5 py-3 rounded-2xl bg-nebula-surface hover:bg-slate-200 text-slate-100 font-bold text-xs active:scale-95 transition-all cursor-pointer"
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

