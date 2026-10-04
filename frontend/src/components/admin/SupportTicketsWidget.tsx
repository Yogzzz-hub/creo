import { useState, useEffect } from "react";
import { useNavigate } from "react-router";
import { SLABreachItem } from "@/types/ops";
import { Check, CheckCircle2, RotateCcw, X } from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { resolveTaskSla } from "@/lib/ops-api";
import { request } from "@/lib/http";

interface SupportTicketsWidgetProps {
  slas: SLABreachItem[];
}

interface TicketRecord {
  id: string;
  title: string;
  client: string;
  clientInitials: string;
  avatarBg: string;
  priority: "Urgent" | "High" | "Medium" | "Normal";
  timeLog: string;
  agent: string;
  pod: string;
  status: "open" | "pending" | "resolved";
}

const DEFAULT_TICKETS: TicketRecord[] = [];

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

  const [tickets, setTickets] = useState<TicketRecord[]>(DEFAULT_TICKETS);
  const [activeTab, setActiveTab] = useState<"open" | "pending" | "resolved">("open");

  useEffect(() => {
    const loadWidgetTickets = async () => {
      try {
        let serverItems: any[] = [];
        try {
          const res = await request<any[]>("/api/v1/admin/support/tickets");
          if (Array.isArray(res) && res.length > 0) serverItems = res;
        } catch {
          try {
            const res2 = await request<any[]>("/api/v1/tickets");
            if (Array.isArray(res2)) serverItems = res2;
          } catch {}
        }

        let localItems: any[] = [];
        try {
          localItems = JSON.parse(localStorage.getItem("creo_support_tickets") || "[]");
        } catch {}

        const mappedServer: TicketRecord[] = serverItems.map((st: any) => {
          const prio = (st.priority || "medium").toLowerCase();
          const priority: TicketRecord["priority"] =
            prio === "urgent" ? "Urgent" : prio === "high" ? "High" : prio === "low" ? "Normal" : "Medium";
          const stat = (st.status || "open").toLowerCase();
          const status: TicketRecord["status"] =
            stat === "resolved" ? "resolved" : stat === "waiting_on_client" ? "pending" : "open";
          const clientName = st.client || "Client";
          const shortId = String(st.id).length > 8 ? String(st.id).slice(0, 8).toUpperCase() : String(st.id);

          return {
            id: shortId,
            title: st.title || st.subject || "Support Inquiry",
            client: clientName,
            clientInitials: clientName[0].toUpperCase(),
            avatarBg: "bg-[#0B111C]",
            priority,
            timeLog: st.time || "Logged recently",
            agent: st.assignee_name || "Support Lead",
            pod: "Pod A",
            status,
          };
        });

        const mappedLocal: TicketRecord[] = localItems.map((lt: any) => {
          const prio = (lt.priority || "Urgent").toLowerCase();
          const priority: TicketRecord["priority"] =
            prio === "urgent" ? "Urgent" : prio === "high" ? "High" : prio === "low" ? "Normal" : "Medium";
          const stat = (lt.status || "Open").toLowerCase();
          const status: TicketRecord["status"] =
            stat === "resolved" ? "resolved" : stat === "pending client" ? "pending" : "open";
          const clientName = lt.client || "Client";

          return {
            id: String(lt.id),
            title: lt.issueTitle || lt.title || "Support Request",
            client: clientName,
            clientInitials: clientName[0].toUpperCase(),
            avatarBg: lt.avatarBg || "bg-[#0B111C]",
            priority,
            timeLog: lt.timeLog || "Logged just now",
            agent: lt.agent || "Support Lead",
            pod: lt.pod || "Pod A",
            status,
          };
        });

        const combined = [...mappedLocal, ...mappedServer];
        const seen = new Set<string>();
        const deduped: TicketRecord[] = [];

        for (const t of combined) {
          const key = `${t.id}_${t.title.toLowerCase()}`;
          if (!seen.has(key)) {
            seen.add(key);
            deduped.push(t);
          }
        }

        if (deduped.length > 0) {
          setTickets([...deduped, ...DEFAULT_TICKETS.filter((dt) => !deduped.some((d) => d.id === dt.id))]);
        }
      } catch {}
    };

    loadWidgetTickets();
    const interval = setInterval(loadWidgetTickets, 5000);
    const handleStorage = (e: StorageEvent) => {
      if (e.key === "creo_support_tickets") loadWidgetTickets();
    };
    window.addEventListener("storage", handleStorage);
    return () => {
      clearInterval(interval);
      window.removeEventListener("storage", handleStorage);
    };
  }, []);

  // Centered Alert Modal on Resolve / Reopen with blurred backdrop
  const [alertModal, setAlertModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    ticketId?: string;
    client?: string;
    type?: "success" | "info";
  } | null>(null);

  // Derive counts dynamically
  const openCount = tickets.filter((t) => t.status === "open").length + slas.length;
  const urgentCount = tickets.filter((t) => t.status === "open" && t.priority === "Urgent").length;
  const pendingCount = tickets.filter((t) => t.status === "pending").length;
  const resolvedCount = tickets.filter((t) => t.status === "resolved").length;

  const currentTabTickets = tickets.filter((t) => t.status === activeTab);

  const handleToggleResolve = (ticket: TicketRecord) => {
    if (ticket.status !== "resolved") {
      setTickets((prev) =>
        prev.map((t) =>
          t.id === ticket.id
            ? { ...t, status: "resolved", timeLog: "Resolved just now" }
            : t
        )
      );
      setAlertModal({
        isOpen: true,
        title: "Ticket Resolved",
        message: `Ticket #${ticket.id} (${ticket.client}) marked as resolved. SLA guarantee met!`,
        ticketId: ticket.id,
        client: ticket.client,
        type: "success",
      });
      try {
        resolveMutation.mutate(ticket.id);
      } catch {
        // optimistic update
      }
    } else {
      setTickets((prev) =>
        prev.map((t) =>
          t.id === ticket.id
            ? { ...t, status: "open", timeLog: "Reopened just now" }
            : t
        )
      );
      setAlertModal({
        isOpen: true,
        title: "Ticket Reopened",
        message: `Ticket #${ticket.id} (${ticket.client}) returned to active queue.`,
        ticketId: ticket.id,
        client: ticket.client,
        type: "info",
      });
    }
  };

  const getPriorityBadge = (priority: TicketRecord["priority"]) => {
    switch (priority) {
      case "Urgent":
        return "bg-blue-950/80 text-[#BCCCE6] border border-blue-500/60 shadow-2xs";
      case "High":
        return "bg-blue-900/50 text-[#BCCCE6] border border-blue-600/50";
      case "Medium":
        return "bg-blue-800/40 text-[#7FA0D6] border border-blue-700/40";
      case "Normal":
      default:
        return "bg-[#161F2D] text-[#F1F5F9] border-[#2A3446]";
    }
  };

  return (
    <div
      onClick={() => navigate("/admin/support")}
      className="bg-[#161F2D] rounded-2xl border border-[#2A3446] shadow-sm hover:border-[#7FA0D6]/50 transition-all p-4 sm:p-5 flex flex-col justify-between h-full font-sans cursor-pointer group hover-card-innovative"
    >
      <div>
        {/* Header Title Row */}
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-2">
            <h2 className="text-[17px] font-black text-white group-hover:text-[#7FA0D6] transition-colors tracking-tight">
              Support Tickets
            </h2>
            <span className="text-[9px] font-bold text-[#7FA0D6] bg-[#7FA0D6]/15 px-2 py-0.5 rounded-full border border-[#7FA0D6]/30 shadow-2xs">
              {openCount} Open
            </span>
          </div>
          <span className="px-2 py-0.5 rounded-full text-[9px] font-black text-[#BCCCE6] bg-blue-950/80 border border-blue-500/60 shadow-2xs">
            {urgentCount} Urgent
          </span>
        </div>
        <p className="text-[11px] text-[#97A0B3] font-medium mb-3">
          Client issues, incidents & resolution queue
        </p>

        {/* Tab Switcher Pills */}
        <div
          className="flex items-center gap-1 bg-[#0B111C] border border-[#2A3446]/80 rounded-xl p-0.5 mb-3 w-max shadow-2xs"
          onClick={(e) => e.stopPropagation()}
        >
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setActiveTab("open");
            }}
            className={`px-3 py-1 text-[11px] rounded-lg transition-all cursor-pointer ${
              activeTab === "open"
                ? "font-bold text-[#7FA0D6] bg-[#161F2D] shadow-2xs"
                : "font-semibold text-[#97A0B3] hover:text-[#F1F5F9]"
            }`}
          >
            Open ({openCount})
          </button>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setActiveTab("pending");
            }}
            className={`px-3 py-1 text-[11px] rounded-lg transition-all cursor-pointer ${
              activeTab === "pending"
                ? "font-bold text-[#7FA0D6] bg-[#161F2D] shadow-2xs"
                : "font-semibold text-[#97A0B3] hover:text-[#F1F5F9]"
            }`}
          >
            Pending ({pendingCount})
          </button>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setActiveTab("resolved");
            }}
            className={`px-3 py-1 text-[11px] rounded-lg transition-all cursor-pointer ${
              activeTab === "resolved"
                ? "font-bold text-[#7FA0D6] bg-[#161F2D] shadow-2xs"
                : "font-semibold text-[#97A0B3] hover:text-[#F1F5F9]"
            }`}
          >
            Resolved ({resolvedCount})
          </button>
        </div>

        {/* Ticket List Container */}
        <div className="flex flex-col gap-2">
          {currentTabTickets.length === 0 ? (
            <div className="py-6 text-center text-xs text-[#97A0B3] font-medium bg-[#0B111C]/60 rounded-xl border border-[#2A3446]">
              No tickets in {activeTab} status
            </div>
          ) : (
            currentTabTickets.slice(0, 3).map((t) => (
            <div
              key={t.id}
              onClick={(e) => {
                e.stopPropagation();
                navigate(`/admin/support/tickets/${t.id}`);
              }}
              className="flex items-center justify-between p-2.5 sm:px-3 sm:py-2.5 rounded-xl border border-[#2A3446] hover:border-[#7FA0D6]/30 hover:shadow-2xs transition-all bg-[#161F2D] cursor-pointer group/item"
            >
              <div className="flex items-center gap-2.5 min-w-0 pr-2">
                <div
                  className={`size-7 rounded-lg text-white font-bold text-xs flex items-center justify-center shrink-0 shadow-2xs ${t.avatarBg}`}
                >
                  {t.clientInitials}
                </div>
                <div className="flex flex-col min-w-0">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-xs font-bold text-white group-hover/item:text-[#7FA0D6] transition-colors truncate max-w-[160px] sm:max-w-[200px]">
                      {t.title}
                    </span>
                    <span
                      className={`text-[8px] font-extrabold px-1.5 py-0.2 rounded-md border ${getPriorityBadge(
                        t.priority
                      )}`}
                    >
                      {t.priority}
                    </span>
                  </div>
                  <div className="flex items-center gap-1 text-[10px] text-[#97A0B3] font-medium">
                    <span className="text-[#F1F5F9] font-semibold">{t.client}</span>
                    <span className="text-slate-300">•</span>
                    <span className={t.priority === "Urgent" ? "text-[#D8BF9B] font-bold" : "text-[#97A0B3]"}>
                      {t.timeLog}
                    </span>
                    <span className="text-slate-300">•</span>
                    <span className="font-mono text-[#97A0B3]">#{t.id}</span>
                  </div>
                </div>
              </div>

              {/* Action Button */}
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  handleToggleResolve(t);
                }}
                className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-bold shadow-2xs active:scale-95 transition-all cursor-pointer shrink-0 ${
                  t.status === "resolved"
                    ? "bg-[#161F2D] hover:bg-slate-200 text-[#F1F5F9]"
                    : "bg-blue-600 hover:bg-blue-700 text-white shadow-blue-500/20"
                }`}
              >
                {t.status === "resolved" ? (
                  <>
                    <RotateCcw className="size-2.5" />
                    Reopen
                  </>
                ) : (
                  <>
                    <Check className="size-2.5 stroke-[3]" />
                    Resolve
                  </>
                )}
              </button>
            </div>
            ))
          )}
        </div>
      </div>

      {/* Footer Meta Row */}
      <div
        className="mt-3 pt-3 border-t border-[#2A3446] flex items-center justify-between text-[11px] text-[#97A0B3] font-medium"
        onClick={(e) => e.stopPropagation()}
      >
        <span className="flex items-center gap-1 font-semibold text-[#F1F5F9]">
          Avg response: <strong className="text-[#7FA0D6]">8.4m</strong> (Target &lt;15m)
        </span>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            navigate("/admin/support");
          }}
          className="text-[#7FA0D6] hover:text-blue-800 font-bold hover:underline cursor-pointer flex items-center gap-1"
        >
          View all {openCount} tickets &rarr;
        </button>
      </div>

      {/* Centered Modal with Blurred Background */}
      {alertModal?.isOpen && (
        <div
          className="fixed inset-0 w-screen h-screen z-[99999] flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-md animate-fade-in"
          onClick={(e) => {
            e.stopPropagation();
            setAlertModal(null);
          }}
        >
          <div
            className="relative w-full max-w-md rounded-3xl bg-[#161F2D] p-6 sm:p-8 shadow-2xl border border-[#2A3446] flex flex-col items-center text-center animate-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
          >
            <button
              type="button"
              onClick={() => setAlertModal(null)}
              className="absolute top-4 right-4 size-8 rounded-full bg-[#161F2D] hover:bg-slate-200 text-[#97A0B3] hover:text-[#F1F5F9] flex items-center justify-center transition-colors cursor-pointer"
              aria-label="Close modal"
            >
              <X className="size-4" />
            </button>

            <div
              className={`size-16 rounded-3xl flex items-center justify-center mb-4 ring-8 shadow-inner ${
                alertModal.type === "success"
                  ? "bg-blue-950/30 text-[#BCCCE6] ring-blue-500/30"
                  : "bg-[#7FA0D6]/15 text-[#7FA0D6] ring-blue-500/30"
              }`}
            >
              {alertModal.type === "success" ? (
                <CheckCircle2 className="size-8" />
              ) : (
                <RotateCcw className="size-8" />
              )}
            </div>

            <h3 className="text-xl font-black text-white tracking-tight">
              {alertModal.title}
            </h3>

            <p className="text-xs sm:text-sm text-[#F1F5F9] mt-2 leading-relaxed max-w-sm text-center">
              {alertModal.message}
            </p>

            <div className="w-full mt-6 flex items-center gap-3">
              <button
                type="button"
                onClick={() => setAlertModal(null)}
                autoFocus
                className="flex-1 py-3 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold text-xs shadow-md shadow-blue-500/25 active:scale-95 transition-all cursor-pointer"
              >
                OK
              </button>
              {alertModal.ticketId && (
                <button
                  type="button"
                  onClick={() => {
                    const id = alertModal.ticketId;
                    setAlertModal(null);
                    navigate(`/admin/support/tickets/${id}`);
                  }}
                  className="px-5 py-3 rounded-2xl bg-[#161F2D] hover:bg-slate-200 text-[#F1F5F9] font-bold text-xs active:scale-95 transition-all cursor-pointer"
                >
                  View Details
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
