import { useState } from "react";
import { useSearchParams } from "react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence, type Variants } from "motion/react";
import {
  Plus,
  Search,
  Filter,
  MessageSquare,
  Calendar as CalendarIcon,
  CalendarCheck,
  Clock,
  TrendingUp,
  AlertCircle,
  CheckCircle2,
  Check,
  Sparkles,
  X,
  FileText,
  CreditCard,
  XCircle,
  Phone,
  Send,
  ChevronRight,
} from "lucide-react";
import {
  fetchLeads,
  fetchBDECalendar,
  fetchBDEAnalytics,
  generateProposal,
  createLead,
  updateLead,
  logLeadActivity,
  Lead,
  LeadStatus,
  CreateLeadPayload,
} from "../../lib/bde-api";
import { AdminTopHeader } from "../../components/admin/AdminTopHeader";
import { CurvedSelect, type CurvedSelectOption } from "../../components/ui/CurvedSelect";


type TabKey = "pipeline" | "calendar" | "analytics";

const PRIORITY_OPTIONS: CurvedSelectOption[] = [
  { value: "all", label: "All Priorities" },
  { value: "hot", label: "Hot Priority", color: "bg-rose-400" },
  { value: "warm", label: "Warm Priority", color: "bg-amber-400" },
  { value: "cold", label: "Cold Priority", color: "bg-sky-400" },
];

const STAGE_SELECT_OPTIONS: CurvedSelectOption[] = [
  { value: "new", label: "Prospecting", color: "bg-sky-400" },
  { value: "contacted", label: "Contacted", color: "bg-blue-400" },
  { value: "meeting_scheduled", label: "Meeting Scheduled", color: "bg-indigo-400" },
  { value: "proposal_sent", label: "Proposal Sent", color: "bg-amber-400" },
  { value: "negotiation", label: "Negotiation", color: "bg-purple-400" },
  { value: "converted", label: "Closed Won", color: "bg-emerald-400" },
  { value: "lost", label: "Lost", color: "bg-rose-400" },
];

const FILTER_STAGE_OPTIONS: CurvedSelectOption[] = [
  { value: "all", label: "All Stages" },
  ...STAGE_SELECT_OPTIONS,
];

interface KanbanStageConfig {
  key: string;
  label: string;
  statuses: LeadStatus[];
  color: string;
  badgeBg: string;
}

const KANBAN_STAGES: KanbanStageConfig[] = [
  {
    key: "prospecting",
    label: "Prospecting",
    statuses: ["new"],
    color: "text-sky-400",
    badgeBg: "bg-sky-500/10 text-sky-300 border-sky-500/20",
  },
  {
    key: "contacted",
    label: "Contacted & Pitch",
    statuses: ["contacted", "meeting_scheduled"],
    color: "text-indigo-400",
    badgeBg: "bg-indigo-500/10 text-indigo-300 border-indigo-500/20",
  },
  {
    key: "proposal",
    label: "Proposal & Terms",
    statuses: ["proposal_sent", "negotiation"],
    color: "text-purple-400",
    badgeBg: "bg-purple-500/10 text-purple-300 border-purple-500/20",
  },
  {
    key: "converted",
    label: "Closed Won",
    statuses: ["converted"],
    color: "text-emerald-400",
    badgeBg: "bg-emerald-500/10 text-emerald-300 border-emerald-500/20",
  },
];


function calculateLeadScore(lead: Lead): { score: number; label: "HOT" | "WARM" | "COLD"; badgeClass: string } {
  let score = 20;
  if (lead.priority === "hot") score += 30;
  else if (lead.priority === "warm") score += 15;
  else score += 5;

  if (lead.estimated_deal_value >= 150000) score += 25;
  else if (lead.estimated_deal_value >= 75000) score += 15;
  else if (lead.estimated_deal_value > 0) score += 10;

  if (lead.status === "negotiation") score += 20;
  else if (lead.status === "proposal_sent") score += 15;
  else if (lead.status === "meeting_scheduled") score += 10;
  else if (lead.status === "contacted") score += 5;

  const count = lead.activity_count || lead.activities?.length || 0;
  if (count >= 3) score += 15;
  else if (count >= 1) score += 8;

  score = Math.min(99, Math.max(15, score));
  if (score >= 70) {
    return { score, label: "HOT", badgeClass: "text-rose-400 bg-rose-500/10 border-rose-500/30" };
  }
  if (score >= 45) {
    return { score, label: "WARM", badgeClass: "text-amber-400 bg-amber-500/10 border-amber-500/30" };
  }
  return { score, label: "COLD", badgeClass: "text-sky-400 bg-sky-500/10 border-sky-500/30" };
}

// ── Motion Animation Tokens & Variants ───────────────────────────────────────
const containerVariants: Variants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.06, delayChildren: 0.02 },
  },
};

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 14 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.3, ease: "easeOut" },
  },
};

const btnTap = {
  whileHover: { scale: 1.03 },
  whileTap: { scale: 0.95 },
};

const iconTap = {
  whileHover: { scale: 1.15 },
  whileTap: { scale: 0.9 },
};

export function BDEDashboardPage() {
  const queryClient = useQueryClient();
  const [searchParams] = useSearchParams();
  const rawTab = searchParams.get("tab") as TabKey | null;
  const activeTab: TabKey =
    rawTab && ["pipeline", "calendar", "analytics"].includes(rawTab)
      ? rawTab
      : "pipeline";

  // View state
  const [viewMode, setViewMode] = useState<"kanban" | "table">("kanban");
  const [priorityFilter, setPriorityFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");

  // Modals & Drawers
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [activeActivityLead, setActiveActivityLead] = useState<Lead | null>(null);
  const [viewDetailLead, setViewDetailLead] = useState<Lead | null>(null);
  const [proposalLead, setProposalLead] = useState<Lead | null>(null);
  const [isScheduleModalOpen, setIsScheduleModalOpen] = useState(false);
  const [scheduleModalLead, setScheduleModalLead] = useState<Lead | null>(null);
  const [schedulePreset, setSchedulePreset] = useState<"today" | "tomorrow" | "upcoming">("tomorrow");

  // Queries
  const leadsQuery = useQuery({
    queryKey: ["bde-leads", priorityFilter, statusFilter, searchQuery],
    queryFn: () =>
      fetchLeads({
        priority: priorityFilter,
        status: statusFilter,
        search: searchQuery,
      }),
  });


  const calendarQuery = useQuery({
    queryKey: ["bde-calendar"],
    queryFn: fetchBDECalendar,
  });

  const analyticsQuery = useQuery({
    queryKey: ["bde-analytics"],
    queryFn: fetchBDEAnalytics,
  });


  // Mutations
  const updateLeadMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: any }) => updateLead(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["bde-leads"] });
      queryClient.invalidateQueries({ queryKey: ["bde-calendar"] });
      queryClient.invalidateQueries({ queryKey: ["bde-analytics"] });
    },
  });

  const leads = leadsQuery.data || [];
  const calendarData = calendarQuery.data;
  const analytics = analyticsQuery.data;

  // WhatsApp click-to-chat
  const openWhatsApp = (lead: Lead) => {
    if (!lead.phone) return;
    const cleanPhone = lead.phone.replace(/[^0-9]/g, "");
    const greeting = encodeURIComponent(
      `Hello ${lead.name}, this is Creo Creative Studio reaching out regarding your inquiry for ${lead.company_name}. How can we assist you with your content and creative design requirements?`
    );
    window.open(`https://wa.me/${cleanPhone}?text=${greeting}`, "_blank");
  };

  // Quick schedule follow-up
  const quickSchedule = async (lead: Lead, days: number) => {
    const target = new Date();
    target.setDate(target.getDate() + days);
    target.setHours(11, 0, 0, 0);

    await logLeadActivity(lead.id, {
      activity_type: "call",
      summary: `Automated follow-up scheduled for +${days} day(s)`,
      scheduled_follow_up: target.toISOString(),
    });

    queryClient.invalidateQueries({ queryKey: ["bde-leads"] });
    queryClient.invalidateQueries({ queryKey: ["bde-calendar"] });
    queryClient.invalidateQueries({ queryKey: ["bde-metrics"] });
    queryClient.invalidateQueries({ queryKey: ["bde-analytics"] });
  };

  // Mark follow-up as completed
  const markFollowUpDone = async (leadId: string) => {
    const lead = leads.find((l) => l.id === leadId);
    if (!lead) return;

    await logLeadActivity(lead.id, {
      activity_type: "call",
      summary: "Follow-up completed & touchpoint logged.",
      outcome: "Follow-up Completed",
    });

    await updateLeadMutation.mutateAsync({
      id: lead.id,
      payload: { next_follow_up_at: null },
    });

    queryClient.invalidateQueries({ queryKey: ["bde-leads"] });
    queryClient.invalidateQueries({ queryKey: ["bde-calendar"] });
    queryClient.invalidateQueries({ queryKey: ["bde-metrics"] });
  };

  // Quick advance stage
  const advanceStage = (lead: Lead) => {
    const stageOrder: LeadStatus[] = [
      "new",
      "contacted",
      "meeting_scheduled",
      "proposal_sent",
      "negotiation",
      "converted",
    ];
    const currentIndex = stageOrder.indexOf(lead.status);
    if (currentIndex >= 0 && currentIndex < stageOrder.length - 1) {
      const nextStage = stageOrder[currentIndex + 1];
      updateLeadMutation.mutate({ id: lead.id, payload: { status: nextStage } });
    }
  };

  return (
    <div data-surface="ops" className="w-full min-h-screen font-sans bg-[#0B111C] flex flex-col">
      <AdminTopHeader activeTab="BDE Outreach" hideTitle />
      <motion.main
        variants={containerVariants}
        initial="hidden"
        animate="show"
        className="flex-1 px-3.5 sm:px-6 lg:px-8 py-4 sm:py-6 max-w-[1650px] w-full mx-auto space-y-6"
      >

      {/* ── TAB 1: Visual Sales Funnel & Pipeline ─────────────────────────────────── */}
      {activeTab === "pipeline" && (
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="show"
          className="space-y-4"
        >
          {/* Controls: Search, Priority & Kanban/Table Toggle */}
          <motion.div
            variants={itemVariants}
            className="bg-[#161F2D]/80 border border-[#2A3446] hover:border-[#7FA0D6]/40 rounded-xl px-4 py-2.5 shadow-sm transition-all flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3"
          >
            <div className="relative flex-1 max-w-sm">
              <Search className="w-4 h-4 text-[#97A0B3] absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search prospects..."
                className="w-full bg-[#0B111C] border border-[#2A3446] focus:border-[#7FA0D6] rounded-lg pl-9 pr-3 py-1.5 text-xs text-white placeholder:text-[#97A0B3]/60 focus:outline-none transition-colors"
              />
            </div>

            <div className="flex items-center gap-2.5 flex-wrap">
              <div className="flex items-center gap-1.5 text-xs text-[#97A0B3]">
                <Filter className="w-3.5 h-3.5 text-[#7FA0D6]" />
                <CurvedSelect
                  value={priorityFilter}
                  onChange={setPriorityFilter}
                  options={PRIORITY_OPTIONS}
                  triggerClassName="min-w-[130px]"
                />
              </div>

              {/* Stage Filter for Table View */}
              {viewMode === "table" && (
                <div className="flex items-center gap-1.5 text-xs text-[#97A0B3]">
                  <span>Stage:</span>
                  <CurvedSelect
                    value={statusFilter}
                    onChange={setStatusFilter}
                    options={FILTER_STAGE_OPTIONS}
                    triggerClassName="min-w-[145px]"
                  />
                </div>
              )}

              {/* View Toggle */}
              <div className="bg-[#0B111C] border border-[#2A3446] rounded-lg p-0.5 flex items-center">
                <motion.button
                  type="button"
                  {...btnTap}
                  onClick={() => setViewMode("kanban")}
                  className={`px-3 py-1 rounded-md text-xs font-bold transition-all cursor-pointer ${
                    viewMode === "kanban"
                      ? "bg-[#7FA0D6] text-[#0B111C] shadow-sm"
                      : "text-[#97A0B3] hover:text-white"
                  }`}
                >
                  Kanban
                </motion.button>
                <motion.button
                  type="button"
                  {...btnTap}
                  onClick={() => setViewMode("table")}
                  className={`px-3 py-1 rounded-md text-xs font-bold transition-all cursor-pointer ${
                    viewMode === "table"
                      ? "bg-[#7FA0D6] text-[#0B111C] shadow-sm"
                      : "text-[#97A0B3] hover:text-white"
                  }`}
                >
                  CRM Table
                </motion.button>
              </div>

              {/* Add Prospect Action */}
              <motion.button
                type="button"
                whileHover={{ scale: 1.04, boxShadow: "0 0 20px rgba(127, 160, 214, 0.4)" }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setIsAddModalOpen(true)}
                className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-gradient-to-r from-[#BCCCE6] to-white text-[#0B111C] text-xs font-black shadow-md cursor-pointer ml-1"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>New Prospect</span>
              </motion.button>
            </div>
          </motion.div>

          {/* Kanban Visual Sales Funnel View */}
          {viewMode === "kanban" ? (
            <motion.div
              variants={containerVariants}
              initial="hidden"
              animate="show"
              className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 pb-4 pt-1"
            >
              {KANBAN_STAGES.map((stage) => {
                const stageLeads = leads.filter((l) => stage.statuses.includes(l.status));
                const stageTotalVal = stageLeads.reduce((acc, l) => acc + (l.estimated_deal_value || 0), 0);

                return (
                  <motion.div
                    key={stage.key}
                    variants={itemVariants}
                    className="bg-[#161F2D]/60 border border-[#2A3446] hover:border-[#7FA0D6]/50 rounded-2xl p-4 flex flex-col min-h-[580px] shadow-sm hover:shadow-[0_0_20px_rgba(127,160,214,0.15)] transition-all"
                  >
                    {/* Stage Header */}
                    <div className="flex items-center justify-between border-b border-[#2A3446]/60 pb-2.5 mb-3">
                      <div>
                        <span className={`text-xs font-bold uppercase tracking-wider ${stage.color}`}>
                          {stage.label}
                        </span>
                        <div className="text-[10px] text-[#97A0B3] font-mono mt-0.5">
                          ₹{(stageTotalVal / 1000).toLocaleString()}k
                        </div>
                      </div>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${stage.badgeBg}`}>
                        {stageLeads.length}
                      </span>
                    </div>

                    {/* Cards Container */}
                    <div className="space-y-2.5 flex-1 overflow-y-auto max-h-[680px] pr-1 flex flex-col">
                      {stageLeads.length === 0 ? (
                        <div className="flex-1 flex flex-col items-center justify-center p-6 text-center border border-dashed border-[#2A3446]/40 rounded-xl">
                          <span className="text-xs text-[#97A0B3]/50">No prospects</span>
                          <button
                            type="button"
                            onClick={() => setIsAddModalOpen(true)}
                            className="mt-2 text-[11px] font-bold text-[#7FA0D6] hover:text-white flex items-center gap-1 opacity-60 hover:opacity-100 transition-opacity cursor-pointer"
                          >
                            <Plus className="w-3 h-3" />
                            <span>Add Lead</span>
                          </button>
                        </div>
                      ) : (
                        stageLeads.map((lead) => {
                          const scoreInfo = calculateLeadScore(lead);
                          return (
                            <motion.div
                              key={lead.id}
                              variants={itemVariants}
                              whileHover={{
                                y: -3,
                                scale: 1.015,
                                boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.5), 0 0 15px rgba(127, 160, 214, 0.25)",
                              }}
                              transition={{ duration: 0.2 }}
                              className="bg-[#0B111C] border border-[#2A3446] hover:border-[#7FA0D6] rounded-xl p-3 space-y-2.5 transition-all shadow-sm hover:shadow-md group relative"
                            >
                              {/* Top row: Priority & Score Badge */}
                              <div className="flex items-center justify-between gap-1">
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  <span
                                    className={`text-[9px] font-extrabold uppercase px-2 py-0.5 rounded-full border ${scoreInfo.badgeClass}`}
                                  >
                                    Score: {scoreInfo.score} ({scoreInfo.label})
                                  </span>
                                  {lead.status === "meeting_scheduled" && (
                                    <span className="text-[9px] font-semibold text-indigo-300 bg-indigo-500/10 px-1.5 py-0.2 rounded border border-indigo-500/20">
                                      Meeting
                                    </span>
                                  )}
                                  {lead.status === "negotiation" && (
                                    <span className="text-[9px] font-semibold text-purple-300 bg-purple-500/10 px-1.5 py-0.2 rounded border border-purple-500/20">
                                      Negotiating
                                    </span>
                                  )}
                                </div>
                                <span className="text-[10px] text-[#97A0B3] font-mono">
                                  ₹{(lead.estimated_deal_value / 1000).toLocaleString()}k
                                </span>
                              </div>

                              {/* Lead Info */}
                              <div>
                                <h4
                                  onClick={() => setViewDetailLead(lead)}
                                  className="text-xs font-bold text-white group-hover:text-[#7FA0D6] transition-colors cursor-pointer"
                                >
                                  {lead.company_name}
                                </h4>
                                <p className="text-[11px] text-[#97A0B3]">{lead.name}</p>
                              </div>

                              {/* Follow up status badge */}
                              {lead.next_follow_up_at && (
                                <div className="text-[10px] text-amber-300/90 flex items-center gap-1 font-mono">
                                  <Clock className="w-3 h-3 text-amber-400" />
                                  <span>{new Date(lead.next_follow_up_at).toLocaleDateString()}</span>
                                </div>
                              )}

                              {/* Quick Actions Row */}
                              <div className="flex items-center justify-between pt-1 border-t border-[#2A3446]/60">
                                <div className="flex items-center gap-1">
                                  {lead.phone && (
                                    <motion.button
                                      type="button"
                                      {...iconTap}
                                      onClick={() => openWhatsApp(lead)}
                                      title="WhatsApp prospect"
                                      className="p-1 rounded-lg bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 transition-colors cursor-pointer"
                                    >
                                      <MessageSquare className="w-3 h-3" />
                                    </motion.button>
                                  )}
                                  <motion.button
                                    type="button"
                                    {...iconTap}
                                    onClick={() => setActiveActivityLead(lead)}
                                    title="Log activity or call"
                                    className="p-1 rounded-lg bg-blue-500/10 text-blue-400 hover:bg-blue-500/20 transition-colors cursor-pointer"
                                  >
                                    <Phone className="w-3 h-3" />
                                  </motion.button>
                                  <motion.button
                                    type="button"
                                    {...iconTap}
                                    onClick={() => {
                                      setScheduleModalLead(lead);
                                      setSchedulePreset("tomorrow");
                                      setIsScheduleModalOpen(true);
                                    }}
                                    title="Schedule follow-up"
                                    className="p-1 rounded-lg bg-amber-500/10 text-amber-400 hover:bg-amber-500/20 transition-colors cursor-pointer"
                                  >
                                    <Clock className="w-3 h-3" />
                                  </motion.button>
                                  <motion.button
                                    type="button"
                                    {...iconTap}
                                    onClick={() => setProposalLead(lead)}
                                    title="Generate Proposal"
                                    className="p-1 rounded-lg bg-purple-500/10 text-purple-300 hover:bg-purple-500/20 transition-colors cursor-pointer"
                                  >
                                    <FileText className="w-3 h-3" />
                                  </motion.button>
                                </div>

                                {/* Advance stage button */}
                                {lead.status !== "converted" && lead.status !== "lost" && (
                                  <motion.button
                                    type="button"
                                    {...btnTap}
                                    onClick={() => advanceStage(lead)}
                                    title="Advance to next funnel stage"
                                    className="px-2 py-0.5 rounded-lg bg-[#7FA0D6]/20 border border-[#7FA0D6]/40 text-[#BCCCE6] hover:bg-[#7FA0D6]/30 hover:text-white transition-colors text-[10px] font-bold flex items-center gap-0.5 cursor-pointer"
                                  >
                                    <span>Advance</span>
                                    <ChevronRight className="w-3 h-3" />
                                  </motion.button>
                                )}
                              </div>
                            </motion.div>
                          );
                        })
                      )}
                    </div>
                  </motion.div>
                );
              })}
            </motion.div>
          ) : (
            /* Tabular List CRM View */
            <motion.div
              variants={itemVariants}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
              className="bg-[#161F2D] border-2 border-[#7FA0D6] rounded-2xl shadow-[0_0_20px_rgba(127,160,214,0.22)] hover:shadow-[0_0_30px_rgba(127,160,214,0.35)] transition-all duration-300 overflow-hidden"
            >
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-[#2A3446] bg-[#0B111C]/60 text-[#97A0B3] text-[11px] uppercase tracking-wider font-bold">
                      <th className="py-3 px-4">Lead / Company</th>
                      <th className="py-3 px-4">Contact Info</th>
                      <th className="py-3 px-4">Lead Score</th>
                      <th className="py-3 px-4">Estimated Value</th>
                      <th className="py-3 px-4">Funnel Stage</th>
                      <th className="py-3 px-4">Next Follow-Up</th>
                      <th className="py-3 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#2A3446]/60 text-xs">
                    {leads.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="text-center py-8 text-[#97A0B3]">
                          No prospects match the filter criteria.
                        </td>
                      </tr>
                    ) : (
                      leads.map((lead) => {
                        const scoreInfo = calculateLeadScore(lead);
                        return (
                          <motion.tr
                            key={lead.id}
                            whileHover={{ backgroundColor: "rgba(127, 160, 214, 0.05)" }}
                            className="hover:bg-[#0B111C]/40 transition-colors"
                          >
                            <td className="py-3 px-4">
                              <div
                                onClick={() => setViewDetailLead(lead)}
                                className="font-bold text-white hover:text-[#7FA0D6] cursor-pointer"
                              >
                                {lead.company_name}
                              </div>
                              <div className="text-[11px] text-[#97A0B3]">{lead.name}</div>
                            </td>
                            <td className="py-3 px-4 space-y-0.5">
                              {lead.phone && <div className="text-white font-mono text-[11px]">{lead.phone}</div>}
                              {lead.email && <div className="text-[#97A0B3] text-[11px]">{lead.email}</div>}
                            </td>
                            <td className="py-3 px-4">
                              <span
                                className={`text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full border ${scoreInfo.badgeClass}`}
                              >
                                {scoreInfo.score} · {scoreInfo.label}
                              </span>
                            </td>
                            <td className="py-3 px-4 font-mono font-bold text-white">
                              ₹{lead.estimated_deal_value.toLocaleString()}
                            </td>
                            <td className="py-3 px-4">
                              <CurvedSelect
                                value={lead.status}
                                onChange={(nextStatus) =>
                                  updateLeadMutation.mutate({
                                    id: lead.id,
                                    payload: { status: nextStatus },
                                  })
                                }
                                options={STAGE_SELECT_OPTIONS}
                                triggerClassName="min-w-[155px]"
                              />
                            </td>
                            <td className="py-3 px-4">
                              {lead.next_follow_up_at ? (
                                <div className="flex items-center gap-1.5">
                                  <span className="text-[11px] font-mono text-amber-300">
                                    {new Date(lead.next_follow_up_at).toLocaleDateString()}
                                  </span>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setScheduleModalLead(lead);
                                      setIsScheduleModalOpen(true);
                                    }}
                                    className="text-[10px] text-[#7FA0D6] hover:underline cursor-pointer font-semibold"
                                  >
                                    Edit
                                  </button>
                                </div>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => {
                                    setScheduleModalLead(lead);
                                    setIsScheduleModalOpen(true);
                                  }}
                                  className="text-[11px] text-[#7FA0D6] hover:underline flex items-center gap-1 cursor-pointer font-bold"
                                >
                                  <Plus className="w-3 h-3" /> Set Follow-Up
                                </button>
                              )}
                            </td>
                            <td className="py-3 px-4 text-right">
                              <div className="flex items-center justify-end gap-1.5">
                                {lead.phone && (
                                  <motion.button
                                    type="button"
                                    {...iconTap}
                                    onClick={() => openWhatsApp(lead)}
                                    className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 cursor-pointer"
                                    title="WhatsApp chat"
                                  >
                                    <MessageSquare className="w-3.5 h-3.5" />
                                  </motion.button>
                                )}
                                <motion.button
                                  type="button"
                                  {...btnTap}
                                  onClick={() => quickSchedule(lead, 3)}
                                  className="px-2 py-1 rounded-lg bg-[#0B111C] border border-[#2A3446] text-[#BCCCE6] text-[11px] font-semibold hover:text-white cursor-pointer"
                                  title="Schedule +3d follow up"
                                >
                                  +3d
                                </motion.button>
                                <motion.button
                                  type="button"
                                  {...btnTap}
                                  onClick={() => setActiveActivityLead(lead)}
                                  className="px-2.5 py-1 rounded-lg bg-[#7FA0D6]/20 border border-[#7FA0D6]/40 text-[#BCCCE6] text-[11px] font-bold hover:bg-[#7FA0D6]/30 cursor-pointer"
                                >
                                  Log Call
                                </motion.button>
                                <motion.button
                                  type="button"
                                  {...btnTap}
                                  onClick={() => setProposalLead(lead)}
                                  className="px-2.5 py-1 rounded-lg bg-purple-500/20 border border-purple-500/40 text-purple-200 text-[11px] font-bold hover:bg-purple-500/30 cursor-pointer"
                                >
                                  Quote
                                </motion.button>
                              </div>
                            </td>
                          </motion.tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </motion.div>
          )}
        </motion.div>
      )}

      {/* ── TAB 2: Task & Follow-up Agenda ───────────────────────────────────────── */}
      {activeTab === "calendar" && (
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="show"
          className="space-y-6"
        >
          {/* Header Bar */}
          <div className="flex flex-wrap items-center justify-between gap-4 p-5 rounded-2xl bg-[#161F2D] border-2 border-[#7FA0D6] shadow-[0_0_20px_rgba(127,160,214,0.18)]">
            <div>
              <h2 className="text-base font-black text-white flex items-center gap-2">
                <CalendarCheck className="w-5 h-5 text-[#7FA0D6]" />
                Follow-Up Agenda & Call Dispatch
              </h2>
              <p className="text-xs text-[#97A0B3] mt-0.5">
                Assign and dispatch scheduled phone or WhatsApp follow-up calls with prospective leads.
              </p>
            </div>
            <div className="flex items-center gap-2.5">
              <motion.button
                type="button"
                whileHover={{ scale: 1.04, boxShadow: "0 0 20px rgba(127, 160, 214, 0.4)" }}
                whileTap={{ scale: 0.95 }}
                onClick={() => {
                  setScheduleModalLead(null);
                  setSchedulePreset("tomorrow");
                  setIsScheduleModalOpen(true);
                }}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-[#BCCCE6] to-white text-[#0B111C] text-xs font-black shadow-md cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Schedule Follow-Up</span>
              </motion.button>
            </div>
          </div>

          {/* 3 Follow-Up Columns: Overdue, Today, Upcoming */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Overdue Calls */}
            <motion.div
              variants={itemVariants}
              whileHover={{ y: -4, boxShadow: "0 18px 35px -10px rgba(0, 0, 0, 0.6), 0 0 25px rgba(127, 160, 214, 0.35)" }}
              transition={{ duration: 0.2 }}
              className="bg-[#161F2D] border-2 border-[#7FA0D6] rounded-2xl p-5 sm:p-6 shadow-[0_0_20px_rgba(127,160,214,0.22)] hover:shadow-[0_0_30px_rgba(127,160,214,0.35)] space-y-4 transition-all duration-300"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-rose-400 flex items-center gap-1.5">
                  <AlertCircle className="w-4 h-4" />
                  Overdue Follow-ups ({calendarData?.overdue.length || 0})
                </span>
              </div>
              <div className="space-y-3">
                {calendarData?.overdue.length === 0 ? (
                  <div className="space-y-2 text-center py-6 px-4 rounded-xl border border-dashed border-emerald-500/20 bg-emerald-950/10">
                    <CheckCircle2 className="w-7 h-7 text-emerald-400 mx-auto" />
                    <p className="text-xs font-bold text-emerald-300">No overdue calls!</p>
                    <p className="text-[11px] text-[#97A0B3]">You're completely caught up on prospect calls.</p>
                  </div>
                ) : (
                  calendarData?.overdue.map((item) => (
                    <motion.div
                      key={item.id}
                      whileHover={{ x: 4, scale: 1.01 }}
                      transition={{ duration: 0.15 }}
                      className="bg-[#0B111C] border border-[#7FA0D6]/60 hover:border-[#7FA0D6] rounded-xl p-3.5 space-y-2.5 transition-all shadow-sm hover:shadow-[0_0_15px_rgba(127,160,214,0.25)]"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-white">{item.lead.name}</span>
                        <span className="text-[10px] font-bold uppercase px-1.5 py-0.5 rounded bg-rose-500/20 text-rose-300 border border-rose-500/30">
                          Overdue
                        </span>
                      </div>
                      <p className="text-[11px] text-[#97A0B3]">{item.lead.company}</p>
                      <div className="text-[11px] font-mono text-rose-300">
                        {item.scheduled_time ? new Date(item.scheduled_time).toLocaleString() : ""}
                      </div>
                      <div className="flex items-center justify-between pt-2 border-t border-[#2A3446]/60">
                        <div className="flex items-center gap-1.5">
                          {item.lead.phone && (
                            <button
                              type="button"
                              onClick={() => openWhatsApp(item.lead as any)}
                              className="text-[11px] font-bold text-emerald-400 hover:underline flex items-center gap-1 cursor-pointer"
                            >
                              <MessageSquare className="w-3 h-3" /> WhatsApp
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => {
                              const found = leads.find((l) => l.id === item.lead.id);
                              if (found) setActiveActivityLead(found);
                            }}
                            className="text-[11px] font-bold text-[#7FA0D6] hover:underline flex items-center gap-1 cursor-pointer ml-1"
                          >
                            <Phone className="w-3 h-3" /> Log Outcome
                          </button>
                        </div>
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => {
                              const found = leads.find((l) => l.id === item.lead.id);
                              if (found) quickSchedule(found, 1);
                            }}
                            title="Reschedule +1 day"
                            className="px-2 py-0.5 rounded bg-[#161F2D] border border-[#2A3446] hover:border-[#7FA0D6] text-[10px] text-white font-bold cursor-pointer"
                          >
                            +1d
                          </button>
                          <button
                            type="button"
                            onClick={() => markFollowUpDone(item.lead.id)}
                            title="Mark Completed"
                            className="p-1 rounded bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 text-[10px] cursor-pointer"
                          >
                            <Check className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    </motion.div>
                  ))
                )}
              </div>
            </motion.div>

            {/* Today's Follow-ups */}
            <motion.div
              variants={itemVariants}
              whileHover={{ y: -4, boxShadow: "0 18px 35px -10px rgba(0, 0, 0, 0.6), 0 0 25px rgba(127, 160, 214, 0.35)" }}
              transition={{ duration: 0.2 }}
              className="bg-[#161F2D] border-2 border-[#7FA0D6] rounded-2xl p-5 sm:p-6 shadow-[0_0_20px_rgba(127,160,214,0.22)] hover:shadow-[0_0_30px_rgba(127,160,214,0.35)] space-y-4 transition-all duration-300"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
                  <Clock className="w-4 h-4" />
                  Scheduled Today ({calendarData?.today.length || 0})
                </span>
              </div>
              <div className="space-y-3">
                {calendarData?.today.length === 0 ? (
                  <div className="space-y-3 text-center py-6 px-4 rounded-xl border border-dashed border-[#2A3446] bg-[#0B111C]/40">
                    <Clock className="w-7 h-7 text-amber-400/60 mx-auto" />
                    <p className="text-xs text-[#97A0B3]">No follow-ups remaining on schedule today.</p>
                    <motion.button
                      type="button"
                      whileHover={{ scale: 1.03 }}
                      whileTap={{ scale: 0.96 }}
                      onClick={() => {
                        setScheduleModalLead(null);
                        setSchedulePreset("today");
                        setIsScheduleModalOpen(true);
                      }}
                      className="px-3.5 py-1.5 rounded-xl bg-amber-500/20 border border-amber-500/40 text-amber-300 text-xs font-bold hover:bg-amber-500/30 transition-all cursor-pointer inline-flex items-center gap-1.5 mx-auto"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Schedule for Today</span>
                    </motion.button>
                  </div>
                ) : (
                  calendarData?.today.map((item) => (
                    <motion.div
                      key={item.id}
                      whileHover={{ x: 4, scale: 1.01 }}
                      transition={{ duration: 0.15 }}
                      className="bg-[#0B111C] border border-[#7FA0D6]/60 hover:border-[#7FA0D6] rounded-xl p-3.5 space-y-2.5 transition-all shadow-sm hover:shadow-[0_0_15px_rgba(127,160,214,0.25)]"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-white">{item.lead.name}</span>
                        <span className="text-[10px] font-bold uppercase px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
                          Today
                        </span>
                      </div>
                      <p className="text-[11px] text-[#97A0B3]">{item.lead.company}</p>
                      <div className="text-[11px] font-mono text-amber-300">
                        {item.scheduled_time ? new Date(item.scheduled_time).toLocaleTimeString() : ""}
                      </div>
                      <div className="flex items-center justify-between pt-2 border-t border-[#2A3446]/60">
                        <div className="flex items-center gap-1.5">
                          {item.lead.phone && (
                            <button
                              type="button"
                              onClick={() => openWhatsApp(item.lead as any)}
                              className="text-[11px] font-bold text-emerald-400 hover:underline flex items-center gap-1 cursor-pointer"
                            >
                              <MessageSquare className="w-3 h-3" /> WhatsApp
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => {
                              const found = leads.find((l) => l.id === item.lead.id);
                              if (found) setActiveActivityLead(found);
                            }}
                            className="text-[11px] font-bold text-[#7FA0D6] hover:underline flex items-center gap-1 cursor-pointer ml-1"
                          >
                            <Phone className="w-3 h-3" /> Log Outcome
                          </button>
                        </div>
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => {
                              const found = leads.find((l) => l.id === item.lead.id);
                              if (found) quickSchedule(found, 1);
                            }}
                            title="Reschedule +1 day"
                            className="px-2 py-0.5 rounded bg-[#161F2D] border border-[#2A3446] hover:border-[#7FA0D6] text-[10px] text-white font-bold cursor-pointer"
                          >
                            +1d
                          </button>
                          <button
                            type="button"
                            onClick={() => markFollowUpDone(item.lead.id)}
                            title="Mark Completed"
                            className="p-1 rounded bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 text-[10px] cursor-pointer"
                          >
                            <Check className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    </motion.div>
                  ))
                )}
              </div>
            </motion.div>

            {/* Upcoming Schedule */}
            <motion.div
              variants={itemVariants}
              whileHover={{ y: -4, boxShadow: "0 18px 35px -10px rgba(0, 0, 0, 0.6), 0 0 25px rgba(127, 160, 214, 0.35)" }}
              transition={{ duration: 0.2 }}
              className="bg-[#161F2D] border-2 border-[#7FA0D6] rounded-2xl p-5 sm:p-6 shadow-[0_0_20px_rgba(127,160,214,0.22)] hover:shadow-[0_0_30px_rgba(127,160,214,0.35)] space-y-4 transition-all duration-300"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-[#7FA0D6] flex items-center gap-1.5">
                  <CalendarIcon className="w-4 h-4" />
                  Upcoming Follow-ups ({calendarData?.upcoming.length || 0})
                </span>
              </div>
              <div className="space-y-3">
                {calendarData?.upcoming.length === 0 ? (
                  <div className="space-y-3 text-center py-6 px-4 rounded-xl border border-dashed border-[#2A3446] bg-[#0B111C]/40">
                    <CalendarIcon className="w-7 h-7 text-[#7FA0D6]/60 mx-auto" />
                    <p className="text-xs text-[#97A0B3]">No upcoming calls scheduled.</p>
                    <motion.button
                      type="button"
                      whileHover={{ scale: 1.03 }}
                      whileTap={{ scale: 0.96 }}
                      onClick={() => {
                        setScheduleModalLead(null);
                        setSchedulePreset("tomorrow");
                        setIsScheduleModalOpen(true);
                      }}
                      className="px-3.5 py-1.5 rounded-xl bg-[#7FA0D6]/20 border border-[#7FA0D6]/40 text-[#7FA0D6] text-xs font-bold hover:bg-[#7FA0D6]/30 transition-all cursor-pointer inline-flex items-center gap-1.5 mx-auto"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Schedule Follow-Up</span>
                    </motion.button>
                  </div>
                ) : (
                  calendarData?.upcoming.map((item) => (
                    <motion.div
                      key={item.id}
                      whileHover={{ x: 4, scale: 1.01 }}
                      transition={{ duration: 0.15 }}
                      className="bg-[#0B111C] border border-[#7FA0D6]/60 hover:border-[#7FA0D6] rounded-xl p-3.5 space-y-2.5 transition-all shadow-sm hover:shadow-[0_0_15px_rgba(127,160,214,0.25)]"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-white">{item.lead.name}</span>
                        <span className="text-[10px] font-bold uppercase px-1.5 py-0.5 rounded bg-[#7FA0D6]/20 text-[#7FA0D6] border border-[#7FA0D6]/30">
                          {item.lead.priority}
                        </span>
                      </div>
                      <p className="text-[11px] text-[#97A0B3]">{item.lead.company}</p>
                      <div className="text-[11px] font-mono text-[#BCCCE6]">
                        {item.scheduled_time ? new Date(item.scheduled_time).toLocaleDateString() : ""}
                      </div>
                      <div className="flex items-center justify-between pt-2 border-t border-[#2A3446]/60">
                        <div className="flex items-center gap-1.5">
                          {item.lead.phone && (
                            <button
                              type="button"
                              onClick={() => openWhatsApp(item.lead as any)}
                              className="text-[11px] font-bold text-emerald-400 hover:underline flex items-center gap-1 cursor-pointer"
                            >
                              <MessageSquare className="w-3 h-3" /> WhatsApp
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => {
                              const found = leads.find((l) => l.id === item.lead.id);
                              if (found) setActiveActivityLead(found);
                            }}
                            className="text-[11px] font-bold text-[#7FA0D6] hover:underline flex items-center gap-1 cursor-pointer ml-1"
                          >
                            <Phone className="w-3 h-3" /> Log Outcome
                          </button>
                        </div>
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => {
                              const found = leads.find((l) => l.id === item.lead.id);
                              if (found) quickSchedule(found, 3);
                            }}
                            title="Reschedule +3 days"
                            className="px-2 py-0.5 rounded bg-[#161F2D] border border-[#2A3446] hover:border-[#7FA0D6] text-[10px] text-white font-bold cursor-pointer"
                          >
                            +3d
                          </button>
                          <button
                            type="button"
                            onClick={() => markFollowUpDone(item.lead.id)}
                            title="Mark Completed"
                            className="p-1 rounded bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 text-[10px] cursor-pointer"
                          >
                            <Check className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    </motion.div>
                  ))
                )}
              </div>
            </motion.div>
          </div>

          {/* Direct Pipeline Quick Follow-Up Assign Section */}
          <div className="bg-[#161F2D] border-2 border-[#7FA0D6] rounded-2xl p-5 sm:p-6 shadow-[0_0_20px_rgba(127,160,214,0.18)] space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <h3 className="text-sm font-black text-white flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-[#7FA0D6]" />
                  Assign Next Follow-Up to Active Pipeline Prospects
                </h3>
                <p className="text-xs text-[#97A0B3] mt-0.5">
                  1-click options to schedule call reminders or touchpoints for qualified leads.
                </p>
              </div>
              <span className="text-xs font-mono text-[#97A0B3]">
                {leads.filter((l) => l.status !== "converted" && l.status !== "lost").length} Active Prospects
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-[#2A3446] text-[#97A0B3] uppercase text-[10px] font-bold tracking-wider">
                    <th className="py-2.5 px-3">Prospect & Company</th>
                    <th className="py-2.5 px-3">Stage</th>
                    <th className="py-2.5 px-3">Deal Value</th>
                    <th className="py-2.5 px-3">Current Follow-Up</th>
                    <th className="py-2.5 px-3 text-right">Quick Assign Options</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#2A3446]/60 font-medium">
                  {leads.filter((l) => l.status !== "converted" && l.status !== "lost").length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-8 text-center text-[#97A0B3]">
                        No active prospects found in pipeline. Click "New Prospect" to add one!
                      </td>
                    </tr>
                  ) : (
                    leads
                      .filter((l) => l.status !== "converted" && l.status !== "lost")
                      .map((lead) => (
                        <tr key={lead.id} className="hover:bg-[#0B111C]/60 transition-colors">
                          <td className="py-3 px-3">
                            <div className="font-bold text-white text-xs">{lead.company_name}</div>
                            <div className="text-[11px] text-[#97A0B3]">{lead.name} {lead.phone ? `· ${lead.phone}` : ""}</div>
                          </td>
                          <td className="py-3 px-3">
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-blue-500/15 text-[#7FA0D6] border border-[#7FA0D6]/30">
                              {lead.status.replace("_", " ")}
                            </span>
                          </td>
                          <td className="py-3 px-3 font-mono text-white text-xs">
                            ₹{(lead.estimated_deal_value / 1000).toLocaleString()}k
                          </td>
                          <td className="py-3 px-3">
                            {lead.next_follow_up_at ? (
                              <div className="flex items-center gap-1.5 text-amber-300 font-mono text-[11px]">
                                <Clock className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                                <span>{new Date(lead.next_follow_up_at).toLocaleDateString()}</span>
                              </div>
                            ) : (
                              <span className="text-[11px] text-[#97A0B3] italic">No follow-up set</span>
                            )}
                          </td>
                          <td className="py-3 px-3 text-right">
                            <div className="flex items-center justify-end gap-1.5 flex-wrap">
                              <motion.button
                                type="button"
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.95 }}
                                onClick={() => quickSchedule(lead, 1)}
                                className="px-2.5 py-1 rounded-lg bg-[#0B111C] border border-[#7FA0D6]/50 hover:border-[#7FA0D6] text-white hover:text-[#7FA0D6] text-[11px] font-bold cursor-pointer transition-colors"
                                title="Schedule for tomorrow 11 AM"
                              >
                                + Tomorrow (11 AM)
                              </motion.button>
                              <motion.button
                                type="button"
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.95 }}
                                onClick={() => quickSchedule(lead, 3)}
                                className="px-2.5 py-1 rounded-lg bg-[#0B111C] border border-[#2A3446] hover:border-[#7FA0D6] text-[#BCCCE6] hover:text-white text-[11px] font-bold cursor-pointer transition-colors"
                                title="Schedule for +3 days"
                              >
                                + In 3 Days
                              </motion.button>
                              <motion.button
                                type="button"
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.95 }}
                                onClick={() => {
                                  setScheduleModalLead(lead);
                                  setIsScheduleModalOpen(true);
                                }}
                                className="px-2.5 py-1 rounded-lg bg-[#7FA0D6]/20 border border-[#7FA0D6]/50 text-[#7FA0D6] hover:bg-[#7FA0D6] hover:text-[#0B111C] text-[11px] font-bold cursor-pointer transition-all"
                              >
                                Custom Date...
                              </motion.button>
                              <motion.button
                                type="button"
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.95 }}
                                onClick={() => setActiveActivityLead(lead)}
                                className="p-1.5 rounded-lg bg-blue-500/10 text-blue-400 hover:bg-blue-500/20 cursor-pointer"
                                title="Log Call Outcome & Notes"
                              >
                                <Phone className="w-3.5 h-3.5" />
                              </motion.button>
                            </div>
                          </td>
                        </tr>
                      ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </motion.div>
      )}




      {/* ── TAB 5: Sales Forecasting & Win/Loss Analysis ─────────────────────────── */}
      {activeTab === "analytics" && (
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="show"
          className="space-y-6"
        >
          {/* Forecasting Breakdown: Best / Expected / Worst */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <motion.div
              variants={itemVariants}
              whileHover={{
                y: -5,
                scale: 1.02,
                boxShadow: "0 15px 30px -10px rgba(16, 185, 129, 0.2)",
              }}
              transition={{ duration: 0.2 }}
              className="bg-[#161F2D] border border-emerald-500/40 rounded-2xl p-5 shadow-xl space-y-2"
            >
              <span className="text-xs font-bold uppercase tracking-wider text-emerald-400">
                Best-Case Scenario
              </span>
              <div className="text-3xl font-extrabold text-white font-mono">
                ₹{((analytics?.forecasting.best_case || 0) / 1000).toLocaleString()}k
              </div>
              <p className="text-xs text-[#97A0B3]">
                Assumes 100% of qualified deals currently in negotiation and proposal sent convert.
              </p>
            </motion.div>

            <motion.div
              variants={itemVariants}
              whileHover={{
                y: -5,
                scale: 1.02,
                boxShadow: "0 20px 35px -10px rgba(127, 160, 214, 0.25)",
              }}
              transition={{ duration: 0.2 }}
              className="bg-[#161F2D] border-2 border-[#7FA0D6] rounded-2xl p-5 shadow-xl space-y-2"
            >
              <span className="text-xs font-bold uppercase tracking-wider text-[#7FA0D6]">
                Expected Forecast (Weighted)
              </span>
              <div className="text-3xl font-extrabold text-white font-mono">
                ₹{((analytics?.forecasting.expected || 0) / 1000).toLocaleString()}k
              </div>
              <p className="text-xs text-[#97A0B3]">
                Calculated dynamically via stage closing probabilities (10% to 80%).
              </p>
            </motion.div>

            <motion.div
              variants={itemVariants}
              whileHover={{
                y: -5,
                scale: 1.02,
                boxShadow: "0 15px 30px -10px rgba(245, 158, 11, 0.2)",
              }}
              transition={{ duration: 0.2 }}
              className="bg-[#161F2D] border border-amber-500/40 rounded-2xl p-5 shadow-xl space-y-2"
            >
              <span className="text-xs font-bold uppercase tracking-wider text-amber-400">
                Worst-Case Scenario
              </span>
              <div className="text-3xl font-extrabold text-white font-mono">
                ₹{((analytics?.forecasting.worst_case || 0) / 1000).toLocaleString()}k
              </div>
              <p className="text-xs text-[#97A0B3]">
                Baseline closed revenue plus 75% of final stage negotiations only.
              </p>
            </motion.div>
          </div>

          {/* Win / Loss Reasons Analytical Breakdown */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Win/Loss Stats */}
            <motion.div
              variants={itemVariants}
              className="bg-[#161F2D] border border-[#2A3446] rounded-2xl p-6 shadow-xl space-y-4"
            >
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-[#7FA0D6]" />
                Win / Loss Insights & Strategy
              </h3>
              <div className="grid grid-cols-2 gap-4">
                <motion.div
                  whileHover={{ scale: 1.02 }}
                  className="bg-[#0B111C] border border-emerald-500/30 rounded-xl p-4"
                >
                  <div className="text-xs text-emerald-400 font-bold uppercase">Deals Won</div>
                  <div className="text-2xl font-extrabold text-white font-mono mt-1">
                    {analytics?.win_loss_analysis.won_count || 0}
                  </div>
                  <div className="text-[11px] text-[#97A0B3] mt-1">
                    Win Rate: {analytics?.win_loss_analysis.win_rate || 0}%
                  </div>
                </motion.div>

                <motion.div
                  whileHover={{ scale: 1.02 }}
                  className="bg-[#0B111C] border border-rose-500/30 rounded-xl p-4"
                >
                  <div className="text-xs text-rose-400 font-bold uppercase">Deals Lost</div>
                  <div className="text-2xl font-extrabold text-white font-mono mt-1">
                    {analytics?.win_loss_analysis.lost_count || 0}
                  </div>
                  <div className="text-[11px] text-[#97A0B3] mt-1">
                    Loss Rate: {analytics?.win_loss_analysis.loss_rate || 0}%
                  </div>
                </motion.div>
              </div>

              {/* Stage Closing Probability Matrix */}
              <div className="border-t border-[#2A3446] pt-4">
                <h4 className="text-xs font-bold uppercase tracking-wider text-[#97A0B3] mb-3">
                  Funnel Stage Closing Probabilities
                </h4>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
                  {Object.entries(analytics?.forecasting.stage_probabilities || {
                    new: 0.1,
                    contacted: 0.25,
                    meeting_scheduled: 0.4,
                    proposal_sent: 0.6,
                    negotiation: 0.8,
                    converted: 1.0,
                  }).map(([stg, prob]) => (
                    <motion.div
                      key={stg}
                      whileHover={{ scale: 1.05, backgroundColor: "rgba(127, 160, 214, 0.1)" }}
                      transition={{ duration: 0.15 }}
                      className="bg-[#0B111C] border border-[#2A3446] rounded-lg p-2.5 transition-colors"
                    >
                      <span className="text-[#97A0B3] uppercase text-[10px] block font-bold">
                        {stg.replace("_", " ")}
                      </span>
                      <span className="text-white font-bold font-mono text-sm">
                        {Math.round((prob as number) * 100)}%
                      </span>
                    </motion.div>
                  ))}
                </div>
              </div>
            </motion.div>

            {/* Why Deals Are Lost */}
            <motion.div
              variants={itemVariants}
              className="bg-[#161F2D] border border-[#2A3446] rounded-2xl p-6 shadow-xl space-y-4"
            >
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <XCircle className="w-5 h-5 text-rose-400" />
                Loss Reasons Breakdown
              </h3>
              <p className="text-xs text-[#97A0B3]">
                Identified friction points from client debriefs to calibrate commercial strategy.
              </p>

              <div className="space-y-3 pt-2">
                {(analytics?.win_loss_analysis.loss_reasons || []).map((lr) => (
                  <div key={lr.reason} className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-white font-semibold">{lr.reason}</span>
                      <span className="text-[#97A0B3] font-mono">
                        {lr.count} ({lr.percentage}%)
                      </span>
                    </div>
                    <div className="w-full bg-[#0B111C] rounded-full h-2 overflow-hidden border border-[#2A3446]">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${Math.min(100, lr.percentage || 10)}%` }}
                        transition={{ duration: 0.8, ease: "easeOut" }}
                        className="bg-rose-500 h-2 rounded-full"
                      />
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          </div>
        </motion.div>
      )}

      {/* ── MODALS ───────────────────────────────────────────────────────────────── */}
      <AnimatePresence>
        {proposalLead && (
          <ProposalGeneratorModal
            lead={proposalLead}
            onClose={() => setProposalLead(null)}
            onSuccess={() => {
              queryClient.invalidateQueries({ queryKey: ["bde-leads"] });
              queryClient.invalidateQueries({ queryKey: ["bde-metrics"] });
              queryClient.invalidateQueries({ queryKey: ["bde-analytics"] });
              setProposalLead(null);
            }}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {activeActivityLead && (
          <ActivityModal
            lead={activeActivityLead}
            onClose={() => setActiveActivityLead(null)}
            onSuccess={() => {
              queryClient.invalidateQueries({ queryKey: ["bde-leads"] });
              queryClient.invalidateQueries({ queryKey: ["bde-calendar"] });
              queryClient.invalidateQueries({ queryKey: ["bde-metrics"] });
              queryClient.invalidateQueries({ queryKey: ["bde-analytics"] });
              setActiveActivityLead(null);
            }}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isScheduleModalOpen && (
          <ScheduleFollowUpModal
            initialLead={scheduleModalLead}
            leads={leads}
            defaultPreset={schedulePreset}
            onClose={() => {
              setIsScheduleModalOpen(false);
              setScheduleModalLead(null);
            }}
            onSuccess={() => {
              setIsScheduleModalOpen(false);
              setScheduleModalLead(null);
              queryClient.invalidateQueries({ queryKey: ["bde-leads"] });
              queryClient.invalidateQueries({ queryKey: ["bde-calendar"] });
              queryClient.invalidateQueries({ queryKey: ["bde-metrics"] });
              queryClient.invalidateQueries({ queryKey: ["bde-analytics"] });
            }}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isAddModalOpen && (
          <AddLeadModal
            onClose={() => setIsAddModalOpen(false)}
            onSuccess={() => {
              queryClient.invalidateQueries({ queryKey: ["bde-leads"] });
              queryClient.invalidateQueries({ queryKey: ["bde-metrics"] });
              queryClient.invalidateQueries({ queryKey: ["bde-calendar"] });
              queryClient.invalidateQueries({ queryKey: ["bde-analytics"] });
              setIsAddModalOpen(false);
            }}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {viewDetailLead && (
          <LeadDetailDrawer
            lead={viewDetailLead}
            onClose={() => setViewDetailLead(null)}
            onLogActivity={() => {
              setActiveActivityLead(viewDetailLead);
              setViewDetailLead(null);
            }}
            onGenerateQuote={() => {
              setProposalLead(viewDetailLead);
              setViewDetailLead(null);
            }}
          />
        )}
      </AnimatePresence>
    </motion.main>
    </div>
  );
}

// ── Proposal Generator Modal ──────────────────────────────────────────────────

function ProposalGeneratorModal({
  lead,
  onClose,
  onSuccess,
}: {
  lead: Lead;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [planName, setPlanName] = useState("Growth Retainer");
  const [monthlyFee, setMonthlyFee] = useState(85000);
  const [discountPct, setDiscountPct] = useState(10);
  const [reels, setReels] = useState(16);
  const [staticPosts, setStaticPosts] = useState(12);
  const [carousels, setCarousels] = useState(6);
  const [shootDays, setShootDays] = useState(2);
  const [notes, setNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const discountAmount = Math.round(monthlyFee * (discountPct / 100));
  const finalFee = monthlyFee - discountAmount;
  const ltv6Months = finalFee * 6;

  const discountTier =
    discountPct <= 10
      ? { label: "Direct Rep Discretion (Approved)", class: "text-emerald-400 bg-emerald-500/10 border-emerald-500/30" }
      : discountPct <= 15
      ? { label: "Senior BDE Sign-off Required", class: "text-amber-400 bg-amber-500/10 border-amber-500/30" }
      : { label: "Super Admin Escalation Required", class: "text-rose-400 bg-rose-500/10 border-rose-500/30" };

  const handlePlanSelect = (tier: string) => {
    setPlanName(tier);
    if (tier === "Starter Retainer") {
      setMonthlyFee(45000);
      setReels(8);
      setStaticPosts(8);
      setCarousels(2);
      setShootDays(1);
    } else if (tier === "Growth Retainer") {
      setMonthlyFee(85000);
      setReels(16);
      setStaticPosts(12);
      setCarousels(6);
      setShootDays(2);
    } else if (tier === "Scale Retainer") {
      setMonthlyFee(150000);
      setReels(30);
      setStaticPosts(20);
      setCarousels(10);
      setShootDays(4);
    }
  };

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setIsSubmitting(true);
      await generateProposal({
        lead_id: lead.id,
        plan_name: planName,
        monthly_fee: monthlyFee,
        discount_pct: discountPct,
        deliverables: {
          reels,
          static_posts: staticPosts,
          carousels,
          shoot_days: shootDays,
        },
        notes: notes.trim() || undefined,
      });
      onSuccess();
    } catch (err: any) {
      alert(err.message || "Failed to generate proposal.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
      className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md"
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.94, y: 16 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.94, y: 16 }}
        transition={{ type: "spring", damping: 25, stiffness: 350 }}
        onClick={(e) => e.stopPropagation()}
        className="bg-[#161F2D] border border-[#2A3446] rounded-3xl w-full max-w-2xl p-6 space-y-4 shadow-2xl relative max-h-[90vh] overflow-y-auto"
      >
        <div className="flex items-center justify-between border-b border-[#2A3446] pb-3">
          <div>
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <CreditCard className="w-5 h-5 text-[#7FA0D6]" />
              Generate Commercial Proposal & Quotation
            </h3>
            <p className="text-xs text-[#97A0B3]">
              {lead.name} · {lead.company_name}
            </p>
          </div>
          <button type="button" onClick={onClose} className="text-[#97A0B3] hover:text-white cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleGenerate} className="space-y-4 text-xs">
          {/* Quick Tier Select */}
          <div>
            <label className="block text-[#97A0B3] font-bold uppercase mb-1.5">Select Retainer Tier</label>
            <div className="grid grid-cols-3 gap-2">
              {["Starter Retainer", "Growth Retainer", "Scale Retainer"].map((tier) => (
                <motion.button
                  key={tier}
                  type="button"
                  {...btnTap}
                  onClick={() => handlePlanSelect(tier)}
                  className={`py-2 px-3 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                    planName === tier
                      ? "bg-[#7FA0D6] text-[#0B111C] border-[#7FA0D6]"
                      : "bg-[#0B111C] text-[#97A0B3] border-[#2A3446] hover:text-white"
                  }`}
                >
                  {tier}
                </motion.button>
              ))}
            </div>
          </div>

          {/* Pricing & Discount */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-[#97A0B3] font-bold uppercase mb-1">Base Monthly Fee (₹)</label>
              <input
                type="number"
                min="10000"
                step="5000"
                value={monthlyFee}
                onChange={(e) => setMonthlyFee(Number(e.target.value))}
                className="w-full bg-[#0B111C] border border-[#2A3446] rounded-xl px-3 py-2 text-white font-mono focus:outline-none focus:border-[#7FA0D6]"
              />
            </div>
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-[#97A0B3] font-bold uppercase">Discount ({discountPct}%)</label>
                <span className={`text-[10px] font-bold px-2 py-0.2 rounded-full border ${discountTier.class}`}>
                  {discountTier.label}
                </span>
              </div>
              <input
                type="range"
                min="0"
                max="30"
                step="1"
                value={discountPct}
                onChange={(e) => setDiscountPct(Number(e.target.value))}
                className="w-full accent-[#7FA0D6] cursor-pointer mt-2"
              />
            </div>
          </div>

          {/* Scope Deliverables */}
          <div className="border border-[#2A3446] rounded-xl p-3 bg-[#0B111C] space-y-3">
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#97A0B3] block">
              Monthly Deliverables Quota
            </span>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div>
                <label className="text-[10px] text-[#97A0B3] block mb-1">Reels</label>
                <input
                  type="number"
                  min="0"
                  value={reels}
                  onChange={(e) => setReels(Number(e.target.value))}
                  className="w-full bg-[#161F2D] border border-[#2A3446] rounded-lg px-2.5 py-1.5 text-white font-mono"
                />
              </div>
              <div>
                <label className="text-[10px] text-[#97A0B3] block mb-1">Static Posts</label>
                <input
                  type="number"
                  min="0"
                  value={staticPosts}
                  onChange={(e) => setStaticPosts(Number(e.target.value))}
                  className="w-full bg-[#161F2D] border border-[#2A3446] rounded-lg px-2.5 py-1.5 text-white font-mono"
                />
              </div>
              <div>
                <label className="text-[10px] text-[#97A0B3] block mb-1">Carousels</label>
                <input
                  type="number"
                  min="0"
                  value={carousels}
                  onChange={(e) => setCarousels(Number(e.target.value))}
                  className="w-full bg-[#161F2D] border border-[#2A3446] rounded-lg px-2.5 py-1.5 text-white font-mono"
                />
              </div>
              <div>
                <label className="text-[10px] text-[#97A0B3] block mb-1">Shoot Days</label>
                <input
                  type="number"
                  min="0"
                  value={shootDays}
                  onChange={(e) => setShootDays(Number(e.target.value))}
                  className="w-full bg-[#161F2D] border border-[#2A3446] rounded-lg px-2.5 py-1.5 text-white font-mono"
                />
              </div>
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-[#97A0B3] font-bold uppercase mb-1">Proposal Notes / Exclusions</label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Includes studio set rental; talent cast billed separately at cost."
              className="w-full bg-[#0B111C] border border-[#2A3446] rounded-xl p-2.5 text-white focus:outline-none focus:border-[#7FA0D6]"
            />
          </div>

          {/* Commercial Summary Banner */}
          <div className="bg-[#0B111C] border border-[#7FA0D6]/30 rounded-xl p-3.5 flex items-center justify-between">
            <div>
              <span className="text-[11px] text-[#97A0B3] block">Final Quotation</span>
              <span className="text-xl font-extrabold text-white font-mono">
                ₹{finalFee.toLocaleString()}
              </span>
              <span className="text-xs text-[#97A0B3]"> / month</span>
            </div>
            <div className="text-right">
              <span className="text-[11px] text-[#97A0B3] block">6-Month LTV</span>
              <span className="text-sm font-bold text-emerald-400 font-mono">
                ₹{ltv6Months.toLocaleString()}
              </span>
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#2A3446]">
            <motion.button
              type="button"
              {...btnTap}
              onClick={onClose}
              className="px-4 py-2 rounded-full border border-[#2A3446] text-[#97A0B3] hover:text-white cursor-pointer"
            >
              Cancel
            </motion.button>
            <motion.button
              type="submit"
              {...btnTap}
              disabled={isSubmitting}
              className="px-5 py-2 rounded-full bg-[#BCCCE6] text-[#0B111C] font-bold hover:bg-white disabled:opacity-50 cursor-pointer flex items-center gap-1.5 shadow-md shadow-[#7FA0D6]/15"
            >
              <Send className="w-3.5 h-3.5" />
              <span>{isSubmitting ? "Generating..." : "Dispatch Proposal & Move Stage"}</span>
            </motion.button>
          </div>
        </form>
      </motion.div>
    </motion.div>
  );
}

// ── Lead Detail Drawer & Client Logs ──────────────────────────────────────────

function LeadDetailDrawer({
  lead,
  onClose,
  onLogActivity,
  onGenerateQuote,
}: {
  lead: Lead;
  onClose: () => void;
  onLogActivity: () => void;
  onGenerateQuote: () => void;
}) {
  const scoreInfo = calculateLeadScore(lead);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
      className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md"
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.94, y: 16 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.94, y: 16 }}
        transition={{ type: "spring", damping: 25, stiffness: 350 }}
        onClick={(e) => e.stopPropagation()}
        className="bg-[#161F2D] border border-[#2A3446] rounded-3xl w-full max-w-2xl p-6 space-y-5 shadow-2xl relative max-h-[90vh] overflow-y-auto"
      >
        <div className="flex items-center justify-between border-b border-[#2A3446] pb-3">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full border ${scoreInfo.badgeClass}`}>
                Lead Score: {scoreInfo.score} ({scoreInfo.label})
              </span>
              <span className="text-xs uppercase font-bold text-[#7FA0D6]">{lead.status.replace("_", " ")}</span>
            </div>
            <h3 className="text-lg font-bold text-white">{lead.company_name}</h3>
            <p className="text-xs text-[#97A0B3]">Contact: {lead.name}</p>
          </div>
          <button type="button" onClick={onClose} className="text-[#97A0B3] hover:text-white cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Lead Summary Info */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
          <div className="bg-[#0B111C] border border-[#2A3446] rounded-xl p-3">
            <span className="text-[#97A0B3] block text-[10px] uppercase font-bold">Deal Value</span>
            <span className="text-white font-mono font-bold text-sm">
              ₹{lead.estimated_deal_value.toLocaleString()}
            </span>
          </div>
          <div className="bg-[#0B111C] border border-[#2A3446] rounded-xl p-3">
            <span className="text-[#97A0B3] block text-[10px] uppercase font-bold">Phone / WA</span>
            <span className="text-white font-mono text-xs">{lead.phone || "—"}</span>
          </div>
          <div className="bg-[#0B111C] border border-[#2A3446] rounded-xl p-3">
            <span className="text-[#97A0B3] block text-[10px] uppercase font-bold">Email</span>
            <span className="text-white text-xs truncate block">{lead.email || "—"}</span>
          </div>
          <div className="bg-[#0B111C] border border-[#2A3446] rounded-xl p-3">
            <span className="text-[#97A0B3] block text-[10px] uppercase font-bold">Source</span>
            <span className="text-white text-xs">{lead.lead_source}</span>
          </div>
        </div>

        {/* Requirements */}
        {lead.requirements && (
          <div className="bg-[#0B111C] border border-[#2A3446] rounded-xl p-3.5 space-y-1 text-xs">
            <span className="text-[#97A0B3] font-bold uppercase text-[10px] block">Client Brief & Scope</span>
            <p className="text-white leading-relaxed">{lead.requirements}</p>
          </div>
        )}

        {/* Client Interaction Logs */}
        <div className="space-y-3">
          <div className="flex items-center justify-between border-b border-[#2A3446] pb-2">
            <h4 className="text-xs font-bold uppercase tracking-wider text-white flex items-center gap-1.5">
              <MessageSquare className="w-4 h-4 text-[#7FA0D6]" />
              Centralized Client Communication Logs ({lead.activities?.length || 0})
            </h4>
            <div className="flex items-center gap-2">
              <motion.button
                type="button"
                {...btnTap}
                onClick={onLogActivity}
                className="px-2.5 py-1 rounded-lg bg-[#7FA0D6]/20 border border-[#7FA0D6]/40 text-[#BCCCE6] text-[11px] font-bold hover:bg-[#7FA0D6]/30 cursor-pointer"
              >
                + Log Interaction
              </motion.button>
              <motion.button
                type="button"
                {...btnTap}
                onClick={onGenerateQuote}
                className="px-2.5 py-1 rounded-lg bg-purple-500/20 border border-purple-500/40 text-purple-200 text-[11px] font-bold hover:bg-purple-500/30 cursor-pointer"
              >
                + Quote
              </motion.button>
            </div>
          </div>

          <div className="space-y-2.5 max-h-56 overflow-y-auto pr-1">
            {!lead.activities || lead.activities.length === 0 ? (
              <p className="text-xs text-[#97A0B3] py-4 text-center">No recorded interactions yet.</p>
            ) : (
              lead.activities.map((act) => (
                <div key={act.id} className="bg-[#0B111C] border border-[#2A3446] rounded-xl p-3 space-y-1 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-white uppercase text-[10px] px-1.5 py-0.2 rounded bg-[#161F2D] border border-[#2A3446]">
                      {act.activity_type}
                    </span>
                    <span className="text-[10px] text-[#97A0B3] font-mono">
                      {new Date(act.created_at).toLocaleString()}
                    </span>
                  </div>
                  <p className="text-white pt-1">{act.summary}</p>
                  {act.outcome && (
                    <div className="text-[11px] text-emerald-400 font-semibold">
                      Outcome: {act.outcome}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#2A3446]">
          <motion.button
            type="button"
            {...btnTap}
            onClick={onClose}
            className="px-4 py-2 rounded-full border border-[#2A3446] text-[#97A0B3] hover:text-white text-xs font-semibold cursor-pointer"
          >
            Close
          </motion.button>
        </div>
      </motion.div>
    </motion.div>
  );
}

// ── Schedule Follow-Up Modal ──────────────────────────────────────────────────

function ScheduleFollowUpModal({
  initialLead,
  leads,
  defaultPreset = "tomorrow",
  onClose,
  onSuccess,
}: {
  initialLead?: Lead | null;
  leads: Lead[];
  defaultPreset?: "today" | "tomorrow" | "upcoming";
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [selectedLeadId, setSelectedLeadId] = useState<string>(
    initialLead ? initialLead.id : leads[0]?.id || ""
  );
  const [activityType, setActivityType] = useState<
    "call" | "whatsapp" | "email" | "meeting" | "note" | "proposal" | "status_change"
  >("call");

  const pad = (n: number) => String(n).padStart(2, "0");
  const computeDateTimeForPreset = (preset: string) => {
    const d = new Date();
    if (preset === "today_2h") {
      d.setHours(d.getHours() + 2);
    } else if (preset === "today_5pm") {
      d.setHours(17, 0, 0, 0);
    } else if (preset === "tomorrow_11am") {
      d.setDate(d.getDate() + 1);
      d.setHours(11, 0, 0, 0);
    } else if (preset === "in_2d") {
      d.setDate(d.getDate() + 2);
      d.setHours(11, 0, 0, 0);
    } else if (preset === "in_3d") {
      d.setDate(d.getDate() + 3);
      d.setHours(11, 0, 0, 0);
    } else if (preset === "next_week") {
      d.setDate(d.getDate() + 7);
      d.setHours(11, 0, 0, 0);
    }
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  };

  const initialPresetKey =
    defaultPreset === "today" ? "today_5pm" : defaultPreset === "upcoming" ? "in_3d" : "tomorrow_11am";
  const [timingPreset, setTimingPreset] = useState<string>(initialPresetKey);
  const [customDateTime, setCustomDateTime] = useState<string>(() =>
    computeDateTimeForPreset(initialPresetKey)
  );
  const [summary, setSummary] = useState<string>(
    "Follow-up call to review requirements and proposal scope."
  );
  const [isSubmitting, setIsSubmitting] = useState(false);

  const selectedLead = leads.find((l) => l.id === selectedLeadId) || initialLead;

  const handlePresetSelect = (preset: string) => {
    setTimingPreset(preset);
    setCustomDateTime(computeDateTimeForPreset(preset));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedLead) return;
    setIsSubmitting(true);
    try {
      const scheduledIso = new Date(customDateTime).toISOString();
      await logLeadActivity(selectedLead.id, {
        activity_type: activityType,
        summary: summary.trim() || `Scheduled ${activityType} follow-up`,
        scheduled_follow_up: scheduledIso,
      });
      onSuccess();
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
      className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md"
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.94, y: 16 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.94, y: 16 }}
        transition={{ type: "spring", damping: 25, stiffness: 350 }}
        onClick={(e) => e.stopPropagation()}
        className="bg-[#161F2D] border-2 border-[#7FA0D6] rounded-3xl w-full max-w-lg p-6 space-y-4 shadow-[0_20px_50px_rgba(0,0,0,0.8),0_0_30px_rgba(127,160,214,0.25)] relative text-white"
      >
        <div className="flex items-center justify-between border-b border-[#2A3446] pb-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-[#7FA0D6]/20 text-[#7FA0D6] flex items-center justify-center font-bold">
              <CalendarCheck className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">Assign Follow-Up</h3>
              <p className="text-xs text-[#97A0B3]">Schedule next prospect interaction or call reminder</p>
            </div>
          </div>
          <button type="button" onClick={onClose} className="text-[#97A0B3] hover:text-white cursor-pointer p-1">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          {/* Lead Selector or Fixed Lead */}
          {initialLead ? (
            <div className="p-3 rounded-2xl bg-[#0B111C] border border-[#2A3446] flex items-center justify-between">
              <div>
                <span className="text-[10px] uppercase font-bold text-[#97A0B3]">Selected Prospect</span>
                <div className="text-sm font-bold text-white">{initialLead.company_name}</div>
                <div className="text-[11px] text-[#7FA0D6]">
                  {initialLead.name} {initialLead.phone ? `· ${initialLead.phone}` : ""}
                </div>
              </div>
              <span className="px-2.5 py-1 rounded-full text-[10px] font-bold uppercase bg-blue-500/20 text-[#7FA0D6] border border-[#7FA0D6]/30">
                {initialLead.status.replace("_", " ")}
              </span>
            </div>
          ) : (
            <div>
              <label className="block text-[#97A0B3] font-bold uppercase mb-1">Choose Lead / Prospect *</label>
              <select
                value={selectedLeadId}
                onChange={(e) => setSelectedLeadId(e.target.value)}
                required
                className="w-full bg-[#0B111C] border border-[#2A3446] focus:border-[#7FA0D6] rounded-xl px-3 py-2.5 text-white text-xs font-medium cursor-pointer"
              >
                {leads
                  .filter((l) => l.status !== "converted" && l.status !== "lost")
                  .map((l) => (
                    <option key={l.id} value={l.id} className="bg-[#161F2D] text-white">
                      {l.company_name} — {l.name} ({l.status.replace("_", " ")})
                    </option>
                  ))}
              </select>
            </div>
          )}

          {/* Follow-up Type */}
          <div>
            <label className="block text-[#97A0B3] font-bold uppercase mb-1.5">Interaction Type</label>
            <div className="grid grid-cols-4 gap-2">
              {([
                { type: "call", label: "Phone Call" },
                { type: "whatsapp", label: "WhatsApp" },
                { type: "meeting", label: "Meeting" },
                { type: "proposal", label: "Pitch / Deck" },
              ] as const).map((t) => (
                <button
                  key={t.type}
                  type="button"
                  onClick={() => setActivityType(t.type)}
                  className={`py-2 px-2.5 rounded-xl border text-xs font-bold capitalize transition-all cursor-pointer ${
                    activityType === t.type
                      ? "bg-[#7FA0D6] text-[#0B111C] border-[#7FA0D6] shadow-sm font-black"
                      : "bg-[#0B111C] text-[#97A0B3] border-[#2A3446] hover:text-white hover:border-[#7FA0D6]/60"
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          {/* Quick Timing Presets */}
          <div>
            <label className="block text-[#97A0B3] font-bold uppercase mb-1.5">Quick Schedule Presets</label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { key: "today_2h", label: "Today (+2h)" },
                { key: "today_5pm", label: "Today (5 PM)" },
                { key: "tomorrow_11am", label: "Tomorrow (11 AM)" },
                { key: "in_2d", label: "In 2 Days" },
                { key: "in_3d", label: "In 3 Days" },
                { key: "next_week", label: "Next Week (+7d)" },
              ].map((p) => (
                <button
                  key={p.key}
                  type="button"
                  onClick={() => handlePresetSelect(p.key)}
                  className={`py-1.5 px-2 rounded-lg border text-[11px] font-semibold transition-all cursor-pointer ${
                    timingPreset === p.key
                      ? "bg-[#7FA0D6]/20 border-[#7FA0D6] text-white font-bold"
                      : "bg-[#0B111C] border-[#2A3446] text-[#97A0B3] hover:text-white"
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          {/* Custom Date & Time Picker */}
          <div>
            <label className="block text-[#97A0B3] font-bold uppercase mb-1">Scheduled Date & Time *</label>
            <input
              type="datetime-local"
              required
              value={customDateTime}
              onChange={(e) => {
                setCustomDateTime(e.target.value);
                setTimingPreset("custom");
              }}
              className="w-full bg-[#0B111C] border border-[#2A3446] focus:border-[#7FA0D6] rounded-xl px-3 py-2 text-white font-mono text-xs focus:outline-none"
            />
          </div>

          {/* Discussion / Call Notes */}
          <div>
            <label className="block text-[#97A0B3] font-bold uppercase mb-1">Follow-up Notes / Objective</label>
            <textarea
              rows={2}
              value={summary}
              onChange={(e) => setSummary(e.target.value)}
              placeholder="e.g. Discuss revised quote, check founder availability for scope review..."
              className="w-full bg-[#0B111C] border border-[#2A3446] focus:border-[#7FA0D6] rounded-xl p-3 text-white text-xs resize-none focus:outline-none"
            />
          </div>

          {/* Action buttons */}
          <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#2A3446]">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl border border-[#2A3446] text-[#97A0B3] hover:text-white cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !selectedLead}
              className="px-5 py-2 rounded-xl bg-gradient-to-r from-[#BCCCE6] to-white text-[#0B111C] font-black hover:opacity-90 disabled:opacity-50 cursor-pointer shadow-md transition-all flex items-center gap-1.5"
            >
              <CalendarCheck className="w-3.5 h-3.5" />
              <span>{isSubmitting ? "Assigning..." : "Assign Follow-Up"}</span>
            </button>
          </div>
        </form>
      </motion.div>
    </motion.div>
  );
}

// ── Activity Modal ────────────────────────────────────────────────────────────

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
      await logLeadActivity(lead.id, {
        activity_type: activityType,
        summary: summary.trim(),
        outcome: outcome.trim() || undefined,
        scheduled_follow_up: followUpDate ? new Date(followUpDate).toISOString() : undefined,
      });
      onSuccess();
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
      className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md"
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.94, y: 16 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.94, y: 16 }}
        transition={{ type: "spring", damping: 25, stiffness: 350 }}
        onClick={(e) => e.stopPropagation()}
        className="bg-[#161F2D] border border-[#2A3446] rounded-3xl w-full max-w-lg p-6 space-y-4 shadow-2xl relative"
      >
        <div className="flex items-center justify-between border-b border-[#2A3446] pb-3">
          <div>
            <h3 className="text-base font-bold text-white">Log Communication & Follow-Up</h3>
            <p className="text-xs text-[#97A0B3]">
              {lead.name} · {lead.company_name}
            </p>
          </div>
          <button type="button" onClick={onClose} className="text-[#97A0B3] hover:text-white cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          <div>
            <label className="block text-[#97A0B3] font-bold uppercase mb-1">Interaction Type</label>
            <div className="grid grid-cols-4 gap-2">
              {[
                { type: "call", label: "Phone Call" },
                { type: "whatsapp", label: "WhatsApp" },
                { type: "meeting", label: "Meeting" },
                { type: "note", label: "Note" },
              ].map((t) => (
                <motion.button
                  key={t.type}
                  type="button"
                  {...btnTap}
                  onClick={() => setActivityType(t.type)}
                  className={`py-2 px-3 rounded-xl border text-xs font-bold capitalize transition-colors cursor-pointer ${
                    activityType === t.type
                      ? "bg-[#7FA0D6] text-[#0B111C] border-[#7FA0D6]"
                      : "bg-[#0B111C] text-[#97A0B3] border-[#2A3446] hover:text-white"
                  }`}
                >
                  {t.label}
                </motion.button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-[#97A0B3] font-bold uppercase mb-1">Discussion Summary *</label>
            <textarea
              required
              rows={3}
              value={summary}
              onChange={(e) => setSummary(e.target.value)}
              placeholder="e.g. Discussed Growth Retainer with brand founder; interested in 16 reels + 2 shoot days."
              className="w-full bg-[#0B111C] border border-[#2A3446] rounded-xl p-3 text-white focus:outline-none focus:border-[#7FA0D6]"
            />
          </div>

          <div>
            <label className="block text-[#97A0B3] font-bold uppercase mb-1">Outcome / Agreed Next Step</label>
            <input
              type="text"
              value={outcome}
              onChange={(e) => setOutcome(e.target.value)}
              placeholder="e.g. Dispatch formal proposal and pricing deck"
              className="w-full bg-[#0B111C] border border-[#2A3446] rounded-xl px-3 py-2 text-white focus:outline-none focus:border-[#7FA0D6]"
            />
          </div>

          <div>
            <label className="block text-[#97A0B3] font-bold uppercase mb-1">Schedule Next Follow-Up Date & Time</label>
            <input
              type="datetime-local"
              value={followUpDate}
              onChange={(e) => setFollowUpDate(e.target.value)}
              className="w-full bg-[#0B111C] border border-[#2A3446] rounded-xl px-3 py-2 text-white focus:outline-none focus:border-[#7FA0D6]"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#2A3446]">
            <motion.button
              type="button"
              {...btnTap}
              onClick={onClose}
              className="px-4 py-2 rounded-full border border-[#2A3446] text-[#97A0B3] hover:text-white cursor-pointer"
            >
              Cancel
            </motion.button>
            <motion.button
              type="submit"
              {...btnTap}
              disabled={isSubmitting || !summary.trim()}
              className="px-5 py-2 rounded-full bg-[#BCCCE6] text-[#0B111C] font-bold hover:bg-white disabled:opacity-50 cursor-pointer shadow-md shadow-[#7FA0D6]/15"
            >
              {isSubmitting ? "Saving..." : "Save Activity"}
            </motion.button>
          </div>
        </form>
      </motion.div>
    </motion.div>
  );
}

// ── Add Lead Modal ────────────────────────────────────────────────────────────

function AddLeadModal({ onClose, onSuccess }: { onClose: () => void; onSuccess: () => void }) {
  const [formData, setFormData] = useState<CreateLeadPayload>({
    name: "",
    company_name: "",
    email: "",
    phone: "",
    requirements: "",
    estimated_deal_value: 85000,
    lead_source: "Inbound Website",
    priority: "warm",
    status: "new",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.company_name.trim()) return;

    try {
      setIsSubmitting(true);
      await createLead(formData);
      onSuccess();
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
      className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md"
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.94, y: 16 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.94, y: 16 }}
        transition={{ type: "spring", damping: 25, stiffness: 350 }}
        onClick={(e) => e.stopPropagation()}
        className="bg-[#161F2D] border border-[#2A3446] rounded-3xl w-full max-w-lg p-6 space-y-4 shadow-2xl relative max-h-[90vh] overflow-y-auto"
      >
        <div className="flex items-center justify-between border-b border-[#2A3446] pb-3">
          <div>
            <h3 className="text-base font-bold text-white">Add Prospective Client</h3>
            <p className="text-xs text-[#97A0B3]">Create new lead record in centralized CRM</p>
          </div>
          <button type="button" onClick={onClose} className="text-[#97A0B3] hover:text-white cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3.5 text-xs">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[#97A0B3] font-bold uppercase mb-1">Contact Name *</label>
              <input
                required
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g. Rahul Sharma"
                className="w-full bg-[#0B111C] border border-[#2A3446] rounded-xl px-3 py-2 text-white focus:outline-none focus:border-[#7FA0D6]"
              />
            </div>
            <div>
              <label className="block text-[#97A0B3] font-bold uppercase mb-1">Company / Brand *</label>
              <input
                required
                type="text"
                value={formData.company_name}
                onChange={(e) => setFormData({ ...formData, company_name: e.target.value })}
                placeholder="e.g. Acme Retail"
                className="w-full bg-[#0B111C] border border-[#2A3446] rounded-xl px-3 py-2 text-white focus:outline-none focus:border-[#7FA0D6]"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[#97A0B3] font-bold uppercase mb-1">Phone / WhatsApp</label>
              <input
                type="text"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                placeholder="+91 98765 43210"
                className="w-full bg-[#0B111C] border border-[#2A3446] rounded-xl px-3 py-2 text-white focus:outline-none focus:border-[#7FA0D6]"
              />
            </div>
            <div>
              <label className="block text-[#97A0B3] font-bold uppercase mb-1">Email Address</label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="contact@acme.com"
                className="w-full bg-[#0B111C] border border-[#2A3446] rounded-xl px-3 py-2 text-white focus:outline-none focus:border-[#7FA0D6]"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[#97A0B3] font-bold uppercase mb-1">Priority</label>
              <select
                value={formData.priority}
                onChange={(e) => setFormData({ ...formData, priority: e.target.value as any })}
                className="w-full bg-[#0B111C] border border-[#2A3446] rounded-xl px-3 py-2 text-white focus:outline-none focus:border-[#7FA0D6]"
              >
                <option value="hot">🔥 Hot Lead</option>
                <option value="warm">☀️ Warm Lead</option>
                <option value="cold">❄️ Cold Lead</option>
              </select>
            </div>
            <div>
              <label className="block text-[#97A0B3] font-bold uppercase mb-1">Estimated Value (₹)</label>
              <input
                type="number"
                min="0"
                step="5000"
                value={formData.estimated_deal_value}
                onChange={(e) => setFormData({ ...formData, estimated_deal_value: Number(e.target.value) })}
                className="w-full bg-[#0B111C] border border-[#2A3446] rounded-xl px-3 py-2 text-white focus:outline-none focus:border-[#7FA0D6]"
              />
            </div>
          </div>

          <div>
            <label className="block text-[#97A0B3] font-bold uppercase mb-1">Requirements & Brief</label>
            <textarea
              rows={3}
              value={formData.requirements}
              onChange={(e) => setFormData({ ...formData, requirements: e.target.value })}
              placeholder="e.g. 16 Instagram Reels per month + 2 studio shoot days."
              className="w-full bg-[#0B111C] border border-[#2A3446] rounded-xl p-3 text-white focus:outline-none focus:border-[#7FA0D6]"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#2A3446]">
            <motion.button
              type="button"
              {...btnTap}
              onClick={onClose}
              className="px-4 py-2 rounded-full border border-[#2A3446] text-[#97A0B3] hover:text-white cursor-pointer"
            >
              Cancel
            </motion.button>
            <motion.button
              type="submit"
              {...btnTap}
              disabled={isSubmitting || !formData.name.trim()}
              className="px-5 py-2 rounded-full bg-[#BCCCE6] text-[#0B111C] font-bold hover:bg-white disabled:opacity-50 cursor-pointer shadow-md shadow-[#7FA0D6]/15"
            >
              {isSubmitting ? "Creating..." : "Create Prospect"}
            </motion.button>
          </div>
        </form>
      </motion.div>
    </motion.div>
  );
}
