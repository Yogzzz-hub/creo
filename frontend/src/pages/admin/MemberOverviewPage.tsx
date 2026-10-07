import { NativeSelect } from "../../ui/NativeSelect";
import { useState } from "react";
import { Link, useNavigate } from "react-router";
import { motion } from "motion/react";
import {
  Users,
  Clock,
  Calendar,
  Sparkles,
  ArrowRight,
  Pause,
  Play,
  Layers,
  Send,
  Upload,
  CheckCircle2,
  FileText,
  Video,
  X,
  ExternalLink,
} from "lucide-react";
import { AdminTopHeader } from "../../components/admin/AdminTopHeader";
import { useQuery } from "@tanstack/react-query";
import { fetchPodDashboard, type PodDashboardData } from "../../lib/ops-api";
import { useAuth } from "../../lib/auth-context";
import { CreoLoadingScreen } from "../../components/ui/CreoLoadingScreen";

interface LeadNoteItem {
  id: string;
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

export function MemberOverviewPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { data, isLoading } = useQuery<PodDashboardData>({
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

  // State for interactive actions
  const [renderPaused, setRenderPaused] = useState(false);
  const [renderProgress] = useState(75);
  const [quickReplyText, setQuickReplyText] = useState("");
  const [toastMessage, setToastMessage] = useState<{ text: string; type: "success" | "info" } | null>(null);

  // Modals
  const [logHoursModalOpen, setLogHoursModalOpen] = useState(false);
  const [hoursToLog, setHoursToLog] = useState("2.5");
  const [hoursProject, setHoursProject] = useState("Pod Sprint General Deliverables");
  const [hoursNotes, setHoursNotes] = useState("Octane shader tuning, keyframe polishing & lighting pass");

  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadClient, setUploadClient] = useState("Pod Client Workspace");
  const [uploadAssetTitle, setUploadAssetTitle] = useState("Sprint Deliverable Asset v1.0");

  const [inspectModalOpen, setInspectModalOpen] = useState(false);
  const [handoffConfirmOpen, setHandoffConfirmOpen] = useState(false);
  const [zoomModalOpen, setZoomModalOpen] = useState(false);
  const [deliverablesTab, setDeliverablesTab] = useState<"active" | "archived">("active");

  const [notesList, setNotesList] = useState<LeadNoteItem[]>([
    {
      id: "note-1",
      author: "Lead Producer",
      role: "Pod Lead • 22m ago",
      badge: "Sprint QA",
      content:
        "Audio stems and color grading pass look solid. Please verify CTA contrast against client brand guidelines before final handoff.",
      attachment: "frame_0320_markup.png",
      avatarBg: "bg-blue-600",
      avatar: "ML",
    },
    {
      id: "note-2",
      author: "Senior Specialist",
      role: "Copy Lead • 1h ago",
      badge: "ATL-119",
      content:
        "Updated the legal disclaimer copy for Holiday Bumper C. Bumped character kerning slightly for better readability at 1080p mobile preview.",
      tag: "Synced to Figma Flow Node",
      avatarBg: "bg-[#0B111C]",
      avatar: "MV",
    },
    {
      id: "note-3",
      author: "Automated QA Bot",
      role: "Render Pass Sentinel • 2h ago",
      badge: "Passed",
      badgeColor: "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30",
      content:
        "Pre-flight check passed for 9:16 export specs: Color gamut verified, 709 standard, peak nitrates within client target window.",
      avatarBg: "bg-purple-600",
      avatar: "QA",
    },
  ]);

  const showToast = (text: string, type: "success" | "info" = "success") => {
    setToastMessage({ text, type });
    setTimeout(() => setToastMessage(null), 4000);
  };

  const handleSendQuickReply = (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickReplyText.trim()) return;
    setNotesList([
      {
        id: `note-${Date.now()}`,
        author: user?.full_name || "Specialist",
        role: "Sr. Motion (You) • Just now",
        badge: "Reply",
        content: quickReplyText,
        avatarBg: "bg-[#7FA0D6]",
        avatar: "DK",
      },
      ...notesList,
    ]);
    showToast(`Reply sent to ${leadName}: "${quickReplyText}"`);
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

  const handleUploadSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setUploadModalOpen(false);
    showToast(`Successfully uploaded ${uploadAssetTitle} (${uploadClient}) to Frame.io sync pipeline!`);
  };

  if (isLoading || !data) {
    return <CreoLoadingScreen label="Verifying session..." sublabel="Loading Workstation Overview" />;
  }

  return (
    <div data-surface="ops" className="min-h-screen bg-[#0B111C] text-white font-sans flex flex-col">
      {/* Top Header Navigation in Admin unified layout */}
      <AdminTopHeader activeTab="Overview" />

      {/* Main Container */}
      <main className="flex-1 max-w-[1440px] w-full mx-auto px-3 sm:px-5 lg:px-6 py-3.5 pb-20 sm:pb-6 space-y-3.5 sm:space-y-4">
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

        {/* 2. Top 3 Metric Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 sm:gap-3">
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
                <span className="text-lg sm:text-xl font-black text-white">{activeSprintTasks.length}</span>
                <span className="text-[10.5px] sm:text-[11px] font-bold text-[#97A0B3]">Active</span>
                <span className="text-[9.5px] sm:text-[10px] text-[#97A0B3] truncate">{inProdTasks.length} in progress · {qaTasks.length} in QA</span>
              </div>
              <div className="flex items-center justify-between text-[10px] sm:text-[11px] pt-1.5 border-t border-[#2A3446]">
                <span className="font-bold text-[#7FA0D6] flex items-center gap-1">
                  ● Due Today: 1
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

        {/* 3. Main Two-Column Layout (Left 2/3, Right 1/3) */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-3.5 sm:gap-4 items-start">
          {/* LEFT 2 COLUMNS */}
          <div className="lg:col-span-2 space-y-3.5 sm:space-y-4">
            {/* Section A: Today's Priority Focus & RenderQueue */}
            <div className="bg-[#161F2D] rounded-2xl p-4 sm:p-5 border border-[#2A3446]/80 shadow-2xs space-y-3.5">
              <div className="flex items-center justify-between pb-3 border-b border-[#2A3446]">
                <div className="flex items-center gap-2">
                  <span className="size-1.5 rounded-full bg-blue-600 animate-pulse" />
                  <h2 className="text-sm font-black text-white">
                    Today's Priority Focus & RenderQueue
                  </h2>
                </div>
                <span className="text-[9px] font-mono font-bold text-[#97A0B3] bg-[#161F2D] px-2 py-0.5 rounded">
                  OCTANE V2024.1.2
                </span>
              </div>

              {/* Priority Item 1: Octane 3D Product Teaser */}
              <div className="p-3.5 rounded-xl bg-[#0B111C]/80 border border-[#2A3446]/70 space-y-2.5 hover:border-[#7FA0D6]/30 transition-all">
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2">
                  <div className="flex items-start gap-2.5">
                    {/* Thumbnail */}
                    <div className="size-10 rounded-lg bg-slate-900 overflow-hidden shrink-0 relative flex items-center justify-center border border-slate-700">
                      <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/20 to-blue-600/30" />
                      <span className="text-[8px] font-mono text-cyan-400 font-bold z-10">4K HDR</span>
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-bold text-[#7FA0D6]">{activeSprintTasks[0]?.client_name || "Active Sprint Client"}</span>
                        <span className="text-[#97A0B3] text-[10px]">· P1-ACTIVE</span>
                      </div>
                      <h3 className="text-xs font-black text-white">{activeSprintTasks[0]?.blueprint?.concept_name || "Sprint Master Render Campaign"}</h3>
                      <div className="flex flex-wrap items-center gap-1.5 text-[10px] text-[#97A0B3] mt-0.5">
                        <span>4K 60fps ProRes 422HQ</span>
                        <span>•</span>
                        <span>Rec.709</span>
                      </div>
                    </div>
                  </div>

                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[#7FA0D6]/15 text-[#7FA0D6] border border-[#7FA0D6]/30 self-start">
                    Octane Render {renderProgress}% Complete
                  </span>
                </div>

                {/* Render Details Box */}
                <div className="p-2.5 rounded-lg bg-[#161F2D] border border-[#2A3446] space-y-1.5">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="font-bold text-[#F1F5F9]">GPU-04 (Dual RTX 4090)</span>
                    <span className="font-black text-[#7FA0D6]">Frame 3,840 / 5,120</span>
                  </div>
                  <div className="w-full h-1.5 bg-[#161F2D] rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-blue-500 to-indigo-600 rounded-full transition-all duration-500"
                      style={{ width: `${renderProgress}%` }}
                    />
                  </div>
                  <div className="flex items-center justify-between text-[10px] text-[#97A0B3] font-medium">
                    <span>VRAM: 18.2GB</span>
                    <span>1024 spp clean</span>
                    <span>Elapsed: 3h 15m · Left: 1h 05m</span>
                  </div>
                </div>

                {/* Control Action Buttons */}
                <div className="flex flex-wrap items-center gap-2 pt-0.5">
                  <button
                    onClick={() => {
                      setRenderPaused(!renderPaused);
                      showToast(renderPaused ? "Resumed Octane GPU Render Cluster" : "Paused Octane GPU Render Cluster", "info");
                    }}
                    className="px-3 py-1.5 rounded-lg bg-[#161F2D] border border-[#2A3446] hover:bg-[#161F2D] text-[11px] font-bold text-[#F1F5F9] flex items-center gap-1 transition-colors cursor-pointer"
                  >
                    {renderPaused ? <Play className="size-3 text-emerald-600" /> : <Pause className="size-3 text-amber-600" />}
                    {renderPaused ? "Resume" : "Pause"}
                  </button>
                  <button
                    onClick={() => setInspectModalOpen(true)}
                    className="px-3 py-1.5 rounded-lg bg-[#161F2D] border border-[#2A3446] hover:bg-[#161F2D] text-[11px] font-bold text-[#F1F5F9] flex items-center gap-1 transition-colors cursor-pointer"
                  >
                    <Layers className="size-3 text-[#97A0B3]" />
                    Inspect Cache
                  </button>
                  <button
                    onClick={() => setHandoffConfirmOpen(true)}
                    className="px-3 py-1.5 rounded-lg bg-[#7FA0D6]/15 hover:bg-[#7FA0D6]/20 text-[#7FA0D6] text-[11px] font-bold flex items-center gap-1 transition-colors cursor-pointer ml-auto"
                  >
                    <Send className="size-3" />
                    Handoff to Lead
                  </button>
                </div>
              </div>

              {/* Priority Item 2: Holiday Promotion 3D Bumpers */}
              <div className="p-3.5 rounded-xl bg-[#0B111C]/80 border border-[#2A3446]/70 space-y-2.5 hover:border-purple-200 transition-all">
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2">
                  <div className="flex items-start gap-2.5">
                    <div className="size-10 rounded-lg bg-gradient-to-br from-amber-700 to-amber-900 overflow-hidden shrink-0 relative flex items-center justify-center text-white font-mono text-[8px] font-bold">
                      1080p
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-bold text-purple-400">{activeSprintTasks[1]?.client_name || (clients[0]?.name || "Active Client")}</span>
                        <span className="text-[#97A0B3] text-[10px]">· P2-SPRINT</span>
                      </div>
                      <h3 className="text-xs font-black text-white">{activeSprintTasks[1]?.blueprint?.concept_name || "Brand Campaign Motion Stems"}</h3>
                      <div className="flex flex-wrap items-center gap-1.5 text-[10px] text-[#97A0B3] mt-0.5">
                        <span>1080x1080</span>
                        <span>•</span>
                        <span>3 Variations</span>
                        <span>•</span>
                        <span className="text-emerald-600 font-bold">Figma Sync</span>
                      </div>
                    </div>
                  </div>

                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/15 text-rose-400 border border-rose-500/30 self-start">
                    Keyframing · Due in 6h
                  </span>
                </div>

                <div className="flex flex-wrap items-center gap-1.5 text-xs">
                  <span className="text-[#97A0B3] font-semibold text-[10px]">Comps:</span>
                  <span className="px-2 py-0.5 rounded-md bg-[#161F2D] border border-[#2A3446] text-[#F1F5F9] font-bold text-[10px]">
                    Bumper_A_Hero
                  </span>
                  <span className="px-2 py-0.5 rounded-md bg-[#161F2D] border border-[#2A3446] text-[#F1F5F9] font-bold text-[10px]">
                    Bumper_B_Gift
                  </span>
                  <span className="px-2 py-0.5 rounded-md bg-[#161F2D] border border-[#2A3446] text-[#F1F5F9] font-bold text-[10px]">
                    Bumper_C_Countdown
                  </span>
                </div>

                <div className="flex flex-wrap items-center gap-2 pt-0.5">
                  <button
                    onClick={() => showToast("Opened After Effects project file ATL-119_v03.aep")}
                    className="px-3 py-1.5 rounded-lg bg-[#161F2D] border border-[#2A3446] hover:bg-[#161F2D] text-[11px] font-bold text-[#F1F5F9] flex items-center gap-1 transition-colors cursor-pointer"
                  >
                    <ExternalLink className="size-3 text-[#97A0B3]" />
                    Open in AE
                  </button>
                  <button
                    onClick={() => {
                      navigate("/workstation/handoff");
                    }}
                    className="px-3.5 py-1.5 rounded-lg bg-[#7FA0D6] hover:bg-blue-700 text-white text-[11px] font-bold flex items-center gap-1 shadow-2xs transition-all cursor-pointer ml-auto"
                  >
                    <Send className="size-3" />
                    Submit for QA
                  </button>
                </div>
              </div>
            </div>
            {/* Section B: Assigned Sprint Deliverables Table */}
            <div className="bg-[#161F2D] rounded-2xl p-4 sm:p-5 border border-[#2A3446]/80 shadow-2xs space-y-3">
              <div className="flex items-center justify-between pb-2.5 border-b border-[#2A3446]">
                <div>
                  <h2 className="text-sm font-black text-white">Assigned Sprint Deliverables</h2>
                  <p className="text-[11px] text-[#97A0B3]">Deliverables tracker across client pods</p>
                </div>

                <div className="flex items-center bg-[#161F2D] p-0.5 rounded-lg text-xs font-bold">
                  <button
                    onClick={() => setDeliverablesTab("active")}
                    className={`px-2.5 py-0.5 rounded-md transition-all ${
                      deliverablesTab === "active" ? "bg-[#161F2D] text-white shadow-2xs" : "text-[#97A0B3]"
                    }`}
                  >
                    Active ({activeSprintTasks.length})
                  </button>
                  <button
                    onClick={() => setDeliverablesTab("archived")}
                    className={`px-2.5 py-0.5 rounded-md transition-all ${
                      deliverablesTab === "archived" ? "bg-[#161F2D] text-white shadow-2xs" : "text-[#97A0B3]"
                    }`}
                  >
                    Archived
                  </button>
                </div>
              </div>

              {/* Dynamic Deliverables View */}
              {(() => {
                const currentTasks = deliverablesTab === "active" ? activeSprintTasks : completedTasks;
                if (currentTasks.length === 0) {
                  return (
                    <div className="py-10 text-center border-2 border-dashed border-[#2A3446] rounded-xl space-y-1">
                      <p className="font-bold text-white text-xs">No {deliverablesTab} deliverables found</p>
                      <p className="text-[11px] text-[#97A0B3]">Tasks will appear here once active in the sprint queue.</p>
                    </div>
                  );
                }
                return (
                  <>
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
                            <span className="font-bold text-[#7FA0D6] text-[10px]">{t.assignee?.full_name || t.assignee_name || "Assigned"}</span>
                            <div className="flex items-center gap-1">
                              <button
                                onClick={() => setUploadModalOpen(true)}
                                className="px-2 py-0.5 rounded-md border border-[#2A3446] bg-[#161F2D] hover:bg-[#161F2D] text-[#F1F5F9] font-bold text-[10px] cursor-pointer"
                              >
                                Upload
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Desktop Table (sm+) */}
                    <div className="hidden sm:block overflow-x-auto">
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
                              <td className="py-2.5 px-2.5 font-bold text-[#F1F5F9] text-xs">{t.assignee?.full_name || t.assignee_name || "Unassigned"}</td>
                              <td className="py-2.5 px-2.5 text-right space-x-1.5">
                                <button
                                  onClick={() => setUploadModalOpen(true)}
                                  className="px-2.5 py-1 rounded-md border border-[#2A3446] hover:bg-[#161F2D] text-[#F1F5F9] font-bold text-[10px] cursor-pointer"
                                >
                                  Upload
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </>
                );
              })()}
            </div>
          </div>

          {/* RIGHT 1 COLUMN */}
          <div className="space-y-3.5 sm:space-y-4">
            {/* Lead Feedback & Notes */}
            <div className="bg-[#161F2D] rounded-2xl p-4 border border-[#2A3446]/80 shadow-2xs space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-[#2A3446]">
                <div className="flex items-center gap-1.5">
                  <FileText className="size-3.5 text-[#7FA0D6]" />
                  <h3 className="text-xs font-black text-white">Lead Feedback & Notes</h3>
                </div>
                <span className="px-2 py-0.2 rounded-full text-[9px] font-black bg-[#7FA0D6]/15 text-[#7FA0D6]">
                  {notesList.length} Updates
                </span>
              </div>

              {/* Feed Items */}
              <div className="space-y-2.5 max-h-[300px] overflow-y-auto pr-1">
                {notesList.map((note) => (
                  <div key={note.id} className="p-2.5 rounded-xl bg-[#0B111C]/80 border border-[#2A3446]/60 space-y-1.5 text-xs">
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
                      <span className={`px-1.5 py-0.2 rounded text-[9px] font-bold ${note.badgeColor || "bg-[#7FA0D6]/20/70 text-[#7FA0D6]"}`}>
                        {note.badge}
                      </span>
                    </div>

                    <p className="text-[#F1F5F9] leading-relaxed font-medium text-[11px]">"{note.content}"</p>

                    {note.attachment && (
                      <button
                        onClick={() => showToast(`Opened Frame.io markup preview: ${note.attachment}`)}
                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-[#161F2D] border border-[#2A3446] text-[#7FA0D6] font-bold text-[9px] hover:bg-[#7FA0D6]/15 cursor-pointer"
                      >
                        🖼️ {note.attachment}
                      </button>
                    )}
                    {note.tag && (
                      <span className="inline-block text-[9px] font-bold text-emerald-400 bg-emerald-500/15 border border-emerald-500/30 px-1.5 py-0.5 rounded">
                        ✓ {note.tag}
                      </span>
                    )}
                  </div>
                ))}
              </div>

              {/* Quick Reply Form */}
              <form onSubmit={handleSendQuickReply} className="pt-1.5 border-t border-[#2A3446] flex items-center gap-1.5">
                <input
                  type="text"
                  value={quickReplyText}
                  onChange={(e) => setQuickReplyText(e.target.value)}
                  placeholder="Quick reply to pod lead..."
                  className="flex-1 px-2.5 py-1.5 rounded-lg bg-[#0B111C] border border-[#2A3446] text-[11px] font-medium placeholder:text-[#97A0B3] focus:outline-none focus:bg-[#161F2D] focus:ring-1 focus:ring-blue-500"
                />
                <button
                  type="submit"
                  className="size-7 rounded-lg bg-[#7FA0D6] hover:bg-blue-700 text-white flex items-center justify-center transition-colors cursor-pointer shrink-0"
                >
                  <Send className="size-3" />
                </button>
              </form>
            </div>

            {/* Pod A Team Sync */}
            <div className="bg-[#161F2D] rounded-2xl p-4 border border-[#2A3446]/80 shadow-2xs space-y-3">
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
              <div className="space-y-2 text-xs">
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
          onClick={() => setUploadModalOpen(false)}
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
                  <p className="text-xs text-[#97A0B3]">Sync render exports directly to Frame.io QA gate</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setUploadModalOpen(false)}
                className="size-8 rounded-full bg-[#161F2D] hover:bg-slate-200 text-[#97A0B3] flex items-center justify-center cursor-pointer"
              >
                <X className="size-4" />
              </button>
            </div>

            <form onSubmit={handleUploadSubmit} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-bold text-[#F1F5F9] mb-1">Client Workspace</label>
                <NativeSelect
                  value={uploadClient}
                  onChange={(e) => setUploadClient(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-[#2A3446] font-semibold bg-[#161F2D]"
                >
                  {clients.length > 0 ? clients.map(c => <option key={c.id} value={c.name}>{c.name}</option>) : <option value="General Pod Workspace">General Pod Workspace</option>}
                </NativeSelect>
              </div>

              <div>
                <label className="block font-bold text-[#F1F5F9] mb-1">Deliverable Asset Title</label>
                <input
                  type="text"
                  required
                  value={uploadAssetTitle}
                  onChange={(e) => setUploadAssetTitle(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-[#2A3446] font-bold"
                />
              </div>

              {/* Drag Drop Area */}
              <div className="p-6 border-2 border-dashed border-[#2A3446] rounded-2xl text-center space-y-2 bg-[#0B111C] hover:bg-[#7FA0D6]/15/50 hover:border-blue-300 transition-colors cursor-pointer">
                <Upload className="size-7 text-[#7FA0D6] mx-auto" />
                <div className="font-bold text-white">
                  {uploadFile ? uploadFile.name : "Drag & drop master render (ProRes / MP4 / AEP)"}
                </div>
                <div className="text-[11px] text-[#97A0B3]">Up to 10GB per asset • Color space verified</div>
                <input
                  type="file"
                  className="hidden"
                  id="asset-file-input"
                  onChange={(e) => e.target.files?.[0] && setUploadFile(e.target.files[0])}
                />
                <label
                  htmlFor="asset-file-input"
                  className="inline-block px-3 py-1.5 rounded-lg bg-[#161F2D] border border-[#2A3446] text-[#F1F5F9] font-bold text-xs hover:bg-[#161F2D] cursor-pointer mt-1"
                >
                  Browse Computer
                </label>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#2A3446]">
                <button
                  type="button"
                  onClick={() => setUploadModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-[#2A3446] font-bold text-[#F1F5F9] hover:bg-[#0B111C] cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-[#7FA0D6] hover:bg-blue-700 text-white font-bold shadow-xs cursor-pointer"
                >
                  Confirm & Upload Asset
                </button>
              </div>
            </form>
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

            <div className="p-3 bg-[#0B111C] rounded-2xl border border-[#2A3446] text-xs font-mono text-[#F1F5F9]">
              zoom.us/j/9814421990?pwd=creo
            </div>

            <div className="flex items-center justify-center gap-2 pt-2 border-t border-[#2A3446]">
              <button
                type="button"
                onClick={() => setZoomModalOpen(false)}
                className="px-4 py-2 rounded-xl border border-[#2A3446] font-bold text-xs text-[#F1F5F9] hover:bg-[#0B111C] cursor-pointer"
              >
                Dismiss
              </button>
              <button
                type="button"
                onClick={() => {
                  setZoomModalOpen(false);
                  showToast("Connecting to ${podName} Standup video room...");
                }}
                className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md shadow-emerald-600/20 cursor-pointer"
              >
                Open Video Room
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
