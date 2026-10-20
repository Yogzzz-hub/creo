import { CreoInlineLoader } from "../../components/ui/CreoLoader";
import { PublishingPanel } from "../../components/ops/PublishingPanel";
import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, Check, Clock, Download, Film, ImageIcon, RefreshCw, History, Loader2, Volume2, Instagram, ChevronDown, ChevronUp, LayoutList, PlayCircle, Filter as FilterIcon } from "lucide-react";
import { useAuth } from "../../lib/auth-context";
import {
  approveDeliverable,
  fetchPortalDeliverable,
  fetchPortalDeliverables,
  requestChanges,
  uploadVoiceNote,
} from "../../lib/deliverables-api";
import { HttpError } from "../../lib/http";
import { useOnboardingGate } from "../../lib/useOnboardingGate";
import { SubscriptionLockedState } from "../../components/portal/SubscriptionLockedState";
import { DeliverableHistoryModal } from "../../components/portal/DeliverableHistoryModal";
import { VoiceFeedbackRecorder } from "../../components/portal/VoiceFeedbackRecorder";
import { VoicePlayer } from "../../components/portal/VoicePlayer";

import type { DeliverableItem, DeletedDeliverableRecord } from "../../types/api";

type Filter = "all" | "needs_you" | "revision" | "approved" | "deleted";
type FormatFilter = "all" | "reel" | "post" | "story" | "carousel";

const FILTERS: { key: Filter; label: string }[] = [
  { key: "all", label: "All" },
  { key: "needs_you", label: "Needs you" },
  { key: "revision", label: "In revision" },
  { key: "approved", label: "Approved" },
  { key: "deleted", label: "Archived" },
];

const APPROVED_STATUSES = new Set(["approved", "scheduled", "publishing", "published", "publish_failed"]);

function matchesFilter(item: DeliverableItem, filter: Filter): boolean {
  if (filter === "needs_you") return item.status === "pending_approval";
  if (filter === "revision") return item.status === "revision_requested";
  if (filter === "approved") return APPROVED_STATUSES.has(item.status);
  if (filter === "deleted") return false;
  return true;
}

function getFilterForDeliverable(item?: DeliverableItem | null): Filter {
  if (!item) return "all";
  if (item.status === "pending_approval") return "needs_you";
  if (item.status === "revision_requested") return "revision";
  if (APPROVED_STATUSES.has(item.status)) return "approved";
  return "all";
}

function matchesFormat(item: DeliverableItem, format: FormatFilter): boolean {
  if (format === "all") return true;
  const t = (item.deliverable_type || "").toLowerCase();
  if (format === "reel") return t === "reel" || !!item.is_video;
  if (format === "post") return t === "poster" || t === "static_post" || t === "post";
  if (format === "story") return t === "story";
  if (format === "carousel") return t === "carousel";
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
        ? "bg-amber-500/20 text-amber-300 border border-amber-500/35 font-bold"
        : "bg-[#7FA0D6]/15 text-[#BCCCE6]";
  const label =
    item.status === "pending_approval"
      ? "Needs you"
      : item.status === "revision_requested"
        ? "Revision Requested"
        : item.status_label;
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded text-[11px] font-bold ${tone}`}>
      {item.status === "revision_requested" && <RefreshCw className="w-3 h-3 text-amber-400" />}
      {label}
    </span>
  );
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

  const frame = isTall(item)
    ? "aspect-[9/16] max-w-[300px] max-h-[38vh] md:max-h-none"
    : "aspect-[4/5] max-w-[380px] max-h-[38vh] md:max-h-none";

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
          className="w-full h-full max-h-[38vh] md:max-h-none object-contain bg-black"
        />
      ) : (
        <img
          key={src}
          src={src}
          alt={item.title}
          onLoad={() => setReady(true)}
          onError={onError}
          className="w-full h-full max-h-[38vh] md:max-h-none object-contain bg-black"
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
  return <section role="status" aria-live="polite" className="space-y-5 animate-page-in"><div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">{[0, 1, 2].map(i => <div key={i} className="rounded-2xl p-5 bg-[#161F2D] border border-[#2A3446] space-y-4 motion-safe:animate-pulse"><div className="aspect-video rounded-xl bg-[#2A3446]" /><div className="h-4 w-2/3 rounded bg-[#2A3446]" /><div className="h-3 w-1/2 rounded bg-[#2A3446]" /></div>)}</div></section>;
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
  const deletedRecords: DeletedDeliverableRecord[] = listQuery.data?.deleted_records ?? [];

  const [filter, setFilter] = useState<Filter>(() => {
    if (deliverableId) {
      const cached = queryClient.getQueryData<{ items: DeliverableItem[] }>(["portal", "deliverables", clientId])?.items;
      const target = cached?.find((d) => d.id === deliverableId);
      if (target) return getFilterForDeliverable(target);
    }
    return "needs_you";
  });
  const [formatFilter, setFormatFilter] = useState<FormatFilter>("all");
  const [viewVersionId, setViewVersionId] = useState<string | null>(null);
  const [commentText, setCommentText] = useState("");
  const [recordedAudio, setRecordedAudio] = useState<{ blob: Blob; duration: number } | null>(null);
  const [isUploadingVoice, setIsUploadingVoice] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [bulkProgress, setBulkProgress] = useState<string | null>(null);
  const [historyModalDeliverable, setHistoryModalDeliverable] = useState<{ id: string; title: string } | null>(null);
  const [mobileTab, setMobileTab] = useState<"review" | "list">("review");
  const [mobilePublishingOpen, setMobilePublishingOpen] = useState(false);
  const [mobileRevisionHistoryOpen, setMobileRevisionHistoryOpen] = useState(false);
  const [mobileVoiceOpen, setMobileVoiceOpen] = useState(false);

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
    const filtered = deliverables.filter((d) => matchesFilter(d, filter) && matchesFormat(d, formatFilter));
    return (
      filtered[0] ??
      deliverables.find((d) => matchesFilter(d, filter)) ??
      deliverables.find((d) => d.status === "pending_approval") ??
      deliverables.find((d) => APPROVED_STATUSES.has(d.status)) ??
      deliverables[0]
    );
  }, [deliverableId, deliverables, detailQuery.data, filter, formatFilter]);

  const versions = detailQuery.data && selectedItem && detailQuery.data.root_id === selectedItem.root_id
    ? detailQuery.data.versions
    : [];
  const shownItem = (viewVersionId && versions.find((v) => v.id === viewVersionId)) || selectedItem;
  const viewingOlder = !!shownItem && !!selectedItem && shownItem.id !== selectedItem.id;

  const select = (id: string) => {
    setViewVersionId(null);
    setCommentText("");
    setActionError(null);
    setMobileTab("review");
    const target = deliverables.find((item) => item.id === id) ?? (detailQuery.data?.id === id ? detailQuery.data : undefined);
    if (target) {
      if (!matchesFilter(target, filter)) {
        setFilter(getFilterForDeliverable(target));
      }
      if (!matchesFormat(target, formatFilter)) {
        setFormatFilter("all");
      }
    }
    navigate(`/portal/deliverables/${id}`, { replace: !!deliverableId });
  };

  const handleFilterChange = (nextFilter: Filter) => {
    setFilter(nextFilter);
    const matchWithFmt = deliverables.find((d) => matchesFilter(d, nextFilter) && matchesFormat(d, formatFilter));
    const matchAnyFmt = deliverables.find((d) => matchesFilter(d, nextFilter));
    if (!matchWithFmt && matchAnyFmt) {
      setFormatFilter("all");
    }
    const nextMatch = matchWithFmt ?? matchAnyFmt;
    if (nextMatch) select(nextMatch.id);
  };

  const handleFormatChange = (nextFmt: FormatFilter) => {
    setFormatFilter(nextFmt);
    const matchWithCurrent = deliverables.find((d) => matchesFilter(d, filter) && matchesFormat(d, nextFmt));
    if (matchWithCurrent) {
      select(matchWithCurrent.id);
    } else {
      const matchAnyFilter = deliverables.find((d) => matchesFormat(d, nextFmt));
      if (matchAnyFilter) {
        setFilter(getFilterForDeliverable(matchAnyFilter));
        select(matchAnyFilter.id);
      }
    }
  };

  // Keep the active filter in sync with the selected/navigated deliverable
  useEffect(() => {
    if (!deliverables || deliverables.length === 0) return;

    if (deliverableId) {
      const target = deliverables.find((d) => d.id === deliverableId) ?? (detailQuery.data?.id === deliverableId ? detailQuery.data : undefined);
      if (target) {
        if (!matchesFilter(target, filter)) {
          setFilter(getFilterForDeliverable(target));
        }
        if (!matchesFormat(target, formatFilter)) {
          setFormatFilter("all");
        }
      }
    } else {
      // Landing on /portal/deliverables without an ID:
      // If there are no pending approval items and filter is 'needs_you', default to 'approved' or 'all'
      const hasPending = deliverables.some((d) => d.status === "pending_approval");
      if (!hasPending && filter === "needs_you") {
        const nextDefault = deliverables.some((d) => APPROVED_STATUSES.has(d.status))
          ? "approved"
          : deliverables.some((d) => d.status === "revision_requested")
          ? "revision"
          : "all";
        setFilter(nextDefault);
      }
    }
  }, [deliverableId, deliverables, detailQuery.data?.id]);

  // Keep the URL on the item being shown so it can be shared or reopened.
  useEffect(() => {
    if (!deliverableId && selectedItem) {
      navigate(`/portal/deliverables/${selectedItem.id}`, { replace: true });
    }
  }, [deliverableId, selectedItem?.id, navigate]);

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
    queryClient.invalidateQueries({ queryKey: ["publishing"] });
  };

  const [publishingReview, setPublishingReview] = useState<{ id: string; fingerprint: string } | null>(null);
  const approveMutation = useMutation({
    mutationFn: (id: string) => approveDeliverable(id, clientId, crypto.randomUUID(), publishingReview?.id === id ? publishingReview.fingerprint : undefined),
    onSuccess: () => {
      refresh();
      setActionError(null);
      showToast("Approved — your download is ready.");
    },
    onError: (error) => setActionError(errorMessage(error, "Approval failed. Please retry.")),
  });

  const requestChangesMutation = useMutation({
    mutationFn: ({
      id,
      comment,
      voiceNoteUrl,
      duration,
    }: {
      id: string;
      comment: string;
      voiceNoteUrl?: string;
      duration?: number;
    }) => requestChanges(id, clientId, comment, voiceNoteUrl, duration),
    onSuccess: () => {
      refresh();
      setCommentText("");
      setRecordedAudio(null);
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
      <div className="w-full">
        <SubscriptionLockedState
          title="Deliverables Queue Locked"
          description="Complete setup to review and approve your deliverables."
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
      <div className="w-full">
        <SubscriptionLockedState
          title="Subscription inactive"
          description="Your subscription has lapsed. Renew to review and download your deliverables."
        />
      </div>
    );
  }

  const visible = deliverables.filter((d) => matchesFilter(d, filter) && matchesFormat(d, formatFilter));
  const allowed = shownItem?.revisions_allowed ?? listQuery.data?.revisions_allowed ?? null;
  const used = shownItem?.revisions_used ?? 0;
  const canDecide = !!shownItem && !viewingOlder && shownItem.status === "pending_approval";
  const lastRoundUsed = allowed !== null && used >= allowed;

  return (
    <div className="flex flex-col h-full animate-in fade-in slide-in-from-bottom-2 duration-500 overflow-hidden">
      {/* ── Actions Row ── */}
      {pendingItems.length > 1 && (
        <div className="flex justify-end mb-4 shrink-0">
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
        </div>
      )}

      {deliverables.length === 0 ? (
        <div className="flex-1 flex items-center justify-center py-16 text-center">
          <p className="text-sm text-[#97A0B3]">No assets to show</p>
        </div>
      ) : (
        <div className="flex flex-col gap-2.5 sm:gap-3 flex-1 min-h-0 pb-2">
          {/* Mobile Filter Bar (< md): Single Compact Row with Status Dropdown + Format Dropdown */}
          <div className="flex md:hidden items-center gap-2 shrink-0">
            {/* Status Dropdown */}
            <div className="relative flex-1 min-w-0">
              <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-2.5 text-[#7FA0D6]">
                <FilterIcon className="size-3" />
              </div>
              <select
                aria-label="Filter deliverables by status"
                value={filter}
                onChange={(e) => handleFilterChange(e.target.value as Filter)}
                className="w-full appearance-none bg-[#161F2D] border border-[#2A3446] hover:border-[#7FA0D6] rounded-xl pl-7 pr-7 py-2 text-xs font-bold text-white focus:outline-none focus:ring-1 focus:ring-[#7FA0D6] transition-colors cursor-pointer truncate"
              >
                <option value="needs_you" className="bg-[#161F2D] text-white">
                  Needs you ({deliverables.filter((d) => d.status === "pending_approval").length})
                </option>
                <option value="revision" className="bg-[#161F2D] text-white">
                  In revision ({deliverables.filter((d) => d.status === "revision_requested").length})
                </option>
                <option value="approved" className="bg-[#161F2D] text-white">
                  Approved ({deliverables.filter((d) => APPROVED_STATUSES.has(d.status)).length})
                </option>
                <option value="all" className="bg-[#161F2D] text-white">
                  All ({deliverables.length})
                </option>
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-2 text-[#7FA0D6]">
                <ChevronDown className="size-3.5" />
              </div>
            </div>

            {/* Format Dropdown */}
            <div className="relative flex-1 min-w-0">
              <select
                aria-label="Filter deliverables by format"
                value={formatFilter}
                onChange={(e) => handleFormatChange(e.target.value as FormatFilter)}
                className="w-full appearance-none bg-[#161F2D] border border-[#2A3446] hover:border-[#7FA0D6] rounded-xl px-3 pr-7 py-2 text-xs font-bold text-white focus:outline-none focus:ring-1 focus:ring-[#7FA0D6] transition-colors cursor-pointer truncate"
              >
                <option value="all" className="bg-[#161F2D] text-white">All Formats</option>
                <option value="reel" className="bg-[#161F2D] text-white">Reels</option>
                <option value="post" className="bg-[#161F2D] text-white">Posts</option>
                <option value="story" className="bg-[#161F2D] text-white">Stories</option>
                <option value="carousel" className="bg-[#161F2D] text-white">Carousels</option>
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-2 text-[#7FA0D6]">
                <ChevronDown className="size-3.5" />
              </div>
            </div>
          </div>

          {/* Desktop Top Filter Bar (md: and up - unified single packed toolbar) */}
          <div className="hidden md:flex items-center justify-between gap-3 p-1.5 bg-[#161F2D] border border-[#2A3446] rounded-xl shrink-0">
            {/* Status Tabs (Left) */}
            <div className="flex items-center gap-1 bg-[#0B111C]/60 p-1 rounded-lg border border-[#2A3446]" role="tablist" aria-label="Status filter">
              {[
                { key: "needs_you" as Filter, label: "Needs you", count: deliverables.filter((d) => d.status === "pending_approval").length },
                { key: "revision" as Filter, label: "In revision", count: deliverables.filter((d) => d.status === "revision_requested").length },
                { key: "approved" as Filter, label: "Approved", count: deliverables.filter((d) => APPROVED_STATUSES.has(d.status)).length },
                { key: "all" as Filter, label: "All", count: deliverables.length },
              ].map((tab) => {
                const isActive = filter === tab.key;
                return (
                  <button
                    key={tab.key}
                    type="button"
                    role="tab"
                    aria-selected={isActive}
                    onClick={() => handleFilterChange(tab.key)}
                    className={`py-1.5 px-3 rounded-md text-xs font-bold transition-all truncate flex items-center justify-center gap-1.5 cursor-pointer ${
                      isActive
                        ? "bg-[#BCCCE6] text-[#0B111C] shadow-xs font-black"
                        : "text-[#97A0B3] hover:text-white hover:bg-white/[0.04]"
                    }`}
                  >
                    <span>{tab.label}</span>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold leading-none ${isActive ? "bg-[#0B111C]/20 text-[#0B111C]" : tab.key === "needs_you" && tab.count > 0 ? "bg-amber-500/20 text-amber-300" : "bg-[#0B111C] text-[#97A0B3]"}`}>
                      {tab.count}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Format Filter Segmented Bar (Right) */}
            <div className="flex items-center gap-1 bg-[#0B111C]/60 p-1 rounded-lg border border-[#2A3446]">
              <span className="text-[10px] font-bold text-[#97A0B3] px-1.5 uppercase tracking-wider">Format</span>
              {[
                { key: "all" as FormatFilter, label: "All" },
                { key: "reel" as FormatFilter, label: "Reels" },
                { key: "post" as FormatFilter, label: "Posts" },
                { key: "story" as FormatFilter, label: "Stories" },
                { key: "carousel" as FormatFilter, label: "Carousels" },
              ].map((fmt) => {
                const isFmtActive = formatFilter === fmt.key;
                return (
                  <button
                    key={fmt.key}
                    type="button"
                    onClick={() => handleFormatChange(fmt.key)}
                    className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all shrink-0 cursor-pointer ${
                      isFmtActive
                        ? "bg-[#7FA0D6] text-[#0B111C] shadow-xs font-black"
                        : "text-[#97A0B3] hover:text-white hover:bg-white/[0.04]"
                    }`}
                  >
                    {fmt.label}
                  </button>
                );
              })}
            </div>
          </div>

          {visible.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center py-16 text-center">
              <p className="text-sm text-[#97A0B3]">No assets to show</p>
              {(filter !== "all" || formatFilter !== "all") && (
                <button
                  type="button"
                  onClick={() => {
                    handleFilterChange("all");
                    setFormatFilter("all");
                  }}
                  className="mt-2 text-xs font-bold text-[#7FA0D6] hover:underline cursor-pointer"
                >
                  Clear filters
                </button>
              )}
            </div>
          ) : (
            <>
              {/* Mobile Master-Detail Switcher Bar (< lg) */}
              <div className="flex lg:hidden flex-col gap-2 shrink-0">
            <div className="flex items-center gap-1.5 p-1 bg-[#161F2D] border border-[#2A3446] rounded-xl">
              <button
                type="button"
                onClick={() => setMobileTab("list")}
                className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  mobileTab === "list"
                    ? "bg-[#BCCCE6] text-[#0B111C] shadow-sm font-black"
                    : "text-[#97A0B3] hover:text-white"
                }`}
              >
                <LayoutList className="size-3.5" />
                <span>All Assets ({visible.length})</span>
              </button>
              <button
                type="button"
                onClick={() => setMobileTab("review")}
                className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  mobileTab === "review"
                    ? "bg-[#BCCCE6] text-[#0B111C] shadow-sm font-black"
                    : "text-[#97A0B3] hover:text-white"
                }`}
              >
                <PlayCircle className="size-3.5" />
                <span className="truncate">Review {shownItem ? `· v${shownItem.version}` : ""}</span>
              </button>
            </div>

            {/* When in mobile review mode, show compact horizontal thumbnail strip so user can flick between deliverables */}
            {mobileTab === "review" && (
              <div className="flex items-center gap-2 overflow-x-auto whitespace-nowrap scrollbar-hide py-1.5 px-2 bg-[#0B111C]/60 rounded-xl border border-[#2A3446]">
                {visible.map((d) => {
                  const isSel = selectedItem?.id === d.id;
                  return (
                    <button
                      key={d.id}
                      type="button"
                      onClick={() => select(d.id)}
                      className={`flex items-center gap-2 px-2.5 py-1.5 rounded-lg border text-xs shrink-0 cursor-pointer transition-all ${
                        isSel
                          ? "bg-[#7FA0D6]/20 border-[#7FA0D6] text-white font-bold shadow-xs"
                          : "bg-[#161F2D] border-[#2A3446] text-[#97A0B3] hover:text-white"
                      }`}
                    >
                      <span className="size-5 rounded bg-black overflow-hidden shrink-0 flex items-center justify-center">
                        <Thumbnail item={d} />
                      </span>
                      <span className="max-w-[110px] truncate">{d.title}</span>
                      <span className="text-[10px] text-[#7FA0D6]">v{d.version}</span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 md:gap-4 flex-1 min-h-0">
            {/* Left Column: Batch List */}
            <div className={`${mobileTab === "list" ? "flex" : "hidden lg:flex"} col-span-1 lg:col-span-3 bg-[#161F2D] rounded-2xl border border-[#2A3446] p-3 sm:p-4 flex flex-col overflow-hidden max-h-[520px] lg:max-h-none`}>
              {/* Column Header */}
              <div className="flex items-center justify-between pb-2 mb-2.5 border-b border-[#2A3446]">
                <span className="text-xs font-bold text-white uppercase tracking-wider">
                  {filter === "needs_you" ? "Needs Review" : filter === "revision" ? "In Revision" : filter === "approved" ? "Approved Assets" : "Deliverables"}
                </span>
                <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-[#0B111C] border border-[#2A3446] text-[#7FA0D6]">
                  {visible.length} {visible.length === 1 ? "item" : "items"}
                </span>
              </div>
              <div className="flex-1 overflow-y-auto space-y-2 pr-1 scrollbar-hide">
                {filter === "deleted" ? (
                  deletedRecords.length === 0 ? (
                    <div className="p-4 text-center text-sm text-[#97A0B3]">
                      No retracted or archived deliverables on record.
                    </div>
                  ) : (
                    deletedRecords.map((del) => (
                      <div
                        key={del.id}
                        className="w-full p-3 rounded-2xl border border-rose-500/20 bg-[#0B111C]/40 text-left space-y-2"
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-white capitalize">{del.deliverable_type || "Asset"} · v{del.version}</span>
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/15 text-rose-400 border border-rose-500/30">
                            Archived
                          </span>
                        </div>
                        <div className="bg-[#161F2D] p-2.5 rounded-xl border border-[#2A3446]">
                          <p className="text-[10px] font-bold uppercase tracking-wider text-[#97A0B3] mb-0.5">
                            Reason for Deletion / Withdrawal:
                          </p>
                          <p className="text-xs text-rose-200 leading-snug">
                            "{del.deletion_reason}"
                          </p>
                        </div>
                        <div className="flex items-center justify-between text-[11px] text-[#97A0B3] pt-0.5">
                          <span>Retracted by Team Lead</span>
                          <span className="font-mono">{new Date(del.deleted_at).toLocaleDateString()}</span>
                        </div>
                      </div>
                    ))
                  )
                ) : visible.length === 0 ? (
                  <div className="p-4 text-center text-sm text-[#97A0B3]">
                    No {FILTERS.find((f) => f.key === filter)?.label.toLowerCase()} deliverables match your filter.{" "}
                    <button className="underline text-white cursor-pointer" onClick={() => handleFilterChange("all")}>Clear filter</button>
                  </div>
                ) : (
                  visible.map((d) => {
                    const isSelected = selectedItem?.id === d.id;
                    return (
                      <button
                        key={d.id}
                        onClick={() => select(d.id)}
                        className={`w-full flex items-center gap-3.5 p-3 rounded-2xl border text-left transition-all cursor-pointer ${
                          isSelected
                            ? "bg-[#0B111C] border-[#7FA0D6]/60 shadow-lg ring-1 ring-[#7FA0D6]/30"
                            : "border-[#2A3446]/40 bg-transparent hover:border-[#2A3446] hover:bg-white/[0.02]"
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
            <div className={`${mobileTab === "review" ? "flex" : "hidden lg:flex"} col-span-1 lg:col-span-5 bg-[#161F2D] rounded-2xl border border-[#2A3446] flex flex-col relative overflow-hidden min-h-0 sm:min-h-[500px]`}>
              {versions.length > 1 && selectedItem && (
                <div className="absolute top-3 left-1/2 -translate-x-1/2 z-10 flex p-1 bg-[#0B111C]/80 backdrop-blur-md rounded-full border border-[#2A3446]">
                  {[...versions].reverse().map((v) => {
                    const active = shownItem?.id === v.id;
                    return (
                      <button
                        key={v.id}
                        onClick={() => setViewVersionId(v.id === selectedItem.id ? null : v.id)}
                        className={`px-3 sm:px-4 py-1 rounded-full text-[12px] sm:text-[13px] font-bold transition-all cursor-pointer ${
                          active ? "bg-[#BCCCE6] text-[#0B111C] shadow-sm font-black" : "text-[#97A0B3] hover:text-white"
                        }`}
                      >
                        v{v.version}{v.id === selectedItem.id ? " · latest" : ""}
                      </button>
                    );
                  })}
                </div>
              )}

              <div className="flex-1 flex items-center justify-center p-2.5 sm:p-5 pt-10 sm:pt-14 bg-[#0B111C]/30">
                {shownItem ? (
                  <MediaPreview item={shownItem} onRefresh={refresh} />
                ) : deliverableId && detailQuery.isLoading ? (
                  <CreoInlineLoader />
                ) : (
                  <div className="text-sm text-[#97A0B3] text-center px-4">
                    {deliverableId ? "This deliverable isn't available. It may still be in production." : "Select an asset to view"}
                  </div>
                )}
              </div>

              <div className="h-[48px] sm:h-[52px] shrink-0 border-t border-[#2A3446] px-3.5 sm:px-5 flex items-center justify-between bg-[#0B111C]/30 gap-3">
                <span className="text-xs sm:text-[13px] text-[#97A0B3] truncate">
                  {shownItem ? `${shownItem.type_label} · v${shownItem.version}${viewingOlder ? " · earlier version" : ""}` : "No asset selected"}
                </span>
                <span className="text-[11px] sm:text-xs font-medium text-[#97A0B3] tabular-nums shrink-0">
                  {shownItem?.created_at ? `Delivered ${new Date(shownItem.created_at).toLocaleDateString()}` : ""}
                </span>
              </div>
            </div>

            {/* Right Column: Details & Actions */}
            <div className={`${mobileTab === "review" ? "flex" : "hidden lg:flex"} col-span-1 lg:col-span-4 bg-[#161F2D] rounded-2xl border border-[#2A3446] p-3.5 sm:p-5 flex flex-col overflow-hidden pb-24 md:pb-5`}>
              {shownItem ? (
                <div className="flex-1 overflow-y-auto pr-1 scrollbar-hide space-y-3.5 sm:space-y-4">
                  <div>
                    <p className="text-[11px] font-bold uppercase tracking-[0.1em] text-[#97A0B3] mb-1.5">
                      {shownItem.type_label} ·{" "}
                      {shownItem.scheduled_at
                        ? `Publishes ${new Date(shownItem.scheduled_at).toLocaleDateString(undefined, { day: "numeric", month: "short" })}`
                        : shownItem.due_date
                          ? `Planned for ${new Date(shownItem.due_date).toLocaleDateString(undefined, { day: "numeric", month: "short" })}`
                          : "In your content calendar"}
                    </p>
                    <h2 className="text-xl sm:text-2xl font-normal text-white break-words">{shownItem.title}</h2>

                    {/* Instagram Publishing Panel (Collapsible Accordion on Mobile, Expanded on Desktop) */}
                    <div className="mt-3 border border-[#2A3446] rounded-xl bg-[#0B111C]/40 overflow-hidden">
                      <button
                        type="button"
                        onClick={() => setMobilePublishingOpen((prev) => !prev)}
                        className="w-full flex items-center justify-between p-3 text-left font-bold text-xs text-white hover:bg-[#161F2D] transition-colors md:cursor-default"
                      >
                        <span className="flex items-center gap-2">
                          <Instagram className="size-4 text-[#7FA0D6]" />
                          <span>Instagram Publishing</span>
                        </span>
                        <span className="text-[#7FA0D6] md:hidden">
                          {mobilePublishingOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                        </span>
                      </button>
                      <div className={`${mobilePublishingOpen ? "block" : "hidden md:block"} p-3 pt-0 border-t border-[#2A3446]/40 md:border-t-0`}>
                        <PublishingPanel key={shownItem.id} deliverableId={shownItem.id} onReview={setPublishingReview} />
                      </div>
                    </div>

                    <div className="mt-2.5 flex flex-wrap items-center gap-2">
                      <StatusBadge item={shownItem} />
                      <button
                        type="button"
                        onClick={() => setHistoryModalDeliverable({ id: shownItem.id, title: shownItem.title })}
                        className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg border border-[#2A3446] bg-[#0B111C] hover:bg-[#161F2D] text-xs font-semibold text-[#7FA0D6] transition-colors cursor-pointer"
                      >
                        <History className="w-3.5 h-3.5" />
                        Full History & Audio
                      </button>
                    </div>
                  </div>

                  {viewingOlder && (
                    <div className="bg-[#0B111C]/50 rounded-xl p-3 sm:p-4 border border-[#2A3446] text-xs sm:text-[13px] text-[#97A0B3]">
                      You're viewing an earlier version.{" "}
                      <button className="underline text-white cursor-pointer" onClick={() => setViewVersionId(null)}>Back to latest</button>
                    </div>
                  )}

                  {/* Revision Rounds (Collapsible on Mobile, Expanded on Desktop) */}
                  {allowed !== null && (
                    <div className="border border-[#2A3446] rounded-xl bg-[#0B111C]/40 overflow-hidden">
                      <button
                        type="button"
                        onClick={() => setMobileRevisionHistoryOpen((prev) => !prev)}
                        className="w-full flex items-center justify-between p-3 text-left font-bold text-xs text-white hover:bg-[#161F2D] transition-colors md:cursor-default"
                      >
                        <span className="flex items-center gap-2">
                          <History className="size-4 text-[#7FA0D6]" />
                          <span>Revision Rounds ({Math.min(used, allowed)} of {allowed} used)</span>
                        </span>
                        <span className="text-[#7FA0D6] md:hidden">
                          {mobileRevisionHistoryOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                        </span>
                      </button>
                      <div className={`${mobileRevisionHistoryOpen ? "block" : "hidden md:block"} p-3 pt-0 space-y-2`}>
                        <div className="h-1.5 w-full rounded-full flex gap-1">
                          {Array.from({ length: Math.max(allowed, 1) }).map((_, i) => (
                            <div key={i} className={`h-full flex-1 rounded-full ${used > i ? "bg-[#7FA0D6]" : "bg-white/[0.08]"}`} />
                          ))}
                        </div>
                      </div>
                    </div>
                  )}

                  {shownItem.rejection_comment && (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between mb-1">
                        <h4 className="text-xs sm:text-[13px] font-bold text-white flex items-center gap-1.5">
                          <span className="size-1.5 rounded-full bg-amber-400" />
                          Your requested changes
                        </h4>
                        <button
                          type="button"
                          onClick={() => setHistoryModalDeliverable({ id: shownItem.id, title: shownItem.title || "Deliverable" })}
                          className="text-xs text-[#7FA0D6] hover:underline flex items-center gap-1 cursor-pointer"
                        >
                          <History className="w-3.5 h-3.5" />
                          Full History & Audio
                        </button>
                      </div>
                      <p className="text-xs sm:text-[13px] text-[#97A0B3] leading-relaxed bg-[#0B111C]/50 rounded-xl p-3 sm:p-4 border border-[#2A3446] whitespace-pre-wrap">
                        {shownItem.rejection_comment}
                      </p>
                      {shownItem.voice_note_url && (
                        <div className="mt-2.5">
                          <VoicePlayer
                            audioUrl={shownItem.voice_note_url}
                            durationSeconds={shownItem.voice_note_duration}
                            authorName="Your Revision Voice Note"
                          />
                        </div>
                      )}
                    </div>
                  )}

                  {actionError && (
                    <div role="alert" className="flex gap-2 text-xs sm:text-[13px] text-[#F1C9A5] bg-[#D8BF9B]/10 border border-[#D8BF9B]/30 rounded-xl p-3">
                      <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                      <span>{actionError}</span>
                    </div>
                  )}

                  {canDecide && (
                    <div className="pt-1 space-y-3">
                      <h4 className="text-xs sm:text-[13px] font-bold text-white">Asking for a change?</h4>
                      {lastRoundUsed ? (
                        <p className="text-xs sm:text-[13px] text-[#97A0B3]">
                          All revision rounds included in your plan have been used for this piece.
                        </p>
                      ) : (
                        <>
                          <div className="flex flex-wrap gap-1.5">
                            {["Less text", "Different music", "Stronger hook", "Colour feels off-brand", "Wrong product"].map((tag) => {
                              const isSelectedTag = commentText.includes(tag);
                              return (
                                <button
                                  key={tag}
                                  type="button"
                                  onClick={() => setCommentText((prev) => (prev ? `${prev} · ${tag}` : tag))}
                                  className={`px-2.5 py-1 rounded-lg border text-xs font-bold transition-all cursor-pointer ${
                                    isSelectedTag
                                      ? "bg-[#7FA0D6]/20 border-[#7FA0D6]/50 text-[#BCCCE6] shadow-xs"
                                      : "bg-white/[0.03] hover:bg-white/[0.08] border-[#2A3446] text-[#97A0B3] hover:text-white"
                                  }`}
                                >
                                  {tag}
                                </button>
                              );
                            })}
                          </div>
                          <label htmlFor="change-request" className="sr-only">Describe the changes you need</label>
                          <textarea
                            id="change-request"
                            value={commentText}
                            onChange={(e) => setCommentText(e.target.value)}
                            placeholder="Tell your creative pod what to change…"
                            className="w-full bg-[#0B111C]/50 border border-[#2A3446] rounded-xl p-3 text-xs sm:text-[13px] text-white placeholder:text-[#97A0B3] resize-none focus:outline-none focus:border-white/[0.2] transition-colors h-16 sm:h-18"
                          />

                          {/* Voice Note Feedback (Accordion on Mobile, Open on Desktop) */}
                          <div className="border border-[#2A3446] rounded-xl bg-[#0B111C]/40 overflow-hidden">
                            <button
                              type="button"
                              onClick={() => setMobileVoiceOpen((prev) => !prev)}
                              className="w-full flex items-center justify-between p-2.5 text-left font-bold text-xs text-white hover:bg-[#161F2D] transition-colors md:cursor-default"
                            >
                              <span className="flex items-center gap-2">
                                <Volume2 className="size-3.5 text-[#7FA0D6]" />
                                <span>Voice Note Feedback {recordedAudio ? "• 1 Recorded" : ""}</span>
                              </span>
                              <span className="flex items-center gap-1.5 text-xs text-[#7FA0D6] md:hidden">
                                <span>{recordedAudio ? "Recorded" : "Record"}</span>
                                {mobileVoiceOpen || recordedAudio ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                              </span>
                            </button>
                            <div className={`${mobileVoiceOpen || recordedAudio ? "block" : "hidden md:block"} p-2.5 pt-1`}>
                              <VoiceFeedbackRecorder
                                onRecordingComplete={(blob, duration) => setRecordedAudio({ blob, duration })}
                                onClearRecording={() => setRecordedAudio(null)}
                              />
                            </div>
                          </div>
                        </>
                      )}

                      {/* Sticky Floating Bottom Bar for Primary Actions on Mobile, Inlined on Desktop */}
                      <div className="fixed bottom-0 inset-x-0 z-40 p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] bg-[#0B111C]/95 backdrop-blur-md border-t border-white/10 flex items-center gap-2.5 md:static md:p-0 md:bg-transparent md:border-none md:shadow-none">
                        {!lastRoundUsed && (
                          <button
                            onClick={async () => {
                              if (!shownItem) return;
                              try {
                                setIsUploadingVoice(true);
                                let voiceUrl: string | undefined = undefined;
                                if (recordedAudio?.blob) {
                                  const upRes = await uploadVoiceNote(shownItem.id, recordedAudio.blob, recordedAudio.duration);
                                  voiceUrl = upRes.voice_note_url;
                                }
                                await requestChangesMutation.mutateAsync({
                                  id: shownItem.id,
                                  comment: commentText.trim() || "[Voice Feedback Attached]",
                                  voiceNoteUrl: voiceUrl,
                                  duration: recordedAudio?.duration,
                                });
                              } catch {
                                // error set in mutation
                              } finally {
                                setIsUploadingVoice(false);
                              }
                            }}
                            disabled={
                              requestChangesMutation.isPending ||
                              isUploadingVoice ||
                              (!commentText.trim() && !recordedAudio?.blob)
                            }
                            className="flex-1 px-4 py-2.5 rounded-full border border-[#2A3446] bg-[#161F2D] md:bg-transparent text-xs sm:text-[13px] font-bold text-white hover:bg-[#0B111C] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 cursor-pointer shadow-sm"
                          >
                            {isUploadingVoice ? (
                              <>
                                <Loader2 className="w-4 h-4 animate-spin text-[#7FA0D6]" />
                                Uploading...
                              </>
                            ) : requestChangesMutation.isPending ? (
                              "Sending..."
                            ) : (
                              "Request change"
                            )}
                          </button>
                        )}
                        <button
                          onClick={() => approveMutation.mutate(shownItem.id)}
                          disabled={approveMutation.isPending}
                          className="flex-1 px-4 py-2.5 rounded-full bg-[#BCCCE6] text-[#0B111C] text-xs sm:text-[13px] font-bold hover:bg-white transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer shadow-md"
                        >
                          <Check className="w-4 h-4" />
                          {approveMutation.isPending ? "Approving..." : "Approve"}
                        </button>
                      </div>
                    </div>
                  )}

                  {!viewingOlder && shownItem.status === "revision_requested" && (
                    <div className="bg-amber-500/10 border border-amber-500/30 rounded-2xl p-3.5 sm:p-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="flex size-2 rounded-full bg-amber-400 animate-ping" />
                          <h4 className="text-xs sm:text-sm font-bold text-amber-300">Revision Requested</h4>
                        </div>
                        <span className="text-[10px] sm:text-[11px] font-mono font-bold text-amber-400 bg-amber-500/20 px-2 py-0.5 rounded border border-amber-500/30">
                          In Progress
                        </span>
                      </div>

                      {shownItem.voice_note_url && !shownItem.rejection_comment && (
                        <div>
                          <p className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-[#97A0B3] mb-1.5 flex items-center gap-1.5">
                            <Volume2 className="w-3.5 h-3.5 text-[#7FA0D6]" /> Attached Voice Note
                          </p>
                          <VoicePlayer
                            audioUrl={shownItem.voice_note_url}
                            durationSeconds={shownItem.voice_note_duration}
                            authorName="Your Revision Voice Note"
                          />
                        </div>
                      )}

                      <div className="flex gap-2.5 items-start text-xs text-[#97A0B3] leading-relaxed pt-1">
                        <Clock className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                        <p>
                          Your creative pod has received your revision request and is currently producing the revised version. You will receive an instant notification once it passes quality assurance and is ready for your review.
                        </p>
                      </div>
                    </div>
                  )}

                  {APPROVED_STATUSES.has(shownItem.status) && (
                    <div className="space-y-3">
                      <p className="text-xs sm:text-[13px] text-[#97A0B3]">
                        Approved{shownItem.approved_at ? ` on ${new Date(shownItem.approved_at).toLocaleDateString()}` : ""}. The final file is ready to download.
                      </p>
                      {shownItem.file_url && (
                        <a
                          href={shownItem.file_url}
                          download
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-full bg-[#BCCCE6] text-[#0B111C] text-xs sm:text-[13px] font-bold hover:bg-white transition-colors cursor-pointer shadow-sm"
                        >
                          <Download className="w-4 h-4" /> Download final asset
                        </a>
                      )}
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-10 text-sm text-[#97A0B3]">
                  Select an asset to view details and decision actions.
                </div>
              )}
            </div>
          </div>
            </>
          )}
        </div>
      )}

      {toastMessage && (
        <div role="status" className="fixed bottom-6 right-6 z-50 bg-[#161F2D] text-white px-5 py-3 rounded-xl shadow-2xl border border-white/[0.1] text-sm font-medium flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-[#BCCCE6]" />
          {toastMessage}
        </div>
      )}

      {historyModalDeliverable && (
        <DeliverableHistoryModal
          isOpen={true}
          onClose={() => setHistoryModalDeliverable(null)}
          deliverableId={historyModalDeliverable.id}
          deliverableTitle={historyModalDeliverable.title}
          isClient={true}
        />
      )}
    </div>
  );
}
