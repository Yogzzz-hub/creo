/**
 * Executive Admin Dashboard on the Ops surface.
 * Displays a masonry grid of widgets matching the Stripe/Razorpay aesthetic.
 */

import React, { useState, useEffect } from "react";
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
        {/* Status banner */}
        {message && (
          <div
            className="mb-3.5 p-2.5 rounded-xl text-xs font-medium flex items-center gap-2"
            style={{
              background: message.type === "error" ? "#FEE2E2" : "#E6F4EA",
              border: `1px solid ${message.type === "error" ? "#FCA5A5" : "#A8DAB5"}`,
              color: message.type === "error" ? "#E5484D" : "#137333",
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
          </div>
        )}

        {/* Top Widgets Grid (3 Columns) */}
        <div className={`grid grid-cols-1 ${activeTab === "Dashboard" ? "lg:grid-cols-3" : "lg:grid-cols-1 max-w-4xl mx-auto"} gap-3.5 sm:gap-4`}>
          {/* Column 1: Revenue */}
          {(activeTab === "Dashboard" || activeTab === "Revenue") && (
            <div className="flex flex-col gap-3.5 sm:gap-4 h-full">
              <RevenueEngineWidget kpis={kpis} clients={clients} />
            </div>
          )}

          {/* Column 2: Team */}
          {(activeTab === "Dashboard" || activeTab === "Team Details") && (
            <div className="flex flex-col gap-3.5 sm:gap-4 h-full">
              <TeamDetailsWidget queue={queue} />
            </div>
          )}

          {/* Column 3: Content */}
          {(activeTab === "Dashboard" || activeTab === "Content Engine") && (
            <div className="flex flex-col gap-3.5 sm:gap-4 h-full">
              <ContentEngineWidget queue={queue} />
            </div>
          )}
        </div>

        {/* Full Width Row: Client Details */}
        {(activeTab === "Dashboard" || activeTab === "Client Details") && (
          <div className="mt-3.5 sm:mt-4">
            <ClientDetailsWidget clients={clients} />
          </div>
        )}

        {/* Bottom Widgets Grid (2 Columns): Support & SLA */}
        {(activeTab === "Dashboard" || activeTab === "SLA & Support") && (
          <div className={`mt-3.5 sm:mt-4 grid grid-cols-1 ${activeTab === "Dashboard" ? "lg:grid-cols-2" : "lg:grid-cols-1 max-w-4xl mx-auto"} gap-3.5 sm:gap-4`}>
            <SupportTicketsWidget slas={slas} />
            <SlaPerformanceWidget slas={slas} />
          </div>
        )}

      </main>
    </div>
  );
}
