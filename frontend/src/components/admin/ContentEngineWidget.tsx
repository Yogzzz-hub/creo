import { Link, useNavigate } from "react-router";
import { AdminQueueData } from "@/types/ops";
import { Layers, Calendar, ListTodo, MessageSquare, ArrowUpRight } from "lucide-react";

interface ContentEngineWidgetProps {
  queue?: AdminQueueData | null;
}

export function ContentEngineWidget({ queue: _queue }: ContentEngineWidgetProps) {
  const navigate = useNavigate();

  return (
    <div
      onClick={() => navigate("/admin/calendar")}
      className="bg-[#161F2D] rounded-3xl border border-[#2A3446] shadow-xl hover:border-[#7FA0D6]/60 hover:shadow-[0_0_25px_rgba(127,160,214,0.15)] transition-all duration-300 p-4 sm:p-5 flex flex-col justify-between w-full h-full font-sans cursor-pointer group hover-card-innovative overflow-hidden text-white"
    >
      {/* Header Row */}
      <div className="flex items-center justify-between mb-3 pb-2.5 border-b border-[#2A3446]/80 shrink-0 gap-2">
        <div className="min-w-0">
          <h2 className="text-sm sm:text-base font-black text-white group-hover:text-[#7FA0D6] transition-colors tracking-tight flex items-center gap-1.5 truncate">
            Content Engine & Workflow
            <ArrowUpRight className="w-3.5 h-3.5 text-[#97A0B3] group-hover:text-[#7FA0D6] transition-colors shrink-0" />
          </h2>
          <p className="text-[11px] text-[#97A0B3] font-medium truncate">Deliverables, calendar & task queue</p>
        </div>
        <span className="shrink-0 min-w-max px-2.5 py-0.5 rounded-full text-[11px] font-bold text-[#7FA0D6] bg-[#7FA0D6]/15 border border-[#7FA0D6]/30 hover:bg-[#7FA0D6]/25 hover:border-[#7FA0D6]/60 transition-all cursor-pointer">
          Active Q4
        </span>
      </div>

      {/* 4 Squares (2x2 Grid) - Badges fully aligned INSIDE */}
      <div className="flex-1 grid grid-cols-2 gap-2 sm:gap-3 my-2.5">
        {/* Box 1: Deliverables Review */}
        <Link
          to="/admin/deliverables"
          onClick={(e) => e.stopPropagation()}
          className="bg-[#0B111C] hover:bg-[#161F2D] border border-[#2A3446] hover:border-[#7FA0D6]/60 hover:scale-[1.02] hover:-translate-y-0.5 hover:shadow-[0_0_20px_rgba(127,160,214,0.18)] rounded-2xl p-3.5 flex flex-col justify-between h-full transition-all duration-200 group/box cursor-pointer shadow-md overflow-hidden"
        >
          <div className="flex items-center justify-between gap-1 w-full">
            <div className="flex items-center gap-2 min-w-0 flex-1">
              <div className="w-7 h-7 rounded-xl bg-blue-600/20 text-[#7FA0D6] flex items-center justify-center font-bold group-hover/box:scale-110 transition-transform shrink-0">
                <Layers className="w-4 h-4" />
              </div>
              <h3 className="text-xs font-extrabold text-white group-hover/box:text-[#7FA0D6] transition-colors whitespace-nowrap">
                Deliverables
              </h3>
            </div>
          </div>

          <p className="text-[11px] text-[#97A0B3] font-medium leading-relaxed my-1">
            Review active client content deliverables, sign-offs & Rec.709 master files.
          </p>

          <div className="pt-1.5 border-t border-[#2A3446]/60 flex items-center justify-between text-[11px] font-bold text-[#7FA0D6] group-hover/box:translate-x-0.5 transition-transform">
            <span>Master File Queue</span>
            <span>View →</span>
          </div>
        </Link>

        {/* Box 2: Content Calendar */}
        <Link
          to="/admin/calendar"
          onClick={(e) => e.stopPropagation()}
          className="bg-[#0B111C] hover:bg-[#161F2D] border border-[#2A3446] hover:border-[#7FA0D6]/60 hover:scale-[1.02] hover:-translate-y-0.5 hover:shadow-[0_0_20px_rgba(127,160,214,0.18)] rounded-2xl p-3.5 flex flex-col justify-between h-full transition-all duration-200 group/box cursor-pointer shadow-md overflow-hidden"
        >
          <div className="flex items-center justify-between gap-1 w-full">
            <div className="flex items-center gap-2 min-w-0 flex-1">
              <div className="w-7 h-7 rounded-xl bg-[#7FA0D6]/20 text-[#BCCCE6] flex items-center justify-center font-bold group-hover/box:scale-110 transition-transform shrink-0">
                <Calendar className="w-4 h-4" />
              </div>
              <h3 className="text-xs font-extrabold text-white group-hover/box:text-[#7FA0D6] transition-colors whitespace-nowrap">
                Calendar
              </h3>
            </div>
          </div>

          <p className="text-[11px] text-[#97A0B3] font-medium leading-relaxed my-1">
            Scheduled posts, Reels & Stories timeline across all active client brand kits.
          </p>

          <div className="pt-1.5 border-t border-[#2A3446]/60 flex items-center justify-between text-[11px] font-bold text-[#7FA0D6] group-hover/box:translate-x-0.5 transition-transform">
            <span>Publishing Schedule</span>
            <span>Open →</span>
          </div>
        </Link>

        {/* Box 3: Production Task Queue */}
        <Link
          to="/admin/tasks"
          onClick={(e) => e.stopPropagation()}
          className="bg-[#0B111C] hover:bg-[#161F2D] border border-[#2A3446] hover:border-[#7FA0D6]/60 hover:scale-[1.02] hover:-translate-y-0.5 hover:shadow-[0_0_20px_rgba(127,160,214,0.18)] rounded-2xl p-3.5 flex flex-col justify-between h-full transition-all duration-200 group/box cursor-pointer shadow-md overflow-hidden"
        >
          <div className="flex items-center justify-between gap-1 w-full">
            <div className="flex items-center gap-2 min-w-0 flex-1">
              <div className="w-7 h-7 rounded-xl bg-[#7FA0D6]/20 text-[#BCCCE6] flex items-center justify-center font-bold group-hover/box:scale-110 transition-transform shrink-0">
                <ListTodo className="w-4 h-4" />
              </div>
              <h3 className="text-xs font-extrabold text-white group-hover/box:text-[#7FA0D6] transition-colors whitespace-nowrap">
                Task Queue
              </h3>
            </div>
          </div>

          <p className="text-[11px] text-[#97A0B3] font-medium leading-relaxed my-1">
            Kanban task backlog, Sprint allocation & status tracking for motion specialists.
          </p>

          <div className="pt-1.5 border-t border-[#2A3446]/60 flex items-center justify-between text-[11px] font-bold text-[#7FA0D6] group-hover/box:translate-x-0.5 transition-transform">
            <span>Sprint Backlog</span>
            <span>Queue →</span>
          </div>
        </Link>

        {/* Box 4: Assign Task (Slack) */}
        <Link
          to="/slack"
          onClick={(e) => e.stopPropagation()}
          className="bg-[#0B111C] hover:bg-[#161F2D] border border-[#2A3446] hover:border-[#7FA0D6]/60 hover:scale-[1.02] hover:-translate-y-0.5 hover:shadow-[0_0_20px_rgba(127,160,214,0.18)] rounded-2xl p-3.5 flex flex-col justify-between h-full transition-all duration-200 group/box cursor-pointer shadow-md overflow-hidden"
        >
          <div className="flex items-center justify-between gap-1 w-full">
            <div className="flex items-center gap-2 min-w-0 flex-1">
              <div className="w-7 h-7 rounded-xl bg-[#7FA0D6]/20 text-[#7FA0D6] flex items-center justify-center font-bold group-hover/box:scale-110 transition-transform shrink-0">
                <MessageSquare className="w-4 h-4" />
              </div>
              <h3 className="text-xs font-extrabold text-white group-hover/box:text-[#7FA0D6] transition-colors whitespace-nowrap">
                Assign Task
              </h3>
            </div>
          </div>

          <p className="text-[11px] text-[#97A0B3] font-medium leading-relaxed my-1">
            Assign creative tasks directly to pod members with interactive cards in Slack.
          </p>

          <div className="pt-1.5 border-t border-[#2A3446]/60 flex items-center justify-between text-[11px] font-bold text-[#7FA0D6] group-hover/box:translate-x-0.5 transition-transform">
            <span>Slack Collaboration</span>
            <span>Slack →</span>
          </div>
        </Link>
      </div>

      {/* Footer Navigation */}
      <div className="pt-2.5 mt-2 border-t border-[#2A3446] flex items-center justify-between text-xs text-[#97A0B3] font-medium shrink-0" onClick={(e) => e.stopPropagation()}>
        <span className="text-[10.5px]">All 4 workflow modules active</span>
        <Link
          to="/admin/calendar"
          onClick={(e) => e.stopPropagation()}
          className="text-[11px] font-bold text-[#7FA0D6] hover:text-blue-300 hover:translate-x-0.5 transition-all flex items-center gap-0.5 cursor-pointer"
        >
          Content Engine &rarr;
        </Link>
      </div>
    </div>
  );
}
