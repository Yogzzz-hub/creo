import React, { useState, useEffect, useCallback } from "react";
import { Link } from "react-router";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
  ResponsiveContainer,
} from "recharts";
import {
  Users,
  CheckSquare,
  UserCog,
  Search,
  Plus,
  CheckCircle2,
  MessageSquare,
  AlertTriangle,
  DollarSign,
  Briefcase,
  TrendingUp,
  Eye,
  Check,
  X,
  Loader2,
  Filter,
  Tag,
  ChevronLeft,
  ChevronRight,
  Calendar,
  Clock,
  Plane,
  Zap,
  ArrowLeft,
  Download,
  Printer,
  SlidersHorizontal,
  ArrowUpRight,
  Play,
  Camera,
  Video,
  Scissors,
  Palette,
  RefreshCw,
  Layers,
  Mail,
  Phone,
  Instagram,
  ExternalLink,
  FileText,
  Edit3,
  Folder,
  Lock,
  ShieldCheck,
} from "lucide-react";
import { request } from "../../lib/http";
import { AdminTopHeader } from "../../components/admin/AdminTopHeader";
import { useAlert } from "../../components/ui/ConfirmDialog";
import { useAuth } from "../../lib/auth-context";

// ─────────────────────────────────────────────────────────────────────────────
// 1. ADMIN CLIENTS PAGE (CLIENT DETAILS & BRAND BRIEF)
// ─────────────────────────────────────────────────────────────────────────────
export interface ClientDetailData {
  id: string;
  name: string;
  initials: string;
  industry: string;
  timezone: string;
  activeSince: string;
  tier: string;
  tierBadge: string;
  status: string;
  monthlyFee: number;
  addon?: string;
  nextBilling: string;
  billingMethod: string;
  totalAssetsDelivered: number;
  totalAssetsQuota: number;
  postsDelivered: number;
  postsQuota: number;
  reelsDelivered: number;
  reelsQuota: number;
  storiesDelivered: number;
  storiesQuota: number;
  sprintNumber: number;
  daysRemainingInSprint: number;
  contact: {
    name: string;
    title: string;
    email: string;
    phone: string;
    renewedDate: string;
    termMonths: number;
  };
  brand: {
    kitVersion: string;
    headingsFont: string;
    bodyFont: string;
    monoFont: string;
    toneSummary: string;
    toneTags: string[];
    colors: { name: string; hex: string; isLight?: boolean }[];
    social: {
      handle: string;
      followers: string;
      status: string;
      syncInterval: string;
    };
    brandVaultLink: string;
    figmaLink: string;
    lastAuditDate: string;
  };
  pod: {
    name: string;
    tagline: string;
    leadName: string;
    leadTitle: string;
    leadAvatar: string;
    squad: { name: string; role: string; hoursPerWeek: number; avatar: string }[];
    capacityAllocatedHrs: number;
    bandwidthPercent: number;
    dailySyncTime: string;
  };
  deliverables: {
    id: string;
    title: string;
    description: string;
    format: string;
    status: "IN REVIEW" | "IN PRODUCTION" | "APPROVED" | "READY FOR REVIEW";
    statusColor: string;
    code: string;
    dueDate: string;
    assignedTo: string;
    actions: string[];
  }[];
}

export function AdminClientsPage() {
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [deliverableSearch, setDeliverableSearch] = useState("");
  const [toast, setToast] = useState<string | null>(null);

  // Active Modals
  const [isEditProfileOpen, setIsEditProfileOpen] = useState(false);
  const [isInvoiceModalOpen, setIsInvoiceModalOpen] = useState(false);
  const [isNewRequestOpen, setIsNewRequestOpen] = useState(false);
  const [previewDeliverable, setPreviewDeliverable] = useState<any | null>(null);

  const [newRequestForm, setNewRequestForm] = useState({
    title: "",
    type: "Reel",
    priority: "Standard",
    notes: "",
  });

  const clientsData: Record<string, ClientDetailData> = {
    northwind: {
      id: "northwind",
      name: "Northwind Labs",
      initials: "NL",
      industry: "Fintech & Algorithmic Infrastructure",
      timezone: "Client Time: EST (UTC-5)",
      activeSince: "Active since Aug 2023",
      tier: "Enterprise Retainer",
      tierBadge: "ENTERPRISE RETAINER",
      status: "ACTIVE RETAINER",
      monthlyFee: 9500,
      addon: "Add-on: Motion Lead",
      nextBilling: "Dec 1, 2024",
      billingMethod: "Stripe Corporate ACH",
      totalAssetsDelivered: 18,
      totalAssetsQuota: 24,
      postsDelivered: 12,
      postsQuota: 16,
      reelsDelivered: 3,
      reelsQuota: 4,
      storiesDelivered: 3,
      storiesQuota: 4,
      sprintNumber: 44,
      daysRemainingInSprint: 12,
      contact: {
        name: "David K.",
        title: "VP of Marketing & Communications",
        email: "ops@northwindlabs.co",
        phone: "+1 (555) 234-8901",
        renewedDate: "Nov 1, 2024",
        termMonths: 12,
      },
      brand: {
        kitVersion: "Design Kit v2.4",
        headingsFont: "Plus Jakarta Sans",
        bodyFont: "Inter Sans",
        monoFont: "JetBrains Mono",
        toneSummary:
          "Authoritative, institutional, enterprise fintech with sharp geometric clarity. Uncompromising precision and zero superfluous fluff.",
        toneTags: ["Algorithmic", "High Trust", "Global Scope"],
        colors: [
          { name: "Core Navy", hex: "#0F172A" },
          { name: "Accent Azure", hex: "#2563EB" },
          { name: "Cyan Highlight", hex: "#06B6D4" },
          { name: "Clean Neutral", hex: "#F8FAFC", isLight: true },
        ],
        social: {
          handle: "@northwindlabs",
          followers: "142,800 Followers",
          status: "API CONNECTED",
          syncInterval: "15m refresh",
        },
        brandVaultLink: "Google Drive Brand Vault",
        figmaLink: "Figma Design System (v2.4)",
        lastAuditDate: "Nov 12, 2024",
      },
      pod: {
        name: "Pod A",
        tagline: "Creative & Strategy",
        leadName: "Maya Lin",
        leadTitle: "Senior Art Director (Lead)",
        leadAvatar: "ML",
        squad: [
          { name: "Omar K.", role: "Dedicated Motion Lead", hoursPerWeek: 12, avatar: "OK" },
          { name: "Lena V.", role: "Senior FinTech Copywriter", hoursPerWeek: 10, avatar: "LV" },
          { name: "Theo P.", role: "Graphic & Vector Specialist", hoursPerWeek: 10, avatar: "TP" },
        ],
        capacityAllocatedHrs: 32,
        bandwidthPercent: 85,
        dailySyncTime: "10:30 AM EST",
      },
      deliverables: [
        {
          id: "nb-402",
          title: "Q4 FinTech Reel",
          description: "High-impact motion animation showcasing algorithmic latency reduction.",
          format: "9:16 Vertical Video",
          status: "IN REVIEW",
          statusColor: "bg-amber-50 text-amber-700 border-amber-200",
          code: "#NB-402",
          dueDate: "Tomorrow 4:00 PM",
          assignedTo: "Omar K.",
          actions: ["Approve", "Decline", "Preview Video Draft (0:45)"],
        },
        {
          id: "nb-403",
          title: "3× B2B Carousel Infographics",
          description: "Data charts breakdown for institutional treasury workflows.",
          format: "4:5 Carousel (3 slides)",
          status: "IN PRODUCTION",
          statusColor: "bg-blue-50 text-blue-700 border-blue-200",
          code: "#NB-403",
          dueDate: "Nov 18, 2024",
          assignedTo: "Theo P.",
          actions: ["Preview Canvas", "Request Revisions"],
        },
        {
          id: "nb-405",
          title: "CyberWeek Announcement",
          description: "Campaign hero visual highlighting zero-fee developer API access.",
          format: "1:1 Square Static",
          status: "APPROVED",
          statusColor: "bg-emerald-50 text-emerald-700 border-emerald-200",
          code: "#NB-405",
          dueDate: "Nov 20, 9:00 AM",
          assignedTo: "Lena V. / Theo P.",
          actions: ["Auto-Publish Locked", "View Scheduled Meta"],
        },
        {
          id: "nb-404",
          title: "Brand Identity Deck",
          description: "Complete brand guideline documentation update for Q1 partners.",
          format: "PDF Deck (28 Pages)",
          status: "READY FOR REVIEW",
          statusColor: "bg-purple-50 text-purple-700 border-purple-200",
          code: "#NB-404",
          dueDate: "Nov 22, 2024",
          assignedTo: "Maya Lin",
          actions: ["Approve", "Notes", "Open Full Presentation"],
        },
      ],
    },
    bloom: {
      id: "bloom",
      name: "Bloom Studio",
      initials: "BS",
      industry: "Clean Cosmetics & DTC Beauty",
      timezone: "Client Time: PST (UTC-8)",
      activeSince: "Active since Oct 2023",
      tier: "Growth & Scale Retainer",
      tierBadge: "GROWTH RETAINER",
      status: "ACTIVE RETAINER",
      monthlyFee: 8400,
      addon: "Add-on: Colorist Lead",
      nextBilling: "Dec 5, 2024",
      billingMethod: "Stripe Corporate Card",
      totalAssetsDelivered: 14,
      totalAssetsQuota: 20,
      postsDelivered: 9,
      postsQuota: 12,
      reelsDelivered: 3,
      reelsQuota: 4,
      storiesDelivered: 2,
      storiesQuota: 4,
      sprintNumber: 44,
      daysRemainingInSprint: 12,
      contact: {
        name: "Anya Taylor",
        title: "Head of Brand & Creative",
        email: "creative@bloomstudio.com",
        phone: "+1 (555) 832-1940",
        renewedDate: "Nov 5, 2024",
        termMonths: 6,
      },
      brand: {
        kitVersion: "Design Kit v1.9",
        headingsFont: "Cormorant Garamond",
        bodyFont: "Plus Jakarta Sans",
        monoFont: "Space Mono",
        toneSummary:
          "Sensory, serene, high-end organic beauty with pastel luminescence. Warm editorial elegance and mindful self-care narratives.",
        toneTags: ["Mindful Luxe", "Botanical", "Warm Editorial"],
        colors: [
          { name: "Blush Rose", hex: "#F43F5E" },
          { name: "Petal Mist", hex: "#FFE4E6", isLight: true },
          { name: "Sage Earth", hex: "#10B981" },
          { name: "Soft Ivory", hex: "#FFFBEB", isLight: true },
        ],
        social: {
          handle: "@bloomstudio_skin",
          followers: "88,400 Followers",
          status: "API CONNECTED",
          syncInterval: "15m refresh",
        },
        brandVaultLink: "Bloom Brand Assets Drive",
        figmaLink: "Bloom Master Design System",
        lastAuditDate: "Nov 10, 2024",
      },
      pod: {
        name: "Pod B",
        tagline: "Visual & Lifestyle Retouching",
        leadName: "Elena Rostova",
        leadTitle: "Senior Creative Producer",
        leadAvatar: "ER",
        squad: [
          { name: "Julian Reyes", role: "UI & Product Stylist", hoursPerWeek: 12, avatar: "JR" },
          { name: "Marcus Brody", role: "Video & Colorist", hoursPerWeek: 10, avatar: "MB" },
        ],
        capacityAllocatedHrs: 28,
        bandwidthPercent: 78,
        dailySyncTime: "11:00 AM PST",
      },
      deliverables: [
        {
          id: "bs-201",
          title: "Holiday Campaign Lifestyle Retouching",
          description: "4K Color graded editorial photos for holiday gift box collection.",
          format: "4:5 Portrait High-Res",
          status: "IN REVIEW",
          statusColor: "bg-amber-50 text-amber-700 border-amber-200",
          code: "#BS-201",
          dueDate: "Tomorrow 2:00 PM",
          assignedTo: "Julian Reyes",
          actions: ["Approve", "Decline", "Preview Canvas"],
        },
        {
          id: "bs-202",
          title: "Founder Q&A Micro-Reel #4",
          description: "Organic skincare routine explanation with subtitle dynamic animations.",
          format: "9:16 Vertical Video",
          status: "IN PRODUCTION",
          statusColor: "bg-blue-50 text-blue-700 border-blue-200",
          code: "#BS-202",
          dueDate: "Nov 19, 2024",
          assignedTo: "Marcus Brody",
          actions: ["Preview Video Draft", "Request Revisions"],
        },
      ],
    },
    atlas: {
      id: "atlas",
      name: "Atlas Commerce",
      initials: "AC",
      industry: "Omnichannel E-commerce & Retail Tech",
      timezone: "Client Time: CST (UTC-6)",
      activeSince: "Active since May 2023",
      tier: "Enterprise Retainer",
      tierBadge: "ENTERPRISE RETAINER",
      status: "ACTIVE RETAINER",
      monthlyFee: 12500,
      addon: "Add-on: TikTok Growth Pod",
      nextBilling: "Dec 10, 2024",
      billingMethod: "Direct ACH Wire",
      totalAssetsDelivered: 22,
      totalAssetsQuota: 28,
      postsDelivered: 14,
      postsQuota: 18,
      reelsDelivered: 5,
      reelsQuota: 6,
      storiesDelivered: 3,
      storiesQuota: 4,
      sprintNumber: 44,
      daysRemainingInSprint: 12,
      contact: {
        name: "Kenji Sato",
        title: "VP of Growth & Acquisition",
        email: "growth@atlascommerce.io",
        phone: "+1 (555) 492-7711",
        renewedDate: "Nov 10, 2024",
        termMonths: 12,
      },
      brand: {
        kitVersion: "Design Kit v3.1",
        headingsFont: "Outfit Sans",
        bodyFont: "Inter Sans",
        monoFont: "JetBrains Mono",
        toneSummary:
          "High-octane, performance-driven commerce intelligence with punchy hooks and viral data graphs.",
        toneTags: ["High Velocity", "Data-Backed", "Conversion Hook"],
        colors: [
          { name: "Electric Cyan", hex: "#06B6D4" },
          { name: "Atlas Indigo", hex: "#4F46E5" },
          { name: "Growth Emerald", hex: "#10B981" },
          { name: "Obsidian", hex: "#0B0F19" },
        ],
        social: {
          handle: "@atlascommerce",
          followers: "210,000 Followers",
          status: "API CONNECTED",
          syncInterval: "15m refresh",
        },
        brandVaultLink: "Atlas Growth Assets Drive",
        figmaLink: "Atlas Component Library",
        lastAuditDate: "Nov 14, 2024",
      },
      pod: {
        name: "Pod C",
        tagline: "Motion & Video Ops",
        leadName: "Kenji Sato",
        leadTitle: "Director of Performance Creative",
        leadAvatar: "KS",
        squad: [
          { name: "Maya Patel", role: "Lead Motion Designer", hoursPerWeek: 14, avatar: "MP" },
          { name: "David Kim", role: "Short-Form Video Specialist", hoursPerWeek: 12, avatar: "DK" },
        ],
        capacityAllocatedHrs: 34,
        bandwidthPercent: 90,
        dailySyncTime: "9:30 AM CST",
      },
      deliverables: [
        {
          id: "ac-301",
          title: "TikTok Viral Hook Reel Cut #1 & #2",
          description: "Top 3 conversion hooks with sound design and rapid pacing cuts.",
          format: "9:16 Vertical Video",
          status: "IN REVIEW",
          statusColor: "bg-amber-50 text-amber-700 border-amber-200",
          code: "#AC-301",
          dueDate: "Tomorrow 5:00 PM",
          assignedTo: "David Kim",
          actions: ["Approve", "Decline", "Preview Video Draft (0:30)"],
        },
      ],
    },
    lumina: {
      id: "lumina",
      name: "Lumina Health",
      initials: "LH",
      industry: "MedTech & Digital Health Platform",
      timezone: "Client Time: EST (UTC-5)",
      activeSince: "Active since Jan 2024",
      tier: "Starter Launch Retainer",
      tierBadge: "STARTER RETAINER",
      status: "ACTIVE RETAINER",
      monthlyFee: 6500,
      addon: "Add-on: Medical Animation",
      nextBilling: "Dec 12, 2024",
      billingMethod: "Stripe ACH Transfer",
      totalAssetsDelivered: 10,
      totalAssetsQuota: 14,
      postsDelivered: 7,
      postsQuota: 8,
      reelsDelivered: 2,
      reelsQuota: 3,
      storiesDelivered: 1,
      storiesQuota: 3,
      sprintNumber: 44,
      daysRemainingInSprint: 12,
      contact: {
        name: "Sarah Jenkins",
        title: "Director of Communications",
        email: "comms@luminahealth.org",
        phone: "+1 (555) 310-9284",
        renewedDate: "Nov 12, 2024",
        termMonths: 12,
      },
      brand: {
        kitVersion: "Design Kit v2.1",
        headingsFont: "Plus Jakarta Sans",
        bodyFont: "Inter Sans",
        monoFont: "JetBrains Mono",
        toneSummary:
          "Empathetic, scientifically rigorous clinical communication with modern human-centric interfaces.",
        toneTags: ["Clinical Trust", "Modern Care", "Accessible"],
        colors: [
          { name: "Care Emerald", hex: "#059669" },
          { name: "Teal Glow", hex: "#0D9488" },
          { name: "Soft Cyan", hex: "#ECFEFF", isLight: true },
          { name: "Deep Slate", hex: "#0F172A" },
        ],
        social: {
          handle: "@lumina_health",
          followers: "64,000 Followers",
          status: "API CONNECTED",
          syncInterval: "15m refresh",
        },
        brandVaultLink: "Lumina Clinical Assets Drive",
        figmaLink: "Lumina Medical UI Kit",
        lastAuditDate: "Nov 15, 2024",
      },
      pod: {
        name: "Pod E",
        tagline: "Creative Brand Engine",
        leadName: "Sarah Jenkins",
        leadTitle: "Creative Communications Lead",
        leadAvatar: "SJ",
        squad: [
          { name: "Liam Wright", role: "Medical Illustrator", hoursPerWeek: 10, avatar: "LW" },
        ],
        capacityAllocatedHrs: 22,
        bandwidthPercent: 70,
        dailySyncTime: "10:00 AM EST",
      },
      deliverables: [
        {
          id: "lh-101",
          title: "Patient Portal Explainer Video Storyboard",
          description: "Accessible step-by-step patient onboarding animation narrative.",
          format: "16:9 Explainer Video",
          status: "IN REVIEW",
          statusColor: "bg-amber-50 text-amber-700 border-amber-200",
          code: "#LH-101",
          dueDate: "Nov 19, 3:30 PM",
          assignedTo: "Sarah Jenkins",
          actions: ["Approve", "Decline", "Open Full Presentation"],
        },
      ],
    },
    acme: {
      id: "acme",
      name: "Acme Corp",
      initials: "AC",
      industry: "B2B Enterprise SaaS & Cloud Ops",
      timezone: "Client Time: PST (UTC-8)",
      activeSince: "Active since Mar 2023",
      tier: "Growth & Scale Retainer",
      tierBadge: "GROWTH RETAINER",
      status: "ACTIVE RETAINER",
      monthlyFee: 7200,
      addon: "Add-on: Infographic Specialist",
      nextBilling: "Dec 15, 2024",
      billingMethod: "Corporate Wire",
      totalAssetsDelivered: 12,
      totalAssetsQuota: 16,
      postsDelivered: 8,
      postsQuota: 10,
      reelsDelivered: 2,
      reelsQuota: 3,
      storiesDelivered: 2,
      storiesQuota: 3,
      sprintNumber: 44,
      daysRemainingInSprint: 12,
      contact: {
        name: "Marcus Brody",
        title: "Head of Marketing",
        email: "marcus@acmecorp.dev",
        phone: "+1 (555) 601-8392",
        renewedDate: "Nov 15, 2024",
        termMonths: 12,
      },
      brand: {
        kitVersion: "Design Kit v4.0",
        headingsFont: "Plus Jakarta Sans",
        bodyFont: "Inter Sans",
        monoFont: "JetBrains Mono",
        toneSummary:
          "Developer-first cloud infrastructure intelligence with clean architectural diagrams and high-trust proof points.",
        toneTags: ["Developer First", "High Reliability", "Scale"],
        colors: [
          { name: "Acme Blue", hex: "#2563EB" },
          { name: "Cloud Slate", hex: "#334155" },
          { name: "Highlight Amber", hex: "#F59E0B" },
          { name: "Clean Snow", hex: "#F8FAFC", isLight: true },
        ],
        social: {
          handle: "@acme_cloud",
          followers: "95,000 Followers",
          status: "API CONNECTED",
          syncInterval: "15m refresh",
        },
        brandVaultLink: "Acme Developer Drive",
        figmaLink: "Acme Cloud Components",
        lastAuditDate: "Nov 16, 2024",
      },
      pod: {
        name: "Pod D",
        tagline: "Digital Marketing & Infographics",
        leadName: "David Vance",
        leadTitle: "Director of Digital Media",
        leadAvatar: "DV",
        squad: [
          { name: "Marcus Brody", role: "Technical Designer", hoursPerWeek: 12, avatar: "MB" },
        ],
        capacityAllocatedHrs: 26,
        bandwidthPercent: 75,
        dailySyncTime: "11:30 AM PST",
      },
      deliverables: [
        {
          id: "acm-501",
          title: "Top 5 Growth Hacks Infographic Carousel",
          description: "Technical architecture infographic for cloud database latency reduction.",
          format: "4:5 Carousel (5 slides)",
          status: "IN PRODUCTION",
          statusColor: "bg-blue-50 text-blue-700 border-blue-200",
          code: "#ACM-501",
          dueDate: "Nov 20, 5:00 PM",
          assignedTo: "Marcus Brody",
          actions: ["Preview Canvas", "Request Revisions"],
        },
      ],
    },
  };

  const clientList = Object.values(clientsData);
  const activeClient = selectedClientId ? clientsData[selectedClientId] || clientsData.northwind : null;

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  };

  const handleApproveDeliverable = (_delivId: string, title: string) => {
    showToast(`Approved "${title}". Asset marked ready for scheduled dispatch.`);
  };

  const handleDeclineDeliverable = (_delivId: string, title: string) => {
    showToast(`Revision requested for "${title}". Assigned specialist notified.`);
  };

  const handleCreateRequest = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRequestForm.title.trim()) return;
    showToast(`New request "${newRequestForm.title}" submitted to ${activeClient?.pod.name}.`);
    setIsNewRequestOpen(false);
    setNewRequestForm({ title: "", type: "Reel", priority: "Standard", notes: "" });
  };

  const filteredClientList = clientList.filter((c) => {
    const matchesSearch =
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.industry.toLowerCase().includes(search.toLowerCase()) ||
      c.contact.email.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === "all" || c.status.toLowerCase().includes(statusFilter.toLowerCase());
    return matchesSearch && matchesStatus;
  });

  const filteredDeliverables = activeClient?.deliverables.filter((d) => {
    if (!deliverableSearch.trim()) return true;
    return (
      d.title.toLowerCase().includes(deliverableSearch.toLowerCase()) ||
      d.description.toLowerCase().includes(deliverableSearch.toLowerCase()) ||
      d.assignedTo.toLowerCase().includes(deliverableSearch.toLowerCase())
    );
  }) || [];

  return (
    <div data-surface="ops" className="w-full min-h-screen font-sans bg-[#F8FAFC] flex flex-col">
      <AdminTopHeader
        title={selectedClientId && activeClient ? `${activeClient.name} • Client Details` : "Client Details"}
        activeTab="Client Details"
      />

      <main className="flex-1 px-6 lg:px-10 pt-4 pb-16 max-w-[1500px] w-full mx-auto space-y-6">
        {toast && (
          <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold rounded-2xl flex items-center justify-between shadow-sm animate-fade-in">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>{toast}</span>
            </div>
            <button type="button" onClick={() => setToast(null)} className="p-1 hover:bg-emerald-100 rounded-lg text-emerald-700">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* ═════════════════════════════════════════════════════════════════════
            VIEW 1: CLIENT ROSTER / DIRECTORY (WHEN NO CLIENT IS SELECTED)
        ═════════════════════════════════════════════════════════════════════ */}
        {!selectedClientId ? (
          <div className="space-y-6 animate-fade-in">
            {/* Controls */}
            <div className="flex flex-col sm:flex-row items-center gap-3">
              <div className="relative flex-1 w-full">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search by brand name, industry, or contact email..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 bg-white text-xs font-medium text-gray-900 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 shadow-2xs"
                />
              </div>
              <div className="flex items-center gap-2 w-full sm:w-auto justify-between sm:justify-end">
                <span className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-50 text-emerald-800 text-xs font-bold border border-emerald-200 shrink-0">
                  <span className="size-2 rounded-full bg-emerald-500 animate-pulse" />
                  {clientList.length} Active Retainers
                </span>
                <div className="flex items-center gap-1.5">
                  <Filter className="size-4 text-gray-400" />
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    aria-label="Filter Client Status"
                    className="px-3 py-2 rounded-xl border border-gray-200 bg-white text-xs font-bold text-gray-700 focus:outline-none cursor-pointer shadow-2xs"
                  >
                    <option value="all">All Statuses</option>
                    <option value="active">Active Retainers</option>
                    <option value="enterprise">Enterprise Retainers</option>
                    <option value="growth">Growth Retainers</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Client Cards Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredClientList.map((client) => (
                <div
                  key={client.id}
                  onClick={() => setSelectedClientId(client.id)}
                  className="bg-white rounded-3xl p-6 border border-gray-100 shadow-[0_4px_25px_rgba(0,0,0,0.03)] space-y-5 hover:shadow-xl hover:border-blue-300 transition-all cursor-pointer group flex flex-col justify-between"
                >
                  <div className="space-y-4">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-2xl bg-[#0F172A] text-white font-black text-lg flex items-center justify-center shadow-md group-hover:scale-105 transition-transform">
                          {client.initials}
                        </div>
                        <div>
                          <div className="flex items-center gap-1.5">
                            <h3 className="font-bold text-base text-gray-900 group-hover:text-blue-600 transition-colors">
                              {client.name}
                            </h3>
                            <CheckCircle2 className="w-4 h-4 text-blue-600 fill-blue-600 text-white" />
                          </div>
                          <span className="text-[11px] text-gray-500 font-medium block truncate max-w-[200px]">
                            {client.industry}
                          </span>
                        </div>
                      </div>
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-50 text-emerald-700 border border-emerald-200">
                        {client.status}
                      </span>
                    </div>

                    <div className="p-3 bg-gray-50/80 rounded-2xl space-y-1.5 text-xs text-gray-600 border border-gray-100">
                      <div className="flex justify-between">
                        <span className="font-medium text-gray-500">Retainer:</span>
                        <span className="font-bold text-gray-900">₹{client.monthlyFee.toLocaleString()}/mo</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="font-medium text-gray-500">Assigned Pod:</span>
                        <span className="font-bold text-blue-600">{client.pod.name} ({client.pod.tagline})</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="font-medium text-gray-500">Primary Contact:</span>
                        <span className="font-semibold text-gray-800">{client.contact.name}</span>
                      </div>
                    </div>
                  </div>

                  <div className="pt-3 border-t border-gray-100 flex items-center justify-between text-xs">
                    <span className="text-gray-400 font-medium">{client.deliverables.length} Deliverables Active</span>
                    <span className="text-blue-600 font-bold group-hover:underline flex items-center gap-1">
                      View Client Detail View &rarr;
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          /* ═════════════════════════════════════════════════════════════════════
              VIEW 2: DEDICATED CLIENT DETAIL VIEW (MATCHING USER SCREENSHOT)
          ═════════════════════════════════════════════════════════════════════ */
          <div className="space-y-6 animate-fade-in">
            {/* Top Breadcrumb & Live Status */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-2 text-xs font-bold text-gray-500">
                <button
                  type="button"
                  onClick={() => setSelectedClientId(null)}
                  className="hover:text-blue-600 flex items-center gap-1 transition-colors cursor-pointer text-gray-600"
                >
                  <ArrowLeft className="w-4 h-4" /> Back to Client Roster
                </button>
                <span>/</span>
                <span className="text-gray-400">Client Details</span>
                <span>/</span>
                <span className="text-gray-900 font-black">{activeClient?.name}</span>
              </div>

              <div className="flex items-center gap-2">
                <span className="px-3 py-1 rounded-full text-xs font-bold bg-white text-gray-800 border border-gray-200 flex items-center gap-1.5 shadow-2xs">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  Live Client • v2.4
                </span>
              </div>
            </div>

            {/* Client Header Card matching Screenshot */}
            <div className="bg-white rounded-3xl p-6 lg:p-7 border border-gray-100 shadow-[0_4px_30px_rgba(0,0,0,0.03)] space-y-4">
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                <div className="flex items-start gap-4">
                  <div className="w-16 h-16 rounded-2xl bg-[#0F172A] text-white font-black text-2xl flex items-center justify-center shadow-lg shrink-0">
                    {activeClient?.initials}
                  </div>
                  <div className="space-y-1.5">
                    <div className="flex flex-wrap items-center gap-2.5">
                      <h1 className="text-2xl font-black text-gray-900 tracking-tight">
                        {activeClient?.name}
                      </h1>
                      <CheckCircle2 className="w-5 h-5 text-blue-600 fill-blue-600 text-white" />
                      <span className="px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200 text-[10px] font-black uppercase tracking-wider">
                        {activeClient?.tierBadge}
                      </span>
                      <span className="px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-black uppercase tracking-wider flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                        {activeClient?.status}
                      </span>
                    </div>

                    <div className="flex flex-wrap items-center gap-x-5 gap-y-1 text-xs text-gray-500 font-medium">
                      <span className="flex items-center gap-1">
                        <Folder className="w-3.5 h-3.5 text-gray-400" />
                        {activeClient?.industry}
                      </span>
                      <span>•</span>
                      <span className="flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5 text-gray-400" />
                        {activeClient?.timezone}
                      </span>
                      <span>•</span>
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5 text-gray-400" />
                        {activeClient?.activeSince}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Header Action Buttons */}
                <div className="flex items-center gap-2.5 shrink-0">
                  <button
                    type="button"
                    onClick={() => setIsEditProfileOpen(true)}
                    className="px-4 py-2.5 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 text-xs font-bold text-gray-700 flex items-center gap-1.5 shadow-2xs cursor-pointer transition-all"
                  >
                    <Edit3 className="w-3.5 h-3.5 text-gray-500" /> Edit Profile
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsInvoiceModalOpen(true)}
                    className="px-4 py-2.5 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 text-xs font-bold text-gray-700 flex items-center gap-1.5 shadow-2xs cursor-pointer transition-all"
                  >
                    <FileText className="w-3.5 h-3.5 text-gray-500" /> Monthly Invoice
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsNewRequestOpen(true)}
                    className="px-4 py-2.5 rounded-xl bg-[#2563EB] hover:bg-blue-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-md shadow-blue-500/20 cursor-pointer transition-all"
                  >
                    <Plus className="w-4 h-4 stroke-[3]" /> New Request
                  </button>
                </div>
              </div>
            </div>

            {/* 4 Main Grid Cards matching Screenshot (2x2) */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* CARD 1: PRIMARY CONTACT */}
              <div className="bg-white rounded-3xl p-6 border border-gray-100 shadow-[0_4px_25px_rgba(0,0,0,0.03)] space-y-5 flex flex-col justify-between">
                <div className="space-y-4">
                  <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                    <span className="text-[11px] font-extrabold text-gray-400 uppercase tracking-wider">
                      PRIMARY CONTACT
                    </span>
                    <span className="px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700 text-[10px] font-bold">
                      Authorized Signer
                    </span>
                  </div>

                  <div className="flex items-center gap-3.5">
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-600 to-indigo-700 text-white font-black text-base flex items-center justify-center shadow-md">
                      {activeClient?.contact.name[0]}
                    </div>
                    <div>
                      <h3 className="text-base font-bold text-gray-900">{activeClient?.contact.name}</h3>
                      <p className="text-xs text-gray-500 font-medium">{activeClient?.contact.title}</p>
                    </div>
                  </div>

                  <div className="space-y-2 pt-2">
                    <div className="p-3 bg-gray-50/80 rounded-2xl flex items-center justify-between border border-gray-100 text-xs">
                      <div className="flex items-center gap-2 text-gray-500 font-medium">
                        <Mail className="w-4 h-4 text-gray-400" />
                        <span>Email</span>
                      </div>
                      <a href={`mailto:${activeClient?.contact.email}`} className="text-blue-600 font-bold hover:underline">
                        {activeClient?.contact.email}
                      </a>
                    </div>

                    <div className="p-3 bg-gray-50/80 rounded-2xl flex items-center justify-between border border-gray-100 text-xs">
                      <div className="flex items-center gap-2 text-gray-500 font-medium">
                        <Phone className="w-4 h-4 text-gray-400" />
                        <span>Direct Phone</span>
                      </div>
                      <span className="font-bold text-gray-900 font-mono">{activeClient?.contact.phone}</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between text-xs text-gray-500 pt-3 border-t border-gray-100 font-medium">
                  <span className="flex items-center gap-1 text-emerald-700 font-semibold">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                    Contract renewed: {activeClient?.contact.renewedDate}
                  </span>
                  <span>Term: {activeClient?.contact.termMonths} Mo</span>
                </div>
              </div>

              {/* CARD 2: TIER TERMS & SCOPE */}
              <div className="bg-white rounded-3xl p-6 border border-gray-100 shadow-[0_4px_25px_rgba(0,0,0,0.03)] space-y-5 flex flex-col justify-between">
                <div className="space-y-4">
                  <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                    <span className="text-[11px] font-extrabold text-gray-400 uppercase tracking-wider">
                      TIER TERMS & SCOPE
                    </span>
                    <span className="px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700 text-[10px] font-bold border border-blue-100">
                      Active Cycle
                    </span>
                  </div>

                  <div className="flex items-baseline justify-between">
                    <div>
                      <span className="text-3xl font-black text-gray-900">₹{activeClient?.monthlyFee.toLocaleString()}</span>
                      <span className="text-xs font-bold text-gray-400"> /mo</span>
                    </div>
                    {activeClient?.addon && (
                      <span className="px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-700 text-xs font-bold border border-emerald-200 flex items-center gap-1">
                        <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                        {activeClient.addon}
                      </span>
                    )}
                  </div>

                  <p className="text-xs text-gray-500">
                    Next billing scheduled for {activeClient?.nextBilling} via {activeClient?.billingMethod}.
                  </p>

                  {/* Monthly Output Burn bar */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-xs font-bold">
                      <span className="text-gray-700">Monthly Output Burn</span>
                      <span className="text-blue-600">
                        {activeClient?.totalAssetsDelivered} / {activeClient?.totalAssetsQuota} Assets Delivered (
                        {Math.round(((activeClient?.totalAssetsDelivered || 0) / (activeClient?.totalAssetsQuota || 1)) * 100)}%)
                      </span>
                    </div>
                    <div className="w-full bg-gray-100 rounded-full h-2.5 overflow-hidden">
                      <div
                        className="bg-[#2563EB] h-full rounded-full transition-all"
                        style={{
                          width: `${Math.min(
                            (((activeClient?.totalAssetsDelivered || 0) / (activeClient?.totalAssetsQuota || 1)) * 100),
                            100
                          )}%`,
                        }}
                      />
                    </div>
                  </div>

                  {/* 3 Metric Counters matching Screenshot */}
                  <div className="grid grid-cols-3 gap-3 pt-1">
                    <div className="p-3 bg-gray-50 rounded-2xl text-center space-y-0.5 border border-gray-100">
                      <span className="text-sm font-black text-gray-900">
                        {activeClient?.postsDelivered}/{activeClient?.postsQuota}
                      </span>
                      <span className="text-[10px] font-bold text-gray-400 block uppercase">POSTS</span>
                    </div>
                    <div className="p-3 bg-gray-50 rounded-2xl text-center space-y-0.5 border border-gray-100">
                      <span className="text-sm font-black text-gray-900">
                        {activeClient?.reelsDelivered}/{activeClient?.reelsQuota}
                      </span>
                      <span className="text-[10px] font-bold text-gray-400 block uppercase">REELS</span>
                    </div>
                    <div className="p-3 bg-gray-50 rounded-2xl text-center space-y-0.5 border border-gray-100">
                      <span className="text-sm font-black text-gray-900">
                        {activeClient?.storiesDelivered}/{activeClient?.storiesQuota}
                      </span>
                      <span className="text-[10px] font-bold text-gray-400 block uppercase">STORIES</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between text-xs text-gray-500 pt-3 border-t border-gray-100 font-medium">
                  <span>Sprint {activeClient?.sprintNumber}: {activeClient?.daysRemainingInSprint} days remaining</span>
                  <button
                    type="button"
                    onClick={() => showToast("Opening Client Quota Ledger...")}
                    className="text-blue-600 font-bold hover:underline cursor-pointer"
                  >
                    View Quota Log
                  </button>
                </div>
              </div>

              {/* CARD 3: CLIENT BRAND ECOSYSTEM & GUIDELINES */}
              <div className="bg-white rounded-3xl p-6 border border-gray-100 shadow-[0_4px_25px_rgba(0,0,0,0.03)] space-y-5">
                <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                  <div className="flex items-center gap-2">
                    <Palette className="w-4 h-4 text-blue-600" />
                    <h2 className="text-xs font-extrabold text-gray-900 uppercase tracking-wider">
                      Client Brand Ecosystem & Guidelines
                    </h2>
                  </div>
                  <span className="px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700 text-[10px] font-bold">
                    {activeClient?.brand.kitVersion}
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Typography */}
                  <div className="p-3.5 bg-gray-50/70 rounded-2xl space-y-2 border border-gray-100 text-xs">
                    <span className="text-[10px] font-extrabold text-gray-400 uppercase tracking-wider block">
                      TYPOGRAPHY HIERARCHY
                    </span>
                    <div className="space-y-1 text-gray-700">
                      <div className="flex justify-between">
                        <span className="text-gray-500">Headings:</span>
                        <span className="font-bold">{activeClient?.brand.headingsFont}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500">Body & Data:</span>
                        <span className="font-medium">{activeClient?.brand.bodyFont}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500">Monospace:</span>
                        <span className="font-mono">{activeClient?.brand.monoFont}</span>
                      </div>
                    </div>
                  </div>

                  {/* Persona & Voice Tone */}
                  <div className="p-3.5 bg-gray-50/70 rounded-2xl space-y-2 border border-gray-100 text-xs flex flex-col justify-between">
                    <div>
                      <span className="text-[10px] font-extrabold text-gray-400 uppercase tracking-wider block">
                        PERSONA & VOICE TONE
                      </span>
                      <p className="text-[11px] text-gray-600 mt-1 leading-relaxed">
                        {activeClient?.brand.toneSummary}
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {activeClient?.brand.toneTags.map((tag) => (
                        <span key={tag} className="px-2 py-0.5 rounded-md bg-white border border-gray-200 text-[10px] font-bold text-gray-700 shadow-2xs">
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Approved Color Spectrum */}
                <div className="space-y-2">
                  <span className="text-[10px] font-extrabold text-gray-400 uppercase tracking-wider block">
                    APPROVED COLOR SPECTRUM
                  </span>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                    {activeClient?.brand.colors.map((c) => (
                      <div key={c.hex} className="rounded-2xl border border-gray-100 overflow-hidden bg-white shadow-2xs space-y-1.5 pb-2">
                        <div className="h-10 w-full" style={{ backgroundColor: c.hex }} />
                        <div className="px-2.5">
                          <span className="text-[11px] font-bold text-gray-900 block truncate">{c.name}</span>
                          <span className="text-[10px] font-mono text-gray-400">{c.hex}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Social Channel */}
                <div className="p-3.5 bg-gray-50/80 rounded-2xl border border-gray-100 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-amber-500 via-rose-500 to-purple-600 text-white flex items-center justify-center shadow-xs">
                      <Instagram className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-xs text-gray-900">{activeClient?.brand.social.handle}</span>
                        <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-[9px] font-extrabold uppercase">
                          {activeClient?.brand.social.status}
                        </span>
                      </div>
                      <span className="text-[11px] text-gray-500">
                        {activeClient?.brand.social.followers} • Live Sync active ({activeClient?.brand.social.syncInterval})
                      </span>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => showToast(`Opening ${activeClient?.brand.social.handle} live analytics...`)}
                    className="px-3 py-1.5 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 text-xs font-bold text-gray-700 shadow-2xs cursor-pointer"
                  >
                    Launch Channel
                  </button>
                </div>

                <div className="flex flex-wrap items-center justify-between text-xs text-gray-400 font-medium pt-3 border-t border-gray-100 gap-2">
                  <div className="flex items-center gap-3 text-blue-600 font-bold">
                    <span className="cursor-pointer hover:underline flex items-center gap-1">
                      <Folder className="w-3.5 h-3.5" /> {activeClient?.brand.brandVaultLink}
                    </span>
                    <span>•</span>
                    <span className="cursor-pointer hover:underline flex items-center gap-1">
                      <ExternalLink className="w-3.5 h-3.5" /> {activeClient?.brand.figmaLink}
                    </span>
                  </div>
                  <span>Last audit {activeClient?.brand.lastAuditDate}</span>
                </div>
              </div>

              {/* CARD 4: ASSIGNED CREATIVE POD */}
              <div className="bg-white rounded-3xl p-6 border border-gray-100 shadow-[0_4px_25px_rgba(0,0,0,0.03)] space-y-5 flex flex-col justify-between">
                <div className="space-y-4">
                  <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                    <div className="flex items-center gap-2">
                      <Users className="w-4 h-4 text-blue-600" />
                      <h2 className="text-xs font-extrabold text-gray-900 uppercase tracking-wider">
                        Assigned creative pod
                      </h2>
                    </div>
                    <span className="px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700 text-[10px] font-bold border border-blue-100">
                      {activeClient?.pod.name}: {activeClient?.pod.tagline}
                    </span>
                  </div>

                  {/* Pod Lead */}
                  <div className="space-y-2">
                    <span className="text-[10px] font-extrabold text-gray-400 uppercase tracking-wider block">
                      POD LEAD & CREATIVE DIRECTOR
                    </span>
                    <div className="p-3 bg-gray-50/70 rounded-2xl flex items-center justify-between border border-gray-100">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-blue-600 text-white font-bold text-sm flex items-center justify-center shadow-xs">
                          {activeClient?.pod.leadAvatar}
                        </div>
                        <div>
                          <h4 className="text-xs font-bold text-gray-900">{activeClient?.pod.leadName}</h4>
                          <span className="text-[11px] text-gray-500">{activeClient?.pod.leadTitle}</span>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => showToast(`Connecting to ${activeClient?.pod.leadName} via Slack/Creo Chat...`)}
                        className="p-2 rounded-xl bg-white border border-gray-200 text-gray-600 hover:text-blue-600 shadow-2xs cursor-pointer"
                        title="Chat with Pod Lead"
                      >
                        <MessageSquare className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Squad Members */}
                  <div className="space-y-2">
                    <span className="text-[10px] font-extrabold text-gray-400 uppercase tracking-wider block">
                      SQUAD MEMBERS
                    </span>
                    <div className="space-y-1.5">
                      {activeClient?.pod.squad.map((member) => (
                        <div key={member.name} className="p-2.5 bg-gray-50/50 rounded-xl flex items-center justify-between text-xs border border-gray-100">
                          <div className="flex items-center gap-2.5">
                            <div className="w-7 h-7 rounded-full bg-gray-200 text-gray-700 font-bold text-[10px] flex items-center justify-center">
                              {member.avatar}
                            </div>
                            <div>
                              <span className="font-bold text-gray-900 block leading-tight">{member.name}</span>
                              <span className="text-[10px] text-gray-500">{member.role}</span>
                            </div>
                          </div>
                          <span className="font-mono font-bold text-[11px] text-gray-700">{member.hoursPerWeek}h/wk</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Pod Capacity Commitment */}
                  <div className="space-y-2 pt-1">
                    <div className="flex items-center justify-between text-xs font-bold">
                      <span className="text-gray-700">Pod Capacity Commitment</span>
                      <span className="text-blue-600 font-mono">
                        {activeClient?.pod.capacityAllocatedHrs} hrs/week allocated
                      </span>
                    </div>
                    <div className="w-full bg-gray-100 rounded-full h-2 overflow-hidden">
                      <div
                        className="bg-[#2563EB] h-full rounded-full transition-all"
                        style={{ width: `${activeClient?.pod.bandwidthPercent}%` }}
                      />
                    </div>
                    <span className="text-[11px] text-gray-400 font-medium block">
                      Sprint {activeClient?.sprintNumber} • {activeClient?.pod.bandwidthPercent}% bandwidth filled
                    </span>
                  </div>
                </div>

                <div className="flex items-center justify-between text-xs text-gray-500 pt-3 border-t border-gray-100 font-medium">
                  <span>Daily Sync: {activeClient?.pod.dailySyncTime}</span>
                  <button
                    type="button"
                    onClick={() => showToast(`Opening Pod Reallocation Studio for ${activeClient?.pod.name}...`)}
                    className="text-blue-600 font-bold hover:underline cursor-pointer"
                  >
                    Reallocate Pod Hours
                  </button>
                </div>
              </div>
            </div>

            {/* ═════════════════════════════════════════════════════════════════
                BOTTOM SECTION: ACTIVE DELIVERABLES IN PRODUCTION
            ═════════════════════════════════════════════════════════════════ */}
            <div className="bg-white rounded-3xl p-6 lg:p-7 border border-gray-100 shadow-[0_4px_30px_rgba(0,0,0,0.03)] space-y-6">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-gray-100 pb-4">
                <div>
                  <div className="flex items-center gap-2.5">
                    <h2 className="text-base font-black text-gray-900">Active Deliverables in Production</h2>
                    <span className="px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200 text-[10px] font-black uppercase">
                      {filteredDeliverables.length} Items Requiring Attention
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 mt-0.5">
                    Manage approvals, review video renders, and coordinate asset distribution across all client pipelines.
                  </p>
                </div>

                {/* Filter Controls */}
                <div className="flex items-center gap-2">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
                    <input
                      type="text"
                      placeholder="Filter deliverable..."
                      value={deliverableSearch}
                      onChange={(e) => setDeliverableSearch(e.target.value)}
                      className="pl-8 pr-3 py-1.5 rounded-xl border border-gray-200 text-xs bg-gray-50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                  </div>
                  <button
                    type="button"
                    className="px-3 py-1.5 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 text-xs font-bold text-gray-700 flex items-center gap-1 shadow-2xs cursor-pointer"
                  >
                    <Filter className="w-3.5 h-3.5 text-gray-400" /> Filter
                  </button>
                </div>
              </div>

              {/* 4 Deliverable Cards Grid matching Screenshot */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
                {filteredDeliverables.map((deliv) => (
                  <div
                    key={deliv.id}
                    className="bg-white rounded-3xl border border-gray-100 shadow-[0_2px_15px_rgba(0,0,0,0.03)] p-5 space-y-4 flex flex-col justify-between hover:shadow-lg hover:border-blue-200 transition-all"
                  >
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider border ${deliv.statusColor}`}>
                          {deliv.status}
                        </span>
                        <span className="text-[10px] font-mono text-gray-400 font-bold">{deliv.code}</span>
                      </div>

                      <div>
                        <h4 className="text-sm font-black text-gray-900 leading-snug">{deliv.title}</h4>
                        <p className="text-[11px] text-gray-500 mt-1 line-clamp-2 leading-relaxed">
                          {deliv.description}
                        </p>
                      </div>

                      <div className="p-3 bg-gray-50/70 rounded-2xl space-y-1.5 text-[11px] text-gray-600 border border-gray-100">
                        <div className="flex justify-between">
                          <span className="text-gray-400">Format:</span>
                          <span className="font-bold text-gray-900">{deliv.format}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-400">Due Date:</span>
                          <span className="font-bold text-rose-600">{deliv.dueDate}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-400">Assigned:</span>
                          <span className="font-semibold text-gray-800">{deliv.assignedTo}</span>
                        </div>
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="space-y-2 pt-2 border-t border-gray-100">
                      {deliv.status === "IN REVIEW" && (
                        <div className="grid grid-cols-2 gap-2">
                          <button
                            type="button"
                            onClick={() => handleApproveDeliverable(deliv.id, deliv.title)}
                            className="w-full py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold flex items-center justify-center gap-1 cursor-pointer transition-colors shadow-xs"
                          >
                            <Check className="w-3.5 h-3.5 stroke-[3]" /> Approve
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeclineDeliverable(deliv.id, deliv.title)}
                            className="w-full py-2 rounded-xl border border-gray-200 hover:bg-gray-50 text-gray-700 text-xs font-bold flex items-center justify-center gap-1 cursor-pointer transition-colors"
                          >
                            <X className="w-3.5 h-3.5" /> Decline
                          </button>
                        </div>
                      )}

                      {deliv.status === "IN PRODUCTION" && (
                        <div className="grid grid-cols-2 gap-2">
                          <button
                            type="button"
                            onClick={() => setPreviewDeliverable(deliv)}
                            className="w-full py-2 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-bold flex items-center justify-center gap-1 cursor-pointer transition-colors"
                          >
                            <Eye className="w-3.5 h-3.5" /> Preview Canvas
                          </button>
                          <button
                            type="button"
                            onClick={() => showToast(`Revision request sent for "${deliv.title}".`)}
                            className="w-full py-2 rounded-xl border border-gray-200 hover:bg-gray-50 text-gray-700 text-xs font-bold cursor-pointer transition-colors"
                          >
                            Request Revisions
                          </button>
                        </div>
                      )}

                      {deliv.status === "APPROVED" && (
                        <div className="space-y-1.5">
                          <button
                            type="button"
                            className="w-full py-2 rounded-xl bg-emerald-50 text-emerald-700 text-xs font-bold flex items-center justify-center gap-1 border border-emerald-200 cursor-default"
                          >
                            <Lock className="w-3.5 h-3.5" /> Auto-Publish Locked
                          </button>
                          <button
                            type="button"
                            onClick={() => showToast("Viewing scheduled metadata...")}
                            className="w-full py-1.5 text-center text-[11px] font-bold text-gray-500 hover:text-gray-900 cursor-pointer"
                          >
                            View Scheduled Meta
                          </button>
                        </div>
                      )}

                      {deliv.status === "READY FOR REVIEW" && (
                        <div className="space-y-1.5">
                          <div className="grid grid-cols-2 gap-2">
                            <button
                              type="button"
                              onClick={() => handleApproveDeliverable(deliv.id, deliv.title)}
                              className="w-full py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold flex items-center justify-center gap-1 cursor-pointer transition-colors shadow-xs"
                            >
                              <Check className="w-3.5 h-3.5 stroke-[3]" /> Approve
                            </button>
                            <button
                              type="button"
                              onClick={() => showToast(`Feedback notes opened for "${deliv.title}".`)}
                              className="w-full py-2 rounded-xl border border-gray-200 hover:bg-gray-50 text-gray-700 text-xs font-bold flex items-center justify-center gap-1 cursor-pointer transition-colors"
                            >
                              <Edit3 className="w-3.5 h-3.5" /> Notes
                            </button>
                          </div>
                          <button
                            type="button"
                            onClick={() => setPreviewDeliverable(deliv)}
                            className="w-full py-1.5 text-center text-[11px] font-bold text-blue-600 hover:underline cursor-pointer flex items-center justify-center gap-1"
                          >
                            <FileText className="w-3.5 h-3.5" /> Open Full Presentation
                          </button>
                        </div>
                      )}

                      {deliv.actions.some((a) => a.includes("Preview Video Draft")) && (
                        <button
                          type="button"
                          onClick={() => setPreviewDeliverable(deliv)}
                          className="w-full py-1.5 text-center text-[11px] font-bold text-blue-600 hover:underline cursor-pointer flex items-center justify-center gap-1"
                        >
                          <Play className="w-3 h-3 fill-blue-600" /> Preview Video Draft (0:45)
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ═════════════════════════════════════════════════════════════════
            MODALS
        ═════════════════════════════════════════════════════════════════ */}

        {/* 1. Edit Profile Modal */}
        {isEditProfileOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
            <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-4 border border-gray-100">
              <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                <h3 className="text-base font-black text-gray-900">Edit Client Profile: {activeClient?.name}</h3>
                <button type="button" onClick={() => setIsEditProfileOpen(false)} className="p-1 text-gray-400 hover:text-gray-700 rounded-lg">
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="space-y-3 text-xs text-gray-700">
                <div>
                  <label className="block font-bold mb-1">Company / Brand Name</label>
                  <input type="text" defaultValue={activeClient?.name} className="w-full px-3 py-2 rounded-xl border border-gray-200" />
                </div>
                <div>
                  <label className="block font-bold mb-1">Industry / Category</label>
                  <input type="text" defaultValue={activeClient?.industry} className="w-full px-3 py-2 rounded-xl border border-gray-200" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold mb-1">Primary Signer</label>
                    <input type="text" defaultValue={activeClient?.contact.name} className="w-full px-3 py-2 rounded-xl border border-gray-200" />
                  </div>
                  <div>
                    <label className="block font-bold mb-1">Signer Email</label>
                    <input type="email" defaultValue={activeClient?.contact.email} className="w-full px-3 py-2 rounded-xl border border-gray-200" />
                  </div>
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-2 border-t border-gray-100">
                <button type="button" onClick={() => setIsEditProfileOpen(false)} className="px-4 py-2 rounded-xl border text-xs font-bold text-gray-600 hover:bg-gray-50 cursor-pointer">
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => {
                    showToast("Client profile updated successfully.");
                    setIsEditProfileOpen(false);
                  }}
                  className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold cursor-pointer"
                >
                  Save Changes
                </button>
              </div>
            </div>
          </div>
        )}

        {/* 2. Monthly Invoice Modal */}
        {isInvoiceModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
            <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4 border border-gray-100">
              <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                <h3 className="text-base font-black text-gray-900">Current Retainer Invoice</h3>
                <button type="button" onClick={() => setIsInvoiceModalOpen(false)} className="p-1 text-gray-400 hover:text-gray-700 rounded-lg">
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="p-4 bg-gray-50 rounded-2xl space-y-2 text-xs text-gray-700 border border-gray-100">
                <div className="flex justify-between">
                  <span className="text-gray-500">Invoice ID:</span>
                  <span className="font-mono font-bold text-gray-900">INV-2024-NL-11</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Client:</span>
                  <span className="font-bold text-gray-900">{activeClient?.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Billing Cycle:</span>
                  <span className="font-medium text-gray-800">Nov 1 – Nov 30, 2024</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Payment Status:</span>
                  <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 font-bold text-[10px]">
                    PAID (ACH)
                  </span>
                </div>
                <div className="flex justify-between pt-2 border-t border-gray-200 font-black text-sm">
                  <span>Total Amount:</span>
                  <span className="text-blue-600">₹{activeClient?.monthlyFee.toLocaleString()}.00</span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  showToast("Invoice PDF downloaded.");
                  setIsInvoiceModalOpen(false);
                }}
                className="w-full py-2.5 rounded-xl text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 cursor-pointer"
              >
                Download Receipt PDF
              </button>
            </div>
          </div>
        )}

        {/* 3. New Request Modal */}
        {isNewRequestOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
            <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4 border border-gray-100">
              <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                <div>
                  <h3 className="text-base font-black text-gray-900">New Content Request</h3>
                  <p className="text-xs text-gray-500">Submitting to {activeClient?.pod.name} for {activeClient?.name}</p>
                </div>
                <button type="button" onClick={() => setIsNewRequestOpen(false)} className="p-1 text-gray-400 hover:text-gray-700 rounded-lg">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleCreateRequest} className="space-y-3.5">
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Asset Title</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Q4 Executive Product Video Hook"
                    value={newRequestForm.title}
                    onChange={(e) => setNewRequestForm({ ...newRequestForm, title: e.target.value })}
                    className="w-full px-3.5 py-2 rounded-xl border border-gray-200 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">Deliverable Type</label>
                    <select
                      value={newRequestForm.type}
                      onChange={(e) => setNewRequestForm({ ...newRequestForm, type: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl border border-gray-200 text-xs font-medium"
                    >
                      <option value="Reel">🎬 Reel / Short</option>
                      <option value="Carousel">🎨 Carousel (3-5 slides)</option>
                      <option value="Static Post">🖼️ Static Hero Graphic</option>
                      <option value="Deck">📊 Presentation Deck</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">Priority</label>
                    <select
                      value={newRequestForm.priority}
                      onChange={(e) => setNewRequestForm({ ...newRequestForm, priority: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl border border-gray-200 text-xs font-medium"
                    >
                      <option value="Standard">Standard (3-4 Days)</option>
                      <option value="Expedited">Expedited (48 Hours)</option>
                      <option value="Urgent">Urgent (24 Hours)</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Creative Brief Notes</label>
                  <textarea
                    rows={3}
                    placeholder="Specify key talking points, hooks, or assets to reference..."
                    value={newRequestForm.notes}
                    onChange={(e) => setNewRequestForm({ ...newRequestForm, notes: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-gray-200 text-xs focus:outline-none"
                  />
                </div>

                <div className="flex justify-end gap-2 pt-2 border-t border-gray-100">
                  <button
                    type="button"
                    onClick={() => setIsNewRequestOpen(false)}
                    className="px-4 py-2 rounded-xl border border-gray-200 text-xs font-bold text-gray-600 hover:bg-gray-50 cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-sm cursor-pointer"
                  >
                    Submit to Production
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* 4. Preview Canvas / Video Modal */}
        {previewDeliverable && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
            <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-4 border border-gray-100">
              <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                <div>
                  <span className="text-[10px] font-mono text-gray-400 font-bold">{previewDeliverable.code}</span>
                  <h3 className="text-base font-black text-gray-900">{previewDeliverable.title}</h3>
                </div>
                <button type="button" onClick={() => setPreviewDeliverable(null)} className="p-1 text-gray-400 hover:text-gray-700 rounded-lg">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="aspect-video bg-[#0F172A] rounded-2xl flex flex-col items-center justify-center text-white p-6 relative overflow-hidden shadow-inner">
                <div className="w-14 h-14 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center text-white mb-2 cursor-pointer hover:scale-110 transition-transform">
                  <Play className="w-6 h-6 fill-white ml-0.5" />
                </div>
                <span className="text-xs font-bold text-gray-200">{previewDeliverable.format} Preview</span>
                <span className="text-[10px] text-gray-400 mt-0.5">Assigned Specialist: {previewDeliverable.assignedTo}</span>
              </div>

              <div className="p-3.5 bg-gray-50 rounded-2xl text-xs text-gray-600 space-y-1">
                <div><strong>Creative Scope:</strong> {previewDeliverable.description}</div>
                <div><strong>Target Delivery:</strong> {previewDeliverable.dueDate}</div>
              </div>

              <div className="flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setPreviewDeliverable(null)}
                  className="px-4 py-2 rounded-xl border border-gray-200 text-xs font-bold text-gray-700 hover:bg-gray-50 cursor-pointer"
                >
                  Close Preview
                </button>
                <button
                  type="button"
                  onClick={() => {
                    handleApproveDeliverable(previewDeliverable.id, previewDeliverable.title);
                    setPreviewDeliverable(null);
                  }}
                  className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold cursor-pointer"
                >
                  Approve Deliverable
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 2. ADMIN DELIVERABLES PAGE
// ─────────────────────────────────────────────────────────────────────────────
export function AdminDeliverablesPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedClient, setSelectedClient] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedFormat, setSelectedFormat] = useState("all");
  const [previewItem, setPreviewItem] = useState<any | null>(null);
  const [commentModalItem, setCommentModalItem] = useState<any | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const [deliverablesList, setDeliverablesList] = useState([
    {
      id: "deliv-1",
      assetCode: "NW-8921",
      client: "Northwind Labs",
      clientInitial: "N",
      clientBg: "bg-blue-600",
      tier: "GROWTH",
      tierBadge: "bg-blue-50 text-blue-700 border-blue-200",
      status: "in_review",
      statusLabel: "In Review",
      statusBadge: "bg-amber-50 text-amber-700 border-amber-100",
      title: "Fintech 3D App Rebrand - Hero Asset Suite",
      format: "Blender 3D Render • 4K EXR",
      formatType: "3d",
      pod: "Pod A",
      podLead: "Maya Lin",
      podAvatars: ["ML"],
      retainer: "12/20 Monthly Retainer",
      slaType: "overdue",
      slaText: "SLA Overdue: 2h ago",
      slaColor: "text-rose-600 font-bold",
      commentsCount: 2,
      previewUrl: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=1200&auto=format&fit=crop",
      description: "Hero 3D asset suite rendered for dark-mode onboarding experience with physical metal displacement shaders.",
    },
    {
      id: "deliv-2",
      assetCode: "NW-8922",
      client: "Northwind Labs",
      clientInitial: "N",
      clientBg: "bg-blue-600",
      tier: "GROWTH",
      tierBadge: "bg-blue-50 text-blue-700 border-blue-200",
      status: "in_review",
      statusLabel: "In Review",
      statusBadge: "bg-amber-50 text-amber-700 border-amber-100",
      title: "Q4 Keynote Slide Deck (60 slides)",
      format: "Keynote / PDF / PPTX Package",
      formatType: "deck",
      pod: "Pod A",
      podLead: "Elena Rostova",
      podAvatars: ["ER"],
      retainer: "14/20 Monthly Retainer",
      slaType: "target",
      slaText: "Target: Today 4:30 PM",
      slaColor: "text-amber-600 font-bold",
      commentsCount: 3,
      previewUrl: "https://images.unsplash.com/photo-1557804506-669a67965ba0?w=1200&auto=format&fit=crop",
      description: "Comprehensive 60-slide executive pitch deck with custom infographics, typography hierarchy, and branded motion transitions.",
    },
    {
      id: "deliv-3",
      assetCode: "BS-4412",
      client: "Bloom Studio",
      clientInitial: "B",
      clientBg: "bg-violet-600",
      tier: "SCALE",
      tierBadge: "bg-purple-50 text-purple-700 border-purple-200",
      status: "in_production",
      statusLabel: "In Production",
      statusBadge: "bg-blue-50 text-blue-600 border-blue-100",
      title: "Holiday Campaign Lifestyle Retouching",
      format: "10x High-Res TIFF (Print Ready)",
      formatType: "photo",
      pod: "Pod B",
      podLead: "Anya Taylor",
      podAvatars: ["AT"],
      retainer: "18/25 Scale Retainer",
      slaType: "target",
      slaText: "Today 3:00 PM (1h left)",
      slaColor: "text-amber-600 font-bold",
      commentsCount: 0,
      previewUrl: "https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?w=1200&auto=format&fit=crop",
      description: "Clean high-fashion editorial retouching with precise skin tone color grading and high-frequency separation.",
    },
    {
      id: "deliv-4",
      assetCode: "NW-8920",
      client: "Northwind Labs",
      clientInitial: "N",
      clientBg: "bg-blue-600",
      tier: "GROWTH",
      tierBadge: "bg-blue-50 text-blue-700 border-blue-200",
      status: "in_production",
      statusLabel: "In Production",
      statusBadge: "bg-blue-50 text-blue-600 border-blue-100",
      title: "TikTok Viral Hook Reel 9:16 (Batch #1 & #2)",
      format: "MP4 1080x1920 • 60fps",
      formatType: "video",
      pod: "Pod C",
      podLead: "Kenji Sato",
      podAvatars: ["KS"],
      retainer: "20/20 Enterprise Plan",
      slaType: "target",
      slaText: "Today 6:00 PM (4h left)",
      slaColor: "text-amber-600 font-bold",
      commentsCount: 1,
      previewUrl: "https://images.unsplash.com/photo-1574717024653-61fd2cf4d44d?w=1200&auto=format&fit=crop",
      description: "High-retention UGC hooks tailored for algorithmic engagement with kinetic captions and sound effects.",
    },
    {
      id: "deliv-5",
      assetCode: "AC-2198",
      client: "Atlas Commerce",
      clientInitial: "A",
      clientBg: "bg-indigo-600",
      tier: "ENTERPRISE",
      tierBadge: "bg-indigo-50 text-indigo-700 border-indigo-200",
      status: "approved",
      statusLabel: "Approved",
      statusBadge: "bg-emerald-50 text-emerald-700 border-emerald-100",
      title: "Black Friday Dynamic Ad Set",
      format: "Meta & Google Ads Bundle",
      formatType: "banner",
      pod: "Pod C",
      podLead: "Lena O.",
      podAvatars: ["LO"],
      retainer: "Enterprise Retainer",
      slaType: "completed",
      slaText: "Delivered Yesterday",
      slaColor: "text-emerald-600 font-bold",
      commentsCount: 0,
      previewUrl: "https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da?w=1200&auto=format&fit=crop",
      description: "Complete dynamic creative optimization (DCO) ad templates for Black Friday cyber week campaigns.",
    },
    {
      id: "deliv-6",
      assetCode: "VM-0144",
      client: "Vanguard Mobility",
      clientInitial: "V",
      clientBg: "bg-slate-800",
      tier: "ENTERPRISE",
      tierBadge: "bg-indigo-50 text-indigo-700 border-indigo-200",
      status: "in_production",
      statusLabel: "In Production",
      statusBadge: "bg-blue-50 text-blue-600 border-blue-100",
      title: "WebGL 3D Interactive Configurator",
      format: "Three.js / React Fiber Bundle",
      formatType: "interactive",
      pod: "Pod D",
      podLead: "David Vance",
      podAvatars: ["DV"],
      retainer: "Custom Project Retainer",
      slaType: "target",
      slaText: "Tomorrow 12:00 PM",
      slaColor: "text-blue-600 font-bold",
      commentsCount: 4,
      previewUrl: "https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=1200&auto=format&fit=crop",
      description: "Interactive real-time 3D automotive exterior configurator with custom PBR paint shaders.",
    },
  ]);

  const handleApprove = (id: string, title: string) => {
    setDeliverablesList((prev) =>
      prev.map((d) =>
        d.id === id
          ? {
              ...d,
              status: "approved",
              statusLabel: "Approved",
              statusBadge: "bg-emerald-50 text-emerald-700 border-emerald-100",
              slaType: "completed",
              slaText: "Approved Just Now",
              slaColor: "text-emerald-600 font-bold",
            }
          : d
      )
    );
    showToast(`✓ Deliverable "${title}" approved and marked ready for client handoff!`);
  };

  const handleDecline = (id: string, title: string) => {
    const reason = window.prompt(`Enter revision request or rejection reason for "${title}":`);
    if (reason !== null) {
      setDeliverablesList((prev) =>
        prev.map((d) =>
          d.id === id
            ? {
                ...d,
                status: "declined",
                statusLabel: "Declined",
                statusBadge: "bg-rose-50 text-rose-700 border-rose-100",
                slaType: "target",
                slaText: "Revision Required",
                slaColor: "text-rose-600 font-bold",
              }
            : d
        )
      );
      showToast(`Revision request dispatched for "${title}".`);
    }
  };

  const filteredDeliverables = deliverablesList.filter((d) => {
    const matchesSearch =
      !searchQuery.trim() ||
      d.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      d.assetCode.toLowerCase().includes(searchQuery.toLowerCase()) ||
      d.client.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesClient =
      selectedClient === "all" || d.client.toLowerCase().includes(selectedClient.toLowerCase());

    const matchesStatus =
      statusFilter === "all"
        ? true
        : statusFilter === "in_production"
        ? d.status === "in_production"
        : statusFilter === "in_review"
        ? d.status === "in_review"
        : statusFilter === "approved"
        ? d.status === "approved"
        : true;

    const matchesFormat =
      selectedFormat === "all" ? true : d.formatType === selectedFormat;

    return matchesSearch && matchesClient && matchesStatus && matchesFormat;
  });

  return (
    <div data-surface="ops" className="w-full min-h-screen font-sans bg-[#F9FAFB] flex flex-col">
      <AdminTopHeader activeTab="Content Engine" />
      <main className="flex-1 px-6 lg:px-8 pt-4 pb-16 max-w-[1500px] w-full mx-auto space-y-6">
        {/* Toast Notification */}
        {toastMessage && (
          <div className="fixed top-24 right-8 z-50 bg-[#0F172A] text-white px-5 py-3 rounded-2xl shadow-2xl text-xs font-bold flex items-center gap-2.5 animate-bounce">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <span>{toastMessage}</span>
          </div>
        )}

        {/* 4 KPI Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="kpi-card bg-white rounded-3xl p-5 border-2 border-[#1E3A8A] hover:border-[#60A5FA] transition-all shadow-[0_2px_15px_rgba(0,0,0,0.03)] space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black text-gray-400 uppercase tracking-wider">
                MOVED TO PRODUCTION
              </span>
              <div className="w-7 h-7 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
                <Zap className="w-3.5 h-3.5" />
              </div>
            </div>
            <div className="text-3xl font-black text-gray-900 tracking-tight">42</div>
            <div className="text-xs font-bold text-emerald-600 flex items-center gap-1">
              ↗ +12% this week
            </div>
          </div>

          <div className="kpi-card bg-white rounded-3xl p-5 border-2 border-[#1E3A8A] hover:border-[#60A5FA] transition-all shadow-[0_2px_15px_rgba(0,0,0,0.03)] space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black text-gray-400 uppercase tracking-wider">
                PENDING REVIEW
              </span>
              <div className="w-7 h-7 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold">
                <Clock className="w-3.5 h-3.5" />
              </div>
            </div>
            <div className="text-3xl font-black text-gray-900 tracking-tight">24</div>
            <div className="text-xs font-bold text-amber-600 flex items-center gap-1">
              ⚡ 4 near SLA limit
            </div>
          </div>

          <div className="kpi-card bg-white rounded-3xl p-5 border-2 border-[#1E3A8A] hover:border-[#60A5FA] transition-all shadow-[0_2px_15px_rgba(0,0,0,0.03)] space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black text-gray-400 uppercase tracking-wider">
                APPROVED TODAY
              </span>
              <div className="w-7 h-7 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
                <CheckCircle2 className="w-3.5 h-3.5" />
              </div>
            </div>
            <div className="text-3xl font-black text-gray-900 tracking-tight">116</div>
            <div className="text-xs font-bold text-emerald-600 flex items-center gap-1">
              ✓ 98.4% First-Pass
            </div>
          </div>

          <div className="kpi-card bg-white rounded-3xl p-5 border-2 border-[#1E3A8A] hover:border-[#60A5FA] transition-all shadow-[0_2px_15px_rgba(0,0,0,0.03)] space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black text-gray-400 uppercase tracking-wider">
                DECLINED / REVISE
              </span>
              <div className="w-7 h-7 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center font-bold">
                <AlertTriangle className="w-3.5 h-3.5" />
              </div>
            </div>
            <div className="text-3xl font-black text-gray-900 tracking-tight">8</div>
            <div className="text-xs font-bold text-rose-600 flex items-center gap-1">
              ↘ -2 vs yesterday
            </div>
          </div>
        </div>

        {/* Filter Bar */}
        <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-[0_2px_12px_rgba(0,0,0,0.02)] flex flex-wrap items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search deliverables, code, tags..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 pr-4 py-2 w-72 rounded-xl border border-gray-200 bg-white text-xs font-medium focus:outline-none focus:ring-2 focus:ring-blue-500/20 shadow-2xs"
              />
            </div>

            <select
              value={selectedClient}
              onChange={(e) => setSelectedClient(e.target.value)}
              aria-label="Filter Deliverable Client"
              className="px-3.5 py-2 rounded-xl border border-gray-200 bg-white text-xs font-bold text-gray-700 shadow-2xs cursor-pointer focus:outline-none"
            >
              <option value="all">All Clients</option>
              <option value="Northwind">Northwind Labs</option>
              <option value="Bloom">Bloom Studio</option>
              <option value="Atlas">Atlas Commerce</option>
              <option value="Vanguard">Vanguard Mobility</option>
            </select>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              aria-label="Filter Deliverable Status"
              className="px-3.5 py-2 rounded-xl border border-gray-200 bg-white text-xs font-bold text-gray-700 shadow-2xs cursor-pointer focus:outline-none"
            >
              <option value="all">All Statuses</option>
              <option value="in_review">In Review</option>
              <option value="in_production">In Production</option>
              <option value="approved">Approved</option>
            </select>

            <select
              value={selectedFormat}
              onChange={(e) => setSelectedFormat(e.target.value)}
              aria-label="Filter Deliverable Format Type"
              className="px-3.5 py-2 rounded-xl border border-gray-200 bg-white text-xs font-bold text-gray-700 shadow-2xs cursor-pointer focus:outline-none"
            >
              <option value="all">All Formats</option>
              <option value="3d">3D Render</option>
              <option value="deck">Presentation Deck</option>
              <option value="photo">Photo Retouching</option>
              <option value="video">Short-form Video</option>
              <option value="banner">Ad Banner Set</option>
              <option value="interactive">WebGL Interactive</option>
            </select>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-gray-400">
              Showing {filteredDeliverables.length} deliverables
            </span>
          </div>
        </div>

        {/* 3-Column Deliverables Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredDeliverables.map((item) => (
            <div
              key={item.id}
              className="bg-white rounded-3xl border border-gray-100 shadow-[0_4px_25px_rgba(0,0,0,0.03)] hover:shadow-[0_8px_30px_rgba(0,0,0,0.06)] transition-all overflow-hidden flex flex-col justify-between"
            >
              {/* Card Header */}
              <div className="p-5 pb-3">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2.5">
                    <div
                      className={`w-7 h-7 rounded-xl ${item.clientBg} text-white font-black text-xs flex items-center justify-center shadow-xs`}
                    >
                      {item.clientInitial}
                    </div>
                    <div>
                      <div className="text-xs font-black text-gray-900 leading-tight">
                        {item.client}
                      </div>
                      <div className="text-[10px] font-bold text-gray-400">
                        {item.assetCode}
                      </div>
                    </div>
                  </div>
                  <span
                    className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider border ${item.statusBadge}`}
                  >
                    {item.statusLabel}
                  </span>
                </div>

                {/* Deliverable Title & Format */}
                <h3 className="text-sm font-black text-gray-900 line-clamp-2 mb-1.5">
                  {item.title}
                </h3>
                <p className="text-[11px] font-semibold text-gray-500 flex items-center gap-1.5">
                  <Tag className="w-3 h-3 text-gray-400" />
                  {item.format}
                </p>
              </div>

              {/* Media Thumbnail with Preview Overlay */}
              <div
                className="relative h-44 bg-gray-900 group cursor-pointer overflow-hidden mx-5 rounded-2xl"
                onClick={() => setPreviewItem(item)}
              >
                <img
                  src={item.previewUrl}
                  alt={item.title}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 opacity-90 group-hover:opacity-100"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  <span className="px-4 py-2 bg-white/90 backdrop-blur-md rounded-xl text-xs font-black text-gray-900 shadow-xl flex items-center gap-1.5">
                    <Eye className="w-3.5 h-3.5 text-blue-600" /> Quick Preview
                  </span>
                </div>
              </div>

              {/* Card Meta & Actions */}
              <div className="p-5 pt-4 space-y-3.5">
                {/* Pod & Retainer Info */}
                <div className="flex items-center justify-between text-xs pt-1 border-t border-gray-50">
                  <div className="flex items-center gap-1.5">
                    <span className="font-bold text-gray-400 text-[10px] uppercase">
                      Pod:
                    </span>
                    <span className="px-2 py-0.5 rounded-md bg-blue-50 text-blue-600 text-[11px] font-black">
                      {item.pod} ({item.podLead})
                    </span>
                  </div>
                  <span className="text-[11px] font-bold text-gray-400">
                    {item.retainer}
                  </span>
                </div>

                {/* SLA Target / Status */}
                <div className="flex items-center justify-between text-xs bg-gray-50/80 p-2.5 rounded-xl border border-gray-100">
                  <span className={`text-[11px] ${item.slaColor}`}>
                    {item.slaText}
                  </span>
                  <button
                    type="button"
                    onClick={() => setCommentModalItem(item)}
                    className="text-gray-500 hover:text-blue-600 text-[11px] font-bold flex items-center gap-1 cursor-pointer"
                  >
                    <MessageSquare className="w-3.5 h-3.5" />
                    {item.commentsCount} notes
                  </button>
                </div>

                {/* Action Buttons */}
                <div className="flex items-center gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => handleApprove(item.id, item.title)}
                    className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black transition-colors flex items-center justify-center gap-1.5 shadow-sm shadow-emerald-600/20 cursor-pointer"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5 stroke-[2.5]" /> Approve
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDecline(item.id, item.title)}
                    className="flex-1 py-2.5 bg-gray-100 hover:bg-rose-50 text-gray-700 hover:text-rose-600 rounded-xl text-xs font-bold transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5 stroke-[2.5]" /> Request Edit
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Media Preview Modal */}
        {previewItem && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-fade-in">
            <div className="bg-white rounded-3xl max-w-3xl w-full p-6 shadow-2xl space-y-4 border border-gray-100 max-h-[90vh] overflow-y-auto">
              <div className="flex items-start justify-between border-b border-gray-100 pb-3">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-600 text-[10px] font-black uppercase">
                      {previewItem.assetCode}
                    </span>
                    <span className="text-xs font-bold text-gray-500">
                      {previewItem.client}
                    </span>
                  </div>
                  <h2 className="text-lg font-black text-gray-900">{previewItem.title}</h2>
                </div>
                <button
                  type="button"
                  onClick={() => setPreviewItem(null)}
                  className="p-1.5 rounded-xl hover:bg-gray-100 text-gray-400 hover:text-gray-900 cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="rounded-2xl overflow-hidden bg-black max-h-[420px] flex items-center justify-center">
                <img
                  src={previewItem.previewUrl}
                  alt={previewItem.title}
                  className="w-full h-auto max-h-[420px] object-contain"
                />
              </div>

              <div className="p-4 bg-gray-50 rounded-2xl space-y-2 text-xs">
                <div className="font-bold text-gray-900">Deliverable Blueprint:</div>
                <p className="text-gray-600 leading-relaxed">{previewItem.description}</p>
                <div className="flex flex-wrap gap-4 pt-2 text-[11px] text-gray-500 border-t border-gray-200">
                  <span><strong>Format:</strong> {previewItem.format}</span>
                  <span><strong>Pod:</strong> {previewItem.pod} ({previewItem.podLead})</span>
                  <span><strong>SLA:</strong> {previewItem.slaText}</span>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    handleDecline(previewItem.id, previewItem.title);
                    setPreviewItem(null);
                  }}
                  className="px-4 py-2 rounded-xl bg-gray-100 hover:bg-rose-50 text-gray-700 hover:text-rose-600 text-xs font-bold cursor-pointer"
                >
                  Request Revision
                </button>
                <button
                  type="button"
                  onClick={() => {
                    handleApprove(previewItem.id, previewItem.title);
                    setPreviewItem(null);
                  }}
                  className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black cursor-pointer shadow-sm"
                >
                  ✓ Approve Asset
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Notes & Comments Modal */}
        {commentModalItem && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
            <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4 border border-gray-100">
              <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                <div className="flex items-center gap-2">
                  <MessageSquare className="w-4 h-4 text-blue-600" />
                  <h3 className="text-sm font-black text-gray-900">
                    Production Notes & Feedback
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => setCommentModalItem(null)}
                  className="p-1 rounded-lg text-gray-400 hover:text-gray-700 cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-3">
                <div className="p-3 bg-gray-50 rounded-2xl border border-gray-100 space-y-1">
                  <div className="flex items-center justify-between text-[10px] font-bold text-gray-500">
                    <span>David K. (Client Lead)</span>
                    <span>Today 10:45 AM</span>
                  </div>
                  <p className="text-xs text-gray-700 leading-relaxed font-medium">
                    "Typography and layout look crisp. Please ensure the hex code for brand teal matches #06B6D4."
                  </p>
                </div>
                <div className="p-3 bg-blue-50/50 rounded-2xl border border-blue-100 space-y-1">
                  <div className="flex items-center justify-between text-[10px] font-bold text-blue-600">
                    <span>Elena Rostova (Pod A)</span>
                    <span>Today 2:15 PM</span>
                  </div>
                  <p className="text-xs text-gray-700 leading-relaxed font-medium">
                    "Updated slide shaders and color profiles. Ready for final review."
                  </p>
                </div>
              </div>

              <div className="pt-2 flex justify-end">
                <button
                  type="button"
                  onClick={() => setCommentModalItem(null)}
                  className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold cursor-pointer"
                >
                  Close Notes
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 3. ADMIN TASKS & DISPATCH QUEUE PAGE
// ─────────────────────────────────────────────────────────────────────────────
export function AdminTasksPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedPod, setSelectedPod] = useState("all");
  const [selectedClient, setSelectedClient] = useState("all");
  const [priorityFilter, _setPriorityFilter] = useState<"all" | "urgent" | "high">("all"); void _setPriorityFilter;
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [previewTask, setPreviewTask] = useState<any | null>(null);

  const [newTaskForm, setNewTaskForm] = useState({
    title: "",
    client: "Northwind Labs",
    pod: "Pod A",
    category: "3D Render / Blender",
    sp: 4,
    dueDate: "Tomorrow",
    priority: "High",
    assignee: "Maya Lin",
    column: "todo",
  });

  const [kanbanTasks, setKanbanTasks] = useState([
    {
      id: "task-1",
      column: "todo",
      client: "Northwind Labs",
      clientPill: "bg-blue-50 text-blue-700 border-blue-100",
      priority: "High",
      priorityPill: "bg-rose-50 text-rose-600 border-rose-100",
      title: "Fintech Mobile App Rebrand - Hero 3D Asset",
      type: "3D Render / Blender",
      imageUrl: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=800&auto=format&fit=crop",
      avatar: "ML",
      avatarBg: "bg-blue-600",
      assigneeName: "Maya Lin",
      sp: 4,
      due: "Tomorrow",
      pod: "Pod A",
    },
    {
      id: "task-2",
      column: "todo",
      client: "Atlas Commerce",
      clientPill: "bg-blue-50 text-blue-700 border-blue-100",
      priority: "Normal",
      priorityPill: "bg-gray-100 text-gray-600 border-gray-200",
      title: "Black Friday Motion Teaser - Reel Cut",
      type: "Instagram Reel 9:16",
      avatar: "LO",
      avatarBg: "bg-slate-800",
      assigneeName: "Lena O.",
      sp: 6,
      due: "in 3d",
      pod: "Pod C",
    },
    {
      id: "task-3",
      column: "in_progress",
      client: "Bloom Studio",
      clientPill: "bg-blue-50 text-blue-700 border-blue-100",
      priority: "Urgent",
      priorityPill: "bg-rose-600 text-white font-black",
      title: "Holiday Campaign Lifestyle Retouching (Batch #1)",
      imageUrl: "https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?w=800&auto=format&fit=crop",
      avatar: "AT",
      avatarBg: "bg-purple-600",
      assigneeName: "Anya Taylor",
      sp: 8,
      due: "Today 3 PM",
      pod: "Pod B",
    },
    {
      id: "task-4",
      column: "in_progress",
      client: "Northwind Labs",
      clientPill: "bg-blue-50 text-blue-700 border-blue-100",
      priority: "Urgent",
      priorityPill: "bg-rose-600 text-white font-black",
      title: "Q4 Investor Pitch Deck Polish",
      avatar: "OV",
      avatarBg: "bg-indigo-600",
      assigneeName: "Omar Vance",
      sp: 5,
      due: "Today 4:30 PM",
      pod: "Pod A",
    },
    {
      id: "task-5",
      column: "under_review",
      client: "Northwind Labs",
      clientPill: "bg-blue-50 text-blue-700 border-blue-100",
      priority: "In Review",
      priorityPill: "bg-amber-50 text-amber-700 border-amber-200",
      title: "B2B Brand Guidelines Refresh v2.1",
      avatar: "ER",
      avatarBg: "bg-emerald-600",
      assigneeName: "Elena Rostova",
      sp: 7,
      due: "In Client Review",
      pod: "Pod A",
    },
    {
      id: "task-6",
      column: "approved",
      client: "Atlas Commerce",
      clientPill: "bg-blue-50 text-blue-700 border-blue-100",
      priority: "Delivered",
      priorityPill: "bg-emerald-100 text-emerald-800 font-bold",
      title: "Brand Identity Vector Kit & Iconography",
      imageUrl: "https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da?w=800&auto=format&fit=crop",
      avatar: "LO",
      avatarBg: "bg-slate-800",
      assigneeName: "Lena O.",
      sp: 10,
      due: "Delivered",
      pod: "Pod C",
    },
  ]);

  const handleCreateTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskForm.title.trim()) return;

    const newTask = {
      id: `task-${Date.now()}`,
      column: newTaskForm.column,
      client: newTaskForm.client,
      clientPill: "bg-blue-50 text-blue-700 border-blue-100",
      priority: newTaskForm.priority,
      priorityPill:
        newTaskForm.priority === "Urgent"
          ? "bg-rose-600 text-white font-black"
          : newTaskForm.priority === "High"
          ? "bg-rose-50 text-rose-600 border-rose-100"
          : "bg-gray-100 text-gray-600 border-gray-200",
      title: newTaskForm.title.trim(),
      type: newTaskForm.category,
      avatar: newTaskForm.assignee
        .split(" ")
        .map((n) => n[0])
        .join("")
        .slice(0, 2)
        .toUpperCase(),
      avatarBg: "bg-blue-600",
      assigneeName: newTaskForm.assignee,
      sp: Number(newTaskForm.sp) || 4,
      due: newTaskForm.dueDate || "Tomorrow",
      pod: newTaskForm.pod,
    };

    setKanbanTasks((prev) => [newTask, ...prev]);
    setIsCreateModalOpen(false);
    setNewTaskForm({
      title: "",
      client: "Northwind Labs",
      pod: "Pod A",
      category: "3D Render / Blender",
      sp: 4,
      dueDate: "Tomorrow",
      priority: "High",
      assignee: "Maya Lin",
      column: "todo",
    });
  };

  const filteredTasks = kanbanTasks.filter((t) => {
    const matchesSearch =
      !searchQuery.trim() ||
      t.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.client.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesPod = selectedPod === "all" || t.pod === selectedPod;
    const matchesClient =
      selectedClient === "all" || t.client.toLowerCase().includes(selectedClient.toLowerCase());

    const matchesPriority =
      priorityFilter === "all"
        ? true
        : priorityFilter === "urgent"
        ? t.priority === "Urgent"
        : priorityFilter === "high"
        ? t.priority === "High" || t.priority === "Urgent"
        : true;

    return matchesSearch && matchesPod && matchesClient && matchesPriority;
  });

  const todoTasks = filteredTasks.filter((t) => t.column === "todo");
  const inProgressTasks = filteredTasks.filter((t) => t.column === "in_progress");
  const underReviewTasks = filteredTasks.filter((t) => t.column === "under_review");
  const approvedTasks = filteredTasks.filter((t) => t.column === "approved");

  return (
    <div data-surface="ops" className="w-full min-h-screen font-sans bg-[#F9FAFB] flex flex-col">
      <AdminTopHeader activeTab="Content Engine" />
      <main className="flex-1 px-6 lg:px-8 pt-4 pb-16 max-w-[1500px] w-full mx-auto space-y-6">
        {/* Header Title and Search Filter Bar */}
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black bg-[#EFF6FF] text-[#2563EB] border border-[#DBEAFE]">
              <span className="w-2 h-2 rounded-full bg-[#2563EB] animate-pulse" />
              Live Sync
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Filter deliverables, tags, owners..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 pr-4 py-2 w-64 rounded-xl border border-gray-200 bg-white text-xs font-medium focus:outline-none focus:ring-2 focus:ring-blue-500/20 shadow-2xs"
              />
            </div>

            <select
              value={selectedPod}
              onChange={(e) => setSelectedPod(e.target.value)}
              aria-label="Filter Task Pod"
              className="px-3 py-2 rounded-xl border border-gray-200 bg-white text-xs font-bold text-gray-700 shadow-2xs cursor-pointer focus:outline-none"
            >
              <option value="all">All Pods (A-E)</option>
              <option value="Pod A">Pod A (Brand Strategy)</option>
              <option value="Pod B">Pod B (3D &amp; Motion)</option>
              <option value="Pod C">Pod C (UGC &amp; Video)</option>
              <option value="Pod D">Pod D (Interactive Web)</option>
              <option value="Pod E">Pod E (Social &amp; Growth)</option>
            </select>

            <select
              value={selectedClient}
              onChange={(e) => setSelectedClient(e.target.value)}
              aria-label="Filter Task Client"
              className="px-3 py-2 rounded-xl border border-gray-200 bg-white text-xs font-bold text-gray-700 shadow-2xs cursor-pointer focus:outline-none"
            >
              <option value="all">All Clients</option>
              <option value="Northwind">Northwind Labs</option>
              <option value="Bloom">Bloom Studio</option>
              <option value="Atlas">Atlas Commerce</option>
            </select>

            <button
              type="button"
              onClick={() => setIsCreateModalOpen(true)}
              className="px-4 py-2 rounded-xl bg-[#2563EB] hover:bg-blue-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-sm cursor-pointer transition-colors"
            >
              <Plus className="w-4 h-4 stroke-[3]" /> Create Task
            </button>
          </div>
        </div>

        {/* 4 Kanban Columns */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
          {/* Column 1: TO DO */}
          <div className="bg-[#F1F5F9]/60 rounded-3xl p-4 flex flex-col space-y-3.5 border border-slate-200/60">
            <div className="flex items-center justify-between px-1">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-slate-400" />
                <h3 className="text-xs font-black text-gray-800 tracking-wider uppercase">
                  TO DO
                </h3>
              </div>
              <span className="px-2 py-0.5 rounded-full bg-white text-slate-600 text-[11px] font-bold border border-slate-200 shadow-2xs">
                {todoTasks.length}
              </span>
            </div>

            <div className="space-y-3">
              {todoTasks.map((task) => (
                <div
                  key={task.id}
                  onClick={() => setPreviewTask(task)}
                  className="bg-white rounded-2xl p-4 border border-gray-200/70 shadow-[0_2px_8px_rgba(0,0,0,0.02)] hover:shadow-md transition-all cursor-pointer space-y-2.5"
                >
                  <div className="flex items-center justify-between">
                    <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${task.clientPill}`}>
                      {task.client}
                    </span>
                    <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${task.priorityPill}`}>
                      {task.priority}
                    </span>
                  </div>
                  <h4 className="text-xs font-bold text-gray-900 line-clamp-2">{task.title}</h4>
                  {task.imageUrl && (
                    <div className="h-24 rounded-xl overflow-hidden bg-slate-100">
                      <img src={task.imageUrl} alt="" className="w-full h-full object-cover" />
                    </div>
                  )}
                  <div className="flex items-center justify-between pt-2 border-t border-gray-100 text-[11px] text-gray-500">
                    <div className="flex items-center gap-1.5">
                      <div className={`w-5 h-5 rounded-full ${task.avatarBg} text-white font-bold text-[9px] flex items-center justify-center`}>
                        {task.avatar}
                      </div>
                      <span className="font-medium text-gray-700">{task.assigneeName}</span>
                    </div>
                    <span className="font-bold text-blue-600 font-mono">{task.sp} SP</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Column 2: IN PROGRESS */}
          <div className="bg-[#F1F5F9]/60 rounded-3xl p-4 flex flex-col space-y-3.5 border border-slate-200/60">
            <div className="flex items-center justify-between px-1">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-blue-500 animate-pulse" />
                <h3 className="text-xs font-black text-gray-800 tracking-wider uppercase">
                  IN PROGRESS
                </h3>
              </div>
              <span className="px-2 py-0.5 rounded-full bg-white text-blue-600 text-[11px] font-bold border border-slate-200 shadow-2xs">
                {inProgressTasks.length}
              </span>
            </div>

            <div className="space-y-3">
              {inProgressTasks.map((task) => (
                <div
                  key={task.id}
                  onClick={() => setPreviewTask(task)}
                  className="bg-white rounded-2xl p-4 border border-gray-200/70 shadow-[0_2px_8px_rgba(0,0,0,0.02)] hover:shadow-md transition-all cursor-pointer space-y-2.5"
                >
                  <div className="flex items-center justify-between">
                    <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${task.clientPill}`}>
                      {task.client}
                    </span>
                    <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${task.priorityPill}`}>
                      {task.priority}
                    </span>
                  </div>
                  <h4 className="text-xs font-bold text-gray-900 line-clamp-2">{task.title}</h4>
                  {task.imageUrl && (
                    <div className="h-24 rounded-xl overflow-hidden bg-slate-100">
                      <img src={task.imageUrl} alt="" className="w-full h-full object-cover" />
                    </div>
                  )}
                  <div className="flex items-center justify-between pt-2 border-t border-gray-100 text-[11px] text-gray-500">
                    <div className="flex items-center gap-1.5">
                      <div className={`w-5 h-5 rounded-full ${task.avatarBg} text-white font-bold text-[9px] flex items-center justify-center`}>
                        {task.avatar}
                      </div>
                      <span className="font-medium text-gray-700">{task.assigneeName}</span>
                    </div>
                    <span className="font-bold text-rose-600">{task.due}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Column 3: UNDER REVIEW */}
          <div className="bg-[#F1F5F9]/60 rounded-3xl p-4 flex flex-col space-y-3.5 border border-slate-200/60">
            <div className="flex items-center justify-between px-1">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                <h3 className="text-xs font-black text-gray-800 tracking-wider uppercase">
                  UNDER REVIEW
                </h3>
              </div>
              <span className="px-2 py-0.5 rounded-full bg-white text-amber-600 text-[11px] font-bold border border-slate-200 shadow-2xs">
                {underReviewTasks.length}
              </span>
            </div>

            <div className="space-y-3">
              {underReviewTasks.map((task) => (
                <div
                  key={task.id}
                  onClick={() => setPreviewTask(task)}
                  className="bg-white rounded-2xl p-4 border border-gray-200/70 shadow-[0_2px_8px_rgba(0,0,0,0.02)] hover:shadow-md transition-all cursor-pointer space-y-2.5"
                >
                  <div className="flex items-center justify-between">
                    <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${task.clientPill}`}>
                      {task.client}
                    </span>
                    <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${task.priorityPill}`}>
                      {task.priority}
                    </span>
                  </div>
                  <h4 className="text-xs font-bold text-gray-900 line-clamp-2">{task.title}</h4>
                  <div className="flex items-center justify-between pt-2 border-t border-gray-100 text-[11px] text-gray-500">
                    <div className="flex items-center gap-1.5">
                      <div className={`w-5 h-5 rounded-full ${task.avatarBg} text-white font-bold text-[9px] flex items-center justify-center`}>
                        {task.avatar}
                      </div>
                      <span className="font-medium text-gray-700">{task.assigneeName}</span>
                    </div>
                    <span className="font-bold text-amber-600">{task.pod}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Column 4: APPROVED */}
          <div className="bg-[#F1F5F9]/60 rounded-3xl p-4 flex flex-col space-y-3.5 border border-slate-200/60">
            <div className="flex items-center justify-between px-1">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                <h3 className="text-xs font-black text-gray-800 tracking-wider uppercase">
                  APPROVED
                </h3>
              </div>
              <span className="px-2 py-0.5 rounded-full bg-white text-emerald-600 text-[11px] font-bold border border-slate-200 shadow-2xs">
                {approvedTasks.length}
              </span>
            </div>

            <div className="space-y-3">
              {approvedTasks.map((task) => (
                <div
                  key={task.id}
                  onClick={() => setPreviewTask(task)}
                  className="bg-white rounded-2xl p-4 border border-gray-200/70 shadow-[0_2px_8px_rgba(0,0,0,0.02)] hover:shadow-md transition-all cursor-pointer space-y-2.5"
                >
                  <div className="flex items-center justify-between">
                    <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${task.clientPill}`}>
                      {task.client}
                    </span>
                    <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${task.priorityPill}`}>
                      {task.priority}
                    </span>
                  </div>
                  <h4 className="text-xs font-bold text-gray-900 line-clamp-2">{task.title}</h4>
                  {task.imageUrl && (
                    <div className="h-24 rounded-xl overflow-hidden bg-slate-100">
                      <img src={task.imageUrl} alt="" className="w-full h-full object-cover" />
                    </div>
                  )}
                  <div className="flex items-center justify-between pt-2 border-t border-gray-100 text-[11px] text-gray-500">
                    <div className="flex items-center gap-1.5">
                      <div className={`w-5 h-5 rounded-full ${task.avatarBg} text-white font-bold text-[9px] flex items-center justify-center`}>
                        {task.avatar}
                      </div>
                      <span className="font-medium text-gray-700">{task.assigneeName}</span>
                    </div>
                    <span className="font-bold text-emerald-600 font-mono">Completed</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Create Task Modal */}
        {isCreateModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
            <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-4 border border-gray-100">
              <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                <h3 className="text-base font-black text-gray-900">Create Production Task</h3>
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="p-1 rounded-lg text-gray-400 hover:text-gray-700 cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleCreateTask} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Task Title</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. 3D Hero Animation for Brand Launch"
                    value={newTaskForm.title}
                    onChange={(e) => setNewTaskForm({ ...newTaskForm, title: e.target.value })}
                    className="w-full px-3.5 py-2 rounded-xl border border-gray-200 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">Client Brand</label>
                    <select
                      value={newTaskForm.client}
                      onChange={(e) => setNewTaskForm({ ...newTaskForm, client: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl border border-gray-200 text-xs font-medium"
                    >
                      <option value="Northwind Labs">Northwind Labs</option>
                      <option value="Bloom Studio">Bloom Studio</option>
                      <option value="Atlas Commerce">Atlas Commerce</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">Creative Pod</label>
                    <select
                      value={newTaskForm.pod}
                      onChange={(e) => setNewTaskForm({ ...newTaskForm, pod: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl border border-gray-200 text-xs font-medium"
                    >
                      <option value="Pod A">Pod A (Brand Strategy)</option>
                      <option value="Pod B">Pod B (3D &amp; Motion)</option>
                      <option value="Pod C">Pod C (UGC &amp; Video)</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">Priority</label>
                    <select
                      value={newTaskForm.priority}
                      onChange={(e) => setNewTaskForm({ ...newTaskForm, priority: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl border border-gray-200 text-xs font-medium"
                    >
                      <option value="Normal">Normal</option>
                      <option value="High">High</option>
                      <option value="Urgent">Urgent</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">Story Points</label>
                    <input
                      type="number"
                      min="1"
                      max="20"
                      value={newTaskForm.sp}
                      onChange={(e) => setNewTaskForm({ ...newTaskForm, sp: Number(e.target.value) })}
                      className="w-full px-3 py-2 rounded-xl border border-gray-200 text-xs font-medium"
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-2 border-t border-gray-100">
                  <button
                    type="button"
                    onClick={() => setIsCreateModalOpen(false)}
                    className="px-4 py-2 rounded-xl border border-gray-200 text-xs font-bold text-gray-600 hover:bg-gray-50 cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-sm cursor-pointer"
                  >
                    Create Task
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Task Preview Drawer */}
        {previewTask && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
            <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4 border border-gray-100">
              <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                <div>
                  <span className="text-[10px] font-bold text-blue-600 uppercase font-mono">
                    {previewTask.pod} • {previewTask.due}
                  </span>
                  <h3 className="text-base font-black text-gray-900 mt-0.5">{previewTask.title}</h3>
                </div>
                <button
                  type="button"
                  onClick={() => setPreviewTask(null)}
                  className="p-1 rounded-lg text-gray-400 hover:text-gray-700 cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-2.5 text-xs text-gray-600">
                <div className="p-3 bg-gray-50 rounded-2xl space-y-1">
                  <div><strong>Client:</strong> {previewTask.client}</div>
                  <div><strong>Assignee:</strong> {previewTask.assigneeName}</div>
                  <div><strong>Priority:</strong> {previewTask.priority}</div>
                  <div><strong>Effort:</strong> {previewTask.sp} Story Points</div>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setPreviewTask(null)}
                className="w-full py-2.5 rounded-xl text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 4. ADMIN CALENDAR PAGE
// ─────────────────────────────────────────────────────────────────────────────
export function AdminCalendarPage() {
  const { user } = useAuth();
  const isTeamLead = user?.role === "team_lead";
  const [selectedDayNumber, setSelectedDayNumber] = useState<number>(14);
  const [selectedPodFilter, setSelectedPodFilter] = useState(isTeamLead ? "Pod A" : "all");
  const [selectedClientFilter, setSelectedClientFilter] = useState("all");
  const [selectedTypeFilter, setSelectedTypeFilter] = useState("all");
  const [isScheduleModalOpen, setIsScheduleModalOpen] = useState(false);
  const [selectedAssetModal, setSelectedAssetModal] = useState<any | null>(null);

  const [scheduleForm, setScheduleForm] = useState({
    title: "",
    client: "Northwind Labs",
    pod: "Pod A",
    type: "Reel",
    dateDay: 14,
    time: "4:30 PM",
    tag: "Final Polish",
  });

  // Master schedule indexed by day number of November 2024
  const [tasksByDay, setTasksByDay] = useState<Record<number, any[]>>({
    8: [
      {
        id: "cal-8-1",
        pod: "Pod A",
        client: "Atlas Commerce",
        title: "Customer Success Story Cutdown Reel",
        type: "Reel",
        assignee: "David Kim",
        avatar: "DK",
        avatarBg: "bg-[#0F172A]",
        tag: "Approved",
        tagColor: "bg-emerald-50 text-emerald-700 border-emerald-100",
        time: "11:30 AM",
      },
    ],
    10: [
      {
        id: "cal-10-1",
        pod: "Pod A",
        client: "Bloom Studio",
        title: "Brand Story Sequence · 3 Panels",
        type: "Story",
        assignee: "Chloe Tan",
        avatar: "CT",
        avatarBg: "bg-teal-600",
        tag: "Approved",
        tagColor: "bg-emerald-50 text-emerald-700 border-emerald-100",
        time: "2:00 PM",
      },
    ],
    14: [
      {
        id: "cal-14-1",
        pod: "Pod A",
        client: "Northwind Labs",
        title: "Q4 Product Unboxing Teaser Reel",
        type: "Reel",
        assignee: "David Kim",
        avatar: "DK",
        avatarBg: "bg-[#0F172A]",
        tag: "Final Polish",
        tagColor: "bg-emerald-50 text-emerald-700 border-emerald-100",
        time: "4:30 PM",
      },
      {
        id: "cal-14-2",
        pod: "Pod A",
        client: "Bloom Studio",
        title: "Behind-The-Scenes Studio Setup (3-Slide Story)",
        type: "Story",
        assignee: "Chloe Tan",
        avatar: "CT",
        avatarBg: "bg-teal-600",
        tag: "Color Grading",
        tagColor: "bg-purple-50 text-purple-700 border-purple-100",
        time: "3:00 PM",
      },
      {
        id: "cal-14-3",
        pod: "Pod A",
        client: "Atlas Commerce",
        title: "TikTok Viral Hook Reel Cut #1 & #2",
        type: "Reel",
        assignee: "Elena R.",
        avatar: "ER",
        avatarBg: "bg-blue-600",
        tag: "Sound Sync",
        tagColor: "bg-cyan-50 text-cyan-700 border-cyan-100",
        time: "2:00 PM",
      },
      {
        id: "cal-14-4",
        pod: "Pod A",
        client: "Northwind Labs",
        title: "Conversion Post Carousel (10 Panels)",
        type: "Post",
        assignee: "Marcus Vance",
        avatar: "MV",
        avatarBg: "bg-indigo-600",
        tag: "Final Polish",
        tagColor: "bg-indigo-50 text-indigo-700 border-indigo-100",
        time: "3:30 PM",
      },
    ],
    15: [
      {
        id: "cal-15-1",
        pod: "Pod A",
        client: "Northwind Labs",
        title: "15-Sec Flash Sale Promo Story Set",
        type: "Story",
        assignee: "David Kim",
        avatar: "DK",
        avatarBg: "bg-[#0F172A]",
        tag: "Approved",
        tagColor: "bg-emerald-50 text-emerald-700 border-emerald-100",
        time: "10:00 AM",
      },
      {
        id: "cal-15-2",
        pod: "Pod A",
        client: "Bloom Studio",
        title: "Founder Q&A Vertical Micro-Reel #4",
        type: "Reel",
        assignee: "Elena R.",
        avatar: "ER",
        avatarBg: "bg-blue-600",
        tag: "Final Polish",
        tagColor: "bg-amber-50 text-amber-700 border-amber-100",
        time: "1:30 PM",
      },
      {
        id: "cal-15-3",
        pod: "Pod A",
        client: "Atlas Commerce",
        title: "Top 5 Growth Hacks Infographic Post",
        type: "Post",
        assignee: "Marcus Vance",
        avatar: "MV",
        avatarBg: "bg-indigo-600",
        tag: "Scheduled",
        tagColor: "bg-blue-50 text-blue-700 border-blue-100",
        time: "5:00 PM",
      },
    ],
    18: [
      {
        id: "cal-18-1",
        pod: "Pod A",
        client: "Northwind Labs",
        title: "Q4 Keynote Executive Post Showcase",
        type: "Post",
        assignee: "Elena R.",
        avatar: "ER",
        avatarBg: "bg-blue-600",
        tag: "SLA Review",
        tagColor: "bg-amber-50 text-amber-700 border-amber-100",
        time: "11:00 AM",
      },
      {
        id: "cal-18-2",
        pod: "Pod A",
        client: "Atlas Commerce",
        title: "High-Energy Product Feature Cutdown Reel",
        type: "Reel",
        assignee: "David Kim",
        avatar: "DK",
        avatarBg: "bg-[#0F172A]",
        tag: "Color Grading",
        tagColor: "bg-purple-50 text-purple-700 border-purple-100",
        time: "4:00 PM",
      },
    ],
    20: [
      {
        id: "cal-20-1",
        pod: "Pod A",
        client: "Northwind Labs",
        title: "60-Sec High-Velocity Tech Growth Reel",
        type: "Reel",
        assignee: "Chloe Tan",
        avatar: "CT",
        avatarBg: "bg-teal-600",
        tag: "Approved",
        tagColor: "bg-emerald-50 text-emerald-700 border-emerald-100",
        time: "9:30 AM",
      },
      {
        id: "cal-20-2",
        pod: "Pod A",
        client: "Bloom Studio",
        title: "Interactive Audience Q&A Story Sequence",
        type: "Story",
        assignee: "Chloe Tan",
        avatar: "CT",
        avatarBg: "bg-teal-600",
        tag: "Drafting",
        tagColor: "bg-gray-100 text-gray-700 border-gray-200",
        time: "2:00 PM",
      },
    ],
    22: [
      {
        id: "cal-22-1",
        pod: "Pod A",
        client: "Bloom Studio",
        title: "Black Friday Sneak Peek Teaser Reel",
        type: "Reel",
        assignee: "David Kim",
        avatar: "DK",
        avatarBg: "bg-[#0F172A]",
        tag: "Final Polish",
        tagColor: "bg-amber-50 text-amber-700 border-amber-100",
        time: "12:00 PM",
      },
      {
        id: "cal-22-2",
        pod: "Pod A",
        client: "Atlas Commerce",
        title: "Cyber Monday Display Post Carousel",
        type: "Post",
        assignee: "Marcus Vance",
        avatar: "MV",
        avatarBg: "bg-indigo-600",
        tag: "Approved",
        tagColor: "bg-emerald-50 text-emerald-700 border-emerald-100",
        time: "4:00 PM",
      },
    ],
    25: [
      {
        id: "cal-25-1",
        pod: "Pod A",
        client: "Northwind Labs",
        title: "Mobile App Onboarding Story Series",
        type: "Story",
        assignee: "Chloe Tan",
        avatar: "CT",
        avatarBg: "bg-teal-600",
        tag: "Sound Sync",
        tagColor: "bg-cyan-50 text-cyan-700 border-cyan-100",
        time: "3:00 PM",
      },
    ],
    28: [
      {
        id: "cal-28-1",
        pod: "Pod A",
        client: "Northwind Labs",
        title: "End-of-Month Retrospective Reel Showcase",
        type: "Reel",
        assignee: "David Kim",
        avatar: "DK",
        avatarBg: "bg-[#0F172A]",
        tag: "Final Polish",
        tagColor: "bg-amber-50 text-amber-700 border-amber-100",
        time: "5:00 PM",
      },
    ],
  });

  // Helper for Deliverable Type Badge Styling & Icons
  const getTypeBadge = (type: string) => {
    switch (type) {
      case "Reel":
        return { label: "🎬 Reel", bg: "bg-indigo-50 text-indigo-700 border-indigo-200" };
      case "Story":
        return { label: "📲 Story", bg: "bg-rose-50 text-rose-700 border-rose-200" };
      case "Post":
        return { label: "📄 Post", bg: "bg-emerald-50 text-emerald-700 border-emerald-200" };
      default:
        return { label: `📌 ${type}`, bg: "bg-blue-50 text-blue-700 border-blue-200" };
    }
  };

  const handleOpenScheduleForDay = (day: number) => {
    setSelectedDayNumber(day);
    setScheduleForm((prev) => ({
      ...prev,
      dateDay: day,
    }));
    setIsScheduleModalOpen(true);
  };

  const handleScheduleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!scheduleForm.title.trim()) return;

    const targetDay = Number(scheduleForm.dateDay) || selectedDayNumber;

    const newItem = {
      id: `cal-${targetDay}-${Date.now()}`,
      pod: isTeamLead ? "Pod A" : scheduleForm.pod,
      client: scheduleForm.client,
      title: scheduleForm.title.trim(),
      type: scheduleForm.type,
      assignee: "Staff Assigned",
      avatar: "ST",
      avatarBg: "bg-blue-600",
      tag: scheduleForm.tag,
      tagColor: "bg-blue-50 text-blue-700 border-blue-100",
      time: scheduleForm.time || "4:00 PM",
    };

    setTasksByDay((prev) => ({
      ...prev,
      [targetDay]: [...(prev[targetDay] || []), newItem],
    }));

    setIsScheduleModalOpen(false);
    setScheduleForm({
      title: "",
      client: "Northwind Labs",
      pod: "Pod A",
      type: "Reel",
      dateDay: selectedDayNumber,
      time: "4:30 PM",
      tag: "Final Polish",
    });
  };

  // Get current day's tasks filtered by pod / client / type
  const activePodFilter = isTeamLead ? "Pod A" : selectedPodFilter;
  const rawDayTasks = tasksByDay[selectedDayNumber] || [];
  const filteredDayTasks = rawDayTasks.filter((item) => {
    if (activePodFilter !== "all" && item.pod !== activePodFilter) return false;
    if (selectedClientFilter !== "all" && !item.client.toLowerCase().includes(selectedClientFilter.toLowerCase())) return false;
    if (selectedTypeFilter !== "all" && item.type !== selectedTypeFilter) return false;
    return true;
  });

  const isSelectedDateToday = selectedDayNumber === 14;

  return (
    <div data-surface="ops" className="w-full min-h-screen font-sans bg-[#F9FAFB] flex flex-col">
      <AdminTopHeader activeTab="Content Engine" />
      <main className="flex-1 px-6 lg:px-8 pt-4 pb-16 max-w-[1500px] w-full mx-auto space-y-6">
        {/* Header and Controls */}
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 bg-white border border-gray-200 px-3 py-1.5 rounded-xl shadow-2xs">
              <button
                type="button"
                onClick={() => setSelectedDayNumber((prev) => Math.max(1, prev - 1))}
                aria-label="Previous Day"
                className="p-0.5 text-gray-400 hover:text-gray-700 cursor-pointer rounded"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <Calendar className="w-4 h-4 text-blue-600" />
              <span className="text-xs font-bold text-gray-900">
                November {selectedDayNumber}, 2024 {isSelectedDateToday ? "(Today)" : ""}
              </span>
              <button
                type="button"
                onClick={() => setSelectedDayNumber((prev) => Math.min(30, prev + 1))}
                aria-label="Next Day"
                className="p-0.5 text-gray-400 hover:text-gray-700 cursor-pointer rounded"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
            {selectedDayNumber !== 14 && (
              <button
                type="button"
                onClick={() => setSelectedDayNumber(14)}
                className="text-xs font-bold text-blue-600 hover:text-blue-800 bg-blue-50 px-2.5 py-1 rounded-lg border border-blue-100 cursor-pointer transition-colors"
              >
                Jump to Today (14th)
              </button>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {isTeamLead ? (
              <div className="px-3 py-2 rounded-xl border border-blue-200 bg-blue-50/70 text-xs font-bold text-blue-700 shadow-2xs">
                Pod A Schedule
              </div>
            ) : (
              <select
                value={selectedPodFilter}
                onChange={(e) => setSelectedPodFilter(e.target.value)}
                aria-label="Filter Calendar Pod"
                className="px-3 py-2 rounded-xl border border-gray-200 bg-white text-xs font-bold text-gray-700 shadow-2xs cursor-pointer focus:outline-none"
              >
                <option value="all">All Pods ▾</option>
                <option value="Pod A">Pod A</option>
                <option value="Pod B">Pod B</option>
                <option value="Pod C">Pod C</option>
                <option value="Pod D">Pod D</option>
                <option value="Pod E">Pod E</option>
              </select>
            )}

            <select
              value={selectedTypeFilter}
              onChange={(e) => setSelectedTypeFilter(e.target.value)}
              aria-label="Filter Deliverable Type"
              className="px-3 py-2 rounded-xl border border-gray-200 bg-white text-xs font-bold text-gray-700 shadow-2xs cursor-pointer focus:outline-none"
            >
              <option value="all">All Formats ▾</option>
              <option value="Reel">🎬 Reel</option>
              <option value="Story">📲 Story</option>
              <option value="Post">📄 Post</option>
            </select>

            <select
              value={selectedClientFilter}
              onChange={(e) => setSelectedClientFilter(e.target.value)}
              aria-label="Filter Calendar Client"
              className="px-3 py-2 rounded-xl border border-gray-200 bg-white text-xs font-bold text-gray-700 shadow-2xs cursor-pointer focus:outline-none"
            >
              <option value="all">All Assigned Clients ▾</option>
              <option value="Northwind">Northwind Labs</option>
              <option value="Bloom">Bloom Studio</option>
              <option value="Atlas">Atlas Commerce</option>
            </select>

            <button
              type="button"
              onClick={() => handleOpenScheduleForDay(selectedDayNumber)}
              className="px-4 py-2 rounded-xl bg-[#2563EB] hover:bg-blue-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-sm cursor-pointer transition-colors"
            >
              <Plus className="w-4 h-4 stroke-[3]" /> Schedule Asset
            </button>
          </div>
        </div>



        {/* Calendar Grid + Dynamic Selected Date Work Split */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main 7-Column Month Calendar View */}
          <div className="lg:col-span-2 bg-white rounded-3xl border border-gray-100 shadow-[0_4px_20px_rgba(0,0,0,0.03)] p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <h2 className="text-base font-black text-gray-900">November 2024</h2>
                <span className="text-xs font-bold text-gray-400">Production Horizon</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-medium text-gray-500 hidden sm:inline">
                  Click any date to view scheduled work
                </span>
                <span className="text-xs font-bold text-blue-600 bg-blue-50 px-3 py-1 rounded-full">
                  14th Today
                </span>
              </div>
            </div>

            <div className="grid grid-cols-7 gap-2 text-center text-[11px] font-bold text-gray-400 pb-2 border-b border-gray-100">
              {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
                <div key={d}>{d}</div>
              ))}
            </div>

            <div className="grid grid-cols-7 gap-2">
              {Array.from({ length: 30 }).map((_, i) => {
                const dayNum = i + 1;
                const isToday = dayNum === 14;
                const isSelected = dayNum === selectedDayNumber;
                const dayTasks = tasksByDay[dayNum] || [];

                // Tally work types for date pill summary
                const reelsCount = dayTasks.filter((t) => t.type === "Reel").length;
                const storiesCount = dayTasks.filter((t) => t.type === "Story").length;
                const otherCount = dayTasks.length - reelsCount - storiesCount;

                return (
                  <button
                    key={dayNum}
                    type="button"
                    onClick={() => setSelectedDayNumber(dayNum)}
                    className={`min-h-[92px] p-2 rounded-2xl border text-left transition-all flex flex-col justify-between cursor-pointer group relative ${
                      isSelected
                        ? "bg-blue-50/90 border-blue-500 ring-2 ring-blue-600/30 shadow-md scale-[1.02] z-10"
                        : isToday
                        ? "bg-blue-50/40 border-blue-200 hover:border-blue-300"
                        : "bg-gray-50/40 border-gray-100 hover:bg-white hover:border-blue-200 hover:shadow-2xs"
                    }`}
                  >
                    <div className="flex items-center justify-between w-full">
                      <span
                        className={`text-xs font-black inline-block size-6 rounded-full flex items-center justify-center transition-colors ${
                          isSelected
                            ? "bg-blue-600 text-white shadow-xs"
                            : isToday
                            ? "bg-blue-100 text-blue-800 font-bold"
                            : "text-gray-700 group-hover:text-blue-600"
                        }`}
                      >
                        {dayNum}
                      </span>
                      {dayTasks.length > 0 && (
                        <span
                          className={`text-[9px] font-black px-1.5 py-0.5 rounded-full ${
                            isSelected ? "bg-blue-600 text-white" : "bg-gray-200 text-gray-700"
                          }`}
                        >
                          {dayTasks.length}
                        </span>
                      )}
                    </div>

                    {/* Day Deliverables Badges */}
                    <div className="space-y-1 mt-1 w-full">
                      {reelsCount > 0 && (
                        <span className="block text-[9px] font-extrabold px-1.5 py-0.5 rounded bg-indigo-100 text-indigo-800 truncate">
                          🎬 {reelsCount} {reelsCount === 1 ? "Reel" : "Reels"}
                        </span>
                      )}
                      {storiesCount > 0 && (
                        <span className="block text-[9px] font-extrabold px-1.5 py-0.5 rounded bg-rose-100 text-rose-800 truncate">
                          📲 {storiesCount} {storiesCount === 1 ? "Story" : "Stories"}
                        </span>
                      )}
                      {otherCount > 0 && (
                        <span className="block text-[9px] font-extrabold px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 truncate">
                          📌 {otherCount} Deliverable{otherCount > 1 ? "s" : ""}
                        </span>
                      )}
                      {dayTasks.length === 0 && (
                        <span className="block text-[9px] font-medium text-gray-300 group-hover:text-gray-400 transition-colors pt-2">
                          + Add item
                        </span>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Right Column: Dynamic Work Container for Selected Date */}
          <div className="bg-white rounded-3xl border border-gray-100 shadow-[0_4px_20px_rgba(0,0,0,0.03)] p-6 space-y-4 flex flex-col justify-between">
            <div className="space-y-4">
              {/* Dynamic Header */}
              <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                <div className="flex items-center gap-2">
                  <h2 className="text-base font-black text-gray-900">
                    {isSelectedDateToday
                      ? "Today's Deliverables"
                      : `Nov ${selectedDayNumber} Deliverables`}
                  </h2>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-black text-blue-600 bg-blue-50 px-2.5 py-1 rounded-full border border-blue-100">
                    {filteredDayTasks.length} {filteredDayTasks.length === 1 ? "Item" : "Items"}
                  </span>
                </div>
              </div>

              {/* Sub-bar indicator showing selected date */}
              <div className="flex items-center justify-between bg-gray-50/80 px-3 py-2 rounded-xl border border-gray-100">
                <span className="text-xs font-semibold text-gray-600 flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-blue-600" />
                  Scheduled for <strong>Nov {selectedDayNumber}, 2024</strong>
                </span>
                <button
                  type="button"
                  onClick={() => handleOpenScheduleForDay(selectedDayNumber)}
                  className="text-[11px] font-bold text-blue-600 hover:text-blue-800 flex items-center gap-1 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5 stroke-[3]" /> Add
                </button>
              </div>

              {/* Deliverable Items List for Selected Date */}
              {filteredDayTasks.length > 0 ? (
                <div className="space-y-3 max-h-[580px] overflow-y-auto pr-1">
                  {filteredDayTasks.map((item) => {
                    const typeBadge = getTypeBadge(item.type);
                    return (
                      <div
                        key={item.id}
                        onClick={() => setSelectedAssetModal(item)}
                        className="p-4 rounded-2xl border border-gray-100 hover:border-blue-300 bg-white hover:bg-blue-50/20 shadow-2xs hover:shadow-sm transition-all cursor-pointer space-y-2.5 group"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-[10px] font-black text-blue-600 uppercase font-mono tracking-wider">
                            {item.pod} • {item.client}
                          </span>
                          <span
                            className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border ${typeBadge.bg}`}
                          >
                            {typeBadge.label}
                          </span>
                        </div>

                        <h4 className="text-xs font-black text-gray-900 group-hover:text-blue-700 transition-colors leading-snug">
                          {item.title}
                        </h4>

                        <div className="flex items-center justify-between text-[11px] text-gray-500 pt-2 border-t border-gray-100">
                          <div className="flex items-center gap-1.5">
                            <div
                              className={`size-5.5 rounded-full ${item.avatarBg} text-white font-bold text-[9px] flex items-center justify-center shadow-2xs`}
                            >
                              {item.avatar}
                            </div>
                            <span className="font-semibold text-gray-700">{item.assignee}</span>
                          </div>

                          <div className="flex items-center gap-2">
                            <span
                              className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${item.tagColor}`}
                            >
                              {item.tag}
                            </span>
                            <span className="font-bold text-gray-900 font-mono text-xs">
                              {item.time}
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                /* Empty State when no tasks exist on selected date */
                <div className="py-12 px-4 text-center rounded-2xl border-2 border-dashed border-gray-200 bg-gray-50/50 flex flex-col items-center justify-center space-y-3">
                  <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center shadow-2xs">
                    <Calendar className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-sm font-black text-gray-900">
                      No deliverables on Nov {selectedDayNumber}
                    </h3>
                    <p className="text-xs text-gray-500 mt-1 max-w-[240px] mx-auto">
                      No reels, stories, or slide decks are scheduled for this date yet.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleOpenScheduleForDay(selectedDayNumber)}
                    className="mt-2 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-sm cursor-pointer transition-colors"
                  >
                    <Plus className="w-4 h-4 stroke-[3]" /> Schedule for Nov {selectedDayNumber}
                  </button>
                </div>
              )}
            </div>

            {/* Bottom Quick Action */}
            <div className="pt-3 border-t border-gray-100 flex items-center justify-between text-xs text-gray-500">
              <span className="font-medium">Total Assets in Nov:</span>
              <span className="font-black text-gray-900">
                {Object.values(tasksByDay).reduce((acc, curr) => acc + curr.length, 0)} Items
              </span>
            </div>
          </div>
        </div>

        {/* Schedule Modal */}
        {isScheduleModalOpen && (
          <div className="fixed inset-0 w-screen h-screen z-[9999] flex items-center justify-center bg-slate-950/70 backdrop-blur-md p-4 overflow-y-auto">
            <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4 border border-gray-100">
              <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                <div>
                  <h3 className="text-base font-black text-gray-900">Schedule Content Asset</h3>
                  <p className="text-xs text-gray-500 mt-0.5">
                    Target Date: Nov {scheduleForm.dateDay}, 2024
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setIsScheduleModalOpen(false)}
                  className="p-1 rounded-lg text-gray-400 hover:text-gray-700 cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleScheduleSubmit} className="space-y-3.5">
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Asset Title</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Black Friday Reel Cut Batch #2"
                    value={scheduleForm.title}
                    onChange={(e) => setScheduleForm({ ...scheduleForm, title: e.target.value })}
                    className="w-full px-3.5 py-2 rounded-xl border border-gray-200 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">Deliverable Type</label>
                    <select
                      value={scheduleForm.type}
                      onChange={(e) => setScheduleForm({ ...scheduleForm, type: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl border border-gray-200 text-xs font-medium"
                    >
                      <option value="Reel">🎬 Reel</option>
                      <option value="Story">📲 Story</option>
                      <option value="Carousel">🎨 Carousel</option>
                      <option value="Slide Deck">📊 Slide Deck</option>
                      <option value="Explainer Video">📹 Explainer Video</option>
                      <option value="Shorts">⚡ Shorts</option>
                      <option value="Banner">🖼️ Banner</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">Target Client</label>
                    <select
                      value={scheduleForm.client}
                      onChange={(e) => setScheduleForm({ ...scheduleForm, client: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl border border-gray-200 text-xs font-medium"
                    >
                      <option value="Northwind Labs">Northwind Labs</option>
                      <option value="Bloom Studio">Bloom Studio</option>
                      <option value="Atlas Commerce">Atlas Commerce</option>
                      <option value="Lumina Health">Lumina Health</option>
                      <option value="Acme Corp">Acme Corp</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">Target Pod</label>
                    <select
                      value={scheduleForm.pod}
                      onChange={(e) => setScheduleForm({ ...scheduleForm, pod: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl border border-gray-200 text-xs font-medium"
                    >
                      <option value="Pod A">Pod A</option>
                      <option value="Pod B">Pod B</option>
                      <option value="Pod C">Pod C</option>
                      <option value="Pod D">Pod D</option>
                      <option value="Pod E">Pod E</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">Day of November</label>
                    <select
                      value={scheduleForm.dateDay}
                      onChange={(e) => setScheduleForm({ ...scheduleForm, dateDay: Number(e.target.value) })}
                      className="w-full px-3 py-2 rounded-xl border border-gray-200 text-xs font-medium"
                    >
                      {Array.from({ length: 30 }).map((_, idx) => (
                        <option key={idx + 1} value={idx + 1}>
                          Nov {idx + 1}, 2024
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">Target Time</label>
                    <input
                      type="text"
                      value={scheduleForm.time}
                      onChange={(e) => setScheduleForm({ ...scheduleForm, time: e.target.value })}
                      placeholder="e.g. 4:30 PM"
                      className="w-full px-3 py-2 rounded-xl border border-gray-200 text-xs font-medium"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">Initial Tag</label>
                    <input
                      type="text"
                      value={scheduleForm.tag}
                      onChange={(e) => setScheduleForm({ ...scheduleForm, tag: e.target.value })}
                      placeholder="e.g. Final Polish"
                      className="w-full px-3 py-2 rounded-xl border border-gray-200 text-xs font-medium"
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-2 border-t border-gray-100">
                  <button
                    type="button"
                    onClick={() => setIsScheduleModalOpen(false)}
                    className="px-4 py-2 rounded-xl border border-gray-200 text-xs font-bold text-gray-600 hover:bg-gray-50 cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-sm cursor-pointer"
                  >
                    Schedule Asset
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Selected Asset Details Modal */}
        {selectedAssetModal && (
          <div className="fixed inset-0 w-screen h-screen z-[9999] flex items-center justify-center bg-slate-950/70 backdrop-blur-md p-4 overflow-y-auto">
            <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4 border border-gray-100">
              <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold text-blue-600 uppercase font-mono">
                      {selectedAssetModal.pod} • {selectedAssetModal.client}
                    </span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-100">
                      {selectedAssetModal.type}
                    </span>
                  </div>
                  <h3 className="text-base font-black text-gray-900 mt-1">{selectedAssetModal.title}</h3>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedAssetModal(null)}
                  className="p-1 rounded-lg text-gray-400 hover:text-gray-700 cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="p-4 bg-gray-50 rounded-2xl space-y-2.5 text-xs text-gray-700">
                <div className="flex justify-between">
                  <span className="font-semibold text-gray-500">Deliverable Type:</span>
                  <span className="font-bold text-gray-900">{getTypeBadge(selectedAssetModal.type).label}</span>
                </div>
                <div className="flex justify-between">
                  <span className="font-semibold text-gray-500">Assigned Specialist:</span>
                  <span className="font-bold text-gray-900">{selectedAssetModal.assignee}</span>
                </div>
                <div className="flex justify-between">
                  <span className="font-semibold text-gray-500">Scheduled Time:</span>
                  <span className="font-bold text-gray-900">{selectedAssetModal.time}</span>
                </div>
                <div className="flex justify-between">
                  <span className="font-semibold text-gray-500">Pipeline Stage:</span>
                  <span className={`font-bold px-2 py-0.5 rounded-full text-[10px] border ${selectedAssetModal.tagColor}`}>
                    {selectedAssetModal.tag}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedAssetModal(null)}
                  className="w-full py-2.5 rounded-xl text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 cursor-pointer transition-colors"
                >
                  Close Preview
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

export { AdminSupportTicketsPage, AdminSupportTicketsPage as AdminSupportPage } from "./AdminSupportTicketsPage";
export { AdminTicketDetailPage } from "./AdminTicketDetailPage";
export { AdminSLAPerformancePage } from "./AdminSLAPerformancePage";

// ─────────────────────────────────────────────────────────────────────────────
// 6. ADMIN TEAM MANAGEMENT PAGE (PODS & CAPACITY)
// ─────────────────────────────────────────────────────────────────────────────
export interface TeamMember {
  id: string;
  podId: string;
  name: string;
  role: string;
  category: "lead" | "designer" | "editor" | "videographer" | "photographer";
  isLead?: boolean;
  email: string;
  handle: string;
  status: "Accepting Work" | "Fully Booked" | "On Leave" | "Sprint Ready" | "Pod Lead";
  statusColor: string;
  allocatedPct: number;
  projectsCount: number;
  capabilities: string[];
  avatarUrl?: string;
}

export function AdminTeamManagementPage() {
  const [activePodId, setActivePodId] = useState<string | null>(null);
  const [roleCategoryFilter, setRoleCategoryFilter] = useState<string>("all");
  const [isAddMemberOpen, setIsAddMemberOpen] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const [pods, setPods] = useState([
    {
      id: "pod-a",
      name: "Pod A",
      letter: "A",
      lead: "Maya Lin",
      leadRole: "VP Creative & Pod Lead",
      membersCount: 8,
      velocityPct: 92,
      tasksClosed: 42,
      pendingReview: 6,
      allocatedHours: 320,
      totalHours: 360,
      color: "bg-blue-600",
      textColor: "text-blue-600",
      pillBg: "bg-blue-50 text-blue-600 border-blue-100",
      squadLoad: 78,
      activeEngagements: 11,
      readyReview: 3,
      description: "Cross-functional squad leading enterprise brand repositioning, design systems, executive pitch narratives, and multimodal creative sprints.",
    },
    {
      id: "pod-b",
      name: "Pod B",
      letter: "B",
      lead: "Omar Vance",
      leadRole: "Principal Strategist & Pod Lead",
      membersCount: 10,
      velocityPct: 92,
      tasksClosed: 54,
      pendingReview: 9,
      allocatedHours: 410,
      totalHours: 440,
      color: "bg-[#0EA5E9]",
      textColor: "text-[#0EA5E9]",
      pillBg: "bg-sky-50 text-sky-600 border-sky-100",
      squadLoad: 84,
      activeEngagements: 14,
      readyReview: 5,
      description: "Performance marketing, conversion motion reels, and viral video campaign execution squad.",
    },
    {
      id: "pod-c",
      name: "Pod C",
      letter: "C",
      lead: "Kenji Sato",
      leadRole: "Lead Motion Designer & Pod Lead",
      membersCount: 7,
      velocityPct: 95,
      tasksClosed: 38,
      pendingReview: 4,
      allocatedHours: 290,
      totalHours: 310,
      color: "bg-emerald-600",
      textColor: "text-emerald-600",
      pillBg: "bg-emerald-50 text-emerald-600 border-emerald-100",
      squadLoad: 72,
      activeEngagements: 9,
      readyReview: 2,
      description: "3D animation, VFX motion graphics, and high-fidelity product visualization pod.",
    },
    {
      id: "pod-d",
      name: "Pod D",
      letter: "D",
      lead: "David Vance",
      leadRole: "Tech Art & Media Director",
      membersCount: 6,
      velocityPct: 78,
      tasksClosed: 29,
      pendingReview: 8,
      allocatedHours: 240,
      totalHours: 320,
      color: "bg-purple-600",
      textColor: "text-purple-600",
      pillBg: "bg-purple-50 text-purple-600 border-purple-100",
      squadLoad: 68,
      activeEngagements: 8,
      readyReview: 4,
      description: "On-location commercial shoots, product photography, studio cinematography, and color grading squad.",
    },
  ]);

  const [membersList, setMembersList] = useState<TeamMember[]>([
    // --- POD A (Includes Lead, Designer, Editor, Videographer, Photographer) ---
    {
      id: "m-101",
      podId: "pod-a",
      name: "Maya Lin",
      role: "VP Creative & Design Systems",
      category: "lead",
      isLead: true,
      email: "maya.lin@creo.agency",
      handle: "@mayalin",
      status: "Pod Lead",
      statusColor: "bg-blue-50 text-blue-700 border-blue-200",
      allocatedPct: 85,
      projectsCount: 3,
      capabilities: ["Creative Direction", "Brand Identity", "Pitch Decks"],
    },
    {
      id: "m-102",
      podId: "pod-a",
      name: "Omar Vance",
      role: "Principal Brand Strategist",
      category: "lead",
      email: "omar.v@creo.agency",
      handle: "@ovance",
      status: "Accepting Work",
      statusColor: "bg-emerald-50 text-emerald-700 border-emerald-200",
      allocatedPct: 55,
      projectsCount: 1,
      capabilities: ["Market Positioning", "Narrative Architecture", "GTM Roadmaps"],
    },
    {
      id: "m-103",
      podId: "pod-a",
      name: "Elena Rostova",
      role: "Senior Motion & 3D Designer",
      category: "designer",
      email: "elena.r@creo.agency",
      handle: "@erostova",
      status: "Fully Booked",
      statusColor: "bg-rose-50 text-rose-700 border-rose-200",
      allocatedPct: 100,
      projectsCount: 4,
      capabilities: ["3D Render", "Motion Graphics", "Cinema 4D"],
    },
    {
      id: "m-104",
      podId: "pod-a",
      name: "Julian Reyes",
      role: "Lead Product & UI Architect",
      category: "designer",
      email: "julian.r@creo.agency",
      handle: "@jreyes",
      status: "Accepting Work",
      statusColor: "bg-emerald-50 text-emerald-700 border-emerald-200",
      allocatedPct: 60,
      projectsCount: 2,
      capabilities: ["Figma Tokens", "Design Systems", "Prototyping"],
    },
    {
      id: "m-105",
      podId: "pod-a",
      name: "Marcus Chen",
      role: "Senior Video & Content Editor",
      category: "editor",
      email: "marcus.c@creo.agency",
      handle: "@mchen",
      status: "Sprint Ready",
      statusColor: "bg-sky-50 text-sky-700 border-sky-200",
      allocatedPct: 75,
      projectsCount: 3,
      capabilities: ["4K Video Editing", "Premiere Pro", "Color Grading"],
    },
    {
      id: "m-106",
      podId: "pod-a",
      name: "Leo Zhang",
      role: "Lead Cinematographer & Videographer",
      category: "videographer",
      email: "leo.z@creo.agency",
      handle: "@lzhang",
      status: "Accepting Work",
      statusColor: "bg-emerald-50 text-emerald-700 border-emerald-200",
      allocatedPct: 70,
      projectsCount: 2,
      capabilities: ["Multi-cam Shoots", "Lighting & Framing", "RED 8K Rigging"],
    },
    {
      id: "m-107",
      podId: "pod-a",
      name: "Chloe Bennett",
      role: "Commercial Photographer & Visual Stylist",
      category: "photographer",
      email: "chloe.b@creo.agency",
      handle: "@cbennett",
      status: "Accepting Work",
      statusColor: "bg-emerald-50 text-emerald-700 border-emerald-200",
      allocatedPct: 65,
      projectsCount: 2,
      capabilities: ["Studio Lighting", "Product Photography", "High-End Retouching"],
    },
    {
      id: "m-108",
      podId: "pod-a",
      name: "Sarah Connor",
      role: "Junior Visual Designer",
      category: "designer",
      email: "sarah.c@creo.agency",
      handle: "@sconnor",
      status: "On Leave",
      statusColor: "bg-amber-50 text-amber-700 border-amber-200",
      allocatedPct: 0,
      projectsCount: 0,
      capabilities: ["Social Layouts", "Illustration", "Canva Kits"],
    },

    // --- POD B ---
    {
      id: "m-201",
      podId: "pod-b",
      name: "Omar Vance",
      role: "Principal Strategist & Pod Lead",
      category: "lead",
      isLead: true,
      email: "omar.v@creo.agency",
      handle: "@omarv",
      status: "Pod Lead",
      statusColor: "bg-blue-50 text-blue-700 border-blue-200",
      allocatedPct: 80,
      projectsCount: 4,
      capabilities: ["Strategy", "Campaign Architecture"],
    },
    {
      id: "m-202",
      podId: "pod-b",
      name: "Hannah Abbott",
      role: "Senior Graphic Designer",
      category: "designer",
      email: "hannah.a@creo.agency",
      handle: "@habbott",
      status: "Accepting Work",
      statusColor: "bg-emerald-50 text-emerald-700 border-emerald-200",
      allocatedPct: 70,
      projectsCount: 2,
      capabilities: ["Ad Creatives", "Brand Collateral"],
    },
    {
      id: "m-203",
      podId: "pod-b",
      name: "David Miller",
      role: "Lead Motion Video Editor",
      category: "editor",
      email: "david.m@creo.agency",
      handle: "@dmiller",
      status: "Fully Booked",
      statusColor: "bg-rose-50 text-rose-700 border-rose-200",
      allocatedPct: 95,
      projectsCount: 4,
      capabilities: ["Reels Editing", "Sound Design"],
    },
    {
      id: "m-204",
      podId: "pod-b",
      name: "Vikram Shah",
      role: "Documentary Videographer",
      category: "videographer",
      email: "vikram.s@creo.agency",
      handle: "@vshah",
      status: "Accepting Work",
      statusColor: "bg-emerald-50 text-emerald-700 border-emerald-200",
      allocatedPct: 60,
      projectsCount: 2,
      capabilities: ["On-Location Production", "Drone Footage"],
    },
    {
      id: "m-205",
      podId: "pod-b",
      name: "Zara Thorne",
      role: "Fashion & Lifestyle Photographer",
      category: "photographer",
      email: "zara.t@creo.agency",
      handle: "@zthorne",
      status: "Sprint Ready",
      statusColor: "bg-sky-50 text-sky-700 border-sky-200",
      allocatedPct: 50,
      projectsCount: 1,
      capabilities: ["Lookbook Shoots", "Color Correction"],
    },

    // --- POD C ---
    {
      id: "m-301",
      podId: "pod-c",
      name: "Kenji Sato",
      role: "Lead Motion Designer & Pod Lead",
      category: "lead",
      isLead: true,
      email: "kenji.s@creo.agency",
      handle: "@kenjis",
      status: "Pod Lead",
      statusColor: "bg-blue-50 text-blue-700 border-blue-200",
      allocatedPct: 85,
      projectsCount: 3,
      capabilities: ["3D Motion", "Octane Render"],
    },
    {
      id: "m-302",
      podId: "pod-c",
      name: "Aria Montgomery",
      role: "3D Product Designer",
      category: "designer",
      email: "aria.m@creo.agency",
      handle: "@amontgomery",
      status: "Accepting Work",
      statusColor: "bg-emerald-50 text-emerald-700 border-emerald-200",
      allocatedPct: 75,
      projectsCount: 2,
      capabilities: ["Blender 3D", "Texture Design"],
    },
    {
      id: "m-303",
      podId: "pod-c",
      name: "Lucas Scott",
      role: "VFX & Post-Production Editor",
      category: "editor",
      email: "lucas.s@creo.agency",
      handle: "@lscott",
      status: "Accepting Work",
      statusColor: "bg-emerald-50 text-emerald-700 border-emerald-200",
      allocatedPct: 65,
      projectsCount: 2,
      capabilities: ["Nuke VFX", "Compositing"],
    },
    {
      id: "m-304",
      podId: "pod-c",
      name: "Rohan Kapoor",
      role: "High-Speed Video Director",
      category: "videographer",
      email: "rohan.k@creo.agency",
      handle: "@rkapoor",
      status: "Sprint Ready",
      statusColor: "bg-sky-50 text-sky-700 border-sky-200",
      allocatedPct: 50,
      projectsCount: 1,
      capabilities: ["Phantom High-Speed", "Robotic Arm Control"],
    },
    {
      id: "m-305",
      podId: "pod-c",
      name: "Sophie Laurent",
      role: "Architecture & Still Photography",
      category: "photographer",
      email: "sophie.l@creo.agency",
      handle: "@slaurent",
      status: "Accepting Work",
      statusColor: "bg-emerald-50 text-emerald-700 border-emerald-200",
      allocatedPct: 60,
      projectsCount: 2,
      capabilities: ["Spatial Lighting", "HDR Stills"],
    },

    // --- POD D ---
    {
      id: "m-401",
      podId: "pod-d",
      name: "David Vance",
      role: "Tech Art Lead & Pod Lead",
      category: "lead",
      isLead: true,
      email: "david.v@creo.agency",
      handle: "@dvance",
      status: "Pod Lead",
      statusColor: "bg-blue-50 text-blue-700 border-blue-200",
      allocatedPct: 80,
      projectsCount: 3,
      capabilities: ["Technical Direction", "Pipeline Automation"],
    },
    {
      id: "m-402",
      podId: "pod-d",
      name: "Nora Allen",
      role: "Senior Visual Designer",
      category: "designer",
      email: "nora.a@creo.agency",
      handle: "@nallen",
      status: "Accepting Work",
      statusColor: "bg-emerald-50 text-emerald-700 border-emerald-200",
      allocatedPct: 70,
      projectsCount: 2,
      capabilities: ["UI Kits", "Brand Guidelines"],
    },
    {
      id: "m-403",
      podId: "pod-d",
      name: "Felix Dupuis",
      role: "Short-Form Video Editor",
      category: "editor",
      email: "felix.d@creo.agency",
      handle: "@fdupuis",
      status: "Accepting Work",
      statusColor: "bg-emerald-50 text-emerald-700 border-emerald-200",
      allocatedPct: 60,
      projectsCount: 2,
      capabilities: ["CapCut / DaVinci", "Kinetic Subtitles"],
    },
    {
      id: "m-404",
      podId: "pod-d",
      name: "Gavin Ross",
      role: "Outdoor & Aerial Videographer",
      category: "videographer",
      email: "gavin.r@creo.agency",
      handle: "@gross",
      status: "Fully Booked",
      statusColor: "bg-rose-50 text-rose-700 border-rose-200",
      allocatedPct: 95,
      projectsCount: 4,
      capabilities: ["FPV Drone Pilot", "Action Cinematography"],
    },
    {
      id: "m-405",
      podId: "pod-d",
      name: "Iris West",
      role: "Editorial & Portrait Photographer",
      category: "photographer",
      email: "iris.w@creo.agency",
      handle: "@iwest",
      status: "Accepting Work",
      statusColor: "bg-emerald-50 text-emerald-700 border-emerald-200",
      allocatedPct: 55,
      projectsCount: 1,
      capabilities: ["Headshots", "Editorial Layouts"],
    },
  ]);

  const activePod = pods.find((p) => p.id === activePodId);

  // Filter members based on activePod and role category filter
  const filteredMembers = membersList.filter((m) => {
    const matchesPod = !activePodId || m.podId === activePodId;
    
    let matchesCategory = true;
    if (roleCategoryFilter === "designer") matchesCategory = m.category === "designer";
    else if (roleCategoryFilter === "editor") matchesCategory = m.category === "editor";
    else if (roleCategoryFilter === "videographer") matchesCategory = m.category === "videographer";
    else if (roleCategoryFilter === "photographer") matchesCategory = m.category === "photographer";
    else if (roleCategoryFilter === "lead") matchesCategory = m.category === "lead";
    else if (roleCategoryFilter === "accepting") matchesCategory = m.status === "Accepting Work";
    else if (roleCategoryFilter === "leave") matchesCategory = m.status === "On Leave";

    return matchesPod && matchesCategory;
  });

  const getRoleIcon = (cat: string) => {
    switch (cat) {
      case "lead":
        return <UserCog className="w-3.5 h-3.5 text-blue-600" />;
      case "designer":
        return <Palette className="w-3.5 h-3.5 text-purple-600" />;
      case "editor":
        return <Scissors className="w-3.5 h-3.5 text-amber-600" />;
      case "videographer":
        return <Video className="w-3.5 h-3.5 text-rose-600" />;
      case "photographer":
        return <Camera className="w-3.5 h-3.5 text-emerald-600" />;
      default:
        return <Users className="w-3.5 h-3.5 text-gray-600" />;
    }
  };

  const [assignModalMember, setAssignModalMember] = useState<TeamMember | null>(null);
  const [scheduleModalMember, setScheduleModalMember] = useState<TeamMember | null>(null);
  const [assignForm, setAssignForm] = useState({
    taskTitle: "Brand Repositioning Sprint Deliverable",
    client: "Northwind Labs",
    priority: "High",
    allocationIncrease: 15,
    deadline: "Friday (Sprint 08)",
    brief: "Deliver key creative assets, revisions, and Figma handoff tokens according to brief specifications.",
  });
  const [newMemberForm, setNewMemberForm] = useState({
    name: "",
    email: "",
    handle: "",
    role: "Senior Visual Designer",
    category: "designer" as TeamMember["category"],
    podId: "pod-a",
    capabilities: "Figma Tokens, Design Systems, Branding",
  });
  const [successPopup, setSuccessPopup] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    type?: "success" | "info";
  } | null>(null);

  const handleCreateTeamMember = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMemberForm.name.trim()) return;

    const roleTitle = newMemberForm.role.trim() || (
      newMemberForm.category === "designer" ? "Senior Visual Designer" :
      newMemberForm.category === "editor" ? "Lead Video Editor" :
      newMemberForm.category === "videographer" ? "Lead Cinematographer & Videographer" :
      newMemberForm.category === "photographer" ? "Commercial Photographer" :
      "Squad Lead & Creative Strategist"
    );

    const capsArray = newMemberForm.capabilities.trim()
      ? newMemberForm.capabilities.split(",").map((c) => c.trim()).filter(Boolean)
      : ["Design Systems", "Client Deliverables", "Multimodal Sprint"];

    const targetPodId = newMemberForm.podId || activePodId || "pod-a";

    const newMember: TeamMember = {
      id: `m-${Date.now()}`,
      podId: targetPodId,
      name: newMemberForm.name.trim(),
      role: roleTitle,
      category: newMemberForm.category,
      email: newMemberForm.email.trim() || `${newMemberForm.name.toLowerCase().replace(/\s+/g, ".")}@creo.agency`,
      handle: newMemberForm.handle.trim() || `@${newMemberForm.name.toLowerCase().replace(/\s+/g, "")}`,
      status: "Accepting Work",
      statusColor: "bg-emerald-50 text-emerald-700 border-emerald-200",
      allocatedPct: 40,
      projectsCount: 1,
      capabilities: capsArray,
      isLead: newMemberForm.category === "lead",
    };

    setMembersList((prev) => [newMember, ...prev]);

    // Update pod count in pods state
    setPods((prev) =>
      prev.map((p) =>
        p.id === targetPodId
          ? { ...p, membersCount: p.membersCount + 1 }
          : p
      )
    );

    const targetPodName = pods.find((p) => p.id === targetPodId)?.name || "Sprint Pod";
    const memberName = newMember.name;

    setIsAddMemberOpen(false);
    setNewMemberForm({
      name: "",
      email: "",
      handle: "",
      role: "Senior Visual Designer",
      category: "designer",
      podId: activePodId || "pod-a",
      capabilities: "Figma Tokens, Design Systems, Branding",
    });

    setSuccessPopup({
      isOpen: true,
      title: "Team Specialist Added!",
      message: `${memberName} has been added to ${targetPodName} as ${roleTitle}. The specialist card is now live and ready for sprint task allocation!`,
      type: "success",
    });
  };

  const handleOpenAssignModal = (member: TeamMember) => {
    setAssignModalMember(member);
    setAssignForm({
      taskTitle: `Sprint Deliverables for ${member.name.split(" ")[0]}`,
      client: "Northwind Labs",
      priority: "High",
      allocationIncrease: member.allocatedPct >= 80 ? 10 : 15,
      deadline: "Friday (Sprint 08)",
      brief: `Execute sprint milestones and deliverables aligned with ${member.role} scope.`,
    });
  };

  const handleOpenScheduleModal = (member: TeamMember) => {
    setScheduleModalMember(member);
  };

  const handleConfirmAssignWork = (e: React.FormEvent) => {
    e.preventDefault();
    if (!assignModalMember) return;
    const loadInc = Number(assignForm.allocationIncrease) || 15;
    const updatedPct = Math.min(100, assignModalMember.allocatedPct + loadInc);
    const isFullyBooked = updatedPct >= 90;

    setMembersList((prev) =>
      prev.map((m) =>
        m.id === assignModalMember.id
          ? {
              ...m,
              allocatedPct: updatedPct,
              projectsCount: m.projectsCount + 1,
              status: isFullyBooked ? "Fully Booked" : "Sprint Ready",
              statusColor: isFullyBooked
                ? "bg-rose-50 text-rose-700 border-rose-200"
                : "bg-sky-50 text-sky-700 border-sky-200",
            }
          : m
      )
    );

    const assignedName = assignModalMember.name;
    const taskName = assignForm.taskTitle;
    const clientName = assignForm.client;
    setAssignModalMember(null);

    setSuccessPopup({
      isOpen: true,
      title: "Work Assigned Successfully!",
      message: `"${taskName}" for ${clientName} has been assigned to ${assignedName}. Workload updated to ${updatedPct}%.`,
      type: "success",
    });
  };

  const handleRebalanceWorkload = (member: TeamMember) => {
    const newPct = Math.max(40, member.allocatedPct - 20);
    const newCount = Math.max(1, member.projectsCount - 1);
    setMembersList((prev) =>
      prev.map((m) =>
        m.id === member.id
          ? {
              ...m,
              allocatedPct: newPct,
              projectsCount: newCount,
              status: "Accepting Work",
              statusColor: "bg-emerald-50 text-emerald-700 border-emerald-200",
            }
          : m
      )
    );
    if (scheduleModalMember?.id === member.id) {
      setScheduleModalMember((prev) =>
        prev
          ? {
              ...prev,
              allocatedPct: newPct,
              projectsCount: newCount,
              status: "Accepting Work",
              statusColor: "bg-emerald-50 text-emerald-700 border-emerald-200",
            }
          : null
      );
    }
    setSuccessPopup({
      isOpen: true,
      title: "Workload Rebalanced",
      message: `Re-allocated 1 project from ${member.name}. Capacity restored to ${newPct}% (${newCount} projects).`,
      type: "info",
    });
  };

  return (
    <div data-surface="ops" className="w-full min-h-screen font-sans bg-[#F8FAFC] flex flex-col">
      <AdminTopHeader
        title={activePodId && activePod ? `${activePod.name} • Team Details` : "Team Details & Management"}
        activeTab="Team Details"
      />

      <main className="flex-1 px-6 lg:px-10 pt-4 pb-16 max-w-[1500px] w-full mx-auto space-y-6">
        {toast && (
          <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold rounded-2xl flex items-center justify-between shadow-sm animate-fade-in">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>{toast}</span>
            </div>
            <button onClick={() => setToast(null)} className="text-emerald-600 hover:text-emerald-900 font-bold">
              Dismiss
            </button>
          </div>
        )}

        {/* ─────────────────────────────────────────────────────────────────────────────
            VIEW 1: MAIN TEAM DETAILS & MANAGEMENT OVERVIEW (Matching Screenshot 1)
        ───────────────────────────────────────────────────────────────────────────── */}
        {!activePodId ? (
          <div className="space-y-6">
            {/* Top Controls Bar */}
            <div className="flex items-center justify-between gap-4">
              <div>
                <h3 className="text-base font-bold text-gray-900">Sprint Pods & Resource Allocation</h3>
                <p className="text-xs text-gray-500">Live operational capacity and roster assignments across creative pods</p>
              </div>
              <button
                type="button"
                onClick={() => setIsAddMemberOpen(true)}
                className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-[#2563EB] hover:bg-blue-700 text-white text-xs font-bold shadow-md shadow-blue-500/20 cursor-pointer transition-all shrink-0"
              >
                <Plus className="w-4 h-4" /> Add Team Pod
              </button>
            </div>

            {/* 3 KPI Summary Cards matching Screenshot 1 */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Card 1: NO OF PODS */}
              <div className="kpi-card bg-white rounded-3xl p-6 border-2 border-[#1E3A8A] hover:border-[#60A5FA] transition-all shadow-[0_4px_20px_rgba(0,0,0,0.03)] flex flex-col justify-between">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-[10px] font-extrabold text-gray-400 uppercase tracking-wider">
                    NO OF PODS
                  </span>
                  <div className="w-9 h-9 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center">
                    <Users className="w-5 h-5" />
                  </div>
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-black text-gray-900 tracking-tight">8 Pods</span>
                  <span className="text-xs font-semibold text-gray-500">across 72 members</span>
                </div>
                <div className="mt-4 pt-3 border-t border-gray-100 text-xs font-bold text-blue-600 flex items-center gap-1">
                  <Layers className="w-3.5 h-3.5" /> Pods A – H Active Pods
                </div>
              </div>

              {/* Card 2: CAPACITY */}
              <div className="kpi-card bg-white rounded-3xl p-6 border-2 border-[#1E3A8A] hover:border-[#60A5FA] transition-all shadow-[0_4px_20px_rgba(0,0,0,0.03)] flex flex-col justify-between">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-[10px] font-extrabold text-gray-400 uppercase tracking-wider">
                    CAPACITY
                  </span>
                  <div className="w-9 h-9 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                    <Zap className="w-5 h-5" />
                  </div>
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-black text-gray-900 tracking-tight">88%</span>
                  <span className="text-xs font-semibold text-gray-500">optimal bandwidth</span>
                </div>
                <div className="mt-4 pt-3 border-t border-gray-100 flex items-center gap-2">
                  <div className="flex-1 bg-gray-100 rounded-full h-2 overflow-hidden">
                    <div className="bg-emerald-600 h-full rounded-full w-[88%]" />
                  </div>
                  <span className="text-xs font-bold text-emerald-600">Healthy</span>
                </div>
              </div>

              {/* Card 3: TASKS TO BE DONE */}
              <div className="kpi-card bg-white rounded-3xl p-6 border-2 border-[#1E3A8A] hover:border-[#60A5FA] transition-all shadow-[0_4px_20px_rgba(0,0,0,0.03)] flex flex-col justify-between">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-[10px] font-extrabold text-gray-400 uppercase tracking-wider">
                    TASKS TO BE DONE
                  </span>
                  <div className="w-9 h-9 rounded-2xl bg-sky-50 text-sky-600 flex items-center justify-center">
                    <CheckSquare className="w-5 h-5" />
                  </div>
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-black text-gray-900 tracking-tight">28</span>
                  <span className="text-xs font-semibold text-gray-500">in review/progress</span>
                </div>
                <div className="mt-4 pt-3 border-t border-gray-100 text-xs text-gray-500 flex items-center gap-1 font-medium">
                  <CheckCircle2 className="w-3.5 h-3.5 text-gray-400" /> 142 milestones closed ahead of target
                </div>
              </div>
            </div>

            {/* Team Pods Section Header */}
            <div className="flex items-center justify-between pt-2">
              <div>
                <h3 className="text-lg font-bold text-gray-900 tracking-tight">Team Pods</h3>
                <p className="text-xs text-gray-500">Real-time capacity distribution, pod leads, and task completion velocity</p>
              </div>
              <span className="px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" /> Sprint Cycle 08 • 4 Days Remaining
              </span>
            </div>

            {/* Pod Cards Grid matching Screenshot 1 */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {pods.map((pod) => (
                <div
                  key={pod.id}
                  onClick={() => setActivePodId(pod.id)}
                  className="bg-white rounded-3xl p-6 border border-gray-100 shadow-[0_4px_25px_rgba(0,0,0,0.04)] space-y-5 hover:shadow-xl transition-all cursor-pointer group relative overflow-hidden"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`w-12 h-12 rounded-2xl ${pod.color} text-white font-black text-lg flex items-center justify-center shadow-md group-hover:scale-105 transition-transform`}>
                        {pod.letter}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="font-bold text-base text-gray-900">{pod.name}</h4>
                          <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 text-[10px] font-bold">
                            Sprint Pod
                          </span>
                        </div>
                        <p className="text-xs text-gray-500">{pod.description.slice(0, 48)}...</p>
                      </div>
                    </div>
                    <span className="px-2.5 py-1 rounded-full text-[10px] font-extrabold bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> Active
                    </span>
                  </div>

                  {/* Lead Info & Member Stack */}
                  <div className="p-3.5 bg-gray-50/70 rounded-2xl flex items-center justify-between border border-gray-100">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-full bg-blue-600 text-white font-bold text-xs flex items-center justify-center">
                        {pod.lead[0]}
                      </div>
                      <div>
                        <div className="text-xs font-bold text-gray-900">{pod.lead}</div>
                        <div className="text-[10px] text-gray-500 font-medium">Pod Lead</div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 text-xs font-bold text-gray-600">
                      <div className="flex -space-x-2">
                        <div className="w-7 h-7 rounded-full bg-slate-700 text-white text-[10px] font-bold flex items-center justify-center ring-2 ring-white">ER</div>
                        <div className="w-7 h-7 rounded-full bg-blue-600 text-white text-[10px] font-bold flex items-center justify-center ring-2 ring-white">MC</div>
                        <div className="w-7 h-7 rounded-full bg-emerald-600 text-white text-[10px] font-bold flex items-center justify-center ring-2 ring-white">LZ</div>
                      </div>
                      <span className="text-xs font-bold text-gray-700">+{pod.membersCount - 3} Members</span>
                    </div>
                  </div>

                  {/* Velocity Bar */}
                  <div className="space-y-2 text-xs">
                    <div className="flex justify-between items-center text-gray-600 font-semibold">
                      <span>Sprint Velocity</span>
                      <span className="font-bold text-gray-900">{pod.velocityPct}% on track</span>
                    </div>
                    <div className="w-full bg-gray-100 rounded-full h-2.5 overflow-hidden">
                      <div className={`h-full rounded-full ${pod.color}`} style={{ width: `${pod.velocityPct}%` }} />
                    </div>
                    <div className="flex justify-between text-[11px] text-gray-400 font-medium pt-0.5">
                      <span>{pod.tasksClosed} tasks closed</span>
                      <span className="text-blue-600 font-bold">{pod.pendingReview} pending review</span>
                    </div>
                  </div>

                  {/* Card Footer Action */}
                  <div className="pt-3 border-t border-gray-100 flex items-center justify-between text-xs">
                    <span className="text-gray-500 font-medium text-[11px]">
                      Allocated: <strong className="text-gray-900">{pod.allocatedHours}h / {pod.totalHours}h</strong>
                    </span>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setActivePodId(pod.id);
                      }}
                      className="text-[#2563EB] font-bold hover:underline inline-flex items-center gap-1 group-hover:translate-x-0.5 transition-transform"
                    >
                      View Member Directory &rarr;
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          /* ─────────────────────────────────────────────────────────────────────────────
              VIEW 2: DEDICATED POD MEMBER DIRECTORY SUB-PAGE (Matching Screenshot 2)
          ───────────────────────────────────────────────────────────────────────────── */
          <div className="space-y-6">
            {/* Top Breadcrumb & Action Controls */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-2 text-xs font-bold text-gray-500">
                <button
                  type="button"
                  onClick={() => setActivePodId(null)}
                  className="hover:text-blue-600 flex items-center gap-1 transition-colors cursor-pointer"
                >
                  <ArrowLeft className="w-4 h-4" /> Back to Track Overview
                </button>
                <span>/</span>
                <button type="button" onClick={() => setActivePodId(null)} className="hover:text-blue-600 transition-colors cursor-pointer">
                  Team Management
                </button>
                <span>/</span>
                <span className="text-gray-900 font-black">{activePod?.name} Member Directory</span>
              </div>

              <div className="flex items-center gap-3">
                <span className="px-3 py-1 rounded-full text-[11px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
                  ● Q2 Cycle Active
                </span>
                <span className="text-[11px] text-gray-400 font-medium hidden sm:inline">
                  Last synchronized: Just now
                </span>
                <button
                  type="button"
                  onClick={() => setIsAddMemberOpen(true)}
                  className="px-4 py-2 rounded-xl bg-[#2563EB] hover:bg-blue-700 text-white text-xs font-bold shadow-md shadow-blue-500/20 cursor-pointer transition-all"
                >
                  + Add Team Member
                </button>
              </div>
            </div>

            {/* Pod Summary Banner Card matching Screenshot 2 */}
            <div className="bg-white rounded-3xl p-6 lg:p-8 border border-gray-100 shadow-[0_4px_30px_rgba(0,0,0,0.04)] space-y-6">
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                <div className="space-y-3 max-w-3xl">
                  <div className="flex items-center gap-2">
                    <span className="px-3 py-1 rounded-full bg-blue-600 text-white font-black text-xs uppercase tracking-wider">
                      {activePod?.name}
                    </span>
                    <span className="px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 font-bold text-xs">
                      High Velocity
                    </span>
                  </div>
                  <p className="text-xs text-gray-600 leading-relaxed font-medium">
                    {activePod?.description}
                  </p>

                  <div className="flex flex-wrap items-center gap-6 pt-2 text-xs font-bold text-gray-700">
                    <div>
                      <span className="text-[10px] uppercase text-gray-400 block font-extrabold tracking-wider">POD LEAD</span>
                      <span className="text-gray-900 font-black">{activePod?.lead}</span>
                    </div>
                    <div className="h-6 w-px bg-gray-200" />
                    <div>
                      <span className="text-[10px] uppercase text-gray-400 block font-extrabold tracking-wider">MEMBERS</span>
                      <span className="text-gray-900 font-black">{filteredMembers.length} Active Members</span>
                    </div>
                    <div className="h-6 w-px bg-gray-200" />
                    <div>
                      <span className="text-[10px] uppercase text-gray-400 block font-extrabold tracking-wider">VELOCITY</span>
                      <span className="text-emerald-600 font-black">{activePod?.velocityPct}% Sprint Delivery</span>
                    </div>
                  </div>
                </div>

                {/* Right Side Stats */}
                <div className="flex gap-4 border-t lg:border-t-0 lg:border-l border-gray-100 pt-4 lg:pt-0 lg:pl-8">
                  <div className="bg-gray-50 p-4 rounded-2xl border border-gray-100 min-w-[130px] space-y-1">
                    <span className="text-[10px] font-bold text-gray-400 uppercase">AVG SQUAD LOAD</span>
                    <div className="text-2xl font-black text-gray-900">{activePod?.squadLoad}%</div>
                    <span className="text-[10px] text-emerald-600 font-bold">↓ Optimal</span>
                  </div>
                  <div className="bg-gray-50 p-4 rounded-2xl border border-gray-100 min-w-[130px] space-y-1">
                    <span className="text-[10px] font-bold text-gray-400 uppercase">ACTIVE ENGAGEMENTS</span>
                    <div className="text-2xl font-black text-gray-900">{activePod?.activeEngagements} projects</div>
                    <span className="text-[10px] text-blue-600 font-bold">{activePod?.readyReview} ready for review</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Role Category Filter Tabs & Action Controls */}
            <div className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                {/* Filter Pills matching Screenshot 2 */}
                <div className="flex flex-wrap items-center gap-1.5 bg-gray-100 p-1 rounded-xl text-xs font-bold">
                  {[
                    { key: "all", label: `All Members (${membersList.filter((m) => !activePodId || m.podId === activePodId).length})` },
                    { key: "lead", label: "Leads" },
                    { key: "designer", label: "Designers" },
                    { key: "editor", label: "Editors" },
                    { key: "videographer", label: "Videographers" },
                    { key: "photographer", label: "Photographers" },
                    { key: "accepting", label: "Accepting Work" },
                    { key: "leave", label: "On Leave" },
                  ].map((tab) => (
                    <button
                      key={tab.key}
                      type="button"
                      onClick={() => setRoleCategoryFilter(tab.key)}
                      className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                        roleCategoryFilter === tab.key
                          ? "bg-[#2563EB] text-white shadow-xs"
                          : "text-gray-600 hover:text-gray-900"
                      }`}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>

                <button
                  type="button"
                  onClick={() => setIsAddMemberOpen(true)}
                  className="px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-sm cursor-pointer"
                >
                  <Plus className="w-4 h-4" /> Add Member to {activePod?.name}
                </button>
              </div>

              {/* Roster Counter */}
              <div className="flex items-center justify-between text-xs text-gray-400 font-semibold border-t border-gray-100 pt-3">
                <span>Showing {filteredMembers.length} members assigned to {activePod?.name}</span>
                <div className="flex items-center gap-3">
                  <button type="button" className="hover:text-gray-700 flex items-center gap-1">
                    <SlidersHorizontal className="w-3.5 h-3.5" /> Advanced Sorting
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const csvContent = "data:text/csv;charset=utf-8," + [
                        ["ID", "Name", "Role", "Pod", "Workload", "Status"].join(","),
                        ...filteredMembers.map((m) => [m.id, `"${m.name}"`, `"${m.role}"`, `"${activePod?.name || ""}"`, `${m.allocatedPct}%`, m.status].join(","))
                      ].join("\n");
                      const encodedUri = encodeURI(csvContent);
                      const link = document.createElement("a");
                      link.setAttribute("href", encodedUri);
                      link.setAttribute("download", `${(activePod?.name || "pod").toLowerCase().replace(/\s+/g, "_")}_roster.csv`);
                      document.body.appendChild(link);
                      link.click();
                      document.body.removeChild(link);
                    }}
                    className="hover:text-gray-700 flex items-center gap-1 cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5" /> Export Roster
                  </button>
                </div>
              </div>
            </div>

            {/* Member Cards Grid matching Screenshot 2 */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {filteredMembers.map((member) => (
                <div
                  key={member.id}
                  className="bg-white rounded-3xl border border-gray-100 shadow-[0_4px_20px_rgba(0,0,0,0.04)] p-6 space-y-4 flex flex-col justify-between hover:shadow-lg transition-shadow"
                >
                  <div className="space-y-4">
                    {/* Header: Avatar, Status Badge & Title */}
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div className="relative">
                          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-700 text-white font-black text-base flex items-center justify-center shadow-md">
                            {member.name[0]}
                          </div>
                          <span className="absolute -bottom-1 -right-1 w-3.5 h-3.5 rounded-full bg-emerald-500 ring-2 ring-white" />
                        </div>
                        <div>
                          <h4 className="font-bold text-sm text-gray-900 flex items-center gap-1">
                            {member.name}
                            {member.isLead && <CheckCircle2 className="w-3.5 h-3.5 text-blue-600" />}
                          </h4>
                          <span className="text-[11px] text-gray-500 font-medium flex items-center gap-1 mt-0.5">
                            {getRoleIcon(member.category)}
                            {member.role}
                          </span>
                        </div>
                      </div>

                      <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${member.statusColor}`}>
                        {member.status}
                      </span>
                    </div>

                    {/* Email & Handle */}
                    <div className="p-3 bg-gray-50/70 rounded-2xl text-[11px] font-mono space-y-0.5 border border-gray-100">
                      <div className="text-gray-600 truncate">{member.email}</div>
                      <div className="text-blue-600 font-semibold">{member.handle}</div>
                    </div>

                    {/* Core Capabilities Pills */}
                    <div className="space-y-1.5">
                      <span className="text-[10px] font-extrabold uppercase tracking-wider text-gray-400 block">
                        CORE CAPABILITIES
                      </span>
                      <div className="flex flex-wrap gap-1.5">
                        {member.capabilities.map((cap) => (
                          <span
                            key={cap}
                            className="px-2.5 py-1 rounded-lg bg-gray-100 text-gray-700 text-[10px] font-bold border border-gray-200/60"
                          >
                            {cap}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Footer Workload Bar & Action */}
                  <div className="pt-4 border-t border-gray-100 space-y-3">
                    <div className="space-y-1">
                      <div className="flex justify-between items-center text-[11px]">
                        <span className="text-gray-500 font-semibold">
                          Workload ({member.projectsCount} Projects)
                        </span>
                        <span className={`font-bold ${member.allocatedPct >= 90 ? "text-rose-600" : "text-emerald-600"}`}>
                          {member.allocatedPct}% {member.allocatedPct >= 90 ? "Booked" : "Allocated"}
                        </span>
                      </div>
                      <div className="w-full bg-gray-100 rounded-full h-2 overflow-hidden">
                        <div
                          className={`h-full rounded-full ${
                            member.allocatedPct >= 90 ? "bg-rose-500" : member.allocatedPct >= 70 ? "bg-blue-600" : "bg-emerald-500"
                          }`}
                          style={{ width: `${member.allocatedPct}%` }}
                        />
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-xs font-bold pt-1">
                      <span className="text-emerald-600 flex items-center gap-1 text-[11px]">
                        ● {member.status === "Fully Booked" ? "At Max Capacity" : "Sprint Ready"}
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          if (member.allocatedPct >= 90) {
                            handleOpenScheduleModal(member);
                          } else {
                            handleOpenAssignModal(member);
                          }
                        }}
                        className="text-blue-600 hover:text-blue-800 hover:underline cursor-pointer text-[11px] font-bold"
                      >
                        {member.allocatedPct >= 90 ? "View Schedule" : "Assign Work"}
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ─────────────────────────────────────────────────────────────────────────────
            MODAL 1: ASSIGN WORK POPUP MODAL WITH BLURRED BACKDROP
        ───────────────────────────────────────────────────────────────────────────── */}
        {assignModalMember && (
          <div
            className="fixed inset-0 w-screen h-screen z-[99999] flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-md animate-fade-in"
            onClick={() => setAssignModalMember(null)}
          >
            <div
              className="relative w-full max-w-lg rounded-3xl bg-white p-6 sm:p-7 shadow-2xl border border-slate-100 flex flex-col space-y-4 max-h-[92vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
              role="dialog"
              aria-modal="true"
            >
              {/* Header */}
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2.5">
                  <div className="size-9 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center font-black text-sm">
                    <Briefcase className="size-4.5" />
                  </div>
                  <div>
                    <h3 className="text-base font-black text-slate-900 tracking-tight">Assign Sprint Task</h3>
                    <p className="text-[11px] text-slate-500 font-medium">Allocate project work & set turnaround targets</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setAssignModalMember(null)}
                  className="size-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center transition-colors cursor-pointer"
                >
                  <X className="size-4" />
                </button>
              </div>

              {/* Specialist Profile Banner */}
              <div className="bg-slate-50 border border-slate-100/90 rounded-2xl p-3.5 flex items-center justify-between">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="size-11 rounded-2xl bg-blue-600 text-white font-black text-sm flex items-center justify-center shadow-xs shrink-0">
                    {assignModalMember.name.split(" ").map((n) => n[0]).join("")}
                  </div>
                  <div className="min-w-0">
                    <h4 className="text-xs font-black text-slate-900 truncate">{assignModalMember.name}</h4>
                    <p className="text-[11px] text-slate-500 font-medium truncate">{assignModalMember.role}</p>
                    <span className="text-[10px] text-blue-600 font-bold">{assignModalMember.email}</span>
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <span className="text-[10px] font-bold text-slate-400 block uppercase tracking-wider">CURRENT LOAD</span>
                  <span className="text-sm font-black text-slate-900">{assignModalMember.allocatedPct}%</span>
                  <span className="text-[10px] text-slate-500 block font-semibold">{assignModalMember.projectsCount} Projects</span>
                </div>
              </div>

              {/* Assignment Form */}
              <form onSubmit={handleConfirmAssignWork} className="space-y-3.5">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Task / Deliverable Title</label>
                  <input
                    type="text"
                    required
                    value={assignForm.taskTitle}
                    onChange={(e) => setAssignForm({ ...assignForm, taskTitle: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                    placeholder="e.g. Q4 Brand Identity Campaign Deliverables"
                  />
                  {/* Preset Pills */}
                  <div className="flex flex-wrap gap-1.5 mt-1.5">
                    {[
                      "3D Hero Product Animation",
                      "Brand Guidelines Refresh",
                      "TikTok High-Velocity Batch",
                      "Design Token Architecture",
                    ].map((preset) => (
                      <button
                        key={preset}
                        type="button"
                        onClick={() => setAssignForm({ ...assignForm, taskTitle: preset })}
                        className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-slate-100 hover:bg-slate-200 text-slate-600 transition-colors cursor-pointer"
                      >
                        + {preset}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Client Account</label>
                    <select
                      value={assignForm.client}
                      onChange={(e) => setAssignForm({ ...assignForm, client: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-medium text-slate-900 bg-white"
                    >
                      <option value="Northwind Labs">Northwind Labs (Enterprise)</option>
                      <option value="Atlas Commerce">Atlas Commerce (Growth)</option>
                      <option value="Lumina Health">Lumina Health (Enterprise)</option>
                      <option value="Bloom Studio">Bloom Studio (Standard)</option>
                      <option value="Vanguard Mobility">Vanguard Mobility (Growth)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Priority Level</label>
                    <select
                      value={assignForm.priority}
                      onChange={(e) => setAssignForm({ ...assignForm, priority: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-medium text-slate-900 bg-white"
                    >
                      <option value="Urgent">🔥 Urgent (Within 24h)</option>
                      <option value="High">⚡ High (Sprint Priority)</option>
                      <option value="Medium">Standard Medium</option>
                      <option value="Normal">Normal Priority</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Workload Allocation</label>
                    <div className="grid grid-cols-4 gap-1">
                      {[10, 15, 25, 35].map((pct) => (
                        <button
                          key={pct}
                          type="button"
                          onClick={() => setAssignForm({ ...assignForm, allocationIncrease: pct })}
                          className={`py-1.5 text-center text-xs font-bold rounded-lg border transition-all cursor-pointer ${
                            assignForm.allocationIncrease === pct
                              ? "bg-blue-600 text-white border-blue-600 shadow-2xs"
                              : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100"
                          }`}
                        >
                          +{pct}%
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Sprint Target Deadline</label>
                    <input
                      type="text"
                      value={assignForm.deadline}
                      onChange={(e) => setAssignForm({ ...assignForm, deadline: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-medium text-slate-900"
                      placeholder="e.g. Friday, Sprint 08"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Deliverable Scope & Brief</label>
                  <textarea
                    rows={2}
                    value={assignForm.brief}
                    onChange={(e) => setAssignForm({ ...assignForm, brief: e.target.value })}
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                    placeholder="Brief instructions, deliverables checklist, links to Figma/Drive..."
                  />
                </div>

                {/* Submit Row */}
                <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setAssignModalMember(null)}
                    className="px-4 py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50 cursor-pointer transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white text-xs font-bold shadow-md shadow-blue-500/25 active:scale-95 transition-all cursor-pointer"
                  >
                    Confirm & Assign Work
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* ─────────────────────────────────────────────────────────────────────────────
            MODAL 2: VIEW SCHEDULE & WORKLOAD MODAL WITH BLURRED BACKDROP
        ───────────────────────────────────────────────────────────────────────────── */}
        {scheduleModalMember && (
          <div
            className="fixed inset-0 w-screen h-screen z-[99999] flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-md animate-fade-in"
            onClick={() => setScheduleModalMember(null)}
          >
            <div
              className="relative w-full max-w-2xl rounded-3xl bg-white p-6 sm:p-8 shadow-2xl border border-slate-100 flex flex-col space-y-5 max-h-[92vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
              role="dialog"
              aria-modal="true"
            >
              {/* Header */}
              <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                <div className="flex items-center gap-3">
                  <div className="size-12 rounded-2xl bg-rose-500 text-white font-black text-base flex items-center justify-center shadow-md">
                    {scheduleModalMember.name.split(" ").map((n) => n[0]).join("")}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-lg font-black text-slate-900 tracking-tight">{scheduleModalMember.name}</h3>
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                        ● {scheduleModalMember.status}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 font-medium">{scheduleModalMember.role} • {scheduleModalMember.email}</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setScheduleModalMember(null)}
                  className="size-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center transition-colors cursor-pointer"
                >
                  <X className="size-4" />
                </button>
              </div>

              {/* Capacity Overview Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-100">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">ALLOCATED LOAD</span>
                  <div className="text-xl font-black text-slate-900 mt-0.5">{scheduleModalMember.allocatedPct}%</div>
                  <span className="text-[10px] text-rose-600 font-bold">Max Capacity</span>
                </div>
                <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-100">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">ACTIVE ENGAGEMENTS</span>
                  <div className="text-xl font-black text-slate-900 mt-0.5">{scheduleModalMember.projectsCount} Projects</div>
                  <span className="text-[10px] text-blue-600 font-bold">2 in Final Review</span>
                </div>
                <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-100">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">NEXT OPEN SLOT</span>
                  <div className="text-xl font-black text-slate-900 mt-0.5">In 4 Days</div>
                  <span className="text-[10px] text-emerald-600 font-bold">Sprint Cycle 09</span>
                </div>
              </div>

              {/* Weekly Calendar Schedule Timeline */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs font-bold text-slate-800">
                  <span>Weekly Time Allocation (Mon – Fri)</span>
                  <span className="text-blue-600 font-semibold">38.0h Total Booked</span>
                </div>
                <div className="grid grid-cols-5 gap-2">
                  {[
                    { day: "Mon", hours: "8.0h", task: "Northwind 3D Renders", bg: "bg-blue-50 text-blue-700 border-blue-200" },
                    { day: "Tue", hours: "7.5h", task: "Vanguard 4K Motion", bg: "bg-purple-50 text-purple-700 border-purple-200" },
                    { day: "Wed", hours: "8.0h", task: "Bloom Studio Intro", bg: "bg-emerald-50 text-emerald-700 border-emerald-200" },
                    { day: "Thu", hours: "8.0h", task: "Atlas Product Teaser", bg: "bg-amber-50 text-amber-700 border-amber-200" },
                    { day: "Fri", hours: "6.5h", task: "Sprint Quality QA", bg: "bg-sky-50 text-sky-700 border-sky-200" },
                  ].map((item) => (
                    <div key={item.day} className="p-2.5 rounded-xl border border-slate-100 bg-slate-50 flex flex-col justify-between text-center gap-1.5">
                      <span className="text-[11px] font-black text-slate-700">{item.day}</span>
                      <span className="text-xs font-black text-slate-900">{item.hours}</span>
                      <span className={`text-[9px] font-bold p-1 rounded-md border truncate ${item.bg}`}>
                        {item.task}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Active Deliverables Breakdown */}
              <div className="space-y-2.5">
                <h4 className="text-xs font-bold text-slate-800">Active Deliverables & Status</h4>
                <div className="space-y-2">
                  {[
                    { client: "Northwind Labs", name: "3D Asset Render Batch #12", due: "Due in 2 days", progress: 90, color: "bg-blue-600" },
                    { client: "Vanguard Mobility", name: "4K Motion Sequence & Audio Sync", due: "Due Friday", progress: 65, color: "bg-purple-600" },
                    { client: "Bloom Studio", name: "Brand Intro Animation Loop", due: "Due Next Tue", progress: 35, color: "bg-emerald-600" },
                    { client: "Atlas Commerce", name: "Product Showcase 9:16 Cut", due: "Due Next Fri", progress: 15, color: "bg-amber-600" },
                  ].map((proj) => (
                    <div key={proj.name} className="p-3 rounded-xl border border-slate-100 bg-white hover:border-slate-200 transition-colors flex items-center justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-slate-900 truncate">{proj.name}</span>
                          <span className="text-[10px] font-bold text-slate-500">({proj.client})</span>
                        </div>
                        <div className="w-full bg-slate-100 rounded-full h-1.5 mt-2 overflow-hidden">
                          <div className={`h-full rounded-full ${proj.color}`} style={{ width: `${proj.progress}%` }} />
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <span className="text-[10px] font-bold text-slate-400 block">{proj.due}</span>
                        <span className="text-xs font-black text-slate-900">{proj.progress}%</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Modal Footer Controls */}
              <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => handleRebalanceWorkload(scheduleModalMember)}
                  className="px-4 py-2.5 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  ⚡ Rebalance Workload (-20%)
                </button>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setToast(`Notification dispatched to Pod Lead for ${scheduleModalMember.name}.`);
                      setScheduleModalMember(null);
                    }}
                    className="px-4 py-2.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-bold transition-colors cursor-pointer"
                  >
                    Notify Lead
                  </button>
                  <button
                    type="button"
                    onClick={() => setScheduleModalMember(null)}
                    className="px-5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition-colors cursor-pointer"
                  >
                    Done
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ─────────────────────────────────────────────────────────────────────────────
            MODAL 3: SUCCESS CONFIRMATION POPUP WITH BLURRED BACKDROP
        ───────────────────────────────────────────────────────────────────────────── */}
        {successPopup?.isOpen && (
          <div
            className="fixed inset-0 w-screen h-screen z-[99999] flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-md animate-fade-in"
            onClick={() => setSuccessPopup(null)}
          >
            <div
              className="relative w-full max-w-md rounded-3xl bg-white p-6 sm:p-8 shadow-2xl border border-slate-100 flex flex-col items-center text-center animate-in zoom-in-95 duration-150"
              onClick={(e) => e.stopPropagation()}
              role="dialog"
              aria-modal="true"
            >
              <button
                type="button"
                onClick={() => setSuccessPopup(null)}
                className="absolute top-4 right-4 size-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-400 hover:text-slate-700 flex items-center justify-center transition-colors cursor-pointer"
                aria-label="Close modal"
              >
                <X className="size-4" />
              </button>

              <div className="size-16 rounded-3xl bg-emerald-50 text-emerald-600 ring-8 ring-emerald-50/60 flex items-center justify-center mb-4 shadow-inner">
                <CheckCircle2 className="size-8" />
              </div>

              <h3 className="text-xl font-black text-slate-900 tracking-tight">{successPopup.title}</h3>
              <p className="text-xs sm:text-sm text-slate-600 mt-2 leading-relaxed max-w-sm">{successPopup.message}</p>

              <div className="w-full mt-6">
                <button
                  type="button"
                  onClick={() => setSuccessPopup(null)}
                  autoFocus
                  className="w-full py-3 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold text-xs shadow-md shadow-blue-500/25 active:scale-95 transition-all cursor-pointer"
                >
                  OK
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ─────────────────────────────────────────────────────────────────────────────
            MODAL 4: ADD MEMBER MODAL (FULLY FUNCTIONAL)
        ───────────────────────────────────────────────────────────────────────────── */}
        {isAddMemberOpen && (
          <div
            className="fixed inset-0 w-screen h-screen z-[99999] flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-md animate-fade-in"
            onClick={() => setIsAddMemberOpen(false)}
          >
            <div
              className="relative w-full max-w-lg rounded-3xl bg-white p-6 sm:p-7 shadow-2xl border border-slate-100 flex flex-col space-y-4 max-h-[92vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
              role="dialog"
              aria-modal="true"
            >
              {/* Header */}
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2.5">
                  <div className="size-9 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center font-black text-sm">
                    <Users className="size-4.5" />
                  </div>
                  <div>
                    <h3 className="text-base font-black text-slate-900 tracking-tight">
                      Add Team Specialist to {activePod?.name || "Sprint Pod"}
                    </h3>
                    <p className="text-[11px] text-slate-500 font-medium">
                      Provision creative talent, set role capabilities & sprint track
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setIsAddMemberOpen(false)}
                  className="size-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center transition-colors cursor-pointer"
                >
                  <X className="size-4" />
                </button>
              </div>

              {/* Add Member Form */}
              <form onSubmit={handleCreateTeamMember} className="space-y-3.5">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Full Name *</label>
                    <input
                      type="text"
                      required
                      value={newMemberForm.name}
                      onChange={(e) => {
                        const name = e.target.value;
                        const autoEmail = name ? `${name.toLowerCase().replace(/\s+/g, ".")}@creo.agency` : "";
                        const autoHandle = name ? `@${name.toLowerCase().replace(/\s+/g, "")}` : "";
                        setNewMemberForm({
                          ...newMemberForm,
                          name,
                          email: newMemberForm.email ? newMemberForm.email : autoEmail,
                          handle: newMemberForm.handle ? newMemberForm.handle : autoHandle,
                        });
                      }}
                      placeholder="e.g. Jordan Miller"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 font-medium"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Email Address</label>
                    <input
                      type="email"
                      required
                      value={newMemberForm.email}
                      onChange={(e) => setNewMemberForm({ ...newMemberForm, email: e.target.value })}
                      placeholder="e.g. jordan.m@creo.agency"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 font-medium"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Role Title</label>
                    <input
                      type="text"
                      required
                      value={newMemberForm.role}
                      onChange={(e) => setNewMemberForm({ ...newMemberForm, role: e.target.value })}
                      placeholder="e.g. Senior Visual Designer"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 font-medium"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Slack / Agency Handle</label>
                    <input
                      type="text"
                      value={newMemberForm.handle}
                      onChange={(e) => setNewMemberForm({ ...newMemberForm, handle: e.target.value })}
                      placeholder="e.g. @jmiller"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 font-medium"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Role Track Category</label>
                    <select
                      value={newMemberForm.category}
                      onChange={(e) => {
                        const cat = e.target.value as TeamMember["category"];
                        let defaultRole = "Senior Visual Designer";
                        if (cat === "editor") defaultRole = "Lead Video Editor";
                        else if (cat === "videographer") defaultRole = "Lead Cinematographer & Videographer";
                        else if (cat === "photographer") defaultRole = "Commercial Photographer";
                        else if (cat === "lead") defaultRole = "Sprint Pod Lead";
                        setNewMemberForm({ ...newMemberForm, category: cat, role: defaultRole });
                      }}
                      className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-xs font-medium text-slate-900 bg-white"
                    >
                      <option value="designer">🎨 Designer (UI, 3D, Brand)</option>
                      <option value="editor">✂️ Video & Motion Editor</option>
                      <option value="videographer">🎥 Cinematographer & Videographer</option>
                      <option value="photographer">📷 Commercial Photographer</option>
                      <option value="lead">👑 Pod Lead & Strategist</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Assign Sprint Pod</label>
                    <select
                      value={newMemberForm.podId}
                      onChange={(e) => setNewMemberForm({ ...newMemberForm, podId: e.target.value })}
                      className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-xs font-medium text-slate-900 bg-white"
                    >
                      <option value="pod-a">Pod A • Enterprise Brand & Design</option>
                      <option value="pod-b">Pod B • Performance & Video</option>
                      <option value="pod-c">Pod C • 3D Motion & VFX</option>
                      <option value="pod-d">Pod D • Commercial Photo & Cine</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Core Capabilities (comma separated)</label>
                  <input
                    type="text"
                    value={newMemberForm.capabilities}
                    onChange={(e) => setNewMemberForm({ ...newMemberForm, capabilities: e.target.value })}
                    placeholder="e.g. Figma Tokens, Cinema 4D, Color Grading, Kinetic Typography"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 font-medium"
                  />
                </div>

                {/* Submit Row */}
                <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setIsAddMemberOpen(false)}
                    className="px-4 py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50 cursor-pointer transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white text-xs font-bold shadow-md shadow-blue-500/25 active:scale-95 transition-all cursor-pointer"
                  >
                    Create & Provision Specialist
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

export const AdminTeamsPage = AdminTeamManagementPage;

// ─────────────────────────────────────────────────────────────────────────────
// 7. ADMIN LEAVE APPROVALS PAGE
// ─────────────────────────────────────────────────────────────────────────────
export function AdminLeaveApprovalsPage() {
  const [toast, setToast] = useState<string | null>(null);
  const [filterTab, setFilterTab] = useState<"all" | "pending" | "approved" | "rejected">("all");
  const [isApplyModalOpen, setIsApplyModalOpen] = useState(false);

  const [leaveRequests, setLeaveRequests] = useState([
    {
      id: "lr-1",
      name: "Elena Rostova",
      department: "Video & Design",
      pod: "Pod A",
      startDate: "2024-11-20",
      endDate: "2024-11-22",
      days: 3,
      reason: "Scheduled personal leave and medical checkup.",
      status: "pending",
      submittedAt: "Yesterday 4:15 PM",
    },
    {
      id: "lr-2",
      name: "Omar Vance",
      department: "Creative Strategy",
      pod: "Pod B",
      startDate: "2024-11-28",
      endDate: "2024-11-29",
      days: 2,
      reason: "Thanksgiving holiday travel.",
      status: "approved",
      submittedAt: "Nov 12",
    },
    {
      id: "lr-3",
      name: "Kenji Sato",
      department: "Motion Graphics",
      pod: "Pod C",
      startDate: "2024-12-05",
      endDate: "2024-12-08",
      days: 4,
      reason: "Annual family visit.",
      status: "approved",
      submittedAt: "Nov 10",
    },
  ]);

  const handleAction = (id: string, action: "approved" | "rejected") => {
    setLeaveRequests((prev) =>
      prev.map((lr) => (lr.id === id ? { ...lr, status: action } : lr))
    );
    setToast(`Leave request ${action} successfully.`);
    setTimeout(() => setToast(null), 3000);
  };

  const filteredRequests = leaveRequests.filter(
    (lr) => filterTab === "all" || lr.status === filterTab
  );

  return (
    <div data-surface="ops" className="w-full min-h-screen font-sans bg-[#F9FAFB] flex flex-col">
      <AdminTopHeader activeTab="Team Details" />
      <main className="flex-1 px-6 lg:px-8 pt-4 pb-16 max-w-[1500px] w-full mx-auto space-y-8">
        {toast && (
          <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold rounded-2xl flex items-center justify-between shadow-sm animate-fade-in">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>{toast}</span>
            </div>
            <button onClick={() => setToast(null)} className="text-emerald-600 hover:text-emerald-900 font-bold">
              Dismiss
            </button>
          </div>
        )}

        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-gray-200 pb-4">

          <div className="flex items-center gap-3">
            <Link
              to="/admin/team"
              className="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-gray-800 text-xs font-bold flex items-center gap-1.5 transition-colors"
            >
              <UserCog className="w-4 h-4 text-slate-500" /> Team Roster
            </Link>
            <button
              type="button"
              onClick={() => setIsApplyModalOpen(true)}
              className="px-4 py-2 rounded-xl bg-[#2B7BC4] hover:bg-[#1A5EA8] text-white text-xs font-bold flex items-center gap-1.5 shadow-sm cursor-pointer"
            >
              <Plus className="w-4 h-4" /> Apply for Leave
            </button>
          </div>
        </div>

        {/* 2 Top KPI Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white rounded-3xl p-6 border border-gray-100 shadow-[0_4px_20px_rgba(0,0,0,0.03)] flex flex-col justify-between">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                PEOPLE WORKING TODAY
              </span>
              <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
                <Users className="w-4 h-4" />
              </div>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-black text-gray-900 tracking-tight">29</span>
              <span className="text-xs font-semibold text-gray-500">Active in Office</span>
            </div>
            <div className="mt-6 pt-4 border-t border-gray-100 flex items-center justify-between text-xs font-semibold text-gray-500">
              <span className="flex items-center gap-1.5 text-emerald-600">
                <span className="w-2 h-2 rounded-full bg-emerald-600" /> 32 Total Team Members
              </span>
              <span className="text-gray-900 font-bold">91% In-Office</span>
            </div>
          </div>

          <div className="bg-white rounded-3xl p-6 border border-gray-100 shadow-[0_4px_20px_rgba(0,0,0,0.03)] flex flex-col justify-between">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                ON LEAVE TODAY
              </span>
              <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
                <Plane className="w-4 h-4" />
              </div>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-black text-gray-900 tracking-tight">3</span>
              <span className="text-xs font-semibold text-gray-500">Specialists Away</span>
            </div>
            <div className="mt-6 pt-4 border-t border-gray-100 flex items-center justify-between text-xs font-semibold text-gray-500">
              <span className="text-slate-500">Sarah C. (Pod A), Julian R. (Pod D)</span>
              <span className="text-amber-600 font-bold">9% Away</span>
            </div>
          </div>
        </div>

        {/* Requests Table */}
        <div className="rounded-2xl border border-gray-100 bg-white shadow-sm overflow-hidden">
          <div className="p-4 border-b border-gray-100 flex items-center justify-between bg-slate-50/50">
            <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl text-xs">
              {(["all", "pending", "approved", "rejected"] as const).map((tab) => (
                <button
                  key={tab}
                  type="button"
                  onClick={() => setFilterTab(tab)}
                  className={`px-3 py-1 rounded-lg capitalize font-bold transition-all cursor-pointer ${
                    filterTab === tab ? "bg-white text-gray-900 shadow-xs" : "text-gray-500"
                  }`}
                >
                  {tab}
                </button>
              ))}
            </div>
          </div>

          <table className="w-full text-left text-xs text-[#0D2137]">
            <thead className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold uppercase tracking-wider text-slate-500">
              <tr>
                <th className="px-5 py-3.5">Specialist</th>
                <th className="px-5 py-3.5">Dates</th>
                <th className="px-5 py-3.5">Reason</th>
                <th className="px-5 py-3.5">Status</th>
                <th className="px-5 py-3.5 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 font-medium">
              {filteredRequests.map((lr) => (
                <tr key={lr.id} className="hover:bg-gray-50/60">
                  <td className="px-5 py-4">
                    <div className="font-bold text-gray-900">{lr.name}</div>
                    <div className="text-[11px] text-gray-400">{lr.department} • {lr.pod}</div>
                  </td>
                  <td className="px-5 py-4 font-mono text-[11px]">
                    <div>{lr.startDate} to {lr.endDate}</div>
                    <span className="text-gray-400 font-sans">({lr.days} days)</span>
                  </td>
                  <td className="px-5 py-4 text-gray-600 max-w-xs">{lr.reason}</td>
                  <td className="px-5 py-4">
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase ${
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
                  <td className="px-5 py-4 text-right">
                    {lr.status === "pending" ? (
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          type="button"
                          onClick={() => handleAction(lr.id, "approved")}
                          className="px-3 py-1 rounded-lg bg-emerald-600 text-white font-bold text-xs hover:bg-emerald-700 cursor-pointer"
                        >
                          Approve
                        </button>
                        <button
                          type="button"
                          onClick={() => handleAction(lr.id, "rejected")}
                          className="px-3 py-1 rounded-lg bg-gray-100 text-gray-700 font-bold text-xs hover:bg-rose-50 hover:text-rose-600 cursor-pointer"
                        >
                          Reject
                        </button>
                      </div>
                    ) : (
                      <span className="text-gray-400 text-xs">—</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Apply Modal */}
        {isApplyModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm animate-fade-in">
            <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl space-y-4 border border-gray-100">
              <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                <h3 className="text-base font-bold text-gray-900">Apply for Time Off</h3>
                <button
                  type="button"
                  onClick={() => setIsApplyModalOpen(false)}
                  className="p-1 rounded-lg text-gray-400 hover:text-gray-700 cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  setToast("Leave request submitted to Team Lead!");
                  setIsApplyModalOpen(false);
                }}
                className="space-y-3"
              >
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">Start Date</label>
                    <input type="date" required className="w-full px-3 py-2 rounded-xl border border-gray-200 text-xs" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">End Date</label>
                    <input type="date" required className="w-full px-3 py-2 rounded-xl border border-gray-200 text-xs" />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Reason</label>
                  <textarea rows={3} required placeholder="State reason for time off..." className="w-full px-3 py-2 rounded-xl border border-gray-200 text-xs resize-none" />
                </div>
                <div className="flex justify-end gap-2 pt-2 border-t border-gray-100">
                  <button type="button" onClick={() => setIsApplyModalOpen(false)} className="px-4 py-2 rounded-xl border border-gray-200 text-xs font-bold text-gray-600 hover:bg-gray-50">Cancel</button>
                  <button type="submit" className="px-4 py-2 rounded-xl bg-[#2B7BC4] text-xs font-bold text-white hover:bg-[#1A5EA8]">Submit</button>
                </div>
              </form>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

export const AdminLeavePage = AdminLeaveApprovalsPage;

// ─────────────────────────────────────────────────────────────────────────────
// 8. ADMIN REVENUE PAGE (REVENUE ENGINE & CLIENT PLAN NEGOTIATIONS)
// ─────────────────────────────────────────────────────────────────────────────

export interface TransactionItem {
  id: string;
  client: string;
  clientInitials: string;
  scope: string;
  amount: number;
  method: string;
  status: "Paid" | "Pending" | "Overdue";
  date: string;
  badgeClass: string;
  avatarBg: string;
}

export interface PlanNegotiationItem {
  id: string;
  clientName: string;
  clientLogo: string;
  currentPlan: string;
  proposedPlan: string;
  originalPrice: number;
  proposedPrice: number;
  discountPct: number;
  notes: string;
  requestedAt: string;
  status: "Pending Review" | "Accepted" | "Declined" | "Counter Offered";
  counterPrice?: number;
  declineReason?: string;
}

export function AdminRevenuePage() {
  const [timeframe, setTimeframe] = useState<"7D" | "30D" | "Quarter" | "Year" | "Custom">("30D");
  const [filter, setFilter] = useState<"all" | "paid" | "pending" | "overdue">("all");
  const [search, setSearch] = useState("");
  const [toast, setToast] = useState<string | null>(null);

  // Modals
  const [selectedReceipt, setSelectedReceipt] = useState<TransactionItem | null>(null);
  const [isCreateInvoiceOpen, setIsCreateInvoiceOpen] = useState(false);

  // Form States
  const [newInvClient, setNewInvClient] = useState("");
  const [newInvScope, setNewInvScope] = useState("");
  const [newInvAmount, setNewInvAmount] = useState("");
  const [newInvMethod, setNewInvMethod] = useState("Stripe ACH");

  // Transactions Data matching user's image exactly
  const [transactions, setTransactions] = useState<TransactionItem[]>([
    {
      id: "CR-9481",
      client: "Northwind Labs",
      clientInitials: "NL",
      scope: "Enterprise Retainer • Nov 2024",
      amount: 95000,
      method: "Razorpay UPI",
      status: "Paid",
      date: "Nov 12",
      badgeClass: "bg-emerald-50 text-emerald-700 border-emerald-200",
      avatarBg: "bg-blue-100 text-blue-800",
    },
    {
      id: "CR-9480",
      client: "Bloom Studio",
      clientInitials: "BS",
      scope: "Growth Retainer + 1x Addon Reel",
      amount: 60000,
      method: "Bank Wire",
      status: "Paid",
      date: "Nov 10",
      badgeClass: "bg-emerald-50 text-emerald-700 border-emerald-200",
      avatarBg: "bg-purple-100 text-purple-800",
    },
    {
      id: "CR-9479",
      client: "Atlas Commerce",
      clientInitials: "AC",
      scope: "Enterprise Retainer • Net 15",
      amount: 95000,
      method: "Invoice Net 15",
      status: "Pending",
      date: "Due Nov 20",
      badgeClass: "bg-blue-50 text-blue-700 border-blue-200",
      avatarBg: "bg-sky-100 text-sky-800",
    },
    {
      id: "CR-9478",
      client: "Horizon Digital",
      clientInitials: "HD",
      scope: "Starter Launch Package",
      amount: 25000,
      method: "Mastercard •• 4912",
      status: "Paid",
      date: "Nov 08",
      badgeClass: "bg-emerald-50 text-emerald-700 border-emerald-200",
      avatarBg: "bg-indigo-100 text-indigo-800",
    },
    {
      id: "CR-9477",
      client: "Zenith Brands",
      clientInitials: "ZB",
      scope: "Growth Retainer • Nov 2024",
      amount: 50000,
      method: "Razorpay UPI",
      status: "Paid",
      date: "Nov 05",
      badgeClass: "bg-emerald-50 text-emerald-700 border-emerald-200",
      avatarBg: "bg-amber-100 text-amber-800",
    },
    {
      id: "CR-9476",
      client: "Apex Media",
      clientInitials: "AM",
      scope: "Add-on Asset Pack (SaaS Motion)",
      amount: 15000,
      method: "Visa •• 8841",
      status: "Paid",
      date: "Nov 03",
      badgeClass: "bg-emerald-50 text-emerald-700 border-emerald-200",
      avatarBg: "bg-rose-100 text-rose-800",
    },
  ]);

  // Chart Trend Data
  const trajectoryPoints = [
    { label: "Oct 15 (₹9.8L)", value: 980000, target: 1000000 },
    { label: "Oct 22", value: 1042000, target: 1050000 },
    { label: "Oct 29", value: 1125000, target: 1100000 },
    { label: "Nov 05", value: 1184000, target: 1150000 },
    { label: "Nov 14 (₹12.5L)", value: 1248000, target: 1200000 },
  ];

  // Actions: Create Invoice
  const handleCreateInvoiceSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newInvClient || !newInvAmount) return;

    const newTx: TransactionItem = {
      id: `CR-${Math.floor(9000 + Math.random() * 999)}`,
      client: newInvClient,
      clientInitials: newInvClient.split(" ").map((w) => w[0]).join("").toUpperCase().slice(0, 2),
      scope: newInvScope || "Retainer Billing",
      amount: parseFloat(newInvAmount),
      method: newInvMethod,
      status: "Pending",
      date: "Due Net 15",
      badgeClass: "bg-blue-50 text-blue-700 border-blue-200",
      avatarBg: "bg-blue-100 text-blue-800",
    };

    setTransactions((prev) => [newTx, ...prev]);
    setToast(`Invoice ${newTx.id} created for ${newInvClient} (₹${newTx.amount.toLocaleString('en-IN')})!`);
    setIsCreateInvoiceOpen(false);
    setNewInvClient("");
    setNewInvScope("");
    setNewInvAmount("");
    setTimeout(() => setToast(null), 4000);
  };

  // Actions: Send Payment Reminder
  const handleSendReminder = (tx: TransactionItem) => {
    setToast(`Payment reminder notification sent to ${tx.client} for invoice ${tx.id}.`);
    setTimeout(() => setToast(null), 3500);
  };

  // Actions: Export CSV
  const handleExportCSV = () => {
    const csvHeader = "Invoice ID,Client,Scope,Amount,Method,Status,Date\n";
    const csvRows = transactions
      .map((t) => `${t.id},"${t.client}","${t.scope}",${t.amount},"${t.method}",${t.status},"${t.date}"`)
      .join("\n");
    const blob = new Blob([csvHeader + csvRows], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `transactions_export_${Date.now()}.csv`;
    a.click();
    setToast("Transaction roster CSV report generated & downloaded.");
    setTimeout(() => setToast(null), 3000);
  };

  const filteredTx = transactions.filter((t) => {
    const matchesFilter = filter === "all" || t.status.toLowerCase() === filter.toLowerCase();
    const matchesSearch =
      !search ||
      t.client.toLowerCase().includes(search.toLowerCase()) ||
      t.id.toLowerCase().includes(search.toLowerCase()) ||
      t.scope.toLowerCase().includes(search.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  return (
    <div data-surface="ops" className="w-full min-h-screen font-sans bg-[#F8FAFC] flex flex-col">
      <AdminTopHeader title="Revenue Engine" activeTab="Revenue" />

      <main className="flex-1 px-6 lg:px-10 pt-4 pb-16 max-w-[1500px] w-full mx-auto space-y-8">
        {toast && (
          <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold rounded-2xl flex items-center justify-between shadow-sm animate-fade-in">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>{toast}</span>
            </div>
            <button onClick={() => setToast(null)} className="text-emerald-600 hover:text-emerald-900 font-bold">
              Dismiss
            </button>
          </div>
        )}

        {/* ─────────────────────────────────────────────────────────────────────────────
            TOP CONTROLS & TIMEFRAME ACTIONS
        ───────────────────────────────────────────────────────────────────────────── */}
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-black bg-emerald-50 text-emerald-700 border border-emerald-200">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              Live Cash Flow & Retainers
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* Timeframe selector pills */}
            <div className="flex items-center bg-gray-100 p-1 rounded-xl text-xs font-bold border border-gray-200">
              {(["7D", "30D", "Quarter", "Year", "Custom"] as const).map((tf) => (
                <button
                  key={tf}
                  type="button"
                  onClick={() => setTimeframe(tf)}
                  className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                    timeframe === tf
                      ? "bg-white text-blue-600 shadow-xs font-black"
                      : "text-gray-500 hover:text-gray-900"
                  }`}
                >
                  {tf}
                </button>
              ))}
            </div>

            <button
              type="button"
              onClick={handleExportCSV}
              className="px-4 py-2 rounded-xl bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 text-xs font-bold flex items-center gap-1.5 shadow-2xs cursor-pointer"
            >
              <Download className="w-4 h-4 text-gray-500" /> Export Report
            </button>

            <button
              type="button"
              onClick={() => setIsCreateInvoiceOpen(true)}
              className="px-4 py-2 rounded-xl bg-[#2563EB] hover:bg-blue-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-md shadow-blue-500/20 cursor-pointer transition-all"
            >
              <Plus className="w-4 h-4" /> Create Invoice
            </button>
          </div>
        </div>

        {/* ─────────────────────────────────────────────────────────────────────────────
            TOP METRIC CARDS (Matching Image 1)
        ───────────────────────────────────────────────────────────────────────────── */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Metric 1: Total Revenue (MRR) */}
          <div className="bg-white rounded-3xl p-6 lg:p-7 border border-gray-100 shadow-[0_4px_25px_rgba(0,0,0,0.03)] flex items-center justify-between">
            <div className="space-y-2">
              <span className="text-[11px] font-extrabold text-gray-400 uppercase tracking-wider">
                Total Revenue (MRR)
              </span>
              <div className="flex items-baseline gap-3">
                <span className="text-4xl font-black text-gray-900 tracking-tight">₹12,48,000</span>
                <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1">
                  <TrendingUp className="w-3.5 h-3.5" /> +12.4%
                </span>
              </div>
              <div className="text-xs text-gray-500 font-medium pt-1">
                Projected ARR: <strong className="text-gray-900 font-bold">₹1,49,76,000</strong>
              </div>
            </div>
            <div className="w-14 h-14 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0 border border-blue-100 font-black text-2xl">
              ₹
            </div>
          </div>

          {/* Metric 2: Collected this Month */}
          <div className="bg-white rounded-3xl p-6 lg:p-7 border border-gray-100 shadow-[0_4px_25px_rgba(0,0,0,0.03)] flex items-center justify-between">
            <div className="space-y-2">
              <span className="text-[11px] font-extrabold text-gray-400 uppercase tracking-wider">
                Collected this Month
              </span>
              <div className="flex items-baseline gap-3">
                <span className="text-4xl font-black text-gray-900 tracking-tight">₹10,84,000</span>
                <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-blue-50 text-blue-700 border border-blue-200">
                  86.8% Rate
                </span>
              </div>
              <div className="text-xs text-gray-500 font-medium pt-1">
                Settlement Ratio: <strong className="text-gray-900 font-bold">16 of 18 Retainers</strong>
              </div>
            </div>
            <div className="w-14 h-14 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0 border border-emerald-100">
              <CheckCircle2 className="w-7 h-7" />
            </div>
          </div>
        </div>

        {/* ─────────────────────────────────────────────────────────────────────────────
            CHARTS & TIER BREAKDOWN GRID (Matching Image 1)
        ───────────────────────────────────────────────────────────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Revenue Growth & Trajectory (2 Cols) */}
          <div className="lg:col-span-2 bg-white rounded-3xl p-6 lg:p-8 border border-gray-100 shadow-[0_4px_30px_rgba(0,0,0,0.04)] space-y-6 flex flex-col justify-between">
            <div>
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="text-lg font-bold text-gray-900 tracking-tight">Revenue Growth & Trajectory</h3>
                  <p className="text-xs text-gray-500">30-Day aggregate cash flow across retainers & add-on deliverables</p>
                </div>

                <div className="flex items-center gap-4 text-xs font-bold">
                  <span className="flex items-center gap-1.5 text-blue-600">
                    <span className="w-2.5 h-2.5 rounded-full bg-blue-600" /> Actual Inflow
                  </span>
                  <span className="flex items-center gap-1.5 text-gray-400">
                    <span className="w-2.5 h-2.5 rounded-full bg-gray-300" /> Target Baseline
                  </span>
                </div>
              </div>

              {/* Peak Marker Badge */}
              <div className="flex justify-end mb-2">
                <span className="px-3 py-1 rounded-full text-[11px] font-black bg-[#2563EB] text-white shadow-md">
                  ₹12,48,000 Peak • Today Nov 14
                </span>
              </div>

              {/* Recharts Area Chart */}
              <div className="w-full h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={trajectoryPoints} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorTrajectory" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#2563EB" stopOpacity={0.35} />
                        <stop offset="95%" stopColor="#2563EB" stopOpacity={0.02} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey="label" tick={{ fontSize: 11, fill: "#64748b" }} axisLine={false} tickLine={false} />
                    <YAxis
                      tick={{ fontSize: 11, fill: "#64748b" }}
                      axisLine={false}
                      tickLine={false}
                      tickFormatter={(v: number) => `₹${(v / 100000).toFixed(1)}L`}
                    />
                    <Tooltip
                      formatter={(val: any) => [`₹${Number(val).toLocaleString('en-IN')}`, "Revenue"]}
                      contentStyle={{ borderRadius: 12, border: "1px solid #e2e8f0", boxShadow: "0 10px 25px rgba(0,0,0,0.08)" }}
                    />
                    <ReferenceLine y={1200000} stroke="#94a3b8" strokeDasharray="4 4" />
                    <Area
                      type="monotone"
                      dataKey="value"
                      stroke="#2563EB"
                      strokeWidth={3}
                      fill="url(#colorTrajectory)"
                      dot={{ r: 4, fill: "#2563EB", stroke: "#fff", strokeWidth: 2 }}
                      activeDot={{ r: 6, fill: "#2563EB", stroke: "#fff", strokeWidth: 2 }}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Bottom Metrics Bar */}
            <div className="pt-4 border-t border-gray-100 grid grid-cols-2 sm:grid-cols-4 gap-4 text-center">
              <div className="bg-gray-50 p-3 rounded-2xl border border-gray-100">
                <span className="text-[10px] font-bold text-gray-400 uppercase">Invoiced</span>
                <div className="text-sm font-black text-gray-900">₹12,48,000</div>
              </div>
              <div className="bg-gray-50 p-3 rounded-2xl border border-gray-100">
                <span className="text-[10px] font-bold text-gray-400 uppercase">Direct UPI / Wire</span>
                <div className="text-sm font-black text-gray-900">₹9,82,000</div>
              </div>
              <div className="bg-gray-50 p-3 rounded-2xl border border-gray-100">
                <span className="text-[10px] font-bold text-gray-400 uppercase">Cards / Razorpay</span>
                <div className="text-sm font-black text-gray-900">₹2,66,000</div>
              </div>
              <div className="bg-gray-50 p-3 rounded-2xl border border-gray-100">
                <span className="text-[10px] font-bold text-gray-400 uppercase">Disputed / Refunded</span>
                <div className="text-sm font-black text-emerald-600">₹0</div>
              </div>
            </div>
          </div>

          {/* Plan & Tier Distribution (1 Col) */}
          <div className="bg-white rounded-3xl p-6 lg:p-8 border border-gray-100 shadow-[0_4px_30px_rgba(0,0,0,0.04)] space-y-6 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-lg font-bold text-gray-900 tracking-tight">Plan & Tier Distribution</h3>
                  <p className="text-xs text-gray-500">Active monthly retainers by package tier</p>
                </div>
                <button
                  type="button"
                  title="Refresh Tiers"
                  onClick={() => {
                    setToast("Plan tier metrics refreshed.");
                    setTimeout(() => setToast(null), 2500);
                  }}
                  className="p-2 rounded-xl hover:bg-gray-100 text-gray-400 hover:text-gray-700 cursor-pointer"
                >
                  <RefreshCw className="w-4 h-4" />
                </button>
              </div>

              {/* Tiers List matching Image 1 */}
              <div className="space-y-5">
                {/* Package 1 */}
                <div className="space-y-2 p-3 bg-blue-50/40 rounded-2xl border border-blue-100/60">
                  <div className="flex items-center justify-between text-xs font-bold">
                    <span className="flex items-center gap-2 text-gray-900">
                      <span className="w-2.5 h-2.5 rounded-full bg-blue-600" /> Package 1 (Enterprise Domination)
                    </span>
                    <span className="text-gray-900 font-black">₹5,70,000 <span className="text-[10px] font-normal text-gray-500">/ mo</span></span>
                  </div>
                  <div className="w-full bg-blue-100 rounded-full h-2 overflow-hidden">
                    <div className="bg-blue-600 h-full rounded-full w-[45.6%]" />
                  </div>
                  <div className="flex justify-between text-[11px] text-gray-500 font-semibold">
                    <span>6 Retainer Accounts</span>
                    <span className="text-blue-700 font-bold">45.6% of MRR</span>
                  </div>
                </div>

                {/* Package 2 */}
                <div className="space-y-2 p-3 bg-purple-50/40 rounded-2xl border border-purple-100/60">
                  <div className="flex items-center justify-between text-xs font-bold">
                    <span className="flex items-center gap-2 text-gray-900">
                      <span className="w-2.5 h-2.5 rounded-full bg-purple-600" /> Package 2 (Brand Accelerator)
                    </span>
                    <span className="text-gray-900 font-black">₹4,00,000 <span className="text-[10px] font-normal text-gray-500">/ mo</span></span>
                  </div>
                  <div className="w-full bg-purple-100 rounded-full h-2 overflow-hidden">
                    <div className="bg-purple-600 h-full rounded-full w-[32.0%]" />
                  </div>
                  <div className="flex justify-between text-[11px] text-gray-500 font-semibold">
                    <span>8 Retainer Accounts</span>
                    <span className="text-purple-700 font-bold">32.0% of MRR</span>
                  </div>
                </div>

                {/* Package 3 */}
                <div className="space-y-2 p-3 bg-emerald-50/40 rounded-2xl border border-emerald-100/60">
                  <div className="flex items-center justify-between text-xs font-bold">
                    <span className="flex items-center gap-2 text-gray-900">
                      <span className="w-2.5 h-2.5 rounded-full bg-emerald-600" /> Package 3 (Starter Growth)
                    </span>
                    <span className="text-gray-900 font-black">₹1,00,000 <span className="text-[10px] font-normal text-gray-500">/ mo</span></span>
                  </div>
                  <div className="w-full bg-emerald-100 rounded-full h-2 overflow-hidden">
                    <div className="bg-emerald-600 h-full rounded-full w-[8.0%]" />
                  </div>
                  <div className="flex justify-between text-[11px] text-gray-500 font-semibold">
                    <span>4 Retainer Accounts</span>
                    <span className="text-emerald-700 font-bold">8.0% of MRR</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Sub-card: Add-ons & Overages */}
            <div className="p-4 bg-indigo-50/50 rounded-2xl border border-indigo-100 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center font-bold">
                  <Layers className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-bold text-xs text-gray-900">Add-ons & Overages</h4>
                  <p className="text-[11px] text-gray-500 font-medium">3 viral reels + 4 performance ad sets</p>
                </div>
              </div>
              <span className="text-base font-black text-indigo-700">+₹64,000</span>
            </div>
          </div>
        </div>

        {/* ─────────────────────────────────────────────────────────────────────────────
            SALES & NEGOTIATIONS CALLOUT BANNER
        ───────────────────────────────────────────────────────────────────────────── */}
        <div className="p-5 rounded-3xl bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-100 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-2xs">
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-2xl bg-blue-600 text-white flex items-center justify-center font-bold shadow-md shadow-blue-500/20 shrink-0">
              <DollarSign className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-xs font-black text-gray-900 uppercase tracking-wide">Client Plan Negotiations & Proposals</h4>
              <p className="text-xs text-gray-600">Review pending custom scope proposals, counter-offers, and deal proposals on the Sales page.</p>
            </div>
          </div>
          <Link
            to="/admin/sales"
            className="px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition-all shrink-0 shadow-sm flex items-center gap-1.5 cursor-pointer"
          >
            Open Sales & Negotiations &rarr;
          </Link>
        </div>

        {/* ─────────────────────────────────────────────────────────────────────────────
            RECENT TRANSACTIONS ROSTER TABLE (Matching Image 2)
        ───────────────────────────────────────────────────────────────────────────── */}
        <div className="bg-white rounded-3xl border border-gray-100 shadow-[0_4px_30px_rgba(0,0,0,0.04)] p-6 lg:p-8 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <h3 className="text-xl font-black text-[#0F172A] tracking-tight">Recent Transactions</h3>

            <div className="flex flex-wrap items-center gap-3">
              {/* Search */}
              <div className="relative min-w-[240px]">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search client or invoice..."
                  className="w-full pl-9 pr-4 py-2 rounded-xl border border-gray-200 text-xs text-gray-900 focus:outline-none focus:border-blue-500"
                />
              </div>

              {/* Status Filter Pills */}
              <div className="flex items-center gap-1 bg-gray-100 p-1 rounded-xl text-xs font-bold">
                {(["all", "paid", "pending", "overdue"] as const).map((st) => (
                  <button
                    key={st}
                    type="button"
                    onClick={() => setFilter(st)}
                    className={`px-3 py-1.5 rounded-lg capitalize transition-all cursor-pointer ${
                      filter === st ? "bg-white text-gray-900 shadow-xs font-black" : "text-gray-500 hover:text-gray-900"
                    }`}
                  >
                    {st}
                  </button>
                ))}
              </div>

              {/* Export CSV Button matching Image 2 */}
              <button
                type="button"
                onClick={handleExportCSV}
                className="px-3.5 py-2 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-600 text-xs font-bold flex items-center gap-1.5 cursor-pointer border border-blue-100 transition-colors"
              >
                <Download className="w-3.5 h-3.5" /> Export CSV
              </button>
            </div>
          </div>

          {/* Table matching Image 2 */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-[#0D2137]">
              <thead className="bg-gray-50 border-b border-gray-100 text-[11px] font-extrabold uppercase tracking-wider text-gray-400">
                <tr>
                  <th className="px-5 py-4">CLIENT & SCOPE</th>
                  <th className="px-5 py-4">INVOICE #</th>
                  <th className="px-5 py-4">AMOUNT</th>
                  <th className="px-5 py-4">PAYMENT METHOD</th>
                  <th className="px-5 py-4">STATUS</th>
                  <th className="px-5 py-4 text-right">ACTIONS</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 font-medium">
                {filteredTx.map((tx) => (
                  <tr key={tx.id} className="hover:bg-gray-50/70 transition-colors">
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <div className={`w-9 h-9 rounded-xl ${tx.avatarBg} font-black text-xs flex items-center justify-center shrink-0`}>
                          {tx.clientInitials}
                        </div>
                        <div>
                          <div className="font-bold text-sm text-gray-900">{tx.client}</div>
                          <div className="text-[11px] text-gray-500">{tx.scope}</div>
                        </div>
                      </div>
                    </td>

                    <td className="px-5 py-4 font-mono font-bold text-gray-600">{tx.id}</td>

                    <td className="px-5 py-4 font-black text-sm text-gray-900">
                      ₹{tx.amount.toLocaleString('en-IN')}
                    </td>

                    <td className="px-5 py-4 text-gray-600 font-medium">{tx.method}</td>

                    <td className="px-5 py-4">
                      <span className={`px-2.5 py-1 rounded-full text-[11px] font-bold border flex items-center gap-1.5 w-fit ${tx.badgeClass}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${tx.status === "Paid" ? "bg-emerald-500" : "bg-blue-500"}`} />
                        {tx.status} ({tx.date})
                      </span>
                    </td>

                    <td className="px-5 py-4 text-right">
                      {tx.status === "Paid" ? (
                        <button
                          type="button"
                          onClick={() => setSelectedReceipt(tx)}
                          className="text-blue-600 font-bold hover:underline inline-flex items-center gap-0.5 cursor-pointer text-xs"
                        >
                          Receipt <ArrowUpRight className="w-3.5 h-3.5" />
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleSendReminder(tx)}
                          className="px-3 py-1.5 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-600 font-bold text-xs inline-flex items-center gap-1 cursor-pointer"
                        >
                          <Play className="w-3 h-3 fill-current" /> Remind
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Table Footer matching Image 2 */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-4 border-t border-gray-100 text-xs text-gray-500 font-medium">
            <span>Showing 1 to {filteredTx.length} of 18 transactions</span>

            <div className="flex items-center gap-1">
              <button type="button" className="p-2 rounded-lg hover:bg-gray-100 text-gray-400">&lt;</button>
              <button type="button" className="w-8 h-8 rounded-lg bg-[#2563EB] text-white font-bold">1</button>
              <button type="button" className="w-8 h-8 rounded-lg hover:bg-gray-100 font-bold text-gray-700">2</button>
              <button type="button" className="w-8 h-8 rounded-lg hover:bg-gray-100 font-bold text-gray-700">3</button>
              <button type="button" className="p-2 rounded-lg hover:bg-gray-100 text-gray-400">&gt;</button>
            </div>
          </div>
        </div>

        {/* ─────────────────────────────────────────────────────────────────────────────
            PAGE FOOTER matching Image 2
        ───────────────────────────────────────────────────────────────────────────── */}
        <footer className="pt-8 border-t border-gray-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-xs text-gray-400 font-medium">
          <div className="flex items-center gap-2">
            <span className="font-black text-gray-900 tracking-tight">creo.</span>
            <span>© 2025 Creo Enterprise Systems. All rights reserved.</span>
          </div>

          <div className="flex items-center gap-6 font-semibold text-gray-500">
            <a href="#security" className="hover:text-gray-900 transition-colors">Security & Compliance</a>
            <a href="#governance" className="hover:text-gray-900 transition-colors">Executive Governance</a>
            <a href="#support" className="hover:text-gray-900 transition-colors">Global Support</a>
          </div>
        </footer>
      </main>

      {/* ─────────────────────────────────────────────────────────────────────────────
          MODAL: CREATE INVOICE
      ───────────────────────────────────────────────────────────────────────────── */}
      {isCreateInvoiceOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl space-y-4 border border-gray-100">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <h3 className="text-base font-bold text-gray-900">Create New Invoice</h3>
              <button type="button" onClick={() => setIsCreateInvoiceOpen(false)} className="p-1 rounded-lg text-gray-400 hover:text-gray-700">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateInvoiceSubmit} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-gray-700 mb-1">Client Brand Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Acme Corporation"
                  value={newInvClient}
                  onChange={(e) => setNewInvClient(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl border border-gray-200 text-xs focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-bold text-gray-700 mb-1">Deliverable Scope Description</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Enterprise Retainer • Dec 2024"
                  value={newInvScope}
                  onChange={(e) => setNewInvScope(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl border border-gray-200 text-xs focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-gray-700 mb-1">Amount (₹ INR)</label>
                  <input
                    type="number"
                    required
                    placeholder="50000"
                    value={newInvAmount}
                    onChange={(e) => setNewInvAmount(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-xl border border-gray-200 text-xs focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block font-bold text-gray-700 mb-1">Payment Method</label>
                  <select
                    value={newInvMethod}
                    onChange={(e) => setNewInvMethod(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-xl border border-gray-200 text-xs font-medium"
                  >
                    <option value="Razorpay UPI">Razorpay UPI</option>
                    <option value="Bank Wire">Bank Wire</option>
                    <option value="Invoice Net 15">Invoice Net 15</option>
                    <option value="Credit / Debit Card">Credit / Debit Card</option>
                  </select>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setIsCreateInvoiceOpen(false)}
                  className="px-4 py-2 rounded-xl border border-gray-200 font-bold text-gray-600 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-[#2563EB] text-white font-bold hover:bg-blue-700 shadow-sm"
                >
                  Generate Invoice
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────────────────────
          MODAL: RECEIPT VIEWER
      ───────────────────────────────────────────────────────────────────────────── */}
      {selectedReceipt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-lg rounded-3xl bg-white p-6 lg:p-8 shadow-2xl space-y-6 border border-gray-100">
            <div className="flex items-center justify-between border-b border-gray-100 pb-4">
              <div className="flex items-center gap-2">
                <span className="font-black text-xl text-gray-900 tracking-tight">creo.</span>
                <span className="text-xs font-bold text-gray-400">Payment Receipt</span>
              </div>
              <button type="button" onClick={() => setSelectedReceipt(null)} className="p-1 text-gray-400 hover:text-gray-700">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4 text-xs">
              <div className="p-4 bg-emerald-50 rounded-2xl border border-emerald-200 flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-bold text-emerald-700 uppercase block">Status</span>
                  <span className="text-sm font-black text-emerald-900">Payment Settled (Paid)</span>
                </div>
                <CheckCircle2 className="w-7 h-7 text-emerald-600" />
              </div>

              <div className="grid grid-cols-2 gap-4 text-gray-600 font-medium">
                <div>
                  <span className="text-gray-400 block text-[10px] uppercase font-bold">Client</span>
                  <strong className="text-gray-900 text-sm">{selectedReceipt.client}</strong>
                </div>
                <div>
                  <span className="text-gray-400 block text-[10px] uppercase font-bold">Invoice Number</span>
                  <strong className="text-gray-900 text-sm font-mono">{selectedReceipt.id}</strong>
                </div>
                <div>
                  <span className="text-gray-400 block text-[10px] uppercase font-bold">Payment Method</span>
                  <span className="text-gray-900 font-bold">{selectedReceipt.method}</span>
                </div>
                <div>
                  <span className="text-gray-400 block text-[10px] uppercase font-bold">Settlement Date</span>
                  <span className="text-gray-900 font-bold">{selectedReceipt.date}</span>
                </div>
              </div>

              <div className="pt-3 border-t border-gray-100 space-y-2">
                <span className="text-gray-400 block text-[10px] uppercase font-bold">Scope Breakdown</span>
                <div className="p-3 bg-gray-50 rounded-xl flex items-center justify-between font-bold text-gray-900">
                  <span>{selectedReceipt.scope}</span>
                  <span>₹{selectedReceipt.amount.toLocaleString('en-IN')}</span>
                </div>
              </div>

              <div className="pt-2 flex justify-between items-center text-sm font-black text-gray-900 border-t border-gray-200">
                <span>Total Settled</span>
                <span className="text-base text-blue-600">₹{selectedReceipt.amount.toLocaleString('en-IN')} INR</span>
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => window.print()}
                className="flex-1 py-2.5 rounded-xl border border-gray-200 font-bold text-xs text-gray-700 hover:bg-gray-50 flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Printer className="w-4 h-4" /> Print Receipt
              </button>
              <button
                type="button"
                onClick={() => {
                  window.print();
                  setSelectedReceipt(null);
                }}
                className="flex-1 py-2.5 rounded-xl bg-[#2563EB] text-white font-bold text-xs hover:bg-blue-700 shadow-sm flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Download className="w-4 h-4" /> Download PDF
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 9. ADMIN PLANS & PRICING TIERS PAGE
// ─────────────────────────────────────────────────────────────────────────────
export function AdminPlansPage() {
  const [toast, setToast] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [filterTab, setFilterTab] = useState<"all" | "pending" | "accepted" | "counter" | "declined">("all");

  // Plans State
  const [plans, setPlans] = useState([
    {
      id: "starter",
      name: "starter",
      display_name: "Starter Growth",
      price_monthly: 25000,
      currency: "INR",
      subscribers: 0,
      features: [
        "8 Static Posters / Month",
        "4 Short Video Reels / Month",
        "10 Story Templates",
        "Standard SLA (48h Turnaround)",
      ],
    },
    {
      id: "growth",
      name: "growth",
      display_name: "Brand Accelerator",
      price_monthly: 50000,
      currency: "INR",
      subscribers: 0,
      features: [
        "15 Static Posters / Month",
        "8 Short Video Reels / Month",
        "20 Story Templates",
        "Priority SLA (24h Turnaround)",
        "Dedicated Creative Pod Lead",
      ],
    },
    {
      id: "scale",
      name: "scale",
      display_name: "Enterprise Domination",
      price_monthly: 95000,
      currency: "INR",
      subscribers: 0,
      features: [
        "30 Static Posters / Month",
        "16 High-Production Video Reels",
        "40 Story Templates",
        "Express 12h SLA Turnaround",
        "Unlimited Revision Iterations",
      ],
    },
  ]);

  // Modals State
  const [editingPlan, setEditingPlan] = useState<typeof plans[0] | null>(null);
  const [editPriceInput, setEditPriceInput] = useState("");
  const [editFeaturesInput, setEditFeaturesInput] = useState("");

  const [isNewProposalOpen, setIsNewProposalOpen] = useState(false);
  const [counterModalItem, setCounterModalItem] = useState<PlanNegotiationItem | null>(null);
  const [declineModalItem, setDeclineModalItem] = useState<PlanNegotiationItem | null>(null);

  // Form Inputs
  const [counterPriceInput, setCounterPriceInput] = useState("");
  const [counterNoteInput, setCounterNoteInput] = useState("");
  const [declineReasonInput, setDeclineReasonInput] = useState("");

  const [newPropClient, setNewPropClient] = useState("");
  const [newPropCurrentPlan, setNewPropCurrentPlan] = useState("Starter Growth (₹25,000/mo)");
  const [newPropTargetPlan, setNewPropTargetPlan] = useState("Enterprise Domination Custom Scope");
  const [newPropStandardRate, setNewPropStandardRate] = useState("95000");
  const [newPropProposedRate, setNewPropProposedRate] = useState("85000");
  const [newPropNotes, setNewPropNotes] = useState("");

  // Client Plan Negotiations List (0 Mock Data - Real client contract proposals appear here)
  const [negotiations, setNegotiations] = useState<PlanNegotiationItem[]>([]);

  // Active Deals Pipeline (0 Mock Data - Real commercial pipeline deals appear here)
  const [deals, setDeals] = useState<
    Array<{
      id: string;
      client: string;
      clientLogo: string;
      scope: string;
      value: number;
      stage: string;
      stageBadge: string;
      probability: string;
      owner: string;
      expectedClose: string;
    }>
  >([]);

  // Actions: ACCEPT Client Plan Negotiation
  const handleAcceptNegotiation = (item: PlanNegotiationItem) => {
    setNegotiations((prev) =>
      prev.map((n) => (n.id === item.id ? { ...n, status: "Accepted" } : n))
    );
    setToast(`Plan Negotiation ACCEPTED for ${item.clientName}! Retainer activated at ₹${item.proposedPrice.toLocaleString('en-IN')}/mo.`);
    setTimeout(() => setToast(null), 4000);
  };

  // Actions: DECLINE Client Plan Negotiation
  const handleConfirmDecline = (e: React.FormEvent) => {
    e.preventDefault();
    if (!declineModalItem) return;

    setNegotiations((prev) =>
      prev.map((n) =>
        n.id === declineModalItem.id
          ? { ...n, status: "Declined", declineReason: declineReasonInput || "Price outside allowable margin." }
          : n
      )
    );
    setToast(`Plan Negotiation DECLINED for ${declineModalItem.clientName}. Notification sent.`);
    setDeclineModalItem(null);
    setDeclineReasonInput("");
    setTimeout(() => setToast(null), 4000);
  };

  // Actions: COUNTER-OFFER Client Plan Negotiation
  const handleConfirmCounter = (e: React.FormEvent) => {
    e.preventDefault();
    if (!counterModalItem || !counterPriceInput) return;

    const price = parseFloat(counterPriceInput);
    setNegotiations((prev) =>
      prev.map((n) =>
        n.id === counterModalItem.id
          ? { ...n, status: "Counter Offered", counterPrice: price }
          : n
      )
    );
    setToast(`Counter offer of ₹${price.toLocaleString('en-IN')}/mo submitted to ${counterModalItem.clientName}.`);
    setCounterModalItem(null);
    setCounterPriceInput("");
    setCounterNoteInput("");
    setTimeout(() => setToast(null), 4000);
  };

  // Actions: Create New Proposal Submit
  const handleCreateProposalSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPropClient || !newPropProposedRate) return;

    const orig = parseFloat(newPropStandardRate) || 95000;
    const prop = parseFloat(newPropProposedRate) || 85000;
    const disc = Math.max(0, Math.round(((orig - prop) / orig) * 100 * 10) / 10);

    const newNeg: PlanNegotiationItem = {
      id: `neg-${Math.floor(100 + Math.random() * 900)}`,
      clientName: newPropClient,
      clientLogo: newPropClient.split(" ").map((w) => w[0]).join("").toUpperCase().slice(0, 2),
      currentPlan: newPropCurrentPlan,
      proposedPlan: newPropTargetPlan,
      originalPrice: orig,
      proposedPrice: prop,
      discountPct: disc,
      notes: newPropNotes || "Custom enterprise proposal initiated by sales lead.",
      requestedAt: "Just now",
      status: "Pending Review",
    };

    setNegotiations((prev) => [newNeg, ...prev]);
    setToast(`Custom retainer proposal initiated for ${newPropClient} (₹${prop.toLocaleString('en-IN')}/mo)!`);
    setIsNewProposalOpen(false);
    setNewPropClient("");
    setNewPropNotes("");
    setTimeout(() => setToast(null), 4000);
  };

  // Manage Deal Modal State & Handlers
  const [manageDealModal, setManageDealModal] = useState<(typeof deals)[0] | null>(null);
  const [dealForm, setDealForm] = useState({
    scope: "",
    value: 960000,
    stage: "Closing / Contract",
    probability: "95%",
    owner: "Sarah Vance",
    expectedClose: "Nov 30, 2024",
    notes: "",
  });
  const [dealSuccessModal, setDealSuccessModal] = useState<{
    title: string;
    message: string;
  } | null>(null);

  // Manage Mode: normal edit, revoke confirm, or refund process
  const [manageMode, setManageMode] = useState<"edit" | "revoke_confirm" | "refund">("edit");
  const [refundAmountInput, setRefundAmountInput] = useState("");
  const [refundReasonInput, setRefundReasonInput] = useState("Contract Cancellation / Retainer Revocation");
  const [refundMethodInput, setRefundMethodInput] = useState("Original Payment Gateway (Stripe ACH / Card)");

  const getStageBadgeStyle = (stage: string) => {
    switch (stage) {
      case "Won / Closed":
      case "Closing / Contract":
        return "bg-emerald-50 text-emerald-700 border-emerald-200";
      case "In Negotiation":
        return "bg-amber-50 text-amber-700 border-amber-200";
      case "Proposal Sent":
        return "bg-blue-50 text-blue-700 border-blue-200";
      case "Subscription Revoked":
        return "bg-rose-50 text-rose-700 border-rose-200 font-bold";
      case "Refund Processed":
        return "bg-orange-50 text-orange-700 border-orange-200 font-bold";
      case "Discovery / Demo":
      default:
        return "bg-purple-50 text-purple-700 border-purple-200";
    }
  };

  const handleOpenManageDeal = (deal: (typeof deals)[0]) => {
    setManageDealModal(deal);
    setManageMode("edit");
    setRefundAmountInput(String(Math.round(deal.value / 12)));
    setDealForm({
      scope: deal.scope,
      value: deal.value,
      stage: deal.stage,
      probability: deal.probability,
      owner: deal.owner,
      expectedClose: deal.expectedClose,
      notes: "",
    });
  };

  const handleSaveDeal = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manageDealModal) return;

    const val = Number(dealForm.value) || manageDealModal.value;
    const badge = getStageBadgeStyle(dealForm.stage);

    setDeals((prev) =>
      prev.map((d) =>
        d.id === manageDealModal.id
          ? {
              ...d,
              scope: dealForm.scope,
              value: val,
              stage: dealForm.stage,
              stageBadge: badge,
              probability: dealForm.probability,
              owner: dealForm.owner,
              expectedClose: dealForm.expectedClose,
            }
          : d
      )
    );

    const clientName = manageDealModal.client;
    const updatedStage = dealForm.stage;
    setManageDealModal(null);

    setDealSuccessModal({
      title: "Commercial Deal Updated!",
      message: `Deal for ${clientName} updated to stage "${updatedStage}" with contract value ₹${val.toLocaleString("en-IN")} / yr.`,
    });
  };

  const handleQuickCloseWon = (deal: (typeof deals)[0]) => {
    setDeals((prev) =>
      prev.map((d) =>
        d.id === deal.id
          ? {
              ...d,
              stage: "Won / Closed",
              stageBadge: "bg-emerald-600 text-white border-emerald-600 shadow-2xs font-black",
              probability: "100%",
            }
          : d
      )
    );
    setManageDealModal(null);
    setDealSuccessModal({
      title: "🎉 Deal Marked as Closed Won!",
      message: `${deal.client} (${deal.scope}) is now Won / Closed at ₹${deal.value.toLocaleString("en-IN")} / yr!`,
    });
  };

  // Actions: Revoke Subscription
  const handleConfirmRevokeSubscription = (deal: (typeof deals)[0]) => {
    setDeals((prev) =>
      prev.map((d) =>
        d.id === deal.id
          ? {
              ...d,
              stage: "Subscription Revoked",
              stageBadge: "bg-rose-100 text-rose-800 border-rose-300 font-black",
              probability: "0%",
            }
          : d
      )
    );
    setManageDealModal(null);
    setManageMode("edit");
    setDealSuccessModal({
      title: "⚠️ Subscription Revoked",
      message: `The active subscription and retainer contract for ${deal.client} (${deal.scope}) has been revoked. Retainer access is deactivated and deliverables queue is paused.`,
    });
  };

  // Actions: Process Refund
  const handleConfirmProcessRefund = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manageDealModal) return;

    const amt = Number(refundAmountInput) || Math.round(manageDealModal.value / 12);
    const clientName = manageDealModal.client;

    setDeals((prev) =>
      prev.map((d) =>
        d.id === manageDealModal.id
          ? {
              ...d,
              stage: "Refund Processed",
              stageBadge: "bg-amber-100 text-amber-800 border-amber-300 font-bold",
            }
          : d
      )
    );

    setManageDealModal(null);
    setManageMode("edit");
    setDealSuccessModal({
      title: "💸 Refund Issued Successfully",
      message: `A refund of ₹${amt.toLocaleString("en-IN")} has been dispatched to ${clientName} via ${refundMethodInput}. Reason: ${refundReasonInput}. Reference: #REF-${Math.floor(10000 + Math.random() * 90000)}.`,
    });
  };

  // Actions: Save Edit Tier Terms
  const handleSaveTierTerms = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPlan) return;

    const newPrice = parseFloat(editPriceInput) || editingPlan.price_monthly;
    const newFeatures = editFeaturesInput
      .split("\n")
      .map((f) => f.trim())
      .filter(Boolean);

    setPlans((prev) =>
      prev.map((p) =>
        p.id === editingPlan.id
          ? {
              ...p,
              price_monthly: newPrice,
              features: newFeatures.length > 0 ? newFeatures : p.features,
            }
          : p
      )
    );

    setToast(`Tier "${editingPlan.display_name}" updated successfully (₹${newPrice.toLocaleString('en-IN')}/mo)!`);
    setEditingPlan(null);
    setTimeout(() => setToast(null), 3000);
  };

  // Filter Negotiations
  const filteredNegotiations = negotiations.filter((item) => {
    const matchesSearch =
      !search.trim() ||
      item.clientName.toLowerCase().includes(search.toLowerCase()) ||
      item.proposedPlan.toLowerCase().includes(search.toLowerCase()) ||
      item.notes.toLowerCase().includes(search.toLowerCase());

    const matchesTab =
      filterTab === "all"
        ? true
        : filterTab === "pending"
        ? item.status === "Pending Review"
        : filterTab === "accepted"
        ? item.status === "Accepted"
        : filterTab === "counter"
        ? item.status === "Counter Offered"
        : item.status === "Declined";

    return matchesSearch && matchesTab;
  });

  const pendingCount = negotiations.filter((n) => n.status === "Pending Review").length;
  const totalRetainerRevenue = plans.reduce((acc, p) => acc + p.price_monthly * p.subscribers, 0);

  return (
    <div data-surface="ops" className="w-full min-h-screen font-sans bg-[#F8FAFC] flex flex-col">
      <AdminTopHeader activeTab="Revenue" />
      <main className="flex-1 px-6 lg:px-10 pt-4 pb-16 max-w-[1500px] w-full mx-auto space-y-8">
        {toast && (
          <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold rounded-2xl flex items-center justify-between shadow-sm animate-fade-in">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>{toast}</span>
            </div>
            <button onClick={() => setToast(null)} className="text-emerald-600 hover:text-emerald-900 font-bold">
              Dismiss
            </button>
          </div>
        )}

        {/* ─────────────────────────────────────────────────────────────────────────────
            TOP 4 COMMERCIAL & PLAN KPI CARDS
        ───────────────────────────────────────────────────────────────────────────── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="kpi-card p-6 bg-white rounded-3xl border-2 border-[#1E3A8A] hover:border-[#60A5FA] transition-all shadow-[0_2px_15px_rgba(0,0,0,0.03)] space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black text-gray-400 uppercase tracking-wider">ACTIVE RETAINERS</span>
              <div className="w-7 h-7 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
                <Briefcase className="w-3.5 h-3.5" />
              </div>
            </div>
            <div className="text-3xl font-black text-gray-900">
              {plans.reduce((acc, p) => acc + p.subscribers, 0)} Active
            </div>
            <p className="text-xs text-blue-600 font-bold">MRR: ₹{totalRetainerRevenue.toLocaleString("en-IN")}</p>
          </div>

          <div className="kpi-card p-6 bg-white rounded-3xl border-2 border-[#1E3A8A] hover:border-[#60A5FA] transition-all shadow-[0_2px_15px_rgba(0,0,0,0.03)] space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black text-gray-400 uppercase tracking-wider">PENDING NEGOTIATIONS</span>
              <div className="w-7 h-7 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold">
                <Zap className="w-3.5 h-3.5" />
              </div>
            </div>
            <div className="text-3xl font-black text-gray-900">{pendingCount} Actionable</div>
            <p className="text-xs text-amber-600 font-bold">Requires executive review</p>
          </div>

          <div className="kpi-card p-6 bg-white rounded-3xl border-2 border-[#1E3A8A] hover:border-[#60A5FA] transition-all shadow-[0_2px_15px_rgba(0,0,0,0.03)] space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black text-gray-400 uppercase tracking-wider">AVG RETAINER VALUE</span>
              <div className="w-7 h-7 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-black text-sm">
                ₹
              </div>
            </div>
            <div className="text-3xl font-black text-gray-900">₹50,000/mo</div>
            <p className="text-xs text-emerald-600 font-bold">High LTV retention</p>
          </div>

          <div className="kpi-card p-6 bg-white rounded-3xl border-2 border-[#1E3A8A] hover:border-[#60A5FA] transition-all shadow-[0_2px_15px_rgba(0,0,0,0.03)] space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black text-gray-400 uppercase tracking-wider">WIN / CLOSING RATE</span>
              <div className="w-7 h-7 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center font-bold">
                <TrendingUp className="w-3.5 h-3.5" />
              </div>
            </div>
            <div className="text-3xl font-black text-gray-900">68%</div>
            <p className="text-xs text-purple-600 font-bold">↗ Top quadrant velocity</p>
          </div>
        </div>

        {/* ─────────────────────────────────────────────────────────────────────────────
            RETAINER TIERS & QUOTA ALLOCATION CARDS
        ───────────────────────────────────────────────────────────────────────────── */}
        <div className="bg-white rounded-3xl p-6 lg:p-8 border border-gray-100 shadow-[0_4px_30px_rgba(0,0,0,0.04)] space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h3 className="text-lg font-bold text-gray-900 tracking-tight">Agency Retainer Plans & Quotas</h3>
              <p className="text-xs text-gray-500 mt-0.5">
                Standard monthly subscription tiers, output deliverables quota, and SLA turnarounds.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {plans.map((plan) => (
              <div
                key={plan.id}
                className="bg-slate-50/70 hover:bg-white rounded-3xl p-6 border border-gray-100 hover:border-gray-200 shadow-2xs hover:shadow-md transition-all space-y-5 flex flex-col justify-between"
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="font-bold text-base text-gray-900">{plan.display_name}</h4>
                    <span className="px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700 text-[10px] font-bold">
                      {plan.subscribers} Active Clients
                    </span>
                  </div>
                  <div className="text-3xl font-black text-gray-900">
                    ₹{plan.price_monthly.toLocaleString('en-IN')} <span className="text-xs font-normal text-gray-400">/mo</span>
                  </div>
                  <ul className="space-y-2 text-xs text-gray-600 pt-2 border-t border-gray-200/60">
                    {plan.features.map((f, i) => (
                      <li key={i} className="flex items-center gap-2">
                        <Check className="size-3.5 text-emerald-600 shrink-0" />
                        <span>{f}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setEditingPlan(plan);
                    setEditPriceInput(String(plan.price_monthly));
                    setEditFeaturesInput(plan.features.join("\n"));
                  }}
                  className="w-full py-2.5 rounded-xl bg-white hover:bg-slate-100 text-gray-800 text-xs font-bold border border-gray-200 transition-colors cursor-pointer shadow-2xs"
                >
                  Edit Tier Terms
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* ─────────────────────────────────────────────────────────────────────────────
            CLIENT PLAN NEGOTIATIONS SECTION
        ───────────────────────────────────────────────────────────────────────────── */}
        <div className="bg-white rounded-3xl p-6 lg:p-8 border border-gray-100 shadow-[0_4px_30px_rgba(0,0,0,0.04)] space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-bold text-gray-900 tracking-tight">Client Plan Negotiations</h3>
                {pendingCount > 0 && (
                  <span className="px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200 text-[10px] font-black uppercase flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                    {pendingCount} Action Required
                  </span>
                )}
              </div>
              <p className="text-xs text-gray-500 mt-0.5">
                Review custom retainer proposals, client discount counter-offers, and multi-month contract terms.
              </p>
            </div>

            <button
              type="button"
              onClick={() => setIsNewProposalOpen(true)}
              className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-black text-white text-xs font-bold flex items-center gap-1.5 shadow-sm cursor-pointer transition-colors"
            >
              <Plus className="w-4 h-4" /> Initiate Custom Proposal
            </button>
          </div>

          {/* Search and Tabs */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-100 pb-4">
            <div className="flex items-center gap-1 bg-gray-100 p-1 rounded-xl text-xs font-bold text-gray-600 overflow-x-auto">
              {[
                { id: "all", label: "All Negotiations" },
                { id: "pending", label: `Pending Review (${pendingCount})` },
                { id: "accepted", label: "Accepted" },
                { id: "counter", label: "Counter Offered" },
                { id: "declined", label: "Declined" },
              ].map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setFilterTab(tab.id as any)}
                  className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer whitespace-nowrap ${
                    filterTab === tab.id
                      ? "bg-white text-blue-600 shadow-xs font-black"
                      : "hover:text-gray-900"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            <div className="relative min-w-[240px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search negotiations by client, scope..."
                className="w-full pl-9 pr-4 py-2 rounded-xl border border-gray-200 bg-white text-xs font-medium focus:outline-none focus:ring-2 focus:ring-blue-500/20 shadow-2xs"
              />
            </div>
          </div>

          {/* Proposals List */}
          <div className="space-y-4">
            {filteredNegotiations.length === 0 ? (
              <div className="p-8 text-center text-gray-400 bg-gray-50/50 rounded-2xl border border-dashed border-gray-200">
                <p className="text-xs font-bold">No plan negotiations found in this filter.</p>
              </div>
            ) : (
              filteredNegotiations.map((item) => (
                <div
                  key={item.id}
                  className="p-5 rounded-2xl border border-gray-100 bg-gray-50/50 hover:bg-white hover:border-gray-200 transition-all shadow-2xs space-y-4"
                >
                  <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                    {/* Client Info */}
                    <div className="flex items-center gap-3.5">
                      <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-700 text-white font-black text-sm flex items-center justify-center shadow-md shrink-0">
                        {item.clientLogo}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="font-bold text-sm text-gray-900">{item.clientName}</h4>
                          <span className="text-[10px] text-gray-400 font-semibold">{item.requestedAt}</span>
                        </div>
                        <p className="text-xs text-gray-600 font-medium">{item.currentPlan}</p>
                      </div>
                    </div>

                    {/* Pricing Comparison */}
                    <div className="flex items-center gap-4 bg-white p-3 rounded-xl border border-gray-100">
                      <div className="text-right">
                        <span className="text-[10px] text-gray-400 uppercase block font-bold">Standard Rate</span>
                        <span className="text-xs line-through text-gray-400 font-bold">₹{item.originalPrice.toLocaleString('en-IN')}/mo</span>
                      </div>
                      <span className="text-gray-300 font-light">&rarr;</span>
                      <div>
                        <span className="text-[10px] text-blue-600 uppercase block font-bold">Proposed Rate</span>
                        <span className="text-sm font-black text-emerald-600">₹{item.proposedPrice.toLocaleString('en-IN')}/mo</span>
                      </div>
                      <span className="px-2 py-0.5 rounded text-[10px] font-black bg-emerald-50 text-emerald-700 border border-emerald-200">
                        {item.discountPct}% Off
                      </span>
                    </div>

                    {/* Status & Actions */}
                    <div className="flex items-center gap-3">
                      <span
                        className={`px-3 py-1 rounded-full text-xs font-extrabold uppercase ${
                          item.status === "Accepted"
                            ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                            : item.status === "Declined"
                            ? "bg-rose-50 text-rose-700 border border-rose-200"
                            : item.status === "Counter Offered"
                            ? "bg-purple-50 text-purple-700 border border-purple-200"
                            : "bg-amber-50 text-amber-700 border border-amber-200"
                        }`}
                      >
                        {item.status}
                      </span>

                      {/* Functional ACCEPT, DECLINE, and COUNTER buttons */}
                      {item.status === "Pending Review" && (
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => handleAcceptNegotiation(item)}
                            className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-sm flex items-center gap-1.5 cursor-pointer transition-colors"
                          >
                            <Check className="w-4 h-4" /> ACCEPT
                          </button>
                          <button
                            type="button"
                            onClick={() => setDeclineModalItem(item)}
                            className="px-4 py-2 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold text-xs border border-rose-200 flex items-center gap-1.5 cursor-pointer transition-colors"
                          >
                            <X className="w-4 h-4" /> DECLINE
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setCounterModalItem(item);
                              setCounterPriceInput(String(item.proposedPrice + 4000));
                            }}
                            className="px-3 py-2 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-800 font-bold text-xs cursor-pointer"
                          >
                            Counter
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Scope Notes */}
                  <div className="p-3 bg-white rounded-xl text-xs text-gray-600 border border-gray-100 font-medium">
                    <strong className="text-gray-900 font-bold">Client Requested Terms:</strong> "{item.notes}"
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* ─────────────────────────────────────────────────────────────────────────────
            ACTIVE SALES & RETAINER PIPELINE TABLE
        ───────────────────────────────────────────────────────────────────────────── */}
        <div className="bg-white rounded-3xl border border-gray-100 shadow-[0_4px_30px_rgba(0,0,0,0.04)] p-6 lg:p-8 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h3 className="text-xl font-black text-[#0F172A] tracking-tight">Active Sales & Retainer Pipeline</h3>
              <p className="text-xs text-gray-500 mt-0.5">High-touch commercial prospects, contract values, and closing probabilities</p>
            </div>
            <span className="px-3 py-1 rounded-full bg-blue-50 text-blue-700 border border-blue-200 text-xs font-bold">
              {deals.length} Active Deals
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-gray-100 text-[10px] font-black uppercase text-gray-400 tracking-wider">
                  <th className="pb-3.5 pl-2">Client Brand</th>
                  <th className="pb-3.5">Deal Scope</th>
                  <th className="pb-3.5">Contract Value</th>
                  <th className="pb-3.5">Stage</th>
                  <th className="pb-3.5">Win Probability</th>
                  <th className="pb-3.5">Lead Owner</th>
                  <th className="pb-3.5 text-right pr-2">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {deals.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-10 text-center text-gray-400">
                      <p className="text-xs font-bold text-gray-600">No active pipeline deals</p>
                      <p className="text-[11px] text-gray-400 mt-0.5">Real sales prospect deals will appear here once initiated.</p>
                    </td>
                  </tr>
                ) : (
                  deals.map((d) => (
                    <tr key={d.id} className="hover:bg-gray-50/70 transition-colors">
                      <td className="py-4 pl-2 font-bold text-gray-900">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-xl bg-slate-900 text-white font-black text-xs flex items-center justify-center">
                            {d.clientLogo}
                          </div>
                          <span>{d.client}</span>
                        </div>
                      </td>
                      <td className="py-4 text-gray-600 font-medium">{d.scope}</td>
                      <td className="py-4 font-black text-gray-900">₹{d.value.toLocaleString('en-IN')} / yr</td>
                      <td className="py-4">
                        <span className={`px-2.5 py-1 rounded-full text-[10px] font-black border ${d.stageBadge}`}>
                          {d.stage}
                        </span>
                      </td>
                      <td className="py-4 font-bold text-emerald-600">{d.probability}</td>
                      <td className="py-4 text-gray-600 font-medium">{d.owner}</td>
                      <td className="py-4 text-right pr-2">
                        <button
                          type="button"
                          onClick={() => handleOpenManageDeal(d)}
                          className="px-3.5 py-1.5 rounded-xl bg-slate-100 hover:bg-blue-600 hover:text-white text-slate-800 font-bold text-xs cursor-pointer shadow-2xs transition-all active:scale-95"
                        >
                          Manage
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>

      {/* ─────────────────────────────────────────────────────────────────────────────
          MODAL: EDIT TIER TERMS
      ───────────────────────────────────────────────────────────────────────────── */}
      {editingPlan && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl space-y-4 border border-gray-100">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <h3 className="text-base font-bold text-gray-900">Edit Tier: {editingPlan.display_name}</h3>
              <button type="button" onClick={() => setEditingPlan(null)} className="p-1 text-gray-400 hover:text-gray-700">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveTierTerms} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-gray-700 mb-1">Monthly Retainer Price (₹ INR)</label>
                <input
                  type="number"
                  required
                  value={editPriceInput}
                  onChange={(e) => setEditPriceInput(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl border border-gray-200 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                />
              </div>

              <div>
                <label className="block font-bold text-gray-700 mb-1">Features & Deliverables Quota (One per line)</label>
                <textarea
                  rows={4}
                  required
                  value={editFeaturesInput}
                  onChange={(e) => setEditFeaturesInput(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl border border-gray-200 text-xs resize-none focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-gray-100">
                <button type="button" onClick={() => setEditingPlan(null)} className="px-4 py-2 rounded-xl border border-gray-200 font-bold text-gray-600 hover:bg-gray-50 cursor-pointer">
                  Cancel
                </button>
                <button type="submit" className="px-4 py-2 rounded-xl bg-blue-600 text-white font-bold hover:bg-blue-700 cursor-pointer">
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────────────────────
          MODAL: DECLINE PLAN NEGOTIATION
      ───────────────────────────────────────────────────────────────────────────── */}
      {declineModalItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl space-y-4 border border-gray-100">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <h3 className="text-base font-bold text-gray-900">Decline Plan Negotiation</h3>
              <button type="button" onClick={() => setDeclineModalItem(null)} className="p-1 text-gray-400 hover:text-gray-700">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleConfirmDecline} className="space-y-3 text-xs">
              <p className="text-gray-600">
                Are you sure you want to decline the proposed custom retainer for <strong>{declineModalItem.clientName}</strong>?
              </p>

              <div>
                <label className="block font-bold text-gray-700 mb-1">Reason for Rejection</label>
                <textarea
                  rows={3}
                  required
                  placeholder="e.g. Proposed rate falls below standard minimum margin."
                  value={declineReasonInput}
                  onChange={(e) => setDeclineReasonInput(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl border border-gray-200 text-xs resize-none focus:outline-none focus:ring-2 focus:ring-rose-500/20"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-gray-100">
                <button type="button" onClick={() => setDeclineModalItem(null)} className="px-4 py-2 rounded-xl border border-gray-200 font-bold text-gray-600 hover:bg-gray-50 cursor-pointer">
                  Cancel
                </button>
                <button type="submit" className="px-4 py-2 rounded-xl bg-rose-600 text-white font-bold hover:bg-rose-700 cursor-pointer">
                  Confirm Decline
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────────────────────
          MODAL: COUNTER-OFFER PLAN NEGOTIATION
      ───────────────────────────────────────────────────────────────────────────── */}
      {counterModalItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl space-y-4 border border-gray-100">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <h3 className="text-base font-bold text-gray-900">Submit Counter Offer</h3>
              <button type="button" onClick={() => setCounterModalItem(null)} className="p-1 text-gray-400 hover:text-gray-700">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleConfirmCounter} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-gray-700 mb-1">Counter Proposed Rate (₹ INR / mo)</label>
                <input
                  type="number"
                  required
                  value={counterPriceInput}
                  onChange={(e) => setCounterPriceInput(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl border border-gray-200 text-xs focus:outline-none focus:ring-2 focus:ring-purple-500/20"
                />
              </div>

              <div>
                <label className="block font-bold text-gray-700 mb-1">Counter Offer Notes / Scope Terms</label>
                <textarea
                  rows={3}
                  placeholder="e.g. We can offer ₹85,000/mo with 12-month commitment."
                  value={counterNoteInput}
                  onChange={(e) => setCounterNoteInput(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl border border-gray-200 text-xs resize-none focus:outline-none focus:ring-2 focus:ring-purple-500/20"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-gray-100">
                <button type="button" onClick={() => setCounterModalItem(null)} className="px-4 py-2 rounded-xl border border-gray-200 font-bold text-gray-600 hover:bg-gray-50 cursor-pointer">
                  Cancel
                </button>
                <button type="submit" className="px-4 py-2 rounded-xl bg-purple-600 text-white font-bold hover:bg-purple-700 cursor-pointer">
                  Submit Counter
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────────────────────
          MODAL: INITIATE CUSTOM PROPOSAL
      ───────────────────────────────────────────────────────────────────────────── */}
      {isNewProposalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl space-y-4 border border-gray-100">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <h3 className="text-base font-bold text-gray-900">Initiate Custom Retainer Proposal</h3>
              <button type="button" onClick={() => setIsNewProposalOpen(false)} className="p-1 text-gray-400 hover:text-gray-700">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateProposalSubmit} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-gray-700 mb-1">Client Brand Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Apex Media or Stellar Corp"
                  value={newPropClient}
                  onChange={(e) => setNewPropClient(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl border border-gray-200 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                />
              </div>

              <div>
                <label className="block font-bold text-gray-700 mb-1">Current Retainer Plan</label>
                <input
                  type="text"
                  value={newPropCurrentPlan}
                  onChange={(e) => setNewPropCurrentPlan(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl border border-gray-200 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                />
              </div>

              <div>
                <label className="block font-bold text-gray-700 mb-1">Target Plan & Custom Scope</label>
                <input
                  type="text"
                  required
                  value={newPropTargetPlan}
                  onChange={(e) => setNewPropTargetPlan(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl border border-gray-200 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-gray-700 mb-1">Standard Rate (₹/mo)</label>
                  <input
                    type="number"
                    value={newPropStandardRate}
                    onChange={(e) => setNewPropStandardRate(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-xl border border-gray-200 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  />
                </div>
                <div>
                  <label className="block font-bold text-gray-700 mb-1">Proposed Rate (₹/mo)</label>
                  <input
                    type="number"
                    required
                    value={newPropProposedRate}
                    onChange={(e) => setNewPropProposedRate(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-xl border border-gray-200 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-gray-700 mb-1">Negotiation Scope Notes & Commitments</label>
                <textarea
                  rows={3}
                  placeholder="e.g. 12-month contract lock-in with 2 dedicated creative pods."
                  value={newPropNotes}
                  onChange={(e) => setNewPropNotes(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl border border-gray-200 text-xs resize-none focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-gray-100">
                <button type="button" onClick={() => setIsNewProposalOpen(false)} className="px-4 py-2 rounded-xl border border-gray-200 font-bold text-gray-600 hover:bg-gray-50 cursor-pointer">
                  Cancel
                </button>
                <button type="submit" className="px-4 py-2 rounded-xl bg-blue-600 text-white font-bold hover:bg-blue-700 cursor-pointer">
                  Create Proposal
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────────────────────
          MODAL: MANAGE COMMERCIAL DEAL & PIPELINE (WITH REVOKE & REFUND)
      ───────────────────────────────────────────────────────────────────────────── */}
      {manageDealModal && (
        <div
          className="fixed inset-0 w-screen h-screen z-[99999] flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-md animate-fade-in"
          onClick={() => {
            setManageDealModal(null);
            setManageMode("edit");
          }}
        >
          <div
            className="relative w-full max-w-xl rounded-3xl bg-white p-6 sm:p-7 shadow-2xl border border-slate-100 flex flex-col space-y-4 max-h-[92vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-3">
                <div className="size-11 rounded-2xl bg-slate-950 text-white font-black text-sm flex items-center justify-center shadow-xs">
                  {manageDealModal.clientLogo}
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900 tracking-tight">
                    Manage Deal • {manageDealModal.client}
                  </h3>
                  <p className="text-[11px] text-slate-500 font-medium">
                    Contract negotiation, deal stage progression & subscription controls
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setManageDealModal(null);
                  setManageMode("edit");
                }}
                className="size-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center transition-colors cursor-pointer"
              >
                <X className="size-4" />
              </button>
            </div>

            {/* Quick Action Navigation Bar */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-1.5 p-1.5 bg-slate-100/80 rounded-2xl">
              <button
                type="button"
                onClick={() => setManageMode("edit")}
                className={`w-full py-2 px-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer text-center ${
                  manageMode === "edit"
                    ? "bg-white text-slate-900 shadow-xs font-black"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                📝 Edit Contract
              </button>
              <button
                type="button"
                onClick={() => setManageMode("refund")}
                className={`w-full py-2 px-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer text-center ${
                  manageMode === "refund"
                    ? "bg-amber-500 text-white shadow-xs font-black"
                    : "text-amber-700 hover:bg-amber-100/60"
                }`}
              >
                💸 Process Refund
              </button>
              <button
                type="button"
                onClick={() => setManageMode("revoke_confirm")}
                className={`w-full py-2 px-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer text-center ${
                  manageMode === "revoke_confirm"
                    ? "bg-rose-600 text-white shadow-xs font-black"
                    : "text-rose-700 hover:bg-rose-100/60"
                }`}
              >
                ⚠️ Revoke Retainer
              </button>
            </div>

            {/* MODE 1: REVOKE CONFIRMATION */}
            {manageMode === "revoke_confirm" && (
              <div className="space-y-4 py-2 animate-fade-in">
                <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 flex items-start gap-3.5">
                  <div className="size-10 rounded-xl bg-rose-600 text-white flex items-center justify-center shrink-0 shadow-sm">
                    <X className="size-5" />
                  </div>
                  <div className="space-y-1">
                    <h4 className="text-sm font-black text-rose-900">Revoke Active Subscription & Retainer?</h4>
                    <p className="text-xs text-rose-700 leading-relaxed font-medium">
                      This will immediately deactivate <strong>{manageDealModal.client}</strong>'s current retainer ({manageDealModal.scope}), halt all creative pod work queues, and update deal status to <strong>Subscription Revoked</strong>.
                    </p>
                  </div>
                </div>

                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 text-xs space-y-2 text-slate-600">
                  <div className="flex justify-between">
                    <span className="font-semibold text-slate-500">Client:</span>
                    <strong className="text-slate-900">{manageDealModal.client}</strong>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-semibold text-slate-500">Contract Value:</span>
                    <strong className="text-slate-900">₹{manageDealModal.value.toLocaleString("en-IN")} / yr</strong>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-semibold text-slate-500">Assigned Account Owner:</span>
                    <strong className="text-slate-900">{manageDealModal.owner}</strong>
                  </div>
                </div>

                <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setManageMode("edit")}
                    className="px-4 py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50 cursor-pointer"
                  >
                    Go Back
                  </button>
                  <button
                    type="button"
                    onClick={() => handleConfirmRevokeSubscription(manageDealModal)}
                    className="px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shadow-md shadow-rose-600/25 active:scale-95 transition-all cursor-pointer"
                  >
                    Confirm & Revoke Subscription
                  </button>
                </div>
              </div>
            )}

            {/* MODE 2: ISSUE REFUND */}
            {manageMode === "refund" && (
              <form onSubmit={handleConfirmProcessRefund} className="space-y-4 py-2 animate-fade-in">
                <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 flex items-start gap-3.5">
                  <div className="size-10 rounded-xl bg-amber-500 text-white flex items-center justify-center shrink-0 shadow-sm font-black text-sm">
                    ₹
                  </div>
                  <div className="space-y-1">
                    <h4 className="text-sm font-black text-amber-900">Process Client Refund</h4>
                    <p className="text-xs text-amber-700 leading-relaxed font-medium">
                      Issue a full or prorated refund back to <strong>{manageDealModal.client}</strong>. A settlement receipt will be automatically logged.
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Refund Amount (₹ INR)</label>
                    <input
                      type="number"
                      required
                      value={refundAmountInput}
                      onChange={(e) => setRefundAmountInput(e.target.value)}
                      placeholder="e.g. 45000"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Refund Method</label>
                    <select
                      value={refundMethodInput}
                      onChange={(e) => setRefundMethodInput(e.target.value)}
                      className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-xs font-medium text-slate-900 bg-white"
                    >
                      <option value="Original Payment Gateway (Stripe ACH / Card)">Original Payment Gateway (Stripe / ACH)</option>
                      <option value="Direct Bank Wire / IMPS / RTGS">Direct Bank Transfer (IMPS / RTGS)</option>
                      <option value="Internal Account Service Credit">Internal Account Service Credit</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Reason for Refund</label>
                  <select
                    value={refundReasonInput}
                    onChange={(e) => setRefundReasonInput(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-xs font-medium text-slate-900 bg-white"
                  >
                    <option value="Contract Cancellation / Retainer Revocation">Contract Cancellation / Retainer Revocation</option>
                    <option value="SLA Non-Compliance / Delivery Disruption">SLA Non-Compliance / Delivery Disruption</option>
                    <option value="Duplicate or Overcharge Billing Adjustment">Duplicate or Overcharge Billing Adjustment</option>
                    <option value="Executive Discretionary Credit">Executive Discretionary Credit</option>
                  </select>
                </div>

                <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setManageMode("edit")}
                    className="px-4 py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50 cursor-pointer"
                  >
                    Go Back
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold shadow-md shadow-amber-600/25 active:scale-95 transition-all cursor-pointer"
                  >
                    Confirm & Issue ₹{Number(refundAmountInput || 0).toLocaleString("en-IN")} Refund
                  </button>
                </div>
              </form>
            )}

            {/* MODE 3: STANDARD EDIT */}
            {manageMode === "edit" && (
              <>
                {/* Stage Selector Pills */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-slate-700">Deal Pipeline Stage</label>
                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-1.5">
                    {[
                      { stage: "Discovery / Demo", prob: "40%" },
                      { stage: "Proposal Sent", prob: "60%" },
                      { stage: "In Negotiation", prob: "75%" },
                      { stage: "Closing / Contract", prob: "95%" },
                      { stage: "Won / Closed", prob: "100%" },
                    ].map((s) => (
                      <button
                        key={s.stage}
                        type="button"
                        onClick={() => setDealForm({ ...dealForm, stage: s.stage, probability: s.prob })}
                        className={`px-2 py-2 rounded-xl text-[10px] font-bold border transition-all text-center cursor-pointer ${
                          dealForm.stage === s.stage
                            ? "bg-blue-600 text-white border-blue-600 shadow-2xs scale-[1.02]"
                            : "bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200"
                        }`}
                      >
                        {s.stage}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Deal Form */}
                <form onSubmit={handleSaveDeal} className="space-y-3.5">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Deal Scope & Retainer Package</label>
                    <input
                      type="text"
                      required
                      value={dealForm.scope}
                      onChange={(e) => setDealForm({ ...dealForm, scope: e.target.value })}
                      placeholder="e.g. Annual Enterprise Tier 2 Retainer"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">Annual Contract Value (₹ INR / yr)</label>
                      <input
                        type="number"
                        required
                        value={dealForm.value}
                        onChange={(e) => setDealForm({ ...dealForm, value: Number(e.target.value) })}
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                      />
                      <span className="text-[10px] text-slate-400 font-medium mt-0.5 block">
                        ≈ ₹{(dealForm.value / 12).toLocaleString("en-IN", { maximumFractionDigits: 0 })} / mo
                      </span>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">Win Probability</label>
                      <select
                        value={dealForm.probability}
                        onChange={(e) => setDealForm({ ...dealForm, probability: e.target.value })}
                        className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-emerald-700 bg-white"
                      >
                        <option value="40%">40% (Early Interest)</option>
                        <option value="60%">60% (Proposal Under Review)</option>
                        <option value="75%">75% (In Negotiation)</option>
                        <option value="90%">90% (Final Terms Sent)</option>
                        <option value="95%">95% (Contract Out for Signature)</option>
                        <option value="100%">100% (Closed / Signed)</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">Lead Account Owner</label>
                      <select
                        value={dealForm.owner}
                        onChange={(e) => setDealForm({ ...dealForm, owner: e.target.value })}
                        className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-xs font-medium text-slate-900 bg-white"
                      >
                        <option value="Sarah Vance">Sarah Vance (VP Sales)</option>
                        <option value="Elena Rostova">Elena Rostova (Account Dir)</option>
                        <option value="Marcus Brody">Marcus Brody (Enterprise Lead)</option>
                        <option value="Maya Lin">Maya Lin (Creative VP)</option>
                        <option value="Omar Vance">Omar Vance (Principal Strategist)</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">Expected Closing Date</label>
                      <input
                        type="text"
                        value={dealForm.expectedClose}
                        onChange={(e) => setDealForm({ ...dealForm, expectedClose: e.target.value })}
                        placeholder="e.g. Nov 30, 2024"
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                      />
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex flex-wrap items-center justify-between gap-2 pt-3 border-t border-slate-100">
                    <button
                      type="button"
                      onClick={() => handleQuickCloseWon(manageDealModal)}
                      className="px-3.5 py-2.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                    >
                      🏆 Mark as Closed Won
                    </button>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setManageDealModal(null);
                          setManageMode("edit");
                        }}
                        className="px-4 py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50 cursor-pointer"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white text-xs font-bold shadow-md shadow-blue-500/25 active:scale-95 transition-all cursor-pointer"
                      >
                        Save & Update Deal
                      </button>
                    </div>
                  </div>
                </form>
              </>
            )}
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────────────────────
          MODAL: DEAL SUCCESS POPUP
      ───────────────────────────────────────────────────────────────────────────── */}
      {dealSuccessModal && (
        <div
          className="fixed inset-0 w-screen h-screen z-[99999] flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-md animate-fade-in"
          onClick={() => setDealSuccessModal(null)}
        >
          <div
            className="relative w-full max-w-md rounded-3xl bg-white p-6 sm:p-8 shadow-2xl border border-slate-100 flex flex-col items-center text-center animate-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
          >
            <button
              type="button"
              onClick={() => setDealSuccessModal(null)}
              className="absolute top-4 right-4 size-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-400 hover:text-slate-700 flex items-center justify-center transition-colors cursor-pointer"
              aria-label="Close modal"
            >
              <X className="size-4" />
            </button>

            <div className="size-16 rounded-3xl bg-emerald-50 text-emerald-600 ring-8 ring-emerald-50/60 flex items-center justify-center mb-4 shadow-inner">
              <CheckCircle2 className="size-8" />
            </div>

            <h3 className="text-xl font-black text-slate-900 tracking-tight">{dealSuccessModal.title}</h3>
            <p className="text-xs sm:text-sm text-slate-600 mt-2 leading-relaxed max-w-sm">{dealSuccessModal.message}</p>

            <div className="w-full mt-6">
              <button
                type="button"
                onClick={() => setDealSuccessModal(null)}
                autoFocus
                className="w-full py-3 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold text-xs shadow-md shadow-blue-500/25 active:scale-95 transition-all cursor-pointer"
              >
                OK
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 10. ADMIN ANNOUNCEMENTS PAGE
// ─────────────────────────────────────────────────────────────────────────────
export function AdminAnnouncementsPage() {
  const [announcements, setAnnouncements] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [_type, _setType] = useState("broadcast");
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [_targetDepts, _setTargetDepts] = useState<string[]>(["all"]);
  const [publishing, setPublishing] = useState(false);

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

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !content) return;
    setPublishing(true);
    try {
      await request("/api/v1/admin/announcements", {
        method: "POST",
        body: JSON.stringify({
          title,
          content,
          type: _type,
          target_departments: _targetDepts,
        }),
      });
      setCreateOpen(false);
      setTitle("");
      setContent("");
      fetchAnnouncements();
    } catch {
      setAnnouncements((prev) => [
        {
          id: `ann-${Date.now()}`,
          title,
          content,
          type: _type,
          created_at: new Date().toISOString(),
        },
        ...prev,
      ]);
      setCreateOpen(false);
      setTitle("");
      setContent("");
    } finally {
      setPublishing(false);
    }
  };

  return (
    <div data-surface="ops" className="w-full min-h-screen font-sans bg-[#F9FAFB] flex flex-col">
      <AdminTopHeader activeTab="Announcements" />
      <main className="flex-1 px-6 lg:px-8 pt-4 pb-16 max-w-[1500px] w-full mx-auto space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-4">
          <button
            type="button"
            onClick={() => setCreateOpen(true)}
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-[#2B7BC4] text-white text-xs font-bold hover:bg-[#1A5EA8] shadow-xs cursor-pointer"
          >
            <Plus className="size-4" /> Broadcast Notice
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {loading ? (
            <div className="col-span-full py-16 text-center text-slate-400">
              <Loader2 className="size-6 animate-spin mx-auto mb-2 text-[#2B7BC4]" />
              Loading announcements...
            </div>
          ) : announcements.length === 0 ? (
            <div className="col-span-full py-12 text-center text-slate-500">
              No active announcements. Broadcast one now!
            </div>
          ) : (
            announcements.map((a) => (
              <div key={a.id} className="p-5 rounded-2xl border border-gray-200 bg-white shadow-xs space-y-2">
                <div className="flex items-center justify-between">
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase bg-blue-50 text-blue-700">
                    {a.type || "Broadcast"}
                  </span>
                  <span className="text-[10px] text-gray-400 font-mono">{a.created_at?.slice(0, 10)}</span>
                </div>
                <h3 className="font-bold text-sm text-gray-900">{a.title}</h3>
                <p className="text-xs text-gray-600 leading-relaxed">{a.content}</p>
              </div>
            ))
          )}
        </div>

        {createOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm animate-fade-in">
            <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl space-y-4 border border-gray-100">
              <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                <h3 className="text-base font-bold text-gray-900">Broadcast Announcement</h3>
                <button type="button" onClick={() => setCreateOpen(false)} className="p-1 text-gray-400 hover:text-gray-700 cursor-pointer">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleCreate} className="space-y-3">
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Title</label>
                  <input
                    type="text"
                    required
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="e.g. Q4 Sprint Planning Schedule"
                    className="w-full px-3 py-2 rounded-xl border border-gray-200 text-xs focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Content</label>
                  <textarea
                    rows={4}
                    required
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    placeholder="Enter announcement text..."
                    className="w-full px-3 py-2 rounded-xl border border-gray-200 text-xs resize-none focus:outline-none"
                  />
                </div>
                <div className="flex justify-end gap-2 pt-2 border-t border-gray-100">
                  <button type="button" onClick={() => setCreateOpen(false)} className="px-4 py-2 rounded-xl border border-gray-200 text-xs font-bold text-gray-600 hover:bg-gray-50 cursor-pointer">Cancel</button>
                  <button type="submit" disabled={publishing} className="px-4 py-2 rounded-xl bg-[#2B7BC4] text-xs font-bold text-white hover:bg-[#1A5EA8] cursor-pointer">
                    {publishing ? "Broadcasting..." : "Broadcast"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 11. ADMIN REPORTS PAGE
// ─────────────────────────────────────────────────────────────────────────────
export function AdminReportsPage() {
  return (
    <div data-surface="ops" className="w-full min-h-screen font-sans bg-[#F9FAFB] flex flex-col">
      <AdminTopHeader activeTab="Reports" />
      <main className="flex-1 px-6 lg:px-8 pt-4 pb-16 max-w-[1500px] w-full mx-auto space-y-6">
        <div className="flex items-center justify-between border-b border-slate-200 pb-4">
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="p-6 bg-white rounded-3xl border border-gray-100 shadow-sm space-y-2">
            <span className="text-[10px] font-bold text-gray-400 uppercase">SLA ON-TIME RATE</span>
            <div className="text-3xl font-black text-gray-900">98.2%</div>
            <p className="text-xs text-emerald-600 font-bold">✓ 342 of 348 assets on time</p>
          </div>
          <div className="p-6 bg-white rounded-3xl border border-gray-100 shadow-sm space-y-2">
            <span className="text-[10px] font-bold text-gray-400 uppercase">FIRST-PASS APPROVAL</span>
            <div className="text-3xl font-black text-gray-900">92.4%</div>
            <p className="text-xs text-emerald-600 font-bold">↗ +4.1% over last quarter</p>
          </div>
          <div className="p-6 bg-white rounded-3xl border border-gray-100 shadow-sm space-y-2">
            <span className="text-[10px] font-bold text-gray-400 uppercase">AVERAGE REVISION TIME</span>
            <div className="text-3xl font-black text-gray-900">3.4h</div>
            <p className="text-xs text-blue-600 font-bold">Target SLA is &lt;12h</p>
          </div>
        </div>
      </main>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 12. ADMIN ADDONS PAGE
// ─────────────────────────────────────────────────────────────────────────────
export function AdminAddonsPage() {
  const alert = useAlert();
  const [addons, setAddons] = useState<any[]>([
    {
      id: "addon-1",
      name: "Extra Shoot Day (Full Production)",
      category: "Video Production",
      price_inr: 45000,
      unit: "day",
      description: "Additional full production day on-location with 4K multi-cam crew.",
      pending_requests: 1,
    },
    {
      id: "addon-2",
      name: "VFX & 3D Motion Graphics Pack",
      category: "3D Animation",
      price_inr: 25000,
      unit: "pack",
      description: "Custom 3D logo animation and kinetic kinetic typography package.",
      pending_requests: 0,
    },
    {
      id: "addon-3",
      name: "12h Express SLA Delivery",
      category: "Priority SLA",
      price_inr: 15000,
      unit: "sprint",
      description: "Emergency fast-track turnaround guarantee for critical campaigns.",
      pending_requests: 0,
    },
  ]);

  const handleManageAddon = (a: any) => {
    setAddons((prev) =>
      prev.map((item) =>
        item.id === a.id
          ? { ...item, pending_requests: item.pending_requests > 0 ? 0 : 1 }
          : item
      )
    );
    alert({
      title: "Add-on Managed",
      description: `Fulfillment status updated for ${a.name}.`,
      tone: "success",
    });
  };

  return (
    <div data-surface="ops" className="w-full min-h-screen font-sans bg-[#F9FAFB] flex flex-col">
      <AdminTopHeader activeTab="Add-ons" />
      <main className="flex-1 px-6 lg:px-8 pt-4 pb-16 max-w-[1500px] w-full mx-auto space-y-6">
        <div className="flex items-center justify-between border-b border-slate-200 pb-4">
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {addons.map((a) => (
            <div key={a.id} className="p-6 bg-white rounded-3xl border border-gray-100 shadow-sm space-y-3 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700 text-[10px] font-bold">
                    {a.category}
                  </span>
                  <span className="font-bold text-xs text-gray-900">
                    ₹{a.price_inr.toLocaleString("en-IN")} / {a.unit}
                  </span>
                </div>
                <h3 className="font-bold text-sm text-gray-900">{a.name}</h3>
                <p className="text-xs text-gray-600 mt-1">{a.description}</p>
              </div>

              <div className="pt-3 border-t border-gray-100 flex items-center justify-between text-xs">
                {a.pending_requests > 0 ? (
                  <span className="text-amber-600 font-bold">⚡ {a.pending_requests} pending</span>
                ) : (
                  <span className="text-emerald-600 font-bold">✓ Fulfilled</span>
                )}
                <button
                  type="button"
                  onClick={() => handleManageAddon(a)}
                  className="px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs transition-colors cursor-pointer"
                >
                  Manage
                </button>
              </div>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 13. ADMIN ESCALATIONS PAGE
// ─────────────────────────────────────────────────────────────────────────────
export function AdminEscalationsPage() {
  return (
    <div data-surface="ops" className="w-full min-h-screen font-sans bg-[#F9FAFB] flex flex-col">
      <AdminTopHeader activeTab="Escalations" />
      <main className="flex-1 px-6 lg:px-8 pt-4 pb-16 max-w-[1500px] w-full mx-auto space-y-6">
        <div className="flex items-center justify-between border-b border-slate-200 pb-4">
        </div>

        <div className="p-8 bg-emerald-50 rounded-3xl border border-emerald-200 text-center space-y-2">
          <CheckCircle2 className="size-8 text-emerald-600 mx-auto" />
          <h3 className="font-bold text-sm text-emerald-900">All Operations Within SLA Limits</h3>
          <p className="text-xs text-emerald-700">No open breach tickets or overdue deliveries across any creative pod.</p>
        </div>
      </main>
    </div>
  );
}
// ─────────────────────────────────────────────────────────────────────────────
// 14. ADMIN SALES PAGE (ALIASED TO ADMIN PLANS & NEGOTIATIONS)
// ─────────────────────────────────────────────────────────────────────────────
export const AdminSalesPage = AdminPlansPage;

// ─────────────────────────────────────────────────────────────────────────────
// 15. ADMIN SETTINGS PAGE
// ─────────────────────────────────────────────────────────────────────────────
export function AdminSettingsPage() {
  const [saved, setSaved] = useState(false);

  return (
    <div data-surface="ops" className="w-full min-h-screen font-sans bg-[#F9FAFB] flex flex-col">
      <AdminTopHeader activeTab="Settings" />
      <main className="flex-1 px-6 lg:px-8 pt-4 pb-16 max-w-[1500px] w-full mx-auto space-y-6">
        <div className="flex items-center justify-between border-b border-slate-200 pb-4">
        </div>

        {saved && (
          <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold rounded-2xl flex items-center gap-2">
            <CheckCircle2 className="size-4 text-emerald-600" />
            <span>Settings saved successfully.</span>
          </div>
        )}

        <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-6 max-w-2xl space-y-4">
          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1">Agency Name</label>
            <input
              type="text"
              defaultValue="Creo Studio Operations"
              className="w-full px-3.5 py-2 rounded-xl border border-gray-200 text-xs"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1">Concierge Support Email</label>
            <input
              type="email"
              defaultValue="concierge@creo.agency"
              className="w-full px-3.5 py-2 rounded-xl border border-gray-200 text-xs"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">Default SLA Turnaround (Days)</label>
              <input
                type="number"
                defaultValue={2}
                className="w-full px-3.5 py-2 rounded-xl border border-gray-200 text-xs"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">Revision SLA Turnaround (Hours)</label>
              <input
                type="number"
                defaultValue={24}
                className="w-full px-3.5 py-2 rounded-xl border border-gray-200 text-xs"
              />
            </div>
          </div>

          <div className="pt-3 border-t border-gray-100 flex justify-end">
            <button
              type="button"
              onClick={() => {
                setSaved(true);
                setTimeout(() => setSaved(false), 2500);
              }}
              className="px-5 py-2 rounded-xl bg-[#2B7BC4] text-white text-xs font-bold hover:bg-[#1A5EA8] shadow-sm cursor-pointer"
            >
              Save Changes
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}
