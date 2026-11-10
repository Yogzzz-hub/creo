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
  Copy,
  Check,
  Settings,
  FolderGit2,
} from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { request } from "../../lib/http";
import { fetchPodDashboard, type PodDashboardData, type PodTask } from "../../lib/ops-api";
import { uploadTaskDeliverable, validateUploadFile, UPLOAD_ACCEPT } from "../../lib/deliverables-api";
import { DeliverableMedia } from "../../components/ops/DeliverableMedia";
import { useAuth } from "../../lib/auth-context";
import { CreoLoadingScreen } from "../../components/ui/CreoLoadingScreen";
import {
  isCreativeRole,
  isTaskAssignedToUser,
} from "../../lib/creative-roles";
import { MemberMobileDashboard } from "../../components/workstation/MemberMobileDashboard";

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

const DEFAULT_ZOOM_URL = "https://zoom.us/join";
const DEFAULT_MEET_URL = "https://meet.google.com";
const DEFAULT_MEET_CODE = "";

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
  const getDueTimestamp = (t: PodTask) => {
    const d = t.due_date || t.sla_due_at;
    if (!d) return Number.MAX_SAFE_INTEGER;
    const time = new Date(d).getTime();
    return isNaN(time) ? Number.MAX_SAFE_INTEGER : time;
  };
  const sortByDueDate = (a: PodTask, b: PodTask) => getDueTimestamp(a) - getDueTimestamp(b);

  const inProdTasks = (data?.tasks?.in_production || []).slice().sort(sortByDueDate);
  const qaTasks = (data?.tasks?.internal_qa || []).slice().sort(sortByDueDate);
  const activeSprintTasks = [...inProdTasks, ...qaTasks].sort(sortByDueDate);
  const completedTasks = data?.tasks?.completed || [];
  const allEligibleTasks: PodTask[] = [...inProdTasks, ...qaTasks, ...(data?.tasks?.backlog || [])].sort(sortByDueDate);

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

function formatHours(totalHours: number): string {
  if (totalHours < 24) {
    return `${Math.max(1, totalHours)}h`;
  }
  const days = Math.floor(totalHours / 24);
  const remHours = totalHours % 24;
  const dayStr = days === 1 ? "1 day" : `${days} days`;
  if (remHours === 0) return dayStr;
  const hourStr = remHours === 1 ? "1 hr" : `${remHours} hrs`;
  return `${dayStr} ${hourStr}`;
}

function getTaskSlaDueText(task: PodTask): { text: string; urgent: boolean } {
  if (task.sla_due_at) {
    const hours = (new Date(task.sla_due_at).getTime() - Date.now()) / 3_600_000;
    if (hours < 0) return { text: `Overdue by ${formatHours(Math.ceil(-hours))}`, urgent: true };
    if (hours < 48) return { text: `Due in ${formatHours(Math.max(1, Math.round(hours)))}`, urgent: hours < 24 };
    return { text: `Due ${new Date(task.sla_due_at).toLocaleDateString(undefined, { day: "numeric", month: "short" })}`, urgent: false };
  }
  if (task.due_date) {
    return { text: `Due ${new Date(task.due_date).toLocaleDateString(undefined, { day: "numeric", month: "short" })}`, urgent: false };
  }
  return { text: "Active Sprint", urgent: false };
}

const FORMAT_SPECS: Record<string, { aspect: string; res: string; desc: string; fps: string }> = {
  reel: { aspect: "9:16 Vertical", res: "1080 × 1920", desc: "Instagram Reel / TikTok / YouTube Shorts", fps: "30 / 60 fps" },
  shorts: { aspect: "9:16 Vertical", res: "1080 × 1920", desc: "Shorts / Fullscreen Mobile", fps: "30 / 60 fps" },
  tiktok: { aspect: "9:16 Vertical", res: "1080 × 1920", desc: "TikTok Master Vertical", fps: "30 / 60 fps" },
  video: { aspect: "16:9 Landscape", res: "1920 × 1080 / 4K", desc: "YouTube / Website Master Video", fps: "24 / 30 / 60 fps" },
  post: { aspect: "1:1 Square / 4:5 Portrait", res: "1080 × 1080 / 1080 × 1350", desc: "Static Feed / Ad Graphic", fps: "Static N/A" },
  carousel: { aspect: "4:5 Portrait", res: "1080 × 1350", desc: "Multi-slide Swipe Carousel", fps: "Static N/A" },
  story: { aspect: "9:16 Vertical", res: "1080 × 1920", desc: "Instagram Story", fps: "30 fps" },
};
  const openPreviewModal = (task: PodTask) => {
    setPreviewTask(task);
    setPreviewModalOpen(true);
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
  const [isSendingQuickReply, setIsSendingQuickReply] = useState(false);
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

  // Standup Meeting State (Google Meet & Zoom Direct Redirects)
  const [meetingPlatform, setMeetingPlatform] = useState<"meet" | "zoom">("meet");
  const [customMeetUrl, setCustomMeetUrl] = useState(() => {
    const saved = localStorage.getItem("creo_member_meet_url");
    if (!saved || saved.includes("creo-standup-sync")) return DEFAULT_MEET_URL;
    return saved;
  });
  const [customMeetCode, setCustomMeetCode] = useState(() => {
    const saved = localStorage.getItem("creo_member_meet_code");
    if (saved === "creo-standup-sync") return "";
    return saved || DEFAULT_MEET_CODE;
  });
  const [customZoomUrl, setCustomZoomUrl] = useState(() => {
    return localStorage.getItem("creo_member_zoom_url") || DEFAULT_ZOOM_URL;
  });
  const [isEditingMeeting, setIsEditingMeeting] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);

  const userInitials = (user?.full_name || "SC")
    .replace(/\(.*?\)/g, "")
    .replace(/[^a-zA-Z0-9\s]/g, "")
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((n) => n[0])
    .join("")
    .toUpperCase() || "SC";

  // Clean real lead feedback notes (zero mock data)
  const [notesList, setNotesList] = useState<LeadNoteItem[]>([]);
  const [dismissedNoteIds, setDismissedNoteIds] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem("creo_dismissed_feedback_notes");
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  // Merge real QA feedback from assigned/pod tasks with notesList
  const allNotes = useMemo(() => {
    const dismissedSet = new Set(dismissedNoteIds);
    const realNotes: LeadNoteItem[] = [];
    allEligibleTasks.forEach((t) => {
      const comment =
        t.deliverable?.rejection_comment ||
        (t as any).rejection_comment ||
        (t as any).qa_feedback ||
        (t as any).feedback;
      const noteId = `task-qa-${t.id}`;
      if (comment && !dismissedSet.has(noteId) && !dismissedSet.has(t.id)) {
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
          id: noteId,
          taskId: t.id,
          author: leadName,
          role: `${t.client_name || "Pod QA"} · QA Review`,
          badge: t.blueprint?.concept_name || t.deliverable_type?.toUpperCase() || "Revision Required",
          badgeColor: "bg-amber-500/15 text-amber-300 border border-amber-500/30",
          content: comment,
          avatarBg: "bg-blue-600 text-app-on-accent!",
          avatar: cleanLeadInitials,
        });
      }
    });
    const existingIds = new Set(notesList.map((n) => n.id));
    const fresh = realNotes.filter((n) => !existingIds.has(n.id));
    return [...fresh, ...notesList].filter((n) => !dismissedSet.has(n.id));
  }, [allEligibleTasks, leadName, notesList, dismissedNoteIds]);

  const showToast = (text: string, type: "success" | "info" = "success") => {
    setToastMessage({ text, type });
    setTimeout(() => setToastMessage(null), 4000);
  };

  const handleCopyMeetCode = async (code: string) => {
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(code);
      } else {
        const textArea = document.createElement("textarea");
        textArea.value = code;
        textArea.style.position = "fixed";
        textArea.style.left = "-999999px";
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        document.execCommand("copy");
        textArea.remove();
      }
      setCopiedCode(true);
      showToast(`Meet code "${code}" copied to clipboard!`, "success");
      setTimeout(() => setCopiedCode(false), 2000);
    } catch {
      showToast("Failed to copy meet code", "info");
    }
  };

  const handleSaveMeetingConfig = (newCode: string, newMeetUrl: string, newZoomUrl: string) => {
    const trimmedCode = newCode.trim();
    const trimmedMeetUrl = newMeetUrl.trim() || (trimmedCode ? `https://meet.google.com/${trimmedCode}` : DEFAULT_MEET_URL);
    const trimmedZoomUrl = newZoomUrl.trim() || DEFAULT_ZOOM_URL;

    setCustomMeetCode(trimmedCode);
    setCustomMeetUrl(trimmedMeetUrl);
    setCustomZoomUrl(trimmedZoomUrl);

    if (trimmedCode) {
      localStorage.setItem("creo_member_meet_code", trimmedCode);
    } else {
      localStorage.removeItem("creo_member_meet_code");
    }
    localStorage.setItem("creo_member_meet_url", trimmedMeetUrl);
    localStorage.setItem("creo_member_zoom_url", trimmedZoomUrl);

    setIsEditingMeeting(false);
    showToast("Meeting configuration updated successfully!", "success");
  };

  const handleResetMeetingConfig = () => {
    setCustomMeetCode(DEFAULT_MEET_CODE);
    setCustomMeetUrl(DEFAULT_MEET_URL);
    setCustomZoomUrl(DEFAULT_ZOOM_URL);

    localStorage.removeItem("creo_member_meet_code");
    localStorage.removeItem("creo_member_meet_url");
    localStorage.removeItem("creo_member_zoom_url");

    setIsEditingMeeting(false);
    showToast("Meeting settings restored to defaults", "info");
  };

  const handleSendQuickReply = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = quickReplyText.trim();

    if (!trimmed) {
      navigate("/workstation/slack?channel=pod-beta-team", {
        state: { channel: "pod-beta-team" },
      });
      return;
    }

    setIsSendingQuickReply(true);

    try {
      // 1. Post real message to backend for pod-beta-team channel
      await request("/api/v1/chat/messages", {
        method: "POST",
        body: JSON.stringify({
          channel: "pod-beta-team",
          message: trimmed,
        }),
      });

      // 2. Buffer locally to Slack channels storage key so Slack page displays it instantly
      const LOCAL_STORAGE_CHANNEL_MESSAGES_KEY = "creo_slack_channels_v3";
      try {
        const saved = localStorage.getItem(LOCAL_STORAGE_CHANNEL_MESSAGES_KEY);
        const parsed = saved ? JSON.parse(saved) : {};
        const currentPersona = user?.full_name || "Specialist";
        const newMsg = {
          id: `local-${Date.now()}`,
          sender: currentPersona,
          role: "Specialist",
          avatar: currentPersona.slice(0, 2).toUpperCase(),
          avatarBg: "bg-app-accent text-app-on-accent!",
          content: trimmed,
          timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
          reactions: [],
        };
        parsed["pod-beta-team"] = [...(parsed["pod-beta-team"] || []), newMsg];
        localStorage.setItem(LOCAL_STORAGE_CHANNEL_MESSAGES_KEY, JSON.stringify(parsed));
      } catch {
        // ignore
      }

      // 3. Broadcast real-time message notification
      try {
        const bc = new BroadcastChannel("creo_chat_channel");
        bc.postMessage({ type: "NEW_MESSAGE", timestamp: Date.now() });
        bc.close();
      } catch {
        // ignore
      }

      // 4. Invalidate React Query chat messages cache
      queryClient.invalidateQueries({ queryKey: ["chat_messages"] });

      // 5. Dismiss feedback notes so they disappear from the dashboard once replied
      const noteIdsToDismiss = allNotes.map((n) => n.id);
      if (noteIdsToDismiss.length > 0) {
        setDismissedNoteIds((prev) => {
          const updated = Array.from(new Set([...prev, ...noteIdsToDismiss]));
          try {
            localStorage.setItem("creo_dismissed_feedback_notes", JSON.stringify(updated));
          } catch {}
          return updated;
        });
      }
      setNotesList([]);
      setQuickReplyText("");
      showToast("Message sent to Pod Beta Team via Slack!", "success");

      // 6. Redirect to Pod Beta Team in Slack
      navigate("/workstation/slack?channel=pod-beta-team", {
        state: { channel: "pod-beta-team" },
      });
    } catch (err: any) {
      console.error("Failed to send reply to Pod Beta Team:", err);
      showToast(err?.message || "Failed to send message to Pod Beta Team. Please retry.", "info");
    } finally {
      setIsSendingQuickReply(false);
    }
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
      refetch();
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
          <h3 className="text-base font-bold text-hi">Failed to load workstation overview</h3>
          <p className="text-xs text-app-mist max-w-sm">
            {(error as Error)?.message || "Could not connect to the workstation service."}
          </p>
        </div>
        <button
          onClick={() => refetch()}
          className="px-4 py-2 rounded-xl bg-app-surface hover:bg-app-line border border-app-line text-xs font-bold text-hi transition-colors cursor-pointer"
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
    <div data-surface="ops" className="min-h-screen bg-app-base text-hi font-sans flex flex-col">
      {/* Main Container */}
      <main className="flex-1 max-w-[1440px] w-full mx-auto px-3.5 sm:px-6 lg:px-8 pt-0 sm:pt-6 pb-20 sm:pb-8 space-y-3 sm:space-y-6">
        {/* Toast Alert */}
        {toastMessage && (
          <div
            className={`p-3 rounded-xl border text-xs font-bold flex items-center justify-between shadow-2xs animate-fade-in ${
              toastMessage.type === "info"
                ? "bg-app-accent/15 border-app-accent/30 text-app-accent"
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

        {/* ── MOBILE DASHBOARD VIEW (< md) ── */}
        <MemberMobileDashboard
          podName={podName}
          leadName={leadName}
          user={user}
          userInitials={userInitials}
          metricActiveTasks={metricActiveTasks}
          displayInProdTasks={displayInProdTasks}
          displayQaTasks={displayQaTasks}
          dueTodayCount={dueTodayCount}
          deliverablesScope={deliverablesScope}
          setDeliverablesScope={setDeliverablesScope}
          deliverablesTab={deliverablesTab}
          setDeliverablesTab={setDeliverablesTab}
          displayActiveTasks={displayActiveTasks}
          displayCompletedTasks={displayCompletedTasks}
          currentTasks={currentTasks}
          allEligibleTasks={allEligibleTasks}
          allNotes={allNotes}
          members={members}
          quickReplyText={quickReplyText}
          setQuickReplyText={setQuickReplyText}
          isSendingQuickReply={isSendingQuickReply}
          handleSendQuickReply={handleSendQuickReply}
          setLogHoursModalOpen={setLogHoursModalOpen}
          setZoomModalOpen={setZoomModalOpen}
          setSelectedTaskId={setSelectedTaskId}
          setUploadModalOpen={setUploadModalOpen}
          openPreviewModal={openPreviewModal}
          showToast={showToast}
        />

        {/* ── DESKTOP DASHBOARD VIEW (>= md) ── */}
        <div className="hidden md:block space-y-6">
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
                className="bg-app-surface rounded-xl sm:rounded-2xl p-2.5 sm:p-3 border border-app-line/80 shadow-2xs flex flex-col justify-between hover-card-innovative"
              >
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[9px] sm:text-[10px] font-bold uppercase tracking-wider text-app-mist">
                    ACTIVE SPRINT TASKS
                  </span>
                  <div className="size-6 sm:size-7 rounded-lg bg-app-accent/15 text-app-accent flex items-center justify-center">
                    <Sparkles className="size-3 sm:size-3.5" />
                  </div>
                </div>
                <div>
                  <div className="flex items-baseline gap-1.5 mb-1">
                    <span className="text-lg sm:text-xl font-black text-hi">{metricActiveTasks.length}</span>
                    <span className="text-[10.5px] sm:text-[11px] font-bold text-app-mist">Active</span>
                    <span className="text-[9.5px] sm:text-[10px] text-app-mist truncate">({displayInProdTasks.length} in progress · {displayQaTasks.length} in QA)</span>
                  </div>
                  <div className="flex items-center justify-between text-[10px] sm:text-[11px] pt-1.5 border-t border-app-line">
                    <span className="font-bold text-app-accent flex items-center gap-1">
                      ● Due Today: {dueTodayCount}
                    </span>
                    <Link to="/workstation/tasks" className="font-bold text-app-mist hover:text-app-ink-2 flex items-center gap-0.5">
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
                className="bg-app-surface rounded-xl sm:rounded-2xl p-2.5 sm:p-3 border border-app-line/80 shadow-2xs flex flex-col justify-between hover-card-innovative"
              >
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[9px] sm:text-[10px] font-bold uppercase tracking-wider text-app-mist">
                    WEEKLY HOURS LOGGED
                  </span>
                  <div className="size-6 sm:size-7 rounded-lg bg-indigo-500/15 text-indigo-400 border border-indigo-500/30 flex items-center justify-center">
                    <Clock className="size-3 sm:size-3.5" />
                  </div>
                </div>
                <div>
                  <div className="flex items-baseline gap-1.5 mb-1">
                    <span className="text-lg sm:text-xl font-black text-hi">32.5</span>
                    <span className="text-[10.5px] sm:text-[11px] font-bold text-app-mist">/ 40 hrs</span>
                  </div>
                  {/* Progress bar */}
                  <div className="w-full h-1.5 bg-app-surface rounded-full overflow-hidden my-1">
                    <div className="h-full bg-blue-600 rounded-full w-[81%] transition-all duration-700 text-app-on-accent!" />
                  </div>
                  <div className="flex items-center justify-between text-[10px] sm:text-[11px] pt-1 border-t border-app-line">
                    <span className="font-bold text-emerald-600">81% target</span>
                    <span className="font-bold text-app-mist">7.5h left</span>
                  </div>
                </div>
              </motion.div>

              {/* Remaining PTO */}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: 0.15 }}
                className="bg-app-surface rounded-xl sm:rounded-2xl p-2.5 sm:p-3 border border-app-line/80 shadow-2xs flex flex-col justify-between hover-card-innovative"
              >
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[9px] sm:text-[10px] font-bold uppercase tracking-wider text-app-mist">
                    REMAINING PTO
                  </span>
                  <div className="size-6 sm:size-7 rounded-lg bg-purple-500/15 text-purple-400 border border-purple-500/30 flex items-center justify-center">
                    <Calendar className="size-3 sm:size-3.5" />
                  </div>
                </div>
                <div>
                  <div className="flex items-baseline gap-1.5 mb-1">
                    <span className="text-lg sm:text-xl font-black text-hi">14.5</span>
                    <span className="text-[10.5px] sm:text-[11px] font-bold text-app-mist">Days</span>
                    <span className="text-[9.5px] sm:text-[10px] text-app-mist">1.5d/mo</span>
                  </div>
                  <div className="flex items-center justify-between text-[10px] sm:text-[11px] pt-1.5 border-t border-app-line">
                    <span className="font-bold text-app-ink-2 truncate">Next: Nov 8 (0.5d)</span>
                    <Link to="/workstation/schedule" className="font-bold text-app-accent hover:underline shrink-0">
                      Plan &rarr;
                    </Link>
                  </div>
                </div>
              </motion.div>
            </div>

            {/* Section A: Today's Priority Focus & Production Queue */}
            {focusTasks.length === 0 || !focusTasks[0] ? (
              <div className="bg-app-surface rounded-2xl p-6 sm:p-8 border border-app-line/80 shadow-2xs text-center space-y-3 flex-1 flex flex-col justify-center">
                <div className="size-12 rounded-2xl bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 flex items-center justify-center mx-auto">
                  <CheckCircle2 className="size-6" />
                </div>
                <div className="space-y-1">
                  <h3 className="text-sm sm:text-base font-black text-hi">No Active Tasks in Production</h3>
                  <p className="text-xs text-app-mist max-w-md mx-auto leading-relaxed">
                    You currently have no tasks in production or internal QA review. Check your task queue for new pod assignments or review upcoming deliverables.
                  </p>
                </div>
                <div className="flex flex-wrap items-center justify-center gap-2 pt-2">
                  <Link
                    to="/workstation/tasks"
                    className="px-4 py-2 rounded-xl bg-app-accent hover:bg-blue-600 text-app-on-accent! text-xs font-bold flex items-center gap-1.5 transition-colors shadow-2xs"
                  >
                    <span>Browse Task Queue</span>
                    <ArrowRight className="size-3" />
                  </Link>
                  <Link
                    to="/workstation/schedule"
                    className="px-4 py-2 rounded-xl bg-app-base hover:bg-app-surface border border-app-line text-app-ink-2 text-xs font-bold transition-colors"
                  >
                    View Schedule & PTO
                  </Link>
                </div>
              </div>
            ) : (() => {
              const primaryTask = focusTasks[0]!;
              const secondaryTask = focusTasks[1];
              return (
                <div className="bg-app-surface rounded-2xl p-4 sm:p-5 border border-app-line/80 shadow-2xs space-y-3.5 flex-1 flex flex-col justify-between">
                  <div className="flex items-center justify-between pb-3 border-b border-app-line">
                    <div className="flex items-center gap-2">
                      <span className="size-1.5 rounded-full bg-blue-600 animate-pulse text-app-on-accent!" />
                      <h2 className="text-sm font-black text-hi">
                        Today's Priority Focus & Production Queue
                      </h2>
                    </div>
                    <span className="text-[10px] font-mono font-bold text-app-accent bg-app-base px-2.5 py-1 rounded-lg border border-app-line">
                      {focusTasks.length} {focusTasks.length === 1 ? "Active Task" : "Active Tasks"}
                    </span>
                  </div>

                  {/* Priority Item 1 */}
                  <div className="p-3.5 rounded-xl bg-app-base/80 border border-app-line/70 space-y-2.5">
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
                            <span className="text-xs font-bold text-app-accent">{primaryTask.client_name || "Assigned Client"}</span>
                            <span className="text-app-mist text-[10px]">· {primaryTask.status === "internal_qa" ? "IN QA" : "PRODUCTION"}</span>
                          </div>
                          <h3 className="text-xs font-black text-hi">{primaryTask.blueprint?.concept_name || primaryTask.deliverable_type || "Production Deliverable"}</h3>
                          <div className="flex flex-wrap items-center gap-1.5 text-[10px] text-app-mist mt-0.5">
                            <span>{primaryTask.deliverable_type?.toUpperCase() || "CREATIVE ASSET"}</span>
                            <span>•</span>
                            <span>{primaryTask.due_date ? `Due ${new Date(primaryTask.due_date).toLocaleDateString()}` : "Active Sprint"}</span>
                            {primaryTask.sla_due_at && (
                              <>
                                <span>•</span>
                                <span className={getTaskSlaDueText(primaryTask).urgent ? "text-rose-400 font-bold" : "text-amber-400 font-semibold"}>
                                  {getTaskSlaDueText(primaryTask).text}
                                </span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>

                      <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold self-start ${
                        primaryTask.status === "internal_qa"
                          ? "bg-purple-500/15 text-purple-400 border border-purple-500/30"
                          : "bg-app-accent/15 text-app-accent border border-app-accent/30"
                      }`}>
                        {primaryTask.status === "internal_qa" ? "Internal QA Review" : "In Production"}
                      </span>
                    </div>

                    {/* Task Actions */}
                    <div className="flex flex-wrap items-center gap-2 pt-0.5">
                      <button
                        onClick={() => openPreviewModal(primaryTask)}
                        className="px-3 py-1.5 rounded-lg bg-app-surface border border-app-line text-[11px] font-bold text-app-ink-2 flex items-center gap-1 cursor-pointer"
                      >
                        <Eye className="size-3 text-app-mist" />
                        Preview Specs
                      </button>
                      <Link
                        to={`/workstation/tasks?taskId=${encodeURIComponent(primaryTask.id)}`}
                        className="px-3 py-1.5 rounded-lg bg-app-surface border border-app-line hover:bg-app-accent hover:border-app-accent hover:text-white! text-[11px] font-bold text-app-ink-2 flex items-center gap-1 shadow-2xs transition-all duration-150 cursor-pointer"
                      >
                        <Layers className="size-3 text-app-mist" />
                        Task Board
                      </Link>
                      <button
                        onClick={() => openUploadModal(primaryTask)}
                        className="px-3 py-1.5 rounded-lg bg-app-accent/15 text-app-accent text-[11px] font-bold flex items-center gap-1 cursor-pointer ml-auto"
                      >
                        <Send className="size-3" />
                        Handoff to Lead
                      </button>
                    </div>
                  </div>

                  {/* Priority Item 2 if exists */}
                  {secondaryTask && (
                    <div className="p-3.5 rounded-xl bg-app-base/80 border border-app-line/70 space-y-2.5">
                      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2">
                        <div className="flex items-start gap-2.5">
                          <div className="size-10 rounded-lg bg-gradient-to-br from-indigo-700 to-indigo-900 overflow-hidden shrink-0 relative flex items-center justify-center text-app-on-accent! font-mono text-[8px] font-bold">
                            {secondaryTask.deliverable_type?.slice(0, 4) || "P2"}
                          </div>
                          <div>
                            <div className="flex items-center gap-1.5">
                              <span className="text-xs font-bold text-indigo-400">{secondaryTask.client_name || "Assigned Client"}</span>
                              <span className="text-app-mist text-[10px]">· P2-ACTIVE</span>
                            </div>
                            <h3 className="text-xs font-black text-hi">{secondaryTask.blueprint?.concept_name || secondaryTask.deliverable_type || "Secondary Deliverable"}</h3>
                            <div className="flex flex-wrap items-center gap-1.5 text-[10px] text-app-mist mt-0.5">
                              <span>{secondaryTask.deliverable_type?.toUpperCase() || "CREATIVE ASSET"}</span>
                              <span>•</span>
                              <span>{secondaryTask.due_date ? `Due ${new Date(secondaryTask.due_date).toLocaleDateString()}` : "In Progress"}</span>
                              {secondaryTask.sla_due_at && (
                                <>
                                  <span>•</span>
                                  <span className={getTaskSlaDueText(secondaryTask).urgent ? "text-rose-400 font-bold" : "text-amber-400 font-semibold"}>
                                    {getTaskSlaDueText(secondaryTask).text}
                                  </span>
                                </>
                              )}
                            </div>
                          </div>
                        </div>

                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-app-accent/15 text-app-accent border border-app-accent/30 self-start">
                          {secondaryTask.status === "internal_qa" ? "Internal QA" : "In Production"}
                        </span>
                      </div>

                      <div className="flex flex-wrap items-center gap-2 pt-0.5">
                        <button
                          onClick={() => openPreviewModal(secondaryTask)}
                          className="px-3 py-1.5 rounded-lg bg-app-surface border border-app-line text-[11px] font-bold text-app-ink-2 flex items-center gap-1 cursor-pointer"
                        >
                          <Eye className="size-3 text-app-mist" />
                          Preview Specs
                        </button>
                        <Link
                          to={`/workstation/tasks?taskId=${encodeURIComponent(secondaryTask.id)}`}
                          className="px-3 py-1.5 rounded-lg bg-app-surface border border-app-line hover:bg-app-accent hover:border-app-accent hover:text-white! text-[11px] font-bold text-app-ink-2 flex items-center gap-1 shadow-2xs transition-all duration-150 cursor-pointer"
                        >
                          <Layers className="size-3 text-app-mist" />
                          Task Board
                        </Link>
                        <button
                          onClick={() => openUploadModal(secondaryTask)}
                          className="px-3.5 py-1.5 rounded-lg bg-app-accent text-app-on-accent! text-[11px] font-bold flex items-center gap-1 shadow-2xs cursor-pointer ml-auto"
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
            <div className="bg-app-surface rounded-2xl p-4 border border-app-line/80 shadow-2xs space-y-3 h-full flex flex-col justify-between">
              <div className="flex items-center justify-between pb-2 border-b border-app-line">
                <div className="flex items-center gap-1.5">
                  <FileText className="size-3.5 text-app-accent" />
                  <h3 className="text-xs font-black text-hi">Lead Feedback & Notes</h3>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="px-2 py-0.2 rounded-full text-[9px] font-black bg-app-accent/15 text-app-accent">
                    {allNotes.length} Updates
                  </span>
                  <button
                    type="button"
                    onClick={(e) => {
                      if (quickReplyText.trim()) {
                        handleSendQuickReply(e);
                      } else {
                        navigate("/workstation/slack?channel=pod-beta-team", {
                          state: { channel: "pod-beta-team" },
                        });
                      }
                    }}
                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-app-base hover:bg-app-surface border border-app-line text-app-accent hover:text-hi text-[10px] font-bold transition-colors cursor-pointer"
                    title="Open Pod Beta Team in Slack"
                  >
                    <MessageSquare className="size-2.5" />
                    <span>Slack Hub</span>
                  </button>
                </div>
              </div>

              {/* Feed Items */}
              {allNotes.length === 0 ? (
                <div className="py-8 px-4 text-center rounded-xl bg-app-base/50 border border-dashed border-app-line space-y-2 flex-1 flex flex-col items-center justify-center">
                  <div className="size-9 rounded-full bg-slate-800/80 border border-slate-700/80 mx-auto flex items-center justify-center text-app-mist">
                    <CheckCircle2 className="size-4 text-emerald-400" />
                  </div>
                  <div>
                    <p className="font-bold text-hi text-xs">No feedback or revision requests</p>
                    <p className="text-[11px] text-app-mist mt-0.5">
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
                      className={`p-2.5 rounded-xl bg-app-base/80 border border-app-line/60 space-y-1.5 text-xs transition-all ${
                        note.taskId ? "cursor-pointer hover:border-app-accent/60 hover:bg-app-nested group" : ""
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5">
                          <div className={`size-5 rounded-md ${note.avatarBg} text-hi font-black text-[9px] flex items-center justify-center`}>
                            {note.avatar}
                          </div>
                          <div>
                            <span className="font-bold text-hi text-[11px]">{note.author}</span>
                            <span className="text-[9px] text-app-mist block">{note.role}</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-1">
                          <span className={`px-1.5 py-0.2 rounded text-[9px] font-bold ${note.badgeColor || "bg-app-accent/20 text-app-accent"}`}>
                            {note.badge}
                          </span>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setDismissedNoteIds((prev) => {
                                const updated = Array.from(new Set([...prev, note.id]));
                                try {
                                  localStorage.setItem("creo_dismissed_feedback_notes", JSON.stringify(updated));
                                } catch {}
                                return updated;
                              });
                            }}
                            className="size-4 rounded hover:bg-slate-700/60 flex items-center justify-center text-app-mist hover:text-hi transition-colors cursor-pointer"
                            title="Dismiss feedback"
                          >
                            <X className="size-2.5" />
                          </button>
                          {note.taskId && (
                            <ArrowRight className="size-3 text-app-accent opacity-70 group-hover:opacity-100 group-hover:translate-x-0.5 transition-transform" />
                          )}
                        </div>
                      </div>

                      <p className="text-app-ink-2 leading-relaxed font-medium text-[11px]">"{note.content}"</p>

                      {note.taskId && (
                        <div className="flex items-center gap-1 text-[10px] text-app-accent font-semibold pt-0.5">
                          <span>Open revision task in board</span>
                          <ArrowRight className="size-2.5" />
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* Quick Reply via Slack Form */}
              <form onSubmit={handleSendQuickReply} className="pt-2 border-t border-app-line space-y-1.5">
                <div className="flex items-center justify-between text-[10px]">
                  <span className="text-app-mist flex items-center gap-1">
                    <MessageSquare className="size-3 text-app-accent" />
                    <span>Reply to <strong className="text-hi font-medium">Pod Beta Team</strong> via Slack</span>
                  </span>
                  <span className="text-[9px] text-app-accent font-semibold">Instant Sync</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <input
                    type="text"
                    value={quickReplyText}
                    onChange={(e) => setQuickReplyText(e.target.value)}
                    placeholder="Reply to Pod Beta Team via Slack..."
                    disabled={isSendingQuickReply}
                    className="flex-1 px-2.5 py-1.5 rounded-lg bg-app-base border border-app-line text-[11px] font-medium text-hi placeholder:text-app-mist focus:outline-none focus:bg-app-surface focus:ring-1 focus:ring-blue-500 disabled:opacity-60"
                  />
                  <button
                    type="submit"
                    disabled={!quickReplyText.trim() || isSendingQuickReply}
                    title="Send to Pod Beta Team via Slack"
                    className="h-7 px-2.5 rounded-lg bg-app-accent hover:bg-blue-600 disabled:opacity-40 disabled:cursor-not-allowed active:scale-95 text-app-on-accent! flex items-center gap-1 text-[11px] font-bold transition-all shadow-2xs cursor-pointer shrink-0"
                  >
                    {isSendingQuickReply ? (
                      <>
                        <Loader2 className="size-2.5 animate-spin" />
                        <span>Sending...</span>
                      </>
                    ) : (
                      <>
                        <span>Slack</span>
                        <Send className="size-2.5" />
                      </>
                    )}
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
            <div className="bg-app-surface rounded-2xl p-4 sm:p-5 border border-app-line/80 shadow-2xs space-y-3 h-full flex flex-col">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-2.5 border-b border-app-line gap-2.5">
                <div>
                  <h2 className="text-sm font-black text-hi">Assigned Sprint Deliverables</h2>
                  <p className="text-[11px] text-app-mist">Deliverables tracker across client pods</p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  {/* Pod Scope Sub-Filter: My Deliverables vs All Pod Deliverables */}
                  <div className="flex items-center bg-app-base p-0.5 rounded-lg text-xs font-bold border border-app-line">
                    <button
                      type="button"
                      onClick={() => setDeliverablesScope("my")}
                      className={`px-2.5 py-1 rounded-md transition-all text-[11px] cursor-pointer ${
                        deliverablesScope === "my"
                          ? "bg-app-surface text-hi shadow-2xs font-black border border-app-line"
                          : "text-app-mist"
                      }`}
                    >
                      My Deliverables
                    </button>
                    <button
                      type="button"
                      onClick={() => setDeliverablesScope("all")}
                      className={`px-2.5 py-1 rounded-md transition-all text-[11px] cursor-pointer ${
                        deliverablesScope === "all"
                          ? "bg-app-surface text-hi shadow-2xs font-black border border-app-line"
                          : "text-app-mist"
                      }`}
                    >
                      All Pod Deliverables
                    </button>
                  </div>

                  {/* Status Filter: Active vs Archived */}
                  <div className="flex items-center bg-app-base p-0.5 rounded-lg text-xs font-bold border border-app-line">
                    <button
                      type="button"
                      onClick={() => setDeliverablesTab("active")}
                      className={`px-2.5 py-1 rounded-md transition-all text-[11px] cursor-pointer ${
                        deliverablesTab === "active"
                          ? "bg-app-surface text-hi shadow-2xs font-black border border-app-line"
                          : "text-app-mist"
                      }`}
                    >
                      Active ({displayActiveTasks.length})
                    </button>
                    <button
                      type="button"
                      onClick={() => setDeliverablesTab("archived")}
                      className={`px-2.5 py-1 rounded-md transition-all text-[11px] cursor-pointer ${
                        deliverablesTab === "archived"
                          ? "bg-app-surface text-hi shadow-2xs font-black border border-app-line"
                          : "text-app-mist"
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
                    <div className="py-10 text-center border-2 border-dashed border-app-line rounded-xl space-y-2 p-4 flex-1 flex flex-col items-center justify-center">
                      <div className="size-10 rounded-full bg-slate-800 border border-slate-700 mx-auto flex items-center justify-center text-app-mist">
                        <Sparkles className="size-5 text-app-accent" />
                      </div>
                      <p className="font-bold text-hi text-xs">
                        {deliverablesScope === "my"
                          ? `No ${deliverablesTab} deliverables assigned to you`
                          : `No ${deliverablesTab} deliverables found in pod`}
                      </p>
                      <p className="text-[11px] text-app-mist max-w-sm mx-auto">
                        {deliverablesScope === "my"
                          ? "You have no deliverables currently in production or QA. Pull new deliverables from your assigned backlog or toggle to All Pod Deliverables."
                          : "Tasks will appear here once active in the sprint queue."}
                      </p>
                      {deliverablesScope === "my" && (
                        <div className="flex flex-wrap items-center justify-center gap-2 pt-1">
                          <Link
                            to="/workstation/tasks"
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-app-on-accent! text-xs font-bold transition-all shadow-2xs"
                          >
                            <span>Production Tasks</span>
                            <ArrowRight className="size-3" />
                          </Link>
                          {activeSprintTasks.length > 0 && (
                            <button
                              type="button"
                              onClick={() => setDeliverablesScope("all")}
                              className="px-3 py-1.5 rounded-lg border border-app-line bg-app-surface hover:bg-app-base text-app-ink-2 text-xs font-semibold transition-all cursor-pointer"
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
                        <div key={t.id || idx} className="p-3 rounded-xl bg-app-base/90 border border-app-line/80 space-y-2">
                          <div className="flex items-start justify-between gap-1.5">
                            <div>
                              <span className="text-[9px] font-bold text-app-accent uppercase">{t.client_name || "Client"}</span>
                              <h4 className="text-xs font-black text-hi leading-snug">{t.blueprint?.concept_name || t.deliverable_type || "Sprint Task"}</h4>
                              <div className="text-[10px] text-app-mist font-medium">{t.deliverable_type || "Motion Asset"}</div>
                            </div>
                            <span className="px-1.5 py-0.2 rounded text-[8px] font-black bg-app-accent/20 text-app-accent border border-app-accent/30 shrink-0">
                              {t.status === "in_production" ? "PROD" : t.status === "internal_qa" ? "QA" : "READY"}
                            </span>
                          </div>
                          <div className="flex items-center justify-between pt-1.5 border-t border-app-line/60 text-xs">
                            <span className="font-bold text-[10px]">
                              {isAssignedToCurrentUser(t) ? (
                                <span className="text-emerald-400 flex items-center gap-1">
                                  <span className="size-1.5 rounded-full bg-emerald-400 text-app-on-accent!" />
                                  {t.assignee?.full_name || t.assignee_name || "You"} (You)
                                </span>
                              ) : (
                                <span className="text-app-mist">{t.assignee?.full_name || t.assignee_name || "Unassigned"}</span>
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
                                  className="px-2 py-0.5 rounded-md border border-app-accent/30 bg-app-accent/15 text-app-accent font-bold text-[10px] inline-flex items-center gap-1 cursor-pointer"
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
                                    ? "border-amber-500/30 bg-amber-500/10 text-amber-300"
                                    : "border-app-line bg-app-surface text-app-ink-2"
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
                          <tr className="border-b border-app-line text-app-mist font-bold uppercase tracking-wider text-[9px]">
                            <th className="py-2 px-2.5">Asset Name & ID</th>
                            <th className="py-2 px-2.5">Client</th>
                            <th className="py-2 px-2.5">Status</th>
                            <th className="py-2 px-2.5">Assignee</th>
                            <th className="py-2 px-2.5 text-right">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800 font-medium text-app-ink-2">
                          {currentTasks.map((t, idx) => (
                            <tr key={t.id || idx}>
                              <td className="py-2.5 px-2.5">
                                <div className="font-bold text-hi text-xs">{t.blueprint?.concept_name || t.deliverable_type || "Sprint Asset"}</div>
                                <div className="text-[10px] text-app-mist">{t.deliverable_type || "Motion Asset"} · ID: {t.id?.slice(0, 6)}</div>
                              </td>
                              <td className="py-2.5 px-2.5 font-semibold text-hi text-xs">{t.client_name || "Client"}</td>
                              <td className="py-2.5 px-2.5">
                                <span className="px-2 py-0.5 rounded text-[9px] font-black bg-app-accent/20 text-app-accent border border-app-accent/30">
                                  {t.status === "in_production" ? "IN PRODUCTION" : t.status === "internal_qa" ? "PENDING QA" : "READY"}
                                </span>
                              </td>
                              <td className="py-2.5 px-2.5 text-xs">
                                {isAssignedToCurrentUser(t) ? (
                                  <span className="text-emerald-400 font-bold flex items-center gap-1.5">
                                    <span className="size-1.5 rounded-full bg-emerald-400 text-app-on-accent!" />
                                    {t.assignee?.full_name || t.assignee_name || "You"} (You)
                                  </span>
                                ) : (
                                  <span className="text-app-mist font-medium">{t.assignee?.full_name || t.assignee_name || "Unassigned"}</span>
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
                                    className="px-2.5 py-1 rounded-md border border-app-accent/30 bg-app-accent/15 text-app-accent font-bold text-[10px] inline-flex items-center gap-1 cursor-pointer"
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
                                      ? "border-amber-500/30 bg-amber-500/10 text-amber-300"
                                      : "border-app-line bg-app-surface text-app-ink-2"
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
            <div className="bg-app-surface rounded-2xl p-4 border border-app-line/80 shadow-2xs space-y-3 h-full flex flex-col justify-between">
              <div className="flex items-center justify-between pb-2 border-b border-app-line">
                <div className="flex items-center gap-1.5">
                  <Users className="size-3.5 text-app-accent" />
                  <h3 className="text-xs font-black text-hi">{podName} Team Sync</h3>
                </div>
                <span className="px-2 py-0.5 rounded-full text-[9px] font-black bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                  ● {members.length || 1} Active
                </span>
              </div>

              {/* Standup Banner */}
              <div className="p-2.5 rounded-xl bg-app-accent/15 border border-app-accent/30 flex items-center justify-between gap-2">
                <div>
                  <div className="text-[11px] font-black text-hi">10:00 AM Daily Standup</div>
                  <div className="text-[10px] text-app-accent font-medium">Google Meet & Zoom • Active in 25m</div>
                </div>
                <button
                  onClick={() => setZoomModalOpen(true)}
                  className="px-2.5 py-1 rounded-lg bg-blue-600 hover:bg-blue-700 text-app-on-accent! font-bold text-[11px] shadow-2xs cursor-pointer"
                >
                  Join
                </button>
              </div>

              {/* Member Status List */}
              <div className="space-y-2 text-xs flex-1 overflow-y-auto">
                {members.length > 0 ? (
                  members.map((m) => (
                    <div key={m.id} className="flex items-center justify-between p-1.5 rounded-lg hover:bg-app-base transition-colors">
                      <div className="flex items-center gap-2">
                        <div className="size-6 rounded-md bg-app-accent text-app-on-accent! font-black text-[9px] flex items-center justify-center">
                          {m.full_name?.slice(0, 2).toUpperCase() || "CP"}
                        </div>
                        <div>
                          <span className="font-bold text-hi block text-[11px]">{m.full_name}</span>
                          <span className="text-[9px] text-app-mist">{m.role || "Pod Specialist"} • Active</span>
                        </div>
                      </div>
                      <span className="size-1.5 rounded-full bg-emerald-500 text-app-on-accent!" />
                    </div>
                  ))
                ) : (
                  <div className="flex items-center justify-between p-1.5 rounded-lg hover:bg-app-base transition-colors">
                    <div className="flex items-center gap-2">
                      <div className="size-6 rounded-md bg-app-accent text-app-on-accent! font-black text-[9px] flex items-center justify-center">
                        {leadName.slice(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <span className="font-bold text-hi block text-[11px]">{leadName}</span>
                        <span className="text-[9px] text-app-mist">Lead Producer • Active</span>
                      </div>
                    </div>
                    <span className="text-[9px] font-black px-1.5 py-0.2 rounded bg-app-surface text-app-ink-2">
                      Pod Lead
                    </span>
                  </div>
                )}
              </div>
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
            className="w-full max-w-md bg-app-surface rounded-3xl p-6 sm:p-7 shadow-2xl border border-app-line space-y-4 animate-scale-up"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-app-line pb-3">
              <div className="flex items-center gap-2.5">
                <div className="size-9 rounded-2xl bg-app-accent/15 text-app-accent flex items-center justify-center font-bold">
                  <Clock className="size-4.5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-hi">Log Daily Work Hours</h3>
                  <p className="text-xs text-app-mist">Record billable sprint time against client deliverable</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setLogHoursModalOpen(false)}
                className="size-8 rounded-full bg-app-surface hover:bg-slate-200 text-app-mist flex items-center justify-center cursor-pointer"
              >
                <X className="size-4" />
              </button>
            </div>

            <form onSubmit={handleSaveHours} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-bold text-app-ink-2 mb-1">Deliverable Project</label>
                <NativeSelect
                  value={hoursProject}
                  onChange={(e) => setHoursProject(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-app-line font-semibold bg-app-surface"
                >
                  <option value="General Sprint Task">General Pod Sprint Delivery</option>
                  {clients.map(c => <option key={c.id} value={c.name}>{c.name} · Active Sprint</option>)}
                </NativeSelect>
              </div>

              <div>
                <label className="block font-bold text-app-ink-2 mb-1">Hours Spent</label>
                <input
                  type="number"
                  step="0.25"
                  required
                  value={hoursToLog}
                  onChange={(e) => setHoursToLog(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-app-line font-bold"
                />
              </div>

              <div>
                <label className="block font-bold text-app-ink-2 mb-1">Work Description & Nodes</label>
                <textarea
                  rows={3}
                  value={hoursNotes}
                  onChange={(e) => setHoursNotes(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-app-line font-medium"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-app-line">
                <button
                  type="button"
                  onClick={() => setLogHoursModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-app-line font-bold text-app-ink-2 hover:bg-app-base cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-app-accent hover:bg-blue-700 text-app-on-accent! font-bold shadow-xs cursor-pointer"
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
            className="w-full max-w-lg bg-app-surface rounded-3xl p-6 sm:p-7 shadow-2xl border border-app-line space-y-4 animate-scale-up"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-app-line pb-3">
              <div className="flex items-center gap-2.5">
                <div className="size-9 rounded-2xl bg-app-accent/15 text-app-accent flex items-center justify-center font-bold">
                  <Upload className="size-4.5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-hi">Upload Sprint Deliverable Cut</h3>
                  <p className="text-xs text-app-mist">Submit render export directly to {leadName} for QA gate</p>
                </div>
              </div>
              <button
                type="button"
                disabled={isUploading}
                onClick={() => setUploadModalOpen(false)}
                className="size-8 rounded-full bg-app-surface hover:bg-slate-700 text-app-mist flex items-center justify-center cursor-pointer disabled:opacity-50"
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
                <label className="block font-bold text-app-ink-2 mb-1">Target Task</label>
                <NativeSelect
                  value={selectedTaskId}
                  disabled={isUploading}
                  onChange={(e) => {
                    setSelectedTaskId(e.target.value);
                    setUploadError(null);
                  }}
                  className="w-full px-3 py-2 rounded-xl border border-app-line font-semibold bg-app-surface"
                >
                  {selectedTaskId && !allEligibleTasks.some((t) => t.id === selectedTaskId) && (
                    <option value={selectedTaskId}>
                      {previewTask?.blueprint?.concept_name || previewTask?.deliverable_type || "Selected Deliverable Task"} ({selectedTaskId.slice(0, 6)})
                    </option>
                  )}
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
                  <div className="p-2.5 rounded-xl bg-app-accent/10 border border-app-accent/25 text-app-ink-2 text-[11px] font-medium flex items-start gap-2">
                    <Sparkles className="size-3.5 text-app-accent shrink-0 mt-0.5" />
                    <div>
                      <span className="font-bold text-app-accent">Pod Collaboration:</span> Task is assigned to {currentTask.assignee?.full_name || currentTask.assignee_name || "Operations Admin"}. Submitting this deliverable will claim it for your cut and route to {leadName} for QA.
                    </div>
                  </div>
                );
              })()}

              {/* Drag Drop Area */}
              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                }}
                onDragEnter={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                }}
                onDrop={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  if (e.dataTransfer.files?.[0]) {
                    handleFileSelect(e.dataTransfer.files[0]);
                  }
                }}
                onClick={() => document.getElementById("asset-file-input")?.click()}
                className="p-5 border-2 border-dashed border-app-line hover:border-app-accent rounded-2xl text-center space-y-2 bg-app-base hover:bg-app-accent/10 transition-colors cursor-pointer"
              >
                <Upload className="size-6 text-app-accent mx-auto" />
                <div className="font-bold text-hi text-xs">
                  {uploadFile ? uploadFile.name : "Drag & drop master render (MP4 / MOV / WEBM / PNG / JPG)"}
                </div>
                <div className="text-[10px] text-app-mist">
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
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    document.getElementById("asset-file-input")?.click();
                  }}
                  className="inline-block px-3 py-1.5 rounded-lg bg-app-surface border border-app-line text-app-ink-2 font-bold text-xs hover:bg-app-line cursor-pointer mt-1"
                >
                  Browse Computer
                </button>
              </div>

              {/* Upload Notes */}
              <div>
                <label className="block font-bold text-app-ink-2 mb-1">Handover Notes for QA (Optional)</label>
                <textarea
                  rows={2}
                  disabled={isUploading}
                  value={uploadNotes}
                  onChange={(e) => setUploadNotes(e.target.value)}
                  placeholder="e.g. Color grade matched to brand DNA, audio compressed to -14 LUFS..."
                  className="w-full px-3 py-2 rounded-xl border border-app-line font-medium bg-app-base text-app-ink-2 placeholder:text-app-mist focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>

              {/* Upload Progress Bar */}
              {uploadProgress !== null && (
                <div className="space-y-1">
                  <div className="flex items-center justify-between text-[11px] font-bold">
                    <span className="text-app-mist">Uploading cut...</span>
                    <span className="text-app-accent">{uploadProgress}%</span>
                  </div>
                  <div className="w-full h-1.5 bg-app-base rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-blue-500 to-indigo-600 transition-all duration-200 rounded-full text-app-on-accent!"
                      style={{ width: `${uploadProgress}%` }}
                    />
                  </div>
                </div>
              )}

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-app-line">
                <button
                  type="button"
                  disabled={isUploading}
                  onClick={() => setUploadModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-app-line font-bold text-app-ink-2 hover:bg-app-base cursor-pointer disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isUploading || !uploadFile || !selectedTaskId}
                  className="px-5 py-2 rounded-xl bg-app-accent hover:bg-blue-700 text-app-on-accent! font-bold shadow-xs cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5"
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

      {/* MODAL: DELIVERABLE SPECS & BRIEF PREVIEW */}
      {previewModalOpen && previewTask && (
        <div
          className="fixed inset-0 w-screen h-screen z-[99999] bg-black/80 backdrop-blur-md flex items-center justify-center p-4 animate-fade-in"
          onClick={() => setPreviewModalOpen(false)}
        >
          <div
            className="w-full max-w-2xl max-h-[90vh] overflow-y-auto bg-app-surface rounded-3xl p-5 sm:p-6 shadow-2xl border border-app-line space-y-4 animate-scale-up custom-scrollbar"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-app-line pb-3">
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded text-[10px] font-black bg-app-accent/20 text-app-accent border border-app-accent/30 uppercase">
                  {previewTask.deliverable_type || "DELIVERABLE"}
                </span>
                {previewTask.deliverable && (
                  <span className="px-2 py-0.5 rounded text-[10px] font-black bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                    v{previewTask.deliverable.version}
                  </span>
                )}
                <div>
                  <h3 className="text-sm font-black text-hi leading-snug">
                    {previewTask.blueprint?.concept_name || previewTask.deliverable_type || "Deliverable Specification"}
                  </h3>
                  <p className="text-[11px] text-app-mist">{previewTask.client_name} · ID: {previewTask.id.slice(0, 8)}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setPreviewModalOpen(false)}
                className="size-8 rounded-full bg-app-base hover:bg-slate-700 text-app-mist hover:text-hi flex items-center justify-center cursor-pointer transition-colors"
                title="Close modal"
              >
                <X className="size-4" />
              </button>
            </div>

            {/* Media Cut Player (if uploaded) */}
            {previewTask.deliverable?.file_url ? (
              <div className="space-y-2">
                <div className="rounded-2xl overflow-hidden bg-black max-h-[340px] flex items-center justify-center border border-app-line/60">
                  <DeliverableMedia
                    url={previewTask.deliverable.file_url}
                    isVideo={previewTask.deliverable.is_video}
                    title={previewTask.blueprint?.concept_name || "Deliverable"}
                    controls={true}
                    className="w-full max-h-[340px]"
                  />
                </div>
                <div className="flex items-center justify-between text-[11px] text-app-mist px-1">
                  <span>Active Cut Version: <strong className="text-hi font-mono">v{previewTask.deliverable.version}</strong></span>
                  <a
                    href={previewTask.deliverable.file_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-app-accent hover:underline font-bold"
                  >
                    <span>Direct File Stream</span>
                    <ExternalLink className="size-3" />
                  </a>
                </div>
              </div>
            ) : (
              <div className="p-4 rounded-2xl bg-app-base/70 border border-dashed border-app-line flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="size-9 rounded-xl bg-app-accent/15 border border-app-accent/30 flex items-center justify-center text-app-accent shrink-0">
                    <Video className="size-4.5" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-hi">In Production · No Media Cut Uploaded Yet</h4>
                    <p className="text-[11px] text-app-mist">Review the creative specs below and upload your master render when ready.</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    const target = previewTask;
                    setPreviewModalOpen(false);
                    openUploadModal(target);
                  }}
                  className="px-3.5 py-1.5 rounded-xl bg-app-accent hover:bg-blue-700 text-app-on-accent! font-bold text-xs shrink-0 flex items-center gap-1.5 shadow-2xs transition-all cursor-pointer"
                >
                  <Upload className="size-3.5" />
                  <span>Upload Cut & QA</span>
                </button>
              </div>
            )}

            {/* Technical Specifications Grid */}
            <div className="space-y-2">
              <h4 className="text-[11px] font-bold uppercase tracking-wider text-app-mist">Technical Specifications</h4>
              {(() => {
                const typeKey = (previewTask.deliverable_type || "").toLowerCase();
                const spec = FORMAT_SPECS[typeKey] || {
                  aspect: "16:9 or 9:16",
                  res: "1080p HD / 4K UHD",
                  desc: "Standard Deliverable Format",
                  fps: "24 / 30 / 60 fps",
                };
                const dueInfo = getTaskSlaDueText(previewTask);
                return (
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs">
                    <div className="p-2.5 rounded-xl bg-app-base border border-app-line/70">
                      <div className="text-[10px] text-app-mist uppercase font-semibold">Aspect Ratio</div>
                      <div className="font-bold text-hi mt-0.5">{spec.aspect}</div>
                      <div className="text-[9px] text-app-mist mt-0.5 truncate">{spec.res}</div>
                    </div>
                    <div className="p-2.5 rounded-xl bg-app-base border border-app-line/70">
                      <div className="text-[10px] text-app-mist uppercase font-semibold">Target Duration</div>
                      <div className="font-bold text-hi mt-0.5">{previewTask.blueprint?.target_duration || "30s - 60s"}</div>
                      <div className="text-[9px] text-app-mist mt-0.5">{spec.fps}</div>
                    </div>
                    <div className="p-2.5 rounded-xl bg-app-base border border-app-line/70">
                      <div className="text-[10px] text-app-mist uppercase font-semibold">Delivery Standard</div>
                      <div className="font-bold text-hi mt-0.5">ProRes / MP4 H.264</div>
                      <div className="text-[9px] text-app-mist mt-0.5">Stereo 48kHz audio</div>
                    </div>
                    <div className="p-2.5 rounded-xl bg-app-base border border-app-line/70">
                      <div className="text-[10px] text-app-mist uppercase font-semibold">Target SLA Due</div>
                      <div className={`font-bold mt-0.5 ${dueInfo.urgent ? "text-rose-400" : "text-amber-400"}`}>
                        {dueInfo.text}
                      </div>
                      <div className="text-[9px] text-app-mist mt-0.5">
                        {previewTask.due_date ? new Date(previewTask.due_date).toLocaleDateString() : "Active Sprint"}
                      </div>
                    </div>
                  </div>
                );
              })()}
            </div>

            {/* Raw Footage & Drive Assets Link */}
            {(() => {
              const footage = previewTask.blueprint?.raw_footage_url || previewTask.blueprint?.drive_url || previewTask.blueprint?.brief_url;
              return (
                <div className="p-3 rounded-xl bg-app-base border border-app-line flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    <div className="size-8 rounded-lg bg-blue-500/15 border border-blue-500/30 flex items-center justify-center text-blue-400 shrink-0">
                      <FolderGit2 className="size-4" />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-hi">Raw Footage & Asset Folder</div>
                      <div className="text-[10px] text-app-mist truncate max-w-[280px] sm:max-w-md">
                        {footage || "Client shared pod drive repository"}
                      </div>
                    </div>
                  </div>
                  {footage ? (
                    <a
                      href={footage}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-3 py-1.5 rounded-lg bg-blue-500/15 hover:bg-blue-500/25 text-blue-300 hover:text-hi border border-blue-500/30 font-bold text-[11px] inline-flex items-center gap-1.5 transition-all shrink-0"
                    >
                      <span>Open Drive</span>
                      <ExternalLink className="size-3" />
                    </a>
                  ) : (
                    <span className="text-[10px] font-semibold text-app-mist">In Client Pod Drive</span>
                  )}
                </div>
              );
            })()}

            {/* Creative Brief & Hook */}
            <div className="p-3.5 rounded-2xl bg-app-base border border-app-line space-y-2 text-xs">
              <div className="flex items-center justify-between pb-1.5 border-b border-app-line/60">
                <span className="text-[10px] font-bold uppercase tracking-wider text-app-mist">Creative Brief & Direction</span>
                <span className="text-[10px] font-semibold text-app-accent">{previewTask.client_name}</span>
              </div>
              {previewTask.blueprint?.hook && (
                <div>
                  <span className="text-[10px] font-bold text-app-accent uppercase block">Hook / Angle</span>
                  <p className="text-hi font-medium mt-0.5 leading-relaxed">"{previewTask.blueprint.hook}"</p>
                </div>
              )}
              <div>
                <span className="text-[10px] font-bold text-app-mist uppercase block">Creative Overview</span>
                <p className="text-app-ink-2 font-medium mt-0.5 leading-relaxed">
                  {previewTask.blueprint?.brief || previewTask.blueprint?.concept_name || "Deliver high-quality motion cut adhering to client visual brand identity guidelines."}
                </p>
              </div>
              {previewTask.blueprint?.audio_notes && (
                <div>
                  <span className="text-[10px] font-bold text-amber-400 uppercase block">Audio Direction</span>
                  <p className="text-app-ink-2 text-[11px] mt-0.5">{previewTask.blueprint.audio_notes}</p>
                </div>
              )}
            </div>

            {/* Modal Actions */}
            <div className="flex items-center justify-between pt-2 border-t border-app-line text-xs">
              <Link
                to={`/workstation/tasks?taskId=${encodeURIComponent(previewTask.id)}`}
                onClick={() => setPreviewModalOpen(false)}
                className="px-3.5 py-1.5 rounded-xl border border-app-line hover:bg-app-accent hover:border-app-accent hover:text-white! text-app-ink-2 font-bold text-xs inline-flex items-center gap-1.5 shadow-2xs transition-all duration-150 cursor-pointer"
              >
                <Layers className="size-3.5 text-app-mist" />
                <span>Open in Task Board</span>
              </Link>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    const target = previewTask;
                    setPreviewModalOpen(false);
                    openUploadModal(target);
                  }}
                  className="px-4 py-1.5 rounded-xl bg-app-accent text-app-on-accent! font-bold text-xs flex items-center gap-1.5 cursor-pointer shadow-2xs"
                >
                  <Upload className="size-3.5" />
                  <span>{previewTask.deliverable ? "Re-upload Cut" : "Upload & QA"}</span>
                </button>
                <button
                  type="button"
                  onClick={() => setPreviewModalOpen(false)}
                  className="px-3.5 py-1.5 rounded-xl border border-app-line font-bold text-app-ink-2 text-xs cursor-pointer"
                >
                  Close
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
            className="w-full max-w-lg bg-app-surface rounded-3xl p-6 sm:p-7 shadow-2xl border border-app-line space-y-4 animate-scale-up"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-app-line pb-3">
              <div className="flex items-center gap-2.5">
                <div className="size-9 rounded-2xl bg-app-accent/15 text-app-accent flex items-center justify-center font-bold">
                  <Layers className="size-4.5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-hi">GPU Cluster Frame Cache</h3>
                  <p className="text-xs text-app-mist">Live Octane node telemetry & tile verification</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setInspectModalOpen(false)}
                className="size-8 rounded-full bg-app-surface hover:bg-slate-200 text-app-mist flex items-center justify-center cursor-pointer"
              >
                <X className="size-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="p-3 bg-app-base rounded-xl border border-app-line flex justify-between">
                <span className="text-app-mist font-bold">Hardware:</span>
                <span className="font-bold text-hi">2x NVIDIA RTX 4090 24GB</span>
              </div>
              <div className="p-3 bg-app-base rounded-xl border border-app-line flex justify-between">
                <span className="text-app-mist font-bold">Cache Location:</span>
                <span className="font-mono text-hi">/mnt/render-fast/NW-004-MS/frames</span>
              </div>
              <div className="p-3 bg-app-base rounded-xl border border-app-line flex justify-between">
                <span className="text-app-mist font-bold">Pass Integrity:</span>
                <span className="font-bold text-emerald-600">3,840 / 3,840 Validated (0 dropouts)</span>
              </div>
            </div>

            <div className="flex items-center justify-end pt-2 border-t border-app-line">
              <button
                type="button"
                onClick={() => setInspectModalOpen(false)}
                className="px-5 py-2 rounded-xl bg-app-accent hover:bg-blue-700 text-app-on-accent! font-bold cursor-pointer"
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
            className="w-full max-w-md bg-app-surface rounded-3xl p-6 sm:p-7 shadow-2xl border border-app-line space-y-4 animate-scale-up text-center"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="size-12 rounded-2xl bg-app-accent/15 text-app-accent flex items-center justify-center mx-auto font-black">
              <Send className="size-6" />
            </div>
            <div>
              <h3 className="text-base font-black text-hi">Handoff Cut to Lead {leadName}?</h3>
              <p className="text-xs text-app-mist mt-1 leading-relaxed">
                This will trigger a synchronous QA review notification for {leadName} on the {podName} review queue.
              </p>
            </div>

            <div className="flex items-center justify-center gap-2 pt-2 border-t border-app-line">
              <button
                type="button"
                onClick={() => setHandoffConfirmOpen(false)}
                className="px-4 py-2 rounded-xl border border-app-line font-bold text-xs text-app-ink-2 hover:bg-app-base cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmHandoff}
                className="px-5 py-2 rounded-xl bg-app-accent hover:bg-blue-700 text-app-on-accent! font-bold text-xs shadow-md shadow-blue-500/20 cursor-pointer"
              >
                Confirm & Handoff
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 5: STANDUP MEETING JOIN (GOOGLE MEET / ZOOM) */}
      {zoomModalOpen && (
        <div
          className="fixed inset-0 w-screen h-screen z-[99999] bg-slate-950/70 backdrop-blur-md flex items-center justify-center p-4 animate-fade-in"
          onClick={() => {
            setZoomModalOpen(false);
            setIsEditingMeeting(false);
          }}
        >
          <div
            className="w-full max-w-md bg-app-surface rounded-3xl p-6 sm:p-7 shadow-2xl border border-app-line space-y-4 animate-scale-up text-center"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="size-12 rounded-2xl bg-blue-500/15 text-app-accent border border-blue-500/30 flex items-center justify-center mx-auto font-black">
              <Video className="size-6" />
            </div>

            <div>
              <h3 className="text-base font-black text-hi">{podName} Daily Standup Session</h3>
              <p className="text-xs text-app-mist mt-1 leading-relaxed">
                Lead: {leadName} • Topic: Sprint Velocity & Daily Production Sync
              </p>
            </div>

            {/* Platform Selector Tabs */}
            <div className="flex items-center justify-center p-1 rounded-xl bg-app-base border border-app-line">
              <button
                type="button"
                onClick={() => setMeetingPlatform("meet")}
                className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                  meetingPlatform === "meet"
                    ? "bg-emerald-600 text-app-on-accent! shadow-sm"
                    : "text-app-mist"
                }`}
              >
                <Video className="size-3.5" />
                <span>Google Meet (Redirect)</span>
              </button>
              <button
                type="button"
                onClick={() => setMeetingPlatform("zoom")}
                className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                  meetingPlatform === "zoom"
                    ? "bg-blue-600 text-app-on-accent! shadow-sm"
                    : "text-app-mist"
                }`}
              >
                <ExternalLink className="size-3.5" />
                <span>Zoom (Redirect)</span>
              </button>
            </div>

            {/* Content for Google Meet */}
            {meetingPlatform === "meet" && !isEditingMeeting && (
              <div className="space-y-3">
                <div className="p-3 bg-app-base rounded-2xl border border-app-line text-left">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-app-mist mb-1">
                    Google Meet Direct Redirect
                  </div>
                  <a
                    href={customMeetUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs font-mono text-app-accent hover:underline flex items-center justify-between transition-colors break-all"
                  >
                    <span className="truncate">{customMeetUrl}</span>
                    <ExternalLink className="size-3.5 shrink-0 ml-2 text-app-mist" />
                  </a>
                  <p className="text-[11px] text-app-mist mt-2 leading-relaxed">
                    Redirects directly to Google Meet (meet.google.com) to join or start your pod standup session.
                  </p>
                </div>

                {customMeetCode ? (
                  <div className="flex items-center justify-between p-3 bg-app-base rounded-2xl border border-app-line">
                    <div className="text-left">
                      <div className="text-[10px] font-bold uppercase tracking-wider text-app-mist">Meet Code</div>
                      <div className="text-sm font-mono font-bold text-hi mt-0.5">{customMeetCode}</div>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleCopyMeetCode(customMeetCode)}
                      className="px-3 py-1.5 rounded-xl bg-app-surface hover:bg-app-line border border-app-line text-xs font-semibold text-hi flex items-center gap-1.5 transition-colors cursor-pointer"
                    >
                      {copiedCode ? <Check className="size-3.5 text-emerald-400" /> : <Copy className="size-3.5 text-app-accent" />}
                      <span>{copiedCode ? "Copied" : "Copy Code"}</span>
                    </button>
                  </div>
                ) : null}
              </div>
            )}

            {/* Content for Zoom */}
            {meetingPlatform === "zoom" && !isEditingMeeting && (
              <div className="space-y-3">
                <div className="p-3 bg-app-base rounded-2xl border border-app-line text-left">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-app-mist mb-1">Zoom Direct Redirect</div>
                  <a
                    href={customZoomUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs font-mono text-app-accent hover:underline flex items-center justify-between transition-colors break-all"
                  >
                    <span className="truncate">{customZoomUrl}</span>
                    <ExternalLink className="size-3.5 shrink-0 ml-2 text-app-mist" />
                  </a>
                  <p className="text-[11px] text-app-mist mt-2 leading-relaxed">
                    Redirects directly to Zoom's official join portal rather than an expired or broken private link.
                  </p>
                </div>
              </div>
            )}

            {/* Edit / Customize Section */}
            {isEditingMeeting && (
              <div className="p-3.5 bg-app-base rounded-2xl border border-app-line text-left space-y-3">
                <div className="text-xs font-bold text-hi flex items-center justify-between">
                  <span>Custom Meeting Settings</span>
                  <button
                    type="button"
                    onClick={handleResetMeetingConfig}
                    className="text-[10px] text-rose-400 hover:underline cursor-pointer"
                  >
                    Reset Defaults
                  </button>
                </div>

                <div>
                  <label className="text-[10px] text-app-mist block mb-1">Google Meet Code</label>
                  <input
                    type="text"
                    value={customMeetCode}
                    onChange={(e) => {
                      const val = e.target.value.trim();
                      setCustomMeetCode(val);
                      if (val) setCustomMeetUrl(`https://meet.google.com/${val}`);
                    }}
                    placeholder="e.g. creo-standup-sync"
                    className="w-full px-3 py-1.5 rounded-xl bg-app-surface border border-app-line text-xs text-hi focus:outline-none focus:border-blue-500 font-mono"
                  />
                </div>

                <div>
                  <label className="text-[10px] text-app-mist block mb-1">Google Meet URL</label>
                  <input
                    type="text"
                    value={customMeetUrl}
                    onChange={(e) => {
                      const val = e.target.value.trim();
                      setCustomMeetUrl(val);
                    }}
                    placeholder="https://meet.google.com/..."
                    className="w-full px-3 py-1.5 rounded-xl bg-app-surface border border-app-line text-xs text-hi focus:outline-none focus:border-blue-500 font-mono"
                  />
                </div>

                <div>
                  <label className="text-[10px] text-app-mist block mb-1">Zoom Redirect URL</label>
                  <input
                    type="text"
                    value={customZoomUrl}
                    onChange={(e) => setCustomZoomUrl(e.target.value.trim())}
                    placeholder="https://zoom.us/join"
                    className="w-full px-3 py-1.5 rounded-xl bg-app-surface border border-app-line text-xs text-hi focus:outline-none focus:border-blue-500 font-mono"
                  />
                </div>

                <div className="flex justify-end gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => handleSaveMeetingConfig(customMeetCode, customMeetUrl, customZoomUrl)}
                    className="px-3 py-1 rounded-xl bg-blue-600 hover:bg-blue-700 text-app-on-accent! font-bold text-xs cursor-pointer"
                  >
                    Save Changes
                  </button>
                </div>
              </div>
            )}

            {/* Configure toggle */}
            <div className="flex items-center justify-between text-[11px] text-app-mist pt-1">
              <button
                type="button"
                onClick={() => setIsEditingMeeting(!isEditingMeeting)}
                className="hover:text-app-accent transition-colors flex items-center gap-1 cursor-pointer"
              >
                <Settings className="size-3" />
                <span>{isEditingMeeting ? "Close Settings" : "Configure Meeting Link / Code"}</span>
              </button>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center justify-center gap-2 pt-2 border-t border-app-line">
              <button
                type="button"
                onClick={() => {
                  setZoomModalOpen(false);
                  setIsEditingMeeting(false);
                }}
                className="px-4 py-2 rounded-xl border border-app-line font-bold text-xs text-app-ink-2 hover:bg-app-base cursor-pointer transition-colors"
              >
                Dismiss
              </button>

              {meetingPlatform === "meet" ? (
                <button
                  type="button"
                  onClick={() => {
                    window.open(customMeetUrl, "_blank", "noopener,noreferrer");
                    setZoomModalOpen(false);
                    showToast(`Redirecting to Google Meet...`, "info");
                  }}
                  className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-app-on-accent! font-bold text-xs shadow-md shadow-emerald-600/20 cursor-pointer transition-colors flex items-center gap-1.5"
                >
                  <Video className="size-3.5" />
                  <span>Redirect to Google Meet</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    window.open(customZoomUrl, "_blank", "noopener,noreferrer");
                    setZoomModalOpen(false);
                    showToast(`Redirecting to Zoom join portal...`, "info");
                  }}
                  className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-app-on-accent! font-bold text-xs shadow-md shadow-blue-600/20 cursor-pointer transition-colors flex items-center gap-1.5"
                >
                  <ExternalLink className="size-3.5" />
                  <span>Redirect to Zoom</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
