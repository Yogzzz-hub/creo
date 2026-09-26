import { useState } from "react";
import { Link, useNavigate } from "react-router";
import { Check, Plus, Loader2, X } from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createQuickTask } from "@/lib/ops-api";
import { AdminQueueData } from "@/types/ops";

interface ContentEngineWidgetProps {
  queue?: AdminQueueData | null;
}

interface MatrixItem {
  id: string;
  title: string;
  points: number;
  assetsCount: number;
}

interface MatrixColumn {
  title: string;
  badgeCount: number;
  badgeBg: string;
  badgeText: string;
  titleColor: string;
  items: MatrixItem[];
}

interface TodayTaskItem {
  id: string;
  initials: string;
  avatarBg: string;
  title: string;
  time: string;
  assignee: string;
  statusText: string;
  statusType: "in_progress" | "completed" | "upcoming" | "pending";
}

export function ContentEngineWidget({ queue: _queue }: ContentEngineWidgetProps) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newTaskTitle, setNewTaskTitle] = useState("");
  const [newTaskAssignee, setNewTaskAssignee] = useState("Maya P.");
  const [newTaskTime, setNewTaskTime] = useState("02:00 PM");

  // Default matrix data matching strictly Reel, Story, and Post formats
  const matrixColumns: MatrixColumn[] = [
    {
      title: "TO DO",
      badgeCount: 2,
      badgeBg: "bg-[#2A3446]",
      badgeText: "text-[#97A0B3]",
      titleColor: "text-[#97A0B3]",
      items: [
        { id: "todo-1", title: "Brand Launch Story", points: 4, assetsCount: 6 },
        { id: "todo-2", title: "TikTok Reel Series", points: 2, assetsCount: 5 },
      ],
    },
    {
      title: "COMPLETED",
      badgeCount: 2,
      badgeBg: "bg-[#7FA0D6]",
      badgeText: "text-white",
      titleColor: "text-[#7FA0D6]",
      items: [
        { id: "comp-1", title: "Fintech Reel", points: 3, assetsCount: 6 },
        { id: "comp-2", title: "Client Showcase Post", points: 4, assetsCount: 10 },
      ],
    },
    {
      title: "REVIEW",
      badgeCount: 2,
      badgeBg: "bg-[#BCCCE6]",
      badgeText: "text-white",
      titleColor: "text-[#7FA0D6]",
      items: [
        { id: "rev-1", title: "Q4 Reel Concept", points: 5, assetsCount: 3 },
        { id: "rev-2", title: "Social Post Deck", points: 5, assetsCount: 12 },
      ],
    },
    {
      title: "APPROVED",
      badgeCount: 2,
      badgeBg: "bg-[#7FA0D6]",
      badgeText: "text-white",
      titleColor: "text-[#7FA0D6]",
      items: [
        { id: "app-1", title: "Enterprise Story Suite", points: 7, assetsCount: 4 },
        { id: "app-2", title: "Product Launch Reel", points: 3, assetsCount: 2 },
      ],
    },
  ];

  // Today's tasks default list matching screenshot
  const [todayTasks, setTodayTasks] = useState<TodayTaskItem[]>([
    {
      id: "tt-1",
      initials: "MP",
      avatarBg: "bg-[#2563EB]",
      title: "Q4 Creative Strategy Review",
      time: "10:30 AM",
      assignee: "Maya P.",
      statusText: "InProgress",
      statusType: "in_progress",
    },
    {
      id: "tt-2",
      initials: "DK",
      avatarBg: "bg-[#06B6D4]",
      title: "Deliverable Sign-off: Fintech ...",
      time: "01:00 PM",
      assignee: "David K.",
      statusText: "Completed",
      statusType: "completed",
    },
    {
      id: "tt-3",
      initials: "OS",
      avatarBg: "bg-[#6366F1]",
      title: "Client Sync: Northwind Labs",
      time: "03:30 PM",
      assignee: "Omar S.",
      statusText: "Upcoming",
      statusType: "upcoming",
    },
    {
      id: "tt-4",
      initials: "LD",
      avatarBg: "bg-[#0F172A]",
      title: "Asset Export & SLA Handover",
      time: "05:00 PM",
      assignee: "Lena O.",
      statusText: "Pending",
      statusType: "pending",
    },
  ]);

  const createMutation = useMutation({
    mutationFn: createQuickTask,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin_queue"] });
      queryClient.invalidateQueries({ queryKey: ["admin_dashboard"] });
    },
  });

  const handleCreateTaskSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskTitle.trim()) return;

    const initials = newTaskAssignee
      .split(" ")
      .map((n) => n[0])
      .join("")
      .slice(0, 2)
      .toUpperCase();

    const newTask: TodayTaskItem = {
      id: `tt-${Date.now()}`,
      initials: initials || "AD",
      avatarBg: "bg-[#2563EB]",
      title: newTaskTitle.trim(),
      time: newTaskTime || "02:00 PM",
      assignee: newTaskAssignee || "Admin",
      statusText: "InProgress",
      statusType: "in_progress",
    };

    setTodayTasks((prev) => [newTask, ...prev]);

    // Background sync mutation
    try {
      createMutation.mutate({
        client_id: "00000000-0000-0000-0000-000000000000",
        type: newTaskTitle.trim(),
        status: "in_progress",
        description: `Scheduled at ${newTaskTime} for ${newTaskAssignee}`,
      });
    } catch {
      // ignore
    }

    setNewTaskTitle("");
    setIsAddModalOpen(false);
  };

  const getStatusBadge = (task: TodayTaskItem) => {
    switch (task.statusType) {
      case "completed":
        return (
          <span className="bg-[#34D399]/15 text-[#34D399] border border-[#34D399]/30 rounded-full px-3 py-1 text-[11px] font-bold flex items-center gap-1 shadow-2xs">
            <Check className="w-3 h-3 stroke-[3]" /> Completed
          </span>
        );
      case "in_progress":
        return (
          <span className="bg-[#7FA0D6]/15 text-[#7FA0D6] border border-[#7FA0D6]/30 rounded-full px-3 py-1 text-[11px] font-bold shadow-2xs">
            InProgress
          </span>
        );
      case "upcoming":
        return (
          <span className="bg-[#D8BF9B]/15 text-[#D8BF9B] border border-[#D8BF9B]/30 rounded-full px-3 py-1 text-[11px] font-bold shadow-2xs">
            Upcoming
          </span>
        );
      case "pending":
      default:
        return (
          <span className="bg-[#161F2D] text-[#97A0B3] border border-[#2A3446] rounded-full px-3 py-1 text-[11px] font-bold shadow-2xs">
            Pending
          </span>
        );
    }
  };

  return (
    <div
      onClick={() => navigate("/admin/calendar")}
      className="bg-[#161F2D] rounded-2xl border border-[#2A3446] shadow-sm hover:border-[#7FA0D6]/50 transition-all p-4 sm:p-5 flex flex-col w-full h-full font-sans cursor-pointer group"
    >
      {/* Top Header Row */}
      <div className="flex items-start justify-between mb-3">
        <div>
          <div className="flex items-center gap-1.5">
            <h2 className="text-base font-black text-white group-hover:text-[#7FA0D6] transition-colors tracking-tight">Content Engine</h2>
            <span className="text-[9px] font-extrabold text-[#7FA0D6] bg-[#7FA0D6]/15 px-2 py-0.2 rounded-full border border-[#7FA0D6]/30">
              Active Q4
            </span>
          </div>
          <p className="text-[11px] text-[#97A0B3] font-medium">Deliverables & task queue</p>
        </div>
        <span className="px-2.5 py-0.5 rounded-full text-xs font-bold text-[#7FA0D6] bg-[#7FA0D6]/15 border border-[#7FA0D6]/30 flex items-center gap-1">
          Healthy
        </span>
      </div>

      {/* 2x2 Matrix Grid */}
      <div className="grid grid-cols-2 gap-2 mb-3.5">
        {matrixColumns.map((col) => (
          <div
            key={col.title}
            className="bg-[#0B111C] border border-[#2A3446] rounded-xl p-2.5 flex flex-col gap-1.5"
          >
            {/* Column Header */}
            <div className="flex items-center justify-between px-0.5">
              <span className={`text-[10px] font-black tracking-wider ${col.titleColor}`}>
                {col.title}
              </span>
              <span
                className={`w-3.5 h-3.5 rounded-full flex items-center justify-center text-[9px] font-black ${col.badgeBg} ${col.badgeText}`}
              >
                {col.badgeCount}
              </span>
            </div>

            {/* Sub Cards */}
            <div className="flex flex-col gap-1.5">
              {col.items.map((item) => (
                <div
                  key={item.id}
                  className="bg-[#161F2D] p-2 rounded-lg border border-[#2A3446] shadow-2xs flex flex-col gap-0.5 transition-all hover:border-[#7FA0D6]/40"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-white truncate pr-1">
                      {item.title}
                    </span>
                    <span className="text-[9px] font-black text-[#7FA0D6] bg-[#7FA0D6]/15 px-1 py-0.2 rounded border border-[#7FA0D6]/30/80 shrink-0">
                      {item.points} SP
                    </span>
                  </div>
                  <span className="text-[9px] text-[#97A0B3] font-semibold">
                    {item.assetsCount} assets
                  </span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Today's Tasks Section */}
      <div className="bg-[#0B111C] border border-[#2A3446] rounded-2xl p-3 flex flex-col gap-2">
        {/* Section Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-[#2563EB]" />
            <h3 className="text-xs font-black text-white">Today's Tasks</h3>
            <span className="text-[9px] font-extrabold text-[#7FA0D6] bg-[#7FA0D6]/15 border border-[#7FA0D6]/30 px-2 py-0.2 rounded-full">
              {todayTasks.length} Scheduled
            </span>
          </div>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setIsAddModalOpen(true);
            }}
            className="text-xs font-bold text-[#7FA0D6] hover:text-blue-700 hover:underline flex items-center gap-0.5 cursor-pointer transition-colors"
          >
            <Plus className="w-3 h-3 stroke-[3]" /> Add
          </button>
        </div>

        {/* Task Items List */}
        <div className="flex flex-col gap-1.5">
          {todayTasks.slice(0, 3).map((task) => (
            <div
              key={task.id}
              className="bg-[#161F2D] p-2 rounded-xl border border-[#2A3446] shadow-2xs flex items-center justify-between gap-2 hover:border-[#7FA0D6]/40 transition-all"
            >
              {/* Left: Avatar + Title & Time */}
              <div className="flex items-center gap-2 min-w-0">
                <div
                  className={`w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-black text-white shrink-0 shadow-2xs ${task.avatarBg}`}
                >
                  {task.initials}
                </div>
                <div className="flex flex-col min-w-0">
                  <span className="text-xs font-bold text-white truncate">
                    {task.title}
                  </span>
                  <span className="text-[9px] text-[#97A0B3] font-medium truncate">
                    {task.time} · {task.assignee}
                  </span>
                </div>
              </div>

              {/* Right: Status Pill */}
              <div className="shrink-0">{getStatusBadge(task)}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Footer Navigation */}
      <div className="mt-2.5 pt-2 border-t border-[#2A3446] flex items-center justify-between text-xs text-[#97A0B3] font-medium" onClick={(e) => e.stopPropagation()}>
        <span className="text-[11px]">Delivery: on track</span>
        <Link
          to="/admin/calendar"
          onClick={(e) => e.stopPropagation()}
          className="text-[11px] font-bold text-[#7FA0D6] hover:underline flex items-center gap-0.5 cursor-pointer"
        >
          Calendar &rarr;
        </Link>
      </div>

      {/* Quick Add Task Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 w-screen h-screen bg-slate-950/70 backdrop-blur-md z-[9999] flex items-center justify-center p-4 overflow-y-auto" onClick={(e) => e.stopPropagation()}>
          <div className="bg-[#161F2D] rounded-3xl max-w-sm w-full p-6 shadow-2xl border border-[#2A3446] text-white space-y-4 animate-scale-up" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between border-b border-[#2A3446] pb-3">
              <h3 className="text-sm font-black text-white">Add Today's Task</h3>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setIsAddModalOpen(false);
                }}
                className="p-1 rounded-full text-gray-400 hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateTaskSubmit} className="space-y-3">
              <div>
                <label className="block text-[11px] font-bold text-[#F1F5F9] mb-1">
                  Task Title
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Q4 Creative Review"
                  value={newTaskTitle}
                  onChange={(e) => setNewTaskTitle(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-[#2A3446] bg-[#0B111C] text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[11px] font-bold text-[#F1F5F9] mb-1">
                    Assignee
                  </label>
                  <input
                    type="text"
                    value={newTaskAssignee}
                    onChange={(e) => setNewTaskAssignee(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-[#2A3446] bg-[#0B111C] text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-[#F1F5F9] mb-1">
                    Time
                  </label>
                  <input
                    type="text"
                    value={newTaskTime}
                    onChange={(e) => setNewTaskTime(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-[#2A3446] bg-[#0B111C] text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  />
                </div>
              </div>

              <div className="pt-2 flex gap-2">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="flex-1 py-2 rounded-xl text-xs font-bold text-gray-600 bg-[#1F2C3F] hover:bg-[#25344A] text-white border border-[#2A3446] cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createMutation.isPending}
                  className="flex-1 py-2 rounded-xl text-xs font-bold text-white bg-[#BCCCE6] hover:bg-blue-700 cursor-pointer flex items-center justify-center gap-1"
                >
                  {createMutation.isPending && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  Schedule
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
