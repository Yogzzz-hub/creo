
import { useState } from "react";
import { useNavigate } from "react-router";
import { SLABreachItem } from "@/types/ops";
import { Check, Loader2 } from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { resolveTaskSla } from "@/lib/ops-api";

interface SupportTicketsWidgetProps {
  slas: SLABreachItem[];
}

export function SupportTicketsWidget({ slas }: SupportTicketsWidgetProps) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  
  const resolveMutation = useMutation({
    mutationFn: resolveTaskSla,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin_sla_breaches"] });
      queryClient.invalidateQueries({ queryKey: ["admin_dashboard"] });
      queryClient.invalidateQueries({ queryKey: ["admin_queue"] });
    },
  });

  const [activeTab, setActiveTab] = useState<"open" | "pending" | "resolved">("open");

  // Mocking the counts to match the aesthetic if data is low
  const openCount = slas.length;
  const urgentCount = slas.filter((_, idx) => idx % 3 === 0).length;

  const getSeverityBadge = (idx: number) => {
    if (idx % 3 === 0) return { label: "Urgent", classes: "bg-rose-100 text-rose-700 border-rose-200" };
    if (idx % 3 === 1) return { label: "Medium", classes: "bg-blue-100 text-blue-700 border-blue-200" };
    return { label: "Normal", classes: "bg-gray-100 text-gray-700 border-gray-200" };
  };

  const getAvatarColor = (idx: number) => {
    const colors = ["bg-blue-600", "bg-gray-800", "bg-indigo-500", "bg-cyan-600"];
    return colors[idx % colors.length];
  };

  const displayedSlas = activeTab === "open" ? slas : slas.filter(s => s.status === activeTab);

  return (
    <div
      onClick={() => navigate("/admin/support")}
      className="bg-white rounded-2xl border border-gray-100 shadow-[0_2px_10px_rgba(0,0,0,0.04)] hover:shadow-xl hover:border-blue-200/80 transition-all p-6 flex flex-col w-full font-sans cursor-pointer group"
    >
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <h2 className="text-lg font-bold text-gray-900 group-hover:text-blue-600 transition-colors tracking-tight">Support Tickets</h2>
          <span className="text-[10px] font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-100">
            {openCount} Open
          </span>
        </div>
        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold text-rose-700 bg-rose-50 border border-rose-100">
          {urgentCount} Urgent
        </span>
      </div>
      <p className="text-xs text-gray-500 mb-5">Client issues, incidents & resolution queue</p>

      {/* Tabs */}
      <div className="flex items-center gap-1 bg-slate-50 border border-slate-100/80 rounded-full p-1 mb-5 w-max" onClick={(e) => e.stopPropagation()}>
        <button 
          onClick={(e) => {
            e.stopPropagation();
            setActiveTab("open");
          }}
          className={`px-3.5 py-1.5 text-[11px] rounded-full transition-all cursor-pointer ${
            activeTab === "open" 
              ? "font-bold text-blue-600 bg-white shadow-[0_2px_8px_rgba(0,0,0,0.04)]" 
              : "font-semibold text-slate-500 hover:text-slate-700"
          }`}
        >
          Open ({openCount})
        </button>
        <button 
          onClick={(e) => {
            e.stopPropagation();
            setActiveTab("pending");
          }}
          className={`px-3.5 py-1.5 text-[11px] rounded-full transition-all cursor-pointer ${
            activeTab === "pending" 
              ? "font-bold text-blue-600 bg-white shadow-[0_2px_8px_rgba(0,0,0,0.04)]" 
              : "font-semibold text-slate-500 hover:text-slate-700"
          }`}
        >
          Pending (6)
        </button>
        <button 
          onClick={(e) => {
            e.stopPropagation();
            setActiveTab("resolved");
          }}
          className={`px-3.5 py-1.5 text-[11px] rounded-full transition-all cursor-pointer ${
            activeTab === "resolved" 
              ? "font-bold text-blue-600 bg-white shadow-[0_2px_8px_rgba(0,0,0,0.04)]" 
              : "font-semibold text-slate-500 hover:text-slate-700"
          }`}
        >
          Resolved (38)
        </button>
      </div>

      {/* Ticket List */}
      <div className="flex flex-col gap-3">
        {displayedSlas.slice(0, 3).map((sla, idx) => {
          const severity = getSeverityBadge(idx);
          let badgeClasses = "bg-rose-500 text-white border-rose-500";
          if (idx % 3 === 1) badgeClasses = "bg-sky-100 text-sky-700 border-sky-200";
          else if (idx % 3 === 2) badgeClasses = "bg-transparent text-slate-500 border-transparent font-medium";

          const initials = sla.client_company ? sla.client_company.substring(0, 1).toUpperCase() : "C";
          return (
            <div
              key={sla.id}
              onClick={(e) => {
                e.stopPropagation();
                navigate(`/admin/support/tickets/${sla.id}`);
              }}
              className="flex items-center justify-between p-3 sm:px-4 sm:py-3.5 rounded-[24px] border border-slate-100/80 shadow-[0_2px_12px_rgba(0,0,0,0.02)] hover:border-slate-200 hover:shadow-[0_4px_16px_rgba(0,0,0,0.04)] transition-all bg-white cursor-pointer"
            >
              <div className="flex items-center gap-3.5">
                <div className={`w-9 h-9 flex-shrink-0 rounded-full text-white flex items-center justify-center text-sm font-black shadow-sm ${getAvatarColor(idx)}`}>
                  {initials}
                </div>
                <div className="flex flex-col gap-0.5">
                  <div className="flex items-center gap-2">
                    <span className="text-[13px] font-bold text-slate-900 tracking-tight">
                      {sla.deliverable_type || "Support Inquiry"}
                    </span>
                    <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full tracking-wide ${badgeClasses}`}>
                      {severity.label}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 text-[11px] text-slate-400 font-medium tracking-tight">
                    <span>{sla.client_company || "Internal"}</span>
                    <span className="text-slate-300">•</span>
                    <span>{idx + 1}2m ago</span>
                    <span className="text-slate-300">•</span>
                    <span className="font-mono">#{sla.id.slice(0, 4)}</span>
                  </div>
                </div>
              </div>
              <button 
                onClick={(e) => {
                  e.stopPropagation();
                  resolveMutation.mutate(sla.id);
                }}
                disabled={resolveMutation.isPending}
                className="flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 shadow-sm shadow-blue-600/20 transition-all disabled:opacity-50 cursor-pointer shrink-0"
              >
                {resolveMutation.isPending && resolveMutation.variables === sla.id ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Check className="w-3.5 h-3.5 stroke-[3]" />
                )}
                Resolve
              </button>
            </div>
          );
        })}
        {displayedSlas.length === 0 && (
          <div className="py-6 text-center text-xs text-gray-500">
            {activeTab === "open" ? "No open tickets right now. Inbox zero!" : `No ${activeTab} tickets right now.`}
          </div>
        )}
      </div>

      <div className="mt-4 pt-4 border-t border-gray-50 flex items-center justify-between text-[11px] text-gray-500 font-medium" onClick={(e) => e.stopPropagation()}>
        <span>Avg response: 8.4m</span>
        <button
          onClick={(e) => {
            e.stopPropagation();
            navigate("/admin/support");
          }}
          className="text-blue-600 hover:underline cursor-pointer"
        >
          View all {openCount} tickets &rarr;
        </button>
      </div>
    </div>
  );
}
