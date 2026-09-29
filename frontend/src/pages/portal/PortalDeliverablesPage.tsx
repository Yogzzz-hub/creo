import React, { useState } from "react";
import { Link } from "react-router";
import {
  Zap,
  ArrowRight,
  Loader2,
  Check,
  CheckCircle2,
  Play,
  Download,
  X,
  FileText,
  Sliders,
  ChevronDown,
  Search,
  RefreshCw,
  Image as ImageIcon,
  Layers,
  Clock,
  ExternalLink
} from "lucide-react";
import { useAuth } from "../../lib/auth-context";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { request } from "../../lib/http";
import { fetchPortalDeliverables, approveDeliverable, requestChanges } from "../../lib/deliverables-api";
import { SubscriptionLockedState } from "../../components/portal/SubscriptionLockedState";

interface DeliverableCardData {
  id: string;
  formatBadge: string;
  formatType: "reel" | "static" | "story";
  status: "approved" | "pending_approval" | "in_production" | "revision_requested";
  statusBadgeText: string;
  statusBadgeVariant: "approved" | "action_required" | "in_production" | "in_revision";
  previewType: "video" | "figma" | "motion";
  previewId?: string;
  previewMetaTopLeft?: string;
  previewMetaTopRight?: string;
  previewHeading?: string;
  previewSubheading?: string;
  previewMetaBottom?: string;
  progressPercent?: number;
  title: string;
  subtitle: string;
  detailStatus: string;
  detailStatusColor: string;
  version: string;
  downloadUrl?: string;
}

const INITIAL_DELIVERABLES: DeliverableCardData[] = [
  {
    id: "del-1",
    formatBadge: "Reel 9:16",
    formatType: "reel",
    status: "approved",
    statusBadgeText: "Approved",
    statusBadgeVariant: "approved",
    previewType: "video",
    previewMetaTopLeft: "ROUND 1",
    previewMetaBottom: "Reel #df3f59\nv1 • video/mp4",
    title: "Summer Drop Campaign Reel",
    subtitle: "Scheduled for Instagram • Production SLA: Met",
    detailStatus: "Round 1 of 2 (Approved without changes)",
    detailStatusColor: "text-emerald-600",
    version: "v1.0",
    downloadUrl: "https://creo-ai-dev.s3.amazonaws.com/mock/summer_drop_reel.mp4",
  },
  {
    id: "del-2",
    formatBadge: "Static Carousel 4:5",
    formatType: "static",
    status: "pending_approval",
    statusBadgeText: "Action Required",
    statusBadgeVariant: "action_required",
    previewType: "figma",
    previewMetaTopLeft: "CAROUSEL 01/05",
    previewMetaTopRight: "SLA: 18h remaining",
    previewHeading: "Campaign Launch Slide",
    previewSubheading: "High-Res Figma Asset",
    title: "Weekly Feature Launch Poster · v1.0",
    subtitle: "Submitted: Today, 10:15 AM via Figma Sync",
    detailStatus: "Review feedback expected to unblock batch",
    detailStatusColor: "text-amber-600",
    version: "v1.0",
  },
  {
    id: "del-3",
    formatBadge: "Story Motion 9:16",
    formatType: "story",
    status: "in_production",
    statusBadgeText: "In Production",
    statusBadgeVariant: "in_production",
    previewType: "motion",
    previewMetaTopLeft: "Creative Pod: Alpha",
    previewMetaTopRight: "In Rendering",
    previewHeading: "Motion Graphics & Audio Sync",
    previewSubheading: "Est. handoff: Tomorrow, 5:00 PM",
    progressPercent: 65,
    title: "Flash Sale 24h Story Asset",
    subtitle: "Creative Pod: Alpha • Story batch pipeline",
    detailStatus: "Brief finalized & script locked",
    detailStatusColor: "text-slate-500",
    version: "v0.9",
  },
];

export function PortalDeliverablesPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const clientId = user?.id || "00000000-0000-0000-0000-000000000001";

  // Subscription check query
  const { data: subData, isLoading: isSubLoading } = useQuery({
    queryKey: ["client-subscription"],
    queryFn: () => request<any>("/api/v1/payments/subscription"),
    staleTime: 0,
    refetchOnMount: "always",
  });

  // Query deliverables from backend
  const { data: deliverablesData } = useQuery({
    queryKey: ["portal", "deliverables", clientId],
    queryFn: () => fetchPortalDeliverables(clientId),
    refetchInterval: 15000,
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

  // Local state for deliverables cards & interactions
  const [deliverables, setDeliverables] = useState<DeliverableCardData[]>(INITIAL_DELIVERABLES);
  const [activeTab, setActiveTab] = useState<"all" | "review" | "revision" | "approved">("approved");
  const [formatFilter, setFormatFilter] = useState<"all" | "reel" | "static" | "story">("all");
  const [formatDropdownOpen, setFormatDropdownOpen] = useState(false);

  // Modals state
  const [previewItem, setPreviewItem] = useState<DeliverableCardData | null>(null);
  const [isPlayingVideo, setIsPlayingVideo] = useState(false);
  const [revisionItem, setRevisionItem] = useState<DeliverableCardData | null>(null);
  const [revisionComment, setRevisionComment] = useState("");
  const [briefItem, setBriefItem] = useState<DeliverableCardData | null>(null);
  const [inspectLayersItem, setInspectLayersItem] = useState<DeliverableCardData | null>(null);

  // Toast feedback
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 3500);
  };

  // Sync real deliverables if returned from backend
  React.useEffect(() => {
    if (deliverablesData?.items && deliverablesData.items.length > 0) {
      const mapped: DeliverableCardData[] = deliverablesData.items.map((item, idx) => {
        const isAppr = item.status === "approved" || item.status === "published" || item.status === "scheduled";
        const isRev = item.status === "revision_requested" || item.status === "qa_rejected";
        const isPending = item.status === "pending_approval";
        const fileTypeLower = (item.file_type || "").toLowerCase();
        const isVideo = fileTypeLower.includes("video") || fileTypeLower.includes("mp4");
        const isStory = fileTypeLower.includes("story");
        
        const formatBadge = isVideo ? "Reel 9:16" : isStory ? "Story Motion 9:16" : "Static Carousel 4:5";
        const formatType: "reel" | "static" | "story" = isVideo ? "reel" : isStory ? "story" : "static";
        const status: "approved" | "pending_approval" | "in_production" | "revision_requested" = isAppr
          ? "approved"
          : isRev
          ? "revision_requested"
          : isPending
          ? "pending_approval"
          : "in_production";
        const statusBadgeVariant: "approved" | "action_required" | "in_production" | "in_revision" = isAppr
          ? "approved"
          : isRev
          ? "in_revision"
          : isPending
          ? "action_required"
          : "in_production";
        const previewType: "video" | "figma" | "motion" = isVideo ? "video" : isStory ? "motion" : "figma";
        const title = item.file_url
          ? item.file_url.split("/").pop()?.replace(/[-_.]/g, " ") || `Asset #${idx + 1}`
          : `Asset #${idx + 1}`;
        const timeFormatted = item.created_at
          ? new Date(item.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
          : "Today";

        return {
          id: item.id,
          formatBadge,
          formatType,
          status,
          statusBadgeText: isAppr ? "Approved" : isRev ? "In Revision" : isPending ? "Action Required" : "In Production",
          statusBadgeVariant,
          previewType,
          previewMetaTopLeft: isVideo ? `ROUND ${item.revision_round || 1}` : "CAROUSEL 01/05",
          previewMetaTopRight: isPending ? "SLA: 18h remaining" : undefined,
          previewHeading: title,
          previewSubheading: item.file_type || "High-Res Asset",
          title: `Deliverable · Round ${item.revision_round || 1}`,
          subtitle: `Pod Production • ${timeFormatted}`,
          detailStatus: isAppr
            ? "Round 1 of 2 (Approved without changes)"
            : isPending
            ? "Review feedback expected to unblock batch"
            : "Work in progress",
          detailStatusColor: isAppr ? "text-emerald-600" : isPending ? "text-amber-600" : "text-slate-500",
          version: `v${item.revision_round || 1}.0`,
          downloadUrl: item.file_url,
        };
      });

      // Merge avoiding duplicate IDs with mock demo items
      setDeliverables((prev) => {
        const customIds = new Set(mapped.map((m) => m.id));
        const filteredPrev = prev.filter((p) => !customIds.has(p.id));
        return [...filteredPrev, ...mapped];
      });
    }
  }, [deliverablesData]);

  // Mutations
  const approveMutation = useMutation({
    mutationFn: async (id: string) => {
      const idempotencyKey = crypto.randomUUID();
      return await approveDeliverable(id, clientId, idempotencyKey);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["portal", "deliverables", clientId] });
    },
  });

  const requestChangesMutation = useMutation({
    mutationFn: async ({ id, comment }: { id: string; comment: string }) => {
      return await requestChanges(id, clientId, comment);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["portal", "deliverables", clientId] });
    },
  });

  const handleApprove = (item: DeliverableCardData) => {
    setDeliverables((prev) =>
      prev.map((d) =>
        d.id === item.id
          ? {
              ...d,
              status: "approved",
              statusBadgeText: "Approved",
              statusBadgeVariant: "approved",
              detailStatus: "Approved without changes",
              detailStatusColor: "text-emerald-600",
            }
          : d
      )
    );
    showToast(`"${item.title}" approved! Assets synced to Instagram publisher.`);
    approveMutation.mutate(item.id);
  };

  const handleReviseSubmit = () => {
    if (!revisionItem) return;
    const comment = revisionComment.trim() || "Adjustment requested on creative framing.";
    setDeliverables((prev) =>
      prev.map((d) =>
        d.id === revisionItem.id
          ? {
              ...d,
              status: "revision_requested",
              statusBadgeText: "In Revision",
              statusBadgeVariant: "in_revision",
              detailStatus: `Revision requested: "${comment.slice(0, 32)}..."`,
              detailStatusColor: "text-rose-600",
            }
          : d
      )
    );
    showToast(`Revision request sent to Pod Alpha.`);
    requestChangesMutation.mutate({ id: revisionItem.id, comment });
    setRevisionItem(null);
    setRevisionComment("");
  };

  const handleDownloadHD = (item: DeliverableCardData) => {
    const dummyContent = `High-Resolution Master File Asset: ${item.title} (${item.formatBadge})`;
    const blob = new Blob([dummyContent], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${item.title.toLowerCase().replace(/[^a-z0-9]/g, "-")}-master.zip`;
    a.click();
    URL.revokeObjectURL(url);
    showToast(`Downloading HD production package for ${item.title}...`);
  };

  // Filter deliverables
  const countAwaiting = deliverables.filter((d) => d.status === "pending_approval").length;
  const countInRevision = deliverables.filter((d) => d.status === "revision_requested").length;
  const countApproved = deliverables.filter((d) => d.status === "approved").length;

  const filteredDeliverables = deliverables.filter((d) => {
    // Tab filter
    if (activeTab === "review" && d.status !== "pending_approval") return false;
    if (activeTab === "revision" && d.status !== "revision_requested") return false;
    if (activeTab === "approved" && d.status !== "approved") return false;

    // Format filter
    if (formatFilter !== "all" && d.formatType !== formatFilter) return false;

    return true;
  });

  if (isSubLoading) {
    return (
      <div className="animate-page-in space-y-4 sm:space-y-5 max-w-[1440px] mx-auto px-4 md:px-8">
        <div className="card-surface p-12 text-center flex flex-col items-center justify-center min-h-[320px]">
          <Loader2 className="size-8 text-[#0052FF] animate-spin mb-3" />
          <p className="text-xs font-semibold text-slate-500">Loading Deliverables Workspace...</p>
        </div>
      </div>
    );
  }

  if (!isSubscribed) {
    return (
      <div className="animate-page-in space-y-4 sm:space-y-5 max-w-[1440px] mx-auto px-4 md:px-8">
        <SubscriptionLockedState
          title={isExpired ? "Creative Retainer Expired" : "Deliverables Workspace Locked"}
          description={
            isExpired
              ? "Your monthly creative retainer billing cycle has concluded. Deliverables approvals and active reviews are paused until you renew."
              : "Access to static posters, reels, and approval stages requires an active production retainer. Choose a plan to assign your dedicated creative team."
          }
        />
      </div>
    );
  }

  return (
    <div className="animate-page-in space-y-6 max-w-[1440px] mx-auto px-4 md:px-8 pb-12">
      {/* ── 1. Top Add-on Banner ── */}
      <div className="rounded-2xl bg-[#FFFDF5] border border-amber-200/80 p-5 sm:p-6 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="size-10 rounded-xl bg-amber-100 flex items-center justify-center text-amber-700 shadow-xs shrink-0">
              <Zap className="size-5 fill-amber-500 text-amber-600" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-amber-950 tracking-tight">
                Need more content this month?
              </h3>
              <p className="text-xs text-amber-800/80 mt-0.5 font-medium">
                Purchase extra credits for reels, static posters, or story packs anytime.
              </p>
            </div>
          </div>
          <Link
            to="/portal/payments"
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#0052FF] hover:bg-[#0045D8] px-5 py-2.5 text-xs font-bold text-white shadow-sm hover:shadow-md transition-all shrink-0 active:scale-98"
          >
            <span>Order Add-on Pack</span>
            <ArrowRight className="size-3.5" />
          </Link>
        </div>
      </div>

      {/* ── 2. Filter & Navigation Bar ── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pt-1">
        {/* Sub-nav Pill Tabs */}
        <div className="flex flex-wrap items-center gap-2 pb-1 sm:pb-0">
          <button
            type="button"
            onClick={() => setActiveTab("all")}
            className={`px-3.5 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all ${
              activeTab === "all"
                ? "bg-[#0F172A] text-white shadow-xs"
                : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
            }`}
          >
            All Assets
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("review")}
            className={`px-3.5 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all ${
              activeTab === "review"
                ? "bg-[#0F172A] text-white shadow-xs"
                : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
            }`}
          >
            Awaiting Review ({countAwaiting})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("revision")}
            className={`px-3.5 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all ${
              activeTab === "revision"
                ? "bg-[#0F172A] text-white shadow-xs"
                : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
            }`}
          >
            In Revision ({countInRevision})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("approved")}
            className={`px-4 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all flex items-center gap-2 ${
              activeTab === "approved"
                ? "bg-[#0F172A] text-white shadow-xs"
                : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
            }`}
          >
            <span className="size-2 rounded-full bg-emerald-400" />
            <span>Ready to Publish / Approved ({countApproved})</span>
          </button>
        </div>

        {/* Right Format Dropdown */}
        <div className="relative shrink-0">
          <button
            type="button"
            onClick={() => setFormatDropdownOpen(!formatDropdownOpen)}
            className="inline-flex items-center justify-between gap-2 px-3.5 py-2 rounded-xl bg-white border border-slate-200 text-xs font-semibold text-slate-700 hover:border-slate-300 shadow-xs transition-all w-full sm:w-auto"
          >
            <span>
              {formatFilter === "all"
                ? "All Formats (Reels, Static, Stories)"
                : formatFilter === "reel"
                ? "Reels (9:16)"
                : formatFilter === "static"
                ? "Static Posters (4:5)"
                : "Story Packs (9:16)"}
            </span>
            <ChevronDown className="size-3.5 text-slate-400" />
          </button>

          {formatDropdownOpen && (
            <div className="absolute right-0 mt-1.5 w-64 rounded-xl bg-white border border-slate-200 shadow-xl py-1.5 z-30 text-xs font-semibold">
              <button
                type="button"
                onClick={() => {
                  setFormatFilter("all");
                  setFormatDropdownOpen(false);
                }}
                className={`w-full text-left px-3.5 py-2 hover:bg-slate-50 flex items-center justify-between ${
                  formatFilter === "all" ? "text-[#0052FF] font-bold bg-blue-50/40" : "text-slate-700"
                }`}
              >
                <span>All Formats (Reels, Static, Stories)</span>
                {formatFilter === "all" && <Check className="size-3.5" />}
              </button>
              <button
                type="button"
                onClick={() => {
                  setFormatFilter("reel");
                  setFormatDropdownOpen(false);
                }}
                className={`w-full text-left px-3.5 py-2 hover:bg-slate-50 flex items-center justify-between ${
                  formatFilter === "reel" ? "text-[#0052FF] font-bold bg-blue-50/40" : "text-slate-700"
                }`}
              >
                <span>Reels (9:16 Video)</span>
                {formatFilter === "reel" && <Check className="size-3.5" />}
              </button>
              <button
                type="button"
                onClick={() => {
                  setFormatFilter("static");
                  setFormatDropdownOpen(false);
                }}
                className={`w-full text-left px-3.5 py-2 hover:bg-slate-50 flex items-center justify-between ${
                  formatFilter === "static" ? "text-[#0052FF] font-bold bg-blue-50/40" : "text-slate-700"
                }`}
              >
                <span>Static Carousel (4:5 Poster)</span>
                {formatFilter === "static" && <Check className="size-3.5" />}
              </button>
              <button
                type="button"
                onClick={() => {
                  setFormatFilter("story");
                  setFormatDropdownOpen(false);
                }}
                className={`w-full text-left px-3.5 py-2 hover:bg-slate-50 flex items-center justify-between ${
                  formatFilter === "story" ? "text-[#0052FF] font-bold bg-blue-50/40" : "text-slate-700"
                }`}
              >
                <span>Story Motion (9:16 Asset)</span>
                {formatFilter === "story" && <Check className="size-3.5" />}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ── 3. Deliverables Cards Grid ── */}
      {filteredDeliverables.length === 0 ? (
        <div className="card-surface p-12 text-center flex flex-col items-center justify-center rounded-2xl border border-slate-200">
          <div className="size-12 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 mb-3">
            <Search className="size-5" />
          </div>
          <h4 className="text-sm font-bold text-slate-800">No deliverables match this filter</h4>
          <p className="text-xs text-slate-500 mt-1">
            Try selecting &quot;All Assets&quot; or resetting the format filter.
          </p>
          <button
            type="button"
            onClick={() => {
              setActiveTab("all");
              setFormatFilter("all");
            }}
            className="mt-4 px-4 py-2 bg-[#0052FF] text-white text-xs font-bold rounded-xl hover:bg-[#0045D8] transition-colors"
          >
            Reset Filters
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 items-stretch">
          {filteredDeliverables.map((item) => (
            <div
              key={item.id}
              className="card-surface p-4 sm:p-5 rounded-2xl border border-slate-200/90 shadow-sm hover:shadow-md transition-all flex flex-col justify-between group"
            >
              {/* Card Top Header */}
              <div>
                <div className="flex items-center justify-between gap-2 mb-3">
                  <span
                    className={`text-[11px] font-semibold px-2.5 py-0.5 rounded-md border ${
                      item.formatType === "reel"
                        ? "bg-blue-50 text-[#0052FF] border-blue-100"
                        : "bg-slate-100 text-slate-700 border-slate-200"
                    }`}
                  >
                    {item.formatBadge}
                  </span>

                  {/* Status Badge */}
                  {item.statusBadgeVariant === "approved" && (
                    <span className="bg-emerald-50 text-emerald-600 border border-emerald-100 text-[11px] font-bold px-2.5 py-0.5 rounded-md flex items-center gap-1">
                      <Check className="size-3 stroke-[2.5]" />
                      <span>{item.statusBadgeText}</span>
                    </span>
                  )}
                  {item.statusBadgeVariant === "action_required" && (
                    <span className="bg-amber-50 text-amber-700 border border-amber-200 text-[11px] font-bold px-2.5 py-0.5 rounded-md flex items-center gap-1.5">
                      <span className="size-1.5 rounded-full bg-amber-500" />
                      <span>{item.statusBadgeText}</span>
                    </span>
                  )}
                  {item.statusBadgeVariant === "in_production" && (
                    <span className="bg-slate-100 text-slate-600 text-[11px] font-semibold px-2.5 py-0.5 rounded-md flex items-center gap-1">
                      <RefreshCw className="size-3 animate-spin text-slate-500" />
                      <span>{item.statusBadgeText}</span>
                    </span>
                  )}
                  {item.statusBadgeVariant === "in_revision" && (
                    <span className="bg-rose-50 text-rose-600 border border-rose-100 text-[11px] font-bold px-2.5 py-0.5 rounded-md flex items-center gap-1">
                      <Clock className="size-3" />
                      <span>{item.statusBadgeText}</span>
                    </span>
                  )}
                </div>

                {/* ── Media Preview Area ── */}
                {/* 1. Video / Reel Preview (Black surface) */}
                {item.previewType === "video" && (
                  <div className="bg-[#06080F] rounded-xl relative overflow-hidden flex flex-col justify-between p-4 h-[320px] sm:h-[340px] shadow-inner">
                    {/* Top Tag */}
                    <div className="flex items-center justify-between">
                      <span className="bg-white/10 text-white/80 font-mono text-[9px] px-2 py-0.5 rounded backdrop-blur-xs border border-white/5">
                        {item.previewMetaTopLeft || "ROUND 1"}
                      </span>
                    </div>

                    {/* Centered Play Button */}
                    <div className="flex items-center justify-center">
                      <button
                        type="button"
                        onClick={() => {
                          setPreviewItem(item);
                          setIsPlayingVideo(true);
                        }}
                        className="size-12 rounded-full bg-white/10 hover:bg-white/20 border border-white/20 text-white flex items-center justify-center transition-all hover:scale-110 cursor-pointer backdrop-blur-xs shadow-lg group-hover:bg-white/25"
                        title="Play Reel"
                      >
                        <Play className="size-5 fill-white text-white ml-0.5" />
                      </button>
                    </div>

                    {/* Bottom Meta */}
                    <div className="text-center font-mono">
                      <div className="text-[11px] font-bold text-cyan-300">
                        Reel #df3f59
                      </div>
                      <div className="text-[10px] text-slate-400 mt-0.5">
                        v1 • video/mp4
                      </div>
                    </div>
                  </div>
                )}

                {/* 2. Figma Carousel Preview (Purple gradient with dot matrix) */}
                {item.previewType === "figma" && (
                  <div
                    className="bg-gradient-to-br from-[#1E0B36] via-[#2A1047] to-[#120726] rounded-xl relative overflow-hidden flex flex-col justify-between p-4 h-[320px] sm:h-[340px] shadow-inner"
                    style={{
                      backgroundImage:
                        "radial-gradient(rgba(255, 255, 255, 0.15) 1px, transparent 1px)",
                      backgroundSize: "16px 16px",
                    }}
                  >
                    {/* Top Row */}
                    <div className="flex items-center justify-between gap-2">
                      <span className="bg-black/40 text-white/80 font-mono text-[9px] px-2 py-0.5 rounded border border-white/10 backdrop-blur-xs">
                        {item.previewMetaTopLeft || "CAROUSEL 01/05"}
                      </span>
                      <span className="bg-amber-500 text-amber-950 font-bold text-[9px] px-2 py-0.5 rounded shadow-xs">
                        {item.previewMetaTopRight || "SLA: 18h remaining"}
                      </span>
                    </div>

                    {/* Center Icon & Heading */}
                    <div className="flex flex-col items-center justify-center text-center my-auto">
                      <div className="size-12 rounded-2xl bg-white/10 border border-white/20 flex items-center justify-center text-white mb-2 shadow-inner backdrop-blur-xs">
                        <ImageIcon className="size-6 text-white/90" />
                      </div>
                      <h5 className="text-xs font-bold text-white tracking-tight">
                        {item.previewHeading || "Campaign Launch Slide"}
                      </h5>
                      <p className="text-[10px] text-white/60 font-medium mt-0.5">
                        {item.previewSubheading || "High-Res Figma Asset"}
                      </p>
                    </div>

                    {/* Bottom Action Pill */}
                    <button
                      type="button"
                      onClick={() => setInspectLayersItem(item)}
                      className="bg-black/40 hover:bg-black/60 text-white/90 text-[11px] font-medium px-3.5 py-1.5 rounded-lg border border-white/10 flex items-center justify-between w-full backdrop-blur-xs transition-colors cursor-pointer"
                    >
                      <span>Inspect layers</span>
                      <Search className="size-3 text-white/60" />
                    </button>
                  </div>
                )}

                {/* 3. Motion Story Preview (Slate light container with progress) */}
                {item.previewType === "motion" && (
                  <div className="bg-[#F8FAFC] border border-slate-200/80 rounded-xl relative overflow-hidden flex flex-col justify-between p-4 h-[320px] sm:h-[340px]">
                    {/* Top Row */}
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-slate-500 font-mono text-[9px] border border-slate-200 rounded px-2 py-0.5 bg-white/80">
                        {item.previewMetaTopLeft || "Creative Pod: Alpha"}
                      </span>
                      <span className="bg-blue-50 text-[#0052FF] font-mono text-[9px] rounded px-2 py-0.5 border border-blue-100 font-bold">
                        {item.previewMetaTopRight || "In Rendering"}
                      </span>
                    </div>

                    {/* Center Sliders Icon & Text */}
                    <div className="flex flex-col items-center justify-center text-center my-auto">
                      <div className="size-11 rounded-full bg-blue-50 border border-blue-100 text-blue-600 flex items-center justify-center mb-2 shadow-xs">
                        <Sliders className="size-5" />
                      </div>
                      <h5 className="text-xs font-bold text-slate-800 tracking-tight">
                        {item.previewHeading || "Motion Graphics & Audio Sync"}
                      </h5>
                      <p className="text-[10px] text-slate-400 font-medium mt-0.5">
                        {item.previewSubheading || "Est. handoff: Tomorrow, 5:00 PM"}
                      </p>
                    </div>

                    {/* Bottom Progress Indicator */}
                    <div className="w-full">
                      <div className="w-full h-1.5 bg-slate-200 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-[#6366F1] rounded-full transition-all duration-1000"
                          style={{ width: `${item.progressPercent || 65}%` }}
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* Card Title & Info */}
                <div className="mt-3.5 space-y-1">
                  <h4 className="font-bold text-sm text-[#0F172A] leading-tight">
                    {item.title}
                  </h4>
                  <p className="text-xs text-slate-500 font-medium">
                    {item.subtitle}
                  </p>
                  <p className={`text-[11px] font-semibold ${item.detailStatusColor}`}>
                    {item.detailStatus}
                  </p>
                </div>
              </div>

              {/* Card Action Buttons */}
              <div className="pt-4 mt-4 border-t border-slate-100">
                {/* Variant 1: Approved Reel */}
                {item.status === "approved" && (
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setPreviewItem(item);
                        setIsPlayingVideo(true);
                      }}
                      className="flex-1 py-2 px-3 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-bold flex items-center justify-center gap-1.5 transition-colors shadow-2xs"
                    >
                      <ExternalLink className="size-3.5 text-slate-400" />
                      <span>Preview</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDownloadHD(item)}
                      className="flex-1 py-2 px-3 rounded-xl bg-[#0052FF] hover:bg-[#0045D8] text-white text-xs font-bold flex items-center justify-center gap-1.5 transition-all shadow-xs active:scale-95"
                    >
                      <Download className="size-3.5 stroke-[2.5]" />
                      <span>Download HD</span>
                    </button>
                  </div>
                )}

                {/* Variant 2: Pending Approval Carousel */}
                {item.status === "pending_approval" && (
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setRevisionItem(item)}
                      className="flex-1 py-2 px-3 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200/80 text-xs font-bold flex items-center justify-center gap-1 transition-colors active:scale-95"
                    >
                      <X className="size-3.5 stroke-[2.5]" />
                      <span>Revise</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleApprove(item)}
                      className="flex-1 py-2 px-3 rounded-xl bg-[#009B66] hover:bg-[#008758] text-white text-xs font-bold flex items-center justify-center gap-1 shadow-xs transition-colors active:scale-95"
                    >
                      <Check className="size-3.5 stroke-[2.5]" />
                      <span>Approve</span>
                    </button>
                  </div>
                )}

                {/* Variant 3: In Production Story */}
                {item.status === "in_production" && (
                  <button
                    type="button"
                    onClick={() => setBriefItem(item)}
                    className="w-full py-2 px-4 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors shadow-2xs"
                  >
                    <FileText className="size-3.5 text-slate-400" />
                    <span>View Concept &amp; Brief</span>
                  </button>
                )}

                {/* Variant 4: In Revision */}
                {item.status === "revision_requested" && (
                  <button
                    type="button"
                    onClick={() => setBriefItem(item)}
                    className="w-full py-2 px-4 rounded-xl bg-rose-50/70 border border-rose-200 text-rose-700 text-xs font-bold flex items-center justify-center gap-1.5 transition-colors"
                  >
                    <Clock className="size-3.5 text-rose-500" />
                    <span>In Active Pod Revision</span>
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}



      {/* ═══════════════ MODALS ═══════════════ */}

      {/* 1. Preview Modal */}
      {previewItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-4 animate-fade-in">
          <div className="bg-[#0F172A] border border-slate-700 text-white rounded-2xl w-full max-w-md overflow-hidden shadow-2xl flex flex-col">
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold">{previewItem.title}</span>
                <span className="bg-blue-500/20 text-blue-300 font-mono text-[10px] px-2 py-0.5 rounded">
                  {previewItem.version}
                </span>
              </div>
              <button
                type="button"
                onClick={() => {
                  setPreviewItem(null);
                  setIsPlayingVideo(false);
                }}
                className="text-slate-400 hover:text-white p-1 rounded-lg"
              >
                <X className="size-4" />
              </button>
            </div>

            {/* Video Canvas Simulation */}
            <div className="relative aspect-[9/16] bg-black max-h-[500px] flex items-center justify-center overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/30 pointer-events-none" />
              
              <div className="flex flex-col items-center justify-center text-center p-6 z-10">
                <button
                  type="button"
                  onClick={() => setIsPlayingVideo(!isPlayingVideo)}
                  className="size-16 rounded-full bg-[#0052FF]/90 hover:bg-[#0045D8] text-white flex items-center justify-center shadow-xl shadow-blue-500/30 mb-3 transition-transform hover:scale-105 active:scale-95 cursor-pointer"
                  title={isPlayingVideo ? "Pause preview" : "Play preview"}
                >
                  {isPlayingVideo ? (
                    <div className="flex items-center gap-1.5">
                      <span className="w-1.5 h-6 bg-white rounded-full animate-pulse" />
                      <span className="w-1.5 h-6 bg-white rounded-full animate-pulse" />
                    </div>
                  ) : (
                    <Play className="size-7 fill-white ml-1" />
                  )}
                </button>
                <h4 className="text-sm font-bold text-white">{previewItem.title}</h4>
                <p className="text-xs text-slate-400 mt-1 font-mono">1080x1920 • 60 FPS • AAC Audio</p>
              </div>

              <div className="absolute bottom-4 inset-x-4 flex items-center justify-between text-xs text-slate-300 font-mono z-10">
                <span>00:14 / 00:30</span>
                <span className="text-emerald-400 font-bold">4K Master Sync</span>
              </div>
            </div>

            <div className="p-4 bg-slate-900 border-t border-slate-800 flex items-center justify-between gap-3">
              <span className="text-xs text-slate-400">Ready for Instagram Auto-Scheduler</span>
              <button
                type="button"
                onClick={() => handleDownloadHD(previewItem)}
                className="px-4 py-2 bg-[#0052FF] hover:bg-[#0045D8] text-white text-xs font-bold rounded-xl flex items-center gap-1.5 transition-all shadow-sm"
              >
                <Download className="size-3.5" />
                Download Video
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 2. Revision Modal */}
      {revisionItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-fade-in">
          <div className="bg-white border border-slate-200 text-slate-900 rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-base font-bold text-[#0F172A]">Request Changes from Pod Alpha</h3>
                <p className="text-xs text-slate-500 mt-0.5">Asset: {revisionItem.title}</p>
              </div>
              <button
                type="button"
                onClick={() => setRevisionItem(null)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
              >
                <X className="size-4" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-[#0F172A] mb-1.5">
                  Detailed Feedback for Creative Director
                </label>
                <textarea
                  rows={4}
                  value={revisionComment}
                  onChange={(e) => setRevisionComment(e.target.value)}
                  placeholder="e.g. Please adjust the CTA typography to match the brand guide and boost the contrast on slide 3..."
                  className="w-full text-xs font-medium text-slate-900 border border-slate-200 rounded-xl p-3.5 focus:border-[#0052FF] focus:ring-2 focus:ring-[#0052FF]/15 outline-none resize-none leading-relaxed"
                />
              </div>

              <div className="rounded-xl bg-amber-50 border border-amber-200 p-3 text-xs text-amber-800 flex items-start gap-2">
                <Clock className="size-4 text-amber-600 shrink-0 mt-0.5" />
                <span>
                  Revisions are fast-triaged by Maya Lin with a target turnaround of under 12 hours.
                </span>
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setRevisionItem(null)}
                  className="px-4 py-2 text-xs font-bold text-slate-500 hover:text-slate-800 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleReviseSubmit}
                  className="px-5 py-2.5 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-xl shadow-sm transition-all active:scale-95"
                >
                  Submit Revision Request
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 3. Concept & Brief Modal */}
      {briefItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-fade-in">
          <div className="bg-white border border-slate-200 text-slate-900 rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-[#0F172A]">Creative Concept &amp; Brief</h3>
                <span className="bg-blue-50 text-[#0052FF] font-bold text-[10px] px-2 py-0.5 rounded">
                  {briefItem.formatBadge}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setBriefItem(null)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
              >
                <X className="size-4" />
              </button>
            </div>

            <div className="space-y-4 text-xs">
              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  Target Campaign Hook
                </span>
                <p className="font-semibold text-slate-800 leading-relaxed">
                  &quot;Unlock 10x Velocity: Discover how modern SaaS founders eliminate design debt without hiring an in-house studio.&quot;
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 rounded-xl border border-slate-200">
                  <span className="text-[10px] text-slate-400 font-bold uppercase">Pod Lead</span>
                  <p className="font-bold text-slate-800 mt-0.5">Maya Lin</p>
                  <p className="text-[11px] text-slate-500">Creative Director</p>
                </div>
                <div className="p-3 rounded-xl border border-slate-200">
                  <span className="text-[10px] text-slate-400 font-bold uppercase">Audio Track</span>
                  <p className="font-bold text-slate-800 mt-0.5">Synthwave Pulse 124 BPM</p>
                  <p className="text-[11px] text-slate-500">Licensed Royalty-Free</p>
                </div>
              </div>

              <div className="flex items-center justify-end pt-2">
                <button
                  type="button"
                  onClick={() => setBriefItem(null)}
                  className="px-5 py-2 bg-[#0052FF] hover:bg-[#0045D8] text-white text-xs font-bold rounded-xl transition-all"
                >
                  Close Brief
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 4. Inspect Layers Modal */}
      {inspectLayersItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-4 animate-fade-in">
          <div className="bg-[#0F172A] border border-slate-700 text-white rounded-2xl w-full max-w-xl overflow-hidden shadow-2xl p-6">
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <Layers className="size-4 text-indigo-400" />
                <h3 className="text-sm font-bold text-white">Figma Vector Layers Inspector</h3>
              </div>
              <button
                type="button"
                onClick={() => setInspectLayersItem(null)}
                className="text-slate-400 hover:text-white p-1"
              >
                <X className="size-4" />
              </button>
            </div>

            <div className="space-y-3 font-mono text-xs">
              <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 space-y-1.5">
                <div className="flex justify-between text-slate-400 text-[11px]">
                  <span>Frame Canvas</span>
                  <span className="text-cyan-400">1080 x 1350 px (4:5 Ratio)</span>
                </div>
                <div className="flex justify-between text-slate-400 text-[11px]">
                  <span>Color Mode</span>
                  <span className="text-cyan-400">Display P3 / sRGB</span>
                </div>
              </div>

              <div className="space-y-1 text-slate-300">
                <div className="p-2 rounded-lg bg-slate-800/60 flex items-center justify-between">
                  <span>↳ #Header_Typography</span>
                  <span className="text-slate-500 text-[11px]">Inter SemiBold 48pt</span>
                </div>
                <div className="p-2 rounded-lg bg-slate-800/60 flex items-center justify-between">
                  <span>↳ #Product_Hero_Mockup</span>
                  <span className="text-slate-500 text-[11px]">Vector SVG (Lossless)</span>
                </div>
                <div className="p-2 rounded-lg bg-slate-800/60 flex items-center justify-between">
                  <span>↳ #Gradient_Backdrop_Mesh</span>
                  <span className="text-slate-500 text-[11px]">Hex #1E0B36 → #2D124D</span>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-5 mt-4 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setInspectLayersItem(null)}
                className="px-4 py-2 text-xs font-bold text-slate-400 hover:text-white transition-colors"
              >
                Done
              </button>
              <button
                type="button"
                onClick={() => {
                  setInspectLayersItem(null);
                  showToast("Figma project link copied to clipboard");
                }}
                className="px-4 py-2 bg-[#0052FF] hover:bg-[#0045D8] text-white text-xs font-bold rounded-xl flex items-center gap-1.5 shadow-sm"
              >
                <ExternalLink className="size-3.5" />
                Open in Figma
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Toast Notification ── */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-[#0F172A] text-white text-xs font-semibold px-4 py-3 rounded-xl shadow-2xl flex items-center gap-2.5 animate-slide-up border border-slate-800">
          <CheckCircle2 className="size-4 text-emerald-400 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}
    </div>
  );
}
