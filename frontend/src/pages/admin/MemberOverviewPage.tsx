import { NativeSelect } from "../../ui/NativeSelect";
import { useState, useEffect, useMemo } from "react";
import { Link, useNavigate } from "react-router";
import { motion } from "motion/react";
import {
  Users,
  Clock,
  Calendar,
  Sparkles,
  ArrowRight,
  Layers,
  Send,
  Upload,
  CheckCircle2,
  FileText,
  Video,
  X,
  ExternalLink,
  Eye,
  Loader2,
  AlertTriangle,
  MessageSquare,
} from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { fetchPodDashboard, type PodDashboardData, type PodTask } from "../../lib/ops-api";
import { uploadTaskDeliverable, validateUploadFile, UPLOAD_ACCEPT } from "../../lib/deliverables-api";
import { DeliverableMedia } from "../../components/ops/DeliverableMedia";
import { useAuth } from "../../lib/auth-context";
import { CreoLoadingScreen } from "../../components/ui/CreoLoadingScreen";
import {
  isCreativeRole,
  isTaskAssignedToUser,
} from "../../lib/creative-roles";

interface LeadNoteItem {
  id: string;
  taskId?: string;
  author: string;
  role: string;
  badge: string;
  content: string;
  avatarBg: string;
  avatar: string;
  attachment?: string;
  tag?: string;
  badgeColor?: string;
}

const STANDUP_MEETING_URL = "https://zoom.us/j/9814421990?pwd=creo";

export function MemberOverviewPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { data, isLoading, isError, error, refetch } = useQuery<PodDashboardData>({
    queryKey: ["pod_dashboard", user?.id, undefined],
    queryFn: () => fetchPodDashboard(),
    staleTime: 30_000,
  });
  const podName = data?.pod?.name || "Pod A";
  const members = data?.members || [];
  const leadMember = members.find((m) => m.role?.toLowerCase().includes("lead"));
  const leadName = leadMember?.full_name || "Pod Lead";
  const clients = data?.clients || [];
  const inProdTasks = data?.tasks?.in_production || [];
  const qaTasks = data?.tasks?.internal_qa || [];
  const activeSprintTasks = [...inProdTasks, ...qaTasks];
  const completedTasks = data?.tasks?.completed || [];
  const allEligibleTasks: PodTask[] = [...inProdTasks, ...qaTasks, ...(data?.tasks?.backlog || [])];

  const isAssignedToCurrentUser = (task: PodTask) => isTaskAssignedToUser(task, user);

  const myAssignedTasks = allEligibleTasks.filter(isAssignedToCurrentUser);
  const otherPodTasks = allEligibleTasks.filter((t) => !isAssignedToCurrentUser(t));

  const myInProdTasks = inProdTasks.filter(isAssignedToCurrentUser);
  const myQaTasks = qaTasks.filter(isAssignedToCurrentUser);
  const myActiveTasks = activeSprintTasks.filter(isAssignedToCurrentUser);
  const myCompletedTasks = completedTasks.filter(isAssignedToCurrentUser);

  const isCreative = isCreativeRole(user?.role);
  // Scoped metrics and focus tasks for the logged-in user
  const metricActiveTasks = isCreative ? myActiveTasks : (myActiveTasks.length > 0 ? myActiveTasks : activeSprintTasks);
  const displayInProdTasks = isCreative ? myInProdTasks : inProdTasks;
  const displayQaTasks = isCreative ? myQaTasks : qaTasks;

  const isDueTodayOrOverdue = (dueDate?: string | null) => {
    if (!dueDate) return false;
    const d = new Date(dueDate);
    const now = new Date();
    return d.toDateString() === now.toDateString() || d < now;
  };
  const dueTodayCount = metricActiveTasks.filter((t) => isDueTodayOrOverdue(t.due_date || t.sla_due_at)).length;
  const focusTasks = metricActiveTasks;

  const openPreviewModal = (task: PodTask) => {
    if (task.deliverable) {
      setPreviewTask(task);
      setPreviewModalOpen(true);
    } else {
      showToast(`No media cut uploaded yet for ${task.client_name} - ${task.blueprint?.concept_name || task.deliverable_type}. Use Handoff to upload.`, "info");
    }
  };

  // Deliverables table scoping: Creatives default to "My Deliverables", Leads/Admins to "All Pod"
  const [deliverablesScope, setDeliverablesScope] = useState<"my" | "all">(() =>
    isCreativeRole(user?.role) ? "my" : "all"
  );
  const [deliverablesTab, setDeliverablesTab] = useState<"active" | "archived">("active");

  useEffect(() => {
    if (user) {
      setDeliverablesScope(isCreativeRole(user.role) ? "my" : "all");
    }
  }, [user?.role]);

  const displayActiveTasks = deliverablesScope === "my" ? myActiveTasks : activeSprintTasks;
  const displayCompletedTasks = deliverablesScope === "my" ? myCompletedTasks : completedTasks;
  const currentTasks = deliverablesTab === "active" ? displayActiveTasks : displayCompletedTasks;

  // State for interactive actions
  const [quickReplyText, setQuickReplyText] = useState("");
  const [toastMessage, setToastMessage] = useState<{ text: string; type: "success" | "info" } | null>(null);

  // Modals
  const [logHoursModalOpen, setLogHoursModalOpen] = useState(false);
  const [hoursToLog, setHoursToLog] = useState("2.5");
  const [hoursProject, setHoursProject] = useState("Pod Sprint General Deliverables");
  const [hoursNotes, setHoursNotes] = useState("Octane shader tuning, keyframe polishing & lighting pass");

  // Real Upload Modal State
  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [selectedTaskId, setSelectedTaskId] = useState("");
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadFileError, setUploadFileError] = useState<string | null>(null);
  const [uploadNotes, setUploadNotes] = useState("");
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  // Preview Modal State
  const [previewModalOpen, setPreviewModalOpen] = useState(false);
  const [previewTask, setPreviewTask] = useState<PodTask | null>(null);

  const [inspectModalOpen, setInspectModalOpen] = useState(false);
  const [handoffConfirmOpen, setHandoffConfirmOpen] = useState(false);
  const [zoomModalOpen, setZoomModalOpen] = useState(false);

  // Clean real lead feedback notes (zero mock data)
  const [notesList, setNotesList] = useState<LeadNoteItem[]>([]);

  // Merge real QA feedback from assigned/pod tasks with notesList
  const allNotes = useMemo(() => {
    const realNotes: LeadNoteItem[] = [];
    allEligibleTasks.forEach((t) => {
      const comment =
        t.deliverable?.rejection_comment ||
        (t as any).rejection_comment ||
        (t as any).qa_feedback ||
        (t as any).feedback;
      if (comment) {
        const cleanLeadInitials = leadName
          .replace(/\(.*?\)/g, "")
          .replace(/[^a-zA-Z0-9\s]/g, "")
          .trim()
          .split(/\s+/)
          .filter(Boolean)
          .slice(0, 2)
          .map((n) => n[0])
          .join("")
          .toUpperCase() || "PL";

        realNotes.push({
          id: `task-qa-${t.id}`,
          taskId: t.id,
          author: leadName,
          role: `${t.client_name || "Pod QA"} · QA Review`,
          badge: t.blueprint?.concept_name || t.deliverable_type?.toUpperCase() || "Revision Required",
          badgeColor: "bg-amber-500/15 text-amber-300 border border-amber-500/30",
          content: comment,
          avatarBg: "bg-blue-600",
          avatar: cleanLeadInitials,
        });
      }
    });
    const existingIds = new Set(notesList.map((n) => n.id));
    const fresh = realNotes.filter((n) => !existingIds.has(n.id));
    return [...fresh, ...notesList];
  }, [allEligibleTasks, leadName, notesList]);

  const showToast = (text: string, type: "success" | "info" = "success") => {
    setToastMessage({ text, type });
    setTimeout(() => setToastMessage(null), 4000);
  };

  const handleSendQuickReply = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = quickReplyText.trim();
    const leadId = leadMember?.id || "lead";

    if (trimmed) {
      setNotesList([
        {
          id: `note-${Date.now()}`,
          author: user?.full_name || "Specialist",
          role: `${user?.role ? user.role.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()) : "Specialist"} (You) • Just now`,
          badge: "Slack Reply",
          badgeColor: "bg-[#7FA0D6]/20 text-[#7FA0D6] border border-[#7FA0D6]/30",
          content: trimmed,
          avatarBg: "bg-[#7FA0D6]",
          avatar: (user?.full_name || "U").split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase(),
        },
        ...notesList,
      ]);
    }

    const targetUrl = trimmed
      ? `/workstation/slack?dm=${encodeURIComponent(leadId)}&draft=${encodeURIComponent(trimmed)}`
      : `/workstation/slack?dm=${encodeURIComponent(leadId)}`;

    navigate(targetUrl, {
      state: {
        draft: trimmed,
        dm: leadId,
        leadName,
      },
    });
    setQuickReplyText("");
  };

  const handleConfirmHandoff = () => {
    setHandoffConfirmOpen(false);
    showToast(`Sprint deliverable handed off to ${leadName} for sign-off review!`);
  };

  const handleSaveHours = (e: React.FormEvent) => {
    e.preventDefault();
    setLogHoursModalOpen(false);
    showToast(`Logged ${hoursToLog} hrs to ${hoursProject}. Weekly total updated!`);
  };

  const openUploadModal = (task?: PodTask) => {
    setUploadError(null);
    setUploadFile(null);
    setUploadFileError(null);
    setUploadProgress(null);
    setUploadNotes("");
    setIsUploading(false);
    if (task) {
      setSelectedTaskId(task.id);
    } else {
      const defaultTask = myAssignedTasks[0] || allEligibleTasks[0];
      setSelectedTaskId(defaultTask?.id || "");
    }
    setUploadModalOpen(true);
  };

  const handleFileSelect = (f: File | null) => {
    setUploadFileError(null);
    setUploadError(null);
    if (!f) {
      setUploadFile(null);
      return;
    }
    const problem = validateUploadFile(f);
    if (problem) {
      setUploadFileError(problem);
      setUploadFile(null);
      return;
    }
    setUploadFile(f);
  };

  const handleUploadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTaskId) {
      setUploadError("Please select a target task.");
      return;
    }
    if (!uploadFile) {
      setUploadError("Please choose a file to upload.");
      return;
    }
    setIsUploading(true);
    setUploadError(null);
    try {
      const result = await uploadTaskDeliverable(
        selectedTaskId,
        uploadFile,
        uploadNotes,
        (fraction) => setUploadProgress(Math.round(fraction * 100)),
      );
      queryClient.invalidateQueries({ queryKey: ["pod_dashboard"] });
      setUploadModalOpen(false);
      showToast(`Successfully uploaded v${result.version} to ${leadName} for QA review!`, "success");
    } catch (err: any) {
      setUploadProgress(null);
      setUploadError(err.message || "Failed to upload deliverable.");
    } finally {
      setIsUploading(false);
    }
  };

  if (isError) {
    return (
      <div className="min-h-[50vh] flex flex-col items-center justify-center gap-4 text-center p-6">
        <div className="size-12 rounded-full bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400">
          <AlertTriangle className="size-6" />
        </div>
        <div className="space-y-1">
          <h3 className="text-base font-bold text-white">Failed to load workstation overview</h3>
          <p className="text-xs text-[#97A0B3] max-w-sm">
            {(error as Error)?.message || "Could not connect to the workstation service."}
          </p>
        </div>
        <button
          onClick={() => refetch()}
          className="px-4 py-2 rounded-xl bg-[#161F2D] hover:bg-[#2A3446] border border-[#2A3446] text-xs font-bold text-white transition-colors cursor-pointer"
        >
          Try Again
        </button>
      </div>
    );
  }

  if (isLoading || !data) {
    return <CreoLoadingScreen fullScreen={false} label="Loading Workstation Overview" className="min-h-[45vh]" />;
  }

  return (
    <div data-surface="ops" className="min-h-screen bg-[#0B111C] text-white font-sans flex flex-col">
      {/* Main Container */}
      <main className="flex-1 max-w-[1440px] w-full mx-auto px-4 sm:px-6 lg:px-8 pt-6 pb-20 sm:pb-8 space-y-6">
        {/* Toast Alert */}
        {toastMessage && (
          <div
            className={`p-3 rounded-xl border text-xs font-bold flex items-center justify-between shadow-2xs animate-fade-in ${
              toastMessage.type === "info"
                ? "bg-[#7FA0D6]/15 border-[#7FA0D6]/30 text-[#7FA0D6]"
                : "bg-emerald-500/15 border-emerald-500/30 text-emerald-400"
            }`}
          >
            <div className="flex items-center gap-2">
              <CheckCircle2 className="size-3.5 text-emerald-600 shrink-0" />
              <span>{toastMessage.text}</span>
            </div>
            <button onClick={() => setToastMessage(null)} className="text-current opacity-70 hover:opacity-100">
              &times;
            </button>
          </div>
        )}

        {/* 1. Quick Action & Shift Status Strip */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 bg-[#161F2D] p-2.5 sm:px-4 sm:py-2.5 rounded-xl border border-[#2A3446]/80 shadow-2xs">
          <div className="flex items-center gap-2">
            <span className="size-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-xs font-black text-white tracking-tight">{podName.toUpperCase()} ACTIVE SHIFT</span>
            <span className="text-[11px] text-[#97A0B3] font-medium hidden sm:inline">• {user?.full_name || "Specialist"} ({user?.role?.replace("_", " ") || "Creative Specialist"})</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setLogHoursModalOpen(true)}
              className="px-3 py-1.5 rounded-lg bg-[#0B111C] hover:bg-[#161F2D] border border-[#2A3446] text-[#F1F5F9] text-xs font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
            >
              <Clock className="size-3 text-[#97A0B3]" />
              <span>Log Hours</span>
            </button>
          </div>
        </div>

        {/* ROW 1: Production Focus & Lead Feedback */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 items-stretch w-full">
          {/* Left (2 cols - xl:col-span-2 flex flex-col space-y-6) */}
          <div className="xl:col-span-2 flex flex-col space-y-6">
            {/* The 3 Metric Cards row (grid grid-cols-1 sm:grid-cols-3 gap-3) */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {/* Active Sprint Tasks */}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: 0.05 }}
                className="bg-[#161F2D] rounded-xl sm:rounded-2xl p-2.5 sm:p-3 border border-[#2A3446]/80 shadow-2xs flex flex-col justify-between hover-card-innovative"
              >
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[9px] sm:text-[10px] font-bold uppercase tracking-wider text-[#97A0B3]">
                    ACTIVE SPRINT TASKS
                  </span>
                  <div className="size-6 sm:size-7 rounded-lg bg-[#7FA0D6]/15 text-[#7FA0D6] flex items-center justify-center">
                    <Sparkles className="size-3 sm:size-3.5" />
                  </div>
                </div>
                <div>
                  <div className="flex items-baseline gap-1.5 mb-1">
                    <span className="text-lg sm:text-xl font-black text-white">{metricActiveTasks.length}</span>
                    <span className="text-[10.5px] sm:text-[11px] font-bold text-[#97A0B3]">Active</span>
                    <span className="text-[9.5px] sm:text-[10px] text-[#97A0B3] truncate">({displayInProdTasks.length} in progress · {displayQaTasks.length} in QA)</span>
                  </div>
                  <div className="flex items-center justify-between text-[10px] sm:text-[11px] pt-1.5 border-t border-[#2A3446]">
                    <span className="font-bold text-[#7FA0D6] flex items-center gap-1">
                      ● Due Today: {dueTodayCount}
                    </span>
                    <Link to="/workstation/tasks" className="font-bold text-[#97A0B3] hover:text-[#F1F5F9] flex items-center gap-0.5">
                      <ArrowRight className="size-3" />
                    </Link>
                  </div>
                </div>
              </motion.div>

              {/* Weekly Hours Logged */}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: 0.1 }}
                className="bg-[#161F2D] rounded-xl sm:rounded-2xl p-2.5 sm:p-3 border border-[#2A3446]/80 shadow-2xs flex flex-col justify-between hover-card-innovative"
              >
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[9px] sm:text-[10px] font-bold uppercase tracking-wider text-[#97A0B3]">
                    WEEKLY HOURS LOGGED
                  </span>
                  <div className="size-6 sm:size-7 rounded-lg bg-indigo-500/15 text-indigo-400 border border-indigo-500/30 flex items-center justify-center">
                    <Clock className="size-3 sm:size-3.5" />
                  </div>
                </div>
                <div>
                  <div className="flex items-baseline gap-1.5 mb-1">
                    <span className="text-lg sm:text-xl font-black text-white">32.5</span>
                    <span className="text-[10.5px] sm:text-[11px] font-bold text-[#97A0B3]">/ 40 hrs</span>
                  </div>
                  {/* Progress bar */}
                  <div className="w-full h-1.5 bg-[#161F2D] rounded-full overflow-hidden my-1">
                    <div className="h-full bg-blue-600 rounded-full w-[81%] transition-all duration-700" />
                  </div>
                  <div className="flex items-center justify-between text-[10px] sm:text-[11px] pt-1 border-t border-[#2A3446]">
                    <span className="font-bold text-emerald-600">81% target</span>
                    <span className="font-bold text-[#97A0B3]">7.5h left</span>
                  </div>
                </div>
              </motion.div>

              {/* Remaining PTO */}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: 0.15 }}
                className="bg-[#161F2D] rounded-xl sm:rounded-2xl p-2.5 sm:p-3 border border-[#2A3446]/80 shadow-2xs flex flex-col justify-between hover-card-innovative"
              >
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[9px] sm:text-[10px] font-bold uppercase tracking-wider text-[#97A0B3]">
                    REMAINING PTO
                  </span>
                  <div className="size-6 sm:size-7 rounded-lg bg-purple-500/15 text-purple-400 border border-purple-500/30 flex items-center justify-center">
                    <Calendar className="size-3 sm:size-3.5" />
                  </div>
                </div>
                <div>
                  <div className="flex items-baseline gap-1.5 mb-1">
                    <span className="text-lg sm:text-xl font-black text-white">14.5</span>
                    <span className="text-[10.5px] sm:text-[11px] font-bold text-[#97A0B3]">Days</span>
                    <span className="text-[9.5px] sm:text-[10px] text-[#97A0B3]">1.5d/mo</span>
                  </div>
                  <div className="flex items-center justify-between text-[10px] sm:text-[11px] pt-1.5 border-t border-[#2A3446]">
                    <span className="font-bold text-[#F1F5F9] truncate">Next: Nov 8 (0.5d)</span>
                    <Link to="/workstation/schedule" className="font-bold text-[#7FA0D6] hover:underline shrink-0">
                      Plan &rarr;
                    </Link>
                  </div>
                </div>
              </motion.div>
            </div>

            {/* Section A: Today's Priority Focus & Production Queue */}
            {focusTasks.length === 0 || !focusTasks[0] ? (
              <div className="bg-[#161F2D] rounded-2xl p-6 sm:p-8 border border-[#2A3446]/80 shadow-2xs text-center space-y-3 flex-1 flex flex-col justify-center">
                <div className="size-12 rounded-2xl bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 flex items-center justify-center mx-auto">
                  <CheckCircle2 className="size-6" />
                </div>
                <div className="space-y-1">
                  <h3 className="text-sm sm:text-base font-black text-white">No Active Tasks in Production</h3>
                  <p className="text-xs text-[#97A0B3] max-w-md mx-auto leading-relaxed">
                    You currently have no tasks in production or internal QA review. Check your task queue for new pod assignments or review upcoming deliverables.
                  </p>
                </div>
                <div className="flex flex-wrap items-center justify-center gap-2 pt-2">
                  <Link
                    to="/workstation/tasks"
                    className="px-4 py-2 rounded-xl bg-[#7FA0D6] hover:bg-blue-600 text-white text-xs font-bold flex items-center gap-1.5 transition-colors shadow-2xs"
                  >
                    <span>Browse Task Queue</span>
                    <ArrowRight className="size-3" />
                  </Link>
                  <Link
                    to="/workstation/schedule"
                    className="px-4 py-2 rounded-xl bg-[#0B111C] hover:bg-[#161F2D] border border-[#2A3446] text-[#F1F5F9] text-xs font-bold transition-colors"
                  >
                    View Schedule & PTO
                  </Link>
                </div>
              </div>
            ) : (() => {
              const primaryTask = focusTasks[0]!;
              const secondaryTask = focusTasks[1];
              return (
                <div className="bg-[#161F2D] rounded-2xl p-4 sm:p-5 border border-[#2A3446]/80 shadow-2xs space-y-3.5 flex-1 flex flex-col justify-between">
                  <div className="flex items-center justify-between pb-3 border-b border-[#2A3446]">
                    <div className="flex items-center gap-2">
                      <span className="size-1.5 rounded-full bg-blue-600 animate-pulse" />
                      <h2 className="text-sm font-black text-white">
                        Today's Priority Focus & Production Queue
                      </h2>
                    </div>
                    <span className="text-[10px] font-mono font-bold text-[#7FA0D6] bg-[#0B111C] px-2.5 py-1 rounded-lg border border-[#2A3446]">
                      {focusTasks.length} {focusTasks.length === 1 ? "Active Task" : "Active Tasks"}
                    </span>
                  </div>

                  {/* Priority Item 1 */}
                  <div className="p-3.5 rounded-xl bg-[#0B111C]/80 border border-[#2A3446]/70 space-y-2.5 hover:border-[#7FA0D6]/30 transition-all">
                    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2">
                      <div className="flex items-start gap-2.5">
                        {/* Deliverable Badge */}
                        <div className="size-10 rounded-lg bg-slate-900 overflow-hidden shrink-0 relative flex items-center justify-center border border-slate-700">
                          <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/20 to-blue-600/30" />
                          <span className="text-[8px] font-mono text-cyan-400 font-bold z-10 uppercase">
                            {primaryTask.deliverable_type?.slice(0, 4) || "TASK"}
                          </span>
                        </div>
                        <div>
                          <div className="flex items-center gap-1.5">
                            <span className="text-xs font-bold text-[#7FA0D6]">{primaryTask.client_name || "Assigned Client"}</span>
                            <span className="text-[#97A0B3] text-[10px]">· {primaryTask.status === "internal_qa" ? "IN QA" : "PRODUCTION"}</span>
                          </div>
                          <h3 className="text-xs font-black text-white">{primaryTask.blueprint?.concept_name || primaryTask.deliverable_type || "Production Deliverable"}</h3>
                          <div className="flex flex-wrap items-center gap-1.5 text-[10px] text-[#97A0B3] mt-0.5">
                            <span>{primaryTask.deliverable_type?.toUpperCase() || "CREATIVE ASSET"}</span>
                            <span>•</span>
                            <span>{primaryTask.due_date ? `Due ${new Date(primaryTask.due_date).toLocaleDateString()}` : "Active Sprint"}</span>
                            {primaryTask.sla_due_at && (
                              <>
                                <span>•</span>
                                <span className="text-amber-400 font-semibold">SLA Tracked</span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>

                      <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold self-start ${
                        primaryTask.status === "internal_qa"
                          ? "bg-purple-500/15 text-purple-400 border border-purple-500/30"
                          : "bg-[#7FA0D6]/15 text-[#7FA0D6] border border-[#7FA0D6]/30"
                      }`}>
                        {primaryTask.status === "internal_qa" ? "Internal QA Review" : "In Production"}
                      </span>
                    </div>

                    {/* Task Actions */}
                    <div className="flex flex-wrap items-center gap-2 pt-0.5">
                      <button
                        onClick={() => openPreviewModal(primaryTask)}
                        className="px-3 py-1.5 rounded-lg bg-[#161F2D] border border-[#2A3446] hover:bg-[#161F2D] text-[11px] font-bold text-[#F1F5F9] flex items-center gap-1 transition-colors cursor-pointer"
                      >
                        <Eye className="size-3 text-[#97A0B3]" />
                        Preview Specs
                      </button>
                      <Link
                        to="/workstation/tasks"
                        className="px-3 py-1.5 rounded-lg bg-[#161F2D] border border-[#2A3446] hover:bg-[#161F2D] text-[11px] font-bold text-[#F1F5F9] flex items-center gap-1 transition-colors"
                      >
                        <Layers className="size-3 text-[#97A0B3]" />
                        Task Board
                      </Link>
                      <button
                        onClick={() => openUploadModal(primaryTask)}
                        className="px-3 py-1.5 rounded-lg bg-[#7FA0D6]/15 hover:bg-[#7FA0D6]/20 text-[#7FA0D6] text-[11px] font-bold flex items-center gap-1 transition-colors cursor-pointer ml-auto"
                      >
                        <Send className="size-3" />
                        Handoff to Lead
                      </button>
                    </div>
                  </div>

                  {/* Priority Item 2 if exists */}
                  {secondaryTask && (
                    <div className="p-3.5 rounded-xl bg-[#0B111C]/80 border border-[#2A3446]/70 space-y-2.5 hover:border-[#7FA0D6]/30 transition-all">
                      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2">
                        <div className="flex items-start gap-2.5">
                          <div className="size-10 rounded-lg bg-gradient-to-br from-indigo-700 to-indigo-900 overflow-hidden shrink-0 relative flex items-center justify-center text-white font-mono text-[8px] font-bold">
                            {secondaryTask.deliverable_type?.slice(0, 4) || "P2"}
                          </div>
                          <div>
                            <div className="flex items-center gap-1.5">
                              <span className="text-xs font-bold text-indigo-400">{secondaryTask.client_name || "Assigned Client"}</span>
                              <span className="text-[#97A0B3] text-[10px]">· P2-ACTIVE</span>
                            </div>
                            <h3 className="text-xs font-black text-white">{secondaryTask.blueprint?.concept_name || secondaryTask.deliverable_type || "Secondary Deliverable"}</h3>
                            <div className="flex flex-wrap items-center gap-1.5 text-[10px] text-[#97A0B3] mt-0.5">
                              <span>{secondaryTask.deliverable_type?.toUpperCase() || "CREATIVE ASSET"}</span>
                              <span>•</span>
                              <span>{secondaryTask.due_date ? `Due ${new Date(secondaryTask.due_date).toLocaleDateString()}` : "In Progress"}</span>
                            </div>
                          </div>
                        </div>

                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[#7FA0D6]/15 text-[#7FA0D6] border border-[#7FA0D6]/30 self-start">
                          {secondaryTask.status === "internal_qa" ? "Internal QA" : "In Production"}
                        </span>
                      </div>

                      <div className="flex flex-wrap items-center gap-2 pt-0.5">
                        <button
                          onClick={() => openPreviewModal(secondaryTask)}
                          className="px-3 py-1.5 rounded-lg bg-[#161F2D] border border-[#2A3446] hover:bg-[#161F2D] text-[11px] font-bold text-[#F1F5F9] flex items-center gap-1 transition-colors cursor-pointer"
                        >
                          <Eye className="size-3 text-[#97A0B3]" />
                          Preview Specs
                        </button>
                        <button
                          onClick={() => openUploadModal(secondaryTask)}
                          className="px-3.5 py-1.5 rounded-lg bg-[#7FA0D6] hover:bg-blue-700 text-white text-[11px] font-bold flex items-center gap-1 shadow-2xs transition-all cursor-pointer ml-auto"
                        >
                          <Send className="size-3" />
                          Submit for QA
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })()}
          </div>

          {/* Right (1 col - xl:col-span-1 flex flex-col) */}
          <div className="xl:col-span-1 flex flex-col">
            {/* Lead Feedback & Notes */}
            <div className="bg-[#161F2D] rounded-2xl p-4 border border-[#2A3446]/80 shadow-2xs space-y-3 h-full flex flex-col justify-between">
              <div className="flex items-center justify-between pb-2 border-b border-[#2A3446]">
                <div className="flex items-center gap-1.5">
                  <FileText className="size-3.5 text-[#7FA0D6]" />
                  <h3 className="text-xs font-black text-white">Lead Feedback & Notes</h3>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="px-2 py-0.2 rounded-full text-[9px] font-black bg-[#7FA0D6]/15 text-[#7FA0D6]">
                    {allNotes.length} Updates
                  </span>
                  <Link
                    to={`/workstation/slack?dm=${encodeURIComponent(leadMember?.id || "lead")}`}
                    state={{ dm: leadMember?.id || "lead", leadName }}
                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-[#0B111C] hover:bg-[#162338] border border-[#2A3446] text-[#7FA0D6] hover:text-white text-[10px] font-bold transition-colors cursor-pointer"
                    title={`Open Slack Chat with ${leadName}`}
                  >
                    <MessageSquare className="size-2.5" />
                    <span>Slack Hub</span>
                  </Link>
                </div>
              </div>

              {/* Feed Items */}
              {allNotes.length === 0 ? (
                <div className="py-8 px-4 text-center rounded-xl bg-[#0B111C]/50 border border-dashed border-[#2A3446] space-y-2 flex-1 flex flex-col items-center justify-center">
                  <div className="size-9 rounded-full bg-slate-800/80 border border-slate-700/80 mx-auto flex items-center justify-center text-[#97A0B3]">
                    <CheckCircle2 className="size-4 text-emerald-400" />
                  </div>
                  <div>
                    <p className="font-bold text-white text-xs">No feedback or revision requests</p>
                    <p className="text-[11px] text-[#97A0B3] mt-0.5">
                      Your pod lead has not requested any revisions on your current deliverables.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="space-y-2.5 overflow-y-auto pr-1 flex-1 min-h-0">
                  {allNotes.map((note) => (
                    <div
                      key={note.id}
                      onClick={() => {
                        if (note.taskId) {
                          navigate(`/workstation/tasks?taskId=${encodeURIComponent(note.taskId)}`, {
                            state: { selectedTaskId: note.taskId },
                          });
                        }
                      }}
                      className={`p-2.5 rounded-xl bg-[#0B111C]/80 border border-[#2A3446]/60 space-y-1.5 text-xs transition-all ${
                        note.taskId ? "cursor-pointer hover:border-[#7FA0D6]/60 hover:bg-[#111927] group" : ""
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5">
                          <div className={`size-5 rounded-md ${note.avatarBg} text-white font-black text-[9px] flex items-center justify-center`}>
                            {note.avatar}
                          </div>
                          <div>
                            <span className="font-bold text-white text-[11px]">{note.author}</span>
                            <span className="text-[9px] text-[#97A0B3] block">{note.role}</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-1">
                          <span className={`px-1.5 py-0.2 rounded text-[9px] font-bold ${note.badgeColor || "bg-[#7FA0D6]/20 text-[#7FA0D6]"}`}>
                            {note.badge}
                          </span>
                          {note.taskId && (
                            <ArrowRight className="size-3 text-[#7FA0D6] opacity-70 group-hover:opacity-100 group-hover:translate-x-0.5 transition-transform" />
                          )}
                        </div>
                      </div>

                      <p className="text-[#F1F5F9] leading-relaxed font-medium text-[11px]">"{note.content}"</p>

                      {note.taskId && (
                        <div className="flex items-center gap-1 text-[10px] text-[#7FA0D6] font-semibold pt-0.5">
                          <span>Open revision task in board</span>
                          <ArrowRight className="size-2.5" />
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* Quick Reply via Slack Form */}
              <form onSubmit={handleSendQuickReply} className="pt-2 border-t border-[#2A3446] space-y-1.5">
                <div className="flex items-center justify-between text-[10px]">
                  <span className="text-[#97A0B3] flex items-center gap-1">
                    <MessageSquare className="size-3 text-[#7FA0D6]" />
                    <span>Reply to <strong className="text-white font-medium">{leadName}</strong> via Slack</span>
                  </span>
                  <span className="text-[9px] text-[#7FA0D6] font-semibold">Instant Sync</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <input
                    type="text"
                    value={quickReplyText}
                    onChange={(e) => setQuickReplyText(e.target.value)}
                    placeholder={`Reply to ${leadName} via Slack...`}
                    className="flex-1 px-2.5 py-1.5 rounded-lg bg-[#0B111C] border border-[#2A3446] text-[11px] font-medium text-white placeholder:text-[#97A0B3] focus:outline-none focus:bg-[#161F2D] focus:ring-1 focus:ring-blue-500"
                  />
                  <button
                    type="submit"
                    title="Send via Slack Chat"
                    className="h-7 px-2.5 rounded-lg bg-[#7FA0D6] hover:bg-blue-600 active:scale-95 text-white flex items-center gap-1 text-[11px] font-bold transition-all shadow-2xs cursor-pointer shrink-0"
                  >
                    <span>Slack</span>
                    <Send className="size-2.5" />
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>

        {/* ROW 2: Sprint Deliverables & Team Sync */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 items-stretch w-full">
          {/* Left (2 cols - xl:col-span-2 flex flex-col) */}
          <div className="xl:col-span-2 flex flex-col">
            {/* Section B: Assigned Sprint Deliverables Table */}
            <div className="bg-[#161F2D] rounded-2xl p-4 sm:p-5 border border-[#2A3446]/80 shadow-2xs space-y-3 h-full flex flex-col">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-2.5 border-b border-[#2A3446] gap-2.5">
                <div>
                  <h2 className="text-sm font-black text-white">Assigned Sprint Deliverables</h2>
                  <p className="text-[11px] text-[#97A0B3]">Deliverables tracker across client pods</p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  {/* Pod Scope Sub-Filter: My Deliverables vs All Pod Deliverables */}
                  <div className="flex items-center bg-[#0B111C] p-0.5 rounded-lg text-xs font-bold border border-[#2A3446]">
                    <button
                      type="button"
                      onClick={() => setDeliverablesScope("my")}
                      className={`px-2.5 py-1 rounded-md transition-all text-[11px] cursor-pointer ${
                        deliverablesScope === "my"
                          ? "bg-[#161F2D] text-white shadow-2xs font-black border border-[#2A3446]"
                          : "text-[#97A0B3] hover:text-white"
                      }`}
                    >
                      My Deliverables
                    </button>
                    <button
                      type="button"
                      onClick={() => setDeliverablesScope("all")}
                      className={`px-2.5 py-1 rounded-md transition-all text-[11px] cursor-pointer ${
                        deliverablesScope === "all"
                          ? "bg-[#161F2D] text-white shadow-2xs font-black border border-[#2A3446]"
                          : "text-[#97A0B3] hover:text-white"
                      }`}
                    >
                      All Pod Deliverables
                    </button>
                  </div>

                  {/* Status Filter: Active vs Archived */}
                  <div className="flex items-center bg-[#0B111C] p-0.5 rounded-lg text-xs font-bold border border-[#2A3446]">
                    <button
                      type="button"
                      onClick={() => setDeliverablesTab("active")}
                      className={`px-2.5 py-1 rounded-md transition-all text-[11px] cursor-pointer ${
                        deliverablesTab === "active"
                          ? "bg-[#161F2D] text-white shadow-2xs font-black border border-[#2A3446]"
                          : "text-[#97A0B3] hover:text-white"
                      }`}
                    >
                      Active ({displayActiveTasks.length})
                    </button>
                    <button
                      type="button"
                      onClick={() => setDeliverablesTab("archived")}
                      className={`px-2.5 py-1 rounded-md transition-all text-[11px] cursor-pointer ${
                        deliverablesTab === "archived"
                          ? "bg-[#161F2D] text-white shadow-2xs font-black border border-[#2A3446]"
                          : "text-[#97A0B3] hover:text-white"
                      }`}
                    >
                      Archived ({displayCompletedTasks.length})
                    </button>
                  </div>
                </div>
              </div>

              {/* Dynamic Deliverables View */}
              {(() => {
                if (currentTasks.length === 0) {
                  return (
                    <div className="py-10 text-center border-2 border-dashed border-[#2A3446] rounded-xl space-y-2 p-4 flex-1 flex flex-col items-center justify-center">
                      <div className="size-10 rounded-full bg-slate-800 border border-slate-700 mx-auto flex items-center justify-center text-[#97A0B3]">
                        <Sparkles className="size-5 text-[#7FA0D6]" />
                      </div>
                      <p className="font-bold text-white text-xs">
                        {deliverablesScope === "my"
                          ? `No ${deliverablesTab} deliverables assigned to you`
                          : `No ${deliverablesTab} deliverables found in pod`}
                      </p>
                      <p className="text-[11px] text-[#97A0B3] max-w-sm mx-auto">
                        {deliverablesScope === "my"
                          ? "You have no deliverables currently in production or QA. Pull new deliverables from your assigned backlog or toggle to All Pod Deliverables."
                          : "Tasks will appear here once active in the sprint queue."}
                      </p>
                      {deliverablesScope === "my" && (
                        <div className="flex flex-wrap items-center justify-center gap-2 pt-1">
                          <Link
                            to="/workstation/tasks"
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition-all shadow-2xs"
                          >
                            <span>Production Tasks</span>
                            <ArrowRight className="size-3" />
                          </Link>
                          {activeSprintTasks.length > 0 && (
                            <button
                              type="button"
                              onClick={() => setDeliverablesScope("all")}
                              className="px-3 py-1.5 rounded-lg border border-[#2A3446] bg-[#161F2D] hover:bg-[#0B111C] text-[#F1F5F9] text-xs font-semibold transition-all cursor-pointer"
                            >
                              View All Pod Deliverables ({activeSprintTasks.length})
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  );
                }
                return (
                  <div className="flex-1 flex flex-col justify-between">
                    {/* Mobile Card View (< sm) */}
                    <div className="block sm:hidden space-y-2">
                      {currentTasks.map((t, idx) => (
                        <div key={t.id || idx} className="p-3 rounded-xl bg-[#0B111C]/90 border border-[#2A3446]/80 space-y-2">
                          <div className="flex items-start justify-between gap-1.5">
                            <div>
                              <span className="text-[9px] font-bold text-[#7FA0D6] uppercase">{t.client_name || "Client"}</span>
                              <h4 className="text-xs font-black text-white leading-snug">{t.blueprint?.concept_name || t.deliverable_type || "Sprint Task"}</h4>
                              <div className="text-[10px] text-[#97A0B3] font-medium">{t.deliverable_type || "Motion Asset"}</div>
                            </div>
                            <span className="px-1.5 py-0.2 rounded text-[8px] font-black bg-[#7FA0D6]/20 text-[#7FA0D6] border border-[#7FA0D6]/30 shrink-0">
                              {t.status === "in_production" ? "PROD" : t.status === "internal_qa" ? "QA" : "READY"}
                            </span>
                          </div>
                          <div className="flex items-center justify-between pt-1.5 border-t border-[#2A3446]/60 text-xs">
                            <span className="font-bold text-[10px]">
                              {isAssignedToCurrentUser(t) ? (
                                <span className="text-emerald-400 flex items-center gap-1">
                                  <span className="size-1.5 rounded-full bg-emerald-400" />
                                  {t.assignee?.full_name || t.assignee_name || "You"} (You)
                                </span>
                              ) : (
                                <span className="text-[#97A0B3]">{t.assignee?.full_name || t.assignee_name || "Unassigned"}</span>
                              )}
                            </span>
                            <div className="flex items-center gap-1.5">
                              {t.deliverable && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    setPreviewTask(t);
                                    setPreviewModalOpen(true);
                                  }}
                                  className="px-2 py-0.5 rounded-md border border-[#7FA0D6]/30 bg-[#7FA0D6]/15 hover:bg-[#7FA0D6]/25 text-[#7FA0D6] font-bold text-[10px] inline-flex items-center gap-1 cursor-pointer"
                                  title="Quick Video Preview"
                                >
                                  <Eye className="size-3" />
                                  <span>v{t.deliverable.version}</span>
                                </button>
                              )}
                              <button
                                type="button"
                                onClick={() => openUploadModal(t)}
                                className={`px-2 py-0.5 rounded-md border font-bold text-[10px] cursor-pointer ${
                                  t.status === "internal_qa"
                                    ? "border-amber-500/30 bg-amber-500/10 text-amber-300 hover:bg-amber-500/20"
                                    : "border-[#2A3446] bg-[#161F2D] hover:bg-[#0B111C] text-[#F1F5F9]"
                                }`}
                              >
                                {t.status === "internal_qa" ? "Re-upload Cut" : t.status === "in_production" ? "Upload & QA" : "Upload"}
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Desktop Table (sm+) */}
                    <div className="hidden sm:block overflow-x-auto flex-1">
                      <table className="w-full text-left text-xs">
                        <thead>
                          <tr className="border-b border-[#2A3446] text-[#97A0B3] font-bold uppercase tracking-wider text-[9px]">
                            <th className="py-2 px-2.5">Asset Name & ID</th>
                            <th className="py-2 px-2.5">Client</th>
                            <th className="py-2 px-2.5">Status</th>
                            <th className="py-2 px-2.5">Assignee</th>
                            <th className="py-2 px-2.5 text-right">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800 font-medium text-[#F1F5F9]">
                          {currentTasks.map((t, idx) => (
                            <tr key={t.id || idx} className="hover:bg-[#0B111C]/60 transition-colors">
                              <td className="py-2.5 px-2.5">
                                <div className="font-bold text-white text-xs">{t.blueprint?.concept_name || t.deliverable_type || "Sprint Asset"}</div>
                                <div className="text-[10px] text-[#97A0B3]">{t.deliverable_type || "Motion Asset"} · ID: {t.id?.slice(0, 6)}</div>
                              </td>
                              <td className="py-2.5 px-2.5 font-semibold text-white text-xs">{t.client_name || "Client"}</td>
                              <td className="py-2.5 px-2.5">
                                <span className="px-2 py-0.5 rounded text-[9px] font-black bg-[#7FA0D6]/20 text-[#7FA0D6] border border-[#7FA0D6]/30">
                                  {t.status === "in_production" ? "IN PRODUCTION" : t.status === "internal_qa" ? "PENDING QA" : "READY"}
                                </span>
                              </td>
                              <td className="py-2.5 px-2.5 text-xs">
                                {isAssignedToCurrentUser(t) ? (
                                  <span className="text-emerald-400 font-bold flex items-center gap-1.5">
                                    <span className="size-1.5 rounded-full bg-emerald-400" />
                                    {t.assignee?.full_name || t.assignee_name || "You"} (You)
                                  </span>
                                ) : (
                                  <span className="text-[#97A0B3] font-medium">{t.assignee?.full_name || t.assignee_name || "Unassigned"}</span>
                                )}
                              </td>
                              <td className="py-2.5 px-2.5 text-right space-x-1.5">
                                {t.deliverable && (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setPreviewTask(t);
                                      setPreviewModalOpen(true);
                                    }}
                                    className="px-2.5 py-1 rounded-md border border-[#7FA0D6]/30 bg-[#7FA0D6]/15 hover:bg-[#7FA0D6]/25 text-[#7FA0D6] font-bold text-[10px] inline-flex items-center gap-1 cursor-pointer transition-colors"
                                    title="Quick Video Preview"
                                  >
                                    <Eye className="size-3" />
                                    <span>v{t.deliverable.version}</span>
                                  </button>
                                )}
                                <button
                                  type="button"
                                  onClick={() => openUploadModal(t)}
                                  className={`px-2.5 py-1 rounded-md border font-bold text-[10px] cursor-pointer transition-colors ${
                                    t.status === "internal_qa"
                                      ? "border-amber-500/30 bg-amber-500/10 text-amber-300 hover:bg-amber-500/20"
                                      : "border-[#2A3446] hover:bg-[#161F2D] text-[#F1F5F9]"
                                  }`}
                                >
                                  {t.status === "internal_qa" ? "Re-upload Cut" : t.status === "in_production" ? "Upload & QA" : "Upload"}
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                );
              })()}
            </div>
          </div>

          {/* Right (1 col - xl:col-span-1 flex flex-col) */}
          <div className="xl:col-span-1 flex flex-col">
            {/* Pod Team Sync */}
            <div className="bg-[#161F2D] rounded-2xl p-4 border border-[#2A3446]/80 shadow-2xs space-y-3 h-full flex flex-col justify-between">
              <div className="flex items-center justify-between pb-2 border-b border-[#2A3446]">
                <div className="flex items-center gap-1.5">
                  <Users className="size-3.5 text-[#7FA0D6]" />
                  <h3 className="text-xs font-black text-white">{podName} Team Sync</h3>
                </div>
                <span className="px-2 py-0.5 rounded-full text-[9px] font-black bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                  ● {members.length || 1} Active
                </span>
              </div>

              {/* Standup Banner */}
              <div className="p-2.5 rounded-xl bg-[#7FA0D6]/15 border border-[#7FA0D6]/30 flex items-center justify-between gap-2">
                <div>
                  <div className="text-[11px] font-black text-white">10:00 AM Daily Standup</div>
                  <div className="text-[10px] text-[#7FA0D6] font-medium">Zoom link active in 25m</div>
                </div>
                <button
                  onClick={() => setZoomModalOpen(true)}
                  className="px-2.5 py-1 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-bold text-[11px] shadow-2xs cursor-pointer"
                >
                  Join
                </button>
              </div>

              {/* Member Status List */}
              <div className="space-y-2 text-xs flex-1 overflow-y-auto">
                {members.length > 0 ? (
                  members.map((m) => (
                    <div key={m.id} className="flex items-center justify-between p-1.5 rounded-lg hover:bg-[#0B111C] transition-colors">
                      <div className="flex items-center gap-2">
                        <div className="size-6 rounded-md bg-[#7FA0D6] text-white font-black text-[9px] flex items-center justify-center">
                          {m.full_name?.slice(0, 2).toUpperCase() || "CP"}
                        </div>
                        <div>
                          <span className="font-bold text-white block text-[11px]">{m.full_name}</span>
                          <span className="text-[9px] text-[#97A0B3]">{m.role || "Pod Specialist"} • Active</span>
                        </div>
                      </div>
                      <span className="size-1.5 rounded-full bg-emerald-500" />
                    </div>
                  ))
                ) : (
                  <div className="flex items-center justify-between p-1.5 rounded-lg hover:bg-[#0B111C] transition-colors">
                    <div className="flex items-center gap-2">
                      <div className="size-6 rounded-md bg-[#7FA0D6] text-white font-black text-[9px] flex items-center justify-center">
                        {leadName.slice(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <span className="font-bold text-white block text-[11px]">{leadName}</span>
                        <span className="text-[9px] text-[#97A0B3]">Lead Producer • Active</span>
                      </div>
                    </div>
                    <span className="text-[9px] font-black px-1.5 py-0.2 rounded bg-[#161F2D] text-[#F1F5F9]">
                      Pod Lead
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

      </main>

      {/* ─────────────────────────────────────────────────────────────
          CENTERED MODALS WITH BLURRED BACKGROUND (z-[99999])
      ───────────────────────────────────────────────────────────── */}

      {/* MODAL 1: LOG WORK HOURS */}
      {logHoursModalOpen && (
        <div
          className="fixed inset-0 w-screen h-screen z-[99999] bg-slate-950/70 backdrop-blur-md flex items-center justify-center p-4 animate-fade-in"
          onClick={() => setLogHoursModalOpen(false)}
        >
          <div
            className="w-full max-w-md bg-[#161F2D] rounded-3xl p-6 sm:p-7 shadow-2xl border border-[#2A3446] space-y-4 animate-scale-up"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-[#2A3446] pb-3">
              <div className="flex items-center gap-2.5">
                <div className="size-9 rounded-2xl bg-[#7FA0D6]/15 text-[#7FA0D6] flex items-center justify-center font-bold">
                  <Clock className="size-4.5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-white">Log Daily Work Hours</h3>
                  <p className="text-xs text-[#97A0B3]">Record billable sprint time against client deliverable</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setLogHoursModalOpen(false)}
                className="size-8 rounded-full bg-[#161F2D] hover:bg-slate-200 text-[#97A0B3] flex items-center justify-center cursor-pointer"
              >
                <X className="size-4" />
              </button>
            </div>

            <form onSubmit={handleSaveHours} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-bold text-[#F1F5F9] mb-1">Deliverable Project</label>
                <NativeSelect
                  value={hoursProject}
                  onChange={(e) => setHoursProject(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-[#2A3446] font-semibold bg-[#161F2D]"
                >
                  <option value="General Sprint Task">General Pod Sprint Delivery</option>
                  {clients.map(c => <option key={c.id} value={c.name}>{c.name} · Active Sprint</option>)}
                </NativeSelect>
              </div>

              <div>
                <label className="block font-bold text-[#F1F5F9] mb-1">Hours Spent</label>
                <input
                  type="number"
                  step="0.25"
                  required
                  value={hoursToLog}
                  onChange={(e) => setHoursToLog(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-[#2A3446] font-bold"
                />
              </div>

              <div>
                <label className="block font-bold text-[#F1F5F9] mb-1">Work Description & Nodes</label>
                <textarea
                  rows={3}
                  value={hoursNotes}
                  onChange={(e) => setHoursNotes(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-[#2A3446] font-medium"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#2A3446]">
                <button
                  type="button"
                  onClick={() => setLogHoursModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-[#2A3446] font-bold text-[#F1F5F9] hover:bg-[#0B111C] cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-[#7FA0D6] hover:bg-blue-700 text-white font-bold shadow-xs cursor-pointer"
                >
                  Confirm & Save Hours
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: UPLOAD DELIVERABLE */}
      {uploadModalOpen && (
        <div
          className="fixed inset-0 w-screen h-screen z-[99999] bg-slate-950/70 backdrop-blur-md flex items-center justify-center p-4 animate-fade-in"
          onClick={() => !isUploading && setUploadModalOpen(false)}
        >
          <div
            className="w-full max-w-lg bg-[#161F2D] rounded-3xl p-6 sm:p-7 shadow-2xl border border-[#2A3446] space-y-4 animate-scale-up"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-[#2A3446] pb-3">
              <div className="flex items-center gap-2.5">
                <div className="size-9 rounded-2xl bg-[#7FA0D6]/15 text-[#7FA0D6] flex items-center justify-center font-bold">
                  <Upload className="size-4.5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-white">Upload Sprint Deliverable Cut</h3>
                  <p className="text-xs text-[#97A0B3]">Submit render export directly to {leadName} for QA gate</p>
                </div>
              </div>
              <button
                type="button"
                disabled={isUploading}
                onClick={() => setUploadModalOpen(false)}
                className="size-8 rounded-full bg-[#161F2D] hover:bg-slate-700 text-[#97A0B3] flex items-center justify-center cursor-pointer disabled:opacity-50"
              >
                <X className="size-4" />
              </button>
            </div>

            {uploadError && (
              <div className="p-3 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="size-4 shrink-0 text-rose-400" />
                  <span>{uploadError}</span>
                </div>
                <button
                  type="button"
                  onClick={() => setUploadError(null)}
                  className="text-current opacity-70 hover:opacity-100"
                >
                  &times;
                </button>
              </div>
            )}

            {uploadFileError && (
              <div className="p-3 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="size-4 shrink-0 text-rose-400" />
                  <span>{uploadFileError}</span>
                </div>
                <button
                  type="button"
                  onClick={() => setUploadFileError(null)}
                  className="text-current opacity-70 hover:opacity-100"
                >
                  &times;
                </button>
              </div>
            )}

            <form onSubmit={handleUploadSubmit} className="space-y-3.5 text-xs">
              {/* Target Task Select */}
              <div>
                <label className="block font-bold text-[#F1F5F9] mb-1">Target Task</label>
                <NativeSelect
                  value={selectedTaskId}
                  disabled={isUploading}
                  onChange={(e) => {
                    setSelectedTaskId(e.target.value);
                    setUploadError(null);
                  }}
                  className="w-full px-3 py-2 rounded-xl border border-[#2A3446] font-semibold bg-[#161F2D]"
                >
                  {myAssignedTasks.length > 0 && (
                    <optgroup label="My Assigned Tasks">
                      {myAssignedTasks.map((t) => (
                        <option key={t.id} value={t.id}>
                          {t.blueprint?.concept_name || t.deliverable_type || "Task"} • {t.client_name} (ID: {t.id.slice(0, 6)})
                        </option>
                      ))}
                    </optgroup>
                  )}
                  {otherPodTasks.length > 0 && (
                    <optgroup label="Pod Tasks (Team Collaborative)">
                      {otherPodTasks.map((t) => (
                        <option key={t.id} value={t.id}>
                          {t.blueprint?.concept_name || t.deliverable_type || "Task"} • {t.client_name} (Assignee: {t.assignee?.full_name || t.assignee_name || "Unassigned"})
                        </option>
                      ))}
                    </optgroup>
                  )}
                  {allEligibleTasks.length === 0 && (
                    <option value="">No tasks available in sprint</option>
                  )}
                </NativeSelect>
              </div>

              {/* Assignee Collaboration / Guard Status Notice */}
              {(() => {
                const currentTask = allEligibleTasks.find((t) => t.id === selectedTaskId);
                if (!currentTask) return null;
                const isMine = isAssignedToCurrentUser(currentTask);
                if (isMine) {
                  return (
                    <div className="p-2 rounded-xl bg-emerald-500/10 border border-emerald-500/25 text-emerald-400 text-[11px] font-medium flex items-center gap-1.5">
                      <CheckCircle2 className="size-3.5 shrink-0" />
                      <span>This task is assigned to you ({user?.full_name || "You"}).</span>
                    </div>
                  );
                }
                return (
                  <div className="p-2.5 rounded-xl bg-[#7FA0D6]/10 border border-[#7FA0D6]/25 text-[#F1F5F9] text-[11px] font-medium flex items-start gap-2">
                    <Sparkles className="size-3.5 text-[#7FA0D6] shrink-0 mt-0.5" />
                    <div>
                      <span className="font-bold text-[#7FA0D6]">Pod Collaboration:</span> Task is assigned to {currentTask.assignee?.full_name || currentTask.assignee_name || "Operations Admin"}. Submitting this deliverable will claim it for your cut and route to {leadName} for QA.
                    </div>
                  </div>
                );
              })()}

              {/* Drag Drop Area */}
              <div className="p-5 border-2 border-dashed border-[#2A3446] rounded-2xl text-center space-y-2 bg-[#0B111C] hover:bg-[#7FA0D6]/10 hover:border-blue-300 transition-colors">
                <Upload className="size-6 text-[#7FA0D6] mx-auto" />
                <div className="font-bold text-white text-xs">
                  {uploadFile ? uploadFile.name : "Drag & drop master render (MP4 / MOV / PNG / JPG)"}
                </div>
                <div className="text-[10px] text-[#97A0B3]">
                  {uploadFile ? `${(uploadFile.size / (1024 * 1024)).toFixed(2)} MB • Ready to upload` : "Up to 500MB videos, 10MB images • Min 1KB valid media"}
                </div>
                <input
                  type="file"
                  accept={UPLOAD_ACCEPT}
                  className="hidden"
                  id="asset-file-input"
                  disabled={isUploading}
                  onChange={(e) => handleFileSelect(e.target.files?.[0] || null)}
                />
                <label
                  htmlFor="asset-file-input"
                  className="inline-block px-3 py-1.5 rounded-lg bg-[#161F2D] border border-[#2A3446] text-[#F1F5F9] font-bold text-xs hover:bg-[#2A3446] cursor-pointer mt-1"
                >
                  Browse Computer
                </label>
              </div>

              {/* Upload Notes */}
              <div>
                <label className="block font-bold text-[#F1F5F9] mb-1">Handover Notes for QA (Optional)</label>
                <textarea
                  rows={2}
                  disabled={isUploading}
                  value={uploadNotes}
                  onChange={(e) => setUploadNotes(e.target.value)}
                  placeholder="e.g. Color grade matched to brand DNA, audio compressed to -14 LUFS..."
                  className="w-full px-3 py-2 rounded-xl border border-[#2A3446] font-medium bg-[#0B111C] text-[#F1F5F9] placeholder:text-[#97A0B3] focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>

              {/* Upload Progress Bar */}
              {uploadProgress !== null && (
                <div className="space-y-1">
                  <div className="flex items-center justify-between text-[11px] font-bold">
                    <span className="text-[#97A0B3]">Uploading cut...</span>
                    <span className="text-[#7FA0D6]">{uploadProgress}%</span>
                  </div>
                  <div className="w-full h-1.5 bg-[#0B111C] rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-blue-500 to-indigo-600 transition-all duration-200 rounded-full"
                      style={{ width: `${uploadProgress}%` }}
                    />
                  </div>
                </div>
              )}

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#2A3446]">
                <button
                  type="button"
                  disabled={isUploading}
                  onClick={() => setUploadModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-[#2A3446] font-bold text-[#F1F5F9] hover:bg-[#0B111C] cursor-pointer disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isUploading || !uploadFile || !selectedTaskId}
                  className="px-5 py-2 rounded-xl bg-[#7FA0D6] hover:bg-blue-700 text-white font-bold shadow-xs cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5"
                >
                  {isUploading ? (
                    <>
                      <Loader2 className="size-3.5 animate-spin" />
                      <span>Uploading...</span>
                    </>
                  ) : (
                    <span>Confirm & Upload Asset</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: DELIVERABLE VIDEO PREVIEW */}
      {previewModalOpen && previewTask?.deliverable && (
        <div
          className="fixed inset-0 w-screen h-screen z-[99999] bg-black/80 backdrop-blur-md flex items-center justify-center p-4 animate-fade-in"
          onClick={() => setPreviewModalOpen(false)}
        >
          <div
            className="w-full max-w-2xl bg-[#161F2D] rounded-3xl p-5 sm:p-6 shadow-2xl border border-[#2A3446] space-y-4 animate-scale-up"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-[#2A3446] pb-3">
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded text-[10px] font-black bg-[#7FA0D6]/20 text-[#7FA0D6] border border-[#7FA0D6]/30">
                  v{previewTask.deliverable.version}
                </span>
                <div>
                  <h3 className="text-sm font-black text-white">
                    {previewTask.blueprint?.concept_name || previewTask.deliverable_type || "Sprint Cut Preview"}
                  </h3>
                  <p className="text-[11px] text-[#97A0B3]">{previewTask.client_name}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setPreviewModalOpen(false)}
                className="size-8 rounded-full bg-[#161F2D] hover:bg-slate-700 text-[#97A0B3] flex items-center justify-center cursor-pointer"
              >
                <X className="size-4" />
              </button>
            </div>

            <div className="rounded-2xl overflow-hidden bg-black max-h-[380px] flex items-center justify-center border border-[#2A3446]/60">
              <DeliverableMedia
                url={previewTask.deliverable.file_url}
                isVideo={previewTask.deliverable.is_video}
                title={previewTask.blueprint?.concept_name || "Deliverable"}
                controls={true}
                className="w-full max-h-[380px]"
              />
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-[#2A3446] text-xs">
              <div className="text-[11px] text-[#97A0B3]">
                Format: <strong className="text-white">{previewTask.deliverable.file_type}</strong>
              </div>
              <div className="flex items-center gap-2">
                {previewTask.deliverable.file_url && (
                  <a
                    href={previewTask.deliverable.file_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-3 py-1.5 rounded-xl border border-[#2A3446] hover:bg-[#0B111C] text-[#F1F5F9] font-bold text-xs flex items-center gap-1.5"
                  >
                    <ExternalLink className="size-3.5 text-[#7FA0D6]" />
                    Direct Link
                  </a>
                )}
                <button
                  type="button"
                  onClick={() => setPreviewModalOpen(false)}
                  className="px-4 py-1.5 rounded-xl bg-[#7FA0D6] hover:bg-blue-700 text-white font-bold text-xs cursor-pointer"
                >
                  Close Preview
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 3: INSPECT FRAME CACHE */}
      {inspectModalOpen && (
        <div
          className="fixed inset-0 w-screen h-screen z-[99999] bg-slate-950/70 backdrop-blur-md flex items-center justify-center p-4 animate-fade-in"
          onClick={() => setInspectModalOpen(false)}
        >
          <div
            className="w-full max-w-lg bg-[#161F2D] rounded-3xl p-6 sm:p-7 shadow-2xl border border-[#2A3446] space-y-4 animate-scale-up"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-[#2A3446] pb-3">
              <div className="flex items-center gap-2.5">
                <div className="size-9 rounded-2xl bg-[#7FA0D6]/15 text-[#7FA0D6] flex items-center justify-center font-bold">
                  <Layers className="size-4.5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-white">GPU Cluster Frame Cache</h3>
                  <p className="text-xs text-[#97A0B3]">Live Octane node telemetry & tile verification</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setInspectModalOpen(false)}
                className="size-8 rounded-full bg-[#161F2D] hover:bg-slate-200 text-[#97A0B3] flex items-center justify-center cursor-pointer"
              >
                <X className="size-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="p-3 bg-[#0B111C] rounded-xl border border-[#2A3446] flex justify-between">
                <span className="text-[#97A0B3] font-bold">Hardware:</span>
                <span className="font-bold text-white">2x NVIDIA RTX 4090 24GB</span>
              </div>
              <div className="p-3 bg-[#0B111C] rounded-xl border border-[#2A3446] flex justify-between">
                <span className="text-[#97A0B3] font-bold">Cache Location:</span>
                <span className="font-mono text-white">/mnt/render-fast/NW-004-MS/frames</span>
              </div>
              <div className="p-3 bg-[#0B111C] rounded-xl border border-[#2A3446] flex justify-between">
                <span className="text-[#97A0B3] font-bold">Pass Integrity:</span>
                <span className="font-bold text-emerald-600">3,840 / 3,840 Validated (0 dropouts)</span>
              </div>
            </div>

            <div className="flex items-center justify-end pt-2 border-t border-[#2A3446]">
              <button
                type="button"
                onClick={() => setInspectModalOpen(false)}
                className="px-5 py-2 rounded-xl bg-[#7FA0D6] hover:bg-blue-700 text-white font-bold cursor-pointer"
              >
                Close Inspector
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 4: HANDOFF CONFIRMATION */}
      {handoffConfirmOpen && (
        <div
          className="fixed inset-0 w-screen h-screen z-[99999] bg-slate-950/70 backdrop-blur-md flex items-center justify-center p-4 animate-fade-in"
          onClick={() => setHandoffConfirmOpen(false)}
        >
          <div
            className="w-full max-w-md bg-[#161F2D] rounded-3xl p-6 sm:p-7 shadow-2xl border border-[#2A3446] space-y-4 animate-scale-up text-center"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="size-12 rounded-2xl bg-[#7FA0D6]/15 text-[#7FA0D6] flex items-center justify-center mx-auto font-black">
              <Send className="size-6" />
            </div>
            <div>
              <h3 className="text-base font-black text-white">Handoff Cut to Lead {leadName}?</h3>
              <p className="text-xs text-[#97A0B3] mt-1 leading-relaxed">
                This will trigger a synchronous QA review notification for {leadName} on the {podName} review queue.
              </p>
            </div>

            <div className="flex items-center justify-center gap-2 pt-2 border-t border-[#2A3446]">
              <button
                type="button"
                onClick={() => setHandoffConfirmOpen(false)}
                className="px-4 py-2 rounded-xl border border-[#2A3446] font-bold text-xs text-[#F1F5F9] hover:bg-[#0B111C] cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmHandoff}
                className="px-5 py-2 rounded-xl bg-[#7FA0D6] hover:bg-blue-700 text-white font-bold text-xs shadow-md shadow-blue-500/20 cursor-pointer"
              >
                Confirm & Handoff
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 5: ZOOM MEETING JOIN */}
      {zoomModalOpen && (
        <div
          className="fixed inset-0 w-screen h-screen z-[99999] bg-slate-950/70 backdrop-blur-md flex items-center justify-center p-4 animate-fade-in"
          onClick={() => setZoomModalOpen(false)}
        >
          <div
            className="w-full max-w-md bg-[#161F2D] rounded-3xl p-6 sm:p-7 shadow-2xl border border-[#2A3446] space-y-4 animate-scale-up text-center"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="size-12 rounded-2xl bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 flex items-center justify-center mx-auto font-black">
              <Video className="size-6" />
            </div>
            <div>
              <h3 className="text-base font-black text-white">{podName} Daily Standup Session</h3>
              <p className="text-xs text-[#97A0B3] mt-1 leading-relaxed">
                Lead: {leadName} • Topic: Sprint Velocity & Daily Production Sync
              </p>
            </div>

            <a
              href={STANDUP_MEETING_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="p-3 bg-[#0B111C] rounded-2xl border border-[#2A3446] text-xs font-mono text-[#7FA0D6] hover:underline block break-all transition-colors"
            >
              {STANDUP_MEETING_URL}
            </a>

            <div className="flex items-center justify-center gap-2 pt-2 border-t border-[#2A3446]">
              <button
                type="button"
                onClick={() => setZoomModalOpen(false)}
                className="px-4 py-2 rounded-xl border border-[#2A3446] font-bold text-xs text-[#F1F5F9] hover:bg-[#0B111C] cursor-pointer transition-colors"
              >
                Dismiss
              </button>
              <button
                type="button"
                onClick={() => {
                  window.open(STANDUP_MEETING_URL, "_blank", "noopener,noreferrer");
                  setZoomModalOpen(false);
                  showToast(`Connecting to ${podName} Standup video room...`, "info");
                }}
                className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md shadow-emerald-600/20 cursor-pointer transition-colors flex items-center gap-1.5"
              >
                <Video className="size-3.5" />
                <span>Open Video Room</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
