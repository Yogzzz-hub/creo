import { Check, Film, Play, RotateCcw } from "lucide-react";
import { motion, useReducedMotion } from "motion/react";
import { useState } from "react";
import type { DeliverableItem } from "../../types/api";

interface DeliverableFrameProps {
  deliverable: DeliverableItem;
  isSelected: boolean;
  onSelect: (deliverable: DeliverableItem) => void;
  isOptimisticApproved?: boolean;
}

export function DeliverableFrame({
  deliverable,
  isSelected,
  onSelect,
  isOptimisticApproved = false,
}: DeliverableFrameProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const shouldReduceMotion = useReducedMotion();

  const isApproved =
    isOptimisticApproved ||
    deliverable.status === "approved" ||
    deliverable.status === "scheduled" ||
    deliverable.status === "published";
  const isWaiting = !isApproved && deliverable.status === "pending_approval";
  const isRework =
    deliverable.status === "qa_rejected" || deliverable.status === "revision_requested";

  // Functional token colors for 3px status rail
  const getRailColor = () => {
    if (isApproved) return "var(--color-settled)";
    if (isWaiting) return "var(--color-waiting)";
    if (isRework) return "var(--color-blocked)";
    return "var(--color-motion)";
  };

  const isVideo =
    deliverable.file_type.toUpperCase() === "MP4" || deliverable.file_type.toUpperCase() === "MOV";

  return (
    <motion.button
      type="button"
      layout={!shouldReduceMotion}
      transition={
        shouldReduceMotion ? { duration: 0 } : { type: "spring", stiffness: 350, damping: 28 }
      }
      aria-label={`Deliverable item ${deliverable.id.slice(0, 8)}`}
      onClick={() => onSelect(deliverable)}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onSelect(deliverable);
        }
      }}
      style={{
        position: "relative",
        aspectRatio: "9 / 16",
        backgroundColor: "var(--color-raised)",
        borderRadius: 8,
        overflow: "hidden",
        cursor: "pointer",
        border: isSelected ? "2px solid var(--color-motion)" : "1px solid var(--color-hairline)",
        boxShadow: isSelected
          ? "0 0 0 2px rgba(43, 123, 196, 0.4), 0 8px 24px rgba(13, 33, 55, 0.12)"
          : "0 2px 8px rgba(13, 33, 55, 0.06)",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        textAlign: "left",
        padding: 0,
        font: "inherit",
        color: "inherit",
      }}
    >
      {/* 3px status rail on the left edge — THE motion moment */}
      <motion.div
        aria-hidden="true"
        initial={false}
        animate={{
          backgroundColor: getRailColor(),
        }}
        transition={
          shouldReduceMotion
            ? { duration: 0 }
            : { type: "spring", stiffness: 300, damping: 25, duration: 0.6 }
        }
        style={{
          position: "absolute",
          left: 0,
          top: 0,
          bottom: 0,
          width: 3,
          zIndex: 10,
        }}
      />

      {/* Media content area */}
      <div
        style={{
          position: "relative",
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: "#0A0D12",
        }}
      >
        {isPlaying && isVideo ? (
          <video
            src={deliverable.file_url}
            controls
            autoPlay
            playsInline
            style={{ width: "100%", height: "100%", objectFit: "cover" }}
          >
            <track kind="captions" />
          </video>
        ) : (
          /* Poster / Preview mockup */
          <div
            style={{
              width: "100%",
              height: "100%",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              background:
                "linear-gradient(180deg, rgba(23,27,34,0.4) 0%, rgba(14,17,22,0.95) 100%)",
              padding: "1rem",
              textAlign: "center",
              boxSizing: "border-box",
            }}
          >
            {isVideo ? (
              <button
                type="button"
                aria-label="Play video"
                onClick={(e) => {
                  e.stopPropagation();
                  setIsPlaying(true);
                }}
                style={{
                  width: 48,
                  height: 48,
                  borderRadius: "50%",
                  backgroundColor: "rgba(255, 255, 255, 0.15)",
                  backdropFilter: "blur(4px)",
                  border: "1px solid rgba(255, 255, 255, 0.25)",
                  color: "white",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  cursor: "pointer",
                  marginBottom: "1rem",
                  transition: "transform 0.15s ease",
                }}
              >
                <Play size={20} fill="white" style={{ marginLeft: 2 }} />
              </button>
            ) : (
              <Film size={36} style={{ color: "var(--color-ink-muted)", marginBottom: "1rem" }} />
            )}

            <span
              style={{
                fontSize: "0.8125rem",
                fontWeight: 600,
                color: "var(--color-ink-text)",
                letterSpacing: "-0.01em",
              }}
            >
              Reel #{deliverable.root_id.slice(0, 6)}
            </span>
            <span
              style={{
                fontSize: "0.75rem",
                color: "var(--color-ink-muted)",
                marginTop: 4,
                fontVariantNumeric: "tabular-nums",
              }}
            >
              v{deliverable.version} • {deliverable.file_type}
            </span>
          </div>
        )}

        {/* Status indicator badge (top right) */}
        <div
          style={{
            position: "absolute",
            top: 10,
            right: 10,
            padding: "3px 8px",
            borderRadius: 4,
            backgroundColor: "rgba(14, 17, 22, 0.8)",
            backdropFilter: "blur(4px)",
            border: "1px solid var(--color-hairline)",
            fontSize: "0.6875rem",
            fontWeight: 600,
            color: getRailColor(),
            display: "flex",
            alignItems: "center",
            gap: 4,
          }}
        >
          {isApproved && <Check size={12} />}
          {deliverable.status === "revision_requested" && <RotateCcw size={12} />}
          {isApproved ? "Approved" : deliverable.status.replace("_", " ").toUpperCase()}
        </div>

        {/* Revision badge (bottom left) */}
        {deliverable.revision_round > 0 && (
          <div
            style={{
              position: "absolute",
              bottom: 10,
              left: 10,
              padding: "2px 6px",
              borderRadius: 4,
              backgroundColor: "rgba(14, 17, 22, 0.85)",
              border: "1px solid var(--color-hairline)",
              fontSize: "0.6875rem",
              color: "var(--color-ink-muted)",
              fontVariantNumeric: "tabular-nums",
            }}
          >
            Round {deliverable.revision_round}
          </div>
        )}
      </div>
    </motion.button>
  );
}
