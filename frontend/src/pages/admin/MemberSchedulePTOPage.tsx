import { useState } from "react";
import { useNavigate } from "react-router";
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

export function MemberSchedulePTOPage() {
  const navigate = useNavigate();

  // State
  const [ptoRemaining, setPtoRemaining] = useState(14.5);
  const [sickRemaining] = useState(5.0);
  const [compRemaining] = useState(2.0);

  const [toastMessage, setToastMessage] = useState<{ text: string; type: "success" | "info" } | null>(null);

  // Quick PTO Form
  const [leaveType, setLeaveType] = useState("Paid Time Off (PTO) - 14.5d avail");
  const [startDate, setStartDate] = useState("2025-11-17");
  const [endDate, setEndDate] = useState("2025-11-19");
  const [designatedBackup, setDesignatedBackup] = useState("Chloe Tan (Sr. Video Editor & 2D Motion)");
  const [handoverNotes, setHandoverNotes] = useState("Render queue supervision & emergency Northwind Labs 3D motion handoff.");
  const [deductionDays] = useState("3.0");

  // Modals
  const [requestPtoModalOpen, setRequestPtoModalOpen] = useState(false);
  const [modifyModalOpen, setModifyModalOpen] = useState(false);
  const [cancelModalOpen, setCancelModalOpen] = useState(false);
  const [zoomModalOpen, setZoomModalOpen] = useState(false);

  // Active Leave List
  const [activeRequests, setActiveRequests] = useState([
    {
      id: "req-1",
      title: "Medical Leave (Half Day)",
      status: "Pending Lead Approval (Maya Lin)",
      statusColor: "bg-blue-50 text-blue-700 border-blue-200",
      tag: "Low Sprint Impact · Approved Pairing",
      dateRange: "Tomorrow, Nov 8, 2025 · 02:00 PM - 06:00 PM PST (0.5 d)",
      backup: "Chloe Tan (Avail: Render Queue supervision & emergency Northwind Labs 3D motion handoff)",
    },
  ]);

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
      status: "Pending Lead Approval (Maya Lin)",
      statusColor: "bg-amber-50 text-amber-800 border-amber-200",
      tag: "Submitted · Maya Lin Notified",
      dateRange: `${startDate} to ${endDate} (${deductionDays} Working Days)`,
      backup: designatedBackup,
    };
    setActiveRequests([newReq, ...activeRequests]);
    setPtoRemaining((p) => Math.max(0, Number((p - parseFloat(deductionDays || "1")).toFixed(1))));
    showToast(`Submitted ${deductionDays}d PTO request to Maya Lin for approval!`);
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
    showToast("Updated medical leave notes and notified Maya Lin!");
  };

  return (
    <div data-surface="ops" className="min-h-screen bg-[#F8FAFC] text-slate-900 font-sans flex flex-col">
      {/* Top Header Navigation matching Admin */}
      <AdminTopHeader activeTab="My Schedule & PTO" />

      {/* Main Container */}
      <main className="flex-1 max-w-[1440px] w-full mx-auto px-3 sm:px-5 lg:px-6 py-3.5 pb-20 sm:pb-6 space-y-3.5 sm:space-y-4">
        {/* Toast Alert */}
        {toastMessage && (
          <div
            className={`p-3 rounded-xl border text-xs font-bold flex items-center justify-between shadow-lg animate-fade-in ${
              toastMessage.type === "info"
                ? "bg-blue-50 border-blue-200 text-blue-800"
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
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 bg-white p-2.5 sm:px-4 sm:py-2.5 rounded-2xl border border-slate-200/80 shadow-2xs">
          <div className="flex items-center gap-2">
            <span className="size-2 rounded-full bg-blue-500" />
            <span className="text-xs font-black text-slate-800 tracking-tight">LEAVE & CAPACITY LEDGER</span>
            <span className="text-[11px] text-slate-400 font-medium hidden sm:inline">• 2026 Annual Allocation & Coverage Pairing</span>
          </div>

          <button
            onClick={() => setRequestPtoModalOpen(true)}
            className="px-3 py-1.5 rounded-xl bg-[#2563EB] hover:bg-blue-700 text-white text-xs font-bold flex items-center justify-center gap-1.5 shadow-xs transition-all cursor-pointer w-full sm:w-auto"
          >
            <Plane className="size-3.5" />
            <span>Request Time Off / Leave</span>
          </button>
        </div>

        {/* 2. Top 3 Metric Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 sm:gap-3">
          {/* Paid Time Off */}
          <div className="bg-white rounded-xl sm:rounded-2xl p-2.5 sm:p-3 border border-slate-200/80 shadow-2xs flex flex-col justify-between">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[9px] sm:text-[10px] font-bold uppercase tracking-wider text-slate-400">
                PAID TIME OFF (PTO)
              </span>
              <div className="size-6 sm:size-7 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
                <Plane className="size-3 sm:size-3.5" />
              </div>
            </div>
            <div>
              <div className="flex items-baseline gap-1.5 mb-1">
                <span className="text-lg sm:text-xl font-black text-[#0F172A]">{ptoRemaining}</span>
                <span className="text-[10.5px] sm:text-[11px] font-bold text-slate-500">Days Left</span>
              </div>
              <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden my-1">
                <div className="h-full bg-blue-600 rounded-full w-[72%]" />
              </div>
              <div className="flex items-center justify-between pt-1 border-t border-slate-100 text-slate-500 font-medium text-[10px] sm:text-[11px]">
                <span>Used: 5.5 d</span>
                <span>20 d Annual</span>
              </div>
            </div>
          </div>

          {/* Sick & Medical */}
          <div className="bg-white rounded-xl sm:rounded-2xl p-2.5 sm:p-3 border border-slate-200/80 shadow-2xs flex flex-col justify-between">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[9px] sm:text-[10px] font-bold uppercase tracking-wider text-slate-400">
                SICK & MEDICAL
              </span>
              <div className="size-6 sm:size-7 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
                <Shield className="size-3 sm:size-3.5" />
              </div>
            </div>
            <div>
              <div className="flex items-baseline gap-1.5 mb-1">
                <span className="text-lg sm:text-xl font-black text-[#0F172A]">{sickRemaining}</span>
                <span className="text-[10.5px] sm:text-[11px] font-bold text-slate-500">Days Available</span>
              </div>
              <div className="flex items-center justify-between pt-1.5 border-t border-slate-100">
                <span className="font-bold text-blue-600 text-[10px] sm:text-[11px]">● 1 pending half-day</span>
              </div>
            </div>
          </div>

          {/* Floating & Comp */}
          <div className="bg-white rounded-xl sm:rounded-2xl p-2.5 sm:p-3 border border-slate-200/80 shadow-2xs flex flex-col justify-between">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[9px] sm:text-[10px] font-bold uppercase tracking-wider text-slate-400">
                FLOATING & COMP
              </span>
              <div className="size-6 sm:size-7 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
                <Calendar className="size-3 sm:size-3.5" />
              </div>
            </div>
            <div>
              <div className="flex items-baseline gap-1.5 mb-1">
                <span className="text-lg sm:text-xl font-black text-[#0F172A]">{compRemaining}</span>
                <span className="text-[10.5px] sm:text-[11px] font-bold text-slate-500">Days Available</span>
              </div>
              <div className="flex items-center justify-between pt-1.5 border-t border-slate-100 text-slate-500 text-[10px] sm:text-[11px]">
                <span>Valid until Dec 31, 2025</span>
              </div>
            </div>
          </div>
        </div>

        {/* 3. Main Grid (Left 2/3, Right 1/3) */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-3.5 sm:gap-4 items-start">
          {/* LEFT 2 COLUMNS */}
          <div className="lg:col-span-2 space-y-3.5 sm:space-y-4">
            {/* Active & Historical Leave Requests */}
            <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200/80 shadow-2xs space-y-3">
              <div className="flex items-center justify-between pb-2.5 border-b border-slate-100">
                <div>
                  <h2 className="text-sm font-black text-[#0F172A]">Active & Historical Leave Requests</h2>
                  <p className="text-[11px] text-slate-400">Automated handoff telemetry linked directly to Pod A render pipelines</p>
                </div>
                <button
                  onClick={() => showToast("Exported PTO Audit Log CSV report", "success")}
                  className="text-[11px] font-bold text-blue-600 hover:underline cursor-pointer"
                >
                  Export Audit Log
                </button>
              </div>

              {/* Active Requests List */}
              <div className="space-y-2.5">
                {activeRequests.map((req) => (
                  <div key={req.id} className="p-3 sm:p-3.5 rounded-xl bg-blue-50/40 border border-blue-200/70 space-y-2.5">
                    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2">
                      <div className="flex items-start gap-2.5">
                        <div className="size-8 rounded-lg bg-blue-600 text-white flex items-center justify-center shrink-0 text-xs font-black">
                          ⚡
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h4 className="text-xs font-black text-[#0F172A]">{req.title}</h4>
                            <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-blue-100 text-blue-800">
                              {req.status}
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-500 mt-0.5">{req.dateRange}</p>
                        </div>
                      </div>
                      <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 self-start">
                        {req.tag}
                      </span>
                    </div>

                    <div className="p-2.5 bg-white rounded-xl border border-slate-200 text-xs text-slate-600 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div>
                        <span className="font-bold text-slate-800">Designated Pod Backup:</span>{" "}
                        <span className="text-[11px]">{req.backup}</span>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          onClick={() => setModifyModalOpen(true)}
                          className="px-2.5 py-1 rounded-lg border border-slate-200 text-slate-700 text-xs font-bold hover:bg-slate-50 cursor-pointer"
                        >
                          Modify Request
                        </button>
                        <button
                          onClick={() => setCancelModalOpen(true)}
                          className="px-2.5 py-1 rounded-lg border border-rose-200 text-rose-600 hover:bg-rose-50 text-xs font-bold cursor-pointer"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  </div>
                ))}

                {activeRequests.length === 0 && (
                  <div className="p-4 text-center text-xs text-slate-400 font-semibold border-2 border-dashed border-slate-200 rounded-xl">
                    No pending leave requests. You are active on all upcoming sprint shifts.
                  </div>
                )}
              </div>

              {/* Past Requests */}
              <div className="pt-2 space-y-2">
                <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  PAST REQUESTS (SPRINT CYCLES 07 – 09)
                </div>

                <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2.5">
                    <div className="size-7 rounded-lg bg-slate-200 text-slate-600 flex items-center justify-center font-bold text-xs">
                      🏖️
                    </div>
                    <div>
                      <div className="font-bold text-slate-800">Annual Leave – 3 Days</div>
                      <div className="text-[11px] text-slate-400">Oct 12 – Oct 14, 2025 • Covered by Chloe Tan</div>
                    </div>
                  </div>
                  <span className="px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 font-bold text-[10px]">
                    Approved & Completed
                  </span>
                </div>

                <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2.5">
                    <div className="size-7 rounded-lg bg-slate-200 text-slate-600 flex items-center justify-center font-bold text-xs">
                      🎉
                    </div>
                    <div>
                      <div className="font-bold text-slate-800">Floating Holiday – 1 Day</div>
                      <div className="text-[11px] text-slate-400">Sep 22, 2025 • Standup asynchronous catchup</div>
                    </div>
                  </div>
                  <span className="px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 font-bold text-[10px]">
                    Approved & Completed
                  </span>
                </div>
              </div>
            </div>

            {/* November 2025 Calendar Grid */}
            <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200/80 shadow-2xs space-y-3">
              <div className="flex items-center justify-between pb-2.5 border-b border-slate-100">
                <div className="flex items-center gap-2.5">
                  <h3 className="text-sm font-black text-[#0F172A]">November 2025</h3>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
                    Sprint 09 / Week 45-46
                  </span>
                </div>

                <div className="flex items-center gap-1">
                  <button className="p-1 rounded-lg hover:bg-slate-100 text-slate-500">
                    <ChevronLeft className="size-4" />
                  </button>
                  <span className="text-xs font-bold text-slate-700 px-1.5">Nov 2025</span>
                  <button className="p-1 rounded-lg hover:bg-slate-100 text-slate-500">
                    <ChevronRight className="size-4" />
                  </button>
                </div>
              </div>

              {/* Legend */}
              <div className="flex flex-wrap items-center gap-3 text-[10px] font-bold text-slate-500">
                <span className="flex items-center gap-1">
                  <span className="size-2 rounded-full bg-blue-600" />
                  Duty / On-Deck
                </span>
                <span className="flex items-center gap-1">
                  <span className="size-2 rounded-full bg-amber-500" />
                  Leave / Pending Off
                </span>
                <span className="flex items-center gap-1">
                  <span className="size-2 rounded-full bg-rose-500" />
                  Sprint Deadline Lock
                </span>
                <span className="flex items-center gap-1">
                  <span className="size-2 rounded-full bg-emerald-500" />
                  Maya Lin (Pod Lead Active)
                </span>
              </div>

              {/* Calendar Grid */}
              <div className="grid grid-cols-7 gap-1.5 text-center text-xs">
                {["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"].map((d) => (
                  <div key={d} className="font-bold text-slate-400 text-[10px] py-0.5">
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
                    className={`min-h-[48px] p-1 rounded-lg border flex flex-col justify-between transition-colors ${
                      item.today
                        ? "bg-blue-50/80 border-blue-400 font-black shadow-2xs ring-1 ring-blue-500/20"
                        : item.holiday
                        ? "bg-purple-50 border-purple-200 text-purple-800"
                        : item.warn
                        ? "bg-amber-50 border-amber-300 text-amber-900"
                        : item.alert
                        ? "bg-rose-50 border-rose-200 text-rose-800"
                        : item.muted
                        ? "bg-slate-50/40 border-slate-100 text-slate-300"
                        : "bg-white border-slate-100 hover:border-slate-300 text-slate-700"
                    }`}
                  >
                    <span className="text-[10px] font-bold text-left">{item.day}</span>
                    {item.label && (
                      <span
                        className={`text-[8.5px] font-black rounded px-1 py-0.2 truncate ${
                          item.today
                            ? "bg-blue-600 text-white"
                            : item.warn
                            ? "bg-amber-200 text-amber-900"
                            : item.alert
                            ? "bg-rose-200 text-rose-900"
                            : item.holiday
                            ? "bg-purple-200 text-purple-900"
                            : "bg-slate-100 text-slate-600"
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
            <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200/80 shadow-2xs space-y-3">
              <div className="flex items-center justify-between pb-2.5 border-b border-slate-100">
                <div>
                  <h3 className="text-xs font-black text-[#0F172A]">Today's Pod Schedule</h3>
                  <p className="text-[10px] text-slate-400 font-medium">Monday, Nov 3 • Core Hours (09:00 - 18:00)</p>
                </div>
                <span className="px-1.5 py-0.5 rounded-full text-[9px] font-black bg-emerald-50 text-emerald-700 border border-emerald-200">
                  ● Active Shift
                </span>
              </div>

              {/* Schedule Items */}
              <div className="space-y-2 text-xs">
                <div className="p-2.5 rounded-xl bg-blue-50/60 border border-blue-200/80 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-blue-950 text-[11px]">10:00 AM – 10:30 AM</span>
                    <span className="px-1.5 py-0.2 rounded text-[8.5px] font-black bg-blue-600 text-white uppercase">
                      Mandatory
                    </span>
                  </div>
                  <div className="font-black text-slate-900 text-xs">Pod A Daily Standup</div>
                  <div className="text-[10.5px] text-slate-500">Sprint 09 Blocker Sweep & render server allocation</div>
                  <div className="flex items-center justify-between pt-1 border-t border-blue-200/50 text-[11px]">
                    <button
                      onClick={() => setZoomModalOpen(true)}
                      className="text-blue-600 font-bold hover:underline cursor-pointer"
                    >
                      🔗 Join Zoom Session
                    </button>
                    <span className="text-[10px] text-slate-400">5 Attendees</span>
                  </div>
                </div>

                <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200/80 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-800 text-[11px]">01:30 PM – 02:15 PM</span>
                    <span className="text-[10px] text-slate-400">Conf Room 3</span>
                  </div>
                  <div className="font-black text-slate-900 text-xs">Creative Handoff: Northwind Labs</div>
                  <div className="text-[10.5px] text-slate-500">3D Renders presentation with Product Lead</div>
                  <div className="flex items-center justify-between pt-1 border-t border-slate-100 text-[10px] text-slate-400">
                    <span>Handoff Cut v.1.0</span>
                    <span className="text-emerald-600 font-bold">Motion QA Ready</span>
                  </div>
                </div>

                <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200/80 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-800 text-[11px]">04:00 PM – 05:00 PM</span>
                    <span className="text-[10px] text-slate-400">Designated Window</span>
                  </div>
                  <div className="font-black text-slate-900 text-xs">Lead Review & Quality Sign-Off</div>
                  <div className="text-[10.5px] text-slate-500">Synchronous review block with Maya Lin</div>
                </div>
              </div>
            </div>

            {/* Pod Redundancy Partner */}
            <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200/80 shadow-2xs space-y-2.5">
              <div className="flex items-center justify-between pb-1.5 border-b border-slate-100">
                <div className="flex items-center gap-1.5">
                  <Shield className="size-3.5 text-blue-600" />
                  <h3 className="text-xs font-black text-[#0F172A]">Pod Redundancy Partner</h3>
                </div>
              </div>

              <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200/70 flex items-center gap-2.5">
                <div className="size-9 rounded-xl bg-teal-600 text-white font-black text-xs flex items-center justify-center shrink-0 shadow-2xs">
                  CT
                </div>
                <div>
                  <div className="font-black text-slate-900 text-xs">Chloe Tan</div>
                  <div className="text-[10.5px] text-slate-500 font-medium">Sr. Video Editor & 2D Motion</div>
                  <span className="inline-block mt-0.5 text-[9.5px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.2 rounded">
                    ● Available for pairing
                  </span>
                </div>
              </div>

              <div className="text-xs text-slate-500 space-y-0.5">
                <div className="font-bold text-slate-800 text-[11px]">Handoff Protocol Active:</div>
                <p className="leading-snug text-[10.5px]">
                  Automatic render queue forwarding to Chloe's node triggered whenever status is switched to <strong>Out of Office (Away)</strong>.
                </p>
              </div>

              <button
                onClick={() => {
                  navigate("/slack");
                }}
                className="w-full py-2 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-bold transition-colors cursor-pointer flex items-center justify-center gap-1.5"
              >
                <MessageSquare className="size-3.5" />
                Ping Chloe on Slack
              </button>
            </div>

            {/* Submit Quick PTO Form */}
            <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200/80 shadow-2xs space-y-3">
              <div className="flex items-center justify-between pb-1.5 border-b border-slate-100">
                <div className="flex items-center gap-1.5">
                  <Plane className="size-3.5 text-blue-600" />
                  <h3 className="text-xs font-black text-[#0F172A]">Submit Quick PTO</h3>
                </div>
                <span className="text-[10px] text-slate-400 font-medium">Auto-routed</span>
              </div>

              <form onSubmit={handleSubmitQuickPto} className="space-y-2.5 text-xs">
                <div>
                  <label className="block font-bold text-slate-700 mb-1 text-[11px]">Leave Type</label>
                  <select
                    value={leaveType}
                    onChange={(e) => setLeaveType(e.target.value)}
                    className="w-full px-2.5 py-1.5 rounded-xl border border-slate-200 font-semibold bg-white text-xs"
                  >
                    <option value="Paid Time Off (PTO) - 14.5d avail">Paid Time Off (PTO) – 14.5d avail</option>
                    <option value="Sick & Medical Leave - 5.0d avail">Sick & Medical Leave – 5.0d avail</option>
                    <option value="Floating Holiday - 2.0d avail">Floating Holiday – 2.0d avail</option>
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1 text-[11px]">Start Date</label>
                    <input
                      type="date"
                      required
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      className="w-full px-2 py-1 rounded-xl border border-slate-200 font-bold text-xs"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-slate-700 mb-1 text-[11px]">End Date</label>
                    <input
                      type="date"
                      required
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                      className="w-full px-2 py-1 rounded-xl border border-slate-200 font-bold text-xs"
                    />
                  </div>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1 text-[11px]">Designated Pod Backup</label>
                  <select
                    value={designatedBackup}
                    onChange={(e) => setDesignatedBackup(e.target.value)}
                    className="w-full px-2.5 py-1.5 rounded-xl border border-slate-200 font-semibold bg-white text-xs"
                  >
                    <option value="Chloe Tan (Sr. Video Editor & 2D Motion)">Chloe Tan (Sr. Video Editor & 2D Motion)</option>
                    <option value="Elena Ortiz (Brand Designer)">Elena Ortiz (Brand Designer)</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1 text-[11px]">Handover & Pipeline Notes</label>
                  <textarea
                    rows={2}
                    value={handoverNotes}
                    onChange={(e) => setHandoverNotes(e.target.value)}
                    placeholder="Specify render cache status, handoff link, or Figma checkpoints..."
                    className="w-full px-2.5 py-1.5 rounded-xl border border-slate-200 font-medium text-xs"
                  />
                </div>

                <div className="flex justify-between items-center text-[10.5px] font-bold text-slate-500 pt-0.5">
                  <span>Quota Deduction:</span>
                  <span className="text-slate-900">{deductionDays} Working Days</span>
                </div>

                <button
                  type="submit"
                  className="w-full py-2 rounded-xl bg-[#2563EB] hover:bg-blue-700 text-white font-bold shadow-xs transition-all cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <Send className="size-3" />
                  Submit for Lead Approval
                </button>
              </form>
            </div>
          </div>
        </div>

        {/* Footer */}
        <footer className="pt-4 pb-2 border-t border-slate-200/80 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500 gap-2">
          <div className="flex items-center gap-2">
            <span className="font-black text-slate-900">creo.</span>
            <span>Team Member Workstation – Pod A Studio Operations</span>
          </div>
          <div className="flex items-center gap-4 text-[11px]">
            <span>© 2025 Creo Design Systems. Confidential</span>
            <span className="hover:underline cursor-pointer">Security & Compliance</span>
          </div>
        </footer>
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
            className="w-full max-w-md bg-white rounded-3xl p-6 sm:p-7 shadow-2xl border border-slate-100 space-y-4 animate-scale-up text-center"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="size-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mx-auto font-black">
              <X className="size-6" />
            </div>
            <div>
              <h3 className="text-base font-black text-slate-900">Cancel Medical Leave Request?</h3>
              <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                This will withdraw your tomorrow half-day leave request, notify Maya Lin, and restore 0.5d back to your medical balance.
              </p>
            </div>

            <div className="flex items-center justify-center gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setCancelModalOpen(false)}
                className="px-4 py-2 rounded-xl border border-slate-200 font-bold text-xs text-slate-600 hover:bg-slate-50 cursor-pointer"
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
            className="w-full max-w-md bg-white rounded-3xl p-6 sm:p-7 shadow-2xl border border-slate-100 space-y-4 animate-scale-up"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="size-9 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
                  <Calendar className="size-4.5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900">Modify Leave Request</h3>
                  <p className="text-xs text-slate-500">Medical Leave (Half Day) · Nov 8, 2025</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setModifyModalOpen(false)}
                className="size-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center cursor-pointer"
              >
                <X className="size-4" />
              </button>
            </div>

            <form onSubmit={handleConfirmModifyLeave} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Time Slot Window</label>
                <input
                  type="text"
                  defaultValue="02:00 PM - 06:00 PM PST (0.5 d)"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 font-bold"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Backup Handover Note</label>
                <textarea
                  rows={3}
                  defaultValue="Chloe Tan: Render Queue supervision & emergency Northwind Labs 3D motion handoff."
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 font-medium"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setModifyModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 font-bold text-slate-600 hover:bg-slate-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-[#2563EB] hover:bg-blue-700 text-white font-bold shadow-xs cursor-pointer"
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
            className="w-full max-w-lg bg-white rounded-3xl p-6 sm:p-7 shadow-2xl border border-slate-100 space-y-4 animate-scale-up"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="size-9 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
                  <Plane className="size-4.5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900">Request Time Off / Leave</h3>
                  <p className="text-xs text-slate-500">Auto-routes to Maya Lin for Pod A capacity approval</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setRequestPtoModalOpen(false)}
                className="size-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center cursor-pointer"
              >
                <X className="size-4" />
              </button>
            </div>

            <form onSubmit={handleSubmitQuickPto} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Leave Type</label>
                <select
                  value={leaveType}
                  onChange={(e) => setLeaveType(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 font-semibold bg-white"
                >
                  <option value="Paid Time Off (PTO) - 14.5d avail">Paid Time Off (PTO) — 14.5d available</option>
                  <option value="Sick & Medical Leave - 5.0d avail">Sick & Medical Leave — 5.0d available</option>
                  <option value="Floating & Comp Off - 2.0d avail">Floating & Comp Off — 2.0d available</option>
                  <option value="Emergency Personal Leave">Emergency Personal Leave</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Start Date</label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 font-medium"
                    required
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">End Date</label>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 font-medium"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Designated Pod Backup</label>
                <select
                  value={designatedBackup}
                  onChange={(e) => setDesignatedBackup(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 font-semibold bg-white"
                >
                  <option value="Chloe Tan (Sr. Video Editor & 2D Motion)">Chloe Tan (Sr. Video Editor & 2D Motion)</option>
                  <option value="Elena Ortiz (Brand Designer - Pod A)">Elena Ortiz (Brand Designer - Pod A)</option>
                  <option value="Marcus Vance (Copy Lead - Pod A)">Marcus Vance (Copy Lead - Pod A)</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Handover & Pipeline Notes</label>
                <textarea
                  rows={2}
                  value={handoverNotes}
                  onChange={(e) => setHandoverNotes(e.target.value)}
                  placeholder="Specify render cache status, Figma keyframes, handoff link, or Figma prototype checkpoints..."
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 font-medium"
                  required
                />
              </div>

              <div className="p-3 bg-blue-50/70 rounded-2xl border border-blue-200/60 flex items-center justify-between">
                <span className="font-bold text-blue-900">Quota Deduction:</span>
                <span className="font-black text-blue-700">{deductionDays} Working Days</span>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setRequestPtoModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 font-bold text-slate-600 hover:bg-slate-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-[#2563EB] hover:bg-blue-700 text-white font-bold shadow-xs cursor-pointer"
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
            className="w-full max-w-md bg-white rounded-3xl p-6 sm:p-7 shadow-2xl border border-slate-100 space-y-4 animate-scale-up text-center"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="size-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center mx-auto font-black">
              📹
            </div>
            <div>
              <h3 className="text-base font-black text-slate-900">Pod A Standup Session</h3>
              <p className="text-xs text-slate-500 mt-1">Host: Maya Lin (Pod A Lead)</p>
            </div>
            <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100 text-xs font-mono text-slate-700">
              zoom.us/j/9814421990
            </div>
            <div className="flex items-center justify-center gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setZoomModalOpen(false)}
                className="px-4 py-2 rounded-xl border border-slate-200 font-bold text-xs text-slate-600 hover:bg-slate-50 cursor-pointer"
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
