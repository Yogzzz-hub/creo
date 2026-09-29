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

  // Default matrix data matching screenshot exactly
  const matrixColumns: MatrixColumn[] = [
    {
      title: "TO DO",
      badgeCount: 2,
      badgeBg: "bg-slate-200",
      badgeText: "text-slate-700",
      titleColor: "text-slate-600",
      items: [
        { id: "todo-1", title: "Brand Asset Kit", points: 4, assetsCount: 6 },
        { id: "todo-2", title: "TikTok Hooks", points: 2, assetsCount: 5 },
      ],
    },
    {
      title: "COMPLETED",
      badgeCount: 2,
      badgeBg: "bg-sky-500",
      badgeText: "text-white",
      titleColor: "text-sky-600",
      items: [
        { id: "comp-1", title: "Fintech Ad Set", points: 3, assetsCount: 6 },
        { id: "comp-2", title: "Case Study Deck", points: 4, assetsCount: 10 },
      ],
    },
    {
      title: "REVIEW",
      badgeCount: 2,
      badgeBg: "bg-blue-600",
      badgeText: "text-white",
      titleColor: "text-blue-600",
      items: [
        { id: "rev-1", title: "Q4 Reel Concept", points: 5, assetsCount: 3 },
        { id: "rev-2", title: "Social Graphics", points: 5, assetsCount: 12 },
      ],
    },
    {
      title: "APPROVED",
      badgeCount: 2,
      badgeBg: "bg-indigo-600",
      badgeText: "text-white",
      titleColor: "text-indigo-600",
      items: [
        { id: "app-1", title: "Enterprise Pitch", points: 7, assetsCount: 4 },
        { id: "app-2", title: "Product Teaser", points: 3, assetsCount: 2 },
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
          <span className="bg-[#ECFEFF] text-[#0891B2] border border-[#CFFAFE] rounded-full px-3 py-1 text-[11px] font-bold flex items-center gap-1 shadow-2xs">
            <Check className="w-3 h-3 stroke-[3]" /> Completed
          </span>
        );
      case "in_progress":
        return (
          <span className="bg-[#EFF6FF] text-[#2563EB] border border-[#DBEAFE] rounded-full px-3 py-1 text-[11px] font-bold shadow-2xs">
            InProgress
          </span>
        );
      case "upcoming":
        return (
          <span className="bg-[#EEF2FF] text-[#4F46E5] border border-[#E0E7FF] rounded-full px-3 py-1 text-[11px] font-bold shadow-2xs">
            Upcoming
          </span>
        );
      case "pending":
      default:
        return (
          <span className="bg-[#F1F5F9] text-[#475569] border border-[#E2E8F0] rounded-full px-3 py-1 text-[11px] font-bold shadow-2xs">
            Pending
          </span>
        );
    }
  };

  return (
    <div
      onClick={() => navigate("/admin/calendar")}
      className="bg-white rounded-3xl border border-gray-100 shadow-[0_2px_10px_rgba(0,0,0,0.04)] hover:shadow-xl hover:border-blue-200/80 transition-all p-6 flex flex-col w-full h-full font-sans cursor-pointer group"
    >
      {/* Top Header Row */}
      <div className="flex items-start justify-between mb-5">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-black text-[#0F172A] group-hover:text-[#2563EB] transition-colors tracking-tight">Content Engine</h2>
            <span className="text-[10px] font-extrabold text-[#2563EB] bg-[#EFF6FF] px-2.5 py-0.5 rounded-full border border-[#DBEAFE]">
              Active Q4
            </span>
          </div>
          <p className="text-xs text-[#94A3B8] font-medium mt-0.5">Deliverables, calendar, and task queue</p>
        </div>
        <span className="px-3.5 py-1 rounded-full text-xs font-bold text-[#0284C7] bg-[#E0F2FE]/70 border border-[#BAE6FD] flex items-center gap-1">
          Healthy
        </span>
      </div>

      {/* 2x2 Matrix Grid */}
      <div className="grid grid-cols-2 gap-3.5 mb-5">
        {matrixColumns.map((col) => (
          <div
            key={col.title}
            className="bg-[#F8FAFC]/90 border border-[#E2E8F0]/70 rounded-2xl p-3 flex flex-col gap-2"
          >
            {/* Column Header */}
            <div className="flex items-center justify-between px-0.5">
              <span className={`text-[11px] font-black tracking-wider ${col.titleColor}`}>
                {col.title}
              </span>
              <span
                className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] font-black ${col.badgeBg} ${col.badgeText}`}
              >
                {col.badgeCount}
              </span>
            </div>

            {/* Sub Cards */}
            <div className="flex flex-col gap-2">
              {col.items.map((item) => (
                <div
                  key={item.id}
                  className="bg-white p-2.5 rounded-xl border border-gray-100 shadow-[0_1px_3px_rgba(0,0,0,0.02)] flex flex-col gap-0.5 transition-all hover:border-blue-100"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black text-[#0F172A] truncate pr-1">
                      {item.title}
                    </span>
                    <span className="text-[10px] font-black text-[#2563EB] bg-[#EFF6FF] px-1.5 py-0.5 rounded border border-[#DBEAFE]/80 shrink-0">
                      {item.points} SP
                    </span>
                  </div>
                  <span className="text-[10px] text-[#94A3B8] font-semibold">
                    {item.assetsCount} assets
                  </span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Today's Tasks Section */}
      <div className="bg-[#F8FAFC]/60 border border-[#E2E8F0]/80 rounded-2xl p-4 flex flex-col gap-3">
        {/* Section Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-[#2563EB]" />
            <h3 className="text-xs font-black text-[#0F172A]">Today's Tasks</h3>
            <span className="text-[10px] font-extrabold text-[#2563EB] bg-[#EFF6FF] border border-[#DBEAFE] px-2.5 py-0.5 rounded-full">
              {todayTasks.length} Scheduled · 1 Done
            </span>
          </div>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setIsAddModalOpen(true);
            }}
            className="text-xs font-black text-[#2563EB] hover:text-blue-700 hover:underline flex items-center gap-1 cursor-pointer transition-colors"
          >
            <Plus className="w-3.5 h-3.5 stroke-[3]" /> Add Task
          </button>
        </div>

        {/* Task Items List */}
        <div className="flex flex-col gap-2">
          {todayTasks.map((task) => (
            <div
              key={task.id}
              className="bg-white p-3 rounded-xl border border-gray-100/90 shadow-[0_1px_3px_rgba(0,0,0,0.02)] flex items-center justify-between gap-2 hover:border-blue-100 transition-all"
            >
              {/* Left: Avatar + Title & Time */}
              <div className="flex items-center gap-2.5 min-w-0">
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-[11px] font-black text-white shrink-0 shadow-2xs ${task.avatarBg}`}
                >
                  {task.initials}
                </div>
                <div className="flex flex-col min-w-0">
                  <span className="text-xs font-black text-[#0F172A] truncate">
                    {task.title}
                  </span>
                  <span className="text-[10px] text-[#94A3B8] font-medium truncate">
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
      <div className="mt-4 pt-3.5 border-t border-gray-100 flex items-center justify-between text-xs text-[#94A3B8] font-medium" onClick={(e) => e.stopPropagation()}>
        <span>Delivery cadence: on track</span>
        <Link
          to="/admin/calendar"
          onClick={(e) => e.stopPropagation()}
          className="text-xs font-black text-[#2563EB] hover:underline flex items-center gap-1 cursor-pointer"
        >
          Full calendar &rarr;
        </Link>
      </div>

      {/* Quick Add Task Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs z-50 flex items-center justify-center p-4" onClick={(e) => e.stopPropagation()}>
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 shadow-2xl border border-gray-100 space-y-4 animate-scale-up" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <h3 className="text-sm font-black text-gray-900">Add Today's Task</h3>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setIsAddModalOpen(false);
                }}
                className="p-1 rounded-full text-gray-400 hover:text-gray-900 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateTaskSubmit} className="space-y-3">
              <div>
                <label className="block text-[11px] font-bold text-gray-700 mb-1">
                  Task Title
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Q4 Creative Review"
                  value={newTaskTitle}
                  onChange={(e) => setNewTaskTitle(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[11px] font-bold text-gray-700 mb-1">
                    Assignee
                  </label>
                  <input
                    type="text"
                    value={newTaskAssignee}
                    onChange={(e) => setNewTaskAssignee(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-gray-700 mb-1">
                    Time
                  </label>
                  <input
                    type="text"
                    value={newTaskTime}
                    onChange={(e) => setNewTaskTime(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  />
                </div>
              </div>

              <div className="pt-2 flex gap-2">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="flex-1 py-2 rounded-xl text-xs font-bold text-gray-600 bg-gray-100 hover:bg-gray-200 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createMutation.isPending}
                  className="flex-1 py-2 rounded-xl text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 cursor-pointer flex items-center justify-center gap-1"
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
