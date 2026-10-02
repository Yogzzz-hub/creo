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
} from "lucide-react";
import { ClientRosterItem } from "@/types/ops";

interface ClientDetailsWidgetProps {
  clients: ClientRosterItem[];
}

export function ClientDetailsWidget({ clients }: ClientDetailsWidgetProps) {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [selectedClient, setSelectedClient] = useState<ClientRosterItem | null>(null);

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
      return "bg-nebula-glow/15 text-nebula-glow border-nebula-glow/30";
    }
    if (t.includes("growth") || t.includes("accelerator")) {
      return "bg-nebula-periwinkle/15 text-nebula-periwinkle border-nebula-periwinkle/30";
    }
    if (t.includes("starter")) {
      return "bg-emerald-500/15 text-emerald-400 border-emerald-500/30";
    }
    return "bg-nebula-surface text-slate-100 border-nebula-steel";
  };

  const getMonthlyPrice = (tier: string) => {
    const t = tier.toLowerCase();
    if (t.includes("starter")) return 25000;
    if (t.includes("growth") || t.includes("accelerator")) return 50000;
    if (t.includes("enterprise") || t.includes("domination") || t.includes("pro")) return 95000;
    return 45000;
  };

  const getInitials = (name: string) => (name ? name.charAt(0).toUpperCase() : "?");

  const getPodInfo = (name: string) => {
    const podLetters = ["A", "B", "C", "D", "E"];
    const podIdx = Math.abs(name.charCodeAt(0) || 0) % podLetters.length;
    const podLetter = podLetters[podIdx];
    const podLeads = ["Lead Producer A", "Lead Producer B", "Lead Producer C", "Lead Producer D", "Lead Producer E"];
    const podAvatars = ["bg-nebula-glow", "bg-indigo-600", "bg-emerald-600", "bg-sky-600", "bg-blue-600"];
    return {
      letter: podLetter,
      name: `Pod ${podLetter}`,
      lead: podLeads[podIdx] || "Creative Lead",
      avatarColor: podAvatars[podIdx] || "bg-nebula-glow",
    };
  };

  return (
    <>
      <div
        className="bg-nebula-surface rounded-2xl p-4 sm:p-5 flex flex-col w-full font-sans border border-nebula-steel shadow-sm hover:border-nebula-glow/40 transition-all cursor-default"
      >
        {/* Header Section */}
        <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-3 mb-3.5">
          <div className="flex flex-col gap-0.5 cursor-pointer" onClick={() => navigate("/admin/clients")}>
            <div className="flex items-center gap-2">
              <h2 className="text-[17px] font-black text-white hover:text-nebula-glow transition-colors tracking-tight">
                Client Details
              </h2>
              <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-nebula-glow/15 text-nebula-glow border border-nebula-glow/30">
                Click client to view full details
              </span>
            </div>
            <p className="text-[11px] text-nebula-mist font-medium">Overview, contract status & creative pod allocation</p>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center gap-2.5">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-nebula-mist" />
              <input
                type="text"
                placeholder="Search clients, pods, or deliverables..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-8 pr-3 py-1.5 w-full sm:w-[240px] rounded-xl border border-nebula-steel bg-nebula-navy text-white text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all placeholder:text-nebula-mist shadow-2xs"
              />
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1.5 text-[10px] font-bold text-nebula-glow bg-nebula-glow/15 w-fit px-2.5 py-1 rounded-full mb-3 border border-nebula-glow/30 shadow-2xs">
          <span className="w-1.5 h-1.5 rounded-full bg-nebula-glow" />
          <span>{filteredClients.length} Active Retainers</span>
        </div>

        {/* List Header */}
        <div className="grid grid-cols-12 gap-3 px-4 py-1.5 text-[9px] font-black uppercase tracking-wider text-nebula-mist mb-1">
          <div className="col-span-4">Client & Tier</div>
          <div className="col-span-2">Status</div>
          <div className="col-span-3">Pod Assigned</div>
          <div className="col-span-3 text-right">Deliverables & Action</div>
        </div>

        {/* List Content */}
        <div className="flex flex-col space-y-1.5">
          {filteredClients.map((client, i) => {
            const tier = client.plan_display_name || client.plan_name || "Custom";
            const deliverables_total = client.quota_usage.reduce((sum, q) => sum + q.quota, 0);
            const deliverables_completed = client.quota_usage.reduce((sum, q) => sum + q.used, 0);
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
                className="grid grid-cols-12 gap-3 items-center px-4 py-2.5 bg-nebula-navy/80 hover:bg-nebula-navy rounded-xl border border-nebula-steel hover:border-nebula-glow hover:shadow-md transition-all group cursor-pointer"
              >
                {/* Client & Tier */}
                <div className="col-span-4 flex items-center space-x-2.5 min-w-0">
                  <div className={`flex-shrink-0 w-8 h-8 rounded-lg ${pod.avatarColor} text-white flex items-center justify-center font-bold text-xs shadow-2xs`}>
                    {initials}
                  </div>
                  <div className="flex flex-col min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-xs font-bold text-white truncate tracking-tight group-hover:text-nebula-glow transition-colors">
                        {company_name}
                      </span>
                      <span className={`text-[8px] font-black tracking-wider px-1.5 py-0.2 rounded-md border ${getTierColor(tier)}`}>
                        {tier}
                      </span>
                    </div>
                    <span className="text-[10px] text-nebula-mist font-medium truncate">{client.email}</span>
                  </div>
                </div>

                {/* Status */}
                <div className="col-span-2">
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-black text-nebula-glow bg-nebula-surface border border-nebula-steel">
                    <span className="w-1 h-1 rounded-full bg-nebula-glow" />
                    {client.subscription_status || client.account_status || "active"}
                  </span>
                </div>

                {/* Pod Assigned */}
                <div className="col-span-3 flex items-center space-x-2">
                  <div className="flex-shrink-0 w-6 h-6 rounded-md bg-blue-600 text-white flex items-center justify-center font-bold text-[10px]">
                    {pod.letter}
                  </div>
                  <div className="flex flex-col">
                    <span className="text-[11px] font-bold text-white tracking-tight">{pod.name}</span>
                    <span className="text-[9px] text-nebula-mist font-medium">{pod.lead}</span>
                  </div>
                </div>

                {/* Deliverables & Quick View */}
                <div className="col-span-3 text-right flex items-center justify-end space-x-2.5">
                  <span className="text-[11px] font-bold text-slate-100 tracking-tight">
                    {deliverables_completed}/{deliverables_total} Posts
                  </span>
                  <div className="relative w-4 h-4 flex items-center justify-center shrink-0">
                    <svg className="w-full h-full -rotate-90" viewBox="0 0 36 36">
                      <circle cx="18" cy="18" r="16" fill="none" className="stroke-nebula-steel" strokeWidth="4" />
                      <circle
                        cx="18"
                        cy="18"
                        r="16"
                        fill="none"
                        className="stroke-nebula-glow"
                        strokeWidth="4"
                        strokeDasharray="100"
                        strokeDashoffset={
                          deliverables_total > 0 ? 100 - (deliverables_completed / deliverables_total) * 100 : 100
                        }
                        strokeLinecap="round"
                      />
                    </svg>
                  </div>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedClient(client);
                    }}
                    className="px-2 py-1 rounded-lg bg-nebula-surface group-hover:bg-nebula-glow text-nebula-mist group-hover:text-nebula-navy text-[10px] font-bold border border-nebula-steel group-hover:border-transparent transition-all flex items-center gap-0.5"
                  >
                    <span>Details</span>
                    <ChevronRight className="w-3 h-3" />
                  </button>
                </div>
              </motion.div>
            );
          })}
        </div>

        {filteredClients.length === 0 && (
          <div className="py-8 text-center text-xs text-nebula-mist font-medium">
            No clients found matching your search.
          </div>
        )}

        <div className="mt-4 pt-3 border-t border-nebula-steel flex items-center justify-between text-[11px] text-nebula-mist font-medium">
          <span>Click any client to inspect deliverables, SLA scope & assigned creative pod.</span>
          <button
            type="button"
            onClick={() => navigate("/admin/clients")}
            className="text-nebula-glow font-bold hover:underline cursor-pointer flex items-center gap-1"
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
          const company_name = getClientDisplayName(client);
          const initials = getInitials(company_name);
          const tier = client.plan_display_name || client.plan_name || "Enterprise Retainer";
          const pod = getPodInfo(company_name);
          const price = getMonthlyPrice(tier);
          const deliverables_total = client.quota_usage.reduce((sum, q) => sum + q.quota, 0) || 30;
          const deliverables_completed = client.quota_usage.reduce((sum, q) => sum + q.used, 0);
          const postsItem = client.quota_usage.find((q) => q.kind.toLowerCase() === "posts") || { quota: 15, used: 0 };
          const reelsItem = client.quota_usage.find((q) => q.kind.toLowerCase() === "reels") || { quota: 6, used: 0 };
          const storiesItem = client.quota_usage.find((q) => q.kind.toLowerCase() === "stories") || { quota: 9, used: 0 };

          return (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/80 backdrop-blur-xs animate-fade-in">
              <motion.div
                initial={{ opacity: 0, scale: 0.96, y: 15 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.96, y: 15 }}
                transition={{ duration: 0.25 }}
                className="bg-nebula-surface border border-nebula-steel rounded-3xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden font-sans"
              >
                {/* Modal Top Header */}
                <div className="p-5 sm:p-6 border-b border-nebula-steel flex items-start justify-between gap-4 bg-nebula-navy/60">
                  <div className="flex items-center gap-3.5 min-w-0">
                    <div className={`w-12 h-12 rounded-2xl ${pod.avatarColor} text-white font-black text-xl flex items-center justify-center shadow-lg shrink-0`}>
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
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-extrabold text-nebula-glow bg-nebula-navy border border-nebula-steel">
                          <span className="w-1.5 h-1.5 rounded-full bg-nebula-glow animate-pulse" />
                          {client.subscription_status || client.account_status || "Active"}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 text-xs text-nebula-mist mt-1 font-medium">
                        <span className="flex items-center gap-1 truncate">
                          <Mail className="w-3 h-3 text-nebula-glow" /> {client.email}
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
                    className="p-2 rounded-xl bg-nebula-navy hover:bg-nebula-steel text-nebula-mist hover:text-white transition-colors cursor-pointer border border-nebula-steel"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {/* Modal Body */}
                <div className="p-5 sm:p-6 overflow-y-auto space-y-5 flex-1 custom-scrollbar">
                  {/* Grid 1: Retainer & Pod Assignment */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                    {/* Retainer Card */}
                    <div className="p-4 rounded-2xl bg-nebula-navy border border-nebula-steel space-y-2">
                      <div className="flex items-center justify-between text-[10px] font-extrabold uppercase text-nebula-mist tracking-wider">
                        <span>Retainer Agreement</span>
                        <Shield className="w-3.5 h-3.5 text-nebula-glow" />
                      </div>
                      <div className="flex items-baseline gap-1.5">
                        <span className="text-2xl font-black text-white">₹{price.toLocaleString()}</span>
                        <span className="text-xs text-nebula-mist font-bold">/month</span>
                      </div>
                      <div className="pt-2 border-t border-nebula-steel/60 flex items-center justify-between text-xs text-nebula-mist">
                        <span>Billing: Active Cycle</span>
                        <span className="text-emerald-400 font-bold">Priority SLA</span>
                      </div>
                    </div>

                    {/* Creative Pod Card */}
                    <div className="p-4 rounded-2xl bg-nebula-navy border border-nebula-steel space-y-2">
                      <div className="flex items-center justify-between text-[10px] font-extrabold uppercase text-nebula-mist tracking-wider">
                        <span>Assigned Pod</span>
                        <Sparkles className="w-3.5 h-3.5 text-blue-400" />
                      </div>
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-xl bg-blue-600 text-white font-black text-xs flex items-center justify-center shrink-0">
                          {pod.letter}
                        </div>
                        <div>
                          <p className="text-sm font-bold text-white tracking-tight">{pod.name}</p>
                          <p className="text-[11px] text-nebula-mist font-medium">{pod.lead} (Lead)</p>
                        </div>
                      </div>
                      <div className="pt-2 border-t border-nebula-steel/60 flex items-center justify-between text-xs text-nebula-mist">
                        <span>Daily Sync: 11:00 AM IST</span>
                        <span className="text-nebula-glow font-bold">3 Specialists</span>
                      </div>
                    </div>
                  </div>

                  {/* Section 2: Quota & Deliverables Progress */}
                  <div className="p-4 sm:p-5 rounded-2xl bg-nebula-navy border border-nebula-steel space-y-3.5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Layers className="w-4 h-4 text-nebula-glow" />
                        <h4 className="text-xs font-black uppercase text-white tracking-wider">
                          Deliverable Quotas & Monthly Burn
                        </h4>
                      </div>
                      <span className="text-xs font-bold text-nebula-glow">
                        {deliverables_completed} of {deliverables_total} Posts ({Math.round((deliverables_completed / deliverables_total) * 100)}%)
                      </span>
                    </div>

                    {/* Overall Progress Bar */}
                    <div className="w-full bg-nebula-surface rounded-full h-2.5 overflow-hidden border border-nebula-steel">
                      <div
                        className="bg-nebula-glow h-full rounded-full transition-all duration-500"
                        style={{ width: `${Math.min((deliverables_completed / deliverables_total) * 100, 100)}%` }}
                      />
                    </div>

                    {/* 3 Metric Pills */}
                    <div className="grid grid-cols-3 gap-2.5 pt-1">
                      <div className="p-3 rounded-xl bg-nebula-surface border border-nebula-steel text-center">
                        <span className="text-base font-black text-white block">
                          {postsItem.used}/{postsItem.quota}
                        </span>
                        <span className="text-[9px] font-extrabold text-nebula-mist uppercase tracking-wider">
                          Static Posts
                        </span>
                      </div>
                      <div className="p-3 rounded-xl bg-nebula-surface border border-nebula-steel text-center">
                        <span className="text-base font-black text-white block">
                          {reelsItem.used}/{reelsItem.quota}
                        </span>
                        <span className="text-[9px] font-extrabold text-nebula-mist uppercase tracking-wider">
                          9:16 Reels
                        </span>
                      </div>
                      <div className="p-3 rounded-xl bg-nebula-surface border border-nebula-steel text-center">
                        <span className="text-base font-black text-white block">
                          {storiesItem.used}/{storiesItem.quota}
                        </span>
                        <span className="text-[9px] font-extrabold text-nebula-mist uppercase tracking-wider">
                          Stories
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Section 3: Current Active Deliverables Queue */}
                  <div className="p-4 sm:p-5 rounded-2xl bg-nebula-navy border border-nebula-steel space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <FileText className="w-4 h-4 text-nebula-glow" />
                        <h4 className="text-xs font-black uppercase text-white tracking-wider">
                          Active Sprint Deliverables
                        </h4>
                      </div>
                      <span className="text-[10px] font-bold text-nebula-mist">Sprint 44</span>
                    </div>

                    <div className="space-y-2">
                      <div className="p-3 rounded-xl bg-nebula-surface border border-nebula-steel flex items-center justify-between gap-3">
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-white truncate">{company_name} Q4 Cinematic Reel Cut</p>
                          <p className="text-[10px] text-nebula-mist truncate">9:16 Vertical Video · Due Tomorrow 4:00 PM</p>
                        </div>
                        <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-amber-500/15 text-amber-400 border border-amber-500/30 shrink-0">
                          In Review
                        </span>
                      </div>

                      <div className="p-3 rounded-xl bg-nebula-surface border border-nebula-steel flex items-center justify-between gap-3">
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-white truncate">3× Multi-Slide Carousel Deck</p>
                          <p className="text-[10px] text-nebula-mist truncate">4:5 Carousel Infographics · Assigned to {pod.lead}</p>
                        </div>
                        <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-nebula-glow/15 text-nebula-glow border border-nebula-glow/30 shrink-0">
                          In Production
                        </span>
                      </div>

                      <div className="p-3 rounded-xl bg-nebula-surface border border-nebula-steel flex items-center justify-between gap-3">
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-white truncate">Brand Campaign Static Hero Visual</p>
                          <p className="text-[10px] text-nebula-mist truncate">1:1 Square Static · Scheduled for Instagram Dispatch</p>
                        </div>
                        <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 shrink-0">
                          Approved
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Modal Footer Actions */}
                <div className="p-4 sm:p-5 border-t border-nebula-steel bg-nebula-navy/80 flex flex-col sm:flex-row items-center justify-between gap-3">
                  <span className="text-xs text-nebula-mist font-medium hidden sm:inline">
                    Client ID: <span className="font-mono text-white text-[11px]">{client.client_id}</span>
                  </span>
                  <div className="flex items-center gap-2.5 w-full sm:w-auto">
                    <button
                      type="button"
                      onClick={() => setSelectedClient(null)}
                      className="flex-1 sm:flex-none px-4 py-2.5 rounded-xl border border-nebula-steel bg-nebula-surface hover:bg-nebula-steel text-xs font-bold text-white transition-all cursor-pointer"
                    >
                      Close
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedClient(null);
                        navigate(`/admin/clients/${client.client_id}`);
                      }}
                      className="flex-1 sm:flex-none px-4 py-2.5 rounded-xl bg-nebula-glow hover:bg-blue-600 text-xs font-bold text-white transition-all shadow-md shadow-blue-500/20 flex items-center justify-center gap-1.5 cursor-pointer"
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
