import { Link, useNavigate } from "react-router";
import { useState, useEffect, useCallback } from "react";
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
import { Wallet, TrendingUp, ShieldCheck, ArrowUpRight } from "lucide-react";
import { AdminKPIs, ClientRosterItem } from "@/types/ops";
import {
  fetchRevenueTrend,
  type RevenueTrendData,
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

function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  const value = payload[0].value as number;
  return (
    <div className="bg-app-base/95 backdrop-blur-md text-hi px-3.5 py-2.5 rounded-2xl shadow-2xl text-xs border border-app-line space-y-1 animate-fade-in z-50">
      <p className="text-[10px] text-app-mist font-bold uppercase tracking-wider">{label}</p>
      <div className="flex items-center gap-2">
        <span className="w-2.5 h-2.5 rounded-full bg-app-accent shadow-xs text-app-on-accent!" />
        <span className="text-sm font-black text-hi">₹{(value / 100).toLocaleString("en-IN")}</span>
      </div>
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
  const [trendLoading, setTrendLoading] = useState(false);

  const formatCurrency = (val: number) => {
    const num = val / 100;
    const hasDecimals = num % 1 !== 0;
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      minimumFractionDigits: hasDecimals ? 2 : 0,
      maximumFractionDigits: 2,
    }).format(num);
  };

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

  useEffect(() => {
    loadTrend(activeTimeframe);
  }, [activeTimeframe, loadTrend]);

  const rawPoints = (trendData?.points && trendData.points.length > 0)
    ? trendData.points
    : mrrValue > 0 ? [{ label: "Current", value: mrrValue }] : [];
  const chartData = rawPoints.map((p) => ({
    name: p.label,
    revenue: p.value,
  }));

  const displayRevenue =
    trendData?.total_revenue_formatted
      ? trendData.total_revenue_formatted
      : (kpis?.mrr_formatted || "₹0");

  const displayClients = (trendData?.total_clients !== undefined && trendData.total_clients > 0) ? trendData.total_clients : activeClients;

  return (
    <div
      onClick={() => navigate("/admin/revenue")}
      className="bg-app-surface rounded-3xl border border-app-line shadow-xl hover:border-app-accent/60 hover:shadow-[0_0_25px_color-mix(in_oklab,var(--app-accent)_15%,transparent)] transition-all duration-300 p-4 sm:p-5 flex flex-col justify-between w-full h-full font-sans cursor-pointer group hover-card-innovative overflow-hidden relative"
    >
      {/* Header Row */}
      <div className="flex items-center justify-between mb-3 pb-2.5 border-b border-app-line/80 shrink-0 gap-2 sm:gap-3">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-9 h-9 rounded-xl bg-app-base border border-app-line flex items-center justify-center text-app-accent group-hover:scale-110 group-hover:border-app-accent/50 group-hover:bg-app-surface transition-all shrink-0">
            <Wallet className="w-4.5 h-4.5" />
          </div>
          <div className="min-w-0">
            <h2 className="text-sm sm:text-base font-black text-hi group-hover:text-app-accent transition-colors tracking-tight flex items-center gap-1.5 truncate">
              Revenue Engine
              <ArrowUpRight className="w-3.5 h-3.5 text-app-mist group-hover:text-app-accent transition-colors shrink-0" />
            </h2>
            <p className="text-[11px] text-app-mist font-medium truncate">Monthly revenue & active retainers</p>
          </div>
        </div>

        {/* Timeframe Pills */}
        <div className="inline-flex items-center bg-app-base p-1 rounded-xl text-xs font-semibold border border-app-line shrink-0" onClick={(e) => e.stopPropagation()}>
          {(Object.entries(TIMEFRAME_LABELS) as [Timeframe, string][]).map(([key, label]) => (
            <button
              key={key}
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setActiveTimeframe(key);
              }}
              className={`px-2.5 sm:px-3 py-1 rounded-lg text-[10px] sm:text-[11px] font-bold cursor-pointer transition-all ${
                activeTimeframe === key
                  ? "bg-app-accent-soft text-app-base shadow-xs font-extrabold"
                  : "text-app-mist hover:text-hi"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Main Content Layout */}
      <div className="space-y-3 my-auto">
        {/* Retainer Portfolio Value Banner with Hover Highlight */}
        <div className="relative overflow-hidden rounded-2xl p-3.5 bg-gradient-to-br from-app-surface via-app-surface to-app-base border border-app-line hover:border-app-accent/50 hover:bg-app-surface/80 hover:scale-[1.01] transition-all duration-200 shadow-md group/card">
          <div className="absolute -right-6 -top-6 w-28 h-28 bg-app-accent/15 rounded-full blur-2xl pointer-events-none" />
          
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-app-mist" title="Monthly Recurring Revenue">Total Portfolio Value (MRR)</span>
            <ShieldCheck className="w-4 h-4 text-app-accent group-hover/card:scale-110 transition-transform" />
          </div>

          <div className="flex items-baseline justify-between">
            <div>
              <div className="text-xl sm:text-2xl font-black text-hi tracking-tight leading-none">
                {displayRevenue} <span className="text-[10px] text-app-mist font-normal">/ mo</span>
              </div>
              <div className="text-[11px] font-bold text-app-accent mt-1 flex items-center gap-1.5">
                <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
                <span className="text-emerald-400">Live Retainers</span>
                <span>· {displayClients} Active</span>
              </div>
            </div>
          </div>
        </div>

        {/* Bar Chart (Pill Segmented Aesthetic with Hover Highlight Box) */}
        <div className="w-full relative transition-all duration-200 bg-app-base/70 rounded-2xl p-2.5 border border-app-line/60 hover:border-app-accent/40 hover:bg-app-base">
          <div className="text-[9.5px] font-extrabold uppercase tracking-wider text-app-mist mb-1 px-1">Monthly Revenue Curve</div>
          <div style={{ height: 125 }}>
            {trendLoading && (
              <div className="absolute inset-0 flex items-center justify-center z-10">
                <div className="w-4 h-4 border-2 border-app-accent border-t-transparent rounded-full animate-spin" />
              </div>
            )}
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 4, right: 4, left: 0, bottom: 0 }} barCategoryGap="18%">
                <defs>
                  <linearGradient id="barGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--app-accent-soft)" stopOpacity={1} />
                    <stop offset="45%" stopColor="var(--app-accent)" stopOpacity={0.85} />
                    <stop offset="100%" stopColor="var(--app-line)" stopOpacity={0.35} />
                  </linearGradient>
                  <linearGradient id="barGradientPeak" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--hi)" stopOpacity={1} />
                    <stop offset="35%" stopColor="var(--app-accent-soft)" stopOpacity={1} />
                    <stop offset="100%" stopColor="var(--app-accent)" stopOpacity={0.85} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--app-line)" opacity={0.35} />
                <XAxis
                  dataKey="name"
                  tick={{ fontSize: 9.5, fill: "var(--app-mist)", fontWeight: 600 }}
                  axisLine={false}
                  tickLine={false}
                  interval="preserveStartEnd"
                  dy={2}
                />
                <YAxis
                  tick={{ fontSize: 9, fill: "var(--app-mist)" }}
                  axisLine={false}
                  tickLine={false}
                  width={40}
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
                <Tooltip content={<CustomTooltip />} cursor={false} />
                <Bar
                  dataKey="revenue"
                  radius={[6, 6, 2, 2]}
                  maxBarSize={20}
                  animationDuration={800}
                >
                  {chartData.map((entry, index) => {
                    const maxVal = Math.max(...chartData.map((d) => d.revenue));
                    const isPeak = entry.revenue === maxVal;
                    return (
                      <Cell
                        key={`cell-${index}`}
                        fill={isPeak ? "url(#barGradientPeak)" : "url(#barGradient)"}
                        className="transition-all duration-200 hover:brightness-125 cursor-pointer"
                      />
                    );
                  })}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* 3 KPI Summary Pills with Active Hover Highlight (Hidden on mobile to eliminate clutter, 3-cols on desktop) */}
        <div className="hidden sm:grid sm:grid-cols-3 gap-2">
          <div className="bg-app-base hover:bg-app-surface hover:border-app-accent/60 hover:scale-[1.03] hover:-translate-y-0.5 transition-all duration-200 rounded-xl p-2.5 border border-app-line flex flex-col items-center justify-center text-center cursor-pointer shadow-sm group/pill" title="Monthly Recurring Revenue">
            <span className="text-xs sm:text-sm font-black text-hi group-hover/pill:text-app-accent transition-colors leading-none">{displayRevenue}</span>
            <span className="text-[9px] text-app-mist uppercase font-bold tracking-wider mt-1">Total MRR</span>
          </div>
          <div className="bg-app-accent/15 hover:bg-app-accent/25 hover:border-app-accent/60 hover:scale-[1.03] hover:-translate-y-0.5 transition-all duration-200 rounded-xl p-2.5 border border-app-accent/40 flex flex-col items-center justify-center text-center cursor-pointer shadow-sm group/pill">
            <span className="text-xs sm:text-sm font-black text-app-accent leading-none">{displayClients}</span>
            <span className="text-[9px] text-app-accent uppercase font-bold tracking-wider mt-1">Active Deals</span>
          </div>
          <div className="bg-app-base hover:bg-app-surface hover:border-app-accent/60 hover:scale-[1.03] hover:-translate-y-0.5 transition-all duration-200 rounded-xl p-2.5 border border-app-line flex flex-col items-center justify-center text-center cursor-pointer shadow-sm group/pill">
            <span className="text-xs sm:text-sm font-black text-hi group-hover/pill:text-app-accent transition-colors leading-none">{formatCurrency(avgTicket)}</span>
            <span className="text-[9px] text-app-mist uppercase font-bold tracking-wider mt-1">Avg Ticket</span>
          </div>
        </div>
      </div>

      {/* Redirecting Buttons Directly Below Graph */}
      <div className="pt-2.5 mt-2 border-t border-app-line grid grid-cols-2 gap-2 shrink-0" onClick={(e) => e.stopPropagation()}>
        <Link
          to="/admin/revenue"
          onClick={(e) => e.stopPropagation()}
          className="min-w-0 min-h-[38px] py-2 px-2.5 bg-app-base hover:bg-app-surface hover:border-app-accent/60 hover:scale-[1.02] hover:text-app-accent text-hi rounded-xl text-[11px] font-bold border border-app-line transition-all duration-200 shadow-md flex items-center justify-center text-center leading-tight"
        >
          <span>Manage Revenues & Analytics</span>
        </Link>
        <Link
          to="/admin/plans"
          onClick={(e) => e.stopPropagation()}
          className="min-w-0 min-h-[38px] py-2 px-2.5 bg-app-base hover:bg-app-surface hover:border-app-accent/60 hover:scale-[1.02] hover:text-app-accent text-hi rounded-xl text-[11px] font-bold border border-app-line transition-all duration-200 shadow-md flex items-center justify-center text-center leading-tight"
        >
          <span>Plans & Negotiations</span>
        </Link>
      </div>
    </div>
  );
}
