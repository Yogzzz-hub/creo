import { useState, useEffect } from "react";
import {
  Globe,
  Mail,
  Save,
  Database,
  RefreshCw,
  CheckCircle2,
} from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { request } from "../../lib/http";
import { CreoInlineLoader } from "../../components/ui/CreoLoader";

interface SettingsData {
  general: {
    platform_name: string;
    platform_url: string;
    support_email: string;
    timezone: string;
  };
  email: {
    smtp_host: string;
    from_email: string;
    dunning_days: number;
  };
}

export function PlatformSettingsPage() {
  const queryClient = useQueryClient();

  const { data: settingsData, isLoading, refetch } = useQuery<SettingsData>({
    queryKey: ["platform-settings"],
    queryFn: () => request<SettingsData>("/api/v1/platform/settings"),
  });

  const [generalState, setGeneralState] = useState({
    platform_name: "Creo",
    platform_url: "https://creo.agency",
    support_email: "superadmin@creo.agency",
    timezone: "Asia/Kolkata (IST)",
  });

  const [emailState, setEmailState] = useState({
    smtp_host: "smtp.resend.com",
    from_email: "noreply@creo.agency",
    dunning_days: 7,
  });

  const [savedMessage, setSavedMessage] = useState("");

  useEffect(() => {
    if (settingsData?.general) {
      setGeneralState(settingsData.general);
    }
    if (settingsData?.email) {
      setEmailState(settingsData.email);
    }
  }, [settingsData]);

  const saveMutation = useMutation({
    mutationFn: () =>
      request<{ status: string }>("/api/v1/platform/settings", {
        method: "PATCH",
        body: JSON.stringify({
          general: generalState,
          email: emailState,
        }),
      }),
    onSuccess: () => {
      setSavedMessage("Settings saved successfully to database!");
      setTimeout(() => setSavedMessage(""), 4000);
      void queryClient.invalidateQueries({ queryKey: ["platform-settings"] });
    },
  });

  return (
    <div className="space-y-6 pb-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pt-1">
        <div>
          <h1 className="text-2xl font-black text-hi">Platform Settings</h1>
          <p className="text-xs text-app-mist">
            Global system defaults, email notifications, dunning grace limits, and infrastructure configurations
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

      {savedMessage && (
        <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-xs font-bold text-emerald-400 flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          {savedMessage}
        </div>
      )}

      {isLoading && (
        <div className="p-12 text-center bg-app-surface border border-app-line rounded-2xl">
          <CreoInlineLoader label="Loading platform configurations from database..." />
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* General Settings Card */}
        <div className="bg-app-surface border border-app-line rounded-2xl p-5 sm:p-6 space-y-4">
          <div className="flex items-center gap-2 pb-2 border-b border-app-line">
            <Globe className="w-4 h-4 text-app-accent" />
            <h2 className="text-sm font-black text-hi">General Platform Settings</h2>
          </div>

          <div className="space-y-3">
            <div>
              <label className="text-[11px] font-bold text-app-mist uppercase">Platform Name</label>
              <input
                type="text"
                value={generalState.platform_name}
                onChange={(e) => setGeneralState({ ...generalState, platform_name: e.target.value })}
                className="w-full mt-1 px-3 py-2 rounded-xl bg-app-base border border-app-line text-sm text-hi focus:outline-none focus:border-app-accent"
              />
            </div>

            <div>
              <label className="text-[11px] font-bold text-app-mist uppercase">Platform Canonical URL</label>
              <input
                type="text"
                value={generalState.platform_url}
                onChange={(e) => setGeneralState({ ...generalState, platform_url: e.target.value })}
                className="w-full mt-1 px-3 py-2 rounded-xl bg-app-base border border-app-line text-sm text-hi focus:outline-none focus:border-app-accent"
              />
            </div>

            <div>
              <label className="text-[11px] font-bold text-app-mist uppercase">Platform Support Email</label>
              <input
                type="email"
                value={generalState.support_email}
                onChange={(e) => setGeneralState({ ...generalState, support_email: e.target.value })}
                className="w-full mt-1 px-3 py-2 rounded-xl bg-app-base border border-app-line text-sm text-hi focus:outline-none focus:border-app-accent"
              />
            </div>

            <div>
              <label className="text-[11px] font-bold text-app-mist uppercase">Default Timezone</label>
              <input
                type="text"
                value={generalState.timezone}
                onChange={(e) => setGeneralState({ ...generalState, timezone: e.target.value })}
                className="w-full mt-1 px-3 py-2 rounded-xl bg-app-base border border-app-line text-sm text-hi focus:outline-none focus:border-app-accent"
              />
            </div>
          </div>
        </div>

        {/* Email & Dunning Card */}
        <div className="bg-app-surface border border-app-line rounded-2xl p-5 sm:p-6 space-y-4">
          <div className="flex items-center gap-2 pb-2 border-b border-app-line">
            <Mail className="w-4 h-4 text-app-accent" />
            <h2 className="text-sm font-black text-hi">Email & SaaS Dunning</h2>
          </div>

          <div className="space-y-3">
            <div>
              <label className="text-[11px] font-bold text-app-mist uppercase">SMTP Host</label>
              <input
                type="text"
                value={emailState.smtp_host}
                onChange={(e) => setEmailState({ ...emailState, smtp_host: e.target.value })}
                className="w-full mt-1 px-3 py-2 rounded-xl bg-app-base border border-app-line text-sm text-hi focus:outline-none focus:border-app-accent"
              />
            </div>

            <div>
              <label className="text-[11px] font-bold text-app-mist uppercase">From Email</label>
              <input
                type="email"
                value={emailState.from_email}
                onChange={(e) => setEmailState({ ...emailState, from_email: e.target.value })}
                className="w-full mt-1 px-3 py-2 rounded-xl bg-app-base border border-app-line text-sm text-hi focus:outline-none focus:border-app-accent"
              />
            </div>

            <div>
              <label className="text-[11px] font-bold text-app-mist uppercase">Dunning Grace Days</label>
              <input
                type="number"
                value={emailState.dunning_days}
                onChange={(e) => setEmailState({ ...emailState, dunning_days: parseInt(e.target.value, 10) || 7 })}
                className="w-full mt-1 px-3 py-2 rounded-xl bg-app-base border border-app-line text-sm text-hi focus:outline-none focus:border-app-accent"
              />
              <p className="text-[11px] text-app-mist mt-1">
                Days of service continuity before an overdue agency workspace is suspended.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Save Button Bar */}
      <div className="flex items-center justify-end gap-3 pt-2">
        <button
          type="button"
          disabled={saveMutation.isPending}
          onClick={() => saveMutation.mutate()}
          className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-app-accent to-app-accent text-black text-xs font-black hover:opacity-90 transition-opacity cursor-pointer shadow-lg shadow-app-accent/10 disabled:opacity-50"
        >
          <Save className="w-3.5 h-3.5" />
          {saveMutation.isPending ? "Saving..." : "Save Platform Configurations"}
        </button>
      </div>

      {/* Infrastructure Reference Card */}
      <div className="bg-app-surface border border-app-line rounded-2xl p-5">
        <div className="flex items-center gap-2 mb-3">
          <Database className="w-4 h-4 text-app-accent" />
          <h2 className="text-sm font-black text-hi">Database & Cloud Infrastructure</h2>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
          <div className="p-3 rounded-xl bg-app-base border border-app-line">
            <p className="text-[10px] text-app-mist uppercase font-bold">Database Engine</p>
            <p className="font-bold text-hi mt-1">Supabase PostgreSQL 15</p>
          </div>
          <div className="p-3 rounded-xl bg-app-base border border-app-line">
            <p className="text-[10px] text-app-mist uppercase font-bold">Tenant Security</p>
            <p className="font-bold text-emerald-400 mt-1">PostgreSQL RLS Active</p>
          </div>
          <div className="p-3 rounded-xl bg-app-base border border-app-line">
            <p className="text-[10px] text-app-mist uppercase font-bold">Payment Gateway</p>
            <p className="font-bold text-hi mt-1">Razorpay Live Route</p>
          </div>
        </div>
      </div>
    </div>
  );
}
