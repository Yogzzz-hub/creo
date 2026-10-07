/**
 * Executive Admin Dashboard on the Ops surface.
 * Displays a masonry grid of widgets matching the Stripe/Razorpay aesthetic.
 */

import { useState, lazy, Suspense } from "react";
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
import { AlertTriangle, CheckCircle2 } from "lucide-react";

// Widgets
const RevenueEngineWidget = lazy(() => import("../../components/admin/RevenueEngineWidget").then((module) => ({ default: module.RevenueEngineWidget })));
import { TeamDetailsWidget } from "../../components/admin/TeamDetailsWidget";
import { ContentEngineWidget } from "../../components/admin/ContentEngineWidget";
import { ClientDetailsWidget } from "../../components/admin/ClientDetailsWidget";
import { SupportTicketsWidget } from "../../components/admin/SupportTicketsWidget";
import { AdminTopHeader } from "../../components/admin/AdminTopHeader";
import { SlaPerformanceWidget } from "../../components/admin/SlaPerformanceWidget";


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
      <main className="flex-1 px-3 sm:px-5 lg:px-6 pt-3 pb-6 max-w-[1440px] w-full mx-auto">
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
              <Suspense fallback={<div role="status" className="min-h-64 rounded-3xl bg-[#161F2D] border border-[#2A3446] p-5 text-sm text-slate-400">Loading revenue chart?</div>}><RevenueEngineWidget kpis={kpis} clients={clients} /></Suspense>
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
              <TeamDetailsWidget queue={queue} />
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
              <ContentEngineWidget queue={queue} />
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
            <ClientDetailsWidget clients={clients} />
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
              <SupportTicketsWidget slas={slas} />
            </motion.div>
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35, delay: 0.3, ease: "easeOut" }}
              className="hover-card-innovative rounded-2xl h-full"
            >
              <SlaPerformanceWidget slas={slas} />
            </motion.div>
          </div>
        )}

      </main>
    </div>
  );
}
