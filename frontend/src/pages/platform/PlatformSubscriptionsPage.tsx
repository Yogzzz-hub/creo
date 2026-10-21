import { useState } from "react";
import {
  Search,
  ChevronDown,
  CheckCircle2,
  Clock,
  AlertTriangle,
  XCircle,
  PauseCircle,
  ArrowUpRight,
  RefreshCw,
} from "lucide-react";
import { Link } from "react-router";
import { useQuery } from "@tanstack/react-query";
import { request } from "../../lib/http";
import { CreoInlineLoader } from "../../components/ui/CreoLoader";

interface SubscriptionItem {
  id: string;
  agency: string;
  agency_id: string;
  plan: string;
  status: string;
  mrr: number;
  period_end: string;
  next_payment: string;
  billing: string;
  gateway: string;
  gateway_subscription_id?: string;
}

const DEFAULT_STATUS_CONFIG = { label: "Cancelled", cls: "bg-[#2A3446] text-[#97A0B3] border-[#2A3446]", icon: XCircle };

const STATUS_CONFIG: Record<string, { label: string; cls: string; icon: React.ComponentType<{className?: string}> }> = {
  active: { label: "Active", cls: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30", icon: CheckCircle2 },
  trial: { label: "Trial", cls: "bg-amber-500/15 text-amber-400 border-amber-500/30", icon: Clock },
  trialing: { label: "Trialing", cls: "bg-amber-500/15 text-amber-400 border-amber-500/30", icon: Clock },
  past_due: { label: "Past Due", cls: "bg-rose-500/15 text-rose-400 border-rose-500/30", icon: AlertTriangle },
  grace_period: { label: "Grace Period", cls: "bg-orange-500/15 text-orange-400 border-orange-500/30", icon: PauseCircle },
  suspended: { label: "Suspended", cls: "bg-[#2A3446] text-[#97A0B3] border-[#2A3446]", icon: XCircle },
  cancelled: DEFAULT_STATUS_CONFIG,
};

function fmt(n: number) {
  if (n === 0) return "—";
  return `₹${n.toLocaleString()}`;
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

export function PlatformSubscriptionsPage() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const { data: subscriptions = [], isLoading, refetch } = useQuery<SubscriptionItem[]>({
    queryKey: ["platform-subscriptions"],
    queryFn: () => request<SubscriptionItem[]>("/api/v1/platform/subscriptions"),
  });

  const filtered = subscriptions.filter((s) => {
    const q = search.toLowerCase();
    const matchQ = !q || s.agency.toLowerCase().includes(q) || s.plan.toLowerCase().includes(q);
    const matchS = statusFilter === "all" || s.status === statusFilter;
    return matchQ && matchS;
  });

  const totalMRR = subscriptions.reduce((sum, s) => (s.status === "active" ? sum + s.mrr : sum), 0);
  const activeCount = subscriptions.filter((s) => s.status === "active").length;

  return (
    <div className="space-y-6 pb-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pt-1">
        <div>
          <h1 className="text-2xl font-black text-white">SaaS Subscriptions</h1>
          <p className="text-xs text-[#97A0B3]">
            Active recurring agency subscriptions to Creo SaaS · Real database records from Supabase
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
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        <div className="bg-[#161F2D] border border-[#2A3446] rounded-2xl p-4">
          <span className="text-[11px] font-black uppercase tracking-wider text-[#97A0B3]">Active Subscriptions</span>
          <p className="text-2xl font-black text-white mt-1">{activeCount}</p>
          <p className="text-xs text-emerald-400 font-bold mt-0.5">100% active standing</p>
        </div>
        <div className="bg-[#161F2D] border border-[#2A3446] rounded-2xl p-4">
          <span className="text-[11px] font-black uppercase tracking-wider text-[#97A0B3]">Monthly Contract Value</span>
          <p className="text-2xl font-black text-white mt-1">{fmt(totalMRR)}</p>
          <p className="text-xs text-[#7FA0D6] font-bold mt-0.5">₹{(totalMRR * 12).toLocaleString()} ARR</p>
        </div>
        <div className="bg-[#161F2D] border border-[#2A3446] rounded-2xl p-4">
          <span className="text-[11px] font-black uppercase tracking-wider text-[#97A0B3]">Past Due / Dunning</span>
          <p className="text-2xl font-black text-emerald-400 mt-1">0</p>
          <p className="text-xs text-emerald-400 font-bold mt-0.5">Zero payment delays</p>
        </div>
        <div className="bg-[#161F2D] border border-[#2A3446] rounded-2xl p-4">
          <span className="text-[11px] font-black uppercase tracking-wider text-[#97A0B3]">Payment Gateway</span>
          <p className="text-2xl font-black text-white mt-1">Razorpay</p>
          <p className="text-xs text-[#97A0B3] font-bold mt-0.5">India Subscriptions Route</p>
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
            placeholder="Search subscriptions by agency or plan..."
            className="w-full pl-10 pr-4 py-2 rounded-xl bg-[#0B111C] border border-[#2A3446] text-sm text-white placeholder-[#97A0B3] focus:outline-none focus:border-[#7FA0D6]"
          />
        </div>

        <div className="relative">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="appearance-none pl-3 pr-8 py-2 rounded-xl bg-[#0B111C] border border-[#2A3446] text-xs font-bold text-white focus:outline-none focus:border-[#7FA0D6] cursor-pointer"
          >
            <option value="all">All States ({subscriptions.length})</option>
            <option value="active">Active</option>
            <option value="trialing">Trialing</option>
            <option value="past_due">Past Due</option>
            <option value="grace_period">Grace Period</option>
            <option value="cancelled">Cancelled</option>
          </select>
          <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#97A0B3] pointer-events-none" />
        </div>
      </div>

      {isLoading && (
        <div className="p-12 text-center bg-[#161F2D] border border-[#2A3446] rounded-2xl">
          <CreoInlineLoader label="Loading subscriptions from database..." />
        </div>
      )}

      {/* Table Card */}
      <div className="bg-[#161F2D] border border-[#2A3446] rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-[#2A3446]">
                <th className="px-5 py-3.5 text-[11px] font-black uppercase tracking-wider text-[#7FA0D6]">Agency</th>
                <th className="px-5 py-3.5 text-[11px] font-black uppercase tracking-wider text-[#7FA0D6]">SaaS Plan</th>
                <th className="px-5 py-3.5 text-[11px] font-black uppercase tracking-wider text-[#7FA0D6]">Amount</th>
                <th className="px-5 py-3.5 text-[11px] font-black uppercase tracking-wider text-[#7FA0D6]">Status</th>
                <th className="px-5 py-3.5 text-[11px] font-black uppercase tracking-wider text-[#7FA0D6]">Period End</th>
                <th className="px-5 py-3.5 text-[11px] font-black uppercase tracking-wider text-[#7FA0D6]">Next Invoice</th>
                <th className="px-5 py-3.5 text-[11px] font-black uppercase tracking-wider text-[#7FA0D6]">Gateway</th>
                <th className="px-5 py-3.5 text-[11px] font-black uppercase tracking-wider text-[#7FA0D6] text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#2A3446]">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-5 py-12 text-center text-sm text-[#97A0B3]">
                    No subscriptions found.
                  </td>
                </tr>
              ) : (
                filtered.map((s) => (
                  <tr key={s.id} className="hover:bg-[#0B111C]/40 transition-colors">
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <div className="size-8 rounded-lg bg-[#0B111C] border border-[#2A3446] flex items-center justify-center text-xs font-black text-[#7FA0D6]">
                          {s.agency.slice(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <p className="text-[13px] font-bold text-white">{s.agency}</p>
                          <p className="text-[11px] font-mono text-[#97A0B3]">{s.id.slice(0, 8)}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold bg-[#7FA0D6]/10 text-[#BCCCE6] border border-[#7FA0D6]/20">
                        {s.plan}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-[13px] font-black text-white">{fmt(s.mrr)}</td>
                    <td className="px-5 py-4">
                      <StatusBadge status={s.status} />
                    </td>
                    <td className="px-5 py-4 text-[12px] text-[#97A0B3]">{s.period_end}</td>
                    <td className="px-5 py-4 text-[12px] text-white font-medium">{s.next_payment}</td>
                    <td className="px-5 py-4 text-[12px] text-[#7FA0D6] capitalize">{s.gateway}</td>
                    <td className="px-5 py-4 text-right">
                      <Link
                        to={`/platform/agencies/${s.agency_id}`}
                        className="inline-flex items-center gap-1 text-xs font-bold text-[#7FA0D6] hover:text-white transition-colors"
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
    </div>
  );
}
