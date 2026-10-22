import { NativeSelect } from "../../ui/NativeSelect";
import { useAuth } from "../../lib/auth-context";
import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router";
import { motion } from "motion/react";
import { AdminTopHeader } from "../../components/admin/AdminTopHeader";
import { useQuery } from "@tanstack/react-query";
import { fetchPodDashboard, fetchClientRoster, type PodDashboardData } from "../../lib/ops-api";
import type { ClientRosterItem } from "../../types/ops";
import {
  Briefcase,
  Layers,
  FileCheck2,
  Star,
  Search,
  Clock,
  FileText,
  Plus,
  X,
  ArrowRight,
  Sparkles,
  CheckCircle2,
  ShieldCheck,
  Check,
  AlertTriangle,
} from "lucide-react";

interface DeliverableProgress {
  label: string;
  current: number;
  target: number;
  percent: number;
  color: string;
  note?: string;
}

interface Assignee {
  name: string;
  role: string;
  avatar: string;
  bg: string;
}

interface ClientAccount {
  id: string;
  name: string;
  avatar: string;
  avatarBg: string;
  tierBadge: string;
  tierBadgeColor: string;
  statusBadge: string;
  statusBadgeColor: string;
  contact: string;
  slackChannel: string;
  reviewAssetsCount: number;
  isUrgent?: boolean;
  deliverableTitle?: string;
  deliverables: DeliverableProgress[];
  assignees: Assignee[];
  nextHandoff: string;
  isHighPriority: boolean;
  hasReviewToday: boolean;
}

const INITIAL_CLIENTS: ClientAccount[] = [];

export function PodClientAllocationsPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [clients, setClients] = useState<ClientAccount[]>(INITIAL_CLIENTS);
  const [filterTab, setFilterTab] = useState<"all" | "review">("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [toastMessage, setToastMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [reallocationModal, setReallocationModal] = useState(false);

  // Review & Sign-Off Modal State
  const [reviewModal, setReviewModal] = useState<{
    isOpen: boolean;
    client: ClientAccount;
    checkmarks: { brand: boolean; typography: boolean; render: boolean };
  } | null>(null);

  // Centered Alert Modal State (Blurred Background)
  const [alertModal, setAlertModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    type?: "success" | "info" | "warning";
    clientId?: string;
  } | null>(null);

  const { data } = useQuery<PodDashboardData>({
    queryKey: ["pod_dashboard", user?.id, undefined],
    queryFn: () => fetchPodDashboard(),
    staleTime: 30_000,
    enabled: !!user?.id,
  });

  const { data: rosterData } = useQuery<ClientRosterItem[]>({
    queryKey: ["admin_clients_roster", user?.id],
    queryFn: () => fetchClientRoster(),
    staleTime: 30_000,
    enabled: !!user?.id,
  });

  useEffect(() => {
    if (!rosterData || rosterData.length === 0) {
      setClients([]);
      return;
    }
    const dynamicClients: ClientAccount[] = rosterData.map((r) => {
      const name = String(r.company_name || (r.instagram_username ? `@${r.instagram_username}` : (r.email ? r.email.split("@")[0] : "Client")));
      const initials = (name.replace(/[^a-zA-Z0-9 ]/g, "").trim().slice(0, 2) || "CL").toUpperCase();
      const normalizeKind = (k?: string) => (k || "").toLowerCase().trim();
      const isPosts = (k?: string) => ["static_post", "post", "posts", "poster", "posters"].includes(normalizeKind(k));
      const isReels = (k?: string) => ["reel", "reels", "video"].includes(normalizeKind(k));
      const isStories = (k?: string) => ["carousel", "story", "stories"].includes(normalizeKind(k));

      const reelsUsage = r.quota_usage?.find((q) => isReels(q.kind));
      const reelsQuota = reelsUsage?.quota || 4;
      const reelsUsed = reelsUsage?.used || 0;

      const postersUsage = r.quota_usage?.find((q) => isPosts(q.kind));
      const postersQuota = postersUsage?.quota || 8;
      const postersUsed = postersUsage?.used || 0;

      const storiesUsage = r.quota_usage?.find((q) => isStories(q.kind));
      const storiesQuota = storiesUsage?.quota || 8;
      const storiesUsed = storiesUsage?.used || 0;

      return {
        id: r.client_id || "",
        name,
        avatar: initials,
        avatarBg: "bg-app-base",
        tierBadge: (r.plan_display_name || r.plan_name || "GROWTH").toUpperCase(),
        tierBadgeColor: "bg-blue-500/15 text-app-accent-soft border-blue-500/30",
        statusBadge: "● Active Sprint",
        statusBadgeColor: "bg-blue-500/15 text-app-accent-soft border-blue-500/30",
        contact: r.email || "",
        slackChannel: `#${name.toLowerCase().replace(/[^a-z0-9]/g, "")}-creo`,
        reviewAssetsCount: 0,
        deliverableTitle: `${name} Active Campaign Cadence`,
        deliverables: [
          { label: "Reels", current: reelsUsed, target: reelsQuota, percent: Math.round((reelsUsed / (reelsQuota || 1)) * 100), color: "bg-blue-600 text-app-on-accent!" },
          { label: "Stories", current: storiesUsed, target: storiesQuota, percent: Math.round((storiesUsed / (storiesQuota || 1)) * 100), color: "bg-app-accent-soft" },
          { label: "Posts", current: postersUsed, target: postersQuota, percent: Math.round((postersUsed / (postersQuota || 1)) * 100), color: "bg-blue-600 text-app-on-accent!" },
        ],
        assignees: [
          { name: "Creative Pod", role: "Creative", avatar: "CP", bg: "bg-blue-600 text-app-on-accent!" },
        ],
        nextHandoff: "Scheduled Cadence Active",
        isHighPriority: false,
        hasReviewToday: false,
      };
    });
    setClients(dynamicClients);
  }, [rosterData]);

  const podName = data?.pod?.name || "Pod A";

  const showToast = (text: string, type: "success" | "error" = "success") => {
    setToastMessage({ type, text });
    setTimeout(() => setToastMessage(null), 4000);
  };

  const handleExportReport = () => {
    const headers = [
      "Client ID",
      "Client Name",
      "Tier Badge",
      "Status Health",
      "Lead Contact",
      "Slack Channel",
      "Assigned Specialists",
      "Reels Quota (Current / Target)",
      "Stories Quota (Current / Target)",
      "Posts Quota (Current / Target)",
      "Next Scheduled Handoff",
    ];

    const rows = clients.map((c) => [
      `"${c.id}"`,
      `"${c.name}"`,
      `"${c.tierBadge}"`,
      `"${c.statusBadge.replace("●", "").trim()}"`,
      `"${c.contact}"`,
      `"${c.slackChannel}"`,
      `"${c.assignees.map((a) => a.name + " (" + a.role + ")").join("; ")}"`,
      `"${c.deliverables[0]?.current} / ${c.deliverables[0]?.target} (${c.deliverables[0]?.percent}%)"`,
      `"${c.deliverables[1]?.current} / ${c.deliverables[1]?.target} (${c.deliverables[1]?.percent}%)"`,
      `"${c.deliverables[2]?.current} / ${c.deliverables[2]?.target} (${c.deliverables[2]?.percent}%)"`,
      `"${c.nextHandoff}"`,
    ]);

    const csvContent = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute(
      "download",
      `${podName.replace(/\s+/g, "_")}_Client_Allocations_Report_${new Date().toISOString().slice(0, 10)}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    showToast(`Downloaded ${podName} Client Allocations CSV report`, "success");
  };

  const handleOpenReview = (client: ClientAccount) => {
    setReviewModal({
      isOpen: true,
      client,
      checkmarks: { brand: true, typography: true, render: true },
    });
  };

  const handleApproveSignoff = () => {
    if (!reviewModal) return;
    const client = reviewModal.client;

    setClients((prev) =>
      prev.map((c) => {
        if (c.id !== client.id) return c;
        return {
          ...c,
          isUrgent: false,
          isHighPriority: false,
          hasReviewToday: false,
          reviewAssetsCount: 0,
          statusBadge: "● QA Signed Off & Ready",
          statusBadgeColor: "bg-blue-500/15 text-app-accent-soft border-blue-500/30 font-bold",
          deliverables: c.deliverables.map((d) =>
            d.percent < 100
              ? { ...d, current: d.target, percent: 100, color: "bg-blue-500 text-app-on-accent!", note: undefined }
              : d
          ),
          nextHandoff: "Scheduled for client publication",
        };
      })
    );

    setReviewModal(null);

    setAlertModal({
      isOpen: true,
      title: "QA Sign-off Complete!",
      message: `All deliverables for ${client.name} have been QA verified and signed off for client handoff. Quota marked at 100%.`,
      type: "success",
      clientId: client.id,
    });
  };

  const filteredClients = clients.filter((c) => {
    if (filterTab === "review" && !c.hasReviewToday && c.reviewAssetsCount === 0) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return (
        c.name.toLowerCase().includes(q) ||
        c.contact.toLowerCase().includes(q) ||
        c.slackChannel.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const totalSignoffs = clients.reduce((acc, c) => acc + c.reviewAssetsCount, 0);
  const urgentCount = clients.filter((c) => c.isUrgent).length;
  const totalBurnedAssets = clients
    .flatMap((c) => c.deliverables)
    .reduce((acc, d) => acc + d.current, 0);

  return (
    <div data-surface="ops" className="min-h-screen bg-app-base text-hi font-sans flex flex-col">
      {/* Top Header */}
      <AdminTopHeader title="Client Details" activeTab="Client Details" />

      {/* Main Container */}
      <main className="flex-1 max-w-[1440px] w-full mx-auto px-3 sm:px-5 lg:px-6 py-3.5 pb-20 sm:pb-6 space-y-3.5 sm:space-y-4">
        {/* Toast Alert */}
        {toastMessage && (
          <div
            className={`p-3 rounded-xl border text-xs font-bold flex items-center justify-between shadow-lg animate-fade-in ${
              toastMessage.type === "error"
                ? "bg-blue-500/15 border-blue-500/30 text-app-accent-soft"
                : "bg-blue-500/15 border-blue-500/30 text-app-accent-soft"
            }`}
          >
            <span>{toastMessage.text}</span>
            <button
              onClick={() => setToastMessage(null)}
              className="text-current opacity-70 hover:opacity-100 cursor-pointer"
            >
              &times;
            </button>
          </div>
        )}

        {/* 1. Quick Actions Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 bg-app-surface p-2.5 sm:px-4 sm:py-2.5 rounded-2xl border border-app-line/80 shadow-2xs">
          <div className="flex items-center gap-2">
            <span className="size-2 rounded-full bg-blue-400 animate-pulse text-app-on-accent!" />
            <span className="text-xs font-bold text-app-ink-2">
              {podName} Creative Lead Workspace · {clients.length} Active Client Retainers
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={handleExportReport}
              className="px-3 py-1.5 rounded-xl bg-app-surface border border-app-line hover:bg-app-base text-app-ink-2 text-xs font-bold flex items-center gap-1.5 shadow-2xs transition-colors cursor-pointer"
            >
              <FileText className="size-3.5 text-app-mist" />
              Export Report
            </button>
            <button
              onClick={() => setReallocationModal(true)}
              className="px-3.5 py-1.5 rounded-xl bg-app-accent hover:bg-blue-700 text-app-on-accent! text-xs font-bold flex items-center gap-1.5 shadow-xs transition-all cursor-pointer"
            >
              <Plus className="size-3.5" />
              Re-allocation
            </button>
          </div>
        </div>

        {/* 2. Filter Pills & Search Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 bg-app-surface p-2.5 sm:px-3 rounded-2xl border border-app-line/80 shadow-2xs">
          <div className="flex flex-wrap items-center gap-1.5">
            <button
              onClick={() => setFilterTab("all")}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                filterTab === "all"
                  ? "bg-blue-600 text-app-on-accent! shadow-2xs"
                  : "bg-app-base text-app-ink-2 hover:bg-app-surface"
              }`}
            >
              All Clients ({clients.length})
            </button>
            <button
              onClick={() => setFilterTab("review")}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                filterTab === "review"
                  ? "bg-blue-600 text-app-on-accent! shadow-2xs"
                  : "bg-app-base text-app-ink-2 hover:bg-app-surface"
              }`}
            >
              <span className="size-1.5 rounded-full bg-app-accent text-app-on-accent!" />
              Pending QA ({clients.filter((c) => c.hasReviewToday || c.reviewAssetsCount > 0).length})
            </button>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <div className="relative w-full sm:w-auto">
              <Search className="size-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-app-mist" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search clients, brands, slack..."
                className="pl-7 pr-3 py-1.5 rounded-xl bg-app-base border border-app-line text-xs font-medium w-full sm:w-56 focus:bg-app-surface focus:outline-none focus:ring-1 focus:ring-blue-500 transition-all"
              />
            </div>
          </div>
        </div>

        {/* 3. Top 4 Metric KPI Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3">
          {/* Card 1: Assigned Clients */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.05 }}
            className="bg-app-surface rounded-xl sm:rounded-2xl p-2.5 sm:p-3 border border-app-line/80 shadow-2xs flex flex-col justify-between hover-card-innovative"
          >
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[9px] sm:text-[10px] font-bold uppercase tracking-wider text-app-mist">
                Assigned Clients
              </span>
              <div className="size-6 sm:size-7 rounded-lg bg-app-accent/15 text-app-accent flex items-center justify-center">
                <Briefcase className="size-3 sm:size-3.5" />
              </div>
            </div>
            <div>
              <div className="flex items-baseline gap-1 mb-1">
                <span className="text-lg sm:text-xl font-black text-hi">{clients.length} Active</span>
              </div>
              <div className="pt-1.5 border-t border-app-line text-[10px] sm:text-[11px] flex justify-between items-center">
                <span className="font-bold text-app-accent-soft flex items-center gap-1">
                  ● 100% On Schedule
                </span>
                <span className="text-[9px] font-bold text-app-mist">Tier 1 Pod</span>
              </div>
            </div>
          </motion.div>

          {/* Card 2: Monthly Asset Quota */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.1 }}
            className="bg-app-surface rounded-xl sm:rounded-2xl p-2.5 sm:p-3 border border-app-line/80 shadow-2xs flex flex-col justify-between hover-card-innovative"
          >
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[9px] sm:text-[10px] font-bold uppercase tracking-wider text-app-mist">
                Monthly Asset Quota
              </span>
              <div className="size-6 sm:size-7 rounded-lg bg-app-accent/15 text-app-accent flex items-center justify-center">
                <Layers className="size-3 sm:size-3.5" />
              </div>
            </div>
            <div>
              <div className="flex items-baseline justify-between gap-1 mb-1">
                <div className="flex items-baseline gap-1">
                  <span className="text-lg sm:text-xl font-black text-hi">{totalBurnedAssets}</span>
                  <span className="text-app-mist font-bold text-xs">/ 40</span>
                </div>
                <span className="px-1.5 py-0.2 rounded-full text-[8.5px] sm:text-[9px] font-bold bg-app-accent/15 text-app-accent">
                  {Math.round((totalBurnedAssets / 40) * 100)}% Burn
                </span>
              </div>
              <div className="pt-1.5 border-t border-app-line text-[10px] sm:text-[11px] flex justify-between items-center">
                <span className="text-app-mist font-medium">Sprint burn</span>
                <span className="font-bold text-app-accent-soft">On Pace</span>
              </div>
            </div>
          </motion.div>

          {/* Card 3: Lead Sign-offs */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.15 }}
            className="bg-app-surface rounded-xl sm:rounded-2xl p-2.5 sm:p-3 border border-app-line/80 shadow-2xs flex flex-col justify-between hover-card-innovative"
          >
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[9px] sm:text-[10px] font-bold uppercase tracking-wider text-app-mist">
                Lead Sign-offs
              </span>
              <div
                className={`size-6 sm:size-7 rounded-lg flex items-center justify-center ${
                  totalSignoffs > 0 ? "bg-blue-500/15 text-app-accent-soft" : "bg-blue-500/15 text-app-accent-soft"
                }`}
              >
                <FileCheck2 className="size-3 sm:size-3.5" />
              </div>
            </div>
            <div>
              <div className="flex items-baseline justify-between gap-1 mb-1">
                <span className="text-lg sm:text-xl font-black text-hi">{totalSignoffs} Assets</span>
                {urgentCount > 0 ? (
                  <span className="px-1.5 py-0.2 rounded-full text-[8.5px] sm:text-[9px] font-bold bg-blue-500/15 text-app-accent-soft">
                    {urgentCount} Urgent Review{urgentCount > 1 ? "s" : ""}
                  </span>
                ) : (
                  <span className="px-1.5 py-0.2 rounded-full text-[8.5px] sm:text-[9px] font-bold bg-blue-500/15 text-app-accent-soft">
                    All QA Cleared
                  </span>
                )}
              </div>
              <div className="pt-1.5 border-t border-app-line text-[10px] sm:text-[11px]">
                {urgentCount > 0 ? (
                  <span className="text-app-accent-soft font-bold flex items-center gap-1">
                    ● Urgent QA awaiting
                  </span>
                ) : (
                  <span className="text-app-accent-soft font-bold flex items-center gap-1">
                    ● All signed off
                  </span>
                )}
              </div>
            </div>
          </motion.div>

          {/* Card 4: Client CSAT */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.2 }}
            className="bg-app-surface rounded-xl sm:rounded-2xl p-2.5 sm:p-3 border border-app-line/80 shadow-2xs flex flex-col justify-between hover-card-innovative"
          >
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[9px] sm:text-[10px] font-bold uppercase tracking-wider text-app-mist">
                Client CSAT
              </span>
              <div className="size-6 sm:size-7 rounded-lg bg-blue-500/15 text-app-accent-soft flex items-center justify-center">
                <Star className="size-3 sm:size-3.5" />
              </div>
            </div>
            <div>
              <div className="flex items-baseline justify-between gap-1 mb-1">
                <span className="text-lg sm:text-xl font-black text-hi">
                  4.9 <span className="text-app-mist font-bold text-xs">/ 5.0</span>
                </span>
                <span className="px-1.5 py-0.2 rounded-full text-[8.5px] sm:text-[9px] font-bold bg-blue-500/15 text-app-accent-soft">
                  +0.2 MoM
                </span>
              </div>
              <div className="pt-1.5 border-t border-app-line text-[10px] sm:text-[11px] flex justify-between items-center">
                <span className="text-app-mist font-medium">Last 24 ratings</span>
                <span className="font-bold text-app-accent-soft">Exceptional</span>
              </div>
            </div>
          </motion.div>
        </div>

        {/* 4. Active Accounts Full-Width Container (Extended Client Roster) */}
        <div className="w-full space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h2 className="text-sm font-black text-hi">{podName} Active Accounts</h2>
              <p className="text-[11px] text-app-mist font-medium">
                Contractual scopes, sprint burndown, and talent assignments
              </p>
            </div>
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-app-accent/15 text-app-accent border border-app-accent/30 self-start sm:self-auto">
              Sprint 42 · Active
            </span>
          </div>

          {/* Account Cards */}
          <div className="space-y-3">
            {filteredClients.length === 0 ? (
              <div className="bg-app-surface rounded-2xl p-10 border border-app-line/80 text-center space-y-2">
                <Briefcase className="size-8 text-app-mist mx-auto opacity-50" />
                <h3 className="text-sm font-bold text-hi">No Assigned Clients</h3>
                <p className="text-xs text-app-mist">No active clients are currently allocated to this pod filter.</p>
              </div>
            ) : (
              filteredClients.map((client) => (
              <div
                key={client.id}
                onClick={() => navigate(`/lead/clients/${client.id}`)}
                className="bg-app-surface rounded-2xl p-3.5 sm:p-5 border border-app-line/80 shadow-2xs hover:border-app-accent/50 hover:shadow-md transition-all space-y-3 cursor-pointer group"
              >
                {/* Account Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-2.5 sm:pb-3 border-b border-app-line gap-2.5">
                  <div className="flex items-center gap-3">
                    <div
                      className={`size-10 rounded-xl ${client.avatarBg} text-hi font-black text-xs flex items-center justify-center shadow-2xs group-hover:scale-105 transition-transform shrink-0`}
                    >
                      {client.avatar}
                    </div>
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <h3 className="text-sm font-black text-hi group-hover:text-app-accent transition-colors flex items-center gap-1 truncate">
                          {client.name}
                          <ArrowRight className="size-3 opacity-0 -translate-x-1 group-hover:opacity-100 group-hover:translate-x-0 transition-all text-app-accent" />
                        </h3>
                        <span className={`px-1.5 py-0.2 rounded-full text-[9px] font-black tracking-wider border ${client.tierBadgeColor}`}>
                          {client.tierBadge}
                        </span>
                        <span className={`px-1.5 py-0.2 rounded-full text-[9px] font-bold border ${client.statusBadgeColor}`}>
                          {client.statusBadge}
                        </span>
                      </div>
                      <p className="text-[11px] text-app-mist font-medium mt-0.5 truncate">
                        {client.contact} · <span className="text-app-accent font-bold">{client.slackChannel}</span>
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 self-start sm:self-auto shrink-0" onClick={(e) => e.stopPropagation()}>
                    {/* Action Button: Sign-off QA Now / Review Assets or QA Cleared */}
                    {client.reviewAssetsCount > 0 ? (
                      <button
                        type="button"
                        onClick={() => handleOpenReview(client)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-xs active:scale-95 transition-all cursor-pointer ${
                          client.isUrgent
                            ? "bg-blue-600 hover:bg-blue-700 text-app-on-accent! shadow-blue-500/20 animate-pulse"
                            : "bg-app-accent hover:bg-blue-700 text-app-on-accent! shadow-blue-500/20"
                        }`}
                      >
                        {client.isUrgent ? (
                          <>
                            <AlertTriangle className="size-3" />
                            Sign-off QA Now
                          </>
                        ) : (
                          <>
                            <CheckCircle2 className="size-3" />
                            Review {client.reviewAssetsCount} Assets
                          </>
                        )}
                      </button>
                    ) : (
                      <span className="px-2.5 py-1 rounded-xl text-xs font-bold flex items-center gap-1 bg-blue-500/10 text-app-accent-soft border border-blue-500/20">
                        <ShieldCheck className="size-3 text-app-accent" />
                        QA Cleared
                      </span>
                    )}

                    <Link
                      to={`/lead/clients/${client.id}`}
                      className="px-3 py-1.5 rounded-xl bg-app-base hover:bg-app-accent/20 border border-app-line text-app-ink-2 hover:text-app-accent text-xs font-bold flex items-center gap-1.5 transition-all shadow-2xs active:scale-95 cursor-pointer"
                    >
                      <Sparkles className="size-3 text-app-accent" />
                      <span>Workspace →</span>
                    </Link>
                  </div>
                </div>

                {/* Deliverables Burndown Bars - Compact 3-Column on all screens */}
                <div className="grid grid-cols-3 gap-1.5 sm:gap-2.5">
                  {client.deliverables.map((del) => (
                    <div key={del.label} className="bg-app-base p-2 sm:p-2.5 rounded-xl border border-app-line space-y-1">
                      <div className="flex justify-between items-center text-[10px] sm:text-[11px] font-bold">
                        <span className="text-app-ink-2 truncate">{del.label}</span>
                        <span className="text-app-mist text-[9.5px] sm:text-[11px] shrink-0">
                          {del.current}/{del.target}
                        </span>
                      </div>
                      <div className="h-1.5 w-full bg-app-surface rounded-full overflow-hidden">
                        <div
                          className={`h-full ${del.color} rounded-full transition-all duration-500`}
                          style={{ width: `${del.percent}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>

                {/* Assignees & Next Handoff Footer */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between pt-2.5 sm:pt-3 border-t border-app-line/60 text-xs text-app-ink-2 gap-2">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-[10px] sm:text-xs font-bold text-app-mist">Talent:</span>
                    <div className="flex items-center gap-1 flex-wrap">
                      {client.assignees.map((assignee) => (
                        <div
                          key={assignee.name}
                          className="flex items-center gap-1 bg-app-base px-1.5 sm:px-2 py-0.5 rounded-lg border border-app-line text-[10px] font-bold"
                        >
                          <div
                            className={`size-3.5 sm:size-4 rounded-md ${assignee.bg} text-hi flex items-center justify-center text-[7.5px] sm:text-[8px] font-black`}
                          >
                            {assignee.avatar}
                          </div>
                          <span className="truncate max-w-[80px] sm:max-w-none">
                            {assignee.name}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="flex items-center justify-between sm:justify-end gap-3 text-[10px] sm:text-[11px]">
                    <span className="font-bold text-app-ink-2 flex items-center gap-1">
                      <Clock className="size-3 text-app-mist" />
                      <span className="text-app-mist">Handoff:</span>
                      <span className="text-app-accent truncate">{client.nextHandoff}</span>
                    </span>
                    <span className="font-bold text-app-accent group-hover:translate-x-0.5 transition-transform flex items-center gap-0.5">
                      Open Space →
                    </span>
                  </div>
                </div>
              </div>
            )))}
          </div>
        </div>
      </main>

      {/* ─────────────────────────────────────────────────────────────────────────────
          1. QA SIGN-OFF / DELIVERABLE REVIEW MODAL (Centered with Blurred Backdrop)
      ───────────────────────────────────────────────────────────────────────────── */}
      {reviewModal?.isOpen && (
        <div
          className="fixed inset-0 w-screen h-screen z-[99999] flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-md animate-fade-in"
          onClick={() => setReviewModal(null)}
        >
          <div
            className="relative w-full max-w-xl bg-app-surface rounded-3xl p-6 sm:p-8 shadow-2xl border border-app-line space-y-5 animate-in zoom-in-95 duration-150 text-left"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
          >
            {/* Top Header */}
            <div className="flex items-center justify-between border-b border-app-line pb-4">
              <div className="flex items-center gap-3">
                <div
                  className={`size-11 rounded-2xl ${reviewModal.client.avatarBg} text-hi font-black text-sm flex items-center justify-center shadow-xs`}
                >
                  {reviewModal.client.avatar}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-black text-hi">
                      {reviewModal.client.name}
                    </h3>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-black tracking-wider border ${reviewModal.client.tierBadgeColor}`}>
                      {reviewModal.client.tierBadge}
                    </span>
                  </div>
                  <p className="text-xs text-app-mist font-medium mt-0.5">
                    Creative Lead QA Sign-off Inspection
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setReviewModal(null)}
                className="size-8 rounded-full bg-app-base hover:bg-app-line border border-app-line text-app-mist hover:text-app-ink-2 flex items-center justify-center transition-colors cursor-pointer"
                aria-label="Close review dialog"
              >
                <X className="size-4" />
              </button>
            </div>

            {/* Asset Pending Review Card */}
            <div className="bg-app-base p-4 rounded-2xl border border-app-line/80 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold uppercase tracking-wider text-app-mist">
                  Deliverable Awaiting Lead Approval
                </span>
                {reviewModal.client.isUrgent ? (
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-blue-500/15 text-app-accent-soft border border-blue-500/30 animate-pulse">
                    ⚡ Priority QA: Pending Lead Sign-off
                  </span>
                ) : (
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-app-accent/15 text-app-accent border border-app-accent/30">
                    {reviewModal.client.reviewAssetsCount} Assets Queued
                  </span>
                )}
              </div>
              <h4 className="text-sm font-black text-hi">
                {reviewModal.client.deliverableTitle || "Primary Campaign Asset Package (Batch 4)"}
              </h4>
              <div className="flex flex-wrap items-center gap-2 text-xs font-semibold text-app-ink-2 pt-1">
                <span className="bg-app-surface px-2.5 py-1 rounded-lg border border-app-line text-[11px]">
                  Format: 9:16 Vertical Story • 1080x1920 • 60fps
                </span>
                <span className="bg-app-surface px-2.5 py-1 rounded-lg border border-app-line text-[11px]">
                  Assigned: {reviewModal.client.assignees.map((a) => a.name).join(", ")}
                </span>
              </div>
            </div>

            {/* QA Verification Checklist */}
            <div className="space-y-2.5">
              <span className="text-[11px] font-bold uppercase tracking-wider text-app-mist block">
                Lead Sign-off Verification Checklist:
              </span>
              <div className="space-y-2 text-xs font-semibold text-app-ink-2">
                {[
                  {
                    id: "brand",
                    label: "Brand DNA & Color Palette compliance verified against Brand Brief",
                  },
                  {
                    id: "typography",
                    label: "Typography, safe margins (9:16 / 4:5), and caption readability verified",
                  },
                  {
                    id: "render",
                    label: "4K Master export render passed audio/video sync & checksum verification",
                  },
                ].map((item) => (
                  <label
                    key={item.id}
                    className="flex items-center gap-3 p-2.5 rounded-xl border border-app-line bg-app-surface hover:bg-app-base cursor-pointer transition-colors"
                  >
                    <input
                      type="checkbox"
                      defaultChecked
                      className="size-4 rounded text-app-accent focus:ring-blue-500 border-app-line"
                    />
                    <span>{item.label}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row items-center justify-end gap-3 pt-3 border-t border-app-line">
              <button
                type="button"
                onClick={() => setReviewModal(null)}
                className="w-full sm:w-auto px-4 py-2.5 rounded-xl border border-app-line text-app-ink-2 text-xs font-bold hover:bg-app-surface active:scale-95 transition-all cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  setReviewModal(null);
                  navigate("/lead/deliverables");
                }}
                className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-app-base hover:bg-app-line border border-app-line text-app-ink-2 text-xs font-bold active:scale-95 transition-all cursor-pointer"
              >
                Open Review Studio →
              </button>
              <button
                type="button"
                onClick={handleApproveSignoff}
                className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-app-on-accent! text-xs font-bold flex items-center justify-center gap-2 shadow-md shadow-blue-600/25 active:scale-95 transition-all cursor-pointer"
              >
                <Check className="size-4" />
                Approve & Sign-Off QA
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────────────────────
          2. CENTERED SUCCESS ALERT MODAL (Full Blurred Backdrop)
      ───────────────────────────────────────────────────────────────────────────── */}
      {alertModal?.isOpen && (
        <div
          className="fixed inset-0 w-screen h-screen z-[99999] flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-md animate-fade-in"
          onClick={() => setAlertModal(null)}
        >
          <div
            className="relative w-full max-w-md rounded-3xl bg-app-surface p-6 sm:p-8 shadow-2xl border border-app-line flex flex-col items-center text-center animate-in zoom-in-95 duration-150 text-left"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
          >
            {/* Top Close Button */}
            <button
              type="button"
              onClick={() => setAlertModal(null)}
              className="absolute top-4 right-4 size-8 rounded-full bg-app-base hover:bg-app-line border border-app-line text-app-mist hover:text-app-ink-2 flex items-center justify-center transition-colors cursor-pointer"
              aria-label="Close modal"
            >
              <X className="size-4" />
            </button>

            {/* Tone Icon Badge */}
            <div className="size-16 rounded-3xl flex items-center justify-center mb-4 ring-8 shadow-inner bg-blue-500/20 text-app-accent-soft ring-blue-500/30">
              <CheckCircle2 className="size-8" />
            </div>

            {/* Title */}
            <h3 className="text-xl font-black text-hi tracking-tight">
              {alertModal.title}
            </h3>

            {/* Message */}
            <p className="text-xs sm:text-sm text-app-ink-2 mt-2 leading-relaxed max-w-sm text-center">
              {alertModal.message}
            </p>

            {/* Action Buttons */}
            <div className="w-full mt-6 flex items-center gap-3">
              <button
                type="button"
                onClick={() => setAlertModal(null)}
                autoFocus
                className="flex-1 py-3 rounded-2xl bg-blue-600 hover:bg-blue-700 text-app-on-accent! font-bold text-xs shadow-md shadow-blue-600/25 active:scale-95 transition-all cursor-pointer"
              >
                Done
              </button>
              {alertModal.clientId && (
                <button
                  type="button"
                  onClick={() => {
                    const id = alertModal.clientId;
                    setAlertModal(null);
                    navigate(`/lead/clients/${id}`);
                  }}
                  className="px-5 py-3 rounded-2xl bg-app-base hover:bg-app-line border border-app-line text-app-ink-2 font-bold text-xs active:scale-95 transition-all cursor-pointer"
                >
                  View Client Profile
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────────────────────
          3. POD REALLOCATION REQUEST MODAL (Full Blurred Backdrop)
      ───────────────────────────────────────────────────────────────────────────── */}
      {reallocationModal && (
        <div
          className="fixed inset-0 w-screen h-screen z-[99999] bg-slate-950/75 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto animate-fade-in"
          onClick={() => setReallocationModal(false)}
        >
          <div
            className="w-full max-w-lg bg-app-surface rounded-3xl p-6 sm:p-7 shadow-2xl border border-app-line space-y-4 animate-in zoom-in-95 duration-150 text-left"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
          >
            <div className="flex items-center justify-between border-b border-app-line pb-3">
              <h3 className="text-base font-black text-hi">Request Pod Re-allocation</h3>
              <button
                type="button"
                onClick={() => setReallocationModal(false)}
                className="size-8 rounded-full bg-app-base hover:bg-app-line border border-app-line text-app-mist hover:text-app-ink-2 flex items-center justify-center transition-colors cursor-pointer"
              >
                <X className="size-4" />
              </button>
            </div>
            <p className="text-xs text-app-mist">
              Submit workload balancing request to Studio Director:
            </p>
            <div className="space-y-3 text-xs">
              <div>
                <label className="font-bold text-app-ink-2 block mb-1">Target Account</label>
                <NativeSelect className="w-full p-2.5 rounded-xl border border-app-line bg-app-base font-medium text-hi">
                  {clients.length > 0 ? (
                    clients.map((c) => (
                      <option key={c.id} value={c.name}>{c.name}</option>
                    ))
                  ) : (
                    <option value="" disabled>No active accounts</option>
                  )}
                </NativeSelect>
              </div>
              <div>
                <label className="font-bold text-app-ink-2 block mb-1">Resource Needed</label>
                <NativeSelect className="w-full p-2.5 rounded-xl border border-app-line bg-app-base font-medium">
                  <option>Additional 3D Motion Specialist Support</option>
                  <option>Copywriting surge capacity</option>
                  <option>Senior Visual Designer QA backup</option>
                </NativeSelect>
              </div>
            </div>
            <div className="flex justify-end gap-3 pt-3 border-t border-app-line">
              <button
                type="button"
                onClick={() => setReallocationModal(false)}
                className="px-4 py-2 rounded-xl bg-app-base border border-app-line text-app-ink-2 text-xs font-bold hover:bg-app-line transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  showToast("Re-allocation request dispatched to Studio Director", "success");
                  setReallocationModal(false);
                }}
                className="px-5 py-2 rounded-xl bg-blue-600 text-app-on-accent! text-xs font-bold hover:bg-blue-700 transition cursor-pointer"
              >
                Submit Request
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

