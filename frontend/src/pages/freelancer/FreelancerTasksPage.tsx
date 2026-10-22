import React, { useState, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Briefcase,
  Calendar,
  Clock,
  UploadCloud,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  Sparkles,
  History,
  X,
  Send,
  Link as LinkIcon,
  IndianRupee,
  Wallet,
  Play,
  FileUp,
  Film,
  FolderGit2,
  Music,
} from "lucide-react";
import { AdminTopHeader } from "../../components/admin/AdminTopHeader";
import {
  fetchMyFreelancerTasks,
  submitFreelancerWork,
  startFreelancerTask,
  uploadFreelancerContentFile,
  FreelancerAssignedTask,
} from "../../lib/freelancer-api";
import { DeliverableHistoryModal } from "../../components/portal/DeliverableHistoryModal";

export function FreelancerTasksPage() {
  const queryClient = useQueryClient();

  const [filterStatus, setFilterStatus] = useState<string>("pending");
  const [selectedTaskForSubmit, setSelectedTaskForSubmit] = useState<FreelancerAssignedTask | null>(null);

  // Submission State (File Upload or External Link)
  const [submissionMode, setSubmissionMode] = useState<"file" | "link">("file");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [assetUrl, setAssetUrl] = useState("");
  const [submissionNotes, setSubmissionNotes] = useState("");
  const [submitBusy, setSubmitBusy] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitSuccess, setSubmitSuccess] = useState<string | null>(null);
  const [startingTaskId, setStartingTaskId] = useState<string | null>(null);

  // History modal
  const [historyDeliverable, setHistoryDeliverable] = useState<{ id: string; title: string } | null>(null);

  const { data: tasks, isLoading } = useQuery({
    queryKey: ["freelancer-my-tasks"],
    queryFn: () => fetchMyFreelancerTasks(),
  });

  const taskList = tasks || [];

  const normalizeStatus = (status?: string): "pending" | "review" | "revision" | "completed" => {
    const s = (status || "").toLowerCase().replace(/[\s_-]+/g, "_");
    if (s === "approved" || s === "completed" || s === "ready_to_publish") return "completed";
    if (s === "revision_requested" || s === "qa_rejected" || s === "revision") return "revision";
    if (s === "internal_qa" || s === "pending_qa" || s === "in_review" || s === "ready_for_review" || s === "qa_review") return "review";
    return "pending";
  };

  const tabCounts = useMemo(() => {
    let pending = 0;
    let review = 0;
    let revision = 0;
    let completed = 0;
    taskList.forEach((t) => {
      const s = normalizeStatus(t.status);
      if (s === "pending") pending++;
      else if (s === "review") review++;
      else if (s === "revision") revision++;
      else if (s === "completed") completed++;
    });
    return {
      pending,
      review,
      revision,
      completed,
    };
  }, [taskList]);

  const filteredTasks = taskList.filter((task) => {
    return normalizeStatus(task.status) === filterStatus;
  });

  // Calculate live financial & earnings stats
  const earnings = useMemo(() => {
    let earnedSettled = 0;
    let pendingReview = 0;
    let activeInProgress = 0;
    let completedCount = 0;
    let reviewCount = 0;
    let activeCount = 0;

    taskList.forEach((t) => {
      const fee = Number(t.milestone_fee ?? 4500);
      const s = normalizeStatus(t.status);
      if (s === "completed") {
        earnedSettled += fee;
        completedCount++;
      } else if (s === "review") {
        pendingReview += fee;
        reviewCount++;
      } else {
        activeInProgress += fee;
        activeCount++;
      }
    });

    return {
      earnedSettled,
      pendingReview,
      activeInProgress,
      completedCount,
      reviewCount,
      activeCount,
      totalPipeline: earnedSettled + pendingReview + activeInProgress,
    };
  }, [taskList]);

  const handleStartWork = async (task: FreelancerAssignedTask) => {
    setStartingTaskId(task.id);
    try {
      await startFreelancerTask(task.id);
      setSubmitSuccess(`Deliverable "${task.title}" is now In Progress! Upload your content when ready.`);
      await queryClient.invalidateQueries({ queryKey: ["freelancer-my-tasks"] });
      setTimeout(() => setSubmitSuccess(null), 4000);
    } catch (err: any) {
      setSubmitError(err?.message || "Failed to start deliverable work.");
    } finally {
      setStartingTaskId(null);
    }
  };

  const handleSubmitWork = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTaskForSubmit) return;

    if (submissionMode === "file") {
      if (!selectedFile) {
        setSubmitError("Please choose or drag a media file to upload.");
        return;
      }
      setSubmitBusy(true);
      setSubmitError(null);
      try {
        await uploadFreelancerContentFile(
          selectedTaskForSubmit.id,
          selectedFile,
          submissionNotes.trim() || undefined
        );
        setSubmitSuccess(`Content '${selectedFile.name}' uploaded and submitted to Admin for review & publishing!`);
        setSelectedTaskForSubmit(null);
        setSelectedFile(null);
        setSubmissionNotes("");
        await queryClient.invalidateQueries({ queryKey: ["freelancer-my-tasks"] });
        setTimeout(() => setSubmitSuccess(null), 4000);
      } catch (err: any) {
        setSubmitError(err?.message || "Failed to upload deliverable file.");
      } finally {
        setSubmitBusy(false);
      }
    } else {
      if (!assetUrl.trim()) {
        setSubmitError("Deliverable asset or cloud storage link is required.");
        return;
      }
      setSubmitBusy(true);
      setSubmitError(null);
      try {
        await submitFreelancerWork({
          deliverable_id: selectedTaskForSubmit.deliverable_id,
          task_id: selectedTaskForSubmit.id,
          asset_url: assetUrl.trim(),
          submission_notes: submissionNotes.trim() || undefined,
        });
        setSubmitSuccess("Deliverable cloud link submitted to Admin for review & publishing!");
        setSelectedTaskForSubmit(null);
        setAssetUrl("");
        setSubmissionNotes("");
        await queryClient.invalidateQueries({ queryKey: ["freelancer-my-tasks"] });
        setTimeout(() => setSubmitSuccess(null), 4000);
      } catch (err: any) {
        setSubmitError(err?.message || "Failed to submit deliverable work.");
      } finally {
        setSubmitBusy(false);
      }
    }
  };

  const getStatusBadge = (status: string) => {
    const s = normalizeStatus(status);
    if (s === "completed") {
      return (
        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 flex items-center gap-1 shrink-0">
          <CheckCircle2 className="w-3 h-3 text-emerald-400" /> Approved
        </span>
      );
    }
    if (s === "revision") {
      return (
        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-amber-500/15 text-amber-400 border border-amber-500/30 flex items-center gap-1 shrink-0">
          <AlertCircle className="w-3 h-3 text-amber-400" /> Revision Requested
        </span>
      );
    }
    if (s === "review") {
      return (
        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-blue-500/15 text-blue-400 border border-blue-500/30 flex items-center gap-1 shrink-0">
          <Clock className="w-3 h-3 text-blue-400" /> In QA Review
        </span>
      );
    }
    return (
      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-purple-500/15 text-purple-300 border border-purple-500/30 flex items-center gap-1 shrink-0">
        <Sparkles className="w-3 h-3 text-purple-300" /> In Progress
      </span>
    );
  };

  return (
    <div className="min-h-screen bg-app-base text-hi flex flex-col overflow-x-hidden">
      <AdminTopHeader activeTab="Assigned Workload" hideTitle />

      <div className="max-w-[1600px] w-full mx-auto px-3.5 sm:px-6 lg:px-8 py-4 sm:py-6 space-y-6 flex-1">

        {submitSuccess && (
          <div className="p-4 bg-emerald-500/15 border border-emerald-500/40 rounded-2xl text-xs font-bold text-emerald-300 flex items-center gap-2 animate-fade-in shadow-sm">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            {submitSuccess}
          </div>
        )}

      {/* ── MOBILE: 2 KPI CARDS (Earned & Expected Earnings) ── */}
      <div className="sm:hidden grid grid-cols-2 gap-2">
        <div className="p-2.5 bg-app-surface border border-app-line rounded-xl space-y-0.5 shadow-xs">
          <div className="flex items-center justify-between text-[10px] font-bold text-app-mist uppercase tracking-wider">
            <span>Earned</span>
            <IndianRupee className="w-3.5 h-3.5 text-emerald-400" />
          </div>
          <div className="text-lg font-black text-emerald-400 truncate">
            ₹{earnings.earnedSettled.toLocaleString("en-IN")}
          </div>
          <p className="text-[10px] text-emerald-400/80 font-bold truncate">{earnings.completedCount} approved</p>
        </div>

        <div className="p-2.5 bg-app-surface border border-app-line rounded-xl space-y-0.5 shadow-xs">
          <div className="flex items-center justify-between text-[10px] font-bold text-app-mist uppercase tracking-wider">
            <span>Expected Earnings</span>
            <Wallet className="w-3.5 h-3.5 text-amber-400" />
          </div>
          <div className="text-lg font-black text-amber-400 truncate">
            ₹{earnings.totalPipeline.toLocaleString("en-IN")}
          </div>
          <p className="text-[10px] text-amber-400/80 font-bold truncate">{taskList.length} total tasks</p>
        </div>
      </div>

      {/* ── DESKTOP/TABLET: 2 Financial & Earnings Summary Cards ── */}
      <div className="hidden sm:grid sm:grid-cols-2 gap-4 w-full">
        {/* Card 1: Earned & Settled */}
        <div className="bg-app-surface rounded-3xl p-5 border-2 border-app-surface hover:border-emerald-500/30 transition-all shadow-xl flex flex-col justify-between">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[10px] font-black text-app-mist uppercase tracking-wider">
              EARNED & SETTLED
            </span>
            <div className="w-8 h-8 rounded-2xl bg-emerald-500/15 text-emerald-400 flex items-center justify-center">
              <IndianRupee className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-black text-emerald-400">
              ₹{earnings.earnedSettled.toLocaleString("en-IN")}
            </span>
            <span className="text-xs font-semibold text-app-mist">
              ({earnings.completedCount} approved)
            </span>
          </div>
          <div className="mt-3 pt-3 border-t border-app-line text-xs font-bold text-emerald-400 flex items-center gap-1">
            <CheckCircle2 className="w-3.5 h-3.5" /> Payout cleared on sign-off
          </div>
        </div>

        {/* Card 2: Expected Earnings */}
        <div className="bg-app-surface rounded-3xl p-5 border-2 border-app-surface hover:border-amber-500/30 transition-all shadow-xl flex flex-col justify-between">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[10px] font-black text-app-mist uppercase tracking-wider">
              EXPECTED EARNINGS
            </span>
            <div className="w-8 h-8 rounded-2xl bg-amber-500/15 text-amber-400 flex items-center justify-center">
              <Wallet className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-black text-amber-400">
              ₹{earnings.totalPipeline.toLocaleString("en-IN")}
            </span>
            <span className="text-xs font-semibold text-app-mist">
              ({taskList.length} deliverables)
            </span>
          </div>
          <div className="mt-3 pt-3 border-t border-app-line text-xs font-bold text-amber-400 flex items-center gap-1">
            <Wallet className="w-3.5 h-3.5" /> All assigned milestones
          </div>
        </div>
      </div>

      {/* Filters Bar: Full-Width Segmented Controls */}
      <div className="bg-app-surface p-1.5 sm:p-2 rounded-2xl border border-app-line w-full shadow-xs">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 w-full">
          {[
            { key: "pending", label: "In Progress", count: tabCounts.pending },
            { key: "review", label: "In QA Review", count: tabCounts.review },
            { key: "revision", label: "Revisions Needed", count: tabCounts.revision },
            { key: "completed", label: "Approved & Paid", count: tabCounts.completed },
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setFilterStatus(tab.key)}
              className={`px-3 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer text-center flex items-center justify-center gap-2 ${
                filterStatus === tab.key
                  ? "bg-purple-600 text-app-on-accent! shadow-md shadow-purple-500/20"
                  : "text-app-mist hover:text-hi hover:bg-app-base"
              }`}
            >
              <span>{tab.label}</span>
              <span
                className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${
                  filterStatus === tab.key
                    ? "bg-hi/20 text-hi font-black"
                    : "bg-app-line text-app-mist"
                }`}
              >
                {tab.count}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Task Cards List */}
      {isLoading ? (
        <div className="text-center py-16 text-sm text-app-mist">Loading assigned tasks...</div>
      ) : filteredTasks.length === 0 ? (
        <div className="bg-app-surface rounded-3xl p-12 text-center border border-app-line space-y-3">
          <Briefcase className="w-10 h-10 text-app-mist mx-auto opacity-40" />
          <h3 className="text-base font-bold text-hi">No deliverables in current filter</h3>
          <p className="text-xs text-app-mist max-w-sm mx-auto">
            You will receive tasks directly from Team Leads with creative briefs, due dates, and milestone payout values.
          </p>
        </div>
      ) : (
        <div className={`grid grid-cols-1 ${filteredTasks.length > 1 ? "md:grid-cols-2" : ""} gap-4 w-full`}>
          {filteredTasks.map((task) => {
            const fee = Number(task.milestone_fee ?? 4500);
            const normStatus = normalizeStatus(task.status);
            const isAssigned = (task.status || "").toLowerCase() === "assigned" || (task.status || "").toLowerCase() === "backlog";

            return (
              <div
                key={task.id}
                className="bg-app-surface rounded-3xl p-4 sm:p-6 border border-app-line shadow-lg hover:border-purple-500/40 transition-all flex flex-col justify-between space-y-4"
              >
                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="space-y-0.5">
                      <span className="text-[10px] font-black text-purple-400 uppercase tracking-wider">
                        Client: {task.client_name}
                      </span>
                      <h3 className="text-base font-bold text-hi">{task.title}</h3>
                    </div>
                    {getStatusBadge(task.status)}
                  </div>

                  {/* Content Specifications Chips */}
                  {(() => {
                    const footageUrl =
                      task.raw_footage_url ||
                      task.blueprint?.raw_footage_url ||
                      task.blueprint?.drive_url ||
                      task.brief_url;
                    const duration = task.target_duration || task.blueprint?.target_duration;
                    const hookText = task.hook || task.blueprint?.hook;
                    const audio = task.audio_notes || task.blueprint?.audio_notes;
                    const refLink = task.reference_url || task.blueprint?.reference_url;

                    return (
                      <div className="space-y-3">
                        {/* Specifications Badges Row */}
                        <div className="flex flex-wrap items-center gap-2 text-[11px]">
                          <span className="px-2.5 py-1 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 font-bold flex items-center gap-1">
                            <IndianRupee className="w-3.5 h-3.5" /> Payout: ₹{fee.toLocaleString("en-IN")}
                          </span>
                          <span className="px-2 py-0.5 rounded-lg bg-app-base border border-app-line font-mono text-purple-300 flex items-center gap-1">
                            <Film className="w-3 h-3 text-purple-400" />
                            {task.format}
                          </span>
                          {duration && (
                            <span className="px-2 py-0.5 rounded-lg bg-app-base border border-app-line text-blue-300 flex items-center gap-1 font-mono">
                              <Clock className="w-3 h-3 text-blue-400" />
                              Length: {duration}
                            </span>
                          )}
                          {task.due_date && (
                            <span className="flex items-center gap-1 text-app-mist bg-app-base px-2 py-0.5 rounded-lg border border-app-line">
                              <Calendar className="w-3 h-3 text-app-mist" /> Due: {task.due_date}
                            </span>
                          )}
                        </div>

                        {/* Raw Footage / Drive Link (PROMINENT FOR EDITOR) */}
                        {footageUrl ? (
                          <a
                            href={footageUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="flex flex-col sm:flex-row sm:items-center justify-between p-3 rounded-2xl bg-gradient-to-r from-blue-900/40 via-app-surface to-indigo-900/30 border border-blue-500/40 hover:border-blue-400 text-hi transition-all group shadow-md gap-2.5"
                          >
                            <div className="flex items-start sm:items-center gap-2.5 min-w-0">
                              <div className="w-9 h-9 rounded-xl bg-blue-500/20 text-blue-400 border border-blue-500/30 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform mt-0.5 sm:mt-0">
                                <FolderGit2 className="w-5 h-5" />
                              </div>
                              <div className="min-w-0 flex-1">
                                <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                                  <span className="text-xs font-black text-hi truncate">
                                    Raw Footage / Source Assets (Drive)
                                  </span>
                                  <span className="px-1.5 py-0.2 rounded-full text-[9px] font-black uppercase bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 shrink-0">
                                    Ready to Edit
                                  </span>
                                </div>
                                <p className="text-[10px] text-blue-200/80 truncate">
                                  Click to open Google Drive folder and download videos to edit
                                </p>
                              </div>
                            </div>
                            <div className="flex items-center justify-center gap-1 px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-app-on-accent! text-xs font-bold transition-all shrink-0 shadow-sm w-full sm:w-auto">
                              <span>Open Drive</span>
                              <ExternalLink className="w-3.5 h-3.5" />
                            </div>
                          </a>
                        ) : (
                          <div className="p-2.5 rounded-xl bg-app-base border border-app-line text-[11px] text-app-mist flex items-center gap-2">
                            <FolderGit2 className="w-4 h-4 text-amber-400 shrink-0" />
                            <span>
                              Raw Footage Drive link: <strong className="text-amber-300">Pending link from Admin / TL</strong>
                            </span>
                          </div>
                        )}

                        {/* Creative Directives Box (Hook, Audio, References) */}
                        {(hookText || audio || refLink) && (
                          <div className="p-3 bg-app-base rounded-2xl border border-purple-500/20 text-xs space-y-2">
                            {hookText && (
                              <div className="flex items-start gap-1.5 text-amber-300">
                                <Sparkles className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
                                <div>
                                  <strong className="text-[10px] uppercase tracking-wider text-amber-400 block font-black">
                                    Hook / Concept Angle:
                                  </strong>
                                  <p className="text-hi text-xs leading-snug font-medium">"{hookText}"</p>
                                </div>
                              </div>
                            )}

                            {audio && (
                              <div className="flex items-start gap-1.5 text-pink-300 pt-1 border-t border-app-line/60">
                                <Music className="w-3.5 h-3.5 text-pink-400 shrink-0 mt-0.5" />
                                <div>
                                  <strong className="text-[10px] uppercase tracking-wider text-pink-400 block font-black">
                                    Audio & Sound Directions:
                                  </strong>
                                  <p className="text-app-ink-2 text-xs leading-snug">{audio}</p>
                                </div>
                              </div>
                            )}

                            {refLink && (
                              <div className="pt-1 border-t border-app-line/60">
                                <a
                                  href={refLink}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="inline-flex items-center gap-1.5 text-xs text-purple-400 hover:text-purple-300 font-bold hover:underline"
                                >
                                  <ExternalLink className="w-3.5 h-3.5" /> Open Reference Video / Inspiration
                                </a>
                              </div>
                            )}
                          </div>
                        )}

                        {/* Brief & Scope */}
                        {task.description && (
                          <div className="p-3 bg-app-base rounded-2xl text-xs text-app-ink-2 border border-app-line space-y-1">
                            <span className="font-bold text-app-mist block text-[10px] uppercase">
                              Creative Brief & Scope
                            </span>
                            <p className="line-clamp-4 text-xs leading-relaxed whitespace-pre-wrap">{task.description}</p>
                          </div>
                        )}

                        {/* Submitted Deliverable Banner */}
                        {((task.deliverables && task.deliverables.length > 0) || normStatus === "review") && (() => {
                          const latest = task.deliverables && task.deliverables.length > 0
                            ? task.deliverables[task.deliverables.length - 1]
                            : null;
                          const rawName = latest?.file_url ? latest.file_url.split("/").pop() : null;
                          const displayFileName = rawName ? rawName.replace(/^[a-f0-9]{8}_/, "") : "Content submitted for review";
                          const versionNum = latest?.version || 1;

                          return (
                            <div className="p-3 sm:p-3.5 bg-gradient-to-r from-blue-900/30 via-app-surface to-purple-900/20 border border-blue-500/40 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-md">
                              <div className="flex items-start sm:items-center gap-2.5 min-w-0">
                                <div className="w-8 h-8 rounded-xl bg-blue-500/20 text-blue-400 border border-blue-500/30 flex items-center justify-center shrink-0 mt-0.5 sm:mt-0">
                                  <CheckCircle2 className="w-4 h-4 text-blue-400" />
                                </div>
                                <div className="min-w-0 flex-1">
                                  <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                                    <span className="text-xs font-bold text-hi">v{versionNum} Submitted for QA Review</span>
                                    <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-blue-500/20 text-blue-300 border border-blue-500/30 shrink-0">
                                      In QA Review
                                    </span>
                                  </div>
                                  <p className="text-[11px] text-app-mist truncate font-mono mt-0.5">
                                    {displayFileName}
                                  </p>
                                </div>
                              </div>
                              {latest?.file_url && (
                                <a
                                  href={latest.file_url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="w-full sm:w-auto justify-center px-3 py-1.5 rounded-xl bg-blue-600/30 hover:bg-blue-600/50 text-blue-200 text-xs font-bold flex items-center gap-1.5 transition-all shrink-0 border border-blue-500/40 cursor-pointer"
                                >
                                  <ExternalLink className="w-3.5 h-3.5 shrink-0" />
                                  <span>View Submitted File</span>
                                </a>
                              )}
                            </div>
                          );
                        })()}
                      </div>
                    );
                  })()}
                </div>

                {/* Card Action Footer */}
                <div className="pt-3 border-t border-app-line flex flex-wrap items-center justify-between gap-2">
                  <button
                    type="button"
                    onClick={() =>
                      setHistoryDeliverable({ id: task.deliverable_id || task.id, title: task.title })
                    }
                    className="px-3 py-1.5 rounded-xl border border-app-line text-xs font-bold text-app-mist hover:text-hi hover:bg-app-base flex items-center gap-1.5 cursor-pointer"
                  >
                    <History className="w-3.5 h-3.5 text-app-mist" /> History
                  </button>

                  <div className="flex items-center gap-2">
                    {isAssigned && (
                      <button
                        type="button"
                        disabled={startingTaskId === task.id}
                        onClick={() => handleStartWork(task)}
                        className="px-3.5 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-app-on-accent! text-xs font-bold shadow-md flex items-center gap-1 cursor-pointer transition-all disabled:opacity-50"
                      >
                        <Play className="w-3.5 h-3.5" />
                        {startingTaskId === task.id ? "Starting..." : "Start Working"}
                      </button>
                    )}

                    {normStatus === "completed" ? (
                      <div className="px-3.5 py-1.5 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-xs font-bold flex items-center gap-1.5 shadow-xs">
                        <CheckCircle2 className="w-3.5 h-3.5" /> Approved & Paid
                      </div>
                    ) : normStatus === "review" ? (
                      <div className="flex items-center gap-2">
                        <div className="px-3 py-1.5 rounded-xl bg-blue-500/15 border border-blue-500/30 text-blue-400 text-xs font-bold flex items-center gap-1.5 shadow-xs">
                          <Clock className="w-3.5 h-3.5 animate-pulse text-blue-400" /> Awaiting QA Sign-off
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedTaskForSubmit(task);
                            setSelectedFile(null);
                            setAssetUrl("");
                            setSubmissionNotes("");
                            setSubmitError(null);
                          }}
                          className="px-3 py-1.5 rounded-xl bg-app-base hover:bg-app-line border border-app-line text-xs font-semibold text-app-mist hover:text-hi flex items-center gap-1.5 cursor-pointer transition-all"
                        >
                          <UploadCloud className="w-3.5 h-3.5" /> Re-upload
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedTaskForSubmit(task);
                          setSelectedFile(null);
                          setAssetUrl("");
                          setSubmissionNotes("");
                          setSubmitError(null);
                        }}
                        className="px-4 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-app-on-accent! text-xs font-bold shadow-md flex items-center gap-1.5 cursor-pointer transition-all"
                      >
                        <UploadCloud className="w-3.5 h-3.5" />
                        {normStatus === "revision" ? "Submit Revision" : "Upload Content & Submit"}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── Submission Modal: Direct File Upload or Cloud Link ── */}
      {selectedTaskForSubmit && (
        <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-fade-in">
          <div className="bg-app-surface rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-purple-500/40 space-y-4 max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-app-line pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-2xl bg-purple-500/15 text-purple-400 flex items-center justify-center font-black">
                  <UploadCloud className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-hi">Upload Deliverable Content</h3>
                  <p className="text-[11px] text-app-mist">Task: {selectedTaskForSubmit.title}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedTaskForSubmit(null)}
                className="p-1.5 text-app-mist hover:text-hi rounded-lg hover:bg-app-base"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Mode Switcher: Direct File Upload vs Cloud Link */}
            <div className="flex items-center gap-2 bg-app-base p-1.5 rounded-2xl border border-app-line">
              <button
                type="button"
                onClick={() => setSubmissionMode("file")}
                className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                  submissionMode === "file"
                    ? "bg-purple-600 text-app-on-accent! shadow-md"
                    : "text-app-mist hover:text-hi"
                }`}
              >
                <FileUp className="w-4 h-4" /> Direct File Upload
              </button>
              <button
                type="button"
                onClick={() => setSubmissionMode("link")}
                className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                  submissionMode === "link"
                    ? "bg-purple-600 text-app-on-accent! shadow-md"
                    : "text-app-mist hover:text-hi"
                }`}
              >
                <LinkIcon className="w-4 h-4" /> Cloud Storage Link
              </button>
            </div>

            {submitError && (
              <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-xs text-rose-300">
                {submitError}
              </div>
            )}

            <form onSubmit={handleSubmitWork} className="space-y-4 text-xs">
              {submissionMode === "file" ? (
                /* ── Direct File Upload Mode ── */
                <div>
                  <label className="block font-bold text-app-ink-2 mb-1.5">
                    Select Local Media File (Video, Audio, Graphic, or Project Archive) *
                  </label>
                  <div
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={(e) => {
                      e.preventDefault();
                      if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                        setSelectedFile(e.dataTransfer.files[0]);
                      }
                    }}
                    className={`border-2 border-dashed rounded-2xl p-6 text-center transition-all ${
                      selectedFile
                        ? "border-emerald-500/60 bg-emerald-500/5"
                        : "border-app-line hover:border-purple-500/60 bg-app-base"
                    }`}
                  >
                    {selectedFile ? (
                      <div className="space-y-2">
                        <div className="w-10 h-10 rounded-2xl bg-emerald-500/20 text-emerald-400 mx-auto flex items-center justify-center">
                          <CheckCircle2 className="w-6 h-6" />
                        </div>
                        <div>
                          <p className="font-bold text-hi text-xs truncate max-w-xs mx-auto">
                            {selectedFile.name}
                          </p>
                          <p className="text-[10px] text-app-mist">
                            {(selectedFile.size / (1024 * 1024)).toFixed(2)} MB • {selectedFile.type || "Media file"}
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => setSelectedFile(null)}
                          className="text-[11px] font-bold text-rose-400 hover:text-rose-300"
                        >
                          Change File
                        </button>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <div className="w-10 h-10 rounded-2xl bg-purple-500/15 text-purple-400 mx-auto flex items-center justify-center">
                          <FileUp className="w-5 h-5" />
                        </div>
                        <div>
                          <p className="font-bold text-hi text-xs">
                            Drag & drop your deliverable file here, or browse
                          </p>
                          <p className="text-[10px] text-app-mist mt-0.5">
                            Supports MP4, MOV, PNG, JPG, PDF, ZIP, PSD up to 500MB
                          </p>
                        </div>
                        <label className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-app-surface hover:bg-app-line-soft border border-app-line text-xs font-bold text-purple-300 cursor-pointer transition-colors">
                          <UploadCloud className="w-3.5 h-3.5" />
                          <span>Browse Local File</span>
                          <input
                            type="file"
                            className="hidden"
                            onChange={(e) => {
                              if (e.target.files && e.target.files[0]) {
                                setSelectedFile(e.target.files[0]);
                              }
                            }}
                          />
                        </label>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                /* ── Cloud URL Mode ── */
                <div>
                  <label className="block font-bold text-app-ink-2 mb-1.5">
                    Cloud Storage URL (Google Drive, Frame.io, Dropbox, Figma, WeTransfer) *
                  </label>
                  <div className="relative">
                    <LinkIcon className="w-3.5 h-3.5 text-app-mist absolute left-3 top-2.5" />
                    <input
                      type="url"
                      required
                      value={assetUrl}
                      onChange={(e) => setAssetUrl(e.target.value)}
                      placeholder="https://drive.google.com/file/d/..."
                      className="w-full pl-9 pr-3 py-2 rounded-xl border border-app-line bg-app-base text-hi focus:outline-none focus:border-purple-400"
                    />
                  </div>
                </div>
              )}

              <div>
                <label className="block font-bold text-app-ink-2 mb-1">
                  Submission Notes & Version Summary (Optional)
                </label>
                <textarea
                  rows={3}
                  value={submissionNotes}
                  onChange={(e) => setSubmissionNotes(e.target.value)}
                  placeholder="e.g. Master render exported in 4K ProRes 422HQ, color graded according to brief tokens."
                  className="w-full px-3 py-2 rounded-xl border border-app-line bg-app-base text-hi focus:outline-none focus:border-purple-400"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-app-line">
                <button
                  type="button"
                  onClick={() => setSelectedTaskForSubmit(null)}
                  className="px-4 py-2 rounded-xl border border-app-line font-bold text-app-mist hover:text-hi hover:bg-app-base"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitBusy}
                  className="px-5 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 font-bold text-app-on-accent! shadow-md flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
                >
                  <Send className="w-3.5 h-3.5" />
                  {submitBusy ? "Uploading & Submitting..." : "Submit to Admin for Review & Publishing"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* History Modal */}
      {historyDeliverable && (
        <DeliverableHistoryModal
          isOpen={true}
          onClose={() => setHistoryDeliverable(null)}
          deliverableId={historyDeliverable.id}
          deliverableTitle={historyDeliverable.title}
        />
      )}
      </div>
    </div>
  );
}

export default FreelancerTasksPage;
