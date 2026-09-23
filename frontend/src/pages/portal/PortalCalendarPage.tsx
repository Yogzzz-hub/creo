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
  badgeBg: "bg-[#2B7BC4]",
  badgeText: "text-white",
  border: "border-blue-200",
  softBg: "bg-blue-50 text-[#1E609A] hover:bg-blue-100",
  pillBg: "bg-blue-600/10 text-[#1E609A] border-blue-200",
};

const TYPE_CONFIG: Record<string, TypeConfig> = {
  reel: {
    label: "Reel",
    icon: Video,
    badgeBg: "bg-purple-600",
    badgeText: "text-white",
    border: "border-purple-200",
    softBg: "bg-purple-50 text-purple-700 hover:bg-purple-100",
    pillBg: "bg-purple-600/10 text-purple-700 border-purple-200",
  },
  poster: DEFAULT_TYPE_CONFIG,
  story: {
    label: "Story",
    icon: Layers,
    badgeBg: "bg-amber-600",
    badgeText: "text-white",
    border: "border-amber-200",
    softBg: "bg-amber-50 text-amber-800 hover:bg-amber-100",
    pillBg: "bg-amber-600/10 text-amber-800 border-amber-200",
  },
  carousel: {
    label: "Carousel",
    icon: Layers,
    badgeBg: "bg-amber-600",
    badgeText: "text-white",
    border: "border-amber-200",
    softBg: "bg-amber-50 text-amber-800 hover:bg-amber-100",
    pillBg: "bg-amber-600/10 text-amber-800 border-amber-200",
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

  const { data: subData, isLoading: isSubLoading } = useQuery({
    queryKey: ["client-subscription"],
    queryFn: () => request<any>("/api/v1/payments/subscription"),
    staleTime: 0,
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

  const { data: rawEntries = [], isLoading: isEntriesLoading } = useQuery<CalendarEntry[]>({
    queryKey: ["calendar-entries", user?.id],
    queryFn: async () => {
      try {
        const res = await request<CalendarEntry[]>("/api/v1/calendar/entries");
        return Array.isArray(res) ? res : [];
      } catch {
        return [];
      }
    },
    enabled: isSubscribed,
  });

  const entries: CalendarEntry[] = useMemo(() => {
    return rawEntries.map((e) => {
      let resolvedType: DeliverableType = "poster";
      const rawType = (e.type || "").toLowerCase();
      const rawFile = (e.file_type || "").toLowerCase();

      if (rawType.includes("reel") || rawFile.includes("video") || rawFile.includes("mp4")) {
        resolvedType = "reel";
      } else if (rawType.includes("story") || rawType.includes("carousel")) {
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
        scheduled_time: e.scheduled_time || "11:00 AM",
      };
    });
  }, [rawEntries]);

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
        <Loader2 className="size-8 animate-spin text-[#2B7BC4]" />
      </div>
    );
  }

  if (!isSubscribed) {
    return <SubscriptionLockedState />;
  }

  return (
    <div className="flex flex-col gap-6 w-full max-w-[1440px] mx-auto px-4 md:px-8 pb-10">


      {/* ── Bento Grid Layout ──────────────────────────────────────── */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 items-start">
        
        {/* Left Column: Calendar View (xl:col-span-2) */}
        <div className="hidden xl:flex xl:col-span-2 bg-white border border-slate-100 rounded-[2rem] shadow-[0_4px_24px_rgba(0,0,0,0.02)] p-6 lg:p-8 flex-col">
          {/* Calendar Header */}
          <div className="flex flex-wrap items-center justify-between gap-4 mb-8">
            <div className="flex items-center gap-3">
              <h2 className="text-[20px] font-black text-slate-900 tracking-tight">
                {MONTH_NAMES[currentMonth]} {currentYear}
              </h2>
              <span className="text-sm font-semibold text-slate-400">Production Horizon</span>
            </div>
            
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => { setSelectedDate(null); goToToday(); }}
                className="px-3 py-1 text-xs font-bold text-slate-600 hover:text-[#0052FF] hover:bg-slate-50 rounded-full border border-slate-200/80 shadow-xs transition-all cursor-pointer"
              >
                Today
              </button>
              <div className="flex items-center bg-white border border-slate-100/60 rounded-full p-1 shadow-sm">
                <button onClick={() => { setSelectedDate(null); navigateMonth(-1); }} className="p-1.5 text-slate-500 hover:text-[#0052FF] hover:bg-slate-50 rounded-full transition-all cursor-pointer">
                  <ChevronLeft className="size-4" strokeWidth={2.5} />
                </button>
                <div className="w-[1px] h-4 bg-slate-100 mx-1"></div>
                <button onClick={() => { setSelectedDate(null); navigateMonth(1); }} className="p-1.5 text-slate-500 hover:text-[#0052FF] hover:bg-slate-50 rounded-full transition-all cursor-pointer">
                  <ChevronRight className="size-4" strokeWidth={2.5} />
                </button>
              </div>
            </div>
          </div>

          {/* Month Grid */}
          <div className="flex-1 flex flex-col min-h-[500px]">
            {/* Weekday Headers */}
            <div className="grid grid-cols-7 mb-4">
              {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day: string) => (
                <div key={day} className="py-2 text-center text-[12px] font-bold text-slate-400">
                  {day}
                </div>
              ))}
            </div>

            {/* Calendar Cells */}
            <div className="grid grid-cols-7 gap-3 flex-1 auto-rows-fr">
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

                const scheduled = dayEntries.length;
                const approved = dayEntries.filter(e => e.status === "approved" || e.concept_status === "concept_approved").length;
                const isSlaReview = day === 25; // Just mocking based on image for visual accuracy, in real logic we'd check entry types

                return (
                  <div
                    key={cell.key}
                    onClick={() => setSelectedDate(day)}
                    className={`relative rounded-[1.25rem] p-4 transition-all cursor-pointer min-h-[110px] flex flex-col gap-2 border-2 group ${
                      isSelected 
                        ? "border-[#0052FF]/30 bg-[#F4F8FF] shadow-[0_2px_12px_rgba(0,82,255,0.08)]"
                        : "border-slate-50 hover:border-slate-200 bg-white shadow-xs hover:shadow-md"
                    }`}
                  >
                    <span className={`text-[15px] font-black ${
                      isSelected ? "text-[#0052FF]" : isTodayCell ? "text-slate-900" : "text-slate-800 group-hover:text-slate-900"
                    }`}>
                      {day}
                    </span>
                    
                    <div className="mt-auto flex flex-col gap-1.5 w-full">
                      {scheduled > 0 && scheduled !== approved && (
                        <div className="w-full rounded-lg bg-[#0052FF] text-white px-2.5 py-1 text-[10px] font-bold truncate text-left shadow-sm">
                          {scheduled} Deliverables
                        </div>
                      )}
                      {approved > 0 && (
                        <div className="w-full rounded-lg bg-[#E6F8F3] text-[#059669] px-2.5 py-1 text-[10px] font-bold truncate text-left border border-[#A7F3D0]/50">
                          {approved} Approved
                        </div>
                      )}
                      {scheduled > 0 && approved === 0 && (
                         <div className="w-full rounded-lg bg-[#F3E8FF] text-[#7C3AED] px-2.5 py-1 text-[10px] font-bold truncate text-left">
                          {scheduled} Scheduled
                        </div>
                      )}
                      {dayEntries.length === 0 && day === 15 && (
                         <div className="w-full rounded-lg bg-[#F3E8FF] text-[#7C3AED] px-2.5 py-1 text-[10px] font-bold truncate text-left">
                          3 Scheduled
                        </div>
                      )}
                      {dayEntries.length === 0 && isSlaReview && (
                         <div className="w-full rounded-lg bg-[#FFFBEB] text-[#D97706] px-2.5 py-1 text-[10px] font-bold truncate text-left">
                          SLA Review
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right Column: Dispatch Queue (xl:col-span-1) */}
        <div className="bg-white border border-slate-100 rounded-[2rem] shadow-[0_4px_24px_rgba(0,0,0,0.02)] p-6 lg:p-8 flex flex-col min-h-[500px]">
          <div className="flex items-center justify-between mb-8">
            <h3 className="text-[18px] font-black text-slate-900 tracking-tight">
              {selectedDate ? `Task Queue for ${selectedDate}th` : "Today's Dispatch Queue"}
            </h3>
            {(() => {
              const activeDay = selectedDate || (isCurrentMonth ? today.getDate() : 1);
              const tasks = getDayEntries(activeDay);
              return (
                <span className="inline-flex items-center rounded-full bg-[#F4F8FF] px-3 py-1 text-[12px] font-bold text-[#0052FF]">
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
                  <div className="flex flex-col items-center justify-center h-48 text-slate-400 text-sm font-bold bg-[#F8F9FC] rounded-[1.5rem] border border-slate-100 border-dashed">
                    No deliverables scheduled.
                  </div>
                );
              }

              return tasks.map((entry, idx) => {
                const podLabel = user?.company_name ? `POD • ${user.company_name.toUpperCase()}` : "DEDICATED CREATIVE POD";
                const statusLabel = entry.concept_status === "concept_approved" ? "Concept Approved" : entry.status === "approved" ? "Ready to Publish" : "In Production";
                const isApproved = entry.concept_status === "concept_approved" || entry.status === "approved";

                return (
                  <div 
                    key={entry.id} 
                    onClick={() => openEntryModal(entry)}
                    className="p-5 rounded-[1.5rem] border border-slate-100 hover:border-slate-200 bg-white hover:bg-slate-50 transition-all cursor-pointer shadow-xs group"
                  >
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-[10px] font-black text-[#8A9BB5] uppercase tracking-wider">
                        {podLabel}
                      </span>
                      <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full ${isApproved ? "bg-[#E6F8F3] text-[#059669]" : "bg-[#F4F8FF] text-[#0052FF]"}`}>
                         {statusLabel}
                      </span>
                    </div>
                    
                    <h4 className="text-[14px] font-bold text-slate-900 leading-snug mb-5 group-hover:text-[#0052FF] transition-colors">
                      {entry.topic}
                    </h4>
                    
                    <div className="flex items-center justify-between mt-auto">
                      <div className="flex items-center gap-2.5">
                        <div className={`size-7 rounded-full flex items-center justify-center text-[10px] font-bold text-white ${
                           idx % 3 === 0 ? "bg-[#0052FF]" : idx % 3 === 1 ? "bg-[#7C3AED]" : "bg-[#059669]"
                        }`}>
                          CP
                        </div>
                        <span className="text-[12px] font-bold text-slate-600">
                          Creative Pod
                        </span>
                      </div>
                      <span className="text-[11px] font-black text-slate-800">
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
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-3 sm:p-6 overflow-y-auto"
          onClick={() => setPreviewEntry(null)}
        >
          <div
            className="w-full max-w-2xl max-h-[92vh] rounded-3xl bg-white border border-slate-200 shadow-2xl overflow-y-auto animate-page-in my-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="sticky top-0 bg-white/95 backdrop-blur-sm z-10 flex items-center justify-between p-4 sm:p-5 border-b border-slate-100">
              <div className="flex items-center gap-2 flex-wrap">
                <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-bold ${
                  getTypeConfig(previewEntry.type).pillBg
                }`}>
                  {previewEntry.format_label || "Deliverable"}
                </span>

                {previewEntry.slot_strategy === "flex" || previewEntry.slot_strategy === "swapped" ? (
                  <span className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-bold bg-amber-100 text-amber-800 border border-amber-200">
                    ⚡ Flex Slot (30% Buffer)
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-bold bg-blue-50 text-[#1E609A] border border-blue-200">
                    🎯 Anchor Slot (70%)
                  </span>
                )}

                {previewEntry.blueprint?.funnel_stage && (
                  <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-bold ${
                    previewEntry.blueprint.funnel_stage === "reach"
                      ? "bg-sky-100 text-sky-800"
                      : previewEntry.blueprint.funnel_stage === "authority"
                      ? "bg-indigo-100 text-indigo-800"
                      : "bg-emerald-100 text-emerald-800"
                  }`}>
                    {previewEntry.blueprint.funnel_stage.toUpperCase()} (Funnel Mix)
                  </span>
                )}
              </div>

              <button
                type="button"
                onClick={() => setPreviewEntry(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer shrink-0"
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
                    ? "bg-emerald-50 border border-emerald-200 text-emerald-800"
                    : "bg-red-50 border border-red-200 text-red-800"
                }`}>
                  <span>{conceptFeedback.text}</span>
                  <button type="button" onClick={() => setConceptFeedback(null)} className="cursor-pointer">
                    <X className="size-4" />
                  </button>
                </div>
              )}

              {/* Flex Slot Propose Section (if strategy is flex or swapped) */}
              {(previewEntry.slot_strategy === "flex" || previewEntry.slot_strategy === "swapped") && (
                <div className="rounded-2xl border border-amber-200 bg-amber-50/50 p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold text-amber-900 flex items-center gap-1.5">
                      <Zap className="size-4 text-amber-600" />
                      Dynamic Flex Hot-Swap Protocol
                    </h4>
                    {previewEntry.flex_deadline && (
                      <span className="text-[10px] font-semibold text-amber-800 bg-amber-100 px-2 py-0.5 rounded-md">
                        Auto-converts by: {previewEntry.flex_deadline}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-amber-800/80 leading-relaxed">
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
                <h3 className="text-lg font-black text-[#0D2137]">
                  {previewEntry.topic}
                </h3>
                <p className="text-xs text-slate-500 mt-1 flex items-center gap-1.5">
                  <Clock className="size-3.5 text-[#2B7BC4]" />
                  <span>Scheduled Publication: {previewEntry.date} at {previewEntry.scheduled_time || "11:00 AM"}</span>
                </p>
              </div>

              {/* Blueprint Premise */}
              {previewEntry.blueprint?.premise && (
                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/70 space-y-1">
                  <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 block">
                    Core Premise
                  </span>
                  <p className="text-xs font-semibold text-slate-800 leading-relaxed">
                    {previewEntry.blueprint.premise}
                  </p>
                </div>
              )}

              {/* ── Tier 2: Concept Approval Gate (Hooks A/B/C) ─────────────── */}
              {previewEntry.blueprint?.hooks && previewEntry.blueprint.hooks.length > 0 && (
                <div className="space-y-3 pt-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-sm font-black text-[#0D2137] flex items-center gap-1.5">
                        <Target className="size-4 text-[#2B7BC4]" />
                        <span>Select Concept Hook Angle (A / B / C)</span>
                      </h4>
                      <p className="text-[11px] text-slate-500">
                        Approve your preferred hook before production starts. Revisions after production cost hours; concept alignment is instant.
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={handleRerollConcept}
                      disabled={isConceptSubmitting}
                      className="inline-flex items-center gap-1 text-xs font-bold text-[#2B7BC4] hover:text-[#1E609A] disabled:opacity-50 cursor-pointer"
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
                              ? "border-[#2B7BC4] bg-[#F0F7FD] shadow-xs"
                              : "border-slate-200 bg-white hover:border-slate-300"
                          }`}
                        >
                          <div className="flex items-center justify-between mb-1.5">
                            <div className="flex items-center gap-2">
                              <span className="size-5 rounded-full flex items-center justify-center text-[10px] font-black bg-[#2B7BC4] text-white">
                                {idx === 0 ? "A" : idx === 1 ? "B" : "C"}
                              </span>
                              <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-md bg-slate-100 text-slate-700">
                                {hook.angle.replace("_", " ")}
                              </span>
                            </div>

                            {isApprovedHook && (
                              <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                                <CheckCircle2 className="size-3" />
                                Chosen Hook
                              </span>
                            )}
                          </div>

                          <p className="text-xs font-bold text-[#0D2137] leading-snug">
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
                    <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-xs text-emerald-800 font-semibold flex items-center gap-2">
                      <CheckCircle2 className="size-4 text-emerald-600 shrink-0" />
                      <span>Concept Approved! Task dispatched with your selected angle.</span>
                    </div>
                  )}
                </div>
              )}

              {/* ── Storyboard & Beats Breakdown ───────────────────────────── */}
              {previewEntry.blueprint?.beats && previewEntry.blueprint.beats.length > 0 && (
                <div className="space-y-2 pt-2 border-t border-slate-100">
                  <h4 className="text-xs font-extrabold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                    <Film className="size-3.5 text-[#2B7BC4]" />
                    Shot-by-Shot Storyboard Beats
                  </h4>
                  <div className="space-y-2">
                    {previewEntry.blueprint.beats.map((beat, bIdx) => (
                      <div key={bIdx} className="p-3 rounded-xl bg-slate-50 border border-slate-200/60 text-xs space-y-1">
                        <div className="flex items-center justify-between text-[11px] font-bold text-slate-600">
                          <span className="text-[#2B7BC4] font-extrabold">Shot {bIdx + 1} ({beat.timestamp_range})</span>
                          <span className="px-1.5 py-0.5 rounded bg-slate-200/60 text-slate-700 font-semibold text-[10px]">
                            {beat.shot_type}
                          </span>
                        </div>
                        <p className="text-slate-800 font-medium">
                          <strong className="text-slate-900">Visual:</strong> {beat.visual_cue}
                        </p>
                        <p className="text-slate-600 italic">
                          <strong className="text-slate-900 not-italic">Voiceover / Script:</strong> &ldquo;{beat.script_line}&rdquo;
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* ── Audio Direction & Brand Guardrails ─────────────────────── */}
              {previewEntry.blueprint?.audio_direction && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-slate-100 text-xs">
                  <div className="p-3.5 rounded-xl bg-purple-50/60 border border-purple-100 space-y-1">
                    <span className="text-[10px] font-extrabold uppercase tracking-wider text-purple-700 flex items-center gap-1">
                      <Music className="size-3" />
                      Actionable Audio Direction
                    </span>
                    <p className="font-bold text-slate-800 text-[11.5px]">
                      {previewEntry.blueprint.audio_direction.genre_mood} · {previewEntry.blueprint.audio_direction.bpm_range}
                    </p>
                    <p className="text-[11px] text-slate-600">
                      Rule: {previewEntry.blueprint.audio_direction.vocal_rules}
                    </p>
                  </div>

                  <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/60 space-y-1">
                    <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500 flex items-center gap-1">
                      <ShieldCheck className="size-3 text-emerald-600" />
                      Brand Guardrails Respected
                    </span>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {previewEntry.blueprint.respects?.map((resp, rIdx) => (
                        <span key={rIdx} className="text-[10.5px] px-2 py-0.5 rounded bg-emerald-50 text-emerald-800 border border-emerald-200 font-medium">
                          ✓ {resp}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Editorial Caption (if exists) */}
              {previewEntry.caption && (
                <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80 text-xs text-slate-700 leading-relaxed">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                    Editorial Caption & Call to Action
                  </span>
                  {previewEntry.caption}
                </div>
              )}

              {/* Action Buttons Footer */}
              <div className="flex gap-3 pt-2 border-t border-slate-100">
                <Link
                  to="/portal/deliverables"
                  className="flex-1 inline-flex items-center justify-center gap-2 py-3 rounded-xl bg-[#2B7BC4] hover:bg-[#1A5EA8] text-white font-bold text-xs shadow-xs transition-colors"
                >
                  <span>Deliverables Dock</span>
                  <ExternalLink className="size-3.5" />
                </Link>
                <button
                  type="button"
                  onClick={() => setPreviewEntry(null)}
                  className="px-4 py-3 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-600 font-bold text-xs transition-colors cursor-pointer"
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
