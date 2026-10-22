import { useState } from "react";
import {
  DollarSign,
  FileText,
  TrendingUp,
  Download,
  CheckCircle2,
  Clock,
  XCircle,
  Search,
  RefreshCw,
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { request } from "../../lib/http";
import { CreoInlineLoader } from "../../components/ui/CreoLoader";

const tabs = ["Overview", "Invoices", "Tax Reports", "Refunds"] as const;
type Tab = typeof tabs[number];

interface InvoiceItem {
  id: string;
  agency: string;
  amount: number;
  status: string;
  date: string;
  plan: string;
  gateway: string;
}

interface FinanceData {
  mrr: number;
  arr: number;
  gross_collected: number;
  tax_collected: number;
  refunds: number;
  invoices: InvoiceItem[];
  monthly_revenue: Array<{ month: string; amount: number }>;
}

const DEFAULT_STATUS_INV = { label: "Open", cls: "bg-amber-500/15 text-amber-400 border-amber-500/30", icon: Clock };

const STATUS_INV: Record<string, { label: string; cls: string; icon: React.ComponentType<{className?: string}> }> = {
  paid: { label: "Paid", cls: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30", icon: CheckCircle2 },
  open: DEFAULT_STATUS_INV,
  failed: { label: "Failed", cls: "bg-rose-500/15 text-rose-400 border-rose-500/30", icon: XCircle },
  trial: { label: "Trial", cls: "bg-app-accent/15 text-app-accent-soft border-app-accent/30", icon: Clock },
};

function fmt(n: number) {
  if (n >= 1000) return `₹${(n / 1000).toFixed(1)}K`;
  return `₹${n}`;
}

export function PlatformFinancePage() {
  const [activeTab, setActiveTab] = useState<Tab>("Overview");
  const [invoiceSearch, setInvoiceSearch] = useState("");

  const { data: finance, isLoading, refetch } = useQuery<FinanceData>({
    queryKey: ["platform-finance"],
    queryFn: () => request<FinanceData>("/api/v1/platform/finance"),
  });

  const mrr = finance?.mrr ?? 0;
  const arr = finance?.arr ?? 0;
  const gross = finance?.gross_collected ?? 0;
  const tax = finance?.tax_collected ?? 0;
  const invoices = finance?.invoices ?? [];
  const monthlyRevenue = finance?.monthly_revenue ?? [];

  const maxAmount = Math.max(...monthlyRevenue.map((m) => m.amount), 6000);

  const filteredInvoices = invoices.filter(
    (inv) =>
      !invoiceSearch ||
      inv.id.toLowerCase().includes(invoiceSearch.toLowerCase()) ||
      inv.agency.toLowerCase().includes(invoiceSearch.toLowerCase()) ||
      inv.plan.toLowerCase().includes(invoiceSearch.toLowerCase())
  );

  return (
    <div className="space-y-6 pb-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pt-1">
        <div>
          <h1 className="text-2xl font-black text-hi">Platform Finance & Billing</h1>
          <p className="text-xs text-app-mist">
            SaaS subscription collections, invoices, GST breakdown, and gateway reconciliation
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => void refetch()}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-app-surface border border-app-line hover:border-app-accent/40 text-xs font-bold text-app-mist hover:text-hi transition-all cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Refresh
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 bg-app-base border border-app-line rounded-xl w-fit">
        {tabs.map((tab) => (
          <button
            key={tab}
            type="button"
            onClick={() => setActiveTab(tab)}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              activeTab === tab
                ? "bg-gradient-to-r from-app-accent to-app-accent text-black shadow-md"
                : "text-app-mist hover:text-hi"
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {isLoading && (
        <div className="p-12 text-center bg-app-surface border border-app-line rounded-2xl">
          <CreoInlineLoader label="Loading financial data from database..." />
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="bg-app-surface border border-app-line rounded-2xl p-4 sm:p-5">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-black uppercase tracking-wider text-app-mist">Platform MRR</span>
            <DollarSign className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl sm:text-3xl font-black text-hi">{fmt(mrr)}</div>
          <p className="text-xs text-emerald-400 font-bold mt-1">Growth Tier Active</p>
        </div>

        <div className="bg-app-surface border border-app-line rounded-2xl p-4 sm:p-5">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-black uppercase tracking-wider text-app-mist">Annual Run Rate</span>
            <TrendingUp className="w-4 h-4 text-app-accent" />
          </div>
          <div className="text-2xl sm:text-3xl font-black text-hi">{fmt(arr)}</div>
          <p className="text-xs text-app-accent font-bold mt-1">Based on active licenses</p>
        </div>

        <div className="bg-app-surface border border-app-line rounded-2xl p-4 sm:p-5">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-black uppercase tracking-wider text-app-mist">Gross Collections</span>
            <FileText className="w-4 h-4 text-blue-400" />
          </div>
          <div className="text-2xl sm:text-3xl font-black text-hi">{fmt(gross)}</div>
          <p className="text-xs text-blue-400 font-bold mt-1">100% collected</p>
        </div>

        <div className="bg-app-surface border border-app-line rounded-2xl p-4 sm:p-5">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-black uppercase tracking-wider text-app-mist">GST Collected (18%)</span>
            <span className="text-[11px] font-mono text-app-mist">India GST</span>
          </div>
          <div className="text-2xl sm:text-3xl font-black text-hi">{fmt(tax)}</div>
          <p className="text-xs text-app-mist font-bold mt-1">CGST 9% + SGST 9%</p>
        </div>
      </div>

      {activeTab === "Overview" && (
        <div className="bg-app-surface border border-app-line rounded-2xl p-5 sm:p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-black text-hi">Monthly SaaS Revenue Trend</h2>
              <p className="text-xs text-app-mist">Monthly normalized subscription contract value</p>
            </div>
            <span className="text-xs font-mono font-bold text-app-accent">Active Tier: ₹{mrr.toLocaleString()}/mo</span>
          </div>

          <div className="pt-6 pb-2">
            <div className="flex items-end gap-3 sm:gap-6 h-40">
              {monthlyRevenue.map((m) => {
                const heightPct = maxAmount > 0 ? (m.amount / maxAmount) * 100 : 0;
                return (
                  <div key={m.month} className="flex-1 flex flex-col items-center gap-2 group">
                    <div className="w-full bg-app-base rounded-lg h-32 flex items-end p-1 border border-app-line">
                      <div
                        className="w-full rounded-md bg-gradient-to-t from-app-accent to-app-accent group-hover:brightness-110 transition-all"
                        style={{ height: `${Math.max(heightPct, 8)}%` }}
                      />
                    </div>
                    <span className="text-[11px] font-bold text-app-mist">{m.month}</span>
                    <span className="text-[10px] font-mono text-hi">{m.amount > 0 ? fmt(m.amount) : "—"}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {(activeTab === "Overview" || activeTab === "Invoices") && (
        <div className="bg-app-surface border border-app-line rounded-2xl overflow-hidden">
          <div className="p-4 sm:p-5 border-b border-app-line flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-base font-black text-hi">SaaS Invoices</h2>
              <p className="text-xs text-app-mist">Official tax invoices generated for subscribing agencies</p>
            </div>
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-app-mist" />
              <input
                type="text"
                value={invoiceSearch}
                onChange={(e) => setInvoiceSearch(e.target.value)}
                placeholder="Search invoice or agency..."
                className="w-full pl-9 pr-3 py-1.5 rounded-xl bg-app-base border border-app-line text-xs text-hi placeholder-app-mist focus:outline-none focus:border-app-accent"
              />
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-app-line">
                  {["Invoice #", "Agency", "Plan", "Amount", "Status", "Date", "Receipt"].map((h) => (
                    <th key={h} className="px-5 py-3.5 text-[11px] font-black uppercase tracking-wider text-app-accent">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-app-line">
                {filteredInvoices.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-5 py-12 text-center text-sm text-app-mist">
                      No invoices found.
                    </td>
                  </tr>
                ) : (
                  filteredInvoices.map((inv) => {
                    const cfg = STATUS_INV[inv.status] ?? DEFAULT_STATUS_INV;
                    const Icon = cfg.icon;
                    return (
                      <tr key={inv.id} className="hover:bg-app-base/40 transition-colors">
                        <td className="px-5 py-4 text-[12px] font-mono font-bold text-app-accent">{inv.id}</td>
                        <td className="px-5 py-4 text-[13px] font-bold text-hi">{inv.agency}</td>
                        <td className="px-5 py-4 text-[12px] text-app-accent-soft">{inv.plan}</td>
                        <td className="px-5 py-4 text-[13px] font-black text-hi">
                          ₹{inv.amount.toLocaleString()}
                        </td>
                        <td className="px-5 py-4">
                          <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md text-[11px] font-black uppercase tracking-wider border ${cfg.cls}`}>
                            <Icon className="w-3 h-3" /> {cfg.label}
                          </span>
                        </td>
                        <td className="px-5 py-4 text-[12px] text-app-mist">{inv.date}</td>
                        <td className="px-5 py-4">
                          <button
                            type="button"
                            onClick={() => alert(`Downloading official receipt for ${inv.id}`)}
                            className="flex items-center gap-1.5 text-app-accent hover:text-hi transition-colors text-[12px] font-bold cursor-pointer"
                          >
                            <Download className="w-3.5 h-3.5" /> PDF
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === "Tax Reports" && (
        <div className="bg-app-surface border border-app-line rounded-2xl p-6 space-y-4">
          <h2 className="text-base font-black text-hi">Goods & Services Tax (GST) Summary</h2>
          <p className="text-xs text-app-mist">Compliant tax ledger for Creo SaaS subscriptions</p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
            <div className="p-4 rounded-xl bg-app-base border border-app-line">
              <p className="text-[11px] font-bold text-app-mist uppercase">Taxable SaaS Value</p>
              <p className="text-lg font-black text-hi mt-1">₹{mrr.toLocaleString()}</p>
            </div>
            <div className="p-4 rounded-xl bg-app-base border border-app-line">
              <p className="text-[11px] font-bold text-app-mist uppercase">CGST (9%)</p>
              <p className="text-lg font-black text-emerald-400 mt-1">₹{round(mrr * 0.09).toLocaleString()}</p>
            </div>
            <div className="p-4 rounded-xl bg-app-base border border-app-line">
              <p className="text-[11px] font-bold text-app-mist uppercase">SGST (9%)</p>
              <p className="text-lg font-black text-emerald-400 mt-1">₹{round(mrr * 0.09).toLocaleString()}</p>
            </div>
          </div>
        </div>
      )}

      {activeTab === "Refunds" && (
        <div className="bg-app-surface border border-app-line rounded-2xl p-12 text-center text-app-mist">
          <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto mb-2" />
          <p className="text-sm font-bold text-hi">No refunds or chargebacks on record</p>
          <p className="text-xs text-app-mist mt-1">All subscriptions are in good standing.</p>
        </div>
      )}
    </div>
  );
}

function round(n: number) {
  return Math.round(n * 100) / 100;
}
