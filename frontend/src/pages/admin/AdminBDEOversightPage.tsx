import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Users,
  PhoneCall,
  MessageSquare,
  Mail,
  Calendar,
  TrendingUp,
  Clock,
  Search,
  Building2,
  Sparkles,
  RefreshCw,
  IndianRupee,
  Flame,
  Sun,
  Snowflake,
  FileText,
  Briefcase,
  Target,
  ArrowUpRight,
  Activity,
} from "lucide-react";
import {
  fetchBDEPerformance,
  BDEPerformanceResponse,
} from "../../lib/bde-api";

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
  const stages = perf?.stages || [];
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

  const getActivityIcon = (type: string) => {
    switch (type.toLowerCase()) {
      case "call":
        return <PhoneCall className="w-3.5 h-3.5 text-blue-400" />;
      case "whatsapp":
        return <MessageSquare className="w-3.5 h-3.5 text-emerald-400" />;
      case "email":
        return <Mail className="w-3.5 h-3.5 text-indigo-400" />;
      case "meeting":
        return <Calendar className="w-3.5 h-3.5 text-purple-400" />;
      case "proposal":
        return <FileText className="w-3.5 h-3.5 text-amber-400" />;
      default:
        return <Sparkles className="w-3.5 h-3.5 text-[#7FA0D6]" />;
    }
  };

  return (
    <div className="space-y-6 pb-12 animate-fade-in text-[#F8FAFC]">
      {/* ── Top Header & Context Bar ── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-5 rounded-2xl bg-[#161F2D] border border-[#2A3446] shadow-sm">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-[#7FA0D6] to-indigo-600 flex items-center justify-center text-white shadow-md shadow-[#7FA0D6]/20">
              <Briefcase className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
                BDE Overview
                <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-[#7FA0D6]/20 text-[#7FA0D6] border border-[#7FA0D6]/30">
                  Admin Console
                </span>
              </h1>
              <p className="text-xs text-[#97A0B3] mt-0.5">
                Executive monitoring of BDE work processes, outreach touchpoints, prospects reached, and deal velocity.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => refetch()}
            disabled={isLoading || isRefetching}
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-[#0B111C] hover:bg-[#202B3D] border border-[#2A3446] hover:border-[#7FA0D6]/40 text-xs font-semibold text-[#BCCCE6] hover:text-white transition-all shadow-xs disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-[#7FA0D6] ${isRefetching ? "animate-spin" : ""}`} />
            <span>{isRefetching ? "Refreshing..." : "Sync Live Data"}</span>
          </button>
        </div>
      </div>

      {/* ── Metric Cards (Work Process & Outreach KPIs) ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Metric 1: Clients Reached */}
        <div className="p-5 rounded-2xl bg-[#161F2D] border border-[#2A3446] shadow-xs relative overflow-hidden group hover:border-[#7FA0D6]/40 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[#97A0B3] uppercase tracking-wider">
              Clients Reached
            </span>
            <div className="w-8 h-8 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
              <Target className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-black text-white">
              {overview?.total_clients_reached ?? 0}
            </span>
            <span className="text-xs text-[#97A0B3]">
              / {overview?.total_leads ?? 0} total leads
            </span>
          </div>
          <div className="mt-3">
            <div className="flex justify-between text-[11px] text-[#97A0B3] mb-1">
              <span>Outreach Coverage</span>
              <span className="font-bold text-[#7FA0D6]">{overview?.reach_rate ?? 0}%</span>
            </div>
            <div className="w-full h-1.5 rounded-full bg-[#0B111C] overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-blue-500 to-[#7FA0D6] rounded-full transition-all duration-700"
                style={{ width: `${Math.min(100, overview?.reach_rate || 0)}%` }}
              />
            </div>
          </div>
        </div>

        {/* Metric 2: Total Outreach Touchpoints */}
        <div className="p-5 rounded-2xl bg-[#161F2D] border border-[#2A3446] shadow-xs relative overflow-hidden group hover:border-emerald-500/40 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[#97A0B3] uppercase tracking-wider">
              Total Touchpoints
            </span>
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
              <PhoneCall className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-black text-white">
              {overview?.total_outreach_activities ?? 0}
            </span>
            <span className="text-xs text-emerald-400 font-semibold">interactions logged</span>
          </div>
          <div className="mt-3 flex items-center gap-3 text-[11px] text-[#97A0B3]">
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
        <div className="p-5 rounded-2xl bg-[#161F2D] border border-[#2A3446] shadow-xs relative overflow-hidden group hover:border-amber-500/40 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[#97A0B3] uppercase tracking-wider">
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
          <div className="mt-3 flex items-center justify-between text-[11px] text-[#97A0B3]">
            <span>In Negotiation / Proposal</span>
            <span className="text-white font-semibold">
              {(overview?.total_leads ?? 0) - (overview?.converted_count ?? 0)} active deals
            </span>
          </div>
        </div>

        {/* Metric 4: Closed Revenue & Win Rate */}
        <div className="p-5 rounded-2xl bg-[#161F2D] border border-[#2A3446] shadow-xs relative overflow-hidden group hover:border-purple-500/40 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[#97A0B3] uppercase tracking-wider">
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
            <span className="text-xs text-[#97A0B3]">
              ({overview?.converted_count ?? 0} won)
            </span>
          </div>
          <div className="mt-3 flex items-center justify-between text-[11px] text-[#97A0B3]">
            <span>Win Conversion Rate</span>
            <span className="font-bold text-emerald-400">
              {overview?.conversion_rate ?? 0}%
            </span>
          </div>
        </div>
      </div>

      {/* ── Main Two-Column Grid: Rep Leaderboard + Live Activity Stream ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column (2 Cols): BDE Representative Work Breakdown */}
        <div className="lg:col-span-2 space-y-4">
          <div className="p-5 rounded-2xl bg-[#161F2D] border border-[#2A3446] shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-base font-bold text-white flex items-center gap-2">
                  <Users className="w-4 h-4 text-[#7FA0D6]" />
                  BDE Representative Work Breakdown
                </h2>
                <p className="text-xs text-[#97A0B3] mt-0.5">
                  Clients reached, call volume, meetings scheduled, and revenue closed per agent.
                </p>
              </div>
              <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-[#0B111C] border border-[#2A3446] text-[#BCCCE6]">
                {reps.length} Active {reps.length === 1 ? "Agent" : "Agents"}
              </span>
            </div>

            {reps.length === 0 ? (
              <div className="text-center py-10 bg-[#0B111C] rounded-xl border border-[#2A3446]">
                <Users className="w-8 h-8 text-[#97A0B3] mx-auto mb-2 opacity-50" />
                <p className="text-sm font-semibold text-white">No BDE Representatives Active</p>
                <p className="text-xs text-[#97A0B3] mt-1">Assign leads to sales reps to monitor workload and client reach.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-[#2A3446] text-[#97A0B3] text-[11px] uppercase tracking-wider font-semibold">
                      <th className="pb-3 pl-2">Representative</th>
                      <th className="pb-3 text-center">Clients Reached</th>
                      <th className="pb-3 text-center">Calls</th>
                      <th className="pb-3 text-center">Meetings</th>
                      <th className="pb-3 text-center">Proposals</th>
                      <th className="pb-3 text-right">Won Revenue</th>
                      <th className="pb-3 text-right pr-2">Win Rate</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#2A3446]/60">
                    {reps.map((rep) => {
                      const reachPct = rep.total_assigned > 0 ? Math.round((rep.clients_reached / rep.total_assigned) * 100) : 0;
                      return (
                        <tr key={rep.bde_id} className="hover:bg-[#0B111C]/40 transition-colors group">
                          <td className="py-3.5 pl-2">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-[#7FA0D6] to-indigo-600 flex items-center justify-center text-white font-bold text-xs shrink-0">
                                {rep.avatar_initials || "BD"}
                              </div>
                              <div>
                                <p className="font-bold text-white group-hover:text-[#7FA0D6] transition-colors">
                                  {rep.name}
                                </p>
                                <p className="text-[11px] text-[#97A0B3]">{rep.email}</p>
                              </div>
                            </div>
                          </td>
                          <td className="py-3.5 text-center">
                            <div className="inline-flex flex-col items-center">
                              <span className="font-bold text-white text-xs">
                                {rep.clients_reached}{" "}
                                <span className="text-[#97A0B3] font-normal text-[10px]">
                                  / {rep.total_assigned}
                                </span>
                              </span>
                              <span className="text-[10px] text-[#7FA0D6] font-semibold">
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
            )}
          </div>

          {/* ── Conversion Funnel Breakdown ── */}
          <div className="p-5 rounded-2xl bg-[#161F2D] border border-[#2A3446] shadow-sm">
            <h3 className="text-sm font-bold text-white mb-3 flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-emerald-400" />
              Stage Progression Funnel
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2">
              {stages.map((stg) => {
                const stageLabel = stg.stage.replace("_", " ").toUpperCase();
                return (
                  <div
                    key={stg.stage}
                    className="p-3 rounded-xl bg-[#0B111C] border border-[#2A3446] text-center"
                  >
                    <p className="text-[10px] uppercase font-bold text-[#97A0B3] truncate">
                      {stageLabel}
                    </p>
                    <p className="text-lg font-black text-white mt-1">{stg.count}</p>
                    <p className="text-[10px] text-amber-400 font-semibold truncate mt-0.5">
                      {formatINR(stg.value)}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>

          {/* ── High-Priority Deals in Flight (Fills the space & highlights active pipeline) ── */}
          <div className="p-5 rounded-2xl bg-[#161F2D] border border-[#2A3446] shadow-sm space-y-3.5">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <Flame className="w-4 h-4 text-amber-400" />
                  Active Deals in Flight & Proposals Under Negotiation
                </h3>
                <p className="text-[11px] text-[#97A0B3] mt-0.5">
                  High-priority commercial opportunities actively progressing through pitch, proposal, and negotiation.
                </p>
              </div>
              <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-amber-500/15 text-amber-300 border border-amber-500/30">
                {inFlightDeals.length} Deals In Flight
              </span>
            </div>

            {inFlightDeals.length === 0 ? (
              <div className="p-6 bg-[#0B111C] rounded-xl border border-[#2A3446] text-center text-xs text-[#97A0B3]">
                No deals currently in proposal or negotiation stage.
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {inFlightDeals.slice(0, 4).map((deal) => (
                  <div
                    key={deal.id}
                    onClick={() => setSelectedLeadModal(deal)}
                    className="p-4 rounded-xl bg-[#0B111C] border border-[#2A3446] hover:border-amber-500/40 transition-all cursor-pointer group flex flex-col justify-between space-y-3"
                  >
                    <div>
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <h4 className="text-xs font-bold text-white truncate group-hover:text-amber-400 transition-colors">
                            {deal.company_name}
                          </h4>
                          <p className="text-[11px] text-[#97A0B3] truncate">{deal.name}</p>
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

                    <div className="pt-2.5 border-t border-[#2A3446]/60 flex items-center justify-between text-[11px]">
                      <div className="flex items-center gap-1.5 text-[#BCCCE6] truncate">
                        <div className="w-5 h-5 rounded-full bg-[#161F2D] text-[9px] font-bold text-amber-400 flex items-center justify-center border border-[#2A3446]">
                          {(deal.assigned_bde_name || "BD").slice(0, 2).toUpperCase()}
                        </div>
                        <span className="truncate">{deal.assigned_bde_name || "Unassigned"}</span>
                      </div>
                      <span className="text-[10px] text-[#7FA0D6] group-hover:underline flex items-center gap-0.5 shrink-0">
                        Inspect <ArrowUpRight className="w-3 h-3" />
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* ── Outreach Channels & Touchpoints Efficiency ── */}
          <div className="p-5 rounded-2xl bg-[#161F2D] border border-[#2A3446] shadow-sm space-y-3.5">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <Activity className="w-4 h-4 text-blue-400" />
                  Outreach Channels & Touchpoint Engagement Breakdown
                </h3>
                <p className="text-[11px] text-[#97A0B3] mt-0.5">
                  Aggregate distribution of client interaction channels logged across active sales reps.
                </p>
              </div>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-500/15 text-blue-300 border border-blue-500/30">
                Multi-Channel Mix
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="p-3.5 rounded-xl bg-[#0B111C] border border-[#2A3446] space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] uppercase font-bold text-[#97A0B3]">Calls Logged</span>
                  <PhoneCall className="w-3.5 h-3.5 text-blue-400" />
                </div>
                <p className="text-lg font-black text-white">{channelMetrics.totalCalls}</p>
                <div className="w-full bg-[#161F2D] h-1.5 rounded-full overflow-hidden mt-1">
                  <div
                    className="bg-blue-500 h-full rounded-full"
                    style={{
                      width: `${Math.min(100, Math.round((channelMetrics.totalCalls / Math.max(1, channelMetrics.totalTouchpoints)) * 100))}%`,
                    }}
                  />
                </div>
                <span className="text-[9px] text-blue-400 font-semibold block pt-0.5">Direct outreach</span>
              </div>

              <div className="p-3.5 rounded-xl bg-[#0B111C] border border-[#2A3446] space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] uppercase font-bold text-[#97A0B3]">WhatsApp</span>
                  <MessageSquare className="w-3.5 h-3.5 text-emerald-400" />
                </div>
                <p className="text-lg font-black text-white">{channelMetrics.whatsappActivities}</p>
                <div className="w-full bg-[#161F2D] h-1.5 rounded-full overflow-hidden mt-1">
                  <div
                    className="bg-emerald-500 h-full rounded-full"
                    style={{
                      width: `${Math.min(100, Math.round((channelMetrics.whatsappActivities / Math.max(1, channelMetrics.totalTouchpoints)) * 100))}%`,
                    }}
                  />
                </div>
                <span className="text-[9px] text-emerald-400 font-semibold block pt-0.5">Quick responses</span>
              </div>

              <div className="p-3.5 rounded-xl bg-[#0B111C] border border-[#2A3446] space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] uppercase font-bold text-[#97A0B3]">Meetings Held</span>
                  <Calendar className="w-3.5 h-3.5 text-purple-400" />
                </div>
                <p className="text-lg font-black text-white">{channelMetrics.totalMeetings}</p>
                <div className="w-full bg-[#161F2D] h-1.5 rounded-full overflow-hidden mt-1">
                  <div
                    className="bg-purple-500 h-full rounded-full"
                    style={{
                      width: `${Math.min(100, Math.round((channelMetrics.totalMeetings / Math.max(1, channelMetrics.totalTouchpoints)) * 100))}%`,
                    }}
                  />
                </div>
                <span className="text-[9px] text-purple-400 font-semibold block pt-0.5">Client pitches</span>
              </div>

              <div className="p-3.5 rounded-xl bg-[#0B111C] border border-[#2A3446] space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] uppercase font-bold text-[#97A0B3]">Proposals Sent</span>
                  <FileText className="w-3.5 h-3.5 text-amber-400" />
                </div>
                <p className="text-lg font-black text-white">{channelMetrics.totalProposals}</p>
                <div className="w-full bg-[#161F2D] h-1.5 rounded-full overflow-hidden mt-1">
                  <div
                    className="bg-amber-500 h-full rounded-full"
                    style={{
                      width: `${Math.min(100, Math.round((channelMetrics.totalProposals / Math.max(1, channelMetrics.totalTouchpoints)) * 100))}%`,
                    }}
                  />
                </div>
                <span className="text-[9px] text-amber-400 font-semibold block pt-0.5">Deal agreements</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column (1 Col): Real-Time Outreach & Touchpoints Stream */}
        <div className="space-y-4">
          <div className="p-5 rounded-2xl bg-[#161F2D] border border-[#2A3446] shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-sm font-bold text-white flex items-center gap-2">
                  <Clock className="w-4 h-4 text-emerald-400" />
                  Live Outreach Stream
                </h2>
                <p className="text-[11px] text-[#97A0B3] mt-0.5">
                  Latest calls, meetings, WhatsApp notes, and proposals.
                </p>
              </div>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                Live
              </span>
            </div>

            {recentActivities.length === 0 ? (
              <div className="text-center py-8 text-xs text-[#97A0B3]">
                No outreach activities logged yet.
              </div>
            ) : (
              <div className="space-y-3 max-h-[480px] overflow-y-auto pr-1">
                {recentActivities.slice(0, 15).map((act) => (
                  <div
                    key={act.id}
                    className="p-3 rounded-xl bg-[#0B111C] border border-[#2A3446] hover:border-[#7FA0D6]/30 transition-all text-xs space-y-1.5"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <div className="p-1 rounded-md bg-[#161F2D] border border-[#2A3446]">
                          {getActivityIcon(act.activity_type)}
                        </div>
                        <span className="font-bold text-white uppercase text-[10px] tracking-wide">
                          {act.activity_type}
                        </span>
                      </div>
                      <span className="text-[10px] text-[#97A0B3]">
                        {act.created_at ? new Date(act.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ""}
                      </span>
                    </div>

                    <p className="text-[#BCCCE6] text-[11px] leading-relaxed">
                      <span className="font-semibold text-white">{act.bde_name}</span> reached out to{" "}
                      <span className="font-semibold text-[#7FA0D6]">{act.lead_name}</span> ({act.company_name})
                    </p>

                    <div className="p-2 rounded-lg bg-[#161F2D]/70 border border-[#2A3446]/60 text-[11px] text-[#97A0B3]">
                      <p className="italic">"{act.summary}"</p>
                      {act.outcome && (
                        <p className="mt-1 text-[10px] font-semibold text-emerald-400">
                          Outcome: {act.outcome}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Client & Prospect Directory (Full Oversight Table) ── */}
      <div className="p-5 rounded-2xl bg-[#161F2D] border border-[#2A3446] shadow-sm space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <Building2 className="w-4 h-4 text-[#7FA0D6]" />
              Prospect Outreach Directory
            </h2>
            <p className="text-xs text-[#97A0B3] mt-0.5">
              Inspect all client leads reached by BDEs, deal values, current stage, and touchpoints count.
            </p>
          </div>

          {/* Filters Bar */}
          <div className="flex flex-wrap items-center gap-2.5">
            {/* Search */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-[#97A0B3]" />
              <input
                type="text"
                placeholder="Search company or lead..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8 pr-3 py-1.5 rounded-xl bg-[#0B111C] border border-[#2A3446] text-xs text-white placeholder-[#97A0B3] focus:outline-none focus:border-[#7FA0D6]"
              />
            </div>

            {/* Rep Filter */}
            <select
              value={selectedRep}
              onChange={(e) => setSelectedRep(e.target.value)}
              className="px-3 py-1.5 rounded-xl bg-[#0B111C] border border-[#2A3446] text-xs text-[#BCCCE6] focus:outline-none focus:border-[#7FA0D6]"
            >
              <option value="all">All BDE Agents</option>
              {reps.map((r) => (
                <option key={r.bde_id} value={r.bde_id}>
                  {r.name}
                </option>
              ))}
            </select>

            {/* Stage Filter */}
            <select
              value={selectedStage}
              onChange={(e) => setSelectedStage(e.target.value)}
              className="px-3 py-1.5 rounded-xl bg-[#0B111C] border border-[#2A3446] text-xs text-[#BCCCE6] focus:outline-none focus:border-[#7FA0D6]"
            >
              <option value="all">All Stages</option>
              <option value="new">New Lead</option>
              <option value="contacted">Contacted</option>
              <option value="meeting_scheduled">Meeting Scheduled</option>
              <option value="proposal_sent">Proposal Sent</option>
              <option value="negotiation">Negotiation</option>
              <option value="converted">Won / Converted</option>
              <option value="lost">Lost</option>
            </select>

            {/* Priority Filter */}
            <select
              value={selectedPriority}
              onChange={(e) => setSelectedPriority(e.target.value)}
              className="px-3 py-1.5 rounded-xl bg-[#0B111C] border border-[#2A3446] text-xs text-[#BCCCE6] focus:outline-none focus:border-[#7FA0D6]"
            >
              <option value="all">All Priorities</option>
              <option value="hot">Hot</option>
              <option value="warm">Warm</option>
              <option value="cold">Cold</option>
            </select>
          </div>
        </div>

        {/* Directory Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-[#2A3446] text-[#97A0B3] text-[11px] uppercase tracking-wider font-semibold">
                <th className="pb-3 pl-2">Prospect & Company</th>
                <th className="pb-3">Assigned BDE</th>
                <th className="pb-3 text-center">Priority</th>
                <th className="pb-3 text-center">Stage</th>
                <th className="pb-3 text-right">Estimated Value</th>
                <th className="pb-3 text-center">Touchpoints</th>
                <th className="pb-3 text-right pr-2">Last Contacted</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#2A3446]/60">
              {filteredLeads.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-[#97A0B3]">
                    No prospects matching filters found.
                  </td>
                </tr>
              ) : (
                filteredLeads.map((lead) => (
                  <tr
                    key={lead.id}
                    onClick={() => setSelectedLeadModal(lead)}
                    className="hover:bg-[#0B111C]/60 transition-colors cursor-pointer group"
                  >
                    <td className="py-3.5 pl-2">
                      <div className="font-bold text-white group-hover:text-[#7FA0D6] transition-colors">
                        {lead.company_name}
                      </div>
                      <div className="text-[11px] text-[#97A0B3] mt-0.5">
                        {lead.name} {lead.phone ? `• ${lead.phone}` : ""}
                      </div>
                    </td>
                    <td className="py-3.5 text-xs text-[#BCCCE6]">
                      <span className="font-medium text-white">{lead.assigned_bde_name || "Unassigned"}</span>
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
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#0B111C] border border-[#2A3446] text-[#7FA0D6]">
                        {lead.activities_count} logged
                      </span>
                    </td>
                    <td className="py-3.5 text-right pr-2 text-[11px] text-[#97A0B3]">
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
          <div className="w-full max-w-lg rounded-2xl bg-[#161F2D] border border-[#2A3446] p-6 shadow-2xl space-y-4">
            <div className="flex items-start justify-between border-b border-[#2A3446] pb-3">
              <div>
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  {selectedLeadModal.company_name}
                  {getPriorityBadge(selectedLeadModal.priority)}
                </h3>
                <p className="text-xs text-[#97A0B3] mt-0.5">
                  Contact: {selectedLeadModal.name} {selectedLeadModal.email ? `• ${selectedLeadModal.email}` : ""}
                </p>
              </div>
              <button
                onClick={() => setSelectedLeadModal(null)}
                className="text-[#97A0B3] hover:text-white text-xs font-bold px-2 py-1 rounded-lg bg-[#0B111C] border border-[#2A3446]"
              >
                ✕ Close
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="p-3 rounded-xl bg-[#0B111C] border border-[#2A3446]">
                <span className="text-[#97A0B3]">Assigned BDE:</span>
                <p className="font-bold text-white mt-1">{selectedLeadModal.assigned_bde_name || "Unassigned"}</p>
              </div>
              <div className="p-3 rounded-xl bg-[#0B111C] border border-[#2A3446]">
                <span className="text-[#97A0B3]">Current Stage:</span>
                <div className="mt-1">{getStageBadge(selectedLeadModal.status)}</div>
              </div>
              <div className="p-3 rounded-xl bg-[#0B111C] border border-[#2A3446]">
                <span className="text-[#97A0B3]">Estimated Deal Value:</span>
                <p className="font-bold text-amber-400 mt-1">{formatINR(selectedLeadModal.estimated_deal_value)}</p>
              </div>
              <div className="p-3 rounded-xl bg-[#0B111C] border border-[#2A3446]">
                <span className="text-[#97A0B3]">Lead Source:</span>
                <p className="font-bold text-white mt-1">{selectedLeadModal.lead_source || "Inbound"}</p>
              </div>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                onClick={() => setSelectedLeadModal(null)}
                className="px-4 py-2 rounded-xl bg-[#7FA0D6] text-white font-bold text-xs hover:bg-[#7FA0D6]/90 transition-colors"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default AdminBDEOversightPage;
