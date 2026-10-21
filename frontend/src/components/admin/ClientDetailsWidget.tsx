import { useNavigate, Link } from "react-router";
import { CheckCircle2, Clock, ArrowUpRight } from "lucide-react";
import { ClientRosterItem } from "@/types/ops";

interface ClientDetailsWidgetProps {
  clients: ClientRosterItem[];
}

export function ClientDetailsWidget({ clients }: ClientDetailsWidgetProps) {
  const navigate = useNavigate();

  const isPaidClient = (client: ClientRosterItem): boolean => {
    return Boolean(
      (client.subscription_status && ["active", "trialing", "paid"].includes(client.subscription_status.toLowerCase())) ||
      (client.plan_name && client.monthly_price && client.monthly_price > 0)
    );
  };

  const paidClients = clients.filter(isPaidClient);
  const unpaidClients = clients.filter((c) => !isPaidClient(c));
  const totalCount = clients.length;

  return (
    <div
      onClick={() => navigate("/admin/clients")}
      className="bg-app-surface rounded-2xl sm:rounded-3xl border border-app-line shadow-xl hover:border-app-accent/60 hover:shadow-[0_0_25px_rgba(127,160,214,0.15)] transition-all duration-300 p-3 sm:p-4 flex flex-col justify-between w-full font-sans cursor-pointer group hover-card-innovative overflow-hidden text-hi"
    >
      {/* Header Row */}
      <div className="flex items-center justify-between mb-2 pb-2 border-b border-app-line/80 shrink-0 gap-2">
        <div className="min-w-0">
          <h2 className="text-sm sm:text-base font-black text-hi group-hover:text-app-accent transition-colors tracking-tight flex items-center gap-1.5 truncate">
            Client Details
            <ArrowUpRight className="w-3.5 h-3.5 text-app-mist group-hover:text-app-accent transition-colors shrink-0" />
          </h2>
          <p className="text-[11px] text-app-mist font-medium truncate">Paid vs unpaid accounts overview</p>
        </div>
        <span className="shrink-0 min-w-max px-2.5 py-0.5 rounded-full text-xs font-extrabold text-app-accent bg-app-accent/15 border border-app-accent/30 hover:bg-app-accent/25 hover:border-app-accent/60 transition-all cursor-pointer">
          {totalCount} Retainers
        </span>
      </div>

      {/* Two Cards Side by Side - Very Low Profile */}
      <div className="grid grid-cols-2 gap-2 sm:gap-3 my-1.5">
        {/* Card 1: Paid Clients */}
        <Link
          to="/admin/clients"
          onClick={(e) => e.stopPropagation()}
          className="bg-app-base hover:bg-app-surface border border-app-line hover:border-emerald-500/60 hover:scale-[1.02] hover:-translate-y-0.5 hover:shadow-[0_0_20px_rgba(16,185,129,0.18)] rounded-xl sm:rounded-2xl p-2.5 sm:p-3.5 flex flex-col justify-between transition-all duration-200 group/box cursor-pointer shadow-md overflow-hidden min-h-[90px]"
        >
          <div className="flex items-center justify-between gap-1 w-full">
            <div className="flex items-center gap-1.5 sm:gap-2 min-w-0 flex-1">
              <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center font-bold group-hover/box:scale-110 transition-transform shrink-0">
                <CheckCircle2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 stroke-[2.5]" />
              </div>
              <h3 className="text-[11px] sm:text-xs font-extrabold text-hi group-hover/box:text-emerald-400 transition-colors truncate">
                Paid Clients
              </h3>
            </div>
            <span className="text-[9px] sm:text-[10px] font-extrabold text-emerald-400 bg-emerald-500/15 px-1.5 sm:px-2 py-0.5 rounded-full border border-emerald-500/30 shrink-0">
              {totalCount > 0 ? Math.round((paidClients.length / totalCount) * 100) : 0}%
            </span>
          </div>

          <div className="my-1 sm:my-1.5 flex items-baseline gap-1.5 sm:gap-2">
            <span className="text-xl sm:text-2xl font-black text-hi tracking-tight leading-none">
              {paidClients.length}
            </span>
            <span className="text-[9.5px] sm:text-[10.5px] font-extrabold text-emerald-400 bg-emerald-500/10 px-1.5 sm:px-2 py-0.5 rounded-md border border-emerald-500/20 truncate">
              Active Retainers
            </span>
          </div>

          <div className="pt-1.5 sm:pt-2 mt-0.5 border-t border-app-line/60 flex items-center justify-between text-[10px] sm:text-[11px] font-bold text-emerald-400 group-hover/box:translate-x-0.5 transition-transform">
            <span>Billing Active</span>
            <span>View →</span>
          </div>
        </Link>

        {/* Card 2: Not Paid Clients */}
        <Link
          to="/admin/clients"
          onClick={(e) => e.stopPropagation()}
          className="bg-app-base hover:bg-app-surface border border-app-line hover:border-amber-500/60 hover:scale-[1.02] hover:-translate-y-0.5 hover:shadow-[0_0_20px_rgba(245,158,11,0.18)] rounded-xl sm:rounded-2xl p-2.5 sm:p-3.5 flex flex-col justify-between transition-all duration-200 group/box cursor-pointer shadow-md overflow-hidden min-h-[90px]"
        >
          <div className="flex items-center justify-between gap-1 w-full">
            <div className="flex items-center gap-1.5 sm:gap-2 min-w-0 flex-1">
              <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center justify-center font-bold group-hover/box:scale-110 transition-transform shrink-0">
                <Clock className="w-3.5 h-3.5 sm:w-4 sm:h-4 stroke-[2.5]" />
              </div>
              <h3 className="text-[11px] sm:text-xs font-extrabold text-hi group-hover/box:text-amber-400 transition-colors truncate">
                Not Paid Clients
              </h3>
            </div>
            <span className="text-[9px] sm:text-[10px] font-extrabold text-amber-400 bg-amber-500/15 px-1.5 sm:px-2 py-0.5 rounded-full border border-amber-500/30 shrink-0">
              {totalCount > 0 ? Math.round((unpaidClients.length / totalCount) * 100) : 0}%
            </span>
          </div>

          <div className="my-1 sm:my-1.5 flex items-baseline gap-1.5 sm:gap-2">
            <span className="text-xl sm:text-2xl font-black text-hi tracking-tight leading-none">
              {unpaidClients.length}
            </span>
            <span className="text-[9.5px] sm:text-[10.5px] font-extrabold text-amber-400 bg-amber-500/10 px-1.5 sm:px-2 py-0.5 rounded-md border border-amber-500/20 truncate">
              Awaiting Checkout
            </span>
          </div>

          <div className="pt-1.5 sm:pt-2 mt-0.5 border-t border-app-line/60 flex items-center justify-between text-[10px] sm:text-[11px] font-bold text-amber-400 group-hover/box:translate-x-0.5 transition-transform">
            <span>Pending Setup</span>
            <span>View →</span>
          </div>
        </Link>
      </div>

      {/* Footer Navigation */}
      <div className="pt-2.5 mt-2 border-t border-app-line shrink-0" onClick={(e) => e.stopPropagation()}>
        <Link
          to="/admin/clients"
          onClick={(e) => e.stopPropagation()}
          className="w-full min-h-[38px] py-2 px-3 bg-app-base hover:bg-app-surface hover:border-app-accent/60 hover:scale-[1.01] hover:text-app-accent text-hi rounded-xl text-xs font-bold border border-app-line transition-all duration-200 shadow-md flex items-center justify-center gap-1.5 cursor-pointer"
        >
          <span>Open Client Roster</span>
          <span>&rarr;</span>
        </Link>
      </div>
    </div>
  );
}
