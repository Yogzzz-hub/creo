import { useState } from "react";
import { useNavigate } from "react-router";
import {
  Shield,
  Download,
  Sliders,
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
  Bell,
  Activity,
  Clock,
  Zap,
} from "lucide-react";
import { AdminTopHeader } from "../../components/admin/AdminTopHeader";

export function AdminSLAPerformancePage() {
  const navigate = useNavigate();
  const [timeframe, setTimeframe] = useState<"7d" | "30d" | "quarter" | "ytd">("30d");

  const podLeaderboard = [
    {
      pod: "Pod A",
      lead: "Maya Lin",
      bg: "bg-[#E0E7FF]",
      text: "text-[#4338CA]",
      slaMet: "99.4%",
      avgResponse: "6.2m",
      resolved: "42 tickets",
      status: "OPTIMAL",
      statusBg: "bg-emerald-100 text-emerald-800 border-emerald-200",
    },
    {
      pod: "Pod B",
      lead: "Omar V.",
      bg: "bg-[#DBEAFE]",
      text: "text-[#1E40AF]",
      slaMet: "98.8%",
      avgResponse: "7.8m",
      resolved: "38 tickets",
      status: "OPTIMAL",
      statusBg: "bg-emerald-100 text-emerald-800 border-emerald-200",
    },
    {
      pod: "Pod C",
      lead: "Lena Ortiz",
      bg: "bg-[#FEE2E2]",
      text: "text-[#991B1B]",
      slaMet: "97.5%",
      avgResponse: "9.1m",
      resolved: "35 tickets",
      status: "ATTENTION",
      statusBg: "bg-amber-100 text-amber-800 border-amber-200",
    },
    {
      pod: "Pod D",
      lead: "Theo Clark",
      bg: "bg-[#E0E7FF]",
      text: "text-[#3730A3]",
      slaMet: "98.9%",
      avgResponse: "7.1m",
      resolved: "29 tickets",
      status: "OPTIMAL",
      statusBg: "bg-emerald-100 text-emerald-800 border-emerald-200",
    },
    {
      pod: "Pod E",
      lead: "Sarah J.",
      bg: "bg-[#E0E7FF]",
      text: "text-[#3730A3]",
      slaMet: "98.1%",
      avgResponse: "8.5m",
      resolved: "31 tickets",
      status: "OPTIMAL",
      statusBg: "bg-emerald-100 text-emerald-800 border-emerald-200",
    },
  ];

  return (
    <div data-surface="ops" className="w-full min-h-screen font-sans bg-[#F8FAFC] flex flex-col justify-between">
      <div>
        <AdminTopHeader activeTab="Support" />

        <main className="px-6 lg:px-8 py-6 max-w-[1500px] w-full mx-auto space-y-6">
          {/* Top Controls Bar */}
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div className="flex items-center gap-2 text-xs font-bold text-slate-400 uppercase tracking-widest">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
                <Activity className="size-3.5 text-blue-600 animate-pulse" />
                REAL-TIME TELEMETRY
              </span>
              <span>•</span>
              <span className="text-slate-500 font-medium lowercase first-letter:uppercase">Tier-1 Ops Governance</span>
            </div>

            {/* Header Controls */}
            <div className="flex items-center gap-2.5 flex-wrap">
              {/* Timeframe Selector */}
              <div className="flex items-center bg-white border border-slate-200 p-1 rounded-xl text-xs font-bold text-slate-600 shadow-2xs">
                {[
                  { id: "7d", label: "Last 7 Days" },
                  { id: "30d", label: "Last 30 Days" },
                  { id: "quarter", label: "Quarter" },
                  { id: "ytd", label: "YTD" },
                ].map((tf) => (
                  <button
                    key={tf.id}
                    type="button"
                    onClick={() => setTimeframe(tf.id as any)}
                    className={`px-3 py-1.5 rounded-lg transition-all ${
                      timeframe === tf.id
                        ? "bg-blue-600 text-white shadow-2xs font-extrabold"
                        : "hover:text-slate-900"
                    }`}
                  >
                    {tf.label}
                  </button>
                ))}
              </div>

              <button
                type="button"
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-slate-200 bg-white text-slate-700 font-bold text-xs hover:bg-slate-50 shadow-2xs transition-all"
              >
                <Sliders className="size-3.5 text-slate-500" />
                Configure Thresholds
              </button>

              <button
                type="button"
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-sm transition-all"
              >
                <Download className="size-3.5" />
                Download Executive SLA Audit
              </button>
            </div>
          </div>

          {/* Top 2 KPI Metric Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Metric Card 1: Overall Compliance */}
            <div className="bg-white border border-slate-200/90 rounded-2xl p-6 shadow-xs flex items-center justify-between">
              <div className="space-y-1.5">
                <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400">
                  OVERALL COMPLIANCE
                </span>
                <div className="flex items-baseline gap-3">
                  <span className="text-4xl font-black text-slate-900">98.4%</span>
                  <span className="text-xs font-bold text-emerald-600 flex items-center gap-0.5">
                    <TrendingUp className="size-3.5" /> +0.6% MoM
                  </span>
                </div>
                <div className="flex items-center gap-3 pt-1 text-xs font-semibold">
                  <span className="text-slate-500">Target: <strong className="text-slate-800">98.0%</strong></span>
                  <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-extrabold border border-emerald-200">
                    OPTIMAL
                  </span>
                </div>
              </div>

              <div className="size-14 rounded-2xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600 shrink-0">
                <Shield className="size-7" />
              </div>
            </div>

            {/* Metric Card 2: Active SLA Watchlist */}
            <div className="bg-white border border-slate-200/90 rounded-2xl p-6 shadow-xs flex items-center justify-between">
              <div className="space-y-1.5">
                <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400">
                  ACTIVE SLA WATCHLIST
                </span>
                <div className="flex items-baseline gap-2">
                  <span className="text-4xl font-black text-slate-900">2</span>
                  <span className="text-base font-bold text-slate-600">Active</span>
                </div>
                <div className="flex items-center gap-2 pt-1 text-xs font-semibold">
                  <span className="px-2.5 py-0.5 rounded-md bg-rose-50 text-rose-700 text-[11px] font-bold border border-rose-200">
                    1 Approaching
                  </span>
                  <span className="px-2.5 py-0.5 rounded-md bg-emerald-50 text-emerald-700 text-[11px] font-bold border border-emerald-200">
                    • 1 Resolved
                  </span>
                </div>
              </div>

              <div className="size-14 rounded-2xl bg-rose-50 border border-rose-100 flex items-center justify-center text-rose-500 shrink-0">
                <Bell className="size-7" />
              </div>
            </div>
          </div>

          {/* Row 1: Chart & Compliance by Priority */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Chart Card (2 Cols) */}
            <div className="lg:col-span-2 bg-white border border-slate-200/90 rounded-2xl p-6 shadow-xs space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Response & Resolution Trend</h3>
                  <p className="text-xs text-slate-500">
                    Daily compliance velocity trajectory (May 10 — June 10, 2025)
                  </p>
                </div>
                <div className="flex items-center gap-4 text-xs font-bold">
                  <span className="flex items-center gap-1.5 text-blue-600">
                    <span className="size-2.5 rounded-full bg-blue-600" />
                    Response (99.1%)
                  </span>
                  <span className="flex items-center gap-1.5 text-indigo-600">
                    <span className="size-2.5 rounded-full bg-indigo-600" />
                    Resolution (97.8%)
                  </span>
                </div>
              </div>

              {/* SVG Trend Graph Representation */}
              <div className="h-56 w-full relative flex flex-col justify-between pt-4">
                {/* Target Line */}
                <div className="absolute top-1/4 left-0 right-0 border-b border-dashed border-rose-400/80 z-10 flex justify-end">
                  <span className="text-[10px] font-bold text-rose-600 bg-rose-50 px-1.5 py-0.5 rounded -mt-2.5">
                    Min Target 98.0%
                  </span>
                </div>

                <svg className="w-full h-full overflow-visible" viewBox="0 0 500 150" preserveAspectRatio="none">
                  <defs>
                    <linearGradient id="blueGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#3B82F6" stopOpacity="0.25" />
                      <stop offset="100%" stopColor="#3B82F6" stopOpacity="0.0" />
                    </linearGradient>
                  </defs>
                  {/* Area Fill */}
                  <path
                    d="M 0 110 C 60 70, 120 120, 180 80 C 240 40, 300 100, 360 60 C 420 30, 470 90, 500 50 L 500 150 L 0 150 Z"
                    fill="url(#blueGrad)"
                  />
                  {/* Response Line */}
                  <path
                    d="M 0 110 C 60 70, 120 120, 180 80 C 240 40, 300 100, 360 60 C 420 30, 470 90, 500 50"
                    fill="none"
                    stroke="#2563EB"
                    strokeWidth="3"
                  />
                  {/* Resolution Line */}
                  <path
                    d="M 0 130 C 60 90, 120 110, 180 95 C 240 60, 300 90, 360 75 C 420 45, 470 70, 500 65"
                    fill="none"
                    stroke="#6366F1"
                    strokeWidth="2.5"
                    strokeDasharray="4 2"
                  />
                </svg>

                {/* X Axis Labels */}
                <div className="flex justify-between text-[11px] font-medium text-slate-400 pt-2 border-t border-slate-100">
                  <span>May 10</span>
                  <span>May 16</span>
                  <span>May 22</span>
                  <span>May 28</span>
                  <span>Jun 03</span>
                  <span className="font-bold text-blue-600">Jun 10 (Today)</span>
                </div>
              </div>
            </div>

            {/* Compliance by Priority Card (1 Col) */}
            <div className="bg-white border border-slate-200/90 rounded-2xl p-6 shadow-xs space-y-5">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Compliance by Priority</h3>
                  <p className="text-xs text-slate-500">Strict contract adherence by urgency level</p>
                </div>
                <Sliders className="size-4 text-slate-400" />
              </div>

              {/* Progress Bars Stack */}
              <div className="space-y-4">
                {/* Item 1: Urgent */}
                <div className="space-y-1.5">
                  <div className="flex justify-between text-xs font-bold">
                    <span className="flex items-center gap-1.5 text-slate-900">
                      <span className="size-2 rounded-full bg-rose-600" />
                      Urgent (1h SLA)
                    </span>
                    <span className="text-slate-900">96.8% <span className="text-slate-400 font-normal">(5/5 Compliant)</span></span>
                  </div>
                  <div className="h-2 w-full rounded-full bg-slate-100 overflow-hidden">
                    <div className="h-full bg-rose-600 rounded-full" style={{ width: "96.8%" }} />
                  </div>
                </div>

                {/* Item 2: High Priority */}
                <div className="space-y-1.5">
                  <div className="flex justify-between text-xs font-bold">
                    <span className="flex items-center gap-1.5 text-slate-900">
                      <span className="size-2 rounded-full bg-blue-600" />
                      High Priority (2h SLA)
                    </span>
                    <span className="text-slate-900">98.2% <span className="text-slate-400 font-normal">(8/8 Compliant)</span></span>
                  </div>
                  <div className="h-2 w-full rounded-full bg-slate-100 overflow-hidden">
                    <div className="h-full bg-blue-600 rounded-full" style={{ width: "98.2%" }} />
                  </div>
                </div>

                {/* Item 3: Medium Priority */}
                <div className="space-y-1.5">
                  <div className="flex justify-between text-xs font-bold">
                    <span className="flex items-center gap-1.5 text-slate-900">
                      <span className="size-2 rounded-full bg-sky-500" />
                      Medium Priority (4h SLA)
                    </span>
                    <span className="text-slate-900">99.4% <span className="text-slate-400 font-normal">(19/19 Compliant)</span></span>
                  </div>
                  <div className="h-2 w-full rounded-full bg-slate-100 overflow-hidden">
                    <div className="h-full bg-sky-500 rounded-full" style={{ width: "99.4%" }} />
                  </div>
                </div>

                {/* Item 4: Normal Priority */}
                <div className="space-y-1.5">
                  <div className="flex justify-between text-xs font-bold">
                    <span className="flex items-center gap-1.5 text-slate-900">
                      <span className="size-2 rounded-full bg-emerald-600" />
                      Normal Priority (12h SLA)
                    </span>
                    <span className="text-slate-900">100.0% <span className="text-slate-400 font-normal">(44/44 Compliant)</span></span>
                  </div>
                  <div className="h-2 w-full rounded-full bg-slate-100 overflow-hidden">
                    <div className="h-full bg-emerald-600 rounded-full" style={{ width: "100%" }} />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Row 2: Pod Efficiency Leaderboard & Active Breach Warnings */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Leaderboard (2 Cols) */}
            <div className="lg:col-span-2 bg-white border border-slate-200/90 rounded-2xl p-6 shadow-xs space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Pod Efficiency Leaderboard</h3>
                  <p className="text-xs text-slate-500">Operational velocity across client dedicated pods</p>
                </div>
                <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400">
                  5 ACTIVE PODS
                </span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 border-b border-slate-200 text-[11px] font-extrabold uppercase tracking-wider text-slate-400">
                    <tr>
                      <th className="px-4 py-3">POD / LEAD</th>
                      <th className="px-4 py-3">SLA MET</th>
                      <th className="px-4 py-3">AVG RESPONSE</th>
                      <th className="px-4 py-3">RESOLVED</th>
                      <th className="px-4 py-3 text-right">STATUS</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium">
                    {podLeaderboard.map((item) => (
                      <tr key={item.pod} className="hover:bg-slate-50 transition-colors">
                        <td className="px-4 py-3.5">
                          <div className="flex items-center gap-3">
                            <div
                              className={`size-8 rounded-lg ${item.bg} ${item.text} font-black text-xs flex items-center justify-center`}
                            >
                              {item.pod.replace("Pod ", "")}
                            </div>
                            <div>
                              <div className="font-bold text-slate-900">{item.pod}</div>
                              <div className="text-[11px] text-slate-500">{item.lead}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3.5 font-bold text-slate-900">{item.slaMet}</td>
                        <td className="px-4 py-3.5 text-slate-600 font-mono">{item.avgResponse}</td>
                        <td className="px-4 py-3.5 text-slate-600">{item.resolved}</td>
                        <td className="px-4 py-3.5 text-right">
                          <span
                            className={`px-2.5 py-1 rounded-full text-[10px] font-extrabold border ${item.statusBg}`}
                          >
                            • {item.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Active Breach Warnings (1 Col) */}
            <div className="bg-white border border-slate-200/90 rounded-2xl p-6 shadow-xs space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <h3 className="text-sm font-bold text-slate-900">Active Breach Warnings</h3>
                <span className="text-[11px] font-bold text-blue-600 bg-blue-50 px-2.5 py-0.5 rounded-full border border-blue-100">
                  Live Dispatch
                </span>
              </div>

              <div className="space-y-3">
                {/* Warning 1: Approaching Breach */}
                <div className="p-4 rounded-xl bg-rose-50/70 border border-rose-200 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-rose-900 flex items-center gap-1.5">
                      <AlertTriangle className="size-3.5 text-rose-600" />
                      Response Approaching Breach
                    </span>
                    <span className="px-2 py-0.5 rounded text-[9px] font-black uppercase bg-rose-600 text-white">
                      WARNING
                    </span>
                  </div>
                  <p className="text-[11px] text-rose-800">
                    Ticket <strong className="font-mono">#1042</strong> • Northwind Labs • Pod A (Maya Lin)
                  </p>
                  <div className="flex items-center justify-between pt-1">
                    <span className="text-xs font-bold text-rose-700 flex items-center gap-1">
                      <Clock className="size-3.5" /> 18m remaining
                    </span>
                    <button
                      type="button"
                      onClick={() => navigate("/admin/support/tickets/1042")}
                      className="px-3 py-1 rounded-lg bg-rose-600 hover:bg-rose-700 text-white font-bold text-[11px] shadow-2xs transition-colors"
                    >
                      Intervene
                    </button>
                  </div>
                </div>

                {/* Warning 2: Escalation Resolved */}
                <div className="p-4 rounded-xl bg-emerald-50/70 border border-emerald-200 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-emerald-900 flex items-center gap-1.5">
                      <CheckCircle2 className="size-3.5 text-emerald-600" />
                      Escalation Resolved Cleanly
                    </span>
                    <span className="px-2 py-0.5 rounded text-[9px] font-black uppercase bg-emerald-600 text-white">
                      CLEARED
                    </span>
                  </div>
                  <p className="text-[11px] text-emerald-800">
                    Ticket <strong className="font-mono">#1035</strong> • Atlas Commerce • Pod C (Lena Ortiz)
                  </p>
                  <div className="flex items-center justify-between pt-1">
                    <span className="text-xs font-semibold text-emerald-700">
                      SLA Intact (1.2h elapsed)
                    </span>
                    <span className="text-[11px] font-medium text-slate-400">Archived</span>
                  </div>
                </div>

                {/* Warning 3: Queue Density */}
                <div className="p-4 rounded-xl bg-amber-50/70 border border-amber-200 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-amber-900 flex items-center gap-1.5">
                      <Zap className="size-3.5 text-amber-600" />
                      High Queue Density Warning
                    </span>
                    <span className="px-2 py-0.5 rounded text-[9px] font-black uppercase bg-amber-500 text-white">
                      SURGE
                    </span>
                  </div>
                  <p className="text-[11px] text-amber-800">
                    8 pending incoming items assigned to Pod C simultaneously. Auto-load balancing recommended.
                  </p>
                  <div className="flex items-center justify-between pt-1">
                    <span className="text-xs font-semibold text-amber-700">Auto-load balancing recommended</span>
                    <button
                      type="button"
                      className="px-3 py-1 rounded-lg bg-white border border-amber-300 text-amber-800 font-bold text-[11px] hover:bg-amber-100 transition-colors"
                    >
                      Monitor
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>

      {/* Footer Bar */}
      <footer className="bg-white border-t border-slate-200 px-6 lg:px-8 py-4 mt-8">
        <div className="max-w-[1500px] mx-auto flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500">
          <span>© 2025 creo. Executive Operations Portal. All rights reserved.</span>
          <div className="flex items-center gap-3 font-medium">
            <span className="flex items-center gap-1.5 text-emerald-600 font-bold">
              <span className="size-2 rounded-full bg-emerald-500 animate-pulse" />
              Systems Optimal
            </span>
            <span>•</span>
            <span>SLA Guarantee 99.98%</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
