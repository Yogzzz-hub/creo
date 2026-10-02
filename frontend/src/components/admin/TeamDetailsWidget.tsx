import { useNavigate, Link } from "react-router";
import { useQuery } from "@tanstack/react-query";
import { AdminQueueData } from "@/types/ops";
import { fetchLeaveRequests } from "@/lib/ops-api";
import { Users, CalendarCheck, ShieldCheck, ArrowUpRight, Building2 } from "lucide-react";

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
  const activeMembersCount = _queue?.staff?.length ?? 0;
  const activePodsCount = 4;

  return (
    <div
      onClick={() => navigate("/admin/team")}
      className="bg-nebula-surface rounded-3xl border border-nebula-steel shadow-xl hover:border-[#7FA0D6]/60 hover:shadow-[0_0_25px_rgba(127,160,214,0.15)] transition-all duration-300 p-4 sm:p-5 flex flex-col justify-between w-full h-full font-sans cursor-pointer group hover-card-innovative overflow-hidden text-white"
    >
      {/* Header Row */}
      <div className="flex items-center justify-between mb-3 pb-2.5 border-b border-nebula-steel/80 shrink-0 gap-2">
        <div className="min-w-0">
          <h2 className="text-sm sm:text-base font-black text-white group-hover:text-nebula-glow transition-colors tracking-tight flex items-center gap-1.5 truncate">
            Team Details & Roster
            <ArrowUpRight className="w-4 h-4 text-nebula-mist group-hover:text-nebula-glow transition-colors shrink-0" />
          </h2>
          <p className="text-xs text-nebula-mist font-medium truncate">Pod structure, staffing & office presence</p>
        </div>
        <span className="shrink-0 min-w-max px-3 py-1 rounded-full text-xs font-extrabold text-nebula-glow bg-[#7FA0D6]/15 border border-[#7FA0D6]/30 hover:bg-[#7FA0D6]/25 hover:border-[#7FA0D6]/60 transition-all cursor-pointer">
          {activePodsCount} Pods
        </span>
      </div>

      {/* 4 Squares (2x2 Grid Layout) - Badges fully aligned INSIDE */}
      <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-3 my-2.5">
        {/* Box 1: Active Pods */}
        <Link
          to="/admin/team"
          onClick={(e) => e.stopPropagation()}
          className="bg-nebula-navy hover:bg-nebula-surface border border-nebula-steel hover:border-[#7FA0D6]/60 hover:scale-[1.02] hover:-translate-y-0.5 hover:shadow-[0_0_20px_rgba(127,160,214,0.18)] rounded-2xl p-3.5 flex flex-col justify-between h-full transition-all duration-200 group/box cursor-pointer shadow-md overflow-hidden"
        >
          <div className="flex items-center justify-between gap-1 w-full">
            <div className="flex items-center gap-2 min-w-0 flex-1">
              <div className="w-7 h-7 rounded-xl bg-blue-600/20 text-nebula-glow flex items-center justify-center font-bold group-hover/box:scale-110 transition-transform shrink-0">
                <ShieldCheck className="w-4 h-4" />
              </div>
              <h3 className="text-xs font-extrabold text-white group-hover/box:text-nebula-glow transition-colors whitespace-nowrap">
                Active Pods
              </h3>
            </div>
          </div>

          <div className="my-1.5 flex items-center gap-2">
            <span className="text-2xl font-black text-white tracking-tight">{activePodsCount}</span>
            <span className="text-[11px] font-extrabold text-nebula-periwinkle bg-[#7FA0D6]/15 px-2.5 py-0.5 rounded-full border border-[#7FA0D6]/30">
              Pods Allocated
            </span>
          </div>

          <p className="text-[11px] text-nebula-mist font-medium leading-tight">
            Allocated team pods managing client accounts & deliverables.
          </p>

          <div className="pt-2 mt-1 border-t border-nebula-steel/60 flex items-center justify-between text-[11px] font-bold text-nebula-glow group-hover/box:translate-x-0.5 transition-transform">
            <span>Pod Structure</span>
            <span>Pods →</span>
          </div>
        </Link>

        {/* Box 2: Team Members */}
        <Link
          to="/admin/team"
          onClick={(e) => e.stopPropagation()}
          className="bg-nebula-navy hover:bg-nebula-surface border border-nebula-steel hover:border-[#7FA0D6]/60 hover:scale-[1.02] hover:-translate-y-0.5 hover:shadow-[0_0_20px_rgba(127,160,214,0.18)] rounded-2xl p-3.5 flex flex-col justify-between h-full transition-all duration-200 group/box cursor-pointer shadow-md overflow-hidden"
        >
          <div className="flex items-center justify-between gap-1 w-full">
            <div className="flex items-center gap-2 min-w-0 flex-1">
              <div className="w-7 h-7 rounded-xl bg-[#7FA0D6]/20 text-nebula-periwinkle flex items-center justify-center font-bold group-hover/box:scale-110 transition-transform shrink-0">
                <Users className="w-4 h-4" />
              </div>
              <h3 className="text-xs font-extrabold text-white group-hover/box:text-nebula-glow transition-colors whitespace-nowrap">
                Team Members
              </h3>
            </div>
          </div>

          <div className="my-1.5 flex items-center gap-2">
            <span className="text-2xl font-black text-white tracking-tight">{activeMembersCount}</span>
            <span className="text-[11px] font-extrabold text-nebula-periwinkle bg-[#7FA0D6]/15 px-2.5 py-0.5 rounded-full border border-[#7FA0D6]/30">
              Active Staff
            </span>
          </div>

          <p className="text-[11px] text-nebula-mist font-medium leading-tight">
            Motion designers, editors & pod leads actively staffed.
          </p>

          <div className="pt-2 mt-1 border-t border-nebula-steel/60 flex items-center justify-between text-[11px] font-bold text-nebula-glow group-hover/box:translate-x-0.5 transition-transform">
            <span>Active Roster</span>
            <span>Roster →</span>
          </div>
        </Link>

        {/* Box 3: Leave Approvals */}
        <Link
          to="/admin/leaves"
          onClick={(e) => e.stopPropagation()}
          className="bg-nebula-navy hover:bg-nebula-surface border border-nebula-steel hover:border-[#7FA0D6]/60 hover:scale-[1.02] hover:-translate-y-0.5 hover:shadow-[0_0_20px_rgba(127,160,214,0.18)] rounded-2xl p-3.5 flex flex-col justify-between h-full transition-all duration-200 group/box cursor-pointer shadow-md overflow-hidden"
        >
          <div className="flex items-center justify-between gap-1 w-full">
            <div className="flex items-center gap-2 min-w-0 flex-1">
              <div className="w-7 h-7 rounded-xl bg-[#7FA0D6]/20 text-nebula-periwinkle flex items-center justify-center font-bold group-hover/box:scale-110 transition-transform shrink-0">
                <CalendarCheck className="w-4 h-4" />
              </div>
              <h3 className="text-xs font-extrabold text-white group-hover/box:text-nebula-glow transition-colors whitespace-nowrap">
                Leave Approvals
              </h3>
            </div>
          </div>

          <div className="my-1.5 flex items-center gap-2">
            <span className="text-2xl font-black text-white tracking-tight">{pendingLeavesCount}</span>
            <span className="text-[11px] font-extrabold text-nebula-periwinkle bg-[#7FA0D6]/15 px-2.5 py-0.5 rounded-full border border-[#7FA0D6]/30">
              {pendingLeavesCount > 0 ? "Review Required" : "Up To Date"}
            </span>
          </div>

          <p className="text-[11px] text-nebula-mist font-medium leading-tight">
            Pending PTO leave requests & schedule management.
          </p>

          <div className="pt-2 mt-1 border-t border-nebula-steel/60 flex items-center justify-between text-[11px] font-bold text-nebula-glow group-hover/box:translate-x-0.5 transition-transform">
            <span>Awaiting PTO</span>
            <span>Review →</span>
          </div>
        </Link>

        {/* Box 4: Active In Office */}
        <Link
          to="/admin/team"
          onClick={(e) => e.stopPropagation()}
          className="bg-nebula-navy hover:bg-nebula-surface border border-nebula-steel hover:border-[#7FA0D6]/60 hover:scale-[1.02] hover:-translate-y-0.5 hover:shadow-[0_0_20px_rgba(127,160,214,0.18)] rounded-2xl p-3.5 flex flex-col justify-between h-full transition-all duration-200 group/box cursor-pointer shadow-md overflow-hidden"
        >
          <div className="flex items-center justify-between gap-1 w-full">
            <div className="flex items-center gap-2 min-w-0 flex-1">
              <div className="w-7 h-7 rounded-xl bg-[#7FA0D6]/20 text-nebula-glow flex items-center justify-center font-bold group-hover/box:scale-110 transition-transform shrink-0">
                <Building2 className="w-4 h-4" />
              </div>
              <h3 className="text-xs font-extrabold text-white group-hover/box:text-nebula-glow transition-colors whitespace-nowrap">
                Active In Office
              </h3>
            </div>
          </div>

          <div className="my-1.5 flex items-center gap-2">
            <span className="text-2xl font-black text-white tracking-tight">{activeMembersCount}</span>
            <span className="text-[11px] font-extrabold text-nebula-glow bg-[#7FA0D6]/15 px-2.5 py-0.5 rounded-full border border-[#7FA0D6]/30">
              On-Site Active
            </span>
          </div>

          <p className="text-[11px] text-nebula-mist font-medium leading-tight">
            Real-time physical office attendance & status sync.
          </p>

          <div className="pt-2 mt-1 border-t border-nebula-steel/60 flex items-center justify-between text-[11px] font-bold text-nebula-glow group-hover/box:translate-x-0.5 transition-transform">
            <span>Presence Status</span>
            <span>Synced →</span>
          </div>
        </Link>
      </div>

      {/* Footer Navigation */}
      <div className="pt-2.5 mt-2 border-t border-nebula-steel flex items-center justify-between text-xs text-nebula-mist font-medium shrink-0" onClick={(e) => e.stopPropagation()}>
        <span className="text-xs">Capacity & roster synchronized</span>
        <Link
          to="/admin/team"
          onClick={(e) => e.stopPropagation()}
          className="text-xs font-bold text-nebula-glow hover:text-blue-300 hover:translate-x-0.5 transition-all flex items-center gap-0.5 cursor-pointer"
        >
          View Full Roster &rarr;
        </Link>
      </div>
    </div>
  );
}


