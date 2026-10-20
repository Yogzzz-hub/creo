import { useNavigate, Link } from "react-router";
import { useQuery } from "@tanstack/react-query";
import { AdminQueueData } from "@/types/ops";
import { fetchLeaveRequests } from "@/lib/ops-api";
import { Users, CalendarCheck, ShieldCheck, ArrowUpRight } from "lucide-react";

interface TeamDetailsWidgetProps {
  queue: AdminQueueData | null;
}

export function TeamDetailsWidget({ queue: _queue }: TeamDetailsWidgetProps) {
  const navigate = useNavigate();

  // Fetch leave requests for live counter
  const { data: leavesData } = useQuery({
    queryKey: ["admin_leave_requests"],
    queryFn: fetchLeaveRequests,
  });

  const pendingLeavesCount = leavesData ? leavesData.filter((l) => l.status === "pending").length : 0;
  const activeMembersCount = _queue?.staff?.length ?? 18;
  const activePodsCount = 3;

  return (
    <div
      onClick={() => navigate("/admin/team")}
      className="bg-[#161F2D] rounded-3xl border border-[#2A3446] shadow-xl hover:border-[#7FA0D6]/60 hover:shadow-[0_0_25px_rgba(127,160,214,0.15)] transition-all duration-300 p-4 sm:p-5 flex flex-col justify-between w-full h-full font-sans cursor-pointer group hover-card-innovative overflow-hidden text-white"
    >
      {/* Header Row */}
      <div className="flex items-center justify-between mb-3 pb-2.5 border-b border-[#2A3446]/80 shrink-0 gap-2">
        <div className="min-w-0">
          <h2 className="text-sm sm:text-base font-black text-white group-hover:text-[#7FA0D6] transition-colors tracking-tight flex items-center gap-1.5 truncate">
            Team Details & Roster
            <ArrowUpRight className="w-4 h-4 text-[#97A0B3] group-hover:text-[#7FA0D6] transition-colors shrink-0" />
          </h2>
          <p className="text-xs text-[#97A0B3] font-medium truncate">Pod structure, staffing & office presence</p>
        </div>
        <span className="shrink-0 min-w-max px-3 py-1 rounded-full text-xs font-extrabold text-[#7FA0D6] bg-[#7FA0D6]/15 border border-[#7FA0D6]/30 hover:bg-[#7FA0D6]/25 hover:border-[#7FA0D6]/60 transition-all cursor-pointer">
          {activePodsCount} Pods
        </span>
      </div>

      {/* 3 Subboxes (Active Pods, Team Members, Leave Approvals) */}
      <div className="flex-1 grid grid-cols-3 gap-1.5 sm:gap-3 my-2 sm:my-2.5">
        {/* Box 1: Active Pods */}
        <Link
          to="/admin/team"
          onClick={(e) => e.stopPropagation()}
          className="bg-[#0B111C] hover:bg-[#161F2D] border border-[#2A3446] hover:border-[#7FA0D6]/60 hover:scale-[1.02] hover:-translate-y-0.5 hover:shadow-[0_0_20px_rgba(127,160,214,0.18)] rounded-xl sm:rounded-2xl p-2 sm:p-3.5 flex flex-col justify-between h-full transition-all duration-200 group/box cursor-pointer shadow-md overflow-hidden"
        >
          <div className="flex items-center justify-between gap-1 w-full">
            <div className="flex items-center gap-1.5 sm:gap-2 min-w-0 flex-1">
              <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-lg sm:rounded-xl bg-blue-600/20 text-[#7FA0D6] flex items-center justify-center font-bold group-hover/box:scale-110 transition-transform shrink-0">
                <ShieldCheck className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              </div>
              <h3 className="text-[10px] sm:text-xs font-extrabold text-white group-hover/box:text-[#7FA0D6] transition-colors truncate">
                Pods
              </h3>
            </div>
          </div>

          <div className="my-1.5 sm:my-2 flex flex-wrap items-center gap-1.5 sm:gap-2">
            <span className="text-base sm:text-2xl font-black text-white tracking-tight">{activePodsCount}</span>
            <span className="hidden sm:inline-block text-[10px] font-extrabold text-[#BCCCE6] bg-[#7FA0D6]/15 px-2 py-0.5 rounded-full border border-[#7FA0D6]/30">
              Active
            </span>
          </div>

          <p className="hidden sm:block text-[11px] text-[#97A0B3] font-medium leading-relaxed my-1">
            Allocated team pods managing client accounts & deliverables.
          </p>

          <div className="pt-1.5 sm:pt-2 mt-auto border-t border-[#2A3446]/60 flex items-center justify-between text-[9px] sm:text-[11px] font-bold text-[#7FA0D6] group-hover/box:translate-x-0.5 transition-transform">
            <span className="truncate">Pods</span>
            <span>→</span>
          </div>
        </Link>

        {/* Box 2: Team Members */}
        <Link
          to="/admin/team"
          onClick={(e) => e.stopPropagation()}
          className="bg-[#0B111C] hover:bg-[#161F2D] border border-[#2A3446] hover:border-[#7FA0D6]/60 hover:scale-[1.02] hover:-translate-y-0.5 hover:shadow-[0_0_20px_rgba(127,160,214,0.18)] rounded-xl sm:rounded-2xl p-2 sm:p-3.5 flex flex-col justify-between h-full transition-all duration-200 group/box cursor-pointer shadow-md overflow-hidden"
        >
          <div className="flex items-center justify-between gap-1 w-full">
            <div className="flex items-center gap-1.5 sm:gap-2 min-w-0 flex-1">
              <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-lg sm:rounded-xl bg-[#7FA0D6]/20 text-[#BCCCE6] flex items-center justify-center font-bold group-hover/box:scale-110 transition-transform shrink-0">
                <Users className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              </div>
              <h3 className="text-[10px] sm:text-xs font-extrabold text-white group-hover/box:text-[#7FA0D6] transition-colors truncate">
                Members
              </h3>
            </div>
          </div>

          <div className="my-1.5 sm:my-2 flex flex-wrap items-center gap-1.5 sm:gap-2">
            <span className="text-base sm:text-2xl font-black text-white tracking-tight">{activeMembersCount}</span>
            <span className="hidden sm:inline-block text-[10px] font-extrabold text-[#BCCCE6] bg-[#7FA0D6]/15 px-2 py-0.5 rounded-full border border-[#7FA0D6]/30">
              Staff
            </span>
          </div>

          <p className="hidden sm:block text-[11px] text-[#97A0B3] font-medium leading-relaxed my-1">
            Motion designers, editors & pod leads actively staffed.
          </p>

          <div className="pt-1.5 sm:pt-2 mt-auto border-t border-[#2A3446]/60 flex items-center justify-between text-[9px] sm:text-[11px] font-bold text-[#7FA0D6] group-hover/box:translate-x-0.5 transition-transform">
            <span className="truncate">Roster</span>
            <span>→</span>
          </div>
        </Link>

        {/* Box 3: Leave Approvals */}
        <Link
          to="/admin/leaves"
          onClick={(e) => e.stopPropagation()}
          className="bg-[#0B111C] hover:bg-[#161F2D] border border-[#2A3446] hover:border-[#7FA0D6]/60 hover:scale-[1.02] hover:-translate-y-0.5 hover:shadow-[0_0_20px_rgba(127,160,214,0.18)] rounded-xl sm:rounded-2xl p-2 sm:p-3.5 flex flex-col justify-between h-full transition-all duration-200 group/box cursor-pointer shadow-md overflow-hidden"
        >
          <div className="flex items-center justify-between gap-1 w-full">
            <div className="flex items-center gap-1.5 sm:gap-2 min-w-0 flex-1">
              <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-lg sm:rounded-xl bg-[#7FA0D6]/20 text-[#BCCCE6] flex items-center justify-center font-bold group-hover/box:scale-110 transition-transform shrink-0">
                <CalendarCheck className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              </div>
              <h3 className="text-[10px] sm:text-xs font-extrabold text-white group-hover/box:text-[#7FA0D6] transition-colors truncate">
                Leaves
              </h3>
            </div>
          </div>

          <div className="my-1.5 sm:my-2 flex flex-wrap items-center gap-1.5 sm:gap-2">
            <span className="text-base sm:text-2xl font-black text-white tracking-tight">{pendingLeavesCount}</span>
            <span className="hidden sm:inline-block text-[10px] font-extrabold text-[#BCCCE6] bg-[#7FA0D6]/15 px-2 py-0.5 rounded-full border border-[#7FA0D6]/30">
              {pendingLeavesCount > 0 ? "Pending" : "Up To Date"}
            </span>
          </div>

          <p className="hidden sm:block text-[11px] text-[#97A0B3] font-medium leading-relaxed my-1">
            Pending PTO leave requests & schedule management.
          </p>

          <div className="pt-1.5 sm:pt-2 mt-auto border-t border-[#2A3446]/60 flex items-center justify-between text-[9px] sm:text-[11px] font-bold text-[#7FA0D6] group-hover/box:translate-x-0.5 transition-transform">
            <span className="truncate">PTO</span>
            <span>→</span>
          </div>
        </Link>
      </div>

      {/* Footer Navigation */}
      <div className="pt-2.5 mt-2 border-t border-[#2A3446] flex items-center justify-between text-xs text-[#97A0B3] font-medium shrink-0" onClick={(e) => e.stopPropagation()}>
        <span className="text-xs">Capacity & roster synchronized</span>
        <Link
          to="/admin/team"
          onClick={(e) => e.stopPropagation()}
          className="text-xs font-bold text-[#7FA0D6] hover:text-blue-300 hover:translate-x-0.5 transition-all flex items-center gap-0.5 cursor-pointer"
        >
          View Full Roster &rarr;
        </Link>
      </div>
    </div>
  );
}


