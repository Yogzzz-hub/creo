import { useState } from "react";
import { Link, useNavigate } from "react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { AdminQueueData } from "@/types/ops";
import { fetchLeaveRequests, approveLeaveRequest, rejectLeaveRequest } from "@/lib/ops-api";

interface TeamDetailsWidgetProps {
  queue: AdminQueueData | null;
}

export function TeamDetailsWidget({ queue: _queue }: TeamDetailsWidgetProps) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [toast, setToast] = useState<string | null>(null);

  // Fetch leave requests
  const { data: leavesData } = useQuery({
    queryKey: ["admin_leave_requests"],
    queryFn: fetchLeaveRequests,
  });

  // Fallback / mock leave requests matching the exact design if none exist
  const [localLeaves, setLocalLeaves] = useState([
    {
      id: "leave-1",
      user_name: "Sarah Jenkins",
      pod: "Pod B",
      avatar: "SJ",
      avatarBg: "bg-[#1E293B]",
      type: "Sick Leave",
      dates: "Oct 24–25 (2d)",
      status: "pending",
    },
    {
      id: "leave-2",
      user_name: "Lena Ortiz",
      pod: "Pod C",
      avatar: "LO",
      avatarBg: "bg-[#4F46E5]",
      type: "Annual Vacation",
      dates: "Nov 03–07 (5d)",
      status: "pending",
    },
  ]);

  const approveMutation = useMutation({
    mutationFn: approveLeaveRequest,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["admin_leave_requests"] }),
  });

  const rejectMutation = useMutation({
    mutationFn: rejectLeaveRequest,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["admin_leave_requests"] }),
  });

  const handleApproveLeave = (e: React.MouseEvent, id: string, name: string) => {
    e.stopPropagation();
    approveMutation.mutate(id);
    setLocalLeaves((prev) => prev.filter((l) => l.id !== id));
    setToast(`Approved leave request for ${name}`);
    setTimeout(() => setToast(null), 3000);
  };

  const handleDeclineLeave = (e: React.MouseEvent, id: string, name: string) => {
    e.stopPropagation();
    rejectMutation.mutate(id);
    setLocalLeaves((prev) => prev.filter((l) => l.id !== id));
    setToast(`Declined leave request for ${name}`);
    setTimeout(() => setToast(null), 3000);
  };

  // 4 Standard Pods matching the design
  const defaultPods = [
    {
      id: "pod-a",
      name: "Pod A",
      letter: "A",
      lead: "Maya Lin",
      ratio: "4/4",
      completed: 58,
      pending: 6,
      percentage: 91,
      color: "bg-blue-600",
      textColor: "text-blue-600",
      badgeColor: "bg-blue-50 text-blue-600",
      progressBg: "bg-blue-600",
    },
    {
      id: "pod-b",
      name: "Pod B",
      letter: "B",
      lead: "Omar Va...",
      ratio: "3/4",
      completed: 62,
      pending: 4,
      percentage: 94,
      color: "bg-[#0EA5E9]",
      textColor: "text-[#0EA5E9]",
      badgeColor: "bg-sky-50 text-sky-600",
      progressBg: "bg-[#0EA5E9]",
    },
    {
      id: "pod-c",
      name: "Pod C",
      letter: "C",
      lead: "Lena Ortiz",
      ratio: "3/4",
      completed: 48,
      pending: 9,
      percentage: 84,
      color: "bg-[#6366F1]",
      textColor: "text-[#6366F1]",
      badgeColor: "bg-indigo-50 text-indigo-600",
      progressBg: "bg-[#6366F1]",
    },
    {
      id: "pod-d",
      name: "Pod D",
      letter: "D",
      lead: "Theo Cla...",
      ratio: "4/4",
      completed: 50,
      pending: 5,
      percentage: 91,
      color: "bg-[#1E293B]",
      textColor: "text-[#1E293B]",
      badgeColor: "bg-slate-100 text-slate-700",
      progressBg: "bg-[#1E293B]",
    },
  ];

  const pendingLeavesList =
    leavesData && leavesData.filter((l) => l.status === "pending").length > 0
      ? leavesData
          .filter((l) => l.status === "pending")
          .map((l) => ({
            id: l.id,
            user_name: l.user_name || "Team Member",
            pod: "Pod A",
            avatar: (l.user_name || "TM").slice(0, 2).toUpperCase(),
            avatarBg: "bg-[#1E293B]",
            type: l.reason || "Personal Leave",
            dates: `${l.start_date || "Oct 24"} - ${l.end_date || "Oct 25"}`,
            status: l.status,
          }))
      : localLeaves;

  return (
    <div
      onClick={() => navigate("/admin/team")}
      className="bg-white rounded-3xl border border-gray-100 shadow-[0_2px_10px_rgba(0,0,0,0.04)] hover:shadow-xl hover:border-blue-200/80 transition-all p-6 lg:p-7 flex flex-col w-full h-full font-sans cursor-pointer group"
    >
      {/* Toast Feedback */}
      {toast && (
        <div className="mb-4 px-4 py-2 bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-bold rounded-xl animate-fade-in flex items-center justify-between" onClick={(e) => e.stopPropagation()}>
          <span>{toast}</span>
          <button onClick={() => setToast(null)} className="text-emerald-500 hover:text-emerald-800">
            &times;
          </button>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div>
          <h2 className="text-lg font-bold text-gray-900 group-hover:text-blue-600 transition-colors tracking-tight">Team Details</h2>
          <p className="text-xs text-gray-400 font-medium mt-0.5">Team structure, ownership, and delivery status</p>
        </div>
        <span className="px-3 py-1 rounded-full text-xs font-bold text-blue-600 bg-blue-50/80 border border-blue-100/80">
          9 teams
        </span>
      </div>

      {/* Top 4 Metrics Row */}
      <div className="grid grid-cols-4 gap-2.5 sm:gap-3 mb-6">
        <div className="bg-[#F8FAFC] border border-gray-100/80 rounded-2xl py-3 px-2 flex flex-col items-center justify-center text-center">
          <span className="text-xl sm:text-2xl font-black text-gray-900 tracking-tight">9</span>
          <span className="text-[10px] text-gray-400 font-bold mt-0.5">Teams</span>
        </div>
        <div className="bg-[#F8FAFC] border border-gray-100/80 rounded-2xl py-3 px-2 flex flex-col items-center justify-center text-center">
          <span className="text-xl sm:text-2xl font-black text-gray-900 tracking-tight">36</span>
          <span className="text-[10px] text-gray-400 font-bold mt-0.5">Members</span>
        </div>
        <div className="bg-[#F8FAFC] border border-gray-100/80 rounded-2xl py-3 px-2 flex flex-col items-center justify-center text-center">
          <span className="text-xl sm:text-2xl font-black text-gray-900 tracking-tight">32</span>
          <span className="text-[10px] text-gray-400 font-bold mt-0.5">Active</span>
        </div>
        <div className="bg-[#F8FAFC] border border-gray-100/80 rounded-2xl py-3 px-2 flex flex-col items-center justify-center text-center">
          <span className="text-xl sm:text-2xl font-black text-gray-900 tracking-tight">486</span>
          <span className="text-[10px] text-gray-400 font-bold mt-0.5">Tasks Done</span>
        </div>
      </div>

      {/* 2x2 Pods Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 mb-6 flex-1 overflow-y-auto min-h-0 pr-1 custom-scrollbar">
        {defaultPods.map((pod) => (
          <div
            key={pod.id}
            className="border border-gray-100/90 rounded-2xl p-5 bg-white shadow-[0_2px_10px_rgba(0,0,0,0.02)] flex flex-col justify-between hover:border-blue-100 transition-all"
          >
            <div>
              {/* Pod Header */}
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2.5">
                  <div className={`w-8 h-8 rounded-xl ${pod.color} text-white font-black text-xs flex items-center justify-center shrink-0`}>
                    {pod.letter}
                  </div>
                  <div className="flex flex-col">
                    <span className="text-xs font-bold text-gray-900 leading-snug">{pod.name}</span>
                    <span className="text-[10px] text-gray-400 font-medium">{pod.lead}</span>
                  </div>
                </div>

                <div className={`flex items-center gap-1 text-[10px] font-bold ${pod.badgeColor} px-2 py-0.5 rounded-full`}>
                  <span className="w-1.5 h-1.5 rounded-full bg-current" />
                  {pod.ratio}
                </div>
              </div>

              {/* Stats Line */}
              <div className="flex items-center justify-between text-[10px] text-gray-400 font-semibold mb-2">
                <span>{pod.completed} Comp · {pod.pending} Pend</span>
                <span className={`text-[11px] font-black ${pod.textColor}`}>{pod.percentage}%</span>
              </div>
            </div>

            {/* Progress Bar */}
            <div className="w-full bg-gray-100 h-1.5 rounded-full overflow-hidden">
              <div className={`h-full ${pod.progressBg} rounded-full`} style={{ width: `${pod.percentage}%` }} />
            </div>
          </div>
        ))}
      </div>

      {/* Pending Leave Requests Section */}
      <div className="bg-[#F6F9FD] border border-blue-100/60 rounded-3xl p-4 space-y-3 mb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-blue-600" />
            <h3 className="text-xs font-bold text-gray-900">Pending Leave Requests</h3>
          </div>
          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold text-blue-600 bg-white border border-blue-100 shadow-2xs">
            {pendingLeavesList.length} to review
          </span>
        </div>

        <div className="space-y-2">
          {pendingLeavesList.map((leave) => (
            <div
              key={leave.id}
              className="bg-white border border-gray-100/80 rounded-2xl p-3 flex items-center justify-between shadow-[0_1px_3px_rgba(0,0,0,0.02)] hover:border-gray-200 transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className={`w-8 h-8 rounded-full ${leave.avatarBg} text-white font-bold text-xs flex items-center justify-center shrink-0`}>
                  {leave.avatar}
                </div>
                <div className="flex flex-col">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-bold text-gray-900">{leave.user_name}</span>
                    <span className="text-[10px] text-gray-400 font-medium">({leave.pod})</span>
                  </div>
                  <span className="text-[10px] text-gray-400 font-medium">
                    {leave.type} · {leave.dates}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-1.5 shrink-0" onClick={(e) => e.stopPropagation()}>
                <button
                  onClick={(e) => handleApproveLeave(e, leave.id, leave.user_name)}
                  className="px-3.5 py-1.5 text-xs font-bold bg-blue-600 text-white rounded-xl shadow-sm shadow-blue-500/10 hover:bg-blue-700 transition-colors cursor-pointer"
                >
                  Approve
                </button>
                <button
                  onClick={(e) => handleDeclineLeave(e, leave.id, leave.user_name)}
                  className="px-2.5 py-1.5 text-xs font-semibold text-gray-500 hover:text-gray-800 transition-colors cursor-pointer"
                >
                  Decline
                </button>
              </div>
            </div>
          ))}

          {pendingLeavesList.length === 0 && (
            <div className="text-center py-3 text-xs font-medium text-gray-400">
              No pending leave requests.
            </div>
          )}
        </div>
      </div>

      {/* Footer */}
      <div className="pt-3 border-t border-gray-100/60 flex items-center justify-end text-xs" onClick={(e) => e.stopPropagation()}>
        <Link
          to="/admin/team"
          onClick={(e) => e.stopPropagation()}
          className="text-blue-600 font-bold hover:text-blue-800 transition-colors flex items-center gap-1"
        >
          Manage teams &rarr;
        </Link>
      </div>
    </div>
  );
}
