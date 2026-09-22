import { useState } from "react";
import { useNavigate } from "react-router";
import {
  Search,
  CheckCircle2,
  MoreVertical,
  Layers,
  Inbox,
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

export function AdminSupportTicketsPage() {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [priorityFilter, setPriorityFilter] = useState("all");
  const [lifecycleFilter, setLifecycleFilter] = useState("all");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const sampleTickets: TicketItem[] = [
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

  const filteredTickets = sampleTickets.filter((t) => {
    const matchesSearch =
      t.id.includes(search) ||
      t.client.toLowerCase().includes(search.toLowerCase()) ||
      t.issueTitle.toLowerCase().includes(search.toLowerCase()) ||
      t.agent.toLowerCase().includes(search.toLowerCase());

    const matchesPriority =
      priorityFilter === "all" ||
      t.priority.toLowerCase().includes(priorityFilter.toLowerCase());

    const matchesLifecycle =
      lifecycleFilter === "all" ||
      t.status.toLowerCase().replace(" ", "_") === lifecycleFilter.toLowerCase();

    return matchesSearch && matchesPriority && matchesLifecycle;
  });

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

  return (
    <div data-surface="ops" className="w-full min-h-screen font-sans bg-[#F8FAFC] flex flex-col">
      <AdminTopHeader activeTab="Support" />

      <main className="flex-1 px-6 lg:px-8 py-6 max-w-[1500px] w-full mx-auto space-y-6">
        {/* Top Summary Cards Row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Card 1: Open Tickets */}
          <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-xs space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400">
                OPEN TICKETS
              </span>
              <div className="size-8 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600">
                <Inbox className="size-4" />
              </div>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-black text-slate-900">14</span>
              <span className="text-xs font-bold text-blue-600">+3 today</span>
            </div>
            <div className="pt-1">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-50 text-rose-700 text-[11px] font-bold border border-rose-200">
                <span className="size-1.5 rounded-full bg-rose-500 animate-pulse" />
                5 Urgent requiring immediate review
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
              <span className="text-3xl font-black text-slate-900">38</span>
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

        {/* Filter & Search Toolbar Card */}
        <div className="bg-white border border-slate-200/90 rounded-2xl p-4 shadow-xs space-y-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            {/* Search Input */}
            <div className="relative flex-1 max-w-lg">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-slate-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search tickets by ID, client, issue description, or assignee..."
                className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50/50 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-medium"
              />
            </div>

            {/* View Switch Button */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-100 border border-slate-200 text-slate-700 font-bold text-xs shadow-2xs"
              >
                <Layers className="size-3.5 text-blue-600" />
                List View
              </button>
            </div>
          </div>

          {/* Filter Pills Row */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-1 border-t border-slate-100 text-xs font-semibold">
            {/* Priority Filters */}
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-slate-400 text-[11px] font-bold uppercase tracking-wider mr-1">
                Priority:
              </span>
              {[
                { id: "all", label: "All Tickets (52)" },
                { id: "urgent", label: "Urgent (5)", badge: "bg-rose-500 text-white" },
                { id: "high", label: "High (8)", badge: "bg-amber-100 text-amber-800" },
                { id: "medium", label: "Medium (19)" },
                { id: "low", label: "Low (20)" },
              ].map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => setPriorityFilter(p.id)}
                  className={`px-3 py-1 rounded-full transition-all text-xs ${
                    priorityFilter === p.id
                      ? "bg-blue-600 text-white font-bold shadow-2xs"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>

            {/* Lifecycle Filters */}
            <div className="flex items-center gap-1.5">
              <span className="text-slate-400 text-[11px] font-bold uppercase tracking-wider mr-1">
                Lifecycle:
              </span>
              {[
                { id: "all", label: "All" },
                { id: "open", label: "Open (14)" },
                { id: "in_progress", label: "In Progress (6)" },
                { id: "resolved", label: "Resolved (38)" },
              ].map((lc) => (
                <button
                  key={lc.id}
                  type="button"
                  onClick={() => setLifecycleFilter(lc.id)}
                  className={`px-3 py-1 rounded-full transition-all text-xs ${
                    lifecycleFilter === lc.id
                      ? "bg-slate-800 text-white font-bold shadow-2xs"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  {lc.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Tickets Table */}
        <div className="bg-white border border-slate-200/90 rounded-2xl shadow-xs overflow-hidden">
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
                            onClick={() => alert(`Ticket #${t.id} marked as resolved!`)}
                            className="px-3 py-1 rounded-xl bg-blue-600 text-white text-[11px] font-bold hover:bg-blue-700 transition-colors shadow-2xs"
                          >
                            {t.primaryAction}
                          </button>
                          <button
                            type="button"
                            onClick={() => navigate(`/admin/support/tickets/${t.id}`)}
                            className="px-2.5 py-1 rounded-xl bg-slate-100 text-slate-700 text-[11px] font-bold hover:bg-slate-200 transition-colors"
                          >
                            {t.secondaryAction}
                          </button>
                          <button
                            type="button"
                            className="p-1 text-slate-400 hover:text-slate-600 rounded"
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
    </div>
  );
}
