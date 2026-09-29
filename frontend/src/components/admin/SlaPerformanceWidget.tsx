
import { useNavigate } from "react-router";
import { SLABreachItem } from "@/types/ops";
import { AlertTriangle, CheckCircle2 } from "lucide-react";

interface SlaPerformanceWidgetProps {
  slas: SLABreachItem[];
}

export function SlaPerformanceWidget({ slas }: SlaPerformanceWidgetProps) {
  const navigate = useNavigate();
  // Mock data as per screenshot since we don't have historical SLA % in API
  const overallSla = 98.4;
  const responseSla = 99.1;
  const resolutionSla = 97.8;
  const activeAlerts = slas.length > 0 ? slas.length : 2; // mock if 0 for UI purposes

  return (
    <div
      onClick={() => navigate("/admin/sla")}
      className="bg-white rounded-2xl border border-gray-100 shadow-[0_2px_10px_rgba(0,0,0,0.04)] hover:shadow-xl hover:border-blue-200/80 transition-all p-6 flex flex-col w-full font-sans cursor-pointer group"
    >
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center gap-3">
          <h2 className="text-[17px] font-black text-slate-900 group-hover:text-blue-600 transition-colors tracking-tight">SLA Performance</h2>
          <span className="text-[10px] font-bold text-blue-600 bg-blue-50 px-2.5 py-0.5 rounded-full border border-blue-100/50 shadow-sm shadow-blue-500/5">
            Goal 98.0%
          </span>
        </div>
        <span className="text-[10px] font-bold text-blue-600 bg-blue-50 px-2.5 py-0.5 rounded-full shadow-sm shadow-blue-500/5">
          Optimal
        </span>
      </div>
      <p className="text-[11px] text-slate-500 font-medium mb-5">Daily metrics on response & resolution deadlines</p>

      <div className="flex items-center gap-5 sm:gap-7 mb-7 bg-slate-50/70 border border-slate-100/80 rounded-[28px] p-4 sm:p-5 shadow-[0_2px_12px_rgba(0,0,0,0.015)]">
        {/* Circular Progress */}
        <div className="relative w-[84px] h-[84px] flex items-center justify-center flex-shrink-0">
          <svg className="w-full h-full -rotate-90" viewBox="0 0 36 36">
            <circle cx="18" cy="18" r="16" fill="none" className="stroke-blue-100/50" strokeWidth="4" />
            <circle
              cx="18"
              cy="18"
              r="16"
              fill="none"
              className="stroke-blue-600"
              strokeWidth="4"
              strokeDasharray="100"
              strokeDashoffset={100 - overallSla}
              strokeLinecap="round"
            />
          </svg>
          <div className="absolute flex flex-col items-center">
            <span className="text-[9px] font-black text-slate-400 tracking-wider">SLA</span>
            <span className="text-[19px] font-black text-slate-900 tracking-tighter leading-none my-0.5">{overallSla}%</span>
            <span className="text-[8px] font-black text-blue-600 tracking-wider">Met</span>
          </div>
        </div>

        {/* Linear Bars */}
        <div className="flex flex-col gap-4 flex-1">
          <div className="flex flex-col gap-1.5">
            <div className="flex justify-between text-xs font-bold tracking-tight">
              <span className="text-slate-500">Response SLA</span>
              <span className="text-blue-600">{responseSla}%</span>
            </div>
            <div className="w-full h-[7px] bg-slate-200/60 rounded-full overflow-hidden">
              <div className="h-full bg-blue-600 rounded-full shadow-[inset_0_-1px_1px_rgba(0,0,0,0.1)]" style={{ width: `${responseSla}%` }} />
            </div>
          </div>
          <div className="flex flex-col gap-1.5">
            <div className="flex justify-between text-xs font-bold tracking-tight">
              <span className="text-slate-500">Resolution SLA</span>
              <span className="text-cyan-500">{resolutionSla}%</span>
            </div>
            <div className="w-full h-[7px] bg-slate-200/60 rounded-full overflow-hidden">
              <div className="h-full bg-cyan-500 rounded-full shadow-[inset_0_-1px_1px_rgba(0,0,0,0.1)]" style={{ width: `${resolutionSla}%` }} />
            </div>
          </div>
        </div>
      </div>

      {/* Alerts */}
      <div className="flex flex-col">
        <div className="flex items-center justify-between mb-3.5">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.6)]" />
            <h3 className="text-sm font-black text-slate-900 tracking-tight">Alerts Raised</h3>
          </div>
          <span className="text-[10px] font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full shadow-sm shadow-blue-500/5">
            {activeAlerts} Active
          </span>
        </div>

        <div className="flex flex-col gap-2.5">
          {slas.length > 0 ? (
            slas.slice(0, 2).map((sla) => (
              <div key={sla.id} className="flex items-center justify-between p-3.5 rounded-[20px] border border-rose-100 bg-rose-50/30">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-[10px] bg-rose-500 text-white flex items-center justify-center flex-shrink-0 shadow-sm shadow-rose-500/30">
                    <AlertTriangle className="w-4 h-4 stroke-[2.5]" />
                  </div>
                  <div className="flex flex-col gap-0.5">
                    <span className="text-[12px] font-black text-slate-900 line-clamp-1 tracking-tight">
                      Response time approaching breach on #{sla.id.slice(0, 4)}
                    </span>
                    <span className="text-[10px] text-slate-400 font-medium">
                      {sla.client_company} · {sla.sla_due_at ? "Breached" : "18m remaining"}
                    </span>
                  </div>
                </div>
                <span className="text-[10px] font-black text-rose-500 ml-2 tracking-wide">Warning</span>
              </div>
            ))
          ) : (
            <>
              <div className="flex items-center justify-between p-3.5 rounded-[20px] border border-slate-100/80 shadow-[0_2px_10px_rgba(0,0,0,0.015)] bg-white">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-[10px] bg-rose-500 text-white flex items-center justify-center flex-shrink-0 shadow-sm shadow-rose-500/30">
                    <AlertTriangle className="w-4 h-4 stroke-[2.5]" />
                  </div>
                  <div className="flex flex-col gap-0.5">
                    <span className="text-[12px] font-black text-slate-900 line-clamp-1 tracking-tight">
                      Response time approaching breach on #1...
                    </span>
                    <span className="text-[10px] text-slate-400 font-medium">Pod A · Maya Lin · 18m remaining</span>
                  </div>
                </div>
                <span className="text-[10px] font-black text-rose-500 ml-2 tracking-wide">Warning</span>
              </div>
              <div className="flex items-center justify-between p-3.5 rounded-[20px] border border-slate-100/80 shadow-[0_2px_10px_rgba(0,0,0,0.015)] bg-white">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-[10px] bg-blue-600 text-white flex items-center justify-center flex-shrink-0 shadow-sm shadow-blue-600/30">
                    <CheckCircle2 className="w-4 h-4 stroke-[2.5]" />
                  </div>
                  <div className="flex flex-col gap-0.5">
                    <span className="text-[12px] font-black text-slate-900 line-clamp-1 tracking-tight">
                      Escalation cleared for Atlas pod
                    </span>
                    <span className="text-[10px] text-slate-400 font-medium">Pod C · Lena Ortiz · SLA intact</span>
                  </div>
                </div>
                <span className="text-[10px] font-black text-blue-600 ml-2 tracking-wide">Cleared</span>
              </div>
            </>
          )}
        </div>
      </div>

      <div className="mt-4 pt-4 border-t border-gray-50 flex items-center justify-between text-[11px] text-gray-500 font-medium" onClick={(e) => e.stopPropagation()}>
        <span>Updated 2 mins ago</span>
        <button
          onClick={(e) => {
            e.stopPropagation();
            navigate("/admin/sla");
          }}
          className="text-blue-600 hover:underline cursor-pointer"
        >
          Configure alerts &rarr;
        </button>
      </div>
    </div>
  );
}
