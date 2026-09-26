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
        return "bg-[#7FA0D6]/15 text-[#7FA0D6] border-[#7FA0D6]/30";
      case "growth":
        return "bg-[#BCCCE6]/15 text-[#BCCCE6] border-[#BCCCE6]/30";
      case "enterprise":
        return "bg-[#7FA0D6]/15 text-[#7FA0D6] border-[#7FA0D6]/30";
      default:
        return "bg-gray-50 text-gray-700 border-gray-200";
    }
  };

  const getInitials = (name: string) => (name ? name.charAt(0).toUpperCase() : "?");

  return (
    <div
      onClick={() => navigate("/admin/clients")}
      className="bg-[#161F2D] rounded-2xl p-4 sm:p-5 flex flex-col w-full font-sans border border-[#2A3446] shadow-sm hover:border-[#7FA0D6]/50 transition-all cursor-pointer group"
    >
      {/* Header Section */}
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-3 mb-3.5">
        <div className="flex flex-col gap-0.5">
          <h2 className="text-[17px] font-black text-white group-hover:text-[#7FA0D6] transition-colors tracking-tight">Client Details</h2>
          <p className="text-[11px] text-[#97A0B3] font-medium">Overview, contract status & creative pod allocation</p>
        </div>
        
        <div className="flex flex-col sm:flex-row sm:items-center gap-2.5" onClick={(e) => e.stopPropagation()}>
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
          
          {/* Toggle */}
          <div className="flex bg-[#0B111C] border border-[#2A3446] p-0.5 rounded-xl shadow-2xs">
            <button
              onClick={() => setViewMode("list")}
              className={`flex items-center px-3 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                viewMode === "list" ? "bg-[#BCCCE6] text-[#0B111C] font-bold shadow-2xs" : "text-[#97A0B3] hover:text-[#F1F5F9]"
              }`}
            >
              <LayoutList className={`w-3 h-3 mr-1 ${viewMode === "list" ? "stroke-[2.5]" : "stroke-[2]"}`} />
              List
            </button>
            <button
              onClick={() => setViewMode("grid")}
              className={`flex items-center px-3 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                viewMode === "grid" ? "bg-[#BCCCE6] text-[#0B111C] font-bold shadow-2xs" : "text-[#97A0B3] hover:text-[#F1F5F9]"
              }`}
            >
              <LayoutGrid className={`w-3 h-3 mr-1 ${viewMode === "grid" ? "stroke-[2.5]" : "stroke-[2]"}`} />
              Grid
            </button>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-1.5 text-[10px] font-bold text-[#7FA0D6] bg-[#7FA0D6]/15 w-fit px-2.5 py-1 rounded-full mb-3 border border-[#7FA0D6]/30 shadow-2xs">
        <span className="w-1.5 h-1.5 rounded-full bg-[#7FA0D6]" />
        <span>{filteredClients.length} Active Retainers</span>
      </div>

      {viewMode === "list" && (
        <>
          {/* List Header */}
          <div className="grid grid-cols-4 gap-3 px-4 py-1.5 text-[9px] font-black uppercase tracking-wider text-[#97A0B3] mb-1">
            <div>Client & Tier</div>
            <div>Status</div>
            <div>Pod Assigned</div>
            <div className="text-right">Deliverables</div>
          </div>

          {/* List Content */}
          <div className="flex flex-col space-y-1.5">
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
              
              const avatarColor = ["bg-[#7FA0D6]", "bg-slate-900", "bg-slate-800", "bg-slate-700", "bg-blue-500"][podIdx];

              return (
                <motion.div
                  key={client.client_id}
                  initial={{ y: 6, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: i * 0.03, duration: 0.2 }}
                  onClick={(e) => {
                    e.stopPropagation();
                    navigate(`/admin/clients/${client.client_id || 'apex'}`);
                  }}
                  className="grid grid-cols-4 gap-3 items-center px-4 py-2.5 bg-[#161F2D] rounded-xl border border-[#2A3446] hover:border-blue-200 hover:shadow-2xs transition-all group cursor-pointer"
                >
                  {/* Client & Tier */}
                  <div className="flex items-center space-x-2.5 min-w-0">
                    <div className={`flex-shrink-0 w-7 h-7 rounded-lg ${avatarColor} text-white flex items-center justify-center font-bold text-xs shadow-2xs`}>
                      {initials}
                    </div>
                    <div className="flex flex-col min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-xs font-bold text-white truncate tracking-tight">{company_name}</span>
                        <span className={`text-[8px] font-black tracking-wider px-1.5 py-0.2 rounded-md border ${getTierColor(tier)}`}>
                          {tier}
                        </span>
                      </div>
                      <span className="text-[10px] text-[#97A0B3] font-medium truncate">{client.email}</span>
                    </div>
                  </div>

                  {/* Status */}
                  <div>
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-black text-[#7FA0D6] bg-[#0B111C] border border-[#2A3446]">
                      <span className="w-1 h-1 rounded-full bg-[#7FA0D6]" />
                      {client.subscription_status || client.account_status}
                    </span>
                  </div>

                  {/* Pod Assigned */}
                  <div className="flex items-center space-x-2">
                    <div className="flex-shrink-0 w-6 h-6 rounded-md bg-blue-500 text-white flex items-center justify-center font-bold text-[10px]">
                      {podLetter}
                    </div>
                    <div className="flex flex-col">
                      <span className="text-[11px] font-bold text-white tracking-tight">{pod_name}</span>
                      <span className="text-[9px] text-[#97A0B3] font-medium">{pod_lead}</span>
                    </div>
                  </div>

                  {/* Deliverables */}
                  <div className="text-right flex items-center justify-end space-x-2">
                    <span className="text-[11px] font-bold text-[#F1F5F9] tracking-tight">
                      {deliverables_completed}/{deliverables_total} Posts
                    </span>
                    <div className="relative w-4 h-4 flex items-center justify-center shrink-0">
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
                            deliverables_total > 0 ? 100 - (deliverables_completed / deliverables_total) * 100 : 100
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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2.5">
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
            const avatarColor = ["bg-[#7FA0D6]", "bg-slate-900", "bg-slate-800", "bg-slate-700", "bg-blue-500"][podIdx];
            const progressPct = deliverables_total > 0 ? (deliverables_completed / deliverables_total) * 100 : 0;

            return (
              <motion.div
                key={client.client_id}
                initial={{ y: 6, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: i * 0.03, duration: 0.2 }}
                onClick={(e) => {
                  e.stopPropagation();
                  navigate(`/admin/clients/${client.client_id || 'apex'}`);
                }}
                className="flex flex-col p-3.5 bg-[#161F2D] rounded-xl border border-[#2A3446] hover:border-blue-200 hover:shadow-2xs transition-all cursor-pointer relative"
              >
                <div className="flex items-start justify-between mb-2">
                  <div className={`flex-shrink-0 w-8 h-8 rounded-lg ${avatarColor} text-white flex items-center justify-center font-bold text-xs shadow-2xs`}>
                    {initials}
                  </div>
                  <span className={`text-[8px] font-black tracking-wider px-1.5 py-0.2 rounded-md border ${getTierColor(tier)}`}>
                    {tier}
                  </span>
                </div>
                
                <h3 className="text-xs font-bold text-white tracking-tight line-clamp-1">{company_name}</h3>
                <p className="text-[10px] text-[#97A0B3] font-medium tracking-tight mb-2 line-clamp-1">{client.email}</p>

                <div className="flex items-center gap-1.5 mb-2.5 pt-2 border-t border-slate-50">
                  <div className="flex-shrink-0 w-5 h-5 rounded-md bg-blue-500 text-white flex items-center justify-center font-bold text-[9px]">
                    {podLetter}
                  </div>
                  <div className="flex flex-col">
                    <span className="text-[10px] font-bold text-[#F1F5F9] tracking-tight">{pod_name}</span>
                    <span className="text-[8px] text-[#97A0B3] font-medium">{pod_lead}</span>
                  </div>
                </div>

                <div className="flex items-center justify-between mt-auto">
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[8px] font-black text-[#7FA0D6] bg-blue-50 border border-blue-100/50">
                    <span className="w-1 h-1 rounded-full bg-[#7FA0D6]" />
                    {client.subscription_status || client.account_status}
                  </span>
                  <div className="flex items-center gap-1.5">
                    <span className="text-[9px] font-bold text-[#F1F5F9]">
                      {deliverables_completed}/{deliverables_total}
                    </span>
                    <div className="relative w-3.5 h-3.5 flex items-center justify-center">
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
        <div className="py-8 text-center text-xs text-[#97A0B3] font-medium">
          No clients found matching your search.
        </div>
      )}
      
      <div className="mt-3.5 pt-3 border-t border-[#2A3446] flex items-center justify-between text-[11px] text-[#97A0B3] font-medium" onClick={(e) => e.stopPropagation()}>
        <span>All accounts aligned with active master service agreements.</span>
        <button className="text-[#7FA0D6] font-bold hover:underline cursor-pointer" onClick={(e) => e.stopPropagation()}>Export audit &rarr;</button>
      </div>
    </div>
  );
}
