import { Link, useNavigate } from "react-router";
import { useState, useEffect, useCallback } from "react";
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
import { AdminKPIs, ClientRosterItem } from "@/types/ops";
import {
  fetchRevenueTrend,
  fetchPlansSummary,
  type RevenueTrendData,
  type PlanSummaryItem,
} from "@/lib/ops-api";

interface RevenueEngineWidgetProps {
  kpis: AdminKPIs | null;
  clients: ClientRosterItem[];
}

type Timeframe = "90d" | "365d";

const TIMEFRAME_LABELS: Record<Timeframe, string> = {
  "90d": "Quarter",
  "365d": "Year",
};

// Plan colour palette (index-based)
const PLAN_COLORS = [
  { bg: "bg-blue-600", text: "text-white", ring: "border-blue-200 bg-blue-50/40" },
  { bg: "bg-violet-500", text: "text-white", ring: "border-violet-200 bg-violet-50/40" },
  { bg: "bg-emerald-500", text: "text-white", ring: "border-emerald-200 bg-emerald-50/40" },
];

function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  const value = payload[0].value as number;
  return (
    <div className="bg-gray-900 text-white px-3 py-2 rounded-lg shadow-xl text-xs border border-gray-700">
      <p className="text-gray-400 font-medium mb-0.5">{label}</p>
      <p className="text-sm font-black">₹{(value / 100).toLocaleString("en-IN")}</p>
    </div>
  );
}

export function RevenueEngineWidget({ kpis, clients: _clients }: RevenueEngineWidgetProps) {
  const navigate = useNavigate();
  const activeClients = kpis?.active_clients || 0;
  const mrrValue = kpis?.mrr_minor || 0;
  const avgTicket = activeClients > 0 ? mrrValue / activeClients : 0;

  const [activeTimeframe, setActiveTimeframe] = useState<Timeframe>("90d");
  const [trendData, setTrendData] = useState<RevenueTrendData | null>(null);
  const [plans, setPlans] = useState<PlanSummaryItem[]>([]);
  const [trendLoading, setTrendLoading] = useState(false);

  const formatCurrency = (val: number) =>
    new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      minimumFractionDigits: 0,
    }).format(val / 100);

  const loadTrend = useCallback(async (tf: Timeframe) => {
    setTrendLoading(true);
    try {
      const data = await fetchRevenueTrend(tf);
      setTrendData(data);
    } catch (err) {
      console.error("Failed to fetch revenue trend:", err);
    } finally {
      setTrendLoading(false);
    }
  }, []);

  // Load plans from backend once on mount
  useEffect(() => {
    fetchPlansSummary()
      .then((data) => setPlans(data.plans))
      .catch((err) => console.error("Failed to fetch plans summary:", err));
  }, []);

  useEffect(() => {
    loadTrend(activeTimeframe);
  }, [activeTimeframe, loadTrend]);

  const chartData = (trendData?.points || []).map((p) => ({
    name: p.label,
    revenue: p.value,
  }));

  const displayRevenue =
    trendData?.total_revenue_formatted || (kpis ? kpis.mrr_formatted : "₹0");
  const displayClients = trendData?.total_clients ?? activeClients;

  // Top seller = plan with most subscribers
  const maxSubs = Math.max(...plans.map((p) => p.subscriber_count), 0);

  return (
    <div
      onClick={() => navigate("/admin/revenue")}
      className="bg-white rounded-2xl border border-slate-200/80 shadow-2xs hover:shadow-md hover:border-blue-200/80 transition-all p-4 sm:p-5 flex flex-col w-full h-full font-sans cursor-pointer group"
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-2.5">
        <h2 className="text-base font-black text-gray-900 group-hover:text-blue-600 transition-colors tracking-tight">Revenue Engine</h2>
        <div className="flex bg-slate-50 p-0.5 rounded-lg text-xs font-semibold border border-slate-100" onClick={(e) => e.stopPropagation()}>
          {(Object.entries(TIMEFRAME_LABELS) as [Timeframe, string][]).map(([key, label]) => (
            <button
              key={key}
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setActiveTimeframe(key);
              }}
              className={`px-2.5 py-0.5 rounded-md text-[11px] font-bold cursor-pointer transition-all ${
                activeTimeframe === key
                  ? "bg-white text-blue-600 shadow-xs"
                  : "text-slate-500 hover:text-slate-900"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Revenue Number */}
      <div className="flex items-baseline gap-2 mb-2.5">
        <span className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
          {displayRevenue}
        </span>
        <span className="text-[11px] font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-100">
          {displayClients} clients
        </span>
      </div>

      {/* Recharts Area Chart */}
      <div
        className={`relative w-full mb-3 transition-opacity duration-300 ${trendLoading ? "opacity-40" : "opacity-100"}`}
        style={{ height: 125 }}
      >
        {trendLoading && (
          <div className="absolute inset-0 flex items-center justify-center z-10">
            <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
          </div>
        )}
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData} margin={{ top: 5, right: 5, left: -25, bottom: 0 }}>
            <defs>
              <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#2563EB" stopOpacity={0.25} />
                <stop offset="95%" stopColor="#2563EB" stopOpacity={0.01} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
            <XAxis
              dataKey="name"
              tick={{ fontSize: 9, fill: "#94a3b8" }}
              axisLine={false}
              tickLine={false}
              interval="preserveStartEnd"
            />
            <YAxis
              tick={{ fontSize: 9, fill: "#94a3b8" }}
              axisLine={false}
              tickLine={false}
              tickFormatter={(v: number) =>
                v >= 10000000
                  ? `₹${(v / 10000000).toFixed(1)}Cr`
                  : v >= 100000
                  ? `₹${(v / 100000).toFixed(0)}L`
                  : v >= 1000
                  ? `₹${(v / 1000).toFixed(0)}K`
                  : `₹${v}`
              }
            />
            <Tooltip content={<CustomTooltip />} />
            <ReferenceLine
              y={avgTicket * 2 > 0 ? avgTicket * 2 : 10000000}
              stroke="#94a3b8"
              strokeDasharray="4 4"
              strokeWidth={1}
            />
            <Area
              type="monotone"
              dataKey="revenue"
              stroke="#2563EB"
              strokeWidth={2}
              fill="url(#colorRevenue)"
              dot={false}
              activeDot={{ r: 4, fill: "#2563EB", stroke: "#fff", strokeWidth: 2 }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-3 gap-1.5 sm:gap-2 mb-2.5">
        <div className="bg-slate-50/90 rounded-xl p-1.5 sm:p-2 border border-slate-200/80 flex flex-col items-center justify-center text-center">
          <span className="text-xs sm:text-sm font-black text-slate-900 leading-none">{displayRevenue}</span>
          <span className="text-[8px] sm:text-[8.5px] text-slate-500 uppercase font-bold tracking-wider mt-0.5">Total Rev</span>
        </div>
        <div className="bg-blue-50/60 rounded-xl p-1.5 sm:p-2 border border-blue-200/80 flex flex-col items-center justify-center text-center">
          <span className="text-xs sm:text-sm font-black text-blue-600 leading-none">{displayClients}</span>
          <span className="text-[8px] sm:text-[8.5px] text-blue-600 uppercase font-bold tracking-wider mt-0.5">Active Deals</span>
        </div>
        <div className="bg-slate-50/90 rounded-xl p-1.5 sm:p-2 border border-slate-200/80 flex flex-col items-center justify-center text-center">
          <span className="text-xs sm:text-sm font-black text-slate-900 leading-none">{formatCurrency(avgTicket)}</span>
          <span className="text-[8px] sm:text-[8.5px] text-slate-500 uppercase font-bold tracking-wider mt-0.5">Avg Ticket</span>
        </div>
      </div>

      {/* Sales Details – All Plans */}
      <h3 className="text-xs font-black text-slate-900 mb-2 shrink-0">Sales Details</h3>
      <div className="flex flex-col gap-2 flex-1 overflow-y-auto min-h-0 pr-0.5 custom-scrollbar">
        {plans.length > 0 ? (
          plans.slice(0, 3).map((plan, idx) => {
            const color = PLAN_COLORS[idx % PLAN_COLORS.length]!;
            const isTopSeller = plan.subscriber_count > 0 && plan.subscriber_count === maxSubs;
            return (
              <div
                key={plan.id}
                className={`relative flex items-center justify-between p-2.5 rounded-xl border transition-colors ${color.ring} hover:brightness-95`}
              >
                {/* Left: colour dot + plan info */}
                <div className="flex items-center gap-2 min-w-0">
                  <div className={`w-2 h-2 rounded-full ${color.bg} shrink-0`} />
                  <div className="flex flex-col min-w-0">
                    <span className="text-xs font-bold text-slate-900 flex items-center gap-1.5 truncate">
                      {plan.display_name}
                      {isTopSeller && (
                        <span className="px-1 py-0.2 rounded text-[8px] font-black uppercase tracking-wider bg-amber-400 text-amber-950">
                          Top
                        </span>
                      )}
                    </span>
                    <span className="text-[10px] text-slate-500">
                      {plan.subscriber_count} Active · {formatCurrency(plan.price_minor)}/mo
                    </span>
                  </div>
                </div>

                {/* Right: revenue + share */}
                <div className="flex flex-col items-end shrink-0">
                  <span className="text-xs font-bold text-slate-900">
                    {plan.revenue_formatted}
                  </span>
                  <div className="flex items-center gap-1 mt-0.5">
                    <div className="w-12 h-1 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full ${color.bg}`}
                        style={{ width: `${plan.share_pct}%` }}
                      />
                    </div>
                    <span className="text-[9px] text-slate-500 font-semibold">
                      {plan.share_pct}%
                    </span>
                  </div>
                </div>
              </div>
            );
          })
        ) : (
          <div className="p-3 rounded-xl border border-dashed border-slate-200 text-center text-xs text-slate-400">
            No plans found.
          </div>
        )}
      </div>

      {/* Action Buttons */}
      <div className="mt-3 pt-3 border-t border-slate-100 flex gap-2" onClick={(e) => e.stopPropagation()}>
        <Link
          to="/admin/revenue"
          onClick={(e) => e.stopPropagation()}
          className="flex-1 text-center py-1.5 bg-blue-50 text-blue-600 rounded-lg text-xs font-bold hover:bg-blue-100 transition-colors"
        >
          Manage Revenues
        </Link>
        <Link
          to="/admin/plans"
          onClick={(e) => e.stopPropagation()}
          className="flex-1 text-center py-1.5 bg-slate-50 text-slate-700 rounded-lg text-xs font-bold hover:bg-slate-100 border border-slate-200 transition-colors"
        >
          Plans & Negotiations
        </Link>
      </div>
    </div>
  );
}
