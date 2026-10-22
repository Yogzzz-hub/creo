import { Link, useNavigate } from "react-router";
import { AdminQueueData } from "@/types/ops";
import { Layers, Calendar, ListTodo, ArrowUpRight, MessageSquare } from "lucide-react";

interface ContentEngineWidgetProps {
  queue?: AdminQueueData | null;
}

export function ContentEngineWidget({ queue: _queue }: ContentEngineWidgetProps) {
  const navigate = useNavigate();

  return (
    <div
      onClick={() => navigate("/admin/calendar")}
      className="bg-app-surface rounded-3xl border border-app-line shadow-xl hover:border-app-accent/60 hover:shadow-[0_0_25px_color-mix(in_oklab,var(--app-accent)_15%,transparent)] transition-all duration-300 p-4 sm:p-5 flex flex-col justify-between w-full h-full font-sans cursor-pointer group hover-card-innovative overflow-hidden text-hi"
    >
      {/* Header Row */}
      <div className="flex items-center justify-between mb-3 pb-2.5 border-b border-app-line/80 shrink-0 gap-2">
        <div className="min-w-0">
          <h2 className="text-sm sm:text-base font-black text-hi group-hover:text-app-accent transition-colors tracking-tight flex items-center gap-1.5 truncate">
            Content Engine & Workflow
            <ArrowUpRight className="w-3.5 h-3.5 text-app-mist group-hover:text-app-accent transition-colors shrink-0" />
          </h2>
          <p className="text-[11px] text-app-mist font-medium truncate">Deliverables, calendar & task queue</p>
        </div>
        <span className="shrink-0 min-w-max px-2.5 py-0.5 rounded-full text-[11px] font-bold text-app-accent bg-app-accent/15 border border-app-accent/30 hover:bg-app-accent/25 hover:border-app-accent/60 transition-all cursor-pointer">
          Active Q4
        </span>
      </div>

      {/* 4 Subboxes in 2x2 Grid */}
      <div className="flex-1 grid grid-cols-2 gap-2 sm:gap-3 my-1 sm:my-2">
        {/* Box 1: Deliverables Review */}
        <Link
          to="/admin/deliverables"
          onClick={(e) => e.stopPropagation()}
          className="bg-app-base hover:bg-app-surface border border-app-line hover:border-app-accent/60 hover:scale-[1.02] hover:-translate-y-0.5 hover:shadow-[0_0_20px_color-mix(in_oklab,var(--app-accent)_18%,transparent)] rounded-2xl p-2.5 sm:p-3.5 flex flex-col justify-between h-full transition-all duration-200 group/box cursor-pointer shadow-md overflow-hidden"
        >
          <div className="flex items-center justify-between gap-1 w-full">
            <div className="flex items-center gap-1.5 sm:gap-2 min-w-0 flex-1">
              <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-xl bg-app-accent/20 text-app-accent flex items-center justify-center font-bold group-hover/box:scale-110 transition-transform shrink-0">
                <Layers className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              </div>
              <h3 className="text-[11px] sm:text-xs font-extrabold text-hi group-hover/box:text-app-accent transition-colors truncate">
                Deliverables
              </h3>
            </div>
          </div>

          <p className="text-[10px] sm:text-[11px] text-app-mist font-medium leading-relaxed my-1">
            Review active client content deliverables, sign-offs & Rec.709 master files.
          </p>

          <div className="pt-1.5 sm:pt-2 mt-auto border-t border-app-line/60 flex items-center justify-between text-[10px] sm:text-[11px] font-bold text-app-accent group-hover/box:translate-x-0.5 transition-transform">
            <span>Master Files</span>
            <span>View →</span>
          </div>
        </Link>

        {/* Box 2: Content Calendar */}
        <Link
          to="/admin/calendar"
          onClick={(e) => e.stopPropagation()}
          className="bg-app-base hover:bg-app-surface border border-app-line hover:border-app-accent/60 hover:scale-[1.02] hover:-translate-y-0.5 hover:shadow-[0_0_20px_color-mix(in_oklab,var(--app-accent)_18%,transparent)] rounded-2xl p-2.5 sm:p-3.5 flex flex-col justify-between h-full transition-all duration-200 group/box cursor-pointer shadow-md overflow-hidden"
        >
          <div className="flex items-center justify-between gap-1 w-full">
            <div className="flex items-center gap-1.5 sm:gap-2 min-w-0 flex-1">
              <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-xl bg-app-accent/20 text-app-accent flex items-center justify-center font-bold group-hover/box:scale-110 transition-transform shrink-0">
                <Calendar className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              </div>
              <h3 className="text-[11px] sm:text-xs font-extrabold text-hi group-hover/box:text-app-accent transition-colors truncate">
                Calendar
              </h3>
            </div>
          </div>

          <p className="text-[10px] sm:text-[11px] text-app-mist font-medium leading-relaxed my-1">
            Scheduled posts, Reels & Stories timeline across all active client brand kits.
          </p>

          <div className="pt-1.5 sm:pt-2 mt-auto border-t border-app-line/60 flex items-center justify-between text-[10px] sm:text-[11px] font-bold text-app-accent group-hover/box:translate-x-0.5 transition-transform">
            <span>Schedule</span>
            <span>Open →</span>
          </div>
        </Link>

        {/* Box 3: Production Task Queue */}
        <Link
          to="/admin/tasks"
          onClick={(e) => e.stopPropagation()}
          className="bg-app-base hover:bg-app-surface border border-app-line hover:border-app-accent/60 hover:scale-[1.02] hover:-translate-y-0.5 hover:shadow-[0_0_20px_color-mix(in_oklab,var(--app-accent)_18%,transparent)] rounded-2xl p-2.5 sm:p-3.5 flex flex-col justify-between h-full transition-all duration-200 group/box cursor-pointer shadow-md overflow-hidden"
        >
          <div className="flex items-center justify-between gap-1 w-full">
            <div className="flex items-center gap-1.5 sm:gap-2 min-w-0 flex-1">
              <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-xl bg-app-accent/20 text-app-accent flex items-center justify-center font-bold group-hover/box:scale-110 transition-transform shrink-0">
                <ListTodo className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              </div>
              <h3 className="text-[11px] sm:text-xs font-extrabold text-hi group-hover/box:text-app-accent transition-colors truncate">
                Task Queue
              </h3>
            </div>
          </div>

          <p className="text-[10px] sm:text-[11px] text-app-mist font-medium leading-relaxed my-1">
            Kanban task backlog, Sprint allocation & status tracking for motion specialists.
          </p>

          <div className="pt-1.5 sm:pt-2 mt-auto border-t border-app-line/60 flex items-center justify-between text-[10px] sm:text-[11px] font-bold text-app-accent group-hover/box:translate-x-0.5 transition-transform">
            <span>Sprint Backlog</span>
            <span>Queue →</span>
          </div>
        </Link>

        {/* Box 4: Assign Task (Slack) */}
        <Link
          to="/slack"
          onClick={(e) => e.stopPropagation()}
          className="bg-app-base hover:bg-app-surface border border-app-line hover:border-app-accent/60 hover:scale-[1.02] hover:-translate-y-0.5 hover:shadow-[0_0_20px_color-mix(in_oklab,var(--app-accent)_18%,transparent)] rounded-2xl p-2.5 sm:p-3.5 flex flex-col justify-between h-full transition-all duration-200 group/box cursor-pointer shadow-md overflow-hidden"
        >
          <div className="flex items-center justify-between gap-1 w-full">
            <div className="flex items-center gap-1.5 sm:gap-2 min-w-0 flex-1">
              <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-xl bg-app-accent/20 text-app-accent flex items-center justify-center font-bold group-hover/box:scale-110 transition-transform shrink-0">
                <MessageSquare className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              </div>
              <h3 className="text-[11px] sm:text-xs font-extrabold text-hi group-hover/box:text-app-accent transition-colors truncate">
                Assign Task
              </h3>
            </div>
          </div>

          <p className="text-[10px] sm:text-[11px] text-app-mist font-medium leading-relaxed my-1">
            Assign creative tasks directly to pod members with interactive cards in Slack.
          </p>

          <div className="pt-1.5 sm:pt-2 mt-auto border-t border-app-line/60 flex items-center justify-between text-[10px] sm:text-[11px] font-bold text-app-accent group-hover/box:translate-x-0.5 transition-transform">
            <span>Slack</span>
            <span>Slack →</span>
          </div>
        </Link>
      </div>

      {/* Footer Navigation */}
      <div className="pt-2.5 mt-2 border-t border-app-line shrink-0" onClick={(e) => e.stopPropagation()}>
        <Link
          to="/admin/calendar"
          onClick={(e) => e.stopPropagation()}
          className="w-full min-h-[38px] py-2 px-3 bg-app-base hover:bg-app-surface hover:border-app-accent/60 hover:scale-[1.01] hover:text-app-accent text-hi rounded-xl text-xs font-bold border border-app-line transition-all duration-200 shadow-md flex items-center justify-center gap-1.5 cursor-pointer"
        >
          <span>Content Engine</span>
          <span>&rarr;</span>
        </Link>
      </div>
    </div>
  );
}
