import * as Dialog from "@radix-ui/react-dialog";
import { AlertCircle, ArrowUpRight, CheckCircle2, MessageSquare, X } from "lucide-react";
import { useState } from "react";
import type { DeliverableItem } from "../../types/api";

interface RevisionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  deliverable: DeliverableItem | null;
  onSubmit: (comment: string) => Promise<void>;
  onApproveAsIs: () => void;
  isSubmitting?: boolean;
}

export function RevisionDialog({
  open,
  onOpenChange,
  deliverable,
  onSubmit,
  onApproveAsIs,
  isSubmitting = false,
}: RevisionDialogProps) {
  const [comment, setComment] = useState("");
  const [errorStatus, setErrorStatus] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!comment.trim()) return;

    try {
      setErrorStatus(null);
      await onSubmit(comment.trim());
      setComment("");
      onOpenChange(false);
    } catch (err: unknown) {
      const errorObj = err as { code?: string; message?: string };
      if (errorObj?.code === "REVISION_LIMIT_REACHED") {
        setErrorStatus("REVISION_LIMIT_REACHED");
      } else {
        setErrorStatus(errorObj?.message || "Failed to submit revision request.");
      }
    }
  };

  const isRevisionLimitReached = errorStatus === "REVISION_LIMIT_REACHED";

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay
          style={{
            position: "fixed",
            inset: 0,
            backgroundColor: "rgba(0, 0, 0, 0.75)",
            backdropFilter: "blur(4px)",
            zIndex: 150,
          }}
        />
        <Dialog.Content
          style={{
            position: "fixed",
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            backgroundColor: "var(--color-raised)",
            border: "1px solid var(--color-hairline)",
            borderRadius: 12,
            padding: "1.75rem",
            width: "90vw",
            maxWidth: "500px",
            color: "var(--color-ink-text)",
            fontFamily: "var(--font-body)",
            boxShadow: "0 20px 40px rgba(0, 0, 0, 0.6)",
            zIndex: 151,
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: "1rem",
            }}
          >
            <Dialog.Title
              style={{
                fontFamily: "var(--font-display)",
                fontSize: "1.25rem",
                fontWeight: 600,
                margin: 0,
                color: isRevisionLimitReached ? "var(--color-waiting)" : "var(--color-ink-text)",
              }}
            >
              {isRevisionLimitReached ? "Revision Limit Reached" : "Ask for Changes"}
            </Dialog.Title>
            <Dialog.Close asChild>
              <button
                type="button"
                aria-label="Close"
                style={{
                  background: "transparent",
                  border: "none",
                  color: "var(--color-ink-muted)",
                  cursor: "pointer",
                  padding: "4px",
                  borderRadius: 4,
                  display: "flex",
                  alignItems: "center",
                }}
              >
                <X size={18} />
              </button>
            </Dialog.Close>
          </div>

          {isRevisionLimitReached ? (
            /* Honest Plan Upsell Dialog */
            <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
              <div
                style={{
                  display: "flex",
                  gap: 12,
                  padding: "1rem",
                  backgroundColor: "rgba(240, 162, 2, 0.08)",
                  border: "1px solid rgba(240, 162, 2, 0.25)",
                  borderRadius: 8,
                }}
              >
                <AlertCircle size={24} style={{ color: "var(--color-waiting)", flexShrink: 0 }} />
                <div style={{ fontSize: "0.875rem", lineHeight: 1.5 }}>
                  <strong>
                    Your plan includes {deliverable?.revision_round ?? 1} revision rounds.
                  </strong>
                  <p style={{ margin: "4px 0 0 0", color: "var(--color-ink-muted)" }}>
                    You have used all rounds included in your current subscription for this
                    deliverable. To request more edits, upgrade your plan for unlimited revisions,
                    or approve the deliverable as-is.
                  </p>
                </div>
              </div>

              <div style={{ display: "flex", gap: "0.75rem", marginTop: "0.5rem" }}>
                <button
                  type="button"
                  onClick={() => {
                    onOpenChange(false);
                    onApproveAsIs();
                  }}
                  style={{
                    flex: 1,
                    padding: "10px 16px",
                    borderRadius: 8,
                    background: "var(--color-hairline)",
                    border: "none",
                    color: "var(--color-ink-text)",
                    fontWeight: 600,
                    cursor: "pointer",
                    fontSize: "0.875rem",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 6,
                  }}
                >
                  <CheckCircle2 size={16} />
                  Approve as-is
                </button>

                <button
                  type="button"
                  onClick={() => {
                    alert("Redirecting to plan upgrade checkout (Phase 3 Billing)...");
                  }}
                  style={{
                    flex: 1,
                    padding: "10px 16px",
                    borderRadius: 8,
                    background: "var(--color-motion)",
                    border: "none",
                    color: "white",
                    fontWeight: 600,
                    cursor: "pointer",
                    fontSize: "0.875rem",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 6,
                  }}
                >
                  Upgrade Plan
                  <ArrowUpRight size={16} />
                </button>
              </div>
            </div>
          ) : (
            /* Normal Feedback Form */
            <form
              onSubmit={handleSubmit}
              style={{ display: "flex", flexDirection: "column", gap: "1rem" }}
            >
              <Dialog.Description
                style={{ fontSize: "0.875rem", color: "var(--color-ink-muted)", margin: 0 }}
              >
                Specify exactly what adjustments the creative team should make for Version{" "}
                {(deliverable?.version ?? 1) + 1}.
              </Dialog.Description>

              <div>
                <label
                  htmlFor="revision-comment-input"
                  style={{
                    display: "block",
                    fontSize: "0.75rem",
                    fontWeight: 600,
                    color: "var(--color-ink-muted)",
                    marginBottom: 6,
                  }}
                >
                  FEEDBACK & DIRECTIONS *
                </label>
                <textarea
                  id="revision-comment-input"
                  required
                  rows={4}
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  placeholder="e.g. Please change the headline font to Bricolage Grotesque, raise music volume by 20%, and trim the first 2 seconds."
                  style={{
                    width: "100%",
                    boxSizing: "border-box",
                    backgroundColor: "var(--color-ink)",
                    border: "1px solid var(--color-hairline)",
                    borderRadius: 8,
                    padding: "10px",
                    color: "var(--color-ink-text)",
                    fontFamily: "var(--font-body)",
                    fontSize: "0.875rem",
                    lineHeight: 1.4,
                    resize: "vertical",
                  }}
                />
              </div>

              {errorStatus && !isRevisionLimitReached && (
                <div style={{ color: "var(--color-blocked)", fontSize: "0.8125rem" }}>
                  {errorStatus}
                </div>
              )}

              <div
                style={{
                  display: "flex",
                  justifyContent: "flex-end",
                  gap: "0.75rem",
                  marginTop: "0.5rem",
                }}
              >
                <Dialog.Close asChild>
                  <button
                    type="button"
                    style={{
                      padding: "8px 14px",
                      background: "transparent",
                      border: "1px solid var(--color-hairline)",
                      color: "var(--color-ink-muted)",
                      borderRadius: 8,
                      fontSize: "0.875rem",
                      cursor: "pointer",
                    }}
                  >
                    Cancel
                  </button>
                </Dialog.Close>

                <button
                  type="submit"
                  disabled={!comment.trim() || isSubmitting}
                  style={{
                    padding: "8px 18px",
                    background:
                      comment.trim() && !isSubmitting
                        ? "var(--color-waiting)"
                        : "rgba(240, 162, 2, 0.3)",
                    border: "none",
                    color: "#0E1116",
                    fontWeight: 600,
                    borderRadius: 8,
                    fontSize: "0.875rem",
                    cursor: comment.trim() && !isSubmitting ? "pointer" : "not-allowed",
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                  }}
                >
                  <MessageSquare size={16} />
                  {isSubmitting ? "Submitting..." : "Ask for changes"}
                </button>
              </div>
            </form>
          )}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
