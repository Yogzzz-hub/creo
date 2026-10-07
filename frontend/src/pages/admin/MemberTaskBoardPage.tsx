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
} from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router";
import { AdminTopHeader } from "../../components/admin/AdminTopHeader";
import { DeliverableMedia } from "../../components/ops/DeliverableMedia";
import { CustomSelect } from "../../components/ui/CustomSelect";
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
function feedbackFor(task: PodTask): { source: "Lead QA" | "Client"; text: string } | null {
  const d = task.deliverable;
  if (!d?.rejection_comment) return null;
  if (d.status === "qa_rejected") return { source: "Lead QA", text: d.rejection_comment };
  if (d.status === "revision_requested") return { source: "Client", text: d.rejection_comment };
  return null;
}

function isHighPriority(task: PodTask): boolean {
  return task.is_near_sla || (task.hours_remaining ?? 1) < 0 || !!task.is_revision;
}

export function MemberTaskBoardPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const isAdmin = user?.role === "admin" || user?.role === "super_admin";
  const isCreative = user?.role === "editor" || user?.role === "designer" || user?.role === "team_member";

  const { data, isLoading, isError, error, refetch } = useQuery<PodDashboardData>({
    queryKey: ["pod_dashboard", user?.id, undefined],
    queryFn: () => fetchPodDashboard(),
    staleTime: 30_000,
    enabled: !!user?.id,
  });
  const clients = data?.clients || [];
  const leadName = data?.pod?.lead?.name || "your Pod Lead";

  // Creatives see their own and unclaimed work; leads see the pod. Admins manage from the admin console.
  const tasks = useMemo(() => {
    if (!data?.tasks || isAdmin) return [] as { task: PodTask; column: Column }[];
    const buckets: (keyof PodDashboardData["tasks"])[] = [
      "backlog", "in_production", "internal_qa", "client_review", "ready_to_publish", "completed",
    ];
    return buckets.flatMap((bucket) =>
      (data.tasks[bucket] || [])
        .filter((t) => !isCreative || !t.assigned_to || t.assigned_to === user?.id)
        .map((task) => ({ task, column: columnOf(bucket) })),
    );
  }, [data, isAdmin, isCreative, user?.id]);

  // Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedClient, setSelectedClient] = useState<string>("All Clients");
  const [urgencyFilter, setUrgencyFilter] = useState<string>("All");
  const [mobileKanbanTab, setMobileKanbanTab] = useState<"all" | Column>("production");

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
  const [newType, setNewType] = useState("reel");
  const [newTitle, setNewTitle] = useState("");
  const [newBrief, setNewBrief] = useState("");
  const [newDue, setNewDue] = useState("");
  const [startNow, setStartNow] = useState(false);

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
      showToast("Task added to the board.");
    },
    onError: (err: Error) => showToast(err.message || "Could not create the task.", "error"),
  });

  // ── Derived lists ──
  const filtered = tasks.filter(({ task }) => {
    const q = searchQuery.toLowerCase();
    const matchesSearch =
      !q ||
      taskTitle(task).toLowerCase().includes(q) ||
      task.client_name.toLowerCase().includes(q) ||
      formatLabel(task.deliverable_type).toLowerCase().includes(q);
    const matchesClient = selectedClient === "All Clients" || task.client_name === selectedClient;
    const matchesUrgency =
      urgencyFilter === "All" || (urgencyFilter === "High" ? isHighPriority(task) : !isHighPriority(task));
    return matchesSearch && matchesClient && matchesUrgency;
  });
  const byColumn = (column: Column) => filtered.filter((t) => t.column === column).map((t) => t.task);
  const assigned = byColumn("assigned");
  const production = byColumn("production");
  const qa = byColumn("qa");
  const review = byColumn("review");

  const columnClass = (column: Column) =>
    `${mobileKanbanTab === "all" || mobileKanbanTab === column ? "flex" : "hidden md:flex"} flex-col h-full bg-[#161F2D]/60 rounded-2xl p-3 border border-[#2A3446]/70 space-y-2.5 min-h-0`;

  const clientBadge = (task: PodTask) => (
    <span className="text-[#7FA0D6]">{task.client_name.toUpperCase()}</span>
  );

  const emptyColumn = (text: string) => (
    <div className="text-center py-4 text-xs text-[#97A0B3] font-medium bg-[#161F2D]/50 rounded-xl border border-dashed border-[#2A3446]">
      {text}
    </div>
  );

  const rubricPassed = RUBRIC.filter((r) => rubric[r.key]).length;
  const modalFeedback = uploadTask ? feedbackFor(uploadTask) : null;
  const pickedMime = file ? uploadMimeType(file) : null;

  return (
    <div data-surface="ops" className="min-h-screen bg-[#0B111C] text-white font-sans flex flex-col">
      <AdminTopHeader activeTab="My Tasks" />

      <motion.main
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35 }}
        className="flex-1 max-w-[1440px] w-full mx-auto px-3 sm:px-5 lg:px-6 py-3.5 pb-20 sm:pb-6 space-y-3.5"
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
          <div className="p-3 rounded-xl border border-[#2A3446] bg-[#161F2D] text-xs text-[#97A0B3]">
            Admins review and assign work from the <Link to="/admin/deliverables" className="text-white underline">Deliverables</Link> and pod dashboards.
          </div>
        )}

        {/* Filter & action bar */}
        <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-2.5 bg-[#161F2D] sm:bg-transparent p-2.5 sm:p-0 rounded-xl sm:rounded-none border sm:border-0 border-[#2A3446]">
          <div className="relative w-full xl:max-w-xl">
            <Search className="size-3.5 text-[#97A0B3] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Filter tasks by client, format or title..."
              className="w-full pl-8 pr-3 py-1.5 rounded-xl bg-[#161F2D] border border-[#2A3446]/80 text-xs font-medium placeholder:text-[#97A0B3] focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center gap-2">
            <div className="flex items-center gap-1 bg-[#161F2D] p-0.5 rounded-xl border border-[#2A3446]/80 text-xs font-bold overflow-x-auto no-scrollbar py-0.5">
              {[
                { label: "All Clients", count: tasks.length },
                ...clients.map((c) => ({ label: c.name, count: tasks.filter((t) => t.task.client_name === c.name).length })),
              ].map((c) => (
                <button
                  key={c.label}
                  onClick={() => setSelectedClient(c.label)}
                  className={`px-2.5 py-1 rounded-lg transition-all shrink-0 text-xs ${
                    selectedClient === c.label ? "bg-blue-600 text-white font-bold" : "text-[#F1F5F9] hover:text-white"
                  }`}
                >
                  {c.label} ({c.count})
                </button>
              ))}
            </div>

            <div className="flex items-center gap-2">
              <CustomSelect
                value={urgencyFilter}
                onChange={setUrgencyFilter}
                options={[
                  { value: "All", label: "Urgency: All" },
                  { value: "High", label: "Due soon / revisions" },
                  { value: "Normal", label: "Normal" },
                ]}
              />
              {!isAdmin && (
                <button
                  onClick={() => {
                    setNewClientId(clients[0]?.id || "");
                    setCreateOpen(true);
                  }}
                  disabled={clients.length === 0}
                  className="px-3 py-1.5 rounded-xl bg-[#7FA0D6] hover:bg-blue-700 text-white text-xs font-bold flex items-center justify-center gap-1 transition-all cursor-pointer whitespace-nowrap active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Plus className="size-3.5" />
                  <span>Add Task</span>
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Mobile column tabs */}
        <div className="flex md:hidden items-center bg-[#161F2D] p-1 rounded-xl border border-[#2A3446] text-xs font-bold overflow-x-auto no-scrollbar gap-1">
          {([
            ["all", `All (${filtered.length})`],
            ["assigned", `Queued (${assigned.length})`],
            ["production", `Active (${production.length})`],
            ["qa", `Lead QA (${qa.length})`],
            ["review", `Client (${review.length})`],
          ] as const).map(([key, label]) => (
            <button
              key={key}
              onClick={() => setMobileKanbanTab(key)}
              className={`px-2.5 py-1 rounded-lg transition-all shrink-0 ${mobileKanbanTab === key ? "bg-blue-600 text-white font-bold" : "text-[#F1F5F9]"}`}
            >
              {label}
            </button>
          ))}
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-24 text-[#97A0B3]">
            <Loader2 className="size-6 animate-spin" />
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-3.5 items-stretch h-[560px] sm:h-[600px] lg:h-[calc(100vh-270px)] min-h-[500px]">
            {/* 1. Assigned & queued */}
            <div className={columnClass("assigned")}>
              <ColumnHeader dot="bg-slate-400" title="Assigned & Queued" count={assigned.length} />
              <div className="flex-1 overflow-y-auto space-y-2.5 pr-1 custom-scrollbar min-h-0">
                {assigned.map((task) => {
                  const due = dueText(task);
                  return (
                    <div key={task.id} className="bg-[#161F2D] rounded-xl p-3 border border-[#2A3446]/80 space-y-2">
                      <div className="flex items-center justify-between text-[10px] font-bold">
                        {clientBadge(task)}
                        <span className="px-1.5 rounded bg-[#7FA0D6]/15 text-[#7FA0D6]">{formatLabel(task.deliverable_type)}</span>
                      </div>
                      <h4 className="text-xs font-black text-white leading-snug">{taskTitle(task)}</h4>
                      {task.blueprint?.brief && <p className="text-[11px] text-[#97A0B3] line-clamp-2">{task.blueprint.brief}</p>}
                      <div className="flex items-center justify-between pt-1.5 border-t border-[#2A3446] text-[10px]">
                        <span className={due.urgent ? "text-rose-400 font-bold" : "text-[#97A0B3] font-medium"}>{due.text}</span>
                        <button
                          onClick={() => startMutation.mutate(task.id)}
                          disabled={startMutation.isPending}
                          className="px-2 py-0.5 rounded-md bg-[#7FA0D6]/15 hover:bg-[#7FA0D6]/25 text-[#7FA0D6] font-bold text-[10px] flex items-center gap-1 transition-colors cursor-pointer disabled:opacity-50"
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
              <ColumnHeader dot="bg-blue-600 animate-pulse" title="In Production" count={production.length} />
              <div className="flex-1 overflow-y-auto space-y-2.5 pr-1 custom-scrollbar min-h-0">
                {production.map((task) => {
                  const due = dueText(task);
                  const feedback = feedbackFor(task);
                  return (
                    <div
                      key={task.id}
                      className={`bg-[#161F2D] rounded-xl p-3 border space-y-2 ${feedback ? "border-amber-400/50" : "border-[#2A3446]/80"}`}
                    >
                      <div className="flex items-center justify-between text-[10px] font-bold">
                        {clientBadge(task)}
                        <span className={`px-1.5 rounded text-[9px] font-black ${due.urgent ? "bg-rose-500/15 text-rose-400 border border-rose-500/30" : "text-[#97A0B3]"}`}>
                          {due.text}
                        </span>
                      </div>
                      <h4 className="text-xs font-black text-white leading-snug">{taskTitle(task)}</h4>
                      <p className="text-[11px] text-[#97A0B3]">{formatLabel(task.deliverable_type)}{task.deliverable ? ` · last upload v${task.deliverable.version}` : ""}</p>
                      {feedback && (
                        <div className="p-2 rounded-lg bg-amber-500/10 border border-amber-500/30 text-xs space-y-0.5">
                          <div className="font-bold text-amber-300 text-[10px]">{feedback.source} requested changes</div>
                          <p className="text-[10px] text-amber-100/90 leading-snug line-clamp-3">"{feedback.text}"</p>
                        </div>
                      )}
                      <div className="pt-1.5 border-t border-[#2A3446]">
                        <button
                          onClick={() => openUpload(task)}
                          className="w-full py-1.5 rounded-lg bg-gradient-to-r from-blue-600 to-indigo-600 hover:brightness-110 text-white font-bold text-[11px] flex items-center justify-center gap-1 transition-all cursor-pointer active:scale-95"
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
              <ColumnHeader dot="bg-amber-500" title="Submitted for QA" count={qa.length} />
              <div className="flex-1 overflow-y-auto space-y-2.5 pr-1 custom-scrollbar min-h-0">
                {qa.map((task) => (
                  <div key={task.id} className="bg-[#161F2D] rounded-xl p-3 border border-[#2A3446]/80 space-y-2">
                    <div className="flex items-center justify-between text-[10px] font-bold">
                      {clientBadge(task)}
                      <span className="px-1.5 rounded bg-[#7FA0D6]/15 text-[#7FA0D6] text-[9px]">With {leadName}</span>
                    </div>
                    <h4 className="text-xs font-black text-white leading-snug">{taskTitle(task)}</h4>
                    {task.deliverable && (
                      <div className="h-28 rounded-lg overflow-hidden border border-[#2A3446] bg-black">
                        <DeliverableMedia
                          url={task.deliverable.file_url}
                          isVideo={task.deliverable.is_video}
                          title={taskTitle(task)}
                          controls={false}
                          className="w-full h-full"
                        />
                      </div>
                    )}
                    <div className="flex items-center justify-between text-[10px] text-[#97A0B3]">
                      <span>v{task.deliverable?.version ?? 1} · awaiting lead sign-off</span>
                      {data?.is_lead_view && (
                        <Link to="/lead/deliverables" className="font-bold text-[#7FA0D6] flex items-center gap-0.5">
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
              <ColumnHeader dot="bg-emerald-500" title="Client Review & Approved" count={review.length} />
              <div className="flex-1 overflow-y-auto space-y-2.5 pr-1 custom-scrollbar min-h-0">
                {review.map((task) => {
                  const approved = task.status === "ready_to_publish" || task.status === "completed";
                  return (
                    <div key={task.id} className="bg-[#161F2D] rounded-xl p-3 border border-[#2A3446]/80 space-y-2">
                      <div className="flex items-center justify-between text-[10px] font-bold">
                        {clientBadge(task)}
                        {approved ? (
                          <span className="px-1.5 rounded bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 text-[9px] flex items-center gap-0.5">
                            <Check className="size-2.5" /> Client approved
                          </span>
                        ) : (
                          <span className="px-1.5 rounded bg-[#D8BF9B]/15 text-[#D8BF9B] text-[9px] flex items-center gap-0.5">
                            <Clock className="size-2.5" /> With client
                          </span>
                        )}
                      </div>
                      <h4 className="text-xs font-black text-white leading-snug">{taskTitle(task)}</h4>
                      <p className="text-[11px] text-[#97A0B3]">
                        {formatLabel(task.deliverable_type)} · v{task.deliverable?.version ?? 1}
                      </p>
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
            className="w-full max-w-2xl bg-[#161F2D] rounded-3xl p-5 sm:p-7 shadow-2xl border border-[#2A3446] space-y-4 max-h-[92vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between border-b border-[#2A3446] pb-3 gap-2">
              <div className="flex items-start gap-3">
                <div className="size-10 rounded-2xl bg-[#7FA0D6]/15 text-[#7FA0D6] flex items-center justify-center shrink-0 mt-0.5">
                  <ShieldCheck className="size-5" />
                </div>
                <div>
                  <div className="flex flex-wrap items-center gap-2 mb-1 text-[10px] font-black uppercase">
                    <span className="px-2 py-0.5 rounded-full bg-[#7FA0D6]/15 text-[#7FA0D6]">{uploadTask.client_name}</span>
                    <span className="px-2 py-0.5 rounded-full bg-[#0B111C] text-[#F1F5F9]">{formatLabel(uploadTask.deliverable_type)}</span>
                  </div>
                  <h3 id="upload-title" className="text-base sm:text-lg font-black text-white leading-snug">{taskTitle(uploadTask)}</h3>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setUploadTask(null)}
                disabled={uploadMutation.isPending}
                aria-label="Close"
                className="size-8 rounded-full bg-[#0B111C] hover:bg-[#2A3446] border border-[#2A3446] text-[#97A0B3] flex items-center justify-center cursor-pointer shrink-0"
              >
                <X className="size-4" />
              </button>
            </div>

            <div className="p-4 rounded-2xl bg-[#0B111C] border border-[#2A3446] space-y-2 text-xs">
              <div className="flex items-center justify-between gap-2">
                <span className="font-black text-[#7FA0D6] uppercase tracking-wider flex items-center gap-1.5">
                  <Sparkles className="size-3.5" /> Brief & spec
                </span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#161F2D] text-[#BCCCE6] border border-[#2A3446]">
                  {FORMAT_SPECS[uploadTask.deliverable_type] || "Match the planned format"}
                </span>
              </div>
              <p className="text-[#F1F5F9] leading-relaxed">
                {uploadTask.blueprint?.brief || uploadTask.blueprint?.hook || uploadTask.blueprint?.objective ||
                  "Follow the client's Brand DNA and content plan for this slot."}
              </p>
            </div>

            {modalFeedback && (
              <div className="p-3 rounded-2xl bg-amber-500/10 border border-amber-500/30 space-y-1 text-xs">
                <div className="font-bold text-amber-300">{modalFeedback.source} requested changes on v{uploadTask.deliverable?.version}</div>
                <p className="text-amber-100/90 leading-relaxed whitespace-pre-wrap">{modalFeedback.text}</p>
              </div>
            )}

            {/* File picker */}
            <div className="p-4 rounded-2xl bg-[#0B111C] border border-[#2A3446] space-y-3 text-xs">
              <div className="flex items-center justify-between">
                <label htmlFor="deliverable-file" className="font-black text-white flex items-center gap-1.5 uppercase text-[11px] tracking-wider">
                  <Upload className="size-3.5 text-[#7FA0D6]" /> Final file
                </label>
                <span className="text-[10px] font-bold text-[#97A0B3]">Images ≤ 10 MB · Videos ≤ 500 MB</span>
              </div>
              <label
                className="relative block border-2 border-dashed border-[#2A3446] hover:border-[#7FA0D6] bg-[#161F2D]/60 rounded-2xl p-4 text-center transition-all cursor-pointer"
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
                    <p className="font-bold text-white truncate">{file.name} · {(file.size / MB).toFixed(1)} MB</p>
                    <p className="text-[10px] text-[#97A0B3]">Click or drop to replace</p>
                  </div>
                ) : (
                  <div className="space-y-1.5 py-2">
                    <div className="size-10 rounded-2xl bg-[#7FA0D6]/15 text-[#7FA0D6] flex items-center justify-center mx-auto">
                      <Upload className="size-5" />
                    </div>
                    <div className="font-bold text-white">Drop the final MP4/MOV or PNG/JPG here, or click to browse</div>
                  </div>
                )}
              </label>
              {fileError && <p role="alert" className="text-rose-300 font-bold">{fileError}</p>}
            </div>

            {/* Self-check */}
            <div className="p-4 rounded-2xl bg-[#0B111C] border border-[#2A3446]/80 space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="font-black text-xs text-white uppercase tracking-wider">Self-check before QA</span>
                <span className="text-xs font-bold text-[#7FA0D6]">{rubricPassed}/{RUBRIC.length}</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                {RUBRIC.map((item) => (
                  <label key={item.key} className="flex items-center gap-2.5 p-2 rounded-xl bg-[#161F2D] border border-[#2A3446]/80 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={!!rubric[item.key]}
                      onChange={(e) => setRubric((prev) => ({ ...prev, [item.key]: e.target.checked }))}
                      className="size-4 rounded cursor-pointer"
                    />
                    <span className="font-semibold text-[#F1F5F9]">{item.label}</span>
                  </label>
                ))}
              </div>
            </div>

            <div className="space-y-1.5 text-xs">
              <label htmlFor="specialist-notes" className="block font-bold text-[#F1F5F9]">Notes for {leadName}</label>
              <textarea
                id="specialist-notes"
                rows={2}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder={modalFeedback ? "What did you change in this version?" : "Anything the lead should know before reviewing"}
                className="w-full px-3.5 py-2 rounded-xl border border-[#2A3446] bg-[#0B111C] text-xs font-medium resize-none focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              />
            </div>

            {progress !== null && (
              <div className="space-y-1" aria-live="polite">
                <div className="flex justify-between text-[10px] font-bold text-[#97A0B3]">
                  <span>Uploading…</span>
                  <span>{Math.round(progress * 100)}%</span>
                </div>
                <div className="w-full h-1.5 bg-[#0B111C] rounded-full overflow-hidden">
                  <div className="h-full bg-blue-600 rounded-full transition-all" style={{ width: `${Math.round(progress * 100)}%` }} />
                </div>
              </div>
            )}
            {submitError && <p role="alert" className="text-xs font-bold text-rose-300">{submitError}</p>}

            <div className="flex flex-col sm:flex-row items-center justify-end gap-2.5 pt-3 border-t border-[#2A3446] text-xs">
              <button
                type="button"
                onClick={() => setUploadTask(null)}
                disabled={uploadMutation.isPending}
                className="w-full sm:w-auto px-4 py-2 rounded-xl border border-[#2A3446] font-bold text-[#F1F5F9] hover:bg-[#0B111C] cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => uploadMutation.mutate()}
                disabled={!file || uploadMutation.isPending}
                className="w-full sm:w-auto px-5 py-2 rounded-xl bg-[#7FA0D6] hover:bg-blue-700 text-white font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
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
            className="w-full max-w-xl bg-[#161F2D] rounded-3xl p-5 sm:p-7 shadow-2xl border border-[#2A3446] space-y-4 max-h-[90vh] overflow-y-auto text-xs"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-[#2A3446] pb-3">
              <h3 id="create-title" className="text-base font-black text-white">Add a production task</h3>
              <button type="button" onClick={() => setCreateOpen(false)} aria-label="Close" className="size-8 rounded-full bg-[#0B111C] border border-[#2A3446] text-[#97A0B3] flex items-center justify-center">
                <X className="size-4" />
              </button>
            </div>
            <div>
              <label htmlFor="task-title" className="block font-bold text-[#F1F5F9] mb-1">Title <span className="text-rose-500">*</span></label>
              <input
                id="task-title"
                required
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                placeholder="e.g. Diwali offer reel"
                className="w-full px-3.5 py-2.5 rounded-xl border border-[#2A3446] bg-[#0B111C] font-semibold"
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label htmlFor="task-client" className="block font-bold text-[#F1F5F9] mb-1">Client</label>
                <select id="task-client" value={newClientId} onChange={(e) => setNewClientId(e.target.value)} className="w-full px-3 py-2 rounded-xl border border-[#2A3446] font-bold bg-[#0B111C]">
                  {clients.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label htmlFor="task-format" className="block font-bold text-[#F1F5F9] mb-1">Format</label>
                <select id="task-format" value={newType} onChange={(e) => setNewType(e.target.value)} className="w-full px-3 py-2 rounded-xl border border-[#2A3446] font-bold bg-[#0B111C]">
                  <option value="reel">Reel</option>
                  <option value="static_post">Poster</option>
                  <option value="carousel">Carousel</option>
                  <option value="story">Story</option>
                </select>
              </div>
              <div>
                <label htmlFor="task-due" className="block font-bold text-[#F1F5F9] mb-1">Due date</label>
                <input id="task-due" type="date" value={newDue} onChange={(e) => setNewDue(e.target.value)} className="w-full px-3 py-2 rounded-xl border border-[#2A3446] bg-[#0B111C] font-bold" />
              </div>
            </div>
            <div>
              <label htmlFor="task-brief" className="block font-bold text-[#F1F5F9] mb-1">Brief</label>
              <textarea id="task-brief" rows={3} value={newBrief} onChange={(e) => setNewBrief(e.target.value)} placeholder="Hook, key message, references…" className="w-full px-3 py-2 rounded-xl border border-[#2A3446] bg-[#0B111C] font-medium resize-none" />
            </div>
            <label className="flex items-center gap-2 font-bold text-[#F1F5F9]">
              <input type="checkbox" checked={startNow} onChange={(e) => setStartNow(e.target.checked)} className="size-4" />
              Start production now
            </label>
            <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-[#2A3446]">
              <button type="button" onClick={() => setCreateOpen(false)} className="px-4 py-2 rounded-xl border border-[#2A3446] font-bold text-[#F1F5F9]">Cancel</button>
              <button
                type="submit"
                disabled={!newTitle.trim() || createMutation.isPending}
                className="px-5 py-2 rounded-xl bg-[#7FA0D6] hover:bg-blue-700 text-white font-bold flex items-center gap-1.5 disabled:opacity-50"
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
    <div className="flex items-center justify-between px-1 pt-0.5 shrink-0">
      <div className="flex items-center gap-1.5">
        <span className={`size-2 rounded-full ${dot}`} />
        <h3 className="text-xs font-black uppercase tracking-wider text-[#F1F5F9]">{title}</h3>
      </div>
      <span className="px-1.5 rounded-full text-[9px] font-black bg-[#161F2D] text-[#F1F5F9] border border-[#2A3446]">{count}</span>
    </div>
  );
}
