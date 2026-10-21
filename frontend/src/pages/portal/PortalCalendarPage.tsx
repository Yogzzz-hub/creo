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
  badgeBg: "bg-app-accent",
  badgeText: "text-hi",
  border: "border-blue-500/30",
  softBg: "bg-blue-500/15 text-app-accent hover:bg-blue-500/25 border border-blue-500/30",
  pillBg: "bg-blue-500/15 text-app-accent border border-blue-500/30",
};

const TYPE_CONFIG: Record<string, TypeConfig> = {
  reel: {
    label: "Reel",
    icon: Film,
    badgeBg: "bg-purple-600",
    badgeText: "text-hi",
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
    badgeText: "text-hi",
    border: "border-amber-500/30",
    softBg: "bg-amber-500/15 text-amber-400 hover:bg-amber-500/25 border border-amber-500/30",
    pillBg: "bg-amber-500/15 text-amber-400 border border-amber-500/30",
  },
  carousel: {
    label: "Carousel",
    icon: Layers,
    badgeBg: "bg-amber-600",
    badgeText: "text-hi",
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

  const [mobileView, setMobileView] = useState<"week" | "month">("week");

  const activeDayNumber = selectedDate || (isCurrentMonth ? today.getDate() : 1);

  const activeWeekDays = useMemo(() => {
    const refDate = new Date(currentYear, currentMonth, activeDayNumber);
    const dayOfWeek = refDate.getDay();
    const sunday = new Date(currentYear, currentMonth, activeDayNumber - dayOfWeek);

    return Array.from({ length: 7 }).map((_, i) => {
      const d = new Date(sunday.getFullYear(), sunday.getMonth(), sunday.getDate() + i);
      const day = d.getDate();
      const month = d.getMonth();
      const year = d.getFullYear();
      const isThisMonth = month === currentMonth && year === currentYear;
      const isToday = today.getFullYear() === year && today.getMonth() === month && today.getDate() === day;
      const isSelected = selectedDate ? (selectedDate === day && month === currentMonth && year === currentYear) : (isToday && isThisMonth);
      const dayName = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"][i];

      const dStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
      const dayEntries = entries.filter((e) => {
        if (!e.date) return false;
        return e.date.startsWith(dStr);
      });

      return {
        date: d,
        day,
        month,
        year,
        dayName,
        isThisMonth,
        isToday,
        isSelected,
        entries: dayEntries,
      };
    });
  }, [currentYear, currentMonth, activeDayNumber, selectedDate, today, entries]);

  const navigateWeek = (direction: number) => {
    const refDate = new Date(currentYear, currentMonth, activeDayNumber + direction * 7);
    setCurrentYear(refDate.getFullYear());
    setCurrentMonth(refDate.getMonth());
    setSelectedDate(refDate.getDate());
  };

  const getDotColor = (kind?: string) => {
    const k = (kind || "").toLowerCase();
    if (k.includes("reel")) return "bg-purple-500";
    if (k.includes("story") || k.includes("carousel")) return "bg-amber-400";
    if (k.includes("shoot") || k.includes("approved")) return "bg-emerald-400";
    return "bg-blue-400";
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
    return <div role="alert" className="p-6 text-hi">Could not load your calendar. <button onClick={() => refetchEntries()} className="underline">Retry</button></div>;
  }

  return (
    <div className="flex w-full min-w-0 flex-col gap-3 md:gap-4 font-sans text-hi">
      {/* ── Bento Grid Layout ──────────────────────────────────────── */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-3 md:gap-4 items-stretch">
        
        {/* Left Column: Calendar View (xl:col-span-2) */}
        <div className="flex xl:col-span-2 bg-app-surface border border-app-line rounded-xl md:rounded-2xl shadow-[0_4px_24px_rgb(var(--shadow-rgb)/calc(0.2*var(--shadow-k)))] p-3 sm:p-5 min-w-0 flex-col">
          {/* Calendar Header */}
          <div className="flex items-center justify-between gap-2 mb-2 sm:mb-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:gap-2.5">
              <h2 className="text-sm sm:text-lg md:text-[20px] font-black text-hi tracking-tight leading-tight">
                {MONTH_NAMES[currentMonth]} {currentYear}
              </h2>
              <span className="text-[11px] sm:text-xs text-slate-400 font-medium">
                {monthEntries.length} {monthEntries.length === 1 ? "item" : "items"}
              </span>
            </div>
            
            <div className="flex items-center gap-1 sm:gap-2">
              {/* Mobile View Toggle: Week vs Month (hidden on desktop) */}
              <div className="md:hidden flex items-center bg-app-base p-0.5 rounded-full border border-app-line">
                <button
                  type="button"
                  onClick={() => setMobileView("week")}
                  className={`px-2 py-0.5 rounded-full text-[11px] font-bold transition-all cursor-pointer ${
                    mobileView === "week"
                      ? "bg-app-accent-soft text-app-base shadow-xs"
                      : "text-app-mist hover:text-hi"
                  }`}
                >
                  Week
                </button>
                <button
                  type="button"
                  onClick={() => setMobileView("month")}
                  className={`px-2 py-0.5 rounded-full text-[11px] font-bold transition-all cursor-pointer ${
                    mobileView === "month"
                      ? "bg-app-accent-soft text-app-base shadow-xs"
                      : "text-app-mist hover:text-hi"
                  }`}
                >
                  Month
                </button>
              </div>

              {user?.role === "client" && (
                <button type="button" disabled={isRebalancing} onClick={rebuildDraftSchedule} className="hidden sm:inline-flex rounded-full border border-app-line px-2.5 sm:px-3 py-1 sm:py-1.5 text-[11px] sm:text-xs disabled:opacity-60">
                  {isRebalancing ? "Updating schedule…" : "Rebuild draft schedule"}
                </button>
              )}
              <button
                type="button"
                onClick={() => { setSelectedDate(today.getDate()); goToToday(); }}
                className="px-2 sm:px-3.5 py-1 sm:py-1.5 text-[11px] sm:text-xs font-bold text-slate-200 hover:text-hi bg-app-base/80 hover:bg-app-base rounded-full border border-app-line shadow-2xs transition-all cursor-pointer"
              >
                Today
              </button>
              <div className="flex items-center bg-app-base/80 border border-app-line rounded-full p-0.5 shadow-2xs">
                <button
                  onClick={() => {
                    if (mobileView === "week") {
                      navigateWeek(-1);
                    } else {
                      setSelectedDate(null);
                      navigateMonth(-1);
                    }
                  }}
                  className="p-1 sm:p-1.5 text-slate-400 hover:text-hi rounded-full transition-all cursor-pointer"
                  aria-label="Previous"
                >
                  <ChevronLeft className="size-3.5 sm:size-4" strokeWidth={2.5} />
                </button>
                <div className="w-[1px] h-3.5 sm:h-4 bg-app-line mx-0.5 sm:mx-1"></div>
                <button
                  onClick={() => {
                    if (mobileView === "week") {
                      navigateWeek(1);
                    } else {
                      setSelectedDate(null);
                      navigateMonth(1);
                    }
                  }}
                  className="p-1 sm:p-1.5 text-slate-400 hover:text-hi rounded-full transition-all cursor-pointer"
                  aria-label="Next"
                >
                  <ChevronRight className="size-3.5 sm:size-4" strokeWidth={2.5} />
                </button>
              </div>
            </div>
          </div>

          <div className="hidden md:flex overflow-x-auto whitespace-nowrap scrollbar-hide gap-1.5 sm:gap-2 mb-2.5 sm:mb-3 text-xs text-slate-300 min-h-[28px] -mx-1 px-1 sm:mx-0 sm:px-0 md:flex-wrap" aria-label="Monthly content totals">
            {["reel", "poster", "story", "carousel"].map((kind) => {
              const count = monthEntries.filter(entry => (entry.type || entry.slot_kind) === kind).length;
              const config = getTypeConfig(kind);
              const Icon = config.icon;
              const pluralLabel = count > 1 ? (kind === "story" ? "Stories" : `${config.label}s`) : config.label;
              return count > 0 ? (
                <span key={kind} className="inline-flex items-center gap-1.5 rounded-lg border border-app-line bg-app-base/60 px-2 sm:px-2.5 py-0.5 sm:py-1 font-semibold text-slate-200 text-[11px] sm:text-xs shrink-0">
                  <Icon className="size-3 sm:size-3.5 shrink-0 stroke-[2.2] text-app-accent" />
                  <span>{count} {pluralLabel}</span>
                </span>
              ) : null;
            })}
            <span className="px-2 py-0.5 sm:py-1 text-[11px] sm:text-xs text-app-mist shrink-0">{monthEntries.length} planned this month</span>
          </div>
          {scheduleMessage && <p role="status" className="mb-2 sm:mb-3 text-xs sm:text-sm text-slate-300">{scheduleMessage}</p>}

          {/* ── MOBILE WEEK STRIP (< md) ── */}
          {mobileView === "week" && (
            <div className="md:hidden grid grid-cols-7 gap-1 sm:gap-1.5 pb-1">
              {activeWeekDays.map((dayItem) => {
                return (
                  <button
                    key={`${dayItem.month}-${dayItem.day}`}
                    type="button"
                    onClick={() => {
                      setSelectedDate(dayItem.day);
                      if (dayItem.month !== currentMonth || dayItem.year !== currentYear) {
                        setCurrentMonth(dayItem.month);
                        setCurrentYear(dayItem.year);
                      }
                    }}
                    className={`rounded-xl py-2 px-0.5 text-center cursor-pointer flex flex-col items-center justify-between transition-all border ${
                      dayItem.isSelected
                        ? "border-app-accent bg-app-accent/15 ring-1 ring-app-accent/30 text-hi font-black"
                        : dayItem.isToday
                        ? "border-app-accent/40 bg-app-surface text-app-accent"
                        : "border-app-line bg-app-base/60 text-slate-300 hover:border-app-accent/40"
                    }`}
                  >
                    <span className="text-[9px] font-bold text-app-mist uppercase tracking-wider">{dayItem.dayName}</span>
                    <span className={`text-xs sm:text-sm font-black my-1 ${dayItem.isSelected ? "text-hi" : dayItem.isToday ? "text-app-accent" : "text-slate-200"}`}>
                      {dayItem.day}
                    </span>
                    {/* Colored indicator dots */}
                    <div className="flex items-center justify-center gap-0.5 min-h-[6px]">
                      {dayItem.entries.slice(0, 3).map((entry, idx) => (
                        <span key={entry.id || idx} className={`w-1.5 h-1.5 rounded-full ${getDotColor(entry.type || entry.slot_kind)}`} />
                      ))}
                    </div>
                  </button>
                );
              })}
            </div>
          )}

          {/* ── MOBILE MONTH GRID (< md, only when Month toggled) ── */}
          {mobileView === "month" && (
            <div className="md:hidden flex flex-col">
              <div className="grid grid-cols-7 mb-1 text-center">
                {["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"].map((day: string) => (
                  <div key={day} className="text-[9px] font-black text-app-mist uppercase tracking-wider">
                    {day}
                  </div>
                ))}
              </div>
              <div className="grid grid-cols-7 gap-1">
                {calendarCells.map((cell) => {
                  if (!cell.isCurrentMonth) {
                    return <div key={cell.key} className="aspect-square bg-transparent p-0.5"></div>;
                  }
                  const day = cell.day;
                  const dayEntries = getDayEntries(day);
                  const isTodayCell = isCurrentMonth && today.getDate() === day;
                  const isSelected = selectedDate === day;

                  return (
                    <button
                      key={cell.key}
                      type="button"
                      onClick={() => setSelectedDate(day)}
                      className={`aspect-square rounded-lg p-1 transition-all cursor-pointer flex flex-col items-center justify-between border ${
                        isSelected
                          ? "border-app-accent bg-app-accent/15 ring-1 ring-app-accent/30 text-hi font-bold"
                          : isTodayCell
                          ? "border-app-accent/40 bg-app-surface text-app-accent"
                          : "border-app-line bg-app-base/40 text-slate-300"
                      }`}
                    >
                      <span className="text-[11px] font-bold leading-none">{day}</span>
                      <div className="flex items-center justify-center gap-0.5 min-h-[4px]">
                        {dayEntries.slice(0, 3).map((entry, idx) => (
                          <span key={entry.id || idx} className={`w-1.5 h-1.5 rounded-full ${getDotColor(entry.type || entry.slot_kind)}`} />
                        ))}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* ── DESKTOP MONTH GRID (md: and up - strictly preserved) ── */}
          <div className="hidden md:flex flex-1 flex-col min-h-[300px] sm:min-h-[380px] md:min-h-[460px]">
            {/* Weekday Headers */}
            <div className="grid grid-cols-7 mb-1.5 sm:mb-2">
              {["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"].map((day: string) => (
                <div key={day} className="py-0.5 sm:py-1 text-center text-[10px] sm:text-xs font-black text-app-mist uppercase tracking-wider">
                  {day}
                </div>
              ))}
            </div>

            {/* Calendar Cells */}
            <div className="grid grid-cols-7 gap-1 sm:gap-2 flex-1 auto-rows-fr">
              {calendarCells.map((cell) => {
                if (!cell.isCurrentMonth) {
                  return (
                    <div key={cell.key} className="rounded-lg sm:rounded-xl bg-transparent p-0.5 sm:p-1"></div>
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
                    className={`relative rounded-lg sm:rounded-xl p-1 sm:p-2 min-w-0 transition-all cursor-pointer min-h-[52px] sm:min-h-[80px] md:min-h-[110px] flex flex-col justify-between border group ${
                      isSelected 
                        ? "border-blue-500 bg-app-accent/15 ring-2 ring-blue-500/20 shadow-lg scale-[1.01] z-10"
                        : isTodayCell
                        ? "border-app-accent/40 bg-app-surface shadow-sm"
                        : "border-app-line hover:border-app-accent/40 bg-app-base/40 hover:bg-app-surface shadow-xs"
                    }`}
                  >
                    <span className={`text-xs sm:text-base md:text-lg font-black ${
                      isSelected ? "text-hi" : isTodayCell ? "text-app-accent" : "text-slate-300 group-hover:text-hi"
                    }`}>
                      {day}
                    </span>
                    
                    <div className="mt-auto flex flex-col gap-0.5 sm:gap-1 w-full">
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
                            className="inline-flex items-center gap-0.5 sm:gap-1 rounded-md bg-blue-500/15 text-app-accent-soft px-1 sm:px-1.5 py-0.5 text-[8px] sm:text-[11px] font-bold leading-tight truncate hover:bg-blue-500/25 transition-colors border border-blue-500/20"
                            title={`${count} ${pluralLabel}`}
                          >
                            <Icon className="size-2 sm:size-3 shrink-0 stroke-[2.2] text-app-accent" />
                            <span className="truncate">{count} <span className="hidden sm:inline">{pluralLabel}</span></span>
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
        <div className="xl:col-span-1 bg-app-surface border border-app-line rounded-xl md:rounded-2xl shadow-[0_4px_24px_rgb(var(--shadow-rgb)/calc(0.2*var(--shadow-k)))] p-3 sm:p-5 flex flex-col h-full min-w-0">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-lg sm:text-[20px] font-black text-hi tracking-tight">
              {selectedDate ? `Task Queue for ${selectedDate}th` : "Today's Dispatch Queue"}
            </h3>
            {(() => {
              const activeDay = selectedDate || (isCurrentMonth ? today.getDate() : 1);
              const tasks = getDayEntries(activeDay);
              return (
                <span className="inline-flex items-center rounded-full bg-app-surface border border-app-line px-2.5 py-0.5 text-[11px] font-bold text-app-accent">
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
                <span className="inline-flex items-center gap-1.5 rounded-lg border border-app-line px-2.5 py-1 font-semibold text-app-accent bg-app-base/60">
                  <Sparkles className="size-3.5 shrink-0 stroke-[2.2] text-app-accent" />
                  <span>{tasks.length} {tasks.length === 1 ? 'Deliverable' : 'Deliverables'}</span>
                </span>
                <span className="px-2 py-1 text-app-mist">
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
                  <div className="flex flex-col items-center justify-center flex-1 min-h-[200px] h-full p-5 text-app-mist text-sm font-bold bg-app-base/60 rounded-xl border-2 border-dashed border-app-line text-center shadow-inner space-y-2">
                    <div className="w-10 h-10 rounded-full bg-app-surface border border-app-line flex items-center justify-center text-app-accent mb-1">
                      <Clock className="w-5 h-5" />
                    </div>
                    <span className="text-slate-200 font-bold">No deliverables scheduled.</span>
                    <span className="text-xs text-app-mist font-normal max-w-[220px]">
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
                    className="p-3.5 sm:p-4 rounded-xl border border-app-line hover:border-app-accent/50 bg-app-base/70 hover:bg-app-base transition-all cursor-pointer shadow-xs group space-y-2.5"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        {(() => {
                          const kind = entry.type || entry.slot_kind || "poster";
                          const cfg = getTypeConfig(kind);
                          const CardIcon = cfg.icon;
                          return (
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-md bg-blue-500/15 text-app-accent-soft border border-blue-500/30 shrink-0">
                              <CardIcon className="size-3 shrink-0 stroke-[2.2] text-app-accent" />
                              <span>{cfg.label}</span>
                            </span>
                          );
                        })()}
                        <span className="text-[10px] font-black text-app-accent uppercase tracking-wider truncate">
                          {podLabel}
                        </span>
                      </div>
                      <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full border shrink-0 ${isApproved ? "bg-blue-600/30 text-app-accent-soft border-blue-500/30" : "bg-blue-950/80 text-blue-300 border-blue-700/50"}`}>
                         {statusLabel}
                      </span>
                    </div>
                    
                    <h4 className="text-[14px] font-bold text-hi leading-snug group-hover:text-app-accent transition-colors">
                      {entry.topic}
                    </h4>
                    
                    <div className="flex items-center justify-between pt-2 border-t border-app-line/60 mt-auto">
                      <div className="flex items-center gap-2.5">
                        <div className="size-7 rounded-full flex items-center justify-center text-[10px] font-bold text-white bg-app-accent">
                          CP
                        </div>
                        <span className="text-[12px] font-bold text-slate-300">
                          Creative Pod
                        </span>
                      </div>
                      <span className="text-[11px] font-black text-app-accent">
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
            className="w-full max-w-2xl max-h-[90vh] rounded-3xl bg-app-surface border border-app-line text-hi shadow-2xl overflow-y-auto flex flex-col relative m-auto animate-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="sticky top-0 bg-app-surface/95 backdrop-blur-sm z-10 flex items-center justify-between p-4 sm:p-5 border-b border-app-line">
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
                className="p-1 rounded-lg text-app-mist hover:text-hi hover:bg-app-line transition-colors cursor-pointer shrink-0"
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
                <h3 className="text-lg font-black text-hi leading-snug">
                  {previewEntry.topic || previewEntry.title}
                </h3>
                <p className="text-xs text-app-mist mt-1.5 flex items-center gap-1.5 font-medium">
                  <Clock className="size-3.5 text-app-accent" />
                  <span>Scheduled Publication: {previewEntry.date} · {previewEntry.scheduled_time || "11:00 AM"}</span>
                </p>
              </div>

              {/* What this story is about */}
              <div className="p-4 rounded-2xl bg-app-base border border-app-line space-y-2">
                <div className="flex items-center gap-1.5 text-[11px] font-extrabold uppercase tracking-wider text-app-accent">
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
              <div className="p-4 rounded-2xl bg-app-accent/10 border border-app-accent/25 space-y-2.5">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <div className="flex items-center gap-2">
                    <span className="size-2 rounded-full bg-app-accent animate-pulse" />
                    <span className="text-[11px] font-extrabold uppercase tracking-wider text-app-accent">
                      Approval Requested For
                    </span>
                  </div>
                  <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-app-accent/20 text-app-accent-soft border border-app-accent/30">
                    {previewEntry.approval_type || (previewEntry.blueprint as any)?.approval_type || "Story Concept & Topic"}
                  </span>
                </div>

                {(previewEntry.team_notes || (previewEntry.blueprint as any)?.team_notes) ? (
                  <div className="text-xs text-slate-300 bg-app-base/70 p-3 rounded-xl border border-app-line space-y-1">
                    <span className="text-[10px] font-bold text-app-mist uppercase tracking-wider block">
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
                      className="py-3 px-4 rounded-xl border border-app-line bg-app-base hover:bg-app-line text-slate-200 font-bold text-xs transition-all flex items-center justify-center gap-2 cursor-pointer"
                    >
                      <MessageSquare className="size-4 text-app-accent" />
                      <span>Request Changes</span>
                    </button>
                  </div>

                  {requestChangeOpen && (
                    <div className="p-4 rounded-xl bg-app-base border border-app-line space-y-3 animate-in fade-in duration-150">
                      <label className="text-xs font-bold text-hi block">
                        What changes would you like the team to make?
                      </label>
                      <textarea
                        value={changeNotes}
                        onChange={(e) => setChangeNotes(e.target.value)}
                        placeholder="e.g. Can we focus on a different hook, or highlight our special offer more prominently?"
                        className="w-full text-xs p-3 rounded-xl bg-app-surface border border-app-line text-hi placeholder:text-slate-500 focus:outline-none focus:border-app-accent"
                        rows={3}
                      />
                      <div className="flex justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => setRequestChangeOpen(false)}
                          className="px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-400 hover:text-hi cursor-pointer"
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
              <div className="flex gap-3 pt-2 border-t border-app-line">
                <Link
                  to={previewEntry.deliverable_id ? `/portal/deliverables/${previewEntry.deliverable_id}` : "/portal/deliverables"}
                  className="flex-1 inline-flex items-center justify-center gap-2 py-3 rounded-xl bg-app-surface border border-app-line hover:border-app-accent/50 text-hi font-bold text-xs transition-colors"
                >
                  <span>Deliverables Dock</span>
                  <ExternalLink className="size-3.5 text-app-accent" />
                </Link>
                <button
                  type="button"
                  onClick={() => setPreviewEntry(null)}
                  className="px-5 py-3 rounded-xl border border-app-line bg-app-base hover:bg-app-line text-app-ink-2 font-bold text-xs transition-colors cursor-pointer"
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
