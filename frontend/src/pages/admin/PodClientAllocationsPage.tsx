import { useState } from "react";
import { Link, useNavigate } from "react-router";
import { AdminTopHeader } from "../../components/admin/AdminTopHeader";
import { useQuery } from "@tanstack/react-query";
import { fetchPodDashboard, type PodDashboardData } from "../../lib/ops-api";
import {
  Briefcase,
  Layers,
  FileCheck2,
  Star,
  Search,
  LayoutGrid,
  List,
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

const INITIAL_CLIENTS: ClientAccount[] = [
  {
    id: "client-northwind",
    name: "Northwind Labs",
    avatar: "NL",
    avatarBg: "bg-[#0F172A]",
    tierBadge: "PREMIUM",
    tierBadgeColor: "bg-purple-50 text-purple-700 border-purple-200",
    statusBadge: "● Stable",
    statusBadgeColor: "bg-emerald-50 text-emerald-700 border-emerald-200",
    contact: "Sarah L. (VP Marketing)",
    slackChannel: "#northwind-creo-pod-a",
    reviewAssetsCount: 2,
    deliverableTitle: "Fintech Reel Set (1080x1920 60fps) & Product Carousel",
    deliverables: [
      { label: "Reels", current: 4, target: 4, percent: 100, color: "bg-emerald-500" },
      { label: "Stories", current: 8, target: 8, percent: 100, color: "bg-emerald-500" },
      { label: "Posts", current: 12, target: 12, percent: 100, color: "bg-emerald-500" },
    ],
    assignees: [
      { name: "David Kim", role: "Motion", avatar: "DK", bg: "bg-[#0F172A]" },
      { name: "Elena R.", role: "Brand", avatar: "ER", bg: "bg-blue-600" },
    ],
    nextHandoff: "Fintech Reel Set due in 2h",
    isHighPriority: false,
    hasReviewToday: true,
  },
  {
    id: "client-atlas",
    name: "Atlas Commerce",
    avatar: "AC",
    avatarBg: "bg-[#1E293B]",
    tierBadge: "ENTERPRISE",
    tierBadgeColor: "bg-[#7FA0D6]/15 text-[#7FA0D6] border-[#7FA0D6]/30",
    statusBadge: "Urgent SLA (1h 14m)",
    statusBadgeColor: "bg-rose-50 text-rose-700 border-rose-200 font-black",
    contact: "Marcus Groot (Director of Brand)",
    slackChannel: "#atlas-commerce-urgent",
    reviewAssetsCount: 3,
    isUrgent: true,
    deliverableTitle: "Black Friday Story Revision awaiting sign-off",
    deliverables: [
      { label: "Reels", current: 6, target: 6, percent: 100, color: "bg-emerald-500" },
      { label: "Stories", current: 1, target: 3, percent: 33, color: "bg-rose-500", note: "33% Attention" },
      { label: "Posts", current: 18, target: 18, percent: 100, color: "bg-emerald-500" },
    ],
    assignees: [
      { name: "Elena R.", role: "Brand", avatar: "ER", bg: "bg-blue-600" },
      { name: "David Kim", role: "Motion", avatar: "DK", bg: "bg-[#0F172A]" },
    ],
    nextHandoff: "Black Friday Story Revision awaiting sign-off",
    isHighPriority: true,
    hasReviewToday: true,
  },
  {
    id: "client-bloom",
    name: "Bloom Studio",
    avatar: "BS",
    avatarBg: "bg-indigo-900",
    tierBadge: "GROWTH",
    tierBadgeColor: "bg-indigo-50 text-indigo-700 border-indigo-200",
    statusBadge: "● Optimal Flow",
    statusBadgeColor: "bg-emerald-50 text-emerald-700 border-emerald-200",
    contact: "Helena Vance",
    slackChannel: "#bloom-studio-sync",
    reviewAssetsCount: 1,
    deliverableTitle: "Q4 Reel Concept & Brand Manifesto",
    deliverables: [
      { label: "Reels", current: 2, target: 2, percent: 100, color: "bg-emerald-500" },
      { label: "Stories", current: 4, target: 4, percent: 100, color: "bg-emerald-500" },
      { label: "Posts", current: 8, target: 12, percent: 66, color: "bg-blue-600" },
    ],
    assignees: [
      { name: "Chloe Tan", role: "Video", avatar: "CT", bg: "bg-teal-600" },
      { name: "Marcus Vance", role: "Copy", avatar: "MV", bg: "bg-indigo-600" },
    ],
    nextHandoff: "Q4 Reel Concept in 4h 30m",
    isHighPriority: false,
    hasReviewToday: false,
  },
];

export function PodClientAllocationsPage() {
  const navigate = useNavigate();
  const [clients, setClients] = useState<ClientAccount[]>(INITIAL_CLIENTS);
  const [filterTab, setFilterTab] = useState<"all" | "sla" | "review">("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
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
    queryKey: ["pod_dashboard"],
    queryFn: () => fetchPodDashboard(),
  });

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
          statusBadgeColor: "bg-emerald-50 text-emerald-700 border-emerald-200 font-bold",
          deliverables: c.deliverables.map((d) =>
            d.percent < 100
              ? { ...d, current: d.target, percent: 100, color: "bg-emerald-500", note: undefined }
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
    if (filterTab === "sla" && !c.isHighPriority) return false;
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
    <div data-surface="ops" className="min-h-screen bg-[#0B111C] text-white font-sans flex flex-col">
      {/* Top Header */}
      <AdminTopHeader title="Client Details" activeTab="Client Details" />

      {/* Main Container */}
      <main className="flex-1 max-w-[1440px] w-full mx-auto px-3 sm:px-5 lg:px-6 py-3.5 pb-20 sm:pb-6 space-y-3.5 sm:space-y-4">
        {/* Toast Alert */}
        {toastMessage && (
          <div
            className={`p-3 rounded-xl border text-xs font-bold flex items-center justify-between shadow-lg animate-fade-in ${
              toastMessage.type === "error"
                ? "bg-rose-50 border-rose-200 text-rose-700"
                : "bg-emerald-50 border-emerald-200 text-emerald-700"
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
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 bg-[#161F2D] p-2.5 sm:px-4 sm:py-2.5 rounded-2xl border border-[#2A3446]/80 shadow-2xs">
          <div className="flex items-center gap-2">
            <span className="size-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-xs font-bold text-[#F1F5F9]">
              {podName} Creative Lead Workspace · {clients.length} Active Client Retainers
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={handleExportReport}
              className="px-3 py-1.5 rounded-xl bg-[#161F2D] border border-[#2A3446] hover:bg-[#0B111C] text-[#F1F5F9] text-xs font-bold flex items-center gap-1.5 shadow-2xs transition-colors cursor-pointer"
            >
              <FileText className="size-3.5 text-[#97A0B3]" />
              Export Report
            </button>
            <button
              onClick={() => setReallocationModal(true)}
              className="px-3.5 py-1.5 rounded-xl bg-[#2563EB] hover:bg-blue-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-xs transition-all cursor-pointer"
            >
              <Plus className="size-3.5" />
              Re-allocation
            </button>
          </div>
        </div>

        {/* 2. Filter Pills & Search Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 bg-[#161F2D] p-2.5 sm:px-3 rounded-2xl border border-[#2A3446]/80 shadow-2xs">
          <div className="flex flex-wrap items-center gap-1.5">
            <button
              onClick={() => setFilterTab("all")}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                filterTab === "all"
                  ? "bg-blue-600 text-white shadow-2xs"
                  : "bg-[#0B111C] text-[#F1F5F9] hover:bg-[#1F2C3F]"
              }`}
            >
              All Assigned ({clients.length})
            </button>
            <button
              onClick={() => setFilterTab("sla")}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                filterTab === "sla"
                  ? "bg-rose-600 text-white shadow-2xs"
                  : "bg-[#0B111C] text-[#F1F5F9] hover:bg-[#1F2C3F]"
              }`}
            >
              <span className="size-1.5 rounded-full bg-rose-500" />
              High SLA ({clients.filter((c) => c.isHighPriority).length})
            </button>
            <button
              onClick={() => setFilterTab("review")}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                filterTab === "review"
                  ? "bg-blue-600 text-white shadow-2xs"
                  : "bg-[#0B111C] text-[#F1F5F9] hover:bg-[#1F2C3F]"
              }`}
            >
              <span className="size-1.5 rounded-full bg-[#7FA0D6]/150" />
              Review Today ({clients.filter((c) => c.hasReviewToday || c.reviewAssetsCount > 0).length})
            </button>
          </div>

          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="size-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-[#97A0B3]" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Filter clients..."
                className="pl-7 pr-3 py-1 rounded-xl bg-[#0B111C] border border-[#2A3446] text-xs font-medium w-44 sm:w-52 focus:w-60 focus:bg-[#161F2D] focus:outline-none focus:ring-1 focus:ring-blue-500 transition-all"
              />
            </div>

            <div className="flex items-center bg-[#1F2C3F] p-0.5 rounded-xl">
              <button
                onClick={() => setViewMode("grid")}
                className={`p-1 rounded-lg transition cursor-pointer ${
                  viewMode === "grid" ? "bg-[#161F2D] text-[#7FA0D6] shadow-2xs" : "text-[#97A0B3]"
                }`}
                aria-label="Grid view"
              >
                <LayoutGrid className="size-3.5" />
              </button>
              <button
                onClick={() => setViewMode("list")}
                className={`p-1 rounded-lg transition cursor-pointer ${
                  viewMode === "list" ? "bg-[#161F2D] text-[#7FA0D6] shadow-2xs" : "text-[#97A0B3]"
                }`}
                aria-label="List view"
              >
                <List className="size-3.5" />
              </button>
            </div>
          </div>
        </div>

        {/* 3. Top 4 Metric KPI Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3">
          {/* Card 1: Assigned Clients */}
          <div className="bg-[#161F2D] rounded-xl sm:rounded-2xl p-2.5 sm:p-3 border border-[#2A3446]/80 shadow-2xs flex flex-col justify-between">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[9px] sm:text-[10px] font-bold uppercase tracking-wider text-[#97A0B3]">
                Assigned Clients
              </span>
              <div className="size-6 sm:size-7 rounded-lg bg-[#7FA0D6]/15 text-[#7FA0D6] flex items-center justify-center">
                <Briefcase className="size-3 sm:size-3.5" />
              </div>
            </div>
            <div>
              <div className="flex items-baseline gap-1 mb-1">
                <span className="text-lg sm:text-xl font-black text-white">{clients.length} Active</span>
              </div>
              <div className="pt-1.5 border-t border-[#2A3446] text-[10px] sm:text-[11px] flex justify-between items-center">
                <span className="font-bold text-emerald-600 flex items-center gap-1">
                  ● 100% SLA compliance
                </span>
                <span className="text-[9px] font-bold text-[#97A0B3]">Tier 1 Pod</span>
              </div>
            </div>
          </div>

          {/* Card 2: Monthly Asset Quota */}
          <div className="bg-[#161F2D] rounded-xl sm:rounded-2xl p-2.5 sm:p-3 border border-[#2A3446]/80 shadow-2xs flex flex-col justify-between">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[9px] sm:text-[10px] font-bold uppercase tracking-wider text-[#97A0B3]">
                Monthly Asset Quota
              </span>
              <div className="size-6 sm:size-7 rounded-lg bg-[#7FA0D6]/15 text-[#7FA0D6] flex items-center justify-center">
                <Layers className="size-3 sm:size-3.5" />
              </div>
            </div>
            <div>
              <div className="flex items-baseline justify-between gap-1 mb-1">
                <div className="flex items-baseline gap-1">
                  <span className="text-lg sm:text-xl font-black text-white">{totalBurnedAssets}</span>
                  <span className="text-[#97A0B3] font-bold text-xs">/ 40</span>
                </div>
                <span className="px-1.5 py-0.2 rounded-full text-[8.5px] sm:text-[9px] font-bold bg-[#7FA0D6]/15 text-[#7FA0D6]">
                  {Math.round((totalBurnedAssets / 40) * 100)}% Burn
                </span>
              </div>
              <div className="pt-1.5 border-t border-[#2A3446] text-[10px] sm:text-[11px] flex justify-between items-center">
                <span className="text-[#97A0B3] font-medium">Sprint burn</span>
                <span className="font-bold text-emerald-600">On Pace</span>
              </div>
            </div>
          </div>

          {/* Card 3: Lead Sign-offs */}
          <div className="bg-[#161F2D] rounded-xl sm:rounded-2xl p-2.5 sm:p-3 border border-[#2A3446]/80 shadow-2xs flex flex-col justify-between">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[9px] sm:text-[10px] font-bold uppercase tracking-wider text-[#97A0B3]">
                Lead Sign-offs
              </span>
              <div
                className={`size-6 sm:size-7 rounded-lg flex items-center justify-center ${
                  totalSignoffs > 0 ? "bg-rose-50 text-rose-600" : "bg-emerald-50 text-emerald-600"
                }`}
              >
                <FileCheck2 className="size-3 sm:size-3.5" />
              </div>
            </div>
            <div>
              <div className="flex items-baseline justify-between gap-1 mb-1">
                <span className="text-lg sm:text-xl font-black text-white">{totalSignoffs} Assets</span>
                {urgentCount > 0 ? (
                  <span className="px-1.5 py-0.2 rounded-full text-[8.5px] sm:text-[9px] font-bold bg-rose-50 text-rose-700">
                    {urgentCount} SLA Alert{urgentCount > 1 ? "s" : ""}
                  </span>
                ) : (
                  <span className="px-1.5 py-0.2 rounded-full text-[8.5px] sm:text-[9px] font-bold bg-emerald-50 text-emerald-700">
                    All QA Cleared
                  </span>
                )}
              </div>
              <div className="pt-1.5 border-t border-[#2A3446] text-[10px] sm:text-[11px]">
                {urgentCount > 0 ? (
                  <span className="text-rose-600 font-bold flex items-center gap-1">
                    ● Urgent QA awaiting
                  </span>
                ) : (
                  <span className="text-emerald-600 font-bold flex items-center gap-1">
                    ● All signed off
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Card 4: Client CSAT */}
          <div className="bg-[#161F2D] rounded-xl sm:rounded-2xl p-2.5 sm:p-3 border border-[#2A3446]/80 shadow-2xs flex flex-col justify-between">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[9px] sm:text-[10px] font-bold uppercase tracking-wider text-[#97A0B3]">
                Client CSAT
              </span>
              <div className="size-6 sm:size-7 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
                <Star className="size-3 sm:size-3.5" />
              </div>
            </div>
            <div>
              <div className="flex items-baseline justify-between gap-1 mb-1">
                <span className="text-lg sm:text-xl font-black text-white">
                  4.9 <span className="text-[#97A0B3] font-bold text-xs">/ 5.0</span>
                </span>
                <span className="px-1.5 py-0.2 rounded-full text-[8.5px] sm:text-[9px] font-bold bg-emerald-50 text-emerald-700">
                  +0.2 MoM
                </span>
              </div>
              <div className="pt-1.5 border-t border-[#2A3446] text-[10px] sm:text-[11px] flex justify-between items-center">
                <span className="text-[#97A0B3] font-medium">Last 24 ratings</span>
                <span className="font-bold text-emerald-600">Exceptional</span>
              </div>
            </div>
          </div>
        </div>

        {/* 4. Active Accounts Full-Width Container (Extended Client Roster) */}
        <div className="w-full space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h2 className="text-sm font-black text-white">{podName} Active Accounts</h2>
              <p className="text-[11px] text-[#97A0B3] font-medium">
                Contractual scopes, sprint burndown, and talent assignments
              </p>
            </div>
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-[#7FA0D6]/15 text-[#7FA0D6] border border-[#7FA0D6]/30 self-start sm:self-auto">
              Sprint 42 · Active
            </span>
          </div>

          {/* Account Cards */}
          <div className="space-y-3">
            {filteredClients.map((client) => (
              <div
                key={client.id}
                className="bg-[#161F2D] rounded-2xl p-4 sm:p-5 border border-[#2A3446]/80 shadow-2xs hover:border-[#7FA0D6]/30 hover:shadow-xs transition-all space-y-3.5"
              >
                {/* Account Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-[#2A3446] gap-2.5">
                  <Link
                    to={`/lead/clients/${client.id}`}
                    className="flex items-center gap-3 group cursor-pointer"
                  >
                    <div
                      className={`size-10 rounded-xl ${client.avatarBg} text-white font-black text-xs flex items-center justify-center shadow-2xs group-hover:scale-105 transition-transform`}
                    >
                      {client.avatar}
                    </div>
                    <div>
                      <div className="flex flex-wrap items-center gap-1.5">
                        <h3 className="text-sm font-black text-white group-hover:text-[#7FA0D6] transition-colors flex items-center gap-1">
                          {client.name}
                          <ArrowRight className="size-3 opacity-0 -translate-x-1 group-hover:opacity-100 group-hover:translate-x-0 transition-all text-[#7FA0D6]" />
                        </h3>
                        <span className={`px-1.5 py-0.2 rounded-full text-[9px] font-black tracking-wider border ${client.tierBadgeColor}`}>
                          {client.tierBadge}
                        </span>
                        <span className={`px-1.5 py-0.2 rounded-full text-[9px] font-bold border ${client.statusBadgeColor}`}>
                          {client.statusBadge}
                        </span>
                      </div>
                      <p className="text-[11px] text-[#97A0B3] font-medium mt-0.5">
                        {client.contact} · <span className="text-[#7FA0D6] font-bold">{client.slackChannel}</span>
                      </p>
                    </div>
                  </Link>

                  <div className="flex items-center gap-2 self-start sm:self-auto">
                    {/* Button 1: Client Details */}
                    <Link
                      to={`/lead/clients/${client.id}`}
                      className="px-3 py-1.5 rounded-xl bg-[#0B111C] hover:bg-[#7FA0D6]/15/70 border border-[#2A3446] text-[#F1F5F9] hover:text-[#7FA0D6] text-xs font-bold flex items-center gap-1.5 transition-all shadow-2xs active:scale-95 cursor-pointer"
                    >
                      <Sparkles className="size-3 text-[#7FA0D6]" />
                      Client Details
                    </Link>

                    {/* Button 2: Sign-off QA Now / Review Assets */}
                    {client.reviewAssetsCount > 0 ? (
                      <button
                        type="button"
                        onClick={() => handleOpenReview(client)}
                        className={`px-3.5 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-xs active:scale-95 transition-all cursor-pointer ${
                          client.isUrgent
                            ? "bg-rose-600 hover:bg-rose-700 text-white shadow-rose-500/20 animate-pulse"
                            : "bg-[#2563EB] hover:bg-blue-700 text-white shadow-blue-500/20"
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
                      <button
                        type="button"
                        onClick={() => navigate(`/lead/clients/${client.id}`)}
                        className="px-3.5 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 bg-emerald-50 text-emerald-700 border border-emerald-200 shadow-2xs transition-all cursor-pointer"
                      >
                        <ShieldCheck className="size-3 text-emerald-600" />
                        QA Cleared
                      </button>
                    )}
                  </div>
                </div>

                {/* Deliverables Burndown Bars */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  {client.deliverables.map((del) => (
                    <div key={del.label} className="bg-[#0B111C] p-2.5 rounded-xl border border-[#2A3446] space-y-1">
                      <div className="flex justify-between text-[11px] font-bold">
                        <span className="text-[#F1F5F9]">{del.label}</span>
                        <span className="text-[#97A0B3]">
                          {del.current} / {del.target} ({del.percent}%)
                        </span>
                      </div>
                      <div className="h-1.5 w-full bg-slate-200/70 rounded-full overflow-hidden">
                        <div
                          className={`h-full ${del.color} rounded-full transition-all duration-500`}
                          style={{ width: `${del.percent}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>

                {/* Assignees & Next Handoff Footer */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between pt-3 border-t border-[#2A3446] text-xs text-[#F1F5F9] gap-2">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-[#97A0B3]">Pod Assignees:</span>
                    <div className="flex items-center gap-1.5">
                      {client.assignees.map((assignee) => (
                        <div
                          key={assignee.name}
                          className="flex items-center gap-1 bg-[#161F2D] px-2 py-0.5 rounded-lg border border-[#2A3446] text-[11px] font-bold"
                        >
                          <div
                            className={`size-4 rounded-md ${assignee.bg} text-white flex items-center justify-center text-[8px] font-black`}
                          >
                            {assignee.avatar}
                          </div>
                          <span>
                            {assignee.name} ({assignee.role})
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    <span className="font-bold text-[#F1F5F9] flex items-center gap-1 text-[11px]">
                      <Clock className="size-3 text-[#97A0B3]" />
                      Next Handoff: <span className="text-[#7FA0D6]">{client.nextHandoff}</span>
                    </span>
                    <Link
                      to={`/lead/clients/${client.id}`}
                      className="text-[11px] font-bold text-[#7FA0D6] hover:text-blue-800 hover:underline flex items-center gap-1 cursor-pointer"
                    >
                      View Profile →
                    </Link>
                  </div>
                </div>
              </div>
            ))}
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
            className="relative w-full max-w-xl bg-[#161F2D] rounded-3xl p-6 sm:p-8 shadow-2xl border border-[#2A3446] space-y-5 animate-in zoom-in-95 duration-150 text-left"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
          >
            {/* Top Header */}
            <div className="flex items-center justify-between border-b border-[#2A3446] pb-4">
              <div className="flex items-center gap-3">
                <div
                  className={`size-11 rounded-2xl ${reviewModal.client.avatarBg} text-white font-black text-sm flex items-center justify-center shadow-xs`}
                >
                  {reviewModal.client.avatar}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-black text-white">
                      {reviewModal.client.name}
                    </h3>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-black tracking-wider border ${reviewModal.client.tierBadgeColor}`}>
                      {reviewModal.client.tierBadge}
                    </span>
                  </div>
                  <p className="text-xs text-[#97A0B3] font-medium mt-0.5">
                    Creative Lead QA Sign-off Inspection
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setReviewModal(null)}
                className="size-8 rounded-full bg-[#1F2C3F] hover:bg-slate-200 text-[#97A0B3] hover:text-[#F1F5F9] flex items-center justify-center transition-colors cursor-pointer"
                aria-label="Close review dialog"
              >
                <X className="size-4" />
              </button>
            </div>

            {/* Asset Pending Review Card */}
            <div className="bg-[#0B111C] p-4 rounded-2xl border border-[#2A3446]/80 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold uppercase tracking-wider text-[#97A0B3]">
                  Deliverable Awaiting Lead Approval
                </span>
                {reviewModal.client.isUrgent ? (
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-rose-50 text-rose-700 border border-rose-200 animate-pulse">
                    ⚡ Urgent SLA: 1h 14m remaining
                  </span>
                ) : (
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-[#7FA0D6]/15 text-[#7FA0D6] border border-[#7FA0D6]/30">
                    {reviewModal.client.reviewAssetsCount} Assets Queued
                  </span>
                )}
              </div>
              <h4 className="text-sm font-black text-white">
                {reviewModal.client.deliverableTitle || "Primary Campaign Asset Package (Batch 4)"}
              </h4>
              <div className="flex flex-wrap items-center gap-2 text-xs font-semibold text-[#F1F5F9] pt-1">
                <span className="bg-[#161F2D] px-2.5 py-1 rounded-lg border border-[#2A3446] text-[11px]">
                  Format: 9:16 Vertical Story • 1080x1920 • 60fps
                </span>
                <span className="bg-[#161F2D] px-2.5 py-1 rounded-lg border border-[#2A3446] text-[11px]">
                  Assigned: {reviewModal.client.assignees.map((a) => a.name).join(", ")}
                </span>
              </div>
            </div>

            {/* QA Verification Checklist */}
            <div className="space-y-2.5">
              <span className="text-[11px] font-bold uppercase tracking-wider text-[#97A0B3] block">
                Lead Sign-off Verification Checklist:
              </span>
              <div className="space-y-2 text-xs font-semibold text-[#F1F5F9]">
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
                    className="flex items-center gap-3 p-2.5 rounded-xl border border-[#2A3446] bg-[#161F2D] hover:bg-[#0B111C] cursor-pointer transition-colors"
                  >
                    <input
                      type="checkbox"
                      defaultChecked
                      className="size-4 rounded text-[#7FA0D6] focus:ring-blue-500 border-[#2A3446]"
                    />
                    <span>{item.label}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row items-center justify-end gap-3 pt-3 border-t border-[#2A3446]">
              <button
                type="button"
                onClick={() => setReviewModal(null)}
                className="w-full sm:w-auto px-4 py-2.5 rounded-xl border border-[#2A3446] text-[#F1F5F9] text-xs font-bold hover:bg-[#1F2C3F] active:scale-95 transition-all cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  setReviewModal(null);
                  navigate("/lead/deliverables");
                }}
                className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-[#1F2C3F] hover:bg-slate-200 text-[#F1F5F9] text-xs font-bold active:scale-95 transition-all cursor-pointer"
              >
                Open Review Studio →
              </button>
              <button
                type="button"
                onClick={handleApproveSignoff}
                className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-700 hover:to-teal-800 text-white text-xs font-bold flex items-center justify-center gap-2 shadow-md shadow-emerald-600/25 active:scale-95 transition-all cursor-pointer"
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
            className="relative w-full max-w-md rounded-3xl bg-[#161F2D] p-6 sm:p-8 shadow-2xl border border-[#2A3446] flex flex-col items-center text-center animate-in zoom-in-95 duration-150 text-left"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
          >
            {/* Top Close Button */}
            <button
              type="button"
              onClick={() => setAlertModal(null)}
              className="absolute top-4 right-4 size-8 rounded-full bg-[#1F2C3F] hover:bg-slate-200 text-[#97A0B3] hover:text-[#F1F5F9] flex items-center justify-center transition-colors cursor-pointer"
              aria-label="Close modal"
            >
              <X className="size-4" />
            </button>

            {/* Tone Icon Badge */}
            <div className="size-16 rounded-3xl flex items-center justify-center mb-4 ring-8 shadow-inner bg-emerald-50 text-emerald-600 ring-emerald-50/60">
              <CheckCircle2 className="size-8" />
            </div>

            {/* Title */}
            <h3 className="text-xl font-black text-white tracking-tight">
              {alertModal.title}
            </h3>

            {/* Message */}
            <p className="text-xs sm:text-sm text-[#F1F5F9] mt-2 leading-relaxed max-w-sm text-center">
              {alertModal.message}
            </p>

            {/* Action Buttons */}
            <div className="w-full mt-6 flex items-center gap-3">
              <button
                type="button"
                onClick={() => setAlertModal(null)}
                autoFocus
                className="flex-1 py-3 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-700 hover:to-teal-800 text-white font-bold text-xs shadow-md shadow-emerald-600/25 active:scale-95 transition-all cursor-pointer"
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
                  className="px-5 py-3 rounded-2xl bg-[#1F2C3F] hover:bg-slate-200 text-[#F1F5F9] font-bold text-xs active:scale-95 transition-all cursor-pointer"
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
            className="w-full max-w-lg bg-[#161F2D] rounded-3xl p-6 sm:p-7 shadow-2xl border border-[#2A3446] space-y-4 animate-in zoom-in-95 duration-150 text-left"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
          >
            <div className="flex items-center justify-between border-b border-[#2A3446] pb-3">
              <h3 className="text-base font-black text-white">Request Pod Re-allocation</h3>
              <button
                type="button"
                onClick={() => setReallocationModal(false)}
                className="size-8 rounded-full bg-[#1F2C3F] hover:bg-slate-200 text-[#97A0B3] hover:text-[#F1F5F9] flex items-center justify-center transition-colors cursor-pointer"
              >
                <X className="size-4" />
              </button>
            </div>
            <p className="text-xs text-[#97A0B3]">
              Submit workload balancing request to Studio Director:
            </p>
            <div className="space-y-3 text-xs">
              <div>
                <label className="font-bold text-[#F1F5F9] block mb-1">Target Account</label>
                <select className="w-full p-2.5 rounded-xl border border-[#2A3446] bg-[#0B111C] font-medium">
                  <option>Atlas Commerce (Surge load)</option>
                  <option>Northwind Labs</option>
                  <option>Bloom Studio</option>
                </select>
              </div>
              <div>
                <label className="font-bold text-[#F1F5F9] block mb-1">Resource Needed</label>
                <select className="w-full p-2.5 rounded-xl border border-[#2A3446] bg-[#0B111C] font-medium">
                  <option>Additional 3D Motion Specialist Support</option>
                  <option>Copywriting surge capacity</option>
                  <option>Senior Visual Designer QA backup</option>
                </select>
              </div>
            </div>
            <div className="flex justify-end gap-3 pt-3 border-t border-[#2A3446]">
              <button
                type="button"
                onClick={() => setReallocationModal(false)}
                className="px-4 py-2 rounded-xl bg-[#1F2C3F] text-[#F1F5F9] text-xs font-bold hover:bg-slate-200 transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  showToast("Re-allocation request dispatched to Studio Director", "success");
                  setReallocationModal(false);
                }}
                className="px-5 py-2 rounded-xl bg-blue-600 text-white text-xs font-bold hover:bg-blue-700 transition cursor-pointer"
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

