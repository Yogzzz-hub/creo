import { useState } from "react";
import { Link } from "react-router";
import { AdminTopHeader } from "../../components/admin/AdminTopHeader";
import { useQuery, useMutation } from "@tanstack/react-query";
import { submitPodQAReview, fetchPodDashboard, type PodDashboardData } from "../../lib/ops-api";
import { useAuth } from "../../lib/auth-context";
import {
  FolderKanban,
  AlertTriangle,
  Plus,
  Clock,
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
  const [newCardClient, setNewCardClient] = useState("Northwind Labs");

  // Mobile column switcher for sleek phone experience
  const [activeMobileCol, setActiveMobileCol] = useState<"all" | "backlog" | "in_progress" | "review" | "dispatched">("all");

  const { data } = useQuery<PodDashboardData>({
    queryKey: ["pod_dashboard"],
    queryFn: () => fetchPodDashboard(),
  });

  const podName = data?.pod?.name || "Pod A";
  const leadName = data?.pod?.lead?.name || user?.full_name || "Maya Lin";

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
    const rows = [
      ["TASK-B1", "Backlog", "Motion Identity Guidelines Reel", "Reel", "Northwind Labs", "Elena R.", "Ready for Sprint"],
      ["TASK-B2", "Backlog", "TikTok Story Sequence (3 Panels)", "Story", "Bloom Studio", "David Kim", "High Priority"],
      ["TASK-B3", "Backlog", "Holiday Promotion Post Deck", "Post", "Atlas Commerce", "Chloe Tan", "Scheduled"],
      ["TASK-P1", "In Progress", "Render 3D Product Teaser Reel", "Reel", "Northwind Labs", "David Kim", "75% Render Complete"],
      ["TASK-P2", "In Progress", "Brand Messaging Architecture Post", "Post", "Atlas Commerce", "Marcus Vance", "55% Drafting Complete"],
      ["TASK-P3", "In Progress", "Social Carousels Deck Post", "Post", "Bloom Studio", "Elena R.", "90% Polish Phase"],
      ["TASK-QA1", "Pending Lead QA", "Fintech Reel Ad Set", "Reel", "Northwind Labs", "David Kim", "Requires Lead Sign-off"],
      ["TASK-QA2", "Pending Lead QA", "Q4 Reel Concept Kinetic Cut", "Reel", "Bloom Studio", "Chloe Tan", "Preview Ready"],
      ["TASK-QA3", "Pending Lead QA", "High-Impact Case Study Post", "Post", "Atlas Commerce", "Elena R.", "Review Draft"],
      ["TASK-D1", "Approved & Dispatched", "Fintech Hero Animation Reel", "Reel", "Northwind Labs", "David Kim", "Delivered 2h ago"],
      ["TASK-D2", "Approved & Dispatched", "Motion Reel Deliverable Set", "Reel", "Bloom Studio", "Chloe Tan", "Delivered 4h ago"],
      ["TASK-D3", "Approved & Dispatched", "Viral Hook Reel Variants", "Reel", "Atlas Commerce", "Elena R.", "Delivered Yesterday"],
    ];

    const csvContent = [headers.join(","), ...rows.map(r => r.map(c => `"${c}"`).join(","))].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `Pod_A_Sprint_Task_Board_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    showToast("Downloaded Pod A Sprint Task Board CSV report", "success");
  };

  return (
    <div data-surface="ops" className="min-h-screen bg-[#F8FAFC] text-slate-900 font-sans flex flex-col">
      {/* Top Header */}
      <AdminTopHeader title="Content Engine" activeTab="Content Engine" />

      {/* Main Container */}
      <main className="flex-1 max-w-[1440px] w-full mx-auto px-3 sm:px-5 lg:px-6 py-3.5 pb-20 sm:pb-6 space-y-3.5 sm:space-y-4">
        {/* Toast Alert */}
        {toastMessage && (
          <div
            className={`p-3 rounded-xl border text-xs font-bold flex items-center justify-between shadow-lg animate-fade-in ${
              toastMessage.type === "error"
                ? "bg-rose-50 border-rose-200 text-rose-700"
                : "bg-emerald-50 border-emerald-200 text-emerald-700"
            }`}
          >
            <span>{toastMessage.text}</span>
            <button onClick={() => setToastMessage(null)} className="text-current opacity-70 hover:opacity-100">
              &times;
            </button>
          </div>
        )}

        {/* 1. Quick Actions Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 bg-white p-2.5 sm:px-4 sm:py-2.5 rounded-2xl border border-slate-200/80 shadow-2xs">
          <div className="flex items-center gap-2">
            <span className="size-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-xs font-bold text-slate-700">{podName} Sprint Workflow · Lead {leadName}</span>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={handleExportSprintCSV}
              className="px-3 py-1.5 rounded-xl bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-bold flex items-center gap-1.5 shadow-2xs transition-colors cursor-pointer"
            >
              <FileText className="size-3.5 text-slate-500" />
              Export Report
            </button>
            <button
              onClick={() => setAssignModalOpen(true)}
              className="px-3.5 py-1.5 rounded-xl bg-[#2563EB] hover:bg-blue-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-xs transition-all cursor-pointer"
            >
              <Plus className="size-3.5" />
              Assign New Task
            </button>
          </div>
        </div>

        {/* 2. Top Summary KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 sm:gap-3">
          {/* Card 1: Total Active Tasks */}
          <div className="bg-white rounded-xl sm:rounded-2xl p-2.5 sm:p-3 border border-slate-200/80 shadow-2xs flex items-center justify-between">
            <div className="space-y-0.5">
              <span className="text-[9px] sm:text-[10px] font-bold uppercase tracking-wider text-slate-400">Total Active Tasks</span>
              <div className="flex items-baseline gap-1.5">
                <span className="text-lg sm:text-xl font-black text-[#0F172A]">18</span>
                <span className="text-[10.5px] sm:text-[11px] font-bold text-slate-500">Tasks in Sprint</span>
              </div>
              <p className="text-[10px] sm:text-[11px] font-bold text-blue-600 pt-0.5">
                4 In Progress · 6 Review · 8 Backlog
              </p>
            </div>
            <div className="size-7 sm:size-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
              <FolderKanban className="size-3.5 sm:size-4" />
            </div>
          </div>

          {/* Card 2: Blockers / Escalations */}
          <div className="bg-white rounded-xl sm:rounded-2xl p-2.5 sm:p-3 border border-slate-200/80 shadow-2xs flex items-center justify-between">
            <div className="space-y-0.5">
              <span className="text-[9px] sm:text-[10px] font-bold uppercase tracking-wider text-slate-400">Blockers / Escalations</span>
              <div className="flex items-baseline gap-1.5">
                <span className="text-lg sm:text-xl font-black text-rose-600">1</span>
                <span className="text-[10.5px] sm:text-[11px] font-bold text-rose-500">Action Blocker</span>
              </div>
              <div className="flex flex-wrap items-center gap-1.5 pt-0.5 text-[10px] sm:text-[11px]">
                <span className="text-slate-600 font-medium">Atlas copy sign-off required</span>
                <button
                  onClick={() => showToast("Reminder ping dispatched to Atlas client Slack channel", "success")}
                  className="font-bold text-blue-600 hover:underline cursor-pointer"
                >
                  Ping Client
                </button>
              </div>
            </div>
            <div className="size-7 sm:size-8 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center shrink-0">
              <AlertTriangle className="size-3.5 sm:size-4" />
            </div>
          </div>
        </div>

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
                  ? "bg-slate-900 text-white shadow-2xs"
                  : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50"
              }`}
            >
              <span>{col.label}</span>
              <span
                className={`px-1.5 py-0.2 rounded-full text-[9px] ${
                  activeMobileCol === col.id ? "bg-slate-700 text-white" : "bg-slate-100 text-slate-600"
                }`}
              >
                {col.count}
              </span>
            </button>
          ))}
        </div>

        {/* 3. Four Kanban Columns */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-3.5 items-start">
          {/* COLUMN 1: Backlog / To Do */}
          <div
            className={`${
              activeMobileCol === "all" || activeMobileCol === "backlog" ? "block" : "hidden md:block"
            } bg-slate-100/60 rounded-2xl p-3 border border-slate-200/70 space-y-2.5`}
          >
            <div className="flex items-center justify-between px-1">
              <div className="flex items-center gap-1.5">
                <span className="size-2 rounded-full bg-slate-400" />
                <h3 className="text-xs font-black uppercase tracking-wider text-slate-700">Backlog</h3>
              </div>
              <span className="px-1.5 py-0.2 rounded-full text-[9px] font-black bg-white text-slate-600 border border-slate-200">
                8
              </span>
            </div>

            {/* Cards */}
            <div className="space-y-2.5">
              {/* Card 1: Reel */}
              <div className="bg-white rounded-xl p-3 border border-slate-200/80 shadow-2xs hover:shadow-xs transition-all space-y-2">
                <div className="flex items-center justify-between text-[10.5px] font-bold">
                  <span className="text-blue-600">Northwind Labs</span>
                  <span className="text-slate-400">3h</span>
                </div>
                <h4 className="text-xs font-black text-[#0F172A] leading-snug">Motion Reel · Brand Showcase (9:16)</h4>
                <div className="flex items-center justify-between pt-1.5 border-t border-slate-100 text-[10.5px]">
                  <span className="px-1.5 py-0.2 rounded bg-blue-50 text-blue-700 font-bold text-[9px]">
                    Reel
                  </span>
                  <div className="flex items-center gap-1 text-slate-600 font-bold text-[9.5px]">
                    <span>Elena R.</span>
                    <div className="size-4.5 rounded bg-blue-600 text-white flex items-center justify-center font-black text-[8px]">
                      ER
                    </div>
                  </div>
                </div>
              </div>

              {/* Card 2: Story */}
              <div className="bg-white rounded-xl p-3 border border-slate-200/80 shadow-2xs hover:shadow-xs transition-all space-y-2">
                <div className="flex items-center justify-between text-[10.5px] font-bold">
                  <span className="text-purple-600">Bloom Studio</span>
                  <span className="px-1.5 py-0.2 rounded bg-rose-50 text-rose-700 text-[8.5px]">High Priority</span>
                </div>
                <h4 className="text-xs font-black text-[#0F172A] leading-snug">TikTok Story Sequence (3 Panels)</h4>
                <div className="flex items-center justify-between pt-1.5 border-t border-slate-100 text-[10.5px]">
                  <span className="px-1.5 py-0.2 rounded bg-purple-50 text-purple-700 font-bold text-[9px]">
                    Story
                  </span>
                  <div className="flex items-center gap-1 text-slate-600 font-bold text-[9.5px]">
                    <span>David Kim</span>
                    <div className="size-4.5 rounded bg-[#0F172A] text-white flex items-center justify-center font-black text-[8px]">
                      DK
                    </div>
                  </div>
                </div>
              </div>

              {/* Card 3: Post */}
              <div className="bg-white rounded-xl p-3 border border-slate-200/80 shadow-2xs hover:shadow-xs transition-all space-y-2">
                <div className="flex items-center justify-between text-[10.5px] font-bold">
                  <span className="text-slate-700">Atlas Commerce</span>
                  <span className="text-slate-400">2h</span>
                </div>
                <h4 className="text-xs font-black text-[#0F172A] leading-snug">Holiday Promotion Post Deck</h4>
                <div className="flex items-center justify-between pt-1.5 border-t border-slate-100 text-[10.5px]">
                  <span className="px-1.5 py-0.2 rounded bg-emerald-50 text-emerald-700 font-bold text-[9px]">
                    Post
                  </span>
                  <div className="flex items-center gap-1 text-slate-600 font-bold text-[9.5px]">
                    <span>Chloe Tan</span>
                    <div className="size-4.5 rounded bg-teal-600 text-white flex items-center justify-center font-black text-[8px]">
                      CT
                    </div>
                  </div>
                </div>
              </div>

              <button
                onClick={() => {
                  setAssignModalOpen(true);
                }}
                className="w-full py-2 rounded-xl border border-dashed border-slate-300 text-slate-500 hover:text-blue-600 hover:border-blue-400 hover:bg-white text-xs font-bold flex items-center justify-center gap-1 transition-colors cursor-pointer"
              >
                <Plus className="size-3" /> Add Backlog Card
              </button>
            </div>
          </div>

          {/* COLUMN 2: In Progress / Active */}
          <div
            className={`${
              activeMobileCol === "all" || activeMobileCol === "in_progress" ? "block" : "hidden md:block"
            } bg-blue-50/40 rounded-2xl p-3 border border-blue-100 space-y-2.5`}
          >
            <div className="flex items-center justify-between px-1">
              <div className="flex items-center gap-1.5">
                <span className="size-2 rounded-full bg-blue-500 animate-pulse" />
                <h3 className="text-xs font-black uppercase tracking-wider text-blue-900">In Progress</h3>
              </div>
              <span className="px-1.5 py-0.2 rounded-full text-[9px] font-black bg-blue-100 text-blue-800">
                4
              </span>
            </div>

            {/* Cards */}
            <div className="space-y-2.5">
              {/* Card 1: Reel */}
              <div className="bg-white rounded-xl p-3 border border-slate-200/80 shadow-2xs hover:shadow-xs transition-all space-y-2">
                <div className="flex items-center justify-between text-[10.5px] font-bold">
                  <span className="text-blue-600">Northwind Labs</span>
                  <span className="px-1.5 py-0.2 rounded bg-amber-50 text-amber-700 text-[8.5px]">Reel · Urgent</span>
                </div>
                <div>
                  <h4 className="text-xs font-black text-[#0F172A] leading-snug">Product Launch Reel (15s)</h4>
                  <p className="text-[9.5px] text-slate-400 font-medium mt-0.5">Octane cinematic pass · 9:16 Vertical</p>
                </div>
                <div className="space-y-0.5">
                  <div className="flex justify-between text-[9.5px] font-bold text-slate-500">
                    <span>Rendering</span>
                    <span className="text-blue-600 font-black">75%</span>
                  </div>
                  <div className="w-full h-1 bg-slate-100 rounded-full overflow-hidden">
                    <div className="h-full bg-blue-600 rounded-full" style={{ width: "75%" }} />
                  </div>
                </div>
                <div className="flex items-center gap-1.5 pt-1.5 border-t border-slate-100 text-[9.5px] font-bold text-slate-600">
                  <div className="size-4.5 rounded bg-[#0F172A] text-white flex items-center justify-center font-black text-[8px]">
                    DK
                  </div>
                  <span>David Kim · Motion</span>
                </div>
              </div>

              {/* Card 2: Story */}
              <div className="bg-white rounded-xl p-3 border border-slate-200/80 shadow-2xs hover:shadow-xs transition-all space-y-2">
                <div className="flex items-center justify-between text-[10.5px] font-bold">
                  <span className="text-slate-700">Atlas Commerce</span>
                  <span className="px-1.5 py-0.2 rounded bg-purple-50 text-purple-700 text-[8.5px]">Story</span>
                </div>
                <div>
                  <h4 className="text-xs font-black text-[#0F172A] leading-snug">Campaign Story Suite</h4>
                  <p className="text-[9.5px] text-slate-400 font-medium mt-0.5">Value propositions & hook sequences</p>
                </div>
                <div className="space-y-0.5">
                  <div className="flex justify-between text-[9.5px] font-bold text-slate-500">
                    <span>Progress</span>
                    <span className="text-emerald-600 font-black">55%</span>
                  </div>
                  <div className="w-full h-1 bg-slate-100 rounded-full overflow-hidden">
                    <div className="h-full bg-emerald-500 rounded-full" style={{ width: "55%" }} />
                  </div>
                </div>
                <div className="flex items-center gap-1.5 pt-1.5 border-t border-slate-100 text-[9.5px] font-bold text-slate-600">
                  <div className="size-4.5 rounded bg-indigo-600 text-white flex items-center justify-center font-black text-[8px]">
                    MV
                  </div>
                  <span>Marcus Vance · Copy</span>
                </div>
              </div>

              {/* Card 3: Post */}
              <div className="bg-white rounded-xl p-3 border border-slate-200/80 shadow-2xs hover:shadow-xs transition-all space-y-2">
                <div className="flex items-center justify-between text-[10.5px] font-bold">
                  <span className="text-slate-700">Atlas Commerce</span>
                  <span className="text-rose-600 font-bold text-[9.5px] flex items-center gap-0.5">
                    <Clock className="size-2.5" /> Due in 1h
                  </span>
                </div>
                <div>
                  <h4 className="text-xs font-black text-[#0F172A] leading-snug">Post Carousel · 10 Panels</h4>
                  <p className="text-[9.5px] text-slate-400 font-medium mt-0.5">10 static panels for feed</p>
                </div>
                <div className="space-y-0.5">
                  <div className="flex justify-between text-[9.5px] font-bold text-slate-500">
                    <span>Exporting</span>
                    <span className="text-emerald-600 font-black">90%</span>
                  </div>
                  <div className="w-full h-1 bg-slate-100 rounded-full overflow-hidden">
                    <div className="h-full bg-emerald-500 rounded-full" style={{ width: "90%" }} />
                  </div>
                </div>
                <div className="flex items-center gap-1.5 pt-1.5 border-t border-slate-100 text-[9.5px] font-bold text-slate-600">
                  <div className="size-4.5 rounded bg-blue-600 text-white flex items-center justify-center font-black text-[8px]">
                    ER
                  </div>
                  <span>Elena R. · Brand</span>
                </div>
              </div>
            </div>
          </div>

          {/* COLUMN 3: Pending Lead QA Review */}
          <div
            className={`${
              activeMobileCol === "all" || activeMobileCol === "review" ? "block" : "hidden md:block"
            } bg-amber-50/40 rounded-2xl p-3 border border-amber-200/70 space-y-2.5`}
          >
            <div className="flex items-center justify-between px-1">
              <div className="flex items-center gap-1.5">
                <span className="size-2 rounded-full bg-amber-500 animate-ping" />
                <h3 className="text-xs font-black uppercase tracking-wider text-amber-900">Lead QA Review</h3>
              </div>
              <span className="px-1.5 py-0.2 rounded-full text-[9px] font-black bg-amber-100 text-amber-900">
                6
              </span>
            </div>

            {/* Cards */}
            <div className="space-y-2.5">
              {/* Card 1: Reel */}
              <div className="bg-white rounded-xl p-3 border border-amber-200 shadow-2xs hover:shadow-xs transition-all space-y-2">
                <div className="flex items-center justify-between text-[10.5px] font-bold">
                  <span className="text-blue-600">Northwind Labs</span>
                  <span className="text-amber-600 font-bold text-[9.5px]">Due in 2h</span>
                </div>
                <div>
                  <h4 className="text-xs font-black text-[#0F172A] leading-snug">Fintech Reel · Conversion (9:16)</h4>
                  <p className="text-[9.5px] text-slate-400 font-medium mt-0.5">David Kim · 3 variations</p>
                </div>
                <div className="flex items-center gap-1.5 pt-1.5">
                  <Link
                    to="/lead/deliverables"
                    className="flex-1 py-1 rounded-lg bg-slate-50 border border-slate-200 hover:bg-slate-100 text-slate-700 text-[10px] font-bold flex items-center justify-center gap-1"
                  >
                    <Eye className="size-3" /> Inspect
                  </Link>
                  <button
                    onClick={() => {
                      qaMutation.mutate({ taskId: "t-1", decision: "approve", comment: "Direct QA sign-off from Task Board." });
                    }}
                    className="flex-1 py-1 rounded-lg bg-[#2563EB] hover:bg-blue-700 text-white text-[10px] font-bold flex items-center justify-center gap-1 shadow-xs cursor-pointer"
                  >
                    <Check className="size-3" /> Sign-off
                  </button>
                </div>
              </div>

              {/* Card 2: Story */}
              <div className="bg-white rounded-xl p-3 border border-slate-200/80 shadow-2xs hover:shadow-xs transition-all space-y-2">
                <div className="flex items-center justify-between text-[10.5px] font-bold">
                  <span className="text-purple-600">Bloom Studio</span>
                  <span className="text-slate-500 text-[9.5px]">Due in 4h</span>
                </div>
                <div>
                  <h4 className="text-xs font-black text-[#0F172A] leading-snug">Q4 Story · Kinetic Cut</h4>
                  <p className="text-[9.5px] text-slate-400 font-medium mt-0.5">Chloe Tan · Audio calibrated</p>
                </div>
                <Link
                  to="/lead/deliverables"
                  className="w-full py-1 rounded-lg bg-slate-50 border border-slate-200 hover:bg-slate-100 text-slate-700 text-[10px] font-bold flex items-center justify-center gap-1"
                >
                  <Eye className="size-3" /> Preview Story
                </Link>
              </div>

              {/* Card 3: Post */}
              <div className="bg-white rounded-xl p-3 border border-slate-200/80 shadow-2xs hover:shadow-xs transition-all space-y-2">
                <div className="flex items-center justify-between text-[10.5px] font-bold">
                  <span className="text-purple-600">Bloom Studio</span>
                  <span className="px-1.5 py-0.2 rounded bg-emerald-50 text-emerald-700 text-[8.5px]">Ready</span>
                </div>
                <div>
                  <h4 className="text-xs font-black text-[#0F172A] leading-snug">E-commerce Post Showcase</h4>
                  <p className="text-[9.5px] text-slate-400 font-medium mt-0.5">Elena R. · Feed format</p>
                </div>
                <button
                  onClick={() => {
                    qaMutation.mutate({ taskId: "t-3", decision: "approve", comment: "Post showcase approved." });
                  }}
                  className="w-full py-1 rounded-lg bg-slate-50 border border-slate-200 hover:bg-slate-100 text-slate-700 text-[10px] font-bold flex items-center justify-center gap-1 cursor-pointer"
                >
                  <FileCheck className="size-3" /> Review Draft
                </button>
              </div>
            </div>
          </div>

          {/* COLUMN 4: Approved & Dispatched */}
          <div
            className={`${
              activeMobileCol === "all" || activeMobileCol === "dispatched" ? "block" : "hidden md:block"
            } bg-emerald-50/40 rounded-2xl p-3 border border-emerald-100 space-y-2.5`}
          >
            <div className="flex items-center justify-between px-1">
              <div className="flex items-center gap-1.5">
                <span className="size-2 rounded-full bg-emerald-500" />
                <h3 className="text-xs font-black uppercase tracking-wider text-emerald-900">Dispatched</h3>
              </div>
              <span className="px-1.5 py-0.2 rounded-full text-[9px] font-black bg-emerald-100 text-emerald-900 flex items-center gap-1">
                <Check className="size-3" /> 3
              </span>
            </div>

            {/* Cards */}
            <div className="space-y-2.5">
              {/* Card 1: Reel */}
              <div className="bg-white rounded-xl p-3 border border-slate-200/80 shadow-2xs hover:shadow-xs transition-all space-y-2">
                <div className="flex items-center justify-between text-[10.5px] font-bold">
                  <span className="text-emerald-700 font-bold text-[9.5px] flex items-center gap-1">
                    <CheckCircle2 className="size-3 text-emerald-600" /> Dispatched
                  </span>
                  <span className="text-slate-400 text-[9.5px]">Reel</span>
                </div>
                <div>
                  <h4 className="text-xs font-black text-[#0F172A] leading-snug">Fintech Reel Animation (9:16)</h4>
                  <p className="text-[9.5px] text-slate-400 font-medium mt-0.5">Delivered to Northwind Labs</p>
                </div>
                <div className="flex items-center justify-between pt-1.5 border-t border-slate-100 text-[9.5px] font-bold text-slate-600">
                  <div className="flex items-center gap-1">
                    <div className="size-4.5 rounded bg-[#0F172A] text-white flex items-center justify-center font-black text-[8px]">
                      DK
                    </div>
                    <span>David Kim</span>
                  </div>
                  <span className="text-emerald-600">● Accepted</span>
                </div>
              </div>

              {/* Card 2: Story */}
              <div className="bg-white rounded-xl p-3 border border-slate-200/80 shadow-2xs hover:shadow-xs transition-all space-y-2">
                <div className="flex items-center justify-between text-[10.5px] font-bold">
                  <span className="text-emerald-700 font-bold text-[9.5px] flex items-center gap-1">
                    <CheckCircle2 className="size-3 text-emerald-600" /> Verified
                  </span>
                  <span className="text-slate-400 text-[9.5px]">Story</span>
                </div>
                <div>
                  <h4 className="text-xs font-black text-[#0F172A] leading-snug">Brand Story Suite Master</h4>
                  <p className="text-[9.5px] text-slate-400 font-medium mt-0.5">Synced to shared Figma Library</p>
                </div>
                <div className="flex items-center justify-between pt-1.5 border-t border-slate-100 text-[9.5px] font-bold text-slate-600">
                  <div className="flex items-center gap-1">
                    <div className="size-4.5 rounded bg-teal-600 text-white flex items-center justify-center font-black text-[8px]">
                      CT
                    </div>
                    <span>Chloe Tan</span>
                  </div>
                  <span className="text-slate-500">Bloom</span>
                </div>
              </div>

              {/* Card 3: Summary link */}
              <div className="p-2.5 bg-white/70 rounded-xl border border-dashed border-emerald-200 text-center">
                <span className="text-[10px] text-slate-500 font-medium block">
                  2 older completed tasks
                </span>
                <Link to="/lead/deliverables" className="text-[11px] font-bold text-blue-600 hover:underline mt-0.5 inline-block">
                  View History →
                </Link>
              </div>
            </div>
          </div>
        </div>

        {/* 4. Bottom Footer Banner (Lead Management Controls) */}
        <div className="bg-white rounded-2xl p-3.5 sm:p-4 border border-slate-200/80 shadow-2xs flex flex-col md:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="size-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-black">
              <Sparkles className="size-3.5" />
            </div>
            <div>
              <h4 className="text-xs font-black text-[#0F172A]">Lead Management Controls</h4>
              <p className="text-[10.5px] text-slate-400 font-medium">{leadName} acting on {podName} Production Authority</p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => showToast("Workload balance analysis complete across Pod A roster", "success")}
              className="px-3 py-1.5 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 text-xs font-bold flex items-center gap-1 transition-colors cursor-pointer"
            >
              <ArrowLeftRight className="size-3" /> Balance Workload
            </button>
            <button
              onClick={() => showToast("Re-routed 1 blocked task to Marcus Vance", "success")}
              className="px-3 py-1.5 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 text-xs font-bold flex items-center gap-1 transition-colors cursor-pointer"
            >
              <RefreshCw className="size-3" /> Re-route Blocked
            </button>
            <button
              onClick={handleExportSprintCSV}
              className="px-3 py-1.5 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 text-xs font-bold flex items-center gap-1 transition-colors cursor-pointer"
            >
              <FileCheck className="size-3" /> Export CSV
            </button>
          </div>
        </div>
      </main>

      {/* Assign Modal */}
      {assignModalOpen && (
        <div className="fixed inset-0 w-screen h-screen z-[9999] bg-slate-950/70 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
          <div className="w-full max-w-lg bg-white rounded-3xl p-6 sm:p-7 shadow-2xl border border-slate-100 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-black text-[#0F172A]">Add Task to Sprint</h3>
              <button onClick={() => setAssignModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="size-5" />
              </button>
            </div>
            <div className="space-y-3 text-xs">
              <div>
                <label className="font-bold text-slate-700 block mb-1">Task Title</label>
                <input
                  type="text"
                  value={newCardTitle}
                  onChange={(e) => setNewCardTitle(e.target.value)}
                  placeholder="e.g. Brand Launch Story Sequence"
                  className="w-full p-2.5 rounded-xl border border-slate-200 bg-slate-50 font-medium"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Content Format</label>
                  <select
                    className="w-full p-2.5 rounded-xl border border-slate-200 bg-slate-50 font-medium"
                  >
                    <option value="Reel">Reel</option>
                    <option value="Story">Story</option>
                    <option value="Post">Post</option>
                  </select>
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Client</label>
                  <select
                    value={newCardClient}
                    onChange={(e) => setNewCardClient(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-slate-200 bg-slate-50 font-medium"
                  >
                    <option value="Northwind Labs">Northwind Labs</option>
                    <option value="Bloom Studio">Bloom Studio</option>
                    <option value="Atlas Commerce">Atlas Commerce</option>
                  </select>
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-3 pt-3">
              <button
                onClick={() => setAssignModalOpen(false)}
                className="px-4 py-2 rounded-xl bg-slate-100 text-slate-700 text-xs font-bold hover:bg-slate-200 transition"
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
    </div>
  );
}
