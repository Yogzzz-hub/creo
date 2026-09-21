import { useState } from "react";
import { useNavigate } from "react-router";
import { motion } from "motion/react";
import { Search, LayoutList, LayoutGrid } from "lucide-react";
import { ClientRosterItem } from "@/types/ops";

interface ClientDetailsWidgetProps {
  clients: ClientRosterItem[];
}

export function ClientDetailsWidget({ clients }: ClientDetailsWidgetProps) {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [viewMode, setViewMode] = useState<"list" | "grid">("list");

  const filteredClients = clients.filter((c) =>
    (c.company_name || c.email).toLowerCase().includes(search.toLowerCase())
  );

  const getTierColor = (tier: string) => {
    switch (tier.toLowerCase()) {
      case "premium":
        return "bg-blue-50 text-blue-700 border-blue-200";
      case "growth":
        return "bg-cyan-50 text-cyan-700 border-cyan-200";
      case "enterprise":
        return "bg-indigo-50 text-indigo-700 border-indigo-200";
      default:
        return "bg-gray-50 text-gray-700 border-gray-200";
    }
  };

  const getInitials = (name: string) => (name ? name.charAt(0).toUpperCase() : "?");

  return (
    <div
      onClick={() => navigate("/admin/clients")}
      className="bg-white rounded-3xl p-6 sm:p-8 flex flex-col w-full font-sans border border-gray-100 shadow-[0_2px_10px_rgba(0,0,0,0.04)] hover:shadow-xl hover:border-blue-200/80 transition-all cursor-pointer group"
    >
      {/* Header Section */}
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-6 mb-6">
        <div className="flex flex-col gap-1">
          <h2 className="text-[20px] font-black text-slate-900 group-hover:text-blue-600 transition-colors tracking-tight">Client Details</h2>
          <p className="text-[12px] text-slate-500 font-medium">Overview, contract status & creative pod allocation</p>
        </div>
        
        <div className="flex flex-col sm:flex-row sm:items-center gap-4" onClick={(e) => e.stopPropagation()}>
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search clients, pods, or deliverables..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10 pr-4 py-2 w-full sm:w-[280px] rounded-full border border-slate-200/80 bg-white text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all placeholder:text-slate-400 shadow-sm shadow-slate-200/20"
            />
          </div>
          
          {/* Toggle */}
          <div className="flex bg-white border border-slate-200/80 p-1 rounded-full shadow-sm shadow-slate-200/20">
            <button
              onClick={() => setViewMode("list")}
              className={`flex items-center px-4 py-1.5 rounded-full text-[11px] font-bold transition-all cursor-pointer ${
                viewMode === "list" ? "bg-blue-600 text-white shadow-sm shadow-blue-600/20" : "text-slate-400 hover:text-slate-600"
              }`}
            >
              <LayoutList className={`w-3.5 h-3.5 mr-1.5 ${viewMode === "list" ? "stroke-[2.5]" : "stroke-[2]"}`} />
              List
            </button>
            <button
              onClick={() => setViewMode("grid")}
              className={`flex items-center px-4 py-1.5 rounded-full text-[11px] font-bold transition-all cursor-pointer ${
                viewMode === "grid" ? "bg-blue-600 text-white shadow-sm shadow-blue-600/20" : "text-slate-400 hover:text-slate-600"
              }`}
            >
              <LayoutGrid className={`w-3.5 h-3.5 mr-1.5 ${viewMode === "grid" ? "stroke-[2.5]" : "stroke-[2]"}`} />
              Grid
            </button>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-1.5 text-[11px] font-bold text-blue-600 bg-blue-50 w-fit px-3 py-1.5 rounded-full mb-6 border border-blue-100 shadow-sm shadow-blue-500/5">
        <span className="w-1.5 h-1.5 rounded-full bg-blue-600 shadow-[0_0_8px_rgba(37,99,235,0.6)]" />
        <span>{filteredClients.length} Active Retainers</span>
      </div>

      {viewMode === "list" && (
        <>
          {/* List Header */}
          <div className="grid grid-cols-4 gap-4 px-6 py-2.5 text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">
            <div>Client & Tier</div>
            <div>Status</div>
            <div>Pod Assigned</div>
            <div className="text-right">Deliverables</div>
          </div>

          {/* List Content */}
          <div className="flex flex-col space-y-3">
            {filteredClients.map((client, i) => {
              const tier = client.plan_display_name || client.plan_name || "Custom";
              const deliverables_total = client.quota_usage.reduce((sum, q) => sum + q.quota, 0);
              const deliverables_completed = client.quota_usage.reduce((sum, q) => sum + q.used, 0);
              const company_name = client.company_name || "Unknown";
              
              // Mock pod mapping based on company name initial for visual variety
              const initials = getInitials(company_name);
              const podLetters = ["A", "B", "C", "D", "E"];
              const podIdx = company_name.charCodeAt(0) % podLetters.length;
              const podLetter = podLetters[podIdx];
              const pod_name = `Pod ${podLetter}`;
              const pod_leads = ["Maya L.", "Omar V.", "Lena O.", "Theo Cla...", "Sarah J."];
              const pod_lead = pod_leads[podIdx];
              
              const avatarColor = ["bg-blue-600", "bg-slate-900", "bg-slate-800", "bg-slate-700", "bg-blue-500"][podIdx];

              return (
                <motion.div
                  key={client.client_id}
                  initial={{ y: 10, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: i * 0.05, duration: 0.3 }}
                  onClick={(e) => {
                    e.stopPropagation();
                    navigate(`/admin/clients/${client.client_id || 'apex'}`);
                  }}
                  className="grid grid-cols-4 gap-4 items-center px-6 py-4 bg-white rounded-[24px] border border-slate-100 shadow-[0_2px_12px_rgba(0,0,0,0.015)] hover:shadow-[0_4px_16px_rgba(0,0,0,0.03)] hover:border-slate-200 transition-all group cursor-pointer"
                >
                  {/* Client & Tier */}
                  <div className="flex items-center space-x-3.5">
                    <div className={`flex-shrink-0 w-10 h-10 rounded-2xl ${avatarColor} text-white flex items-center justify-center font-black text-sm shadow-sm relative`}>
                      {initials}
                      <span className="absolute -bottom-1 -right-1 w-3.5 h-3.5 bg-rose-400 rounded-full border-2 border-white flex items-center justify-center text-[6px]" />
                    </div>
                    <div className="flex flex-col gap-0.5">
                      <div className="flex items-center gap-2">
                        <span className="text-[13px] font-bold text-slate-900 tracking-tight">{company_name}</span>
                        <span className={`text-[9px] font-black tracking-wider px-2 py-0.5 rounded-full border ${getTierColor(tier)}`}>
                          {tier}
                        </span>
                      </div>
                      <span className="text-[11px] text-slate-400 font-medium tracking-tight">{client.email}</span>
                    </div>
                  </div>

                  {/* Status */}
                  <div>
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black text-blue-600 bg-white border border-slate-100 shadow-sm shadow-slate-200/30">
                      <span className="w-1.5 h-1.5 rounded-full bg-blue-600 shadow-[0_0_8px_rgba(37,99,235,0.6)]" />
                      {client.subscription_status || client.account_status}
                    </span>
                  </div>

                  {/* Pod Assigned */}
                  <div className="flex items-center space-x-3">
                    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-blue-500 text-white flex items-center justify-center font-black text-xs shadow-sm shadow-blue-500/20">
                      {podLetter}
                    </div>
                    <div className="flex flex-col">
                      <span className="text-[12px] font-bold text-slate-900 tracking-tight">{pod_name}</span>
                      <span className="text-[10px] text-slate-400 font-medium">{pod_lead}</span>
                    </div>
                  </div>

                  {/* Deliverables */}
                  <div className="text-right flex items-center justify-end space-x-3">
                    <span className="text-[12px] font-bold text-slate-600 tracking-tight">
                      {deliverables_completed}/{deliverables_total} Posts
                    </span>
                    <div className="relative w-5 h-5 flex items-center justify-center shrink-0">
                      <svg className="w-full h-full -rotate-90" viewBox="0 0 36 36">
                        <circle cx="18" cy="18" r="16" fill="none" className="stroke-slate-100" strokeWidth="4" />
                        <circle
                          cx="18"
                          cy="18"
                          r="16"
                          fill="none"
                          className="stroke-blue-500"
                          strokeWidth="4"
                          strokeDasharray="100"
                          strokeDashoffset={
                            100 - (deliverables_total > 0 ? (deliverables_completed / deliverables_total) * 100 : 0)
                          }
                          strokeLinecap="round"
                        />
                      </svg>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </>
      )}

      {viewMode === "grid" && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filteredClients.map((client, i) => {
            const tier = client.plan_display_name || client.plan_name || "Custom";
            const deliverables_total = client.quota_usage.reduce((sum, q) => sum + q.quota, 0);
            const deliverables_completed = client.quota_usage.reduce((sum, q) => sum + q.used, 0);
            const company_name = client.company_name || "Unknown";
            const initials = getInitials(company_name);
            const podLetters = ["A", "B", "C", "D", "E"];
            const podIdx = company_name.charCodeAt(0) % podLetters.length;
            const podLetter = podLetters[podIdx];
            const pod_name = `Pod ${podLetter}`;
            const pod_leads = ["Maya L.", "Omar V.", "Lena O.", "Theo Cla...", "Sarah J."];
            const pod_lead = pod_leads[podIdx];
            const avatarColor = ["bg-blue-600", "bg-slate-900", "bg-slate-800", "bg-slate-700", "bg-blue-500"][podIdx];
            const progressPct = deliverables_total > 0 ? (deliverables_completed / deliverables_total) * 100 : 0;

            return (
              <motion.div
                key={client.client_id}
                initial={{ y: 10, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: i * 0.05, duration: 0.3 }}
                onClick={(e) => {
                  e.stopPropagation();
                  navigate(`/admin/clients/${client.client_id || 'apex'}`);
                }}
                className="flex flex-col p-5 bg-white rounded-[24px] border border-slate-100 shadow-[0_2px_12px_rgba(0,0,0,0.015)] hover:shadow-[0_4px_16px_rgba(0,0,0,0.03)] hover:border-slate-200 transition-all cursor-pointer relative"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className={`flex-shrink-0 w-12 h-12 rounded-2xl ${avatarColor} text-white flex items-center justify-center font-black text-lg shadow-sm relative`}>
                    {initials}
                  </div>
                  <span className={`text-[9px] font-black tracking-wider px-2 py-0.5 rounded-full border ${getTierColor(tier)}`}>
                    {tier}
                  </span>
                </div>
                
                <h3 className="text-[14px] font-bold text-slate-900 tracking-tight line-clamp-1">{company_name}</h3>
                <p className="text-[11px] text-slate-400 font-medium tracking-tight mb-4 line-clamp-1">{client.email}</p>

                <div className="flex items-center gap-2 mb-4 pt-4 border-t border-slate-50">
                  <div className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-500 text-white flex items-center justify-center font-black text-[10px]">
                    {podLetter}
                  </div>
                  <div className="flex flex-col">
                    <span className="text-[11px] font-bold text-slate-700 tracking-tight">{pod_name}</span>
                    <span className="text-[9px] text-slate-400 font-medium">{pod_lead}</span>
                  </div>
                </div>

                <div className="flex items-center justify-between mt-auto">
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[9px] font-black text-blue-600 bg-blue-50 border border-blue-100/50">
                    <span className="w-1 h-1 rounded-full bg-blue-600" />
                    {client.subscription_status || client.account_status}
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold text-slate-600">
                      {deliverables_completed}/{deliverables_total}
                    </span>
                    <div className="relative w-4 h-4 flex items-center justify-center">
                      <svg className="w-full h-full -rotate-90" viewBox="0 0 36 36">
                        <circle cx="18" cy="18" r="16" fill="none" className="stroke-slate-100" strokeWidth="6" />
                        <circle
                          cx="18"
                          cy="18"
                          r="16"
                          fill="none"
                          className="stroke-blue-500"
                          strokeWidth="6"
                          strokeDasharray="100"
                          strokeDashoffset={100 - progressPct}
                          strokeLinecap="round"
                        />
                      </svg>
                    </div>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      {filteredClients.length === 0 && (
        <div className="py-12 text-center text-sm text-slate-500 font-medium">
          No clients found matching your search.
        </div>
      )}
      
      <div className="mt-6 pt-5 border-t border-slate-200/50 flex items-center justify-between text-xs text-slate-400 font-medium" onClick={(e) => e.stopPropagation()}>
        <span>All accounts aligned with active master service agreements.</span>
        <button className="text-blue-600 font-bold hover:underline cursor-pointer" onClick={(e) => e.stopPropagation()}>Export retainer audit &rarr;</button>
      </div>
    </div>
  );
}
