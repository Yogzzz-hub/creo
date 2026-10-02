import { useState } from "react";
import { AdminTopHeader } from "../../components/admin/AdminTopHeader";
import { useQuery, useMutation } from "@tanstack/react-query";
import { approveLeaveRequest, rejectLeaveRequest, fetchPodDashboard, type PodDashboardData } from "../../lib/ops-api";
import { useAuth } from "../../lib/auth-context";
import { motion } from "motion/react";
import {
  CalendarDays,
  Clock,
  ShieldCheck,
  Users,
  Video,
  ChevronLeft,
  ChevronRight,
  Plus,
  FileCheck,
  Calendar,
  Check,
  X,
  ArrowLeftRight,
} from "lucide-react";

export function PodScheduleLeavePage() {
  const { user } = useAuth();
  const [toastMessage, setToastMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [standupModalOpen, setStandupModalOpen] = useState(false);
  const [standupNote, setStandupNote] = useState("");

  const { data } = useQuery<PodDashboardData>({
    queryKey: ["pod_dashboard"],
    queryFn: () => fetchPodDashboard(),
  });

  const podName = data?.pod?.name || "Pod Operations";
  const leadName = data?.pod?.lead?.name || user?.full_name || "Pod Lead";
  
  // Pending leaves local state
  const [pendingLeaves, setPendingLeaves] = useState<any[]>([]);

  const showToast = (text: string, type: "success" | "error" = "success") => {
    setToastMessage({ type, text });
    setTimeout(() => setToastMessage(null), 4000);
  };

  const approveMutation = useMutation({
    mutationFn: approveLeaveRequest,
    onSuccess: () => {
      showToast("Leave request approved and backup coverage locked.", "success");
    },
  });

  const rejectMutation = useMutation({
    mutationFn: rejectLeaveRequest,
    onSuccess: () => {
      showToast("Leave request declined with note to specialist.", "success");
    },
  });

  const handleApprove = (id: string, name: string) => {
    approveMutation.mutate(id);
    setPendingLeaves((prev) => prev.filter((l) => l.id !== id));
    showToast(`Approved leave request for ${name}`, "success");
  };

  const handleDecline = (id: string, name: string) => {
    rejectMutation.mutate(id);
    setPendingLeaves((prev) => prev.filter((l) => l.id !== id));
    showToast(`Declined leave request for ${name}`, "success");
  };

  const handleExportAttendanceCSV = () => {
    const headers = ["Specialist Name", "Role", "Subrole", "Status", "Attendance Bandwidth", "Next Scheduled PTO"];
    const rows = (data?.members || []).map((m) => [
      m.name,
      m.role,
      `${podName} Core`,
      "On Duty",
      "100%",
      "None Scheduled",
    ]);

    const finalRows = rows.length > 0 ? rows : [["N/A", "-", "-", "-", "-", "-"]];

    const csvContent = [headers.join(","), ...finalRows.map((r: string[]) => r.map((c) => `"${c || ""}"`).join(","))].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `${podName.replace(/\s+/g, "_")}_Attendance_Schedule_Ledger_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    showToast("Downloaded Pod A Attendance Ledger CSV report", "success");
  };

  return (
    <div data-surface="ops" className="min-h-screen bg-nebula-navy text-white font-sans flex flex-col">
      {/* Top Header */}
      <AdminTopHeader title="Team Details" activeTab="Team Details" />

      {/* Main Container */}
      <main className="flex-1 max-w-[1440px] w-full mx-auto px-3 sm:px-5 lg:px-6 py-3.5 pb-20 sm:pb-6 space-y-3.5 sm:space-y-4">
        {/* Toast Alert */}
        {toastMessage && (
          <div
            className={`p-3 rounded-xl border text-xs font-bold flex items-center justify-between shadow-lg animate-fade-in ${
              toastMessage.type === "error"
                ? "bg-rose-50 border-rose-200 text-rose-700"
                : "bg-emerald-50 border-emerald-200 text-emerald-700"
            }`}
          >
            <span>{toastMessage.text}</span>
            <button onClick={() => setToastMessage(null)} className="text-current opacity-70 hover:opacity-100">
              &times;
            </button>
          </div>
        )}

        {/* 1. Quick Actions Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 bg-nebula-surface p-2.5 sm:px-4 sm:py-2.5 rounded-2xl border border-nebula-steel/80 shadow-2xs">
          <div className="flex items-center gap-2">
            <span className="size-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-xs font-bold text-slate-100">{podName} Schedule & PTO Coverage · Lead {leadName}</span>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => showToast("Google Calendar & Slack sync updated", "success")}
              className="px-3 py-1.5 rounded-xl bg-nebula-surface border border-nebula-steel hover:bg-nebula-navy text-slate-100 text-xs font-bold flex items-center gap-1.5 shadow-2xs transition-colors cursor-pointer"
            >
              <Calendar className="size-3.5 text-nebula-mist" />
              Sync Calendar
            </button>
            <button
              onClick={handleExportAttendanceCSV}
              className="px-3 py-1.5 rounded-xl bg-nebula-surface border border-nebula-steel hover:bg-nebula-navy text-slate-100 text-xs font-bold flex items-center gap-1.5 shadow-2xs transition-colors cursor-pointer"
            >
              <FileCheck className="size-3.5 text-nebula-mist" />
              Attendance Report
            </button>
            <button
              onClick={() => setStandupModalOpen(true)}
              className="px-3.5 py-1.5 rounded-xl bg-nebula-glow hover:bg-blue-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-xs transition-all cursor-pointer"
            >
              <Plus className="size-3.5" />
              Log Standup
            </button>
          </div>
        </div>

        {/* 2. Top 2 KPI Cards */}
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="grid grid-cols-1 md:grid-cols-2 gap-2.5 sm:gap-3"
        >
          {/* Card 1: People Working Today */}
          <div className="bg-nebula-surface rounded-xl sm:rounded-2xl p-2.5 sm:p-3 border border-nebula-steel/80 shadow-2xs hover-card-innovative flex flex-col justify-between">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[9px] sm:text-[10px] font-bold uppercase tracking-wider text-nebula-mist">People Working Today</span>
              <div className="size-6 sm:size-7 rounded-lg bg-nebula-glow/15 text-nebula-glow flex items-center justify-center">
                <Users className="size-3 sm:size-3.5" />
              </div>
            </div>
            <div>
              <div className="flex items-baseline gap-1.5 mb-1">
                <span className="text-lg sm:text-xl font-black text-white">4 Members</span>
                <span className="text-[10.5px] sm:text-[11px] font-bold text-nebula-mist">On Duty</span>
              </div>
              <div className="pt-1.5 border-t border-nebula-steel space-y-0.5 text-[10px] sm:text-[11px]">
                <div className="flex justify-between font-bold text-slate-100">
                  <span>Active Pod Bandwidth</span>
                  <span className="text-nebula-glow">100% (Full Cap)</span>
                </div>
                <p className="text-[9.5px] sm:text-[10px] text-nebula-mist font-medium">Maya L., David K., Elena R., Marcus V. active</p>
              </div>
            </div>
          </div>

          {/* Card 2: Upcoming Leave */}
          <div className="bg-nebula-surface rounded-xl sm:rounded-2xl p-2.5 sm:p-3 border border-nebula-steel/80 shadow-2xs hover-card-innovative flex flex-col justify-between">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[9px] sm:text-[10px] font-bold uppercase tracking-wider text-nebula-mist">Upcoming Leave</span>
              <div className="size-6 sm:size-7 rounded-lg bg-nebula-glow/15 text-nebula-glow flex items-center justify-center">
                <CalendarDays className="size-3 sm:size-3.5" />
              </div>
            </div>
            <div>
              <div className="flex items-baseline gap-1.5 mb-1">
                <span className="text-lg sm:text-xl font-black text-white">{pendingLeaves.length} Scheduled</span>
                <span className="text-[10.5px] sm:text-[11px] font-bold text-nebula-mist">This cycle</span>
              </div>
              <div className="pt-1.5 border-t border-nebula-steel flex items-center justify-between text-[10px] sm:text-[11px]">
                <span className="text-nebula-mist font-medium">
                  {pendingLeaves.length === 0 ? "Full team attendance active" : `${pendingLeaves.length} pending request`}
                </span>
                <span className="text-emerald-400 font-bold">Optimal Coverage</span>
              </div>
            </div>
          </div>
        </motion.div>

        {/* 3. Main Two Column Layout (Left 7 cols, Right 5 cols) */}
        <motion.div 
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, delay: 0.1 }}
          className="grid grid-cols-1 lg:grid-cols-12 gap-3.5 sm:gap-4 items-start"
        >
          {/* LEFT COLUMN: Pending Leave & PTO Queue (7 cols) */}
          <div className="lg:col-span-7 space-y-3.5 sm:space-y-4">
            <div className="bg-nebula-surface rounded-2xl p-4 sm:p-5 border border-nebula-steel/80 shadow-2xs hover-card-innovative space-y-3">
              <div className="flex items-center justify-between pb-2.5 border-b border-nebula-steel">
                <div className="flex items-center gap-2">
                  <h2 className="text-sm font-black text-white">Pending Leave & PTO Queue</h2>
                  <span className="px-2 py-0.2 rounded-full text-[10px] font-black bg-nebula-glow/15 text-nebula-glow border border-nebula-glow/30">
                    {pendingLeaves.length} Pending
                  </span>
                </div>
                <span className="text-[11px] font-bold text-nebula-mist">Requires Lead Action</span>
              </div>

              {pendingLeaves.length === 0 ? (
                <div className="text-center py-6 text-nebula-mist text-xs font-medium">
                  All pending leave requests have been reviewed.
                </div>
              ) : (
                <div className="space-y-3">
                  {pendingLeaves.map((leave) => (
                    <div
                      key={leave.id}
                      className="p-3.5 rounded-xl border border-nebula-steel/80 bg-nebula-navy hover:border-nebula-glow/30 hover-card-innovative shadow-2xs transition-all space-y-2.5"
                    >
                      {/* Specialist Info Header */}
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex items-center gap-2.5">
                          <div className="size-9 rounded-xl bg-gradient-to-tr from-slate-900 to-slate-800 text-white font-black text-xs flex items-center justify-center shadow-2xs">
                            {leave.avatar}
                          </div>
                          <div>
                            <div className="flex items-center gap-1.5">
                              <span className="text-xs font-black text-white">{leave.name}</span>
                              <span className="text-[11px] font-bold text-nebula-mist">· {leave.role}</span>
                            </div>
                            <span className="text-[10px] text-nebula-mist font-medium">{leave.subrole}</span>
                          </div>
                        </div>

                        <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-nebula-glow/15 text-nebula-glow border border-nebula-glow/30">
                          {leave.type}
                        </span>
                      </div>

                      {/* Request details grid */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 bg-nebula-surface p-2.5 rounded-xl border border-nebula-steel text-xs">
                        <div>
                          <span className="text-[9.5px] font-bold text-nebula-mist uppercase tracking-wider block">Requested Duration</span>
                          <span className="font-bold text-white mt-0.5 block text-[11px]">{leave.duration}</span>
                        </div>
                        <div>
                          <span className="text-[9.5px] font-bold text-nebula-mist uppercase tracking-wider block">Designated Backup</span>
                          <span className="font-bold text-nebula-glow mt-0.5 block flex items-center gap-1 text-[11px]">
                            <ArrowLeftRight className="size-3" /> {leave.backup}
                          </span>
                        </div>
                      </div>

                      {/* Reason */}
                      <div className="text-xs text-slate-100">
                        <span className="text-[9.5px] font-bold text-nebula-mist uppercase tracking-wider block mb-0.5">Reason</span>
                        <p className="italic font-medium text-[11px]">"{leave.reason}"</p>
                      </div>

                      {/* Impact Assessment Alert */}
                      <div className="p-2.5 rounded-xl bg-emerald-950/30 border border-emerald-800/50 text-xs text-emerald-300 flex items-start gap-1.5">
                        <ShieldCheck className="size-3.5 text-emerald-400 shrink-0 mt-0.5" />
                        <p className="font-medium leading-relaxed text-[10.5px]">
                          <span className="font-bold text-emerald-300">Impact: </span>
                          {leave.impact}
                        </p>
                      </div>

                      {/* Action buttons */}
                      <div className="flex items-center justify-end gap-2 pt-1">
                        <button
                          onClick={() => handleDecline(leave.id, leave.name)}
                          className="px-3 py-1.5 rounded-xl bg-nebula-surface border border-nebula-steel hover:bg-nebula-navy text-slate-100 text-xs font-bold transition-colors cursor-pointer"
                        >
                          Decline
                        </button>
                        <button
                          onClick={() => handleApprove(leave.id, leave.name)}
                          className="px-3.5 py-1.5 rounded-xl bg-nebula-glow hover:bg-blue-700 text-white text-xs font-bold flex items-center gap-1 shadow-xs transition-all cursor-pointer"
                        >
                          <Check className="size-3" />
                          Approve Leave
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Past 30 Days Leave History */}
            <div className="bg-nebula-surface rounded-2xl p-4 sm:p-5 border border-nebula-steel/80 shadow-2xs hover-card-innovative space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-nebula-steel">
                <div className="flex items-center gap-2">
                  <Clock className="size-3.5 text-nebula-mist" />
                  <h3 className="text-xs font-black text-white">Past 30 Days Leave History</h3>
                </div>
                <button
                  onClick={() => showToast("Audit log ledger opened", "success")}
                  className="text-[11px] font-bold text-nebula-glow hover:underline cursor-pointer"
                >
                  View Audit Log
                </button>
              </div>

              <div className="py-4 text-center text-xs text-nebula-mist">
                No historical leave requests recorded for this pod cycle.
              </div>
            </div>
          </div>

          {/* RIGHT COLUMN: Interactive Calendar & Schedule Timeline (5 cols) */}
          <div className="lg:col-span-5 space-y-3.5 sm:space-y-4">
            {/* 1. Monthly Calendar Widget */}
            <div className="bg-nebula-surface rounded-2xl p-4 sm:p-5 border border-nebula-steel/80 shadow-2xs hover-card-innovative space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Calendar className="size-4 text-nebula-glow" />
                  <h3 className="text-sm font-black text-white">November 2025</h3>
                </div>
                <div className="flex items-center gap-1">
                  <button className="p-1.5 rounded-lg hover:bg-nebula-surface text-nebula-mist cursor-pointer">
                    <ChevronLeft className="size-4" />
                  </button>
                  <button className="p-1.5 rounded-lg hover:bg-nebula-surface text-nebula-mist cursor-pointer">
                    <ChevronRight className="size-4" />
                  </button>
                </div>
              </div>

              {/* Day headers */}
              <div className="grid grid-cols-7 gap-1 text-center text-xs font-black text-white">
                <span>Mo</span>
                <span>Tu</span>
                <span>We</span>
                <span>Th</span>
                <span>Fr</span>
                <span>Sa</span>
                <span>Su</span>
              </div>

              {/* Calendar Grid */}
              <div className="grid grid-cols-7 gap-1.5 text-center text-xs sm:text-sm font-black">
                <span className="py-2 text-slate-500 rounded-lg">27</span>
                <span className="py-2 text-slate-500 rounded-lg">28</span>
                <span className="py-2 text-slate-500 rounded-lg">29</span>
                <span className="py-2 text-slate-500 rounded-lg">30</span>
                <span className="py-2 text-slate-500 rounded-lg">31</span>
                <span className="py-2 text-slate-100 rounded-lg bg-nebula-navy border border-nebula-steel">1</span>
                <span className="py-2 text-slate-100 rounded-lg bg-nebula-navy border border-nebula-steel">2</span>

                {/* Week 2 with highlighted active days */}
                <span className="py-2 rounded-lg bg-blue-600 text-white shadow-md font-black">3</span>
                <span className="py-2 rounded-lg bg-nebula-glow/20 text-nebula-glow border border-nebula-glow/40 font-black">4</span>
                <span className="py-2 text-slate-100 rounded-lg bg-nebula-navy border border-nebula-steel">5</span>
                <span className="py-2 text-slate-100 rounded-lg bg-nebula-navy border border-nebula-steel">6</span>
                <span className="py-2 text-slate-100 rounded-lg bg-nebula-navy border border-nebula-steel">7</span>
                <span className="py-2 text-slate-100 rounded-lg bg-nebula-navy border border-nebula-steel">8</span>
                <span className="py-2 text-slate-100 rounded-lg bg-nebula-navy border border-nebula-steel">9</span>

                <span className="py-2 text-slate-100 rounded-lg bg-nebula-navy border border-nebula-steel">10</span>
                <span className="py-2 text-slate-100 rounded-lg bg-nebula-navy border border-nebula-steel">11</span>
                <span className="py-2 text-slate-100 rounded-lg bg-nebula-navy border border-nebula-steel">12</span>
                <span className="py-2 text-slate-100 rounded-lg bg-nebula-navy border border-nebula-steel">13</span>
                <span className="py-2 text-slate-100 rounded-lg bg-nebula-navy border border-nebula-steel">14</span>
                <span className="py-2 text-slate-100 rounded-lg bg-nebula-navy border border-nebula-steel">15</span>
                <span className="py-2 text-slate-100 rounded-lg bg-nebula-navy border border-nebula-steel">16</span>

                <span className="py-2 text-slate-100 rounded-lg bg-nebula-navy border border-nebula-steel">17</span>
                <span className="py-2 text-slate-100 rounded-lg bg-nebula-navy border border-nebula-steel">18</span>
                <span className="py-2 text-slate-100 rounded-lg bg-nebula-navy border border-nebula-steel">19</span>
                <span className="py-2 text-slate-100 rounded-lg bg-nebula-navy border border-nebula-steel">20</span>
                <span className="py-2 text-slate-100 rounded-lg bg-nebula-navy border border-nebula-steel">21</span>
                <span className="py-2 text-slate-100 rounded-lg bg-nebula-navy border border-nebula-steel">22</span>
                <span className="py-2 text-slate-100 rounded-lg bg-nebula-navy border border-nebula-steel">23</span>
              </div>

              {/* Legend */}
              <div className="flex items-center justify-between text-xs font-extrabold text-nebula-mist pt-2 border-t border-nebula-steel">
                <span className="flex items-center gap-1.5">
                  <span className="size-2 rounded-full bg-blue-600" /> Today (Duty)
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="size-2 rounded-full bg-nebula-glow" /> Pending / PTO
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="size-2 rounded-full bg-emerald-500" /> Full Team
                </span>
              </div>
            </div>

            {/* 2. Today's Schedule & Meetings */}
            <div className="bg-nebula-surface rounded-2xl p-4 sm:p-5 border border-nebula-steel/80 shadow-2xs hover-card-innovative space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-nebula-steel">
                <div>
                  <h3 className="text-xs font-black text-white">Today's Schedule & Meetings</h3>
                  <p className="text-[10px] text-nebula-mist font-medium">Synced with GCal & Slack {podName}</p>
                </div>
                <span className="px-1.5 py-0.2 rounded-full text-[9px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                  Live Now
                </span>
              </div>

              {/* Timeline Items */}
              <div className="space-y-2.5 relative pl-3.5 border-l-2 border-nebula-glow/30">
                {/* Item 1 */}
                <div className="space-y-0.5 relative">
                  <span className="absolute -left-[18px] top-1 size-2 rounded-full bg-blue-600 ring-2 ring-blue-100" />
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="font-bold text-nebula-mist">10:00 AM - 10:20 AM</span>
                    <span className="px-1.5 py-0.2 rounded bg-nebula-glow/15 text-nebula-glow font-bold text-[8.5px]">Current</span>
                  </div>
                  <h4 className="text-xs font-black text-white">{podName} Daily Standup</h4>
                  <p className="text-[10.5px] text-nebula-mist font-medium leading-tight">
                    Live Zoom & Slack Sync with {leadName} and dedicated pod specialists.
                  </p>
                  <div className="pt-1">
                    <button
                      onClick={() => showToast(`Connecting to live ${podName} Standup room...`, "success")}
                      className="px-3 py-1 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold flex items-center gap-1 transition-colors cursor-pointer"
                    >
                      <Video className="size-3" /> Join Standup
                    </button>
                  </div>
                </div>

                {/* Item 2 */}
                <div className="space-y-0.5 relative pt-1">
                  <span className="absolute -left-[18px] top-2 size-1.5 rounded-full bg-slate-300" />
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="font-bold text-nebula-mist">01:00 PM - 02:15 PM</span>
                    <span className="text-nebula-mist font-bold text-[9px]">Conf Rm 3</span>
                  </div>
                  <h4 className="text-xs font-black text-white">Creative Handoff: {data?.clients?.[0]?.name || "Client Sprint"}</h4>
                  <p className="text-[10.5px] text-nebula-mist font-medium leading-tight">
                    Reviewing sprint motion design renders and deliverables.
                  </p>
                </div>

                {/* Item 3 */}
                <div className="space-y-0.5 relative pt-1">
                  <span className="absolute -left-[18px] top-2 size-1.5 rounded-full bg-slate-300" />
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="font-bold text-nebula-mist">04:00 PM - 05:00 PM</span>
                    <span className="text-rose-600 font-bold text-[9px]">Lock</span>
                  </div>
                  <h4 className="text-xs font-black text-white">Lead Review & Quality Sign-off</h4>
                  <p className="text-[10.5px] text-nebula-mist font-medium leading-tight">
                    {leadName} sign-off for {data?.clients?.[1]?.name || data?.clients?.[0]?.name || "Active Sprint"}.
                  </p>
                </div>
              </div>
            </div>

            {/* 3. Pod Redundancy Matrix */}
            <div className="bg-nebula-surface rounded-2xl p-4 sm:p-5 border border-nebula-steel/80 shadow-2xs hover-card-innovative space-y-2.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <ArrowLeftRight className="size-3.5 text-nebula-glow" />
                  <h3 className="text-xs font-black text-white">Pod Redundancy Matrix</h3>
                </div>
                <span className="text-[9px] font-bold text-emerald-600">100% PAIRING</span>
              </div>

              <div className="space-y-2 text-xs">
                {(!data?.members || data.members.length < 2) ? (
                  <div className="p-3 text-center text-xs text-nebula-mist">Pod pairing managed by Operations</div>
                ) : (
                  <div className="p-2.5 rounded-xl bg-nebula-navy border border-nebula-steel flex items-center justify-between">
                    <div>
                      <span className="font-bold text-white block text-xs">Primary & Secondary Pairing</span>
                      <span className="text-[9.5px] text-nebula-mist font-medium">Cross-functional craft coverage</span>
                    </div>
                    <span className="font-black text-nebula-glow text-xs">
                      {data.members[0]?.name} ⇄ {data.members[1]?.name}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </motion.div>
      </main>

      {/* Standup Modal */}
      {standupModalOpen && (
        <div className="fixed inset-0 w-screen h-screen z-[9999] bg-slate-950/70 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
          <div className="w-full max-w-lg bg-nebula-surface rounded-3xl p-6 sm:p-7 shadow-2xl border border-nebula-steel space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-black text-white">Log {podName} Daily Standup</h3>
              <button onClick={() => setStandupModalOpen(false)} className="text-nebula-mist hover:text-slate-100">
                <X className="size-5" />
              </button>
            </div>
            <p className="text-xs text-nebula-mist">
              Record attendance notes, sprint blockers, and daily velocity commitments:
            </p>
            <textarea
              rows={4}
              value={standupNote}
              onChange={(e) => setStandupNote(e.target.value)}
              placeholder="All pod members present. Tasks in progress, sprint velocity on track. No critical blockers."
              className="w-full text-xs p-3.5 rounded-2xl border border-nebula-steel bg-nebula-navy focus:bg-nebula-surface focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium text-white"
            />
            <div className="flex justify-end gap-3 pt-2">
              <button
                onClick={() => setStandupModalOpen(false)}
                className="px-4 py-2 rounded-xl bg-nebula-surface text-slate-100 text-xs font-bold hover:bg-slate-200 transition"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  showToast("Daily Standup logged and synced to Slack #pod-a", "success");
                  setStandupModalOpen(false);
                  setStandupNote("");
                }}
                className="px-5 py-2 rounded-xl bg-blue-600 text-white text-xs font-bold hover:bg-blue-700 transition"
              >
                Save Standup Record
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
