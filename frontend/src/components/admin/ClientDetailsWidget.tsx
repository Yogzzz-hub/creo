import { useState } from "react";
import { useNavigate } from "react-router";
import { motion, AnimatePresence } from "motion/react";
import {
  Search,
  X,
  ExternalLink,
  FileText,
  Sparkles,
  Shield,
  Layers,
  ChevronRight,
  Mail,
  Instagram,
  AlertTriangle,
  Bell,
  Loader2,
} from "lucide-react";
import { ClientRosterItem } from "@/types/ops";
import { sendClientReminder } from "../../lib/ops-api";

interface ClientDetailsWidgetProps {
  clients: ClientRosterItem[];
}

export function ClientDetailsWidget({ clients }: ClientDetailsWidgetProps) {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [selectedClient, setSelectedClient] = useState<ClientRosterItem | null>(null);
  const [reminderStatus, setReminderStatus] = useState<string | null>(null);
  const [isSendingReminder, setIsSendingReminder] = useState(false);

  const getClientDisplayName = (client: ClientRosterItem): string => {
    if (client.company_name && client.company_name.trim() !== "" && client.company_name.toLowerCase() !== "unknown") {
      return client.company_name;
    }
    if (client.email) {
      const parts = client.email.split("@");
      const part = (parts[0] || "").replace(/[._0-9]/g, " ").trim();
      if (part) {
        return part.charAt(0).toUpperCase() + part.slice(1);
      }
    }
    return "Client Account";
  };

  const filteredClients = clients.filter((c) => {
    const displayName = getClientDisplayName(c);
    return (
      displayName.toLowerCase().includes(search.toLowerCase()) ||
      c.email.toLowerCase().includes(search.toLowerCase()) ||
      (c.plan_display_name || c.plan_name || "").toLowerCase().includes(search.toLowerCase())
    );
  });

  const getTierColor = (tier: string) => {
    const t = tier.toLowerCase();
    if (t.includes("enterprise") || t.includes("domination") || t.includes("pro")) {
      return "bg-[#7FA0D6]/15 text-[#7FA0D6] border-[#7FA0D6]/30";
    }
    if (t.includes("growth") || t.includes("accelerator")) {
      return "bg-[#BCCCE6]/15 text-[#BCCCE6] border-[#BCCCE6]/30";
    }
    if (t.includes("starter")) {
      return "bg-emerald-500/15 text-emerald-400 border-emerald-500/30";
    }
    return "bg-[#161F2D] text-[#F1F5F9] border-[#2A3446]";
  };

  const getMonthlyPrice = (tier: string) => {
    const t = tier.toLowerCase();
    if (t.includes("starter")) return 25000;
    if (t.includes("growth") || t.includes("accelerator")) return 50000;
    if (t.includes("scale") || t.includes("enterprise") || t.includes("domination") || t.includes("pro")) return 100000;
    return 45000;
  };

  const getInitials = (name: string) => (name ? name.charAt(0).toUpperCase() : "?");

  const getPodInfo = (name: string) => {
    const podLetters = ["A", "B", "C", "D", "E"];
    const podIdx = Math.abs(name.charCodeAt(0) || 0) % podLetters.length;
    const podLetter = podLetters[podIdx];
    const podLeads = ["Lead Producer A", "Lead Producer B", "Lead Producer C", "Lead Producer D", "Lead Producer E"];
    const podAvatars = ["bg-[#7FA0D6]", "bg-indigo-600", "bg-emerald-600", "bg-sky-600", "bg-blue-600"];
    return {
      letter: podLetter,
      name: `Pod ${podLetter}`,
      lead: podLeads[podIdx] || "Creative Lead",
      avatarColor: podAvatars[podIdx] || "bg-[#7FA0D6]",
    };
  };

  return (
    <>
      <div
        className="bg-[#161F2D] rounded-2xl p-4 sm:p-5 flex flex-col w-full font-sans border border-[#2A3446] shadow-sm hover:border-[#7FA0D6]/40 transition-all cursor-default"
      >
        {/* Header Section */}
        <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-3 mb-3.5">
          <div className="flex flex-col gap-0.5 cursor-pointer" onClick={() => navigate("/admin/clients")}>
            <div className="flex items-center gap-2">
              <h2 className="text-[17px] font-black text-white hover:text-[#7FA0D6] transition-colors tracking-tight">
                Client Details
              </h2>
              <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-[#7FA0D6]/15 text-[#7FA0D6] border border-[#7FA0D6]/30">
                Click client to view full details
              </span>
            </div>
            <p className="text-[11px] text-[#97A0B3] font-medium">Overview, contract status & creative pod allocation</p>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center gap-2.5">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#97A0B3]" />
              <input
                type="text"
                placeholder="Search clients, pods, or deliverables..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-8 pr-3 py-1.5 w-full sm:w-[240px] rounded-xl border border-[#2A3446] bg-[#0B111C] text-white text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all placeholder:text-[#97A0B3] shadow-2xs"
              />
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1.5 text-[10px] font-bold text-[#7FA0D6] bg-[#7FA0D6]/15 w-fit px-2.5 py-1 rounded-full mb-3 border border-[#7FA0D6]/30 shadow-2xs">
          <span className="w-1.5 h-1.5 rounded-full bg-[#7FA0D6]" />
          <span>{filteredClients.length} Active Retainers</span>
        </div>

        {/* List Header (Wide Desktop Only) */}
        <div className="hidden xl:grid grid-cols-12 gap-3 px-4 py-1.5 text-[9px] font-black uppercase tracking-wider text-[#97A0B3] mb-1">
          <div className="col-span-4">Client & Tier</div>
          <div className="col-span-3">Status</div>
          <div className="col-span-3">Pod Assigned</div>
          <div className="col-span-2 text-right">Deliverables & Action</div>
        </div>

        {/* List Content - Fixed Container Size with Internal Scroll */}
        <div className="flex flex-col space-y-2 sm:space-y-1.5 max-h-[440px] sm:max-h-[500px] overflow-y-auto overscroll-contain pr-1 sm:pr-1.5 scrollbar-thin scrollbar-thumb-[#2A3446] hover:scrollbar-thumb-[#7FA0D6]/40 scrollbar-track-transparent">
          {filteredClients.map((client, i) => {
            const isPaid = Boolean(
              (client.subscription_status && ["active", "trialing", "paid"].includes(client.subscription_status.toLowerCase())) ||
              (client.plan_name && client.monthly_price && client.monthly_price > 0)
            );
            const isOnboarded = Boolean(
              client.onboarding_completed_at ||
              (typeof client.onboarding_stage === "number" && client.onboarding_stage >= 4)
            );
            const lifecycleStatus = !isOnboarded ? (!isPaid ? "not_paid_not_onboarded" : "paid_not_onboarded") : "onboarded";
            const tier = isPaid ? (client.plan_display_name || client.plan_name || "Custom") : "Unpaid";
            const deliverables_total = isOnboarded ? client.quota_usage.reduce((sum, q) => sum + q.quota, 0) : 0;
            const deliverables_completed = isOnboarded ? client.quota_usage.reduce((sum, q) => sum + q.used, 0) : 0;
            const company_name = getClientDisplayName(client);
            const initials = getInitials(company_name);
            const pod = getPodInfo(company_name);

            return (
              <motion.div
                key={client.client_id}
                initial={{ y: 6, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: i * 0.03, duration: 0.2 }}
                onClick={() => setSelectedClient(client)}
                className="bg-[#0B111C]/80 hover:bg-[#0B111C] rounded-2xl sm:rounded-xl border border-[#2A3446] hover:border-[#7FA0D6] hover:shadow-md transition-all group cursor-pointer"
              >
                {/* ── Wide Desktop Grid Row (xl and up) ── */}
                <div className="hidden xl:grid grid-cols-12 gap-3 items-center px-4 py-2.5">
                  {/* Client & Tier */}
                  <div className="col-span-4 flex items-center space-x-2.5 min-w-0">
                    <div className={`flex-shrink-0 w-8 h-8 rounded-lg ${isOnboarded ? pod.avatarColor : "bg-[#161F2D] text-[#97A0B3] border border-[#2A3446]"} text-white flex items-center justify-center font-bold text-xs shadow-2xs`}>
                      {initials}
                    </div>
                    <div className="flex flex-col min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-xs font-bold text-white truncate tracking-tight group-hover:text-[#7FA0D6] transition-colors">
                          {company_name}
                        </span>
                        <span className={`text-[8px] font-black tracking-wider px-1.5 py-0.2 rounded-md border ${getTierColor(tier)} shrink-0`}>
                          {tier}
                        </span>
                      </div>
                      <span className="text-[10px] text-[#97A0B3] font-medium truncate">{client.email}</span>
                    </div>
                  </div>

                  {/* Status */}
                  <div className="col-span-3 min-w-0 flex items-center">
                    {lifecycleStatus === "not_paid_not_onboarded" ? (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[9px] font-bold text-amber-400 bg-amber-500/15 border border-amber-500/30 truncate max-w-full" title="user not paid and not onboarded yet">
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0" />
                        <span className="truncate">Unpaid · Not Onboarded</span>
                      </span>
                    ) : lifecycleStatus === "paid_not_onboarded" ? (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[9px] font-bold text-sky-400 bg-sky-500/15 border border-sky-500/30 truncate max-w-full" title="user paid but not onboarded">
                        <span className="w-1.5 h-1.5 rounded-full bg-sky-400 animate-pulse shrink-0" />
                        <span className="truncate">Paid · Awaiting Setup</span>
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[9px] font-bold text-emerald-400 bg-emerald-500/15 border border-emerald-500/30 truncate max-w-full capitalize">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0" />
                        <span className="truncate">{client.subscription_status || client.account_status || "active"}</span>
                      </span>
                    )}
                  </div>

                  {/* Pod Assigned */}
                  <div className="col-span-3 flex items-center space-x-2 min-w-0">
                    {isOnboarded ? (
                      <>
                        <div className="flex-shrink-0 w-6 h-6 rounded-md bg-blue-600 text-white flex items-center justify-center font-bold text-[10px]">
                          {pod.letter}
                        </div>
                        <div className="flex flex-col min-w-0">
                          <span className="text-[11px] font-bold text-white tracking-tight truncate">{pod.name}</span>
                          <span className="text-[9px] text-[#97A0B3] font-medium truncate">{pod.lead}</span>
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="flex-shrink-0 w-6 h-6 rounded-md bg-[#161F2D] text-[#97A0B3] border border-[#2A3446] flex items-center justify-center font-bold text-[10px]">
                          —
                        </div>
                        <div className="flex flex-col min-w-0">
                          <span className="text-[11px] font-bold text-[#97A0B3] tracking-tight truncate">
                            {isPaid ? "Awaiting Onboarding" : "Not Assigned"}
                          </span>
                          <span className="text-[9px] text-[#97A0B3]/70 font-medium truncate">
                            {isPaid ? "Intake pending" : "Unpaid client"}
                          </span>
                        </div>
                      </>
                    )}
                  </div>

                  {/* Deliverables & Quick View */}
                  <div className="col-span-2 text-right flex items-center justify-end space-x-2 min-w-0">
                    <span className="text-[11px] font-bold text-[#F1F5F9] tracking-tight truncate">
                      {isOnboarded ? `${deliverables_completed}/${deliverables_total} Posts` : "Pending"}
                    </span>
                    {isOnboarded && (
                      <div className="relative w-4 h-4 flex items-center justify-center shrink-0">
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
                            strokeDashoffset={
                              deliverables_total > 0 ? 100 - (deliverables_completed / deliverables_total) * 100 : 100
                            }
                            strokeLinecap="round"
                          />
                        </svg>
                      </div>
                    )}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedClient(client);
                      }}
                      className="px-2 py-1 rounded-lg bg-[#161F2D] group-hover:bg-[#7FA0D6] text-[#97A0B3] group-hover:text-[#0B111C] text-[10px] font-bold border border-[#2A3446] group-hover:border-transparent transition-all flex items-center gap-0.5 shrink-0"
                    >
                      <span>Details</span>
                      <ChevronRight className="w-3 h-3" />
                    </button>
                  </div>
                </div>

                {/* ── Compact & Rotation Card Layout (< xl) ── */}
                <div className="xl:hidden p-3.5 space-y-3">
                  {/* Top row: Client + Tier + Status */}
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className={`size-8 rounded-lg ${isOnboarded ? pod.avatarColor : "bg-[#161F2D] text-[#97A0B3] border border-[#2A3446]"} text-white flex items-center justify-center font-bold text-xs shrink-0 shadow-xs`}>
                        {initials}
                      </div>
                      <div className="min-w-0">
                        <h4 className="text-xs font-bold text-white group-hover:text-[#7FA0D6] transition-colors truncate">
                          {company_name}
                        </h4>
                        <p className="text-[10px] text-[#97A0B3] truncate">{client.email}</p>
                      </div>
                    </div>
                    {lifecycleStatus === "not_paid_not_onboarded" ? (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[9px] font-bold text-amber-400 bg-amber-500/15 border border-amber-500/30 shrink-0" title="user not paid and not onboarded yet">
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0" />
                        <span>Unpaid · Not Onboarded</span>
                      </span>
                    ) : lifecycleStatus === "paid_not_onboarded" ? (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[9px] font-bold text-sky-400 bg-sky-500/15 border border-sky-500/30 shrink-0" title="user paid but not onboarded">
                        <span className="w-1.5 h-1.5 rounded-full bg-sky-400 animate-pulse shrink-0" />
                        <span>Paid · Awaiting Setup</span>
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[9px] font-bold text-emerald-400 bg-emerald-500/15 border border-emerald-500/30 shrink-0 capitalize">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0" />
                        <span>{client.subscription_status || client.account_status || "active"}</span>
                      </span>
                    )}
                  </div>

                  {/* Middle row: Tier + Pod info */}
                  <div className="flex items-center justify-between text-[11px] pt-2 border-t border-[#2A3446]/60">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <span className={`text-[9px] font-black tracking-wider px-1.5 py-0.5 rounded-md border ${getTierColor(tier)} shrink-0`}>
                        {tier}
                      </span>
                      <span className="text-[10px] font-bold text-[#97A0B3] truncate">
                        · {isOnboarded ? pod.name : isPaid ? "Awaiting Onboarding" : "Not Assigned"}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-[10px] font-bold text-[#F1F5F9]">
                        {isOnboarded ? `${deliverables_completed}/${deliverables_total} Posts` : "Pending"}
                      </span>
                      <ChevronRight className="w-3.5 h-3.5 text-[#7FA0D6]" />
                    </div>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>

        {filteredClients.length === 0 && (
          <div className="py-8 text-center text-xs text-[#97A0B3] font-medium">
            No clients found matching your search.
          </div>
        )}

        <div className="mt-4 pt-3 border-t border-[#2A3446] flex items-center justify-between text-[11px] text-[#97A0B3] font-medium">
          <span>Click any client to inspect deliverables, SLA scope & assigned creative pod.</span>
          <button
            type="button"
            onClick={() => navigate("/admin/clients")}
            className="text-[#7FA0D6] font-bold hover:underline cursor-pointer flex items-center gap-1"
          >
            <span>Open Client Roster</span>
            <ExternalLink className="w-3 h-3" />
          </button>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════════════
          INTERACTIVE CLIENT DETAILS SLIDE-OVER DRAWER / MODAL
      ═══════════════════════════════════════════════════════════════════ */}
      <AnimatePresence>
        {selectedClient && (() => {
          const client = selectedClient;
          const isPaid = Boolean(
            (client.subscription_status && ["active", "trialing", "paid"].includes(client.subscription_status.toLowerCase())) ||
            (client.plan_name && client.monthly_price && client.monthly_price > 0)
          );
          const isOnboarded = Boolean(
            client.onboarding_completed_at ||
            (typeof client.onboarding_stage === "number" && client.onboarding_stage >= 4)
          );
          const lifecycleStatus: "not_paid_not_onboarded" | "paid_not_onboarded" | "onboarded" = 
            !isOnboarded ? (!isPaid ? "not_paid_not_onboarded" : "paid_not_onboarded") : "onboarded";

          const company_name = getClientDisplayName(client);
          const initials = getInitials(company_name);
          const tier = isPaid ? (client.plan_display_name || client.plan_name || "Enterprise Retainer") : "No Active Plan";
          const pod = getPodInfo(company_name);
          const price = isPaid ? (client.monthly_price || getMonthlyPrice(tier)) : 0;
          const normalizeKind = (k?: string) => (k || "").toLowerCase().trim();
          const isPosts = (k?: string) => ["static_post", "post", "posts", "poster", "posters"].includes(normalizeKind(k));
          const isReels = (k?: string) => ["reel", "reels", "video"].includes(normalizeKind(k));
          const isStories = (k?: string) => ["carousel", "story", "stories"].includes(normalizeKind(k));

          const postsItem = client.quota_usage.find((q) => isPosts(q.kind)) || { quota: 0, used: 0 };
          const reelsItem = client.quota_usage.find((q) => isReels(q.kind)) || { quota: 0, used: 0 };
          const storiesItem = client.quota_usage.find((q) => isStories(q.kind)) || { quota: 0, used: 0 };
          const deliverables_total = isOnboarded ? client.quota_usage.reduce((sum, q) => sum + (q.quota || 0), 0) : 0;
          const deliverables_completed = isOnboarded ? client.quota_usage.reduce((sum, q) => sum + (q.used || 0), 0) : 0;

          return (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/80 backdrop-blur-xs animate-fade-in">
              <motion.div
                initial={{ opacity: 0, scale: 0.96, y: 15 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.96, y: 15 }}
                transition={{ duration: 0.25 }}
                className="bg-[#161F2D] border border-[#2A3446] rounded-3xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden font-sans"
              >
                {/* Modal Top Header */}
                <div className="p-5 sm:p-6 border-b border-[#2A3446] flex items-start justify-between gap-4 bg-[#0B111C]/60">
                  <div className="flex items-center gap-3.5 min-w-0">
                    <div className={`w-12 h-12 rounded-2xl ${isOnboarded ? pod.avatarColor : "bg-[#161F2D] text-[#97A0B3] border border-[#2A3446]"} text-white font-black text-xl flex items-center justify-center shadow-lg shrink-0`}>
                      {initials}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h2 className="text-lg sm:text-xl font-black text-white tracking-tight truncate">
                          {company_name}
                        </h2>
                        <span className={`text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md border ${getTierColor(tier)}`}>
                          {tier}
                        </span>
                        {lifecycleStatus === "not_paid_not_onboarded" ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[9px] font-extrabold text-amber-400 bg-amber-500/15 border border-amber-500/30">
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                            user not paid and not onboarded yet
                          </span>
                        ) : lifecycleStatus === "paid_not_onboarded" ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[9px] font-extrabold text-sky-400 bg-sky-500/15 border border-sky-500/30">
                            <span className="w-1.5 h-1.5 rounded-full bg-sky-400 animate-pulse" />
                            user paid but not onboarded
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-extrabold text-emerald-400 bg-emerald-500/15 border border-emerald-500/30">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                            {client.subscription_status || client.account_status || "Active"}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-3 text-xs text-[#97A0B3] mt-1 font-medium">
                        <span className="flex items-center gap-1 truncate">
                          <Mail className="w-3 h-3 text-[#7FA0D6]" /> {client.email}
                        </span>
                        {client.instagram_username && (
                          <span className="flex items-center gap-1 text-pink-400 truncate">
                            <Instagram className="w-3 h-3" /> @{client.instagram_username}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => setSelectedClient(null)}
                    className="p-2 rounded-xl bg-[#0B111C] hover:bg-[#2A3446] text-[#97A0B3] hover:text-white transition-colors cursor-pointer border border-[#2A3446]"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {/* Modal Body */}
                <div className="p-5 sm:p-6 overflow-y-auto space-y-5 flex-1 custom-scrollbar">
                  {/* Status Banner in Modal */}
                  {lifecycleStatus === "not_paid_not_onboarded" && (
                    <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs font-semibold flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
                        <div>
                          <span className="font-bold uppercase tracking-wider block text-amber-400 text-[11px]">user not paid and not onboarded yet</span>
                          <span className="text-[11px] text-[#F1F5F9]">This client has logged in but has not paid for a plan and has not completed onboarding.</span>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={async () => {
                          try {
                            setIsSendingReminder(true);
                            const res = await sendClientReminder({
                              client_id: client.client_id,
                              client_name: company_name,
                              reminder_type: "payment",
                            });
                            setReminderStatus(res.message || "Payment reminder sent to client!");
                          } catch (err: any) {
                            setReminderStatus(err?.message || "Failed to send reminder.");
                          } finally {
                            setIsSendingReminder(false);
                            setTimeout(() => setReminderStatus(null), 4000);
                          }
                        }}
                        disabled={isSendingReminder}
                        className="px-2.5 py-1.5 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 font-bold text-xs inline-flex items-center gap-1.5 cursor-pointer whitespace-nowrap shrink-0 self-start sm:self-center disabled:opacity-60"
                        title="Send payment reminder notification to client"
                      >
                        {isSendingReminder ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Bell className="w-3.5 h-3.5" />}
                        <span>Send Payment Reminder</span>
                      </button>
                    </div>
                  )}

                  {lifecycleStatus === "paid_not_onboarded" && (
                    <div className="p-3.5 rounded-2xl bg-sky-500/10 border border-sky-500/30 text-sky-300 text-xs font-semibold flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <Sparkles className="w-4 h-4 text-sky-400 shrink-0" />
                        <div>
                          <span className="font-bold uppercase tracking-wider block text-sky-400 text-[11px]">user paid but not onboarded</span>
                          <span className="text-[11px] text-[#F1F5F9]">Client payment is active. Awaiting completion of the onboarding questionnaire.</span>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={async () => {
                          try {
                            setIsSendingReminder(true);
                            const res = await sendClientReminder({
                              client_id: client.client_id,
                              client_name: company_name,
                              reminder_type: "onboarding",
                            });
                            setReminderStatus(res.message || "Onboarding reminder sent to client!");
                          } catch (err: any) {
                            setReminderStatus(err?.message || "Failed to send reminder.");
                          } finally {
                            setIsSendingReminder(false);
                            setTimeout(() => setReminderStatus(null), 4000);
                          }
                        }}
                        disabled={isSendingReminder}
                        className="px-2.5 py-1.5 rounded-xl bg-sky-500/20 hover:bg-sky-500/30 text-sky-300 border border-sky-500/40 font-bold text-xs inline-flex items-center gap-1.5 cursor-pointer whitespace-nowrap shrink-0 self-start sm:self-center disabled:opacity-60"
                        title="Send onboarding reminder notification to client"
                      >
                        {isSendingReminder ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Bell className="w-3.5 h-3.5" />}
                        <span>Send Onboarding Reminder</span>
                      </button>
                    </div>
                  )}

                  {reminderStatus && (
                    <div className="p-2.5 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs font-bold flex items-center gap-2 animate-fade-in">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                      <span>{reminderStatus}</span>
                    </div>
                  )}

                  {/* Grid 1: Retainer & Pod Assignment */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                    {/* Retainer Card */}
                    <div className="p-4 rounded-2xl bg-[#0B111C] border border-[#2A3446] space-y-2">
                      <div className="flex items-center justify-between text-[10px] font-extrabold uppercase text-[#97A0B3] tracking-wider">
                        <span>Retainer Agreement</span>
                        <Shield className="w-3.5 h-3.5 text-[#7FA0D6]" />
                      </div>
                      <div className="flex items-baseline gap-1.5">
                        <span className="text-2xl font-black text-white">₹{price.toLocaleString()}</span>
                        <span className="text-xs text-[#97A0B3] font-bold">
                          {isPaid ? "/month" : "/month (Unpaid)"}
                        </span>
                      </div>
                      <div className="pt-2 border-t border-[#2A3446]/60 flex items-center justify-between text-xs text-[#97A0B3]">
                        <span>{isPaid ? "Billing: Active Cycle" : "Unpaid Account"}</span>
                        <span className={isPaid ? "text-emerald-400 font-bold" : "text-[#97A0B3] font-bold"}>
                          {isPaid ? "Priority SLA" : "Plan Not Active"}
                        </span>
                      </div>
                    </div>

                    {/* Creative Pod Card */}
                    <div className="p-4 rounded-2xl bg-[#0B111C] border border-[#2A3446] space-y-2">
                      <div className="flex items-center justify-between text-[10px] font-extrabold uppercase text-[#97A0B3] tracking-wider">
                        <span>Assigned Pod</span>
                        <Sparkles className="w-3.5 h-3.5 text-blue-400" />
                      </div>
                      {isOnboarded ? (
                        <>
                          <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-xl bg-blue-600 text-white font-black text-xs flex items-center justify-center shrink-0">
                              {pod.letter}
                            </div>
                            <div>
                              <p className="text-sm font-bold text-white tracking-tight">{pod.name}</p>
                              <p className="text-[11px] text-[#97A0B3] font-medium">{pod.lead} (Lead)</p>
                            </div>
                          </div>
                          <div className="pt-2 border-t border-[#2A3446]/60 flex items-center justify-between text-xs text-[#97A0B3]">
                            <span>Daily Sync: 11:00 AM IST</span>
                            <span className="text-[#7FA0D6] font-bold">3 Specialists</span>
                          </div>
                        </>
                      ) : (
                        <>
                          <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-xl bg-[#161F2D] text-[#97A0B3] border border-[#2A3446] font-black text-xs flex items-center justify-center shrink-0">
                              —
                            </div>
                            <div>
                              <p className="text-sm font-bold text-white tracking-tight">
                                {isPaid ? "Awaiting Onboarding Form" : "Not Assigned"}
                              </p>
                              <p className="text-[11px] text-[#97A0B3] font-medium">
                                {isPaid ? "Allocation in progress" : "No Pod Assigned"}
                              </p>
                            </div>
                          </div>
                          <div className="pt-2 border-t border-[#2A3446]/60 flex items-center justify-between text-xs text-[#97A0B3]">
                            <span>{isPaid ? "Pending intake questionnaire" : "Pending plan purchase"}</span>
                            <span className="text-[#97A0B3] font-bold">0 Specialists</span>
                          </div>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Section 2: Quota & Deliverables Progress */}
                  <div className="p-4 sm:p-5 rounded-2xl bg-[#0B111C] border border-[#2A3446] space-y-3.5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Layers className="w-4 h-4 text-[#7FA0D6]" />
                        <h4 className="text-xs font-black uppercase text-white tracking-wider">
                          Deliverable Quotas & Monthly Burn
                        </h4>
                      </div>
                      <span className="text-xs font-bold text-[#7FA0D6]">
                        {isOnboarded
                          ? `${deliverables_completed} of ${deliverables_total} Delivered • ${Math.max(0, deliverables_total - deliverables_completed)} Remaining (${deliverables_total > 0 ? Math.round((deliverables_completed / deliverables_total) * 100) : 0}%)`
                          : "0 of 0 Posts (Onboarding Pending)"}
                      </span>
                    </div>

                    {/* Overall Progress Bar */}
                    <div className="w-full bg-[#161F2D] rounded-full h-2.5 overflow-hidden border border-[#2A3446]">
                      <div
                        className="bg-[#7FA0D6] h-full rounded-full transition-all duration-500"
                        style={{ width: `${isOnboarded && deliverables_total > 0 ? Math.min((deliverables_completed / deliverables_total) * 100, 100) : 0}%` }}
                      />
                    </div>

                    {/* 3 Metric Pills */}
                    <div className="grid grid-cols-3 gap-2.5 pt-1">
                      <div className="p-3 rounded-xl bg-[#161F2D] border border-[#2A3446] text-center">
                        <span className="text-base font-black text-white block">
                          {isOnboarded ? `${postsItem.used}/${postsItem.quota}` : "0/0"}
                        </span>
                        <span className="text-[9px] font-extrabold text-[#97A0B3] uppercase tracking-wider block">
                          Static Posts
                        </span>
                        {isOnboarded && (
                          <span className="text-[9px] font-bold text-emerald-400 block mt-0.5">
                            {Math.max(0, postsItem.quota - postsItem.used)} remaining
                          </span>
                        )}
                      </div>
                      <div className="p-3 rounded-xl bg-[#161F2D] border border-[#2A3446] text-center">
                        <span className="text-base font-black text-white block">
                          {isOnboarded ? `${reelsItem.used}/${reelsItem.quota}` : "0/0"}
                        </span>
                        <span className="text-[9px] font-extrabold text-[#97A0B3] uppercase tracking-wider block">
                          9:16 Reels
                        </span>
                        {isOnboarded && (
                          <span className="text-[9px] font-bold text-emerald-400 block mt-0.5">
                            {Math.max(0, reelsItem.quota - reelsItem.used)} remaining
                          </span>
                        )}
                      </div>
                      <div className="p-3 rounded-xl bg-[#161F2D] border border-[#2A3446] text-center">
                        <span className="text-base font-black text-white block">
                          {isOnboarded ? `${storiesItem.used}/${storiesItem.quota}` : "0/0"}
                        </span>
                        <span className="text-[9px] font-extrabold text-[#97A0B3] uppercase tracking-wider block">
                          Stories
                        </span>
                        {isOnboarded && (
                          <span className="text-[9px] font-bold text-emerald-400 block mt-0.5">
                            {Math.max(0, storiesItem.quota - storiesItem.used)} remaining
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Section 3: Current Active Deliverables Queue */}
                  <div className="p-4 sm:p-5 rounded-2xl bg-[#0B111C] border border-[#2A3446] space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <FileText className="w-4 h-4 text-[#7FA0D6]" />
                        <h4 className="text-xs font-black uppercase text-white tracking-wider">
                          Active Sprint Deliverables
                        </h4>
                      </div>
                      <span className="text-[10px] font-bold text-[#97A0B3]">Sprint 44</span>
                    </div>

                    <div className="space-y-2">
                      <div className="p-3 rounded-xl bg-[#161F2D] border border-[#2A3446] flex items-center justify-between gap-3">
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-white truncate">{company_name} Q4 Cinematic Reel Cut</p>
                          <p className="text-[10px] text-[#97A0B3] truncate">9:16 Vertical Video · Due Tomorrow 4:00 PM</p>
                        </div>
                        <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-amber-500/15 text-amber-400 border border-amber-500/30 shrink-0">
                          In Review
                        </span>
                      </div>

                      <div className="p-3 rounded-xl bg-[#161F2D] border border-[#2A3446] flex items-center justify-between gap-3">
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-white truncate">3× Multi-Slide Carousel Deck</p>
                          <p className="text-[10px] text-[#97A0B3] truncate">4:5 Carousel Infographics · Assigned to {pod.lead}</p>
                        </div>
                        <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-[#7FA0D6]/15 text-[#7FA0D6] border border-[#7FA0D6]/30 shrink-0">
                          In Production
                        </span>
                      </div>

                      <div className="p-3 rounded-xl bg-[#161F2D] border border-[#2A3446] flex items-center justify-between gap-3">
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-white truncate">Brand Campaign Static Hero Visual</p>
                          <p className="text-[10px] text-[#97A0B3] truncate">1:1 Square Static · Scheduled for Instagram Dispatch</p>
                        </div>
                        <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 shrink-0">
                          Approved
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Modal Footer Actions */}
                <div className="p-4 sm:p-5 border-t border-[#2A3446] bg-[#0B111C]/80 flex flex-col sm:flex-row items-center justify-between gap-3">
                  <span className="text-xs text-[#97A0B3] font-medium hidden sm:inline">
                    Client ID: <span className="font-mono text-white text-[11px]">{client.client_id}</span>
                  </span>
                  <div className="flex items-center gap-2.5 w-full sm:w-auto">
                    <button
                      type="button"
                      onClick={() => setSelectedClient(null)}
                      className="flex-1 sm:flex-none px-4 py-2.5 rounded-xl border border-[#2A3446] bg-[#161F2D] hover:bg-[#2A3446] text-xs font-bold text-white transition-all cursor-pointer"
                    >
                      Close
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedClient(null);
                        navigate(`/admin/clients/${client.client_id}`);
                      }}
                      className="flex-1 sm:flex-none px-4 py-2.5 rounded-xl bg-[#7FA0D6] hover:bg-blue-600 text-xs font-bold text-white transition-all shadow-md shadow-blue-500/20 flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <span>Open Full Client Page</span>
                      <ExternalLink className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </motion.div>
            </div>
          );
        })()}
      </AnimatePresence>
    </>
  );
}
