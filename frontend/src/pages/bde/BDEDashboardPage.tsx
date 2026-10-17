import { useState } from "react";
import { useSearchParams } from "react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Plus,
  Search,
  Filter,
  MessageSquare,
  Calendar as CalendarIcon,
  Clock,
  TrendingUp,
  AlertCircle,
  Flame,
  Sun,
  Snowflake,
  RefreshCw,
  X,
  IndianRupee,
  Users,
  Target,
  CheckCircle2,
} from "lucide-react";
import {
  fetchLeads,
  fetchBDEMetrics,
  fetchBDECalendar,
  createLead,
  updateLead,
  logLeadActivity,
  Lead,
  LeadPriority,
  LeadStatus,
  CreateLeadPayload,
} from "../../lib/bde-api";
import { AdminTopHeader } from "../../components/admin/AdminTopHeader";

const money = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 });
const pipelineStages: [LeadStatus, string][] = [
  ["new", "New"], ["contacted", "Contacted"], ["meeting_scheduled", "Meeting"],
  ["proposal_sent", "Proposal"], ["negotiation", "Negotiation"], ["converted", "Won"], ["lost", "Lost"],
];

export function BDEDashboardPage() {
  const queryClient = useQueryClient();
  const [searchParams] = useSearchParams();
  const initialTab = searchParams.get("tab") === "calendar" ? "calendar" : "pipeline";

  // Filters & State
  const [priorityFilter, setPriorityFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [followUpFilter, setFollowUpFilter] = useState<"today" | "overdue" | "upcoming" | "all">("all");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [activeTab, setActiveTab] = useState<"pipeline" | "calendar">(initialTab);

  // Modals
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [activeActivityLead, setActiveActivityLead] = useState<Lead | null>(null);

  // Queries
  const leadsQuery = useQuery({
    queryKey: ["bde-leads", priorityFilter, statusFilter, followUpFilter, searchQuery],
    queryFn: () =>
      fetchLeads({
        priority: priorityFilter,
        status: statusFilter,
        follow_up_filter: followUpFilter === "all" ? undefined : followUpFilter,
        search: searchQuery,
      }),
  });

  const metricsQuery = useQuery({
    queryKey: ["bde-metrics"],
    queryFn: fetchBDEMetrics,
  });

  const calendarQuery = useQuery({
    queryKey: ["bde-calendar"],
    queryFn: fetchBDECalendar,
  });

  // Mutations
  const updateLeadMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: any }) => updateLead(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["bde-leads"] });
      queryClient.invalidateQueries({ queryKey: ["bde-metrics"] });
      queryClient.invalidateQueries({ queryKey: ["bde-calendar"] });
    },
  });

  const leads = leadsQuery.data || [];
  const metrics = metricsQuery.data;
  const calendarData = calendarQuery.data;

  // WhatsApp click-to-chat
  const openWhatsApp = (lead: Lead) => {
    if (!lead.phone) return;
    const cleanPhone = lead.phone.replace(/[^0-9]/g, "");
    const greeting = encodeURIComponent(
      `Hello ${lead.name}, this is Creo Creative Studio reaching out regarding your inquiry for ${lead.company_name}. How can we assist you with your content and creative design requirements?`
    );
    window.open(`https://wa.me/${cleanPhone}?text=${greeting}`, "_blank");
  };

  // Quick schedule follow-up
  const quickSchedule = async (lead: Lead, days: number) => {
    const target = new Date();
    target.setDate(target.getDate() + days);
    target.setHours(11, 0, 0, 0);

    await logLeadActivity(lead.id, {
      activity_type: "call",
      summary: `Automated follow-up scheduled for +${days} day(s)`,
      scheduled_follow_up: target.toISOString(),
    });

    queryClient.invalidateQueries({ queryKey: ["bde-leads"] });
    queryClient.invalidateQueries({ queryKey: ["bde-calendar"] });
    queryClient.invalidateQueries({ queryKey: ["bde-metrics"] });
  };

  return (
    <div data-surface="ops" className="w-full min-h-screen font-sans bg-[#0B111C] flex flex-col">
      <AdminTopHeader activeTab="BDE Outreach" hideTitle />
      <main className="min-w-0 flex-1 px-3.5 sm:px-6 lg:px-8 py-4 sm:py-6 max-w-[1500px] w-full mx-auto space-y-4 sm:space-y-6 animate-in fade-in duration-300">

      {/* Top Controls */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="grid min-w-0 flex-1 grid-cols-2 rounded-xl border border-[#2A3446] bg-[#161F2D] p-1 sm:flex sm:flex-none sm:items-center sm:gap-1">
          <button
            type="button"
            onClick={() => setActiveTab("pipeline")}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              activeTab === "pipeline"
                ? "bg-[#7FA0D6] text-[#0B111C] font-bold"
                : "text-[#97A0B3] hover:text-white"
            }`}
          >
            Pipeline & Leads
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("calendar")}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === "calendar"
                ? "bg-[#7FA0D6] text-[#0B111C] font-bold"
                : "text-[#97A0B3] hover:text-white"
            }`}
          >
            <CalendarIcon className="w-3.5 h-3.5" />
            <span>Calls & Reminders</span>
            {(metrics?.overdue_follow_ups || 0) > 0 && (
              <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping" />
            )}
          </button>
        </div>

        <button
          type="button"
          onClick={() => setIsAddModalOpen(true)}
          className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#BCCCE6] text-[#0B111C] text-xs font-bold hover:bg-white transition-all shadow-md cursor-pointer ml-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Add Lead</span>
        </button>
      </div>

      <section aria-label="BDE performance statistics" className="space-y-4">
        {metricsQuery.isError && (
          <div role="alert" className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-rose-500/30 bg-rose-500/10 p-4 text-sm text-rose-200">
            <span>Unable to load BDE statistics.</span>
            <button type="button" onClick={() => void metricsQuery.refetch()} className="font-semibold underline">Retry</button>
          </div>
        )}
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-3 xl:grid-cols-6">
          {[
            { label: "Total leads", value: metrics?.total_leads, detail: "All pipeline prospects", icon: Users },
            { label: "Active leads", value: metrics ? metrics.total_leads - metrics.stages.converted - metrics.stages.lost : undefined, detail: "Open opportunities", icon: Target },
            { label: "Pipeline value", value: metrics ? money.format(metrics.total_pipeline_value) : undefined, detail: "Estimated value of open deals", icon: IndianRupee },
            { label: "Won deal value", value: metrics ? money.format(metrics.closed_revenue) : undefined, detail: `${metrics?.stages.converted ?? 0} converted leads`, icon: CheckCircle2 },
            { label: "Conversion rate", value: metrics ? `${metrics.conversion_rate}%` : undefined, detail: "Converted leads / total leads", icon: TrendingUp },
            { label: "Follow-ups today", value: metrics?.today_follow_ups, detail: `${metrics?.overdue_follow_ups ?? 0} overdue follow-ups`, icon: Clock },
          ].map(({ label, value, detail, icon: Icon }) => (
            <article key={label} className="flex min-w-0 flex-col rounded-2xl border border-[#2A3446] bg-[#161F2D] p-4 sm:p-5">
              <div className="flex min-h-9 items-start justify-between gap-2">
                <h2 className="text-[10px] font-bold uppercase tracking-wider text-[#97A0B3]">{label}</h2>
                <Icon aria-hidden="true" className="size-4 shrink-0 text-[#7FA0D6]" />
              </div>
              {metricsQuery.isPending ? <div aria-label="Loading statistic" className="my-1 h-8 w-20 animate-pulse rounded bg-[#2A3446] motion-reduce:animate-none" /> : <p className="break-words text-2xl font-bold tracking-tight text-white tabular-nums">{value ?? "—"}</p>}
              <p className="mt-2 text-[11px] leading-relaxed text-[#97A0B3]">{metrics ? detail : "Statistics unavailable"}</p>
            </article>
          ))}
        </div>
        <div className="grid gap-4 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
          <article className="min-w-0 rounded-2xl border border-[#2A3446] bg-[#161F2D] p-4 sm:p-5">
            <div className="mb-4 flex items-center justify-between gap-3">
              <h2 className="text-sm font-semibold text-white">Pipeline by stage</h2>
              <span className="text-xs text-[#97A0B3]">All leads</span>
            </div>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 xl:grid-cols-7">
              {pipelineStages.map(([stage, label]) => (
                <button key={stage} type="button" onClick={() => { setStatusFilter(stage); setActiveTab("pipeline"); }} className={`min-w-0 rounded-xl border p-3 text-left transition-colors hover:border-[#7FA0D6] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#7FA0D6] ${statusFilter === stage ? "border-[#7FA0D6] bg-[#7FA0D6]/10" : "border-[#2A3446] bg-[#0B111C]"}`}>
                  <span className="block text-xl font-bold text-white tabular-nums">{metrics?.stages[stage] ?? "—"}</span>
                  <span className="mt-1 block text-[11px] text-[#97A0B3]">{label}</span>
                </button>
              ))}
            </div>
          </article>
          <article className="min-w-0 rounded-2xl border border-[#2A3446] bg-[#161F2D] p-4 sm:p-5">
            <h2 className="mb-4 text-sm font-semibold text-white">Lead priorities</h2>
            <div className="grid grid-cols-3 gap-2">
              {[
                { key: "hot", label: "Hot", count: metrics?.hot_count, icon: Flame, color: "text-rose-400" },
                { key: "warm", label: "Warm", count: metrics?.warm_count, icon: Sun, color: "text-amber-400" },
                { key: "cold", label: "Cold", count: metrics?.cold_count, icon: Snowflake, color: "text-blue-400" },
              ].map(({ key, label, count, icon: Icon, color }) => (
                <button key={key} type="button" onClick={() => { setPriorityFilter(key); setActiveTab("pipeline"); }} className="rounded-xl border border-[#2A3446] bg-[#0B111C] p-3 text-left transition-colors hover:border-[#7FA0D6] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#7FA0D6]">
                  <span className={`flex items-center gap-1.5 text-[11px] ${color}`}><Icon aria-hidden="true" className="size-3.5" />{label}</span>
                  <span className="mt-2 block text-xl font-bold text-white tabular-nums">{count ?? "—"}</span>
                </button>
              ))}
            </div>
          </article>
        </div>
      </section>

      {/* Main Tab Content */}
      {activeTab === "pipeline" ? (
        <div className="bg-[#161F2D] border border-[#2A3446] rounded-2xl shadow-xl overflow-hidden">
          {/* Filter Bar */}
          <div className="grid gap-4 border-b border-[#2A3446] p-4 sm:p-5 xl:grid-cols-[minmax(220px,1fr)_auto] xl:items-center">
            <div className="relative min-w-0">
              <Search className="w-4 h-4 text-[#97A0B3] absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search prospect name, company, email, or phone..."
                className="w-full bg-[#0B111C] border border-[#2A3446] rounded-xl pl-10 pr-4 py-2 text-xs text-white placeholder:text-[#97A0B3] focus:outline-none focus:border-[#7FA0D6] transition-colors"
              />
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              {/* Priority */}
              <div className="flex items-center gap-1.5 text-xs text-[#97A0B3]">
                <Filter className="w-3.5 h-3.5" />
                <span>Priority:</span>
                <select
                  value={priorityFilter}
                  onChange={(e) => setPriorityFilter(e.target.value)}
                  className="bg-[#0B111C] border border-[#2A3446] rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-[#7FA0D6] cursor-pointer"
                >
                  <option value="all">All Priorities</option>
                  <option value="hot">🔥 Hot Leads</option>
                  <option value="warm">☀️ Warm Leads</option>
                  <option value="cold">❄️ Cold Leads</option>
                </select>
              </div>

              {/* Status */}
              <div className="flex items-center gap-1.5 text-xs text-[#97A0B3]">
                <span>Stage:</span>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="bg-[#0B111C] border border-[#2A3446] rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-[#7FA0D6] cursor-pointer"
                >
                  <option value="all">All Stages</option>
                  <option value="new">New Prospect</option>
                  <option value="contacted">Contacted</option>
                  <option value="meeting_scheduled">Meeting Scheduled</option>
                  <option value="proposal_sent">Proposal Sent</option>
                  <option value="negotiation">Negotiation</option>
                  <option value="converted">Won / Converted</option>
                  <option value="lost">Lost</option>
                </select>
              </div>

              {/* Follow-up filter */}
              <div className="flex items-center gap-1.5 text-xs text-[#97A0B3]">
                <Clock className="w-3.5 h-3.5" />
                <select
                  value={followUpFilter}
                  onChange={(e) => setFollowUpFilter(e.target.value as any)}
                  className="bg-[#0B111C] border border-[#2A3446] rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-[#7FA0D6] cursor-pointer"
                >
                  <option value="all">All Follow-ups</option>
                  <option value="today">Due Today</option>
                  <option value="overdue">Overdue Calls</option>
                  <option value="upcoming">Upcoming</option>
                </select>
              </div>
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1000px] text-left text-xs">
              <thead className="bg-[#0B111C] border-b border-[#2A3446] text-[#97A0B3] uppercase text-[10px] tracking-wider font-bold">
                <tr>
                  <th className="py-3.5 px-4">Prospect & Company</th>
                  <th className="py-3.5 px-3">Priority</th>
                  <th className="py-3.5 px-3">Stage</th>
                  <th className="py-3.5 px-3">Est. Value</th>
                  <th className="py-3.5 px-3">Next Follow-Up</th>
                  <th className="py-3.5 px-3">Assigned BDE</th>
                  <th className="py-3.5 px-4 text-right">Quick Outreach & Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#2A3446]/60">
                {leadsQuery.isLoading ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-[#97A0B3]">
                      <div className="flex flex-col items-center justify-center gap-2">
                        <RefreshCw className="w-5 h-5 animate-spin text-[#7FA0D6]" />
                        <span>Loading prospects...</span>
                      </div>
                    </td>
                  </tr>
                ) : leadsQuery.isError ? (
                  <tr><td colSpan={7} className="p-8 text-center text-rose-300">Unable to load prospects. <button type="button" onClick={() => void leadsQuery.refetch()} className="underline">Retry</button></td></tr>
                ) : leads.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-[#97A0B3]">
                      <p className="text-sm font-semibold text-white">No prospective leads found</p>
                      <p className="text-xs mt-1">Add a prospective client to start tracking follow-ups and conversions.</p>
                    </td>
                  </tr>
                ) : (
                  leads.map((lead) => {
                    const nextFollowUp = lead.next_follow_up_at ? new Date(lead.next_follow_up_at) : null;
                    const isOverdue = nextFollowUp && nextFollowUp.getTime() < Date.now();
                    const isToday =
                      nextFollowUp &&
                      nextFollowUp.toDateString() === new Date().toDateString();

                    return (
                      <tr key={lead.id} className="hover:bg-[#1E293B]/40 transition-colors">
                        {/* Prospect & Company */}
                        <td className="py-3.5 px-4">
                          <div>
                            <span className="font-bold text-white text-xs block">{lead.name}</span>
                            <span className="text-[11px] text-[#BCCCE6] font-medium block">
                              {lead.company_name}
                            </span>
                            <span className="text-[10px] text-[#97A0B3] mt-0.5 block">
                              {lead.phone || lead.email || "No contact"}
                            </span>
                          </div>
                        </td>

                        {/* Priority Selector */}
                        <td className="py-3.5 px-3">
                          <select
                            value={lead.priority}
                            onChange={(e) =>
                              updateLeadMutation.mutate({
                                id: lead.id,
                                payload: { priority: e.target.value as LeadPriority },
                              })
                            }
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border cursor-pointer ${
                              lead.priority === "hot"
                                ? "bg-rose-500/15 text-rose-300 border-rose-500/40"
                                : lead.priority === "warm"
                                ? "bg-amber-500/15 text-amber-300 border-amber-500/40"
                                : "bg-blue-500/15 text-blue-300 border-blue-500/40"
                            }`}
                          >
                            <option value="hot">🔥 Hot</option>
                            <option value="warm">☀️ Warm</option>
                            <option value="cold">❄️ Cold</option>
                          </select>
                        </td>

                        {/* Status Pipeline Selector */}
                        <td className="py-3.5 px-3">
                          <select
                            value={lead.status}
                            onChange={(e) =>
                              updateLeadMutation.mutate({
                                id: lead.id,
                                payload: { status: e.target.value as LeadStatus },
                              })
                            }
                            className="bg-[#0B111C] border border-[#2A3446] rounded-lg px-2 py-1 text-xs text-white focus:outline-none focus:border-[#7FA0D6] cursor-pointer"
                          >
                            <option value="new">New</option>
                            <option value="contacted">Contacted</option>
                            <option value="meeting_scheduled">Meeting Scheduled</option>
                            <option value="proposal_sent">Proposal Sent</option>
                            <option value="negotiation">Negotiation</option>
                            <option value="converted">🎉 Converted (Won)</option>
                            <option value="lost">Lost</option>
                          </select>
                        </td>

                        {/* Deal Value */}
                        <td className="py-3.5 px-3 font-mono font-bold text-[#BCCCE6]">
                          ₹{lead.estimated_deal_value.toLocaleString()}
                        </td>

                        {/* Next Follow-Up */}
                        <td className="py-3.5 px-3">
                          {nextFollowUp ? (
                            <div className="flex flex-col">
                              <span
                                className={`text-[11px] font-semibold flex items-center gap-1 ${
                                  isOverdue
                                    ? "text-rose-400"
                                    : isToday
                                    ? "text-amber-400"
                                    : "text-[#BCCCE6]"
                                }`}
                              >
                                <Clock className="w-3 h-3 shrink-0" />
                                {nextFollowUp.toLocaleDateString("en-US", {
                                  month: "short",
                                  day: "numeric",
                                })}
                              </span>
                              <span className="text-[10px] text-[#97A0B3]">
                                {nextFollowUp.toLocaleTimeString("en-US", {
                                  hour: "2-digit",
                                  minute: "2-digit",
                                })}
                              </span>
                            </div>
                          ) : (
                            <span className="text-[#97A0B3] text-[11px]">None scheduled</span>
                          )}
                        </td>

                        {/* Assigned BDE */}
                        <td className="py-3.5 px-3 text-[#97A0B3]">
                          <span className="text-white font-medium block">
                            {lead.assigned_bde_name || "Unassigned"}
                          </span>
                        </td>

                        {/* Actions */}
                        <td className="py-3.5 px-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            {/* WhatsApp Direct Action */}
                            {lead.phone && (
                              <button
                                type="button"
                                onClick={() => openWhatsApp(lead)}
                                title="Open WhatsApp chat with prospect"
                                className="px-2.5 py-1 rounded-lg bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/25 transition-colors flex items-center gap-1 text-[11px] font-bold cursor-pointer"
                              >
                                <MessageSquare className="w-3 h-3" />
                                <span>WhatsApp</span>
                              </button>
                            )}

                            {/* Quick +3d schedule */}
                            <button
                              type="button"
                              onClick={() => quickSchedule(lead, 3)}
                              title="Schedule follow-up in 3 days"
                              className="px-2 py-1 rounded-lg bg-[#161F2D] border border-[#2A3446] text-[#BCCCE6] hover:text-white transition-colors text-[11px] font-semibold cursor-pointer"
                            >
                              +3d
                            </button>

                            {/* Log Activity */}
                            <button
                              type="button"
                              onClick={() => setActiveActivityLead(lead)}
                              className="px-2.5 py-1 rounded-lg bg-[#7FA0D6]/20 border border-[#7FA0D6]/40 text-[#BCCCE6] hover:bg-[#7FA0D6]/30 hover:text-white transition-colors text-[11px] font-bold cursor-pointer"
                            >
                              Log Call
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* Calendar & Reminder View */
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          {/* Overdue Calls */}
          <div className="bg-[#161F2D] border border-rose-500/30 rounded-2xl p-4 sm:p-5 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-[#2A3446] pb-3">
              <span className="text-xs font-bold uppercase tracking-wider text-rose-400 flex items-center gap-1.5">
                <AlertCircle className="w-4 h-4" />
                Overdue Follow-ups ({calendarData?.overdue.length || 0})
              </span>
            </div>
            <div className="space-y-3">
              {calendarData?.overdue.length === 0 ? (
                <p className="text-xs text-[#97A0B3]">No overdue calls! You're completely up to date.</p>
              ) : (
                calendarData?.overdue.map((item) => (
                  <div key={item.id} className="bg-[#0B111C] border border-[#2A3446] rounded-xl p-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-white">{item.lead.name}</span>
                      <span className="text-[10px] font-bold uppercase px-1.5 py-0.2 rounded bg-rose-500/20 text-rose-300">
                        Overdue
                      </span>
                    </div>
                    <p className="text-[11px] text-[#97A0B3]">{item.lead.company}</p>
                    <div className="flex items-center justify-between pt-1">
                      <span className="text-[11px] font-mono text-rose-300">
                        {item.scheduled_time ? new Date(item.scheduled_time).toLocaleString() : ""}
                      </span>
                      {item.lead.phone && (
                        <button
                          type="button"
                          onClick={() => openWhatsApp(item.lead as any)}
                          className="text-[11px] font-bold text-emerald-400 hover:underline flex items-center gap-1 cursor-pointer"
                        >
                          <MessageSquare className="w-3 h-3" /> WhatsApp
                        </button>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Today's Follow-ups */}
          <div className="bg-[#161F2D] border border-amber-500/30 rounded-2xl p-4 sm:p-5 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-[#2A3446] pb-3">
              <span className="text-xs font-bold uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
                <Clock className="w-4 h-4" />
                Scheduled Today ({calendarData?.today.length || 0})
              </span>
            </div>
            <div className="space-y-3">
              {calendarData?.today.length === 0 ? (
                <p className="text-xs text-[#97A0B3]">No follow-ups remaining on schedule today.</p>
              ) : (
                calendarData?.today.map((item) => (
                  <div key={item.id} className="bg-[#0B111C] border border-[#2A3446] rounded-xl p-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-white">{item.lead.name}</span>
                      <span className="text-[10px] font-bold uppercase px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300">
                        Today
                      </span>
                    </div>
                    <p className="text-[11px] text-[#97A0B3]">{item.lead.company}</p>
                    <div className="flex items-center justify-between pt-1">
                      <span className="text-[11px] font-mono text-amber-300">
                        {item.scheduled_time ? new Date(item.scheduled_time).toLocaleTimeString() : ""}
                      </span>
                      {item.lead.phone && (
                        <button
                          type="button"
                          onClick={() => openWhatsApp(item.lead as any)}
                          className="text-[11px] font-bold text-emerald-400 hover:underline flex items-center gap-1 cursor-pointer"
                        >
                          <MessageSquare className="w-3 h-3" /> WhatsApp
                        </button>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Upcoming Schedule */}
          <div className="bg-[#161F2D] border border-[#2A3446] rounded-2xl p-4 sm:p-5 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-[#2A3446] pb-3">
              <span className="text-xs font-bold uppercase tracking-wider text-[#7FA0D6] flex items-center gap-1.5">
                <CalendarIcon className="w-4 h-4" />
                Upcoming Follow-ups ({calendarData?.upcoming.length || 0})
              </span>
            </div>
            <div className="space-y-3">
              {calendarData?.upcoming.length === 0 ? (
                <p className="text-xs text-[#97A0B3]">No upcoming calls scheduled.</p>
              ) : (
                calendarData?.upcoming.map((item) => (
                  <div key={item.id} className="bg-[#0B111C] border border-[#2A3446] rounded-xl p-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-white">{item.lead.name}</span>
                      <span className="text-[10px] font-bold uppercase px-1.5 py-0.2 rounded bg-[#7FA0D6]/20 text-[#7FA0D6]">
                        {item.lead.priority}
                      </span>
                    </div>
                    <p className="text-[11px] text-[#97A0B3]">{item.lead.company}</p>
                    <div className="flex items-center justify-between pt-1">
                      <span className="text-[11px] font-mono text-[#BCCCE6]">
                        {item.scheduled_time ? new Date(item.scheduled_time).toLocaleDateString() : ""}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* Log Activity Modal */}
      {activeActivityLead && (
        <ActivityModal
          lead={activeActivityLead}
          onClose={() => setActiveActivityLead(null)}
          onSuccess={() => {
            queryClient.invalidateQueries({ queryKey: ["bde-leads"] });
            queryClient.invalidateQueries({ queryKey: ["bde-calendar"] });
            queryClient.invalidateQueries({ queryKey: ["bde-metrics"] });
            setActiveActivityLead(null);
          }}
        />
      )}

      {/* Add Lead Modal */}
      {isAddModalOpen && (
        <AddLeadModal
          onClose={() => setIsAddModalOpen(false)}
          onSuccess={() => {
            queryClient.invalidateQueries({ queryKey: ["bde-leads"] });
            queryClient.invalidateQueries({ queryKey: ["bde-metrics"] });
            queryClient.invalidateQueries({ queryKey: ["bde-calendar"] });
            setIsAddModalOpen(false);
          }}
        />
      )}
      </main>
    </div>
  );
}

// ── Log Activity Modal ────────────────────────────────────────────────────────

function ActivityModal({
  lead,
  onClose,
  onSuccess,
}: {
  lead: Lead;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [activityType, setActivityType] = useState<any>("call");
  const [summary, setSummary] = useState("");
  const [outcome, setOutcome] = useState("");
  const [followUpDate, setFollowUpDate] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!summary.trim()) return;

    try {
      setIsSubmitting(true);
      await logLeadActivity(lead.id, {
        activity_type: activityType,
        summary: summary.trim(),
        outcome: outcome.trim() || undefined,
        scheduled_follow_up: followUpDate ? new Date(followUpDate).toISOString() : undefined,
      });
      onSuccess();
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
      <div className="bg-[#161F2D] border border-[#2A3446] rounded-3xl w-full max-w-lg p-6 space-y-4 shadow-2xl relative">
        <div className="flex items-center justify-between border-b border-[#2A3446] pb-3">
          <div>
            <h3 className="text-base font-bold text-white">Log Communication & Follow-Up</h3>
            <p className="text-xs text-[#97A0B3]">
              {lead.name} · {lead.company_name}
            </p>
          </div>
          <button type="button" onClick={onClose} className="text-[#97A0B3] hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          <div>
            <label className="block text-[#97A0B3] font-bold uppercase mb-1">Interaction Type</label>
            <div className="grid grid-cols-4 gap-2">
              {[
                { type: "call", label: "Phone Call" },
                { type: "whatsapp", label: "WhatsApp" },
                { type: "meeting", label: "Meeting" },
                { type: "note", label: "Note" },
              ].map((t) => (
                <button
                  key={t.type}
                  type="button"
                  onClick={() => setActivityType(t.type)}
                  className={`py-2 px-3 rounded-xl border text-xs font-bold capitalize transition-colors cursor-pointer ${
                    activityType === t.type
                      ? "bg-[#7FA0D6] text-[#0B111C] border-[#7FA0D6]"
                      : "bg-[#0B111C] text-[#97A0B3] border-[#2A3446] hover:text-white"
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-[#97A0B3] font-bold uppercase mb-1">Discussion Summary *</label>
            <textarea
              required
              rows={3}
              value={summary}
              onChange={(e) => setSummary(e.target.value)}
              placeholder="e.g. Spoke with client about quarterly brand campaign; they requested follow-up in 3 days."
              className="w-full bg-[#0B111C] border border-[#2A3446] rounded-xl p-3 text-white focus:outline-none focus:border-[#7FA0D6]"
            />
          </div>

          <div>
            <label className="block text-[#97A0B3] font-bold uppercase mb-1">Outcome / Agreed Next Step</label>
            <input
              type="text"
              value={outcome}
              onChange={(e) => setOutcome(e.target.value)}
              placeholder="e.g. Send updated pricing deck and proposal"
              className="w-full bg-[#0B111C] border border-[#2A3446] rounded-xl px-3 py-2 text-white focus:outline-none focus:border-[#7FA0D6]"
            />
          </div>

          <div>
            <label className="block text-[#97A0B3] font-bold uppercase mb-1">Schedule Next Follow-Up Date & Time</label>
            <input
              type="datetime-local"
              value={followUpDate}
              onChange={(e) => setFollowUpDate(e.target.value)}
              className="w-full bg-[#0B111C] border border-[#2A3446] rounded-xl px-3 py-2 text-white focus:outline-none focus:border-[#7FA0D6]"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#2A3446]">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-full border border-[#2A3446] text-[#97A0B3] hover:text-white"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !summary.trim()}
              className="px-5 py-2 rounded-full bg-[#BCCCE6] text-[#0B111C] font-bold hover:bg-white disabled:opacity-50"
            >
              {isSubmitting ? "Saving..." : "Save Activity"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Add Lead Modal ────────────────────────────────────────────────────────────

function AddLeadModal({ onClose, onSuccess }: { onClose: () => void; onSuccess: () => void }) {
  const [formData, setFormData] = useState<CreateLeadPayload>({
    name: "",
    company_name: "",
    email: "",
    phone: "",
    requirements: "",
    estimated_deal_value: 0,
    lead_source: "Inbound Website",
    priority: "warm",
    status: "new",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.company_name.trim()) return;

    try {
      setIsSubmitting(true);
      await createLead(formData);
      onSuccess();
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
      <div className="bg-[#161F2D] border border-[#2A3446] rounded-3xl w-full max-w-lg p-6 space-y-4 shadow-2xl relative max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between border-b border-[#2A3446] pb-3">
          <div>
            <h3 className="text-base font-bold text-white">Add Prospective Client</h3>
            <p className="text-xs text-[#97A0B3]">Create new lead record in centralized CRM</p>
          </div>
          <button type="button" onClick={onClose} className="text-[#97A0B3] hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3.5 text-xs">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[#97A0B3] font-bold uppercase mb-1">Contact Name *</label>
              <input
                required
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g. Rahul Sharma"
                className="w-full bg-[#0B111C] border border-[#2A3446] rounded-xl px-3 py-2 text-white focus:outline-none focus:border-[#7FA0D6]"
              />
            </div>
            <div>
              <label className="block text-[#97A0B3] font-bold uppercase mb-1">Company / Brand *</label>
              <input
                required
                type="text"
                value={formData.company_name}
                onChange={(e) => setFormData({ ...formData, company_name: e.target.value })}
                placeholder="e.g. Acme Retail"
                className="w-full bg-[#0B111C] border border-[#2A3446] rounded-xl px-3 py-2 text-white focus:outline-none focus:border-[#7FA0D6]"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[#97A0B3] font-bold uppercase mb-1">Phone / WhatsApp</label>
              <input
                type="text"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                placeholder="+91 98765 43210"
                className="w-full bg-[#0B111C] border border-[#2A3446] rounded-xl px-3 py-2 text-white focus:outline-none focus:border-[#7FA0D6]"
              />
            </div>
            <div>
              <label className="block text-[#97A0B3] font-bold uppercase mb-1">Email Address</label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="contact@acme.com"
                className="w-full bg-[#0B111C] border border-[#2A3446] rounded-xl px-3 py-2 text-white focus:outline-none focus:border-[#7FA0D6]"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[#97A0B3] font-bold uppercase mb-1">Priority</label>
              <select
                value={formData.priority}
                onChange={(e) => setFormData({ ...formData, priority: e.target.value as any })}
                className="w-full bg-[#0B111C] border border-[#2A3446] rounded-xl px-3 py-2 text-white focus:outline-none focus:border-[#7FA0D6]"
              >
                <option value="hot">🔥 Hot Lead</option>
                <option value="warm">☀️ Warm Lead</option>
                <option value="cold">❄️ Cold Lead</option>
              </select>
            </div>
            <div>
              <label className="block text-[#97A0B3] font-bold uppercase mb-1">Estimated Value (₹)</label>
              <input
                type="number"
                min="0"
                step="5000"
                value={formData.estimated_deal_value}
                onChange={(e) => setFormData({ ...formData, estimated_deal_value: Number(e.target.value) })}
                className="w-full bg-[#0B111C] border border-[#2A3446] rounded-xl px-3 py-2 text-white focus:outline-none focus:border-[#7FA0D6]"
              />
            </div>
          </div>

          <div>
            <label className="block text-[#97A0B3] font-bold uppercase mb-1">Requirements & Brief</label>
            <textarea
              rows={3}
              value={formData.requirements}
              onChange={(e) => setFormData({ ...formData, requirements: e.target.value })}
              placeholder="e.g. 15 Instagram Reels per month + brand identity refresh."
              className="w-full bg-[#0B111C] border border-[#2A3446] rounded-xl p-3 text-white focus:outline-none focus:border-[#7FA0D6]"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#2A3446]">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-full border border-[#2A3446] text-[#97A0B3] hover:text-white"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !formData.name.trim()}
              className="px-5 py-2 rounded-full bg-[#BCCCE6] text-[#0B111C] font-bold hover:bg-white disabled:opacity-50"
            >
              {isSubmitting ? "Creating..." : "Create Prospect"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
