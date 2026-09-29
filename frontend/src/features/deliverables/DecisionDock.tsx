import { Check, CheckCircle2, LifeBuoy, Loader2, MessageSquare, X } from "lucide-react";
import { motion, useReducedMotion } from "motion/react";
import type { DeliverableItem } from "../../types/api";

interface DecisionDockProps {
  deliverable: DeliverableItem;
  onApprove: (deliverable: DeliverableItem) => void;
  onRequestChanges: (deliverable: DeliverableItem) => void;
  onClose: () => void;
  isApproving?: boolean;
}

export function DecisionDock({
  deliverable,
  onApprove,
  onRequestChanges,
  onClose,
  isApproving = false,
}: DecisionDockProps) {
  const shouldReduceMotion = useReducedMotion();
  const isApproved =
    deliverable.status === "approved" ||
    deliverable.status === "scheduled" ||
    deliverable.status === "published";

  return (
    <motion.div
      initial={shouldReduceMotion ? { opacity: 0 } : { y: 80, opacity: 0 }}
      animate={shouldReduceMotion ? { opacity: 1 } : { y: 0, opacity: 1 }}
      exit={shouldReduceMotion ? { opacity: 0 } : { y: 80, opacity: 0 }}
      transition={
        shouldReduceMotion ? { duration: 0 } : { type: "spring", stiffness: 400, damping: 30 }
      }
      style={{
        position: "fixed",
        bottom: 24,
        left: "50%",
        transform: "translateX(-50%)",
        width: "90vw",
        maxWidth: "760px",
        backgroundColor: "rgba(23, 27, 34, 0.95)",
        backdropFilter: "blur(16px)",
        border: "1px solid var(--color-hairline)",
        borderRadius: 14,
        padding: "1rem 1.5rem",
        boxShadow: "0 12px 36px rgba(0, 0, 0, 0.7)",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        flexWrap: "wrap",
        gap: "1rem",
        zIndex: 100,
        color: "var(--color-ink-text)",
        fontFamily: "var(--font-body)",
      }}
    >
      {/* Deliverable Metadata */}
      <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span
            style={{
              fontFamily: "var(--font-display)",
              fontWeight: 600,
              fontSize: "1rem",
              letterSpacing: "-0.01em",
            }}
          >
            Reel #{deliverable.root_id.slice(0, 8)}
          </span>
          <span
            style={{
              padding: "2px 6px",
              borderRadius: 4,
              backgroundColor: "var(--color-ink)",
              border: "1px solid var(--color-hairline)",
              fontSize: "0.75rem",
              fontVariantNumeric: "tabular-nums",
              color: "var(--color-ink-muted)",
            }}
          >
            Version {deliverable.version}
          </span>
          {deliverable.revision_round > 0 && (
            <span
              style={{
                fontSize: "0.75rem",
                color: "var(--color-waiting)",
                fontVariantNumeric: "tabular-nums",
              }}
            >
              (Round {deliverable.revision_round})
            </span>
          )}
        </div>
        <p
          style={{
            margin: 0,
            fontSize: "0.8125rem",
            color: "var(--color-ink-muted)",
          }}
        >
          {deliverable.rejection_comment
            ? `Previous feedback: "${deliverable.rejection_comment}"`
            : "Ready for your review and approval"}
        </p>
      </div>

      {/* Actions */}
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        {isApproved ? (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              color: "var(--color-settled)",
              fontWeight: 600,
              fontSize: "0.875rem",
              padding: "8px 16px",
              backgroundColor: "rgba(35, 162, 109, 0.1)",
              borderRadius: 8,
              border: "1px solid rgba(35, 162, 109, 0.25)",
            }}
          >
            <Check size={16} />
            Approved
          </div>
        ) : (
          <>
            <button
              type="button"
              disabled={isApproving}
              onClick={() => onRequestChanges(deliverable)}
              style={{
                padding: "8px 16px",
                borderRadius: 8,
                backgroundColor: "transparent",
                border: "1px solid var(--color-hairline)",
                color: "var(--color-ink-text)",
                fontWeight: 500,
                fontSize: "0.875rem",
                cursor: isApproving ? "not-allowed" : "pointer",
                opacity: isApproving ? 0.5 : 1,
                display: "flex",
                alignItems: "center",
                gap: 6,
                transition: "background 0.15s ease",
              }}
            >
              <MessageSquare size={16} style={{ color: "var(--color-waiting)" }} />
              Ask for changes
            </button>

            <a
              href={`/portal/support?deliverableId=${deliverable.id}`}
              style={{
                padding: "8px 14px",
                borderRadius: 8,
                backgroundColor: "rgba(43, 123, 196, 0.15)",
                border: "1px solid rgba(43, 123, 196, 0.4)",
                color: "#93C5FD",
                fontWeight: 500,
                fontSize: "0.875rem",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: 6,
                textDecoration: "none",
              }}
            >
              <LifeBuoy size={16} />
              Open Ticket
            </a>

            <button
              type="button"
              disabled={isApproving}
              onClick={() => onApprove(deliverable)}
              style={{
                padding: "8px 20px",
                borderRadius: 8,
                backgroundColor: "var(--color-settled)",
                border: "none",
                color: "#0E1116",
                fontWeight: 600,
                fontSize: "0.875rem",
                cursor: isApproving ? "not-allowed" : "pointer",
                display: "flex",
                alignItems: "center",
                gap: 6,
                boxShadow: "0 2px 10px rgba(35, 162, 109, 0.3)",
              }}
            >
              {isApproving ? <Loader2 size={16} style={{ animation: "spin 1s linear infinite" }} /> : <CheckCircle2 size={16} />}
              {isApproving ? "Approving..." : "Approve"}
            </button>
          </>
        )}

        <button
          type="button"
          aria-label="Dismiss decision bar"
          onClick={onClose}
          style={{
            background: "transparent",
            border: "none",
            color: "var(--color-ink-muted)",
            cursor: "pointer",
            padding: 6,
            borderRadius: 6,
            display: "flex",
            alignItems: "center",
            marginLeft: 4,
          }}
        >
          <X size={18} />
        </button>
      </div>
    </motion.div>
  );
}
