import { useState } from "react";
import { Link, useNavigate } from "react-router";
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

  // State for interactive actions
  const [renderPaused, setRenderPaused] = useState(false);
  const [renderProgress] = useState(75);
  const [quickReplyText, setQuickReplyText] = useState("");
  const [toastMessage, setToastMessage] = useState<{ text: string; type: "success" | "info" } | null>(null);

  // Modals
  const [logHoursModalOpen, setLogHoursModalOpen] = useState(false);
  const [hoursToLog, setHoursToLog] = useState("2.5");
  const [hoursProject, setHoursProject] = useState("Northwind Labs - 3D Product Teaser");
  const [hoursNotes, setHoursNotes] = useState("Octane shader tuning, keyframe polishing & lighting pass");

  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadClient, setUploadClient] = useState("Northwind Labs");
  const [uploadAssetTitle, setUploadAssetTitle] = useState("Hero 3D Visual Loop v1.2");

  const [inspectModalOpen, setInspectModalOpen] = useState(false);
  const [handoffConfirmOpen, setHandoffConfirmOpen] = useState(false);
  const [zoomModalOpen, setZoomModalOpen] = useState(false);
  const [deliverablesTab, setDeliverablesTab] = useState<"active" | "archived">("active");

  const [notesList, setNotesList] = useState<LeadNoteItem[]>([
    {
      id: "note-1",
      author: "Maya Lin",
      role: "Lead Motion • 22m ago",
      badge: "NW-004",
      content:
        "Fintech Ad sound stems look great, make sure CTA text adheres to Northwind brand contrast guidelines. Render passes 3 through 6 look crisp.",
      attachment: "frame_0320_markup.png",
      avatarBg: "bg-blue-600",
      avatar: "ML",
    },
    {
      id: "note-2",
      author: "Marcus Vance",
      role: "Copy Lead • 1h ago",
      badge: "ATL-119",
      content:
        "Updated the legal disclaimer copy for Holiday Bumper C. Bumped character kerning slightly for better readability at 1080p mobile preview.",
      tag: "Synced to Figma Flow Node",
      avatarBg: "bg-[#0F172A]",
      avatar: "MV",
    },
    {
      id: "note-3",
      author: "Automated QA Bot",
      role: "Render Pass Sentinel • 2h ago",
      badge: "Passed",
      badgeColor: "bg-emerald-50 text-emerald-700 border-emerald-200",
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
        author: "David Kim",
        role: "Sr. Motion (You) • Just now",
        badge: "Reply",
        content: quickReplyText,
        avatarBg: "bg-[#2563EB]",
        avatar: "DK",
      },
      ...notesList,
    ]);
    showToast(`Reply sent to Maya Lin: "${quickReplyText}"`);
    setQuickReplyText("");
  };

  const handleConfirmHandoff = () => {
    setHandoffConfirmOpen(false);
    showToast("Fintech Ad Set render output handed off to Maya Lin for sign-off review!");
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
                ? "bg-[#7FA0D6]/15 border-[#7FA0D6]/30 text-blue-800"
                : "bg-emerald-50 border-emerald-200 text-emerald-800"
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
            <span className="text-xs font-black text-white tracking-tight">POD A ACTIVE SHIFT</span>
            <span className="text-[11px] text-[#97A0B3] font-medium hidden sm:inline">• Sr. Motion Specialist (David Kim)</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setLogHoursModalOpen(true)}
              className="flex-1 sm:flex-initial px-3 py-1.5 rounded-lg bg-[#0B111C] hover:bg-[#1F2C3F] border border-[#2A3446] text-[#F1F5F9] text-xs font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
            >
              <Clock className="size-3 text-[#97A0B3]" />
              <span>Log Hours</span>
            </button>
            <button
              onClick={() => setUploadModalOpen(true)}
              className="flex-1 sm:flex-initial px-3 py-1.5 rounded-lg bg-[#2563EB] hover:bg-blue-700 text-white text-xs font-bold flex items-center justify-center gap-1.5 shadow-2xs transition-all cursor-pointer"
            >
              <Upload className="size-3" />
              <span>+ Upload</span>
            </button>
          </div>
        </div>

        {/* 2. Top 3 Metric Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 sm:gap-3">
          {/* Active Sprint Tasks */}
          <div className="bg-[#161F2D] rounded-xl sm:rounded-2xl p-2.5 sm:p-3 border border-[#2A3446]/80 shadow-2xs flex flex-col justify-between">
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
                <span className="text-lg sm:text-xl font-black text-white">3</span>
                <span className="text-[10.5px] sm:text-[11px] font-bold text-[#97A0B3]">Active</span>
                <span className="text-[9.5px] sm:text-[10px] text-[#97A0B3] truncate">1 render · 1 QA · 1 ready</span>
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
          </div>

          {/* Weekly Hours Logged */}
          <div className="bg-[#161F2D] rounded-xl sm:rounded-2xl p-2.5 sm:p-3 border border-[#2A3446]/80 shadow-2xs flex flex-col justify-between">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[9px] sm:text-[10px] font-bold uppercase tracking-wider text-[#97A0B3]">
                WEEKLY HOURS LOGGED
              </span>
              <div className="size-6 sm:size-7 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
                <Clock className="size-3 sm:size-3.5" />
              </div>
            </div>
            <div>
              <div className="flex items-baseline gap-1.5 mb-1">
                <span className="text-lg sm:text-xl font-black text-white">32.5</span>
                <span className="text-[10.5px] sm:text-[11px] font-bold text-[#97A0B3]">/ 40 hrs</span>
              </div>
              {/* Progress bar */}
              <div className="w-full h-1.5 bg-[#1F2C3F] rounded-full overflow-hidden my-1">
                <div className="h-full bg-blue-600 rounded-full w-[81%]" />
              </div>
              <div className="flex items-center justify-between text-[10px] sm:text-[11px] pt-1 border-t border-[#2A3446]">
                <span className="font-bold text-emerald-600">81% target</span>
                <span className="font-bold text-[#97A0B3]">7.5h left</span>
              </div>
            </div>
          </div>

          {/* Remaining PTO */}
          <div className="bg-[#161F2D] rounded-xl sm:rounded-2xl p-2.5 sm:p-3 border border-[#2A3446]/80 shadow-2xs flex flex-col justify-between">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[9px] sm:text-[10px] font-bold uppercase tracking-wider text-[#97A0B3]">
                REMAINING PTO
              </span>
              <div className="size-6 sm:size-7 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center">
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
          </div>
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
                <span className="text-[9px] font-mono font-bold text-[#97A0B3] bg-[#1F2C3F] px-2 py-0.5 rounded">
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
                        <span className="text-xs font-bold text-[#7FA0D6]">Northwind Labs</span>
                        <span className="text-[#97A0B3] text-[10px]">· NW-004-MS</span>
                      </div>
                      <h3 className="text-xs font-black text-white">Fintech Ad Set - 3D Product Teaser</h3>
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
                  <div className="w-full h-1.5 bg-[#1F2C3F] rounded-full overflow-hidden">
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
                    className="px-3 py-1.5 rounded-lg bg-[#161F2D] border border-[#2A3446] hover:bg-[#1F2C3F] text-[11px] font-bold text-[#F1F5F9] flex items-center gap-1 transition-colors cursor-pointer"
                  >
                    {renderPaused ? <Play className="size-3 text-emerald-600" /> : <Pause className="size-3 text-amber-600" />}
                    {renderPaused ? "Resume" : "Pause"}
                  </button>
                  <button
                    onClick={() => setInspectModalOpen(true)}
                    className="px-3 py-1.5 rounded-lg bg-[#161F2D] border border-[#2A3446] hover:bg-[#1F2C3F] text-[11px] font-bold text-[#F1F5F9] flex items-center gap-1 transition-colors cursor-pointer"
                  >
                    <Layers className="size-3 text-[#97A0B3]" />
                    Inspect Cache
                  </button>
                  <button
                    onClick={() => setHandoffConfirmOpen(true)}
                    className="px-3 py-1.5 rounded-lg bg-[#7FA0D6]/15 hover:bg-[#7FA0D6]/20 text-[#7FA0D6] text-[11px] font-bold flex items-center gap-1 transition-colors cursor-pointer ml-auto"
                  >
                    <Send className="size-3" />
                    Handoff to Maya
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
                        <span className="text-xs font-bold text-purple-600">Atlas Commerce</span>
                        <span className="text-[#97A0B3] text-[10px]">· ATL-119-KB</span>
                      </div>
                      <h3 className="text-xs font-black text-white">Holiday Promotion 3D Bumpers</h3>
                      <div className="flex flex-wrap items-center gap-1.5 text-[10px] text-[#97A0B3] mt-0.5">
                        <span>1080x1080</span>
                        <span>•</span>
                        <span>3 Variations</span>
                        <span>•</span>
                        <span className="text-emerald-600 font-bold">Figma Sync</span>
                      </div>
                    </div>
                  </div>

                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200 self-start">
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
                    className="px-3 py-1.5 rounded-lg bg-[#161F2D] border border-[#2A3446] hover:bg-[#1F2C3F] text-[11px] font-bold text-[#F1F5F9] flex items-center gap-1 transition-colors cursor-pointer"
                  >
                    <ExternalLink className="size-3 text-[#97A0B3]" />
                    Open in AE
                  </button>
                  <button
                    onClick={() => {
                      navigate("/workstation/handoff");
                    }}
                    className="px-3.5 py-1.5 rounded-lg bg-[#2563EB] hover:bg-blue-700 text-white text-[11px] font-bold flex items-center gap-1 shadow-2xs transition-all cursor-pointer ml-auto"
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

                <div className="flex items-center bg-[#1F2C3F] p-0.5 rounded-lg text-xs font-bold">
                  <button
                    onClick={() => setDeliverablesTab("active")}
                    className={`px-2.5 py-0.5 rounded-md transition-all ${
                      deliverablesTab === "active" ? "bg-[#161F2D] text-white shadow-2xs" : "text-[#97A0B3]"
                    }`}
                  >
                    Active (3)
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

              {/* Mobile Card View (< sm) */}
              <div className="block sm:hidden space-y-2">
                <div className="p-3 rounded-xl bg-[#0B111C]/90 border border-[#2A3446]/80 space-y-2">
                  <div className="flex items-start justify-between gap-1.5">
                    <div>
                      <span className="text-[9px] font-bold text-[#7FA0D6] uppercase">Northwind Labs</span>
                      <h4 className="text-xs font-black text-white leading-snug">Fintech Ad Set - Teaser</h4>
                      <div className="text-[10px] text-[#97A0B3] font-medium">Octane 3D Scene (.c4d + .exr)</div>
                    </div>
                    <span className="px-1.5 py-0.2 rounded text-[8px] font-black bg-rose-50 text-rose-700 border border-rose-200 shrink-0">
                      P1 HIGH
                    </span>
                  </div>
                  <div className="flex items-center justify-between pt-1.5 border-t border-[#2A3446]/60 text-xs">
                    <span className="font-bold text-[#7FA0D6] text-[10px]">2h 45m left</span>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => setUploadModalOpen(true)}
                        className="px-2 py-0.5 rounded-md border border-[#2A3446] bg-[#161F2D] hover:bg-[#1F2C3F] text-[#F1F5F9] font-bold text-[10px] cursor-pointer"
                      >
                        Upload
                      </button>
                      <button
                        onClick={() => showToast("Opened production notes for NW-004")}
                        className="px-2 py-0.5 rounded-md border border-[#2A3446] bg-[#161F2D] hover:bg-[#1F2C3F] text-[#F1F5F9] font-bold text-[10px] cursor-pointer"
                      >
                        Notes
                      </button>
                    </div>
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-[#0B111C]/90 border border-[#2A3446]/80 space-y-2">
                  <div className="flex items-start justify-between gap-1.5">
                    <div>
                      <span className="text-[9px] font-bold text-purple-600 uppercase">Atlas Commerce</span>
                      <h4 className="text-xs font-black text-white leading-snug">Holiday 3D Bumpers</h4>
                      <div className="text-[10px] text-[#97A0B3] font-medium">AfterEffects Motion Stems (.aep)</div>
                    </div>
                    <span className="px-1.5 py-0.2 rounded text-[8px] font-black bg-purple-50 text-purple-700 border border-purple-200 shrink-0">
                      P2 MED
                    </span>
                  </div>
                  <div className="flex items-center justify-between pt-1.5 border-t border-[#2A3446]/60 text-xs">
                    <span className="font-bold text-[#F1F5F9] text-[10px]">6h 15m left</span>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => setUploadModalOpen(true)}
                        className="px-2 py-0.5 rounded-md border border-[#2A3446] bg-[#161F2D] hover:bg-[#1F2C3F] text-[#F1F5F9] font-bold text-[10px] cursor-pointer"
                      >
                        Upload
                      </button>
                      <button
                        onClick={() => showToast("Opened production notes for ATL-119")}
                        className="px-2 py-0.5 rounded-md border border-[#2A3446] bg-[#161F2D] hover:bg-[#1F2C3F] text-[#F1F5F9] font-bold text-[10px] cursor-pointer"
                      >
                        Notes
                      </button>
                    </div>
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-[#0B111C]/90 border border-[#2A3446]/80 space-y-2">
                  <div className="flex items-start justify-between gap-1.5">
                    <div>
                      <span className="text-[9px] font-bold text-[#F1F5F9] uppercase">Bloom Studio</span>
                      <h4 className="text-xs font-black text-white leading-snug">Brand Kinetic Typography</h4>
                      <div className="text-[10px] text-[#97A0B3] font-medium">Lottie JSON + MP4 Alpha</div>
                    </div>
                    <span className="px-1.5 py-0.2 rounded text-[8px] font-bold bg-[#1F2C3F] text-[#F1F5F9] shrink-0">
                      P3 STD
                    </span>
                  </div>
                  <div className="flex items-center justify-between pt-1.5 border-t border-[#2A3446]/60 text-xs">
                    <span className="font-bold text-[#97A0B3] text-[10px]">Tomorrow 12 PM</span>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => setUploadModalOpen(true)}
                        className="px-2 py-0.5 rounded-md border border-[#2A3446] bg-[#161F2D] hover:bg-[#1F2C3F] text-[#F1F5F9] font-bold text-[10px] cursor-pointer"
                      >
                        Upload
                      </button>
                      <button
                        onClick={() => showToast("Opened production notes for BLM-082")}
                        className="px-2 py-0.5 rounded-md border border-[#2A3446] bg-[#161F2D] hover:bg-[#1F2C3F] text-[#F1F5F9] font-bold text-[10px] cursor-pointer"
                      >
                        Notes
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Desktop Table (sm+) */}
              <div className="hidden sm:block overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-[#2A3446] text-[#97A0B3] font-bold uppercase tracking-wider text-[9px]">
                      <th className="py-2 px-2.5">Asset Name & ID</th>
                      <th className="py-2 px-2.5">Client</th>
                      <th className="py-2 px-2.5">Priority</th>
                      <th className="py-2 px-2.5">SLA Countdown</th>
                      <th className="py-2 px-2.5 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium text-[#F1F5F9]">
                    <tr className="hover:bg-[#0B111C]/60 transition-colors">
                      <td className="py-2.5 px-2.5">
                        <div className="font-bold text-white text-xs">Fintech Ad Set - Teaser</div>
                        <div className="text-[10px] text-[#97A0B3]">Octane 3D Scene (.c4d + .exr)</div>
                      </td>
                      <td className="py-2.5 px-2.5 font-semibold text-white text-xs">Northwind Labs</td>
                      <td className="py-2.5 px-2.5">
                        <span className="px-1.5 py-0.2 rounded text-[9px] font-black bg-rose-50 text-rose-700 border border-rose-200">
                          P1 HIGH
                        </span>
                      </td>
                      <td className="py-2.5 px-2.5 font-black text-[#7FA0D6] text-xs">2h 45m left</td>
                      <td className="py-2.5 px-2.5 text-right space-x-1.5">
                        <button
                          onClick={() => setUploadModalOpen(true)}
                          className="px-2 py-0.5 rounded-md border border-[#2A3446] hover:bg-[#1F2C3F] text-[#F1F5F9] font-bold text-[10px] cursor-pointer"
                        >
                          Upload
                        </button>
                        <button
                          onClick={() => showToast("Opened production notes for NW-004")}
                          className="px-2 py-0.5 rounded-md border border-[#2A3446] hover:bg-[#1F2C3F] text-[#F1F5F9] font-bold text-[10px] cursor-pointer"
                        >
                          Notes
                        </button>
                      </td>
                    </tr>

                    <tr className="hover:bg-[#0B111C]/60 transition-colors">
                      <td className="py-2.5 px-2.5">
                        <div className="font-bold text-white text-xs">Holiday 3D Bumpers</div>
                        <div className="text-[10px] text-[#97A0B3]">AfterEffects Motion Stems (.aep)</div>
                      </td>
                      <td className="py-2.5 px-2.5 font-semibold text-white text-xs">Atlas Commerce</td>
                      <td className="py-2.5 px-2.5">
                        <span className="px-1.5 py-0.2 rounded text-[9px] font-black bg-purple-50 text-purple-700 border border-purple-200">
                          P2 MED
                        </span>
                      </td>
                      <td className="py-2.5 px-2.5 font-black text-[#F1F5F9] text-xs">6h 15m left</td>
                      <td className="py-2.5 px-2.5 text-right space-x-1.5">
                        <button
                          onClick={() => setUploadModalOpen(true)}
                          className="px-2 py-0.5 rounded-md border border-[#2A3446] hover:bg-[#1F2C3F] text-[#F1F5F9] font-bold text-[10px] cursor-pointer"
                        >
                          Upload
                        </button>
                        <button
                          onClick={() => showToast("Opened production notes for ATL-119")}
                          className="px-2 py-0.5 rounded-md border border-[#2A3446] hover:bg-[#1F2C3F] text-[#F1F5F9] font-bold text-[10px] cursor-pointer"
                        >
                          Notes
                        </button>
                      </td>
                    </tr>

                    <tr className="hover:bg-[#0B111C]/60 transition-colors">
                      <td className="py-2.5 px-2.5">
                        <div className="font-bold text-white text-xs">Brand Kinetic Typography Loop</div>
                        <div className="text-[10px] text-[#97A0B3]">Lottie JSON + MP4 Alpha Channel</div>
                      </td>
                      <td className="py-2.5 px-2.5 font-semibold text-white text-xs">Bloom Studio</td>
                      <td className="py-2.5 px-2.5">
                        <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-[#1F2C3F] text-[#F1F5F9]">
                          P3 STD
                        </span>
                      </td>
                      <td className="py-2.5 px-2.5 font-bold text-[#97A0B3] text-xs">Tomorrow 12:00 PM</td>
                      <td className="py-2.5 px-2.5 text-right space-x-1.5">
                        <button
                          onClick={() => setUploadModalOpen(true)}
                          className="px-2 py-0.5 rounded-md border border-[#2A3446] hover:bg-[#1F2C3F] text-[#F1F5F9] font-bold text-[10px] cursor-pointer"
                        >
                          Upload
                        </button>
                        <button
                          onClick={() => showToast("Opened production notes for BLM-082")}
                          className="px-2 py-0.5 rounded-md border border-[#2A3446] hover:bg-[#1F2C3F] text-[#F1F5F9] font-bold text-[10px] cursor-pointer"
                        >
                          Notes
                        </button>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
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
                      <span className="inline-block text-[9px] font-bold text-emerald-600 bg-emerald-50 px-1.5 py-0.2 rounded">
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
                  placeholder="Quick reply to Maya or Marcus..."
                  className="flex-1 px-2.5 py-1.5 rounded-lg bg-[#0B111C] border border-[#2A3446] text-[11px] font-medium placeholder:text-[#97A0B3] focus:outline-none focus:bg-[#161F2D] focus:ring-1 focus:ring-blue-500"
                />
                <button
                  type="submit"
                  className="size-7 rounded-lg bg-[#2563EB] hover:bg-blue-700 text-white flex items-center justify-center transition-colors cursor-pointer shrink-0"
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
                  <h3 className="text-xs font-black text-white">Pod A Team Sync</h3>
                </div>
                <span className="px-2 py-0.2 rounded-full text-[9px] font-black bg-emerald-50 text-emerald-700 border border-emerald-200">
                  ● 5 Active
                </span>
              </div>

              {/* Standup Banner */}
              <div className="p-2.5 rounded-xl bg-[#7FA0D6]/15/80 border border-[#7FA0D6]/30 flex items-center justify-between gap-2">
                <div>
                  <div className="text-[11px] font-black text-blue-900">10:00 AM Daily Standup</div>
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
                <div className="flex items-center justify-between p-1.5 rounded-lg hover:bg-[#0B111C] transition-colors">
                  <div className="flex items-center gap-2">
                    <div className="size-6 rounded-md bg-blue-600 text-white font-black text-[9px] flex items-center justify-center">
                      ML
                    </div>
                    <div>
                      <span className="font-bold text-white block text-[11px]">Maya Lin</span>
                      <span className="text-[9px] text-[#97A0B3]">Lead Motion • Reviewing</span>
                    </div>
                  </div>
                  <span className="text-[9px] font-black px-1.5 py-0.2 rounded bg-[#1F2C3F] text-[#F1F5F9]">
                    Pod Lead
                  </span>
                </div>

                <div className="flex items-center justify-between p-1.5 rounded-lg hover:bg-[#0B111C] transition-colors">
                  <div className="flex items-center gap-2">
                    <div className="size-6 rounded-md bg-purple-600 text-white font-black text-[9px] flex items-center justify-center">
                      EO
                    </div>
                    <div>
                      <span className="font-bold text-white block text-[11px]">Elena Ortiz</span>
                      <span className="text-[9px] text-[#97A0B3]">Brand Designer • Working</span>
                    </div>
                  </div>
                  <span className="size-1.5 rounded-full bg-emerald-500" />
                </div>

                <div className="flex items-center justify-between p-1.5 rounded-lg hover:bg-[#0B111C] transition-colors">
                  <div className="flex items-center gap-2">
                    <div className="size-6 rounded-md bg-slate-900 text-white font-black text-[9px] flex items-center justify-center">
                      MV
                    </div>
                    <div>
                      <span className="font-bold text-white block text-[11px]">Marcus Vance</span>
                      <span className="text-[9px] text-[#97A0B3]">Copy • In sync</span>
                    </div>
                  </div>
                  <span className="size-1.5 rounded-full bg-emerald-500" />
                </div>

                <div className="flex items-center justify-between p-2 rounded-xl hover:bg-[#0B111C] transition-colors">
                  <div className="flex items-center gap-2.5">
                    <div className="size-7 rounded-lg bg-teal-600 text-white font-black text-[10px] flex items-center justify-center">
                      CT
                    </div>
                    <div>
                      <span className="font-black text-white block">Chloe Tan</span>
                      <span className="text-[10px] text-[#97A0B3]">Backup Motion • Render spillover</span>
                    </div>
                  </div>
                  <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded">
                    Available
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <footer className="pt-6 pb-2 border-t border-[#2A3446]/80 flex flex-col sm:flex-row items-center justify-between text-xs text-[#97A0B3] gap-2">
          <div className="flex items-center gap-2">
            <span className="font-black text-white">creo.</span>
            <span>Team Member Workstation – Pod A Studio Operations</span>
          </div>
          <div className="flex items-center gap-4 text-[11px]">
            <span>© 2025 Creo Design Systems. Confidential</span>
            <span className="hover:underline cursor-pointer">Security & Compliance</span>
          </div>
        </footer>
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
                className="size-8 rounded-full bg-[#1F2C3F] hover:bg-slate-200 text-[#97A0B3] flex items-center justify-center cursor-pointer"
              >
                <X className="size-4" />
              </button>
            </div>

            <form onSubmit={handleSaveHours} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-bold text-[#F1F5F9] mb-1">Deliverable Project</label>
                <select
                  value={hoursProject}
                  onChange={(e) => setHoursProject(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-[#2A3446] font-semibold bg-[#161F2D]"
                >
                  <option value="Northwind Labs - 3D Product Teaser">Northwind Labs · 3D Product Teaser (NW-004)</option>
                  <option value="Atlas Commerce - Holiday Promotion Bumpers">Atlas Commerce · Holiday Promotion Bumpers (ATL-119)</option>
                  <option value="Bloom Studio - Brand Kinetic Typography">Bloom Studio · Brand Kinetic Typography (BLM-082)</option>
                  <option value="Pod A - Standup & Team Peer QA">Pod A · Standup & Internal Review</option>
                </select>
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
                  className="px-5 py-2 rounded-xl bg-[#2563EB] hover:bg-blue-700 text-white font-bold shadow-xs cursor-pointer"
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
                className="size-8 rounded-full bg-[#1F2C3F] hover:bg-slate-200 text-[#97A0B3] flex items-center justify-center cursor-pointer"
              >
                <X className="size-4" />
              </button>
            </div>

            <form onSubmit={handleUploadSubmit} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-bold text-[#F1F5F9] mb-1">Client Workspace</label>
                <select
                  value={uploadClient}
                  onChange={(e) => setUploadClient(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-[#2A3446] font-semibold bg-[#161F2D]"
                >
                  <option value="Northwind Labs">Northwind Labs</option>
                  <option value="Atlas Commerce">Atlas Commerce</option>
                  <option value="Bloom Studio">Bloom Studio</option>
                </select>
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
                  className="inline-block px-3 py-1.5 rounded-lg bg-[#161F2D] border border-[#2A3446] text-[#F1F5F9] font-bold text-xs hover:bg-[#1F2C3F] cursor-pointer mt-1"
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
                  className="px-5 py-2 rounded-xl bg-[#2563EB] hover:bg-blue-700 text-white font-bold shadow-xs cursor-pointer"
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
                className="size-8 rounded-full bg-[#1F2C3F] hover:bg-slate-200 text-[#97A0B3] flex items-center justify-center cursor-pointer"
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
                className="px-5 py-2 rounded-xl bg-[#2563EB] hover:bg-blue-700 text-white font-bold cursor-pointer"
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
              <h3 className="text-base font-black text-white">Handoff Cut to Lead Maya Lin?</h3>
              <p className="text-xs text-[#97A0B3] mt-1 leading-relaxed">
                This will trigger a synchronous QA review notification for Maya Lin on the Pod A review queue.
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
                className="px-5 py-2 rounded-xl bg-[#2563EB] hover:bg-blue-700 text-white font-bold text-xs shadow-md shadow-blue-500/20 cursor-pointer"
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
            <div className="size-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto font-black">
              <Video className="size-6" />
            </div>
            <div>
              <h3 className="text-base font-black text-white">Pod A Daily Standup Session</h3>
              <p className="text-xs text-[#97A0B3] mt-1 leading-relaxed">
                Lead: Maya Lin • Topic: Sprint 09 Sprint Velocity & Northwind Labs Render Pass Sync
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
                  showToast("Connecting to Pod A Standup video room...");
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
