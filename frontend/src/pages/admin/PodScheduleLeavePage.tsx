import { useState } from "react";
import { AdminTopHeader } from "../../components/admin/AdminTopHeader";
import { useQuery, useMutation } from "@tanstack/react-query";
import { approveLeaveRequest, rejectLeaveRequest, fetchPodDashboard, type PodDashboardData } from "../../lib/ops-api";
import { useAuth } from "../../lib/auth-context";
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

  const podName = data?.pod?.name || "Pod A";
  const leadName = data?.pod?.lead?.name || user?.full_name || "Maya Lin";
  
  // Pending leaves local state
  const [pendingLeaves, setPendingLeaves] = useState([
    {
      id: "leave-elena",
      name: "Elena Ortiz",
      avatar: "EO",
      role: "Visual Designer",
      subrole: "Pod A Core · Joined 18 months ago",
      type: "Paid Time Off (PTO)",
      duration: "3 Working Days (Nov 02 - Nov 04, 2025)",
      backup: "Marcus Vance (Atlas Commerce)",
      reason: "Family commitment and personal travel. Handoff documentation prepared in Figma.",
      impact: "Sprint tasks already re-routed to Marcus. Ready for pod lead check. No blocker to client delivery SLA.",
    },
    {
      id: "leave-david",
      name: "David Kim",
      avatar: "DK",
      role: "Sr. Motion Designer",
      subrole: "Pod A Core · 3D & Lottie Specialist",
      type: "Medical Leave",
      duration: "Half Day (Tomorrow 2:00 PM - 6:00 PM)",
      backup: "Chloe Tan (Render Queue)",
      reason: "Routine doctor appointment and dental follow-up.",
      impact: "Morning handoff completed with Northwind Labs. Chloe Tan handling final AfterEffects render export.",
    },
  ]);

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
    const rows = [
      ["Maya Lin", "Pod A Lead", "Director of Brand", "On Duty", "100%", "None Scheduled"],
      ["David Kim", "Sr. Motion Designer", "3D & Lottie Specialist", "On Duty", "100%", "Medical Half-Day (Tomorrow)"],
      ["Elena Ortiz", "Visual Designer", "UI & Figma Systems", "On Duty", "100%", "PTO 3 Days (Nov 02 - Nov 04)"],
      ["Marcus Vance", "Lead Copy & Strategy", "Hook Architecture", "On Duty", "100%", "None Scheduled"],
      ["Chloe Tan", "Editor & Colorist", "Shortform Master", "On Duty", "100%", "None Scheduled"],
    ];

    const csvContent = [headers.join(","), ...rows.map(r => r.map(c => `"${c}"`).join(","))].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `Pod_A_Attendance_Schedule_Ledger_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    showToast("Downloaded Pod A Attendance Ledger CSV report", "success");
  };

  return (
    <div data-surface="ops" className="min-h-screen bg-[#F8FAFC] text-slate-900 font-sans flex flex-col">
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
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 bg-white p-2.5 sm:px-4 sm:py-2.5 rounded-2xl border border-slate-200/80 shadow-2xs">
          <div className="flex items-center gap-2">
            <span className="size-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-xs font-bold text-slate-700">{podName} Schedule & PTO Coverage · Lead {leadName}</span>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => showToast("Google Calendar & Slack sync updated", "success")}
              className="px-3 py-1.5 rounded-xl bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-bold flex items-center gap-1.5 shadow-2xs transition-colors cursor-pointer"
            >
              <Calendar className="size-3.5 text-slate-500" />
              Sync Calendar
            </button>
            <button
              onClick={handleExportAttendanceCSV}
              className="px-3 py-1.5 rounded-xl bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-bold flex items-center gap-1.5 shadow-2xs transition-colors cursor-pointer"
            >
              <FileCheck className="size-3.5 text-slate-500" />
              Attendance Report
            </button>
            <button
              onClick={() => setStandupModalOpen(true)}
              className="px-3.5 py-1.5 rounded-xl bg-[#2563EB] hover:bg-blue-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-xs transition-all cursor-pointer"
            >
              <Plus className="size-3.5" />
              Log Standup
            </button>
          </div>
        </div>

        {/* 2. Top 2 KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 sm:gap-3">
          {/* Card 1: People Working Today */}
          <div className="bg-white rounded-xl sm:rounded-2xl p-2.5 sm:p-3 border border-slate-200/80 shadow-2xs flex flex-col justify-between">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[9px] sm:text-[10px] font-bold uppercase tracking-wider text-slate-400">People Working Today</span>
              <div className="size-6 sm:size-7 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
                <Users className="size-3 sm:size-3.5" />
              </div>
            </div>
            <div>
              <div className="flex items-baseline gap-1.5 mb-1">
                <span className="text-lg sm:text-xl font-black text-[#0F172A]">4 Members</span>
                <span className="text-[10.5px] sm:text-[11px] font-bold text-slate-500">On Duty</span>
              </div>
              <div className="pt-1.5 border-t border-slate-100 space-y-0.5 text-[10px] sm:text-[11px]">
                <div className="flex justify-between font-bold text-slate-600">
                  <span>Active Pod Bandwidth</span>
                  <span className="text-blue-600">100% (Full Cap)</span>
                </div>
                <p className="text-[9.5px] sm:text-[10px] text-slate-400 font-medium">Maya L., David K., Elena R., Marcus V. active</p>
              </div>
            </div>
          </div>

          {/* Card 2: Upcoming Leave */}
          <div className="bg-white rounded-xl sm:rounded-2xl p-2.5 sm:p-3 border border-slate-200/80 shadow-2xs flex flex-col justify-between">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[9px] sm:text-[10px] font-bold uppercase tracking-wider text-slate-400">Upcoming Leave</span>
              <div className="size-6 sm:size-7 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
                <CalendarDays className="size-3 sm:size-3.5" />
              </div>
            </div>
            <div>
              <div className="flex items-baseline gap-1.5 mb-1">
                <span className="text-lg sm:text-xl font-black text-[#0F172A]">1 Scheduled</span>
                <span className="text-[10.5px] sm:text-[11px] font-bold text-slate-500">Tomorrow</span>
              </div>
              <div className="pt-1.5 border-t border-slate-100 flex items-center justify-between text-[10px] sm:text-[11px]">
                <div className="flex items-center gap-1.5">
                  <div className="size-4.5 sm:size-5 rounded-md bg-blue-600 text-white font-black text-[8.5px] sm:text-[9px] flex items-center justify-center">
                    EO
                  </div>
                  <span className="font-bold text-slate-700">Elena Ortiz · PTO</span>
                </div>
                <span className="text-[9.5px] sm:text-[10px] text-slate-400 font-medium">3 Days (Nov 02 - Nov 04)</span>
              </div>
            </div>
          </div>
        </div>

        {/* 3. Main Two Column Layout (Left 7 cols, Right 5 cols) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-3.5 sm:gap-4 items-start">
          {/* LEFT COLUMN: Pending Leave & PTO Queue (7 cols) */}
          <div className="lg:col-span-7 space-y-3.5 sm:space-y-4">
            <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200/80 shadow-2xs space-y-3">
              <div className="flex items-center justify-between pb-2.5 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <h2 className="text-sm font-black text-[#0F172A]">Pending Leave & PTO Queue</h2>
                  <span className="px-2 py-0.2 rounded-full text-[10px] font-black bg-blue-50 text-blue-700 border border-blue-200">
                    {pendingLeaves.length} Pending
                  </span>
                </div>
                <span className="text-[11px] font-bold text-slate-400">Requires Lead Action</span>
              </div>

              {pendingLeaves.length === 0 ? (
                <div className="text-center py-6 text-slate-400 text-xs font-medium">
                  All pending leave requests have been reviewed.
                </div>
              ) : (
                <div className="space-y-3">
                  {pendingLeaves.map((leave) => (
                    <div
                      key={leave.id}
                      className="p-3.5 rounded-xl border border-slate-200/80 bg-[#FAFCFF] hover:border-blue-200 hover:shadow-xs transition-all space-y-2.5"
                    >
                      {/* Specialist Info Header */}
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex items-center gap-2.5">
                          <div className="size-9 rounded-xl bg-gradient-to-tr from-slate-900 to-slate-800 text-white font-black text-xs flex items-center justify-center shadow-2xs">
                            {leave.avatar}
                          </div>
                          <div>
                            <div className="flex items-center gap-1.5">
                              <span className="text-xs font-black text-[#0F172A]">{leave.name}</span>
                              <span className="text-[11px] font-bold text-slate-500">· {leave.role}</span>
                            </div>
                            <span className="text-[10px] text-slate-400 font-medium">{leave.subrole}</span>
                          </div>
                        </div>

                        <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-blue-50 text-blue-700 border border-blue-200">
                          {leave.type}
                        </span>
                      </div>

                      {/* Request details grid */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 bg-white p-2.5 rounded-xl border border-slate-100 text-xs">
                        <div>
                          <span className="text-[9.5px] font-bold text-slate-400 uppercase tracking-wider block">Requested Duration</span>
                          <span className="font-bold text-slate-800 mt-0.5 block text-[11px]">{leave.duration}</span>
                        </div>
                        <div>
                          <span className="text-[9.5px] font-bold text-slate-400 uppercase tracking-wider block">Designated Backup</span>
                          <span className="font-bold text-blue-600 mt-0.5 block flex items-center gap-1 text-[11px]">
                            <ArrowLeftRight className="size-3" /> {leave.backup}
                          </span>
                        </div>
                      </div>

                      {/* Reason */}
                      <div className="text-xs text-slate-600">
                        <span className="text-[9.5px] font-bold text-slate-400 uppercase tracking-wider block mb-0.5">Reason</span>
                        <p className="italic font-medium text-[11px]">"{leave.reason}"</p>
                      </div>

                      {/* Impact Assessment Alert */}
                      <div className="p-2.5 rounded-xl bg-emerald-50/60 border border-emerald-200 text-xs text-emerald-800 flex items-start gap-1.5">
                        <ShieldCheck className="size-3.5 text-emerald-600 shrink-0 mt-0.5" />
                        <p className="font-medium leading-relaxed text-[10.5px]">
                          <span className="font-bold text-emerald-900">Impact: </span>
                          {leave.impact}
                        </p>
                      </div>

                      {/* Action buttons */}
                      <div className="flex items-center justify-end gap-2 pt-1">
                        <button
                          onClick={() => handleDecline(leave.id, leave.name)}
                          className="px-3 py-1.5 rounded-xl bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-bold transition-colors cursor-pointer"
                        >
                          Decline
                        </button>
                        <button
                          onClick={() => handleApprove(leave.id, leave.name)}
                          className="px-3.5 py-1.5 rounded-xl bg-[#2563EB] hover:bg-blue-700 text-white text-xs font-bold flex items-center gap-1 shadow-xs transition-all cursor-pointer"
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
            <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200/80 shadow-2xs space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <Clock className="size-3.5 text-slate-400" />
                  <h3 className="text-xs font-black text-[#0F172A]">Past 30 Days Leave History</h3>
                </div>
                <button
                  onClick={() => showToast("Audit log ledger opened", "success")}
                  className="text-[11px] font-bold text-blue-600 hover:underline cursor-pointer"
                >
                  View Audit Log
                </button>
              </div>

              <div className="divide-y divide-slate-100 text-xs">
                <div className="py-2 flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="size-7 rounded-lg bg-indigo-600 text-white font-black text-[9px] flex items-center justify-center">
                      MV
                    </div>
                    <div>
                      <span className="font-bold text-slate-800 text-xs">Marcus Vance</span>
                      <span className="text-slate-400 text-[10.5px] block">Personal Time Off · Oct 21 - Oct 23 (3 days)</span>
                    </div>
                  </div>
                  <span className="px-2 py-0.2 rounded-full text-[9px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                    Completed
                  </span>
                </div>

                <div className="py-2 flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="size-7 rounded-lg bg-teal-600 text-white font-black text-[9px] flex items-center justify-center">
                      CT
                    </div>
                    <div>
                      <span className="font-bold text-slate-800 text-xs">Chloe Tan</span>
                      <span className="text-slate-400 text-[10.5px] block">Design Conference · Oct 14 (1 Day)</span>
                    </div>
                  </div>
                  <span className="px-2 py-0.2 rounded-full text-[9px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
                    Archived
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* RIGHT COLUMN: Interactive Calendar & Schedule Timeline (5 cols) */}
          <div className="lg:col-span-5 space-y-3.5 sm:space-y-4">
            {/* 1. Monthly Calendar Widget */}
            <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200/80 shadow-2xs space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <Calendar className="size-3.5 text-blue-600" />
                  <h3 className="text-xs font-black text-[#0F172A]">November 2025</h3>
                </div>
                <div className="flex items-center gap-1">
                  <button className="p-1 rounded-lg hover:bg-slate-100 text-slate-500">
                    <ChevronLeft className="size-3.5" />
                  </button>
                  <button className="p-1 rounded-lg hover:bg-slate-100 text-slate-500">
                    <ChevronRight className="size-3.5" />
                  </button>
                </div>
              </div>

              {/* Day headers */}
              <div className="grid grid-cols-7 gap-1 text-center text-[9px] font-bold text-slate-400">
                <span>Mo</span>
                <span>Tu</span>
                <span>We</span>
                <span>Th</span>
                <span>Fr</span>
                <span>Sa</span>
                <span>Su</span>
              </div>

              {/* Calendar Grid */}
              <div className="grid grid-cols-7 gap-1 text-center text-xs font-bold">
                <span className="py-1 text-slate-300 text-[11px]">27</span>
                <span className="py-1 text-slate-300 text-[11px]">28</span>
                <span className="py-1 text-slate-300 text-[11px]">29</span>
                <span className="py-1 text-slate-300 text-[11px]">30</span>
                <span className="py-1 text-slate-300 text-[11px]">31</span>
                <span className="py-1 text-slate-700 text-[11px]">1</span>
                <span className="py-1 text-slate-700 text-[11px]">2</span>

                {/* Week 2 with highlighted active days */}
                <span className="py-1 rounded-lg bg-blue-600 text-white shadow-2xs text-[11px]">3</span>
                <span className="py-1 rounded-lg bg-blue-100 text-blue-800 text-[11px]">4</span>
                <span className="py-1 text-slate-700 text-[11px]">5</span>
                <span className="py-1 text-slate-700 text-[11px]">6</span>
                <span className="py-1 text-slate-700 text-[11px]">7</span>
                <span className="py-1 text-slate-700 text-[11px]">8</span>
                <span className="py-1 text-slate-700 text-[11px]">9</span>

                <span className="py-1 text-slate-700 text-[11px]">10</span>
                <span className="py-1 text-slate-700 text-[11px]">11</span>
                <span className="py-1 text-slate-700 text-[11px]">12</span>
                <span className="py-1 text-slate-700 text-[11px]">13</span>
                <span className="py-1 text-slate-700 text-[11px]">14</span>
                <span className="py-1 text-slate-700 text-[11px]">15</span>
                <span className="py-1 text-slate-700 text-[11px]">16</span>

                <span className="py-1 text-slate-700 text-[11px]">17</span>
                <span className="py-1 text-slate-700 text-[11px]">18</span>
                <span className="py-1 text-slate-700 text-[11px]">19</span>
                <span className="py-1 text-slate-700 text-[11px]">20</span>
                <span className="py-1 text-slate-700 text-[11px]">21</span>
                <span className="py-1 text-slate-700 text-[11px]">22</span>
                <span className="py-1 text-slate-700 text-[11px]">23</span>
              </div>

              {/* Legend */}
              <div className="flex items-center justify-between text-[9.5px] font-bold text-slate-500 pt-2 border-t border-slate-100">
                <span className="flex items-center gap-1">
                  <span className="size-1.5 rounded-full bg-blue-600" /> Today (Duty)
                </span>
                <span className="flex items-center gap-1">
                  <span className="size-1.5 rounded-full bg-blue-200" /> Pending / PTO
                </span>
                <span className="flex items-center gap-1">
                  <span className="size-1.5 rounded-full bg-emerald-500" /> Full Team
                </span>
              </div>
            </div>

            {/* 2. Today's Schedule & Meetings */}
            <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200/80 shadow-2xs space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                <div>
                  <h3 className="text-xs font-black text-[#0F172A]">Today's Schedule & Meetings</h3>
                  <p className="text-[10px] text-slate-400 font-medium">Synced with GCal & Slack {podName}</p>
                </div>
                <span className="px-1.5 py-0.2 rounded-full text-[9px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                  Live Now
                </span>
              </div>

              {/* Timeline Items */}
              <div className="space-y-2.5 relative pl-3.5 border-l-2 border-blue-100">
                {/* Item 1 */}
                <div className="space-y-0.5 relative">
                  <span className="absolute -left-[18px] top-1 size-2 rounded-full bg-blue-600 ring-2 ring-blue-100" />
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="font-bold text-slate-500">10:00 AM - 10:20 AM</span>
                    <span className="px-1.5 py-0.2 rounded bg-blue-50 text-blue-700 font-bold text-[8.5px]">Current</span>
                  </div>
                  <h4 className="text-xs font-black text-[#0F172A]">{podName} Daily Standup</h4>
                  <p className="text-[10.5px] text-slate-500 font-medium leading-tight">
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
                    <span className="font-bold text-slate-500">01:00 PM - 02:15 PM</span>
                    <span className="text-slate-400 font-bold text-[9px]">Conf Rm 3</span>
                  </div>
                  <h4 className="text-xs font-black text-[#0F172A]">Creative Handoff: {data?.clients?.[0]?.name || "Northwind Labs"}</h4>
                  <p className="text-[10.5px] text-slate-500 font-medium leading-tight">
                    Reviewing Q4 3D keyframe motion design renders.
                  </p>
                </div>

                {/* Item 3 */}
                <div className="space-y-0.5 relative pt-1">
                  <span className="absolute -left-[18px] top-2 size-1.5 rounded-full bg-slate-300" />
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="font-bold text-slate-500">04:00 PM - 05:00 PM</span>
                    <span className="text-rose-600 font-bold text-[9px]">Lock</span>
                  </div>
                  <h4 className="text-xs font-black text-[#0F172A]">Lead Review & Quality Sign-off</h4>
                  <p className="text-[10.5px] text-slate-500 font-medium leading-tight">
                    {leadName} sign-off for {data?.clients?.[1]?.name || "Atlas Commerce"}.
                  </p>
                </div>
              </div>
            </div>

            {/* 3. Pod Redundancy Matrix */}
            <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200/80 shadow-2xs space-y-2.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <ArrowLeftRight className="size-3.5 text-blue-600" />
                  <h3 className="text-xs font-black text-[#0F172A]">Pod Redundancy Matrix</h3>
                </div>
                <span className="text-[9px] font-bold text-emerald-600">100% PAIRING</span>
              </div>

              <div className="space-y-2 text-xs">
                <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-between">
                  <div>
                    <span className="font-bold text-slate-800 block text-xs">Motion & Video Suite</span>
                    <span className="text-[9.5px] text-slate-400 font-medium">AfterEffects, Blender, Lottie</span>
                  </div>
                  <span className="font-black text-blue-600 text-xs">David K. ⇄ Chloe T.</span>
                </div>

                <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-between">
                  <div>
                    <span className="font-bold text-slate-800 block text-xs">Visual Design & UI</span>
                    <span className="text-[9.5px] text-slate-400 font-medium">Figma components, banners</span>
                  </div>
                  <span className="font-black text-blue-600 text-xs">Elena R. ⇄ Marcus V.</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Standup Modal */}
      {standupModalOpen && (
        <div className="fixed inset-0 w-screen h-screen z-[9999] bg-slate-950/70 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
          <div className="w-full max-w-lg bg-white rounded-3xl p-6 sm:p-7 shadow-2xl border border-slate-100 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-black text-[#0F172A]">Log Pod A Daily Standup</h3>
              <button onClick={() => setStandupModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="size-5" />
              </button>
            </div>
            <p className="text-xs text-slate-500">
              Record attendance notes, sprint blockers, and daily velocity commitments:
            </p>
            <textarea
              rows={4}
              value={standupNote}
              onChange={(e) => setStandupNote(e.target.value)}
              placeholder="All 4 members present. David Kim rendering 3D pass. Elena R. finalizing Atlas deck. No critical blockers."
              className="w-full text-xs p-3.5 rounded-2xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium"
            />
            <div className="flex justify-end gap-3 pt-2">
              <button
                onClick={() => setStandupModalOpen(false)}
                className="px-4 py-2 rounded-xl bg-slate-100 text-slate-700 text-xs font-bold hover:bg-slate-200 transition"
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
