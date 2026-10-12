import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "../../lib/auth-context";
import { request } from "../../lib/http";
import { fetchPodDashboard, type PodDashboardData } from "../../lib/ops-api";
import {
  UserRound,
  UsersRound,
  Mail,
  Phone,
  Save,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Video,
  Lock,
  ExternalLink,
} from "lucide-react";

const STANDUP_MEETING_URL = "https://zoom.us/j/9814421990?pwd=creo";

function getCleanInitials(name?: string, fallback = "U"): string {
  if (!name) return fallback;
  const cleaned = name.replace(/\(.*?\)/g, "").replace(/[^a-zA-Z0-9\s]/g, "").trim();
  const parts = cleaned.split(/\s+/).filter(Boolean);
  const p0 = parts[0] || "";
  const p1 = parts[1] || "";
  if (parts.length >= 2) return ((p0[0] || "") + (p1[0] || "")).toUpperCase();
  if (parts.length === 1) return p0.slice(0, 2).toUpperCase();
  return fallback.toUpperCase();
}

export function MemberSettingsPage() {
  const { user, patchUser } = useAuth();

  // 1. Fetch current user profile from backend
  const meQuery = useQuery({
    queryKey: ["member-profile-me", user?.id],
    queryFn: () => request<any>("/api/v1/users/me"),
    staleTime: 30_000,
  });

  // 2. Fetch pod dashboard data to display active pod and team peers
  const podQuery = useQuery<PodDashboardData>({
    queryKey: ["pod_dashboard", user?.id, undefined],
    queryFn: () => fetchPodDashboard(),
    staleTime: 30_000,
  });

  const [form, setForm] = useState({
    name: user?.full_name || "",
    phone: "",
    email: user?.email || "",
  });

  const [isSaving, setIsSaving] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ text: string; type: "success" | "error" } | null>(null);

  // Sync profile data once loaded
  useEffect(() => {
    if (meQuery.data) {
      setForm({
        name: meQuery.data.full_name || user?.full_name || "",
        phone: meQuery.data.phone || "",
        email: meQuery.data.email || user?.email || "",
      });
    }
  }, [meQuery.data, user?.full_name, user?.email]);

  // Auto-dismiss status message after 4.5s
  useEffect(() => {
    if (!statusMessage) return;
    const t = window.setTimeout(() => setStatusMessage(null), 4500);
    return () => window.clearTimeout(t);
  }, [statusMessage]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) {
      setStatusMessage({ text: "Name cannot be empty.", type: "error" });
      return;
    }

    setIsSaving(true);
    setStatusMessage(null);

    try {
      const updated = await request<any>("/api/v1/users/me", {
        method: "PATCH",
        body: JSON.stringify({
          full_name: form.name.trim(),
          phone: form.phone.trim(),
        }),
      });

      // Update auth context state so sidebar and headers reflect changes immediately
      if (updated.full_name) {
        patchUser({ full_name: updated.full_name });
      }

      await meQuery.refetch();
      setStatusMessage({ text: "Personal details updated successfully.", type: "success" });
    } catch (err: any) {
      setStatusMessage({
        text: err?.message || "Failed to update profile. Please try again.",
        type: "error",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const podData = podQuery.data;
  const podName = podData?.pod?.name || "Pod Beta";
  const members = podData?.members || [];
  const podLead = members.find((m) => m.role?.toLowerCase().includes("lead"));
  const peers = members.filter((m) => m.id !== user?.id && !m.role?.toLowerCase().includes("lead"));

  const userInitials = getCleanInitials(form.name || user?.full_name || user?.email, "CP");

  const formattedRole = user?.role
    ? user.role.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())
    : "Creative Specialist";

  return (
    <div data-surface="ops" className="min-h-screen bg-[#0B111C] text-white font-sans flex flex-col">
      <main className="flex-1 max-w-[1200px] w-full mx-auto px-4 sm:px-6 lg:px-8 pt-6 pb-20 sm:pb-8 space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 min-h-8 pb-4 border-b border-[#2A3446]/60">
          <div>
            <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight leading-tight">Account & Team Settings</h1>
            <p className="text-xs sm:text-sm text-[#97A0B3] mt-0.5">
              Manage your personal details and view your active creative pod allocation.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-[#161F2D] border border-[#2A3446] text-[#7FA0D6]">
              <span className="size-2 rounded-full bg-emerald-500 animate-pulse" />
              {formattedRole}
            </span>
          </div>
        </div>

        {/* Status Notification Banner */}
        {statusMessage && (
          <div
            className={`p-3.5 rounded-xl border text-xs font-bold flex items-center justify-between shadow-2xs transition-all ${
              statusMessage.type === "success"
                ? "bg-emerald-500/15 border-emerald-500/30 text-emerald-300"
                : "bg-red-500/15 border-red-500/30 text-red-300"
            }`}
          >
            <div className="flex items-center gap-2">
              {statusMessage.type === "success" ? (
                <CheckCircle2 className="size-4 text-emerald-400 shrink-0" />
              ) : (
                <AlertCircle className="size-4 text-red-400 shrink-0" />
              )}
              <span>{statusMessage.text}</span>
            </div>
            <button
              onClick={() => setStatusMessage(null)}
              className="text-current opacity-70 hover:opacity-100 cursor-pointer"
            >
              &times;
            </button>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-stretch w-full">
          {/* ── CARD 1: Personal Details Card ── */}
          <div className="bg-[#161F2D] rounded-2xl p-5 sm:p-6 border border-[#2A3446]/80 shadow-2xs space-y-5 h-full flex flex-col justify-between">
            <div className="space-y-5">
              <div className="flex items-center justify-between pb-3 border-b border-[#2A3446]">
                <div className="flex items-center gap-2.5">
                  <div className="size-8 rounded-xl bg-[#7FA0D6]/15 text-[#7FA0D6] border border-[#7FA0D6]/30 flex items-center justify-center">
                    <UserRound className="size-4" />
                  </div>
                  <div>
                    <h2 className="text-sm font-bold text-white">Personal Details</h2>
                    <p className="text-[11px] text-[#97A0B3]">Your name, phone number, and account identity</p>
                  </div>
                </div>
              </div>

              {/* Profile Header Pill */}
              <div className="flex items-center gap-3.5 p-3 rounded-xl bg-[#0B111C]/80 border border-[#2A3446]/60">
                <div className="size-12 min-w-12 rounded-xl bg-[#7FA0D6] flex items-center justify-center text-white text-sm font-black shrink-0 overflow-hidden leading-none select-none text-center shadow-sm">
                  {userInitials}
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-white truncate">{form.name || "Specialist"}</p>
                  <p className="text-xs text-[#97A0B3] truncate">{form.email}</p>
                  <p className="text-[10px] text-[#7FA0D6] font-semibold mt-0.5">
                    {formattedRole} · {podName}
                  </p>
                </div>
              </div>
            </div>

            <form onSubmit={handleSave} className="space-y-4 flex-1 flex flex-col justify-between pt-2">
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-[#97A0B3] mb-1.5">
                    Full Name
                  </label>
                  <input
                    type="text"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    placeholder="e.g. Elena Rostova"
                    className="h-11 w-full rounded-xl border border-[#2A3446] bg-[#0B111C] px-3.5 text-xs sm:text-sm text-white placeholder:text-[#66738A] outline-none transition focus:border-[#7FA0D6] focus:ring-1 focus:ring-[#7FA0D6]"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#97A0B3] mb-1.5 flex items-center justify-between">
                    <span>Phone Number</span>
                    <span className="text-[10px] text-[#66738A]">Optional for emergency pod dispatch</span>
                  </label>
                  <div className="relative">
                    <input
                      type="tel"
                      value={form.phone}
                      onChange={(e) => setForm({ ...form, phone: e.target.value })}
                      placeholder="+1 (555) 234-5678"
                      className="h-11 w-full rounded-xl border border-[#2A3446] bg-[#0B111C] px-3.5 pl-9 text-xs sm:text-sm text-white placeholder:text-[#66738A] outline-none transition focus:border-[#7FA0D6] focus:ring-1 focus:ring-[#7FA0D6]"
                    />
                    <Phone className="size-4 text-[#66738A] absolute left-3 top-3.5" />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#97A0B3] mb-1.5 flex items-center justify-between">
                    <span>Work Email</span>
                    <span className="text-[10px] text-[#66738A] flex items-center gap-1">
                      <Lock className="size-2.5" /> Read-only
                    </span>
                  </label>
                  <div className="relative">
                    <input
                      type="email"
                      value={form.email}
                      readOnly
                      disabled
                      className="h-11 w-full rounded-xl border border-[#2A3446]/60 bg-[#0B111C]/50 px-3.5 pl-9 text-xs sm:text-sm text-[#97A0B3] cursor-not-allowed outline-none"
                    />
                    <Mail className="size-4 text-[#66738A] absolute left-3 top-3.5" />
                  </div>
                  <p className="text-[10px] text-[#66738A] mt-1">
                    Managed by Creo organization admin. Contact support to change your account email.
                  </p>
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={isSaving}
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-[#7FA0D6] hover:bg-[#6c8fc9] text-white text-xs font-bold transition-colors cursor-pointer shadow-sm disabled:opacity-50"
                >
                  {isSaving ? (
                    <>
                      <Loader2 className="size-3.5 animate-spin" />
                      <span>Saving changes...</span>
                    </>
                  ) : (
                    <>
                      <Save className="size-3.5" />
                      <span>Save changes</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>

          {/* ── CARD 2: Your Assigned Team / Pod Card ── */}
          <div className="bg-[#161F2D] rounded-2xl p-5 sm:p-6 border border-[#2A3446]/80 shadow-2xs space-y-5 h-full flex flex-col justify-between">
            <div className="space-y-5">
              <div className="flex items-center justify-between pb-3 border-b border-[#2A3446]">
                <div className="flex items-center gap-2.5">
                  <div className="size-8 rounded-xl bg-purple-500/15 text-purple-400 border border-purple-500/30 flex items-center justify-center">
                    <UsersRound className="size-4" />
                  </div>
                  <div>
                    <h2 className="text-sm font-bold text-white">Your Assigned Team & Pod</h2>
                    <p className="text-[11px] text-[#97A0B3]">Active sprint unit and reporting pod leads</p>
                  </div>
                </div>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                  ● {podName} Active
                </span>
              </div>

              {/* Pod Lead Banner */}
              <div className="p-4 rounded-xl bg-[#0B111C]/80 border border-[#2A3446]/70 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-black uppercase tracking-wider text-[#7FA0D6]">
                    Reporting Pod Lead
                  </span>
                  <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-md border border-emerald-500/20">
                    Lead Reviewer
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="size-10 min-w-10 rounded-xl bg-blue-600 flex items-center justify-center text-white text-xs font-black shrink-0 overflow-hidden leading-none select-none text-center">
                    {getCleanInitials(podLead?.full_name, "PL")}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs sm:text-sm font-bold text-white truncate">
                      {podLead?.full_name || "Sarah Connor"}
                    </p>
                    <p className="text-[11px] text-[#97A0B3] truncate">
                      {podLead?.email || "sarah.connor@creo.agency"}
                    </p>
                  </div>
                  <span className="px-2 py-1 rounded-lg text-[10px] font-bold bg-[#161F2D] text-[#97A0B3] border border-[#2A3446]">
                    Pod Lead
                  </span>
                </div>
              </div>
            </div>

            {/* Pod Peers Roster */}
            <div className="space-y-2.5 flex-1 flex flex-col my-1">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-[#97A0B3]">Pod Specialists & Peers</span>
                <span className="text-[10px] text-[#66738A]">{members.length} Total Members</span>
              </div>

              <div className="space-y-2 flex-1 overflow-y-auto">
                {peers.length > 0 ? (
                  peers.map((peer) => {
                    return (
                      <div
                        key={peer.id}
                        className="flex items-center justify-between p-2.5 rounded-xl bg-[#0B111C]/60 border border-[#2A3446]/50"
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className="size-8 min-w-8 rounded-lg bg-[#2A3446] text-white text-[11px] font-black flex items-center justify-center shrink-0 overflow-hidden leading-none select-none text-center">
                            {getCleanInitials(peer.full_name, "CP")}
                          </div>
                          <div className="min-w-0">
                            <p className="text-xs font-semibold text-white truncate">{peer.full_name}</p>
                            <p className="text-[10px] text-[#97A0B3] truncate capitalize">
                              {peer.role?.replace("_", " ") || "Specialist"}
                            </p>
                          </div>
                        </div>
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#161F2D] text-[#7FA0D6] border border-[#2A3446]/60">
                          {peer.role?.includes("editor")
                            ? "Editor"
                            : peer.role?.includes("designer")
                            ? "Designer"
                            : "Specialist"}
                        </span>
                      </div>
                    );
                  })
                ) : (
                  <div className="p-3 rounded-xl bg-[#0B111C]/40 border border-[#2A3446]/40 text-center text-xs text-[#97A0B3]">
                    No other specialists in this pod.
                  </div>
                )}
              </div>
            </div>

            {/* Daily Standup Zoom Link */}
            <div className="p-3 rounded-xl bg-[#7FA0D6]/10 border border-[#7FA0D6]/20 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2 min-w-0">
                <Video className="size-4 text-[#7FA0D6] shrink-0" />
                <div className="min-w-0">
                  <p className="text-xs font-bold text-white truncate">10:00 AM Daily Standup</p>
                  <p className="text-[10px] text-[#7FA0D6] truncate">Pod sync on Zoom</p>
                </div>
              </div>
              <a
                href={STANDUP_MEETING_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="px-3 py-1 rounded-lg bg-[#7FA0D6] hover:bg-blue-600 text-white text-xs font-bold flex items-center gap-1 transition-colors shrink-0"
              >
                <span>Join</span>
                <ExternalLink className="size-3" />
              </a>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
