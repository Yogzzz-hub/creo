import { CreoInlineLoader } from "../../components/ui/CreoLoader";
import { useState, useMemo } from "react";
import { createPortal } from "react-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router";
import {
  ChevronLeft,
  ChevronRight,
  Clock,
  Loader2,
  Video,
  Image as ImageIcon,
  CheckCircle2,
  ExternalLink,
  X,
  Layers,
  Sparkles,
  Film,
  MessageSquare,
} from "lucide-react";
import { request } from "../../lib/http";
import { useAuth } from "../../lib/auth-context";
import { SubscriptionLockedState } from "../../components/portal/SubscriptionLockedState";
import type { CreativeBlueprint, BlueprintHook } from "../../types/api";

type DeliverableType = "poster" | "reel" | "story" | "carousel" | "shoot_day";

interface CalendarEntry {
  id: string;
  deliverable_id?: string;
  title?: string;
  date: string;
  scheduled_at?: string;
  scheduled_time?: string;
  status: string;
  calendar_status?: string;
  is_locked?: boolean;
  slot_kind?: string;
  slot_strategy?: "anchor" | "flex" | "swapped";
  flex_deadline?: string | null;
  concept_status?: "concept_pending" | "concept_revision" | "concept_approved" | "approved" | "pending_approval" | "revision_requested";
  selected_hook?: BlueprintHook | null;
  blueprint?: CreativeBlueprint | null;
  story_description?: string;
  approval_type?: string;
  team_notes?: string;
  client_feedback?: string;
  raw_status?: string;
  file_url?: string;
  file_type?: string;
  thumbnail_url?: string;
  type?: DeliverableType;
  format_label?: string;
  topic?: string;
  caption?: string;
  permalink?: string;
  version?: number;
}

interface TypeConfig {
  label: string;
  icon: typeof Video;
  badgeBg: string;
  badgeText: string;
  border: string;
  softBg: string;
  pillBg: string;
}

const DEFAULT_TYPE_CONFIG: TypeConfig = {
  label: "Poster",
  icon: ImageIcon,
  badgeBg: "bg-[#7FA0D6]",
  badgeText: "text-white",
  border: "border-blue-500/30",
  softBg: "bg-blue-500/15 text-[#7FA0D6] hover:bg-blue-500/25 border border-blue-500/30",
  pillBg: "bg-blue-500/15 text-[#7FA0D6] border border-blue-500/30",
};

const TYPE_CONFIG: Record<string, TypeConfig> = {
  reel: {
    label: "Reel",
    icon: Film,
    badgeBg: "bg-purple-600",
    badgeText: "text-white",
    border: "border-purple-500/30",
    softBg: "bg-purple-500/15 text-purple-400 hover:bg-purple-500/25 border border-purple-500/30",
    pillBg: "bg-purple-500/15 text-purple-400 border border-purple-500/30",
  },
  poster: DEFAULT_TYPE_CONFIG,
  static_post: DEFAULT_TYPE_CONFIG,
  story: {
    label: "Story",
    icon: Sparkles,
    badgeBg: "bg-amber-600",
    badgeText: "text-white",
    border: "border-amber-500/30",
    softBg: "bg-amber-500/15 text-amber-400 hover:bg-amber-500/25 border border-amber-500/30",
    pillBg: "bg-amber-500/15 text-amber-400 border border-amber-500/30",
  },
  carousel: {
    label: "Carousel",
    icon: Layers,
    badgeBg: "bg-amber-600",
    badgeText: "text-white",
    border: "border-amber-500/30",
    softBg: "bg-amber-500/15 text-amber-400 hover:bg-amber-500/25 border border-amber-500/30",
    pillBg: "bg-amber-500/15 text-amber-400 border border-amber-500/30",
  },
};

function getTypeConfig(type?: string): TypeConfig {
  if (!type) return DEFAULT_TYPE_CONFIG;
  const key = type.toLowerCase();
  return TYPE_CONFIG[key] ?? DEFAULT_TYPE_CONFIG;
}


const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

export function PortalCalendarPage() {
  const { user } = useAuth();
  const today = new Date();
  const [currentYear, setCurrentYear] = useState(today.getFullYear());
  const [currentMonth, setCurrentMonth] = useState(today.getMonth());

  const [selectedDate, setSelectedDate] = useState<number | null>(null);
  const [previewEntry, setPreviewEntry] = useState<CalendarEntry | null>(null);
  const [selectedHookIndex, setSelectedHookIndex] = useState<number>(0);
  const [isConceptSubmitting, setIsConceptSubmitting] = useState<boolean>(false);
  const [conceptFeedback, setConceptFeedback] = useState<{ text: string; type: "success" | "error" } | null>(null);
  const [requestChangeOpen, setRequestChangeOpen] = useState(false);
  const [changeNotes, setChangeNotes] = useState("");
  const [isSubmittingChange, setIsSubmittingChange] = useState(false);
  const queryClient = useQueryClient();
  const [isRebalancing, setIsRebalancing] = useState(false);
  const [scheduleMessage, setScheduleMessage] = useState<string | null>(null);

  async function rebuildDraftSchedule() {
    setIsRebalancing(true);
    setScheduleMessage(null);
    try {
      await request("/api/v1/calendar/rebalance-month", { method: "POST" });
      await queryClient.invalidateQueries({ queryKey: ["calendar-entries"] });
      setScheduleMessage("Draft schedule updated for the current 30-day cycle. Approved content is preserved.");
    } catch (error) {
      setScheduleMessage(error instanceof Error ? error.message : "Could not update the draft schedule. Please retry.");
    } finally {
      setIsRebalancing(false);
    }
  }

  const { data: subData, isLoading: isSubLoading, error: subscriptionError, refetch: refetchSubscription } = useQuery({
    queryKey: ["client-subscription", user?.id],
    queryFn: () => request<any>("/api/v1/payments/subscription"),
    staleTime: 30_000,
    refetchOnMount: "always",
  });

  const isExpired =
    subData?.is_expired === true ||
    subData?.subscription?.status === "expired" ||
    subData?.subscription?.status === "canceled";

  const isStaffOrAdmin = user?.role && user.role !== "client";

  const isSubscribed =
    isStaffOrAdmin ||
    (!isExpired &&
      (subData?.is_active === true ||
        (!!subData?.subscription && ["active", "trialing"].includes(subData?.subscription?.status))));

  const { data: rawEntriesData, isLoading: isEntriesLoading, isError: isEntriesError, refetch: refetchEntries } = useQuery<CalendarEntry[]>({
    queryKey: ["calendar-entries", user?.id, currentYear, currentMonth],
    queryFn: async () => {
      const res = await request<CalendarEntry[]>("/api/v1/calendar/entries");
      return Array.isArray(res) ? res : [];
    },
    enabled: isSubscribed,
  });

  const entries: CalendarEntry[] = useMemo(() => {
    const list = rawEntriesData || [];
    return list.map((e) => {
      let resolvedType: DeliverableType = "poster";
      const rawType = (e.slot_kind || e.type || "").toLowerCase();
      const rawFile = (e.file_type || "").toLowerCase();

      if (rawType.includes("reel") || (!rawType && (rawFile.includes("video") || rawFile.includes("mp4")))) {
        resolvedType = "reel";
      } else if (rawType.includes("carousel")) {
        resolvedType = "carousel";
      } else if (rawType.includes("story")) {
        resolvedType = "story";
      } else {
        resolvedType = "poster";
      }

      // Friendly display title
      let displayTopic = e.topic || e.title || "";
      if (!displayTopic || displayTopic.toLowerCase().includes("deliverable v")) {
        displayTopic = `Brand ${resolvedType.toUpperCase()} · Scheduled Publication`;
      }

      return {
        ...e,
        type: resolvedType,
        format_label: TYPE_CONFIG[resolvedType]?.label || "Post",
        topic: displayTopic,
        scheduled_time: e.scheduled_at && !Number.isNaN(Date.parse(e.scheduled_at))
          ? new Date(e.scheduled_at).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })
          : e.scheduled_time || "Time pending",
      };
    });
  }, [rawEntriesData]);

  const navigateMonth = (direction: number) => {
    const totalMonths = currentYear * 12 + currentMonth + direction;
    const newYear = Math.floor(totalMonths / 12);
    const newMonth = ((totalMonths % 12) + 12) % 12;
    setCurrentMonth(newMonth);
    setCurrentYear(newYear);
  };

  const goToToday = () => {
    setCurrentYear(today.getFullYear());
    setCurrentMonth(today.getMonth());
  };

  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
  const firstDay = new Date(currentYear, currentMonth, 1).getDay();
  const isCurrentMonth = today.getFullYear() === currentYear && today.getMonth() === currentMonth;

  // Filter entries by current month
  const monthEntries = useMemo(() => {
    return entries.filter((e) => {
      if (!e.date) return false;
      const d = new Date(e.date + "T00:00:00");
      return d.getFullYear() === currentYear && d.getMonth() === currentMonth;
    });
  }, [entries, currentYear, currentMonth]);

  // Calendar cells for month grid
  const calendarCells = useMemo(() => {
    const cells: { day: number; isCurrentMonth: boolean; key: string }[] = [];
    const daysInPrevMonth = new Date(currentYear, currentMonth, 0).getDate();
    for (let i = 0; i < firstDay; i++) {
      cells.push({ day: daysInPrevMonth - firstDay + i + 1, isCurrentMonth: false, key: `prev-${i}` });
    }
    for (let d = 1; d <= daysInMonth; d++) {
      cells.push({ day: d, isCurrentMonth: true, key: `curr-${d}` });
    }
    let nextDay = 1;
    while (cells.length % 7 !== 0) {
      cells.push({ day: nextDay, isCurrentMonth: false, key: `next-${nextDay}` });
      nextDay++;
    }
    return cells;
  }, [firstDay, daysInMonth, currentYear, currentMonth]);

  const getDayEntries = (day: number) => {
    return monthEntries.filter((e) => {
      const d = new Date(e.date + "T00:00:00");
      return d.getDate() === day;
    });
  };

  const handleApproveConcept = async () => {
    if (!previewEntry) return;
    setIsConceptSubmitting(true);
    setConceptFeedback(null);
    try {
      const chosenHook = previewEntry.blueprint?.hooks?.[selectedHookIndex] || previewEntry.blueprint?.hooks?.[0] || null;
      await request<any>(`/api/v1/calendar/slots/${previewEntry.id}/approve-concept`, {
        method: "POST",
        body: JSON.stringify({ selected_hook: chosenHook, notes: "Client approved concept" }),
      });
      setPreviewEntry({
        ...previewEntry,
        concept_status: "concept_approved",
        selected_hook: chosenHook,
      });
      setConceptFeedback({
        text: "Story Concept approved! Your creative team is now proceeding with production.",
        type: "success",
      });
      queryClient.invalidateQueries({ queryKey: ["calendar-entries"] });
    } catch (err: any) {
      setConceptFeedback({ text: err.message || "Failed to approve concept.", type: "error" });
    } finally {
      setIsConceptSubmitting(false);
    }
  };

  const handleRequestChanges = async () => {
    if (!previewEntry || !changeNotes.trim()) return;
    setIsSubmittingChange(true);
    try {
      await request<any>(`/api/v1/calendar/slots/${previewEntry.id}/request-changes`, {
        method: "POST",
        body: JSON.stringify({ notes: changeNotes.trim() }),
      });
      setPreviewEntry({
        ...previewEntry,
        concept_status: "concept_revision" as any,
      });
      setRequestChangeOpen(false);
      setChangeNotes("");
      setConceptFeedback({
        text: "Your revision notes have been submitted to your creative team lead.",
        type: "success",
      });
      queryClient.invalidateQueries({ queryKey: ["calendar-entries"] });
    } catch (err: any) {
      setConceptFeedback({ text: err.message || "Failed to send revision notes.", type: "error" });
    } finally {
      setIsSubmittingChange(false);
    }
  };

  const openEntryModal = (entry: CalendarEntry) => {
    setPreviewEntry(entry);
    setConceptFeedback(null);
    setRequestChangeOpen(false);
    setChangeNotes("");
    if (entry.blueprint?.hooks?.length) {
      if (entry.selected_hook) {
        const foundIdx = entry.blueprint.hooks.findIndex(
          (h) => h.text === (entry.selected_hook as any).text
        );
        setSelectedHookIndex(foundIdx >= 0 ? foundIdx : 0);
      } else {
        setSelectedHookIndex(0);
      }
    }
  };

  if (isSubLoading || isEntriesLoading) {
    return (
      <CreoInlineLoader />
    );
  }

  if (subscriptionError) return <div role="alert">{subscriptionError.message} <button onClick={() => void refetchSubscription()}>Retry</button></div>;
  if (!isSubscribed) {
    return <SubscriptionLockedState />;
  }

  if (isEntriesError) {
    return <div role="alert" className="p-6 text-white">Could not load your calendar. <button onClick={() => refetchEntries()} className="underline">Retry</button></div>;
  }

  return (
    <div className="flex w-full min-w-0 flex-col gap-4 font-sans text-white">
      {/* ── Bento Grid Layout ──────────────────────────────────────── */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4 items-stretch">
        
        {/* Left Column: Calendar View (xl:col-span-2) */}
        <div className="flex xl:col-span-2 bg-[#161F2D] border border-[#2A3446] rounded-2xl shadow-[0_4px_24px_rgba(0,0,0,0.2)] p-4 sm:p-5 min-w-0 flex-col h-full">
          {/* Calendar Header */}
          <div className="flex flex-wrap items-center justify-between gap-3 mb-3.5 sm:mb-4">
            <div className="flex items-center gap-2.5">
              <h2 className="text-lg sm:text-[20px] font-black text-white tracking-tight">
                {MONTH_NAMES[currentMonth]} {currentYear}
              </h2>
              <span className="text-xs sm:text-sm font-semibold text-[#97A0B3]">Production Horizon</span>
            </div>
            
            <div className="flex items-center gap-2">
              {user?.role === "client" && <button type="button" disabled={isRebalancing} onClick={rebuildDraftSchedule} className="rounded-full border border-[#2A3446] px-3 py-1.5 text-xs disabled:opacity-60">
                {isRebalancing ? "Updating schedule…" : "Rebuild draft schedule"}
              </button>}
              <button
                type="button"
                onClick={() => { setSelectedDate(null); goToToday(); }}
                className="px-3.5 py-1.5 text-xs font-bold text-slate-200 hover:text-white bg-[#0B111C]/80 hover:bg-[#0B111C] rounded-full border border-[#2A3446] shadow-2xs transition-all cursor-pointer"
              >
                Today
              </button>
              <div className="flex items-center bg-[#0B111C]/80 border border-[#2A3446] rounded-full p-0.5 shadow-2xs">
                <button onClick={() => { setSelectedDate(null); navigateMonth(-1); }} className="p-1.5 text-slate-400 hover:text-white rounded-full transition-all cursor-pointer" aria-label="Previous Month">
                  <ChevronLeft className="size-4" strokeWidth={2.5} />
                </button>
                <div className="w-[1px] h-4 bg-[#2A3446] mx-1"></div>
                <button onClick={() => { setSelectedDate(null); navigateMonth(1); }} className="p-1.5 text-slate-400 hover:text-white rounded-full transition-all cursor-pointer" aria-label="Next Month">
                  <ChevronRight className="size-4" strokeWidth={2.5} />
                </button>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 mb-3 text-xs text-slate-300 min-h-[28px]" aria-label="Monthly content totals">
            {["reel", "poster", "story", "carousel"].map((kind) => {
              const count = monthEntries.filter(entry => (entry.type || entry.slot_kind) === kind).length;
              const config = getTypeConfig(kind);
              const Icon = config.icon;
              const pluralLabel = count > 1 ? (kind === "story" ? "Stories" : `${config.label}s`) : config.label;
              return count > 0 ? (
                <span key={kind} className="inline-flex items-center gap-1.5 rounded-lg border border-[#2A3446] bg-[#0B111C]/60 px-2.5 py-1 font-semibold text-slate-200">
                  <Icon className="size-3.5 shrink-0 stroke-[2.2] text-[#7FA0D6]" />
                  <span>{count} {pluralLabel}</span>
                </span>
              ) : null;
            })}
            <span className="px-2 py-1 text-[#97A0B3]">{monthEntries.length} planned this month</span>
          </div>
          {scheduleMessage && <p role="status" className="mb-3 text-sm text-slate-300">{scheduleMessage}</p>}

          {/* Month Grid */}
          <div className="flex-1 flex flex-col min-h-[460px]">
            {/* Weekday Headers */}
            <div className="grid grid-cols-7 mb-2">
              {["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"].map((day: string) => (
                <div key={day} className="py-1 text-center text-xs font-black text-[#97A0B3] uppercase tracking-wider">
                  {day}
                </div>
              ))}
            </div>

            {/* Calendar Cells */}
            <div className="grid grid-cols-7 gap-1 sm:gap-2 flex-1 auto-rows-fr">
              {calendarCells.map((cell) => {
                if (!cell.isCurrentMonth) {
                  return (
                    <div key={cell.key} className="rounded-xl bg-transparent p-1"></div>
                  );
                }

                const day = cell.day;
                const dayEntries = getDayEntries(day);
                const isTodayCell = isCurrentMonth && today.getDate() === day;
                const isSelected = selectedDate === day;



                return (
                  <div
                    key={cell.key}
                    onClick={() => setSelectedDate(day)}
                    className={`relative rounded-xl p-1 sm:p-2 min-w-0 transition-all cursor-pointer min-h-[110px] flex flex-col justify-between border-2 group ${
                      isSelected 
                        ? "border-blue-500 bg-[#7FA0D6]/15 ring-2 ring-blue-500/20 shadow-lg scale-[1.01] z-10"
                        : isTodayCell
                        ? "border-[#7FA0D6]/40 bg-[#161F2D] shadow-sm"
                        : "border-[#2A3446] hover:border-[#7FA0D6]/40 bg-[#0B111C]/40 hover:bg-[#161F2D] shadow-xs"
                    }`}
                  >
                    <span className={`text-base sm:text-lg font-black ${
                      isSelected ? "text-white" : isTodayCell ? "text-[#7FA0D6]" : "text-slate-300 group-hover:text-white"
                    }`}>
                      {day}
                    </span>
                    
                    <div className="mt-auto flex flex-col gap-1 w-full">
                      {Object.entries(dayEntries.reduce<Record<string, number>>((counts, entry) => {
                        const kind = entry.type || entry.slot_kind || "poster";
                        counts[kind] = (counts[kind] || 0) + 1;
                        return counts;
                      }, {})).map(([kind, count]) => {
                        const config = getTypeConfig(kind);
                        const Icon = config.icon;
                        const pluralLabel = count > 1 ? (kind === "story" ? "Stories" : `${config.label}s`) : config.label;
                        return (
                          <span
                            key={kind}
                            className="inline-flex items-center gap-1 rounded-md bg-blue-500/15 text-[#BCCCE6] px-1 sm:px-1.5 py-0.5 sm:py-1 text-[9px] sm:text-[11px] font-bold leading-tight truncate hover:bg-blue-500/25 transition-colors border border-blue-500/20"
                            title={`${count} ${pluralLabel}`}
                          >
                            <Icon className="size-2.5 sm:size-3 shrink-0 stroke-[2.2] text-[#7FA0D6]" />
                            <span className="truncate">{count} {pluralLabel}</span>
                          </span>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right Column: Dispatch Queue (xl:col-span-1) */}
        <div className="xl:col-span-1 bg-[#161F2D] border border-[#2A3446] rounded-2xl shadow-[0_4px_24px_rgba(0,0,0,0.2)] p-4 sm:p-5 flex flex-col h-full min-w-0">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-lg sm:text-[20px] font-black text-white tracking-tight">
              {selectedDate ? `Task Queue for ${selectedDate}th` : "Today's Dispatch Queue"}
            </h3>
            {(() => {
              const activeDay = selectedDate || (isCurrentMonth ? today.getDate() : 1);
              const tasks = getDayEntries(activeDay);
              return (
                <span className="inline-flex items-center rounded-full bg-[#161F2D] border border-[#2A3446] px-2.5 py-0.5 text-[11px] font-bold text-[#7FA0D6]">
                  {tasks.length > 0 ? `${tasks.length} Active` : '0 Active'}
                </span>
              );
            })()}
          </div>

          {(() => {
            const activeDay = selectedDate || (isCurrentMonth ? today.getDate() : 1);
            const tasks = getDayEntries(activeDay);
            return (
              <div className="flex flex-wrap items-center gap-2 mb-3 text-xs text-slate-300 min-h-[28px]" aria-label="Daily deliverables summary">
                <span className="inline-flex items-center gap-1.5 rounded-lg border border-[#2A3446] px-2.5 py-1 font-semibold text-[#7FA0D6] bg-[#0B111C]/60">
                  <Sparkles className="size-3.5 shrink-0 stroke-[2.2] text-[#7FA0D6]" />
                  <span>{tasks.length} {tasks.length === 1 ? 'Deliverable' : 'Deliverables'}</span>
                </span>
                <span className="px-2 py-1 text-[#97A0B3]">
                  {new Date(currentYear, currentMonth, activeDay).toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" })}
                </span>
              </div>
            );
          })()}

          <div className="flex-1 overflow-y-auto space-y-2.5 pr-1 min-h-0">
            {(() => {
              const activeDay = selectedDate || (isCurrentMonth ? today.getDate() : 1);
              let tasks = getDayEntries(activeDay);
              
              if (tasks.length === 0) {
                return (
                  <div className="flex flex-col items-center justify-center flex-1 min-h-[200px] h-full p-5 text-[#97A0B3] text-sm font-bold bg-[#0B111C]/60 rounded-xl border-2 border-dashed border-[#2A3446] text-center shadow-inner space-y-2">
                    <div className="w-10 h-10 rounded-full bg-[#161F2D] border border-[#2A3446] flex items-center justify-center text-[#7FA0D6] mb-1">
                      <Clock className="w-5 h-5" />
                    </div>
                    <span className="text-slate-200 font-bold">No deliverables scheduled.</span>
                    <span className="text-xs text-[#97A0B3] font-normal max-w-[220px]">
                      All clear for this date. Select another day to view or schedule content.
                    </span>
                  </div>
                );
              }

              return tasks.map((entry) => {
                const podLabel = user?.company_name ? `POD • ${user.company_name.toUpperCase()}` : "DEDICATED CREATIVE POD";
                const statusLabel = entry.concept_status === "concept_approved" ? "Concept Approved" : entry.status === "approved" ? "Ready to Publish" : "In Production";
                const isApproved = entry.concept_status === "concept_approved" || entry.status === "approved";

                return (
                  <div 
                    key={entry.id} 
                    onClick={() => openEntryModal(entry)}
                    className="p-3.5 sm:p-4 rounded-xl border border-[#2A3446] hover:border-[#7FA0D6]/50 bg-[#0B111C]/70 hover:bg-[#0B111C] transition-all cursor-pointer shadow-xs group space-y-2.5"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        {(() => {
                          const kind = entry.type || entry.slot_kind || "poster";
                          const cfg = getTypeConfig(kind);
                          const CardIcon = cfg.icon;
                          return (
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-md bg-blue-500/15 text-[#BCCCE6] border border-blue-500/30 shrink-0">
                              <CardIcon className="size-3 shrink-0 stroke-[2.2] text-[#7FA0D6]" />
                              <span>{cfg.label}</span>
                            </span>
                          );
                        })()}
                        <span className="text-[10px] font-black text-[#7FA0D6] uppercase tracking-wider truncate">
                          {podLabel}
                        </span>
                      </div>
                      <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full border shrink-0 ${isApproved ? "bg-blue-600/30 text-[#BCCCE6] border-blue-500/30" : "bg-blue-950/80 text-blue-300 border-blue-700/50"}`}>
                         {statusLabel}
                      </span>
                    </div>
                    
                    <h4 className="text-[14px] font-bold text-white leading-snug group-hover:text-[#7FA0D6] transition-colors">
                      {entry.topic}
                    </h4>
                    
                    <div className="flex items-center justify-between pt-2 border-t border-[#2A3446]/60 mt-auto">
                      <div className="flex items-center gap-2.5">
                        <div className="size-7 rounded-full flex items-center justify-center text-[10px] font-bold text-white bg-[#7FA0D6]">
                          CP
                        </div>
                        <span className="text-[12px] font-bold text-slate-300">
                          Creative Pod
                        </span>
                      </div>
                      <span className="text-[11px] font-black text-[#7FA0D6]">
                        {entry.scheduled_time || "Scheduled"}
                      </span>
                    </div>
                  </div>
                );
              });
            })()}
          </div>
        </div>
      </div>
      {/* ── Creative Intelligence Blueprint & Deliverable Review Modal ────── */}
      {previewEntry && typeof document !== "undefined" && createPortal(
        <div
          className="fixed inset-0 z-[99999] flex items-center justify-center p-3 sm:p-6 bg-black/80 backdrop-blur-md overflow-y-auto animate-in fade-in duration-200"
          onClick={() => setPreviewEntry(null)}
        >
          <div
            className="w-full max-w-2xl max-h-[90vh] rounded-3xl bg-[#161F2D] border border-[#2A3446] text-white shadow-2xl overflow-y-auto flex flex-col relative m-auto animate-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="sticky top-0 bg-[#161F2D]/95 backdrop-blur-sm z-10 flex items-center justify-between p-4 sm:p-5 border-b border-[#2A3446]">
              <div className="flex items-center gap-2.5 flex-wrap">
                <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold ${
                  getTypeConfig(previewEntry.type).pillBg
                }`}>
                  {(() => {
                    const ModalIcon = getTypeConfig(previewEntry.type).icon;
                    return <ModalIcon className="size-3.5 shrink-0 stroke-[2.2]" />;
                  })()}
                  <span>{previewEntry.format_label || getTypeConfig(previewEntry.type).label}</span>
                </span>

                {previewEntry.concept_status === "concept_approved" || previewEntry.status === "approved" ? (
                  <span className="inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                    <CheckCircle2 className="size-3.5" />
                    Story Approved
                  </span>
                ) : previewEntry.concept_status === "revision_requested" ? (
                  <span className="inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-bold bg-amber-500/15 text-amber-400 border border-amber-500/30">
                    Changes Requested
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold bg-sky-500/15 text-sky-400 border border-sky-500/30">
                    <span className="size-1.5 rounded-full bg-sky-400 animate-ping" />
                    Pending Your Approval
                  </span>
                )}
              </div>

              <button
                type="button"
                onClick={() => setPreviewEntry(null)}
                className="p-1 rounded-lg text-[#97A0B3] hover:text-white hover:bg-[#2A3446] transition-colors cursor-pointer shrink-0"
              >
                <X className="size-5" />
              </button>
            </div>

            {/* If Deliverable Video/Image is Published/Ready */}
            {previewEntry.file_url ? (
              <div className="bg-slate-900 flex items-center justify-center min-h-[220px] max-h-[300px] overflow-hidden relative">
                {previewEntry.type === "reel" || previewEntry.file_type?.toLowerCase().includes("video") ? (
                  <video
                    src={previewEntry.file_url}
                    controls
                    playsInline
                    autoPlay
                    muted
                    className="max-h-[280px] w-auto mx-auto object-contain"
                  />
                ) : (
                  <img
                    src={previewEntry.file_url}
                    alt={previewEntry.topic}
                    className="max-h-[280px] w-auto mx-auto object-contain"
                  />
                )}
              </div>
            ) : null}

            {/* Modal Body */}
            <div className="p-5 sm:p-6 space-y-5">
              {/* Alert Feedback Banner */}
              {conceptFeedback && (
                <div className={`p-3.5 rounded-xl text-xs font-semibold flex items-center justify-between ${
                  conceptFeedback.type === "success"
                    ? "bg-emerald-500/15 border border-emerald-500/30 text-emerald-400"
                    : "bg-rose-500/15 border border-rose-500/30 text-rose-400"
                }`}>
                  <span>{conceptFeedback.text}</span>
                  <button type="button" onClick={() => setConceptFeedback(null)} className="cursor-pointer">
                    <X className="size-4" />
                  </button>
                </div>
              )}

              {/* Story Title & Date */}
              <div>
                <h3 className="text-lg font-black text-white leading-snug">
                  {previewEntry.topic || previewEntry.title}
                </h3>
                <p className="text-xs text-[#97A0B3] mt-1.5 flex items-center gap-1.5 font-medium">
                  <Clock className="size-3.5 text-[#7FA0D6]" />
                  <span>Scheduled Publication: {previewEntry.date} · {previewEntry.scheduled_time || "11:00 AM"}</span>
                </p>
              </div>

              {/* What this story is about */}
              <div className="p-4 rounded-2xl bg-[#0B111C] border border-[#2A3446] space-y-2">
                <div className="flex items-center gap-1.5 text-[11px] font-extrabold uppercase tracking-wider text-[#7FA0D6]">
                  <Sparkles className="size-3.5" />
                  <span>Story Outline & Concept</span>
                </div>
                <p className="text-xs sm:text-sm text-slate-200 leading-relaxed font-medium whitespace-pre-line">
                  {previewEntry.story_description ||
                   (previewEntry.blueprint as any)?.story_description ||
                   previewEntry.blueprint?.premise ||
                   previewEntry.caption ||
                   "Your creative team is preparing this story concept for production."}
                </p>
              </div>

              {/* Team Approval Request Box */}
              <div className="p-4 rounded-2xl bg-[#7FA0D6]/10 border border-[#7FA0D6]/25 space-y-2.5">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <div className="flex items-center gap-2">
                    <span className="size-2 rounded-full bg-[#7FA0D6] animate-pulse" />
                    <span className="text-[11px] font-extrabold uppercase tracking-wider text-[#7FA0D6]">
                      Approval Requested For
                    </span>
                  </div>
                  <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-[#7FA0D6]/20 text-[#BCCCE6] border border-[#7FA0D6]/30">
                    {previewEntry.approval_type || (previewEntry.blueprint as any)?.approval_type || "Story Concept & Topic"}
                  </span>
                </div>

                {(previewEntry.team_notes || (previewEntry.blueprint as any)?.team_notes) ? (
                  <div className="text-xs text-slate-300 bg-[#0B111C]/70 p-3 rounded-xl border border-[#2A3446] space-y-1">
                    <span className="text-[10px] font-bold text-[#97A0B3] uppercase tracking-wider block">
                      Note from your Creative Team
                    </span>
                    <p className="italic text-slate-200 leading-relaxed font-medium">
                      &ldquo;{previewEntry.team_notes || (previewEntry.blueprint as any)?.team_notes}&rdquo;
                    </p>
                  </div>
                ) : (
                  <p className="text-xs text-slate-300 leading-relaxed">
                    Please review the story outline above and confirm if this direction works for your brand before filming/design begins.
                  </p>
                )}
              </div>

              {/* Approval Actions */}
              {previewEntry.concept_status !== "concept_approved" && previewEntry.status !== "approved" ? (
                <div className="space-y-3 pt-1">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={handleApproveConcept}
                      disabled={isConceptSubmitting}
                      className="py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                    >
                      {isConceptSubmitting ? (
                        <Loader2 className="size-4 animate-spin" />
                      ) : (
                        <CheckCircle2 className="size-4" />
                      )}
                      <span>Approve Story Concept</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setRequestChangeOpen(!requestChangeOpen)}
                      className="py-3 px-4 rounded-xl border border-[#2A3446] bg-[#0B111C] hover:bg-[#2A3446] text-slate-200 font-bold text-xs transition-all flex items-center justify-center gap-2 cursor-pointer"
                    >
                      <MessageSquare className="size-4 text-[#7FA0D6]" />
                      <span>Request Changes</span>
                    </button>
                  </div>

                  {requestChangeOpen && (
                    <div className="p-4 rounded-xl bg-[#0B111C] border border-[#2A3446] space-y-3 animate-in fade-in duration-150">
                      <label className="text-xs font-bold text-white block">
                        What changes would you like the team to make?
                      </label>
                      <textarea
                        value={changeNotes}
                        onChange={(e) => setChangeNotes(e.target.value)}
                        placeholder="e.g. Can we focus on a different hook, or highlight our special offer more prominently?"
                        className="w-full text-xs p-3 rounded-xl bg-[#161F2D] border border-[#2A3446] text-white placeholder:text-slate-500 focus:outline-none focus:border-[#7FA0D6]"
                        rows={3}
                      />
                      <div className="flex justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => setRequestChangeOpen(false)}
                          className="px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-400 hover:text-white cursor-pointer"
                        >
                          Cancel
                        </button>
                        <button
                          type="button"
                          onClick={handleRequestChanges}
                          disabled={isSubmittingChange || !changeNotes.trim()}
                          className="px-4 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold disabled:opacity-50 flex items-center gap-1.5 cursor-pointer"
                        >
                          {isSubmittingChange && <Loader2 className="size-3.5 animate-spin" />}
                          <span>Send Feedback to Team</span>
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/15 p-4 text-xs text-emerald-400 font-semibold flex items-center gap-3">
                  <CheckCircle2 className="size-5 text-emerald-400 shrink-0" />
                  <div>
                    <h4 className="font-black text-sm text-emerald-300">Story Concept Approved</h4>
                    <p className="text-xs text-emerald-400/90 font-medium mt-0.5">
                      Your creative team is actively producing this deliverable.
                    </p>
                  </div>
                </div>
              )}

              {/* Action Buttons Footer */}
              <div className="flex gap-3 pt-2 border-t border-[#2A3446]">
                <Link
                  to="/portal/deliverables"
                  className="flex-1 inline-flex items-center justify-center gap-2 py-3 rounded-xl bg-[#161F2D] border border-[#2A3446] hover:border-[#7FA0D6]/50 text-white font-bold text-xs transition-colors"
                >
                  <span>Deliverables Dock</span>
                  <ExternalLink className="size-3.5 text-[#7FA0D6]" />
                </Link>
                <button
                  type="button"
                  onClick={() => setPreviewEntry(null)}
                  className="px-5 py-3 rounded-xl border border-[#2A3446] bg-[#0B111C] hover:bg-[#2A3446] text-[#F1F5F9] font-bold text-xs transition-colors cursor-pointer"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}

export default PortalCalendarPage;
