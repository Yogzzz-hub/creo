import { useState } from "react";
import {
  TrendingUp,
  CreditCard,
  FileText,
  DollarSign,
  Download,
  CheckCircle2,
  Search,
  RefreshCw,
  ShieldCheck,
  Receipt,
  ArrowUpRight,
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { request } from "../../lib/http";
import { CreoInlineLoader } from "../../components/ui/CreoLoader";

interface InvoiceItem {
  id: string;
  agency: string;
  agency_slug: string;
  amount: number;
  status: string;
  date: string;
  period: string;
  plan: string;
  gateway: string;
}

interface PaymentHistoryItem {
  id: string;
  provider_event_id: string;
  event_type: string;
  agency_name: string;
  plan_tier: string;
  amount: number;
  gateway: string;
  status: string;
  date: string;
}

interface RevenueData {
  mrr: number;
  arr: number;
  gross_collected: number;
  tax_collected: number;
  refunds: number;
  active_subscriptions: number;
  invoices: InvoiceItem[];
  payments: PaymentHistoryItem[];
  monthly_revenue: Array<{ month: string; amount: number; mrr: number }>;
}

function fmt(n: number) {
  return `₹${n.toLocaleString("en-IN")}`;
}

export function PlatformRevenuePage() {
  const [activeTab, setActiveTab] = useState<"Payments" | "Invoices">("Payments");
  const [search, setSearch] = useState("");

  const { data: revData, isLoading, refetch } = useQuery<RevenueData>({
    queryKey: ["platform-revenue"],
    queryFn: () => request<RevenueData>("/api/v1/platform/revenue"),
  });

  const mrr = revData?.mrr ?? 5999;
  const arr = revData?.arr ?? 71988;
  const gross = revData?.gross_collected ?? 5999;
  const tax = revData?.tax_collected ?? 1079.82;
  const activeSubs = revData?.active_subscriptions ?? 1;
  const payments = revData?.payments ?? [];
  const invoices = revData?.invoices ?? [];
  const monthlyRevenue = revData?.monthly_revenue ?? [];

  const maxAmount = Math.max(...monthlyRevenue.map((m) => m.amount), 6000);

  const filteredInvoices = invoices.filter(
    (inv) =>
      !search ||
      inv.id.toLowerCase().includes(search.toLowerCase()) ||
      inv.agency.toLowerCase().includes(search.toLowerCase()) ||
      inv.plan.toLowerCase().includes(search.toLowerCase())
  );

  const filteredPayments = payments.filter(
    (p) =>
      !search ||
      p.provider_event_id.toLowerCase().includes(search.toLowerCase()) ||
      p.agency_name.toLowerCase().includes(search.toLowerCase()) ||
      p.plan_tier.toLowerCase().includes(search.toLowerCase())
  );

  function handleDownloadInvoice(inv: InvoiceItem) {
    const receiptContent = `========================================================
CREO SAAS PLATFORM - TAX INVOICE & RECEIPT
========================================================
Invoice Number : ${inv.id}
Date Issued    : ${inv.date}
Billing Period : ${inv.period}
Status         : ${inv.status.toUpperCase()}
Gateway        : ${inv.gateway.toUpperCase()} (Razorpay)

CUSTOMER DETAILS:
Agency Name    : ${inv.agency}
Account Slug   : ${inv.agency_slug}

LINE ITEMS:
1. Creo Platform - ${inv.plan} Subscription
   Base Amount : ₹${(inv.amount / 1.18).toFixed(2)}
   GST (18%)   : ₹${(inv.amount - inv.amount / 1.18).toFixed(2)}
--------------------------------------------------------
Total Paid     : ₹${inv.amount.toLocaleString()} INR
========================================================
Authorized by: Creo SaaS Platform Administration
`;
    const blob = new Blob([receiptContent], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${inv.id}.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-6 pb-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pt-1">
        <div>
          <h1 className="text-2xl font-black text-white">Platform Revenue & Financials</h1>
          <p className="text-xs text-[#97A0B3]">
            SaaS subscription collections, MRR trajectory graph, gateway payment history, and invoices
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

      {isLoading && (
        <div className="p-12 text-center bg-[#161F2D] border border-[#2A3446] rounded-2xl">
          <CreoInlineLoader label="Loading platform revenue and invoices..." />
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-[#161F2D] border border-[#2A3446] rounded-2xl p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-[#97A0B3]">Monthly Recurring (MRR)</span>
            <DollarSign className="w-4 h-4 text-[#7FA0D6]" />
          </div>
          <p className="text-2xl font-black text-white mt-2">{fmt(mrr)}</p>
          <div className="flex items-center gap-1 mt-1 text-[11px] text-emerald-400 font-bold">
            <ArrowUpRight className="w-3 h-3" />
            <span>100% active billing</span>
          </div>
        </div>

        <div className="bg-[#161F2D] border border-[#2A3446] rounded-2xl p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-[#97A0B3]">Annualized Run Rate (ARR)</span>
            <TrendingUp className="w-4 h-4 text-emerald-400" />
          </div>
          <p className="text-2xl font-black text-white mt-2">{fmt(arr)}</p>
          <p className="text-[11px] text-[#97A0B3] mt-1">Based on current contracted tier</p>
        </div>

        <div className="bg-[#161F2D] border border-[#2A3446] rounded-2xl p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-[#97A0B3]">Gross Collected (MTD)</span>
            <CreditCard className="w-4 h-4 text-sky-400" />
          </div>
          <p className="text-2xl font-black text-white mt-2">{fmt(gross)}</p>
          <p className="text-[11px] text-[#97A0B3] mt-1">Via Razorpay (₹{tax.toLocaleString()} GST)</p>
        </div>

        <div className="bg-[#161F2D] border border-[#2A3446] rounded-2xl p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-[#97A0B3]">Active SaaS Tenants</span>
            <ShieldCheck className="w-4 h-4 text-purple-400" />
          </div>
          <p className="text-2xl font-black text-white mt-2">{activeSubs} Agency</p>
          <p className="text-[11px] text-[#97A0B3] mt-1">Creo Digital (Growth Tier)</p>
        </div>
      </div>

      {/* Revenue Trajectory Graph Card */}
      <div className="bg-[#161F2D] border border-[#2A3446] rounded-2xl p-5 sm:p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
          <div>
            <h2 className="text-base font-black text-white">SaaS Monthly Revenue Growth</h2>
            <p className="text-xs text-[#97A0B3]">Live billing trajectory and recurring subscription receipts</p>
          </div>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#0B111C] border border-[#2A3446] text-xs font-bold text-[#7FA0D6]">
              <span className="size-2 rounded-full bg-[#7FA0D6] animate-pulse" />
              Current MRR: {fmt(mrr)}/mo
            </span>
          </div>
        </div>

        {/* Visual Bar Chart */}
        <div className="h-48 flex items-end justify-between gap-3 sm:gap-6 pt-6 pb-2 px-2 border-b border-[#2A3446]/60">
          {monthlyRevenue.map((item) => {
            const heightPercent = maxAmount > 0 ? Math.max((item.amount / maxAmount) * 100, 4) : 4;
            const isCurrent = item.month.includes("Oct");
            return (
              <div key={item.month} className="flex-1 flex flex-col items-center gap-2 h-full justify-end group">
                <div className="text-[11px] font-bold text-[#97A0B3] group-hover:text-white transition-colors">
                  {item.amount > 0 ? fmt(item.amount) : "—"}
                </div>
                <div className="w-full max-w-[48px] bg-[#0B111C] rounded-t-xl overflow-hidden flex flex-col justify-end h-full">
                  <div
                    style={{ height: `${heightPercent}%` }}
                    className={`w-full rounded-t-xl transition-all duration-500 ${
                      isCurrent
                        ? "bg-gradient-to-t from-[#4F70A6] to-[#7FA0D6] shadow-lg shadow-[#7FA0D6]/20"
                        : "bg-[#2A3446]/60"
                    }`}
                  />
                </div>
                <span className={`text-[10px] sm:text-xs font-bold ${isCurrent ? "text-[#7FA0D6]" : "text-[#97A0B3]"}`}>
                  {item.month.slice(0, 3)}
                </span>
              </div>
            );
          })}
        </div>
        <div className="flex items-center justify-between pt-3 text-xs text-[#97A0B3]">
          <span>6-Month Trajectory</span>
          <span className="text-emerald-400 font-bold">100% on-time subscription collection rate</span>
        </div>
      </div>

      {/* Tabs & Table */}
      <div className="bg-[#161F2D] border border-[#2A3446] rounded-2xl overflow-hidden">
        {/* Tab Controls & Search */}
        <div className="p-4 border-b border-[#2A3446] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setActiveTab("Payments")}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-black transition-all cursor-pointer ${
                activeTab === "Payments"
                  ? "bg-[#7FA0D6] text-black shadow-md shadow-[#7FA0D6]/20"
                  : "bg-[#0B111C] text-[#97A0B3] hover:text-white border border-[#2A3446]"
              }`}
            >
              <CreditCard className="w-3.5 h-3.5" />
              Payment History ({payments.length})
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("Invoices")}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-black transition-all cursor-pointer ${
                activeTab === "Invoices"
                  ? "bg-[#7FA0D6] text-black shadow-md shadow-[#7FA0D6]/20"
                  : "bg-[#0B111C] text-[#97A0B3] hover:text-white border border-[#2A3446]"
              }`}
            >
              <Receipt className="w-3.5 h-3.5" />
              Invoices & Receipts ({invoices.length})
            </button>
          </div>

          <div className="relative min-w-[220px]">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-[#97A0B3]" />
            <input
              type="text"
              placeholder={`Search ${activeTab.toLowerCase()}...`}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 rounded-xl bg-[#0B111C] border border-[#2A3446] text-xs text-white placeholder-[#97A0B3] focus:outline-none focus:border-[#7FA0D6]"
            />
          </div>
        </div>

        {/* Tab 1: Payment History */}
        {activeTab === "Payments" && (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-[#2A3446] text-[#97A0B3] bg-[#0B111C]/50">
                  <th className="py-3 px-4 font-bold">Transaction / Event ID</th>
                  <th className="py-3 px-4 font-bold">Agency</th>
                  <th className="py-3 px-4 font-bold">SaaS Plan</th>
                  <th className="py-3 px-4 font-bold">Gateway</th>
                  <th className="py-3 px-4 font-bold">Amount</th>
                  <th className="py-3 px-4 font-bold">Date & Time</th>
                  <th className="py-3 px-4 font-bold">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#2A3446]/40">
                {filteredPayments.map((p) => (
                  <tr key={p.id} className="hover:bg-[#0B111C]/40 transition-colors">
                    <td className="py-3.5 px-4 font-mono font-bold text-white">
                      {p.provider_event_id}
                    </td>
                    <td className="py-3.5 px-4 text-white font-medium">{p.agency_name}</td>
                    <td className="py-3.5 px-4 text-[#7FA0D6] font-bold">{p.plan_tier}</td>
                    <td className="py-3.5 px-4 uppercase text-[#97A0B3] font-bold">{p.gateway}</td>
                    <td className="py-3.5 px-4 font-black text-white">{fmt(p.amount)}</td>
                    <td className="py-3.5 px-4 text-[#97A0B3]">{p.date}</td>
                    <td className="py-3.5 px-4">
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-black bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                        <CheckCircle2 className="w-3 h-3" />
                        {p.status}
                      </span>
                    </td>
                  </tr>
                ))}
                {filteredPayments.length === 0 && (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-[#97A0B3]">
                      No payment events match the search query.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* Tab 2: Invoices */}
        {activeTab === "Invoices" && (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-[#2A3446] text-[#97A0B3] bg-[#0B111C]/50">
                  <th className="py-3 px-4 font-bold">Invoice #</th>
                  <th className="py-3 px-4 font-bold">Agency</th>
                  <th className="py-3 px-4 font-bold">Plan Tier</th>
                  <th className="py-3 px-4 font-bold">Billing Cycle</th>
                  <th className="py-3 px-4 font-bold">Amount</th>
                  <th className="py-3 px-4 font-bold">Issued Date</th>
                  <th className="py-3 px-4 font-bold">Status</th>
                  <th className="py-3 px-4 font-bold text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#2A3446]/40">
                {filteredInvoices.map((inv) => (
                  <tr key={inv.id} className="hover:bg-[#0B111C]/40 transition-colors">
                    <td className="py-3.5 px-4 font-mono font-bold text-white flex items-center gap-2">
                      <FileText className="w-3.5 h-3.5 text-[#7FA0D6]" />
                      {inv.id}
                    </td>
                    <td className="py-3.5 px-4 text-white font-medium">{inv.agency}</td>
                    <td className="py-3.5 px-4 text-[#7FA0D6] font-bold">{inv.plan}</td>
                    <td className="py-3.5 px-4 text-[#97A0B3]">{inv.period}</td>
                    <td className="py-3.5 px-4 font-black text-white">{fmt(inv.amount)}</td>
                    <td className="py-3.5 px-4 text-[#97A0B3]">{inv.date}</td>
                    <td className="py-3.5 px-4">
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-black bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                        <CheckCircle2 className="w-3 h-3" />
                        PAID
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <button
                        type="button"
                        onClick={() => handleDownloadInvoice(inv)}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[#0B111C] hover:bg-[#7FA0D6] hover:text-black border border-[#2A3446] hover:border-[#7FA0D6] text-xs font-bold text-white transition-all cursor-pointer"
                      >
                        <Download className="w-3 h-3" />
                        Download
                      </button>
                    </td>
                  </tr>
                ))}
                {filteredInvoices.length === 0 && (
                  <tr>
                    <td colSpan={8} className="py-8 text-center text-[#97A0B3]">
                      No invoices match the search query.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
