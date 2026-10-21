import { useState } from "react";
import {
  Search,
  ArrowUpRight,
  CheckCircle2,
  Clock,
  AlertTriangle,
  XCircle,
  Plus,
  ChevronDown,
  RefreshCw,
  ShieldAlert,
  Sliders,
  HardDrive,
  LifeBuoy,
  CreditCard,
  Copy,
  Check,
  ExternalLink,
  Globe,
  Layers,
  Edit3,
  Save,
} from "lucide-react";
import { Link, useParams } from "react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { request } from "../../lib/http";
import { CreoInlineLoader } from "../../components/ui/CreoLoader";

export interface ClientPlanItem {
  id: string;
  name: string;
  display_name: string;
  monthly_price: number;
  poster_quota: number;
  reel_quota: number;
  story_quota: number;
  revision_rounds: number;
  has_dedicated_manager: boolean;
  is_recommended: boolean;
  is_active: boolean;
  is_custom: boolean;
  highlights: string[];
}

export interface TeamItem {
  id: string;
  name: string;
  lead_name: string;
  lead_email?: string | null;
  members_count: number;
  is_active: boolean;
}

export interface StaffItem {
  id: string;
  name: string;
  email: string;
  role: string;
  team_name: string;
  status: string;
  joined: string;
}

export interface AgencyItem {
  id: string;
  name: string;
  slug: string;
  custom_domain?: string | null;
  code: string;
  owner: string;
  email: string;
  plan: string;
  plan_tier?: string;
  status: string;
  mrr: number;
  clients_count?: number;
  seats_count?: number;
  max_clients: number;
  max_staff: number;
  joined: string;
  branding?: Record<string, any>;
  storage?: {
    used_gb: number;
    quota_gb: number;
    percentage: number;
  };
  subscription?: {
    id: string | null;
    status: string;
    amount: number;
    gateway: string;
    period_start: string | null;
    period_end: string | null;
  } | null;
  clients?: Array<{
    id: string;
    name: string;
    email: string;
    status: string;
    joined: string;
  }>;
  support_tickets?: Array<{
    id: string;
    title: string;
    description: string;
    status: string;
    priority: string;
    created_at: string;
  }>;
  teams?: TeamItem[];
  staff?: StaffItem[];
  staff_count?: number;
  client_plans?: ClientPlanItem[];
  personalized_links?: {
    slug: string;
    custom_domain?: string | null;
    onboarding_url: string;
    pricing_url: string;
    full_onboarding_url: string;
    full_pricing_url: string;
  };
}

const DEFAULT_STATUS_CONFIG = { label: "Suspended", cls: "bg-[#2A3446] text-[#97A0B3] border-[#2A3446]", icon: XCircle };

const STATUS_CONFIG: Record<string, { label: string; cls: string; icon: React.ComponentType<{className?: string}> }> = {
  active: { label: "Active", cls: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30", icon: CheckCircle2 },
  trial: { label: "Trial", cls: "bg-amber-500/15 text-amber-400 border-amber-500/30", icon: Clock },
  trialing: { label: "Trial", cls: "bg-amber-500/15 text-amber-400 border-amber-500/30", icon: Clock },
  past_due: { label: "Past Due", cls: "bg-rose-500/15 text-rose-400 border-rose-500/30", icon: AlertTriangle },
  suspended: DEFAULT_STATUS_CONFIG,
};

function fmt(n: number) {
  if (n >= 1000) return `₹${(n / 1000).toFixed(1)}K`;
  return `₹${n}`;
}

function StatusBadge({ status }: { status: string }) {
  const cfg = STATUS_CONFIG[status] ?? DEFAULT_STATUS_CONFIG;
  const Icon = cfg.icon;
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md text-[11px] font-black uppercase tracking-wider border ${cfg.cls}`}>
      <Icon className="w-3 h-3" />
      {cfg.label}
    </span>
  );
}

export function PlatformAgenciesPage() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [showProvisionModal, setShowProvisionModal] = useState(false);
  const [provisionName, setProvisionName] = useState("");
  const [provisionSlug, setProvisionSlug] = useState("");
  const [provisionEmail, setProvisionEmail] = useState("");
  const [provisionAdminName, setProvisionAdminName] = useState("");
  const [provisionPassword, setProvisionPassword] = useState("");
  const [provisionPlan, setProvisionPlan] = useState("growth");
  const [errorMsg, setErrorMsg] = useState("");

  const queryClient = useQueryClient();

  const { data: agencies = [], isLoading, refetch } = useQuery<AgencyItem[]>({
    queryKey: ["platform-agencies"],
    queryFn: () => request<AgencyItem[]>("/api/v1/platform/agencies"),
  });

  const provisionMutation = useMutation({
    mutationFn: () =>
      request<{ status: string; agency_id: string }>("/api/v1/platform/agencies", {
        method: "POST",
        body: JSON.stringify({
          name: provisionName,
          slug: provisionSlug,
          admin_email: provisionEmail,
          admin_name: provisionAdminName,
          admin_password: provisionPassword,
          plan_tier: provisionPlan,
        }),
      }),
    onSuccess: () => {
      setShowProvisionModal(false);
      setProvisionName("");
      setProvisionSlug("");
      setProvisionEmail("");
      setProvisionAdminName("");
      setProvisionPassword("");
      void queryClient.invalidateQueries({ queryKey: ["platform-agencies"] });
      void queryClient.invalidateQueries({ queryKey: ["platform-overview"] });
    },
    onError: (err: any) => {
      setErrorMsg(err.message || "Failed to provision agency");
    },
  });

  const filtered = agencies.filter((a) => {
    const q = search.toLowerCase();
    const matchQ =
      !q ||
      a.name.toLowerCase().includes(q) ||
      a.slug.includes(q) ||
      a.owner.toLowerCase().includes(q) ||
      a.code.toLowerCase().includes(q);
    const matchS = statusFilter === "all" || a.status === statusFilter;
    return matchQ && matchS;
  });

  return (
    <div className="space-y-6 pb-8">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pt-1">
        <div>
          <h1 className="text-2xl font-black text-white">Agency Directory</h1>
          <p className="text-xs text-[#97A0B3]">
            Subscribed agency workspaces · Real records from Supabase PostgreSQL
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => void refetch()}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#161F2D] border border-[#2A3446] hover:border-[#7FA0D6]/40 text-xs font-bold text-[#97A0B3] hover:text-white transition-all cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Refresh
          </button>
          <button
            type="button"
            onClick={() => setShowProvisionModal(true)}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-[#7FA0D6] to-[#4F70A6] text-black text-xs font-black hover:opacity-90 transition-opacity cursor-pointer shadow-lg shadow-[#7FA0D6]/10"
          >
            <Plus className="w-3.5 h-3.5" />
            Provision Agency
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-[#161F2D] border border-[#2A3446] rounded-2xl p-4 flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#97A0B3]" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by agency name, code, slug, or owner email..."
            className="w-full pl-10 pr-4 py-2 rounded-xl bg-[#0B111C] border border-[#2A3446] text-sm text-white placeholder-[#97A0B3] focus:outline-none focus:border-[#7FA0D6]"
          />
        </div>

        <div className="flex items-center gap-2">
          <div className="relative">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="appearance-none pl-3 pr-8 py-2 rounded-xl bg-[#0B111C] border border-[#2A3446] text-xs font-bold text-white focus:outline-none focus:border-[#7FA0D6] cursor-pointer"
            >
              <option value="all">All Statuses ({agencies.length})</option>
              <option value="active">Active</option>
              <option value="trial">Trial</option>
              <option value="past_due">Past Due</option>
              <option value="suspended">Suspended</option>
            </select>
            <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#97A0B3] pointer-events-none" />
          </div>
        </div>
      </div>

      {isLoading && (
        <div className="p-12 text-center bg-[#161F2D] border border-[#2A3446] rounded-2xl">
          <CreoInlineLoader label="Loading agencies from database..." />
        </div>
      )}

      {/* Agencies Table Card */}
      <div className="bg-[#161F2D] border border-[#2A3446] rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-[#2A3446]">
                <th className="px-5 py-3.5 text-[11px] font-black uppercase tracking-wider text-[#7FA0D6]">Agency</th>
                <th className="px-5 py-3.5 text-[11px] font-black uppercase tracking-wider text-[#7FA0D6]">Owner / Contact</th>
                <th className="px-5 py-3.5 text-[11px] font-black uppercase tracking-wider text-[#7FA0D6]">SaaS Plan</th>
                <th className="px-5 py-3.5 text-[11px] font-black uppercase tracking-wider text-[#7FA0D6]">MRR</th>
                <th className="px-5 py-3.5 text-[11px] font-black uppercase tracking-wider text-[#7FA0D6]">Capacity</th>
                <th className="px-5 py-3.5 text-[11px] font-black uppercase tracking-wider text-[#7FA0D6]">Status</th>
                <th className="px-5 py-3.5 text-[11px] font-black uppercase tracking-wider text-[#7FA0D6]">Created</th>
                <th className="px-5 py-3.5 text-[11px] font-black uppercase tracking-wider text-[#7FA0D6] text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#2A3446]">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-5 py-12 text-center text-sm text-[#97A0B3]">
                    No agencies match the selected filter.
                  </td>
                </tr>
              ) : (
                filtered.map((a) => (
                  <tr key={a.id} className="hover:bg-[#0B111C]/40 transition-colors">
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <div className="size-9 rounded-xl bg-[#0B111C] border border-[#2A3446] flex items-center justify-center text-xs font-black text-[#7FA0D6]">
                          {a.name.slice(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <span className="text-[13px] font-black text-white hover:text-[#7FA0D6] transition-colors">
                            {a.name}
                          </span>
                          <p className="text-[11px] text-[#97A0B3]">{a.code} · /{a.slug}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      <p className="text-[12px] font-bold text-white">{a.owner}</p>
                      <p className="text-[11px] text-[#97A0B3]">{a.email}</p>
                    </td>
                    <td className="px-5 py-4">
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold bg-[#7FA0D6]/10 text-[#BCCCE6] border border-[#7FA0D6]/20">
                        {a.plan}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-[13px] font-black text-white">{fmt(a.mrr)}</td>
                    <td className="px-5 py-4">
                      <p className="text-[12px] font-bold text-white">{(a.clients_count ?? 0)} / {a.max_clients} clients</p>
                      <p className="text-[11px] text-[#97A0B3]">{(a.seats_count ?? 0)} / {a.max_staff} seats</p>
                    </td>
                    <td className="px-5 py-4">
                      <StatusBadge status={a.status} />
                    </td>
                    <td className="px-5 py-4 text-[12px] text-[#97A0B3]">{a.joined}</td>
                    <td className="px-5 py-4 text-right">
                      <Link
                        to={`/platform/agencies/${a.id}`}
                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-[#0B111C] border border-[#2A3446] hover:border-[#7FA0D6]/40 text-xs font-bold text-[#7FA0D6] hover:text-white transition-all cursor-pointer"
                      >
                        Inspect
                        <ArrowUpRight className="w-3.5 h-3.5" />
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Provision Agency Modal */}
      {showProvisionModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#161F2D] border border-[#2A3446] rounded-2xl w-full max-w-lg p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-[#2A3446] pb-3">
              <h2 className="text-lg font-black text-white">Provision New Agency</h2>
              <button
                type="button"
                onClick={() => setShowProvisionModal(false)}
                className="text-[#97A0B3] hover:text-white"
              >
                ✕
              </button>
            </div>

            {errorMsg && (
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-xs text-rose-400">
                {errorMsg}
              </div>
            )}

            <div className="space-y-3">
              <div>
                <label className="text-[11px] font-bold text-[#97A0B3] uppercase">Agency Name</label>
                <input
                  type="text"
                  value={provisionName}
                  onChange={(e) => setProvisionName(e.target.value)}
                  placeholder="e.g. Apex Media Agency"
                  className="w-full mt-1 px-3 py-2 rounded-xl bg-[#0B111C] border border-[#2A3446] text-sm text-white focus:outline-none focus:border-[#7FA0D6]"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-[#97A0B3] uppercase">Public Slug</label>
                <input
                  type="text"
                  value={provisionSlug}
                  onChange={(e) => setProvisionSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""))}
                  placeholder="e.g. apexmedia"
                  className="w-full mt-1 px-3 py-2 rounded-xl bg-[#0B111C] border border-[#2A3446] text-sm text-white focus:outline-none focus:border-[#7FA0D6]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-bold text-[#97A0B3] uppercase">Admin Full Name</label>
                  <input
                    type="text"
                    value={provisionAdminName}
                    onChange={(e) => setProvisionAdminName(e.target.value)}
                    placeholder="e.g. Rajesh Sharma"
                    className="w-full mt-1 px-3 py-2 rounded-xl bg-[#0B111C] border border-[#2A3446] text-sm text-white focus:outline-none focus:border-[#7FA0D6]"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-bold text-[#97A0B3] uppercase">Admin Email</label>
                  <input
                    type="email"
                    value={provisionEmail}
                    onChange={(e) => setProvisionEmail(e.target.value)}
                    placeholder="e.g. rajesh@apex.in"
                    className="w-full mt-1 px-3 py-2 rounded-xl bg-[#0B111C] border border-[#2A3446] text-sm text-white focus:outline-none focus:border-[#7FA0D6]"
                  />
                </div>
              </div>

              <div>
                <label className="text-[11px] font-bold text-[#97A0B3] uppercase">Initial Password</label>
                <input
                  type="password"
                  value={provisionPassword}
                  onChange={(e) => setProvisionPassword(e.target.value)}
                  placeholder="Set initial password"
                  className="w-full mt-1 px-3 py-2 rounded-xl bg-[#0B111C] border border-[#2A3446] text-sm text-white focus:outline-none focus:border-[#7FA0D6]"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-[#97A0B3] uppercase">SaaS Plan Tier</label>
                <select
                  value={provisionPlan}
                  onChange={(e) => setProvisionPlan(e.target.value)}
                  className="w-full mt-1 px-3 py-2 rounded-xl bg-[#0B111C] border border-[#2A3446] text-sm text-white focus:outline-none focus:border-[#7FA0D6]"
                >
                  <option value="launch">Launch Tier (₹1,999/mo · 10 clients)</option>
                  <option value="growth">Growth Tier (₹5,999/mo · 50 clients)</option>
                  <option value="scale">Scale Tier (₹9,999/mo · 150 clients)</option>
                  <option value="enterprise">Enterprise Tier (₹14,999/mo · Unlimited)</option>
                </select>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#2A3446]">
              <button
                type="button"
                onClick={() => setShowProvisionModal(false)}
                className="px-4 py-2 rounded-xl bg-[#0B111C] border border-[#2A3446] text-xs font-bold text-[#97A0B3] hover:text-white"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={provisionMutation.isPending || !provisionName || !provisionEmail || !provisionPassword}
                onClick={() => provisionMutation.mutate()}
                className="px-5 py-2 rounded-xl bg-gradient-to-r from-[#7FA0D6] to-[#4F70A6] text-black text-xs font-black hover:opacity-90 disabled:opacity-50"
              >
                {provisionMutation.isPending ? "Provisioning..." : "Provision Agency"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Agency Detail Page (Scoped for Super Admin Privacy) ──────────────────────

export function PlatformAgencyDetailPage() {
  const { agencyId } = useParams<{ agencyId: string }>();
  const queryClient = useQueryClient();

  const [activeTab, setActiveTab] = useState<"Plan" | "Teams" | "Packages" | "Clients" | "Support">("Plan");
  const [clientSearch, setClientSearch] = useState("");
  const [staffSearch, setStaffSearch] = useState("");
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedPricing, setCopiedPricing] = useState(false);

  // Modals state
  const [editingClientPlan, setEditingClientPlan] = useState<ClientPlanItem | null>(null);
  const [showSlugModal, setShowSlugModal] = useState(false);
  const [newSlug, setNewSlug] = useState("");
  const [newCustomDomain, setNewCustomDomain] = useState("");

  // Plan Negotiation Modal state
  const [showNegotiateModal, setShowNegotiateModal] = useState(false);
  const [negotiatedTier, setNegotiatedTier] = useState("growth");
  const [negotiatedAmount, setNegotiatedAmount] = useState<number>(5999);
  const [customClientsLimit, setCustomClientsLimit] = useState<number>(50);
  const [customStaffLimit, setCustomStaffLimit] = useState<number>(15);
  const [negotiateNotes, setNegotiateNotes] = useState("");

  // Support Assistance Modal
  const [showSupportModal, setShowSupportModal] = useState(false);
  const [supportTitle, setSupportTitle] = useState("");
  const [supportDesc, setSupportDesc] = useState("");
  const [supportPriority, setSupportPriority] = useState("medium");

  const { data: agency, isLoading } = useQuery<AgencyItem>({
    queryKey: ["platform-agency", agencyId],
    queryFn: () => request<AgencyItem>(`/api/v1/platform/agencies/${agencyId || "00000000-0000-0000-0000-000000000001"}/details`),
  });

  const suspendMutation = useMutation({
    mutationFn: () =>
      request<{ status: string }>(`/api/v1/platform/agencies/${agency?.id}/suspend`, { method: "POST" }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["platform-agency", agencyId] });
      void queryClient.invalidateQueries({ queryKey: ["platform-agencies"] });
      void queryClient.invalidateQueries({ queryKey: ["platform-overview"] });
    },
  });

  const negotiateMutation = useMutation({
    mutationFn: () =>
      request<{ status: string }>(`/api/v1/platform/agencies/${agency?.id}/plan`, {
        method: "PATCH",
        body: JSON.stringify({
          plan_tier: negotiatedTier,
          negotiated_amount: negotiatedAmount,
          max_clients: customClientsLimit,
          max_staff: customStaffLimit,
          notes: negotiateNotes,
        }),
      }),
    onSuccess: () => {
      setShowNegotiateModal(false);
      void queryClient.invalidateQueries({ queryKey: ["platform-agency", agencyId] });
      void queryClient.invalidateQueries({ queryKey: ["platform-agencies"] });
      void queryClient.invalidateQueries({ queryKey: ["platform-overview"] });
      void queryClient.invalidateQueries({ queryKey: ["platform-subscriptions"] });
    },
  });

  const supportMutation = useMutation({
    mutationFn: () =>
      request<{ status: string }>(`/api/v1/platform/agencies/${agency?.id}/support`, {
        method: "POST",
        body: JSON.stringify({
          title: supportTitle,
          description: supportDesc,
          priority: supportPriority,
        }),
      }),
    onSuccess: () => {
      setShowSupportModal(false);
      setSupportTitle("");
      setSupportDesc("");
      void queryClient.invalidateQueries({ queryKey: ["platform-agency", agencyId] });
    },
  });

  const editClientPlanMutation = useMutation({
    mutationFn: (vars: { planId: string; data: Partial<ClientPlanItem> }) =>
      request<{ status: string; plan: ClientPlanItem }>(
        `/api/v1/platform/agencies/${agency?.id}/client-plans/${vars.planId}`,
        {
          method: "PATCH",
          body: JSON.stringify(vars.data),
        }
      ),
    onSuccess: () => {
      setEditingClientPlan(null);
      void queryClient.invalidateQueries({ queryKey: ["platform-agency", agencyId] });
    },
  });

  const slugMutation = useMutation({
    mutationFn: () =>
      request<{ status: string; slug: string; custom_domain?: string }>(
        `/api/v1/platform/agencies/${agency?.id}/slug`,
        {
          method: "PATCH",
          body: JSON.stringify({ slug: newSlug, custom_domain: newCustomDomain || null }),
        }
      ),
    onSuccess: () => {
      setShowSlugModal(false);
      void queryClient.invalidateQueries({ queryKey: ["platform-agency", agencyId] });
      void queryClient.invalidateQueries({ queryKey: ["platform-agencies"] });
    },
  });

  if (isLoading) {
    return (
      <div className="p-12 text-center bg-[#161F2D] border border-[#2A3446] rounded-2xl">
        <CreoInlineLoader label="Loading agency profile from database..." />
      </div>
    );
  }

  if (!agency) {
    return (
      <div className="p-8 text-center text-sm text-[#97A0B3] bg-[#161F2D] border border-[#2A3446] rounded-2xl">
        Agency not found.
      </div>
    );
  }

  const clientsList = agency.clients ?? [];
  const filteredClients = clientsList.filter(
    (c) =>
      !clientSearch ||
      c.name.toLowerCase().includes(clientSearch.toLowerCase()) ||
      c.email.toLowerCase().includes(clientSearch.toLowerCase())
  );

  const staffList = agency.staff ?? [];
  const filteredStaff = staffList.filter(
    (s) =>
      !staffSearch ||
      s.name.toLowerCase().includes(staffSearch.toLowerCase()) ||
      s.email.toLowerCase().includes(staffSearch.toLowerCase()) ||
      s.role.toLowerCase().includes(staffSearch.toLowerCase()) ||
      s.team_name.toLowerCase().includes(staffSearch.toLowerCase())
  );

  const teamsList = agency.teams ?? [];
  const clientPlans = agency.client_plans ?? [];
  const supportTickets = agency.support_tickets ?? [];

  const onboardingUrl = `${window.location.origin}/onboarding?agency=${agency.slug}`;
  const pricingUrl = `${window.location.origin}/pricing?agency=${agency.slug}`;

  return (
    <div className="space-y-6 pb-8">
      {/* Back button */}
      <div className="flex items-center gap-3 pt-1">
        <Link to="/platform/agencies" className="text-[#97A0B3] hover:text-white transition-colors text-sm font-bold">
          ← Agencies Directory
        </Link>
      </div>

      {/* Agency Header Card */}
      <div className="bg-[#161F2D] border border-[#2A3446] rounded-2xl p-5 sm:p-6">
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="size-14 rounded-2xl bg-[#0B111C] border border-[#2A3446] flex items-center justify-center">
              <span className="text-lg font-black text-[#7FA0D6]">{agency.name.slice(0, 2).toUpperCase()}</span>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-black text-white">{agency.name}</h1>
                <StatusBadge status={agency.status} />
              </div>
              <p className="text-sm text-[#97A0B3]">{agency.code} · /{agency.slug}</p>
              <p className="text-xs text-[#97A0B3] mt-0.5">Agency Admin: {agency.owner} ({agency.email})</p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              onClick={() => {
                setNegotiatedTier(agency.plan_tier || "growth");
                setNegotiatedAmount(agency.mrr || 5999);
                setCustomClientsLimit(agency.max_clients || 50);
                setCustomStaffLimit(agency.max_staff || 15);
                setShowNegotiateModal(true);
              }}
              className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-[#7FA0D6] to-[#4F70A6] text-black text-xs font-black hover:opacity-90 transition-opacity cursor-pointer flex items-center gap-1.5 shadow-md shadow-[#7FA0D6]/10"
            >
              <Sliders className="w-3.5 h-3.5" />
              Change / Negotiate Plan
            </button>
            <button
              type="button"
              disabled={suspendMutation.isPending}
              onClick={() => suspendMutation.mutate()}
              className="px-3 py-1.5 rounded-xl bg-[#0B111C] border border-[#2A3446] hover:border-rose-500/40 text-xs font-bold text-[#97A0B3] hover:text-rose-400 transition-all cursor-pointer flex items-center gap-1.5"
            >
              <ShieldAlert className="w-3.5 h-3.5" />
              {agency.status === "suspended" ? "Reactivate Workspace" : "Suspend Agency"}
            </button>
          </div>
        </div>

        {/* Scoped Metric Bars */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-6 pt-5 border-t border-[#2A3446]">
          <div>
            <p className="text-[11px] font-black uppercase tracking-wider text-[#97A0B3]">Active Plan</p>
            <p className="text-lg font-black text-[#7FA0D6] mt-1">{agency.plan}</p>
          </div>
          <div>
            <p className="text-[11px] font-black uppercase tracking-wider text-[#97A0B3]">Contract Value</p>
            <p className="text-lg font-black text-white mt-1">₹{agency.mrr.toLocaleString()}/mo</p>
          </div>
          <div>
            <p className="text-[11px] font-black uppercase tracking-wider text-[#97A0B3]">Staff & Pod Seats</p>
            <p className="text-lg font-black text-white mt-1">{staffList.length} / {agency.max_staff}</p>
          </div>
          <div>
            <p className="text-[11px] font-black uppercase tracking-wider text-[#97A0B3]">Storage Quota</p>
            <p className="text-lg font-black text-white mt-1">
              {agency.storage?.used_gb ?? 1.4} GB / {agency.storage?.quota_gb ?? 100} GB
            </p>
          </div>
        </div>
      </div>

      {/* Personalized Links & Brand Isolation Banner */}
      <div className="bg-[#161F2D] border border-[#2A3446] rounded-2xl p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="size-10 rounded-xl bg-[#0B111C] border border-[#2A3446] flex items-center justify-center text-[#7FA0D6]">
              <Globe className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-black text-white">Agency Personalized Onboarding & Pricing Links</h2>
              <p className="text-xs text-[#97A0B3]">
                Dedicated URLs ensuring prospective clients see exclusively {agency.name}'s packages and branding
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => {
              setNewSlug(agency.slug);
              setNewCustomDomain(agency.custom_domain || "");
              setShowSlugModal(true);
            }}
            className="px-3 py-1.5 rounded-xl bg-[#0B111C] hover:bg-[#2A3446] border border-[#2A3446] text-xs font-bold text-[#7FA0D6] hover:text-white transition-all flex items-center gap-1.5 self-start sm:self-auto cursor-pointer"
          >
            <Edit3 className="w-3.5 h-3.5" />
            Customize Vanity Slug
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
          {/* Onboarding Link */}
          <div className="p-3.5 rounded-xl bg-[#0B111C] border border-[#2A3446] flex flex-col justify-between gap-2">
            <div>
              <span className="text-[10px] font-black uppercase tracking-wider text-[#97A0B3]">Personalized Client Onboarding URL</span>
              <p className="text-xs font-mono font-bold text-[#7FA0D6] mt-0.5 break-all">
                {onboardingUrl}
              </p>
            </div>
            <div className="flex items-center gap-2 pt-2 border-t border-[#2A3446]/60">
              <button
                type="button"
                onClick={() => {
                  navigator.clipboard.writeText(onboardingUrl);
                  setCopiedLink(true);
                  setTimeout(() => setCopiedLink(false), 2000);
                }}
                className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[#161F2D] hover:bg-[#2A3446] text-xs font-bold text-white transition-colors cursor-pointer"
              >
                {copiedLink ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-[#97A0B3]" />}
                {copiedLink ? "Copied!" : "Copy Link"}
              </button>
              <a
                href={`/onboarding?agency=${agency.slug}`}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[#161F2D] hover:bg-[#2A3446] text-xs font-bold text-[#97A0B3] hover:text-white transition-colors"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                Open In New Tab
              </a>
            </div>
          </div>

          {/* Pricing Link */}
          <div className="p-3.5 rounded-xl bg-[#0B111C] border border-[#2A3446] flex flex-col justify-between gap-2">
            <div>
              <span className="text-[10px] font-black uppercase tracking-wider text-[#97A0B3]">Agency Isolated Pricing Catalog URL</span>
              <p className="text-xs font-mono font-bold text-[#7FA0D6] mt-0.5 break-all">
                {pricingUrl}
              </p>
            </div>
            <div className="flex items-center gap-2 pt-2 border-t border-[#2A3446]/60">
              <button
                type="button"
                onClick={() => {
                  navigator.clipboard.writeText(pricingUrl);
                  setCopiedPricing(true);
                  setTimeout(() => setCopiedPricing(false), 2000);
                }}
                className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[#161F2D] hover:bg-[#2A3446] text-xs font-bold text-white transition-colors cursor-pointer"
              >
                {copiedPricing ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-[#97A0B3]" />}
                {copiedPricing ? "Copied!" : "Copy Link"}
              </button>
              <a
                href={`/pricing?agency=${agency.slug}`}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[#161F2D] hover:bg-[#2A3446] text-xs font-bold text-[#97A0B3] hover:text-white transition-colors"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                Open In New Tab
              </a>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 bg-[#0B111C] border border-[#2A3446] rounded-xl w-fit flex-wrap">
        <button
          type="button"
          onClick={() => setActiveTab("Plan")}
          className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
            activeTab === "Plan"
              ? "bg-gradient-to-r from-[#7FA0D6] to-[#4F70A6] text-black shadow-md font-black"
              : "text-[#97A0B3] hover:text-white"
          }`}
        >
          Plan & Storage
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("Teams")}
          className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
            activeTab === "Teams"
              ? "bg-gradient-to-r from-[#7FA0D6] to-[#4F70A6] text-black shadow-md font-black"
              : "text-[#97A0B3] hover:text-white"
          }`}
        >
          Teams & Staff ({staffList.length})
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("Packages")}
          className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
            activeTab === "Packages"
              ? "bg-gradient-to-r from-[#7FA0D6] to-[#4F70A6] text-black shadow-md font-black"
              : "text-[#97A0B3] hover:text-white"
          }`}
        >
          Client Packages Offered ({clientPlans.length})
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("Clients")}
          className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
            activeTab === "Clients"
              ? "bg-gradient-to-r from-[#7FA0D6] to-[#4F70A6] text-black shadow-md font-black"
              : "text-[#97A0B3] hover:text-white"
          }`}
        >
          Agency Clients ({clientsList.length})
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("Support")}
          className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
            activeTab === "Support"
              ? "bg-gradient-to-r from-[#7FA0D6] to-[#4F70A6] text-black shadow-md font-black"
              : "text-[#97A0B3] hover:text-white"
          }`}
        >
          Support History ({supportTickets.length})
        </button>
      </div>

      {/* Tab 1: Plan & Payment Details */}
      {activeTab === "Plan" && (
        <div className="space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-5 rounded-2xl bg-[#161F2D] border border-[#2A3446] space-y-2">
              <div className="flex items-center justify-between text-xs text-[#97A0B3]">
                <span className="font-bold uppercase tracking-wider">Current Tier</span>
                <CreditCard className="w-4 h-4 text-[#7FA0D6]" />
              </div>
              <p className="text-xl font-black text-white">{agency.plan} Tier</p>
              <p className="text-xs text-emerald-400 font-bold">Active Standing</p>
              <p className="text-[11px] text-[#97A0B3]">Contract rate: ₹{agency.mrr.toLocaleString()}/month</p>
            </div>

            <div className="p-5 rounded-2xl bg-[#161F2D] border border-[#2A3446] space-y-2">
              <div className="flex items-center justify-between text-xs text-[#97A0B3]">
                <span className="font-bold uppercase tracking-wider">Storage Consumption</span>
                <HardDrive className="w-4 h-4 text-[#7FA0D6]" />
              </div>
              <p className="text-xl font-black text-white">
                {agency.storage?.used_gb ?? 1.4} GB <span className="text-xs text-[#97A0B3]">/ {agency.storage?.quota_gb ?? 100} GB</span>
              </p>
              <div className="w-full h-1.5 rounded-full bg-[#0B111C] overflow-hidden border border-[#2A3446]">
                <div
                  className="h-full bg-gradient-to-r from-[#7FA0D6] to-emerald-400"
                  style={{ width: `${agency.storage?.percentage ?? 1.4}%` }}
                />
              </div>
              <p className="text-[11px] text-[#97A0B3]">
                {((agency.storage?.quota_gb ?? 100) - (agency.storage?.used_gb ?? 1.4)).toFixed(1)} GB available
              </p>
            </div>

            <div className="p-5 rounded-2xl bg-[#161F2D] border border-[#2A3446] space-y-2">
              <div className="flex items-center justify-between text-xs text-[#97A0B3]">
                <span className="font-bold uppercase tracking-wider">Payment Gateway</span>
                <span className="text-[10px] font-mono font-bold text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded">
                  Connected
                </span>
              </div>
              <p className="text-xl font-black text-white">Razorpay</p>
              <p className="text-xs text-[#97A0B3]">
                Next renewal: {agency.subscription?.period_end ? new Date(agency.subscription.period_end).toLocaleDateString() : "Active"}
              </p>
              <p className="text-[11px] text-[#7FA0D6] font-mono">India Subscriptions Route</p>
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: Teams & Staff */}
      {activeTab === "Teams" && (
        <div className="space-y-6">
          {/* Teams / Pods Cards */}
          <div>
            <h2 className="text-base font-black text-white mb-3">Creative Teams & Pods ({teamsList.length})</h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {teamsList.map((team) => (
                <div key={team.id} className="p-4 rounded-2xl bg-[#161F2D] border border-[#2A3446] space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-black text-white flex items-center gap-2">
                      <Layers className="w-4 h-4 text-[#7FA0D6]" />
                      {team.name}
                    </span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                      Active
                    </span>
                  </div>
                  <p className="text-xs text-[#97A0B3]">
                    Pod Lead: <span className="font-bold text-white">{team.lead_name}</span>
                  </p>
                  <p className="text-[11px] text-[#7FA0D6]">
                    {team.members_count} team members assigned
                  </p>
                </div>
              ))}
              {teamsList.length === 0 && (
                <div className="col-span-3 p-6 text-center bg-[#161F2D] border border-[#2A3446] rounded-2xl text-xs text-[#97A0B3]">
                  No pods configured yet.
                </div>
              )}
            </div>
          </div>

          {/* Staff Directory Table */}
          <div className="bg-[#161F2D] border border-[#2A3446] rounded-2xl p-5 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h2 className="text-base font-black text-white">Agency Staff Directory ({staffList.length})</h2>
                <p className="text-xs text-[#97A0B3]">Staff seats utilized under the agency's {agency.plan} plan quota</p>
              </div>
              <div className="relative w-full sm:w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#97A0B3]" />
                <input
                  type="text"
                  value={staffSearch}
                  onChange={(e) => setStaffSearch(e.target.value)}
                  placeholder="Search staff members..."
                  className="w-full pl-9 pr-3 py-1.5 rounded-xl bg-[#0B111C] border border-[#2A3446] text-xs text-white placeholder-[#97A0B3] focus:outline-none focus:border-[#7FA0D6]"
                />
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-[#2A3446]">
                    <th className="px-4 py-3 text-[11px] font-black uppercase tracking-wider text-[#7FA0D6]">Member Name</th>
                    <th className="px-4 py-3 text-[11px] font-black uppercase tracking-wider text-[#7FA0D6]">Email</th>
                    <th className="px-4 py-3 text-[11px] font-black uppercase tracking-wider text-[#7FA0D6]">Role</th>
                    <th className="px-4 py-3 text-[11px] font-black uppercase tracking-wider text-[#7FA0D6]">Team / Pod</th>
                    <th className="px-4 py-3 text-[11px] font-black uppercase tracking-wider text-[#7FA0D6]">Status</th>
                    <th className="px-4 py-3 text-[11px] font-black uppercase tracking-wider text-[#7FA0D6]">Joined</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#2A3446]">
                  {filteredStaff.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-4 py-8 text-center text-sm text-[#97A0B3]">
                        No staff members found.
                      </td>
                    </tr>
                  ) : (
                    filteredStaff.map((s) => (
                      <tr key={s.id} className="hover:bg-[#0B111C]/40 transition-colors">
                        <td className="px-4 py-3 text-xs font-bold text-white">{s.name}</td>
                        <td className="px-4 py-3 text-xs text-[#BCCCE6] font-mono">{s.email}</td>
                        <td className="px-4 py-3">
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-[#7FA0D6]/15 text-[#7FA0D6] border border-[#7FA0D6]/30 uppercase">
                            {s.role}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-xs text-white font-medium">{s.team_name}</td>
                        <td className="px-4 py-3">
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 capitalize">
                            {s.status}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-xs text-[#97A0B3]">{s.joined}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Tab 3: Client Packages Offered & Editable */}
      {activeTab === "Packages" && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-base font-black text-white">Client Pricing Packages Offered by {agency.name}</h2>
              <p className="text-xs text-[#97A0B3]">
                Packages this agency sells to their onboarding clients. You can edit quotas, prices, and features directly.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {clientPlans.map((p) => (
              <div
                key={p.id}
                className="p-5 rounded-2xl bg-[#161F2D] border border-[#2A3446] hover:border-[#7FA0D6]/40 flex flex-col justify-between gap-4 transition-all"
              >
                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-black text-white">{p.display_name}</span>
                    {p.is_recommended && (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#7FA0D6] text-black">
                        Recommended
                      </span>
                    )}
                  </div>
                  <div className="mt-2 pb-3 border-b border-[#2A3446]">
                    <span className="text-2xl font-black text-white">₹{p.monthly_price.toLocaleString()}</span>
                    <span className="text-xs text-[#97A0B3]">/month</span>
                  </div>

                  <div className="grid grid-cols-3 gap-2 my-3 text-center">
                    <div className="p-2 rounded-xl bg-[#0B111C] border border-[#2A3446]">
                      <p className="text-[10px] text-[#97A0B3]">Posters</p>
                      <p className="text-xs font-black text-white">{p.poster_quota}</p>
                    </div>
                    <div className="p-2 rounded-xl bg-[#0B111C] border border-[#2A3446]">
                      <p className="text-[10px] text-[#97A0B3]">Reels</p>
                      <p className="text-xs font-black text-white">{p.reel_quota}</p>
                    </div>
                    <div className="p-2 rounded-xl bg-[#0B111C] border border-[#2A3446]">
                      <p className="text-[10px] text-[#97A0B3]">Stories</p>
                      <p className="text-xs font-black text-white">{p.story_quota}</p>
                    </div>
                  </div>

                  <div className="space-y-1.5 text-xs text-[#BCCCE6]">
                    <div className="flex items-center justify-between">
                      <span className="text-[#97A0B3]">Revision Rounds:</span>
                      <span className="font-bold text-white">{p.revision_rounds}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-[#97A0B3]">Dedicated Manager:</span>
                      <span className="font-bold text-white">{p.has_dedicated_manager ? "Yes" : "No"}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-[#97A0B3]">Active State:</span>
                      <span className={p.is_active ? "text-emerald-400 font-bold" : "text-rose-400 font-bold"}>
                        {p.is_active ? "Available" : "Hidden"}
                      </span>
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setEditingClientPlan(p)}
                  className="w-full flex items-center justify-center gap-1.5 py-2 rounded-xl bg-[#0B111C] hover:bg-[#7FA0D6] hover:text-black border border-[#2A3446] hover:border-[#7FA0D6] text-xs font-black text-white transition-all cursor-pointer"
                >
                  <Edit3 className="w-3.5 h-3.5" />
                  Edit Client Package
                </button>
              </div>
            ))}
            {clientPlans.length === 0 && (
              <div className="col-span-3 p-8 text-center bg-[#161F2D] border border-[#2A3446] rounded-2xl text-[#97A0B3]">
                No client packages configured yet.
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tab 4: Agency Clients List */}
      {activeTab === "Clients" && (
        <div className="bg-[#161F2D] border border-[#2A3446] rounded-2xl overflow-hidden space-y-4 p-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-base font-black text-white">Onboarded Clients ({clientsList.length})</h2>
              <p className="text-xs text-[#97A0B3]">Clients managed by {agency.name} (tenant privacy preserved)</p>
            </div>
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#97A0B3]" />
              <input
                type="text"
                value={clientSearch}
                onChange={(e) => setClientSearch(e.target.value)}
                placeholder="Search clients..."
                className="w-full pl-9 pr-3 py-1.5 rounded-xl bg-[#0B111C] border border-[#2A3446] text-xs text-white placeholder-[#97A0B3] focus:outline-none focus:border-[#7FA0D6]"
              />
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-[#2A3446]">
                  <th className="px-4 py-3 text-[11px] font-black uppercase tracking-wider text-[#7FA0D6]">Client Name</th>
                  <th className="px-4 py-3 text-[11px] font-black uppercase tracking-wider text-[#7FA0D6]">Email</th>
                  <th className="px-4 py-3 text-[11px] font-black uppercase tracking-wider text-[#7FA0D6]">Status</th>
                  <th className="px-4 py-3 text-[11px] font-black uppercase tracking-wider text-[#7FA0D6]">Onboarded Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#2A3446]">
                {filteredClients.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-4 py-8 text-center text-sm text-[#97A0B3]">
                      No clients found matching search.
                    </td>
                  </tr>
                ) : (
                  filteredClients.map((c) => (
                    <tr key={c.id} className="hover:bg-[#0B111C]/40 transition-colors">
                      <td className="px-4 py-3 text-xs font-bold text-white">{c.name}</td>
                      <td className="px-4 py-3 text-xs text-[#BCCCE6] font-mono">{c.email}</td>
                      <td className="px-4 py-3">
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 capitalize">
                          {c.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs text-[#97A0B3]">{c.joined}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 5: Support History & Current Help */}
      {activeTab === "Support" && (
        <div className="bg-[#161F2D] border border-[#2A3446] rounded-2xl p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-black text-white">Agency Support Requests & History</h2>
              <p className="text-xs text-[#97A0B3]">Support tickets submitted by {agency.name} or assistance dispatched</p>
            </div>
            <button
              type="button"
              onClick={() => setShowSupportModal(true)}
              className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-[#7FA0D6] to-[#4F70A6] text-black text-xs font-black hover:opacity-90 transition-opacity cursor-pointer flex items-center gap-1.5"
            >
              <LifeBuoy className="w-3.5 h-3.5" />
              Dispatch Assistance
            </button>
          </div>

          <div className="space-y-3 pt-2">
            {supportTickets.length === 0 ? (
              <div className="p-8 text-center bg-[#0B111C] border border-[#2A3446] rounded-xl text-[#97A0B3]">
                <LifeBuoy className="w-6 h-6 mx-auto mb-2 text-[#7FA0D6]" />
                <p className="text-xs font-bold text-white">No unresolved support tickets</p>
                <p className="text-[11px] text-[#97A0B3] mt-1">Agency is operating smoothly with 0 open escalations.</p>
              </div>
            ) : (
              supportTickets.map((t) => (
                <div key={t.id} className="p-4 rounded-xl bg-[#0B111C] border border-[#2A3446] space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-bold text-white">{t.title}</span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 uppercase">
                      {t.status}
                    </span>
                  </div>
                  <p className="text-xs text-[#BCCCE6]">{t.description}</p>
                  <div className="flex items-center justify-between text-[11px] text-[#97A0B3] pt-1 border-t border-[#2A3446]/60">
                    <span>Priority: {t.priority}</span>
                    <span>Created: {t.created_at}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Edit Client Package Modal */}
      {editingClientPlan && (
        <EditClientPackageModal
          plan={editingClientPlan}
          isPending={editClientPlanMutation.isPending}
          onClose={() => setEditingClientPlan(null)}
          onSave={(updatedData) =>
            editClientPlanMutation.mutate({ planId: editingClientPlan.id, data: updatedData })
          }
        />
      )}

      {/* Edit Vanity Slug Modal */}
      {showSlugModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#161F2D] border border-[#2A3446] rounded-2xl w-full max-w-md p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-[#2A3446] pb-3">
              <div>
                <h2 className="text-base font-black text-white">Customize Vanity Link & Domain</h2>
                <p className="text-xs text-[#97A0B3]">Sets personalized link path for {agency.name}</p>
              </div>
              <button
                type="button"
                onClick={() => setShowSlugModal(false)}
                className="text-[#97A0B3] hover:text-white"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-[11px] font-bold text-[#97A0B3] uppercase">Agency URL Slug</label>
                <div className="flex items-center mt-1 rounded-xl bg-[#0B111C] border border-[#2A3446] overflow-hidden">
                  <span className="px-3 text-xs text-[#97A0B3] font-mono border-r border-[#2A3446]">/onboarding?agency=</span>
                  <input
                    type="text"
                    value={newSlug}
                    onChange={(e) => setNewSlug(e.target.value)}
                    placeholder="e.g. creo"
                    className="w-full px-3 py-2 text-sm text-white focus:outline-none bg-transparent font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="text-[11px] font-bold text-[#97A0B3] uppercase">White-Label Custom Domain (Optional)</label>
                <input
                  type="text"
                  value={newCustomDomain}
                  onChange={(e) => setNewCustomDomain(e.target.value)}
                  placeholder="e.g. portal.creoagency.com"
                  className="w-full mt-1 px-3 py-2 rounded-xl bg-[#0B111C] border border-[#2A3446] text-sm text-white focus:outline-none focus:border-[#7FA0D6]"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#2A3446]">
              <button
                type="button"
                onClick={() => setShowSlugModal(false)}
                className="px-4 py-2 rounded-xl bg-[#0B111C] border border-[#2A3446] text-xs font-bold text-[#97A0B3] hover:text-white"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={slugMutation.isPending || !newSlug}
                onClick={() => slugMutation.mutate()}
                className="px-5 py-2 rounded-xl bg-gradient-to-r from-[#7FA0D6] to-[#4F70A6] text-black text-xs font-black hover:opacity-90 disabled:opacity-50"
              >
                {slugMutation.isPending ? "Saving..." : "Save Vanity Link"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Plan Negotiation Modal */}
      {showNegotiateModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#161F2D] border border-[#2A3446] rounded-2xl w-full max-w-md p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-[#2A3446] pb-3">
              <div>
                <h2 className="text-base font-black text-white">Negotiate / Change SaaS Plan</h2>
                <p className="text-xs text-[#97A0B3]">Custom contract terms for {agency.name}</p>
              </div>
              <button
                type="button"
                onClick={() => setShowNegotiateModal(false)}
                className="text-[#97A0B3] hover:text-white"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-[11px] font-bold text-[#97A0B3] uppercase">Plan Tier</label>
                <select
                  value={negotiatedTier}
                  onChange={(e) => setNegotiatedTier(e.target.value)}
                  className="w-full mt-1 px-3 py-2 rounded-xl bg-[#0B111C] border border-[#2A3446] text-sm text-white focus:outline-none focus:border-[#7FA0D6]"
                >
                  <option value="launch">Launch Tier</option>
                  <option value="growth">Growth Tier</option>
                  <option value="scale">Scale Tier</option>
                  <option value="enterprise">Enterprise Tier</option>
                </select>
              </div>

              <div>
                <label className="text-[11px] font-bold text-[#97A0B3] uppercase">Negotiated Monthly Price (INR)</label>
                <input
                  type="number"
                  value={negotiatedAmount}
                  onChange={(e) => setNegotiatedAmount(parseFloat(e.target.value) || 0)}
                  placeholder="e.g. 5000"
                  className="w-full mt-1 px-3 py-2 rounded-xl bg-[#0B111C] border border-[#2A3446] text-sm text-white focus:outline-none focus:border-[#7FA0D6]"
                />
                <p className="text-[10px] text-[#97A0B3] mt-0.5">Allows custom enterprise or discounted pricing.</p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-bold text-[#97A0B3] uppercase">Max Clients Limit</label>
                  <input
                    type="number"
                    value={customClientsLimit}
                    onChange={(e) => setCustomClientsLimit(parseInt(e.target.value, 10) || 50)}
                    className="w-full mt-1 px-3 py-2 rounded-xl bg-[#0B111C] border border-[#2A3446] text-sm text-white focus:outline-none focus:border-[#7FA0D6]"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-bold text-[#97A0B3] uppercase">Staff Seats</label>
                  <input
                    type="number"
                    value={customStaffLimit}
                    onChange={(e) => setCustomStaffLimit(parseInt(e.target.value, 10) || 15)}
                    className="w-full mt-1 px-3 py-2 rounded-xl bg-[#0B111C] border border-[#2A3446] text-sm text-white focus:outline-none focus:border-[#7FA0D6]"
                  />
                </div>
              </div>

              <div>
                <label className="text-[11px] font-bold text-[#97A0B3] uppercase">Negotiation Notes / Contract Reference</label>
                <textarea
                  value={negotiateNotes}
                  onChange={(e) => setNegotiateNotes(e.target.value)}
                  rows={2}
                  placeholder="e.g. Approved 15% annual commitment discount"
                  className="w-full mt-1 px-3 py-2 rounded-xl bg-[#0B111C] border border-[#2A3446] text-sm text-white focus:outline-none focus:border-[#7FA0D6]"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#2A3446]">
              <button
                type="button"
                onClick={() => setShowNegotiateModal(false)}
                className="px-4 py-2 rounded-xl bg-[#0B111C] border border-[#2A3446] text-xs font-bold text-[#97A0B3] hover:text-white"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={negotiateMutation.isPending}
                onClick={() => negotiateMutation.mutate()}
                className="px-5 py-2 rounded-xl bg-gradient-to-r from-[#7FA0D6] to-[#4F70A6] text-black text-xs font-black hover:opacity-90 disabled:opacity-50"
              >
                {negotiateMutation.isPending ? "Applying..." : "Save Negotiated Plan"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Support Assistance Modal */}
      {showSupportModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#161F2D] border border-[#2A3446] rounded-2xl w-full max-w-md p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-[#2A3446] pb-3">
              <div>
                <h2 className="text-base font-black text-white">Dispatch Assistance Ticket</h2>
                <p className="text-xs text-[#97A0B3]">Direct help note for {agency.name}</p>
              </div>
              <button
                type="button"
                onClick={() => setShowSupportModal(false)}
                className="text-[#97A0B3] hover:text-white"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-[11px] font-bold text-[#97A0B3] uppercase">Issue Subject</label>
                <input
                  type="text"
                  value={supportTitle}
                  onChange={(e) => setSupportTitle(e.target.value)}
                  placeholder="e.g. Assistance with Razorpay route settlement"
                  className="w-full mt-1 px-3 py-2 rounded-xl bg-[#0B111C] border border-[#2A3446] text-sm text-white focus:outline-none focus:border-[#7FA0D6]"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-[#97A0B3] uppercase">Priority</label>
                <select
                  value={supportPriority}
                  onChange={(e) => setSupportPriority(e.target.value)}
                  className="w-full mt-1 px-3 py-2 rounded-xl bg-[#0B111C] border border-[#2A3446] text-sm text-white focus:outline-none focus:border-[#7FA0D6]"
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High Escalation</option>
                </select>
              </div>

              <div>
                <label className="text-[11px] font-bold text-[#97A0B3] uppercase">Description / Assistance Note</label>
                <textarea
                  value={supportDesc}
                  onChange={(e) => setSupportDesc(e.target.value)}
                  rows={3}
                  placeholder="Provide resolution or assistance steps..."
                  className="w-full mt-1 px-3 py-2 rounded-xl bg-[#0B111C] border border-[#2A3446] text-sm text-white focus:outline-none focus:border-[#7FA0D6]"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#2A3446]">
              <button
                type="button"
                onClick={() => setShowSupportModal(false)}
                className="px-4 py-2 rounded-xl bg-[#0B111C] border border-[#2A3446] text-xs font-bold text-[#97A0B3] hover:text-white"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={supportMutation.isPending || !supportTitle || !supportDesc}
                onClick={() => supportMutation.mutate()}
                className="px-5 py-2 rounded-xl bg-gradient-to-r from-[#7FA0D6] to-[#4F70A6] text-black text-xs font-black hover:opacity-90 disabled:opacity-50"
              >
                {supportMutation.isPending ? "Dispatching..." : "Dispatch Assistance"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

interface EditClientPackageModalProps {
  plan: ClientPlanItem;
  isPending: boolean;
  onClose: () => void;
  onSave: (data: Partial<ClientPlanItem>) => void;
}

function EditClientPackageModal({ plan, isPending, onClose, onSave }: EditClientPackageModalProps) {
  const [displayName, setDisplayName] = useState(plan.display_name);
  const [monthlyPrice, setMonthlyPrice] = useState(plan.monthly_price);
  const [posterQuota, setPosterQuota] = useState(plan.poster_quota);
  const [reelQuota, setReelQuota] = useState(plan.reel_quota);
  const [storyQuota, setStoryQuota] = useState(plan.story_quota);
  const [revisionRounds, setRevisionRounds] = useState(plan.revision_rounds);
  const [hasDedicatedManager, setHasDedicatedManager] = useState(plan.has_dedicated_manager);
  const [isActive, setIsActive] = useState(plan.is_active);
  const [isRecommended, setIsRecommended] = useState(plan.is_recommended);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    onSave({
      display_name: displayName,
      monthly_price: Number(monthlyPrice),
      poster_quota: Number(posterQuota),
      reel_quota: Number(reelQuota),
      story_quota: Number(storyQuota),
      revision_rounds: Number(revisionRounds),
      has_dedicated_manager: hasDedicatedManager,
      is_active: isActive,
      is_recommended: isRecommended,
    });
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-[#161F2D] border border-[#2A3446] rounded-2xl w-full max-w-lg p-6 space-y-4">
        <div className="flex items-center justify-between border-b border-[#2A3446] pb-3">
          <div>
            <h2 className="text-base font-black text-white">Edit Client Package ({plan.name})</h2>
            <p className="text-xs text-[#97A0B3]">Directly configure the pricing & quota offered to agency clients</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-[#97A0B3] hover:text-white"
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[11px] font-bold text-[#97A0B3] uppercase">Package Display Name</label>
              <input
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                required
                className="w-full mt-1 px-3 py-2 rounded-xl bg-[#0B111C] border border-[#2A3446] text-sm text-white focus:outline-none focus:border-[#7FA0D6]"
              />
            </div>
            <div>
              <label className="text-[11px] font-bold text-[#97A0B3] uppercase">Monthly Price (₹ INR)</label>
              <input
                type="number"
                value={monthlyPrice}
                onChange={(e) => setMonthlyPrice(Number(e.target.value))}
                required
                min={0}
                className="w-full mt-1 px-3 py-2 rounded-xl bg-[#0B111C] border border-[#2A3446] text-sm text-white focus:outline-none focus:border-[#7FA0D6]"
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="text-[11px] font-bold text-[#97A0B3] uppercase">Poster Quota</label>
              <input
                type="number"
                value={posterQuota}
                onChange={(e) => setPosterQuota(Number(e.target.value))}
                required
                min={0}
                className="w-full mt-1 px-3 py-2 rounded-xl bg-[#0B111C] border border-[#2A3446] text-sm text-white focus:outline-none focus:border-[#7FA0D6]"
              />
            </div>
            <div>
              <label className="text-[11px] font-bold text-[#97A0B3] uppercase">Reel Quota</label>
              <input
                type="number"
                value={reelQuota}
                onChange={(e) => setReelQuota(Number(e.target.value))}
                required
                min={0}
                className="w-full mt-1 px-3 py-2 rounded-xl bg-[#0B111C] border border-[#2A3446] text-sm text-white focus:outline-none focus:border-[#7FA0D6]"
              />
            </div>
            <div>
              <label className="text-[11px] font-bold text-[#97A0B3] uppercase">Story Quota</label>
              <input
                type="number"
                value={storyQuota}
                onChange={(e) => setStoryQuota(Number(e.target.value))}
                required
                min={0}
                className="w-full mt-1 px-3 py-2 rounded-xl bg-[#0B111C] border border-[#2A3446] text-sm text-white focus:outline-none focus:border-[#7FA0D6]"
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3 pt-1">
            <div>
              <label className="text-[11px] font-bold text-[#97A0B3] uppercase">Revision Rounds</label>
              <input
                type="number"
                value={revisionRounds}
                onChange={(e) => setRevisionRounds(Number(e.target.value))}
                required
                min={0}
                className="w-full mt-1 px-3 py-2 rounded-xl bg-[#0B111C] border border-[#2A3446] text-sm text-white focus:outline-none focus:border-[#7FA0D6]"
              />
            </div>
            <div className="flex items-center gap-2 pt-6">
              <input
                type="checkbox"
                id="dedicatedManager"
                checked={hasDedicatedManager}
                onChange={(e) => setHasDedicatedManager(e.target.checked)}
                className="size-4 rounded accent-[#7FA0D6]"
              />
              <label htmlFor="dedicatedManager" className="text-xs font-bold text-white cursor-pointer">
                Dedicated Lead
              </label>
            </div>
            <div className="flex items-center gap-2 pt-6">
              <input
                type="checkbox"
                id="isRecommended"
                checked={isRecommended}
                onChange={(e) => setIsRecommended(e.target.checked)}
                className="size-4 rounded accent-[#7FA0D6]"
              />
              <label htmlFor="isRecommended" className="text-xs font-bold text-white cursor-pointer">
                Recommended
              </label>
            </div>
          </div>

          <div className="flex items-center gap-2 pt-2">
            <input
              type="checkbox"
              id="isActive"
              checked={isActive}
              onChange={(e) => setIsActive(e.target.checked)}
              className="size-4 rounded accent-[#7FA0D6]"
            />
            <label htmlFor="isActive" className="text-xs font-bold text-white cursor-pointer">
              Active / Visible on Client Onboarding Page
            </label>
          </div>

          <div className="flex items-center justify-end gap-2 pt-4 border-t border-[#2A3446]">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-[#0B111C] border border-[#2A3446] text-xs font-bold text-[#97A0B3] hover:text-white"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isPending}
              className="flex items-center gap-1.5 px-5 py-2 rounded-xl bg-gradient-to-r from-[#7FA0D6] to-[#4F70A6] text-black text-xs font-black hover:opacity-90 disabled:opacity-50"
            >
              <Save className="w-3.5 h-3.5" />
              {isPending ? "Saving..." : "Save Package"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
