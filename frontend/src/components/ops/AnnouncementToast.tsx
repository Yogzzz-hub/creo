import { useState, useEffect, useRef, useCallback } from "react";
import { Megaphone, X } from "lucide-react";
import { request } from "../../lib/http";

/**
 * AnnouncementToast — fetches the latest announcement and, if unseen,
 * displays it as a floating toast for ~3 seconds, then animates it
 * "flying" toward the notification bell before vanishing.
 *
 * Seen announcements are tracked in localStorage so each announcement
 * only plays its entrance once per browser.
 */

interface Announcement {
  id: string;
  title: string;
  content: string;
  type: string;
  author: string;
  created_at_ist: string;
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
    const next = [...ids, id].slice(-50);
    localStorage.setItem(SEEN_KEY, JSON.stringify(next));
  }
}

type Phase = "idle" | "visible" | "flying" | "gone";

export function AnnouncementToast({
  bellRef,
}: {
  bellRef: React.RefObject<HTMLButtonElement | null>;
}) {
  const [announcement, setAnnouncement] = useState<Announcement | null>(null);
  const [phase, setPhase] = useState<Phase>("idle");
  const toastRef = useRef<HTMLDivElement>(null);

  // ── Fetch announcements once on mount ──────────────────────────────────
  useEffect(() => {
    let cancelled = false;

    request<Announcement[]>("/api/v1/admin/announcements")
      .then((data) => {
        if (cancelled || !Array.isArray(data) || data.length === 0) return;
        const seen = getSeenIds();
        const unseen = data.filter((a) => !seen.includes(a.id));
        if (unseen.length === 0) return;
        setAnnouncement(unseen[0] ?? null);
        setPhase("visible");
      })
      .catch(() => {});

    return () => {
      cancelled = true;
    };
  }, []);

  // ── 3-second visible timer → trigger fly ───────────────────────────────
  useEffect(() => {
    if (phase !== "visible") return;
    const timer = setTimeout(() => triggerFly(), 3000);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase]);

  const triggerFly = useCallback(() => {
    if (!announcement) return;

    const toast = toastRef.current;
    const bell = bellRef.current;

    if (!toast || !bell) {
      markSeen(announcement.id);
      setPhase("gone");
      return;
    }

    const toastRect = toast.getBoundingClientRect();
    const bellRect = bell.getBoundingClientRect();

    // Compute translate offset from toast centre → bell centre
    const dx = bellRect.left + bellRect.width / 2 - (toastRect.left + toastRect.width / 2);
    const dy = bellRect.top + bellRect.height / 2 - (toastRect.top + toastRect.height / 2);

    // Apply the fly transform via CSS custom properties
    toast.style.setProperty("--fly-x", `${dx}px`);
    toast.style.setProperty("--fly-y", `${dy}px`);

    setPhase("flying");

    // After flight completes
    setTimeout(() => {
      markSeen(announcement.id);
      // Add a brief "ring" animation to the bell
      if (bell) {
        bell.classList.add("creo-bell-ring");
        setTimeout(() => bell.classList.remove("creo-bell-ring"), 800);
      }
      setPhase("gone");
    }, 700);
  }, [announcement, bellRef]);

  const handleDismiss = useCallback(() => {
    if (announcement) markSeen(announcement.id);
    setPhase("gone");
  }, [announcement]);

  // ── Render ─────────────────────────────────────────────────────────────
  if (!announcement || phase === "idle" || phase === "gone") return null;

  const typeColor =
    announcement.type === "system"
      ? "#6366F1"
      : announcement.type === "maintenance"
      ? "#F43F5E"
      : announcement.type === "newsletter"
      ? "#10B981"
      : "#2B7BC4";

  return (
    <>
      {/* Inline keyframes — scoped names to avoid collisions */}
      <style>{`
        @keyframes creo-toast-enter {
          0%   { opacity: 0; transform: translateY(40px) scale(0.96); }
          100% { opacity: 1; transform: translateY(0) scale(1); }
        }
        @keyframes creo-toast-fly {
          0%   { opacity: 1; transform: translate(0, 0) scale(1); }
          100% { opacity: 0; transform: translate(var(--fly-x, 0px), var(--fly-y, -200px)) scale(0.06); }
        }
        @keyframes creo-toast-progress {
          0%   { width: 100%; }
          100% { width: 0%; }
        }
        @keyframes creo-bell-ring-kf {
          0%   { transform: rotate(0deg); }
          15%  { transform: rotate(14deg); }
          30%  { transform: rotate(-12deg); }
          45%  { transform: rotate(8deg); }
          60%  { transform: rotate(-6deg); }
          75%  { transform: rotate(3deg); }
          100% { transform: rotate(0deg); }
        }
        .creo-bell-ring svg {
          animation: creo-bell-ring-kf 0.7s ease;
        }
      `}</style>

      {/* The floating toast card */}
      <div
        ref={toastRef}
        role="alert"
        style={{
          position: "fixed",
          bottom: 28,
          right: 28,
          maxWidth: 400,
          width: "calc(100vw - 56px)",
          zIndex: 9999,
          pointerEvents: phase === "flying" ? "none" : "auto",
          animation:
            phase === "visible"
              ? "creo-toast-enter 0.5s cubic-bezier(0.16, 1, 0.3, 1) forwards"
              : phase === "flying"
              ? "creo-toast-fly 0.65s cubic-bezier(0.4, 0, 0.2, 1) forwards"
              : "none",
        }}
      >
        <div
          style={{
            background: "linear-gradient(135deg, rgba(13,33,55,0.97), rgba(13,33,55,0.90))",
            backdropFilter: "blur(20px)",
            border: `1px solid ${typeColor}44`,
            borderRadius: 16,
            padding: "16px 20px",
            boxShadow: `0 20px 60px rgba(0,0,0,0.45), 0 0 0 1px ${typeColor}22, inset 0 1px 0 rgba(255,255,255,0.06)`,
            color: "#F1F5F9",
            fontFamily: "var(--font-body, 'Inter', sans-serif)",
            position: "relative",
            overflow: "hidden",
          }}
        >
          {/* Top glow accent bar */}
          <div
            style={{
              position: "absolute",
              top: -1,
              left: 0,
              right: 0,
              height: 3,
              background: `linear-gradient(90deg, transparent, ${typeColor}, transparent)`,
              borderRadius: "16px 16px 0 0",
            }}
          />

          {/* Header row */}
          <div style={{ display: "flex", alignItems: "flex-start", gap: 10, marginBottom: 6 }}>
            <div
              style={{
                width: 32,
                height: 32,
                borderRadius: 10,
                background: `${typeColor}22`,
                border: `1px solid ${typeColor}44`,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
              }}
            >
              <Megaphone size={16} style={{ color: typeColor }} />
            </div>

            <div style={{ flex: 1, minWidth: 0 }}>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: 8,
                }}
              >
                <span
                  style={{
                    fontSize: 13,
                    fontWeight: 700,
                    color: "#F1F5F9",
                    letterSpacing: "-0.01em",
                    lineHeight: 1.3,
                  }}
                >
                  {announcement.title}
                </span>
                <button
                  type="button"
                  onClick={handleDismiss}
                  style={{
                    background: "transparent",
                    border: "none",
                    color: "#94A3B8",
                    cursor: "pointer",
                    padding: 2,
                    borderRadius: 6,
                    lineHeight: 0,
                    flexShrink: 0,
                  }}
                >
                  <X size={14} />
                </button>
              </div>

              <p
                style={{
                  margin: "4px 0 0",
                  fontSize: 11,
                  color: "#94A3B8",
                  lineHeight: 1.5,
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

          {/* Footer meta */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              marginTop: 8,
              paddingTop: 8,
              borderTop: "1px solid rgba(148,163,184,0.12)",
            }}
          >
            <span style={{ fontSize: 10, color: "#64748B", fontWeight: 500 }}>
              📢 by {announcement.author}
            </span>
            <span
              style={{
                fontSize: 9,
                color: typeColor,
                fontWeight: 700,
                textTransform: "uppercase",
                letterSpacing: "0.06em",
              }}
            >
              {announcement.type}
            </span>
          </div>

          {/* Auto-dismiss countdown bar */}
          {phase === "visible" && (
            <div
              style={{
                position: "absolute",
                bottom: 0,
                left: 0,
                height: 3,
                background: `linear-gradient(90deg, ${typeColor}, ${typeColor}88)`,
                borderRadius: "0 0 16px 16px",
                animation: "creo-toast-progress 3s linear forwards",
              }}
            />
          )}
        </div>
      </div>
    </>
  );
}
