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
      className="bg-white rounded-2xl border border-gray-100 shadow-[0_2px_10px_rgba(0,0,0,0.04)] hover:shadow-xl hover:border-blue-200/80 transition-all p-6 flex flex-col w-full h-full font-sans cursor-pointer group"
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-bold text-gray-900 group-hover:text-blue-600 transition-colors tracking-tight">Revenue Engine</h2>
        <div className="flex bg-gray-50 p-1 rounded-lg text-xs font-medium border border-gray-100" onClick={(e) => e.stopPropagation()}>
          {(Object.entries(TIMEFRAME_LABELS) as [Timeframe, string][]).map(([key, label]) => (
            <button
              key={key}
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setActiveTimeframe(key);
              }}
              className={`px-3 py-1 rounded-md cursor-pointer transition-all ${
                activeTimeframe === key
                  ? "bg-white text-blue-600 shadow-sm"
                  : "text-gray-500 hover:text-gray-900"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Big Revenue Number */}
      <div className="flex items-baseline gap-3 mb-4">
        <span className="text-4xl font-black text-gray-900 tracking-tighter">
          {displayRevenue}
        </span>
        <span className="text-sm font-semibold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-100">
          {displayClients} clients
        </span>
      </div>

      {/* Recharts Area Chart */}
      <div
        className={`relative w-full mb-6 transition-opacity duration-300 ${trendLoading ? "opacity-40" : "opacity-100"}`}
        style={{ height: 200 }}
      >
        {trendLoading && (
          <div className="absolute inset-0 flex items-center justify-center z-10">
            <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
          </div>
        )}
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#4C6FFF" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#4C6FFF" stopOpacity={0.02} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
            <XAxis
              dataKey="name"
              tick={{ fontSize: 10, fill: "#9ca3af" }}
              axisLine={false}
              tickLine={false}
              interval="preserveStartEnd"
            />
            <YAxis
              tick={{ fontSize: 10, fill: "#9ca3af" }}
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
              strokeWidth={1.5}
              label={{
                value: "Target",
                position: "insideTopRight",
                fill: "#64748b",
                fontSize: 10,
                fontWeight: 600,
              }}
            />
            <Area
              type="monotone"
              dataKey="revenue"
              stroke="#4C6FFF"
              strokeWidth={2.5}
              fill="url(#colorRevenue)"
              dot={false}
              activeDot={{ r: 5, fill: "#4C6FFF", stroke: "#fff", strokeWidth: 2 }}
              animationDuration={800}
              animationEasing="ease-out"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="kpi-card bg-gray-50 rounded-xl p-3 border-2 border-[#1E3A8A] hover:border-[#60A5FA] transition-all flex flex-col items-center justify-center text-center">
          <span className="text-lg font-black text-gray-900">{displayRevenue}</span>
          <span className="text-[10px] text-gray-500 uppercase font-bold tracking-wider">Total Rev</span>
        </div>
        <div className="kpi-card bg-blue-50/50 rounded-xl p-3 border-2 border-[#1E3A8A] hover:border-[#60A5FA] transition-all flex flex-col items-center justify-center text-center">
          <span className="text-lg font-black text-blue-600">{displayClients}</span>
          <span className="text-[10px] text-blue-600 uppercase font-bold tracking-wider">Active Deals</span>
        </div>
        <div className="kpi-card bg-gray-50 rounded-xl p-3 border-2 border-[#1E3A8A] hover:border-[#60A5FA] transition-all flex flex-col items-center justify-center text-center">
          <span className="text-lg font-black text-gray-900">{formatCurrency(avgTicket)}</span>
          <span className="text-[10px] text-gray-500 uppercase font-bold tracking-wider">Avg Ticket</span>
        </div>
      </div>

      {/* Sales Details – All Plans */}
      <h3 className="text-sm font-bold text-gray-900 mb-3 shrink-0">Sales Details</h3>
      <div className="flex flex-col gap-3 flex-1 overflow-y-auto min-h-0 pr-1 custom-scrollbar">
        {plans.length > 0 ? (
          plans.map((plan, idx) => {
            const color = PLAN_COLORS[idx % PLAN_COLORS.length]!;
            const isTopSeller = plan.subscriber_count > 0 && plan.subscriber_count === maxSubs;
            return (
              <div
                key={plan.id}
                className={`relative flex items-center justify-between p-4 rounded-xl border transition-colors ${color.ring} hover:brightness-95`}
              >
                {/* Left: colour dot + plan info */}
                <div className="flex items-center gap-3">
                  <div className={`w-2.5 h-2.5 rounded-full ${color.bg} shrink-0`} />
                  <div className="flex flex-col">
                    <span className="text-sm font-bold text-gray-900 flex items-center gap-2">
                      {plan.display_name}
                      {isTopSeller && (
                        <span className="px-1.5 py-0.5 rounded text-[9px] font-black uppercase tracking-wider bg-amber-400 text-amber-950 shadow-sm">
                          Top Seller
                        </span>
                      )}
                      {plan.subscriber_count === 0 && (
                        <span className="px-1.5 py-0.5 rounded text-[9px] font-semibold text-gray-400 bg-gray-100">
                          No retainers
                        </span>
                      )}
                    </span>
                    <span className="text-[11px] text-gray-500">
                      {plan.subscriber_count} Active {plan.subscriber_count === 1 ? "retainer" : "retainers"} · {formatCurrency(plan.price_minor)}/mo
                    </span>
                  </div>
                </div>

                {/* Right: revenue + share */}
                <div className="flex flex-col items-end">
                  <span className="text-sm font-bold text-gray-900">
                    {plan.revenue_formatted}
                  </span>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    {/* Mini progress bar */}
                    <div className="w-16 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full ${color.bg}`}
                        style={{ width: `${plan.share_pct}%` }}
                      />
                    </div>
                    <span className="text-[10px] text-gray-500 font-semibold">
                      {plan.share_pct}%
                    </span>
                  </div>
                </div>
              </div>
            );
          })
        ) : (
          <div className="p-4 rounded-xl border border-dashed border-gray-200 text-center text-xs text-gray-500">
            No plans found.
          </div>
        )}
      </div>

      {/* Action Buttons */}
      <div className="mt-6 pt-4 border-t border-gray-100 flex gap-3" onClick={(e) => e.stopPropagation()}>
        <Link
          to="/admin/revenue"
          onClick={(e) => e.stopPropagation()}
          className="flex-1 text-center py-2 bg-blue-50 text-blue-600 rounded-lg text-xs font-bold hover:bg-blue-100 transition-colors"
        >
          View Revenue Details
        </Link>
        <Link
          to="/admin/plans"
          onClick={(e) => e.stopPropagation()}
          className="flex-1 text-center py-2 bg-gray-50 text-gray-700 rounded-lg text-xs font-bold hover:bg-gray-100 border border-gray-200 transition-colors"
        >
          Manage Plans
        </Link>
      </div>
    </div>
  );
}
