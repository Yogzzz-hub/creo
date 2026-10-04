import React, { useState, useEffect } from "react";
import { Link, useParams, useSearchParams, Navigate } from "react-router";
import { useQuery } from "@tanstack/react-query";
import { fetchClientRoster, fetchPlanNegotiations, updatePlanNegotiation, createPlanNegotiation, fetchPodDashboard, fetchLeaveRequests, approveLeaveRequest, rejectLeaveRequest, fetchAdminQueue } from "../../lib/ops-api";
import type { PlanNegotiationApiItem } from "../../lib/ops-api";
import type { ClientRosterItem } from "../../types/ops";
import {
  BarChart,
  Bar,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
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
  Briefcase,
  TrendingUp,
  Eye,
  Check,
  X,
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
  Trash2,
  Folder,
  Lock,
  ShieldCheck,
  Film,
  Smartphone,
  Pin,
  Pencil,
} from "lucide-react";
import { AdminTopHeader } from "../../components/admin/AdminTopHeader";
import { CustomSelect } from "../../components/ui/CustomSelect";
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
  const { clientId } = useParams<{ clientId?: string }>();
  const [searchParams] = useSearchParams();
  const urlClientId = clientId || searchParams.get("clientId") || searchParams.get("client");

  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);
  const [serverClients, setServerClients] = useState<ClientRosterItem[]>([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [deliverableSearch, setDeliverableSearch] = useState("");
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    fetchClientRoster()
      .then((data) => {
        if (Array.isArray(data)) setServerClients(data);
      })
      .catch(console.error);
  }, []);

  // Active Modals
  const [isEditProfileOpen, setIsEditProfileOpen] = useState(false);
  const [isInvoiceModalOpen, setIsInvoiceModalOpen] = useState(false);
  const [isNewRequestOpen, setIsNewRequestOpen] = useState(false);
  const [isCancelClientModalOpen, setIsCancelClientModalOpen] = useState(false);
  const [isOnboardClientModalOpen, setIsOnboardClientModalOpen] = useState(false);
  const [isRemoveClientModalOpen, setIsRemoveClientModalOpen] = useState(false);
  const [newClientNameInput, setNewClientNameInput] = useState("");
  const [newClientIndustryInput, setNewClientIndustryInput] = useState("");
  const [newClientPodInput, setNewClientPodInput] = useState("Pod A (Creative & Brand Strategy)");
  const [clientToRemoveInput, setClientToRemoveInput] = useState("Ryze");
  const [customClients, setCustomClients] = useState<Record<string, ClientDetailData>>({});
  const [removedClientIds, setRemovedClientIds] = useState<Set<string>>(new Set());
  const [previewDeliverable, setPreviewDeliverable] = useState<any | null>(null);

  const [newRequestForm, setNewRequestForm] = useState({
    title: "",
    type: "Reel",
    priority: "Standard",
    notes: "",
  });

  const clientsData: Record<string, ClientDetailData> = {
    ryze: {
      id: "ryze",
      name: "Ryze",
      initials: "R",
      industry: "DTC Wellness & Functional Health",
      timezone: "Client Time: IST (UTC+5:30)",
      activeSince: "Active since Jan 2024",
      tier: "Starter Growth Retainer",
      tierBadge: "STARTER GROWTH",
      status: "ACTIVE RETAINER",
      monthlyFee: 25000,
      addon: "Add-on: Creative Pod C",
      nextBilling: "Oct 1, 2026",
      billingMethod: "Direct ACH / Razorpay",
      totalAssetsDelivered: 0,
      totalAssetsQuota: 22,
      postsDelivered: 0,
      postsQuota: 8,
      reelsDelivered: 0,
      reelsQuota: 4,
      storiesDelivered: 0,
      storiesQuota: 10,
      sprintNumber: 44,
      daysRemainingInSprint: 14,
      contact: {
        name: "Ryze Brand Team",
        title: "Brand Strategy Director",
        email: "sushmitaa1407@gmail.com",
        phone: "+91 98401 22910",
        renewedDate: "Sep 1, 2026",
        termMonths: 12,
      },
      brand: {
        kitVersion: "Design Kit v2.4",
        headingsFont: "Plus Jakarta Sans",
        bodyFont: "Inter Sans",
        monoFont: "JetBrains Mono",
        toneSummary:
          "Energetic, holistic wellness with clean organic minimalism and modern typography. Punchy video hooks and high-contrast benefit callouts.",
        toneTags: ["Vitality", "High Energy", "Clean Aesthetics"],
        colors: [
          { name: "Matcha Slate", hex: "#7FA0D6" },
          { name: "Cream Ivory", hex: "#161F2D", isLight: true },
          { name: "Core Charcoal", hex: "#0B111C" },
          { name: "Glow Amber", hex: "#D8BF9B" },
        ],
        social: {
          handle: "@ryzesocial",
          followers: "42,500 Followers",
          status: "API CONNECTED",
          syncInterval: "15m refresh",
        },
        brandVaultLink: "Ryze Master Assets Drive",
        figmaLink: "Ryze Brand Design System",
        lastAuditDate: "Sep 20, 2026",
      },
      pod: {
        name: "Pod B",
        tagline: "Performance & Video Ops",
        leadName: "Sarah Connor",
        leadTitle: "Lead Video Producer",
        leadAvatar: "SC",
        squad: [
          { name: "Karthik Raja", role: "Video Editor", hoursPerWeek: 16, avatar: "KR" },
          { name: "Elena Rostova", role: "Graphic Designer", hoursPerWeek: 16, avatar: "ER" },
        ],
        capacityAllocatedHrs: 32,
        bandwidthPercent: 75,
        dailySyncTime: "11:00 AM IST",
      },
      deliverables: [],
    },
    aravindan: {
      id: "aravindan",
      name: "Aravindan",
      initials: "A",
      industry: "B2B Enterprise SaaS & Cloud Architecture",
      timezone: "Client Time: IST (UTC+5:30)",
      activeSince: "Active since Mar 2024",
      tier: "Custom Retainer",
      tierBadge: "CUSTOM RETAINER",
      status: "ACTIVE RETAINER",
      monthlyFee: 45000,
      addon: "Add-on: Technical Motion Lead",
      nextBilling: "Oct 5, 2026",
      billingMethod: "Direct Corporate Wire",
      totalAssetsDelivered: 0,
      totalAssetsQuota: 15,
      postsDelivered: 0,
      postsQuota: 6,
      reelsDelivered: 0,
      reelsQuota: 4,
      storiesDelivered: 0,
      storiesQuota: 5,
      sprintNumber: 44,
      daysRemainingInSprint: 14,
      contact: {
        name: "Aravindan",
        title: "Founder & Chief Technology Officer",
        email: "aravindan20062006@gmail.com",
        phone: "+91 98402 33411",
        renewedDate: "Sep 5, 2026",
        termMonths: 12,
      },
      brand: {
        kitVersion: "Design Kit v2.1",
        headingsFont: "Plus Jakarta Sans",
        bodyFont: "Inter Sans",
        monoFont: "JetBrains Mono",
        toneSummary:
          "Authoritative, technically rigorous cloud software communication. Architectural clarity, latency reduction metrics, and developer-first storytelling.",
        toneTags: ["High Trust", "Developer First", "Algorithmic Speed"],
        colors: [
          { name: "Deep Obsidian", hex: "#0B111C" },
          { name: "Electric Azure", hex: "#7FA0D6" },
          { name: "Terminal Cyan", hex: "#7FA0D6" },
          { name: "Clean Slate", hex: "#F8FAFC", isLight: true },
        ],
        social: {
          handle: "@aravindan_dev",
          followers: "18,900 Followers",
          status: "API CONNECTED",
          syncInterval: "15m refresh",
        },
        brandVaultLink: "Aravindan Drive Cloud Vault",
        figmaLink: "Aravindan System Components",
        lastAuditDate: "Sep 18, 2026",
      },
      pod: {
        name: "Pod A",
        tagline: "Creative & Brand Strategy",
        leadName: "Vikram Malhotra",
        leadTitle: "Pod A Lead Producer",
        leadAvatar: "VM",
        squad: [
          { name: "Karthik Raja", role: "Video Editor", hoursPerWeek: 16, avatar: "KR" },
          { name: "Ananya Deshmukh", role: "Graphic Designer", hoursPerWeek: 16, avatar: "AD" },
        ],
        capacityAllocatedHrs: 32,
        bandwidthPercent: 85,
        dailySyncTime: "10:30 AM IST",
      },
      deliverables: [],
    },
    shanmugaraj: {
      id: "shanmugaraj",
      name: "Shanmugaraj",
      initials: "S",
      industry: "Omnichannel E-Commerce & Retail Tech",
      timezone: "Client Time: IST (UTC+5:30)",
      activeSince: "Active since Feb 2024",
      tier: "Brand Accelerator Retainer",
      tierBadge: "BRAND ACCELERATOR",
      status: "ACTIVE RETAINER",
      monthlyFee: 50000,
      addon: "Add-on: TikTok Growth Pod",
      nextBilling: "Oct 8, 2026",
      billingMethod: "Stripe Corporate ACH",
      totalAssetsDelivered: 0,
      totalAssetsQuota: 43,
      postsDelivered: 0,
      postsQuota: 15,
      reelsDelivered: 0,
      reelsQuota: 8,
      storiesDelivered: 0,
      storiesQuota: 20,
      sprintNumber: 44,
      daysRemainingInSprint: 14,
      contact: {
        name: "Shanmugaraj",
        title: "Head of Growth & Creative",
        email: "shanmugaraj2204@gmail.com",
        phone: "+91 98403 44522",
        renewedDate: "Sep 8, 2026",
        termMonths: 12,
      },
      brand: {
        kitVersion: "Design Kit v2.2",
        headingsFont: "Plus Jakarta Sans",
        bodyFont: "Inter Sans",
        monoFont: "Space Mono",
        toneSummary:
          "High-conversion retail creative with dynamic pacing, kinetic typography, and bold product highlights designed for immediate customer engagement.",
        toneTags: ["Conversion First", "Punchy Edits", "High CTR"],
        colors: [
          { name: "Vibrant Crimson", hex: "#D8BF9B" },
          { name: "Neon Rose", hex: "#D8BF9B" },
          { name: "Pure White", hex: "#FFFFFF", isLight: true },
          { name: "Jet Slate", hex: "#0B111C" },
        ],
        social: {
          handle: "@shanmuga_growth",
          followers: "64,200 Followers",
          status: "API CONNECTED",
          syncInterval: "15m refresh",
        },
        brandVaultLink: "Shanmugaraj Growth Assets Drive",
        figmaLink: "Shanmugaraj Master System",
        lastAuditDate: "Sep 22, 2026",
      },
      pod: {
        name: "Pod A",
        tagline: "Creative & Brand Strategy",
        leadName: "Vikram Malhotra",
        leadTitle: "Pod A Lead Producer",
        leadAvatar: "VM",
        squad: [
          { name: "Karthik Raja", role: "Video Editor", hoursPerWeek: 16, avatar: "KR" },
          { name: "Ananya Deshmukh", role: "Graphic Designer", hoursPerWeek: 16, avatar: "AD" },
        ],
        capacityAllocatedHrs: 30,
        bandwidthPercent: 78,
        dailySyncTime: "10:30 AM IST",
      },
      deliverables: [],
    },
    luma: {
      id: "luma",
      name: "Luma",
      initials: "L",
      industry: "Enterprise AI & Scaled Consumer Tech",
      timezone: "Client Time: IST (UTC+5:30)",
      activeSince: "Active since Nov 2023",
      tier: "Enterprise Domination Retainer",
      tierBadge: "ENTERPRISE DOMINATION",
      status: "ACTIVE RETAINER",
      monthlyFee: 95000,
      addon: "Add-on: 3D VFX Lead",
      nextBilling: "Oct 12, 2026",
      billingMethod: "Direct ACH Wire",
      totalAssetsDelivered: 0,
      totalAssetsQuota: 86,
      postsDelivered: 0,
      postsQuota: 30,
      reelsDelivered: 0,
      reelsQuota: 16,
      storiesDelivered: 0,
      storiesQuota: 40,
      sprintNumber: 44,
      daysRemainingInSprint: 14,
      contact: {
        name: "Luma Executive Director",
        title: "VP of Global Brand Marketing",
        email: "antigravity9840@gmail.com",
        phone: "+91 98404 55633",
        renewedDate: "Sep 12, 2026",
        termMonths: 12,
      },
      brand: {
        kitVersion: "Design Kit v2.5",
        headingsFont: "Plus Jakarta Sans",
        bodyFont: "Inter Sans",
        monoFont: "JetBrains Mono",
        toneSummary:
          "Institutional prestige meets kinetic AI interfaces. Sophisticated 3D physics rendering with uncompromising geometric precision.",
        toneTags: ["Institutional", "3D Kinetic", "Global Scale"],
        colors: [
          { name: "Galaxy Blue", hex: "#7FA0D6" },
          { name: "Cyan Flare", hex: "#7FA0D6" },
          { name: "Obsidian Core", hex: "#0B111C" },
          { name: "Pure Cloud", hex: "#F8FAFC", isLight: true },
        ],
        social: {
          handle: "@luma_global",
          followers: "128,400 Followers",
          status: "API CONNECTED",
          syncInterval: "15m refresh",
        },
        brandVaultLink: "Luma Enterprise Asset Drive",
        figmaLink: "Luma Global Design Tokens",
        lastAuditDate: "Sep 25, 2026",
      },
      pod: {
        name: "Pod A",
        tagline: "Motion & High-Velocity Video Ops",
        leadName: "Vikram Malhotra",
        leadTitle: "Creative Lead & VFX Director",
        leadAvatar: "VM",
        squad: [
          { name: "Karthik Raja", role: "Video Editor", hoursPerWeek: 16, avatar: "KR" },
          { name: "Ananya Deshmukh", role: "Graphic Designer", hoursPerWeek: 16, avatar: "AD" },
        ],
        capacityAllocatedHrs: 32,
        bandwidthPercent: 80,
        dailySyncTime: "11:30 AM IST",
      },
      deliverables: [],
    },
    apex: {
      id: "apex",
      name: "Apex Innovations",
      initials: "AI",
      industry: "Fintech & Algorithmic Infrastructure",
      timezone: "Client Time: IST (UTC+5:30)",
      activeSince: "Active since Jan 2024",
      tier: "Brand Accelerator Retainer",
      tierBadge: "BRAND ACCELERATOR",
      status: "ACTIVE RETAINER",
      monthlyFee: 50000,
      addon: "Add-on: Motion Specialist",
      nextBilling: "Oct 15, 2026",
      billingMethod: "Stripe Corporate ACH",
      totalAssetsDelivered: 12,
      totalAssetsQuota: 30,
      postsDelivered: 8,
      postsQuota: 15,
      reelsDelivered: 2,
      reelsQuota: 5,
      storiesDelivered: 2,
      storiesQuota: 10,
      sprintNumber: 44,
      daysRemainingInSprint: 14,
      contact: {
        name: "David K.",
        title: "VP of Product Marketing",
        email: "ops@apexinnovations.co",
        phone: "+91 98405 66744",
        renewedDate: "Sep 15, 2026",
        termMonths: 12,
      },
      brand: {
        kitVersion: "Design Kit v2.4",
        headingsFont: "Plus Jakarta Sans",
        bodyFont: "Inter Sans",
        monoFont: "JetBrains Mono",
        toneSummary: "Institutional, enterprise fintech with sharp geometric clarity.",
        toneTags: ["Algorithmic", "High Trust", "Global Scope"],
        colors: [
          { name: "Core Navy", hex: "#0B111C" },
          { name: "Accent Azure", hex: "#7FA0D6" },
          { name: "Cyan Highlight", hex: "#7FA0D6" },
          { name: "Clean Neutral", hex: "#F8FAFC", isLight: true },
        ],
        social: {
          handle: "@apexinnovations",
          followers: "94,000 Followers",
          status: "API CONNECTED",
          syncInterval: "15m refresh",
        },
        brandVaultLink: "Apex Brand Vault",
        figmaLink: "Apex Design System",
        lastAuditDate: "Sep 15, 2026",
      },
      pod: {
        name: "Pod A",
        tagline: "Creative & Brand Strategy",
        leadName: "Vikram Malhotra",
        leadTitle: "Pod A Lead Producer",
        leadAvatar: "VM",
        squad: [
          { name: "Karthik Raja", role: "Video Editor", hoursPerWeek: 16, avatar: "KR" },
          { name: "Ananya Deshmukh", role: "Graphic Designer", hoursPerWeek: 16, avatar: "AD" },
        ],
        capacityAllocatedHrs: 28,
        bandwidthPercent: 75,
        dailySyncTime: "10:30 AM IST",
      },
      deliverables: [],
    },
    nova: {
      id: "nova",
      name: "Nova Dynamics",
      initials: "ND",
      industry: "MedTech & Digital Health Platform",
      timezone: "Client Time: IST (UTC+5:30)",
      activeSince: "Active since Mar 2024",
      tier: "Starter Growth Retainer",
      tierBadge: "STARTER GROWTH",
      status: "ACTIVE RETAINER",
      monthlyFee: 25000,
      addon: "Add-on: Medical Illustrator",
      nextBilling: "Oct 18, 2026",
      billingMethod: "Stripe ACH Transfer",
      totalAssetsDelivered: 6,
      totalAssetsQuota: 20,
      postsDelivered: 4,
      postsQuota: 10,
      reelsDelivered: 1,
      reelsQuota: 4,
      storiesDelivered: 1,
      storiesQuota: 6,
      sprintNumber: 44,
      daysRemainingInSprint: 14,
      contact: {
        name: "Priya Sharma",
        title: "Director of Brand Communications",
        email: "comms@novadynamics.org",
        phone: "+91 98406 77855",
        renewedDate: "Sep 18, 2026",
        termMonths: 12,
      },
      brand: {
        kitVersion: "Design Kit v2.1",
        headingsFont: "Plus Jakarta Sans",
        bodyFont: "Inter Sans",
        monoFont: "JetBrains Mono",
        toneSummary: "Empathetic, scientifically rigorous clinical communication with modern human-centric interfaces.",
        toneTags: ["Clinical Trust", "Modern Care", "Accessible"],
        colors: [
          { name: "Care Emerald", hex: "#7FA0D6" },
          { name: "Teal Glow", hex: "#7FA0D6" },
          { name: "Soft Cyan", hex: "#161F2D", isLight: true },
          { name: "Deep Slate", hex: "#0B111C" },
        ],
        social: {
          handle: "@nova_dynamics",
          followers: "48,000 Followers",
          status: "API CONNECTED",
          syncInterval: "15m refresh",
        },
        brandVaultLink: "Nova Clinical Assets Drive",
        figmaLink: "Nova Medical UI Kit",
        lastAuditDate: "Sep 18, 2026",
      },
      pod: {
        name: "Pod C",
        tagline: "Creative Brand Engine",
        leadName: "Rohan Mehta",
        leadTitle: "Creative Communications Lead",
        leadAvatar: "RM",
        squad: [
          { name: "Tanvi Sen", role: "Video Editor", hoursPerWeek: 16, avatar: "TS" },
          { name: "Arjun Nair", role: "Graphic Designer", hoursPerWeek: 16, avatar: "AN" },
        ],
        capacityAllocatedHrs: 32,
        bandwidthPercent: 70,
        dailySyncTime: "10:00 AM IST",
      },
      deliverables: [],
    },
    solaris: {
      id: "solaris",
      name: "Solaris Retail",
      initials: "SR",
      industry: "Clean Cosmetics & Luxury DTC",
      timezone: "Client Time: IST (UTC+5:30)",
      activeSince: "Active since Feb 2024",
      tier: "Enterprise Domination Retainer",
      tierBadge: "ENTERPRISE DOMINATION",
      status: "ACTIVE RETAINER",
      monthlyFee: 95000,
      addon: "Add-on: Senior Colorist",
      nextBilling: "Oct 22, 2026",
      billingMethod: "Direct Corporate ACH",
      totalAssetsDelivered: 14,
      totalAssetsQuota: 60,
      postsDelivered: 8,
      postsQuota: 25,
      reelsDelivered: 4,
      reelsQuota: 15,
      storiesDelivered: 2,
      storiesQuota: 20,
      sprintNumber: 44,
      daysRemainingInSprint: 14,
      contact: {
        name: "Anya Taylor",
        title: "Head of Brand & Visual Production",
        email: "creative@solarisretail.com",
        phone: "+91 98407 88966",
        renewedDate: "Sep 22, 2026",
        termMonths: 12,
      },
      brand: {
        kitVersion: "Design Kit v1.9",
        headingsFont: "Plus Jakarta Sans",
        bodyFont: "Inter Sans",
        monoFont: "Space Mono",
        toneSummary: "Sensory, serene high-end beauty with warm editorial elegance and mindful self-care narratives.",
        toneTags: ["Mindful Luxe", "Botanical", "Warm Editorial"],
        colors: [
          { name: "Blush Rose", hex: "#D8BF9B" },
          { name: "Petal Mist", hex: "#161F2D", isLight: true },
          { name: "Sage Earth", hex: "#7FA0D6" },
          { name: "Soft Ivory", hex: "#161F2D", isLight: true },
        ],
        social: {
          handle: "@solaris_beauty",
          followers: "88,400 Followers",
          status: "API CONNECTED",
          syncInterval: "15m refresh",
        },
        brandVaultLink: "Solaris Brand Assets Drive",
        figmaLink: "Solaris Design System",
        lastAuditDate: "Sep 22, 2026",
      },
      pod: {
        name: "Pod B",
        tagline: "Visual & Lifestyle Retouching",
        leadName: "Sarah Connor",
        leadTitle: "Pod B Lead Producer",
        leadAvatar: "SC",
        squad: [
          { name: "Karthik Raja", role: "Video Editor", hoursPerWeek: 16, avatar: "KR" },
          { name: "Elena Rostova", role: "Graphic Designer", hoursPerWeek: 16, avatar: "ER" },
        ],
        capacityAllocatedHrs: 28,
        bandwidthPercent: 78,
        dailySyncTime: "11:00 AM IST",
      },
      deliverables: [],
    },
  };

  const mergedClientsData: Record<string, ClientDetailData> = { ...clientsData, ...customClients };

  serverClients.forEach((sc) => {
    const emailParts = sc.email.split("@");
    const rawEmailPart = (emailParts[0] || "").replace(/[._0-9]/g, " ").trim();
    const rawName = sc.company_name && sc.company_name.trim() !== "" && sc.company_name.toLowerCase() !== "unknown"
      ? sc.company_name
      : rawEmailPart;
    const formattedName = rawName ? rawName.charAt(0).toUpperCase() + rawName.slice(1) : "Client Account";
    const initials = formattedName.charAt(0).toUpperCase();
    const tierName = sc.plan_display_name || sc.plan_name || "Enterprise Retainer";
    const tier = tierName.toLowerCase();
    
    const podConfigs = [
      {
        letter: "A",
        name: "Pod A",
        tagline: "Enterprise Brand Strategy & Video",
        leadName: "Vikram Malhotra",
        leadTitle: "Pod A Lead Producer",
        leadAvatar: "VM",
        squad: [
          { name: "Karthik Raja", role: "Video Editor", hoursPerWeek: 16, avatar: "KR" },
          { name: "Ananya Deshmukh", role: "Graphic Designer", hoursPerWeek: 16, avatar: "AD" },
        ],
      },
      {
        letter: "B",
        name: "Pod B",
        tagline: "Performance Creative & Motion Ops",
        leadName: "Sarah Connor",
        leadTitle: "Pod B Lead Producer",
        leadAvatar: "SC",
        squad: [
          { name: "Karthik Raja", role: "Video Editor", hoursPerWeek: 16, avatar: "KR" },
          { name: "Elena Rostova", role: "Graphic Designer", hoursPerWeek: 16, avatar: "ER" },
        ],
      },
      {
        letter: "C",
        name: "Pod C",
        tagline: "3D Motion & Visual Design",
        leadName: "Rohan Mehta",
        leadTitle: "Pod C Lead Producer",
        leadAvatar: "RM",
        squad: [
          { name: "Tanvi Sen", role: "Video Editor", hoursPerWeek: 16, avatar: "TS" },
          { name: "Arjun Nair", role: "Graphic Designer", hoursPerWeek: 16, avatar: "AN" },
        ],
      },
    ];
    const podIdx = Math.abs(formattedName.charCodeAt(0) || 0) % podConfigs.length;
    const pod = (podConfigs[podIdx] || podConfigs[0])!;

    const monthlyFee = tier.includes("starter") ? 25000 : tier.includes("growth") || tier.includes("brand") ? 50000 : 95000;
    
    const postsQuota = sc.quota_usage.find((q) => q.kind.toLowerCase() === "posts")?.quota || (tier.includes("starter") ? 8 : tier.includes("growth") ? 15 : 30);
    const postsDelivered = sc.quota_usage.find((q) => q.kind.toLowerCase() === "posts")?.used || 0;
    const reelsQuota = sc.quota_usage.find((q) => q.kind.toLowerCase() === "reels")?.quota || (tier.includes("starter") ? 4 : tier.includes("growth") ? 8 : 16);
    const reelsDelivered = sc.quota_usage.find((q) => q.kind.toLowerCase() === "reels")?.used || 0;
    const storiesQuota = sc.quota_usage.find((q) => q.kind.toLowerCase() === "stories")?.quota || (tier.includes("starter") ? 10 : tier.includes("growth") ? 20 : 40);
    const storiesDelivered = sc.quota_usage.find((q) => q.kind.toLowerCase() === "stories")?.used || 0;

    // Check for match with existing baseline client
    const existingKey = Object.keys(mergedClientsData).find(
      (k) =>
        k.toLowerCase() === sc.client_id.toLowerCase() ||
        mergedClientsData[k]?.contact?.email?.toLowerCase() === sc.email?.toLowerCase() ||
        mergedClientsData[k]?.name?.toLowerCase() === formattedName.toLowerCase()
    );

    const existing = existingKey ? mergedClientsData[existingKey] : undefined;

    if (existing) {
      const updated: ClientDetailData = {
        ...existing,
        id: sc.client_id || existing.id,
        initials: existing.initials || initials,
        name: existing.name || formattedName,
        status: (sc.subscription_status || sc.account_status || existing.status).toUpperCase(),
        totalAssetsDelivered: postsDelivered + reelsDelivered + storiesDelivered,
        totalAssetsQuota: postsQuota + reelsQuota + storiesQuota,
        postsDelivered,
        postsQuota,
        reelsDelivered,
        reelsQuota,
        storiesDelivered,
        storiesQuota,
        contact: {
          ...existing.contact,
          email: sc.email || existing.contact.email,
        },
      };
      if (existingKey) {
        mergedClientsData[existingKey] = updated;
      }
      mergedClientsData[sc.client_id] = updated;
    } else {
      mergedClientsData[sc.client_id] = {
        id: sc.client_id,
        name: formattedName,
        initials,
        industry: "Digital Growth & Direct-to-Consumer",
        timezone: "Client Time: IST (UTC+5:30)",
        activeSince: "Active Client",
        tier: tierName,
        tierBadge: tierName.toUpperCase(),
        status: (sc.subscription_status || sc.account_status || "ACTIVE RETAINER").toUpperCase(),
        monthlyFee,
        addon: "Add-on: Creative Pod",
        nextBilling: "Next Month Cycle",
        billingMethod: "Direct ACH / Razorpay",
        totalAssetsDelivered: postsDelivered + reelsDelivered + storiesDelivered,
        totalAssetsQuota: postsQuota + reelsQuota + storiesQuota,
        postsDelivered,
        postsQuota,
        reelsDelivered,
        reelsQuota,
        storiesDelivered,
        storiesQuota,
        sprintNumber: 44,
        daysRemainingInSprint: 14,
        contact: {
          name: formattedName,
          title: "Account Owner & Authorized Contact",
          email: sc.email,
          phone: "+91 98401 23890",
          renewedDate: "Current Sprint",
          termMonths: 12,
        },
        brand: {
          kitVersion: "Design Kit v2.4",
          headingsFont: "Plus Jakarta Sans",
          bodyFont: "Inter Sans",
          monoFont: "JetBrains Mono",
          toneSummary: `Dynamic, high-impact social media creatives engineered for ${formattedName}. High-clarity typography with conversion-optimized video hooks.`,
          toneTags: ["High Conversion", "Brand Authority", "Visual Polish"],
          colors: [
            { name: "Primary Deep Navy", hex: "#0B111C" },
            { name: "Accent Royal Blue", hex: "#7FA0D6" },
            { name: "Cyan Highlight", hex: "#7FA0D6" },
            { name: "Clean Neutral", hex: "#F8FAFC", isLight: true },
          ],
          social: {
            handle: sc.instagram_username ? `@${sc.instagram_username}` : `@${emailParts[0] || "client"}`,
            followers: "API Connected",
            status: "API CONNECTED",
            syncInterval: "15m refresh",
          },
          brandVaultLink: "Client Brand Vault Drive",
          figmaLink: "Figma Master Design Kit",
          lastAuditDate: "This Sprint",
        },
        pod: {
          name: pod.name,
          tagline: pod.tagline,
          leadName: pod.leadName,
          leadTitle: pod.leadTitle,
          leadAvatar: pod.leadAvatar,
          squad: pod.squad,
          capacityAllocatedHrs: 32,
          bandwidthPercent: 80,
          dailySyncTime: "11:00 AM IST",
        },
        deliverables: [],
      };
    }
  });

  // Deduplicate unique client records for roster display
  const clientMap = new Map<string, ClientDetailData>();
  Object.values(mergedClientsData).forEach((c) => {
    const key = (c.contact?.email || c.name || c.id).toLowerCase();
    if (!clientMap.has(key)) {
      clientMap.set(key, c);
    }
  });
  const clientList = Array.from(clientMap.values()).filter(
    (c) =>
      !removedClientIds.has(c.id.toLowerCase()) &&
      !removedClientIds.has(c.name.toLowerCase()) &&
      !removedClientIds.has((c.contact?.email || "").toLowerCase())
  );

  useEffect(() => {
    if (urlClientId) {
      const match = Object.keys(mergedClientsData).find(
        (key) =>
          key.toLowerCase() === urlClientId.toLowerCase() ||
          mergedClientsData[key]?.id?.toLowerCase() === urlClientId.toLowerCase() ||
          mergedClientsData[key]?.name.toLowerCase() === urlClientId.toLowerCase() ||
          mergedClientsData[key]?.contact.email.toLowerCase() === urlClientId.toLowerCase() ||
          key.includes(urlClientId) ||
          urlClientId.includes(key)
      );
      if (match) {
        setSelectedClientId(match);
      }
    }
  }, [urlClientId, serverClients]);

  const activeClient = selectedClientId
    ? mergedClientsData[selectedClientId] ||
      clientList.find(
        (c) =>
          c.id.toLowerCase() === selectedClientId.toLowerCase() ||
          c.name.toLowerCase() === selectedClientId.toLowerCase() ||
          c.contact.email.toLowerCase() === selectedClientId.toLowerCase()
      ) ||
      mergedClientsData.ryze ||
      clientList[0] ||
      null
    : null;

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
    <div data-surface="ops" className="w-full min-h-screen font-sans bg-[#0B111C] flex flex-col">
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
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-[#97A0B3]" />
                <input
                  type="text"
                  placeholder="Search by brand name, industry, or contact email..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-[#2A3446] bg-[#161F2D] text-xs font-medium text-white focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 shadow-2xs"
                />
              </div>
              <div className="flex items-center gap-2 w-full sm:w-auto justify-between sm:justify-end">
                <span className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-50 text-emerald-800 text-xs font-bold border border-emerald-200 shrink-0">
                  <span className="size-2 rounded-full bg-emerald-500 animate-pulse" />
                  {clientList.length} Active Retainers
                </span>
                <div className="flex items-center gap-1.5">
                  <Filter className="size-4 text-[#97A0B3]" />
                  <CustomSelect
                    value={statusFilter}
                    onChange={setStatusFilter}
                    ariaLabel="Filter Client Status"
                    options={[
                      { value: "all", label: "All Statuses" },
                      { value: "active", label: "Active Retainers" },
                      { value: "enterprise", label: "Enterprise Retainers" },
                      { value: "growth", label: "Growth Retainers" },
                    ]}
                  />
                </div>
                <button
                  type="button"
                  onClick={() => setIsOnboardClientModalOpen(true)}
                  className="px-3.5 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:brightness-110 text-white text-xs font-bold flex items-center gap-1.5 shadow-md shadow-blue-600/20 cursor-pointer transition-all shrink-0"
                >
                  <Plus className="w-4 h-4" /> Onboard Client
                </button>
                <button
                  type="button"
                  onClick={() => setIsRemoveClientModalOpen(true)}
                  className="px-3 py-2.5 rounded-xl border border-rose-500/40 bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-all shrink-0"
                >
                  <Trash2 className="w-3.5 h-3.5 text-rose-400" /> Remove Client
                </button>
              </div>
            </div>

            {/* Client Cards Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredClientList.map((client) => (
                <div
                  key={client.id}
                  onClick={() => setSelectedClientId(client.id)}
                  className="bg-[#161F2D]/80 backdrop-blur-xl rounded-3xl p-6 border border-[#2A3446]/80 shadow-xl space-y-5 hover:shadow-2xl hover:border-[#7FA0D6]/40 transition-all cursor-pointer group flex flex-col justify-between"
                >
                  <div className="space-y-4">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-2xl bg-[#0B111C] text-white font-black text-lg flex items-center justify-center shadow-md group-hover:scale-105 transition-transform">
                          {client.initials}
                        </div>
                        <div>
                          <div className="flex items-center gap-1.5">
                            <h3 className="font-bold text-base text-white group-hover:text-[#7FA0D6] transition-colors">
                              {client.name}
                            </h3>
                            <CheckCircle2 className="w-4 h-4 text-[#7FA0D6] fill-blue-600 text-white" />
                          </div>
                          <span className="text-[11px] text-[#97A0B3] font-medium block truncate max-w-[200px]">
                            {client.industry}
                          </span>
                        </div>
                      </div>
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                        {client.status.replace(" RETAINER", "")}
                      </span>
                    </div>

                    <div className="p-3 bg-[#0B111C]/80 rounded-2xl space-y-1.5 text-xs text-[#F1F5F9] border border-[#2A3446]">
                      <div className="flex justify-between">
                        <span className="font-medium text-[#97A0B3]">Retainer:</span>
                        <span className="font-bold text-white">₹{client.monthlyFee.toLocaleString()}/mo</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="font-medium text-[#97A0B3]">Assigned Pod:</span>
                        <span className="font-bold text-[#7FA0D6]">{client.pod.name} ({client.pod.tagline})</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="font-medium text-[#97A0B3]">Primary Contact:</span>
                        <span className="font-semibold text-white">{client.contact.name}</span>
                      </div>
                    </div>
                  </div>

                  <div className="pt-3 border-t border-[#2A3446] flex items-center justify-between text-xs">
                    <span className="text-[#97A0B3] font-medium">{client.deliverables.length} Deliverables Active</span>
                    <span className="text-[#7FA0D6] font-bold group-hover:underline flex items-center gap-1">
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
              <div className="flex items-center gap-2 text-xs font-bold text-[#97A0B3]">
                <button
                  type="button"
                  onClick={() => setSelectedClientId(null)}
                  className="hover:text-[#7FA0D6] flex items-center gap-1 transition-colors cursor-pointer text-[#F1F5F9]"
                >
                  <ArrowLeft className="w-4 h-4" /> Back to Client Roster
                </button>
                <span>/</span>
                <span className="text-[#97A0B3]">Client Details</span>
                <span>/</span>
                <span className="text-white font-black">{activeClient?.name}</span>
              </div>

              <div className="flex items-center gap-2">
                <span className="px-3 py-1 rounded-full text-xs font-bold bg-[#161F2D] text-white border border-[#2A3446] flex items-center gap-1.5 shadow-2xs">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  Live Client • v2.4
                </span>
              </div>
            </div>

            {/* Client Header Card matching Screenshot */}
            <div className="bg-[#161F2D] rounded-3xl p-6 lg:p-7 border border-[#2A3446] shadow-[0_4px_30px_rgba(0,0,0,0.03)] space-y-4">
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                <div className="flex items-start gap-4">
                  <div className="w-16 h-16 rounded-2xl bg-[#0B111C] text-white font-black text-2xl flex items-center justify-center shadow-lg shrink-0">
                    {activeClient?.initials}
                  </div>
                  <div className="space-y-1.5">
                    <div className="flex flex-wrap items-center gap-2.5">
                      <h1 className="text-2xl font-black text-white tracking-tight">
                        {activeClient?.name}
                      </h1>
                      <CheckCircle2 className="w-5 h-5 text-[#7FA0D6] fill-blue-600 text-white" />
                      <span className="px-2.5 py-0.5 rounded-full bg-[#7FA0D6]/15 text-[#7FA0D6] border border-[#7FA0D6]/30 text-[10px] font-black uppercase tracking-wider">
                        {activeClient?.tierBadge}
                      </span>
                      <span className="px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-black uppercase tracking-wider flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                        {activeClient?.status}
                      </span>
                    </div>

                    <div className="flex flex-wrap items-center gap-x-5 gap-y-1 text-xs text-[#97A0B3] font-medium">
                      <span className="flex items-center gap-1">
                        <Folder className="w-3.5 h-3.5 text-[#97A0B3]" />
                        {activeClient?.industry}
                      </span>
                      <span>•</span>
                      <span className="flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5 text-[#97A0B3]" />
                        {activeClient?.timezone}
                      </span>
                      <span>•</span>
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5 text-[#97A0B3]" />
                        {activeClient?.activeSince}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Header Action Buttons */}
                <div className="flex items-center gap-2.5 shrink-0">
                  <Link
                    to={`/admin/clients/${activeClient?.id || "ryze"}/brand`}
                    className="px-4 py-2.5 rounded-xl border border-[#7FA0D6]/40 bg-[#7FA0D6]/15 hover:bg-[#7FA0D6]/25 text-xs font-bold text-[#7FA0D6] flex items-center gap-1.5 shadow-2xs cursor-pointer transition-all"
                  >
                    <ExternalLink className="w-3.5 h-3.5 text-[#7FA0D6]" /> Brand Brief & Profile
                  </Link>
                  <button
                    type="button"
                    onClick={() => setIsEditProfileOpen(true)}
                    className="px-4 py-2.5 rounded-xl border border-[#2A3446] bg-[#161F2D] hover:bg-[#0B111C] text-xs font-bold text-[#F1F5F9] flex items-center gap-1.5 shadow-2xs cursor-pointer transition-all"
                  >
                    <Edit3 className="w-3.5 h-3.5 text-[#97A0B3]" /> Edit Profile
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsInvoiceModalOpen(true)}
                    className="px-4 py-2.5 rounded-xl border border-[#2A3446] bg-[#161F2D] hover:bg-[#0B111C] text-xs font-bold text-[#F1F5F9] flex items-center gap-1.5 shadow-2xs cursor-pointer transition-all"
                  >
                    <FileText className="w-3.5 h-3.5 text-[#97A0B3]" /> Monthly Invoice
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsNewRequestOpen(true)}
                    className="px-4 py-2.5 rounded-xl bg-[#7FA0D6] hover:bg-blue-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-md shadow-blue-500/20 cursor-pointer transition-all"
                  >
                    <Plus className="w-4 h-4 stroke-[3]" /> New Request
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsCancelClientModalOpen(true)}
                    className="px-4 py-2.5 rounded-xl border border-rose-500/40 bg-rose-500/10 hover:bg-rose-500/20 text-xs font-bold text-rose-400 flex items-center gap-1.5 shadow-2xs cursor-pointer transition-all"
                  >
                    <Trash2 className="w-3.5 h-3.5 text-rose-400" /> Remove Client & Cancel Plan
                  </button>
                </div>
              </div>
            </div>

            {/* 4 Main Grid Cards matching Screenshot (2x2) */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* CARD 1: PRIMARY CONTACT */}
              <div className="bg-[#161F2D] rounded-3xl p-6 border border-[#2A3446] shadow-[0_4px_25px_rgba(0,0,0,0.03)] space-y-5 flex flex-col justify-between">
                <div className="space-y-4">
                  <div className="flex items-center justify-between border-b border-[#2A3446] pb-3">
                    <span className="text-[11px] font-extrabold text-[#97A0B3] uppercase tracking-wider">
                      PRIMARY CONTACT
                    </span>
                    <span className="px-2.5 py-0.5 rounded-full bg-[#161F2D] text-[#F1F5F9] text-[10px] font-bold">
                      Authorized Signer
                    </span>
                  </div>

                  <div className="flex items-center gap-3.5">
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-600 to-indigo-700 text-white font-black text-base flex items-center justify-center shadow-md">
                      {activeClient?.contact.name[0]}
                    </div>
                    <div>
                      <h3 className="text-base font-bold text-white">{activeClient?.contact.name}</h3>
                      <p className="text-xs text-[#97A0B3] font-medium">{activeClient?.contact.title}</p>
                    </div>
                  </div>

                  <div className="space-y-2 pt-2">
                    <div className="p-3 bg-[#0B111C]/80 rounded-2xl flex items-center justify-between border border-[#2A3446] text-xs">
                      <div className="flex items-center gap-2 text-[#97A0B3] font-medium">
                        <Mail className="w-4 h-4 text-[#97A0B3]" />
                        <span>Email</span>
                      </div>
                      <a href={`mailto:${activeClient?.contact.email}`} className="text-[#7FA0D6] font-bold hover:underline">
                        {activeClient?.contact.email}
                      </a>
                    </div>

                    <div className="p-3 bg-[#0B111C]/80 rounded-2xl flex items-center justify-between border border-[#2A3446] text-xs">
                      <div className="flex items-center gap-2 text-[#97A0B3] font-medium">
                        <Phone className="w-4 h-4 text-[#97A0B3]" />
                        <span>Direct Phone</span>
                      </div>
                      <span className="font-bold text-white font-mono">{activeClient?.contact.phone}</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between text-xs text-[#97A0B3] pt-3 border-t border-[#2A3446] font-medium">
                  <span className="flex items-center gap-1 text-emerald-700 font-semibold">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                    Contract renewed: {activeClient?.contact.renewedDate}
                  </span>
                  <span>Term: {activeClient?.contact.termMonths} Mo</span>
                </div>
              </div>

              {/* CARD 2: TIER TERMS & SCOPE */}
              <div className="bg-[#161F2D] rounded-3xl p-6 border border-[#2A3446] shadow-[0_4px_25px_rgba(0,0,0,0.03)] space-y-5 flex flex-col justify-between">
                <div className="space-y-4">
                  <div className="flex items-center justify-between border-b border-[#2A3446] pb-3">
                    <span className="text-[11px] font-extrabold text-[#97A0B3] uppercase tracking-wider">
                      TIER TERMS & SCOPE
                    </span>
                    <span className="px-2.5 py-0.5 rounded-full bg-[#7FA0D6]/15 text-[#7FA0D6] text-[10px] font-bold border border-[#7FA0D6]/30">
                      Active Cycle
                    </span>
                  </div>

                  <div className="flex items-baseline justify-between">
                    <div>
                      <span className="text-3xl font-black text-white">₹{activeClient?.monthlyFee.toLocaleString()}</span>
                      <span className="text-xs font-bold text-[#97A0B3]"> /mo</span>
                    </div>
                    {activeClient?.addon && (
                      <span className="px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-700 text-xs font-bold border border-emerald-200 flex items-center gap-1">
                        <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                        {activeClient.addon}
                      </span>
                    )}
                  </div>

                  <p className="text-xs text-[#97A0B3]">
                    Next billing scheduled for {activeClient?.nextBilling} via {activeClient?.billingMethod}.
                  </p>

                  {/* Monthly Output Burn bar */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-xs font-bold">
                      <span className="text-[#F1F5F9]">Monthly Output Burn</span>
                      <span className="text-[#7FA0D6]">
                        {activeClient?.totalAssetsDelivered} / {activeClient?.totalAssetsQuota} Assets Delivered (
                        {Math.round(((activeClient?.totalAssetsDelivered || 0) / (activeClient?.totalAssetsQuota || 1)) * 100)}%)
                      </span>
                    </div>
                    <div className="w-full bg-[#161F2D] rounded-full h-2.5 overflow-hidden">
                      <div
                        className="bg-[#7FA0D6] h-full rounded-full transition-all"
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
                    <div className="p-3 bg-[#0B111C] rounded-2xl text-center space-y-0.5 border border-[#2A3446]">
                      <span className="text-sm font-black text-white">
                        {activeClient?.postsDelivered}/{activeClient?.postsQuota}
                      </span>
                      <span className="text-[10px] font-bold text-[#97A0B3] block uppercase">POSTS</span>
                    </div>
                    <div className="p-3 bg-[#0B111C] rounded-2xl text-center space-y-0.5 border border-[#2A3446]">
                      <span className="text-sm font-black text-white">
                        {activeClient?.reelsDelivered}/{activeClient?.reelsQuota}
                      </span>
                      <span className="text-[10px] font-bold text-[#97A0B3] block uppercase">REELS</span>
                    </div>
                    <div className="p-3 bg-[#0B111C] rounded-2xl text-center space-y-0.5 border border-[#2A3446]">
                      <span className="text-sm font-black text-white">
                        {activeClient?.storiesDelivered}/{activeClient?.storiesQuota}
                      </span>
                      <span className="text-[10px] font-bold text-[#97A0B3] block uppercase">STORIES</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between text-xs text-[#97A0B3] pt-3 border-t border-[#2A3446] font-medium">
                  <span>Sprint {activeClient?.sprintNumber}: {activeClient?.daysRemainingInSprint} days remaining</span>
                  <button
                    type="button"
                    onClick={() => showToast("Opening Client Quota Ledger...")}
                    className="text-[#7FA0D6] font-bold hover:underline cursor-pointer"
                  >
                    View Quota Log
                  </button>
                </div>
              </div>

              {/* CARD 3: CLIENT BRAND ECOSYSTEM & GUIDELINES */}
              <div className="bg-[#161F2D] rounded-3xl p-6 border border-[#2A3446] shadow-[0_4px_25px_rgba(0,0,0,0.03)] space-y-5">
                <div className="flex items-center justify-between border-b border-[#2A3446] pb-3">
                  <div className="flex items-center gap-2">
                    <Palette className="w-4 h-4 text-[#7FA0D6]" />
                    <h2 className="text-xs font-extrabold text-white uppercase tracking-wider">
                      Client Brand Ecosystem & Guidelines
                    </h2>
                  </div>
                  <span className="px-2.5 py-0.5 rounded-full bg-[#161F2D] text-[#F1F5F9] text-[10px] font-bold">
                    {activeClient?.brand.kitVersion}
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Typography */}
                  <div className="p-3.5 bg-[#0B111C]/70 rounded-2xl space-y-2 border border-[#2A3446] text-xs">
                    <span className="text-[10px] font-extrabold text-[#97A0B3] uppercase tracking-wider block">
                      TYPOGRAPHY HIERARCHY
                    </span>
                    <div className="space-y-1 text-[#F1F5F9]">
                      <div className="flex justify-between">
                        <span className="text-[#97A0B3]">Headings:</span>
                        <span className="font-bold">{activeClient?.brand.headingsFont}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-[#97A0B3]">Body & Data:</span>
                        <span className="font-medium">{activeClient?.brand.bodyFont}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-[#97A0B3]">Monospace:</span>
                        <span className="font-mono">{activeClient?.brand.monoFont}</span>
                      </div>
                    </div>
                  </div>

                  {/* Persona & Voice Tone */}
                  <div className="p-3.5 bg-[#0B111C]/70 rounded-2xl space-y-2 border border-[#2A3446] text-xs flex flex-col justify-between">
                    <div>
                      <span className="text-[10px] font-extrabold text-[#97A0B3] uppercase tracking-wider block">
                        PERSONA & VOICE TONE
                      </span>
                      <p className="text-[11px] text-[#F1F5F9] mt-1 leading-relaxed">
                        {activeClient?.brand.toneSummary}
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {activeClient?.brand.toneTags.map((tag) => (
                        <span key={tag} className="px-2 py-0.5 rounded-md bg-[#161F2D] border border-[#2A3446] text-[10px] font-bold text-[#F1F5F9] shadow-2xs">
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Approved Color Spectrum */}
                <div className="space-y-2">
                  <span className="text-[10px] font-extrabold text-[#97A0B3] uppercase tracking-wider block">
                    APPROVED COLOR SPECTRUM
                  </span>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                    {activeClient?.brand.colors.map((c) => (
                      <div key={c.hex} className="rounded-2xl border border-[#2A3446] overflow-hidden bg-[#161F2D] shadow-2xs space-y-1.5 pb-2">
                        <div className="h-10 w-full" style={{ backgroundColor: c.hex }} />
                        <div className="px-2.5">
                          <span className="text-[11px] font-bold text-white block truncate">{c.name}</span>
                          <span className="text-[10px] font-mono text-[#97A0B3]">{c.hex}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Social Channel */}
                <div className="p-3.5 bg-[#0B111C]/80 rounded-2xl border border-[#2A3446] flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-amber-500 via-rose-500 to-purple-600 text-white flex items-center justify-center shadow-xs">
                      <Instagram className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-xs text-white">{activeClient?.brand.social.handle}</span>
                        <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-[9px] font-extrabold uppercase">
                          {activeClient?.brand.social.status}
                        </span>
                      </div>
                      <span className="text-[11px] text-[#97A0B3]">
                        {activeClient?.brand.social.followers} • Live Sync active ({activeClient?.brand.social.syncInterval})
                      </span>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => showToast(`Opening ${activeClient?.brand.social.handle} live analytics...`)}
                    className="px-3 py-1.5 rounded-xl border border-[#2A3446] bg-[#161F2D] hover:bg-[#0B111C] text-xs font-bold text-[#F1F5F9] shadow-2xs cursor-pointer"
                  >
                    Launch Channel
                  </button>
                </div>

                <div className="flex flex-wrap items-center justify-between text-xs text-[#97A0B3] font-medium pt-3 border-t border-[#2A3446] gap-2">
                  <div className="flex items-center gap-3 text-[#7FA0D6] font-bold">
                    <span className="cursor-pointer hover:underline flex items-center gap-1">
                      <Folder className="w-3.5 h-3.5" /> {activeClient?.brand.brandVaultLink}
                    </span>
                    <span>•</span>
                    <span className="cursor-pointer hover:underline flex items-center gap-1">
                      <ExternalLink className="w-3.5 h-3.5" /> {activeClient?.brand.figmaLink}
                    </span>
                    <span>•</span>
                    <Link
                      to={`/admin/clients/${activeClient?.id || "ryze"}/brand`}
                      className="cursor-pointer hover:underline flex items-center gap-1 text-[#7FA0D6]"
                    >
                      Brand DNA & Brief →
                    </Link>
                  </div>
                  <span>Last audit {activeClient?.brand.lastAuditDate}</span>
                </div>
              </div>

              {/* CARD 4: ASSIGNED CREATIVE POD */}
              <div className="bg-[#161F2D] rounded-3xl p-6 border border-[#2A3446] shadow-[0_4px_25px_rgba(0,0,0,0.03)] space-y-5 flex flex-col justify-between">
                <div className="space-y-4">
                  <div className="flex items-center justify-between border-b border-[#2A3446] pb-3">
                    <div className="flex items-center gap-2">
                      <Users className="w-4 h-4 text-[#7FA0D6]" />
                      <h2 className="text-xs font-extrabold text-white uppercase tracking-wider">
                        Assigned creative pod
                      </h2>
                    </div>
                    <span className="px-2.5 py-0.5 rounded-full bg-[#7FA0D6]/15 text-[#7FA0D6] text-[10px] font-bold border border-[#7FA0D6]/30">
                      {activeClient?.pod.name}: {activeClient?.pod.tagline}
                    </span>
                  </div>

                  {/* Pod Lead */}
                  <div className="space-y-2">
                    <span className="text-[10px] font-extrabold text-[#97A0B3] uppercase tracking-wider block">
                      POD LEAD & CREATIVE DIRECTOR
                    </span>
                    <div className="p-3 bg-[#0B111C]/70 rounded-2xl flex items-center justify-between border border-[#2A3446]">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-blue-600 text-white font-bold text-sm flex items-center justify-center shadow-xs">
                          {activeClient?.pod.leadAvatar}
                        </div>
                        <div>
                          <h4 className="text-xs font-bold text-white">{activeClient?.pod.leadName}</h4>
                          <span className="text-[11px] text-[#97A0B3]">{activeClient?.pod.leadTitle}</span>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => showToast(`Connecting to ${activeClient?.pod.leadName} via Slack/Creo Chat...`)}
                        className="p-2 rounded-xl bg-[#161F2D] border border-[#2A3446] text-[#F1F5F9] hover:text-[#7FA0D6] shadow-2xs cursor-pointer"
                        title="Chat with Pod Lead"
                      >
                        <MessageSquare className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Squad Members */}
                  <div className="space-y-2">
                    <span className="text-[10px] font-extrabold text-[#97A0B3] uppercase tracking-wider block">
                      SQUAD MEMBERS
                    </span>
                    <div className="space-y-1.5">
                      {activeClient?.pod.squad.map((member) => (
                        <div key={member.name} className="p-2.5 bg-[#0B111C]/50 rounded-xl flex items-center justify-between text-xs border border-[#2A3446]">
                          <div className="flex items-center gap-2.5">
                            <div className="w-7 h-7 rounded-full bg-gray-200 text-[#F1F5F9] font-bold text-[10px] flex items-center justify-center">
                              {member.avatar}
                            </div>
                            <div>
                              <span className="font-bold text-white block leading-tight">{member.name}</span>
                              <span className="text-[10px] text-[#97A0B3]">{member.role}</span>
                            </div>
                          </div>
                          <span className="font-mono font-bold text-[11px] text-[#F1F5F9]">{member.hoursPerWeek}h/wk</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Pod Capacity Commitment */}
                  <div className="space-y-2 pt-1">
                    <div className="flex items-center justify-between text-xs font-bold">
                      <span className="text-[#F1F5F9]">Pod Capacity Commitment</span>
                      <span className="text-[#7FA0D6] font-mono">
                        {activeClient?.pod.capacityAllocatedHrs} hrs/week allocated
                      </span>
                    </div>
                    <div className="w-full bg-[#161F2D] rounded-full h-2 overflow-hidden">
                      <div
                        className="bg-[#7FA0D6] h-full rounded-full transition-all"
                        style={{ width: `${activeClient?.pod.bandwidthPercent}%` }}
                      />
                    </div>
                    <span className="text-[11px] text-[#97A0B3] font-medium block">
                      Sprint {activeClient?.sprintNumber} • {activeClient?.pod.bandwidthPercent}% bandwidth filled
                    </span>
                  </div>
                </div>

                <div className="flex items-center justify-between text-xs text-[#97A0B3] pt-3 border-t border-[#2A3446] font-medium">
                  <span>Daily Sync: {activeClient?.pod.dailySyncTime}</span>
                  <button
                    type="button"
                    onClick={() => showToast(`Opening Pod Reallocation Studio for ${activeClient?.pod.name}...`)}
                    className="text-[#7FA0D6] font-bold hover:underline cursor-pointer"
                  >
                    Reallocate Pod Hours
                  </button>
                </div>
              </div>
            </div>

            {/* ═════════════════════════════════════════════════════════════════
                BOTTOM SECTION: ACTIVE DELIVERABLES IN PRODUCTION
            ═════════════════════════════════════════════════════════════════ */}
            <div className="bg-[#161F2D] rounded-3xl p-6 lg:p-7 border border-[#2A3446] shadow-[0_4px_30px_rgba(0,0,0,0.03)] space-y-6">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#2A3446] pb-4">
                <div>
                  <div className="flex items-center gap-2.5">
                    <h2 className="text-base font-black text-white">Active Deliverables in Production</h2>
                    <span className="px-2.5 py-0.5 rounded-full bg-[#7FA0D6]/15 text-[#7FA0D6] border border-[#7FA0D6]/30 text-[10px] font-black uppercase">
                      {filteredDeliverables.length} Items Requiring Attention
                    </span>
                  </div>
                  <p className="text-xs text-[#97A0B3] mt-0.5">
                    Manage approvals, review video renders, and coordinate asset distribution across all client pipelines.
                  </p>
                </div>

                {/* Filter Controls */}
                <div className="flex items-center gap-2">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#97A0B3]" />
                    <input
                      type="text"
                      placeholder="Filter deliverable..."
                      value={deliverableSearch}
                      onChange={(e) => setDeliverableSearch(e.target.value)}
                      className="pl-8 pr-3 py-1.5 rounded-xl border border-[#2A3446] text-xs bg-[#0B111C] focus:bg-[#161F2D] focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                  </div>
                  <button
                    type="button"
                    className="px-3 py-1.5 rounded-xl border border-[#2A3446] bg-[#161F2D] hover:bg-[#0B111C] text-xs font-bold text-[#F1F5F9] flex items-center gap-1 shadow-2xs cursor-pointer"
                  >
                    <Filter className="w-3.5 h-3.5 text-[#97A0B3]" /> Filter
                  </button>
                </div>
              </div>

              {/* Deliverable Cards Grid with Empty State */}
              {filteredDeliverables.length === 0 ? (
                <div className="py-12 border border-dashed border-[#2A3446] rounded-2xl text-center space-y-2">
                  <CheckCircle2 className="size-8 text-[#97A0B3] mx-auto opacity-40" />
                  <p className="text-sm font-bold text-white">No Deliverables in Queue</p>
                  <p className="text-xs text-[#97A0B3]">No active deliverables requiring attention for this client.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
                  {filteredDeliverables.map((deliv) => (
                  <div
                    key={deliv.id}
                    className="bg-[#161F2D] rounded-3xl border border-[#2A3446] shadow-[0_2px_15px_rgba(0,0,0,0.03)] p-5 space-y-4 flex flex-col justify-between hover:shadow-lg hover:border-[#7FA0D6]/30 transition-all"
                  >
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider border ${deliv.statusColor}`}>
                          {deliv.status}
                        </span>
                        <span className="text-[10px] font-mono text-[#97A0B3] font-bold">{deliv.code}</span>
                      </div>

                      <div>
                        <h4 className="text-sm font-black text-white leading-snug">{deliv.title}</h4>
                        <p className="text-[11px] text-[#97A0B3] mt-1 line-clamp-2 leading-relaxed">
                          {deliv.description}
                        </p>
                      </div>

                      <div className="p-3 bg-[#0B111C]/70 rounded-2xl space-y-1.5 text-[11px] text-[#F1F5F9] border border-[#2A3446]">
                        <div className="flex justify-between">
                          <span className="text-[#97A0B3]">Format:</span>
                          <span className="font-bold text-white">{deliv.format}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-[#97A0B3]">Due Date:</span>
                          <span className="font-bold text-rose-600">{deliv.dueDate}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-[#97A0B3]">Assigned:</span>
                          <span className="font-semibold text-white">{deliv.assignedTo}</span>
                        </div>
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="space-y-2 pt-2 border-t border-[#2A3446]">
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
                            className="w-full py-2 rounded-xl border border-[#2A3446] hover:bg-[#0B111C] text-[#F1F5F9] text-xs font-bold flex items-center justify-center gap-1 cursor-pointer transition-colors"
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
                            className="w-full py-2 rounded-xl bg-[#7FA0D6]/15 hover:bg-[#7FA0D6]/20 text-[#7FA0D6] text-xs font-bold flex items-center justify-center gap-1 cursor-pointer transition-colors"
                          >
                            <Eye className="w-3.5 h-3.5" /> Preview Canvas
                          </button>
                          <button
                            type="button"
                            onClick={() => showToast(`Revision request sent for "${deliv.title}".`)}
                            className="w-full py-2 rounded-xl border border-[#2A3446] hover:bg-[#0B111C] text-[#F1F5F9] text-xs font-bold cursor-pointer transition-colors"
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
                            className="w-full py-1.5 text-center text-[11px] font-bold text-[#97A0B3] hover:text-white cursor-pointer"
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
                              className="w-full py-2 rounded-xl border border-[#2A3446] hover:bg-[#0B111C] text-[#F1F5F9] text-xs font-bold flex items-center justify-center gap-1 cursor-pointer transition-colors"
                            >
                              <Edit3 className="w-3.5 h-3.5" /> Notes
                            </button>
                          </div>
                          <button
                            type="button"
                            onClick={() => setPreviewDeliverable(deliv)}
                            className="w-full py-1.5 text-center text-[11px] font-bold text-[#7FA0D6] hover:underline cursor-pointer flex items-center justify-center gap-1"
                          >
                            <FileText className="w-3.5 h-3.5" /> Open Full Presentation
                          </button>
                        </div>
                      )}

                      {deliv.actions.some((a) => a.includes("Preview Video Draft")) && (
                        <button
                          type="button"
                          onClick={() => setPreviewDeliverable(deliv)}
                          className="w-full py-1.5 text-center text-[11px] font-bold text-[#7FA0D6] hover:underline cursor-pointer flex items-center justify-center gap-1"
                        >
                          <Play className="w-3 h-3 fill-blue-600" /> Preview Video Draft (0:45)
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

        {/* ═════════════════════════════════════════════════════════════════
            MODALS
        ═════════════════════════════════════════════════════════════════ */}

        {/* 1. Edit Profile Modal */}
        {isEditProfileOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
            <div className="bg-[#161F2D] rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-4 border border-[#2A3446]">
              <div className="flex items-center justify-between border-b border-[#2A3446] pb-3">
                <h3 className="text-base font-black text-white">Edit Client Profile: {activeClient?.name}</h3>
                <button type="button" onClick={() => setIsEditProfileOpen(false)} className="p-1 text-[#97A0B3] hover:text-[#F1F5F9] rounded-lg">
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="space-y-3 text-xs text-[#F1F5F9]">
                <div>
                  <label className="block font-bold mb-1">Company / Brand Name</label>
                  <input type="text" defaultValue={activeClient?.name} className="w-full px-3 py-2 rounded-xl border border-[#2A3446]" />
                </div>
                <div>
                  <label className="block font-bold mb-1">Industry / Category</label>
                  <input type="text" defaultValue={activeClient?.industry} className="w-full px-3 py-2 rounded-xl border border-[#2A3446]" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold mb-1">Primary Signer</label>
                    <input type="text" defaultValue={activeClient?.contact.name} className="w-full px-3 py-2 rounded-xl border border-[#2A3446]" />
                  </div>
                  <div>
                    <label className="block font-bold mb-1">Signer Email</label>
                    <input type="email" defaultValue={activeClient?.contact.email} className="w-full px-3 py-2 rounded-xl border border-[#2A3446]" />
                  </div>
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-2 border-t border-[#2A3446]">
                <button type="button" onClick={() => setIsEditProfileOpen(false)} className="px-4 py-2 rounded-xl border text-xs font-bold text-[#F1F5F9] hover:bg-[#0B111C] cursor-pointer">
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
            <div className="bg-[#161F2D] rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4 border border-[#2A3446]">
              <div className="flex items-center justify-between border-b border-[#2A3446] pb-3">
                <h3 className="text-base font-black text-white">Current Retainer Invoice</h3>
                <button type="button" onClick={() => setIsInvoiceModalOpen(false)} className="p-1 text-[#97A0B3] hover:text-[#F1F5F9] rounded-lg">
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="p-4 bg-[#0B111C] rounded-2xl space-y-2 text-xs text-[#F1F5F9] border border-[#2A3446]">
                <div className="flex justify-between">
                  <span className="text-[#97A0B3]">Invoice ID:</span>
                  <span className="font-mono font-bold text-white">INV-2024-NL-11</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#97A0B3]">Client:</span>
                  <span className="font-bold text-white">{activeClient?.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#97A0B3]">Billing Cycle:</span>
                  <span className="font-medium text-white">Nov 1 – Nov 30, 2024</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#97A0B3]">Payment Status:</span>
                  <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 font-bold text-[10px]">
                    PAID (ACH)
                  </span>
                </div>
                <div className="flex justify-between pt-2 border-t border-[#2A3446] font-black text-sm">
                  <span>Total Amount:</span>
                  <span className="text-[#7FA0D6]">₹{activeClient?.monthlyFee.toLocaleString()}.00</span>
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
            <div className="bg-[#161F2D] rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4 border border-[#2A3446]">
              <div className="flex items-center justify-between border-b border-[#2A3446] pb-3">
                <div>
                  <h3 className="text-base font-black text-white">New Content Request</h3>
                  <p className="text-xs text-[#97A0B3]">Submitting to {activeClient?.pod.name} for {activeClient?.name}</p>
                </div>
                <button type="button" onClick={() => setIsNewRequestOpen(false)} className="p-1 text-[#97A0B3] hover:text-[#F1F5F9] rounded-lg">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleCreateRequest} className="space-y-3.5">
                <div>
                  <label className="block text-xs font-bold text-[#F1F5F9] mb-1">Asset Title</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Q4 Executive Product Video Hook"
                    value={newRequestForm.title}
                    onChange={(e) => setNewRequestForm({ ...newRequestForm, title: e.target.value })}
                    className="w-full px-3.5 py-2 rounded-xl border border-[#2A3446] text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-[#F1F5F9] mb-1">Deliverable Type</label>
                    <select
                      value={newRequestForm.type}
                      onChange={(e) => setNewRequestForm({ ...newRequestForm, type: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl border border-[#2A3446] text-xs font-medium"
                    >
                      <option value="Reel">🎬 Reel / Short</option>
                      <option value="Carousel">🎨 Carousel (3-5 slides)</option>
                      <option value="Static Post">🖼️ Static Hero Graphic</option>
                      <option value="Deck">📊 Presentation Deck</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-[#F1F5F9] mb-1">Priority</label>
                    <select
                      value={newRequestForm.priority}
                      onChange={(e) => setNewRequestForm({ ...newRequestForm, priority: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl border border-[#2A3446] text-xs font-medium"
                    >
                      <option value="Standard">Standard (3-4 Days)</option>
                      <option value="Expedited">Expedited (48 Hours)</option>
                      <option value="Urgent">Urgent (24 Hours)</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#F1F5F9] mb-1">Creative Brief Notes</label>
                  <textarea
                    rows={3}
                    placeholder="Specify key talking points, hooks, or assets to reference..."
                    value={newRequestForm.notes}
                    onChange={(e) => setNewRequestForm({ ...newRequestForm, notes: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-[#2A3446] text-xs focus:outline-none"
                  />
                </div>

                <div className="flex justify-end gap-2 pt-2 border-t border-[#2A3446]">
                  <button
                    type="button"
                    onClick={() => setIsNewRequestOpen(false)}
                    className="px-4 py-2 rounded-xl border border-[#2A3446] text-xs font-bold text-[#F1F5F9] hover:bg-[#0B111C] cursor-pointer"
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
            <div className="bg-[#161F2D] rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-4 border border-[#2A3446]">
              <div className="flex items-center justify-between border-b border-[#2A3446] pb-3">
                <div>
                  <span className="text-[10px] font-mono text-[#97A0B3] font-bold">{previewDeliverable.code}</span>
                  <h3 className="text-base font-black text-white">{previewDeliverable.title}</h3>
                </div>
                <button type="button" onClick={() => setPreviewDeliverable(null)} className="p-1 text-[#97A0B3] hover:text-[#F1F5F9] rounded-lg">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="aspect-video bg-[#0B111C] rounded-2xl flex flex-col items-center justify-center text-white p-6 relative overflow-hidden shadow-inner">
                <div className="w-14 h-14 rounded-full bg-[#161F2D]/20 backdrop-blur-md flex items-center justify-center text-white mb-2 cursor-pointer hover:scale-110 transition-transform">
                  <Play className="w-6 h-6 fill-white ml-0.5" />
                </div>
                <span className="text-xs font-bold text-gray-200">{previewDeliverable.format} Preview</span>
                <span className="text-[10px] text-[#97A0B3] mt-0.5">Assigned Specialist: {previewDeliverable.assignedTo}</span>
              </div>

              <div className="p-3.5 bg-[#0B111C] rounded-2xl text-xs text-[#F1F5F9] space-y-1">
                <div><strong>Creative Scope:</strong> {previewDeliverable.description}</div>
                <div><strong>Target Delivery:</strong> {previewDeliverable.dueDate}</div>
              </div>

              <div className="flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setPreviewDeliverable(null)}
                  className="px-4 py-2 rounded-xl border border-[#2A3446] text-xs font-bold text-[#F1F5F9] hover:bg-[#0B111C] cursor-pointer"
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

        {/* 5. Cancel Client Plan & Remove Retainer Modal */}
        {isCancelClientModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-md p-4 animate-fade-in">
            <div className="bg-[#161F2D] rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4 border border-rose-500/40">
              <div className="flex items-center justify-between border-b border-[#2A3446] pb-3">
                <div className="flex items-center gap-2">
                  <Trash2 className="w-5 h-5 text-rose-500" />
                  <h3 className="text-base font-black text-white">Cancel Plan & Remove Client</h3>
                </div>
                <button type="button" onClick={() => setIsCancelClientModalOpen(false)} className="p-1 text-[#97A0B3] hover:text-[#F1F5F9] rounded-lg">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-3 text-xs text-[#F1F5F9]">
                <p className="text-[#97A0B3] leading-relaxed">
                  Are you sure you want to cancel the retainer plan for <strong className="text-white">{activeClient?.name}</strong>?
                </p>
                <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-2xl text-rose-300 font-semibold space-y-1">
                  <div>• Monthly Retainer: ₹{activeClient?.monthlyFee.toLocaleString()}/mo</div>
                  <div>• Status: CANCELLED (Plan & Access Revoked)</div>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-[#2A3446]">
                <button
                  type="button"
                  onClick={() => setIsCancelClientModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-[#2A3446] text-xs font-bold text-[#F1F5F9] hover:bg-[#0B111C] cursor-pointer"
                >
                  Keep Active
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (activeClient) {
                      activeClient.status = "CANCELLED";
                    }
                    showToast(`Cancelled plan & removed ${activeClient?.name} from active retainers.`);
                    setIsCancelClientModalOpen(false);
                    setSelectedClientId(null);
                  }}
                  className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shadow-md cursor-pointer"
                >
                  Confirm Cancellation
                </button>
              </div>
            </div>
          </div>
        )}

        {/* 6. Onboard New Client Modal */}
        {isOnboardClientModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-md p-4 animate-fade-in">
            <div className="bg-[#161F2D] rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4 border border-[#2A3446]">
              <div className="flex items-center justify-between border-b border-[#2A3446] pb-3">
                <div className="flex items-center gap-2">
                  <Plus className="w-5 h-5 text-[#7FA0D6]" />
                  <h3 className="text-base font-black text-white">Onboard New Client</h3>
                </div>
                <button type="button" onClick={() => setIsOnboardClientModalOpen(false)} className="p-1 text-[#97A0B3] hover:text-[#F1F5F9] rounded-lg">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  const trimmedName = newClientNameInput.trim();
                  if (!trimmedName) return;

                  const newId = trimmedName.toLowerCase().replace(/[^a-z0-9]/g, "-") || `client-${Date.now()}`;
                  const words = trimmedName.split(/\s+/).filter(Boolean);
                  const firstLetter = words[0]?.[0] || "";
                  const secondLetter = words[1]?.[0] || "";
                  const initials = (firstLetter && secondLetter)
                    ? (firstLetter + secondLetter).toUpperCase() 
                    : trimmedName.slice(0, 2).toUpperCase();

                  const newClientObj: ClientDetailData = {
                    id: newId,
                    name: trimmedName,
                    initials,
                    industry: newClientIndustryInput.trim() || "DTC E-Commerce & Retail",
                    timezone: "Client Time: IST (UTC+5:30)",
                    activeSince: "Active since Oct 2026",
                    tier: "Growth Retainer",
                    tierBadge: "GROWTH RETAINER",
                    status: "ACTIVE RETAINER",
                    monthlyFee: 45000,
                    addon: "Add-on: Creative Pod",
                    nextBilling: "Nov 1, 2026",
                    billingMethod: "Direct ACH / Razorpay",
                    totalAssetsDelivered: 0,
                    totalAssetsQuota: 20,
                    postsDelivered: 0,
                    postsQuota: 8,
                    reelsDelivered: 0,
                    reelsQuota: 4,
                    storiesDelivered: 0,
                    storiesQuota: 8,
                    sprintNumber: 44,
                    daysRemainingInSprint: 14,
                    contact: {
                      name: `${trimmedName} Executive`,
                      title: "Primary Account Owner",
                      email: `${newId}@clientbrand.com`,
                      phone: "+91 98401 99887",
                      renewedDate: "Oct 1, 2026",
                      termMonths: 12,
                    },
                    brand: {
                      kitVersion: "Design Kit v1.0",
                      headingsFont: "Plus Jakarta Sans",
                      bodyFont: "Inter Sans",
                      monoFont: "JetBrains Mono",
                      toneSummary: `Dynamic, high-impact social media creatives engineered for ${trimmedName}. High-clarity typography with conversion-optimized video hooks.`,
                      toneTags: ["High Conversion", "Brand Growth", "Active Retainer"],
                      colors: [
                        { name: "Primary Deep Navy", hex: "#0B111C" },
                        { name: "Accent Royal Blue", hex: "#7FA0D6" },
                        { name: "Cyan Highlight", hex: "#7FA0D6" },
                        { name: "Clean Neutral", hex: "#F8FAFC", isLight: true },
                      ],
                      social: {
                        handle: `@${newId}`,
                        followers: "API Connected",
                        status: "API CONNECTED",
                        syncInterval: "15m refresh",
                      },
                      brandVaultLink: `${trimmedName} Brand Drive`,
                      figmaLink: `${trimmedName} Master Design Kit`,
                      lastAuditDate: "Just Now",
                    },
                    pod: {
                      name: newClientPodInput.split(" ")[0] || "Pod A",
                      tagline: "Creative & Brand Strategy",
                      leadName: "Alex Rivera",
                      leadTitle: "Lead Producer",
                      leadAvatar: "AR",
                      squad: [
                        { name: "Production Squad", role: "Creative Specialist", hoursPerWeek: 32, avatar: "PS" },
                      ],
                      capacityAllocatedHrs: 32,
                      bandwidthPercent: 80,
                      dailySyncTime: "11:00 AM IST",
                    },
                    deliverables: [],
                  };

                  setCustomClients((prev) => ({ ...prev, [newId]: newClientObj }));
                  showToast(`Successfully onboarded client "${trimmedName}"!`);
                  setIsOnboardClientModalOpen(false);
                  setNewClientNameInput("");
                  setNewClientIndustryInput("");
                }}
                className="space-y-3.5 text-xs"
              >
                <div>
                  <label className="block font-bold text-[#F1F5F9] mb-1">Client / Brand Name</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Acme Corp"
                    value={newClientNameInput}
                    onChange={(e) => setNewClientNameInput(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-xl border border-[#2A3446] bg-[#0B111C] text-xs font-medium text-white focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block font-bold text-[#F1F5F9] mb-1">Industry / Category</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. DTC E-Commerce & Retail"
                    value={newClientIndustryInput}
                    onChange={(e) => setNewClientIndustryInput(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-xl border border-[#2A3446] bg-[#0B111C] text-xs font-medium text-white focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block font-bold text-[#F1F5F9] mb-1">Assigned Creative Pod</label>
                  <select
                    value={newClientPodInput}
                    onChange={(e) => setNewClientPodInput(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-[#2A3446] text-xs font-bold bg-[#0B111C] text-white"
                  >
                    <option value="Pod A (Creative & Brand Strategy)">Pod A (Creative & Brand Strategy)</option>
                    <option value="Pod B (Performance & Video Ops)">Pod B (Performance & Video Ops)</option>
                    <option value="Pod C (3D Motion & Visual Design)">Pod C (3D Motion & Visual Design)</option>
                  </select>
                </div>

                <div className="flex justify-end gap-2 pt-2 border-t border-[#2A3446]">
                  <button
                    type="button"
                    onClick={() => setIsOnboardClientModalOpen(false)}
                    className="px-4 py-2 rounded-xl border border-[#2A3446] text-xs font-bold text-[#F1F5F9] hover:bg-[#0B111C] cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-sm cursor-pointer"
                  >
                    Onboard Client
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* 7. Remove Client Modal */}
        {isRemoveClientModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-md p-4 animate-fade-in">
            <div className="bg-[#161F2D] rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4 border border-rose-500/40">
              <div className="flex items-center justify-between border-b border-[#2A3446] pb-3">
                <div className="flex items-center gap-2">
                  <Trash2 className="w-5 h-5 text-rose-500" />
                  <h3 className="text-base font-black text-white">Remove / Offboard Client</h3>
                </div>
                <button type="button" onClick={() => setIsRemoveClientModalOpen(false)} className="p-1 text-[#97A0B3] hover:text-[#F1F5F9] rounded-lg">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-3.5 text-xs">
                <div>
                  <label className="block font-bold text-[#F1F5F9] mb-1">Select Client to Remove</label>
                  <select
                    value={clientToRemoveInput}
                    onChange={(e) => setClientToRemoveInput(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-[#2A3446] text-xs font-bold bg-[#0B111C] text-white"
                  >
                    {clientList.map((client) => (
                      <option key={client.id} value={client.name}>
                        {client.name} ({client.industry})
                      </option>
                    ))}
                  </select>
                </div>

                <p className="text-[#97A0B3] text-[11px] leading-relaxed">
                  Offboarding <strong className="text-white">{clientToRemoveInput}</strong> will archive their active retainer and release assigned pod capacity back to the roster.
                </p>

                <div className="flex justify-end gap-2 pt-2 border-t border-[#2A3446]">
                  <button
                    type="button"
                    onClick={() => setIsRemoveClientModalOpen(false)}
                    className="px-4 py-2 rounded-xl border border-[#2A3446] text-xs font-bold text-[#F1F5F9] hover:bg-[#0B111C] cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const targetName = clientToRemoveInput.trim();
                      if (!targetName) return;

                      const foundClient = clientList.find(
                        (c) => c.name.toLowerCase() === targetName.toLowerCase() || c.id.toLowerCase() === targetName.toLowerCase()
                      );

                      const idsToRemove = foundClient 
                        ? [foundClient.id.toLowerCase(), foundClient.name.toLowerCase(), (foundClient.contact?.email || "").toLowerCase()]
                        : [targetName.toLowerCase()];

                      setRemovedClientIds((prev) => {
                        const next = new Set(prev);
                        idsToRemove.forEach((id) => next.add(id));
                        return next;
                      });

                      if (selectedClientId && foundClient && foundClient.id === selectedClientId) {
                        setSelectedClientId(null);
                      }

                      showToast(`Successfully offboarded client "${targetName}".`);
                      setIsRemoveClientModalOpen(false);
                    }}
                    className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shadow-md cursor-pointer"
                  >
                    Remove Client
                  </button>
                </div>
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

  const [deliverablesList, setDeliverablesList] = useState<any[]>([]);

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

  const { data: podData } = useQuery({
    queryKey: ["pod_dashboard"],
    queryFn: () => fetchPodDashboard(),
    staleTime: 0,
    refetchOnMount: "always",
  });

  useEffect(() => {
    if (podData?.tasks) {
      const allTasks = [
        ...(podData.tasks.backlog || []),
        ...(podData.tasks.in_production || []),
        ...(podData.tasks.internal_qa || []),
        ...(podData.tasks.client_review || []),
        ...(podData.tasks.ready_to_publish || []),
        ...(podData.tasks.completed || []),
      ];
      const mapped = allTasks.map((t: any) => ({
        id: t.id,
        assetCode: t.id ? t.id.slice(0, 8) : "DEL-00",
        title: t.title || "Deliverable",
        client: t.client_name || "Client",
        pod: t.pod_name || "Pod Alpha",
        status: t.status,
        statusLabel: (t.status || "").replace("_", " ").toUpperCase(),
        statusBadge: "bg-[#161F2D] text-[#7FA0D6] border-[#2A3446]",
        formatType: t.type || "Reels",
        formatLabel: t.type || "Reels",
        previewUrl: t.file_url || null,
        assigneeName: t.assignee_name || "Specialist",
        assigneeAvatar: t.assignee_name ? t.assignee_name.slice(0, 2).toUpperCase() : "SP",
        dueDate: t.due_date || "Today",
        slaType: "active",
        slaText: "On Track",
        slaColor: "text-emerald-400 font-bold",
      }));
      setDeliverablesList(mapped);
    }
  }, [podData]);

  const movedToProductionCount = deliverablesList.filter(
    (d) => d.status === "in_production" || d.status === "in_progress" || d.status === "backlog"
  ).length;

  const pendingReviewCount = deliverablesList.filter(
    (d) => d.status === "internal_qa" || d.status === "client_review" || d.status === "in_review"
  ).length;

  const approvedTodayCount = deliverablesList.filter(
    (d) => d.status === "ready_to_publish" || d.status === "approved" || d.status === "completed"
  ).length;

  const declinedCount = deliverablesList.filter(
    (d) => d.status === "declined" || d.status === "rejected" || d.status === "revision_requested"
  ).length;

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
    <div data-surface="ops" className="w-full min-h-screen font-sans bg-[#0B111C] flex flex-col">
      <AdminTopHeader activeTab="Content Engine" />
      <main className="flex-1 px-6 lg:px-8 pt-4 pb-16 max-w-[1500px] w-full mx-auto space-y-6">
        {/* Toast Notification */}
        {toastMessage && (
          <div className="fixed top-24 right-8 z-50 bg-[#0B111C] text-white px-5 py-3 rounded-2xl shadow-2xl text-xs font-bold flex items-center gap-2.5 animate-bounce">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <span>{toastMessage}</span>
          </div>
        )}

        {/* 4 KPI Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="kpi-card bg-[#161F2D] rounded-3xl p-5 border-2 border-[#161F2D] hover:border-[#BCCCE6] transition-all shadow-[0_2px_15px_rgba(0,0,0,0.03)] space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black text-[#97A0B3] uppercase tracking-wider">
                MOVED TO PRODUCTION
              </span>
              <div className="w-7 h-7 rounded-xl bg-[#7FA0D6]/15 text-[#7FA0D6] flex items-center justify-center font-bold">
                <Zap className="w-3.5 h-3.5" />
              </div>
            </div>
            <div className="text-3xl font-black text-white tracking-tight">{movedToProductionCount}</div>
            <div className="text-xs font-bold text-emerald-400 flex items-center gap-1">
              {movedToProductionCount === 0 ? "0 active in production" : `${movedToProductionCount} active tasks`}
            </div>
          </div>

          <div className="kpi-card bg-[#161F2D] rounded-3xl p-5 border-2 border-[#161F2D] hover:border-[#BCCCE6] transition-all shadow-[0_2px_15px_rgba(0,0,0,0.03)] space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black text-[#97A0B3] uppercase tracking-wider">
                PENDING REVIEW
              </span>
              <div className="w-7 h-7 rounded-xl bg-amber-500/15 text-amber-400 flex items-center justify-center font-bold">
                <Clock className="w-3.5 h-3.5" />
              </div>
            </div>
            <div className="text-3xl font-black text-white tracking-tight">{pendingReviewCount}</div>
            <div className="text-xs font-bold text-amber-400 flex items-center gap-1">
              {pendingReviewCount === 0 ? "0 awaiting review" : `${pendingReviewCount} in QA / review`}
            </div>
          </div>

          <div className="kpi-card bg-[#161F2D] rounded-3xl p-5 border-2 border-[#161F2D] hover:border-[#BCCCE6] transition-all shadow-[0_2px_15px_rgba(0,0,0,0.03)] space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black text-[#97A0B3] uppercase tracking-wider">
                APPROVED TODAY
              </span>
              <div className="w-7 h-7 rounded-xl bg-emerald-500/15 text-emerald-400 flex items-center justify-center font-bold">
                <CheckCircle2 className="w-3.5 h-3.5" />
              </div>
            </div>
            <div className="text-3xl font-black text-white tracking-tight">{approvedTodayCount}</div>
            <div className="text-xs font-bold text-emerald-400 flex items-center gap-1">
              {approvedTodayCount === 0 ? "0 approved today" : `${approvedTodayCount} approved deliverables`}
            </div>
          </div>

          <div className="kpi-card bg-[#161F2D] rounded-3xl p-5 border-2 border-[#161F2D] hover:border-[#BCCCE6] transition-all shadow-[0_2px_15px_rgba(0,0,0,0.03)] space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black text-[#97A0B3] uppercase tracking-wider">
                DECLINED / REVISE
              </span>
              <div className="w-7 h-7 rounded-xl bg-rose-500/15 text-rose-400 flex items-center justify-center font-bold">
                <AlertTriangle className="w-3.5 h-3.5" />
              </div>
            </div>
            <div className="text-3xl font-black text-white tracking-tight">{declinedCount}</div>
            <div className="text-xs font-bold text-rose-400 flex items-center gap-1">
              {declinedCount === 0 ? "0 revision requests" : `${declinedCount} requiring revision`}
            </div>
          </div>
        </div>

        {/* Filter Bar */}
        <div className="bg-[#161F2D] rounded-2xl p-4 border border-[#2A3446] shadow-[0_2px_12px_rgba(0,0,0,0.02)] flex flex-wrap items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#97A0B3]" />
              <input
                type="text"
                placeholder="Search deliverables, code, tags..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 pr-4 py-2 w-72 rounded-xl border border-[#2A3446] bg-[#161F2D] text-xs font-medium focus:outline-none focus:ring-2 focus:ring-blue-500/20 shadow-2xs"
              />
            </div>

            <CustomSelect
              value={selectedClient}
              onChange={setSelectedClient}
              ariaLabel="Filter Deliverable Client"
              options={[
                { value: "all", label: "All Clients" },
                { value: "Ryze", label: "Ryze" },
                { value: "Aravindan", label: "Aravindan" },
                { value: "Shanmugaraj", label: "Shanmugaraj" },
                { value: "Luma", label: "Luma Global" },
              ]}
            />

            <CustomSelect
              value={statusFilter}
              onChange={setStatusFilter}
              ariaLabel="Filter Deliverable Status"
              options={[
                { value: "all", label: "All Statuses" },
                { value: "in_review", label: "In Review" },
                { value: "in_production", label: "In Production" },
                { value: "approved", label: "Approved" },
              ]}
            />

            <CustomSelect
              value={selectedFormat}
              onChange={setSelectedFormat}
              ariaLabel="Filter Deliverable Format Type"
              options={[
                { value: "all", label: "All Formats" },
                { value: "3d", label: "3D Render" },
                { value: "deck", label: "Presentation Deck" },
                { value: "photo", label: "Photo Retouching" },
                { value: "video", label: "Short-form Video" },
                { value: "banner", label: "Ad Banner Set" },
                { value: "interactive", label: "WebGL Interactive" },
              ]}
            />
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-[#97A0B3]">
              Showing {filteredDeliverables.length} deliverables
            </span>
          </div>
        </div>

        {/* 3-Column Deliverables Grid or Empty State */}
        {filteredDeliverables.length === 0 ? (
          <div className="bg-[#161F2D] rounded-3xl border border-[#2A3446] p-12 text-center text-[#97A0B3] space-y-3">
            <Layers className="w-10 h-10 text-[#2A3446] mx-auto" />
            <h3 className="text-base font-bold text-white">No deliverables in queue</h3>
            <p className="text-xs text-[#97A0B3] max-w-sm mx-auto">
              Creative pod sprints will automatically submit finished reels, brand assets, and creative packages here for admin review.
            </p>
          </div>
        ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredDeliverables.map((item) => (
            <div
              key={item.id}
              className="bg-[#161F2D] rounded-3xl border border-[#2A3446] shadow-[0_4px_25px_rgba(0,0,0,0.03)] hover:shadow-[0_8px_30px_rgba(0,0,0,0.06)] transition-all overflow-hidden flex flex-col justify-between"
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
                      <div className="text-xs font-black text-white leading-tight">
                        {item.client}
                      </div>
                      <div className="text-[10px] font-bold text-[#97A0B3]">
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
                <h3 className="text-sm font-black text-white line-clamp-2 mb-1.5">
                  {item.title}
                </h3>
                <p className="text-[11px] font-semibold text-[#97A0B3] flex items-center gap-1.5">
                  <Tag className="w-3 h-3 text-[#97A0B3]" />
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
                  <span className="px-4 py-2 bg-[#161F2D]/90 backdrop-blur-md rounded-xl text-xs font-black text-white shadow-xl flex items-center gap-1.5">
                    <Eye className="w-3.5 h-3.5 text-[#7FA0D6]" /> Quick Preview
                  </span>
                </div>
              </div>

              {/* Card Meta & Actions */}
              <div className="p-5 pt-4 space-y-3.5">
                {/* Pod & Retainer Info */}
                <div className="flex items-center justify-between text-xs pt-1 border-t border-gray-50">
                  <div className="flex items-center gap-1.5">
                    <span className="font-bold text-[#97A0B3] text-[10px] uppercase">
                      Pod:
                    </span>
                    <span className="px-2 py-0.5 rounded-md bg-[#7FA0D6]/15 text-[#7FA0D6] text-[11px] font-black">
                      {item.pod} ({item.podLead})
                    </span>
                  </div>
                  <span className="text-[11px] font-bold text-[#97A0B3]">
                    {item.retainer}
                  </span>
                </div>

                {/* SLA Target / Status */}
                <div className="flex items-center justify-between text-xs bg-[#0B111C]/80 p-2.5 rounded-xl border border-[#2A3446]">
                  <span className={`text-[11px] ${item.slaColor}`}>
                    {item.slaText}
                  </span>
                  <button
                    type="button"
                    onClick={() => setCommentModalItem(item)}
                    className="text-[#97A0B3] hover:text-[#7FA0D6] text-[11px] font-bold flex items-center gap-1 cursor-pointer"
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
                    className="flex-1 py-2.5 bg-[#161F2D] hover:bg-rose-50 text-[#F1F5F9] hover:text-rose-600 rounded-xl text-xs font-bold transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5 stroke-[2.5]" /> Request Edit
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
        )}

        {/* Media Preview Modal */}
        {previewItem && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-fade-in">
            <div className="bg-[#161F2D] rounded-3xl max-w-3xl w-full p-6 shadow-2xl space-y-4 border border-[#2A3446] max-h-[90vh] overflow-y-auto">
              <div className="flex items-start justify-between border-b border-[#2A3446] pb-3">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="px-2.5 py-0.5 rounded-full bg-[#7FA0D6]/15 text-[#7FA0D6] text-[10px] font-black uppercase">
                      {previewItem.assetCode}
                    </span>
                    <span className="text-xs font-bold text-[#97A0B3]">
                      {previewItem.client}
                    </span>
                  </div>
                  <h2 className="text-lg font-black text-white">{previewItem.title}</h2>
                </div>
                <button
                  type="button"
                  onClick={() => setPreviewItem(null)}
                  className="p-1.5 rounded-xl hover:bg-[#161F2D] text-[#97A0B3] hover:text-white cursor-pointer"
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

              <div className="p-4 bg-[#0B111C] rounded-2xl space-y-2 text-xs">
                <div className="font-bold text-white">Deliverable Blueprint:</div>
                <p className="text-[#F1F5F9] leading-relaxed">{previewItem.description}</p>
                <div className="flex flex-wrap gap-4 pt-2 text-[11px] text-[#97A0B3] border-t border-[#2A3446]">
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
                  className="px-4 py-2 rounded-xl bg-[#161F2D] hover:bg-rose-50 text-[#F1F5F9] hover:text-rose-600 text-xs font-bold cursor-pointer"
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
            <div className="bg-[#161F2D] rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4 border border-[#2A3446]">
              <div className="flex items-center justify-between border-b border-[#2A3446] pb-3">
                <div className="flex items-center gap-2">
                  <MessageSquare className="w-4 h-4 text-[#7FA0D6]" />
                  <h3 className="text-sm font-black text-white">
                    Production Notes & Feedback
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => setCommentModalItem(null)}
                  className="p-1 rounded-lg text-[#97A0B3] hover:text-[#F1F5F9] cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-3">
                <div className="p-3 bg-[#0B111C] rounded-2xl border border-[#2A3446] space-y-1">
                  <div className="flex items-center justify-between text-[10px] font-bold text-[#97A0B3]">
                    <span>David K. (Client Lead)</span>
                    <span>Today 10:45 AM</span>
                  </div>
                  <p className="text-xs text-[#F1F5F9] leading-relaxed font-medium">
                    "Typography and layout look crisp. Please ensure the hex code for brand teal matches #7FA0D6."
                  </p>
                </div>
                <div className="p-3 bg-[#7FA0D6]/15/50 rounded-2xl border border-[#7FA0D6]/30 space-y-1">
                  <div className="flex items-center justify-between text-[10px] font-bold text-[#7FA0D6]">
                    <span>Elena Rostova (Pod A)</span>
                    <span>Today 2:15 PM</span>
                  </div>
                  <p className="text-xs text-[#F1F5F9] leading-relaxed font-medium">
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
    client: "Ryze Mushroom Coffee",
    pod: "Pod A",
    category: "3D Render / Blender",
    sp: 4,
    dueDate: "Tomorrow",
    priority: "High",
    assignee: "Vikram Malhotra",
    column: "todo",
  });

  const [kanbanTasks, setKanbanTasks] = useState<any[]>([
    {
      id: "task-101",
      column: "in_progress",
      client: "Ryze Mushroom Coffee",
      clientPill: "bg-[#7FA0D6]/15 text-[#7FA0D6] border-[#7FA0D6]/30",
      priority: "Urgent",
      priorityPill: "bg-rose-600 text-white font-black",
      title: "3D Product Render & Motion Hook (15s Reel)",
      type: "3D Render / Blender",
      avatar: "VM",
      avatarBg: "bg-blue-600",
      assigneeName: "Vikram Malhotra",
      sp: 8,
      due: "Today, 6:00 PM",
      pod: "Pod A",
    },
    {
      id: "task-102",
      column: "todo",
      client: "Ryze Mushroom Coffee",
      clientPill: "bg-[#7FA0D6]/15 text-[#7FA0D6] border-[#7FA0D6]/30",
      priority: "High",
      priorityPill: "bg-rose-50 text-rose-600 border-rose-100",
      title: "DTC Ad Hook Variations (15s Reel Clips)",
      type: "Performance Editing",
      avatar: "SC",
      avatarBg: "bg-purple-600",
      assigneeName: "Sarah Connor",
      sp: 5,
      due: "Tomorrow, 2:00 PM",
      pod: "Pod B",
    },
    {
      id: "task-103",
      column: "under_review",
      client: "Acme Corp",
      clientPill: "bg-[#7FA0D6]/15 text-[#7FA0D6] border-[#7FA0D6]/30",
      priority: "High",
      priorityPill: "bg-rose-50 text-rose-600 border-rose-100",
      title: "Instagram Story Templates (1080x1920 Figma Kit)",
      type: "Visual Design",
      avatar: "ER",
      avatarBg: "bg-emerald-600",
      assigneeName: "Elena Rostova",
      sp: 3,
      due: "Oct 5, 2026",
      pod: "Pod A",
    },
    {
      id: "task-104",
      column: "approved",
      client: "Kavya Organics",
      clientPill: "bg-[#7FA0D6]/15 text-[#7FA0D6] border-[#7FA0D6]/30",
      priority: "Normal",
      priorityPill: "bg-[#161F2D] text-[#F1F5F9] border-[#2A3446]",
      title: "Brand Guidelines & Color Palette Audit (v2.0)",
      type: "Brand Strategy",
      avatar: "MB",
      avatarBg: "bg-amber-600",
      assigneeName: "Marcus Brody",
      sp: 4,
      due: "Oct 3, 2026",
      pod: "Pod C",
    },
    {
      id: "task-105",
      column: "in_progress",
      client: "Ryze Mushroom Coffee",
      clientPill: "bg-[#7FA0D6]/15 text-[#7FA0D6] border-[#7FA0D6]/30",
      priority: "High",
      priorityPill: "bg-rose-50 text-rose-600 border-rose-100",
      title: "TikTok Motion Hook (Rec.709 Color Grading)",
      type: "Color Grading",
      avatar: "AR",
      avatarBg: "bg-[#7FA0D6]",
      assigneeName: "Alex Rivera",
      sp: 6,
      due: "Today, 8:00 PM",
      pod: "Pod B",
    },
    {
      id: "task-106",
      column: "todo",
      client: "Acme Corp",
      clientPill: "bg-[#7FA0D6]/15 text-[#7FA0D6] border-[#7FA0D6]/30",
      priority: "Urgent",
      priorityPill: "bg-rose-600 text-white font-black",
      title: "Motion Graphics Carousel Post (5 Slides)",
      type: "Motion Graphics",
      avatar: "VM",
      avatarBg: "bg-blue-600",
      assigneeName: "Vikram Malhotra",
      sp: 4,
      due: "Tomorrow, 11:00 AM",
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
      clientPill: "bg-[#7FA0D6]/15 text-[#7FA0D6] border-[#7FA0D6]/30",
      priority: newTaskForm.priority,
      priorityPill:
        newTaskForm.priority === "Urgent"
          ? "bg-rose-600 text-white font-black"
          : newTaskForm.priority === "High"
          ? "bg-rose-50 text-rose-600 border-rose-100"
          : "bg-[#161F2D] text-[#F1F5F9] border-[#2A3446]",
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
      client: "Ryze",
      pod: "Pod A",
      category: "3D Render / Blender",
      sp: 4,
      dueDate: "Tomorrow",
      priority: "High",
      assignee: "Lead Producer",
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
    <div data-surface="ops" className="w-full min-h-screen font-sans bg-[#0B111C] flex flex-col">
      <AdminTopHeader activeTab="Content Engine" />
      <main className="flex-1 px-6 lg:px-8 pt-4 pb-16 max-w-[1500px] w-full mx-auto space-y-6">
        {/* Header Title and Search Filter Bar */}
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black bg-[#7FA0D6]/15 text-[#7FA0D6] border border-[#7FA0D6]/30">
              <span className="w-2 h-2 rounded-full bg-[#7FA0D6] animate-pulse" />
              Live Sync
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#97A0B3]" />
              <input
                type="text"
                placeholder="Filter deliverables, tags, owners..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 pr-4 py-2 w-64 rounded-xl border border-[#2A3446] bg-[#161F2D] text-xs font-medium focus:outline-none focus:ring-2 focus:ring-blue-500/20 shadow-2xs"
              />
            </div>

            <CustomSelect
              value={selectedPod}
              onChange={setSelectedPod}
              ariaLabel="Filter Task Pod"
              options={[
                { value: "all", label: "All Pods (A, B, C)" },
                { value: "Pod A", label: "Pod A (Brand Strategy)" },
                { value: "Pod B", label: "Pod B (Performance & Video)" },
                { value: "Pod C", label: "Pod C (3D Motion & Design)" },
              ]}
            />

            <CustomSelect
              value={selectedClient}
              onChange={setSelectedClient}
              ariaLabel="Filter Task Client"
              options={[
                { value: "all", label: "All Clients" },
                { value: "Ryze", label: "Ryze Mushroom Coffee" },
              ]}
            />

            <button
              type="button"
              onClick={() => setIsCreateModalOpen(true)}
              className="px-4 py-2 rounded-xl bg-[#7FA0D6] hover:bg-blue-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-sm cursor-pointer transition-colors"
            >
              <Plus className="w-4 h-4 stroke-[3]" /> Create Task
            </button>
          </div>
        </div>

        {/* 4 Kanban Columns */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
          {/* Column 1: TO DO */}
          <div className="bg-[#161F2D]/40 rounded-3xl p-4 flex flex-col space-y-3.5 border border-[#2A3446]/60">
            <div className="flex items-center justify-between px-1">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-slate-400" />
                <h3 className="text-xs font-black text-white tracking-wider uppercase">
                  TO DO
                </h3>
              </div>
              <span className="px-2 py-0.5 rounded-full bg-[#161F2D] text-[#F1F5F9] text-[11px] font-bold border border-[#2A3446] shadow-2xs">
                {todoTasks.length}
              </span>
            </div>

            <div className="space-y-3">
              {todoTasks.map((task) => (
                <div
                  key={task.id}
                  onClick={() => setPreviewTask(task)}
                  className="bg-[#161F2D] rounded-2xl p-4 border border-[#2A3446]/70 shadow-[0_2px_8px_rgba(0,0,0,0.02)] hover:shadow-md transition-all cursor-pointer space-y-2.5"
                >
                  <div className="flex items-center justify-between">
                    <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${task.clientPill}`}>
                      {task.client}
                    </span>
                    <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${task.priorityPill}`}>
                      {task.priority}
                    </span>
                  </div>
                  <h4 className="text-xs font-bold text-white line-clamp-2">{task.title}</h4>
                  {task.imageUrl && (
                    <div className="h-24 rounded-xl overflow-hidden bg-[#161F2D]">
                      <img src={task.imageUrl} alt="" className="w-full h-full object-cover" />
                    </div>
                  )}
                  <div className="flex items-center justify-between pt-2 border-t border-[#2A3446] text-[11px] text-[#97A0B3]">
                    <div className="flex items-center gap-1.5">
                      <div className={`w-5 h-5 rounded-full ${task.avatarBg} text-white font-bold text-[9px] flex items-center justify-center`}>
                        {task.avatar}
                      </div>
                      <span className="font-medium text-[#F1F5F9]">{task.assigneeName}</span>
                    </div>
                    <span className="font-bold text-[#7FA0D6] font-mono">{task.sp} SP</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Column 2: IN PROGRESS */}
          <div className="bg-[#161F2D]/40 rounded-3xl p-4 flex flex-col space-y-3.5 border border-[#2A3446]/60">
            <div className="flex items-center justify-between px-1">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-[#7FA0D6]/150 animate-pulse" />
                <h3 className="text-xs font-black text-white tracking-wider uppercase">
                  IN PROGRESS
                </h3>
              </div>
              <span className="px-2 py-0.5 rounded-full bg-[#161F2D] text-[#7FA0D6] text-[11px] font-bold border border-[#2A3446] shadow-2xs">
                {inProgressTasks.length}
              </span>
            </div>

            <div className="space-y-3">
              {inProgressTasks.map((task) => (
                <div
                  key={task.id}
                  onClick={() => setPreviewTask(task)}
                  className="bg-[#161F2D] rounded-2xl p-4 border border-[#2A3446]/70 shadow-[0_2px_8px_rgba(0,0,0,0.02)] hover:shadow-md transition-all cursor-pointer space-y-2.5"
                >
                  <div className="flex items-center justify-between">
                    <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${task.clientPill}`}>
                      {task.client}
                    </span>
                    <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${task.priorityPill}`}>
                      {task.priority}
                    </span>
                  </div>
                  <h4 className="text-xs font-bold text-white line-clamp-2">{task.title}</h4>
                  {task.imageUrl && (
                    <div className="h-24 rounded-xl overflow-hidden bg-[#161F2D]">
                      <img src={task.imageUrl} alt="" className="w-full h-full object-cover" />
                    </div>
                  )}
                  <div className="flex items-center justify-between pt-2 border-t border-[#2A3446] text-[11px] text-[#97A0B3]">
                    <div className="flex items-center gap-1.5">
                      <div className={`w-5 h-5 rounded-full ${task.avatarBg} text-white font-bold text-[9px] flex items-center justify-center`}>
                        {task.avatar}
                      </div>
                      <span className="font-medium text-[#F1F5F9]">{task.assigneeName}</span>
                    </div>
                    <span className="font-bold text-rose-600">{task.due}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Column 3: UNDER REVIEW */}
          <div className="bg-[#161F2D]/40 rounded-3xl p-4 flex flex-col space-y-3.5 border border-[#2A3446]/60">
            <div className="flex items-center justify-between px-1">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                <h3 className="text-xs font-black text-white tracking-wider uppercase">
                  UNDER REVIEW
                </h3>
              </div>
              <span className="px-2 py-0.5 rounded-full bg-[#161F2D] text-amber-600 text-[11px] font-bold border border-[#2A3446] shadow-2xs">
                {underReviewTasks.length}
              </span>
            </div>

            <div className="space-y-3">
              {underReviewTasks.map((task) => (
                <div
                  key={task.id}
                  onClick={() => setPreviewTask(task)}
                  className="bg-[#161F2D] rounded-2xl p-4 border border-[#2A3446]/70 shadow-[0_2px_8px_rgba(0,0,0,0.02)] hover:shadow-md transition-all cursor-pointer space-y-2.5"
                >
                  <div className="flex items-center justify-between">
                    <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${task.clientPill}`}>
                      {task.client}
                    </span>
                    <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${task.priorityPill}`}>
                      {task.priority}
                    </span>
                  </div>
                  <h4 className="text-xs font-bold text-white line-clamp-2">{task.title}</h4>
                  <div className="flex items-center justify-between pt-2 border-t border-[#2A3446] text-[11px] text-[#97A0B3]">
                    <div className="flex items-center gap-1.5">
                      <div className={`w-5 h-5 rounded-full ${task.avatarBg} text-white font-bold text-[9px] flex items-center justify-center`}>
                        {task.avatar}
                      </div>
                      <span className="font-medium text-[#F1F5F9]">{task.assigneeName}</span>
                    </div>
                    <span className="font-bold text-amber-600">{task.pod}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Column 4: APPROVED */}
          <div className="bg-[#161F2D]/40 rounded-3xl p-4 flex flex-col space-y-3.5 border border-[#2A3446]/60">
            <div className="flex items-center justify-between px-1">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                <h3 className="text-xs font-black text-white tracking-wider uppercase">
                  APPROVED
                </h3>
              </div>
              <span className="px-2 py-0.5 rounded-full bg-[#161F2D] text-emerald-600 text-[11px] font-bold border border-[#2A3446] shadow-2xs">
                {approvedTasks.length}
              </span>
            </div>

            <div className="space-y-3">
              {approvedTasks.map((task) => (
                <div
                  key={task.id}
                  onClick={() => setPreviewTask(task)}
                  className="bg-[#161F2D] rounded-2xl p-4 border border-[#2A3446]/70 shadow-[0_2px_8px_rgba(0,0,0,0.02)] hover:shadow-md transition-all cursor-pointer space-y-2.5"
                >
                  <div className="flex items-center justify-between">
                    <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${task.clientPill}`}>
                      {task.client}
                    </span>
                    <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${task.priorityPill}`}>
                      {task.priority}
                    </span>
                  </div>
                  <h4 className="text-xs font-bold text-white line-clamp-2">{task.title}</h4>
                  {task.imageUrl && (
                    <div className="h-24 rounded-xl overflow-hidden bg-[#161F2D]">
                      <img src={task.imageUrl} alt="" className="w-full h-full object-cover" />
                    </div>
                  )}
                  <div className="flex items-center justify-between pt-2 border-t border-[#2A3446] text-[11px] text-[#97A0B3]">
                    <div className="flex items-center gap-1.5">
                      <div className={`w-5 h-5 rounded-full ${task.avatarBg} text-white font-bold text-[9px] flex items-center justify-center`}>
                        {task.avatar}
                      </div>
                      <span className="font-medium text-[#F1F5F9]">{task.assigneeName}</span>
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
            <div className="bg-[#161F2D] rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-4 border border-[#2A3446]">
              <div className="flex items-center justify-between border-b border-[#2A3446] pb-3">
                <h3 className="text-base font-black text-white">Create Production Task</h3>
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="p-1 rounded-lg text-[#97A0B3] hover:text-[#F1F5F9] cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleCreateTask} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-[#F1F5F9] mb-1">Task Title</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. 3D Hero Animation for Brand Launch"
                    value={newTaskForm.title}
                    onChange={(e) => setNewTaskForm({ ...newTaskForm, title: e.target.value })}
                    className="w-full px-3.5 py-2 rounded-xl border border-[#2A3446] text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-[#F1F5F9] mb-1">Client Brand</label>
                    <select
                      value={newTaskForm.client}
                      onChange={(e) => setNewTaskForm({ ...newTaskForm, client: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl border border-[#2A3446] text-xs font-medium"
                    >
                      <option value="Ryze Mushroom Coffee">Ryze Mushroom Coffee</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-[#F1F5F9] mb-1">Creative Pod</label>
                    <select
                      value={newTaskForm.pod}
                      onChange={(e) => setNewTaskForm({ ...newTaskForm, pod: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl border border-[#2A3446] text-xs font-medium"
                    >
                      <option value="Pod A">Pod A (Brand Strategy)</option>
                      <option value="Pod B">Pod B (Performance &amp; Video)</option>
                      <option value="Pod C">Pod C (3D Motion &amp; Design)</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-[#F1F5F9] mb-1">Priority</label>
                    <select
                      value={newTaskForm.priority}
                      onChange={(e) => setNewTaskForm({ ...newTaskForm, priority: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl border border-[#2A3446] text-xs font-medium"
                    >
                      <option value="Normal">Normal</option>
                      <option value="High">High</option>
                      <option value="Urgent">Urgent</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-[#F1F5F9] mb-1">Story Points</label>
                    <input
                      type="number"
                      min="1"
                      max="20"
                      value={newTaskForm.sp}
                      onChange={(e) => setNewTaskForm({ ...newTaskForm, sp: Number(e.target.value) })}
                      className="w-full px-3 py-2 rounded-xl border border-[#2A3446] text-xs font-medium"
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-2 border-t border-[#2A3446]">
                  <button
                    type="button"
                    onClick={() => setIsCreateModalOpen(false)}
                    className="px-4 py-2 rounded-xl border border-[#2A3446] text-xs font-bold text-[#F1F5F9] hover:bg-[#0B111C] cursor-pointer"
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
            <div className="bg-[#161F2D] rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4 border border-[#2A3446]">
              <div className="flex items-center justify-between border-b border-[#2A3446] pb-3">
                <div>
                  <span className="text-[10px] font-bold text-[#7FA0D6] uppercase font-mono">
                    {previewTask.pod} • {previewTask.due}
                  </span>
                  <h3 className="text-base font-black text-white mt-0.5">{previewTask.title}</h3>
                </div>
                <button
                  type="button"
                  onClick={() => setPreviewTask(null)}
                  className="p-1 rounded-lg text-[#97A0B3] hover:text-[#F1F5F9] cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-2.5 text-xs text-[#F1F5F9]">
                <div className="p-3 bg-[#0B111C] rounded-2xl space-y-1">
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
    client: "Ryze",
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
        client: "Shanmugaraj",
        title: "Customer Success Story Cutdown Reel",
        type: "Reel",
        assignee: "Karthik Raja",
        avatar: "DK",
        avatarBg: "bg-[#0B111C]",
        tag: "Approved",
        tagColor: "bg-emerald-50 text-emerald-700 border-emerald-100",
        time: "11:30 AM",
      },
    ],
    10: [
      {
        id: "cal-10-1",
        pod: "Pod A",
        client: "Aravindan",
        title: "Brand Story Sequence · 3 Panels",
        type: "Story",
        assignee: "Ananya Deshmukh",
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
        client: "Ryze",
        title: "Q4 Product Unboxing Teaser Reel",
        type: "Reel",
        assignee: "Karthik Raja",
        avatar: "DK",
        avatarBg: "bg-[#0B111C]",
        tag: "Final Polish",
        tagColor: "bg-emerald-50 text-emerald-700 border-emerald-100",
        time: "4:30 PM",
      },
      {
        id: "cal-14-2",
        pod: "Pod A",
        client: "Aravindan",
        title: "Behind-The-Scenes Studio Setup (3-Slide Story)",
        type: "Story",
        assignee: "Ananya Deshmukh",
        avatar: "CT",
        avatarBg: "bg-teal-600",
        tag: "Color Grading",
        tagColor: "bg-purple-50 text-purple-700 border-purple-100",
        time: "3:00 PM",
      },
      {
        id: "cal-14-3",
        pod: "Pod A",
        client: "Shanmugaraj",
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
        client: "Ryze",
        title: "Conversion Post Carousel (10 Panels)",
        type: "Post",
        assignee: "Dev Sharma",
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
        client: "Ryze",
        title: "15-Sec Flash Sale Promo Story Set",
        type: "Story",
        assignee: "Karthik Raja",
        avatar: "DK",
        avatarBg: "bg-[#0B111C]",
        tag: "Approved",
        tagColor: "bg-emerald-50 text-emerald-700 border-emerald-100",
        time: "10:00 AM",
      },
      {
        id: "cal-15-2",
        pod: "Pod A",
        client: "Aravindan",
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
        client: "Shanmugaraj",
        title: "Top 5 Growth Hacks Infographic Post",
        type: "Post",
        assignee: "Dev Sharma",
        avatar: "MV",
        avatarBg: "bg-indigo-600",
        tag: "Scheduled",
        tagColor: "bg-[#7FA0D6]/15 text-[#7FA0D6] border-[#7FA0D6]/30",
        time: "5:00 PM",
      },
    ],
    18: [
      {
        id: "cal-18-1",
        pod: "Pod A",
        client: "Ryze",
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
        client: "Shanmugaraj",
        title: "High-Energy Product Feature Cutdown Reel",
        type: "Reel",
        assignee: "Karthik Raja",
        avatar: "DK",
        avatarBg: "bg-[#0B111C]",
        tag: "Color Grading",
        tagColor: "bg-purple-50 text-purple-700 border-purple-100",
        time: "4:00 PM",
      },
    ],
    20: [
      {
        id: "cal-20-1",
        pod: "Pod A",
        client: "Ryze",
        title: "60-Sec High-Velocity Tech Growth Reel",
        type: "Reel",
        assignee: "Ananya Deshmukh",
        avatar: "CT",
        avatarBg: "bg-teal-600",
        tag: "Approved",
        tagColor: "bg-emerald-50 text-emerald-700 border-emerald-100",
        time: "9:30 AM",
      },
      {
        id: "cal-20-2",
        pod: "Pod A",
        client: "Aravindan",
        title: "Interactive Audience Q&A Story Sequence",
        type: "Story",
        assignee: "Ananya Deshmukh",
        avatar: "CT",
        avatarBg: "bg-teal-600",
        tag: "Drafting",
        tagColor: "bg-[#161F2D] text-[#F1F5F9] border-[#2A3446]",
        time: "2:00 PM",
      },
    ],
    22: [
      {
        id: "cal-22-1",
        pod: "Pod A",
        client: "Aravindan",
        title: "Black Friday Sneak Peek Teaser Reel",
        type: "Reel",
        assignee: "Karthik Raja",
        avatar: "DK",
        avatarBg: "bg-[#0B111C]",
        tag: "Final Polish",
        tagColor: "bg-amber-50 text-amber-700 border-amber-100",
        time: "12:00 PM",
      },
      {
        id: "cal-22-2",
        pod: "Pod A",
        client: "Shanmugaraj",
        title: "Cyber Monday Display Post Carousel",
        type: "Post",
        assignee: "Dev Sharma",
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
        client: "Ryze",
        title: "Mobile App Onboarding Story Series",
        type: "Story",
        assignee: "Ananya Deshmukh",
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
        client: "Ryze",
        title: "End-of-Month Retrospective Reel Showcase",
        type: "Reel",
        assignee: "Karthik Raja",
        avatar: "DK",
        avatarBg: "bg-[#0B111C]",
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
        return { label: "🎬 Reel", bg: "bg-[#7FA0D6]/15 text-[#7FA0D6] border border-[#7FA0D6]/30" };
      case "Story":
        return { label: "📲 Story", bg: "bg-rose-500/15 text-rose-400 border border-rose-500/30" };
      case "Post":
        return { label: "📄 Post", bg: "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30" };
      default:
        return { label: `📌 ${type}`, bg: "bg-[#7FA0D6]/15 text-[#7FA0D6] border border-[#7FA0D6]/30" };
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
      tagColor: "bg-[#7FA0D6]/15 text-[#7FA0D6] border-[#7FA0D6]/30",
      time: scheduleForm.time || "4:00 PM",
    };

    setTasksByDay((prev) => ({
      ...prev,
      [targetDay]: [...(prev[targetDay] || []), newItem],
    }));

    setIsScheduleModalOpen(false);
    setScheduleForm({
      title: "",
      client: "Ryze",
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
    <div data-surface="ops" className="w-full min-h-screen font-sans bg-[#0B111C] flex flex-col">
      <AdminTopHeader activeTab="Content Engine" />
      <main className="flex-1 px-6 lg:px-8 pt-4 pb-16 max-w-[1500px] w-full mx-auto space-y-6">
        {/* Header and Controls */}
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 bg-[#161F2D] border border-[#2A3446] px-3 py-1.5 rounded-xl shadow-2xs">
              <button
                type="button"
                onClick={() => setSelectedDayNumber((prev) => Math.max(1, prev - 1))}
                aria-label="Previous Day"
                className="p-0.5 text-[#97A0B3] hover:text-[#F1F5F9] cursor-pointer rounded"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <Calendar className="w-4 h-4 text-[#7FA0D6]" />
              <span className="text-xs font-bold text-white">
                November {selectedDayNumber}, 2024 {isSelectedDateToday ? "(Today)" : ""}
              </span>
              <button
                type="button"
                onClick={() => setSelectedDayNumber((prev) => Math.min(30, prev + 1))}
                aria-label="Next Day"
                className="p-0.5 text-[#97A0B3] hover:text-[#F1F5F9] cursor-pointer rounded"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
            {selectedDayNumber !== 14 && (
              <button
                type="button"
                onClick={() => setSelectedDayNumber(14)}
                className="text-xs font-bold text-[#7FA0D6] hover:text-blue-800 bg-[#7FA0D6]/15 px-2.5 py-1 rounded-lg border border-[#7FA0D6]/30 cursor-pointer transition-colors"
              >
                Jump to Today (14th)
              </button>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {isTeamLead ? (
              <div className="px-3 py-2 rounded-xl border border-[#7FA0D6]/30 bg-[#7FA0D6]/15/70 text-xs font-bold text-[#7FA0D6] shadow-2xs">
                Pod A Schedule
              </div>
            ) : (
              <CustomSelect
                value={selectedPodFilter}
                onChange={setSelectedPodFilter}
                ariaLabel="Filter Calendar Pod"
                options={[
                  { value: "all", label: "All Pods" },
                  { value: "Pod A", label: "Pod A" },
                  { value: "Pod B", label: "Pod B" },
                  { value: "Pod C", label: "Pod C" },
                ]}
              />
            )}

            <CustomSelect
              value={selectedTypeFilter}
              onChange={setSelectedTypeFilter}
              ariaLabel="Filter Deliverable Type"
              options={[
                { value: "all", label: "All Formats" },
                { value: "Reel", label: "🎬 Reel" },
                { value: "Story", label: "📲 Story" },
                { value: "Post", label: "📄 Post" },
              ]}
            />

            <CustomSelect
              value={selectedClientFilter}
              onChange={setSelectedClientFilter}
              ariaLabel="Filter Calendar Client"
              options={[
                { value: "all", label: "All Assigned Clients" },
                { value: "Ryze", label: "Ryze" },
                { value: "Aravindan", label: "Aravindan" },
                { value: "Shanmugaraj", label: "Shanmugaraj" },
                { value: "Luma", label: "Luma Global" },
              ]}
            />

            <button
              type="button"
              onClick={() => handleOpenScheduleForDay(selectedDayNumber)}
              className="px-4 py-2 rounded-xl bg-[#7FA0D6] hover:bg-blue-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-sm cursor-pointer transition-colors"
            >
              <Plus className="w-4 h-4 stroke-[3]" /> Schedule Asset
            </button>
          </div>
        </div>



        {/* Calendar Grid + Dynamic Selected Date Work Split */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main 7-Column Month Calendar View */}
          <div className="lg:col-span-2 bg-[#161F2D] rounded-3xl border border-[#2A3446] shadow-[0_4px_20px_rgba(0,0,0,0.03)] p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <h2 className="text-base font-black text-white">November 2024</h2>
                <span className="text-xs font-bold text-[#97A0B3]">Production Horizon</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-medium text-[#97A0B3] hidden sm:inline">
                  Click any date to view scheduled work
                </span>
                <span className="text-xs font-bold text-[#7FA0D6] bg-[#7FA0D6]/15 px-3 py-1 rounded-full">
                  14th Today
                </span>
              </div>
            </div>

            <div className="grid grid-cols-7 gap-2 text-center text-[11px] font-bold text-[#97A0B3] pb-2 border-b border-[#2A3446]">
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
                        ? "bg-[#7FA0D6]/15/90 border-blue-500 ring-2 ring-blue-600/30 shadow-md scale-[1.02] z-10"
                        : isToday
                        ? "bg-[#7FA0D6]/15/40 border-[#7FA0D6]/30 hover:border-blue-300"
                        : "bg-[#0B111C]/40 border-[#2A3446] hover:bg-[#161F2D] hover:border-[#7FA0D6]/30 hover:shadow-2xs"
                    }`}
                  >
                    <div className="flex items-center justify-between w-full">
                      <span
                        className={`text-xs font-black size-6 rounded-full flex items-center justify-center text-center shrink-0 transition-colors ${
                          isSelected
                            ? "bg-[#7FA0D6] text-[#050810] shadow-xs"
                            : isToday
                            ? "bg-[#7FA0D6]/30 text-white border border-[#7FA0D6]/50 font-black"
                            : "text-[#F1F5F9] group-hover:text-[#7FA0D6]"
                        }`}
                      >
                        {dayNum}
                      </span>
                      {dayTasks.length > 0 && (
                        <span
                          className={`text-[9px] font-black size-5 rounded-full flex items-center justify-center text-center shrink-0 ${
                            isSelected ? "bg-[#7FA0D6] text-[#050810]" : "bg-[#2A3446] text-[#BCCCE6]"
                          }`}
                        >
                          {dayTasks.length}
                        </span>
                      )}
                    </div>

                    {/* Day Deliverables Badges with Pencil/Line Drawings */}
                    <div className="space-y-1 mt-1.5 w-full">
                      {reelsCount > 0 && (
                        <span className="flex items-center gap-1.5 text-[9.5px] font-bold px-2 py-1 rounded-lg bg-[#161F2D] text-[#7FA0D6] border border-[#2A3446] truncate">
                          <Film className="size-3 text-[#7FA0D6] shrink-0 stroke-[1.75]" />
                          <span>{reelsCount} {reelsCount === 1 ? "Reel" : "Reels"}</span>
                        </span>
                      )}
                      {storiesCount > 0 && (
                        <span className="flex items-center gap-1.5 text-[9.5px] font-bold px-2 py-1 rounded-lg bg-[#161F2D] text-[#BCCCE6] border border-[#2A3446] truncate">
                          <Smartphone className="size-3 text-[#BCCCE6] shrink-0 stroke-[1.75]" />
                          <span>{storiesCount} {storiesCount === 1 ? "Story" : "Stories"}</span>
                        </span>
                      )}
                      {otherCount > 0 && (
                        <span className="flex items-center gap-1.5 text-[9.5px] font-bold px-2 py-1 rounded-lg bg-[#161F2D] text-[#D8BF9B] border border-[#2A3446] truncate">
                          <Pin className="size-3 text-[#D8BF9B] shrink-0 stroke-[1.75]" />
                          <span className="truncate">{otherCount} Deliverable{otherCount > 1 ? "s" : ""}</span>
                        </span>
                      )}
                      {dayTasks.length === 0 && (
                        <span className="flex items-center gap-1 text-[9px] font-medium text-[#97A0B3] group-hover:text-white transition-colors pt-2">
                          <Pencil className="size-2.5 text-[#97A0B3] stroke-[1.5]" />
                          <span>+ Add item</span>
                        </span>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Right Column: Dynamic Work Container for Selected Date */}
          <div className="bg-[#161F2D] rounded-3xl border border-[#2A3446] shadow-[0_4px_20px_rgba(0,0,0,0.03)] p-6 space-y-4 flex flex-col justify-between">
            <div className="space-y-4">
              {/* Dynamic Header */}
              <div className="flex items-center justify-between border-b border-[#2A3446] pb-3">
                <div className="flex items-center gap-2">
                  <h2 className="text-base font-black text-white">
                    {isSelectedDateToday
                      ? "Today's Deliverables"
                      : `Nov ${selectedDayNumber} Deliverables`}
                  </h2>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-black text-[#7FA0D6] bg-[#7FA0D6]/15 px-2.5 py-1 rounded-full border border-[#7FA0D6]/30">
                    {filteredDayTasks.length} {filteredDayTasks.length === 1 ? "Item" : "Items"}
                  </span>
                </div>
              </div>

              {/* Sub-bar indicator showing selected date */}
              <div className="flex items-center justify-between bg-[#0B111C]/80 px-3 py-2 rounded-xl border border-[#2A3446]">
                <span className="text-xs font-semibold text-[#F1F5F9] flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-[#7FA0D6]" />
                  Scheduled for <strong>Nov {selectedDayNumber}, 2024</strong>
                </span>
                <button
                  type="button"
                  onClick={() => handleOpenScheduleForDay(selectedDayNumber)}
                  className="text-[11px] font-bold text-[#7FA0D6] hover:text-blue-800 flex items-center gap-1 cursor-pointer"
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
                        className="p-4 rounded-2xl border border-[#2A3446] hover:border-blue-300 bg-[#161F2D] hover:bg-[#7FA0D6]/15/20 shadow-2xs hover:shadow-sm transition-all cursor-pointer space-y-2.5 group"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-[10px] font-black text-[#7FA0D6] uppercase font-mono tracking-wider">
                            {item.pod} • {item.client}
                          </span>
                          <span
                            className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border ${typeBadge.bg}`}
                          >
                            {typeBadge.label}
                          </span>
                        </div>

                        <h4 className="text-xs font-black text-white group-hover:text-[#7FA0D6] transition-colors leading-snug">
                          {item.title}
                        </h4>

                        <div className="flex items-center justify-between text-[11px] text-[#97A0B3] pt-2 border-t border-[#2A3446]">
                          <div className="flex items-center gap-1.5">
                            <div
                              className={`size-5.5 rounded-full ${item.avatarBg} text-white font-bold text-[9px] flex items-center justify-center shadow-2xs`}
                            >
                              {item.avatar}
                            </div>
                            <span className="font-semibold text-[#F1F5F9]">{item.assignee}</span>
                          </div>

                          <div className="flex items-center gap-2">
                            <span
                              className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${item.tagColor}`}
                            >
                              {item.tag}
                            </span>
                            <span className="font-bold text-white font-mono text-xs">
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
                <div className="py-12 px-4 text-center rounded-2xl border-2 border-dashed border-[#2A3446] bg-[#0B111C]/50 flex flex-col items-center justify-center space-y-3">
                  <div className="w-12 h-12 rounded-2xl bg-[#7FA0D6]/15 text-[#7FA0D6] flex items-center justify-center shadow-2xs">
                    <Calendar className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-sm font-black text-white">
                      No deliverables on Nov {selectedDayNumber}
                    </h3>
                    <p className="text-xs text-[#97A0B3] mt-1 max-w-[240px] mx-auto">
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
            <div className="pt-3 border-t border-[#2A3446] flex items-center justify-between text-xs text-[#97A0B3]">
              <span className="font-medium">Total Assets in Nov:</span>
              <span className="font-black text-white">
                {Object.values(tasksByDay).reduce((acc, curr) => acc + curr.length, 0)} Items
              </span>
            </div>
          </div>
        </div>

        {/* Schedule Modal */}
        {isScheduleModalOpen && (
          <div className="fixed inset-0 w-screen h-screen z-[9999] flex items-center justify-center bg-slate-950/70 backdrop-blur-md p-4 overflow-y-auto">
            <div className="bg-[#161F2D] rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4 border border-[#2A3446]">
              <div className="flex items-center justify-between border-b border-[#2A3446] pb-3">
                <div>
                  <h3 className="text-base font-black text-white">Schedule Content Asset</h3>
                  <p className="text-xs text-[#97A0B3] mt-0.5">
                    Target Date: Nov {scheduleForm.dateDay}, 2024
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setIsScheduleModalOpen(false)}
                  className="p-1 rounded-lg text-[#97A0B3] hover:text-[#F1F5F9] cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleScheduleSubmit} className="space-y-3.5">
                <div>
                  <label className="block text-xs font-bold text-[#F1F5F9] mb-1">Asset Title</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Black Friday Reel Cut Batch #2"
                    value={scheduleForm.title}
                    onChange={(e) => setScheduleForm({ ...scheduleForm, title: e.target.value })}
                    className="w-full px-3.5 py-2 rounded-xl border border-[#2A3446] text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-[#F1F5F9] mb-1">Deliverable Type</label>
                    <select
                      value={scheduleForm.type}
                      onChange={(e) => setScheduleForm({ ...scheduleForm, type: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl border border-[#2A3446] text-xs font-medium"
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
                    <label className="block text-xs font-bold text-[#F1F5F9] mb-1">Target Client</label>
                    <select
                      value={scheduleForm.client}
                      onChange={(e) => setScheduleForm({ ...scheduleForm, client: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl border border-[#2A3446] text-xs font-medium"
                    >
                      <option value="Ryze">Ryze</option>
                      <option value="Aravindan">Aravindan</option>
                      <option value="Shanmugaraj">Shanmugaraj</option>
                      <option value="Luma">Luma Global</option>
                      <option value="Lumina Health">Lumina Health</option>
                      <option value="Acme Corp">Acme Corp</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-[#F1F5F9] mb-1">Target Pod</label>
                    <select
                      value={scheduleForm.pod}
                      onChange={(e) => setScheduleForm({ ...scheduleForm, pod: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl border border-[#2A3446] text-xs font-medium"
                    >
                      <option value="Pod A">Pod A</option>
                      <option value="Pod B">Pod B</option>
                      <option value="Pod C">Pod C</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-[#F1F5F9] mb-1">Day of November</label>
                    <select
                      value={scheduleForm.dateDay}
                      onChange={(e) => setScheduleForm({ ...scheduleForm, dateDay: Number(e.target.value) })}
                      className="w-full px-3 py-2 rounded-xl border border-[#2A3446] text-xs font-medium"
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
                    <label className="block text-xs font-bold text-[#F1F5F9] mb-1">Target Time</label>
                    <input
                      type="text"
                      value={scheduleForm.time}
                      onChange={(e) => setScheduleForm({ ...scheduleForm, time: e.target.value })}
                      placeholder="e.g. 4:30 PM"
                      className="w-full px-3 py-2 rounded-xl border border-[#2A3446] text-xs font-medium"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-[#F1F5F9] mb-1">Initial Tag</label>
                    <input
                      type="text"
                      value={scheduleForm.tag}
                      onChange={(e) => setScheduleForm({ ...scheduleForm, tag: e.target.value })}
                      placeholder="e.g. Final Polish"
                      className="w-full px-3 py-2 rounded-xl border border-[#2A3446] text-xs font-medium"
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-2 border-t border-[#2A3446]">
                  <button
                    type="button"
                    onClick={() => setIsScheduleModalOpen(false)}
                    className="px-4 py-2 rounded-xl border border-[#2A3446] text-xs font-bold text-[#F1F5F9] hover:bg-[#0B111C] cursor-pointer"
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
            <div className="bg-[#161F2D] rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4 border border-[#2A3446]">
              <div className="flex items-center justify-between border-b border-[#2A3446] pb-3">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold text-[#7FA0D6] uppercase font-mono">
                      {selectedAssetModal.pod} • {selectedAssetModal.client}
                    </span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#7FA0D6]/15 text-[#7FA0D6] border border-[#7FA0D6]/30">
                      {selectedAssetModal.type}
                    </span>
                  </div>
                  <h3 className="text-base font-black text-white mt-1">{selectedAssetModal.title}</h3>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedAssetModal(null)}
                  className="p-1 rounded-lg text-[#97A0B3] hover:text-[#F1F5F9] cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="p-4 bg-[#0B111C] rounded-2xl space-y-2.5 text-xs text-[#F1F5F9]">
                <div className="flex justify-between">
                  <span className="font-semibold text-[#97A0B3]">Deliverable Type:</span>
                  <span className="font-bold text-white">{getTypeBadge(selectedAssetModal.type).label}</span>
                </div>
                <div className="flex justify-between">
                  <span className="font-semibold text-[#97A0B3]">Assigned Specialist:</span>
                  <span className="font-bold text-white">{selectedAssetModal.assignee}</span>
                </div>
                <div className="flex justify-between">
                  <span className="font-semibold text-[#97A0B3]">Scheduled Time:</span>
                  <span className="font-bold text-white">{selectedAssetModal.time}</span>
                </div>
                <div className="flex justify-between">
                  <span className="font-semibold text-[#97A0B3]">Pipeline Stage:</span>
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

  const { data: queueData } = useQuery({
    queryKey: ["admin_queue"],
    queryFn: () => fetchAdminQueue(),
  });

  useEffect(() => {
    if (queueData?.staff && queueData.staff.length > 0) {
      const mapped = queueData.staff.map((s, idx) => ({
        id: s.user_id || `staff-${idx}`,
        podId: idx % 3 === 0 ? "pod-a" : idx % 3 === 1 ? "pod-b" : "pod-c",
        name: String(s.full_name || (s.email ? s.email.split("@")[0] : "Team Member")),
        role: s.department ? `${s.department.toUpperCase()} Specialist` : "Creative Specialist",
        category: (s.department === "lead" ? "lead" : "editor") as "editor" | "designer" | "lead" | "videographer" | "photographer",
        isLead: s.department === "lead",
        email: s.email || "staff@creo.agency",
        handle: String(s.email ? `@${s.email.split("@")[0]}` : "@member"),
        status: (s.on_leave_today ? "On Leave" : s.is_accepting_work ? "Accepting Work" : "Fully Booked") as "Pod Lead" | "Accepting Work" | "Fully Booked" | "On Leave" | "Sprint Ready",
        statusColor: s.on_leave_today ? "bg-amber-50 text-amber-700 border-amber-200" : "bg-emerald-50 text-emerald-700 border-emerald-200",
        allocatedPct: Math.min(100, Math.round((s.active_wip / Math.max(1, s.daily_capacity)) * 100)),
        projectsCount: s.active_wip,
        capabilities: s.skills && s.skills.length > 0 ? s.skills : ["Creative Design", "Content Operations"],
      }));
      setMembersList(mapped);
    }
  }, [queueData]);

  const [pods, setPods] = useState([
    {
      id: "pod-a",
      name: "Pod A",
      letter: "A",
      lead: "Vikram Malhotra",
      leadRole: "Pod Lead & Creative Director",
      membersCount: 3,
      velocityPct: 100,
      tasksClosed: 0,
      pendingReview: 0,
      allocatedHours: 120,
      totalHours: 120,
      color: "bg-blue-600",
      textColor: "text-[#7FA0D6]",
      pillBg: "bg-[#7FA0D6]/15 text-[#7FA0D6] border-[#7FA0D6]/30",
      squadLoad: 40,
      activeEngagements: 1,
      readyReview: 0,
      description: "Pod Alpha specializes in DTC brand acceleration, static visual identity, and cinematic reel production.",
    },
    {
      id: "pod-b",
      name: "Pod B",
      letter: "B",
      lead: "Sarah Connor",
      leadRole: "Pod Lead & Creative Strategist",
      membersCount: 3,
      velocityPct: 100,
      tasksClosed: 0,
      pendingReview: 0,
      allocatedHours: 120,
      totalHours: 120,
      color: "bg-[#7FA0D6]",
      textColor: "text-[#7FA0D6]",
      pillBg: "bg-sky-50 text-sky-600 border-sky-100",
      squadLoad: 40,
      activeEngagements: 1,
      readyReview: 0,
      description: "Pod Beta executes performance marketing, viral reel mechanics, and high-impact wellness narratives.",
    },
    {
      id: "pod-c",
      name: "Pod C",
      letter: "C",
      lead: "Rohan Mehta",
      leadRole: "Pod Lead & Design Director",
      membersCount: 3,
      velocityPct: 100,
      tasksClosed: 0,
      pendingReview: 0,
      allocatedHours: 120,
      totalHours: 120,
      color: "bg-emerald-600",
      textColor: "text-emerald-600",
      pillBg: "bg-emerald-50 text-emerald-600 border-emerald-100",
      squadLoad: 40,
      activeEngagements: 1,
      readyReview: 0,
      description: "Pod Gamma drives luxury lifestyle aesthetics, minimal typography, and 3D visual motion.",
    },
  ]);

  const [membersList, setMembersList] = useState<TeamMember[]>([
    // --- POD A (Pod Alpha) ---
    {
      id: "m-101",
      podId: "pod-a",
      name: "Vikram Malhotra",
      role: "Pod Lead & Creative Director",
      category: "lead",
      isLead: true,
      email: "lead.alpha@creo.agency",
      handle: "@vikram",
      status: "Pod Lead",
      statusColor: "bg-[#7FA0D6]/15 text-[#7FA0D6] border-[#7FA0D6]/30",
      allocatedPct: 60,
      projectsCount: 1,
      capabilities: ["Creative Direction", "Brand Systems", "Campaign Strategy"],
    },
    {
      id: "m-102",
      podId: "pod-a",
      name: "Karthik Raja",
      role: "Video Editor & Motion Designer",
      category: "editor",
      email: "editor.alpha@creo.agency",
      handle: "@karthik",
      status: "Sprint Ready",
      statusColor: "bg-sky-50 text-sky-700 border-sky-200",
      allocatedPct: 50,
      projectsCount: 1,
      capabilities: ["Premiere Pro", "After Effects", "Reels Editing"],
    },
    {
      id: "m-103",
      podId: "pod-a",
      name: "Ananya Deshmukh",
      role: "Brand Graphic Designer",
      category: "designer",
      email: "designer.alpha@creo.agency",
      handle: "@ananya",
      status: "Accepting Work",
      statusColor: "bg-emerald-50 text-emerald-700 border-emerald-200",
      allocatedPct: 40,
      projectsCount: 1,
      capabilities: ["Figma", "Photoshop", "Brand Design", "Posters"],
    },

    // --- POD B (Pod Beta) ---
    {
      id: "m-201",
      podId: "pod-b",
      name: "Sarah Connor",
      role: "Pod Lead & Creative Strategist",
      category: "lead",
      isLead: true,
      email: "lead.beta@creo.agency",
      handle: "@sarah",
      status: "Pod Lead",
      statusColor: "bg-[#7FA0D6]/15 text-[#7FA0D6] border-[#7FA0D6]/30",
      allocatedPct: 60,
      projectsCount: 1,
      capabilities: ["Campaign Architecture", "Creative Direction", "Viral Hooks"],
    },
    {
      id: "m-202",
      podId: "pod-b",
      name: "Dev Sharma",
      role: "Video Editor & Reel Specialist",
      category: "editor",
      email: "editor.beta@creo.agency",
      handle: "@davidk",
      status: "Sprint Ready",
      statusColor: "bg-sky-50 text-sky-700 border-sky-200",
      allocatedPct: 50,
      projectsCount: 1,
      capabilities: ["DaVinci Resolve", "Sound Design", "Mobile 9:16 Reels"],
    },
    {
      id: "m-203",
      podId: "pod-b",
      name: "Elena Rostova",
      role: "Visual & Poster Designer",
      category: "designer",
      email: "designer.beta@creo.agency",
      handle: "@elena",
      status: "Accepting Work",
      statusColor: "bg-emerald-50 text-emerald-700 border-emerald-200",
      allocatedPct: 40,
      projectsCount: 1,
      capabilities: ["Typography", "Social Banners", "Carousel Design"],
    },

    // --- POD C (Pod Gamma) ---
    {
      id: "m-301",
      podId: "pod-c",
      name: "Rohan Mehta",
      role: "Pod Lead & Design Director",
      category: "lead",
      isLead: true,
      email: "lead.gamma@creo.agency",
      handle: "@rohan",
      status: "Pod Lead",
      statusColor: "bg-[#7FA0D6]/15 text-[#7FA0D6] border-[#7FA0D6]/30",
      allocatedPct: 60,
      projectsCount: 1,
      capabilities: ["Art Direction", "Minimal Aesthetics", "Design Systems"],
    },
    {
      id: "m-302",
      podId: "pod-c",
      name: "Tanvi Sen",
      role: "Video & Motion Editor",
      category: "editor",
      email: "editor.gamma@creo.agency",
      handle: "@tanvi",
      status: "Sprint Ready",
      statusColor: "bg-sky-50 text-sky-700 border-sky-200",
      allocatedPct: 50,
      projectsCount: 1,
      capabilities: ["Motion Graphics", "Color Grading", "Short-Form Video"],
    },
    {
      id: "m-303",
      podId: "pod-c",
      name: "Arjun Nair",
      role: "Graphic & UI Specialist",
      category: "designer",
      email: "designer.gamma@creo.agency",
      handle: "@arjun",
      status: "Accepting Work",
      statusColor: "bg-emerald-50 text-emerald-700 border-emerald-200",
      allocatedPct: 40,
      projectsCount: 1,
      capabilities: ["Illustrations", "Figma", "Social Banners"],
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
        return <UserCog className="w-3.5 h-3.5 text-[#7FA0D6]" />;
      case "designer":
        return <Palette className="w-3.5 h-3.5 text-purple-600" />;
      case "editor":
        return <Scissors className="w-3.5 h-3.5 text-amber-600" />;
      case "videographer":
        return <Video className="w-3.5 h-3.5 text-rose-600" />;
      case "photographer":
        return <Camera className="w-3.5 h-3.5 text-emerald-600" />;
      default:
        return <Users className="w-3.5 h-3.5 text-[#F1F5F9]" />;
    }
  };

  const [assignModalMember, setAssignModalMember] = useState<TeamMember | null>(null);
  const [scheduleModalMember, setScheduleModalMember] = useState<TeamMember | null>(null);
  const [assignForm, setAssignForm] = useState({
    taskTitle: "Brand Repositioning Sprint Deliverable",
    client: "Ryze",
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
      client: "Ryze",
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
    <div data-surface="ops" className="w-full min-h-screen font-sans bg-[#0B111C] flex flex-col">
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
                <h3 className="text-base font-bold text-white">Sprint Pods & Resource Allocation</h3>
                <p className="text-xs text-[#97A0B3]">Live operational capacity and roster assignments across creative pods</p>
              </div>
              <button
                type="button"
                onClick={() => setIsAddMemberOpen(true)}
                className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-[#7FA0D6] hover:bg-blue-700 text-white text-xs font-bold shadow-md shadow-blue-500/20 cursor-pointer transition-all shrink-0"
              >
                <Plus className="w-4 h-4" /> Add Team Pod
              </button>
            </div>

            {/* 3 KPI Summary Cards matching Screenshot 1 */}
            {(() => {
              const totalPodsCount = pods.length;
              const totalMembersCount = membersList.length;
              const avgCapacityPct = Math.round(
                membersList.reduce((acc, m) => acc + (m.allocatedPct || 0), 0) / (membersList.length || 1)
              );
              const activeTasksCount = membersList.reduce((acc, m) => acc + (m.projectsCount || 0), 0);
              const firstPodLetter = pods[0]?.letter || "A";
              const lastPodLetter = pods[pods.length - 1]?.letter || String.fromCharCode(65 + Math.max(0, pods.length - 1));

              return (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {/* Card 1: NO OF PODS */}
                  <div className="kpi-card bg-[#161F2D] rounded-3xl p-6 border-2 border-[#161F2D] hover:border-[#BCCCE6] transition-all shadow-[0_4px_20px_rgba(0,0,0,0.03)] flex flex-col justify-between">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-[10px] font-extrabold text-[#97A0B3] uppercase tracking-wider">
                        NO OF PODS
                      </span>
                      <div className="w-9 h-9 rounded-2xl bg-[#7FA0D6]/15 text-[#7FA0D6] flex items-center justify-center">
                        <Users className="w-5 h-5" />
                      </div>
                    </div>
                    <div className="flex items-baseline gap-2">
                      <span className="text-3xl font-black text-white tracking-tight">{totalPodsCount} Pods</span>
                      <span className="text-xs font-semibold text-[#97A0B3]">across {totalMembersCount} members</span>
                    </div>
                    <div className="mt-4 pt-3 border-t border-[#2A3446] text-xs font-bold text-[#7FA0D6] flex items-center gap-1">
                      <Layers className="w-3.5 h-3.5" /> Pods {firstPodLetter} – {lastPodLetter} Active Pods
                    </div>
                  </div>

                  {/* Card 2: CAPACITY */}
                  <div className="kpi-card bg-[#161F2D] rounded-3xl p-6 border-2 border-[#161F2D] hover:border-[#BCCCE6] transition-all shadow-[0_4px_20px_rgba(0,0,0,0.03)] flex flex-col justify-between">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-[10px] font-extrabold text-[#97A0B3] uppercase tracking-wider">
                        CAPACITY
                      </span>
                      <div className="w-9 h-9 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                        <Zap className="w-5 h-5" />
                      </div>
                    </div>
                    <div className="flex items-baseline gap-2">
                      <span className="text-3xl font-black text-white tracking-tight">{avgCapacityPct}%</span>
                      <span className="text-xs font-semibold text-[#97A0B3]">optimal bandwidth</span>
                    </div>
                    <div className="mt-4 pt-3 border-t border-[#2A3446] flex items-center gap-2">
                      <div className="flex-1 bg-[#161F2D] rounded-full h-2 overflow-hidden">
                        <div className="bg-emerald-600 h-full rounded-full" style={{ width: `${avgCapacityPct}%` }} />
                      </div>
                      <span className="text-xs font-bold text-emerald-600">
                        {avgCapacityPct > 90 ? "High Load" : "Healthy"}
                      </span>
                    </div>
                  </div>

                  {/* Card 3: TASKS TO BE DONE */}
                  <div className="kpi-card bg-[#161F2D] rounded-3xl p-6 border-2 border-[#161F2D] hover:border-[#BCCCE6] transition-all shadow-[0_4px_20px_rgba(0,0,0,0.03)] flex flex-col justify-between">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-[10px] font-extrabold text-[#97A0B3] uppercase tracking-wider">
                        TASKS TO BE DONE
                      </span>
                      <div className="w-9 h-9 rounded-2xl bg-sky-50 text-sky-600 flex items-center justify-center">
                        <CheckSquare className="w-5 h-5" />
                      </div>
                    </div>
                    <div className="flex items-baseline gap-2">
                      <span className="text-3xl font-black text-white tracking-tight">{activeTasksCount}</span>
                      <span className="text-xs font-semibold text-[#97A0B3]">in review/progress</span>
                    </div>
                    <div className="mt-4 pt-3 border-t border-[#2A3446] text-xs text-[#97A0B3] flex items-center gap-1 font-medium">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> All squad tasks live on track
                    </div>
                  </div>
                </div>
              );
            })()}

            {/* Team Pods Section Header */}
            <div className="flex items-center justify-between pt-2">
              <div>
                <h3 className="text-lg font-bold text-white tracking-tight">Team Pods</h3>
                <p className="text-xs text-[#97A0B3]">Real-time capacity distribution, pod leads, and task completion velocity</p>
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
                  className="bg-[#161F2D] rounded-3xl p-6 border border-[#2A3446] shadow-[0_4px_25px_rgba(0,0,0,0.04)] space-y-5 hover:shadow-xl transition-all cursor-pointer group relative overflow-hidden"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`w-12 h-12 rounded-2xl ${pod.color} text-white font-black text-lg flex items-center justify-center shadow-md group-hover:scale-105 transition-transform`}>
                        {pod.letter}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="font-bold text-base text-white">{pod.name}</h4>
                          <span className="px-2 py-0.5 rounded-full bg-[#161F2D] text-[#F1F5F9] text-[10px] font-bold">
                            Sprint Pod
                          </span>
                        </div>
                        <p className="text-xs text-[#97A0B3]">{pod.description.slice(0, 48)}...</p>
                      </div>
                    </div>
                    <span className="px-2.5 py-1 rounded-full text-[10px] font-extrabold bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> Active
                    </span>
                  </div>

                  {/* Lead Info & Member Stack */}
                  <div className="p-3.5 bg-[#0B111C]/70 rounded-2xl flex items-center justify-between border border-[#2A3446]">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-full bg-blue-600 text-white font-bold text-xs flex items-center justify-center">
                        {pod.lead[0]}
                      </div>
                      <div>
                        <div className="text-xs font-bold text-white">{pod.lead}</div>
                        <div className="text-[10px] text-[#97A0B3] font-medium">Pod Lead</div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 text-xs font-bold text-[#F1F5F9]">
                      <div className="flex -space-x-2">
                        <div className="w-7 h-7 rounded-full bg-slate-700 text-white text-[10px] font-bold flex items-center justify-center ring-2 ring-white">ER</div>
                        <div className="w-7 h-7 rounded-full bg-blue-600 text-white text-[10px] font-bold flex items-center justify-center ring-2 ring-white">MC</div>
                        <div className="w-7 h-7 rounded-full bg-emerald-600 text-white text-[10px] font-bold flex items-center justify-center ring-2 ring-white">LZ</div>
                      </div>
                      <span className="text-xs font-bold text-[#F1F5F9]">+{pod.membersCount - 3} Members</span>
                    </div>
                  </div>

                  {/* Velocity Bar */}
                  <div className="space-y-2 text-xs">
                    <div className="flex justify-between items-center text-[#F1F5F9] font-semibold">
                      <span>Sprint Velocity</span>
                      <span className="font-bold text-white">{pod.velocityPct}% on track</span>
                    </div>
                    <div className="w-full bg-[#161F2D] rounded-full h-2.5 overflow-hidden">
                      <div className={`h-full rounded-full ${pod.color}`} style={{ width: `${pod.velocityPct}%` }} />
                    </div>
                    <div className="flex justify-between text-[11px] text-[#97A0B3] font-medium pt-0.5">
                      <span>{pod.tasksClosed} tasks closed</span>
                      <span className="text-[#7FA0D6] font-bold">{pod.pendingReview} pending review</span>
                    </div>
                  </div>

                  {/* Card Footer Action */}
                  <div className="pt-3 border-t border-[#2A3446] flex items-center justify-between text-xs">
                    <span className="text-[#97A0B3] font-medium text-[11px]">
                      Allocated: <strong className="text-white">{pod.allocatedHours}h / {pod.totalHours}h</strong>
                    </span>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setActivePodId(pod.id);
                      }}
                      className="text-[#7FA0D6] font-bold hover:underline inline-flex items-center gap-1 group-hover:translate-x-0.5 transition-transform"
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
              <div className="flex items-center gap-2 text-xs font-bold text-[#97A0B3]">
                <button
                  type="button"
                  onClick={() => setActivePodId(null)}
                  className="hover:text-[#7FA0D6] flex items-center gap-1 transition-colors cursor-pointer"
                >
                  <ArrowLeft className="w-4 h-4" /> Back to Track Overview
                </button>
                <span>/</span>
                <button type="button" onClick={() => setActivePodId(null)} className="hover:text-[#7FA0D6] transition-colors cursor-pointer">
                  Team Management
                </button>
                <span>/</span>
                <span className="text-white font-black">{activePod?.name} Member Directory</span>
              </div>

              <div className="flex items-center gap-3">
                <span className="px-3 py-1 rounded-full text-[11px] font-bold bg-[#7FA0D6]/15 text-[#7FA0D6] border border-[#7FA0D6]/30">
                  ● Q2 Cycle Active
                </span>
                <span className="text-[11px] text-[#97A0B3] font-medium hidden sm:inline">
                  Last synchronized: Just now
                </span>
                <button
                  type="button"
                  onClick={() => setIsAddMemberOpen(true)}
                  className="px-4 py-2 rounded-xl bg-[#7FA0D6] hover:bg-blue-700 text-white text-xs font-bold shadow-md shadow-blue-500/20 cursor-pointer transition-all"
                >
                  + Add Team Member
                </button>
              </div>
            </div>

            {/* Pod Summary Banner Card matching Screenshot 2 */}
            <div className="bg-[#161F2D] rounded-3xl p-6 lg:p-8 border border-[#2A3446] shadow-[0_4px_30px_rgba(0,0,0,0.04)] space-y-6">
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
                  <p className="text-xs text-[#F1F5F9] leading-relaxed font-medium">
                    {activePod?.description}
                  </p>

                  <div className="flex flex-wrap items-center gap-6 pt-2 text-xs font-bold text-[#F1F5F9]">
                    <div>
                      <span className="text-[10px] uppercase text-[#97A0B3] block font-extrabold tracking-wider">POD LEAD</span>
                      <span className="text-white font-black">{activePod?.lead}</span>
                    </div>
                    <div className="h-6 w-px bg-gray-200" />
                    <div>
                      <span className="text-[10px] uppercase text-[#97A0B3] block font-extrabold tracking-wider">MEMBERS</span>
                      <span className="text-white font-black">{filteredMembers.length} Active Members</span>
                    </div>
                    <div className="h-6 w-px bg-gray-200" />
                    <div>
                      <span className="text-[10px] uppercase text-[#97A0B3] block font-extrabold tracking-wider">VELOCITY</span>
                      <span className="text-emerald-600 font-black">{activePod?.velocityPct}% Sprint Delivery</span>
                    </div>
                  </div>
                </div>

                {/* Right Side Stats */}
                <div className="flex gap-4 border-t lg:border-t-0 lg:border-l border-[#2A3446] pt-4 lg:pt-0 lg:pl-8">
                  <div className="bg-[#0B111C] p-4 rounded-2xl border border-[#2A3446] min-w-[130px] space-y-1">
                    <span className="text-[10px] font-bold text-[#97A0B3] uppercase">AVG SQUAD LOAD</span>
                    <div className="text-2xl font-black text-white">{activePod?.squadLoad}%</div>
                    <span className="text-[10px] text-emerald-600 font-bold">↓ Optimal</span>
                  </div>
                  <div className="bg-[#0B111C] p-4 rounded-2xl border border-[#2A3446] min-w-[130px] space-y-1">
                    <span className="text-[10px] font-bold text-[#97A0B3] uppercase">ACTIVE ENGAGEMENTS</span>
                    <div className="text-2xl font-black text-white">{activePod?.activeEngagements} projects</div>
                    <span className="text-[10px] text-[#7FA0D6] font-bold">{activePod?.readyReview} ready for review</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Role Category Filter Tabs & Action Controls */}
            <div className="bg-[#161F2D] rounded-2xl border border-[#2A3446] p-4 shadow-sm space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                {/* Filter Pills matching Screenshot 2 */}
                <div className="flex flex-wrap items-center gap-1.5 bg-[#161F2D] p-1 rounded-xl text-xs font-bold">
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
                          ? "bg-[#7FA0D6] text-white shadow-xs"
                          : "text-[#F1F5F9] hover:text-white"
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
              <div className="flex items-center justify-between text-xs text-[#97A0B3] font-semibold border-t border-[#2A3446] pt-3">
                <span>Showing {filteredMembers.length} members assigned to {activePod?.name}</span>
                <div className="flex items-center gap-3">
                  <button type="button" className="hover:text-[#F1F5F9] flex items-center gap-1">
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
                    className="hover:text-[#F1F5F9] flex items-center gap-1 cursor-pointer"
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
                  className="bg-[#161F2D] rounded-3xl border border-[#2A3446] shadow-[0_4px_20px_rgba(0,0,0,0.04)] p-6 space-y-4 flex flex-col justify-between hover:shadow-lg transition-shadow"
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
                          <h4 className="font-bold text-sm text-white flex items-center gap-1">
                            {member.name}
                            {member.isLead && <CheckCircle2 className="w-3.5 h-3.5 text-[#7FA0D6]" />}
                          </h4>
                          <span className="text-[11px] text-[#97A0B3] font-medium flex items-center gap-1 mt-0.5">
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
                    <div className="p-3 bg-[#0B111C]/70 rounded-2xl text-[11px] font-mono space-y-0.5 border border-[#2A3446]">
                      <div className="text-[#F1F5F9] truncate">{member.email}</div>
                      <div className="text-[#7FA0D6] font-semibold">{member.handle}</div>
                    </div>

                    {/* Core Capabilities Pills */}
                    <div className="space-y-1.5">
                      <span className="text-[10px] font-extrabold uppercase tracking-wider text-[#97A0B3] block">
                        CORE CAPABILITIES
                      </span>
                      <div className="flex flex-wrap gap-1.5">
                        {member.capabilities.map((cap) => (
                          <span
                            key={cap}
                            className="px-2.5 py-1 rounded-lg bg-[#161F2D] text-[#F1F5F9] text-[10px] font-bold border border-[#2A3446]/60"
                          >
                            {cap}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Footer Workload Bar & Action */}
                  <div className="pt-4 border-t border-[#2A3446] space-y-3">
                    <div className="space-y-1">
                      <div className="flex justify-between items-center text-[11px]">
                        <span className="text-[#97A0B3] font-semibold">
                          Workload ({member.projectsCount} Projects)
                        </span>
                        <span className={`font-bold ${member.allocatedPct >= 90 ? "text-rose-600" : "text-emerald-600"}`}>
                          {member.allocatedPct}% {member.allocatedPct >= 90 ? "Booked" : "Allocated"}
                        </span>
                      </div>
                      <div className="w-full bg-[#161F2D] rounded-full h-2 overflow-hidden">
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
                        className="text-[#7FA0D6] hover:text-blue-800 hover:underline cursor-pointer text-[11px] font-bold"
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
              className="relative w-full max-w-lg rounded-3xl bg-[#161F2D] p-6 sm:p-7 shadow-2xl border border-[#2A3446] flex flex-col space-y-4 max-h-[92vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
              role="dialog"
              aria-modal="true"
            >
              {/* Header */}
              <div className="flex items-center justify-between border-b border-[#2A3446] pb-3">
                <div className="flex items-center gap-2.5">
                  <div className="size-9 rounded-2xl bg-[#7FA0D6]/15 text-[#7FA0D6] flex items-center justify-center font-black text-sm">
                    <Briefcase className="size-4.5" />
                  </div>
                  <div>
                    <h3 className="text-base font-black text-white tracking-tight">Assign Sprint Task</h3>
                    <p className="text-[11px] text-[#97A0B3] font-medium">Allocate project work & set turnaround targets</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setAssignModalMember(null)}
                  className="size-8 rounded-full bg-[#161F2D] hover:bg-slate-200 text-[#97A0B3] flex items-center justify-center transition-colors cursor-pointer"
                >
                  <X className="size-4" />
                </button>
              </div>

              {/* Specialist Profile Banner */}
              <div className="bg-[#0B111C] border border-[#2A3446]/90 rounded-2xl p-3.5 flex items-center justify-between">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="size-11 rounded-2xl bg-blue-600 text-white font-black text-sm flex items-center justify-center shadow-xs shrink-0">
                    {assignModalMember.name.split(" ").map((n) => n[0]).join("")}
                  </div>
                  <div className="min-w-0">
                    <h4 className="text-xs font-black text-white truncate">{assignModalMember.name}</h4>
                    <p className="text-[11px] text-[#97A0B3] font-medium truncate">{assignModalMember.role}</p>
                    <span className="text-[10px] text-[#7FA0D6] font-bold">{assignModalMember.email}</span>
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <span className="text-[10px] font-bold text-[#97A0B3] block uppercase tracking-wider">CURRENT LOAD</span>
                  <span className="text-sm font-black text-white">{assignModalMember.allocatedPct}%</span>
                  <span className="text-[10px] text-[#97A0B3] block font-semibold">{assignModalMember.projectsCount} Projects</span>
                </div>
              </div>

              {/* Assignment Form */}
              <form onSubmit={handleConfirmAssignWork} className="space-y-3.5">
                <div>
                  <label className="block text-xs font-bold text-[#F1F5F9] mb-1">Task / Deliverable Title</label>
                  <input
                    type="text"
                    required
                    value={assignForm.taskTitle}
                    onChange={(e) => setAssignForm({ ...assignForm, taskTitle: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-[#2A3446] text-xs font-medium text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
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
                        className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-[#161F2D] hover:bg-slate-200 text-[#F1F5F9] transition-colors cursor-pointer"
                      >
                        + {preset}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-[#F1F5F9] mb-1">Client Account</label>
                    <select
                      value={assignForm.client}
                      onChange={(e) => setAssignForm({ ...assignForm, client: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl border border-[#2A3446] text-xs font-medium text-white bg-[#161F2D]"
                    >
                      <option value="Ryze">Ryze (Starter Growth)</option>
                      <option value="Shanmugaraj">Shanmugaraj (Brand Accelerator)</option>
                      <option value="Aravindan">Aravindan (Custom Retainer)</option>
                      <option value="Luma">Luma Global (Enterprise)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-[#F1F5F9] mb-1">Priority Level</label>
                    <select
                      value={assignForm.priority}
                      onChange={(e) => setAssignForm({ ...assignForm, priority: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl border border-[#2A3446] text-xs font-medium text-white bg-[#161F2D]"
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
                    <label className="block text-xs font-bold text-[#F1F5F9] mb-1">Workload Allocation</label>
                    <div className="grid grid-cols-4 gap-1">
                      {[10, 15, 25, 35].map((pct) => (
                        <button
                          key={pct}
                          type="button"
                          onClick={() => setAssignForm({ ...assignForm, allocationIncrease: pct })}
                          className={`py-1.5 text-center text-xs font-bold rounded-lg border transition-all cursor-pointer ${
                            assignForm.allocationIncrease === pct
                              ? "bg-blue-600 text-white border-blue-600 shadow-2xs"
                              : "bg-[#0B111C] text-[#F1F5F9] border-[#2A3446] hover:bg-[#161F2D]"
                          }`}
                        >
                          +{pct}%
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-[#F1F5F9] mb-1">Sprint Target Deadline</label>
                    <input
                      type="text"
                      value={assignForm.deadline}
                      onChange={(e) => setAssignForm({ ...assignForm, deadline: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl border border-[#2A3446] text-xs font-medium text-white"
                      placeholder="e.g. Friday, Sprint 08"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#F1F5F9] mb-1">Deliverable Scope & Brief</label>
                  <textarea
                    rows={2}
                    value={assignForm.brief}
                    onChange={(e) => setAssignForm({ ...assignForm, brief: e.target.value })}
                    className="w-full px-3.5 py-2 rounded-xl border border-[#2A3446] text-xs text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                    placeholder="Brief instructions, deliverables checklist, links to Figma/Drive..."
                  />
                </div>

                {/* Submit Row */}
                <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#2A3446]">
                  <button
                    type="button"
                    onClick={() => setAssignModalMember(null)}
                    className="px-4 py-2.5 rounded-xl border border-[#2A3446] text-xs font-bold text-[#F1F5F9] hover:bg-[#0B111C] cursor-pointer transition-colors"
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
              className="relative w-full max-w-2xl rounded-3xl bg-[#161F2D] p-6 sm:p-8 shadow-2xl border border-[#2A3446] flex flex-col space-y-5 max-h-[92vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
              role="dialog"
              aria-modal="true"
            >
              {/* Header */}
              <div className="flex items-center justify-between border-b border-[#2A3446] pb-4">
                <div className="flex items-center gap-3">
                  <div className="size-12 rounded-2xl bg-rose-500 text-white font-black text-base flex items-center justify-center shadow-md">
                    {scheduleModalMember.name.split(" ").map((n) => n[0]).join("")}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-lg font-black text-white tracking-tight">{scheduleModalMember.name}</h3>
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                        ● {scheduleModalMember.status}
                      </span>
                    </div>
                    <p className="text-xs text-[#97A0B3] font-medium">{scheduleModalMember.role} • {scheduleModalMember.email}</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setScheduleModalMember(null)}
                  className="size-8 rounded-full bg-[#161F2D] hover:bg-slate-200 text-[#97A0B3] flex items-center justify-center transition-colors cursor-pointer"
                >
                  <X className="size-4" />
                </button>
              </div>

              {/* Capacity Overview Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="bg-[#0B111C] p-3.5 rounded-2xl border border-[#2A3446]">
                  <span className="text-[10px] uppercase font-bold text-[#97A0B3] block tracking-wider">ALLOCATED LOAD</span>
                  <div className="text-xl font-black text-white mt-0.5">{scheduleModalMember.allocatedPct}%</div>
                  <span className="text-[10px] text-rose-600 font-bold">Max Capacity</span>
                </div>
                <div className="bg-[#0B111C] p-3.5 rounded-2xl border border-[#2A3446]">
                  <span className="text-[10px] uppercase font-bold text-[#97A0B3] block tracking-wider">ACTIVE ENGAGEMENTS</span>
                  <div className="text-xl font-black text-white mt-0.5">{scheduleModalMember.projectsCount} Projects</div>
                  <span className="text-[10px] text-[#7FA0D6] font-bold">2 in Final Review</span>
                </div>
                <div className="bg-[#0B111C] p-3.5 rounded-2xl border border-[#2A3446]">
                  <span className="text-[10px] uppercase font-bold text-[#97A0B3] block tracking-wider">NEXT OPEN SLOT</span>
                  <div className="text-xl font-black text-white mt-0.5">In 4 Days</div>
                  <span className="text-[10px] text-emerald-600 font-bold">Sprint Cycle 09</span>
                </div>
              </div>

              {/* Weekly Calendar Schedule Timeline */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs font-bold text-white">
                  <span>Weekly Time Allocation (Mon – Fri)</span>
                  <span className="text-[#7FA0D6] font-semibold">38.0h Total Booked</span>
                </div>
                <div className="grid grid-cols-5 gap-2">
                  {[
                    { day: "Mon", hours: "8.0h", task: "Ryze 3D Renders", bg: "bg-[#7FA0D6]/15 text-[#7FA0D6] border-[#7FA0D6]/30" },
                    { day: "Tue", hours: "7.5h", task: "Aravindan Motion", bg: "bg-purple-50 text-purple-700 border-purple-200" },
                    { day: "Wed", hours: "8.0h", task: "Shanmugaraj Intro", bg: "bg-emerald-50 text-emerald-700 border-emerald-200" },
                    { day: "Thu", hours: "8.0h", task: "Luma Teaser", bg: "bg-amber-50 text-amber-700 border-amber-200" },
                    { day: "Fri", hours: "6.5h", task: "Sprint Quality QA", bg: "bg-sky-50 text-sky-700 border-sky-200" },
                  ].map((item) => (
                    <div key={item.day} className="p-2.5 rounded-xl border border-[#2A3446] bg-[#0B111C] flex flex-col justify-between text-center gap-1.5">
                      <span className="text-[11px] font-black text-[#F1F5F9]">{item.day}</span>
                      <span className="text-xs font-black text-white">{item.hours}</span>
                      <span className={`text-[9px] font-bold p-1 rounded-md border truncate ${item.bg}`}>
                        {item.task}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Active Deliverables Breakdown */}
              <div className="space-y-2.5">
                <h4 className="text-xs font-bold text-white">Active Deliverables & Status</h4>
                <div className="space-y-2">
                  {[
                    { client: "Ryze", name: "3D Asset Render Batch #12", due: "Due in 2 days", progress: 90, color: "bg-blue-600" },
                    { client: "Vanguard Mobility", name: "4K Motion Sequence & Audio Sync", due: "Due Friday", progress: 65, color: "bg-purple-600" },
                    { client: "Aravindan", name: "Brand Intro Animation Loop", due: "Due Next Tue", progress: 35, color: "bg-emerald-600" },
                    { client: "Shanmugaraj", name: "Product Showcase 9:16 Cut", due: "Due Next Fri", progress: 15, color: "bg-amber-600" },
                  ].map((proj) => (
                    <div key={proj.name} className="p-3 rounded-xl border border-[#2A3446] bg-[#161F2D] hover:border-[#2A3446] transition-colors flex items-center justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-white truncate">{proj.name}</span>
                          <span className="text-[10px] font-bold text-[#97A0B3]">({proj.client})</span>
                        </div>
                        <div className="w-full bg-[#161F2D] rounded-full h-1.5 mt-2 overflow-hidden">
                          <div className={`h-full rounded-full ${proj.color}`} style={{ width: `${proj.progress}%` }} />
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <span className="text-[10px] font-bold text-[#97A0B3] block">{proj.due}</span>
                        <span className="text-xs font-black text-white">{proj.progress}%</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Modal Footer Controls */}
              <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-[#2A3446]">
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
                    className="px-4 py-2.5 rounded-xl border border-[#2A3446] hover:bg-[#0B111C] text-[#F1F5F9] text-xs font-bold transition-colors cursor-pointer"
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
              className="relative w-full max-w-md rounded-3xl bg-[#161F2D] p-6 sm:p-8 shadow-2xl border border-[#2A3446] flex flex-col items-center text-center animate-in zoom-in-95 duration-150"
              onClick={(e) => e.stopPropagation()}
              role="dialog"
              aria-modal="true"
            >
              <button
                type="button"
                onClick={() => setSuccessPopup(null)}
                className="absolute top-4 right-4 size-8 rounded-full bg-[#161F2D] hover:bg-slate-200 text-[#97A0B3] hover:text-[#F1F5F9] flex items-center justify-center transition-colors cursor-pointer"
                aria-label="Close modal"
              >
                <X className="size-4" />
              </button>

              <div className="size-16 rounded-3xl bg-emerald-50 text-emerald-600 ring-8 ring-emerald-50/60 flex items-center justify-center mb-4 shadow-inner">
                <CheckCircle2 className="size-8" />
              </div>

              <h3 className="text-xl font-black text-white tracking-tight">{successPopup.title}</h3>
              <p className="text-xs sm:text-sm text-[#F1F5F9] mt-2 leading-relaxed max-w-sm">{successPopup.message}</p>

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
              className="relative w-full max-w-lg rounded-3xl bg-[#161F2D] p-6 sm:p-7 shadow-2xl border border-[#2A3446] flex flex-col space-y-4 max-h-[92vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
              role="dialog"
              aria-modal="true"
            >
              {/* Header */}
              <div className="flex items-center justify-between border-b border-[#2A3446] pb-3">
                <div className="flex items-center gap-2.5">
                  <div className="size-9 rounded-2xl bg-[#7FA0D6]/15 text-[#7FA0D6] flex items-center justify-center font-black text-sm">
                    <Users className="size-4.5" />
                  </div>
                  <div>
                    <h3 className="text-base font-black text-white tracking-tight">
                      Add Team Specialist to {activePod?.name || "Sprint Pod"}
                    </h3>
                    <p className="text-[11px] text-[#97A0B3] font-medium">
                      Provision creative talent, set role capabilities & sprint track
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setIsAddMemberOpen(false)}
                  className="size-8 rounded-full bg-[#161F2D] hover:bg-slate-200 text-[#97A0B3] flex items-center justify-center transition-colors cursor-pointer"
                >
                  <X className="size-4" />
                </button>
              </div>

              {/* Add Member Form */}
              <form onSubmit={handleCreateTeamMember} className="space-y-3.5">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-[#F1F5F9] mb-1">Full Name *</label>
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
                      className="w-full px-3.5 py-2.5 rounded-xl border border-[#2A3446] text-xs text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 font-medium"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-[#F1F5F9] mb-1">Email Address</label>
                    <input
                      type="email"
                      required
                      value={newMemberForm.email}
                      onChange={(e) => setNewMemberForm({ ...newMemberForm, email: e.target.value })}
                      placeholder="e.g. jordan.m@creo.agency"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-[#2A3446] text-xs text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 font-medium"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-[#F1F5F9] mb-1">Role Title</label>
                    <input
                      type="text"
                      required
                      value={newMemberForm.role}
                      onChange={(e) => setNewMemberForm({ ...newMemberForm, role: e.target.value })}
                      placeholder="e.g. Senior Visual Designer"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-[#2A3446] text-xs text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 font-medium"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-[#F1F5F9] mb-1">Slack / Agency Handle</label>
                    <input
                      type="text"
                      value={newMemberForm.handle}
                      onChange={(e) => setNewMemberForm({ ...newMemberForm, handle: e.target.value })}
                      placeholder="e.g. @jmiller"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-[#2A3446] text-xs text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 font-medium"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-[#F1F5F9] mb-1">Role Track Category</label>
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
                      className="w-full px-3 py-2.5 rounded-xl border border-[#2A3446] text-xs font-medium text-white bg-[#161F2D]"
                    >
                      <option value="designer">🎨 Designer (UI, 3D, Brand)</option>
                      <option value="editor">✂️ Video & Motion Editor</option>
                      <option value="videographer">🎥 Cinematographer & Videographer</option>
                      <option value="photographer">📷 Commercial Photographer</option>
                      <option value="lead">👑 Pod Lead & Strategist</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-[#F1F5F9] mb-1">Assign Sprint Pod</label>
                    <select
                      value={newMemberForm.podId}
                      onChange={(e) => setNewMemberForm({ ...newMemberForm, podId: e.target.value })}
                      className="w-full px-3 py-2.5 rounded-xl border border-[#2A3446] text-xs font-medium text-white bg-[#161F2D]"
                    >
                      <option value="pod-a">Pod A • Enterprise Brand & Design</option>
                      <option value="pod-b">Pod B • Performance & Video</option>
                      <option value="pod-c">Pod C • 3D Motion & VFX</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#F1F5F9] mb-1">Core Capabilities (comma separated)</label>
                  <input
                    type="text"
                    value={newMemberForm.capabilities}
                    onChange={(e) => setNewMemberForm({ ...newMemberForm, capabilities: e.target.value })}
                    placeholder="e.g. Figma Tokens, Cinema 4D, Color Grading, Kinetic Typography"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-[#2A3446] text-xs text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 font-medium"
                  />
                </div>

                {/* Submit Row */}
                <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#2A3446]">
                  <button
                    type="button"
                    onClick={() => setIsAddMemberOpen(false)}
                    className="px-4 py-2.5 rounded-xl border border-[#2A3446] text-xs font-bold text-[#F1F5F9] hover:bg-[#0B111C] cursor-pointer transition-colors"
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

  const { data: dbLeaves = [], refetch } = useQuery({
    queryKey: ["admin_leave_requests"],
    queryFn: fetchLeaveRequests,
  });

  const [localOverrides, setLocalOverrides] = useState<Record<string, "approved" | "rejected">>({});

  const leaveRequests = dbLeaves.map((lr) => ({
    ...lr,
    status: localOverrides[lr.id] || lr.status,
  }));

  const handleAction = async (id: string, action: "approved" | "rejected") => {
    setLocalOverrides((prev) => ({ ...prev, [id]: action }));
    try {
      if (action === "approved") {
        await approveLeaveRequest(id);
      } else {
        await rejectLeaveRequest(id);
      }
      refetch();
    } catch {
      // Keep optimistic UI
    }
    setToast(`Leave request ${action} successfully.`);
    setTimeout(() => setToast(null), 3000);
  };

  const filteredRequests = leaveRequests.filter(
    (lr) => filterTab === "all" || lr.status === filterTab
  );

  const onLeaveCount = leaveRequests.filter((l) => l.status === "approved").length;
  const inOfficeCount = Math.max(0, 9 - onLeaveCount);

  return (
    <div data-surface="ops" className="w-full min-h-screen font-sans bg-[#0B111C] flex flex-col">
      <AdminTopHeader activeTab="Team Details" />
      <main className="flex-1 px-6 lg:px-8 pt-4 pb-16 max-w-[1500px] w-full mx-auto space-y-8">
        {toast && (
          <div className="p-4 bg-emerald-950/40 border border-emerald-800/50 text-emerald-300 text-xs font-bold rounded-2xl flex items-center justify-between shadow-xl backdrop-blur-md animate-fade-in">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span>{toast}</span>
            </div>
            <button onClick={() => setToast(null)} className="text-emerald-400 hover:text-emerald-200 font-bold cursor-pointer">
              Dismiss
            </button>
          </div>
        )}

        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[#2A3446] pb-4">

          <div className="flex items-center gap-3">
            <Link
              to="/admin/team"
              className="px-3.5 py-2 rounded-xl bg-[#161F2D] hover:bg-slate-200 text-white text-xs font-bold flex items-center gap-1.5 transition-colors"
            >
              <UserCog className="w-4 h-4 text-[#97A0B3]" /> Team Roster
            </Link>
            <button
              type="button"
              onClick={() => setIsApplyModalOpen(true)}
              className="px-4 py-2 rounded-xl bg-[#7FA0D6] hover:bg-[#7FA0D6] text-white text-xs font-bold flex items-center gap-1.5 shadow-sm cursor-pointer"
            >
              <Plus className="w-4 h-4" /> Apply for Leave
            </button>
          </div>
        </div>

        {/* 2 Top KPI Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-[#161F2D] rounded-3xl p-6 border border-[#2A3446] shadow-[0_4px_20px_rgba(0,0,0,0.03)] flex flex-col justify-between">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-bold text-[#97A0B3] uppercase tracking-wider">
                PEOPLE WORKING TODAY
              </span>
              <div className="w-8 h-8 rounded-xl bg-[#7FA0D6]/15 text-[#7FA0D6] flex items-center justify-center font-bold">
                <Users className="w-4 h-4" />
              </div>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-black text-white tracking-tight">{inOfficeCount}</span>
              <span className="text-xs font-semibold text-[#97A0B3]">Active in Pods</span>
            </div>
            <div className="mt-6 pt-4 border-t border-[#2A3446] flex items-center justify-between text-xs font-semibold text-[#97A0B3]">
              <span className="flex items-center gap-1.5 text-emerald-600">
                <span className="w-2 h-2 rounded-full bg-emerald-600" /> 9 Total Pod Specialists
              </span>
              <span className="text-white font-bold">{Math.round((inOfficeCount / 9) * 100)}% In-Office</span>
            </div>
          </div>

          <div className="bg-[#161F2D] rounded-3xl p-6 border border-[#2A3446] shadow-[0_4px_20px_rgba(0,0,0,0.03)] flex flex-col justify-between">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-bold text-[#97A0B3] uppercase tracking-wider">
                ON LEAVE TODAY
              </span>
              <div className="w-8 h-8 rounded-xl bg-[#7FA0D6]/15 text-[#7FA0D6] flex items-center justify-center font-bold">
                <Plane className="w-4 h-4" />
              </div>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-black text-white tracking-tight">{onLeaveCount}</span>
              <span className="text-xs font-semibold text-[#97A0B3]">Specialists Away</span>
            </div>
            <div className="mt-6 pt-4 border-t border-[#2A3446] flex items-center justify-between text-xs font-semibold text-[#97A0B3]">
              <span className="text-[#97A0B3]">Pod A, B, C Active</span>
              <span className="text-emerald-500 font-bold">{onLeaveCount === 0 ? "Full Capacity" : `${onLeaveCount} on leave`}</span>
            </div>
          </div>
        </div>

        {/* Requests Table */}
        <div className="rounded-2xl border border-[#2A3446] bg-[#161F2D] shadow-sm overflow-hidden">
          <div className="p-4 border-b border-[#2A3446] flex items-center justify-between bg-[#0B111C]/50">
            <div className="flex items-center gap-1.5 bg-[#161F2D] p-1 rounded-xl text-xs">
              {(["all", "pending", "approved", "rejected"] as const).map((tab) => (
                <button
                  key={tab}
                  type="button"
                  onClick={() => setFilterTab(tab)}
                  className={`px-3 py-1 rounded-lg capitalize font-bold transition-all cursor-pointer ${
                    filterTab === tab ? "bg-[#161F2D] text-white shadow-xs" : "text-[#97A0B3]"
                  }`}
                >
                  {tab}
                </button>
              ))}
            </div>
          </div>

          <table className="w-full text-left text-xs text-white">
            <thead className="bg-[#0B111C] border-b border-[#2A3446] text-[11px] font-bold uppercase tracking-wider text-[#97A0B3]">
              <tr>
                <th className="px-5 py-3.5">Specialist</th>
                <th className="px-5 py-3.5">Dates</th>
                <th className="px-5 py-3.5">Reason</th>
                <th className="px-5 py-3.5">Status</th>
                <th className="px-5 py-3.5 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 font-medium">
              {filteredRequests.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-5 py-8 text-center text-[#97A0B3] text-xs font-medium">
                    No leave requests found
                  </td>
                </tr>
              ) : (
                filteredRequests.map((lr) => (
                <tr key={lr.id} className="hover:bg-[#0B111C]/60">
                  <td className="px-5 py-4">
                    <div className="font-bold text-white">{lr.user_name || (lr as any).name || "Team Member"}</div>
                    <div className="text-[11px] text-[#97A0B3]">{lr.user_role || (lr as any).department || "Specialist"}</div>
                  </td>
                  <td className="px-5 py-4 font-mono text-[11px]">
                    <div>{lr.start_date || (lr as any).startDate} to {lr.end_date || (lr as any).endDate}</div>
                  </td>
                  <td className="px-5 py-4 text-[#F1F5F9] max-w-xs">{lr.reason}</td>
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
                    {lr.status === "pending" && (
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          type="button"
                          onClick={() => handleAction(lr.id, "approved")}
                          className="px-2.5 py-1 rounded-lg bg-emerald-600 text-white font-bold text-[11px] hover:bg-emerald-700 transition-colors"
                        >
                          Approve
                        </button>
                        <button
                          type="button"
                          onClick={() => handleAction(lr.id, "rejected")}
                          className="px-2.5 py-1 rounded-lg bg-rose-600 text-white font-bold text-[11px] hover:bg-rose-700 transition-colors"
                        >
                          Reject
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Apply Modal */}
        {isApplyModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm animate-fade-in">
            <div className="w-full max-w-md rounded-2xl bg-[#161F2D] p-6 shadow-2xl space-y-4 border border-[#2A3446]">
              <div className="flex items-center justify-between border-b border-[#2A3446] pb-3">
                <h3 className="text-base font-bold text-white">Apply for Time Off</h3>
                <button
                  type="button"
                  onClick={() => setIsApplyModalOpen(false)}
                  className="p-1 rounded-lg text-[#97A0B3] hover:text-[#F1F5F9] cursor-pointer"
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
                    <label className="block text-xs font-bold text-[#F1F5F9] mb-1">Start Date</label>
                    <input type="date" required className="w-full px-3 py-2 rounded-xl border border-[#2A3446] text-xs" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-[#F1F5F9] mb-1">End Date</label>
                    <input type="date" required className="w-full px-3 py-2 rounded-xl border border-[#2A3446] text-xs" />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-bold text-[#F1F5F9] mb-1">Reason</label>
                  <textarea rows={3} required placeholder="State reason for time off..." className="w-full px-3 py-2 rounded-xl border border-[#2A3446] text-xs resize-none" />
                </div>
                <div className="flex justify-end gap-2 pt-2 border-t border-[#2A3446]">
                  <button type="button" onClick={() => setIsApplyModalOpen(false)} className="px-4 py-2 rounded-xl border border-[#2A3446] text-xs font-bold text-[#F1F5F9] hover:bg-[#0B111C]">Cancel</button>
                  <button type="submit" className="px-4 py-2 rounded-xl bg-[#7FA0D6] text-xs font-bold text-white hover:bg-[#7FA0D6]">Submit</button>
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
  clientEmail?: string;
  targetTopic: string;
  proposedOffer: string | null;
  phoneNumber: string;
  preferredTime: string;
  notes: string | null;
  requestedAt: string | null;
  status: "Pending Review" | "Accepted" | "Declined" | "Counter Offered";
  counterPrice?: number | null;
  counterNote?: string | null;
  declineReason?: string | null;
}

export function AdminRevenuePage() {
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

  // Transactions Data (Populated active billing roster)
  const [transactions, setTransactions] = useState<TransactionItem[]>([
    {
      id: "INV-2026-088",
      client: "Ryze Mushroom Coffee",
      clientInitials: "RM",
      scope: "Enterprise Retainer Billing (Oct 2026)",
      amount: 120000,
      method: "Direct Wire / ACH",
      status: "Paid",
      date: "Oct 1, 2026",
      badgeClass: "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 font-black",
      avatarBg: "bg-blue-600 text-white font-black",
    },
    {
      id: "INV-2026-087",
      client: "Acme Corp",
      clientInitials: "AC",
      scope: "Growth Retainer Billing (Oct 2026)",
      amount: 25000,
      method: "Cards / Razorpay",
      status: "Paid",
      date: "Oct 1, 2026",
      badgeClass: "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 font-black",
      avatarBg: "bg-emerald-600 text-white font-black",
    },
    {
      id: "INV-2026-086",
      client: "Kavya Organics",
      clientInitials: "KO",
      scope: "Brand Acceleration Package",
      amount: 50000,
      method: "Direct Wire / ACH",
      status: "Paid",
      date: "Sep 28, 2026",
      badgeClass: "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 font-black",
      avatarBg: "bg-purple-600 text-white font-black",
    },
    {
      id: "INV-2026-085",
      client: "Ryze Mushroom Coffee",
      clientInitials: "RM",
      scope: "3D Render Asset Package Add-on",
      amount: 45000,
      method: "Cards / Razorpay",
      status: "Paid",
      date: "Sep 25, 2026",
      badgeClass: "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 font-black",
      avatarBg: "bg-blue-600 text-white font-black",
    },
    {
      id: "INV-2026-084",
      client: "Urbanic Fashion",
      clientInitials: "UF",
      scope: "Performance Marketing Retainer Deposit",
      amount: 95000,
      method: "Direct Wire / ACH",
      status: "Paid",
      date: "Sep 20, 2026",
      badgeClass: "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 font-black",
      avatarBg: "bg-amber-600 text-white font-black",
    },
    {
      id: "INV-2026-083",
      client: "Zenith Fitness",
      clientInitials: "ZF",
      scope: "Q4 Retainer Renewal Advance",
      amount: 85000,
      method: "Direct Wire / ACH",
      status: "Pending",
      date: "Due Net 15",
      badgeClass: "bg-amber-500/20 text-amber-400 border border-amber-500/30 font-bold",
      avatarBg: "bg-[#7FA0D6] text-white font-black",
    },
  ]);

  const totalMrr = transactions.reduce((acc, t) => acc + (t.status === "Paid" ? t.amount : 0), 0);
  const totalCollected = totalMrr;
  const projectedArr = totalMrr * 12;

  // Chart Trend Data (Monthly Trend)

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
      badgeClass: "bg-[#7FA0D6]/15 text-[#7FA0D6] border-[#7FA0D6]/30",
      avatarBg: "bg-[#7FA0D6]/20 text-blue-800",
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
    <div data-surface="ops" className="w-full min-h-screen font-sans bg-[#0B111C] flex flex-col">
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
            <button
              type="button"
              onClick={handleExportCSV}
              className="px-4 py-2 rounded-xl bg-[#161F2D] border border-[#2A3446] text-[#F1F5F9] hover:bg-[#0B111C] text-xs font-bold flex items-center gap-1.5 shadow-2xs cursor-pointer"
            >
              <Download className="w-4 h-4 text-[#97A0B3]" /> Export Report
            </button>

            <button
              type="button"
              onClick={() => setIsCreateInvoiceOpen(true)}
              className="px-4 py-2 rounded-xl bg-[#7FA0D6] hover:bg-blue-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-md shadow-blue-500/20 cursor-pointer transition-all"
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
          <div className="bg-[#161F2D] rounded-3xl p-6 lg:p-7 border border-[#2A3446] shadow-[0_4px_25px_rgba(0,0,0,0.03)] flex items-center justify-between">
            <div className="space-y-2">
              <span className="text-[11px] font-extrabold text-[#97A0B3] uppercase tracking-wider">
                Total Revenue (MRR)
              </span>
              <div className="flex items-baseline gap-3">
                <span className="text-4xl font-black text-white tracking-tight">₹{totalMrr.toLocaleString('en-IN')}</span>
                <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-[#7FA0D6]/15 text-[#7FA0D6] border border-[#7FA0D6]/30 flex items-center gap-1">
                  Active Retainers
                </span>
              </div>
              <div className="text-xs text-[#97A0B3] font-medium pt-1">
                Projected ARR: <strong className="text-white font-bold">₹{projectedArr.toLocaleString('en-IN')}</strong>
              </div>
            </div>
            <div className="w-14 h-14 rounded-2xl bg-[#7FA0D6]/15 text-[#7FA0D6] flex items-center justify-center shrink-0 border border-[#7FA0D6]/30 font-black text-2xl">
              ₹
            </div>
          </div>

          {/* Metric 2: Collected this Month */}
          <div className="bg-[#161F2D] rounded-3xl p-6 lg:p-7 border border-[#2A3446] shadow-[0_4px_25px_rgba(0,0,0,0.03)] flex items-center justify-between">
            <div className="space-y-2">
              <span className="text-[11px] font-extrabold text-[#97A0B3] uppercase tracking-wider">
                Collected this Month
              </span>
              <div className="flex items-baseline gap-3">
                <span className="text-4xl font-black text-white tracking-tight">₹{totalCollected.toLocaleString('en-IN')}</span>
                <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-[#7FA0D6]/15 text-[#7FA0D6] border border-[#7FA0D6]/30">
                  {transactions.length > 0 ? `${Math.round((transactions.filter(t => t.status === "Paid").length / transactions.length) * 100)}% Rate` : "0% Rate"}
                </span>
              </div>
              <div className="text-xs text-[#97A0B3] font-medium pt-1">
                Settlement Ratio: <strong className="text-white font-bold">{transactions.filter(t => t.status === "Paid").length} of {transactions.length} Invoices</strong>
              </div>
            </div>
            <div className="w-14 h-14 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0 border border-emerald-100">
              <CheckCircle2 className="w-7 h-7" />
            </div>
          </div>
        </div>

        {/* ─────────────────────────────────────────────────────────────────────────────
            CHARTS & TIER BREAKDOWN GRID
        ───────────────────────────────────────────────────────────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Revenue Growth & Trajectory (2 Cols - Bar Chart matching Dashboard) */}
          <div className="lg:col-span-2 bg-[#161F2D] rounded-3xl p-6 lg:p-8 border border-[#2A3446] shadow-xl space-y-6 flex flex-col justify-between">
            <div>
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="text-lg font-bold text-white tracking-tight">Revenue Growth & Trajectory</h3>
                  <p className="text-xs text-[#97A0B3]">Live cash flow across retainers & client billing</p>
                </div>

                <div className="flex items-center gap-4 text-xs font-bold">
                  <span className="flex items-center gap-1.5 text-[#7FA0D6]">
                    <span className="w-2.5 h-2.5 rounded-full bg-[#7FA0D6]" /> Actual Inflow
                  </span>
                  <span className="flex items-center gap-1.5 text-[#97A0B3]">
                    <span className="w-2.5 h-2.5 rounded-full bg-[#2A3446]" /> Target Baseline
                  </span>
                </div>
              </div>

              {/* Peak Marker Badge */}
              <div className="flex justify-end mb-2">
                <span className="px-3 py-1 rounded-full text-[11px] font-black bg-[#7FA0D6] text-white shadow-md">
                  ₹{totalMrr > 0 ? totalMrr.toLocaleString('en-IN') : "24,80,000"} Current MRR
                </span>
              </div>

              {/* Recharts Bar Chart (Matching Dashboard Bar Graph) */}
              <div className="w-full h-64 bg-[#0B111C]/60 rounded-2xl p-4 border border-[#2A3446]/60">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={[
                      { name: "May", revenue: 14500000 },
                      { name: "Jun", revenue: 18200000 },
                      { name: "Jul", revenue: 16800000 },
                      { name: "Aug", revenue: 21500000 },
                      { name: "Sep", revenue: 19400000 },
                      { name: "Oct", revenue: 24800000 },
                    ]}
                    margin={{ top: 10, right: 10, left: -15, bottom: 0 }}
                    barCategoryGap="20%"
                  >
                    <defs>
                      <linearGradient id="revenueBarGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#BCCCE6" stopOpacity={1} />
                        <stop offset="45%" stopColor="#7FA0D6" stopOpacity={0.85} />
                        <stop offset="100%" stopColor="#2A3446" stopOpacity={0.35} />
                      </linearGradient>
                      <linearGradient id="revenueBarGradPeak" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#FFFFFF" stopOpacity={1} />
                        <stop offset="35%" stopColor="#BCCCE6" stopOpacity={1} />
                        <stop offset="100%" stopColor="#7FA0D6" stopOpacity={0.85} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#2A3446" opacity={0.35} />
                    <XAxis
                      dataKey="name"
                      tick={{ fontSize: 11, fill: "#97A0B3", fontWeight: 600 }}
                      axisLine={false}
                      tickLine={false}
                      dy={3}
                    />
                    <YAxis
                      tick={{ fontSize: 10, fill: "#97A0B3" }}
                      axisLine={false}
                      tickLine={false}
                      tickFormatter={(v: number) =>
                        v >= 10000000
                          ? `₹${(v / 10000000).toFixed(1)}Cr`
                          : v >= 100000
                          ? `₹${(v / 100000).toFixed(0)}L`
                          : `₹${v}`
                      }
                    />
                    <Tooltip
                      formatter={(val: any) => [`₹${(Number(val) / 100).toLocaleString('en-IN')}`, "Revenue"]}
                      contentStyle={{ backgroundColor: "#0B111C", borderRadius: "12px", border: "1px solid #2A3446", color: "#F1F5F9", boxShadow: "0 10px 25px rgba(0,0,0,0.5)" }}
                      itemStyle={{ color: "#7FA0D6", fontWeight: "bold" }}
                      labelStyle={{ color: "#97A0B3", fontSize: "11px", fontWeight: "bold" }}
                      cursor={false}
                    />
                    <Bar dataKey="revenue" radius={[8, 8, 3, 3]} maxBarSize={28}>
                      {[
                        { name: "May", revenue: 14500000 },
                        { name: "Jun", revenue: 18200000 },
                        { name: "Jul", revenue: 16800000 },
                        { name: "Aug", revenue: 21500000 },
                        { name: "Sep", revenue: 19400000 },
                        { name: "Oct", revenue: 24800000 },
                      ].map((entry, index) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={entry.revenue === 24800000 ? "url(#revenueBarGradPeak)" : "url(#revenueBarGrad)"}
                          className="transition-all duration-200 hover:brightness-125 cursor-pointer"
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Bottom Metrics Bar */}
            <div className="pt-4 border-t border-[#2A3446] grid grid-cols-2 sm:grid-cols-4 gap-4 text-center">
              <div className="bg-[#0B111C] p-3 rounded-2xl border border-[#2A3446]">
                <span className="text-[10px] font-bold text-[#97A0B3] uppercase">Invoiced</span>
                <div className="text-sm font-black text-white">₹{totalMrr > 0 ? totalMrr.toLocaleString('en-IN') : "24,80,000"}</div>
              </div>
              <div className="bg-[#0B111C] p-3 rounded-2xl border border-[#2A3446]">
                <span className="text-[10px] font-bold text-[#97A0B3] uppercase">Direct UPI / Wire</span>
                <div className="text-sm font-black text-white">₹{totalCollected > 0 ? totalCollected.toLocaleString('en-IN') : "14,50,000"}</div>
              </div>
              <div className="bg-[#0B111C] p-3 rounded-2xl border border-[#2A3446]">
                <span className="text-[10px] font-bold text-[#97A0B3] uppercase">Cards / Razorpay</span>
                <div className="text-sm font-black text-white">₹{totalCollected > 0 ? totalCollected.toLocaleString('en-IN') : "10,30,000"}</div>
              </div>
              <div className="bg-[#0B111C] p-3 rounded-2xl border border-[#2A3446]">
                <span className="text-[10px] font-bold text-[#97A0B3] uppercase">Disputed / Refunded</span>
                <div className="text-sm font-black text-emerald-400">₹0</div>
              </div>
            </div>
          </div>

          {/* Plan & Tier Distribution (1 Col - Dark Theme Aligned) */}
          <div className="bg-[#161F2D] rounded-3xl p-6 lg:p-8 border border-[#2A3446] shadow-xl space-y-6 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-lg font-bold text-white tracking-tight">Plan & Tier Distribution</h3>
                  <p className="text-xs text-[#97A0B3]">Active monthly retainers by package tier</p>
                </div>
                <button
                  type="button"
                  title="Refresh Tiers"
                  onClick={() => {
                    setToast("Plan tier metrics refreshed.");
                    setTimeout(() => setToast(null), 2500);
                  }}
                  className="p-2 rounded-xl hover:bg-[#161F2D] text-[#97A0B3] hover:text-[#F1F5F9] cursor-pointer transition-colors"
                >
                  <RefreshCw className="w-4 h-4" />
                </button>
              </div>

              {/* Tiers List (Dark Ops Color Theme) */}
              <div className="space-y-4">
                {/* Package 1 */}
                <div className="space-y-2 p-3.5 bg-[#0B111C] rounded-2xl border border-[#2A3446]">
                  <div className="flex items-center justify-between text-xs font-bold">
                    <span className="flex items-center gap-2 text-white">
                      <span className="w-2.5 h-2.5 rounded-full bg-[#7FA0D6]" /> Package 1 (Enterprise Domination)
                    </span>
                    <span className="text-white font-black">₹95,000 <span className="text-[10px] font-normal text-[#97A0B3]">/ mo</span></span>
                  </div>
                  <div className="w-full bg-[#161F2D] rounded-full h-2 overflow-hidden">
                    <div className="bg-[#7FA0D6] h-full rounded-full w-[46.8%]" />
                  </div>
                  <div className="flex justify-between text-[11px] text-[#97A0B3] font-semibold">
                    <span>2 Retainer Accounts</span>
                    <span className="text-[#7FA0D6] font-bold">46.8% of MRR</span>
                  </div>
                </div>

                {/* Package 2 */}
                <div className="space-y-2 p-3.5 bg-[#0B111C] rounded-2xl border border-[#2A3446]">
                  <div className="flex items-center justify-between text-xs font-bold">
                    <span className="flex items-center gap-2 text-white">
                      <span className="w-2.5 h-2.5 rounded-full bg-[#BCCCE6]" /> Package 2 (Brand Accelerator)
                    </span>
                    <span className="text-white font-black">₹50,000 <span className="text-[10px] font-normal text-[#97A0B3]">/ mo</span></span>
                  </div>
                  <div className="w-full bg-[#161F2D] rounded-full h-2 overflow-hidden">
                    <div className="bg-[#BCCCE6] h-full rounded-full w-[36.7%]" />
                  </div>
                  <div className="flex justify-between text-[11px] text-[#97A0B3] font-semibold">
                    <span>3 Retainer Accounts</span>
                    <span className="text-[#BCCCE6] font-bold">36.7% of MRR</span>
                  </div>
                </div>

                {/* Package 3 */}
                <div className="space-y-2 p-3.5 bg-[#0B111C] rounded-2xl border border-[#2A3446]">
                  <div className="flex items-center justify-between text-xs font-bold">
                    <span className="flex items-center gap-2 text-white">
                      <span className="w-2.5 h-2.5 rounded-full bg-[#D8BF9B]" /> Package 3 (Starter Growth)
                    </span>
                    <span className="text-white font-black">₹25,000 <span className="text-[10px] font-normal text-[#97A0B3]">/ mo</span></span>
                  </div>
                  <div className="w-full bg-[#161F2D] rounded-full h-2 overflow-hidden">
                    <div className="bg-[#D8BF9B] h-full rounded-full w-[16.5%]" />
                  </div>
                  <div className="flex justify-between text-[11px] text-[#97A0B3] font-semibold">
                    <span>2 Retainer Accounts</span>
                    <span className="text-[#D8BF9B] font-bold">16.5% of MRR</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Sub-card: Add-ons & Overages */}
            <div className="p-4 bg-[#0B111C] rounded-2xl border border-[#2A3446] flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#7FA0D6]/15 text-[#7FA0D6] border border-[#7FA0D6]/30 flex items-center justify-center font-bold shrink-0">
                  <Layers className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-bold text-xs text-white">Add-ons & Overages</h4>
                  <p className="text-[11px] text-[#97A0B3] font-medium">3 active add-on asset packages</p>
                </div>
              </div>
              <span className="text-base font-black text-[#7FA0D6]">+₹45,000</span>
            </div>
          </div>
        </div>


        {/* ─────────────────────────────────────────────────────────────────────────────
            RECENT TRANSACTIONS ROSTER TABLE (Matching Image 2)
        ───────────────────────────────────────────────────────────────────────────── */}
        <div className="bg-[#161F2D] rounded-3xl border border-[#2A3446] shadow-[0_4px_30px_rgba(0,0,0,0.04)] p-6 lg:p-8 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <h3 className="text-xl font-black text-white tracking-tight">Recent Transactions</h3>

            <div className="flex flex-wrap items-center gap-3">
              {/* Search */}
              <div className="relative min-w-[240px]">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#97A0B3]" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search client or invoice..."
                  className="w-full pl-9 pr-4 py-2 rounded-xl border border-[#2A3446] text-xs text-white focus:outline-none focus:border-blue-500"
                />
              </div>

              {/* Status Filter Pills */}
              <div className="flex items-center gap-1 bg-[#161F2D] p-1 rounded-xl text-xs font-bold">
                {(["all", "paid", "pending", "overdue"] as const).map((st) => (
                  <button
                    key={st}
                    type="button"
                    onClick={() => setFilter(st)}
                    className={`px-3 py-1.5 rounded-lg capitalize transition-all cursor-pointer ${
                      filter === st ? "bg-[#161F2D] text-white shadow-xs font-black" : "text-[#97A0B3] hover:text-white"
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
                className="px-3.5 py-2 rounded-xl bg-[#7FA0D6]/15 hover:bg-[#7FA0D6]/20 text-[#7FA0D6] text-xs font-bold flex items-center gap-1.5 cursor-pointer border border-[#7FA0D6]/30 transition-colors"
              >
                <Download className="w-3.5 h-3.5" /> Export CSV
              </button>
            </div>
          </div>

          {/* Table matching Image 2 */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-white">
              <thead className="bg-[#0B111C] border-b border-[#2A3446] text-[11px] font-extrabold uppercase tracking-wider text-[#97A0B3]">
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
                {filteredTx.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-5 py-8 text-center text-[#97A0B3] text-xs font-medium">
                      No transactions recorded yet
                    </td>
                  </tr>
                ) : (
                  filteredTx.map((tx) => (
                  <tr key={tx.id} className="hover:bg-[#0B111C]/70 transition-colors">
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <div className={`w-9 h-9 rounded-xl ${tx.avatarBg} font-black text-xs flex items-center justify-center shrink-0`}>
                          {tx.clientInitials}
                        </div>
                        <div>
                          <div className="font-bold text-sm text-white">{tx.client}</div>
                          <div className="text-[11px] text-[#97A0B3]">{tx.scope}</div>
                        </div>
                      </div>
                    </td>

                    <td className="px-5 py-4 font-mono font-bold text-[#F1F5F9]">{tx.id}</td>

                    <td className="px-5 py-4 font-black text-sm text-white">
                      ₹{tx.amount.toLocaleString('en-IN')}
                    </td>

                    <td className="px-5 py-4 text-[#F1F5F9] font-medium">{tx.method}</td>

                    <td className="px-5 py-4">
                      <span className={`px-2.5 py-1 rounded-full text-[11px] font-bold border flex items-center gap-1.5 w-fit ${tx.badgeClass}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${tx.status === "Paid" ? "bg-emerald-500" : "bg-[#7FA0D6]/150"}`} />
                        {tx.status} ({tx.date})
                      </span>
                    </td>

                    <td className="px-5 py-4 text-right">
                      {tx.status === "Paid" ? (
                        <button
                          type="button"
                          onClick={() => setSelectedReceipt(tx)}
                          className="text-[#7FA0D6] font-bold hover:underline inline-flex items-center gap-0.5 cursor-pointer text-xs"
                        >
                          Receipt <ArrowUpRight className="w-3.5 h-3.5" />
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleSendReminder(tx)}
                          className="px-3 py-1.5 rounded-lg bg-[#7FA0D6]/15 hover:bg-[#7FA0D6]/20 text-[#7FA0D6] font-bold text-xs inline-flex items-center gap-1 cursor-pointer"
                        >
                          <Play className="w-3 h-3 fill-current" /> Remind
                        </button>
                      )}
                    </td>
                  </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Table Footer */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-4 border-t border-[#2A3446] text-xs text-[#97A0B3] font-medium">
            <span>Showing {filteredTx.length} of {transactions.length} transactions</span>
          </div>
        </div>


      </main>

      {/* ─────────────────────────────────────────────────────────────────────────────
          MODAL: CREATE INVOICE
      ───────────────────────────────────────────────────────────────────────────── */}
      {isCreateInvoiceOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-md rounded-3xl bg-[#161F2D] p-6 shadow-2xl space-y-4 border border-[#2A3446]">
            <div className="flex items-center justify-between border-b border-[#2A3446] pb-3">
              <h3 className="text-base font-bold text-white">Create New Invoice</h3>
              <button type="button" onClick={() => setIsCreateInvoiceOpen(false)} className="p-1 rounded-lg text-[#97A0B3] hover:text-[#F1F5F9]">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateInvoiceSubmit} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-[#F1F5F9] mb-1">Client Brand Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Acme Corporation"
                  value={newInvClient}
                  onChange={(e) => setNewInvClient(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl border border-[#2A3446] text-xs focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-bold text-[#F1F5F9] mb-1">Deliverable Scope Description</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Enterprise Retainer • Dec 2024"
                  value={newInvScope}
                  onChange={(e) => setNewInvScope(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl border border-[#2A3446] text-xs focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-[#F1F5F9] mb-1">Amount (₹ INR)</label>
                  <input
                    type="number"
                    required
                    placeholder="50000"
                    value={newInvAmount}
                    onChange={(e) => setNewInvAmount(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-xl border border-[#2A3446] text-xs focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block font-bold text-[#F1F5F9] mb-1">Payment Method</label>
                  <select
                    value={newInvMethod}
                    onChange={(e) => setNewInvMethod(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-xl border border-[#2A3446] text-xs font-medium"
                  >
                    <option value="Razorpay UPI">Razorpay UPI</option>
                    <option value="Bank Wire">Bank Wire</option>
                    <option value="Invoice Net 15">Invoice Net 15</option>
                    <option value="Credit / Debit Card">Credit / Debit Card</option>
                  </select>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-[#2A3446]">
                <button
                  type="button"
                  onClick={() => setIsCreateInvoiceOpen(false)}
                  className="px-4 py-2 rounded-xl border border-[#2A3446] font-bold text-[#F1F5F9] hover:bg-[#0B111C]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-[#7FA0D6] text-white font-bold hover:bg-blue-700 shadow-sm"
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
          <div className="w-full max-w-lg rounded-3xl bg-[#161F2D] p-6 lg:p-8 shadow-2xl space-y-6 border border-[#2A3446]">
            <div className="flex items-center justify-between border-b border-[#2A3446] pb-4">
              <div className="flex items-center gap-2">
                <span className="font-black text-xl text-white tracking-tight">creo.</span>
                <span className="text-xs font-bold text-[#97A0B3]">Payment Receipt</span>
              </div>
              <button type="button" onClick={() => setSelectedReceipt(null)} className="p-1 text-[#97A0B3] hover:text-[#F1F5F9]">
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

              <div className="grid grid-cols-2 gap-4 text-[#F1F5F9] font-medium">
                <div>
                  <span className="text-[#97A0B3] block text-[10px] uppercase font-bold">Client</span>
                  <strong className="text-white text-sm">{selectedReceipt.client}</strong>
                </div>
                <div>
                  <span className="text-[#97A0B3] block text-[10px] uppercase font-bold">Invoice Number</span>
                  <strong className="text-white text-sm font-mono">{selectedReceipt.id}</strong>
                </div>
                <div>
                  <span className="text-[#97A0B3] block text-[10px] uppercase font-bold">Payment Method</span>
                  <span className="text-white font-bold">{selectedReceipt.method}</span>
                </div>
                <div>
                  <span className="text-[#97A0B3] block text-[10px] uppercase font-bold">Settlement Date</span>
                  <span className="text-white font-bold">{selectedReceipt.date}</span>
                </div>
              </div>

              <div className="pt-3 border-t border-[#2A3446] space-y-2">
                <span className="text-[#97A0B3] block text-[10px] uppercase font-bold">Scope Breakdown</span>
                <div className="p-3 bg-[#0B111C] rounded-xl flex items-center justify-between font-bold text-white">
                  <span>{selectedReceipt.scope}</span>
                  <span>₹{selectedReceipt.amount.toLocaleString('en-IN')}</span>
                </div>
              </div>

              <div className="pt-2 flex justify-between items-center text-sm font-black text-white border-t border-[#2A3446]">
                <span>Total Settled</span>
                <span className="text-base text-[#7FA0D6]">₹{selectedReceipt.amount.toLocaleString('en-IN')} INR</span>
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => window.print()}
                className="flex-1 py-2.5 rounded-xl border border-[#2A3446] font-bold text-xs text-[#F1F5F9] hover:bg-[#0B111C] flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Printer className="w-4 h-4" /> Print Receipt
              </button>
              <button
                type="button"
                onClick={() => {
                  window.print();
                  setSelectedReceipt(null);
                }}
                className="flex-1 py-2.5 rounded-xl bg-[#7FA0D6] text-white font-bold text-xs hover:bg-blue-700 shadow-sm flex items-center justify-center gap-1.5 cursor-pointer"
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
      subscribers: 1,
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
      price_monthly: 120000,
      currency: "INR",
      subscribers: 1,
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

  // Initial Client Plan Negotiations List
  const INITIAL_NEGOTIATIONS: PlanNegotiationItem[] = [
    {
      id: "neg-101",
      clientName: "Ryze Mushroom Coffee",
      clientLogo: "RM",
      clientEmail: "operations@ryzecoffee.com",
      targetTopic: "Starter Growth → Enterprise Domination Custom Scope",
      proposedOffer: "₹85,000/mo",
      phoneNumber: "+91 98401 99887",
      preferredTime: "IST Evening",
      notes: "Requesting 12h express turnaround SLA with 16 video reels per month.",
      requestedAt: "Oct 2, 2026",
      status: "Pending Review",
    },
    {
      id: "neg-102",
      clientName: "Acme Corp",
      clientLogo: "AC",
      clientEmail: "brand@acme.com",
      targetTopic: "Starter Growth → Brand Accelerator",
      proposedOffer: "₹45,000/mo",
      phoneNumber: "+91 98112 33445",
      preferredTime: "IST Morning",
      notes: "Requested 10% multi-month contract discount.",
      requestedAt: "Sep 28, 2026",
      status: "Counter Offered",
      counterPrice: 48000,
      counterNote: "Counter offered at ₹48,000/mo with dedicated pod lead inclusion.",
    },
    {
      id: "neg-103",
      clientName: "Kavya Organics",
      clientLogo: "KO",
      clientEmail: "hello@kavyaorganics.com",
      targetTopic: "Brand Accelerator → Enterprise Domination",
      proposedOffer: "₹1,10,000/mo",
      phoneNumber: "+91 99001 22334",
      preferredTime: "IST Afternoon",
      notes: "Approved custom enterprise retainer with 3D animation addon.",
      requestedAt: "Sep 25, 2026",
      status: "Accepted",
    },
  ];

  const [negotiations, setNegotiations] = useState<PlanNegotiationItem[]>(INITIAL_NEGOTIATIONS);

  // Fetch negotiations from backend on mount
  useEffect(() => {
    let cancelled = false;
    fetchPlanNegotiations()
      .then((data: PlanNegotiationApiItem[]) => {
        if (cancelled) return;
        if (data && data.length > 0) {
          const mapped: PlanNegotiationItem[] = data.map((n) => ({
            id: n.id,
            clientName: n.clientName,
            clientLogo: n.clientLogo,
            clientEmail: n.clientEmail,
            targetTopic: n.targetTopic,
            proposedOffer: n.proposedOffer,
            phoneNumber: n.phoneNumber,
            preferredTime: n.preferredTime,
            notes: n.notes,
            requestedAt: n.requestedAt,
            status: n.status,
            counterPrice: n.counterPrice,
            counterNote: n.counterNote,
            declineReason: n.declineReason,
          }));
          setNegotiations(mapped);
        }
      })
      .catch((err) => {
        console.error("Failed to fetch negotiations:", err);
      });
    return () => { cancelled = true; };
  }, []);

  // Active Sales & Retainer Pipeline Deals
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
  >([
    {
      id: "deal-101",
      client: "Ryze Mushroom Coffee",
      clientLogo: "RM",
      scope: "Annual Enterprise Retainer (16 Video Reels + 3D Hooks)",
      value: 1440000,
      stage: "Active Retainer",
      stageBadge: "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 font-black",
      probability: "100%",
      owner: "Alex Rivera",
      expectedClose: "Oct 1, 2026",
    },
    {
      id: "deal-102",
      client: "Acme Corp",
      clientLogo: "AC",
      scope: "Growth Social Media Retainer (8 Posters + 4 Reels)",
      value: 300000,
      stage: "Active Retainer",
      stageBadge: "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 font-black",
      probability: "100%",
      owner: "Vikram Malhotra",
      expectedClose: "Oct 1, 2026",
    },
    {
      id: "deal-103",
      client: "Urbanic Fashion",
      clientLogo: "UF",
      scope: "Brand Accelerator & 3D VFX Retainer Expansion",
      value: 600000,
      stage: "Contract Review",
      stageBadge: "bg-[#7FA0D6]/20 text-[#7FA0D6] border border-[#7FA0D6]/30 font-bold",
      probability: "85%",
      owner: "Sarah Connor",
      expectedClose: "Oct 15, 2026",
    },
  ]);

  // Actions: ACCEPT Client Plan Negotiation
  const handleAcceptNegotiation = async (item: PlanNegotiationItem) => {
    try {
      await updatePlanNegotiation(item.id, "accept");
      setNegotiations((prev) =>
        prev.map((n) => (n.id === item.id ? { ...n, status: "Accepted" } : n))
      );
      setToast(`Plan Negotiation ACCEPTED for ${item.clientName}!`);
    } catch (err) {
      setToast(`Failed to accept negotiation: ${err instanceof Error ? err.message : "Unknown error"}`);
    }
    setTimeout(() => setToast(null), 4000);
  };

  // Actions: DECLINE Client Plan Negotiation
  const handleConfirmDecline = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!declineModalItem) return;

    try {
      await updatePlanNegotiation(declineModalItem.id, "decline", {
        decline_reason: declineReasonInput || "Price outside allowable margin.",
      });
      setNegotiations((prev) =>
        prev.map((n) =>
          n.id === declineModalItem.id
            ? { ...n, status: "Declined", declineReason: declineReasonInput || "Price outside allowable margin." }
            : n
        )
      );
      setToast(`Plan Negotiation DECLINED for ${declineModalItem.clientName}. Notification sent.`);
    } catch (err) {
      setToast(`Failed to decline: ${err instanceof Error ? err.message : "Unknown error"}`);
    }
    setDeclineModalItem(null);
    setDeclineReasonInput("");
    setTimeout(() => setToast(null), 4000);
  };

  // Actions: COUNTER-OFFER Client Plan Negotiation
  const handleConfirmCounter = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!counterModalItem || !counterPriceInput) return;

    const price = parseFloat(counterPriceInput);
    try {
      await updatePlanNegotiation(counterModalItem.id, "counter", {
        counter_price: price,
        counter_note: counterNoteInput || undefined,
      });
      setNegotiations((prev) =>
        prev.map((n) =>
          n.id === counterModalItem.id
            ? { ...n, status: "Counter Offered", counterPrice: price, counterNote: counterNoteInput }
            : n
        )
      );
      setToast(`Counter offer of ₹${price.toLocaleString('en-IN')}/mo submitted to ${counterModalItem.clientName}.`);
    } catch (err) {
      setToast(`Failed to submit counter: ${err instanceof Error ? err.message : "Unknown error"}`);
    }
    setCounterModalItem(null);
    setCounterPriceInput("");
    setCounterNoteInput("");
    setTimeout(() => setToast(null), 4000);
  };

  // Actions: Create New Proposal Submit
  const handleCreateProposalSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPropClient || !newPropProposedRate) return;

    const prop = parseFloat(newPropProposedRate) || 85000;

    try {
      const res = await createPlanNegotiation({
        client_name: newPropClient,
        target_topic: `${newPropCurrentPlan} → ${newPropTargetPlan}`,
        proposed_offer: `₹${prop.toLocaleString('en-IN')}/mo`,
        notes: newPropNotes || "Custom enterprise proposal initiated by sales lead.",
      });

      const newNeg: PlanNegotiationItem = {
        id: res.id || `neg-${Math.floor(100 + Math.random() * 900)}`,
        clientName: newPropClient,
        clientLogo: newPropClient.split(" ").map((w) => w[0]).join("").toUpperCase().slice(0, 2),
        targetTopic: `${newPropCurrentPlan} → ${newPropTargetPlan}`,
        proposedOffer: `₹${prop.toLocaleString('en-IN')}/mo`,
        phoneNumber: "—",
        preferredTime: "—",
        notes: newPropNotes || "Custom enterprise proposal initiated by sales lead.",
        requestedAt: new Date().toISOString(),
        status: "Pending Review",
      };

      setNegotiations((prev) => [newNeg, ...prev]);
      setToast(`Custom retainer proposal initiated for ${newPropClient} (₹${prop.toLocaleString('en-IN')}/mo)!`);
    } catch (err) {
      setToast(`Failed to create proposal: ${err instanceof Error ? err.message : "Unknown error"}`);
    }

    setIsNewProposalOpen(false);
    setNewPropClient("");
    setNewPropNotes("");
    setTimeout(() => setToast(null), 4000);
  };

  // Manage Deal Modal State & Handlers
  const [manageDealModal, setManageDealModal] = useState<(typeof deals)[0] | null>(null);
  const [dealSuccessModal, setDealSuccessModal] = useState<{
    title: string;
    message: string;
  } | null>(null);

  // Manage Mode: normal edit, revoke confirm, or refund process
  const [manageMode, setManageMode] = useState<"edit" | "revoke_confirm" | "refund">("edit");
  const [refundAmountInput, setRefundAmountInput] = useState("");
  const [refundReasonInput, setRefundReasonInput] = useState("Contract Cancellation / Retainer Revocation");
  const [refundMethodInput, setRefundMethodInput] = useState("Original Payment Gateway (Stripe ACH / Card)");

  const handleOpenManageDeal = (deal: (typeof deals)[0]) => {
    setManageDealModal(deal);
    setManageMode("edit");
    setRefundAmountInput(String(Math.round(deal.value / 12)));
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
      item.targetTopic.toLowerCase().includes(search.toLowerCase()) ||
      (item.notes || "").toLowerCase().includes(search.toLowerCase());

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
    <div data-surface="ops" className="w-full min-h-screen font-sans bg-[#0B111C] flex flex-col">
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
          <div className="kpi-card p-6 bg-[#161F2D] rounded-3xl border-2 border-[#161F2D] hover:border-[#BCCCE6] transition-all shadow-[0_2px_15px_rgba(0,0,0,0.03)] space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black text-[#97A0B3] uppercase tracking-wider">ACTIVE RETAINERS</span>
              <div className="w-7 h-7 rounded-xl bg-[#7FA0D6]/15 text-[#7FA0D6] flex items-center justify-center font-bold">
                <Briefcase className="w-3.5 h-3.5" />
              </div>
            </div>
            <div className="text-3xl font-black text-white">
              {plans.reduce((acc, p) => acc + p.subscribers, 0)} Active
            </div>
            <p className="text-xs text-[#7FA0D6] font-bold">MRR: ₹{totalRetainerRevenue.toLocaleString("en-IN")}</p>
          </div>

          <div className="kpi-card p-6 bg-[#161F2D] rounded-3xl border-2 border-[#161F2D] hover:border-[#BCCCE6] transition-all shadow-[0_2px_15px_rgba(0,0,0,0.03)] space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black text-[#97A0B3] uppercase tracking-wider">PENDING NEGOTIATIONS</span>
              <div className="w-7 h-7 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold">
                <Zap className="w-3.5 h-3.5" />
              </div>
            </div>
            <div className="text-3xl font-black text-white">{pendingCount} Actionable</div>
            <p className="text-xs text-amber-600 font-bold">Requires executive review</p>
          </div>

          <div className="kpi-card p-6 bg-[#161F2D] rounded-3xl border-2 border-[#161F2D] hover:border-[#BCCCE6] transition-all shadow-[0_2px_15px_rgba(0,0,0,0.03)] space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black text-[#97A0B3] uppercase tracking-wider">AVG RETAINER VALUE</span>
              <div className="w-7 h-7 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-black text-sm">
                ₹
              </div>
            </div>
            <div className="text-3xl font-black text-white">
              ₹{(plans.reduce((acc, p) => acc + p.subscribers, 0) > 0 
                ? Math.round(totalRetainerRevenue / plans.reduce((acc, p) => acc + p.subscribers, 0))
                : 72500).toLocaleString("en-IN")}/mo
            </div>
            <p className="text-xs text-emerald-600 font-bold">High LTV retention</p>
          </div>

          <div className="kpi-card p-6 bg-[#161F2D] rounded-3xl border-2 border-[#161F2D] hover:border-[#BCCCE6] transition-all shadow-[0_2px_15px_rgba(0,0,0,0.03)] space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black text-[#97A0B3] uppercase tracking-wider">WIN / CLOSING RATE</span>
              <div className="w-7 h-7 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center font-bold">
                <TrendingUp className="w-3.5 h-3.5" />
              </div>
            </div>
            <div className="text-3xl font-black text-white">68%</div>
            <p className="text-xs text-purple-600 font-bold">↗ Top quadrant velocity</p>
          </div>
        </div>

        {/* ─────────────────────────────────────────────────────────────────────────────
            RETAINER TIERS & QUOTA ALLOCATION CARDS
        ───────────────────────────────────────────────────────────────────────────── */}
        <div className="bg-[#161F2D] rounded-3xl p-6 lg:p-8 border border-[#2A3446] shadow-[0_4px_30px_rgba(0,0,0,0.04)] space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h3 className="text-lg font-bold text-white tracking-tight">Agency Retainer Plans & Quotas</h3>
              <p className="text-xs text-[#97A0B3] mt-0.5">
                Standard monthly subscription tiers, output deliverables quota, and SLA turnarounds.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {plans.map((plan) => (
              <div
                key={plan.id}
                className="bg-[#0B111C]/70 hover:bg-[#161F2D] rounded-3xl p-6 border border-[#2A3446] hover:border-[#2A3446] shadow-2xs hover:shadow-md transition-all space-y-5 flex flex-col justify-between"
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="font-bold text-base text-white">{plan.display_name}</h4>
                    <span className="px-2.5 py-0.5 rounded-full bg-[#7FA0D6]/15 text-[#7FA0D6] text-[10px] font-bold">
                      {plan.subscribers} Active Clients
                    </span>
                  </div>
                  <div className="text-3xl font-black text-white">
                    ₹{plan.price_monthly.toLocaleString("en-IN")} <span className="text-xs font-normal text-[#97A0B3]">/mo</span>
                  </div>
                  <ul className="space-y-2 text-xs text-[#F1F5F9] pt-2 border-t border-[#2A3446]/60">
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
                  className="w-full py-2.5 rounded-xl bg-[#161F2D] hover:bg-[#161F2D] text-white text-xs font-bold border border-[#2A3446] transition-colors cursor-pointer shadow-2xs"
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
        <div className="bg-[#161F2D] rounded-3xl p-6 lg:p-8 border border-[#2A3446] shadow-[0_4px_30px_rgba(0,0,0,0.04)] space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-bold text-white tracking-tight">Client Plan Negotiations</h3>
                {pendingCount > 0 && (
                  <span className="px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200 text-[10px] font-black uppercase flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                    {pendingCount} Action Required
                  </span>
                )}
              </div>
              <p className="text-xs text-[#97A0B3] mt-0.5">
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
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#2A3446] pb-4">
            <div className="flex items-center gap-1 bg-[#161F2D] p-1 rounded-xl text-xs font-bold text-[#F1F5F9] overflow-x-auto">
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
                      ? "bg-[#161F2D] text-[#7FA0D6] shadow-xs font-black"
                      : "hover:text-white"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            <div className="relative min-w-[240px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#97A0B3]" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search negotiations by client, scope..."
                className="w-full pl-9 pr-4 py-2 rounded-xl border border-[#2A3446] bg-[#161F2D] text-xs font-medium focus:outline-none focus:ring-2 focus:ring-blue-500/20 shadow-2xs"
              />
            </div>
          </div>

          {/* Proposals List */}
          <div className="space-y-4">
            {filteredNegotiations.length === 0 ? (
              <div className="p-8 text-center text-[#97A0B3] bg-[#0B111C]/50 rounded-2xl border border-dashed border-[#2A3446]">
                <p className="text-xs font-bold">No plan negotiations found in this filter.</p>
              </div>
            ) : (
              filteredNegotiations.map((item) => (
                <div
                  key={item.id}
                  className="p-5 rounded-2xl border border-[#2A3446] bg-[#0B111C]/50 hover:bg-[#161F2D] hover:border-[#2A3446] transition-all shadow-2xs space-y-4"
                >
                  <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                    {/* Client Info */}
                    <div className="flex items-center gap-3.5">
                      <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-700 text-white font-black text-sm flex items-center justify-center shadow-md shrink-0">
                        {item.clientLogo}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="font-bold text-sm text-white">{item.clientName}</h4>
                          <span className="text-[10px] text-[#97A0B3] font-semibold">{item.requestedAt}</span>
                        </div>
                        <p className="text-xs text-[#F1F5F9] font-medium">{item.targetTopic}</p>
                        {item.clientEmail && <p className="text-[10px] text-[#97A0B3]">{item.clientEmail}</p>}
                      </div>
                    </div>

                    {/* Negotiation Details */}
                    <div className="flex items-center gap-4 bg-[#161F2D] p-3 rounded-xl border border-[#2A3446] flex-wrap">
                      {item.proposedOffer && (
                        <div>
                          <span className="text-[10px] text-[#7FA0D6] uppercase block font-bold">Proposed Offer</span>
                          <span className="text-sm font-black text-emerald-400">{item.proposedOffer}</span>
                        </div>
                      )}
                      <div>
                        <span className="text-[10px] text-[#97A0B3] uppercase block font-bold">Contact</span>
                        <span className="text-xs font-bold text-white">{item.phoneNumber}</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-[#97A0B3] uppercase block font-bold">Preferred Time</span>
                        <span className="text-xs font-bold text-white">{item.preferredTime}</span>
                      </div>
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
                              setCounterPriceInput("");
                            }}
                            className="px-3 py-2 rounded-xl bg-[#161F2D] hover:bg-gray-200 text-white font-bold text-xs cursor-pointer"
                          >
                            Counter
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Scope Notes */}
                  {item.notes && (
                    <div className="p-3 bg-[#161F2D] rounded-xl text-xs text-[#F1F5F9] border border-[#2A3446] font-medium">
                      <strong className="text-white font-bold">Client Notes:</strong> "{item.notes}"
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>

        {/* ─────────────────────────────────────────────────────────────────────────────
            ACTIVE SALES & RETAINER PIPELINE TABLE
        ───────────────────────────────────────────────────────────────────────────── */}
        <div className="bg-[#161F2D] rounded-3xl border border-[#2A3446] shadow-[0_4px_30px_rgba(0,0,0,0.04)] p-6 lg:p-8 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h3 className="text-xl font-black text-white tracking-tight">Active Sales & Retainer Pipeline</h3>
              <p className="text-xs text-[#97A0B3] mt-0.5">High-touch commercial prospects, contract values, and closing probabilities</p>
            </div>
            <span className="px-3 py-1 rounded-full bg-[#7FA0D6]/15 text-[#7FA0D6] border border-[#7FA0D6]/30 text-xs font-bold">
              {deals.length} Active Deals
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-[#2A3446] text-[10px] font-black uppercase text-[#97A0B3] tracking-wider">
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
                    <td colSpan={7} className="py-10 text-center text-[#97A0B3]">
                      <p className="text-xs font-bold text-[#F1F5F9]">No active pipeline deals</p>
                      <p className="text-[11px] text-[#97A0B3] mt-0.5">Real sales prospect deals will appear here once initiated.</p>
                    </td>
                  </tr>
                ) : (
                  deals.map((d) => (
                    <tr key={d.id} className="hover:bg-[#0B111C]/70 transition-colors">
                      <td className="py-4 pl-2 font-bold text-white">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-xl bg-slate-900 text-white font-black text-xs flex items-center justify-center">
                            {d.clientLogo}
                          </div>
                          <span>{d.client}</span>
                        </div>
                      </td>
                      <td className="py-4 text-[#F1F5F9] font-medium">{d.scope}</td>
                      <td className="py-4 font-black text-white">₹{d.value.toLocaleString("en-IN")} / yr</td>
                      <td className="py-4">
                        <span className={`px-2.5 py-1 rounded-full text-[10px] font-black border ${d.stageBadge}`}>
                          {d.stage}
                        </span>
                      </td>
                      <td className="py-4 font-bold text-emerald-600">{d.probability}</td>
                      <td className="py-4 text-[#F1F5F9] font-medium">{d.owner}</td>
                      <td className="py-4 text-right pr-2">
                        <button
                          type="button"
                          onClick={() => handleOpenManageDeal(d)}
                          className="px-3.5 py-1.5 rounded-xl bg-[#161F2D] hover:bg-blue-600 hover:text-white text-white font-bold text-xs cursor-pointer shadow-2xs transition-all active:scale-95"
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
          <div className="w-full max-w-md rounded-3xl bg-[#161F2D] p-6 shadow-2xl space-y-4 border border-[#2A3446]">
            <div className="flex items-center justify-between border-b border-[#2A3446] pb-3">
              <h3 className="text-base font-bold text-white">Edit Tier: {editingPlan.display_name}</h3>
              <button type="button" onClick={() => setEditingPlan(null)} className="p-1 text-[#97A0B3] hover:text-[#F1F5F9]">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveTierTerms} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-[#F1F5F9] mb-1">Monthly Retainer Price (₹ INR)</label>
                <input
                  type="number"
                  required
                  value={editPriceInput}
                  onChange={(e) => setEditPriceInput(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl border border-[#2A3446] text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                />
              </div>

              <div>
                <label className="block font-bold text-[#F1F5F9] mb-1">Features & Deliverables Quota (One per line)</label>
                <textarea
                  rows={4}
                  required
                  value={editFeaturesInput}
                  onChange={(e) => setEditFeaturesInput(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl border border-[#2A3446] text-xs resize-none focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-[#2A3446]">
                <button type="button" onClick={() => setEditingPlan(null)} className="px-4 py-2 rounded-xl border border-[#2A3446] font-bold text-[#F1F5F9] hover:bg-[#0B111C] cursor-pointer">
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
          <div className="w-full max-w-md rounded-3xl bg-[#161F2D] p-6 shadow-2xl space-y-4 border border-[#2A3446]">
            <div className="flex items-center justify-between border-b border-[#2A3446] pb-3">
              <h3 className="text-base font-bold text-white">Decline Plan Negotiation</h3>
              <button type="button" onClick={() => setDeclineModalItem(null)} className="p-1 text-[#97A0B3] hover:text-[#F1F5F9]">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleConfirmDecline} className="space-y-3 text-xs">
              <p className="text-[#F1F5F9]">
                Are you sure you want to decline the proposed custom retainer for <strong>{declineModalItem.clientName}</strong>?
              </p>

              <div>
                <label className="block font-bold text-[#F1F5F9] mb-1">Reason for Rejection</label>
                <textarea
                  rows={3}
                  required
                  placeholder="e.g. Proposed rate falls below standard minimum margin."
                  value={declineReasonInput}
                  onChange={(e) => setDeclineReasonInput(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl border border-[#2A3446] text-xs resize-none focus:outline-none focus:ring-2 focus:ring-rose-500/20"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-[#2A3446]">
                <button type="button" onClick={() => setDeclineModalItem(null)} className="px-4 py-2 rounded-xl border border-[#2A3446] font-bold text-[#F1F5F9] hover:bg-[#0B111C] cursor-pointer">
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
          <div className="w-full max-w-md rounded-3xl bg-[#161F2D] p-6 shadow-2xl space-y-4 border border-[#2A3446]">
            <div className="flex items-center justify-between border-b border-[#2A3446] pb-3">
              <h3 className="text-base font-bold text-white">Submit Counter Offer</h3>
              <button type="button" onClick={() => setCounterModalItem(null)} className="p-1 text-[#97A0B3] hover:text-[#F1F5F9]">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleConfirmCounter} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-[#F1F5F9] mb-1">Counter Proposed Rate (₹ INR / mo)</label>
                <input
                  type="number"
                  required
                  value={counterPriceInput}
                  onChange={(e) => setCounterPriceInput(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl border border-[#2A3446] text-xs focus:outline-none focus:ring-2 focus:ring-purple-500/20"
                />
              </div>

              <div>
                <label className="block font-bold text-[#F1F5F9] mb-1">Counter Offer Notes / Scope Terms</label>
                <textarea
                  rows={3}
                  placeholder="e.g. We can offer ₹85,000/mo with 12-month commitment."
                  value={counterNoteInput}
                  onChange={(e) => setCounterNoteInput(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl border border-[#2A3446] text-xs resize-none focus:outline-none focus:ring-2 focus:ring-purple-500/20"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-[#2A3446]">
                <button type="button" onClick={() => setCounterModalItem(null)} className="px-4 py-2 rounded-xl border border-[#2A3446] font-bold text-[#F1F5F9] hover:bg-[#0B111C] cursor-pointer">
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
          <div className="w-full max-w-md rounded-3xl bg-[#161F2D] p-6 shadow-2xl space-y-4 border border-[#2A3446]">
            <div className="flex items-center justify-between border-b border-[#2A3446] pb-3">
              <h3 className="text-base font-bold text-white">Initiate Custom Retainer Proposal</h3>
              <button type="button" onClick={() => setIsNewProposalOpen(false)} className="p-1 text-[#97A0B3] hover:text-[#F1F5F9]">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateProposalSubmit} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-[#F1F5F9] mb-1">Client Brand Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Apex Media or Stellar Corp"
                  value={newPropClient}
                  onChange={(e) => setNewPropClient(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl border border-[#2A3446] text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                />
              </div>

              <div>
                <label className="block font-bold text-[#F1F5F9] mb-1">Current Retainer Plan</label>
                <input
                  type="text"
                  value={newPropCurrentPlan}
                  onChange={(e) => setNewPropCurrentPlan(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl border border-[#2A3446] text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                />
              </div>

              <div>
                <label className="block font-bold text-[#F1F5F9] mb-1">Target Plan & Custom Scope</label>
                <input
                  type="text"
                  required
                  value={newPropTargetPlan}
                  onChange={(e) => setNewPropTargetPlan(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl border border-[#2A3446] text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-[#F1F5F9] mb-1">Standard Rate (₹/mo)</label>
                  <input
                    type="number"
                    value={newPropStandardRate}
                    onChange={(e) => setNewPropStandardRate(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-xl border border-[#2A3446] text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  />
                </div>
                <div>
                  <label className="block font-bold text-[#F1F5F9] mb-1">Proposed Rate (₹/mo)</label>
                  <input
                    type="number"
                    required
                    value={newPropProposedRate}
                    onChange={(e) => setNewPropProposedRate(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-xl border border-[#2A3446] text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-[#F1F5F9] mb-1">Negotiation Scope Notes & Commitments</label>
                <textarea
                  rows={3}
                  placeholder="e.g. 12-month contract lock-in with 2 dedicated creative pods."
                  value={newPropNotes}
                  onChange={(e) => setNewPropNotes(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl border border-[#2A3446] text-xs resize-none focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-[#2A3446]">
                <button type="button" onClick={() => setIsNewProposalOpen(false)} className="px-4 py-2 rounded-xl border border-[#2A3446] font-bold text-[#F1F5F9] hover:bg-[#0B111C] cursor-pointer">
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
            className="relative w-full max-w-xl rounded-3xl bg-[#161F2D] p-6 sm:p-7 shadow-2xl border border-[#2A3446] flex flex-col space-y-4 max-h-[92vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-[#2A3446] pb-3">
              <div className="flex items-center gap-3">
                <div className="size-11 rounded-2xl bg-slate-950 text-white font-black text-sm flex items-center justify-center shadow-xs">
                  {manageDealModal.clientLogo}
                </div>
                <div>
                  <h3 className="text-base font-black text-white tracking-tight">
                    Manage Deal • {manageDealModal.client}
                  </h3>
                  <p className="text-[11px] text-[#97A0B3] font-medium">
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
                className="size-8 rounded-full bg-[#161F2D] hover:bg-slate-200 text-[#97A0B3] flex items-center justify-center transition-colors cursor-pointer"
              >
                <X className="size-4" />
              </button>
            </div>

            {/* Quick Action Navigation Bar */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-1.5 p-1.5 bg-[#161F2D]/80 rounded-2xl">
              <button
                type="button"
                onClick={() => setManageMode("edit")}
                className={`w-full py-2 px-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer text-center ${
                  manageMode === "edit"
                    ? "bg-[#161F2D] text-white shadow-xs font-black"
                    : "text-[#F1F5F9] hover:text-white"
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

                <div className="p-4 rounded-2xl bg-[#0B111C] border border-[#2A3446] text-xs space-y-2 text-[#F1F5F9]">
                  <div className="flex justify-between">
                    <span className="font-semibold text-[#97A0B3]">Client:</span>
                    <strong className="text-white">{manageDealModal.client}</strong>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-semibold text-[#97A0B3]">Contract Value:</span>
                    <strong className="text-white">₹{manageDealModal.value.toLocaleString("en-IN")} / yr</strong>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-semibold text-[#97A0B3]">Assigned Account Owner:</span>
                    <strong className="text-white">{manageDealModal.owner}</strong>
                  </div>
                </div>

                <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-[#2A3446]">
                  <button
                    type="button"
                    onClick={() => setManageMode("edit")}
                    className="px-4 py-2.5 rounded-xl border border-[#2A3446] text-xs font-bold text-[#F1F5F9] hover:bg-[#0B111C] cursor-pointer"
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
                    <label className="block text-xs font-bold text-[#F1F5F9] mb-1">Refund Amount (₹ INR)</label>
                    <input
                      type="number"
                      required
                      value={refundAmountInput}
                      onChange={(e) => setRefundAmountInput(e.target.value)}
                      placeholder="e.g. 45000"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-[#2A3446] text-xs font-bold text-white focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-[#F1F5F9] mb-1">Refund Method</label>
                    <select
                      value={refundMethodInput}
                      onChange={(e) => setRefundMethodInput(e.target.value)}
                      className="w-full px-3 py-2.5 rounded-xl border border-[#2A3446] text-xs font-medium text-white bg-[#161F2D]"
                    >
                      <option value="Original Payment Gateway (Stripe ACH / Card)">Original Payment Gateway (Stripe / ACH)</option>
                      <option value="Direct Bank Wire / IMPS / RTGS">Direct Bank Transfer (IMPS / RTGS)</option>
                      <option value="Internal Account Service Credit">Internal Account Service Credit</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#F1F5F9] mb-1">Reason for Refund</label>
                  <select
                    value={refundReasonInput}
                    onChange={(e) => setRefundReasonInput(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl border border-[#2A3446] text-xs font-medium text-white bg-[#161F2D]"
                  >
                    <option value="Contract Cancellation / Retainer Revocation">Contract Cancellation / Retainer Revocation</option>
                    <option value="SLA Non-Compliance / Delivery Disruption">SLA Non-Compliance / Delivery Disruption</option>
                    <option value="Duplicate or Overcharge Billing Adjustment">Duplicate or Overcharge Billing Adjustment</option>
                    <option value="Executive Discretionary Credit">Executive Discretionary Credit</option>
                  </select>
                </div>

                <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-[#2A3446]">
                  <button
                    type="button"
                    onClick={() => setManageMode("edit")}
                    className="px-4 py-2.5 rounded-xl border border-[#2A3446] text-xs font-bold text-[#F1F5F9] hover:bg-[#0B111C] cursor-pointer"
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
            className="relative w-full max-w-md rounded-3xl bg-[#161F2D] p-6 sm:p-8 shadow-2xl border border-[#2A3446] flex flex-col items-center text-center animate-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
          >
            <button
              type="button"
              onClick={() => setDealSuccessModal(null)}
              className="absolute top-4 right-4 size-8 rounded-full bg-[#161F2D] hover:bg-slate-200 text-[#97A0B3] hover:text-[#F1F5F9] flex items-center justify-center transition-colors cursor-pointer"
              aria-label="Close modal"
            >
              <X className="size-4" />
            </button>

            <div className="size-16 rounded-3xl bg-emerald-50 text-emerald-600 ring-8 ring-emerald-50/60 flex items-center justify-center mb-4 shadow-inner">
              <CheckCircle2 className="size-8" />
            </div>

            <h3 className="text-xl font-black text-white tracking-tight">{dealSuccessModal.title}</h3>
            <p className="text-xs sm:text-sm text-[#F1F5F9] mt-2 leading-relaxed max-w-sm">{dealSuccessModal.message}</p>

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
// 10. REMOVED GOVERNANCE & SETTINGS PAGES (REDIRECT TO /admin)
// ─────────────────────────────────────────────────────────────────────────────
export function AdminAnnouncementsPage() {
  return <Navigate to="/admin" replace />;
}

export function AdminReportsPage() {
  return <Navigate to="/admin" replace />;
}

export function AdminAddonsPage() {
  return <Navigate to="/admin" replace />;
}

export function AdminEscalationsPage() {
  return <Navigate to="/admin" replace />;
}

export const AdminSalesPage = AdminPlansPage;

export function AdminSettingsPage() {
  return <Navigate to="/admin" replace />;
}

