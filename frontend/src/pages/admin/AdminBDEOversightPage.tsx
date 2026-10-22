import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Users,
  PhoneCall,
  MessageSquare,
  Calendar,
  TrendingUp,
  Search,
  Building2,
  RefreshCw,
  IndianRupee,
  Flame,
  Sun,
  Snowflake,
  FileText,
  Target,
  ArrowUpRight,
  Activity,
} from "lucide-react";
import {
  fetchBDEPerformance,
  BDEPerformanceResponse,
} from "../../lib/bde-api";
import { AdminTopHeader } from "../../components/admin/AdminTopHeader";
import { CustomSelect } from "../../components/ui/CustomSelect";

export function AdminBDEOversightPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedRep, setSelectedRep] = useState<string>("all");
  const [selectedStage, setSelectedStage] = useState<string>("all");
  const [selectedPriority, setSelectedPriority] = useState<string>("all");
  const [selectedLeadModal, setSelectedLeadModal] = useState<any | null>(null);

  const {
    data: perf,
    isLoading,
    isRefetching,
    refetch,
  } = useQuery<BDEPerformanceResponse>({
    queryKey: ["bde-performance-admin"],
    queryFn: () => fetchBDEPerformance(),
    refetchInterval: 30_000,
  });

  const overview = perf?.overview;
  const reps = perf?.bde_reps || [];
  const recentActivities = perf?.recent_activities || [];
  const leads = perf?.leads || [];

  // Filtered Leads
  const filteredLeads = useMemo(() => {
    return leads.filter((l) => {
      if (selectedRep !== "all" && l.assigned_bde_id !== selectedRep) return false;
      if (selectedStage !== "all" && l.status.toLowerCase() !== selectedStage.toLowerCase()) return false;
      if (selectedPriority !== "all" && l.priority.toLowerCase() !== selectedPriority.toLowerCase()) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesName = l.name.toLowerCase().includes(q);
        const matchesComp = l.company_name.toLowerCase().includes(q);
        const matchesBde = (l.assigned_bde_name || "").toLowerCase().includes(q);
        if (!matchesName && !matchesComp && !matchesBde) return false;
      }
      return true;
    });
  }, [leads, selectedRep, selectedStage, selectedPriority, searchQuery]);

  // In-flight deals (proposals sent, negotiations, meetings scheduled, contacted)
  const inFlightDeals = useMemo(() => {
    return leads
      .filter((l) =>
        ["proposal_sent", "negotiation", "meeting_scheduled", "contacted"].includes(
          l.status.toLowerCase()
        )
      )
      .sort((a, b) => (b.estimated_deal_value || 0) - (a.estimated_deal_value || 0));
  }, [leads]);

  // Channel breakdown metrics from reps & recent activities
  const channelMetrics = useMemo(() => {
    const totalCalls = reps.reduce((sum, r) => sum + (r.calls_count || 0), 0);
    const totalMeetings = reps.reduce((sum, r) => sum + (r.meetings_count || 0), 0);
    const totalProposals = reps.reduce((sum, r) => sum + (r.proposals_sent || 0), 0);
    const whatsappActivities = recentActivities.filter(
      (a) => a.activity_type.toLowerCase() === "whatsapp"
    ).length;
    const emailActivities = recentActivities.filter(
      (a) => a.activity_type.toLowerCase() === "email"
    ).length;
    const totalTouchpoints =
      totalCalls + totalMeetings + totalProposals + whatsappActivities + emailActivities;

    return {
      totalCalls,
      totalMeetings,
      totalProposals,
      whatsappActivities,
      emailActivities,
      totalTouchpoints,
    };
  }, [reps, recentActivities]);

  const formatINR = (val: number) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    }).format(val || 0);
  };

  const getPriorityBadge = (priority: string) => {
    const p = priority.toUpperCase();
    if (p === "HOT") {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/15 text-rose-400 border border-rose-500/30">
          <Flame className="w-3 h-3" /> HOT
        </span>
      );
    }
    if (p === "WARM") {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/15 text-amber-400 border border-amber-500/30">
          <Sun className="w-3 h-3" /> WARM
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-500/15 text-blue-400 border border-blue-500/30">
        <Snowflake className="w-3 h-3" /> COLD
      </span>
    );
  };

  const getStageBadge = (stg: string) => {
    const map: Record<string, { label: string; bg: string; text: string }> = {
      new: { label: "New Lead", bg: "bg-slate-500/15 border-slate-500/30", text: "text-slate-300" },
      contacted: { label: "Contacted", bg: "bg-blue-500/15 border-blue-500/30", text: "text-blue-400" },
      meeting_scheduled: { label: "Pitch / Meeting", bg: "bg-purple-500/15 border-purple-500/30", text: "text-purple-400" },
      proposal_sent: { label: "Proposal Sent", bg: "bg-indigo-500/15 border-indigo-500/30", text: "text-indigo-400" },
      negotiation: { label: "Negotiation", bg: "bg-amber-500/15 border-amber-500/30", text: "text-amber-400" },
      converted: { label: "Won & Converted", bg: "bg-emerald-500/15 border-emerald-500/30", text: "text-emerald-400" },
      lost: { label: "Lost", bg: "bg-rose-500/15 border-rose-500/30", text: "text-rose-400" },
    };
    const s = map[stg.toLowerCase()] || { label: stg, bg: "bg-slate-500/15 border-slate-500/30", text: "text-slate-300" };
    return (
      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border ${s.bg} ${s.text}`}>
        {s.label}
      </span>
    );
  };


  return (
    <div data-surface="ops" className="w-full min-h-screen font-sans bg-app-base flex flex-col">
      <AdminTopHeader activeTab="BDE Outreach" hideTitle />
      <main className="flex-1 px-3.5 sm:px-6 lg:px-8 py-4 sm:py-6 max-w-[1500px] w-full mx-auto space-y-4 sm:space-y-6 text-app-ink">

        {/* ── DESKTOP/TABLET: Metric Cards (Hidden on phone) ── */}
        <div className="hidden sm:grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Metric 1: Clients Reached */}
          <div className="p-5 rounded-2xl bg-app-surface border border-app-line shadow-xs relative overflow-hidden group hover:border-app-accent/40 transition-all">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-app-mist uppercase tracking-wider">
                Clients Reached
              </span>
              <div className="w-8 h-8 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
                <Target className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-3 flex items-baseline gap-2">
              <span className="text-2xl font-black text-hi">
                {overview?.total_clients_reached ?? 0}
              </span>
              <span className="text-xs text-app-mist">
                / {overview?.total_leads ?? 0} total leads
              </span>
            </div>
            <div className="mt-3">
              <div className="flex justify-between text-[11px] text-app-mist mb-1">
                <span>Outreach Coverage</span>
                <span className="font-bold text-app-accent">{overview?.reach_rate ?? 0}%</span>
              </div>
              <div className="w-full h-1.5 rounded-full bg-app-base overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-blue-500 to-app-accent rounded-full transition-all duration-700 text-app-on-accent!"
                  style={{ width: `${Math.min(100, overview?.reach_rate || 0)}%` }}
                />
              </div>
            </div>
          </div>

          {/* Metric 2: Total Outreach Touchpoints */}
          <div className="p-5 rounded-2xl bg-app-surface border border-app-line shadow-xs relative overflow-hidden group hover:border-emerald-500/40 transition-all">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-app-mist uppercase tracking-wider">
                Total Touchpoints
              </span>
              <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
                <PhoneCall className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-3 flex items-baseline gap-2">
              <span className="text-2xl font-black text-hi">
                {overview?.total_outreach_activities ?? 0}
              </span>
              <span className="text-xs text-emerald-400 font-semibold">interactions logged</span>
            </div>
            <div className="mt-3 flex items-center gap-3 text-[11px] text-app-mist">
              <span className="flex items-center gap-1">
                <PhoneCall className="w-3 h-3 text-blue-400" /> {overview?.activity_breakdown?.call ?? 0} Calls
              </span>
              <span className="flex items-center gap-1">
                <Calendar className="w-3 h-3 text-purple-400" /> {overview?.activity_breakdown?.meeting ?? 0} Meets
              </span>
              <span className="flex items-center gap-1">
                <FileText className="w-3 h-3 text-amber-400" /> {overview?.activity_breakdown?.proposal ?? 0} Props
              </span>
            </div>
          </div>

          {/* Metric 3: Active Pipeline Value */}
          <div className="p-5 rounded-2xl bg-app-surface border border-app-line shadow-xs relative overflow-hidden group hover:border-amber-500/40 transition-all">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-app-mist uppercase tracking-wider">
                Active Pipeline Value
              </span>
              <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
                <IndianRupee className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-3 flex items-baseline gap-2">
              <span className="text-2xl font-black text-amber-400">
                {formatINR(overview?.active_pipeline_value ?? 0)}
              </span>
            </div>
            <div className="mt-3 flex items-center justify-between text-[11px] text-app-mist">
              <span>In Negotiation / Proposal</span>
              <span className="text-hi font-semibold">
                {(overview?.total_leads ?? 0) - (overview?.converted_count ?? 0)} active deals
              </span>
            </div>
          </div>

          {/* Metric 4: Closed Revenue & Win Rate */}
          <div className="p-5 rounded-2xl bg-app-surface border border-app-line shadow-xs relative overflow-hidden group hover:border-purple-500/40 transition-all">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-app-mist uppercase tracking-wider">
                Won Revenue
              </span>
              <div className="w-8 h-8 rounded-lg bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400">
                <TrendingUp className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-3 flex items-baseline gap-2">
              <span className="text-2xl font-black text-emerald-400">
                {formatINR(overview?.closed_revenue ?? 0)}
              </span>
              <span className="text-xs text-app-mist">
                ({overview?.converted_count ?? 0} won)
              </span>
            </div>
            <div className="mt-3 flex items-center justify-between text-[11px] text-app-mist">
              <span>Win Conversion Rate</span>
              <span className="font-bold text-emerald-400">
                {overview?.conversion_rate ?? 0}%
              </span>
            </div>
          </div>
        </div>

      {/* ── Top Row: Rep Leaderboard ── */}
      <div className="w-full">
        {/* BDE Representative Work Breakdown */}
        <div className="w-full flex flex-col">
          <div className="p-4 sm:p-5 rounded-2xl bg-app-surface border border-app-line shadow-sm flex-1 flex flex-col">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
              <div>
                <h2 className="text-base font-bold text-hi flex items-center gap-2">
                  <Users className="w-4 h-4 text-app-accent" />
                  BDE Representative Work Breakdown
                </h2>
                <p className="text-xs text-app-mist mt-0.5">
                  Clients reached, call volume, meetings scheduled, and revenue closed per agent.
                </p>
              </div>
              <div className="flex items-center gap-2 self-start sm:self-auto">
                <button
                  onClick={() => refetch()}
                  disabled={isLoading || isRefetching}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-app-base hover:bg-app-line-soft border border-app-line hover:border-app-accent/40 text-xs font-semibold text-app-accent-soft hover:text-hi transition-all shadow-xs disabled:opacity-50 cursor-pointer"
                  title="Sync live BDE performance data"
                >
                  <RefreshCw className={`w-3.5 h-3.5 text-app-accent ${isRefetching ? "animate-spin" : ""}`} />
                  <span>{isRefetching ? "Syncing..." : "Sync Live Data"}</span>
                </button>
                <span className="text-xs font-bold px-2.5 py-1.5 rounded-xl bg-app-base border border-app-line text-app-accent-soft">
                  {reps.length} Active {reps.length === 1 ? "Agent" : "Agents"}
                </span>
              </div>
            </div>

            {reps.length === 0 ? (
              <div className="text-center py-10 bg-app-base rounded-xl border border-app-line">
                <Users className="w-8 h-8 text-app-mist mx-auto mb-2 opacity-50" />
                <p className="text-sm font-semibold text-hi">No BDE Representatives Active</p>
                <p className="text-xs text-app-mist mt-1">Assign leads to sales reps to monitor workload and client reach.</p>
              </div>
            ) : (
              <>
                {/* Mobile Card View (Eliminates table column collision on phones) */}
                <div className="sm:hidden space-y-2.5">
                  {reps.map((rep) => {
                    const reachPct = rep.total_assigned > 0 ? Math.round((rep.clients_reached / rep.total_assigned) * 100) : 0;
                    return (
                      <div key={rep.bde_id} className="p-3 bg-app-base rounded-xl border border-app-line space-y-2.5">
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2.5 min-w-0">
                            <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-app-accent to-indigo-600 flex items-center justify-center text-white font-bold text-xs shrink-0">
                              {rep.avatar_initials || "BD"}
                            </div>
                            <div className="min-w-0">
                              <p className="font-bold text-hi text-xs truncate">{rep.name}</p>
                              <p className="text-[10px] text-app-mist truncate">{rep.email}</p>
                            </div>
                          </div>
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 shrink-0">
                            {rep.conversion_rate}% Win
                          </span>
                        </div>
                        <div className="grid grid-cols-4 gap-1.5 pt-1 text-center text-[10px] border-t border-app-line/60">
                          <div className="p-1 rounded bg-app-surface">
                            <span className="text-app-mist block">Reached</span>
                            <span className="font-bold text-app-accent">{rep.clients_reached}/{rep.total_assigned} ({reachPct}%)</span>
                          </div>
                          <div className="p-1 rounded bg-app-surface">
                            <span className="text-app-mist block">Calls</span>
                            <span className="font-bold text-blue-400">{rep.calls_count}</span>
                          </div>
                          <div className="p-1 rounded bg-app-surface">
                            <span className="text-app-mist block">Meets</span>
                            <span className="font-bold text-purple-400">{rep.meetings_count}</span>
                          </div>
                          <div className="p-1 rounded bg-app-surface">
                            <span className="text-app-mist block">Won</span>
                            <span className="font-bold text-emerald-400 truncate">{formatINR(rep.revenue_generated)}</span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Desktop/Tablet Responsive Table */}
                <div className="hidden sm:block overflow-x-auto">
                  <table className="min-w-[620px] w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-app-line text-app-mist text-[11px] uppercase tracking-wider font-semibold">
                        <th className="pb-3 pl-2">Representative</th>
                        <th className="pb-3 text-center">Clients Reached</th>
                        <th className="pb-3 text-center">Calls</th>
                        <th className="pb-3 text-center">Meetings</th>
                        <th className="pb-3 text-center">Proposals</th>
                        <th className="pb-3 text-right">Won Revenue</th>
                        <th className="pb-3 text-right pr-2">Win Rate</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-app-line/60">
                      {reps.map((rep) => {
                        const reachPct = rep.total_assigned > 0 ? Math.round((rep.clients_reached / rep.total_assigned) * 100) : 0;
                        return (
                          <tr key={rep.bde_id} className="hover:bg-app-base/40 transition-colors group">
                            <td className="py-3.5 pl-2">
                              <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-app-accent to-indigo-600 flex items-center justify-center text-white font-bold text-xs shrink-0">
                                  {rep.avatar_initials || "BD"}
                                </div>
                                <div>
                                  <p className="font-bold text-hi group-hover:text-app-accent transition-colors">
                                    {rep.name}
                                  </p>
                                  <p className="text-[11px] text-app-mist">{rep.email}</p>
                                </div>
                              </div>
                            </td>
                            <td className="py-3.5 text-center">
                              <div className="inline-flex flex-col items-center">
                                <span className="font-bold text-hi text-xs">
                                  {rep.clients_reached}{" "}
                                  <span className="text-app-mist font-normal text-[10px]">
                                    / {rep.total_assigned}
                                  </span>
                                </span>
                                <span className="text-[10px] text-app-accent font-semibold">
                                  {reachPct}% reached
                                </span>
                              </div>
                            </td>
                            <td className="py-3.5 text-center font-semibold text-blue-400">
                              {rep.calls_count}
                            </td>
                            <td className="py-3.5 text-center font-semibold text-purple-400">
                              {rep.meetings_count}
                            </td>
                            <td className="py-3.5 text-center font-semibold text-amber-400">
                              {rep.proposals_sent}
                            </td>
                            <td className="py-3.5 text-right font-bold text-emerald-400">
                              {formatINR(rep.revenue_generated)}
                            </td>
                            <td className="py-3.5 text-right pr-2">
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                                {rep.conversion_rate}%
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </div>
        </div>
      </div>


          {/* ── High-Priority Deals in Flight (Fills the space & highlights active pipeline) ── */}
          <div className="p-5 rounded-2xl bg-app-surface border border-app-line shadow-sm space-y-3.5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
              <div className="min-w-0">
                <h3 className="text-sm font-bold text-hi flex items-center gap-2">
                  <Flame className="w-4 h-4 text-amber-400 shrink-0" />
                  <span>Active Deals in Flight & Proposals Under Negotiation</span>
                </h3>
                <p className="text-[11px] text-app-mist mt-0.5">
                  High-priority commercial opportunities actively progressing through pitch, proposal, and negotiation.
                </p>
              </div>
              <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-amber-500/15 text-amber-300 border border-amber-500/30 shrink-0 whitespace-nowrap self-start sm:self-auto">
                {inFlightDeals.length} Deals In Flight
              </span>
            </div>

            {inFlightDeals.length === 0 ? (
              <div className="p-6 bg-app-base rounded-xl border border-app-line text-center text-xs text-app-mist">
                No deals currently in proposal or negotiation stage.
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
                {inFlightDeals.slice(0, 4).map((deal) => (
                  <div
                    key={deal.id}
                    onClick={() => setSelectedLeadModal(deal)}
                    className="p-4 rounded-xl bg-app-base border border-app-line hover:border-amber-500/40 transition-all cursor-pointer group flex flex-col justify-between space-y-3"
                  >
                    <div>
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <h4 className="text-xs font-bold text-hi truncate group-hover:text-amber-400 transition-colors">
                            {deal.company_name}
                          </h4>
                          <p className="text-[11px] text-app-mist truncate">{deal.name}</p>
                        </div>
                        {getPriorityBadge(deal.priority)}
                      </div>

                      <div className="mt-2.5 flex items-baseline justify-between">
                        <span className="text-sm font-black text-amber-400">
                          {formatINR(deal.estimated_deal_value)}
                        </span>
                        <div>{getStageBadge(deal.status)}</div>
                      </div>
                    </div>

                    <div className="pt-2.5 border-t border-app-line/60 flex items-center justify-between text-[11px]">
                      <div className="flex items-center gap-1.5 text-app-accent-soft truncate">
                        <div className="w-5 h-5 rounded-full bg-app-surface text-[9px] font-bold text-amber-400 flex items-center justify-center border border-app-line">
                          {(deal.assigned_bde_name || "BD").slice(0, 2).toUpperCase()}
                        </div>
                        <span className="truncate">{deal.assigned_bde_name || "Unassigned"}</span>
                      </div>
                      <span className="text-[10px] text-app-accent group-hover:underline flex items-center gap-0.5 shrink-0">
                        Inspect <ArrowUpRight className="w-3 h-3" />
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* ── Outreach Channels & Touchpoints Efficiency ── */}
          <div className="p-5 rounded-2xl bg-app-surface border border-app-line shadow-sm space-y-3.5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
              <div className="min-w-0">
                <h3 className="text-sm font-bold text-hi flex items-center gap-2">
                  <Activity className="w-4 h-4 text-blue-400 shrink-0" />
                  <span>Outreach Channels & Touchpoint Engagement Breakdown</span>
                </h3>
                <p className="text-[11px] text-app-mist mt-0.5">
                  Aggregate distribution of client interaction channels logged across active sales reps.
                </p>
              </div>
              <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-blue-500/15 text-blue-300 border border-blue-500/30 shrink-0 whitespace-nowrap self-start sm:self-auto">
                Multi-Channel Mix
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="p-3.5 rounded-xl bg-app-base border border-app-line space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] uppercase font-bold text-app-mist">Calls Logged</span>
                  <PhoneCall className="w-3.5 h-3.5 text-blue-400" />
                </div>
                <p className="text-lg font-black text-hi">{channelMetrics.totalCalls}</p>
                <div className="w-full bg-app-surface h-1.5 rounded-full overflow-hidden mt-1">
                  <div
                    className="bg-blue-500 h-full rounded-full text-app-on-accent!"
                    style={{
                      width: `${Math.min(100, Math.round((channelMetrics.totalCalls / Math.max(1, channelMetrics.totalTouchpoints)) * 100))}%`,
                    }}
                  />
                </div>
                <span className="text-[9px] text-blue-400 font-semibold block pt-0.5">Direct outreach</span>
              </div>

              <div className="p-3.5 rounded-xl bg-app-base border border-app-line space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] uppercase font-bold text-app-mist">WhatsApp</span>
                  <MessageSquare className="w-3.5 h-3.5 text-emerald-400" />
                </div>
                <p className="text-lg font-black text-hi">{channelMetrics.whatsappActivities}</p>
                <div className="w-full bg-app-surface h-1.5 rounded-full overflow-hidden mt-1">
                  <div
                    className="bg-emerald-500 h-full rounded-full text-app-on-accent!"
                    style={{
                      width: `${Math.min(100, Math.round((channelMetrics.whatsappActivities / Math.max(1, channelMetrics.totalTouchpoints)) * 100))}%`,
                    }}
                  />
                </div>
                <span className="text-[9px] text-emerald-400 font-semibold block pt-0.5">Quick responses</span>
              </div>

              <div className="p-3.5 rounded-xl bg-app-base border border-app-line space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] uppercase font-bold text-app-mist">Meetings Held</span>
                  <Calendar className="w-3.5 h-3.5 text-purple-400" />
                </div>
                <p className="text-lg font-black text-hi">{channelMetrics.totalMeetings}</p>
                <div className="w-full bg-app-surface h-1.5 rounded-full overflow-hidden mt-1">
                  <div
                    className="bg-purple-500 h-full rounded-full text-app-on-accent!"
                    style={{
                      width: `${Math.min(100, Math.round((channelMetrics.totalMeetings / Math.max(1, channelMetrics.totalTouchpoints)) * 100))}%`,
                    }}
                  />
                </div>
                <span className="text-[9px] text-purple-400 font-semibold block pt-0.5">Client pitches</span>
              </div>

              <div className="p-3.5 rounded-xl bg-app-base border border-app-line space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] uppercase font-bold text-app-mist">Proposals Sent</span>
                  <FileText className="w-3.5 h-3.5 text-amber-400" />
                </div>
                <p className="text-lg font-black text-hi">{channelMetrics.totalProposals}</p>
                <div className="w-full bg-app-surface h-1.5 rounded-full overflow-hidden mt-1">
                  <div
                    className="bg-amber-500 h-full rounded-full text-app-on-warm!"
                    style={{
                      width: `${Math.min(100, Math.round((channelMetrics.totalProposals / Math.max(1, channelMetrics.totalTouchpoints)) * 100))}%`,
                    }}
                  />
                </div>
                <span className="text-[9px] text-amber-400 font-semibold block pt-0.5">Deal agreements</span>
              </div>
            </div>
          </div>

      {/* ── Client & Prospect Directory (Full Oversight Table) ── */}
      <div className="p-5 rounded-2xl bg-app-surface border border-app-line shadow-sm space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-bold text-hi flex items-center gap-2">
              <Building2 className="w-4 h-4 text-app-accent" />
              Prospect Outreach Directory
            </h2>
            <p className="text-xs text-app-mist mt-0.5">
              Inspect all client leads reached by BDEs, deal values, current stage, and touchpoints count.
            </p>
          </div>

          {/* Filters Bar: Responsive Search + 3 Dropdown Columns */}
          <div className="flex flex-col sm:flex-row flex-wrap items-stretch sm:items-center gap-2 sm:gap-2.5 w-full md:w-auto">
            {/* Search */}
            <div className="relative w-full sm:w-auto sm:min-w-[190px]">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-app-mist" />
              <input
                type="text"
                placeholder="Search company or lead..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 h-8 rounded-xl bg-app-base border border-app-line text-xs text-hi placeholder-app-mist focus:outline-none focus:border-app-accent"
              />
            </div>

            {/* Dropdowns Group: 3-column aligned grid on mobile, inline on desktop */}
            <div className="grid grid-cols-3 sm:flex sm:items-center gap-1.5 sm:gap-2 w-full sm:w-auto">
              <CustomSelect
                size="sm"
                value={selectedRep}
                onChange={setSelectedRep}
                ariaLabel="Filter by BDE Agent"
                className="w-full !text-xs !h-8"
                options={[
                  { value: "all", label: "All Agents" },
                  ...reps.map((r) => ({ value: r.bde_id, label: r.name })),
                ]}
              />

              <CustomSelect
                size="sm"
                value={selectedStage}
                onChange={setSelectedStage}
                ariaLabel="Filter by Lead Stage"
                className="w-full !text-xs !h-8"
                options={[
                  { value: "all", label: "All Stages" },
                  { value: "new", label: "New Lead" },
                  { value: "contacted", label: "Contacted" },
                  { value: "meeting_scheduled", label: "Meeting Scheduled" },
                  { value: "proposal_sent", label: "Proposal Sent" },
                  { value: "negotiation", label: "Negotiation" },
                  { value: "converted", label: "Won / Converted" },
                  { value: "lost", label: "Lost" },
                ]}
              />

              <CustomSelect
                size="sm"
                value={selectedPriority}
                onChange={setSelectedPriority}
                ariaLabel="Filter by Priority"
                className="w-full !text-xs !h-8"
                options={[
                  { value: "all", label: "All Priorities" },
                  { value: "hot", label: "Hot" },
                  { value: "warm", label: "Warm" },
                  { value: "cold", label: "Cold" },
                ]}
              />
            </div>
          </div>
        </div>

        {/* Directory Table with min-width and proper column spacing */}
        <div className="overflow-x-auto -mx-5 px-5 sm:mx-0 sm:px-0">
          <table className="w-full min-w-[760px] text-left text-xs">
            <thead>
              <tr className="border-b border-app-line text-app-mist text-[11px] uppercase tracking-wider font-semibold">
                <th className="pb-3 pl-2 whitespace-nowrap min-w-[190px]">Prospect & Company</th>
                <th className="pb-3 whitespace-nowrap min-w-[120px]">Assigned BDE</th>
                <th className="pb-3 text-center whitespace-nowrap min-w-[85px]">Priority</th>
                <th className="pb-3 text-center whitespace-nowrap min-w-[110px]">Stage</th>
                <th className="pb-3 text-right whitespace-nowrap min-w-[110px]">Estimated Value</th>
                <th className="pb-3 text-center whitespace-nowrap min-w-[100px]">Touchpoints</th>
                <th className="pb-3 text-right pr-2 whitespace-nowrap min-w-[100px]">Last Contacted</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-app-line/60">
              {filteredLeads.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-10 text-center text-app-mist">
                    No prospects matching filters found.
                  </td>
                </tr>
              ) : (
                filteredLeads.map((lead) => (
                  <tr
                    key={lead.id}
                    onClick={() => setSelectedLeadModal(lead)}
                    className="hover:bg-app-base/60 transition-colors cursor-pointer group"
                  >
                    <td className="py-3.5 pl-2">
                      <div className="font-bold text-hi group-hover:text-app-accent transition-colors">
                        {lead.company_name}
                      </div>
                      <div className="text-[11px] text-app-mist mt-0.5">
                        {lead.name} {lead.phone ? `• ${lead.phone}` : ""}
                      </div>
                    </td>
                    <td className="py-3.5 text-xs text-app-accent-soft">
                      <span className="font-medium text-hi">{lead.assigned_bde_name || "Unassigned"}</span>
                    </td>
                    <td className="py-3.5 text-center">
                      {getPriorityBadge(lead.priority)}
                    </td>
                    <td className="py-3.5 text-center">
                      {getStageBadge(lead.status)}
                    </td>
                    <td className="py-3.5 text-right font-bold text-amber-400">
                      {formatINR(lead.estimated_deal_value)}
                    </td>
                    <td className="py-3.5 text-center">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-app-base border border-app-line text-app-accent">
                        {lead.activities_count} logged
                      </span>
                    </td>
                    <td className="py-3.5 text-right pr-2 text-[11px] text-app-mist">
                      {lead.last_contacted_at
                        ? new Date(lead.last_contacted_at).toLocaleDateString()
                        : "Never"}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Client Details Modal for Admin Inspection ── */}
      {selectedLeadModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-lg rounded-2xl bg-app-surface border border-app-line p-6 shadow-2xl space-y-4">
            <div className="flex items-start justify-between border-b border-app-line pb-3">
              <div>
                <h3 className="text-lg font-bold text-hi flex items-center gap-2">
                  {selectedLeadModal.company_name}
                  {getPriorityBadge(selectedLeadModal.priority)}
                </h3>
                <p className="text-xs text-app-mist mt-0.5">
                  Contact: {selectedLeadModal.name} {selectedLeadModal.email ? `• ${selectedLeadModal.email}` : ""}
                </p>
              </div>
              <button
                onClick={() => setSelectedLeadModal(null)}
                className="text-app-mist hover:text-hi text-xs font-bold px-2 py-1 rounded-lg bg-app-base border border-app-line"
              >
                ✕ Close
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="p-3 rounded-xl bg-app-base border border-app-line">
                <span className="text-app-mist">Assigned BDE:</span>
                <p className="font-bold text-hi mt-1">{selectedLeadModal.assigned_bde_name || "Unassigned"}</p>
              </div>
              <div className="p-3 rounded-xl bg-app-base border border-app-line">
                <span className="text-app-mist">Current Stage:</span>
                <div className="mt-1">{getStageBadge(selectedLeadModal.status)}</div>
              </div>
              <div className="p-3 rounded-xl bg-app-base border border-app-line">
                <span className="text-app-mist">Estimated Deal Value:</span>
                <p className="font-bold text-amber-400 mt-1">{formatINR(selectedLeadModal.estimated_deal_value)}</p>
              </div>
              <div className="p-3 rounded-xl bg-app-base border border-app-line">
                <span className="text-app-mist">Lead Source:</span>
                <p className="font-bold text-hi mt-1">{selectedLeadModal.lead_source || "Inbound"}</p>
              </div>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                onClick={() => setSelectedLeadModal(null)}
                className="px-4 py-2 rounded-xl bg-app-accent text-app-on-accent! font-bold text-xs hover:bg-app-accent/90 transition-colors"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
      </main>
    </div>
  );
}

export default AdminBDEOversightPage;
