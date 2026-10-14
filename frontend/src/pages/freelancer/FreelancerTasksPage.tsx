import React, { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Briefcase,
  Calendar,
  Clock,
  UploadCloud,
  CheckCircle2,
  AlertCircle,
  FileText,
  ExternalLink,
  Shield,
  Layers,
  Sparkles,
  History,
  X,
  Send,
  Link as LinkIcon,
  Filter,
} from "lucide-react";
import { useAuth } from "../../lib/auth-context";
import { fetchMyFreelancerTasks, submitFreelancerWork, FreelancerAssignedTask } from "../../lib/freelancer-api";
import { fetchDeliverableHistory } from "../../lib/deliverables-api";
import { DeliverableHistoryModal } from "../../components/portal/DeliverableHistoryModal";

export function FreelancerTasksPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [selectedTaskForSubmit, setSelectedTaskForSubmit] = useState<FreelancerAssignedTask | null>(null);
  const [assetUrl, setAssetUrl] = useState("");
  const [submissionNotes, setSubmissionNotes] = useState("");
  const [submitBusy, setSubmitBusy] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitSuccess, setSubmitSuccess] = useState<string | null>(null);

  // History modal
  const [historyDeliverable, setHistoryDeliverable] = useState<{ id: string; title: string } | null>(null);

  const { data: tasks, isLoading, error, refetch } = useQuery({
    queryKey: ["freelancer-my-tasks"],
    queryFn: () => fetchMyFreelancerTasks(),
  });

  const taskList = tasks || [];

  const filteredTasks = taskList.filter((task) => {
    if (filterStatus === "all") return true;
    if (filterStatus === "pending") return task.status === "ASSIGNED" || task.status === "IN_PROGRESS";
    if (filterStatus === "review") return task.status === "IN_REVIEW" || task.status === "READY FOR REVIEW";
    if (filterStatus === "revision") return task.status === "REVISION_REQUESTED";
    if (filterStatus === "completed") return task.status === "APPROVED" || task.status === "COMPLETED";
    return true;
  });

  const handleSubmitWork = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTaskForSubmit || !assetUrl.trim()) {
      setSubmitError("Deliverable asset or project link is required.");
      return;
    }
    setSubmitBusy(true);
    setSubmitError(null);
    try {
      await submitFreelancerWork({
        deliverable_id: selectedTaskForSubmit.deliverable_id,
        asset_url: assetUrl.trim(),
        submission_notes: submissionNotes.trim() || undefined,
      });
      setSubmitSuccess("Deliverable submitted for Team Lead QA review!");
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
  };

  const getStatusBadge = (status: string) => {
    const s = status.toUpperCase();
    if (s === "APPROVED" || s === "COMPLETED") {
      return (
        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 flex items-center gap-1">
          <CheckCircle2 className="w-3 h-3 text-emerald-400" /> Approved
        </span>
      );
    }
    if (s === "REVISION_REQUESTED") {
      return (
        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-amber-500/15 text-amber-400 border border-amber-500/30 flex items-center gap-1">
          <AlertCircle className="w-3 h-3 text-amber-400" /> Revision Requested
        </span>
      );
    }
    if (s === "IN_REVIEW" || s === "READY FOR REVIEW") {
      return (
        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-blue-500/15 text-blue-400 border border-blue-500/30 flex items-center gap-1">
          <Clock className="w-3 h-3 text-blue-400" /> In QA Review
        </span>
      );
    }
    return (
      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-purple-500/15 text-purple-300 border border-purple-500/30 flex items-center gap-1">
        <Sparkles className="w-3 h-3 text-purple-300" /> Assigned / In Progress
      </span>
    );
  };

  return (
    <div className="min-h-screen bg-[#0B111C] text-white p-4 sm:p-8 space-y-6">
      {/* Header & Role Scoping Notification */}
      <div className="bg-[#161F2D] rounded-3xl p-6 sm:p-8 border border-[#2A3446] shadow-xl relative overflow-hidden space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-purple-500/20 text-purple-300 border border-purple-500/30">
                Freelancer Workstation
              </span>
              <span className="text-xs text-[#97A0B3]">Signed in as {user?.email}</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
              Assigned Tasks & Deliverables
            </h1>
            <p className="text-xs text-[#97A0B3]">
              Review creative briefs, download reference assets, and submit completed deliverables for Team Lead approval.
            </p>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-auto">
            <button
              onClick={() => refetch()}
              className="px-3.5 py-2 rounded-xl bg-[#0B111C] border border-[#2A3446] text-xs font-bold text-[#F1F5F9] hover:text-white hover:border-[#7FA0D6] transition-all cursor-pointer"
            >
              Refresh Tasks
            </button>
          </div>
        </div>

        {/* Security & Access Restriction Callout */}
        <div className="p-3 bg-purple-500/10 border border-purple-500/25 rounded-2xl flex items-center gap-2.5 text-xs text-purple-200">
          <Shield className="w-4 h-4 text-purple-400 shrink-0" />
          <span>
            <strong>Role-Based Access Active:</strong> You are granted focused access exclusively to your assigned deliverables and project briefs. Internal billing, retainer financials, and agency admin settings are protected.
          </span>
        </div>
      </div>

      {submitSuccess && (
        <div className="p-4 bg-emerald-500/15 border border-emerald-500/40 rounded-2xl text-xs font-bold text-emerald-300 flex items-center gap-2 animate-fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          {submitSuccess}
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-3.5">
        <div className="bg-[#161F2D] rounded-2xl p-4 border border-[#2A3446] space-y-1">
          <span className="text-[10px] font-black text-[#97A0B3] uppercase tracking-wider">Total Assigned</span>
          <p className="text-2xl font-black text-white">{taskList.length}</p>
        </div>
        <div className="bg-[#161F2D] rounded-2xl p-4 border border-[#2A3446] space-y-1">
          <span className="text-[10px] font-black text-[#97A0B3] uppercase tracking-wider">In Progress</span>
          <p className="text-2xl font-black text-purple-400">
            {taskList.filter((t) => t.status === "ASSIGNED" || t.status === "IN_PROGRESS").length}
          </p>
        </div>
        <div className="bg-[#161F2D] rounded-2xl p-4 border border-[#2A3446] space-y-1">
          <span className="text-[10px] font-black text-[#97A0B3] uppercase tracking-wider">In QA Review</span>
          <p className="text-2xl font-black text-blue-400">
            {taskList.filter((t) => t.status === "IN_REVIEW" || t.status === "READY FOR REVIEW").length}
          </p>
        </div>
        <div className="bg-[#161F2D] rounded-2xl p-4 border border-[#2A3446] space-y-1">
          <span className="text-[10px] font-black text-[#97A0B3] uppercase tracking-wider">Completed / Approved</span>
          <p className="text-2xl font-black text-emerald-400">
            {taskList.filter((t) => t.status === "APPROVED" || t.status === "COMPLETED").length}
          </p>
        </div>
      </div>

      {/* Filters Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-[#161F2D] p-3 rounded-2xl border border-[#2A3446]">
        <div className="flex items-center gap-1.5 overflow-x-auto">
          <Filter className="w-3.5 h-3.5 text-[#97A0B3] ml-2 mr-1" />
          {[
            { key: "all", label: "All Tasks" },
            { key: "pending", label: "In Progress" },
            { key: "review", label: "In Review" },
            { key: "revision", label: "Revisions Needed" },
            { key: "completed", label: "Approved" },
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setFilterStatus(tab.key)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                filterStatus === tab.key
                  ? "bg-purple-600 text-white shadow-md"
                  : "text-[#97A0B3] hover:text-white hover:bg-[#0B111C]"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
        <span className="text-xs text-[#97A0B3] pr-2">
          Showing {filteredTasks.length} {filteredTasks.length === 1 ? "task" : "tasks"}
        </span>
      </div>

      {/* Task Cards List */}
      {isLoading ? (
        <div className="text-center py-16 text-sm text-[#97A0B3]">Loading assigned tasks...</div>
      ) : filteredTasks.length === 0 ? (
        <div className="bg-[#161F2D] rounded-3xl p-12 text-center border border-[#2A3446] space-y-3">
          <Briefcase className="w-10 h-10 text-[#97A0B3] mx-auto opacity-40" />
          <h3 className="text-base font-bold text-white">No tasks matching current filter</h3>
          <p className="text-xs text-[#97A0B3] max-w-sm mx-auto">
            You will receive task assignments with briefs and asset references directly from the agency Team Lead.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredTasks.map((task) => (
            <div
              key={task.id}
              className="bg-[#161F2D] rounded-3xl p-5 sm:p-6 border border-[#2A3446] shadow-lg hover:border-purple-500/40 transition-all flex flex-col justify-between space-y-4"
            >
              <div className="space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="space-y-0.5">
                    <span className="text-[10px] font-black text-purple-400 uppercase tracking-wider">
                      Client: {task.client_name}
                    </span>
                    <h3 className="text-base font-bold text-white">{task.title}</h3>
                  </div>
                  {getStatusBadge(task.status)}
                </div>

                <div className="flex flex-wrap items-center gap-2 text-[11px] text-[#97A0B3]">
                  <span className="px-2 py-0.5 rounded-lg bg-[#0B111C] border border-[#2A3446] font-mono text-purple-300">
                    {task.format}
                  </span>
                  <span className="flex items-center gap-1">
                    <Calendar className="w-3 h-3 text-[#97A0B3]" /> Due: {task.due_date}
                  </span>
                </div>

                {task.description && (
                  <div className="p-3 bg-[#0B111C] rounded-2xl text-xs text-[#F1F5F9] border border-[#2A3446] space-y-1">
                    <span className="font-bold text-[#97A0B3] block text-[10px] uppercase">Creative Brief & Scope</span>
                    <p className="line-clamp-3 text-xs leading-relaxed">{task.description}</p>
                  </div>
                )}

                {task.brief_url && (
                  <a
                    href={task.brief_url}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 text-xs text-purple-400 hover:text-purple-300 font-bold hover:underline"
                  >
                    <ExternalLink className="w-3.5 h-3.5" /> Open Reference Brief / Assets
                  </a>
                )}
              </div>

              <div className="pt-3 border-t border-[#2A3446] flex items-center justify-between gap-2">
                <button
                  type="button"
                  onClick={() => setHistoryDeliverable({ id: task.deliverable_id, title: task.title })}
                  className="px-3 py-1.5 rounded-xl border border-[#2A3446] text-xs font-bold text-[#97A0B3] hover:text-white hover:bg-[#0B111C] flex items-center gap-1.5 cursor-pointer"
                >
                  <History className="w-3.5 h-3.5 text-[#97A0B3]" /> History
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setSelectedTaskForSubmit(task);
                    setSubmitError(null);
                  }}
                  className="px-4 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold shadow-md flex items-center gap-1.5 cursor-pointer transition-all"
                >
                  <UploadCloud className="w-3.5 h-3.5" />
                  {task.status === "REVISION_REQUESTED" ? "Submit Revised Work" : "Upload / Submit Work"}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Submission Modal */}
      {selectedTaskForSubmit && (
        <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-fade-in">
          <div className="bg-[#161F2D] rounded-3xl max-w-md w-full p-6 shadow-2xl border border-purple-500/40 space-y-4">
            <div className="flex items-center justify-between border-b border-[#2A3446] pb-3">
              <div className="flex items-center gap-2">
                <UploadCloud className="w-5 h-5 text-purple-400" />
                <div>
                  <h3 className="text-base font-bold text-white">Submit Completed Work</h3>
                  <p className="text-[11px] text-[#97A0B3]">Deliverable: {selectedTaskForSubmit.title}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedTaskForSubmit(null)}
                className="p-1.5 text-[#97A0B3] hover:text-white rounded-lg hover:bg-[#0B111C]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {submitError && (
              <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-xs text-rose-300">
                {submitError}
              </div>
            )}

            <form onSubmit={handleSubmitWork} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-bold text-[#F1F5F9] mb-1">
                  Asset / Export URL (Figma, Google Drive, Frame.io, Dropbox) *
                </label>
                <div className="relative">
                  <LinkIcon className="w-3.5 h-3.5 text-[#97A0B3] absolute left-3 top-2.5" />
                  <input
                    type="url"
                    required
                    value={assetUrl}
                    onChange={(e) => setAssetUrl(e.target.value)}
                    placeholder="https://drive.google.com/file/d/..."
                    className="w-full pl-9 pr-3 py-2 rounded-xl border border-[#2A3446] bg-[#0B111C] text-white focus:outline-none focus:border-purple-400"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-[#F1F5F9] mb-1">
                  Submission Notes / Change Summary (Optional)
                </label>
                <textarea
                  rows={3}
                  value={submissionNotes}
                  onChange={(e) => setSubmissionNotes(e.target.value)}
                  placeholder="e.g. Master render exported in 4K ProRes 422HQ, audio mastered at -14 LUFS according to brief specifications."
                  className="w-full px-3 py-2 rounded-xl border border-[#2A3446] bg-[#0B111C] text-white focus:outline-none focus:border-purple-400"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-[#2A3446]">
                <button
                  type="button"
                  onClick={() => setSelectedTaskForSubmit(null)}
                  className="px-4 py-2 rounded-xl border border-[#2A3446] font-bold text-[#97A0B3] hover:text-white hover:bg-[#0B111C]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitBusy}
                  className="px-5 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 font-bold text-white shadow-md flex items-center gap-1.5 disabled:opacity-50"
                >
                  <Send className="w-3.5 h-3.5" />
                  {submitBusy ? "Submitting..." : "Submit to Team Lead"}
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
  );
}
export default FreelancerTasksPage;
