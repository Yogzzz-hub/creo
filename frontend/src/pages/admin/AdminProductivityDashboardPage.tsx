import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Clock,
  CheckCircle2,
  AlertTriangle,
  Award,
  Layers,
  Filter,
  Search,
  Scale,
  Zap,
  Sparkles,
} from "lucide-react";
import { fetchProductivityMetrics } from "../../lib/productivity-api";
import { AdminTopHeader } from "../../components/admin/AdminTopHeader";
import { CustomSelect } from "../../components/ui/CustomSelect";
import { CreoInlineLoader } from "../../components/ui/CreoLoader";

export function AdminProductivityDashboardPage() {
  const [period, setPeriod] = useState<string>("monthly");
  const [department, setDepartment] = useState<string>("all");
  const [taskType, setTaskType] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");

  const { data, isLoading } = useQuery({
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
    <div data-surface="ops" className="w-full min-h-screen font-sans bg-app-base flex flex-col">
      <AdminTopHeader activeTab="Team Productivity & Efficiency" hideTitle />
      <main className="flex-1 px-3.5 sm:px-6 lg:px-8 py-4 sm:py-6 max-w-[1500px] w-full mx-auto space-y-4 sm:space-y-6 animate-in fade-in duration-300">
        {/* Top Controls: Scope */}
        <div className="flex items-center justify-between gap-2.5 w-full flex-wrap">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-bold text-app-mist uppercase tracking-wider hidden sm:inline">Scope:</span>
            {/* Period Selector */}
            <div className="bg-app-surface border border-app-line rounded-xl p-1 flex items-center gap-1">
              {(["daily", "weekly", "monthly", "all"] as const).map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setPeriod(p)}
                  className={`px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-semibold capitalize transition-all cursor-pointer ${
                    period === p
                      ? "bg-app-accent text-app-base shadow-sm font-bold"
                      : "text-app-mist hover:text-hi"
                  }`}
                >
                  {p === "all" ? "All Time" : p}
                </button>
              ))}
            </div>
          </div>
        </div>

      {/* ── MOBILE: COMPACT HORIZONTAL STATS RIBBON (Replaces giant stacked cards on phone) ── */}
      <div className="sm:hidden flex items-center gap-2.5 overflow-x-auto pb-1.5 pt-0.5 no-scrollbar snap-x overscroll-x-contain -mx-1 px-1">
        <div className="min-w-[145px] shrink-0 p-3 bg-app-surface border border-app-line rounded-2xl snap-start space-y-1 shadow-xs">
          <div className="flex items-center justify-between text-[10px] font-bold text-app-mist uppercase tracking-wider">
            <span>Completed</span>
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
          </div>
          <div className="text-xl font-black text-hi">{summary ? summary.tasks_completed : "--"}</div>
          <p className="text-[10px] text-emerald-400 font-bold truncate">
            {summary && summary.total_assigned > 0
              ? Math.round((summary.tasks_completed / summary.total_assigned) * 100)
              : 100}% of {summary?.total_assigned ?? 0}
          </p>
        </div>

        <div className="min-w-[145px] shrink-0 p-3 bg-app-surface border border-app-line rounded-2xl snap-start space-y-1 shadow-xs">
          <div className="flex items-center justify-between text-[10px] font-bold text-app-mist uppercase tracking-wider">
            <span>Turnaround</span>
            <Clock className="w-3.5 h-3.5 text-app-accent" />
          </div>
          <div className="text-xl font-black text-hi">{summary ? `${summary.avg_turnaround_hours}h` : "--"}</div>
          <p className="text-[10px] text-emerald-400 font-bold truncate">Target &le; 24h speed</p>
        </div>

        <div className="min-w-[145px] shrink-0 p-3 bg-app-surface border border-app-line rounded-2xl snap-start space-y-1 shadow-xs">
          <div className="flex items-center justify-between text-[10px] font-bold text-app-mist uppercase tracking-wider">
            <span>On-Time SLA</span>
            <Award className="w-3.5 h-3.5 text-indigo-400" />
          </div>
          <div className="text-xl font-black text-indigo-400 truncate">{summary ? `${summary.on_time_completion_pct}%` : "--"}</div>
          <p className="text-[10px] text-indigo-400/80 font-bold truncate">On-schedule</p>
        </div>

        <div className="min-w-[145px] shrink-0 p-3 bg-app-surface border border-app-line rounded-2xl snap-start space-y-1 shadow-xs">
          <div className="flex items-center justify-between text-[10px] font-bold text-app-mist uppercase tracking-wider">
            <span>Rework Rate</span>
            <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
          </div>
          <div className="text-xl font-black text-amber-400 truncate">{summary ? `${summary.revision_rate_pct}%` : "--"}</div>
          <p className="text-[10px] text-amber-400/80 font-bold truncate">{summary ? summary.tasks_pending : 0} in review</p>
        </div>
      </div>

      {/* KPI Cards Grid (Desktop / Tablet) */}
      <div className="hidden sm:grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Tasks Completed */}
        <div className="bg-app-surface border border-app-line rounded-2xl p-4 relative overflow-hidden group hover:border-app-accent/40 transition-all shadow-lg">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold uppercase tracking-wider text-app-mist">Tasks Completed</span>
            <div className="w-8 h-8 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-extrabold text-hi font-mono">
              {summary ? summary.tasks_completed : "--"}
            </span>
            <span className="text-xs text-app-mist">
              of {summary ? summary.total_assigned : "--"} assigned
            </span>
          </div>
          <div className="mt-3 flex items-center gap-1.5 text-[11px] text-app-mist">
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
        <div className="bg-app-surface border border-app-line rounded-2xl p-4 relative overflow-hidden group hover:border-app-accent/40 transition-all shadow-lg">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold uppercase tracking-wider text-app-mist">Turnaround Speed</span>
            <div className="w-8 h-8 rounded-xl bg-app-accent/15 border border-app-accent/30 flex items-center justify-center text-app-accent">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-extrabold text-hi font-mono">
              {summary ? `${summary.avg_turnaround_hours}h` : "--"}
            </span>
            <span className="text-xs text-emerald-400 font-semibold">Target &le; 24h</span>
          </div>
          <div className="mt-3 flex items-center gap-1.5 text-[11px] text-app-mist">
            <Zap className="w-3.5 h-3.5 text-amber-400" />
            <span>Average creation-to-delivery speed</span>
          </div>
        </div>

        {/* On-Time Delivery Rate */}
        <div className="bg-app-surface border border-app-line rounded-2xl p-4 relative overflow-hidden group hover:border-app-accent/40 transition-all shadow-lg">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold uppercase tracking-wider text-app-mist">On-Time Delivery</span>
            <div className="w-8 h-8 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
              <Award className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-extrabold text-hi font-mono">
              {summary ? `${summary.on_time_completion_pct}%` : "--"}
            </span>
            <span className="text-xs text-indigo-400 font-medium">SLA compliance</span>
          </div>
          <div className="mt-3 flex items-center gap-1.5 text-[11px] text-app-mist">
            <span>Delivered before or strictly on schedule</span>
          </div>
        </div>

        {/* Revision & Rework Rate */}
        <div className="bg-app-surface border border-app-line rounded-2xl p-4 relative overflow-hidden group hover:border-app-accent/40 transition-all shadow-lg">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold uppercase tracking-wider text-app-mist">Rework & Revisions</span>
            <div className="w-8 h-8 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
              <AlertTriangle className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-extrabold text-hi font-mono">
              {summary ? `${summary.revision_rate_pct}%` : "--"}
            </span>
            <span className="text-xs text-app-mist">resubmission frequency</span>
          </div>
          <div className="mt-3 flex items-center gap-1.5 text-[11px] text-app-mist">
            <span>{summary ? summary.tasks_pending : 0} tasks in active review</span>
          </div>
        </div>
      </div>

      {/* Workload Imbalance & Capacity Alert (Minimal & Easy to Understand) */}
      {hasImbalance && (
        <div className="bg-app-surface/90 border border-amber-500/30 rounded-2xl p-3.5 sm:p-5 shadow-xl relative overflow-hidden space-y-3">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 border-b border-app-line/60 pb-2.5">
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0">
                <Scale className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-hi">Workload Balance Alert</h3>
                <p className="text-[11px] sm:text-xs text-app-mist">
                  {overloadedList.length} overloaded &bull; {underutilizedList.length} ready for task reallocation
                </p>
              </div>
            </div>
            <span className="px-2.5 py-0.5 rounded-full text-[10px] sm:text-[11px] font-bold bg-amber-500/15 text-amber-300 border border-amber-500/30 self-start sm:self-auto">
              Action Recommended
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {/* Overloaded Column */}
            <div className="bg-app-base/80 border border-app-line rounded-xl p-3 space-y-2">
              <div className="flex items-center justify-between text-xs font-bold text-rose-400">
                <span className="flex items-center gap-1.5 uppercase tracking-wider text-[10px] sm:text-[11px]">
                  <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
                  Overloaded Specialists (&ge; 85%)
                </span>
                <span className="text-[10px] font-bold text-rose-300 bg-rose-500/15 px-2 py-0.5 rounded-full border border-rose-500/30">
                  {overloadedList.length}
                </span>
              </div>
              {overloadedList.length === 0 ? (
                <p className="text-xs text-app-mist py-1">No specialists currently at capacity risk.</p>
              ) : (
                <div className="space-y-1.5">
                  {overloadedList.map((spec) => (
                    <div
                      key={spec.id}
                      className="flex items-center justify-between text-xs py-1.5 px-2.5 rounded-lg bg-app-surface/60 border border-[#2A3446]/40"
                    >
                      <span className="font-semibold text-hi truncate max-w-[140px] sm:max-w-none">{spec.name}</span>
                      <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-rose-500/15 text-rose-300 border border-rose-500/30 shrink-0">
                        {spec.tasks_pending ?? 0} active WIP
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Available Capacity Column (Compact Pill Cloud) */}
            <div className="bg-app-base/80 border border-app-line rounded-xl p-3 space-y-2">
              <div className="flex items-center justify-between text-xs font-bold text-emerald-400">
                <span className="flex items-center gap-1.5 uppercase tracking-wider text-[10px] sm:text-[11px]">
                  <span className="w-2 h-2 rounded-full bg-emerald-500" />
                  Available for Reallocation (&le; 50%)
                </span>
                <span className="text-[10px] font-bold text-emerald-300 bg-emerald-500/15 px-2 py-0.5 rounded-full border border-emerald-500/30">
                  {underutilizedList.length}
                </span>
              </div>
              {underutilizedList.length === 0 ? (
                <p className="text-xs text-app-mist py-1">All specialists have balanced assignments.</p>
              ) : (
                <div className="flex flex-wrap gap-1.5 pt-0.5">
                  {underutilizedList.map((spec) => (
                    <span
                      key={spec.id}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium bg-app-surface/80 border border-app-line text-app-accent-soft hover:text-hi transition-colors"
                    >
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0" />
                      <span className="truncate max-w-[130px] font-semibold">{spec.name}</span>
                      <span className="text-[10px] text-app-mist font-mono">({spec.tasks_pending ?? 0} WIP)</span>
                    </span>
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
              <Sparkles className="w-4 h-4 text-app-accent" />
              <h3 className="text-sm font-bold text-hi uppercase tracking-wider">
                Comparative Craft Benchmarks
              </h3>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {comparisons.map((c, i) => (
              <div
                key={i}
                className="bg-app-surface border border-app-line rounded-2xl p-4 space-y-3 hover:border-app-accent/40 transition-colors shadow-md"
              >
                <div className="flex items-center justify-between border-b border-app-line pb-2.5">
                  <span className="text-xs font-bold text-app-accent-soft">{c.category}</span>
                  <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-app-accent/15 text-app-accent border border-app-accent/30">
                    +{c.delta_efficiency_pct}% volume delta
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-3 pt-1">
                  {/* Leader */}
                  <div className="bg-app-base border border-app-line rounded-xl p-3 space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-hi truncate">{c.leader}</span>
                      <span className="text-[10px] uppercase font-bold text-amber-400">Top Pace</span>
                    </div>
                    <div className="text-lg font-mono font-bold text-hi">
                      {c.leader_completed} <span className="text-xs font-normal text-app-mist">done</span>
                    </div>
                    <p className="text-[11px] text-app-mist">
                      Avg speed: <span className="text-hi font-mono">{c.leader_turnaround}h</span>
                    </p>
                  </div>

                  {/* Runner Up */}
                  <div className="bg-app-base border border-app-line rounded-xl p-3 space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-hi truncate">{c.runner_up}</span>
                      <span className="text-[10px] uppercase font-bold text-app-mist">Peer</span>
                    </div>
                    <div className="text-lg font-mono font-bold text-hi">
                      {c.runner_up_completed} <span className="text-xs font-normal text-app-mist">done</span>
                    </div>
                    <p className="text-[11px] text-app-mist">
                      Avg speed: <span className="text-hi font-mono">{c.runner_up_turnaround}h</span>
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Specialist Performance Table Section */}
      <div className="bg-app-surface border border-app-line rounded-2xl shadow-xl overflow-hidden">
        {/* Filter & Search Bar */}
        <div className="p-4 sm:p-5 border-b border-app-line flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-app-mist absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Filter by specialist name, craft, or role..."
              className="w-full bg-app-base border border-app-line rounded-xl pl-10 pr-4 py-2 text-xs text-hi placeholder:text-app-mist focus:outline-none focus:border-app-accent transition-colors"
            />
          </div>

          <div className="flex items-center gap-2 sm:gap-3 flex-nowrap shrink-0 overflow-x-auto no-scrollbar">
            {/* Department Filter */}
            <div className="flex items-center gap-1.5 text-xs text-app-mist shrink-0 whitespace-nowrap">
              <Filter className="w-3.5 h-3.5 shrink-0" />
              <span className="shrink-0">Dept:</span>
              <CustomSelect
                size="sm"
                value={department}
                onChange={setDepartment}
                ariaLabel="Filter Department"
                options={[
                  { value: "all", label: "All Departments" },
                  { value: "video", label: "Video & Motion" },
                  { value: "design", label: "Graphic Design" },
                  { value: "creative", label: "Creative General" },
                ]}
              />
            </div>

            {/* Task Type Filter */}
            <div className="flex items-center gap-1.5 text-xs text-app-mist shrink-0 whitespace-nowrap">
              <Layers className="w-3.5 h-3.5 shrink-0" />
              <span className="shrink-0">Asset:</span>
              <CustomSelect
                size="sm"
                value={taskType}
                onChange={setTaskType}
                ariaLabel="Filter Deliverable Type"
                options={[
                  { value: "all", label: "All Deliverable Types" },
                  { value: "reel", label: "Reels / Shorts" },
                  { value: "static_post", label: "Static Posts" },
                  { value: "carousel", label: "Carousels" },
                  { value: "story", label: "Stories" },
                ]}
              />
            </div>
          </div>
        </div>

        {/* Table Content */}
        <div className="overflow-x-auto overflow-y-auto max-h-[520px] custom-scrollbar">
          <table className="w-full text-left text-xs">
            <thead className="sticky top-0 z-10 bg-app-base border-b border-app-line text-app-mist uppercase text-[10px] tracking-wider font-bold">
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
                  <td colSpan={9} className="py-12 text-center text-app-mist">
                    <CreoInlineLoader compact label="Loading productivity" />
                  </td>
                </tr>
              ) : specialists.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-app-mist">
                    No specialists matching the selected filters.
                  </td>
                </tr>
              ) : (
                specialists.map((spec) => (
                  <tr key={spec.id} className="hover:bg-[#1E293B]/40 transition-colors">
                    {/* Specialist Info */}
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-full bg-app-accent/20 border border-app-accent/40 flex items-center justify-center text-app-accent font-bold text-xs uppercase shrink-0">
                          {(spec.name || "SP").slice(0, 2)}
                        </div>
                        <div>
                          <div className="flex items-center gap-1.5">
                            <span className="font-bold text-hi text-xs">{spec.name}</span>
                            {spec.is_freelancer && (
                              <span className="px-1.5 py-0.2 rounded text-[10px] font-mono font-bold bg-app-accent/15 text-app-accent-soft border border-app-accent/30">
                                Freelancer
                              </span>
                            )}
                          </div>
                          <span className="text-[11px] text-app-mist">{spec.specialty}</span>
                        </div>
                      </div>
                    </td>

                    {/* Assigned */}
                    <td className="py-3.5 px-3 text-center font-mono font-semibold text-hi">
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
                        <span className="text-app-mist">0</span>
                      )}
                    </td>

                    {/* Avg Turnaround */}
                    <td className="py-3.5 px-3 text-center font-mono font-semibold text-app-accent-soft">
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
                      <span className={spec.revision_rate_pct > 20 ? "text-amber-400 font-bold" : "text-app-mist"}>
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
                        <div className="w-20 bg-app-base h-1.5 rounded-full overflow-hidden">
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
