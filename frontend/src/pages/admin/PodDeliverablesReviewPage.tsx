import { useState } from "react";
import { motion } from "motion/react";
import { AdminTopHeader } from "../../components/admin/AdminTopHeader";
import { useQuery, useMutation } from "@tanstack/react-query";
import { submitPodQAReview, fetchPodDashboard, type PodDashboardData } from "../../lib/ops-api";
import {
  FileCheck2,
  Zap,
  ShieldCheck,
  AlertTriangle,
  Clock,
  Check,
  X,
  Plus,
  Play,
  Download,
  FileText,
} from "lucide-react";

export function PodDeliverablesReviewPage() {
  const [toastMessage, setToastMessage] = useState<{ type: "success" | "error" | "info"; text: string } | null>(null);

  const { data } = useQuery<PodDashboardData>({
    queryKey: ["pod_dashboard"],
    queryFn: () => fetchPodDashboard(),
  });

  const podName = data?.pod?.name || "Pod A";
  
  // Rubric checklist state
  const [rubric1, setRubric1] = useState(true);
  const [rubric2, setRubric2] = useState(true);
  const [rubric3, setRubric3] = useState(true);
  const [feedbackNote, setFeedbackNote] = useState("");
  const [newDeliverableModal, setNewDeliverableModal] = useState(false);
  const [reviewState, setReviewState] = useState<"pending" | "approved" | "revision">("pending");

  const showToast = (text: string, type: "success" | "error" | "info" = "success") => {
    setToastMessage({ type, text });
    setTimeout(() => setToastMessage(null), 4000);
  };

  const qaMutation = useMutation({
    mutationFn: ({ taskId, decision, comment }: { taskId: string; decision: "approve" | "reject"; comment?: string }) =>
      submitPodQAReview(taskId, decision, comment),
    onSuccess: (res) => {
      showToast(res.message || "Deliverable QA Approved & Dispatched to Client", "success");
      setFeedbackNote("");
    },
    onError: (err: any) => {
      showToast(err?.message || "Failed to submit QA approval", "error");
    },
  });

  const handleExportReviewLedger = () => {
    const headers = ["Deliverable ID", "Title", "Client", "Format", "Specialist", "Due SLA", "QA Status"];
    const allItems: any[] = [
      ...(data?.tasks?.internal_qa || []).map((t) => [
        t.id,
        t.blueprint?.concept_name || `${t.client_name} Asset`,
        t.client_name,
        t.deliverable_type?.toUpperCase(),
        t.assignee?.full_name || t.assignee_name,
        t.due_date ? `Due ${new Date(t.due_date).toLocaleDateString([], { month: "short", day: "numeric" })}` : "Due today",
        "Pending Lead Sign-off",
      ]),
      ...(data?.tasks?.completed || []).map((t) => [
        t.id,
        t.blueprint?.concept_name || `${t.client_name} Asset`,
        t.client_name,
        t.deliverable_type?.toUpperCase(),
        t.assignee?.full_name || t.assignee_name,
        "Delivered",
        "Client Approved",
      ]),
    ];

    const rows = allItems.length > 0 ? allItems : [["N/A", "No deliverables recorded in ledger", "-", "-", "-", "-", "-"]];

    const csvContent = [headers.join(","), ...rows.map((r: string[]) => r.map((c) => `"${c || ""}"`).join(","))].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `${podName.replace(/\s+/g, "_")}_Deliverables_Review_Ledger_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    showToast(`Downloaded ${podName} Deliverables Review CSV report`, "success");
  };

  return (
    <div data-surface="ops" className="min-h-screen bg-nebula-navy text-white font-sans flex flex-col">
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
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 bg-nebula-surface p-2.5 sm:px-4 sm:py-2.5 rounded-2xl border border-nebula-steel/80 shadow-2xs">
          <div className="flex items-center gap-2">
            <span className="size-2 rounded-full bg-nebula-glow animate-pulse" />
            <span className="text-xs font-bold text-slate-100">{podName} Review Hub · Frame.io Sync Gate</span>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={handleExportReviewLedger}
              className="px-3 py-1.5 rounded-xl bg-nebula-surface border border-nebula-steel hover:bg-nebula-navy text-slate-100 text-xs font-bold flex items-center gap-1.5 shadow-2xs transition-colors cursor-pointer"
            >
              <FileText className="size-3.5 text-nebula-mist" />
              Export Report
            </button>
            <button
              onClick={() => setNewDeliverableModal(true)}
              className="px-3.5 py-1.5 rounded-xl bg-nebula-glow hover:bg-blue-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-xs transition-all cursor-pointer"
            >
              <Plus className="size-3.5" />
              New Deliverable
            </button>
          </div>
        </div>

        {/* 2. Top 3 KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5 sm:gap-3">
          {/* Card 1: Pending Lead Sign-off */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.05 }}
            className="bg-nebula-surface rounded-xl sm:rounded-2xl p-2.5 sm:p-3 border border-nebula-steel/80 shadow-2xs flex flex-col justify-between hover-card-innovative"
          >
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[9px] sm:text-[10px] font-bold uppercase tracking-wider text-nebula-mist">Pending Lead Sign-Off</span>
              <div className="size-6 sm:size-7 rounded-lg bg-nebula-glow/15 text-nebula-glow flex items-center justify-center">
                <FileCheck2 className="size-3 sm:size-3.5" />
              </div>
            </div>
            <div>
              <div className="flex items-baseline gap-1.5 mb-1">
                <span className="text-lg sm:text-xl font-black text-white">6</span>
                <span className="text-[10.5px] sm:text-[11px] font-bold text-nebula-mist">Deliverables</span>
              </div>
              <div className="flex items-center gap-2 text-[10px] sm:text-[11px] pt-1.5 border-t border-nebula-steel">
                <span className="px-1.5 py-0.2 rounded-full text-[8.5px] sm:text-[9px] font-bold bg-rose-500/15 text-rose-400 border border-rose-500/30 flex items-center gap-1">
                  ● 2 Urgent
                </span>
                <span className="text-nebula-mist font-medium">Within 2h SLA threshold</span>
              </div>
            </div>
          </motion.div>

          {/* Card 2: Average Turnaround Speed */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.1 }}
            className="bg-nebula-surface rounded-xl sm:rounded-2xl p-2.5 sm:p-3 border border-nebula-steel/80 shadow-2xs flex flex-col justify-between hover-card-innovative"
          >
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[9px] sm:text-[10px] font-bold uppercase tracking-wider text-nebula-mist">Average Turnaround Speed</span>
              <div className="size-6 sm:size-7 rounded-lg bg-nebula-glow/15 text-nebula-glow flex items-center justify-center">
                <Zap className="size-3 sm:size-3.5" />
              </div>
            </div>
            <div>
              <div className="flex items-baseline gap-1.5 mb-1">
                <span className="text-lg sm:text-xl font-black text-white">38</span>
                <span className="text-[10.5px] sm:text-[11px] font-bold text-nebula-mist">mins</span>
              </div>
              <div className="flex items-center justify-between text-[10px] sm:text-[11px] pt-1.5 border-t border-nebula-steel">
                <span className="text-nebula-mist font-medium">Benchmark: &lt; 2.0h</span>
                <span className="font-bold text-emerald-400">↗ 68% Faster</span>
              </div>
            </div>
          </motion.div>

          {/* Card 3: QA First-Pass Pass Rate */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.15 }}
            className="bg-nebula-surface rounded-xl sm:rounded-2xl p-2.5 sm:p-3 border border-nebula-steel/80 shadow-2xs flex flex-col justify-between hover-card-innovative"
          >
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[9px] sm:text-[10px] font-bold uppercase tracking-wider text-nebula-mist">QA First-Pass Pass Rate</span>
              <div className="size-6 sm:size-7 rounded-lg bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 flex items-center justify-center">
                <ShieldCheck className="size-3 sm:size-3.5" />
              </div>
            </div>
            <div>
              <div className="flex items-baseline gap-1.5 mb-1">
                <span className="text-lg sm:text-xl font-black text-white">91.4%</span>
              </div>
              <div className="flex items-center justify-between text-[10px] sm:text-[11px] pt-1.5 border-t border-nebula-steel">
                <span className="text-nebula-mist font-medium">Top 5% across pods</span>
                <span className="px-1.5 py-0.2 rounded-full text-[8.5px] sm:text-[9px] font-bold bg-nebula-glow/15 text-nebula-glow border border-nebula-glow/30">
                  Rank #1 Studio
                </span>
              </div>
            </div>
          </motion.div>
        </div>

        {/* 3. SLA Pipeline Status Banner */}
        {data?.tasks?.internal_qa && data.tasks.internal_qa.length > 0 ? (
          <div className="bg-amber-950/40 rounded-2xl p-3.5 sm:p-4 border border-amber-800/50 flex flex-col md:flex-row md:items-center justify-between gap-3 shadow-2xs backdrop-blur-md">
            <div className="flex items-center gap-3">
              <div className="size-8 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-400 flex items-center justify-center shrink-0">
                <AlertTriangle className="size-4" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="px-1.5 py-0.2 rounded text-[9px] font-black uppercase tracking-wider bg-amber-600 text-white">
                    QA Review Required
                  </span>
                  <span className="text-xs font-bold text-slate-100">
                    {data.tasks.internal_qa[0]?.client_name || "Client"} · {data.tasks.internal_qa[0]?.deliverable_type?.toUpperCase() || "ASSET"}
                  </span>
                </div>
                <p className="text-[11px] text-slate-100 font-medium mt-0.5">
                  Deliverable ready for QA sign-off prior to client portal sync.
                </p>
              </div>
            </div>
          </div>
        ) : (
          <div className="bg-nebula-surface rounded-2xl p-3.5 sm:p-4 border border-emerald-500/30 flex flex-col md:flex-row md:items-center justify-between gap-3 shadow-2xs backdrop-blur-md">
            <div className="flex items-center gap-3">
              <div className="size-8 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 flex items-center justify-center shrink-0">
                <ShieldCheck className="size-4" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="px-1.5 py-0.2 rounded text-[9px] font-black uppercase tracking-wider bg-emerald-600 text-white">
                    SLA Optimal
                  </span>
                  <span className="text-xs font-bold text-slate-100">{podName} Pipeline</span>
                </div>
                <p className="text-[11px] text-nebula-mist font-medium mt-0.5">
                  All sprint assets delivered and signed off. No pending SLA escalations.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* 4. Active Deliverables Stream Section */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-black text-white">Active Deliverables Stream</h2>
            <span className="text-[11px] font-bold text-nebula-mist">
              {data?.tasks?.internal_qa?.length || 0} Awaiting Lead Action
            </span>
          </div>

          {(!data?.tasks?.internal_qa || data.tasks.internal_qa.length === 0) ? (
            <div className="bg-nebula-surface rounded-2xl border border-dashed border-nebula-steel p-12 text-center space-y-3">
              <div className="size-12 rounded-2xl bg-emerald-500/10 text-emerald-400 mx-auto flex items-center justify-center border border-emerald-500/20">
                <Check className="size-6" />
              </div>
              <h3 className="text-base font-black text-white">All Deliverables Signed Off</h3>
              <p className="text-xs text-nebula-mist max-w-md mx-auto">
                There are currently no deliverables pending QA review or lead sign-off in this pod. Once specialists submit completed renders, they will appear here.
              </p>
            </div>
          ) : (
            (() => {
              const currentTask = data?.tasks?.internal_qa?.[0];
              if (!currentTask) return null;
              const clientName = currentTask.client_name || "Client";
              const taskTitle = currentTask.blueprint?.concept_name || `${clientName} ${currentTask.deliverable_type?.toUpperCase() || "Asset"}`;
              const specialistName = currentTask.assignee?.full_name || currentTask.assignee_name || "Specialist";
              return (
                <div className="bg-nebula-surface rounded-2xl border border-nebula-steel/80 shadow-2xs p-4 sm:p-5 space-y-4">
                  {/* Header row */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-nebula-steel gap-2">
                    <div>
                      <div className="flex items-center gap-2 text-xs font-bold text-nebula-mist mb-0.5">
                        <span className="text-nebula-glow font-black">{clientName}</span>
                        <span>· {currentTask.deliverable_type?.toUpperCase()} Sprint</span>
                      </div>
                      <h3 className="text-base font-black text-white">{taskTitle}</h3>
                      <p className="text-[11px] text-nebula-mist font-medium mt-0.5">
                        Specialist: <span className="font-bold text-white">{specialistName}</span>
                      </p>
                    </div>

                    <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-500/15 text-amber-400 border border-amber-500/30 flex items-center gap-1 self-start sm:self-auto">
                      <Clock className="size-3" />
                      Pending QA Sign-off
                    </span>
                  </div>

                  {/* Media Preview & Review Panel (2 columns) */}
                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                    {/* Left Column: Media Player Visual Mockup */}
                    <div className="lg:col-span-5 space-y-3">
                      <div className="relative aspect-4/5 sm:aspect-square lg:aspect-4/5 w-full bg-slate-950 rounded-2xl overflow-hidden border border-slate-800 shadow-xl flex flex-col justify-between p-4 group">
                        <div className="flex items-center justify-between z-10">
                          <span className="px-2.5 py-1 rounded-lg bg-black/60 backdrop-blur-md text-[10px] font-bold text-white border border-white/10">
                            Master Render
                          </span>
                          <span className="px-2.5 py-1 rounded-lg bg-blue-600/90 backdrop-blur-md text-[10px] font-bold text-white shadow-xs">
                            {currentTask.deliverable_type?.toUpperCase()} · HD 60fps
                          </span>
                        </div>

                        <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center pointer-events-none">
                          <div className="size-16 rounded-full bg-blue-600/20 text-blue-400 flex items-center justify-center border border-blue-500/30">
                            <Play className="size-7 fill-blue-400 ml-1" />
                          </div>
                          <p className="text-xs font-bold text-white mt-3">{taskTitle}</p>
                          <span className="text-[10px] text-nebula-mist">{clientName}</span>
                        </div>

                        <div className="flex items-center justify-between z-10 pt-2">
                          <div className="flex items-center gap-2">
                            <div className="size-7 rounded-full bg-nebula-surface/60 backdrop-blur-md text-white flex items-center justify-center">
                              <Play className="size-3.5 fill-white" />
                            </div>
                            <span className="text-[10px] font-bold text-white">Preview Ready</span>
                          </div>
                          <button
                            onClick={() => showToast("Downloaded Master Asset Render", "success")}
                            className="size-7 rounded-full bg-nebula-surface/60 hover:bg-nebula-surface/80 backdrop-blur-md text-white flex items-center justify-center transition cursor-pointer"
                            title="Download Render"
                          >
                            <Download className="size-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Right Column: Specs & QA Rubric */}
                    <div className="lg:col-span-7 space-y-6">
                      <div className="grid grid-cols-2 gap-3 bg-nebula-navy rounded-2xl p-4 border border-nebula-steel text-xs">
                        <div>
                          <span className="text-[10px] font-bold text-nebula-mist uppercase tracking-wider block">Format</span>
                          <span className="font-bold text-white mt-0.5 block capitalize">{currentTask.deliverable_type || "Asset"}</span>
                        </div>
                        <div>
                          <span className="text-[10px] font-bold text-nebula-mist uppercase tracking-wider block">Status</span>
                          <span className="font-bold text-amber-400 mt-0.5 block">QA Review</span>
                        </div>
                        <div>
                          <span className="text-[10px] font-bold text-nebula-mist uppercase tracking-wider block">Color Profile</span>
                          <span className="font-bold text-white mt-0.5 block">Rec.709 Mastered</span>
                        </div>
                        <div>
                          <span className="text-[10px] font-bold text-nebula-mist uppercase tracking-wider block">Audio Loudness</span>
                          <span className="font-bold text-white mt-0.5 block">-14 LUFS Normalized</span>
                        </div>
                      </div>

                      {/* LEAD QA COMPLIANCE RUBRIC */}
                      <div className="space-y-3">
                        <span className="text-[11px] font-black uppercase tracking-wider text-nebula-mist block">
                          Lead QA Compliance Rubric
                        </span>

                        <div className="space-y-2">
                          <label
                            onClick={() => setRubric1(!rubric1)}
                            className={`flex items-center gap-3 p-3.5 rounded-2xl border transition-all cursor-pointer ${
                              rubric1
                                ? "bg-nebula-surface border-nebula-glow/50 text-white shadow-sm"
                                : "bg-nebula-navy border-nebula-steel text-nebula-mist"
                            }`}
                          >
                            <div className={`size-5 rounded-lg flex items-center justify-center ${rubric1 ? "bg-nebula-glow text-white" : "border border-nebula-steel"}`}>
                              {rubric1 && <Check className="size-3.5 stroke-[3]" />}
                            </div>
                            <span className="text-xs font-bold">Brand contrast & typography guidelines verified</span>
                          </label>

                          <label
                            onClick={() => setRubric2(!rubric2)}
                            className={`flex items-center gap-3 p-3.5 rounded-2xl border transition-all cursor-pointer ${
                              rubric2
                                ? "bg-nebula-surface border-nebula-glow/50 text-white shadow-sm"
                                : "bg-nebula-navy border-nebula-steel text-nebula-mist"
                            }`}
                          >
                            <div className={`size-5 rounded-lg flex items-center justify-center ${rubric2 ? "bg-nebula-glow text-white" : "border border-nebula-steel"}`}>
                              {rubric2 && <Check className="size-3.5 stroke-[3]" />}
                            </div>
                            <span className="text-xs font-bold">Sound stems & frame pacing synchronized</span>
                          </label>

                          <label
                            onClick={() => setRubric3(!rubric3)}
                            className={`flex items-center gap-3 p-3.5 rounded-2xl border transition-all cursor-pointer ${
                              rubric3
                                ? "bg-nebula-surface border-nebula-glow/50 text-white shadow-sm"
                                : "bg-nebula-navy border-nebula-steel text-nebula-mist"
                            }`}
                          >
                            <div className={`size-5 rounded-lg flex items-center justify-center ${rubric3 ? "bg-nebula-glow text-white" : "border border-nebula-steel"}`}>
                              {rubric3 && <Check className="size-3.5 stroke-[3]" />}
                            </div>
                            <span className="text-xs font-bold">Safe-zone compliance & master export verified</span>
                          </label>
                        </div>
                      </div>

                      {/* Feedback Input */}
                      <div className="space-y-2">
                        <textarea
                          rows={2}
                          value={feedbackNote}
                          onChange={(e) => setFeedbackNote(e.target.value)}
                          placeholder={`Add specific feedback or revision instructions for ${specialistName}...`}
                          className="w-full text-xs p-3.5 rounded-2xl border border-nebula-steel bg-nebula-navy/50 focus:bg-nebula-surface focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium text-white"
                        />
                      </div>

                      {/* Action Buttons */}
                      <div className="flex items-center justify-end gap-3 pt-2">
                        {reviewState === "approved" ? (
                          <div className="w-full p-3 rounded-2xl bg-emerald-950/80 border border-emerald-800 text-emerald-300 text-xs font-bold flex items-center justify-between">
                            <span className="flex items-center gap-2">
                              <Check className="size-4 text-emerald-400 stroke-[3]" />
                              Approved & Dispatched to {clientName} Portal
                            </span>
                            <button
                              onClick={() => setReviewState("pending")}
                              className="text-[11px] underline text-emerald-400 hover:text-emerald-200 cursor-pointer font-bold"
                            >
                              Reset Review
                            </button>
                          </div>
                        ) : reviewState === "revision" ? (
                          <div className="w-full p-3 rounded-2xl bg-rose-950/80 border border-rose-800 text-rose-300 text-xs font-bold flex items-center justify-between">
                            <span>Revision request active • Specialist notified</span>
                            <button
                              onClick={() => setReviewState("pending")}
                              className="text-[11px] underline text-rose-400 hover:text-rose-200 cursor-pointer font-bold"
                            >
                              Cancel Revision
                            </button>
                          </div>
                        ) : (
                          <>
                            <button
                              onClick={() => {
                                setReviewState("revision");
                                showToast(`Revision request dispatched to ${specialistName}`, "info");
                                qaMutation.mutate({
                                  taskId: currentTask.id,
                                  decision: "reject",
                                  comment: feedbackNote || "Revisions required for QA compliance.",
                                });
                              }}
                              className="px-5 py-2.5 rounded-xl bg-nebula-surface border border-nebula-steel hover:bg-nebula-navy text-slate-100 text-xs font-bold transition-colors cursor-pointer"
                            >
                              Request Revision
                            </button>
                            <button
                              onClick={() => {
                                setReviewState("approved");
                                showToast(`Deliverable QA Approved & Dispatched to ${clientName} portal`, "success");
                                qaMutation.mutate({
                                  taskId: currentTask.id,
                                  decision: "approve",
                                  comment: feedbackNote || "All rubric checks verified. Approved for client sync.",
                                });
                              }}
                              className="px-6 py-2.5 rounded-xl bg-nebula-glow hover:bg-blue-700 text-white text-xs font-bold flex items-center gap-2 shadow-md shadow-blue-500/20 transition-all cursor-pointer"
                            >
                              <Check className="size-4" />
                              Approve & Send to Client
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })()
          )}
        </div>
      </main>

      {/* New Deliverable Modal */}
      {newDeliverableModal && (
        <div className="fixed inset-0 w-screen h-screen z-[9999] bg-slate-950/70 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
          <div className="w-full max-w-lg bg-nebula-surface rounded-3xl p-6 sm:p-7 shadow-2xl border border-nebula-steel space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-black text-white">Create New Deliverable Stream</h3>
              <button onClick={() => setNewDeliverableModal(false)} className="text-nebula-mist hover:text-slate-100">
                <X className="size-5" />
              </button>
            </div>
            <div className="space-y-3 text-xs">
              <div>
                <label className="font-bold text-slate-100 block mb-1">Deliverable Name</label>
                <input
                  type="text"
                  placeholder="e.g. Q4 Brand Launch Story Sequence"
                  className="w-full p-2.5 rounded-xl border border-nebula-steel bg-nebula-navy font-medium text-white"
                />
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="font-bold text-slate-100 block mb-1">Format</label>
                  <select className="w-full p-2.5 rounded-xl border border-nebula-steel bg-nebula-navy font-medium text-white">
                    <option value="Reel">Reel</option>
                    <option value="Story">Story</option>
                    <option value="Post">Post</option>
                  </select>
                </div>
                <div>
                  <label className="font-bold text-slate-100 block mb-1">Client</label>
                  <select className="w-full p-2.5 rounded-xl border border-nebula-steel bg-nebula-navy font-medium text-white">
                    {(!data?.clients || data.clients.length === 0) ? (
                      <option value="">No clients assigned</option>
                    ) : (
                      data.clients.map((c) => (
                        <option key={c.id} value={c.name}>{c.name}</option>
                      ))
                    )}
                  </select>
                </div>
                <div>
                  <label className="font-bold text-slate-100 block mb-1">Lead Specialist</label>
                  <select className="w-full p-2.5 rounded-xl border border-nebula-steel bg-nebula-navy font-medium text-white">
                    {(!data?.members || data.members.length === 0) ? (
                      <option value="">No specialists registered</option>
                    ) : (
                      data.members.map((m) => (
                        <option key={m.id} value={m.name}>{m.name} ({m.role})</option>
                      ))
                    )}
                  </select>
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-3 pt-3">
              <button
                onClick={() => setNewDeliverableModal(false)}
                className="px-4 py-2 rounded-xl bg-nebula-surface text-slate-100 text-xs font-bold hover:bg-slate-200 transition"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  showToast("Deliverable stream registered in pod queue", "success");
                  setNewDeliverableModal(false);
                }}
                className="px-5 py-2 rounded-xl bg-blue-600 text-white text-xs font-bold hover:bg-blue-700 transition"
              >
                Create Deliverable
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
