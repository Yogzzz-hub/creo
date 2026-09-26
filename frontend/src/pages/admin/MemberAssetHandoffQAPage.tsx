import { useState } from "react";
import {
  Sparkles,
  FileText,
  Play,
  Pause,
  CheckCircle2,
  Download,
  Filter,
  Eye,
  Send,
  X,
  Plus,
} from "lucide-react";
import { AdminTopHeader } from "../../components/admin/AdminTopHeader";

export function MemberAssetHandoffQAPage() {
  // State
  const [activeVersionTab, setActiveVersionTab] = useState<"verA" | "verB" | "verC">("verA");
  const [isPlaying, setIsPlaying] = useState(false);
  const currentTime = "00:09:15:22";
  const [handoffNote, setHandoffNote] = useState(
    "Updated color grading on slide 4 to match Sarah's feedback. Frame.io review link attached with timecode bookmarks."
  );

  // Self-QA Checklist
  const [checklist, setChecklist] = useState({
    safezone: true,
    audioLufs: true,
    brandVectors: true,
    subtitles: true,
  });

  const [toastMessage, setToastMessage] = useState<{ text: string; type: "success" | "info" } | null>(null);

  // Modals
  const [packageModalOpen, setPackageModalOpen] = useState(false);
  const [auditLogModalOpen, setAuditLogModalOpen] = useState(false);
  const [handoffConfirmModalOpen, setHandoffConfirmModalOpen] = useState(false);
  const [resubmitModalOpen, setResubmitModalOpen] = useState(false);
  const [selectedAssetToView, setSelectedAssetToView] = useState<any | null>(null);

  const showToast = (text: string, type: "success" | "info" = "success") => {
    setToastMessage({ text, type });
    setTimeout(() => setToastMessage(null), 4000);
  };

  const handleToggleChecklist = (key: keyof typeof checklist) => {
    setChecklist((prev) => {
      const next = { ...prev, [key]: !prev[key] };
      const allChecked = Object.values(next).every(Boolean);
      if (allChecked) {
        showToast("Self-QA checklist 100% verified!");
      }
      return next;
    });
  };

  const handleExportManifestCSV = () => {
    const csvContent =
      "Deliverable,Client Pod,Lead Reviewer,Status,Client Dispatch\n" +
      "Fintech Hero Animation (Full 60s Cut),Northwind Labs,Maya Lin,Signed Off by Maya Lin,Dispatched (AWS S302)\n" +
      "Atlas Holiday Teaser v1,Atlas Global Systems,Maya Lin,Revision Requested,Held for v2\n" +
      "Brand Audio Identity Stems,Zenith Autonomous,Maya Lin,Approved & Archived,Dispatched (APN S411)\n";

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `Pod_A_Handoff_Manifest_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    showToast("Downloaded Handoff Manifest CSV report", "success");
  };

  const handleSendToLeadForSignOff = () => {
    setHandoffConfirmModalOpen(false);
    showToast("Master handoff package dispatched to Maya Lin for synchronous sign-off!");
  };

  return (
    <div data-surface="ops" className="min-h-screen bg-[#0B111C] text-white font-sans flex flex-col">
      {/* Top Header Navigation matching Admin */}
      <AdminTopHeader activeTab="Asset Handoff & QA" />

      {/* Main Container */}
      <main className="flex-1 max-w-[1550px] w-full mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-6 space-y-4 sm:space-y-6">
        {/* Toast Alert */}
        {toastMessage && (
          <div
            className={`p-3.5 sm:p-4 rounded-2xl border text-xs font-bold flex items-center justify-between shadow-xl animate-fade-in ${
              toastMessage.type === "info"
                ? "bg-[#7FA0D6]/15 border-[#7FA0D6]/30 text-blue-800"
                : "bg-emerald-50 border-emerald-200 text-emerald-800"
            }`}
          >
            <div className="flex items-center gap-2">
              <CheckCircle2 className="size-4 text-emerald-600 shrink-0" />
              <span>{toastMessage.text}</span>
            </div>
            <button onClick={() => setToastMessage(null)} className="text-current opacity-70 hover:opacity-100">
              &times;
            </button>
          </div>
        )}

        {/* 1. Header Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 bg-[#161F2D] sm:bg-transparent p-4 sm:p-0 rounded-2xl sm:rounded-none border sm:border-0 border-[#2A3446] shadow-xs sm:shadow-none">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-[9px] sm:text-[10px] font-black uppercase tracking-wider text-[#7FA0D6]">
              <span>POD A - MOTION PIPELINE</span>
              <span>/</span>
              <span>QUALITY ASSURANCE GATE</span>
            </div>
            <h1 className="text-xl sm:text-2xl lg:text-3xl font-black text-white tracking-tight">
              Asset Handoff & Quality Assurance
            </h1>
          </div>

          <div className="flex items-center gap-2 sm:gap-3 pt-1 sm:pt-0">
            <button
              onClick={() => setAuditLogModalOpen(true)}
              className="flex-1 sm:flex-initial px-3 sm:px-4 py-2 rounded-xl bg-[#161F2D] border border-[#2A3446] hover:bg-[#0B111C] text-[#F1F5F9] text-xs font-bold flex items-center justify-center gap-1.5 sm:gap-2 shadow-2xs transition-colors cursor-pointer"
            >
              <FileText className="size-3.5 sm:size-4 text-[#97A0B3]" />
              <span>Audit Logs</span>
            </button>
            <button
              onClick={() => setPackageModalOpen(true)}
              className="flex-1 sm:flex-initial px-3 sm:px-4 py-2 rounded-xl bg-[#2563EB] hover:bg-blue-700 text-white text-xs font-bold flex items-center justify-center gap-1.5 sm:gap-2 shadow-md shadow-blue-500/20 transition-all cursor-pointer"
            >
              <Plus className="size-3.5 sm:size-4" />
              <span>+ New Package</span>
            </button>
          </div>
        </div>

        {/* 2. Main Two-Column Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6 items-start">
          {/* LEFT 2 COLUMNS */}
          <div className="lg:col-span-2 space-y-4 sm:space-y-6">
            {/* Section A: Video Player Canvas with Tabs */}
            <div className="bg-[#161F2D] rounded-2xl sm:rounded-3xl p-4 sm:p-7 border border-[#2A3446] shadow-[0_4px_20px_rgba(0,0,0,0.03)] space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-3 border-b border-[#2A3446]">
                <div>
                  <span className="text-[10px] sm:text-[11px] font-bold text-[#7FA0D6] uppercase">NORTHWIND LABS · CAMPAIGN 04</span>
                  <h2 className="text-sm sm:text-base font-black text-white">Fintech Ad Set (9:16 Vertical Reel – 4K)</h2>
                </div>

                <span className="px-2.5 sm:px-3 py-1 rounded-full text-[11px] sm:text-xs font-bold bg-[#7FA0D6]/15 text-[#7FA0D6] border border-[#7FA0D6]/30 self-start">
                  Ready for Sign-Off
                </span>
              </div>

              {/* Version Selector Tabs */}
              <div className="flex items-center gap-2 bg-[#1F2C3F]/80 p-1.5 rounded-2xl text-xs font-bold">
                <button
                  onClick={() => setActiveVersionTab("verA")}
                  className={`flex-1 py-2 rounded-xl transition-all ${
                    activeVersionTab === "verA"
                      ? "bg-[#161F2D] text-white shadow-xs font-black"
                      : "text-[#F1F5F9] hover:text-white"
                  }`}
                >
                  Ver A: Kinetic Reel
                </button>
                <button
                  onClick={() => setActiveVersionTab("verB")}
                  className={`flex-1 py-2 rounded-xl transition-all ${
                    activeVersionTab === "verB"
                      ? "bg-[#161F2D] text-white shadow-xs font-black"
                      : "text-[#F1F5F9] hover:text-white"
                  }`}
                >
                  Ver B: Minimalist
                </button>
                <button
                  onClick={() => setActiveVersionTab("verC")}
                  className={`flex-1 py-2 rounded-xl transition-all ${
                    activeVersionTab === "verC"
                      ? "bg-[#161F2D] text-white shadow-xs font-black"
                      : "text-[#F1F5F9] hover:text-white"
                  }`}
                >
                  Ver C: Board-Off
                </button>
              </div>

              {/* Interactive Player Canvas Box */}
              <div className="h-80 sm:h-96 rounded-2xl bg-slate-950 relative overflow-hidden flex flex-col justify-between p-4 sm:p-5 border border-slate-800 shadow-inner">
                {/* Top overlay badges */}
                <div className="flex items-center justify-between text-xs font-mono">
                  <div className="flex items-center gap-2">
                    <span className="bg-slate-900/80 backdrop-blur-md px-2.5 py-1 rounded text-cyan-300 font-bold border border-slate-700">
                      TIMECODE: {currentTime} / 00:15:21:00
                    </span>
                    <span className="bg-slate-900/80 px-2 py-1 rounded text-slate-300">Frame 542</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 px-2 py-0.5 rounded text-[10px] font-bold">
                      4K UHD
                    </span>
                    <span className="bg-[#7FA0D6]/150/20 text-blue-400 border border-blue-500/40 px-2 py-0.5 rounded text-[10px] font-bold">
                      60 FPS
                    </span>
                  </div>
                </div>

                {/* Center Canvas Mockup Visual */}
                <div className="my-auto flex flex-col items-center justify-center text-center space-y-3">
                  <div
                    onClick={() => {
                      setIsPlaying(!isPlaying);
                      showToast(isPlaying ? "Paused playback" : "Playing master render preview...", "info");
                    }}
                    className="size-16 rounded-2xl bg-[#161F2D]/10 hover:bg-[#161F2D]/20 backdrop-blur-md border border-white/20 flex items-center justify-center text-white cursor-pointer shadow-2xl transition-all hover:scale-105 active:scale-95"
                  >
                    {isPlaying ? <Pause className="size-7" /> : <Play className="size-7 translate-x-0.5" />}
                  </div>
                  <div className="text-white/80 text-xs font-mono font-medium">
                    {activeVersionTab === "verA"
                      ? "Northwind_Fintech_Reel_VerA_4K_ProRes4444.mov"
                      : activeVersionTab === "verB"
                      ? "Northwind_Fintech_Minimalist_VerB_4K_ProRes4444.mov"
                      : "Northwind_Fintech_BoardOff_VerC_4K_ProRes4444.mov"}
                  </div>
                </div>

                {/* Bottom Scrub Bar & Waveform */}
                <div className="space-y-2 bg-slate-900/90 backdrop-blur-md p-3 rounded-xl border border-slate-800">
                  <div className="flex items-center justify-between text-[11px] font-mono text-[#97A0B3]">
                    <span className="text-emerald-400 font-bold">-14.1 LUFS Peak Integrated</span>
                    <span>ProRes 4444 Master</span>
                  </div>
                  {/* Waveform graphic bar */}
                  <div className="w-full h-3 bg-slate-800 rounded-full overflow-hidden flex items-center px-1">
                    <div className="h-1.5 bg-gradient-to-r from-cyan-400 via-blue-500 to-indigo-500 rounded-full w-[60%]" />
                  </div>
                </div>
              </div>

              {/* Technical Metadata Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5 pt-1 text-center text-xs">
                <div className="p-2.5 rounded-xl bg-[#0B111C] border border-[#2A3446]">
                  <div className="text-[10px] text-[#97A0B3] font-bold uppercase">Framerate</div>
                  <div className="font-black text-white mt-0.5">60.00 fps</div>
                </div>
                <div className="p-2.5 rounded-xl bg-[#0B111C] border border-[#2A3446]">
                  <div className="text-[10px] text-[#97A0B3] font-bold uppercase">Resolution</div>
                  <div className="font-black text-white mt-0.5">2160 x 3840</div>
                </div>
                <div className="p-2.5 rounded-xl bg-[#0B111C] border border-[#2A3446]">
                  <div className="text-[10px] text-[#97A0B3] font-bold uppercase">Codec</div>
                  <div className="font-black text-white mt-0.5">ProRes 4444 HQ</div>
                </div>
                <div className="p-2.5 rounded-xl bg-[#0B111C] border border-[#2A3446]">
                  <div className="text-[10px] text-[#97A0B3] font-bold uppercase">Audio Bitrate</div>
                  <div className="font-black text-white mt-0.5">320k AAC</div>
                </div>
                <div className="p-2.5 rounded-xl bg-[#0B111C] border border-[#2A3446] col-span-2 sm:col-span-1">
                  <div className="text-[10px] text-[#97A0B3] font-bold uppercase">Color Space</div>
                  <div className="font-black text-white mt-0.5">Rec.709 Legal</div>
                </div>
              </div>
            </div>

            {/* Section B: Lead Review Status & Revision History Ledger */}
            <div className="bg-[#161F2D] rounded-3xl p-6 sm:p-7 border border-[#2A3446] shadow-[0_4px_20px_rgba(0,0,0,0.03)] space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#2A3446]">
                <div className="flex items-center gap-2">
                  <FileText className="size-4 text-[#7FA0D6]" />
                  <h3 className="text-base font-black text-white">
                    Lead Review Status & Revision History Ledger
                  </h3>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => showToast("Filtered revision history", "info")}
                    className="px-3 py-1.5 rounded-xl border border-[#2A3446] text-[#F1F5F9] text-xs font-bold hover:bg-[#0B111C] flex items-center gap-1 cursor-pointer"
                  >
                    <Filter className="size-3.5 text-[#97A0B3]" /> Filter
                  </button>
                  <button
                    onClick={handleExportManifestCSV}
                    className="px-3.5 py-1.5 rounded-xl bg-[#7FA0D6]/15 text-[#7FA0D6] hover:bg-[#7FA0D6]/20 text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                  >
                    <Download className="size-3.5" /> Download Handoff Manifest CSV
                  </button>
                </div>
              </div>

              {/* Mobile Card List (< sm) */}
              <div className="block sm:hidden space-y-3">
                <div className="p-3.5 rounded-2xl bg-[#0B111C]/90 border border-[#2A3446]/80 space-y-2.5">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <span className="text-[10px] font-bold text-[#7FA0D6] uppercase">Northwind Labs</span>
                      <h4 className="text-xs font-black text-white leading-snug">Fintech Hero Animation (Full 60s Cut)</h4>
                      <div className="text-[10px] text-[#97A0B3] font-mono">PK2-NL-004D · 4K ProRes Master</div>
                    </div>
                    <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 shrink-0">
                      ✓ Signed Off
                    </span>
                  </div>
                  <div className="flex items-center justify-between pt-2 border-t border-[#2A3446]/60 text-xs">
                    <span className="text-[11px] text-[#97A0B3] font-medium">Reviewer: Maya Lin</span>
                    <button
                      onClick={() =>
                        setSelectedAssetToView({
                          title: "Fintech Hero Animation (Full 60s Cut)",
                          client: "Northwind Labs",
                          status: "Signed Off by Maya Lin",
                          dispatch: "AWS S302",
                        })
                      }
                      className="px-2.5 py-1 rounded-lg border border-[#2A3446] bg-[#161F2D] hover:bg-[#1F2C3F] text-[#F1F5F9] font-bold text-[10px] cursor-pointer flex items-center gap-1"
                    >
                      <Eye className="size-3" /> View Asset
                    </button>
                  </div>
                </div>

                <div className="p-3.5 rounded-2xl bg-[#0B111C]/90 border border-amber-200/80 space-y-2.5">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <span className="text-[10px] font-bold text-purple-600 uppercase">Atlas Global Systems</span>
                      <h4 className="text-xs font-black text-white leading-snug">Atlas Holiday Teaser v1</h4>
                      <div className="text-[10px] text-amber-700 font-semibold mt-0.5">
                        Lead Note: "Adjust opening hook pacing by 0.5s"
                      </div>
                    </div>
                    <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-amber-50 text-amber-800 border border-amber-200 shrink-0">
                      ⚠ Revision
                    </span>
                  </div>
                  <div className="flex items-center justify-between pt-2 border-t border-[#2A3446]/60 text-xs">
                    <span className="text-[11px] text-[#97A0B3] font-mono">Held for v2</span>
                    <button
                      onClick={() => setResubmitModalOpen(true)}
                      className="px-3 py-1 rounded-xl bg-[#2563EB] hover:bg-blue-700 text-white font-bold text-[11px] shadow-xs cursor-pointer"
                    >
                      Resubmit v2
                    </button>
                  </div>
                </div>

                <div className="p-3.5 rounded-2xl bg-[#0B111C]/90 border border-[#2A3446]/80 space-y-2.5">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <span className="text-[10px] font-bold text-[#F1F5F9] uppercase">Zenith Autonomous</span>
                      <h4 className="text-xs font-black text-white leading-snug">Brand Audio Identity Stems</h4>
                      <div className="text-[10px] text-[#97A0B3] font-mono">48k 24bit / 16 stem lossless ZIP</div>
                    </div>
                    <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 shrink-0">
                      ✓ Approved
                    </span>
                  </div>
                  <div className="flex items-center justify-between pt-2 border-t border-[#2A3446]/60 text-xs">
                    <span className="text-[11px] text-[#97A0B3] font-mono">AWS S411</span>
                    <button
                      onClick={() => showToast("Downloading lossless stems ZIP...")}
                      className="px-2.5 py-1 rounded-lg border border-[#2A3446] bg-[#161F2D] hover:bg-[#1F2C3F] text-[#F1F5F9] font-bold text-[10px] cursor-pointer flex items-center gap-1"
                    >
                      <Download className="size-3" /> Download ZIP
                    </button>
                  </div>
                </div>
              </div>

              {/* Desktop Table (sm+) */}
              <div className="hidden sm:block overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-[#2A3446] text-[#97A0B3] font-bold uppercase tracking-wider text-[10px]">
                      <th className="py-2.5 px-3">Deliverable & Asset Key</th>
                      <th className="py-2.5 px-3">Client Pod</th>
                      <th className="py-2.5 px-3">Lead Reviewer</th>
                      <th className="py-2.5 px-3">Status & Sign-Off</th>
                      <th className="py-2.5 px-3">Client Dispatch</th>
                      <th className="py-2.5 px-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium text-[#F1F5F9]">
                    <tr className="hover:bg-[#0B111C]/60 transition-colors">
                      <td className="py-3 px-3">
                        <div className="font-bold text-white">Fintech Hero Animation (Full 60s Cut)</div>
                        <div className="text-[11px] text-[#97A0B3]">PK2-NL-004D · 4K ProRes Master</div>
                      </td>
                      <td className="py-3 px-3 font-semibold text-white">Northwind Labs</td>
                      <td className="py-3 px-3">
                        <div className="flex items-center gap-1.5">
                          <div className="size-5 rounded bg-blue-600 text-white font-black text-[9px] flex items-center justify-center">
                            ML
                          </div>
                          <span>Maya Lin</span>
                        </div>
                      </td>
                      <td className="py-3 px-3">
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                          ✓ Signed Off by Maya Lin
                        </span>
                      </td>
                      <td className="py-3 px-3 font-mono text-[11px] text-[#97A0B3]">Dispatched (AWS S302)</td>
                      <td className="py-3 px-3 text-right">
                        <button
                          onClick={() =>
                            setSelectedAssetToView({
                              title: "Fintech Hero Animation (Full 60s Cut)",
                              client: "Northwind Labs",
                              status: "Signed Off by Maya Lin",
                              dispatch: "AWS S302",
                            })
                          }
                          className="p-1.5 rounded-lg text-[#97A0B3] hover:text-[#F1F5F9] hover:bg-[#1F2C3F] cursor-pointer"
                        >
                          <Eye className="size-4" />
                        </button>
                      </td>
                    </tr>

                    <tr className="hover:bg-[#0B111C]/60 transition-colors">
                      <td className="py-3 px-3">
                        <div className="font-bold text-white">Atlas Holiday Teaser v1</div>
                        <div className="text-[11px] text-amber-700 font-semibold">
                          Lead Note: "Adjust opening hook pacing by 0.5s"
                        </div>
                      </td>
                      <td className="py-3 px-3 font-semibold text-white">Atlas Global Systems</td>
                      <td className="py-3 px-3">
                        <div className="flex items-center gap-1.5">
                          <div className="size-5 rounded bg-blue-600 text-white font-black text-[9px] flex items-center justify-center">
                            ML
                          </div>
                          <span>Maya Lin</span>
                        </div>
                      </td>
                      <td className="py-3 px-3">
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200">
                          ⚠ Revision Requested
                        </span>
                      </td>
                      <td className="py-3 px-3 font-mono text-[11px] text-[#97A0B3]">Held for v2</td>
                      <td className="py-3 px-3 text-right">
                        <button
                          onClick={() => setResubmitModalOpen(true)}
                          className="px-3 py-1 rounded-xl bg-[#2563EB] hover:bg-blue-700 text-white font-bold text-xs shadow-xs cursor-pointer"
                        >
                          Resubmit Revision v2
                        </button>
                      </td>
                    </tr>

                    <tr className="hover:bg-[#0B111C]/60 transition-colors">
                      <td className="py-3 px-3">
                        <div className="font-bold text-white">Brand Audio Identity Stems</div>
                        <div className="text-[11px] text-[#97A0B3]">48k 24bit / 16 stem lossless ZIP</div>
                      </td>
                      <td className="py-3 px-3 font-semibold text-white">Zenith Autonomous</td>
                      <td className="py-3 px-3">
                        <div className="flex items-center gap-1.5">
                          <div className="size-5 rounded bg-blue-600 text-white font-black text-[9px] flex items-center justify-center">
                            ML
                          </div>
                          <span>Maya Lin</span>
                        </div>
                      </td>
                      <td className="py-3 px-3">
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                          ✓ Approved & Archived
                        </span>
                      </td>
                      <td className="py-3 px-3 font-mono text-[11px] text-[#97A0B3]">Dispatched (APN S411)</td>
                      <td className="py-3 px-3 text-right">
                        <button
                          onClick={() => showToast("Downloading lossless stems ZIP...")}
                          className="p-1.5 rounded-lg text-[#97A0B3] hover:text-[#F1F5F9] hover:bg-[#1F2C3F] cursor-pointer"
                        >
                          <Download className="size-4" />
                        </button>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* RIGHT 1 COLUMN */}
          <div className="space-y-6">
            {/* Self-QA Verification Checklist */}
            <div className="bg-[#161F2D] rounded-3xl p-6 border border-[#2A3446] shadow-[0_4px_20px_rgba(0,0,0,0.03)] space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-[#2A3446]">
                <div className="flex items-center gap-2">
                  <Sparkles className="size-4 text-[#7FA0D6]" />
                  <h3 className="text-sm font-black text-white">Self-QA Verification</h3>
                </div>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-emerald-50 text-emerald-700 border border-emerald-200">
                  {Object.values(checklist).filter(Boolean).length}/4 Verified
                </span>
              </div>

              <p className="text-[11px] text-[#97A0B3]">
                Motion designer must complete all studio QA gate assertions before notifying Pod Lead.
              </p>

              {/* Checklist Items */}
              <div className="space-y-3">
                <div
                  onClick={() => handleToggleChecklist("safezone")}
                  className="p-3.5 rounded-2xl bg-[#7FA0D6]/15/50 border border-[#7FA0D6]/30/80 flex items-start gap-3 cursor-pointer hover:bg-[#7FA0D6]/15 transition-colors"
                >
                  <input
                    type="checkbox"
                    checked={checklist.safezone}
                    onChange={() => {}}
                    className="size-4 rounded text-[#7FA0D6] focus:ring-blue-500 mt-0.5 cursor-pointer"
                  />
                  <div>
                    <div className="text-xs font-black text-white">Safe-zone compliance for 9:16 Vertical</div>
                    <div className="text-[11px] text-[#97A0B3] mt-0.5">
                      All typography and call-to-actions clear Instagram Reels & TikTok UI overlays.
                    </div>
                  </div>
                </div>

                <div
                  onClick={() => handleToggleChecklist("audioLufs")}
                  className="p-3.5 rounded-2xl bg-[#7FA0D6]/15/50 border border-[#7FA0D6]/30/80 flex items-start gap-3 cursor-pointer hover:bg-[#7FA0D6]/15 transition-colors"
                >
                  <input
                    type="checkbox"
                    checked={checklist.audioLufs}
                    onChange={() => {}}
                    className="size-4 rounded text-[#7FA0D6] focus:ring-blue-500 mt-0.5 cursor-pointer"
                  />
                  <div>
                    <div className="text-xs font-black text-white">Audio normalized to -14 LUFS (no clipping)</div>
                    <div className="text-[11px] text-[#97A0B3] mt-0.5">
                      Integrated True-Peak muses at -1.0 dBFS with stereo limiter configured.
                    </div>
                  </div>
                </div>

                <div
                  onClick={() => handleToggleChecklist("brandVectors")}
                  className="p-3.5 rounded-2xl bg-[#7FA0D6]/15/50 border border-[#7FA0D6]/30/80 flex items-start gap-3 cursor-pointer hover:bg-[#7FA0D6]/15 transition-colors"
                >
                  <input
                    type="checkbox"
                    checked={checklist.brandVectors}
                    onChange={() => {}}
                    className="size-4 rounded text-[#7FA0D6] focus:ring-blue-500 mt-0.5 cursor-pointer"
                  />
                  <div>
                    <div className="text-xs font-black text-white">Brand vectors validated (Northwind v4.2)</div>
                    <div className="text-[11px] text-[#97A0B3] mt-0.5">
                      Verified WCG04 All-Net party on dark-mode kinetic typography blocks.
                    </div>
                  </div>
                </div>

                <div
                  onClick={() => handleToggleChecklist("subtitles")}
                  className="p-3.5 rounded-2xl bg-[#7FA0D6]/15/50 border border-[#7FA0D6]/30/80 flex items-start gap-3 cursor-pointer hover:bg-[#7FA0D6]/15 transition-colors"
                >
                  <input
                    type="checkbox"
                    checked={checklist.subtitles}
                    onChange={() => {}}
                    className="size-4 rounded text-[#7FA0D6] focus:ring-blue-500 mt-0.5 cursor-pointer"
                  />
                  <div>
                    <div className="text-xs font-black text-white">Subtitles burned & rhythm cuts aligned</div>
                    <div className="text-[11px] text-[#97A0B3] mt-0.5">
                      Pacing checked at 132 BPM downbeats with accurate closed captioning.
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Lead Review & Sign-Off Box */}
            <div className="bg-[#161F2D] rounded-3xl p-6 border border-[#2A3446] shadow-[0_4px_20px_rgba(0,0,0,0.03)] space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-[#2A3446]">
                <h3 className="text-sm font-black text-white">Lead Review & Sign-off</h3>
              </div>

              {/* Reviewer Lead Pill */}
              <div className="p-3 rounded-2xl bg-[#0B111C] border border-[#2A3446] flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="size-8 rounded-xl bg-blue-600 text-white font-black text-xs flex items-center justify-center">
                    ML
                  </div>
                  <div>
                    <div className="text-xs font-black text-white">Maya Lin</div>
                    <div className="text-[10px] text-[#97A0B3]">Lead Art Director • Pod A Operations</div>
                  </div>
                </div>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#7FA0D6]/20 text-[#7FA0D6]">
                  Reviewer
                </span>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#F1F5F9] mb-1">
                  Handoff Note to Lead <span className="text-[#97A0B3] font-normal">(Markdown supported)</span>
                </label>
                <textarea
                  rows={4}
                  value={handoffNote}
                  onChange={(e) => setHandoffNote(e.target.value)}
                  className="w-full p-3 rounded-xl border border-[#2A3446] text-xs font-medium focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                />
              </div>

              <div className="text-[11px] text-[#97A0B3] flex items-center gap-1.5 font-semibold">
                <span>📎 Attached: 3 Master MP4s, 1 Master ProRes, 1 Project AEP (968 MB)</span>
              </div>

              <div className="flex items-center gap-2 pt-1 border-t border-[#2A3446]">
                <button
                  type="button"
                  onClick={() => showToast("Saved draft handoff note")}
                  className="px-4 py-2.5 rounded-xl border border-[#2A3446] text-[#F1F5F9] text-xs font-bold hover:bg-[#0B111C] cursor-pointer"
                >
                  Save Draft
                </button>
                <button
                  type="button"
                  onClick={() => setHandoffConfirmModalOpen(true)}
                  className="flex-1 py-2.5 rounded-xl bg-[#2563EB] hover:bg-blue-700 text-white text-xs font-bold shadow-md shadow-blue-500/20 cursor-pointer text-center flex items-center justify-center gap-1.5"
                >
                  <Send className="size-3.5" />
                  Send to Maya Lin for Sign-Off
                </button>
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

      {/* MODAL: SEND TO MAYA LIN CONFIRMATION */}
      {handoffConfirmModalOpen && (
        <div
          className="fixed inset-0 w-screen h-screen z-[99999] bg-slate-950/70 backdrop-blur-md flex items-center justify-center p-4 animate-fade-in"
          onClick={() => setHandoffConfirmModalOpen(false)}
        >
          <div
            className="w-full max-w-md bg-[#161F2D] rounded-3xl p-6 sm:p-7 shadow-2xl border border-[#2A3446] space-y-4 animate-scale-up text-center"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="size-12 rounded-2xl bg-[#7FA0D6]/15 text-[#7FA0D6] flex items-center justify-center mx-auto font-black">
              <Send className="size-6" />
            </div>
            <div>
              <h3 className="text-base font-black text-white">Dispatch Package to Maya Lin?</h3>
              <p className="text-xs text-[#97A0B3] mt-1 leading-relaxed">
                Maya Lin will receive an immediate high-priority review alert on her Pod Lead dashboard with attached 4K ProRes files.
              </p>
            </div>

            <div className="flex items-center justify-center gap-2 pt-2 border-t border-[#2A3446]">
              <button
                type="button"
                onClick={() => setHandoffConfirmModalOpen(false)}
                className="px-4 py-2 rounded-xl border border-[#2A3446] font-bold text-xs text-[#F1F5F9] hover:bg-[#0B111C] cursor-pointer"
              >
                Review Again
              </button>
              <button
                type="button"
                onClick={handleSendToLeadForSignOff}
                className="px-5 py-2 rounded-xl bg-[#2563EB] hover:bg-blue-700 text-white font-bold text-xs shadow-md shadow-blue-500/20 cursor-pointer"
              >
                Confirm & Dispatch
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: RESUBMIT REVISION */}
      {resubmitModalOpen && (
        <div
          className="fixed inset-0 w-screen h-screen z-[99999] bg-slate-950/70 backdrop-blur-md flex items-center justify-center p-4 animate-fade-in"
          onClick={() => setResubmitModalOpen(false)}
        >
          <div
            className="w-full max-w-lg bg-[#161F2D] rounded-3xl p-6 sm:p-7 shadow-2xl border border-[#2A3446] space-y-4 animate-scale-up"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-[#2A3446] pb-3">
              <div>
                <h3 className="text-base font-black text-white">Resubmit Revision v2</h3>
                <p className="text-xs text-[#97A0B3]">Atlas Holiday Teaser v1 (Atlas Global Systems)</p>
              </div>
              <button
                type="button"
                onClick={() => setResubmitModalOpen(false)}
                className="size-8 rounded-full bg-[#1F2C3F] hover:bg-slate-200 text-[#97A0B3] flex items-center justify-center cursor-pointer"
              >
                <X className="size-4" />
              </button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                setResubmitModalOpen(false);
                showToast("Revision v2 resubmitted to Maya Lin!");
              }}
              className="space-y-3.5 text-xs"
            >
              <div>
                <label className="block font-bold text-[#F1F5F9] mb-1">Changelog & Revision Fix Notes</label>
                <textarea
                  rows={3}
                  defaultValue="Adjusted opening hook pacing by exactly 0.5s as requested by Maya. Render pass 4 re-exported."
                  className="w-full px-3 py-2 rounded-xl border border-[#2A3446] font-medium"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#2A3446]">
                <button
                  type="button"
                  onClick={() => setResubmitModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-[#2A3446] font-bold text-[#F1F5F9] hover:bg-[#0B111C] cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-[#2563EB] hover:bg-blue-700 text-white font-bold shadow-xs cursor-pointer"
                >
                  Submit Revision v2
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: AUDIT LOGS */}
      {auditLogModalOpen && (
        <div
          className="fixed inset-0 w-screen h-screen z-[99999] bg-slate-950/70 backdrop-blur-md flex items-center justify-center p-4 animate-fade-in"
          onClick={() => setAuditLogModalOpen(false)}
        >
          <div
            className="w-full max-w-lg bg-[#161F2D] rounded-3xl p-6 sm:p-7 shadow-2xl border border-[#2A3446] space-y-4 animate-scale-up"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-[#2A3446] pb-3">
              <h3 className="text-base font-black text-white">QA Gate Audit Logs</h3>
              <button
                type="button"
                onClick={() => setAuditLogModalOpen(false)}
                className="size-8 rounded-full bg-[#1F2C3F] hover:bg-slate-200 text-[#97A0B3] flex items-center justify-center cursor-pointer"
              >
                <X className="size-4" />
              </button>
            </div>

            <div className="space-y-2.5 text-xs max-h-72 overflow-y-auto pr-1">
              <div className="p-3 bg-[#0B111C] rounded-xl border border-[#2A3446] flex justify-between">
                <div>
                  <div className="font-bold text-white">Full 60s Cut Dispatched to AWS S302</div>
                  <div className="text-[11px] text-[#97A0B3]">Signed off by Maya Lin • 09:42 AM</div>
                </div>
                <span className="text-emerald-600 font-bold">✓ Success</span>
              </div>
              <div className="p-3 bg-[#0B111C] rounded-xl border border-[#2A3446] flex justify-between">
                <div>
                  <div className="font-bold text-white">Color Gamut Verification Passed</div>
                  <div className="text-[11px] text-[#97A0B3]">Automated Sentinel Bot • 08:30 AM</div>
                </div>
                <span className="text-[#7FA0D6] font-bold">Passed</span>
              </div>
            </div>

            <div className="flex items-center justify-end pt-2 border-t border-[#2A3446]">
              <button
                type="button"
                onClick={() => setAuditLogModalOpen(false)}
                className="px-5 py-2 rounded-xl bg-[#2563EB] hover:bg-blue-700 text-white font-bold cursor-pointer"
              >
                Close Audit Logs
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: NEW ASSET HANDOFF PACKAGE */}
      {packageModalOpen && (
        <div
          className="fixed inset-0 w-screen h-screen z-[99999] bg-slate-950/70 backdrop-blur-md flex items-center justify-center p-4 animate-fade-in"
          onClick={() => setPackageModalOpen(false)}
        >
          <div
            className="w-full max-w-lg bg-[#161F2D] rounded-3xl p-6 sm:p-7 shadow-2xl border border-[#2A3446] space-y-4 animate-scale-up"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-[#2A3446] pb-3">
              <h3 className="text-base font-black text-white">Create New Asset Handoff Package</h3>
              <button
                type="button"
                onClick={() => setPackageModalOpen(false)}
                className="size-8 rounded-full bg-[#1F2C3F] hover:bg-slate-200 text-[#97A0B3] flex items-center justify-center cursor-pointer"
              >
                <X className="size-4" />
              </button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                setPackageModalOpen(false);
                showToast("Created new Asset Handoff Package! Ready for QA verification.");
              }}
              className="space-y-3 text-xs"
            >
              <div>
                <label className="block font-bold text-[#F1F5F9] mb-1">Package Name</label>
                <input
                  type="text"
                  required
                  defaultValue="Northwind Fintech Ad Set 9:16 (Package 04)"
                  className="w-full px-3 py-2 rounded-xl border border-[#2A3446] font-bold"
                />
              </div>

              <div>
                <label className="block font-bold text-[#F1F5F9] mb-1">Client Pod</label>
                <select className="w-full px-3 py-2 rounded-xl border border-[#2A3446] font-semibold bg-[#161F2D]">
                  <option value="Northwind Labs">Northwind Labs</option>
                  <option value="Atlas Commerce">Atlas Commerce</option>
                  <option value="Bloom Studio">Bloom Studio</option>
                </select>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#2A3446]">
                <button
                  type="button"
                  onClick={() => setPackageModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-[#2A3446] font-bold text-[#F1F5F9] hover:bg-[#0B111C] cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-[#2563EB] hover:bg-blue-700 text-white font-bold shadow-xs cursor-pointer"
                >
                  Initialize Package
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: VIEW ASSET DETAILS */}
      {selectedAssetToView && (
        <div
          className="fixed inset-0 w-screen h-screen z-[99999] bg-slate-950/70 backdrop-blur-md flex items-center justify-center p-4 animate-fade-in"
          onClick={() => setSelectedAssetToView(null)}
        >
          <div
            className="w-full max-w-md bg-[#161F2D] rounded-3xl p-6 sm:p-7 shadow-2xl border border-[#2A3446] space-y-4 animate-scale-up"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-[#2A3446] pb-3">
              <h3 className="text-base font-black text-white">{selectedAssetToView.title}</h3>
              <button
                type="button"
                onClick={() => setSelectedAssetToView(null)}
                className="size-8 rounded-full bg-[#1F2C3F] hover:bg-slate-200 text-[#97A0B3] flex items-center justify-center cursor-pointer"
              >
                <X className="size-4" />
              </button>
            </div>

            <div className="space-y-2 text-xs">
              <div className="flex justify-between p-2.5 bg-[#0B111C] rounded-xl">
                <span className="font-bold text-[#97A0B3]">Client:</span>
                <span className="font-bold text-white">{selectedAssetToView.client}</span>
              </div>
              <div className="flex justify-between p-2.5 bg-[#0B111C] rounded-xl">
                <span className="font-bold text-[#97A0B3]">Status:</span>
                <span className="font-bold text-emerald-600">{selectedAssetToView.status}</span>
              </div>
              <div className="flex justify-between p-2.5 bg-[#0B111C] rounded-xl">
                <span className="font-bold text-[#97A0B3]">Vault Dispatch:</span>
                <span className="font-mono text-white">{selectedAssetToView.dispatch}</span>
              </div>
            </div>

            <div className="flex items-center justify-end pt-2 border-t border-[#2A3446]">
              <button
                type="button"
                onClick={() => setSelectedAssetToView(null)}
                className="px-5 py-2 rounded-xl bg-[#2563EB] hover:bg-blue-700 text-white font-bold cursor-pointer"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
