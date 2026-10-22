import React, { useState } from "react";
import { Link } from "react-router";
import {
  Bell,
  Clock,
  Zap,
  Calendar,
  ArrowRight,
  ArrowUpRight,
  Plus,
  Hash,
  Sparkles,
  FileText,
  Users,
  CheckCircle2,
  Video,
  Send,
  Eye,
  Menu,
} from "lucide-react";
import type { PodTask } from "../../lib/ops-api";
import { useAdminSidebar } from "../admin/AdminSidebarContext";

export interface LeadNoteItem {
  id: string;
  taskId?: string;
  author: string;
  role: string;
  badge: string;
  badgeColor?: string;
  content: string;
  avatarBg: string;
  avatar: string;
  attachment?: string;
  tag?: string;
}

interface MemberMobileDashboardProps {
  podName: string;
  leadName: string;
  user: any;
  userInitials: string;
  metricActiveTasks: PodTask[];
  displayInProdTasks: PodTask[];
  displayQaTasks: PodTask[];
  dueTodayCount: number;
  deliverablesScope: "my" | "all";
  setDeliverablesScope: (scope: "my" | "all") => void;
  deliverablesTab: "active" | "archived";
  setDeliverablesTab: (tab: "active" | "archived") => void;
  displayActiveTasks: PodTask[];
  displayCompletedTasks: PodTask[];
  currentTasks: PodTask[];
  allEligibleTasks: PodTask[];
  allNotes: LeadNoteItem[];
  members: any[];
  quickReplyText: string;
  setQuickReplyText: (text: string) => void;
  isSendingQuickReply?: boolean;
  handleSendQuickReply: (e: React.FormEvent) => void;
  setLogHoursModalOpen: (open: boolean) => void;
  setZoomModalOpen: (open: boolean) => void;
  setSelectedTaskId: (id: string) => void;
  setUploadModalOpen: (open: boolean) => void;
  openPreviewModal: (task: PodTask) => void;
  showToast: (text: string, type?: "success" | "info") => void;
}

export function MemberMobileDashboard({
  podName,
  leadName: _leadName,
  user,
  userInitials,
  metricActiveTasks,
  displayInProdTasks,
  displayQaTasks,
  dueTodayCount,
  deliverablesScope,
  setDeliverablesScope,
  deliverablesTab,
  setDeliverablesTab,
  displayActiveTasks,
  displayCompletedTasks,
  currentTasks,
  allEligibleTasks,
  allNotes,
  members,
  quickReplyText,
  setQuickReplyText,
  isSendingQuickReply = false,
  handleSendQuickReply,
  setLogHoursModalOpen: _setLogHoursModalOpen,
  setZoomModalOpen,
  setSelectedTaskId,
  setUploadModalOpen,
  openPreviewModal,
  showToast,
}: MemberMobileDashboardProps) {
  const [mobileSecondaryTab, setMobileSecondaryTab] = useState<"feedback" | "team">("feedback");
  const { toggleMobile } = useAdminSidebar();

  return (
    <div className="md:hidden pb-12 space-y-3 max-w-[430px] mx-auto text-slate-100">
      {/* Sticky Top Header */}
      <header className="sticky top-0 z-40 w-[calc(100%+1.75rem)] -mx-3.5 bg-app-base/90 backdrop-blur-xl border-b border-white/[0.06] px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={toggleMobile}
            className="w-8 h-8 rounded-xl flex items-center justify-center text-slate-300 hover:text-hi bg-app-nested border border-hi/10 hover:border-white/20 transition-colors cursor-pointer shrink-0"
            aria-label="Open navigation sidebar"
            title="Open navigation menu"
          >
            <Menu className="w-4.5 h-4.5" />
          </button>
          <div className="flex items-center tracking-tight font-bold text-lg text-hi">
            Creo<span className="text-sky-400">.</span>
          </div>
          <span className="text-[9px] font-bold tracking-widest uppercase px-2 py-0.5 rounded-full bg-sky-400/15 text-sky-400 border border-sky-400/30">
            MEMBER
          </span>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={() => showToast("All pod notifications are up to date", "info")}
            className="relative w-8 h-8 rounded-full flex items-center justify-center bg-app-nested border border-hi/10 text-slate-300 hover:text-hi hover:bg-app-surface transition-colors cursor-pointer"
            aria-label="Notifications"
          >
            <Bell className="w-4 h-4" />
            <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full bg-sky-400 shadow-[0_0_6px_#38BDF8] text-app-on-accent!"></span>
          </button>

          <Link
            to="/workstation/settings"
            className="flex items-center gap-1.5 pl-1"
            aria-label="Profile Settings"
            title={user?.full_name || "Profile Settings"}
          >
            <div className="relative">
              <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-sky-400 to-indigo-600 flex items-center justify-center text-xs font-bold text-app-on-accent! shadow-md">
                {userInitials}
              </div>
              <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-emerald-500 border-2 border-app-base text-app-on-accent!"></span>
            </div>
          </Link>
        </div>
      </header>

      {/* 2. High-Density Quick-Metrics Grid (2x2 Compact) */}
      <div className="grid grid-cols-2 gap-2.5">
        {/* Card A: Active Sprint Tasks */}
        <div className="bg-app-nested/85 border border-hi/[0.08] backdrop-blur-md shadow-[inset_0_1px_0_0_color-mix(in_oklab,var(--hi)_5%,transparent)] rounded-2xl p-3.5 flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-bold tracking-wider uppercase text-slate-400">ACTIVE TASKS</span>
            <Zap className="text-sky-400 w-4 h-4" />
          </div>
          <div>
            <div className="flex items-baseline gap-1.5">
              <span className="text-2xl font-bold text-hi tracking-tight">{metricActiveTasks.length}</span>
              <span className="text-xs text-slate-400 font-normal">in queue</span>
            </div>
            <p className="text-[11px] text-slate-400 truncate mt-0.5">
              {displayInProdTasks.length} in progress • {displayQaTasks.length} in QA
            </p>
          </div>
          <Link
            to="/workstation/tasks"
            className="pt-2.5 mt-2 border-t border-white/[0.06] flex items-center justify-between text-xs font-medium text-sky-400 hover:text-sky-300"
          >
            <span>Due Today: {dueTodayCount}</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {/* Card B: Weekly Hours */}
        <div className="bg-app-nested/85 border border-hi/[0.08] backdrop-blur-md shadow-[inset_0_1px_0_0_color-mix(in_oklab,var(--hi)_5%,transparent)] rounded-2xl p-3.5 flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-bold tracking-wider uppercase text-slate-400">WEEKLY HOURS</span>
            <Clock className="text-sky-400 w-4 h-4" />
          </div>
          <div>
            <div className="flex items-baseline gap-1">
              <span className="text-2xl font-bold text-hi tracking-tight">32.5</span>
              <span className="text-xs text-slate-400 font-normal">/ 40h</span>
            </div>
            {/* Thin Linear Progress Bar */}
            <div className="w-full bg-slate-800/80 rounded-full h-1.5 my-1.5 overflow-hidden border border-white/5">
              <div
                className="bg-gradient-to-r from-sky-400 to-blue-500 h-full rounded-full transition-all duration-700 text-app-on-accent!"
                style={{ width: "81%" }}
              />
            </div>
          </div>
          <div className="flex items-center justify-between text-[11px] text-slate-400 font-medium">
            <span className="text-sky-400 font-semibold">81% target</span>
            <span>7.5h left</span>
          </div>
        </div>

        {/* Card C: Remaining PTO (Full width row) */}
        <div className="col-span-2 bg-app-nested/85 border border-hi/[0.08] backdrop-blur-md shadow-[inset_0_1px_0_0_color-mix(in_oklab,var(--hi)_5%,transparent)] rounded-2xl p-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-app-surface border border-hi/10 flex items-center justify-center text-slate-300">
              <Calendar className="w-4 h-4 text-sky-400" />
            </div>
            <div>
              <div className="text-[10px] font-bold tracking-wider uppercase text-slate-400">REMAINING PTO</div>
              <div className="flex items-baseline gap-2">
                <span className="text-base font-bold text-hi tracking-tight">14.5 Days</span>
                <span className="text-[11px] text-slate-400">+1.5d/mo</span>
              </div>
            </div>
          </div>
          <div className="text-right">
            <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">Next Scheduled</span>
            <Link
              to="/workstation/schedule"
              className="inline-flex items-center gap-1 text-xs font-semibold text-sky-400 bg-sky-400/10 border border-sky-400/20 px-2.5 py-1 rounded-lg mt-0.5 hover:bg-sky-400/20 transition-colors"
            >
              <span>Nov 8 (0.5d)</span>
              <ArrowUpRight className="w-3 h-3" />
            </Link>
          </div>
        </div>
      </div>

      {/* 3. Quick Action Hub (Horizontal Reel) */}
      <div className="flex items-center gap-2 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden py-0.5 -mx-3.5 px-3.5">
        <Link
          to="/workstation/tasks"
          className="shrink-0 flex items-center gap-1.5 bg-sky-400 text-slate-950 font-semibold text-xs px-3.5 py-2 rounded-xl shadow-[0_2px_10px_color-mix(in_oklab,var(--app-accent)_25%,transparent)] hover:bg-sky-300 active:scale-95 transition-all"
        >
          <Plus className="w-4 h-4" />
          <span>Browse Tasks</span>
        </Link>

        <button
          type="button"
          onClick={() => setZoomModalOpen(true)}
          className="shrink-0 flex items-center gap-1.5 bg-app-nested/90 border border-sky-400/30 text-sky-400 text-xs font-medium px-3.5 py-2 rounded-xl hover:bg-app-surface transition-all cursor-pointer"
        >
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-sky-400 opacity-75 text-app-on-accent!"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-sky-400 text-app-on-accent!"></span>
          </span>
          <span>Standup: In 25m</span>
        </button>

        <Link
          to="/slack"
          className="shrink-0 flex items-center gap-1.5 bg-app-nested/80 border border-hi/10 text-slate-300 text-xs font-medium px-3.5 py-2 rounded-xl hover:bg-app-surface hover:text-hi transition-all"
        >
          <Hash className="w-4 h-4 text-[#E01E5A]" />
          <span>Slack Hub</span>
        </Link>

        <Link
          to="/workstation/schedule"
          className="shrink-0 flex items-center gap-1.5 bg-app-nested/80 border border-hi/10 text-slate-300 text-xs font-medium px-3.5 py-2 rounded-xl hover:bg-app-surface hover:text-hi transition-all"
        >
          <Calendar className="w-4 h-4 text-sky-400" />
          <span>Schedule</span>
        </Link>
      </div>

      {/* 4. Assigned Sprint Deliverables (Primary Work Hub) */}
      <div className="bg-app-nested/85 border border-hi/[0.08] backdrop-blur-md shadow-[inset_0_1px_0_0_color-mix(in_oklab,var(--hi)_5%,transparent)] rounded-2xl p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-sm font-bold text-hi tracking-tight">Assigned Deliverables</h2>
            <p className="text-[11px] text-slate-400">{podName} deliverables pipeline</p>
          </div>
          <div className="flex bg-app-void/80 p-0.5 rounded-xl border border-hi/10 text-[11px]">
            <button
              type="button"
              onClick={() => setDeliverablesScope("my")}
              className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                deliverablesScope === "my"
                  ? "bg-app-surface text-hi font-medium shadow-sm"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              My Tasks
            </button>
            <button
              type="button"
              onClick={() => setDeliverablesScope("all")}
              className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                deliverablesScope === "all"
                  ? "bg-app-surface text-hi font-medium shadow-sm"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              Pod ({allEligibleTasks.length})
            </button>
          </div>
        </div>

        {/* Segmented Status Bar */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setDeliverablesTab("active")}
            className={`text-xs px-2.5 py-0.5 rounded-lg transition-all cursor-pointer ${
              deliverablesTab === "active"
                ? "font-semibold bg-hi/10 text-hi border border-hi/15"
                : "font-medium text-slate-400 hover:text-slate-300"
            }`}
          >
            Active ({displayActiveTasks.length})
          </button>
          <button
            type="button"
            onClick={() => setDeliverablesTab("archived")}
            className={`text-xs px-2.5 py-0.5 rounded-lg transition-all cursor-pointer ${
              deliverablesTab === "archived"
                ? "font-semibold bg-hi/10 text-hi border border-hi/15"
                : "font-medium text-slate-400 hover:text-slate-300"
            }`}
          >
            Archived ({displayCompletedTasks.length})
          </button>
        </div>

        {/* Deliverables List or Empty State */}
        {currentTasks.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-700/80 bg-app-void/40 p-6 flex flex-col items-center text-center">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-b from-app-surface to-app-nested border border-hi/10 flex items-center justify-center text-sky-400 shadow-inner mb-3">
              <Sparkles className="w-6 h-6" />
            </div>
            <h3 className="text-sm font-bold text-hi mb-1">No active deliverables in production</h3>
            <p className="text-xs text-slate-400 max-w-[270px] leading-relaxed mb-4">
              You currently have no tasks in production or QA. Pull an assigned ticket or review upcoming deliverables.
            </p>
            <Link
              to="/workstation/tasks"
              className="inline-flex items-center gap-2 bg-gradient-to-r from-sky-400 to-blue-500 text-slate-950 font-bold text-xs px-4 py-2.5 rounded-xl shadow-lg shadow-sky-500/20 hover:brightness-110 active:scale-95 transition-all"
            >
              <span>Pull From Backlog</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        ) : (
          <div className="space-y-2.5">
            {currentTasks.slice(0, 5).map((task) => (
              <div
                key={task.id}
                className="p-3 rounded-xl bg-app-void/60 border border-hi/10 space-y-2 hover:border-sky-400/30 transition-colors"
              >
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold text-sky-400 uppercase tracking-wider">
                    {task.client_name || "Client"}
                  </span>
                  <span className="text-[9px] px-2 py-0.5 rounded-full font-bold bg-app-surface text-slate-300 border border-hi/10">
                    {task.deliverable_type?.replace(/_/g, " ") || "Concept"}
                  </span>
                </div>
                <div className="text-xs font-bold text-hi line-clamp-1">
                  {task.blueprint?.concept_name || task.blueprint?.title || "Production Deliverable"}
                </div>
                <div className="flex items-center justify-between pt-1 border-t border-white/5 text-[11px] text-slate-400">
                  <span>{task.due_date ? `Due ${new Date(task.due_date).toLocaleDateString(undefined, { day: "numeric", month: "short" })}` : "Queued"}</span>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedTaskId(task.id);
                        setUploadModalOpen(true);
                      }}
                      className="px-2 py-1 rounded-lg bg-sky-500/15 text-sky-400 hover:bg-sky-500/25 font-bold text-[10px] border border-sky-400/30 cursor-pointer"
                    >
                      Upload
                    </button>
                    <button
                      type="button"
                      onClick={() => openPreviewModal(task)}
                      className="p-1 rounded-lg bg-white/5 text-slate-300 hover:text-hi cursor-pointer"
                      title="Preview deliverable"
                      aria-label="Preview deliverable"
                    >
                      <Eye className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
            {currentTasks.length > 5 && (
              <Link
                to="/workstation/tasks"
                className="block text-center text-xs font-bold text-sky-400 hover:underline pt-1"
              >
                View all {currentTasks.length} tasks in board &rarr;
              </Link>
            )}
          </div>
        )}
      </div>

      {/* 5. Tabbed Secondary Section (Lead Feedback & Team Sync) */}
      <div className="bg-app-nested/85 border border-hi/[0.08] backdrop-blur-md shadow-[inset_0_1px_0_0_color-mix(in_oklab,var(--hi)_5%,transparent)] rounded-2xl p-4 space-y-3.5">
        {/* Segmented Tab Header */}
        <div className="flex bg-app-void/90 p-1 rounded-xl border border-hi/10">
          <button
            type="button"
            onClick={() => setMobileSecondaryTab("feedback")}
            className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
              mobileSecondaryTab === "feedback"
                ? "bg-app-surface text-hi border border-hi/10 shadow-sm"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            <FileText className="w-3.5 h-3.5 text-sky-400" />
            <span>Lead Feedback</span>
            <span className="text-[10px] bg-hi/10 px-1.5 rounded-full text-slate-300">{allNotes.length}</span>
          </button>

          <button
            type="button"
            onClick={() => setMobileSecondaryTab("team")}
            className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 text-xs font-medium rounded-lg transition-all cursor-pointer ${
              mobileSecondaryTab === "team"
                ? "bg-app-surface text-hi border border-hi/10 shadow-sm"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>Pod Team Sync</span>
            <span className="w-2 h-2 rounded-full bg-emerald-400 inline-block text-app-on-accent!"></span>
          </button>
        </div>

        {/* Tab Content 1: Feedback */}
        {mobileSecondaryTab === "feedback" ? (
          <div className="space-y-3">
            <div className="flex items-center justify-between text-xs text-slate-400 px-0.5">
              <span>Revision Requests</span>
              <span className="flex items-center gap-1 text-[11px] text-emerald-400">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 text-app-on-accent!"></span> Up to date
              </span>
            </div>

            {allNotes.length === 0 ? (
              <div className="bg-app-void/50 rounded-xl border border-white/[0.06] p-4 text-center">
                <div className="w-8 h-8 rounded-full bg-app-surface mx-auto flex items-center justify-center text-slate-300 mb-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                </div>
                <div className="text-xs font-semibold text-hi">No feedback or revision requests</div>
                <p className="text-[11px] text-slate-400 mt-0.5">Your pod lead has marked current deliverables as complete.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {allNotes.slice(0, 3).map((note) => (
                  <div key={note.id} className="p-3 bg-app-void/60 rounded-xl border border-hi/10 space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold text-sky-400">{note.author}</span>
                      <span className="text-[9px] px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-300 border border-amber-500/20">{note.badge}</span>
                    </div>
                    <p className="text-xs text-hi leading-relaxed">{note.content}</p>
                  </div>
                ))}
              </div>
            )}

            {/* Slack Quick-Reply Bar */}
            <form onSubmit={handleSendQuickReply} className="pt-1">
              <div className="flex items-center justify-between text-[11px] text-slate-400 mb-1.5 px-0.5">
                <span>Direct channel to <strong className="text-slate-200">Pod Beta Team</strong></span>
                <span className="text-[10px] text-sky-400 font-semibold uppercase tracking-wider">Instant Sync</span>
              </div>
              <div className="relative flex items-center">
                <input 
                  type="text" 
                  value={quickReplyText}
                  onChange={(e) => setQuickReplyText(e.target.value)}
                  placeholder="Reply to Pod Beta Team via Slack..."
                  disabled={isSendingQuickReply}
                  className="w-full bg-app-void/80 border border-hi/15 focus:border-sky-400 focus:outline-none rounded-xl py-2.5 pl-3 pr-20 text-xs text-hi placeholder-slate-500 shadow-inner disabled:opacity-60"
                />
                <button
                  type="submit"
                  disabled={!quickReplyText.trim() || isSendingQuickReply}
                  className="absolute right-1.5 bg-[#4A154B] hover:bg-[#611f69] disabled:opacity-50 text-hi text-xs font-bold px-2.5 py-1.5 rounded-lg flex items-center gap-1 border border-hi/20 transition-all cursor-pointer"
                >
                  {isSendingQuickReply ? (
                    <span>Sending...</span>
                  ) : (
                    <>
                      <span>Slack</span>
                      <Send className="w-3 h-3" />
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        ) : (
          /* Tab Content 2: Team Sync */
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-xs font-bold text-slate-200">
                <Video className="w-4 h-4 text-sky-400" />
                <span>Next Pod Sync: 10:00 AM Standup</span>
              </div>
              <button
                type="button"
                onClick={() => setZoomModalOpen(true)}
                className="bg-blue-600 hover:bg-blue-500 active:scale-95 text-app-on-accent! text-[11px] font-bold px-2.5 py-1 rounded-lg transition-all shadow-sm cursor-pointer"
              >
                Join Call
              </button>
            </div>

            <div className="flex items-center justify-between bg-app-void/60 rounded-xl p-2.5 border border-white/5">
              <div className="flex items-center -space-x-1.5 overflow-hidden">
                {members.slice(0, 4).map((m: any, idx: number) => (
                  <div
                    key={m.id || idx}
                    className="w-6 h-6 rounded-full bg-indigo-500 text-app-on-accent! text-[9px] font-bold flex items-center justify-center border border-app-base"
                    title={m.full_name}
                  >
                    {m.full_name?.slice(0, 2).toUpperCase() || "CP"}
                  </div>
                ))}
                {members.length > 4 && (
                  <div className="w-6 h-6 rounded-full bg-app-line-soft text-slate-300 text-[9px] font-medium flex items-center justify-center border border-app-base">
                    +{members.length - 4}
                  </div>
                )}
              </div>
              <div className="text-[11px] text-slate-400">
                <span className="text-emerald-400 font-semibold">{members.length || 1} pod members</span> active now
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
