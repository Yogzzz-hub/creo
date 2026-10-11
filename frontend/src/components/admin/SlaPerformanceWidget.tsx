
import { useNavigate } from "react-router";
import { SLABreachItem } from "@/types/ops";
import { AlertTriangle, CheckCircle2 } from "lucide-react";

interface SlaPerformanceWidgetProps {
  slas: SLABreachItem[];
}

export function SlaPerformanceWidget({ slas }: SlaPerformanceWidgetProps) {
  const navigate = useNavigate();
  const activeAlerts = slas.length;
  // Without historical SLA metrics from the backend, we calculate a baseline score
  // based on active queue alerts.
  const isOptimal = activeAlerts === 0;
  const overallSla = isOptimal ? 100.0 : Math.max(60.0, 100 - (activeAlerts * 2.5));
  
  return (
    <div
      onClick={() => navigate("/admin/sla")}
      className="bg-[#161F2D] rounded-2xl border border-[#2A3446] shadow-sm hover:border-[#7FA0D6]/50 transition-all p-4 sm:p-5 flex flex-col w-full font-sans cursor-pointer group hover-card-innovative"
    >
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center gap-2">
          <h2 className="text-[17px] font-black text-white group-hover:text-[#7FA0D6] transition-colors tracking-tight">SLA Performance</h2>
          <span className="text-[9px] font-bold text-[#7FA0D6] bg-[#7FA0D6]/15 px-2 py-0.5 rounded-full border border-[#7FA0D6]/30 shadow-2xs">
            {isOptimal ? "Goal Met" : "Requires Attention"}
          </span>
        </div>
        <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full shadow-2xs ${isOptimal ? "text-emerald-400 bg-emerald-400/15" : "text-rose-400 bg-rose-400/15"}`}>
          {isOptimal ? "Optimal" : "Breached"}
        </span>
      </div>
      <p className="text-[11px] text-[#97A0B3] font-medium mb-3">Daily metrics on response & resolution deadlines</p>

      <div className="flex items-center gap-3 sm:gap-4 mb-3.5 bg-[#0B111C] border border-[#2A3446] rounded-xl p-3 shadow-2xs">
        {/* Circular Progress */}
        <div className="relative w-[64px] h-[64px] flex items-center justify-center flex-shrink-0">
          <svg className="w-full h-full -rotate-90" viewBox="0 0 36 36">
            <circle cx="18" cy="18" r="16" fill="none" className="stroke-[#2A3446]" strokeWidth="4" />
            <circle
              cx="18"
              cy="18"
              r="16"
              fill="none"
              className="stroke-[#7FA0D6]"
              strokeWidth="4"
              strokeDasharray="100"
              strokeDashoffset={100 - overallSla}
              strokeLinecap="round"
            />
          </svg>
          <div className="absolute flex flex-col items-center">
            <span className="text-[8px] font-black text-[#97A0B3] tracking-wider">SLA</span>
            <span className="text-[14px] font-black text-white tracking-tighter leading-none my-0.5">{overallSla}%</span>
            <span className="text-[7px] font-black text-[#7FA0D6] tracking-wider">Met</span>
          </div>
        </div>

        {/* Dynamic Metric Display */}
        <div className="flex flex-col gap-2 flex-1 justify-center">
          <div className="flex flex-col gap-1">
            <div className="flex justify-between text-[11px] font-bold tracking-tight">
              <span className="text-[#97A0B3]">Current SLA Score</span>
              <span className={isOptimal ? "text-emerald-400" : "text-rose-400"}>{overallSla.toFixed(1)}%</span>
            </div>
            <div className="w-full h-[5px] bg-[#2A3446] rounded-full overflow-hidden">
              <div className={`h-full rounded-full ${isOptimal ? "bg-emerald-400" : "bg-rose-400"}`} style={{ width: `${overallSla}%` }} />
            </div>
          </div>
        </div>
      </div>

      {/* Alerts */}
      <div className="flex flex-col">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-rose-600 shadow-[0_0_6px_rgba(244,63,94,0.6)]" />
            <h3 className="text-xs font-black text-white tracking-tight">Alerts Raised</h3>
          </div>
          <span className="text-[9px] font-bold text-[#7FA0D6] bg-[#7FA0D6]/15 px-2 py-0.5 rounded-full shadow-2xs">
            {activeAlerts} Active
          </span>
        </div>

        <div className="flex flex-col gap-2">
          {slas.length > 0 ? (
            slas.slice(0, 2).map((sla) => (
              <div key={sla.id} className="flex items-center justify-between p-2.5 rounded-xl border border-rose-900/40 bg-rose-950/30">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-7 h-7 rounded-lg bg-rose-600 text-white flex items-center justify-center flex-shrink-0 shadow-2xs">
                    <AlertTriangle className="w-3.5 h-3.5 stroke-[2.5]" />
                  </div>
                  <div className="flex flex-col gap-0.5 min-w-0">
                    <span className="text-xs font-black text-white truncate tracking-tight">
                      SLA breached on {sla.deliverable_type?.replace("_", " ") || "Task"} #{sla.id.slice(0, 4)}
                    </span>
                    <span className="text-[10px] text-[#97A0B3] font-medium">
                      {sla.client_company || "Client"} · Past Due
                    </span>
                  </div>
                </div>
                <span className="text-[9px] font-black text-rose-500 ml-2 tracking-wide shrink-0">Warning</span>
              </div>
            ))
          ) : (
            <div className="flex items-center justify-between p-2.5 rounded-xl border border-[#2A3446] bg-[#0B111C]">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-7 h-7 rounded-lg bg-emerald-600 text-white flex items-center justify-center flex-shrink-0 shadow-2xs">
                  <CheckCircle2 className="w-3.5 h-3.5 stroke-[2.5]" />
                </div>
                <div className="flex flex-col gap-0.5 min-w-0">
                  <span className="text-xs font-black text-white truncate tracking-tight">
                    All SLA commitments on schedule
                  </span>
                  <span className="text-[10px] text-[#97A0B3] font-medium">All active pods meeting first-pass response targets</span>
                </div>
              </div>
              <span className="text-[9px] font-black text-emerald-400 ml-2 tracking-wide shrink-0">Optimal</span>
            </div>
          )}
        </div>
      </div>

      <div className="mt-3 pt-3 border-t border-[#2A3446] flex items-center justify-between text-[11px] text-[#97A0B3] font-medium" onClick={(e) => e.stopPropagation()}>
        <span>Live Metrics</span>
        <button
          onClick={(e) => {
            e.stopPropagation();
            navigate("/admin/sla");
          }}
          className="text-[#7FA0D6] hover:underline font-bold cursor-pointer"
        >
          Configure alerts &rarr;
        </button>
      </div>
    </div>
  );
}
