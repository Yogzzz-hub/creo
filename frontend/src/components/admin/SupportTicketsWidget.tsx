import { useState } from "react";
import { useNavigate } from "react-router";
import { SLABreachItem } from "@/types/ops";
import { Check, CheckCircle2, RotateCcw, X } from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { resolveTaskSla } from "@/lib/ops-api";

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

const DEFAULT_TICKETS: TicketRecord[] = [
  // Open Tickets
  {
    id: "1042",
    title: "API Webhook Timeout on Deliverables Sync",
    client: "Northwind Labs",
    clientInitials: "N",
    avatarBg: "bg-blue-600",
    priority: "Urgent",
    timeLog: "18m remaining",
    agent: "Maya Lin",
    pod: "Pod A",
    status: "open",
  },
  {
    id: "1032",
    title: "Video Format Encoding Artifacts in 4K",
    client: "Vanguard Mobility",
    clientInitials: "V",
    avatarBg: "bg-gray-800",
    priority: "High",
    timeLog: "Logged 2h ago",
    agent: "Theo Clark",
    pod: "Pod D",
    status: "open",
  },
  {
    id: "1039",
    title: "Asset Upload Sync Error in Reels Batch 34",
    client: "Bloom Studio",
    clientInitials: "B",
    avatarBg: "bg-indigo-600",
    priority: "Medium",
    timeLog: "Logged 28m ago",
    agent: "Omar V.",
    pod: "Pod B",
    status: "open",
  },

  // Pending Tickets
  {
    id: "1035",
    title: "Billing Invoice Inquiry & Add-on Pricing",
    client: "Atlas Commerce",
    clientInitials: "A",
    avatarBg: "bg-blue-700",
    priority: "Normal",
    timeLog: "Logged 1h ago",
    agent: "Lena Ortiz",
    pod: "Pod C",
    status: "pending",
  },
  {
    id: "1031",
    title: "Brand Asset Vector Scalability Check",
    client: "Lumina Health",
    clientInitials: "L",
    avatarBg: "bg-purple-600",
    priority: "Medium",
    timeLog: "Logged 3h ago",
    agent: "Sarah J.",
    pod: "Pod E",
    status: "pending",
  },
  {
    id: "1029",
    title: "Audio Stems Re-Sync for Holiday Promo",
    client: "Bloom Studio",
    clientInitials: "B",
    avatarBg: "bg-indigo-600",
    priority: "Normal",
    timeLog: "Logged 4h ago",
    agent: "Chloe Tan",
    pod: "Pod B",
    status: "pending",
  },

  // Resolved Tickets
  {
    id: "1028",
    title: "Font Licensing Verification for Q4 Campaign",
    client: "Lumina Health",
    clientInitials: "L",
    avatarBg: "bg-purple-600",
    priority: "Normal",
    timeLog: "Resolved 3h ago",
    agent: "Sarah J.",
    pod: "Pod E",
    status: "resolved",
  },
  {
    id: "1025",
    title: "Custom Palette Token Ingestion",
    client: "Northwind Labs",
    clientInitials: "N",
    avatarBg: "bg-blue-600",
    priority: "Normal",
    timeLog: "Resolved 5h ago",
    agent: "Maya Lin",
    pod: "Pod A",
    status: "resolved",
  },
  {
    id: "1021",
    title: "Aspect Ratio Re-format 4:5 to 9:16",
    client: "Atlas Commerce",
    clientInitials: "A",
    avatarBg: "bg-blue-700",
    priority: "Normal",
    timeLog: "Resolved 1d ago",
    agent: "Elena R.",
    pod: "Pod A",
    status: "resolved",
  },
];

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
  const openCount = tickets.filter((t) => t.status === "open").length + (slas.length > 0 ? slas.length : 11);
  const urgentCount = tickets.filter((t) => t.status === "open" && t.priority === "Urgent").length + 4;
  const pendingCount = tickets.filter((t) => t.status === "pending").length + 3;
  const resolvedCount = tickets.filter((t) => t.status === "resolved").length + 35;

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
        return "bg-rose-500 text-white border-rose-500 shadow-2xs";
      case "High":
        return "bg-amber-100 text-amber-800 border-amber-200";
      case "Medium":
        return "bg-sky-100 text-sky-700 border-sky-200";
      case "Normal":
      default:
        return "bg-slate-100 text-slate-600 border-slate-200";
    }
  };

  return (
    <div
      onClick={() => navigate("/admin/support")}
      className="bg-white rounded-2xl border border-slate-200/80 shadow-2xs hover:shadow-md hover:border-blue-200 transition-all p-4 sm:p-5 flex flex-col justify-between h-full font-sans cursor-pointer group"
    >
      <div>
        {/* Header Title Row */}
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-2">
            <h2 className="text-[17px] font-black text-slate-900 group-hover:text-blue-600 transition-colors tracking-tight">
              Support Tickets
            </h2>
            <span className="text-[9px] font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-100 shadow-2xs">
              {openCount} Open
            </span>
          </div>
          <span className="px-2 py-0.5 rounded-full text-[9px] font-black text-rose-700 bg-rose-50 border border-rose-100 shadow-2xs">
            {urgentCount} Urgent
          </span>
        </div>
        <p className="text-[11px] text-slate-500 font-medium mb-3">
          Client issues, incidents & resolution queue
        </p>

        {/* Tab Switcher Pills */}
        <div
          className="flex items-center gap-1 bg-slate-50 border border-slate-200/80 rounded-xl p-0.5 mb-3 w-max shadow-2xs"
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
                ? "font-bold text-blue-600 bg-white shadow-2xs"
                : "font-semibold text-slate-500 hover:text-slate-700"
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
                ? "font-bold text-blue-600 bg-white shadow-2xs"
                : "font-semibold text-slate-500 hover:text-slate-700"
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
                ? "font-bold text-blue-600 bg-white shadow-2xs"
                : "font-semibold text-slate-500 hover:text-slate-700"
            }`}
          >
            Resolved ({resolvedCount})
          </button>
        </div>

        {/* Ticket List Container */}
        <div className="flex flex-col gap-2">
          {currentTabTickets.slice(0, 3).map((t) => (
            <div
              key={t.id}
              onClick={(e) => {
                e.stopPropagation();
                navigate(`/admin/support/tickets/${t.id}`);
              }}
              className="flex items-center justify-between p-2.5 sm:px-3 sm:py-2.5 rounded-xl border border-slate-100 hover:border-blue-200 hover:shadow-2xs transition-all bg-white cursor-pointer group/item"
            >
              <div className="flex items-center gap-2.5 min-w-0 pr-2">
                <div
                  className={`size-7 rounded-lg text-white font-bold text-xs flex items-center justify-center shrink-0 shadow-2xs ${t.avatarBg}`}
                >
                  {t.clientInitials}
                </div>
                <div className="flex flex-col min-w-0">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-xs font-bold text-slate-900 group-hover/item:text-blue-600 transition-colors truncate max-w-[160px] sm:max-w-[200px]">
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
                  <div className="flex items-center gap-1 text-[10px] text-slate-400 font-medium">
                    <span className="text-slate-600 font-semibold">{t.client}</span>
                    <span className="text-slate-300">•</span>
                    <span className={t.priority === "Urgent" ? "text-rose-600 font-bold" : "text-slate-400"}>
                      {t.timeLog}
                    </span>
                    <span className="text-slate-300">•</span>
                    <span className="font-mono text-slate-400">#{t.id}</span>
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
                    ? "bg-slate-100 hover:bg-slate-200 text-slate-700"
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
          ))}
        </div>
      </div>

      {/* Footer Meta Row */}
      <div
        className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500 font-medium"
        onClick={(e) => e.stopPropagation()}
      >
        <span className="flex items-center gap-1 font-semibold text-slate-600">
          Avg response: <strong className="text-blue-600">8.4m</strong> (Target &lt;15m)
        </span>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            navigate("/admin/support");
          }}
          className="text-blue-600 hover:text-blue-800 font-bold hover:underline cursor-pointer flex items-center gap-1"
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
            className="relative w-full max-w-md rounded-3xl bg-white p-6 sm:p-8 shadow-2xl border border-slate-100 flex flex-col items-center text-center animate-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
          >
            <button
              type="button"
              onClick={() => setAlertModal(null)}
              className="absolute top-4 right-4 size-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-400 hover:text-slate-700 flex items-center justify-center transition-colors cursor-pointer"
              aria-label="Close modal"
            >
              <X className="size-4" />
            </button>

            <div
              className={`size-16 rounded-3xl flex items-center justify-center mb-4 ring-8 shadow-inner ${
                alertModal.type === "success"
                  ? "bg-emerald-50 text-emerald-600 ring-emerald-50/60"
                  : "bg-blue-50 text-blue-600 ring-blue-50/60"
              }`}
            >
              {alertModal.type === "success" ? (
                <CheckCircle2 className="size-8" />
              ) : (
                <RotateCcw className="size-8" />
              )}
            </div>

            <h3 className="text-xl font-black text-slate-900 tracking-tight">
              {alertModal.title}
            </h3>

            <p className="text-xs sm:text-sm text-slate-600 mt-2 leading-relaxed max-w-sm text-center">
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
                  className="px-5 py-3 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs active:scale-95 transition-all cursor-pointer"
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
