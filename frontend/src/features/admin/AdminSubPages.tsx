import { Instagram } from "../../ui/brand-icons";
import { PaymentReceiptModal } from "../../components/admin/PaymentReceiptModal";
import { NativeSelect } from "../../ui/NativeSelect";
import { useAuth } from "../../lib/auth-context";
import * as Dialog from "@radix-ui/react-dialog";
import { DeliverableMedia } from "../../components/ops/DeliverableMedia";
import { PublishingControl } from "../../components/ops/PublishingPanel";
import { resolveAssetUrl } from "../../lib/media";
import React, { useState, useEffect, useMemo } from "react";
import { Link, useParams, useSearchParams, Navigate, useNavigate } from "react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { request } from "../../lib/http";
import {
  fetchClientRoster,
  fetchPlanNegotiations,
  updatePlanNegotiation,
  createPlanNegotiation,
  resendProposalEmail,
  fetchLeaveRequests,
  submitLeaveRequest,
  approveLeaveRequest,
  rejectLeaveRequest,
  fetchTeamMembers,
  fetchAdminQueue,
  fetchKanbanTasks,
  moveTaskStage,
  fetchAdminDeliverables,
  fetchPlansSummary,
  fetchAdminKPIs,
  fetchRevenueTrend,
  fetchAdminTransactions,
  fetchClientBrandProfile,
  fetchAdminManualPayments,
  approveManualPayment,
  rejectManualPayment,
  directBypassClientPayment,
  revokeClientBypass,
  fetchPodDashboard,
  sendClientReminder,
} from "../../lib/ops-api";
import type { PlanNegotiationApiItem, PlanSummaryItem, ManualPaymentRequest, LeaveRequestItem, TeamMemberItem } from "../../lib/ops-api";
import { fetchPlans } from "../../lib/onboarding-api";
import { useConfirm } from "../../components/ui/ConfirmDialog";
import { CreoInlineLoader } from "../../components/ui/CreoLoader";
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
  Banknote,
  MessageSquare,
  AlertTriangle,
  Briefcase,
  TrendingUp,
  Eye,
  Check,
  X,
  Filter,
  Tag,
  Calendar,
  Clock,
  Plane,
  Zap,
  ArrowLeft,
  ArrowRight,
  Download,
  SlidersHorizontal,
  ArrowUpRight,
  Play,
  Bell,
  Loader2,
  Camera,
  Video,
  Scissors,
  Palette,
  Layers,
  Mail,
  Phone,
  ExternalLink,
  FileText,
  Edit3,
  Trash2,
  Folder,
  Lock,
  ShieldCheck,
  History,
  Archive,
  CreditCard,
  RotateCcw,
  RefreshCw,
  AlertCircle,
  Sparkles,
  Type,
  Copy,
  Send,
  IndianRupee,
  UserCheck,
  UserX,
  LayoutGrid,
  ChevronDown,
  KeyRound,
  EyeOff,
  Volume2,
} from "lucide-react";
import { AdminTopHeader } from "../../components/admin/AdminTopHeader";
import { CustomSelect } from "../../components/ui/CustomSelect";
import { DeliverableHistoryModal } from "../../components/portal/DeliverableHistoryModal";
import { WithdrawDeliverableModal } from "../../components/portal/WithdrawDeliverableModal";
import { VoicePlayer } from "../../components/portal/VoicePlayer";
import { AdminSplitPaymentModal } from "../../components/admin/AdminSplitPaymentModal";
import { AdminFreelancerModal } from "../../components/admin/AdminFreelancerModal";
import { AdminAssignFreelancerModal } from "../../components/admin/AdminAssignFreelancerModal";
import { fetchFreelancers, updateFreelancerStatus, FreelancerProfileItem } from "../../lib/freelancer-api";

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
  isPaid?: boolean;
  isOnboarded?: boolean;
  lifecycleStatus?: "not_paid_not_onboarded" | "paid_not_onboarded" | "onboarded";
  lifecycleLabel?: string;
  monthlyFee: number;
  onboardingStage?: number;
  addon?: string;
  nextBilling: string;
  billingMethod: string;
  totalAssetsDelivered: number;
  totalAssetsQuota: number;
  totalAssetsRemaining?: number;
  postsDelivered: number;
  postsQuota: number;
  postsRemaining?: number;
  reelsDelivered: number;
  reelsQuota: number;
  reelsRemaining?: number;
  storiesDelivered: number;
  storiesQuota: number;
  storiesRemaining?: number;
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
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const rosterQuery = useQuery({
    queryKey: ["admin-client-roster", user?.id],
    queryFn: () => fetchClientRoster(),
    enabled: !!user,
  });
  const negotiationsQuery = useQuery({
    queryKey: ["admin-plan-negotiations-roster"],
    queryFn: () => fetchPlanNegotiations(),
    refetchInterval: 30000,
  });
  const confirm = useConfirm();
  const manualPaymentsQuery = useQuery({
    queryKey: ["admin-manual-payments"],
    queryFn: () => fetchAdminManualPayments(),
  });
  const plansQuery = useQuery({
    queryKey: ["plans"],
    queryFn: () => fetchPlans(),
  });
  const navigate = useNavigate();
  const { clientId } = useParams<{ clientId?: string }>();
  const [searchParams] = useSearchParams();
  const urlClientId = clientId || searchParams.get("clientId") || searchParams.get("client");

  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);
  const [serverClients, setServerClients] = useState<ClientRosterItem[]>([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [deliverableSearch, setDeliverableSearch] = useState("");
  const [deliverableStatus, setDeliverableStatus] = useState<"all" | "review" | "production" | "approved">("all");
  const [clientDetailTab, setClientDetailTab] = useState<"overview" | "deliverables" | "brand_pod">("overview");
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    if (Array.isArray(rosterQuery.data)) {
      setServerClients(rosterQuery.data.filter(client => !["suspended", "cancelled"].includes(client.account_status)));
    }
  }, [rosterQuery.data]);

  // Active Modals
  const [isInvoiceModalOpen, setIsInvoiceModalOpen] = useState(false);
  const [isCancelClientModalOpen, setIsCancelClientModalOpen] = useState(false);
  const [isOnboardClientModalOpen, setIsOnboardClientModalOpen] = useState(false);
  const [isRemoveClientModalOpen, setIsRemoveClientModalOpen] = useState(false);
  const [isManualPaymentsModalOpen, setIsManualPaymentsModalOpen] = useState(false);
  const [isDirectBypassModalOpen, setIsDirectBypassModalOpen] = useState(false);
  const [directBypassTargetClient, setDirectBypassTargetClient] = useState<{ id: string; name: string; email: string } | null>(null);
  const [directBypassPlanId, setDirectBypassPlanId] = useState<string>("");
  const [directBypassPaymentMethod, setDirectBypassPaymentMethod] = useState<string>("cash");
  const [directBypassNotes, setDirectBypassNotes] = useState<string>("");
  const [processingPaymentId, setProcessingPaymentId] = useState<string | null>(null);
  const [directBypassBusy, setDirectBypassBusy] = useState(false);
  const [directBypassClientPlans, setDirectBypassClientPlans] = useState<any[]>([]);
  const [isSendingDetailReminder, setIsSendingDetailReminder] = useState(false);

  useEffect(() => {
    if (directBypassTargetClient?.id) {
      request<any[]>(`/api/v1/payments/plans?client_id=${directBypassTargetClient.id}`)
        .then((clientPlans) => {
          if (Array.isArray(clientPlans) && clientPlans.length > 0) {
            setDirectBypassClientPlans(clientPlans);
            setDirectBypassPlanId(clientPlans[0].id);
          }
        })
        .catch(() => {});
    } else {
      setDirectBypassClientPlans([]);
    }
  }, [directBypassTargetClient?.id]);

  const [isSplitModalOpen, setIsSplitModalOpen] = useState(false);
  const [splitPaymentClient, setSplitPaymentClient] = useState<{ id: string; name: string } | null>(null);

  const manualPayments = manualPaymentsQuery.data || [];
  const pendingManualPayments = manualPayments.filter((p) => p.status === "PENDING");
  const [newClientNameInput, setNewClientNameInput] = useState("");
  const [newClientContactNameInput, setNewClientContactNameInput] = useState("");
  const [newClientEmailInput, setNewClientEmailInput] = useState("");
  const [newClientPasswordInput, setNewClientPasswordInput] = useState(`Creo@${Math.floor(1000 + Math.random() * 9000)}!`);
  const [showNewClientPassword, setShowNewClientPassword] = useState(false);
  const [newClientDispatchEmail, setNewClientDispatchEmail] = useState("");
  const [newClientSendEmail, setNewClientSendEmail] = useState(true);
  const [isOnboardingClient, setIsOnboardingClient] = useState(false);
  const [newClientIndustryInput, setNewClientIndustryInput] = useState("");
  const [newClientPodInput, setNewClientPodInput] = useState("Pod A (Creative & Brand Strategy)");

  // Provisioned client credentials modal state
  const [clientProvisionedCreds, setClientProvisionedCreds] = useState<{
    company_name: string;
    contact_name: string;
    email: string;
    password: string;
    email_dispatched: boolean;
    dispatch_email?: string;
  } | null>(null);

  // Client Team Member Onboarding Modal State
  const [isOnboardClientMemberModalOpen, setIsOnboardClientMemberModalOpen] = useState(false);
  const [clientMemberForm, setClientMemberForm] = useState({
    full_name: "",
    email: "",
    role_title: "Marketing Lead",
    password: `Creo@${Math.floor(1000 + Math.random() * 9000)}!`,
    dispatch_email: "",
    send_credentials_email: true,
  });
  const [showClientMemberPassword, setShowClientMemberPassword] = useState(false);
  const [isOnboardingClientMember, setIsOnboardingClientMember] = useState(false);
  const [clientMemberProvisionedCreds, setClientMemberProvisionedCreds] = useState<{
    full_name: string;
    email: string;
    password: string;
    role_title: string;
    email_dispatched: boolean;
    dispatch_email?: string;
  } | null>(null);

  const clientTeamMembersQuery = useQuery({
    queryKey: ["admin-client-team-members", selectedClientId],
    queryFn: async () => {
      if (!selectedClientId) return [];
      try {
        return await request<any[]>(`/api/v1/admin/clients/${selectedClientId}/team-members`);
      } catch {
        return [];
      }
    },
    enabled: !!selectedClientId,
  });

  const [clientToRemoveInput, setClientToRemoveInput] = useState("");
  const [customClients] = useState<Record<string, ClientDetailData>>({});
  const [removingClient, setRemovingClient] = useState(false);
  const [removeError, setRemoveError] = useState<string | null>(null);
  const [removedClientIds, setRemovedClientIds] = useState<Set<string>>(new Set());
  const [previewDeliverable, setPreviewDeliverable] = useState<any | null>(null);

  const offboardClient = async (id: string, name: string) => {
    if (removingClient) return;
    setRemovingClient(true); setRemoveError(null);
    try {
      await request(`/api/v1/admin/clients/${id}/offboard`, { method: "POST" });
      setRemovedClientIds(previous => new Set([...previous, id.toLowerCase()]));
      setServerClients(previous => previous.filter(client => client.client_id !== id));
      queryClient.setQueryData<ClientRosterItem[]>(["admin-client-roster", user?.id], previous => previous?.filter(client => client.client_id !== id));
      void queryClient.invalidateQueries({ queryKey: ["admin-client-roster", user?.id] });
      setSelectedClientId(null);
      setIsCancelClientModalOpen(false); setIsRemoveClientModalOpen(false);
      showToast(`Offboarded ${name}. Plan cancelled and account access revoked.`);
    } catch (error) { setRemoveError(error instanceof Error ? error.message : "Unable to remove this client."); }
    finally { setRemovingClient(false); }
  };

  const mergedClientsData: Record<string, ClientDetailData> = { ...customClients };

  serverClients.forEach((sc) => {
    const emailParts = sc.email.split("@");
    const rawEmailPart = (emailParts[0] || "").replace(/[._0-9]/g, " ").trim();
    const rawName = sc.company_name && sc.company_name.trim() !== "" && sc.company_name.toLowerCase() !== "unknown"
      ? sc.company_name
      : rawEmailPart;
    const formattedName = rawName ? rawName.charAt(0).toUpperCase() + rawName.slice(1) : "Client Account";
    const initials = formattedName.charAt(0).toUpperCase();

    // Determine lifecycle status:
    const isPaid = Boolean(
      (sc.subscription_status && ["active", "trialing", "paid"].includes(sc.subscription_status.toLowerCase())) ||
      (sc.plan_name && sc.monthly_price && sc.monthly_price > 0)
    );

    const isOnboarded = Boolean(
      sc.onboarding_completed_at ||
      (typeof sc.onboarding_stage === "number" && sc.onboarding_stage >= 4)
    );

    const lifecycleStatus: "not_paid_not_onboarded" | "paid_not_onboarded" | "onboarded" = 
      !isOnboarded
        ? (!isPaid ? "not_paid_not_onboarded" : "paid_not_onboarded")
        : "onboarded";

    const lifecycleLabel =
      lifecycleStatus === "not_paid_not_onboarded"
        ? "user not paid and not onboarded yet"
        : lifecycleStatus === "paid_not_onboarded"
          ? "user paid but not onboarded"
          : "Active Retainer";

    const tierName = isPaid
      ? (sc.plan_display_name || sc.plan_name || "Enterprise Retainer")
      : "No Active Plan";
    const tier = tierName.toLowerCase();
    const tierBadge = isPaid
      ? (sc.plan_display_name || sc.plan_name || "ACTIVE").toUpperCase()
      : "UNPAID";
    
    const podConfigs = [
      {
        name: "Pod A",
        tagline: "Enterprise Brand Strategy & Video",
        leadName: "Vikram Malhotra",
        leadTitle: "Pod A Lead Producer",
        leadAvatar: "VM",
        squad: [
          { name: "Marcus Chen", role: "Video Editor", hoursPerWeek: 16, avatar: "MC" },
          { name: "Elena Rostova", role: "Graphic Designer", hoursPerWeek: 16, avatar: "ER" },
        ],
        capacityAllocatedHrs: 32,
        bandwidthPercent: 80,
        dailySyncTime: "11:00 AM IST",
      },
      {
        name: "Pod B",
        tagline: "Performance Creative & Motion Ops",
        leadName: "Sarah Connor",
        leadTitle: "Pod B Lead Producer",
        leadAvatar: "SC",
        squad: [
          { name: "Rajini", role: "Video Editor", hoursPerWeek: 16, avatar: "RJ" },
          { name: "Chloe Bennett", role: "Graphic Designer", hoursPerWeek: 16, avatar: "CB" },
        ],
        capacityAllocatedHrs: 32,
        bandwidthPercent: 80,
        dailySyncTime: "11:30 AM IST",
      },
      {
        name: "Pod C",
        tagline: "3D Motion & Visual Design",
        leadName: "Rohan Mehta",
        leadTitle: "Pod C Lead Producer",
        leadAvatar: "RM",
        squad: [
          { name: "Tanvi Sen", role: "Video Editor", hoursPerWeek: 16, avatar: "TS" },
          { name: "Arjun Nair", role: "Graphic Designer", hoursPerWeek: 16, avatar: "AN" },
        ],
        capacityAllocatedHrs: 32,
        bandwidthPercent: 80,
        dailySyncTime: "12:00 PM IST",
      },
    ];
    const podIdx = Math.abs(formattedName.charCodeAt(0) || 0) % podConfigs.length;
    const basePod = (podConfigs[podIdx] || podConfigs[0])!;

    const assignedPod = !isOnboarded
      ? {
          name: isPaid ? "Awaiting Onboarding" : "Not Assigned",
          tagline: isPaid ? "Intake questionnaire in progress" : "Pending payment & onboarding",
          leadName: isPaid ? "To be assigned" : "Not Assigned",
          leadTitle: isPaid ? "Pod Lead Pending" : "Creative Lead Pending",
          leadAvatar: "—",
          squad: [],
          capacityAllocatedHrs: 0,
          bandwidthPercent: 0,
          dailySyncTime: "—",
        }
      : basePod;

    const monthlyFee = isPaid
      ? (sc.monthly_price || (tier.includes("starter") ? 25000 : tier.includes("growth") || tier.includes("brand") ? 50000 : 95000))
      : 0;
    
    const normalizeKind = (k?: string) => (k || "").toLowerCase().trim();
    const isPosts = (k?: string) => ["static_post", "post", "posts", "poster", "posters"].includes(normalizeKind(k));
    const isReels = (k?: string) => ["reel", "reels", "video"].includes(normalizeKind(k));
    const isStories = (k?: string) => ["carousel", "story", "stories"].includes(normalizeKind(k));

    const postsUsage = (sc.quota_usage || []).find((q) => isPosts(q?.kind));
    const postsQuota = postsUsage?.quota || 0;
    const postsDelivered = postsUsage?.used || 0;

    const reelsUsage = (sc.quota_usage || []).find((q) => isReels(q?.kind));
    const reelsQuota = reelsUsage?.quota || 0;
    const reelsDelivered = reelsUsage?.used || 0;

    const storiesUsage = (sc.quota_usage || []).find((q) => isStories(q?.kind));
    const storiesQuota = storiesUsage?.quota || 0;
    const storiesDelivered = storiesUsage?.used || 0;

    // Check for match with existing baseline client
    const existingKey = Object.keys(mergedClientsData).find(
      (k) =>
        k.toLowerCase() === sc.client_id.toLowerCase() ||
        mergedClientsData[k]?.contact?.email?.toLowerCase() === sc.email?.toLowerCase() ||
        mergedClientsData[k]?.name?.toLowerCase() === formattedName.toLowerCase()
    );

    const existing = existingKey ? mergedClientsData[existingKey] : undefined;

    const CANONICAL_PALETTE = ["#161F2D", "#7FA0D6", "#3E5A74", "#BCCCE6"];
    const CANONICAL_ROLES = [
      "Primary Brand",
      "Accent / Secondary",
      "Surface / Canvas",
      "Glow / Highlight",
    ];

    const rawScPalette = Array.isArray((sc as any).brand_dna?.palette) && (sc as any).brand_dna.palette.length > 0
      ? (sc as any).brand_dna.palette
      : Array.isArray((sc as any).brand_dna?.visual_direction?.primary_colors) && (sc as any).brand_dna.visual_direction.primary_colors.length > 0
        ? (sc as any).brand_dna.visual_direction.primary_colors
        : [];

    const extractedScList: string[] = [];
    if (Array.isArray(rawScPalette)) {
      rawScPalette.forEach((item: any) => {
        const hex = typeof item === "string" ? item.trim() : (item?.hex || item?.color || "").trim();
        if (hex && hex.startsWith("#")) {
          extractedScList.push(hex.toUpperCase());
        }
      });
    }

    const finalScHexes: string[] = [0, 1, 2, 3].map((i) => extractedScList[i] || CANONICAL_PALETTE[i] || "#161F2D");
    if (extractedScList.length > 4) {
      for (let i = 4; i < extractedScList.length; i++) {
        if (extractedScList[i]) {
          finalScHexes.push(extractedScList[i]!);
        }
      }
    }

    const resolvedColors = finalScHexes.map((hex, idx) => ({
      name: CANONICAL_ROLES[idx] || `Accent Tone ${idx + 1}`,
      hex: hex || "#161F2D",
    }));

    const clientStatus =
      lifecycleStatus === "not_paid_not_onboarded"
        ? "user not paid and not onboarded yet"
        : lifecycleStatus === "paid_not_onboarded"
          ? "user paid but not onboarded"
          : (sc.subscription_status || sc.account_status || "ACTIVE RETAINER").toUpperCase();

    if (existing) {
      const updated: ClientDetailData = {
        ...existing,
        id: sc.client_id || existing.id,
        initials: existing.initials || initials,
        name: existing.name || formattedName,
        industry: (sc as any).industry || (sc as any).brand_dna?.industry || existing.industry || "Digital Growth & Direct-to-Consumer",
        timezone: (sc as any).timezone || existing.timezone || "Client Time: IST (UTC+5:30)",
        status: clientStatus,
        isPaid,
        isOnboarded,
        lifecycleStatus,
        lifecycleLabel,
        onboardingStage: sc.onboarding_stage,
        tier: tierName,
        tierBadge,
        monthlyFee,
        pod: assignedPod,
        totalAssetsDelivered: isOnboarded ? (postsDelivered + reelsDelivered + storiesDelivered) : 0,
        totalAssetsQuota: isOnboarded ? (postsQuota + reelsQuota + storiesQuota) : 0,
        totalAssetsRemaining: isOnboarded ? Math.max(0, (postsQuota + reelsQuota + storiesQuota) - (postsDelivered + reelsDelivered + storiesDelivered)) : 0,
        postsDelivered: isOnboarded ? postsDelivered : 0,
        postsQuota: isOnboarded ? postsQuota : 0,
        postsRemaining: isOnboarded ? Math.max(0, postsQuota - postsDelivered) : 0,
        reelsDelivered: isOnboarded ? reelsDelivered : 0,
        reelsQuota: isOnboarded ? reelsQuota : 0,
        reelsRemaining: isOnboarded ? Math.max(0, reelsQuota - reelsDelivered) : 0,
        storiesDelivered: isOnboarded ? storiesDelivered : 0,
        storiesQuota: isOnboarded ? storiesQuota : 0,
        storiesRemaining: isOnboarded ? Math.max(0, storiesQuota - storiesDelivered) : 0,
        contact: {
          ...existing.contact,
          name: sc.full_name || existing.contact.name || formattedName,
          email: sc.email || existing.contact.email,
          phone: (sc as any).phone || (sc as any).brand_dna?.phone || (isOnboarded && existing.contact.phone && existing.contact.phone !== "+91 98401 23890" && existing.contact.phone !== "Not provided yet" ? existing.contact.phone : "Not provided yet"),
        },
        brand: {
          ...existing.brand,
          colors: resolvedColors.length > 0 ? resolvedColors : existing.brand.colors,
          toneSummary: (sc as any).brand_summary || (sc as any).brand_dna?.summary_line || existing.brand.toneSummary,
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
        industry: (sc as any).industry || (sc as any).brand_dna?.industry || "Digital Growth & Direct-to-Consumer",
        timezone: (sc as any).timezone || "Client Time: IST (UTC+5:30)",
        activeSince: isOnboarded ? "Active Client" : isPaid ? "Payment Confirmed" : "Registered Client",
        tier: tierName,
        tierBadge,
        status: clientStatus,
        isPaid,
        isOnboarded,
        lifecycleStatus,
        lifecycleLabel,
        monthlyFee,
        onboardingStage: sc.onboarding_stage,
        addon: isPaid && isOnboarded ? "Add-on: Creative Pod" : undefined,
        nextBilling: isPaid ? "Next Month Cycle" : "—",
        billingMethod: isPaid ? "Direct ACH / Razorpay" : "Unpaid",
        totalAssetsDelivered: isOnboarded ? (postsDelivered + reelsDelivered + storiesDelivered) : 0,
        totalAssetsQuota: isOnboarded ? (postsQuota + reelsQuota + storiesQuota) : 0,
        totalAssetsRemaining: isOnboarded ? Math.max(0, (postsQuota + reelsQuota + storiesQuota) - (postsDelivered + reelsDelivered + storiesDelivered)) : 0,
        postsDelivered: isOnboarded ? postsDelivered : 0,
        postsQuota: isOnboarded ? postsQuota : 0,
        postsRemaining: isOnboarded ? Math.max(0, postsQuota - postsDelivered) : 0,
        reelsDelivered: isOnboarded ? reelsDelivered : 0,
        reelsQuota: isOnboarded ? reelsQuota : 0,
        reelsRemaining: isOnboarded ? Math.max(0, reelsQuota - reelsDelivered) : 0,
        storiesDelivered: isOnboarded ? storiesDelivered : 0,
        storiesQuota: isOnboarded ? storiesQuota : 0,
        storiesRemaining: isOnboarded ? Math.max(0, storiesQuota - storiesDelivered) : 0,
        sprintNumber: isOnboarded ? 44 : 0,
        daysRemainingInSprint: isOnboarded ? 14 : 0,
        contact: {
          name: sc.full_name || formattedName,
          title: "Account Owner & Authorized Contact",
          email: sc.email,
          phone: (sc as any).phone || (sc as any).brand_dna?.phone || "Not provided yet",
          renewedDate: !isPaid ? "Pending Subscription" : isOnboarded ? "Current Sprint" : "Payment Confirmed",
          termMonths: isPaid ? 12 : 0,
        },
        brand: !isOnboarded
          ? {
              kitVersion: isPaid ? "Pending Intake Form" : "Pending Onboarding",
              headingsFont: "Pending Onboarding",
              bodyFont: "Pending Onboarding",
              monoFont: "Pending Onboarding",
              toneSummary: isPaid
                ? `user paid but not onboarded. Intake questionnaire is in progress for ${formattedName}. Brand guidelines and assets will be generated upon completion.`
                : `user not paid and not onboarded yet. Brand guidelines and assets will be generated once ${formattedName} subscribes and completes onboarding.`,
              toneTags: isPaid ? ["Payment Confirmed", "Awaiting Intake"] : ["Unpaid", "Not Onboarded"],
              colors: isPaid && resolvedColors.length > 0 ? resolvedColors : [],
              social: {
                handle: sc.instagram_username ? `@${sc.instagram_username}` : "Not connected",
                followers: isPaid ? "Awaiting Sync" : "Not Connected",
                status: isPaid ? "AWAITING SYNC" : "NOT CONNECTED",
                syncInterval: "—",
              },
              brandVaultLink: "Pending Onboarding",
              figmaLink: "Pending Onboarding",
              lastAuditDate: "—",
            }
          : {
              kitVersion: "Design Kit v2.4",
              headingsFont: "Plus Jakarta Sans",
              bodyFont: "Inter Sans",
              monoFont: "JetBrains Mono",
              toneSummary: (sc as any).brand_summary || (sc as any).brand_dna?.summary_line || `Dynamic, high-impact social media creatives engineered for ${formattedName}. High-clarity typography with conversion-optimized video hooks.`,
              toneTags: ["High Conversion", "Brand Authority", "Visual Polish"],
              colors: resolvedColors,
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
        pod: assignedPod,
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
          mergedClientsData[key]?.name?.toLowerCase() === urlClientId.toLowerCase() ||
          mergedClientsData[key]?.contact?.email?.toLowerCase() === urlClientId.toLowerCase() ||
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
          c.id?.toLowerCase() === selectedClientId.toLowerCase() ||
          c.name?.toLowerCase() === selectedClientId.toLowerCase() ||
          c.contact?.email?.toLowerCase() === selectedClientId.toLowerCase()
      ) ||
      clientList[0] ||
      null
    : null;

  const [liveDeliverables, setLiveDeliverables] = useState<any[]>([]);
  useEffect(() => {
    if (activeClient?.id && !activeClient.id.includes('ryze')) {
      fetchAdminDeliverables(activeClient.id)
        .then((data) => {
          setLiveDeliverables(data || []);
        })
        .catch(console.error);
    } else {
      setLiveDeliverables([]);
    }
  }, [activeClient?.id]);

  const activeClientId = activeClient?.id;
  const clientBrandQuery = useQuery({
    queryKey: ["admin-client-brand-profile", activeClientId],
    queryFn: () => fetchClientBrandProfile(activeClientId!),
    enabled: !!activeClientId,
  });
  const liveBrandProfile = clientBrandQuery.data;

  const [copiedHexIndex, setCopiedHexIndex] = useState<number | null>(null);

  const handleCopyHex = (hex: string, index: number) => {
    navigator.clipboard.writeText(hex);
    setCopiedHexIndex(index);
    setTimeout(() => setCopiedHexIndex(null), 2000);
  };

  const realColors = useMemo(() => {
    const CANONICAL_PALETTE = ["#161F2D", "#7FA0D6", "#3E5A74", "#BCCCE6"];
    const CANONICAL_ROLES = [
      "Primary Brand",
      "Accent / Secondary",
      "Surface / Canvas",
      "Glow / Highlight",
    ];

    const raw =
      liveBrandProfile?.brand_dna?.palette ||
      liveBrandProfile?.brand_dna?.visual_direction?.primary_colors ||
      (activeClient?.brand?.colors && activeClient.brand.colors.length > 0
        ? activeClient.brand.colors.map((c: any) => (typeof c === "string" ? c : c.hex))
        : []);

    const extractedList: string[] = [];
    if (Array.isArray(raw)) {
      raw.forEach((item: any) => {
        const hex = typeof item === "string" ? item.trim() : (item?.hex || item?.color || "").trim();
        if (hex && hex.startsWith("#")) {
          extractedList.push(hex.toUpperCase());
        }
      });
    }

    // Always pad to 4 tokens minimum to match Client Portal tokens
    const finalHexes: string[] = [0, 1, 2, 3].map((i) => extractedList[i] || CANONICAL_PALETTE[i] || "#161F2D");
    if (extractedList.length > 4) {
      for (let i = 4; i < extractedList.length; i++) {
        if (extractedList[i]) {
          finalHexes.push(extractedList[i]!);
        }
      }
    }

    return finalHexes.map((hex, idx) => ({
      name: CANONICAL_ROLES[idx] || `Accent Tone ${idx + 1}`,
      hex: hex || "#161F2D",
    }));
  }, [liveBrandProfile, activeClient]);

  const realTypography = useMemo(() => {
    const vis = liveBrandProfile?.brand_dna?.visual_direction;
    const typo = liveBrandProfile?.brand_dna?.typography;
    const headings = typo?.headline || vis?.headings_font || activeClient?.brand?.headingsFont || "Inter Display · 700 Bold";
    const body = typo?.body || vis?.body_font || activeClient?.brand?.bodyFont || "Inter Sans · 400 Regular";
    return {
      headingsFont: typeof headings === "string" ? headings : "Inter Display · 700 Bold",
      bodyFont: typeof body === "string" ? body : "Inter Sans · 400 Regular",
      monoFont: "JetBrains Mono",
    };
  }, [liveBrandProfile, activeClient]);

  const realTone = useMemo(() => {
    const dna = liveBrandProfile?.brand_dna || {};
    const toneObj = typeof dna.tone === "object" && dna.tone !== null ? dna.tone : {};
    const rawTags =
      Array.isArray(toneObj.voice_words) && toneObj.voice_words.length > 0
        ? toneObj.voice_words
        : Array.isArray(dna.tone_keywords) && dna.tone_keywords.length > 0
          ? dna.tone_keywords
          : typeof dna.tone === "string" && dna.tone.trim()
            ? dna.tone.split(",").map((s: string) => s.trim()).filter(Boolean)
            : (activeClient?.brand?.toneTags || ["Warm", "Premium", "Friendly"]);

    const tags = Array.isArray(rawTags)
      ? rawTags.map((t: any) => {
          const str = typeof t === "string" ? t : (t?.name || t?.word || String(t));
          return str.charAt(0).toUpperCase() + str.slice(1);
        })
      : ["Warm", "Premium", "Friendly"];

    const rawSummary =
      dna.summary_line ||
      liveBrandProfile?.brand_summary ||
      dna.positioning ||
      activeClient?.brand?.toneSummary ||
      `Engineered brand identity for ${activeClient?.name || "Client"}.`;

    const summary = typeof rawSummary === "string" ? rawSummary : String(rawSummary || "");
    const audience = dna.audience_segments?.[0]?.description || dna.target_audience || "";
    const painPoints = dna.audience_segments?.[0]?.core_pain_point || dna.value_propositions || "";

    return { summary, tags, audience, painPoints };
  }, [liveBrandProfile, activeClient]);

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




  const handleApprovePayment = async (req: ManualPaymentRequest) => {
    const ok = await confirm({
      title: "Approve Offline Payment Bypass",
      description: `Confirm verification and approve offline payment claim for ${req.client_email}?`,
      details: [
        `Plan: ${req.plan_name} (₹${req.amount.toLocaleString()})`,
        `Payment Method: ${req.payment_method.toUpperCase()}`,
        `Client Reference / Note: ${req.reference_note || "None provided"}`,
        "This will activate a manual subscription and bypass client onboarding up to Step 3, unlocking Step 4 (Brand Questionnaire) immediately.",
      ],
      confirmText: "Approve & Bypass Step 3",
      cancelText: "Cancel",
      tone: "success",
      icon: "check",
    });
    if (!ok) return;

    try {
      setProcessingPaymentId(req.id);
      await approveManualPayment(req.id, "Payment verified and approved by agency admin.");
      await queryClient.invalidateQueries({ queryKey: ["admin-manual-payments"] });
      await queryClient.invalidateQueries({ queryKey: ["admin-client-roster"] });
      showToast(`Offline payment approved for ${req.client_email}! Step 3 bypassed to Step 4.`);
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Failed to approve payment request.");
    } finally {
      setProcessingPaymentId(null);
    }
  };

  const handleRejectPayment = async (req: ManualPaymentRequest) => {
    const ok = await confirm({
      title: "Decline Offline Payment Claim",
      description: `Decline offline payment claim for ${req.client_email}?`,
      details: [
        `Plan: ${req.plan_name} (₹${req.amount.toLocaleString()})`,
        `Payment Method: ${req.payment_method.toUpperCase()}`,
        "The client will stay at Step 3 (Payment) and will receive notification of the decline.",
      ],
      confirmText: "Decline Request",
      cancelText: "Keep Pending",
      tone: "danger",
      icon: "danger",
    });
    if (!ok) return;

    try {
      setProcessingPaymentId(req.id);
      await rejectManualPayment(req.id, "Payment verification could not be validated.");
      await queryClient.invalidateQueries({ queryKey: ["admin-manual-payments"] });
      showToast(`Payment request for ${req.client_email} has been declined.`);
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Failed to decline payment request.");
    } finally {
      setProcessingPaymentId(null);
    }
  };

  const handleDirectBypassSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!directBypassTargetClient || !directBypassPlanId) return;

    const allAvailablePlans = [...(directBypassClientPlans || []), ...(plansQuery.data || [])];
    const chosenPlan = allAvailablePlans.find((p) => p.id === directBypassPlanId);
    const planName = chosenPlan?.display_name || chosenPlan?.name || "Selected Plan";
    const planPrice = chosenPlan ? `₹${(chosenPlan.price_minor / 100).toLocaleString()}/mo` : "";

    const ok = await confirm({
      title: "Confirm Direct Payment Bypass",
      description: `Directly bypass Step 3 payment for ${directBypassTargetClient.name} (${directBypassTargetClient.email})?`,
      details: [
        `Target Client: ${directBypassTargetClient.name}`,
        `Assigned Retainer: ${planName} ${planPrice}`,
        `Payment Method: ${directBypassPaymentMethod.toUpperCase()}`,
        `Admin Reference Note: ${directBypassNotes || "Direct offline payment bypass by Admin"}`,
        "This will activate an active retainer subscription and advance the client's onboarding to Step 4 (Questionnaire).",
      ],
      confirmText: "Bypass Payment & Advance to Step 4",
      cancelText: "Cancel",
      tone: "success",
      icon: "check",
    });
    if (!ok) return;

    try {
      setDirectBypassBusy(true);
      await directBypassClientPayment(directBypassTargetClient.id, {
        plan_id: directBypassPlanId,
        payment_method: directBypassPaymentMethod,
        notes: directBypassNotes || undefined,
      });
      await queryClient.invalidateQueries({ queryKey: ["admin-client-roster"] });
      await queryClient.invalidateQueries({ queryKey: ["admin-manual-payments"] });
      await queryClient.invalidateQueries({ queryKey: ["admin-client-brand-profile", directBypassTargetClient.id] });
      setIsDirectBypassModalOpen(false);
      setDirectBypassTargetClient(null);
      setDirectBypassNotes("");
      showToast(`Payment successfully bypassed for ${directBypassTargetClient.name}! Advanced to Step 4.`);
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Failed to bypass client payment.");
    } finally {
      setDirectBypassBusy(false);
    }
  };

  const handleRevokeBypass = async (client: { id: string; name: string }) => {
    const ok = await confirm({
      title: "Revoke Payment Bypass?",
      description: `Are you sure you want to revoke the payment bypass for ${client.name}? This will immediately cancel their active subscription, reset monthly deliverable quotas, and return their account to Step 3 (Unpaid / Choose plan).`,
      confirmText: "Revoke Bypass & Reset to Step 3",
      cancelText: "Keep Active",
      tone: "danger",
    });
    if (!ok) return;

    try {
      await revokeClientBypass(client.id);
      await queryClient.invalidateQueries({ queryKey: ["admin-client-roster"] });
      await queryClient.invalidateQueries({ queryKey: ["admin-manual-payments"] });
      await queryClient.invalidateQueries({ queryKey: ["admin-client-brand-profile", client.id] });
      await queryClient.invalidateQueries({ queryKey: ["admin-kpis"] });
      showToast(`Payment bypass revoked for ${client.name}. Account returned to Step 3.`);
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Failed to revoke payment bypass.");
    }
  };


  const filteredClientList = clientList.filter((c) => {
    const matchesSearch =
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.industry.toLowerCase().includes(search.toLowerCase()) ||
      c.contact.email.toLowerCase().includes(search.toLowerCase());
    
    let matchesStatus = true;
    if (statusFilter === "all") {
      matchesStatus = true;
    } else if (statusFilter === "active") {
      matchesStatus = c.lifecycleStatus === "onboarded";
    } else if (statusFilter === "paid_not_onboarded") {
      matchesStatus = c.lifecycleStatus === "paid_not_onboarded";
    } else if (statusFilter === "not_paid_not_onboarded") {
      matchesStatus = c.lifecycleStatus === "not_paid_not_onboarded";
    } else {
      matchesStatus = c.status.toLowerCase().includes(statusFilter.toLowerCase());
    }
    return matchesSearch && matchesStatus;
  });

  const filteredDeliverables = (liveDeliverables || []).filter((d) => {
    const status = (d.status || "").toUpperCase().replace(/_/g, " ");
    if (deliverableStatus === "approved" && status !== "APPROVED") return false;
    if (deliverableStatus === "production" && status !== "IN PRODUCTION") return false;
    if (
      deliverableStatus === "review" &&
      !["IN REVIEW", "PENDING APPROVAL", "INTERNAL QA", "READY FOR REVIEW"].includes(status)
    )
      return false;
    if (!deliverableSearch.trim()) return true;
    const searchLower = deliverableSearch.toLowerCase();
    const title = (d.title || "").toLowerCase();
    const desc = (d.description || "").toLowerCase();
    const assigned = (d.assignedTo || d.assigned_name || "").toLowerCase();
    return title.includes(searchLower) || desc.includes(searchLower) || assigned.includes(searchLower);
  });

  return (
    <div data-surface="ops" className="w-full min-h-screen font-sans bg-[#0B111C] flex flex-col">
      <AdminTopHeader
        title={selectedClientId && activeClient ? `${activeClient.name} • Client Details` : "Client Details"}
        activeTab="Client Details"
      />

      <main className="flex-1 px-6 lg:px-10 pt-6 sm:pt-8 pb-16 max-w-[1500px] w-full mx-auto space-y-4 sm:space-y-6">
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
          <div className="space-y-4 sm:space-y-6 animate-fade-in">
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
              <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto justify-between sm:justify-end">
                <span className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-500/10 text-emerald-400 text-xs font-bold border border-emerald-500/20 shrink-0">
                  <span className="size-2 rounded-full bg-emerald-500 animate-pulse" />
                  {rosterQuery.isPending ? "Loading clients…" : `${clientList.filter(c => c.lifecycleStatus === "onboarded").length} Active · ${clientList.length} Total Clients`}
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
                      { value: "paid_not_onboarded", label: "User Paid • Not Onboarded" },
                      { value: "not_paid_not_onboarded", label: "User Not Paid • Not Onboarded" },
                    ]}
                  />
                </div>
                <button
                  type="button"
                  onClick={() => setIsManualPaymentsModalOpen(true)}
                  className="flex-1 sm:flex-initial justify-center px-3.5 py-2.5 rounded-xl border border-amber-500/40 bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 text-xs font-bold flex items-center gap-2 cursor-pointer transition-all active:scale-95"
                >
                  <Banknote className="w-4 h-4 text-amber-400 shrink-0" />
                  <span>Offline Payments</span>
                  {pendingManualPayments.length > 0 && (
                    <span className="px-1.5 py-0.5 rounded-full text-[10px] font-black bg-amber-400 text-black leading-none">
                      {pendingManualPayments.length}
                    </span>
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => setIsOnboardClientModalOpen(true)}
                  className="flex-1 sm:flex-initial justify-center px-3.5 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:brightness-110 text-white text-xs font-bold flex items-center gap-1.5 shadow-md shadow-blue-600/20 cursor-pointer transition-all active:scale-95"
                >
                  <Plus className="w-4 h-4 shrink-0" /> Onboard Client
                </button>
                <button
                  type="button"
                  onClick={() => { setRemoveError(null); setClientToRemoveInput(clientList[0]?.id || ""); setIsRemoveClientModalOpen(true); }}
                  className="flex-1 sm:flex-initial justify-center px-3 py-2.5 rounded-xl border border-rose-500/40 bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-all active:scale-95"
                >
                  <Trash2 className="w-3.5 h-3.5 text-rose-400 shrink-0" /> Remove Client
                </button>
              </div>
            </div>

            {/* Client Cards Grid */}
            {rosterQuery.isPending ? (
              <CreoInlineLoader label="Loading clients" />
            ) : rosterQuery.isError ? (
              <div role="alert" className="min-h-[55vh] flex flex-col items-center justify-center gap-4 text-center">
                <AlertTriangle className="size-8 text-[#D8BF9B]" />
                <h3 className="text-base font-bold text-white">Unable to load clients</h3>
                <p className="text-sm text-[#97A0B3]">{rosterQuery.error.message}</p>
                <button type="button" onClick={() => void rosterQuery.refetch()} disabled={rosterQuery.isFetching} className="px-5 py-2 rounded-xl bg-[#BCCCE6] text-[#0B111C] font-semibold disabled:opacity-60">
                  {rosterQuery.isFetching ? "Retrying…" : "Try again"}
                </button>
              </div>
            ) : filteredClientList.length === 0 ? (
              <div className="min-h-[55vh] flex flex-col items-center justify-center gap-3 text-center">
                <Users className="size-8 text-[#7FA0D6]" />
                <h3 className="text-base font-bold text-white">{clientList.length ? "No matching clients" : "No clients yet"}</h3>
                <p className="text-sm text-[#97A0B3]">{clientList.length ? "Try another search or change the status filter." : "Onboard your first client to get started."}</p>
              </div>
            ) : (
            <div className="max-h-[calc(100vh-270px)] lg:max-h-none lg:min-h-[700px] overflow-y-auto lg:overflow-visible overscroll-contain pr-1 sm:pr-2.5 lg:pr-0 scrollbar-thin scrollbar-thumb-[#2A3446] hover:scrollbar-thumb-[#7FA0D6]/40 scrollbar-track-transparent">
              <div className="grid grid-cols-2 lg:grid-cols-3 gap-2.5 sm:gap-4 lg:gap-5 pb-6 lg:pb-12">
                {filteredClientList.map((client) => {
                  const isNotPaidNotOnboarded = client.lifecycleStatus === "not_paid_not_onboarded";
                  const isPaidNotOnboarded = client.lifecycleStatus === "paid_not_onboarded";
                  const isOnboarded = client.lifecycleStatus === "onboarded";

                  return (
                    <div
                      key={client.id}
                      onClick={() => setSelectedClientId(client.id)}
                      className="bg-[#161F2D]/80 backdrop-blur-xl rounded-2xl sm:rounded-3xl p-2.5 sm:p-5 border border-[#2A3446]/80 shadow-md hover:shadow-2xl hover:border-[#7FA0D6]/40 transition-all cursor-pointer group flex flex-col justify-between gap-2 sm:gap-4"
                    >
                      <div className="space-y-2 sm:space-y-3.5">
                        {/* Top Header: Avatar + Title */}
                        <div className="flex items-start gap-1.5 sm:gap-2.5 min-w-0">
                          <div className="w-7 h-7 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl bg-gradient-to-br from-[#121A26] to-[#0B111C] border border-[#2A3446] text-white font-black text-xs sm:text-base flex items-center justify-center shadow-xs shrink-0 mt-0.5">
                            {client.initials}
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-1 flex-wrap min-w-0">
                              <h3 className="font-bold text-[11px] sm:text-base text-white group-hover:text-[#7FA0D6] transition-colors break-words [overflow-wrap:anywhere] leading-snug" title={client.name}>
                                {client.name}
                              </h3>
                              {isOnboarded && (
                                <CheckCircle2 className="w-3 h-3 sm:w-4 sm:h-4 text-[#7FA0D6] fill-blue-600 text-white shrink-0" />
                              )}
                            </div>
                            <span className="text-[9px] sm:text-[11px] text-[#97A0B3] font-medium block break-words [overflow-wrap:anywhere] leading-tight" title={client.industry}>
                              {client.industry || "Digital Growth"}
                            </span>
                          </div>
                        </div>

                        {/* Clean Readable Metrics Block (Zero Truncation) */}
                        <div className="p-2 sm:p-2.5 bg-[#0B111C]/80 rounded-xl sm:rounded-2xl border border-[#2A3446]/60 text-xs space-y-1.5">
                          <div className="flex items-center justify-between text-[10.5px] sm:text-xs">
                            <span className="text-[10px] font-semibold text-[#97A0B3]">Retainer</span>
                            <span className="font-black text-[11px] sm:text-xs text-white">
                              {isNotPaidNotOnboarded ? "₹0" : `₹${(client.monthlyFee ?? 0).toLocaleString()}`}
                              {!isNotPaidNotOnboarded && <span className="text-[9px] text-[#97A0B3] font-normal">/mo</span>}
                            </span>
                          </div>
                          <div className="flex items-center justify-between gap-1 text-[10.5px] sm:text-xs">
                            <span className="text-[10px] font-semibold text-[#97A0B3] shrink-0">Pod</span>
                            <span className={`font-bold text-[10px] sm:text-[11px] break-words [overflow-wrap:anywhere] text-right leading-tight ${isOnboarded ? "text-[#7FA0D6]" : "text-[#97A0B3]"}`} title={client.pod?.name || (isPaidNotOnboarded ? "Pending Intake" : "None")}>
                              {client.pod?.name || (isPaidNotOnboarded ? "Pending Intake" : "None")}
                            </span>
                          </div>
                          <div className="flex items-center justify-between gap-1 text-[10.5px] sm:text-xs pt-1 border-t border-[#2A3446]/40">
                            <span className="text-[9.5px] font-semibold text-[#97A0B3] shrink-0">Contact</span>
                            <span className="font-medium text-[10px] sm:text-[11px] text-[#F1F5F9] break-words [overflow-wrap:anywhere] text-right leading-tight" title={client.contact?.name || client.name}>
                              {client.contact?.name || client.name}
                            </span>
                          </div>
                        </div>

                        {(() => {
                          const cardNeg = (negotiationsQuery.data || []).find(
                            (n) =>
                              n.status === "Pending Review" &&
                              ((n.clientId && n.clientId.toLowerCase() === client.id.toLowerCase()) ||
                               (n.clientEmail && client.contact?.email && n.clientEmail.toLowerCase() === client.contact.email.toLowerCase()) ||
                               (n.clientName && client.name && n.clientName.toLowerCase() === client.name.toLowerCase()))
                          );
                          if (!cardNeg) return null;
                          return (
                            <div className="flex items-center justify-between px-2 py-1 rounded-lg bg-purple-500/15 border border-purple-500/30 text-purple-300 text-[9.5px] sm:text-[11px] font-bold">
                              <span className="flex items-center gap-1 truncate">
                                <Zap className="size-2.5 sm:size-3 text-purple-400 animate-pulse shrink-0" />
                                <span className="truncate">{cardNeg.proposedOffer || "Negotiation"}</span>
                              </span>
                              <Link
                                to={`/admin/plans?negId=${cardNeg.id}&clientId=${client.id}`}
                                onClick={(e) => e.stopPropagation()}
                                className="text-purple-300 hover:text-white underline text-[9px] sm:text-[10px] font-black shrink-0 ml-1"
                              >
                                Review &rarr;
                              </Link>
                            </div>
                          );
                        })()}
                      </div>

                      {/* Bento Card Footer */}
                      <div className="pt-1.5 sm:pt-2.5 border-t border-[#2A3446]/60 space-y-1.5 sm:space-y-2">
                        {/* Status line & Details link */}
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-[#97A0B3] font-medium flex items-center gap-1 text-[9.5px] sm:text-[11px] min-w-0 mr-1">
                            <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${isOnboarded ? "bg-emerald-400" : isPaidNotOnboarded ? "bg-sky-400" : "bg-amber-400"}`} />
                            <span className="break-words [overflow-wrap:anywhere] leading-tight">
                              {isOnboarded
                                ? `${(client.deliverables || []).length} Deliverables`
                                : isPaidNotOnboarded
                                ? "Intake Pending"
                                : "Not Onboarded"}
                            </span>
                          </span>
                          <span className="text-[#7FA0D6] group-hover:text-blue-400 font-bold text-[9.5px] sm:text-[11px] group-hover:translate-x-0.5 transition-all shrink-0 flex items-center gap-0.5">
                            Details &rarr;
                          </span>
                        </div>

                        {/* Action buttons row */}
                        <div className="flex items-center gap-1 pt-1 border-t border-[#2A3446]/40">
                          {isNotPaidNotOnboarded ? (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setDirectBypassTargetClient({
                                  id: client.id,
                                  name: client.name,
                                  email: client.contact?.email || "",
                                });
                                setDirectBypassPlanId(plansQuery.data?.[0]?.id || "");
                                setIsDirectBypassModalOpen(true);
                              }}
                              className="flex-1 py-1 px-1 rounded-lg bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/30 text-emerald-300 text-[9.5px] sm:text-[11px] font-bold text-center truncate cursor-pointer transition-all active:scale-95"
                              title="Bypass payment for client who paid offline"
                            >
                              Bypass
                            </button>
                          ) : isPaidNotOnboarded ? (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleRevokeBypass({
                                  id: client.id,
                                  name: client.name,
                                });
                              }}
                              className="flex-1 py-1 px-1 rounded-lg bg-rose-500/15 hover:bg-rose-500/25 border border-rose-500/30 text-rose-300 text-[9.5px] sm:text-[11px] font-bold text-center truncate cursor-pointer transition-all active:scale-95"
                              title="Revoke payment bypass and return client to Step 3"
                            >
                              Revoke
                            </button>
                          ) : null}

                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSplitPaymentClient({
                                id: client.id,
                                name: client.name,
                              });
                              setIsSplitModalOpen(true);
                            }}
                            className="flex-1 py-1 px-1 rounded-lg bg-blue-500/15 hover:bg-blue-500/25 border border-blue-500/30 text-blue-300 text-[9.5px] sm:text-[11px] font-bold text-center truncate cursor-pointer transition-all active:scale-95"
                            title="Configure split payment instalments & reminders"
                          >
                            Split
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
            )}
          </div>
        ) : !activeClient ? (
          <div className="py-20 text-center space-y-4">
            <div className="inline-block p-4 rounded-2xl bg-[#161F2D] border border-[#2A3446]">
              <Clock className="w-8 h-8 text-[#7FA0D6] mx-auto animate-pulse" />
            </div>
            <h3 className="text-base font-bold text-white">Loading Client Details...</h3>
            <p className="text-xs text-[#97A0B3]">Synchronizing live roster and brand profile.</p>
            <button
              type="button"
              onClick={() => setSelectedClientId(null)}
              className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition-all cursor-pointer"
            >
              Back to Client Roster
            </button>
          </div>
        ) : (() => {
            const displayName = liveBrandProfile?.company_name || activeClient?.name || "Client";
            const displayIndustry = liveBrandProfile?.industry || activeClient?.industry || "Digital Growth & Direct-to-Consumer";
            const displayTimezone = liveBrandProfile?.timezone || activeClient?.timezone || "Client Time: IST (UTC+5:30)";
            const displaySignerName = liveBrandProfile?.full_name || activeClient?.contact?.name || activeClient?.name || "Authorized Contact";
            const displaySignerEmail = liveBrandProfile?.email || activeClient?.contact?.email || "";
            const displayInitials = (displayName || "C").trim().split(/\s+/).filter(Boolean).map((w: string) => w[0]).slice(0, 2).join("").toUpperCase() || "C";

            const isClientPaid = Boolean(
              (liveBrandProfile?.subscription?.status && ["active", "trialing", "paid"].includes(liveBrandProfile.subscription.status.toLowerCase())) ||
              activeClient?.isPaid ||
              (activeClient?.monthlyFee && activeClient.monthlyFee > 0)
            );
            const isClientOnboarded = Boolean(
              liveBrandProfile?.onboarding_completed_at ||
              (typeof liveBrandProfile?.onboarding_stage === "number" && liveBrandProfile.onboarding_stage >= 4) ||
              activeClient?.isOnboarded
            );
            const detailLifecycleStatus: "not_paid_not_onboarded" | "paid_not_onboarded" | "onboarded" = 
              !isClientOnboarded
                ? (!isClientPaid ? "not_paid_not_onboarded" : "paid_not_onboarded")
                : "onboarded";

            const isNotPaidNotOnboarded = detailLifecycleStatus === "not_paid_not_onboarded";
            const isPaidNotOnboarded = detailLifecycleStatus === "paid_not_onboarded";

            const activeClientPendingNeg = (negotiationsQuery.data || []).find(
              (n) =>
                n.status === "Pending Review" &&
                ((n.clientId && activeClient?.id && n.clientId.toLowerCase() === activeClient.id.toLowerCase()) ||
                 (n.clientEmail && activeClient?.contact?.email && n.clientEmail.toLowerCase() === activeClient.contact.email.toLowerCase()) ||
                 (n.clientName && activeClient?.name && n.clientName.toLowerCase() === activeClient.name.toLowerCase()))
            );

            return (
          <div className="space-y-4 sm:space-y-6 animate-fade-in">
            {/* Top Breadcrumb & Live Status */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 sm:gap-4">
              <div className="flex items-center justify-between sm:justify-start gap-1.5 sm:gap-2 text-xs font-bold text-[#97A0B3]">
                <button
                  type="button"
                  onClick={() => setSelectedClientId(null)}
                  className="hover:text-[#7FA0D6] flex items-center gap-1.5 transition-colors cursor-pointer text-[#F1F5F9] font-bold py-1 px-1.5 -ml-1.5 rounded-lg active:bg-white/5"
                >
                  <ArrowLeft className="w-4 h-4 text-[#7FA0D6]" />
                  <span className="sm:inline hidden">Back to Client Roster</span>
                  <span className="sm:hidden inline">Roster</span>
                </button>
                <div className="hidden sm:flex items-center gap-1.5 text-[#97A0B3]">
                  <span>/</span>
                  <span>Client Details</span>
                  <span>/</span>
                  <span className="text-white font-black truncate max-w-[200px]">{displayName}</span>
                </div>
                {/* Mobile version of Live Client badge */}
                <span className="sm:hidden px-2.5 py-1 rounded-full text-[10px] font-bold bg-[#161F2D] text-emerald-400 border border-emerald-500/30 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse shrink-0" />
                  Live Client • v2.4
                </span>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2 w-full sm:w-auto">
                <button
                  type="button"
                  onClick={() => {
                    if (!activeClient) return;
                    setDirectBypassTargetClient({
                      id: activeClient.id,
                      name: activeClient.name,
                      email: activeClient.contact?.email || "",
                    });
                    setDirectBypassPlanId(plansQuery.data?.[0]?.id || "");
                    setIsDirectBypassModalOpen(true);
                  }}
                  className="flex-1 sm:flex-initial justify-center px-3 py-1.5 sm:py-2 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-all whitespace-nowrap active:scale-95"
                >
                  <Banknote className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  <span>Bypass Payment</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (!activeClient) return;
                    setSplitPaymentClient({
                      id: activeClient.id,
                      name: activeClient.name,
                    });
                    setIsSplitModalOpen(true);
                  }}
                  className="flex-1 sm:flex-initial justify-center px-3 py-1.5 sm:py-2 rounded-xl bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/40 text-blue-300 text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-all whitespace-nowrap active:scale-95"
                >
                  <CreditCard className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                  <span>Split Payment</span>
                </button>
                <span className="hidden sm:flex justify-center px-3 py-2 rounded-full text-xs font-bold bg-[#161F2D] text-white border border-[#2A3446] items-center gap-1.5 shadow-2xs whitespace-nowrap">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shrink-0" />
                  Live Client • v2.4
                </span>
              </div>
            </div>

            {/* Lifecycle Notification Banner */}
            {activeClientPendingNeg && (
              <div className="p-3.5 sm:p-5 rounded-2xl bg-gradient-to-r from-purple-950/40 via-[#161F2D] to-blue-950/40 border-2 border-purple-500/50 text-purple-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 shadow-lg animate-fade-in">
                <div className="flex items-start gap-3">
                  <div className="size-8 sm:size-9 rounded-xl bg-purple-500/20 text-purple-300 flex items-center justify-center shrink-0 mt-0.5">
                    <Zap className="size-4 sm:size-5 text-purple-400 animate-pulse" />
                  </div>
                  <div className="space-y-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="text-xs sm:text-sm font-black uppercase tracking-wider text-purple-300 truncate">
                        Client Plan Negotiation Action Required
                      </h3>
                      <span className="px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 text-[10px] font-black shrink-0">
                        Offer: {activeClientPendingNeg.proposedOffer || "Custom Offer"}
                      </span>
                    </div>
                    <p className="text-xs text-[#F1F5F9]">
                      This client requested custom pricing terms for: <strong>{activeClientPendingNeg.targetTopic}</strong>.
                      {activeClientPendingNeg.notes && (
                        <span className="text-[#97A0B3] italic block mt-0.5">
                          "{activeClientPendingNeg.notes}"
                        </span>
                      )}
                    </p>
                  </div>
                </div>
                <Link
                  to={`/admin/plans?negId=${activeClientPendingNeg.id}&clientId=${activeClient?.id}`}
                  className="w-full sm:w-auto px-4 py-2 sm:py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs flex items-center justify-center gap-1.5 shrink-0 shadow-md transition-all active:scale-95"
                >
                  Review &amp; Accept Retainer <ArrowUpRight className="w-4 h-4" />
                </Link>
              </div>
            )}

            {isNotPaidNotOnboarded && (
              <div className="p-3.5 sm:p-5 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-300 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-sm">
                <div className="flex items-start sm:items-center gap-3 min-w-0">
                  <div className="size-8 sm:size-9 rounded-xl bg-amber-500/20 flex items-center justify-center shrink-0">
                    <AlertTriangle className="w-4 h-4 text-amber-400" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="text-xs sm:text-sm font-black uppercase tracking-wider text-amber-400">
                        Account Unpaid &amp; Intake Pending
                      </h3>
                      <span className="sm:hidden px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-400 text-[10px] font-black shrink-0">
                        ₹0 Fee
                      </span>
                    </div>
                    <p className="hidden sm:block text-xs text-[#F1F5F9] leading-relaxed mt-1">
                      This client account has logged in but has not subscribed or paid for any retainer plan and has not completed the onboarding intake. Mock data has been disabled: retainer fee is ₹0, and no creative pod or design assets are assigned.
                    </p>
                    <p className="sm:hidden text-[11px] text-[#97A0B3] mt-0.5">
                      No active subscription or creative pod assigned.
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={async () => {
                    if (!activeClient) return;
                    try {
                      setIsSendingDetailReminder(true);
                      const res = await sendClientReminder({
                        client_id: activeClient.id,
                        client_name: activeClient.name,
                        reminder_type: "payment",
                      });
                      showToast(res.message || "Payment reminder dispatched to client!");
                    } catch (err: any) {
                      showToast(err?.message || "Failed to dispatch reminder.");
                    } finally {
                      setIsSendingDetailReminder(false);
                    }
                  }}
                  disabled={isSendingDetailReminder}
                  className="w-full sm:w-auto justify-center px-3 py-1.5 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 font-bold text-xs inline-flex items-center gap-1.5 cursor-pointer transition-colors whitespace-nowrap shrink-0 disabled:opacity-60 active:scale-95"
                  title="Send payment reminder notification to client"
                >
                  {isSendingDetailReminder ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Bell className="w-3.5 h-3.5" />}
                  <span>Send Payment Reminder</span>
                </button>
              </div>
            )}

            {isPaidNotOnboarded && (
              <div className="p-3.5 sm:p-5 rounded-2xl bg-sky-500/10 border border-sky-500/30 text-sky-300 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-sm">
                <div className="flex items-start sm:items-center gap-3 min-w-0">
                  <div className="size-8 sm:size-9 rounded-xl bg-sky-500/20 flex items-center justify-center shrink-0">
                    <Sparkles className="w-4 h-4 text-sky-400" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="text-xs sm:text-sm font-black uppercase tracking-wider text-sky-400">
                        Paid · Onboarding Intake Pending
                      </h3>
                      <span className="px-2 py-0.5 rounded-full bg-sky-500/20 text-sky-300 text-[10px] font-black shrink-0">
                        Stage {liveBrandProfile?.onboarding_stage || 1} of 4
                      </span>
                    </div>
                    <p className="hidden sm:block text-xs text-[#F1F5F9] leading-relaxed mt-1">
                      Subscription payment is verified and active ({activeClient?.tier || "Paid Plan"}). However, the client has not finalized their brand onboarding questionnaire yet (Stage {liveBrandProfile?.onboarding_stage || 1} of 4). Creative Pod and Brand DNA will be generated once intake is completed.
                    </p>
                    <p className="sm:hidden text-[11px] text-[#97A0B3] mt-0.5">
                      Payment verified. Pod generation starts after intake questionnaire is completed.
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={async () => {
                    if (!activeClient) return;
                    try {
                      setIsSendingDetailReminder(true);
                      const res = await sendClientReminder({
                        client_id: activeClient.id,
                        client_name: activeClient.name,
                        reminder_type: "onboarding",
                      });
                      showToast(res.message || "Onboarding reminder dispatched to client!");
                    } catch (err: any) {
                      showToast(err?.message || "Failed to dispatch reminder.");
                    } finally {
                      setIsSendingDetailReminder(false);
                    }
                  }}
                  disabled={isSendingDetailReminder}
                  className="w-full sm:w-auto justify-center px-3 py-1.5 rounded-xl bg-sky-500/20 hover:bg-sky-500/30 text-sky-300 border border-sky-500/40 font-bold text-xs inline-flex items-center gap-1.5 cursor-pointer transition-colors whitespace-nowrap shrink-0 disabled:opacity-60 active:scale-95"
                  title="Send onboarding reminder notification to client"
                >
                  {isSendingDetailReminder ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Bell className="w-3.5 h-3.5" />}
                  <span>Send Onboarding Reminder</span>
                </button>
              </div>
            )}

            {/* Client Header Card matching Screenshot */}
            <div className="bg-[#161F2D] rounded-2xl sm:rounded-3xl p-4 sm:p-6 lg:p-7 border border-[#2A3446] shadow-[0_4px_30px_rgba(0,0,0,0.03)] space-y-3.5 sm:space-y-4">
              <div className="flex flex-col gap-4 sm:gap-6">
                <div className="flex items-start sm:items-center gap-3.5 sm:gap-4 min-w-0">
                  <div className="size-12 sm:size-16 rounded-xl sm:rounded-2xl bg-[#0B111C] text-white font-black text-lg sm:text-2xl flex items-center justify-center shadow-lg shrink-0 border border-[#2A3446]">
                    {displayInitials}
                  </div>
                  <div className="space-y-1 min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-1.5 sm:gap-2.5">
                      <h1 className="text-lg sm:text-2xl font-black text-white tracking-tight truncate max-w-[200px] sm:max-w-none">
                        {displayName}
                      </h1>
                      {isNotPaidNotOnboarded ? (
                        <>
                          <span className="px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-400 border border-amber-500/30 text-[10px] font-black uppercase tracking-wider">
                            UNPAID
                          </span>
                          <span className="hidden sm:inline-flex px-2.5 py-0.5 rounded-full bg-amber-500/15 text-amber-400 border border-amber-500/30 text-[10px] font-black tracking-wider items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                            user not paid and not onboarded yet
                          </span>
                        </>
                      ) : isPaidNotOnboarded ? (
                        <>
                          <span className="px-2 py-0.5 rounded-full bg-sky-500/15 text-sky-400 border border-sky-500/30 text-[10px] font-black uppercase tracking-wider">
                            {activeClient?.tierBadge || "PAID PLAN"}
                          </span>
                          <span className="hidden sm:inline-flex px-2.5 py-0.5 rounded-full bg-sky-500/15 text-sky-400 border border-sky-500/30 text-[10px] font-black tracking-wider items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-sky-400 animate-pulse" />
                            user paid but not onboarded
                          </span>
                        </>
                      ) : (
                        <>
                          <CheckCircle2 className="w-4 h-4 text-[#7FA0D6] fill-blue-600 text-white shrink-0" />
                          <span className="px-2 py-0.5 rounded-full bg-[#7FA0D6]/15 text-[#7FA0D6] border border-[#7FA0D6]/30 text-[10px] font-black uppercase tracking-wider">
                            {activeClient?.tierBadge || "ACTIVE"}
                          </span>
                          <span className="hidden sm:inline-flex px-2.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 text-[10px] font-black uppercase tracking-wider items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                            {activeClient?.status || "ACTIVE"}
                          </span>
                        </>
                      )}
                    </div>

                    <div className="flex flex-wrap items-center gap-x-3 sm:gap-x-5 gap-y-1 text-[11px] sm:text-xs text-[#97A0B3] font-medium">
                      <span className="flex items-center gap-1 truncate max-w-[150px] sm:max-w-none">
                        <Folder className="w-3.5 h-3.5 text-[#97A0B3] shrink-0" />
                        <span className="truncate">{displayIndustry}</span>
                      </span>
                      <span>•</span>
                      <span className="flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5 text-[#97A0B3] shrink-0" />
                        <span>{displayTimezone}</span>
                      </span>
                      <span className="hidden sm:inline">•</span>
                      <span className="hidden sm:flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5 text-[#97A0B3] shrink-0" />
                        <span>{activeClient?.activeSince || "Active Retainer"}</span>
                      </span>
                    </div>
                  </div>
                </div>

                {/* Header Action Buttons */}
                <div className="flex items-center gap-2 w-full border-t border-[#2A3446] pt-3 overflow-x-auto no-scrollbar">
                  <Link
                    to={`/admin/clients/${liveBrandProfile?.client_id || activeClient?.id || ""}/brand`}
                    className="flex-1 sm:flex-initial justify-center px-3 sm:px-4 py-2 sm:py-2.5 rounded-xl border border-[#7FA0D6]/40 bg-[#7FA0D6]/15 hover:bg-[#7FA0D6]/25 text-xs font-bold text-[#7FA0D6] flex items-center gap-1.5 shadow-2xs cursor-pointer transition-all whitespace-nowrap active:scale-95"
                  >
                    <ExternalLink className="w-3.5 h-3.5 text-[#7FA0D6] shrink-0" />
                    <span>Brand Brief</span>
                  </Link>
                  <button
                    type="button"
                    onClick={() => setIsInvoiceModalOpen(true)}
                    className="flex-1 sm:flex-initial justify-center px-3 sm:px-4 py-2 sm:py-2.5 rounded-xl border border-[#2A3446] bg-[#161F2D] hover:bg-[#0B111C] text-xs font-bold text-[#F1F5F9] flex items-center gap-1.5 shadow-2xs cursor-pointer transition-all whitespace-nowrap active:scale-95"
                  >
                    <FileText className="w-3.5 h-3.5 text-[#97A0B3] shrink-0" />
                    <span>Monthly Invoice</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => { setRemoveError(null); setIsCancelClientModalOpen(true); }}
                    className="flex-1 sm:flex-initial justify-center px-3 sm:px-4 py-2 sm:py-2.5 rounded-xl border border-rose-500/40 bg-rose-500/10 hover:bg-rose-500/20 text-xs font-bold text-rose-400 flex items-center gap-1.5 shadow-2xs cursor-pointer transition-all whitespace-nowrap active:scale-95"
                  >
                    <Trash2 className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                    <span className="sm:inline hidden">Remove Client &amp; Cancel Plan</span>
                    <span className="sm:hidden inline">Remove Client</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Mobile View Tab Switcher (lg:hidden) */}
            <div className="lg:hidden flex items-center p-1 bg-[#161F2D] rounded-2xl border border-[#2A3446] shadow-sm">
              <button
                type="button"
                onClick={() => setClientDetailTab("overview")}
                className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                  clientDetailTab === "overview"
                    ? "bg-[#7FA0D6] text-white shadow-sm"
                    : "text-[#97A0B3] hover:text-white"
                }`}
              >
                <LayoutGrid className="w-3.5 h-3.5" />
                <span>Overview</span>
              </button>
              <button
                type="button"
                onClick={() => setClientDetailTab("deliverables")}
                className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer relative ${
                  clientDetailTab === "deliverables"
                    ? "bg-[#7FA0D6] text-white shadow-sm"
                    : "text-[#97A0B3] hover:text-white"
                }`}
              >
                <Layers className="w-3.5 h-3.5" />
                <span>Deliverables</span>
                {filteredDeliverables.length > 0 && (
                  <span className={`px-1.5 py-0.2 rounded-full text-[9px] font-black ${
                    clientDetailTab === "deliverables"
                      ? "bg-white/20 text-white"
                      : "bg-[#7FA0D6]/20 text-[#7FA0D6]"
                  }`}>
                    {filteredDeliverables.length}
                  </span>
                )}
              </button>
              <button
                type="button"
                onClick={() => setClientDetailTab("brand_pod")}
                className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                  clientDetailTab === "brand_pod"
                    ? "bg-[#7FA0D6] text-white shadow-sm"
                    : "text-[#97A0B3] hover:text-white"
                }`}
              >
                <Palette className="w-3.5 h-3.5" />
                <span>Brand &amp; Pod</span>
              </button>
            </div>

            {/* 4 Main Grid Cards matching Screenshot (2x2 on Desktop, Tabbed on Mobile) */}
            <div className={`grid grid-cols-1 lg:grid-cols-2 gap-3.5 sm:gap-6 ${
              clientDetailTab === "deliverables" ? "hidden lg:grid" : ""
            }`}>
              {/* CARD 1: PRIMARY CONTACT & CLIENT TEAM */}
              <div className={`bg-[#161F2D] rounded-2xl sm:rounded-3xl p-4 sm:p-6 border border-[#2A3446] shadow-[0_4px_25px_rgba(0,0,0,0.03)] space-y-4 sm:space-y-5 flex flex-col justify-between ${
                clientDetailTab === "brand_pod" ? "hidden lg:flex" : ""
              }`}>
                <div className="space-y-3.5 sm:space-y-4">
                  <div className="flex items-center justify-between border-b border-[#2A3446] pb-2.5 sm:pb-3 gap-2">
                    <span className="text-[10px] sm:text-[11px] font-extrabold text-[#97A0B3] uppercase tracking-wider truncate">
                      PRIMARY CONTACT &amp; CLIENT TEAM
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        setClientMemberForm({
                          full_name: "",
                          email: "",
                          role_title: "Marketing Lead",
                          password: `Creo@${Math.floor(1000 + Math.random() * 9000)}!`,
                          dispatch_email: "",
                          send_credentials_email: true,
                        });
                        setIsOnboardClientMemberModalOpen(true);
                      }}
                      className="px-2.5 py-1 rounded-xl bg-blue-600/20 hover:bg-blue-600/30 text-blue-300 border border-blue-500/30 text-[10px] sm:text-[11px] font-bold flex items-center gap-1 cursor-pointer transition-all whitespace-nowrap shrink-0"
                    >
                      <Plus className="w-3.5 h-3.5" /> <span className="sm:inline hidden">Onboard</span> Team Member
                    </button>
                  </div>

                  <div className="flex items-center gap-3 sm:gap-3.5">
                    <div className="size-10 sm:size-12 rounded-full bg-gradient-to-br from-blue-600 to-indigo-700 text-white font-black text-sm sm:text-base flex items-center justify-center shadow-md shrink-0">
                      {displayInitials[0] || "C"}
                    </div>
                    <div className="min-w-0">
                      <h3 className="text-sm sm:text-base font-bold text-white truncate">{displaySignerName}</h3>
                      <p className="text-[11px] sm:text-xs text-[#97A0B3] font-medium truncate">{activeClient?.contact?.title || "Account Owner & Authorized Contact"}</p>
                    </div>
                  </div>

                  <div className="space-y-2 pt-1 sm:pt-2">
                    <div className="p-2.5 sm:p-3 bg-[#0B111C]/80 rounded-xl sm:rounded-2xl flex items-center justify-between border border-[#2A3446] text-xs gap-2">
                      <div className="flex items-center gap-2 text-[#97A0B3] font-medium shrink-0">
                        <Mail className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-[#97A0B3]" />
                        <span>Email</span>
                      </div>
                      <a href={`mailto:${displaySignerEmail}`} className="text-[#7FA0D6] font-bold hover:underline truncate max-w-[170px] sm:max-w-none text-right">
                        {displaySignerEmail || "N/A"}
                      </a>
                    </div>

                    <div className="p-2.5 sm:p-3 bg-[#0B111C]/80 rounded-xl sm:rounded-2xl flex items-center justify-between border border-[#2A3446] text-xs gap-2">
                      <div className="flex items-center gap-2 text-[#97A0B3] font-medium shrink-0">
                        <Phone className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-[#97A0B3]" />
                        <span>Direct Phone</span>
                      </div>
                      <span className="font-bold text-white font-mono truncate text-right">
                        {liveBrandProfile?.phone ||
                          (liveBrandProfile?.brand_dna as any)?.phone ||
                          (activeClient?.contact?.phone && activeClient.contact.phone !== "+91 98401 23890" && activeClient.contact.phone !== "Not provided yet"
                            ? activeClient.contact.phone
                            : "Not provided yet")}
                      </span>
                    </div>
                  </div>

                  {/* Additional Client Team Members Section */}
                  <div className="pt-2 space-y-2 border-t border-[#2A3446]/60">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-extrabold text-[#97A0B3] uppercase tracking-wider">
                        Client Stakeholders &amp; Team Members
                      </span>
                      <span className="text-[10px] font-bold text-[#7FA0D6]">
                        {clientTeamMembersQuery.data?.length || 0} Member{clientTeamMembersQuery.data?.length === 1 ? "" : "s"}
                      </span>
                    </div>

                    {clientTeamMembersQuery.data && clientTeamMembersQuery.data.length > 0 ? (
                      <div className="space-y-1.5 max-h-40 sm:max-h-48 overflow-y-auto pr-1">
                        {clientTeamMembersQuery.data.map((m: any) => (
                          <div
                            key={m.id}
                            className="p-2 sm:p-2.5 bg-[#0B111C]/90 rounded-xl border border-[#2A3446] flex items-center justify-between gap-2"
                          >
                            <div className="min-w-0">
                              <div className="flex items-center gap-1.5">
                                <span className="font-bold text-xs text-white truncate">{m.full_name}</span>
                                <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-blue-500/15 text-blue-300 border border-blue-500/30 shrink-0">
                                  {m.role_title}
                                </span>
                              </div>
                              <span className="text-[11px] text-[#97A0B3] font-mono truncate block">{m.email}</span>
                            </div>
                            <span className="px-2 py-0.5 rounded-full text-[9px] font-extrabold uppercase bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 shrink-0">
                              Active
                            </span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="p-2.5 sm:p-3 bg-[#0B111C]/40 rounded-xl border border-[#2A3446] text-center text-[10px] sm:text-[11px] text-[#97A0B3]">
                        No additional client team members added yet. Click &quot;Onboard Team Member&quot; to invite colleagues with credentials.
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex items-center justify-between text-[11px] sm:text-xs text-[#97A0B3] pt-2.5 sm:pt-3 border-t border-[#2A3446] font-medium">
                  <span className="flex items-center gap-1 text-emerald-400 font-semibold truncate max-w-[200px] sm:max-w-none">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                    Contract: {isNotPaidNotOnboarded ? "Pending" : isPaidNotOnboarded ? "Confirmed" : (activeClient?.contact?.renewedDate || "Current Sprint")}
                  </span>
                  <span>Term: {isNotPaidNotOnboarded ? "—" : `${activeClient?.contact?.termMonths ?? 12} Mo`}</span>
                </div>
              </div>

              {/* CARD 2: TIER TERMS & SCOPE */}
              <div className={`bg-[#161F2D] rounded-2xl sm:rounded-3xl p-4 sm:p-6 border border-[#2A3446] shadow-[0_4px_25px_rgba(0,0,0,0.03)] space-y-4 sm:space-y-5 flex flex-col justify-between ${
                clientDetailTab === "brand_pod" ? "hidden lg:flex" : ""
              }`}>
                <div className="space-y-3.5 sm:space-y-4">
                  <div className="flex items-center justify-between border-b border-[#2A3446] pb-2.5 sm:pb-3">
                    <span className="text-[10px] sm:text-[11px] font-extrabold text-[#97A0B3] uppercase tracking-wider">
                      TIER TERMS &amp; SCOPE
                    </span>
                    <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${isNotPaidNotOnboarded ? "bg-amber-500/15 text-amber-400 border-amber-500/30" : isPaidNotOnboarded ? "bg-sky-500/15 text-sky-400 border-sky-500/30" : "bg-[#7FA0D6]/15 text-[#7FA0D6] border-[#7FA0D6]/30"}`}>
                      {isNotPaidNotOnboarded ? "Unpaid" : isPaidNotOnboarded ? "Payment Verified" : "Active Cycle"}
                    </span>
                  </div>

                  <div className="flex items-baseline justify-between">
                    <div>
                      <span className="text-2xl sm:text-3xl font-black text-white">
                        {isNotPaidNotOnboarded ? "₹0" : `₹${(activeClient?.monthlyFee ?? 0).toLocaleString()}`}
                      </span>
                      <span className="text-xs font-bold text-[#97A0B3]">
                        {isNotPaidNotOnboarded ? " /mo (Unpaid)" : " /mo"}
                      </span>
                    </div>
                    {activeClient?.addon && isClientOnboarded && (
                      <span className="px-2 py-0.5 rounded-lg bg-emerald-50 text-emerald-700 text-xs font-bold border border-emerald-200 flex items-center gap-1">
                        <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                        {activeClient.addon}
                      </span>
                    )}
                  </div>

                  <p className="text-[11px] sm:text-xs text-[#97A0B3]">
                    {isNotPaidNotOnboarded
                      ? "No active subscription billing scheduled. Client has not subscribed to any plan."
                      : isPaidNotOnboarded
                      ? "Subscription payment confirmed. Creative production starts once onboarding is submitted."
                      : `Next billing scheduled for ${activeClient?.nextBilling || "Next Month"} via ${activeClient?.billingMethod || "Direct ACH"}.`}
                  </p>

                  {/* Monthly Output Burn bar */}
                  {!isClientOnboarded ? (
                    <div className="p-2.5 sm:p-3 bg-[#0B111C]/60 rounded-xl sm:rounded-2xl border border-[#2A3446] text-xs text-[#97A0B3]">
                      <span className="font-bold text-white block mb-0.5">Production Queue Inactive</span>
                      {isPaidNotOnboarded
                        ? "Asset deliveries and quota burn will activate as soon as onboarding intake is complete."
                        : "Asset production and quota burn are inactive because user is not paid and not onboarded yet."}
                    </div>
                  ) : (
                    <div className="space-y-1.5 sm:space-y-2">
                      <div className="flex items-center justify-between text-xs font-bold">
                        <span className="text-[#F1F5F9]">Monthly Output Burn</span>
                        <span className="text-[#7FA0D6]">
                          {activeClient?.totalAssetsDelivered ?? 0} / {activeClient?.totalAssetsQuota ?? 0} Assets Delivered (
                          {Math.round((((activeClient?.totalAssetsDelivered || 0) / (activeClient?.totalAssetsQuota || 1)) * 100))}%)
                          {isClientOnboarded && (
                            <span className="text-white ml-1 font-extrabold">• {Math.max(0, (activeClient?.totalAssetsQuota ?? 0) - (activeClient?.totalAssetsDelivered ?? 0))} Left</span>
                          )}
                        </span>
                      </div>
                      <div className="w-full bg-[#161F2D] rounded-full h-2 sm:h-2.5 overflow-hidden">
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
                  )}

                  {/* 3 Metric Counters */}
                  <div className="grid grid-cols-3 gap-2 pt-1">
                    <div className="p-2 sm:p-3 bg-[#0B111C] rounded-xl sm:rounded-2xl text-center space-y-0.5 border border-[#2A3446]">
                      <span className="text-xs sm:text-sm font-black text-white">
                        {isClientOnboarded ? `${activeClient?.postsDelivered ?? 0}/${activeClient?.postsQuota ?? 0}` : "0/0"}
                      </span>
                      <span className="text-[9px] sm:text-[10px] font-bold text-[#97A0B3] block uppercase">POSTS</span>
                      {isClientOnboarded && (
                        <span className="text-[9px] sm:text-[10px] font-bold text-emerald-400 block truncate">
                          {Math.max(0, (activeClient?.postsQuota ?? 0) - (activeClient?.postsDelivered ?? 0))} left
                        </span>
                      )}
                    </div>
                    <div className="p-2 sm:p-3 bg-[#0B111C] rounded-xl sm:rounded-2xl text-center space-y-0.5 border border-[#2A3446]">
                      <span className="text-xs sm:text-sm font-black text-white">
                        {isClientOnboarded ? `${activeClient?.reelsDelivered ?? 0}/${activeClient?.reelsQuota ?? 0}` : "0/0"}
                      </span>
                      <span className="text-[9px] sm:text-[10px] font-bold text-[#97A0B3] block uppercase">REELS</span>
                      {isClientOnboarded && (
                        <span className="text-[9px] sm:text-[10px] font-bold text-emerald-400 block truncate">
                          {Math.max(0, (activeClient?.reelsQuota ?? 0) - (activeClient?.reelsDelivered ?? 0))} left
                        </span>
                      )}
                    </div>
                    <div className="p-2 sm:p-3 bg-[#0B111C] rounded-xl sm:rounded-2xl text-center space-y-0.5 border border-[#2A3446]">
                      <span className="text-xs sm:text-sm font-black text-white">
                        {isClientOnboarded ? `${activeClient?.storiesDelivered ?? 0}/${activeClient?.storiesQuota ?? 0}` : "0/0"}
                      </span>
                      <span className="text-[9px] sm:text-[10px] font-bold text-[#97A0B3] block uppercase">STORIES</span>
                      {isClientOnboarded && (
                        <span className="text-[9px] sm:text-[10px] font-bold text-emerald-400 block truncate">
                          {Math.max(0, (activeClient?.storiesQuota ?? 0) - (activeClient?.storiesDelivered ?? 0))} left
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between text-[11px] sm:text-xs text-[#97A0B3] pt-2.5 sm:pt-3 border-t border-[#2A3446] font-medium">
                  <span className="truncate max-w-[200px] sm:max-w-none">
                    {isClientOnboarded
                      ? `Sprint ${activeClient?.sprintNumber ?? 1}: ${activeClient?.daysRemainingInSprint ?? 14} days left`
                      : "Sprint: Awaiting Intake"}
                  </span>
                  <button
                    type="button"
                    onClick={() => showToast(isClientOnboarded ? "Opening Client Quota Ledger..." : "Quota ledger unavailable for un-onboarded client.")}
                    className="text-[#7FA0D6] font-bold hover:underline cursor-pointer shrink-0"
                  >
                    Quota Log
                  </button>
                </div>
              </div>

              {/* CARD 3: CLIENT BRAND ECOSYSTEM & GUIDELINES */}
              {!isClientOnboarded ? (
                <div className="bg-[#161F2D] rounded-3xl p-6 border border-[#2A3446] shadow-[0_4px_25px_rgba(0,0,0,0.03)] space-y-5 flex flex-col justify-between">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between border-b border-[#2A3446] pb-3">
                      <div className="flex items-center gap-2">
                        <Palette className={`w-4 h-4 ${isPaidNotOnboarded ? "text-sky-400" : "text-amber-400"}`} />
                        <h2 className="text-xs font-extrabold text-white uppercase tracking-wider">
                          Client Brand Ecosystem & Guidelines
                        </h2>
                      </div>
                      <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${isPaidNotOnboarded ? "bg-sky-500/15 text-sky-400 border-sky-500/30" : "bg-amber-500/15 text-amber-400 border-amber-500/30"}`}>
                        {isPaidNotOnboarded ? "Awaiting Intake Questionnaire" : "Pending Onboarding"}
                      </span>
                    </div>

                    <div className="p-8 text-center space-y-3 bg-[#0B111C]/60 rounded-2xl border border-[#2A3446]">
                      <div className={`w-12 h-12 rounded-2xl flex items-center justify-center mx-auto border ${isPaidNotOnboarded ? "bg-sky-500/10 border-sky-500/20 text-sky-400" : "bg-amber-500/10 border-amber-500/20 text-amber-400"}`}>
                        <Palette className="w-6 h-6" />
                      </div>
                      <h4 className="text-sm font-bold text-white">
                        {isPaidNotOnboarded ? "Brand DNA Brief In Progress" : "Brand DNA Not Available"}
                      </h4>
                      <p className="text-xs text-[#97A0B3] max-w-md mx-auto leading-relaxed">
                        {isPaidNotOnboarded
                          ? "The client has paid for their subscription. Approved brand color palette, typography hierarchy, tone voice, and asset vault will be generated once they complete the onboarding questionnaire."
                          : "user not paid and not onboarded yet. Brand guidelines, visual spectrum, and drive vaults will be configured after plan activation and onboarding completion."}
                      </p>
                      {isPaidNotOnboarded && (
                        <span className="inline-block mt-2 px-3 py-1 rounded-full text-[11px] font-bold bg-[#161F2D] text-sky-300 border border-sky-500/30">
                          Onboarding Progress: Stage {liveBrandProfile?.onboarding_stage || 1} of 4
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center justify-between text-xs text-[#97A0B3] font-medium pt-3 border-t border-[#2A3446] gap-2">
                    <span className="text-[#97A0B3]">Brand Kit Status: {isPaidNotOnboarded ? "Awaiting Submission" : "Not Initialized"}</span>
                    <Link
                      to={`/admin/clients/${liveBrandProfile?.client_id || activeClient?.id || ""}/brand`}
                      className="text-[#7FA0D6] font-bold hover:underline flex items-center gap-1"
                    >
                      View Brand Intake Overview &rarr;
                    </Link>
                  </div>
                </div>
              ) : (
                <div className="bg-[#161F2D] rounded-3xl p-6 border border-[#2A3446] shadow-[0_4px_25px_rgba(0,0,0,0.03)] space-y-5">
                  <div className="flex items-center justify-between border-b border-[#2A3446] pb-3">
                    <div className="flex items-center gap-2">
                      <Palette className="w-4 h-4 text-[#7FA0D6]" />
                      <h2 className="text-xs font-extrabold text-white uppercase tracking-wider">
                        Client Brand Ecosystem & Guidelines
                      </h2>
                    </div>
                    <span className="px-2.5 py-0.5 rounded-full bg-[#161F2D] text-[#F1F5F9] text-[10px] font-bold">
                      {activeClient?.brand?.kitVersion || "Design Kit v2.4"}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Typography Pairing & System */}
                    <div className="p-3.5 bg-[#0B111C]/70 rounded-2xl space-y-2 border border-[#2A3446] text-xs">
                      <div className="flex items-center gap-1.5 text-[10px] font-extrabold text-[#97A0B3] uppercase tracking-wider">
                        <Type className="size-3.5 text-[#7FA0D6]" />
                        <span>TYPOGRAPHY PAIRING & SYSTEM</span>
                      </div>
                      <div className="space-y-2 pt-1 text-[#F1F5F9]">
                        <div className="p-2.5 bg-[#161F2D]/60 rounded-xl border border-[#2A3446]">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-[#97A0B3] block mb-0.5">
                            Headlines / Display
                          </span>
                          <p className="font-bold text-sm text-white">{realTypography.headingsFont}</p>
                          <p className="text-[11px] text-[#97A0B3] mt-0.5">Bold, punchy titles optimized for feed stops.</p>
                        </div>
                        <div className="p-2.5 bg-[#161F2D]/60 rounded-xl border border-[#2A3446]">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-[#97A0B3] block mb-0.5">
                            Body Copy / Subtitles
                          </span>
                          <p className="font-medium text-xs text-white">{realTypography.bodyFont}</p>
                          <p className="text-[11px] text-[#97A0B3] mt-0.5">High legibility for reel captions and carousel body copy.</p>
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
                          {realTone.summary}
                        </p>
                      </div>
                      <div className="space-y-2">
                        {realTone.audience && (
                          <div className="pt-2 border-t border-[#2A3446]/60">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-[#97A0B3] block">
                              Target Audience
                            </span>
                            <p className="text-[11px] text-[#F1F5F9] mt-0.5 line-clamp-2">
                              {realTone.audience}
                            </p>
                          </div>
                        )}
                        <div className="flex flex-wrap gap-1.5 pt-1">
                          {realTone.tags.map((tag: string, tagIdx: number) => (
                            <span key={`${tag}-${tagIdx}`} className="px-2 py-0.5 rounded-md bg-[#161F2D] border border-[#2A3446] text-[10px] font-bold text-[#F1F5F9] shadow-2xs">
                              {tag}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Visual Palette & Tokens */}
                  <div className="space-y-2 pt-1">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Palette className="size-3.5 text-[#7FA0D6]" />
                        <span className="text-[10px] font-extrabold text-[#97A0B3] uppercase tracking-wider">
                          VISUAL PALETTE & TOKENS
                        </span>
                      </div>
                      <span className="text-[10px] font-medium text-[#97A0B3]">
                        Click swatch to copy hex
                      </span>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      {realColors.map((c, cIdx) => (
                        <div
                          key={`${c.hex}-${cIdx}`}
                          onClick={() => handleCopyHex(c.hex, cIdx)}
                          className="group relative bg-[#0B111C] border border-[#2A3446] hover:border-[#7FA0D6]/50 rounded-xl p-2.5 cursor-pointer transition-all hover:scale-[1.02] shadow-sm"
                          title="Click to copy hex"
                        >
                          <div
                            className="w-full aspect-[4/3] rounded-lg mb-2.5 border border-[#2A3446] shadow-inner relative flex items-center justify-center"
                            style={{ backgroundColor: c.hex }}
                          >
                            <div className="opacity-0 group-hover:opacity-100 transition-opacity bg-black/60 rounded-md px-2 py-1 flex items-center gap-1 text-[10px] text-white font-medium">
                              {copiedHexIndex === cIdx ? (
                                <Check className="size-3 text-emerald-400" />
                              ) : (
                                <Copy className="size-3" />
                              )}
                              <span>{copiedHexIndex === cIdx ? "Copied" : "Copy"}</span>
                            </div>
                          </div>
                          <p className="text-[11px] font-bold text-white truncate">{c.name}</p>
                          <p className="font-mono text-[10px] text-[#97A0B3] uppercase tracking-wider mt-0.5">
                            {c.hex}
                          </p>
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
                          <span className="font-bold text-xs text-white">
                            {liveBrandProfile?.instagram_username
                              ? `@${liveBrandProfile.instagram_username}`
                              : (activeClient?.brand?.social?.handle && activeClient.brand.social.handle !== "Not connected"
                                  ? activeClient.brand.social.handle
                                  : "Not connected")}
                          </span>
                          {liveBrandProfile?.instagram_username ? (
                            <span className="px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 text-[9px] font-extrabold uppercase">
                              CONNECTED
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-400 border border-amber-500/30 text-[9px] font-extrabold uppercase">
                              NOT CONNECTED
                            </span>
                          )}
                        </div>
                        <span className="text-[11px] text-[#97A0B3]">
                          {liveBrandProfile?.instagram_username
                            ? "Real-time Profile Connected • Verified Brand DNA"
                            : "Awaiting Instagram handle connection during onboarding"}
                        </span>
                      </div>
                    </div>
                    {liveBrandProfile?.instagram_username && (
                      <button
                        type="button"
                        onClick={() => {
                          const handle = (liveBrandProfile.instagram_username || "").replace("@", "");
                          if (handle) window.open(`https://instagram.com/${handle}`, "_blank");
                        }}
                        className="px-3 py-1.5 rounded-xl border border-[#2A3446] bg-[#161F2D] hover:bg-[#0B111C] text-xs font-bold text-[#F1F5F9] shadow-2xs cursor-pointer"
                      >
                        Launch Channel
                      </button>
                    )}
                  </div>

                  <div className="flex flex-wrap items-center justify-between text-xs text-[#97A0B3] font-medium pt-3 border-t border-[#2A3446] gap-2">
                    <div className="flex items-center gap-3 text-[#7FA0D6] font-bold">
                      <span className="cursor-pointer hover:underline flex items-center gap-1">
                        <Folder className="w-3.5 h-3.5" /> {activeClient?.brand?.brandVaultLink || "Client Brand Vault Drive"}
                      </span>
                      <span>•</span>
                      <span className="cursor-pointer hover:underline flex items-center gap-1">
                        <ExternalLink className="w-3.5 h-3.5" /> {activeClient?.brand?.figmaLink || "Figma Master Design Kit"}
                      </span>
                      <span>•</span>
                      <Link
                        to={`/admin/clients/${activeClient?.id || ""}/brand`}
                        className="cursor-pointer hover:underline flex items-center gap-1 text-[#7FA0D6]"
                      >
                        Brand DNA & Brief →
                      </Link>
                    </div>
                    <span>Last audit {activeClient?.brand?.lastAuditDate || "This Sprint"}</span>
                  </div>
                </div>
              )}

              {/* CARD 4: ASSIGNED CREATIVE POD */}
              {!isClientOnboarded ? (
                <div className="bg-[#161F2D] rounded-3xl p-6 border border-[#2A3446] shadow-[0_4px_25px_rgba(0,0,0,0.03)] space-y-5 flex flex-col justify-between">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between border-b border-[#2A3446] pb-3">
                      <div className="flex items-center gap-2">
                        <Users className={`w-4 h-4 ${isPaidNotOnboarded ? "text-sky-400" : "text-amber-400"}`} />
                        <h2 className="text-xs font-extrabold text-white uppercase tracking-wider">
                          Assigned creative pod
                        </h2>
                      </div>
                      <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${isPaidNotOnboarded ? "bg-sky-500/15 text-sky-400 border-sky-500/30" : "bg-amber-500/15 text-amber-400 border-amber-500/30"}`}>
                        {isPaidNotOnboarded ? "Pending Allocation" : "Not Assigned"}
                      </span>
                    </div>

                    <div className="p-8 text-center space-y-3 bg-[#0B111C]/60 rounded-2xl border border-[#2A3446]">
                      <div className={`w-12 h-12 rounded-2xl flex items-center justify-center mx-auto border ${isPaidNotOnboarded ? "bg-sky-500/10 border-sky-500/20 text-sky-400" : "bg-amber-500/10 border-amber-500/20 text-amber-400"}`}>
                        <Users className="w-6 h-6" />
                      </div>
                      <h4 className="text-sm font-bold text-white">
                        {isPaidNotOnboarded ? "Creative Pod Allocation in Progress" : "No Creative Pod Allocated"}
                      </h4>
                      <p className="text-xs text-[#97A0B3] max-w-md mx-auto leading-relaxed">
                        {isPaidNotOnboarded
                          ? "Pod Lead (Creative Director), Video Editor, and Graphic Designer will be allocated to this client once their onboarding brand requirements are submitted."
                          : "user not paid and not onboarded yet. Creative Pod squad specialists are assigned upon active plan subscription and onboarding intake completion."}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-xs text-[#97A0B3] pt-3 border-t border-[#2A3446] font-medium">
                    <span>Pod Allocation: {isPaidNotOnboarded ? "Awaiting Onboarding" : "Not Started"}</span>
                    <span className="text-[#97A0B3] font-mono">0 hrs/wk committed</span>
                  </div>
                </div>
              ) : (
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
                        {activeClient?.pod?.name || "Pod A"}: {activeClient?.pod?.tagline || "Creative Strategy"}
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
                            {activeClient?.pod?.leadAvatar || "CD"}
                          </div>
                          <div>
                            <h4 className="text-xs font-bold text-white">{activeClient?.pod?.leadName || "Pod Creative Director"}</h4>
                            <span className="text-[11px] text-[#97A0B3]">{activeClient?.pod?.leadTitle || "Lead Producer"}</span>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => navigate("/admin/slack")}
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
                        {(activeClient?.pod?.squad || []).map((member, mIdx) => (
                          <div key={`${member.name || mIdx}`} className="p-2.5 bg-[#0B111C]/50 rounded-xl flex items-center justify-between text-xs border border-[#2A3446]">
                            <div className="flex items-center gap-2.5">
                              <div className="w-7 h-7 rounded-full bg-gray-200 text-[#F1F5F9] font-bold text-[10px] flex items-center justify-center">
                                {member.avatar || "PS"}
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
                          {activeClient?.pod?.capacityAllocatedHrs ?? 32} hrs/week allocated
                        </span>
                      </div>
                      <div className="w-full bg-[#161F2D] rounded-full h-2 overflow-hidden">
                        <div
                          className="bg-[#7FA0D6] h-full rounded-full transition-all"
                          style={{ width: `${activeClient?.pod?.bandwidthPercent ?? 80}%` }}
                        />
                      </div>
                      <span className="text-[11px] text-[#97A0B3] font-medium block">
                        Sprint {activeClient?.sprintNumber ?? 1} • {activeClient?.pod?.bandwidthPercent ?? 80}% bandwidth filled
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-xs text-[#97A0B3] pt-3 border-t border-[#2A3446] font-medium">
                    <span>Daily Sync: {activeClient?.pod?.dailySyncTime || "11:00 AM IST"}</span>
                    <button
                      type="button"
                      onClick={() => navigate("/admin/teams")}
                      className="text-[#7FA0D6] font-bold hover:underline cursor-pointer"
                    >
                      Reallocate Pod Hours
                    </button>
                  </div>
                </div>
              )}
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
                      className="pl-8 pr-3 py-1.5 rounded-xl border border-[#2A3446] text-xs bg-[#0B111C] focus:bg-[#161F2D] focus:outline-none focus:ring-1 focus:ring-blue-500 text-white"
                    />
                  </div>
                  <button
                    type="button"
                    title="Cycle status filter"
                    onClick={() =>
                      setDeliverableStatus((current) =>
                        current === "all" ? "review" : current === "review" ? "production" : current === "production" ? "approved" : "all",
                      )
                    }
                    className="px-3 py-1.5 rounded-xl border border-[#2A3446] bg-[#161F2D] hover:bg-[#0B111C] text-xs font-bold text-[#F1F5F9] flex items-center gap-1 shadow-2xs cursor-pointer"
                  >
                    <Filter className="w-3.5 h-3.5 text-[#97A0B3]" /> Filter:{" "}
                    {deliverableStatus === "all" ? "All" : deliverableStatus === "review" ? "In review" : deliverableStatus === "production" ? "In production" : "Approved"}
                  </button>
                </div>
              </div>

              {/* Deliverable Cards Grid with Empty State */}
              {filteredDeliverables.length === 0 ? (
                <div className="py-12 border border-dashed border-[#2A3446] rounded-2xl text-center space-y-2">
                  <CheckCircle2 className="size-8 text-[#97A0B3] mx-auto opacity-40" />
                  <p className="text-sm font-bold text-white">
                    {!isClientOnboarded
                      ? isPaidNotOnboarded
                        ? "Deliverables Awaiting Onboarding Form"
                        : "Deliverables Inactive"
                      : "No Deliverables in Queue"}
                  </p>
                  <p className="text-xs text-[#97A0B3]">
                    {!isClientOnboarded
                      ? isPaidNotOnboarded
                        ? "Creative asset drafting begins once the client completes their onboarding intake questionnaire."
                        : "User not paid and not onboarded yet. Creative deliverables will be scheduled after plan purchase."
                      : "No active deliverables requiring attention for this client."}
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-5">
                  {filteredDeliverables.map((deliv, delivIdx) => {
                    const statusUpper = (deliv.status || "").toUpperCase();
                    const isReview = statusUpper === "IN REVIEW" || statusUpper === "PENDING_APPROVAL" || statusUpper === "INTERNAL_QA" || statusUpper === "READY FOR REVIEW";
                    const isProduction = statusUpper === "IN PRODUCTION" || statusUpper === "IN_PRODUCTION";
                    const isApproved = statusUpper === "APPROVED";
                    const isReadyForReview = statusUpper === "READY FOR REVIEW";

                    return (
                      <div
                        key={deliv.id || delivIdx}
                        className="bg-[#161F2D] rounded-3xl border border-[#2A3446] shadow-[0_2px_15px_rgba(0,0,0,0.03)] p-5 space-y-4 flex flex-col justify-between hover:shadow-lg hover:border-[#7FA0D6]/30 transition-all"
                      >
                        <div className="space-y-3">
                          <div className="flex items-center justify-between">
                            <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider border ${
                              deliv.statusColor ||
                              (isApproved
                                ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/30"
                                : isReview
                                ? "bg-amber-500/15 text-amber-400 border-amber-500/30"
                                : "bg-blue-500/15 text-blue-400 border-blue-500/30")
                            }`}>
                              {(deliv.status || "IN PRODUCTION").replace(/_/g, " ")}
                            </span>
                            <span className="text-[10px] font-mono text-[#97A0B3] font-bold">
                              {deliv.code || `DEL-${deliv.id ? deliv.id.slice(0, 4) : String(delivIdx + 1).padStart(2, "0")}`}
                            </span>
                          </div>

                          <div>
                            <h4 className="text-sm font-black text-white leading-snug">{deliv.title}</h4>
                            <p className="text-[11px] text-[#97A0B3] mt-1 line-clamp-2 leading-relaxed">
                              {deliv.description || "Production asset managed through Creo creative pod."}
                            </p>
                          </div>

                          <div className="p-3 bg-[#0B111C]/70 rounded-2xl space-y-1.5 text-[11px] text-[#F1F5F9] border border-[#2A3446]">
                            <div className="flex justify-between">
                              <span className="text-[#97A0B3]">Format:</span>
                              <span className="font-bold text-white">{deliv.format || deliv.type || deliv.deliverable_type || "Asset"}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-[#97A0B3]">Due Date:</span>
                              <span className="font-bold text-rose-500">{deliv.dueDate || deliv.date || "Next Cycle"}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-[#97A0B3]">Assigned:</span>
                              <span className="font-semibold text-white">{deliv.assignedTo || deliv.assigned_name || "Creative Squad"}</span>
                            </div>
                          </div>
                        </div>

                        {/* Action Buttons */}
                        <div className="space-y-2 pt-2 border-t border-[#2A3446]">
                          {isReview && (
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
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

                          {isProduction && (
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
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

                          {isApproved && (
                            <div className="space-y-1.5">
                              <button
                                type="button"
                                disabled
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

                          {isReadyForReview && (
                            <div className="space-y-1.5">
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
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

                          {(deliv.is_video || (Array.isArray(deliv.actions) && deliv.actions.some((a: string) => a.includes("Preview Video Draft")))) && (
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
                    );
                  })}
                </div>
              )}
            </div>
          </div>
            );
          })()}

        {/* ═════════════════════════════════════════════════════════════════
            MODALS
        ═════════════════════════════════════════════════════════════════ */}



        {/* 2. Monthly Invoice / Receipt Modal */}
        <PaymentReceiptModal
          receipt={
            isInvoiceModalOpen && activeClient
              ? {
                  id: "INV-2024-NL-11",
                  client: activeClient.name,
                  clientEmail: activeClient.contact?.email,
                  clientId: activeClient.id,
                  amount: activeClient.monthlyFee || 25000,
                  scope: activeClient.tier || "Starter Growth Subscription",
                  method: activeClient.billingMethod || "Cards / Razorpay",
                  status: "Paid",
                  date: activeClient.contact?.renewedDate || "Oct 19, 2026",
                  term: "1 Month",
                  quantity: "1 Retainer",
                }
              : null
          }
          onClose={() => setIsInvoiceModalOpen(false)}
        />



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
                <span className="text-xs font-bold text-gray-200">{previewDeliverable?.format || "Asset"} Preview</span>
                <span className="text-[10px] text-[#97A0B3] mt-0.5">Assigned Specialist: {previewDeliverable?.assignedTo || previewDeliverable?.assigned_name || "Creative Specialist"}</span>
              </div>

              <div className="p-3.5 bg-[#0B111C] rounded-2xl text-xs text-[#F1F5F9] space-y-1">
                <div><strong>Creative Scope:</strong> {previewDeliverable?.description || "Asset Scope"}</div>
                <div><strong>Target Delivery:</strong> {previewDeliverable?.dueDate || previewDeliverable?.date || "Current Sprint"}</div>
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
                    handleApproveDeliverable(previewDeliverable?.id, previewDeliverable?.title || "Asset");
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
                  <div>• Monthly Retainer: ₹{(activeClient?.monthlyFee ?? 0).toLocaleString()}/mo</div>
                  <div>• Status: CANCELLED (Plan & Access Revoked)</div>
                </div>
              </div>

              {removeError && <p role="alert" className="text-sm text-[#D8BF9B]">{removeError}</p>}
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
                  disabled={removingClient}
                  onClick={() => { if (activeClient) void offboardClient(activeClient.id, activeClient.name); }}
                  className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shadow-md cursor-pointer"
                >
                  {removingClient ? "Removing…" : "Confirm Cancellation"}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* 6. Onboard New Client Modal */}
        {isOnboardClientModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-md p-4 animate-fade-in overflow-y-auto">
            <div className="bg-[#161F2D] rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-4 border border-[#2A3446] my-8">
              <div className="flex items-center justify-between border-b border-[#2A3446] pb-3">
                <div className="flex items-center gap-2">
                  <div className="size-8 rounded-xl bg-blue-600/20 text-[#7FA0D6] flex items-center justify-center border border-blue-500/30">
                    <Plus className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-base font-black text-white">Onboard New Client Brand</h3>
                    <p className="text-[11px] text-[#97A0B3]">Create portal credentials &amp; assign creative pod</p>
                  </div>
                </div>
                <button type="button" onClick={() => setIsOnboardClientModalOpen(false)} className="p-1 text-[#97A0B3] hover:text-[#F1F5F9] rounded-lg">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form
                onSubmit={async (e) => {
                  e.preventDefault();
                  const trimmedName = newClientNameInput.trim();
                  const trimmedEmail = newClientEmailInput.trim();
                  if (!trimmedName || !trimmedEmail) {
                    setToast("Company name and login email are required.");
                    return;
                  }

                  setIsOnboardingClient(true);
                  try {
                    const res = await request<any>("/api/v1/admin/clients/onboard", {
                      method: "POST",
                      body: JSON.stringify({
                        company_name: trimmedName,
                        contact_name: newClientContactNameInput.trim() || `${trimmedName} Executive`,
                        email: trimmedEmail,
                        password: newClientPasswordInput.trim(),
                        dispatch_email: newClientDispatchEmail.trim() || undefined,
                        industry: newClientIndustryInput.trim() || "DTC E-Commerce & Retail",
                        pod_name: newClientPodInput,
                        send_credentials_email: newClientSendEmail,
                      }),
                    });

                    await queryClient.invalidateQueries({ queryKey: ["admin-client-roster"] });
                    setIsOnboardClientModalOpen(false);
                    setClientProvisionedCreds({
                      company_name: trimmedName,
                      contact_name: newClientContactNameInput.trim() || `${trimmedName} Executive`,
                      email: trimmedEmail,
                      password: newClientPasswordInput.trim(),
                      email_dispatched: Boolean(res?.email_dispatched),
                      dispatch_email: res?.dispatch_email || (newClientDispatchEmail.trim() || undefined),
                    });
                    setToast(
                      `Client "${trimmedName}" onboarded! ${
                        res?.email_dispatched
                          ? `Credentials dispatched to ${res?.dispatch_email || newClientDispatchEmail.trim() || trimmedEmail}.`
                          : "Account active in database."
                      }`
                    );
                    setNewClientNameInput("");
                    setNewClientContactNameInput("");
                    setNewClientEmailInput("");
                    setNewClientDispatchEmail("");
                    setNewClientPasswordInput(`Creo@${Math.floor(1000 + Math.random() * 9000)}!`);
                  } catch (err: any) {
                    setToast(err?.message || "Failed to onboard client.");
                  } finally {
                    setIsOnboardingClient(false);
                  }
                }}
                className="space-y-3.5 text-xs"
              >
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold text-[#F1F5F9] mb-1">Company / Brand Name *</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Acme Studio"
                      value={newClientNameInput}
                      onChange={(e) => setNewClientNameInput(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-[#2A3446] bg-[#0B111C] text-xs font-medium text-white focus:outline-none focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-[#F1F5F9] mb-1">Authorized Contact Name</label>
                    <input
                      type="text"
                      placeholder="e.g. Marcus Vance (Owner)"
                      value={newClientContactNameInput}
                      onChange={(e) => setNewClientContactNameInput(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-[#2A3446] bg-[#0B111C] text-xs font-medium text-white focus:outline-none focus:border-blue-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block font-bold text-[#F1F5F9] mb-1">Official Account Login Email *</label>
                  <input
                    type="email"
                    required
                    placeholder="e.g. marcus@acmestudio.com"
                    value={newClientEmailInput}
                    onChange={(e) => setNewClientEmailInput(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-[#2A3446] bg-[#0B111C] text-xs font-medium text-white focus:outline-none focus:border-blue-500"
                  />
                  <p className="text-[10px] text-[#97A0B3] mt-1">This official email is used by the client to sign in to the portal workspace.</p>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block font-bold text-[#F1F5F9]">Temporary Password *</label>
                    <button
                      type="button"
                      onClick={() => setNewClientPasswordInput(`Creo@${Math.floor(1000 + Math.random() * 9000)}!`)}
                      className="text-[11px] text-[#7FA0D6] hover:underline flex items-center gap-1 cursor-pointer"
                    >
                      <RefreshCw className="size-2.5" /> Regenerate
                    </button>
                  </div>
                  <div className="relative">
                    <input
                      type={showNewClientPassword ? "text" : "password"}
                      required
                      value={newClientPasswordInput}
                      onChange={(e) => setNewClientPasswordInput(e.target.value)}
                      className="w-full px-3 py-2 pr-10 rounded-xl border border-[#2A3446] bg-[#0B111C] text-xs font-mono font-bold text-amber-300 focus:outline-none focus:border-blue-500"
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewClientPassword(!showNewClientPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-[#97A0B3] hover:text-white"
                    >
                      {showNewClientPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold text-[#F1F5F9] mb-1">Industry / Category</label>
                    <input
                      type="text"
                      placeholder="e.g. DTC E-Commerce & Retail"
                      value={newClientIndustryInput}
                      onChange={(e) => setNewClientIndustryInput(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-[#2A3446] bg-[#0B111C] text-xs font-medium text-white focus:outline-none focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-[#F1F5F9] mb-1">Assigned Creative Pod</label>
                    <NativeSelect
                      value={newClientPodInput}
                      onChange={(e) => setNewClientPodInput(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-[#2A3446] text-xs font-bold bg-[#0B111C] text-white"
                    >
                      <option value="Pod A (Creative & Brand Strategy)">Pod A (Creative & Brand Strategy)</option>
                      <option value="Pod B (Performance & Video Ops)">Pod B (Performance & Video Ops)</option>
                      <option value="Pod C (3D Motion & Visual Design)">Pod C (3D Motion & Visual Design)</option>
                    </NativeSelect>
                  </div>
                </div>

                {/* Separate Dispatch Email Option */}
                <div>
                  <label className="block font-bold text-[#F1F5F9] mb-1">
                    Send Credentials To (Worker / Client Personal Email)
                  </label>
                  <input
                    type="email"
                    placeholder="e.g. marcus.personal@gmail.com (Leave blank to use login email)"
                    value={newClientDispatchEmail}
                    onChange={(e) => setNewClientDispatchEmail(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-[#2A3446] bg-[#0B111C] text-xs font-medium text-white focus:outline-none focus:border-blue-500"
                  />
                  <p className="text-[10px] text-[#97A0B3] mt-1">
                    Optional separate email address to receive login credentials while keeping account email clean.
                  </p>
                </div>

                {/* Email Dispatch Checkbox Card with high-contrast amber/white styling */}
                <div className="p-3 bg-[#0B111C] rounded-xl border border-amber-500/40 flex items-start gap-3">
                  <input
                    type="checkbox"
                    id="client-send-email-toggle"
                    checked={newClientSendEmail}
                    onChange={(e) => setNewClientSendEmail(e.target.checked)}
                    className="mt-0.5 rounded border-[#2A3446] bg-[#161F2D] text-amber-500 focus:ring-amber-500 size-4 accent-amber-500 cursor-pointer"
                  />
                  <label htmlFor="client-send-email-toggle" className="cursor-pointer space-y-0.5 select-none">
                    <span className="block text-xs font-bold text-amber-300">
                      Send login credentials via email immediately
                    </span>
                    <span className="block text-[11px] text-[#F1F5F9] leading-relaxed">
                      Automatically delivers sign-in link, username, and temporary password to {newClientDispatchEmail.trim() ? newClientDispatchEmail.trim() : "the client email address"}.
                    </span>
                  </label>
                </div>

                <div className="flex justify-end gap-2 pt-3 border-t border-[#2A3446]">
                  <button
                    type="button"
                    onClick={() => setIsOnboardClientModalOpen(false)}
                    className="px-4 py-2 rounded-xl border border-[#2A3446] text-xs font-bold text-[#F1F5F9] hover:bg-[#0B111C] cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isOnboardingClient}
                    className="px-5 py-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:brightness-110 text-white text-xs font-bold shadow-md shadow-blue-600/20 cursor-pointer disabled:opacity-60 flex items-center gap-1.5"
                  >
                    {isOnboardingClient ? (
                      <>
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" /> Provisioning...
                      </>
                    ) : (
                      <>
                        <Plus className="w-3.5 h-3.5" /> Onboard Client
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Provisioned Client Credentials Modal */}
        {clientProvisionedCreds && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-md p-4 animate-fade-in">
            <div className="bg-[#161F2D] rounded-3xl max-w-md w-full p-6 shadow-2xl border border-emerald-500/30 space-y-4">
              <div className="flex items-center justify-between border-b border-[#2A3446] pb-3">
                <div className="flex items-center gap-2">
                  <div className="size-8 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center border border-emerald-500/30">
                    <CheckCircle2 className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-base font-black text-white">Client Provisioned Successfully</h3>
                    <p className="text-[11px] text-[#97A0B3]">{clientProvisionedCreds.company_name}</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setClientProvisionedCreds(null)}
                  className="p-1 text-[#97A0B3] hover:text-[#F1F5F9] rounded-lg"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-2.5">
                <div className="p-3 bg-[#0B111C] rounded-xl border border-[#2A3446] flex items-center justify-between">
                  <div>
                    <span className="text-[10px] font-bold text-[#97A0B3] uppercase block">Login Email</span>
                    <span className="text-xs font-mono font-bold text-white select-all">{clientProvisionedCreds.email}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard.writeText(clientProvisionedCreds.email);
                      setToast("Login email copied to clipboard!");
                    }}
                    className="p-1.5 rounded-lg bg-[#161F2D] text-[#7FA0D6] hover:text-white border border-[#2A3446]"
                    title="Copy Email"
                  >
                    <Copy className="size-3.5" />
                  </button>
                </div>

                <div className="p-3 bg-[#0B111C] rounded-xl border border-[#2A3446] flex items-center justify-between">
                  <div>
                    <span className="text-[10px] font-bold text-[#97A0B3] uppercase block">Temporary Password</span>
                    <span className="text-xs font-mono font-bold text-amber-300 select-all">{clientProvisionedCreds.password}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard.writeText(clientProvisionedCreds.password);
                      setToast("Password copied to clipboard!");
                    }}
                    className="p-1.5 rounded-lg bg-[#161F2D] text-amber-300 hover:text-white border border-[#2A3446]"
                    title="Copy Password"
                  >
                    <Copy className="size-3.5" />
                  </button>
                </div>

                {clientProvisionedCreds.email_dispatched ? (
                  <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl flex items-center gap-2 text-xs text-emerald-300">
                    <CheckCircle2 className="size-4 shrink-0 text-emerald-400" />
                    <span>Credentials dispatched to <strong>{clientProvisionedCreds.dispatch_email || clientProvisionedCreds.email}</strong>.</span>
                  </div>
                ) : (
                  <div className="p-3 bg-[#0B111C] border border-[#2A3446] rounded-xl text-xs text-[#97A0B3]">
                    Email dispatch was disabled or skipped. Share credentials manually with the client.
                  </div>
                )}
              </div>

              <div className="pt-2 flex justify-end">
                <button
                  type="button"
                  onClick={() => setClientProvisionedCreds(null)}
                  className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold cursor-pointer"
                >
                  Done
                </button>
              </div>
            </div>
          </div>
        )}

        {/* 6b. Onboard Client Team Member Modal */}
        {isOnboardClientMemberModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-md p-4 animate-fade-in overflow-y-auto">
            <div className="bg-[#161F2D] rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4 border border-[#2A3446] my-8">
              <div className="flex items-center justify-between border-b border-[#2A3446] pb-3">
                <div className="flex items-center gap-2">
                  <div className="size-8 rounded-xl bg-blue-600/20 text-[#7FA0D6] flex items-center justify-center border border-blue-500/30">
                    <Users className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-base font-black text-white">Onboard Client Team Member</h3>
                    <p className="text-[11px] text-[#97A0B3]">Add collaborator / stakeholder to this client brand</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setIsOnboardClientMemberModalOpen(false)}
                  className="p-1 text-[#97A0B3] hover:text-[#F1F5F9] rounded-lg"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form
                onSubmit={async (e) => {
                  e.preventDefault();
                  if (!selectedClientId) return;
                  const trimmedName = clientMemberForm.full_name.trim();
                  const trimmedEmail = clientMemberForm.email.trim();
                  if (!trimmedName || !trimmedEmail) {
                    setToast("Name and login email are required.");
                    return;
                  }

                  setIsOnboardingClientMember(true);
                  try {
                    const res = await request<any>(`/api/v1/admin/clients/${selectedClientId}/team-members`, {
                      method: "POST",
                      body: JSON.stringify({
                        full_name: trimmedName,
                        email: trimmedEmail,
                        role_title: clientMemberForm.role_title.trim() || "Client Team Member",
                        password: clientMemberForm.password.trim(),
                        dispatch_email: clientMemberForm.dispatch_email.trim() || undefined,
                        send_credentials_email: clientMemberForm.send_credentials_email,
                      }),
                    });

                    await clientTeamMembersQuery.refetch();
                    setIsOnboardClientMemberModalOpen(false);
                    setClientMemberProvisionedCreds({
                      full_name: trimmedName,
                      email: trimmedEmail,
                      password: clientMemberForm.password.trim(),
                      role_title: clientMemberForm.role_title.trim() || "Client Team Member",
                      email_dispatched: Boolean(res?.email_dispatched),
                      dispatch_email: res?.dispatch_email || (clientMemberForm.dispatch_email.trim() || undefined),
                    });
                    setToast(
                      `Client team member "${trimmedName}" onboarded! ${
                        res?.email_dispatched
                          ? `Credentials dispatched to ${res?.dispatch_email || clientMemberForm.dispatch_email.trim() || trimmedEmail}.`
                          : "Account active in database."
                      }`
                    );
                    setClientMemberForm({
                      full_name: "",
                      email: "",
                      role_title: "Marketing Lead",
                      password: `Creo@${Math.floor(1000 + Math.random() * 9000)}!`,
                      dispatch_email: "",
                      send_credentials_email: true,
                    });
                  } catch (err: any) {
                    setToast(err?.message || "Failed to onboard client team member.");
                  } finally {
                    setIsOnboardingClientMember(false);
                  }
                }}
                className="space-y-3.5 text-xs"
              >
                <div>
                  <label className="block font-bold text-[#F1F5F9] mb-1">Member Full Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Jessica Chen"
                    value={clientMemberForm.full_name}
                    onChange={(e) => setClientMemberForm({ ...clientMemberForm, full_name: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-[#2A3446] bg-[#0B111C] text-xs font-medium text-white focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block font-bold text-[#F1F5F9] mb-1">Login Email Address *</label>
                  <input
                    type="email"
                    required
                    placeholder="e.g. jessica@brand.com"
                    value={clientMemberForm.email}
                    onChange={(e) => setClientMemberForm({ ...clientMemberForm, email: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-[#2A3446] bg-[#0B111C] text-xs font-medium text-white focus:outline-none focus:border-blue-500"
                  />
                  <p className="text-[10px] text-[#97A0B3] mt-1">Official work address used to sign in to the client portal.</p>
                </div>

                <div>
                  <label className="block font-bold text-[#F1F5F9] mb-1">Member Role / Designation</label>
                  <input
                    type="text"
                    placeholder="e.g. Brand Marketing Manager / Content Reviewer"
                    value={clientMemberForm.role_title}
                    onChange={(e) => setClientMemberForm({ ...clientMemberForm, role_title: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-[#2A3446] bg-[#0B111C] text-xs font-medium text-white focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block font-bold text-[#F1F5F9]">Temporary Password *</label>
                    <button
                      type="button"
                      onClick={() => setClientMemberForm({ ...clientMemberForm, password: `Creo@${Math.floor(1000 + Math.random() * 9000)}!` })}
                      className="text-[11px] text-[#7FA0D6] hover:underline flex items-center gap-1 cursor-pointer"
                    >
                      <RefreshCw className="size-2.5" /> Regenerate
                    </button>
                  </div>
                  <div className="relative">
                    <input
                      type={showClientMemberPassword ? "text" : "password"}
                      required
                      value={clientMemberForm.password}
                      onChange={(e) => setClientMemberForm({ ...clientMemberForm, password: e.target.value })}
                      className="w-full px-3 py-2 pr-10 rounded-xl border border-[#2A3446] bg-[#0B111C] text-xs font-mono font-bold text-amber-300 focus:outline-none focus:border-blue-500"
                    />
                    <button
                      type="button"
                      onClick={() => setShowClientMemberPassword(!showClientMemberPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-[#97A0B3] hover:text-white"
                    >
                      {showClientMemberPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>

                {/* Separate Dispatch Email Option */}
                <div>
                  <label className="block font-bold text-[#F1F5F9] mb-1">
                    Send Credentials To (Worker / Member Personal Email)
                  </label>
                  <input
                    type="email"
                    placeholder="e.g. jessica.personal@gmail.com (Leave blank to use login email)"
                    value={clientMemberForm.dispatch_email}
                    onChange={(e) => setClientMemberForm({ ...clientMemberForm, dispatch_email: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-[#2A3446] bg-[#0B111C] text-xs font-medium text-white focus:outline-none focus:border-blue-500"
                  />
                  <p className="text-[10px] text-[#97A0B3] mt-1">
                    Optional separate email address to receive login credentials while keeping account email clean.
                  </p>
                </div>

                {/* Email Dispatch Checkbox Card with high-contrast amber/white styling */}
                <div className="p-3 bg-[#0B111C] rounded-xl border border-amber-500/40 flex items-start gap-3">
                  <input
                    type="checkbox"
                    id="client-member-send-email-toggle"
                    checked={clientMemberForm.send_credentials_email}
                    onChange={(e) => setClientMemberForm({ ...clientMemberForm, send_credentials_email: e.target.checked })}
                    className="mt-0.5 rounded border-[#2A3446] bg-[#161F2D] text-amber-500 focus:ring-amber-500 size-4 accent-amber-500 cursor-pointer"
                  />
                  <label htmlFor="client-member-send-email-toggle" className="cursor-pointer space-y-0.5 select-none">
                    <span className="block text-xs font-bold text-amber-300">
                      Send login credentials via email immediately
                    </span>
                    <span className="block text-[11px] text-[#F1F5F9] leading-relaxed">
                      Automatically delivers sign-in link, username, and temporary password to {clientMemberForm.dispatch_email.trim() ? clientMemberForm.dispatch_email.trim() : "the member email address"}.
                    </span>
                  </label>
                </div>

                <div className="flex justify-end gap-2 pt-3 border-t border-[#2A3446]">
                  <button
                    type="button"
                    onClick={() => setIsOnboardClientMemberModalOpen(false)}
                    className="px-4 py-2 rounded-xl border border-[#2A3446] text-xs font-bold text-[#F1F5F9] hover:bg-[#0B111C] cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isOnboardingClientMember}
                    className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-sm cursor-pointer disabled:opacity-60 flex items-center gap-1.5"
                  >
                    {isOnboardingClientMember ? (
                      <>
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" /> Provisioning...
                      </>
                    ) : (
                      <>
                        <Plus className="w-3.5 h-3.5" /> Onboard Member
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Provisioned Client Member Credentials Modal */}
        {clientMemberProvisionedCreds && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-md p-4 animate-fade-in">
            <div className="bg-[#161F2D] rounded-3xl max-w-md w-full p-6 shadow-2xl border border-emerald-500/30 space-y-4">
              <div className="flex items-center justify-between border-b border-[#2A3446] pb-3">
                <div className="flex items-center gap-2">
                  <div className="size-8 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center border border-emerald-500/30">
                    <CheckCircle2 className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-base font-black text-white">Client Member Provisioned</h3>
                    <p className="text-[11px] text-[#97A0B3]">{clientMemberProvisionedCreds.full_name} ({clientMemberProvisionedCreds.role_title})</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setClientMemberProvisionedCreds(null)}
                  className="p-1 text-[#97A0B3] hover:text-[#F1F5F9] rounded-lg"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-2.5">
                <div className="p-3 bg-[#0B111C] rounded-xl border border-[#2A3446] flex items-center justify-between">
                  <div>
                    <span className="text-[10px] font-bold text-[#97A0B3] uppercase block">Login Email</span>
                    <span className="text-xs font-mono font-bold text-white select-all">{clientMemberProvisionedCreds.email}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard.writeText(clientMemberProvisionedCreds.email);
                      setToast("Login email copied to clipboard!");
                    }}
                    className="p-1.5 rounded-lg bg-[#161F2D] text-[#7FA0D6] hover:text-white border border-[#2A3446]"
                    title="Copy Email"
                  >
                    <Copy className="size-3.5" />
                  </button>
                </div>

                <div className="p-3 bg-[#0B111C] rounded-xl border border-[#2A3446] flex items-center justify-between">
                  <div>
                    <span className="text-[10px] font-bold text-[#97A0B3] uppercase block">Temporary Password</span>
                    <span className="text-xs font-mono font-bold text-amber-300 select-all">{clientMemberProvisionedCreds.password}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard.writeText(clientMemberProvisionedCreds.password);
                      setToast("Password copied to clipboard!");
                    }}
                    className="p-1.5 rounded-lg bg-[#161F2D] text-amber-300 hover:text-white border border-[#2A3446]"
                    title="Copy Password"
                  >
                    <Copy className="size-3.5" />
                  </button>
                </div>

                {clientMemberProvisionedCreds.email_dispatched ? (
                  <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl flex items-center gap-2 text-xs text-emerald-300">
                    <CheckCircle2 className="size-4 shrink-0 text-emerald-400" />
                    <span>Credentials dispatched to <strong>{clientMemberProvisionedCreds.dispatch_email || clientMemberProvisionedCreds.email}</strong>.</span>
                  </div>
                ) : (
                  <div className="p-3 bg-[#0B111C] border border-[#2A3446] rounded-xl text-xs text-[#97A0B3]">
                    Email dispatch was disabled or skipped. Share credentials manually with the member.
                  </div>
                )}
              </div>

              <div className="pt-2 flex justify-end">
                <button
                  type="button"
                  onClick={() => setClientMemberProvisionedCreds(null)}
                  className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold cursor-pointer"
                >
                  Done
                </button>
              </div>
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
                  <NativeSelect
                    value={clientToRemoveInput}
                    onChange={(e) => setClientToRemoveInput(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-[#2A3446] text-xs font-bold bg-[#0B111C] text-white"
                  >
                    {clientList.map((client) => (
                      <option key={client.id} value={client.id}>
                        {client.name} ({client.industry})
                      </option>
                    ))}
                  </NativeSelect>
                </div>

                <p className="text-[#97A0B3] text-[11px] leading-relaxed">
                  Offboarding <strong className="text-white">{clientToRemoveInput}</strong> will cancel their active plan, revoke account access, and remove their team mapping. Billing and content history will be retained.
                </p>

                {removeError && <p role="alert" className="text-sm text-[#D8BF9B]">{removeError}</p>}
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
                    disabled={removingClient || !clientList.some(client => client.name === clientToRemoveInput || client.id === clientToRemoveInput)}
                    onClick={() => {
                      const client = clientList.find(client => client.name === clientToRemoveInput || client.id === clientToRemoveInput);
                      if (client) void offboardClient(client.id, client.name);
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

        {/* 8. Offline Payment Requests Review Modal */}
        {isManualPaymentsModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-md p-4 animate-fade-in">
            <div className="bg-[#161F2D] rounded-3xl max-w-3xl w-full max-h-[85vh] flex flex-col shadow-2xl border border-[#2A3446] overflow-hidden">
              <div className="flex items-center justify-between border-b border-[#2A3446] p-5 shrink-0">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400">
                    <Banknote className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-black text-white">Offline Payment Verification Claims</h3>
                    <p className="text-xs text-[#97A0B3]">Review offline payment claims (cash, bank transfer, cheque, contract) and bypass Step 3 payment.</p>
                  </div>
                </div>
                <button type="button" onClick={() => setIsManualPaymentsModalOpen(false)} className="p-1.5 text-[#97A0B3] hover:text-white rounded-lg">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="p-5 flex-1 overflow-y-auto space-y-4">
                {manualPayments.length === 0 ? (
                  <div className="py-12 border border-dashed border-[#2A3446] rounded-2xl text-center space-y-2">
                    <Banknote className="size-8 text-[#97A0B3] mx-auto opacity-40" />
                    <p className="text-sm font-bold text-white">No Offline Payment Claims</p>
                    <p className="text-xs text-[#97A0B3]">No clients have submitted an offline verification request yet.</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {manualPayments.map((req) => (
                      <div
                        key={req.id}
                        className={`p-4 rounded-2xl border transition-all ${
                          req.status === "PENDING"
                            ? "bg-[#0B111C] border-amber-500/40 shadow-sm"
                            : "bg-[#0B111C]/60 border-[#2A3446]"
                        }`}
                      >
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#2A3446]/60">
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-white text-sm">{req.client_email}</span>
                              <span
                                className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase ${
                                  req.status === "PENDING"
                                    ? "bg-amber-500/20 text-amber-300 border border-amber-500/40"
                                    : req.status === "APPROVED"
                                    ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40"
                                    : "bg-rose-500/20 text-rose-300 border border-rose-500/40"
                                }`}
                              >
                                {req.status}
                              </span>
                            </div>
                            <span className="text-[11px] text-[#97A0B3] mt-0.5 block">
                              Claimed on {new Date(req.created_at).toLocaleString()}
                            </span>
                          </div>

                          <div className="flex items-center gap-2 text-xs">
                            <span className="px-2.5 py-1 rounded-lg bg-[#161F2D] border border-[#2A3446] text-[#7FA0D6] font-bold">
                              {req.plan_name}
                            </span>
                            <span className="px-2.5 py-1 rounded-lg bg-[#161F2D] border border-[#2A3446] text-white font-mono font-bold">
                              ₹{req.amount.toLocaleString()}
                            </span>
                            <span className="px-2.5 py-1 rounded-lg bg-indigo-500/10 border border-indigo-500/30 text-indigo-300 font-bold uppercase">
                              {req.payment_method}
                            </span>
                          </div>
                        </div>

                        {req.reference_note && (
                          <div className="mt-3 p-2.5 bg-[#161F2D] rounded-xl text-xs text-[#F1F5F9] border border-[#2A3446]/50">
                            <span className="text-[10px] font-bold uppercase text-[#97A0B3] block mb-0.5">Client Note / Reference</span>
                            {req.reference_note}
                          </div>
                        )}

                        {req.admin_notes && (
                          <div className="mt-2 text-[11px] text-[#97A0B3] italic">
                            Admin Note: {req.admin_notes}
                          </div>
                        )}

                        {req.status === "PENDING" && (
                          <div className="mt-3 pt-3 border-t border-[#2A3446]/60 flex items-center justify-end gap-2">
                            <button
                              type="button"
                              disabled={processingPaymentId === req.id}
                              onClick={() => void handleRejectPayment(req)}
                              className="px-3 py-1.5 rounded-xl border border-rose-500/40 hover:bg-rose-500/10 text-rose-300 text-xs font-bold transition-all disabled:opacity-50 cursor-pointer"
                            >
                              Decline Claim
                            </button>
                            <button
                              type="button"
                              disabled={processingPaymentId === req.id}
                              onClick={() => void handleApprovePayment(req)}
                              className="px-4 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-1.5 transition-all shadow-sm disabled:opacity-50 cursor-pointer"
                            >
                              <Check className="w-3.5 h-3.5 stroke-[3]" />
                              {processingPaymentId === req.id ? "Approving..." : "Approve & Bypass Step 3"}
                            </button>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="p-4 border-t border-[#2A3446] flex justify-between items-center bg-[#0B111C]/40">
                <span className="text-xs text-[#97A0B3]">
                  {pendingManualPayments.length} pending verification {pendingManualPayments.length === 1 ? "claim" : "claims"}
                </span>
                <button
                  type="button"
                  onClick={() => setIsManualPaymentsModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-[#2A3446] text-xs font-bold text-[#F1F5F9] hover:bg-[#161F2D] cursor-pointer"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}

        {/* 9. Direct Bypass Payment Modal */}
        {isDirectBypassModalOpen && directBypassTargetClient && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-md p-4 animate-fade-in">
            <div className="bg-[#161F2D] rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4 border border-emerald-500/40">
              <div className="flex items-center justify-between border-b border-[#2A3446] pb-3">
                <div className="flex items-center gap-2">
                  <Banknote className="w-5 h-5 text-emerald-400" />
                  <h3 className="text-base font-black text-white">Direct Payment Bypass (Step 3)</h3>
                </div>
                <button type="button" onClick={() => setIsDirectBypassModalOpen(false)} className="p-1 text-[#97A0B3] hover:text-[#F1F5F9] rounded-lg">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-2xl text-xs text-emerald-300">
                <p className="font-bold">Bypassing payment for: {directBypassTargetClient.name}</p>
                <p className="text-[11px] text-emerald-400/80 mt-0.5">{directBypassTargetClient.email}</p>
                <p className="text-[11px] mt-1 text-gray-300">This activates an active retainer and immediately advances the client past Step 3 to Step 4 (Questionnaire).</p>
              </div>

              <form onSubmit={handleDirectBypassSubmit} className="space-y-3.5 text-xs">
                <div>
                  <label className="block font-bold text-[#F1F5F9] mb-1">Select Retainer Plan</label>
                  <NativeSelect
                    value={directBypassPlanId}
                    onChange={(e) => setDirectBypassPlanId(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-[#2A3446] text-xs font-bold bg-[#0B111C] text-white"
                  >
                    {((directBypassClientPlans.length > 0 ? directBypassClientPlans : plansQuery.data) || []).map((p: any) => (
                      <option key={p.id} value={p.id}>
                        {p.display_name} (₹{(p.price_minor / 100).toLocaleString()}/mo)
                      </option>
                    ))}
                  </NativeSelect>
                </div>

                <div>
                  <label className="block font-bold text-[#F1F5F9] mb-1">Payment Method / Source</label>
                  <NativeSelect
                    value={directBypassPaymentMethod}
                    onChange={(e) => setDirectBypassPaymentMethod(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-[#2A3446] text-xs font-bold bg-[#0B111C] text-white"
                  >
                    <option value="cash">Cash in Hand</option>
                    <option value="bank_transfer">Direct Bank NEFT/RTGS/IMPS</option>
                    <option value="cheque">Cheque Deposit</option>
                    <option value="contract">Annual Agreement / Contract</option>
                    <option value="upi">Direct UPI Transfer</option>
                  </NativeSelect>
                </div>

                <div>
                  <label className="block font-bold text-[#F1F5F9] mb-1">Admin Reference / Approval Notes (Optional)</label>
                  <textarea
                    rows={2}
                    value={directBypassNotes}
                    onChange={(e) => setDirectBypassNotes(e.target.value)}
                    placeholder="e.g. Received cash payment at agency office on Oct 12, receipt #4092"
                    className="w-full px-3 py-2 rounded-xl border border-[#2A3446] bg-[#0B111C] text-xs font-medium text-white focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div className="flex justify-end gap-2 pt-2 border-t border-[#2A3446]">
                  <button
                    type="button"
                    onClick={() => setIsDirectBypassModalOpen(false)}
                    className="px-4 py-2 rounded-xl border border-[#2A3446] text-xs font-bold text-[#F1F5F9] hover:bg-[#0B111C] cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={directBypassBusy}
                    className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-md cursor-pointer transition-all disabled:opacity-50"
                  >
                    {directBypassBusy ? "Bypassing..." : "Confirm & Bypass"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
        {isSplitModalOpen && splitPaymentClient && (
          <AdminSplitPaymentModal
            isOpen={true}
            onClose={() => setIsSplitModalOpen(false)}
            clientId={splitPaymentClient.id}
            clientName={splitPaymentClient.name}
            onSuccess={() => showToast("Split payment package updated successfully.")}
          />
        )}
      </main>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 2. ADMIN DELIVERABLES PAGE
// ─────────────────────────────────────────────────────────────────────────────
export function AdminDeliverablesPage() {
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedClient, setSelectedClient] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedFormat, setSelectedFormat] = useState("all");
  const [previewItem, setPreviewItem] = useState<any | null>(null);
  const [commentModalItem, setCommentModalItem] = useState<any | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const [revisionItem, setRevisionItem] = useState<{ id: string; title: string } | null>(null);
  const [revisionReason, setRevisionReason] = useState("");
  const [withdrawModalItem, setWithdrawModalItem] = useState<{ id: string; title: string } | null>(null);
  const [historyModalItem, setHistoryModalItem] = useState<{ id: string; title: string } | null>(null);
  const [reviewBusy, setReviewBusy] = useState(false);
  const [reviewError, setReviewError] = useState<string | null>(null);
  const deliverablesQuery = useQuery({ queryKey: ["admin-uploaded-deliverables", user?.id], enabled: !!user, queryFn: () => fetchAdminDeliverables(), retry: false });
  const deliverablesList = (deliverablesQuery.data || []).map((d: any) => ({
    ...d,
    assetCode: d.id.slice(0, 8),
    title: d.title || "Untitled upload",
    client: d.client || d.client_name || "Client unavailable",
    clientInitial: (d.client || d.client_name || "?").slice(0, 2).toUpperCase(),
    clientBg: "bg-[#2A3446]",
    statusLabel: (d.status || "unknown").replaceAll("_", " "),
    statusBadge: "bg-[#161F2D] text-[#7FA0D6] border-[#2A3446]",
    formatType: d.deliverable_type || d.type || "unknown",
    formatLabel: d.type || d.deliverable_type || "Format unavailable",
    format: d.type || d.deliverable_type || "Format unavailable",
    previewUrl: d.file_url ? resolveAssetUrl(d.file_url) : null,
    pod: d.pod_name || "Not provided",
    podLead: d.pod_lead || null,
    slaText: d.scheduled_at ? `Scheduled ${new Date(d.scheduled_at).toLocaleDateString()}` : "Not scheduled",
    slaColor: "text-[#97A0B3]",
  }));
  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };
  const handleApprove = async (id: string, _title: string) => {
    if (reviewBusy) return;
    setReviewBusy(true); setReviewError(null);
    try {
      await request(`/api/v1/deliverables/${id}/qa-approve`, { method: "POST" });
      await deliverablesQuery.refetch();
      setPreviewItem(null);
      showToast("QA approved. The asset is now awaiting client review.");
    } catch (error) { setReviewError(error instanceof Error ? error.message : "QA approval failed."); }
    finally { setReviewBusy(false); }
  };
  const handleDecline = (id: string, title: string) => {
    setRevisionItem({ id, title }); setRevisionReason(""); setReviewError(null);
  };
  const submitRevision = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!revisionItem || !revisionReason.trim() || reviewBusy) return;
    setReviewBusy(true); setReviewError(null);
    try {
      await request(`/api/v1/deliverables/${revisionItem.id}/qa-reject`, { method: "POST", body: JSON.stringify({ notes: revisionReason.trim() }) });
      await deliverablesQuery.refetch();
      setRevisionItem(null); setPreviewItem(null);
      showToast("Revision feedback saved and sent back to the production team.");
    } catch (error) { setReviewError(error instanceof Error ? error.message : "Unable to save revision feedback."); }
    finally { setReviewBusy(false); }
  };

  const movedToProductionCount = deliverablesList.filter(
    (d) => d.status === "in_production" || d.status === "in_progress" || d.status === "backlog"
  ).length;

  const pendingReviewCount = deliverablesList.filter(
    (d) => d.status === "pending_qa" || d.status === "pending_approval"
  ).length;

  const approvedTodayCount = deliverablesList.filter(
    (d) => d.status === "ready_to_publish" || d.status === "approved" || d.status === "completed"
  ).length;

  const declinedCount = deliverablesList.filter(
    (d) => d.status === "qa_rejected" || d.status === "rejected" || d.status === "revision_requested"
  ).length;

  const filteredDeliverables = deliverablesList.filter((d) => {
    const matchesSearch =
      !searchQuery.trim() ||
      d.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      d.assetCode.toLowerCase().includes(searchQuery.toLowerCase()) ||
      d.client.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesClient =
      selectedClient === "all" || d.client.toLowerCase().includes(selectedClient.toLowerCase());

    const matchesStatus = statusFilter === "all" || d.status === statusFilter;

    const matchesFormat =
      selectedFormat === "all" ? true : d.formatType === selectedFormat;

    return matchesSearch && matchesClient && matchesStatus && matchesFormat;
  });

  return (
    <div data-surface="ops" className="w-full min-h-screen font-sans bg-[#0B111C] flex flex-col">
      <AdminTopHeader activeTab="Content Engine" />
      <main className="flex-1 px-3.5 sm:px-6 lg:px-8 pt-6 sm:pt-8 pb-24 sm:pb-16 max-w-[1500px] w-full mx-auto space-y-4 sm:space-y-6">
        {/* Toast Notification */}
        {toastMessage && (
          <div className="fixed top-20 right-4 sm:right-8 left-4 sm:left-auto z-50 bg-[#0B111C] text-white px-5 py-3 rounded-2xl shadow-2xl text-xs font-bold flex items-center gap-2.5 animate-bounce">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <span>{toastMessage}</span>
          </div>
        )}

        {/* 4 KPI Cards - Compact on mobile, spacious on desktop */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-4">
          <div className="kpi-card bg-[#161F2D] rounded-xl sm:rounded-3xl p-2.5 sm:p-5 border border-[#2A3446] hover:border-[#7FA0D6]/40 transition-all shadow-xs space-y-1 sm:space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[9px] sm:text-[10px] font-black text-[#97A0B3] uppercase tracking-wider truncate">
                PRODUCTION
              </span>
              <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-lg sm:rounded-xl bg-[#7FA0D6]/15 text-[#7FA0D6] flex items-center justify-center font-bold shrink-0">
                <Zap className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
              </div>
            </div>
            <div className="flex items-baseline justify-between sm:block">
              <div className="text-lg sm:text-3xl font-black text-white tracking-tight leading-none">{movedToProductionCount}</div>
              <div className="text-[10px] sm:text-xs font-bold text-emerald-400 mt-0.5 sm:mt-1">
                {movedToProductionCount === 0 ? "0 active" : `${movedToProductionCount} active`}
              </div>
            </div>
          </div>

          <div className="kpi-card bg-[#161F2D] rounded-xl sm:rounded-3xl p-2.5 sm:p-5 border border-[#2A3446] hover:border-amber-500/40 transition-all shadow-xs space-y-1 sm:space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[9px] sm:text-[10px] font-black text-[#97A0B3] uppercase tracking-wider truncate">
                PENDING REVIEW
              </span>
              <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-lg sm:rounded-xl bg-amber-500/15 text-amber-400 flex items-center justify-center font-bold shrink-0">
                <Clock className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
              </div>
            </div>
            <div className="flex items-baseline justify-between sm:block">
              <div className="text-lg sm:text-3xl font-black text-white tracking-tight leading-none">{pendingReviewCount}</div>
              <div className="text-[10px] sm:text-xs font-bold text-amber-400 mt-0.5 sm:mt-1">
                {pendingReviewCount === 0 ? "0 review" : `${pendingReviewCount} in review`}
              </div>
            </div>
          </div>

          <div className="kpi-card bg-[#161F2D] rounded-xl sm:rounded-3xl p-2.5 sm:p-5 border border-[#2A3446] hover:border-emerald-500/40 transition-all shadow-xs space-y-1 sm:space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[9px] sm:text-[10px] font-black text-[#97A0B3] uppercase tracking-wider truncate">
                APPROVED TODAY
              </span>
              <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-lg sm:rounded-xl bg-emerald-500/15 text-emerald-400 flex items-center justify-center font-bold shrink-0">
                <CheckCircle2 className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
              </div>
            </div>
            <div className="flex items-baseline justify-between sm:block">
              <div className="text-lg sm:text-3xl font-black text-white tracking-tight leading-none">{approvedTodayCount}</div>
              <div className="text-[10px] sm:text-xs font-bold text-emerald-400 mt-0.5 sm:mt-1">
                {approvedTodayCount === 0 ? "0 approved" : `${approvedTodayCount} approved`}
              </div>
            </div>
          </div>

          <div className="kpi-card bg-[#161F2D] rounded-xl sm:rounded-3xl p-2.5 sm:p-5 border border-[#2A3446] hover:border-rose-500/40 transition-all shadow-xs space-y-1 sm:space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[9px] sm:text-[10px] font-black text-[#97A0B3] uppercase tracking-wider truncate">
                REVISIONS
              </span>
              <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-lg sm:rounded-xl bg-rose-500/15 text-rose-400 flex items-center justify-center font-bold shrink-0">
                <AlertTriangle className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
              </div>
            </div>
            <div className="flex items-baseline justify-between sm:block">
              <div className="text-lg sm:text-3xl font-black text-white tracking-tight leading-none">{declinedCount}</div>
              <div className="text-[10px] sm:text-xs font-bold text-rose-400 mt-0.5 sm:mt-1">
                {declinedCount === 0 ? "0 revisions" : `${declinedCount} revisions`}
              </div>
            </div>
          </div>
        </div>

        {/* Filter Bar */}
        <div className="bg-[#161F2D] rounded-2xl p-3 sm:p-4 border border-[#2A3446] shadow-[0_2px_12px_rgba(0,0,0,0.02)] flex flex-col sm:flex-row flex-wrap items-stretch sm:items-center justify-between gap-3 sm:gap-4">
          <div className="flex flex-col sm:flex-row sm:items-center gap-2.5 sm:gap-3 flex-1">
            <div className="relative w-full sm:w-72">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#97A0B3]" />
              <input
                type="text"
                placeholder="Search deliverables, code, tags..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 pr-4 py-2 w-full rounded-xl border border-[#2A3446] bg-[#0B111C] text-xs font-medium text-white placeholder-[#97A0B3] focus:outline-none focus:ring-2 focus:ring-[#7FA0D6]/20 shadow-2xs"
              />
            </div>

            <div className="grid grid-cols-3 gap-1.5 sm:gap-2.5 w-full sm:w-auto sm:flex sm:items-center">
              <CustomSelect
                size="sm"
                className="w-full !px-2 sm:!px-3 !text-[11px] sm:!text-xs"
                value={selectedClient}
                onChange={setSelectedClient}
                ariaLabel="Filter Deliverable Client"
                options={[{ value: "all", label: "All Clients" }, ...Array.from(new Set(deliverablesList.map(d => d.client))).map(client => ({ value: client, label: client }))]}
              />

              <CustomSelect
                size="sm"
                className="w-full !px-2 sm:!px-3 !text-[11px] sm:!text-xs"
                value={statusFilter}
                onChange={setStatusFilter}
                ariaLabel="Filter Deliverable Status"
                options={[{ value: "all", label: "All Statuses" }, ...Array.from(new Set(deliverablesList.map(d => d.status))).map(status => ({ value: status, label: status.replaceAll("_", " ") }))]}
              />

              <CustomSelect
                size="sm"
                className="w-full !px-2 sm:!px-3 !text-[11px] sm:!text-xs"
                value={selectedFormat}
                onChange={setSelectedFormat}
                ariaLabel="Filter Deliverable Format Type"
                options={[{ value: "all", label: "All Formats" }, ...Array.from(new Map(deliverablesList.map(d => [d.formatType, d.formatLabel])).entries()).map(([value, label]) => ({ value, label }))]}
              />
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-[#97A0B3]">
              Showing {filteredDeliverables.length} deliverables
            </span>
          </div>
        </div>

        {deliverablesQuery.isPending && <p role="status" className="p-4 text-[#97A0B3]">Loading uploaded deliverables…</p>}
        {(deliverablesQuery.error || reviewError) && !revisionItem && <div role="alert" className="p-4 border border-[#D8BF9B] rounded-xl text-[#D8BF9B]">{reviewError || deliverablesQuery.error?.message}<button onClick={() => void deliverablesQuery.refetch()} className="ml-3 underline">Retry loading</button></div>}
        <Dialog.Root open={!!revisionItem} onOpenChange={open => { if (!open && !reviewBusy) setRevisionItem(null); }}>
          <Dialog.Portal>
            <Dialog.Overlay className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[10000]" />
            <Dialog.Content className="fixed z-[10001] top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[calc(100vw_-_2rem)] max-w-lg bg-[#161F2D] border border-[#2A3446] rounded-2xl p-6 text-white shadow-2xl">
              <Dialog.Title className="text-lg font-bold">Request an edit</Dialog.Title>
              <Dialog.Description className="text-sm text-[#97A0B3] mt-2 mb-5">Explain what needs to change in {revisionItem?.title}. Feedback is saved to this upload and returned to the production team.</Dialog.Description>
              <form onSubmit={submitRevision} className="space-y-4">
                <label className="block text-sm font-semibold" htmlFor="admin-revision-reason">Revision feedback</label>
                <textarea id="admin-revision-reason" value={revisionReason} onChange={event => setRevisionReason(event.target.value)} required maxLength={2000} rows={5} disabled={reviewBusy} className="w-full p-3 bg-[#0B111C] border border-[#2A3446] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#7FA0D6]" placeholder="Describe the changes needed…" />
                {reviewError && <p role="alert" className="text-sm text-[#D8BF9B]">{reviewError}</p>}
                <div className="flex justify-end gap-3"><Dialog.Close disabled={reviewBusy} className="px-4 py-3 rounded-xl border border-[#2A3446]">Cancel</Dialog.Close><button type="submit" disabled={reviewBusy || !revisionReason.trim()} className="px-4 py-3 rounded-xl bg-[#BCCCE6] text-[#050810] font-semibold disabled:opacity-50">{reviewBusy ? "Saving…" : "Send revision request"}</button></div>
              </form>
            </Dialog.Content>
          </Dialog.Portal>
        </Dialog.Root>
        {/* 2-Column on Mobile, 3-Column on Desktop in a Fixed-Height Scrollable Container */}
        {!deliverablesQuery.isPending && !deliverablesQuery.isError && filteredDeliverables.length === 0 ? (
          <div className="bg-[#161F2D] rounded-3xl border border-[#2A3446] p-12 text-center text-[#97A0B3] space-y-3">
            <Layers className="w-10 h-10 text-[#2A3446] mx-auto" />
            <h3 className="text-base font-bold text-white">No deliverables in queue</h3>
            <p className="text-xs text-[#97A0B3] max-w-sm mx-auto">
              Creative pod sprints will automatically submit finished reels, brand assets, and creative packages here for admin review.
            </p>
          </div>
        ) : (
        <div className="sm:max-h-[calc(100vh-270px)] lg:max-h-none lg:min-h-[700px] sm:overflow-y-auto lg:overflow-visible sm:overscroll-contain pr-1 sm:pr-2.5 lg:pr-0 scrollbar-thin scrollbar-thumb-[#2A3446] hover:scrollbar-thumb-[#7FA0D6]/40 scrollbar-track-transparent">
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3.5 sm:gap-4 lg:gap-5 pb-6 lg:pb-12">
          {filteredDeliverables.map((item) => (
            <div
              key={item.id}
              className="bg-[#161F2D] rounded-2xl sm:rounded-3xl border border-[#2A3446] shadow-[0_4px_25px_rgba(0,0,0,0.03)] hover:shadow-[0_8px_30px_rgba(0,0,0,0.06)] transition-all overflow-hidden flex flex-col justify-between"
            >
              {/* Card Header */}
              <div className="p-3.5 sm:p-5 pb-2.5 sm:pb-3 space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 sm:gap-2.5 min-w-0">
                    <div
                      className={`w-7 h-7 sm:w-8 sm:h-8 rounded-lg sm:rounded-xl ${item.clientBg} text-white font-black text-xs flex items-center justify-center shadow-xs shrink-0`}
                    >
                      {item.clientInitial}
                    </div>
                    <div className="min-w-0">
                      <div className="text-xs sm:text-sm font-black text-white leading-tight truncate">
                        {item.client}
                      </div>
                      <div className="text-[10px] sm:text-xs font-semibold text-[#97A0B3] truncate">
                        {item.assetCode}
                      </div>
                    </div>
                  </div>
                  <span
                    className={`px-2.5 py-0.5 rounded-full text-[9px] sm:text-[10px] font-black uppercase tracking-wider border shrink-0 ${item.statusBadge}`}
                  >
                    {item.statusLabel}
                  </span>
                </div>

                {/* Deliverable Title & Format */}
                <h3 className="text-xs sm:text-sm font-black text-white line-clamp-1 sm:line-clamp-2 leading-snug">
                  {item.title}
                </h3>
                <div className="hidden sm:block">
                  <PublishingControl deliverableId={item.id} />
                </div>
                <p className="text-[11px] font-semibold text-[#97A0B3] flex items-center gap-1.5">
                  <Tag className="w-3 h-3 text-[#97A0B3]" />
                  <span className="truncate">{item.format}</span>
                </p>
              </div>

              {/* Media Thumbnail with Preview Overlay */}
              <div
                className="relative h-40 sm:h-44 bg-gray-900 group cursor-pointer overflow-hidden mx-3 sm:mx-5 rounded-xl sm:rounded-2xl"
                onClick={() => setPreviewItem(item)}
              >
                <DeliverableMedia url={item.previewUrl} isVideo={!!item.is_video} title={item.title} controls={false} className="w-full h-full" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  <span className="px-3 py-1.5 sm:px-4 sm:py-2 bg-[#161F2D]/90 backdrop-blur-md rounded-lg sm:rounded-xl text-[11px] sm:text-xs font-black text-white shadow-xl flex items-center gap-1.5">
                    <Eye className="w-3.5 h-3.5 text-[#7FA0D6]" /> Quick Preview
                  </span>
                </div>
              </div>

              {/* Card Meta & Actions */}
              <div className="p-3.5 sm:p-5 pt-2.5 sm:pt-4 space-y-2.5 sm:space-y-3.5">
                {/* Pod & Retainer Info */}
                <div className="flex items-center justify-between text-xs pt-1.5 border-t border-[#2A3446]/40">
                  <div className="flex items-center gap-1.5 truncate mr-1">
                    <span className="font-bold text-[#97A0B3] text-[10px] uppercase">
                      Pod:
                    </span>
                    <span className="px-2 py-0.5 rounded-md bg-[#7FA0D6]/15 text-[#7FA0D6] text-xs font-bold truncate">
                      {item.pod}
                    </span>
                  </div>
                  <span className="text-xs font-bold text-[#97A0B3] shrink-0">
                    {item.retainer}
                  </span>
                </div>

                {/* SLA Target / Status */}
                <div className="flex items-center justify-between text-xs bg-[#0B111C]/80 p-2 sm:p-2.5 rounded-xl border border-[#2A3446]">
                  <span className={`text-xs font-bold truncate mr-1 ${item.slaColor}`}>
                    {item.slaText}
                  </span>
                  <button
                    type="button"
                    onClick={() => setCommentModalItem(item)}
                    className="text-[#97A0B3] hover:text-[#7FA0D6] text-xs font-bold flex items-center gap-1.5 cursor-pointer shrink-0"
                  >
                    {item.voice_note_url ? (
                      <span className="flex items-center gap-1 text-indigo-400 font-bold bg-indigo-500/10 px-1.5 py-0.5 rounded border border-indigo-500/30">
                        <Volume2 className="w-3.5 h-3.5" /> Audio
                      </span>
                    ) : (
                      <>
                        <MessageSquare className="w-3.5 h-3.5" />
                        Notes
                      </>
                    )}
                  </button>
                </div>

                {/* Action Buttons */}
                <div className="flex items-center gap-2 pt-0.5">
                  {item.status === "pending_qa" ? (
                    <>
                      <button
                        type="button"
                        disabled={reviewBusy || !item.previewUrl}
                        onClick={() => void handleApprove(item.id, item.title)}
                        className="flex-1 py-2 sm:py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black transition-colors flex items-center justify-center gap-1.5 shadow-xs cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5 stroke-[2.5]" /> Approve
                      </button>
                      <button
                        type="button"
                        disabled={reviewBusy || !item.previewUrl}
                        onClick={() => handleDecline(item.id, item.title)}
                        className="flex-1 py-2 sm:py-2.5 bg-[#0B111C] hover:bg-rose-500/15 border border-[#2A3446] hover:border-rose-500/40 text-[#F1F5F9] hover:text-rose-400 rounded-xl text-xs font-bold transition-colors flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                      >
                        <X className="w-3.5 h-3.5 stroke-[2.5]" /> Edit
                      </button>
                    </>
                  ) : (
                    <button
                      type="button"
                      disabled={reviewBusy || item.is_archived}
                      onClick={() => setWithdrawModalItem({ id: item.id, title: item.title })}
                      className="flex-1 py-2 bg-[#161F2D] hover:bg-rose-500/10 border border-rose-500/30 hover:border-rose-500 text-rose-400 rounded-xl text-xs font-bold transition-colors flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-40"
                      title="Withdraw deliverable with minor issues even after approval"
                    >
                      <Archive className="w-3.5 h-3.5" /> Withdraw
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => setHistoryModalItem({ id: item.id, title: item.title })}
                    className="p-2 sm:p-2.5 bg-[#0B111C] hover:bg-[#161F2D] border border-[#2A3446] rounded-xl text-[#7FA0D6] hover:text-white transition-colors cursor-pointer shrink-0"
                    title="View Activity & Version History"
                  >
                    <History className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          ))}
          </div>
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
                <DeliverableMedia url={previewItem.previewUrl} isVideo={!!previewItem.is_video} title={previewItem.title} className="w-full max-h-[420px]" />
              </div>

              <div className="p-4 bg-[#0B111C] rounded-2xl space-y-2 text-xs">
                <div className="font-bold text-white">Deliverable Blueprint:</div>
                <p className="text-[#F1F5F9] leading-relaxed">{previewItem.description}</p>
                <div className="flex flex-wrap gap-4 pt-2 text-[11px] text-[#97A0B3] border-t border-[#2A3446]">
                  <span><strong>Format:</strong> {previewItem.format}</span>
                  <span><strong>Pod:</strong> {previewItem.pod} {previewItem.podLead ? `(${previewItem.podLead})` : ""}</span>
                  <span><strong>SLA:</strong> {previewItem.slaText}</span>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  disabled={reviewBusy || previewItem.status !== "pending_qa" || !previewItem.previewUrl}
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
                  disabled={reviewBusy || previewItem.status !== "pending_qa" || !previewItem.previewUrl}
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

              {commentModalItem.description && (
                <p className="text-sm text-[#BCCCE6] whitespace-pre-wrap">{commentModalItem.description}</p>
              )}

              {commentModalItem.voice_note_url && (
                <div className="mt-2 space-y-1.5">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-[#97A0B3] flex items-center gap-1.5">
                    <Volume2 className="w-3.5 h-3.5 text-[#7FA0D6]" /> Attached Voice Note
                  </span>
                  <VoicePlayer
                    audioUrl={commentModalItem.voice_note_url}
                    durationSeconds={commentModalItem.voice_note_duration}
                    authorName={`${commentModalItem.client || "Client"}'s Voice Feedback`}
                  />
                </div>
              )}

              {!commentModalItem.description && !commentModalItem.voice_note_url && (
                <p className="text-sm text-[#97A0B3]">No revision feedback recorded for this upload.</p>
              )}

              <div className="pt-2 flex justify-between gap-2">
                <button
                  type="button"
                  onClick={() => {
                    const item = commentModalItem;
                    setCommentModalItem(null);
                    setHistoryModalItem({ id: item.id, title: item.title });
                  }}
                  className="px-4 py-2.5 bg-[#0B111C] hover:bg-[#161F2D] border border-[#2A3446] text-[#7FA0D6] hover:text-white rounded-xl text-xs font-bold cursor-pointer flex items-center gap-1.5"
                >
                  <History className="w-3.5 h-3.5" /> Full Audit Trail
                </button>
                <button
                  type="button"
                  onClick={() => setCommentModalItem(null)}
                  className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold cursor-pointer"
                >
                  Close Notes
                </button>
              </div>
            </div>
          </div>
        )}

        {withdrawModalItem && (
          <WithdrawDeliverableModal
            isOpen={true}
            onClose={() => setWithdrawModalItem(null)}
            deliverableId={withdrawModalItem.id}
            deliverableTitle={withdrawModalItem.title}
            onSuccess={() => {
              deliverablesQuery.refetch();
              showToast("Deliverable safely withdrawn and archived. Deletion record logged with client visibility.");
            }}
          />
        )}

        {historyModalItem && (
          <DeliverableHistoryModal
            isOpen={true}
            onClose={() => setHistoryModalItem(null)}
            deliverableId={historyModalItem.id}
            deliverableTitle={historyModalItem.title}
            isClient={false}
          />
        )}
      </main>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 3. ADMIN TASKS & DISPATCH QUEUE PAGE
// ─────────────────────────────────────────────────────────────────────────────
interface AdminTaskItem {
  id: string;
  column: "todo" | "in_progress" | "under_review" | "approved";
  rawStatus: string;
  client: string;
  clientPill: string;
  priority: "Normal" | "High" | "Urgent";
  priorityPill: string;
  title: string;
  type: string;
  avatar: string;
  avatarBg: string;
  assigneeName: string;
  assigneeEmail?: string;
  isFreelancer: boolean;
  freelancerId?: string;
  freelancerSpecialty?: string;
  milestoneFee?: number;
  instructions?: string;
  sp: number;
  due: string;
  dueDateRaw?: string;
  pod: string;
  blueprint?: Record<string, any>;
  deliverables?: any[];
}

export function AdminTasksPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedPod, setSelectedPod] = useState("all");
  const [selectedClient, setSelectedClient] = useState("all");
  const [priorityFilter, _setPriorityFilter] = useState<"all" | "urgent" | "high">("all"); void _setPriorityFilter;
  const [assigneeTypeFilter, setAssigneeTypeFilter] = useState<"all" | "freelancers" | "in_house">("all");
  const [selectedFreelancer, setSelectedFreelancer] = useState("all");
  const [viewMode, setViewMode] = useState<"kanban" | "freelancer_roster">("kanban"); void setViewMode;
  const [mobileKanbanCol, setMobileKanbanCol] = useState<"todo" | "in_progress" | "under_review" | "approved">("in_progress");
  const [toast, setToast] = useState<string | null>(null);
  const [previewTask, setPreviewTask] = useState<any | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isAssignPickerOpen, setIsAssignPickerOpen] = useState(false);
  const [assignFreelancerTarget, setAssignFreelancerTarget] = useState<FreelancerProfileItem | null>(null);
  const [isAdvancingStage, setIsAdvancingStage] = useState(false);
  const [columnLimits, setColumnLimits] = useState<Record<string, number>>({
    todo: 12,
    in_progress: 12,
    under_review: 12,
    approved: 12,
  });

  const handleLoadMore = (colId: string) => {
    setColumnLimits((prev) => ({
      ...prev,
      [colId]: (prev[colId] || 12) + 12,
    }));
  };

  const handleShowAll = (colId: string, total: number) => {
    setColumnLimits((prev) => ({
      ...prev,
      [colId]: total,
    }));
  };

  // In-house creation form state
  const [newTaskForm, setNewTaskForm] = useState({
    title: "",
    client: "",
    pod: "",
    category: "Design",
    sp: 4,
    dueDate: "",
    priority: "Normal",
    assignee: "",
    column: "todo",
  });

  // Queries
  const {
    data: kanbanData,
    refetch: refetchTasks,
  } = useQuery({
    queryKey: ["admin-kanban-tasks"],
    queryFn: () => fetchKanbanTasks(),
    refetchInterval: 15000,
  });

  const {
    data: freelancersList = [],
  } = useQuery({
    queryKey: ["admin-freelancers-queue"],
    queryFn: () => fetchFreelancers(),
  });

  // Auto clear toast
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 4000);
    return () => clearTimeout(t);
  }, [toast]);

  // Default fallback tasks for offline / empty state
  const defaultTasks: AdminTaskItem[] = useMemo(() => [
    {
      id: "task-101",
      column: "in_progress" as const,
      rawStatus: "in_production",
      client: "Ryze Mushroom Coffee",
      clientPill: "bg-[#7FA0D6]/15 text-[#7FA0D6] border-[#7FA0D6]/30",
      priority: "Urgent" as const,
      priorityPill: "bg-rose-600 text-white font-black",
      title: "3D Product Render & Motion Hook (15s Reel)",
      type: "3D Render / Blender",
      avatar: "VM",
      avatarBg: "bg-blue-600",
      assigneeName: "Vikram Malhotra",
      isFreelancer: false,
      sp: 8,
      due: "Today, 6:00 PM",
      pod: "Pod A",
    },
    {
      id: "task-102",
      column: "todo" as const,
      rawStatus: "backlog",
      client: "Ryze Mushroom Coffee",
      clientPill: "bg-[#7FA0D6]/15 text-[#7FA0D6] border-[#7FA0D6]/30",
      priority: "High" as const,
      priorityPill: "bg-rose-500/15 text-rose-400 border border-rose-500/30",
      title: "DTC Ad Hook Variations (15s Reel Clips)",
      type: "Performance Editing",
      avatar: "SC",
      avatarBg: "bg-purple-600",
      assigneeName: "Sarah Connor",
      isFreelancer: false,
      sp: 5,
      due: "Tomorrow, 2:00 PM",
      pod: "Pod B",
    },
    {
      id: "task-103",
      column: "under_review" as const,
      rawStatus: "internal_qa",
      client: "Acme Corp",
      clientPill: "bg-[#7FA0D6]/15 text-[#7FA0D6] border-[#7FA0D6]/30",
      priority: "High" as const,
      priorityPill: "bg-rose-500/15 text-rose-400 border border-rose-500/30",
      title: "Instagram Story Templates (1080x1920 Figma Kit)",
      type: "Visual Design",
      avatar: "ER",
      avatarBg: "bg-emerald-600",
      assigneeName: "Elena Rostova",
      isFreelancer: false,
      sp: 3,
      due: "Oct 5, 2026",
      pod: "Pod A",
    },
    {
      id: "task-104",
      column: "approved" as const,
      rawStatus: "ready_to_publish",
      client: "Kavya Organics",
      clientPill: "bg-[#7FA0D6]/15 text-[#7FA0D6] border-[#7FA0D6]/30",
      priority: "Normal" as const,
      priorityPill: "bg-[#161F2D] text-[#F1F5F9] border-[#2A3446]",
      title: "Brand Guidelines & Color Palette Audit (v2.0)",
      type: "Brand Strategy",
      avatar: "MB",
      avatarBg: "bg-amber-600",
      assigneeName: "Marcus Brody",
      isFreelancer: false,
      sp: 4,
      due: "Oct 3, 2026",
      pod: "Pod C",
    },
  ], []);

  // Normalize server tasks
  const tasks: AdminTaskItem[] = useMemo(() => {
    if (!kanbanData) return defaultTasks;

    const allRaw = [
      ...(kanbanData.backlog || []).map((t: any) => ({ ...t, column: "todo", mappedStatus: "backlog" })),
      ...(kanbanData.in_production || []).map((t: any) => ({ ...t, column: "in_progress", mappedStatus: "in_production" })),
      ...(kanbanData.internal_qa || []).map((t: any) => ({ ...t, column: "under_review", mappedStatus: "internal_qa" })),
      ...(kanbanData.client_review || []).map((t: any) => ({ ...t, column: "under_review", mappedStatus: "client_review" })),
      ...(kanbanData.ready_to_publish || []).map((t: any) => ({ ...t, column: "approved", mappedStatus: "ready_to_publish" })),
    ];

    if (allRaw.length === 0) return defaultTasks;

    return allRaw.map((t: any) => {
      const isFreelancer = Boolean(
        t.assignee?.role === "freelancer" ||
        t.assignee_role === "freelancer" ||
        t.blueprint?.is_freelancer ||
        t.blueprint?.freelancer_id ||
        t.assignee?.is_freelancer
      );

      const freelancerName =
        t.blueprint?.freelancer_name ||
        (isFreelancer ? t.assignee_name || t.assignee?.full_name : null);

      const freelancerEmail =
        t.blueprint?.freelancer_email ||
        (isFreelancer ? t.assignee_email || t.assignee?.email : null);

      const freelancerSpecialty =
        t.blueprint?.specialty ||
        t.freelancer_specialty ||
        t.assignee?.specialty ||
        (isFreelancer ? "External Specialist" : undefined);

      const milestoneFee =
        t.blueprint?.milestone_fee ||
        t.freelancer_rate ||
        t.assignee?.hourly_rate;

      const title =
        t.blueprint?.title ||
        t.blueprint?.concept_name ||
        t.deliverable?.title ||
        t.title ||
        (t.deliverable_type ? `${String(t.deliverable_type).toUpperCase()} Production` : "Creative Task");

      const clientName =
        t.client_company ||
        t.client_name ||
        (t.client_email ? t.client_email.split("@")[0] : null) ||
        "Creo Client";

      const priority = (t.blueprint?.priority || (t.is_near_sla ? "Urgent" : t.priority || "Normal")) as "Normal" | "High" | "Urgent";

      const priorityPill =
        priority === "Urgent"
          ? "bg-rose-600 text-white font-black"
          : priority === "High"
          ? "bg-rose-500/15 text-rose-400 border border-rose-500/30"
          : "bg-[#161F2D] text-[#F1F5F9] border-[#2A3446]";

      const isVideo = (t.deliverable_type ? String(t.deliverable_type).toLowerCase() : "").includes("reel") ||
                      (t.type ? String(t.type).toLowerCase() : "").includes("video");

      let resolvedAssigneeName = freelancerName || t.assignee_name;
      if (!resolvedAssigneeName || resolvedAssigneeName === "Unassigned") {
        if (!isFreelancer) {
          resolvedAssigneeName = isVideo ? "Marcus Chen" : "Elena Rostova";
        } else {
          resolvedAssigneeName = "Unassigned";
        }
      }

      const initials = (resolvedAssigneeName || "UN")
        .split(" ")
        .map((n: string) => n[0])
        .join("")
        .slice(0, 2)
        .toUpperCase();

      return {
        id: String(t.id),
        column: t.column,
        rawStatus: t.status || t.mappedStatus || "in_production",
        client: clientName,
        clientPill: "bg-[#7FA0D6]/15 text-[#7FA0D6] border-[#7FA0D6]/30",
        priority,
        priorityPill,
        title,
        type: t.deliverable_type ? String(t.deliverable_type).replace(/_/g, " ").toUpperCase() : "VIDEO PRODUCTION",
        avatar: initials,
        avatarBg: isFreelancer ? "bg-gradient-to-tr from-purple-600 to-indigo-600" : "bg-blue-600",
        assigneeName: resolvedAssigneeName,
        assigneeEmail: freelancerEmail || t.assignee_email,
        isFreelancer,
        freelancerId: t.blueprint?.freelancer_id || t.assigned_to,
        freelancerSpecialty,
        milestoneFee: milestoneFee ? Number(milestoneFee) : undefined,
        instructions: t.blueprint?.instructions || "",
        sp: t.effort_points || 4,
        due: t.due_date ? new Date(t.due_date).toLocaleDateString() : "Flexible",
        dueDateRaw: t.due_date,
        pod: t.pod || (isFreelancer ? "Outsourced" : "Pod A"),
        blueprint: t.blueprint,
        deliverables: t.deliverables || [],
      };
    });
  }, [kanbanData, defaultTasks]);

  // Stage advancing handler
  const handleAdvanceStage = async (taskId: string, targetStatus: string) => {
    setIsAdvancingStage(true);
    try {
      await moveTaskStage(taskId, targetStatus);
      setToast(`Task successfully moved to ${targetStatus.replace(/_/g, " ").toUpperCase()}!`);
      await refetchTasks();
      if (previewTask && previewTask.id === taskId) {
        setPreviewTask((prev: any) => ({
          ...prev,
          rawStatus: targetStatus,
          column:
            targetStatus === "backlog"
              ? "todo"
              : targetStatus === "in_production"
              ? "in_progress"
              : targetStatus === "ready_to_publish"
              ? "approved"
              : "under_review",
        }));
      }
    } catch (err: any) {
      setToast(err?.message || "Failed to advance stage.");
    } finally {
      setIsAdvancingStage(false);
    }
  };

  // Dynamic filter dropdown options
  const clientOptions = useMemo(() => {
    const set = new Set<string>();
    tasks.forEach((t) => {
      if (t.client) set.add(t.client);
    });
    return [
      { value: "all", label: "All Clients" },
      ...Array.from(set).map((c) => ({ value: c, label: c })),
    ];
  }, [tasks]);

  const freelancerFilterOptions = useMemo(() => {
    const list = freelancersList || [];
    return [
      { value: "all", label: "All Freelancers / Specialists" },
      ...list.map((f: FreelancerProfileItem) => ({
        value: String(f.id),
        label: `${f.full_name} (${f.specialty || "Specialist"})`,
      })),
    ];
  }, [freelancersList]);

  // Calculations for KPI strip
  const freelancerTasks = useMemo(() => tasks.filter((t) => t.isFreelancer), [tasks]);

  const inProductionFreelancersCount = freelancerTasks.filter(
    (t) => t.column === "in_progress" || t.rawStatus === "in_production"
  ).length;

  const underReviewFreelancersCount = freelancerTasks.filter(
    (t) => t.column === "under_review" || t.rawStatus === "internal_qa" || t.rawStatus === "client_review"
  ).length;

  const approvedFreelancersCount = freelancerTasks.filter(
    (t) => t.column === "approved" || t.rawStatus === "ready_to_publish"
  ).length;

  const totalFreelancerPayout = freelancerTasks.reduce(
    (sum, t) => sum + (t.milestoneFee || 0),
    0
  );

  // Filter tasks
  const filteredTasks = tasks.filter((t) => {
    const matchesSearch =
      !searchQuery.trim() ||
      t.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.client.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.assigneeName.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesPod = selectedPod === "all" || t.pod === selectedPod;
    const matchesClient =
      selectedClient === "all" || t.client.toLowerCase().includes(selectedClient.toLowerCase());

    const matchesAssigneeType =
      assigneeTypeFilter === "all"
        ? true
        : assigneeTypeFilter === "freelancers"
        ? t.isFreelancer
        : !t.isFreelancer;

    const matchesFreelancer =
      selectedFreelancer === "all"
        ? true
        : (String(t.freelancerId) === selectedFreelancer || t.assigneeName.toLowerCase().includes(selectedFreelancer.toLowerCase()));

    const matchesPriority =
      priorityFilter === "all"
        ? true
        : priorityFilter === "urgent"
        ? t.priority === "Urgent"
        : priorityFilter === "high"
        ? t.priority === "High" || t.priority === "Urgent"
        : true;

    return matchesSearch && matchesPod && matchesClient && matchesAssigneeType && matchesFreelancer && matchesPriority;
  });

  const todoTasks = filteredTasks.filter((t) => t.column === "todo");
  const inProgressTasks = filteredTasks.filter((t) => t.column === "in_progress");
  const underReviewTasks = filteredTasks.filter((t) => t.column === "under_review");
  const approvedTasks = filteredTasks.filter((t) => t.column === "approved");

  const handleCreateTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskForm.title.trim()) return;

    setToast(`Task '${newTaskForm.title}' queued for production.`);
    setIsCreateModalOpen(false);
    setNewTaskForm({
      title: "",
      client: "",
      pod: "",
      category: "Design",
      sp: 4,
      dueDate: "",
      priority: "Normal",
      assignee: "",
      column: "todo",
    });
  };

  return (
    <div data-surface="ops" className="w-full min-h-screen font-sans bg-[#0B111C] flex flex-col">
      <AdminTopHeader activeTab="Content Engine" />

      {/* Floating Notification Toast */}
      {toast && (
        <div className="fixed bottom-6 right-6 z-[99999] bg-[#161F2D] border border-emerald-500/40 text-emerald-300 px-4 py-3 rounded-2xl shadow-2xl flex items-center gap-2.5 text-xs font-semibold animate-fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{toast}</span>
        </div>
      )}

      <main className="flex-1 px-3.5 sm:px-6 lg:px-8 pt-6 sm:pt-8 pb-24 sm:pb-16 max-w-[1550px] w-full mx-auto space-y-5 sm:space-y-6">
        {/* Global Controls & Action Buttons */}
        <div className="flex items-center justify-end gap-2.5 w-full">
          {/* Action Buttons: 2-column grid on mobile for perfect alignment, inline on desktop */}
          <div className="grid grid-cols-2 gap-2 w-full sm:w-auto sm:flex sm:items-center sm:gap-2.5">
              {/* Assign Freelancer Task CTA */}
              <button
                type="button"
                onClick={() => setIsAssignPickerOpen(true)}
                className="w-full sm:w-auto justify-center px-3 sm:px-3.5 py-2.5 sm:py-2 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white text-xs font-bold flex items-center gap-1.5 shadow-md shadow-purple-600/20 cursor-pointer transition-all active:scale-95 truncate"
              >
                <UserCheck className="w-4 h-4 stroke-[2.5] shrink-0" />
                <span className="truncate">Assign Freelancer</span>
              </button>

              {/* Create Production Task */}
              <button
                type="button"
                onClick={() => setIsCreateModalOpen(true)}
                className="w-full sm:w-auto justify-center px-3 sm:px-3.5 py-2.5 sm:py-2 rounded-xl bg-[#7FA0D6] hover:bg-blue-600 text-white text-xs font-bold flex items-center gap-1.5 shadow-sm cursor-pointer transition-colors active:scale-95 truncate"
              >
                <Plus className="w-4 h-4 stroke-[3] shrink-0" />
                <span className="truncate">Create Task</span>
              </button>
            </div>
          </div>

        {/* Unified Minimal Filter Bar */}
        <div className="bg-[#161F2D]/60 p-2.5 sm:p-3 rounded-2xl border border-[#2A3446]/80 backdrop-blur-md space-y-2.5">
          {/* Main Controls Row: Search + Minimal Dropdowns */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-2.5">
            {/* Search Input */}
            <div className="relative flex-1 min-w-0">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#97A0B3]" />
              <input
                type="text"
                placeholder="Search tasks, specialists, clients..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 pr-8 h-9 w-full rounded-xl border border-[#2A3446] bg-[#0B111C] text-xs sm:text-sm font-medium text-white placeholder-[#97A0B3] focus:outline-none focus:border-[#7FA0D6] focus:ring-2 focus:ring-[#7FA0D6]/20 transition-all"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#97A0B3] hover:text-white cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Dropdowns Group: Minimal 2-column on phone, inline on desktop */}
            <div className="grid grid-cols-2 sm:flex sm:items-center gap-2 shrink-0">
              {/* 1. Client Filter ("Client-wise to choose client") */}
              <div className="w-full sm:w-[170px]">
                <CustomSelect
                  value={selectedClient}
                  onChange={setSelectedClient}
                  ariaLabel="Filter Client Brand"
                  size="sm"
                  icon={<Briefcase className="w-3.5 h-3.5 text-[#7FA0D6]" />}
                  options={clientOptions}
                  className="!min-h-[36px] !h-9 !text-xs w-full"
                />
              </div>

              {/* 2. Workload / Category Filter ("All the options as dropdown and make it minimal") */}
              <div className="w-full sm:w-[190px]">
                <CustomSelect
                  value={assigneeTypeFilter}
                  onChange={(val) => {
                    setAssigneeTypeFilter(val as any);
                    if (val !== "freelancers") setSelectedFreelancer("all");
                  }}
                  ariaLabel="Filter Workload Category"
                  size="sm"
                  icon={<Sparkles className="w-3.5 h-3.5 text-purple-400" />}
                  options={[
                    { value: "all", label: "All Workload" },
                    { value: "freelancers", label: "Freelancers" },
                    { value: "in_house", label: "In-House" },
                  ]}
                  className="!min-h-[36px] !h-9 !text-xs w-full"
                />
              </div>

              {/* 3. Specialist Filter (Shown when Freelancers active) */}
              {assigneeTypeFilter === "freelancers" && (
                <div className="col-span-2 sm:w-[180px]">
                  <CustomSelect
                    value={selectedFreelancer}
                    onChange={setSelectedFreelancer}
                    ariaLabel="Filter Specialist"
                    size="sm"
                    icon={<UserCheck className="w-3.5 h-3.5 text-purple-400" />}
                    options={freelancerFilterOptions}
                    className="!min-h-[36px] !h-9 !text-xs w-full"
                  />
                </div>
              )}
            </div>
          </div>

          {/* Status & Reset Row */}
          <div className="flex items-center justify-between text-xs pt-1 px-1 border-t border-[#2A3446]/40">
            <span className="text-xs font-semibold text-[#97A0B3]">
              Showing <span className="text-white font-bold">{filteredTasks.length}</span> {filteredTasks.length === 1 ? "task" : "tasks"}
            </span>

            {(searchQuery || selectedFreelancer !== "all" || selectedPod !== "all" || selectedClient !== "all" || assigneeTypeFilter !== "all") && (
              <button
                type="button"
                onClick={() => {
                  setSearchQuery("");
                  setSelectedFreelancer("all");
                  setSelectedPod("all");
                  setSelectedClient("all");
                  setAssigneeTypeFilter("all");
                }}
                className="px-2 py-0.5 rounded-lg text-xs font-semibold text-[#7FA0D6] hover:text-white hover:bg-[#7FA0D6]/10 transition-all flex items-center gap-1 cursor-pointer"
              >
                <X className="w-3 h-3" />
                <span>Reset Filters</span>
              </button>
            )}
          </div>
        </div>

        {/* Freelancer Operations KPI Strip (Visible when Freelancers tab or Table view active) */}
        {(assigneeTypeFilter === "freelancers" || viewMode === "freelancer_roster") && (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 animate-fade-in">
            <div className="bg-gradient-to-br from-[#161F2D] to-[#121A26] rounded-2xl p-4 border border-purple-500/20 shadow-lg">
              <div className="flex items-center justify-between text-[#97A0B3] text-xs">
                <span>Active Outsourced</span>
                <span className="w-2 h-2 rounded-full bg-purple-400 animate-pulse" />
              </div>
              <div className="text-2xl font-black text-white mt-1.5 flex items-center gap-2">
                <span>{freelancerTasks.length}</span>
                <span className="text-[11px] font-bold text-purple-300">Deliverables</span>
              </div>
              <p className="text-[10px] text-[#97A0B3] mt-1">Assigned to verified creators</p>
            </div>

            <div className="bg-gradient-to-br from-[#161F2D] to-[#121A26] rounded-2xl p-4 border border-blue-500/20 shadow-lg">
              <div className="flex items-center justify-between text-[#97A0B3] text-xs">
                <span>In Process / WIP</span>
                <span className="w-2 h-2 rounded-full bg-blue-400" />
              </div>
              <div className="text-2xl font-black text-white mt-1.5 flex items-center gap-2">
                <span>{inProductionFreelancersCount}</span>
                <span className="text-[11px] font-bold text-blue-300">Active Cuts</span>
              </div>
              <p className="text-[10px] text-[#97A0B3] mt-1">Specialists actively producing</p>
            </div>

            <div className="bg-gradient-to-br from-[#161F2D] to-[#121A26] rounded-2xl p-4 border border-amber-500/20 shadow-lg">
              <div className="flex items-center justify-between text-[#97A0B3] text-xs">
                <span>Awaiting TL Review</span>
                <span className="w-2 h-2 rounded-full bg-amber-400" />
              </div>
              <div className="text-2xl font-black text-white mt-1.5 flex items-center gap-2">
                <span>{underReviewFreelancersCount}</span>
                <span className="text-[11px] font-bold text-amber-300">Pending QA</span>
              </div>
              <p className="text-[10px] text-[#97A0B3] mt-1">Work submitted by freelancers</p>
            </div>

            <div className="bg-gradient-to-br from-[#161F2D] to-[#121A26] rounded-2xl p-4 border border-emerald-500/20 shadow-lg">
              <div className="flex items-center justify-between text-[#97A0B3] text-xs">
                <span>Committed Budget</span>
                <IndianRupee className="w-3.5 h-3.5 text-emerald-400" />
              </div>
              <div className="text-2xl font-black text-emerald-400 mt-1.5">
                ₹{totalFreelancerPayout.toLocaleString()}
              </div>
              <p className="text-[10px] text-[#97A0B3] mt-1">{approvedFreelancersCount} completed deliverables</p>
            </div>
          </div>
        )}

        {/* View Mode 1: KANBAN PIPELINE */}
        {viewMode === "kanban" && (
          <div className="space-y-4">
            {/* Mobile Column Switcher */}
            <div className="sm:hidden grid grid-cols-4 gap-1.5 w-full pb-1">
              {[
                { id: "todo", label: "To Do" },
                { id: "in_progress", label: "In Process" },
                { id: "under_review", label: "Review" },
                { id: "approved", label: "Done" },
              ].map((col) => (
                <button
                  key={col.id}
                  type="button"
                  onClick={() => setMobileKanbanCol(col.id as any)}
                  className={`w-full py-2 px-1 rounded-xl text-[11px] min-[380px]:text-xs font-bold text-center justify-center transition-all cursor-pointer flex items-center truncate ${
                    mobileKanbanCol === col.id
                      ? "bg-[#7FA0D6] text-white shadow-sm font-extrabold"
                      : "bg-[#161F2D] text-[#97A0B3] border border-[#2A3446] hover:text-white"
                  }`}
                >
                  <span className="truncate w-full text-center">{col.label}</span>
                </button>
              ))}
            </div>

            {/* 4 Pipeline Columns with Independent Scrollable Lanes */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 items-start">
              
              {/* Column 1: TO DO (Backlog / Assigned) */}
              <div className={`bg-[#161F2D]/60 rounded-3xl border border-[#2A3446]/80 shadow-xl overflow-hidden flex flex-col h-[calc(100vh-270px)] min-h-[560px] max-h-[820px] ${
                mobileKanbanCol !== "todo" ? "hidden sm:flex" : "flex"
              }`}>
                <div className="p-4 bg-[#161F2D]/95 backdrop-blur-md border-b border-[#2A3446]/70 flex items-center justify-between shrink-0">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-slate-400" />
                    <h3 className="text-xs font-black text-white tracking-wider uppercase">
                      TO DO / QUEUE
                    </h3>
                  </div>
                  <span className="px-2 py-0.5 rounded-full bg-[#0B111C] text-[#F1F5F9] text-[11px] font-bold border border-[#2A3446]">
                    {todoTasks.length}
                  </span>
                </div>

                <div className="flex-1 p-3.5 space-y-3 overflow-y-auto overflow-x-hidden custom-scrollbar">
                  {todoTasks.length === 0 ? (
                    <div className="p-6 text-center text-xs text-[#97A0B3] bg-[#0B111C]/40 rounded-2xl border border-dashed border-[#2A3446]">
                      No backlog tasks matching filter
                    </div>
                  ) : (
                    <>
                      {todoTasks.slice(0, columnLimits.todo || 12).map((task) => (
                        <TaskCard key={task.id} task={task} onSelect={() => setPreviewTask(task)} />
                      ))}

                      {todoTasks.length > (columnLimits.todo || 12) && (
                        <div className="pt-2 pb-1 space-y-1.5">
                          <button
                            type="button"
                            onClick={() => handleLoadMore("todo")}
                            className="w-full py-2 px-3 rounded-xl bg-[#0B111C]/90 hover:bg-[#1a2536] border border-[#2A3446] text-xs font-bold text-[#7FA0D6] flex items-center justify-center gap-1.5 transition-all shadow-sm cursor-pointer"
                          >
                            <ChevronDown className="w-3.5 h-3.5" />
                            <span>Load 12 More ({todoTasks.length - (columnLimits.todo || 12)} remaining)</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => handleShowAll("todo", todoTasks.length)}
                            className="w-full py-1 text-[10px] font-semibold text-[#97A0B3] hover:text-white transition-colors text-center cursor-pointer"
                          >
                            Show All ({todoTasks.length})
                          </button>
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>

              {/* Column 2: IN PRODUCTION (Active WIP / In Process) */}
              <div className={`bg-[#161F2D]/60 rounded-3xl border border-[#2A3446]/80 shadow-xl overflow-hidden flex flex-col h-[calc(100vh-270px)] min-h-[560px] max-h-[820px] ${
                mobileKanbanCol !== "in_progress" ? "hidden sm:flex" : "flex"
              }`}>
                <div className="p-4 bg-[#161F2D]/95 backdrop-blur-md border-b border-[#2A3446]/70 flex items-center justify-between shrink-0">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-blue-500 animate-pulse" />
                    <h3 className="text-xs font-black text-white tracking-wider uppercase">
                      IN PRODUCTION
                    </h3>
                  </div>
                  <span className="px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300 text-[11px] font-bold border border-blue-500/30">
                    {inProgressTasks.length}
                  </span>
                </div>

                <div className="flex-1 p-3.5 space-y-3 overflow-y-auto overflow-x-hidden custom-scrollbar">
                  {inProgressTasks.length === 0 ? (
                    <div className="p-6 text-center text-xs text-[#97A0B3] bg-[#0B111C]/40 rounded-2xl border border-dashed border-[#2A3446]">
                      No active production tasks
                    </div>
                  ) : (
                    <>
                      {inProgressTasks.slice(0, columnLimits.in_progress || 12).map((task) => (
                        <TaskCard key={task.id} task={task} onSelect={() => setPreviewTask(task)} />
                      ))}

                      {inProgressTasks.length > (columnLimits.in_progress || 12) && (
                        <div className="pt-2 pb-1 space-y-1.5">
                          <button
                            type="button"
                            onClick={() => handleLoadMore("in_progress")}
                            className="w-full py-2 px-3 rounded-xl bg-[#0B111C]/90 hover:bg-[#1a2536] border border-[#2A3446] text-xs font-bold text-[#7FA0D6] flex items-center justify-center gap-1.5 transition-all shadow-sm cursor-pointer"
                          >
                            <ChevronDown className="w-3.5 h-3.5" />
                            <span>Load 12 More ({inProgressTasks.length - (columnLimits.in_progress || 12)} remaining)</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => handleShowAll("in_progress", inProgressTasks.length)}
                            className="w-full py-1 text-[10px] font-semibold text-[#97A0B3] hover:text-white transition-colors text-center cursor-pointer"
                          >
                            Show All ({inProgressTasks.length})
                          </button>
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>

              {/* Column 3: UNDER REVIEW (Internal QA & Client Review) */}
              <div className={`bg-[#161F2D]/60 rounded-3xl border border-[#2A3446]/80 shadow-xl overflow-hidden flex flex-col h-[calc(100vh-270px)] min-h-[560px] max-h-[820px] ${
                mobileKanbanCol !== "under_review" ? "hidden sm:flex" : "flex"
              }`}>
                <div className="p-4 bg-[#161F2D]/95 backdrop-blur-md border-b border-[#2A3446]/70 flex items-center justify-between shrink-0">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                    <h3 className="text-xs font-black text-white tracking-wider uppercase">
                      QA &amp; REVIEW
                    </h3>
                  </div>
                  <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 text-[11px] font-bold border border-amber-500/30">
                    {underReviewTasks.length}
                  </span>
                </div>

                <div className="flex-1 p-3.5 space-y-3 overflow-y-auto overflow-x-hidden custom-scrollbar">
                  {underReviewTasks.length === 0 ? (
                    <div className="p-6 text-center text-xs text-[#97A0B3] bg-[#0B111C]/40 rounded-2xl border border-dashed border-[#2A3446]">
                      No tasks awaiting review
                    </div>
                  ) : (
                    <>
                      {underReviewTasks.slice(0, columnLimits.under_review || 12).map((task) => (
                        <TaskCard key={task.id} task={task} onSelect={() => setPreviewTask(task)} />
                      ))}

                      {underReviewTasks.length > (columnLimits.under_review || 12) && (
                        <div className="pt-2 pb-1 space-y-1.5">
                          <button
                            type="button"
                            onClick={() => handleLoadMore("under_review")}
                            className="w-full py-2 px-3 rounded-xl bg-[#0B111C]/90 hover:bg-[#1a2536] border border-[#2A3446] text-xs font-bold text-[#7FA0D6] flex items-center justify-center gap-1.5 transition-all shadow-sm cursor-pointer"
                          >
                            <ChevronDown className="w-3.5 h-3.5" />
                            <span>Load 12 More ({underReviewTasks.length - (columnLimits.under_review || 12)} remaining)</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => handleShowAll("under_review", underReviewTasks.length)}
                            className="w-full py-1 text-[10px] font-semibold text-[#97A0B3] hover:text-white transition-colors text-center cursor-pointer"
                          >
                            Show All ({underReviewTasks.length})
                          </button>
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>

              {/* Column 4: APPROVED / DONE */}
              <div className={`bg-[#161F2D]/60 rounded-3xl border border-[#2A3446]/80 shadow-xl overflow-hidden flex flex-col h-[calc(100vh-270px)] min-h-[560px] max-h-[820px] ${
                mobileKanbanCol !== "approved" ? "hidden sm:flex" : "flex"
              }`}>
                <div className="p-4 bg-[#161F2D]/95 backdrop-blur-md border-b border-[#2A3446]/70 flex items-center justify-between shrink-0">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                    <h3 className="text-xs font-black text-white tracking-wider uppercase">
                      APPROVED / DONE
                    </h3>
                  </div>
                  <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-[11px] font-bold border border-emerald-500/30">
                    {approvedTasks.length}
                  </span>
                </div>

                <div className="flex-1 p-3.5 space-y-3 overflow-y-auto overflow-x-hidden custom-scrollbar">
                  {approvedTasks.length === 0 ? (
                    <div className="p-6 text-center text-xs text-[#97A0B3] bg-[#0B111C]/40 rounded-2xl border border-dashed border-[#2A3446]">
                      No completed tasks
                    </div>
                  ) : (
                    <>
                      {approvedTasks.slice(0, columnLimits.approved || 12).map((task) => (
                        <TaskCard key={task.id} task={task} onSelect={() => setPreviewTask(task)} />
                      ))}

                      {approvedTasks.length > (columnLimits.approved || 12) && (
                        <div className="pt-2 pb-1 space-y-1.5">
                          <button
                            type="button"
                            onClick={() => handleLoadMore("approved")}
                            className="w-full py-2 px-3 rounded-xl bg-[#0B111C]/90 hover:bg-[#1a2536] border border-[#2A3446] text-xs font-bold text-[#7FA0D6] flex items-center justify-center gap-1.5 transition-all shadow-sm cursor-pointer"
                          >
                            <ChevronDown className="w-3.5 h-3.5" />
                            <span>Load 12 More ({approvedTasks.length - (columnLimits.approved || 12)} remaining)</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => handleShowAll("approved", approvedTasks.length)}
                            className="w-full py-1 text-[10px] font-semibold text-[#97A0B3] hover:text-white transition-colors text-center cursor-pointer"
                          >
                            Show All ({approvedTasks.length})
                          </button>
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>

            </div>
          </div>
        )}

        {/* View Mode 2: DEDICATED FREELANCER WORK ROSTER (TABLE VIEW) */}
        {viewMode === "freelancer_roster" && (
          <div className="bg-[#161F2D] rounded-3xl border border-[#2A3446] overflow-hidden shadow-2xl space-y-4 p-5 sm:p-6 animate-fade-in">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#2A3446] pb-4">
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-purple-400" />
                  Outsourced Specialist Task Roster
                </h3>
                <p className="text-xs text-[#97A0B3] mt-0.5">
                  Complete real-time monitoring of all deliverables assigned to external freelancers
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsAssignPickerOpen(true)}
                className="px-3.5 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold flex items-center gap-1.5 self-start sm:self-auto cursor-pointer shadow-md shadow-purple-600/30"
              >
                <Plus className="w-3.5 h-3.5" /> Assign Another Task
              </button>
            </div>

            {freelancerTasks.length === 0 ? (
              <div className="p-12 text-center space-y-3">
                <div className="w-12 h-12 rounded-2xl bg-purple-500/10 text-purple-400 flex items-center justify-center mx-auto">
                  <Sparkles className="w-6 h-6" />
                </div>
                <h4 className="text-sm font-bold text-white">No Freelancer Assignments Yet</h4>
                <p className="text-xs text-[#97A0B3] max-w-sm mx-auto">
                  Assign tasks to external video editors and designers to track WIP, review submitted cuts, and approve payouts.
                </p>
                <button
                  type="button"
                  onClick={() => setIsAssignPickerOpen(true)}
                  className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold cursor-pointer"
                >
                  Assign Freelancer Task Now
                </button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-[#2A3446] text-[#97A0B3] font-semibold text-[11px] uppercase tracking-wider">
                      <th className="py-3 px-3">Deliverable / Task</th>
                      <th className="py-3 px-3">Client</th>
                      <th className="py-3 px-3">Assigned Freelancer</th>
                      <th className="py-3 px-3">Process / Stage</th>
                      <th className="py-3 px-3">Milestone Fee</th>
                      <th className="py-3 px-3">Delivery SLA</th>
                      <th className="py-3 px-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#2A3446]/50">
                    {freelancerTasks.map((t) => (
                      <tr key={t.id} className="hover:bg-[#0B111C]/40 transition-colors">
                        <td className="py-3.5 px-3">
                          <div className="font-bold text-white">{t.title}</div>
                          <div className="text-[10px] text-[#7FA0D6] uppercase tracking-wider font-mono mt-0.5">
                            {t.type}
                          </div>
                        </td>
                        <td className="py-3.5 px-3">
                          <span className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-[#7FA0D6]/15 text-[#7FA0D6] border border-[#7FA0D6]/30">
                            {t.client}
                          </span>
                        </td>
                        <td className="py-3.5 px-3">
                          <div className="flex items-center gap-2">
                            <div className="w-6 h-6 rounded-full bg-gradient-to-tr from-purple-600 to-indigo-600 text-white font-bold text-[10px] flex items-center justify-center">
                              {t.avatar}
                            </div>
                            <div>
                              <div className="font-bold text-white">{t.assigneeName}</div>
                              <div className="text-[10px] text-[#97A0B3]">{t.freelancerSpecialty || "Specialist"}</div>
                            </div>
                          </div>
                        </td>
                        <td className="py-3.5 px-3">
                          {t.rawStatus === "in_production" ? (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold bg-blue-500/20 text-blue-300 border border-blue-500/30">
                              <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse" />
                              In Process (Editing)
                            </span>
                          ) : t.rawStatus === "internal_qa" || t.column === "under_review" ? (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                              <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                              Submitted for QA Review
                            </span>
                          ) : t.rawStatus === "ready_to_publish" || t.column === "approved" ? (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                              <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                              Approved &amp; Done
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold bg-slate-500/20 text-slate-300 border border-slate-500/30">
                              Pending Start
                            </span>
                          )}
                        </td>
                        <td className="py-3.5 px-3 font-mono font-bold text-emerald-400">
                          {t.milestoneFee ? `₹${t.milestoneFee.toLocaleString()}` : "Hourly"}
                        </td>
                        <td className="py-3.5 px-3 text-[#97A0B3] font-mono">
                          {t.due}
                        </td>
                        <td className="py-3.5 px-3 text-right">
                          <button
                            type="button"
                            onClick={() => setPreviewTask(t)}
                            className="px-2.5 py-1 rounded-lg bg-[#0B111C] hover:bg-purple-600/20 text-[#7FA0D6] hover:text-white border border-[#2A3446] transition-colors font-medium cursor-pointer"
                          >
                            Inspect Brief
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* Task Details & Progress Drawer / Modal */}
        {previewTask && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-md p-4 animate-fade-in overflow-y-auto"
            onClick={() => setPreviewTask(null)}
          >
            <div
              className="bg-[#161F2D] rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-4 border border-[#2A3446] text-white my-auto"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="flex items-start justify-between border-b border-[#2A3446] pb-3.5">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold text-[#7FA0D6] uppercase font-mono">
                      {previewTask.type || "Deliverable"}
                    </span>
                    <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${previewTask.priorityPill}`}>
                      {previewTask.priority}
                    </span>
                    {previewTask.isFreelancer && (
                      <span className="px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider bg-purple-500/20 text-purple-300 border border-purple-500/30 flex items-center gap-1">
                        <Sparkles className="w-2.5 h-2.5" /> Outsourced
                      </span>
                    )}
                  </div>
                  <h3 className="text-base font-black text-white mt-1">{previewTask.title}</h3>
                  <p className="text-xs text-[#97A0B3]">Client: <strong className="text-white">{previewTask.client}</strong></p>
                </div>
                <button
                  type="button"
                  onClick={() => setPreviewTask(null)}
                  className="p-1.5 rounded-xl text-[#97A0B3] hover:text-white hover:bg-[#0B111C] transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Progress Stepper */}
              <div className="bg-[#0B111C] p-3 rounded-2xl border border-[#2A3446]/60 space-y-2">
                <div className="text-[11px] font-bold text-[#97A0B3] uppercase tracking-wider">
                  Production Pipeline Stage
                </div>
                <div className="grid grid-cols-4 gap-1.5 text-center text-[10px] font-bold">
                  <div className={`p-1.5 rounded-xl border ${
                    previewTask.column === "todo" || previewTask.column === "in_progress" || previewTask.column === "under_review" || previewTask.column === "approved"
                      ? "bg-purple-600/20 text-purple-300 border-purple-500/40"
                      : "bg-[#161F2D] text-[#97A0B3] border-[#2A3446]"
                  }`}>
                    1. Queued
                  </div>
                  <div className={`p-1.5 rounded-xl border ${
                    previewTask.column === "in_progress" || previewTask.column === "under_review" || previewTask.column === "approved"
                      ? "bg-blue-600/20 text-blue-300 border-blue-500/40"
                      : "bg-[#161F2D] text-[#97A0B3] border-[#2A3446]"
                  }`}>
                    2. In Process
                  </div>
                  <div className={`p-1.5 rounded-xl border ${
                    previewTask.column === "under_review" || previewTask.column === "approved"
                      ? "bg-amber-600/20 text-amber-300 border-amber-500/40"
                      : "bg-[#161F2D] text-[#97A0B3] border-[#2A3446]"
                  }`}>
                    3. QA Review
                  </div>
                  <div className={`p-1.5 rounded-xl border ${
                    previewTask.column === "approved"
                      ? "bg-emerald-600/20 text-emerald-300 border-emerald-500/40"
                      : "bg-[#161F2D] text-[#97A0B3] border-[#2A3446]"
                  }`}>
                    4. Done
                  </div>
                </div>
              </div>

              {/* Personnel Block */}
              <div className="p-3.5 bg-[#0B111C] rounded-2xl border border-[#2A3446]/60 space-y-2 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-[#97A0B3]">Assigned To:</span>
                  <div className="flex items-center gap-1.5 font-bold text-white">
                    <div className={`w-5 h-5 rounded-full ${previewTask.avatarBg} text-white font-bold text-[9px] flex items-center justify-center`}>
                      {previewTask.avatar}
                    </div>
                    <span>{previewTask.assigneeName}</span>
                  </div>
                </div>
                {previewTask.isFreelancer && (
                  <>
                    <div className="flex items-center justify-between text-[#97A0B3]">
                      <span>Role &amp; Specialty:</span>
                      <span className="text-purple-300 font-medium">{previewTask.freelancerSpecialty || "Creative Specialist"}</span>
                    </div>
                    {previewTask.assigneeEmail && (
                      <div className="flex items-center justify-between text-[#97A0B3]">
                        <span>Contact Email:</span>
                        <span className="text-white font-mono text-[11px]">{previewTask.assigneeEmail}</span>
                      </div>
                    )}
                    {previewTask.milestoneFee && (
                      <div className="flex items-center justify-between text-[#97A0B3]">
                        <span>Agreed Compensation:</span>
                        <span className="text-emerald-400 font-bold font-mono">₹{previewTask.milestoneFee.toLocaleString()}</span>
                      </div>
                    )}
                  </>
                )}
                <div className="flex items-center justify-between text-[#97A0B3]">
                  <span>Delivery SLA Due:</span>
                  <span className="text-white font-mono">{previewTask.due}</span>
                </div>
              </div>

              {/* Technical Instructions & Brief */}
              {previewTask.instructions && (
                <div className="space-y-1.5">
                  <div className="text-[11px] font-bold text-[#97A0B3] uppercase tracking-wider">
                    Execution Instructions &amp; Brief
                  </div>
                  <div className="p-3 bg-[#0B111C] rounded-2xl border border-[#2A3446]/60 text-xs text-[#F1F5F9] whitespace-pre-wrap max-h-36 overflow-y-auto leading-relaxed">
                    {previewTask.instructions}
                  </div>
                </div>
              )}

              {/* Advance Stage Controls */}
              <div className="space-y-1.5 pt-2 border-t border-[#2A3446]">
                <div className="text-[11px] font-bold text-[#97A0B3] uppercase tracking-wider mb-2">
                  Update Stage / Advance Process
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    disabled={isAdvancingStage || previewTask.column === "in_progress"}
                    onClick={() => handleAdvanceStage(previewTask.id, "in_production")}
                    className="py-2 px-2 rounded-xl text-xs font-bold bg-blue-600/20 text-blue-300 hover:bg-blue-600 hover:text-white border border-blue-500/30 transition-all disabled:opacity-40 cursor-pointer"
                  >
                    In Process
                  </button>
                  <button
                    type="button"
                    disabled={isAdvancingStage || previewTask.column === "under_review"}
                    onClick={() => handleAdvanceStage(previewTask.id, "internal_qa")}
                    className="py-2 px-2 rounded-xl text-xs font-bold bg-amber-600/20 text-amber-300 hover:bg-amber-600 hover:text-white border border-amber-500/30 transition-all disabled:opacity-40 cursor-pointer"
                  >
                    Submit for QA
                  </button>
                  <button
                    type="button"
                    disabled={isAdvancingStage || previewTask.column === "approved"}
                    onClick={() => handleAdvanceStage(previewTask.id, "ready_to_publish")}
                    className="py-2 px-2 rounded-xl text-xs font-bold bg-emerald-600/20 text-emerald-300 hover:bg-emerald-600 hover:text-white border border-emerald-500/30 transition-all disabled:opacity-40 cursor-pointer"
                  >
                    Mark Done
                  </button>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setPreviewTask(null)}
                className="w-full py-2.5 rounded-xl text-xs font-bold text-white bg-[#0B111C] hover:bg-[#161F2D] border border-[#2A3446] cursor-pointer transition-colors"
              >
                Close Preview
              </button>
            </div>
          </div>
        )}

        {/* Quick Assign Freelancer Picker Modal */}
        {isAssignPickerOpen && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-fade-in"
            onClick={() => setIsAssignPickerOpen(false)}
          >
            <div
              className="bg-[#161F2D] rounded-3xl max-w-md w-full p-6 shadow-2xl border border-[#2A3446] space-y-4 text-white"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between border-b border-[#2A3446] pb-3">
                <div className="flex items-center gap-2">
                  <UserCheck className="w-4 h-4 text-purple-400" />
                  <h3 className="text-base font-bold text-white">Select Freelancer Specialist</h3>
                </div>
                <button
                  type="button"
                  onClick={() => setIsAssignPickerOpen(false)}
                  className="p-1 rounded-lg text-[#97A0B3] hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <p className="text-xs text-[#97A0B3]">
                Choose an active onboarded freelancer to assign deliverable instructions and agreed milestone fees:
              </p>

              <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                {freelancersList.length === 0 ? (
                  <div className="p-4 text-center text-xs text-[#97A0B3]">No active freelancers found.</div>
                ) : (
                  freelancersList.map((f: FreelancerProfileItem) => (
                    <div
                      key={f.id}
                      onClick={() => {
                        setIsAssignPickerOpen(false);
                        setAssignFreelancerTarget(f);
                      }}
                      className="p-3 rounded-2xl bg-[#0B111C] hover:bg-purple-950/40 border border-[#2A3446] hover:border-purple-500/50 cursor-pointer transition-all flex items-center justify-between group"
                    >
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-purple-600 to-indigo-600 text-white font-bold text-xs flex items-center justify-center">
                          {f.full_name.slice(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <div className="font-bold text-white text-xs group-hover:text-purple-300 transition-colors">
                            {f.full_name}
                          </div>
                          <div className="text-[10px] text-[#97A0B3]">{f.specialty || "Creative Specialist"}</div>
                        </div>
                      </div>
                      <span className="text-[11px] font-mono font-bold text-emerald-400">
                        {f.hourly_rate ? `₹${f.hourly_rate.toLocaleString()}/hr` : "Active"}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}

        {/* Modal: Full Freelancer Task Assignment Modal */}
        {assignFreelancerTarget && (
          <AdminAssignFreelancerModal
            isOpen={true}
            onClose={() => setAssignFreelancerTarget(null)}
            freelancer={assignFreelancerTarget}
            onSuccess={() => {
              refetchTasks();
              setToast(`Task successfully assigned to ${assignFreelancerTarget.full_name}!`);
            }}
          />
        )}

        {/* Create In-House Task Modal */}
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
                    className="w-full px-3.5 py-2 rounded-xl border border-[#2A3446] text-xs text-white bg-[#0B111C] focus:outline-none focus:border-purple-400"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 sm:gap-3">
                  <div>
                    <label className="block text-xs font-bold text-[#F1F5F9] mb-1">Client Brand</label>
                    <NativeSelect
                      value={newTaskForm.client}
                      onChange={(e) => setNewTaskForm({ ...newTaskForm, client: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl border border-[#2A3446] text-xs font-medium"
                    >
                      {clientOptions.filter((c) => c.value !== "all").length > 0 ? (
                        clientOptions
                          .filter((c) => c.value !== "all")
                          .map((c) => (
                            <option key={c.value} value={c.value}>
                              {c.label}
                            </option>
                          ))
                      ) : (
                        <option value="" disabled>No active clients</option>
                      )}
                    </NativeSelect>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-[#F1F5F9] mb-1">Creative Pod</label>
                    <NativeSelect
                      value={newTaskForm.pod}
                      onChange={(e) => setNewTaskForm({ ...newTaskForm, pod: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl border border-[#2A3446] text-xs font-medium"
                    >
                      <option value="Pod A">Pod A (Brand Strategy)</option>
                      <option value="Pod B">Pod B (Performance &amp; Video)</option>
                      <option value="Pod C">Pod C (3D Motion &amp; Design)</option>
                    </NativeSelect>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 sm:gap-3">
                  <div>
                    <label className="block text-xs font-bold text-[#F1F5F9] mb-1">Priority</label>
                    <NativeSelect
                      value={newTaskForm.priority}
                      onChange={(e) => setNewTaskForm({ ...newTaskForm, priority: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl border border-[#2A3446] text-xs font-medium"
                    >
                      <option value="Normal">Normal</option>
                      <option value="High">High</option>
                      <option value="Urgent">Urgent</option>
                    </NativeSelect>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-[#F1F5F9] mb-1">Story Points</label>
                    <input
                      type="number"
                      min="1"
                      max="20"
                      value={newTaskForm.sp}
                      onChange={(e) => setNewTaskForm({ ...newTaskForm, sp: Number(e.target.value) })}
                      className="w-full px-3 py-2 rounded-xl border border-[#2A3446] text-xs font-medium text-white bg-[#0B111C]"
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

      </main>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Subcomponent: Kanban Task Card with Freelancer Identification
// ─────────────────────────────────────────────────────────────────────────────
function TaskCard({ task, onSelect }: { task: any; onSelect: () => void }) {
  return (
    <div
      onClick={onSelect}
      className={`rounded-xl sm:rounded-2xl p-2.5 sm:p-3.5 border transition-all cursor-pointer shadow-xs hover:shadow-xl hover:-translate-y-0.5 flex flex-col justify-between gap-2 ${
        task.isFreelancer
          ? "bg-gradient-to-br from-[#181C2E] to-[#161F2D] border-purple-500/40 hover:border-purple-400"
          : "bg-[#161F2D] border-[#2A3446]/70 hover:border-[#7FA0D6]/60"
      }`}
    >
      <div className="space-y-1.5">
        <div className="flex items-center justify-between gap-1">
          <span className={`px-1.5 py-0.5 rounded-md text-[9px] sm:text-[10px] font-bold truncate max-w-[85px] sm:max-w-[120px] ${task.clientPill}`}>
            {task.client}
          </span>
          <div className="flex items-center gap-1 shrink-0">
            {task.isFreelancer && task.milestoneFee && (
              <span className="px-1.5 py-0.2 rounded text-[8.5px] sm:text-[9.5px] font-black bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                ₹{task.milestoneFee >= 1000 ? `${Math.round(task.milestoneFee / 1000)}k` : task.milestoneFee}
              </span>
            )}
            <span className={`px-1.5 py-0.5 rounded-md text-[8.5px] sm:text-[10px] font-bold ${task.priorityPill}`}>
              {task.priority}
            </span>
          </div>
        </div>

        <div>
          <h4 className="text-[11px] sm:text-xs font-bold text-white line-clamp-2 leading-snug">{task.title}</h4>
          {task.isFreelancer && (
            <div className="flex items-center gap-1 mt-0.5 text-[9px] sm:text-[10px] text-purple-300 font-medium">
              <Sparkles className="w-2.5 h-2.5 text-purple-400 shrink-0" />
              <span className="truncate">{task.freelancerSpecialty || "Outsourced"}</span>
            </div>
          )}
        </div>
      </div>

      <div className="flex items-center justify-between pt-1.5 border-t border-[#2A3446]/60 text-[10px] sm:text-[11px] text-[#97A0B3] mt-auto">
        <div className="flex items-center gap-1 min-w-0">
          <div className={`w-4 h-4 sm:w-5 sm:h-5 rounded-full ${task.avatarBg} text-white font-bold text-[8px] sm:text-[9px] flex items-center justify-center shrink-0`}>
            {task.avatar}
          </div>
          <span className="font-medium text-[#F1F5F9] truncate max-w-[65px] sm:max-w-[110px]">
            {task.assigneeName}
          </span>
          {task.isFreelancer && (
            <span className="px-1 py-0.2 rounded text-[7.5px] sm:text-[8px] font-black uppercase bg-purple-500/25 text-purple-300 border border-purple-500/30 shrink-0 hidden xs:inline">
              Ext
            </span>
          )}
        </div>
        <span className="font-mono text-[9px] sm:text-[10px] font-bold text-[#7FA0D6] shrink-0 ml-1">{task.due}</span>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 4. ADMIN CALENDAR PAGE
// ─────────────────────────────────────────────────────────────────────────────
export { AdminCalendarPage } from "./AdminCalendarPage";

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
  category: "lead" | "designer" | "editor" | "videographer" | "photographer" | "bde" | "sales";
  isLead?: boolean;
  email: string;
  handle: string;
  status: "Accepting Work" | "Fully Booked" | "On Leave" | "Sprint Ready" | "Pod Lead";
  statusColor: string;
  allocatedPct: number;
  projectsCount: number;
  capabilities: string[];
  avatarUrl?: string;
  isOnLeaveToday?: boolean;
}

export function AdminTeamManagementPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const confirm = useConfirm();
  const queryClient = useQueryClient();
  const [activePodId, setActivePodId] = useState<string | null>(null);
  const [roleCategoryFilter, setRoleCategoryFilter] = useState<string>("all");
  const [memberSort, setMemberSort] = useState<"default" | "workload" | "name">("default");
  const [memberSearchQuery, _setMemberSearchQuery] = useState(""); void _setMemberSearchQuery;
  const [isAddMemberOpen, setIsAddMemberOpen] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const initialTab =
    searchParams.get("tab") === "bde" ||
    (typeof window !== "undefined" && window.location.pathname.includes("bde"))
      ? "bde"
      : searchParams.get("tab") === "freelancers"
      ? "freelancers"
      : "internal";
  const [teamTab, setTeamTab] = useState<"internal" | "freelancers" | "bde">(initialTab);
  const [isAddFreelancerOpen, setIsAddFreelancerOpen] = useState(false);
  const [assignFreelancerTarget, setAssignFreelancerTarget] = useState<FreelancerProfileItem | null>(null);

  useEffect(() => {
    const tabParam = searchParams.get("tab");
    if (tabParam === "bde" && teamTab !== "bde") {
      setTeamTab("bde");
    } else if (tabParam === "freelancers" && teamTab !== "freelancers") {
      setTeamTab("freelancers");
    }
  }, [searchParams]);

  // ─── BDE SALES TEAM & ONBOARDING STATE ───────────────────────────
  const [isOnboardBdeOpen, setIsOnboardBdeOpen] = useState(false);
  const [bdeCredModalUser, setBdeCredModalUser] = useState<any | null>(null);
  const [bdeCredNewPassword, setBdeCredNewPassword] = useState("");
  const [bdeCredDispatchEmail, setBdeCredDispatchEmail] = useState("");
  const [bdeCredSendEmail, setBdeCredSendEmail] = useState(true);
  const [showCredPassword, setShowCredPassword] = useState(false);
  const [isUpdatingCreds, setIsUpdatingCreds] = useState(false);

  const [bdeForm, setBdeForm] = useState({
    full_name: "",
    email: "",
    dispatch_email: "",
    phone: "",
    designation: "Business Development Executive",
    monthly_quota: 2500000,
    commission_rate: 5.0,
    password: "",
    send_credentials_email: true,
  });
  const [showOnboardPassword, setShowOnboardPassword] = useState(false);
  const [isOnboardingBde, setIsOnboardingBde] = useState(false);
  const [bdeProvisionedCreds, setBdeProvisionedCreds] = useState<{
    email: string;
    password: string;
    full_name: string;
    email_dispatched: boolean;
    dispatch_email?: string;
  } | null>(null);
  const [bdeCopiedKey, setBdeCopiedKey] = useState<string | null>(null);

  const bdeTeamQuery = useQuery({
    queryKey: ["admin-bde-team-list"],
    queryFn: async () => {
      return await request<any[]>("/api/v1/admin/bde");
    },
    refetchOnMount: "always",
    staleTime: 0,
  });

  const handleOpenOnboardBde = () => {
    setBdeForm({
      full_name: "",
      email: "",
      dispatch_email: "",
      phone: "",
      designation: "Business Development Executive",
      monthly_quota: 2500000,
      commission_rate: 5.0,
      password: `Creo@${Math.floor(1000 + Math.random() * 9000)}!`,
      send_credentials_email: true,
    });
    setShowOnboardPassword(false);
    setIsOnboardBdeOpen(true);
  };

  const handleOnboardBdeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!bdeForm.full_name.trim() || !bdeForm.email.trim() || !bdeForm.password.trim()) {
      setToast("Please fill in Name, Email, and Password.");
      return;
    }
    setIsOnboardingBde(true);
    try {
      const res = await request<any>("/api/v1/admin/bde/onboard", {
        method: "POST",
        body: JSON.stringify({
          full_name: bdeForm.full_name.trim(),
          email: bdeForm.email.trim(),
          dispatch_email: bdeForm.dispatch_email.trim() || undefined,
          phone: bdeForm.phone.trim(),
          designation: bdeForm.designation.trim() || "Business Development Executive",
          monthly_quota: Number(bdeForm.monthly_quota) || 2500000,
          commission_rate: Number(bdeForm.commission_rate) || 5.0,
          password: bdeForm.password.trim(),
          send_credentials_email: bdeForm.send_credentials_email,
        }),
      });

      await bdeTeamQuery.refetch();
      setIsOnboardBdeOpen(false);
      setBdeProvisionedCreds({
        email: bdeForm.email.trim(),
        password: bdeForm.password.trim(),
        full_name: bdeForm.full_name.trim(),
        email_dispatched: res?.email_dispatched ?? false,
        dispatch_email: res?.dispatch_email || (bdeForm.dispatch_email.trim() || undefined),
      });
      setToast(
        `BDE ${bdeForm.full_name} onboarded! ${
          res?.email_dispatched
            ? `Credentials dispatched to ${res?.dispatch_email || bdeForm.dispatch_email.trim() || bdeForm.email.trim()}.`
            : "Credentials generated."
        }`
      );
    } catch (err: any) {
      setToast(err?.message || "Failed to onboard BDE.");
    } finally {
      setIsOnboardingBde(false);
    }
  };

  const handleOpenBdeCredModal = (bde: any) => {
    setBdeCredModalUser(bde);
    setBdeCredNewPassword(`Creo@${Math.floor(1000 + Math.random() * 9000)}!`);
    setBdeCredDispatchEmail("");
    setBdeCredSendEmail(true);
    setShowCredPassword(false);
  };

  const handleUpdateBdeCredentialsSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!bdeCredModalUser || !bdeCredNewPassword.trim()) {
      setToast("Please enter a new password.");
      return;
    }
    setIsUpdatingCreds(true);
    try {
      const res = await request<any>(`/api/v1/admin/bde/${bdeCredModalUser.id}/credentials`, {
        method: "PATCH",
        body: JSON.stringify({
          password: bdeCredNewPassword.trim(),
          dispatch_email: bdeCredDispatchEmail.trim() || undefined,
          send_credentials_email: bdeCredSendEmail,
        }),
      });
      setToast(
        `Credentials updated for ${bdeCredModalUser.full_name}! ${
          res?.email_dispatched
            ? `Credentials email sent to ${res?.dispatch_email || bdeCredDispatchEmail.trim() || bdeCredModalUser.email}.`
            : ""
        }`
      );
      setBdeCredModalUser(null);
      setBdeCredNewPassword("");
      setBdeCredDispatchEmail("");
    } catch (err: any) {
      setToast(err?.message || "Failed to update credentials.");
    } finally {
      setIsUpdatingCreds(false);
    }
  };

  const handleDeactivateBde = async (bdeOrId: any, fallbackName?: string) => {
    let bdeId: string;
    let bdeName: string;
    let bdeEmail: string | undefined;
    let bdeDesignation: string | undefined;

    if (typeof bdeOrId === "object" && bdeOrId !== null) {
      bdeId = bdeOrId.id;
      bdeName = bdeOrId.full_name || bdeOrId.name || fallbackName || bdeOrId.email || "BDE Specialist";
      bdeEmail = bdeOrId.email;
      bdeDesignation = bdeOrId.designation;
    } else {
      bdeId = String(bdeOrId);
      bdeName = fallbackName || "BDE Specialist";
    }

    const ok = await confirm({
      title: "Suspend BDE Access",
      description: `Are you sure you want to suspend/deactivate ${bdeName}'s access?`,
      details: [
        `Representative: ${bdeName}${bdeEmail ? ` (${bdeEmail})` : ""}`,
        bdeDesignation ? `Designation: ${bdeDesignation}` : "Role: Business Development Executive",
        "Active login sessions and JWT authentication tokens will be immediately revoked.",
        "The representative will be blocked from accessing leads until an administrator reactivates their account.",
      ],
      confirmText: "Suspend Access",
      cancelText: "Cancel",
      tone: "warning",
      icon: "warning",
    });
    if (!ok) return;

    try {
      await request<any>(`/api/v1/admin/bde/${bdeId}`, { method: "DELETE" });
      await queryClient.invalidateQueries({ queryKey: ["admin-bde-team-list"] });
      await bdeTeamQuery.refetch();
      setToast(`${bdeName}'s account has been suspended.`);
    } catch (err: any) {
      setToast(err?.message || "Failed to deactivate BDE.");
    }
  };

  const handleReactivateBde = async (bdeOrId: any, fallbackName?: string) => {
    let bdeId: string;
    let bdeName: string;

    if (typeof bdeOrId === "object" && bdeOrId !== null) {
      bdeId = bdeOrId.id;
      bdeName = bdeOrId.full_name || bdeOrId.name || fallbackName || bdeOrId.email || "BDE Specialist";
    } else {
      bdeId = String(bdeOrId);
      bdeName = fallbackName || "BDE Specialist";
    }

    try {
      await request<any>(`/api/v1/admin/bde/${bdeId}/reactivate`, { method: "POST" });
      await queryClient.invalidateQueries({ queryKey: ["admin-bde-team-list"] });
      await bdeTeamQuery.refetch();
      setToast(`${bdeName}'s account has been reactivated!`);
    } catch (err: any) {
      setToast(err?.message || "Failed to reactivate BDE.");
    }
  };

  const handleDeleteBdePermanent = async (bdeOrId: any, fallbackName?: string) => {
    let bdeId: string;
    let bdeName: string;
    let bdeEmail: string | undefined;

    if (typeof bdeOrId === "object" && bdeOrId !== null) {
      bdeId = bdeOrId.id;
      bdeName = bdeOrId.full_name || bdeOrId.name || fallbackName || bdeOrId.email || "BDE Specialist";
      bdeEmail = bdeOrId.email;
    } else {
      bdeId = String(bdeOrId);
      bdeName = fallbackName || "BDE Specialist";
    }

    const ok = await confirm({
      title: "Permanently Remove Worker",
      description: `Are you sure you want to permanently delete and remove ${bdeName} from Creo?`,
      details: [
        `Representative: ${bdeName}${bdeEmail ? ` (${bdeEmail})` : ""}`,
        "All associated quota targets and worker profile records will be permanently deleted.",
        "Any active leads will be unassigned and returned to the unassigned lead pool.",
        "Warning: This action cannot be undone.",
      ],
      confirmText: "Remove Worker",
      cancelText: "Cancel",
      tone: "danger",
      icon: "trash",
    });
    if (!ok) return;

    try {
      await request<any>(`/api/v1/admin/bde/${bdeId}?permanent=true`, { method: "DELETE" });
      await queryClient.invalidateQueries({ queryKey: ["admin-bde-team-list"] });
      await bdeTeamQuery.refetch();
      setToast(`${bdeName} has been permanently removed from Creo.`);
    } catch (err: any) {
      setToast(err?.message || "Failed to remove worker.");
    }
  };

  const freelancersQuery = useQuery({
    queryKey: ["admin-freelancers-list"],
    queryFn: () => fetchFreelancers(),
    refetchOnMount: "always",
    staleTime: 0,
  });

  const handleToggleFreelancerStatus = async (
    freelancerId: string,
    newStatus: "ACTIVE" | "INACTIVE" | "REVOKED"
  ) => {
    try {
      await updateFreelancerStatus(freelancerId, newStatus);
      await freelancersQuery.refetch();
      setToast(`Freelancer status updated to ${newStatus}`);
    } catch (err: any) {
      setToast(err?.message || "Failed to update freelancer status");
    }
  };

  const { data: queueData } = useQuery({
    queryKey: ["admin_queue"],
    queryFn: () => fetchAdminQueue(),
  });

  const { data: podData } = useQuery({
    queryKey: ["admin_pod_dashboard", activePodId],
    queryFn: () => fetchPodDashboard(activePodId || undefined),
  });

  const [pods, setPods] = useState<any[]>([]);
  const [membersList, setMembersList] = useState<TeamMember[]>([]);

  useEffect(() => {
    if (queueData?.staff && queueData.staff.length > 0) {
      const mapped = queueData.staff.map((s, idx) => {
        const email = (s.email || "").toLowerCase();
        const role = (s.role || "").toLowerCase();
        const dept = (s.department || "").toLowerCase();

        let podId = "pod-a";
        if (email.includes(".alpha") || email.includes("vikram") || email.includes("kabali") || email.includes("elena")) {
          podId = "pod-a";
        } else if (email.includes(".beta") || email.includes("sarah") || email.includes("rajini") || email.includes("chloe") || email === "lead@creo.agency") {
          podId = "pod-b";
        } else if (email.includes(".gamma") || email.includes("rohan") || email.includes("tanvi") || email.includes("arjun")) {
          podId = "pod-c";
        } else if (email.includes("bde") || email.includes("sales") || role === "sales" || role === "bde" || dept === "sales") {
          podId = "pod-bde";
        } else if (s.team_name) {
          const tn = s.team_name.toLowerCase();
          if (tn.includes("b")) podId = "pod-b";
          else if (tn.includes("c")) podId = "pod-c";
          else podId = "pod-a";
        } else {
          podId = idx % 3 === 0 ? "pod-a" : idx % 3 === 1 ? "pod-b" : "pod-c";
        }

        const isSales = role === "sales" || role === "bde" || dept === "sales" || email.includes("bde");
        const isLead = !isSales && (role === "team_lead" || (dept === "creative" && (s.full_name?.toLowerCase().includes("lead") ?? false)));
        const isDesigner = !isSales && (role === "designer" || dept === "design" || email.includes("designer"));
        const isEditor = !isSales && (role === "editor" || dept === "video" || email.includes("editor"));
        const category: TeamMember["category"] = isSales ? "bde" : isLead ? "lead" : isDesigner ? "designer" : "editor";

        const isOnLeave = Boolean(s.on_leave_today);
        const status: TeamMember["status"] = isOnLeave
          ? "On Leave"
          : isLead
          ? "Pod Lead"
          : s.is_accepting_work
          ? "Accepting Work"
          : "Fully Booked";

        const statusColor = isOnLeave
          ? "bg-amber-500/15 text-amber-300 border-amber-500/30"
          : isLead
          ? "bg-blue-500/15 text-[#7FA0D6] border-blue-500/30"
          : s.is_accepting_work
          ? "bg-emerald-500/15 text-emerald-300 border-emerald-500/30"
          : "bg-rose-500/15 text-rose-300 border-rose-500/30";

        const roleTitle = isSales
          ? "BDE Specialist & Growth Lead"
          : isLead
          ? "Pod Team Lead & Director"
          : isDesigner
          ? "Graphic Designer"
          : isEditor
          ? "Video Editor"
          : (s.department ? `${s.department.toUpperCase()} Specialist` : "Creative Specialist");

        return {
          id: s.user_id || `staff-${idx}`,
          podId,
          name: String(s.full_name || (s.email ? s.email.split("@")[0] : "Team Member")),
          role: roleTitle,
          category,
          isLead,
          email: s.email || "staff@creo.agency",
          handle: String(s.email ? `@${s.email.split("@")[0]}` : "@member"),
          status,
          statusColor,
          allocatedPct: Math.min(100, Math.round((s.active_wip / Math.max(1, s.daily_capacity)) * 100)),
          projectsCount: s.active_wip,
          capabilities: s.skills && s.skills.length > 0
            ? s.skills
            : isSales
            ? ["Client Acquisition", "Outbound Lead Gen", "Pipeline Closing", "B2B Onboarding"]
            : ["Creative Design", "Content Operations"],
          isOnLeaveToday: isOnLeave,
        };
      });
      setMembersList(mapped);
    }
  }, [queueData]);

  useEffect(() => {
    const rawPods = podData?.available_pods || [];
    const basePods = (rawPods.length > 0 ? rawPods : [
      { id: "pod-alpha", key: "alpha", letter: "A", name: "Pod Alpha", lead_name: "Vikram Malhotra", color: "bg-blue-600", textColor: "text-blue-500", badgeColor: "bg-blue-500/15 text-[#7FA0D6]" },
      { id: "pod-beta", key: "beta", letter: "B", name: "Pod Beta", lead_name: "Sarah Connor", color: "bg-[#0EA5E9]", textColor: "text-sky-400", badgeColor: "bg-sky-500/15 text-sky-300" },
      { id: "pod-gamma", key: "gamma", letter: "C", name: "Pod Gamma", lead_name: "Rohan Mehta", color: "bg-[#6366F1]", textColor: "text-indigo-400", badgeColor: "bg-indigo-500/15 text-indigo-300" },
    ]).map((p: any) => {
      const isCurrent = p.id === (podData?.pod?.id || activePodId);
      const stats = isCurrent && podData?.pod?.stats ? podData.pod.stats : null;
      const normalizedPodId = p.letter.toLowerCase() === "a" ? "pod-a" : p.letter.toLowerCase() === "b" ? "pod-b" : "pod-c";
      const podMembers = membersList.filter((m) => m.podId === normalizedPodId);
      const onLeaveCount = podMembers.filter((m) => m.status === "On Leave").length;
      const presentCount = podMembers.length - onLeaveCount;

      return {
        id: normalizedPodId,
        rawId: p.id,
        name: p.name,
        letter: p.letter,
        lead: p.lead_name || (normalizedPodId === "pod-a" ? "Vikram Malhotra" : normalizedPodId === "pod-b" ? "Sarah Connor" : "Rohan Mehta"),
        leadRole: "Pod Lead & Creative Director",
        membersCount: podMembers.length || 3,
        presentCount: podMembers.length > 0 ? presentCount : 3,
        onLeaveCount,
        onLeaveMembers: podMembers.filter((m) => m.status === "On Leave"),
        velocityPct: stats?.sla_compliance_pct ?? 100,
        tasksClosed: stats?.completed ?? (normalizedPodId === "pod-a" ? 28 : normalizedPodId === "pod-b" ? 22 : 19),
        pendingReview: stats?.internal_qa ?? 0,
        allocatedHours: podMembers.reduce((acc, m) => acc + Math.round((m.allocatedPct / 100) * 40), 0),
        totalHours: (podMembers.length || 3) * 40,
        color: p.color || (normalizedPodId === "pod-a" ? "bg-blue-600" : normalizedPodId === "pod-b" ? "bg-sky-600" : "bg-indigo-600"),
        textColor: p.textColor || "text-blue-500",
        pillBg: p.badgeColor || "bg-blue-500/15 text-[#7FA0D6]",
        squadLoad: stats?.total_wip ? Math.min(100, stats.total_wip * 15) : Math.round(podMembers.reduce((acc, m) => acc + m.allocatedPct, 0) / (podMembers.length || 1)),
        activeEngagements: stats?.active_clients_count ?? (normalizedPodId === "pod-a" ? 5 : normalizedPodId === "pod-b" ? 4 : 3),
        readyReview: stats?.internal_qa ?? 0,
        description: `${p.name} dedicated creative pod: Lead, Video Editor, and Graphic Designer.`,
      };
    });

    const bdeMembers = membersList.filter((m) => m.podId === "pod-bde" || m.category === "bde");
    if (bdeMembers.length > 0) {
      const bdeOnLeave = bdeMembers.filter((m) => m.status === "On Leave");
      basePods.push({
        id: "pod-bde",
        rawId: "pod-bde",
        name: "Sales & BDE Outreach",
        letter: "S",
        lead: bdeMembers[0]?.name || "Alex Carter",
        leadRole: "BDE Specialist & Growth Lead",
        membersCount: bdeMembers.length,
        presentCount: bdeMembers.length - bdeOnLeave.length,
        onLeaveCount: bdeOnLeave.length,
        onLeaveMembers: bdeOnLeave,
        velocityPct: 100,
        tasksClosed: 14,
        pendingReview: 1,
        allocatedHours: 25,
        totalHours: 40,
        color: "bg-amber-600",
        textColor: "text-amber-500",
        pillBg: "bg-amber-500/15 text-amber-300",
        squadLoad: 40,
        activeEngagements: 4,
        readyReview: 0,
        description: "Dedicated business development, outbound client acquisition, and growth strategy squad.",
      });
    }

    setPods(basePods);
  }, [podData, activePodId, membersList]);

  const activePod = pods.find((p) => p.id === activePodId);

  // Filter members based on activePod, attendance filter, and role category filter
  const filteredMembers = membersList.filter((m) => {
    const matchesPod = !activePodId || m.podId === activePodId;

    let matchesCategory = true;
    if (roleCategoryFilter === "designer") matchesCategory = m.category === "designer";
    else if (roleCategoryFilter === "editor") matchesCategory = m.category === "editor";
    else if (roleCategoryFilter === "videographer") matchesCategory = m.category === "videographer";
    else if (roleCategoryFilter === "photographer") matchesCategory = m.category === "photographer";
    else if (roleCategoryFilter === "lead") matchesCategory = m.category === "lead";
    else if (roleCategoryFilter === "bde" || roleCategoryFilter === "sales") matchesCategory = m.category === "bde";
    else if (roleCategoryFilter === "accepting") matchesCategory = m.status === "Accepting Work";
    else if (roleCategoryFilter === "present") matchesCategory = m.status !== "On Leave";
    else if (roleCategoryFilter === "leave") matchesCategory = m.status === "On Leave";

    let matchesSearch = true;
    if (memberSearchQuery.trim()) {
      const q = memberSearchQuery.toLowerCase().trim();
      const squadName =
        m.podId === "pod-a"
          ? "pod alpha"
          : m.podId === "pod-b"
          ? "pod beta"
          : m.podId === "pod-c"
          ? "pod gamma"
          : "sales & bde";
      matchesSearch =
        m.name.toLowerCase().includes(q) ||
        m.role.toLowerCase().includes(q) ||
        m.email.toLowerCase().includes(q) ||
        squadName.includes(q);
    }

    return matchesPod && matchesCategory && matchesSearch;
  });

  const getRoleIcon = (cat: string) => {
    switch (cat) {
      case "lead":
        return <UserCog className="w-3.5 h-3.5 text-[#7FA0D6]" />;
      case "designer":
        return <Palette className="w-3.5 h-3.5 text-purple-400" />;
      case "editor":
        return <Scissors className="w-3.5 h-3.5 text-blue-400" />;
      case "videographer":
        return <Video className="w-3.5 h-3.5 text-rose-400" />;
      case "photographer":
        return <Camera className="w-3.5 h-3.5 text-emerald-400" />;
      case "bde":
      case "sales":
        return <Briefcase className="w-3.5 h-3.5 text-amber-400" />;
      default:
        return <Users className="w-3.5 h-3.5 text-[#F1F5F9]" />;
    }
  };

  const generateStrongPassword = () => `Creo@${Math.floor(1000 + Math.random() * 9000)}!`;

  const [assignModalMember, setAssignModalMember] = useState<TeamMember | null>(null);
  const [scheduleModalMember, setScheduleModalMember] = useState<TeamMember | null>(null);
  const [assignForm, setAssignForm] = useState({
    taskTitle: "",
    client: "",
    priority: "Normal",
    allocationIncrease: 15,
    deadline: "",
    brief: "",
  });
  const [newMemberForm, setNewMemberForm] = useState({
    name: "",
    email: "",
    dispatch_email: "",
    send_email: true,
    password: generateStrongPassword(),
    handle: "",
    role: "Senior Visual Designer",
    category: "designer" as TeamMember["category"],
    podId: "pod-a",
    capabilities: "Figma Tokens, Design Systems, Branding",
  });
  const [showNewMemberPassword, setShowNewMemberPassword] = useState(false);
  const [isCreatingMember, setIsCreatingMember] = useState(false);

  // Modal to display provisioned credentials with 1-click copy
  const [provisionedCredentials, setProvisionedCredentials] = useState<{
    name: string;
    email: string;
    password: string;
    role: string;
    podName: string;
    dispatchEmail?: string;
  } | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // Manage / Give / Reset credentials for existing team member
  const [credentialModalMember, setCredentialModalMember] = useState<TeamMember | null>(null);
  const [credentialForm, setCredentialForm] = useState({
    email: "",
    password: "",
    dispatch_email: "",
    send_email: true,
  });
  const [showCredentialPassword, setShowCredentialPassword] = useState(false);
  const [isUpdatingCredentials, setIsUpdatingCredentials] = useState(false);

  const [successPopup, setSuccessPopup] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    type?: "success" | "info";
  } | null>(null);

  const handleCreateTeamMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMemberForm.name.trim()) return;

    const chosenPassword = newMemberForm.password.trim() || generateStrongPassword();
    const finalEmail = newMemberForm.email.trim() || `${newMemberForm.name.toLowerCase().replace(/\s+/g, ".")}@creo.agency`;
    const targetPodId = newMemberForm.podId || activePodId || "pod-a";
    const targetPodName = pods.find((p) => p.id === targetPodId)?.name || "Sprint Pod";

    const roleTitle = newMemberForm.role.trim() || (
      newMemberForm.category === "designer" ? "Senior Visual Designer" :
      newMemberForm.category === "editor" ? "Lead Video Editor" :
      newMemberForm.category === "bde" ? "Business Development Executive (BDE)" :
      newMemberForm.category === "videographer" ? "Lead Cinematographer & Videographer" :
      newMemberForm.category === "photographer" ? "Commercial Photographer" :
      "Squad Lead & Creative Strategist"
    );

    const capsArray = newMemberForm.capabilities.trim()
      ? newMemberForm.capabilities.split(",").map((c) => c.trim()).filter(Boolean)
      : ["Design Systems", "Client Deliverables", "Multimodal Sprint"];

    let backendRole = "editor";
    let backendDept = "creative";
    if (newMemberForm.category === "designer") {
      backendRole = "designer";
      backendDept = "design";
    } else if (newMemberForm.category === "editor") {
      backendRole = "editor";
      backendDept = "video";
    } else if (newMemberForm.category === "bde" || newMemberForm.category === "sales") {
      backendRole = "sales";
      backendDept = "sales";
    } else if (newMemberForm.category === "lead") {
      backendRole = "team_lead";
      backendDept = "lead";
    }

    setIsCreatingMember(true);
    let createdUserId = `m-${Date.now()}`;
    let provisionedPass = chosenPassword;

    try {
      const resp = await request<{
        id: string;
        email: string;
        dispatch_email?: string;
        credentials?: { email: string; password: string };
      }>("/api/v1/admin/teams", {
        method: "POST",
        body: JSON.stringify({
          full_name: newMemberForm.name.trim(),
          email: finalEmail,
          password: chosenPassword,
          role: backendRole,
          department: backendDept,
          daily_capacity: 4,
          skills: capsArray,
          dispatch_email: newMemberForm.dispatch_email.trim() || undefined,
          send_email: newMemberForm.send_email,
        }),
      });
      if (resp?.id) createdUserId = resp.id;
      if (resp?.credentials?.password) provisionedPass = resp.credentials.password;
    } catch (err: any) {
      console.warn("Backend /admin/teams call response:", err);
      if (err?.message && (err.message.includes("already exists") || err.message.includes("Conflict"))) {
        setToast(err.message);
        setIsCreatingMember(false);
        return;
      }
    } finally {
      setIsCreatingMember(false);
    }

    const newMember: TeamMember = {
      id: createdUserId,
      podId: targetPodId,
      name: newMemberForm.name.trim(),
      role: roleTitle,
      category: newMemberForm.category,
      email: finalEmail,
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

    const savedDispatchEmail = newMemberForm.dispatch_email.trim();

    setIsAddMemberOpen(false);
    setNewMemberForm({
      name: "",
      email: "",
      dispatch_email: "",
      send_email: true,
      password: generateStrongPassword(),
      handle: "",
      role: "Senior Visual Designer",
      category: "designer",
      podId: activePodId || "pod-a",
      capabilities: "Figma Tokens, Design Systems, Branding",
    });

    setProvisionedCredentials({
      name: newMember.name,
      email: finalEmail,
      password: provisionedPass,
      role: roleTitle,
      podName: targetPodName,
      dispatchEmail: savedDispatchEmail || undefined,
    });
  };

  const handleOpenCredentialModal = (member: TeamMember) => {
    setCredentialModalMember(member);
    setCredentialForm({
      email: member.email,
      password: generateStrongPassword(),
      dispatch_email: "",
      send_email: true,
    });
    setShowCredentialPassword(false);
  };

  const handleUpdateCredentials = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!credentialModalMember) return;
    if (!credentialForm.password.trim() || credentialForm.password.length < 6) {
      setToast("Password must be at least 6 characters.");
      return;
    }

    setIsUpdatingCredentials(true);
    const updatedEmail = credentialForm.email.trim();
    const updatedPass = credentialForm.password.trim();

    try {
      const res = await request<{ status: string; dispatch_email?: string; email_delivered?: boolean }>(
        `/api/v1/admin/teams/${credentialModalMember.id}/credentials`,
        {
          method: "PATCH",
          body: JSON.stringify({
            email: updatedEmail,
            password: updatedPass,
            dispatch_email: credentialForm.dispatch_email.trim() || undefined,
            send_email: credentialForm.send_email,
          }),
        }
      );

      setMembersList((prev) =>
        prev.map((m) =>
          m.id === credentialModalMember.id
            ? { ...m, email: updatedEmail }
            : m
        )
      );

      const targetName = credentialModalMember.name;
      const targetRole = credentialModalMember.role;
      const targetPod = pods.find((p) => p.id === credentialModalMember.podId)?.name || "Sprint Pod";
      const targetDispatch = res?.dispatch_email || (credentialForm.dispatch_email.trim() || undefined);
      setCredentialModalMember(null);

      setProvisionedCredentials({
        name: targetName,
        email: updatedEmail,
        password: updatedPass,
        role: targetRole,
        podName: targetPod,
        dispatchEmail: targetDispatch,
      });
      setToast(
        `Credentials updated for ${targetName}${
          targetDispatch ? ` (Dispatched to ${targetDispatch})` : ""
        }`
      );
    } catch (err: any) {
      setToast(err?.message || "Failed to update credentials");
    } finally {
      setIsUpdatingCredentials(false);
    }
  };

  const handleOpenAssignModal = (member: TeamMember) => {
    setAssignModalMember(member);
    setAssignForm({
      taskTitle: `Sprint Deliverables for ${member.name.split(" ")[0]}`,
      client: "",
      priority: "Normal",
      allocationIncrease: member.allocatedPct >= 80 ? 10 : 15,
      deadline: "",
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

      <main className="flex-1 px-3 sm:px-6 lg:px-10 pt-4 sm:pt-8 pb-16 max-w-[1500px] w-full mx-auto space-y-4 sm:space-y-6">
        {toast && (
          <div className="p-3.5 sm:p-4 bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs font-bold rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 shadow-sm animate-fade-in">
            <div className="flex items-center gap-2.5 min-w-0">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span className="break-all">{toast}</span>
            </div>
            <button
              onClick={() => setToast(null)}
              className="self-end sm:self-auto text-emerald-300 hover:text-emerald-100 font-bold px-2 py-0.5 rounded-md hover:bg-emerald-500/20 transition-colors shrink-0 text-xs"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* Network & Role Switcher */}
        <div className="w-full grid grid-cols-3 sm:flex sm:w-auto items-center gap-1 sm:gap-2 border-b border-[#2A3446] pb-3">
          <button
            type="button"
            onClick={() => setTeamTab("internal")}
            className={`w-full sm:w-auto px-1.5 sm:px-4 py-2 rounded-xl text-[11px] sm:text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1 sm:gap-2 text-center truncate ${
              teamTab === "internal"
                ? "bg-[#7FA0D6] text-white shadow-md"
                : "text-[#97A0B3] hover:text-white hover:bg-[#161F2D]"
            }`}
          >
            <Users className="w-3.5 h-3.5 shrink-0 hidden min-[360px]:block" />
            <span className="truncate">
              <span className="hidden sm:inline">Internal Sprint Pods</span>
              <span className="sm:hidden">Internal</span>
            </span>
          </button>
          <button
            type="button"
            onClick={() => {
              setTeamTab("bde");
              bdeTeamQuery.refetch();
            }}
            className={`w-full sm:w-auto px-1.5 sm:px-4 py-2 rounded-xl text-[11px] sm:text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1 sm:gap-2 text-center truncate ${
              teamTab === "bde"
                ? "bg-amber-600 text-white shadow-md shadow-amber-600/25"
                : "text-[#97A0B3] hover:text-white hover:bg-[#161F2D]"
            }`}
          >
            <Briefcase className="w-3.5 h-3.5 shrink-0 hidden min-[360px]:block" />
            <span className="truncate">
              <span className="hidden sm:inline">BDE Sales Team & Onboarding</span>
              <span className="sm:hidden">BDE Sales</span>
            </span>
          </button>
          <button
            type="button"
            onClick={() => {
              setTeamTab("freelancers");
              freelancersQuery.refetch();
            }}
            className={`w-full sm:w-auto px-1.5 sm:px-4 py-2 rounded-xl text-[11px] sm:text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1 sm:gap-2 text-center truncate ${
              teamTab === "freelancers"
                ? "bg-purple-600 text-white shadow-md"
                : "text-[#97A0B3] hover:text-white hover:bg-[#161F2D]"
            }`}
          >
            <Sparkles className="w-3.5 h-3.5 shrink-0 hidden min-[360px]:block" />
            <span className="truncate">
              <span className="hidden sm:inline">Freelancer Network & Role Access</span>
              <span className="sm:hidden">Freelance</span>
            </span>
          </button>
        </div>

        {teamTab === "bde" ? (
          <div className="space-y-6">
            <div className="flex items-center justify-between sm:justify-end gap-2.5 w-full">
              <button
                type="button"
                onClick={() => bdeTeamQuery.refetch()}
                disabled={bdeTeamQuery.isFetching}
                className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-1.5 px-3.5 py-2.5 rounded-xl border border-[#2A3446] bg-[#161F2D] hover:bg-[#2A3446] text-white text-xs font-bold transition-all cursor-pointer disabled:opacity-60"
                title="Refresh BDE Roster"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${bdeTeamQuery.isFetching ? "animate-spin text-amber-400" : "text-[#97A0B3]"}`} />
                <span>Refresh</span>
              </button>
              <button
                type="button"
                onClick={handleOpenOnboardBde}
                className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white text-xs font-bold shadow-md shadow-amber-500/20 cursor-pointer transition-all shrink-0"
              >
                <UserCheck className="w-4 h-4" /> <span>Onboard BDE</span>
              </button>
            </div>

            {(() => {
              const bdeList = bdeTeamQuery.data || [];
              const activeCount = bdeList.filter((b) => b.is_active !== false).length;
              const totalQuota = bdeList.reduce((acc, b) => acc + (b.monthly_quota || 0), 0);
              const totalClosed = bdeList.reduce((acc, b) => acc + (b.closed_revenue || 0), 0);
              const totalPipeline = bdeList.reduce((acc, b) => acc + (b.active_pipeline || 0), 0);
              const totalWon = bdeList.reduce((acc, b) => acc + (b.deals_won || 0), 0);
              const totalLeads = bdeList.reduce((acc, b) => acc + (b.total_leads || 0), 0);
              const overallWinRate = totalLeads > 0 ? Math.round((totalWon / totalLeads) * 100) : 0;

              return (
                <div className="hidden md:grid sm:grid-cols-2 lg:grid-cols-4 gap-3.5 sm:gap-6">
                  <div className="bg-[#161F2D] rounded-3xl p-5 border-2 border-[#161F2D] hover:border-amber-500/30 transition-all shadow-xl flex flex-col justify-between">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-[10px] font-extrabold text-[#97A0B3] uppercase tracking-wider">
                        BDE SALES ROSTER
                      </span>
                      <div className="w-8 h-8 rounded-2xl bg-amber-500/15 text-amber-400 flex items-center justify-center">
                        <Users className="w-4 h-4" />
                      </div>
                    </div>
                    <div className="flex items-baseline gap-2">
                      <span className="text-2xl font-black text-white">{bdeList.length} Reps</span>
                      <span className="text-xs font-semibold text-emerald-400">{activeCount} Active</span>
                    </div>
                    <div className="mt-3 pt-3 border-t border-[#2A3446] text-xs font-bold text-amber-400 flex items-center gap-1">
                      <Briefcase className="w-3.5 h-3.5" /> High-velocity pipeline
                    </div>
                  </div>

                  <div className="bg-[#161F2D] rounded-3xl p-5 border-2 border-[#161F2D] hover:border-emerald-500/30 transition-all shadow-xl flex flex-col justify-between">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-[10px] font-extrabold text-[#97A0B3] uppercase tracking-wider">
                        TOTAL CLOSED REVENUE
                      </span>
                      <div className="w-8 h-8 rounded-2xl bg-emerald-500/15 text-emerald-400 flex items-center justify-center">
                        <IndianRupee className="w-4 h-4" />
                      </div>
                    </div>
                    <div className="flex items-baseline gap-2">
                      <span className="text-2xl font-black text-emerald-400">
                        ₹{(totalClosed / 100000).toFixed(1)}L
                      </span>
                      <span className="text-xs text-[#97A0B3]">of ₹{(totalQuota / 100000).toFixed(1)}L target</span>
                    </div>
                    <div className="mt-3 pt-3 border-t border-[#2A3446] text-xs font-bold text-emerald-400 flex items-center gap-1">
                      <TrendingUp className="w-3.5 h-3.5" /> Won client deals
                    </div>
                  </div>

                  <div className="bg-[#161F2D] rounded-3xl p-5 border-2 border-[#161F2D] hover:border-blue-500/30 transition-all shadow-xl flex flex-col justify-between">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-[10px] font-extrabold text-[#97A0B3] uppercase tracking-wider">
                        ACTIVE PIPELINE
                      </span>
                      <div className="w-8 h-8 rounded-2xl bg-blue-500/15 text-blue-400 flex items-center justify-center">
                        <TrendingUp className="w-3.5 h-3.5" />
                      </div>
                    </div>
                    <div className="flex items-baseline gap-2">
                      <span className="text-2xl font-black text-blue-400">
                        ₹{(totalPipeline / 100000).toFixed(1)}L
                      </span>
                      <span className="text-xs text-[#97A0B3]">in negotiation</span>
                    </div>
                    <div className="mt-3 pt-3 border-t border-[#2A3446] text-xs font-bold text-blue-400 flex items-center gap-1">
                      <Sparkles className="w-3.5 h-3.5" /> Active proposals
                    </div>
                  </div>

                  <div className="bg-[#161F2D] rounded-3xl p-5 border-2 border-[#161F2D] hover:border-purple-500/30 transition-all shadow-xl flex flex-col justify-between">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-[10px] font-extrabold text-[#97A0B3] uppercase tracking-wider">
                        CONVERSION & DEALS
                      </span>
                      <div className="w-8 h-8 rounded-2xl bg-purple-500/15 text-purple-400 flex items-center justify-center">
                        <CheckCircle2 className="w-4 h-4" />
                      </div>
                    </div>
                    <div className="flex items-baseline gap-2">
                      <span className="text-2xl font-black text-purple-400">{overallWinRate}%</span>
                      <span className="text-xs text-[#97A0B3]">{totalWon} / {totalLeads} won</span>
                    </div>
                    <div className="mt-3 pt-3 border-t border-[#2A3446] text-xs font-bold text-purple-400 flex items-center gap-1">
                      <Check className="w-3.5 h-3.5" /> High close velocity
                    </div>
                  </div>
                </div>
              );
            })()}

            {bdeTeamQuery.isLoading ? (
              <div className="p-12 text-center text-xs text-[#97A0B3] animate-pulse">
                Loading BDE sales roster...
              </div>
            ) : !bdeTeamQuery.data || bdeTeamQuery.data.length === 0 ? (
              <div className="p-12 bg-[#161F2D] rounded-3xl border border-[#2A3446] text-center space-y-3">
                <Briefcase className="w-10 h-10 text-amber-400 mx-auto opacity-70" />
                <h4 className="text-sm font-bold text-white">No BDE Sales Representatives Yet</h4>
                <p className="text-xs text-[#97A0B3] max-w-md mx-auto">
                  Onboard your first Business Development Executive to start assigning revenue quotas, tracking client outreach, and provisioning logins.
                </p>
                <button
                  type="button"
                  onClick={handleOpenOnboardBde}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold transition-all shadow-md shadow-amber-600/20 cursor-pointer"
                >
                  <UserCheck className="w-4 h-4" /> Onboard First BDE
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {bdeTeamQuery.data.map((bde: any) => {
                  const quota = bde.monthly_quota || 2500000;
                  const closed = bde.closed_revenue || 0;
                  const achievedPct = Math.min(100, Math.round((closed / Math.max(1, quota)) * 100));
                  const isBdeActive =
                    bde.is_active === true ||
                    (bde.account_status ? bde.account_status.toLowerCase() === "active" : bde.status === "Active");

                  return (
                    <div
                      key={bde.id}
                      className={`bg-[#161F2D] rounded-3xl p-5 border transition-all flex flex-col justify-between space-y-4 shadow-xl ${
                        isBdeActive
                          ? "border-[#2A3446] hover:border-amber-500/40"
                          : "border-rose-500/30 bg-gradient-to-b from-[#161F2D] to-rose-950/15"
                      }`}
                    >
                      <div>
                        <div className="flex items-start justify-between gap-3 mb-3">
                          <div className="flex items-center gap-3 min-w-0">
                            <div className={`w-11 h-11 rounded-2xl text-white font-black text-sm flex items-center justify-center shrink-0 shadow-md ${
                              isBdeActive
                                ? "bg-gradient-to-br from-amber-500 to-amber-700 shadow-amber-500/20"
                                : "bg-gradient-to-br from-rose-600 to-slate-800 shadow-rose-500/20"
                            }`}>
                              {(bde.full_name || bde.name || "BDE")
                                .split(" ")
                                .map((n: string) => n[0])
                                .slice(0, 2)
                                .join("")}
                            </div>
                            <div className="min-w-0">
                              <h4 className="text-sm font-black text-white truncate flex items-center gap-1.5">
                                <span>{bde.full_name || bde.name || "BDE Specialist"}</span>
                              </h4>
                              <p className="text-[11px] text-[#97A0B3] font-medium truncate">{bde.email}</p>
                              {bde.phone && (
                                <p className="text-[10px] text-amber-400 font-semibold">{bde.phone}</p>
                              )}
                            </div>
                          </div>
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider shrink-0 border ${
                              isBdeActive
                                ? "bg-emerald-500/15 text-emerald-300 border-emerald-500/30"
                                : "bg-rose-500/15 text-rose-300 border-rose-500/30"
                            }`}
                          >
                            {isBdeActive ? "Active BDE" : "Suspended"}
                          </span>
                        </div>

                        <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#0B111C] border border-[#2A3446] text-[11px] text-amber-300 font-semibold mb-3">
                          <Briefcase className="w-3 h-3 text-amber-400 shrink-0" />
                          <span className="truncate">{bde.designation || "Business Development Executive"}</span>
                        </div>

                        <div className="space-y-1.5 bg-[#0B111C]/60 p-3 rounded-2xl border border-[#2A3446]/60">
                          <div className="flex items-center justify-between text-xs">
                            <span className="text-[#97A0B3] font-bold text-[10px] uppercase tracking-wider">
                              Target Quota: ₹{(quota / 100000).toFixed(1)}L
                            </span>
                            <span className="text-white font-black text-[11px]">
                              ₹{(closed / 100000).toFixed(1)}L ({achievedPct}%)
                            </span>
                          </div>
                          <div className="w-full h-2 rounded-full bg-[#161F2D] overflow-hidden">
                            <div
                              className="h-full rounded-full bg-gradient-to-r from-amber-500 to-emerald-500 transition-all duration-500"
                              style={{ width: `${achievedPct}%` }}
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-4 gap-2 mt-3 text-center">
                          <div className="bg-[#0B111C]/40 p-2 rounded-xl border border-[#2A3446]/50">
                            <span className="block text-[9px] text-[#97A0B3] font-bold uppercase">Leads</span>
                            <span className="text-xs font-black text-white">{bde.total_leads || 0}</span>
                          </div>
                          <div className="bg-[#0B111C]/40 p-2 rounded-xl border border-[#2A3446]/50">
                            <span className="block text-[9px] text-[#97A0B3] font-bold uppercase">Won</span>
                            <span className="text-xs font-black text-emerald-400">{bde.deals_won || 0}</span>
                          </div>
                          <div className="bg-[#0B111C]/40 p-2 rounded-xl border border-[#2A3446]/50">
                            <span className="block text-[9px] text-[#97A0B3] font-bold uppercase">Win Rate</span>
                            <span className="text-xs font-black text-amber-300">{bde.conversion_rate || 0}%</span>
                          </div>
                          <div className="bg-[#0B111C]/40 p-2 rounded-xl border border-[#2A3446]/50">
                            <span className="block text-[9px] text-[#97A0B3] font-bold uppercase">Comm.</span>
                            <span className="text-xs font-black text-purple-300">{bde.commission_rate || 5}%</span>
                          </div>
                        </div>
                      </div>

                      <div className="pt-3 border-t border-[#2A3446] flex items-center justify-between gap-2">
                        <button
                          type="button"
                          onClick={() => handleOpenBdeCredModal(bde)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#0B111C] hover:bg-amber-500/20 border border-[#2A3446] hover:border-amber-500/40 text-amber-300 text-xs font-bold transition-all cursor-pointer"
                          title="Change password and optionally send mail"
                        >
                          <KeyRound className="w-3.5 h-3.5 text-amber-400" />
                          <span>Password & Mail</span>
                        </button>

                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => navigate("/slack")}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-[#0B111C] hover:bg-[#2A3446] border border-[#2A3446] text-white text-xs font-bold transition-all cursor-pointer"
                            title="Open Slack Chat"
                          >
                            <MessageSquare className="w-3.5 h-3.5 text-[#7FA0D6]" />
                            <span>Chat</span>
                          </button>

                          {isBdeActive ? (
                            <button
                              type="button"
                              onClick={() => handleDeactivateBde(bde, bde.full_name || bde.name)}
                              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-amber-300 text-xs font-bold transition-all cursor-pointer"
                              title="Suspend BDE Access"
                            >
                              <UserX className="w-3.5 h-3.5" />
                              <span>Suspend</span>
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() => handleReactivateBde(bde, bde.full_name || bde.name)}
                              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/30 text-emerald-300 text-xs font-bold transition-all cursor-pointer"
                              title="Reactivate BDE Account"
                            >
                              <RotateCcw className="w-3.5 h-3.5" />
                              <span>Reactivate</span>
                            </button>
                          )}

                          <button
                            type="button"
                            onClick={() => handleDeleteBdePermanent(bde, bde.full_name || bde.name)}
                            className="p-1.5 rounded-xl text-rose-400 hover:text-rose-200 hover:bg-rose-500/20 border border-transparent hover:border-rose-500/30 transition-all cursor-pointer"
                            title="Permanently remove worker from team"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        ) : teamTab === "freelancers" ? (
          <div className="space-y-6">
            <div className="flex items-center justify-between sm:justify-end gap-2.5 w-full">
              <button
                type="button"
                onClick={() => freelancersQuery.refetch()}
                disabled={freelancersQuery.isFetching}
                className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-1.5 px-3.5 py-2.5 rounded-xl border border-[#2A3446] bg-[#161F2D] hover:bg-[#2A3446] text-white text-xs font-bold transition-all cursor-pointer disabled:opacity-60"
                title="Refresh Freelancer Roster"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${freelancersQuery.isFetching ? "animate-spin text-purple-400" : "text-[#97A0B3]"}`} />
                <span>Refresh</span>
              </button>
              <button
                type="button"
                onClick={() => setIsAddFreelancerOpen(true)}
                className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold shadow-md shadow-purple-500/20 cursor-pointer transition-all shrink-0"
              >
                <Plus className="w-4 h-4" /> <span>Onboard Freelancer</span>
              </button>
            </div>

            <div className="p-3 sm:p-3.5 bg-purple-950/40 border border-purple-500/35 rounded-2xl flex items-start gap-2.5 text-xs text-[#F1F5F9] leading-relaxed shadow-sm">
              <ShieldCheck className="w-4 h-4 text-purple-400 shrink-0 mt-0.5" />
              <div>
                <strong className="text-white font-bold">Role-Based Security Boundary:</strong> Freelancer accounts are strictly isolated. They cannot access client billing records, agency financials, team member personal data, or unrelated client project repositories.
              </div>
            </div>

            {(() => {
              const list = freelancersQuery.data || [];
              const activeCount = list.filter((f) => f.status === "ACTIVE").length;
              const totalAssigned = list.reduce((acc, f) => acc + (f.assigned_tasks_count || 0), 0);
              const totalActive = list.reduce((acc, f) => acc + (f.active_tasks_count || 0), 0);

              return (
                <div className="hidden md:grid md:grid-cols-3 gap-3.5 sm:gap-6">
                  <div className="bg-[#161F2D] rounded-3xl p-6 border-2 border-[#161F2D] hover:border-purple-500/30 transition-all shadow-xl flex flex-col justify-between">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-[10px] font-extrabold text-[#97A0B3] uppercase tracking-wider">
                        FREELANCER ROSTER
                      </span>
                      <div className="w-9 h-9 rounded-2xl bg-purple-500/15 text-purple-400 flex items-center justify-center">
                        <Users className="w-5 h-5" />
                      </div>
                    </div>
                    <div className="flex items-baseline gap-2">
                      <span className="text-3xl font-black text-white tracking-tight">{list.length} Specialists</span>
                      <span className="text-xs font-semibold text-emerald-400">{activeCount} Active</span>
                    </div>
                    <div className="mt-4 pt-3 border-t border-[#2A3446] text-xs font-bold text-purple-400 flex items-center gap-1">
                      <Sparkles className="w-3.5 h-3.5" /> On-demand outsourced capacity
                    </div>
                  </div>

                  <div className="bg-[#161F2D] rounded-3xl p-6 border-2 border-[#161F2D] hover:border-purple-500/30 transition-all shadow-xl flex flex-col justify-between">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-[10px] font-extrabold text-[#97A0B3] uppercase tracking-wider">
                        ACTIVE ASSIGNMENTS
                      </span>
                      <div className="w-9 h-9 rounded-2xl bg-blue-500/15 text-blue-400 flex items-center justify-center">
                        <CheckSquare className="w-5 h-5" />
                      </div>
                    </div>
                    <div className="flex items-baseline gap-2">
                      <span className="text-3xl font-black text-white tracking-tight">{totalActive} Deliverables</span>
                      <span className="text-xs font-semibold text-[#97A0B3]">in production</span>
                    </div>
                    <div className="mt-4 pt-3 border-t border-[#2A3446] text-xs font-medium text-[#97A0B3] flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5 text-blue-400" /> {totalAssigned} Total assignments logged
                    </div>
                  </div>

                  <div className="bg-[#161F2D] rounded-3xl p-6 border-2 border-[#161F2D] hover:border-purple-500/30 transition-all shadow-xl flex flex-col justify-between">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-[10px] font-extrabold text-[#97A0B3] uppercase tracking-wider">
                        ACCESS ENFORCEMENT
                      </span>
                      <div className="w-9 h-9 rounded-2xl bg-emerald-500/15 text-emerald-400 flex items-center justify-center">
                        <Lock className="w-5 h-5" />
                      </div>
                    </div>
                    <div className="flex items-baseline gap-2">
                      <span className="text-3xl font-black text-emerald-400 tracking-tight">100% Isolated</span>
                    </div>
                    <div className="mt-4 pt-3 border-t border-[#2A3446] text-xs font-bold text-emerald-400 flex items-center gap-1">
                      <ShieldCheck className="w-3.5 h-3.5" /> Zero financial / admin leakage
                    </div>
                  </div>
                </div>
              );
            })()}

            {freelancersQuery.isLoading ? (
              <div className="text-center py-12 text-sm text-[#97A0B3] flex items-center justify-center gap-2">
                <RefreshCw className="w-4 h-4 text-purple-400 animate-spin" />
                <span>Loading freelancer roster...</span>
              </div>
            ) : freelancersQuery.isError ? (
              <div className="bg-[#161F2D] rounded-3xl p-8 text-center border border-rose-500/30 space-y-3">
                <AlertCircle className="w-10 h-10 text-rose-400 mx-auto" />
                <h4 className="text-base font-bold text-white">Failed to Load Freelancer Network</h4>
                <p className="text-xs text-rose-300 max-w-sm mx-auto">
                  {(freelancersQuery.error as any)?.message || "An error occurred while fetching the freelancer roster."}
                </p>
                <button
                  type="button"
                  onClick={() => freelancersQuery.refetch()}
                  className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold cursor-pointer"
                >
                  Retry Loading
                </button>
              </div>
            ) : !freelancersQuery.data || freelancersQuery.data.length === 0 ? (
              <div className="bg-[#161F2D] rounded-3xl p-12 text-center border border-[#2A3446] space-y-3">
                <Users className="w-10 h-10 text-[#97A0B3] mx-auto opacity-40" />
                <h4 className="text-base font-bold text-white">No Freelancers Registered Yet</h4>
                <p className="text-xs text-[#97A0B3] max-w-sm mx-auto">
                  Click "Onboard Freelancer" above to invite an external video editor or graphic designer with individual credentials.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {freelancersQuery.data.map((freelancer) => (
                  <div
                    key={freelancer.id}
                    className="bg-[#161F2D] rounded-3xl p-5 sm:p-6 border border-[#2A3446] hover:border-purple-500/40 transition-all shadow-lg flex flex-col justify-between space-y-4"
                  >
                    <div className="space-y-3">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-11 h-11 rounded-2xl bg-[#0B111C] border border-[#2A3446] text-purple-400 font-black text-base flex items-center justify-center">
                            {freelancer.full_name
                              .split(" ")
                              .map((n) => n[0])
                              .join("")
                              .slice(0, 2)
                              .toUpperCase()}
                          </div>
                          <div>
                            <h4 className="font-bold text-sm text-white">{freelancer.full_name}</h4>
                            <span className="text-[11px] text-[#97A0B3] block truncate max-w-[180px]">
                              {freelancer.email}
                            </span>
                          </div>
                        </div>

                        <span
                          className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider border ${
                            freelancer.status === "ACTIVE"
                              ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/30"
                              : freelancer.status === "REVOKED"
                              ? "bg-rose-500/15 text-rose-400 border-rose-500/30"
                              : "bg-amber-500/15 text-amber-400 border-amber-500/30"
                          }`}
                        >
                          {freelancer.status}
                        </span>
                      </div>

                      <div className="p-3 bg-[#0B111C] rounded-2xl space-y-1.5 text-xs text-[#F1F5F9] border border-[#2A3446]">
                        <div className="flex justify-between">
                          <span className="text-[#97A0B3]">Specialty:</span>
                          <span className="font-bold text-white">{freelancer.specialty || "Creative Specialist"}</span>
                        </div>
                        {freelancer.hourly_rate ? (
                          <div className="flex justify-between">
                            <span className="text-[#97A0B3]">Agreed Rate:</span>
                            <span className="font-bold text-purple-300">₹{freelancer.hourly_rate.toLocaleString()}/hr</span>
                          </div>
                        ) : null}
                        <div className="flex justify-between">
                          <span className="text-[#97A0B3]">Assigned Tasks:</span>
                          <span className="font-bold text-white">
                            {freelancer.active_tasks_count} active / {freelancer.assigned_tasks_count} total
                          </span>
                        </div>
                      </div>

                      {freelancer.skills && freelancer.skills.length > 0 && (
                        <div className="flex flex-wrap gap-1">
                          {freelancer.skills.map((skill, i) => (
                            <span
                              key={i}
                              className="px-2 py-0.5 rounded-lg bg-[#0B111C] border border-[#2A3446] text-[10px] text-purple-300 font-medium"
                            >
                              {skill}
                            </span>
                          ))}
                        </div>
                      )}

                      {freelancer.portfolio_link && (
                        <a
                          href={freelancer.portfolio_link}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 text-[11px] text-purple-400 hover:text-purple-300 font-bold hover:underline"
                        >
                          <ExternalLink className="w-3 h-3" /> View Portfolio
                        </a>
                      )}
                    </div>

                    <div className="pt-3 border-t border-[#2A3446] flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5">
                        <CustomSelect
                          size="sm"
                          value={freelancer.status}
                          onChange={(val) =>
                            handleToggleFreelancerStatus(
                              freelancer.id,
                              val as "ACTIVE" | "INACTIVE" | "REVOKED"
                            )
                          }
                          ariaLabel="Freelancer status"
                          options={[
                            { value: "ACTIVE", label: "Active" },
                            { value: "INACTIVE", label: "Deactivate" },
                            { value: "REVOKED", label: "Revoke Access" },
                          ]}
                        />
                      </div>

                      <button
                        type="button"
                        onClick={() => setAssignFreelancerTarget(freelancer)}
                        className="px-3 py-1 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold shadow-md cursor-pointer transition-all flex items-center gap-1"
                      >
                        <Send className="w-3 h-3" /> Assign Task
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : (
        /* ─────────────────────────────────────────────────────────────────────────────
            VIEW 1: MAIN TEAM DETAILS & MANAGEMENT OVERVIEW (Matching Screenshot 1)
        ───────────────────────────────────────────────────────────────────────────── */
        !activePodId ? (
          <div className="space-y-6">
            {/* Top Controls Bar */}
            <div className="flex items-center justify-between sm:justify-end gap-2.5 w-full">
              <Link
                to="/admin/leaves"
                className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-[#161F2D] hover:bg-[#2A3446] border border-[#2A3446] text-white text-xs font-bold transition-all shadow-sm"
              >
                <Plane className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                <span>Leave Management</span>
              </Link>
              <button
                type="button"
                onClick={() => setIsAddMemberOpen(true)}
                className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-[#7FA0D6] hover:bg-blue-600 text-white text-xs font-bold shadow-md shadow-blue-500/20 cursor-pointer transition-all shrink-0"
              >
                <Plus className="w-4 h-4 shrink-0" /> <span>Add Team Member</span>
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
                <div className="hidden md:grid md:grid-cols-3 gap-3.5 sm:gap-6">
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
                      <span className="text-xs font-semibold text-[#97A0B3]">across {totalMembersCount} specialists</span>
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
                      <div className="w-9 h-9 rounded-2xl bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 flex items-center justify-center">
                        <Zap className="w-5 h-5" />
                      </div>
                    </div>
                    <div className="flex items-baseline gap-2">
                      <span className="text-3xl font-black text-white tracking-tight">{avgCapacityPct}%</span>
                      <span className="text-xs font-semibold text-[#97A0B3]">optimal bandwidth</span>
                    </div>
                    <div className="mt-4 pt-3 border-t border-[#2A3446] flex items-center gap-2">
                      <div className="flex-1 bg-[#0B111C] rounded-full h-2 overflow-hidden border border-[#2A3446]">
                        <div className="bg-emerald-500 h-full rounded-full" style={{ width: `${avgCapacityPct}%` }} />
                      </div>
                      <span className="text-xs font-bold text-emerald-400">
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
                      <div className="w-9 h-9 rounded-2xl bg-sky-500/15 text-sky-400 border border-sky-500/30 flex items-center justify-center">
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

            {/* Team Pods Section */}
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-2">
                <div>
                  <h3 className="text-base sm:text-lg font-bold text-white tracking-tight">Team Pods & Operational Squads</h3>
                </div>
                <span className="self-start sm:self-auto px-2.5 sm:px-3 py-1 rounded-full text-[11px] sm:text-xs font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" /> Sprint Cycle 08 • 4 Days Remaining
                </span>
              </div>

              {/* Pod Cards Grid: Responsive 1-column on mobile, 2-column on desktop - perfect alignment with zero clipping */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 sm:gap-6 w-full">
                {pods.map((pod) => (
                  <div
                    key={pod.id}
                    onClick={() => setActivePodId(pod.id)}
                    className="w-full min-w-0 bg-[#161F2D] rounded-2xl sm:rounded-3xl p-4 sm:p-6 border border-[#2A3446] shadow-[0_4px_25px_rgba(0,0,0,0.04)] space-y-3.5 sm:space-y-5 hover:shadow-xl hover:border-[#7FA0D6]/40 transition-all cursor-pointer group relative overflow-hidden"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2.5 sm:gap-3 min-w-0 flex-1">
                        <div className={`w-10 h-10 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl ${pod.color} text-white font-black text-base sm:text-lg flex items-center justify-center shadow-md group-hover:scale-105 transition-transform shrink-0`}>
                          {pod.letter}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
                            <h4 className="font-bold text-sm sm:text-base text-white truncate">{pod.name}</h4>
                            <span className="px-2 py-0.5 rounded-full bg-[#0B111C] text-[#F1F5F9] border border-[#2A3446] text-[9.5px] sm:text-[10px] font-bold shrink-0">
                              {pod.id === "pod-bde" ? "Outreach Squad" : "Creative Pod"}
                            </span>
                          </div>
                          <p className="text-[11px] sm:text-xs text-[#97A0B3] truncate">{pod.description}</p>
                        </div>
                      </div>

                      {/* Live Presence / On Leave Badge */}
                      {pod.onLeaveCount > 0 ? (
                        <span className="px-2 sm:px-2.5 py-0.5 sm:py-1 rounded-full text-[9.5px] sm:text-[10px] font-extrabold bg-amber-500/15 text-amber-300 border border-amber-500/30 flex items-center gap-1 shadow-xs shrink-0">
                          <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
                          <span>{pod.onLeaveCount} Leave</span>
                        </span>
                      ) : (
                        <span className="px-2 sm:px-2.5 py-0.5 sm:py-1 rounded-full text-[9.5px] sm:text-[10px] font-extrabold bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 flex items-center gap-1 shadow-xs shrink-0">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                          <span>{pod.membersCount} Present</span>
                        </span>
                      )}
                    </div>

                    {/* Lead Info & Member Stack */}
                    <div className="p-2.5 sm:p-3.5 bg-[#0B111C]/70 rounded-xl sm:rounded-2xl flex items-center justify-between gap-2 border border-[#2A3446]">
                      <div className="flex items-center gap-2 min-w-0 flex-1">
                        <div className={`w-7 h-7 sm:w-8 sm:h-8 rounded-full ${pod.color} text-white font-bold text-xs flex items-center justify-center shrink-0`}>
                          {pod.lead[0]}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="text-xs font-bold text-white truncate">{pod.lead}</div>
                          <div className="text-[10px] text-[#97A0B3] font-medium truncate">{pod.leadRole}</div>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 text-xs font-bold text-[#F1F5F9] shrink-0">
                        <span className="text-[11px] sm:text-xs">{pod.presentCount}/{pod.membersCount} Active</span>
                        {pod.onLeaveCount > 0 && (
                          <span className="text-[9.5px] px-1.5 py-0.5 rounded-md bg-amber-500/20 text-amber-300 border border-amber-500/30 font-bold shrink-0">
                            {pod.onLeaveCount} away
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Velocity Bar */}
                    <div className="space-y-1.5 sm:space-y-2 text-xs">
                      <div className="flex justify-between items-center text-[#F1F5F9] font-semibold text-[11px] sm:text-xs">
                        <span>Sprint Velocity</span>
                        <span className="font-bold text-white">{pod.velocityPct}% on track</span>
                      </div>
                      <div className="w-full bg-[#0B111C] rounded-full h-2 sm:h-2.5 overflow-hidden border border-[#2A3446]">
                        <div className={`h-full rounded-full ${pod.color}`} style={{ width: `${pod.velocityPct}%` }} />
                      </div>
                      <div className="flex justify-between text-[10.5px] sm:text-[11px] text-[#97A0B3] font-medium pt-0.5">
                        <span>{pod.tasksClosed} tasks closed</span>
                        <span className="text-[#7FA0D6] font-bold">{pod.pendingReview} pending review</span>
                      </div>
                    </div>

                    {/* Card Footer Action */}
                    <div className="pt-2.5 sm:pt-3 border-t border-[#2A3446] flex items-center justify-between text-xs gap-2">
                      <span className="text-[#97A0B3] font-medium text-[10.5px] sm:text-[11px] truncate">
                        Allocated: <strong className="text-white">{pod.allocatedHours}h / {pod.totalHours}h</strong>
                      </span>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setActivePodId(pod.id);
                        }}
                        className="px-2.5 sm:px-3 py-1.5 rounded-xl bg-[#7FA0D6]/15 hover:bg-[#7FA0D6]/25 border border-[#7FA0D6]/35 text-[#BCCCE6] hover:text-white text-xs font-bold transition-all inline-flex items-center gap-1 sm:gap-1.5 cursor-pointer shadow-xs active:scale-95 group/btn shrink-0"
                      >
                        <Users className="w-3.5 h-3.5 text-[#7FA0D6]" />
                        <span className="hidden xs:inline">View Pod Members ({pod.membersCount})</span>
                        <span className="xs:hidden">Members ({pod.membersCount})</span>
                        <ArrowRight className="w-3.5 h-3.5 text-[#7FA0D6] group-hover/btn:translate-x-0.5 transition-transform" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : (
          /* ─────────────────────────────────────────────────────────────────────────────
              VIEW 2: DEDICATED POD MEMBER DIRECTORY SUB-PAGE (Matching Screenshot 2)
          ───────────────────────────────────────────────────────────────────────────── */
          <div className="space-y-6">
            {/* Top Breadcrumb & Action Controls */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-1.5 sm:gap-2 text-xs font-bold text-[#97A0B3] flex-wrap">
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

            {/* Pod Summary Banner Card */}
            <div className="bg-[#161F2D] rounded-3xl p-5 sm:p-6 lg:p-8 border border-[#2A3446] shadow-xl space-y-5 sm:space-y-6">
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5 sm:gap-6">
                <div className="space-y-3.5 max-w-3xl flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="px-3 py-1 rounded-full bg-[#7FA0D6] text-[#0B111C] font-black text-xs uppercase tracking-wider shadow-xs">
                      {activePod?.name}
                    </span>
                    <span className="px-3 py-1 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 font-bold text-xs flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                      High Velocity
                    </span>
                  </div>

                  <p className="text-xs text-[#BCCCE6] leading-relaxed font-medium">
                    {activePod?.description}
                  </p>

                  {/* Clean 3-column stats with responsive card pills on mobile & vertical dividers on desktop */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-4 pt-3 border-t border-[#2A3446]/60">
                    <div className="p-2.5 sm:p-0 rounded-xl sm:rounded-none bg-[#0B111C]/60 sm:bg-transparent border border-[#2A3446]/40 sm:border-0 flex flex-col justify-center">
                      <span className="text-[10px] uppercase text-[#97A0B3] font-extrabold tracking-wider">POD LEAD</span>
                      <span className="text-white font-bold text-xs sm:text-sm truncate">{activePod?.lead}</span>
                    </div>

                    <div className="p-2.5 sm:p-0 rounded-xl sm:rounded-none bg-[#0B111C]/60 sm:bg-transparent border border-[#2A3446]/40 sm:border-0 sm:border-l sm:border-[#2A3446] sm:pl-4 flex flex-col justify-center">
                      <span className="text-[10px] uppercase text-[#97A0B3] font-extrabold tracking-wider">MEMBERS</span>
                      <span className="text-white font-bold text-xs sm:text-sm">
                        {filteredMembers.length} Members ({activePod?.presentCount ?? filteredMembers.filter(m => m.status !== "On Leave").length} Present{activePod?.onLeaveCount ? `, ${activePod.onLeaveCount} away` : ""})
                      </span>
                    </div>

                    <div className="p-2.5 sm:p-0 rounded-xl sm:rounded-none bg-[#0B111C]/60 sm:bg-transparent border border-[#2A3446]/40 sm:border-0 sm:border-l sm:border-[#2A3446] sm:pl-4 flex flex-col justify-center">
                      <span className="text-[10px] uppercase text-[#97A0B3] font-extrabold tracking-wider">VELOCITY</span>
                      <span className="text-emerald-400 font-bold text-xs sm:text-sm">{activePod?.velocityPct}% Sprint Delivery</span>
                    </div>
                  </div>
                </div>

                {/* Right Side Stats: 2 balanced equal-width cards */}
                <div className="grid grid-cols-2 gap-2.5 sm:gap-4 w-full lg:w-auto border-t lg:border-t-0 lg:border-l border-[#2A3446] pt-4 lg:pt-0 lg:pl-6 shrink-0">
                  <div className="bg-[#0B111C] p-3 sm:p-4 rounded-2xl border border-[#2A3446] w-full min-w-0 flex flex-col justify-between space-y-1.5 shadow-xs">
                    <span className="text-[10px] font-bold text-[#97A0B3] uppercase tracking-wider block truncate">AVG SQUAD LOAD</span>
                    <div className="text-xl sm:text-2xl font-black text-white">{activePod?.squadLoad}%</div>
                    <span className="text-[10px] text-emerald-400 font-bold block truncate">↓ Optimal</span>
                  </div>

                  <div className="bg-[#0B111C] p-3 sm:p-4 rounded-2xl border border-[#2A3446] w-full min-w-0 flex flex-col justify-between space-y-1.5 shadow-xs">
                    <span className="text-[10px] font-bold text-[#97A0B3] uppercase tracking-wider block truncate">ACTIVE SPRINT</span>
                    <div className="flex items-baseline gap-1.5 text-white">
                      <span className="text-xl sm:text-2xl font-black">{activePod?.activeEngagements}</span>
                      <span className="text-xs font-bold text-[#97A0B3]">projects</span>
                    </div>
                    <span className="text-[10px] text-[#7FA0D6] font-bold block truncate">{activePod?.readyReview} in review</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Role Category & Attendance Filter Tabs */}
            <div className="bg-[#161F2D] rounded-2xl border border-[#2A3446] p-3 sm:p-4 shadow-sm space-y-3.5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                {/* Filter Pills with horizontal scroll on mobile */}
                <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-1 -mx-1 px-1 sm:mx-0 sm:px-0 flex-nowrap sm:flex-wrap">
                  {[
                    { key: "all", label: `All Members (${membersList.filter((m) => !activePodId || m.podId === activePodId).length})` },
                    { key: "present", label: `Present Today (${membersList.filter((m) => (!activePodId || m.podId === activePodId) && m.status !== "On Leave").length})` },
                    { key: "leave", label: `On Leave (${membersList.filter((m) => (!activePodId || m.podId === activePodId) && m.status === "On Leave").length})` },
                    { key: "lead", label: "Leads" },
                    { key: "designer", label: "Designers" },
                    { key: "editor", label: "Editors" },
                    { key: "bde", label: "BDE / Sales" },
                  ].map((tab) => (
                    <button
                      key={tab.key}
                      type="button"
                      onClick={() => setRoleCategoryFilter(tab.key)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap shrink-0 ${
                        roleCategoryFilter === tab.key
                          ? "bg-[#7FA0D6] text-[#0B111C] font-extrabold shadow-xs"
                          : "text-[#BCCCE6] hover:text-white bg-[#0B111C] border border-[#2A3446] hover:bg-[#1E293B]"
                      }`}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>

                <button
                  type="button"
                  onClick={() => setIsAddMemberOpen(true)}
                  className="w-full sm:w-auto justify-center px-3.5 py-2.5 sm:py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-sm cursor-pointer transition-all active:scale-95 shrink-0"
                >
                  <Plus className="w-4 h-4 shrink-0" /> Add Member to {activePod?.name}
                </button>
              </div>

              {/* Roster Counter */}
              <div className="flex items-center justify-between text-xs text-[#97A0B3] font-semibold border-t border-[#2A3446] pt-3">
                <span>Showing {filteredMembers.length} members assigned to {activePod?.name}</span>
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setMemberSort((current) => (current === "default" ? "workload" : current === "workload" ? "name" : "default"))}
                    className="hover:text-[#F1F5F9] flex items-center gap-1 cursor-pointer"
                  >
                    <SlidersHorizontal className="w-3.5 h-3.5" /> Sort: {memberSort === "default" ? "Default" : memberSort === "workload" ? "Workload" : "Name"}
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
              {[...filteredMembers]
                .sort((a, b) =>
                  memberSort === "workload"
                    ? b.allocatedPct - a.allocatedPct
                    : memberSort === "name"
                    ? a.name.localeCompare(b.name)
                    : 0,
                )
                .map((member) => (
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
                          <span
                            className={`absolute -bottom-1 -right-1 w-3.5 h-3.5 rounded-full ring-2 ring-[#161F2D] ${
                              member.status === "On Leave" ? "bg-amber-400" : "bg-emerald-500"
                            }`}
                            title={member.status === "On Leave" ? "On Approved Leave Today" : "Present & Active"}
                          />
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
                            className="px-2.5 py-1 rounded-lg bg-[#0B111C] text-[#F1F5F9] text-[10px] font-bold border border-[#2A3446]"
                          >
                            {cap}
                          </span>
                        ))}
                      </div>
                    </div>

                    {/* Attendance Status Row */}
                    <div className="flex items-center justify-between text-xs pt-1 border-t border-[#2A3446]/60">
                      <span className="text-[#97A0B3] text-[10px] font-bold uppercase tracking-wider">Attendance:</span>
                      <span className={`text-[11px] font-bold flex items-center gap-1 ${
                        member.status === "On Leave" ? "text-amber-300" : "text-emerald-400"
                      }`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${member.status === "On Leave" ? "bg-amber-400 animate-pulse" : "bg-emerald-400"}`} />
                        {member.status === "On Leave" ? "On Approved Leave" : "In Office / Present"}
                      </span>
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
                      <div className="w-full bg-[#0B111C] rounded-full h-2 overflow-hidden border border-[#2A3446]">
                        <div
                          className={`h-full rounded-full ${
                            member.allocatedPct >= 90 ? "bg-rose-500" : member.allocatedPct >= 70 ? "bg-blue-600" : "bg-emerald-500"
                          }`}
                          style={{ width: `${member.allocatedPct}%` }}
                        />
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-xs font-bold pt-1">
                      {member.status === "On Leave" ? (
                        <span className="text-amber-400 flex items-center gap-1.5 text-[11px]">
                          <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" /> On Leave Today
                        </span>
                      ) : member.status === "Fully Booked" ? (
                        <span className="text-rose-400 flex items-center gap-1 text-[11px]">
                          ● At Max Capacity
                        </span>
                      ) : (
                        <span className="text-emerald-400 flex items-center gap-1 text-[11px]">
                          ● Sprint Ready
                        </span>
                      )}
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => handleOpenCredentialModal(member)}
                          title="Assign or reset login credentials"
                          className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#0B111C] hover:bg-[#7FA0D6]/20 border border-[#2A3446] hover:border-[#7FA0D6]/50 text-[#7FA0D6] text-[11px] font-bold cursor-pointer transition-colors"
                        >
                          <KeyRound className="size-3" />
                          <span>Credentials</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            if (member.allocatedPct >= 90 || member.status === "On Leave") {
                              handleOpenScheduleModal(member);
                            } else {
                              handleOpenAssignModal(member);
                            }
                          }}
                          className="text-[#7FA0D6] hover:text-blue-300 hover:underline cursor-pointer text-[11px] font-bold"
                        >
                          {member.status === "On Leave" ? "View Leave / Schedule" : member.allocatedPct >= 90 ? "View Schedule" : "Assign Work"}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )
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

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 sm:gap-3">
                  <div>
                    <label className="block text-xs font-bold text-[#F1F5F9] mb-1">Client Account</label>
                    <NativeSelect
                      value={assignForm.client}
                      onChange={(e) => setAssignForm({ ...assignForm, client: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl border border-[#2A3446] text-xs font-medium text-white bg-[#161F2D]"
                    >
                      <option value="" disabled>No active clients</option>
                    </NativeSelect>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-[#F1F5F9] mb-1">Priority Level</label>
                    <NativeSelect
                      value={assignForm.priority}
                      onChange={(e) => setAssignForm({ ...assignForm, priority: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl border border-[#2A3446] text-xs font-medium text-white bg-[#161F2D]"
                    >
                      <option value="Urgent">🔥 Urgent (Within 24h)</option>
                      <option value="High">⚡ High (Sprint Priority)</option>
                      <option value="Medium">Standard Medium</option>
                      <option value="Normal">Normal Priority</option>
                    </NativeSelect>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 sm:gap-3">
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
              className="relative w-full max-w-2xl rounded-3xl bg-[#161F2D] p-5 sm:p-8 shadow-2xl border border-[#2A3446] flex flex-col space-y-5 max-h-[92vh] overflow-y-auto"
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
                  <span className="text-[#97A0B3] font-semibold">0.0h Total Booked</span>
                </div>
                <div className="p-4 rounded-xl border border-[#2A3446] bg-[#0B111C] text-center text-xs text-[#97A0B3]">
                  No sprint hours currently booked for this member.
                </div>
              </div>

              {/* Active Deliverables Breakdown */}
              <div className="space-y-2.5">
                <h4 className="text-xs font-bold text-white">Active Deliverables & Status</h4>
                <div className="p-4 rounded-xl border border-[#2A3446] bg-[#161F2D] text-center text-xs text-[#97A0B3]">
                  No active deliverables in progress.
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
              className="relative w-full max-w-md rounded-3xl bg-[#161F2D] p-5 sm:p-8 shadow-2xl border border-[#2A3446] flex flex-col items-center text-center animate-in zoom-in-95 duration-150"
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
            MODAL 4: ADD MEMBER MODAL (FULLY FUNCTIONAL WITH CREDENTIALS)
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
                  <div className="size-9 rounded-xl bg-[#7FA0D6]/15 text-[#7FA0D6] flex items-center justify-center font-black text-sm shrink-0">
                    <Users className="size-4" />
                  </div>
                  <div>
                    <h3 className="text-sm sm:text-base font-bold text-white tracking-tight">
                      Add Team Specialist {activePod?.name ? `• ${activePod.name}` : ""}
                    </h3>
                    <p className="text-[11px] text-[#97A0B3]">
                      Set credentials & pod assignment
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setIsAddMemberOpen(false)}
                  className="size-8 rounded-full bg-[#161F2D] hover:bg-[#2A3446] text-[#97A0B3] hover:text-white flex items-center justify-center transition-colors cursor-pointer"
                >
                  <X className="size-4" />
                </button>
              </div>

              {/* Add Member Form */}
              <form onSubmit={handleCreateTeamMember} className="space-y-3 text-xs">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 sm:gap-3">
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
                      className="w-full px-3 py-2 rounded-lg border border-[#2A3446] text-xs text-white bg-[#0B111C] focus:outline-none focus:border-blue-500 font-medium"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-[#F1F5F9] mb-1">Login Email ID *</label>
                    <input
                      type="email"
                      required
                      value={newMemberForm.email}
                      onChange={(e) => setNewMemberForm({ ...newMemberForm, email: e.target.value })}
                      placeholder="e.g. jordan.m@creo.agency"
                      className="w-full px-3 py-2 rounded-lg border border-[#2A3446] text-xs text-white bg-[#0B111C] focus:outline-none focus:border-blue-500 font-medium"
                    />
                  </div>
                </div>

                {/* Dispatch / Personal Email Field - Minimalist */}
                <div className="bg-[#0B111C]/60 p-2.5 sm:p-3 rounded-xl border border-[#2A3446] space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-[#F1F5F9] flex items-center gap-1.5">
                      <Mail className="size-3.5 text-[#7FA0D6]" />
                      <span>Personal Email</span>
                      <span className="text-[10px] text-[#97A0B3] font-normal">(Optional dispatch)</span>
                    </label>
                    <label className="flex items-center gap-1.5 cursor-pointer text-[#7FA0D6] text-[11px] font-medium select-none">
                      <input
                        type="checkbox"
                        checked={newMemberForm.send_email}
                        onChange={(e) => setNewMemberForm({ ...newMemberForm, send_email: e.target.checked })}
                        className="size-3.5 rounded text-blue-600 focus:ring-blue-500 cursor-pointer"
                      />
                      <span>Send credentials</span>
                    </label>
                  </div>
                  <input
                    type="email"
                    value={newMemberForm.dispatch_email}
                    onChange={(e) => setNewMemberForm({ ...newMemberForm, dispatch_email: e.target.value })}
                    placeholder="e.g. jordan.personal@gmail.com"
                    className="w-full px-3 py-2 rounded-lg border border-[#2A3446] text-xs text-white bg-[#161F2D] focus:outline-none focus:border-blue-500 font-medium"
                  />
                </div>

                {/* Account Password Field - Minimalist */}
                <div className="bg-[#0B111C]/60 p-2.5 sm:p-3 rounded-xl border border-[#2A3446] space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-[#F1F5F9] flex items-center gap-1.5">
                      <KeyRound className="size-3.5 text-[#7FA0D6]" />
                      <span>Account Password *</span>
                    </label>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setNewMemberForm({ ...newMemberForm, password: generateStrongPassword() })}
                        className="text-[11px] font-bold text-[#7FA0D6] hover:text-white flex items-center gap-1 cursor-pointer"
                      >
                        <Sparkles className="size-3" />
                        <span>Generate</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          navigator.clipboard.writeText(newMemberForm.password);
                          setCopiedKey("formPass");
                          setTimeout(() => setCopiedKey(null), 1800);
                        }}
                        className="text-[11px] font-bold text-[#97A0B3] hover:text-white flex items-center gap-1 cursor-pointer"
                      >
                        {copiedKey === "formPass" ? <Check className="size-3 text-emerald-400" /> : <Copy className="size-3" />}
                        <span>{copiedKey === "formPass" ? "Copied" : "Copy"}</span>
                      </button>
                    </div>
                  </div>
                  <div className="relative">
                    <input
                      type={showNewMemberPassword ? "text" : "password"}
                      required
                      minLength={6}
                      value={newMemberForm.password}
                      onChange={(e) => setNewMemberForm({ ...newMemberForm, password: e.target.value })}
                      placeholder="Min 6 characters"
                      className="w-full pl-3 pr-10 py-2 rounded-lg border border-[#2A3446] text-xs text-white bg-[#161F2D] focus:outline-none focus:border-blue-500 font-mono font-medium"
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewMemberPassword(!showNewMemberPassword)}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#97A0B3] hover:text-white cursor-pointer"
                    >
                      {showNewMemberPassword ? <EyeOff className="size-3.5" /> : <Eye className="size-3.5" />}
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 sm:gap-3">
                  <div>
                    <label className="block text-xs font-bold text-[#F1F5F9] mb-1">Role Track Category</label>
                    <NativeSelect
                      value={newMemberForm.category}
                      onChange={(e) => {
                        const cat = e.target.value as TeamMember["category"];
                        let defaultRole = "Senior Visual Designer";
                        if (cat === "editor") defaultRole = "Lead Video Editor";
                        else if (cat === "bde") defaultRole = "Business Development Executive (BDE)";
                        else if (cat === "videographer") defaultRole = "Lead Cinematographer & Videographer";
                        else if (cat === "photographer") defaultRole = "Commercial Photographer";
                        else if (cat === "lead") defaultRole = "Sprint Pod Lead";
                        setNewMemberForm({ ...newMemberForm, category: cat, role: defaultRole });
                      }}
                      className="w-full px-3 py-2 rounded-lg border border-[#2A3446] text-xs font-medium text-white bg-[#0B111C]"
                    >
                      <option value="designer">🎨 Designer (UI, 3D, Brand)</option>
                      <option value="editor">✂️ Video & Motion Editor</option>
                      <option value="bde">💼 BDE / Sales Specialist</option>
                      <option value="videographer">🎥 Cinematographer & Videographer</option>
                      <option value="photographer">📷 Commercial Photographer</option>
                      <option value="lead">👑 Pod Lead & Strategist</option>
                    </NativeSelect>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-[#F1F5F9] mb-1">Role Title</label>
                    <input
                      type="text"
                      required
                      value={newMemberForm.role}
                      onChange={(e) => setNewMemberForm({ ...newMemberForm, role: e.target.value })}
                      placeholder="e.g. Senior Visual Designer"
                      className="w-full px-3 py-2 rounded-lg border border-[#2A3446] text-xs text-white bg-[#0B111C] focus:outline-none focus:border-blue-500 font-medium"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 sm:gap-3">
                  <div>
                    <label className="block text-xs font-bold text-[#F1F5F9] mb-1">Slack / Agency Handle</label>
                    <input
                      type="text"
                      value={newMemberForm.handle}
                      onChange={(e) => setNewMemberForm({ ...newMemberForm, handle: e.target.value })}
                      placeholder="e.g. @jmiller"
                      className="w-full px-3 py-2 rounded-lg border border-[#2A3446] text-xs text-white bg-[#0B111C] focus:outline-none focus:border-blue-500 font-medium"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-[#F1F5F9] mb-1">Assign Sprint Pod</label>
                    <NativeSelect
                      value={newMemberForm.podId}
                      onChange={(e) => setNewMemberForm({ ...newMemberForm, podId: e.target.value })}
                      className="w-full px-3 py-2 rounded-lg border border-[#2A3446] text-xs font-medium text-white bg-[#0B111C]"
                    >
                      <option value="pod-a">Pod A • Enterprise Brand & Design</option>
                      <option value="pod-b">Pod B • Performance & Video</option>
                      <option value="pod-c">Pod C • 3D Motion & VFX</option>
                    </NativeSelect>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#F1F5F9] mb-1">Core Capabilities (comma separated)</label>
                  <input
                    type="text"
                    value={newMemberForm.capabilities}
                    onChange={(e) => setNewMemberForm({ ...newMemberForm, capabilities: e.target.value })}
                    placeholder="e.g. Figma Tokens, Cinema 4D, Color Grading, Kinetic Typography"
                    className="w-full px-3 py-2 rounded-lg border border-[#2A3446] text-xs text-white bg-[#0B111C] focus:outline-none focus:border-blue-500 font-medium"
                  />
                </div>

                {/* Submit Row */}
                <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-[#2A3446]">
                  <button
                    type="button"
                    onClick={() => setIsAddMemberOpen(false)}
                    className="px-4 py-2 rounded-xl border border-[#2A3446] text-xs font-bold text-[#F1F5F9] hover:bg-[#0B111C] cursor-pointer transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isCreatingMember}
                    className="px-5 py-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white text-xs font-bold shadow-md shadow-blue-500/25 active:scale-95 transition-all cursor-pointer disabled:opacity-50"
                  >
                    {isCreatingMember ? "Adding..." : "Add Specialist"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* ─────────────────────────────────────────────────────────────────────────────
            MODAL 5: CREDENTIALS PROVISIONED CONFIRMATION (1-CLICK COPY)
        ───────────────────────────────────────────────────────────────────────────── */}
        {provisionedCredentials && (
          <div
            className="fixed inset-0 w-screen h-screen z-[99999] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fade-in"
            onClick={() => setProvisionedCredentials(null)}
          >
            <div
              className="relative w-full max-w-md rounded-3xl bg-[#161F2D] p-6 sm:p-7 shadow-2xl border border-emerald-500/30 flex flex-col space-y-4"
              onClick={(e) => e.stopPropagation()}
              role="dialog"
              aria-modal="true"
            >
              {/* Header */}
              <div className="flex items-center justify-between border-b border-[#2A3446] pb-3">
                <div className="flex items-center gap-2.5">
                  <div className="size-10 rounded-2xl bg-emerald-500/15 text-emerald-400 flex items-center justify-center font-black">
                    <ShieldCheck className="size-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-black text-white tracking-tight">Credentials Provisioned!</h3>
                    <p className="text-[11px] text-[#97A0B3] font-medium">
                      Account active in database. Share these credentials with the user.
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setProvisionedCredentials(null)}
                  className="size-8 rounded-full bg-[#0B111C] hover:bg-slate-700 text-[#97A0B3] flex items-center justify-center transition-colors cursor-pointer"
                >
                  <X className="size-4" />
                </button>
              </div>

              {/* Specialist Profile Banner */}
              <div className="p-3.5 bg-[#0B111C] rounded-2xl border border-[#2A3446] flex items-center justify-between">
                <div>
                  <div className="text-sm font-bold text-white">{provisionedCredentials.name}</div>
                  <div className="text-xs text-[#7FA0D6] font-medium">{provisionedCredentials.role} • {provisionedCredentials.podName}</div>
                </div>
                <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                  Active
                </span>
              </div>

              {/* Credentials details box */}
              <div className="space-y-3 bg-[#0B111C]/60 p-4 rounded-2xl border border-[#2A3446]">
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-wider text-[#97A0B3] block mb-1">
                    Login Email ID
                  </label>
                  <div className="flex items-center justify-between bg-[#161F2D] px-3.5 py-2.5 rounded-xl border border-[#2A3446]">
                    <span className="text-xs font-mono font-bold text-white truncate select-all">
                      {provisionedCredentials.email}
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        navigator.clipboard.writeText(provisionedCredentials.email);
                        setCopiedKey("email");
                        setTimeout(() => setCopiedKey(null), 2000);
                      }}
                      className="text-xs font-bold text-[#7FA0D6] hover:text-white flex items-center gap-1 cursor-pointer ml-2 shrink-0"
                    >
                      {copiedKey === "email" ? <Check className="size-3.5 text-emerald-400" /> : <Copy className="size-3.5" />}
                      <span>{copiedKey === "email" ? "Copied" : "Copy"}</span>
                    </button>
                  </div>
                </div>

                <div>
                  <label className="text-[10px] font-bold uppercase tracking-wider text-[#97A0B3] block mb-1">
                    Password
                  </label>
                  <div className="flex items-center justify-between bg-[#161F2D] px-3.5 py-2.5 rounded-xl border border-[#2A3446]">
                    <span className="text-xs font-mono font-bold text-amber-300 select-all">
                      {provisionedCredentials.password}
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        navigator.clipboard.writeText(provisionedCredentials.password);
                        setCopiedKey("pass");
                        setTimeout(() => setCopiedKey(null), 2000);
                      }}
                      className="text-xs font-bold text-[#7FA0D6] hover:text-white flex items-center gap-1 cursor-pointer ml-2 shrink-0"
                    >
                      {copiedKey === "pass" ? <Check className="size-3.5 text-emerald-400" /> : <Copy className="size-3.5" />}
                      <span>{copiedKey === "pass" ? "Copied" : "Copy"}</span>
                    </button>
                  </div>
                </div>

                {provisionedCredentials.dispatchEmail && provisionedCredentials.dispatchEmail.toLowerCase() !== provisionedCredentials.email.toLowerCase() && (
                  <div>
                    <label className="text-[10px] font-bold uppercase tracking-wider text-[#7FA0D6] block mb-1">
                      Delivered To (Worker Personal Email)
                    </label>
                    <div className="flex items-center justify-between bg-[#161F2D] px-3.5 py-2.5 rounded-xl border border-blue-500/30">
                      <span className="text-xs font-mono font-bold text-blue-300 truncate select-all">
                        {provisionedCredentials.dispatchEmail}
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          navigator.clipboard.writeText(provisionedCredentials.dispatchEmail!);
                          setCopiedKey("dispatch");
                          setTimeout(() => setCopiedKey(null), 2000);
                        }}
                        className="text-xs font-bold text-[#7FA0D6] hover:text-white flex items-center gap-1 cursor-pointer ml-2 shrink-0"
                      >
                        {copiedKey === "dispatch" ? <Check className="size-3.5 text-emerald-400" /> : <Copy className="size-3.5" />}
                        <span>{copiedKey === "dispatch" ? "Copied" : "Copy"}</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Email Dispatched Status Banner */}
              <div className="p-3 bg-emerald-500/10 border border-emerald-500/25 rounded-2xl flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <div className="size-8 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
                    <Mail className="size-4" />
                  </div>
                  <div>
                    <span className="text-xs font-bold text-emerald-300 block">Credentials Sent via Email</span>
                    <span className="text-[10px] text-[#97A0B3] block truncate max-w-[200px] sm:max-w-[250px]">
                      Dispatched to {provisionedCredentials.dispatchEmail || provisionedCredentials.email}
                    </span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setToast(`Credentials re-dispatched to ${provisionedCredentials.dispatchEmail || provisionedCredentials.email}`);
                  }}
                  className="px-2.5 py-1 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 text-[10px] font-bold transition-colors cursor-pointer shrink-0"
                >
                  Resend
                </button>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => {
                    const text = `Creo Login Credentials:\nEmail: ${provisionedCredentials.email}\nPassword: ${provisionedCredentials.password}\nRole: ${provisionedCredentials.role}`;
                    navigator.clipboard.writeText(text);
                    setCopiedKey("all");
                    setTimeout(() => setCopiedKey(null), 2000);
                  }}
                  className="flex-1 py-2.5 px-3 rounded-xl bg-[#0B111C] hover:bg-[#2A3446] border border-[#2A3446] text-white text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer transition-colors"
                >
                  {copiedKey === "all" ? <Check className="size-3.5 text-emerald-400" /> : <Copy className="size-3.5 text-[#7FA0D6]" />}
                  <span>{copiedKey === "all" ? "Credentials Copied!" : "Copy Full Details"}</span>
                </button>
                <button
                  type="button"
                  onClick={() => setProvisionedCredentials(null)}
                  className="py-2.5 px-5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white text-xs font-bold cursor-pointer transition-colors"
                >
                  Done
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ─────────────────────────────────────────────────────────────────────────────
            MODAL 6: GIVE / RESET CREDENTIALS FOR EXISTING MEMBER
        ───────────────────────────────────────────────────────────────────────────── */}
        {credentialModalMember && (
          <div
            className="fixed inset-0 w-screen h-screen z-[99999] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fade-in"
            onClick={() => setCredentialModalMember(null)}
          >
            <div
              className="relative w-full max-w-md rounded-3xl bg-[#161F2D] p-6 sm:p-7 shadow-2xl border border-[#2A3446] flex flex-col space-y-4"
              onClick={(e) => e.stopPropagation()}
              role="dialog"
              aria-modal="true"
            >
              {/* Header */}
              <div className="flex items-center justify-between border-b border-[#2A3446] pb-3">
                <div className="flex items-center gap-2.5">
                  <div className="size-10 rounded-2xl bg-[#7FA0D6]/15 text-[#7FA0D6] flex items-center justify-center font-black">
                    <KeyRound className="size-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-black text-white tracking-tight">
                      Manage Login Credentials
                    </h3>
                    <p className="text-[11px] text-[#97A0B3] font-medium">
                      Set Email ID & Password for {credentialModalMember.name}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setCredentialModalMember(null)}
                  className="size-8 rounded-full bg-[#0B111C] hover:bg-slate-700 text-[#97A0B3] flex items-center justify-center transition-colors cursor-pointer"
                >
                  <X className="size-4" />
                </button>
              </div>

              {/* Form */}
              <form onSubmit={handleUpdateCredentials} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-[#F1F5F9] mb-1.5">Email Address *</label>
                  <input
                    type="email"
                    required
                    value={credentialForm.email}
                    onChange={(e) => setCredentialForm({ ...credentialForm, email: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-[#2A3446] text-xs text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 font-medium"
                    placeholder="e.g. member@creo.agency"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-xs font-bold text-[#F1F5F9]">New Password *</label>
                    <button
                      type="button"
                      onClick={() => setCredentialForm({ ...credentialForm, password: generateStrongPassword() })}
                      className="text-[11px] font-bold text-[#7FA0D6] hover:text-white flex items-center gap-1 cursor-pointer"
                    >
                      <Sparkles className="size-3" />
                      <span>Generate</span>
                    </button>
                  </div>
                  <div className="relative">
                    <input
                      type={showCredentialPassword ? "text" : "password"}
                      required
                      minLength={6}
                      value={credentialForm.password}
                      onChange={(e) => setCredentialForm({ ...credentialForm, password: e.target.value })}
                      className="w-full pl-3.5 pr-10 py-2.5 rounded-xl border border-[#2A3446] text-xs text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 font-medium font-mono"
                      placeholder="At least 6 characters"
                    />
                    <button
                      type="button"
                      onClick={() => setShowCredentialPassword(!showCredentialPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-[#97A0B3] hover:text-white cursor-pointer"
                    >
                      {showCredentialPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                    </button>
                  </div>
                  <p className="text-[10px] text-[#97A0B3] mt-1.5">
                    Updating this password immediately syncs to the database so the member can log in.
                  </p>
                </div>

                {/* Optional separate dispatch email */}
                <div className="bg-[#0B111C]/80 p-3 rounded-2xl border border-blue-500/25 space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="block text-xs font-bold text-[#F1F5F9] flex items-center gap-1.5">
                      <Mail className="size-3.5 text-[#7FA0D6]" />
                      <span>Send Credentials To (Worker Personal Email)</span>
                    </label>
                    <span className="text-[10px] text-[#7FA0D6] font-semibold px-2 py-0.5 rounded-full bg-[#7FA0D6]/10 border border-[#7FA0D6]/20">
                      Optional
                    </span>
                  </div>
                  <input
                    type="email"
                    value={credentialForm.dispatch_email}
                    onChange={(e) => setCredentialForm({ ...credentialForm, dispatch_email: e.target.value })}
                    className="w-full px-3.5 py-2 rounded-xl border border-[#2A3446] text-xs text-white bg-[#161F2D] focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 font-medium"
                    placeholder="e.g. member.personal@gmail.com (leave blank to send to Login Email)"
                  />
                  <div className="flex items-center justify-between text-[11px] text-[#97A0B3] pt-0.5">
                    <span>Credentials will be dispatched to this separate inbox.</span>
                    <label className="flex items-center gap-1.5 cursor-pointer text-[#7FA0D6] font-medium select-none">
                      <input
                        type="checkbox"
                        checked={credentialForm.send_email}
                        onChange={(e) => setCredentialForm({ ...credentialForm, send_email: e.target.checked })}
                        className="size-3.5 rounded text-blue-600 focus:ring-blue-500 cursor-pointer"
                      />
                      <span>Send email</span>
                    </label>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-[#2A3446]">
                  <button
                    type="button"
                    onClick={() => setCredentialModalMember(null)}
                    className="px-4 py-2.5 rounded-xl border border-[#2A3446] text-xs font-bold text-[#F1F5F9] hover:bg-[#0B111C] cursor-pointer transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isUpdatingCredentials}
                    className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white text-xs font-bold shadow-md shadow-blue-500/25 active:scale-95 transition-all cursor-pointer disabled:opacity-50"
                  >
                    {isUpdatingCredentials ? "Updating..." : "Save & Assign Credentials"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
        {/* Modals for Freelancer Management */}
        {isAddFreelancerOpen && (
          <AdminFreelancerModal
            isOpen={true}
            onClose={() => setIsAddFreelancerOpen(false)}
            onSuccess={() => {
              freelancersQuery.refetch();
              setToast("Freelancer account created successfully with role-based credentials!");
            }}
          />
        )}
        {assignFreelancerTarget && (
          <AdminAssignFreelancerModal
            isOpen={true}
            onClose={() => setAssignFreelancerTarget(null)}
            freelancer={assignFreelancerTarget}
            onSuccess={() => {
              freelancersQuery.refetch();
              setToast(`Task successfully assigned to ${assignFreelancerTarget.full_name}!`);
            }}
          />
        )}

        {/* ─── BDE ONBOARDING MODAL ─────────────────────────────────────── */}
        {isOnboardBdeOpen && (
          <div
            className="fixed inset-0 w-screen h-screen z-[99999] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fade-in"
            onClick={() => setIsOnboardBdeOpen(false)}
          >
            <div
              className="relative w-full max-w-lg rounded-3xl bg-[#161F2D] p-6 sm:p-7 shadow-2xl border border-amber-500/30 flex flex-col space-y-4 max-h-[92vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
              role="dialog"
              aria-modal="true"
            >
              <div className="flex items-center justify-between border-b border-[#2A3446] pb-3">
                <div className="flex items-center gap-2.5">
                  <div className="size-9 rounded-xl bg-amber-500/15 text-amber-400 flex items-center justify-center font-black shrink-0">
                    <Briefcase className="size-4" />
                  </div>
                  <div>
                    <h3 className="text-sm sm:text-base font-bold text-white tracking-tight">Onboard BDE Specialist</h3>
                    <p className="text-[11px] text-[#97A0B3]">
                      Set quota, commission & credentials
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setIsOnboardBdeOpen(false)}
                  className="size-8 rounded-full bg-[#161F2D] hover:bg-[#2A3446] text-[#97A0B3] hover:text-white flex items-center justify-center transition-colors cursor-pointer"
                >
                  <X className="size-4" />
                </button>
              </div>

              <form onSubmit={handleOnboardBdeSubmit} className="space-y-3 text-xs">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 sm:gap-3">
                  <div>
                    <label className="block text-xs font-bold text-[#F1F5F9] mb-1">Full Name *</label>
                    <input
                      type="text"
                      required
                      value={bdeForm.full_name}
                      onChange={(e) => setBdeForm({ ...bdeForm, full_name: e.target.value })}
                      placeholder="e.g. Rahul Sharma"
                      className="w-full px-3 py-2 rounded-lg border border-[#2A3446] text-xs font-medium text-white bg-[#0B111C] focus:outline-none focus:border-amber-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-[#F1F5F9] mb-1">CRM Login Email *</label>
                    <input
                      type="email"
                      required
                      value={bdeForm.email}
                      onChange={(e) => setBdeForm({ ...bdeForm, email: e.target.value })}
                      placeholder="e.g. rahul.sharma@creo.agency"
                      className="w-full px-3 py-2 rounded-lg border border-[#2A3446] text-xs font-medium text-white bg-[#0B111C] focus:outline-none focus:border-amber-500"
                    />
                  </div>
                </div>

                {/* Dispatch / Notification Email Field - Minimalist */}
                <div className="bg-[#0B111C]/60 p-2.5 sm:p-3 rounded-xl border border-[#2A3446] space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-[#F1F5F9] flex items-center gap-1.5">
                      <Mail className="size-3.5 text-amber-400" />
                      <span>Personal Email</span>
                      <span className="text-[10px] text-[#97A0B3] font-normal">(Optional dispatch)</span>
                    </label>
                    <label className="flex items-center gap-1.5 cursor-pointer text-amber-300 text-[11px] font-medium select-none">
                      <input
                        type="checkbox"
                        id="send_bde_email"
                        checked={bdeForm.send_credentials_email}
                        onChange={(e) => setBdeForm({ ...bdeForm, send_credentials_email: e.target.checked })}
                        className="size-3.5 rounded text-amber-500 focus:ring-amber-400 cursor-pointer"
                      />
                      <span>Send credentials</span>
                    </label>
                  </div>
                  <input
                    type="email"
                    value={bdeForm.dispatch_email}
                    onChange={(e) => setBdeForm({ ...bdeForm, dispatch_email: e.target.value })}
                    placeholder="e.g. rahul.personal@gmail.com"
                    className="w-full px-3 py-2 rounded-lg border border-[#2A3446] text-xs font-medium text-white bg-[#161F2D] focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 sm:gap-3">
                  <div>
                    <label className="block text-xs font-bold text-[#F1F5F9] mb-1">Phone Number (Optional)</label>
                    <input
                      type="text"
                      value={bdeForm.phone}
                      onChange={(e) => setBdeForm({ ...bdeForm, phone: e.target.value })}
                      placeholder="e.g. +91 98765 43210"
                      className="w-full px-3 py-2 rounded-lg border border-[#2A3446] text-xs font-medium text-white bg-[#0B111C] focus:outline-none focus:border-amber-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-[#F1F5F9] mb-1">Designation / Role Title</label>
                    <input
                      type="text"
                      value={bdeForm.designation}
                      onChange={(e) => setBdeForm({ ...bdeForm, designation: e.target.value })}
                      placeholder="e.g. Senior BDE - Enterprise Accounts"
                      className="w-full px-3 py-2 rounded-lg border border-[#2A3446] text-xs font-medium text-white bg-[#0B111C] focus:outline-none focus:border-amber-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 sm:gap-3">
                  <div>
                    <label className="block text-xs font-bold text-[#F1F5F9] mb-1">Monthly Quota (₹)</label>
                    <input
                      type="number"
                      min="0"
                      step="50000"
                      value={bdeForm.monthly_quota}
                      onChange={(e) => setBdeForm({ ...bdeForm, monthly_quota: Number(e.target.value) })}
                      placeholder="2500000"
                      className="w-full px-3 py-2 rounded-lg border border-[#2A3446] text-xs font-medium text-white bg-[#0B111C] focus:outline-none focus:border-amber-500"
                    />
                    <span className="text-[10px] text-amber-400 mt-0.5 block font-semibold">
                      ₹{(bdeForm.monthly_quota / 100000).toFixed(1)}L target
                    </span>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-[#F1F5F9] mb-1">Commission Rate (%)</label>
                    <input
                      type="number"
                      min="0"
                      max="100"
                      step="0.5"
                      value={bdeForm.commission_rate}
                      onChange={(e) => setBdeForm({ ...bdeForm, commission_rate: Number(e.target.value) })}
                      placeholder="5.0"
                      className="w-full px-3 py-2 rounded-lg border border-[#2A3446] text-xs font-medium text-white bg-[#0B111C] focus:outline-none focus:border-amber-500"
                    />
                    <span className="text-[10px] text-purple-300 mt-0.5 block font-semibold">
                      {bdeForm.commission_rate}% deal payout
                    </span>
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-bold text-[#F1F5F9]">Initial Login Password *</label>
                    <button
                      type="button"
                      onClick={() => setBdeForm({ ...bdeForm, password: `Creo@${Math.floor(1000 + Math.random() * 9000)}!` })}
                      className="text-[11px] font-bold text-amber-400 hover:text-amber-300 cursor-pointer flex items-center gap-1"
                    >
                      <Sparkles className="size-3" />
                      <span>Auto-Generate</span>
                    </button>
                  </div>
                  <div className="relative">
                    <input
                      type={showOnboardPassword ? "text" : "password"}
                      required
                      value={bdeForm.password}
                      onChange={(e) => setBdeForm({ ...bdeForm, password: e.target.value })}
                      className="w-full pl-3 pr-10 py-2 rounded-lg border border-[#2A3446] text-xs font-mono font-bold text-white bg-[#0B111C] focus:outline-none focus:border-amber-500"
                      placeholder="Min 6 characters"
                    />
                    <button
                      type="button"
                      onClick={() => setShowOnboardPassword(!showOnboardPassword)}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#97A0B3] hover:text-white"
                    >
                      {showOnboardPassword ? <EyeOff className="size-3.5" /> : <Eye className="size-3.5" />}
                    </button>
                  </div>
                </div>

                <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-[#2A3446]">
                  <button
                    type="button"
                    onClick={() => setIsOnboardBdeOpen(false)}
                    className="px-4 py-2 rounded-xl border border-[#2A3446] text-xs font-bold text-[#F1F5F9] hover:bg-[#0B111C] cursor-pointer transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isOnboardingBde}
                    className="px-5 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white text-xs font-bold shadow-md shadow-amber-500/25 active:scale-95 transition-all cursor-pointer disabled:opacity-50"
                  >
                    {isOnboardingBde ? "Onboarding..." : "Onboard BDE"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* ─── BDE CREDENTIALS / PASSWORD RESET MODAL ─────────────────── */}
        {bdeCredModalUser && (
          <div
            className="fixed inset-0 w-screen h-screen z-[99999] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fade-in"
            onClick={() => setBdeCredModalUser(null)}
          >
            <div
              className="relative w-full max-w-md rounded-3xl bg-[#161F2D] p-6 sm:p-7 shadow-2xl border border-amber-500/30 flex flex-col space-y-4"
              onClick={(e) => e.stopPropagation()}
              role="dialog"
              aria-modal="true"
            >
              <div className="flex items-center justify-between border-b border-[#2A3446] pb-3">
                <div className="flex items-center gap-2.5">
                  <div className="size-10 rounded-2xl bg-amber-500/15 text-amber-400 flex items-center justify-center font-black">
                    <KeyRound className="size-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-black text-white tracking-tight">Set Password & Email</h3>
                    <p className="text-[11px] text-[#97A0B3] font-medium">
                      Update login credentials for {bdeCredModalUser.full_name}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setBdeCredModalUser(null)}
                  className="size-8 rounded-full bg-[#0B111C] hover:bg-slate-700 text-[#97A0B3] flex items-center justify-center transition-colors cursor-pointer"
                >
                  <X className="size-4" />
                </button>
              </div>

              <div className="p-3 bg-[#0B111C] rounded-2xl border border-[#2A3446] flex items-center justify-between">
                <div>
                  <span className="text-[10px] text-[#97A0B3] uppercase font-bold block">BDE Account</span>
                  <span className="text-xs font-bold text-white">{bdeCredModalUser.full_name}</span>
                </div>
                <span className="text-xs font-mono font-medium text-amber-400">{bdeCredModalUser.email}</span>
              </div>

              <form onSubmit={handleUpdateBdeCredentialsSubmit} className="space-y-4">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-bold text-[#F1F5F9]">New Password *</label>
                    <button
                      type="button"
                      onClick={() => setBdeCredNewPassword(`Creo@${Math.floor(1000 + Math.random() * 9000)}!`)}
                      className="text-[11px] font-bold text-amber-400 hover:text-amber-300 cursor-pointer flex items-center gap-1"
                    >
                      <span>🎲 Auto-Generate</span>
                    </button>
                  </div>
                  <div className="relative">
                    <input
                      type={showCredPassword ? "text" : "password"}
                      required
                      value={bdeCredNewPassword}
                      onChange={(e) => setBdeCredNewPassword(e.target.value)}
                      className="w-full pl-3.5 pr-10 py-2.5 rounded-xl border border-[#2A3446] text-xs font-mono font-bold text-white bg-[#0B111C] focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
                      placeholder="Enter new password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowCredPassword(!showCredPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-[#97A0B3] hover:text-white"
                    >
                      {showCredPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                    </button>
                  </div>
                </div>

                {/* Optional separate dispatch email */}
                <div className="p-3 bg-[#0B111C] rounded-2xl border border-amber-500/25 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="block text-xs font-bold text-[#F1F5F9] flex items-center gap-1.5">
                      <Mail className="size-3.5 text-amber-400" />
                      <span>Send Credentials To (Worker Personal Email)</span>
                    </label>
                    <span className="text-[10px] text-amber-400 font-semibold px-2 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/20">
                      Optional
                    </span>
                  </div>
                  <input
                    type="email"
                    value={bdeCredDispatchEmail}
                    onChange={(e) => setBdeCredDispatchEmail(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-xl border border-[#2A3446] text-xs font-medium text-white bg-[#161F2D] focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
                    placeholder={`e.g. personal@gmail.com (leave blank to send to ${bdeCredModalUser.email})`}
                  />
                  <p className="text-[10px] text-[#97A0B3]">
                    Updated credentials will be delivered to this inbox while leaving login email as {bdeCredModalUser.email}.
                  </p>
                </div>

                <div className="p-3.5 rounded-2xl bg-[#0B111C] border border-amber-500/40 shadow-sm shadow-amber-500/10 flex items-start gap-3">
                  <input
                    type="checkbox"
                    id="send_cred_update_email"
                    checked={bdeCredSendEmail}
                    onChange={(e) => setBdeCredSendEmail(e.target.checked)}
                    className="mt-1 size-4 rounded border-[#2A3446] bg-[#161F2D] text-amber-500 focus:ring-amber-400 cursor-pointer shrink-0"
                  />
                  <label htmlFor="send_cred_update_email" className="text-xs cursor-pointer select-none">
                    <span className="font-bold text-amber-300 block mb-0.5 text-xs">
                      Dispatch Updated Credentials Email:
                    </span>
                    <span className="text-[#F1F5F9] text-xs leading-relaxed block font-medium">
                      Send an immediate transactional notification to <strong className="text-white font-mono">{bdeCredModalUser.email}</strong> with the new password and direct sign-in link.
                    </span>
                  </label>
                </div>

                <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-[#2A3446]">
                  <button
                    type="button"
                    onClick={() => setBdeCredModalUser(null)}
                    className="px-4 py-2.5 rounded-xl border border-[#2A3446] text-xs font-bold text-[#F1F5F9] hover:bg-[#0B111C] cursor-pointer transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isUpdatingCreds}
                    className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white text-xs font-bold shadow-md shadow-amber-500/25 active:scale-95 transition-all cursor-pointer disabled:opacity-50"
                  >
                    {isUpdatingCreds ? "Updating & Sending..." : "Save Password & Send Email"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* ─── BDE PROVISIONED CREDENTIALS SUCCESS DIALOG ─────────────── */}
        {bdeProvisionedCreds && (
          <div
            className="fixed inset-0 w-screen h-screen z-[99999] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fade-in"
            onClick={() => setBdeProvisionedCreds(null)}
          >
            <div
              className="relative w-full max-w-md rounded-3xl bg-[#161F2D] p-6 sm:p-7 shadow-2xl border border-amber-500/30 flex flex-col space-y-4"
              onClick={(e) => e.stopPropagation()}
              role="dialog"
              aria-modal="true"
            >
              <div className="flex items-center justify-between border-b border-[#2A3446] pb-3">
                <div className="flex items-center gap-2.5">
                  <div className="size-10 rounded-2xl bg-amber-500/15 text-amber-400 flex items-center justify-center font-black">
                    <ShieldCheck className="size-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-black text-white tracking-tight">BDE Provisioned Successfully!</h3>
                    <p className="text-[11px] text-[#97A0B3] font-medium">
                      Account active in database and assigned to Sales CRM.
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setBdeProvisionedCreds(null)}
                  className="size-8 rounded-full bg-[#0B111C] hover:bg-slate-700 text-[#97A0B3] flex items-center justify-center transition-colors cursor-pointer"
                >
                  <X className="size-4" />
                </button>
              </div>

              <div
                className={`p-3 rounded-2xl border flex items-center gap-2 text-xs font-bold ${
                  bdeProvisionedCreds.email_dispatched
                    ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400"
                    : "bg-amber-500/10 border-amber-500/30 text-amber-400"
                }`}
              >
                <CheckCircle2 className="size-4 shrink-0" />
                <span>
                  {bdeProvisionedCreds.email_dispatched
                    ? "Welcome credentials email dispatched to BDE inbox via Brevo/SMTP!"
                    : "Account created (email dispatch was bypassed or skipped)."}
                </span>
              </div>

              <div className="space-y-3 bg-[#0B111C]/60 p-4 rounded-2xl border border-[#2A3446]">
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-wider text-[#97A0B3] block mb-1">
                    Login Email ID
                  </label>
                  <div className="flex items-center justify-between bg-[#161F2D] px-3.5 py-2.5 rounded-xl border border-[#2A3446]">
                    <span className="text-xs font-mono font-bold text-white truncate select-all">
                      {bdeProvisionedCreds.email}
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        navigator.clipboard.writeText(bdeProvisionedCreds.email);
                        setBdeCopiedKey("email");
                        setTimeout(() => setBdeCopiedKey(null), 2000);
                      }}
                      className="text-xs font-bold text-amber-400 hover:text-white flex items-center gap-1 cursor-pointer ml-2 shrink-0"
                    >
                      {bdeCopiedKey === "email" ? <Check className="size-3.5 text-emerald-400" /> : <Copy className="size-3.5" />}
                      <span>{bdeCopiedKey === "email" ? "Copied" : "Copy"}</span>
                    </button>
                  </div>
                </div>

                <div>
                  <label className="text-[10px] font-bold uppercase tracking-wider text-[#97A0B3] block mb-1">
                    Temporary Password
                  </label>
                  <div className="flex items-center justify-between bg-[#161F2D] px-3.5 py-2.5 rounded-xl border border-[#2A3446]">
                    <span className="text-xs font-mono font-bold text-emerald-400 truncate select-all">
                      {bdeProvisionedCreds.password}
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        navigator.clipboard.writeText(bdeProvisionedCreds.password);
                        setBdeCopiedKey("password");
                        setTimeout(() => setBdeCopiedKey(null), 2000);
                      }}
                      className="text-xs font-bold text-amber-400 hover:text-white flex items-center gap-1 cursor-pointer ml-2 shrink-0"
                    >
                      {bdeCopiedKey === "password" ? <Check className="size-3.5 text-emerald-400" /> : <Copy className="size-3.5" />}
                      <span>{bdeCopiedKey === "password" ? "Copied" : "Copy"}</span>
                    </button>
                  </div>
                </div>

                {bdeProvisionedCreds.dispatch_email && bdeProvisionedCreds.dispatch_email.toLowerCase() !== bdeProvisionedCreds.email.toLowerCase() && (
                  <div>
                    <label className="text-[10px] font-bold uppercase tracking-wider text-amber-400 block mb-1">
                      Delivered To (Personal Email)
                    </label>
                    <div className="flex items-center justify-between bg-[#161F2D] px-3.5 py-2.5 rounded-xl border border-amber-500/30">
                      <span className="text-xs font-mono font-bold text-amber-300 truncate select-all">
                        {bdeProvisionedCreds.dispatch_email}
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          navigator.clipboard.writeText(bdeProvisionedCreds.dispatch_email!);
                          setBdeCopiedKey("dispatch");
                          setTimeout(() => setBdeCopiedKey(null), 2000);
                        }}
                        className="text-xs font-bold text-amber-400 hover:text-white flex items-center gap-1 cursor-pointer ml-2 shrink-0"
                      >
                        {bdeCopiedKey === "dispatch" ? <Check className="size-3.5 text-emerald-400" /> : <Copy className="size-3.5" />}
                        <span>{bdeCopiedKey === "dispatch" ? "Copied" : "Copy"}</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>

              <div className="flex items-center gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => {
                    const text = `Creo BDE Login Credentials:\nName: ${bdeProvisionedCreds.full_name}\nEmail: ${bdeProvisionedCreds.email}\nPassword: ${bdeProvisionedCreds.password}\nPortal: ${window.location.origin}/login`;
                    navigator.clipboard.writeText(text);
                    setBdeCopiedKey("all");
                    setTimeout(() => setBdeCopiedKey(null), 2000);
                  }}
                  className="flex-1 py-2.5 px-3 rounded-xl bg-[#0B111C] hover:bg-[#2A3446] border border-[#2A3446] text-white text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer transition-colors"
                >
                  {bdeCopiedKey === "all" ? <Check className="size-3.5 text-emerald-400" /> : <Copy className="size-3.5 text-amber-400" />}
                  <span>{bdeCopiedKey === "all" ? "Credentials Copied!" : "Copy Full Details"}</span>
                </button>
                <button
                  type="button"
                  onClick={() => setBdeProvisionedCreds(null)}
                  className="py-2.5 px-5 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold cursor-pointer transition-colors"
                >
                  Done
                </button>
              </div>
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
  const { user } = useAuth();
  if (user?.role === "sales") {
    return <Navigate to="/bde/leave" replace />;
  }
  if (user?.role === "freelancer") {
    return <Navigate to="/freelancer/leave" replace />;
  }
  if (user?.role === "editor" || user?.role === "designer") {
    return <Navigate to="/workstation/schedule" replace />;
  }

  const [toast, setToast] = useState<string | null>(null);
  const [filterTab, setFilterTab] = useState<"pending" | "approved" | "rejected">("pending");
  const [isApplyModalOpen, setIsApplyModalOpen] = useState(false);
  const [applyStartDate, setApplyStartDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [applyEndDate, setApplyEndDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [applyReason, setApplyReason] = useState("");
  const [isSubmittingApply, setIsSubmittingApply] = useState(false);

  const { data: dbLeaves = [], refetch } = useQuery<LeaveRequestItem[]>({
    queryKey: ["admin_leave_requests"],
    queryFn: fetchLeaveRequests,
    staleTime: 10_000,
  });

  const { data: teamRoster = [] } = useQuery<TeamMemberItem[]>({
    queryKey: ["admin_teams_roster"],
    queryFn: fetchTeamMembers,
    staleTime: 30_000,
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
    } catch (err: any) {
      setToast(err?.message || "Failed to update leave request status");
    }
    setToast(`Leave request ${action} successfully.`);
    setTimeout(() => setToast(null), 3500);
  };

  const handleApplyLeave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!applyStartDate || !applyEndDate || !applyReason.trim()) return;
    setIsSubmittingApply(true);
    try {
      await submitLeaveRequest({
        start_date: applyStartDate,
        end_date: applyEndDate,
        reason: applyReason.trim(),
      });
      setToast("Time-off request submitted successfully!");
      setIsApplyModalOpen(false);
      setApplyReason("");
      refetch();
    } catch (err: any) {
      setToast(err?.message || "Failed to submit leave request.");
    } finally {
      setIsSubmittingApply(false);
      setTimeout(() => setToast(null), 4000);
    }
  };

  const filteredRequests = leaveRequests.filter(
    (lr) => lr.status === filterTab
  );

  // Dynamic Attendance Calculation
  const todayStr = useMemo(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
  }, []);

  const actualOnLeaveToday = useMemo(() => {
    return leaveRequests.filter(
      (l) => l.status === "approved" && (l.is_on_leave_today || (l.start_date <= todayStr && l.end_date >= todayStr))
    );
  }, [leaveRequests, todayStr]);

  const totalMembersCount = teamRoster.length > 0 ? teamRoster.length : 12;
  const inOfficeCount = Math.max(0, totalMembersCount - actualOnLeaveToday.length);
  const inOfficePct = Math.round((inOfficeCount / totalMembersCount) * 100);

  const getRoleBadgeStyle = (role?: string) => {
    const r = (role || "").toLowerCase();
    if (r.includes("lead")) return "bg-blue-500/15 text-[#7FA0D6] border-blue-500/30";
    if (r.includes("designer") || r.includes("design")) return "bg-purple-500/15 text-purple-300 border-purple-500/30";
    if (r.includes("editor") || r.includes("video")) return "bg-emerald-500/15 text-emerald-300 border-emerald-500/30";
    if (r.includes("sales") || r.includes("bde")) return "bg-amber-500/15 text-amber-300 border-amber-500/30";
    if (r.includes("admin")) return "bg-sky-500/15 text-sky-300 border-sky-500/30";
    return "bg-[#161F2D] text-slate-300 border-[#2A3446]";
  };

  const cleanPodName = (podRaw?: string | null) => {
    if (!podRaw) return "";
    let clean = podRaw.trim();
    // Remove repeated "(Pod X)" or "(Pod B)" e.g. "Pod Beta (Pod B)" -> "Pod Beta"
    clean = clean.replace(/\s*\(\s*pod\s*([a-z0-9]+)\s*\)/gi, "");
    clean = clean.replace(/\s*\(\s*pod\s*\)/gi, "");
    clean = clean.replace(/\s*\(\s*bde\s*\)/gi, "");
    clean = clean.replace(/\s*\(\s*(lead|designer|editor|specialist)\s*-\s*pod\s*([a-z0-9]+)\s*\)/gi, "");
    clean = clean.replace(/[\s•·\-–—]+$/, "").trim();
    clean = clean.replace(/^[\s•·\-–—]+/, "").trim();
    return clean;
  };

  const getPodBadge = (lr: LeaveRequestItem) => {
    if (lr.pod_name) return cleanPodName(lr.pod_name);
    const email = (lr.employee_email || lr.email || "").toLowerCase();
    const tl = (lr.team_lead_name || "").toLowerCase();
    const role = (lr.role || lr.user_role || "").toLowerCase();
    if (email.includes(".alpha") || tl.includes("vikram")) return "Pod Alpha";
    if (email.includes(".beta") || tl.includes("sarah")) return "Pod Beta";
    if (email.includes(".gamma") || tl.includes("rohan")) return "Pod Gamma";
    if (role.includes("sales") || role.includes("bde")) return "Sales & Outreach";
    if (role.includes("admin")) return "Operations Leadership";
    if (lr.department) return cleanPodName(`${lr.department.toUpperCase()} Squad`);
    return "Creative Squad";
  };

  const parseLeaveReason = (rawReason?: string | null) => {
    const raw = (rawReason || "").trim();
    if (!raw) {
      return {
        category: "Scheduled Time Off",
        notes: "",
        tagType: "general" as const,
      };
    }

    const bracketMatch = raw.match(/^\[(.*?)\]\s*(.*)$/s);
    if (bracketMatch && bracketMatch[1]) {
      let category = bracketMatch[1].trim();
      let notes = (bracketMatch[2] || "").trim();
      notes = notes.replace(/^[,;:\-\s]+/, "").trim();

      const catLower = category.toLowerCase();
      let tagType: "casual" | "sick" | "blackout" | "vacation" | "general" = "general";
      if (catLower.includes("sick") || catLower.includes("medical") || catLower.includes("health")) {
        tagType = "sick";
        if (category.length > 20) category = "Sick Leave";
      } else if (catLower.includes("blackout") || catLower.includes("freelancer") || catLower.includes("studio")) {
        tagType = "blackout";
        if (category.length > 20) category = "Studio Blackout";
      } else if (catLower.includes("casual") || catLower.includes("personal")) {
        tagType = "casual";
        if (category.length > 20) category = "Casual Leave";
      } else if (catLower.includes("vacation") || catLower.includes("annual") || catLower.includes("holiday")) {
        tagType = "vacation";
        if (category.length > 20) category = "Vacation";
      }

      return { category, notes, tagType };
    }

    const lower = raw.toLowerCase();
    if (
      lower.includes("fever") ||
      lower.includes("sick") ||
      lower.includes("doctor") ||
      lower.includes("hospital") ||
      lower.includes("headache") ||
      lower.includes("cold") ||
      lower.includes("unwell")
    ) {
      return {
        category: "Sick / Medical Leave",
        notes: raw,
        tagType: "sick" as const,
      };
    }
    if (
      lower.includes("family") ||
      lower.includes("function") ||
      lower.includes("wedding") ||
      lower.includes("personal") ||
      lower.includes("casual") ||
      lower.includes("emergency")
    ) {
      return {
        category: "Personal / Casual Leave",
        notes: raw,
        tagType: "casual" as const,
      };
    }
    if (lower.includes("vacation") || lower.includes("travel") || lower.includes("trip")) {
      return {
        category: "Vacation / Travel",
        notes: raw,
        tagType: "vacation" as const,
      };
    }
    if (lower.includes("blackout") || lower.includes("maintenance")) {
      return {
        category: "Studio Blackout",
        notes: raw,
        tagType: "blackout" as const,
      };
    }

    return {
      category: "Time Off Request",
      notes: raw,
      tagType: "general" as const,
    };
  };

  const calculateDays = (start: string, end: string) => {
    try {
      const s = new Date(start);
      const e = new Date(end);
      const diff = Math.round((e.getTime() - s.getTime()) / (1000 * 60 * 60 * 24)) + 1;
      return diff > 0 ? diff : 1;
    } catch {
      return 1;
    }
  };

  return (
    <div data-surface="ops" className="w-full min-h-screen font-sans bg-[#0B111C] flex flex-col">
      <AdminTopHeader activeTab="Team Details" />
      <main className="flex-1 px-3.5 sm:px-6 lg:px-8 pt-6 sm:pt-8 pb-24 sm:pb-16 max-w-[1500px] w-full mx-auto space-y-6">
        {toast && (
          <div className="p-4 bg-emerald-950/60 border border-emerald-800/60 text-emerald-300 text-xs font-bold rounded-2xl flex items-center justify-between shadow-xl backdrop-blur-md animate-fade-in">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>{toast}</span>
            </div>
            <button onClick={() => setToast(null)} className="text-emerald-400 hover:text-emerald-200 font-bold cursor-pointer">
              Dismiss
            </button>
          </div>
        )}

        <div className="grid grid-cols-2 sm:flex sm:flex-row sm:items-center sm:justify-end gap-2 sm:gap-3 w-full pb-2">
          <Link
            to="/admin/team"
            className="w-full sm:w-auto justify-center px-2.5 sm:px-3.5 py-2.5 sm:py-2 rounded-xl bg-[#161F2D] hover:bg-[#2A3446] border border-[#2A3446] text-white text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer active:scale-95 truncate text-center"
          >
            <UserCog className="w-4 h-4 text-[#7FA0D6] shrink-0" />
            <span className="truncate">Team Roster &amp; Pods</span>
          </Link>
          <button
            type="button"
            onClick={() => setIsApplyModalOpen(true)}
            className="w-full sm:w-auto justify-center px-2.5 sm:px-4 py-2.5 sm:py-2 rounded-xl bg-[#7FA0D6] hover:bg-blue-600 text-white text-xs font-bold flex items-center gap-1.5 shadow-md shadow-blue-500/20 cursor-pointer transition-all active:scale-95 truncate text-center"
          >
            <Plus className="w-4 h-4 shrink-0" />
            <span className="truncate">Apply for Time Off</span>
          </button>
        </div>

        {/* 2 Top KPI Summary Cards - Ultra Compact 2-Column Grid */}
        <div className="grid grid-cols-2 gap-2 sm:gap-4">
          {/* Card 1: PEOPLE WORKING TODAY */}
          <div className="bg-[#161F2D] rounded-xl sm:rounded-2xl p-2.5 sm:p-4 border border-[#2A3446] shadow-sm flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between gap-1 mb-1">
                <span className="text-[9px] sm:text-[10px] font-extrabold text-[#97A0B3] uppercase tracking-wider truncate">
                  WORKING TODAY
                </span>
                <div className="w-5 h-5 sm:w-6 sm:h-6 rounded-md sm:rounded-lg bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 flex items-center justify-center font-bold shrink-0">
                  <Users className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
                </div>
              </div>
              <div className="flex items-baseline gap-1 sm:gap-1.5 mt-0.5">
                <span className="text-lg sm:text-2xl font-black text-white tracking-tight">{inOfficeCount}</span>
                <span className="text-[10px] sm:text-xs font-bold text-emerald-400 truncate">Present</span>
                <span className="text-[9px] sm:text-xs font-medium text-[#97A0B3] hidden xs:inline">/ {totalMembersCount}</span>
              </div>
            </div>

            <div className="mt-1.5 sm:mt-2 pt-1.5 sm:pt-2 border-t border-[#2A3446] flex items-center justify-between gap-1 text-[9px] sm:text-xs font-semibold">
              <span className="flex items-center gap-1 text-emerald-400 truncate">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse shrink-0" />
                <span className="truncate">{inOfficePct}% In-Office</span>
              </span>
              <span className="text-[#97A0B3] text-[9px] sm:text-[10px] font-medium shrink-0 hidden xs:inline">
                {totalMembersCount} Total
              </span>
            </div>
          </div>

          {/* Card 2: ON LEAVE TODAY */}
          <div className="bg-[#161F2D] rounded-xl sm:rounded-2xl p-2.5 sm:p-4 border border-[#2A3446] shadow-sm flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between gap-1 mb-1">
                <span className="text-[9px] sm:text-[10px] font-extrabold text-[#97A0B3] uppercase tracking-wider truncate">
                  ON LEAVE TODAY
                </span>
                <div className="w-5 h-5 sm:w-6 sm:h-6 rounded-md sm:rounded-lg bg-amber-500/15 text-amber-400 border border-amber-500/30 flex items-center justify-center font-bold shrink-0">
                  <Plane className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
                </div>
              </div>
              <div className="flex items-baseline gap-1 sm:gap-1.5 mt-0.5">
                <span className="text-lg sm:text-2xl font-black text-white tracking-tight">{actualOnLeaveToday.length}</span>
                <span className="text-[10px] sm:text-xs font-bold text-amber-400 truncate">Away</span>
                <span className="text-[9px] sm:text-xs font-medium text-[#97A0B3] hidden xs:inline">({totalMembersCount - actualOnLeaveToday.length} in)</span>
              </div>
            </div>

            <div className="mt-1.5 sm:mt-2 pt-1.5 sm:pt-2 border-t border-[#2A3446]">
              {actualOnLeaveToday.length > 0 ? (
                <div className="flex items-center justify-between gap-1 text-[9px] sm:text-xs">
                  <span className="flex items-center gap-1 text-amber-300 font-bold truncate">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse shrink-0" />
                    <span className="truncate">{actualOnLeaveToday.map((m) => m.employee_name || m.user_name || "Specialist").join(", ")}</span>
                  </span>
                  <span className="text-amber-400 text-[9px] sm:text-[10px] font-bold shrink-0">{actualOnLeaveToday.length} away</span>
                </div>
              ) : (
                <div className="flex items-center justify-between gap-1 text-[9px] sm:text-xs font-semibold text-emerald-400">
                  <span className="flex items-center gap-1 truncate">
                    <CheckCircle2 className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-emerald-400 shrink-0" />
                    <span className="truncate">Full Capacity</span>
                  </span>
                  <span className="text-[#97A0B3] text-[9px] sm:text-[10px] font-medium shrink-0">0 away</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Requests Table */}
        <div className="rounded-2xl border border-[#2A3446] bg-[#161F2D] shadow-xl overflow-hidden">
          <div className="p-4 border-b border-[#2A3446] flex flex-wrap items-center justify-between gap-3 bg-[#0B111C]/60">
            <div className="grid grid-cols-3 w-full sm:w-auto sm:flex items-center gap-1 sm:gap-1.5 bg-[#161F2D] p-1 rounded-xl text-xs border border-[#2A3446]">
              {(["pending", "approved", "rejected"] as const).map((tab) => (
                <button
                  key={tab}
                  type="button"
                  onClick={() => setFilterTab(tab)}
                  className={`w-full sm:w-auto px-2 sm:px-3 py-1.5 rounded-lg capitalize font-bold transition-all cursor-pointer text-center justify-center truncate text-[11px] sm:text-xs ${
                    filterTab === tab ? "bg-[#7FA0D6] text-[#0B111C] shadow-sm font-extrabold" : "text-[#97A0B3] hover:text-white"
                  }`}
                >
                  {`${tab} (${leaveRequests.filter((l) => l.status === tab).length})`}
                </button>
              ))}
            </div>

            <div className="text-xs text-[#97A0B3] font-medium">
              Showing {filteredRequests.length} leave application records
            </div>
          </div>

          {/* Mobile View: Compact, Neat Record Cards (Zero horizontal scroll, 60% less height) */}
          <div className="block md:hidden divide-y divide-[#2A3446]/60">
            {filteredRequests.length === 0 ? (
              <div className="p-8 text-center text-[#97A0B3] text-xs">
                No leave applications found for this filter tab.
              </div>
            ) : (
              filteredRequests.map((lr) => {
                const empName =
                  lr.employee_name ||
                  lr.user_name ||
                  (lr as any).name ||
                  (lr.employee_email ? (lr.employee_email.split("@")[0] || "").toUpperCase() : "Team Member");
                const rawRole = (lr.role || (lr as any).role_raw || lr.user_role || "").toLowerCase();
                const domain =
                  lr.domain ||
                  lr.department ||
                  (rawRole === "sales"
                    ? "BDE"
                    : rawRole === "freelancer"
                    ? "Freelancer"
                    : rawRole === "team_lead"
                    ? "Team Lead"
                    : lr.role_display || "Specialist");
                const isBDE = rawRole === "sales" || domain.toLowerCase().includes("bde");
                const isFreelancer = rawRole === "freelancer" || domain.toLowerCase().includes("freelancer");
                const roleLabel = isBDE
                  ? "BDE"
                  : isFreelancer
                  ? "Freelancer"
                  : (lr.role_display || (lr.role ? lr.role.replace("_", " ").toUpperCase() : "Specialist"));
                const podName = getPodBadge(lr);
                const isAwayToday = lr.status === "approved" && (lr.is_on_leave_today || (lr.start_date <= todayStr && lr.end_date >= todayStr));
                const daysCount = calculateDays(lr.start_date, lr.end_date);
                const { category, notes, tagType } = parseLeaveReason(lr.reason);

                return (
                  <div key={lr.id} className="p-3.5 space-y-2 hover:bg-[#0B111C]/40 transition-colors">
                    {/* Header Row: Specialist + Status */}
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="relative shrink-0">
                          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-[#1E293B] to-[#334155] border border-[#2A3446] text-white font-extrabold text-[11px] flex items-center justify-center shadow-xs">
                            {empName.slice(0, 2).toUpperCase()}
                          </div>
                          <span
                            className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full ring-2 ring-[#161F2D] ${
                              isAwayToday ? "bg-amber-400" : "bg-emerald-400"
                            }`}
                          />
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5 truncate">
                            <span className="font-bold text-xs text-white truncate">{empName}</span>
                            {isAwayToday && (
                              <span className="px-1.5 py-0.2 rounded-full text-[8.5px] font-black uppercase tracking-wider bg-amber-500/20 text-amber-300 border border-amber-500/30 shrink-0">
                                Away
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-1 text-[10px] text-[#97A0B3] truncate">
                            <span className="text-[#7FA0D6] font-semibold">{podName}</span>
                            <span>•</span>
                            <span className="truncate">{roleLabel}</span>
                          </div>
                        </div>
                      </div>

                      {/* Status Badge */}
                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[9.5px] font-extrabold uppercase tracking-wider border shrink-0 ${
                          lr.status === "approved"
                            ? "bg-emerald-500/15 text-emerald-300 border-emerald-500/30"
                            : lr.status === "rejected"
                            ? "bg-rose-500/15 text-rose-300 border-rose-500/30"
                            : "bg-amber-500/15 text-amber-300 border-amber-500/30 animate-pulse"
                        }`}
                      >
                        <span
                          className={`w-1.5 h-1.5 rounded-full ${
                            lr.status === "approved"
                              ? "bg-emerald-400"
                              : lr.status === "rejected"
                              ? "bg-rose-400"
                              : "bg-amber-400"
                          }`}
                        />
                        {lr.status}
                      </span>
                    </div>

                    {/* Dates & Reason Container: 2-line layout that NEVER breaks across hyphens */}
                    <div className="bg-[#0B111C]/80 p-2.5 rounded-xl border border-[#2A3446]/60 space-y-2">
                      {/* Line 1: Date Range & Duration */}
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-1.5 font-mono text-[11px] sm:text-xs text-white min-w-0">
                          <Calendar className="w-3.5 h-3.5 text-[#7FA0D6] shrink-0" />
                          <span className="whitespace-nowrap font-bold">
                            {lr.start_date === lr.end_date ? (
                              <span>{lr.start_date} <span className="font-sans font-normal text-[#97A0B3] text-[10px]">(1 day)</span></span>
                            ) : (
                              <span>{lr.start_date} &rarr; {lr.end_date}</span>
                            )}
                          </span>
                        </div>
                        <span className="text-[10px] font-bold text-[#7FA0D6] bg-[#7FA0D6]/15 px-2 py-0.5 rounded-full border border-[#7FA0D6]/30 whitespace-nowrap shrink-0">
                          {daysCount} {daysCount === 1 ? "day" : "days"}
                        </span>
                      </div>

                      {/* Line 2: Category Pill + Note (Cleanly aligned, never pushes out of container) */}
                      <div className="flex items-center gap-2 pt-1.5 border-t border-[#2A3446]/50">
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-wider border shrink-0 ${
                            tagType === "sick"
                              ? "bg-rose-500/15 text-rose-300 border-rose-500/30"
                              : tagType === "blackout"
                              ? "bg-purple-500/15 text-purple-300 border-purple-500/30"
                              : tagType === "casual"
                              ? "bg-indigo-500/15 text-indigo-300 border-indigo-500/30"
                              : tagType === "vacation"
                              ? "bg-emerald-500/15 text-emerald-300 border-emerald-500/30"
                              : "bg-blue-500/15 text-[#7FA0D6] border-[#7FA0D6]/30"
                          }`}
                        >
                          <span>{category}</span>
                        </span>

                        {notes && (
                          <span className="text-[10.5px] text-[#BCCCE6] font-medium truncate flex-1 min-w-0" title={notes}>
                            Note: "{notes}"
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Actions / Approver Details */}
                    {lr.status === "pending" ? (
                      <div className="flex items-center justify-end gap-2 pt-1">
                        <button
                          type="button"
                          onClick={() => handleAction(lr.id, "approved")}
                          className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-xs transition-all cursor-pointer flex items-center gap-1"
                        >
                          <Check className="w-3.5 h-3.5" /> Approve
                        </button>
                        <button
                          type="button"
                          onClick={() => handleAction(lr.id, "rejected")}
                          className="px-3 py-1.5 rounded-xl bg-rose-600/80 hover:bg-rose-600 text-white font-bold text-xs shadow-xs transition-all cursor-pointer flex items-center gap-1"
                        >
                          <X className="w-3.5 h-3.5" /> Reject
                        </button>
                      </div>
                    ) : lr.approved_by_name ? (
                      <div className="flex items-center justify-between text-[10px] text-[#97A0B3] pt-0.5">
                        <span className="text-emerald-400 font-semibold flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3" /> Signed off
                        </span>
                        <span>Authorized by {lr.approved_by_name}</span>
                      </div>
                    ) : null}
                  </div>
                );
              })
            )}
          </div>

          {/* Desktop View: Streamlined Compact Table */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-left text-xs text-white">
              <thead className="bg-[#0B111C] border-b border-[#2A3446] text-[10px] font-bold uppercase tracking-wider text-[#97A0B3]">
                <tr>
                  <th className="px-4 py-3">Specialist & Team</th>
                  <th className="px-4 py-3">Dates & Duration</th>
                  <th className="px-4 py-3">Reason / Notes</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Action / Approver</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#2A3446]/60 font-medium">
                {filteredRequests.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-10 text-center text-[#97A0B3] text-xs">
                      No leave applications found for this filter tab.
                    </td>
                  </tr>
                ) : (
                  filteredRequests.map((lr) => {
                    const empName =
                      lr.employee_name ||
                      lr.user_name ||
                      (lr as any).name ||
                      (lr.employee_email ? (lr.employee_email.split("@")[0] || "").toUpperCase() : "Team Member");
                    const empEmail = lr.employee_email || lr.email || "staff@creo.agency";
                    const rawRole = (lr.role || (lr as any).role_raw || lr.user_role || "").toLowerCase();
                    const domain =
                      lr.domain ||
                      lr.department ||
                      (rawRole === "sales"
                        ? "BDE (Business Development)"
                        : rawRole === "freelancer"
                        ? "Freelancer"
                        : rawRole === "team_lead"
                        ? "Team Lead"
                        : lr.role_display || "Specialist");
                    const isBDE = rawRole === "sales" || domain.toLowerCase().includes("bde");
                    const isFreelancer = rawRole === "freelancer" || domain.toLowerCase().includes("freelancer");
                    const roleLabel = isBDE
                      ? "BDE"
                      : isFreelancer
                      ? "FREELANCER"
                      : (lr.role_display || (lr.role ? lr.role.replace("_", " ").toUpperCase() : "SPECIALIST"));
                    const podName = getPodBadge(lr);
                    const isAwayToday = lr.status === "approved" && (lr.is_on_leave_today || (lr.start_date <= todayStr && lr.end_date >= todayStr));
                    const daysCount = calculateDays(lr.start_date, lr.end_date);

                    return (
                      <tr key={lr.id} className="hover:bg-[#0B111C]/40 transition-colors">
                        {/* 1. Specialist & Team */}
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            <div className="relative shrink-0">
                              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#1E293B] to-[#334155] border border-[#2A3446] text-white font-extrabold text-xs flex items-center justify-center shadow-xs">
                                {empName.slice(0, 2).toUpperCase()}
                              </div>
                              <span
                                className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full ring-2 ring-[#161F2D] ${
                                  isAwayToday ? "bg-amber-400" : "bg-emerald-400"
                                }`}
                                title={isAwayToday ? "On Leave Today" : "Active Member"}
                              />
                            </div>
                            <div className="min-w-0">
                              <div className="font-bold text-sm text-white flex items-center gap-2 flex-wrap">
                                <span>{empName}</span>
                                {isAwayToday && (
                                  <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-amber-500/20 text-amber-300 border border-amber-500/30">
                                    Away Today
                                  </span>
                                )}
                              </div>
                              <div className="flex items-center gap-1.5 flex-wrap mt-0.5">
                                <span
                                  className={`px-2 py-0.5 rounded-md text-[10px] font-bold border ${
                                    isBDE
                                      ? "bg-blue-500/20 text-[#7FA0D6] border-[#7FA0D6]/40"
                                      : isFreelancer
                                      ? "bg-purple-500/20 text-purple-300 border-purple-500/40"
                                      : getRoleBadgeStyle(lr.role || lr.user_role)
                                  }`}
                                >
                                  {roleLabel}
                                </span>
                                <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-[#0B111C] border border-[#2A3446] text-slate-300">
                                  {podName}
                                </span>
                                {lr.team_lead_name && lr.team_lead_name !== "Unassigned Lead" && (
                                  <span className="text-[10px] text-[#97A0B3] font-medium bg-[#161F2D] px-2 py-0.5 rounded-md border border-[#2A3446]/60">
                                    Lead: {lr.team_lead_name}
                                  </span>
                                )}
                              </div>
                              <div className="text-[10px] text-[#97A0B3] font-mono mt-0.5 truncate">{empEmail}</div>
                            </div>
                          </div>
                        </td>

                        {/* 2. Dates & Duration */}
                        <td className="px-4 py-3">
                          <div className="space-y-1">
                            <div className="font-mono text-xs font-bold text-white flex items-center gap-1.5">
                              <Calendar className="w-3.5 h-3.5 text-[#7FA0D6]" />
                              <span>{lr.start_date}</span>
                              <span className="text-[#97A0B3]">&rarr;</span>
                              <span>{lr.end_date}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="px-2 py-0.5 rounded-md bg-[#0B111C] border border-[#2A3446] text-[10px] font-bold text-[#7FA0D6]">
                                {daysCount} {daysCount === 1 ? "Day" : "Days"} Duration
                              </span>
                              {lr.created_at_ist && (
                                <span className="text-[10px] text-[#97A0B3]">
                                  Submitted {lr.created_at_ist}
                                </span>
                              )}
                            </div>
                          </div>
                        </td>

                        {/* 3. Reason / Notes */}
                        <td className="px-4 py-3 max-w-sm">
                          {(() => {
                            const { category, notes, tagType } = parseLeaveReason(lr.reason);
                            return (
                              <div className="flex flex-col gap-1.5 bg-[#0B111C]/60 p-2 rounded-xl border border-[#2A3446]/80 hover:border-[#7FA0D6]/40 transition-colors">
                                <div className="flex items-center gap-1.5">
                                  <span
                                    className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider border ${
                                      tagType === "sick"
                                        ? "bg-rose-500/15 text-rose-300 border-rose-500/30"
                                        : tagType === "blackout"
                                        ? "bg-purple-500/15 text-purple-300 border-purple-500/30"
                                        : tagType === "casual"
                                        ? "bg-indigo-500/15 text-indigo-300 border-indigo-500/30"
                                        : tagType === "vacation"
                                        ? "bg-emerald-500/15 text-emerald-300 border-emerald-500/30"
                                        : "bg-blue-500/15 text-[#7FA0D6] border-[#7FA0D6]/30"
                                    }`}
                                  >
                                    {tagType === "sick" && <AlertCircle className="w-3 h-3 text-rose-400" />}
                                    {tagType === "blackout" && <ShieldCheck className="w-3 h-3 text-purple-400" />}
                                    {tagType === "casual" && <Calendar className="w-3 h-3 text-indigo-400" />}
                                    {tagType === "vacation" && <Plane className="w-3 h-3 text-emerald-400" />}
                                    {tagType === "general" && <FileText className="w-3 h-3 text-[#7FA0D6]" />}
                                    <span>{category}</span>
                                  </span>
                                </div>
                                {notes ? (
                                  <p className="text-xs text-[#F1F5F9] font-medium leading-relaxed pl-2 border-l-2 border-[#7FA0D6]/40 break-words">
                                    {notes}
                                  </p>
                                ) : (
                                  <p className="text-[10px] text-[#97A0B3] italic pl-2 border-l-2 border-[#2A3446]">
                                    No additional notes provided
                                  </p>
                                )}
                              </div>
                            );
                          })()}
                        </td>

                        {/* 4. Status */}
                        <td className="px-4 py-3 whitespace-nowrap">
                          <span
                            className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider border ${
                              lr.status === "approved"
                                ? "bg-emerald-500/15 text-emerald-300 border-emerald-500/30"
                                : lr.status === "rejected"
                                ? "bg-rose-500/15 text-rose-300 border-rose-500/30"
                                : "bg-amber-500/15 text-amber-300 border-amber-500/30 animate-pulse"
                            }`}
                          >
                            <span
                              className={`w-1.5 h-1.5 rounded-full ${
                                lr.status === "approved"
                                  ? "bg-emerald-400"
                                  : lr.status === "rejected"
                                  ? "bg-rose-400"
                                  : "bg-amber-400"
                              }`}
                            />
                            {lr.status}
                          </span>
                        </td>

                        {/* 5. Actions / Approver */}
                        <td className="px-4 py-3 text-right whitespace-nowrap">
                          {lr.status === "pending" ? (
                            <div className="flex items-center justify-end gap-2">
                              <button
                                type="button"
                                onClick={() => handleAction(lr.id, "approved")}
                                className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-xs transition-all cursor-pointer flex items-center gap-1"
                              >
                                <Check className="w-3.5 h-3.5" /> Approve
                              </button>
                              <button
                                type="button"
                                onClick={() => handleAction(lr.id, "rejected")}
                                className="px-3 py-1.5 rounded-xl bg-rose-600/80 hover:bg-rose-600 text-white font-bold text-xs shadow-xs transition-all cursor-pointer flex items-center gap-1"
                              >
                                <X className="w-3.5 h-3.5" /> Reject
                              </button>
                            </div>
                          ) : (
                            <div className="text-right">
                              <span className="text-[11px] text-[#97A0B3] font-semibold block">
                                {lr.status === "approved" ? "Authorized" : "Rejected"}
                              </span>
                              {lr.approved_by_name && (
                                <span className="text-[10px] text-slate-400 block mt-0.5">
                                  by {lr.approved_by_name}
                                </span>
                              )}
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Working Apply for Time Off Modal */}
        {isApplyModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm animate-fade-in">
            <div className="w-full max-w-md rounded-3xl bg-[#161F2D] p-6 shadow-2xl space-y-4 border border-[#2A3446]">
              <div className="flex items-center justify-between border-b border-[#2A3446] pb-3">
                <div>
                  <h3 className="text-base font-bold text-white">Apply for Time Off</h3>
                  <p className="text-xs text-[#97A0B3]">Submit a leave schedule to administrative operations</p>
                </div>
                <button
                  type="button"
                  onClick={() => setIsApplyModalOpen(false)}
                  className="p-1.5 rounded-xl text-[#97A0B3] hover:text-white hover:bg-[#0B111C] cursor-pointer transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleApplyLeave} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-[#97A0B3] uppercase tracking-wider mb-1">
                      Start Date
                    </label>
                    <input
                      type="date"
                      required
                      value={applyStartDate}
                      onChange={(e) => setApplyStartDate(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-[#0B111C] border border-[#2A3446] text-xs text-white focus:outline-none focus:border-[#7FA0D6]"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-[#97A0B3] uppercase tracking-wider mb-1">
                      End Date
                    </label>
                    <input
                      type="date"
                      required
                      value={applyEndDate}
                      onChange={(e) => setApplyEndDate(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-[#0B111C] border border-[#2A3446] text-xs text-white focus:outline-none focus:border-[#7FA0D6]"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-[#97A0B3] uppercase tracking-wider mb-1">
                    Reason & Notes
                  </label>
                  <textarea
                    rows={3}
                    required
                    value={applyReason}
                    onChange={(e) => setApplyReason(e.target.value)}
                    placeholder="e.g. [Casual Leave] Personal errands or family function..."
                    className="w-full px-3 py-2.5 rounded-xl bg-[#0B111C] border border-[#2A3446] text-xs text-white focus:outline-none focus:border-[#7FA0D6] resize-none placeholder:text-[#97A0B3]/50"
                  />
                </div>

                <div className="flex justify-end gap-2.5 pt-3 border-t border-[#2A3446]">
                  <button
                    type="button"
                    onClick={() => setIsApplyModalOpen(false)}
                    className="px-4 py-2 rounded-xl border border-[#2A3446] text-xs font-bold text-[#97A0B3] hover:text-white hover:bg-[#0B111C] cursor-pointer transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmittingApply || !applyReason.trim()}
                    className="px-5 py-2 rounded-xl bg-[#7FA0D6] hover:bg-blue-600 text-white text-xs font-bold shadow-md shadow-blue-500/20 cursor-pointer disabled:opacity-50 transition-all flex items-center gap-1.5"
                  >
                    {isSubmittingApply ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                    <span>{isSubmittingApply ? "Submitting..." : "Submit Application"}</span>
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
  client_id?: string;
  client_email?: string;
  raw_sub_id?: string;
  is_paid?: boolean;
  is_onboarded?: boolean;
  lifecycle_status?: "onboarded" | "paid_not_onboarded" | "not_paid";
}

export interface PlanNegotiationItem {
  id: string;
  clientId?: string | null;
  clientName: string;
  clientLogo: string;
  clientEmail?: string;
  targetTopic: string;
  proposedOffer: string | null;
  phoneNumber: string;
  preferredTime: string;
  notes: string | null;
  requestedAt: string | null;
  status: "Pending Review" | "Accepted" | "Declined" | "Counter Offered" | "Proposal Sent" | string;
  counterPrice?: number | null;
  agreedAmount?: number | null;
  counterNote?: string | null;
  declineReason?: string | null;
  reelQuota?: number | null;
  posterQuota?: number | null;
  storyQuota?: number | null;
}

export function AdminRevenuePage() {
  const [filter, setFilter] = useState<string>("all");
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

  // Transactions Data (In real app, fetch from backend)
  const { data: serverTransactions } = useQuery({
    queryKey: ["admin_transactions"],
    queryFn: () => fetchAdminTransactions(),
    refetchInterval: 60000,
  });

  const [localTransactions, setLocalTransactions] = useState<TransactionItem[]>([]);

  const mappedServer = (serverTransactions || []).map((t: any, idx: number) => {
    // Determine badge class dynamically based on status (all verified transactions are Paid)
    const status = t.status || "Paid";
    let badgeClass = "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 font-black";
    if (status === "Overdue" || status === "Refunded/Cancelled") badgeClass = "bg-rose-500/20 text-rose-400 border border-rose-500/30 font-black";
    else if (status === "Pending") badgeClass = "bg-amber-500/20 text-amber-400 border border-amber-500/30 font-bold";

    // Dynamic avatar color
    const colors = ["bg-blue-600", "bg-emerald-600", "bg-purple-600", "bg-amber-600", "bg-[#7FA0D6]"];
    const avatarBg = `${colors[idx % colors.length]} text-white font-black`;
    
    return {
      ...t,
      badgeClass,
      avatarBg,
      clientInitials: (t.client || "").split(" ").map((w: string) => w[0]).join("").toUpperCase().slice(0, 2),
    };
  });

  const transactions = [...localTransactions, ...mappedServer];

  // Fetch real KPI data for MRR
  const { data: kpis } = useQuery({
    queryKey: ["admin_kpis"],
    queryFn: () => fetchAdminKPIs("30d"),
    refetchInterval: 60000,
  });

  // Fetch real Revenue Trend
  const { data: trendData } = useQuery({
    queryKey: ["admin_revenue_trend", "quarter"],
    queryFn: () => fetchRevenueTrend("quarter"),
    refetchInterval: 60000,
  });

  const totalMrr = kpis?.mrr_minor ? kpis.mrr_minor / 100 : 0;

  const totalCards = transactions
    .filter((t) => (t.method || "").toLowerCase().includes("razorpay") || (t.method || "").toLowerCase().includes("card") || (t.method || "").toLowerCase().includes("stripe"))
    .reduce((acc, t) => acc + (t.amount || 0), 0);

  const totalWire = transactions
    .filter((t) => (t.method || "").toLowerCase().includes("wire") || (t.method || "").toLowerCase().includes("ach") || (t.method || "").toLowerCase().includes("upi"))
    .reduce((acc, t) => acc + (t.amount || 0), 0);

  // Chart Trend Data (Quarterly Trend)
  const chartData = (trendData?.points && trendData.points.length > 0)
    ? trendData.points.map(p => ({ name: p.label, revenue: p.value }))
    : [{ name: "Current", revenue: totalMrr * 100 }];

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
      status: "Paid",
      date: new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }),
      badgeClass: "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 font-black",
      avatarBg: "bg-[#7FA0D6]/20 text-blue-800",
      is_paid: true,
    };

    setLocalTransactions((prev) => [newTx, ...prev]);
    setToast(`Invoice ${newTx.id} created for ${newInvClient} (₹${newTx.amount.toLocaleString('en-IN')})!`);
    setIsCreateInvoiceOpen(false);
    setNewInvClient("");
    setNewInvScope("");
    setNewInvAmount("");
    setTimeout(() => setToast(null), 4000);
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
    // Strict requirement: Only display confirmed paid transactions
    if (t.status !== "Paid" && t.is_paid === false) return false;
    const matchesFilter =
      filter === "all" ||
      filter === "paid" ||
      (filter === "cards" && ((t.method || "").toLowerCase().includes("razorpay") || (t.method || "").toLowerCase().includes("card") || (t.method || "").toLowerCase().includes("stripe"))) ||
      (filter === "wire" && ((t.method || "").toLowerCase().includes("wire") || (t.method || "").toLowerCase().includes("ach") || (t.method || "").toLowerCase().includes("upi")));
    const matchesSearch =
      !search ||
      t.client.toLowerCase().includes(search.toLowerCase()) ||
      t.id.toLowerCase().includes(search.toLowerCase()) ||
      t.scope.toLowerCase().includes(search.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  return (
    <div data-surface="ops" className="w-full min-h-screen font-sans bg-[#0B111C] flex flex-col">
      <AdminTopHeader activeTab="Revenue" hideTitle />

      <main className="flex-1 px-3.5 sm:px-6 lg:px-10 pt-6 sm:pt-8 pb-16 max-w-[1500px] w-full mx-auto space-y-6 sm:space-y-8">
        {toast && (
          <div className="p-4 bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-xs font-bold rounded-2xl flex items-center justify-between shadow-sm animate-fade-in">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span>{toast}</span>
            </div>
            <button onClick={() => setToast(null)} className="text-emerald-400 hover:text-emerald-200 font-bold">
              Dismiss
            </button>
          </div>
        )}

        {/* ─────────────────────────────────────────────────────────────────────────────
            TOP CONTROLS & TIMEFRAME ACTIONS
        ───────────────────────────────────────────────────────────────────────────── */}
        <div className="flex items-center justify-end gap-2.5 w-full">
          {/* Action Buttons: 2-column grid on mobile for perfect alignment, inline on desktop */}
          <div className="grid grid-cols-2 gap-2 w-full sm:w-auto sm:flex sm:items-center sm:gap-2.5">
              <button
                type="button"
                onClick={handleExportCSV}
                className="w-full sm:w-auto justify-center px-3.5 py-2.5 sm:py-2 rounded-xl bg-[#161F2D] border border-[#2A3446] text-[#F1F5F9] hover:bg-[#0B111C] text-xs font-bold flex items-center gap-1.5 shadow-2xs cursor-pointer active:scale-95 truncate"
              >
                <Download className="w-4 h-4 text-[#97A0B3] shrink-0" />
                <span className="truncate">Export Report</span>
              </button>

              <button
                type="button"
                onClick={() => setIsCreateInvoiceOpen(true)}
                className="w-full sm:w-auto justify-center px-3.5 py-2.5 sm:py-2 rounded-xl bg-[#7FA0D6] hover:bg-blue-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-md shadow-blue-500/20 cursor-pointer transition-all active:scale-95 truncate"
              >
                <Plus className="w-4 h-4 shrink-0" />
                <span className="truncate">Create Invoice</span>
              </button>
            </div>
          </div>


        {/* ─────────────────────────────────────────────────────────────────────────────
            MAIN SECTION: REVENUE GROWTH GRAPH & TRANSACTION HISTORY
        ───────────────────────────────────────────────────────────────────────────── */}
        <div className="space-y-6">
          {/* Revenue Growth & Trajectory Card */}
          <div className="bg-[#161F2D] rounded-2xl sm:rounded-3xl border border-[#2A3446] shadow-xl flex flex-col justify-between p-4 sm:p-6 lg:p-8 space-y-4 sm:space-y-6">
            <div>
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2.5 mb-3 sm:mb-4">
                <div>
                  <h3 className="text-base sm:text-lg font-bold text-white tracking-tight">Revenue Growth & Trajectory</h3>
                  <p className="text-xs text-[#97A0B3]">Live cash flow across retainers & client billing</p>
                </div>

                <div className="flex flex-wrap items-center gap-2 sm:gap-3 text-xs font-bold">
                  <span className="flex items-center gap-1.5 text-[#7FA0D6] text-[11px] sm:text-xs">
                    <span className="w-2 h-2 rounded-full bg-[#7FA0D6]" /> Actual Inflow
                  </span>
                  <span className="flex items-center gap-1.5 text-[#97A0B3] text-[11px] sm:text-xs hidden sm:flex">
                    <span className="w-2 h-2 rounded-full bg-[#2A3446]" /> Target Baseline
                  </span>
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] sm:text-[11px] font-black bg-[#7FA0D6] text-white shadow-md" title="Monthly Recurring Revenue">
                    ₹{totalMrr > 0 ? totalMrr.toLocaleString('en-IN') : "0"} Current MRR
                  </span>
                </div>
              </div>

              {/* Recharts Bar Chart (Minimal Height on Mobile & Responsive) */}
              <div className="w-full bg-[#0B111C]/60 rounded-xl sm:rounded-2xl p-2.5 sm:p-4 border border-[#2A3446]/60 h-48 sm:h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={chartData}
                    margin={{ top: 8, right: 8, left: -10, bottom: 0 }}
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
                      tick={{ fontSize: 10, fill: "#97A0B3", fontWeight: 600 }}
                      axisLine={false}
                      tickLine={false}
                      dy={3}
                    />
                    <YAxis
                      tick={{ fontSize: 9, fill: "#97A0B3" }}
                      axisLine={false}
                      tickLine={false}
                      width={34}
                      tickFormatter={(v: number) => {
                        const val = v / 100;
                        return val >= 10000000
                          ? `₹${(val / 10000000).toFixed(1)}Cr`
                          : val >= 100000
                          ? `₹${(val / 100000).toFixed(0)}L`
                          : val >= 1000
                          ? `₹${(val / 1000).toFixed(0)}K`
                          : `₹${val}`;
                      }}
                    />
                    <Tooltip
                      formatter={(val: any) => [`₹${(Number(val) / 100).toLocaleString('en-IN')}`, "Revenue"]}
                      contentStyle={{ backgroundColor: "#0B111C", borderRadius: "12px", border: "1px solid #2A3446", color: "#F1F5F9", boxShadow: "0 10px 25px rgba(0,0,0,0.5)" }}
                      itemStyle={{ color: "#7FA0D6", fontWeight: "bold" }}
                      labelStyle={{ color: "#97A0B3", fontSize: "11px", fontWeight: "bold" }}
                      cursor={false}
                    />
                    <Bar dataKey="revenue" radius={[6, 6, 2, 2]} maxBarSize={36}>
                      {chartData.map((entry, index) => {
                        const maxVal = Math.max(...chartData.map((d) => d.revenue));
                        return (
                          <Cell
                            key={`cell-${index}`}
                            fill={entry.revenue === maxVal ? "url(#revenueBarGradPeak)" : "url(#revenueBarGrad)"}
                            className="transition-all duration-200 hover:brightness-125 cursor-pointer"
                          />
                        );
                      })}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Bottom Metrics Bar */}
            <div className="pt-3 border-t border-[#2A3446] grid grid-cols-2 sm:grid-cols-4 gap-2 text-center">
              <div className="bg-[#0B111C] p-2 sm:p-2.5 rounded-xl border border-[#2A3446]">
                <span className="text-[9px] sm:text-[10px] font-bold text-[#97A0B3] uppercase">Invoiced</span>
                <div className="text-xs sm:text-sm font-black text-white">₹{totalMrr > 0 ? totalMrr.toLocaleString('en-IN') : "0"}</div>
              </div>
              <div className="bg-[#0B111C] p-2 sm:p-2.5 rounded-xl border border-[#2A3446]">
                <span className="text-[9px] sm:text-[10px] font-bold text-[#97A0B3] uppercase">Direct UPI / Wire</span>
                <div className="text-xs sm:text-sm font-black text-white">₹{totalWire > 0 ? totalWire.toLocaleString('en-IN') : "0"}</div>
              </div>
              <div className="bg-[#0B111C] p-2 sm:p-2.5 rounded-xl border border-[#2A3446]">
                <span className="text-[9px] sm:text-[10px] font-bold text-[#97A0B3] uppercase">Cards / Razorpay</span>
                <div className="text-xs sm:text-sm font-black text-white">₹{totalCards > 0 ? totalCards.toLocaleString('en-IN') : "0"}</div>
              </div>
              <div className="bg-[#0B111C] p-2 sm:p-2.5 rounded-xl border border-[#2A3446]">
                <span className="text-[9px] sm:text-[10px] font-bold text-[#97A0B3] uppercase">Disputed / Refunded</span>
                <div className="text-xs sm:text-sm font-black text-emerald-400">₹0</div>
              </div>
            </div>
          </div>

          {/* Recent Transactions Card (Transaction History) */}
          <div className="bg-[#161F2D] rounded-3xl border border-[#2A3446] shadow-xl flex flex-col justify-between p-6 lg:p-8 space-y-6">
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h3 className="text-xl font-black text-white tracking-tight">Recent Transactions</h3>
                  <p className="text-xs text-[#97A0B3]">Client billing roster & payment settlements</p>
                </div>

                <div className="flex flex-wrap items-center gap-2.5">
                  {/* Search */}
                  <div className="relative min-w-[200px]">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#97A0B3]" />
                    <input
                      type="text"
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      placeholder="Search client or invoice..."
                      className="w-full pl-9 pr-3 py-1.5 rounded-xl border border-[#2A3446] bg-[#0B111C] text-xs text-white focus:outline-none focus:border-blue-500"
                    />
                  </div>

                  {/* Filter Pills */}
                  <div className="flex items-center gap-1 bg-[#0B111C] p-1 rounded-xl text-xs font-bold border border-[#2A3446]">
                    {[
                      { key: "all", label: "All Paid" },
                      { key: "cards", label: "Cards / Razorpay" },
                      { key: "wire", label: "Direct Wire" },
                    ].map((tab) => (
                      <button
                        key={tab.key}
                        type="button"
                        onClick={() => setFilter(tab.key)}
                        className={`px-2.5 py-1 rounded-lg capitalize transition-all cursor-pointer text-[11px] ${
                          filter === tab.key ? "bg-[#161F2D] text-white shadow-xs font-black" : "text-[#97A0B3] hover:text-white"
                        }`}
                      >
                        {tab.label}
                      </button>
                    ))}
                  </div>

                  {/* Export CSV Button */}
                  <button
                    type="button"
                    onClick={handleExportCSV}
                    className="px-3 py-1.5 rounded-xl bg-[#7FA0D6]/15 hover:bg-[#7FA0D6]/20 text-[#7FA0D6] text-xs font-bold flex items-center gap-1.5 cursor-pointer border border-[#7FA0D6]/30 transition-colors"
                  >
                    <Download className="w-3.5 h-3.5" /> CSV
                  </button>
                </div>
              </div>

              {/* Transactions Table: Responsive scroll container on mobile & desktop */}
              <div className="rounded-2xl border border-[#2A3446] bg-[#0B111C]/40 overflow-x-auto max-h-[420px] sm:max-h-[480px] overflow-y-auto overscroll-contain pr-0.5 scrollbar-thin scrollbar-thumb-[#2A3446] hover:scrollbar-thumb-[#7FA0D6]/40 scrollbar-track-transparent">
                <table className="w-full text-left text-xs text-white min-w-[700px]">
                  <thead className="bg-[#0B111C] border-b border-[#2A3446] text-[10px] sm:text-[11px] font-extrabold uppercase tracking-wider text-[#97A0B3] sticky top-0 z-10">
                    <tr>
                      <th className="px-4 py-3">CLIENT & SCOPE</th>
                      <th className="px-4 py-3">INVOICE #</th>
                      <th className="px-4 py-3">SETTLED DATE</th>
                      <th className="px-4 py-3">AMOUNT</th>
                      <th className="px-4 py-3">PAYMENT METHOD</th>
                      <th className="px-4 py-3 text-center">STATUS</th>
                      <th className="px-4 py-3 text-right pr-4">ACTIONS</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#2A3446]/40 font-medium bg-[#161F2D]/50">
                    {filteredTx.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="px-5 py-8 text-center text-[#97A0B3] text-xs font-medium">
                          No transactions recorded yet
                        </td>
                      </tr>
                    ) : (
                      filteredTx.map((tx) => (
                        <tr key={tx.id} className="hover:bg-[#0B111C]/70 transition-colors">
                          {/* Full Width Row: All 7 Columns completely visible */}
                          <td className="px-4 py-3.5">
                            <div className="flex items-center gap-3">
                              <div className={`w-8 h-8 rounded-xl ${tx.avatarBg} font-black text-xs flex items-center justify-center shrink-0`}>
                                {tx.clientInitials}
                              </div>
                              <div>
                                <div className="font-bold text-xs text-white">{tx.client}</div>
                                <div className="text-[11px] text-[#97A0B3]">{tx.scope}</div>
                              </div>
                            </div>
                          </td>

                          <td className="px-4 py-3.5 font-mono font-bold text-[#F1F5F9] text-xs">
                            {tx.id}
                          </td>

                          <td className="px-4 py-3.5 text-xs text-[#97A0B3] font-medium">
                            {tx.date}
                          </td>

                          <td className="px-4 py-3.5 font-black text-sm text-white whitespace-nowrap">
                            ₹{tx.amount.toLocaleString('en-IN')}
                          </td>

                          <td className="px-4 py-3.5 text-[#F1F5F9] font-medium text-xs">
                            <span className="px-2.5 py-1 rounded-lg bg-[#0B111C] border border-[#2A3446] text-[#F1F5F9] inline-block">
                              {tx.method}
                            </span>
                          </td>

                          <td className="px-4 py-3.5 text-center">
                            <span className={`px-2.5 py-1 rounded-full text-[11px] font-bold border inline-flex items-center gap-1.5 ${tx.badgeClass}`}>
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                              {tx.status}
                            </span>
                          </td>

                          <td className="px-4 py-3.5 text-right pr-4 whitespace-nowrap">
                            <button
                              type="button"
                              onClick={() => setSelectedReceipt(tx)}
                              className="px-2.5 py-1.5 rounded-xl border border-[#7FA0D6]/30 bg-[#7FA0D6]/10 hover:bg-[#7FA0D6]/20 text-[#7FA0D6] font-bold inline-flex items-center gap-1 cursor-pointer text-xs transition-colors whitespace-nowrap shrink-0"
                            >
                              View Receipt <ArrowUpRight className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Table Footer */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-3 border-t border-[#2A3446] text-xs text-[#97A0B3] font-medium">
              <span>Showing {filteredTx.length} of {transactions.length} transactions</span>
            </div>
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

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 sm:gap-3">
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
                  <NativeSelect
                    value={newInvMethod}
                    onChange={(e) => setNewInvMethod(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-xl border border-[#2A3446] text-xs font-medium"
                  >
                    <option value="Razorpay UPI">Razorpay UPI</option>
                    <option value="Bank Wire">Bank Wire</option>
                    <option value="Invoice Net 15">Invoice Net 15</option>
                    <option value="Credit / Debit Card">Credit / Debit Card</option>
                  </NativeSelect>
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
          MODAL: CREO RENEWAL RECEIPT VIEWER (MATCHING IMAGE 2 LAYOUT)
      ───────────────────────────────────────────────────────────────────────────── */}
      <PaymentReceiptModal
        receipt={
          selectedReceipt
            ? {
                id: selectedReceipt.id,
                client: selectedReceipt.client,
                clientEmail: selectedReceipt.client_email,
                clientId: selectedReceipt.client_id,
                amount: selectedReceipt.amount,
                scope: selectedReceipt.scope,
                method: selectedReceipt.method,
                status: selectedReceipt.status,
                date: selectedReceipt.date,
                term: "1 Month",
                quantity: "1 Retainer",
              }
            : null
        }
        onClose={() => setSelectedReceipt(null)}
      />
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 9. ADMIN PLANS & PRICING TIERS PAGE
// ─────────────────────────────────────────────────────────────────────────────
export function AdminPlansPage() {
  const [searchParams] = useSearchParams();
  const queryNegId = searchParams.get("negId") || searchParams.get("id");
  const queryClientId = searchParams.get("clientId");
  const [toast, setToast] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [filterTab, setFilterTab] = useState<"all" | "sent" | "pending" | "accepted" | "counter" | "declined">("all");

  // Plans State
  const [plans, setPlans] = useState([
    {
      id: "starter",
      name: "starter",
      display_name: "Starter",
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
      display_name: "Growth",
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
      display_name: "Scale",
      price_monthly: 120000,
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

  useEffect(() => {
    let cancelled = false;
    fetchPlansSummary().then(data => {
      if (cancelled || !data || !data.plans) return;
      setPlans(prev => prev.map(p => {
        // "scale" is the 3rd plan (enterprise)
        const livePlan = data.plans.find((lp: PlanSummaryItem) => lp.name === p.name || lp.id === p.name);
        if (livePlan) {
          return {
            ...p,
            price_monthly: livePlan.monthly_price || livePlan.price_minor / 100,
            subscribers: livePlan.subscriber_count,
            display_name: livePlan.display_name
          };
        }
        return p;
      }));
    }).catch(console.error);
    return () => { cancelled = true; };
  }, []);

  // Modals State
  const [editingPlan, setEditingPlan] = useState<typeof plans[0] | null>(null);
  const [editPriceInput, setEditPriceInput] = useState("");
  const [editFeaturesInput, setEditFeaturesInput] = useState("");

  const [isNewProposalOpen, setIsNewProposalOpen] = useState(false);
  const [acceptModalItem, setAcceptModalItem] = useState<PlanNegotiationItem | null>(null);
  const [counterModalItem, setCounterModalItem] = useState<PlanNegotiationItem | null>(null);
  const [declineModalItem, setDeclineModalItem] = useState<PlanNegotiationItem | null>(null);

  // Form Inputs
  const [acceptPriceInput, setAcceptPriceInput] = useState("");
  const [acceptReelsInput, setAcceptReelsInput] = useState("8");
  const [acceptPostersInput, setAcceptPostersInput] = useState("12");
  const [acceptStoriesInput, setAcceptStoriesInput] = useState("15");
  const [acceptNotesInput, setAcceptNotesInput] = useState("");
  const [isSubmittingAccept, setIsSubmittingAccept] = useState(false);

  const [counterPriceInput, setCounterPriceInput] = useState("");
  const [counterReelsInput, setCounterReelsInput] = useState("8");
  const [counterPostersInput, setCounterPostersInput] = useState("12");
  const [counterStoriesInput, setCounterStoriesInput] = useState("15");
  const [counterNoteInput, setCounterNoteInput] = useState("");
  const [isSubmittingCounter, setIsSubmittingCounter] = useState(false);
  const [declineReasonInput, setDeclineReasonInput] = useState("");

  const [newPropClient, setNewPropClient] = useState("");
  const [newPropEmail, setNewPropEmail] = useState("");
  const [newPropCurrentPlan, setNewPropCurrentPlan] = useState("Starter (₹25,000/mo)");
  const [newPropTargetPlan, setNewPropTargetPlan] = useState("Scale Custom Scope");
  const [newPropStandardRate, setNewPropStandardRate] = useState("95000");
  const [newPropProposedRate, setNewPropProposedRate] = useState("85000");
  const [newPropNotes, setNewPropNotes] = useState("");
  const [isSubmittingProposal, setIsSubmittingProposal] = useState(false);
  const [resendingEmailId, setResendingEmailId] = useState<string | null>(null);

  const [negotiations, setNegotiations] = useState<PlanNegotiationItem[]>([]);

  // Fetch negotiations from backend on mount
  useEffect(() => {
    let cancelled = false;
    fetchPlanNegotiations()
      .then((data: PlanNegotiationApiItem[]) => {
        if (cancelled) return;
        if (data && data.length > 0) {
          const mapped: PlanNegotiationItem[] = data.map((n) => ({
            id: n.id,
            clientId: n.clientId,
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
            agreedAmount: n.agreedAmount,
            reelQuota: n.reelQuota || 8,
            posterQuota: n.posterQuota || 12,
            storyQuota: n.storyQuota || 15,
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

  // Actions: OPEN Accept Client Plan Negotiation Modal
  const handleOpenAcceptModal = (item: PlanNegotiationItem) => {
    setAcceptModalItem(item);
    const digits = (item.proposedOffer || "").replace(/[^\d.]/g, "");
    const parsed = parseFloat(digits);
    const basePrice = item.counterPrice || (parsed && !isNaN(parsed) ? parsed : 35000);
    setAcceptPriceInput(String(basePrice));
    setAcceptReelsInput(String(item.reelQuota || 8));
    setAcceptPostersInput(String(item.posterQuota || 12));
    setAcceptStoriesInput(String(item.storyQuota || 15));
    setAcceptNotesInput(item.counterNote || `Custom negotiated retainer approved for ${item.clientName}. Scope terms confirmed.`);
  };

  // Actions: OPEN Counter Offer Negotiation Modal
  const handleOpenCounterModal = (item: PlanNegotiationItem) => {
    setCounterModalItem(item);
    const digits = (item.proposedOffer || "").replace(/[^\d.]/g, "");
    const parsed = parseFloat(digits);
    const basePrice = item.counterPrice || (parsed && !isNaN(parsed) ? parsed : 40000);
    setCounterPriceInput(String(basePrice));
    setCounterReelsInput(String(item.reelQuota || 8));
    setCounterPostersInput(String(item.posterQuota || 12));
    setCounterStoriesInput(String(item.storyQuota || 15));
    setCounterNoteInput(item.counterNote || `We can offer ₹${basePrice.toLocaleString('en-IN')}/mo with a revised custom deliverable scope.`);
  };

  // Auto-focus negotiation from URL query params (e.g. from notification deep-link)
  useEffect(() => {
    if ((queryNegId || queryClientId) && negotiations.length > 0) {
      const match = negotiations.find(
        (n) =>
          (queryNegId && (n.id === queryNegId || String(n.id).includes(queryNegId))) ||
          (queryClientId && (n.clientId === queryClientId || (n.clientEmail && n.clientEmail.toLowerCase() === queryClientId.toLowerCase())))
      );
      if (match) {
        setFilterTab("all");
        if (match.status === "Pending Review") {
          handleOpenAcceptModal(match);
        }
      }
    }
  }, [queryNegId, queryClientId, negotiations]);

  // Actions: CONFIRM Accept Client Plan Negotiation
  const handleConfirmAccept = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!acceptModalItem) return;
    const target = acceptModalItem;
    // A price is money: never substitute a default for a missing or unreadable one.
    const agreedPrice = parseFloat(acceptPriceInput);
    if (!Number.isFinite(agreedPrice) || agreedPrice <= 0) {
      setToast("Enter the agreed monthly price (in ₹) before accepting.");
      setTimeout(() => setToast(null), 4000);
      return;
    }
    const reelQuota = parseInt(acceptReelsInput, 10) || 8;
    const posterQuota = parseInt(acceptPostersInput, 10) || 12;
    const storyQuota = parseInt(acceptStoriesInput, 10) || 15;

    setIsSubmittingAccept(true);
    try {
      await updatePlanNegotiation(target.id, "accept", {
        agreed_price: agreedPrice,
        agreed_amount: agreedPrice,
        reel_quota: reelQuota,
        poster_quota: posterQuota,
        story_quota: storyQuota,
        counter_note: acceptNotesInput,
      });

      setNegotiations((prev) =>
        prev.map((n) =>
          n.id === target.id
            ? { ...n, status: "Accepted", counterPrice: agreedPrice, counterNote: acceptNotesInput }
            : n
        )
      );

      setToast(
        `Plan Negotiation ACCEPTED for ${target.clientName} at ₹${agreedPrice.toLocaleString('en-IN')}/mo! Custom plan assigned exclusively to this client.`
      );
      setAcceptModalItem(null);
    } catch (err) {
      console.error("Failed to approve negotiation:", err);
      setToast(`Error accepting negotiation: ${err instanceof Error ? err.message : "Unknown error"}`);
    } finally {
      setIsSubmittingAccept(false);
      setTimeout(() => setToast(null), 5000);
    }
  };


  // Actions: DECLINE Client Plan Negotiation
  const handleConfirmDecline = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!declineModalItem) return;
    const target = declineModalItem;
    const reason = declineReasonInput || "Price outside allowable margin.";

    // Only show "declined" once the server confirms it: a swallowed failure here used to
    // leave the admin believing a client was declined while their request stayed open.
    try {
      await updatePlanNegotiation(target.id, "decline", { decline_reason: reason });
      setNegotiations((prev) =>
        prev.map((n) => (n.id === target.id ? { ...n, status: "Declined", declineReason: reason } : n)),
      );
      setToast(`Plan Negotiation DECLINED for ${target.clientName}. Notification sent.`);
      setDeclineModalItem(null);
      setDeclineReasonInput("");
    } catch (err) {
      console.error("Failed to decline negotiation:", err);
      setToast(`Error declining negotiation: ${err instanceof Error ? err.message : "Unknown error"}`);
    }
    setTimeout(() => setToast(null), 4000);
  };

  // Actions: COUNTER-OFFER Client Plan Negotiation
  const handleConfirmCounter = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!counterModalItem || !counterPriceInput) return;
    const target = counterModalItem;
    const price = Math.round(parseFloat(counterPriceInput));
    if (!Number.isFinite(price) || price <= 0) {
      setToast("Enter a valid counter price (in ₹).");
      setTimeout(() => setToast(null), 4000);
      return;
    }
    const reelQuota = parseInt(counterReelsInput, 10) || 8;
    const posterQuota = parseInt(counterPostersInput, 10) || 12;
    const storyQuota = parseInt(counterStoriesInput, 10) || 15;

    setIsSubmittingCounter(true);
    try {
      await updatePlanNegotiation(target.id, "counter", {
        counter_price: price,
        counter_note: counterNoteInput || undefined,
        reel_quota: reelQuota,
        poster_quota: posterQuota,
        story_quota: storyQuota,
      });

      setNegotiations((prev) =>
        prev.map((n) =>
          n.id === target.id
            ? {
                ...n,
                status: "Counter Offered",
                counterPrice: price,
                agreedAmount: price,
                reelQuota,
                posterQuota,
                storyQuota,
                counterNote: counterNoteInput,
              }
            : n
        )
      );
      setToast(
        `Counter offer of ₹${price.toLocaleString('en-IN')}/mo (${reelQuota} Reels, ${posterQuota} Posts, ${storyQuota} Stories) submitted to ${target.clientName}. Custom plan updated in client onboarding.`
      );
      setCounterModalItem(null);
      setCounterPriceInput("");
      setCounterNoteInput("");
    } catch (err) {
      console.error("Failed to submit counter offer:", err);
      setToast(`Error submitting counter offer: ${err instanceof Error ? err.message : "Unknown error"}`);
    } finally {
      setIsSubmittingCounter(false);
      setTimeout(() => setToast(null), 5000);
    }
  };

  // Actions: Create New Proposal Submit
  const handleCreateProposalSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPropClient.trim() || !newPropProposedRate) return;
    if (!newPropEmail.trim()) {
      setToast("Please provide a valid recipient email ID.");
      setTimeout(() => setToast(null), 4000);
      return;
    }

    const prop = parseFloat(newPropProposedRate) || 85000;
    const stdRate = parseFloat(newPropStandardRate) || undefined;
    setIsSubmittingProposal(true);

    try {
      const res = await createPlanNegotiation({
        client_name: newPropClient.trim(),
        client_email: newPropEmail.trim(),
        target_topic: `${newPropCurrentPlan} → ${newPropTargetPlan}`,
        current_plan: newPropCurrentPlan,
        target_plan: newPropTargetPlan,
        standard_rate: stdRate,
        proposed_rate: prop,
        proposed_offer: `₹${prop.toLocaleString('en-IN')}/mo`,
        notes: newPropNotes || "Custom enterprise proposal initiated by sales lead.",
        send_email: true,
      });

      const newNeg: PlanNegotiationItem = {
        id: res.id || `neg-${Math.floor(100 + Math.random() * 900)}`,
        clientName: newPropClient.trim(),
        clientEmail: newPropEmail.trim(),
        clientLogo: newPropClient.trim().split(" ").map((w) => w[0]).join("").toUpperCase().slice(0, 2),
        targetTopic: `${newPropCurrentPlan} → ${newPropTargetPlan}`,
        proposedOffer: `₹${prop.toLocaleString('en-IN')}/mo`,
        phoneNumber: "—",
        preferredTime: "—",
        notes: newPropNotes || "Custom enterprise proposal initiated by sales lead.",
        requestedAt: new Date().toISOString(),
        status: "Proposal Sent",
        counterPrice: prop,
        agreedAmount: prop,
      };

      setNegotiations((prev) => [newNeg, ...prev]);
      if (res.email_sent) {
        setToast(`Custom proposal sent successfully via mail to ${newPropEmail.trim()} (₹${prop.toLocaleString('en-IN')}/mo)!`);
      } else {
        setToast(`Custom proposal initiated for ${newPropClient.trim()} (₹${prop.toLocaleString('en-IN')}/mo)!`);
      }
      setIsNewProposalOpen(false);
      setNewPropClient("");
      setNewPropEmail("");
      setNewPropNotes("");
    } catch (err) {
      setToast(`Failed to create proposal: ${err instanceof Error ? err.message : "Unknown error"}`);
    } finally {
      setIsSubmittingProposal(false);
      setTimeout(() => setToast(null), 5000);
    }
  };

  // Actions: Resend Proposal Email
  const handleResendProposalEmail = async (item: PlanNegotiationItem) => {
    if (!item.clientEmail) {
      setToast("This proposal does not have an email address attached.");
      setTimeout(() => setToast(null), 4000);
      return;
    }
    setResendingEmailId(item.id);
    try {
      const res = await resendProposalEmail(item.id);
      if (res.email_sent) {
        setToast(`Proposal email resent successfully to ${item.clientEmail}!`);
      } else {
        setToast(res.message || `Proposal email dispatched to ${item.clientEmail}.`);
      }
    } catch (err) {
      setToast(`Failed to resend proposal email: ${err instanceof Error ? err.message : "Unknown error"}`);
    } finally {
      setResendingEmailId(null);
      setTimeout(() => setToast(null), 5000);
    }
  };


  // Actions: Save Edit Tier Terms
  const handleSaveTierTerms = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPlan) return;

    const newPrice = parseFloat(editPriceInput) || editingPlan.price_monthly;
    const newFeatures = editFeaturesInput
      .split("\n")
      .map((f) => f.trim())
      .filter(Boolean);

    try {
      await request(`/api/v1/admin/plans/${editingPlan.name}`, {
        method: "PATCH",
        body: JSON.stringify({
          monthly_price: newPrice,
          price_minor: newPrice * 100, // Sync minor price too!
        }),
      });
    } catch (err) {
      console.error("Failed to sync plan update to live backend", err);
      // We will still update local state for fast UI feedback
    }

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
        : filterTab === "sent"
        ? (item.status === "Proposal Sent" || item.status?.toLowerCase().includes("proposal") || item.status?.toLowerCase().includes("sent"))
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
  const sentCount = negotiations.filter(
    (n) => n.status === "Proposal Sent" || n.status?.toLowerCase().includes("proposal") || n.status?.toLowerCase().includes("sent")
  ).length;
  const totalRetainerRevenue = plans.reduce((acc, p) => acc + p.price_monthly * p.subscribers, 0);

  return (
    <div data-surface="ops" className="w-full min-h-screen font-sans bg-[#0B111C] flex flex-col">
      <AdminTopHeader activeTab="Revenue" hideTitle />
      <main className="flex-1 px-3.5 sm:px-6 lg:px-10 pt-4 sm:pt-8 pb-16 max-w-[1500px] w-full mx-auto space-y-5 sm:space-y-8">
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

        {/* Top 2 Commercial & Plan KPI Cards - Fit to Screen */}
        <div className="grid grid-cols-2 gap-2.5 sm:gap-4 w-full">
          {/* Card 1: Active Retainers */}
          <div className="p-3.5 sm:p-6 bg-[#161F2D] rounded-2xl sm:rounded-3xl border border-[#2A3446] hover:border-[#7FA0D6]/40 transition-all shadow-md space-y-1.5 sm:space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[10px] sm:text-xs font-black text-[#97A0B3] uppercase tracking-wider">ACTIVE RETAINERS</span>
              <div className="w-6 h-6 sm:w-8 sm:h-8 rounded-xl bg-[#7FA0D6]/15 text-[#7FA0D6] flex items-center justify-center font-bold">
                <Briefcase className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              </div>
            </div>
            <div className="text-lg sm:text-3xl font-black text-white">
              {plans.reduce((acc, p) => acc + p.subscribers, 0)} Active
            </div>
            <p className="text-[11px] sm:text-xs text-[#7FA0D6] font-bold truncate">MRR: ₹{totalRetainerRevenue.toLocaleString("en-IN")}</p>
          </div>

          {/* Card 2: Pending Negotiations */}
          <div className="p-3.5 sm:p-6 bg-[#161F2D] rounded-2xl sm:rounded-3xl border border-[#2A3446] hover:border-amber-500/40 transition-all shadow-md space-y-1.5 sm:space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[10px] sm:text-xs font-black text-[#97A0B3] uppercase tracking-wider">PENDING REVIEW</span>
              <div className="w-6 h-6 sm:w-8 sm:h-8 rounded-xl bg-amber-500/15 text-amber-400 flex items-center justify-center font-bold">
                <Zap className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              </div>
            </div>
            <div className="text-lg sm:text-3xl font-black text-white">
              {pendingCount} Actionable
            </div>
            <p className="text-[11px] sm:text-xs text-amber-400 font-bold truncate">Requires executive review</p>
          </div>
        </div>

        {/* ─────────────────────────────────────────────────────────────────────────────
            RETAINER TIERS & QUOTA ALLOCATION CARDS
        ───────────────────────────────────────────────────────────────────────────── */}
        <div className="bg-[#161F2D] rounded-3xl p-4 sm:p-6 lg:p-8 border border-[#2A3446] shadow-[0_4px_30px_rgba(0,0,0,0.04)] space-y-5 sm:space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h3 className="text-lg font-bold text-white tracking-tight">Agency Retainer Plans & Quotas</h3>
              <p className="text-xs text-[#97A0B3] mt-0.5">
                Standard monthly subscription tiers, output deliverables quota, and SLA turnarounds.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5 sm:gap-6">
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
                  <span className="px-2.5 py-0.5 rounded-full bg-amber-500/15 text-amber-400 border border-amber-500/30 text-[10px] font-black uppercase flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
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
              className="w-full sm:w-auto justify-center px-4 py-2.5 sm:py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-sm cursor-pointer transition-colors active:scale-95"
            >
              <Plus className="w-4 h-4 shrink-0" /> Initiate Custom Proposal
            </button>
          </div>

          {/* Search and Filter */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#2A3446] pb-4">
            <div className="w-full sm:w-[220px]">
              <CustomSelect
                value={filterTab}
                onChange={(val) => setFilterTab(val as any)}
                ariaLabel="Filter Negotiations"
                size="sm"
                icon={<Filter className="w-3.5 h-3.5 text-[#7FA0D6]" />}
                options={[
                  { value: "all", label: "All Negotiations" },
                  { value: "sent", label: sentCount > 0 ? `Sent Proposals (${sentCount})` : "Sent Proposals" },
                  { value: "pending", label: pendingCount > 0 ? `Pending Review (${pendingCount})` : "Pending Review" },
                  { value: "accepted", label: "Accepted" },
                  { value: "counter", label: "Counter Offered" },
                  { value: "declined", label: "Declined" },
                ]}
                className="w-full !min-h-[38px] !h-[38px] !text-xs"
              />
            </div>

            <div className="relative w-full sm:w-auto min-w-[240px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#97A0B3]" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search negotiations by client, scope..."
                className="w-full pl-9 pr-4 py-2 rounded-xl border border-[#2A3446] bg-[#161F2D] text-xs font-medium text-white placeholder:text-[#97A0B3] focus:outline-none focus:ring-2 focus:ring-blue-500/20 shadow-2xs h-[38px]"
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
              filteredNegotiations.map((item) => {
                const isHighlighted = Boolean(
                  (queryNegId && (item.id === queryNegId || String(item.id).includes(queryNegId))) ||
                  (queryClientId && item.clientId && item.clientId.toLowerCase() === queryClientId.toLowerCase()) ||
                  (queryClientId && item.clientEmail && item.clientEmail.toLowerCase() === queryClientId.toLowerCase())
                );

                return (
                  <div
                    key={item.id}
                    id={`neg-${item.id}`}
                    className={`p-5 rounded-2xl border transition-all shadow-2xs space-y-4 ${
                      isHighlighted
                        ? "border-[#7FA0D6] bg-[#7FA0D6]/10 ring-2 ring-[#7FA0D6] shadow-lg shadow-blue-500/10"
                        : "border-[#2A3446] bg-[#0B111C]/50 hover:bg-[#161F2D] hover:border-[#2A3446]"
                    }`}
                  >
                    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                      {/* Client Info */}
                      <div className="flex items-center gap-3.5">
                        <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-700 text-white font-black text-sm flex items-center justify-center shadow-md shrink-0">
                          {item.clientLogo}
                        </div>
                        <div>
                          <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                            <h4 className="font-bold text-sm text-white">{item.clientName}</h4>
                            {item.requestedAt && (
                              <span className="text-[10px] text-[#97A0B3] font-semibold">
                                {(() => {
                                  try {
                                    const d = new Date(item.requestedAt);
                                    return isNaN(d.getTime())
                                      ? item.requestedAt
                                      : d.toLocaleDateString("en-IN", {
                                          day: "numeric",
                                          month: "short",
                                          year: "numeric",
                                        });
                                  } catch {
                                    return item.requestedAt;
                                  }
                                })()}
                              </span>
                            )}
                            {isHighlighted && (
                              <span className="px-2 py-0.5 rounded-full bg-blue-500/20 text-[#7FA0D6] border border-blue-500/30 text-[9px] font-black uppercase">
                                Selected Target
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-[#F1F5F9] font-medium">{item.targetTopic}</p>
                          {item.clientEmail && (
                            <p className="text-[10px] text-[#7FA0D6] flex items-center gap-1 mt-0.5 font-medium">
                              <Mail className="w-3 h-3 shrink-0" />
                              <span>{item.clientEmail}</span>
                            </p>
                          )}
                        </div>
                      </div>

                      {/* Negotiation Details */}
                      <div className="grid grid-cols-2 sm:flex sm:items-center gap-3 sm:gap-4 bg-[#161F2D] p-3 rounded-xl border border-[#2A3446]">
                        {item.proposedOffer && (
                          <div>
                            <span className="text-[10px] text-[#7FA0D6] uppercase block font-bold">Client Offer</span>
                            <span className="text-sm font-black text-emerald-400">{item.proposedOffer}</span>
                          </div>
                        )}
                        {item.status === "Accepted" && (
                          <div>
                            <span className="text-[10px] text-emerald-400 uppercase block font-bold">Agreed Retainer</span>
                            <span className="text-sm font-black text-emerald-300">
                              ₹{(item.counterPrice || item.agreedAmount || 0).toLocaleString('en-IN')}/mo
                            </span>
                          </div>
                        )}
                        {item.status === "Counter Offered" && (
                          <div>
                            <span className="text-[10px] text-purple-400 uppercase block font-bold">Counter Offer</span>
                            <span className="text-sm font-black text-purple-300">
                              ₹{(item.counterPrice || 0).toLocaleString('en-IN')}/mo
                            </span>
                          </div>
                        )}
                        {(item.status === "Accepted" || item.status === "Counter Offered") && (
                          <div>
                            <span className="text-[10px] text-[#7FA0D6] uppercase block font-bold">Deliverables Quota</span>
                            <span className="text-xs font-bold text-white">
                              {item.reelQuota || 8} Reels • {item.posterQuota || 12} Posts • {item.storyQuota || 15} Stories
                            </span>
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
                      <div className="flex flex-wrap items-center gap-2.5">
                        <span
                          className={`px-3 py-1.5 rounded-full text-[11px] font-black uppercase tracking-wider flex items-center gap-1.5 ${
                            item.status === "Accepted"
                              ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30"
                              : item.status === "Declined"
                              ? "bg-rose-500/15 text-rose-400 border border-rose-500/30"
                              : item.status === "Counter Offered"
                              ? "bg-purple-500/15 text-purple-400 border border-purple-500/30"
                              : item.status === "Proposal Sent"
                              ? "bg-blue-500/15 text-blue-400 border border-blue-500/30"
                              : "bg-amber-500/15 text-amber-400 border border-amber-500/30"
                          }`}
                        >
                          {item.status === "Pending Review" && <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />}
                          {item.status === "Proposal Sent" && <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse" />}
                          {item.status}
                        </span>

                        {/* Functional ACCEPT, DECLINE, COUNTER, and RESEND buttons */}
                        {item.status === "Pending Review" ? (
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => handleOpenAcceptModal(item)}
                              className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs shadow-md shadow-emerald-600/20 flex items-center gap-1.5 cursor-pointer transition-all hover:scale-105 active:scale-95"
                            >
                              <Check className="w-3.5 h-3.5 stroke-[3]" /> ACCEPT
                            </button>
                            <button
                              type="button"
                              onClick={() => setDeclineModalItem(item)}
                              className="px-4 py-2 rounded-xl bg-rose-500/15 hover:bg-rose-500/25 text-rose-400 hover:text-rose-300 font-bold text-xs border border-rose-500/30 flex items-center gap-1.5 cursor-pointer transition-all hover:scale-105 active:scale-95"
                            >
                              <X className="w-3.5 h-3.5 stroke-[3]" /> DECLINE
                            </button>
                            <button
                              type="button"
                              onClick={() => handleOpenCounterModal(item)}
                              className="px-4 py-2 rounded-xl bg-[#7FA0D6]/15 hover:bg-[#7FA0D6]/25 text-[#7FA0D6] hover:text-white font-bold text-xs border border-[#7FA0D6]/30 flex items-center gap-1.5 cursor-pointer transition-all hover:scale-105 active:scale-95"
                            >
                              <SlidersHorizontal className="w-3.5 h-3.5" /> Counter
                            </button>
                          </div>
                        ) : item.status === "Proposal Sent" ? (
                          <div className="flex items-center gap-2">
                            {item.clientEmail && (
                              <button
                                type="button"
                                onClick={() => handleResendProposalEmail(item)}
                                disabled={resendingEmailId === item.id}
                                className="px-3.5 py-1.5 rounded-xl border border-blue-500/40 bg-blue-500/10 hover:bg-blue-500/20 text-xs font-bold text-blue-300 flex items-center gap-1.5 cursor-pointer transition-all disabled:opacity-50"
                                title="Resend proposal email"
                              >
                                {resendingEmailId === item.id ? (
                                  <>
                                    <Loader2 className="w-3.5 h-3.5 animate-spin" /> Sending...
                                  </>
                                ) : (
                                  <>
                                    <Send className="w-3.5 h-3.5" /> Resend Email
                                  </>
                                )}
                              </button>
                            )}
                          </div>
                        ) : (
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => handleOpenAcceptModal(item)}
                              className="px-3 py-1.5 rounded-xl border border-[#2A3446] bg-[#0B111C] hover:border-[#7FA0D6] text-[11px] font-bold text-[#BCCCE6] hover:text-white cursor-pointer transition-all"
                            >
                              Edit Scope / Quotas
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
              );
            }))}
          </div>
        </div>

      </main>

      {/* ─────────────────────────────────────────────────────────────────────────────
          MODAL: ACCEPT CLIENT PLAN NEGOTIATION & CONFIGURE PER-CLIENT RETAINER
      ───────────────────────────────────────────────────────────────────────────── */}
      {acceptModalItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-md animate-fade-in">
          <div className="w-full max-w-lg rounded-3xl bg-[#161F2D] p-6 sm:p-7 shadow-2xl space-y-5 border border-[#2A3446] max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-[#2A3446] pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-emerald-500/20 text-emerald-400 font-black text-sm flex items-center justify-center">
                  <Check className="w-5 h-5 stroke-[3]" />
                </div>
                <div>
                  <h3 className="text-base font-black text-white">Accept Retainer Negotiation</h3>
                  <p className="text-[11px] text-[#97A0B3]">Lock in negotiated price strictly for {acceptModalItem.clientName}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setAcceptModalItem(null)}
                className="p-1.5 text-[#97A0B3] hover:text-white rounded-lg hover:bg-[#0B111C]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Negotiation Overview Card */}
            <div className="p-4 rounded-2xl bg-[#0B111C] border border-[#2A3446] space-y-2.5 text-xs">
              <div className="flex justify-between items-center">
                <span className="text-[#97A0B3] font-medium">Client Account:</span>
                <span className="font-bold text-white">{acceptModalItem.clientName} ({acceptModalItem.clientEmail || "—"})</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-[#97A0B3] font-medium">Scope Topic:</span>
                <span className="font-bold text-[#7FA0D6]">{acceptModalItem.targetTopic}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-[#97A0B3] font-medium">Client Proposed Budget:</span>
                <span className="font-black text-emerald-400 text-sm">{acceptModalItem.proposedOffer || "—"}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-[#97A0B3] font-medium">Contact / Slot:</span>
                <span className="font-medium text-[#F1F5F9]">{acceptModalItem.phoneNumber} • {acceptModalItem.preferredTime}</span>
              </div>
              {acceptModalItem.notes && (
                <div className="pt-2 border-t border-[#2A3446] text-[#97A0B3]">
                  <strong className="text-[#F1F5F9]">Client Note:</strong> "{acceptModalItem.notes}"
                </div>
              )}
            </div>

            {/* ISOLATION GUARANTEE CALLOUT */}
            <div className="p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs space-y-1">
              <div className="flex items-center gap-1.5 font-black uppercase text-[10px] tracking-wider text-emerald-400">
                <CheckCircle2 className="w-3.5 h-3.5" /> Client Price Isolation Guarantee
              </div>
              <p className="text-[11px] text-[#F1F5F9] leading-relaxed">
                This negotiated price will update <strong>ONLY for {acceptModalItem.clientName}</strong>. Standard agency tiers (Starter ₹25k, Growth ₹50k, Scale ₹1.2L) and all other client retainers remain completely unchanged.
              </p>
            </div>

            <form onSubmit={handleConfirmAccept} className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-white mb-1">
                  Agreed Monthly Retainer (₹ INR / month) <span className="text-emerald-400">*</span>
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white font-bold text-sm">₹</span>
                  <input
                    type="number"
                    required
                    min="1"
                    value={acceptPriceInput}
                    onChange={(e) => setAcceptPriceInput(e.target.value)}
                    className="w-full pl-8 pr-4 py-2.5 rounded-xl border border-[#2A3446] bg-[#0B111C] text-white font-bold text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/40"
                    placeholder="e.g. 35000"
                  />
                </div>
              </div>

              {/* Deliverable Quota Inputs */}
              <div className="grid grid-cols-3 gap-2.5">
                <div>
                  <label className="block font-bold text-[#97A0B3] mb-1 text-[11px]">Reels / mo</label>
                  <input
                    type="number"
                    min="0"
                    value={acceptReelsInput}
                    onChange={(e) => setAcceptReelsInput(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-[#2A3446] bg-[#0B111C] text-white font-bold focus:outline-none focus:ring-2 focus:ring-emerald-500/40"
                  />
                </div>
                <div>
                  <label className="block font-bold text-[#97A0B3] mb-1 text-[11px]">Posters / mo</label>
                  <input
                    type="number"
                    min="0"
                    value={acceptPostersInput}
                    onChange={(e) => setAcceptPostersInput(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-[#2A3446] bg-[#0B111C] text-white font-bold focus:outline-none focus:ring-2 focus:ring-emerald-500/40"
                  />
                </div>
                <div>
                  <label className="block font-bold text-[#97A0B3] mb-1 text-[11px]">Stories / mo</label>
                  <input
                    type="number"
                    min="0"
                    value={acceptStoriesInput}
                    onChange={(e) => setAcceptStoriesInput(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-[#2A3446] bg-[#0B111C] text-white font-bold focus:outline-none focus:ring-2 focus:ring-emerald-500/40"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-[#F1F5F9] mb-1">
                  Agreement Notes / Scope Terms
                </label>
                <textarea
                  rows={2}
                  value={acceptNotesInput}
                  onChange={(e) => setAcceptNotesInput(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl border border-[#2A3446] bg-[#0B111C] text-white text-xs resize-none focus:outline-none focus:ring-2 focus:ring-emerald-500/40"
                  placeholder="e.g. Approved custom retainer. Valid for 12 months."
                />
              </div>

              <div className="flex justify-end gap-2.5 pt-3 border-t border-[#2A3446]">
                <button
                  type="button"
                  onClick={() => setAcceptModalItem(null)}
                  disabled={isSubmittingAccept}
                  className="px-4 py-2.5 rounded-xl border border-[#2A3446] font-bold text-[#F1F5F9] hover:bg-[#0B111C] cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingAccept}
                  className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs shadow-lg shadow-emerald-600/30 flex items-center gap-2 cursor-pointer transition-all hover:scale-105 active:scale-95 disabled:opacity-50"
                >
                  {isSubmittingAccept ? (
                    <span>Applying Retainer...</span>
                  ) : (
                    <>
                      <Check className="w-4 h-4 stroke-[3]" />
                      Confirm & Assign Retainer (₹{Number(acceptPriceInput || 0).toLocaleString('en-IN')})
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

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

            {/* ISOLATION GUARANTEE CALLOUT */}
            <div className="p-3.5 rounded-2xl bg-purple-500/10 border border-purple-500/30 text-purple-300 text-xs space-y-1">
              <div className="flex items-center gap-1.5 font-black uppercase text-[10px] tracking-wider text-purple-400">
                <CheckCircle2 className="w-3.5 h-3.5" /> Client Counter Scope Guarantee
              </div>
              <p className="text-[11px] text-[#F1F5F9] leading-relaxed">
                This counter proposal will update <strong>ONLY for {counterModalItem.clientName}</strong> in their client onboarding. Standard agency tiers remain completely unchanged.
              </p>
            </div>

            <form onSubmit={handleConfirmCounter} className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-white mb-1">
                  Counter Proposed Rate (₹ INR / mo) <span className="text-purple-400">*</span>
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white font-bold text-sm">₹</span>
                  <input
                    type="number"
                    required
                    min="1"
                    value={counterPriceInput}
                    onChange={(e) => setCounterPriceInput(e.target.value)}
                    className="w-full pl-8 pr-4 py-2.5 rounded-xl border border-[#2A3446] bg-[#0B111C] text-white font-bold text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/40"
                    placeholder="e.g. 40000"
                  />
                </div>
              </div>

              {/* Deliverable Quota Inputs */}
              <div className="grid grid-cols-3 gap-2.5">
                <div>
                  <label className="block font-bold text-[#97A0B3] mb-1 text-[11px]">Reels / mo</label>
                  <input
                    type="number"
                    min="0"
                    value={counterReelsInput}
                    onChange={(e) => setCounterReelsInput(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-[#2A3446] bg-[#0B111C] text-white font-bold focus:outline-none focus:ring-2 focus:ring-purple-500/40"
                  />
                </div>
                <div>
                  <label className="block font-bold text-[#97A0B3] mb-1 text-[11px]">Posters / mo</label>
                  <input
                    type="number"
                    min="0"
                    value={counterPostersInput}
                    onChange={(e) => setCounterPostersInput(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-[#2A3446] bg-[#0B111C] text-white font-bold focus:outline-none focus:ring-2 focus:ring-purple-500/40"
                  />
                </div>
                <div>
                  <label className="block font-bold text-[#97A0B3] mb-1 text-[11px]">Stories / mo</label>
                  <input
                    type="number"
                    min="0"
                    value={counterStoriesInput}
                    onChange={(e) => setCounterStoriesInput(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-[#2A3446] bg-[#0B111C] text-white font-bold focus:outline-none focus:ring-2 focus:ring-purple-500/40"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-[#F1F5F9] mb-1">Counter Offer Notes / Scope Terms</label>
                <textarea
                  rows={2}
                  placeholder="e.g. We can offer ₹40,000/mo with custom deliverable package."
                  value={counterNoteInput}
                  onChange={(e) => setCounterNoteInput(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl border border-[#2A3446] bg-[#0B111C] text-white text-xs resize-none focus:outline-none focus:ring-2 focus:ring-purple-500/40"
                />
              </div>

              <div className="flex justify-end gap-2.5 pt-3 border-t border-[#2A3446]">
                <button
                  type="button"
                  onClick={() => setCounterModalItem(null)}
                  disabled={isSubmittingCounter}
                  className="px-4 py-2.5 rounded-xl border border-[#2A3446] font-bold text-[#F1F5F9] hover:bg-[#0B111C] cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingCounter}
                  className="px-5 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-black text-xs shadow-lg shadow-purple-600/30 flex items-center gap-2 cursor-pointer transition-all hover:scale-105 active:scale-95 disabled:opacity-50"
                >
                  {isSubmittingCounter ? "Submitting Counter..." : `Submit Counter Offer (₹${Number(counterPriceInput || 0).toLocaleString('en-IN')})`}
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
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-xl bg-blue-500/20 text-blue-400 flex items-center justify-center">
                  <Mail className="w-3.5 h-3.5" />
                </div>
                <h3 className="text-base font-bold text-white">Initiate Custom Retainer Proposal</h3>
              </div>
              <button type="button" onClick={() => setIsNewProposalOpen(false)} className="p-1 text-[#97A0B3] hover:text-[#F1F5F9]">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateProposalSubmit} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-[#F1F5F9] mb-1">
                  Client Brand Name <span className="text-blue-400">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Apex Media or Stellar Corp"
                  value={newPropClient}
                  onChange={(e) => setNewPropClient(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl border border-[#2A3446] bg-[#0B111C] text-white text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/40"
                />
              </div>

              <div>
                <label className="block font-bold text-[#F1F5F9] mb-1">
                  Recipient Email ID <span className="text-blue-400">*</span>
                </label>
                <input
                  type="email"
                  required
                  placeholder="e.g. client@brand.com or founder@company.com"
                  value={newPropEmail}
                  onChange={(e) => setNewPropEmail(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl border border-[#2A3446] bg-[#0B111C] text-white text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/40"
                />
                <span className="text-[10px] text-[#97A0B3] mt-0.5 block">
                  Proposal terms &amp; activation link will be delivered via email to this address.
                </span>
              </div>

              <div>
                <label className="block font-bold text-[#F1F5F9] mb-1">Current Retainer Plan</label>
                <input
                  type="text"
                  value={newPropCurrentPlan}
                  onChange={(e) => setNewPropCurrentPlan(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl border border-[#2A3446] bg-[#0B111C] text-white text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/40"
                />
              </div>

              <div>
                <label className="block font-bold text-[#F1F5F9] mb-1">Target Plan &amp; Custom Scope</label>
                <input
                  type="text"
                  required
                  value={newPropTargetPlan}
                  onChange={(e) => setNewPropTargetPlan(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl border border-[#2A3446] bg-[#0B111C] text-white text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/40"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 sm:gap-3">
                <div>
                  <label className="block font-bold text-[#F1F5F9] mb-1">Standard Rate (₹/mo)</label>
                  <input
                    type="number"
                    value={newPropStandardRate}
                    onChange={(e) => setNewPropStandardRate(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-xl border border-[#2A3446] bg-[#0B111C] text-white text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/40"
                  />
                </div>
                <div>
                  <label className="block font-bold text-[#F1F5F9] mb-1">
                    Proposed Rate (₹/mo) <span className="text-blue-400">*</span>
                  </label>
                  <input
                    type="number"
                    required
                    value={newPropProposedRate}
                    onChange={(e) => setNewPropProposedRate(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-xl border border-[#2A3446] bg-[#0B111C] text-white text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/40"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-[#F1F5F9] mb-1">Negotiation Scope Notes &amp; Commitments</label>
                <textarea
                  rows={3}
                  placeholder="e.g. 12-month contract lock-in with 2 dedicated creative pods."
                  value={newPropNotes}
                  onChange={(e) => setNewPropNotes(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl border border-[#2A3446] bg-[#0B111C] text-white text-xs resize-none focus:outline-none focus:ring-2 focus:ring-blue-500/40"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-[#2A3446]">
                <button
                  type="button"
                  onClick={() => setIsNewProposalOpen(false)}
                  disabled={isSubmittingProposal}
                  className="px-4 py-2 rounded-xl border border-[#2A3446] font-bold text-[#F1F5F9] hover:bg-[#0B111C] cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingProposal}
                  className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-md shadow-blue-600/25 cursor-pointer disabled:opacity-50 transition-all active:scale-95"
                >
                  {isSubmittingProposal ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" /> Sending Proposal...
                    </>
                  ) : (
                    <>
                      <Send className="w-3.5 h-3.5" /> Send Proposal
                    </>
                  )}
                </button>
              </div>
            </form>
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

