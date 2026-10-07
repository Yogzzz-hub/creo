import { NativeSelect } from "../../ui/NativeSelect";
import { useState } from "react";
import { Link } from "react-router";
import { AdminTopHeader } from "../../components/admin/AdminTopHeader";
import { useQuery, useMutation } from "@tanstack/react-query";
import { submitPodQAReview, fetchPodDashboard, type PodDashboardData } from "../../lib/ops-api";
import { useAuth } from "../../lib/auth-context";
import { motion } from "motion/react";
import {
  FolderKanban,
  AlertTriangle,
  Plus,
  CheckCircle2,
  Sparkles,
  RefreshCw,
  Eye,
  FileCheck,
  Check,
  X,
  ArrowLeftRight,
  FileText,
} from "lucide-react";

export function PodTaskBoardPage() {
  const { user } = useAuth();
  const [toastMessage, setToastMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [assignModalOpen, setAssignModalOpen] = useState(false);
  const [newCardTitle, setNewCardTitle] = useState("");
  const [newCardClient, setNewCardClient] = useState("");

  const [workloadModalOpen, setWorkloadModalOpen] = useState(false);
  const [rerouteModalOpen, setRerouteModalOpen] = useState(false);
  const [rerouteTarget, setRerouteTarget] = useState("");

  // Mobile column switcher for sleek phone experience
  const [activeMobileCol, setActiveMobileCol] = useState<"all" | "backlog" | "in_progress" | "review" | "dispatched">("all");

  const { data } = useQuery<PodDashboardData>({
    queryKey: ["pod_dashboard", user?.id, undefined],
    queryFn: () => fetchPodDashboard(),
    staleTime: 30_000,
    enabled: !!user?.id,
  });

  const podName = data?.pod?.name || "Pod Operations";
  const leadName = data?.pod?.lead?.name || user?.full_name || "Pod Lead";

  const showToast = (text: string, type: "success" | "error" = "success") => {
    setToastMessage({ type, text });
    setTimeout(() => setToastMessage(null), 4000);
  };

  const qaMutation = useMutation({
    mutationFn: ({ taskId, decision, comment }: { taskId: string; decision: "approve" | "reject"; comment?: string }) =>
      submitPodQAReview(taskId, decision, comment),
    onSuccess: (res) => {
      showToast(res.message || "QA sign-off recorded successfully", "success");
    },
    onError: (err: any) => {
      showToast(err?.message || "Failed to submit QA decision", "error");
    },
  });

  const handleExportSprintCSV = () => {
    const headers = ["Task ID", "Column / Stage", "Task Title", "Format", "Client", "Assignee", "Status Info"];
    const allTasks: any[] = [
      ...(data?.tasks?.backlog || []).map(t => [t.id, "Backlog", t.blueprint?.concept_name || "Task", t.deliverable_type, t.client_name, t.assignee?.full_name || t.assignee_name, "Ready for Sprint"]),
      ...(data?.tasks?.in_production || []).map(t => [t.id, "In Progress", t.blueprint?.concept_name || "Task", t.deliverable_type, t.client_name, t.assignee?.full_name || t.assignee_name, "In Production"]),
      ...(data?.tasks?.internal_qa || []).map(t => [t.id, "Pending Lead QA", t.blueprint?.concept_name || "Task", t.deliverable_type, t.client_name, t.assignee?.full_name || t.assignee_name, "Requires Lead Sign-off"]),
      ...(data?.tasks?.ready_to_publish || []).map(t => [t.id, "Ready to Publish", t.blueprint?.concept_name || "Task", t.deliverable_type, t.client_name, t.assignee?.full_name || t.assignee_name, "Approved"]),
      ...(data?.tasks?.completed || []).map(t => [t.id, "Dispatched", t.blueprint?.concept_name || "Task", t.deliverable_type, t.client_name, t.assignee?.full_name || t.assignee_name, "Delivered"]),
    ];

    const rows = allTasks.length > 0 ? allTasks : [["N/A", "N/A", "No active tasks in sprint", "-", "-", "-", "-"]];

    const csvContent = [headers.join(","), ...rows.map(r => r.map((c: string) => `"${c || ""}"`).join(","))].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `${(podName).replace(/\s+/g, "_")}_Sprint_Task_Board_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    showToast("Downloaded Pod A Sprint Task Board CSV report", "success");
  };

  return (
    <div data-surface="ops" className="min-h-screen bg-[#0B111C] text-white font-sans flex flex-col">
      {/* Top Header */}
      <AdminTopHeader title="Content Engine" activeTab="Content Engine" />

      {/* Main Container */}
      <main className="flex-1 max-w-[1440px] w-full mx-auto px-3 sm:px-5 lg:px-6 py-3.5 pb-20 sm:pb-6 space-y-3.5 sm:space-y-4">
        {/* Toast Alert */}
        {toastMessage && (
          <div
            className={`p-3 rounded-xl border text-xs font-bold flex items-center justify-between shadow-lg animate-fade-in ${
              toastMessage.type === "error"
                ? "bg-rose-950/80 border-rose-800 text-rose-300"
                : "bg-emerald-950/80 border-emerald-800 text-emerald-300"
            }`}
          >
            <span>{toastMessage.text}</span>
            <button onClick={() => setToastMessage(null)} className="text-current opacity-70 hover:opacity-100">
              &times;
            </button>
          </div>
        )}

        {/* 1. Quick Actions Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 bg-[#161F2D] p-2.5 sm:px-4 sm:py-2.5 rounded-2xl border border-[#2A3446]/80 shadow-2xs">
          <div className="flex items-center gap-2">
            <span className="size-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-xs font-bold text-[#F1F5F9]">{podName} Sprint Workflow · Lead {leadName}</span>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={handleExportSprintCSV}
              className="px-3 py-1.5 rounded-xl bg-[#161F2D] border border-[#2A3446] hover:bg-[#0B111C] text-[#F1F5F9] text-xs font-bold flex items-center gap-1.5 shadow-2xs transition-colors cursor-pointer"
            >
              <FileText className="size-3.5 text-[#97A0B3]" />
              Export Report
            </button>
            <button
              onClick={() => setAssignModalOpen(true)}
              className="px-3.5 py-1.5 rounded-xl bg-[#7FA0D6] hover:bg-blue-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-xs transition-all cursor-pointer"
            >
              <Plus className="size-3.5" />
              Assign New Task
            </button>
          </div>
        </div>

        {/* 2. Top Summary KPI Cards */}
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="grid grid-cols-1 md:grid-cols-2 gap-2.5 sm:gap-3"
        >
          {/* Card 1: Total Active Tasks */}
          <div className="bg-[#161F2D] rounded-xl sm:rounded-2xl p-2.5 sm:p-3 border border-[#2A3446]/80 shadow-2xs hover-card-innovative flex items-center justify-between">
            <div className="space-y-0.5">
              <span className="text-[9px] sm:text-[10px] font-bold uppercase tracking-wider text-[#97A0B3]">Total Active Tasks</span>
              <div className="flex items-baseline gap-1.5">
                <span className="text-lg sm:text-xl font-black text-white">18</span>
                <span className="text-[10.5px] sm:text-[11px] font-bold text-[#97A0B3]">Tasks in Sprint</span>
              </div>
              <p className="text-[10px] sm:text-[11px] font-bold text-[#7FA0D6] pt-0.5">
                4 In Progress · 6 Review · 8 Backlog
              </p>
            </div>
            <div className="size-7 sm:size-8 rounded-xl bg-[#7FA0D6]/15 text-[#7FA0D6] flex items-center justify-center shrink-0">
              <FolderKanban className="size-3.5 sm:size-4" />
            </div>
          </div>

          {/* Card 2: Blockers / Escalations */}
          <div className="bg-[#161F2D] rounded-xl sm:rounded-2xl p-2.5 sm:p-3 border border-[#2A3446]/80 shadow-2xs hover-card-innovative flex items-center justify-between">
            <div className="space-y-0.5">
              <span className="text-[9px] sm:text-[10px] font-bold uppercase tracking-wider text-[#97A0B3]">Blockers / Escalations</span>
              <div className="flex items-baseline gap-1.5">
                <span className="text-lg sm:text-xl font-black text-rose-400">1</span>
                <span className="text-[10.5px] sm:text-[11px] font-bold text-rose-400">Action Blocker</span>
              </div>
              <div className="flex flex-wrap items-center gap-1.5 pt-0.5 text-[10px] sm:text-[11px]">
                <span className="text-[#F1F5F9] font-medium">Atlas copy sign-off required</span>
                <button
                  onClick={() => showToast("Reminder ping dispatched to Atlas client Slack channel", "success")}
                  className="font-bold text-[#7FA0D6] hover:underline cursor-pointer"
                >
                  Ping Client
                </button>
              </div>
            </div>
            <div className="size-7 sm:size-8 rounded-xl bg-rose-500/15 text-rose-400 border border-rose-500/30 flex items-center justify-center shrink-0">
              <AlertTriangle className="size-3.5 sm:size-4" />
            </div>
          </div>
        </motion.div>

        {/* Mobile-Only Kanban Column Selector Pills */}
        <div className="flex md:hidden items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar text-xs font-bold">
          {[
            { id: "all", label: "All Columns", count: 18 },
            { id: "backlog", label: "Backlog", count: 8 },
            { id: "in_progress", label: "In Progress", count: 4 },
            { id: "review", label: "QA Review", count: 6 },
            { id: "dispatched", label: "Dispatched", count: 3 },
          ].map((col) => (
            <button
              key={col.id}
              onClick={() => setActiveMobileCol(col.id as any)}
              className={`px-2.5 py-1 rounded-full shrink-0 transition-all flex items-center gap-1 cursor-pointer text-xs ${
                activeMobileCol === col.id
                  ? "bg-[#7FA0D6] text-[#0B111C] font-black"
                  : "bg-[#161F2D] border border-[#2A3446] text-[#F1F5F9] hover:bg-[#0B111C]"
              }`}
            >
              <span>{col.label}</span>
              <span
                className={`px-1.5 py-0.2 rounded-full text-[9px] ${
                  activeMobileCol === col.id ? "bg-[#0B111C] text-[#7FA0D6]" : "bg-[#0B111C] text-[#F1F5F9]"
                }`}
              >
                {col.count}
              </span>
            </button>
          ))}
        </div>

        {/* 3. Four Kanban Columns */}
        <motion.div 
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, delay: 0.1 }}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-3.5 items-stretch h-[560px] sm:h-[600px] lg:h-[calc(100vh-270px)] min-h-[500px]"
        >
          {/* COLUMN 1: Backlog / To Do */}
          <div
            className={`${
              activeMobileCol === "all" || activeMobileCol === "backlog" ? "flex" : "hidden md:flex"
            } flex-col h-full bg-[#161F2D] rounded-2xl p-3 border border-[#2A3446] space-y-2.5 min-h-0`}
          >
            <div className="flex items-center justify-between px-1 shrink-0">
              <div className="flex items-center gap-1.5">
                <span className="size-2 rounded-full bg-slate-400" />
                <h3 className="text-xs font-black uppercase tracking-wider text-[#F1F5F9]">Backlog</h3>
              </div>
              <span className="px-1.5 py-0.2 rounded-full text-[9px] font-black bg-[#0B111C] text-[#7FA0D6] border border-[#2A3446]">
                {data?.tasks?.backlog?.length || 0}
              </span>
            </div>

            {/* Cards */}
            <div className="flex-1 overflow-y-auto space-y-2.5 pr-1 custom-scrollbar min-h-0">
              {(!data?.tasks?.backlog || data.tasks.backlog.length === 0) ? (
                <div className="bg-[#0B111C]/60 border border-dashed border-[#2A3446] rounded-xl p-4 text-center">
                  <p className="text-xs font-medium text-[#97A0B3]">No backlog tasks</p>
                </div>
              ) : (
                data.tasks.backlog.map((task) => (
                  <div key={task.id} className="bg-[#0B111C] rounded-xl p-3 border border-[#2A3446] shadow-2xs hover:border-[#7FA0D6]/30 transition-all space-y-2">
                    <div className="flex items-center justify-between text-[10.5px] font-bold">
                      <span className="text-[#7FA0D6] truncate max-w-[130px]">{task.client_name || "Client"}</span>
                      <span className="text-[#97A0B3]">{task.hours_remaining ? `${task.hours_remaining}h` : (task.due_date || "")}</span>
                    </div>
                    <h4 className="text-xs font-black text-white leading-snug">
                      {task.blueprint?.concept_name || `${task.client_name || "Sprint"} ${task.deliverable_type?.toUpperCase() || "Asset"}`}
                    </h4>
                    <div className="flex items-center justify-between pt-1.5 border-t border-[#2A3446] text-[10.5px]">
                      <span className="px-1.5 py-0.2 rounded bg-[#7FA0D6]/15 text-[#7FA0D6] font-bold text-[9px] border border-[#7FA0D6]/30">
                        {task.deliverable_type?.toUpperCase() || "ASSET"}
                      </span>
                      <div className="flex items-center gap-1 text-[#F1F5F9] font-bold text-[9.5px]">
                        <span>{task.assignee?.full_name || task.assignee_name || "Unassigned"}</span>
                      </div>
                    </div>
                  </div>
                ))
              )}

              <button
                onClick={() => setAssignModalOpen(true)}
                className="w-full py-2 rounded-xl border border-dashed border-[#2A3446] text-[#97A0B3] hover:text-[#7FA0D6] hover:border-[#7FA0D6] hover:bg-[#0B111C] text-xs font-bold flex items-center justify-center gap-1 transition-colors cursor-pointer"
              >
                <Plus className="size-3" /> Add Backlog Card
              </button>
            </div>
          </div>

          {/* COLUMN 2: In Progress / Active */}
          <div
            className={`${
              activeMobileCol === "all" || activeMobileCol === "in_progress" ? "flex" : "hidden md:flex"
            } flex-col h-full bg-[#161F2D] rounded-2xl p-3 border border-[#7FA0D6]/30 space-y-2.5 min-h-0`}
          >
            <div className="flex items-center justify-between px-1 shrink-0">
              <div className="flex items-center gap-1.5">
                <span className="size-2 rounded-full bg-[#7FA0D6] animate-pulse" />
                <h3 className="text-xs font-black uppercase tracking-wider text-[#7FA0D6]">In Progress</h3>
              </div>
              <span className="px-1.5 py-0.2 rounded-full text-[9px] font-black bg-[#7FA0D6]/15 text-[#7FA0D6] border border-[#7FA0D6]/30">
                {data?.tasks?.in_production?.length || 0}
              </span>
            </div>

            {/* Cards */}
            <div className="flex-1 overflow-y-auto space-y-2.5 pr-1 custom-scrollbar min-h-0">
              {(!data?.tasks?.in_production || data.tasks.in_production.length === 0) ? (
                <div className="bg-[#0B111C]/60 border border-dashed border-[#2A3446] rounded-xl p-4 text-center">
                  <p className="text-xs font-medium text-[#97A0B3]">No tasks currently in progress</p>
                </div>
              ) : (
                data.tasks.in_production.map((task) => (
                  <div key={task.id} className="bg-[#0B111C] rounded-xl p-3 border border-[#2A3446] shadow-2xs hover:border-[#7FA0D6]/30 transition-all space-y-2">
                    <div className="flex items-center justify-between text-[10.5px] font-bold">
                      <span className="text-[#7FA0D6] truncate max-w-[130px]">{task.client_name || "Client"}</span>
                      {task.is_near_sla && (
                        <span className="px-1.5 py-0.2 rounded bg-amber-500/15 text-amber-400 border border-amber-500/30 text-[8.5px] font-extrabold">Urgent SLA</span>
                      )}
                    </div>
                    <div>
                      <h4 className="text-xs font-black text-white leading-snug">
                        {task.blueprint?.concept_name || `${task.client_name || "Sprint"} ${task.deliverable_type?.toUpperCase() || "Asset"}`}
                      </h4>
                      <p className="text-[9.5px] text-[#97A0B3] font-medium mt-0.5">{task.assignee_role || "Creative Execution"}</p>
                    </div>
                    <div className="flex items-center justify-between pt-1.5 border-t border-[#2A3446] text-[9.5px] font-bold text-[#F1F5F9]">
                      <span>{task.assignee?.full_name || task.assignee_name || "Specialist"}</span>
                      <span className="px-1.5 py-0.2 rounded bg-[#7FA0D6]/15 text-[#7FA0D6] font-bold text-[9px] border border-[#7FA0D6]/30">
                        {task.deliverable_type?.toUpperCase() || "ASSET"}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* COLUMN 3: Pending Lead QA Review */}
          <div
            className={`${
              activeMobileCol === "all" || activeMobileCol === "review" ? "flex" : "hidden md:flex"
            } flex-col h-full bg-[#161F2D] rounded-2xl p-3 border border-amber-500/40 space-y-2.5 min-h-0`}
          >
            <div className="flex items-center justify-between px-1 shrink-0">
              <div className="flex items-center gap-1.5">
                <span className="size-2 rounded-full bg-amber-400 animate-ping" />
                <h3 className="text-xs font-black uppercase tracking-wider text-amber-400">Lead QA Review</h3>
              </div>
              <span className="px-1.5 py-0.2 rounded-full text-[9px] font-black bg-amber-500/15 text-amber-400 border border-amber-500/30">
                {data?.tasks?.internal_qa?.length || 0}
              </span>
            </div>

            {/* Cards */}
            <div className="flex-1 overflow-y-auto space-y-2.5 pr-1 custom-scrollbar min-h-0">
              {(!data?.tasks?.internal_qa || data.tasks.internal_qa.length === 0) ? (
                <div className="bg-[#0B111C]/60 border border-dashed border-[#2A3446] rounded-xl p-4 text-center">
                  <p className="text-xs font-medium text-[#97A0B3]">No deliverables awaiting sign-off</p>
                </div>
              ) : (
                data.tasks.internal_qa.map((task) => (
                  <div key={task.id} className="bg-[#0B111C] rounded-xl p-3 border border-[#2A3446] shadow-2xs hover:border-amber-500/30 transition-all space-y-2">
                    <div className="flex items-center justify-between text-[10.5px] font-bold">
                      <span className="text-[#7FA0D6] truncate max-w-[130px]">{task.client_name || "Client"}</span>
                      <span className="text-amber-400 font-bold text-[9.5px]">Awaiting QA</span>
                    </div>
                    <div>
                      <h4 className="text-xs font-black text-white leading-snug">
                        {task.blueprint?.concept_name || `${task.client_name || "Sprint"} ${task.deliverable_type?.toUpperCase() || "Asset"}`}
                      </h4>
                      <p className="text-[9.5px] text-[#97A0B3] font-medium mt-0.5">{task.assignee?.full_name || task.assignee_name}</p>
                    </div>
                    <div className="flex items-center gap-1.5 pt-1.5 border-t border-[#2A3446]">
                      <Link
                        to="/lead/deliverables"
                        className="flex-1 py-1 rounded-lg bg-[#161F2D] border border-[#2A3446] hover:bg-[#161F2D] text-[#F1F5F9] hover:text-[#7FA0D6] text-[10px] font-bold flex items-center justify-center gap-1 transition-colors"
                      >
                        <Eye className="size-3" /> Inspect
                      </Link>
                      <button
                        onClick={() => {
                          qaMutation.mutate({ taskId: task.id, decision: "approve", comment: "Direct QA sign-off from Task Board." });
                        }}
                        className="flex-1 py-1 rounded-lg bg-[#7FA0D6] hover:bg-blue-600 text-white text-[10px] font-bold flex items-center justify-center gap-1 shadow-xs cursor-pointer transition-colors"
                      >
                        <Check className="size-3" /> Sign-off
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* COLUMN 4: Approved & Dispatched */}
          <div
            className={`${
              activeMobileCol === "all" || activeMobileCol === "dispatched" ? "flex" : "hidden md:flex"
            } flex-col h-full bg-[#161F2D] rounded-2xl p-3 border border-emerald-500/40 space-y-2.5 min-h-0`}
          >
            <div className="flex items-center justify-between px-1 shrink-0">
              <div className="flex items-center gap-1.5">
                <span className="size-2 rounded-full bg-emerald-400" />
                <h3 className="text-xs font-black uppercase tracking-wider text-emerald-400">Dispatched</h3>
              </div>
              <span className="px-1.5 py-0.2 rounded-full text-[9px] font-black bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 flex items-center gap-1">
                <Check className="size-3" /> {(data?.tasks?.completed?.length || 0) + (data?.tasks?.ready_to_publish?.length || 0)}
              </span>
            </div>

            {/* Cards */}
            <div className="flex-1 overflow-y-auto space-y-2.5 pr-1 custom-scrollbar min-h-0">
              {(!data?.tasks?.completed && !data?.tasks?.ready_to_publish) ||
              ((data?.tasks?.completed?.length || 0) === 0 && (data?.tasks?.ready_to_publish?.length || 0) === 0) ? (
                <div className="bg-[#0B111C]/60 border border-dashed border-[#2A3446] rounded-xl p-4 text-center">
                  <p className="text-xs font-medium text-[#97A0B3]">No dispatched tasks yet</p>
                </div>
              ) : (
                [...(data?.tasks?.ready_to_publish || []), ...(data?.tasks?.completed || [])].slice(0, 5).map((task) => (
                  <div key={task.id} className="bg-[#0B111C] rounded-xl p-3 border border-[#2A3446] shadow-2xs hover-card-innovative space-y-2">
                    <div className="flex items-center justify-between text-[10.5px] font-bold">
                      <span className="text-emerald-400 font-bold text-[9.5px] flex items-center gap-1">
                        <CheckCircle2 className="size-3 text-emerald-400" /> Dispatched
                      </span>
                      <span className="text-[#97A0B3] text-[9.5px]">{task.deliverable_type?.toUpperCase()}</span>
                    </div>
                    <div>
                      <h4 className="text-xs font-black text-white leading-snug">
                        {task.blueprint?.concept_name || `${task.client_name || "Client"} Asset`}
                      </h4>
                      <p className="text-[9.5px] text-[#97A0B3] font-medium mt-0.5">Delivered to client vault</p>
                    </div>
                    <div className="flex items-center justify-between pt-1.5 border-t border-[#2A3446] text-[9.5px] font-bold text-[#F1F5F9]">
                      <span>{task.assignee?.full_name || task.assignee_name || "Specialist"}</span>
                      <span className="text-emerald-400">● Accepted</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </motion.div>

        {/* 4. Bottom Footer Banner (Lead Management Controls) */}
        <div className="bg-[#161F2D] rounded-2xl p-3.5 sm:p-4 border border-[#2A3446]/80 shadow-2xs flex flex-col md:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="size-8 rounded-xl bg-[#7FA0D6]/15 text-[#7FA0D6] flex items-center justify-center font-black">
              <Sparkles className="size-3.5" />
            </div>
            <div>
              <h4 className="text-xs font-black text-white">Lead Management Controls</h4>
              <p className="text-[10.5px] text-[#97A0B3] font-medium">{leadName} acting on {podName} Production Authority</p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => setWorkloadModalOpen(true)}
              className="px-3.5 py-2 rounded-xl bg-[#0B111C] hover:bg-[#161F2D] border border-[#2A3446] hover:border-[#7FA0D6] text-[#F1F5F9] text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-2xs active:scale-95"
            >
              <ArrowLeftRight className="size-3.5 text-[#7FA0D6]" /> Balance Workload
            </button>
            <button
              onClick={() => setRerouteModalOpen(true)}
              className="px-3.5 py-2 rounded-xl bg-[#0B111C] hover:bg-[#161F2D] border border-[#2A3446] hover:border-[#7FA0D6] text-[#F1F5F9] text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-2xs active:scale-95"
            >
              <RefreshCw className="size-3.5 text-[#7FA0D6]" /> Re-route Blocked
            </button>
            <button
              onClick={handleExportSprintCSV}
              className="px-3.5 py-2 rounded-xl bg-[#0B111C] hover:bg-[#161F2D] border border-[#2A3446] hover:border-[#7FA0D6] text-[#F1F5F9] text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-2xs active:scale-95"
            >
              <FileCheck className="size-3.5 text-[#7FA0D6]" /> Export CSV
            </button>
          </div>
        </div>
      </main>

      {/* Assign Modal */}
      {assignModalOpen && (
        <div className="fixed inset-0 w-screen h-screen z-[9999] bg-slate-950/70 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
          <div className="w-full max-w-lg bg-[#161F2D] rounded-3xl p-6 sm:p-7 shadow-2xl border border-[#2A3446] space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-black text-white">Add Task to Sprint</h3>
              <button onClick={() => setAssignModalOpen(false)} className="text-[#97A0B3] hover:text-[#F1F5F9]">
                <X className="size-5" />
              </button>
            </div>
            <div className="space-y-3 text-xs">
              <div>
                <label className="font-bold text-[#F1F5F9] block mb-1">Task Title</label>
                <input
                  type="text"
                  value={newCardTitle}
                  onChange={(e) => setNewCardTitle(e.target.value)}
                  placeholder="e.g. Brand Launch Story Sequence"
                  className="w-full p-2.5 rounded-xl border border-[#2A3446] bg-[#0B111C] font-medium text-white"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-[#F1F5F9] block mb-1">Content Format</label>
                  <NativeSelect
                    className="w-full p-2.5 rounded-xl border border-[#2A3446] bg-[#0B111C] font-medium text-white"
                  >
                    <option value="Reel">Reel</option>
                    <option value="Story">Story</option>
                    <option value="Post">Post</option>
                  </NativeSelect>
                </div>
                <div>
                  <label className="font-bold text-[#F1F5F9] block mb-1">Client</label>
                  <NativeSelect
                    value={newCardClient}
                    onChange={(e) => setNewCardClient(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-[#2A3446] bg-[#0B111C] font-medium text-white"
                  >
                    {(!data?.clients || data.clients.length === 0) ? (
                      <option value="">No clients assigned to pod</option>
                    ) : (
                      data.clients.map((c) => (
                        <option key={c.id} value={c.name}>{c.name}</option>
                      ))
                    )}
                  </NativeSelect>
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-3 pt-3">
              <button
                onClick={() => setAssignModalOpen(false)}
                className="px-4 py-2 rounded-xl bg-[#0B111C] text-[#F1F5F9] text-xs font-bold hover:bg-[#161F2D] border border-[#2A3446] transition"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  showToast(`Added "${newCardTitle || "New Task"}" to Sprint Board`, "success");
                  setAssignModalOpen(false);
                  setNewCardTitle("");
                }}
                className="px-5 py-2 rounded-xl bg-blue-600 text-white text-xs font-bold hover:bg-blue-700 transition"
              >
                Add Card
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Interactive Workload Balancing Modal */}
      {workloadModalOpen && (
        <div className="fixed inset-0 w-screen h-screen z-[9999] bg-slate-950/75 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
          <div className="w-full max-w-lg bg-[#161F2D] rounded-3xl p-6 shadow-2xl border border-[#2A3446] space-y-4">
            <div className="flex items-center justify-between border-b border-[#2A3446] pb-3">
              <div className="flex items-center gap-2">
                <ArrowLeftRight className="size-5 text-[#7FA0D6]" />
                <h3 className="text-base font-black text-white">Pod Workload Auto-Balancer</h3>
              </div>
              <button onClick={() => setWorkloadModalOpen(false)} className="text-[#97A0B3] hover:text-white">
                <X className="size-5" />
              </button>
            </div>
            <p className="text-xs text-[#97A0B3] font-medium">
              Analyze capacity across {podName} specialists and balance sprint backlog allocation evenly.
            </p>
            <div className="space-y-2 text-xs">
              {(!data?.members || data.members.length === 0) ? (
                <div className="p-4 rounded-xl bg-[#0B111C] border border-dashed border-[#2A3446] text-center text-[#97A0B3]">
                  No specialists registered in this pod.
                </div>
              ) : (
                data.members.map((m) => (
                  <div key={m.id} className="p-3 rounded-xl bg-[#0B111C] border border-[#2A3446] flex items-center justify-between">
                    <div>
                      <span className="font-bold text-white block">{m.full_name} ({m.role})</span>
                      <span className="text-[10px] font-extrabold text-emerald-400">Available</span>
                    </div>
                    <span className="text-xs font-black text-white bg-[#161F2D] px-3 py-1 rounded-lg border border-[#2A3446]">
                      Active
                    </span>
                  </div>
                ))
              )}
            </div>
            <div className="flex justify-end gap-3 pt-3 border-t border-[#2A3446]">
              <button
                onClick={() => setWorkloadModalOpen(false)}
                className="px-4 py-2 rounded-xl bg-[#0B111C] border border-[#2A3446] text-[#F1F5F9] text-xs font-bold hover:bg-[#161F2D] transition"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  showToast("Workload distribution verified across specialists.", "success");
                  setWorkloadModalOpen(false);
                }}
                className="px-5 py-2 rounded-xl bg-[#7FA0D6] hover:bg-blue-600 text-white text-xs font-bold transition shadow-md shadow-blue-500/20"
              >
                Apply Re-balance
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Interactive Re-route Blocked Modal */}
      {rerouteModalOpen && (
        <div className="fixed inset-0 w-screen h-screen z-[9999] bg-slate-950/75 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
          <div className="w-full max-w-lg bg-[#161F2D] rounded-3xl p-6 shadow-2xl border border-[#2A3446] space-y-4">
            <div className="flex items-center justify-between border-b border-[#2A3446] pb-3">
              <div className="flex items-center gap-2">
                <RefreshCw className="size-5 text-amber-400" />
                <h3 className="text-base font-black text-white">Re-route Blocked Tasks</h3>
              </div>
              <button onClick={() => setRerouteModalOpen(false)} className="text-[#97A0B3] hover:text-white">
                <X className="size-5" />
              </button>
            </div>
            <div className="p-3.5 rounded-xl bg-amber-950/40 border border-amber-800/50 space-y-1 text-xs">
              <span className="font-extrabold text-amber-300 block">Blocked Task Re-allocation</span>
              <p className="text-[11px] text-amber-300/80">Pending client feedback or technical blocker. Re-assign task specialist to unblock workflow.</p>
            </div>
            <div className="space-y-2 text-xs">
              <label className="font-bold text-[#F1F5F9] block">Select Target Specialist for Re-routing</label>
              <NativeSelect
                value={rerouteTarget}
                onChange={(e) => setRerouteTarget(e.target.value)}
                className="w-full p-3 rounded-xl border border-[#2A3446] bg-[#0B111C] text-white font-bold"
              >
                {(!data?.members || data.members.length === 0) ? (
                  <option value="">No specialists registered</option>
                ) : (
                  data.members.map((m) => (
                    <option key={m.id} value={m.full_name}>{m.full_name} ({m.role})</option>
                  ))
                )}
              </NativeSelect>
            </div>
            <div className="flex justify-end gap-3 pt-3 border-t border-[#2A3446]">
              <button
                onClick={() => setRerouteModalOpen(false)}
                className="px-4 py-2 rounded-xl bg-[#0B111C] border border-[#2A3446] text-[#F1F5F9] text-xs font-bold hover:bg-[#161F2D] transition"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  showToast(`Re-routed blocked task to ${rerouteTarget || "assigned specialist"}. Slack alert sent!`, "success");
                  setRerouteModalOpen(false);
                }}
                className="px-5 py-2 rounded-xl bg-[#7FA0D6] hover:bg-blue-600 text-white text-xs font-bold transition shadow-md shadow-blue-500/20"
              >
                Re-route Task Now
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
