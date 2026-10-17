import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Clock,
  CheckCircle2,
  AlertTriangle,
  Award,
  Layers,
  Filter,
  RefreshCw,
  Search,
  Scale,
  Zap,
  Sparkles,
} from "lucide-react";
import { fetchProductivityMetrics } from "../../lib/productivity-api";
import { AdminTopHeader } from "../../components/admin/AdminTopHeader";

export function AdminProductivityDashboardPage() {
  const [period, setPeriod] = useState<string>("monthly");
  const [department, setDepartment] = useState<string>("all");
  const [taskType, setTaskType] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");

  const { data, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ["admin-productivity", period, department, taskType],
    queryFn: () => fetchProductivityMetrics({ period, department, task_type: taskType }),
  });

  const summary = data?.summary;
  const specialists = (data?.specialists || []).filter((s) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    const name = (s?.name || "").toLowerCase();
    const email = (s?.email || "").toLowerCase();
    const role = (s?.role || "").toLowerCase();
    const specialty = (s?.specialty || "").toLowerCase();
    return name.includes(q) || email.includes(q) || role.includes(q) || specialty.includes(q);
  });
  const comparisons = data?.comparisons || [];
  const imbalance = data?.workload_imbalance;
  const overloadedList = (imbalance?.overloaded || (imbalance as any)?.overloaded_members || []) as any[];
  const underutilizedList = (imbalance?.underutilized || (imbalance as any)?.underutilized_members || []) as any[];
  const hasImbalance = overloadedList.length > 0 || underutilizedList.length > 0;

  return (
    <div data-surface="ops" className="w-full min-h-screen font-sans bg-[#0B111C] flex flex-col">
      <AdminTopHeader activeTab="Team Productivity & Efficiency" hideTitle />
      <main className="flex-1 px-3.5 sm:px-6 lg:px-8 py-4 sm:py-6 max-w-[1500px] w-full mx-auto space-y-4 sm:space-y-6 animate-in fade-in duration-300">
        {/* Top Controls: Scope & Refresh */}
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-bold text-[#97A0B3] uppercase tracking-wider hidden sm:inline">Scope:</span>
            {/* Period Selector */}
            <div className="bg-[#161F2D] border border-[#2A3446] rounded-xl p-1 flex items-center gap-1">
              {(["daily", "weekly", "monthly", "all"] as const).map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setPeriod(p)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold capitalize transition-all cursor-pointer ${
                    period === p
                      ? "bg-[#7FA0D6] text-[#0B111C] shadow-sm font-bold"
                      : "text-[#97A0B3] hover:text-white"
                  }`}
                >
                  {p === "all" ? "All Time" : p}
                </button>
              ))}
            </div>
          </div>

          <button
            type="button"
            onClick={() => refetch()}
            disabled={isLoading || isRefetching}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#161F2D] border border-[#2A3446] hover:border-[#7FA0D6]/40 text-xs font-bold text-[#BCCCE6] hover:bg-[#1E293B] hover:text-white transition-colors cursor-pointer ml-auto"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefetching ? "animate-spin text-[#7FA0D6]" : ""}`} />
            <span>{isRefetching ? "Refreshing..." : "Refresh Metrics"}</span>
          </button>
        </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Tasks Completed */}
        <div className="bg-[#161F2D] border border-[#2A3446] rounded-2xl p-4 relative overflow-hidden group hover:border-[#7FA0D6]/40 transition-all shadow-lg">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold uppercase tracking-wider text-[#97A0B3]">Tasks Completed</span>
            <div className="w-8 h-8 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-extrabold text-white font-mono">
              {summary ? summary.tasks_completed : "--"}
            </span>
            <span className="text-xs text-[#97A0B3]">
              of {summary ? summary.total_assigned : "--"} assigned
            </span>
          </div>
          <div className="mt-3 flex items-center gap-1.5 text-[11px] text-[#97A0B3]">
            <span className="text-emerald-400 font-semibold">
              {summary && summary.total_assigned > 0
                ? Math.round((summary.tasks_completed / summary.total_assigned) * 100)
                : 100}
              %
            </span>{" "}
            total throughput
          </div>
        </div>

        {/* Avg Turnaround Time */}
        <div className="bg-[#161F2D] border border-[#2A3446] rounded-2xl p-4 relative overflow-hidden group hover:border-[#7FA0D6]/40 transition-all shadow-lg">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold uppercase tracking-wider text-[#97A0B3]">Turnaround Speed</span>
            <div className="w-8 h-8 rounded-xl bg-[#7FA0D6]/15 border border-[#7FA0D6]/30 flex items-center justify-center text-[#7FA0D6]">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-extrabold text-white font-mono">
              {summary ? `${summary.avg_turnaround_hours}h` : "--"}
            </span>
            <span className="text-xs text-emerald-400 font-semibold">Target &le; 24h</span>
          </div>
          <div className="mt-3 flex items-center gap-1.5 text-[11px] text-[#97A0B3]">
            <Zap className="w-3.5 h-3.5 text-amber-400" />
            <span>Average creation-to-delivery speed</span>
          </div>
        </div>

        {/* On-Time Delivery Rate */}
        <div className="bg-[#161F2D] border border-[#2A3446] rounded-2xl p-4 relative overflow-hidden group hover:border-[#7FA0D6]/40 transition-all shadow-lg">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold uppercase tracking-wider text-[#97A0B3]">On-Time Delivery</span>
            <div className="w-8 h-8 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
              <Award className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-extrabold text-white font-mono">
              {summary ? `${summary.on_time_completion_pct}%` : "--"}
            </span>
            <span className="text-xs text-indigo-400 font-medium">SLA compliance</span>
          </div>
          <div className="mt-3 flex items-center gap-1.5 text-[11px] text-[#97A0B3]">
            <span>Delivered before or strictly on schedule</span>
          </div>
        </div>

        {/* Revision & Rework Rate */}
        <div className="bg-[#161F2D] border border-[#2A3446] rounded-2xl p-4 relative overflow-hidden group hover:border-[#7FA0D6]/40 transition-all shadow-lg">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold uppercase tracking-wider text-[#97A0B3]">Rework & Revisions</span>
            <div className="w-8 h-8 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
              <AlertTriangle className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-extrabold text-white font-mono">
              {summary ? `${summary.revision_rate_pct}%` : "--"}
            </span>
            <span className="text-xs text-[#97A0B3]">resubmission frequency</span>
          </div>
          <div className="mt-3 flex items-center gap-1.5 text-[11px] text-[#97A0B3]">
            <span>{summary ? summary.tasks_pending : 0} tasks in active review</span>
          </div>
        </div>
      </div>

      {/* Workload Imbalance & Capacity Alert */}
      {hasImbalance && (
        <div className="bg-[#161F2D]/90 border border-amber-500/30 rounded-2xl p-4 sm:p-5 shadow-xl relative overflow-hidden">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-3">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400">
                <Scale className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white">Workload Distribution & Imbalance Warning</h3>
                <p className="text-xs text-[#97A0B3]">
                  Identified specialists nearing burnout alongside team members with open capacity.
                </p>
              </div>
            </div>
            <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-500/15 text-amber-300 border border-amber-500/30">
              Actionable Optimization
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-3">
            {/* Overloaded */}
            <div className="bg-[#0B111C] border border-[#2A3446] rounded-xl p-3.5 space-y-2">
              <span className="text-xs font-bold text-rose-400 uppercase tracking-wider flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
                Overloaded Specialists (&ge; 85% Capacity)
              </span>
              {overloadedList.length === 0 ? (
                <p className="text-xs text-[#97A0B3]">No specialists currently at capacity risk.</p>
              ) : (
                <div className="space-y-2">
                  {overloadedList.map((spec) => (
                    <div key={spec.id} className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-white">{spec.name}</span>
                      <span className="px-2 py-0.5 rounded text-[11px] font-mono font-bold bg-rose-500/15 text-rose-300 border border-rose-500/30">
                        {spec.allocated_workload_pct ?? spec.load_pct ?? 85}% load ({spec.tasks_pending ?? 0} WIP)
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Available */}
            <div className="bg-[#0B111C] border border-[#2A3446] rounded-xl p-3.5 space-y-2">
              <span className="text-xs font-bold text-emerald-400 uppercase tracking-wider flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500" />
                Available Capacity for Reallocation (&le; 50% Load)
              </span>
              {underutilizedList.length === 0 ? (
                <p className="text-xs text-[#97A0B3]">All specialists have balanced assignments.</p>
              ) : (
                <div className="space-y-2">
                  {underutilizedList.map((spec) => (
                    <div key={spec.id} className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-white">{spec.name}</span>
                      <span className="px-2 py-0.5 rounded text-[11px] font-mono font-bold bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                        {spec.allocated_workload_pct ?? spec.load_pct ?? 30}% load ({spec.tasks_pending ?? 0} WIP)
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Comparative Benchmarking Section */}
      {comparisons.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-[#7FA0D6]" />
              <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                Comparative Craft Benchmarks
              </h3>
            </div>
            <span className="text-xs text-[#97A0B3]">Side-by-side performance in similar creative scopes</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {comparisons.map((c, i) => (
              <div
                key={i}
                className="bg-[#161F2D] border border-[#2A3446] rounded-2xl p-4 space-y-3 hover:border-[#7FA0D6]/40 transition-colors shadow-md"
              >
                <div className="flex items-center justify-between border-b border-[#2A3446] pb-2.5">
                  <span className="text-xs font-bold text-[#BCCCE6]">{c.category}</span>
                  <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-[#7FA0D6]/15 text-[#7FA0D6] border border-[#7FA0D6]/30">
                    +{c.delta_efficiency_pct}% volume delta
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-3 pt-1">
                  {/* Leader */}
                  <div className="bg-[#0B111C] border border-[#2A3446] rounded-xl p-3 space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-white truncate">{c.leader}</span>
                      <span className="text-[10px] uppercase font-bold text-amber-400">Top Pace</span>
                    </div>
                    <div className="text-lg font-mono font-bold text-white">
                      {c.leader_completed} <span className="text-xs font-normal text-[#97A0B3]">done</span>
                    </div>
                    <p className="text-[11px] text-[#97A0B3]">
                      Avg speed: <span className="text-white font-mono">{c.leader_turnaround}h</span>
                    </p>
                  </div>

                  {/* Runner Up */}
                  <div className="bg-[#0B111C] border border-[#2A3446] rounded-xl p-3 space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-white truncate">{c.runner_up}</span>
                      <span className="text-[10px] uppercase font-bold text-[#97A0B3]">Peer</span>
                    </div>
                    <div className="text-lg font-mono font-bold text-white">
                      {c.runner_up_completed} <span className="text-xs font-normal text-[#97A0B3]">done</span>
                    </div>
                    <p className="text-[11px] text-[#97A0B3]">
                      Avg speed: <span className="text-white font-mono">{c.runner_up_turnaround}h</span>
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Specialist Performance Table Section */}
      <div className="bg-[#161F2D] border border-[#2A3446] rounded-2xl shadow-xl overflow-hidden">
        {/* Filter & Search Bar */}
        <div className="p-4 sm:p-5 border-b border-[#2A3446] flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-[#97A0B3] absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Filter by specialist name, craft, or role..."
              className="w-full bg-[#0B111C] border border-[#2A3446] rounded-xl pl-10 pr-4 py-2 text-xs text-white placeholder:text-[#97A0B3] focus:outline-none focus:border-[#7FA0D6] transition-colors"
            />
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* Department Filter */}
            <div className="flex items-center gap-1.5 text-xs text-[#97A0B3]">
              <Filter className="w-3.5 h-3.5" />
              <span>Dept:</span>
              <select
                value={department}
                onChange={(e) => setDepartment(e.target.value)}
                className="bg-[#0B111C] border border-[#2A3446] rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-[#7FA0D6] cursor-pointer"
              >
                <option value="all">All Departments</option>
                <option value="video">Video & Motion</option>
                <option value="design">Graphic Design</option>
                <option value="creative">Creative General</option>
              </select>
            </div>

            {/* Task Type Filter */}
            <div className="flex items-center gap-1.5 text-xs text-[#97A0B3]">
              <Layers className="w-3.5 h-3.5" />
              <span>Asset:</span>
              <select
                value={taskType}
                onChange={(e) => setTaskType(e.target.value)}
                className="bg-[#0B111C] border border-[#2A3446] rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-[#7FA0D6] cursor-pointer"
              >
                <option value="all">All Deliverable Types</option>
                <option value="reel">Reels / Shorts</option>
                <option value="static_post">Static Posts</option>
                <option value="carousel">Carousels</option>
                <option value="story">Stories</option>
              </select>
            </div>
          </div>
        </div>

        {/* Table Content */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#0B111C] border-b border-[#2A3446] text-[#97A0B3] uppercase text-[10px] tracking-wider font-bold">
              <tr>
                <th className="py-3.5 px-4">Specialist & Craft</th>
                <th className="py-3.5 px-3 text-center">Assigned</th>
                <th className="py-3.5 px-3 text-center">Completed</th>
                <th className="py-3.5 px-3 text-center">WIP Pending</th>
                <th className="py-3.5 px-3 text-center">Overdue</th>
                <th className="py-3.5 px-3 text-center">Avg Turnaround</th>
                <th className="py-3.5 px-3 text-center">On-Time %</th>
                <th className="py-3.5 px-3 text-center">Revision Rate</th>
                <th className="py-3.5 px-4 text-center">Workload & Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#2A3446]/60">
              {isLoading ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-[#97A0B3]">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <RefreshCw className="w-5 h-5 animate-spin text-[#7FA0D6]" />
                      <span>Loading team productivity data...</span>
                    </div>
                  </td>
                </tr>
              ) : specialists.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-[#97A0B3]">
                    No specialists matching the selected filters.
                  </td>
                </tr>
              ) : (
                specialists.map((spec) => (
                  <tr key={spec.id} className="hover:bg-[#1E293B]/40 transition-colors">
                    {/* Specialist Info */}
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-full bg-[#7FA0D6]/20 border border-[#7FA0D6]/40 flex items-center justify-center text-[#7FA0D6] font-bold text-xs uppercase shrink-0">
                          {(spec.name || "SP").slice(0, 2)}
                        </div>
                        <div>
                          <div className="flex items-center gap-1.5">
                            <span className="font-bold text-white text-xs">{spec.name}</span>
                            {spec.is_freelancer && (
                              <span className="px-1.5 py-0.2 rounded text-[10px] font-mono font-bold bg-[#7FA0D6]/15 text-[#BCCCE6] border border-[#7FA0D6]/30">
                                Freelancer
                              </span>
                            )}
                          </div>
                          <span className="text-[11px] text-[#97A0B3]">{spec.specialty}</span>
                        </div>
                      </div>
                    </td>

                    {/* Assigned */}
                    <td className="py-3.5 px-3 text-center font-mono font-semibold text-white">
                      {spec.tasks_assigned}
                    </td>

                    {/* Completed */}
                    <td className="py-3.5 px-3 text-center font-mono font-bold text-emerald-400">
                      {spec.tasks_completed}
                    </td>

                    {/* WIP */}
                    <td className="py-3.5 px-3 text-center font-mono text-amber-300">
                      {spec.tasks_pending}
                    </td>

                    {/* Overdue */}
                    <td className="py-3.5 px-3 text-center font-mono font-bold">
                      {spec.tasks_overdue > 0 ? (
                        <span className="text-rose-400">{spec.tasks_overdue}</span>
                      ) : (
                        <span className="text-[#97A0B3]">0</span>
                      )}
                    </td>

                    {/* Avg Turnaround */}
                    <td className="py-3.5 px-3 text-center font-mono font-semibold text-[#BCCCE6]">
                      {spec.avg_turnaround_hours}h
                    </td>

                    {/* On-Time % */}
                    <td className="py-3.5 px-3 text-center">
                      <span
                        className={`inline-block px-2 py-0.5 rounded text-[11px] font-mono font-bold ${
                          spec.on_time_completion_pct >= 90
                            ? "bg-emerald-500/15 text-emerald-300 border border-emerald-500/30"
                            : spec.on_time_completion_pct >= 75
                            ? "bg-amber-500/15 text-amber-300 border border-amber-500/30"
                            : "bg-rose-500/15 text-rose-300 border border-rose-500/30"
                        }`}
                      >
                        {spec.on_time_completion_pct}%
                      </span>
                    </td>

                    {/* Revision Rate */}
                    <td className="py-3.5 px-3 text-center font-mono text-xs">
                      <span className={spec.revision_rate_pct > 20 ? "text-amber-400 font-bold" : "text-[#97A0B3]"}>
                        {spec.revision_rate_pct}%
                      </span>
                    </td>

                    {/* Workload Progress & Status */}
                    <td className="py-3.5 px-4 text-center">
                      <div className="flex flex-col items-center gap-1">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                            spec.capacity_status === "Overloaded"
                              ? "bg-rose-500/15 text-rose-300 border border-rose-500/30"
                              : spec.capacity_status === "Optimal"
                              ? "bg-emerald-500/15 text-emerald-300 border border-emerald-500/30"
                              : "bg-blue-500/15 text-blue-300 border border-blue-500/30"
                          }`}
                        >
                          {spec.capacity_status} ({spec.allocated_workload_pct}%)
                        </span>
                        <div className="w-20 bg-[#0B111C] h-1.5 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full ${
                              spec.allocated_workload_pct >= 85
                                ? "bg-rose-500"
                                : spec.allocated_workload_pct >= 50
                                ? "bg-emerald-400"
                                : "bg-blue-400"
                            }`}
                            style={{ width: `${Math.min(100, spec.allocated_workload_pct)}%` }}
                          />
                        </div>
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
