import { useState } from "react";
import { useNavigate } from "react-router";
import { motion } from "motion/react";
import {
  Calendar,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Send,
  X,
  MessageSquare,
  Shield,
  Plane,
} from "lucide-react";
import { AdminTopHeader } from "../../components/admin/AdminTopHeader";
import { useQuery } from "@tanstack/react-query";
import { fetchPodDashboard, type PodDashboardData } from "../../lib/ops-api";

export function MemberSchedulePTOPage() {
  const navigate = useNavigate();
  const { data } = useQuery<PodDashboardData>({
    queryKey: ["pod_dashboard"],
    queryFn: () => fetchPodDashboard(),
  });
  const leadName = data?.members?.find((m) => m.role?.toLowerCase().includes("lead"))?.full_name || "Pod Lead";
  const podName = data?.pod?.name || "Pod A";
  const members = data?.members || [];

  // State
  const [ptoRemaining, setPtoRemaining] = useState(14.5);
  const [sickRemaining] = useState(5.0);
  const [compRemaining] = useState(2.0);

  const [toastMessage, setToastMessage] = useState<{ text: string; type: "success" | "info" } | null>(null);

  // Quick PTO Form
  const [leaveType, setLeaveType] = useState("Paid Time Off (PTO) - 14.5d avail");
  const [startDate, setStartDate] = useState("2025-11-17");
  const [endDate, setEndDate] = useState("2025-11-19");
  const [designatedBackup, setDesignatedBackup] = useState("Designated Pod Peer (Creative Specialist)");
  const [handoverNotes, setHandoverNotes] = useState("Active render queue supervision & creative sprint handoff.");
  const [deductionDays] = useState("3.0");

  // Modals
  const [requestPtoModalOpen, setRequestPtoModalOpen] = useState(false);
  const [modifyModalOpen, setModifyModalOpen] = useState(false);
  const [cancelModalOpen, setCancelModalOpen] = useState(false);
  const [zoomModalOpen, setZoomModalOpen] = useState(false);

  // Active Leave List
  const [activeRequests, setActiveRequests] = useState<any[]>([]);

  const showToast = (text: string, type: "success" | "info" = "success") => {
    setToastMessage({ text, type });
    setTimeout(() => setToastMessage(null), 4000);
  };

  const handleSubmitQuickPto = (e: React.FormEvent) => {
    e.preventDefault();
    setRequestPtoModalOpen(false);
    const newReq = {
      id: `req-${Date.now()}`,
      title: `${leaveType.split(" - ")[0]} (${deductionDays}d)`,
      status: "Pending Lead Approval",
      statusColor: "bg-amber-50 text-amber-800 border-amber-200",
      tag: "Submitted · Lead Notified",
      dateRange: `${startDate} to ${endDate} (${deductionDays} Working Days)`,
      backup: designatedBackup,
    };
    setActiveRequests([newReq, ...activeRequests]);
    setPtoRemaining((p) => Math.max(0, Number((p - parseFloat(deductionDays || "1")).toFixed(1))));
    showToast(`Submitted ${deductionDays}d PTO request to ${leadName} for approval!`);
  };

  const handleConfirmCancelLeave = () => {
    setActiveRequests([]);
    setCancelModalOpen(false);
    setPtoRemaining((p) => Number((p + 0.5).toFixed(1)));
    showToast("Medical leave request canceled. 0.5d restored to balance.");
  };

  const handleConfirmModifyLeave = (e: React.FormEvent) => {
    e.preventDefault();
    setModifyModalOpen(false);
    showToast("Updated leave notes and notified ${leadName}!");
  };

  return (
    <div data-surface="ops" className="min-h-screen bg-[#0B111C] text-white font-sans flex flex-col">
      {/* Top Header Navigation matching Admin */}
      <AdminTopHeader activeTab="My Schedule & PTO" />

      {/* Main Container */}
      <main className="flex-1 max-w-[1440px] w-full mx-auto px-3 sm:px-5 lg:px-6 py-3.5 pb-20 sm:pb-6 space-y-3.5 sm:space-y-4">
        {/* Toast Alert */}
        {toastMessage && (
          <div
            className={`p-3 rounded-xl border text-xs font-bold flex items-center justify-between shadow-lg animate-fade-in ${
              toastMessage.type === "info"
                ? "bg-[#7FA0D6]/15 border-[#7FA0D6]/30 text-blue-800"
                : "bg-emerald-50 border-emerald-200 text-emerald-800"
            }`}
          >
            <div className="flex items-center gap-2">
              <CheckCircle2 className="size-4 text-emerald-600 shrink-0" />
              <span>{toastMessage.text}</span>
            </div>
            <button onClick={() => setToastMessage(null)} className="text-current opacity-70 hover:opacity-100">
              &times;
            </button>
          </div>
        )}

        {/* 1. Leave & Capacity Ledger Action Strip */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 bg-[#161F2D] p-2.5 sm:px-4 sm:py-3 rounded-2xl border border-[#2A3446]/80 shadow-2xs">
          <div className="flex items-center gap-2">
            <span className="size-2 rounded-full bg-[#7FA0D6]" />
            <span className="text-xs sm:text-sm font-black text-white tracking-tight">LEAVE & CAPACITY LEDGER</span>
            <span className="text-xs text-[#97A0B3] font-medium hidden sm:inline">• 2026 Annual Allocation & Coverage Pairing</span>
          </div>

          <button
            onClick={() => setRequestPtoModalOpen(true)}
            className="px-3.5 py-2 rounded-xl bg-[#7FA0D6] hover:bg-blue-700 text-white text-xs sm:text-sm font-bold flex items-center justify-center gap-1.5 shadow-xs transition-all cursor-pointer w-full sm:w-auto"
          >
            <Plane className="size-4" />
            <span>Request Time Off / Leave</span>
          </button>
        </div>

        {/* 2. Top 3 Metric Cards */}
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 sm:gap-3"
        >
          {/* Paid Time Off */}
          <div className="bg-[#161F2D] rounded-xl sm:rounded-2xl p-3 sm:p-4 border border-[#2A3446]/80 shadow-2xs hover-card-innovative flex flex-col justify-between">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs font-extrabold uppercase tracking-wider text-[#97A0B3]">
                PAID TIME OFF (PTO)
              </span>
              <div className="size-7 sm:size-8 rounded-lg bg-[#7FA0D6]/15 text-[#7FA0D6] flex items-center justify-center">
                <Plane className="size-4" />
              </div>
            </div>
            <div>
              <div className="flex items-baseline gap-1.5 mb-1">
                <span className="text-xl sm:text-2xl font-black text-white">{ptoRemaining}</span>
                <span className="text-xs font-extrabold text-[#97A0B3]">Days Left</span>
              </div>
              <div className="w-full h-2 bg-[#161F2D] rounded-full overflow-hidden my-1">
                <div className="h-full bg-blue-600 rounded-full smooth-progress-fill w-[72%]" />
              </div>
              <div className="flex items-center justify-between pt-1 border-t border-[#2A3446] text-[#97A0B3] font-semibold text-xs">
                <span>Used: 5.5 d</span>
                <span>20 d Annual</span>
              </div>
            </div>
          </div>

          {/* Sick & Medical */}
          <div className="bg-[#161F2D] rounded-xl sm:rounded-2xl p-3 sm:p-4 border border-[#2A3446]/80 shadow-2xs hover-card-innovative flex flex-col justify-between">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs font-extrabold uppercase tracking-wider text-[#97A0B3]">
                SICK & MEDICAL
              </span>
              <div className="size-7 sm:size-8 rounded-lg bg-indigo-500/15 text-indigo-400 flex items-center justify-center border border-indigo-500/30">
                <Shield className="size-4" />
              </div>
            </div>
            <div>
              <div className="flex items-baseline gap-1.5 mb-1">
                <span className="text-xl sm:text-2xl font-black text-white">{sickRemaining}</span>
                <span className="text-xs font-extrabold text-[#97A0B3]">Days Available</span>
              </div>
              <div className="flex items-center justify-between pt-1.5 border-t border-[#2A3446]">
                <span className="font-extrabold text-[#7FA0D6] text-xs">● 1 pending half-day</span>
              </div>
            </div>
          </div>

          {/* Floating & Comp */}
          <div className="bg-[#161F2D] rounded-xl sm:rounded-2xl p-3 sm:p-4 border border-[#2A3446]/80 shadow-2xs hover-card-innovative flex flex-col justify-between">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs font-extrabold uppercase tracking-wider text-[#97A0B3]">
                FLOATING & COMP
              </span>
              <div className="size-7 sm:size-8 rounded-lg bg-emerald-500/15 text-emerald-400 flex items-center justify-center border border-emerald-500/30">
                <Calendar className="size-4" />
              </div>
            </div>
            <div>
              <div className="flex items-baseline gap-1.5 mb-1">
                <span className="text-xl sm:text-2xl font-black text-white">{compRemaining}</span>
                <span className="text-xs font-extrabold text-[#97A0B3]">Days Available</span>
              </div>
              <div className="flex items-center justify-between pt-1.5 border-t border-[#2A3446] text-[#97A0B3] text-xs font-semibold">
                <span>Valid until Dec 31, 2025</span>
              </div>
            </div>
          </div>
        </motion.div>

        {/* 3. Main Grid (Left 2/3, Right 1/3) */}
        <motion.div 
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, delay: 0.1 }}
          className="grid grid-cols-1 lg:grid-cols-3 gap-3.5 sm:gap-4 items-start"
        >
          {/* LEFT 2 COLUMNS */}
          <div className="lg:col-span-2 space-y-3.5 sm:space-y-4">
            {/* Active & Historical Leave Requests */}
            <div className="bg-[#161F2D] rounded-2xl p-4 sm:p-5 border border-[#2A3446]/80 shadow-2xs hover-card-innovative space-y-3">
              <div className="flex items-center justify-between pb-2.5 border-b border-[#2A3446]">
                <div>
                  <h2 className="text-base sm:text-lg font-black text-white">Active & Historical Leave Requests</h2>
                  <p className="text-xs text-[#97A0B3]">Automated handoff telemetry linked directly to Pod A render pipelines</p>
                </div>
                <button
                  onClick={() => showToast("Exported PTO Audit Log CSV report", "success")}
                  className="text-xs font-extrabold text-[#7FA0D6] hover:underline cursor-pointer"
                >
                  Export Audit Log
                </button>
              </div>

              {/* Active Requests List */}
              <div className="space-y-2.5">
                {activeRequests.map((req) => (
                  <div key={req.id} className="p-3 sm:p-4 rounded-xl bg-[#0B111C] border border-[#2A3446] hover-card-innovative space-y-2.5">
                    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2">
                      <div className="flex items-start gap-2.5">
                        <div className="size-9 rounded-xl bg-blue-600 text-white flex items-center justify-center shrink-0 text-sm font-black shadow-md">
                          ⚡
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h4 className="text-sm font-black text-white">{req.title}</h4>
                            <span className="px-2 py-0.5 rounded-md text-xs font-extrabold bg-[#7FA0D6]/15 text-[#7FA0D6] border border-[#7FA0D6]/30">
                              {req.status}
                            </span>
                          </div>
                          <p className="text-xs text-[#97A0B3] mt-0.5 font-medium">{req.dateRange}</p>
                        </div>
                      </div>
                      <span className="text-xs font-bold text-emerald-400 bg-emerald-500/15 px-2.5 py-1 rounded-md border border-emerald-500/30 self-start">
                        {req.tag}
                      </span>
                    </div>

                    <div className="p-3 bg-[#161F2D] rounded-xl border border-[#2A3446] text-xs text-[#F1F5F9] flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div>
                        <span className="font-extrabold text-white">Designated Pod Backup:</span>{" "}
                        <span className="text-xs text-[#97A0B3] font-medium">{req.backup}</span>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          onClick={() => setModifyModalOpen(true)}
                          className="px-3 py-1.5 rounded-xl border border-[#2A3446] text-[#F1F5F9] text-xs font-bold hover:bg-[#0B111C] cursor-pointer"
                        >
                          Modify Request
                        </button>
                        <button
                          onClick={() => setCancelModalOpen(true)}
                          className="px-3 py-1.5 rounded-xl border border-rose-500/30 text-rose-400 hover:bg-rose-500/10 text-xs font-bold cursor-pointer"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  </div>
                ))}

                {activeRequests.length === 0 && (
                  <div className="p-4 text-center text-xs text-[#97A0B3] font-semibold border-2 border-dashed border-[#2A3446] rounded-xl">
                    No pending leave requests. You are active on all upcoming sprint shifts.
                  </div>
                )}
              </div>

              {/* Past Requests */}
              <div className="pt-2 space-y-2">
                <div className="text-xs font-extrabold uppercase tracking-wider text-[#97A0B3]">
                  PAST REQUESTS (SPRINT CYCLES 07 – 09)
                </div>

                <div className="p-3 rounded-xl bg-[#0B111C] border border-[#2A3446] hover-card-innovative flex items-center justify-between text-xs sm:text-sm">
                  <div className="flex items-center gap-3">
                    <div className="size-8 rounded-lg bg-[#161F2D] text-white flex items-center justify-center font-bold text-sm">
                      🏖️
                    </div>
                    <div>
                      <div className="font-black text-white text-xs sm:text-sm">Annual Leave – 3 Days</div>
                      <div className="text-xs text-[#97A0B3]">Oct 12 – Oct 14, 2025 • Covered by Designated Pod Peer</div>
                    </div>
                  </div>
                  <span className="px-2.5 py-1 rounded-md bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 font-extrabold text-xs">
                    Approved & Completed
                  </span>
                </div>

                <div className="p-3 rounded-xl bg-[#0B111C] border border-[#2A3446] hover-card-innovative flex items-center justify-between text-xs sm:text-sm">
                  <div className="flex items-center gap-3">
                    <div className="size-8 rounded-lg bg-[#161F2D] text-white flex items-center justify-center font-bold text-sm">
                      🎉
                    </div>
                    <div>
                      <div className="font-black text-white text-xs sm:text-sm">Floating Holiday – 1 Day</div>
                      <div className="text-xs text-[#97A0B3]">Sep 22, 2025 • Standup asynchronous catchup</div>
                    </div>
                  </div>
                  <span className="px-2.5 py-1 rounded-md bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 font-extrabold text-xs">
                    Approved & Completed
                  </span>
                </div>
              </div>
            </div>

            {/* November 2025 Calendar Grid */}
            <div className="bg-[#161F2D] rounded-2xl p-4 sm:p-5 border border-[#2A3446]/80 shadow-2xs hover-card-innovative space-y-3">
              <div className="flex items-center justify-between pb-2.5 border-b border-[#2A3446]">
                <div className="flex items-center gap-2.5">
                  <h3 className="text-base font-black text-white">November 2025</h3>
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-[#7FA0D6]/15 text-[#7FA0D6] border border-[#7FA0D6]/30">
                    Sprint 09 / Week 45-46
                  </span>
                </div>

                <div className="flex items-center gap-1">
                  <button className="p-1.5 rounded-lg hover:bg-[#161F2D] text-[#97A0B3] cursor-pointer">
                    <ChevronLeft className="size-4" />
                  </button>
                  <span className="text-xs sm:text-sm font-bold text-[#F1F5F9] px-2">Nov 2025</span>
                  <button className="p-1.5 rounded-lg hover:bg-[#161F2D] text-[#97A0B3] cursor-pointer">
                    <ChevronRight className="size-4" />
                  </button>
                </div>
              </div>

              {/* Legend */}
              <div className="flex flex-wrap items-center gap-3 text-xs font-extrabold text-[#97A0B3]">
                <span className="flex items-center gap-1.5">
                  <span className="size-2.5 rounded-full bg-blue-600" />
                  Duty / On-Deck
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="size-2.5 rounded-full bg-amber-500" />
                  Leave / Pending Off
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="size-2.5 rounded-full bg-rose-500" />
                  Sprint Deadline Lock
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="size-2.5 rounded-full bg-emerald-500" />
                  {leadName} ({podName} Lead Active)
                </span>
              </div>

              {/* Calendar Grid */}
              <div className="grid grid-cols-7 gap-1.5 text-center">
                {["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"].map((d) => (
                  <div key={d} className="font-black text-white text-xs sm:text-sm py-1">
                    {d}
                  </div>
                ))}

                {/* Days */}
                {[
                  { day: 27, muted: true },
                  { day: 28, muted: true },
                  { day: 29, muted: true },
                  { day: 30, muted: true },
                  { day: 31, muted: true },
                  { day: 1 },
                  { day: 2 },
                  { day: 3, today: true, label: "09:00 - 18:00" },
                  { day: 4 },
                  { day: 5 },
                  { day: 6 },
                  { day: 7, label: "Sprint Lock", alert: true },
                  { day: 8, label: "1/2 Med Leave", warn: true },
                  { day: 9 },
                  { day: 10 },
                  { day: 11 },
                  { day: 12, label: "Maya 1:1 Sync" },
                  { day: 13 },
                  { day: 14 },
                  { day: 15 },
                  { day: 16 },
                  { day: 17, label: "Duty 9-18" },
                  { day: 18 },
                  { day: 19 },
                  { day: 20 },
                  { day: 21, label: "Sprint 09 End", alert: true },
                  { day: 22 },
                  { day: 23 },
                  { day: 24 },
                  { day: 25 },
                  { day: 26 },
                  { day: 27, label: "Holiday", holiday: true },
                  { day: 28, label: "Holiday", holiday: true },
                  { day: 29 },
                  { day: 30 },
                ].map((item, idx) => (
                  <div
                    key={idx}
                    className={`min-h-[56px] sm:min-h-[64px] p-1.5 rounded-xl border flex flex-col justify-between transition-colors ${
                      item.today
                        ? "bg-[#7FA0D6]/20 border-blue-400 font-black shadow-md ring-1 ring-blue-500/30 text-white"
                        : item.holiday
                        ? "bg-purple-500/15 border-purple-500/30 text-purple-300"
                        : item.warn
                        ? "bg-amber-500/15 border-amber-500/30 text-amber-300"
                        : item.alert
                        ? "bg-rose-500/15 border-rose-500/30 text-rose-300"
                        : item.muted
                        ? "bg-[#0B111C]/40 border-[#2A3446] text-slate-400"
                        : "bg-[#161F2D] border-[#2A3446] hover:border-[#7FA0D6]/40 text-[#F1F5F9]"
                    }`}
                  >
                    <span className="text-xs sm:text-sm font-black text-left">{item.day}</span>
                    {item.label && (
                      <span
                        className={`text-[10px] sm:text-xs font-extrabold rounded px-1.5 py-0.5 truncate ${
                          item.today
                            ? "bg-blue-600 text-white shadow-xs"
                            : item.warn
                            ? "bg-amber-500/25 text-amber-300 border border-amber-500/40"
                            : item.alert
                            ? "bg-rose-500/25 text-rose-300 border border-rose-500/40"
                            : item.holiday
                            ? "bg-purple-500/25 text-purple-300 border border-purple-500/40"
                            : "bg-[#161F2D] text-[#F1F5F9]"
                        }`}
                      >
                        {item.label}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* RIGHT 1 COLUMN */}
          <div className="space-y-3.5 sm:space-y-4">
            {/* Today's Pod Schedule */}
            <div className="bg-[#161F2D] rounded-2xl p-4 sm:p-5 border border-[#2A3446]/80 shadow-2xs hover-card-innovative space-y-3">
              <div className="flex items-center justify-between pb-2.5 border-b border-[#2A3446]">
                <div>
                  <h3 className="text-sm font-black text-white">Today's Pod Schedule</h3>
                  <p className="text-xs text-[#97A0B3] font-medium">Monday, Nov 3 • Core Hours (09:00 - 18:00)</p>
                </div>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-extrabold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                  ● Active Shift
                </span>
              </div>

              {/* Schedule Items */}
              <div className="space-y-2.5 text-xs sm:text-sm">
                <div className="p-3 rounded-xl bg-[#0B111C] border border-[#2A3446] hover-card-innovative space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-extrabold text-[#7FA0D6] text-xs">10:00 AM – 10:30 AM</span>
                    <span className="px-2 py-0.5 rounded text-xs font-extrabold bg-blue-600 text-white uppercase">
                      Mandatory
                    </span>
                  </div>
                  <div className="font-black text-white text-xs sm:text-sm">Pod A Daily Standup</div>
                  <div className="text-xs text-[#97A0B3]">Sprint 09 Blocker Sweep & render server allocation</div>
                  <div className="flex items-center justify-between pt-1 border-t border-[#2A3446] text-xs">
                    <button
                      onClick={() => setZoomModalOpen(true)}
                      className="text-[#7FA0D6] font-bold hover:underline cursor-pointer"
                    >
                      🔗 Join Zoom Session
                    </button>
                    <span className="text-xs text-[#97A0B3]">5 Attendees</span>
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-[#0B111C] border border-[#2A3446]/80 hover-card-innovative space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-extrabold text-[#7FA0D6] text-xs">01:30 PM – 02:15 PM</span>
                    <span className="text-xs text-[#97A0B3]">Conf Room 3</span>
                  </div>
                  <div className="font-black text-white text-xs sm:text-sm">Creative Handoff: Active Sprint Sync</div>
                  <div className="text-xs text-[#97A0B3]">3D Renders presentation with Product Lead</div>
                  <div className="flex items-center justify-between pt-1 border-t border-[#2A3446] text-xs text-[#97A0B3]">
                    <span>Handoff Cut v.1.0</span>
                    <span className="text-emerald-400 font-bold">Motion QA Ready</span>
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-[#0B111C] border border-[#2A3446]/80 hover-card-innovative space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-extrabold text-[#7FA0D6] text-xs">04:00 PM – 05:00 PM</span>
                    <span className="text-xs text-[#97A0B3]">Designated Window</span>
                  </div>
                  <div className="font-black text-white text-xs sm:text-sm">Lead Review & Quality Sign-Off</div>
                  <div className="text-xs text-[#97A0B3]">Synchronous review block with {leadName}</div>
                </div>
              </div>
            </div>

            {/* Pod Redundancy Partner */}
            <div className="bg-[#161F2D] rounded-2xl p-4 sm:p-5 border border-[#2A3446]/80 shadow-2xs hover-card-innovative space-y-3">
              <div className="flex items-center justify-between pb-1.5 border-b border-[#2A3446]">
                <div className="flex items-center gap-1.5">
                  <Shield className="size-4 text-[#7FA0D6]" />
                  <h3 className="text-sm font-black text-white">Pod Redundancy Partner</h3>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-[#0B111C] border border-[#2A3446]/70 flex items-center gap-3">
                <div className="size-10 rounded-xl bg-teal-600 text-white font-black text-xs flex items-center justify-center shrink-0 shadow-2xs">
                  {members[1]?.full_name ? members[1].full_name.slice(0, 2).toUpperCase() : "DP"}
                </div>
                <div>
                  <div className="font-black text-white text-xs sm:text-sm">{members[1]?.full_name || "Designated Pod Peer"}</div>
                  <div className="text-xs text-[#97A0B3] font-medium">{members[1]?.role || "Creative Specialist"}</div>
                  <span className="inline-block mt-0.5 text-xs font-bold text-emerald-400 bg-emerald-500/15 border border-emerald-500/30 px-2 py-0.5 rounded-md">
                    ● Available for pairing
                  </span>
                </div>
              </div>

              <div className="text-xs text-[#97A0B3] space-y-1">
                <div className="font-extrabold text-white text-xs">Handoff Protocol Active:</div>
                <p className="leading-relaxed text-xs">
                  Automatic render queue forwarding to designated peer node triggered whenever status is switched to <strong>Out of Office (Away)</strong>.
                </p>
              </div>

              <button
                onClick={() => {
                  navigate("/slack");
                }}
                className="w-full py-2.5 rounded-xl bg-[#7FA0D6]/15 hover:bg-[#7FA0D6]/25 border border-[#7FA0D6]/30 text-[#7FA0D6] text-xs sm:text-sm font-extrabold transition-colors cursor-pointer flex items-center justify-center gap-1.5"
              >
                <MessageSquare className="size-4" />
                Ping Chloe on Slack
              </button>
            </div>

            {/* Submit Quick PTO Form */}
            <div className="bg-[#161F2D] rounded-2xl p-4 sm:p-5 border border-[#2A3446]/80 shadow-2xs hover-card-innovative space-y-3">
              <div className="flex items-center justify-between pb-1.5 border-b border-[#2A3446]">
                <div className="flex items-center gap-1.5">
                  <Plane className="size-4 text-[#7FA0D6]" />
                  <h3 className="text-sm font-black text-white">Submit Quick PTO</h3>
                </div>
                <span className="text-xs text-[#97A0B3] font-medium">Auto-routed</span>
              </div>

              <form onSubmit={handleSubmitQuickPto} className="space-y-3 text-xs sm:text-sm">
                <div>
                  <label className="block font-extrabold text-white mb-1 text-xs">Leave Type</label>
                  <select
                    value={leaveType}
                    onChange={(e) => setLeaveType(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-[#2A3446] font-semibold bg-[#0B111C] text-xs sm:text-sm text-white"
                  >
                    <option value="Paid Time Off (PTO) - 14.5d avail">Paid Time Off (PTO) – 14.5d avail</option>
                    <option value="Sick & Medical Leave - 5.0d avail">Sick & Medical Leave – 5.0d avail</option>
                    <option value="Floating Holiday - 2.0d avail">Floating Holiday – 2.0d avail</option>
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-2.5">
                  <div>
                    <label className="block font-extrabold text-white mb-1 text-xs">Start Date</label>
                    <input
                      type="date"
                      required
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      className="w-full px-2.5 py-1.5 rounded-xl border border-[#2A3446] font-bold text-xs sm:text-sm bg-[#0B111C] text-white"
                    />
                  </div>
                  <div>
                    <label className="block font-extrabold text-white mb-1 text-xs">End Date</label>
                    <input
                      type="date"
                      required
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                      className="w-full px-2.5 py-1.5 rounded-xl border border-[#2A3446] font-bold text-xs sm:text-sm bg-[#0B111C] text-white"
                    />
                  </div>
                </div>

                <div>
                  <label className="block font-extrabold text-white mb-1 text-xs">Designated Pod Backup</label>
                  <select
                    value={designatedBackup}
                    onChange={(e) => setDesignatedBackup(e.target.value)}
                    className="w-full px-2.5 py-1.5 rounded-xl border border-[#2A3446] font-semibold bg-[#161F2D] text-xs"
                  >
                    {members.length > 0 ? (
                      members.map((m) => (
                        <option key={m.id} value={`${m.full_name} (${m.role || "Specialist"})`}>
                          {m.full_name} ({m.role || "Specialist"})
                        </option>
                      ))
                    ) : (
                      <option value="Designated Pod Peer (Creative Specialist)">Designated Pod Peer (Creative Specialist)</option>
                    )}
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-[#F1F5F9] mb-1 text-[11px]">Handover & Pipeline Notes</label>
                  <textarea
                    rows={2}
                    value={handoverNotes}
                    onChange={(e) => setHandoverNotes(e.target.value)}
                    placeholder="Specify render cache status, handoff link, or Figma checkpoints..."
                    className="w-full px-2.5 py-1.5 rounded-xl border border-[#2A3446] font-medium text-xs"
                  />
                </div>

                <div className="flex justify-between items-center text-[10.5px] font-bold text-[#97A0B3] pt-0.5">
                  <span>Quota Deduction:</span>
                  <span className="text-white">{deductionDays} Working Days</span>
                </div>

                <button
                  type="submit"
                  className="w-full py-2 rounded-xl bg-[#7FA0D6] hover:bg-blue-700 text-white font-bold shadow-xs transition-all cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <Send className="size-3" />
                  Submit for Lead Approval
                </button>
              </form>
            </div>
          </div>
        </motion.div>



      </main>

      {/* ─────────────────────────────────────────────────────────────
          CENTERED MODALS WITH BLURRED BACKGROUND (z-[99999])
      ───────────────────────────────────────────────────────────── */}

      {/* MODAL: CANCEL LEAVE CONFIRMATION */}
      {cancelModalOpen && (
        <div
          className="fixed inset-0 w-screen h-screen z-[99999] bg-slate-950/70 backdrop-blur-md flex items-center justify-center p-4 animate-fade-in"
          onClick={() => setCancelModalOpen(false)}
        >
          <div
            className="w-full max-w-md bg-[#161F2D] rounded-3xl p-6 sm:p-7 shadow-2xl border border-[#2A3446] space-y-4 animate-scale-up text-center"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="size-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mx-auto font-black">
              <X className="size-6" />
            </div>
            <div>
              <h3 className="text-base font-black text-white">Cancel Medical Leave Request?</h3>
              <p className="text-xs text-[#97A0B3] mt-1 leading-relaxed">
                This will withdraw your tomorrow half-day leave request, notify {leadName}, and restore 0.5d back to your medical balance.
              </p>
            </div>

            <div className="flex items-center justify-center gap-2 pt-2 border-t border-[#2A3446]">
              <button
                type="button"
                onClick={() => setCancelModalOpen(false)}
                className="px-4 py-2 rounded-xl border border-[#2A3446] font-bold text-xs text-[#F1F5F9] hover:bg-[#0B111C] cursor-pointer"
              >
                Go Back
              </button>
              <button
                type="button"
                onClick={handleConfirmCancelLeave}
                className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs shadow-md shadow-rose-600/20 cursor-pointer"
              >
                Confirm Cancellation
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: MODIFY LEAVE */}
      {modifyModalOpen && (
        <div
          className="fixed inset-0 w-screen h-screen z-[99999] bg-slate-950/70 backdrop-blur-md flex items-center justify-center p-4 animate-fade-in"
          onClick={() => setModifyModalOpen(false)}
        >
          <div
            className="w-full max-w-md bg-[#161F2D] rounded-3xl p-6 sm:p-7 shadow-2xl border border-[#2A3446] space-y-4 animate-scale-up"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-[#2A3446] pb-3">
              <div className="flex items-center gap-2.5">
                <div className="size-9 rounded-2xl bg-[#7FA0D6]/15 text-[#7FA0D6] flex items-center justify-center font-bold">
                  <Calendar className="size-4.5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-white">Modify Leave Request</h3>
                  <p className="text-xs text-[#97A0B3]">Medical Leave (Half Day) · Nov 8, 2025</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setModifyModalOpen(false)}
                className="size-8 rounded-full bg-[#161F2D] hover:bg-slate-200 text-[#97A0B3] flex items-center justify-center cursor-pointer"
              >
                <X className="size-4" />
              </button>
            </div>

            <form onSubmit={handleConfirmModifyLeave} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-[#F1F5F9] mb-1">Time Slot Window</label>
                <input
                  type="text"
                  defaultValue="02:00 PM - 06:00 PM PST (0.5 d)"
                  className="w-full px-3 py-2 rounded-xl border border-[#2A3446] font-bold"
                />
              </div>

              <div>
                <label className="block font-bold text-[#F1F5F9] mb-1">Backup Handover Note</label>
                <textarea
                  rows={3}
                  defaultValue="Designated peer: Active render queue supervision & creative sprint handoff."
                  className="w-full px-3 py-2 rounded-xl border border-[#2A3446] font-medium"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#2A3446]">
                <button
                  type="button"
                  onClick={() => setModifyModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-[#2A3446] font-bold text-[#F1F5F9] hover:bg-[#0B111C] cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-[#7FA0D6] hover:bg-blue-700 text-white font-bold shadow-xs cursor-pointer"
                >
                  Save Modifications
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: REQUEST TIME OFF / LEAVE */}
      {requestPtoModalOpen && (
        <div
          className="fixed inset-0 w-screen h-screen z-[99999] bg-slate-950/70 backdrop-blur-md flex items-center justify-center p-4 animate-fade-in"
          onClick={() => setRequestPtoModalOpen(false)}
        >
          <div
            className="w-full max-w-lg bg-[#161F2D] rounded-3xl p-6 sm:p-7 shadow-2xl border border-[#2A3446] space-y-4 animate-scale-up"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-[#2A3446] pb-3">
              <div className="flex items-center gap-2.5">
                <div className="size-9 rounded-2xl bg-[#7FA0D6]/15 text-[#7FA0D6] flex items-center justify-center font-bold">
                  <Plane className="size-4.5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-white">Request Time Off / Leave</h3>
                  <p className="text-xs text-[#97A0B3]">Auto-routes to {leadName} for {podName} capacity approval</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setRequestPtoModalOpen(false)}
                className="size-8 rounded-full bg-[#161F2D] hover:bg-slate-200 text-[#97A0B3] flex items-center justify-center cursor-pointer"
              >
                <X className="size-4" />
              </button>
            </div>

            <form onSubmit={handleSubmitQuickPto} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-bold text-[#F1F5F9] mb-1">Leave Type</label>
                <select
                  value={leaveType}
                  onChange={(e) => setLeaveType(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-[#2A3446] font-semibold bg-[#161F2D]"
                >
                  <option value="Paid Time Off (PTO) - 14.5d avail">Paid Time Off (PTO) — 14.5d available</option>
                  <option value="Sick & Medical Leave - 5.0d avail">Sick & Medical Leave — 5.0d available</option>
                  <option value="Floating & Comp Off - 2.0d avail">Floating & Comp Off — 2.0d available</option>
                  <option value="Emergency Personal Leave">Emergency Personal Leave</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-[#F1F5F9] mb-1">Start Date</label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-[#2A3446] font-medium"
                    required
                  />
                </div>
                <div>
                  <label className="block font-bold text-[#F1F5F9] mb-1">End Date</label>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-[#2A3446] font-medium"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-[#F1F5F9] mb-1">Designated Pod Backup</label>
                <select
                  value={designatedBackup}
                  onChange={(e) => setDesignatedBackup(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-[#2A3446] font-semibold bg-[#161F2D]"
                >
                  {members.length > 0 ? (
                    members.map((m) => (
                      <option key={m.id} value={`${m.full_name} (${m.role || "Specialist"})`}>
                        {m.full_name} ({m.role || "Specialist"})
                      </option>
                    ))
                  ) : (
                    <option value="Designated Pod Peer (Creative Specialist)">Designated Pod Peer (Creative Specialist)</option>
                  )}
                </select>
              </div>

              <div>
                <label className="block font-bold text-[#F1F5F9] mb-1">Handover & Pipeline Notes</label>
                <textarea
                  rows={2}
                  value={handoverNotes}
                  onChange={(e) => setHandoverNotes(e.target.value)}
                  placeholder="Specify render cache status, Figma keyframes, handoff link, or Figma prototype checkpoints..."
                  className="w-full px-3 py-2 rounded-xl border border-[#2A3446] font-medium"
                  required
                />
              </div>

              <div className="p-3 bg-[#7FA0D6]/15/70 rounded-2xl border border-[#7FA0D6]/30/60 flex items-center justify-between">
                <span className="font-bold text-blue-900">Quota Deduction:</span>
                <span className="font-black text-[#7FA0D6]">{deductionDays} Working Days</span>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#2A3446]">
                <button
                  type="button"
                  onClick={() => setRequestPtoModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-[#2A3446] font-bold text-[#F1F5F9] hover:bg-[#0B111C] cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-[#7FA0D6] hover:bg-blue-700 text-white font-bold shadow-xs cursor-pointer"
                >
                  Submit for Lead Approval
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: ZOOM ROOM */}
      {zoomModalOpen && (
        <div
          className="fixed inset-0 w-screen h-screen z-[99999] bg-slate-950/70 backdrop-blur-md flex items-center justify-center p-4 animate-fade-in"
          onClick={() => setZoomModalOpen(false)}
        >
          <div
            className="w-full max-w-md bg-[#161F2D] rounded-3xl p-6 sm:p-7 shadow-2xl border border-[#2A3446] space-y-4 animate-scale-up text-center"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="size-12 rounded-2xl bg-[#7FA0D6]/15 text-[#7FA0D6] flex items-center justify-center mx-auto font-black">
              📹
            </div>
            <div>
              <h3 className="text-base font-black text-white">Pod A Standup Session</h3>
              <p className="text-xs text-[#97A0B3] mt-1">Host: {leadName} ({podName} Lead)</p>
            </div>
            <div className="p-3 bg-[#0B111C] rounded-2xl border border-[#2A3446] text-xs font-mono text-[#F1F5F9]">
              zoom.us/j/9814421990
            </div>
            <div className="flex items-center justify-center gap-2 pt-2 border-t border-[#2A3446]">
              <button
                type="button"
                onClick={() => setZoomModalOpen(false)}
                className="px-4 py-2 rounded-xl border border-[#2A3446] font-bold text-xs text-[#F1F5F9] hover:bg-[#0B111C] cursor-pointer"
              >
                Dismiss
              </button>
              <button
                type="button"
                onClick={() => {
                  setZoomModalOpen(false);
                  showToast("Connecting to Standup video call...");
                }}
                className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-md shadow-blue-500/20 cursor-pointer"
              >
                Join Video Call
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
