import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Megaphone,
  Cpu,
  Wrench,
  X,
  ChevronDown,
  ChevronUp,
  Tag,
  Clock,
  CheckCircle2,
} from "lucide-react";
import { request } from "../../lib/http";
import type { Announcement } from "../../types/api";

export function PortalAnnouncements() {
  const [dismissedIds, setDismissedIds] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem("creo_dismissed_announcements");
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });
  const [showAll, setShowAll] = useState(false);

  const { data: announcements = [], isLoading } = useQuery<Announcement[]>({
    queryKey: ["portal-announcements"],
    queryFn: async () => {
      const data = await request<Announcement[]>("/api/v1/portal/announcements");
      return Array.isArray(data) ? data : [];
    },
    refetchInterval: 30000,
  });

  const dismissAnnouncement = (id: string) => {
    setDismissedIds((prev) => {
      const next = [...prev, id];
      try {
        localStorage.setItem("creo_dismissed_announcements", JSON.stringify(next));
      } catch {
        // ignore storage errors
      }
      return next;
    });
  };

  const resetDismissed = () => {
    setDismissedIds([]);
    try {
      localStorage.removeItem("creo_dismissed_announcements");
    } catch {
      // ignore
    }
  };

  if (isLoading || announcements.length === 0) {
    return null;
  }

  const activeAnnouncements = announcements.filter(
    (a) => !dismissedIds.includes(a.id)
  );

  const displayedAnnouncements = showAll ? announcements : activeAnnouncements;

  if (displayedAnnouncements.length === 0 && dismissedIds.length > 0) {
    return (
      <div className="flex items-center justify-between px-4 py-2 rounded-xl bg-slate-50 border border-slate-200/70 text-xs text-slate-500">
        <span className="flex items-center gap-1.5">
          <CheckCircle2 className="size-3.5 text-emerald-600" />
          All recent announcements caught up
        </span>
        <button
          type="button"
          onClick={resetDismissed}
          className="text-xs font-semibold text-[#2B7BC4] hover:underline cursor-pointer"
        >
          View ({dismissedIds.length}) dismissed
        </button>
      </div>
    );
  }

  if (displayedAnnouncements.length === 0) {
    return null;
  }

  const getTypeConfig = (type: string) => {
    switch (type?.toLowerCase()) {
      case "system":
        return {
          icon: <Cpu className="size-4 text-indigo-600" />,
          badgeClass: "bg-indigo-50 text-indigo-700 border-indigo-200",
          cardBorder: "border-indigo-100",
          cardBg: "from-indigo-50/40 via-white to-white",
          label: "System Upgrade",
        };
      case "maintenance":
        return {
          icon: <Wrench className="size-4 text-rose-600" />,
          badgeClass: "bg-rose-50 text-rose-700 border-rose-200",
          cardBorder: "border-rose-100",
          cardBg: "from-rose-50/40 via-white to-white",
          label: "Maintenance",
        };
      case "broadcast":
      default:
        return {
          icon: <Megaphone className="size-4 text-[#2B7BC4]" />,
          badgeClass: "bg-sky-50 text-sky-700 border-sky-200",
          cardBorder: "border-[#C9DFF0]/70",
          cardBg: "from-[#E8F4FD]/40 via-white to-white",
          label: "Broadcast",
        };
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between px-1">
        <div className="flex items-center gap-2">
          <span className="flex h-2 w-2 rounded-full bg-[#2B7BC4] animate-ping" />
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500">
            Agency Updates & Technical Bulletins
          </h2>
          <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-600">
            {displayedAnnouncements.length}
          </span>
        </div>
        {dismissedIds.length > 0 && (
          <button
            type="button"
            onClick={() => setShowAll(!showAll)}
            className="text-[11px] font-semibold text-[#2B7BC4] hover:underline flex items-center gap-1 cursor-pointer"
          >
            {showAll ? (
              <>
                Hide dismissed <ChevronUp className="size-3" />
              </>
            ) : (
              <>
                Show all ({announcements.length}) <ChevronDown className="size-3" />
              </>
            )}
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
        {displayedAnnouncements.map((item) => {
          const config = getTypeConfig(item.type);
          const isDismissed = dismissedIds.includes(item.id);

          return (
            <div
              key={item.id}
              className={`relative flex flex-col justify-between rounded-2xl border ${config.cardBorder} bg-gradient-to-br ${config.cardBg} p-4.5 shadow-2xs transition-all hover:shadow-xs ${
                isDismissed ? "opacity-60" : ""
              }`}
            >
              <div>
                <div className="flex items-start justify-between gap-3 mb-2.5">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span
                      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${config.badgeClass}`}
                    >
                      {config.icon}
                      {item.type || config.label}
                    </span>

                    {item.target_departments?.map((dept) => (
                      <span
                        key={dept}
                        className="inline-flex items-center gap-1 rounded-md bg-white border border-slate-200/80 px-2 py-0.5 text-[10px] font-medium text-slate-600 shadow-2xs"
                      >
                        <Tag className="size-2.5 text-slate-400" />
                        {dept}
                      </span>
                    ))}
                  </div>

                  {!isDismissed && (
                    <button
                      type="button"
                      onClick={() => dismissAnnouncement(item.id)}
                      className="rounded-lg p-1 text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
                      title="Dismiss notice"
                      aria-label="Dismiss notice"
                    >
                      <X className="size-3.5" />
                    </button>
                  )}
                </div>

                <h3 className="text-sm font-bold text-[#0D2137] tracking-tight leading-snug">
                  {item.title}
                </h3>
                <p className="mt-1.5 text-xs text-slate-600 leading-relaxed">
                  {item.content}
                </p>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-200/60 flex items-center justify-between text-[11px] text-slate-400">
                <span className="font-medium text-slate-500">
                  {item.author ? `From ${item.author}` : "Operations Team"}
                </span>
                <span className="flex items-center gap-1">
                  <Clock className="size-3 text-slate-400" />
                  {item.created_at
                    ? new Date(item.created_at).toLocaleDateString(undefined, {
                        month: "short",
                        day: "numeric",
                      })
                    : "Active"}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
