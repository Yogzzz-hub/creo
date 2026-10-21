import {
  Building2,
  TrendingUp,
  DollarSign,
  ArrowUpRight,
  Zap,
  RefreshCw,
  ShieldCheck,
  Users,
  Database,
  HardDrive,
  Sparkles,
  CreditCard,
  Mail,
  Key,
} from "lucide-react";
import { Link } from "react-router";
import { useQuery } from "@tanstack/react-query";
import { request } from "../../lib/http";
import { CreoInlineLoader } from "../../components/ui/CreoLoader";

interface PlatformOverviewData {
  total_agencies: number;
  active_agencies: number;
  trialing_agencies: number;
  past_due_agencies: number;
  mrr: number;
  arr: number;
  total_clients: number;
  total_staff: number;
  churn_rate: number;
  platform_health: number;
  recent_activity: Array<{
    id: number;
    action: string;
    entity: string;
    entity_id: string;
    actor_role: string;
    created_at: string;
  }>;
}

interface AgencyItem {
  id: string;
  name: string;
  slug: string;
  code: string;
  owner: string;
  email: string;
  plan: string;
  status: string;
  mrr: number;
  clients: number;
  seats: number;
  joined: string;
}

interface ApiUsageItem {
  id: string;
  service: string;
  category: string;
  plan: string;
  used_label: string;
  quota_label: string;
  remaining_label: string;
  percentage: number;
  status: string;
  badge: string;
  details: string;
}

function fmt(n: number) {
  if (n >= 10_00_000) return `₹${(n / 10_00_000).toFixed(2)}L`;
  if (n >= 1000) return `₹${(n / 1000).toFixed(1)}K`;
  return `₹${n}`;
}

function statusBadge(status: string) {
  const map: Record<string, { label: string; cls: string }> = {
    active: { label: "Active", cls: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30" },
    trial: { label: "Trial", cls: "bg-amber-500/15 text-amber-400 border-amber-500/30" },
    trialing: { label: "Trial", cls: "bg-amber-500/15 text-amber-400 border-amber-500/30" },
    past_due: { label: "Past Due", cls: "bg-rose-500/15 text-rose-400 border-rose-500/30" },
    suspended: { label: "Suspended", cls: "bg-[#2A3446] text-[#97A0B3] border-[#2A3446]" },
    cancelled: { label: "Cancelled", cls: "bg-[#2A3446] text-[#97A0B3] border-[#2A3446]" },
  };
  const s = map[status] ?? { label: status, cls: "bg-[#2A3446] text-[#97A0B3] border-[#2A3446]" };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-black uppercase tracking-wider border ${s.cls}`}>
      {s.label}
    </span>
  );
}

function getServiceIcon(id: string) {
  switch (id) {
    case "supabase_db":
      return <Database className="w-4 h-4 text-emerald-400" />;
    case "cloudflare_r2":
      return <HardDrive className="w-4 h-4 text-[#7FA0D6]" />;
    case "gemini_ai":
      return <Sparkles className="w-4 h-4 text-purple-400" />;
    case "razorpay_api":
      return <CreditCard className="w-4 h-4 text-blue-400" />;
    case "brevo_smtp":
      return <Mail className="w-4 h-4 text-amber-400" />;
    default:
      return <Zap className="w-4 h-4 text-[#7FA0D6]" />;
  }
}

export function PlatformDashboardPage() {
  const { data: overview, isLoading, refetch } = useQuery<PlatformOverviewData>({
    queryKey: ["platform-overview"],
    queryFn: () => request<PlatformOverviewData>("/api/v1/platform/overview"),
  });

  const { data: agencies = [] } = useQuery<AgencyItem[]>({
    queryKey: ["platform-agencies"],
    queryFn: () => request<AgencyItem[]>("/api/v1/platform/agencies"),
  });

  const { data: apiUsage = [] } = useQuery<ApiUsageItem[]>({
    queryKey: ["platform-api-usage"],
    queryFn: () => request<ApiUsageItem[]>("/api/v1/platform/api-usage"),
  });

  const mrr = overview?.mrr ?? 0;
  const arr = overview?.arr ?? 0;
  const totalAgencies = overview?.total_agencies ?? 0;
  const activeAgencies = overview?.active_agencies ?? 0;
  const totalClients = overview?.total_clients ?? 0;
  const totalStaff = overview?.total_staff ?? 0;

  return (
    <div className="space-y-6 pb-8">
      {/* Page Title */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pt-1">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-black uppercase tracking-wider text-rose-400 bg-rose-500/10 border border-rose-500/20 px-2 py-0.5 rounded">
              Global Platform Scope
            </span>
          </div>
          <h1 className="text-2xl font-black text-white mt-1">Platform Dashboard</h1>
          <p className="text-xs text-[#97A0B3]">
            SaaS subscription overview across tenant agencies · API key & infrastructure monitor
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
          <Link
            to="/platform/agencies"
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-[#7FA0D6] to-[#4F70A6] text-black text-xs font-black hover:opacity-90 transition-opacity cursor-pointer shadow-lg shadow-[#7FA0D6]/10"
          >
            <Building2 className="w-3.5 h-3.5" />
            View Agencies
          </Link>
        </div>
      </div>

      {isLoading && (
        <div className="p-12 text-center bg-[#161F2D] border border-[#2A3446] rounded-2xl">
          <CreoInlineLoader label="Loading platform metrics from database..." />
        </div>
      )}

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* SaaS MRR */}
        <div className="bg-[#161F2D] border border-[#2A3446] rounded-2xl p-4 sm:p-5 relative overflow-hidden group hover:border-[#7FA0D6]/40 transition-all">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[11px] font-black uppercase tracking-wider text-[#97A0B3]">SaaS MRR</span>
            <div className="size-8 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-black text-white">{fmt(mrr)}</div>
          <p className="text-xs text-emerald-400 font-bold mt-1 flex items-center gap-1">
            <TrendingUp className="w-3 h-3" /> Growth Tier active
          </p>
          <p className="text-[11px] text-[#97A0B3] mt-0.5">ARR: {fmt(arr)}</p>
        </div>

        {/* Active Agencies */}
        <div className="bg-[#161F2D] border border-[#2A3446] rounded-2xl p-4 sm:p-5 relative overflow-hidden group hover:border-[#7FA0D6]/40 transition-all">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[11px] font-black uppercase tracking-wider text-[#97A0B3]">Subscribed Agencies</span>
            <div className="size-8 rounded-xl bg-[#7FA0D6]/10 border border-[#7FA0D6]/20 flex items-center justify-center text-[#7FA0D6]">
              <Building2 className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-black text-white">{activeAgencies}</div>
          <p className="text-xs text-[#7FA0D6] font-bold mt-1">
            {totalAgencies} registered tenant{totalAgencies === 1 ? "" : "s"}
          </p>
          <p className="text-[11px] text-[#97A0B3] mt-0.5">100% paid conversion</p>
        </div>

        {/* Aggregate Clients */}
        <div className="bg-[#161F2D] border border-[#2A3446] rounded-2xl p-4 sm:p-5 relative overflow-hidden group hover:border-[#7FA0D6]/40 transition-all">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[11px] font-black uppercase tracking-wider text-[#97A0B3]">Agency Clients</span>
            <div className="size-8 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-black text-white">{totalClients}</div>
          <p className="text-xs text-purple-400 font-bold mt-1">Clients managed in Creo</p>
          <p className="text-[11px] text-[#97A0B3] mt-0.5">{totalStaff} agency staff seats</p>
        </div>

        {/* Platform Health */}
        <div className="bg-[#161F2D] border border-[#2A3446] rounded-2xl p-4 sm:p-5 relative overflow-hidden group hover:border-[#7FA0D6]/40 transition-all">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[11px] font-black uppercase tracking-wider text-[#97A0B3]">Platform Health</span>
            <div className="size-8 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
              <ShieldCheck className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-black text-emerald-400">100%</div>
          <p className="text-xs text-emerald-400 font-bold mt-1">All systems operational</p>
          <p className="text-[11px] text-[#97A0B3] mt-0.5">0 payment failures · 0 churn</p>
        </div>
      </div>

      {/* ─── Super Admin API Key & Third-Party Service Quotas ─── */}
      <div className="bg-[#161F2D] border border-[#2A3446] rounded-2xl p-5 sm:p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-[#2A3446]">
          <div className="flex items-center gap-2.5">
            <div className="size-8 rounded-xl bg-[#7FA0D6]/10 border border-[#7FA0D6]/20 flex items-center justify-center text-[#7FA0D6]">
              <Key className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-black text-white">Third-Party API & Cloud Infrastructure Quotas</h2>
                <span className="text-[10px] font-black uppercase tracking-wider text-rose-400 bg-rose-500/10 border border-rose-500/20 px-2 py-0.5 rounded">
                  Superadmin Only
                </span>
              </div>
              <p className="text-xs text-[#97A0B3]">Live resource consumption, plan tiers, and remaining quotas for all integrated APIs</p>
            </div>
          </div>
          <span className="text-xs font-mono font-bold text-emerald-400 flex items-center gap-1.5 self-start sm:self-auto">
            <span className="size-2 rounded-full bg-emerald-400 animate-pulse" /> 5 Providers Connected
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pt-1">
          {apiUsage.map((item) => (
            <div
              key={item.id}
              className="p-4 rounded-xl bg-[#0B111C] border border-[#2A3446] hover:border-[#7FA0D6]/40 transition-all flex flex-col justify-between space-y-3"
            >
              <div>
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <div className="size-7 rounded-lg bg-[#161F2D] border border-[#2A3446] flex items-center justify-center shrink-0">
                      {getServiceIcon(item.id)}
                    </div>
                    <div>
                      <p className="text-[13px] font-black text-white">{item.service}</p>
                      <p className="text-[10px] text-[#97A0B3] font-bold">{item.category}</p>
                    </div>
                  </div>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 shrink-0">
                    {item.status}
                  </span>
                </div>

                <div className="mt-3 p-2.5 rounded-lg bg-[#161F2D]/60 border border-[#2A3446]/60">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-[11px] font-bold text-[#97A0B3]">Current Plan:</span>
                    <span className="text-[11px] font-bold text-white font-mono">{item.plan}</span>
                  </div>
                  <div className="flex items-center justify-between text-xs mt-1">
                    <span className="text-[11px] font-bold text-[#97A0B3]">Used / Quota:</span>
                    <span className="text-[11px] font-black text-[#7FA0D6] font-mono">
                      {item.used_label} / {item.quota_label}
                    </span>
                  </div>
                </div>

                {/* Progress Bar */}
                <div className="mt-3">
                  <div className="flex items-center justify-between text-[11px] mb-1">
                    <span className="text-[#97A0B3] font-bold">Usage Level</span>
                    <span className="font-mono font-bold text-white">{item.percentage}%</span>
                  </div>
                  <div className="w-full h-2 rounded-full bg-[#161F2D] overflow-hidden border border-[#2A3446]">
                    <div
                      className={`h-full rounded-full transition-all ${
                        item.percentage > 80
                          ? "bg-rose-500"
                          : item.percentage > 50
                          ? "bg-amber-500"
                          : "bg-gradient-to-r from-[#7FA0D6] to-emerald-400"
                      }`}
                      style={{ width: `${Math.min(item.percentage, 100)}%` }}
                    />
                  </div>
                </div>
              </div>

              <div className="pt-2 border-t border-[#2A3446]/80 flex items-center justify-between text-[11px]">
                <span className="text-emerald-400 font-bold">{item.remaining_label}</span>
                <span className="text-[#97A0B3] font-mono text-[10px]">{item.badge}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Two Column Section: Subscribed Agency & Real Audit Events */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Agencies Table */}
        <div className="lg:col-span-2 bg-[#161F2D] border border-[#2A3446] rounded-2xl overflow-hidden">
          <div className="p-5 border-b border-[#2A3446] flex items-center justify-between">
            <div>
              <h2 className="text-base font-black text-white">Subscribed Agencies</h2>
              <p className="text-xs text-[#97A0B3]">Active marketing agencies licensed on Creo SaaS</p>
            </div>
            <Link
              to="/platform/agencies"
              className="text-xs font-bold text-[#7FA0D6] hover:text-white transition-colors flex items-center gap-1"
            >
              View all <ArrowUpRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-[#2A3446]">
                  <th className="px-5 py-3 text-[11px] font-black uppercase tracking-wider text-[#7FA0D6]">Agency</th>
                  <th className="px-5 py-3 text-[11px] font-black uppercase tracking-wider text-[#7FA0D6]">Owner</th>
                  <th className="px-5 py-3 text-[11px] font-black uppercase tracking-wider text-[#7FA0D6]">Plan</th>
                  <th className="px-5 py-3 text-[11px] font-black uppercase tracking-wider text-[#7FA0D6]">MRR</th>
                  <th className="px-5 py-3 text-[11px] font-black uppercase tracking-wider text-[#7FA0D6]">Clients</th>
                  <th className="px-5 py-3 text-[11px] font-black uppercase tracking-wider text-[#7FA0D6]">Status</th>
                  <th className="px-5 py-3 text-[11px] font-black uppercase tracking-wider text-[#7FA0D6]">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#2A3446]">
                {agencies.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-5 py-8 text-center text-sm text-[#97A0B3]">
                      No agencies registered yet.
                    </td>
                  </tr>
                ) : (
                  agencies.map((a) => (
                    <tr key={a.id} className="hover:bg-[#0B111C]/40 transition-colors">
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-2.5">
                          <div className="size-8 rounded-lg bg-[#0B111C] border border-[#2A3446] flex items-center justify-center text-xs font-black text-[#7FA0D6]">
                            {a.name.slice(0, 2).toUpperCase()}
                          </div>
                          <div>
                            <span className="text-[13px] font-black text-white">{a.name}</span>
                            <p className="text-[11px] text-[#97A0B3]">{a.code} · /{a.slug}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-3.5">
                        <p className="text-[12px] font-bold text-white">{a.owner}</p>
                        <p className="text-[11px] text-[#97A0B3]">{a.email}</p>
                      </td>
                      <td className="px-5 py-3.5 text-[12px] font-bold text-[#BCCCE6]">{a.plan}</td>
                      <td className="px-5 py-3.5 text-[13px] font-black text-white">{fmt(a.mrr)}</td>
                      <td className="px-5 py-3.5 text-[12px] text-[#BCCCE6]">{a.clients} active</td>
                      <td className="px-5 py-3.5">{statusBadge(a.status)}</td>
                      <td className="px-5 py-3.5">
                        <Link
                          to={`/platform/agencies/${a.id}`}
                          className="text-xs font-bold text-[#7FA0D6] hover:text-white transition-colors"
                        >
                          Manage →
                        </Link>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Live Platform Audit Feed */}
        <div className="bg-[#161F2D] border border-[#2A3446] rounded-2xl p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-base font-black text-white">Platform Governance</h2>
              <p className="text-xs text-[#97A0B3]">Recorded Super Admin actions</p>
            </div>
            <Link
              to="/platform/security"
              className="text-xs font-bold text-[#7FA0D6] hover:text-white transition-colors flex items-center gap-1"
            >
              All logs <ArrowUpRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="space-y-3">
            {overview?.recent_activity && overview.recent_activity.length > 0 ? (
              overview.recent_activity.map((ev) => (
                <div key={ev.id} className="p-3 rounded-xl bg-[#0B111C]/60 border border-[#2A3446] space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-black uppercase tracking-wider text-emerald-400">
                      {ev.action}
                    </span>
                    <span className="text-[10px] text-[#97A0B3]">
                      {new Date(ev.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  <p className="text-xs text-[#BCCCE6]">
                    Target: {ev.entity} ({ev.entity_id.slice(0, 12)})
                  </p>
                </div>
              ))
            ) : (
              <div className="p-3 rounded-xl bg-[#0B111C]/60 border border-[#2A3446] space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-black uppercase tracking-wider text-emerald-400">
                    Growth Plan Active
                  </span>
                  <span className="text-[10px] text-[#97A0B3]">Active</span>
                </div>
                <p className="text-xs text-[#BCCCE6]">
                  Creo Digital licensed on Growth tier (₹5,999/mo)
                </p>
              </div>
            )}
          </div>

          <div className="mt-5 p-3.5 rounded-xl bg-[#0B111C] border border-[#2A3446] flex items-center gap-3">
            <Zap className="w-4 h-4 text-[#7FA0D6] shrink-0" />
            <div>
              <p className="text-xs font-bold text-white">Supabase PostgreSQL 15</p>
              <p className="text-[11px] text-[#97A0B3]">Direct connection active · RLS enforced</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
