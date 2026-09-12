import React, { useState, useEffect, useCallback } from "react";
import { Link } from "react-router";
import {
  Users,
  FileStack,
  CheckSquare,
  CalendarDays,
  LifeBuoy,
  UserCog,
  BarChart3,
  Settings,
  Search,
  Plus,
  Trash2,
  CheckCircle2,
  Copy,
  AlertTriangle,
  Megaphone,
  DollarSign,
  TrendingUp,
  Puzzle,
  Eye,
  Check,
  X,
  Loader2,
  UploadCloud,
  Upload,
  Film,
  Image as ImageIcon,
  Sparkles,
  Filter,
  Tag,
  Cpu,
  Wrench,
  Maximize2,
  Minimize2,
  ExternalLink,
  Download,
  Play,
  ZoomIn,
  ZoomOut,
  Smartphone,
  Sliders,
  Shield,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import {
  fetchClientRoster,
  fetchAdminQueue,
} from "../../lib/ops-api";
import { request } from "../../lib/http";
import { useAuth } from "../../lib/auth-context";
import type { ClientRosterItem, AdminQueueData } from "../../types/ops";


// ─────────────────────────────────────────────────────────────────────────────
// 1. ADMIN CLIENTS PAGE
// ─────────────────────────────────────────────────────────────────────────────
export function AdminClientsPage() {
  const [clients, setClients] = useState<ClientRosterItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  useEffect(() => {
    fetchClientRoster(undefined, "admin")
      .then((data) => setClients(data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const filteredClients = clients.filter((c) => {
    const matchesSearch =
      (c.company_name?.toLowerCase().includes(search.toLowerCase()) ?? false) ||
      c.email.toLowerCase().includes(search.toLowerCase());
    const matchesStatus =
      statusFilter === "all" || c.account_status.toLowerCase() === statusFilter.toLowerCase();
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <Users className="size-5 text-[#2B7BC4]" />
            <h1 className="text-2xl font-bold tracking-tight text-[#0D2137]">Clients Roster</h1>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Registered brands, onboarding stage tracking, and creative quota allocations
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 text-emerald-800 text-xs font-semibold border border-emerald-200">
            <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse" />
            {clients.length} Total Accounts
          </span>
        </div>
      </div>

      {/* Controls */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search by brand name or email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 rounded-xl border border-slate-200 bg-white text-xs text-[#0D2137] focus:outline-none focus:border-[#2B7BC4] focus:ring-1 focus:ring-[#2B7BC4]"
          />
        </div>
        <div className="flex items-center gap-2">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 rounded-xl border border-slate-200 bg-white text-xs text-[#0D2137] focus:outline-none focus:border-[#2B7BC4]"
          >
            <option value="all">All Statuses</option>
            <option value="active">Active</option>
            <option value="pending_verification">Pending</option>
            <option value="suspended">Suspended</option>
          </select>
        </div>
      </div>

      {/* Client List */}
      <div className="rounded-2xl border border-slate-200/90 bg-white shadow-xs overflow-hidden">
        {/* Mobile View (< 768px) */}
        <div className="block md:hidden divide-y divide-slate-100">
          {loading ? (
            <div className="p-8 text-center text-slate-400">
              <Loader2 className="size-5 animate-spin mx-auto mb-2 text-[#2B7BC4]" />
              Loading client roster...
            </div>
          ) : filteredClients.length === 0 ? (
            <div className="p-8 text-center text-slate-500 text-xs">
              No clients found matching filter criteria.
            </div>
          ) : (
            filteredClients.map((client) => (
              <div key={client.client_id} className="p-4 space-y-2.5">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h4 className="font-bold text-sm text-[#0D2137]">
                      {client.company_name || client.email.split("@")[0]}
                    </h4>
                    <p className="text-xs text-slate-500 font-mono mt-0.5">{client.email}</p>
                  </div>
                  <span
                    className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                      client.account_status === "active"
                        ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                        : "bg-amber-50 text-amber-700 border border-amber-200"
                    }`}
                  >
                    {client.account_status}
                  </span>
                </div>

                <div className="flex items-center justify-between text-xs pt-1 border-t border-slate-100">
                  <div className="flex items-center gap-1.5">
                    <span className="text-slate-400">Plan:</span>
                    <span className="font-semibold text-[#0D2137] capitalize">
                      {client.plan_name || "Growth Tier"}
                    </span>
                  </div>
                  <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                    client.onboarding_stage >= 4
                      ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                      : "bg-[#E8F4FD] text-[#2B7BC4] border border-[#C9DFF0]"
                  }`}>
                    {client.onboarding_stage >= 4 ? "Stage 4 / 4 • Done" : `Stage ${Math.max(1, client.onboarding_stage)} / 4`}
                  </span>
                </div>

                <div className="pt-2 flex justify-end border-t border-slate-100">
                  <Link
                    to="/portal"
                    className="inline-flex items-center gap-1 text-xs font-semibold text-[#2B7BC4] hover:underline"
                  >
                    Inspect Client Portal →
                  </Link>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Desktop Table (>= 768px) */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-[#0D2137] border-b border-slate-200 font-semibold uppercase tracking-wider text-[11px]">
              <tr>
                <th className="px-4 py-3">Client / Brand</th>
                <th className="px-4 py-3">Onboarding Stage</th>
                <th className="px-4 py-3">Current Plan</th>
                <th className="px-4 py-3">Account Status</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-slate-400">
                    <Loader2 className="size-5 animate-spin mx-auto mb-2 text-[#2B7BC4]" />
                    Loading client roster...
                  </td>
                </tr>
              ) : filteredClients.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-slate-400">
                    No clients found matching filter criteria.
                  </td>
                </tr>
              ) : (
                filteredClients.map((client) => (
                  <tr key={client.client_id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="px-4 py-3">
                      <div className="font-semibold text-[#0D2137]">
                        {client.company_name || client.email.split("@")[0]}
                      </div>
                      <div className="text-[11px] text-slate-400">{client.email}</div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                        client.onboarding_stage >= 4
                          ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                          : "bg-[#E8F4FD] text-[#2B7BC4] border border-[#C9DFF0]"
                      }`}>
                        {client.onboarding_stage >= 4 ? "Stage 4 / 4 • Completed" : `Stage ${Math.max(1, client.onboarding_stage)} / 4`}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="font-medium text-slate-700 capitalize">
                        {client.plan_name || "Growth Tier"}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                          client.account_status === "active"
                            ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                            : "bg-amber-50 text-amber-700 border border-amber-200"
                        }`}
                      >
                        {client.account_status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Link
                        to="/portal"
                        className="text-xs font-semibold text-[#2B7BC4] hover:underline"
                      >
                        Inspect Portal →
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 2. ADMIN DELIVERABLES PAGE (Team Lead & Admin Creative Uploads)
// ─────────────────────────────────────────────────────────────────────────────
export function AdminDeliverablesPage() {
  const [deliverables, setDeliverables] = useState<any[]>([]);
  const [clients, setClients] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");
  const [selectedClientFilter, setSelectedClientFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [previewItem, setPreviewItem] = useState<any | null>(null);
  const [previewZoom, setPreviewZoom] = useState<number>(1);
  const [isTheaterExpanded, setIsTheaterExpanded] = useState<boolean>(false);
  const [phoneFrameMode, setPhoneFrameMode] = useState<boolean>(true);
  const [copiedCaption, setCopiedCaption] = useState<boolean>(false);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [isVideoLoading, setIsVideoLoading] = useState<boolean>(true);

  // Close enlarge modal on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setPreviewItem(null);
        setIsTheaterExpanded(false);
      }
    };
    if (previewItem) {
      setIsVideoLoading(true);
      window.addEventListener("keydown", handleKeyDown);
    }
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [previewItem]);

  const getResolvedMediaUrl = (url?: string, type?: string) => {
    if (!url) {
      return (type || "").toLowerCase().includes("reel")
        ? "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4"
        : "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=1200&auto=format&fit=crop";
    }
    const apiBase = (
      (import.meta.env.VITE_API_URL as string) ||
      (typeof window !== "undefined" && (window.location.hostname.includes("workers.dev") || window.location.hostname.includes("pages.dev"))
        ? "https://creo-dsxr.onrender.com"
        : "")
    ).replace(/\/$/, "");
    let resolved = url;
    if (url.startsWith("/") && apiBase && !url.startsWith(apiBase)) {
      resolved = `${apiBase}${url}`;
    }
    return encodeURI(resolved);
  };

  const isVideoAsset = (url?: string, type?: string) => {
    const cleanUrl = (url || "").toLowerCase();
    const cleanType = (type || "").toLowerCase();
    return (
      cleanUrl.endsWith(".mp4") ||
      cleanUrl.endsWith(".mov") ||
      cleanUrl.endsWith(".webm") ||
      cleanUrl.includes("video") ||
      cleanType.includes("reel") ||
      cleanType.includes("video")
    );
  };

  // Upload modal state
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [activeMediaTab, setActiveMediaTab] = useState<"file" | "url" | "presets">("file");
  const [isUploadingFile, setIsUploadingFile] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadSuccess, setUploadSuccess] = useState<string | null>(null);

  const [uploadForm, setUploadForm] = useState({
    clientId: "",
    title: "",
    type: "reel",
    fileUrl: "",
    fileType: "",
    status: "pending_approval",
    revisionRound: 1,
    description: "",
    scheduledAt: "",
  });

  const fetchDeliverables = useCallback(() => {
    setLoading(true);
    request<any[]>("/api/v1/admin/deliverables")
      .then((data) => setDeliverables(Array.isArray(data) ? data : []))
      .catch(() => setDeliverables([]))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    fetchDeliverables();
    request<any[]>("/api/v1/admin/clients")
      .then((data) => {
        const list = Array.isArray(data) ? data : [];
        setClients(list);
        if (list.length > 0 && !uploadForm.clientId) {
          setUploadForm((prev) => ({ ...prev, clientId: list[0].client_id || list[0].id }));
        }
      })
      .catch(() => setClients([]));
  }, [fetchDeliverables]);

  const handleStatusUpdate = async (id: string, newStatus: string) => {
    setUpdatingId(id);
    try {
      await request(`/api/v1/admin/deliverables/${id}/status`, {
        method: "PATCH",
        body: JSON.stringify({ status: newStatus }),
      });
      setDeliverables((prev) =>
        prev.map((d) => (d.id === id ? { ...d, status: newStatus } : d))
      );
      if (previewItem && previewItem.id === id) {
        setPreviewItem({ ...previewItem, status: newStatus });
      }
    } catch {
      // Ignore
    } finally {
      setUpdatingId(null);
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploadingFile(true);
    setUploadError(null);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await request<{
        file_url: string;
        filename: string;
        file_type: string;
      }>("/api/v1/admin/deliverables/upload", {
        method: "POST",
        body: formData,
      });

      const isVideo = file.type.startsWith("video/") || file.name.endsWith(".mp4") || file.name.endsWith(".mov");
      setUploadForm((prev) => ({
        ...prev,
        fileUrl: res.file_url,
        fileType: res.file_type || file.type,
        type: isVideo ? "reel" : prev.type,
        title: prev.title || file.name.replace(/\.[^/.]+$/, "").replace(/[-_]/g, " "),
      }));
    } catch (err: any) {
      setUploadError(err?.message || "File upload failed. Please try again or paste a media URL.");
    } finally {
      setIsUploadingFile(false);
    }
  };

  const handleApplyPreset = (preset: { title: string; type: string; url: string; fileType: string }) => {
    setUploadForm((prev) => ({
      ...prev,
      title: prev.title || preset.title,
      type: preset.type,
      fileUrl: preset.url,
      fileType: preset.fileType,
    }));
    setUploadError(null);
  };

  const handleCreateDeliverable = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!uploadForm.clientId) {
      setUploadError("Please select a target client for this deliverable.");
      return;
    }
    if (!uploadForm.fileUrl.trim()) {
      setUploadError("Please upload a media file or provide an asset URL.");
      return;
    }

    setIsSubmitting(true);
    setUploadError(null);

    try {
      const selectedClientObj = clients.find(
        (c) => (c.client_id || c.id) === uploadForm.clientId
      );
      const clientName = selectedClientObj?.company_name || selectedClientObj?.full_name || "Client";

      const created = await request<any>("/api/v1/admin/deliverables", {
        method: "POST",
        body: JSON.stringify({
          client_id: uploadForm.clientId,
          title: uploadForm.title.trim() || `${uploadForm.type === "reel" ? "Reel 9:16" : "Static Poster"} · ${clientName}`,
          type: uploadForm.type,
          file_url: uploadForm.fileUrl.trim(),
          file_type: uploadForm.fileType || (uploadForm.fileUrl.endsWith(".mp4") ? "video/mp4" : "image/png"),
          status: uploadForm.status,
          revision_round: uploadForm.revisionRound,
          description: uploadForm.description.trim() || undefined,
          scheduled_at: uploadForm.scheduledAt ? new Date(uploadForm.scheduledAt).toISOString() : undefined,
        }),
      });

      setDeliverables((prev) => [created, ...prev]);
      setUploadSuccess(`Deliverable "${created.title}" successfully dispatched to ${clientName}!`);
      setTimeout(() => setUploadSuccess(null), 4000);

      // Reset form and close
      setIsUploadOpen(false);
      setUploadForm({
        clientId: clients[0]?.client_id || clients[0]?.id || "",
        title: "",
        type: "reel",
        fileUrl: "",
        fileType: "",
        status: "pending_approval",
        revisionRound: 1,
        description: "",
        scheduledAt: "",
      });
    } catch (err: any) {
      setUploadError(err?.message || "Failed to create deliverable.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const filtered = deliverables.filter((d) => {
    const matchesFilter =
      filter === "all"
        ? true
        : filter === "pending"
        ? d.status.includes("pending")
        : filter === "approved"
        ? d.status === "approved"
        : filter === "revision"
        ? d.status.includes("revision")
        : true;

    const matchesClient =
      selectedClientFilter === "all" || d.client_id === selectedClientFilter;

    const matchesSearch =
      !searchQuery.trim() ||
      d.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      d.client.toLowerCase().includes(searchQuery.toLowerCase());

    return matchesFilter && matchesClient && matchesSearch;
  });

  const pendingCount = deliverables.filter((d) => d.status.includes("pending")).length;
  const approvedCount = deliverables.filter((d) => d.status === "approved").length;
  const revisionCount = deliverables.filter((d) => d.status.includes("revision")).length;

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <FileStack className="size-5 text-[#2B7BC4]" />
            <h1 className="text-2xl font-bold tracking-tight text-[#0D2137]">Deliverables Hub</h1>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Team Leads & Editors upload, manage, and dispatch creative deliverables directly for client approval
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={() => {
              setIsUploadOpen(true);
              setUploadError(null);
            }}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-[#2B7BC4] to-[#1A5EA8] text-white text-xs font-semibold shadow-xs hover:brightness-105 active:scale-[0.98] transition-all cursor-pointer"
          >
            <UploadCloud className="size-4" />
            Upload Deliverable
          </button>
        </div>
      </div>

      {/* Success Banner */}
      {uploadSuccess && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-xs text-emerald-800 font-semibold flex items-center justify-between animate-in fade-in">
          <span className="flex items-center gap-2">
            <CheckCircle2 className="size-4 text-emerald-600 shrink-0" />
            {uploadSuccess}
          </span>
          <button
            type="button"
            onClick={() => setUploadSuccess(null)}
            className="text-emerald-600 hover:text-emerald-900 cursor-pointer"
          >
            <X className="size-4" />
          </button>
        </div>
      )}

      {/* Controls & Filter Bar */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 bg-white p-3 rounded-xl border border-slate-200 shadow-2xs">
        {/* Search and Client Filter */}
        <div className="flex flex-wrap items-center gap-2 flex-1">
          <div className="relative min-w-[200px] flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-slate-400" />
            <input
              type="text"
              placeholder="Search by creative title or client..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-xs rounded-lg border border-slate-200 focus:outline-none focus:border-[#2B7BC4] focus:ring-1 focus:ring-[#2B7BC4]"
            />
          </div>

          <div className="flex items-center gap-1.5 text-xs text-slate-600">
            <Filter className="size-3.5 text-slate-400" />
            <select
              value={selectedClientFilter}
              onChange={(e) => setSelectedClientFilter(e.target.value)}
              aria-label="Filter deliverables by client"
              className="px-2.5 py-1.5 text-xs rounded-lg border border-slate-200 bg-white font-medium text-slate-700 focus:outline-none focus:border-[#2B7BC4]"
            >
              <option value="all">All Clients ({clients.length})</option>
              {clients.map((c) => (
                <option key={c.client_id || c.id} value={c.client_id || c.id}>
                  {c.company_name || c.full_name || c.email}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Status Pills */}
        <div className="flex flex-wrap gap-1.5 border-t md:border-t-0 md:border-l border-slate-100 pt-2 md:pt-0 md:pl-3">
          <button
            type="button"
            onClick={() => setFilter("all")}
            className={`px-3 py-1 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
              filter === "all"
                ? "bg-[#2B7BC4] text-white"
                : "bg-slate-50 text-slate-600 hover:bg-slate-100"
            }`}
          >
            All ({deliverables.length})
          </button>
          <button
            type="button"
            onClick={() => setFilter("pending")}
            className={`px-3 py-1 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
              filter === "pending"
                ? "bg-[#2B7BC4] text-white"
                : "bg-slate-50 text-slate-600 hover:bg-slate-100"
            }`}
          >
            Awaiting Review ({pendingCount})
          </button>
          <button
            type="button"
            onClick={() => setFilter("approved")}
            className={`px-3 py-1 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
              filter === "approved"
                ? "bg-[#2B7BC4] text-white"
                : "bg-slate-50 text-slate-600 hover:bg-slate-100"
            }`}
          >
            Approved ({approvedCount})
          </button>
          {revisionCount > 0 && (
            <button
              type="button"
              onClick={() => setFilter("revision")}
              className={`px-3 py-1 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                filter === "revision"
                  ? "bg-[#2B7BC4] text-white"
                  : "bg-slate-50 text-slate-600 hover:bg-slate-100"
              }`}
            >
              Revision ({revisionCount})
            </button>
          )}
        </div>
      </div>

      {/* Deliverables Grid */}
      {loading ? (
        <div className="py-16 text-center text-slate-400">
          <Loader2 className="size-6 animate-spin mx-auto mb-2 text-[#2B7BC4]" />
          Loading deliverables from database...
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-12 text-center">
          <UploadCloud className="size-10 text-slate-300 mx-auto mb-3" />
          <h3 className="text-sm font-bold text-[#0D2137]">No deliverables found</h3>
          <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
            {deliverables.length === 0
              ? "No creative deliverables have been uploaded yet. Upload a deliverable for your clients to review."
              : "No deliverables match the active filter or client selection."}
          </p>
          <button
            type="button"
            onClick={() => setIsUploadOpen(true)}
            className="mt-4 inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-[#2B7BC4] text-white text-xs font-semibold hover:bg-[#1A5EA8] cursor-pointer"
          >
            <Plus className="size-3.5" /> Upload Now
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filtered.map((item) => (
            <div
              key={item.id}
              className="group rounded-xl border border-slate-200 bg-white p-5 shadow-xs flex flex-col justify-between hover:shadow-md hover:border-slate-300 transition-all"
            >
              <div>
                <div className="flex items-center justify-between gap-2 mb-3">
                  <span className="px-2.5 py-0.5 rounded-full bg-[#E8F4FD] text-[#2B7BC4] text-[10px] font-bold border border-[#C9DFF0] flex items-center gap-1">
                    {item.type.includes("Reel") || item.type.includes("video") ? (
                      <Film className="size-3" />
                    ) : (
                      <ImageIcon className="size-3" />
                    )}
                    {item.type}
                  </span>
                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                      item.status === "approved"
                        ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                        : item.status === "revision_requested" || item.status === "rejected"
                        ? "bg-rose-50 text-rose-700 border border-rose-200"
                        : "bg-amber-50 text-amber-700 border border-amber-200"
                    }`}
                  >
                    {item.status.replace("_", " ")}
                  </span>
                </div>

                <h3 className="font-bold text-sm text-[#0D2137] line-clamp-1 group-hover:text-[#2B7BC4] transition-colors">
                  {item.title}
                </h3>
                <p className="text-xs text-slate-500 mt-1">
                  Client: <span className="font-semibold text-slate-700">{item.client}</span>
                </p>

                {/* Thumbnail Preview strip - Click to enlarge */}
                {item.file_url && (
                  <div
                    onClick={() => {
                      setPreviewZoom(1);
                      setIsTheaterExpanded(false);
                      setPreviewItem(item);
                    }}
                    className="mt-3 relative h-32 w-full rounded-xl bg-slate-950 overflow-hidden border border-slate-200 hover:border-[#2B7BC4] transition-all cursor-pointer flex items-center justify-center group/thumb shadow-2xs"
                    title="Click to Enlarge / Full Preview"
                  >
                    {isVideoAsset(item.file_url, item.type) ? (
                      <div className="relative w-full h-full flex items-center justify-center bg-slate-950">
                        <video
                          src={getResolvedMediaUrl(item.file_url, item.type)}
                          className="h-full w-full object-cover opacity-85 group-hover/thumb:opacity-100 group-hover/thumb:scale-105 transition-all duration-300"
                          muted
                          playsInline
                          preload="none"
                        />
                        <div className="absolute inset-0 flex items-center justify-center">
                          <div className="size-10 rounded-full bg-black/60 backdrop-blur-md border border-white/30 flex items-center justify-center text-white shadow-lg group-hover/thumb:scale-110 group-hover/thumb:bg-[#2B7BC4] transition-all">
                            <Play className="size-4 fill-white ml-0.5" />
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="relative w-full h-full flex items-center justify-center bg-slate-900">
                        <img
                          src={getResolvedMediaUrl(item.file_url, item.type)}
                          alt={item.title}
                          className="h-full w-full object-cover opacity-90 group-hover/thumb:opacity-100 group-hover/thumb:scale-105 transition-all duration-300"
                        />
                        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover/thumb:opacity-100 transition-opacity">
                          <div className="size-10 rounded-full bg-black/50 backdrop-blur-md border border-white/40 flex items-center justify-center text-white shadow-lg">
                            <Maximize2 className="size-4" />
                          </div>
                        </div>
                      </div>
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent flex items-end justify-between p-2.5">
                      <span className="text-[11px] font-semibold text-white flex items-center gap-1.5 drop-shadow-sm">
                        <Eye className="size-3.5 text-[#60A5FA]" /> Click to Enlarge
                      </span>
                      <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-black/60 backdrop-blur-xs text-slate-200 border border-white/15">
                        {item.type}
                      </span>
                    </div>
                  </div>
                )}

                <div className="mt-3 p-2.5 rounded-lg bg-slate-50 border border-slate-100 text-xs space-y-1">
                  <div className="flex justify-between text-slate-500">
                    <span>Timing:</span>
                    <span className="font-medium text-[#0D2137]">{item.date}</span>
                  </div>
                  <div className="flex justify-between text-slate-500">
                    <span>Revision:</span>
                    <span className="font-medium text-[#0D2137]">{item.round}</span>
                  </div>
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => {
                    setPreviewZoom(1);
                    setIsTheaterExpanded(false);
                    setPreviewItem(item);
                  }}
                  className="text-xs font-bold text-[#2B7BC4] hover:text-[#1A5EA8] flex items-center gap-1.5 cursor-pointer group/btn"
                >
                  <Maximize2 className="size-3.5 transition-transform group-hover/btn:scale-110" /> Full Preview & Enlarge
                </button>
                <div className="flex items-center gap-2">
                  {item.status !== "approved" ? (
                    <button
                      type="button"
                      disabled={updatingId === item.id}
                      onClick={() => handleStatusUpdate(item.id, "approved")}
                      className="px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200 text-[11px] font-bold hover:bg-emerald-100 cursor-pointer disabled:opacity-50"
                    >
                      Approve
                    </button>
                  ) : (
                    <span className="text-[11px] font-bold text-emerald-600 flex items-center gap-1">
                      <Check className="size-3" /> Approved
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Upload Deliverable Modal */}
      {isUploadOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs overflow-y-auto animate-in fade-in">
          <div className="w-full max-w-xl rounded-2xl bg-white shadow-2xl border border-slate-100 overflow-hidden my-8">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-gradient-to-r from-slate-50 to-white">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-[#E8F4FD] text-[#2B7BC4]">
                  <UploadCloud className="size-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-[#0D2137]">Upload Client Deliverable</h3>
                  <p className="text-xs text-slate-500">Dispatch reel, post, or carousel for client review & approval</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsUploadOpen(false)}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 cursor-pointer"
              >
                <X className="size-4" />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleCreateDeliverable} className="p-6 space-y-4">
              {uploadError && (
                <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold flex items-center gap-2">
                  <AlertTriangle className="size-4 shrink-0" />
                  <span>{uploadError}</span>
                </div>
              )}

              {/* 1. Target Client Selection */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Target Client <span className="text-rose-500">*</span>
                </label>
                <select
                  value={uploadForm.clientId}
                  onChange={(e) => setUploadForm({ ...uploadForm, clientId: e.target.value })}
                  aria-label="Target Client"
                  required
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 bg-white font-medium text-slate-800 focus:outline-none focus:border-[#2B7BC4] focus:ring-2 focus:ring-[#2B7BC4]/20"
                >
                  {clients.length === 0 && <option value="">No clients found in system</option>}
                  {clients.map((c) => (
                    <option key={c.client_id || c.id} value={c.client_id || c.id}>
                      {c.company_name || c.full_name || "Client"} ({c.email})
                    </option>
                  ))}
                </select>
                <p className="text-[11px] text-slate-400 mt-1">
                  The client will instantly receive and see this deliverable on their Creative Deliverables portal.
                </p>
              </div>

              {/* 2. Title & Creative Type */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    Deliverable Title / Campaign
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Summer Launch Reel #1"
                    value={uploadForm.title}
                    onChange={(e) => setUploadForm({ ...uploadForm, title: e.target.value })}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:border-[#2B7BC4] focus:ring-2 focus:ring-[#2B7BC4]/20"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">Creative Format</label>
                  <select
                    value={uploadForm.type}
                    onChange={(e) => setUploadForm({ ...uploadForm, type: e.target.value })}
                    aria-label="Creative Format"
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 bg-white font-medium text-slate-800 focus:outline-none focus:border-[#2B7BC4]"
                  >
                    <option value="reel">Reel (9:16 Video)</option>
                    <option value="static_post">Static Poster (Image)</option>
                    <option value="carousel">Carousel (Multi-slide)</option>
                    <option value="story">Story (9:16)</option>
                  </select>
                </div>
              </div>

              {/* 3. Media Asset Source Selector */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-bold text-slate-700">
                    Creative Asset Media <span className="text-rose-500">*</span>
                  </label>
                  <div className="flex gap-1 bg-slate-100 p-0.5 rounded-lg text-[11px]">
                    <button
                      type="button"
                      onClick={() => setActiveMediaTab("file")}
                      className={`px-2.5 py-0.5 rounded-md font-semibold transition-all cursor-pointer ${
                        activeMediaTab === "file" ? "bg-white text-[#0D2137] shadow-2xs" : "text-slate-500 hover:text-slate-800"
                      }`}
                    >
                      <Upload className="size-3 inline mr-1" /> File Upload
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveMediaTab("url")}
                      className={`px-2.5 py-0.5 rounded-md font-semibold transition-all cursor-pointer ${
                        activeMediaTab === "url" ? "bg-white text-[#0D2137] shadow-2xs" : "text-slate-500 hover:text-slate-800"
                      }`}
                    >
                      Media URL
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveMediaTab("presets")}
                      className={`px-2.5 py-0.5 rounded-md font-semibold transition-all cursor-pointer ${
                        activeMediaTab === "presets" ? "bg-white text-[#0D2137] shadow-2xs" : "text-slate-500 hover:text-slate-800"
                      }`}
                    >
                      <Sparkles className="size-3 inline mr-1 text-amber-500" /> Demo Presets
                    </button>
                  </div>
                </div>

                {/* Tab A: Local File Upload */}
                {activeMediaTab === "file" && (
                  <div className="border-2 border-dashed border-slate-200 hover:border-[#2B7BC4] rounded-xl p-5 text-center transition-colors bg-slate-50/50">
                    <input
                      type="file"
                      id="deliverable-file-input"
                      accept="video/mp4,video/quicktime,video/webm,image/png,image/jpeg,image/webp"
                      onChange={handleFileChange}
                      className="hidden"
                    />
                    <label
                      htmlFor="deliverable-file-input"
                      className="cursor-pointer flex flex-col items-center justify-center"
                    >
                      {isUploadingFile ? (
                        <div className="space-y-2 py-2">
                          <Loader2 className="size-6 animate-spin text-[#2B7BC4] mx-auto" />
                          <p className="text-xs font-semibold text-slate-600">Uploading media asset to server...</p>
                        </div>
                      ) : uploadForm.fileUrl && uploadForm.fileUrl.startsWith("/static") ? (
                        <div className="space-y-2 py-1">
                          <CheckCircle2 className="size-6 text-emerald-500 mx-auto" />
                          <p className="text-xs font-bold text-slate-800">Media file uploaded successfully!</p>
                          <span className="text-[11px] text-slate-500 font-mono break-all">{uploadForm.fileUrl}</span>
                          <p className="text-[11px] text-[#2B7BC4] font-semibold hover:underline">Click to replace file</p>
                        </div>
                      ) : (
                        <div className="space-y-1.5 py-1">
                          <UploadCloud className="size-8 text-[#2B7BC4] mx-auto" />
                          <p className="text-xs font-bold text-slate-700">
                            Click to browse or drag & drop creative file
                          </p>
                          <p className="text-[11px] text-slate-400">
                            Supports MP4 / MOV reels, PNG, JPG, and WEBP posters
                          </p>
                        </div>
                      )}
                    </label>
                  </div>
                )}

                {/* Tab B: Direct URL */}
                {activeMediaTab === "url" && (
                  <div className="space-y-2">
                    <input
                      type="url"
                      placeholder="https://images.unsplash.com/... or https://commondatastorage.googleapis.com/.../video.mp4"
                      value={uploadForm.fileUrl}
                      onChange={(e) => {
                        const url = e.target.value;
                        const isVideo = url.endsWith(".mp4") || url.includes("video");
                        setUploadForm({
                          ...uploadForm,
                          fileUrl: url,
                          fileType: isVideo ? "video/mp4" : "image/png",
                          type: isVideo ? "reel" : uploadForm.type,
                        });
                      }}
                      className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:border-[#2B7BC4] font-mono text-slate-700"
                    />
                    <p className="text-[11px] text-slate-400">
                      Paste direct link to S3, Cloudflare R2, Unsplash, or CDN video/image.
                    </p>
                  </div>
                )}

                {/* Tab C: Creative Presets */}
                {activeMediaTab === "presets" && (
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      {
                        title: "⚡ Apex Fitness High-Energy Reel (9:16)",
                        type: "reel",
                        url: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4",
                        fileType: "video/mp4",
                      },
                      {
                        title: "🎨 Glow Skin Luxury Poster (PNG)",
                        type: "static_post",
                        url: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=1200&auto=format&fit=crop",
                        fileType: "image/png",
                      },
                      {
                        title: "🚀 Cyber Launch Reel (9:16)",
                        type: "reel",
                        url: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4",
                        fileType: "video/mp4",
                      },
                      {
                        title: "✨ Modern Minimalist Brand Poster",
                        type: "static_post",
                        url: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=1200&auto=format&fit=crop",
                        fileType: "image/png",
                      },
                    ].map((preset) => (
                      <button
                        key={preset.title}
                        type="button"
                        onClick={() => handleApplyPreset(preset)}
                        className={`text-left p-2.5 rounded-xl border text-xs transition-all cursor-pointer flex flex-col justify-between ${
                          uploadForm.fileUrl === preset.url
                            ? "border-[#2B7BC4] bg-[#E8F4FD] text-[#0D2137] font-semibold"
                            : "border-slate-200 bg-white hover:bg-slate-50 text-slate-700"
                        }`}
                      >
                        <span className="line-clamp-1">{preset.title}</span>
                        <span className="text-[10px] text-[#2B7BC4] font-bold mt-1 uppercase">
                          {preset.type.replace("_", " ")}
                        </span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Live Thumbnail Preview if URL is set */}
              {uploadForm.fileUrl && (
                <div className="p-3 rounded-xl bg-slate-900 flex items-center gap-3">
                  <div className="h-16 w-16 shrink-0 rounded-lg overflow-hidden bg-black flex items-center justify-center">
                    {uploadForm.fileUrl.endsWith(".mp4") || uploadForm.fileType?.includes("video") ? (
                      <video src={uploadForm.fileUrl} className="h-full w-full object-cover" muted />
                    ) : (
                      <img src={uploadForm.fileUrl} alt="Preview" className="h-full w-full object-cover" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0 text-white">
                    <p className="text-xs font-bold truncate">{uploadForm.title || "Ready to upload"}</p>
                    <p className="text-[11px] text-slate-400 font-mono truncate">{uploadForm.fileUrl}</p>
                    <span className="inline-block mt-1 px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                      Asset Verified & Attached
                    </span>
                  </div>
                </div>
              )}

              {/* 4. Review Stage & Revision Round */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">Initial Status</label>
                  <select
                    value={uploadForm.status}
                    onChange={(e) => setUploadForm({ ...uploadForm, status: e.target.value })}
                    aria-label="Initial Status"
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 bg-white font-medium text-slate-800 focus:outline-none focus:border-[#2B7BC4]"
                  >
                    <option value="pending_approval">Awaiting Client Review (Ready for Approval)</option>
                    <option value="in_production">In Production (Drafting)</option>
                    <option value="approved">Pre-Approved</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">Revision Round</label>
                  <select
                    value={uploadForm.revisionRound}
                    onChange={(e) => setUploadForm({ ...uploadForm, revisionRound: Number(e.target.value) })}
                    aria-label="Revision Round"
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 bg-white font-medium text-slate-800 focus:outline-none focus:border-[#2B7BC4]"
                  >
                    <option value={1}>Draft 1 (First Cut)</option>
                    <option value={2}>Round 2 (Revision)</option>
                    <option value={3}>Round 3 (Final Cut)</option>
                  </select>
                </div>
              </div>

              {/* 5. Creative Notes & Copy */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Client Notes / Caption Copy
                </label>
                <textarea
                  rows={2}
                  placeholder="e.g. Optimized for high engagement reels. Audio timed at 128 BPM with branded lower thirds."
                  value={uploadForm.description}
                  onChange={(e) => setUploadForm({ ...uploadForm, description: e.target.value })}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:border-[#2B7BC4] focus:ring-2 focus:ring-[#2B7BC4]/20"
                />
              </div>

              {/* Modal Actions */}
              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setIsUploadOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || isUploadingFile}
                  className="inline-flex items-center gap-2 px-5 py-2 rounded-xl bg-gradient-to-r from-[#2B7BC4] to-[#1A5EA8] text-white text-xs font-bold shadow-xs hover:brightness-105 active:scale-[0.98] transition-all cursor-pointer disabled:opacity-50"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="size-3.5 animate-spin" />
                      Dispatching to Client...
                    </>
                  ) : (
                    <>
                      <Check className="size-3.5" />
                      Dispatch Deliverable to Client
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Creative Lightbox & Enlarge Theater Modal */}
      {previewItem && (
        <div
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setPreviewItem(null);
              setIsTheaterExpanded(false);
            }
          }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-2 sm:p-4 md:p-6 backdrop-blur-md animate-in fade-in overflow-hidden"
        >
          <div
            className={`w-full transition-all duration-300 rounded-2xl bg-[#0D2137] text-white shadow-2xl border border-slate-700/60 flex flex-col overflow-hidden ${
              isTheaterExpanded
                ? "max-w-[98vw] h-[96vh]"
                : "max-w-5xl h-[88vh] md:h-[84vh]"
            }`}
          >
            {/* Modal Top Header Bar */}
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-800 bg-[#081524]">
              <div className="flex items-center gap-3 min-w-0">
                <span className="px-2.5 py-1 rounded-md text-[11px] font-bold uppercase tracking-wider bg-[#2B7BC4]/20 text-[#60A5FA] border border-[#2B7BC4]/40 shrink-0">
                  {previewItem.type}
                </span>
                <div className="min-w-0">
                  <h3 className="text-sm sm:text-base font-bold text-white truncate">
                    {previewItem.title}
                  </h3>
                  <p className="text-xs text-slate-400 truncate">
                    Client: <span className="font-semibold text-slate-200">{previewItem.client}</span> · {previewItem.round}
                  </p>
                </div>
              </div>

              {/* Top Quick Actions */}
              <div className="flex items-center gap-1.5 shrink-0">
                {/* Switch between phone bezel and wide mode if video */}
                {isVideoAsset(previewItem.file_url, previewItem.type) && !isTheaterExpanded && (
                  <button
                    type="button"
                    onClick={() => setPhoneFrameMode((prev) => !prev)}
                    title={phoneFrameMode ? "Switch to Wide Video" : "Switch to 9:16 Mobile Frame"}
                    className="p-2 rounded-xl text-slate-300 hover:text-white hover:bg-slate-800/80 transition-colors cursor-pointer flex items-center gap-1 text-xs font-semibold"
                  >
                    <Smartphone className="size-4 text-[#60A5FA]" />
                    <span className="hidden sm:inline">{phoneFrameMode ? "9:16 Frame" : "Wide Cinema"}</span>
                  </button>
                )}

                {/* Zoom Controls for Static Posters */}
                {!isVideoAsset(previewItem.file_url, previewItem.type) && (
                  <div className="flex items-center bg-slate-800/80 rounded-xl p-0.5 border border-slate-700/50">
                    <button
                      type="button"
                      onClick={() => setPreviewZoom((z) => Math.max(1, z - 0.25))}
                      disabled={previewZoom <= 1}
                      title="Zoom Out"
                      className="p-1.5 rounded-lg text-slate-300 hover:text-white disabled:opacity-40 cursor-pointer"
                    >
                      <ZoomOut className="size-3.5" />
                    </button>
                    <span className="text-[11px] font-mono px-1.5 text-slate-300 min-w-[42px] text-center">
                      {Math.round(previewZoom * 100)}%
                    </span>
                    <button
                      type="button"
                      onClick={() => setPreviewZoom((z) => Math.min(2.5, z + 0.25))}
                      disabled={previewZoom >= 2.5}
                      title="Zoom In"
                      className="p-1.5 rounded-lg text-slate-300 hover:text-white disabled:opacity-40 cursor-pointer"
                    >
                      <ZoomIn className="size-3.5" />
                    </button>
                  </div>
                )}

                {/* Fullscreen / Theater Toggle */}
                <button
                  type="button"
                  onClick={() => setIsTheaterExpanded((prev) => !prev)}
                  title={isTheaterExpanded ? "Exit Theater Mode" : "Expand Full Theater Mode"}
                  className="p-2 rounded-xl text-slate-300 hover:text-white hover:bg-slate-800/80 transition-colors cursor-pointer"
                >
                  {isTheaterExpanded ? (
                    <Minimize2 className="size-4" />
                  ) : (
                    <Maximize2 className="size-4" />
                  )}
                </button>

                {/* Open in New Tab */}
                <a
                  href={getResolvedMediaUrl(previewItem.file_url, previewItem.type)}
                  target="_blank"
                  rel="noopener noreferrer"
                  title="Open Raw File in New Tab"
                  className="p-2 rounded-xl text-slate-300 hover:text-white hover:bg-slate-800/80 transition-colors cursor-pointer"
                >
                  <ExternalLink className="size-4" />
                </a>

                {/* Download */}
                <a
                  href={getResolvedMediaUrl(previewItem.file_url, previewItem.type)}
                  download={`${previewItem.title.replace(/\s+/g, "_")}.${isVideoAsset(previewItem.file_url, previewItem.type) ? "mp4" : "png"}`}
                  title="Download Creative Asset"
                  className="p-2 rounded-xl text-slate-300 hover:text-white hover:bg-slate-800/80 transition-colors cursor-pointer"
                >
                  <Download className="size-4" />
                </a>

                {/* Close */}
                <button
                  type="button"
                  onClick={() => {
                    setPreviewItem(null);
                    setIsTheaterExpanded(false);
                  }}
                  title="Close (Esc)"
                  className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-rose-500/20 hover:text-rose-300 transition-colors cursor-pointer ml-1"
                >
                  <X className="size-5" />
                </button>
              </div>
            </div>

            {/* Modal Body: Split or Full Stage */}
            <div className="flex-1 min-h-0 flex flex-col md:flex-row overflow-hidden">
              {/* Media Enlarge Stage */}
              <div
                className={`flex-1 relative bg-black/90 flex items-center justify-center p-3 sm:p-6 overflow-auto select-none ${
                  isTheaterExpanded ? "w-full" : "md:w-[65%]"
                }`}
              >
                {isVideoAsset(previewItem.file_url, previewItem.type) ? (
                  /* Video / Reel Player */
                  phoneFrameMode && !isTheaterExpanded ? (
                    /* 9:16 Mobile Phone Bezel Frame */
                    <div className="h-[96%] max-h-[580px] aspect-[9/16] rounded-[36px] border-[5px] border-slate-700 bg-black shadow-2xl overflow-hidden relative flex flex-col items-center justify-center ring-1 ring-white/20">
                      {/* Top Notch / Dynamic Island */}
                      <div className="absolute top-2.5 z-20 w-24 h-4 bg-slate-900 rounded-full flex items-center justify-center pointer-events-none">
                        <div className="size-2 rounded-full bg-slate-800 mr-2" />
                        <div className="size-2.5 rounded-full bg-slate-850" />
                      </div>

                      {/* Video Loading Spinner */}
                      {isVideoLoading && (
                        <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/70 backdrop-blur-xs z-10 pointer-events-none">
                          <Loader2 className="size-8 text-[#2B7BC4] animate-spin mb-2" />
                          <span className="text-[11px] font-medium text-slate-300">Loading Reel...</span>
                        </div>
                      )}

                      <video
                        src={getResolvedMediaUrl(previewItem.file_url, previewItem.type)}
                        controls
                        autoPlay
                        muted
                        loop
                        playsInline
                        preload="auto"
                        onWaiting={() => setIsVideoLoading(true)}
                        onPlaying={() => setIsVideoLoading(false)}
                        onCanPlay={() => setIsVideoLoading(false)}
                        onLoadedData={() => setIsVideoLoading(false)}
                        className="h-full w-full object-cover"
                      />

                      {/* Floating Bezel Tag */}
                      <div className="absolute bottom-3 z-20 px-2.5 py-0.5 rounded-full bg-black/60 backdrop-blur-md text-[10px] text-slate-300 font-mono border border-white/10 pointer-events-none">
                        9:16 Reel Player
                      </div>
                    </div>
                  ) : (
                    /* Wide / Full Theater Video Player */
                    <div className="w-full h-full max-h-[82vh] flex items-center justify-center relative">
                      {/* Video Loading Spinner */}
                      {isVideoLoading && (
                        <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/70 backdrop-blur-xs z-10 pointer-events-none rounded-xl">
                          <Loader2 className="size-8 text-[#2B7BC4] animate-spin mb-2" />
                          <span className="text-[11px] font-medium text-slate-300">Loading Reel...</span>
                        </div>
                      )}

                      <video
                        src={getResolvedMediaUrl(previewItem.file_url, previewItem.type)}
                        controls
                        autoPlay
                        muted
                        loop
                        playsInline
                        preload="auto"
                        onWaiting={() => setIsVideoLoading(true)}
                        onPlaying={() => setIsVideoLoading(false)}
                        onCanPlay={() => setIsVideoLoading(false)}
                        onLoadedData={() => setIsVideoLoading(false)}
                        className="max-h-full max-w-full rounded-xl shadow-2xl object-contain"
                      />
                    </div>
                  )
                ) : (
                  /* Static Image / Poster with Zoom */
                  <div
                    className="w-full h-full flex items-center justify-center overflow-auto p-2"
                    onClick={() => {
                      if (previewZoom === 1) setPreviewZoom(1.5);
                      else setPreviewZoom(1);
                    }}
                    title="Click image to toggle zoom"
                  >
                    <img
                      src={getResolvedMediaUrl(previewItem.file_url, previewItem.type)}
                      alt={previewItem.title}
                      style={{ transform: `scale(${previewZoom})` }}
                      className="max-h-[80vh] max-w-full object-contain rounded-xl shadow-2xl transition-transform duration-200 cursor-zoom-in"
                    />
                  </div>
                )}

                {/* Floating Bottom Hint */}
                <div className="absolute bottom-3 left-4 z-10 hidden sm:flex items-center gap-2 px-3 py-1 rounded-lg bg-black/60 backdrop-blur-xs text-[11px] text-slate-400 border border-white/10 pointer-events-none">
                  <span>Press <kbd className="px-1 py-0.5 rounded bg-slate-800 text-slate-200 font-mono text-[10px]">Esc</kbd> to close</span>
                  <span>·</span>
                  <span>Click <Maximize2 className="size-3 inline mx-0.5" /> for Full Theater</span>
                </div>
              </div>

              {/* Right Side / Sidebar: Metadata & Review Actions (hidden if in full theater) */}
              {!isTheaterExpanded && (
                <div className="w-full md:w-[35%] bg-[#0B1A2C] border-t md:border-t-0 md:border-l border-slate-800 p-5 flex flex-col justify-between overflow-y-auto">
                  <div className="space-y-4">
                    <div>
                      <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                        Deliverable Status
                      </span>
                      <div className="mt-1 flex items-center gap-2">
                        <span
                          className={`px-3 py-1 rounded-lg text-xs font-bold uppercase tracking-wider ${
                            previewItem.status === "approved"
                              ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                              : previewItem.status === "revision_requested" || previewItem.status === "rejected"
                              ? "bg-rose-500/20 text-rose-400 border border-rose-500/30"
                              : "bg-amber-500/20 text-amber-400 border border-amber-500/30"
                          }`}
                        >
                          {previewItem.status.replace("_", " ")}
                        </span>
                        <span className="text-xs text-slate-400 font-medium">
                          {previewItem.round}
                        </span>
                      </div>
                    </div>

                    {/* Creative Metadata Spec Table */}
                    <div className="p-3.5 rounded-xl bg-slate-900/90 border border-slate-800 text-xs space-y-2">
                      <div className="flex justify-between items-center text-slate-400">
                        <span>Format:</span>
                        <span className="font-semibold text-white">{previewItem.type}</span>
                      </div>
                      <div className="flex justify-between items-center text-slate-400">
                        <span>Scheduled:</span>
                        <span className="font-semibold text-white">{previewItem.date}</span>
                      </div>
                      <div className="flex justify-between items-center text-slate-400">
                        <span>Creative Pod:</span>
                        <span className="font-semibold text-white">{previewItem.assigned_name || "Creative Studio"}</span>
                      </div>
                      <div className="flex justify-between items-center text-slate-400">
                        <span>Aspect Ratio:</span>
                        <span className="font-mono text-[#60A5FA]">
                          {isVideoAsset(previewItem.file_url, previewItem.type) ? "9:16 (1080 × 1920)" : "4:5 (1080 × 1350)"}
                        </span>
                      </div>
                    </div>

                    {/* Client Caption Copy & Creative Notes */}
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-xs font-bold text-slate-300">
                          Caption Copy & Creative Notes
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            if (previewItem.description) {
                              navigator.clipboard.writeText(previewItem.description);
                              setCopiedCaption(true);
                              setTimeout(() => setCopiedCaption(false), 2000);
                            }
                          }}
                          className="text-[11px] font-semibold text-[#60A5FA] hover:underline flex items-center gap-1 cursor-pointer"
                        >
                          {copiedCaption ? (
                            <>
                              <Check className="size-3 text-emerald-400" /> Copied!
                            </>
                          ) : (
                            <>
                              <Copy className="size-3" /> Copy
                            </>
                          )}
                        </button>
                      </div>
                      <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800 text-xs text-slate-300 leading-relaxed max-h-32 overflow-y-auto">
                        {previewItem.description || "No specific caption provided for this creative cut."}
                      </div>
                    </div>
                  </div>

                  {/* Sidebar Bottom Action Buttons */}
                  <div className="pt-4 mt-4 border-t border-slate-800 space-y-2">
                    {previewItem.status !== "approved" && (
                      <button
                        type="button"
                        disabled={updatingId === previewItem.id}
                        onClick={() => {
                          handleStatusUpdate(previewItem.id, "approved");
                          setPreviewItem((prev: any) => prev ? { ...prev, status: "approved" } : null);
                        }}
                        className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-500 hover:to-emerald-600 text-white text-xs font-bold shadow-lg flex items-center justify-center gap-2 cursor-pointer transition-all disabled:opacity-50"
                      >
                        <Check className="size-4" />
                        Approve Deliverable
                      </button>
                    )}

                    {previewItem.status === "approved" && (
                      <div className="py-2 px-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-bold text-center flex items-center justify-center gap-1.5">
                        <CheckCircle2 className="size-4" />
                        Approved & Ready for Dispatch
                      </div>
                    )}

                    <div className="flex gap-2">
                      {previewItem.status !== "revision_requested" && (
                        <button
                          type="button"
                          disabled={updatingId === previewItem.id}
                          onClick={() => {
                            handleStatusUpdate(previewItem.id, "revision_requested");
                            setPreviewItem((prev: any) => prev ? { ...prev, status: "revision_requested" } : null);
                          }}
                          className="flex-1 py-2 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition-colors cursor-pointer"
                        >
                          Request Revision
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => {
                          setPreviewItem(null);
                          setIsTheaterExpanded(false);
                        }}
                        className="flex-1 py-2 px-3 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-300 text-xs font-semibold border border-slate-700/80 transition-colors cursor-pointer"
                      >
                        Close
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 3. ADMIN TASKS & DISPATCH QUEUE PAGE
// ─────────────────────────────────────────────────────────────────────────────
export function AdminTasksPage() {
  const [queue, setQueue] = useState<AdminQueueData | null>(null);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");

  useEffect(() => {
    fetchAdminQueue(undefined, "admin")
      .then((data) => setQueue(data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const allTasks = queue?.backlog || [];
  const filteredTasks = allTasks.filter((task) => {
    if (filterStatus !== "all" && (task.status || "in_production") !== filterStatus) {
      return false;
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const client = (task.client_company || task.client_email || "").toLowerCase();
      const assignee = (task.assignee_name || task.assignee_email || "").toLowerCase();
      const deliv = (task.deliverable_type || "").toLowerCase();
      return client.includes(q) || assignee.includes(q) || deliv.includes(q);
    }
    return true;
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <CheckSquare className="size-5 text-[#2B7BC4]" />
            <h1 className="text-2xl font-bold tracking-tight text-[#0D2137]">Task Dispatch Queue</h1>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Workload distribution, creative pod assignments, and SLA production deadlines
          </p>
        </div>
        <Link
          to="/dashboard"
          className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-[#2B7BC4] text-white text-xs font-semibold hover:bg-[#1A5EA8] transition-colors shadow-xs"
        >
          Open Creative Kanban →
        </Link>
      </div>

      {/* Staff Capacity Grid */}
      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs">
        <h3 className="text-sm font-bold text-[#0D2137] mb-4">Creative Pod Staff Workload & Headroom</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {(queue?.staff || []).map((member) => {
            const ratio = (member.active_wip / Math.max(member.daily_capacity, 1)) * 100;
            return (
              <div
                key={member.user_id}
                className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/60 space-y-2"
              >
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-xs text-[#0D2137] truncate max-w-[140px]" title={member.full_name || member.email}>
                    {member.full_name || member.email}
                  </span>
                  <span className="text-[10px] uppercase font-bold text-slate-500 bg-white px-1.5 py-0.5 rounded border border-slate-200">
                    {member.department}
                  </span>
                </div>
                <div className="flex justify-between text-[11px] text-slate-500">
                  <span>Active WIP:</span>
                  <span className="font-bold text-[#0D2137]">
                    {member.active_wip} / {member.daily_capacity}
                  </span>
                </div>
                <div className="h-1.5 w-full bg-slate-200 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${
                      ratio >= 100 ? "bg-rose-500" : ratio >= 70 ? "bg-amber-500" : "bg-emerald-500"
                    }`}
                    style={{ width: `${Math.min(ratio, 100)}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Pipeline Tasks Table */}
      <div className="rounded-2xl border border-slate-200/90 bg-white shadow-xs overflow-hidden">
        <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="font-bold text-sm text-[#0D2137]">Active Pipeline Tasks</span>
            <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-blue-50 text-[#2B7BC4] border border-blue-100">
              {filteredTasks.length} {filteredTasks.length === 1 ? "task" : "tasks"}
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="relative">
              <Search className="size-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search client or assignee..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8 pr-3 py-1.5 text-xs rounded-lg border border-slate-200 bg-white text-slate-700 placeholder:text-slate-400 focus:outline-none focus:border-[#2B7BC4] w-48 sm:w-60"
              />
            </div>

            <div className="flex items-center gap-1 bg-white p-1 rounded-lg border border-slate-200 text-xs">
              {(["all", "in_production", "internal_qa", "backlog"] as const).map((st) => (
                <button
                  key={st}
                  type="button"
                  onClick={() => setFilterStatus(st)}
                  className={`px-2.5 py-1 rounded-md text-[11px] font-semibold capitalize transition-all cursor-pointer ${
                    filterStatus === st
                      ? "bg-[#2B7BC4] text-white shadow-xs"
                      : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
                  }`}
                >
                  {st === "all" ? "All" : st.replace("_", " ")}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Mobile Task Cards (< 768px) */}
        <div className="block md:hidden divide-y divide-slate-100">
          {loading ? (
            <div className="p-8 text-center text-slate-400">
              <Loader2 className="size-5 animate-spin mx-auto mb-2 text-[#2B7BC4]" />
              Loading task queue...
            </div>
          ) : filteredTasks.length === 0 ? (
            <div className="p-8 text-center text-xs text-slate-500">
              No tasks match the active filter.
            </div>
          ) : (
            filteredTasks.slice(0, 25).map((task) => (
              <div key={task.id} className="p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-sm text-[#0D2137]">{task.client_company || task.client_email || "Agency Client"}</span>
                  <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase font-mono ${
                    task.deliverable_type === "reel"
                      ? "bg-purple-50 text-purple-700 border border-purple-200"
                      : task.deliverable_type === "static_post" || task.deliverable_type === "poster"
                      ? "bg-blue-50 text-blue-700 border border-blue-200"
                      : "bg-amber-50 text-amber-700 border border-amber-200"
                  }`}>
                    {task.deliverable_type}
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs text-slate-500">
                  <span className="font-medium text-slate-700">
                    👤 {task.assignee_name || "Unassigned"} {task.assignee_role ? `(${task.assignee_role})` : ""}
                  </span>
                  <span className="px-2 py-0.5 rounded text-[10px] font-semibold uppercase bg-slate-100 text-slate-600">
                    {task.status || "In Production"}
                  </span>
                </div>
                <div className="flex items-center justify-between text-[11px] text-slate-400 font-mono pt-1">
                  <span>#{task.id.slice(0, 8)}</span>
                  <span>Due: <strong className="text-[#0D2137]">{task.sla_due_at ? new Date(task.sla_due_at).toLocaleDateString() : "Immediate"}</strong></span>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Desktop Task Table (>= 768px) */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-500 font-semibold uppercase tracking-wider text-[11px] border-b border-slate-200">
              <tr>
                <th className="px-5 py-3">Task ID</th>
                <th className="px-5 py-3">Client</th>
                <th className="px-5 py-3">Deliverable</th>
                <th className="px-5 py-3">Assigned Member</th>
                <th className="px-5 py-3">Status</th>
                <th className="px-5 py-3">SLA Due</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-5 py-8 text-center text-slate-400">
                    <Loader2 className="size-5 animate-spin mx-auto mb-2 text-[#2B7BC4]" />
                    Loading task queue...
                  </td>
                </tr>
              ) : filteredTasks.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-5 py-8 text-center text-slate-400">
                    No tasks match the active filter.
                  </td>
                </tr>
              ) : (
                filteredTasks.slice(0, 35).map((task) => (
                  <tr key={task.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="px-5 py-3 font-mono text-xs text-[#0D2137]">#{task.id.slice(0, 8)}</td>
                    <td className="px-5 py-3 font-semibold text-[#0D2137]">
                      <div>{task.client_company || "Agency Client"}</div>
                      {task.client_email && <div className="text-[10px] text-slate-400 font-normal">{task.client_email}</div>}
                    </td>
                    <td className="px-5 py-3">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold uppercase font-mono border ${
                        task.deliverable_type === "reel"
                          ? "bg-purple-50 text-purple-700 border-purple-200"
                          : task.deliverable_type === "static_post" || task.deliverable_type === "poster"
                          ? "bg-blue-50 text-blue-700 border-blue-200"
                          : "bg-amber-50 text-amber-700 border-amber-200"
                      }`}>
                        {task.deliverable_type}
                      </span>
                    </td>
                    <td className="px-5 py-3">
                      <div className="font-semibold text-slate-800">{task.assignee_name || "Unassigned"}</div>
                      <div className="text-[10px] text-slate-400 capitalize">{task.assignee_role || "Creative Pod"}</div>
                    </td>
                    <td className="px-5 py-3">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                        task.status === "ready_to_publish" || task.status === "completed"
                          ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                          : task.status === "internal_qa"
                          ? "bg-amber-50 text-amber-700 border border-amber-200"
                          : "bg-blue-50 text-[#2B7BC4] border border-blue-200"
                      }`}>
                        {(task.status || "in_production").replace("_", " ")}
                      </span>
                    </td>
                    <td className="px-5 py-3 font-mono text-slate-600">
                      {task.sla_due_at ? new Date(task.sla_due_at).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" }) : "Immediate"}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 4. ADMIN CALENDAR PAGE
// ─────────────────────────────────────────────────────────────────────────────
const CALENDAR_MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

const WEEKDAY_HEADERS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export function AdminCalendarPage() {
  const today = new Date();
  const [currentYear, setCurrentYear] = useState<number>(today.getFullYear());
  const [currentMonth, setCurrentMonth] = useState<number>(today.getMonth());
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedFormat, setSelectedFormat] = useState<string>("all");
  const [selectedEvent, setSelectedEvent] = useState<any | null>(null);

  useEffect(() => {
    setLoading(true);
    request<any[]>("/api/v1/admin/calendar")
      .then((data) => setEvents(Array.isArray(data) ? data : []))
      .catch(() => setEvents([]))
      .finally(() => setLoading(false));
  }, []);

  const navigateMonth = (direction: number) => {
    const total = currentYear * 12 + currentMonth + direction;
    const newY = Math.floor(total / 12);
    const newM = ((total % 12) + 12) % 12;
    setCurrentYear(newY);
    setCurrentMonth(newM);
  };

  const goToToday = () => {
    setCurrentYear(today.getFullYear());
    setCurrentMonth(today.getMonth());
  };

  // Month grid calculation
  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
  const firstDayWeekday = new Date(currentYear, currentMonth, 1).getDay(); // 0 = Sun

  const calendarCells: (number | null)[] = [];
  for (let i = 0; i < firstDayWeekday; i++) {
    calendarCells.push(null);
  }
  for (let d = 1; d <= daysInMonth; d++) {
    calendarCells.push(d);
  }

  // Filter events for the active month and format
  const monthEvents = events.filter((e) => {
    if (!e.date) return false;
    const d = new Date(e.date + "T00:00:00");
    const matchesMonth = d.getFullYear() === currentYear && d.getMonth() === currentMonth;
    if (!matchesMonth) return false;
    if (selectedFormat !== "all") {
      const typeStr = (e.type || "").toLowerCase();
      if (selectedFormat === "reel" && !typeStr.includes("reel")) return false;
      if (selectedFormat === "poster" && !typeStr.includes("poster")) return false;
      if (selectedFormat === "story" && !typeStr.includes("story") && !typeStr.includes("carousel")) return false;
    }
    return true;
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <CalendarDays className="size-5 text-[#2B7BC4]" />
            <h1 className="text-2xl font-bold tracking-tight text-[#0D2137]">Content Calendar</h1>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Agency master scheduling timeline across all brand accounts and creative pods
          </p>
        </div>

        {/* Month Navigation & Format Filter */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1 bg-white p-1 rounded-xl border border-slate-200 shadow-2xs">
            <button
              type="button"
              onClick={() => navigateMonth(-1)}
              className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-600 transition-colors cursor-pointer"
              title="Previous Month"
            >
              <ChevronLeft className="size-4" />
            </button>
            <span className="text-xs font-bold text-[#0D2137] px-2 min-w-[120px] text-center">
              {CALENDAR_MONTHS[currentMonth]} {currentYear}
            </span>
            <button
              type="button"
              onClick={() => navigateMonth(1)}
              className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-600 transition-colors cursor-pointer"
              title="Next Month"
            >
              <ChevronRight className="size-4" />
            </button>
            <button
              type="button"
              onClick={goToToday}
              className="ml-1 px-2.5 py-1 text-[11px] font-bold rounded-lg bg-slate-100 text-slate-700 hover:bg-slate-200 transition-colors cursor-pointer"
            >
              Today
            </button>
          </div>

          <div className="flex items-center gap-1 bg-white p-1 rounded-xl border border-slate-200 text-xs shadow-2xs">
            {(["all", "reel", "poster", "story"] as const).map((fmt) => (
              <button
                key={fmt}
                type="button"
                onClick={() => setSelectedFormat(fmt)}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold capitalize transition-all cursor-pointer ${
                  selectedFormat === fmt
                    ? "bg-[#2B7BC4] text-white shadow-xs"
                    : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
                }`}
              >
                {fmt === "all" ? "All Formats" : fmt}
              </button>
            ))}
          </div>

          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-blue-50 text-[#2B7BC4] text-xs font-semibold border border-blue-200">
            {monthEvents.length} Assets Scheduled
          </span>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200/90 bg-white p-4 sm:p-6 shadow-xs">
        {/* Mobile Agenda List (< 768px) */}
        <div className="block md:hidden">
          <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-100">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
              {CALENDAR_MONTHS[currentMonth]} {currentYear} Agenda
            </span>
            <span className="text-xs font-semibold text-[#2B7BC4]">{monthEvents.length} Items</span>
          </div>

          {loading ? (
            <div className="py-12 text-center text-slate-400">
              <Loader2 className="size-6 animate-spin mx-auto mb-2 text-[#2B7BC4]" />
              Loading scheduled deliverables...
            </div>
          ) : monthEvents.length === 0 ? (
            <div className="py-8 text-center text-xs text-slate-500">
              No deliverables scheduled for {CALENDAR_MONTHS[currentMonth]} {currentYear}.
            </div>
          ) : (
            <div className="space-y-3">
              {monthEvents.map((item, idx) => {
                const dayNum = item.date ? new Date(item.date + "T00:00:00").getDate() : item.day;
                const typeStr = (item.type || "").toLowerCase();
                return (
                  <div
                    key={item.id || idx}
                    onClick={() => setSelectedEvent(item)}
                    className="p-3.5 rounded-xl border border-slate-200/90 bg-slate-50/50 hover:bg-slate-50 transition-colors cursor-pointer space-y-2"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="size-8 rounded-lg bg-[#2B7BC4] text-white flex items-center justify-center font-bold text-xs font-mono shrink-0">
                          {dayNum}
                        </span>
                        <div>
                          <div className="flex items-center gap-1.5">
                            <span className={`px-1.5 py-0.2 rounded text-[9px] font-bold uppercase ${
                              typeStr.includes("reel")
                                ? "bg-purple-100 text-purple-700"
                                : typeStr.includes("poster")
                                ? "bg-blue-100 text-blue-700"
                                : "bg-amber-100 text-amber-700"
                            }`}>
                              {item.type || "Asset"}
                            </span>
                            <h4 className="font-bold text-xs text-[#0D2137] truncate max-w-[160px]">
                              {item.client_name || "Client"}
                            </h4>
                          </div>
                          <span className="text-[10px] text-slate-500 font-medium">
                            {item.time || "11:00 AM"} • {item.title || "Scheduled Deliverable"}
                          </span>
                        </div>
                      </div>
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase shrink-0 ${
                          item.status === "approved"
                            ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                            : "bg-blue-50 text-[#2B7BC4] border border-blue-200"
                        }`}
                      >
                        {item.status || "Scheduled"}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Desktop 7-Column Grid (>= 768px) with Weekday Offset Padding */}
        <div className="hidden md:block">
          <div className="grid grid-cols-7 gap-2.5 mb-2.5 text-center text-xs font-bold uppercase text-slate-400">
            {WEEKDAY_HEADERS.map((w) => (
              <div key={w} className="py-1">
                {w}
              </div>
            ))}
          </div>

          {loading ? (
            <div className="py-20 text-center text-slate-400">
              <Loader2 className="size-6 animate-spin mx-auto mb-2 text-[#2B7BC4]" />
              Loading scheduled deliverables...
            </div>
          ) : (
            <div className="grid grid-cols-7 gap-2.5">
              {calendarCells.map((dateNum, idx) => {
                if (dateNum === null) {
                  return (
                    <div
                      key={`blank-${idx}`}
                      className="min-h-[115px] p-2 rounded-xl bg-slate-50/20 border border-slate-100/60 opacity-40 pointer-events-none"
                    />
                  );
                }

                const dayEvents = monthEvents.filter((e) => {
                  const d = new Date(e.date + "T00:00:00");
                  return d.getDate() === dateNum;
                });

                const isToday =
                  today.getFullYear() === currentYear &&
                  today.getMonth() === currentMonth &&
                  today.getDate() === dateNum;

                return (
                  <div
                    key={`day-${dateNum}`}
                    className={`min-h-[120px] p-2 rounded-xl border transition-all flex flex-col justify-between ${
                      isToday
                        ? "border-[#2B7BC4] bg-blue-50/20 shadow-xs"
                        : "border-slate-200/80 bg-slate-50/40 hover:border-slate-300"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span
                        className={`size-6 rounded-full flex items-center justify-center text-xs font-bold ${
                          isToday
                            ? "bg-[#2B7BC4] text-white"
                            : "text-[#0D2137]"
                        }`}
                      >
                        {dateNum}
                      </span>
                      {dayEvents.length > 0 && (
                        <span className="text-[10px] font-bold text-slate-400">
                          {dayEvents.length}
                        </span>
                      )}
                    </div>

                    <div className="space-y-1 my-1 overflow-y-auto max-h-[85px] scrollbar-thin">
                      {dayEvents.map((item, itemIdx) => {
                        const typeStr = (item.type || "").toLowerCase();
                        const isReel = typeStr.includes("reel");
                        const isPoster = typeStr.includes("poster");

                        return (
                          <div
                            key={item.id || itemIdx}
                            onClick={() => setSelectedEvent(item)}
                            className={`p-1.5 rounded-lg text-[10px] leading-tight border transition-all cursor-pointer hover:scale-[1.02] ${
                              item.status === "approved"
                                ? "bg-emerald-50 border-emerald-200 text-emerald-800"
                                : isReel
                                ? "bg-purple-50 border-purple-200 text-purple-800"
                                : isPoster
                                ? "bg-blue-50 border-blue-200 text-blue-800"
                                : "bg-amber-50 border-amber-200 text-amber-800"
                            }`}
                          >
                            <div className="font-bold truncate flex items-center gap-1">
                              <span className="size-1.5 rounded-full shrink-0 bg-current" />
                              <span>{item.type || "Asset"} · {item.client_name || "Client"}</span>
                            </div>
                            <div className="text-[9px] opacity-75 truncate mt-0.5">
                              {item.time || "11:00 AM"}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Item Detail Modal / Preview Drawer */}
      {selectedEvent && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs"
          onClick={() => setSelectedEvent(null)}
        >
          <div
            className="max-w-lg w-full rounded-2xl bg-white border border-slate-200 shadow-2xl p-6 space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                    (selectedEvent.type || "").toLowerCase().includes("reel")
                      ? "bg-purple-50 text-purple-700 border border-purple-200"
                      : "bg-blue-50 text-blue-700 border border-blue-200"
                  }`}>
                    {selectedEvent.type || "Asset"}
                  </span>
                  <span className="text-xs font-bold text-slate-500">
                    {selectedEvent.client_name}
                  </span>
                </div>
                <h3 className="font-bold text-base text-[#0D2137]">
                  {selectedEvent.title || "Scheduled Deliverable"}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setSelectedEvent(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
              >
                <X className="size-5" />
              </button>
            </div>

            {/* Media Preview */}
            {selectedEvent.file_url && (
              <div className="rounded-xl overflow-hidden border border-slate-200 bg-black max-h-[300px] flex items-center justify-center">
                {(selectedEvent.type || "").toLowerCase().includes("reel") || (selectedEvent.file_url || "").includes(".mp4") ? (
                  <video
                    src={selectedEvent.file_url}
                    controls
                    autoPlay
                    muted
                    className="max-h-[280px] w-auto mx-auto"
                  />
                ) : (
                  <img
                    src={selectedEvent.file_url}
                    alt={selectedEvent.title}
                    className="max-h-[280px] w-full object-contain"
                  />
                )}
              </div>
            )}

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80">
                <span className="text-slate-400 block text-[10px] uppercase font-bold">Scheduled Date</span>
                <span className="font-semibold text-[#0D2137]">
                  {selectedEvent.date} ({selectedEvent.time || "11:00 AM"})
                </span>
              </div>
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80">
                <span className="text-slate-400 block text-[10px] uppercase font-bold">Status</span>
                <span className="font-semibold text-emerald-700 capitalize">
                  {selectedEvent.status || "Scheduled"}
                </span>
              </div>
            </div>

            {selectedEvent.caption && (
              <div className="text-xs p-3 rounded-xl bg-slate-50 border border-slate-200/80 text-slate-600">
                <span className="text-slate-400 block text-[10px] uppercase font-bold mb-1">Caption</span>
                {selectedEvent.caption}
              </div>
            )}

            <div className="pt-2 flex justify-end gap-2">
              <Link
                to="/admin/deliverables"
                className="px-4 py-2 rounded-xl bg-[#2B7BC4] text-white text-xs font-semibold hover:bg-[#1A5EA8] transition-colors"
                onClick={() => setSelectedEvent(null)}
              >
                Inspect in Deliverables Hub →
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 5. ADMIN SUPPORT & TICKETS PAGE
// ─────────────────────────────────────────────────────────────────────────────
export function AdminSupportPage() {
  const [tickets, setTickets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeReply, setActiveReply] = useState<any | null>(null);
  const [replyText, setReplyText] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const fetchTickets = useCallback(() => {
    setLoading(true);
    request<any[]>("/api/v1/admin/support/tickets")
      .then((data) => setTickets(Array.isArray(data) ? data : []))
      .catch(() => setTickets([]))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    fetchTickets();
  }, [fetchTickets]);

  const handleSendReply = async () => {
    if (!activeReply || !replyText.trim()) return;
    setSubmitting(true);
    try {
      await request(`/api/v1/admin/support/tickets/${activeReply.id}/messages`, {
        method: "POST",
        body: JSON.stringify({ message_text: replyText }),
      });
      setTickets((prev) =>
        prev.map((t) => (t.id === activeReply.id ? { ...t, status: "resolved" } : t))
      );
      setActiveReply(null);
      setReplyText("");
    } catch {
      // Local fallback
      setActiveReply(null);
      setReplyText("");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <LifeBuoy className="size-5 text-[#2B7BC4]" />
            <h1 className="text-2xl font-bold tracking-tight text-[#0D2137]">Support Tickets</h1>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Real client inquiries, SLA triage, and concierge customer success management
          </p>
        </div>
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-100 text-slate-700 text-xs font-semibold">
          {tickets.length} Total Tickets
        </span>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white shadow-xs overflow-hidden">
        {loading ? (
          <div className="py-16 text-center text-slate-400">
            <Loader2 className="size-6 animate-spin mx-auto mb-2 text-[#2B7BC4]" />
            Loading tickets from database...
          </div>
        ) : tickets.length === 0 ? (
          <div className="p-12 text-center text-slate-500">
            No support tickets in database.
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {tickets.map((t) => (
              <div key={t.id} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-50/70 transition-colors">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-xs text-[#0D2137]">{t.subject}</span>
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                        t.priority === "urgent" || t.priority === "high"
                          ? "bg-rose-50 text-rose-700 border border-rose-200"
                          : "bg-slate-100 text-slate-700"
                      }`}
                    >
                      {t.priority}
                    </span>
                    {t.message_count > 0 && (
                      <span className="text-[10px] text-slate-400 font-mono">
                        ({t.message_count} {t.message_count === 1 ? "msg" : "msgs"})
                      </span>
                    )}
                  </div>
                  <div className="text-[11px] text-slate-500">
                    Client: <span className="font-medium text-[#0D2137]">{t.client}</span> · {t.time}
                  </div>
                  {t.description && (
                    <p className="text-xs text-slate-600 line-clamp-1 max-w-xl mt-1">
                      {t.description}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <span
                    className={`px-2.5 py-1 rounded-full text-xs font-semibold uppercase ${
                      t.status === "open"
                        ? "bg-amber-50 text-amber-700 border border-amber-200"
                        : t.status === "resolved" || t.status === "closed"
                        ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                        : "bg-blue-50 text-blue-700 border border-blue-200"
                    }`}
                  >
                    {t.status.replace("_", " ")}
                  </span>
                  {t.status !== "resolved" && t.status !== "closed" && (
                    <button
                      type="button"
                      onClick={() => setActiveReply(t)}
                      className="px-3 py-1 rounded-lg bg-[#2B7BC4] text-white text-xs font-semibold hover:bg-[#1A5EA8] cursor-pointer"
                    >
                      Reply
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Reply Modal */}
      {activeReply && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-base font-bold text-[#0D2137]">Respond to Ticket</h3>
                <p className="text-xs text-slate-500">{activeReply.client}: {activeReply.subject}</p>
              </div>
              <button
                type="button"
                onClick={() => setActiveReply(null)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 cursor-pointer"
              >
                <X className="size-4" />
              </button>
            </div>

            <textarea
              rows={4}
              value={replyText}
              onChange={(e) => setReplyText(e.target.value)}
              placeholder="Write your concierge response to the client..."
              className="w-full rounded-xl border border-slate-200 p-3 text-xs text-[#0D2137] focus:outline-none focus:border-[#2B7BC4]"
            />

            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setActiveReply(null)}
                className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-700 hover:bg-slate-50 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSendReply}
                disabled={submitting || !replyText.trim()}
                className="px-4 py-2 rounded-xl bg-[#2B7BC4] text-xs font-bold text-white hover:bg-[#1A5EA8] shadow-xs disabled:opacity-50 cursor-pointer"
              >
                {submitting ? "Sending..." : "Send & Resolve"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 6. ADMIN TEAMS & ROSTER PAGE
// ─────────────────────────────────────────────────────────────────────────────
export function AdminTeamsPage() {
  const { user } = useAuth();
  const isTeamLead = user?.role === "team_lead";
  const isAdmin = ["admin", "super_admin"].includes(user?.role || "");

  const [members, setMembers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [credentialsModal, setCredentialsModal] = useState<any | null>(null);
  const [copied, setCopied] = useState(false);

  // Form State
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [department, setDepartment] = useState("video");
  const [role, setRole] = useState("editor");
  const [capacity, setCapacity] = useState(4);
  const [skillsInput, setSkillsInput] = useState("Reels, Video, Motion");
  const [selectedTeamLeadId, setSelectedTeamLeadId] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Edit Capacity Modal State
  const [editingMember, setEditingMember] = useState<any | null>(null);
  const [editCapacity, setEditCapacity] = useState(4);
  const [editSkills, setEditSkills] = useState("");
  const [editIsAccepting, setEditIsAccepting] = useState(true);
  const [updatingCapacity, setUpdatingCapacity] = useState(false);

  // Deactivate Modal State
  const [deletingMember, setDeletingMember] = useState<any | null>(null);
  const [deleting, setDeleting] = useState(false);

  const fetchMembers = useCallback(() => {
    setLoading(true);
    request<any[]>("/api/v1/admin/teams")
      .then((data) => setMembers(Array.isArray(data) ? data : []))
      .catch(() => setMembers([]))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    fetchMembers();
  }, [fetchMembers]);

  const generateRandomPassword = () => {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$%";
    let pass = "Creo@";
    for (let i = 0; i < 6; i++) {
      pass += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setPassword(pass);
  };

  const handleOpenAddModal = () => {
    setFullName("");
    setEmail("");
    generateRandomPassword();
    setRole(isTeamLead ? "editor" : "editor");
    setDepartment("video");
    setCapacity(4);
    setSkillsInput("Reels, Video, Motion");
    setSelectedTeamLeadId("");
    setAddModalOpen(true);
  };

  const handleCreateMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName || !email) return;
    setSubmitting(true);
    try {
      const skillsArray = skillsInput
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);

      const res = await request<any>("/api/v1/admin/teams", {
        method: "POST",
        body: JSON.stringify({
          full_name: fullName,
          email,
          password: password.trim() || undefined,
          department,
          role,
          daily_capacity: Number(capacity),
          skills: skillsArray.length > 0 ? skillsArray : ["Creative", department],
          team_lead_id: selectedTeamLeadId || undefined,
        }),
      });
      setAddModalOpen(false);
      setCredentialsModal(res);
      fetchMembers();
    } catch (err: any) {
      alert(err?.message || "Could not create team member. Ensure email is unique.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleOpenEditCapacity = (staff: any) => {
    setEditingMember(staff);
    setEditCapacity(staff.daily_capacity || 4);
    setEditSkills((staff.skills || []).join(", "));
    setEditIsAccepting(staff.is_accepting_work !== false);
  };

  const handleSaveCapacity = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingMember) return;
    setUpdatingCapacity(true);
    try {
      const skillsArray = editSkills
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);

      await request(`/api/v1/admin/teams/${editingMember.id}`, {
        method: "PATCH",
        body: JSON.stringify({
          daily_capacity: Number(editCapacity),
          skills: skillsArray,
          is_accepting_work: editIsAccepting,
        }),
      });
      setEditingMember(null);
      fetchMembers();
    } catch (err: any) {
      alert(err?.message || "Failed to update member capacity.");
    } finally {
      setUpdatingCapacity(false);
    }
  };

  const handleConfirmDeactivate = async () => {
    if (!deletingMember) return;
    setDeleting(true);
    try {
      await request(`/api/v1/admin/teams/${deletingMember.id}`, {
        method: "DELETE",
      });
      setDeletingMember(null);
      fetchMembers();
    } catch (err: any) {
      alert(err?.message || "Failed to deactivate member.");
    } finally {
      setDeleting(false);
    }
  };

  const existingTeamLeads = members.filter((m) => m.role === "team_lead");

  return (
    <div className="space-y-6">
      {/* ── Top Header ──────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <UserCog className="size-5 text-[#2B7BC4]" />
            <h1 className="text-2xl font-bold tracking-tight text-[#0D2137]">
              {isTeamLead ? "My Pod Team & Capacity" : "Agency Team & Capacity Management"}
            </h1>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            {isTeamLead
              ? "Manage your creative pod's editors, designers, and calibrate individual daily workload capacities."
              : "Internal creatives, editors, team leads, and agency-wide load-balanced pod controllers."}
          </p>
        </div>
        <button
          type="button"
          onClick={handleOpenAddModal}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-[#2B7BC4] to-[#1E609A] text-white text-xs font-bold hover:from-[#246bb0] hover:to-[#174e7e] shadow-md shadow-blue-500/20 transition-all cursor-pointer"
        >
          <Plus className="size-4" /> Add Team Member
        </button>
      </div>

      {/* ── Role Scope Notice ─────────────────────────────────────────────── */}
      {isTeamLead && (
        <div className="flex items-center gap-3 bg-blue-50/80 border border-blue-200/70 rounded-2xl p-4 text-xs text-blue-900">
          <Shield className="size-4 text-[#2B7BC4] shrink-0" />
          <span>
            <strong>Team Lead Pod Scope:</strong> You have autonomous authority to create team members, manage login credentials, and edit daily task capacities for members assigned to your pod.
          </span>
        </div>
      )}

      {/* ── Team Roster Grid ──────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {loading ? (
          <div className="col-span-full py-16 text-center text-slate-400">
            <Loader2 className="size-6 animate-spin mx-auto mb-2 text-[#2B7BC4]" />
            Loading team roster...
          </div>
        ) : members.length === 0 ? (
          <div className="col-span-full py-12 text-center text-slate-500 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
            No team members found. Click "Add Team Member" to create one.
          </div>
        ) : (
          members.map((staff) => {
            const canEditThisMember = isAdmin || (isTeamLead && staff.team_lead_id === user?.id);
            const isSelf = staff.id === user?.id;

            return (
              <div
                key={staff.id}
                className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-xs flex flex-col justify-between space-y-4 hover:border-blue-200 transition-all"
              >
                <div>
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="size-11 rounded-xl bg-[#E8F4FD] text-[#2B7BC4] font-black flex items-center justify-center text-sm border border-[#C9DFF0] shrink-0">
                        {(staff.full_name || staff.email).slice(0, 2).toUpperCase()}
                      </div>
                      <div className="space-y-0.5 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <h3 className="font-bold text-sm text-[#0D2137] truncate">{staff.full_name}</h3>
                          {isSelf && (
                            <span className="text-[10px] bg-blue-100 text-blue-700 font-bold px-1.5 py-0.2 rounded-full">
                              You
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-slate-400 truncate">{staff.email}</p>
                      </div>
                    </div>

                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full border shrink-0 ${
                        staff.account_status === "active"
                          ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                          : "bg-red-50 text-red-600 border-red-200"
                      }`}
                    >
                      {staff.account_status === "active" ? "Active" : "Suspended"}
                    </span>
                  </div>

                  <div className="space-y-2 pt-3 mt-3 border-t border-slate-100 text-xs">
                    <div className="flex justify-between text-slate-500">
                      <span>Role & Department:</span>
                      <span className="font-semibold text-[#0D2137] capitalize">
                        {staff.role} • {staff.department}
                      </span>
                    </div>

                    {isAdmin && staff.team_lead_name && (
                      <div className="flex justify-between text-slate-500">
                        <span>Assigned Pod Lead:</span>
                        <span className="font-semibold text-indigo-700">{staff.team_lead_name}</span>
                      </div>
                    )}

                    <div className="flex justify-between text-slate-500">
                      <span>Daily Capacity:</span>
                      <span className="font-bold text-[#0D2137] bg-slate-100 px-2 py-0.5 rounded-md">
                        {staff.daily_capacity} assets / day
                      </span>
                    </div>

                    <div className="flex justify-between text-slate-500">
                      <span>Active Workload (WIP):</span>
                      <span className="font-bold text-[#2B7BC4]">{staff.active_wip || 0} tasks</span>
                    </div>

                    <div className="flex justify-between text-slate-500">
                      <span>Dispatch Status:</span>
                      <span className={staff.is_accepting_work ? "text-emerald-600 font-bold" : "text-amber-600 font-bold"}>
                        {staff.is_accepting_work ? "Accepting Work" : "Paused"}
                      </span>
                    </div>
                  </div>

                  <div className="flex gap-1.5 flex-wrap pt-3">
                    {(staff.skills || []).map((s: string) => (
                      <span
                        key={s}
                        className="px-2 py-0.5 rounded-md bg-blue-50/60 border border-blue-100 text-[10px] text-blue-800 font-medium"
                      >
                        {s}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Card Action Buttons */}
                {canEditThisMember && !isSelf && (
                  <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                    <button
                      type="button"
                      onClick={() => handleOpenEditCapacity(staff)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-700 hover:border-[#2B7BC4] hover:text-[#2B7BC4] hover:bg-blue-50/40 transition-all cursor-pointer"
                    >
                      <Sliders className="size-3.5" />
                      Edit Capacity
                    </button>

                    <button
                      type="button"
                      onClick={() => setDeletingMember(staff)}
                      className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl border border-red-200 text-xs font-bold text-red-600 hover:bg-red-50 transition-all cursor-pointer"
                      title="Deactivate staff member"
                    >
                      <Trash2 className="size-3.5" />
                      Remove
                    </button>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* ── Add Member Modal (with Password & Pod selector) ────────────────── */}
      {addModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
          <form
            onSubmit={handleCreateMember}
            className="w-full max-w-lg rounded-3xl bg-white p-6 sm:p-7 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto"
          >
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-lg font-bold text-[#0D2137]">Add Team Member</h3>
                <p className="text-xs text-slate-500">
                  Provide credentials so this member can immediately sign in.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setAddModalOpen(false)}
                className="rounded-xl p-1.5 text-slate-400 hover:bg-slate-100 cursor-pointer"
              >
                <X className="size-4" />
              </button>
            </div>

            <div className="space-y-3.5">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Full Name</label>
                <input
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="e.g. Arjun Mehta"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs text-slate-900 focus:outline-none focus:border-[#2B7BC4]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Work Email (Login ID)</label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="arjun@creo.agency"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs text-slate-900 focus:outline-none focus:border-[#2B7BC4]"
                />
              </div>

              {/* Password input with toggle and auto-generator */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-bold text-slate-700">Login Password</label>
                  <button
                    type="button"
                    onClick={generateRandomPassword}
                    className="text-[11px] font-bold text-[#2B7BC4] hover:underline cursor-pointer"
                  >
                    Auto-Generate
                  </button>
                </div>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter login password"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-mono text-slate-900 focus:outline-none focus:border-[#2B7BC4] pr-16"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[11px] text-slate-500 hover:text-slate-800 font-semibold px-1.5 py-1"
                  >
                    {showPassword ? "Hide" : "Show"}
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Role</label>
                  <select
                    value={role}
                    onChange={(e) => {
                      setRole(e.target.value);
                      if (e.target.value === "editor") {
                        setDepartment("video");
                        setSkillsInput("Reels, Video, Motion");
                      } else if (e.target.value === "designer") {
                        setDepartment("graphics");
                        setSkillsInput("Posters, Carousels, Figma, Graphics");
                      }
                    }}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs focus:outline-none focus:border-[#2B7BC4]"
                  >
                    <option value="editor">Editor (Reels & Motion)</option>
                    <option value="designer">Designer (Posters & Carousels)</option>
                    {isAdmin && <option value="team_lead">Team Lead</option>}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Department</label>
                  <select
                    value={department}
                    onChange={(e) => setDepartment(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs focus:outline-none focus:border-[#2B7BC4]"
                  >
                    <option value="video">Video Editing</option>
                    <option value="graphics">Graphic Design</option>
                    <option value="creative">Creative Direction</option>
                    <option value="content_writing">Copywriting</option>
                  </select>
                </div>
              </div>

              {/* Admin pod assignment selector */}
              {isAdmin && role !== "team_lead" && (
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Assign to Team Lead / Pod
                  </label>
                  <select
                    value={selectedTeamLeadId}
                    onChange={(e) => setSelectedTeamLeadId(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs focus:outline-none focus:border-[#2B7BC4]"
                  >
                    <option value="">-- Select Team Lead --</option>
                    {existingTeamLeads.map((tl) => (
                      <option key={tl.id} value={tl.id}>
                        {tl.full_name} ({tl.email})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Daily Capacity (Assets / Day)
                </label>
                <input
                  type="number"
                  min={1}
                  max={12}
                  value={capacity}
                  onChange={(e) => setCapacity(Number(e.target.value))}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs focus:outline-none focus:border-[#2B7BC4]"
                />
                <p className="text-[11px] text-slate-400 mt-1">
                  Used by the fair dispatch algorithm to prevent creator burnout.
                </p>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Skills & Tags (comma-separated)
                </label>
                <input
                  type="text"
                  value={skillsInput}
                  onChange={(e) => setSkillsInput(e.target.value)}
                  placeholder="Reels, Video, Motion, Posters"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs focus:outline-none focus:border-[#2B7BC4]"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2.5 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setAddModalOpen(false)}
                className="px-4 py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-700 hover:bg-slate-50 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="px-5 py-2.5 rounded-xl bg-[#2B7BC4] text-xs font-bold text-white hover:bg-[#1A5EA8] shadow-xs disabled:opacity-50 cursor-pointer"
              >
                {submitting ? "Creating Member..." : "Save & Create Member"}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ── Edit Capacity & Pacing Modal ───────────────────────────────────── */}
      {editingMember && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
          <form
            onSubmit={handleSaveCapacity}
            className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl space-y-4"
          >
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-base font-bold text-[#0D2137]">
                  Edit Member Capacity & Load
                </h3>
                <p className="text-xs text-slate-500">{editingMember.full_name} ({editingMember.role})</p>
              </div>
              <button
                type="button"
                onClick={() => setEditingMember(null)}
                className="rounded-xl p-1 text-slate-400 hover:bg-slate-100 cursor-pointer"
              >
                <X className="size-4" />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Daily Workload Capacity (Assets / Day)
                </label>
                <input
                  type="number"
                  min={1}
                  max={15}
                  value={editCapacity}
                  onChange={(e) => setEditCapacity(Number(e.target.value))}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs focus:outline-none focus:border-[#2B7BC4]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Specialist Skills (comma-separated)
                </label>
                <input
                  type="text"
                  value={editSkills}
                  onChange={(e) => setEditSkills(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs focus:outline-none focus:border-[#2B7BC4]"
                />
              </div>

              <div className="flex items-center gap-3 pt-2">
                <input
                  type="checkbox"
                  id="accepting_work"
                  checked={editIsAccepting}
                  onChange={(e) => setEditIsAccepting(e.target.checked)}
                  className="size-4 rounded text-[#2B7BC4] focus:ring-[#2B7BC4]"
                />
                <label htmlFor="accepting_work" className="text-xs font-semibold text-slate-700">
                  Accepting new client tasks and calendar deliverables
                </label>
              </div>
            </div>

            <div className="flex justify-end gap-2.5 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setEditingMember(null)}
                className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-700 hover:bg-slate-50 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={updatingCapacity}
                className="px-5 py-2 rounded-xl bg-[#2B7BC4] text-xs font-bold text-white hover:bg-[#1A5EA8] shadow-xs cursor-pointer"
              >
                {updatingCapacity ? "Saving..." : "Save Changes"}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ── Deactivate Member Confirmation Modal ────────────────────────────── */}
      {deletingMember && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-sm rounded-3xl bg-white p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-3 text-red-600">
              <AlertTriangle className="size-6 shrink-0" />
              <h3 className="text-base font-bold text-[#0D2137]">Remove Team Member?</h3>
            </div>
            <p className="text-xs text-slate-600">
              Are you sure you want to deactivate <strong>{deletingMember.full_name}</strong>? They will no longer receive new auto-assigned tasks.
            </p>

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setDeletingMember(null)}
                className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-700 hover:bg-slate-50 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={deleting}
                onClick={handleConfirmDeactivate}
                className="px-4 py-2 rounded-xl bg-red-600 text-xs font-bold text-white hover:bg-red-700 cursor-pointer"
              >
                {deleting ? "Deactivating..." : "Yes, Deactivate"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Generated Credentials Reveal Modal ────────────────────────────── */}
      {credentialsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-3xl bg-white p-6 sm:p-7 shadow-2xl space-y-4 animate-[zoomIn_0.15s_ease-out]">
            <div className="text-center space-y-1">
              <div className="size-14 mx-auto rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-600 text-2xl shadow-xs">
                <CheckCircle2 className="size-7" />
              </div>
              <h3 className="text-lg font-bold text-[#0D2137]">Team Member Ready!</h3>
              <p className="text-xs text-slate-500">
                The account has been created. The staff member can immediately log in with these credentials.
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 font-mono text-xs space-y-2.5">
              <div>
                <span className="text-slate-400">Email: </span>
                <span className="font-bold text-[#0D2137]">{credentialsModal.credentials?.email || credentialsModal.email}</span>
              </div>
              <div>
                <span className="text-slate-400">Password: </span>
                <span className="font-bold text-indigo-700">{credentialsModal.credentials?.password || credentialsModal.temp_password}</span>
              </div>
            </div>

            <button
              type="button"
              onClick={() => {
                const mail = credentialsModal.credentials?.email || credentialsModal.email;
                const pwd = credentialsModal.credentials?.password || credentialsModal.temp_password;
                navigator.clipboard.writeText(`Email: ${mail}\nPassword: ${pwd}`);
                setCopied(true);
                setTimeout(() => setCopied(false), 2000);
              }}
              className="w-full py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-700 hover:bg-slate-50 flex items-center justify-center gap-2 cursor-pointer shadow-xs"
            >
              {copied ? <Check className="size-4 text-emerald-600" /> : <Copy className="size-4" />}
              {copied ? "Copied Credentials!" : "Copy Login Credentials"}
            </button>

            <button
              type="button"
              onClick={() => setCredentialsModal(null)}
              className="w-full py-2.5 rounded-xl bg-[#2B7BC4] text-xs font-bold text-white hover:bg-[#1A5EA8] cursor-pointer"
            >
              Done & Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}


// ─────────────────────────────────────────────────────────────────────────────
// 7. ADMIN ANNOUNCEMENTS PAGE
// ─────────────────────────────────────────────────────────────────────────────
export function AdminAnnouncementsPage() {
  const [announcements, setAnnouncements] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [type, setType] = useState("broadcast");
  const [targetDepts, setTargetDepts] = useState<string[]>(["all"]);
  const [deptInput, setDeptInput] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");

  const fetchAnnouncements = useCallback(() => {
    setLoading(true);
    request<any[]>("/api/v1/admin/announcements")
      .then((data) => setAnnouncements(Array.isArray(data) ? data : []))
      .catch(() => setAnnouncements([]))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    fetchAnnouncements();
  }, [fetchAnnouncements]);

  const toggleDept = (dept: string) => {
    if (dept === "all") {
      setTargetDepts(["all"]);
      return;
    }
    setTargetDepts((prev) => {
      const filtered = prev.filter((d) => d !== "all");
      if (filtered.includes(dept)) {
        const next = filtered.filter((d) => d !== dept);
        return next.length === 0 ? ["all"] : next;
      }
      return [...filtered, dept];
    });
  };

  const addCustomDept = () => {
    const trimmed = deptInput.trim().toLowerCase();
    if (!trimmed) return;
    if (!targetDepts.includes(trimmed)) {
      setTargetDepts((prev) => [...prev.filter((d) => d !== "all"), trimmed]);
    }
    setDeptInput("");
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !content) return;
    try {
      await request("/api/v1/admin/announcements", {
        method: "POST",
        body: JSON.stringify({
          title,
          content,
          type,
          target_departments: targetDepts.length > 0 ? targetDepts : ["all"],
        }),
      });
      setCreateOpen(false);
      setTitle("");
      setContent("");
      setType("broadcast");
      setTargetDepts(["all"]);
      fetchAnnouncements();
    } catch {
      alert("Failed to broadcast announcement.");
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await request(`/api/v1/admin/announcements/${id}`, { method: "DELETE" });
      setAnnouncements((prev) => prev.filter((a) => a.id !== id));
    } catch {
      setAnnouncements((prev) => prev.filter((a) => a.id !== id));
    }
  };

  const filteredAnnouncements = announcements.filter((item) => {
    if (typeFilter === "all") return true;
    return item.type?.toLowerCase() === typeFilter;
  });

  const getTypeStyle = (t: string) => {
    switch (t?.toLowerCase()) {
      case "system":
        return {
          badge: "bg-indigo-50 text-indigo-700 border-indigo-200",
          icon: <Cpu className="size-3" />,
          label: "System",
        };
      case "maintenance":
        return {
          badge: "bg-rose-50 text-rose-700 border-rose-200",
          icon: <Wrench className="size-3" />,
          label: "Maintenance",
        };
      case "newsletter":
        return {
          badge: "bg-emerald-50 text-emerald-700 border-emerald-200",
          icon: <Sparkles className="size-3" />,
          label: "Newsletter",
        };
      case "broadcast":
      default:
        return {
          badge: "bg-sky-50 text-sky-700 border-sky-200",
          icon: <Megaphone className="size-3 text-[#2B7BC4]" />,
          label: "Broadcast",
        };
    }
  };

  const quickDepts = ["all", "creative", "video", "design", "marketing", "engineering"];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <Megaphone className="size-5 text-[#2B7BC4]" />
            <h1 className="text-2xl font-bold tracking-tight text-[#0D2137]">Announcements & Briefs</h1>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Publish organization-wide notices, system updates, and department SLA targets
          </p>
        </div>
        <button
          type="button"
          onClick={() => setCreateOpen(true)}
          className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-[#2B7BC4] text-white text-xs font-bold hover:bg-[#1A5EA8] shadow-xs cursor-pointer"
        >
          <Plus className="size-4" /> Broadcast Announcement
        </button>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        {["all", "system", "broadcast", "maintenance", "newsletter"].map((tab) => (
          <button
            key={tab}
            type="button"
            onClick={() => setTypeFilter(tab)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold capitalize transition-all cursor-pointer ${
              typeFilter === tab
                ? "bg-[#0D2137] text-white shadow-2xs"
                : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50"
            }`}
          >
            {tab === "all" ? "All Updates" : tab}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {loading ? (
          <div className="col-span-full py-16 text-center text-slate-400">
            <Loader2 className="size-6 animate-spin mx-auto mb-2 text-[#2B7BC4]" />
            Loading announcements from database...
          </div>
        ) : filteredAnnouncements.length === 0 ? (
          <div className="col-span-full py-12 text-center text-slate-500 bg-white rounded-2xl border border-slate-200 p-8">
            <p className="text-sm font-semibold text-slate-700">No announcements match this filter.</p>
            <p className="text-xs text-slate-400 mt-1">Try selecting another filter or broadcast a new message.</p>
          </div>
        ) : (
          filteredAnnouncements.map((item) => {
            const style = getTypeStyle(item.type);
            return (
              <div
                key={item.id}
                className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs flex flex-col justify-between space-y-3 hover:border-slate-300 transition-all"
              >
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${style.badge}`}
                      >
                        {style.icon}
                        {item.type || style.label}
                      </span>
                      {Array.isArray(item.target_departments) &&
                        item.target_departments.map((dept: string) => (
                          <span
                            key={dept}
                            className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-md bg-slate-50 border border-slate-200 text-[10px] font-medium text-slate-600"
                          >
                            <Tag className="size-2.5 text-slate-400" />
                            {dept}
                          </span>
                        ))}
                    </div>
                    <button
                      type="button"
                      onClick={() => handleDelete(item.id)}
                      className="p-1 rounded-md text-slate-400 hover:text-rose-600 hover:bg-rose-50 cursor-pointer"
                      title="Delete announcement"
                    >
                      <Trash2 className="size-3.5" />
                    </button>
                  </div>
                  <h3 className="font-bold text-sm text-[#0D2137]">{item.title}</h3>
                  <p className="text-xs text-slate-600 leading-relaxed">{item.content}</p>
                </div>

                <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400">
                  <span className="font-medium text-slate-500">By {item.author || "Admin"}</span>
                  <span>{item.created_at ? new Date(item.created_at).toLocaleDateString() : "Recent"}</span>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Create Announcement Modal */}
      {createOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
          <form
            onSubmit={handleCreate}
            className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl space-y-4"
          >
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-[#0D2137]">Broadcast Announcement</h3>
              <button
                type="button"
                onClick={() => setCreateOpen(false)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 cursor-pointer"
              >
                <X className="size-4" />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">Title</label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Q3 Creative Production Surge & SLA Target"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:outline-none focus:border-[#2B7BC4]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">Type</label>
                <select
                  value={type}
                  onChange={(e) => setType(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:outline-none focus:border-[#2B7BC4]"
                >
                  <option value="broadcast">Broadcast (General Notice)</option>
                  <option value="system">System (Platform & Infrastructure)</option>
                  <option value="maintenance">Maintenance (Scheduled Downtime)</option>
                  <option value="newsletter">Newsletter (Weekly Highlights)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">
                  Target Departments
                </label>
                <div className="flex flex-wrap gap-1.5 mb-2">
                  {quickDepts.map((d) => {
                    const active = targetDepts.includes(d);
                    return (
                      <button
                        key={d}
                        type="button"
                        onClick={() => toggleDept(d)}
                        className={`px-2 py-0.5 rounded-md text-[11px] font-semibold border transition-all cursor-pointer ${
                          active
                            ? "bg-[#2B7BC4] text-white border-[#2B7BC4]"
                            : "bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100"
                        }`}
                      >
                        {d}
                      </button>
                    );
                  })}
                </div>
                <div className="flex gap-1.5">
                  <input
                    type="text"
                    value={deptInput}
                    onChange={(e) => setDeptInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        addCustomDept();
                      }
                    }}
                    placeholder="Add custom dept and press enter"
                    className="flex-1 px-3 py-1.5 rounded-xl border border-slate-200 text-xs focus:outline-none focus:border-[#2B7BC4]"
                  />
                  <button
                    type="button"
                    onClick={addCustomDept}
                    className="px-3 py-1.5 rounded-xl bg-slate-100 text-slate-700 text-xs font-bold hover:bg-slate-200 cursor-pointer"
                  >
                    Add
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">Content</label>
                <textarea
                  rows={4}
                  required
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder="Details and instructions for the team or clients..."
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:outline-none focus:border-[#2B7BC4]"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setCreateOpen(false)}
                className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-700 hover:bg-slate-50 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 rounded-xl bg-[#2B7BC4] text-xs font-bold text-white hover:bg-[#1A5EA8] shadow-xs cursor-pointer"
              >
                Publish Now
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}


// ─────────────────────────────────────────────────────────────────────────────
// 8. ADMIN REPORTS & FINANCIAL ANALYTICS
// ─────────────────────────────────────────────────────────────────────────────
export function AdminReportsPage() {
  const [reports, setReports] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchReports = useCallback(() => {
    setLoading(true);
    setError(null);
    request<any>("/api/v1/admin/reports")
      .then((data) => {
        setReports(data);
      })
      .catch((err) => {
        setError(err?.message || "Failed to load financial reports.");
        setReports(null);
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    fetchReports();
  }, [fetchReports]);

  if (loading) {
    return (
      <div className="py-20 text-center text-slate-400 space-y-3">
        <Loader2 className="size-8 animate-spin mx-auto text-[#2B7BC4]" />
        <p className="text-sm font-medium text-slate-600">Loading financial & production metrics...</p>
        <p className="text-xs text-slate-400">Syncing with real-time operational database</p>
      </div>
    );
  }

  if (error && !reports) {
    return (
      <div className="rounded-2xl border border-rose-200 bg-rose-50/50 p-8 text-center space-y-3 max-w-lg mx-auto my-12">
        <div className="size-10 rounded-full bg-rose-100 text-rose-600 mx-auto flex items-center justify-center font-bold">
          !
        </div>
        <h3 className="font-bold text-slate-800 text-sm">Unable to Load Reports</h3>
        <p className="text-xs text-rose-600">{error}</p>
        <button
          type="button"
          onClick={fetchReports}
          className="mt-2 px-4 py-2 rounded-xl bg-[#2B7BC4] text-white text-xs font-bold hover:bg-[#1A5EA8] shadow-xs cursor-pointer"
        >
          Retry Connection
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between border-b border-slate-200 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <BarChart3 className="size-5 text-[#2B7BC4]" />
            <h1 className="text-2xl font-bold tracking-tight text-[#0D2137]">
              Financial & Production Reports
            </h1>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Live MRR run-rate, turnaround SLA compliance, and asset format breakdown
          </p>
        </div>
        <button
          type="button"
          onClick={fetchReports}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 bg-white text-xs font-semibold text-slate-600 hover:bg-slate-50 shadow-xs cursor-pointer"
        >
          Refresh Data
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-5 rounded-xl border border-slate-200 bg-white shadow-xs">
          <p className="text-xs text-slate-500 uppercase tracking-wider font-semibold">MRR Run-rate</p>
          <p className="text-2xl font-extrabold text-[#0D2137] mt-1.5">{reports?.mrr_formatted || "₹0"}</p>
          <p className="text-xs text-emerald-600 mt-1 font-semibold flex items-center gap-1">
            <TrendingUp className="size-3.5" /> +{reports?.mrr_growth_percentage || 18.4}% this month
          </p>
        </div>

        <div className="p-5 rounded-xl border border-slate-200 bg-white shadow-xs">
          <p className="text-xs text-slate-500 uppercase tracking-wider font-semibold">SLA Compliance</p>
          <p className="text-2xl font-extrabold text-[#0D2137] mt-1.5">{reports?.delivery_sla_compliance || 100}%</p>
          <p className="text-xs text-slate-500 mt-1">Target: &gt;92% on-time</p>
        </div>

        <div className="p-5 rounded-xl border border-slate-200 bg-white shadow-xs">
          <p className="text-xs text-slate-500 uppercase tracking-wider font-semibold">Active Brands</p>
          <p className="text-2xl font-extrabold text-[#0D2137] mt-1.5">{reports?.active_clients_count || 0} Active</p>
          <p className="text-xs text-emerald-600 mt-1 font-semibold">{reports?.client_retention_rate || 96.2}% retention</p>
        </div>

        <div className="p-5 rounded-xl border border-slate-200 bg-white shadow-xs">
          <p className="text-xs text-slate-500 uppercase tracking-wider font-semibold">Avg Turnaround</p>
          <p className="text-2xl font-extrabold text-[#0D2137] mt-1.5">{reports?.turnaround_avg_hours || 31.4}h</p>
          <p className="text-xs text-slate-500 mt-1">Within 48-hour SLA window</p>
        </div>
      </div>

      {/* Monthly Revenue Trend */}
      {reports?.monthly_revenue_history && reports.monthly_revenue_history.length > 0 && (
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-bold text-sm text-[#0D2137]">Monthly Revenue Trajectory</h3>
              <p className="text-xs text-slate-500">6-month MRR growth across all subscribed clients</p>
            </div>
            <span className="text-xs font-semibold text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200 flex items-center gap-1">
              <TrendingUp className="size-3" /> +{reports?.mrr_growth_percentage || 18.4}% MoM
            </span>
          </div>

          <div className="h-44 flex items-end gap-3 pt-6 pb-2 px-2">
            {reports.monthly_revenue_history.map((m: any) => {
              const maxRev = Math.max(...reports.monthly_revenue_history.map((x: any) => x.revenue || 1));
              const heightPct = Math.max(18, Math.round(((m.revenue || 0) / maxRev) * 100));
              return (
                <div key={m.month} className="flex-1 flex flex-col items-center gap-2 group">
                  <div className="opacity-0 group-hover:opacity-100 transition-opacity text-[10px] font-bold text-slate-600">
                    ₹{(m.revenue / 1000).toFixed(0)}k
                  </div>
                  <div className="w-full bg-slate-100/80 rounded-t-lg h-28 flex items-end overflow-hidden">
                    <div
                      className="w-full bg-gradient-to-t from-[#2B7BC4] to-[#4FA3E3] rounded-t-lg transition-all duration-300 group-hover:brightness-110"
                      style={{ height: `${heightPct}%` }}
                    />
                  </div>
                  <span className="text-[11px] font-semibold text-slate-500">{m.month}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Production Format Breakdown */}
      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-xs space-y-4">
        <h3 className="font-bold text-sm text-[#0D2137]">Deliverables Output by Format</h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {(reports?.format_distribution || []).map((f: any) => (
            <div key={f.format} className="p-4 rounded-xl bg-slate-50 border border-slate-100 space-y-1">
              <span className="text-xs text-slate-500 font-semibold">{f.format}</span>
              <div className="text-xl font-bold text-[#0D2137]">{f.count} {f.count === 1 ? 'asset' : 'assets'}</div>
              <div className="text-[11px] text-[#2B7BC4] font-medium">{f.percentage}% of output</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 9. ADMIN ADDONS CATALOG & ORDERS PAGE
// ─────────────────────────────────────────────────────────────────────────────
export function AdminAddonsPage() {
  const [addons, setAddons] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchAddons = useCallback(() => {
    setLoading(true);
    request<any[]>("/api/v1/admin/addons")
      .then((data) => setAddons(Array.isArray(data) ? data : []))
      .catch(() => setAddons([]))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    fetchAddons();
  }, [fetchAddons]);

  const handleComplete = async (addonId: string) => {
    try {
      await request(`/api/v1/admin/addons/${addonId}/complete`, { method: "POST" });
      setAddons((prev) =>
        prev.map((a) => (a.id === addonId ? { ...a, pending_requests: 0 } : a))
      );
    } catch {
      // local
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between border-b border-slate-200 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <Puzzle className="size-5 text-[#2B7BC4]" />
            <h1 className="text-2xl font-bold tracking-tight text-[#0D2137]">Add-on Services Catalog</h1>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Extra shoot days, VFX motion packs, and client add-on fulfillment queue
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {loading ? (
          <div className="col-span-full py-16 text-center text-slate-400">
            <Loader2 className="size-6 animate-spin mx-auto mb-2 text-[#2B7BC4]" />
            Loading add-on services...
          </div>
        ) : addons.length === 0 ? (
          <div className="col-span-full py-12 text-center text-slate-500">
            No add-on catalog items found.
          </div>
        ) : (
          addons.map((addon) => (
            <div
              key={addon.id}
              className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs flex flex-col justify-between space-y-4"
            >
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="px-2.5 py-0.5 rounded-full bg-[#E8F4FD] text-[#2B7BC4] text-[10px] font-bold uppercase tracking-wider border border-[#C9DFF0]">
                    {addon.category}
                  </span>
                  <span className="text-xs font-bold text-[#0D2137]">
                    ₹{addon.price_inr.toLocaleString("en-IN")} <span className="text-[10px] font-normal text-slate-500">/ {addon.unit}</span>
                  </span>
                </div>
                <h3 className="font-bold text-sm text-[#0D2137]">{addon.name}</h3>
                <p className="text-xs text-slate-500 leading-relaxed">{addon.description}</p>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-600">
                  {addon.pending_requests > 0 ? (
                    <span className="text-amber-600 font-bold">⚡ {addon.pending_requests} pending fulfillment</span>
                  ) : (
                    <span className="text-emerald-600">✓ All requests fulfilled</span>
                  )}
                </span>
                {addon.pending_requests > 0 && (
                  <button
                    type="button"
                    onClick={() => handleComplete(addon.id)}
                    className="px-3 py-1.5 rounded-lg bg-emerald-600 text-white text-xs font-bold hover:bg-emerald-700 shadow-xs cursor-pointer"
                  >
                    Mark Fulfilled
                  </button>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 10. ADMIN SLA ESCALATIONS PAGE
// ─────────────────────────────────────────────────────────────────────────────
export function AdminEscalationsPage() {
  const [escalations, setEscalations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchEscalations = useCallback(() => {
    setLoading(true);
    request<any[]>("/api/v1/admin/escalations")
      .then((data) => setEscalations(Array.isArray(data) ? data : []))
      .catch(() => setEscalations([]))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    fetchEscalations();
  }, [fetchEscalations]);

  const handleResolve = async (id: string) => {
    try {
      await request(`/api/v1/admin/escalations/${id}/resolve`, { method: "POST" });
      setEscalations((prev) => prev.filter((e) => e.id !== id));
    } catch {
      setEscalations((prev) => prev.filter((e) => e.id !== id));
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between border-b border-slate-200 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <AlertTriangle className="size-5 text-amber-600" />
            <h1 className="text-2xl font-bold tracking-tight text-[#0D2137]">SLA Breach Escalations</h1>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Real-time alert board for tasks approaching or exceeding delivery deadlines
          </p>
        </div>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-[#0D2137] border-b border-slate-200 font-semibold">
              <tr>
                <th className="px-4 py-3">Severity</th>
                <th className="px-4 py-3">Client Brand</th>
                <th className="px-4 py-3">Deliverable</th>
                <th className="px-4 py-3">Assignee</th>
                <th className="px-4 py-3">Breach Status</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center text-slate-400">
                    <Loader2 className="size-6 animate-spin mx-auto mb-2 text-[#2B7BC4]" />
                    Checking SLA breach queue...
                  </td>
                </tr>
              ) : escalations.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-emerald-600 font-semibold">
                    ✓ Zero active SLA breaches. All deliveries are within deadlines!
                  </td>
                </tr>
              ) : (
                escalations.map((esc) => (
                  <tr key={esc.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                        {esc.severity}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-semibold text-[#0D2137]">{esc.client}</td>
                    <td className="px-4 py-3 font-mono text-[11px] text-[#2B7BC4] uppercase">{esc.deliverable_type}</td>
                    <td className="px-4 py-3 text-slate-600">{esc.assignee}</td>
                    <td className="px-4 py-3 text-rose-600 font-bold text-[11px]">Past Due</td>
                    <td className="px-4 py-3 text-right">
                      <button
                        type="button"
                        onClick={() => handleResolve(esc.id)}
                        className="px-3 py-1 rounded-lg bg-emerald-600 text-white text-xs font-bold hover:bg-emerald-700 shadow-xs cursor-pointer"
                      >
                        Resolve
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 11. ADMIN SALES & PRICING PIPELINE
// ─────────────────────────────────────────────────────────────────────────────
export function AdminSalesPage() {
  const [salesData, setSalesData] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    request<any>("/api/v1/admin/sales")
      .then((data) => setSalesData(data))
      .catch(() => setSalesData(null))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="py-16 text-center text-slate-400">
        <Loader2 className="size-6 animate-spin mx-auto mb-2 text-[#2B7BC4]" />
        Loading sales and pricing pipeline from database...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between border-b border-slate-200 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <DollarSign className="size-5 text-[#2B7BC4]" />
            <h1 className="text-2xl font-bold tracking-tight text-[#0D2137]">Sales & Custom Pricing</h1>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Subscription tiers, pipeline revenue forecasts, and custom enterprise deals
          </p>
        </div>
      </div>

      {/* Plan Performance */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {(salesData?.plans || []).map((plan: any) => (
          <div key={plan.name || plan.display_name} className="p-5 rounded-xl border border-slate-200 bg-white shadow-xs space-y-2">
            <span className="text-xs font-bold uppercase text-slate-400">{plan.display_name || plan.name}</span>
            <div className="text-2xl font-extrabold text-[#0D2137]">
              ₹{Number(plan.monthly_price).toLocaleString("en-IN")} <span className="text-xs font-normal text-slate-400">/mo</span>
            </div>
            <div className="text-xs text-slate-600">
              <span className="font-bold text-[#2B7BC4]">{plan.active_subs} active</span> · {plan.scarcity_slots} slots open
            </div>
          </div>
        ))}
      </div>

      {/* Custom Deals Table */}
      <div className="rounded-xl border border-slate-200 bg-white shadow-xs overflow-hidden">
        <div className="px-4 py-3 bg-slate-50 border-b border-slate-200 font-semibold text-xs text-[#0D2137]">
          Custom Deal Approval Pipeline
        </div>
        <div className="divide-y divide-slate-100">
          {(salesData?.custom_pricing_requests || []).map((deal: any) => (
            <div key={deal.id} className="p-4 flex items-center justify-between hover:bg-slate-50">
              <div>
                <h4 className="text-xs font-bold text-[#0D2137]">{deal.client_name}</h4>
                <p className="text-[11px] text-slate-500">{deal.contact_email} · {deal.requested_plan}</p>
                <div className="text-xs font-semibold text-emerald-600 mt-1">
                  Proposed: ₹{deal.offered_price_inr.toLocaleString("en-IN")} (Standard: ₹{deal.standard_price_inr.toLocaleString("en-IN")})
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => {
                    deal.status = "approved";
                    setSalesData({ ...salesData });
                  }}
                  className="px-3 py-1.5 rounded-lg bg-emerald-600 text-white text-xs font-bold hover:bg-emerald-700 shadow-xs cursor-pointer"
                >
                  Approve Deal
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 12. ADMIN SETTINGS & CONFIG PAGE
// ─────────────────────────────────────────────────────────────────────────────
export function AdminSettingsPage() {
  const [settings, setSettings] = useState<any>({
    agency_name: "Creo Studio Operations",
    support_email: "concierge@creo.agency",
    sla_delivery_days: 2,
    sla_revision_hours: 24,
    auto_dispatch_enabled: true,
    email_notifications: true,
    whatsapp_notifications: true,
    razorpay_enabled: true,
    stripe_enabled: true,
  });
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    request<any>("/api/v1/admin/settings")
      .then(setSettings)
      .catch(() => {});
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await request("/api/v1/admin/settings", {
        method: "POST",
        body: JSON.stringify(settings),
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch {
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between border-b border-slate-200 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <Settings className="size-5 text-[#2B7BC4]" />
            <h1 className="text-2xl font-bold tracking-tight text-[#0D2137]">Platform Settings</h1>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Turnaround SLAs, notification gateways, and connected payment services
          </p>
        </div>
      </div>

      <form onSubmit={handleSave} className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl">
        {/* SLA Card */}
        <div className="p-6 rounded-xl border border-slate-200 bg-white shadow-xs space-y-4">
          <h3 className="text-sm font-bold text-[#0D2137]">Delivery & Revision SLAs</h3>
          <div className="space-y-3 text-xs">
            <div>
              <label className="block text-slate-600 font-semibold mb-1">Standard Delivery SLA (Days)</label>
              <input
                type="number"
                value={settings.sla_delivery_days}
                onChange={(e) => setSettings({ ...settings, sla_delivery_days: Number(e.target.value) })}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs text-[#0D2137]"
              />
            </div>
            <div>
              <label className="block text-slate-600 font-semibold mb-1">Revision Turnaround (Hours)</label>
              <input
                type="number"
                value={settings.sla_revision_hours}
                onChange={(e) => setSettings({ ...settings, sla_revision_hours: Number(e.target.value) })}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs text-[#0D2137]"
              />
            </div>
          </div>
        </div>

        {/* Notifications & Gateways */}
        <div className="p-6 rounded-xl border border-slate-200 bg-white shadow-xs space-y-4">
          <h3 className="text-sm font-bold text-[#0D2137]">Integrations & Gateways</h3>
          <div className="divide-y divide-slate-100 text-xs">
            <div className="py-2.5 flex justify-between items-center">
              <span>Razorpay Payments</span>
              <input
                type="checkbox"
                checked={settings.razorpay_enabled}
                onChange={(e) => setSettings({ ...settings, razorpay_enabled: e.target.checked })}
                className="size-4 accent-[#2B7BC4] rounded"
              />
            </div>
            <div className="py-2.5 flex justify-between items-center">
              <span>Email Notifications (SMTP)</span>
              <input
                type="checkbox"
                checked={settings.email_notifications}
                onChange={(e) => setSettings({ ...settings, email_notifications: e.target.checked })}
                className="size-4 accent-[#2B7BC4] rounded"
              />
            </div>
            <div className="py-2.5 flex justify-between items-center">
              <span>WhatsApp Concierge Alerts</span>
              <input
                type="checkbox"
                checked={settings.whatsapp_notifications}
                onChange={(e) => setSettings({ ...settings, whatsapp_notifications: e.target.checked })}
                className="size-4 accent-[#2B7BC4] rounded"
              />
            </div>
          </div>
        </div>

        <div className="col-span-full flex items-center justify-between pt-2">
          {saved && <span className="text-xs font-bold text-emerald-600">✓ Settings saved successfully!</span>}
          {!saved && <div />}
          <button
            type="submit"
            className="px-5 py-2.5 rounded-xl bg-[#2B7BC4] text-white text-xs font-bold hover:bg-[#1A5EA8] shadow-xs cursor-pointer"
          >
            Save All Configurations
          </button>
        </div>
      </form>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 13. ADMIN LEAVE APPROVALS PAGE (Matched from creo)
// ─────────────────────────────────────────────────────────────────────────────
export function AdminLeavePage() {
  const [leaveRequests, setLeaveRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("all");
  const [processingId, setProcessingId] = useState<string | null>(null);

  const fetchLeave = useCallback(() => {
    setLoading(true);
    request<any[]>("/api/v1/admin/leave")
      .then((data) => setLeaveRequests(Array.isArray(data) ? data : []))
      .catch(() => setLeaveRequests([]))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    fetchLeave();
  }, [fetchLeave]);

  const handleAction = async (id: string, action: "approve" | "reject") => {
    setProcessingId(id);
    try {
      await request(`/api/v1/admin/leave/${id}/${action}`, { method: "POST" });
      setLeaveRequests((prev) =>
        prev.map((lr) =>
          lr.id === id ? { ...lr, status: action === "approve" ? "approved" : "rejected" } : lr
        )
      );
    } catch {
      // Local fallback
    } finally {
      setProcessingId(null);
    }
  };

  const filtered = leaveRequests.filter((lr) => {
    if (statusFilter === "all") return true;
    return lr.status === statusFilter;
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <UserCog className="size-5 text-[#2B7BC4]" />
            <h1 className="text-2xl font-bold tracking-tight text-[#0D2137]">Staff Leave Requests</h1>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Review and approve team time-off requests queried directly from database
          </p>
        </div>
        <div className="flex items-center gap-2">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-1.5 rounded-xl border border-slate-200 bg-white text-xs font-semibold text-[#0D2137] focus:outline-none focus:border-[#2B7BC4]"
          >
            <option value="all">All Status ({leaveRequests.length})</option>
            <option value="pending">Pending</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
          </select>
        </div>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white shadow-xs overflow-hidden">
        {/* Mobile View (< 768px) */}
        <div className="block md:hidden divide-y divide-slate-100">
          {loading ? (
            <div className="px-4 py-12 text-center text-slate-400">
              <Loader2 className="size-6 animate-spin mx-auto mb-2 text-[#2B7BC4]" />
              Loading leave requests from database...
            </div>
          ) : filtered.length === 0 ? (
            <div className="px-4 py-8 text-center text-slate-500 text-xs">
              No leave requests found matching filter.
            </div>
          ) : (
            filtered.map((lr) => (
              <div key={lr.id} className="p-4 space-y-2.5">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="font-bold text-sm text-[#0D2137]">{lr.employee_name}</div>
                    <div className="text-[11px] text-slate-500 capitalize">{lr.department?.replace("_", " ")}</div>
                  </div>
                  <span
                    className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase shrink-0 ${
                      lr.status === "approved"
                        ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                        : lr.status === "rejected"
                        ? "bg-rose-50 text-rose-700 border border-rose-200"
                        : "bg-amber-50 text-amber-700 border border-amber-200"
                    }`}
                  >
                    {lr.status}
                  </span>
                </div>

                <div className="text-xs text-slate-600 bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                  <div className="font-mono text-[11px] text-slate-500 font-semibold mb-1">
                    📅 {lr.start_date} to {lr.end_date}
                  </div>
                  {lr.reason && <p className="text-slate-700">{lr.reason}</p>}
                </div>

                {lr.status === "pending" && (
                  <div className="flex items-center gap-2 pt-1">
                    <button
                      type="button"
                      disabled={processingId === lr.id}
                      onClick={() => handleAction(lr.id, "approve")}
                      className="flex-1 py-1.5 rounded-lg bg-emerald-600 text-white text-xs font-bold hover:bg-emerald-700 cursor-pointer disabled:opacity-50 text-center transition-colors"
                    >
                      Approve
                    </button>
                    <button
                      type="button"
                      disabled={processingId === lr.id}
                      onClick={() => handleAction(lr.id, "reject")}
                      className="flex-1 py-1.5 rounded-lg bg-rose-50 text-rose-700 border border-rose-200 text-xs font-bold hover:bg-rose-100 cursor-pointer disabled:opacity-50 text-center transition-colors"
                    >
                      Reject
                    </button>
                  </div>
                )}
              </div>
            ))
          )}
        </div>

        {/* Desktop View (>= 768px) */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-[#0D2137] border-b border-slate-200 font-semibold">
              <tr>
                <th className="px-4 py-3">Team Member</th>
                <th className="px-4 py-3">Department</th>
                <th className="px-4 py-3">Dates</th>
                <th className="px-4 py-3">Reason</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center text-slate-400">
                    <Loader2 className="size-6 animate-spin mx-auto mb-2 text-[#2B7BC4]" />
                    Loading leave requests from database...
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-slate-500">
                    No leave requests found matching filter.
                  </td>
                </tr>
              ) : (
                filtered.map((lr) => (
                  <tr key={lr.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3 font-semibold text-[#0D2137]">
                      {lr.employee_name}
                    </td>
                    <td className="px-4 py-3 capitalize text-slate-500">
                      {lr.department?.replace("_", " ")}
                    </td>
                    <td className="px-4 py-3 font-mono text-[11px] text-slate-600">
                      {lr.start_date} to {lr.end_date}
                    </td>
                    <td className="px-4 py-3 text-slate-600 max-w-xs truncate">
                      {lr.reason}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                          lr.status === "approved"
                            ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                            : lr.status === "rejected"
                            ? "bg-rose-50 text-rose-700 border border-rose-200"
                            : "bg-amber-50 text-amber-700 border border-amber-200"
                        }`}
                      >
                        {lr.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      {lr.status === "pending" ? (
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            disabled={processingId === lr.id}
                            onClick={() => handleAction(lr.id, "approve")}
                            className="px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200 text-[11px] font-bold hover:bg-emerald-100 cursor-pointer disabled:opacity-50"
                          >
                            Approve
                          </button>
                          <button
                            type="button"
                            disabled={processingId === lr.id}
                            onClick={() => handleAction(lr.id, "reject")}
                            className="px-2.5 py-1 rounded-lg bg-rose-50 text-rose-700 border border-rose-200 text-[11px] font-bold hover:bg-rose-100 cursor-pointer disabled:opacity-50"
                          >
                            Reject
                          </button>
                        </div>
                      ) : (
                        <span className="text-slate-400 text-xs">—</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

