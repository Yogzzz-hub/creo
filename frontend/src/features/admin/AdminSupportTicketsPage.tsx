import { useState } from "react";
import { useNavigate } from "react-router";
import {
  CheckCircle2,
  MoreVertical,
  Inbox,
  X,
  RotateCcw,
} from "lucide-react";
import { AdminTopHeader } from "../../components/admin/AdminTopHeader";

interface TicketItem {
  id: string;
  client: string;
  tier: string;
  email: string;
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
}

const INITIAL_TICKETS: TicketItem[] = [
  {
    id: "1042",
    client: "Northwind Labs",
    tier: "ENTERPRISE",
    email: "ops@northwindlabs.co",
    avatarBg: "bg-[#2563EB]",
    issueTitle: "API Webhook Timeout on Deliverables Sync",
    issueDesc: "Payload dropped after 4 retries via US-East Gateway...",
    priority: "Urgent",
    timeLog: "18m remaining",
    agent: "Maya Lin",
    pod: "Pod A • Core Infra",
    agentInitials: "ML",
    status: "Open",
    primaryAction: "Resolve",
    secondaryAction: "Reply",
  },
  {
    id: "1039",
    client: "Bloom Studio",
    tier: "GROWTH",
    email: "hello@bloomstudio.co",
    avatarBg: "bg-[#2563EB]",
    issueTitle: "Asset Upload Sync Error in Reels Batch 34",
    issueDesc: "Batch 34 video chunks failing checksum validation...",
    priority: "Medium",
    timeLog: "Logged 28m ago",
    agent: "Omar V.",
    pod: "Pod B • Creative Sync",
    agentInitials: "OV",
    status: "In Progress",
    primaryAction: "Resolve",
    secondaryAction: "Assign",
  },
  {
    id: "1035",
    client: "Atlas Commerce",
    tier: "ENTERPRISE",
    email: "groot@commerce.co",
    avatarBg: "bg-[#2563EB]",
    issueTitle: "Billing Invoice Inquiry & Add-on Pricing",
    issueDesc: "Clarification requested on tiered bandwidth scaling...",
    priority: "Low Priority",
    timeLog: "Logged 1h ago",
    agent: "Lena Ortiz",
    pod: "Pod C • Finance & SLA",
    agentInitials: "LO",
    status: "Pending Client",
    primaryAction: "Resolve",
    secondaryAction: "Thread",
  },
  {
    id: "1032",
    client: "Vanguard Mobility",
    tier: "ENTERPRISE",
    email: "team@vanguard.co",
    avatarBg: "bg-[#10B981]",
    issueTitle: "Video Format Encoding Artifacts in 4K",
    issueDesc: "HEVC transcoder dropping audio metadata frames...",
    priority: "High",
    timeLog: "Logged 2h ago",
    agent: "Theo Clark",
    pod: "Pod D • Rendering",
    agentInitials: "TC",
    status: "Open",
    primaryAction: "Resolve",
    secondaryAction: "Escalate",
  },
  {
    id: "1028",
    client: "Lumina Health",
    tier: "PREMIUM",
    email: "ops@lumina.io",
    avatarBg: "bg-[#8B5CF6]",
    issueTitle: "Font Licensing Verification for Q4 Campaign",
    issueDesc: "Typography audit requested for global release...",
    priority: "Medium",
    timeLog: "Resolved 3h ago",
    agent: "Sarah J.",
    pod: "Pod E • Compliance",
    agentInitials: "SJ",
    status: "Resolved",
    primaryAction: "Reopen",
    secondaryAction: "View Log",
  },
];

export function AdminSupportTicketsPage() {
  const navigate = useNavigate();
  const [tickets, setTickets] = useState<TicketItem[]>(INITIAL_TICKETS);
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

  const handlePrimaryAction = (t: TicketItem) => {
    if (t.status !== "Resolved") {
      setTickets((prev) =>
        prev.map((item) =>
          item.id === t.id
            ? {
                ...item,
                status: "Resolved",
                primaryAction: "Reopen",
                secondaryAction: "View Log",
                timeLog: "Resolved just now",
              }
            : item
        )
      );
      setAlertModal({
        isOpen: true,
        title: "Ticket Marked as Resolved!",
        message: `Ticket #${t.id} has been marked as resolved! SLA compliance verified and confirmation sent to ${t.client}.`,
        ticketId: t.id,
        client: t.client,
        tier: t.tier,
        type: "success",
      });
    } else {
      setTickets((prev) =>
        prev.map((item) =>
          item.id === t.id
            ? {
                ...item,
                status: "In Progress",
                primaryAction: "Resolve",
                secondaryAction: "Assign",
                timeLog: "Reopened just now",
              }
            : item
        )
      );
      setAlertModal({
        isOpen: true,
        title: "Ticket Reopened",
        message: `Ticket #${t.id} for ${t.client} has been reopened and placed back into the active triage queue.`,
        ticketId: t.id,
        client: t.client,
        tier: t.tier,
        type: "info",
      });
    }
  };

  const openCount = tickets.filter((t) => t.status === "Open" || t.status === "In Progress").length;
  const resolvedCount = tickets.filter((t) => t.status === "Resolved").length;

  return (
    <div data-surface="ops" className="w-full min-h-screen font-sans bg-[#F8FAFC] flex flex-col">
      <AdminTopHeader activeTab="Support" />

      <main className="flex-1 px-3.5 sm:px-6 lg:px-8 py-4 sm:py-6 pb-24 sm:pb-8 max-w-[1500px] w-full mx-auto space-y-5 sm:space-y-6">
        {/* Top Summary Cards Row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Card 1: Open Tickets */}
          <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-xs space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400">
                ACTIVE / OPEN TICKETS
              </span>
              <div className="size-8 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600">
                <Inbox className="size-4" />
              </div>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-black text-slate-900">{openCount}</span>
              <span className="text-xs font-bold text-blue-600">active items</span>
            </div>
            <div className="pt-1">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-50 text-rose-700 text-[11px] font-bold border border-rose-200">
                <span className="size-1.5 rounded-full bg-rose-500 animate-pulse" />
                Live SLA Monitoring
              </span>
            </div>
          </div>

          {/* Card 2: Resolved Today */}
          <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-xs space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400">
                RESOLVED TODAY
              </span>
              <div className="size-8 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600">
                <CheckCircle2 className="size-4" />
              </div>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-black text-slate-900">{resolvedCount + 37}</span>
              <span className="text-xs font-semibold text-slate-500">Tickets closed</span>
            </div>
            <div className="pt-1">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 text-blue-700 text-[11px] font-bold border border-blue-200">
                <span className="size-1.5 rounded-full bg-blue-500" />
                100% SLA Compliance Rate
              </span>
            </div>
          </div>
        </div>

        {/* Mobile Tickets Card List (< md) */}
        <div className="block md:hidden space-y-3">
          {filteredTickets.length === 0 ? (
            <div className="bg-white rounded-2xl p-8 border border-slate-200 text-center text-slate-400 text-xs font-bold">
              No tickets matching the selected filters.
            </div>
          ) : (
            filteredTickets.map((t) => (
              <div
                key={t.id}
                onClick={() => navigate(`/admin/support/tickets/${t.id}`)}
                className="bg-white rounded-2xl p-4 border border-slate-200/90 shadow-2xs space-y-3 hover:border-blue-300 transition-all cursor-pointer active:scale-[0.99]"
              >
                {/* Header: ID + Priority + Status */}
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-xs text-slate-500">#{t.id}</span>
                    <span
                      className={`px-2 py-0.5 rounded text-[9px] font-extrabold uppercase ${
                        t.priority === "Urgent"
                          ? "bg-rose-500 text-white"
                          : t.priority === "High"
                          ? "bg-amber-100 text-amber-800"
                          : t.priority === "Medium"
                          ? "bg-blue-100 text-blue-800"
                          : "bg-slate-100 text-slate-600"
                      }`}
                    >
                      {t.priority}
                    </span>
                  </div>
                  <span
                    className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
                      t.status === "Open"
                        ? "bg-rose-50 text-rose-700 border-rose-200"
                        : t.status === "In Progress"
                        ? "bg-blue-50 text-blue-700 border-blue-200"
                        : t.status === "Pending Client"
                        ? "bg-amber-50 text-amber-700 border-amber-200"
                        : "bg-emerald-50 text-emerald-700 border-emerald-200"
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
                    {t.client[0]}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="font-bold text-xs text-slate-900 truncate">{t.client}</span>
                      <span className="px-1.5 py-0.2 rounded text-[8px] font-extrabold bg-blue-100 text-blue-800 uppercase">
                        {t.tier}
                      </span>
                    </div>
                    <div className="text-[10px] text-slate-400 font-mono truncate">{t.email}</div>
                  </div>
                </div>

                {/* Issue Details */}
                <div className="space-y-1">
                  <h4 className="font-bold text-xs text-slate-900 leading-snug">{t.issueTitle}</h4>
                  <p className="text-[11px] text-slate-500 line-clamp-2">{t.issueDesc}</p>
                </div>

                {/* Footer: Agent & Quick Actions */}
                <div className="flex items-center justify-between pt-2 border-t border-slate-100 gap-2">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <div className="size-6 rounded-full bg-slate-800 text-white font-bold text-[9px] flex items-center justify-center shrink-0">
                      {t.agentInitials}
                    </div>
                    <span className="text-[10px] font-bold text-slate-600 truncate">{t.agent}</span>
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
                      onClick={() => navigate(`/admin/support/tickets/${t.id}`)}
                      className="px-2.5 py-1 rounded-xl bg-slate-100 text-slate-700 text-[11px] font-bold hover:bg-slate-200"
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
        <div className="hidden md:block bg-white border border-slate-200/90 rounded-2xl shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50/80 border-b border-slate-200 text-[11px] font-extrabold uppercase tracking-wider text-slate-400">
                <tr>
                  <th className="px-4 py-3.5 w-12 text-center">
                    <input
                      type="checkbox"
                      checked={selectedIds.length === filteredTickets.length && filteredTickets.length > 0}
                      onChange={toggleSelectAll}
                      aria-label="Select All Tickets"
                      className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
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
                    <td colSpan={7} className="text-center py-12 text-slate-400 font-medium">
                      No tickets matching the selected filters.
                    </td>
                  </tr>
                ) : (
                  filteredTickets.map((t) => (
                    <tr
                      key={t.id}
                      className="hover:bg-slate-50/80 transition-colors group cursor-pointer"
                      onClick={() => navigate(`/admin/support/tickets/${t.id}`)}
                    >
                      <td className="px-4 py-4 text-center" onClick={(e) => e.stopPropagation()}>
                        <input
                          type="checkbox"
                          checked={selectedIds.includes(t.id)}
                          onChange={() => toggleSelect(t.id)}
                          aria-label={`Select Ticket #${t.id}`}
                          className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                        />
                      </td>

                      {/* Ticket ID */}
                      <td className="px-4 py-4 font-mono font-bold text-slate-500 group-hover:text-blue-600 transition-colors">
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
                              <span className="font-bold text-slate-900 group-hover:text-blue-600 transition-colors">
                                {t.client}
                              </span>
                              <span className="px-1.5 py-0.5 rounded text-[9px] font-extrabold bg-blue-100 text-blue-800 uppercase tracking-wide">
                                {t.tier}
                              </span>
                            </div>
                            <div className="text-[11px] text-slate-400 font-mono mt-0.5">{t.email}</div>
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
                                  ? "bg-rose-500 text-white"
                                  : t.priority === "High"
                                  ? "bg-amber-100 text-amber-800"
                                  : t.priority === "Medium"
                                  ? "bg-blue-100 text-blue-800"
                                  : "bg-slate-100 text-slate-600"
                              }`}
                            >
                              {t.priority}
                            </span>
                            <span className="text-[11px] font-semibold text-rose-600">
                              {t.timeLog}
                            </span>
                          </div>
                          <h4 className="font-bold text-slate-900 text-xs leading-snug">
                            {t.issueTitle}
                          </h4>
                          <p className="text-[11px] text-slate-500 line-clamp-1">
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
                            <div className="font-bold text-slate-900 text-xs">{t.agent}</div>
                            <div className="text-[10px] text-slate-400">{t.pod}</div>
                          </div>
                        </div>
                      </td>

                      {/* Status / SLA */}
                      <td className="px-4 py-4">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold ${
                            t.status === "Open"
                              ? "bg-rose-50 text-rose-700 border border-rose-200"
                              : t.status === "In Progress"
                              ? "bg-blue-50 text-blue-700 border border-blue-200"
                              : t.status === "Pending Client"
                              ? "bg-amber-50 text-amber-700 border border-amber-200"
                              : "bg-emerald-50 text-emerald-700 border border-emerald-200"
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
                            onClick={() => navigate(`/admin/support/tickets/${t.id}`)}
                            className="px-2.5 py-1 rounded-xl bg-slate-100 text-slate-700 text-[11px] font-bold hover:bg-slate-200 transition-colors cursor-pointer"
                          >
                            {t.secondaryAction}
                          </button>
                          <button
                            type="button"
                            onClick={() => navigate(`/admin/support/tickets/${t.id}`)}
                            className="p-1 text-slate-400 hover:text-slate-600 rounded cursor-pointer"
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
      </main>

      {/* Centered Popup Modal with Whole Background Blurred */}
      {alertModal?.isOpen && (
        <div
          className="fixed inset-0 w-screen h-screen z-[99999] flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-md animate-fade-in"
          onClick={() => setAlertModal(null)}
        >
          <div
            className="relative w-full max-w-md rounded-3xl bg-white p-6 sm:p-8 shadow-2xl border border-slate-100 flex flex-col items-center text-center animate-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
          >
            {/* Top Close Button */}
            <button
              type="button"
              onClick={() => setAlertModal(null)}
              className="absolute top-4 right-4 size-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-400 hover:text-slate-700 flex items-center justify-center transition-colors cursor-pointer"
              aria-label="Close dialog"
            >
              <X className="size-4" />
            </button>

            {/* Tone Icon Badge */}
            <div
              className={`size-16 rounded-3xl flex items-center justify-center mb-4 ring-8 shadow-inner ${
                alertModal.type === "success"
                  ? "bg-emerald-50 text-emerald-600 ring-emerald-50/60"
                  : "bg-blue-50 text-blue-600 ring-blue-50/60"
              }`}
            >
              {alertModal.type === "success" ? (
                <CheckCircle2 className="size-8" />
              ) : (
                <RotateCcw className="size-8" />
              )}
            </div>

            {/* Modal Title */}
            <h3 className="text-xl font-black text-slate-900 tracking-tight">
              {alertModal.title}
            </h3>

            {/* Modal Description */}
            <p className="text-xs sm:text-sm text-slate-600 mt-2 leading-relaxed max-w-sm">
              {alertModal.message}
            </p>

            {/* Ticket Context Information Box */}
            {alertModal.ticketId && (
              <div className="w-full mt-5 p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80 flex items-center justify-between text-xs font-semibold text-slate-700">
                <div className="flex items-center gap-2">
                  <span className="font-mono font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-md border border-blue-100">
                    #{alertModal.ticketId}
                  </span>
                  <span className="text-slate-400">•</span>
                  <span className="font-bold text-slate-800">{alertModal.client}</span>
                </div>
                {alertModal.tier && (
                  <span className="px-2 py-0.5 rounded-md text-[10px] font-extrabold bg-blue-100 text-blue-800 uppercase tracking-wide">
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
                  className="px-5 py-3 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs active:scale-95 transition-all cursor-pointer"
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

