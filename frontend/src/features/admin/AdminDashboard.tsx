/**
 * Executive Admin Dashboard on the Ops surface.
 * Displays:
 * 1. KPI Row with tabular figures (MRR, active clients, churn, avg turnaround)
 * 2. Client roster table with derived onboarding stages and quota counters
 * 3. Global dispatch queue and staff capacity breakdown
 * 4. SLA panel where breaches use #E5484D and nothing else on the page does.
 *
 * Colors match the Creo ops paper surface: #FAFAF8 bg, #14171C text,
 * #E4E4DF borders, #23A26D settled, #4C6FFF blue, #F0A202 waiting.
 */

import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  RefreshCw,
  Shield,
  ShieldAlert,
  TrendingUp,
  UserX,
  Users,
} from "lucide-react";
import React, { useState, useEffect } from "react";
import {
  fetchAdminKPIs,
  fetchAdminQueue,
  fetchClientRoster,
  fetchSLABreaches,
  refreshKPIs,
  suspendUser,
} from "../../lib/ops-api";
import type { AdminKPIs, AdminQueueData, ClientRosterItem, SLABreachItem } from "../../types/ops";

export function AdminDashboard({ actorRole = "admin" }: { actorRole?: string }) {
  const [kpis, setKpis] = useState<AdminKPIs | null>(null);
  const [clients, setClients] = useState<ClientRosterItem[]>([]);
  const [queue, setQueue] = useState<AdminQueueData | null>(null);
  const [slas, setSlas] = useState<SLABreachItem[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<"roster" | "queue" | "slas">("roster");
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

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
        text: "Materialized view mv_exec_kpis refreshed concurrently.",
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to refresh KPIs";
      setMessage({ type: "error", text: msg });
    } finally {
      setRefreshing(false);
    }
  };

  const handleSuspendUser = async (userId: string) => {
    if (
      !confirm(
        "Are you sure you want to suspend this user? Their session will be revoked immediately.",
      )
    ) {
      return;
    }
    try {
      await suspendUser(userId, undefined, actorRole);
      setMessage({
        type: "success",
        text: "User suspended successfully. Live sessions invalidated.",
      });
      await loadAllData();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to suspend user.";
      setMessage({ type: "error", text: msg });
    }
  };

  return (
    <div
      data-surface="ops"
      className="w-full min-h-screen font-sans"
      style={{ background: "#FAFAF8", color: "#14171C" }}
    >
      {/* ── Header ───────────────────────────────────────────────────────── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8 pb-4 border-b" style={{ borderColor: "#E4E4DF" }}>
        <div>
          <div className="flex items-center gap-2">
            <Shield className="w-5 h-5" style={{ color: "#23A26D" }} />
            <h1 className="text-2xl font-bold tracking-tight" style={{ color: "#14171C" }}>
              Executive Dashboard · Materialized KPIs
            </h1>
          </div>
          <p className="text-xs mt-1" style={{ color: "#6B7280" }}>
            Materialized view aggregates refreshed via Celery Beat every 15 minutes
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 text-xs" style={{ color: "#6B7280" }}>
            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: "#23A26D" }} />
            <span>
              Last synchronized:{" "}
              {kpis?.refreshed_at
                ? new Date(kpis.refreshed_at).toLocaleTimeString()
                : "Pending"}
            </span>
          </div>
          <button
            type="button"
            onClick={handleRefreshKpis}
            disabled={refreshing}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors shadow-xs disabled:opacity-50"
            style={{
              background: "#FFFFFF",
              border: "1px solid #E4E4DF",
              color: "#14171C",
            }}
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? "animate-spin" : ""}`} />
            Refresh View
          </button>
        </div>
      </div>

      {/* Status banner */}
      {message && (
        <div
          className="mb-6 p-3.5 rounded-lg text-xs font-medium flex items-center gap-2"
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

      {/* ── KPI Grid (4 cards) ──────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5 mb-8">
        {/* MRR */}
        <div className="p-5 rounded-2xl bg-white border border-slate-200/90 border-t-4 border-t-emerald-500 shadow-xs hover:shadow-md hover:-translate-y-0.5 transition-all group">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-500 mb-2">
            <span>Monthly Recurring Revenue</span>
            <div className="size-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center group-hover:scale-110 transition-transform">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-black text-[#0D2137] tabular-nums tracking-tight">
            {kpis ? kpis.mrr_formatted : "₹0"}
          </div>
          <div className="mt-2.5 text-xs font-medium text-emerald-600 flex items-center gap-1.5">
            <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse" />
            <span>
              Live Synced:{" "}
              {kpis?.refreshed_at
                ? new Date(kpis.refreshed_at).toLocaleTimeString()
                : "Pending"}
            </span>
          </div>
        </div>

        {/* Active Clients */}
        <div className="p-5 rounded-2xl bg-white border border-slate-200/90 border-t-4 border-t-blue-500 shadow-xs hover:shadow-md hover:-translate-y-0.5 transition-all group">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-500 mb-2">
            <span>Active Retainer Clients</span>
            <div className="size-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center group-hover:scale-110 transition-transform">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-black text-[#0D2137] tabular-nums tracking-tight">
            {kpis ? kpis.active_clients : 0}
          </div>
          <div className="mt-2.5 text-xs font-medium text-blue-600 flex items-center gap-1">
            <span>Active & onboarding brand retainers</span>
          </div>
        </div>

        {/* Client Churn Rate */}
        <div className="p-5 rounded-2xl bg-white border border-slate-200/90 border-t-4 border-t-amber-500 shadow-xs hover:shadow-md hover:-translate-y-0.5 transition-all group">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-500 mb-2">
            <span>Client Churn (30d)</span>
            <div className="size-8 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center group-hover:scale-110 transition-transform">
              <UserX className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-black text-[#0D2137] tabular-nums tracking-tight">
            {kpis ? kpis.churned_last_30d : 0}
          </div>
          <div className="mt-2.5 text-xs font-medium text-slate-500 flex items-center gap-1">
            <span>Trailing 30-day cancellations</span>
          </div>
        </div>

        {/* Avg Turnaround SLA */}
        <div className="p-5 rounded-2xl bg-white border border-slate-200/90 border-t-4 border-t-indigo-500 shadow-xs hover:shadow-md hover:-translate-y-0.5 transition-all group">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-500 mb-2">
            <span>Avg Turnaround SLA</span>
            <div className="size-8 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center group-hover:scale-110 transition-transform">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-black text-[#0D2137] tabular-nums tracking-tight">
            {kpis ? `${kpis.avg_turnaround_hours}h` : "0.0h"}
          </div>
          <div className="mt-2.5 text-xs font-medium text-indigo-600 flex items-center gap-1">
            <span>From draft upload to client approval</span>
          </div>
        </div>
      </div>

      {/* ── Section Navigation Tabs ─────────────────────────────────────── */}
      <div className="flex items-center gap-2 p-1 rounded-2xl bg-slate-100 border border-slate-200/80 mb-6 w-full sm:w-auto sm:inline-flex overflow-x-auto">
        <button
          type="button"
          onClick={() => setActiveTab("roster")}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
            activeTab === "roster"
              ? "bg-white text-[#0D2137] shadow-xs"
              : "text-slate-600 hover:text-[#0D2137]"
          }`}
        >
          Client Roster ({clients.length})
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("queue")}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
            activeTab === "queue"
              ? "bg-white text-[#0D2137] shadow-xs"
              : "text-slate-600 hover:text-[#0D2137]"
          }`}
        >
          Dispatch Queue ({queue?.backlog.length || 0})
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("slas")}
          className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
            activeTab === "slas"
              ? "bg-white text-[#0D2137] shadow-xs"
              : "text-slate-600 hover:text-[#0D2137]"
          }`}
        >
          <span>SLA Radar</span>
          {slas.length > 0 && (
            <span className="px-1.5 py-0.5 rounded-full text-[10px] font-black bg-rose-100 text-rose-700 border border-rose-200">
              {slas.length}
            </span>
          )}
        </button>
      </div>

      {/* ── TAB: CLIENT ROSTER ──────────────────────────────────────────── */}
      {activeTab === "roster" && (
        <div className="rounded-2xl shadow-xs overflow-hidden bg-white border border-slate-200/90">
          <div className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 bg-slate-50/50">
            <div>
              <h3 className="font-bold text-sm text-[#0D2137]">
                Active Client Retainers & Production Quotas
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Real-time active retainers and deliverables in progress
              </p>
            </div>
            <span className="text-xs font-semibold px-2.5 py-1 rounded-lg bg-blue-50 text-[#2B7BC4] border border-blue-100 self-start sm:self-auto">
              Total Clients: {clients.length}
            </span>
          </div>

          {/* Mobile Card View (< 768px) */}
          <div className="block md:hidden divide-y divide-slate-100">
            {clients.map((c) => (
              <div key={c.client_id} className="p-4 space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h4 className="font-bold text-sm text-[#0D2137]">
                      {c.company_name || "Personal Client"}
                    </h4>
                    <p className="text-xs text-slate-500 font-mono mt-0.5">{c.email}</p>
                    {c.instagram_username && (
                      <span className="text-xs font-semibold text-[#2B7BC4] mt-0.5 inline-block">
                        @{c.instagram_username}
                      </span>
                    )}
                  </div>
                  {c.account_status === "suspended" ? (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-slate-100 text-slate-600 border border-slate-200">
                      Suspended
                    </span>
                  ) : (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-emerald-50 text-emerald-700 border border-emerald-200">
                      Active
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-100 text-xs">
                  <div>
                    <span className="text-[11px] text-slate-400 font-medium">Plan Tier:</span>
                    <p className="font-bold text-[#0D2137] mt-0.5">
                      {c.plan_display_name || c.plan_name || "No Plan"}
                    </p>
                  </div>
                  <div>
                    <span className="text-[11px] text-slate-400 font-medium">Onboarding:</span>
                    <p className="font-bold text-[#0D2137] mt-0.5">
                      {c.onboarding_stage >= 4 ? "Stage 4/4 (Done)" : `Stage ${Math.max(1, c.onboarding_stage)}/4`}
                    </p>
                  </div>
                </div>

                {/* Quota Usage */}
                {c.quota_usage.length > 0 && (
                  <div className="pt-2 border-t border-slate-100">
                    <span className="text-[11px] text-slate-400 font-medium block mb-1.5">Monthly Quota Consumption:</span>
                    <div className="flex flex-wrap gap-2">
                      {c.quota_usage.map((q) => (
                        <div key={q.kind} className="px-2.5 py-1 rounded-lg bg-slate-50 border border-slate-200 text-xs flex items-center gap-1.5">
                          <span className="capitalize text-slate-500 font-medium">{q.kind}:</span>
                          <span className="font-mono font-bold text-[#0D2137]">{q.used}/{q.quota}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Action button */}
                {c.account_status !== "suspended" && (
                  <div className="pt-2 flex justify-end">
                    <button
                      type="button"
                      onClick={() => handleSuspendUser(c.client_id)}
                      className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold text-rose-600 bg-rose-50 hover:bg-rose-100 border border-rose-200 cursor-pointer transition-colors"
                    >
                      <UserX className="size-3.5" />
                      <span>Suspend Access</span>
                    </button>
                  </div>
                )}
              </div>
            ))}
            {clients.length === 0 && (
              <div className="py-8 text-center text-xs text-slate-500">
                No clients found in roster.
              </div>
            )}
          </div>

          {/* Desktop Table View (>= 768px) */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50/80 border-b border-slate-200/80 text-slate-500 font-semibold uppercase tracking-wider text-[11px]">
                <tr>
                  <th className="py-3 px-5">Client / Brand</th>
                  <th className="py-3 px-5">Onboarding</th>
                  <th className="py-3 px-5">Plan</th>
                  <th className="py-3 px-5">Quota Usage</th>
                  <th className="py-3 px-5">Status</th>
                  <th className="py-3 px-5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {clients.map((c) => (
                  <tr key={c.client_id} className="transition-colors hover:bg-slate-50/70">
                    <td className="py-3.5 px-5">
                      <div className="font-bold text-sm text-[#0D2137]">
                        {c.company_name || "Personal Client"}
                      </div>
                      <div className="text-[11px] font-mono text-slate-500">
                        {c.email}
                      </div>
                      {c.instagram_username && (
                        <div className="text-[11px] font-semibold text-[#2B7BC4]">
                          @{c.instagram_username}
                        </div>
                      )}
                    </td>
                    <td className="py-3.5 px-5">
                      {c.onboarding_stage >= 4 ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                          Stage 4/4 • Completed
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-200">
                          Stage {Math.max(1, c.onboarding_stage)}/4
                        </span>
                      )}
                    </td>
                    <td className="py-3.5 px-5">
                      <div className="font-bold text-[#0D2137]">
                        {c.plan_display_name || c.plan_name || "No Plan"}
                      </div>
                      <div className="text-[11px] capitalize text-slate-500">
                        {c.subscription_status || "Inactive"}
                      </div>
                    </td>
                    <td className="py-3.5 px-5">
                      <div className="flex flex-wrap gap-2">
                        {c.quota_usage.length > 0 ? (
                          c.quota_usage.map((q) => (
                            <div key={q.kind} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-100 text-[11px] border border-slate-200/80">
                              <span className="capitalize font-medium text-slate-600">
                                {q.kind}:
                              </span>
                              <span className="font-mono tabular-nums font-bold text-[#0D2137]">
                                {q.used}/{q.quota}
                              </span>
                            </div>
                          ))
                        ) : (
                          <span className="italic text-slate-400">
                            No usage records
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="py-3.5 px-5">
                      {c.account_status === "suspended" ? (
                        <span className="px-2.5 py-1 rounded-full font-bold text-[10px] uppercase bg-slate-100 text-slate-600 border border-slate-200">
                          Suspended
                        </span>
                      ) : (
                        <span className="px-2.5 py-1 rounded-full font-bold text-[10px] uppercase bg-emerald-50 text-emerald-700 border border-emerald-200">
                          Active
                        </span>
                      )}
                    </td>
                    <td className="py-3.5 px-5 text-right">
                      {c.account_status !== "suspended" && (
                        <button
                          type="button"
                          onClick={() => handleSuspendUser(c.client_id)}
                          className="inline-flex items-center gap-1 px-3 py-1 rounded-lg text-xs font-semibold text-rose-600 bg-rose-50 hover:bg-rose-100 border border-rose-200 transition-colors cursor-pointer"
                        >
                          <UserX className="size-3.5" />
                          <span>Suspend</span>
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
                {clients.length === 0 && (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-xs text-slate-500">
                      No clients found in roster.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── TAB: DISPATCH QUEUE & CAPACITY ──────────────────────────────── */}
      {activeTab === "queue" && queue && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Backlog items */}
          <div className="lg:col-span-1 rounded-xl shadow-sm p-5" style={{ background: "#FFFFFF", border: "1px solid #E4E4DF" }}>
            <h2 className="text-sm font-bold mb-1" style={{ color: "#14171C" }}>
              Backlog Dispatch Queue
            </h2>
            <p className="text-xs mb-4" style={{ color: "#6B7280" }}>
              Pending creative assignments
            </p>

            <div className="flex flex-col gap-2">
              {queue.backlog.map((t) => (
                <div key={t.id} className="p-3 rounded-lg" style={{ border: "1px solid #E4E4DF", background: "#FAFAF8" }}>
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="font-semibold uppercase text-[10px]" style={{ color: "#4C6FFF" }}>
                      {t.deliverable_type}
                    </span>
                    <span className="font-mono text-[10px]" style={{ color: "#6B7280" }}>
                      #{t.id.slice(0, 8)}
                    </span>
                  </div>
                  <div className="text-xs font-medium" style={{ color: "#14171C" }}>
                    {t.client_company || "Client Task"}
                  </div>
                </div>
              ))}
              {queue.backlog.length === 0 && (
                <div className="py-8 text-center text-xs" style={{ color: "#6B7280" }}>
                  Queue empty. All tasks assigned!
                </div>
              )}
            </div>
          </div>

          {/* Staff capacity table */}
          <div className="lg:col-span-2 rounded-2xl shadow-xs overflow-hidden bg-white border border-slate-200/90">
            <div className="p-5 border-b border-slate-100 bg-slate-50/50">
              <h2 className="text-sm font-bold text-[#0D2137]">
                Staff Creative Capacity & Work-in-Progress
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Active WIP vs daily capacity with automatic dispatch ranking
              </p>
            </div>

            {/* Mobile View for Staff Capacity (< 768px) */}
            <div className="block md:hidden divide-y divide-slate-100">
              {queue.staff.map((s) => (
                <div key={s.user_id} className="p-4 space-y-2.5">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h4 className="font-bold text-sm text-[#0D2137]">{s.full_name || s.email.split("@")[0]}</h4>
                      <p className="text-xs text-slate-500 font-mono">{s.email}</p>
                    </div>
                    {s.on_leave_today ? (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                        On Leave
                      </span>
                    ) : s.is_accepting_work ? (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                        Available
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-600 border border-slate-200">
                        At Capacity
                      </span>
                    )}
                  </div>

                  <div className="flex items-center justify-between text-xs pt-1">
                    <span className="text-slate-500 capitalize font-medium">{s.department}</span>
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-[#0D2137]">{s.active_wip} / {s.daily_capacity} WIP</span>
                      <div className="w-16 h-2 rounded-full bg-slate-100 overflow-hidden">
                        <div
                          className="h-full bg-[#2B7BC4] rounded-full"
                          style={{ width: `${Math.min(100, (s.active_wip / s.daily_capacity) * 100)}%` }}
                        />
                      </div>
                    </div>
                  </div>

                  {s.skills.length > 0 && (
                    <div className="flex flex-wrap gap-1 pt-1">
                      {s.skills.map((skill) => (
                        <span key={skill} className="px-2 py-0.5 rounded bg-slate-100 text-[10px] text-slate-600 font-medium">
                          {skill}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Desktop View for Staff Capacity (>= 768px) */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50/80 border-b border-slate-200/80 text-slate-500 font-semibold uppercase tracking-wider text-[11px]">
                    <th className="py-3 px-5">Staff Member</th>
                    <th className="py-3 px-5">Department & Skills</th>
                    <th className="py-3 px-5">Active WIP / Capacity</th>
                    <th className="py-3 px-5">Availability</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {queue.staff.map((s) => (
                    <tr key={s.user_id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-3.5 px-5">
                        <div className="font-bold text-sm text-[#0D2137]">
                          {s.full_name || s.email.split("@")[0]}
                        </div>
                        <div className="text-[11px] font-mono text-slate-500">
                          {s.email}
                        </div>
                      </td>
                      <td className="py-3.5 px-5">
                        <span className="capitalize font-semibold text-[#0D2137]">
                          {s.department}
                        </span>
                        <div className="text-[11px] text-slate-500 mt-0.5">
                          {s.skills.join(", ")}
                        </div>
                      </td>
                      <td className="py-3.5 px-5">
                        <div className="flex items-center gap-2">
                          <span className="font-mono tabular-nums font-bold text-[#0D2137]">
                            {s.active_wip}/{s.daily_capacity}
                          </span>
                          <div className="w-20 h-2 rounded-full bg-slate-100 overflow-hidden">
                            <div
                              className="h-full bg-[#2B7BC4] rounded-full"
                              style={{
                                width: `${Math.min(100, (s.active_wip / s.daily_capacity) * 100)}%`,
                              }}
                            />
                          </div>
                        </div>
                      </td>
                      <td className="py-3.5 px-5">
                        {s.on_leave_today ? (
                          <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                            On Leave Today
                          </span>
                        ) : s.is_accepting_work ? (
                          <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            Available
                          </span>
                        ) : (
                          <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-slate-100 text-slate-600 border border-slate-200">
                            At Capacity
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ── TAB: SLA BREACHES PANEL ─────────────────────────────────────── */}
      {activeTab === "slas" && (
        <div className="rounded-2xl shadow-xs overflow-hidden bg-white border border-slate-200/90">
          <div className="p-5 flex items-center justify-between border-b border-slate-100 bg-slate-50/50">
            <div>
              <h2 className="text-sm font-bold flex items-center gap-2 text-[#0D2137]">
                <ShieldAlert className="size-4 text-rose-600" />
                <span>Open SLA Breaches & Urgent Escalations</span>
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Tasks past sla_due_at without completion. Priority escalations.
              </p>
            </div>
            {slas.length > 0 && (
              <span className="px-2.5 py-1 rounded-full text-xs font-black bg-rose-100 text-rose-700 border border-rose-200">
                {slas.length} Breaches
              </span>
            )}
          </div>

          {/* Mobile View for SLA Breaches (< 768px) */}
          <div className="block md:hidden divide-y divide-slate-100">
            {slas.map((item) => (
              <div key={item.id} className="p-4 space-y-2.5">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h4 className="font-bold text-sm text-[#0D2137]">{item.client_company || "Client Task"}</h4>
                    <p className="text-xs text-slate-500 font-mono">#{item.id.slice(0, 8)}</p>
                  </div>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-blue-50 text-blue-700 border border-blue-200">
                    {item.deliverable_type}
                  </span>
                </div>

                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-500 capitalize">Status: <strong className="text-[#0D2137]">{item.status}</strong></span>
                  <span className="text-slate-500">Lead: <strong className="text-[#0D2137]">{item.assignee_name || "Unassigned"}</strong></span>
                </div>

                <div className="pt-2">
                  <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-mono font-bold bg-rose-50 text-rose-700 border border-rose-200 w-full justify-center">
                    <Clock className="size-3.5" />
                    Breached ({item.sla_due_at ? new Date(item.sla_due_at).toLocaleTimeString() : "Overdue"})
                  </span>
                </div>
              </div>
            ))}
            {slas.length === 0 && (
              <div className="py-8 text-center text-xs text-slate-500">
                Zero open SLA breaches. All tasks within turnaround limits!
              </div>
            )}
          </div>

          {/* Desktop View for SLA Breaches (>= 768px) */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200/80 text-slate-500 font-semibold uppercase tracking-wider text-[11px]">
                  <th className="py-3 px-5">Task ID & Client</th>
                  <th className="py-3 px-5">Deliverable Type</th>
                  <th className="py-3 px-5">Current Pipeline Status</th>
                  <th className="py-3 px-5">SLA Deadline & Breach</th>
                  <th className="py-3 px-5">Assigned Creative</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {slas.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3.5 px-5">
                      <div className="font-bold text-sm text-[#0D2137]">
                        {item.client_company || "Client Task"}
                      </div>
                      <div className="text-[11px] font-mono text-slate-500">
                        #{item.id.slice(0, 8)}
                      </div>
                    </td>
                    <td className="py-3.5 px-5">
                      <span className="uppercase font-bold tracking-wider text-[10px] text-[#2B7BC4] bg-blue-50 px-2 py-0.5 rounded border border-blue-100">
                        {item.deliverable_type}
                      </span>
                    </td>
                    <td className="py-3.5 px-5">
                      <span className="capitalize font-semibold text-[#0D2137]">
                        {item.status}
                      </span>
                    </td>
                    <td className="py-3.5 px-5">
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-mono font-bold bg-rose-50 text-rose-700 border border-rose-200">
                        <Clock className="w-3.5 h-3.5" />
                        Breached (
                        {item.sla_due_at
                          ? new Date(item.sla_due_at).toLocaleString()
                          : "Unknown"}
                        )
                      </span>
                    </td>
                    <td className="py-3.5 px-5">
                      <div className="font-semibold text-[#0D2137]">
                        {item.assignee_name || item.assignee_email || "Unassigned"}
                      </div>
                    </td>
                  </tr>
                ))}
                {slas.length === 0 && (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-xs text-slate-500">
                      Zero open SLA breaches. All tasks within turnaround limits!
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
