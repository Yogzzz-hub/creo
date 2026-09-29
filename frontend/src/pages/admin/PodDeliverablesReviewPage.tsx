import { useState } from "react";
import { AdminTopHeader } from "../../components/admin/AdminTopHeader";
import { useQuery, useMutation } from "@tanstack/react-query";
import { submitPodQAReview, fetchPodDashboard, type PodDashboardData } from "../../lib/ops-api";
import {
  FileCheck2,
  Zap,
  ShieldCheck,
  AlertTriangle,
  Clock,
  ExternalLink,
  Check,
  X,
  Plus,
  Play,
  Download,
  ArrowRight,
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
    const rows = [
      ["DELIV-01", "Fintech Reel · High Conversion", "Northwind Labs", "Reel (9:16)", "David Kim", "Due in 2h", "Pending Lead Sign-off"],
      ["DELIV-02", "Holiday Campaign Story Motion", "Bloom Studio", "Story (9:16)", "Chloe Tan", "Due in 3h", "Review Active"],
      ["DELIV-03", "Brand Architecture Post Carousel", "Atlas Commerce", "Post (1:1)", "Elena Ortiz", "Due in 1h 14m", "Urgent SLA Alert"],
      ["DELIV-04", "Product Teaser Kinetic Cut", "Northwind Labs", "Reel (9:16)", "David Kim", "Delivered", "Dispatched to Frame.io"],
      ["DELIV-05", "Creator Q&A Story Highlight Set", "Bloom Studio", "Story (9:16)", "Marcus Vance", "Delivered", "Client Approved"],
      ["DELIV-06", "Enterprise Case Study Carousel", "Atlas Commerce", "Post (1:1)", "Elena Ortiz", "Delivered", "Client Approved"],
    ];

    const csvContent = [headers.join(","), ...rows.map((r) => r.map((c) => `"${c}"`).join(","))].join("\n");
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
            <span className="size-2 rounded-full bg-blue-500 animate-pulse" />
            <span className="text-xs font-bold text-slate-700">{podName} Review Hub · Frame.io Sync Gate</span>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={handleExportReviewLedger}
              className="px-3 py-1.5 rounded-xl bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-bold flex items-center gap-1.5 shadow-2xs transition-colors cursor-pointer"
            >
              <FileText className="size-3.5 text-slate-500" />
              Export Report
            </button>
            <button
              onClick={() => setNewDeliverableModal(true)}
              className="px-3.5 py-1.5 rounded-xl bg-[#2563EB] hover:bg-blue-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-xs transition-all cursor-pointer"
            >
              <Plus className="size-3.5" />
              New Deliverable
            </button>
          </div>
        </div>

        {/* 2. Top 3 KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5 sm:gap-3">
          {/* Card 1: Pending Lead Sign-off */}
          <div className="bg-white rounded-xl sm:rounded-2xl p-2.5 sm:p-3 border border-slate-200/80 shadow-2xs flex flex-col justify-between">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[9px] sm:text-[10px] font-bold uppercase tracking-wider text-slate-400">Pending Lead Sign-Off</span>
              <div className="size-6 sm:size-7 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
                <FileCheck2 className="size-3 sm:size-3.5" />
              </div>
            </div>
            <div>
              <div className="flex items-baseline gap-1.5 mb-1">
                <span className="text-lg sm:text-xl font-black text-[#0F172A]">6</span>
                <span className="text-[10.5px] sm:text-[11px] font-bold text-slate-500">Deliverables</span>
              </div>
              <div className="flex items-center gap-2 text-[10px] sm:text-[11px] pt-1.5 border-t border-slate-100">
                <span className="px-1.5 py-0.2 rounded-full text-[8.5px] sm:text-[9px] font-bold bg-rose-50 text-rose-700 border border-rose-200 flex items-center gap-1">
                  ● 2 Urgent
                </span>
                <span className="text-slate-500 font-medium">Within 2h SLA threshold</span>
              </div>
            </div>
          </div>

          {/* Card 2: Average Turnaround Speed */}
          <div className="bg-white rounded-xl sm:rounded-2xl p-2.5 sm:p-3 border border-slate-200/80 shadow-2xs flex flex-col justify-between">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[9px] sm:text-[10px] font-bold uppercase tracking-wider text-slate-400">Average Turnaround Speed</span>
              <div className="size-6 sm:size-7 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
                <Zap className="size-3 sm:size-3.5" />
              </div>
            </div>
            <div>
              <div className="flex items-baseline gap-1.5 mb-1">
                <span className="text-lg sm:text-xl font-black text-[#0F172A]">38</span>
                <span className="text-[10.5px] sm:text-[11px] font-bold text-slate-500">mins</span>
              </div>
              <div className="flex items-center justify-between text-[10px] sm:text-[11px] pt-1.5 border-t border-slate-100">
                <span className="text-slate-500 font-medium">Benchmark: &lt; 2.0h</span>
                <span className="font-bold text-emerald-600">↗ 68% Faster</span>
              </div>
            </div>
          </div>

          {/* Card 3: QA First-Pass Pass Rate */}
          <div className="bg-white rounded-xl sm:rounded-2xl p-2.5 sm:p-3 border border-slate-200/80 shadow-2xs flex flex-col justify-between">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[9px] sm:text-[10px] font-bold uppercase tracking-wider text-slate-400">QA First-Pass Pass Rate</span>
              <div className="size-6 sm:size-7 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
                <ShieldCheck className="size-3 sm:size-3.5" />
              </div>
            </div>
            <div>
              <div className="flex items-baseline gap-1.5 mb-1">
                <span className="text-lg sm:text-xl font-black text-[#0F172A]">91.4%</span>
              </div>
              <div className="flex items-center justify-between text-[10px] sm:text-[11px] pt-1.5 border-t border-slate-100">
                <span className="text-slate-500 font-medium">Top 5% across pods</span>
                <span className="px-1.5 py-0.2 rounded-full text-[8.5px] sm:text-[9px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
                  Rank #1 Studio
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* 3. Urgent SLA Alert Banner */}
        <div className="bg-gradient-to-r from-rose-50/90 via-red-50/50 to-white rounded-2xl p-3.5 sm:p-4 border border-rose-200 flex flex-col md:flex-row md:items-center justify-between gap-3 shadow-2xs">
          <div className="flex items-center gap-3">
            <div className="size-8 rounded-xl bg-rose-100 text-rose-600 flex items-center justify-center shrink-0">
              <AlertTriangle className="size-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="px-1.5 py-0.2 rounded text-[9px] font-black uppercase tracking-wider bg-rose-600 text-white">
                  Urgent SLA Alert
                </span>
                <span className="text-xs font-bold text-slate-700">Atlas Commerce · Deliverable #03</span>
              </div>
              <p className="text-[11px] text-slate-600 font-medium mt-0.5">
                Post Carousel SLA: <span className="font-bold text-rose-600">01h 14m remaining</span> until escalation.
              </p>
            </div>
          </div>

          <button
            onClick={() => showToast("Focused review active for Atlas Commerce Deliverable #03", "success")}
            className="px-3.5 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-xs transition-all cursor-pointer shrink-0"
          >
            Review & Approve <ArrowRight className="size-3" />
          </button>
        </div>

        {/* 4. Active Deliverables Stream Section */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-black text-[#0F172A]">Active Deliverables Stream</h2>
            <span className="text-[11px] font-bold text-slate-400">3 Awaiting Lead Action</span>
          </div>

          {/* Featured Deliverable Card: Northwind Labs Fintech Reel */}
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-2xs p-4 sm:p-5 space-y-4">
            {/* Header row */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-slate-100 gap-2">
              <div>
                <div className="flex items-center gap-2 text-xs font-bold text-slate-500 mb-0.5">
                  <span className="text-blue-600 font-black">Northwind Labs</span>
                  <span>· Reel Sprint Q4</span>
                </div>
                <h3 className="text-base font-black text-[#0F172A]">Fintech Reel · High Conversion (9:16 Vertical)</h3>
                <p className="text-[11px] text-slate-500 font-medium mt-0.5">
                  Specialist: <span className="font-bold text-slate-800">David Kim</span> (Sr. Motion Designer)
                </p>
              </div>

              <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-50 text-amber-700 border border-amber-200 flex items-center gap-1 self-start sm:self-auto">
                <Clock className="size-3" />
                Due in 2 hours
              </span>
            </div>

            {/* Media Preview & Review Panel (2 columns) */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
              {/* Left Column: Media Player Visual Mockup (5 cols) */}
              <div className="lg:col-span-5 space-y-3">
                <div className="relative aspect-4/5 sm:aspect-square lg:aspect-4/5 w-full bg-slate-950 rounded-2xl overflow-hidden border border-slate-800 shadow-xl flex flex-col justify-between p-4 group">
                  {/* Top video badges */}
                  <div className="flex items-center justify-between z-10">
                    <span className="px-2.5 py-1 rounded-lg bg-black/60 backdrop-blur-md text-[10px] font-bold text-white border border-white/10">
                      3 Variations
                    </span>
                    <span className="px-2.5 py-1 rounded-lg bg-blue-600/90 backdrop-blur-md text-[10px] font-bold text-white shadow-xs">
                      MP4 · 4K 60fps
                    </span>
                  </div>

                  {/* Visual Center Graphic Mockup */}
                  <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center pointer-events-none">
                    <div className="w-48 h-80 rounded-3xl border-2 border-slate-700/80 bg-slate-900/90 p-4 shadow-2xl flex flex-col justify-between transform group-hover:scale-102 transition-transform">
                      <div className="flex justify-between items-center text-[8px] text-slate-400">
                        <span>Reel #01</span>
                        <span className="text-emerald-400">● Live</span>
                      </div>
                      <div className="space-y-2 text-left">
                        <span className="text-[10px] text-slate-400 font-bold block">PORTFOLIO</span>
                        <span className="text-sm font-black text-white block leading-none">₹45,230.75</span>
                        <span className="text-[9px] font-bold text-emerald-400 block">+14.2%</span>
                        <div className="h-10 w-full bg-gradient-to-t from-blue-600/30 to-emerald-400/20 rounded-lg flex items-end p-1">
                          <div className="h-6 w-full bg-blue-500/40 rounded-sm" />
                        </div>
                      </div>
                      <span className="text-[8px] font-bold tracking-widest text-slate-500 uppercase">
                        Finance Redefined
                      </span>
                    </div>
                  </div>

                  {/* Bottom Video Controls Mockup */}
                  <div className="flex items-center justify-between z-10 pt-2">
                    <div className="flex items-center gap-2">
                      <div className="size-7 rounded-full bg-white/20 backdrop-blur-md text-white flex items-center justify-center">
                        <Play className="size-3.5 fill-white" />
                      </div>
                      <span className="text-[10px] font-bold text-white">0:15 / 4K UHD</span>
                    </div>
                    <button
                      onClick={() => showToast("Downloaded 4K Master Render (142.4 MB)", "success")}
                      className="size-7 rounded-full bg-white/20 hover:bg-white/40 backdrop-blur-md text-white flex items-center justify-center transition cursor-pointer"
                      title="Download Render"
                    >
                      <Download className="size-3.5" />
                    </button>
                  </div>
                </div>

                {/* Frame.io Asset Link */}
                <div className="flex items-center justify-between text-xs px-1">
                  <a
                    href="https://frame.io"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-bold text-blue-600 hover:underline flex items-center gap-1.5"
                  >
                    <ExternalLink className="size-3.5" />
                    Open in Frame.io Asset View
                  </a>
                  <span className="text-slate-400 font-medium">142.4 MB</span>
                </div>
              </div>

              {/* Right Column: Specs & QA Rubric (7 cols) */}
              <div className="lg:col-span-7 space-y-6">
                {/* Tech Specs Table */}
                <div className="grid grid-cols-2 gap-3 bg-slate-50 rounded-2xl p-4 border border-slate-100 text-xs">
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Aspect Ratio</span>
                    <span className="font-bold text-slate-800 mt-0.5 block">9:16 Vertical Reel</span>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Framerate</span>
                    <span className="font-bold text-slate-800 mt-0.5 block">60 fps Smooth Motion</span>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Color Profile</span>
                    <span className="font-bold text-slate-800 mt-0.5 block">Rec.709 Mastered</span>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Audio Bitrate</span>
                    <span className="font-bold text-slate-800 mt-0.5 block">320kbps AAC Stereo</span>
                  </div>
                </div>

                {/* LEAD QA COMPLIANCE RUBRIC (Image 3) */}
                <div className="space-y-3">
                  <span className="text-[11px] font-black uppercase tracking-wider text-slate-400 block">
                    Lead QA Compliance Rubric
                  </span>

                  <div className="space-y-2">
                    <label
                      onClick={() => setRubric1(!rubric1)}
                      className={`flex items-center gap-3 p-3.5 rounded-2xl border transition-all cursor-pointer ${
                        rubric1
                          ? "bg-blue-50/50 border-blue-200 text-blue-900"
                          : "bg-white border-slate-200 text-slate-600"
                      }`}
                    >
                      <div className={`size-5 rounded-lg flex items-center justify-center ${rubric1 ? "bg-blue-600 text-white" : "border border-slate-300"}`}>
                        {rubric1 && <Check className="size-3.5 stroke-[3]" />}
                      </div>
                      <span className="text-xs font-bold">Brand contrast & typography guidelines passed</span>
                    </label>

                    <label
                      onClick={() => setRubric2(!rubric2)}
                      className={`flex items-center gap-3 p-3.5 rounded-2xl border transition-all cursor-pointer ${
                        rubric2
                          ? "bg-blue-50/50 border-blue-200 text-blue-900"
                          : "bg-white border-slate-200 text-slate-600"
                      }`}
                    >
                      <div className={`size-5 rounded-lg flex items-center justify-center ${rubric2 ? "bg-blue-600 text-white" : "border border-slate-300"}`}>
                        {rubric2 && <Check className="size-3.5 stroke-[3]" />}
                      </div>
                      <span className="text-xs font-bold">Sound stems synchronized</span>
                    </label>

                    <label
                      onClick={() => setRubric3(!rubric3)}
                      className={`flex items-center gap-3 p-3.5 rounded-2xl border transition-all cursor-pointer ${
                        rubric3
                          ? "bg-blue-50/50 border-blue-200 text-blue-900"
                          : "bg-white border-slate-200 text-slate-600"
                      }`}
                    >
                      <div className={`size-5 rounded-lg flex items-center justify-center ${rubric3 ? "bg-blue-600 text-white" : "border border-slate-300"}`}>
                        {rubric3 && <Check className="size-3.5 stroke-[3]" />}
                      </div>
                      <span className="text-xs font-bold">Safe-zone compliance (9:16 Reels & Stories)</span>
                    </label>
                  </div>
                </div>

                {/* Feedback Input */}
                <div className="space-y-2">
                  <textarea
                    rows={2}
                    value={feedbackNote}
                    onChange={(e) => setFeedbackNote(e.target.value)}
                    placeholder="Add specific feedback or revision instructions for David..."
                    className="w-full text-xs p-3.5 rounded-2xl border border-slate-200 bg-slate-50/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium"
                  />
                </div>

                {/* Action Buttons (Image 3) */}
                <div className="flex items-center justify-end gap-3 pt-2">
                  {reviewState === "approved" ? (
                    <div className="w-full p-3 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold flex items-center justify-between">
                      <span className="flex items-center gap-2">
                        <Check className="size-4 text-emerald-600 stroke-[3]" />
                        Approved & Dispatched to Client Frame.io Portal
                      </span>
                      <button
                        onClick={() => setReviewState("pending")}
                        className="text-[11px] underline text-emerald-700 hover:text-emerald-900 cursor-pointer font-bold"
                      >
                        Reset Review
                      </button>
                    </div>
                  ) : reviewState === "revision" ? (
                    <div className="w-full p-3 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-bold flex items-center justify-between">
                      <span>Revision request active • Specialist notified</span>
                      <button
                        onClick={() => setReviewState("pending")}
                        className="text-[11px] underline text-rose-700 hover:text-rose-900 cursor-pointer font-bold"
                      >
                        Cancel Revision
                      </button>
                    </div>
                  ) : (
                    <>
                      <button
                        onClick={() => {
                          setReviewState("revision");
                          showToast("Revision request dispatched to David Kim", "info");
                          qaMutation.mutate({
                            taskId: "del-northwind-1",
                            decision: "reject",
                            comment: feedbackNote || "Revisions required for brand contrast.",
                          });
                        }}
                        className="px-5 py-2.5 rounded-xl bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-bold transition-colors cursor-pointer"
                      >
                        Request Revision
                      </button>
                      <button
                        onClick={() => {
                          setReviewState("approved");
                          showToast("Deliverable QA Approved & Dispatched to Northwind Labs portal", "success");
                          qaMutation.mutate({
                            taskId: "del-northwind-1",
                            decision: "approve",
                            comment: feedbackNote || "All rubric checks verified. Approved for client sync.",
                          });
                        }}
                        className="px-6 py-2.5 rounded-xl bg-[#2563EB] hover:bg-blue-700 text-white text-xs font-bold flex items-center gap-2 shadow-md shadow-blue-500/20 transition-all cursor-pointer"
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
        </div>
      </main>

      {/* New Deliverable Modal */}
      {newDeliverableModal && (
        <div className="fixed inset-0 w-screen h-screen z-[9999] bg-slate-950/70 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
          <div className="w-full max-w-lg bg-white rounded-3xl p-6 sm:p-7 shadow-2xl border border-slate-100 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-black text-[#0F172A]">Create New Deliverable Stream</h3>
              <button onClick={() => setNewDeliverableModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="size-5" />
              </button>
            </div>
            <div className="space-y-3 text-xs">
              <div>
                <label className="font-bold text-slate-700 block mb-1">Deliverable Name</label>
                <input
                  type="text"
                  placeholder="e.g. Q4 TikTok Motion Story (5 Variations)"
                  className="w-full p-2.5 rounded-xl border border-slate-200 bg-slate-50 font-medium"
                />
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Format</label>
                  <select className="w-full p-2.5 rounded-xl border border-slate-200 bg-slate-50 font-medium">
                    <option value="Reel">Reel</option>
                    <option value="Story">Story</option>
                    <option value="Post">Post</option>
                  </select>
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Client</label>
                  <select className="w-full p-2.5 rounded-xl border border-slate-200 bg-slate-50 font-medium">
                    <option>Northwind Labs</option>
                    <option>Bloom Studio</option>
                    <option>Atlas Commerce</option>
                  </select>
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Lead Specialist</label>
                  <select className="w-full p-2.5 rounded-xl border border-slate-200 bg-slate-50 font-medium">
                    <option>David Kim (Motion)</option>
                    <option>Elena R. (Brand)</option>
                    <option>Marcus Vance (Copy)</option>
                    <option>Chloe Tan (Video)</option>
                  </select>
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-3 pt-3">
              <button
                onClick={() => setNewDeliverableModal(false)}
                className="px-4 py-2 rounded-xl bg-slate-100 text-slate-700 text-xs font-bold hover:bg-slate-200 transition"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  showToast("Deliverable stream registered in Pod A queue", "success");
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
