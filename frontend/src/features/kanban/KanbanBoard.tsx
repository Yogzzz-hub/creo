/**
 * Kanban pipeline board on the Ops surface (--color-paper).
 * Features 5 columns, drag-and-drop with @dnd-kit, closestCorners collision detection,
 * accurate drop targeting (supporting both column and card-over drops),
 * optimistic moves with rollback, and intelligent SLA time calculations.
 */

import {
  closestCorners,
  DndContext,
  type DragEndEvent,
  DragOverlay,
  type DragStartEvent,
  PointerSensor,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  AlertCircle,
  Calendar,
  ChevronLeft,
  ChevronRight,
  Clock,
  Film,
  FolderKanban,
  GripVertical,
  Image as ImageIcon,
  Layers,
  Sparkles,
  User,
  Zap,
} from "lucide-react";
import { motion, useReducedMotion } from "motion/react";
import React, { useState, useEffect } from "react";
import { autoAssignTask, fetchKanbanBoard, moveKanbanTask } from "../../lib/ops-api";
import type { KanbanBoardData, KanbanTask } from "../../types/ops";

interface ColumnMeta {
  id: keyof KanbanBoardData;
  label: string;
  description: string;
  accent: string;
  dotColor: string;
}

const COLUMNS: ColumnMeta[] = [
  {
    id: "backlog",
    label: "Backlog",
    description: "Unassigned creative briefs",
    accent: "border-slate-300",
    dotColor: "bg-slate-400",
  },
  {
    id: "in_production",
    label: "In production",
    description: "Active video editing & design",
    accent: "border-blue-400",
    dotColor: "bg-[#2B7BC4]",
  },
  {
    id: "internal_qa",
    label: "Internal QA",
    description: "Team lead quality review",
    accent: "border-amber-400",
    dotColor: "bg-amber-500",
  },
  {
    id: "client_review",
    label: "Client review",
    description: "Pending client sign-off",
    accent: "border-purple-400",
    dotColor: "bg-purple-500",
  },
  {
    id: "ready_to_publish",
    label: "Ready to publish",
    description: "Scheduled for Instagram",
    accent: "border-emerald-400",
    dotColor: "bg-emerald-500",
  },
];

function formatTimeRemaining(slaDueAt: string | null): {
  text: string;
  isBreached: boolean;
  isImminent: boolean;
  formattedDate?: string;
} {
  if (!slaDueAt) {
    return { text: "No SLA", isBreached: false, isImminent: false };
  }

  const due = new Date(slaDueAt);
  if (isNaN(due.getTime())) {
    return { text: "No SLA", isBreached: false, isImminent: false };
  }

  const diffMs = due.getTime() - Date.now();
  const formattedDate = due.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });

  if (diffMs <= 0) {
    const overdueMinutes = Math.abs(Math.floor(diffMs / (1000 * 60)));
    const overdueHours = Math.floor(overdueMinutes / 60);
    const overdueDays = Math.floor(overdueHours / 24);

    let text = "";
    if (overdueDays > 0) {
      text = `Overdue · ${overdueDays}d`;
    } else if (overdueHours > 0) {
      text = `Overdue · ${overdueHours}h`;
    } else {
      text = `Overdue · ${overdueMinutes}m`;
    }
    return { text, isBreached: true, isImminent: false, formattedDate };
  }

  const hours = Math.floor(diffMs / (1000 * 60 * 60));
  const mins = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
  const days = Math.floor(hours / 24);

  if (days > 0) {
    return { text: `${days}d ${hours % 24}h left`, isBreached: false, isImminent: false, formattedDate };
  }
  if (hours < 4) {
    return { text: `${hours}h ${mins}m left`, isBreached: false, isImminent: true, formattedDate };
  }
  return { text: `${hours}h remaining`, isBreached: false, isImminent: false, formattedDate };
}

function formatCreationTime(createdStr?: string | null): string {
  if (!createdStr) return "Recent";
  const d = new Date(createdStr);
  if (isNaN(d.getTime())) return "Recent";
  const diffHours = Math.floor((Date.now() - d.getTime()) / (1000 * 60 * 60));
  if (diffHours < 1) return "Just now";
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays}d ago`;
}

function DeliverableTypeIcon({ type }: { type: string }) {
  switch (type.toLowerCase()) {
    case "reel":
      return <Film className="w-3.5 h-3.5 text-[#2B7BC4]" />;
    case "carousel":
      return <Layers className="w-3.5 h-3.5 text-[#23A26D]" />;
    case "story":
    case "static_post":
      return <ImageIcon className="w-3.5 h-3.5 text-[#F0A202]" />;
    default:
      return <Film className="w-3.5 h-3.5 text-slate-500" />;
  }
}

interface TaskCardProps {
  task: KanbanTask;
  isOverlay?: boolean;
  onAutoAssign?: (taskId: string) => void;
}

function TaskCard({ task, isOverlay = false, onAutoAssign }: TaskCardProps) {
  const shouldReduceMotion = useReducedMotion();
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: task.id,
    data: {
      type: "task",
      task,
      columnId: task.status,
    },
    disabled: isOverlay,
  });

  const sla = formatTimeRemaining(task.sla_due_at);
  const createdAgo = formatCreationTime(task.created_at);

  const style = transform
    ? {
        transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
      }
    : undefined;

  return (
    <motion.div
      ref={setNodeRef}
      style={style}
      layout={!shouldReduceMotion && !isDragging}
      transition={{ type: "spring", stiffness: 350, damping: 25 }}
      {...listeners}
      {...attributes}
      className={`group relative p-3.5 rounded-xl border bg-white select-none transition-all duration-150 cursor-grab active:cursor-grabbing ${
        isDragging
          ? "opacity-25 border-dashed border-[#2B7BC4] scale-[0.98]"
          : "border-[#E4E4DF] hover:border-slate-300 hover:shadow-sm"
      } ${
        isOverlay
          ? "shadow-xl border-[#2B7BC4] ring-2 ring-[#2B7BC4]/20 rotate-1 scale-[1.02] cursor-grabbing"
          : ""
      }`}
    >
      {/* Header: Deliverable Kind & SLA Countdown */}
      <div className="flex items-center justify-between gap-2 mb-2.5">
        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[11px] font-semibold bg-[#FAFAF8] border border-[#E4E4DF] text-[#14171C]">
          <DeliverableTypeIcon type={task.deliverable_type} />
          <span className="uppercase tracking-wider text-[10px]">
            {task.deliverable_type.replace("_", " ")}
          </span>
        </span>

        <span
          title={sla.formattedDate ? `SLA Due: ${sla.formattedDate}` : undefined}
          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] tabular-nums font-mono font-semibold transition-colors ${
            sla.isBreached
              ? "bg-red-50 text-[#E5484D] border border-red-200"
              : sla.isImminent
              ? "bg-amber-50 text-amber-700 border border-amber-200"
              : "bg-[#FAFAF8] text-slate-600 border border-[#E4E4DF]"
          }`}
        >
          <Clock className="w-3 h-3 shrink-0" />
          <span>{sla.text}</span>
        </span>
      </div>

      {/* Task Client & Title */}
      <div className="mb-3">
        <h4 className="text-sm font-semibold text-[#14171C] leading-snug line-clamp-1 group-hover:text-[#2B7BC4] transition-colors">
          {task.client_company || task.client_email || "Client deliverable"}
        </h4>
        <div className="flex items-center gap-2 mt-1 text-[11px] text-slate-400 font-mono">
          <span>#{task.id.slice(0, 8)}</span>
          <span>•</span>
          <span className="inline-flex items-center gap-1">
            <Calendar className="w-2.5 h-2.5" />
            {createdAgo}
          </span>
        </div>
      </div>

      {/* Footer: Assignee & Action */}
      <div className="flex items-center justify-between pt-2.5 border-t border-slate-100 text-xs">
        {task.assignee_name || task.assignee_email ? (
          <span className="inline-flex items-center gap-1.5 text-slate-600">
            <div className="w-5 h-5 rounded-full bg-[#E8F4FD] text-[#2B7BC4] flex items-center justify-center text-[10px] font-bold">
              {(task.assignee_name || task.assignee_email || "U").charAt(0).toUpperCase()}
            </div>
            <span className="truncate max-w-[120px] font-medium text-[11px]">
              {task.assignee_name || task.assignee_email?.split("@")[0]}
            </span>
          </span>
        ) : (
          <span className="text-slate-400 italic text-[11px] flex items-center gap-1">
            <User className="w-3 h-3 text-slate-300" />
            Unassigned
          </span>
        )}

        {task.status === "backlog" && onAutoAssign && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onAutoAssign(task.id);
            }}
            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-medium bg-[#FAFAF8] hover:bg-[#2B7BC4] hover:text-white border border-[#E4E4DF] text-slate-700 transition-all shadow-xs"
          >
            <Zap className="w-3 h-3 text-[#2B7BC4] group-hover:text-white" />
            Auto-dispatch
          </button>
        )}

        {/* Drag handle subtle indicator */}
        <GripVertical className="w-3.5 h-3.5 text-slate-300 ml-auto opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
      </div>
    </motion.div>
  );
}

function DroppableColumn({
  col,
  tasks,
  onAutoAssign,
}: {
  col: ColumnMeta;
  tasks: KanbanTask[];
  onAutoAssign: (taskId: string) => void;
}) {
  const { isOver, setNodeRef } = useDroppable({
    id: col.id,
    data: {
      type: "column",
      columnId: col.id,
    },
  });

  const scrollContainerRef = React.useRef<HTMLDivElement>(null);
  const [canScrollDown, setCanScrollDown] = useState(false);
  const [canScrollUp, setCanScrollUp] = useState(false);

  const checkScroll = React.useCallback(() => {
    const el = scrollContainerRef.current;
    if (!el) return;
    setCanScrollUp(el.scrollTop > 8);
    setCanScrollDown(el.scrollTop + el.clientHeight < el.scrollHeight - 8);
  }, []);

  React.useEffect(() => {
    checkScroll();
    window.addEventListener("resize", checkScroll);
    return () => window.removeEventListener("resize", checkScroll);
  }, [tasks, checkScroll]);

  return (
    <div
      ref={setNodeRef}
      id={`col-${col.id}`}
      className={`flex flex-col flex-1 min-w-[295px] max-w-[340px] h-full max-h-full rounded-2xl border transition-all duration-200 relative overflow-hidden shrink-0 ${
        isOver
          ? "bg-[#F0F7FF]/90 border-[#2B7BC4] ring-2 ring-[#2B7BC4]/20 shadow-md"
          : "bg-[#F8F9FA] border-[#E4E4DF] shadow-xs hover:border-slate-300"
      }`}
    >
      {/* Column Header (Fixed/Sticky at top of column) */}
      <div className="p-3.5 pb-2.5 border-b border-[#E4E4DF]/80 bg-white/80 backdrop-blur-xs shrink-0 select-none z-10">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${col.dotColor}`} />
            <h3 className="text-sm font-bold text-[#14171C] truncate">{col.label}</h3>
          </div>
          <span className="px-2 py-0.5 rounded-full text-xs font-bold tabular-nums bg-white border border-slate-200 text-slate-700 shadow-2xs shrink-0">
            {tasks.length}
          </span>
        </div>
        <p className="text-[11px] text-slate-500 mt-0.5 truncate">{col.description}</p>
      </div>

      {/* Top subtle fade indicator when column is scrolled down */}
      {canScrollUp && (
        <div className="pointer-events-none absolute top-[58px] left-0 right-0 h-4 bg-gradient-to-b from-[#F8F9FA] to-transparent z-10" />
      )}

      {/* Task List (Vertically scrollable independent column) */}
      <div
        ref={scrollContainerRef}
        onScroll={checkScroll}
        className="flex flex-col gap-2.5 flex-1 p-3 overflow-y-auto overscroll-contain kanban-column-scroll min-h-0"
      >
        {tasks.map((task) => (
          <TaskCard key={task.id} task={task} onAutoAssign={onAutoAssign} />
        ))}
        {tasks.length === 0 && (
          <div
            className={`flex-1 flex flex-col items-center justify-center border-2 border-dashed rounded-xl p-6 text-center text-xs transition-colors min-h-[220px] ${
              isOver
                ? "border-[#2B7BC4] bg-[#E8F4FD]/50 text-[#2B7BC4] font-semibold"
                : "border-slate-200 text-slate-400 bg-white/40"
            }`}
          >
            <span>{isOver ? "Drop deliverable here" : `No items in ${col.label.toLowerCase()}`}</span>
          </div>
        )}
      </div>

      {/* Bottom subtle fade indicator when more tasks exist below */}
      {canScrollDown && (
        <div className="pointer-events-none absolute bottom-0 left-0 right-0 h-7 bg-gradient-to-t from-[#F8F9FA] via-[#F8F9FA]/80 to-transparent flex items-end justify-center pb-1 z-10 text-[10px] font-semibold text-slate-400">
          <span>↓ Scroll for more</span>
        </div>
      )}
    </div>
  );
}

export function KanbanBoard({ actorRole = "admin" }: { actorRole?: string }) {
  const [board, setBoard] = useState<KanbanBoardData>({
    backlog: [],
    in_production: [],
    internal_qa: [],
    client_review: [],
    ready_to_publish: [],
  });
  const [activeTask, setActiveTask] = useState<KanbanTask | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Side-scrolling state & refs
  const boardScrollRef = React.useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);
  const [activeColumnId, setActiveColumnId] = useState<string>("backlog");

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 4,
      },
    }),
  );

  const loadBoard = React.useCallback(async () => {
    try {
      setLoading(true);
      const data = await fetchKanbanBoard(undefined, actorRole);
      setBoard(data);
      setErrorMsg(null);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to load kanban board";
      setErrorMsg(msg);
    } finally {
      setLoading(false);
    }
  }, [actorRole]);

  useEffect(() => {
    loadBoard();
  }, [loadBoard]);

  // Update horizontal scroll indicators and active column indicator
  const updateScrollState = React.useCallback(() => {
    const el = boardScrollRef.current;
    if (!el) return;

    const hasScrollLeft = el.scrollLeft > 10;
    const hasScrollRight = el.scrollLeft + el.clientWidth < el.scrollWidth - 10;
    setCanScrollLeft(hasScrollLeft);
    setCanScrollRight(hasScrollRight);

    // Identify active column in center view
    const viewCenter = el.scrollLeft + el.clientWidth / 2;
    for (const col of COLUMNS) {
      const colEl = document.getElementById(`col-${col.id}`);
      if (colEl) {
        const left = colEl.offsetLeft;
        const right = left + colEl.offsetWidth;
        if (viewCenter >= left && viewCenter <= right) {
          setActiveColumnId(col.id);
          break;
        }
      }
    }
  }, []);

  React.useEffect(() => {
    updateScrollState();
    const el = boardScrollRef.current;
    if (!el) return;

    el.addEventListener("scroll", updateScrollState, { passive: true });
    window.addEventListener("resize", updateScrollState);
    return () => {
      el.removeEventListener("scroll", updateScrollState);
      window.removeEventListener("resize", updateScrollState);
    };
  }, [board, updateScrollState]);

  // Intelligent Mouse-Wheel Side Scrolling (translates vertical wheel into horizontal pan)
  React.useEffect(() => {
    const el = boardScrollRef.current;
    if (!el) return;

    const handleWheel = (e: WheelEvent) => {
      // If user holds Shift, native browser already scrolls horizontally
      if (e.shiftKey) return;

      const target = e.target as HTMLElement;
      const columnScrollable = target.closest(".kanban-column-scroll");

      if (columnScrollable) {
        const { scrollTop, scrollHeight, clientHeight } = columnScrollable;
        const canScrollDown = e.deltaY > 0 && scrollTop + clientHeight < scrollHeight - 4;
        const canScrollUp = e.deltaY < 0 && scrollTop > 4;

        // If the hovered column still has room to scroll vertically in that direction, let it scroll vertically
        if (canScrollDown || canScrollUp) {
          return;
        }
      }

      // If scrolling mouse wheel vertically (and not blocked by vertical column scroll),
      // smoothly translate vertical delta to horizontal board pan
      if (Math.abs(e.deltaY) > Math.abs(e.deltaX)) {
        e.preventDefault();
        el.scrollBy({
          left: e.deltaY * 0.95,
          behavior: "auto",
        });
      }
    };

    el.addEventListener("wheel", handleWheel, { passive: false });
    return () => el.removeEventListener("wheel", handleWheel);
  }, []);

  const scrollHorizontally = (offset: number) => {
    if (boardScrollRef.current) {
      boardScrollRef.current.scrollBy({
        left: offset,
        behavior: "smooth",
      });
    }
  };

  const scrollToColumn = (columnId: string) => {
    const colEl = document.getElementById(`col-${columnId}`);
    if (colEl) {
      colEl.scrollIntoView({
        behavior: "smooth",
        block: "nearest",
        inline: "center",
      });
      setActiveColumnId(columnId);
    }
  };

  const handleDragStart = (event: DragStartEvent) => {
    const task = event.active.data.current?.task as KanbanTask | undefined;
    if (task) {
      setActiveTask(task);
    }
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveTask(null);

    if (!over) return;

    const sourceTaskId = String(active.id);
    const overId = String(over.id);

    // 1. Accurately resolve target column whether dropped over a column OR another task card
    let targetColumn: keyof KanbanBoardData | null = null;
    if (COLUMNS.some((col) => col.id === overId)) {
      targetColumn = overId as keyof KanbanBoardData;
    } else if (over.data.current?.columnId) {
      targetColumn = over.data.current.columnId as keyof KanbanBoardData;
    } else {
      // Find which column contains the hovered item
      for (const [colKey, tasks] of Object.entries(board) as [
        keyof KanbanBoardData,
        KanbanTask[],
      ][]) {
        if (tasks.some((t) => t.id === overId)) {
          targetColumn = colKey;
          break;
        }
      }
    }

    if (!targetColumn) return;

    // 2. Find current column and task of the dragged item
    let sourceColumn: keyof KanbanBoardData | null = null;
    let movedTask: KanbanTask | null = null;

    for (const [colKey, tasks] of Object.entries(board) as [
      keyof KanbanBoardData,
      KanbanTask[],
    ][]) {
      const found = tasks.find((t) => t.id === sourceTaskId);
      if (found) {
        sourceColumn = colKey;
        movedTask = found;
        break;
      }
    }

    if (!sourceColumn || !movedTask || sourceColumn === targetColumn) {
      return;
    }

    // Role check guard: creatives cannot move straight to ready_to_publish without QA
    if (
      targetColumn === "ready_to_publish" &&
      (actorRole === "editor" || actorRole === "designer")
    ) {
      setErrorMsg("Creatives cannot move tasks directly to Ready to publish. QA review required.");
      return;
    }

    // 3. Optimistic UI update with immediate visual feedback
    const previousBoard = { ...board };
    const updatedSource = board[sourceColumn].filter((t) => t.id !== sourceTaskId);
    const updatedTarget = [{ ...movedTask, status: targetColumn }, ...board[targetColumn]];

    setBoard({
      ...board,
      [sourceColumn]: updatedSource,
      [targetColumn]: updatedTarget,
    });

    try {
      await moveKanbanTask(sourceTaskId, targetColumn, undefined, actorRole);
    } catch (err: unknown) {
      // Rollback on server failure
      setBoard(previousBoard);
      const msg = err instanceof Error ? err.message : "Failed to update deliverable status.";
      setErrorMsg(msg);
    }
  };

  const handleAutoAssign = async (taskId: string) => {
    try {
      await autoAssignTask(taskId, undefined, actorRole);
      await loadBoard();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Auto-dispatch failed.";
      setErrorMsg(msg);
    }
  };

  const totalTasks = Object.values(board).reduce((sum, tasks) => sum + tasks.length, 0);

  return (
    <div
      data-surface="ops"
      className="w-full flex-1 flex flex-col h-full font-sans select-none overflow-hidden"
      style={{ background: "#FAFAF8", color: "#14171C" }}
    >
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3 shrink-0">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-white border border-[#E4E4DF] shadow-2xs text-[#2B7BC4] shrink-0">
            <FolderKanban className="w-5 h-5 text-[#2B7BC4]" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg sm:text-xl font-bold font-display tracking-tight text-[#14171C]">
                Creative Production Pipeline
              </h1>
              <span className="px-2 py-0.5 text-xs font-semibold bg-[#E8F4FD] text-[#2B7BC4] rounded-full">
                {totalTasks} Active
              </span>
            </div>
            <p className="text-[11px] sm:text-xs text-slate-500 mt-0.5">
              Workload-aware assignment, SLA tracking, and internal QA checkpoints
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto">
          <button
            type="button"
            onClick={loadBoard}
            disabled={loading}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-white hover:bg-[#F3F3EF] border border-[#E4E4DF] text-slate-700 transition-all shadow-2xs disabled:opacity-50 cursor-pointer"
          >
            <Sparkles className="w-3.5 h-3.5 text-[#2B7BC4]" />
            {loading ? "Refreshing..." : "Refresh Pipeline"}
          </button>
        </div>
      </div>

      {/* Quick Stage Switcher & Side-Scrolling Navigation */}
      <div className="flex items-center justify-between gap-2 mb-3 shrink-0 pb-0.5">
        <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none py-0.5 max-w-full">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mr-0.5 hidden md:inline-block shrink-0">
            Stages:
          </span>
          {COLUMNS.map((col) => {
            const count = (board[col.id] || []).length;
            const isActive = activeColumnId === col.id;
            return (
              <button
                key={col.id}
                type="button"
                onClick={() => scrollToColumn(col.id)}
                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-semibold transition-all cursor-pointer whitespace-nowrap ${
                  isActive
                    ? "bg-[#2B7BC4] text-white shadow-xs"
                    : "bg-white border border-[#E4E4DF] text-slate-700 hover:border-[#2B7BC4]/50 hover:text-[#2B7BC4] hover:bg-slate-50"
                }`}
              >
                <span className={`size-2 rounded-full ${isActive ? "bg-white" : col.dotColor}`} />
                <span>{col.label}</span>
                <span
                  className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold tabular-nums ${
                    isActive ? "bg-white/25 text-white" : "bg-slate-100 text-slate-600"
                  }`}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Header Left / Right Side Scroll buttons */}
        <div className="hidden sm:flex items-center gap-1 shrink-0">
          <button
            type="button"
            onClick={() => scrollHorizontally(-330)}
            disabled={!canScrollLeft}
            className="p-1.5 rounded-lg border border-[#E4E4DF] bg-white text-slate-600 hover:bg-[#F3F3EF] hover:text-[#2B7BC4] transition-all disabled:opacity-30 disabled:pointer-events-none cursor-pointer shadow-2xs"
            title="Scroll Left"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => scrollHorizontally(330)}
            disabled={!canScrollRight}
            className="p-1.5 rounded-lg border border-[#E4E4DF] bg-white text-slate-600 hover:bg-[#F3F3EF] hover:text-[#2B7BC4] transition-all disabled:opacity-30 disabled:pointer-events-none cursor-pointer shadow-2xs"
            title="Scroll Right"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Error alert */}
      {errorMsg && (
        <div className="mb-3 p-3 rounded-xl bg-red-50 border border-red-200 text-[#E5484D] text-xs flex items-center gap-2 font-medium shadow-2xs shrink-0">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{errorMsg}</span>
          <button
            type="button"
            onClick={() => setErrorMsg(null)}
            className="ml-auto underline hover:opacity-80 font-bold cursor-pointer"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Kanban Drag & Drop Surface with closestCorners collision detection */}
      <div className="relative flex-1 min-h-0 w-full">
        {/* Floating Left Scroll Arrow & Soft Edge Mask */}
        {canScrollLeft && (
          <>
            <div className="pointer-events-none absolute left-0 top-0 bottom-0 w-10 bg-gradient-to-r from-[#FAFAF8] via-[#FAFAF8]/80 to-transparent z-20" />
            <button
              type="button"
              onClick={() => scrollHorizontally(-330)}
              className="absolute left-2 top-1/2 -translate-y-1/2 z-30 size-9 rounded-full bg-white/95 border border-slate-200 shadow-md hover:shadow-lg hover:scale-110 hover:bg-[#2B7BC4] hover:text-white text-slate-700 flex items-center justify-center transition-all cursor-pointer backdrop-blur-sm group"
              title="Scroll Left (or use mouse wheel)"
            >
              <ChevronLeft className="size-5 transition-transform group-hover:-translate-x-0.5" />
            </button>
          </>
        )}

        {/* Floating Right Scroll Arrow & Soft Edge Mask */}
        {canScrollRight && (
          <>
            <div className="pointer-events-none absolute right-0 top-0 bottom-0 w-10 bg-gradient-to-l from-[#FAFAF8] via-[#FAFAF8]/80 to-transparent z-20" />
            <button
              type="button"
              onClick={() => scrollHorizontally(330)}
              className="absolute right-2 top-1/2 -translate-y-1/2 z-30 size-9 rounded-full bg-white/95 border border-slate-200 shadow-md hover:shadow-lg hover:scale-110 hover:bg-[#2B7BC4] hover:text-white text-slate-700 flex items-center justify-center transition-all cursor-pointer backdrop-blur-sm group"
              title="Scroll Right (or use mouse wheel)"
            >
              <ChevronRight className="size-5 transition-transform group-hover:translate-x-0.5" />
            </button>
          </>
        )}

        <DndContext
          sensors={sensors}
          collisionDetection={closestCorners}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
        >
          <div
            ref={boardScrollRef}
            className="flex items-start gap-4 overflow-x-auto pb-3 h-full kanban-horizontal-scroll"
          >
            {COLUMNS.map((col) => (
              <DroppableColumn
                key={col.id}
                col={col}
                tasks={board[col.id] || []}
                onAutoAssign={handleAutoAssign}
              />
            ))}
          </div>

          <DragOverlay dropAnimation={null}>
            {activeTask ? <TaskCard task={activeTask} isOverlay /> : null}
          </DragOverlay>
        </DndContext>
      </div>
    </div>
  );
}
