import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, Check, Clock, Download, Film, ImageIcon, Loader2, RefreshCw } from "lucide-react";
import { useAuth } from "../../lib/auth-context";
import {
  approveDeliverable,
  fetchPortalDeliverable,
  fetchPortalDeliverables,
  requestChanges,
} from "../../lib/deliverables-api";
import { HttpError } from "../../lib/http";
import { useOnboardingGate } from "../../lib/useOnboardingGate";
import { SubscriptionLockedState } from "../../components/portal/SubscriptionLockedState";

import type { DeliverableItem } from "../../types/api";

type Filter = "all" | "needs_you" | "revision" | "approved";

const FILTERS: { key: Filter; label: string }[] = [
  { key: "all", label: "All" },
  { key: "needs_you", label: "Needs you" },
  { key: "revision", label: "In revision" },
  { key: "approved", label: "Approved" },
];

const APPROVED_STATUSES = new Set(["approved", "scheduled", "publishing", "published", "publish_failed"]);

function matchesFilter(item: DeliverableItem, filter: Filter): boolean {
  if (filter === "needs_you") return item.status === "pending_approval";
  if (filter === "revision") return item.status === "revision_requested";
  if (filter === "approved") return APPROVED_STATUSES.has(item.status);
  return true;
}

function isTall(item: DeliverableItem): boolean {
  return item.deliverable_type === "reel" || item.deliverable_type === "story" || item.is_video;
}

function StatusBadge({ item }: { item: DeliverableItem }) {
  const tone =
    item.status === "pending_approval"
      ? "bg-[#D8BF9B]/15 text-[#D8BF9B]"
      : item.status === "revision_requested"
        ? "bg-white/[0.06] text-[#F1F5F9]"
        : "bg-[#7FA0D6]/15 text-[#BCCCE6]";
  const label = item.status === "pending_approval" ? "Needs you" : item.status_label;
  return <span className={`inline-flex px-2 py-0.5 rounded text-[11px] font-bold ${tone}`}>{label}</span>;
}

/**
 * Keep the first signed URL for a deliverable while it works. The list refetches
 * every two minutes with fresh links; swapping them in would restart playback.
 * After a load error (e.g. an expired link) the newest URL is used instead.
 */
function useStableSrc(id: string, url: string | null) {
  const [src, setSrc] = useState(url);
  const [failed, setFailed] = useState(false);
  // biome-ignore lint/correctness/useExhaustiveDependencies: only a different deliverable resets the source
  useEffect(() => {
    setSrc(url);
    setFailed(false);
  }, [id]);
  useEffect(() => {
    if (failed && url && url !== src) {
      setSrc(url);
      setFailed(false);
    }
  }, [failed, url, src]);
  return { src, failed, onError: () => setFailed(true) };
}

function Thumbnail({ item }: { item: DeliverableItem }) {
  const { src, failed, onError } = useStableSrc(item.id, item.file_url);
  if (!src || failed) {
    return item.is_video ? <Film className="w-5 h-5 text-[#97A0B3]" /> : <ImageIcon className="w-5 h-5 text-[#97A0B3]" />;
  }
  if (item.is_video) {
    return <video src={`${src}#t=0.5`} muted playsInline preload="metadata" onError={onError} className="w-full h-full object-cover" />;
  }
  return <img src={src} alt="" loading="lazy" onError={onError} className="w-full h-full object-cover" />;
}

/** Full preview with a loading skeleton and a recoverable error (signed links expire). */
function MediaPreview({ item, onRefresh }: { item: DeliverableItem; onRefresh: () => void }) {
  const { src, failed, onError } = useStableSrc(item.id, item.file_url);
  const [ready, setReady] = useState(false);
  // biome-ignore lint/correctness/useExhaustiveDependencies: show the skeleton again whenever the source changes
  useEffect(() => setReady(false), [src]);

  const frame = isTall(item) ? "aspect-[9/16] max-w-[300px]" : "aspect-[4/5] max-w-[380px]";

  return (
    <div className={`relative w-full ${frame} bg-black rounded-[28px] overflow-hidden shadow-2xl border-4 border-[#161F2D] flex items-center justify-center`}>
      {!ready && src && !failed && (
        <div className="absolute inset-0 animate-pulse bg-white/[0.04]" aria-hidden="true" />
      )}
      {!src || failed ? (
        <div className="text-center p-6 space-y-3">
          <p className="text-white text-sm font-semibold">Preview unavailable</p>
          <p className="text-xs text-[#97A0B3]">The secure preview link may have expired.</p>
          <button
            onClick={onRefresh}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-[#2A3446] text-xs font-bold text-white hover:bg-white/[0.04]"
          >
            <RefreshCw className="w-3.5 h-3.5" /> Reload preview
          </button>
        </div>
      ) : item.is_video ? (
        <video
          key={src}
          src={src}
          controls
          playsInline
          preload="metadata"
          onLoadedMetadata={() => setReady(true)}
          onError={onError}
          className="w-full h-full object-contain bg-black"
        />
      ) : (
        <img
          key={src}
          src={src}
          alt={item.title}
          onLoad={() => setReady(true)}
          onError={onError}
          className="w-full h-full object-contain bg-black"
        />
      )}
    </div>
  );
}

function errorMessage(error: unknown, fallback: string): string {
  if (error instanceof HttpError) {
    if (error.code === "REVISION_LIMIT_REACHED") {
      return "You've used all revision rounds included in your plan for this piece. Approve it as-is, or contact support to add more revisions.";
    }
    return error.message || fallback;
  }
  return fallback;
}

function DeliverablesLoading() {
  const [slow, setSlow] = useState(false);
  useEffect(() => { const timer = setTimeout(() => setSlow(true), 8000); return () => clearTimeout(timer); }, []);
  return <section role="status" aria-live="polite" className="space-y-5 animate-page-in"><h1 className="text-2xl font-bold text-white">Content review</h1><p className="text-sm text-[#97A0B3]">{slow ? "The server is taking longer than usual. Your uploads are still being checked; a retry will appear if the request fails." : "Loading your uploaded content..."}</p><div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">{[0, 1, 2].map(i => <div key={i} className="rounded-2xl p-5 bg-[#161F2D] border border-[#2A3446] space-y-4 motion-safe:animate-pulse"><div className="aspect-video rounded-xl bg-[#2A3446]" /><div className="h-4 w-2/3 rounded bg-[#2A3446]" /><div className="h-3 w-1/2 rounded bg-[#2A3446]" /></div>)}</div></section>;
}

export function PortalDeliverablesPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const gate = useOnboardingGate();
  const navigate = useNavigate();
  const { deliverableId } = useParams<{ deliverableId?: string }>();
  const clientId = user?.id || "";

  const listQuery = useQuery({
    queryKey: ["portal", "deliverables", clientId],
    queryFn: () => fetchPortalDeliverables(clientId),
    enabled: gate.isComplete && !!clientId,
    retry: false,
    // Signed preview links last 15 minutes; refresh well within that.
    refetchInterval: 2 * 60_000,
  });
  const deliverables = listQuery.data?.items ?? [];

  const [filter, setFilter] = useState<Filter>("all");
  const [viewVersionId, setViewVersionId] = useState<string | null>(null);
  const [commentText, setCommentText] = useState("");
  const [actionError, setActionError] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [bulkProgress, setBulkProgress] = useState<string | null>(null);

  // A link may name an older version; the detail endpoint resolves it to the current one.
  const detailQuery = useQuery({
    queryKey: ["portal", "deliverable", deliverableId],
    queryFn: () => fetchPortalDeliverable(deliverableId as string),
    enabled: gate.isComplete && !!deliverableId,
    refetchInterval: 2 * 60_000,
    retry: false,
  });

  const selectedItem: DeliverableItem | undefined = useMemo(() => {
    if (deliverableId) {
      const direct = deliverables.find((d) => d.id === deliverableId);
      if (direct) return direct;
      const detail = detailQuery.data;
      if (detail) return deliverables.find((d) => d.root_id === detail.root_id) ?? detail;
      return undefined;
    }
    return deliverables.find((d) => d.status === "pending_approval") ?? deliverables[0];
  }, [deliverableId, deliverables, detailQuery.data]);

  const versions = detailQuery.data && selectedItem && detailQuery.data.root_id === selectedItem.root_id
    ? detailQuery.data.versions
    : [];
  const shownItem = (viewVersionId && versions.find((v) => v.id === viewVersionId)) || selectedItem;
  const viewingOlder = !!shownItem && !!selectedItem && shownItem.id !== selectedItem.id;

  const select = (id: string) => {
    setViewVersionId(null);
    setCommentText("");
    setActionError(null);
    navigate(`/portal/deliverables/${id}`, { replace: !!deliverableId });
  };

  // Keep the URL on the item being shown so it can be shared or reopened.
  useEffect(() => {
    if (!deliverableId && selectedItem) {
      navigate(`/portal/deliverables/${selectedItem.id}`, { replace: true });
    }
  }, [deliverableId, selectedItem, navigate]);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ["portal", "deliverables", clientId] });
    queryClient.invalidateQueries({ queryKey: ["portal", "deliverable"] });
    queryClient.invalidateQueries({ queryKey: ["portal", "dashboard"] });
    queryClient.invalidateQueries({ queryKey: ["portal-dashboard"] });
    queryClient.invalidateQueries({ queryKey: ["portal-dashboard-deliverables"] });
    queryClient.invalidateQueries({ queryKey: ["portal-library"] });
  };

  const approveMutation = useMutation({
    mutationFn: (id: string) => approveDeliverable(id, clientId, crypto.randomUUID()),
    onSuccess: () => {
      refresh();
      setActionError(null);
      showToast("Approved — your download is ready.");
    },
    onError: (error) => setActionError(errorMessage(error, "Approval failed. Please retry.")),
  });

  const requestChangesMutation = useMutation({
    mutationFn: ({ id, comment }: { id: string; comment: string }) => requestChanges(id, clientId, comment),
    onSuccess: () => {
      refresh();
      setCommentText("");
      setActionError(null);
      showToast("Revision requested — your pod has been notified.");
    },
    onError: (error) => setActionError(errorMessage(error, "Revision request failed. Please retry.")),
  });

  const pendingItems = deliverables.filter((d) => d.status === "pending_approval");

  const handleApproveAll = async () => {
    let done = 0;
    let failed = 0;
    for (const item of pendingItems) {
      setBulkProgress(`Approving ${done + failed + 1} of ${pendingItems.length}…`);
      try {
        await approveDeliverable(item.id, clientId, crypto.randomUUID());
        done += 1;
      } catch {
        failed += 1;
      }
    }
    setBulkProgress(null);
    refresh();
    showToast(failed ? `Approved ${done}; ${failed} could not be approved — please retry.` : `Approved ${done} deliverables.`);
  };

  if (gate.error) return <div role="alert">{gate.error.message} <button onClick={() => void gate.refetch()}>Retry</button></div>;
  if (!gate.isReady || (gate.isComplete && listQuery.isLoading)) {
    return <DeliverablesLoading />;
  }

  if (!gate.isComplete) {
    return (
      <div className="flex items-center justify-center py-6 sm:py-10">
        <SubscriptionLockedState
          title="Deliverables Queue Locked"
          description="Your creative deliverables queue and sign-off docks will activate as soon as your workspace setup is complete."
        />
      </div>
    );
  }

  if (listQuery.isError) {
    return (
      <div role="alert" className="p-6 text-white">
        {listQuery.error.message || "Could not load deliverables."}{" "}
        <button className="underline" onClick={() => listQuery.refetch()}>Retry</button>
      </div>
    );
  }

  if (listQuery.data?.subscription_active === false) {
    return (
      <div className="flex items-center justify-center py-6 sm:py-10">
        <SubscriptionLockedState
          title="Subscription inactive"
          description="Your subscription has lapsed. Renew to review and download your deliverables."
        />
      </div>
    );
  }

  const visible = deliverables.filter((d) => matchesFilter(d, filter));
  const allowed = shownItem?.revisions_allowed ?? listQuery.data?.revisions_allowed ?? null;
  const used = shownItem?.revisions_used ?? 0;
  const canDecide = !!shownItem && !viewingOlder && shownItem.status === "pending_approval";
  const lastRoundUsed = allowed !== null && used >= allowed;

  return (
    <div className="flex flex-col h-full animate-in fade-in slide-in-from-bottom-2 duration-500 overflow-hidden">
      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5 sm:mb-6 shrink-0">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-[#97A0B3] mb-1.5 sm:mb-2">
            {deliverables.length > 0 ? `CYCLE DELIVERABLES · ${pendingItems.length} WAITING FOR YOU` : "NO DELIVERABLES YET"}
          </p>
          <h1 className="text-2xl sm:text-3xl font-bold text-white">Review</h1>
        </div>
        {pendingItems.length > 1 && (
          <button
            onClick={handleApproveAll}
            disabled={!!bulkProgress}
            className="text-xs sm:text-[13px] text-[#97A0B3] hover:text-white transition-colors text-left sm:text-right disabled:opacity-60"
          >
            {bulkProgress ?? (
              <>
                Approve everything in one tap: <span className="font-bold text-white hover:underline">Approve all {pendingItems.length}</span>
              </>
            )}
          </button>
        )}
      </div>

      {deliverables.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center text-center bg-[#161F2D] rounded-[24px] border border-[#2A3446] p-10">
          <div className="w-12 h-12 rounded-2xl bg-white/[0.03] border border-[#2A3446] flex items-center justify-center mb-4">
            <Film className="w-5 h-5 text-[#97A0B3]" />
          </div>
          <h3 className="text-base font-semibold text-white mb-1">No content yet — your team is working on your first batch.</h3>
          <p className="text-sm text-[#97A0B3] max-w-md">
            Each piece appears here after your pod lead's quality check. We'll notify you in the portal and by email when something is ready for your review.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 flex-1 min-h-0 pb-6">
          {/* Left Column: Batch List */}
          <div className="col-span-1 lg:col-span-3 bg-[#161F2D] rounded-[24px] border border-[#2A3446] p-4 flex flex-col overflow-hidden max-h-[420px] lg:max-h-none">
            <div className="flex flex-wrap gap-1 mb-3" role="tablist" aria-label="Filter deliverables">
              {FILTERS.map((f) => (
                <button
                  key={f.key}
                  role="tab"
                  aria-selected={filter === f.key}
                  onClick={() => setFilter(f.key)}
                  className={`shrink-0 px-2.5 py-1 rounded-lg text-[11px] font-bold transition-colors ${
                    filter === f.key ? "bg-white/[0.08] text-white" : "text-[#97A0B3] hover:text-white"
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>
            <div className="flex-1 overflow-y-auto space-y-2 pr-1 scrollbar-hide">
              {visible.length === 0 ? (
                <div className="p-4 text-center text-sm text-[#97A0B3]">
                  No {FILTERS.find((f) => f.key === filter)?.label.toLowerCase()} deliverables match your filter.{" "}
                  <button className="underline text-white" onClick={() => setFilter("all")}>Clear filter</button>
                </div>
              ) : (
                visible.map((d) => {
                  const isSelected = selectedItem?.id === d.id;
                  return (
                    <button
                      key={d.id}
                      onClick={() => select(d.id)}
                      className={`w-full flex items-center gap-4 p-3 rounded-2xl border text-left transition-all ${
                        isSelected ? "bg-[#0B111C]/40 border-white/[0.1] shadow-lg" : "border-transparent hover:bg-white/[0.02]"
                      }`}
                    >
                      <div className="w-14 h-14 rounded-xl bg-black overflow-hidden shrink-0 border border-[#2A3446] flex items-center justify-center">
                        <Thumbnail item={d} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="text-[13px] font-bold truncate text-white">{d.title}</h4>
                        <p className="text-xs text-[#97A0B3] truncate mb-2">{d.type_label} · v{d.version}</p>
                        <StatusBadge item={d} />
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </div>

          {/* Middle Column: Player */}
          <div className="col-span-1 lg:col-span-5 bg-[#161F2D] rounded-[24px] border border-[#2A3446] flex flex-col relative overflow-hidden min-h-[420px] sm:min-h-[500px]">
            {versions.length > 1 && selectedItem && (
              <div className="absolute top-4 left-1/2 -translate-x-1/2 z-10 flex p-1 bg-[#0B111C]/80 backdrop-blur-md rounded-full border border-[#2A3446]">
                {[...versions].reverse().map((v) => {
                  const active = shownItem?.id === v.id;
                  return (
                    <button
                      key={v.id}
                      onClick={() => setViewVersionId(v.id === selectedItem.id ? null : v.id)}
                      className={`px-3 sm:px-4 py-1.5 rounded-full text-[12px] sm:text-[13px] font-bold transition-colors ${
                        active ? "bg-[#161F2D] text-white shadow-sm border border-[#2A3446]" : "text-[#97A0B3] hover:text-white"
                      }`}
                    >
                      v{v.version}{v.id === selectedItem.id ? " · latest" : ""}
                    </button>
                  );
                })}
              </div>
            )}

            <div className="flex-1 flex items-center justify-center p-6 pt-16 bg-[#0B111C]/30">
              {shownItem ? (
                <MediaPreview item={shownItem} onRefresh={refresh} />
              ) : deliverableId && detailQuery.isLoading ? (
                <Loader2 className="w-6 h-6 animate-spin text-[#97A0B3]" />
              ) : (
                <div className="text-sm text-[#97A0B3] text-center px-6">
                  {deliverableId ? "This deliverable isn't available. It may still be in production." : "Select an asset to view"}
                </div>
              )}
            </div>

            <div className="h-[64px] shrink-0 border-t border-[#2A3446] px-6 flex items-center justify-between bg-[#0B111C]/30 gap-3">
              <span className="text-[13px] text-[#97A0B3] truncate">
                {shownItem ? `${shownItem.type_label} · v${shownItem.version}${viewingOlder ? " · earlier version" : ""}` : "No asset selected"}
              </span>
              <span className="text-xs font-medium text-[#97A0B3] tabular-nums shrink-0">
                {shownItem?.created_at ? `Delivered ${new Date(shownItem.created_at).toLocaleDateString()}` : ""}
              </span>
            </div>
          </div>

          {/* Right Column: Details & Actions */}
          <div className="col-span-1 lg:col-span-4 bg-[#161F2D] rounded-[24px] border border-[#2A3446] p-4 sm:p-6 flex flex-col overflow-hidden">
            {shownItem ? (
              <div className="flex-1 overflow-y-auto pr-1 scrollbar-hide space-y-6">
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-[0.1em] text-[#97A0B3] mb-2">
                    {shownItem.type_label} ·{" "}
                    {shownItem.scheduled_at
                      ? `Publishes ${new Date(shownItem.scheduled_at).toLocaleDateString(undefined, { day: "numeric", month: "short" })}`
                      : shownItem.due_date
                        ? `Planned for ${new Date(shownItem.due_date).toLocaleDateString(undefined, { day: "numeric", month: "short" })}`
                        : "In your content calendar"}
                  </p>
                  <h2 className="text-2xl font-normal text-white break-words">{shownItem.title}</h2>
                  <div className="mt-2"><StatusBadge item={shownItem} /></div>
                </div>

                {viewingOlder && (
                  <div className="bg-[#0B111C]/50 rounded-xl p-4 border border-[#2A3446] text-[13px] text-[#97A0B3]">
                    You're viewing an earlier version.{" "}
                    <button className="underline text-white" onClick={() => setViewVersionId(null)}>Back to latest</button>
                  </div>
                )}

                {allowed !== null && (
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[13px] font-bold text-white">Revision rounds</span>
                      <span className="text-xs text-[#97A0B3]">{Math.min(used, allowed)} of {allowed} used</span>
                    </div>
                    <div className="h-1.5 w-full rounded-full flex gap-1">
                      {Array.from({ length: Math.max(allowed, 1) }).map((_, i) => (
                        <div key={i} className={`h-full flex-1 rounded-full ${used > i ? "bg-[#7FA0D6]" : "bg-white/[0.08]"}`} />
                      ))}
                    </div>
                  </div>
                )}

                {shownItem.rejection_comment && (
                  <div>
                    <h4 className="text-[13px] font-bold text-white mb-2">Your requested changes</h4>
                    <p className="text-[13px] text-[#97A0B3] leading-relaxed bg-[#0B111C]/50 rounded-xl p-4 border border-[#2A3446] whitespace-pre-wrap">
                      {shownItem.rejection_comment}
                    </p>
                  </div>
                )}

                {actionError && (
                  <div role="alert" className="flex gap-2 text-[13px] text-[#F1C9A5] bg-[#D8BF9B]/10 border border-[#D8BF9B]/30 rounded-xl p-3">
                    <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                    <span>{actionError}</span>
                  </div>
                )}

                {canDecide && (
                  <div className="pt-1">
                    <h4 className="text-[13px] font-bold text-white mb-3">Asking for a change?</h4>
                    {lastRoundUsed ? (
                      <p className="text-[13px] text-[#97A0B3] mb-4">
                        All revision rounds included in your plan have been used for this piece.
                      </p>
                    ) : (
                      <>
                        <div className="flex flex-wrap gap-2 mb-4">
                          {["Less text", "Different music", "Stronger hook", "Colour feels off-brand", "Wrong product"].map((tag) => (
                            <button
                              key={tag}
                              onClick={() => setCommentText((prev) => (prev ? `${prev} · ${tag}` : tag))}
                              className="px-3 py-1.5 rounded-lg bg-white/[0.03] hover:bg-white/[0.08] border border-[#2A3446] text-xs font-bold text-[#97A0B3] transition-colors"
                            >
                              {tag}
                            </button>
                          ))}
                        </div>
                        <label htmlFor="change-request" className="sr-only">Describe the changes you need</label>
                        <textarea
                          id="change-request"
                          value={commentText}
                          onChange={(e) => setCommentText(e.target.value)}
                          placeholder="Tell your creative pod what to change (required)…"
                          className="w-full bg-[#0B111C]/50 border border-[#2A3446] rounded-xl p-4 text-[13px] text-white placeholder:text-[#97A0B3] resize-none focus:outline-none focus:border-white/[0.2] transition-colors h-24 mb-4"
                        />
                      </>
                    )}
                    <div className="flex items-center gap-3">
                      {!lastRoundUsed && (
                        <button
                          onClick={() => requestChangesMutation.mutate({ id: shownItem.id, comment: commentText.trim() })}
                          disabled={requestChangesMutation.isPending || !commentText.trim()}
                          className="flex-1 px-4 py-3 rounded-full border border-[#2A3446] text-[13px] font-bold text-white hover:bg-[#0B111C] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {requestChangesMutation.isPending ? "Sending..." : "Request change"}
                        </button>
                      )}
                      <button
                        onClick={() => approveMutation.mutate(shownItem.id)}
                        disabled={approveMutation.isPending}
                        className="flex-1 px-4 py-3 rounded-full bg-[#BCCCE6] text-[#0B111C] text-[13px] font-bold hover:bg-white transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <Check className="w-4 h-4" />
                        {approveMutation.isPending ? "Approving..." : "Approve"}
                      </button>
                    </div>
                  </div>
                )}

                {!viewingOlder && shownItem.status === "revision_requested" && (
                  <div className="flex gap-3 bg-[#0B111C]/50 rounded-xl p-4 border border-[#2A3446]">
                    <Clock className="w-4 h-4 text-[#97A0B3] shrink-0 mt-0.5" />
                    <p className="text-[13px] text-[#97A0B3] leading-relaxed">
                      Your pod is working on the revision. The new version will appear here after a quality check, and we'll notify you.
                    </p>
                  </div>
                )}

                {APPROVED_STATUSES.has(shownItem.status) && (
                  <div className="space-y-3">
                    <p className="text-[13px] text-[#97A0B3]">
                      Approved{shownItem.approved_at ? ` on ${new Date(shownItem.approved_at).toLocaleDateString()}` : ""}. The final file is ready to download.
                    </p>
                    {shownItem.download_url ? (
                      <a
                        href={shownItem.download_url}
                        download
                        target="_blank"
                        rel="noopener noreferrer"
                        className="w-full px-4 py-3 rounded-full bg-[#BCCCE6] text-[#0B111C] text-[13px] font-bold hover:bg-white transition-colors flex items-center justify-center gap-2"
                      >
                        <Download className="w-4 h-4" /> Download
                      </a>
                    ) : (
                      <button onClick={refresh} className="w-full px-4 py-3 rounded-full border border-[#2A3446] text-[13px] font-bold text-white">
                        Refresh download link
                      </button>
                    )}
                  </div>
                )}
              </div>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-center p-6 text-[#97A0B3]">
                <h3 className="text-sm font-semibold text-white mb-1">No deliverable selected</h3>
                <p className="text-xs max-w-xs leading-relaxed">Select a piece to preview it, compare versions, and approve or request changes.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {toastMessage && (
        <div role="status" className="fixed bottom-6 right-6 z-50 bg-[#161F2D] text-white px-5 py-3 rounded-xl shadow-2xl border border-white/[0.1] text-sm font-medium flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-[#BCCCE6]" />
          {toastMessage}
        </div>
      )}
    </div>
  );
}
