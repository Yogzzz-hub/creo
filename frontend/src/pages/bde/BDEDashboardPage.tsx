import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Plus,
  Search,
  MessageSquare,
  Calendar as CalendarIcon,
  Clock,
  TrendingUp,
  AlertCircle,
  RefreshCw,
  X,
  DollarSign,
  Columns3,
  List,
  Trash2,
} from "lucide-react";
import {
  fetchLeads,
  fetchBDEMetrics,
  fetchLeadDetail,
  createLead,
  updateLead,
  deleteLead,
  logLeadActivity,
  Lead,
  LeadPriority,
  LeadStatus,
  CreateLeadPayload,
} from "../../lib/bde-api";
import { AdminTopHeader } from "../../components/admin/AdminTopHeader";
import { CustomSelect } from "../../components/ui/CustomSelect";

export type TaskQueueStage = "contacted" | "negotiation" | "won" | "lost";

export interface QueueColumnDef {
  id: TaskQueueStage;
  title: string;
  defaultStatus: LeadStatus;
  matchingStatuses: LeadStatus[];
  dotColor: string;
  badgeBg: string;
  badgeText: string;
  accentBorder: string;
  countBg: string;
}

export const TASK_QUEUE_COLUMNS: QueueColumnDef[] = [
  {
    id: "contacted",
    title: "Contacted",
    defaultStatus: "contacted",
    matchingStatuses: ["new", "contacted", "meeting_scheduled"],
    dotColor: "bg-blue-400 text-app-on-accent!",
    badgeBg: "bg-blue-500/15",
    badgeText: "text-blue-300",
    accentBorder: "border-blue-500/30",
    countBg: "bg-blue-500/20 text-blue-200",
  },
  {
    id: "negotiation",
    title: "In Negotiation",
    defaultStatus: "negotiation",
    matchingStatuses: ["proposal_sent", "negotiation"],
    dotColor: "bg-amber-400 text-app-on-warm!",
    badgeBg: "bg-amber-500/15",
    badgeText: "text-amber-300",
    accentBorder: "border-amber-500/30",
    countBg: "bg-amber-500/20 text-amber-200",
  },
  {
    id: "won",
    title: "Won",
    defaultStatus: "converted",
    matchingStatuses: ["converted"],
    dotColor: "bg-emerald-400 text-app-on-accent!",
    badgeBg: "bg-emerald-500/15",
    badgeText: "text-emerald-300",
    accentBorder: "border-emerald-500/30",
    countBg: "bg-emerald-500/20 text-emerald-200",
  },
  {
    id: "lost",
    title: "Lost",
    defaultStatus: "lost",
    matchingStatuses: ["lost"],
    dotColor: "bg-rose-400 text-app-on-warm!",
    badgeBg: "bg-rose-500/15",
    badgeText: "text-rose-300",
    accentBorder: "border-rose-500/30",
    countBg: "bg-rose-500/20 text-rose-200",
  },
];

export function BDEDashboardPage() {
  const queryClient = useQueryClient();

  // View Mode: Task Queue (Kanban) or Table View
  const [viewMode, setViewMode] = useState<"queue" | "table">("queue");

  // Drag and Drop & Move state
  const [draggingLeadId, setDraggingLeadId] = useState<string | null>(null);
  const [dragOverCol, setDragOverCol] = useState<string | null>(null);

  // Filters & State
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [mobileColId, setMobileColId] = useState<string>("contacted");

  // Modals
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [addModalInitialStatus, setAddModalInitialStatus] = useState<LeadStatus>("new");
  const [activeActivityLead, setActiveActivityLead] = useState<Lead | null>(null);
  const [selectedLeadDetailId, setSelectedLeadDetailId] = useState<string | null>(null);

  const openAddModal = (status: LeadStatus = "new") => {
    setAddModalInitialStatus(status);
    setIsAddModalOpen(true);
  };

  // Queries
  const leadsQuery = useQuery({
    queryKey: ["bde-leads"],
    queryFn: () => fetchLeads({}),
  });

  const metricsQuery = useQuery({
    queryKey: ["bde-metrics"],
    queryFn: fetchBDEMetrics,
  });

  // Fast optimistic mutations
  const updateLeadMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: any }) => updateLead(id, payload),
    onMutate: async ({ id, payload }) => {
      const queryKey = ["bde-leads"];
      await queryClient.cancelQueries({ queryKey });
      const previousLeads = queryClient.getQueryData<Lead[]>(queryKey);
      if (previousLeads) {
        queryClient.setQueryData<Lead[]>(queryKey, (old) =>
          old ? old.map((l) => (l.id === id ? { ...l, ...payload } : l)) : []
        );
      }
      return { previousLeads, queryKey };
    },
    onError: (_err, _vars, context) => {
      if (context?.previousLeads) {
        queryClient.setQueryData(context.queryKey, context.previousLeads);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["bde-leads"] });
      queryClient.invalidateQueries({ queryKey: ["bde-metrics"] });
      queryClient.invalidateQueries({ queryKey: ["admin-calendar"] });
    },
  });

  const deleteLeadMutation = useMutation({
    mutationFn: (id: string) => deleteLead(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["bde-leads"] });
      queryClient.invalidateQueries({ queryKey: ["bde-metrics"] });
      queryClient.invalidateQueries({ queryKey: ["admin-calendar"] });
      if (selectedLeadDetailId) setSelectedLeadDetailId(null);
    },
  });

  const handleDeleteLead = (e: React.MouseEvent, lead: Lead) => {
    e.stopPropagation();
    if (window.confirm(`Are you sure you want to delete lead "${lead.name} (${lead.company_name})"?`)) {
      deleteLeadMutation.mutate(lead.id);
    }
  };

  const allLeads = leadsQuery.data || [];

  // Zero-latency instant search
  const leads = useMemo(() => {
    if (!searchQuery.trim()) return allLeads;
    const q = searchQuery.toLowerCase().trim();
    return allLeads.filter(
      (l) =>
        l.name.toLowerCase().includes(q) ||
        l.company_name.toLowerCase().includes(q) ||
        (l.phone && l.phone.toLowerCase().includes(q)) ||
        (l.email && l.email.toLowerCase().includes(q)) ||
        (l.requirements && l.requirements.toLowerCase().includes(q))
    );
  }, [allLeads, searchQuery]);

  const livePipelineValue = useMemo(
    () =>
      allLeads
        .filter((l) => l.status !== "lost" && l.status !== "converted")
        .reduce((sum, l) => sum + (Number(l.estimated_deal_value) || 0), 0),
    [allLeads]
  );
  const metrics = metricsQuery.data;
  const displayPipelineValue = metrics?.total_pipeline_value ?? livePipelineValue;

  // Move lead to target column
  const handleMoveLead = (leadId: string, targetColId: TaskQueueStage) => {
    const targetCol = TASK_QUEUE_COLUMNS.find((c) => c.id === targetColId);
    if (!targetCol) return;
    updateLeadMutation.mutate({
      id: leadId,
      payload: { status: targetCol.defaultStatus },
    });
  };

  // WhatsApp click-to-chat
  const openWhatsApp = (lead: Lead | { name: string; company?: string; phone?: string | null }) => {
    if (!lead.phone) return;
    const cleanPhone = lead.phone.replace(/[^0-9]/g, "");
    const company = "company_name" in lead ? lead.company_name : lead.company || "your business";
    const greeting = encodeURIComponent(
      `Hello ${lead.name}, this is Creo Creative Studio reaching out regarding your inquiry for ${company}. How can we assist you with your content and creative design requirements?`
    );
    window.open(`https://wa.me/${cleanPhone}?text=${greeting}`, "_blank");
  };

  // Quick schedule follow-up
  const quickSchedule = async (lead: Lead | { id: string }, days: number) => {
    const target = new Date();
    target.setDate(target.getDate() + days);
    target.setHours(11, 0, 0, 0);

    await logLeadActivity(lead.id, {
      activity_type: "call",
      summary: `Automated follow-up scheduled for +${days} day(s)`,
      scheduled_follow_up: target.toISOString(),
    });

    await updateLeadMutation.mutateAsync({
      id: lead.id,
      payload: { next_follow_up_at: target.toISOString() },
    });

    queryClient.invalidateQueries({ queryKey: ["bde-leads"] });
    queryClient.invalidateQueries({ queryKey: ["bde-metrics"] });
    queryClient.invalidateQueries({ queryKey: ["admin-calendar"] });
  };

  return (
    <div className="w-full min-h-screen bg-app-base flex flex-col">
      <AdminTopHeader activeTab="BDE Workspace" hideTitle />
      <main className="flex-1 px-3.5 sm:px-6 lg:px-8 pt-6 sm:pt-8 pb-24 sm:pb-16 max-w-[1700px] w-full mx-auto space-y-6 animate-in fade-in duration-300">

        <div className="space-y-6">
            {/* KPI Cards Grid - Compact & Always Side-by-Side */}
            <div className="grid grid-cols-2 gap-3">
              {/* Pipeline Value */}
              <div className="bg-app-surface border border-app-line rounded-xl px-3.5 py-2.5 shadow-sm hover:border-app-accent/40 transition-colors">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-app-mist truncate">
                    Pipeline Value
                  </span>
                  <div className="w-5.5 h-5.5 rounded-md bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shrink-0">
                    <DollarSign className="w-3 h-3" />
                  </div>
                </div>
                <div className="text-lg sm:text-xl font-extrabold text-hi font-mono leading-tight">
                  ₹{displayPipelineValue >= 1000 ? `${(displayPipelineValue / 1000).toLocaleString()}k` : displayPipelineValue.toLocaleString()}
                </div>
                <p className="text-[10px] text-app-mist mt-0.5 truncate">Active opportunities in negotiation</p>
              </div>

              {/* Conversion Rate */}
              <div className="bg-app-surface border border-app-line rounded-xl px-3.5 py-2.5 shadow-sm hover:border-app-accent/40 transition-colors">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-app-mist truncate">
                    Conversion Rate
                  </span>
                  <div className="w-5.5 h-5.5 rounded-md bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center text-indigo-400 shrink-0">
                    <TrendingUp className="w-3 h-3" />
                  </div>
                </div>
                <div className="text-lg sm:text-xl font-extrabold text-hi font-mono leading-tight">
                  {metrics ? `${metrics.conversion_rate}%` : "--"}
                </div>
                <p className="text-[10px] text-app-mist mt-0.5 truncate">
                  {metrics?.stages?.converted || 0} clients won of {metrics?.total_leads || 0} leads
                </p>
              </div>
            </div>

            {/* Filter Bar & View Toggle */}
            <div className="bg-app-surface/80 backdrop-blur-sm border border-app-line rounded-xl px-3 py-2 shadow-md flex items-center justify-between gap-3">
              <div className="relative flex-1 max-w-md">
                <Search className="w-3.5 h-3.5 text-app-mist absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search prospects..."
                  className="w-full bg-app-base border border-app-line rounded-lg pl-8 pr-3 py-1.5 text-xs text-hi placeholder:text-app-mist/80 focus:outline-none focus:border-app-accent transition-colors"
                />
              </div>

              {/* View Mode Toggle: Task Queue vs Table */}
              <div className="bg-app-base border border-app-line rounded-lg p-0.5 flex items-center gap-0.5 shrink-0">
                <button
                  type="button"
                  onClick={() => setViewMode("queue")}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-all cursor-pointer ${
                    viewMode === "queue"
                      ? "bg-app-accent text-app-base font-bold shadow-sm"
                      : "text-app-mist hover:text-hi"
                  }`}
                  title="Task Queue View"
                >
                  <Columns3 className="w-3.5 h-3.5" />
                  <span>Queue</span>
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode("table")}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-all cursor-pointer ${
                    viewMode === "table"
                      ? "bg-app-accent text-app-base font-bold shadow-sm"
                      : "text-app-mist hover:text-hi"
                  }`}
                  title="Table View"
                >
                  <List className="w-3.5 h-3.5" />
                  <span>Table</span>
                </button>
              </div>
            </div>

            {/* Task Queue View (Kanban 4 Headings: Contacted, In Negotiation, Won, Lost) */}
            {viewMode === "queue" ? (
              <div className="space-y-3">
                {/* Mobile Stage Selector Tabs (2x2 Grid so all words are clearly visible without scrolling) */}
                <div className="grid grid-cols-2 sm:hidden gap-1.5 p-1.5 bg-app-surface border border-app-line rounded-xl shadow-sm">
                  {TASK_QUEUE_COLUMNS.map((col) => {
                    const count = leads.filter((l) => col.matchingStatuses.includes(l.status)).length;
                    const isActive = mobileColId === col.id;
                    return (
                      <button
                        key={col.id}
                        type="button"
                        onClick={() => setMobileColId(col.id)}
                        className={`py-2 px-2.5 rounded-lg text-xs font-bold transition-all flex items-center justify-between gap-1.5 cursor-pointer ${
                          isActive
                            ? "bg-app-base text-hi border border-app-accent/60 shadow-sm"
                            : "text-app-mist hover:text-hi hover:bg-app-base/50"
                        }`}
                      >
                        <div className="flex items-center gap-1.5 min-w-0">
                          <span className={`w-2 h-2 rounded-full ${col.dotColor} shrink-0`} />
                          <span className="font-semibold whitespace-nowrap text-[11px] sm:text-xs">{col.title}</span>
                        </div>
                        <span
                          className={`text-[10px] font-extrabold px-1.5 py-0.5 leading-none rounded-full shrink-0 ${
                            isActive ? col.countBg : "bg-app-line/60 text-app-mist"
                          }`}
                        >
                          {count}
                        </span>
                      </button>
                    );
                  })}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pb-6 pt-1 items-stretch w-full">
                  {TASK_QUEUE_COLUMNS.map((col) => {
                    const colLeads = leads.filter((l) => col.matchingStatuses.includes(l.status));
                    const totalValue = colLeads.reduce((acc, l) => acc + (l.estimated_deal_value || 0), 0);
                    const isDropTarget = dragOverCol === col.id;
                    const isVisibleOnMobile = mobileColId === col.id;

                    return (
                      <div
                        key={col.id}
                        onDragOver={(e) => {
                          e.preventDefault();
                          e.dataTransfer.dropEffect = "move";
                          if (dragOverCol !== col.id) setDragOverCol(col.id);
                        }}
                        onDragLeave={(e) => {
                          if (e.currentTarget.contains(e.relatedTarget as Node)) return;
                          setDragOverCol(null);
                        }}
                        onDrop={(e) => {
                          e.preventDefault();
                          setDragOverCol(null);
                          const droppedLeadId = e.dataTransfer.getData("text/plain");
                          if (droppedLeadId) {
                            handleMoveLead(droppedLeadId, col.id);
                          }
                        }}
                        className={`w-full min-w-0 bg-app-surface border rounded-2xl p-4 sm:p-5 shadow-xl flex-col space-y-4 transition-all duration-200 sm:min-h-[580px] sm:max-h-[calc(100vh-240px)] ${
                          isVisibleOnMobile ? "flex" : "hidden sm:flex"
                        } ${
                          isDropTarget
                            ? "border-app-accent bg-app-surface/95 ring-2 ring-app-accent/50 shadow-[0_0_24px_color-mix(in_oklab,var(--app-accent)_20%,transparent)]"
                            : `${col.accentBorder}`
                        }`}
                      >
                      {/* Column Header (Matching Follow-Up Agenda Section Header) */}
                      <div className="flex items-center justify-between pb-3 border-b border-app-line">
                        <div className="flex items-center gap-2">
                          <span className={`w-2.5 h-2.5 rounded-full ${col.dotColor} shrink-0`} />
                          <h3 className="font-bold text-hi text-xs tracking-wider uppercase">
                            {col.title} ({colLeads.length})
                          </h3>
                        </div>

                        <div className="flex items-center gap-2">
                          {totalValue > 0 && (
                            <span className="text-xs font-mono font-bold text-emerald-400">
                              ₹{(totalValue / 1000).toFixed(0)}k
                            </span>
                          )}
                          <button
                            type="button"
                            onClick={() => openAddModal(col.defaultStatus)}
                            title={`Add client to ${col.title}`}
                            className="px-2.5 py-1 rounded-lg bg-app-base hover:bg-app-accent hover:text-app-base text-app-accent-soft border border-app-line hover:border-app-accent transition-all cursor-pointer text-xs font-bold flex items-center gap-1"
                          >
                            <Plus className="w-3.5 h-3.5" />
                            <span>Add</span>
                          </button>
                        </div>
                      </div>

                      {/* Cards List / Drop Area */}
                      <div className="space-y-3 flex-1 sm:overflow-y-auto sm:pr-0.5">
                        {leadsQuery.isLoading ? (
                          <div className="py-10 text-center text-app-mist flex flex-col items-center justify-center gap-2">
                            <RefreshCw className="w-4 h-4 animate-spin text-app-accent" />
                            <span className="text-xs">Loading {col.title}...</span>
                          </div>
                        ) : colLeads.length === 0 ? (
                          <div className="py-8 sm:py-16 text-center">
                            <p className="text-xs text-app-mist">No clients in {col.title}.</p>
                            <p className="text-[11px] text-app-mist/60 mt-1">Tap "+ Add" to create a new client lead.</p>
                          </div>
                        ) : (
                          colLeads.map((lead) => {
                            const isBeingDragged = draggingLeadId === lead.id;
                            const nextFollowUp = lead.next_follow_up_at ? new Date(lead.next_follow_up_at) : null;
                            const isOverdue = nextFollowUp && nextFollowUp.getTime() < Date.now();
                            const isToday =
                              nextFollowUp &&
                              nextFollowUp.toDateString() === new Date().toDateString();

                            return (
                              <div
                                key={lead.id}
                                draggable={true}
                                onDragStart={(e) => {
                                  e.dataTransfer.setData("text/plain", lead.id);
                                  e.dataTransfer.effectAllowed = "move";
                                  setDraggingLeadId(lead.id);
                                }}
                                onDragEnd={() => {
                                  setDraggingLeadId(null);
                                  setDragOverCol(null);
                                }}
                                className={`bg-app-base border border-app-line hover:border-app-accent/80 rounded-xl p-3.5 shadow-md transition-all cursor-grab active:cursor-grabbing hover:shadow-lg space-y-2.5 ${
                                  isBeingDragged ? "opacity-40 scale-[0.98] border-dashed border-app-accent" : ""
                                }`}
                              >
                                {/* Row 1: Name and Priority (matching Follow-Up Agenda) */}
                                <div className="flex items-center justify-between gap-2">
                                  <button
                                    type="button"
                                    onClick={() => setSelectedLeadDetailId(lead.id)}
                                    className="text-xs font-bold text-hi hover:text-app-accent text-left truncate cursor-pointer"
                                  >
                                    {lead.name}
                                  </button>
                                  <div className="flex items-center gap-1.5 shrink-0">
                                    <span
                                      className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full border shrink-0 ${
                                        lead.priority === "hot"
                                          ? "bg-rose-500/15 text-rose-300 border-rose-500/40"
                                          : lead.priority === "warm"
                                          ? "bg-amber-500/15 text-amber-300 border-amber-500/40"
                                          : "bg-blue-500/15 text-blue-300 border-blue-500/40"
                                      }`}
                                    >
                                      {lead.priority}
                                    </span>
                                    <button
                                      type="button"
                                      onClick={(e) => handleDeleteLead(e, lead)}
                                      title="Delete lead"
                                      className="text-app-mist/40 hover:text-rose-400 p-0.5 rounded cursor-pointer transition-colors"
                                    >
                                      <Trash2 className="w-3 h-3" />
                                    </button>
                                  </div>
                                </div>

                                {/* Row 2: Company and Stage / Deal Value */}
                                <div className="flex items-center justify-between text-[11px] text-app-mist">
                                  <span className="truncate">{lead.company_name}</span>
                                  <span className="font-mono text-emerald-400 font-bold shrink-0">
                                    ₹{lead.estimated_deal_value.toLocaleString()}
                                  </span>
                                </div>

                                {/* Requirements Snippet */}
                                {lead.requirements && (
                                  <p className="text-[10px] text-app-mist/80 bg-app-surface/60 rounded-lg p-2 leading-relaxed line-clamp-2">
                                    {lead.requirements}
                                  </p>
                                )}

                                {/* Row 3: Follow-Up & Action buttons (Matching Follow-Up Agenda) */}
                                <div className="flex items-center justify-between pt-1 border-t border-app-line/60 text-[11px]">
                                  <span
                                    className={`text-[11px] font-mono font-semibold flex items-center gap-1 ${
                                      isOverdue
                                        ? "text-rose-400"
                                        : isToday
                                        ? "text-amber-300"
                                        : "text-app-accent-soft"
                                    }`}
                                  >
                                    <CalendarIcon className={`w-3 h-3 shrink-0 ${isOverdue ? "text-rose-400" : isToday ? "text-amber-400" : "text-app-accent"}`} />
                                    <span>
                                      {nextFollowUp
                                        ? `${nextFollowUp.toLocaleDateString("en-US", { month: "short", day: "numeric" })}, ${nextFollowUp.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })}`
                                        : "No follow-up set"}
                                    </span>
                                  </span>

                                  <div className="flex items-center gap-1 shrink-0">
                                    {lead.phone && (
                                      <button
                                        type="button"
                                        onClick={() => openWhatsApp(lead)}
                                        title="Open WhatsApp"
                                        className="px-2 py-1 rounded-md bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/25 transition-colors text-[10px] font-bold flex items-center gap-1 cursor-pointer"
                                      >
                                        <MessageSquare className="w-3 h-3" />
                                        <span>WA</span>
                                      </button>
                                    )}
                                    <button
                                      type="button"
                                      onClick={() => quickSchedule(lead, 3)}
                                      title="Reschedule +3 days"
                                      className="px-2 py-1 rounded-md bg-app-surface border border-app-line text-app-accent-soft hover:text-hi transition-colors text-[10px] font-semibold cursor-pointer"
                                    >
                                      +3d
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => setActiveActivityLead(lead)}
                                      title="Log activity"
                                      className="px-2 py-1 rounded-md bg-app-accent/20 border border-app-accent/40 text-app-accent-soft hover:bg-app-accent/30 hover:text-hi transition-colors text-[10px] font-bold cursor-pointer"
                                    >
                                      Log
                                    </button>
                                  </div>
                                </div>

                                {/* Move Controls Dropdown */}
                                <div className="flex items-center justify-between pt-2 border-t border-app-line/60 gap-2">
                                  <span className="text-[10px] text-app-mist font-bold uppercase tracking-wider shrink-0">
                                    Move:
                                  </span>
                                  <select
                                    value={col.id}
                                    onChange={(e) => handleMoveLead(lead.id, e.target.value as TaskQueueStage)}
                                    aria-label="Move lead stage"
                                    className="w-full bg-app-surface border border-app-line hover:border-app-accent text-hi text-[11px] font-semibold rounded-lg px-2 py-1 cursor-pointer outline-none transition-colors"
                                  >
                                    {TASK_QUEUE_COLUMNS.map((targetCol) => (
                                      <option key={targetCol.id} value={targetCol.id}>
                                        {targetCol.title}
                                      </option>
                                    ))}
                                  </select>
                                </div>
                              </div>
                            );
                          })
                        )}
                      </div>

                      {/* Column Footer: Quick Add Client Button */}
                      <button
                        type="button"
                        onClick={() => openAddModal(col.defaultStatus)}
                        className="w-full mt-auto py-2 px-3 rounded-xl border border-dashed border-app-line hover:border-app-accent/60 hover:bg-app-accent/10 text-app-mist hover:text-hi transition-all text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer"
                      >
                        <Plus className="w-3.5 h-3.5 text-app-accent" />
                        <span>Add client to {col.title}</span>
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
              /* Traditional Table View */
              <div className="bg-app-surface border border-app-line rounded-2xl shadow-xl overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-app-base border-b border-app-line text-app-mist uppercase text-[10px] tracking-wider font-bold">
                      <tr>
                        <th className="py-3.5 px-4">Prospect & Company</th>
                        <th className="py-3.5 px-3">Priority</th>
                        <th className="py-3.5 px-3">Stage</th>
                        <th className="py-3.5 px-3">Est. Value</th>
                        <th className="py-3.5 px-3">Next Follow-Up</th>
                        <th className="py-3.5 px-3">Assigned BDE</th>
                        <th className="py-3.5 px-4 text-right">Quick Outreach & Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-app-line/60">
                      {leadsQuery.isLoading ? (
                        <tr>
                          <td colSpan={7} className="py-12 text-center text-app-mist">
                            <div className="flex flex-col items-center justify-center gap-2">
                              <RefreshCw className="w-5 h-5 animate-spin text-app-accent" />
                              <span>Loading prospects...</span>
                            </div>
                          </td>
                        </tr>
                      ) : leads.length === 0 ? (
                        <tr>
                          <td colSpan={7} className="py-12 text-center text-app-mist">
                            <p className="text-sm font-semibold text-hi">No prospective leads found</p>
                            <p className="text-xs mt-1">Add a prospective client to start tracking follow-ups and conversions.</p>
                          </td>
                        </tr>
                      ) : (
                        leads.map((lead) => {
                          const nextFollowUp = lead.next_follow_up_at ? new Date(lead.next_follow_up_at) : null;
                          const isOverdue = nextFollowUp && nextFollowUp.getTime() < Date.now();
                          const isToday =
                            nextFollowUp &&
                            nextFollowUp.toDateString() === new Date().toDateString();

                          return (
                            <tr key={lead.id} className="hover:bg-app-line-soft/40 transition-colors">
                              {/* Prospect & Company */}
                              <td className="py-3.5 px-4">
                                <div>
                                  <span className="font-bold text-hi text-xs block">{lead.name}</span>
                                  <span className="text-[11px] text-app-accent-soft font-medium block">
                                    {lead.company_name}
                                  </span>
                                  <span className="text-[10px] text-app-mist mt-0.5 block">
                                    {lead.phone || lead.email || "No contact"}
                                  </span>
                                </div>
                              </td>

                              {/* Priority Selector */}
                              <td className="py-3.5 px-3">
                                <select
                                  value={lead.priority}
                                  onChange={(e) =>
                                    updateLeadMutation.mutate({
                                      id: lead.id,
                                      payload: { priority: e.target.value as LeadPriority },
                                    })
                                  }
                                  className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border cursor-pointer ${
                                    lead.priority === "hot"
                                      ? "bg-rose-500/15 text-rose-300 border-rose-500/40"
                                      : lead.priority === "warm"
                                      ? "bg-amber-500/15 text-amber-300 border-amber-500/40"
                                      : "bg-blue-500/15 text-blue-300 border-blue-500/40"
                                  }`}
                                >
                                  <option value="hot">🔥 Hot</option>
                                  <option value="warm">☀️ Warm</option>
                                  <option value="cold">❄️ Cold</option>
                                </select>
                              </td>

                              {/* Status Pipeline Selector */}
                              <td className="py-3.5 px-3">
                                <select
                                  value={lead.status}
                                  onChange={(e) =>
                                    updateLeadMutation.mutate({
                                      id: lead.id,
                                      payload: { status: e.target.value as LeadStatus },
                                    })
                                  }
                                  className="bg-app-base border border-app-line rounded-lg px-2 py-1 text-xs text-hi focus:outline-none focus:border-app-accent cursor-pointer"
                                >
                                  <option value="new">New</option>
                                  <option value="contacted">Contacted</option>
                                  <option value="meeting_scheduled">Meeting Scheduled</option>
                                  <option value="proposal_sent">Proposal Sent</option>
                                  <option value="negotiation">Negotiation</option>
                                  <option value="converted">🎉 Converted (Won)</option>
                                  <option value="lost">Lost</option>
                                </select>
                              </td>

                              {/* Deal Value */}
                              <td className="py-3.5 px-3 font-mono font-bold text-app-accent-soft">
                                ₹{lead.estimated_deal_value.toLocaleString()}
                              </td>

                              {/* Next Follow-Up */}
                              <td className="py-3.5 px-3">
                                {nextFollowUp ? (
                                  <div className="flex flex-col">
                                    <span
                                      className={`text-[11px] font-semibold flex items-center gap-1 ${
                                        isOverdue
                                          ? "text-rose-400"
                                          : isToday
                                          ? "text-amber-400"
                                          : "text-app-accent-soft"
                                      }`}
                                    >
                                      <Clock className="w-3 h-3 shrink-0" />
                                      {nextFollowUp.toLocaleDateString("en-US", {
                                        month: "short",
                                        day: "numeric",
                                      })}
                                    </span>
                                    <span className="text-[10px] text-app-mist">
                                      {nextFollowUp.toLocaleTimeString("en-US", {
                                        hour: "2-digit",
                                        minute: "2-digit",
                                      })}
                                    </span>
                                  </div>
                                ) : (
                                  <span className="text-app-mist text-[11px]">None scheduled</span>
                                )}
                              </td>

                              {/* Assigned BDE */}
                              <td className="py-3.5 px-3 text-app-mist">
                                <span className="text-hi font-medium block">
                                  {lead.assigned_bde_name || "Unassigned"}
                                </span>
                              </td>

                              {/* Actions */}
                              <td className="py-3.5 px-4 text-right">
                                <div className="flex items-center justify-end gap-1.5">
                                  {/* WhatsApp Direct Action */}
                                  {lead.phone && (
                                    <button
                                      type="button"
                                      onClick={() => openWhatsApp(lead)}
                                      title="Open WhatsApp chat with prospect"
                                      className="px-2.5 py-1 rounded-lg bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/25 transition-colors flex items-center gap-1 text-[11px] font-bold cursor-pointer"
                                    >
                                      <MessageSquare className="w-3 h-3" />
                                      <span>WhatsApp</span>
                                    </button>
                                  )}

                                  {/* Quick +3d schedule */}
                                  <button
                                    type="button"
                                    onClick={() => quickSchedule(lead, 3)}
                                    title="Schedule follow-up in 3 days"
                                    className="px-2 py-1 rounded-lg bg-app-surface border border-app-line text-app-accent-soft hover:text-hi transition-colors text-[11px] font-semibold cursor-pointer"
                                  >
                                    +3d
                                  </button>

                                  {/* Log Activity */}
                                  <button
                                    type="button"
                                    onClick={() => setActiveActivityLead(lead)}
                                    className="px-2.5 py-1 rounded-lg bg-app-accent/20 border border-app-accent/40 text-app-accent-soft hover:bg-app-accent/30 hover:text-hi transition-colors text-[11px] font-bold cursor-pointer"
                                  >
                                    Log Call
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>

        {/* Lead Detail Modal */}
        {selectedLeadDetailId && (
          <LeadDetailModal
            leadId={selectedLeadDetailId}
            onClose={() => setSelectedLeadDetailId(null)}
            onLogActivity={(lead) => {
              setSelectedLeadDetailId(null);
              setActiveActivityLead(lead);
            }}
            onDelete={(lead) => {
              if (window.confirm(`Delete prospective lead "${lead.name} (${lead.company_name})"?`)) {
                deleteLeadMutation.mutate(lead.id);
              }
            }}
          />
        )}

        {/* Log Activity Modal */}
        {activeActivityLead && (
          <ActivityModal
            lead={activeActivityLead}
            onClose={() => setActiveActivityLead(null)}
            onSuccess={() => {
              queryClient.invalidateQueries({ queryKey: ["bde-leads"] });
              queryClient.invalidateQueries({ queryKey: ["bde-metrics"] });
              setActiveActivityLead(null);
            }}
          />
        )}

        {/* Add Lead Modal */}
        {isAddModalOpen && (
          <AddLeadModal
            initialStatus={addModalInitialStatus}
            onClose={() => setIsAddModalOpen(false)}
            onSuccess={() => {
              queryClient.invalidateQueries({ queryKey: ["bde-leads"] });
              queryClient.invalidateQueries({ queryKey: ["bde-metrics"] });
              setIsAddModalOpen(false);
            }}
          />
        )}
      </main>
    </div>
  );
}

// ── Lead Detail Modal ────────────────────────────────────────────────────────

function LeadDetailModal({
  leadId,
  onClose,
  onLogActivity,
  onDelete,
}: {
  leadId: string;
  onClose: () => void;
  onLogActivity: (lead: Lead) => void;
  onDelete: (lead: Lead) => void;
}) {
  const { data: lead, isLoading } = useQuery({
    queryKey: ["lead-detail", leadId],
    queryFn: () => fetchLeadDetail(leadId),
  });

  return (
    <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
      <div className="bg-app-surface border border-app-line rounded-3xl w-full max-w-xl p-6 space-y-4 shadow-2xl relative max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between border-b border-app-line pb-3">
          <div>
            <h3 className="text-base font-bold text-hi">{lead?.name || "Lead Details"}</h3>
            <p className="text-xs text-app-mist">{lead?.company_name}</p>
          </div>
          <button type="button" onClick={onClose} className="text-app-mist hover:text-hi cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        {isLoading ? (
          <div className="py-12 flex flex-col items-center justify-center gap-2 text-app-mist">
            <RefreshCw className="w-5 h-5 animate-spin text-app-accent" />
            <span className="text-xs">Loading lead details...</span>
          </div>
        ) : !lead ? (
          <div className="py-12 text-center text-xs text-app-mist">Lead not found.</div>
        ) : (
          <div className="space-y-4 text-xs">
            {/* Quick Metrics Header */}
            <div className="grid grid-cols-3 gap-3 bg-app-base p-3 rounded-2xl border border-app-line">
              <div>
                <span className="text-[10px] text-app-mist uppercase font-bold block">Status</span>
                <span className="text-hi font-bold capitalize">{lead.status}</span>
              </div>
              <div>
                <span className="text-[10px] text-app-mist uppercase font-bold block">Priority</span>
                <span className="text-hi font-bold capitalize">{lead.priority}</span>
              </div>
              <div>
                <span className="text-[10px] text-app-mist uppercase font-bold block">Deal Value</span>
                <span className="text-emerald-400 font-mono font-bold">₹{lead.estimated_deal_value.toLocaleString()}</span>
              </div>
            </div>

            {/* Contact Details */}
            <div className="space-y-2 bg-app-base p-3 rounded-2xl border border-app-line">
              <span className="text-[10px] text-app-mist uppercase font-bold block">Contact Information</span>
              <div className="grid grid-cols-2 gap-2 text-hi">
                <div>
                  <span className="text-app-mist block text-[10px]">Phone:</span>
                  <span>{lead.phone || "None"}</span>
                </div>
                <div>
                  <span className="text-app-mist block text-[10px]">Email:</span>
                  <span className="truncate block">{lead.email || "None"}</span>
                </div>
              </div>
            </div>

            {/* Requirements */}
            {lead.requirements && (
              <div className="space-y-1 bg-app-base p-3 rounded-2xl border border-app-line">
                <span className="text-[10px] text-app-mist uppercase font-bold block">Requirements</span>
                <p className="text-hi leading-relaxed">{lead.requirements}</p>
              </div>
            )}

            {/* Next Follow-Up */}
            <div className="bg-app-base p-3 rounded-2xl border border-app-line flex items-center justify-between">
              <span className="text-[10px] text-app-mist uppercase font-bold">Scheduled Follow-Up</span>
              <span className="text-amber-300 font-mono font-semibold">
                {lead.next_follow_up_at
                  ? new Date(lead.next_follow_up_at).toLocaleString("en-US", {
                      month: "short",
                      day: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })
                  : "None scheduled"}
              </span>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center justify-between pt-3 border-t border-app-line">
              <button
                type="button"
                onClick={() => onDelete(lead)}
                className="px-3 py-1.5 rounded-xl text-rose-400 hover:bg-rose-500/10 border border-rose-500/30 font-bold transition-colors cursor-pointer"
              >
                Delete Lead
              </button>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-1.5 rounded-xl border border-app-line text-app-mist hover:text-hi cursor-pointer"
                >
                  Close
                </button>
                <button
                  type="button"
                  onClick={() => onLogActivity(lead)}
                  className="px-4 py-1.5 rounded-xl bg-app-accent text-app-base font-bold hover:bg-hi transition-all cursor-pointer"
                >
                  Log Follow-Up / Call
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Log Activity Modal ────────────────────────────────────────────────────────

function ActivityModal({
  lead,
  onClose,
  onSuccess,
}: {
  lead: Lead;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [activityType, setActivityType] = useState<any>("call");
  const [summary, setSummary] = useState("");
  const [outcome, setOutcome] = useState("");
  const [followUpDate, setFollowUpDate] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!summary.trim()) return;

    try {
      setIsSubmitting(true);
      const scheduledIso = followUpDate ? new Date(followUpDate).toISOString() : undefined;
      await logLeadActivity(lead.id, {
        activity_type: activityType,
        summary: summary.trim(),
        outcome: outcome.trim() || undefined,
        scheduled_follow_up: scheduledIso,
      });
      if (scheduledIso) {
        await updateLead(lead.id, {
          next_follow_up_at: scheduledIso,
        });
      }
      onSuccess();
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
      <div className="bg-app-surface border border-app-line rounded-3xl w-full max-w-lg p-6 space-y-4 shadow-2xl relative">
        <div className="flex items-center justify-between border-b border-app-line pb-3">
          <div>
            <h3 className="text-base font-bold text-hi">Log Communication & Follow-Up</h3>
            <p className="text-xs text-app-mist">
              {lead.name} · {lead.company_name}
            </p>
          </div>
          <button type="button" onClick={onClose} className="text-app-mist hover:text-hi cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          <div>
            <label className="block text-app-mist font-bold uppercase mb-1">Interaction Type</label>
            <div className="grid grid-cols-4 gap-2">
              {[
                { type: "call", label: "Phone Call" },
                { type: "whatsapp", label: "WhatsApp" },
                { type: "meeting", label: "Meeting" },
                { type: "note", label: "Note" },
              ].map((t) => (
                <button
                  key={t.type}
                  type="button"
                  onClick={() => setActivityType(t.type)}
                  className={`py-2 px-3 rounded-xl border text-xs font-bold capitalize transition-colors cursor-pointer ${
                    activityType === t.type
                      ? "bg-app-accent text-app-base border-app-accent"
                      : "bg-app-base text-app-mist border-app-line hover:text-hi"
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-app-mist font-bold uppercase mb-1">Discussion Summary *</label>
            <textarea
              required
              rows={3}
              value={summary}
              onChange={(e) => setSummary(e.target.value)}
              placeholder="e.g. Spoke with client about quarterly brand campaign; they requested follow-up in 3 days."
              className="w-full bg-app-base border border-app-line rounded-xl p-3 text-hi focus:outline-none focus:border-app-accent"
            />
          </div>

          <div>
            <label className="block text-app-mist font-bold uppercase mb-1">Outcome / Agreed Next Step</label>
            <input
              type="text"
              value={outcome}
              onChange={(e) => setOutcome(e.target.value)}
              placeholder="e.g. Send updated pricing deck and proposal"
              className="w-full bg-app-base border border-app-line rounded-xl px-3 py-2 text-hi focus:outline-none focus:border-app-accent"
            />
          </div>

          <div>
            <label className="block text-app-mist font-bold uppercase mb-1">Schedule Next Follow-Up Date & Time</label>
            <input
              type="datetime-local"
              value={followUpDate}
              onChange={(e) => setFollowUpDate(e.target.value)}
              className="w-full bg-app-base border border-app-line rounded-xl px-3 py-2 text-hi focus:outline-none focus:border-app-accent"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-app-line">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-full border border-app-line text-app-mist hover:text-hi cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !summary.trim()}
              className="px-5 py-2 rounded-full bg-app-accent-soft text-app-base font-bold hover:bg-hi disabled:opacity-50 cursor-pointer"
            >
              {isSubmitting ? "Saving..." : "Save Activity"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Add Lead Modal ────────────────────────────────────────────────────────────

function AddLeadModal({
  initialStatus = "new",
  onClose,
  onSuccess,
}: {
  initialStatus?: LeadStatus;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [formData, setFormData] = useState<CreateLeadPayload>({
    name: "",
    company_name: "",
    email: "",
    phone: "",
    requirements: "",
    estimated_deal_value: 0,
    lead_source: "Inbound Website",
    priority: "warm",
    status: initialStatus,
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.company_name.trim()) {
      setErrorMessage("Please provide both Contact Name and Company / Brand.");
      return;
    }

    try {
      setIsSubmitting(true);
      setErrorMessage(null);

      // Auto-normalize phone: prepend +91 for 10-digit Indian numbers if no prefix provided
      let phone = (formData.phone || "").trim();
      if (phone && !phone.startsWith("+")) {
        const cleanDigits = phone.replace(/\D/g, "");
        if (cleanDigits.length === 10) {
          phone = `+91${cleanDigits}`;
        } else if (cleanDigits.length > 0) {
          phone = `+${cleanDigits}`;
        }
      }

      await createLead({
        ...formData,
        name: formData.name.trim(),
        company_name: formData.company_name.trim(),
        email: (formData.email || "").trim() || undefined,
        phone: phone || undefined,
        requirements: (formData.requirements || "").trim() || undefined,
        estimated_deal_value: Number(formData.estimated_deal_value) || 0,
      });

      onSuccess();
    } catch (err: any) {
      console.error("Failed to create prospect:", err);
      const msg =
        err?.message ||
        err?.details?.detail ||
        (typeof err?.response?.data?.detail === "string" ? err.response.data.detail : null) ||
        "Could not create prospect. Please check your connection or inputs.";
      setErrorMessage(typeof msg === "string" ? msg : JSON.stringify(msg));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
      <div className="bg-app-surface border border-app-line rounded-3xl w-full max-w-lg p-6 space-y-4 shadow-2xl relative max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between border-b border-app-line pb-3">
          <div>
            <h3 className="text-base font-bold text-hi">Add Prospective Client</h3>
            <p className="text-xs text-app-mist">Create new lead record</p>
          </div>
          <button type="button" onClick={onClose} className="text-app-mist hover:text-hi cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        {errorMessage && (
          <div className="bg-rose-500/10 border border-rose-500/30 rounded-xl p-3 text-xs text-rose-300 flex items-start justify-between gap-2">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
              <span>{errorMessage}</span>
            </div>
            <button
              type="button"
              onClick={() => setErrorMessage(null)}
              className="text-rose-400 hover:text-hi cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-3.5 text-xs">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-app-mist font-bold uppercase mb-1">Contact Name *</label>
              <input
                required
                type="text"
                value={formData.name}
                onChange={(e) => {
                  setFormData({ ...formData, name: e.target.value });
                  if (errorMessage) setErrorMessage(null);
                }}
                placeholder="e.g. Rahul Sharma"
                className="w-full bg-app-base border border-app-line rounded-xl px-3 py-2 text-hi focus:outline-none focus:border-app-accent"
              />
            </div>
            <div>
              <label className="block text-app-mist font-bold uppercase mb-1">Company / Brand *</label>
              <input
                required
                type="text"
                value={formData.company_name}
                onChange={(e) => {
                  setFormData({ ...formData, company_name: e.target.value });
                  if (errorMessage) setErrorMessage(null);
                }}
                placeholder="e.g. Acme Retail"
                className="w-full bg-app-base border border-app-line rounded-xl px-3 py-2 text-hi focus:outline-none focus:border-app-accent"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-app-mist font-bold uppercase mb-1">Phone / WhatsApp</label>
              <input
                type="text"
                value={formData.phone}
                onChange={(e) => {
                  setFormData({ ...formData, phone: e.target.value });
                  if (errorMessage) setErrorMessage(null);
                }}
                placeholder="+91 98765 43210 (or 10 digits)"
                className="w-full bg-app-base border border-app-line rounded-xl px-3 py-2 text-hi focus:outline-none focus:border-app-accent"
              />
            </div>
            <div>
              <label className="block text-app-mist font-bold uppercase mb-1">Email Address</label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => {
                  setFormData({ ...formData, email: e.target.value });
                  if (errorMessage) setErrorMessage(null);
                }}
                placeholder="contact@acme.com"
                className="w-full bg-app-base border border-app-line rounded-xl px-3 py-2 text-hi focus:outline-none focus:border-app-accent"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-app-mist font-bold uppercase mb-1">Queue Stage</label>
              <CustomSelect
                value={formData.status || "contacted"}
                onChange={(val) => setFormData({ ...formData, status: val as any })}
                ariaLabel="Select Queue Stage"
                className="w-full !rounded-xl !bg-app-base !border-app-line"
                options={[
                  { value: "contacted", label: "Contacted" },
                  { value: "meeting_scheduled", label: "Interested" },
                  { value: "negotiation", label: "In Negotiation" },
                  { value: "converted", label: "Won" },
                  { value: "lost", label: "Lost" },
                ]}
              />
            </div>
            <div>
              <label className="block text-app-mist font-bold uppercase mb-1">Priority</label>
              <CustomSelect
                value={formData.priority || "warm"}
                onChange={(val) => setFormData({ ...formData, priority: val as any })}
                ariaLabel="Select Priority"
                className="w-full !rounded-xl !bg-app-base !border-app-line"
                options={[
                  { value: "hot", label: "🔥 Hot Lead" },
                  { value: "warm", label: "☀️ Warm Lead" },
                  { value: "cold", label: "❄️ Cold Lead" },
                ]}
              />
            </div>
            <div>
              <label className="block text-app-mist font-bold uppercase mb-1">Estimated Value (₹)</label>
              <input
                type="number"
                min="0"
                step="5000"
                value={formData.estimated_deal_value || ""}
                onChange={(e) => setFormData({ ...formData, estimated_deal_value: Number(e.target.value) || 0 })}
                placeholder="0"
                className="w-full bg-app-base border border-app-line rounded-xl px-3 py-2 text-hi focus:outline-none focus:border-app-accent"
              />
            </div>
          </div>

          <div>
            <label className="block text-app-mist font-bold uppercase mb-1">Requirements & Brief</label>
            <textarea
              rows={3}
              value={formData.requirements}
              onChange={(e) => setFormData({ ...formData, requirements: e.target.value })}
              placeholder="e.g. 15 Instagram Reels per month + brand identity refresh."
              className="w-full bg-app-base border border-app-line rounded-xl p-3 text-hi focus:outline-none focus:border-app-accent"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-app-line">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-full border border-app-line text-app-mist hover:text-hi cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !formData.name.trim() || !formData.company_name.trim()}
              className="px-5 py-2 rounded-full bg-app-accent-soft text-app-base font-bold hover:bg-hi disabled:opacity-50 cursor-pointer transition-all"
            >
              {isSubmitting ? "Creating..." : "Create Prospect"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
