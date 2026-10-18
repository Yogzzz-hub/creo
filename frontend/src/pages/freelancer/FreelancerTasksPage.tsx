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
  Shield,
  Sparkles,
  History,
  X,
  Send,
  Link as LinkIcon,
  Filter,
  Calculator,
  IndianRupee,
  Wallet,
  Play,
  FileUp,
  SlidersHorizontal,
  ChevronUp,
} from "lucide-react";
import { useAuth } from "../../lib/auth-context";
import {
  fetchMyFreelancerTasks,
  submitFreelancerWork,
  startFreelancerTask,
  uploadFreelancerContentFile,
  FreelancerAssignedTask,
} from "../../lib/freelancer-api";
import { DeliverableHistoryModal } from "../../components/portal/DeliverableHistoryModal";

export function FreelancerTasksPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const [filterStatus, setFilterStatus] = useState<string>("all");
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

  // Interactive Earnings Calculator State
  const [showCalculator, setShowCalculator] = useState(true);
  const [baseDeliverableRate, setBaseDeliverableRate] = useState<number>(4500);
  const [projectedMonthlyUnits, setProjectedMonthlyUnits] = useState<number>(6);

  // History modal
  const [historyDeliverable, setHistoryDeliverable] = useState<{ id: string; title: string } | null>(null);

  const { data: tasks, isLoading, refetch } = useQuery({
    queryKey: ["freelancer-my-tasks"],
    queryFn: () => fetchMyFreelancerTasks(),
  });

  const taskList = tasks || [];

  const filteredTasks = taskList.filter((task) => {
    if (filterStatus === "all") return true;
    if (filterStatus === "pending") return task.status === "ASSIGNED" || task.status === "IN_PROGRESS";
    if (filterStatus === "review") return task.status === "IN_REVIEW" || task.status === "READY FOR REVIEW" || task.status === "INTERNAL_QA";
    if (filterStatus === "revision") return task.status === "REVISION_REQUESTED";
    if (filterStatus === "completed") return task.status === "APPROVED" || task.status === "COMPLETED";
    return true;
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
      const s = (t.status || "").toUpperCase();
      if (s === "APPROVED" || s === "COMPLETED") {
        earnedSettled += fee;
        completedCount++;
      } else if (s === "IN_REVIEW" || s === "READY FOR REVIEW" || s === "INTERNAL_QA") {
        pendingReview += fee;
        reviewCount++;
      } else {
        activeInProgress += fee;
        activeCount++;
      }
    });

    const projectedMonthly = baseDeliverableRate * projectedMonthlyUnits;
    const projectedWeekly = Math.round(projectedMonthly / 4);

    return {
      earnedSettled,
      pendingReview,
      activeInProgress,
      completedCount,
      reviewCount,
      activeCount,
      totalPipeline: earnedSettled + pendingReview + activeInProgress,
      projectedMonthly,
      projectedWeekly,
    };
  }, [taskList, baseDeliverableRate, projectedMonthlyUnits]);

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
        setSubmitSuccess(`Content '${selectedFile.name}' uploaded and submitted for Team Lead QA!`);
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
        setSubmitSuccess("Deliverable cloud link submitted for Team Lead QA review!");
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
    if (s === "IN_REVIEW" || s === "READY FOR REVIEW" || s === "INTERNAL_QA") {
      return (
        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-blue-500/15 text-blue-400 border border-blue-500/30 flex items-center gap-1">
          <Clock className="w-3 h-3 text-blue-400" /> In QA Review
        </span>
      );
    }
    return (
      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-purple-500/15 text-purple-300 border border-purple-500/30 flex items-center gap-1">
        <Sparkles className="w-3 h-3 text-purple-300" /> In Progress
      </span>
    );
  };

  return (
    <div className="min-h-screen bg-[#0B111C] text-white p-4 sm:p-8 space-y-6">
      {/* Header & Role Scoping Notification */}
      <div className="bg-[#161F2D] rounded-3xl p-6 sm:p-8 border border-[#2A3446] shadow-xl relative overflow-hidden space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-purple-600 to-indigo-600 flex items-center justify-center text-white shadow-md shadow-purple-500/20 font-black">
              <Briefcase className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-purple-500/20 text-purple-300 border border-purple-500/30">
                  Freelancer Workstation
                </span>
                <span className="text-xs text-[#97A0B3]">Signed in as {user?.email}</span>
              </div>
              <p className="text-xs text-[#BCCCE6] mt-0.5">
                Work on assigned deliverables, upload completed video/graphics content, and track your milestone earnings.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-auto">
            <button
              onClick={() => setShowCalculator(!showCalculator)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-purple-600/20 hover:bg-purple-600/30 border border-purple-500/30 text-xs font-bold text-purple-300 transition-all cursor-pointer"
            >
              <Calculator className="w-3.5 h-3.5" />
              <span>{showCalculator ? "Hide Calculator" : "Earnings Calculator"}</span>
            </button>
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
            <strong>Role-Based Workspace Boundary:</strong> You are granted focused access exclusively to your assigned deliverables, creative briefs, and content upload pipeline. Internal agency financials and admin settings remain private.
          </span>
        </div>
      </div>

      {submitSuccess && (
        <div className="p-4 bg-emerald-500/15 border border-emerald-500/40 rounded-2xl text-xs font-bold text-emerald-300 flex items-center gap-2 animate-fade-in shadow-sm">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          {submitSuccess}
        </div>
      )}

      {/* ── MOBILE: COMPACT HORIZONTAL QUICK-STATS RIBBON (Replaces 4 massive stacked cards on phone) ── */}
      <div className="sm:hidden flex items-center gap-2.5 overflow-x-auto pb-1.5 pt-0.5 no-scrollbar snap-x overscroll-x-contain -mx-1 px-1">
        <div className="min-w-[150px] shrink-0 p-3 bg-[#161F2D] border border-[#2A3446] rounded-2xl snap-start space-y-1 shadow-xs">
          <div className="flex items-center justify-between text-[10px] font-bold text-[#97A0B3] uppercase tracking-wider">
            <span>Earned</span>
            <IndianRupee className="w-3.5 h-3.5 text-emerald-400" />
          </div>
          <div className="text-xl font-black text-emerald-400">
            ₹{earnings.earnedSettled.toLocaleString("en-IN")}
          </div>
          <p className="text-[10px] text-emerald-400/80 font-bold truncate">{earnings.completedCount} approved</p>
        </div>

        <div className="min-w-[150px] shrink-0 p-3 bg-[#161F2D] border border-[#2A3446] rounded-2xl snap-start space-y-1 shadow-xs">
          <div className="flex items-center justify-between text-[10px] font-bold text-[#97A0B3] uppercase tracking-wider">
            <span>In QA</span>
            <Clock className="w-3.5 h-3.5 text-blue-400" />
          </div>
          <div className="text-xl font-black text-blue-400">
            ₹{earnings.pendingReview.toLocaleString("en-IN")}
          </div>
          <p className="text-[10px] text-blue-400/80 font-bold truncate">{earnings.reviewCount} pending</p>
        </div>

        <div className="min-w-[150px] shrink-0 p-3 bg-[#161F2D] border border-[#2A3446] rounded-2xl snap-start space-y-1 shadow-xs">
          <div className="flex items-center justify-between text-[10px] font-bold text-[#97A0B3] uppercase tracking-wider">
            <span>Workload</span>
            <Briefcase className="w-3.5 h-3.5 text-purple-400" />
          </div>
          <div className="text-xl font-black text-purple-300">
            ₹{earnings.activeInProgress.toLocaleString("en-IN")}
          </div>
          <p className="text-[10px] text-purple-400/80 font-bold truncate">{earnings.activeCount} in work</p>
        </div>

        <div className="min-w-[150px] shrink-0 p-3 bg-[#161F2D] border border-[#2A3446] rounded-2xl snap-start space-y-1 shadow-xs">
          <div className="flex items-center justify-between text-[10px] font-bold text-[#97A0B3] uppercase tracking-wider">
            <span>Target</span>
            <Wallet className="w-3.5 h-3.5 text-amber-400" />
          </div>
          <div className="text-xl font-black text-amber-400">
            ₹{earnings.projectedMonthly.toLocaleString("en-IN")}
          </div>
          <p className="text-[10px] text-amber-400/80 font-bold truncate">~₹{earnings.projectedWeekly.toLocaleString("en-IN")}/wk</p>
        </div>
      </div>

      {/* ── DESKTOP/TABLET: 4 Financial & Earnings Summary Cards (Hidden on phone) ── */}
      <div className="hidden sm:grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Earned & Settled */}
        <div className="bg-[#161F2D] rounded-3xl p-5 border-2 border-[#161F2D] hover:border-emerald-500/30 transition-all shadow-xl flex flex-col justify-between">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[10px] font-black text-[#97A0B3] uppercase tracking-wider">
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
            <span className="text-xs font-semibold text-[#97A0B3]">
              ({earnings.completedCount} approved)
            </span>
          </div>
          <div className="mt-3 pt-3 border-t border-[#2A3446] text-xs font-bold text-emerald-400 flex items-center gap-1">
            <CheckCircle2 className="w-3.5 h-3.5" /> Payout cleared on sign-off
          </div>
        </div>

        {/* Card 2: In QA Review */}
        <div className="bg-[#161F2D] rounded-3xl p-5 border-2 border-[#161F2D] hover:border-blue-500/30 transition-all shadow-xl flex flex-col justify-between">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[10px] font-black text-[#97A0B3] uppercase tracking-wider">
              IN QA REVIEW
            </span>
            <div className="w-8 h-8 rounded-2xl bg-blue-500/15 text-blue-400 flex items-center justify-center">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-black text-blue-400">
              ₹{earnings.pendingReview.toLocaleString("en-IN")}
            </span>
            <span className="text-xs font-semibold text-[#97A0B3]">
              ({earnings.reviewCount} pending)
            </span>
          </div>
          <div className="mt-3 pt-3 border-t border-[#2A3446] text-xs font-bold text-blue-400 flex items-center gap-1">
            <Sparkles className="w-3.5 h-3.5" /> Submitted to Team Lead
          </div>
        </div>

        {/* Card 3: Active Workload Value */}
        <div className="bg-[#161F2D] rounded-3xl p-5 border-2 border-[#161F2D] hover:border-purple-500/30 transition-all shadow-xl flex flex-col justify-between">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[10px] font-black text-[#97A0B3] uppercase tracking-wider">
              ACTIVE WORKLOAD
            </span>
            <div className="w-8 h-8 rounded-2xl bg-purple-500/15 text-purple-400 flex items-center justify-center">
              <Briefcase className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-black text-purple-300">
              ₹{earnings.activeInProgress.toLocaleString("en-IN")}
            </span>
            <span className="text-xs font-semibold text-[#97A0B3]">
              ({earnings.activeCount} in work)
            </span>
          </div>
          <div className="mt-3 pt-3 border-t border-[#2A3446] text-xs font-bold text-purple-400 flex items-center gap-1">
            <Play className="w-3.5 h-3.5" /> Deliverables in production
          </div>
        </div>

        {/* Card 4: Projected Monthly Target */}
        <div className="bg-[#161F2D] rounded-3xl p-5 border-2 border-[#161F2D] hover:border-amber-500/30 transition-all shadow-xl flex flex-col justify-between">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[10px] font-black text-[#97A0B3] uppercase tracking-wider">
              PROJECTED MONTHLY
            </span>
            <div className="w-8 h-8 rounded-2xl bg-amber-500/15 text-amber-400 flex items-center justify-center">
              <Wallet className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-black text-amber-400">
              ₹{earnings.projectedMonthly.toLocaleString("en-IN")}
            </span>
            <span className="text-xs font-semibold text-[#97A0B3]">
              (~₹{earnings.projectedWeekly.toLocaleString("en-IN")}/wk)
            </span>
          </div>
          <div className="mt-3 pt-3 border-t border-[#2A3446] text-xs font-bold text-amber-400 flex items-center gap-1">
            <SlidersHorizontal className="w-3.5 h-3.5" /> Configured via calculator
          </div>
        </div>
      </div>

      {/* ── Interactive Earnings & Payout Calculator ── */}
      {showCalculator && (
        <div className="p-6 rounded-3xl bg-[#161F2D] border border-purple-500/30 shadow-xl space-y-4 animate-fade-in">
          <div className="flex items-center justify-between border-b border-[#2A3446] pb-3">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-purple-500/15 text-purple-400 flex items-center justify-center font-black">
                <Calculator className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <span>Interactive Freelance Earnings & Payout Calculator</span>
                  <span className="px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 text-[10px] font-black uppercase">
                    Live Simulator
                  </span>
                </h3>
                <p className="text-[11px] text-[#97A0B3]">
                  Calculate your projected take-home earnings by adjusting your deliverable unit rate and target monthly deliverables.
                </p>
              </div>
            </div>
            <button
              onClick={() => setShowCalculator(false)}
              className="text-[#97A0B3] hover:text-white p-1"
            >
              <ChevronUp className="w-4 h-4" />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {/* Control 1: Rate per deliverable */}
            <div className="space-y-2 bg-[#0B111C] p-4 rounded-2xl border border-[#2A3446]">
              <label className="text-xs font-bold text-white flex items-center justify-between">
                <span>Base Rate per Deliverable (₹)</span>
                <span className="text-purple-400 font-mono text-sm font-black">
                  ₹{baseDeliverableRate.toLocaleString("en-IN")}
                </span>
              </label>
              <input
                type="range"
                min="1000"
                max="25000"
                step="500"
                value={baseDeliverableRate}
                onChange={(e) => setBaseDeliverableRate(Number(e.target.value))}
                className="w-full accent-purple-600 cursor-pointer"
              />
              <div className="flex items-center gap-1.5 pt-1">
                {[3500, 4500, 6000, 8500, 12000].map((rate) => (
                  <button
                    key={rate}
                    type="button"
                    onClick={() => setBaseDeliverableRate(rate)}
                    className={`px-2 py-1 rounded-lg text-[10px] font-bold border transition-colors ${
                      baseDeliverableRate === rate
                        ? "bg-purple-600 text-white border-purple-500"
                        : "bg-[#161F2D] text-[#97A0B3] border-[#2A3446] hover:text-white"
                    }`}
                  >
                    ₹{(rate / 1000).toFixed(1)}k
                  </button>
                ))}
              </div>
            </div>

            {/* Control 2: Target Deliverables */}
            <div className="space-y-2 bg-[#0B111C] p-4 rounded-2xl border border-[#2A3446]">
              <label className="text-xs font-bold text-white flex items-center justify-between">
                <span>Target Deliverables / Month</span>
                <span className="text-purple-400 font-mono text-sm font-black">
                  {projectedMonthlyUnits} units
                </span>
              </label>
              <input
                type="range"
                min="1"
                max="25"
                step="1"
                value={projectedMonthlyUnits}
                onChange={(e) => setProjectedMonthlyUnits(Number(e.target.value))}
                className="w-full accent-purple-600 cursor-pointer"
              />
              <div className="flex items-center gap-1.5 pt-1">
                {[3, 6, 8, 12, 16].map((units) => (
                  <button
                    key={units}
                    type="button"
                    onClick={() => setProjectedMonthlyUnits(units)}
                    className={`px-2 py-1 rounded-lg text-[10px] font-bold border transition-colors ${
                      projectedMonthlyUnits === units
                        ? "bg-purple-600 text-white border-purple-500"
                        : "bg-[#161F2D] text-[#97A0B3] border-[#2A3446] hover:text-white"
                    }`}
                  >
                    {units} / mo
                  </button>
                ))}
              </div>
            </div>

            {/* Output: Real-time projection summary */}
            <div className="bg-gradient-to-br from-purple-900/30 to-indigo-900/30 border border-purple-500/30 p-4 rounded-2xl flex flex-col justify-between space-y-2">
              <span className="text-[10px] font-black text-purple-300 uppercase tracking-wider">
                Simulated Net Payout Projection
              </span>
              <div className="space-y-1">
                <div className="flex items-baseline justify-between">
                  <span className="text-xs text-[#97A0B3]">Monthly Payout:</span>
                  <span className="text-xl font-black text-emerald-400">
                    ₹{(baseDeliverableRate * projectedMonthlyUnits).toLocaleString("en-IN")}
                  </span>
                </div>
                <div className="flex items-baseline justify-between text-xs">
                  <span className="text-[#97A0B3]">Weekly Velocity:</span>
                  <span className="text-white font-bold">
                    ₹{Math.round((baseDeliverableRate * projectedMonthlyUnits) / 4).toLocaleString("en-IN")}
                  </span>
                </div>
              </div>
              <div className="pt-2 border-t border-purple-500/20 text-[10px] text-purple-300 font-semibold flex items-center justify-between">
                <span>100% Platform Direct Deposit</span>
                <span className="text-emerald-400 font-bold">Zero Fee Deductions</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Filters Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-[#161F2D] p-3 rounded-2xl border border-[#2A3446]">
        <div className="flex items-center gap-1.5 overflow-x-auto">
          <Filter className="w-3.5 h-3.5 text-[#97A0B3] ml-2 mr-1" />
          {[
            { key: "all", label: "All Tasks" },
            { key: "pending", label: "In Progress" },
            { key: "review", label: "In QA Review" },
            { key: "revision", label: "Revisions Needed" },
            { key: "completed", label: "Approved & Paid" },
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setFilterStatus(tab.key)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                filterStatus === tab.key
                  ? "bg-purple-600 text-white shadow-md shadow-purple-500/20"
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
          <h3 className="text-base font-bold text-white">No deliverables in current filter</h3>
          <p className="text-xs text-[#97A0B3] max-w-sm mx-auto">
            You will receive tasks directly from Team Leads with creative briefs, due dates, and milestone payout values.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredTasks.map((task) => {
            const fee = Number(task.milestone_fee ?? 4500);
            const isAssigned = (task.status || "").toUpperCase() === "ASSIGNED";

            return (
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

                  {/* Payout & Format Row */}
                  <div className="flex flex-wrap items-center gap-2 text-[11px]">
                    <span className="px-2.5 py-1 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 font-bold flex items-center gap-1">
                      <IndianRupee className="w-3.5 h-3.5" /> Payout: ₹{fee.toLocaleString("en-IN")}
                    </span>
                    <span className="px-2 py-0.5 rounded-lg bg-[#0B111C] border border-[#2A3446] font-mono text-purple-300">
                      {task.format}
                    </span>
                    {task.due_date && (
                      <span className="flex items-center gap-1 text-[#97A0B3]">
                        <Calendar className="w-3 h-3 text-[#97A0B3]" /> Due: {task.due_date}
                      </span>
                    )}
                  </div>

                  {task.description && (
                    <div className="p-3 bg-[#0B111C] rounded-2xl text-xs text-[#F1F5F9] border border-[#2A3446] space-y-1">
                      <span className="font-bold text-[#97A0B3] block text-[10px] uppercase">
                        Creative Brief & Scope
                      </span>
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

                {/* Card Action Footer */}
                <div className="pt-3 border-t border-[#2A3446] flex flex-wrap items-center justify-between gap-2">
                  <button
                    type="button"
                    onClick={() =>
                      setHistoryDeliverable({ id: task.deliverable_id || task.id, title: task.title })
                    }
                    className="px-3 py-1.5 rounded-xl border border-[#2A3446] text-xs font-bold text-[#97A0B3] hover:text-white hover:bg-[#0B111C] flex items-center gap-1.5 cursor-pointer"
                  >
                    <History className="w-3.5 h-3.5 text-[#97A0B3]" /> History
                  </button>

                  <div className="flex items-center gap-2">
                    {isAssigned && (
                      <button
                        type="button"
                        disabled={startingTaskId === task.id}
                        onClick={() => handleStartWork(task)}
                        className="px-3.5 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold shadow-md flex items-center gap-1 cursor-pointer transition-all disabled:opacity-50"
                      >
                        <Play className="w-3.5 h-3.5" />
                        {startingTaskId === task.id ? "Starting..." : "Start Working"}
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={() => {
                        setSelectedTaskForSubmit(task);
                        setSelectedFile(null);
                        setAssetUrl("");
                        setSubmissionNotes("");
                        setSubmitError(null);
                      }}
                      className="px-4 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold shadow-md flex items-center gap-1.5 cursor-pointer transition-all"
                    >
                      <UploadCloud className="w-3.5 h-3.5" />
                      {task.status === "REVISION_REQUESTED"
                        ? "Submit Revision"
                        : "Upload Content & Submit"}
                    </button>
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
          <div className="bg-[#161F2D] rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-purple-500/40 space-y-4 max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-[#2A3446] pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-2xl bg-purple-500/15 text-purple-400 flex items-center justify-center font-black">
                  <UploadCloud className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">Upload Deliverable Content</h3>
                  <p className="text-[11px] text-[#97A0B3]">Task: {selectedTaskForSubmit.title}</p>
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

            {/* Mode Switcher: Direct File Upload vs Cloud Link */}
            <div className="flex items-center gap-2 bg-[#0B111C] p-1.5 rounded-2xl border border-[#2A3446]">
              <button
                type="button"
                onClick={() => setSubmissionMode("file")}
                className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                  submissionMode === "file"
                    ? "bg-purple-600 text-white shadow-md"
                    : "text-[#97A0B3] hover:text-white"
                }`}
              >
                <FileUp className="w-4 h-4" /> Direct File Upload
              </button>
              <button
                type="button"
                onClick={() => setSubmissionMode("link")}
                className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                  submissionMode === "link"
                    ? "bg-purple-600 text-white shadow-md"
                    : "text-[#97A0B3] hover:text-white"
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
                  <label className="block font-bold text-[#F1F5F9] mb-1.5">
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
                        : "border-[#2A3446] hover:border-purple-500/60 bg-[#0B111C]"
                    }`}
                  >
                    {selectedFile ? (
                      <div className="space-y-2">
                        <div className="w-10 h-10 rounded-2xl bg-emerald-500/20 text-emerald-400 mx-auto flex items-center justify-center">
                          <CheckCircle2 className="w-6 h-6" />
                        </div>
                        <div>
                          <p className="font-bold text-white text-xs truncate max-w-xs mx-auto">
                            {selectedFile.name}
                          </p>
                          <p className="text-[10px] text-[#97A0B3]">
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
                          <p className="font-bold text-white text-xs">
                            Drag & drop your deliverable file here, or browse
                          </p>
                          <p className="text-[10px] text-[#97A0B3] mt-0.5">
                            Supports MP4, MOV, PNG, JPG, PDF, ZIP, PSD up to 500MB
                          </p>
                        </div>
                        <label className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#161F2D] hover:bg-[#202B3D] border border-[#2A3446] text-xs font-bold text-purple-300 cursor-pointer transition-colors">
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
                  <label className="block font-bold text-[#F1F5F9] mb-1.5">
                    Cloud Storage URL (Google Drive, Frame.io, Dropbox, Figma, WeTransfer) *
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
              )}

              <div>
                <label className="block font-bold text-[#F1F5F9] mb-1">
                  Submission Notes & Version Summary (Optional)
                </label>
                <textarea
                  rows={3}
                  value={submissionNotes}
                  onChange={(e) => setSubmissionNotes(e.target.value)}
                  placeholder="e.g. Master render exported in 4K ProRes 422HQ, color graded according to brief tokens."
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
                  className="px-5 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 font-bold text-white shadow-md flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
                >
                  <Send className="w-3.5 h-3.5" />
                  {submitBusy ? "Uploading & Submitting..." : "Submit to Team Lead"}
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
