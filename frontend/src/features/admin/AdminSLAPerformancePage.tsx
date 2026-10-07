import { useNavigate } from "react-router";
import { motion } from "motion/react";
import {
  Shield,
  Sliders,
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
  Bell,
  Clock,
  Zap,
} from "lucide-react";
import { AdminTopHeader } from "../../components/admin/AdminTopHeader";

export function AdminSLAPerformancePage() {
  const navigate = useNavigate();
  const podLeaderboard = [
    {
      pod: "Pod A",
      lead: "Vikram Malhotra",
      bg: "bg-[#161F2D]",
      text: "text-[#7FA0D6]",
      slaMet: "99.4%",
      avgResponse: "6.2m",
      resolved: "42 tickets",
      status: "OPTIMAL",
      statusBg: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
    },
    {
      pod: "Pod B",
      lead: "Sarah Connor",
      bg: "bg-[#161F2D]",
      text: "text-[#7FA0D6]",
      slaMet: "98.8%",
      avgResponse: "7.8m",
      resolved: "38 tickets",
      status: "OPTIMAL",
      statusBg: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
    },
    {
      pod: "Pod C",
      lead: "Rohan Mehta",
      bg: "bg-[#161F2D]",
      text: "text-[#D8BF9B]",
      slaMet: "97.5%",
      avgResponse: "9.1m",
      resolved: "35 tickets",
      status: "OPTIMAL",
      statusBg: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
    },
  ];

  return (
    <div data-surface="ops" className="w-full min-h-screen font-sans bg-[#0B111C] flex flex-col justify-between">
      <div>
        <AdminTopHeader activeTab="Support" />

        <motion.main
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35 }}
          className="px-3.5 sm:px-6 lg:px-8 py-4 sm:py-6 pb-24 sm:pb-8 max-w-[1500px] w-full mx-auto space-y-4 sm:space-y-6"
        >
          {/* Top 2 KPI Metric Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
            {/* Metric Card 1: Overall Compliance */}
            <div className="bg-[#161F2D] border border-[#2A3446]/90 rounded-2xl p-4 sm:p-5 shadow-2xs flex items-center justify-between hover-card-innovative">
              <div className="space-y-1">
                <span className="text-xs font-black uppercase tracking-wider text-[#97A0B3]">
                  OVERALL COMPLIANCE
                </span>
                <div className="flex items-baseline gap-2.5">
                  <span className="text-2xl sm:text-3xl font-black text-white">98.4%</span>
                  <span className="text-xs sm:text-sm font-bold text-emerald-400 flex items-center gap-1">
                    <TrendingUp className="size-4" /> +0.6% MoM
                  </span>
                </div>
                <div className="flex items-center gap-2 pt-1 text-xs font-bold">
                  <span className="text-[#97A0B3]">Target: <strong className="text-white">98.0%</strong></span>
                  <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 text-xs font-extrabold border border-emerald-500/30">
                    OPTIMAL
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
                  <span className="text-2xl sm:text-3xl font-black text-white">2</span>
                  <span className="text-xs sm:text-sm font-bold text-[#F1F5F9]">Active</span>
                </div>
                <div className="flex items-center gap-2 pt-1 text-xs font-bold">
                  <span className="px-2.5 py-0.5 rounded-md bg-rose-500/15 text-rose-400 text-xs font-bold border border-rose-500/30">
                    1 Approaching
                  </span>
                  <span className="px-2.5 py-0.5 rounded-md bg-emerald-500/15 text-emerald-400 text-xs font-bold border border-emerald-500/30">
                    • 1 Resolved
                  </span>
                </div>
              </div>

              <div className="size-10 sm:size-12 rounded-2xl bg-rose-500/15 border border-rose-500/30 flex items-center justify-center text-rose-400 shrink-0">
                <Bell className="size-5 sm:size-6" />
              </div>
            </div>
          </div>

          {/* Row 1: Chart & Compliance by Priority */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
            {/* Chart Card (2 Cols) */}
            <div className="lg:col-span-2 bg-[#161F2D] border border-[#2A3446]/90 rounded-2xl p-4 sm:p-6 shadow-xs space-y-4 hover-card-innovative">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#2A3446] pb-4">
                <div>
                  <h3 className="text-base font-black text-white">Response & Resolution Trend</h3>
                  <p className="text-xs sm:text-sm text-[#97A0B3] font-medium mt-0.5">
                    Daily compliance velocity trajectory (May 10 — June 10, 2025)
                  </p>
                </div>
                <div className="flex items-center gap-4 text-xs sm:text-sm font-bold">
                  <span className="flex items-center gap-1.5 text-[#7FA0D6]">
                    <span className="size-2.5 rounded-full bg-blue-500" />
                    Response (99.1%)
                  </span>
                  <span className="flex items-center gap-1.5 text-indigo-400">
                    <span className="size-2.5 rounded-full bg-indigo-500" />
                    Resolution (97.8%)
                  </span>
                </div>
              </div>

              {/* SVG Trend Graph Representation */}
              <div className="h-64 w-full relative flex flex-col justify-between pt-2 pb-1">
                {/* Target Line */}
                <div className="absolute top-[38%] left-0 right-0 border-b border-dashed border-rose-500/60 z-10 flex justify-end pr-2">
                  <span className="text-xs font-bold text-rose-400 bg-rose-950/90 border border-rose-800/80 px-2.5 py-0.5 rounded-full shadow-xs -mt-3">
                    Min Target 98.0%
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
                        <stop offset="0%" stopColor="#7FA0D6" stopOpacity="0.25" />
                        <stop offset="100%" stopColor="#7FA0D6" stopOpacity="0.0" />
                      </linearGradient>
                    </defs>
                    {/* Area Fill */}
                    <path
                      d="M 0 68 C 60 40, 120 72, 180 44 C 240 20, 300 58, 360 32 C 420 14, 470 48, 500 24 L 500 105 L 0 105 Z"
                      fill="url(#blueGrad)"
                    />
                    {/* Response Line */}
                    <path
                      d="M 0 68 C 60 40, 120 72, 180 44 C 240 20, 300 58, 360 32 C 420 14, 470 48, 500 24"
                      fill="none"
                      stroke="#7FA0D6"
                      strokeWidth="3.5"
                      strokeLinecap="round"
                    />
                    {/* Resolution Line */}
                    <path
                      d="M 0 82 C 60 55, 120 68, 180 54 C 240 34, 300 50, 360 40 C 420 24, 470 38, 500 34"
                      fill="none"
                      stroke="#BCCCE6"
                      strokeWidth="2.5"
                      strokeDasharray="5 3"
                      strokeLinecap="round"
                    />
                  </svg>
                </div>

                {/* X Axis Labels */}
                <div className="flex justify-between text-xs sm:text-sm font-bold text-[#97A0B3] pt-2 border-t border-[#2A3446]">
                  <span>May 10</span>
                  <span>May 16</span>
                  <span>May 22</span>
                  <span>May 28</span>
                  <span>Jun 03</span>
                  <span className="font-extrabold text-[#7FA0D6]">Jun 10 (Today)</span>
                </div>
              </div>
            </div>

            {/* Compliance by Priority Card (1 Col) */}
            <div className="bg-[#161F2D] border border-[#2A3446]/90 rounded-2xl p-4 sm:p-6 shadow-xs space-y-4 sm:space-y-5 hover-card-innovative">
              <div className="flex items-center justify-between border-b border-[#2A3446] pb-3">
                <div>
                  <h3 className="text-base font-black text-white">Compliance by Priority</h3>
                  <p className="text-xs sm:text-sm text-[#97A0B3] font-medium mt-0.5">Strict contract adherence by urgency level</p>
                </div>
                <Sliders className="size-4.5 text-[#7FA0D6]" />
              </div>

              {/* Progress Bars Stack */}
              <div className="space-y-4">
                {/* Item 1: Urgent */}
                <div className="space-y-1.5">
                  <div className="flex justify-between text-xs sm:text-sm font-bold">
                    <span className="flex items-center gap-1.5 text-white">
                      <span className="size-2.5 rounded-full bg-rose-500" />
                      Urgent (1h SLA)
                    </span>
                    <span className="text-white">96.8% <span className="text-[#97A0B3] font-normal">(5/5 Compliant)</span></span>
                  </div>
                  <div className="h-2.5 w-full rounded-full bg-[#0B111C] overflow-hidden border border-[#2A3446]">
                    <div className="h-full bg-rose-500 rounded-full" style={{ width: "96.8%" }} />
                  </div>
                </div>

                {/* Item 2: High Priority */}
                <div className="space-y-1.5">
                  <div className="flex justify-between text-xs sm:text-sm font-bold">
                    <span className="flex items-center gap-1.5 text-white">
                      <span className="size-2.5 rounded-full bg-blue-500" />
                      High Priority (2h SLA)
                    </span>
                    <span className="text-white">98.2% <span className="text-[#97A0B3] font-normal">(8/8 Compliant)</span></span>
                  </div>
                  <div className="h-2.5 w-full rounded-full bg-[#0B111C] overflow-hidden border border-[#2A3446]">
                    <div className="h-full bg-blue-500 rounded-full" style={{ width: "98.2%" }} />
                  </div>
                </div>

                {/* Item 3: Medium Priority */}
                <div className="space-y-1.5">
                  <div className="flex justify-between text-xs sm:text-sm font-bold">
                    <span className="flex items-center gap-1.5 text-white">
                      <span className="size-2.5 rounded-full bg-cyan-400" />
                      Medium Priority (4h SLA)
                    </span>
                    <span className="text-white">99.4% <span className="text-[#97A0B3] font-normal">(19/19 Compliant)</span></span>
                  </div>
                  <div className="h-2.5 w-full rounded-full bg-[#0B111C] overflow-hidden border border-[#2A3446]">
                    <div className="h-full bg-cyan-400 rounded-full" style={{ width: "99.4%" }} />
                  </div>
                </div>

                {/* Item 4: Normal Priority */}
                <div className="space-y-1.5">
                  <div className="flex justify-between text-xs sm:text-sm font-bold">
                    <span className="flex items-center gap-1.5 text-white">
                      <span className="size-2.5 rounded-full bg-emerald-400" />
                      Normal Priority (12h SLA)
                    </span>
                    <span className="text-white">100.0% <span className="text-[#97A0B3] font-normal">(44/44 Compliant)</span></span>
                  </div>
                  <div className="h-2.5 w-full rounded-full bg-[#0B111C] overflow-hidden border border-[#2A3446]">
                    <div className="h-full bg-emerald-400 rounded-full" style={{ width: "100%" }} />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Row 2: Pod Efficiency Leaderboard & Active Breach Warnings */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
            {/* Leaderboard (2 Cols) */}
            <div className="lg:col-span-2 bg-[#161F2D] border border-[#2A3446]/90 rounded-2xl p-4 sm:p-6 shadow-xs space-y-4 hover-card-innovative">
              <div className="flex items-center justify-between border-b border-[#2A3446] pb-3">
                <div>
                  <h3 className="text-sm font-bold text-white">Pod Efficiency Leaderboard</h3>
                  <p className="text-xs text-[#97A0B3]">Operational velocity across client dedicated pods</p>
                </div>
                <span className="text-[11px] font-extrabold uppercase tracking-wider text-[#97A0B3]">
                  5 ACTIVE PODS
                </span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-[#0B111C] border-b border-[#2A3446] text-[11px] font-extrabold uppercase tracking-wider text-[#97A0B3]">
                    <tr>
                      <th className="px-4 py-3">POD / LEAD</th>
                      <th className="px-4 py-3">SLA MET</th>
                      <th className="px-4 py-3">AVG RESPONSE</th>
                      <th className="px-4 py-3">RESOLVED</th>
                      <th className="px-4 py-3 text-right">STATUS</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#2A3446] font-medium">
                    {podLeaderboard.map((item) => (
                      <tr key={item.pod} className="hover:bg-[#0B111C] transition-colors">
                        <td className="px-4 py-3.5">
                          <div className="flex items-center gap-3">
                            <div
                              className={`size-8 rounded-lg ${item.bg} ${item.text} font-black text-xs flex items-center justify-center`}
                            >
                              {item.pod.replace("Pod ", "")}
                            </div>
                            <div>
                              <div className="font-bold text-white">{item.pod}</div>
                              <div className="text-[11px] text-[#97A0B3]">{item.lead}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3.5 font-bold text-white">{item.slaMet}</td>
                        <td className="px-4 py-3.5 text-[#F1F5F9] font-mono">{item.avgResponse}</td>
                        <td className="px-4 py-3.5 text-[#F1F5F9]">{item.resolved}</td>
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
            <div className="bg-[#161F2D] border border-[#2A3446]/90 rounded-2xl p-4 sm:p-6 shadow-xs space-y-4 hover-card-innovative">
              <div className="flex items-center justify-between border-b border-[#2A3446] pb-3">
                <h3 className="text-sm font-bold text-white">Active Breach Warnings</h3>
                <span className="text-[11px] font-bold text-[#7FA0D6] bg-[#7FA0D6]/15 px-2.5 py-0.5 rounded-full border border-[#7FA0D6]/30">
                  Live Dispatch
                </span>
              </div>

              <div className="space-y-3">
                {/* Warning 1: Approaching Breach */}
                <div className="p-4 rounded-xl bg-rose-950/40 border border-rose-800/50 backdrop-blur-md space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-rose-200 flex items-center gap-1.5">
                      <AlertTriangle className="size-3.5 text-rose-400" />
                      Response Approaching Breach
                    </span>
                    <span className="px-2 py-0.5 rounded text-[9px] font-black uppercase bg-rose-500/20 text-rose-300 border border-rose-500/30">
                      WARNING
                    </span>
                  </div>
                  <p className="text-[11px] text-rose-300/80">
                    Ticket <strong className="font-mono text-rose-200">#1042</strong> • Client Retainer • Pod A (On-Call Lead)
                  </p>
                  <div className="flex items-center justify-between pt-1">
                    <span className="text-xs font-bold text-rose-400 flex items-center gap-1">
                      <Clock className="size-3.5" /> 18m remaining
                    </span>
                    <button
                      type="button"
                      onClick={() => navigate("/admin/support/tickets/1042")}
                      className="px-3 py-1 rounded-lg bg-rose-600/80 hover:bg-rose-600 text-white font-bold text-[11px] shadow-2xs transition-colors cursor-pointer"
                    >
                      Intervene
                    </button>
                  </div>
                </div>

                {/* Warning 2: Escalation Resolved */}
                <div className="p-4 rounded-xl bg-emerald-950/40 border border-emerald-800/50 backdrop-blur-md space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-emerald-200 flex items-center gap-1.5">
                      <CheckCircle2 className="size-3.5 text-emerald-400" />
                      Escalation Resolved Cleanly
                    </span>
                    <span className="px-2 py-0.5 rounded text-[9px] font-black uppercase bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                      CLEARED
                    </span>
                  </div>
                  <p className="text-[11px] text-emerald-300/80">
                    Ticket <strong className="font-mono text-emerald-200">#1035</strong> • Client Workspace • Pod C (Creative Lead)
                  </p>
                  <div className="flex items-center justify-between pt-1">
                    <span className="text-xs font-semibold text-emerald-400">
                      SLA Intact (1.2h elapsed)
                    </span>
                    <span className="text-[11px] font-medium text-[#97A0B3]">Archived</span>
                  </div>
                </div>

                {/* Warning 3: Queue Density */}
                <div className="p-4 rounded-xl bg-amber-950/40 border border-amber-800/50 backdrop-blur-md space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-amber-200 flex items-center gap-1.5">
                      <Zap className="size-3.5 text-amber-400" />
                      High Queue Density Warning
                    </span>
                    <span className="px-2 py-0.5 rounded text-[9px] font-black uppercase bg-amber-500/20 text-amber-300 border border-amber-500/30">
                      SURGE
                    </span>
                  </div>
                  <p className="text-[11px] text-amber-300/80">
                    8 pending incoming items assigned to Pod C simultaneously. Auto-load balancing recommended.
                  </p>
                  <div className="flex items-center justify-between pt-1">
                    <span className="text-xs font-semibold text-amber-400">Auto-load balancing recommended</span>
                    <button
                      type="button"
                      className="px-3 py-1 rounded-lg bg-[#0B111C] border border-amber-500/30 text-amber-300 font-bold text-[11px] hover:bg-amber-950/50 transition-colors cursor-pointer"
                    >
                      Monitor
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </motion.main>
      </div>



    </div>
  );
}
