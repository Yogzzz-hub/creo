import { CreoInlineLoader } from "../../components/ui/CreoLoader";
import { PublishingControl } from "../../components/ops/PublishingPanel";
import { CustomSelect } from "../../components/ui/CustomSelect";
import { NativeSelect } from "../../ui/NativeSelect";
import { useEffect, useMemo, useState } from "react";
import { motion } from "motion/react";
import {
  Search,
  CheckCircle2,
  AlertTriangle,
  X,
  Plus,
  Sparkles,
  ShieldCheck,
  Eye,
  Check,
  ArrowRight,
  Upload,
  Loader2,
  Clock,
  Volume2,
  ExternalLink,
  FolderGit2,
  Music,
} from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useSearchParams, useLocation } from "react-router";
import { AdminTopHeader } from "../../components/admin/AdminTopHeader";
import { DeliverableMedia } from "../../components/ops/DeliverableMedia";
import { VoicePlayer } from "../../components/portal/VoicePlayer";
import { useAuth } from "../../lib/auth-context";
import {
  UPLOAD_ACCEPT,
  createProductionTask,
  startProductionTask,
  uploadMimeType,
  uploadTaskDeliverable,
  validateUploadFile,
} from "../../lib/deliverables-api";
import { fetchPodDashboard, type PodDashboardData, type PodTask } from "../../lib/ops-api";
import { getEligibleDeliverableTypes, shouldShowTaskForUser } from "../../lib/creative-roles";
import { MemberMobileTaskBoard } from "../../components/workstation/MemberMobileTaskBoard";

type Column = "assigned" | "production" | "qa" | "review";

const FORMAT_LABELS: Record<string, string> = {
  reel: "Reel",
  static_post: "Poster",
  carousel: "Carousel",
  story: "Story",
  shoot_day: "Shoot day",
};

const FORMAT_SPECS: Record<string, string> = {
  reel: "9:16 vertical video · 1080×1920 · MP4/MOV",
  story: "9:16 vertical · 1080×1920 · MP4/MOV or PNG/JPG",
  static_post: "4:5 portrait or 1:1 · 1080×1350 · PNG/JPG",
  carousel: "4:5 portrait · 1080×1350 · PNG/JPG (cover slide)",
};

const RUBRIC = [
  { key: "brand", label: "Brand palette, fonts & logo match the Brand DNA" },
  { key: "spec", label: "Correct aspect ratio and resolution for the format" },
  { key: "audio", label: "Audio level clean, no clipping (videos)" },
  { key: "copy", label: "On-screen text proofread, safe zones respected" },
  { key: "guardrails", label: "No brand do-not rules broken" },
] as const;

const MB = 1024 * 1024;

function formatLabel(type: string): string {
  return FORMAT_LABELS[type] || type.replace(/_/g, " ");
}

function taskTitle(task: PodTask): string {
  return task.blueprint?.concept_name || task.blueprint?.title || `${formatLabel(task.deliverable_type)} for ${task.client_name}`;
}

function columnOf(bucket: keyof PodDashboardData["tasks"]): Column {
  if (bucket === "backlog") return "assigned";
  if (bucket === "in_production") return "production";
  if (bucket === "internal_qa") return "qa";
  return "review";
}

function dueText(task: PodTask): { text: string; urgent: boolean } {
  if (task.sla_due_at) {
    const hours = (new Date(task.sla_due_at).getTime() - Date.now()) / 3_600_000;
    if (hours < 0) return { text: `Overdue by ${Math.ceil(-hours)}h`, urgent: true };
    if (hours < 48) return { text: `Due in ${Math.max(1, Math.round(hours))}h`, urgent: hours < 24 };
    return { text: `Due ${new Date(task.sla_due_at).toLocaleDateString(undefined, { day: "numeric", month: "short" })}`, urgent: false };
  }
  if (task.due_date) {
    return { text: `Due ${new Date(task.due_date).toLocaleDateString(undefined, { day: "numeric", month: "short" })}`, urgent: false };
  }
  return { text: "No due date", urgent: false };
}

/** Feedback the creative must act on: lead QA notes or the client's change request. */
function feedbackFor(task: PodTask): {
  source: "Lead QA" | "Client";
  text: string;
  voice_note_url?: string | null;
  voice_note_duration?: number | null;
} | null {
  const d = task.deliverable;
  if (!d?.rejection_comment && !d?.voice_note_url) return null;
  if (d.status === "qa_rejected") {
    return {
      source: "Lead QA",
      text: d.rejection_comment || "[QA Notes Attached]",
      voice_note_url: d.voice_note_url,
      voice_note_duration: d.voice_note_duration,
    };
  }
  if (d.status === "revision_requested") {
    return {
      source: "Client",
      text: d.rejection_comment || "[Voice Note Revision Attached]",
      voice_note_url: d.voice_note_url,
      voice_note_duration: d.voice_note_duration,
    };
  }
  return null;
}

function isHighPriority(task: PodTask): boolean {
  return task.is_near_sla || (task.hours_remaining ?? 1) < 0 || !!task.is_revision;
}

function getTaskDueTimestamp(task: PodTask): number {
  const d = task.due_date || task.sla_due_at;
  if (!d) return Number.MAX_SAFE_INTEGER;
  const time = new Date(d).getTime();
  return isNaN(time) ? Number.MAX_SAFE_INTEGER : time;
}

function compareTaskDueDates(a: PodTask, b: PodTask): number {
  const timeA = getTaskDueTimestamp(a);
  const timeB = getTaskDueTimestamp(b);
  if (timeA !== timeB) return timeA - timeB;
  return taskTitle(a).localeCompare(taskTitle(b));
}

export function MemberTaskBoardPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const isAdmin = user?.role === "admin" || user?.role === "super_admin";

  const { data, isLoading, isError, error, refetch } = useQuery<PodDashboardData>({
    queryKey: ["pod_dashboard", user?.id, undefined],
    queryFn: () => fetchPodDashboard(),
    staleTime: 30_000,
  });
  const clients = data?.clients || [];
  const leadName = data?.pod?.lead?.name || "your Pod Lead";

  // Creatives see their own work and unassigned role-matched tasks; leads/admins see the full pod.
  const tasks = useMemo(() => {
    if (!data?.tasks) return [] as { task: PodTask; column: Column }[];
    const buckets: (keyof PodDashboardData["tasks"])[] = [
      "backlog", "in_production", "internal_qa", "client_review", "ready_to_publish", "completed",
    ];
    return buckets.flatMap((bucket) =>
      (data.tasks[bucket] || [])
        .filter((t) => shouldShowTaskForUser(t, user))
        .map((task) => ({ task, column: columnOf(bucket) })),
    );
  }, [data, user]);

  const [searchParams] = useSearchParams();
  const location = useLocation();
  const targetedTaskId = searchParams.get("taskId") || (location.state as any)?.selectedTaskId;

  // Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedClient, setSelectedClient] = useState<string>("all");
  const [urgencyFilter, setUrgencyFilter] = useState<string>("All");
  const [mobileKanbanTab, setMobileKanbanTab] = useState<Column>("assigned");

  useEffect(() => {
    if (targetedTaskId && tasks.length > 0) {
      const match = tasks.find((t) => t.task.id === targetedTaskId);
      if (match) {
        setMobileKanbanTab(match.column);
        const timer = setTimeout(() => {
          const el = document.getElementById(`task-card-${targetedTaskId}`);
          el?.scrollIntoView({ behavior: "smooth", block: "center" });
        }, 200);
        return () => clearTimeout(timer);
      }
    }
  }, [targetedTaskId, tasks]);

  const [toastMessage, setToastMessage] = useState<{ text: string; type: "success" | "error" } | null>(null);
  const showToast = (text: string, type: "success" | "error" = "success") => {
    setToastMessage({ text, type });
    setTimeout(() => setToastMessage(null), 4500);
  };
  const refreshBoard = () => queryClient.invalidateQueries({ queryKey: ["pod_dashboard"] });

  const startMutation = useMutation({
    mutationFn: (taskId: string) => startProductionTask(taskId),
    onSuccess: () => {
      refreshBoard();
      showToast("Task moved to In Production.");
    },
    onError: (err: Error) => showToast(err.message || "Could not start the task.", "error"),
  });

  // ── Upload & submit modal ──
  const [uploadTask, setUploadTask] = useState<PodTask | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [notes, setNotes] = useState("");
  const [rubric, setRubric] = useState<Record<string, boolean>>({});
  const [progress, setProgress] = useState<number | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);

  useEffect(() => {
    if (!file) {
      setPreviewUrl(null);
      return;
    }
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  const openUpload = (task: PodTask) => {
    setUploadTask(task);
    setFile(null);
    setFileError(null);
    setNotes("");
    setRubric({});
    setProgress(null);
    setSubmitError(null);
  };

  const chooseFile = (chosen: File | undefined) => {
    setSubmitError(null);
    if (!chosen) return;
    const problem = validateUploadFile(chosen);
    setFileError(problem);
    setFile(problem ? null : chosen);
  };

  const uploadMutation = useMutation({
    mutationFn: async () => {
      if (!uploadTask || !file) throw new Error("Choose a file to upload.");
      const checked = RUBRIC.filter((r) => rubric[r.key]).map((r) => r.label);
      const summary = `Self-check ${checked.length}/${RUBRIC.length}${checked.length < RUBRIC.length ? ` (open: ${RUBRIC.filter((r) => !rubric[r.key]).map((r) => r.key).join(", ")})` : ""}`;
      const fullNotes = [notes.trim(), summary].filter(Boolean).join("\n");
      return uploadTaskDeliverable(uploadTask.id, file, fullNotes, setProgress);
    },
    onSuccess: (deliverable) => {
      refreshBoard();
      setUploadTask(null);
      showToast(`Uploaded v${deliverable.version} and sent to ${leadName} for QA.`);
    },
    onError: (err: Error) => {
      setProgress(null);
      setSubmitError(err.message || "Upload failed. Please try again.");
    },
  });

  // ── New task modal ──
  const [createOpen, setCreateOpen] = useState(false);
  const [newClientId, setNewClientId] = useState("");
  const eligibleFormats = getEligibleDeliverableTypes(user?.role);
  const availableFormats = eligibleFormats && eligibleFormats.length > 0
    ? eligibleFormats
    : (["reel", "static_post", "carousel", "story", "shoot_day"] as const);
  const defaultFormat: string = availableFormats[0] || "reel";
  const [newType, setNewType] = useState<string>(() => defaultFormat);
  const [newTitle, setNewTitle] = useState("");
  const [newBrief, setNewBrief] = useState("");
  const [newDue, setNewDue] = useState("");
  const [newRawFootageUrl, setNewRawFootageUrl] = useState("");
  const [newTargetDuration, setNewTargetDuration] = useState("30-60s");
  const [newAudioNotes, setNewAudioNotes] = useState("");
  const [newHook, setNewHook] = useState("");
  const [newReferenceUrl, setNewReferenceUrl] = useState("");
  const [startNow, setStartNow] = useState(false);

  useEffect(() => {
    if (availableFormats.length > 0 && !availableFormats.includes(newType)) {
      setNewType(availableFormats[0] || "reel");
    }
  }, [availableFormats, newType]);

  const createMutation = useMutation({
    mutationFn: async () => {
      const clientId = newClientId || clients[0]?.id;
      if (!clientId) throw new Error("No client is assigned to your pod yet.");
      const task = await createProductionTask({
        client_id: clientId,
        deliverable_type: newType,
        title: newTitle.trim(),
        brief: newBrief.trim() || undefined,
        due_date: newDue || null,
        raw_footage_url: newRawFootageUrl.trim() || undefined,
        target_duration: newTargetDuration.trim() || undefined,
        audio_notes: newAudioNotes.trim() || undefined,
        hook: newHook.trim() || undefined,
        reference_url: newReferenceUrl.trim() || undefined,
      });
      if (startNow) await startProductionTask(task.id);
      return task;
    },
    onSuccess: () => {
      refreshBoard();
      setCreateOpen(false);
      setNewTitle("");
      setNewBrief("");
      setNewDue("");
      setNewRawFootageUrl("");
      setNewTargetDuration("30-60s");
      setNewAudioNotes("");
      setNewHook("");
      setNewReferenceUrl("");
      showToast("Task added to the board.");
    },
    onError: (err: Error) => showToast(err.message || "Could not create the task.", "error"),
  });

  // ── Available clients for filtering ──
  const availableClients = useMemo(() => {
    const list: { id: string; name: string }[] = [];
    const seenIds = new Set<string>();
    const seenNames = new Set<string>();

    clients.forEach((c) => {
      if (c.id && !seenIds.has(c.id)) {
        seenIds.add(c.id);
        seenNames.add(c.name);
        list.push({ id: c.id, name: c.name });
      }
    });

    tasks.forEach(({ task }) => {
      const cId = task.client_id || task.client_name;
      const cName = task.client_name;
      if (cName && !seenNames.has(cName)) {
        seenNames.add(cName);
        seenIds.add(cId);
        list.push({ id: cId, name: cName });
      }
    });

    return list;
  }, [clients, tasks]);

  // ── Derived lists ──
  const filtered = useMemo(() => {
    const q = searchQuery.toLowerCase();
    const result = tasks.filter(({ task }) => {
      const matchesSearch =
        !q ||
        taskTitle(task).toLowerCase().includes(q) ||
        task.client_name.toLowerCase().includes(q) ||
        formatLabel(task.deliverable_type).toLowerCase().includes(q);
      const matchesClient =
        selectedClient === "all" ||
        selectedClient === "All Clients" ||
        task.client_id === selectedClient ||
        task.client_name === selectedClient;
      const matchesUrgency =
        urgencyFilter === "All" || (urgencyFilter === "High" ? isHighPriority(task) : !isHighPriority(task));
      return matchesSearch && matchesClient && matchesUrgency;
    });
    return result.sort((a, b) => compareTaskDueDates(a.task, b.task));
  }, [tasks, searchQuery, selectedClient, urgencyFilter]);

  const byColumn = (column: Column) =>
    filtered
      .filter((t) => t.column === column)
      .map((t) => t.task)
      .sort(compareTaskDueDates);

  const assigned = byColumn("assigned");
  const production = byColumn("production");
  const qa = byColumn("qa");
  const review = byColumn("review");

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

  const currentMobileTasks =
    mobileKanbanTab === "assigned"
      ? assigned
      : mobileKanbanTab === "production"
      ? production
      : mobileKanbanTab === "qa"
      ? qa
      : review;

  const columnClass = (_column: Column) =>
    "h-full flex flex-col min-h-0 bg-app-surface/60 rounded-2xl p-3 border border-app-line/70 space-y-3";

  const clientBadge = (task: PodTask) => (
    <span className="text-app-accent">{task.client_name.toUpperCase()}</span>
  );

  const emptyColumn = (text: string) => (
    <div className="text-center py-8 px-4 text-xs text-app-mist font-medium bg-app-surface/50 rounded-xl border border-dashed border-app-line">
      {text}
    </div>
  );

  const rubricPassed = RUBRIC.filter((r) => rubric[r.key]).length;
  const modalFeedback = uploadTask ? feedbackFor(uploadTask) : null;
  const pickedMime = file ? uploadMimeType(file) : null;

  return (
    <div data-surface="ops" className="flex-1 flex flex-col min-h-[calc(100vh-theme(spacing.16))] md:h-[calc(100vh-4rem)] bg-app-base text-hi font-sans md:overflow-hidden">
      <AdminTopHeader activeTab="My Tasks" />

      {/* ── MOBILE TASK BOARD VIEW (< md) ── */}
      <MemberMobileTaskBoard
        user={user}
        userInitials={userInitials}
        leadName={leadName}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        selectedClient={selectedClient}
        setSelectedClient={setSelectedClient}
        urgencyFilter={urgencyFilter}
        setUrgencyFilter={setUrgencyFilter}
        mobileKanbanTab={mobileKanbanTab}
        setMobileKanbanTab={setMobileKanbanTab}
        tasks={tasks}
        availableClients={availableClients}
        assigned={assigned}
        production={production}
        qa={qa}
        review={review}
        currentMobileTasks={currentMobileTasks}
        targetedTaskId={targetedTaskId}
        toastMessage={toastMessage}
        setToastMessage={setToastMessage}
        showToast={showToast}
        startMutation={startMutation}
        openUpload={openUpload}
        setCreateOpen={setCreateOpen}
        setNewClientId={setNewClientId}
        isAdmin={isAdmin}
        clients={clients}
        formatLabel={formatLabel}
        taskTitle={taskTitle}
        dueText={dueText}
        feedbackFor={feedbackFor}
      />

      {/* ── DESKTOP TASK BOARD VIEW (>= md) ── */}
      <motion.main
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35 }}
        className="hidden md:flex flex-1 flex-col min-h-[calc(100vh-theme(spacing.16))] h-[calc(100vh-4rem)] w-full mx-auto px-3 sm:px-5 lg:px-6 pt-3.5 pb-4 space-y-3.5 min-h-0 overflow-hidden"
      >
        {toastMessage && (
          <div
            role="status"
            className={`p-3 rounded-xl border text-xs font-bold flex items-center justify-between shadow-2xs ${
              toastMessage.type === "error"
                ? "bg-rose-500/15 border-rose-500/30 text-rose-300"
                : "bg-emerald-500/15 border-emerald-500/30 text-emerald-400"
            }`}
          >
            <div className="flex items-center gap-2">
              {toastMessage.type === "error" ? <AlertTriangle className="size-3.5 shrink-0" /> : <CheckCircle2 className="size-3.5 shrink-0" />}
              <span>{toastMessage.text}</span>
            </div>
            <button onClick={() => setToastMessage(null)} className="text-current opacity-70 hover:opacity-100" aria-label="Dismiss">
              &times;
            </button>
          </div>
        )}

        {isError && (
          <div role="alert" className="p-3 rounded-xl border border-rose-500/30 bg-rose-500/10 text-xs font-bold text-rose-300">
            {(error as Error)?.message || "Could not load your tasks."}{" "}
            <button className="underline" onClick={() => refetch()}>Retry</button>
          </div>
        )}

        {isAdmin && (
          <div className="p-3 rounded-xl border border-app-line bg-app-surface text-xs text-app-mist">
            Admins review and assign work from the <Link to="/admin/deliverables" className="text-hi underline">Deliverables</Link> and pod dashboards.
          </div>
        )}

        {/* Filter & action bar */}
        <div className="shrink-0 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 bg-app-surface sm:bg-transparent p-2.5 sm:p-0 rounded-2xl sm:rounded-none border sm:border-0 border-app-line w-full">
          <div className="relative flex-1 max-w-md w-full">
            <Search className="size-3.5 text-app-mist absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Filter tasks by client, format or title..."
              className="w-full pl-8 pr-3 py-2 rounded-xl bg-app-base sm:bg-app-surface border border-app-line/80 text-xs font-medium placeholder:text-app-mist focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-2.5 w-full sm:w-auto">
            {/* Filters Row */}
            <div className="grid grid-cols-2 sm:flex sm:items-center gap-2 sm:gap-2.5 w-full sm:w-auto">
              {/* Client Filter Dropdown */}
              <CustomSelect
                size="sm"
                value={selectedClient}
                onChange={setSelectedClient}
                ariaLabel="Filter by client"
                className="w-full sm:w-auto"
                options={[
                  { value: "all", label: `All Clients (${tasks.length})` },
                  ...availableClients.map((client) => {
                    const clientTaskCount = tasks.filter(
                      (t) => t.task.client_id === client.id || t.task.client_name === client.name,
                    ).length;
                    return {
                      value: client.id,
                      label: `${client.name} (${clientTaskCount})`,
                    };
                  }),
                ]}
              />

              {/* Urgency Filter Dropdown */}
              <CustomSelect
                size="sm"
                value={urgencyFilter}
                onChange={setUrgencyFilter}
                ariaLabel="Filter by urgency"
                className="w-full sm:w-auto"
                options={[
                  { value: "All", label: "All Urgency" },
                  { value: "High", label: "Due soon / revisions" },
                  { value: "Normal", label: "Normal" },
                ]}
              />
            </div>

            {/* Actions Row */}
            {!isAdmin && (
              <div className="flex sm:items-center gap-2 sm:gap-2.5 w-full sm:w-auto">
                <button
                  onClick={() => {
                    setNewClientId(clients[0]?.id || "");
                    setCreateOpen(true);
                  }}
                  disabled={clients.length === 0}
                  className="w-full sm:w-auto px-3 py-2 rounded-xl bg-app-accent hover:bg-blue-700 text-app-on-accent! text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer whitespace-nowrap active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed shadow-2xs"
                >
                  <Plus className="size-3.5 shrink-0" />
                  <span className="truncate">Add Task</span>
                </button>
              </div>
            )}
          </div>
        </div>

        {isLoading ? (
          <CreoInlineLoader />
        ) : isError ? (
          <div className="flex flex-col items-center justify-center py-24 gap-3 text-center">
            <div className="size-10 rounded-full bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400">
              <AlertTriangle className="size-5" />
            </div>
            <p className="text-xs text-rose-400 font-medium">{(error as Error)?.message || "Failed to load tasks."}</p>
            <button
              onClick={() => refetch()}
              className="px-3 py-1.5 rounded-lg bg-app-surface hover:bg-app-line border border-app-line text-xs font-bold text-hi transition-colors cursor-pointer"
            >
              Retry
            </button>
          </div>
        ) : (
          <div className="flex-1 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 min-h-0 pb-4">
            {/* 1. Assigned & queued */}
            <div className={columnClass("assigned")}>
              <ColumnHeader dot="bg-slate-400" title="ASSIGNED & QUEUED" count={assigned.length} />
              <div className="flex-1 overflow-y-auto space-y-3 pr-1 custom-scrollbar min-h-0">
                {assigned.map((task) => {
                  const due = dueText(task);
                  return (
                    <div
                      key={task.id}
                      id={`task-card-${task.id}`}
                      className={`bg-app-surface rounded-xl p-3.5 border space-y-3 transition-all ${
                        targetedTaskId === task.id ? "ring-2 ring-app-accent border-app-accent shadow-lg shadow-blue-500/20" : "border-app-line/80"
                      }`}
                    >
                      <div className="flex items-center justify-between text-[10px] font-bold">
                        {clientBadge(task)}
                        <span className="px-1.5 rounded bg-app-accent/15 text-app-accent">{formatLabel(task.deliverable_type)}</span>
                      </div>
                      <h4 className="text-xs font-black text-hi leading-snug">{taskTitle(task)}</h4>
                      {task.blueprint?.brief && <p className="text-[11px] text-app-mist line-clamp-2">{task.blueprint.brief}</p>}
                      {(() => {
                        const footage = task.blueprint?.raw_footage_url || task.blueprint?.drive_url || task.blueprint?.brief_url;
                        const duration = task.blueprint?.target_duration;
                        if (!footage && !duration) return null;
                        return (
                          <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                            {footage && (
                              <a
                                href={footage}
                                target="_blank"
                                rel="noreferrer"
                                onClick={(e) => e.stopPropagation()}
                                className="inline-flex items-center gap-1 text-[10px] text-blue-300 hover:text-hi font-bold bg-blue-500/15 hover:bg-blue-500/25 px-2 py-0.5 rounded border border-blue-500/30 transition-all"
                              >
                                <FolderGit2 className="size-2.5 text-blue-400" />
                                <span>Drive Footage</span>
                                <ExternalLink className="size-2" />
                              </a>
                            )}
                            {duration && (
                              <span className="text-[10px] text-purple-300 font-mono px-1.5 py-0.5 bg-app-base rounded border border-app-line">
                                {duration}
                              </span>
                            )}
                          </div>
                        );
                      })()}
                      <div className="flex items-center justify-between pt-1.5 border-t border-app-line text-[10px]">
                        <span className={due.urgent ? "text-rose-400 font-bold" : "text-app-mist font-medium"}>{due.text}</span>
                        <button
                          onClick={() => startMutation.mutate(task.id)}
                          disabled={startMutation.isPending}
                          className="px-2 py-0.5 rounded-md bg-app-accent/15 hover:bg-app-accent/25 text-app-accent font-bold text-[10px] flex items-center gap-1 transition-colors cursor-pointer disabled:opacity-50"
                        >
                          <span>Start</span>
                          <ArrowRight className="size-2.5" />
                        </button>
                      </div>
                    </div>
                  );
                })}
                {assigned.length === 0 && emptyColumn("No queued tasks")}
              </div>
            </div>

            {/* 2. In production */}
            <div className={columnClass("production")}>
              <ColumnHeader dot="bg-sky-400 animate-pulse text-app-on-accent!" title="IN PRODUCTION" count={production.length} />
              <div className="flex-1 overflow-y-auto space-y-3 pr-1 custom-scrollbar min-h-0">
                {production.map((task) => {
                  const due = dueText(task);
                  const feedback = feedbackFor(task);
                  return (
                    <div
                      key={task.id}
                      id={`task-card-${task.id}`}
                      className={`bg-app-surface rounded-xl p-3.5 border space-y-3 transition-all ${
                        targetedTaskId === task.id
                          ? "ring-2 ring-app-accent border-app-accent shadow-lg shadow-blue-500/20"
                          : feedback
                          ? "border-amber-400/50"
                          : "border-app-line/80"
                      }`}
                    >
                      <div className="flex items-center justify-between text-[10px] font-bold">
                        {clientBadge(task)}
                        <span className={`px-1.5 rounded text-[9px] font-black ${due.urgent ? "bg-rose-500/15 text-rose-400 border border-rose-500/30" : "text-app-mist"}`}>
                          {due.text}
                        </span>
                      </div>
                      <h4 className="text-xs font-black text-hi leading-snug">{taskTitle(task)}</h4>
                      <p className="text-[11px] text-app-mist">{formatLabel(task.deliverable_type)}{task.deliverable ? ` · last upload v${task.deliverable.version}` : ""}</p>
                      {(() => {
                        const footage = task.blueprint?.raw_footage_url || task.blueprint?.drive_url || task.blueprint?.brief_url;
                        const duration = task.blueprint?.target_duration;
                        if (!footage && !duration) return null;
                        return (
                          <div className="flex flex-wrap items-center gap-1.5">
                            {footage && (
                              <a
                                href={footage}
                                target="_blank"
                                rel="noreferrer"
                                onClick={(e) => e.stopPropagation()}
                                className="inline-flex items-center gap-1 text-[10px] text-blue-300 hover:text-hi font-bold bg-blue-500/15 hover:bg-blue-500/25 px-2 py-0.5 rounded border border-blue-500/30 transition-all"
                              >
                                <FolderGit2 className="size-2.5 text-blue-400" />
                                <span>Drive Footage</span>
                                <ExternalLink className="size-2" />
                              </a>
                            )}
                            {duration && (
                              <span className="text-[10px] text-purple-300 font-mono px-1.5 py-0.5 bg-app-base rounded border border-app-line">
                                {duration}
                              </span>
                            )}
                          </div>
                        );
                      })()}
                      {feedback && (
                        <div className="p-2.5 rounded-xl bg-app-base border border-app-warm/50 text-xs space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-app-warm text-[10px] uppercase tracking-wider">{feedback.source} requested changes</span>
                            {feedback.voice_note_url && (
                              <span className="flex items-center gap-1 text-[10px] text-app-accent font-semibold bg-app-accent/10 px-1.5 py-0.5 rounded border border-app-accent/30">
                                <Volume2 className="size-2.5" /> Voice Note
                              </span>
                            )}
                          </div>
                          {feedback.text && (
                            <p className="text-[11px] text-app-ink-2 leading-snug line-clamp-3">"{feedback.text}"</p>
                          )}
                          {feedback.voice_note_url && (
                            <div className="pt-1">
                              <VoicePlayer
                                audioUrl={feedback.voice_note_url}
                                durationSeconds={feedback.voice_note_duration}
                                authorName={`${feedback.source}'s Voice Note`}
                              />
                            </div>
                          )}
                        </div>
                      )}
                      <div className="pt-1.5 border-t border-app-line">
                        <button
                          onClick={() => openUpload(task)}
                          className="w-full py-1.5 rounded-lg bg-gradient-to-r from-blue-600 to-indigo-600 hover:brightness-110 text-app-on-accent! font-bold text-[11px] flex items-center justify-center gap-1 transition-all cursor-pointer active:scale-95"
                        >
                          <Upload className="size-3" />
                          <span>{task.deliverable ? "Upload revision & submit" : "Upload & submit to QA"}</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
                {production.length === 0 && emptyColumn("Nothing in production")}
              </div>
            </div>

            {/* 3. Lead QA */}
            <div className={columnClass("qa")}>
              <ColumnHeader dot="bg-amber-400 text-app-on-warm!" title="SUBMITTED FOR QA" count={qa.length} />
              <div className="flex-1 overflow-y-auto space-y-3 pr-1 custom-scrollbar min-h-0">
                {qa.map((task) => (
                  <div
                    key={task.id}
                    id={`task-card-${task.id}`}
                    className={`bg-app-surface rounded-xl p-3.5 border space-y-3 transition-all ${
                      targetedTaskId === task.id ? "ring-2 ring-app-accent border-app-accent shadow-lg shadow-blue-500/20" : "border-app-line/80"
                    }`}
                  >
                    <div className="flex items-center justify-between text-[10px] font-bold">
                      {clientBadge(task)}
                      <span className="px-1.5 rounded bg-app-accent/15 text-app-accent text-[9px]">With {leadName}</span>
                    </div>
                    <h4 className="text-xs font-black text-hi leading-snug">{taskTitle(task)}</h4>
                    {task.deliverable && (
                      <div className="h-28 rounded-lg overflow-hidden border border-app-line bg-black">
                        <DeliverableMedia
                          url={task.deliverable.file_url}
                          isVideo={task.deliverable.is_video}
                          title={taskTitle(task)}
                          controls={false}
                          className="w-full h-full"
                        />
                      </div>
                    )}
                    <div className="flex items-center justify-between text-[10px] text-app-mist">
                      <span>v{task.deliverable?.version ?? 1} · awaiting lead sign-off</span>
                      {data?.is_lead_view && (
                        <Link to="/lead/deliverables" className="font-bold text-app-accent flex items-center gap-0.5">
                          <Eye className="size-3" /> Review
                        </Link>
                      )}
                    </div>
                  </div>
                ))}
                {qa.length === 0 && emptyColumn("Nothing waiting in QA")}
              </div>
            </div>

            {/* 4. Client review & approved */}
            <div className={columnClass("review")}>
              <ColumnHeader dot="bg-emerald-400 text-app-on-accent!" title="CLIENT REVIEW & APPROVED" count={review.length} />
              <div className="flex-1 overflow-y-auto space-y-3 pr-1 custom-scrollbar min-h-0">
                {review.map((task) => {
                  const approved = task.status === "ready_to_publish" || task.status === "completed";
                  return (
                    <div key={task.id} className="bg-app-surface rounded-xl p-3.5 border border-app-line/80 space-y-3">
                      <div className="flex items-center justify-between text-[10px] font-bold">
                        {clientBadge(task)}
                        {approved ? (
                          <span className="px-1.5 rounded bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 text-[9px] flex items-center gap-0.5">
                            <Check className="size-2.5" /> Client approved
                          </span>
                        ) : (
                          <span className="px-1.5 rounded bg-app-warm/15 text-app-warm text-[9px] flex items-center gap-0.5">
                            <Clock className="size-2.5" /> With client
                          </span>
                        )}
                      </div>
                      <h4 className="text-xs font-black text-hi leading-snug">{taskTitle(task)}</h4>
                      <p className="text-[11px] text-app-mist">
                        {formatLabel(task.deliverable_type)} · v{task.deliverable?.version ?? 1}
                      </p>
                      {task.deliverable?.id && <PublishingControl deliverableId={task.deliverable.id} />}
                    </div>
                  );
                })}
                {review.length === 0 && emptyColumn("Nothing with the client yet")}
              </div>
            </div>
          </div>
        )}
      </motion.main>

      {/* Upload & submit modal */}
      {uploadTask && (
        <div
          className="fixed inset-0 w-screen h-screen z-[99999] bg-slate-950/70 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 overflow-y-auto"
          onClick={() => !uploadMutation.isPending && setUploadTask(null)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="upload-title"
            className="w-full max-w-2xl bg-app-surface rounded-3xl p-5 sm:p-7 shadow-2xl border border-app-line space-y-4 max-h-[92vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between border-b border-app-line pb-3 gap-2">
              <div className="flex items-start gap-3">
                <div className="size-10 rounded-2xl bg-app-accent/15 text-app-accent flex items-center justify-center shrink-0 mt-0.5">
                  <ShieldCheck className="size-5" />
                </div>
                <div>
                  <div className="flex flex-wrap items-center gap-2 mb-1 text-[10px] font-black uppercase">
                    <span className="px-2 py-0.5 rounded-full bg-app-accent/15 text-app-accent">{uploadTask.client_name}</span>
                    <span className="px-2 py-0.5 rounded-full bg-app-base text-app-ink-2">{formatLabel(uploadTask.deliverable_type)}</span>
                  </div>
                  <h3 id="upload-title" className="text-base sm:text-lg font-black text-hi leading-snug">{taskTitle(uploadTask)}</h3>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setUploadTask(null)}
                disabled={uploadMutation.isPending}
                aria-label="Close"
                className="size-8 rounded-full bg-app-base hover:bg-app-line border border-app-line text-app-mist flex items-center justify-center cursor-pointer shrink-0"
              >
                <X className="size-4" />
              </button>
            </div>

            <div className="p-4 rounded-2xl bg-app-base border border-app-line space-y-3 text-xs">
              <div className="flex items-center justify-between gap-2">
                <span className="font-black text-app-accent uppercase tracking-wider flex items-center gap-1.5">
                  <Sparkles className="size-3.5" /> Brief & Content Specs
                </span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-app-surface text-app-accent-soft border border-app-line">
                  {FORMAT_SPECS[uploadTask.deliverable_type] || "Match the planned format"}
                </span>
              </div>

              {/* Raw Footage / Drive link button for Team Member */}
              {(() => {
                const footage =
                  uploadTask.blueprint?.raw_footage_url ||
                  uploadTask.blueprint?.drive_url ||
                  uploadTask.blueprint?.brief_url;
                if (!footage) return null;
                return (
                  <a
                    href={footage}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center justify-between p-3 rounded-xl bg-blue-950/40 border border-blue-500/40 hover:border-blue-400 text-hi transition-all group shadow-sm"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <FolderGit2 className="size-4 text-blue-400 shrink-0" />
                      <div className="min-w-0">
                        <span className="text-xs font-bold text-hi block">Raw Footage / Source Assets (Drive)</span>
                        <p className="text-[10px] text-blue-300/80 truncate">Open Google Drive to download raw video clips & assets</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-app-on-accent! text-xs font-bold shrink-0 transition-all">
                      <span>Open Drive</span>
                      <ExternalLink className="size-3" />
                    </div>
                  </a>
                );
              })()}

              <p className="text-app-ink-2 leading-relaxed">
                {uploadTask.blueprint?.brief || uploadTask.blueprint?.instructions || uploadTask.blueprint?.hook || uploadTask.blueprint?.objective ||
                  "Follow the client's Brand DNA and content plan for this slot."}
              </p>

              {/* Extra specifications (Target Duration, Hook, Audio, Reference) */}
              {(uploadTask.blueprint?.target_duration || uploadTask.blueprint?.audio_notes || uploadTask.blueprint?.hook || uploadTask.blueprint?.reference_url) && (
                <div className="pt-2 border-t border-app-line space-y-1.5 text-[11px]">
                  {uploadTask.blueprint?.hook && (
                    <div className="flex items-start gap-1 text-amber-300">
                      <Sparkles className="size-3 text-amber-400 shrink-0 mt-0.5" />
                      <span><strong className="text-amber-400 font-bold">Hook:</strong> "{uploadTask.blueprint.hook}"</span>
                    </div>
                  )}
                  {uploadTask.blueprint?.target_duration && (
                    <div className="flex items-center gap-1 text-purple-300">
                      <Clock className="size-3 text-purple-400 shrink-0" />
                      <span><strong className="text-purple-400 font-bold">Target Length:</strong> {uploadTask.blueprint.target_duration}</span>
                    </div>
                  )}
                  {uploadTask.blueprint?.audio_notes && (
                    <div className="flex items-center gap-1 text-pink-300">
                      <Music className="size-3 text-pink-400 shrink-0" />
                      <span><strong className="text-pink-400 font-bold">Audio / Music:</strong> {uploadTask.blueprint.audio_notes}</span>
                    </div>
                  )}
                  {uploadTask.blueprint?.reference_url && (
                    <a
                      href={uploadTask.blueprint.reference_url}
                      target="_blank"
                      rel="noreferrer"
                      className="text-blue-400 hover:text-blue-300 hover:underline flex items-center gap-1 font-bold pt-0.5"
                    >
                      <ExternalLink className="size-3" /> Open Reference Inspiration / Video
                    </a>
                  )}
                </div>
              )}
            </div>

            {modalFeedback && (
              <div className="p-3.5 rounded-2xl bg-app-base border border-app-warm/50 space-y-2 text-xs">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-app-warm">{modalFeedback.source} requested changes on v{uploadTask.deliverable?.version}</span>
                  {modalFeedback.voice_note_url && (
                    <span className="flex items-center gap-1 text-[10px] text-app-accent font-semibold bg-app-accent/10 px-2 py-0.5 rounded border border-app-accent/30">
                      <Volume2 className="size-3" /> Voice Note Attached
                    </span>
                  )}
                </div>
                {modalFeedback.text && (
                  <p className="text-app-ink-2 leading-relaxed whitespace-pre-wrap">{modalFeedback.text}</p>
                )}
                {modalFeedback.voice_note_url && (
                  <div className="mt-2">
                    <VoicePlayer
                      audioUrl={modalFeedback.voice_note_url}
                      durationSeconds={modalFeedback.voice_note_duration}
                      authorName={`${modalFeedback.source}'s Revision Instructions`}
                    />
                  </div>
                )}
              </div>
            )}

            {/* File picker */}
            <div className="p-4 rounded-2xl bg-app-base border border-app-line space-y-3 text-xs">
              <div className="flex items-center justify-between">
                <label htmlFor="deliverable-file" className="font-black text-hi flex items-center gap-1.5 uppercase text-[11px] tracking-wider">
                  <Upload className="size-3.5 text-app-accent" /> Final file
                </label>
                <span className="text-[10px] font-bold text-app-mist">Images ≤ 10 MB · Videos ≤ 500 MB</span>
              </div>
              <label
                className="relative block border-2 border-dashed border-app-line hover:border-app-accent bg-app-surface/60 rounded-2xl p-4 text-center transition-all cursor-pointer"
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  e.preventDefault();
                  chooseFile(e.dataTransfer.files?.[0]);
                }}
              >
                <input
                  id="deliverable-file"
                  type="file"
                  accept={UPLOAD_ACCEPT}
                  disabled={uploadMutation.isPending}
                  onChange={(e) => chooseFile(e.target.files?.[0])}
                  className="sr-only"
                />
                {file && previewUrl ? (
                  <div className="space-y-2">
                    <div className="h-48 rounded-xl overflow-hidden bg-black">
                      <DeliverableMedia url={previewUrl} isVideo={!!pickedMime?.startsWith("video/")} title={file.name} className="w-full h-full" />
                    </div>
                    <p className="font-bold text-hi truncate">{file.name} · {(file.size / MB).toFixed(1)} MB</p>
                    <p className="text-[10px] text-app-mist">Click or drop to replace</p>
                  </div>
                ) : (
                  <div className="space-y-1.5 py-2">
                    <div className="size-10 rounded-2xl bg-app-accent/15 text-app-accent flex items-center justify-center mx-auto">
                      <Upload className="size-5" />
                    </div>
                    <div className="font-bold text-hi">Drop the final MP4/MOV or PNG/JPG here, or click to browse</div>
                  </div>
                )}
              </label>
              {fileError && <p role="alert" className="text-rose-300 font-bold">{fileError}</p>}
            </div>

            {/* Self-check */}
            <div className="p-4 rounded-2xl bg-app-base border border-app-line/80 space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="font-black text-xs text-hi uppercase tracking-wider">Self-check before QA</span>
                <span className="text-xs font-bold text-app-accent">{rubricPassed}/{RUBRIC.length}</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                {RUBRIC.map((item) => (
                  <label key={item.key} className="flex items-center gap-2.5 p-2 rounded-xl bg-app-surface border border-app-line/80 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={!!rubric[item.key]}
                      onChange={(e) => setRubric((prev) => ({ ...prev, [item.key]: e.target.checked }))}
                      className="size-4 rounded cursor-pointer"
                    />
                    <span className="font-semibold text-app-ink-2">{item.label}</span>
                  </label>
                ))}
              </div>
            </div>

            <div className="space-y-1.5 text-xs">
              <label htmlFor="specialist-notes" className="block font-bold text-app-ink-2">Notes for {leadName}</label>
              <textarea
                id="specialist-notes"
                rows={2}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder={modalFeedback ? "What did you change in this version?" : "Anything the lead should know before reviewing"}
                className="w-full px-3.5 py-2 rounded-xl border border-app-line bg-app-base text-xs font-medium resize-none focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              />
            </div>

            {progress !== null && (
              <div className="space-y-1" aria-live="polite">
                <div className="flex justify-between text-[10px] font-bold text-app-mist">
                  <span>Uploading…</span>
                  <span>{Math.round(progress * 100)}%</span>
                </div>
                <div className="w-full h-1.5 bg-app-base rounded-full overflow-hidden">
                  <div className="h-full bg-blue-600 rounded-full transition-all text-app-on-accent!" style={{ width: `${Math.round(progress * 100)}%` }} />
                </div>
              </div>
            )}
            {submitError && <p role="alert" className="text-xs font-bold text-rose-300">{submitError}</p>}

            <div className="flex flex-col sm:flex-row items-center justify-end gap-2.5 pt-3 border-t border-app-line text-xs">
              <button
                type="button"
                onClick={() => setUploadTask(null)}
                disabled={uploadMutation.isPending}
                className="w-full sm:w-auto px-4 py-2 rounded-xl border border-app-line font-bold text-app-ink-2 hover:bg-app-base cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => uploadMutation.mutate()}
                disabled={!file || uploadMutation.isPending}
                className="w-full sm:w-auto px-5 py-2 rounded-xl bg-app-accent hover:bg-blue-700 text-app-on-accent! font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {uploadMutation.isPending ? <Loader2 className="size-3.5 animate-spin" /> : <Sparkles className="size-3.5" />}
                <span>{uploadMutation.isPending ? "Uploading…" : "Submit to Pod Lead QA"}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* New task modal */}
      {createOpen && (
        <div
          className="fixed inset-0 w-screen h-screen z-[99999] bg-slate-950/70 backdrop-blur-md flex items-center justify-center p-3.5 sm:p-4 overflow-y-auto"
          onClick={() => setCreateOpen(false)}
        >
          <form
            role="dialog"
            aria-modal="true"
            aria-labelledby="create-title"
            onSubmit={(e) => {
              e.preventDefault();
              if (newTitle.trim()) createMutation.mutate();
            }}
            className="w-full max-w-xl bg-app-surface rounded-3xl p-5 sm:p-7 shadow-2xl border border-app-line space-y-4 max-h-[90vh] overflow-y-auto text-xs"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-app-line pb-3">
              <h3 id="create-title" className="text-base font-black text-hi">Add a production task</h3>
              <button type="button" onClick={() => setCreateOpen(false)} aria-label="Close" className="size-8 rounded-full bg-app-base border border-app-line text-app-mist flex items-center justify-center">
                <X className="size-4" />
              </button>
            </div>
            <div>
              <label htmlFor="task-title" className="block font-bold text-app-ink-2 mb-1">Title <span className="text-rose-500">*</span></label>
              <input
                id="task-title"
                required
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                placeholder="e.g. Diwali offer reel"
                className="w-full px-3.5 py-2.5 rounded-xl border border-app-line bg-app-base font-semibold"
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label htmlFor="task-client" className="block font-bold text-app-ink-2 mb-1">Client</label>
                <NativeSelect id="task-client" value={newClientId} onChange={(e) => setNewClientId(e.target.value)} className="w-full px-3 py-2 rounded-xl border border-app-line font-bold bg-app-base">
                  {clients.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </NativeSelect>
              </div>
              <div>
                <label htmlFor="task-format" className="block font-bold text-app-ink-2 mb-1">Format</label>
                <NativeSelect id="task-format" value={newType} onChange={(e) => setNewType(e.target.value)} className="w-full px-3 py-2 rounded-xl border border-app-line font-bold bg-app-base">
                  {availableFormats.map((fmt: string) => (
                    <option key={fmt} value={fmt}>
                      {formatLabel(fmt)}
                    </option>
                  ))}
                </NativeSelect>
              </div>
              <div>
                <label htmlFor="task-due" className="block font-bold text-app-ink-2 mb-1">Due date</label>
                <input id="task-due" type="date" value={newDue} onChange={(e) => setNewDue(e.target.value)} className="w-full px-3 py-2 rounded-xl border border-app-line bg-app-base font-bold" />
              </div>
            </div>

            {/* Content Specifications (Raw Footage Drive link, Duration, Hook, Audio) */}
            <div className="p-3.5 rounded-2xl bg-app-base border border-app-accent/30 space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-extrabold text-[11px] text-app-accent flex items-center gap-1.5 uppercase tracking-wider">
                  <FolderGit2 className="size-3.5 text-app-accent" /> Raw Footage & Content Specs
                </span>
                <span className="text-[10px] text-emerald-400 font-semibold">Visible to Specialist</span>
              </div>

              <div>
                <label className="block font-bold text-app-ink-2 mb-1">Raw Footage / Google Drive Link</label>
                <input
                  type="url"
                  value={newRawFootageUrl}
                  onChange={(e) => setNewRawFootageUrl(e.target.value)}
                  placeholder="https://drive.google.com/drive/folders/..."
                  className="w-full px-3 py-2 rounded-xl border border-app-line bg-app-surface text-hi text-xs font-mono"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-app-ink-2 mb-1">Target Duration</label>
                  <input
                    type="text"
                    value={newTargetDuration}
                    onChange={(e) => setNewTargetDuration(e.target.value)}
                    placeholder="e.g. 30-60s or 15s"
                    className="w-full px-3 py-2 rounded-xl border border-app-line bg-app-surface text-hi text-xs font-medium"
                  />
                </div>
                <div>
                  <label className="block font-bold text-app-ink-2 mb-1">Hook / Concept</label>
                  <input
                    type="text"
                    value={newHook}
                    onChange={(e) => setNewHook(e.target.value)}
                    placeholder="e.g. Stop doing this 1 thing..."
                    className="w-full px-3 py-2 rounded-xl border border-app-line bg-app-surface text-hi text-xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-app-ink-2 mb-1">Audio / Music Notes</label>
                  <input
                    type="text"
                    value={newAudioNotes}
                    onChange={(e) => setNewAudioNotes(e.target.value)}
                    placeholder="e.g. Trending audio / Client VO in Drive"
                    className="w-full px-3 py-2 rounded-xl border border-app-line bg-app-surface text-hi text-xs"
                  />
                </div>
                <div>
                  <label className="block font-bold text-app-ink-2 mb-1">Reference / Inspiration Link</label>
                  <input
                    type="url"
                    value={newReferenceUrl}
                    onChange={(e) => setNewReferenceUrl(e.target.value)}
                    placeholder="https://instagram.com/reel/..."
                    className="w-full px-3 py-2 rounded-xl border border-app-line bg-app-surface text-hi text-xs"
                  />
                </div>
              </div>
            </div>

            <div>
              <label htmlFor="task-brief" className="block font-bold text-app-ink-2 mb-1">Creative Brief & Instructions</label>
              <textarea id="task-brief" rows={2.5} value={newBrief} onChange={(e) => setNewBrief(e.target.value)} placeholder="Color grading LUT, fonts, cut directions, transitions…" className="w-full px-3 py-2 rounded-xl border border-app-line bg-app-base font-medium resize-none" />
            </div>
            <label className="flex items-center gap-2 font-bold text-app-ink-2">
              <input type="checkbox" checked={startNow} onChange={(e) => setStartNow(e.target.checked)} className="size-4" />
              Start production now
            </label>
            <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-app-line">
              <button type="button" onClick={() => setCreateOpen(false)} className="px-4 py-2 rounded-xl border border-app-line font-bold text-app-ink-2">Cancel</button>
              <button
                type="submit"
                disabled={!newTitle.trim() || createMutation.isPending}
                className="px-5 py-2 rounded-xl bg-app-accent hover:bg-blue-700 text-app-on-accent! font-bold flex items-center gap-1.5 disabled:opacity-50"
              >
                {createMutation.isPending ? <Loader2 className="size-3.5 animate-spin" /> : <Plus className="size-3.5" />}
                Create task
              </button>
            </div>
          </form>
        </div>
      )}

    </div>
  );
}

function ColumnHeader({ dot, title, count }: { dot: string; title: string; count: number }) {
  return (
    <div className="flex items-center justify-between px-1 pt-0.5 pb-1 shrink-0">
      <div className="flex items-center gap-2 min-w-0">
        <span className={`size-2 rounded-full shrink-0 ${dot}`} />
        <h3 className="text-[11px] font-bold tracking-wider uppercase text-slate-200 truncate">
          {title}
        </h3>
      </div>
      <span className="px-2 py-0.5 rounded-full text-[11px] font-bold tracking-wider bg-app-surface text-slate-300 border border-app-line shrink-0">
        {count}
      </span>
    </div>
  );
}
