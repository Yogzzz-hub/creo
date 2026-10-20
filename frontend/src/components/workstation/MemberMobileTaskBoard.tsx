import { Link } from "react-router";
import {
  Search,
  Plus,
  ChevronDown,
  Upload,
  Check,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Menu,
} from "lucide-react";
import type { UseMutationResult } from "@tanstack/react-query";
import type { PodTask } from "../../lib/ops-api";
import { useAdminSidebar } from "../admin/AdminSidebarContext";
import { NotificationMenu } from "../ui/NotificationMenu";
import { DeliverableMedia } from "../ops/DeliverableMedia";
import { PublishingControl } from "../ops/PublishingPanel";
import { VoicePlayer } from "../portal/VoicePlayer";

type Column = "assigned" | "production" | "qa" | "review";

interface MemberMobileTaskBoardProps {
  user: any;
  userInitials: string;
  leadName: string;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  selectedClient: string;
  setSelectedClient: (client: string) => void;
  urgencyFilter: string;
  setUrgencyFilter: (filter: string) => void;
  mobileKanbanTab: Column;
  setMobileKanbanTab: (tab: Column) => void;
  tasks: { task: PodTask; column: Column }[];
  availableClients: { id: string; name: string }[];
  assigned: PodTask[];
  production: PodTask[];
  qa: PodTask[];
  review: PodTask[];
  currentMobileTasks: PodTask[];
  targetedTaskId?: string | null;
  toastMessage: { text: string; type: "success" | "error" } | null;
  setToastMessage: (msg: { text: string; type: "success" | "error" } | null) => void;
  showToast: (text: string, type?: "success" | "error") => void;
  startMutation: UseMutationResult<any, Error, string, unknown>;
  onQaApprove?: (taskId: string) => void;
  openUpload: (task: PodTask) => void;
  setCreateOpen: (open: boolean) => void;
  setNewClientId: (id: string) => void;
  isAdmin: boolean;
  clients: any[];
  formatLabel: (type: string) => string;
  taskTitle: (task: PodTask) => string;
  dueText: (task: PodTask) => { text: string; urgent: boolean };
  feedbackFor: (task: PodTask) => {
    source: "Lead QA" | "Client";
    text: string;
    voice_note_url?: string | null;
    voice_note_duration?: number | null;
  } | null;
}

export function MemberMobileTaskBoard({
  user,
  userInitials: _userInitials,
  leadName,
  searchQuery,
  setSearchQuery,
  selectedClient,
  setSelectedClient,
  urgencyFilter,
  setUrgencyFilter,
  mobileKanbanTab,
  setMobileKanbanTab,
  tasks,
  availableClients,
  assigned,
  production,
  qa,
  review,
  currentMobileTasks,
  targetedTaskId,
  toastMessage,
  setToastMessage,
  showToast: _showToast,
  startMutation,
  onQaApprove,
  openUpload,
  setCreateOpen,
  setNewClientId,
  isAdmin,
  clients,
  formatLabel,
  taskTitle,
  dueText,
  feedbackFor,
}: MemberMobileTaskBoardProps) {
  const { toggleMobile } = useAdminSidebar();

  return (
    <div className="md:hidden w-full max-w-[430px] mx-auto min-h-screen bg-[#0B0F17] flex flex-col relative pb-12 text-slate-100 shadow-2xl">
      {/* BEGIN: MobileTopBar */}
      <header className="sticky top-0 z-40 bg-[#0B0F17]/90 backdrop-blur-md px-4 py-3 border-b border-[#2A3446]/40 flex items-center justify-between">
        {/* App Brand & Role Pill */}
        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={toggleMobile}
            className="size-8 rounded-xl bg-[#131C2B] border border-[#2A3446] flex items-center justify-center text-slate-300 hover:text-white transition cursor-pointer shrink-0"
            aria-label="Open navigation sidebar"
            title="Open navigation menu"
          >
            <Menu className="size-4" />
          </button>
          <div className="flex items-center">
            <span className="text-lg font-black tracking-tight text-white">Creo</span>
            <span className="text-lg font-black text-sky-400">.</span>
          </div>
          <span className="border border-sky-500/30 bg-sky-500/10 text-sky-300 text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider">
            {user?.role === "team_lead" || user?.role === "lead" ? "LEAD" : "MEMBER"}
          </span>
        </div>

        {/* Right Header Actions (Notifications) */}
        <div className="flex items-center">
          <NotificationMenu placement="header" />
        </div>
      </header>
      {/* END: MobileTopBar */}

      {/* Toast Alert */}
      {toastMessage && (
        <div
          role="status"
          className={`mx-4 mt-3 p-3 rounded-xl border text-xs font-bold flex items-center justify-between shadow-2xs ${
            toastMessage.type === "error"
              ? "bg-rose-500/15 border-rose-500/30 text-rose-300"
              : "bg-emerald-500/15 border-emerald-500/30 text-emerald-400"
          }`}
        >
          <div className="flex items-center gap-2">
            {toastMessage.type === "error" ? (
              <AlertTriangle className="size-3.5 shrink-0" />
            ) : (
              <CheckCircle2 className="size-3.5 shrink-0" />
            )}
            <span>{toastMessage.text}</span>
          </div>
          <button
            onClick={() => setToastMessage(null)}
            className="text-current opacity-70 hover:opacity-100 cursor-pointer"
            aria-label="Dismiss"
          >
            &times;
          </button>
        </div>
      )}

      {/* Main Content Area */}
      <main className="flex-1 px-4 pt-3 flex flex-col gap-3.5">
        {/* BEGIN: SearchAndFilterToolbar */}
        <section className="flex flex-col gap-2.5" data-purpose="search-and-filters">
          {/* Search Input */}
          <div className="relative w-full">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
              <Search className="size-4" />
            </div>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Filter tasks by client, format or title..."
              className="w-full bg-[#0B111C] border border-[#2A3446] rounded-xl text-xs py-2.5 pl-9 pr-3.5 text-slate-200 placeholder-slate-400 focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500 transition shadow-inner"
            />
          </div>

          {/* Filter Dropdowns Row */}
          <div className="grid grid-cols-2 gap-2">
            {/* Clients Dropdown */}
            <div className="relative">
              <select
                value={selectedClient}
                onChange={(e) => setSelectedClient(e.target.value)}
                aria-label="Filter by client"
                className="w-full bg-[#0F1726] border border-[#2A3446] rounded-xl py-2 pl-3 pr-7 text-xs font-medium text-slate-200 hover:border-slate-500 transition appearance-none cursor-pointer truncate focus:outline-none focus:border-sky-500"
              >
                <option value="all">All Clients ({tasks.length})</option>
                {availableClients.map((client) => {
                  const clientTaskCount = tasks.filter(
                    (t) => t.task.client_id === client.id || t.task.client_name === client.name,
                  ).length;
                  return (
                    <option key={client.id} value={client.id}>
                      {client.name} ({clientTaskCount})
                    </option>
                  );
                })}
              </select>
              <ChevronDown className="size-3.5 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none flex-shrink-0" />
            </div>

            {/* Urgency Dropdown */}
            <div className="relative">
              <select
                value={urgencyFilter}
                onChange={(e) => setUrgencyFilter(e.target.value)}
                aria-label="Filter by urgency"
                className="w-full bg-[#0F1726] border border-[#2A3446] rounded-xl py-2 pl-3 pr-7 text-xs font-medium text-slate-200 hover:border-slate-500 transition appearance-none cursor-pointer truncate focus:outline-none focus:border-sky-500"
              >
                <option value="All">All Urgency</option>
                <option value="High">Due soon / revisions</option>
                <option value="Normal">Normal</option>
              </select>
              <ChevronDown className="size-3.5 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none flex-shrink-0" />
            </div>
          </div>

          {/* Action Button */}
          {!isAdmin && (
            <button
              type="button"
              onClick={() => {
                setNewClientId(clients[0]?.id || "");
                setCreateOpen(true);
              }}
              disabled={clients.length === 0}
              className="w-full bg-[#38BDF8] hover:bg-[#0ea5e9] active:scale-[0.98] text-slate-950 font-semibold text-xs py-2.5 px-3 rounded-xl shadow-sm flex items-center justify-center gap-1.5 transition cursor-pointer disabled:opacity-50"
            >
              <Plus className="size-3.5 stroke-[2.5]" />
              <span>Add Task</span>
            </button>
          )}
        </section>
        {/* END: SearchAndFilterToolbar */}

        {/* BEGIN: ProductionStageTabs */}
        <nav
          aria-label="Stages"
          className="flex gap-1.5 p-1 bg-[#0B111C]/90 border border-[#2A3446] rounded-2xl overflow-x-auto no-scrollbar"
          data-purpose="stage-navigation"
        >
          {([
            ["assigned", `Queued (${assigned.length})`],
            ["production", `Active (${production.length})`],
            ["qa", `Lead QA (${qa.length})`],
            ["review", `Client (${review.length})`],
          ] as const).map(([key, label]) => {
            const isActive = mobileKanbanTab === key;
            return (
              <button
                key={key}
                type="button"
                onClick={() => setMobileKanbanTab(key)}
                className={`whitespace-nowrap transition cursor-pointer ${
                  isActive
                    ? "bg-[#dce6f2] text-slate-950 font-bold text-xs px-3.5 py-1.5 rounded-xl shadow-sm"
                    : "text-slate-400 hover:text-slate-200 font-medium text-xs px-3 py-1.5"
                }`}
              >
                {label}
              </button>
            );
          })}
        </nav>
        {/* END: ProductionStageTabs */}

        {/* BEGIN: KanbanColumnContainer */}
        <section
          className="border border-[#2A3446] bg-[#111724]/70 rounded-2xl p-3.5 flex flex-col gap-3"
          data-purpose="kanban-column"
        >
          {/* Column Header */}
          <div className="flex items-center justify-between pb-1">
            <div className="flex items-center gap-2">
              <span
                className={`size-2 rounded-full ${
                  mobileKanbanTab === "assigned"
                    ? "bg-sky-400 shadow-[0_0_8px_rgba(56,189,248,0.6)]"
                    : mobileKanbanTab === "production"
                    ? "bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.6)] animate-pulse"
                    : mobileKanbanTab === "qa"
                    ? "bg-indigo-400 shadow-[0_0_8px_rgba(129,140,248,0.6)]"
                    : "bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.6)]"
                }`}
              />
              <h2 className="text-[11px] font-bold tracking-wider text-slate-300 uppercase">
                {mobileKanbanTab === "assigned"
                  ? "ASSIGNED & QUEUED"
                  : mobileKanbanTab === "production"
                  ? "IN PRODUCTION"
                  : mobileKanbanTab === "qa"
                  ? "SUBMITTED FOR QA"
                  : "CLIENT REVIEW & APPROVED"}
              </h2>
            </div>
            {/* Counter Badge */}
            <span className="bg-[#161F2D] text-slate-300 border border-[#2A3446] text-[11px] font-bold px-2.5 py-0.5 rounded-full">
              {currentMobileTasks.length}
            </span>
          </div>

          {/* Task Cards Stack */}
          <div className="flex flex-col gap-3">
            {currentMobileTasks.map((task) => {
              const due = dueText(task);
              const feedback = feedbackFor(task);
              const isTargeted = targetedTaskId === task.id;
              const approved = task.status === "ready_to_publish" || task.status === "completed";

              return (
                <article
                  key={task.id}
                  id={`mobile-task-card-${task.id}`}
                  className={`bg-[#131B28] border rounded-xl p-3.5 shadow-sm hover:border-slate-600 transition flex flex-col justify-between ${
                    isTargeted
                      ? "ring-2 ring-sky-400 border-sky-400 shadow-lg shadow-sky-500/20"
                      : "border-[#243044]"
                  }`}
                  data-purpose="task-card"
                >
                  <div>
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-bold tracking-wider text-slate-400 uppercase truncate max-w-[200px]">
                        {task.client_name}
                      </span>
                      <span className="bg-slate-800/80 text-slate-300 border border-slate-700/60 text-[10px] font-medium px-2 py-0.5 rounded-md shrink-0">
                        {formatLabel(task.deliverable_type)}
                      </span>
                    </div>

                    <h3 className="text-sm font-bold text-white mt-2 leading-snug">
                      {taskTitle(task)}
                    </h3>

                    {task.blueprint?.brief && (
                      <p className="text-[11px] text-slate-400 line-clamp-2 mt-1 leading-relaxed">
                        {task.blueprint.brief}
                      </p>
                    )}

                    {/* QA stage media preview */}
                    {mobileKanbanTab === "qa" && task.deliverable && (
                      <div className="h-32 rounded-lg overflow-hidden border border-slate-700/60 bg-black my-2.5">
                        <DeliverableMedia
                          url={task.deliverable.file_url}
                          isVideo={task.deliverable.is_video}
                          title={taskTitle(task)}
                          controls={false}
                          className="w-full h-full"
                        />
                      </div>
                    )}

                    {/* Production stage feedback note */}
                    {feedback && (
                      <div className="p-2.5 my-2 rounded-lg bg-[#0B111C] border border-amber-400/40 text-xs space-y-1.5">
                        <div className="font-bold text-amber-300 text-[10px] uppercase tracking-wider flex items-center justify-between">
                          <span>{feedback.source} requested changes</span>
                          {feedback.voice_note_url && (
                            <span className="text-sky-400 font-mono text-[9px] bg-sky-500/10 px-1.5 py-0.5 rounded border border-sky-500/20">Voice Note</span>
                          )}
                        </div>
                        {feedback.text && (
                          <p className="text-[11px] text-slate-200 leading-snug line-clamp-3">
                            "{feedback.text}"
                          </p>
                        )}
                        {feedback.voice_note_url && (
                          <div className="pt-1">
                            <VoicePlayer
                              audioUrl={feedback.voice_note_url}
                              durationSeconds={feedback.voice_note_duration}
                              authorName={`${feedback.source}'s Voice Note`}
                            />
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  <div className="mt-3 pt-2.5 border-t border-slate-800/60 flex justify-between items-center">
                    <div>
                      {mobileKanbanTab === "review" ? (
                        approved ? (
                          <span className="text-emerald-400 text-xs font-semibold flex items-center gap-1">
                            <Check className="size-3" /> Client approved
                          </span>
                        ) : (
                          <span className="text-amber-400 text-xs font-semibold flex items-center gap-1">
                            <Clock className="size-3" /> With client
                          </span>
                        )
                      ) : mobileKanbanTab === "qa" ? (
                        <span className="text-slate-400 text-xs font-medium">
                          v{task.deliverable?.version ?? 1} · With {leadName}
                        </span>
                      ) : (
                        <span
                          className={`text-xs ${
                            due.urgent
                              ? "text-amber-400 font-semibold flex items-center gap-1"
                              : "text-slate-400 font-medium"
                          }`}
                        >
                          {due.text}
                        </span>
                      )}
                    </div>

                    <div>
                      {mobileKanbanTab === "assigned" && (
                        <button
                          type="button"
                          onClick={() => startMutation.mutate(task.id)}
                          disabled={startMutation.isPending}
                          className="border border-slate-700 bg-slate-800/80 hover:bg-slate-700 active:scale-95 text-slate-200 text-xs font-medium px-3 py-1 rounded-lg flex items-center gap-1 transition cursor-pointer disabled:opacity-50"
                        >
                          <span>Start</span>
                          <span className="text-[11px]">→</span>
                        </button>
                      )}

                      {mobileKanbanTab === "production" && (
                        <button
                          type="button"
                          onClick={() => openUpload(task)}
                          className="border border-slate-700 bg-slate-800/80 hover:bg-slate-700 active:scale-95 text-slate-200 text-xs font-medium px-3 py-1 rounded-lg flex items-center gap-1 transition cursor-pointer"
                        >
                          <Upload className="size-3" />
                          <span>{task.deliverable ? "Revise" : "Submit QA"}</span>
                        </button>
                      )}

                      {mobileKanbanTab === "qa" && (
                        (user?.role === "team_lead" || user?.role === "lead") && onQaApprove ? (
                          <div className="flex items-center gap-1.5">
                            <Link
                              to="/lead/deliverables"
                              className="border border-slate-700 bg-slate-800/80 hover:bg-slate-700 active:scale-95 text-slate-200 text-xs font-medium px-2.5 py-1 rounded-lg flex items-center gap-1 transition"
                            >
                              <span>Inspect</span>
                            </Link>
                            <button
                              type="button"
                              onClick={() => onQaApprove(task.id)}
                              className="bg-[#7FA0D6] hover:bg-blue-600 text-white text-xs font-semibold px-2.5 py-1 rounded-lg flex items-center gap-1 transition shadow-xs cursor-pointer"
                            >
                              <Check className="size-3" />
                              <span>Sign-off</span>
                            </button>
                          </div>
                        ) : (
                          <span className="border border-slate-700/60 bg-slate-800/60 text-slate-300 text-[10px] font-medium px-2 py-0.5 rounded-md">
                            Awaiting QA
                          </span>
                        )
                      )}

                      {mobileKanbanTab === "review" && (
                        <span className="text-slate-400 text-xs font-medium">
                          v{task.deliverable?.version ?? 1}
                        </span>
                      )}
                    </div>
                  </div>

                  {mobileKanbanTab === "review" && task.deliverable?.id && (
                    <div className="mt-2.5 pt-2 border-t border-slate-800/60">
                      <PublishingControl deliverableId={task.deliverable.id} />
                    </div>
                  )}
                </article>
              );
            })}

            {currentMobileTasks.length === 0 && (
              <div className="text-center py-10 px-4 text-xs text-slate-400 font-medium bg-[#131B28]/50 rounded-xl border border-dashed border-[#243044]">
                {mobileKanbanTab === "assigned"
                  ? "No queued tasks"
                  : mobileKanbanTab === "production"
                  ? "Nothing currently in production"
                  : mobileKanbanTab === "qa"
                  ? "Nothing waiting in QA"
                  : "Nothing with the client yet"}
              </div>
            )}
          </div>
        </section>
        {/* END: KanbanColumnContainer */}
      </main>
    </div>
  );
}
