import { useState, useMemo } from "react";
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
  RotateCcw,
  Music,
  ShieldCheck,
  Film,
  Target,
  Zap,
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
  concept_status?: "concept_pending" | "concept_revision" | "concept_approved" | "approved";
  selected_hook?: BlueprintHook | null;
  blueprint?: CreativeBlueprint | null;
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
    icon: Video,
    badgeBg: "bg-purple-600",
    badgeText: "text-white",
    border: "border-purple-500/30",
    softBg: "bg-purple-500/15 text-purple-400 hover:bg-purple-500/25 border border-purple-500/30",
    pillBg: "bg-purple-500/15 text-purple-400 border border-purple-500/30",
  },
  poster: DEFAULT_TYPE_CONFIG,
  story: {
    label: "Story",
    icon: Layers,
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
  const [flexTheme, setFlexTheme] = useState<string>("");
  const [isProposingFlex, setIsProposingFlex] = useState<boolean>(false);
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
    if (!previewEntry || !previewEntry.blueprint?.hooks?.length) return;
    setIsConceptSubmitting(true);
    setConceptFeedback(null);
    try {
      const chosenHook = previewEntry.blueprint.hooks[selectedHookIndex] || previewEntry.blueprint.hooks[0];
      await request<any>(`/api/v1/calendar/slots/${previewEntry.id}/approve-concept`, {
        method: "POST",
        body: JSON.stringify({ selected_hook: chosenHook }),
      });
      setPreviewEntry({
        ...previewEntry,
        concept_status: "concept_approved",
        selected_hook: chosenHook,
      });
      setConceptFeedback({
        text: "Concept & Hook approved! The task has been dispatched to your pod editor.",
        type: "success",
      });
      queryClient.invalidateQueries({ queryKey: ["calendar-entries"] });
    } catch (err: any) {
      setConceptFeedback({ text: err.message || "Failed to approve concept.", type: "error" });
    } finally {
      setIsConceptSubmitting(false);
    }
  };

  const handleRerollConcept = async () => {
    if (!previewEntry) return;
    setIsConceptSubmitting(true);
    setConceptFeedback(null);
    try {
      const res = await request<any>(`/api/v1/calendar/slots/${previewEntry.id}/reroll-concept`, {
        method: "POST",
      });
      setPreviewEntry({
        ...previewEntry,
        blueprint: res.blueprint,
        concept_status: "concept_pending",
        selected_hook: res.blueprint?.hooks?.[0],
      });
      setSelectedHookIndex(0);
      setConceptFeedback({
        text: `New angle generated! ${res.remaining_daily_rerolls ?? "Several"} re-rolls remaining today.`,
        type: "success",
      });
      queryClient.invalidateQueries({ queryKey: ["calendar-entries"] });
    } catch (err: any) {
      setConceptFeedback({
        text: err.message || "Daily re-roll quota reached (5/5). Try again tomorrow.",
        type: "error",
      });
    } finally {
      setIsConceptSubmitting(false);
    }
  };

  const handleProposeFlex = async () => {
    if (!previewEntry || !flexTheme.trim()) return;
    setIsProposingFlex(true);
    setConceptFeedback(null);
    try {
      const res = await request<any>(`/api/v1/calendar/flex/${previewEntry.id}/propose`, {
        method: "POST",
        body: JSON.stringify({ theme: flexTheme.trim() }),
      });
      setPreviewEntry({
        ...previewEntry,
        slot_strategy: "swapped",
        blueprint: res.blueprint,
        concept_status: "concept_pending",
      });
      setFlexTheme("");
      setConceptFeedback({
        text: "Flex slot filled with custom trend topic! Blueprint generated.",
        type: "success",
      });
      queryClient.invalidateQueries({ queryKey: ["calendar-entries"] });
    } catch (err: any) {
      setConceptFeedback({ text: err.message || "Failed to propose flex topic.", type: "error" });
    } finally {
      setIsProposingFlex(false);
    }
  };

  const openEntryModal = (entry: CalendarEntry) => {
    setPreviewEntry(entry);
    setConceptFeedback(null);
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
      <div className="flex h-96 items-center justify-center">
        <Loader2 className="size-8 animate-spin text-[#7FA0D6]" />
      </div>
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
    <div className="flex flex-col gap-6 w-full max-w-[1440px] mx-auto px-4 md:px-8 pb-10 font-sans text-white bg-[#0B111C]">
      {/* ── Bento Grid Layout ──────────────────────────────────────── */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 items-start">
        
        {/* Left Column: Calendar View (xl:col-span-2) */}
        <div className="flex xl:col-span-2 bg-[#161F2D] border border-[#2A3446] rounded-[2rem] shadow-[0_4px_24px_rgba(0,0,0,0.2)] p-2 sm:p-4 lg:p-6 min-w-0 flex-col">
          {/* Calendar Header */}
          <div className="flex flex-wrap items-center justify-between gap-4 mb-8">
            <div className="flex items-center gap-3">
              <h2 className="text-[20px] font-black text-white tracking-tight">
                {MONTH_NAMES[currentMonth]} {currentYear}
              </h2>
              <span className="text-sm font-semibold text-[#97A0B3]">Production Horizon</span>
            </div>
            
            <div className="flex items-center gap-2">
              {user?.role === "client" && <button type="button" disabled={isRebalancing} onClick={rebuildDraftSchedule} className="rounded-full border border-[#2A3446] px-3 py-2 text-xs disabled:opacity-60">
                {isRebalancing ? "Updating schedule…" : "Rebuild draft schedule"}
              </button>}
              <button
                type="button"
                onClick={() => { setSelectedDate(null); goToToday(); }}
                className="px-4 py-1.5 text-xs font-bold text-slate-200 hover:text-white bg-[#0B111C]/80 hover:bg-[#0B111C] rounded-full border border-[#2A3446] shadow-2xs transition-all cursor-pointer"
              >
                Today
              </button>
              <div className="flex items-center bg-[#0B111C]/80 border border-[#2A3446] rounded-full p-1 shadow-2xs">
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

          <div className="flex flex-wrap gap-2 mb-4 text-xs text-slate-300" aria-label="Monthly content totals">
            {["reel", "poster", "story", "carousel"].map((kind) => {
              const count = monthEntries.filter(entry => entry.type === kind).length;
              return count > 0 ? <span key={kind} className="rounded-lg border border-[#2A3446] px-2 py-1">{count} {getTypeConfig(kind).label}{count > 1 ? "s" : ""}</span> : null;
            })}
            <span className="px-2 py-1">{monthEntries.length} planned this month</span>
          </div>
          {scheduleMessage && <p role="status" className="mb-4 text-sm text-slate-300">{scheduleMessage}</p>}

          {/* Month Grid */}
          <div className="flex-1 flex flex-col min-h-[500px]">
            {/* Weekday Headers */}
            <div className="grid grid-cols-7 mb-4">
              {["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"].map((day: string) => (
                <div key={day} className="py-2 text-center text-xs font-black text-[#97A0B3] uppercase tracking-wider">
                  {day}
                </div>
              ))}
            </div>

            {/* Calendar Cells */}
            <div className="grid grid-cols-7 gap-1 sm:gap-2 flex-1 auto-rows-fr">
              {calendarCells.map((cell) => {
                if (!cell.isCurrentMonth) {
                  return (
                    <div key={cell.key} className="rounded-[1.5rem] bg-transparent p-2"></div>
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
                    
                    <div className="mt-auto flex flex-col gap-1.5 w-full">
                      {Object.entries(dayEntries.reduce<Record<string, number>>((counts, entry) => {
                        const label = getTypeConfig(entry.type).label;
                        counts[label] = (counts[label] || 0) + 1;
                        return counts;
                      }, {})).map(([label, count]) => (
                        <span key={label} className="rounded-md bg-blue-500/15 text-[#BCCCE6] px-0.5 sm:px-1 py-1 text-[9px] sm:text-[11px] font-bold leading-tight break-words" title={`${count} ${label}${count > 1 ? "s" : ""}`}>
                          {count} {label}{count > 1 ? "s" : ""}
                        </span>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right Column: Dispatch Queue (xl:col-span-1) */}
        <div className="bg-[#161F2D] border border-[#2A3446] rounded-[2rem] shadow-[0_4px_24px_rgba(0,0,0,0.2)] p-6 lg:p-8 flex flex-col min-h-[500px]">
          <div className="flex items-center justify-between mb-8">
            <h3 className="text-[18px] font-black text-white tracking-tight">
              {selectedDate ? `Task Queue for ${selectedDate}th` : "Today's Dispatch Queue"}
            </h3>
            {(() => {
              const activeDay = selectedDate || (isCurrentMonth ? today.getDate() : 1);
              const tasks = getDayEntries(activeDay);
              return (
                <span className="inline-flex items-center rounded-full bg-[#161F2D] border border-[#2A3446] px-3 py-1 text-[12px] font-bold text-[#7FA0D6]">
                  {tasks.length > 0 ? `${tasks.length} Active` : '0 Active'}
                </span>
              );
            })()}
          </div>

          <div className="flex-1 overflow-y-auto space-y-4 pr-1">
            {(() => {
              const activeDay = selectedDate || (isCurrentMonth ? today.getDate() : 1);
              let tasks = getDayEntries(activeDay);
              
              if (tasks.length === 0) {
                return (
                  <div className="flex flex-col items-center justify-center min-h-[220px] p-8 text-[#97A0B3] text-sm font-bold bg-[#0B111C]/60 rounded-[1.5rem] border-2 border-dashed border-[#2A3446] text-center shadow-inner space-y-2">
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
                    className="p-5 rounded-[1.5rem] border border-[#2A3446] hover:border-[#7FA0D6]/50 bg-[#0B111C]/70 hover:bg-[#0B111C] transition-all cursor-pointer shadow-xs group space-y-3"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-black text-[#7FA0D6] uppercase tracking-wider">
                        {podLabel}
                      </span>
                      <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full border ${isApproved ? "bg-blue-600/30 text-[#BCCCE6] border-blue-500/30" : "bg-blue-950/80 text-blue-300 border-blue-700/50"}`}>
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
      {previewEntry && (
        <div
          className="fixed inset-0 w-screen h-screen z-[99999] flex items-center justify-center bg-[#0B111C]/80 backdrop-blur-md p-3 sm:p-6 overflow-y-auto"
          onClick={() => setPreviewEntry(null)}
        >
          <div
            className="w-full max-w-2xl max-h-[92vh] rounded-3xl bg-[#161F2D] border border-[#2A3446] text-white shadow-2xl overflow-y-auto animate-page-in my-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="sticky top-0 bg-[#161F2D]/95 backdrop-blur-sm z-10 flex items-center justify-between p-4 sm:p-5 border-b border-[#2A3446]">
              <div className="flex items-center gap-2 flex-wrap">
                <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-bold ${
                  getTypeConfig(previewEntry.type).pillBg
                }`}>
                  {previewEntry.format_label || "Deliverable"}
                </span>

                {previewEntry.slot_strategy === "flex" || previewEntry.slot_strategy === "swapped" ? (
                  <span className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-bold bg-amber-500/15 text-amber-400 border border-amber-500/30">
                    ⚡ Flex Slot (30% Buffer)
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-bold bg-blue-500/15 text-[#7FA0D6] border border-blue-500/30">
                    🎯 Anchor Slot (70%)
                  </span>
                )}

                {previewEntry.blueprint?.funnel_stage && (
                  <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-bold ${
                    previewEntry.blueprint.funnel_stage === "reach"
                      ? "bg-sky-500/15 text-sky-400 border border-sky-500/30"
                      : previewEntry.blueprint.funnel_stage === "authority"
                      ? "bg-indigo-500/15 text-indigo-400 border border-indigo-500/30"
                      : "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30"
                  }`}>
                    {previewEntry.blueprint.funnel_stage.toUpperCase()} (Funnel Mix)
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
              {/* Concept feedback alert */}
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

              {/* Flex Slot Propose Section (if strategy is flex or swapped) */}
              {(previewEntry.slot_strategy === "flex" || previewEntry.slot_strategy === "swapped") && (
                <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold text-amber-300 flex items-center gap-1.5">
                      <Zap className="size-4 text-amber-400" />
                      Dynamic Flex Hot-Swap Protocol
                    </h4>
                    {previewEntry.flex_deadline && (
                      <span className="text-[10px] font-semibold text-amber-400 bg-amber-500/15 border border-amber-500/30 px-2 py-0.5 rounded-md">
                        Auto-converts by: {previewEntry.flex_deadline}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-amber-200/80 leading-relaxed">
                    Have a sudden industry event, feature launch, or viral trend? Fill this flex slot instantly with human-guided direction.
                  </p>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={flexTheme}
                      onChange={(e) => setFlexTheme(e.target.value)}
                      placeholder="e.g. Breaking AI regulation impact or flash founder update..."
                      className="flex-1 text-xs px-3 py-2 rounded-xl border border-amber-300 bg-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500"
                    />
                    <button
                      type="button"
                      onClick={handleProposeFlex}
                      disabled={isProposingFlex || !flexTheme.trim()}
                      className="px-3.5 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs shadow-xs transition-colors shrink-0 disabled:opacity-50 cursor-pointer flex items-center gap-1.5"
                    >
                      {isProposingFlex ? <Loader2 className="size-3.5 animate-spin" /> : <Sparkles className="size-3.5" />}
                      <span>Generate</span>
                    </button>
                  </div>
                </div>
              )}

              {/* Topic and Publication Details */}
              <div>
                <h3 className="text-lg font-black text-[#0B111C]">
                  {previewEntry.topic}
                </h3>
                <p className="text-xs text-slate-500 mt-1 flex items-center gap-1.5">
                  <Clock className="size-3.5 text-[#7FA0D6]" />
                  <span>Scheduled Publication: {previewEntry.date} at {previewEntry.scheduled_time || "11:00 AM"}</span>
                </p>
              </div>

              {/* Blueprint Premise */}
              {previewEntry.blueprint?.premise && (
                <div className="p-4 rounded-xl bg-[#0B111C] border border-[#2A3446] space-y-1">
                  <span className="text-[10px] font-extrabold uppercase tracking-wider text-[#97A0B3] block">
                    Core Premise
                  </span>
                  <p className="text-xs font-semibold text-[#F1F5F9] leading-relaxed">
                    {previewEntry.blueprint.premise}
                  </p>
                </div>
              )}

              {/* ── Tier 2: Concept Approval Gate (Hooks A/B/C) ─────────────── */}
              {previewEntry.blueprint?.hooks && previewEntry.blueprint.hooks.length > 0 && (
                <div className="space-y-3 pt-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-sm font-black text-white flex items-center gap-1.5">
                        <Target className="size-4 text-[#7FA0D6]" />
                        <span>Select Concept Hook Angle (A / B / C)</span>
                      </h4>
                      <p className="text-[11px] text-[#97A0B3]">
                        Approve your preferred hook before production starts. Revisions after production cost hours; concept alignment is instant.
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={handleRerollConcept}
                      disabled={isConceptSubmitting}
                      className="inline-flex items-center gap-1 text-xs font-bold text-[#7FA0D6] hover:text-[#BCCCE6] disabled:opacity-50 cursor-pointer"
                      title="Generate new hook angles (5 daily quota)"
                    >
                      <RotateCcw className="size-3.5" />
                      <span>Re-Roll Angles</span>
                    </button>
                  </div>

                  {/* Hook Selection Cards */}
                  <div className="space-y-2.5">
                    {previewEntry.blueprint.hooks.map((hook, idx) => {
                      const isSelected = selectedHookIndex === idx;
                      const isApprovedHook =
                        previewEntry.concept_status === "concept_approved" &&
                        previewEntry.selected_hook &&
                        (previewEntry.selected_hook as any).text === hook.text;

                      return (
                        <div
                          key={idx}
                          onClick={() => {
                            if (previewEntry.concept_status !== "concept_approved") {
                              setSelectedHookIndex(idx);
                            }
                          }}
                          className={`p-3.5 rounded-xl border transition-all cursor-pointer ${
                            isSelected || isApprovedHook
                              ? "border-[#7FA0D6] bg-[#0B111C] shadow-xs"
                              : "border-[#2A3446] bg-[#161F2D] hover:border-[#7FA0D6]/40"
                          }`}
                        >
                          <div className="flex items-center justify-between mb-1.5">
                            <div className="flex items-center gap-2">
                              <span className="size-5 rounded-full flex items-center justify-center text-[10px] font-black bg-[#7FA0D6] text-white">
                                {idx === 0 ? "A" : idx === 1 ? "B" : "C"}
                              </span>
                              <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-md bg-[#0B111C] text-[#F1F5F9] border border-[#2A3446]">
                                {hook.angle.replace("_", " ")}
                              </span>
                            </div>

                            {isApprovedHook && (
                              <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-400 bg-emerald-500/15 px-2 py-0.5 rounded-full border border-emerald-500/30">
                                <CheckCircle2 className="size-3" />
                                Chosen Hook
                              </span>
                            )}
                          </div>

                          <p className="text-xs font-bold text-[#0B111C] leading-snug">
                            &ldquo;{hook.text}&rdquo;
                          </p>
                          <p className="text-[11px] text-slate-500 mt-1 italic">
                            Why it works: {hook.rationale}
                          </p>
                        </div>
                      );
                    })}
                  </div>

                  {/* Concept Approval Button */}
                  {previewEntry.concept_status !== "concept_approved" ? (
                    <div className="pt-2">
                      <button
                        type="button"
                        onClick={handleApproveConcept}
                        disabled={isConceptSubmitting}
                        className="w-full py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-xs transition-colors flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
                      >
                        {isConceptSubmitting ? (
                          <Loader2 className="size-4 animate-spin" />
                        ) : (
                          <CheckCircle2 className="size-4" />
                        )}
                        <span>
                          Approve Hook {selectedHookIndex === 0 ? "A" : selectedHookIndex === 1 ? "B" : "C"} & Launch Production
                        </span>
                      </button>
                    </div>
                  ) : (
                    <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/15 p-3 text-xs text-emerald-400 font-semibold flex items-center gap-2">
                      <CheckCircle2 className="size-4 text-emerald-400 shrink-0" />
                      <span>Concept Approved! Task dispatched with your selected angle.</span>
                    </div>
                  )}
                </div>
              )}

              {/* ── Storyboard & Beats Breakdown ───────────────────────────── */}
              {previewEntry.blueprint?.beats && previewEntry.blueprint.beats.length > 0 && (
                <div className="space-y-2 pt-2 border-t border-[#2A3446]">
                  <h4 className="text-xs font-extrabold uppercase tracking-wider text-[#97A0B3] flex items-center gap-1.5">
                    <Film className="size-3.5 text-[#7FA0D6]" />
                    Shot-by-Shot Storyboard Beats
                  </h4>
                  <div className="space-y-2">
                    {previewEntry.blueprint.beats.map((beat, bIdx) => (
                      <div key={bIdx} className="p-3 rounded-xl bg-[#0B111C] border border-[#2A3446] text-xs space-y-1">
                        <div className="flex items-center justify-between text-[11px] font-bold text-[#97A0B3]">
                          <span className="text-[#7FA0D6] font-extrabold">Shot {bIdx + 1} ({beat.timestamp_range})</span>
                          <span className="px-1.5 py-0.5 rounded bg-[#161F2D] text-[#F1F5F9] border border-[#2A3446] font-semibold text-[10px]">
                            {beat.shot_type}
                          </span>
                        </div>
                        <p className="text-[#F1F5F9] font-medium">
                          <strong className="text-white">Visual:</strong> {beat.visual_cue}
                        </p>
                        <p className="text-[#97A0B3] italic">
                          <strong className="text-white not-italic">Voiceover / Script:</strong> &ldquo;{beat.script_line}&rdquo;
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* ── Audio Direction & Brand Guardrails ─────────────────────── */}
              {previewEntry.blueprint?.audio_direction && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-[#2A3446] text-xs">
                  <div className="p-3.5 rounded-xl bg-purple-500/10 border border-purple-500/30 space-y-1">
                    <span className="text-[10px] font-extrabold uppercase tracking-wider text-purple-400 flex items-center gap-1">
                      <Music className="size-3" />
                      Actionable Audio Direction
                    </span>
                    <p className="font-bold text-white text-[11.5px]">
                      {previewEntry.blueprint.audio_direction.genre_mood} · {previewEntry.blueprint.audio_direction.bpm_range}
                    </p>
                    <p className="text-[11px] text-[#97A0B3]">
                      Rule: {previewEntry.blueprint.audio_direction.vocal_rules}
                    </p>
                  </div>

                  <div className="p-3.5 rounded-xl bg-[#0B111C] border border-[#2A3446] space-y-1">
                    <span className="text-[10px] font-extrabold uppercase tracking-wider text-[#97A0B3] flex items-center gap-1">
                      <ShieldCheck className="size-3 text-emerald-400" />
                      Brand Guardrails Respected
                    </span>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {previewEntry.blueprint.respects?.map((resp, rIdx) => (
                        <span key={rIdx} className="text-[10.5px] px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 font-medium">
                          ✓ {resp}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Editorial Caption (if exists) */}
              {previewEntry.caption && (
                <div className="p-3.5 rounded-xl bg-[#0B111C] border border-[#2A3446] text-xs text-[#F1F5F9] leading-relaxed">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[#97A0B3] block mb-1">
                    Editorial Caption & Call to Action
                  </span>
                  {previewEntry.caption}
                </div>
              )}

              {/* Action Buttons Footer */}
              <div className="flex gap-3 pt-2 border-t border-[#2A3446]">
                <Link
                  to="/portal/deliverables"
                  className="flex-1 inline-flex items-center justify-center gap-2 py-3 rounded-xl bg-[#7FA0D6] hover:bg-[#7FA0D6] text-white font-bold text-xs shadow-xs transition-colors"
                >
                  <span>Deliverables Dock</span>
                  <ExternalLink className="size-3.5" />
                </Link>
                <button
                  type="button"
                  onClick={() => setPreviewEntry(null)}
                  className="px-4 py-3 rounded-xl border border-[#2A3446] bg-[#0B111C] hover:bg-[#2A3446] text-[#F1F5F9] font-bold text-xs transition-colors cursor-pointer"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default PortalCalendarPage;
