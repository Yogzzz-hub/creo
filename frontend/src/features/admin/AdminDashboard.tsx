/**
 * Executive Admin Dashboard on the Ops surface.
 * Displays a masonry grid of widgets matching the Stripe/Razorpay aesthetic.
 */

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  fetchAdminKPIs,
  fetchAdminQueue,
  fetchClientRoster,
  fetchSLABreaches,
  refreshKPIs,
} from "../../lib/ops-api";
import type { AdminKPIs, AdminQueueData, ClientRosterItem, SLABreachItem } from "../../types/ops";
import { AlertTriangle, CheckCircle2 } from "lucide-react";

// Widgets
import { RevenueEngineWidget } from "../../components/admin/RevenueEngineWidget";
import { TeamDetailsWidget } from "../../components/admin/TeamDetailsWidget";
import { ContentEngineWidget } from "../../components/admin/ContentEngineWidget";
import { ClientDetailsWidget } from "../../components/admin/ClientDetailsWidget";
import { SupportTicketsWidget } from "../../components/admin/SupportTicketsWidget";
import { AdminTopHeader } from "../../components/admin/AdminTopHeader";
import { SlaPerformanceWidget } from "../../components/admin/SlaPerformanceWidget";
import { CreoLoadingScreen } from "../../components/ui/CreoLoadingScreen";

export function AdminDashboard({ actorRole = "admin" }: { actorRole?: string }) {
  const [kpis, setKpis] = useState<AdminKPIs | null>(null);
  const [clients, setClients] = useState<ClientRosterItem[]>([]);
  const [queue, setQueue] = useState<AdminQueueData | null>(null);
  const [slas, setSlas] = useState<SLABreachItem[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [activeTab, setActiveTab] = useState<string>("Dashboard");

  const loadAllData = React.useCallback(async () => {
    try {
      const [kpiRes, clientRes, queueRes, slaRes] = await Promise.all([
        fetchAdminKPIs(undefined, actorRole),
        fetchClientRoster(undefined, actorRole),
        fetchAdminQueue(undefined, actorRole),
        fetchSLABreaches(undefined, actorRole),
      ]);
      setKpis(kpiRes);
      setClients(clientRes);
      setQueue(queueRes);
      setSlas(slaRes);
      setMessage(null);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to load admin data";
      setMessage({ type: "error", text: msg });
    }
  }, [actorRole]);

  useEffect(() => {
    loadAllData();
  }, [loadAllData]);

  const handleRefreshKpis = async () => {
    try {
      setRefreshing(true);
      await refreshKPIs(undefined, actorRole);
      const updated = await fetchAdminKPIs(undefined, actorRole);
      setKpis(updated);
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

  if (!kpis && !message) {
    return <CreoLoadingScreen label="Verifying session..." sublabel="Loading Operations Console" />;
  }

  return (
    <div
      data-surface="ops"
      className="w-full min-h-screen font-sans bg-nebula-navy text-slate-100 flex flex-col"
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
        {/* Status banner */}
        <AnimatePresence>
          {message && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="mb-3.5 p-2.5 rounded-xl text-xs font-medium flex items-center gap-2"
              style={{
                background: message.type === "error" ? "var(--color-nebula-surface)" : "var(--color-nebula-surface)",
                border: `1px solid ${message.type === "error" ? "var(--color-nebula-sand)" : "var(--color-nebula-periwinkle)"}`,
                color: message.type === "error" ? "var(--color-nebula-sand)" : "var(--color-nebula-glow)",
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
              <RevenueEngineWidget kpis={kpis} clients={clients} />
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
