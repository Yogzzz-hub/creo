import { useState } from "react";
import {
  User,
  RefreshCw,
} from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { request } from "../../lib/http";
import { CreoInlineLoader } from "../../components/ui/CreoLoader";

interface AuditLogItem {
  id: number;
  actor: string;
  action: string;
  target: string;
  ip: string;
  time: string;
  level: string;
}

interface FeatureFlagItem {
  id: string;
  name: string;
  description: string;
  enabled: boolean;
  scope: string;
}

interface SecurityData {
  audit_logs: AuditLogItem[];
  feature_flags: FeatureFlagItem[];
  flag_states: Record<string, boolean>;
}

const LEVEL_CLS: Record<string, string> = {
  info: "text-app-accent",
  warning: "text-amber-400",
  error: "text-rose-400",
};

export function PlatformSecurityPage() {
  const queryClient = useQueryClient();

  const { data: secData, isLoading, refetch } = useQuery<SecurityData>({
    queryKey: ["platform-security"],
    queryFn: () => request<SecurityData>("/api/v1/platform/security"),
  });

  const [activeTab, setActiveTab] = useState<"Audit" | "Flags">("Audit");

  const flagMutation = useMutation({
    mutationFn: ({ flagId, enabled }: { flagId: string; enabled: boolean }) =>
      request<{ status: string }>("/api/v1/platform/security/flags", {
        method: "POST",
        body: JSON.stringify({ flag_id: flagId, enabled }),
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["platform-security"] });
    },
  });

  const auditLogs = secData?.audit_logs ?? [];
  const featureFlags = secData?.feature_flags ?? [];
  const flagStates = secData?.flag_states ?? {};

  return (
    <div className="space-y-6 pb-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pt-1">
        <div>
          <h1 className="text-2xl font-black text-hi">Platform Governance & Security</h1>
          <p className="text-xs text-app-mist">
            Audit trail of administrative actions, platform feature flags, and active sessions
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => void refetch()}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-app-surface border border-app-line hover:border-app-accent/40 text-xs font-bold text-app-mist hover:text-hi transition-all cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Refresh
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 bg-app-base border border-app-line rounded-xl w-fit">
        <button
          type="button"
          onClick={() => setActiveTab("Audit")}
          className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
            activeTab === "Audit"
              ? "bg-gradient-to-r from-app-accent to-app-accent text-black shadow-md"
              : "text-app-mist hover:text-hi"
          }`}
        >
          Audit Log ({auditLogs.length})
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("Flags")}
          className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
            activeTab === "Flags"
              ? "bg-gradient-to-r from-app-accent to-app-accent text-black shadow-md"
              : "text-app-mist hover:text-hi"
          }`}
        >
          Feature Flags ({featureFlags.length})
        </button>
      </div>

      {isLoading && (
        <div className="p-12 text-center bg-app-surface border border-app-line rounded-2xl">
          <CreoInlineLoader label="Loading security data from database..." />
        </div>
      )}

      {/* Active Admin Session Card */}
      <div className="bg-app-surface border border-app-line rounded-2xl p-5">
        <div className="flex items-center gap-2 mb-4">
          <User className="w-4 h-4 text-app-accent" />
          <h2 className="text-sm font-black text-hi">Active Platform Super Admin Session</h2>
        </div>
        <div className="p-4 rounded-xl bg-app-base border border-app-line flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="size-9 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400 font-black text-xs">
              SA
            </div>
            <div>
              <p className="text-xs font-bold text-hi">superadmin@creo.agency</p>
              <p className="text-[11px] text-app-mist">Role: platform_super_admin · Full Global Scope</p>
            </div>
          </div>
          <div className="flex items-center gap-3 text-xs text-app-mist">
            <span className="flex items-center gap-1.5 text-emerald-400 font-bold">
              <span className="size-2 rounded-full bg-emerald-400 animate-pulse text-app-on-accent!" /> Live Now
            </span>
            <span>Local session</span>
          </div>
        </div>
      </div>

      {activeTab === "Audit" && (
        <div className="bg-app-surface border border-app-line rounded-2xl overflow-hidden">
          <div className="p-5 border-b border-app-line">
            <h2 className="text-base font-black text-hi">Immutable Platform Audit Trail</h2>
            <p className="text-xs text-app-mist">Recorded security events stored in database audit_log table</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-app-line">
                  {["Timestamp", "Actor", "Action", "Target / Entity", "Status"].map((h) => (
                    <th key={h} className="px-5 py-3.5 text-[11px] font-black uppercase tracking-wider text-app-accent">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-app-line">
                {auditLogs.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-5 py-8 text-center text-sm text-app-mist">
                      No audit events recorded yet.
                    </td>
                  </tr>
                ) : (
                  auditLogs.map((log) => (
                    <tr key={log.id} className="hover:bg-app-base/40 transition-colors">
                      <td className="px-5 py-3.5 text-[11px] font-mono text-app-mist whitespace-nowrap">{log.time}</td>
                      <td className="px-5 py-3.5 text-[12px] font-bold text-hi">{log.actor}</td>
                      <td className="px-5 py-3.5">
                        <span className={`text-[12px] font-mono font-bold ${LEVEL_CLS[log.level] ?? "text-hi"}`}>
                          {log.action}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 text-[12px] text-app-accent-soft">{log.target}</td>
                      <td className="px-5 py-3.5">
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                          recorded
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === "Flags" && (
        <div className="bg-app-surface border border-app-line rounded-2xl p-5 sm:p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-black text-hi">Global Feature Flags</h2>
              <p className="text-xs text-app-mist">Control tenant capabilities globally or per SaaS tier</p>
            </div>
          </div>

          <div className="divide-y divide-app-line">
            {featureFlags.map((flag) => {
              const isEnabled = flagStates[flag.id] ?? flag.enabled;
              return (
                <div key={flag.id} className="py-4 flex items-center justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-bold text-hi">{flag.name}</p>
                      <span className="text-[10px] font-mono text-app-accent bg-app-base border border-app-line px-2 py-0.5 rounded">
                        {flag.id}
                      </span>
                    </div>
                    <p className="text-xs text-app-mist mt-1">{flag.description}</p>
                    <p className="text-[11px] text-app-accent mt-0.5">Scope: {flag.scope}</p>
                  </div>
                  <button
                    type="button"
                    disabled={flagMutation.isPending}
                    onClick={() => flagMutation.mutate({ flagId: flag.id, enabled: !isEnabled })}
                    className={`relative w-12 h-6 rounded-full transition-colors cursor-pointer shrink-0 ${
                      isEnabled ? "bg-emerald-500 text-app-on-accent!" : "bg-app-line"
                    }`}
                  >
                    <span
                      className={`absolute top-1 left-1 size-4 rounded-full bg-hi transition-transform ${
                        isEnabled ? "translate-x-6" : ""
                      }`}
                    />
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
