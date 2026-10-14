/**
 * Executive Admin Dashboard on the Ops surface.
 * Displays a masonry grid of widgets matching the Stripe/Razorpay aesthetic.
 */

import { useState, lazy, Suspense } from "react";
import { Link } from "react-router";
import { motion, AnimatePresence } from "motion/react";
import {
  fetchAdminKPIs,
  fetchAdminQueue,
  fetchClientRoster,
  fetchSLABreaches,
  refreshKPIs,
} from "../../lib/ops-api";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "../../lib/auth-context";
import { AlertTriangle, CheckCircle2, Users, Briefcase } from "lucide-react";

// Widgets
const RevenueEngineWidget = lazy(() => import("../../components/admin/RevenueEngineWidget").then((module) => ({ default: module.RevenueEngineWidget })));
import { TeamDetailsWidget } from "../../components/admin/TeamDetailsWidget";
import { ContentEngineWidget } from "../../components/admin/ContentEngineWidget";
import { ClientDetailsWidget } from "../../components/admin/ClientDetailsWidget";
import { SupportTicketsWidget } from "../../components/admin/SupportTicketsWidget";
import { AdminTopHeader } from "../../components/admin/AdminTopHeader";
import { SlaPerformanceWidget } from "../../components/admin/SlaPerformanceWidget";


function LoadingPanel({ label }: { label: string }) {
  return <div role="status" className="min-h-48 rounded-3xl bg-[#161F2D] border border-[#2A3446] p-5 text-sm text-slate-400">{label}</div>;
}

export function AdminDashboard({ actorRole = "admin" }: { actorRole?: string }) {
  const { user } = useAuth();
  const options = { staleTime: 30_000, enabled: !!user?.id };
  const kpiQuery = useQuery({ ...options, queryKey: ["admin_dashboard", user?.id, actorRole], queryFn: () => fetchAdminKPIs(undefined, actorRole) });
  const clientQuery = useQuery({ ...options, queryKey: ["admin_clients", user?.id, actorRole], queryFn: () => fetchClientRoster(undefined, actorRole) });
  const queueQuery = useQuery({ ...options, queryKey: ["admin_queue", user?.id, actorRole], queryFn: () => fetchAdminQueue(undefined, actorRole) });
  const slaQuery = useQuery({ ...options, queryKey: ["admin_sla_breaches", user?.id, actorRole], queryFn: () => fetchSLABreaches(undefined, actorRole) });
  const kpis = kpiQuery.data ?? null;
  const clients = clientQuery.data ?? [];
  const queue = queueQuery.data ?? null;
  const slas = slaQuery.data ?? [];
  const [refreshing, setRefreshing] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [activeTab, setActiveTab] = useState<string>("Dashboard");
  const queries = [kpiQuery, clientQuery, queueQuery, slaQuery];
  const error = queries.find((query) => query.error)?.error;

  const handleRefreshKpis = async () => {
    try {
      setRefreshing(true);
      await refreshKPIs(undefined, actorRole);
      await kpiQuery.refetch();
      setMessage({
        type: "success",
        text: "KPIs refreshed.",
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to refresh KPIs";
      setMessage({ type: "error", text: msg });
    } finally {
      setRefreshing(false);
    }
  };

  return (
    <div
      data-surface="ops"
      className="w-full min-h-screen font-sans bg-[#0B111C] text-[#F1F5F9] flex flex-col"
    >
      {/* Top Header */}
      <AdminTopHeader
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        kpis={kpis}
        refreshing={refreshing}
        handleRefreshKpis={handleRefreshKpis}
      />

      {/* Main Container */}
      <main className="flex-1 px-3 sm:px-5 lg:px-6 pt-6 sm:pt-8 pb-10 max-w-[1440px] w-full mx-auto">
        {queries.some((query) => query.isPending) && <p role="status" className="mb-4 text-sm text-slate-400">Loading dashboard data?</p>}
        {error && <p role="alert" className="mb-4 text-sm text-amber-300">{error instanceof Error ? error.message : "Some dashboard data could not be loaded."} <button onClick={() => { queries.forEach((query) => { if (query.isError) void query.refetch(); }); }} className="underline">Retry</button></p>}
        {/* Status banner */}
        <AnimatePresence>
          {message && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="mb-3.5 p-2.5 rounded-xl text-xs font-medium flex items-center gap-2"
              style={{
                background: message.type === "error" ? "#161F2D" : "#161F2D",
                border: `1px solid ${message.type === "error" ? "#D8BF9B" : "#BCCCE6"}`,
                color: message.type === "error" ? "#D8BF9B" : "#7FA0D6",
              }}
            >
              {message.type === "error" ? (
                <AlertTriangle className="w-4 h-4" />
              ) : (
                <CheckCircle2 className="w-4 h-4" />
              )}
              <span>{message.text}</span>
              <button type="button" onClick={() => setMessage(null)} className="ml-auto underline">
                Dismiss
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Operations Oversight: Freelancer Deliverables & BDE Sales Pipeline */}
        {activeTab === "Dashboard" && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 mb-4">
            <Link
              to="/admin/tasks?view=freelancer_roster"
              className="p-4 bg-[#161F2D] border border-[#2A3446] hover:border-purple-500/50 rounded-2xl flex items-center justify-between transition-all group shadow-sm hover:shadow-purple-500/5"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-purple-500/15 border border-purple-500/30 flex items-center justify-center text-purple-400 shrink-0">
                  <Users className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <p className="text-xs font-bold text-white group-hover:text-purple-300 transition-colors">
                      Freelancers Workload & Dispatch
                    </p>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-500/20 text-purple-300 border border-purple-500/30">
                      Roster
                    </span>
                  </div>
                  <p className="text-[11px] text-[#97A0B3] mt-0.5">
                    Monitor live assignments, milestone fees, submissions, and approval status
                  </p>
                </div>
              </div>
              <span className="text-xs text-purple-400 font-bold group-hover:translate-x-1 transition-transform ml-2 shrink-0">
                View &rarr;
              </span>
            </Link>

            <Link
              to="/admin/bde-oversight"
              className="p-4 bg-[#161F2D] border border-[#2A3446] hover:border-[#7FA0D6]/50 rounded-2xl flex items-center justify-between transition-all group shadow-sm hover:shadow-[#7FA0D6]/5"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#7FA0D6]/15 border border-[#7FA0D6]/30 flex items-center justify-center text-[#7FA0D6] shrink-0">
                  <Briefcase className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <p className="text-xs font-bold text-white group-hover:text-[#7FA0D6] transition-colors">
                      BDE Outreach & Pipeline Oversight
                    </p>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#7FA0D6]/20 text-[#7FA0D6] border border-[#7FA0D6]/30">
                      Work Process
                    </span>
                  </div>
                  <p className="text-[11px] text-[#97A0B3] mt-0.5">
                    Track clients reached, touchpoint velocity, calls & meetings logged, and deal conversions
                  </p>
                </div>
              </div>
              <span className="text-xs text-[#7FA0D6] font-bold group-hover:translate-x-1 transition-transform ml-2 shrink-0">
                View &rarr;
              </span>
            </Link>
          </div>
        )}

        {/* Top 3 Containers Aligned in 1 Single Row (3 Columns) */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-3.5 sm:gap-4 items-stretch mb-3.5 sm:mb-4">
          {/* Container 1: Revenue Engine */}
          {(activeTab === "Dashboard" || activeTab === "Revenue") && (
            <motion.div 
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35, delay: 0.05, ease: "easeOut" }}
              className="flex flex-col h-full min-h-0 hover-card-innovative rounded-3xl"
            >
              <Suspense fallback={<div role="status" className="min-h-64 rounded-3xl bg-[#161F2D] border border-[#2A3446] p-5 text-sm text-slate-400">Loading revenue chart?</div>}>{kpiQuery.data ? <RevenueEngineWidget kpis={kpis} clients={clients} /> : <LoadingPanel label={kpiQuery.isError ? "Revenue unavailable" : "Loading revenue?"} />}</Suspense>
            </motion.div>
          )}

          {/* Container 2: Team Details */}
          {(activeTab === "Dashboard" || activeTab === "Team Details") && (
            <motion.div 
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35, delay: 0.1, ease: "easeOut" }}
              className="flex flex-col h-full min-h-0 hover-card-innovative rounded-3xl"
            >
              {queueQuery.data ? <TeamDetailsWidget queue={queue} /> : <LoadingPanel label={queueQuery.isError ? "Team data unavailable" : "Loading team?"} />}
            </motion.div>
          )}

          {/* Container 3: Content Engine */}
          {(activeTab === "Dashboard" || activeTab === "Content Engine") && (
            <motion.div 
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35, delay: 0.15, ease: "easeOut" }}
              className="flex flex-col h-full min-h-0 hover-card-innovative rounded-3xl"
            >
              {queueQuery.data ? <ContentEngineWidget queue={queue} /> : <LoadingPanel label={queueQuery.isError ? "Production data unavailable" : "Loading production?"} />}
            </motion.div>
          )}
        </div>


        {/* Full Width Row: Client Details */}
        {(activeTab === "Dashboard" || activeTab === "Client Details") && (
          <motion.div 
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, delay: 0.2, ease: "easeOut" }}
            className="mt-3.5 sm:mt-4 hover-card-innovative rounded-2xl"
          >
            {clientQuery.data ? <ClientDetailsWidget clients={clients} /> : <LoadingPanel label={clientQuery.isError ? "Client data unavailable" : "Loading clients?"} />}
          </motion.div>
        )}

        {/* Bottom Widgets Grid (2 Columns): Support & SLA */}
        {(activeTab === "Dashboard" || activeTab === "SLA & Support") && (
          <div className={`mt-3.5 sm:mt-4 grid grid-cols-1 ${activeTab === "Dashboard" ? "lg:grid-cols-2" : "lg:grid-cols-1 max-w-4xl mx-auto"} gap-3.5 sm:gap-4`}>
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35, delay: 0.25, ease: "easeOut" }}
              className="hover-card-innovative rounded-2xl h-full"
            >
              {slaQuery.data ? <SupportTicketsWidget slas={slas} /> : <LoadingPanel label={slaQuery.isError ? "Support data unavailable" : "Loading support?"} />}
            </motion.div>
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35, delay: 0.3, ease: "easeOut" }}
              className="hover-card-innovative rounded-2xl h-full"
            >
              {slaQuery.data ? <SlaPerformanceWidget slas={slas} /> : <LoadingPanel label={slaQuery.isError ? "SLA data unavailable" : "Loading SLA?"} />}
            </motion.div>
          </div>
        )}

      </main>
    </div>
  );
}
