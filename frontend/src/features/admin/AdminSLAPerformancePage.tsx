import { useNavigate } from "react-router";
import { motion } from "motion/react";
import { useQuery } from "@tanstack/react-query";
import {
  Shield,
  Sliders,
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
  Bell,
  Clock,
  ArrowRight,
} from "lucide-react";
import { AdminTopHeader } from "../../components/admin/AdminTopHeader";
import { fetchSLAPerformance, type SLAPerformanceData } from "../../lib/ops-api";

export function AdminSLAPerformancePage() {
  const navigate = useNavigate();

  const {
    data,
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery<SLAPerformanceData>({
    queryKey: ["admin_sla_performance"],
    queryFn: () => fetchSLAPerformance(),
    refetchInterval: 30_000,
  });

  // Calculate dynamic SVG coordinates for response & resolution trend curve
  const trendPoints = data?.trend || [];
  const minVal = 90.0;
  const maxVal = 100.0;

  const getY = (val: number) => {
    const clamped = Math.max(minVal, Math.min(maxVal, val));
    const normalized = (clamped - minVal) / (maxVal - minVal);
    // SVG viewBox height is 110: margin top 15, margin bottom 15 => range 15 to 95
    return Math.round(95 - normalized * 80);
  };

  const getPointsPath = (key: "response" | "resolution") => {
    if (trendPoints.length === 0) return "";
    const n = trendPoints.length;
    const coords = trendPoints.map((pt, i) => {
      const x = Math.round((i / Math.max(1, n - 1)) * 500);
      const y = getY(pt[key]);
      return { x, y };
    });

    const first = coords[0];
    if (!first) return "";
    let path = `M ${first.x} ${first.y}`;
    for (let i = 1; i < coords.length; i++) {
      const prev = coords[i - 1];
      const curr = coords[i];
      if (!prev || !curr) continue;
      const cpX = Math.round((prev.x + curr.x) / 2);
      path += ` C ${cpX} ${prev.y}, ${cpX} ${curr.y}, ${curr.x} ${curr.y}`;
    }
    return path;
  };

  const responsePath = getPointsPath("response");
  const resolutionPath = getPointsPath("resolution");
  const areaPath = responsePath ? `${responsePath} L 500 105 L 0 105 Z` : "";

  const complianceVal = data?.compliance.overall ?? 0;
  const targetVal = data?.compliance.target ?? 98.0;
  const targetLineTopPercent = Math.max(10, Math.min(85, getY(targetVal)));

  return (
    <div data-surface="ops" className="w-full min-h-screen font-sans bg-[#0B111C] flex flex-col justify-between">
      <div>
        <AdminTopHeader activeTab="Support" />

        <motion.main
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35 }}
          className="px-3.5 sm:px-6 lg:px-8 py-4 sm:py-6 pb-24 sm:pb-8 max-w-7xl w-full mx-auto space-y-4 sm:space-y-6"
        >

          {isLoading ? (
            /* Skeleton Loading State */
            <div className="space-y-4 sm:space-y-6 animate-pulse">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                <div className="h-32 bg-[#161F2D] border border-[#2A3446] rounded-2xl" />
                <div className="h-32 bg-[#161F2D] border border-[#2A3446] rounded-2xl" />
              </div>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
                <div className="h-72 bg-[#161F2D] border border-[#2A3446] rounded-2xl" />
                <div className="h-72 bg-[#161F2D] border border-[#2A3446] rounded-2xl" />
              </div>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
                <div className="h-72 bg-[#161F2D] border border-[#2A3446] rounded-2xl" />
                <div className="h-72 bg-[#161F2D] border border-[#2A3446] rounded-2xl" />
              </div>
            </div>
          ) : isError ? (
            /* Error State */
            <div className="p-8 rounded-2xl bg-rose-950/30 border border-rose-800/50 text-center space-y-3">
              <AlertTriangle className="size-8 text-rose-400 mx-auto" />
              <h3 className="text-base font-black text-white">Failed to load live SLA metrics</h3>
              <p className="text-xs text-rose-300/80 max-w-md mx-auto">
                {error instanceof Error ? error.message : "Unable to retrieve SLA records from Supabase database."}
              </p>
              <button
                type="button"
                onClick={() => void refetch()}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs cursor-pointer shadow-sm"
              >
                Retry Request
              </button>
            </div>
          ) : (
            <>
              {/* Top 2 KPI Metric Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                {/* Metric Card 1: Overall Compliance */}
                <div className="bg-[#161F2D] border border-[#2A3446]/90 rounded-2xl p-4 sm:p-5 shadow-2xs flex items-center justify-between hover-card-innovative">
                  <div className="space-y-1">
                    <span className="text-xs font-black uppercase tracking-wider text-[#97A0B3]">
                      OVERALL COMPLIANCE
                    </span>
                    <div className="flex items-baseline gap-2.5">
                      <span className="text-2xl sm:text-3xl font-black text-white">
                        {complianceVal.toFixed(1)}%
                      </span>
                      <span className="text-xs sm:text-sm font-bold text-emerald-400 flex items-center gap-1">
                        <TrendingUp className="size-4" />{" "}
                        {data?.compliance.mom_change && data.compliance.mom_change >= 0
                          ? `+${data.compliance.mom_change.toFixed(1)}% MoM`
                          : `${data?.compliance.mom_change?.toFixed(1) || "0.0"}% MoM`}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 pt-1 text-xs font-bold">
                      <span className="text-[#97A0B3]">
                        Target: <strong className="text-white">{targetVal.toFixed(1)}%</strong>
                      </span>
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-xs font-extrabold border ${
                          data?.compliance.status === "OPTIMAL"
                            ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/30"
                            : data?.compliance.status === "HEALTHY"
                            ? "bg-blue-500/15 text-[#7FA0D6] border-blue-500/30"
                            : "bg-rose-500/15 text-rose-400 border-rose-500/30"
                        }`}
                      >
                        {data?.compliance.status || "OPTIMAL"}
                      </span>
                    </div>
                  </div>

                  <div className="size-10 sm:size-12 rounded-2xl bg-[#7FA0D6]/15 border border-[#7FA0D6]/30 flex items-center justify-center text-[#7FA0D6] shrink-0">
                    <Shield className="size-5 sm:size-6" />
                  </div>
                </div>

                {/* Metric Card 2: Active SLA Watchlist */}
                <div className="bg-[#161F2D] border border-[#2A3446]/90 rounded-2xl p-4 sm:p-5 shadow-2xs flex items-center justify-between hover-card-innovative">
                  <div className="space-y-1">
                    <span className="text-xs font-black uppercase tracking-wider text-[#97A0B3]">
                      ACTIVE SLA WATCHLIST
                    </span>
                    <div className="flex items-baseline gap-2.5">
                      <span className="text-2xl sm:text-3xl font-black text-white">
                        {data?.watchlist.total_active ?? 0}
                      </span>
                      <span className="text-xs sm:text-sm font-bold text-[#F1F5F9]">Active Items</span>
                    </div>
                    <div className="flex flex-wrap items-center gap-2 pt-1 text-xs font-bold">
                      {data?.watchlist.breached ? (
                        <span className="px-2.5 py-0.5 rounded-md bg-rose-500/15 text-rose-400 text-xs font-bold border border-rose-500/30">
                          {data.watchlist.breached} Breached
                        </span>
                      ) : null}
                      <span className="px-2.5 py-0.5 rounded-md bg-amber-500/15 text-amber-300 text-xs font-bold border border-amber-500/30">
                        {data?.watchlist.approaching ?? 0} Approaching
                      </span>
                      <span className="px-2.5 py-0.5 rounded-md bg-emerald-500/15 text-emerald-400 text-xs font-bold border border-emerald-500/30">
                        • {data?.watchlist.resolved_on_time ?? 0} Resolved
                      </span>
                    </div>
                  </div>

                  <div className={`size-10 sm:size-12 rounded-2xl border flex items-center justify-center shrink-0 ${
                    data?.watchlist.breached
                      ? "bg-rose-500/15 border-rose-500/30 text-rose-400"
                      : "bg-[#7FA0D6]/15 border-[#7FA0D6]/30 text-[#7FA0D6]"
                  }`}>
                    <Bell className="size-5 sm:size-6" />
                  </div>
                </div>
              </div>

              {/* Row 1: Chart & Compliance by Priority (Equal 50/50 Split) */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
                {/* Chart Card */}
                <div className="bg-[#161F2D] border border-[#2A3446]/90 rounded-2xl p-4 sm:p-6 shadow-xs flex flex-col justify-between hover-card-innovative">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#2A3446] pb-4">
                    <div>
                      <h3 className="text-base font-black text-white">Response & Resolution Trend</h3>
                      <p className="text-xs sm:text-sm text-[#97A0B3] font-medium mt-0.5">
                        {data?.compliance.trajectory_label || "Daily compliance velocity trajectory"}
                      </p>
                    </div>
                    <div className="flex items-center gap-4 text-xs sm:text-sm font-bold">
                      <span className="flex items-center gap-1.5 text-[#7FA0D6]">
                        <span className="size-2.5 rounded-full bg-blue-500" />
                        Response ({data?.compliance.response_rate.toFixed(1)}%)
                      </span>
                      <span className="flex items-center gap-1.5 text-indigo-400">
                        <span className="size-2.5 rounded-full bg-indigo-500" />
                        Resolution ({data?.compliance.resolution_rate.toFixed(1)}%)
                      </span>
                    </div>
                  </div>

                  {/* SVG Trend Graph Representation */}
                  <div className="h-64 w-full relative flex flex-col justify-between pt-2 pb-1">
                    {/* Target Line */}
                    <div
                      className="absolute left-0 right-0 border-b border-dashed border-rose-500/60 z-10 flex justify-end pr-2"
                      style={{ top: `${targetLineTopPercent}%` }}
                    >
                      <span className="text-xs font-bold text-rose-400 bg-rose-950/90 border border-rose-800/80 px-2.5 py-0.5 rounded-full shadow-xs -mt-3">
                        Min Target {targetVal.toFixed(1)}%
                      </span>
                    </div>

                    <div className="flex-1 w-full relative min-h-0 py-2">
                      <svg className="w-full h-full" viewBox="0 0 500 110" preserveAspectRatio="none">
                        <defs>
                          <linearGradient id="blueGrad" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#7FA0D6" stopOpacity="0.35" />
                            <stop offset="100%" stopColor="#7FA0D6" stopOpacity="0.02" />
                          </linearGradient>
                          <linearGradient id="indigoGrad" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#818CF8" stopOpacity="0.25" />
                            <stop offset="100%" stopColor="#818CF8" stopOpacity="0.0" />
                          </linearGradient>
                        </defs>
                        {/* Area Fill */}
                        {areaPath && <path d={areaPath} fill="url(#blueGrad)" />}
                        {/* Response Line */}
                        {responsePath && (
                          <path
                            d={responsePath}
                            fill="none"
                            stroke="#7FA0D6"
                            strokeWidth="3.5"
                            strokeLinecap="round"
                          />
                        )}
                        {/* Resolution Line */}
                        {resolutionPath && (
                          <path
                            d={resolutionPath}
                            fill="none"
                            stroke="#818CF8"
                            strokeWidth="2.5"
                            strokeDasharray="5 3"
                            strokeLinecap="round"
                          />
                        )}
                      </svg>
                    </div>

                    {/* X Axis Labels */}
                    <div className="flex justify-between text-xs sm:text-sm font-bold text-[#97A0B3] pt-2 border-t border-[#2A3446]">
                      {trendPoints.map((pt, i) => (
                        <span
                          key={pt.date}
                          className={i === trendPoints.length - 1 ? "font-extrabold text-[#7FA0D6]" : ""}
                        >
                          {pt.date}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Compliance by Priority Card */}
                <div className="bg-[#161F2D] border border-[#2A3446]/90 rounded-2xl p-4 sm:p-6 shadow-xs flex flex-col justify-between hover-card-innovative">
                  <div className="space-y-4 sm:space-y-5">
                    <div className="flex items-center justify-between border-b border-[#2A3446] pb-3">
                      <div>
                        <h3 className="text-base font-black text-white">Compliance by Priority</h3>
                        <p className="text-xs sm:text-sm text-[#97A0B3] font-medium mt-0.5">
                          Strict contract adherence by urgency level
                        </p>
                      </div>
                      <Sliders className="size-4.5 text-[#7FA0D6]" />
                    </div>

                    {/* Progress Bars Stack */}
                    <div className="space-y-3.5">
                      {data?.priority_breakdown?.map((item) => {
                        const colorClass =
                          item.color === "rose"
                            ? "bg-rose-500"
                            : item.color === "blue"
                            ? "bg-blue-500"
                            : item.color === "cyan"
                            ? "bg-cyan-400"
                            : "bg-emerald-400";

                        return (
                          <div key={item.label} className="space-y-1.5">
                            <div className="flex justify-between text-xs sm:text-sm font-bold">
                              <span className="flex items-center gap-1.5 text-white">
                                <span className={`size-2.5 rounded-full ${colorClass}`} />
                                {item.label}
                              </span>
                              <span className="text-white">
                                {item.sla_met.toFixed(1)}%{" "}
                                <span className="text-[#97A0B3] font-normal">
                                  ({item.compliant_count}/{item.total_count} Compliant)
                                </span>
                              </span>
                            </div>
                            <div className="h-2.5 w-full rounded-full bg-[#0B111C] overflow-hidden border border-[#2A3446]">
                              <div
                                className={`h-full ${colorClass} rounded-full transition-all duration-500`}
                                style={{ width: `${Math.max(0, Math.min(100, item.sla_met))}%` }}
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  <div className="pt-3 border-t border-[#2A3446]/80 flex items-center justify-between text-[11px] text-[#97A0B3] mt-3">
                    <span>Priority SLA Policy: 24h Rush / 48h Standard</span>
                    <span className="text-emerald-400 font-semibold">Contract Enforced</span>
                  </div>
                </div>
              </div>

              {/* Row 2: Pod Efficiency Leaderboard & Active Breach Warnings (Equal 50/50 Split & Equal Height) */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
                {/* Leaderboard Card */}
                <div className="bg-[#161F2D] border border-[#2A3446]/90 rounded-2xl p-4 sm:p-6 shadow-xs flex flex-col justify-between hover-card-innovative">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between border-b border-[#2A3446] pb-3">
                      <div>
                        <h3 className="text-sm font-bold text-white">Pod Efficiency Leaderboard</h3>
                        <p className="text-xs text-[#97A0B3]">Operational velocity across dedicated creative pods</p>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-[11px] font-extrabold uppercase tracking-wider text-[#97A0B3]">
                          {data?.pods?.length || 0} ACTIVE PODS
                        </span>
                        <button
                          type="button"
                          onClick={() => navigate("/admin/teams")}
                          className="text-xs font-bold text-[#7FA0D6] hover:text-white flex items-center gap-1 cursor-pointer"
                        >
                          Manage Teams <ArrowRight className="size-3" />
                        </button>
                      </div>
                    </div>

                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-[#0B111C] border-b border-[#2A3446] text-[11px] font-extrabold uppercase tracking-wider text-[#97A0B3]">
                          <tr>
                            <th className="px-3.5 py-2.5">POD / LEAD</th>
                            <th className="px-3.5 py-2.5">SLA MET</th>
                            <th className="px-3.5 py-2.5">AVG RESPONSE</th>
                            <th className="px-3.5 py-2.5">TASKS</th>
                            <th className="px-3.5 py-2.5 text-right">STATUS</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-[#2A3446] font-medium">
                          {!data?.pods || data.pods.length === 0 ? (
                            <tr>
                              <td colSpan={5} className="px-4 py-8 text-center text-[#97A0B3]">
                                No active creative pods currently configured in database.
                              </td>
                            </tr>
                          ) : (
                            data.pods.map((item) => (
                              <tr
                                key={item.pod}
                                onClick={() => navigate("/admin/teams")}
                                className="hover:bg-[#0B111C] transition-colors cursor-pointer"
                              >
                                <td className="px-3.5 py-3">
                                  <div className="flex items-center gap-2.5">
                                    <div
                                      className={`size-7 rounded-lg ${item.bg} ${item.text} font-black text-xs flex items-center justify-center shrink-0`}
                                    >
                                      {item.pod.replace("Pod ", "")}
                                    </div>
                                    <div className="min-w-0">
                                      <div className="font-bold text-white truncate">{item.pod}</div>
                                      <div className="text-[10px] text-[#97A0B3] truncate">{item.lead}</div>
                                    </div>
                                  </div>
                                </td>
                                <td className="px-3.5 py-3 font-bold text-white">{item.sla_met}</td>
                                <td className="px-3.5 py-3 text-[#F1F5F9] font-mono">{item.avg_response}</td>
                                <td className="px-3.5 py-3 text-[#F1F5F9]">
                                  {item.total_tasks} total
                                </td>
                                <td className="px-3.5 py-3 text-right">
                                  <span
                                    className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold border ${item.status_bg}`}
                                  >
                                    • {item.status}
                                  </span>
                                </td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  <div className="pt-3 border-t border-[#2A3446]/80 flex items-center justify-between text-[11px] text-[#97A0B3] mt-3">
                    <span className="flex items-center gap-1.5 font-medium">
                      <span className="size-2 rounded-full bg-emerald-400" />
                      Target threshold: <strong className="text-white">98.0% SLA</strong>
                    </span>
                    <span className="font-semibold text-emerald-400/90">
                      All pods active & responsive
                    </span>
                  </div>
                </div>

                {/* Active Breach Warnings Card */}
                <div className="bg-[#161F2D] border border-[#2A3446]/90 rounded-2xl p-4 sm:p-6 shadow-xs flex flex-col justify-between hover-card-innovative">
                  <div className="space-y-4 flex-1 flex flex-col">
                    <div className="flex items-center justify-between border-b border-[#2A3446] pb-3 shrink-0">
                      <div className="flex items-center gap-2">
                        <h3 className="text-sm font-bold text-white">Active Breach Warnings</h3>
                        {data?.active_warnings && data.active_warnings.length > 0 && (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/30">
                            {data.active_warnings.length}
                          </span>
                        )}
                      </div>
                      <span className="text-[11px] font-bold text-[#7FA0D6] bg-[#7FA0D6]/15 px-2.5 py-0.5 rounded-full border border-[#7FA0D6]/30">
                        Live Dispatch
                      </span>
                    </div>

                    <div className="space-y-2.5 overflow-y-auto pr-1 flex-1 max-h-[225px]">
                      {!data?.active_warnings || data.active_warnings.length === 0 ? (
                        <div className="p-6 rounded-xl bg-emerald-950/20 border border-emerald-800/40 text-center space-y-2">
                          <CheckCircle2 className="size-6 text-emerald-400 mx-auto" />
                          <h4 className="text-xs font-bold text-white">All Deliverables in Compliance</h4>
                          <p className="text-[11px] text-[#97A0B3]">
                            Zero active SLA breaches or imminent deadline risks detected across all client pods.
                          </p>
                        </div>
                      ) : (
                        data.active_warnings.map((warning) => {
                          const isBreach = warning.is_breached;
                          const containerClass = isBreach
                            ? "bg-rose-950/40 border-rose-800/50 text-rose-200"
                            : "bg-amber-950/40 border-amber-800/50 text-amber-200";

                          const badgeClass = isBreach
                            ? "bg-rose-500/20 text-rose-300 border-rose-500/30"
                            : "bg-amber-500/20 text-amber-300 border-amber-500/30";

                          const iconColor = isBreach ? "text-rose-400" : "text-amber-400";
                          const textColor = isBreach ? "text-rose-400" : "text-amber-400";

                          return (
                            <div
                              key={warning.id}
                              className={`p-3 rounded-xl border backdrop-blur-md space-y-1.5 ${containerClass}`}
                            >
                              <div className="flex items-center justify-between">
                                <span className="text-xs font-bold flex items-center gap-1.5">
                                  <AlertTriangle className={`size-3.5 ${iconColor}`} />
                                  {isBreach ? "SLA Overdue Breach" : "Approaching Deadline"}
                                </span>
                                <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase border ${badgeClass}`}>
                                  {warning.severity}
                                </span>
                              </div>

                              <p className="text-[11px] opacity-90 truncate">
                                <strong className="font-mono text-white">{warning.title}</strong> •{" "}
                                {warning.client_name} • {warning.pod_name} ({warning.assignee_name})
                              </p>

                              <div className="flex items-center justify-between pt-1">
                                <span className={`text-xs font-bold flex items-center gap-1 ${textColor}`}>
                                  <Clock className="size-3.5" /> {warning.time_remaining}
                                </span>
                                <button
                                  type="button"
                                  onClick={() => navigate("/admin/tasks")}
                                  className={`px-3 py-1 rounded-lg text-white font-bold text-[11px] shadow-2xs transition-colors cursor-pointer ${
                                    isBreach
                                      ? "bg-rose-600/90 hover:bg-rose-600"
                                      : "bg-amber-600/90 hover:bg-amber-600"
                                  }`}
                                >
                                  Intervene
                                </button>
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>

                  <div className="pt-3 border-t border-[#2A3446]/80 flex items-center justify-between text-[11px] text-[#97A0B3] mt-3">
                    <span>
                      {data?.active_warnings?.length ? `${data.active_warnings.length} active alerts queued` : "Zero active alerts"}
                    </span>
                    <span className="text-[#7FA0D6] font-medium">
                      Auto-monitored 24/7
                    </span>
                  </div>
                </div>
              </div>
            </>
          )}
        </motion.main>
      </div>
    </div>
  );
}

