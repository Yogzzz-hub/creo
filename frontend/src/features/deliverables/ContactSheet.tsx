import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useState } from "react";
import {
  approveDeliverable,
  fetchPortalDeliverables,
  requestChanges,
} from "../../lib/deliverables-api";
import type { DeliverableItem } from "../../types/api";
import { EmptyState, Skeleton } from "../../ui";
import { DecisionDock } from "./DecisionDock";
import { DeliverableFrame } from "./DeliverableFrame";
import { RevisionDialog } from "./RevisionDialog";

interface ContactSheetProps {
  clientId: string;
}

export function ContactSheet({ clientId }: ContactSheetProps) {
  const queryClient = useQueryClient();
  const shouldReduceMotion = useReducedMotion();

  const [selectedItem, setSelectedItem] = useState<DeliverableItem | null>(null);
  const [revisionDialogOpen, setRevisionDialogOpen] = useState(false);
  const [optimisticApprovedIds, setOptimisticApprovedIds] = useState<Set<string>>(new Set());
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Fetch deliverables via keyset endpoint
  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["portal", "deliverables", clientId],
    queryFn: () => fetchPortalDeliverables(clientId),
    refetchInterval: 10000,
  });

  const deliverables = data?.items ?? [];
  const waitingCount = data?.waiting_on_you ?? 0;

  // Optimistic approval mutation
  const approveMutation = useMutation({
    mutationFn: async ({
      deliverableId,
      idempotencyKey,
    }: {
      deliverableId: string;
      idempotencyKey: string;
    }) => {
      return approveDeliverable(deliverableId, clientId, idempotencyKey);
    },
    onMutate: async ({ deliverableId }) => {
      setErrorMessage(null);
      // Mark optimistically
      setOptimisticApprovedIds((prev) => new Set(prev).add(deliverableId));
      if (selectedItem?.id === deliverableId) {
        setSelectedItem((prev) => (prev ? { ...prev, status: "approved" } : null));
      }
    },
    onError: (err: unknown, { deliverableId }) => {
      // Visibly rollback optimistic state on error
      setOptimisticApprovedIds((prev) => {
        const next = new Set(prev);
        next.delete(deliverableId);
        return next;
      });
      const message = (err as Error)?.message || "Approval failed. Please try again.";
      setErrorMessage(message);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["portal", "deliverables", clientId] });
    },
  });

  const handleApprove = (deliverable: DeliverableItem) => {
    const idempotencyKey = crypto.randomUUID();
    approveMutation.mutate({
      deliverableId: deliverable.id,
      idempotencyKey,
    });
  };

  const handleRequestChanges = async (comment: string) => {
    if (!selectedItem) return;
    await requestChanges(selectedItem.id, clientId, comment);
    queryClient.invalidateQueries({ queryKey: ["portal", "deliverables", clientId] });
    setSelectedItem(null);
  };

  // Divide into review groups
  const waitingList = deliverables.filter(
    (d) => d.status === "pending_approval" && !optimisticApprovedIds.has(d.id),
  );

  const approvedList = deliverables.filter(
    (d) =>
      optimisticApprovedIds.has(d.id) ||
      d.status === "approved" ||
      d.status === "scheduled" ||
      d.status === "published",
  );

  const inProductionList = deliverables.filter(
    (d) =>
      d.status === "in_production" ||
      d.status === "pending_qa" ||
      d.status === "qa_rejected" ||
      d.status === "revision_requested",
  );

  return (
    <div
      data-surface="review"
      style={{
        backgroundColor: "transparent",
        color: "var(--surface-text)",
        fontFamily: "var(--font-sans)",
        padding: "0.5rem 0 4rem",
        boxSizing: "border-box",
      }}
    >
      {/* Header — "N waiting on you" */}
      <header className="max-w-[1200px] mx-auto mb-8 flex flex-col sm:flex-row sm:items-baseline justify-between gap-3 border-b border-slate-200 pb-5">
        <div>
          <h1 className="font-display text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 mb-1">
            Review Contact Sheet
          </h1>
          <p className="text-xs sm:text-sm text-slate-500">
            Strict 9:16 deliverables generated for your Instagram channels.
          </p>
        </div>

        <div className="text-left sm:text-right">
          <span
            className={`font-display text-xl sm:text-2xl font-bold tabular-nums ${
              waitingCount > 0 ? "text-[#2B7BC4]" : "text-emerald-600"
            }`}
          >
            {waitingCount} waiting on you
          </span>
          <span className="block text-xs text-slate-400 mt-0.5">
            {deliverables.length} total deliverables in pipeline
          </span>
        </div>
      </header>

      {/* Error notice */}
      {errorMessage && (
        <div
          style={{
            maxWidth: "1200px",
            margin: "0 auto 1.5rem",
            padding: "1rem",
            backgroundColor: "rgba(229, 72, 77, 0.1)",
            border: "1px solid var(--color-blocked)",
            borderRadius: 8,
            color: "var(--color-blocked)",
            fontSize: "0.875rem",
          }}
        >
          {errorMessage}
        </div>
      )}

      {/* Main Grid & Groups */}
      <main style={{ maxWidth: "1200px", margin: "0 auto" }}>
        {isLoading ? (
          /* True 9:16 skeletons */
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))",
              gap: "1.5rem",
            }}
          >
            {[1, 2, 3, 4, 5, 6].map((n) => (
              <Skeleton key={n} aspectRatio="9/16" className="w-full rounded-lg" />
            ))}
          </div>
        ) : isError ? (
          <div style={{ padding: "2rem 0", color: "var(--color-blocked)" }}>
            Error loading deliverables: {(error as Error)?.message}
          </div>
        ) : deliverables.length === 0 ? (
          <EmptyState
            title="Your first reels land here once the team starts production"
            description="Our creative pods are currently analyzing your Brand DNA and preparing custom video assets."
            className="my-12 py-16"
          />
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "3rem" }}>
            {/* Section 1: Needs your review */}
            {waitingList.length > 0 && (
              <section>
                <div
                  style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: "1rem" }}
                >
                  <div
                    style={{
                      width: 8,
                      height: 8,
                      borderRadius: "50%",
                      backgroundColor: "var(--color-waiting)",
                    }}
                  />
                  <h2
                    style={{
                      fontSize: "1rem",
                      fontWeight: 600,
                      margin: 0,
                      letterSpacing: "-0.01em",
                    }}
                  >
                    Waiting for your approval ({waitingList.length})
                  </h2>
                </div>

                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))",
                    gap: "1.5rem",
                  }}
                >
                  <AnimatePresence mode="popLayout">
                    {waitingList.map((d) => (
                      <DeliverableFrame
                        key={d.id}
                        deliverable={d}
                        isSelected={selectedItem?.id === d.id}
                        onSelect={setSelectedItem}
                        isOptimisticApproved={optimisticApprovedIds.has(d.id)}
                      />
                    ))}
                  </AnimatePresence>
                </div>
              </section>
            )}

            {/* Section 2: Ready to publish (THE motion moment target) */}
            {approvedList.length > 0 && (
              <section>
                <div
                  style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: "1rem" }}
                >
                  <div
                    style={{
                      width: 8,
                      height: 8,
                      borderRadius: "50%",
                      backgroundColor: "var(--color-settled)",
                    }}
                  />
                  <h2
                    style={{
                      fontSize: "1rem",
                      fontWeight: 600,
                      margin: 0,
                      letterSpacing: "-0.01em",
                    }}
                  >
                    Ready to publish ({approvedList.length})
                  </h2>
                </div>

                <motion.div
                  layout={!shouldReduceMotion}
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))",
                    gap: "1.5rem",
                  }}
                >
                  <AnimatePresence mode="popLayout">
                    {approvedList.map((d) => (
                      <DeliverableFrame
                        key={d.id}
                        deliverable={d}
                        isSelected={selectedItem?.id === d.id}
                        onSelect={setSelectedItem}
                        isOptimisticApproved={optimisticApprovedIds.has(d.id)}
                      />
                    ))}
                  </AnimatePresence>
                </motion.div>
              </section>
            )}

            {/* Section 3: In production */}
            {inProductionList.length > 0 && (
              <section>
                <div
                  style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: "1rem" }}
                >
                  <div
                    style={{
                      width: 8,
                      height: 8,
                      borderRadius: "50%",
                      backgroundColor: "var(--color-motion)",
                    }}
                  />
                  <h2
                    style={{
                      fontSize: "1rem",
                      fontWeight: 600,
                      margin: 0,
                      letterSpacing: "-0.01em",
                    }}
                  >
                    In production ({inProductionList.length})
                  </h2>
                </div>

                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))",
                    gap: "1.5rem",
                  }}
                >
                  {inProductionList.map((d) => (
                    <DeliverableFrame
                      key={d.id}
                      deliverable={d}
                      isSelected={selectedItem?.id === d.id}
                      onSelect={setSelectedItem}
                    />
                  ))}
                </div>
              </section>
            )}
          </div>
        )}
      </main>

      {/* Bottom docked decision bar */}
      <AnimatePresence>
        {selectedItem && (
          <DecisionDock
            deliverable={selectedItem}
            onApprove={handleApprove}
            onRequestChanges={() => setRevisionDialogOpen(true)}
            onClose={() => setSelectedItem(null)}
            isApproving={approveMutation.isPending}
          />
        )}
      </AnimatePresence>

      {/* Revision Request Dialog */}
      <RevisionDialog
        open={revisionDialogOpen}
        onOpenChange={setRevisionDialogOpen}
        deliverable={selectedItem}
        onSubmit={handleRequestChanges}
        onApproveAsIs={() => {
          if (selectedItem) {
            handleApprove(selectedItem);
          }
        }}
      />
    </div>
  );
}
