import { useState, useEffect, useRef, useCallback } from "react";
import { Megaphone, X, AlertTriangle, Cpu, Sparkles } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { request } from "../../lib/http";

/**
 * AnnouncementToast — displays newly broadcast announcements in a crisp,
 * executive Light Mode floating toast. After 3.5 seconds (or on click/dismiss),
 * it animates along a smooth parabolic flight trajectory straight into the
 * header notification bell, rings the bell, pulses the badge, and marks
 * the announcement as seen.
 *
 * Supported across all dashboards (Client Portal & Admin Ops).
 */

interface Announcement {
  id: string;
  title: string;
  content: string;
  type: string;
  author?: string;
  created_at?: string;
  created_at_ist?: string;
  target_departments?: string[];
}

interface AnnouncementToastProps {
  bellRef: React.RefObject<HTMLButtonElement | null>;
  isClientPortal?: boolean;
}

const SEEN_KEY = "creo_seen_announcements";

function getSeenIds(): string[] {
  try {
    return JSON.parse(localStorage.getItem(SEEN_KEY) || "[]");
  } catch {
    return [];
  }
}

function markSeen(id: string) {
  const ids = getSeenIds();
  if (!ids.includes(id)) {
    const next = [...ids, id].slice(-100);
    try {
      localStorage.setItem(SEEN_KEY, JSON.stringify(next));
    } catch {
      // ignore
    }
  }
}

type Phase = "idle" | "visible" | "flying" | "gone";

export function AnnouncementToast({ bellRef, isClientPortal = false }: AnnouncementToastProps) {
  const queryClient = useQueryClient();
  const [queue, setQueue] = useState<Announcement[]>([]);
  const [announcement, setAnnouncement] = useState<Announcement | null>(null);
  const [phase, setPhase] = useState<Phase>("idle");
  const toastRef = useRef<HTMLDivElement>(null);

  // ── 1. Fetch announcements once on mount ──────────────────────────────────
  useEffect(() => {
    let cancelled = false;
    const endpoint = isClientPortal
      ? "/api/v1/portal/announcements"
      : "/api/v1/admin/announcements";

    request<Announcement[]>(endpoint)
      .then((data) => {
        if (cancelled || !Array.isArray(data) || data.length === 0) return;
        const seen = getSeenIds();
        const unseen = data.filter((a) => !seen.includes(a.id));
        if (unseen.length === 0) return;

        // Queue up to 2 unseen announcements so we don't overwhelm the user
        const toShow = unseen.slice(0, 2);
        setAnnouncement(toShow[0] ?? null);
        setQueue(toShow.slice(1));
        setPhase("visible");
      })
      .catch(() => {
        // Silently ignore network/auth errors
      });

    return () => {
      cancelled = true;
    };
  }, [isClientPortal]);

  // ── 2. Parabolic Flight Trigger into Bell ──────────────────────────────────
  const triggerFly = useCallback(() => {
    if (!announcement || phase === "flying" || phase === "gone") return;

    const toast = toastRef.current;
    let bell = bellRef.current;

    // If bellRef is hidden (e.g. mobile vs desktop header), find the visible notification bell
    if (!bell || bell.offsetParent === null) {
      const candidates = document.querySelectorAll<HTMLButtonElement>('button[aria-label="Notifications"]');
      for (const candidate of Array.from(candidates)) {
        if (candidate.offsetParent !== null) {
          bell = candidate;
          break;
        }
      }
    }

    if (!toast || !bell) {
      markSeen(announcement.id);
      advanceQueue();
      return;
    }

    const toastRect = toast.getBoundingClientRect();
    const bellRect = bell.getBoundingClientRect();

    // Compute translate offset from toast centre to bell centre
    const dx = bellRect.left + bellRect.width / 2 - (toastRect.left + toastRect.width / 2);
    const dy = bellRect.top + bellRect.height / 2 - (toastRect.top + toastRect.height / 2);

    // Set custom CSS variables for keyframe animation
    toast.style.setProperty("--fly-x", `${dx}px`);
    toast.style.setProperty("--fly-y", `${dy}px`);

    setPhase("flying");

    // Flight transition completes in 650ms
    setTimeout(() => {
      markSeen(announcement.id);

      // Invalidate notification queries to refresh bell badge count immediately
      queryClient.invalidateQueries({ queryKey: ["notifications"] });

      // Ring animation on the target bell icon
      if (bell) {
        bell.classList.add("creo-bell-ring");
        setTimeout(() => bell.classList.remove("creo-bell-ring"), 850);
      }

      advanceQueue();
    }, 650);
  }, [announcement, phase, bellRef, queryClient]);

  const advanceQueue = useCallback(() => {
    if (queue.length > 0) {
      setAnnouncement(null);
      setPhase("idle");
      // Small pause before popping next unseen announcement
      setTimeout(() => {
        const next = queue[0];
        setAnnouncement(next ?? null);
        setQueue((prev) => prev.slice(1));
        setPhase("visible");
      }, 700);
    } else {
      setAnnouncement(null);
      setPhase("gone");
    }
  }, [queue]);

  // ── 3. Auto-fly timer (3.5 seconds) ──────────────────────────────────────
  useEffect(() => {
    if (phase !== "visible") return;
    const timer = setTimeout(() => {
      triggerFly();
    }, 3500);

    return () => clearTimeout(timer);
  }, [phase, triggerFly]);

  if (!announcement || phase === "idle" || phase === "gone") return null;

  // ── 4. Dynamic Theme Configuration (Crisp Light Mode) ────────────────────
  const lowerType = announcement.type?.toLowerCase() || "broadcast";
  const isEmergency =
    lowerType === "emergency" ||
    lowerType === "maintenance" ||
    announcement.title.toLowerCase().includes("emergency") ||
    announcement.title.toLowerCase().includes("alert");
  const isSystem = lowerType === "system";

  const theme = isEmergency
    ? {
        accentGradient: "linear-gradient(90deg, #EF4444, #F97316)",
        badgeBg: "#FEF2F2",
        badgeBorder: "#FECACA",
        badgeText: "#B91C1C",
        iconBg: "#FEF2F2",
        iconBorder: "#FECACA",
        iconColor: "#DC2626",
        icon: <AlertTriangle size={18} className="text-red-600 shrink-0" />,
        progressFill: "#EF4444",
        typeLabel: "Urgent Alert",
      }
    : isSystem
    ? {
        accentGradient: "linear-gradient(90deg, #6366F1, #818CF8)",
        badgeBg: "#EEF2FF",
        badgeBorder: "#C7D2FE",
        badgeText: "#4338CA",
        iconBg: "#EEF2FF",
        iconBorder: "#C7D2FE",
        iconColor: "#4F46E5",
        icon: <Cpu size={18} className="text-indigo-600 shrink-0" />,
        typeLabel: "System Notice",
        progressFill: "#6366F1",
      }
    : {
        accentGradient: "linear-gradient(90deg, #2B7BC4, #38BDF8)",
        badgeBg: "#E8F4FD",
        badgeBorder: "#C9DFF0",
        badgeText: "#1E609A",
        iconBg: "#E8F4FD",
        iconBorder: "#C9DFF0",
        iconColor: "#2B7BC4",
        icon: <Megaphone size={18} className="text-[#2B7BC4] shrink-0" />,
        typeLabel: "Broadcast",
        progressFill: "#2B7BC4",
      };

  const authorName = announcement.author || "Agency Operations";

  return (
    <>
      {/* Flight & Bell Ring Scoped Keyframes */}
      <style>{`
        @keyframes creo-toast-enter {
          0% {
            opacity: 0;
            transform: translateY(36px) scale(0.95);
          }
          100% {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }
        @keyframes creo-toast-fly {
          0% {
            opacity: 1;
            transform: translate(0, 0) scale(1);
            box-shadow: 0 16px 36px -8px rgba(13, 33, 55, 0.16);
          }
          25% {
            opacity: 0.95;
            transform: translate(calc(var(--fly-x, 0px) * 0.2), calc(var(--fly-y, -200px) * 0.15 - 35px)) scale(0.85);
          }
          60% {
            opacity: 0.8;
            transform: translate(calc(var(--fly-x, 0px) * 0.65), calc(var(--fly-y, -200px) * 0.6 - 15px)) scale(0.45);
          }
          90% {
            opacity: 0.35;
            transform: translate(calc(var(--fly-x, 0px) * 0.94), calc(var(--fly-y, -200px) * 0.94)) scale(0.15);
          }
          100% {
            opacity: 0;
            transform: translate(var(--fly-x, 0px), var(--fly-y, -200px)) scale(0.04);
            box-shadow: none;
          }
        }
        @keyframes creo-toast-countdown {
          0%   { width: 100%; }
          100% { width: 0%; }
        }
        @keyframes creo-bell-ring-kf {
          0%   { transform: rotate(0deg) scale(1); }
          15%  { transform: rotate(18deg) scale(1.22); }
          30%  { transform: rotate(-16deg) scale(1.24); }
          45%  { transform: rotate(12deg) scale(1.18); }
          60%  { transform: rotate(-8deg) scale(1.12); }
          75%  { transform: rotate(4deg) scale(1.05); }
          100% { transform: rotate(0deg) scale(1); }
        }
        .creo-bell-ring svg {
          animation: creo-bell-ring-kf 0.8s cubic-bezier(0.36, 0.07, 0.19, 0.97) both !important;
          color: #2B7BC4 !important;
        }
        .creo-bell-ring {
          position: relative;
        }
        .creo-bell-ring::after {
          content: '';
          position: absolute;
          inset: -4px;
          border-radius: 50%;
          border: 2px solid #2B7BC4;
          animation: creo-ping 0.8s ease-out forwards;
          pointer-events: none;
        }
        @keyframes creo-ping {
          0% { transform: scale(0.8); opacity: 1; }
          100% { transform: scale(1.7); opacity: 0; }
        }
      `}</style>

      {/* Floating Toast Card (Light Mode Only) */}
      <div
        ref={toastRef}
        role="alert"
        aria-live="polite"
        onClick={triggerFly}
        style={{
          position: "fixed",
          bottom: 24,
          right: 24,
          maxWidth: 420,
          width: "calc(100vw - 48px)",
          zIndex: 9999,
          cursor: phase === "visible" ? "pointer" : "default",
          pointerEvents: phase === "flying" ? "none" : "auto",
          animation:
            phase === "visible"
              ? "creo-toast-enter 0.45s cubic-bezier(0.16, 1, 0.3, 1) forwards"
              : phase === "flying"
              ? "creo-toast-fly 0.65s cubic-bezier(0.4, 0, 0.2, 1) forwards"
              : "none",
        }}
      >
        <div
          style={{
            background: "#FFFFFF",
            border: "1px solid #C9DFF0",
            borderRadius: 16,
            padding: "16px 18px",
            boxShadow: "0 20px 40px -10px rgba(13, 33, 55, 0.14), 0 4px 12px rgba(0, 0, 0, 0.04), 0 0 0 1px rgba(43, 123, 196, 0.06)",
            fontFamily: "var(--font-body, 'Inter', -apple-system, BlinkMacSystemFont, sans-serif)",
            position: "relative",
            overflow: "hidden",
            color: "#0D2137",
          }}
        >
          {/* Top Accent Gradient Line */}
          <div
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              right: 0,
              height: 3.5,
              background: theme.accentGradient,
            }}
          />

          {/* Main Card Content */}
          <div style={{ display: "flex", alignItems: "flex-start", gap: 12, marginTop: 2 }}>
            {/* Icon Container */}
            <div
              style={{
                width: 36,
                height: 36,
                borderRadius: 10,
                background: theme.iconBg,
                border: `1px solid ${theme.iconBorder}`,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
              }}
            >
              {theme.icon}
            </div>

            {/* Title & Body */}
            <div style={{ flex: 1, minWidth: 0 }}>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: 8,
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <span
                    style={{
                      fontSize: 10,
                      fontWeight: 700,
                      textTransform: "uppercase",
                      letterSpacing: "0.05em",
                      padding: "2px 7px",
                      borderRadius: 9999,
                      background: theme.badgeBg,
                      color: theme.badgeText,
                      border: `1px solid ${theme.badgeBorder}`,
                      lineHeight: 1.2,
                    }}
                  >
                    {theme.typeLabel}
                  </span>
                  <span style={{ fontSize: 10, color: "#94A3B8" }}>•</span>
                  <span style={{ fontSize: 11, fontWeight: 500, color: "#64748B" }}>
                    {authorName}
                  </span>
                </div>

                {/* Dismiss Button */}
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    triggerFly();
                  }}
                  title="Send to notifications"
                  style={{
                    background: "transparent",
                    border: "none",
                    color: "#94A3B8",
                    cursor: "pointer",
                    padding: 3,
                    borderRadius: 6,
                    lineHeight: 0,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    transition: "color 0.15s, background 0.15s",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.color = "#0D2137";
                    e.currentTarget.style.background = "#F1F5F9";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.color = "#94A3B8";
                    e.currentTarget.style.background = "transparent";
                  }}
                >
                  <X size={15} />
                </button>
              </div>

              {/* Title */}
              <h4
                style={{
                  margin: "6px 0 0",
                  fontSize: 13,
                  fontWeight: 700,
                  color: "#0D2137",
                  letterSpacing: "-0.01em",
                  lineHeight: 1.35,
                }}
              >
                {announcement.title}
              </h4>

              {/* Message text */}
              <p
                style={{
                  margin: "4px 0 0",
                  fontSize: 12,
                  color: "#475569",
                  lineHeight: 1.45,
                  display: "-webkit-box",
                  WebkitLineClamp: 2,
                  WebkitBoxOrient: "vertical",
                  overflow: "hidden",
                }}
              >
                {announcement.content}
              </p>
            </div>
          </div>

          {/* Footer note: informs user it will fly into the bell */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              marginTop: 10,
              paddingTop: 8,
              borderTop: "1px solid #F1F5F9",
            }}
          >
            <span
              style={{
                fontSize: 10.5,
                fontWeight: 600,
                color: "#2B7BC4",
                display: "inline-flex",
                alignItems: "center",
                gap: 4,
              }}
            >
              <Sparkles size={11} className="text-[#2B7BC4]" />
              Saving to notification bell...
            </span>

            <span style={{ fontSize: 10, color: "#94A3B8", fontWeight: 500 }}>
              Click to dismiss
            </span>
          </div>

          {/* Auto-flight Countdown Progress Bar */}
          {phase === "visible" && (
            <div
              style={{
                position: "absolute",
                bottom: 0,
                left: 0,
                height: 3,
                width: "100%",
                background: "#E2E8F0",
                borderRadius: "0 0 16px 16px",
                overflow: "hidden",
              }}
            >
              <div
                style={{
                  height: "100%",
                  background: theme.progressFill,
                  animation: "creo-toast-countdown 3.5s linear forwards",
                }}
              />
            </div>
          )}
        </div>
      </div>
    </>
  );
}
