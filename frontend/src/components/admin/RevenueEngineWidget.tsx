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
    <div className="bg-[#0B111C]/95 backdrop-blur-md text-white px-3.5 py-2.5 rounded-2xl shadow-2xl text-xs border border-[#2A3446] space-y-1 animate-fade-in z-50">
      <p className="text-[10px] text-[#97A0B3] font-bold uppercase tracking-wider">{label}</p>
      <div className="flex items-center gap-2">
        <span className="w-2.5 h-2.5 rounded-full bg-[#7FA0D6] shadow-xs" />
        <span className="text-sm font-black text-white">₹{(value / 100).toLocaleString("en-IN")}</span>
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
  const [trendError, setTrendError] = useState<string | null>(null);

  const formatCurrency = (val: number) =>
    new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      minimumFractionDigits: 0,
    }).format(val / 100);

  const loadTrend = useCallback(async (tf: Timeframe) => {
    setTrendLoading(true);
    setTrendData(null);
    setTrendError(null);
    try {
      const data = await fetchRevenueTrend(tf);
      setTrendData(data);
    } catch (err) {
      setTrendData(null);
      setTrendError(err instanceof Error ? err.message : "Revenue history unavailable");
      console.error("Failed to fetch revenue trend:", err);
    } finally {
      setTrendLoading(false);
    }
  }, []);

  useEffect(() => {
    loadTrend(activeTimeframe);
  }, [activeTimeframe, loadTrend]);

  const rawPoints = trendData?.points ?? [];
  const chartData = rawPoints.map((p) => ({
    name: p.label,
    revenue: p.value,
  }));

  const displayRevenue = kpis?.mrr_formatted || "Unavailable";
  const displayClients = activeClients;

  return (
    <div
      onClick={() => navigate("/admin/revenue")}
      className="bg-[#161F2D] rounded-3xl border border-[#2A3446] shadow-xl hover:border-[#7FA0D6]/60 hover:shadow-[0_0_25px_rgba(127,160,214,0.15)] transition-all duration-300 p-4 sm:p-5 flex flex-col justify-between w-full h-full font-sans cursor-pointer group hover-card-innovative overflow-hidden relative"
    >
      {/* Header Row */}
      <div className="flex items-center justify-between mb-3 pb-2.5 border-b border-[#2A3446]/80 shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-[#0B111C] border border-[#2A3446] flex items-center justify-center text-[#7FA0D6] group-hover:scale-110 group-hover:border-[#7FA0D6]/50 group-hover:bg-[#161F2D] transition-all shrink-0">
            <Wallet className="w-4.5 h-4.5" />
          </div>
          <div>
            <h2 className="text-sm sm:text-base font-black text-white group-hover:text-[#7FA0D6] transition-colors tracking-tight flex items-center gap-1.5">
              Revenue Engine
              <ArrowUpRight className="w-3.5 h-3.5 text-[#97A0B3] group-hover:text-[#7FA0D6] transition-colors" />
            </h2>
            <p className="text-[11px] text-[#97A0B3] font-medium">Monthly revenue & active retainers</p>
          </div>
        </div>

        {/* Timeframe Pills */}
        <div className="flex bg-[#0B111C] p-1 rounded-xl text-xs font-semibold border border-[#2A3446]" onClick={(e) => e.stopPropagation()}>
          {(Object.entries(TIMEFRAME_LABELS) as [Timeframe, string][]).map(([key, label]) => (
            <button
              key={key}
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setActiveTimeframe(key);
              }}
              className={`px-3 py-0.5 rounded-lg text-[11px] font-bold cursor-pointer transition-all ${
                activeTimeframe === key
                  ? "bg-[#BCCCE6] text-[#0B111C] shadow-xs scale-105"
                  : "text-[#97A0B3] hover:text-white"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {trendError && <p role="alert" className="text-sm text-amber-300">{trendError} <button onClick={e => { e.stopPropagation(); void loadTrend(activeTimeframe); }}>Retry</button></p>}
      {!trendLoading && !trendError && chartData.length === 0 && <p>No revenue history available.</p>}
      {/* Main Content Layout */}
      <div className="space-y-3 my-auto">
        {/* Retainer Portfolio Value Banner with Hover Highlight */}
        <div className="relative overflow-hidden rounded-2xl p-3.5 bg-gradient-to-br from-[#161F2D] via-[#161F2D] to-[#0B111C] border border-[#2A3446] hover:border-[#7FA0D6]/50 hover:bg-[#161F2D]/80 hover:scale-[1.01] transition-all duration-200 shadow-md group/card">
          <div className="absolute -right-6 -top-6 w-28 h-28 bg-[#7FA0D6]/15 rounded-full blur-2xl pointer-events-none" />
          
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-[#97A0B3]">Monthly recurring revenue</span>
            <ShieldCheck className="w-4 h-4 text-[#7FA0D6] group-hover/card:scale-110 transition-transform" />
          </div>

          <div className="flex items-baseline justify-between">
            <div>
              <div className="text-xl sm:text-2xl font-black text-white tracking-tight leading-none">
                {displayRevenue} <span className="text-[10px] text-[#97A0B3] font-normal">/ mo</span>
              </div>
              <div className="text-[11px] font-bold text-[#7FA0D6] mt-1 flex items-center gap-1.5">
                <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
                <span className="text-emerald-400">Live Retainers</span>
                <span>· {displayClients} Active</span>
              </div>
            </div>
          </div>
        </div>

        {/* Bar Chart (Pill Segmented Aesthetic with Hover Highlight Box) */}
        <div className="w-full relative transition-all duration-200 bg-[#0B111C]/70 rounded-2xl p-2.5 border border-[#2A3446]/60 hover:border-[#7FA0D6]/40 hover:bg-[#0B111C]">
          <div className="text-[9.5px] font-extrabold uppercase tracking-wider text-[#97A0B3] mb-1 px-1">Monthly Revenue Curve</div>
          <div style={{ height: 125 }}>
            {trendLoading && (
              <div className="absolute inset-0 flex items-center justify-center z-10">
                <div className="w-4 h-4 border-2 border-[#7FA0D6] border-t-transparent rounded-full animate-spin" />
              </div>
            )}
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 4, right: 4, left: -24, bottom: 0 }} barCategoryGap="18%">
                <defs>
                  <linearGradient id="barGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#BCCCE6" stopOpacity={1} />
                    <stop offset="45%" stopColor="#7FA0D6" stopOpacity={0.85} />
                    <stop offset="100%" stopColor="#2A3446" stopOpacity={0.35} />
                  </linearGradient>
                  <linearGradient id="barGradientPeak" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#FFFFFF" stopOpacity={1} />
                    <stop offset="35%" stopColor="#BCCCE6" stopOpacity={1} />
                    <stop offset="100%" stopColor="#7FA0D6" stopOpacity={0.85} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#2A3446" opacity={0.35} />
                <XAxis
                  dataKey="name"
                  tick={{ fontSize: 9.5, fill: "#97A0B3", fontWeight: 600 }}
                  axisLine={false}
                  tickLine={false}
                  interval="preserveStartEnd"
                  dy={2}
                />
                <YAxis
                  tick={{ fontSize: 9, fill: "#97A0B3" }}
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

        {/* 3 KPI Summary Pills with Active Hover Highlight */}
        <div className="grid grid-cols-3 gap-2">
          <div className="bg-[#0B111C] hover:bg-[#161F2D] hover:border-[#7FA0D6]/60 hover:scale-[1.03] hover:-translate-y-0.5 transition-all duration-200 rounded-xl p-2.5 border border-[#2A3446] flex flex-col items-center justify-center text-center cursor-pointer shadow-sm group/pill">
            <span className="text-xs sm:text-sm font-black text-white group-hover/pill:text-[#7FA0D6] transition-colors leading-none">{displayRevenue}</span>
            <span className="text-[9px] text-[#97A0B3] uppercase font-bold tracking-wider mt-1">Total MRR</span>
          </div>
          <div className="bg-[#7FA0D6]/15 hover:bg-[#7FA0D6]/25 hover:border-[#7FA0D6]/60 hover:scale-[1.03] hover:-translate-y-0.5 transition-all duration-200 rounded-xl p-2.5 border border-[#7FA0D6]/30 flex flex-col items-center justify-center text-center cursor-pointer shadow-sm group/pill">
            <span className="text-xs sm:text-sm font-black text-[#7FA0D6] leading-none">{displayClients}</span>
            <span className="text-[9px] text-[#7FA0D6] uppercase font-bold tracking-wider mt-1">Active clients</span>
          </div>
          <div className="bg-[#0B111C] hover:bg-[#161F2D] hover:border-[#7FA0D6]/60 hover:scale-[1.03] hover:-translate-y-0.5 transition-all duration-200 rounded-xl p-2.5 border border-[#2A3446] flex flex-col items-center justify-center text-center cursor-pointer shadow-sm group/pill">
            <span className="text-xs sm:text-sm font-black text-white group-hover/pill:text-[#7FA0D6] transition-colors leading-none">{formatCurrency(avgTicket)}</span>
            <span className="text-[9px] text-[#97A0B3] uppercase font-bold tracking-wider mt-1">MRR per client</span>
          </div>
        </div>
      </div>

      {/* Redirecting Buttons Directly Below Graph */}
      <div className="pt-2.5 mt-2 border-t border-[#2A3446] flex flex-col sm:flex-row gap-2 shrink-0" onClick={(e) => e.stopPropagation()}>
        <Link
          to="/admin/revenue"
          onClick={(e) => e.stopPropagation()}
          className="flex-1 text-center py-2 bg-[#0B111C] hover:bg-[#161F2D] hover:border-[#7FA0D6]/60 hover:scale-[1.02] hover:text-[#7FA0D6] text-white rounded-xl text-[11px] font-bold border border-[#2A3446] transition-all duration-200 shadow-md"
        >
          Manage Revenues & Analytics
        </Link>
        <Link
          to="/admin/plans"
          onClick={(e) => e.stopPropagation()}
          className="flex-1 text-center py-2 bg-[#7FA0D6] hover:bg-blue-600 hover:border-blue-400 hover:scale-[1.02] hover:shadow-[0_0_15px_rgba(37,99,235,0.4)] text-white rounded-xl text-[11px] font-bold border border-blue-500 transition-all duration-200 shadow-md"
        >
          Plans & Negotiations
        </Link>
      </div>
    </div>
  );
}
